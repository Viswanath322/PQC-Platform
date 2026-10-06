"""Common result envelope returned by every analysis engine.

Day 3 additions:
  - components: tuple of CryptoComponent records (for CBOM)
  - to_dict(): JSON-serialisable representation
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .component import CryptoComponent
from .finding import Finding


@dataclass(frozen=True, slots=True)
class AnalysisResult:
    findings: tuple[Finding, ...] = field(default_factory=tuple)
    files_processed: int = 0
    errors: tuple[str, ...] = field(default_factory=tuple)
    components: tuple[CryptoComponent, ...] = field(default_factory=tuple)  # Day 3: CBOM

    def __post_init__(self) -> None:
        # Accept list inputs and convert (AE-07)
        if isinstance(self.findings, list):
            object.__setattr__(self, "findings", tuple(self.findings))
        if not isinstance(self.findings, tuple) or any(
            not isinstance(item, Finding) for item in self.findings
        ):
            raise ValueError("findings must be a tuple (or list) of Finding instances")

        if (
            not isinstance(self.files_processed, int)
            or isinstance(self.files_processed, bool)
            or self.files_processed < 0
        ):
            raise ValueError("files_processed must be a non-negative integer")

        if isinstance(self.errors, list):
            object.__setattr__(self, "errors", tuple(self.errors))
        if not isinstance(self.errors, tuple) or any(
            not isinstance(item, str) or not item.strip() for item in self.errors
        ):
            raise ValueError("errors must be a tuple of non-empty strings")

        if isinstance(self.components, list):
            object.__setattr__(self, "components", tuple(self.components))
        if not isinstance(self.components, tuple) or any(
            not isinstance(item, CryptoComponent) for item in self.components
        ):
            raise ValueError("components must be a tuple of CryptoComponent instances")

    def to_dict(self) -> dict:
        """Return a JSON-serialisable representation (AE-08)."""
        return {
            "files_processed": self.files_processed,
            "findings_count": len(self.findings),
            "components_count": len(self.components),
            "errors_count": len(self.errors),
            "findings": [
                {
                    "finding_id": f.finding_id,
                    "engine": f.engine.value,
                    "category": f.category,
                    "severity": f.severity.value,
                    "title": f.title,
                    "file_path": f.file_path,
                    "line_number": f.line_number,
                    "evidence": f.evidence,
                    "confidence": f.confidence,
                    "recommendation": f.recommendation,
                    "explanation": f.explanation,
                    "is_development": f.is_development,
                    "rule_id": f.rule_id,
                    "rule_version": f.rule_version,
                    "group_key": f.group_key,
                }
                for f in self.findings
            ],
            "components": [
                {
                    "component_id": c.component_id,
                    "algorithm": c.algorithm,
                    "category": c.category,
                    "file_path": c.file_path,
                    "line_number": c.line_number,
                    "quantum_risk": c.quantum_risk,
                    "nist_migration_target": c.nist_migration_target,
                    "confidence": c.confidence,
                    "detection_method": c.detection_method,
                    "rule_id": c.rule_id,
                    "rule_version": c.rule_version,
                }
                for c in self.components
            ],
            "errors": list(self.errors),
        }
