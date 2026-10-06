# PQC Security Assessment Platform

**Silicofeller Quantum** · On-premises, air-gapped security assessment platform for software vulnerability detection and Post-Quantum Cryptography (PQC) readiness.

The platform inspects source-code repositories to provide:
- **SAST Vulnerability Analysis**: Injection vulnerabilities, hardcoded credentials/secrets, path traversal, and misconfigurations.
- **Cryptographic Inventory & PQC Risk Classification**: Categorizes classical primitives (RSA, ECC, Diffie-Hellman, MD5, SHA-1) against Shor's and Grover's quantum threats.
- **NIST FIPS 203/204 Migration Guidance**: Actionable migration candidate recommendations to transition to quantum-safe algorithms (ML-KEM / ML-DSA).
- **Compliance Audit Reporting**: Machine-readable JSON reports exported directly for offline regulatory compliance.
- **100% Air-Gapped Execution**: All engines, databases, and UI components execute strictly on `127.0.0.1`. No code, findings, or telemetry leave the host machine.

---

> 🚀 **Instant Setup Guide**: Setting up on a new machine? See the step-by-step copy-paste instructions in [**CLONE_SETUP.md**](CLONE_SETUP.md).

## Architecture & Service Map

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Desktop / Web Interface (React 19 + TypeScript)      │
│     Dashboard · Projects · Scans · Findings · PQC Assessment · Reports │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTP (127.0.0.1:5173 ↔ 127.0.0.1:8000)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   FastAPI Backend API (Python 3.10+)                   │
│     Authentication · Projects · Upload Ingestion · Reports · Health    │
└──────────────────┬─────────────────┬───────────────────┬───────────────┘
                   │                 │                   │
                   ▼                 ▼                   ▼
            MySQL 8 Database   Redis 7 Queue    Local Storage
            (Persistent Data)  (pqc:scan_queue) (storage/uploads)
                                     │
                                     ▼
                   ┌──────────────────────────────────┐
                   │    Background Scan Worker        │
                   │    (python -m app.worker)        │
                   ├──────────────────────────────────┤
                   │ 1. ZIP Extraction & Path Safety  │
                   │ 2. Language & Framework Analysis │
                   │ 3. AST SAST Rule Engine          │
                   │ 4. Cryptographic Rule Engine     │
                   │ 5. Database Findings Persistence │
                   └──────────────────────────────────┘
```

| Service | Port / URL | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | [http://localhost:5173](http://localhost:5173) | Primary user interface |
| **FastAPI Backend** | [http://127.0.0.1:8000](http://127.0.0.1:8000) | Core REST API |
| **API Documentation** | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) | Interactive Swagger OpenAPI UI |
| **Backend Health** | [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health) | Live service heartbeat |
| **MySQL Database** | `127.0.0.1:3306` | Relational persistence (`pqc_security`) |
| **Redis Broker** | `127.0.0.1:6379` | Background scan job queue |

---

## Quick Start (Start in 4 Steps)

### Prerequisites
- **Python 3.10+**
- **Node.js 20+** and **npm**
- **Docker** & **Docker Compose** *(or local MySQL 8 & Redis 7)*
- **Git**

---

### Step 1: Clone & Configure Environment

Clone the repository and create your local `.env` configuration:

```bash
# Clone the repository
git clone https://github.com/Viswanath322/PQC-Platform.git
cd PQC-Platform

# Copy the environment template
# Windows PowerShell:
copy .env.example .env

# macOS / Linux:
cp .env.example .env
```

> **Note:** The default `.env.example` includes pre-configured local development credentials out-of-the-box.

---

### Step 2: Start Infrastructure (MySQL & Redis)

Start the local MySQL 8 database and Redis broker containers via Docker Compose:

```bash
docker compose up -d
```

Verify containers are running:
```bash
docker compose ps
```
*(The MySQL container automatically initializes the schema from `database/schema.sql` and default organization seed from `database/seed.sql` on first start).*

---

### Step 3: Install Python Dependencies & Start Backend

Create a Python virtual environment, install requirements, and run the backend services:

#### Terminal 1 — FastAPI Server:
```bash
# Create and activate virtual environment
python -m venv .venv

# Activate on Windows:
.venv\Scripts\activate
# Activate on macOS / Linux:
source .venv/bin/activate

# Install all dependencies
pip install -r requirements.txt

# Start the FastAPI server
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Test health check: open [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health) &rarr; `{"status":"healthy"}`.

#### Terminal 2 — Background Scan Worker:
Open a second terminal, activate the environment, and start the Redis worker that processes scan jobs:

```bash
# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

# Start the queue worker
cd backend
python -m app.worker
```
The worker will log: `PQC scan worker started. Listening on queue 'pqc:scan_queue'...`.

---

### Step 4: Install Frontend Dependencies & Start UI

In a third terminal, start the modern Vite interface:

#### Terminal 3 — Frontend:
```bash
cd desktop
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser!

---

## Running a Test Scan

1. Open the UI at [http://localhost:5173](http://localhost:5173).
2. Navigate to **Projects** or **Scans**.
3. Click **New Scan** &rarr; select or create a project.
4. Upload any `.zip` containing Python files (or compress any sample code).
5. Click **Start Security Scan**.
6. Watch the scan transition through `QUEUED → INGESTING → ANALYZING → PROCESSING → COMPLETED`.
7. Explore findings in **Findings**, review quantum risk in **PQC Assessment**, inspect algorithms in **Crypto Inventory**, and download the audit payload from **Reports** (**Export JSON**).

---

## Running Tests

All test suites can be run locally using `pytest`:

```bash
# Run backend findings & reports tests
python -m pytest tests/backend/test_findings_reports.py -v

# Run repository ingestion safety tests
python -m pytest ingestion/tests/ -v

# Run analysis engines contract tests
python -m pytest analysis-engines/tests/ -v

# Run frontend production build & type checks
cd desktop
npm run build
```

---

## Repository Structure

```
PQC-Platform/
├── backend/            # FastAPI backend API, schemas, routes, and Redis scan worker
├── desktop/            # React + TypeScript frontend application (Vite / Tailwind / Lucide)
├── analysis-engines/   # Core analysis pipelines (AST-based SAST and Cryptographic primitive inspection)
├── analysis_engines/   # Import facade package mapping to analysis-engines
├── ingestion/          # ZIP archive validation, path traversal safety, and file classification
├── database/           # MySQL 8 schema (schema.sql), seed data (seed.sql), and ER diagrams
├── storage/uploads/    # Storage root for uploaded archives and extracted scan repositories
├── tests/              # End-to-end integration, security, and regression tests
├── docker-compose.yml  # Local Docker Compose setup for MySQL 8 and Redis 7
├── requirements.txt    # Unified Python dependencies file for quick installation
└── .env.example        # Environment variable template
```

---

## Security Guidelines

- **Zero Remote Dependencies**: The platform is built to operate in offline, air-gapped environments. Do not introduce CDN links or external telemetry.
- **Never Commit Secrets**: Keep `.env`, keys, tokens, and archive data out of Git tracking.
- **Safe Extraction**: All uploaded files are strictly checked against Zip Slip path traversal and symlink vulnerabilities before extraction.
- **Binding**: Local servers are strictly bound to `127.0.0.1`.

---

© Silicofeller Quantum · Air-Gapped Post-Quantum Cryptography Assessment Platform
