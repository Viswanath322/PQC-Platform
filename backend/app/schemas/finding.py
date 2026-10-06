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
    explanation: str | None = Field(
        default=None,
        description="Human-readable explanation of why the finding matters",
    )
    description: str | None = Field(
        default=None,
        description="Human-readable explanation of why the finding matters",
    )
    confidence: float | None = Field(default=None, ge=0, le=1)
    rule_id: str | None = None
    rule_version: str | None = None
    source_engine: str | None = None
    correlation_group_id: str | None = None
    recommendation: str | None = None
    remediation: str | None = Field(
        default=None,
        description="Remediation guidance alias for recommendation",
    )
    is_development: bool = Field(
        default=False,
        description="True for synthetic or development-only findings",
    )

    def model_post_init(self, __context: object) -> None:
        if self.description is None and self.explanation is not None:
            self.description = self.explanation
        if self.remediation is None and self.recommendation is not None:
            self.remediation = self.recommendation


class ReportSeverityCounts(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class FindingBreakdown(BaseModel):
    key: str
    count: int = Field(ge=0)


class FindingSummaryOut(BaseModel):
    scan_id: str
    total_findings: int = Field(ge=0)
    by_engine: list[FindingBreakdown]
    by_severity: list[FindingBreakdown]
    by_category: list[FindingBreakdown]


class ComponentOut(BaseModel):
    component_id: str
    component_type: str
    name: str
    version: str | None = None
    purl: str | None = None
    source_file: str | None = None
    line_number: int | None = Field(default=None, ge=1)
    detection_method: str
    confidence: float | None = Field(default=None, ge=0, le=1)
    metadata: dict[str, object] = Field(default_factory=dict)


class ReportOut(BaseModel):
    """Persisted scan summary with finding details and SBOM/CBOM inventories."""

    scan_id: str
    status: str
    generated_at: datetime
    project_name: str = "Demo Project"
    target_repository: str = "repository"
    total_findings: int = 0
    findings_by_severity: ReportSeverityCounts
    findings_by_engine: dict[str, int] = Field(default_factory=dict)
    findings_by_category: dict[str, int] = Field(default_factory=dict)
    findings_truncated: bool = False
    findings: list[FindingOut] = Field(default_factory=list)
    sbom: list[ComponentOut] = Field(default_factory=list)
    cbom: list[ComponentOut] = Field(default_factory=list)
