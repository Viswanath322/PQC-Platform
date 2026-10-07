"""
Day 3 — ConfigurationEngine, DependencyEngine, and rule_id/rule_version tests.
"""

import tempfile
import unittest
from pathlib import Path
from uuid import UUID

from analysis_engines.configuration.engine import ConfigurationEngine
from analysis_engines.dependency.engine import DependencyEngine
from analysis_engines.crypto.engine import CryptoEngine
from analysis_engines.sast.engine import SASTEngine
from analysis_engines.base.finding import EngineName


def _write(tmp_dir: str, name: str, content: str) -> Path:
    p = Path(tmp_dir) / name
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return p


# ---------------------------------------------------------------------------
# ConfigurationEngine
# ---------------------------------------------------------------------------

class TestConfigurationEngine(unittest.TestCase):

    def _run(self, filename: str, content: str):
        with tempfile.TemporaryDirectory() as td:
            p = _write(td, filename, content)
            return ConfigurationEngine().analyze([p])

    def test_hardcoded_password_in_env_file(self):
        result = self._run(".env", "DATABASE_PASSWORD=supersecret123\n")
        titles = [f.title for f in result.findings]
        self.assertTrue(any("credential" in t.lower() or "secret" in t.lower() or "Hardcoded" in t for t in titles),
                        f"Expected secret finding, got: {titles}")

    def test_pem_key_detected(self):
        result = self._run("secrets.pem",
                           "-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----\n")
        titles = [f.title for f in result.findings]
        self.assertTrue(any("PEM" in t or "private key" in t.lower() for t in titles),
                        f"Expected PEM finding, got: {titles}")

    def test_database_url_with_credentials(self):
        result = self._run("config.yaml",
                           "database_url: postgres://admin:password123@localhost:5432/mydb\n")
        titles = [f.title for f in result.findings]
        self.assertTrue(any("connection string" in t.lower() or "credential" in t.lower() for t in titles),
                        f"Expected DB URL finding, got: {titles}")

    def test_tls_verify_disabled(self):
        result = self._run("settings.yaml", "verify_ssl: false\n")
        titles = [f.title for f in result.findings]
        self.assertTrue(any("TLS" in t or "verification" in t.lower() for t in titles),
                        f"Expected TLS finding, got: {titles}")

    def test_non_config_file_skipped(self):
        result = self._run("main.py", "password = 'secret'\n")
        self.assertEqual(result.files_processed, 0)

    def test_comment_lines_skipped(self):
        result = self._run(".env", "# DATABASE_PASSWORD=supersecret123\n")
        real = [f for f in result.findings if not f.is_development]
        self.assertEqual(real, [], "Comment lines must not produce findings")

    def test_clean_config_zero_findings(self):
        result = self._run("config.yaml",
                           "app_name: MyApp\nlog_level: info\nport: 8080\n")
        real = [f for f in result.findings if not f.is_development]
        self.assertEqual(real, [])

    def test_rule_id_populated(self):
        result = self._run("secrets.pem",
                           "-----BEGIN EC PRIVATE KEY-----\ndata\n-----END EC PRIVATE KEY-----\n")
        for f in result.findings:
            self.assertIsNotNone(f.rule_id, "rule_id must be populated")

    def test_explanation_populated(self):
        result = self._run(".env", "JWT_SECRET=hardcoded_secret_value_abc123\n")
        for f in result.findings:
            self.assertIsNotNone(f.explanation)
            self.assertGreater(len(f.explanation), 10)

    def test_valid_uuids(self):
        result = self._run(".env", "API_KEY=abc123defghijklmnop\n")
        for f in result.findings:
            UUID(f.finding_id)

    def test_engine_is_configuration(self):
        result = self._run("secrets.pem",
                           "-----BEGIN OPENSSH PRIVATE KEY-----\ndata\n")
        for f in result.findings:
            self.assertEqual(f.engine, EngineName.CONFIGURATION)


# ---------------------------------------------------------------------------
# DependencyEngine
# ---------------------------------------------------------------------------

class TestDependencyEngine(unittest.TestCase):

    def _run(self, filename: str, content: str):
        with tempfile.TemporaryDirectory() as td:
            p = _write(td, filename, content)
            return DependencyEngine().analyze([p])

    def test_flask_0x_detected(self):
        result = self._run("requirements.txt", "flask==0.12.4\n")
        titles = [f.title for f in result.findings]
        self.assertTrue(any("Flask" in t for t in titles), f"Expected Flask finding, got: {titles}")

    def test_openssl_1x_detected(self):
        result = self._run("requirements.txt", "openssl==1.1.1u\n")
        titles = [f.title for f in result.findings]
        self.assertTrue(any("OpenSSL" in t for t in titles), f"Expected OpenSSL finding, got: {titles}")

    def test_django_1x_detected(self):
        result = self._run("requirements.txt", "django==1.11.29\n")
        titles = [f.title for f in result.findings]
        self.assertTrue(any("Django" in t for t in titles), f"Expected Django finding, got: {titles}")

    def test_safe_package_no_finding(self):
        result = self._run("requirements.txt", "requests==2.31.0\n")
        vuln = [f for f in result.findings if not f.is_development]
        self.assertEqual(vuln, [], f"requests 2.31.0 should not be flagged: {[f.title for f in vuln]}")

    def test_non_manifest_skipped(self):
        result = self._run("main.py", "import flask\n")
        self.assertEqual(result.files_processed, 0)

    def test_rule_id_populated(self):
        result = self._run("requirements.txt", "flask==0.12.4\n")
        for f in result.findings:
            self.assertIsNotNone(f.rule_id)

    def test_engine_is_dependency(self):
        result = self._run("requirements.txt", "flask==0.12.4\n")
        for f in result.findings:
            self.assertEqual(f.engine, EngineName.DEPENDENCY)

    def test_explanation_populated(self):
        result = self._run("requirements.txt", "flask==0.12.4\n")
        for f in result.findings:
            self.assertIsNotNone(f.explanation)

    def test_valid_uuids(self):
        result = self._run("requirements.txt", "django==1.11.29\n")
        for f in result.findings:
            UUID(f.finding_id)


# ---------------------------------------------------------------------------
# rule_id / rule_version on SAST and Crypto engines
# ---------------------------------------------------------------------------

class TestRuleVersionPopulated(unittest.TestCase):

    def test_sast_rule_id_set(self):
        with tempfile.TemporaryDirectory() as td:
            p = _write(td, "app.py", 'SECRET_KEY = "abc123def456"\n')
            result = SASTEngine().analyze([p])
        for f in result.findings:
            self.assertIsNotNone(f.rule_id, f"rule_id missing on SAST finding: {f.title}")

    def test_sast_rule_version_set(self):
        with tempfile.TemporaryDirectory() as td:
            p = _write(td, "app.py", 'SECRET_KEY = "abc123def456"\n')
            result = SASTEngine().analyze([p])
        for f in result.findings:
            self.assertIsNotNone(f.rule_version)
            self.assertGreater(len(f.rule_version), 0)

    def test_crypto_rule_id_set(self):
        with tempfile.TemporaryDirectory() as td:
            p = _write(td, "sign.py", "hashlib.md5(data).hexdigest()\n")
            result = CryptoEngine().analyze([p])
        for f in result.findings:
            self.assertIsNotNone(f.rule_id)

    def test_crypto_explanation_set(self):
        with tempfile.TemporaryDirectory() as td:
            p = _write(td, "sign.py", "hashlib.md5(data).hexdigest()\n")
            result = CryptoEngine().analyze([p])
        for f in result.findings:
            self.assertIsNotNone(f.explanation)
            self.assertGreater(len(f.explanation), 10)
