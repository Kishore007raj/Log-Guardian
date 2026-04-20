import os
import time
import json
import sqlite3
import threading
import socket
from collections import deque
from datetime import timedelta
from queue import Queue, Empty
from contextlib import asynccontextmanager

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

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

@asynccontextmanager
async def lifespan(app: FastAPI):
    global main_loop, broadcast_queue
    if is_port_in_use(8000):
        logger.warning("Port 8000 already in use! Avoid multiple uvicorn instances or conflicts.")
        
    main_loop = asyncio.get_running_loop()
    broadcast_queue = asyncio.Queue()
    
    # Auto-start the pipeline for demo-readiness
    pipeline_state.start()
    
    pipeline_thread = threading.Thread(target=run_pipeline, daemon=True)
    pipeline_thread.start()
    
    broadcaster_task = asyncio.create_task(websocket_broadcaster())
    logger.info("Pipeline thread and WS broadcaster started.")
    
    yield
    
    pipeline_state.stop()
    broadcaster_task.cancel()
    logger.info("Application shutdown cleanly.")

app = FastAPI(title="AI-Powered SOC API - PRO (Local)", lifespan=lifespan)

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
# WS Broadcast (initialized in lifespan)
broadcast_queue = None
main_loop = None

class PipelineState:
    def __init__(self):
        self.lock = threading.Lock()
        self.is_running = False
        self.events_processed = 0
        self.start_time = None
        self.time_limit = None
        self.event_limit = None

    def start(self, time_limit=None, event_limit=None):
        with self.lock:
            self.is_running = True
            self.start_time = time.time()
            self.time_limit = time_limit
            self.event_limit = event_limit
            self.events_processed = 0

    def stop(self):
        with self.lock:
            self.is_running = False

pipeline_state = PipelineState()

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
            # Removed wait_for timeout to prevent dropping clients that just listen
            text = await websocket.receive_text()
            if text == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        logger.info("WS_DISCONNECT: Client cleanly disconnected.")
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WS_ERROR: Unexpected stream fault: {e}")
        ws_manager.disconnect(websocket)

async def websocket_broadcaster():
    while True:
        try:
            if broadcast_queue is None:
                await asyncio.sleep(1)
                continue
                
            msg = await broadcast_queue.get()
            if not ws_manager.active_connections:
                continue
                
            for conn in list(ws_manager.active_connections):
                try:
                    await conn.send_text(msg)
                except Exception as e:
                    logger.warning(f"WS_BROADCAST_FAILURE: Failed to dispatch to client: {e}")
                    ws_manager.disconnect(conn)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"WS_BROADCAST_ERROR: {e}")

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

@app.post("/api/start")
async def api_start_pipeline(time_limit: int = None, event_limit: int = None):
    pipeline_state.start(time_limit, event_limit)
    return {"status": "started", "limits": {"time": time_limit, "events": event_limit}}

@app.post("/api/stop")
async def api_stop_pipeline():
    pipeline_state.stop()
    return {"status": "stopped"}

@app.get("/api/status")
async def api_pipeline_status():
    return {
        "is_running": pipeline_state.is_running,
        "events_processed": pipeline_state.events_processed,
        "run_time": (time.time() - pipeline_state.start_time) if pipeline_state.is_running and pipeline_state.start_time else 0
    }

@app.get("/api/system/metrics")
async def api_system_metrics():
    return {
        "queue_size": event_queue.qsize(),
        "processing_latency_avg": "available via /metrics (prometheus)",
        "pipeline_active": pipeline_state.is_running
    }

@app.get("/api/report/generate")
async def generate_report():
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    
    cursor.execute("SELECT severity, COUNT(*) FROM incidents GROUP BY severity")
    sev_dist = {row[0]: row[1] for row in cursor.fetchall()}
    
    cursor.execute("SELECT SUM(event_count) FROM incidents")
    inc_count_res = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM incidents")
    unique_incidents = cursor.fetchone()[0]
    
    cursor.execute("SELECT src_ip, event_count FROM incidents ORDER BY event_count DESC LIMIT 5")
    top_attackers = [{"ip": row[0], "count": row[1]} for row in cursor.fetchall()]
    conn.close()
    
    return {
        "status": "success",
        "incidents_count": unique_incidents or 0,
        "total_event_hits": inc_count_res or 0,
        "severity_distribution": sev_dist,
        "top_attackers": top_attackers
    }

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
            if not pipeline_state.is_running:
                time.sleep(1.0)
                continue
                
            with pipeline_state.lock:
                if pipeline_state.time_limit and (time.time() - pipeline_state.start_time) > pipeline_state.time_limit:
                    pipeline_state.is_running = False
                    logger.info("Pipeline time limit reached. Stopped gracefully.")
                    continue
                if pipeline_state.event_limit and pipeline_state.events_processed >= pipeline_state.event_limit:
                    pipeline_state.is_running = False
                    logger.info("Pipeline event limit reached. Stopped gracefully.")
                    continue

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

            logger.info(f"PIPELINE_CHECKPOINT: Event received. Processing batch of {len(batch)} events")

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
                
            logger.info(f"PIPELINE_CHECKPOINT: Feature processed for {len(valid_events)} events")
                
            # STEP 2: Mathematical Bulk Batching for Inference engines
            with DETECTION_LATENCY.time():
                try:
                    valid_events = xgb_detector.detect_batch(valid_events)
                except Exception as ex:
                    logger.error(f"XGBoost pipeline fail-safe isolated: {ex}")
                try:
                    valid_events = lstm_detector.detect_batch(valid_events)
                except Exception as ex:
                    logger.error(f"LSTM pipeline fail-safe isolated: {ex}")
            
            logger.info(f"PIPELINE_CHECKPOINT: Model output completed for {len(valid_events)} events")
            
            # Record events processed
            with pipeline_state.lock:
                pipeline_state.events_processed += len(valid_events)
            
            # STEP 3: Correlate, Grade, and React
            processed_events = []
            for event in valid_events:
                try:
                    event = correlation.correlate(event)
                    event = severity.evaluate(event)
                    event = response.handle_response(event)
                    processed_events.append(event)
                    
                    if event.incident_id:
                        # Fail-safe retry logic for Incident storage
                        for attempt in range(3):
                            try:
                                sqlite_client.store_incident(event)
                                logger.info(f"PIPELINE_CHECKPOINT: Incident created - {event.incident_id}")
                                break
                            except Exception as db_ex:
                                time.sleep(0.5 * (attempt + 1))
                                if attempt == 2:
                                    logger.error(f"SQLite final retry failed: {db_ex}")
                        INCIDENTS_CREATED_TOTAL.inc()
                except Exception as ex:
                    logger.error(f"Pipeline correlation error isolated: {ex}")
            
            # STEP 4: Async Bulk Index Data Storage
            if processed_events:
                for ev in processed_events:
                    try:
                        ev_json = ev.model_dump_json() if hasattr(ev, 'model_dump_json') else ev.json()
                        if main_loop and not main_loop.is_closed():
                            main_loop.call_soon_threadsafe(broadcast_queue.put_nowait, ev_json)
                    except Exception as loop_ex:
                        logger.error(f"Failed to queue WS broadcast: {loop_ex}")
                        
                for attempt in range(3):
                    try:
                        json_client.store_batch(processed_events)
                        break
                    except Exception as fj_ex:
                        time.sleep(0.5 * (attempt + 1))
                        if attempt == 2: logger.error(f"JSON final retry failed: {fj_ex}")
                
                EVENTS_PROCESSED_TOTAL.inc(len(processed_events))

    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
    finally:
        sqlite_client.close()

if __name__ == "__main__":
    logger.info("SYSTEM_READY: CloudSentinel API initializing on http://127.0.0.1:8000")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
