"""Desktop UI smoke tests over PQC_SCAN_ROOT/desktop: npm ci / build / lint + Day 1 structure checks.

`npm ci` and `npm run build` write node_modules/ and dist/ inside desktop/ (must be gitignored).
Set PQC_SKIP_NPM=1 to skip the (slow) npm steps and only run the static structure checks.
"""
import os
import re
import shutil
import subprocess
from pathlib import Path

import pytest

DAY1_PAGES = ["Dashboard", "Projects", "Scans", "Findings", "PQC", "Reports"]
# strings inside third-party libraries that are only printed in warnings / comments, never fetched
INERT_LIB_URLS = ("https://react.dev/errors", "https://reactjs.org/docs/error", "https://reactrouter.com/", "https://github.com/ungap/")
FETCH_RE = re.compile(r"\b(?:fetch|axios(?:\.\w+)?|XMLHttpRequest)\b\s*\(?")


def blocked(reason):
    pytest.skip(f"BLOCKED: {reason}")


@pytest.fixture(scope="module")
def desktop(scan_root) -> Path:
    d = scan_root / "desktop"
    if not (d / "package.json").is_file():
        blocked("desktop/package.json missing at scan root")
    return d


def _run(cmd, cwd, timeout=900):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)


def _need_npm():
    if os.getenv("PQC_SKIP_NPM"):
        blocked("PQC_SKIP_NPM set")
    if not shutil.which("npm"):
        blocked("npm not installed")


@pytest.fixture(scope="module")
def installed(desktop):
    _need_npm()
    if not (desktop / "package-lock.json").is_file():
        blocked("desktop/package-lock.json missing (npm ci impossible)")
    p = _run(["npm", "ci", "--no-audit", "--no-fund"], desktop)
    assert p.returncode == 0, f"npm ci failed:\n{(p.stdout + p.stderr)[-1500:]}"
    return desktop


def test_npm_ci(installed):
    assert (installed / "node_modules").is_dir()


def test_npm_run_build(installed):
    p = _run(["npm", "run", "build"], installed)
    assert p.returncode == 0, f"npm run build failed:\n{(p.stdout + p.stderr)[-2500:]}"
    assert (installed / "dist" / "index.html").is_file()


def test_npm_run_lint(installed):
    import json
    scripts = json.loads((installed / "package.json").read_text()).get("scripts", {})
    if "lint" not in scripts:
        blocked("no 'lint' script in desktop/package.json")
    p = _run(["npm", "run", "lint"], installed)
    assert p.returncode == 0, f"npm run lint failed:\n{(p.stdout + p.stderr)[-2500:]}"


def _src_files(desktop):
    return [p for p in (desktop / "src").rglob("*") if p.suffix in (".ts", ".tsx", ".js", ".jsx")]


def test_day1_pages_exist(desktop):
    names = {p.stem.lower() for p in (desktop / "src").rglob("*") if p.suffix in (".tsx", ".jsx", ".ts", ".js")}
    dirs = {p.name.lower() for p in (desktop / "src").rglob("*") if p.is_dir()}
    missing = [pg for pg in DAY1_PAGES if pg.lower() not in names and pg.lower() not in dirs]
    found = [pg for pg in DAY1_PAGES if pg not in missing]
    assert not missing, f"Day 1 pages missing: {missing} (found: {found}; pages/ has: {sorted(p.name for p in (desktop/'src/pages').glob('*'))})"


def test_http_calls_centralised_in_services_api(desktop):
    api = desktop / "src" / "services" / "api.ts"
    assert api.is_file(), "desktop/src/services/api.ts missing (no central API client)"
    stray = []
    for p in _src_files(desktop):
        if p == api:
            continue
        for i, line in enumerate(p.read_text(errors="replace").splitlines(), 1):
            if FETCH_RE.search(line) and not line.strip().startswith(("//", "*")):
                stray.append(f"{p.relative_to(desktop)}:{i} {line.strip()[:90]}")
    assert not stray, "HTTP calls outside services/api.ts:\n" + "\n".join(stray)


def test_mock_data_is_labelled(desktop):
    badge = list((desktop / "src").rglob("MockDataBadge.*"))
    assert badge, "no MockDataBadge component"
    unlabelled = []
    for p in _src_files(desktop):
        t = p.read_text(errors="replace")
        if re.search(r"from\s+['\"][./]*(?:data/)?\w*[mM]ock\w*['\"]|from\s+['\"].*data/.*['\"]", t) and "MockDataBadge" not in t \
                and p.suffix == ".tsx":
            unlabelled.append(str(p.relative_to(desktop)))
    assert not unlabelled, f"components import mock data without a MockDataBadge: {unlabelled}"


def test_backend_health_indicator(desktop):
    hits = [str(p.relative_to(desktop)) for p in _src_files(desktop) if "/api/v1/health" in p.read_text(errors="replace")]
    assert hits, "no code calls /api/v1/health (no Backend Status indicator)"


def test_built_dist_has_no_external_urls(installed):
    """Air-gap check of the production bundle (index.html, CSS, JS)."""
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "security"))
    from sec_helpers import find_external_urls, MOCK_PATH_RE  # noqa
    dist = installed / "dist"
    if not dist.is_dir():
        blocked("dist/ not built (run test_npm_run_build first)")
    # inert strings: React's production error-decoder link, and URLs that only appear as mock display data
    mock_urls = set()
    for p in (installed / "src").rglob("*"):
        if p.is_file() and MOCK_PATH_RE.search(p.name + "/" + str(p.parent.name)) and p.suffix in (".ts", ".tsx", ".json"):
            mock_urls |= {u for _, u, _ in find_external_urls(p.read_text(errors="replace"))}
    hits, info = [], []
    for p in dist.rglob("*"):
        if p.suffix in (".html", ".css", ".js", ".mjs", ".json", ".svg"):
            for ln, u, line in find_external_urls(p.read_text(errors="replace")):
                entry = f"{p.relative_to(dist)}:{ln} {u[:100]}"
                (info if (u in mock_urls or u.startswith(INERT_LIB_URLS)) else hits).append(entry)
    print("INFO inert URLs in bundle (React error decoder / mock display data):", sorted(set(info)))
    assert not hits, "external URLs in built bundle (loaded at runtime):\n" + "\n".join(sorted(set(hits))[:40])
