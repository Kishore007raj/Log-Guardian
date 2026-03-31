import json
import uuid
import time
from queue import Queue
from config.schema import GlobalEvent
from config.settings import config, setup_logger

logger = setup_logger("ingestion.collector")

class LogCollector:
    def __init__(self, event_queue: Queue):
        self.event_queue = event_queue
        self.flush_called = False
        
    def generate_event_id(self) -> str:
        return str(uuid.uuid4())

    def ingest_line(self, raw_line: str, event_type: str = "syslog"):
        """ Parses a line, structures it into GlobalEvent, pushes to Queue. """
        # Try JSON first
        try:
            parsed = json.loads(raw_line)
            src_ip = parsed.get("src_ip", "0.0.0.0")
            dest_ip = parsed.get("dest_ip", "0.0.0.0")
            timestamp = parsed.get("timestamp", str(time.time()))
            
            event = GlobalEvent(
                event_id=self.generate_event_id(),
                timestamp=timestamp,
                src_ip=src_ip,
                dest_ip=dest_ip,
                event_type=parsed.get("event_type", event_type),
                raw_log=raw_line
            )
        except json.JSONDecodeError:
            # Fallback for plain syslog
            event = GlobalEvent(
                event_id=self.generate_event_id(),
                timestamp=str(time.time()),
                src_ip="0.0.0.0",
                dest_ip="0.0.0.0",
                event_type="syslog",
                raw_log=raw_line
            )
        
        # Send to queue
        self.event_queue.put(event.model_dump())

    def ingest_file(self, filepath: str, event_type: str = "syslog"):
        logger.info(f"Starting ingestion from {filepath}")
        try:
            with open(filepath, 'r') as f:
                for line in f:
                    if line.strip():
                        self.ingest_line(line.strip(), event_type)
            self.flush()
            logger.info("Ingestion complete.")
        except Exception as e:
            logger.error(f"Error reading file {filepath}: {e}")

    def flush(self):
        self.flush_called = True
        logger.debug("Collector flushed.")
