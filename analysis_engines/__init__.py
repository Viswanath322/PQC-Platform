"""Importable package facade for source stored in ``analysis-engines/``."""

from pathlib import Path

# Preserve the team guide's source directory name while exposing the valid
# Python package name ``analysis_engines`` from the repository root.
__path__ = [str(Path(__file__).resolve().parent.parent / "analysis-engines")]

from .base.analyzer import AnalysisEngine
from .base.finding import EngineName, Finding, Severity
from .base.result import AnalysisResult
from .dummy_engine import DummyEngine

__all__ = [
    "AnalysisEngine",
    "AnalysisResult",
    "DummyEngine",
    "EngineName",
    "Finding",
    "Severity",
]
