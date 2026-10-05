# QA, Security & Desktop-Security Tests

Owner: Pushpam (QA + Cyber Security + Desktop Security) · test code on `qa/pushpam`, audit reports on `audit/pushpam`

The suite exercises the platform **from the outside**: over HTTP (FastAPI), MySQL, Redis
and the file system. It does not import application code, so it runs unchanged
against any teammate's branch.

## Layout

| Folder | What it covers |
|---|---|
| `backend/` | API contract tests: health, auth, projects, uploads, scans, findings, reports |
| `database/` | MySQL schema and constraints, Redis connectivity, docker-compose hardening |
| `analysis/` | Analysis engine contract: `AnalysisEngine`, `Finding`, `AnalysisResult`, `DummyEngine`, API/DB field consistency |
| `ingestion/` | ZIP extraction safety (path traversal, symlinks, zip bombs), filtering, classification |
| `integration/` | Day 1 end-to-end flow: project → upload → scan `QUEUED` → row in MySQL |
| `security/` | Secrets, committed artifacts, `.gitignore`, air-gap (no external calls), dependency audit, Tauri hardening |
| `frontend/` | Desktop UI build/lint smoke tests and the manual desktop smoke checklist |
| `fixtures/` | Malicious ZIP generator (the vulnerable demo repo lives on the `tests/pushpam` branch) |
| `reports/` | Not here: daily QA reports and the fix list live on the `audit/pushpam` branch |

## Setup

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r tests/requirements.txt
```

## Running

```bash
# start the services under test first (docker compose up -d, uvicorn ...), then:
pytest tests -v -rs
```

Configuration is by environment variable:

| Variable | Default |
|---|---|
| `PQC_API_URL` | `http://127.0.0.1:8000` |
| `PQC_MYSQL_URL` | `mysql://pqc:change_me_locally@127.0.0.1:3306/pqc_security` |
| `PQC_REDIS_URL` | `redis://127.0.0.1:6379/0` |
| `PQC_API_TOKEN` | unset. Bearer token for the API. If unset and the backend has `/auth/login`, the suite logs in as `PQC_TEST_EMAIL` / `PQC_TEST_PASSWORD`, or registers a throwaway `qa-…@example.com` user |
| `PQC_SCAN_ROOT` | repository root (tree scanned by `tests/security`) |
| `PQC_INGESTION_ROOT` | unset. Checkout containing `ingestion/`, e.g. `.worktrees/hima`. Without it `tests/ingestion` is Blocked |
| `PQC_ANALYSIS_ROOT` | unset. Checkout containing `analysis-engines/`, e.g. `.worktrees/harshitha`. Without it `tests/analysis` is Blocked |
| `PQC_DEMO_REPO` | unset. The `vulnerable-demo-repo/` folder from the `tests/pushpam` branch. Without it a harmless sample is used and the answer-key checks are Blocked |

Example: `PQC_INGESTION_ROOT=.worktrees/hima PQC_ANALYSIS_ROOT=.worktrees/harshitha pytest tests/ingestion tests/analysis -v -rs`

## How to test your branch

Run these from the root of your own branch (rebase on `main` first so you have `tests/`). Start the services you need, then run your slice before you push or open a PR.

| Who | What to start | Command |
|---|---|---|
| Aakash (projects, uploads, scans) | Your backend on port 8000 | `pytest tests/backend -v -rs` |
| Amrutha (health, auth) | Your backend on port 8000 | `pytest tests/backend/test_health.py tests/backend/test_auth.py tests/backend/test_api_security.py -v -rs` |
| Sathwik (findings, reports) | A backend serving your routers on port 8000 | `pytest tests/backend/test_findings_reports.py -v -rs` |
| Vamsi (database) | `docker compose up -d` | `PQC_REDIS_URL=redis://:change_me_locally@127.0.0.1:6379/0 pytest tests/database -v -rs` |
| Hima Bindu (ingestion) | Nothing | `PQC_INGESTION_ROOT=. pytest tests/ingestion -v -rs` |
| Harshitha (analysis engines) | Nothing (Python 3.11+) | `PQC_ANALYSIS_ROOT=. pytest tests/analysis -v -rs` |
| Harshith, Sathish, Hema (desktop UI) | Nothing | `pytest tests/frontend tests/security -v -rs` |
| Everyone | Nothing | `pytest tests/security -v -rs` (secrets, committed junk files, `.gitignore`, dependency audit) |
| Integration check | Database + backend | `pytest tests/integration -v -rs` |

If your backend runs on a different port, set `PQC_API_URL`, e.g. `PQC_API_URL=http://127.0.0.1:8001`.

Login is automatic: on a backend with auth, the tests register a QA user and send its token, and the "must refuse anonymous calls" checks use a separate client with no token. Registration needs the default organization row from `seed.sql` to exist.

A FAIL in your own area means something to fix before merging. A BLOCKED result means the test is waiting on another teammate's piece, so it isn't yours to fix.

## Reading results

- **PASS** — behaviour matches the contract.
- **FAIL** — a real product defect; see `tests/reports/QA+Security_fixes.md` on the `audit/pushpam` branch.
- **SKIPPED with `BLOCKED: …`** — the feature or service isn't delivered yet. Reported as *Blocked*, not as a failure.
- **XFAIL with `FINDING: …`** — a known, accepted Day 1 gap (e.g. auth not enforced yet) that stays visible until fixed.

## Rules

- The intentionally insecure demo repo is not in this folder; it lives on the `tests/pushpam` branch. All secrets in it are fake. Never deploy it, run it, or merge that branch.
- Generated ZIPs are built at test time by `fixtures/make_zips.py` and are never committed.
- Record evidence (command, output, branch, commit) for every result. "Works on my machine" is not a result.
