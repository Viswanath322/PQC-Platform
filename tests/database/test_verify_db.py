"""Runs the database owner's own verify_db.py against the live MySQL and checks it passes and cleans up.

The script is looked up under PQC_SCAN_ROOT (default: repo root) at database/verify_db.py; Blocked if absent.
"""
import os
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse

import pytest

from dbenv import MYSQL_URL, REPO_ROOT, blocked

ROOT = Path(os.getenv("PQC_SCAN_ROOT", REPO_ROOT))
SCRIPT = ROOT / "database" / "verify_db.py"
# child first, so deletes never violate FKs
TABLES = ["findings", "scan_files", "scans", "projects", "users", "organizations"]


def _sqlalchemy_url():
    u = urlparse(MYSQL_URL)
    return MYSQL_URL.replace(f"{u.scheme}://", "mysql+pymysql://", 1)


def _ids(q):
    return {t: {r["id"] for r in q(f"SELECT id FROM {t}")} for t in TABLES}


def test_verify_db_script_passes_and_leaves_no_rows(q, run):
    if not SCRIPT.exists():
        blocked(f"{SCRIPT} not found")
    before = _ids(q)
    env = dict(os.environ, DATABASE_URL=_sqlalchemy_url())
    proc = subprocess.run([sys.executable, str(SCRIPT)], cwd=SCRIPT.parent.parent, env=env,
                          capture_output=True, text=True, timeout=120)
    after = _ids(q)
    leftovers = {t: after[t] - before[t] for t in TABLES if after[t] - before[t]}
    try:
        out = proc.stdout + proc.stderr
        why = next((ln for ln in out.splitlines() if "[FAIL]" in ln or "Error" in ln), out.strip()[-200:])
        assert proc.returncode == 0, f"FINDING: verify_db.py failed on the freshly seeded database (exit {proc.returncode}): {why[:300]}"
        target = re.search(r"Target Database: (\S+) on (\S+)", proc.stdout)
        assert target and "sqlite" not in proc.stdout.lower(), "script fell back to SQLite instead of testing MySQL"
        assert target.group(2) == urlparse(MYSQL_URL).hostname, f"script tested {target.group(2)}, not the MySQL under test"
        assert not leftovers, ("FINDING: verify_db.py leaves rows behind in the live database: "
                               f"{ {t: len(v) for t, v in leftovers.items()} }")
    finally:
        for t in TABLES:                       # tidy up whatever the script created
            for i in leftovers.get(t, ()):
                run(f"DELETE FROM {t} WHERE id=%s", (i,))
