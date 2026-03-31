from config.schema import GlobalEvent
from config.settings import setup_logger

logger = setup_logger("response.actions")

class ResponseEngine:
    def handle_response(self, event: GlobalEvent) -> GlobalEvent:
        if not event.severity or event.severity == "None":
            event.action = "None"
            return event
            
        if event.severity == "Low":
            event.action = "Log Only"
            logger.info(f"ACTION [Log] for event {event.event_id}")
        elif event.severity == "Medium":
            event.action = f"Rate Limit {event.src_ip}"
            logger.warning(f"ACTION [Rate Limit] for IP {event.src_ip} (Incident: {event.incident_id})")
        elif event.severity == "High":
            event.action = f"Isolate Host {event.src_ip}"
            logger.critical(f"ACTION [ISOLATE] for IP {event.src_ip} (Incident: {event.incident_id})")
            
        return event
