"""Abstract interface implemented by all analysis engines."""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Iterable

from .finding import EngineName
from .result import AnalysisResult


class AnalysisEngine(ABC):
    """Contract for one deterministic analysis engine."""

    @property
    @abstractmethod
    def name(self) -> EngineName:
        """Return the stable engine identifier."""

    @abstractmethod
    def analyze(self, files: Iterable[Path]) -> AnalysisResult:
        """Analyze the supplied file paths and return a normalized result."""
