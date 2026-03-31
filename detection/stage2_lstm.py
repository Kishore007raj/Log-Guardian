import os
import torch
from typing import List
from config.schema import GlobalEvent
from config.settings import config, setup_logger

logger = setup_logger("detection.stage2")

from models.train_lstm import SimpleBiLSTM

class LSTMDetector:
    def __init__(self):
        self.model = SimpleBiLSTM()
        if os.path.exists(config.LSTM_MODEL_PATH):
            self.model.load_state_dict(torch.load(config.LSTM_MODEL_PATH, weights_only=True))
            self.model.eval()
            logger.info("Loaded Stage2 BiLSTM model.")
        else:
            logger.warning(f"BiLSTM model not found at {config.LSTM_MODEL_PATH}. Test inference will pass through 0.0 scores.")
            self.model = None

    def detect_batch(self, events: List[GlobalEvent]) -> List[GlobalEvent]:
        # ARCHITECTURE FIX: Combine all high-scoring elements into a single PyTorch tensor for massive GPU/CPU efficiency gains.
        if self.model is None or not events:
            return events

        suspicious_indices = []
        matrix = []
        
        for i, event in enumerate(events):
            if event.stage1_score >= 0.5:
                suspicious_indices.append(i)
                feat = event.features
                matrix.append([
                    feat.get("port", 0.0),
                    feat.get("packet_size", 0.0),
                    feat.get("is_failure", 0.0),
                    feat.get("window_req_count", 0.0),
                    feat.get("window_unique_ports", 0.0),
                    feat.get("window_failure_ratio", 0.0)
                ])
            else:
                event.stage2_score = 0.0
                
        if not matrix:
            return events
            
        try:
            with torch.no_grad():
                # Shape: (Batch, Seq_Len=1, Features=6)
                X = torch.tensor(matrix, dtype=torch.float32).unsqueeze(1)
                scores = self.model(X).squeeze(1).numpy()
                
            if scores.ndim == 0:
                scores = [scores.item()]

            # Restore deterministic mappings
            for idx, batch_idx in enumerate(suspicious_indices):
                events[batch_idx].stage2_score = float(scores[idx])
                
        except Exception as e:
            logger.error(f"Stage 2 PyTorch batch inference failed: {e}")
            
        return events
