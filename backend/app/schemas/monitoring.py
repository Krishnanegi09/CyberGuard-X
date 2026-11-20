from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class MonitoringStart(BaseModel):
    model_config = ConfigDict(extra="forbid")

    interface: str = Field(default="en0", min_length=1, max_length=64)


class MonitoringStats(BaseModel):
    status: Literal["stopped", "starting", "running", "stopping", "failed"]
    interface: str | None
    captured_packets: int
    queued_packets: int
    processed_packets: int
    dropped_packets: int
    ignored_packets: int
    processing_errors: int
    queue_size: int
