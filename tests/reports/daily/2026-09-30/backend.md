# Backend API retest, raw results

- Date: 2026-09-30, QA branch `qa/pushpam`, tester: Pushpam
- Suite: `tests/backend/` (run over HTTP only, no application code imported)
- Targets (read-only worktrees, all `git status` clean before and after):

| Backend | Branch / commit | Owner | Served on | Database |
|---|---|---|---|---|
| Projects, uploads, scans, redis | `backend/aakash-scan` @ 7ce9382 | Aakash | 127.0.0.1:8001 (SQLite), 127.0.0.1:8006 (MySQL) | SQLite temp file, then throwaway MySQL 8.0 |
| Foundation (health, auth, CORS) | `backend/foundation` @ 46519fb | Amrutha | 127.0.0.1:8003 | throwaway MySQL 8.0 on 127.0.0.1:3307 |
| Findings and reports | `backend/sathwik-findings` @ 8d6c278 | Sathwik | 127.0.0.1:8005 through a QA runner | same throwaway MySQL |

Python 3.10 venv. For Amrutha's branch I installed `pydantic-settings`, `pwdlib[argon2]`, `python-jose[cryptography]` and `email-validator` (from its `requirements.txt`). Her README asks for Python 3.11, it ran fine on 3.10.

## How I ran it

```bash
# Aakash, SQLite + Redis
docker run -d --name qa-redis-backend -p 127.0.0.1:6380:6379 redis:7-alpine
cd .worktrees/aakash/backend
PYTHONDONTWRITEBYTECODE=1 DATABASE_URL=sqlite:///<tmp>/qa.db UPLOAD_DIR=<tmp>/uploads \
  REDIS_URL=redis://127.0.0.1:6380/0 ../../../.venv/bin/uvicorn dev_main:app --host 127.0.0.1 --port 8001
PQC_UPLOAD_DIR=<tmp>/uploads PQC_API_URL=http://127.0.0.1:8001 .venv/bin/pytest tests/backend -v -rs -rx

# Aakash again, on MySQL (same code, DATABASE_URL=mysql+pymysql://...@127.0.0.1:3307/pqc_security, port 8006)

# Amrutha, needs MySQL (there is no SQLite path: models come from database/models.py and schema.sql)
docker run -d --name qa-mysql-backend -p 127.0.0.1:3307:3306 -e MYSQL_DATABASE=pqc_security \
  -e MYSQL_USER=pqc -e MYSQL_PASSWORD=<throwaway> -e MYSQL_ROOT_PASSWORD=<throwaway> \
  -v .worktrees/foundation/database/schema.sql:/docker-entrypoint-initdb.d/01_schema.sql:ro mysql:8.0
cd .worktrees/foundation/backend
PYTHONDONTWRITEBYTECODE=1 DATABASE_URL=mysql+pymysql://pqc:<pw>@127.0.0.1:3307/pqc_security \
  ../../../.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8003
PQC_API_URL=http://127.0.0.1:8003 .venv/bin/pytest tests/backend -v -rs -rx

# Sathwik: no main.py, so a runner outside the repo (scratchpad) puts .worktrees/sathwik/backend on sys.path,
# supplies a stand-in app.core.database.get_db, mounts findings.router and reports.router under /api/v1
uvicorn run_sathwik:app --host 127.0.0.1 --port 8005
PQC_API_URL=http://127.0.0.1:8005 .venv/bin/pytest tests/backend -v -rs -rx --deselect tests/backend/test_api_security.py
```

I mounted the schema only (no seed) because the seed fails on a fresh MySQL, see BE-14. For the findings run I applied the additive `ALTER TABLE findings ADD COLUMN explanation TEXT NULL AFTER evidence;` from Sathwik's doc in my throwaway DB, and inserted three rows whose titles start with `[QA FIXTURE - NOT A REAL FINDING]`, plus one fixture project and two fixture scans (one COMPLETED, one QUEUED). Nothing in the repo was changed for this.

## Test changes

Changes I made so the suite matches the real contract and stays branch independent:

- `backend_helpers.py`: new `unknown_id_like(sample_id)`. Project ids are UUID strings now, yesterday's tests used integers. The helper copies the shape from a real project id, so the same test works on either.
- `test_projects.py`, `test_scans.py`: unknown-project cases use that helper. New tests: `test_project_id_is_uuid_string` (the agreed contract, INT-01) and `test_project_ids_are_unique_and_not_guessable`.
- `test_auth.py`: emails now use `@example.com` (email-validator rejects `.test`, that was a test bug and made valid registrations return 422). New checks: no password or hash in the register response, role mass-assignment, case-variant duplicate email, short and overlong passwords, common password (xfail, FINDING), alg=none token, bad-signature token, token forged with the secret that is in the repo, expired token, malformed `Authorization` headers, generic login error body.
- `test_api_security.py`: CORS is now one parametrized test per desktop origin (`tauri://localhost`, `http://tauri.localhost`, `http://localhost:5173` which is the `devUrl` in `desktop/src-tauri/tauri.conf.json`, and `http://localhost:1420` as an xfail info case) plus a rejection test for `http://evil.example`, `null` and look-alike hostnames. I removed one over-strict assertion (`Access-Control-Allow-Credentials: true` without an Allow-Origin is inert, so it is not a defect).
- `test_findings_reports.py`: the required field set now includes `explanation`. Severity values are lower case (the DB ENUM and Sathwik's contract, and `INFO` does not exist in it), compared case-insensitively. New: combined filters, invalid category, injection payloads in `severity`, contract validation for every returned record (UUID id, enums, relative path, `line_number >= 1` or null), detail equals list entry, report totals reconcile with `/findings`, report injection ids, and an xfail for missing pagination.

## Results per backend

| Backend | Passed | Failed | Skipped (Blocked) | XFail |
|---|---|---|---|---|
| Aakash, SQLite + Redis (:8001) | 100 | 8 | 63 | 8 |
| Aakash, MySQL + Redis (:8006) | 98 to 100 | 8 to 10 (see BE-15) | 63 | 8 |
| Aakash, Redis stopped (scans, projects, uploads only) | 82 | 3 | 0 | 0 |
| Amrutha foundation, MySQL (:8003, default JWT secret) | 53 | 1 (+1 more when the key is not set, see below) | 123 | 2 |
| Amrutha foundation with `JWT_SECRET_KEY` set to a random value | 53 | 1 | 123 | 2 |
| Sathwik, schema as delivered (no `explanation` column) | 30 | 14 | 132 | 3 |
| Sathwik, after the documented ALTER, `test_api_security.py` deselected | 24 | 0 | 122 | 1 |

Notes on the numbers:

- Yesterday's comparable run on Aakash was 12 failed, 86 passed. The suite has grown (176 tests now) and the skip count is higher mostly because /health, /auth and the CORS test now count separately per branch.
- Foundation with the default secret: 2 failed (`test_security_headers_present` and `test_me_rejects_token_signed_with_repo_default_secret`). With a real secret set the second one passes. That is the whole point of BE-12.
- Sathwik "as delivered" failures: 4 are CORS and headers tests, which fail only because my runner has no middleware (there is no app entrypoint), so I treat them as not applicable. The other 10 are all the `explanation` column 500 (BE-13). That is why I deselect `test_api_security.py` for the second Sathwik run.
- The rest of the skips are endpoints the branch does not have (for example no `/projects` on foundation), reported as `BLOCKED:`.
- Aakash on MySQL needs the organization row `org-default-001` in the DB. The seed creates it, my schema-only DB did not, so I inserted it by hand.

Failures on Aakash (same list on SQLite and MySQL):

| Test | Defect |
|---|---|
| `test_cors_allows_desktop_origin` x3 | BE-07, no CORS middleware in `dev_main.py` |
| `test_responses_contain_no_absolute_paths`, `test_scan_response_has_no_absolute_server_path` | BE-02 |
| `test_security_headers_present` | BE-09 |
| `test_upload_path_traversal_filename`, `test_upload_backslash_traversal_filename` | BE-06 |

## Yesterday's defects, one by one

| ID | Sev | Verdict | Evidence |
|---|---|---|---|
| BE-01 no auth on any endpoint | High | **Not fixed** (partly started) | Auth exists on Amrutha's branch (`/auth/register`, `/login`, `/me`, 401 without token). But no route on Aakash's or Sathwik's branch requires it: `curl -si localhost:8001/api/v1/projects` gives `HTTP/1.1 200 OK`, and `/redis/ping` gives 200 `{"redis":"ok","queue_length":73}`. The bearer check lives inline in `/auth/me`, there is no reusable `get_current_user` dependency to apply to the other routers. The 7 XFail tests stay XFail. |
| BE-02 absolute path in scan JSON | Medium | **Not fixed** | `POST /scans` returns `"repository_path":"/private/tmp/.../uploads/5e59fbdc-....zip"` (201). |
| BE-03 empty / whitespace name | Medium | **Fixed** | `{"name":""}` and `{"name":"   "}` both 422 `String should have at least 1 character`. |
| BE-04 no length limits | Medium | **Fixed** | 300 char name gives 422 `at most 255 characters`; 2 MB description 422 (max 10000). |
| BE-05 500 on huge integer ids | Medium | **Fixed** | Ids are UUID strings now. `GET /projects/1000000000000000000000000000000` gives 422 pattern mismatch. `POST /scans` with a huge `project_id` gives 422. No 500 in the log. |
| BE-06 upload echoes raw filename | Low | **Not fixed** | `curl -F 'file=@a.zip;filename=../../evil.zip' .../uploads` returns 201 `"filename":"../../evil.zip"`. The file is still stored as `<uuid>.zip`, nothing escaped the upload dir. |
| BE-07 no CORS for Tauri origins | Medium | **Fixed on foundation, not fixed on Aakash** | Foundation preflight: `tauri://localhost` gives `access-control-allow-origin: tauri://localhost`, `http://tauri.localhost` likewise, `http://localhost:5173` likewise, `http://evil.example` gives 400 with no ACAO. Aakash's `dev_main.py` still has no CORS middleware (no ACAO header for `tauri://localhost`). Note `http://localhost:1420` is rejected, the repo's `devUrl` is 5173 so I treat that as info. Fix will land once the two are combined into one app (BE-16). |
| BE-08 (info, things that held up) | Info | Still holds | Error bodies have no traces or paths, evil Origin gets no ACAO, injection strings are inert. |
| BE-09 no `nosniff`, server header | Low | **Not fixed** | Same on Aakash and foundation: response headers are only `date, server: uvicorn, content-length, content-type`. |
| BE-10 Redis down, scan still QUEUED | Low | **Not fixed** | Stopped Redis: `POST /scans` returns 201 `"status":"QUEUED"`, uvicorn log has no warning at all, `/redis/ping` returns 503 `Redis unavailable: Error 61 connecting to 127.0.0.1:6380. Connection refused.` (still echoes host and port). `enqueue_scan` still returns `False` and the caller ignores it. Scan creation itself does not depend on Redis (only the 3 known BE-02/BE-06 failures in that run). |
| BE-11 endpoints missing (delivery gap) | Info | **Partially fixed** | `/health` and `/auth/*` now exist (Amrutha). `/findings`, `/findings/{id}` and `/reports/{scan_id}` exist as routers (Sathwik) but there is no app that serves them, and none of the three backends serves all the routes. See BE-16. `dev.db`, uploaded ZIP and `.pyc` files are gone from Aakash's tree (`git ls-files` shows none, `backend/.gitignore` added). |
| INT-01 UUID / org mismatch, 500 on create project | Critical | **Fixed** (with a condition) | Aakash's backend on MySQL 8.0 with the shared schema: `POST /projects` 201 with a UUID id, scans and uploads work, `GET /projects`, `GET /scans` return 200, no `IntegrityError`. Condition: the organization `org-default-001` has to exist, which relies on the seed, and the seed aborts partway on a fresh DB (BE-14). |
| INT-02 `create_all` silently skips existing tables | High | **Fixed** | `dev_main.py` now only calls `create_all` when the dialect is SQLite, so on MySQL a mismatch fails loudly. |
| INT-03 scan `status` free text in model | Medium | **Partially fixed** | Model still `Column(String(20))`, unchanged. On MySQL the DB ENUM enforces the values and the API only writes `QUEUED` and `CANCELLED`. On SQLite nothing enforces it. All listed statuses were in the allowed set in every run. |
| INT-04 no /health or auth | Medium | **Fixed on foundation** | `GET /api/v1/health` gives 200 `{"status":"healthy"}`, POST gives 405, no sensitive fields. Auth results below. Caveat: not wired into the same app as projects/scans, see BE-16. |
| INT-06 cancel does not check state | Low | **Fixed** | `FINAL_STATES` check, `POST /scans/{id}/cancel` a second time returns 409 `Scan already CANCELLED`. `test_cancel_twice_409` passes. |
| SEC-01 / INT-05 `dev.db`, uploaded ZIP, `.pyc` committed | High | **Fixed** (Aakash branch) | `git ls-files` on the worktree has no `dev.db`, `storage/uploads/*` or `__pycache__`. The worktree is clean after running the server (I used `PYTHONDONTWRITEBYTECODE=1`, DB and uploads in a temp dir). |

## Amrutha's foundation, detail

| Check | Result | Evidence |
|---|---|---|
| Health | Pass | `GET /api/v1/health` 200 `{"status":"healthy"}` |
| Register valid | Pass | 201 `{"id":"4e8a733e-...","organization_id":null,"email":"qa.ret8146@example.com","role":"user","created_at":"...","full_name":"qa.ret8146"}`, no password field |
| Register duplicate | Pass | 409 `{"detail":"Email is already registered"}`, also for an upper-cased variant of the same address |
| Weak password | Partial | `"short"` gives 422 `String should have at least 12 characters`. Only a length rule: `password1234` is accepted (xfail, BE-17). 1 MB password gives a client error, no 500. |
| Login valid | Pass | 200 `{"access_token":"eyJhbGciOiJIUzI1NiIs...","token_type":"bearer"}` |
| Login wrong password / unknown user | Pass | 401 `{"detail":"Invalid email or password"}`, same body for both |
| `/me` valid token | Pass | 200 user object |
| `/me` no token | Pass | 401 `{"detail":"Not authenticated"}` |
| `/me` garbage token | Pass | 401 `{"detail":"Invalid or expired access token"}` |
| `/me` alg=none, wrong signature, expired, `Basic ...` header | Pass | all 401 |
| Password hashing | Pass | DB column starts `$argon2id$v=19$m=65536,t=3,p=4$...` for every row, no plaintext |
| Role mass assignment | Pass | extra `role: admin` in the body is ignored, response role is `user` |
| SQL injection in login | Pass | 422 (email validation) |
| CORS Tauri origins | Pass for 2 of 3 requested | `tauri://localhost` and `http://tauri.localhost` allowed. `http://localhost:1420` gets 400. `http://localhost:5173` (the real devUrl) allowed. |
| CORS `http://evil.example`, `null`, look-alike hosts | Pass | 400, no ACAO |
| JWT secret handling | **Fail** | BE-12 |
| Brute force | Not protected | 30 wrong logins in a row, all 401, no delay or lockout (BE-17) |

## New defects

**BE-12 High: JWT signing key has a hardcoded default, and the server starts with it silently.** Owner: Amrutha.
`backend/app/core/config.py`: `jwt_secret_key: str = "development-only-change-this-secret"`. `.env.example` also ships `replace-this-with-a-long-random-local-secret`. Nothing checks at startup that it was changed.
Repro: start without `JWT_SECRET_KEY` (no `.env`), register and log in, then sign an HS256 token by hand with the key from the repo and `sub` = the user id:
`curl -si localhost:8003/api/v1/auth/me -H "Authorization: Bearer <forged>"` gives `HTTP/1.1 200 OK` and the user JSON.
Expected 401. Actual 200, so anyone who has read the repo can impersonate any user id on any install that forgot the env var. With `JWT_SECRET_KEY=$(openssl rand -hex 32)` the same forged token is rejected.
Fix: no default value; refuse to start if the key is missing, shorter than 32 bytes or equal to either literal in the repo. For the desktop build, generate a random key on first launch and keep it in the OS keychain or a user-only file. Test: `test_me_rejects_token_signed_with_repo_default_secret`.

**BE-13 High: `/findings` and `/findings/{id}` return 500 against the current schema.** Owner: Vamsi (schema) with Sathwik.
Sathwik's SQL selects `findings.explanation`. `database/schema.sql` (on `backend/foundation` and `vamsi`) has no such column. His own doc says to apply `ALTER TABLE findings ADD COLUMN explanation TEXT NULL AFTER evidence;` but nobody has.
Repro: run his routers on the schema as delivered: `curl -si localhost:8005/api/v1/findings` gives `HTTP/1.1 500 Internal Server Error`; log has `OperationalError (1054, "Unknown column 'explanation' in 'field list'")`. `/reports/{scan_id}` still works (it does not read that column).
Expected 200 `[]`. Actual 500. After the ALTER everything passes (24 passed, 0 failed).
Fix: add the column to `schema.sql`, `models.py` and the findings writer in the same change.

**BE-14 Medium: `database/seed.sql` aborts on a fresh MySQL, the rest of the seed is not loaded.** Owner: Vamsi.
Seed user id `usr-admin-00000000-0000-0000-000000000001` is 41 characters, the column is `CHAR(36)`. Docker init log: `ERROR 1406 (22001) at line 16: Data too long for column 'id' at row 1`. The demo project id `prj-demo-banking-0000-0000-000000000001` is 39 characters. Same file on `vamsi` @ fca83d5 and `backend/foundation`.
Effect: only the two organizations are created; no admin user and no demo project. Anyone starting from `docker compose up` with a clean volume gets a partial DB. Fix: use real UUIDs in the seed (and mark the seed password hash as a placeholder).

**BE-15 Low: "newest first" is not guaranteed on MySQL.** Owner: Aakash and Vamsi.
`created_at` is `DATETIME` with no fractional seconds, `ORDER BY created_at DESC` has no tie-break and ids are random UUIDs. Two projects or scans created in the same second come back in arbitrary order. On MySQL `test_list_projects_newest_first_and_contains_new` and `test_list_scans_newest_first` failed in about half of the runs (SQLite is fine, it keeps microseconds). Fix: `DATETIME(6)` in `schema.sql` and models, or an auto-increment sequence column for ordering.

**BE-16 Medium: no single app serves the whole Day 1 API.** Owner: Amrutha (app wiring) with Aakash and Sathwik.
Aakash's `dev_main.py` has projects/uploads/scans/redis but no health, auth or CORS. Amrutha's `main.py` has health, auth and CORS but no projects or scans. Sathwik has routers only. Result: the desktop UI cannot use one base URL, and the auth dependency cannot be applied to anything (BE-01). Fix: one `app.main` that includes every router under `/api/v1`, one CORS block, one `get_current_user` dependency (extract it from `/auth/me`) applied to all routers except `/health`, `/auth/register`, `/auth/login`.

**BE-17 Low: registration and login hardening gaps.** Owner: Amrutha.
(a) Only a 12 character minimum: `password1234` is accepted. (b) 30 wrong logins in a row all return 401, no delay, lockout or rate limit. (c) `/auth/register` is open to anyone who can reach the port and creates users with `organization_id` null. Fine for a loopback-only desktop app today, worth a decision before release. Fix: reject a small list of common passwords, add per-address back-off, decide whether registration should close after the first user.

**BE-18 Info: findings query naming is easy to misread.** Owner: Sathwik, Hema.
The `category` query parameter filters on the `engine` field (`sast|crypto|dependency|configuration`), while the `category` field in the response is a different value (for example `weak-hash`). Documented in his doc, but the UI will read them as the same thing. Also the API is lower case only (`severity=HIGH` gives 422) and has no `info` severity, and `GET /findings` has no pagination (xfail test). Not a defect today, listed so Hema and Sathish know.

## Things that held up

- Findings and reports: unknown finding id 404 `{"detail":"Finding not found"}`, path traversal id 404, invalid `severity`/`category` (including `BANANA`, quote and semicolon payloads, NUL) 422, `/reports/nope` 404 `{"detail":"Scan not found"}`, a QUEUED scan gives 200 with zero counts and status `QUEUED`, totals reconcile with `/findings` (COMPLETED fixture scan: 1 critical, 1 high, 0 medium, 1 low, total 3). The finding record carries all agreed fields (`finding_id, engine, category, severity, title, file_path, line_number, evidence, confidence, recommendation`) plus `explanation` and `scan_id`; nullable ones return `null`. The router does not fabricate findings.
- Upload handling on Aakash is unchanged and good: non-ZIPs, fake, truncated and HTML polyglot files rejected, 201 MB upload gets 413, server-generated names.
- Error responses on all three backends contain no traces or absolute paths.

## Cleanup

Servers on 8001, 8003, 8005, 8006 stopped. Containers `qa-redis-backend` and `qa-mysql-backend` removed. Temp DB, uploads, logs and the Sathwik runner (all under the session scratchpad) deleted. Ports 8000, 8002, 8004, 3306, 6391 and 4173 were not touched. `git status` is clean, including ignored files, in `.worktrees/aakash`, `.worktrees/foundation` and `.worktrees/sathwik`. Nothing committed or pushed.
