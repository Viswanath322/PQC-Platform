"""Pure functions implementing the Tauri hardening checks (Tauri v1 + v2 config layouts).

Each returns a list of problem strings (empty = pass). Kept separate so they can be self-tested.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

LOCAL_CONNECT = re.compile(r"^(?:'self'|ipc:|https?://ipc\.localhost|(?:https?|wss?)://(?:127\.0\.0\.1|localhost|\[::1\])(?::(?:8000|1420))?)$")
LOCAL_HOST_RE = re.compile(r"^(?:https?|wss?)://(?:127\.0\.0\.1|localhost|\[::1\]|ipc\.localhost)(?::\d+)?(?:/.*)?$")
SAFE_SCHEMES = {"'self'", "'none'", "data:", "blob:", "asset:", "ipc:", "tauri:", "http://asset.localhost",
                "https://asset.localhost", "'unsafe-inline'", "'wasm-unsafe-eval'"}


def load_conf(app_dir: Path) -> dict:
    return json.loads((app_dir / "tauri.conf.json").read_text())


def security(conf: dict) -> dict:
    return (conf.get("app", {}) or {}).get("security") or (conf.get("tauri", {}) or {}).get("security") or {}


def csp_directives(conf: dict) -> dict[str, list[str]]:
    csp = security(conf).get("csp")
    if isinstance(csp, dict):
        return {k: (v.split() if isinstance(v, str) else list(v)) for k, v in csp.items()}
    if isinstance(csp, str) and csp.strip():
        out = {}
        for part in csp.split(";"):
            toks = part.split()
            if toks:
                out[toks[0]] = toks[1:]
        return out
    return {}


def check_csp_set(conf):
    return [] if csp_directives(conf) else ["app.security.csp is null/empty (no Content-Security-Policy)"]


def check_csp_no_unsafe_eval_or_remote(conf):
    bad = []
    for d, srcs in csp_directives(conf).items():
        for s in srcs:
            if s == "'unsafe-eval'":
                bad.append(f"{d}: 'unsafe-eval'")
            elif s == "*" or s.startswith("*.") or "://*" in s:
                bad.append(f"{d}: wildcard source {s}")
            elif re.match(r"^(?:https?|wss?)://", s) and not LOCAL_HOST_RE.match(s):
                bad.append(f"{d}: remote origin {s}")
            elif s in ("http:", "https:", "ws:", "wss:"):
                bad.append(f"{d}: scheme-wide source {s}")
    return bad


def check_connect_src(conf):
    d = csp_directives(conf)
    if "connect-src" not in d:
        return ["connect-src not set (falls back to default-src)"] if "default-src" not in d else \
               [] if all(LOCAL_CONNECT.match(s) for s in d["default-src"]) else ["default-src too permissive for connect"]
    return [f"connect-src source not allowed: {s}" for s in d["connect-src"] if not LOCAL_CONNECT.match(s)]


def _all_permissions(app_dir: Path):
    """Yield (file, permission_entry) from capabilities/*.json (v2)."""
    for f in sorted((app_dir / "capabilities").glob("*.json")) if (app_dir / "capabilities").is_dir() else []:
        try:
            data = json.loads(f.read_text())
        except json.JSONDecodeError:
            yield f.name, "INVALID-JSON"
            continue
        for p in data.get("permissions", []):
            yield f.name, p
        for w in data.get("windows", []) + data.get("webviews", []):
            yield f.name, {"window": w}
        if "remote" in data:
            yield f.name, {"remote": data["remote"]}


def check_no_wildcards(conf, app_dir: Path):
    bad = []
    for f, p in _all_permissions(app_dir):
        if p == "INVALID-JSON":
            bad.append(f"{f}: invalid JSON")
        elif isinstance(p, dict) and "window" in p and "*" in p["window"]:
            bad.append(f"{f}: window wildcard {p['window']}")
        elif isinstance(p, dict) and "remote" in p:
            bad.append(f"{f}: remote URL access granted {p['remote']}")
        else:
            name = p if isinstance(p, str) else p.get("identifier", "")
            if name == "*" or name.endswith(":*") or name.endswith(":allow-all"):
                bad.append(f"{f}: wildcard permission {name}")
    allow = (conf.get("tauri", {}) or {}).get("allowlist", {})  # v1
    if allow.get("all") is True:
        bad.append("tauri.allowlist.all = true")
    return bad


def check_shell_open(conf, app_dir: Path):
    bad = []
    for f, p in _all_permissions(app_dir):
        name = p if isinstance(p, str) else (p.get("identifier", "") if isinstance(p, dict) else "")
        if name in ("shell:default", "shell:allow-open"):
            bad.append(f"{f}: '{name}' enables opening arbitrary URLs/paths (scope it or drop it)")
        if name in ("shell:allow-execute", "shell:allow-spawn", "shell:allow-kill", "shell:allow-stdin-write") \
                and not (isinstance(p, dict) and p.get("allow")):
            bad.append(f"{f}: '{name}' without an allow-scope")
    sh = (conf.get("tauri", {}) or {}).get("allowlist", {}).get("shell", {})
    if sh.get("all") is True or sh.get("open") is True:
        bad.append("tauri.allowlist.shell.open enabled unscoped")
    if sh.get("execute") is True or sh.get("sidecar") is True and not sh.get("scope"):
        bad.append("tauri.allowlist.shell.execute enabled unscoped")
    return bad


BROAD_SCOPE = re.compile(r"^(?:\*\*?|/\*\*|/|\$HOME/?\*\*|\$HOME/?\*?|~/?\*\*|[A-Za-z]:[\\/]?\*\*?|\$(?:DESKTOP|DOCUMENT|DOWNLOAD)/\*\*)$")


def check_fs_scope(conf, app_dir: Path):
    bad = []
    for f, p in _all_permissions(app_dir):
        if isinstance(p, dict) and str(p.get("identifier", "")).startswith(("fs:", "core:fs", "dialog:")):
            for k in ("allow", "deny"):
                for sc in p.get(k, []) if k == "allow" else []:
                    path = sc.get("path", "") if isinstance(sc, dict) else str(sc)
                    if BROAD_SCOPE.match(path):
                        bad.append(f"{f}: fs scope too broad: {path}")
        name = p if isinstance(p, str) else ""
        if name in ("fs:allow-write-file", "fs:allow-remove", "fs:allow-write-text-file", "fs:allow-rename"):
            bad.append(f"{f}: '{name}' bare (no scope) - grant with explicit path scope")
    fs = (conf.get("tauri", {}) or {}).get("allowlist", {}).get("fs", {})
    if fs.get("all") is True:
        bad.append("tauri.allowlist.fs.all = true")
    for path in (fs.get("scope") if isinstance(fs.get("scope"), list) else (fs.get("scope") or {}).get("allow", [])):
        if BROAD_SCOPE.match(str(path)):
            bad.append(f"fs scope too broad: {path}")
    asset = (conf.get("app", {}) or {}).get("security", {}).get("assetProtocol", {})
    for path in (asset.get("scope") or []) if asset.get("enable") else []:
        if BROAD_SCOPE.match(str(path)):
            bad.append(f"assetProtocol scope too broad: {path}")
    return bad


def check_devtools_off(conf, app_dir: Path):
    bad = []
    def walk(o, trail=""):
        if isinstance(o, dict):
            for k, v in o.items():
                if k.lower() == "devtools" and v is True:
                    bad.append(f"tauri.conf.json {trail}{k} = true")
                walk(v, f"{trail}{k}.")
        elif isinstance(o, list):
            for i, v in enumerate(o):
                walk(v, f"{trail}{i}.")
    walk(conf)
    cargo = app_dir / "Cargo.toml"
    if cargo.is_file():
        for i, line in enumerate(cargo.read_text().splitlines(), 1):
            if re.match(r"\s*tauri\s*=", line) and "devtools" in line:
                bad.append(f"Cargo.toml:{i} tauri crate enables 'devtools' feature (ships devtools in release)")
            if re.match(r'\s*default\s*=\s*\[.*"devtools"', line):
                bad.append(f"Cargo.toml:{i} devtools in default features")
    return bad


def check_updater(conf, app_dir: Path):
    bad = []
    up = (conf.get("plugins", {}) or {}).get("updater")
    if up:
        for ep in up.get("endpoints", []):
            if not LOCAL_HOST_RE.match(ep):
                bad.append(f"plugins.updater endpoint is remote: {ep}")
    v1 = (conf.get("tauri", {}) or {}).get("updater", {})
    if v1.get("active"):
        for ep in v1.get("endpoints", []):
            if not LOCAL_HOST_RE.match(ep):
                bad.append(f"tauri.updater endpoint is remote: {ep}")
    if (conf.get("bundle", {}) or {}).get("createUpdaterArtifacts"):
        bad.append("bundle.createUpdaterArtifacts enabled (updater should be disabled on air-gapped product)")
    cargo = app_dir / "Cargo.toml"
    if cargo.is_file() and "tauri-plugin-updater" in cargo.read_text() and not up:
        bad.append("Cargo.toml depends on tauri-plugin-updater but no local endpoint is configured")
    return bad
