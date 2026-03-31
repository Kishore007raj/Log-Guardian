import time
from collections import deque
from config.schema import GlobalEvent
from config.settings import config, setup_logger

logger = setup_logger("processing.feature_engineering")

class FeatureExtractor:
    def __init__(self):
        self.window_sec = config.SLIDING_WINDOW_SEC
        self.ip_history = {}
        self.ip_ports_history = {}
        self.ip_failures = {}

    def extract_features(self, event: GlobalEvent) -> GlobalEvent:
        # ARCHITECTURE FIX: Lock the sliding window to the event payload's literal timestamp, not the server eval time.
        try:
            current_time = float(event.timestamp)
        except ValueError:
            current_time = time.time()
        
        port_num = 0
        is_failure = 0
        packet_size = 0
        
        try:
            import json
            raw = json.loads(event.raw_log)
            port_num = int(raw.get("dest_port", 80))
            if raw.get("status") in ["failure", "failed", 401, 403]:
                is_failure = 1
            packet_size = int(raw.get("packet_size", 512))
        except Exception:
            pass
            
        src_ip = event.src_ip
        if src_ip not in self.ip_history:
            self.ip_history[src_ip] = deque()
            self.ip_ports_history[src_ip] = deque()
            self.ip_failures[src_ip] = deque()
            
        self.ip_history[src_ip].append(current_time)
        self.ip_ports_history[src_ip].append((current_time, port_num))
        self.ip_failures[src_ip].append((current_time, is_failure))
        
        cutoff = current_time - self.window_sec
        while self.ip_history[src_ip] and self.ip_history[src_ip][0] < cutoff:
            self.ip_history[src_ip].popleft()
        while self.ip_ports_history[src_ip] and self.ip_ports_history[src_ip][0][0] < cutoff:
            self.ip_ports_history[src_ip].popleft()
        while self.ip_failures[src_ip] and self.ip_failures[src_ip][0][0] < cutoff:
            self.ip_failures[src_ip].popleft()
            
        req_count = len(self.ip_history[src_ip])
        unique_ports = len(set(p[1] for p in self.ip_ports_history[src_ip]))
        fail_count = sum(f[1] for f in self.ip_failures[src_ip])
        fail_ratio = fail_count / req_count if req_count > 0 else 0.0
        
        event.features = {
            "port": float(port_num),
            "packet_size": float(packet_size),
            "is_failure": float(is_failure),
            "window_req_count": float(req_count),
            "window_unique_ports": float(unique_ports),
            "window_failure_ratio": float(fail_ratio)
        }
        
        return event
