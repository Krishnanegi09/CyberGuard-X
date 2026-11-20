import ipaddress
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class NetworkScopeCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    cidr_ranges: list[str] = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Scope name must contain at least 2 characters.")
        return value

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("cidr_ranges")
    @classmethod
    def validate_cidr_ranges(cls, values: list[str]) -> list[str]:
        normalized = []

        for value in values:
            try:
                network = ipaddress.ip_network(value.strip(), strict=True)
            except (ValueError, AttributeError):
                raise ValueError(
                    f"Invalid CIDR range: {value!r}. "
                    "Provide a canonical IPv4 or IPv6 network address."
                )

            normalized_value = str(network)

            if normalized_value in normalized:
                raise ValueError(
                    f"Duplicate CIDR range: {normalized_value}"
                )

            normalized.append(normalized_value)

        return normalized


class NetworkScopeStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["active", "disabled"]


class NetworkScopePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    name: str
    description: str | None
    status: str
    cidr_ranges: list[str]
    created_at: datetime
    updated_at: datetime
