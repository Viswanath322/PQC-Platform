"""Adapter between the analysis contract tests and Harshitha's analysis engines.

Run with PQC_ANALYSIS_ROOT=.worktrees/harshitha (Python 3.11+, the engines use enum.StrEnum).

Two layouts are supported:
- current (backend/harshitha-analysis @200cfdf and later): an `analysis_engines` package facade at the
  checkout root, imported as `from analysis_engines import ...`. tests/conftest.py puts the checkout root
  on sys.path when it sees `analysis_engines/__init__.py`.
- older (@89f3041): the hyphenated `analysis-engines/` dir on sys.path and top-level
  `from base import ...`, `from dummy_engine import DummyEngine`.

tests/analysis/conftest.py can install a tiny StrEnum polyfill when PQC_ANALYSIS_STRENUM_POLYFILL=1 for an
advisory run on Python 3.10.
"""
from __future__ import annotations

import importlib
import sys
from pathlib import Path
from types import SimpleNamespace

from tests.conftest import blocked  # noqa: E402

NOT_DELIVERED = "analysis-engines not importable (set PQC_ANALYSIS_ROOT=.worktrees/harshitha, Harshitha)"

STRENUM_POLYFILL_SRC = (
    "import enum\n"
    "if not hasattr(enum, 'StrEnum'):\n"
    "    class StrEnum(str, enum.Enum):\n"
    "        def __str__(self): return str.__str__(self)\n"
    "    enum.StrEnum = StrEnum\n"
)


def _blocked_for(exc: ImportError):
    if "StrEnum" in str(exc):
        blocked(f"analysis engines need Python 3.11+ (enum.StrEnum); running {sys.version.split()[0]}. "
                "Set PQC_ANALYSIS_STRENUM_POLYFILL=1 for an advisory run on 3.10")
    blocked(NOT_DELIVERED)


def load() -> SimpleNamespace:
    try:
        pkg = importlib.import_module("analysis_engines")
    except ImportError as exc:
        if "analysis_engines" not in str(exc):
            _blocked_for(exc)
        pkg = None
    if pkg is not None:
        return SimpleNamespace(
            AnalysisEngine=pkg.AnalysisEngine, AnalysisResult=pkg.AnalysisResult, EngineName=pkg.EngineName,
            Finding=pkg.Finding, Severity=pkg.Severity, DummyEngine=pkg.DummyEngine,
            engines_dir=Path(pkg.__path__[0]).resolve(), layout="package",
        )
    try:
        base = importlib.import_module("base")
        dummy = importlib.import_module("dummy_engine")
    except ImportError as exc:
        _blocked_for(exc)
    if getattr(base, "AnalysisEngine", None) is None:
        blocked("base.AnalysisEngine missing")
    return SimpleNamespace(
        AnalysisEngine=base.AnalysisEngine, AnalysisResult=base.AnalysisResult, EngineName=base.EngineName,
        Finding=base.Finding, Severity=base.Severity, DummyEngine=dummy.DummyEngine,
        engines_dir=Path(base.__file__).resolve().parent.parent, layout="top-level",
    )
