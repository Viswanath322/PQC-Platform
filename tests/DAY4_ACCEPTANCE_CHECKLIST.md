# Day 4 Acceptance Checklist — PQC Security Assessment Platform (Desktop)

Silicofeller Quantum · QA + Cyber Security + Desktop Security · owner: Pushpam · branch `day4/pushpam`

Day 4 passes only when **one integrated, tested commit** on `integration` meets every row below. Separate branches that each work on their own are not a pass.

Status values: **PASS** · **FAIL** · **BLOCKED** (dependency not merged yet) · **N/A**.
Every PASS or FAIL needs evidence: the exact commit, the command, its output or a screenshot. A failure is assigned to its owner. QA does not fix another person's feature; the owner fixes it and QA retests.

Record at the top of every run:

| Field | Value |
|---|---|
| Integration commit tested | |
| Date / tester | |
| Machine (OS, Python, Node, Rust, Docker) | |
| Day 4 PRs included | |

## A. Day 3 → Day 4 gate

Day 4 starts only after these hold on the Day 3 integrated commit.

| ID | Gate | How | Owner | Status | Evidence |
|---|---|---|---|---|---|
| G-01 | Multi-engine scan works for the agreed fixture (`vulnerable-demo-repo/`) | E2E-01 below on the Day 3 commit | Harshitha / Muni Sankar | | |
| G-02 | Findings are normalized, persisted and visible | `tests/backend/test_findings_reports.py`, DB row counts | Sathwik / Vamsi | | |
| G-03 | Crypto inventory and initial CBOM are available | CBOM endpoint returns components for the fixture | Harshitha / Sathwik | | |
| G-04 | Dependency/SBOM foundation works where implemented | SBOM endpoint returns components for `requirements.txt` | Harshitha / Sathwik | | |
| G-05 | Results persist and can be queried by scan | `tests/database`, scan-scoped queries | Vamsi / Viswanath | | |
| G-06 | Tauri flow shows real analysis results | Desktop smoke (DSK section) | Harshith | | |
| G-07 | Secrets redacted, paths relative, no unexpected network calls | SEC section | Pushpam | | |
| G-08 | Day 3 commit, tests, fixtures and blockers recorded | `tests/reports/daily/` | Pushpam | | |

## B. Automated suites

Run from the repository root with the services under test started (see `tests/README.md`).

| ID | Suite | Command | Owner | Status | Evidence |
|---|---|---|---|---|---|
| T-01 | Backend API + auth | `pytest tests/backend -v -rs` | Amrutha / Aakash / Sathwik | | |
| T-02 | Backend's own tests | `cd backend && pytest -v` | Amrutha / Aakash | | |
| T-03 | Ingestion security | `PQC_INGESTION_ROOT=. pytest tests/ingestion ingestion/tests -v -rs` | Hima Bindu | | |
| T-04 | Analysis engines | `PQC_ANALYSIS_ROOT=. PQC_DEMO_REPO=vulnerable-demo-repo pytest tests/analysis analysis-engines/tests -v -rs` | Harshitha | | |
| T-05 | Database verification | `pytest tests/database -v -rs`; `python database/verify_db.py` (twice) | Vamsi / Viswanath | | |
| T-06 | Day 1 flow + integration | `pytest tests/integration -v -rs` | Aakash / Vamsi | | |
| T-07 | Security + frontend static checks | `pytest tests/security tests/frontend -rA` | Pushpam / Harshith | | |

## C. End-to-end scan (Day 4 demo, guide §8)

| ID | Check | Expected | Owner | Status | Evidence |
|---|---|---|---|---|---|
| E2E-01 | Upload `vulnerable-demo-repo` ZIP, create scan | Scan reaches `COMPLETED` | Aakash / Muni Sankar | | |
| E2E-02 | Status transitions are real | `QUEUED → INGESTING → ANALYZING → PROCESSING → COMPLETED`, each matching actual work | Aakash / Muni Sankar | | |
| E2E-03 | File inventory | Relative, normalized paths in a stable order, classified | Hima Bindu | | |
| E2E-04 | Multi-engine execution | Per-engine status recorded; a failed engine never yields a silent `COMPLETED` | Muni Sankar / Harshitha | | |
| E2E-05 | Findings vs answer key | Recall per category and false positives on the 7 true negatives recorded against `EXPECTED_FINDINGS.json` | Harshitha | | |
| E2E-06 | Findings filters | scan, severity, engine, category, search, pagination all correct | Sathwik / Hema | | |
| E2E-07 | PQC / crypto inventory + CBOM | Real components with algorithm, file, line, detection method | Harshitha / Sathwik / Sathish | | |
| E2E-08 | SBOM / dependency results | Real components from the manifest | Harshitha / Sathwik / Sathish | | |
| E2E-09 | JSON report | Totals equal Findings and Dashboard counts | Sathwik / Sathish | | |
| E2E-10 | Clean repository | Zero unexpected findings | Harshitha | | |
| E2E-11 | Repeated scan determinism | Same repo scanned 3×: identical normalized findings, SBOM and CBOM | Harshitha / Hima Bindu | | |

## D. Failure, cancellation, retry (worker)

| ID | Check | Expected | Owner | Status | Evidence |
|---|---|---|---|---|---|
| W-01 | Corrupt ZIP / zip bomb | Scan `FAILED` with a useful, non-leaky error | Hima Bindu / Muni Sankar | | |
| W-02 | Engine exception | Scan `FAILED` (or engine marked failed); never a silent `COMPLETED` | Muni Sankar / Harshitha | | |
| W-03 | Worker killed mid-scan, then restarted | No scan stuck in a running state; no duplicate execution | Muni Sankar / Aakash | | |
| W-04 | Cancel while `QUEUED` and while running | `CANCELLED`, results discarded, queue entry removed; second cancel 409 | Aakash | | |
| W-05 | Retry (where supported) | Retried scan runs once and ends in a truthful state | Aakash | | |
| W-06 | Same scan enqueued twice / two workers | Runs exactly once | Aakash / Muni Sankar | | |
| W-07 | Backend / MySQL restart | Data intact; API returns identical results | Viswanath | | |

## E. Security (QA-owned)

| ID | Check | How | Status | Evidence |
|---|---|---|---|---|
| SEC-01 | Authentication on every route except health/register/login | Route matrix with no / bad / expired / `alg=none` tokens | | |
| SEC-02 | Organization isolation (no IDOR) on projects, uploads, scans, findings, reports, SBOM, CBOM | Two users in different orgs | | |
| SEC-03 | No known or default secrets accepted | `.env.example` JWT secret, seeded admin password, placeholder DB passwords | | |
| SEC-04 | Path privacy | No absolute host paths in API responses, DB rows, report, logs, error messages | | |
| SEC-05 | Secret redaction | Fake secrets from the fixture never appear unredacted in API, DB, report or logs | | |
| SEC-06 | Hostile ZIPs | Traversal, symlinks, bombs, duplicates, encrypted, corrupt: rejected, nothing written outside the scan dir | | |
| SEC-07 | Scanned code is never executed | Files designed to run on import leave no marker | | |
| SEC-08 | No unexpected network calls | `lsof -a -i -p <pid>` on API, worker and desktop app during a scan: only `127.0.0.1` | | |
| SEC-09 | Error hygiene | Hostile requests: no 500s, tracebacks, SQL or echoed passwords | | |
| SEC-10 | Engine robustness | Long single lines (ReDoS), huge, binary and invalid UTF-8 files finish in bounded time | | |
| SEC-11 | Dependencies | `pip-audit`, `npm audit`, `cargo audit`: no unaccepted advisories | | |
| SEC-12 | Git hygiene | No secrets, `.env`, customer data or generated artifacts in the integration diff or history | | |

## F. Desktop (Tauri)

| ID | Check | Owner | Status | Evidence |
|---|---|---|---|---|
| DSK-01 | Packaged build succeeds unpatched (`npm run tauri build`) | Harshith | | |
| DSK-02 | Login, scan, Dashboard, Findings, PQC, SBOM, CBOM, Reports work on real data in the desktop window | Harshith / Hema / Sathish | | |
| DSK-03 | No mock or placeholder data where a real API exists; unavailable features clearly labelled | Harshith / Hema / Sathish | | |
| DSK-04 | Polling stops at terminal states; loading, empty, failure, cancelled states shown | Harshith | | |
| DSK-05 | Sign-out clears the session | Harshith | | |
| DSK-06 | CSP limits connections to `127.0.0.1:8000`; capabilities minimal; no devtools in release | Harshith | | |
| DSK-07 | Finding text with HTML or script renders as plain text | Hema | | |

## G. Process (guide §7, §11)

| ID | Check | Status | Evidence |
|---|---|---|---|
| P-01 | Every Day 4 change reached `integration` through a feature branch and a reviewed PR | | |
| P-02 | PRs merged in dependency order (DB → ingestion → engines → worker → findings API → backend → frontend → QA) | | |
| P-03 | No direct pushes to `main` or `integration` | | |
| P-04 | Final integration commit recorded / tagged | | |

## Decision

| | |
|---|---|
| Final integration commit | |
| Result | PASS / FAIL |
| Blocking items (ID, owner) | |
| Signed off by | Pushpam |
