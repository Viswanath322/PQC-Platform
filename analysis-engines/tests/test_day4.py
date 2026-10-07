"""
Day 4 — Analysis engine stability, new rules, and path_utils fix tests.

Verifies:
  - normalize_findings_paths preserves rule_id/rule_version/group_key (Day 4 fix)
  - New SAST rules: SSRF, weak randomness, XXE
  - New Crypto rules: weak RSA key size, hardcoded salt
  - Repeated scans produce identical finding IDs (determinism regression)
  - No absolute paths leak through normalize_findings_paths
  - Engine output is network-free (no external calls)
  - Evidence never contains raw secrets
  - Clean repository → zero real findings (regression)
"""

import tempfile
import unittest
from pathlib import Path
from uuid import UUID, uuid4

from analysis_engines.base.finding import EngineName, Finding, Severity
from analysis_engines.path_utils import normalize_findings_paths, normalize_path
from analysis_engines.sast.engine import SASTEngine
from analysis_engines.crypto.engine import CryptoEngine
from analysis_engines.runner import AnalysisPipeline


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _write(root: Path, name: str, content: str) -> Path:
    p = root / name
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return p


def _make_finding(file_path: str = "src/app.py", **overrides) -> Finding:
    defaults = dict(
        finding_id=str(uuid4()),
        engine=EngineName.SAST,
        category="test",
        severity=Severity.HIGH,
        title="Test finding",
        file_path=file_path,
        line_number=1,
        evidence="test evidence",
        confidence=0.8,
        recommendation="fix it",
        rule_id="SAST-SEC-001",
        rule_version="1.0.0",
        group_key="SAST-SEC-001:src/app.py",
    )
    defaults.update(overrides)
    return Finding(**defaults)


# ---------------------------------------------------------------------------
# Day 4 fix: normalize_findings_paths preserves all fields
# ---------------------------------------------------------------------------

class TestPathUtilsDay4Fix(unittest.TestCase):

    def test_rule_id_preserved_after_normalization(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td).resolve()
            abs_path = root / "src" / "app.py"
            abs_path.parent.mkdir(parents=True)
            abs_path.touch()
            f = _make_finding(file_path=str(abs_path), rule_id="SAST-SEC-001")
            result = normalize_findings_paths((f,), root)
            self.assertEqual(len(result), 1)
            self.assertEqual(result[0].rule_id, "SAST-SEC-001")

    def test_rule_version_preserved_after_normalization(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td).resolve()
            abs_path = root / "src" / "app.py"
            abs_path.parent.mkdir(parents=True)
            abs_path.touch()
            f = _make_finding(file_path=str(abs_path), rule_version="1.0.0")
            result = normalize_findings_paths((f,), root)
            self.assertEqual(result[0].rule_version, "1.0.0")

    def test_group_key_preserved_after_normalization(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td).resolve()
            abs_path = root / "src" / "app.py"
            abs_path.parent.mkdir(parents=True)
            abs_path.touch()
            f = _make_finding(file_path=str(abs_path), group_key="SAST-SEC-001:src/app.py")
            result = normalize_findings_paths((f,), root)
            self.assertEqual(result[0].group_key, "SAST-SEC-001:src/app.py")

    def test_explanation_preserved_after_normalization(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td).resolve()
            abs_path = root / "src" / "app.py"
            abs_path.parent.mkdir(parents=True)
            abs_path.touch()
            f = _make_finding(file_path=str(abs_path), explanation="Why this matters")
            result = normalize_findings_paths((f,), root)
            self.assertEqual(result[0].explanation, "Why this matters")

    def test_path_becomes_relative_posix(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td).resolve()
            abs_path = root / "src" / "auth.py"
            abs_path.parent.mkdir(parents=True)
            abs_path.touch()
            f = _make_finding(file_path=str(abs_path))
            result = normalize_findings_paths((f,), root)
            self.assertEqual(result[0].file_path, "src/auth.py")
            self.assertNotIn("\\", result[0].file_path)
            self.assertFalse(Path(result[0].file_path).is_absolute())

    def test_outside_root_skipped(self):
        with tempfile.TemporaryDirectory() as td1:
            with tempfile.TemporaryDirectory() as td2:
                root = Path(td1).resolve()
                outside = Path(td2).resolve() / "evil.py"
                outside.touch()
                f = _make_finding(file_path=str(outside))
                result = normalize_findings_paths((f,), root)
                self.assertEqual(len(result), 0)


# ---------------------------------------------------------------------------
# Day 4: New SAST rules
# ---------------------------------------------------------------------------

class TestSASTDay4Rules(unittest.TestCase):

    def _run(self, filename: str, content: str):
        with tempfile.TemporaryDirectory() as td:
            p = _write(Path(td), filename, content)
            engine = SASTEngine()
            engine.set_root_dir(Path(td))
            return engine.analyze([p])

    def test_ssrf_detected(self):
        result = self._run("api.py", "response = requests.get(user_url)\n")
        titles = [f.title for f in result.findings]
        self.assertTrue(
            any("SSRF" in t or "URL" in t for t in titles),
            f"Expected SSRF finding, got: {titles}",
        )

    def test_weak_random_detected(self):
        result = self._run("token.py", "token = random.randint(0, 1000000)\n")
        titles = [f.title for f in result.findings]
        self.assertTrue(
            any("random" in t.lower() for t in titles),
            f"Expected weak random finding, got: {titles}",
        )

    def test_xxe_detected(self):
        result = self._run("parse.py", "tree = etree.parse(xml_input)\n")
        titles = [f.title for f in result.findings]
        self.assertTrue(
            any("XXE" in t or "XML" in t for t in titles),
            f"Expected XXE finding, got: {titles}",
        )

    def test_new_rules_have_valid_uuids(self):
        with tempfile.TemporaryDirectory() as td:
            p = _write(Path(td), "app.py",
                       "requests.get(user_url)\nrandom.randint(0,100)\netree.parse(x)\n")
            engine = SASTEngine()
            engine.set_root_dir(Path(td))
            result = engine.analyze([p])
        for f in result.findings:
            UUID(f.finding_id)

    def test_new_rules_rule_id_set(self):
        with tempfile.TemporaryDirectory() as td:
            p = _write(Path(td), "app.py", "requests.get(user_url)\n")
            engine = SASTEngine()
            engine.set_root_dir(Path(td))
            result = engine.analyze([p])
        for f in result.findings:
            self.assertIsNotNone(f.rule_id)

    def test_new_rules_explanation_set(self):
        with tempfile.TemporaryDirectory() as td:
            p = _write(Path(td), "app.py", "requests.get(user_url)\n")
            engine = SASTEngine()
            engine.set_root_dir(Path(td))
            result = engine.analyze([p])
        for f in result.findings:
            self.assertIsNotNone(f.explanation)
            self.assertGreater(len(f.explanation), 5)


# ---------------------------------------------------------------------------
# Day 4: New Crypto rules
# ---------------------------------------------------------------------------

class TestCryptoDay4Rules(unittest.TestCase):

    def _run(self, filename: str, content: str):
        with tempfile.TemporaryDirectory() as td:
            p = _write(Path(td), filename, content)
            engine = CryptoEngine()
            engine.set_root_dir(Path(td))
            return engine.analyze([p])

    def test_weak_rsa_key_size_512_detected(self):
        result = self._run("key.py",
                           "private_key = rsa.generate_private_key(65537, key_size=512)\n")
        titles = [f.title for f in result.findings]
        self.assertTrue(
            any("512" in t or "key size" in t.lower() or "RSA" in t for t in titles),
            f"Expected weak RSA key finding, got: {titles}",
        )

    def test_weak_rsa_key_size_1024_detected(self):
        result = self._run("key.py",
                           "key = RSA.generate(1024)\n")
        titles = [f.title for f in result.findings]
        # Either the RSA generate rule or the key_size rule fires
        self.assertGreater(len(result.findings), 0,
                           f"Expected finding for RSA-1024, got none")

    def test_hardcoded_salt_detected(self):
        result = self._run("hash.py",
                           'salt = b"fixedsalt12345678"\nkdf = PBKDF2HMAC(salt=salt)\n')
        titles = [f.title for f in result.findings]
        self.assertTrue(
            any("salt" in t.lower() for t in titles),
            f"Expected hardcoded salt finding, got: {titles}",
        )

    def test_new_rules_have_valid_uuids(self):
        with tempfile.TemporaryDirectory() as td:
            p = _write(Path(td), "crypto.py",
                       "key = rsa.generate_private_key(65537, key_size=512)\n")
            engine = CryptoEngine()
            engine.set_root_dir(Path(td))
            result = engine.analyze([p])
        for f in result.findings:
            UUID(f.finding_id)


# ---------------------------------------------------------------------------
# Day 4: Determinism regression
# ---------------------------------------------------------------------------

class TestDeterminismRegression(unittest.TestCase):

    def test_three_runs_same_finding_ids(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            _write(root, "src/app.py",
                   'SECRET_KEY = "abc123"\nhashlib.md5(x)\neval(user_input)\n')
            _write(root, "requirements.txt", "flask==0.12.4\n")
            _write(root, ".env", "DATABASE_PASSWORD=mysecret\n")
            files = list(root.rglob("*.*"))

            results = [AnalysisPipeline().run(files, root_dir=root) for _ in range(3)]
            id_sets = [
                sorted(f.finding_id for f in r.all_findings)
                for r in results
            ]
            self.assertEqual(id_sets[0], id_sets[1], "Run 1 vs Run 2 differ")
            self.assertEqual(id_sets[0], id_sets[2], "Run 1 vs Run 3 differ")

    def test_sorted_output_stable(self):
        """All findings should be in severity order after normalization."""
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            _write(root, "src/app.py",
                   'SECRET_KEY = "abc123"\nos.system("ls")\ntraceback.format_exc()\n')
            files = list(root.rglob("*.*"))
            result = AnalysisPipeline().run(files, root_dir=root)
            sev_rank = {"critical": 0, "high": 1, "medium": 2, "low": 3}
            ranks = [sev_rank[f.severity.value] for f in result.all_findings
                     if not f.is_development]
            self.assertEqual(ranks, sorted(ranks), "Output is not sorted by severity")


# ---------------------------------------------------------------------------
# Day 4: Security invariants
# ---------------------------------------------------------------------------

class TestSecurityInvariants(unittest.TestCase):

    def test_no_network_calls_in_engines(self):
        """Engines must never import or call network libraries."""
        import analysis_engines.sast.engine as sast_mod
        import analysis_engines.crypto.engine as crypto_mod
        import analysis_engines.configuration.engine as conf_mod
        import analysis_engines.dependency.engine as dep_mod

        for mod in (sast_mod, crypto_mod, conf_mod, dep_mod):
            src = Path(mod.__file__).read_text(encoding="utf-8")
            for net_lib in ("import requests", "import urllib.request",
                            "import http.client", "import socket"):
                self.assertNotIn(net_lib, src,
                                 f"{mod.__name__} imports network library: {net_lib}")

    def test_evidence_never_contains_full_secret(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            _write(root, "src/app.py", 'SECRET_KEY = "mysupersecretvalue123"\n')
            files = list(root.rglob("*.*"))
            result = AnalysisPipeline().run(files, root_dir=root)
        for f in result.all_findings:
            self.assertNotIn(
                "mysupersecretvalue123", f.evidence,
                f"Secret leaked in evidence: {f.title}",
            )

    def test_no_absolute_paths_in_findings(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            _write(root, "src/app.py", 'password = "secret123"\n')
            files = list(root.rglob("*.*"))
            result = AnalysisPipeline().run(files, root_dir=root)
        for f in result.all_findings:
            self.assertFalse(
                Path(f.file_path).is_absolute(),
                f"Absolute path in finding: {f.file_path}",
            )

    def test_clean_repo_zero_findings_regression(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            _write(root, "src/main.py", "def greet(name):\n    return f'Hello {name}'\n")
            _write(root, "README.md", "# My project\n")
            files = list(root.rglob("*.*"))
            result = AnalysisPipeline().run(files, root_dir=root)
            real = [f for f in result.all_findings if not f.is_development]
            self.assertEqual(real, [],
                             f"Clean repo has findings: {[f.title for f in real]}")
