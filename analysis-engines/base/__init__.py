"""Base contracts shared by all analysis engines."""

from base.analyzer import AnalysisEngine
from base.finding import EngineName, Finding, Severity
from base.result import AnalysisResult

__all__ = ["AnalysisEngine", "AnalysisResult", "EngineName", "Finding", "Severity"]
