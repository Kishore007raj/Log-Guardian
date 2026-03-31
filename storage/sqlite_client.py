import sqlite3
import os
from config.schema import GlobalEvent
from config.settings import config, setup_logger

logger = setup_logger("storage.sqlite")

class SQLiteClient:
    def __init__(self):
        self.db_path = config.SQLITE_DB_PATH
        self._init_db()

    def _get_conn(self):
        return sqlite3.connect(self.db_path)

    def _init_db(self):
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS incidents (
                        incident_id TEXT PRIMARY KEY,
                        src_ip TEXT,
                        severity TEXT,
                        action TEXT,
                        event_count INTEGER DEFAULT 1,
                        last_seen_timestamp REAL
                    );
                """)
                conn.commit()
            logger.info(f"Initialized SQLite database at {self.db_path}")
        except Exception as e:
            logger.error(f"Failed to initialize SQLite table: {e}")

    def store_incident(self, event: GlobalEvent):
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO incidents (incident_id, src_ip, severity, action, event_count, last_seen_timestamp)
                    VALUES (?, ?, ?, ?, 1, ?)
                    ON CONFLICT(incident_id) DO UPDATE SET
                        event_count = incidents.event_count + 1,
                        severity = excluded.severity,
                        action = excluded.action,
                        last_seen_timestamp = excluded.last_seen_timestamp;
                """, (
                    event.incident_id,
                    event.src_ip,
                    event.severity,
                    event.action,
                    float(event.timestamp)
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"SQLite upsert failed: {e}")

    def close(self):
        pass # Connections are opened/closed per query in SQLite
