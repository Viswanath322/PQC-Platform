"""Expose the shared SQLAlchemy models used by the API."""

import sys
from pathlib import Path

repository_root = str(Path(__file__).resolve().parents[3])
if repository_root not in sys.path:
    sys.path.insert(0, repository_root)

from database.models import (  # noqa: E402
    Base,
    CBOMComponent,
    Finding,
    FindingCorrelation,
    Organization,
    Project,
    SBOMComponent,
    Scan,
    ScanComponent,
    ScanFile,
    User,
)

__all__ = [
    "Base",
    "CBOMComponent",
    "Finding",
    "FindingCorrelation",
    "Organization",
    "Project",
    "SBOMComponent",
    "Scan",
    "ScanComponent",
    "ScanFile",
    "User",
]
