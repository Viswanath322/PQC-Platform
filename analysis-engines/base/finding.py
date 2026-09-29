"""Canonical finding model shared by analysis engines and API adapters."""

from dataclasses import dataclass
from enum import StrEnum


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

    ``is_development`` lets consumers distinguish fixtures from real findings;
    it defaults to false so production engines cannot accidentally mark every
    result as a fixture.
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
    is_development: bool = False

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

        if not isinstance(self.engine, EngineName):
            raise ValueError(f"engine must be one of: {', '.join(item.value for item in EngineName)}")
        if not isinstance(self.severity, Severity):
            raise ValueError(f"severity must be one of: {', '.join(item.value for item in Severity)}")
        if self.line_number is not None and (
            not isinstance(self.line_number, int) or isinstance(self.line_number, bool) or self.line_number < 1
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
