# Day 1 Acceptance Checklist — PQC Security Assessment Platform (Desktop)

Silicofeller Quantum · QA + Cyber Security + Desktop Security · owner: Pushpam · branch `qa/pushpam`

Status values: **PASS** · **FAIL** · **BLOCKED** (dependency not delivered) · **N/A**.
Every PASS/FAIL needs evidence: the command run, its output or a screenshot, and the branch + commit tested.
Automated tests live under `tests/`; run them with `pytest tests -v -rs` (see [tests/README.md](https://github.com/Viswanath322/PQC-Platform/blob/qa/pushpam/tests/README.md)).

## A. Environment

| ID | Check | How | Owner | Status | Evidence |
|---|---|---|---|---|---|
| ENV-01 | Node 20+, npm, Python 3.11+, Rust/cargo, Docker, Git installed | `node --version`, `python --version`, `rustc --version`, `docker compose version` | Everyone | | |
| ENV-02 | Tauri OS prerequisites installed | `npm run tauri info` in `desktop/` | Frontend | | |

## B. Foundation (guide §18)

| ID | Check | How | Owner | Status | Evidence |
|---|---|---|---|---|---|
| FND-01 | Desktop app launches | `cd desktop && npm run tauri dev` → native window opens | Harshith | | |
| FND-02 | React + TS UI renders inside the desktop shell | Dashboard visible in window (not a browser tab) | Harshith | | |
| FND-03 | FastAPI runs locally, Swagger loads | `uvicorn app.main:app` → `http://127.0.0.1:8000/docs` | Amrutha | | |
| FND-04 | `GET /api/v1/health` returns healthy | `tests/backend/test_health.py` | Amrutha | | |
| FND-05 | Desktop UI shows Backend Status = healthy; switches to unhealthy when FastAPI is stopped | Manual, [MANUAL_DESKTOP_SMOKE.md](https://github.com/Viswanath322/PQC-Platform/blob/qa/pushpam/tests/frontend/MANUAL_DESKTOP_SMOKE.md) | Harshith | | |
| FND-06 | MySQL starts from scratch; schema reproducible | `docker compose down -v && docker compose up -d mysql`; `tests/database` | Vamsi | | |
| FND-07 | Redis runs; connectivity test succeeds | `tests/database/test_redis.py`, `GET /api/v1/redis/ping` | Aakash | | |
| FND-08 | Auth skeleton exists (register / login / me) | `tests/backend/test_auth.py` | Amrutha | | |

## C. Day 1 workflow (guide §5, §16)

| ID | Check | How | Owner | Status | Evidence |
|---|---|---|---|---|---|
| WF-01 | Create development user and log in | `tests/backend/test_auth.py` | Amrutha | | |
| WF-02 | Create project "Demo Banking Application" | `tests/backend/test_projects.py` | Aakash | | |
| WF-03 | Select + upload small ZIP (`demo-banking.zip`) | `tests/backend/test_uploads.py`; UI via native picker | Aakash / Harshith | | |
| WF-04 | Create scan → gets an ID, status `QUEUED` | `tests/backend/test_scans.py` | Aakash | | |
| WF-05 | Scan row exists in MySQL with status `QUEUED` | `tests/integration/test_day1_flow.py` | Vamsi / Aakash | | |
| WF-06 | Retrieve scan by ID; list scans | `tests/backend/test_scans.py` | Aakash | | |
| WF-07 | Cancel scan → `CANCELLED`; second cancel → 409 | `tests/backend/test_scans.py` | Aakash | | |
| WF-08 | Desktop UI displays the scan and its status | Manual | Harshith | | |
| WF-09 | Ingestion extracts + classifies the demo ZIP and returns a summary | `tests/ingestion` | Hima Bindu | | |
| WF-10 | DummyEngine returns a Finding in the standard format | `pytest analysis-engines/` | Harshitha | | |
| WF-11 | Findings / Report endpoints visible in Swagger with stable schemas | `tests/backend/test_findings_reports.py` | Sathwik | | |

## D. UI pages

| ID | Check | Owner | Status | Evidence |
|---|---|---|---|---|
| UI-01 | Dashboard (Critical/High/Medium/Low cards, current scan status) | Harshith | | |
| UI-02 | Findings page: table, search, severity + category filters, details panel | Hema | | |
| UI-03 | PQC overview, crypto inventory, CBOM, migration candidates | Sathish | | |
| UI-04 | Reports page with PDF/JSON/CSV placeholders | Sathish | | |
| UI-05 | All mock / development data is clearly labelled as such | Hema / Sathish | | |
| UI-06 | HTTP calls are centralised in `desktop/src/services/api.ts` | Harshith | | |

## E. Security (QA-owned)

| ID | Check | How | Status | Evidence |
|---|---|---|---|---|
| SEC-01 | ZIP path traversal (`../`, absolute, Windows paths) rejected; nothing written outside the scan dir | `tests/ingestion` with `tests/fixtures/make_zips.py` | | |
| SEC-02 | Symlink entries not followed; zip bomb rejected or limited | `tests/ingestion` | | |
| SEC-03 | Upload rejects non-ZIP, fake ZIP, oversized files; `upload_id` path tricks rejected | `tests/backend/test_uploads.py`, `test_scans.py` | | |
| SEC-04 | No secrets committed on any branch | `tests/security/test_secrets.py`, `scan_all_branches.sh` | | |
| SEC-05 | No generated artifacts committed (`*.db`, uploads, `*.zip`, `__pycache__`, `.env`, `node_modules`) | `tests/security/test_committed_artifacts.py` | | |
| SEC-06 | Root `.gitignore` covers env files, caches, DBs, storage, build output | `tests/security/test_gitignore.py` | | |
| SEC-07 | **Air-gap:** desktop app makes no external network calls (fonts, CDNs, telemetry) | `tests/security/test_no_external_calls.py` + runtime monitoring (`nettop` / `lsof -i`) | | |
| SEC-08 | Local services bound to `127.0.0.1` only (FastAPI, MySQL, Redis) | Review `docker-compose.yml`, uvicorn `--host` | | |
| SEC-09 | CORS only allows the desktop origin, not `*` | `tests/backend` CORS test | | |
| SEC-10 | Error responses do not leak stack traces or absolute server paths | `tests/backend` | | |
| SEC-11 | Dev credentials are placeholders only and documented as such | Review compose, seed, `.env.example` | | |
| SEC-12 | Dependency audit: no known Critical/High vulns | `tests/security/test_dependencies.py` (`pip-audit`, `npm audit`) | | |
| SEC-13 | Tauri desktop hardening: strict CSP, minimal capabilities, scoped fs/shell, devtools off in release | `tests/security/test_tauri_config.py` | | |

## F. Process (guide §8, §21)

| ID | Check | Status | Evidence |
|---|---|---|---|
| PRC-01 | Everyone works on their own branch; nothing pushed directly to `main` | | |
| PRC-02 | Every module has a README / start-up instructions | | |
| PRC-03 | API and schema changes communicated (IDs/types agree between backend and DB) | | |
| PRC-04 | All known failures documented in the Day 1 QA report | | |
