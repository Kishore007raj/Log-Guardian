from config.schema import GlobalEvent
from config.settings import setup_logger

logger = setup_logger("severity.scoring")

class SeverityEngine:
    def evaluate(self, event: GlobalEvent) -> GlobalEvent:
        if not event.incident_id:
            event.severity = "None"
            return event
            
        score = max(event.stage1_score, event.stage2_score)
        feat = event.features
        req_count = feat.get("window_req_count", 0)
        
        # Rule 1: High frequency clear attack
        if score > 0.8 and req_count > 50:
            event.severity = "High"
        # Rule 2: Confident hit but lower frequency
        elif score > 0.6:
            event.severity = "Medium"
        # Rule 3: Low confidence, low freq
        else:
            event.severity = "Low"
            
        # Assets Rule (e.g., internal critical DB subnet)
        if event.dest_ip.startswith("10.0.") and event.severity in ["Medium", "Low"]:
            if score > 0.7:
                 event.severity = "High"
            
        return event
