"""
Day 2 — AnalysisPipeline runner tests.

Verifies:
  - Both engines run and contribute findings
  - Clean file produces zero findings
  - Finding deduplication across engines
  - PipelineResult.summary_dict() is accurate
  - Engine failure does not abort pipeline
  - files_processed count is correct per engine
"""

import unittest
from pathlib import Path
from uuid import UUID

from analysis_engines.runner import AnalysisPipeline, PipelineResult
from analysis_engines import EngineName


def _write_file(tmp_dir: str, name: str, content: str) -> Path:
    p = Path(tmp_dir) / name
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return p


class TestAnalysisPipelineVulnerable(unittest.TestCase):

    def setUp(self):
        import tempfile
        self.td = tempfile.TemporaryDirectory()
        root = Path(self.td.name)
        _write_file(
            self.td.name, "src/auth/service.py",
            'password = "supersecret"\ncursor.execute(f"SELECT {x}")\n',
        )
        _write_file(
            self.td.name, "src/crypto/cipher.py",
            "import hashlib\nhashlib.md5(data)\nrsa.generate_private_key(65537, 2048)\n",
        )
        self.files = list(root.rglob("*.py"))
        self.result = AnalysisPipeline().run(self.files)

    def tearDown(self):
        self.td.cleanup()

    def test_both_engines_run(self):
        self.assertIn("sast", self.result.findings_by_engine)
        self.assertIn("crypto", self.result.findings_by_engine)

    def test_sast_findings_present(self):
        self.assertGreater(len(self.result.findings_by_engine["sast"]), 0)

    def test_crypto_findings_present(self):
        self.assertGreater(len(self.result.findings_by_engine["crypto"]), 0)

    def test_all_findings_have_unique_ids(self):
        all_ids = [f.finding_id for f in self.result.all_findings]
        self.assertEqual(len(all_ids), len(set(all_ids)), "Duplicate finding IDs detected")

    def test_finding_ids_are_valid_uuids(self):
        for f in self.result.all_findings:
            UUID(f.finding_id)

    def test_total_files_count(self):
        self.assertEqual(self.result.total_files, len(self.files))

    def test_summary_dict_structure(self):
        summary = self.result.summary_dict()
        self.assertIn("total_findings", summary)
        self.assertIn("findings_by_severity", summary)
        self.assertIn("engines_run", summary)
        self.assertIn("total_files_processed", summary)
        self.assertIn("sast", summary["engines_run"])
        self.assertIn("crypto", summary["engines_run"])

    def test_summary_total_matches_all_findings(self):
        real_findings = [f for f in self.result.all_findings if not f.is_development]
        summary = self.result.summary_dict()
        self.assertEqual(summary["total_findings"], len(real_findings))


class TestAnalysisPipelineClean(unittest.TestCase):

    def test_clean_file_zero_real_findings(self):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            p = _write_file(td, "clean.py", "def add(a, b):\n    return a + b\n")
            result = AnalysisPipeline().run([p])
            real = [f for f in result.all_findings if not f.is_development]
            self.assertEqual(real, [], f"Expected 0 findings on clean code, got: {[f.title for f in real]}")

    def test_empty_file_list_produces_no_findings(self):
        result = AnalysisPipeline().run([])
        self.assertEqual(len(result.all_findings), 0)
        self.assertEqual(result.total_files, 0)


class TestAnalysisPipelineRobustness(unittest.TestCase):

    def test_unreadable_file_does_not_crash_pipeline(self):
        """A non-existent file should be recorded as an error, not an exception."""
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            ghost = Path(td) / "ghost.py"
            # Don't create the file — pass it anyway
            result = AnalysisPipeline().run([ghost])
            # Pipeline should complete, errors recorded per engine
            self.assertIsInstance(result, PipelineResult)

    def test_failing_engine_does_not_abort_pipeline(self):
        """If one engine raises, the other should still run."""
        import tempfile
        from analysis_engines.base.analyzer import AnalysisEngine
        from analysis_engines.base.finding import EngineName
        from analysis_engines.sast.engine import SASTEngine

        class BrokenEngine(AnalysisEngine):
            @property
            def name(self):
                return EngineName.CONFIGURATION

            def analyze(self, files):
                raise RuntimeError("Simulated engine failure")

        with tempfile.TemporaryDirectory() as td:
            p = _write_file(td, "src.py", "password = 'secret'\n")
            pipeline = AnalysisPipeline(engines=[SASTEngine(), BrokenEngine()])
            result = pipeline.run([p])

        # SAST should still have findings
        self.assertGreater(len(result.findings_by_engine.get("sast", ())), 0)
        # Broken engine error should be recorded
        broken_errors = result.errors_by_engine.get("configuration", ())
        self.assertGreater(len(broken_errors), 0)
        self.assertIn("Simulated engine failure", broken_errors[0])


class TestAnalysisPipelineFixture(unittest.TestCase):

    FIXTURE_DIR = (
        Path(__file__).resolve().parents[2]
        / "tests" / "fixtures" / "vulnerable-demo-repo" / "src"
    )

    def test_vulnerable_fixture_full_pipeline(self):
        if not self.FIXTURE_DIR.exists():
            self.skipTest(f"Fixture not found: {self.FIXTURE_DIR}")
        files = list(self.FIXTURE_DIR.rglob("*.py"))
        result = AnalysisPipeline().run(files)
        # Both engines should have processed files
        self.assertGreater(result.files_processed_by_engine.get("sast", 0), 0)
        self.assertGreater(result.files_processed_by_engine.get("crypto", 0), 0)
        # Should have real findings
        real = [f for f in result.all_findings if not f.is_development]
        self.assertGreater(len(real), 0, "Expected findings from vulnerable fixture")

    def test_deterministic_output(self):
        """Running the pipeline twice on the same files yields identical finding IDs."""
        if not self.FIXTURE_DIR.exists():
            self.skipTest(f"Fixture not found: {self.FIXTURE_DIR}")
        files = list(self.FIXTURE_DIR.rglob("*.py"))
        r1 = AnalysisPipeline().run(files)
        r2 = AnalysisPipeline().run(files)
        ids1 = sorted(f.finding_id for f in r1.all_findings)
        ids2 = sorted(f.finding_id for f in r2.all_findings)
        self.assertEqual(ids1, ids2, "Pipeline output is not deterministic")
