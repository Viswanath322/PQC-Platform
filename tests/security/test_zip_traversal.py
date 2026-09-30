"""
Day 1 QA — ZIP path traversal security tests.
Author: Pushpam (QA + Cyber Security)

Verifies that the ingestion module rejects malicious ZIP archives
containing path traversal sequences before any file is written.
"""

import io
import struct
import zipfile
import pytest

from ingestion.extractor import ExtractionError, extract_zip_safely
from ingestion.validator import InvalidArchiveError


# --------------------------------------------------------------------------- #
# Helpers to craft malicious ZIPs in memory
# --------------------------------------------------------------------------- #

def _make_traversal_zip(evil_path: str) -> io.BytesIO:
    """Return a BytesIO ZIP where one member has a traversal path."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("safe_file.txt", "safe content")
        zf.writestr(evil_path, "malicious content")
    buf.seek(0)
    return buf


def _write_to_disk(buf: io.BytesIO, tmp_path) -> object:
    p = tmp_path / "test.zip"
    p.write_bytes(buf.read())
    return p


# --------------------------------------------------------------------------- #
# Path traversal rejection tests
# --------------------------------------------------------------------------- #

def test_unix_dotdot_traversal_is_rejected(tmp_path):
    """../etc/passwd style path must be rejected."""
    zip_buf = _make_traversal_zip("../etc/passwd")
    zip_path = _write_to_disk(zip_buf, tmp_path)
    dest = tmp_path / "output"
    with pytest.raises(ExtractionError, match="Unsafe|traversal|escape"):
        extract_zip_safely(zip_path, dest)


def test_deep_traversal_is_rejected(tmp_path):
    """../../../../../../tmp/evil style path must be rejected."""
    zip_buf = _make_traversal_zip("../../../../../../tmp/evil.py")
    zip_path = _write_to_disk(zip_buf, tmp_path)
    dest = tmp_path / "output2"
    with pytest.raises(ExtractionError, match="Unsafe|traversal|escape"):
        extract_zip_safely(zip_path, dest)


def test_absolute_path_in_zip_is_rejected(tmp_path):
    """/etc/passwd absolute path must be rejected."""
    zip_buf = _make_traversal_zip("/etc/passwd")
    zip_path = _write_to_disk(zip_buf, tmp_path)
    dest = tmp_path / "output3"
    with pytest.raises(ExtractionError, match="Unsafe|absolute|traversal|escape"):
        extract_zip_safely(zip_path, dest)


def test_windows_style_traversal_is_rejected(tmp_path):
    r"""..\ Windows path traversal must be rejected."""
    zip_buf = _make_traversal_zip("..\\Windows\\System32\\evil.dll")
    zip_path = _write_to_disk(zip_buf, tmp_path)
    dest = tmp_path / "output4"
    with pytest.raises(ExtractionError, match="Unsafe|traversal|escape"):
        extract_zip_safely(zip_path, dest)


def test_safe_zip_extracts_correctly(tmp_path):
    """A well-formed ZIP with no traversal must extract successfully."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("src/main.py", "print('hello')\n")
        zf.writestr("README.md", "# Demo project\n")
    buf.seek(0)
    zip_path = tmp_path / "safe.zip"
    zip_path.write_bytes(buf.read())
    dest = tmp_path / "safe_out"
    extracted = extract_zip_safely(zip_path, dest)
    assert len(extracted) == 2
    assert any(p.name == "main.py" for p in extracted)
    assert any(p.name == "README.md" for p in extracted)


def test_symlink_in_zip_is_rejected(tmp_path):
    """ZIP members that are symlinks (external attr) must be rejected."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        info = zipfile.ZipInfo("link_to_passwd")
        info.external_attr = 0xA1FF0000  # symlink mode bits
        zf.writestr(info, "/etc/passwd")
    buf.seek(0)
    zip_path = tmp_path / "symlink.zip"
    zip_path.write_bytes(buf.read())
    dest = tmp_path / "sym_out"
    with pytest.raises(ExtractionError, match="ymlink|Symbolic"):
        extract_zip_safely(zip_path, dest)
