"""
Day 3 — Finding contract tests.

Verifies:
  - rule_id, rule_version, group_key fields accepted and stored
  - file_path length limit enforced (AE-09)
  - explanation optional but stored correctly
  - CryptoComponent validates correctly
"""

import unittest
from uuid import uuid4, NAMESPACE_URL, uuid5

from analysis_engines.base.finding import EngineName, Finding, Severity
from analysis_engines.base.component import (
    CryptoComponent,
    RISK_QUANTUM_VULNERABLE,
    RISK_DEPRECATED,
    RISK_SAFE,
    RISK_WEAKENED,
)


def _fid():
    return str(uuid4())


def _make_finding(**overrides):
    defaults = dict(
        finding_id=_fid(),
        engine=EngineName.SAST,
        category="test",
        severity=Severity.LOW,
        title="Test finding",
        file_path="src/app.py",
        line_number=1,
        evidence="test evidence",
        confidence=0.8,
        recommendation="fix it",
    )
    defaults.update(overrides)
    return Finding(**defaults)


class TestFindingDay3Fields(unittest.TestCase):

    def test_rule_id_stored(self):
        f = _make_finding(rule_id="SAST-SEC-001")
        self.assertEqual(f.rule_id, "SAST-SEC-001")

    def test_rule_version_stored(self):
        f = _make_finding(rule_version="1.0.0")
        self.assertEqual(f.rule_version, "1.0.0")

    def test_group_key_stored(self):
        f = _make_finding(group_key="SAST-SEC-001:src/app.py")
        self.assertEqual(f.group_key, "SAST-SEC-001:src/app.py")

    def test_optional_fields_default_none(self):
        f = _make_finding()
        self.assertIsNone(f.rule_id)
        self.assertIsNone(f.rule_version)
        self.assertIsNone(f.group_key)
        self.assertIsNone(f.explanation)

    def test_file_path_too_long_raises(self):
        with self.assertRaises(ValueError):
            _make_finding(file_path="x" * 1025)

    def test_rule_id_must_be_string_or_none(self):
        with self.assertRaises(ValueError):
            _make_finding(rule_id=123)  # type: ignore

    def test_explanation_stored(self):
        f = _make_finding(explanation="Why this matters")
        self.assertEqual(f.explanation, "Why this matters")


class TestCryptoComponent(unittest.TestCase):

    def _make(self, **overrides):
        defaults = dict(
            component_id=str(uuid4()),
            scan_id=str(uuid4()),
            algorithm="RSA",
            category="asymmetric",
            file_path="src/auth.py",
            line_number=42,
            detection_method="regex:import-pattern",
            confidence=0.92,
            quantum_risk=RISK_QUANTUM_VULNERABLE,
            nist_migration_target="FIPS 203 (ML-KEM)",
            rule_id="CRYPTO-QV-001",
            rule_version="1.0.0",
        )
        defaults.update(overrides)
        return CryptoComponent(**defaults)

    def test_valid_component(self):
        c = self._make()
        self.assertEqual(c.algorithm, "RSA")
        self.assertEqual(c.quantum_risk, RISK_QUANTUM_VULNERABLE)

    def test_all_risk_levels_accepted(self):
        for risk in (RISK_QUANTUM_VULNERABLE, RISK_WEAKENED, RISK_SAFE, RISK_DEPRECATED):
            c = self._make(quantum_risk=risk)
            self.assertEqual(c.quantum_risk, risk)

    def test_invalid_risk_level_raises(self):
        with self.assertRaises(ValueError):
            self._make(quantum_risk="unknown_level")

    def test_empty_algorithm_raises(self):
        with self.assertRaises(ValueError):
            self._make(algorithm="  ")

    def test_confidence_out_of_range_raises(self):
        with self.assertRaises(ValueError):
            self._make(confidence=1.5)

    def test_optional_fields_default(self):
        c = self._make()
        self.assertFalse(c.is_development)
        self.assertEqual(c.nist_migration_target, "FIPS 203 (ML-KEM)")
