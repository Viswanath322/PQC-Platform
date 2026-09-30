# Day 1 QA Acceptance Checklist

**Platform:** PQC Security Assessment Platform  
**Author:** Pushpam (QA + Cyber Security)  
**Date:** Day 1

---

## Instructions

Run automated tests with:
```bash
pip install -r tests/requirements.txt
pytest tests -v -rs
```

For each manual item, mark: ✅ PASS | ❌ FAIL | ⚠️ BLOCKED

---

## Section 1 — Environment Prerequisites

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1.1 | `git --version` returns output | | |
| 1.2 | `node --version` returns 20+ | | |
| 1.3 | `npm --version` returns output | | |
| 1.4 | `python --version` returns 3.11+ | | |
| 1.5 | `rustc --version` returns output | | |
| 1.6 | `cargo --version` returns output | | |
| 1.7 | `docker compose version` returns output | | |
| 1.8 | Repository cloned successfully | | |
| 1.9 | Each team member on their own branch | | |

---

## Section 2 — Local Services (Docker)

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 2.1 | `docker compose up -d` starts without errors | | |
| 2.2 | `docker compose ps` shows MySQL healthy | | |
| 2.3 | `docker compose ps` shows Redis healthy | | |
| 2.4 | MySQL port 3306 accessible on 127.0.0.1 only | | |
| 2.5 | Redis port 6379 accessible on 127.0.0.1 only | | |
| 2.6 | Database schema `pqc_security` created | | |
| 2.7 | All 6 tables created (organizations/users/projects/scans/scan_files/findings) | | |
| 2.8 | Seed data loaded (default org + dev user) | | |

---

## Section 3 — Backend (FastAPI)

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 3.1 | `backend/.env` created from `.env.example` | | |
| 3.2 | `JWT_SECRET_KEY` set to a real random value | | |
| 3.3 | `uvicorn app.main:app --reload` starts without errors | | |
| 3.4 | Swagger UI accessible at http://127.0.0.1:8000/docs | | |
| 3.5 | `GET /api/v1/health` returns `{"status": "healthy"}` | | |
| 3.6 | `POST /api/v1/auth/register` creates a user | | |
| 3.7 | `POST /api/v1/auth/login` returns access_token | | |
| 3.8 | `GET /api/v1/auth/me` returns current user | | |
| 3.9 | `POST /api/v1/projects` creates a project | | |
| 3.10 | `GET /api/v1/projects` lists projects | | |
| 3.11 | `POST /api/v1/uploads` accepts ZIP and returns upload_id | | |
| 3.12 | `POST /api/v1/uploads` rejects non-ZIP with 400 | | |
| 3.13 | `POST /api/v1/scans` creates scan with status=QUEUED | | |
| 3.14 | `GET /api/v1/scans/{id}` retrieves scan with QUEUED status | | |
| 3.15 | `GET /api/v1/findings` returns list (empty OK) | | |
| 3.16 | `GET /api/v1/reports/{scan_id}` returns report skeleton | | |
| 3.17 | CORS allows calls from http://localhost:5173 | | |
| 3.18 | FastAPI bound to 127.0.0.1 only (not 0.0.0.0) | | |

---

## Section 4 — Database (MySQL)

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 4.1 | Schema can be recreated by running schema.sql from scratch | | |
| 4.2 | A scan created via API appears in the `scans` table | | |
| 4.3 | Scan status is stored as 'QUEUED' in MySQL | | |
| 4.4 | ZIP binary is NOT stored in MySQL (check repository_path is a file path) | | |
| 4.5 | Foreign key from scans → projects enforced | | |

---

## Section 5 — Desktop Application (React + Tauri)

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 5.1 | `npm install` in desktop/ completes without errors | | |
| 5.2 | `npm run tauri dev` opens a native desktop window | | |
| 5.3 | Dashboard page renders | | |
| 5.4 | Backend Status indicator shows "healthy" when FastAPI is running | | |
| 5.5 | Backend Status indicator shows offline when FastAPI is stopped | | |
| 5.6 | Projects page opens and can create a project | | |
| 5.7 | Scans page opens and shows scan list | | |
| 5.8 | ZIP upload flow works through the UI | | |
| 5.9 | Scan creation through UI shows QUEUED status | | |
| 5.10 | Findings page opens | | |
| 5.11 | PQC dashboard opens | | |
| 5.12 | Reports page opens | | |
| 5.13 | Mock data is clearly labelled as development data | | |
| 5.14 | No calls to external servers (CDN, analytics, fonts) | | |

---

## Section 6 — Ingestion

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 6.1 | Valid ZIP extracts successfully | | |
| 6.2 | Invalid ZIP raises error and no files are written | | |
| 6.3 | `../` path traversal ZIP is rejected | | |
| 6.4 | Absolute path ZIP is rejected | | |
| 6.5 | Symlink in ZIP is rejected | | |
| 6.6 | `node_modules/` files are excluded from results | | |
| 6.7 | `.git/` files are excluded from results | | |
| 6.8 | Python files are detected and classified | | |
| 6.9 | Ingestion returns a JSON summary with file counts | | |
| 6.10 | `pytest ingestion/tests` passes | | |

---

## Section 7 — Analysis Engine Foundation

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 7.1 | `DummyEngine().analyze([...])` returns one finding | | |
| 7.2 | Finding has `is_development=True` | | |
| 7.3 | `pytest analysis-engines/tests` passes | | |
| 7.4 | `EngineName` values match API contract (sast/crypto/dependency/configuration) | | |
| 7.5 | `Severity` values match API contract (critical/high/medium/low) | | |

---

## Section 8 — Security QA

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 8.1 | No `.env` files committed to git | | |
| 8.2 | No real passwords or secrets committed | | |
| 8.3 | No private key files (.pem/.p12) committed | | |
| 8.4 | `.env.example` has empty JWT_SECRET_KEY | | |
| 8.5 | `docker-compose.yml` credentials are placeholders, not real | | |
| 8.6 | Auth endpoint rejects invalid credentials (401) | | |
| 8.7 | Protected endpoints require auth token (401/403) | | |
| 8.8 | ZIP traversal protection test passes | | |
| 8.9 | Desktop app makes no external network calls | | |
| 8.10 | Vulnerable fixture repo is clearly labelled as intentionally insecure | | |

---

## Section 9 — End-of-Day Integration Demo

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 9.1 | Docker services (MySQL + Redis) running | | |
| 9.2 | FastAPI running and health = healthy | | |
| 9.3 | Desktop app opens in native window | | |
| 9.4 | Login works through the UI | | |
| 9.5 | Created project: "Demo Banking Application" | | |
| 9.6 | Uploaded demo-banking.zip | | |
| 9.7 | Created scan — received scan ID | | |
| 9.8 | Scan status = QUEUED displayed in UI | | |
| 9.9 | Scan row visible in MySQL | | |
| 9.10 | Ingestion summary generated for the ZIP | | |
| 9.11 | Findings page loads | | |
| 9.12 | PQC page loads | | |
| 9.13 | All team members pushed their branches | | |
| 9.14 | Known failures documented | | |

---

## Known Issues / Blocked Items

_Record any failures or blocked tests here with details._

| # | Item | Status | Error / Reason |
|---|------|--------|---------------|
| | | | |

---

## Day 1 Definition of Done — Final Verdict

- [ ] All automated tests in `tests/` pass (or are explicitly BLOCKED with documented reason)
- [ ] All Section 9 integration demo items are ✅ PASS
- [ ] No undocumented failures
- [ ] All team members have pushed their branches

**Day 1 Status:** `[ PASS / FAIL / PARTIAL ]`
