import json
import tempfile
import unittest
import warnings
import zipfile
from pathlib import Path

from ingestion.extractor import ExtractionError
from ingestion.classifier import classify_file
from ingestion.file_filter import is_excluded
from ingestion.scan_adapter import ScanNotFoundError, ingest_scan_record, ingest_scan_upload
from ingestion.summary import ingest_repository
from ingestion.validator import InvalidArchiveError, ZipLimits


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

    def test_absolute_paths_are_rejected(self):
        with zipfile.ZipFile(self.archive, "w") as z:
            z.writestr("/etc/passwd", "unsafe")
        with self.assertRaisesRegex(ExtractionError, "Unsafe ZIP member"):
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

    def test_expansion_size_limit_rejects_zip_bomb_before_extraction(self):
        with zipfile.ZipFile(self.archive, "w", compression=zipfile.ZIP_DEFLATED) as z:
            z.writestr("large.txt", b"A" * 100_000)
        limits = ZipLimits(max_uncompressed_bytes=50_000, max_compression_ratio=10_000)
        with self.assertRaisesRegex(InvalidArchiveError, "expands"):
            ingest_repository(self.archive, self.destination, limits)
        self.assertFalse(self.destination.exists())

    def test_compression_ratio_limit_rejects_highly_compressible_member(self):
        with zipfile.ZipFile(self.archive, "w", compression=zipfile.ZIP_DEFLATED) as z:
            z.writestr("large.txt", b"A" * 100_000)
        limits = ZipLimits(max_uncompressed_bytes=200_000, max_compression_ratio=10)
        with self.assertRaisesRegex(InvalidArchiveError, "compression ratio"):
            ingest_repository(self.archive, self.destination, limits)

    def test_file_count_limit_rejects_too_many_files(self):
        with zipfile.ZipFile(self.archive, "w") as z:
            z.writestr("one.txt", "1")
            z.writestr("two.txt", "2")
        limits = ZipLimits(max_files=1)
        with self.assertRaisesRegex(InvalidArchiveError, "too many files"):
            ingest_repository(self.archive, self.destination, limits)

    def test_duplicate_member_paths_are_rejected_and_output_cleaned(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", UserWarning)
            with zipfile.ZipFile(self.archive, "w") as z:
                z.writestr("same.txt", "first")
                z.writestr("same.txt", "second")
        with self.assertRaisesRegex(ExtractionError, "Duplicate ZIP member"):
            ingest_repository(self.archive, self.destination)
        self.assertFalse(self.destination.exists())

    def test_case_insensitive_duplicate_paths_are_rejected(self):
        with zipfile.ZipFile(self.archive, "w") as z:
            z.writestr("Repo/Readme.txt", "first")
            z.writestr("repo/README.txt", "second")
        with self.assertRaisesRegex(ExtractionError, "Duplicate ZIP member"):
            ingest_repository(self.archive, self.destination)

    def test_unknown_text_config_and_legitimate_directory_names(self):
        with zipfile.ZipFile(self.archive, "w") as z:
            z.writestr("out/notes.unknown", "plain notes")
            z.writestr("env/settings.conf", "setting=value")
            z.writestr("target/src/main.rs", "fn main() {}")
        result = ingest_repository(self.archive, self.destination)
        self.assertEqual(result["files_included"], 3)
        classes = {item["path"]: item["file_type"] for item in result["files"]}
        self.assertEqual(classes["out/notes.unknown"], "docs")
        self.assertEqual(classes["env/settings.conf"], "config")
        self.assertEqual(classes["target/src/main.rs"], "source")
        self.assertFalse(is_excluded("out/notes.txt"))
        self.assertFalse(is_excluded("env/settings.conf"))
        self.assertFalse(is_excluded("target/src/main.rs"))

    def test_extensionless_configuration_and_unknown_binary_classification(self):
        self.assertEqual(classify_file("Dockerfile"), "config")
        self.assertEqual(classify_file("settings.unknown", b"API_URL=http://localhost\n"), "config")
        self.assertEqual(classify_file("settings.unknown", b"{\"debug\": true}"), "config")
        self.assertEqual(classify_file("payload.unknown", b"\x00\x01"), "binary")

    def test_additional_config_and_source_file_types(self):
        # Issue #22: .pem should be config, .html should be source
        self.assertEqual(classify_file("cert.pem"), "config")
        self.assertEqual(classify_file("key.pem"), "config")
        self.assertEqual(classify_file("index.html"), "source")
        self.assertEqual(classify_file("page.htm"), "source")

    def test_manifest_file_variations(self):
        # Issue #41.3: requirements-*.txt, Pipfile, Gemfile, setup.py recognition
        self.assertEqual(classify_file("requirements.txt"), "manifest")
        self.assertEqual(classify_file("requirements-dev.txt"), "manifest")
        self.assertEqual(classify_file("requirements-test.txt"), "manifest")
        self.assertEqual(classify_file("Pipfile"), "manifest")
        self.assertEqual(classify_file("Pipfile.lock"), "manifest")
        self.assertEqual(classify_file("Gemfile"), "manifest")
        self.assertEqual(classify_file("Gemfile.lock"), "manifest")
        self.assertEqual(classify_file("setup.py"), "manifest")

    def test_scan_record_adapter_loads_repository_path_from_database_model(self):
        scan_id = "a9b51b95-3e0b-4ccd-ba85-49fa06a7a43f"
        with zipfile.ZipFile(self.archive, "w") as z:
            z.writestr("src/main.py", "print('ok')")

        class Scan:
            id = scan_id
            repository_path = str(self.archive)

        class Session:
            def __init__(self):
                self.lookup = None

            def get(self, model, key):
                self.lookup = (model, key)
                return Scan()

        db = Session()
        summary = ingest_scan_record(db, Scan, scan_id, self.root / "storage")
        self.assertEqual(db.lookup, (Scan, scan_id))
        self.assertEqual(summary["files_included"], 1)

    def test_scan_record_adapter_reports_missing_scan_and_missing_path(self):
        class Scan:
            repository_path = None

        class Session:
            def __init__(self, record):
                self.record = record

            def get(self, model, key):
                return self.record

        with self.assertRaises(ScanNotFoundError):
            ingest_scan_record(Session(None), Scan, "a9b51b95-3e0b-4ccd-ba85-49fa06a7a43f", self.root)
        with self.assertRaisesRegex(ValueError, "no repository_path"):
            ingest_scan_record(Session(Scan()), Scan, "a9b51b95-3e0b-4ccd-ba85-49fa06a7a43f", self.root)


if __name__ == "__main__":
    unittest.main()
