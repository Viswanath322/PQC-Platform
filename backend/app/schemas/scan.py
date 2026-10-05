import re
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, computed_field

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


class UploadOut(BaseModel):
    upload_id: str
    filename: str
    size_bytes: int


class ScanCreate(BaseModel):
    project_id: UuidStr
    upload_id: UuidStr


class ScanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    status: ScanStatus
    # Read from the DB row but never sent to the client (it is an absolute server path).
    repository_path: str | None = Field(default=None, exclude=True)
    error_message: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None

    @computed_field
    @property
    def upload_id(self) -> str | None:
        """The id of the uploaded ZIP this scan was created from (safe to expose)."""
        match = _UPLOAD_ID_IN_PATH.search(self.repository_path or "")
        return match.group(1) if match else None
