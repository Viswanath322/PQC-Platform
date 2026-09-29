"""Adapter between the analysis contract tests and Harshitha's `analysis-engines/` package.

Branch `backend/harshitha-analysis` @89f3041. Run with PQC_ANALYSIS_ROOT=.worktrees/harshitha.

How the team is meant to import it (analysis-engines/README.md): the directory name has a hyphen, so it
cannot be imported by name. Its `analysis-engines/` dir is put on PYTHONPATH and the modules are imported
top-level: `from base import ...`, `from dummy_engine import DummyEngine`. tests/conftest.py does that
prepend when PQC_ANALYSIS_ROOT is set.

The package uses enum.StrEnum (Python 3.11+, the project's stated minimum). This QA venv is 3.10, so
tests/analysis/conftest.py can install a tiny StrEnum polyfill when PQC_ANALYSIS_STRENUM_POLYFILL=1.
Without it, on 3.10 every test in this folder is Blocked.
"""
from __future__ import annotations

import importlib
import sys
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


def load() -> SimpleNamespace:
    try:
        base = importlib.import_module("base")
        dummy = importlib.import_module("dummy_engine")
    except ImportError as exc:
        if "StrEnum" in str(exc):
            blocked(f"analysis-engines needs Python 3.11+ (enum.StrEnum); running {sys.version.split()[0]}. "
                    "Set PQC_ANALYSIS_STRENUM_POLYFILL=1 for an advisory run on 3.10")
        blocked(NOT_DELIVERED)
    if getattr(base, "AnalysisEngine", None) is None:
        blocked("base.AnalysisEngine missing")
    return SimpleNamespace(
        AnalysisEngine=base.AnalysisEngine, AnalysisResult=base.AnalysisResult, EngineName=base.EngineName,
        Finding=base.Finding, Severity=base.Severity, DummyEngine=dummy.DummyEngine,
    )
