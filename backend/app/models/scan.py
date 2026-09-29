import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def new_id() -> str:
    return str(uuid.uuid4())


class Project(Base):
    __tablename__ = "projects"
    id = Column(String(36), primary_key=True, default=new_id)
    organization_id = Column(String(36), nullable=False, default="org-default-001")
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)


class Scan(Base):
    __tablename__ = "scans"
    id = Column(String(36), primary_key=True, default=new_id)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    status = Column(String(20), nullable=False, default="QUEUED")
    repository_path = Column(String(1024), nullable=True)
    created_at = Column(DateTime, default=utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
