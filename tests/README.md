# QA, Security & Desktop-Security Tests

Owner: Pushpam (QA + Cyber Security + Desktop Security) · branch `qa/pushpam`

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
| `reports/` | `QA+Security_fixes.md` (living fix list) and `daily/` (one report per day, with that day's raw results in a folder of the same date) |

The Day 1 acceptance checklist is [DAY1_ACCEPTANCE_CHECKLIST.md](DAY1_ACCEPTANCE_CHECKLIST.md).

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
| `PQC_SCAN_ROOT` | repository root (tree scanned by `tests/security`) |
| `PQC_INGESTION_ROOT` | unset. Checkout containing `ingestion/`, e.g. `.worktrees/hima`. Without it `tests/ingestion` is Blocked |
| `PQC_ANALYSIS_ROOT` | unset. Checkout containing `analysis-engines/`, e.g. `.worktrees/harshitha`. Without it `tests/analysis` is Blocked |

| `PQC_DEMO_REPO` | unset. The `vulnerable-demo-repo/` folder from the `tests/pushpam` branch. Without it a harmless sample is used and the answer-key checks are Blocked |

Example: `PQC_INGESTION_ROOT=.worktrees/hima PQC_ANALYSIS_ROOT=.worktrees/harshitha pytest tests/ingestion tests/analysis -v -rs`

## Reading results

- **PASS** — behaviour matches the contract.
- **FAIL** — a real product defect; see the findings list in `reports/`.
- **SKIPPED with `BLOCKED: …`** — the feature or service isn't delivered yet. Reported as *Blocked*, not as a failure.
- **XFAIL with `FINDING: …`** — a known, accepted Day 1 gap (e.g. auth not enforced yet) that stays visible until fixed.

## Rules

- The intentionally insecure demo repo is kept off this branch, on `tests/pushpam`. All secrets in it are fake. Never deploy it, run it, or merge that branch.
- Generated ZIPs are built at test time by `fixtures/make_zips.py` and are never committed.
- Record evidence (command, output, branch, commit) for every result. "Works on my machine" is not a result.
