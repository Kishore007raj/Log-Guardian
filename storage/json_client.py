import json
import os
from config.settings import config, setup_logger

logger = setup_logger("storage.json")

class JSONStorageClient:
    def __init__(self):
        self.file_path = config.JSON_EVENTS_PATH
        # Ensure file exists
        if not os.path.exists(self.file_path):
            with open(self.file_path, "w") as f:
                pass

    def store_batch(self, events: list):
        if not events:
            return
            
        try:
            with open(self.file_path, "a") as f:
                for event in events:
                    json.dump(event.model_dump(), f)
                    f.write("\n")
        except Exception as e:
            logger.error(f"JSON File bulk Index failed: {e}")
