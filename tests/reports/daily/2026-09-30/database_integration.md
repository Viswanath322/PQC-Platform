# Retest: Database and Cross-Branch Integration - Raw Results

Tester: Pushpam (QA) - branch `qa/pushpam` - 2026-09-30
Branches under test (read-only worktrees, nothing fixed in teammate code):
- Vamsi `fca83d5` "bind mysql/redis to 127.0.0.1, update .gitignore for db/tauri, unify on UUID standard with dual org seed"
- Aakash `7ce9382` "Switch project ids to UUID, add validation, remove committed artifacts"
- Amrutha (foundation) `46519fb` (/health, /auth, own `database/` and `docker-compose.yml`)

## Verdict

**The Day 1 flow now works end to end on MySQL** (create project, upload ZIP, create scan `QUEUED`, row in MySQL, id in the Redis queue, cancel) when Aakash's backend runs against Vamsi's schema. INT-01 is fixed. It only holds with `REDIS_URL` carrying the new Redis password, the seed script still crashes on first boot (DB-09), and login/health live in Amrutha's separate backend, which cannot be merged with Aakash's as it stands (INT-09).

## Environment
- `docker-compose` v5.3.1 standalone (no `docker compose` plugin). Project name `qa-vamsi`.
- Host port 6379 is held by an unrelated container, so Redis was published on **6391** through an override file kept outside the repo (`ports: !override ["127.0.0.1:6391:6379"]`). MySQL used 3306. Redis URL for tests: `redis://:change_me_locally@127.0.0.1:6391/0` (Vamsi added `--requirepass`).
- Python 3.10 venv at repo root. MySQL 8.0.46, Redis 7 (alpine).
- Ports used by me: 8002 (Aakash), 8004 (Amrutha), 3306, 6391. Nothing else touched.

## Commands
```
cd .worktrees/vamsi
docker-compose -p qa-vamsi -f docker-compose.yml -f <scratch>/override.yml down -v
docker-compose -p qa-vamsi -f docker-compose.yml -f <scratch>/override.yml up -d
docker logs pqc_mysql ; docker inspect -f '{{.RestartCount}}' pqc_mysql
../../.venv/bin/python database/verify_db.py
cd ../..
export PQC_REDIS_URL='redis://:change_me_locally@127.0.0.1:6391/0'
PQC_SCAN_ROOT=$PWD/.worktrees/vamsi .venv/bin/pytest tests/database -v -rs

# Aakash on Vamsi's MySQL
cd .worktrees/aakash/backend
DATABASE_URL=mysql+pymysql://pqc:change_me_locally@127.0.0.1:3306/pqc_security UPLOAD_DIR=<tmp>/uploads \
  REDIS_URL='redis://:change_me_locally@127.0.0.1:6391/0' ../../../.venv/bin/uvicorn dev_main:app --host 127.0.0.1 --port 8002
PQC_API_URL=http://127.0.0.1:8002 .venv/bin/pytest tests/integration -v -rs

# Amrutha on the same MySQL
cd .worktrees/foundation/backend
DATABASE_URL=mysql+pymysql://pqc:change_me_locally@127.0.0.1:3306/pqc_security ../../../.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8004
PQC_API_URL=http://127.0.0.1:8004 .venv/bin/pytest tests/integration -v -rs

# merge dry runs (read only, no working tree change)
git merge-tree --write-tree --name-only 7ce9382 46519fb      # aakash + foundation
git merge-tree --write-tree --name-only fca83d5 7ce9382      # vamsi + aakash
git merge-tree --write-tree --name-only fca83d5 46519fb      # vamsi + foundation
```
Cleanup: both uvicorn processes stopped, `docker-compose -p qa-vamsi down -v` (containers, volumes and network removed), scratch dir removed, `git status` empty in all three worktrees.

## pytest counts
| Suite | Target | Result |
|---|---|---|
| tests/database (86 tests, MySQL 8.0.46 + Redis 7) | Vamsi `fca83d5` | **74 passed, 6 failed, 2 skipped (Blocked), 4 xfailed** (yesterday: 63 / 6 / 0 / 2 of 71) |
| tests/integration (18 tests) | Aakash backend on Vamsi MySQL, :8002 | **12 passed, 5 skipped (Blocked, no health/auth on this app), 1 xfailed, 0 failed** (yesterday: 2 passed, 1 failed, 7 skipped) |
| tests/integration | Amrutha backend on Vamsi MySQL, :8004 | **4 passed, 2 failed, 12 skipped** (skips: no projects/uploads/scans on this app) |
| tests/integration, no backend | none | 1 passed, 17 skipped (all `BLOCKED: backend not reachable`) |
| tests/security/test_gitignore.py | Vamsi worktree | 8 passed |

The 6 database failures: `test_images_pinned_to_patch_or_digest` (DB-03), `test_services_have_restart_and_healthcheck` (DB-05), `test_mysql_root_password_not_same_as_app_password` (DB-04), `test_no_obsolete_version_key` (DB-06), `test_seed_data_present` (DB-09), `test_verify_db_script_passes_and_leaves_no_rows` (DB-10). The 2 skips are the seed-user checks, which are Blocked because no seeded user exists (DB-09).
Yesterday's failures for `test_ports_bound_to_loopback_only` and `test_redis_has_password_configured` and `test_redis_requires_authentication` now pass.

## Fixed / not fixed table (old IDs)
| ID | Status | Evidence |
|---|---|---|
| INT-01 (Critical) integer vs UUID ids, hardcoded org 1 | **Fixed** | Aakash models are `String(36)` uuid4 ids; `POST /api/v1/projects` returns 201 with a UUID; project row in MySQL has `organization_id='org-default-001'` and the FK resolves; scan created `QUEUED` with UUID id and matching `project_id`; list/get by project work; cancel gives `CANCELLED`. 12 integration tests pass on :8002. Residual: default org id is still hardcoded in the model (INT-14). |
| INT-02 (High) `create_all` masks mismatch | **Partially fixed** | `dev_main.py` now runs `create_all` only for SQLite, so MySQL is never silently reshaped. There is still no startup schema check, so a mismatch would still only show on the first request. |
| INT-03 (Medium) status is free text | **Not fixed** | `models/scan.py` still `status = Column(String(20))`, route uses string literals. Only the DB ENUM guards it. |
| INT-04 (Medium) no health/auth | **Partially fixed** | Foundation has `GET /api/v1/health` and `/auth/register|login|me`; they work on :8004 (tests 01, 02, 02b pass). Aakash's app still has neither (tests Blocked on :8002). The two apps cannot be combined as is (INT-09). |
| INT-05 (Low) generated files committed | **Fixed** | `git ls-files` on Aakash shows no `dev.db`, `.zip` or `.pyc`; `backend/.gitignore` covers `*.db`, `storage/`, `__pycache__/`, `*.pyc`, `.env`. |
| INT-06 (Low) cancel not race safe, no state machine | **Not fixed** | `cancel_scan` still sets `CANCELLED` from any non-final state with no transition table and no worker signal. A second cancel returns 409. See INT-12 for the queue side effect. |
| DB-01 (High) Redis no auth | **Fixed** | `redis-cli ping` returns `NOAUTH Authentication required.`; with `-a` it returns `PONG`. Compose has `redis-server --requirepass change_me_locally`. Caveat DB-14. |
| DB-02 (High) ports on 0.0.0.0 | **Fixed** | `docker ps`: `127.0.0.1:3306->3306`, Redis `127.0.0.1:6391->6379` (override). From the LAN address 10.108.254.103, `nc` to 3306 and 6391 is refused; loopback connects. Compose file uses `127.0.0.1:3306:3306` and `127.0.0.1:6379:6379`. |
| DB-03 (Low) images not pinned | **Not fixed** | still `mysql:8.0`, `redis:7-alpine`. |
| DB-04 (Medium) hardcoded creds, root = app password, password on healthcheck | **Not fixed** | both still `change_me_locally`; healthcheck still has `-pchange_me_locally`. |
| DB-05 (Low) no Redis healthcheck | **Not fixed** | redis block has no `healthcheck`. |
| DB-06 (Low) deprecated options | **Not fixed** | `version: '3.8'` warning on every command; logs still warn on `default_authentication_plugin` and `mysql_native_password`. |
| DB-07 (Low) verify_db leaves rows | **Not fixed** | No cleanup in the script (`finally` only closes the session). I could not observe leftover rows this time because the script now dies at step 2 (DB-10). |
| DB-08 (Low) seed ids not UUIDs, hash placeholder | **Not fixed, and worse** | Org ids `org-default-001` and `1`; user/project/finding seed ids are also non-UUID and too long for their columns (DB-09). Hash is still a bcrypt string the auth code cannot verify (INT-08). |
| SEC-03 (High) ports on all interfaces | **Fixed** | same evidence as DB-02. |
| SEC-04 (Medium) Redis no password | **Fixed** | same evidence as DB-01. |
| SEC-05 (Medium) `.gitignore` gaps | **Fixed** | `git check-ignore` matches `backend/dev.db`, `x/y.db`, `a.sqlite3`, `desktop/src-tauri/target/debug/x`, `src-tauri/target/x`, `.env`, `node_modules/x`, `backend/storage/uploads/a.zip`. `tests/security/test_gitignore.py` 8 passed. New over-blocking side effect: DB-12. |

## New defects
| ID | Severity | Title | Evidence | Expected vs actual | Suggested fix | Owner |
|---|---|---|---|---|---|---|
| DB-09 | High | `seed.sql` aborts on first boot; container crash-restarts and the dev seed is never loaded | `docker logs pqc_mysql`: `running 02_seed.sql` then `ERROR 1406 (22001) at line 16: Data too long for column 'id' at row 1`; no "init process done" line; `RestartCount` = 1 (`restart: always` brings it back up "healthy" with a half-initialised DB). Afterwards: organizations 2 rows, users 0, projects 0, scans 0, findings 0. Ids are `usr-admin-00000000-0000-0000-000000000001` (41 chars into CHAR(36)), `prj-demo-banking-0000-0000-000000000001` (39), `fnd-demo-...-000000000001` (45). With the same seed using real 36-char UUIDs the load succeeds, so the id length is the only blocker. | Expected: admin user, "Demo Banking Application", a `QUEUED` scan and 2 findings after `up -d`, no container restart. Actual: none of them exist; error is easy to miss because the container reports healthy. | Use real UUID literals in seed.sql (this also closes DB-08). Add a healthcheck query that also confirms the seed rows exist. | Vamsi |
| DB-10 | Medium | `verify_db.py` fails on a database built from the repo's own schema and seed | Exit 1: `IntegrityError (1062) Duplicate entry 'org-default-001' for key 'organizations.PRIMARY'` at step 2. It inserts both orgs with plain INSERTs, but `schema.sql` already seeds them. The same fails with a correctly loaded seed. | Expected exit 0 and `[SUCCESS]`. Actual: never gets past step 2, so the Day 1 database "definition of done" script can no longer pass. | Use get-or-create for the orgs, delete created rows in `finally`, and do not silently fall back to in-memory SQLite. | Vamsi |
| DB-11 | Low | Duplicate "Default Organization" rows (`org-default-001` and `1`) | `SELECT id,name FROM organizations` returns both; the `1` row exists only for legacy/integer compatibility | Expected one default org referenced by ID. Actual: a compatibility copy that can drift and confuses tenant logic. | Drop the `1` row now that the backend uses UUID ids. | Vamsi |
| DB-12 | Medium | `.gitignore` hides real source directories | Vamsi's `.gitignore` has `lib/`, `build/`, `dist/`, `var/`, `temp/`, `downloads/`, `parts/`, `uploads/`, `storage/`, `*.zip`. Running `git ls-tree -r origin/PQC-frontend \| git check-ignore --no-index --stdin -v` reports `.gitignore:18:lib/  desktop/src/lib/utils.ts` (same on `frontend/findings-explorer`). Already-tracked files keep working, but any new file added under `desktop/src/lib/` would be silently untracked. | Expected: ignore only build output and runtime data. | Anchor the entries (`/dist/`, `/desktop/dist/`, `/backend/storage/`), drop `lib/`, `var/`, `parts/`, `downloads/`, `temp/`, `build/` unless anchored, and scope `*.zip` to upload folders. | Vamsi |
| DB-13 | Low | ORM cascades disagree with the SQL schema (code review, not exercised) | `database/models.py`: `Organization.users` and `Organization.projects` use `cascade="all, delete-orphan"`, while the tables use `ON DELETE SET NULL`. `Project.organization_id` also defaults to the literal `'org-default-001'`. | Expected: same behaviour through ORM and raw SQL. Actual: deleting an org through SQLAlchemy would delete its users and projects (and their scans/findings), raw SQL only nulls the reference. | Use `passive_deletes=True` and no delete-orphan on those relations. | Vamsi |
| DB-14 | Low | One dev password reused for MySQL app, MySQL root and Redis, on command lines | `docker inspect pqc_redis` shows `Cmd [redis-server --requirepass change_me_locally]`; healthcheck shows `-pchange_me_locally` | Expected: separate secrets from an untracked `.env`. Actual: same value everywhere, visible in `docker inspect` and `ps`. Tolerable for local dev only. | `${REDIS_PASSWORD}` etc. from an untracked `.env` with a `.env.example`. | Vamsi |
| INT-07 | High | Login rejects the seeded admin's email domain | `POST /api/v1/auth/login {"email":"admin@pqc.local",...}` -> **422** "special-use or reserved name that cannot be used with email" (`EmailStr` in `schemas/auth.py`). `.local` addresses cannot be registered or logged in either. Test `test_02c` fails. | Expected: 401 for a wrong password, 200 for the right one. Actual: the dev admin (`admin@pqc.local`) can never sign in and `UserResponse.email: EmailStr` would also fail on reading it back. | Use `check_deliverability=False` with `email_validator.test_environment`/allow special-use domains, or plain `str` with a pattern, or move the seed to a valid domain. | Amrutha (with Vamsi) |
| INT-08 | High | Login returns 500 for users whose hash is not argon2 | Inserted a user with the seed's bcrypt hash and posted a login: **500 Internal Server Error** (`pwdlib.exceptions.UnknownHashError`; `PasswordHash.recommended()` is argon2 only). Test `test_02d` fails. | Expected: 401, or successful verification of the documented seed password. Actual: unhandled exception. | Register the bcrypt hasher too (or regenerate the seed with argon2) and catch `UnknownHashError` as an invalid login. | Amrutha (with Vamsi) |
| INT-09 | High | Aakash's and Amrutha's backends cannot be merged as they are | `git merge-tree` aakash + foundation: `CONFLICT (add/add): backend/app/core/database.py` (also with Vamsi + Aakash; Vamsi + foundation merges clean). Built a combined app in a scratch dir (foundation tree, Aakash routers and models, foundation `database.py`): import fails with `sqlalchemy.exc.InvalidRequestError: Table 'projects' is already defined for this MetaData instance`. Aakash defines its own `Project`/`Scan` (own `Base`, no `updated_at`, `status` as String) while `database/models.py` defines the same tables; entry points also differ (`dev_main:app` vs `app.main:app`, `prefix` `/api/v1` in both). | Expected: one FastAPI app with one set of models. Actual: two ORMs for the same tables and a guaranteed conflict on `core/database.py`. | Aakash deletes `models/scan.py` and imports `Project`, `Scan` from `database.models`, uses Amrutha's `core/database.py` (`get_db`), and mounts his routers in `app/main.py`. Re-run this suite on the merged branch. | Aakash and Amrutha (Vamsi to review models) |
| INT-10 | Medium | Enqueue failures are swallowed; default `REDIS_URL` has no password | With `REDIS_URL=redis://127.0.0.1:6391/0` (no password) `GET /redis/ping` -> 503 "HELLO must be called with the client already authenticated", but `POST /scans` still returns **201 QUEUED**; MySQL holds the scan, the Redis list does not. `enqueue_scan` catches `RedisError` and returns False, which the route ignores. | Expected: the caller learns the scan was not queued (or the scan is not created). Actual: a `QUEUED` scan that no worker will ever see. | Return 503 or mark the scan `FAILED` when enqueue fails; document the password in `REDIS_URL`. | Aakash |
| INT-11 | Medium | Seed-style ids cannot be used through the API | A project with id `prj-demo-banking-0000-00000000001` is listed by `GET /projects` (200) but `GET /projects/{id}` -> 422 pattern mismatch (`UUID_PATTERN`), and it cannot be used for `POST /scans` or `GET /scans?project_id=`. | Expected: every row the schema and seed allow is reachable. Actual: the demo project would be invisible to scan creation. | Fix the seed ids (DB-09) so all ids are real UUIDs, keep the API validation. | Vamsi (seed) |
| INT-12 | Medium | Cancelled scans stay in the Redis queue | After `POST /scans/{id}/cancel`, `LRANGE pqc:scan_queue` still contains the id (`test_09b` xfail). | Expected: worker never starts a cancelled scan. Actual: relies on the future worker re-checking status. | `LREM` on cancel or add the status check to the worker contract. | Aakash |
| INT-13 | Low | API docs still describe integer ids and no Redis password | `docs/api-projects-scans.md` shows `"id": 1` and `"project_id": 1`, `REDIS_URL` default without a password | Expected: docs match UUID contract. | Update examples. | Aakash |
| INT-14 | Low | Organization handling is still a default, not a relationship | Aakash `Project.organization_id` default is the literal `'org-default-001'`; Amrutha's `/auth/register` creates users with `organization_id = NULL` (verified in `users`), so users and projects are never linked to an organization. Deleting the seed org would make every project create fail with an FK 500. | Expected: projects belong to the caller's organization. | Resolve the org from the authenticated user (Day 2). | Aakash / Amrutha |

## Evidence: Day 1 flow on MySQL (Aakash :8002 against Vamsi MySQL)
- create project 201, id is a UUID; `projects` row has `organization_id='org-default-001'`, FK valid.
- upload ZIP 201, file written to `UPLOAD_DIR` as `<uuid>.zip`, non-zip refused.
- create scan 201 `QUEUED`, UUID id, `scans.project_id` equals the project id, `repository_path` ends with `.zip` (ZIP not stored in the DB).
- scan id found in Redis list `pqc:scan_queue` (Redis reached with the password).
- cancel 200 `CANCELLED`, `completed_at` set, second cancel 409.
- unknown UUID -> 404 for project and scan; integer project id and path-like `upload_id` are refused with 4xx (no 500).
- Tests clean up the rows they create (project, scan, user, queue entry).

## Evidence: Amrutha :8004 on the same MySQL
- `GET /api/v1/health` -> `{"status":"healthy"}`.
- register `qa-found@example.com` -> 201 with UUID id, `organization_id: null`; duplicate (and different case) -> 409; short password -> 422; login -> token; `/me` with token -> 200, without token 401, bad token 401; wrong password 401.
- `users` row: UUID id, `organization_id` NULL, hash `$argon2id$v=19$m=65536,t=3,p=4...` (no plaintext).
- Findings: INT-07, INT-08, INT-14.
- Vamsi and Amrutha ship byte-identical `database/schema.sql`, `seed.sql`, `models.py`, `verify_db.py`, `docker-compose.yml` and `.gitignore`, so there is no divergence between them; Amrutha inherits DB-09 to DB-14.

## Test changes made (contract moved to UUID ids)
- `tests/integration/test_day1_flow.py`: asserts UUID string ids, project org FK in MySQL, list/get by id, 404 for unknown UUIDs, bad-reference handling, scan id in Redis (`PQC_REDIS_URL`), cancel 409 on repeat and `completed_at`, cancelled scan in queue (xfail), auth register/login/me with a `example.com` address and MySQL row check, seeded-address login, foreign-hash login. Cleanup now also removes users and queue entries.
- `tests/database/test_schema.py`: UUID width check on all 11 id/FK columns, seed tests now require the seed to be fully loaded and no longer pass on an empty table, seed id check covers every table, one-default-org check.
- `tests/database/test_compose_config.py`: obsolete `version:` key, Redis password differs from MySQL.
- `tests/database/test_verify_db.py` (new): runs `database/verify_db.py` against the live DB, expects exit 0 and no leftover rows, removes leftovers itself.
- All new assertions were confirmed against the running stack: failures are product defects (DB-09, DB-10, INT-07, INT-08); I also loaded a copy of the seed with 36-character ids to make sure the rest of the seed tests behave (they passed).
