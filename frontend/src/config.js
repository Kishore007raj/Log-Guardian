// Centralized CloudSentinel SOC Configuration
export const API_BASE = "http://localhost:8000/api";
export const WS_BASE = "ws://localhost:8000/api/ws/stream";

export const WS_RECONNECT_INTERVALS = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff ms
export const HEALTH_CHECK_INTERVAL = 5000;
