"""
Day 1 QA — Ingestion module integration tests (no backend required).
Author: Pushpam (QA + Cyber Security)

These tests call the ingestion module directly; they do not require
the FastAPI backend or Docker services to be running.
"""

import io
import zipfile
from pathlib import Path

import pytest

from ingestion.extractor import ExtractionError, extract_zip_safely
from ingestion.summary import ingest_repository
from ingestion.validator import InvalidArchiveError, validate_zip


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def _write_zip(tmp_path: Path, files: dict[str, str]) -> Path:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for name, content in files.items():
            zf.writestr(name, content)
    p = tmp_path / "test.zip"
    p.write_bytes(buf.getvalue())
    return p


# --------------------------------------------------------------------------- #
# Validator
# --------------------------------------------------------------------------- #

def test_validate_valid_zip_returns_path(tmp_path):
    p = _write_zip(tmp_path, {"hello.py": "print('hello')"})
    result = validate_zip(p)
    assert result == p


def test_validate_non_zip_raises(tmp_path):
    p = tmp_path / "notazip.zip"
    p.write_bytes(b"this is not a zip file at all")
    with pytest.raises(InvalidArchiveError):
        validate_zip(p)


# --------------------------------------------------------------------------- #
# Extractor
# --------------------------------------------------------------------------- #

def test_extract_safe_zip_returns_file_list(tmp_path):
    src = _write_zip(tmp_path, {
        "src/main.py": "print('hello')",
        "README.md": "# Demo",
        "requirements.txt": "flask==2.3.0",
    })
    dest = tmp_path / "out"
    files = extract_zip_safely(src, dest)
    names = {f.name for f in files}
    assert "main.py" in names
    assert "README.md" in names
    assert "requirements.txt" in names


def test_extract_traversal_is_rejected(tmp_path):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("safe.txt", "ok")
        zf.writestr("../evil.txt", "danger")
    buf.seek(0)
    src = tmp_path / "traversal.zip"
    src.write_bytes(buf.getvalue())
    dest = tmp_path / "out_t"
    with pytest.raises(ExtractionError):
        extract_zip_safely(src, dest)


# --------------------------------------------------------------------------- #
# Full ingest_repository summary
# --------------------------------------------------------------------------- #

def test_ingest_repository_returns_summary(tmp_path):
    src = _write_zip(tmp_path, {
        "src/auth/login.py": "def login(): pass",
        "src/api/routes.py": "from flask import Flask",
        "requirements.txt": "flask==2.3.0",
        "README.md": "# Banking App",
        "node_modules/lib/index.js": "// excluded",  # should be filtered out
    })
    dest = tmp_path / "repo"
    summary = ingest_repository(src, dest)

    assert "files_seen" in summary
    assert "files_included" in summary
    assert "file_type_counts" in summary
    assert "language_counts" in summary
    assert "files" in summary
    # node_modules content should have been filtered
    included_paths = [f["path"] for f in summary["files"]]
    assert not any("node_modules" in p for p in included_paths), (
        "node_modules/ files should be excluded by the file filter"
    )


def test_ingest_repository_detects_python_language(tmp_path):
    src = _write_zip(tmp_path, {
        "src/main.py": "print('hello')",
        "src/utils.py": "def util(): pass",
    })
    dest = tmp_path / "py_repo"
    summary = ingest_repository(src, dest)
    # language_detector may return lowercase "python"; normalise for comparison
    lang_counts = {k.lower(): v for k, v in summary["language_counts"].items()}
    assert lang_counts.get("python", 0) == 2


def test_ingest_repository_classifies_source_files(tmp_path):
    src = _write_zip(tmp_path, {"app.py": "x = 1"})
    dest = tmp_path / "cls_repo"
    summary = ingest_repository(src, dest)
    assert summary["file_type_counts"].get("source", 0) >= 1


def test_ingest_repository_classifies_manifest_files(tmp_path):
    src = _write_zip(tmp_path, {
        "app.py": "x = 1",
        "requirements.txt": "flask==2.3.0",
    })
    dest = tmp_path / "mf_repo"
    summary = ingest_repository(src, dest)
    assert summary["file_type_counts"].get("manifest", 0) >= 1
