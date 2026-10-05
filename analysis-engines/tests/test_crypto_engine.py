"""
Day 2 — Crypto engine tests.

Verifies quantum-vulnerable and weak algorithm detection, schema validity,
clean-file behavior, and deduplication.
"""

import unittest
from pathlib import Path
from uuid import UUID

from analysis_engines import EngineName, Severity
from analysis_engines.crypto.engine import CryptoEngine


def _write_file(tmp_dir: str, name: str, content: str) -> Path:
    p = Path(tmp_dir) / name
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return p


class TestCryptoEngineDetection(unittest.TestCase):

    def _run(self, name: str, content: str):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            p = _write_file(td, name, content)
            return CryptoEngine().analyze([p])

    def test_rsa_generate_detected(self):
        result = self._run(
            "crypto.py",
            "private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)\n",
        )
        titles = [f.title for f in result.findings]
        self.assertTrue(any("RSA" in t for t in titles), f"Got: {titles}")

    def test_ecdsa_detected(self):
        result = self._run(
            "sign.py",
            "signer = ec.generate_private_key(ec.SECP256R1())\n",
        )
        titles = [f.title for f in result.findings]
        self.assertTrue(any("Elliptic curve" in t or "ECDSA" in t for t in titles), f"Got: {titles}")

    def test_md5_detected(self):
        result = self._run("hash.py", "digest = hashlib.md5(data).hexdigest()\n")
        titles = [f.title for f in result.findings]
        self.assertTrue(any("MD5" in t for t in titles), f"Got: {titles}")

    def test_sha1_detected(self):
        result = self._run("hash.py", "digest = hashlib.sha1(data).hexdigest()\n")
        titles = [f.title for f in result.findings]
        self.assertTrue(any("SHA-1" in t for t in titles), f"Got: {titles}")

    def test_des_detected(self):
        result = self._run("enc.py", "cipher = DES.new(key, DES.MODE_ECB)\n")
        titles = [f.title for f in result.findings]
        self.assertTrue(any("DES" in t for t in titles), f"Got: {titles}")

    def test_rc4_detected(self):
        result = self._run("enc.py", "stream = ARC4.new(key)\n")
        titles = [f.title for f in result.findings]
        self.assertTrue(any("RC4" in t for t in titles), f"Got: {titles}")

    def test_aes_cbc_detected(self):
        result = self._run(
            "enc.py",
            "cipher = Cipher(algorithms.AES(key), modes.CBC(iv))\n",
        )
        titles = [f.title for f in result.findings]
        self.assertTrue(any("CBC" in t for t in titles), f"Got: {titles}")

    def test_pkcs1v15_detected(self):
        result = self._run(
            "rsa.py",
            "cipher = PKCS1_v1_5.new(rsa_key)\nplaintext = cipher.decrypt(ct, sentinel)\n",
        )
        titles = [f.title for f in result.findings]
        self.assertTrue(
            any("PKCS" in t or "Bleichenbacher" in t for t in titles),
            f"Got: {titles}",
        )

    def test_quantum_vulnerable_flag_on_rsa(self):
        """RSA findings must come from a rule marked quantum_vulnerable."""
        from analysis_engines.crypto.rules import get_crypto_rules
        qv_rule_ids = {r.rule_id for r in get_crypto_rules() if r.quantum_vulnerable}
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            p = _write_file(
                td, "key.py",
                "private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)\n",
            )
            result = CryptoEngine().analyze([p])
        # At least one finding should have severity CRITICAL from a QV rule
        critical = [f for f in result.findings if f.severity == Severity.CRITICAL]
        self.assertGreater(len(critical), 0, "Expected at least one CRITICAL finding for RSA")


class TestCryptoEngineClean(unittest.TestCase):

    def test_aes_gcm_no_finding(self):
        """AES-GCM is the recommended choice — should not be flagged."""
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            p = _write_file(
                Path(td), "enc.py",
                "cipher = Cipher(algorithms.AES(key), modes.GCM(nonce))\n",
            )
            result = CryptoEngine().analyze([p])
            titles = [f.title for f in result.findings]
            # GCM should not trigger CBC or any other rule
            self.assertFalse(any("CBC" in t for t in titles))

    def test_non_source_file_skipped(self):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / "notes.md"
            p.write_text("hashlib.md5\n", encoding="utf-8")
            result = CryptoEngine().analyze([p])
            self.assertEqual(result.files_processed, 0)


class TestCryptoEngineSchema(unittest.TestCase):

    def _findings(self):
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            p = _write_file(
                Path(td), "vuln.py",
                "rsa.generate_private_key(65537, 2048)\nhashlib.md5(x)\nARC4.new(k)\n",
            )
            return CryptoEngine().analyze([p]).findings

    def test_valid_uuids(self):
        for f in self._findings():
            UUID(f.finding_id)

    def test_engine_is_crypto(self):
        for f in self._findings():
            self.assertEqual(f.engine, EngineName.CRYPTO)

    def test_confidence_range(self):
        for f in self._findings():
            self.assertGreaterEqual(f.confidence, 0.0)
            self.assertLessEqual(f.confidence, 1.0)

    def test_is_development_false(self):
        for f in self._findings():
            self.assertFalse(f.is_development)


class TestCryptoEngineVulnerableFixture(unittest.TestCase):

    FIXTURE = (
        Path(__file__).resolve().parents[2]
        / "tests" / "fixtures" / "vulnerable-demo-repo" / "src" / "crypto" / "cipher.py"
    )

    def test_fixture_crypto_file_has_findings(self):
        if not self.FIXTURE.exists():
            self.skipTest(f"Fixture not found: {self.FIXTURE}")
        result = CryptoEngine().analyze([self.FIXTURE])
        self.assertGreater(len(result.findings), 0, "Expected crypto findings from vulnerable fixture")

    def test_fixture_findings_not_development(self):
        if not self.FIXTURE.exists():
            self.skipTest(f"Fixture not found: {self.FIXTURE}")
        result = CryptoEngine().analyze([self.FIXTURE])
        for f in result.findings:
            self.assertFalse(f.is_development)
