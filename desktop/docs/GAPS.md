# Backend API Gaps & Contract Alignment (Day 2)

This document tracks all API schema gaps, missing database fields, and contract discrepancies identified during the Day 2 Desktop Shell + Security Dashboard implementation for the PQC Security Assessment Platform.

Per project guidelines, the UI does not invent fields silently. All missing values are handled gracefully with `"Not reported"` states (or loading skeletons) rather than zero defaults.

---

## Summary of Identified Gaps

| # | Field / Feature | Endpoint | Owner | Impact & Workaround |
|---|---|---|---|---|
| **GAP-01** | `files_analyzed` / count | `GET /api/v1/scans/{id}` | **Aakash** (Scans) / **Vamsi** (DB) | Not present in `ScanOut` or `scans` table. UI displays `"Not reported"`. |
| **GAP-02** | `repository_filename` / `filename` | `GET /api/v1/scans/{id}` | **Aakash** (Scans) / **Vamsi** (DB) | `Scan` table stores internal `repository_path`, but `ScanOut` does not expose original filename. UI displays `"Not reported"`. |
| **GAP-03** | `error_message` on FAILED scans | `GET /api/v1/scans/{id}` | **Aakash** (Scans) / **Vamsi** (DB) | `Scan` table only stores `status = "FAILED"` without an error string column. UI shows verbatim API error if returned by endpoint, otherwise prompts to inspect logs. |
| **GAP-04** | `scan_id` filter on Findings | `GET /api/v1/findings` | **Sathwik** (Findings) | `read_findings` in `findings.py` filters by `severity`, `category`, and `engine`, but lacks `scan_id`. UI passes `?scan_id=` and performs client-side safety filtering. |
| **GAP-05** | Severity counts on Scan | `GET /api/v1/scans/{id}` | **Aakash** (Scans) / **Sathwik** (Reports) | `ScanOut` does not include findings counts. UI derives counts on completion by calling `GET /api/v1/reports/{scan_id}`. |
| **GAP-06** | Tauri CSP tightened | `src-tauri/tauri.conf.json` | **Frontend / Security** | Replaced `csp: null` with strict air-gapped CSP policy allowing only `'self'` and `http://127.0.0.1:8000`. |

---

## Detailed Gap Specifications

### GAP-01: Analyzed File Count
* **Endpoint:** `GET /api/v1/scans/{scan_id}` and `GET /api/v1/scans`
* **Current Contract:** `ScanOut` contains `id`, `project_id`, `status`, `created_at`, `started_at`, `completed_at`.
* **Requested Addition:** `files_analyzed: Optional[int] = None`
* **Owners:** **Aakash** (Scans API) / **Vamsi** (Database `scans` table)
* **Frontend Handling:** UI renders `"Not reported"` in summary cards and table rows instead of `0`.

### GAP-02: Repository Filename / Archive Display Name
* **Endpoint:** `GET /api/v1/scans/{scan_id}` and `GET /api/v1/scans`
* **Current Contract:** Internal filesystem path is stored in `repository_path`, but is not exposed in `ScanOut`.
* **Requested Addition:** `repository_name: Optional[str] = None` (the original filename such as `core-services.zip`).
* **Owners:** **Aakash** (Scans API) / **Vamsi** (Database `scans` table)
* **Frontend Handling:** UI displays `"Not reported"` when absent.

### GAP-03: Verbatim Analysis Failure Error Message
* **Endpoint:** `GET /api/v1/scans/{scan_id}`
* **Current Contract:** `status` transitions to `"FAILED"`, but there is no column or response field for the failure cause.
* **Requested Addition:** `error_message: Optional[str] = None` in `ScanOut`.
* **Owners:** **Aakash** (Scans / Ingestion runner) / **Vamsi** (Database schema)
* **Frontend Handling:** UI `ScanStepper` renders any error message returned verbatim. If the API returns none, it shows: `"Scan terminated with an unhandled analysis engine error."`

### GAP-04: Server-Side Filtering of Findings by Scan ID
* **Endpoint:** `GET /api/v1/findings`
* **Current Contract:** Query parameters: `severity`, `category`, `engine`, `finding_category`, `limit`, `offset`. Does not accept `scan_id`.
* **Requested Addition:** Add `scan_id: Optional[str] = Query(default=None)` to `read_findings()` in `backend/app/api/v1/findings.py`.
* **Owner:** **Sathwik** (Findings service)
* **Frontend Handling:** UI sends `?scan_id={scanId}` and verifies `f.scan_id === scanId` client-side. Furthermore, for scan-level severity breakdown, the UI queries `GET /api/v1/reports/{scan_id}` which provides authoritative per-scan grouped counts.

### GAP-05: Direct Findings Severity Summary on Scan Model
* **Endpoint:** `GET /api/v1/scans/{scan_id}`
* **Current Contract:** Separate call to `GET /api/v1/reports/{scan_id}` required to obtain `{ total_findings, findings_by_severity: { critical, high, medium, low } }`.
* **Owner:** **Aakash** / **Sathwik**
* **Frontend Handling:** Handled cleanly in `useScanPolling`: when the scan transitions to `COMPLETED`, the hook automatically performs a single final fetch to `GET /api/v1/reports/{scan_id}` and populates `findingsSummary`.

### GAP-06: Tauri CSP Policy Tightened (Air-Gapped Compliance)
* **File:** `desktop/src-tauri/tauri.conf.json`
* **Change:** Tightened CSP from `null` to:
  ```json
  "csp": "default-src 'self'; connect-src 'self' http://127.0.0.1:8000 http://localhost:8000 ws://localhost:5173 http://localhost:5173; font-src 'self' data:; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'"
  ```
* **Security Result:** All remote CDNs, Google Fonts, and external outbound connections are strictly forbidden. Only the local Tauri origin and local FastAPI backend (`http://127.0.0.1:8000`) are permitted.
