#!/usr/bin/env python3
"""Generate malicious / edge-case ZIP fixtures for ingestion tests at runtime.

Usage:  python tests/fixtures/make_zips.py <out_dir>
API:    build_all(out_dir) -> {name: Path}

Generated ZIPs are never committed (see tests/fixtures/.gitignore). Nothing here
writes to disk outside out_dir; the zip bomb is streamed through zlib so the
~1 GiB of zeros never exists on disk (the archive is ~1 MB).

demo-banking.zip is built from the intentionally vulnerable demo repo on the
`tests/pushpam` branch when PQC_DEMO_REPO points at it, e.g.
    PQC_DEMO_REPO=.worktrees/tests-pushpam/vulnerable-demo-repo
Otherwise it is built from SAFE_SAMPLE below: same file layout, harmless content.
"""
from __future__ import annotations

import os
import stat
import sys
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]

# Harmless stand-in for the vulnerable demo repo (same paths, so ingestion tests don't change).
SAFE_SAMPLE = {
    "README.md": "# Demo banking (safe sample)\n\nHarmless files used when PQC_DEMO_REPO is not set.\n",
    "requirements.txt": "flask==3.0.3\n",
    "config/app.yaml": "debug: false\nallowed_hosts: [\"127.0.0.1\"]\n",
    "demo_bank/__init__.py": "",
    "demo_bank/app.py": "def balance(account):\n    return account.get(\"balance\", 0)\n",
    "java/com/silicofeller/demo/AccountService.java": (
        "package com.silicofeller.demo;\n\npublic class AccountService {\n"
        "    public int balance() { return 0; }\n}\n"
    ),
    "web/statement.js": "function render(el, text) { el.textContent = text; }\nmodule.exports = { render };\n",
}


def demo_repo() -> Path | None:
    """The vulnerable demo repo from PQC_DEMO_REPO, or None when it isn't configured."""
    raw = os.getenv("PQC_DEMO_REPO")
    if not raw:
        return None
    path = Path(raw)
    path = (path if path.is_absolute() else REPO_ROOT / path).resolve()
    return path if (path / "EXPECTED_FINDINGS.json").is_file() else None

BOMB_UNCOMPRESSED = 1024 * 1024 * 1024  # 1 GiB
MANY_FILES_COUNT = 5000

NAMES = [
    "demo-banking.zip", "traversal_dotdot.zip", "traversal_absolute.zip",
    "traversal_windows.zip", "symlink.zip", "zip_bomb.zip", "fake_zip.zip",
    "empty.zip", "corrupted.zip", "nested.zip", "unicode_names.zip", "many_files.zip",
]

# Junk entries added to demo-banking.zip; ingestion must exclude these.
EXCLUDED_JUNK = [
    "node_modules/left-pad/index.js",
    "node_modules/.bin/tool",
    ".git/HEAD",
    ".git/config",
    ".git/objects/ab/cdef0123",
    "build/output.o",
    "__pycache__/app.cpython-310.pyc",
    "dist/bundle.min.js",
]


def _demo_banking(path: Path):
    root = demo_repo()
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        if root:
            for p in sorted(root.rglob("*")):
                if p.is_file() and "__pycache__" not in p.parts:
                    z.write(p, p.relative_to(root).as_posix())
        else:
            for rel, text in SAFE_SAMPLE.items():
                z.writestr(rel, text)
        for name in EXCLUDED_JUNK:
            z.writestr(name, "junk generated for exclusion test\n")


def _entries(path: Path, entries: dict[str, bytes | str]):
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("ok/readme.txt", "benign file\n")
        for name, data in entries.items():
            info = zipfile.ZipInfo(name)
            info.filename = name
            z.writestr(info, data)


def _symlink(path: Path):
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("ok/readme.txt", "benign file\n")
        info = zipfile.ZipInfo("link_to_passwd")
        info.create_system = 3  # unix
        info.external_attr = (stat.S_IFLNK | 0o777) << 16
        z.writestr(info, "/etc/passwd")


def _zip_bomb(path: Path):
    chunk = b"\0" * (1024 * 1024)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        with z.open("zeros.bin", mode="w", force_zip64=True) as f:
            for _ in range(BOMB_UNCOMPRESSED // len(chunk)):
                f.write(chunk)


def _fake(path: Path):
    path.write_text("This is not a zip archive, just plain text renamed to .zip\n")


def _empty(path: Path):
    with zipfile.ZipFile(path, "w"):
        pass


def _corrupted(path: Path, tmp_valid: Path):
    with zipfile.ZipFile(tmp_valid, "w", zipfile.ZIP_DEFLATED) as z:
        for i in range(20):
            z.writestr(f"src/file{i}.py", f"print({i})\n" * 200)
    data = tmp_valid.read_bytes()
    path.write_bytes(data[: len(data) * 2 // 3])  # cut off central directory
    tmp_valid.unlink()


def _nested(path: Path, tmp_inner: Path):
    with zipfile.ZipFile(tmp_inner, "w") as z:
        z.writestr("inner/app.py", "print('inner')\n")
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("outer.txt", "outer\n")
        z.write(tmp_inner, "inner.zip")
    tmp_inner.unlink()


UNICODE_NAMES = ["src/caf\u00e9.py", "src/\u6587\u4ef6.py", "src/\u0444\u0430\u0439\u043b.py", "src/emoji_\U0001f512.py"]


def _unicode(path: Path):
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        for n in UNICODE_NAMES:
            z.writestr(n, "print('unicode')\n")


def _many(path: Path):
    with zipfile.ZipFile(path, "w", zipfile.ZIP_STORED) as z:
        for i in range(MANY_FILES_COUNT):
            z.writestr(f"src/pkg{i % 50}/f{i}.py", "x = 1\n")


def build_all(out_dir) -> dict[str, Path]:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    p = {n: out / n for n in NAMES}
    _demo_banking(p["demo-banking.zip"])
    _entries(p["traversal_dotdot.zip"], {"../../evil.txt": "pwned\n"})
    _entries(p["traversal_absolute.zip"], {"/tmp/evil.txt": "pwned\n"})
    _entries(p["traversal_windows.zip"], {"..\\..\\evil.txt": "pwned\n", "C:\\evil.txt": "pwned\n"})
    _symlink(p["symlink.zip"])
    _zip_bomb(p["zip_bomb.zip"])
    _fake(p["fake_zip.zip"])
    _empty(p["empty.zip"])
    _corrupted(p["corrupted.zip"], out / "_tmp_valid.zip.part")
    _nested(p["nested.zip"], out / "_tmp_inner.zip.part")
    _unicode(p["unicode_names.zip"])
    _many(p["many_files.zip"])
    return p


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: make_zips.py <out_dir>")
    for name, path in build_all(sys.argv[1]).items():
        print(f"{name:26s} {path.stat().st_size:>10,d} bytes")
