"""Common result envelope returned by every analysis engine."""

from dataclasses import dataclass, field

from .finding import Finding


@dataclass(frozen=True, slots=True)
class AnalysisResult:
    findings: tuple[Finding, ...] = field(default_factory=tuple)
    files_processed: int = 0
    errors: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        if not isinstance(self.findings, tuple) or any(not isinstance(item, Finding) for item in self.findings):
            raise ValueError("findings must be a tuple of Finding instances")
        if not isinstance(self.files_processed, int) or isinstance(self.files_processed, bool) or self.files_processed < 0:
            raise ValueError("files_processed must be a non-negative integer")
        if not isinstance(self.errors, tuple) or any(not isinstance(item, str) or not item.strip() for item in self.errors):
            raise ValueError("errors must be a tuple of non-empty strings")
