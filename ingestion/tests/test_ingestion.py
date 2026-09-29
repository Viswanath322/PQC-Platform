import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from ingestion.extractor import ExtractionError
from ingestion.scan_adapter import ingest_scan_upload
from ingestion.summary import ingest_repository
from ingestion.validator import InvalidArchiveError


class IngestionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.archive = self.root / "repo.zip"
        self.destination = self.root / "scan-123"

    def tearDown(self):
        self.temp.cleanup()

    def test_valid_zip_extracts_filters_and_summarizes(self):
        with zipfile.ZipFile(self.archive, "w") as z:
            z.writestr("src/main.py", "print('ok')")
            z.writestr("README.md", "demo")
            z.writestr("node_modules/pkg/index.js", "ignored")
        result = ingest_repository(self.archive, self.destination)
        self.assertEqual(result["files_seen"], 3)
        self.assertEqual(result["files_included"], 2)
        self.assertEqual(result["files_excluded"], 1)
        self.assertEqual(result["language_counts"], {"python": 1})
        self.assertTrue((self.destination / "node_modules/pkg/index.js").exists())

    def test_non_zip_is_rejected(self):
        self.archive.write_text("not a zip")
        with self.assertRaises(InvalidArchiveError):
            ingest_repository(self.archive, self.destination)

    def test_path_traversal_is_rejected_and_partial_output_removed(self):
        with zipfile.ZipFile(self.archive, "w") as z:
            z.writestr("../escape.txt", "unsafe")
        with self.assertRaises(ExtractionError):
            ingest_repository(self.archive, self.destination)
        self.assertFalse(self.destination.exists())

    def test_scan_adapter_uses_scan_specific_directory_and_saves_json(self):
        scan_id = "a9b51b95-3e0b-4ccd-ba85-49fa06a7a43f"
        with zipfile.ZipFile(self.archive, "w") as z:
            z.writestr("src/main.py", "print('ok')")
        summary = ingest_scan_upload(self.archive, scan_id, self.root / "storage")
        scan_dir = self.root / "storage" / "scans" / scan_id
        self.assertTrue((scan_dir / "repository/src/main.py").exists())
        self.assertEqual(json.loads((scan_dir / "ingestion-summary.json").read_text()), summary)

    def test_scan_adapter_rejects_non_uuid_scan_id(self):
        with zipfile.ZipFile(self.archive, "w") as z:
            z.writestr("main.py", "print('ok')")
        with self.assertRaises(ValueError):
            ingest_scan_upload(self.archive, "../../outside", self.root / "storage")


if __name__ == "__main__":
    unittest.main()
