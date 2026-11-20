from typing import Literal
from pydantic import BaseModel, Field


class TwinNode(BaseModel):
    id: str
    name: str
    ip: str
    os: str
    zone: Literal["DMZ", "INTERNAL", "CROWN_JEWELS"]
    status: Literal["normal", "compromised", "protected"] = "normal"
    services: list[str] = Field(default_factory=list)
    open_ports: list[int] = Field(default_factory=list)
    connected_to: list[str] = Field(default_factory=list)
    provenance: Literal["OBSERVED", "DERIVED", "SIMULATED"] = "OBSERVED"


class TwinEdge(BaseModel):
    source: str
    target: str
    protocol: str = "TCP"
    is_attack_path: bool = False
    provenance: Literal["DERIVED", "SIMULATED"] = "DERIVED"


class TwinGraphResponse(BaseModel):
    nodes: list[TwinNode]
    edges: list[TwinEdge]
    zones: list[str] = ["DMZ", "INTERNAL", "CROWN_JEWELS"]
    total_nodes: int
    provenance: Literal["OBSERVED", "DERIVED", "SIMULATED"] = "DERIVED"
