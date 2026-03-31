import xgboost as xgb
import numpy as np
import os
import time
from config.settings import config, setup_logger

logger = setup_logger("models.train_xgb")

def train_and_save():
    # 1. Generate synthetic data
    # Normal behavior (label 0)
    X_normal = np.random.rand(800, 6)
    y_normal = np.zeros(800)
    
    # Anomaly behavior (label 1)
    X_anomaly = np.random.rand(200, 6) * 5  # Higher values for anomalies
    y_anomaly = np.ones(200)
    
    X = np.concatenate([X_normal, X_anomaly])
    y = np.concatenate([y_normal, y_anomaly])
    
    logger.info("Training Stage1 XGBoost model...")
    dtrain = xgb.DMatrix(X, label=y)
    params = {'objective': 'binary:logistic', 'eval_metric': 'auc'}
    model = xgb.train(params, dtrain, num_boost_round=10)
    
    # Versioning
    timestamp = int(time.time())
    versioned_path_json = f"{config.XGB_MODEL_PATH}.{timestamp}.json"
    
    os.makedirs(os.path.dirname(config.XGB_MODEL_PATH), exist_ok=True)
    model.save_model(versioned_path_json)
    
    # Update latest symlink/copy
    model.save_model(config.XGB_MODEL_PATH)
    logger.info(f"Model saved to {versioned_path_json} and {config.XGB_MODEL_PATH}")

if __name__ == "__main__":
    train_and_save()
