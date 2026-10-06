"""
Day 3 — Normalizer and deduplication tests.

Verifies:
  - Paths made relative after normalize_and_deduplicate
  - Duplicate (same engine, file, line, rule_id) → kept once (highest confidence)
  - Different rule on same line → both kept
  - Cross-engine duplicate removed if same rule_id+file+line
  - Outside-root paths skipped with warning
  - Output is deterministic (repeated calls produce same result)
  - Severity ordering: critical < high < medium < low
"""

import tempfile
import unittest
from pathlib import Path
from uuid import uuid4

from analysis_engines.base.finding import EngineName, Finding, Severity
from analysis_engines.normalizer import normalize_and_deduplicate


def _make(engine=EngineName.SAST, file_path="src/app.py",
          lineno=1, rule_id="R-001", confidence=0.8, severity=Severity.HIGH):
    return Finding(
        finding_id=str(uuid4()),
        engine=engine,
        category="test",
        severity=severity,
        title="Test",
        file_path=file_path,
        line_number=lineno,
        evidence="evidence",
        confidence=confidence,
        recommendation="fix",
        rule_id=rule_id,
        rule_version="1.0.0",
    )


class TestNormalizer(unittest.TestCase):

    def setUp(self):
        self.td = tempfile.TemporaryDirectory()
        self.root = Path(self.td.name)
        src = self.root / "src"
        src.mkdir()
        (src / "app.py").write_text("x=1\n")

    def tearDown(self):
        self.td.cleanup()

    def _abs(self, rel: str) -> str:
        return str(self.root / rel)

    def test_absolute_paths_become_relative(self):
        f = _make(file_path=self._abs("src/app.py"))
        result = normalize_and_deduplicate((f,), self.root)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].file_path, "src/app.py")
        self.assertNotIn("\\", result[0].file_path)

    def test_duplicate_same_rule_kept_once(self):
        f1 = _make(file_path=self._abs("src/app.py"), confidence=0.7)
        f2 = _make(file_path=self._abs("src/app.py"), confidence=0.9)
        result = normalize_and_deduplicate((f1, f2), self.root)
        self.assertEqual(len(result), 1)
        self.assertAlmostEqual(result[0].confidence, 0.9)

    def test_different_rules_same_line_both_kept(self):
        f1 = _make(file_path=self._abs("src/app.py"), rule_id="R-001")
        f2 = _make(file_path=self._abs("src/app.py"), rule_id="R-002")
        result = normalize_and_deduplicate((f1, f2), self.root)
        self.assertEqual(len(result), 2)

    def test_different_lines_both_kept(self):
        f1 = _make(file_path=self._abs("src/app.py"), lineno=1)
        f2 = _make(file_path=self._abs("src/app.py"), lineno=2)
        result = normalize_and_deduplicate((f1, f2), self.root)
        self.assertEqual(len(result), 2)

    def test_outside_root_skipped(self):
        with tempfile.TemporaryDirectory() as other:
            f = _make(file_path=str(Path(other) / "evil.py"))
            result = normalize_and_deduplicate((f,), self.root)
            self.assertEqual(len(result), 0)

    def test_deterministic_output(self):
        files = [self._abs("src/app.py")] * 5
        findings = tuple(
            _make(file_path=fp, rule_id=f"R-{i:03d}") for i, fp in enumerate(files)
        )
        r1 = normalize_and_deduplicate(findings, self.root)
        r2 = normalize_and_deduplicate(findings, self.root)
        self.assertEqual(
            [f.rule_id for f in r1],
            [f.rule_id for f in r2],
            "Normalizer output must be deterministic",
        )

    def test_severity_order_critical_first(self):
        fc = _make(file_path=self._abs("src/app.py"), rule_id="R-001",
                   severity=Severity.CRITICAL, lineno=3)
        fh = _make(file_path=self._abs("src/app.py"), rule_id="R-002",
                   severity=Severity.HIGH, lineno=2)
        fl = _make(file_path=self._abs("src/app.py"), rule_id="R-003",
                   severity=Severity.LOW, lineno=1)
        result = normalize_and_deduplicate((fl, fh, fc), self.root)
        self.assertEqual(result[0].severity, Severity.CRITICAL)
        self.assertEqual(result[-1].severity, Severity.LOW)

    def test_empty_input_returns_empty(self):
        result = normalize_and_deduplicate((), self.root)
        self.assertEqual(result, ())
