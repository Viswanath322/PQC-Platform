# 🚀 Clone & Instant Setup Guide

This guide walks you through cloning and running the **PQC Security Assessment Platform** from scratch on a new machine.

---

## 📋 Prerequisites

Ensure you have the following installed on your machine:
- **Git**: [Download Git](https://git-scm.com/)
- **Python 3.10 or newer**: [Download Python](https://www.python.org/downloads/) *(make sure "Add Python to PATH" is checked during install)*
- **Node.js 20+ & npm**: [Download Node.js](https://nodejs.org/)
- **Docker & Docker Compose**: [Docker Desktop](https://www.docker.com/products/docker-desktop/) *(or local MySQL 8 + Redis 7 installed natively)*

---

## ⚡ Option 1: Windows (PowerShell) Setup

Open **PowerShell** and run the following commands:

### 1. Clone & Configure
```powershell
# 1. Clone the repository
git clone https://github.com/Viswanath322/PQC-Platform.git
cd PQC-Platform

# 2. Create local .env configuration file
copy .env.example .env

# 3. Start MySQL and Redis containers in background
docker compose up -d
```

### 2. Install Dependencies
```powershell
# 4. Create and activate Python virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 5. Install all Python dependencies (backend, worker, tests)
pip install -r requirements.txt

# 6. Install Frontend dependencies
cd desktop
npm install
cd ..
```

---

## ⚡ Option 2: Linux / macOS (Bash) Setup

Open your **Terminal** and run:

### 1. Clone & Configure
```bash
# 1. Clone the repository
git clone https://github.com/Viswanath322/PQC-Platform.git
cd PQC-Platform

# 2. Create local .env configuration file
cp .env.example .env

# 3. Start MySQL and Redis containers in background
docker compose up -d
```

### 2. Install Dependencies
```bash
# 4. Create and activate Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 5. Install all Python dependencies (backend, worker, tests)
pip install -r requirements.txt

# 6. Install Frontend dependencies
cd desktop
npm install
cd ..
```

---

## 🎬 Launching the Application (3 Terminals)

Once dependencies are installed, launch the 3 services in separate terminal windows:

### Terminal 1: Backend API (FastAPI)
```bash
# Activate virtual environment if not already active
# Windows: .\.venv\Scripts\Activate.ps1
# Mac/Linux: source .venv/bin/activate

cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
> ✅ **Check**: Open [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health) &rarr; returns `{"status":"healthy"}`.  
> 📖 **API Docs**: Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) for Swagger UI.

---

### Terminal 2: Scan Queue Worker (Analysis Engine)
```bash
# Activate virtual environment if not already active
# Windows: .\.venv\Scripts\Activate.ps1
# Mac/Linux: source .venv/bin/activate

cd backend
python -m app.worker
```
> ✅ **Check**: Should print `PQC scan worker started. Listening on queue 'pqc:scan_queue'...`.

---

### Terminal 3: Frontend UI (Desktop / Web)
```bash
cd desktop
npm run dev
```
> ✅ **Check**: Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing Your First Scan

1. Open [http://localhost:5173](http://localhost:5173).
2. Go to **Scans** &rarr; click **New Scan**.
3. Select or enter a project name.
4. Drag & drop or select any repository `.zip` archive (e.g., zip up any folder with Python files).
5. Click **Start Security Scan**.
6. Watch the status transition in real-time: `QUEUED` &rarr; `INGESTING` &rarr; `ANALYZING` &rarr; `PROCESSING` &rarr; `COMPLETED`.
7. View your findings in the **Findings** tab, inspect algorithms in **Crypto Inventory**, and download the audit report via **Reports** &rarr; **Export JSON**.

---

## 🛠️ Verification & Testing Commands

To verify your installation with automated test suites:

```bash
# Run backend API and reports tests
python -m pytest tests/backend/test_findings_reports.py -v

# Run ingestion safety tests
python -m pytest ingestion/tests/ -v

# Run analysis engines tests
python -m pytest analysis-engines/tests/ -v

# Verify frontend build compiles with 0 errors
cd desktop
npm run build
```

---

## ❓ Troubleshooting

| Issue | Solution |
| :--- | :--- |
| **Docker not installed / not running** | If you don't have Docker, run a local MySQL 8 instance on port `3306` with database `pqc_security`, and Redis on port `6379`. Then initialize tables by importing `database/schema.sql` and `database/seed.sql`. |
| **PowerShell script execution error** | If `Activate.ps1` gives an execution policy error, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` and then run `.venv\Scripts\activate`. |
| **Port 3306 or 6379 already in use** | A local MySQL or Redis instance may already be running. Either stop existing services or change the host port mappings in `docker-compose.yml` and `.env`. |
| **Backend Status pill shows Red in UI** | Ensure the FastAPI server is running on `http://127.0.0.1:8000`. You can test by navigating directly to `http://127.0.0.1:8000/api/v1/health` in your browser. |
