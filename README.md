# PQC Security Assessment Platform

**Silicofeller Quantum** · on-premises, air-gapped desktop application for software security and
Post-Quantum Cryptography (PQC) readiness.

The platform scans a source-code repository and reports:

- **Security vulnerabilities (SAST)**: injection, hardcoded secrets, path traversal and more
- **Cryptographic inventory and PQC risk**: which algorithms (RSA, ECC, SHA-1, MD5, …) are in use, which are quantum-vulnerable, and what to migrate to, published as a **CBOM** (Cryptography Bill of Materials)
- **Dependency risk**: an **SBOM** of third-party packages and their known vulnerabilities
- **Configuration and infrastructure risk**
- **Remediation guidance** from a local 8B-class LLM that runs *after* deterministic analysis, never instead of it

Everything runs on the customer's machine. No code, findings or telemetry leave the environment.

> **Status: Day 1 — foundation.** The goal of Day 1 is one real end-to-end flow:
> launch app → create project → upload ZIP → create scan → scan stored in MySQL as `QUEUED` → shown in the UI.
> Real SAST rules, PQC scoring, SBOM/CBOM generation, the LLM and Elasticsearch come in later milestones.

---

## Architecture

```
┌──────────────────────── Desktop application (Tauri) ────────────────────────┐
│  React + TypeScript UI                                                      │
│  Dashboard · Projects · Scans · Findings · PQC · Reports                    │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │  http://127.0.0.1:8000/api/v1
                                ▼
                         FastAPI (local only)
                ┌───────────────┼────────────────┐
                ▼               ▼                ▼
             MySQL            Redis         Local file storage
         (application      (job queue)      (uploaded repositories,
             data)                           extracted artifacts)
                                │
                                ▼
                     Ingestion → Analysis workers
               SAST · Crypto/PQC · Dependency · Configuration
                                │
                                ▼
                 Findings processor → Local 8B LLM → Dashboard & reports
```

| Layer | Technology |
|---|---|
| Desktop shell | Tauri |
| UI | React + TypeScript, Vite |
| Backend | Python 3.11+, FastAPI, SQLAlchemy, Pydantic |
| Database | MySQL 8 |
| Queue | Redis 7 |
| Storage | Local filesystem (ZIPs are never stored in MySQL) |
| Search (later) | Elasticsearch |
| AI (later) | Local 8B-class model |
| Local services | Docker Compose |

## Repository layout

```
PQC-Platform/
├── desktop/            React + TypeScript UI and Tauri shell (src-tauri/)
├── backend/            FastAPI application (app/api/v1, models, schemas, services, core)
├── ingestion/          ZIP validation, safe extraction, file filtering and classification
├── analysis-engines/   Common engine interface + SAST, crypto, dependency, configuration engines
├── llm/                Local model integration (later)
├── database/           schema.sql, migrations, seed data
├── tests/              QA, security and desktop-security test suite
├── docs/               API contracts and design notes
├── infrastructure/     Deployment and packaging
└── docker-compose.yml  Local MySQL + Redis
```

## Getting started

### Prerequisites

Git · Python 3.11+ · Node.js 20 LTS+ and npm · Rust toolchain · Docker (Docker Desktop, Colima or Docker Engine + Compose) ·
[Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS.

```bash
node --version && npm --version
rustc --version && cargo --version
python --version
docker compose version
```

### 1. Start local services

```bash
cp .env.example .env   # Windows PowerShell: Copy-Item .env.example .env
# Fill MYSQL_PASSWORD, MYSQL_ROOT_PASSWORD, and REDIS_PASSWORD in .env first.
docker compose up -d
docker compose ps
```

MySQL runs on `127.0.0.1:3306` (database `pqc_security`) and Redis on `127.0.0.1:6379`.
Compose exits with a clear error if a local password is missing; credentials are not stored in tracked files.

### 2. Run the backend

See [`backend/README.md`](backend/README.md) for backend configuration and authentication endpoint details.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # never commit .env; set DATABASE_URL and REDIS_URL
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --no-server-header
```

- Swagger UI: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/api/v1/health

### 3. Run the desktop app

```bash
cd desktop
npm install
npm run tauri dev
```

The **Backend Status** indicator should turn healthy while FastAPI is running.

### 4. Run the tests

```bash
pip install -r tests/requirements.txt
pytest tests -v -rs
```

See [tests/README.md](tests/README.md) for configuration and how to read Pass / Fail / Blocked results.

## Day 1 API contract

All endpoints are served under `/api/v1`.

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Backend health check |
| `/auth/register` | POST | Development user registration |
| `/auth/login` | POST | Development login |
| `/auth/me` | GET | Current user |
| `/projects` | POST / GET | Create / list projects |
| `/projects/{id}` | GET | Project details |
| `/uploads` | POST | Upload repository ZIP |
| `/scans` | POST / GET | Create / list scans |
| `/scans/{id}` | GET | Scan status and details |
| `/scans/{id}/cancel` | POST | Cancel a scan |
| `/findings` | GET | Findings list (`severity`, `category` filters) |
| `/findings/{id}` | GET | Finding details |
| `/reports/{scan_id}` | GET | Report for a scan |

**Scan status lifecycle:** `QUEUED → INGESTING → ANALYZING → PROCESSING → AI_ANALYSIS → COMPLETED`,
or `FAILED` / `CANCELLED`.

**Finding fields:** `finding_id`, `engine`, `category`, `severity`, `title`, `file_path`, `line_number`,
`evidence`, `confidence`, `recommendation`. Engines are `sast`, `crypto`, `dependency` and `configuration`;
severities are `critical`, `high`, `medium` and `low`.

## Team and branches

| Person | Area | Branch |
|---|---|---|
| Harshith | Desktop shell + Security Dashboard | `frontend/harshith-desktop-dashboard` |
| Hema | Findings Explorer | `frontend/hema-findings` |
| Sathish | PQC Dashboard + Reports | `frontend/sathish-pqc` |
| Amrutha | FastAPI foundation + authentication | `backend/amrutha-foundation` |
| Aakash | Projects, upload and scan APIs, Redis | `backend/aakash-scan` |
| Sathwik | Findings + reports API contracts | `backend/sathwik-findings` |
| Hima Bindu | Repository ingestion | `backend/hima-ingestion` |
| Harshitha | Analysis-engine foundation | `backend/harshitha-analysis` |
| Vamsi | MySQL + core schema | `database/vamsi` |
| Pushpam | QA + cyber security + desktop security | `qa/pushpam` |

## Contributing

- Never push directly to `main`. Work on your own branch and integrate through pull requests.
- Commit small, working increments and push your branch before the end of the day.
- If you change an API request/response or a database column, update the docs and tell the people who consume it.
- Every module needs a README or clear start-up instructions.
- If you're blocked for 20–30 minutes, share the exact error, the command, and what you already tried.

## Security rules

This is a security product for air-gapped environments, so these rules are strict:

- **Never commit** `.env` files, passwords, tokens, keys, customer repositories, uploaded ZIPs, local databases (`*.db`) or model files.
- **No external network calls** from the app: no CDN assets, web fonts, analytics or telemetry. Bundle every asset locally.
- **Bind local services to `127.0.0.1`**, never `0.0.0.0`.
- **Treat every uploaded archive as hostile:** reject path traversal, symlinks and zip bombs before extraction.
- **Label all mock or development data** clearly in the UI and in API responses.
- `tests/fixtures/vulnerable-demo-repo/` is **intentionally insecure** test material with fake secrets. Never deploy or run it.

---

Internal project · © Silicofeller Quantum
