# 🚀 Log Guardian: AI SOC Pipeline (Local Edition)

This project is a high-performance, lightweight SOC pipeline designed for real-time threat detection and incident management. 

> [!IMPORTANT]
> The system has been refactored to run locally without Kafka, Elasticsearch, or PostgreSQL.
> All processing now occurs in-memory (Python Queue) and persistent storage uses local SQLite (`soc.db`) and JSON lines (`events.json`).

---

## 🛠️ Prerequisites
- **Python 3.10+**
- **Node.js 18+**

---

## 🏃 Step-by-Step Execution

### 1. Backend Setup (API & Pipeline)
Open a terminal in the root directory and run:

```bash
# Install backend dependencies
pip install -r requirements.txt

# Start the Backend & Processing Pipeline
python main.py
```
> The backend runs on `http://localhost:8000`. It automatically starts the ingestion queue and background processing.

---

### 2. Frontend Setup (React Dashboard)
Open a **new** terminal in the root directory:

```bash
# Navigate to frontend folder
cd frontend

# Install frontend dependencies (needed if running for first time)
npm install

# Start the dashboard
npm run dev
```
> The dashboard will be accessible at `http://localhost:5173`. It connects to the backend API automatically.

---

### 3. Testing the Pipeline (Simulate Attacks)
To see the system in action, trigger the simulation:
- **UI**: Click the "Simulate Attack" or "Run Simulation" button in the Dashboard.
- **REST API**: Or, run this command from any terminal:
  ```bash
  # Windows PowerShell
  Invoke-RestMethod -Uri "http://localhost:8000/api/simulate" -Method Post -Body '{"num_events": 1000}' -ContentType "application/json"
  ```
---

## 📂 Project Structure (Local Edition)
- `main.py`: Dual-role orchestrator (FastAPI + Pipeline threading).
- `storage/`: Contains SQLite and JSON clients for lightweight storage.
- `detection/`: XGBoost and LSTM inference engines.
- `processing/`: Real-time feature extraction and sliding windows.
- `frontend/`: Modern React dashboard with polished visualizations.
- `soc.db`: Local SQLite database for incidents.
- `events.json`: Local storage for all security events.
