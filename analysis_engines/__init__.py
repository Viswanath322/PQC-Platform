"""Importable package facade for source stored in ``analysis-engines/``."""

from pathlib import Path

__path__ = [str(Path(__file__).resolve().parent.parent / "analysis-engines")]

from .base.analyzer import AnalysisEngine
from .base.component import CryptoComponent
from .base.finding import EngineName, Finding, Severity
from .base.result import AnalysisResult
from .configuration.engine import ConfigurationEngine
from .crypto.engine import CryptoEngine
from .dependency.engine import DependencyEngine
from .dummy_engine import DummyEngine
from .normalizer import normalize_and_deduplicate
from .runner import AnalysisPipeline, PipelineResult
from .sast.engine import SASTEngine

__all__ = [
    "AnalysisEngine",
    "AnalysisPipeline",
    "AnalysisResult",
    "ConfigurationEngine",
    "CryptoComponent",
    "CryptoEngine",
    "DependencyEngine",
    "DummyEngine",
    "EngineName",
    "Finding",
    "PipelineResult",
    "SASTEngine",
    "Severity",
    "normalize_and_deduplicate",
]
