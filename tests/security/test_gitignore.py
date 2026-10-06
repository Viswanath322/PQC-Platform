"""Root .gitignore must exist and cover the artifacts that must never be committed."""
import shutil
import subprocess

import pytest

pytestmark = pytest.mark.security

# path that must be ignored -> why
MUST_IGNORE = {
    ".env": "secrets",
    "backend/.env": "secrets (nested)",
    "backend/app/__pycache__/x.cpython-310.pyc": "python bytecode",
    "desktop/node_modules/react/index.js": "node deps",
    "backend/dev.db": "local SQLite database",
    "backend/storage/uploads/a9b51b95.zip": "customer uploads",
    "desktop/src-tauri/target/debug/app": "Rust build output",
}


def test_root_gitignore_exists(scan_root):
    gi = scan_root / ".gitignore"
    assert gi.is_file(), f"no root .gitignore in {scan_root}"
    assert gi.stat().st_size > 0


@pytest.mark.parametrize("path", list(MUST_IGNORE))
def test_path_is_ignored(scan_root, tmp_path, path):
    """Evaluate ONLY the root .gitignore in a scratch repo (nested .gitignore files don't count)."""
    root_gitignore = scan_root / ".gitignore"
    assert root_gitignore.is_file(), f"no root .gitignore in {scan_root}"
    if not shutil.which("git"):
        pytest.skip("BLOCKED: git not available")
    subprocess.run(["git", "init", "-q", str(tmp_path)], check=True)
    (tmp_path / ".gitignore").write_bytes(root_gitignore.read_bytes())
    r = subprocess.run(["git", "-C", str(tmp_path), "check-ignore", "-q", "--no-index", path])
    assert r.returncode == 0, f"{path} ({MUST_IGNORE[path]}) is not covered by the root .gitignore"
