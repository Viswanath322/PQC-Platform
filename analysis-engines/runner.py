"""
Analysis pipeline runner for the PQC platform — Day 3.

Orchestrates the full analysis pipeline for one scan:
  1. Accept extracted repository files from ingestion
  2. Run all four engines: SAST, Crypto, Configuration, Dependency
  3. Normalize paths to repository-relative POSIX strings
  4. Deduplicate identical matches across engines
  5. Return a structured PipelineResult

No database I/O — persistence is the backend's responsibility.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Iterable, Sequence

from .base.analyzer import AnalysisEngine
from .base.component import CryptoComponent
from .base.finding import Finding
from .base.result import AnalysisResult
from .configuration.engine import ConfigurationEngine
from .crypto.engine import CryptoEngine
from .dependency.engine import DependencyEngine
from .normalizer import normalize_and_deduplicate
from .sast.engine import SASTEngine

logger = logging.getLogger(__name__)


class ScanCancelledError(Exception):
    """Raised by a worker callback when the owning scan was cancelled."""


@dataclass
class PipelineResult:
    """Aggregated output from all engines for one scan."""

    findings_by_engine: dict[str, tuple[Finding, ...]] = field(default_factory=dict)
    files_processed_by_engine: dict[str, int] = field(default_factory=dict)
    errors_by_engine: dict[str, tuple[str, ...]] = field(default_factory=dict)
    components: tuple[CryptoComponent, ...] = field(default_factory=tuple)
    total_files: int = 0

    @property
    def all_findings(self) -> tuple[Finding, ...]:
        """All findings from all engines, deduplicated by finding_id."""
        seen: set[str] = set()
        merged: list[Finding] = []
        for engine_findings in self.findings_by_engine.values():
            for f in engine_findings:
                if f.finding_id not in seen:
                    seen.add(f.finding_id)
                    merged.append(f)
        return tuple(merged)

    @property
    def all_errors(self) -> tuple[str, ...]:
        result: list[str] = []
        for engine_name, errs in self.errors_by_engine.items():
            result.extend(f"[{engine_name}] {e}" for e in errs)
        return tuple(result)

    def summary_dict(self) -> dict:
        """Return a JSON-serialisable summary."""
        counts: dict[str, int] = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for f in self.all_findings:
            if not f.is_development:
                counts[f.severity.value] += 1
        return {
            "total_findings": len([f for f in self.all_findings if not f.is_development]),
            "findings_by_severity": counts,
            "findings_by_engine": {k: len(v) for k, v in self.findings_by_engine.items()},
            "total_files_processed": self.total_files,
            "engines_run": list(self.findings_by_engine.keys()),
            "total_components": len(self.components),
            "errors": list(self.all_errors),
        }


class AnalysisPipeline:
    """
    Runs all configured engines against a list of file paths.

    Default engines: SAST, Crypto, Configuration, Dependency.
    An engine failure is caught and recorded without aborting the pipeline.
    Pass ``root_dir`` so engines use repository-relative path exclusion,
    and so the normalizer can make all paths relative before deduplication.
    """

    DEFAULT_ENGINES: tuple[AnalysisEngine, ...] = (
        SASTEngine(),
        CryptoEngine(),
        ConfigurationEngine(),
        DependencyEngine(),
    )

    def _make_default_engines(self, scan_id: str = "") -> tuple[AnalysisEngine, ...]:
        return (
            SASTEngine(),
            CryptoEngine(scan_id=scan_id),
            ConfigurationEngine(),
            DependencyEngine(),
        )

    def __init__(
        self,
        engines: Sequence[AnalysisEngine] | None = None,
        scan_id: str = "",
    ) -> None:
        if engines is not None:
            self._engines = tuple(engines)
        elif scan_id:
            self._engines = self._make_default_engines(scan_id)
        else:
            self._engines = self.DEFAULT_ENGINES

    def run(
        self,
        files: Iterable[Path],
        on_engine_status: Callable[[str, str], None] | None = None,
        *,
        root_dir: Path | None = None,
    ) -> PipelineResult:
        """
        Run all engines, normalize paths and deduplicate findings.

        Parameters
        ----------
        files:
            Paths to extracted repository files.
        root_dir:
            Root of the extracted repository. When provided:
            - Each engine's exclusion check uses relative paths (AE-14).
            - The normalizer makes all finding paths relative before dedup.
        on_engine_status:
            Optional callback invoked with (engine_name, status) as each engine runs.
        """
        file_list = list(files)
        result = PipelineResult(total_files=len(file_list))
        all_components: list[CryptoComponent] = []

        for engine in self._engines:
            # Forward root_dir via set_root_dir if the engine supports it
            if root_dir is not None and hasattr(engine, "set_root_dir"):
                engine.set_root_dir(root_dir)

            engine_name = engine.name.value
            logger.info(
                "Pipeline: running engine=%s files=%d", engine_name, len(file_list)
            )
            if on_engine_status is not None:
                on_engine_status(engine_name, "RUNNING")
            try:
                engine_result: AnalysisResult = engine.analyze(iter(file_list))

                result.findings_by_engine[engine_name] = engine_result.findings
                result.files_processed_by_engine[engine_name] = (
                    engine_result.files_processed
                )
                result.errors_by_engine[engine_name] = engine_result.errors
                all_components.extend(engine_result.components)
                engine_status = "FAILED" if engine_result.errors else "COMPLETED"
                logger.info(
                    "Pipeline: engine=%s findings=%d components=%d errors=%d processed=%d",
                    engine_name,
                    len(engine_result.findings),
                    len(engine_result.components),
                    len(engine_result.errors),
                    engine_result.files_processed,
                )
            except Exception as exc:  # noqa: BLE001
                msg = f"Engine {engine_name} raised an unexpected error: {exc}"
                logger.exception(msg)
                result.findings_by_engine[engine_name] = ()
                result.files_processed_by_engine[engine_name] = 0
                result.errors_by_engine[engine_name] = (msg,)
                engine_status = "FAILED"
            if on_engine_status is not None:
                on_engine_status(engine_name, engine_status)

        result.components = tuple(all_components)

        # Normalize paths + deduplicate across all engines when root_dir is known
        if root_dir is not None:
            raw = result.all_findings
            normalized = normalize_and_deduplicate(raw, root_dir)
            # Rebuild findings_by_engine from the normalized+deduped set
            # so per-engine counts reflect the final deduplicated state
            engine_buckets: dict[str, list[Finding]] = {
                name: [] for name in result.findings_by_engine
            }
            for f in normalized:
                engine_buckets.setdefault(f.engine.value, []).append(f)
            result.findings_by_engine = {
                k: tuple(v) for k, v in engine_buckets.items()
            }

        return result
