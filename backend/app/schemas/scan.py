from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.common import UuidStr


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
    status: str
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
