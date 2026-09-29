# Day 1 QA Report

PQC Security Assessment Platform (desktop) · Silicofeller Quantum
Pushpam, QA / security · 29 Sep 2026 · branch `qa/pushpam`

## Where we are

The Day 1 flow doesn't work end to end yet. When I pointed Aakash's backend at Vamsi's MySQL, the very first step failed: creating a project returns a 500. The backend uses integer IDs and hardcodes `organization_id=1`, while the schema uses `VARCHAR(36)` UUIDs and the only organization in the seed is `org-default-001`. So nothing after "create project" (upload, scan, `QUEUED` in MySQL) can run on the real database until that's sorted out. I've marked it Critical (INT-01).

On their own, the branches are in decent shape. Aakash's API passed 86 of my tests on SQLite, Vamsi's schema passed 63, and the frontend builds and lints cleanly.

A few other things I'd fix today:

- The UI pulls Google Fonts from the internet (`desktop/src/index.css`, line 1). For an air-gapped product that's a real defect, and the import is still there after `npm run build`.
- `backend/aakash-scan` has `dev.db`, an uploaded ZIP and a pile of `__pycache__` files committed. None of our branches has a root `.gitignore`, which is how they got in.
- MySQL and Redis are published on `0.0.0.0`, so anyone on the same network can reach them, and Redis has no password.

Good news on secrets: I didn't find any real ones on any branch, and both `pip-audit` and `npm audit` came back clean.

A lot is still Blocked because it hasn't been pushed: the Tauri shell, `/health`, auth, the findings and reports APIs, ingestion, the analysis engine base, and the Dashboard / Projects / Scans / Findings pages. The tests for those are already written, so I can run them as soon as each branch lands.

### What I'd do first

1. Aakash and Vamsi agree on one ID type (I'd go with the UUIDs already in the schema) and a real default organization. That clears INT-01 and INT-02.
2. Get a root `.gitignore` onto `main` and remove `dev.db`, the upload ZIP and `__pycache__` from `backend/aakash-scan` (SEC-01, SEC-02).
3. Sathish bundles the Inter and JetBrains Mono fonts locally instead of importing them from Google (FE-01).

## What I tested

| Branch | Commit | Owner | What I checked |
|---|---|---|---|
| `backend/aakash-scan` | `192fa3b` | Aakash | API tests, security checks, running it against MySQL |
| `vamsi` | `45b70ac` | Vamsi | Schema, constraints, Redis, compose settings, integration |
| `PQC-frontend` | `63d183c` | Sathish | `npm ci`, build, lint, pages, external calls, `npm audit` |
| `main` | `ec931f6` | | Secrets and repo hygiene |
| not pushed yet | | Amrutha, Hima Bindu, Harshitha, Sathwik, Hema, Harshith | Tests written ahead of time, reported as Blocked |

I ran everything on macOS with Python 3.10.6, Node 24.7, Docker (Colima), MySQL 8.0.46 and Redis 7 (alpine).

## Numbers

| Area | Target | Pass | Fail | Blocked | XFail | Details |
|---|---|---|---|---|---|---|
| Backend API | `backend/aakash-scan` (SQLite + Redis) | 86 | 12 | 31 | 7 | [raw/backend.md](raw/backend.md) |
| Database | `vamsi` (MySQL 8 + Redis) | 63 | 6 | 0 | 2 | [raw/database_integration.md](raw/database_integration.md) |
| Integration | Aakash's backend on Vamsi's MySQL | 2 | 1 | 7 | 0 | [raw/database_integration.md](raw/database_integration.md) |
| Security + frontend | `qa/pushpam` | 16 | 8 | 23 | 0 | [raw/security_frontend.md](raw/security_frontend.md) |
| Security + frontend | `PQC-frontend` | 23 | 13 | 11 | 0 | [raw/security_frontend.md](raw/security_frontend.md) |
| Security + frontend | `backend/aakash-scan` | 12 | 12 | 23 | 0 | [raw/security_frontend.md](raw/security_frontend.md) |
| Security + frontend | `vamsi` | 22 | 2 | 23 | 0 | [raw/security_frontend.md](raw/security_frontend.md) |
| Ingestion | fixture self-tests and contract tests | 11 | 0 | 26 | 0 | [raw/fixtures_ingestion.md](raw/fixtures_ingestion.md) |

Blocked means the feature isn't there yet, so it isn't counted as a failure. XFail is a gap we already know about (like no login yet) that I'm keeping visible so it doesn't get forgotten.

## Day 1 checklist (section 18 of the guide)

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Desktop app launches | BLOCKED | No `desktop/src-tauri` on any branch yet |
| 2 | React UI renders inside the desktop shell | BLOCKED | Runs as a plain Vite web app for now |
| 3 | FastAPI runs locally | PASS | Aakash's `dev_main.py` starts and Swagger works |
| 4 | Desktop UI can call FastAPI health | FAIL / BLOCKED | No `/api/v1/health` (INT-04), no status indicator (FE-04), no CORS (BE-07) |
| 5 | MySQL runs, schema reproducible | PASS | Tore it down with `down -v` and brought it back twice, no errors |
| 6 | Redis runs, connectivity test works | PASS | `/api/v1/redis/ping` is fine, but there's no password (DB-01) |
| 7 | Auth skeleton exists | BLOCKED | Amrutha's branch isn't pushed |
| 8 | Project creation works | PASS alone, FAIL together | Fine on SQLite, 500 on MySQL (INT-01) |
| 9 | Small ZIP upload works | PASS | Rejects non-ZIPs, fake ZIPs, files over 200 MB and bad `upload_id`s |
| 10 | Scan creation works | PASS alone, BLOCKED together | `QUEUED` on SQLite, can't get that far on MySQL |
| 11 | Scan stored in MySQL as `QUEUED` | BLOCKED | Same cause, INT-01 |
| 12 | Desktop UI shows scan status | BLOCKED | No Scans page or API client yet (FE-02, FE-03) |
| 13 | Ingestion extracts and classifies a ZIP safely | BLOCKED | Hima Bindu's module isn't pushed; 26 tests are waiting for it |
| 14 | Common Finding format exists | BLOCKED | Harshitha's and Sathwik's branches aren't pushed |
| 15 | Findings UI exists | BLOCKED | Hema's branch isn't pushed |
| 16 | PQC UI with labelled mock data | PASS | PQC, Crypto Inventory, CBOM and Reports pages, all tagged with `MockDataBadge` |
| 17 | QA fixtures and checklist exist | PASS | On this branch |
| 18 | No real customer data or secrets committed | PASS, with a caveat | No real secrets, but `dev.db` and an upload ZIP are committed (SEC-01) |
| 19 | Known failures documented | PASS | This report |

The full checklist I'm working from is in [DAY1_ACCEPTANCE_CHECKLIST.md](../DAY1_ACCEPTANCE_CHECKLIST.md).

## Defects

Some of these came up in more than one area, so I've merged the duplicates. The IDs match the raw reports, which have the exact commands and output.

### Critical and High

| ID | Severity | What's wrong | Owner |
|---|---|---|---|
| INT-01 | Critical | Backend and DB schemas don't match. `POST /projects` gives a 500 (`IntegrityError 1452 fk_projects_organization`), and `GET /projects` and `GET /scans` give a 500 too (`ResponseValidationError`). Integer IDs and `organization_id=1` in the backend vs UUID strings and `org-default-001` in the DB. | Aakash, Vamsi |
| INT-02 | High | `Base.metadata.create_all` skips tables that already exist without saying anything, so the mismatch only shows up when a request comes in | Aakash |
| BE-01 | High | No endpoint needs authentication (7 XFail tests) | Amrutha, Aakash |
| FE-01 | High | Google Fonts `@import` in `desktop/src/index.css:1`, still present in the built `dist/assets/index-*.css`. Breaks air-gap. | Sathish |
| SEC-01 | High | `backend/dev.db`, `backend/storage/uploads/a9b51b95-….zip` and 18 `.pyc` files committed on `backend/aakash-scan` (same as INT-05) | Aakash |
| SEC-02 | High | No root `.gitignore` on `main`, `backend/aakash-scan`, `PQC-frontend` or `qa/pushpam`. Vamsi's branch has one; it would be good to get it into `main` early. | Vamsi, then everyone |
| DB-02 | High | MySQL `3306` and Redis `6379` published on `0.0.0.0`, reachable from the LAN (same as SEC-03) | Vamsi |
| DB-01 | High | Redis has no password; an unauthenticated `PING` works (same as SEC-04) | Vamsi |

### Medium

| ID | What's wrong | Owner |
|---|---|---|
| BE-02 | Scan responses include the absolute server path in `repository_path` | Aakash |
| BE-03 | Empty or whitespace-only project names are accepted | Aakash |
| BE-04 | No length limits. A 300 character name and a 2 MB description both went through, and the column is `String(255)` | Aakash |
| BE-05 | Very large integer IDs crash with a 500 (`OverflowError`) on `GET /projects/{id}` and `POST /scans` | Aakash |
| BE-07 | No CORS middleware, so the desktop webview won't be allowed to call the API | Amrutha, Aakash |
| INT-03 | Scan `status` is a free text `String(20)` in the backend model, while the DB uses an ENUM | Aakash |
| INT-04 | No `/health` or auth endpoints yet | Amrutha |
| DB-04 | Passwords hardcoded in compose, root and app password are the same, and the password shows up in the healthcheck command | Vamsi |
| SEC-05 | Vamsi's `.gitignore` doesn't cover `*.db`, and `src-tauri/target/` only matches at the repo root, so it misses `desktop/src-tauri/target/` | Vamsi |
| FE-02 | Dashboard, Projects, Scans and Findings pages don't exist yet (PQC, Crypto Inventory and Reports do) | Harshith (Dashboard, Projects, Scans), Hema (Findings) |
| FE-03 | No shared API client at `desktop/src/services/api.ts` | Harshith |
| FE-04 | No Backend Status indicator calling `/api/v1/health` | Harshith |

### Low and info

| ID | What's wrong | Owner |
|---|---|---|
| BE-06 | Upload response echoes the filename back as sent (`../../evil.zip`). The file itself is saved safely as `<uuid>.zip`. | Aakash |
| BE-09 | No `X-Content-Type-Options: nosniff`, and the `server: uvicorn` header is exposed | Aakash |
| BE-10 | If Redis is down, scan creation still says `QUEUED`, but the job never actually gets queued | Aakash |
| INT-06 | Cancel doesn't check the current state before switching to `CANCELLED` (from reading the code) | Aakash |
| DB-03 | Docker images aren't pinned to an exact version | Vamsi |
| DB-05 | Redis has no healthcheck | Vamsi |
| DB-06 | Compose uses deprecated options (`version`, `mysql_native_password`) | Vamsi |
| DB-07 | `verify_db.py` leaves its test rows behind in the real DB | Vamsi |
| DB-08 | Seed IDs aren't UUIDs, and the seed password hash is marked as a placeholder | Vamsi |
| SEC-06 | Dev placeholder passwords (`change_me_locally`, `admin123`). Fine for Day 1, but they can't ship. | Vamsi, Aakash |
| SEC-07 | I can't check the Tauri security settings (CSP, capabilities, fs and shell scope, devtools) until the shell exists | Harshith |
| FE-05 | `index.html` title is still `desktop` | Sathish |

## Things that held up

Uploads are handled well. Path tricks in `upload_id` like `../../etc/passwd` get a 400, uploaded files are saved under a UUID name, and nothing ended up outside the upload folder. Non-ZIPs, fake ZIPs and anything over 200 MB are rejected.

Error responses don't leak stack traces or server paths, and SQL injection strings in inputs didn't do anything. A random origin like `http://evil.example` doesn't get CORS access either.

On the database side, foreign keys reject orphan rows, duplicate emails are blocked, invalid status and severity values are rejected, there are no BLOB columns, utf8mb4 works, and deleting a project cascades properly.

## Waiting on

| Waiting for | Owner | What's ready |
|---|---|---|
| Tauri shell | Harshith | 8 desktop security checks and a [manual smoke test](../frontend/MANUAL_DESKTOP_SMOKE.md) |
| `/health` and auth | Amrutha | Health, register, login, me, and checks that endpoints actually require login |
| Findings and reports API | Sathwik | Schema and filter tests |
| Ingestion | Hima Bindu | 26 extraction safety tests: path traversal, symlinks, zip bombs, excluded folders, classification |
| Analysis engine base | Harshitha | The vulnerable demo repo and its answer key, for checking detection later |

## What's on this branch

- [DAY1_ACCEPTANCE_CHECKLIST.md](../DAY1_ACCEPTANCE_CHECKLIST.md), the checklist I'm using for Day 1 and will keep reusing
- `tests/fixtures/vulnerable-demo-repo/`, a small banking app in Python, Java and JS with 37 planted issues (SAST, crypto/PQC, dependencies, config) and 7 safe lines to catch false positives. Every secret in it is fake.
- `tests/fixtures/make_zips.py`, which builds 12 bad or unusual ZIPs at test time (traversal, symlink, zip bomb, corrupted, and so on)
- Test suites under `tests/backend`, `database`, `integration`, `ingestion`, `security` and `frontend`
- `tests/security/scan_all_branches.sh` to run the security checks on every remote branch

## Running it yourself

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r tests/requirements.txt

# backend tests, with Aakash's backend on :8001
PQC_API_URL=http://127.0.0.1:8001 pytest tests/backend -v -rs -rx

# database and integration, with Vamsi's compose up and the backend on :8002 pointed at MySQL
PQC_API_URL=http://127.0.0.1:8002 pytest tests/database tests/integration -v -rs

# security and frontend checks against any checkout
PQC_SCAN_ROOT=/path/to/checkout pytest tests/security tests/frontend -v -rs
bash tests/security/scan_all_branches.sh
```

The raw reports have the exact ports and environment variables I used for each run.
