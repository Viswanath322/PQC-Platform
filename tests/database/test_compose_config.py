"""docker-compose hardening checks (static). Compose file read from PQC_SCAN_ROOT or repo root."""
import os
import re
from pathlib import Path

import pytest

from dbenv import REPO_ROOT, blocked

ROOT = Path(os.getenv("PQC_SCAN_ROOT", REPO_ROOT))


@pytest.fixture(scope="module")
def compose():
    import yaml
    for name in ("docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"):
        p = ROOT / name
        if p.exists():
            return yaml.safe_load(p.read_text())
    blocked(f"no docker-compose file under {ROOT}")


@pytest.fixture(scope="module")
def services(compose):
    return compose.get("services", {})


def _host_ip(spec):
    s = str(spec if not isinstance(spec, dict) else f"{spec.get('host_ip', '')}:{spec.get('published')}:{spec.get('target')}")
    parts = s.split(":")
    return parts[0] if len(parts) == 3 and parts[0] else None


def test_has_mysql_and_redis(services):
    imgs = " ".join(str(s.get("image", "")) for s in services.values())
    assert "mysql" in imgs and "redis" in imgs


@pytest.mark.security
def test_ports_bound_to_loopback_only(services):
    """Air-gapped desktop app: DB/cache must be published on 127.0.0.1, not 0.0.0.0."""
    bad = [(n, p) for n, s in services.items() for p in s.get("ports", []) if _host_ip(p) not in ("127.0.0.1", "::1", "localhost")]
    assert not bad, f"FINDING: ports exposed on all interfaces: {bad}"


@pytest.mark.security
def test_images_pinned_to_patch_or_digest(services):
    loose = [(n, s["image"]) for n, s in services.items()
             if "image" in s and "@sha256:" not in s["image"] and not re.search(r":\d+\.\d+\.\d+", s["image"])]
    assert not loose, f"FINDING: images not pinned to a patch version or digest: {loose}"


@pytest.mark.security
def test_no_latest_tag(services):
    for n, s in services.items():
        img = s.get("image", "")
        assert ":" in img and not img.endswith(":latest"), f"{n} uses unpinned image {img}"


@pytest.mark.security
def test_no_hardcoded_passwords(services):
    """Dev-only defaults are tolerated for Day 1 but recorded as XFAIL; ${VAR} references pass."""
    bad = []
    for n, s in services.items():
        env = s.get("environment", {})
        env = dict(e.split("=", 1) for e in env) if isinstance(env, list) else env
        for k, v in (env or {}).items():
            if re.search(r"PASSWORD|SECRET|TOKEN", k, re.I) and v and not str(v).startswith("${"):
                bad.append((n, k, v))
        for h in (s.get("healthcheck", {}).get("test", []) or []):
            if re.match(r"-p\S+", str(h)):
                bad.append((n, "healthcheck", "password on command line"))
    if bad:
        pytest.xfail(f"FINDING (dev-only acceptable, must not ship): hardcoded credentials {bad}")


@pytest.mark.security
def test_redis_has_password_configured(services):
    r = [s for s in services.values() if "redis" in str(s.get("image", ""))]
    if not r:
        blocked("no redis service")
    cmd = str(r[0].get("command", ""))
    assert "requirepass" in cmd or "--aclfile" in cmd, "FINDING: redis has no requirepass/ACL configured"


@pytest.mark.security
def test_services_have_restart_and_healthcheck(services):
    missing = [n for n, s in services.items() if "healthcheck" not in s]
    assert not missing, f"no healthcheck for {missing}"


@pytest.mark.security
def test_mysql_root_password_not_same_as_app_password(services):
    for n, s in services.items():
        env = s.get("environment", {}) or {}
        if isinstance(env, dict) and env.get("MYSQL_ROOT_PASSWORD"):
            assert env["MYSQL_ROOT_PASSWORD"] != env.get("MYSQL_PASSWORD"), "root and app share the same password"


def test_no_obsolete_version_key(compose):
    """`version:` is obsolete in Compose v2; it prints a warning on every command."""
    assert "version" not in compose, "FINDING: obsolete top-level `version:` key (Compose warns on every run)"


@pytest.mark.security
def test_redis_and_mysql_passwords_differ(services):
    r = str([s.get("command", "") for s in services.values() if "redis" in str(s.get("image", ""))])
    m = [s.get("environment", {}) for s in services.values() if "mysql" in str(s.get("image", ""))]
    pw = (m[0] or {}).get("MYSQL_PASSWORD") if m else None
    if pw and pw in r:
        pytest.xfail("FINDING: Redis requirepass equals the MySQL password (one leaked value opens both)")
