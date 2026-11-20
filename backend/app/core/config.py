from pathlib import Path
import json
from typing import Annotated, Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CYBERGUARD-X"
    app_env: str = "development"

    database_url: str
    firebase_service_account_path: Path | None = None
    firebase_project_id: str | None = None

    jwt_secret_key: SecretStr = Field(min_length=32)
    jwt_algorithm: Literal["HS256"] = "HS256"
    access_token_expire_minutes: int = Field(
        default=15,
        gt=0,
        le=60,
    )
    capture_allowed_interfaces: Annotated[tuple[str, ...], NoDecode] = (
        "en0",
        "en1",
        "en2",
        "en3",
        "en4",
        "lo0",
        "bridge0",
        "utun0",
        "utun1",
        "ap1",
        "awdl0",
    )

    @field_validator("capture_allowed_interfaces", mode="before")
    @classmethod
    def validate_capture_allowed_interfaces(cls, value):
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                try:
                    value = json.loads(stripped)
                except json.JSONDecodeError as exc:
                    raise ValueError(
                        "capture_allowed_interfaces must be a list or comma-separated names"
                    ) from exc
            else:
                value = value.split(",")

        if not isinstance(value, (list, tuple, set)):
            raise ValueError(
                "capture_allowed_interfaces must be a non-empty list"
            )

        interfaces = []
        for interface in value:
            if not isinstance(interface, str):
                raise ValueError("Capture interfaces must be strings")

            normalized = interface.strip()
            if not normalized or len(normalized) > 64 or any(
                character.isspace() or ord(character) < 32
                for character in normalized
            ):
                raise ValueError(
                    "Capture interfaces must be non-empty names without whitespace"
                )

            if normalized in interfaces:
                raise ValueError(
                    f"Duplicate capture interface: {normalized!r}"
                )

            interfaces.append(normalized)

        if not interfaces:
            raise ValueError("At least one capture interface is required")

        return tuple(interfaces)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
