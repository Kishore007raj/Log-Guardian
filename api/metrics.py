from prometheus_client import Counter, Histogram

# General pipeline metrics exported on port 8000/api/metrics
EVENTS_PROCESSED_TOTAL = Counter(
    "soc_events_processed_total",
    "Total number of events processed successfully"
)
INCIDENTS_CREATED_TOTAL = Counter(
    "soc_incidents_created_total",
    "Total number of new incidents correlated"
)
MALFORMED_EVENTS_TOTAL = Counter(
    "soc_malformed_events_total",
    "Total number of events sent to DLQ"
)
QUEUE_LAG_GAUGE = Histogram(
    "soc_queue_lag",
    "Estimated seconds of lag in queue processing"
)
DETECTION_LATENCY = Histogram(
    "soc_detection_latency_seconds",
    "Time taken to run model inferences"
)
