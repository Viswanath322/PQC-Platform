"""Shared helpers for the security tests (file enumeration, URL/secret patterns)."""
from __future__ import annotations

import re
import subprocess
import warnings
from pathlib import Path
from urllib.parse import urlparse

# The intentionally-vulnerable demo repo (fake secrets, weak crypto). Never scanned.
FIXTURE_ALLOWLIST = ("tests/fixtures/vulnerable-demo-repo/", "vulnerable-demo-repo/")  # old path, and its root on tests/pushpam
# This test suite itself contains the regexes it searches for.
SELF_EXCLUDE = ("tests/security/",)

SKIP_DIRS = {"node_modules", ".git", "dist", "build", "target", ".venv", "venv", "__pycache__",
             ".mypy_cache", ".pytest_cache", ".worktrees", "dist-ssr"}
BINARY_EXT = {".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".woff", ".woff2", ".ttf", ".otf",
              ".eot", ".zip", ".gz", ".db", ".sqlite", ".pyc", ".pdf", ".mp4", ".icns", ".so"}
LOCK_FILES = {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "Cargo.lock", "poetry.lock"}

LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0", "ipc.localhost", "tauri.localhost", "asset.localhost"}
# Namespace / schema identifiers that are never fetched at runtime.
NAMESPACE_HOSTS = {"www.w3.org", "w3.org", "schema.tauri.app", "json-schema.org"}
CDN_FONT_HOSTS = ("fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net", "unpkg.com",
                  "cdnjs.cloudflare.com", "code.jquery.com", "cdn.tailwindcss.com", "ajax.googleapis.com",
                  "use.typekit.net", "use.fontawesome.com", "kit.fontawesome.com", "stackpath.bootstrapcdn.com",
                  "maxcdn.bootstrapcdn.com", "cdn.skypack.dev", "esm.sh", "esm.run")
MOCK_PATH_RE = re.compile(r"(mock|fixture|sample|seed)", re.I)

URL_RE = re.compile(r"""(?:https?:)?//[A-Za-z0-9\[\]][A-Za-z0-9.\-:\[\]]*[A-Za-z0-9\]](?::\d+)?[^\s"'`)<>\\]*""")
STRICT_URL_RE = re.compile(r"""https?://[^\s"'`)<>\\,;]+""")
PROTO_REL_RE = re.compile(r"""["'(]//([a-z0-9][a-z0-9.\-]*\.[a-z]{2,})/""", re.I)


def git(root: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True)


def is_git_repo(root: Path) -> bool:
    return git(root, "rev-parse", "--is-inside-work-tree").returncode == 0


def rel(root: Path, p: Path) -> str:
    return p.relative_to(root).as_posix()


def is_allowlisted(relpath: str, include_self: bool = True) -> bool:
    prefixes = FIXTURE_ALLOWLIST + (SELF_EXCLUDE if include_self else ())
    return relpath.startswith(prefixes)


def list_files(root: Path, tracked_only: bool = False) -> list[str]:
    """Repo-relative paths. Uses git (tracked + untracked-not-ignored) when possible."""
    if is_git_repo(root):
        args = ["ls-files"] if tracked_only else ["ls-files", "-co", "--exclude-standard"]
        out = git(root, *args).stdout.splitlines()
        return sorted({p for p in out if (root / p).is_file()})
    out = []
    for p in root.rglob("*"):
        if p.is_file() and not (set(p.relative_to(root).parts[:-1]) & SKIP_DIRS):
            out.append(rel(root, p))
    return sorted(out)


def read_text(path: Path) -> str | None:
    if path.suffix.lower() in BINARY_EXT:
        return None
    try:
        data = path.read_bytes()
    except OSError:
        return None
    if b"\x00" in data[:4096] or len(data) > 2_000_000:
        return None
    return data.decode("utf-8", errors="replace")


def snippet(line: str, limit: int = 140) -> str:
    line = line.strip()
    return line if len(line) <= limit else line[:limit] + "..."


def host_of(url: str) -> str:
    if url.startswith("//"):
        url = "http:" + url
    try:
        host = urlparse(url).hostname or ""
    except ValueError:
        return ""
    return host.lower()


def is_local_url(url: str) -> bool:
    return host_of(url) in LOCAL_HOSTS or host_of(url) == ""


def find_external_urls(text: str):
    """Yield (lineno, url, line) for every http(s) URL whose host is not local / a namespace id."""
    for i, line in enumerate(text.splitlines(), 1):
        for m in STRICT_URL_RE.finditer(line):
            url = m.group(0).rstrip(".")
            h = host_of(url)
            if not h or h in LOCAL_HOSTS or h.endswith(".localhost") or h in NAMESPACE_HOSTS or "." not in h:
                continue
            yield i, url, line
        for m in PROTO_REL_RE.finditer(line):
            h = m.group(1).lower()
            if h not in NAMESPACE_HOSTS:
                yield i, "//" + h, line


def is_cdn_or_font(url: str) -> bool:
    h = host_of(url)
    return any(h == d or h.endswith("." + d) for d in CDN_FONT_HOSTS)


def report_warnings(lines: list[str], title: str) -> None:
    """Print + emit a pytest warning (visible in the summary, not a failure)."""
    if not lines:
        return
    msg = f"{title} ({len(lines)}):\n  " + "\n  ".join(lines)
    print("\nWARNING " + msg)
    warnings.warn(msg, UserWarning, stacklevel=2)
