# Day 2 Verification & Manual Test Suite

This document defines the comprehensive manual test protocol for the Day 2 Desktop Shell + Security Dashboard deliverable of the PQC Security Assessment Platform.

Since the project does not currently use Vitest, this manual test script provides deterministic test steps and expected observations for all critical runtime behaviors.

---

## Test Environment Setup
1. Ensure dependencies are installed:
   ```bash
   cd desktop
   npm install
   ```
2. Verify TypeScript compilation and production bundle build:
   ```bash
   npm run build
   # Must complete with 0 errors
   ```
3. Start the local Vite development server:
   ```bash
   npm run dev
   # Server launches at http://localhost:5173/
   ```

---

## Test Scenario 1: Polling Stops on Terminal Status (`COMPLETED`, `FAILED`, `CANCELLED`)

### Objective
Verify that the `useScanPolling` hook halts HTTP requests immediately once a scan transitions to a terminal state (`COMPLETED`, `FAILED`, or `CANCELLED`).

### Steps:
1. Open DevTools Network tab on `http://localhost:5173/#/scans`.
2. Click on an active scan or trigger a new scan from the modal.
3. Observe Network requests to `GET /api/v1/scans/{id}` occurring every 2 seconds while status is `INGESTING` or `ANALYZING`.
4. Allow the scan to transition to `COMPLETED` (or click **Cancel Scan** to set `CANCELLED`).

### Expected Observations:
* Upon receiving `COMPLETED`, `FAILED`, or `CANCELLED`, polling immediately ceases.
* No further requests to `GET /api/v1/scans/{id}` appear in the Network tab.
* For `COMPLETED`, exactly one final request is made to `GET /api/v1/reports/{id}` to capture final verified findings counts.
* The Status Pill displays the terminal state (`Completed`, `Failed`, or `Cancelled`) with the appropriate indicator dot (emerald, rose, or slate).

---

## Test Scenario 2: Exponential Backoff on Errors (2s → 4s → 8s → 15s)

### Objective
Verify that transient network or API errors trigger exponential backoff rather than hammering the local backend.

### Steps:
1. Navigate to `http://localhost:5173/#/scans/{id}` for an in-progress scan.
2. Stop the local FastAPI backend (or simulate disconnection by suspending port 8000).
3. Observe the DevTools Console and Network tabs.

### Expected Observations:
* **Failure #1:** Retries after **2s**.
* **Failure #2:** Retries after **4s**.
* **Failure #3:** Retries after **8s**.
* **Failure #4:** Retries after **15s** (capped at 15s).
* The top `ErrorBanner` appears immediately with the red alert outline, verbatim error message, timestamp, and target endpoint (`/api/v1/scans/{id}`).

---

## Test Scenario 3: Stops After 5 Failures & Surfaces "Connection Lost" State

### Objective
Ensure bounded failure handling: polling must not run indefinitely during an outage.

### Steps:
1. Keep the local FastAPI backend offline for 5 consecutive polling attempts.
2. Observe the UI state and network traffic after the 5th attempt.

### Expected Observations:
* On the 5th consecutive failure, all automated timer scheduling halts.
* The `LastUpdated` bar changes to:
  `Paused: Connection lost` with a prominent **Resume / Retry** button.
* The `ErrorBanner` displays the target endpoint, `"Network error"`, and an active **Retry** button.
* Restart the FastAPI backend and click **Retry**:
  - The error clears.
  - The failure counter resets to 0.
  - Live polling resumes immediately.

---

## Test Scenario 4: Pause When Window is Hidden & Resume on Focus

### Objective
Comply with air-gapped system resource constraints by pausing polling when the application window or tab is not active.

### Steps:
1. Open an active in-progress scan on `http://localhost:5173/#/scans/{id}`.
2. Minimize the browser window or switch to a different tab (triggers `document.visibilityState === 'hidden'`).
3. Wait 10 seconds.
4. Switch back to the application tab (triggers `document.visibilityState === 'visible'`).

### Expected Observations:
* While the tab is hidden, zero network requests are issued.
* When returning to the tab, the hook immediately dispatches a synchronization request and resumes the regular interval.

---

## Test Scenario 5: Zero-Findings Rendering (Clean Scan)

### Objective
Verify that a scan completing with zero vulnerabilities renders a dedicated clean state rather than broken empty metrics or false warnings.

### Steps:
1. Navigate to `http://localhost:5173/#/scans/{id}` for a completed scan with 0 findings (or mock response `{ total_findings: 0, findings_by_severity: { critical: 0, high: 0, medium: 0, low: 0 } }`).
2. Observe the Summary Cards and the Findings section.

### Expected Observations:
* **Total Findings Card:** Displays `0` in bold purple text.
* **Findings by Severity Section:** Displays the `EmptyState` component with:
  - Title: `"No findings detected"`
  - Description: Stating that 0 cryptographic vulnerabilities or post-quantum risks were found across AST, Crypto, SAST, and Dependency engines.
  - Sub-details: Displays `"Files analyzed: {count or Not reported}"` and `"Status: COMPLETED"`.
  - Action link: `"View Findings Explorer"`.
* The Security Score on the Dashboard computes to `100 / 100` for a clean completed scan.

---

## Test Scenario 6: Air-Gapped Security & Network Inspection

### Objective
Strict verification that no external or remote requests are made.

### Steps:
1. Open DevTools Network tab. Filter by all requests.
2. Refresh the entire page and interact with the Dashboard, Scans, and ScanDetail pages.
3. Inspect `src-tauri/tauri.conf.json` for CSP configuration.

### Expected Observations:
* All requests go **strictly** to:
  - `http://localhost:5173/` (Vite dev assets, system fonts)
  - `http://127.0.0.1:8000/api/v1/*` (local FastAPI backend)
* Zero requests to Google Fonts (`fonts.googleapis.com`), external CDNs, unpkg, cdnjs, or analytics engines (Sentry, Google Analytics, Datadog).
* `tauri.conf.json` CSP is active with `default-src 'self'` and `connect-src 'self' http://127.0.0.1:8000 ...`.
