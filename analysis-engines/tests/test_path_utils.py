"""
Day 2 — Path normalization tests.

Verifies that normalize_path always returns repository-relative POSIX paths
and that normalize_findings_paths rebuilds findings with safe paths.
"""

import unittest
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from analysis_engines.path_utils import (
    PathNormalizationError,
    normalize_findings_paths,
    normalize_path,
)
from analysis_engines.base.finding import EngineName, Finding, Severity


def _make_finding(file_path: str) -> Finding:
    return Finding(
        finding_id=str(uuid5(NAMESPACE_URL, f"test/{file_path}")),
        engine=EngineName.SAST,
        category="test",
        severity=Severity.LOW,
        title="Test finding",
        file_path=file_path,
        line_number=1,
        evidence="test evidence",
        confidence=0.9,
        recommendation="fix it",
    )


class TestNormalizePath(unittest.TestCase):

    def test_simple_relative_path(self):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            root = Path(td).resolve()
            sub = root / "src" / "main.py"
            sub.parent.mkdir(parents=True, exist_ok=True)
            sub.touch()
            result = normalize_path(sub, root)
            self.assertEqual(result, "src/main.py")

    def test_forward_slashes_on_all_platforms(self):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            root = Path(td).resolve()
            sub = root / "a" / "b" / "c.py"
            sub.parent.mkdir(parents=True, exist_ok=True)
            sub.touch()
            result = normalize_path(sub, root)
            self.assertNotIn("\\", result)

    def test_file_outside_root_raises(self):
        import tempfile
        with tempfile.TemporaryDirectory() as td1:
            with tempfile.TemporaryDirectory() as td2:
                root = Path(td1).resolve()
                outside = Path(td2).resolve() / "evil.py"
                outside.touch()
                with self.assertRaises(PathNormalizationError):
                    normalize_path(outside, root)

    def test_root_file_itself(self):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            root = Path(td).resolve()
            f = root / "app.py"
            f.touch()
            self.assertEqual(normalize_path(f, root), "app.py")


class TestNormalizeFindingsPaths(unittest.TestCase):

    def test_paths_become_relative(self):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            root = Path(td).resolve()
            abs_path = root / "src" / "auth.py"
            abs_path.parent.mkdir(parents=True, exist_ok=True)
            abs_path.touch()

            findings = (_make_finding(str(abs_path)),)
            normalized = normalize_findings_paths(findings, root)
            self.assertEqual(len(normalized), 1)
            self.assertEqual(normalized[0].file_path, "src/auth.py")

    def test_outside_root_finding_skipped(self):
        import tempfile
        with tempfile.TemporaryDirectory() as td1:
            with tempfile.TemporaryDirectory() as td2:
                root = Path(td1).resolve()
                outside = Path(td2).resolve() / "evil.py"
                outside.touch()
                findings = (_make_finding(str(outside)),)
                result = normalize_findings_paths(findings, root)
                self.assertEqual(len(result), 0)

    def test_other_finding_fields_preserved(self):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            root = Path(td).resolve()
            abs_path = root / "test.py"
            abs_path.touch()
            original = _make_finding(str(abs_path))
            normalized = normalize_findings_paths((original,), root)
            self.assertEqual(len(normalized), 1)
            n = normalized[0]
            self.assertEqual(n.finding_id, original.finding_id)
            self.assertEqual(n.title, original.title)
            self.assertEqual(n.severity, original.severity)
            self.assertEqual(n.confidence, original.confidence)
            self.assertEqual(n.is_development, original.is_development)
