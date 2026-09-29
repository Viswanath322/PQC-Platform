"""Self-tests for tests/fixtures/make_zips.py (NOT blocked): each fixture has its intended property."""
import json
import time
import zipfile
from pathlib import Path

import make_zips

FIX = Path(make_zips.__file__).parent


def names(p):
    with zipfile.ZipFile(p) as z:
        return z.namelist()


def test_build_all_builds_every_fixture(zips):
    assert set(zips) == set(make_zips.NAMES)
    for n, p in zips.items():
        assert p.exists() and p.stat().st_size > 0 or n == "empty.zip", n
    assert not list(zips["empty.zip"].parent.glob("*.part")), "temp files left behind"


def test_demo_zip_has_source_and_junk(zips):
    n = names(zips["demo-banking.zip"])
    assert "demo_bank/app.py" in n and "requirements.txt" in n
    assert "node_modules/left-pad/index.js" in n and ".git/HEAD" in n


def test_traversal_entries(zips):
    assert "../../evil.txt" in names(zips["traversal_dotdot.zip"])
    assert "/tmp/evil.txt" in names(zips["traversal_absolute.zip"])
    w = names(zips["traversal_windows.zip"])
    assert "..\\..\\evil.txt" in w and "C:\\evil.txt" in w


def test_symlink_entry(zips):
    with zipfile.ZipFile(zips["symlink.zip"]) as z:
        info = z.getinfo("link_to_passwd")
        assert (info.external_attr >> 16) & 0o170000 == 0o120000
        assert z.read(info) == b"/etc/passwd"


def test_zip_bomb_ratio_and_size(zips):
    p = zips["zip_bomb.zip"]
    assert p.stat().st_size < 5 * 1024 * 1024
    with zipfile.ZipFile(p) as z:
        info = z.infolist()[0]
        assert info.file_size >= 1024 ** 3
        assert info.file_size / info.compress_size > 100


def test_bomb_build_is_fast(tmp_path):
    t = time.time()
    make_zips.build_all(tmp_path)
    assert time.time() - t < 10


def test_fake_empty_corrupted(zips):
    assert not zipfile.is_zipfile(zips["fake_zip.zip"])
    assert zipfile.is_zipfile(zips["empty.zip"]) and names(zips["empty.zip"]) == []
    assert not zipfile.is_zipfile(zips["corrupted.zip"])


def test_nested_contains_zip(zips):
    assert "inner.zip" in names(zips["nested.zip"])


def test_unicode_and_many(zips):
    n = names(zips["unicode_names.zip"])
    assert any("\u6587" in x for x in n) and len(n) == 4
    assert len(names(zips["many_files.zip"])) == make_zips.MANY_FILES_COUNT


def test_answer_key_lines_match_source():
    """Every finding/true-negative line in EXPECTED_FINDINGS.json carries its own marker."""
    root = FIX / "vulnerable-demo-repo"
    key = json.loads((root / "EXPECTED_FINDINGS.json").read_text())
    assert len(key["findings"]) >= 30 and key["true_negatives"]
    for item in key["findings"] + key["true_negatives"]:
        line = (root / item["file"]).read_text().splitlines()[item["line"] - 1]
        assert item["id"] in line, (item["id"], line)
    cats = {f["category"] for f in key["findings"]}
    assert cats == {"sast", "crypto", "dependency", "configuration"}
    rules = {f["rule"] for f in key["findings"]}
    for needed in ("sql-injection", "command-injection", "path-traversal", "weak-hash-md5",
                   "quantum-vulnerable-rsa-weak-key", "quantum-vulnerable-ecdsa", "insecure-mode-aes-ecb"):
        assert needed in rules


def test_demo_repo_secrets_are_fake():
    for p in (FIX / "vulnerable-demo-repo").rglob("*"):
        if p.suffix in {".py", ".java", ".js"}:
            text = p.read_text()
            assert "AKIA" not in text.replace("AKIAIOSFODNN7EXAMPLE", "")
