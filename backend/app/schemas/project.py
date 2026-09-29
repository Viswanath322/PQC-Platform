from datetime import datetime
from typing import Annotated
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

# trims spaces, rejects empty / whitespace-only, max 255 (matches projects.name VARCHAR(255))
ProjectName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]


class ProjectCreate(BaseModel):
    name: ProjectName
    description: str | None = Field(default=None, max_length=10000)


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    description: str | None = None
    created_at: datetime
