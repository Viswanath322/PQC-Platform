"""Air-gap check: the shipped app must make no outbound internet calls.

Scans desktop/src, desktop/index.html, desktop/public, desktop/src-tauri config and backend/.
External URLs inside mock-data files are reported as info (warnings), not failures.
"""
import re
from pathlib import Path

import pytest

from sec_helpers import (SKIP_DIRS, find_external_urls, host_of, is_cdn_or_font, is_local_url, list_files,
                         MOCK_PATH_RE, read_text, report_warnings, snippet)

pytestmark = pytest.mark.security

TELEMETRY_RE = re.compile(
    r"@sentry/|sentry\.io|google-analytics|googletagmanager|\bgtag\s*\(|\bga\s*\(\s*['\"]send|mixpanel|amplitude|posthog|"
    r"hotjar|datadoghq|newrelic|fullstory|segment\.(?:com|io)|@segment/|analytics\.js|plausible\.io|clarity\.ms|"
    r"\blogrocket\b|\bbugsnag\b|\brollbar\b|applicationinsights|app-measurement|\bfirebase(?:app|\.google)\b|@vercel/analytics",
    re.I)
HTTP_CLIENT_IMPORT_RE = re.compile(
    r"^\s*(?:import|from)\s+(requests|httpx|aiohttp|urllib3|urllib\.request|http\.client|boto3|smtplib)\b", re.M)
JS_HTTP_RE = re.compile(r"\b(?:fetch|axios\.\w+|axios|XMLHttpRequest|WebSocket|EventSource|navigator\.sendBeacon)\s*\(")


def _desktop_files(root: Path):
    d = root / "desktop"
    if not d.is_dir():
        pytest.skip("BLOCKED: desktop/ missing at scan root")
    out = []
    for r in list_files(root):
        if not r.startswith("desktop/"):
            continue
        parts = r.split("/")
        if set(parts[:-1]) & SKIP_DIRS or r.endswith(("package-lock.json",)):
            continue
        in_scope = (r.startswith(("desktop/src/", "desktop/public/", "desktop/src-tauri/"))
                    or r in ("desktop/index.html", "desktop/vite.config.ts", "desktop/package.json"))
        if in_scope and not r.endswith(".lock") and "Cargo.lock" not in r:
            t = read_text(root / r)
            if t is not None:
                out.append((r, t))
    return out


def _backend_files(root: Path):
    out = []
    for r in list_files(root):
        if r.startswith("backend/") and r.endswith((".py", ".toml", ".yaml", ".yml", ".ini", ".cfg", ".txt")) \
                and not (set(r.split("/")[:-1]) & SKIP_DIRS):
            t = read_text(root / r)
            if t is not None:
                out.append((r, t))
    return out


def test_no_external_urls_in_desktop(scan_root):
    real, info = [], []
    for r, text in _desktop_files(scan_root):
        for ln, url, line in find_external_urls(text):
            if is_cdn_or_font(url):
                continue  # covered by test_no_cdn_or_web_fonts
            entry = f"{r}:{ln} {url[:100]}"
            is_comment = line.lstrip().startswith(("//", "/*", "*", "#", "<!--"))
            (info if (MOCK_PATH_RE.search(r) or is_comment) else real).append(entry)
    report_warnings(info, "INFO external URLs inside mock-data files or code comments (display strings only, not fetched)")
    assert not real, "external URLs in shipped desktop code (air-gap violation):\n" + "\n".join(real)


def test_no_cdn_or_web_fonts(scan_root):
    hits = []
    for r, text in _desktop_files(scan_root):
        for ln, url, line in find_external_urls(text):
            if is_cdn_or_font(url):
                hits.append(f"{r}:{ln} {url[:110]}")
    assert not hits, "CDN / Google Fonts references (must be bundled locally):\n" + "\n".join(hits)


def test_no_telemetry_or_analytics(scan_root):
    hits = []
    for r, text in _desktop_files(scan_root):
        for ln, line in enumerate(text.splitlines(), 1):
            if TELEMETRY_RE.search(line) and len(line) < 2000:
                hits.append(f"{r}:{ln} {snippet(line, 100)}")
    assert not hits, "analytics/telemetry SDK references:\n" + "\n".join(hits)


def test_tauri_config_has_no_remote_urls(scan_root):
    if not (scan_root / "desktop/src-tauri").is_dir():
        pytest.skip("BLOCKED: Tauri shell not delivered yet (Harshith)")
    hits = []
    for r, text in _desktop_files(scan_root):
        if r.startswith("desktop/src-tauri/") and not r.endswith(".rs"):
            hits += [f"{r}:{ln} {u}" for ln, u, line in find_external_urls(text)
                     if not line.lstrip().startswith(("#", "//"))]  # comments (e.g. scaffold doc links) are not fetched
    assert not hits, "remote URLs in Tauri config:\n" + "\n".join(hits)


def test_desktop_runtime_http_calls_are_local_only(scan_root):
    """fetch/axios/WebSocket calls with a literal non-local URL argument."""
    hits = []
    for r, text in _desktop_files(scan_root):
        if not r.endswith((".ts", ".tsx", ".js", ".jsx")) or MOCK_PATH_RE.search(r):
            continue
        for ln, line in enumerate(text.splitlines(), 1):
            if JS_HTTP_RE.search(line):
                for _, u, _l in find_external_urls(line):
                    hits.append(f"{r}:{ln} {u}")
    assert not hits, "runtime calls to non-local hosts:\n" + "\n".join(hits)


def test_no_outbound_http_in_backend(scan_root):
    if not (scan_root / "backend").is_dir():
        pytest.skip("BLOCKED: backend/ missing at scan root")
    real, info = [], []
    for r, text in _backend_files(scan_root):
        imports = set(HTTP_CLIENT_IMPORT_RE.findall(text))
        urls = [(ln, u, line) for ln, u, line in find_external_urls(text) if not line.lstrip().startswith("#")]
        for ln, u, _ in urls:
            real.append(f"{r}:{ln} external URL {u[:100]}")
        if imports and not urls:
            info.append(f"{r} imports HTTP client(s): {sorted(imports)} (no external URL literal found)")
    report_warnings(info, "INFO backend HTTP-client imports")
    assert not real, "backend references non-local hosts:\n" + "\n".join(real)
