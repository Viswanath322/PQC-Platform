"""
PQC Security Assessment Platform - SQLAlchemy Core Models (Day 1)
Author: Vamsi (Database Engineer)

Unified Identifier Standard:
  - All primary and foreign keys use UUID strings (CHAR(36) / VARCHAR(36))
  - Auto-generates standard UUIDs via uuid.uuid4()
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    BigInteger,
    Integer,
    ForeignKey,
    Enum,
    Boolean,
    Float,
    text,
)
from sqlalchemy.dialects.mysql import DATETIME as MySQLDateTime
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

# Support microsecond precision (DATETIME(6)) for MySQL while remaining compatible with SQLite
DateTime6 = DateTime().with_variant(MySQLDateTime(fsp=6), "mysql")


def generate_uuid() -> str:
    """Generate a standard UUID string for primary keys."""
    return str(uuid.uuid4())


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime6, server_default=text("CURRENT_TIMESTAMP(6)"), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime6, server_default=text("CURRENT_TIMESTAMP(6)"), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships (aligned with SQL ON DELETE SET NULL)
    users = relationship("User", back_populates="organization", passive_deletes=True)
    projects = relationship("Project", back_populates="organization", passive_deletes=True)

    def __repr__(self) -> str:
        return f"<Organization id={self.id} name='{self.name}'>"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), server_default="user", nullable=False, default="user")
    created_at = Column(DateTime6, server_default=text("CURRENT_TIMESTAMP(6)"), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime6, server_default=text("CURRENT_TIMESTAMP(6)"), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="users")

    def __repr__(self) -> str:
        return f"<User id={self.id} email='{self.email}'>"


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, default="org-default-001")
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime6, server_default=text("CURRENT_TIMESTAMP(6)"), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime6, server_default=text("CURRENT_TIMESTAMP(6)"), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="projects")
    scans = relationship("Scan", back_populates="project", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Project id={self.id} name='{self.name}'>"


class Scan(Base):
    __tablename__ = "scans"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(
        Enum(
            "QUEUED",
            "INGESTING",
            "ANALYZING",
            "PROCESSING",
            "AI_ANALYSIS",
            "COMPLETED",
            "FAILED",
            "CANCELLED",
            name="scan_status_enum",
        ),
        server_default="QUEUED",
        nullable=False,
        default="QUEUED",
        index=True,
    )
    repository_path = Column(String(1024), nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime6, server_default=text("CURRENT_TIMESTAMP(6)"), default=datetime.utcnow, nullable=False, index=True)
    started_at = Column(DateTime6, nullable=True)
    completed_at = Column(DateTime6, nullable=True)

    # Relationships
    project = relationship("Project", back_populates="scans")
    scan_files = relationship("ScanFile", back_populates="scan", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="scan", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Scan id={self.id} status='{self.status}' project_id='{self.project_id}'>"


class ScanFile(Base):
    __tablename__ = "scan_files"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    scan_id = Column(String(36), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(1024), nullable=False)
    file_type = Column(String(100), nullable=True)
    language = Column(String(100), nullable=True, index=True)
    size_bytes = Column(BigInteger, server_default=text("0"), nullable=False, default=0)
    created_at = Column(DateTime6, server_default=text("CURRENT_TIMESTAMP(6)"), default=datetime.utcnow, nullable=False)

    # Relationships
    scan = relationship("Scan", back_populates="scan_files")

    def __repr__(self) -> str:
        return f"<ScanFile id={self.id} path='{self.file_path}'>"


class Finding(Base):
    __tablename__ = "findings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    scan_id = Column(String(36), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True)
    engine = Column(
        Enum("sast", "crypto", "dependency", "configuration", name="finding_engine_enum"),
        nullable=False,
        index=True,
    )
    category = Column(String(100), nullable=True)
    severity = Column(
        Enum("critical", "high", "medium", "low", name="finding_severity_enum"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    file_path = Column(String(1024), nullable=False)
    line_number = Column(Integer, nullable=True)
    evidence = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    recommendation = Column(Text, nullable=True)
    is_development = Column(Boolean, server_default=text("0"), nullable=False, default=False)
    created_at = Column(DateTime6, server_default=text("CURRENT_TIMESTAMP(6)"), default=datetime.utcnow, nullable=False)

    # Relationships
    scan = relationship("Scan", back_populates="findings")

    def __repr__(self) -> str:
        return f"<Finding id={self.id} severity='{self.severity}' engine='{self.engine}'>"

