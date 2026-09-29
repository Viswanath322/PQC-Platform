"""Contract tests for Hima Bindu's ingestion module (branch backend/hima-ingestion).

Run with PQC_INGESTION_ROOT=.worktrees/hima; Blocked when the package is not importable.
All API assumptions are in adapter.py.
"""
import json
import os
import time
from pathlib import Path

import pytest

import adapter
import make_zips
from adapter import extract

EXCLUDED_PREFIXES = ("node_modules/", ".git/", "build/", "__pycache__/", "dist/")


def _tree(root: Path):
    return sorted(p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file())


def _escaped(parent: Path, dest: Path):
    """Anything under parent that is not inside dest."""
    return [p for p in parent.iterdir() if p != dest]


# ---------------------------------------------------------------- valid archive
def _junk_on_disk(files):
    return [f for f in files if f.startswith(EXCLUDED_PREFIXES)]


def test_valid_zip_extracts_and_counts(zips, sandbox):
    _, dest = sandbox
    out = extract(zips["demo-banking.zip"], dest)
    assert out.accepted, f"valid ZIP rejected: {out.error!r}"
    files = _tree(dest)
    assert "demo_bank/app.py" in files
    assert "requirements.txt" in files
    s = out.summary or {}
    assert adapter.summary_files_seen(s) == len(files), "files_seen != files on disk"
    included = adapter.summary_total_files(s)
    assert included is not None, "summary has no file count (see adapter.summary_total_files)"
    assert included == len(files) - len(_junk_on_disk(files)), "included count wrong"
    assert s["files_seen"] == s["files_included"] + s["files_excluded"]


def test_excluded_dirs_ignored_in_summary(zips, sandbox):
    _, dest = sandbox
    out = extract(zips["demo-banking.zip"], dest)
    assert out.accepted
    reported = adapter.summary_paths(out.summary or {})
    assert reported, "summary lists no files"
    assert not [p for p in reported if p.startswith(EXCLUDED_PREFIXES)]
    assert (out.summary or {})["files_excluded"] == len(make_zips.EXCLUDED_JUNK)


@pytest.mark.xfail(reason="FINDING ING-03: excluded dirs (.git, node_modules, build) are still written to disk; "
                          "only the summary hides them", strict=False)
def test_excluded_dirs_not_written_to_disk(zips, sandbox):
    _, dest = sandbox
    out = extract(zips["demo-banking.zip"], dest)
    assert out.accepted
    assert not _junk_on_disk(_tree(dest)), _junk_on_disk(_tree(dest))


def test_summary_json_serialisable(zips, sandbox):
    _, dest = sandbox
    out = extract(zips["demo-banking.zip"], dest)
    assert out.accepted
    round_trip = json.loads(json.dumps(out.summary))
    assert round_trip == out.summary
    assert isinstance(out.summary, dict)


def test_demo_summary_classification_and_languages(zips, sandbox):
    _, dest = sandbox
    out = extract(zips["demo-banking.zip"], dest)
    assert out.accepted
    recs = {f["path"]: f for f in out.summary["files"]}
    assert recs["demo_bank/app.py"]["file_type"] == "source" and recs["demo_bank/app.py"]["language"] == "python"
    assert recs["java/com/silicofeller/demo/AccountService.java"]["language"] == "java"
    assert recs["web/statement.js"]["language"] == "javascript"
    assert recs["requirements.txt"]["file_type"] == "manifest"
    assert recs["config/app.yaml"]["file_type"] == "config"
    assert recs["README.md"]["file_type"] == "docs"
    langs = out.summary["language_counts"]
    assert set(langs) == {"python", "java", "javascript"}, langs
    assert sum(out.summary["file_type_counts"].values()) == out.summary["files_included"]
    for r in recs.values():
        assert r["size_bytes"] == (dest / r["path"]).stat().st_size


def test_destination_must_be_empty(zips, sandbox):
    _, dest = sandbox
    dest.mkdir()
    (dest / "keep.txt").write_text("existing")
    out = extract(zips["demo-banking.zip"], dest)
    assert not out.accepted and out.deliberate, out.error
    assert (dest / "keep.txt").read_text() == "existing", "pre-existing scan data touched or deleted"


def test_failed_extraction_leaves_no_partial_output(zips, sandbox):
    parent, dest = sandbox
    out = extract(zips["traversal_dotdot.zip"], dest)  # ok/readme.txt is written before the bad entry
    assert not out.accepted
    assert not dest.exists() or _tree(dest) == [], "partial extraction left behind"


def test_duplicate_entries_rejected_cleanly(sandbox, tmp_path):
    import zipfile
    _, dest = sandbox
    z = tmp_path / "dup.zip"
    with zipfile.ZipFile(z, "w") as f:
        f.writestr("a.py", "x = 1\n")
        f.writestr("a.py", "x = 2\n")
    out = extract(z, dest)
    assert not out.accepted
    assert out.clean
    assert out.deliberate, f"duplicate entry surfaced as raw {type(out.error).__name__}, not a typed ingestion error"


def test_scan_upload_layout_and_summary_file(zips, tmp_path):
    scan_id = "a9b51b95-3e0b-4ccd-ba85-49fa06a7a43f"
    adapter.scan_upload(zips["demo-banking.zip"], scan_id, tmp_path / "storage")
    scan_dir = tmp_path / "storage" / "scans" / scan_id
    assert (scan_dir / "repository" / "demo_bank" / "app.py").is_file()
    saved = json.loads((scan_dir / "ingestion-summary.json").read_text())
    assert saved["files_included"] > 0
    assert not list(scan_dir.glob("*.tmp")), "temp summary left behind"


@pytest.mark.security
@pytest.mark.parametrize("bad_id", ["../../outside", "..", "not-a-uuid", "", "a9b51b95-3e0b-4ccd-ba85-49fa06a7a43f/../x"])
def test_scan_upload_rejects_non_uuid_scan_id(bad_id, zips, tmp_path):
    with pytest.raises(ValueError):
        adapter.scan_upload(zips["demo-banking.zip"], bad_id, tmp_path / "storage")
    assert not (tmp_path / "outside").exists()
    assert not (tmp_path / "storage").exists() or not list((tmp_path / "storage").rglob("*.py"))


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
    assert out.clean and out.deliberate, f"not a typed rejection: {out.error!r}"
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


# ------------------------------------------- gaps found on Hima's branch (kept visible)
@pytest.mark.xfail(reason="FINDING ING-04: files with unknown extensions fall through to 'binary' "
                          "(Dockerfile, .env, .pem, .html, Makefile, .tf), so config/crypto engines may skip them",
                   strict=False)
@pytest.mark.parametrize("path", ["Dockerfile", ".env", "deploy/main.tf", "web/index.html", "Makefile"])
def test_text_config_files_not_classified_binary(path):
    assert str(adapter.classify(path)).lower() != "binary"


@pytest.mark.xfail(reason="FINDING ING-05: dependency manifests missed by classifier "
                          "(requirements-dev.txt -> docs, Pipfile/Gemfile -> binary, setup.py -> source)",
                   strict=False)
@pytest.mark.parametrize("path", ["requirements-dev.txt", "Pipfile", "Gemfile", "setup.py"])
def test_more_manifests_recognised(path):
    assert str(adapter.classify(path)).lower() == "manifest"


@pytest.mark.xfail(reason="FINDING ING-06: exclusion matches dir NAMES anywhere in the path, so real source under "
                          "com/acme/out/, src/env/, src/target/ is silently dropped from the inventory",
                   strict=False)
@pytest.mark.parametrize("path", ["com/acme/out/Writer.java", "src/env/config.py", "src/target/Goal.java"])
def test_legit_source_dirs_not_excluded(path):
    assert adapter.is_excluded(path) is False


def test_is_excluded_returns_bool():
    assert adapter.is_excluded("src/app.py") is False
    assert adapter.is_excluded("a/NODE_MODULES/x.js") is True  # case-insensitive
    assert type(adapter.is_excluded("")) is bool, "returns a list/None instead of bool for empty path"
