"""Contract tests for Hima Bindu's ingestion module. BLOCKED until `ingestion/` exists.

All API assumptions are in adapter.py.
"""
import json
import os
import time
from pathlib import Path

import pytest

import adapter
from adapter import extract

EXCLUDED_PREFIXES = ("node_modules/", ".git/", "build/", "__pycache__/", "dist/")


def _tree(root: Path):
    return sorted(p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file())


def _escaped(parent: Path, dest: Path):
    """Anything under parent that is not inside dest."""
    return [p for p in parent.iterdir() if p != dest]


# ---------------------------------------------------------------- valid archive
def test_valid_zip_extracts_and_counts(zips, sandbox):
    _, dest = sandbox
    out = extract(zips["demo-banking.zip"], dest)
    assert out.accepted, f"valid ZIP rejected: {out.error!r}"
    files = _tree(dest)
    assert "demo_bank/app.py" in files
    assert "requirements.txt" in files
    total = adapter.summary_total_files(out.summary or {})
    assert total is not None, "summary has no file count (see adapter.summary_total_files)"
    assert total == len(files), f"summary says {total}, disk has {len(files)}"


def test_excluded_dirs_ignored(zips, sandbox):
    _, dest = sandbox
    out = extract(zips["demo-banking.zip"], dest)
    assert out.accepted
    for f in _tree(dest):
        assert not f.startswith(EXCLUDED_PREFIXES), f"excluded path extracted: {f}"
    reported = adapter.summary_paths(out.summary or {})
    assert not [p for p in reported if p.startswith(EXCLUDED_PREFIXES)]


def test_summary_json_serialisable(zips, sandbox):
    _, dest = sandbox
    out = extract(zips["demo-banking.zip"], dest)
    assert out.accepted
    json.dumps(out.summary)  # must not raise
    assert isinstance(out.summary, dict)


# ------------------------------------------------------------ path traversal
@pytest.mark.security
@pytest.mark.parametrize("name", ["traversal_dotdot.zip", "traversal_absolute.zip", "traversal_windows.zip"])
def test_traversal_rejected_and_nothing_escapes(name, zips, sandbox):
    parent, dest = sandbox
    grandparent = parent.parent
    abs_target = Path("/tmp/evil.txt")
    pre_existing = abs_target.exists()
    out = extract(zips[name], dest)
    assert not out.accepted, f"{name} was accepted"
    assert out.clean, f"crashed instead of clean rejection: {out.error!r}"
    assert not _escaped(parent, dest), "file written next to dest"
    assert not [p for p in grandparent.iterdir() if p != parent], "file written above sandbox"
    assert not (grandparent.parent / "evil.txt").exists()
    if not pre_existing:
        assert not abs_target.exists(), "absolute path entry written to /tmp/evil.txt"
    assert not [f for f in _tree(dest) if "evil" in f], "evil file extracted inside dest"


# ------------------------------------------------------------------- symlinks
@pytest.mark.security
def test_symlink_not_followed(zips, sandbox):
    _, dest = sandbox
    out = extract(zips["symlink.zip"], dest)
    assert out.clean, f"crash: {out.error!r}"
    link = dest / "link_to_passwd"
    assert not link.is_symlink(), "symlink entry materialised as a symlink"
    if link.exists():  # tolerated only if it is NOT the real /etc/passwd content
        assert link.read_bytes() != Path("/etc/passwd").read_bytes()
    for p in dest.rglob("*"):
        assert not p.is_symlink(), f"symlink created: {p}"


# ------------------------------------------------------------------ zip bomb
@pytest.mark.security
def test_zip_bomb_rejected_or_limited(zips, sandbox):
    _, dest = sandbox
    start = time.time()
    out = extract(zips["zip_bomb.zip"], dest)
    elapsed = time.time() - start
    written = sum(p.stat().st_size for p in dest.rglob("*") if p.is_file())
    assert out.clean, f"crash: {out.error!r}"
    assert written < 200 * 1024 * 1024, f"bomb expanded to {written} bytes on disk"
    assert not out.accepted or written < 200 * 1024 * 1024
    assert elapsed < 60, f"took {elapsed:.0f}s"


# ------------------------------------------------ invalid archives: clean error
@pytest.mark.parametrize("name", ["fake_zip.zip", "corrupted.zip", "empty.zip"])
def test_invalid_archive_clean_error(name, zips, sandbox):
    parent, dest = sandbox
    out = extract(zips[name], dest)
    assert out.clean, f"unhandled crash type: {out.error!r}"
    if name == "empty.zip":
        # empty archive: either rejected with a clear error or accepted with zero files
        if out.accepted:
            assert adapter.summary_total_files(out.summary or {}) in (0, None)
            assert _tree(dest) == []
    else:
        assert not out.accepted, f"{name} accepted"
        assert out.error is not None or out.summary.get("error"), "no error message"
    assert not _escaped(parent, dest)


def test_nested_zip_not_recursively_extracted(zips, sandbox):
    _, dest = sandbox
    out = extract(zips["nested.zip"], dest)
    assert out.clean
    if out.accepted:
        assert not (dest / "inner" / "app.py").exists(), "nested archive auto-expanded (bomb risk)"


def test_unicode_names_handled(zips, sandbox):
    _, dest = sandbox
    out = extract(zips["unicode_names.zip"], dest)
    assert out.clean, f"crash: {out.error!r}"
    if out.accepted:
        assert len(_tree(dest)) == 4


def test_many_files_handled(zips, sandbox):
    _, dest = sandbox
    out = extract(zips["many_files.zip"], dest)
    assert out.clean, f"crash: {out.error!r}"
    if out.accepted:
        assert len(_tree(dest)) == 5000
    else:
        assert out.error is not None or out.summary.get("error"), "rejected without message"


# ------------------------------------------------- language detection / classify
@pytest.mark.parametrize("path,expected", [
    ("demo_bank/app.py", {"python", "py"}),
    ("java/com/x/AccountService.java", {"java"}),
    ("web/statement.js", {"javascript", "js"}),
])
def test_language_detection(path, expected):
    lang = adapter.detect_language(path)
    assert lang is not None and str(lang).lower() in expected, lang


@pytest.mark.parametrize("path,expected", [
    ("demo_bank/app.py", "source"),
    ("config/app.yaml", "config"),
    ("requirements.txt", "manifest"),
    ("README.md", "docs"),
    ("logo.png", "binary"),
])
def test_file_classification(path, expected):
    assert str(adapter.classify(path)).lower() == expected


@pytest.mark.parametrize("path", ["node_modules/x/index.js", ".git/HEAD", "build/out.o", "__pycache__/a.pyc"])
def test_file_filter_excludes(path):
    assert adapter.is_excluded(path) is True
