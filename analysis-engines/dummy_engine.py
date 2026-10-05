"""Development-only engine used to exercise the common engine contract."""

from pathlib import Path
from typing import Iterable
from uuid import uuid4

from .base.analyzer import AnalysisEngine
from .base.finding import EngineName, Finding, Severity
from .base.result import AnalysisResult


class DummyEngine(AnalysisEngine):
    """Return one clearly marked fixture finding and count supplied files."""

    @property
    def name(self) -> EngineName:
        return EngineName.SAST

    def analyze(self, files: Iterable[Path]) -> AnalysisResult:
        processed_files = tuple(files)
        finding = Finding(
            finding_id=str(uuid4()),
            engine=self.name,
            category="sast",
            severity=Severity.LOW,
            title="Development fixture: DummyEngine is connected",
            file_path="<development-fixture>",
            line_number=None,
            evidence="This is a synthetic finding emitted by DummyEngine; it does not describe scanned code.",
            confidence=1.0,
            recommendation="Replace DummyEngine with a real analysis engine before using findings for security decisions.",
            is_development=True,
        )
        return AnalysisResult(findings=(finding,), files_processed=len(processed_files))
