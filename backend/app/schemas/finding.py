"""Stable API contracts for scan findings and Day 1 report responses."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


FindingEngine = Literal["sast", "crypto", "dependency", "configuration"]
FindingSeverity = Literal["critical", "high", "medium", "low"]


class FindingOut(BaseModel):
    """A finding returned by the API; enum spellings match the database contract."""

    model_config = ConfigDict(from_attributes=True)

    finding_id: str = Field(description="Stable UUID of this finding")
    scan_id: str = Field(description="UUID of the scan that produced this finding")
    engine: FindingEngine
    category: str | None = None
    severity: FindingSeverity
    title: str
    file_path: str
    line_number: int | None = Field(default=None, ge=1)
    evidence: str | None = None
    confidence: str | None = None
    recommendation: str | None = None


class ReportSeverityCounts(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class ReportOut(BaseModel):
    """Day 1 report skeleton: scan metadata and finding counts, no export yet."""

    scan_id: str
    status: str
    generated_at: datetime
    total_findings: int = 0
    findings_by_severity: ReportSeverityCounts
