"""
Unit tests for Day 3 DependencyEngine and ConfigurationEngine.
"""

import tempfile
import unittest
from pathlib import Path
from uuid import UUID

from analysis_engines import ConfigurationEngine, DependencyEngine, EngineName, Severity


class TestDay3Engines(unittest.TestCase):

    def test_dependency_engine_detects_vulnerable_deps(self):
        with tempfile.TemporaryDirectory() as td:
            req_file = Path(td) / "requirements.txt"
            req_file.write_text("pycrypto==2.6.1\nrequests==2.28.1\nmd5-compat>=1.0\n", encoding="utf-8")

            engine = DependencyEngine()
            result = engine.analyze([req_file])

            self.assertEqual(engine.name, EngineName.DEPENDENCY)
            self.assertEqual(result.files_processed, 1)
            self.assertEqual(len(result.errors), 0)
            self.assertEqual(len(result.findings), 2)
            for f in result.findings:
                self.assertEqual(f.engine, EngineName.DEPENDENCY)
                UUID(f.finding_id)  # Validate UUID

    def test_dependency_engine_clean_manifest(self):
        with tempfile.TemporaryDirectory() as td:
            req_file = Path(td) / "requirements.txt"
            req_file.write_text("fastapi==0.110.0\nuvicorn==0.28.0\n", encoding="utf-8")

            result = DependencyEngine().analyze([req_file])
            self.assertEqual(len(result.findings), 0)
            self.assertEqual(result.files_processed, 1)

    def test_configuration_engine_detects_insecure_config(self):
        with tempfile.TemporaryDirectory() as td:
            cfg_file = Path(td) / "settings.yaml"
            cfg_file.write_text("tls_version: 'tls1.0'\nssl_verify: false\ndebug: true\n", encoding="utf-8")

            engine = ConfigurationEngine()
            result = engine.analyze([cfg_file])

            self.assertEqual(engine.name, EngineName.CONFIGURATION)
            self.assertEqual(result.files_processed, 1)
            self.assertEqual(len(result.errors), 0)
            self.assertGreaterEqual(len(result.findings), 2)
            for f in result.findings:
                self.assertEqual(f.engine, EngineName.CONFIGURATION)
                UUID(f.finding_id)

    def test_configuration_engine_clean_config(self):
        with tempfile.TemporaryDirectory() as td:
            cfg_file = Path(td) / "production.yaml"
            cfg_file.write_text("ssl_verify: true\ntls_version: 'tls1.3'\ndebug: false\n", encoding="utf-8")

            result = ConfigurationEngine().analyze([cfg_file])
            self.assertEqual(len(result.findings), 0)
            self.assertEqual(result.files_processed, 1)
