from typing import Literal

from pydantic import BaseModel, Field


class FlowFeaturesInput(BaseModel):
    src_port: int = Field(..., ge=0, le=65535, description="Source transport port")
    dst_port: int = Field(..., ge=0, le=65535, description="Destination transport port")
    proto: Literal["TCP", "UDP"] = Field(default="TCP", description="Transport protocol name")
    packet_count: int = Field(..., ge=1, description="Total packet count in flow")
    byte_count: int = Field(..., ge=1, description="Total byte count in flow")
    duration_ms: int = Field(..., ge=0, description="Flow duration in milliseconds")
    tcp_flags_syn: int = Field(default=0, ge=0, le=1, description="SYN flag present (0 or 1)")
    tcp_flags_ack: int = Field(default=0, ge=0, le=1, description="ACK flag present (0 or 1)")
    tcp_flags_fin: int = Field(default=0, ge=0, le=1, description="FIN flag present (0 or 1)")
    tcp_flags_rst: int = Field(default=0, ge=0, le=1, description="RST flag present (0 or 1)")


class PredictionResponse(BaseModel):
    prediction: Literal["BENIGN", "ATTACK"]
    is_anomaly: bool
    attack_probability: float = Field(..., ge=0.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    provenance: Literal["PREDICTED"] = "PREDICTED"
    model_name: str
    model_version: str
    explanation: str
    top_contributing_features: list[str]


class ModelMetadataResponse(BaseModel):
    model_name: str
    model_version: str
    model_type: str
    provenance: Literal["PREDICTED"]
    features: list[str]
    n_features: int
    target_classes: list[str]
    metrics: dict[str, float]
    feature_importances: dict[str, float]
