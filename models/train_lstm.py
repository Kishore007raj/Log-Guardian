import torch
import torch.nn as nn
import torch.optim as optim
import os
import time
from config.settings import config, setup_logger

logger = setup_logger("models.train_lstm")

class SimpleBiLSTM(nn.Module):
    def __init__(self, input_size=6, hidden_size=16, num_layers=1, num_classes=1):
        super(SimpleBiLSTM, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, bidirectional=True)
        self.fc = nn.Linear(hidden_size * 2, num_classes)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        out, _ = self.lstm(x)
        out = self.fc(out[:, -1, :])
        return self.sigmoid(out)

def train_and_save():
    model = SimpleBiLSTM()
    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.01)
    
    # Synthetic seq data (batch=1000, seq_len=1, features=6)
    # Features align with feature engineering: [port, packet_size, is_failure, window_req_count, window_unique_ports, window_failure_ratio]
    X = torch.rand(1000, 1, 6)
    y = torch.randint(0, 2, (1000, 1)).float()
    
    logger.info("Training Stage2 BiLSTM model...")
    for epoch in range(5):
        optimizer.zero_grad()
        outputs = model(X)
        loss = criterion(outputs, y)
        loss.backward()
        optimizer.step()
        
    timestamp = int(time.time())
    versioned_path = f"{config.LSTM_MODEL_PATH}.{timestamp}.pth"
    
    os.makedirs(os.path.dirname(config.LSTM_MODEL_PATH), exist_ok=True)
    torch.save(model.state_dict(), versioned_path)
    torch.save(model.state_dict(), config.LSTM_MODEL_PATH)
    logger.info(f"Model saved to {versioned_path} and {config.LSTM_MODEL_PATH}")

if __name__ == "__main__":
    train_and_save()
