"""Importable package facade for source stored in ``analysis-engines/``."""

from pathlib import Path

# Preserve the team guide's source directory name while exposing the valid
# Python package name ``analysis_engines`` from the repository root.
__path__ = [str(Path(__file__).resolve().parent.parent / "analysis-engines")]

from .base.analyzer import AnalysisEngine
from .base.finding import EngineName, Finding, Severity
from .base.result import AnalysisResult
from .dummy_engine import DummyEngine
from .runner import AnalysisPipeline, PipelineResult
from .sast.engine import SASTEngine
from .crypto.engine import CryptoEngine
from .dependency.engine import DependencyEngine
from .configuration.engine import ConfigurationEngine

__all__ = [
    "AnalysisEngine",
    "AnalysisPipeline",
    "AnalysisResult",
    "ConfigurationEngine",
    "CryptoEngine",
    "DependencyEngine",
    "DummyEngine",
    "EngineName",
    "Finding",
    "PipelineResult",
    "SASTEngine",
    "Severity",
]
