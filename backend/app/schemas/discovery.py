from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from backend.app.services.discovery.target_validation import ScanProfile


class DiscoveryScanCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_cidr: str = Field(min_length=1, max_length=100)
    profile: ScanProfile


class DiscoveryScanPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: UUID
    network_scope_id: UUID
    target: str
    scan_type: str
    status: Literal["queued", "running", "completed", "failed", "cancelled"]
    started_at: datetime
    completed_at: datetime | None
    error_message: str | None
    scanner_name: str | None
    scanner_version: str | None


class DiscoveryScanList(BaseModel):
    items: list[DiscoveryScanPublic]
    total: int
