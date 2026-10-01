"""Fail if git tracks files that must never be committed (DBs, uploads, caches, build output, keys)."""
import re

import pytest

from sec_helpers import git, is_git_repo

pytestmark = pytest.mark.security

FIXTURES = "tests/fixtures/"
RULES = {
    "database files (*.db, *.sqlite, *.sqlite3)": r"\.(db|sqlite3?)$",
    "zip archives outside tests/fixtures": r"\.zip$",
    "python bytecode / __pycache__": r"(^|/)__pycache__/|\.pyc$",
    ".env files": r"(^|/)\.env($|\.(?!example$|sample$|template$))|\.env$",
    "node_modules": r"(^|/)node_modules/",
    "dist/build output": r"(^|/)(dist|build|dist-ssr)/|(^|/)src-tauri/target/",
    "private keys/certs (*.pem, *.key)": r"\.(pem|key|p12|pfx)$",
    "storage/uploads content": r"(^|/)storage/uploads/",
}


@pytest.fixture(scope="module")
def tracked(scan_root):
    if not is_git_repo(scan_root):
        pytest.skip("BLOCKED: scan root is not a git work tree")
    return [p for p in git(scan_root, "ls-files").stdout.splitlines() if not p.startswith(FIXTURES)]


@pytest.mark.parametrize("label", list(RULES))
def test_not_committed(tracked, label):
    rx = re.compile(RULES[label])
    hits = [p for p in tracked if rx.search(p)]
    assert not hits, f"{label} are tracked by git ({len(hits)}):\n" + "\n".join(hits[:25])
