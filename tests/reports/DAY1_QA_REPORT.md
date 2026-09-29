# Day 1 QA Report — PQC Security Assessment Platform (Desktop)

Silicofeller Quantum · QA + Cyber Security + Desktop Security · Pushpam · 2026-09-29 · branch `qa/pushpam`

## Summary

- **The Day 1 end-to-end flow does not work yet.** Aakash's backend and Vamsi's database use incompatible IDs, so **creating a project fails with HTTP 500** as soon as the two are connected (INT-01, Critical). Nothing after project creation (upload → scan → `QUEUED` in MySQL) can run until that's fixed.
- **Each branch mostly works on its own.** Aakash's API passes 86 tests and Vamsi's schema passes 63. Most checks on the frontend build pass.
- **Air-gap violation:** the UI loads Google Fonts from the internet (FE-01, High).
- **Hygiene:** a database file, an uploaded ZIP and compiled Python files are committed on `backend/aakash-scan`, and no branch has a root `.gitignore` (SEC-01/02, High).
- **Local services are exposed:** MySQL and Redis listen on all network interfaces and Redis has no password (DB-01/02, High).
- **Not delivered yet (Blocked, not failures):** Tauri desktop shell, `/health`, auth, findings/reports APIs, ingestion, analysis-engine foundation, and the Dashboard/Projects/Scans/Findings pages.
- **No real secrets** were found on any branch. The dependency audits (pip-audit, `npm audit`) are clean.

**Top 3 actions before the integration demo:**
1. Aakash + Vamsi: agree one ID type (UUID `VARCHAR(36)` as in the schema) and a real default organization. Fixes INT-01/02.
2. Add a root `.gitignore` on `main`, and remove `dev.db`, the upload ZIP and `__pycache__` from `backend/aakash-scan`. Fixes SEC-01/02.
3. Sathish: self-host the Inter / JetBrains Mono fonts instead of importing them from Google. Fixes FE-01.

## What was tested

| Branch | Commit | Owner | Tested |
|---|---|---|---|
| `backend/aakash-scan` | `192fa3b` | Aakash | API tests, security checks, integration with MySQL |
| `vamsi` | `45b70ac` | Vamsi | Schema, constraints, Redis, compose hardening, integration |
| `PQC-frontend` | `63d183c` | Sathish | `npm ci` / build / lint, pages, air-gap, dependency audit |
| `main` | `ec931f6` | — | Security and hygiene checks |
| Not pushed yet | — | Amrutha, Hima Bindu, Harshitha, Sathwik, Hema, Harshith | Tests written in advance; reported as Blocked |

**Environment:** macOS (Darwin 25.6), Python 3.10.6, Node 24.7, Docker via Colima, MySQL 8.0.46, Redis 7-alpine.

## Results by area

| Area | Target | Passed | Failed | Blocked | XFail | Raw report |
|---|---|---|---|---|---|---|
| Backend API | `backend/aakash-scan` (SQLite + Redis) | 86 | 12 | 31 | 7 | [raw/backend.md](raw/backend.md) |
| Database | `vamsi` (MySQL 8 + Redis) | 63 | 6 | 0 | 2 | [raw/database_integration.md](raw/database_integration.md) |
| Integration | Aakash backend → Vamsi MySQL | 2 | 1 | 7 | 0 | [raw/database_integration.md](raw/database_integration.md) |
| Security + frontend | `qa/pushpam` (repo root) | 16 | 8 | 23 | 0 | [raw/security_frontend.md](raw/security_frontend.md) |
| Security + frontend | `PQC-frontend` | 23 | 13 | 11 | 0 | [raw/security_frontend.md](raw/security_frontend.md) |
| Security + frontend | `backend/aakash-scan` | 12 | 12 | 23 | 0 | [raw/security_frontend.md](raw/security_frontend.md) |
| Security + frontend | `vamsi` | 22 | 2 | 23 | 0 | [raw/security_frontend.md](raw/security_frontend.md) |
| Ingestion | fixture self-tests / contract | 11 | 0 | 26 | 0 | [raw/fixtures_ingestion.md](raw/fixtures_ingestion.md) |

*XFail* = a known Day 1 gap that is kept visible (e.g. no authentication yet). *Blocked* = the feature or endpoint doesn't exist yet.

## Day 1 Definition of Done (guide §18)

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Desktop application launches | **BLOCKED** | No Tauri shell (`desktop/src-tauri`) on any branch |
| 2 | React + TS UI renders inside the desktop shell | **BLOCKED** | UI builds and runs as a Vite web app only |
| 3 | FastAPI runs locally | **PASS** | Aakash's `dev_main.py` runs; Swagger works |
| 4 | Desktop UI can call FastAPI health | **FAIL / BLOCKED** | No `/api/v1/health` (INT-04), no health indicator (FE-04), no CORS (BE-07) |
| 5 | MySQL runs and schema is reproducible | **PASS** | `down -v` + `up` twice, no errors |
| 6 | Redis runs; connectivity test succeeds | **PASS** | `GET /api/v1/redis/ping` ok; but no password (DB-01) |
| 7 | Authentication skeleton exists | **BLOCKED** | Amrutha's branch not pushed |
| 8 | Project creation works | **PASS alone / FAIL integrated** | Works on SQLite; HTTP 500 on MySQL (INT-01) |
| 9 | Small ZIP upload works | **PASS** | Rejects non-ZIP, fake ZIP, >200 MB, path tricks in `upload_id` |
| 10 | Scan creation works | **PASS alone / BLOCKED integrated** | `QUEUED` on SQLite; blocked by INT-01 on MySQL |
| 11 | Scan status `QUEUED` stored in MySQL | **BLOCKED** | By INT-01 |
| 12 | Desktop UI displays scan status | **BLOCKED** | No Scans page, no API client (FE-02/03) |
| 13 | Ingestion safely extracts/classifies a ZIP | **BLOCKED** | Hima Bindu's module not pushed; 26 safety tests ready |
| 14 | Common Finding format exists | **BLOCKED** | Harshitha's / Sathwik's branches not pushed |
| 15 | Findings UI exists | **BLOCKED** | Hema's branch not pushed |
| 16 | PQC UI with labelled mock data | **PASS** | PQC, Crypto Inventory, CBOM, Reports pages; `MockDataBadge` used |
| 17 | QA fixtures and checklist exist | **PASS** | This branch |
| 18 | No real customer data or secrets committed | **PASS with issues** | No real secrets; but `dev.db` + upload ZIP committed (SEC-01) |
| 19 | All known failures documented | **PASS** | This report |

Full checklist: [../DAY1_ACCEPTANCE_CHECKLIST.md](../DAY1_ACCEPTANCE_CHECKLIST.md).

## Defects and findings

Deduplicated across the four test areas. The original IDs from the raw reports are kept so each item can be traced to its evidence.

### Critical / High

| ID | Severity | Title | Owner | Evidence |
|---|---|---|---|---|
| INT-01 | **Critical** | Backend and DB schemas are incompatible: `POST /projects` → 500 (`IntegrityError 1452 fk_projects_organization`); `GET /projects`, `GET /scans` → 500 (`ResponseValidationError`). Backend uses Integer IDs and hardcodes `organization_id=1`; schema uses `VARCHAR(36)` UUIDs and the only org is `org-default-001`. | Aakash + Vamsi | raw/database_integration.md |
| INT-02 | High | `Base.metadata.create_all` silently skips existing tables, so the mismatch only shows at request time | Aakash | raw/database_integration.md |
| BE-01 | High | No authentication on any endpoint (7 XFail tests) | Amrutha + Aakash | raw/backend.md |
| FE-01 | High | **Air-gap violation:** `desktop/src/index.css:1` imports Google Fonts; the `@import` survives into the built `dist/assets/index-*.css` | Sathish | raw/security_frontend.md |
| SEC-01 (= INT-05) | High | `backend/dev.db`, `backend/storage/uploads/a9b51b95-….zip` and 18 `__pycache__/*.pyc` committed on `backend/aakash-scan` | Aakash | `git ls-files` |
| SEC-02 | High | No root `.gitignore` on `main`, `backend/aakash-scan`, `PQC-frontend` or `qa/pushpam` (the cause of SEC-01) | Whoever merges first; suggest Vamsi's `.gitignore` goes to `main` early | 8 failing `test_gitignore.py` tests |
| DB-02 (= SEC-03) | High | MySQL `3306` and Redis `6379` published on `0.0.0.0` — reachable from the LAN | Vamsi | `docker ps`, compose lines 14, 31 |
| DB-01 (= SEC-04) | High | Redis has no password (`requirepass` empty; unauthenticated PING works) | Vamsi | raw/database_integration.md |

### Medium

| ID | Title | Owner |
|---|---|---|
| BE-02 | Scan response returns the absolute server path in `repository_path` | Aakash |
| BE-03 | Empty / whitespace-only project names accepted (201) | Aakash |
| BE-04 | No length limits: 300-char name and 2 MB description accepted (column is `String(255)`) | Aakash |
| BE-05 | Out-of-range integer IDs cause HTTP 500 (`OverflowError`) on `GET /projects/{id}` and `POST /scans` | Aakash |
| BE-07 | No CORS middleware — the Tauri/React UI can't call the API from its webview | Amrutha / Aakash |
| INT-03 | Scan `status` is free text `String(20)` in the backend model (DB uses an ENUM) | Aakash |
| INT-04 | No `/health` or auth endpoints yet | Amrutha |
| DB-04 | Hardcoded credentials; root and app password identical; password visible on the healthcheck command line | Vamsi |
| SEC-05 | Vamsi's `.gitignore` misses `*.db`; `src-tauri/target/` is anchored to the root and misses `desktop/src-tauri/target/` | Vamsi |
| FE-02 | Dashboard, Projects, Scans and Findings pages missing (PQC, Crypto Inventory and Reports exist) | Harshith (Dashboard/Projects/Scans), Hema (Findings) |
| FE-03 | No central API client `desktop/src/services/api.ts` | Harshith |
| FE-04 | No Backend Status indicator calling `/api/v1/health` | Harshith |

### Low / Info

| ID | Title | Owner |
|---|---|---|
| BE-06 | Upload response echoes the client filename (`../../evil.zip`) unsanitised — stored file is safe (`<uuid>.zip`) | Aakash |
| BE-09 | No `X-Content-Type-Options: nosniff`; `server: uvicorn` header exposed | Aakash |
| BE-10 | Scan creation returns `QUEUED` even when Redis is down — job silently never queued | Aakash |
| INT-06 | Cancel has no state-machine / race check (code review) | Aakash |
| DB-03 | Images not pinned to a patch version or digest | Vamsi |
| DB-05 | Redis has no healthcheck | Vamsi |
| DB-06 | Deprecated compose options (`version`, `mysql_native_password`) | Vamsi |
| DB-07 | `verify_db.py` leaves test rows in the live DB | Vamsi |
| DB-08 | Seed IDs aren't UUIDs; seed password hash documented as a placeholder | Vamsi |
| SEC-06 | Dev placeholder credentials (`change_me_locally`, `admin123`) — acceptable for Day 1, must not reach a release | Vamsi / Aakash |
| SEC-07 | Tauri hardening baseline (CSP, capabilities, fs/shell scope, devtools) can't be checked until the shell exists | Harshith |
| FE-05 | `index.html` title is still `desktop` | Sathish |

## What passed (security)

- Upload: `upload_id` path tricks (`../../etc/passwd`, non-UUID) → 400; uploaded files stored as `<uuid>.zip` and nothing escapes the upload directory; non-ZIP, fake ZIP and >200 MB uploads rejected.
- Error bodies contain no stack traces or server paths; SQL-injection strings in inputs are inert.
- Arbitrary origins (`Origin: http://evil.example`) get no CORS allowance.
- DB: foreign keys reject orphans, unique email enforced, invalid status/severity rejected, no BLOB columns, utf8mb4 round-trips, cascading deletes work.
- No real secrets on any branch; `pip-audit` and `npm audit --omit=dev` clean.
- Frontend `npm ci`, `npm run build` and `npm run lint` pass; mock data is labelled.

## Blocked — ready to run when delivered

| Waiting on | Owner | Tests ready |
|---|---|---|
| Tauri shell | Harshith | 8 desktop-hardening checks + [manual desktop smoke](../frontend/MANUAL_DESKTOP_SMOKE.md) |
| `/health`, auth | Amrutha | health, register/login/me, auth enforcement |
| Findings + reports API | Sathwik | schema and filter tests |
| Ingestion module | Hima Bindu | 26 extraction-safety tests (traversal, symlink, zip bomb, exclusions, classification) |
| Analysis-engine foundation | Harshitha | validated later against the vulnerable demo repo's 37-finding answer key |

## QA deliverables on this branch

- [DAY1_ACCEPTANCE_CHECKLIST.md](../DAY1_ACCEPTANCE_CHECKLIST.md) — reusable checklist
- `tests/fixtures/vulnerable-demo-repo/` — intentionally vulnerable demo bank (Python, Java, JS): 37 expected findings across SAST, crypto/PQC, dependency and configuration, plus 7 true negatives; all secrets fake
- `tests/fixtures/make_zips.py` — 12 malicious / edge-case ZIPs generated at test time
- `tests/backend`, `database`, `integration`, `ingestion`, `security`, `frontend` — automated suites
- `tests/security/scan_all_branches.sh` — runs the security suite against every remote branch

## How to reproduce

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r tests/requirements.txt

# backend (Aakash's branch) on :8001
PQC_API_URL=http://127.0.0.1:8001 pytest tests/backend -v -rs -rx

# database + integration (Vamsi's compose up, Aakash's backend on :8002 pointing at MySQL)
PQC_API_URL=http://127.0.0.1:8002 pytest tests/database tests/integration -v -rs

# security + frontend against any checkout
PQC_SCAN_ROOT=/path/to/checkout pytest tests/security tests/frontend -v -rs
bash tests/security/scan_all_branches.sh
```

The exact commands, ports and environment variables used for each run are in the raw reports.
