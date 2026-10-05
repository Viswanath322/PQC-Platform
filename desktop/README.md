# PQC Security Assessment Platform — Frontend UI

Modern React + TypeScript desktop and web interface for the PQC Security Assessment Platform.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

> **Note**: Ensure the FastAPI backend is running on `http://127.0.0.1:8000`. The header status pill will turn **green** once connected.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Vite dev server with Hot Module Replacement (HMR) on port 5173 |
| `npm run build` | Runs TypeScript type checking (`tsc -b`) and generates production bundle in `dist/` |
| `npm run preview` | Previews the production build locally |
| `npm run lint` | Runs the Oxlint fast linter |
| `npm run tauri dev` | Launches the native Tauri desktop window (requires Rust toolchain) |

---

## Key Features

- **Executive Dashboard**: System posture, quantum readiness index, active scan counters.
- **Projects & Scan Ingestion**: Upload `.zip` repositories, track live analysis pipeline (`QUEUED → INGESTING → ANALYZING → PROCESSING → COMPLETED`).
- **Findings Explorer**: Search, filter by severity (Critical, High, Medium, Low), inspect line-level source evidence and code remediation.
- **PQC Assessment**: Shor/Grover risk classification, quantum readiness gauge, algorithm migration candidates (NIST FIPS 203/204).
- **Cryptographic Inventory**: Catalog of detected cryptographic primitives, algorithms, key sizes, and library bindings.
- **Compliance Reports**: Live audit telemetry and downloadable machine-readable report JSON (`GET /api/v1/reports/{scan_id}`).
