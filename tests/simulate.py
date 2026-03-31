import json
import random
import time
import os
import sys

# Add root project dir to path so local testing works
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ingestion.collector import LogCollector
from config.settings import setup_logger

logger = setup_logger("simulator")

def run_simulation(event_queue, num_events=1000):
    collector = LogCollector(event_queue)
    logger.info(f"Starting simulation of {num_events} logs to test ingestion -> queue pipeline...")
    
    port_scan_ip = "192.168.1.10"
    brute_force_ip = "10.0.0.50"
    
    current_time = time.time()
    
    for i in range(num_events):
        event_time = current_time + (i * 0.05) 
        scenario = random.random()
        
        if scenario < 0.2:
            # Port Scan Event
            port = random.randint(1000, 9000)
            log = {
                "timestamp": str(event_time),
                "src_ip": port_scan_ip,
                "dest_ip": "10.0.0.1",
                "event_type": "firewall",
                "dest_port": port,
                "status": "blocked",
                "packet_size": 64
            }
        elif scenario < 0.4:
            # Brute Force Event
            log = {
                "timestamp": str(event_time),
                "src_ip": brute_force_ip,
                "dest_ip": "10.0.0.2",
                "event_type": "ssh_login",
                "dest_port": 22,
                "status": "failure",
                "packet_size": 128
            }
        else:
            # Normal Event
            log = {
                "timestamp": str(event_time),
                "src_ip": f"172.16.0.{random.randint(1, 200)}",
                "dest_ip": "10.0.0.100",
                "event_type": "http_request",
                "dest_port": 80,
                "status": "success",
                "packet_size": random.randint(500, 1500)
            }
            
        collector.ingest_line(json.dumps(log), event_type=log["event_type"])
        
        if i % 100 == 0 and i > 0:
            logger.info(f"Sent {i} logs...")
            
    collector.flush()
    logger.info("Simulation complete. Events published to queue.")

if __name__ == "__main__":
    from queue import Queue
    q = Queue()
    run_simulation(q)
