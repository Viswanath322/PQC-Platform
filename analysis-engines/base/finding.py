"""Canonical finding model shared by analysis engines and API adapters.

Day 3 additions:
  - rule_id: stable identifier of the rule that produced this finding
  - rule_version: version string of the rule set (for reproducibility)
  - group_key: optional deduplication/correlation group key
"""

from __future__ import annotations

from dataclasses import dataclass
import sys
from uuid import UUID

if sys.version_info >= (3, 11):
    from enum import StrEnum
else:
    from enum import Enum

    class StrEnum(str, Enum):  # type: ignore[no-redef]
        """Minimal StrEnum backport."""


class EngineName(StrEnum):
    SAST = "sast"
    CRYPTO = "crypto"
    DEPENDENCY = "dependency"
    CONFIGURATION = "configuration"


class Severity(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass(frozen=True, slots=True)
class Finding:
    """One normalized analysis observation.

    ``rule_id`` and ``rule_version`` record which rule produced the finding so
    results can be reproduced from the same rule set version.

    ``group_key`` is an optional string used for deduplication and correlation;
    findings with the same group_key describe the same logical issue.
    """

    finding_id: str
    engine: EngineName
    category: str
    severity: Severity
    title: str
    file_path: str
    line_number: int | None
    evidence: str
    confidence: float
    recommendation: str
    explanation: str | None = None
    is_development: bool = False
    rule_id: str | None = None          # Day 3: stable rule identifier
    rule_version: str | None = None     # Day 3: rule-set version string
    group_key: str | None = None        # Day 3: deduplication / correlation key
    source_engine: str | None = None
    correlation_group_id: str | None = None

    def __post_init__(self) -> None:
        for field_name in (
            "finding_id",
            "category",
            "title",
            "file_path",
            "evidence",
            "recommendation",
        ):
            value = getattr(self, field_name)
            if not isinstance(value, str) or not value.strip():
                raise ValueError(f"{field_name} must be a non-empty string")

        # AE-09: file_path length check
        if len(self.file_path) > 1024:
            raise ValueError("file_path must not exceed 1024 characters")

        try:
            parsed_id = UUID(self.finding_id)
        except (AttributeError, TypeError, ValueError) as exc:
            raise ValueError("finding_id must be a canonical UUID string") from exc
        if str(parsed_id) != self.finding_id:
            raise ValueError("finding_id must be a canonical lowercase UUID string")

        if not isinstance(self.engine, EngineName):
            raise ValueError(
                f"engine must be one of: {', '.join(item.value for item in EngineName)}"
            )
        if not isinstance(self.severity, Severity):
            raise ValueError(
                f"severity must be one of: {', '.join(item.value for item in Severity)}"
            )
        if self.line_number is not None and (
            not isinstance(self.line_number, int)
            or isinstance(self.line_number, bool)
            or self.line_number < 1
        ):
            raise ValueError("line_number must be a positive integer or None")
        if (
            not isinstance(self.confidence, (int, float))
            or isinstance(self.confidence, bool)
            or not 0 <= self.confidence <= 1
        ):
            raise ValueError("confidence must be a number between 0 and 1")
        if not isinstance(self.is_development, bool):
            raise ValueError("is_development must be a boolean")
        if self.explanation is not None and not isinstance(self.explanation, str):
            raise ValueError("explanation must be a string or None")
        for opt_field in ("rule_id", "rule_version", "group_key"):
            v = getattr(self, opt_field)
            if v is not None and not isinstance(v, str):
                raise ValueError(f"{opt_field} must be a string or None")
