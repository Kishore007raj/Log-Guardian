import os
import xgboost as xgb
import numpy as np
from typing import List
from config.schema import GlobalEvent
from config.settings import config, setup_logger

logger = setup_logger("detection.stage1")

class XGBoostDetector:
    def __init__(self):
        self.model = xgb.Booster()
        if os.path.exists(config.XGB_MODEL_PATH):
            self.model.load_model(config.XGB_MODEL_PATH)
            logger.info("Loaded Stage1 XGBoost model.")
        else:
            logger.warning(f"XGBoost model not found at {config.XGB_MODEL_PATH}. Test inference will pass through 0.0 scores.")
            self.model = None

    def detect_batch(self, events: List[GlobalEvent]) -> List[GlobalEvent]:
        # ARCHITECTURE FIX: Evaluate all events simultaneously using underlying C++ bindings to circumvent python Loop lag.
        if self.model is None or not events:
            return events

        matrix = []
        for event in events:
            feat = event.features
            matrix.append([
                feat.get("port", 0.0),
                feat.get("packet_size", 0.0),
                feat.get("is_failure", 0.0),
                feat.get("window_req_count", 0.0),
                feat.get("window_unique_ports", 0.0),
                feat.get("window_failure_ratio", 0.0)
            ])
            
        try:
            X = np.array(matrix)
            dmatrix = xgb.DMatrix(X)
            scores = self.model.predict(dmatrix)
            
            for i, event in enumerate(events):
                event.stage1_score = float(scores[i])
        except Exception as e:
            logger.error(f"XGBoost batch inference failed: {e}")
            for event in events:
                event.stage1_score = 0.0
                
        return events
