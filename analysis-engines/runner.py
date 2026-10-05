"""
Analysis pipeline runner for the PQC platform.

The runner orchestrates the full analysis pipeline for one scan:
  1. Receive a list of extracted repository files from ingestion
  2. Apply configured engines (SAST, Crypto, …)
  3. Deduplicate findings across engines
  4. Return a structured PipelineResult

This module contains no I/O beyond reading the already-extracted files.
It does not touch the database — persistence is the backend's responsibility.

Usage from the backend scan worker:

    from analysis_engines.runner import AnalysisPipeline
    from ingestion import ingest_repository

    summary = ingest_repository(zip_path, scan_dir)
    file_paths = [scan_dir / f["path"] for f in summary["files"]]
    result = AnalysisPipeline().run(file_paths)
    # result.all_findings → persist to DB
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, Sequence

from .base.analyzer import AnalysisEngine
from .base.finding import EngineName, Finding
from .base.result import AnalysisResult
from .crypto.engine import CryptoEngine
from .sast.engine import SASTEngine

logger = logging.getLogger(__name__)


@dataclass
class PipelineResult:
    """Aggregated output from all engines for one scan."""

    findings_by_engine: dict[str, tuple[Finding, ...]] = field(default_factory=dict)
    files_processed_by_engine: dict[str, int] = field(default_factory=dict)
    errors_by_engine: dict[str, tuple[str, ...]] = field(default_factory=dict)
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
        """Return a JSON-serialisable summary suitable for logging and reports."""
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
            "errors": list(self.all_errors),
        }


class AnalysisPipeline:
    """
    Runs all configured engines against a list of file paths.

    The default configuration runs SAST and Crypto engines.
    Engines are run sequentially; each receives the full file list
    and filters internally by supported extension.

    An engine failure is caught, logged, and recorded in errors —
    it does not abort the pipeline.
    """

    DEFAULT_ENGINES: tuple[AnalysisEngine, ...] = (
        SASTEngine(),
        CryptoEngine(),
    )

    def __init__(self, engines: Sequence[AnalysisEngine] | None = None) -> None:
        self._engines: tuple[AnalysisEngine, ...] = (
            tuple(engines) if engines is not None else self.DEFAULT_ENGINES
        )

    def run(self, files: Iterable[Path]) -> PipelineResult:
        """
        Run all engines against the supplied file paths.

        Parameters
        ----------
        files:
            Absolute or scan-relative paths to extracted repository files.
            The pipeline does not filter out non-source files — each engine
            does its own extension filtering.
        """
        file_list = list(files)
        result = PipelineResult(total_files=len(file_list))

        for engine in self._engines:
            engine_name = engine.name.value
            logger.info("Pipeline: running engine=%s files=%d", engine_name, len(file_list))
            try:
                engine_result: AnalysisResult = engine.analyze(iter(file_list))
                result.findings_by_engine[engine_name] = engine_result.findings
                result.files_processed_by_engine[engine_name] = engine_result.files_processed
                result.errors_by_engine[engine_name] = engine_result.errors
                logger.info(
                    "Pipeline: engine=%s findings=%d errors=%d files_processed=%d",
                    engine_name,
                    len(engine_result.findings),
                    len(engine_result.errors),
                    engine_result.files_processed,
                )
            except Exception as exc:  # noqa: BLE001
                msg = f"Engine {engine_name} raised an unexpected error: {exc}"
                logger.exception(msg)
                result.findings_by_engine[engine_name] = ()
                result.files_processed_by_engine[engine_name] = 0
                result.errors_by_engine[engine_name] = (msg,)

        return result
