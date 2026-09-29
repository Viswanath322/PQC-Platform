"""Adapter between the ingestion contract tests and Hima Bindu's `ingestion/` module.

The real module is NOT delivered yet, so every assumption about its API lives
HERE. When it lands, edit only this file (names in ASSUMED_API below, plus the
summary-key helpers at the bottom).

Assumed layout (from the team guide), repo-root package `ingestion/`:
    ingestion/validator.py         validate_zip(zip_path)            -> raises on invalid ZIP / returns info
    ingestion/extractor.py         extract_zip(zip_path, dest_dir)   -> summary dict (see below)
    ingestion/file_filter.py       is_excluded(rel_path)             -> bool
    ingestion/classifier.py        classify_file(rel_path)           -> str  source|config|manifest|docs|data|binary|generated
    ingestion/language_detector.py detect_language(rel_path)         -> str | None  ("python", "java", "javascript", ...)

Assumed extract_zip behaviour:
  * unsafe / invalid archives are REJECTED by raising an exception (any Exception subclass),
    or by returning a dict with status in {"rejected","error","failed"} or a truthy "error" key;
  * on success returns a JSON-serialisable dict with (all optional, read via helpers below):
        "total_files": int, "files": [{"path": str, "language": str, "category": str}, ...],
        "languages": {name: count}, "skipped"/"excluded": ...
"""
from __future__ import annotations

import importlib
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))  # repo root

from tests.conftest import blocked  # noqa: E402  (shared convention)

NOT_DELIVERED = "ingestion module not delivered yet (Hima Bindu)"

# ---- the ONE place to change when the real API differs -----------------------
ASSUMED_API = {
    "extract": ("ingestion.extractor", "extract_zip"),
    "validate": ("ingestion.validator", "validate_zip"),
    "is_excluded": ("ingestion.file_filter", "is_excluded"),
    "classify": ("ingestion.classifier", "classify_file"),
    "language": ("ingestion.language_detector", "detect_language"),
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


def detect_language(rel_path: str):
    return _fn("language")(rel_path)


def classify(rel_path: str):
    return _fn("classify")(rel_path)


def is_excluded(rel_path: str):
    return _fn("is_excluded")(rel_path)


# ---- summary accessors (adjust to the real summary schema) -------------------
def summary_total_files(summary: dict) -> int | None:
    for k in ("total_files", "file_count", "files_extracted", "count"):
        if isinstance(summary.get(k), int):
            return summary[k]
    if isinstance(summary.get("files"), list):
        return len(summary["files"])
    return None


def summary_paths(summary: dict) -> list[str]:
    return [f["path"] if isinstance(f, dict) else str(f) for f in summary.get("files", [])]
