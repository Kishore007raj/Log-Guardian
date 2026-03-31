import os
import time
import json
import sqlite3
import threading
from collections import deque
from datetime import timedelta
from queue import Queue, Empty

import uvicorn
from fastapi import FastAPI, Depends, Request, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool
import asyncio

from config.settings import config, setup_logger
from api.auth import create_access_token
from api.metrics import EVENTS_PROCESSED_TOTAL, INCIDENTS_CREATED_TOTAL, MALFORMED_EVENTS_TOTAL, DETECTION_LATENCY

# ML and Pipeline imports
from config.schema import GlobalEvent
from processing.normalization import Normalizer
from processing.feature_engineering import FeatureExtractor
from detection.stage1_xgb import XGBoostDetector
from detection.stage2_lstm import LSTMDetector
from correlation.engine import CorrelationEngine
from severity.scoring import SeverityEngine
from response.actions import ResponseEngine
from storage.json_client import JSONStorageClient
from storage.sqlite_client import SQLiteClient
from tests.simulate import run_simulation

logger = setup_logger("orchestrator")

app = FastAPI(title="AI-Powered SOC API - PRO (Local)")

metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Queue for In-Memory Messaging
event_queue = Queue()
# WS Broadcast
broadcast_queue = asyncio.Queue()
main_loop = None

class ConnectionManager:
    def __init__(self):
        self.active_connections = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WS_CONNECT: Client established link. Active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WS_DISCONNECT: Client link severed. Active: {len(self.active_connections)}")

ws_manager = ConnectionManager()

@app.websocket("/api/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep-alive receive loop
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WS_ERROR: Unexpected stream fault: {e}")
        ws_manager.disconnect(websocket)

async def websocket_broadcaster():
    while True:
        msg = await broadcast_queue.get()
        if not ws_manager.active_connections:
            continue
            
        for conn in list(ws_manager.active_connections):
            try:
                await conn.send_text(msg)
            except Exception as e:
                logger.warning(f"WS_BROADCAST_FAILURE: Failed to dispatch to client: {e}")
                ws_manager.disconnect(conn)

# DB Helper
def get_sqlite_conn():
    return sqlite3.connect(config.SQLITE_DB_PATH)

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def query_incidents_sync(limit):
    try:
        conn = get_sqlite_conn()
        conn.row_factory = dict_factory
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM incidents ORDER BY last_seen_timestamp DESC LIMIT ?;", (limit,))
        rows = cursor.fetchall()
        conn.close()
        return rows
    except Exception as e:
        logger.error(f"SQL error querying incidents: {e}")
        return []

def query_alerts_sync():
    try:
        conn = get_sqlite_conn()
        conn.row_factory = dict_factory
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM incidents WHERE severity = 'High' ORDER BY last_seen_timestamp DESC LIMIT 50;")
        rows = cursor.fetchall()
        conn.close()
        return rows
    except Exception as e:
        logger.error(f"SQL error querying alerts: {e}")
        return []

def search_events_sync(limit):
    # Tail the JSON file
    if not os.path.exists(config.JSON_EVENTS_PATH): return []
    try:
        # For simplicity and performance, read last lines memory efficiently
        with open(config.JSON_EVENTS_PATH, "r") as f:
            lines = deque(f, limit)
        res = []
        for line in reversed(lines):
            try:
                res.append(json.loads(line))
            except: pass
        return res
    except Exception as e:
        logger.error(f"Error reading JSON events: {e}")
        return []

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/login", response_model=Token)
async def login(login_req: LoginRequest):
    access_token = create_access_token(data={"sub": login_req.username}, expires_delta=timedelta(minutes=1440))
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/incidents")
@limiter.limit("10/second")
async def get_incidents(request: Request, limit: int = 100):
    rows = await run_in_threadpool(query_incidents_sync, limit)
    return rows

@app.get("/api/events")
@limiter.limit("20/second")
async def get_events(request: Request, limit: int = 50):
    rows = await run_in_threadpool(search_events_sync, limit)
    return rows

@app.get("/api/alerts")
@limiter.limit("10/second")
async def get_alerts(request: Request):
    rows = await run_in_threadpool(query_alerts_sync)
    return rows

@app.get("/api/system/health")
async def system_health():
    return {
        "status": "online",
        "queue_size": event_queue.qsize(),
        "sqlite": "connected" if os.path.exists(config.SQLITE_DB_PATH) else "initializing",
        "json_storage": "connected" if os.path.exists(config.JSON_EVENTS_PATH) else "initializing"
    }

class SimRequest(BaseModel):
    num_events: int = 1000

@app.post("/api/simulate")
@limiter.limit("2/minute")
async def trigger_simulation(request: Request, sim: SimRequest, background_tasks: BackgroundTasks):
    try:
        background_tasks.add_task(run_simulation, event_queue, sim.num_events)
        return {"status": f"Simulation of {sim.num_events} events started in background"}
    except Exception as e:
        return {"error": f"Failed to start simulator: {str(e)}"}

def run_pipeline():
    logger.info("Starting AI SOC Pipeline (Local Edition)...")
    
    extractor = FeatureExtractor()
    xgb_detector = XGBoostDetector()
    lstm_detector = LSTMDetector()
    correlation = CorrelationEngine()
    severity = SeverityEngine()
    response = ResponseEngine()
    
    json_client = JSONStorageClient()
    sqlite_client = SQLiteClient()

    try:
        while True:
            batch = []
            try:
                # Batch 100 events or block for 1 second if empty
                first_event = event_queue.get(timeout=1.0)
                batch.append(first_event)
                for _ in range(99):
                    raw_dict = event_queue.get_nowait()
                    batch.append(raw_dict)
            except Empty:
                pass

            if not batch:
                continue

            valid_events = []
            
            # STEP 1: Process sequential normalizations and sliding windows
            for raw_dict in batch:
                try:
                    event = Normalizer.normalize(raw_dict)
                    event = extractor.extract_features(event)
                    valid_events.append(event)
                except Exception as ex:
                    MALFORMED_EVENTS_TOTAL.inc()
                    logger.error(f"Malformed event dropped: {ex}")
            
            if not valid_events:
                continue
                
            # STEP 2: Mathematical Bulk Batching for Inference engines
            with DETECTION_LATENCY.time():
                valid_events = xgb_detector.detect_batch(valid_events)
                valid_events = lstm_detector.detect_batch(valid_events)
            
            # STEP 3: Correlate, Grade, and React
            processed_events = []
            for event in valid_events:
                try:
                    event = correlation.correlate(event)
                    event = severity.evaluate(event)
                    event = response.handle_response(event)
                    processed_events.append(event)
                    
                    if event.incident_id:
                        sqlite_client.store_incident(event)
                        INCIDENTS_CREATED_TOTAL.inc()
                except Exception as ex:
                    logger.error(f"Pipeline correlation error: {ex}")
            
            # STEP 4: Async Bulk Index Data Storage
            if processed_events:
                for ev in processed_events:
                    try:
                        ev_json = ev.model_dump_json() if hasattr(ev, 'model_dump_json') else ev.json()
                        if main_loop and not main_loop.is_closed():
                            main_loop.call_soon_threadsafe(broadcast_queue.put_nowait, ev_json)
                    except Exception as loop_ex:
                        logger.error(f"Failed to queue WS broadcast: {loop_ex}")
                        
                json_client.store_batch(processed_events)
                EVENTS_PROCESSED_TOTAL.inc(len(processed_events))

    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
    finally:
        sqlite_client.close()

@app.on_event("startup")
async def startup_event():
    global main_loop
    main_loop = asyncio.get_running_loop()
    
    pipeline_thread = threading.Thread(target=run_pipeline, daemon=True)
    pipeline_thread.start()
    
    asyncio.create_task(websocket_broadcaster())
    logger.info("Pipeline thread and WS broadcaster started.")

if __name__ == "__main__":
    logger.info("SYSTEM_READY: CloudSentinel API initializing on http://127.0.0.1:8000")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
