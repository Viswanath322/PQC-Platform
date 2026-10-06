# Backend API retest, Day 3, raw results

- Date: 2026-10-01, QA branch `qa/pushpam`, tester: Pushpam
- Suite: `tests/backend/` and `tests/integration/` (HTTP only, no application code imported). Nothing in `tests/` was edited.
- All worktrees read-only, `git status --porcelain --ignored` clean before and after (checked at the end, see Cleanup).

## Targets

| Backend | Branch @ commit | Owner | Served on | Database |
|---|---|---|---|---|
| Merged Aakash + Amrutha backend (health, auth, projects, uploads, scans, redis ping) | `backend/aakash-port` @ 239761f | Aakash / Amrutha | 127.0.0.1:8011 (`app.main:app`) | MySQL 8.0.46, `database/schema.sql` of that branch |
| Foundation | `backend/foundation` @ d56a7c9 | Amrutha | 127.0.0.1:8014 | MySQL, schema of that branch |
| Aakash scan | `backend/aakash-scan` @ 122c89b | Aakash | 127.0.0.1:8012 (SQLite), 127.0.0.1:8013 (MySQL), `dev_main:app` | SQLite temp file, MySQL |
| Findings + reports | `backend/sathwik-findings` @ fd856c3 | Sathwik | 127.0.0.1:8016 and 8015 via a QA runner | MySQL, two schemas (see below) |
| Merge simulation (aakash-port + sathwik clean merge tree 072ef7f, routers mounted) | n/a | n/a | 127.0.0.1:8018, 8019 | MySQL, Vamsi's schema |

Python 3.11 venv in the repo. I installed `PyJWT[crypto]` and `pip-audit` into it (the new backends need PyJWT, not python-jose). Resources: containers `qa-be-mysql` (127.0.0.1:3307, mysql:8.0) and `qa-be-redis` (127.0.0.1:6380, redis:7-alpine with a random password). Four separate databases on the same MySQL so the runs do not touch each other: `pqc_security` (aakash-port schema), `pqc_aak`, `pqc_found`, `pqc_sath` (vamsi schema). Ports 6379, 5433, 3306, 6391 and 8020-8029 were never touched. JWT secret and DB/Redis passwords are random test values.

## How I ran it

```bash
# MySQL + Redis (schema mounted from the branch under test)
docker run -d --name qa-be-mysql -p 127.0.0.1:3307:3306 -e MYSQL_DATABASE=pqc_security -e MYSQL_USER=pqc \
  -e MYSQL_PASSWORD=<rand> -e MYSQL_ROOT_PASSWORD=<rand> \
  -v .worktrees/aakash-port/database/schema.sql:/docker-entrypoint-initdb.d/01_schema.sql:ro mysql:8.0
docker run -d --name qa-be-redis -p 127.0.0.1:6380:6379 redis:7-alpine redis-server --requirepass <rand>

# aakash-port (needs DATABASE_URL and JWT_SECRET_KEY, no defaults)
cd .worktrees/aakash-port/backend
PYTHONDONTWRITEBYTECODE=1 DATABASE_URL=mysql+pymysql://pqc:<pw>@127.0.0.1:3307/pqc_security JWT_SECRET_KEY=$(openssl rand -hex 32) \
  REDIS_URL=redis://:<pw>@127.0.0.1:6380/0 UPLOAD_DIR=<scratch>/uploads \
  ../../../.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8011 --no-server-header

# suite (from repo root)
PQC_API_URL=http://127.0.0.1:8011 PQC_UPLOAD_DIR=<scratch>/uploads PQC_MYSQL_URL=... PQC_REDIS_URL=... \
  .venv/bin/pytest tests/backend -v -rs -rx -p no:cacheprovider
PQC_API_URL=http://127.0.0.1:8011 ... .venv/bin/pytest tests/integration -v -rs -rx -p no:cacheprovider

# aakash-scan: cd .worktrees/aakash/backend; DATABASE_URL=sqlite:///<scratch>/aak.db (or the MySQL URL) uvicorn dev_main:app --port 8012 / 8013
# foundation:  cd .worktrees/foundation/backend; uvicorn app.main:app --port 8014 (same env as aakash-port)
# sathwik: no main.py, so a runner in scratch (run_sathwik.py) puts .worktrees/sathwik/backend on sys.path, supplies a get_db shim for app.core.database,
#          mounts findings.router and reports.router under /api/v1. Port 8015 on the aakash-port schema (as delivered), port 8016 on Vamsi's schema.
# merge checks: git merge-tree --write-tree --name-only --messages <a> <b>   (see BE-16)
# dependency audit: .venv/bin/pip-audit -r .worktrees/<branch>/backend/requirements.txt
```

Two runs per authenticated target, because of a gap in the suite (not in the app): `tests/backend` has no login helper, so once the app really enforces auth every protected call gets 401.
- Run A: suite exactly as committed.
- Run B: same suite plus a tiny pytest plugin that lives in my scratch dir (not in the repo): it registers a throwaway user and adds `Authorization: Bearer ...` to the suite's `httpx` client. A few tests are expected to fail under run B by design (they send a bare request on purpose, or assume uploads are in a flat directory), I list each one.

## Counts per target

| Target | Run | Passed | Failed | Blocked (skipped) | XFail | XPass | Errors |
|---|---|---|---|---|---|---|---|
| aakash-port, MySQL, `tests/backend` | A, as committed | 63 | 53 | 27 | 4 | 5 | 27 |
| aakash-port, MySQL, `tests/backend` | B, with token plugin | 139 | 3 | 28 | 9 | 0 | 0 |
| aakash-port, MySQL, `tests/integration` | A | 11 | 6 | 0 | 1 | 0 | 0 |
| aakash-port, MySQL, `tests/integration` | B | 17 | 1 | 0 | 0 | 0 | 0 |
| foundation, MySQL, `tests/backend` | A | 62 | 54 | 27 | 4 | 5 | 27 |
| foundation, MySQL, `tests/backend` | B | 138 | 4 | 28 | 9 | 0 | 0 |
| foundation, MySQL, `tests/integration` | B | 17 | 1 | 0 | 0 | 0 | 0 |
| aakash-scan, SQLite, `tests/backend` | as committed | 104 | 4 | 63 | 8 | 0 | 0 |
| aakash-scan, MySQL, `tests/backend` | as committed | 102 | 6 | 63 | 8 | 0 | 0 |
| aakash-scan, MySQL, `tests/integration` | as committed | 13 | 0 | 5 | 0 | 0 | 0 |
| sathwik routers on Vamsi's schema (explanation column present), `tests/backend` | all | 40 | 4 | 132 | 2 | 1 | 0 |
| sathwik, same, `test_api_security.py` deselected | | 24 | 0 | 122 | 0 | 1 | 0 |
| sathwik routers on aakash-port's schema (as the merged branches would have it), `test_api_security.py` deselected | | 14 | 10 | 122 | 0 | 1 | 0 |

(Yesterday for comparison: Aakash 100 passed / 8 failed / 63 blocked, foundation 53 / 1 / 123, Sathwik 24 / 0 / 122 after the manual ALTER.)

What the failures are:

- Run A on aakash-port and foundation (53/54 failed, 27 errors): all `401 Invalid or expired access token`. The suite never logs in. Label for these rows: Waiting on merge in the sense of "suite not updated yet", the app is behaving correctly. The 5 XPASS in run A are `test_endpoint_requires_authentication[get/post /projects, get/post /scans, post /uploads]`: the xfail markers can now be removed, BE-01 is fixed for those routes.
- Run B aakash-port, 3 failed, none is an app defect:
  - `test_me_requires_token`: my plugin adds a token to every call, so `/auth/me` without a token cannot be tested. It returns 401 when no token is sent (probe 1 below).
  - `test_upload_oversized_rejected_413`: the test uses a bare `httpx.post` with no token, gets 401. With a token a 201 MB body gives 413 (probe 4 below).
  - `test_upload_path_traversal_filename`: the test expects `<UPLOAD_DIR>/<upload_id>.zip`. The branch now stores uploads under `<UPLOAD_DIR>/<sha256(org id)>/<upload_id>.zip` (good change). The test needs to look one directory deeper. Test update for me, not a bug.
- Run B foundation: same three, plus `test_security_headers_present` (no nosniff on foundation, fixed on aakash-port, see BE-09).
- Run B integration, 1 failed = `test_02b_wrong_password_and_bad_token`, same plugin artifact. Without the plugin (run A) the integration flow fails in 6 tests because several calls in `test_day1_flow.py` (list projects, get project, non-zip upload, bad scan references, get scan, cancel) are sent without the bearer header; only create project/upload/scan use `_auth_headers()`. Suite gap, not app.
- aakash-scan, SQLite: 4 failed = 3x `test_cors_allows_desktop_origin` (BE-07) plus `test_security_headers_present` (BE-09). MySQL: the same 4 plus `test_list_projects_newest_first_and_contains_new` and `test_list_scans_newest_first` (BE-15, same-second ordering, they failed in this run, flaky by nature). Integration 5 skipped = health/auth tests, endpoints not on that branch (Waiting on merge).
- Sathwik on Vamsi's schema: the 4 failed are CORS and security-headers tests; the runner has no middleware (there is no entrypoint), so they are not applicable (Waiting on merge). The 10 failures on the aakash-port schema are all the `explanation` / `is_development` 500 (BE-13).
- Sathwik XPASS: `test_findings_list_is_paginated`, `limit` and `offset` now exist (BE-18).

## Retest table (previously open items)

Label legend: Branch bug = defect in the branch's own code that survives a merge. Integration risk = two branches disagree on a shared contract. Waiting on merge = not delivered or not combined yet.

| ID | Item | Verdict | Label | Evidence |
|---|---|---|---|---|
| BE-01 | Auth on routes | **Fixed** on aakash-port and foundation for projects, uploads, scans. **Not fixed** for `/redis/ping` (new BE-22) and for findings and reports (new BE-20). Not fixed on aakash-scan and sathwik as standalone. | Branch bug (redis ping, findings/reports); Waiting on merge (aakash-scan, sathwik standalone) | aakash-port, no token: every route in `openapi.json` gives 401 `{"detail":"Invalid or expired access token"}` except `/health`, `/auth/register`, `/auth/login` (422 on empty body) and `/redis/ping` which gives 200 `{"redis":"ok","queue_length":15}`. 5 of the 7 old xfail tests now XPASS. aakash-scan `GET :8013/api/v1/projects` still 200 without a token. |
| BE-02 | Absolute path in scan response | **Fixed** | Branch bug fixed | aakash-port and aakash-scan: scan JSON keys are `completed_at, created_at, id, project_id, started_at, status, upload_id`, no `repository_path` (aakash-scan: same, `ScanOut` excludes it). `test_scan_response_has_no_absolute_server_path` and `test_responses_contain_no_absolute_paths` pass. |
| BE-06 | Raw filename echo | **Fixed** | Branch bug fixed | `../../evil.zip` returns 201 `"filename":"evil.zip"`; `..\..\evil.zip` gives `evil.zip`; `/etc/passwd.zip` gives `passwd.zip`; `<script>alert(1)</script>.zip` gives `script_.zip`. Stored as `<uuid>.zip` under a per-org hashed folder. Nothing written outside the upload dir (`find` for `evil*` found nothing). |
| BE-07 | CORS | **Fixed** on aakash-port and foundation. **Not fixed** on aakash-scan (no middleware, `OPTIONS /projects` 405). | Waiting on merge (aakash-scan; its owner is covered by the merged app) | aakash-port preflight: `tauri://localhost`, `http://tauri.localhost`, `http://localhost:5173` get matching `access-control-allow-origin`; `http://evil.example`, `null`, `http://localhost:5173.evil.example`, `https://tauri.localhost` and `http://localhost:1420` get 400 with no ACAO. Disallowed header and TRACE method get 400. |
| BE-09 | nosniff / server header | **Partly fixed** | Branch bug | aakash-port sets `x-content-type-options: nosniff` (`main.py` middleware). foundation and aakash-scan still do not. `server: uvicorn` still sent unless uvicorn is started with `--no-server-header` (I checked a default start on :8017: `server: uvicorn`). The flag is not in the repo (README run command, compose, Tauri sidecar start), so it is easy to miss. |
| BE-10 / INT-10 | Redis down but scan says QUEUED | **Fixed** on aakash-port. **Partly fixed** on aakash-scan. | Branch bug (aakash-scan until merged) | aakash-port, Redis stopped: `POST /scans` returns 503 `{"detail":"Scan queue is unavailable; the scan was not queued. Please retry."}` and the row is set to FAILED with `completed_at` in DB. Warning is logged. aakash-scan still returns 201 `QUEUED` (it only adds an `X-Queue-Status: deferred` header and a log line). Side effect worth knowing: each failed attempt leaves a FAILED scan row. `/redis/ping` with Redis down still echoes host and port: `Redis unavailable: Error 61 connecting to 127.0.0.1:6380. Connection refused.` (BE-22). |
| INT-03 | Scan status enum | **Fixed** on aakash-port (and foundation DB side). **Not fixed** on aakash-scan. | Integration risk resolved on port | aakash-port: `database/models.py` uses `Enum(... name="scan_status_enum")`, `ScanOut.status` is a `ScanStatus` enum with the same 8 values as the MySQL ENUM. aakash-scan: `Column(String(20))` unchanged, schema `status: str`. |
| INT-12 | Cancelled scan stays in queue | **Fixed** (one edge case) | Branch bug fixed | aakash-port: create gives queue `[<scan id>]`, cancel gives 200 CANCELLED and `LRANGE pqc:scan_queue` empty, second cancel 409. Same on aakash-scan. Edge case: if Redis is down at cancel time the dequeue fails silently (warning only) and the stale id is still in the queue after Redis returns. The worker must re-check scan status before starting, which is the second half of the original fix, so Low. |
| BE-12 | Default JWT secret | **Fixed** | Branch bug fixed | `config.py`: `jwt_secret_key: str = Field(min_length=32)` with a placeholder blocklist. No `JWT_SECRET_KEY` gives `ValidationError ... jwt_secret_key Field required` and the process does not start (aakash-port and foundation). `development-only-change-this-secret` gives `must be a unique random secret, not a placeholder`. `short` gives `at least 32 characters`. Token forged with the old default key: `/auth/me` 401. Same for the `.env.example` placeholder. Residual: a low entropy 32 char value such as 36 x `a` is accepted (Info). |
| BE-13 | `findings.explanation` 500 | **Not fixed** where it matters. Fixed in Vamsi's schema only. | Integration risk (Vamsi, Aakash/Amrutha, Sathwik) | Sathwik routers on the aakash-port / foundation `schema.sql` (no `explanation`, no `is_development`): `GET /findings` 500, log `Unknown column 'explanation'`. On `vamsi` @ c4df60c (`explanation TEXT NULL`, `is_development`, `confidence FLOAT`) the same routers give 200 and 24 passed, 0 failed. So the fix exists on one branch, the branch that ships the app still has the old schema. Note also `confidence` is `VARCHAR(50)` in aakash-port's schema and `FLOAT` in Vamsi's, the findings schema returns a float. |
| BE-16 / INT-09 | Can the backends be merged, one app? | **Partly fixed** | Waiting on merge (wiring) + Integration risk (Vamsi) | `aakash-port` already serves health, auth (register, login, me), projects, uploads, scans and redis ping in one `app.main:app` under `/api/v1` with one `Base`, one `get_current_user`, one CORS block. Merge-tree results (no conflicts unless stated): aakash-port + sathwik clean (tree 072ef7f), foundation + sathwik clean, aakash-port + foundation clean (aakash-port is foundation plus 2 commits), sathwik + vamsi clean, **aakash-port + vamsi conflicts** in `backend/app/core/database.py` (content) and `backend/.env.example` (add/add), aakash-port + aakash-scan conflicts in 11 files (expected, aakash-port replaces them). A clean merge does not mean wired: in the aakash-port + sathwik tree the findings and reports files are present but `api/v1/router.py` does not include them, so `/openapi.json` has no `/findings` or `/reports`. Mounting them by hand works but is unauthenticated (BE-20). |
| BE-17 | Lockout, open registration | **Not fixed** | Branch bug | 40 wrong logins in a row: 40 x 401, no delay (41st call 0.13 s). `password1234` and `aaaaaaaaaaaa` both accepted (201). `/auth/register` open, and the new org assignment makes it worse (BE-19). Re-register of an existing email returns 409 `Email is already registered`, which tells anyone which emails exist. Mass assignment (`role`, `organization_id` in body) is ignored. |
| BE-18 | Findings category filter | **Partly fixed** | Branch bug | `engine` and `finding_category` filters added, `severity=HIGH` now accepted (case-insensitive), `limit` (1-500) and `offset` added, pagination xfail now XPASS. But `category=` is still an alias of engine: `?category=crypto` returns the crypto finding, `?category=weak-hash` gives 422 `Invalid category; use engine or finding_category`. Kept on purpose (marked deprecated), UI team must use `finding_category`. Still no `info` severity (not a defect). |
| SEC-09 | ecdsa / python-jose | **Fixed** | Branch bug fixed | aakash-port and foundation `requirements.txt` use `PyJWT[crypto]>=2.13,<3.0`, python-jose is gone. `pip-audit -r backend/requirements.txt` on both: `No known vulnerabilities found`. Still version ranges, not exact pins (fix list asked for pins). Sathwik has no requirements file. |
| SEC-10 | DB password default | **Partly fixed** | Branch bug (compose, Vamsi) | App side fixed: `DATABASE_URL` has no default in `Settings`. Not fixed: aakash-port and foundation `docker-compose.yml` still hardcode `MYSQL_PASSWORD: change_me_locally`, root password the same, Redis `--requirepass change_me_locally`, and the healthcheck has `-pchange_me_locally`; `.env.example` ships the same value. `vamsi` compose reads `${MYSQL_PASSWORD:-change_me_locally}` etc., still with defaults and the password on the healthcheck line. `vamsi` `backend/app/core/database.py` defaults to `postgresql+psycopg2://postgres@localhost:5432/pqc_security` and imports `dotenv` which is not in requirements (see INT-15). |

Other things I re-checked on the way:

- Seed data (BE-14, DB-09): `aakash-port` and `foundation` `seed.sql` still abort with `ERROR 1406 Data too long for column 'id' at row 1`, only the 2 organizations get loaded. `vamsi` @ c4df60c loads fully (1 org, admin `admin@pqc.example`, 1 project) but its admin password hash is still bcrypt, which the argon2-only backend cannot verify (INT-07/08 behaviour: login 401, no 500 now). Label: Integration risk (Vamsi vs Amrutha), see INT-15.
- BE-15 ordering: **Not fixed**. Code now orders by `created_at DESC, id DESC`, but `created_at` is still `DATETIME` (no fractional seconds) and ids are random UUIDs, so the tie-break is random. I created `ord-0` to `ord-5` in a row and `GET /projects` returned `ord-4, ord-3, ord-1, ord-2, ord-0, ord-5`. Label: Integration risk (Vamsi schema + Aakash).
- BE-03, BE-04, BE-05, BE-11, INT-06: unchanged and still fine.

## Security probes on aakash-port (:8011, MySQL)

Test users were created over the API. To get a user in a second organization I moved one user row to `org-qa-b` with SQL (registration cannot do this, see BE-19).

### 1. Unauthenticated access, every route in `openapi.json`

| Route | No token |
|---|---|
| GET /health | 200 |
| POST /auth/register, /auth/login | 422 (empty body, i.e. reachable, by design) |
| GET /auth/me | 401 |
| GET, POST /projects, GET /projects/{id} | 401 |
| POST /uploads | 401 |
| GET, POST /scans, GET /scans/{id}, POST /scans/{id}/cancel | 401 |
| **GET /redis/ping** | **200** `{"redis":"ok","queue_length":15}` (BE-22) |
| /docs, /openapi.json | 200 (expected for a loopback dev server, Info) |

### 2. Cross-user and cross-organization

| Probe | Result |
|---|---|
| Two users registered normally, user B reads user A's project | **200** (same org). B reads A's scan 200, B's project list contains A's project, a third brand new user cancels A's scan and gets 200 CANCELLED. See BE-19. |
| B moved to `org-qa-b`: GET A's project / scan | 404 / 404 |
| B cancels A's scan | 404, A's scan still QUEUED in DB |
| B list projects / list scans / `scans?project_id=<A>` | A's rows not returned, `[]` |
| B creates a scan on A's project | 404 `Project not found` |
| B creates a scan on own project using A's `upload_id` | 404 `Upload not found` |
| B creates a project with `organization_id` and `id` in the body | 201, org taken from the token (`org-qa-b`), body `id` ignored |
| User with `organization_id = NULL` | projects 403, upload 403 `User is not assigned to an organization` |
| Cross-org findings and reports, on the simulated merged app (:8019, Sathwik routers mounted) | **No token: `GET /findings` 200 (all 3 rows), `GET /findings/<id>` 200, `GET /reports/<scan>` 200. Token of a user in `org-qa-b`: the same, org A's data returned.** See BE-20. |

Org scoping on projects/scans/uploads is done correctly (every query filters on the user's org, upload folder is keyed by a hash of the org id). The problem is that everyone is put into the same org (BE-19) and findings are not scoped at all (BE-20).

### 3. JWT (against `/auth/me`)

| Token | Result |
|---|---|
| valid | 200 |
| `alg=none`, `alg=NONE` | 401, 401 |
| payload tampered (`sub` swapped, old signature) | 401 |
| truncated signature | 401 |
| expired, signed with the real key | 401 |
| signed with the old default `development-only-change-this-secret` | 401 |
| signed with the `.env.example` placeholder | 401 |
| HS384 with the right key | 401 (algorithm is pinned to HS256) |
| `sub` = integer / unknown uuid / `' OR '1'='1` | 401 / 401 / 401 |
| header with `jku` pointing to an external URL, bad signature | 401 |
| `Basic <token>`, token in `?access_token=` | 401, 401 |
| lowercase `bearer <token>` | 200 (fine) |
| **signed with the real key, no `exp` claim** | **200** (BE-24, needs the secret, so Low) |
| lifetime of a normal token | 30 minutes |

### 4. Uploads

| Probe | Result |
|---|---|
| `../../evil.zip`, `..\..\evil.zip`, `/etc/passwd.zip` | 201, response filename is the base name only, nothing outside the upload dir |
| `a.zip\x00.txt`, `evil.txt`, `noext` | 400 `Only .zip files are allowed` |
| text named `evil.zip`, truncated zip, HTML named `html.zip` | 400 `File is not a valid ZIP`, file deleted |
| `evil.ZIP`, `shell.php.zip`, 400 char name | 201 (accepted, name sanitised and cut to 100 chars) |
| 200 MB of zeros / 201 MB / 260 MB | 400 not a ZIP / **413** `File too large` / 413. No leftover files on disk (all names are 36 char uuid + `.zip`). |
| zip bomb, 199 KB that expands to 200 MB | 201 accepted (upload does not look inside; this is the ingestion item ING-01 owned by Hima Bindu, not a backend upload bug) |
| file modes | folder 0755, files 0644 (fine for a single-user desktop box, but should be 0700/0600 on a shared machine, Info) |

### 5. CORS from an evil origin

See BE-07 above. `http://evil.example`, `null`, look-alike hostnames: 400, no `access-control-allow-origin`. Credentials flag is `true` only for the three listed origins (the `access-control-allow-credentials: true` header also appears on the 400 responses, inert without ACAO).

### 6. Error messages

No 500 and no traceback in the server log (0 "Traceback" lines) across about 30 malformed inputs (broken JSON, SQL injection strings in name/id/query, NUL byte, 4 byte emoji, 5 MB body, wrong content type, traversal in path). No SQL, stack frames or absolute paths in any response. Two leaks:
- 422 bodies echo the submitted value in `"input"`, including the password field: `POST /auth/register` with `Sh0rt-pw` returns `{"detail":[{"type":"string_too_short","loc":["body","password"],...,"input":"Sh0rt-pw",...}]}` (BE-23).
- `/redis/ping` error text includes host and port (BE-22).
- Minor: a project name containing a NUL byte is accepted and stored (201).

### 7. Login / registration

See BE-17. No lockout in 40 attempts, common passwords accepted, 409 reveals existing emails, role/org mass assignment ignored, passwords stored as argon2 (checked yesterday, hasher unchanged).

## New issues

Numbering continues from yesterday (BE-18 and INT-14 were the last used). Severity, branch@commit, file:line, owner, label.

**BE-19 High (Branch bug): every self-registered user joins the same default organization, so organization scoping gives no isolation.**
`aakash-port @ 239761f`, `backend/app/api/v1/routes/auth.py:14` (`DEFAULT_ORGANIZATION_ID = "org-default-001"`) and `:58-65` (register assigns it to every new user). Same on `foundation` @ d56a7c9. Owner: Amrutha (auth), with Aakash (scoping).
Evidence: registered users A and B with ordinary `POST /auth/register`, A created a project, upload and scan. B (and a third fresh user) got 200 on `GET /projects/{A's id}` and `GET /scans/{A's scan}`, saw A's project in the list, and cancelled A's scan (200 CANCELLED). Only after I moved B to `org-qa-b` with SQL did B get 404 on all of it. Combined with open registration (BE-17c) anyone who can reach the port gets read and cancel access to the default org's data, including the seeded admin's.
Expected: a new user either gets a new organization of their own, or registration needs an invite/admin, or the first user becomes the owner and later users need approval. Actual: shared org.
Fix: decide the model with Pushpam and Aakash (one org per desktop install is fine if registration is closed after the first user; otherwise create an org on register). Add a test with two registered users that expects 404.

**BE-20 High (Branch bug): findings and reports routers have no authentication and no organization filter.**
`backend/sathwik-findings @ fd856c3`, `backend/app/api/v1/findings.py:11-48`, `backend/app/api/v1/reports.py:11-27`, queries in `backend/app/services/finding_service.py:11-80` (no `Depends(get_current_user)`, SQL has no join to scans/projects/organization). Owner: Sathwik.
Evidence: merge-tree of aakash-port + sathwik is clean but does not wire the routers. I mounted them on the merged app (QA runner, scratch) on Vamsi's schema. `GET /findings`, `GET /findings/<id>` and `GET /reports/<scan id>` returned org A's data with no token at all, and with the token of a user from `org-qa-b` (3 of 3 fixture rows, report counts included).
Expected: 401 without a token, 404 for another org's finding or scan, list limited to the user's org. Actual: open to anyone.
Fix: import `get_current_user` and `get_user_organization_id` from `app.api.v1.routes.auth`, join `findings -> scans -> projects` and filter by `projects.organization_id`, return 404 (not 403) for foreign ids. Add a test with two orgs.

**BE-21 Medium (Integration risk): the schema and seed on aakash-port and foundation are the old ones, so BE-13 and BE-14 are still live on the branch that will be demoed.**
`backend/aakash-port @ 239761f`, `database/schema.sql` (findings table) and `database/seed.sql:16-30`. Owners: Vamsi (has the fix on `vamsi`) and Aakash/Amrutha (base branch). Evidence: the findings table has no `explanation` and no `is_development`, and `confidence` is `VARCHAR(50)`; the seed still has 41 and 39 character ids and aborts with error 1406 after loading only the organizations. Vamsi fixed both on `vamsi` @ c4df60c. Expected: the base branch carries the current `database/` folder. Fix: take Vamsi's `database/` into the base branch before the findings route is wired (see INT-15 for what must not come along).

**BE-22 Medium (Branch bug): `/redis/ping` needs no login and leaks internals.**
`aakash-port @ 239761f`, `backend/app/api/v1/redis_test.py:9-16`, included unconditionally in `backend/app/api/v1/router.py:10`. Owner: Aakash.
Evidence: no token gives 200 `{"redis":"ok","queue_length":15}`; with Redis down 503 `Redis unavailable: Error 61 connecting to 127.0.0.1:6380. Connection refused.` (host, port and driver error). Not a secret by itself but it tells an unauthenticated caller how many scans are queued and where Redis is.
Expected: 401 without a token, generic 503 text, or remove the route from the release build (the file is named `redis_test`). Fix: add `Depends(get_current_user)` (or drop the router outside development) and return `"Redis unavailable"` only.

**BE-23 Low (Branch bug): 422 responses echo the submitted input, including passwords.**
`aakash-port @ 239761f`, FastAPI default validation handler in `backend/app/main.py` (no custom handler); visible on `/auth/register` and `/auth/login`. Owner: Amrutha.
Evidence: `POST /auth/register {"password":"Sh0rt-pw"}` returns 422 with `"input":"Sh0rt-pw"`. A 5 MB description comes back in full inside the error body (response amplification). Expected: error entries without `input`. Fix: a `RequestValidationError` handler that drops `input` and `ctx`.

**BE-24 Low (Branch bug): the token is not required to carry `exp`.**
`aakash-port @ 239761f`, `backend/app/api/v1/routes/auth.py:32` (`decode(..., algorithms=[...])` without `options={"require": ["exp", "sub"]}`). Owner: Amrutha.
Evidence: a token signed with the real key and no `exp` is accepted (200). Needs the secret to forge, so only a defense-in-depth gap: if a future code path ever signs without `exp` the token would live forever. Fix: add the `require` option.

**BE-25 Low (Branch bug): README and API doc describe a header the code does not send.**
`aakash-port @ 239761f`, `backend/README.md` ("`X-Queue-Status` (`enqueued` or `deferred`)"), `docs/api-projects-scans.md:44`; `backend/app/api/v1/scans.py` sets no such header and returns 503 instead of 201 when the queue is down. Evidence: `POST /scans` 201 response has no `x-queue-status`. The README also still says "Redis enqueue is best-effort, so a scan record can be created while Redis is unavailable", which is the old behaviour. Owner: Aakash. Fix: update both docs to the 503 behaviour (UI team needs to handle it).

**BE-26 Low (Branch bug): failed enqueue leaves a FAILED scan row and the uploaded file for every retry.**
`aakash-port @ 239761f`, `backend/app/api/v1/scans.py:36-44`. Owner: Aakash. Evidence: with Redis down, one 503 left one FAILED scan with `completed_at` set. Retrying 5 times gives 5 FAILED rows in the scan list. Fix: either delete the row on enqueue failure and return 503, or keep it and let the UI show it; decide and document. Low because it is honest data, but the history gets noisy.

**INT-15 High (Integration risk): Vamsi's branch and the merged backend disagree on the database package.**
`aakash-port @ 239761f` vs `vamsi @ c4df60c`. Owners: Vamsi and Aakash/Amrutha (team agreement).
Evidence: `git merge-tree --write-tree aakash-port vamsi` conflicts in `backend/app/core/database.py` (aakash-port: settings-based MySQL engine, `app.models.Base`; vamsi: its own `get_db`, defaults to `postgresql+psycopg2://postgres@localhost:5432/pqc_security`, imports `python-dotenv` which is in nobody's requirements) and `backend/.env.example` (add/add). Vamsi also now ships `schema_postgres.sql` and `seed_postgres.sql`, but the product and every other branch is MySQL. Vamsi's `schema.sql`/`seed.sql`/`models.py` are the ones that fix BE-13 and BE-14, so they must go in, but his `backend/` folder must not.
Expected: one `database.py`, one engine, MySQL only, schema and seed from Vamsi, backend folder owned by the app branch. Fix: agree that Vamsi pushes only `database/` (and not `backend/app/core/database.py`), delete the Postgres files or move them to a separate, clearly labelled folder, and have Aakash/Amrutha rebase onto his `database/`.

**INT-16 Medium (Waiting on merge): findings and reports are not wired into the merged app.**
`aakash-port @ 239761f` `backend/app/api/v1/router.py:6-10`; `sathwik-findings @ fd856c3`. Owners: Aakash/Amrutha (router) and Sathwik (routers). Evidence: the clean merge tree 072ef7f has no `/findings` or `/reports` in `/openapi.json`; the 20+ findings/report tests are BLOCKED on aakash-port. Fix: after BE-20/BE-21 are done, add the two routers to `api_router`. The BLOCKED state is correct until then.

**INT-17 Low (Integration risk): suite and app disagree on the upload location.**
`aakash-port @ 239761f` `backend/app/services/storage_service.py:27-30` (uploads in `<UPLOAD_DIR>/<sha256 of org id>/`), `tests/backend/test_uploads.py:89` (expects `<UPLOAD_DIR>/<id>.zip`). Owner: Aakash (confirm the layout) and Pushpam (update the test). Not an application defect, listed so nobody reads the 1 failing test as a regression. Also the Day 1 doc and the ingestion code that reads `repository_path` must follow the same layout (the DB stores the absolute path, so ingestion is not affected).

## Count of findings by label

Counted per open or fixed item, using the first label when a row has two.

| Label | Open | Fixed or resolved | IDs |
|---|---|---|---|
| Branch bug | 12 (7 new) | 7 | Open: BE-19, BE-20, BE-22, BE-23, BE-24, BE-25, BE-26 (new); BE-09, BE-10 on aakash-scan, BE-17, BE-18, SEC-10. Fixed: BE-01 (projects, uploads, scans), BE-02, BE-06, BE-10 (aakash-port), BE-12, INT-12, SEC-09 |
| Integration risk | 6 (3 new) | 1 | Open: BE-21, INT-15, INT-17 (new); BE-13, BE-14/seed, BE-15. Resolved: INT-03 |
| Waiting on merge | 4 (1 new) | 1 | Open: INT-16 (new); BE-16 wiring, BE-07 on aakash-scan, BE-01 on standalone aakash-scan and sathwik. Fixed: BE-07 on aakash-port and foundation |

## Things that held up

- No 500s, tracebacks, SQL, or absolute paths anywhere in the responses during ~100 hostile requests.
- JWT handling: algorithm pinned, none/tampered/expired/old-secret tokens all 401, sub type and unknown subject checked.
- Cross-organization access on projects, scans, uploads and cancel is blocked once users are in different orgs; the org is never read from the request body; upload ids from another org give 404.
- Upload: only `.zip`, size cap 200 MB enforced while streaming (413), invalid ZIPs removed, server-generated names, filename sanitised in the response, per-org folder keyed by a hash.
- Redis down returns 503 (aakash-port) and the scan is marked FAILED; cancel removes the id from the queue; double cancel 409.
- Seed admin cannot log in with the bcrypt hash but gives a clean 401, not 500.

## Cleanup

Uvicorn processes on 8011 to 8019 stopped (only the ones I started). Containers `qa-be-mysql` and `qa-be-redis` removed. All databases, uploads, runners, logs and the extracted merge tree lived in the session scratchpad `.../scratchpad/be` and were deleted. `git merge-tree --write-tree` writes a few unreferenced tree objects into the shared `.git` object store (no branch, ref or worktree file is changed; `git gc` removes them). Ports 6379, 5433 and the sahayak containers were not touched. `git status --porcelain --ignored` is clean in `.worktrees/aakash`, `.worktrees/aakash-port`, `.worktrees/foundation`, `.worktrees/sathwik` and `.worktrees/vamsi`. Nothing committed or pushed; this report is the only new file and it is not staged.
