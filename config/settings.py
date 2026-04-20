import logging
import os
import sys

def setup_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        formatter = logging.Formatter(
            '%(asctime)s | %(levelname)-8s | [%(name)s] | %(message)s'
        )
        ch = logging.StreamHandler(sys.stdout)
        ch.setFormatter(formatter)
        logger.addHandler(ch)
    return logger

class Config:
    # Storage Paths
    SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", "soc.db")
    JSON_EVENTS_PATH = os.getenv("JSON_EVENTS_PATH", "events.json")

    # Model Paths
    XGB_MODEL_PATH = os.getenv("XGB_MODEL_PATH", "models/bin/stage1_xgb.json")
    LSTM_MODEL_PATH = os.getenv("LSTM_MODEL_PATH", "models/bin/stage2_lstm.pth")
    
    # Pipeline Parameters
    SLIDING_WINDOW_SEC = int(os.getenv("SLIDING_WINDOW_SEC", "60"))
    INCIDENT_THRESHOLD = int(os.getenv("INCIDENT_THRESHOLD", "3"))

    # Alert Integrations
    SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
    SMTP_HOST = os.getenv("SMTP_HOST", "")
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASS = os.getenv("SMTP_PASS", "")
    ALERT_COOLDOWN_SEC = int(os.getenv("ALERT_COOLDOWN_SEC", "300"))

config = Config()
