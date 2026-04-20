import time
import requests
import smtplib
from email.mime.text import MIMEText
import threading

from config.schema import GlobalEvent
from config.settings import config, setup_logger

logger = setup_logger("response.actions")

class ResponseEngine:
    def __init__(self):
        self.last_alert_time = {}

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
            # Trigger alerts asynchronously
            threading.Thread(target=self._trigger_alerts, args=(event,), daemon=True).start()
            
        return event

    def _trigger_alerts(self, event: GlobalEvent):
        now = time.time()
        cooldown = config.ALERT_COOLDOWN_SEC
        
        if now - self.last_alert_time.get(event.src_ip, 0) < cooldown:
            return # Spam prevention fallback
            
        self.last_alert_time[event.src_ip] = now
        
        # Slack Webhook
        webhook = config.SLACK_WEBHOOK_URL
        if webhook:
            payload = {"text": f"🚨 High Severity Incident: {event.incident_id} | IP: {event.src_ip} | Action: {event.action}"}
            try:
                requests.post(webhook, json=payload, timeout=2.0)
            except Exception as e:
                logger.error(f"Slack alert failed: {e}")
                
        # SMTP Email
        smtp_host = config.SMTP_HOST
        if smtp_host:
            try:
                msg = MIMEText(f"Critical security incident detected.\n\nIncident ID: {event.incident_id}\nSource IP: {event.src_ip}\nAction Taken: {event.action}")
                msg['Subject'] = f"SOC Alert: Base Action required - {event.src_ip}"
                msg['From'] = config.SMTP_USER or "soc@local"
                msg['To'] = config.SMTP_USER or "soc-team@local"
                
                server = smtplib.SMTP(smtp_host, 587, timeout=5)
                server.starttls()
                server.login(config.SMTP_USER, config.SMTP_PASS)
                server.send_message(msg)
                server.quit()
            except Exception as e:
                logger.error(f"Email alert failed: {e}")
