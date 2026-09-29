"""Adapter between the ingestion contract tests and Hima Bindu's `ingestion/` module.

Every assumption about the module API lives HERE. Mapped on Hima's branch
`backend/hima-ingestion` @67e7f11 (run with PQC_INGESTION_ROOT=.worktrees/hima).

Real API (package `ingestion/`):
    ingestion.summary.ingest_repository(archive, scan_dir) -> dict   validate + extract + summarise
    ingestion.extractor.extract_zip_safely(archive, dest)  -> list[Path]
    ingestion.validator.validate_zip(archive)              -> Path (raises InvalidArchiveError)
    ingestion.file_filter.is_excluded(path)                -> bool
    ingestion.classifier.classify_file(path)               -> source|config|manifest|docs|data|binary|generated
    ingestion.language_detector.detect_language(path)      -> str | None
    ingestion.scan_adapter.ingest_scan_upload(archive, scan_uuid, storage_root) -> dict (+ writes JSON)
Rejection contract: raises ExtractionError or InvalidArchiveError (both ValueError subclasses).
Summary keys: files_seen, files_included, files_excluded, file_type_counts, language_counts,
              files=[{path, file_type, language, size_bytes}].
"""
from __future__ import annotations

import importlib
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))  # repo root

from tests.conftest import blocked  # noqa: E402  (shared convention)

NOT_DELIVERED = "ingestion module not importable (set PQC_INGESTION_ROOT=.worktrees/hima, Hima Bindu)"

# ---- the ONE place to change when the real API differs -----------------------
ASSUMED_API = {
    "extract": ("ingestion.summary", "ingest_repository"),
    "validate": ("ingestion.validator", "validate_zip"),
    "is_excluded": ("ingestion.file_filter", "is_excluded"),
    "classify": ("ingestion.classifier", "classify_file"),
    "language": ("ingestion.language_detector", "detect_language"),
    "scan_upload": ("ingestion.scan_adapter", "ingest_scan_upload"),
}
# ------------------------------------------------------------------------------

# Exceptions that indicate a crash rather than a clean, deliberate rejection.
CRASH_TYPES = (AttributeError, TypeError, KeyError, IndexError, NameError, UnboundLocalError,
               UnicodeError, MemoryError, RecursionError)


def _fn(key: str):
    try:
        pkg = importlib.import_module("ingestion")
    except ImportError:
        blocked(NOT_DELIVERED)
    # tests/ingestion/ can be picked up as an empty namespace package named
    # "ingestion"; only a real package (with __init__.py) counts as delivered.
    if getattr(pkg, "__file__", None) is None:
        blocked(NOT_DELIVERED)
    mod_name, fn_name = ASSUMED_API[key]
    try:
        mod = importlib.import_module(mod_name)
    except ImportError:
        blocked(f"{mod_name} missing (assumed API, see tests/ingestion/adapter.py)")
    fn = getattr(mod, fn_name, None)
    if fn is None:
        blocked(f"{mod_name}.{fn_name} missing (assumed API, see tests/ingestion/adapter.py)")
    return fn


@dataclass
class Outcome:
    accepted: bool
    summary: Any = None
    error: BaseException | None = None

    @property
    def clean(self) -> bool:
        """True if there was no crash-type exception."""
        return not isinstance(self.error, CRASH_TYPES)

    @property
    def deliberate(self) -> bool:
        """True if the error is one of the module's own typed rejections (not a raw OSError etc.)."""
        return type(self.error).__name__ in {"ExtractionError", "InvalidArchiveError"}


def extract(zip_path: Path, dest_dir: Path) -> Outcome:
    fn = _fn("extract")
    dest_dir.mkdir(parents=True, exist_ok=True)
    try:
        summary = fn(str(zip_path), str(dest_dir))
    except Exception as exc:  # noqa: BLE001 - rejection contract is "raises"
        return Outcome(False, None, exc)
    if isinstance(summary, dict):
        status = str(summary.get("status", "")).lower()
        if status in {"rejected", "error", "failed"} or summary.get("error"):
            return Outcome(False, summary, None)
    return Outcome(True, summary, None)


def validate(zip_path: Path):
    return _fn("validate")(str(zip_path))


def scan_upload(zip_path: Path, scan_id: str, storage_root: Path):
    return _fn("scan_upload")(str(zip_path), scan_id, str(storage_root))


def detect_language(rel_path: str):
    return _fn("language")(rel_path)


def classify(rel_path: str):
    return _fn("classify")(rel_path)


def is_excluded(rel_path: str):
    return _fn("is_excluded")(rel_path)


# ---- summary accessors (Hima's schema) ----------------------------------------
def summary_total_files(summary: dict) -> int | None:
    """Files INCLUDED in the inventory (excluded dirs are not counted)."""
    if isinstance(summary.get("files_included"), int):
        return summary["files_included"]
    return len(summary["files"]) if isinstance(summary.get("files"), list) else None


def summary_files_seen(summary: dict) -> int | None:
    return summary.get("files_seen") if isinstance(summary.get("files_seen"), int) else None


def summary_paths(summary: dict) -> list[str]:
    return [f["path"] if isinstance(f, dict) else str(f) for f in summary.get("files", [])]
