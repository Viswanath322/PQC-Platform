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
from .dependency.engine import DependencyEngine
from .configuration.engine import ConfigurationEngine

logger = logging.getLogger(__name__)

ENGINE_REGISTRY: dict[str, type[AnalysisEngine]] = {
    "sast": SASTEngine,
    "crypto": CryptoEngine,
    "dependency": DependencyEngine,
    "configuration": ConfigurationEngine,
}


@dataclass
class PipelineResult:
    """Aggregated output from all engines for one scan."""

    findings_by_engine: dict[str, tuple[Finding, ...]] = field(default_factory=dict)
    files_processed_by_engine: dict[str, int] = field(default_factory=dict)
    errors_by_engine: dict[str, tuple[str, ...]] = field(default_factory=dict)
    engine_statuses: dict[str, str] = field(default_factory=dict)
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
            "engine_statuses": dict(self.engine_statuses),
            "errors": list(self.all_errors),
        }


class AnalysisPipeline:
    """
    Runs configured engines against a list of file paths.

    The default configuration runs SAST and Crypto engines.
    Engines can also be selected by name or passed explicitly.
    """

    DEFAULT_ENGINES: tuple[AnalysisEngine, ...] = (
        SASTEngine(),
        CryptoEngine(),
    )

    def __init__(
        self,
        engines: Sequence[AnalysisEngine] | None = None,
        selected_engines: Sequence[str] | None = None,
    ) -> None:
        if selected_engines is not None:
            instantiated: list[AnalysisEngine] = []
            for name in selected_engines:
                clean = name.strip().lower()
                if clean in ENGINE_REGISTRY:
                    instantiated.append(ENGINE_REGISTRY[clean]())
                else:
                    logger.warning("AnalysisPipeline: unknown engine name '%s' ignored", name)
            self._engines: tuple[AnalysisEngine, ...] = tuple(instantiated)
        elif engines is not None:
            self._engines: tuple[AnalysisEngine, ...] = tuple(engines)
        else:
            self._engines: tuple[AnalysisEngine, ...] = self.DEFAULT_ENGINES

    def run(
        self,
        files: Iterable[Path],
        on_engine_start=None,
        on_engine_complete=None,
        is_cancelled=None,
    ) -> PipelineResult:
        """
        Run all engines against the supplied file paths.
        """
        file_list = list(files)
        result = PipelineResult(total_files=len(file_list))

        for engine in self._engines:
            if is_cancelled and is_cancelled():
                logger.info("Pipeline: cancellation detected; stopping before engine %s", engine.name.value)
                break

            engine_name = engine.name.value
            logger.info("Pipeline: running engine=%s files=%d", engine_name, len(file_list))
            result.engine_statuses[engine_name] = "RUNNING"
            if on_engine_start:
                try:
                    on_engine_start(engine_name)
                except Exception as cb_exc:  # noqa: BLE001
                    logger.debug("on_engine_start callback error: %s", cb_exc)

            try:
                engine_result: AnalysisResult = engine.analyze(iter(file_list))
                result.findings_by_engine[engine_name] = engine_result.findings
                result.files_processed_by_engine[engine_name] = engine_result.files_processed
                result.errors_by_engine[engine_name] = engine_result.errors

                if engine_result.errors:
                    result.engine_statuses[engine_name] = "FAILED"
                    if on_engine_complete:
                        on_engine_complete(engine_name, False, "; ".join(engine_result.errors))
                else:
                    result.engine_statuses[engine_name] = "COMPLETED"
                    if on_engine_complete:
                        on_engine_complete(engine_name, True, None)

                logger.info(
                    "Pipeline: engine=%s findings=%d errors=%d files_processed=%d status=%s",
                    engine_name,
                    len(engine_result.findings),
                    len(engine_result.errors),
                    engine_result.files_processed,
                    result.engine_statuses[engine_name],
                )
            except Exception as exc:  # noqa: BLE001
                msg = f"Engine {engine_name} raised an unexpected error: {exc}"
                logger.exception(msg)
                result.findings_by_engine[engine_name] = ()
                result.files_processed_by_engine[engine_name] = 0
                result.errors_by_engine[engine_name] = (msg,)
                result.engine_statuses[engine_name] = "FAILED"
                if on_engine_complete:
                    on_engine_complete(engine_name, False, msg)

        return result
