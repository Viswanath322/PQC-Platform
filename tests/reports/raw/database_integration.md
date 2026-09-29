# Database and Cross-Branch Integration - Raw Results

Tester: Pushpam (QA) - branch `qa/pushpam` - 2026-09-29
Branches under test: Vamsi `45b70ac` (DB/compose), Aakash `192fa3b` (FastAPI backend). Nothing was fixed in teammate code.

## Environment notes
- The Compose plugin is not installed for the docker CLI; `docker-compose` (v5.3.1, standalone) was used instead of `docker compose`.
- Host port 6379 was already held by an unrelated container (`sahayak-backend-redis-1`), not stopped. Vamsi's Redis was therefore published on **6391** through an override file kept outside the repo (`ports: !override ["6391:6379"]`). Tests used `PQC_REDIS_URL=redis://127.0.0.1:6391/0`. MySQL used the default 3306.
- The compose file's port mapping is `6379:6379` (see DB-02); the override is a test-environment change only.

## Commands
```
cd .worktrees/vamsi
docker-compose -p qa-vamsi -f docker-compose.yml -f <scratch>/override.yml up -d
docker-compose -p qa-vamsi ... down -v ; ... up -d        # reproducible-from-scratch check (run twice)
docker logs pqc_mysql | grep -E "ERROR|initdb.d|init process done"
../../.venv/bin/python database/verify_db.py
cd ../..
PQC_REDIS_URL=redis://127.0.0.1:6391/0 PQC_SCAN_ROOT=$PWD/.worktrees/vamsi .venv/bin/pytest tests/database -v -rs
cd .worktrees/aakash/backend
DATABASE_URL=mysql+pymysql://pqc:change_me_locally@127.0.0.1:3306/pqc_security UPLOAD_DIR=<tmp>/uploads \
  REDIS_URL=redis://127.0.0.1:6391/0 ../../../.venv/bin/uvicorn dev_main:app --host 127.0.0.1 --port 8002
PQC_API_URL=http://127.0.0.1:8002 PQC_REDIS_URL=redis://127.0.0.1:6391/0 .venv/bin/pytest tests/integration -v -rs
```
Cleanup: uvicorn killed, `down -v` run (containers and volumes removed), temp dirs removed, both worktrees `git status` clean.

## 1. Reproducible from scratch
`down -v` then `up -d`, twice. Both times MySQL became healthy and `docker logs pqc_mysql` shows `running 01_schema.sql`, `running 02_seed.sql`, `MySQL init process done`, with no `[ERROR]` lines. Only deprecation warnings appeared: `default_authentication_plugin` and `mysql_native_password` deprecated, root created with empty password during init. Result: **Pass**.

## 2. verify_db.py (Vamsi) - output summary
Connected to live MySQL; 6 tables verified; org, user, project "Demo Banking Application", scan `QUEUED`, retrieval and a finding all `[PASS]`; ended with `[SUCCESS] DAY 1 DATABASE DEFINITION OF DONE ACHIEVED!`. Exit 0.
Observations: the script never deletes its rows (org/user/project/scan/finding remain after each run, DB-07). It also calls `Base.metadata.create_all` against MySQL. It uses an obviously fake hash (`$2b$12$dummyhash...`) that the DB accepts.

## 3. pytest summary
| Suite | Result |
|---|---|
| tests/database (live MySQL 8.0.46 + Redis 7) | **63 passed, 6 failed, 2 xfailed** (71 tests) |
| tests/integration, no backend running | 1 passed, 9 skipped (all `BLOCKED: backend not reachable`) |
| tests/integration against Aakash backend on Vamsi MySQL (:8002) | **2 passed, 1 failed, 7 skipped** |

The 6 database failures are security or hardening findings, not schema defects. Every schema and constraint test passed.

### tests/database
| Test | Result | Note |
|---|---|---|
| test_database_name, test_database_charset_utf8mb4 | Pass | `pqc_security`, utf8mb4 |
| test_table_exists_and_utf8mb4 [x6] | Pass | all 6 tables present, InnoDB, utf8mb4_unicode_ci |
| test_required_columns [x6] | Pass | includes all 10 finding fields |
| test_primary_key_is_id [x6] | Pass | |
| test_foreign_key_declared [x5] | Pass | scans->projects, findings->scans, scan_files->scans, users/projects->organizations |
| test_foreign_key_column_is_indexed [x5], test_fk_types_match | Pass | |
| test_users_email_unique_constraint, test_duplicate_email_rejected | Pass | `uq_users_email` enforced |
| test_findings_has_query_indexes | Pass | |
| test_scan_status_column_constrained_to_allowed_values, default QUEUED | Pass | ENUM of the 8 statuses |
| test_bogus_scan_status_rejected, test_bogus_finding_severity_and_engine_rejected | Pass | 'BOGUS' rejected (strict sql_mode) |
| test_all_documented_statuses_accepted [x8] | Pass | |
| test_no_blob_columns_anywhere | Pass | no blob/binary/varbinary columns |
| test_scan/finding/scan_file/user/project rejects orphan [x5] | Pass | FK errors raised |
| test_project_delete_cascades_to_scans_files_findings | Pass | ON DELETE CASCADE all the way down |
| test_org_delete_sets_project_org_null | Pass | ON DELETE SET NULL |
| test_sql_mode_is_strict, test_utf8mb4_roundtrip | Pass | emoji and CJK round-trip |
| test_seed_data_present, test_seed_users_are_clearly_dev_only | Pass | admin@pqc.local, Demo Banking Application, scan QUEUED |
| test_seed_password_hash_is_real_bcrypt | Pass (format only) | 60 chars, `$2b$12$` + 53 valid chars. The seed.sql comment calls it a "placeholder", so I could not confirm it matches `admin123` (no bcrypt lib installed) |
| test_seed_ids_are_uuid_format | XFail | seed ids are `org-default-001` style, not UUIDs (DB-08) |
| test_redis.py::test_ping, test_set_get_roundtrip | Pass | |
| test_redis.py::test_redis_requires_authentication | **Fail** | DB-01 |
| test_compose_config::test_has_mysql_and_redis, test_no_latest_tag | Pass | |
| test_ports_bound_to_loopback_only | **Fail** | DB-02 |
| test_images_pinned_to_patch_or_digest | **Fail** | DB-03 |
| test_redis_has_password_configured | **Fail** | DB-01 |
| test_services_have_restart_and_healthcheck | **Fail** | DB-05 |
| test_mysql_root_password_not_same_as_app_password | **Fail** | DB-04 |
| test_no_hardcoded_passwords | XFail | dev-only acceptable, recorded in DB-04 |

DB test data cleanup verified: after the run the tables held only the seed rows (1 org, 1 user, 1 scan).

### tests/integration/test_day1_flow.py (Aakash backend on Vamsi MySQL)
| Test | Result | Note |
|---|---|---|
| test_01_health | Blocked | no /health endpoint in OpenAPI (INT-04) |
| test_02_auth | Blocked | no register/login endpoints |
| test_03_create_project | **Fail** | HTTP 500, FK error (INT-01) |
| test_04_upload_zip | Pass | 201, ZIP stored on disk in UPLOAD_DIR |
| test_05_create_scan_queued | Blocked | project could not be created |
| test_06_get_scan, 07_scan_row_in_mysql, 08_zip_not_stored_in_db, 09_cancel_scan | Blocked | no scan |
| test_99_cleanup | Pass | |

Day 1 end-to-end flow (project -> scan QUEUED -> row in MySQL) does **not** work across the two branches.

## Cross-branch evidence
Startup: `dev_main.py` calls `Base.metadata.create_all()`. Vamsi's tables already existed, so SQLAlchemy skipped them (checkfirst) and startup logged no error. The mismatch stays hidden until the first request.
- Aakash `Project.id = Integer autoincrement`, `organization_id = Integer default 1`, `Scan.project_id = Integer FK`, `Scan.status = String(20)`. Vamsi: all ids `VARCHAR(36)` UUID, `organization_id VARCHAR(36)` FK to organizations, `status ENUM`.
- `POST /api/v1/projects {"name":"Demo Banking Application"}` -> 500. Server log:
  `sqlalchemy.exc.IntegrityError: (1452, 'Cannot add or update a child row: a foreign key constraint fails (pqc_security.projects, CONSTRAINT fk_projects_organization FOREIGN KEY (organization_id) REFERENCES organizations (id) ...)') [parameters: {'organization_id': 1, 'name': 'Demo Banking Application', ...}]`
  The backend hardcodes organization 1, but the only org is `org-default-001`.
- `GET /api/v1/projects` -> 500: `ResponseValidationError ... ('response', 0, 'id') 'Input should be a valid integer' input 'prj-demo-banking-001'`. Same for `GET /api/v1/scans` (project_id is int in the schema).
- `GET /api/v1/projects/prj-demo-banking-001` -> 422 `int_parsing`. `POST /api/v1/scans` with `project_id:"prj-demo-banking-001"` -> 422; with `project_id:1` -> 404 "Project not found".
- `GET /api/v1/redis/ping` -> 200 `{"redis":"ok","queue_length":0}` (Redis integration works via `REDIS_URL`).
- Upload path works (ZIP saved to disk, `.zip` and magic check enforced, "not a valid ZIP" for empty file).

## Defects / Findings
| ID | Severity | Title | Evidence | Expected vs Actual | Suggested fix | Owner |
|---|---|---|---|---|---|---|
| INT-01 | Critical | Backend and DB schemas incompatible: Day 1 flow fails at "create project" | 500 with FK error 1452 above; `GET /projects` and `/scans` 500 with ResponseValidationError; int vs VARCHAR(36) ids in `app/models/scan.py`, `app/schemas/*.py`, route params | Expected: create project, scan QUEUED, row in MySQL. Actual: cannot create any project, cannot list seeded data | Agree one contract now. Recommended: Aakash switches models and schemas to `String(36)` UUID ids, uses `ScanStatus` values matching the ENUM, stops hardcoding `organization_id=1` (use the seeded org or NULL), and removes `create_all` in favour of the schema.sql / Vamsi models (or imports `database/models.py`) | Aakash (with Vamsi) |
| INT-02 | High | `create_all` masks the mismatch | Startup logs nothing while tables differ; errors only at request time | Expected: fail fast or a startup schema check. Actual: silent skip | Remove `create_all` when DATABASE_URL is MySQL; add a startup check against expected columns or Alembic | Aakash |
| INT-03 | Medium | Scan `status` is free-text `String(20)` in the backend model | `models/scan.py` | Expected: constrained to the 8 statuses. Actual: only DB ENUM would protect it, and only if the schema were Vamsi's | Use an Enum in Python matching the DB | Aakash |
| INT-04 | Medium | No health endpoint, no auth endpoints | OpenAPI lists only projects, uploads, scans, redis/ping; tests 01/02 Blocked | Expected: /health for the demo flow and startup checks | Add `/health`; auth per plan | Aakash / Amrutha |
| INT-05 | Low | Aakash branch tracks generated and runtime files | `git ls-files` includes `backend/dev.db`, `backend/storage/uploads/*.zip`, `__pycache__/*.cpython-314.pyc` | Expected: ignored via .gitignore; uploaded ZIPs are user data | `git rm --cached`, add to .gitignore | Aakash |
| INT-06 | Low | Cancel is not race-safe and skips a state machine | `cancel_scan` sets CANCELLED from any non-final status without a transition check or worker signal (code review only, not exercised because flow blocked) | Expected: defined transitions | Add a transition table | Aakash |
| DB-01 | High | Redis has no authentication | `PING` succeeds unauthenticated on the published port; `CONFIG GET requirepass` returns empty; compose has no `command: --requirepass` | Expected: password or ACL required. Actual: open | Add `--requirepass ${REDIS_PASSWORD}` and use it in `REDIS_URL`; bind to loopback (DB-02) | Vamsi |
| DB-02 | High | MySQL and Redis published on all interfaces | `docker ps`: `0.0.0.0:3306->3306`, `0.0.0.0:6379->6379` (compose uses `"3306:3306"`, `"6379:6379"`) | Expected for an air-gapped desktop app: `127.0.0.1:3306:3306`, `127.0.0.1:6379:6379`. Actual: reachable from the LAN | Prefix ports with `127.0.0.1:` | Vamsi |
| DB-03 | Low | Images not pinned to a patch version or digest | `mysql:8.0`, `redis:7-alpine` (resolved to MySQL 8.0.46) | Expected: exact tag or digest for reproducible air-gapped builds | Pin e.g. `mysql:8.0.46`, digest | Vamsi |
| DB-04 | Medium | Hardcoded credentials, root and app password identical, password on healthcheck command line | compose: `MYSQL_ROOT_PASSWORD: change_me_locally` = `MYSQL_PASSWORD`; healthcheck `-pchange_me_locally` | Dev-only default is tolerable for Day 1 but must not ship; root must differ | Use `.env` (not committed) with `${VAR}` and a `.env.example`; separate root password; healthcheck via `MYSQL_PWD` | Vamsi |
| DB-05 | Low | Redis service has no healthcheck | compose redis block | Expected: healthcheck (`redis-cli ping`) so dependants can wait | Add healthcheck | Vamsi |
| DB-06 | Low | Compose uses deprecated options | logs: `default_authentication_plugin` and `mysql_native_password` deprecated; `version: '3.8'` obsolete | Use caching_sha2_password (pymysql needs `cryptography`) or accept | Review | Vamsi |
| DB-07 | Low | `verify_db.py` leaves test rows behind and writes to the live DB | After the run: extra org, user, project, scan, finding (2 orgs / 2 scans counted) | Expected: clean up or use a transaction rollback | Delete created rows in `finally` | Vamsi |
| DB-08 | Low | Seed ids are not UUIDs and seed hash is documented as a placeholder | `org-default-001`, `usr-admin-001`; seed.sql comment "bcrypt hash placeholder". Hash passes the bcrypt format check but its match to `admin123` is unverified | Expected: UUIDs like all other rows; a verified hash, or no default admin in non-dev builds | Generate real bcrypt for the documented password; mark the seed dev-only (email is `.local`, acceptable) | Vamsi |

Positive results: schema meets all Day 1 requirements (6 tables, PK/FK, indexes on every FK, unique email, ENUM status with the 8 values, no binary columns, utf8mb4, strict sql_mode, cascade on project delete).

## Files added
`tests/database/{conftest,dbenv,test_schema,test_redis,test_compose_config}.py`, `tests/integration/test_day1_flow.py`, this report.
