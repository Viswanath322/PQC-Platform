"""
Day 2 — SAST engine tests.

Verifies that:
  - Each rule fires on a known-vulnerable line
  - No false positives on clean code
  - Evidence is redacted (no plain-text secret values)
  - Output is schema-valid (UUID finding_id, correct enum values, 0-1 confidence)
  - Deduplication: same rule + file + line reported only once
  - file_path matches the input path
  - is_development is always False for real findings
"""

import io
import re
import unittest
from pathlib import Path
from uuid import UUID

from analysis_engines import EngineName, Severity
from analysis_engines.sast.engine import SASTEngine


def _write_file(tmp_path: Path, name: str, content: str) -> Path:
    p = tmp_path / name
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return p


class TestSASTEngineOnVulnerableCode(unittest.TestCase):
    """Each test checks one rule against a file that should trigger it."""

    def _run(self, tmp_path, filename, content):
        p = _write_file(tmp_path, filename, content)
        result = SASTEngine().analyze([p])
        return result

    def test_hardcoded_password_detected(self, tmp_path=None):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            tp = Path(td)
            result = self._run(tp, "config.py", 'SECRET_KEY = "my_super_secret_123"\n')
            titles = [f.title for f in result.findings]
            self.assertTrue(
                any("Hardcoded password" in t or "secret" in t.lower() for t in titles),
                f"Expected hardcoded secret finding, got: {titles}",
            )

    def test_sql_injection_detected(self, tmp_path=None):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            tp = Path(td)
            result = self._run(
                tp, "db.py",
                'cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")\n',
            )
            titles = [f.title for f in result.findings]
            self.assertTrue(
                any("SQL" in t for t in titles),
                f"Expected SQL injection finding, got: {titles}",
            )

    def test_command_injection_shell_true_detected(self, tmp_path=None):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            tp = Path(td)
            result = self._run(
                tp, "runner.py",
                "subprocess.check_output(cmd, shell=True)\n",
            )
            titles = [f.title for f in result.findings]
            self.assertTrue(
                any("Command Injection" in t or "shell" in t.lower() for t in titles),
                f"Expected command injection finding, got: {titles}",
            )

    def test_pickle_loads_detected(self, tmp_path=None):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            tp = Path(td)
            result = self._run(tp, "session.py", "obj = pickle.loads(data)\n")
            titles = [f.title for f in result.findings]
            self.assertTrue(
                any("pickle" in t.lower() for t in titles),
                f"Expected pickle finding, got: {titles}",
            )

    def test_md5_detected(self, tmp_path=None):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            tp = Path(td)
            result = self._run(tp, "hash.py", "h = hashlib.md5(data).hexdigest()\n")
            titles = [f.title for f in result.findings]
            self.assertTrue(
                any("MD5" in t for t in titles),
                f"Expected MD5 finding, got: {titles}",
            )

    def test_traceback_in_response_detected(self, tmp_path=None):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            tp = Path(td)
            result = self._run(
                tp, "errors.py",
                'return JSONResponse(content={"error": traceback.format_exc()})\n',
            )
            titles = [f.title for f in result.findings]
            self.assertTrue(
                any("traceback" in t.lower() for t in titles),
                f"Expected traceback finding, got: {titles}",
            )


class TestSASTEngineCleanCode(unittest.TestCase):
    """Clean code should produce zero findings."""

    def test_clean_file_zero_findings(self):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            tp = Path(td)
            p = _write_file(
                tp, "clean.py",
                "import os\n\ndef greet(name: str) -> str:\n    return f'Hello, {name}'\n",
            )
            result = SASTEngine().analyze([p])
            real_findings = [f for f in result.findings if not f.is_development]
            self.assertEqual(
                real_findings, [],
                f"Expected no findings on clean code, got: {[f.title for f in real_findings]}",
            )

    def test_non_source_file_skipped(self):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            tp = Path(td)
            p = _write_file(tp, "README.md", "password = 'secret'\n")
            result = SASTEngine().analyze([p])
            # .md is not in SCANNABLE — should be skipped
            self.assertEqual(result.files_processed, 0)

    def test_vendor_directory_skipped(self):
        """Files inside vendor/ must not be scanned."""
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            tp = Path(td)
            p = _write_file(tp, "vendor/lib/util.py", "password = 'secret123'\n")
            result = SASTEngine().analyze([p])
            self.assertEqual(result.files_processed, 0, "vendor/ file should be excluded")

    def test_node_modules_skipped(self):
        """Files inside node_modules/ must not be scanned."""
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            tp = Path(td)
            p = _write_file(tp, "node_modules/pkg/index.js", "var password = 'secret123';\n")
            result = SASTEngine().analyze([p])
            self.assertEqual(result.files_processed, 0, "node_modules/ file should be excluded")


class TestSASTEngineSchema(unittest.TestCase):
    """Every finding must be schema-valid."""

    def _get_findings(self):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            tp = Path(td)
            p = _write_file(
                tp, "vuln.py",
                'password = "abc123"\ncursor.execute(f"SELECT {x}")\npickle.loads(data)\n',
            )
            result = SASTEngine().analyze([p])
            return result.findings

    def test_finding_ids_are_valid_uuids(self):
        for f in self._get_findings():
            UUID(f.finding_id)  # raises if invalid

    def test_engine_is_sast(self):
        for f in self._get_findings():
            self.assertEqual(f.engine, EngineName.SAST)

    def test_severity_is_valid_enum(self):
        valid = {s.value for s in Severity}
        for f in self._get_findings():
            self.assertIn(f.severity.value, valid)

    def test_confidence_in_range(self):
        for f in self._get_findings():
            self.assertGreaterEqual(f.confidence, 0.0)
            self.assertLessEqual(f.confidence, 1.0)

    def test_is_development_false(self):
        for f in self._get_findings():
            self.assertFalse(f.is_development)

    def test_evidence_does_not_contain_full_secret(self):
        """The raw secret value 'abc123' must not appear in evidence."""
        for f in self._get_findings():
            self.assertNotIn(
                "abc123", f.evidence,
                f"Secret value leaked in evidence for finding: {f.title}",
            )


class TestSASTEngineDeduplication(unittest.TestCase):
    """Same rule + file + line → reported only once."""

    def test_duplicate_lines_deduped(self):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            tp = Path(td)
            # Two identical lines should not produce two findings for the same rule
            content = 'password = "secret99"\npassword = "secret99"\n'
            p = _write_file(tp, "dup.py", content)
            result = SASTEngine().analyze([p])
            # Both lines match but are on different line numbers → 2 findings OK
            # Same line number cannot appear twice for the same rule
            seen = set()
            for f in result.findings:
                key = (f.title, f.file_path, f.line_number)
                self.assertNotIn(key, seen, f"Duplicate finding: {key}")
                seen.add(key)


class TestSASTEngineVulnerableFixture(unittest.TestCase):
    """Run the SAST engine against the QA vulnerable demo repo fixture."""

    FIXTURE_DIR = (
        Path(__file__).resolve().parents[2]
        / "tests" / "fixtures" / "vulnerable-demo-repo" / "src"
    )

    def test_fixture_produces_findings(self):
        if not self.FIXTURE_DIR.exists():
            self.skipTest(f"Fixture directory not found: {self.FIXTURE_DIR}")
        files = list(self.FIXTURE_DIR.rglob("*.py"))
        self.assertGreater(len(files), 0, "No Python files found in fixture")
        result = SASTEngine().analyze(files)
        self.assertGreater(
            len(result.findings), 0,
            "Expected findings from vulnerable fixture, got none",
        )

    def test_fixture_findings_have_valid_schema(self):
        if not self.FIXTURE_DIR.exists():
            self.skipTest(f"Fixture directory not found: {self.FIXTURE_DIR}")
        files = list(self.FIXTURE_DIR.rglob("*.py"))
        result = SASTEngine().analyze(files)
        for f in result.findings:
            UUID(f.finding_id)
            self.assertIn(f.severity.value, {"critical", "high", "medium", "low"})
            self.assertTrue(f.title)
            self.assertTrue(f.file_path)
            self.assertFalse(f.is_development)
