"""Dependency vulnerability audit: pip-audit (requirements*.txt) and npm audit (desktop/).

pip-audit publishes no severity, so every advisory is treated as High (fails). npm audit severities are
respected: critical/high fail, moderate/low/info are reported as warnings.
Needs network access to the PyPI / npm advisory services (developer/CI machines only, never the air-gapped app).
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

from sec_helpers import SKIP_DIRS, is_allowlisted, list_files, report_warnings

pytestmark = pytest.mark.security


def _requirements(root: Path):
    return [r for r in list_files(root)
            if Path(r).name.startswith("requirements") and r.endswith(".txt")
            and not is_allowlisted(r, include_self=False) and not (set(r.split("/")[:-1]) & SKIP_DIRS)]


def _pip_audit_cmd():
    exe = shutil.which("pip-audit") or str(Path(sys.executable).with_name("pip-audit"))
    return [exe] if Path(exe).exists() else [sys.executable, "-m", "pip_audit"]


def test_pip_audit_requirements(scan_root):
    files = _requirements(scan_root)
    if not files:
        pytest.skip("BLOCKED: no requirements*.txt found at scan root")
    failures = []
    for r in files:
        p = subprocess.run(_pip_audit_cmd() + ["-r", str(scan_root / r), "-f", "json", "--progress-spinner", "off"],
                           capture_output=True, text=True, timeout=600)
        try:
            data = json.loads(p.stdout)
        except json.JSONDecodeError:
            pytest.skip(f"BLOCKED: pip-audit could not run for {r} (network/index unreachable?): {(p.stderr or p.stdout)[-200:]}")
        for dep in data.get("dependencies", []):
            for v in dep.get("vulns", []):
                failures.append(f"{r}: {dep['name']} {dep.get('version')} - {v['id']} (fix: {', '.join(v.get('fix_versions', [])) or 'n/a'})")
    assert not failures, "vulnerable Python dependencies:\n" + "\n".join(failures)


def test_npm_audit_desktop(scan_root):
    d = scan_root / "desktop"
    if not (d / "package-lock.json").is_file():
        pytest.skip("BLOCKED: desktop/package-lock.json missing")
    if not shutil.which("npm"):
        pytest.skip("BLOCKED: npm not installed")
    p = subprocess.run(["npm", "audit", "--omit=dev", "--json"], cwd=d, capture_output=True, text=True, timeout=300)
    try:
        data = json.loads(p.stdout)
    except json.JSONDecodeError:
        pytest.skip(f"BLOCKED: npm audit produced no JSON: {p.stderr[-200:]}")
    if "error" in data:
        pytest.skip(f"BLOCKED: npm audit error: {data['error'].get('summary', data['error'])}")
    counts = data.get("metadata", {}).get("vulnerabilities", {})
    detail = [f"{n}: {v['severity']} - {v.get('range', '')}" for n, v in data.get("vulnerabilities", {}).items()]
    report_warnings([l for l in detail if not l.split(': ')[1].startswith(("critical", "high"))] + [f"counts={counts}"],
                    "npm audit (production deps) non-blocking findings + counts")
    bad = [l for l in detail if l.split(": ")[1].startswith(("critical", "high"))]
    assert not bad, "Critical/High npm vulnerabilities:\n" + "\n".join(bad)
