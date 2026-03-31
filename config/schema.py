from pydantic import BaseModel, Field
from typing import Dict, Any

class GlobalEvent(BaseModel):
    """
    STRICT GLOBAL EVENT SCHEMA
    No module is allowed to break this schema.
    """
    event_id: str = ""
    timestamp: str = ""
    src_ip: str = ""
    dest_ip: str = ""
    event_type: str = ""
    raw_log: str = ""
    features: Dict[str, Any] = Field(default_factory=dict)
    stage1_score: float = 0.0
    stage2_score: float = 0.0
    incident_id: str = ""
    severity: str = ""
    action: str = ""
