import json
import re
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from app.schemas.common import UuidStr

_UPLOAD_ID_IN_PATH = re.compile(r"([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\.zip$")


class ScanStatus(str, Enum):
    """Same 8 values as the scan_status_enum in MySQL (database/schema.sql)."""

    QUEUED = "QUEUED"
    INGESTING = "INGESTING"
    ANALYZING = "ANALYZING"
    PROCESSING = "PROCESSING"
    AI_ANALYSIS = "AI_ANALYSIS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


FINAL_STATUSES = {ScanStatus.COMPLETED, ScanStatus.FAILED, ScanStatus.CANCELLED}


class EngineStatusEnum(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


SUPPORTED_ENGINES = ("sast", "crypto", "dependency", "configuration")


class AnalysisJobPayload(BaseModel):
    """Stable, serializable, deterministic analysis job payload for Redis/worker dispatch."""

    scan_id: UuidStr
    repository_workspace: str
    selected_engines: list[str] = Field(
        default_factory=lambda: ["sast", "crypto", "dependency", "configuration"]
    )
    attempt: int = Field(default=1, ge=1)
    max_retries: int = Field(default=3, ge=1)

    @field_validator("repository_workspace")
    @classmethod
    def validate_workspace(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("repository_workspace cannot be empty")
        if ".." in value:
            raise ValueError("repository_workspace cannot contain directory traversal '..'")
        return value

    @field_validator("selected_engines")
    @classmethod
    def validate_engines(cls, engines: list[str]) -> list[str]:
        valid = set(SUPPORTED_ENGINES)
        cleaned: list[str] = []
        for e in engines:
            e_lower = e.strip().lower()
            if e_lower not in valid:
                raise ValueError(f"Invalid engine '{e}'. Must be one of {sorted(valid)}")
            if e_lower not in cleaned:
                cleaned.append(e_lower)
        if not cleaned:
            raise ValueError("selected_engines must contain at least one engine")
        return cleaned


class UploadOut(BaseModel):
    upload_id: str
    filename: str
    size_bytes: int


class ScanCreate(BaseModel):
    project_id: UuidStr
    upload_id: UuidStr
    selected_engines: list[str] | None = None


class ScanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    status: ScanStatus
    # Read from the DB row but never sent to the client (it is an absolute server path).
    repository_path: str | None = Field(default=None, exclude=True)
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error_message: str | None = None
    engine_statuses: dict[str, str] | None = None
    attempt_count: int = 1
    max_retries: int = 3

    @field_validator("engine_statuses", mode="before")
    @classmethod
    def parse_engine_statuses(cls, value: Any) -> dict[str, str] | None:
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return None
        return value

    @computed_field
    @property
    def upload_id(self) -> str | None:
        """The id of the uploaded ZIP this scan was created from (safe to expose)."""
        match = _UPLOAD_ID_IN_PATH.search(self.repository_path or "")
        return match.group(1) if match else None


class EngineTelemetryOut(BaseModel):
    scan_id: str
    status: ScanStatus
    engine_statuses: dict[str, str]
    engine_errors: dict[str, str] = Field(default_factory=dict)
    attempt_count: int = 1
    max_retries: int = 3

