"""Base contracts shared by all analysis engines."""

from .analyzer import AnalysisEngine
from .finding import EngineName, Finding, Severity
from .result import AnalysisResult

__all__ = ["AnalysisEngine", "AnalysisResult", "EngineName", "Finding", "Severity"]
