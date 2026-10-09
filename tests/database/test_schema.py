"""MySQL schema checks for the Day 1 database requirement (database pqc_security)."""
import re
import uuid

import pymysql
import pytest

from dbenv import blocked

TABLES = ["organizations", "users", "projects", "scans", "scan_files", "findings"]
REQUIRED_COLS = {
    "organizations": {"id", "name"},
    "users": {"id", "organization_id", "email", "password_hash", "role"},
    "projects": {"id", "organization_id", "name"},
    "scans": {"id", "project_id", "status", "created_at"},
    "scan_files": {"id", "scan_id", "file_path"},
    "findings": {"id", "scan_id", "engine", "category", "severity", "title", "file_path",
                 "line_number", "evidence", "confidence", "recommendation"},
}
STATUSES = {"QUEUED", "INGESTING", "ANALYZING", "PROCESSING", "AI_ANALYSIS",
            "COMPLETED", "FAILED", "CANCELLED"}
FKS = [("scans", "project_id", "projects"), ("findings", "scan_id", "scans"),
       ("scan_files", "scan_id", "scans"), ("users", "organization_id", "organizations"),
       ("projects", "organization_id", "organizations")]


def uid():
    return str(uuid.uuid4())


@pytest.fixture()
def cols(q):
    def get(t):
        return {r["COLUMN_NAME"]: r for r in q(
            "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s", (t,))}
    return get


def test_database_name(q):
    assert q("SELECT DATABASE() d")[0]["d"] == "pqc_security"


def test_database_charset_utf8mb4(q):
    r = q("SELECT DEFAULT_CHARACTER_SET_NAME c FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=DATABASE()")
    assert r[0]["c"] == "utf8mb4"


@pytest.mark.parametrize("t", TABLES)
def test_table_exists_and_utf8mb4(q, t):
    r = q("SELECT TABLE_COLLATION c, ENGINE e FROM information_schema.TABLES "
          "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s", (t,))
    assert r, f"table {t} missing"
    assert r[0]["c"].startswith("utf8mb4"), r[0]
    assert r[0]["e"] == "InnoDB"


@pytest.mark.parametrize("t", TABLES)
def test_required_columns(cols, t):
    missing = REQUIRED_COLS[t] - set(cols(t))
    assert not missing, f"{t} missing columns {missing}"


@pytest.mark.parametrize("t", TABLES)
def test_primary_key_is_id(q, t):
    r = q("SELECT COLUMN_NAME c FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() "
          "AND TABLE_NAME=%s AND CONSTRAINT_NAME='PRIMARY'", (t,))
    assert [x["c"] for x in r] == ["id"]


@pytest.mark.parametrize("child,col,parent", FKS)
def test_foreign_key_declared(q, child, col, parent):
    r = q("SELECT 1 FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s "
          "AND COLUMN_NAME=%s AND REFERENCED_TABLE_NAME=%s", (child, col, parent))
    assert r, f"no FK {child}.{col} -> {parent}"


@pytest.mark.parametrize("child,col,parent", FKS)
def test_foreign_key_column_is_indexed(q, child, col, parent):
    r = q("SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s "
          "AND COLUMN_NAME=%s AND SEQ_IN_INDEX=1", (child, col))
    assert r, f"{child}.{col} has no index"


def test_fk_types_match(cols):
    """FK column types must equal the referenced PK types."""
    for child, col, parent in FKS:
        assert cols(child)[col]["COLUMN_TYPE"] == cols(parent)["id"]["COLUMN_TYPE"], (child, col)


def test_users_email_unique_constraint(q):
    r = q("SELECT NON_UNIQUE n FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() "
          "AND TABLE_NAME='users' AND COLUMN_NAME='email' AND SEQ_IN_INDEX=1")
    assert r and any(x["n"] == 0 for x in r), "no unique index on users.email"


def test_findings_has_query_indexes(q):
    idx = {r["COLUMN_NAME"] for r in q(
        "SELECT COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() "
        "AND TABLE_NAME='findings' AND SEQ_IN_INDEX=1")}
    assert {"scan_id", "severity"} <= idx


def test_scan_status_column_constrained_to_allowed_values(cols):
    col = cols("scans")["status"]
    ctype = col["COLUMN_TYPE"]
    assert ctype.lower().startswith("enum"), f"status is {ctype}, not ENUM"
    assert set(re.findall(r"'([A-Z_]+)'", ctype)) == STATUSES


def test_scan_status_default_is_queued(cols):
    assert cols("scans")["status"]["COLUMN_DEFAULT"] == "QUEUED"


def test_no_blob_columns_anywhere(q):
    r = q("SELECT TABLE_NAME t, COLUMN_NAME c, DATA_TYPE d FROM information_schema.COLUMNS "
          "WHERE TABLE_SCHEMA=DATABASE() AND DATA_TYPE IN ('blob','tinyblob','mediumblob','longblob','binary','varbinary')")
    assert not r, f"binary-capable columns could hold ZIPs: {r}"


# ---- behaviour: constraints actually enforced (all rows cleaned up) -----------------------

@pytest.fixture()
def org(run):
    oid = uid()
    run("INSERT INTO organizations (id,name) VALUES (%s,'QA-TMP')", (oid,))
    yield oid
    run("DELETE FROM organizations WHERE id=%s", (oid,))


@pytest.fixture()
def project(run, org):
    pid = uid()
    run("INSERT INTO projects (id,organization_id,name) VALUES (%s,%s,'QA-TMP-PROJ')", (pid, org))
    yield pid
    run("DELETE FROM projects WHERE id=%s", (pid,))


def _scan(run, pid, status="QUEUED"):
    sid = uid()
    run("INSERT INTO scans (id,project_id,status,repository_path) VALUES (%s,%s,%s,'uploads/qa.zip')", (sid, pid, status))
    return sid


def test_scan_rejects_orphan_project(run):
    with pytest.raises(pymysql.err.IntegrityError):
        _scan(run, uid())


def test_finding_rejects_orphan_scan(run):
    with pytest.raises(pymysql.err.IntegrityError):
        run("INSERT INTO findings (id,scan_id,engine,severity,title,file_path) VALUES (%s,%s,'sast','low','t','f')",
            (uid(), uid()))


def test_scan_file_rejects_orphan_scan(run):
    with pytest.raises(pymysql.err.IntegrityError):
        run("INSERT INTO scan_files (id,scan_id,file_path) VALUES (%s,%s,'a.py')", (uid(), uid()))


def test_user_rejects_orphan_org(run):
    with pytest.raises(pymysql.err.IntegrityError):
        run("INSERT INTO users (id,organization_id,email,password_hash) VALUES (%s,%s,%s,'x')",
            (uid(), uid(), f"{uid()}@qa.local"))


def test_project_rejects_orphan_org(run):
    with pytest.raises(pymysql.err.IntegrityError):
        run("INSERT INTO projects (id,organization_id,name) VALUES (%s,%s,'x')", (uid(), uid()))


def test_duplicate_email_rejected(run, org):
    email = f"{uid()}@qa.local"
    u1, u2 = uid(), uid()
    run("INSERT INTO users (id,organization_id,email,password_hash) VALUES (%s,%s,%s,'x')", (u1, org, email))
    try:
        with pytest.raises(pymysql.err.IntegrityError):
            run("INSERT INTO users (id,organization_id,email,password_hash) VALUES (%s,%s,%s,'x')", (u2, org, email))
    finally:
        run("DELETE FROM users WHERE id IN (%s,%s)", (u1, u2))


def test_bogus_scan_status_rejected(run, project):
    """Non-strict sql_mode would coerce 'BOGUS' to '' silently; either error or coercion is a defect."""
    sid = uid()
    try:
        with pytest.raises((pymysql.err.DataError, pymysql.err.IntegrityError, pymysql.err.OperationalError)):
            run("INSERT INTO scans (id,project_id,status,repository_path) VALUES (%s,%s,'BOGUS','x')", (sid, project))
    finally:
        run("DELETE FROM scans WHERE id=%s", (sid,))


@pytest.mark.parametrize("status", sorted(STATUSES))
def test_all_documented_statuses_accepted(run, project, q, status):
    sid = _scan(run, project, status)
    try:
        assert q("SELECT status s FROM scans WHERE id=%s", (sid,))[0]["s"] == status
    finally:
        run("DELETE FROM scans WHERE id=%s", (sid,))


def test_bogus_finding_severity_and_engine_rejected(run, project):
    sid = _scan(run, project)
    try:
        with pytest.raises((pymysql.err.DataError, pymysql.err.IntegrityError, pymysql.err.OperationalError)):
            run("INSERT INTO findings (id,scan_id,engine,severity,title,file_path) VALUES (%s,%s,'sast','BOGUS','t','f')",
                (uid(), sid))
    finally:
        run("DELETE FROM scans WHERE id=%s", (sid,))


def test_project_delete_cascades_to_scans_files_findings(run, q, org):
    pid = uid()
    run("INSERT INTO projects (id,organization_id,name) VALUES (%s,%s,'QA-CASCADE')", (pid, org))
    sid = _scan(run, pid)
    run("INSERT INTO scan_files (id,scan_id,file_path) VALUES (%s,%s,'a.py')", (uid(), sid))
    run("INSERT INTO findings (id,scan_id,engine,severity,title,file_path) VALUES (%s,%s,'crypto','low','t','a.py')",
        (uid(), sid))
    run("DELETE FROM projects WHERE id=%s", (pid,))
    for t in ("scans", "scan_files", "findings"):
        col = "id" if t == "scans" else "scan_id"
        assert q(f"SELECT COUNT(*) n FROM {t} WHERE {col}=%s", (sid,))[0]["n"] == 0, f"{t} orphaned after project delete"


def test_org_delete_sets_project_org_null(run, q):
    oid, pid = uid(), uid()
    run("INSERT INTO organizations (id,name) VALUES (%s,'QA-TMP2')", (oid,))
    run("INSERT INTO projects (id,organization_id,name) VALUES (%s,%s,'QA-P')", (pid, oid))
    try:
        run("DELETE FROM organizations WHERE id=%s", (oid,))
        assert q("SELECT organization_id o FROM projects WHERE id=%s", (pid,))[0]["o"] is None
    finally:
        run("DELETE FROM projects WHERE id=%s", (pid,))


def test_sql_mode_is_strict(q):
    assert "STRICT_TRANS_TABLES" in q("SELECT @@sql_mode m")[0]["m"]


def test_utf8mb4_roundtrip(run, q, org):
    pid = uid()
    run("INSERT INTO projects (id,organization_id,name) VALUES (%s,%s,%s)", (pid, org, "QA \U0001F510 量子"))
    try:
        assert q("SELECT name n FROM projects WHERE id=%s", (pid,))[0]["n"] == "QA \U0001F510 量子"
    finally:
        run("DELETE FROM projects WHERE id=%s", (pid,))


# ---- UUID id contract ------------------------------------------------------------------------

ID_COLUMNS = [("organizations", "id"), ("users", "id"), ("projects", "id"), ("scans", "id"),
              ("scan_files", "id"), ("findings", "id"), ("users", "organization_id"),
              ("projects", "organization_id"), ("scans", "project_id"), ("scan_files", "scan_id"),
              ("findings", "scan_id")]


@pytest.mark.parametrize("table,col", ID_COLUMNS)
def test_id_columns_are_36_char_strings(q, table, col):
    """Unified id standard: every id / FK column is a string wide enough for a UUID (36 chars), never an integer."""
    r = q("SELECT DATA_TYPE t, CHARACTER_MAXIMUM_LENGTH n FROM information_schema.columns "
          "WHERE table_schema=DATABASE() AND table_name=%s AND column_name=%s", (table, col))[0]
    assert r["t"] in ("char", "varchar"), f"{table}.{col} is {r['t']}, expected a string type"
    assert r["n"] >= 36, f"{table}.{col} is {r['t']}({r['n']}), too short for a UUID"


# ---- seed data -----------------------------------------------------------------------------

SEEDED_TABLES = ("organizations", "users", "projects", "scans", "findings")


def test_seed_data_present(q):
    """The documented dev seed must load completely on first boot (org, admin user, demo project, QUEUED scan, findings)."""
    counts = {t: q(f"SELECT COUNT(*) n FROM {t}")[0]["n"] for t in SEEDED_TABLES}
    empty = [t for t, n in counts.items() if n < 1]
    assert not empty, f"FINDING: seed did not load, empty tables {empty} (counts {counts}); check `docker logs` for a seed.sql error"
    assert q("SELECT COUNT(*) n FROM projects WHERE name='Demo Banking Application'")[0]["n"] >= 1
    assert q("SELECT COUNT(*) n FROM scans WHERE status='QUEUED'")[0]["n"] >= 1


def test_seed_users_are_clearly_dev_only(q):
    rows = q("SELECT email FROM users WHERE role='admin' AND email NOT LIKE 'qa-%%'")
    if not rows:
        blocked("no seeded admin user found (see test_seed_data_present)")
    for r in rows:
        assert r["email"].endswith((".local", ".test", ".example")), f"seed user {r['email']} looks like a real domain"


def test_seed_password_hash_is_real_hash(q):
    """The backend accepts Argon2id (default) or bcrypt. Placeholders fail both formats."""
    rx = re.compile(r"^(\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}"
                    r"|\$argon2id\$v=19\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]{16,}\$[A-Za-z0-9+/]{32,})$")
    rows = q("SELECT email,password_hash FROM users WHERE role='admin' AND email NOT LIKE 'qa-%%'")
    if not rows:
        blocked("no seeded admin user found (see test_seed_data_present)")
    bad = [(r["email"], r["password_hash"], len(r["password_hash"])) for r in rows if not rx.match(r["password_hash"])]
    assert not bad, f"seed password_hash is not a valid Argon2id or bcrypt hash: {bad}"


UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")


def test_seed_ids_are_uuid_format(q):
    """Schema ids default to UUID(); seed rows should follow the same standard in every table."""
    bad = []
    for t in SEEDED_TABLES:
        bad += [(t, r["id"]) for r in q(f"SELECT id FROM {t}") if not UUID_RE.match(r["id"])]
    if bad:
        pytest.xfail(f"FINDING: seed ids are not UUIDs ({bad[:6]}); mixed id formats in one table")


def test_only_one_default_organization(q):
    """Two identical 'Default Organization' rows (one with id '1') exist only to satisfy a hardcoded backend value."""
    rows = q("SELECT id FROM organizations WHERE name LIKE 'Default Organization%%'")
    if len(rows) > 1:
        pytest.xfail(f"FINDING: duplicate default organizations {[r['id'] for r in rows]}; "
                     "the backend should reference one org, not a compatibility copy")
