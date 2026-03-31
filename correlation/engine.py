import time
import uuid
from collections import defaultdict
from typing import List
from config.schema import GlobalEvent
from config.settings import config, setup_logger

logger = setup_logger("correlation.engine")

class CorrelationEngine:
    def __init__(self):
        self.window_sec = config.SLIDING_WINDOW_SEC
        self.threshold = config.INCIDENT_THRESHOLD
        
        # State: source IP -> list of recent suspicious events
        self.active_groups = defaultdict(list)
        # Source IP -> active incident ID
        self.active_incident_id = {}

    def correlate(self, event: GlobalEvent) -> GlobalEvent:
        # ARCHITECTURE FIX: Tie decay explicitly to log creation time
        try:
            current_time = float(event.timestamp)
        except ValueError:
            current_time = time.time()
            
        src_ip = event.src_ip
        
        # Clean up old events in the window
        cutoff = current_time - self.window_sec
        self.active_groups[src_ip] = [
            e for e in self.active_groups[src_ip] 
            if float(e.timestamp) >= cutoff
        ]
        
        # Only correlate suspicious events
        if event.stage1_score < 0.6 and event.stage2_score < 0.4:
            return event
            
        self.active_groups[src_ip].append(event)
        
        # Threshold Check
        if len(self.active_groups[src_ip]) >= self.threshold:
            if src_ip not in self.active_incident_id:
                incident_id = f"INC-{uuid.uuid4().hex[:8]}"
                self.active_incident_id[src_ip] = incident_id
                logger.warning(f"New incident created: {incident_id} for IP {src_ip}")
            
            event.incident_id = self.active_incident_id[src_ip]
        else:
            event.incident_id = ""
            
        # Decay logic
        if len(self.active_groups[src_ip]) < self.threshold and src_ip in self.active_incident_id:
            logger.info(f"Incident {self.active_incident_id[src_ip]} decayed for IP {src_ip}")
            del self.active_incident_id[src_ip]
            
        return event
