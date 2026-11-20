from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NIDSAlertStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["open", "acknowledged", "resolved"]


class NIDSAlertPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    network_scope_id: UUID
    rule_id: str
    name: str
    severity: str
    occurred_at: datetime
    source_ip: str
    destination_ip: str
    description: str
    evidence: str
    status: str
    created_at: datetime


class NIDSAlertList(BaseModel):
    items: list[NIDSAlertPublic]
    total: int
