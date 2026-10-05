# Retest Day 3: Database and Cross-Branch Integration - Raw Results

Tester: Pushpam (QA + security) - 2026-10-01. Nothing in any teammate worktree was modified, committed or pushed. Test values only (random JWT secret, `example.com` addresses).

Branches under test (detached worktrees):
- Vamsi `c4df60c` (schema, seed, models, verify_db, compose, new `database/run_combined_flow.py`)
- aakash-port `239761f` (Aakash + Amrutha backend, built on foundation)
- aakash-scan `122c89b` (comparison only)
- foundation `d56a7c9`, Hima `e11e33d`, Harshitha `200cfdf`, Sathwik `fd856c3`

## Labels used in this report

Every finding carries exactly one label:
- **Branch bug**: defect in one branch's own code that will still be there after merging. Owner is the branch owner.
- **Integration risk**: only exists because two branches disagree on a shared contract (table or column, field, enum, endpoint, import path, duplicate file). Both owners named; the fix is a team agreement.
- **Waiting on merge**: not a bug, the piece is simply not delivered or not combined yet. Should be BLOCKED or XFAIL, not FAIL.

## Verdict

1. **The database is in good shape now.** Fresh `down -v` + `up -d` boots cleanly: seed loads, no container restart, both healthchecks green. `tests/database`: **84 passed, 2 xfailed, 0 failed, 0 skipped** (yesterday 74 / 6 failed / 2 skipped / 4 xfailed). `verify_db.py` passes twice in a row and leaves nothing behind. Vamsi's combined flow script also works, but only inside a merged tree (his own branch has no `app/` to import).
2. **aakash-port is a real step forward**: auth on every route, org scoping, 503 + `FAILED` when Redis is down, cancelled scans removed from the queue, status enum, `upload_id`. Foundation, Aakash, Hima, Sathwik and Vamsi merge without conflict once Harshitha is resolved.
3. **The full pipeline can run end to end on MySQL, but only with scratch glue in four places.** On a merged tree (aakash-port + Harshitha + Sathwik + Hima + Vamsi) I got: register -> login -> project -> ZIP upload -> scan QUEUED -> Redis -> (glue worker) -> ingestion -> SAST + crypto analysis -> 22 findings in MySQL -> scan COMPLETED. The last hop (GET findings through Sathwik's API) only worked after I replaced Harshitha's `finding_service.py` with Sathwik's. First hop that breaks: **nobody consumes the Redis queue** (INT-33). Harshitha's branch on its own does not even start (INT-30).
4. **Security gaps that survive the merge**: findings/reports endpoints are anonymous and not org-scoped (INT-34), and every self-registered user lands in the same default org, so org scoping protects nothing (INT-36).

## Environment

- Colima/Docker, `docker-compose` v5 standalone, project `qa-vamsi`, override file in scratch: MySQL `127.0.0.1:3306`, Redis `127.0.0.1:6391`. MySQL 8.0.36, Redis 7.2.4. Python 3.11 venv at repo root.
- Passwords now differ per service: app `change_me_locally`, root `root_change_me_locally`, Redis `redis_change_me_locally` (Redis URL `redis://:redis_change_me_locally@127.0.0.1:6391/0`).
- Uvicorn ports used: 8021 (aakash-port), 8022 (aakash-scan), 8023 (scratch merged tree). Ports 6379/5433 (sahayak), 3307, 6380, 8011-8019 untouched.
- Scratch glue (all deleted afterwards): override file, a `git clone` used only for merging, merged tree extracted with `git archive`, a Redis worker loop, a flow script, a copy of the integration test file that sends the bearer token.

## Commands

```
cd .worktrees/vamsi
docker-compose -p qa-vamsi -f docker-compose.yml -f <scratch>/override.yml down -v
docker-compose -p qa-vamsi -f docker-compose.yml -f <scratch>/override.yml up -d
docker logs pqc_mysql ; docker inspect -f '{{.RestartCount}} {{.State.Health.Status}}' pqc_mysql pqc_redis
PQC_REDIS_URL=redis://:redis_change_me_locally@127.0.0.1:6391/0 PQC_SCAN_ROOT=$PWD/.worktrees/vamsi \
  .venv/bin/pytest tests/database -v -rs -p no:cacheprovider
DATABASE_URL=mysql+pymysql://pqc:change_me_locally@127.0.0.1:3306/pqc_security .venv/bin/python database/verify_db.py   # twice
# aakash-port
cd .worktrees/aakash-port/backend && JWT_SECRET_KEY=<random> DATABASE_URL=... REDIS_URL=... UPLOAD_DIR=<scratch> \
  ../../../.venv/bin/uvicorn app.main:app --port 8021
# aakash-scan
cd .worktrees/aakash/backend && ... uvicorn dev_main:app --port 8022
PQC_API_URL=http://127.0.0.1:802x PQC_REDIS_URL=... .venv/bin/pytest tests/integration -v -rs -p no:cacheprovider
# merge checks (read only, in a scratch clone)
git merge-tree --write-tree --name-only <a> <b>    # pairwise, 13 pairs
git merge 200cfdf fd856c3 e11e33d c4df60c            # sequential on top of 239761f, in the scratch clone
```
Cleanup done: uvicorns killed, `docker-compose -p qa-vamsi down -v` (containers, volumes, network gone), scratch dir deleted, `git status --porcelain --ignored` empty in all eight worktrees (vamsi, aakash-port, aakash, foundation, hima, harshitha, sathwik, tests-pushpam).

## 1. Fresh database

- Init log: `running 01_schema.sql`, `running 02_seed.sql`, `MySQL init process done. Ready for start up.` No `ERROR 1406`. DB-09 is gone.
- `RestartCount` 0 for MySQL and Redis. Both `healthy`. Redis healthcheck exists now.
- Row counts after first boot: organizations 1, users 1, projects 1, scans 1 (QUEUED), findings 2, scan_files 0. Tables: findings, organizations, projects, scan_files, scans, users.
- Seed ids are real 36 character values (`00000000-0000-0000-0000-000000000001`, project `...0001-000000000001`, scan `a8098c1a-f86e-11da-bd1a-00112444be1e`), only `org-default-001` is not a UUID by design (the agreed standard).
- `findings` now has `explanation TEXT`, `confidence FLOAT`, `is_development TINYINT(1) NOT NULL DEFAULT 0`. Seed findings carry confidence 0.95 / 0.85 and `is_development=1`.
- Compose: `mysql:8.0.36`, `redis:7.2.4-alpine`, no `version:` key, no `--default-authentication-plugin`, Redis `--requirepass redis_change_me_locally`, ports bound to 127.0.0.1. MySQL healthcheck still has `-p<password>` on the command line and so does the Redis one (`-a`).
- `tests/database`: 84 passed, 2 xfailed. The xfails are `test_no_hardcoded_passwords` (password in the MySQL healthcheck) and `test_seed_ids_are_uuid_format` (`org-default-001`).
- `verify_db.py` run 1 and run 2: both `[SUCCESS]`, exit 0. Row counts before and after both runs: 1 / 1 / 1 / 1 / 2. Idempotent, no leftovers.
- `database/run_combined_flow.py` on Vamsi's branch alone: `ModuleNotFoundError: No module named 'app.core.config'` (the branch only has `backend/app/core/database.py` and `models/__init__.py`). Waiting on merge. Inside the merged tree it passes: register 201, login 200, project 201, upload 201, scan 201 QUEUED, id found in Redis queue, `SELECT * FROM scans` row shown, `Database used: MYSQL (8.0.36)`. It leaves its test user, project, scan and ZIP behind (DB-15).

## 2. Retest table (old IDs)

| ID | Status | Label | Evidence |
|---|---|---|---|
| DB-03 images not pinned | **Fixed** | Branch bug | `mysql:8.0.36`, `redis:7.2.4-alpine`. Patch-pinned, not digest-pinned (acceptable). Test passes. |
| DB-04 hardcoded creds, root = app password | **Partly fixed** | Branch bug | Three different passwords now (checked in `docker inspect` env). But compose still falls back to those placeholders via `${VAR:-change_me_locally}`, there is no root-level `.env.example`, and the MySQL healthcheck still shows `-pchange_me_locally` (`docker inspect` Healthcheck.Test). xfail test is the same finding. |
| DB-05 no Redis healthcheck | **Fixed** | Branch bug | `docker inspect pqc_redis` health `healthy`; check is `redis-cli -a ... ping`. |
| DB-06 deprecated options | **Fixed** | Branch bug | No `version:` key, no `default_authentication_plugin` in compose, 0 matching lines in the MySQL log. |
| DB-07 verify_db leaves rows | **Fixed** | Branch bug | Counts 1/1/1/1/2 before and after two runs; `finally` block deletes in reverse FK order. |
| DB-08 seed ids not UUIDs, placeholder hash | **Partly fixed** | Branch bug | All user/project/scan/finding ids are 36 character UUID-shaped; org id `org-default-001` kept on purpose. Hash is still a bcrypt string nobody can use (see INT-08). |
| DB-09 seed aborts on first boot | **Fixed** | Branch bug | See section 1. |
| DB-10 verify_db fails on repo schema+seed | **Fixed** | Branch bug | Exit 0 twice, `Ensuring Seed Organization exists` is get-or-create. Residual: it still falls back silently to in-memory SQLite when MySQL is down and has a hardcoded credential URL (DB-17). |
| DB-11 duplicate default org | **Fixed** | Branch bug | `SELECT id,name FROM organizations` returns one row. |
| DB-12 `.gitignore` hides source dirs | **Fixed** | Branch bug | `git ls-tree -r origin/PQC-frontend \| git check-ignore --no-index --stdin -v` prints nothing; same on `origin/frontend/findings-explorer`. Entries are anchored now (`/build/`, `/dist/`, `/var/`, `/uploads/`, `/storage/`); `lib/` is gone. |
| DB-13 ORM cascades disagree with SQL | **Fixed** | Branch bug | `Organization.users/projects` no longer have `delete-orphan`; only Scan->files/findings and Project->scans cascade, matching `ON DELETE CASCADE`. `Project.organization_id` still defaults to the literal `org-default-001` (`database/models.py:72`), harmless but still hardcoded. |
| DB-14 one password everywhere, on command lines | **Partly fixed** | Branch bug | Redis password is now separate from MySQL. Still visible in `docker inspect pqc_redis` (`redis-server --requirepass redis_change_me_locally`) and in both healthchecks. |
| INT-07 login rejects seeded admin email domain | **Fixed** | Integration risk (Amrutha + Vamsi) | aakash-port `schemas/auth.py:9-33` allows `.local` in development; `admin@pqc.local` login returns 401 for a wrong password instead of 422. The seed also moved to `admin@pqc.example`. |
| INT-08 login 500 on bcrypt seed hash | **Partly fixed** | Integration risk (Vamsi seed vs Amrutha hasher) | No more 500: `core/security.py:16-21` catches `UnknownHashError` and returns False, so `admin@pqc.example` gives 401. But the seed hash `$2b$12$...` is bcrypt and the app only knows argon2, and no admin password is documented anywhere in the repo. The seeded admin can never sign in. Fix: seed an argon2 hash of a documented dev password, or register bcrypt in `PasswordHash`. |
| INT-09 backends can't be merged | **Fixed** | Integration risk (Aakash + Amrutha) | `git merge-tree` aakash-port + foundation: exit 0. aakash-port imports Vamsi's `database.models` (`app/models/__init__.py`), single `Base`, single `core/database.py`. |
| INT-10 enqueue failure still returns QUEUED | **Fixed (code reading only, not run live)** | Branch bug | `scans.py:55-62`: if `enqueue_scan` returns False the row is set `FAILED` and the API returns 503. |
| INT-11 seed ids unusable through the API | **Fixed** | Integration risk (Vamsi seed vs Aakash id pattern) | As a registered user: `GET /projects` lists `00000000-0000-0000-0001-000000000001`, `GET /projects/{id}` 200, `GET /scans/a8098c1a-...` 200, `GET /scans?project_id=...` 200. (But see DB-16: the seed scan is not processable.) |
| INT-12 cancelled scan stays in Redis | **Fixed** | Branch bug | `test_09b` no longer xfails (`dequeue_scan` -> `LREM`); Harshitha's worker also skips non-QUEUED scans (`scan_worker.py:73-78`). |
| BE-13 `findings.explanation` missing | **Fixed** | Integration risk (Vamsi + Sathwik) | Column exists (`SHOW CREATE TABLE findings`); `GET /findings` returns `"explanation": null` with Sathwik's service, 200. |
| AE-04 confidence type | **Fixed** | Integration risk (Harshitha + Sathwik + Vamsi) | Engine `float` validated 0..1 (`analysis-engines/base/finding.py:53,87-89`), DB `FLOAT`, API `float` with `ge=0, le=1`. Stored 0.88, 0.92, 0.9 etc. and read back as numbers. (FLOAT instead of the suggested DECIMAL(3,2); fine.) |
| AE-06 dummy findings look real | **Partly fixed** | Integration risk (Harshitha + Sathwik + Vamsi) | `is_development` exists in engine, worker, DB and API and is `true` for the two seed rows. But `GET /findings` has no filter for it, so dev rows come back mixed with real ones (24 rows = 22 real + 2 seed dev). |
| SEC-06 placeholder passwords | **Partly fixed** | Branch bug (Vamsi for compose, Amrutha/Aakash for config) | `config.py:11,26-37`: JWT secret must be >= 32 characters; `development-only-change-this-secret`, `replace-this-with-a-long-random-local-secret`, `change_me_locally` and anything containing `replace-with` are rejected; `DATABASE_URL` has no default (startup fails without it). Same in foundation and harshitha. Still open: compose falls back to placeholder DB passwords; a 40 character `aaaa...` secret is accepted. |

Count: 16 fixed, 6 partly fixed, 0 not fixed.

## 3. Integration suites

| Suite | Target | Result |
|---|---|---|
| `tests/database` | Vamsi `c4df60c`, fresh MySQL + Redis | **84 passed, 2 xfailed, 0 failed** |
| `tests/integration` (18), unmodified | aakash-port :8021 | **11 passed, 6 failed, 1 xfailed** |
| `tests/integration`, same file with a bearer token on every request (scratch copy) | aakash-port :8021 | **17 passed, 1 failed** (the failure is `test_02b` and is an artefact of my patch: it adds a token to its own "no token must be 401" call). `test_09b` now passes. Effectively 18/18. |
| `tests/integration`, unmodified | aakash-scan :8022 | **13 passed, 5 skipped (BLOCKED: no health, no auth, no login), 0 failed** |

The 6 failures on aakash-port are `test_03b`, `test_04`, `test_05b`, `test_06`, `test_06b`, `test_09`. All are `401 Invalid or expired access token`: `tests/integration/test_day1_flow.py` only sends the token for create-project (`_auth_headers()`), not for upload, get-scan, list-scans or cancel. This is a gap in our own suite now that the backend enforces auth (label: test needs updating, not a product defect). I did not edit `tests/`. The 5 BLOCKED on aakash-scan are Waiting on merge (that branch has no auth; aakash-port has it).

## 4. Full pipeline attempt

Setup: scratch clone, `git checkout 239761f` (aakash-port), then merged Harshitha `200cfdf` (conflict in `backend/app/api/v1/scans.py`, resolved by taking aakash-port's file), Sathwik `fd856c3` (already contained in Harshitha, "Already up to date"), Hima `e11e33d` (clean), Vamsi `c4df60c` (clean). Extracted with `git archive`, started on :8023. Demo input: `vulnerable-demo-repo` zipped (9 files, 8,343 bytes).

| Hop | Result | Evidence |
|---|---|---|
| 1 register | **Works** | 201, `organization_id = org-default-001`, role `user` |
| 2 login | **Works** | 200, JWT |
| 3 create project | **Works** | 201, UUID id |
| 4 upload ZIP | **Works** | 201, stored as `<UPLOAD_DIR>/<sha256(org)>/<uuid>.zip` |
| 5 create scan | **Works** | 201 `QUEUED`, row in `scans`, id in Redis list `pqc:scan_queue` |
| 6 Redis queue -> worker | **BREAKS (first hop)** | No code in any of the six branches reads the queue. `grep -rEi "blpop\|brpop\|lpop\|lmove"` over all worktrees: zero hits. Producer only: `redis_service.py` `enqueue_scan` / `dequeue_scan`. Harshitha offers an HTTP trigger instead (`POST /scans/{id}/process`, `scans.py:94-130` in `200cfdf`), which does not use Redis and is dropped when `scans.py` is resolved in aakash-port's favour. Glue used: scratch loop doing `BLPOP` then `process_scan(scan_id, db)`. |
| 7 ingestion (Hima `ingest_scan_record`) | **Works when called directly** | `ingest_scan_record(db, Scan, scan_id, storage_root)` returned 9 files included (config 2, docs 1, manifest 1, source 5). But the worker does not call it (see INT-37) and running both on one scan fails with `ExtractionError: Extraction destination is not empty` (`ingestion/extractor.py:47`); scan ended `FAILED` with no reason stored. |
| 8 analysis (Harshitha pipeline + worker) | **Works** | `process_scan` alone: SAST 11 findings + crypto 11 findings = 22, 9 `scan_files` rows, status walked QUEUED -> INGESTING -> ANALYZING -> PROCESSING -> COMPLETED, all valid enum values. A second scan of the same ZIP also completed (finding ids are not content-only, no PK collision). |
| 9 findings stored in MySQL | **Works** | 22 rows, UUID ids, `confidence` 0.8-0.95 float, `is_development 0`, evidence redacted (`API_TOKEN = "[REDACTED]"`), file paths relative (`demo_bank/app.py`). `explanation` is NULL on every row (engines never fill it). |
| 10 GET findings via Sathwik's API | **BREAKS, then works only with a swap** | (a) Merged `router.py:7-10` does not mount `findings` or `reports` -> 404 until mounted. (b) Once mounted, the app does not start: `finding_service.py:77` `IndentationError` (INT-31). (c) After fixing that line, every call is 500: `TypeError: get_report_data() missing 1 required keyword-only argument: 'organization_id'` (INT-32). (d) With Sathwik's `fd856c3` `finding_service.py` swapped in, `/findings` and `/reports/{scan_id}` return 200 with 22 findings and counts, but anonymous and cross-tenant (INT-34), and `scan_id` is ignored (INT-35). |

Glue I needed in scratch: (1) queue consumer loop, (2) resolve `scans.py` conflict, (3) mount findings and reports routers, (4) swap in Sathwik's `finding_service.py` (plus a one line syntax fix when testing Harshitha's version).

Harshitha's branch on its own: `python -c "import app.main"` -> `ImportError: cannot import name 'get_current_user' from 'app.core.security'` at `backend/app/api/v1/scans.py:7`. That branch cannot start.

### Contract mismatches between branches

| Item | Branch A | Branch B |
|---|---|---|
| `get_current_user` location | aakash-port/foundation: `app/api/v1/routes/auth.py` | Harshitha `scans.py:7` imports it from `app.core.security` (does not exist) |
| Org access helper | aakash-port: `get_user_organization_id(user)` raises 403 | Harshitha: inline `user.organization_id` check |
| Scan trigger | aakash-port: Redis list `pqc:scan_queue`, nobody consumes | Harshitha: `POST /scans/{id}/process` BackgroundTask, no Redis |
| Enqueue failure | aakash-port: 503 + row `FAILED` | Harshitha: `X-Queue-Status: enqueued/deferred` header, scan stays `QUEUED` |
| Ingestion entry point | Hima: `ingest_scan_record(db, scan_model, scan_id, storage_root)` (+ writes `ingestion-summary.json`) | Harshitha worker: `ingest_repository(zip_path, scan_dir)` directly; the two cannot both run on one scan |
| Storage root | aakash-port: `UPLOAD_DIR/<sha256(org)>/<uuid>.zip` | Harshitha `scan_worker.py` assumes `<root>/uploads/<id>.zip` and takes `zip_path.parent.parent` as `storage/`, so extraction lands in `UPLOAD_DIR/scans/<scan_id>/repository` |
| Findings service signature | Harshitha: `list_findings(db, *, organization_id, scan_id=None, ...)` | Harshitha/Sathwik routers: call it without `organization_id` and without `scan_id` |
| Findings auth | aakash-port: all routes behind `get_current_user` | Sathwik routers: no auth dependency |
| Findings id name | DB column `findings.id` | API `finding_id` (SQL alias, fine), engine `finding_id` |
| ID types | all ids `CHAR/VARCHAR(36)` UUID strings, org id `org-default-001` | consistent, no mismatch found |
| Status values | DB ENUM and aakash-port `ScanStatus` have the same 8 values; worker only uses QUEUED/INGESTING/ANALYZING/PROCESSING/COMPLETED/FAILED | consistent. `AI_ANALYSIS` unused. |
| Confidence type | engine float, DB FLOAT, API float | consistent now |
| Error reason | worker docstring says errors go to an `error_message` field | `scans` has no such column |
| Duplicated files | aakash-port ships its own `database/schema.sql`, `seed.sql`, `models.py`, `verify_db.py`, `docker-compose.yml` | all differ from Vamsi's (old `confidence VARCHAR(50)`, no `explanation` / `is_development`, org `'1'`) |
| `backend/` stub | Vamsi: `backend/app/core/database.py` (defaults to PostgreSQL), `backend/app/models/__init__.py`, `backend/.env.example` (`postgres:postgres`) | foundation/aakash-port own the same paths |

### Merge conflicts (`git merge-tree --write-tree --name-only`)

| Pair | Result |
|---|---|
| vamsi + aakash-port | CONFLICT `backend/.env.example` (add/add), `backend/app/core/database.py` (content) |
| vamsi + foundation | same two files |
| aakash-port + harshitha | CONFLICT `backend/app/api/v1/scans.py` |
| foundation + harshitha | CONFLICT `backend/app/api/v1/scans.py` |
| aakash-port + foundation, + sathwik, + hima | clean |
| vamsi + harshitha, + sathwik, + hima | clean |
| sathwik + harshitha, hima + harshitha, sathwik + hima | clean |

Sequential merge in the scratch clone (aakash-port, then Harshitha, Sathwik, Hima, Vamsi) had exactly one conflict (`scans.py`); Vamsi merged cleanly on top because Harshitha's side already touched `core/database.py`. What disappears once combined: aakash-scan's missing auth/health, Vamsi's missing `app/`, the old foundation/Aakash `database.py` conflict. What survives: everything listed under INT-30 to INT-41.

## 5. New issues

Numbering continues at DB-15 and starts at INT-30 (the backend report uses INT-15 to INT-17).

| ID | Severity | Label | Title | branch@commit, file:line | Evidence | Expected vs actual | Fix | Owner |
|---|---|---|---|---|---|---|---|---|
| INT-30 | High | Branch bug | Harshitha's backend cannot start | harshitha@200cfdf `backend/app/api/v1/scans.py:7` | `import app.main` -> `ImportError: cannot import name 'get_current_user' from 'app.core.security'`. The function is not in that file. On merge this file also conflicts with aakash-port's `scans.py`. | Expected: app starts. Actual: dead on import. | Import from `app.api.v1.routes.auth` and use `get_user_organization_id`; then re-apply the `/process` endpoint on top of aakash-port's `scans.py` (or drop it in favour of the worker). | Harshitha |
| INT-31 | High | Branch bug | `finding_service.py` has a syntax error | harshitha@200cfdf `backend/app/services/finding_service.py:77` | `) -> tuple[str, int, ReportSeverityCounts] \| None:    """Return scan status ..."""` on one line; `ast.parse` -> `SyntaxError 78 unexpected indent`. Mounting the findings router makes the whole app fail at import. | Expected: module imports. Actual: IndentationError. | Put the docstring on its own line. | Harshitha |
| INT-32 | High | Branch bug | Findings routers call the org-scoped service without `organization_id` | harshitha@200cfdf `backend/app/api/v1/findings.py:34`, `reports.py:16` vs `finding_service.py:9-20,44,75` | After fixing INT-31: `GET /findings` and `/reports/{id}` -> 500, `TypeError: get_report_data() missing 1 required keyword-only argument: 'organization_id'`. | Expected: 200 scoped to the caller's org. Actual: 500 on every call. | Add `Depends(get_current_user)` to both routers, pass `get_user_organization_id(user)` and `scan_id` into the service. | Harshitha (Sathwik to adopt) |
| INT-33 | High | Waiting on merge | Nothing consumes the Redis queue | all branches; producer only `redis_service.py:19-28` (aakash-port), worker `scan_worker.py` has no loop | See hop 6. Scans stay `QUEUED` forever unless something calls `process_scan`. | Expected: worker `BLPOP`s `pqc:scan_queue`, calls ingestion and analysis, writes status. Actual: no consumer, only a dev HTTP trigger. | Add a worker entry point (`python -m app.worker`) that pops ids, re-checks status is `QUEUED`, calls `process_scan` with its own session, retries/failure handling. Agree who owns it. | Harshitha + Aakash |
| INT-34 | High | Branch bug | Findings and reports endpoints are anonymous and not org-scoped | sathwik@fd856c3 `backend/app/api/v1/findings.py:10-40`, `reports.py:10`; `finding_service.py` | In the merged tree `GET /findings` and `GET /reports/{scan_id}` return 200 with no `Authorization` header, with data from every scan (user data across orgs, plus seed dev rows). BE-01 for these routes is still open. | Expected: 401 without token, only own org's data. Actual: open to anyone who can reach the port. | Same fix as INT-32 plus scoped queries (Harshitha's service already has them). | Sathwik |
| INT-35 | Medium | Branch bug | `GET /findings` has no usable `scan_id` filter | sathwik@fd856c3 `findings.py:13-38`, `finding_service.py:9-20` | `GET /findings?scan_id=<real>` and `?scan_id=00000000-0000-0000-0000-000000000000` both return the same 24 rows. The query param is silently ignored. The closure goal ("findings of this scan") cannot be done except via `/reports` counts. | Expected: only findings of that scan (404/empty for unknown). Actual: everything. | Add `scan_id: UUID` query param and pass it to the service. | Sathwik |
| INT-36 | High | Branch bug | Every registered user joins the same organization, so org scoping is empty | aakash-port@239761f `backend/app/api/v1/routes/auth.py:12,50-52` (`DEFAULT_ORGANIZATION_ID`) | User B (new registration) listed user A's project, `GET /scans/{A's scan}` returned 200, and `POST /scans` with A's `project_id` and A's `upload_id` returned 201. All users also see the seeded demo project. | Expected: a user only sees their own org's data (or at least their own projects). Actual: one shared tenant. | Create an organization per registration (or an admin-managed invite), keep the default org only for the dev admin, and scope uploads per user/project. | Amrutha + Aakash |
| INT-37 | Medium | Integration risk | Worker bypasses Hima's adapter; both together fail | harshitha@200cfdf `scan_worker.py:36-41,101` (`ingest_repository`) vs hima@e11e33d `ingestion/scan_adapter.py:23-46` (`ingest_scan_record`) | Calling `ingest_scan_record` and then `process_scan` on one scan: `ExtractionError: Extraction destination is not empty` (`ingestion/extractor.py:47`) and the scan ends `FAILED` with no reason. The team agreed adapter (reads `repository_path` from the DB row, writes `ingestion-summary.json`) is not what the worker runs. | Expected: one agreed ingestion call; re-run is safe. Actual: two entry points that collide. | Decide: worker calls `ingest_scan_record`, or extractor accepts a clean re-extract. | Harshitha + Hima |
| INT-38 | Medium | Integration risk | Worker says it records errors in `error_message`; the column does not exist | harshitha@200cfdf `scan_worker.py:11-13` vs vamsi@c4df60c `database/schema.sql` `scans` table | A failed scan shows only `FAILED` plus timestamps; the cause exists only in the worker log. The API and UI cannot tell the user why. | Expected: reason stored and shown. Actual: none. | Add `error_message TEXT NULL` to `scans` (schema, models, ScanOut) and set it in `_set_status` on failure. | Vamsi + Harshitha + Aakash |
| INT-39 | Low | Integration risk | Storage root and import path assumptions in the worker | harshitha@200cfdf `scan_worker.py:37,86` | `parents[4]` in `_import_pipeline` is one level above the repo root and only works because `app/models/__init__.py` already put the root on `sys.path`. `storage_root = zip_path.parent.parent` assumes `uploads/<id>.zip`; with aakash-port's per-org folder, extraction goes to `UPLOAD_DIR/scans/<id>/repository` (inside the upload dir). Works, but wrong location. | Expected: a configured storage root. Actual: derived from path depth. | Read `UPLOAD_DIR`'s parent from settings; drop the `sys.path` edit. | Harshitha + Aakash |
| INT-40 | Medium | Integration risk | aakash-port carries stale copies of the database files | aakash-port@239761f `database/schema.sql`, `seed.sql`, `models.py`, `verify_db.py`, `docker-compose.yml` | `git diff 239761f c4df60c -- database/` differs on all five: old `confidence VARCHAR(50)`, no `explanation`, no `is_development`, second org `'1'`. If the merge picks aakash-port's copy the DB-09/BE-13/AE-04 fixes disappear, and its ORM `Finding` would not match Vamsi's table. | Expected: one `database/` owned by Vamsi. Actual: two versions in flight. | Remove `database/` and `docker-compose.yml` from Aakash's branch; always take Vamsi's. | Aakash + Vamsi |
| INT-41 | Medium | Integration risk | Vamsi's branch ships a `backend/` stub that collides with the backend branches | vamsi@c4df60c `backend/app/core/database.py`, `backend/.env.example`, `backend/app/models/__init__.py` | merge conflicts with aakash-port and foundation on the first two. Its `database.py` and `.env.example` default to PostgreSQL (`postgres:postgres@localhost:5432`) while the product and compose are MySQL. `database/run_combined_flow.py` needs `app.core.config` that Vamsi's branch does not have. | Expected: Vamsi owns `database/` only. Actual: collides on merge. | Delete `backend/` from Vamsi's branch; keep the combined-flow script, it works in the merged tree. | Vamsi (Amrutha to confirm) |
| DB-15 | Low | Branch bug | `run_combined_flow.py` leaves its test data behind | vamsi@c4df60c `database/run_combined_flow.py` (no cleanup) | After one run in the merged tree the DB contained the `qa.vamsi.*@pqc.example` user, the project `Enterprise Payment Gateway ...`, the scan and its Redis queue entry and uploaded ZIP. | Expected: removes what it created, like verify_db now does. Actual: accumulates; stale queue entries would be picked up by a worker. | Delete scan/project/user rows and `LREM` the queue id in a `finally`. | Vamsi |
| DB-16 | Low | Branch bug | The seed scan can never be processed, and dev findings show up with real ones | vamsi@c4df60c `database/seed.sql` scan `a8098c1a-...`, `repository_path 'uploads/demo-banking.zip'` | The file does not exist and the scan is not in the Redis queue; a worker would mark it `FAILED`. Its 2 findings (`is_development=1`) are returned by `GET /findings` next to real results. | Expected: demo data that is either clearly dev-only or actually runnable. Actual: dead `QUEUED` scan. | Seed the scan as `COMPLETED`, or drop the dev findings from the default seed; filter `is_development` in the API (AE-06). | Vamsi (+ Sathwik for the filter) |
| DB-17 | Low | Branch bug | `verify_db.py` still falls back silently to SQLite and carries a credential URL | vamsi@c4df60c `database/verify_db.py:40-63` | If MySQL is unreachable it prints `[WARN] ... Falling back to SQLite in-memory` and can then end in `[SUCCESS]`, which proves nothing about MySQL. Candidate URL list contains `pqc:change_me_locally`. | Expected: exit non-zero when the live DB is unreachable. Actual: passes against a throwaway DB. | Remove the fallback (or exit 2 after printing it); read `DATABASE_URL` only. | Vamsi |
| DB-18 | Low | Branch bug | MySQL root account is open to any host inside the container network | vamsi@c4df60c `docker-compose.yml` (default `MYSQL_ROOT_HOST`) | `mysql.user` has `root@%` and `pqc@%`. The published port is loopback-only so this is not reachable from the LAN, but any other container on the compose network can try root. | Expected: root limited to `localhost`. Actual: `root@%`. | Set `MYSQL_ROOT_HOST=localhost` or drop root access from the app network. | Vamsi |

### Counts by label

Open items from the retest (partly fixed): Branch bug 4 (DB-04, DB-08, DB-14, SEC-06), Integration risk 2 (INT-08, AE-06).
New items: Branch bug 10 (INT-30, 31, 32, 34, 35, 36, DB-15, 16, 17, 18), Integration risk 5 (INT-37, 38, 39, 40, 41), Waiting on merge 1 (INT-33).
Totals open: **Branch bug 14, Integration risk 7, Waiting on merge 1**. Additional Waiting-on-merge observations (not counted as defects): aakash-scan has no auth/health (5 BLOCKED), `run_combined_flow.py` has no `app/` on Vamsi's branch alone, the 6 integration test failures are a gap in our own suite's token handling.
Fixed items by original label: Branch bug 11, Integration risk 5.

### What is real and what disappears after merging

Real (survives the merge): INT-30 (import conflict in `scans.py`), INT-31, INT-32, INT-34, INT-35, INT-36, DB-15 to DB-18, INT-37 to INT-41, INT-08 (no usable admin), AE-06 (no filter).
Disappears once combined: foundation/Aakash `database.py` conflict (INT-09 fixed), aakash-scan lacking auth, Vamsi's missing `app/`, Sathwik's missing router (only because his branch is a four file slice).
Not a bug, just not there yet: INT-33 (queue consumer).
