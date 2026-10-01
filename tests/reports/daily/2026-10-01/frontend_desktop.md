# Retest: frontend and desktop shell (raw)

Date: 2026-10-01 (Day 3) · QA: Pushpam · Suites: `tests/frontend`, `tests/security` on `qa/pushpam`, nothing committed

Short version: the biggest change since yesterday is that Sathish's PQC-frontend now has a real auth client with no silent mock fallback and a Tauri CSP, and I confirmed both by running the app against a stub backend. The desktop shell now builds and launches on this machine, but only after I patch the bundle identifier, which is still `com.tauri.dev`. The bigger problem is new: the UI was written against a different API than the one the backend now serves. Against backend-shaped data the Findings, Projects and Scans pages render blanks, show wrong numbers, and go to a white screen as soon as someone types in the search box. And there is no way to sign out.

## What was tested

| Worktree | Branch | Commit | Owner |
|---|---|---|---|
| .worktrees/frontend | PQC-frontend | f398717 "implement authenticated API contract (TASK - Auth Contract)" | Sathish / Harshith |
| .worktrees/findings-ui | frontend/findings-explorer | 10234f7 (merge of an older PQC-frontend into it) | Hema |
| .worktrees/aakash-port (read only, not run) | backend/aakash-port | 239761f (auth + projects + uploads + scans) | Aakash |
| .worktrees/sathwik (read only, not run) | backend/sathwik-findings | fd856c3 (findings + reports) | Sathwik |

All builds, installs and cargo runs were done in copies under the session scratchpad (`.../scratchpad/fe/{pqc-frontend,findings-ui,patched}`), never in a worktree. `git status --porcelain --ignored` on the worktrees shows only `desktop/dist/` and `desktop/node_modules/`, which are git-ignored and were already there; main checkout is clean.

Heads up on the `tests/security` and `tests/frontend` runs: they scan the worktree as it is on disk, so the dist checks read the `desktop/dist` that was already in each worktree. I rebuilt in scratch and the dist content is the same (same hashed bundle name on PQC-frontend, `index-ChgkxgIr.js`).

## Labels used

- Branch bug: a defect in this branch's own code that stays after merging.
- Integration risk: only appears because two branches disagree on a shared contract. Both owners named.
- Waiting on merge: not a bug, the piece is not delivered or combined yet.

## 1. Test counts

`PQC_SCAN_ROOT=<worktree> .venv/bin/pytest tests/frontend tests/security -rA -p no:cacheprovider --tb=short -q`

| Branch | Passed | Failed | Skipped | Failures |
|---|---|---|---|---|
| PQC-frontend f398717 | 39 | 12 | 2 | `test_mock_data_is_labelled` (1), `test_gitignore` (8), `test_hardcoded_passwords` + `test_detect_secrets` (2), `test_bundle_identifier_not_default` (1) |
| findings-explorer 10234f7 | 37 | 14 | 2 | the same 12 except secrets pass, plus `test_csp_is_set`, `test_connect_src_limited_to_local_backend`, `test_built_dist_has_no_external_urls`, `test_no_external_urls_in_desktop` |

Breakdown of the 14 on findings-explorer: mock-labelled (1), gitignore (8), identifier (1), csp (1), connect-src (1), dist URLs (1), desktop URLs (1). The two secrets tests pass there because the new auth test file does not exist on that branch.

Skips on both: no `requirements*.txt` at the scan root, and no `backend/` at the scan root. Both are expected for a frontend-only branch.

What each failure is, with its label:

| Failure | Branch(es) | Label | Owner |
|---|---|---|---|
| `test_bundle_identifier_not_default` | both | Branch bug | Harshith (DSK-02) |
| `test_mock_data_is_labelled` | both | Branch bug on PQC-frontend (`App.tsx` imports mock data without a badge), Waiting on merge on findings-explorer (the badges added on PQC-frontend are not in it) | Sathish / Hema |
| `test_csp_is_set`, `test_connect_src_limited_to_local_backend` | findings-explorer only | Waiting on merge (fix exists on PQC-frontend) | Hema |
| `test_built_dist_has_no_external_urls`, `test_no_external_urls_in_desktop` | findings-explorer only | Waiting on merge (`github.com/internal/` at `api.ts:185` was removed on PQC-frontend) | Hema |
| `test_gitignore` x8 (no root `.gitignore`) | both | Waiting on merge. The root `.gitignore` only exists on my qa branch; neither frontend branch has one at the repo root. Whoever integrates onto main needs to carry one. Note both branches do have `desktop/.gitignore` and `desktop/src-tauri/.gitignore`, so the app folder itself is covered; the 8 checks fail on root-relative paths such as `.env`, `backend/.env`, `backend/dev.db`. | integrator (Amrutha's foundation or main) |
| `test_hardcoded_passwords`, `test_detect_secrets` | PQC-frontend | Branch bug (low, and honestly a scanner false positive) | Sathish. See FE-16. Hits are `LoginPage.tsx:244` (`autoComplete='current-password'`) and the auth test fixture `apiAuthContract.test.mjs:242` (`password: 'secret'`) plus lines 86-151 of that file. No real secret. I will allowlist the `autoComplete` attribute and `__tests__/` in the scanner; the fixture is a test value. |

Dev placeholder warning that is not a failure but should not ship: `desktop/src/data/mockData.ts:177` contains `"jwt_signing_secret": "prod_sec_994821a8d8e12b774f1c90c7"` as display text in a mock evidence string. It is the kind of string that makes a customer's secret scanner light up. Please reword it (FE-14).

### Scratch build results (`npm ci`, build, lint, tsc, audit)

| Check | PQC-frontend | findings-explorer |
|---|---|---|
| `npm ci` | ok, 136 packages | ok |
| `npm run build` (`tsc -b && vite build`) | ok, 1.0 s, JS 464 kB, CSS 130 kB | ok, JS 480 kB, CSS 183 kB |
| `npm run lint` (oxlint) | 0 errors, warnings only (react set-state-in-effect, exhaustive-deps, only-export-components, one unused import in the new test file) | 0 errors, warnings only |
| `tsc --noEmit -p tsconfig.app.json` | clean | clean |
| `npm audit` (full and `--omit=dev`) | 0 vulnerabilities | 0 vulnerabilities |
| `npm test` (node --test, PQC-frontend only) | 9 of 9 pass, but see FE-16 | no test script |
| Source maps in dist | none | none |

## 2. Retest of yesterday's items

Status key: Fixed / Partly / Not fixed. Fixed rows are labelled with the original class and "(closed)".

| ID | PQC-frontend f398717 | findings-explorer 10234f7 | Label (open part) |
|---|---|---|---|
| FE-05 title / product name | Fixed. `index.html:12` title is "PQC Security Assessment Platform". | Fixed (`index.html:8`). | Branch bug (closed) |
| FE-06 silent mock fallback | **Fixed.** `api.ts` has no catch that returns mock data; every method calls `request()` and throws a typed `ApiError`. Verified live, see below. | **Not fixed.** `api.ts` still imports `mockProjects/mockScans/mockFindings/mockReport` (lines 9-22). 15 `catch` blocks fall back to mock. `login()` at 125-137 mints `mock_jwt_*` and an "admin" user for any password; `register()` at 103-113 does the same. | Waiting on merge (Hema must take the PQC-frontend `api.ts`; see FE-17 for the conflict) |
| FE-07 token in localStorage | **Not fixed.** `api.ts:89` reads and `:95`/`:97` writes `pqc_auth_token`; `AuthContext.tsx:54` and `:64` read it directly. Observed `localStorage` key `pqc_auth_token` after login. The new unit test even asserts it (`TEST 1 - login stores access_token in localStorage`), so the contract now enshrines it. | Not fixed (`api.ts:30`, `:36`, `:38`). | Branch bug (Sathish / Harshith) |
| FE-08 mock labels | **Partly.** Badge is back on Dashboard (`Dashboard.tsx:81`, `:204`), PQC (`PQC.tsx:50`), Reports (`Reports.tsx:53`, `:110`), Crypto Inventory (`CryptoInventory.tsx:33`), and the tables. Text is now "DEVELOPMENT / MOCK DATA", "Demo Telemetry" is gone. Still missing: `App.tsx:16`, `:95-96` feeds `mockProjectMetadata` (project "Enterprise-Core-Services", branch "main") into the header with no badge, and the badge that would sit there (`TopHeader.tsx:130`) is in a component that is never rendered (FE-13). Page-level badges also sit on Dashboard even when real API data is shown, which makes the label meaningless. | Not fixed. `MockDataBadge.tsx:24` still says "Demo Telemetry" and the badge is only on Findings and SystemSecurityDashboard. | Branch bug (PQC-frontend, Sathish); Waiting on merge (findings-explorer, Hema) |
| FE-09 `github.com/internal/` string | **Fixed.** Not in `src/` or `dist/`. Only remaining GitHub URLs are mock repo URLs in `data/mockData.ts:17,30,43,56` and `pqcMockData.ts:13`. | Not fixed, `api.ts:185`, and it is in the bundle. | Waiting on merge (findings-explorer) |
| DSK-01 CSP null | **Fixed.** `tauri.conf.json` `csp`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self' http://127.0.0.1:8000 http://localhost:8000; object-src 'none'; base-uri 'self'; form-action 'self'`, plus a separate `devCsp`. `test_csp_is_set` and connect-src tests pass. Remaining nit: DSK-06. | Not fixed, `"csp": null`. | Waiting on merge (findings-explorer) |
| DSK-02 identifier `com.tauri.dev` | **Not fixed.** `tauri.conf.json:5`. Unpatched `npm run tauri build -- --debug` stops in 0.4 s: "You must change the bundle identifier in `tauri.conf.json identifier`. The default value `com.tauri.dev` is not allowed". Reproduced today. | Not fixed. | Branch bug (Harshith) |
| DSK-03 `Cargo.lock` committed | **Not fixed.** `git ls-files` shows no `Cargo.lock`. `src-tauri/.gitignore` ignores only `/target/` and `/gen/schemas`, so it is just missing. After a build in scratch it is generated (424 crates); that file should be committed. | Not fixed. | Branch bug (Harshith) |
| DSK-04 scaffold metadata | **Partly.** Fixed: window now has label, 1280x800, `minWidth 960`, `minHeight 640`, title. Still `Cargo.toml`: `name = "app"`, `description = "A Tauri App"`, `authors = ["you"]`, `license = ""`, `repository = ""`, `crate-type = ["staticlib","cdylib","rlib"]` (mobile types), and `tauri.conf.json` `bundle.targets = "all"` and an `android.debugApplicationIdSuffix` block. | Not fixed (still 800x600, no min size). | Branch bug (Harshith) |
| DSK-05 shell cannot be built/run | **Fixed (environment).** Rust 1.98 is installed. With the identifier patched it builds in 3m18s and both a `.app` (31 MiB) and a `.dmg` (8.6 MiB) are produced. Runtime check below. | not rebuilt (same config) | n/a, QA environment item, closed |
| Google Fonts / external URLs | **Fixed.** `grep` for `fonts.googleapis`/`gstatic` finds nothing in `src/`, `index.html`, `dist/`. Fonts are `@fontsource*` (woff/woff2 in `dist/assets`). URLs in the bundle are only inert: w3.org namespace ids, `react.dev/errors`, `reactrouter.com`, `github.com/ungap/url-search-params`, mock repo URL `github.com/enterprise/core-services.git`, and `http://127.0.0.1`/`http://localhost`. No `WebSocket`, `EventSource`, `sendBeacon`. | Same, plus `github.com/internal/` and the other mock GitHub URLs. | Waiting on merge (api.ts:185 only) |
| Tauri capabilities | **Pass.** See section 5. | Pass | none |

### FE-06, evidence

Ran the production build (`vite preview` on 127.0.0.1:4173) in the Browser pane against a throw-away stub backend I wrote in the scratchpad (127.0.0.1:8000, stub shaped like the aakash-port responses; stopped afterwards).

- Wrong password: stub returned 401. UI stayed on the login screen with "Authentication required. Please sign in to continue." No token stored (`localStorage` empty). Not a fake login. (Message is generic, see FE-15.)
- Correct password: 200, token stored, Dashboard loads.
- Backend stopped, correct password: UI shows "Backend unavailable. Check that the server is running and try again." No token stored. Not a fake login.
- Backend stopped, page reload with a stored token: boot check fails, token cleared, login screen (this also logs you out on a transient failure, see FE-18).
- `getProjects` on 401 throws and does not return mock data (TEST 6), network failure throws `NETWORK_ERROR` (TEST 9). Those pass, but see FE-16 on what those tests really exercise.

FE-06 is fixed for auth and for the API methods. What is not fixed is that pages still invent data in other ways: FE-14.

## 3. Contract check: frontend client vs backend

Left side is the PQC-frontend client (`desktop/src/services/api.ts`, `desktop/src/types/index.ts`). Right side is aakash-port for auth/projects/uploads/scans and sathwik for findings/reports. Paths are in `backend/app/...`.

### What matches

- Base URL `http://127.0.0.1:8000/api/v1` (`api.ts:10-11`) matches `main.py:32` prefix `/api/v1`.
- Health: `GET /health` (`api.ts:179-181`) vs `routes/health.py:6-8` returning `{"status":"healthy"}`. The UI accepts `healthy` or `ok` (`App.tsx:35`).
- Auth header: `Authorization: Bearer <token>` (`api.ts:129-131`) vs `HTTPBearer` (`routes/auth.py:13`, `:17-28`). CORS allows `Authorization` and `Content-Type` (`main.py:21`) and origins `http://localhost:5173`, `http://127.0.0.1:5173`, `tauri://localhost`, `http://tauri.localhost` (`core/config.py:14-17`), which covers the Tauri WebView origin on macOS and Windows.
- `POST /auth/login` returns `{access_token, token_type}` (`schemas/auth.py:46-49`, `routes/auth.py:73-78`); client reads `access_token` and then calls `GET /auth/me` (`api.ts:213-222`).
- Scan status enum: all 8 values equal (`types/index.ts:1-9` vs `schemas/scan.py:12-22`).
- `POST /scans/{id}/cancel`, `GET /scans/{id}`, `GET /projects/{id}`, `POST /uploads` multipart field name `file`: paths and methods match (`api.ts:253`, `:272`, `:301`, `:305` vs `projects.py:34`, `uploads.py:11-13`, `scans.py:61`, `:74`).
- 401 handling: client clears the token and notifies on any 401 (`api.ts:156-159`); matches the backend's consistent 401 (`routes/auth.py:21-26`).

### Mismatches (each one is a defect for the integrated app)

| # | Area | Frontend (file:line) | Backend (file:line) | Effect |
|---|---|---|---|---|
| M1 | Register body | sends `full_name` (`api.ts:193-197`, `AuthContext.tsx:122`) | `RegisterRequest` has only `email`, `password` (`schemas/auth.py:36-38`) | name silently dropped. `full_name` in the response is computed from the email prefix (`schemas/auth.py:60-64`) |
| M2 | Register password | only "not empty" (`LoginPage.tsx:33-34`) | `min_length=12, max_length=128` (`schemas/auth.py:38`) | 422 with `detail` as an array; client only reads string `detail` (`api.ts:148`) so user sees "Unexpected error (HTTP 422)." (`api.ts:53-54`) |
| M3 | Login 401 text | discards server detail for 401 (`api.ts:37-39`) | `"Invalid email or password"` (`routes/auth.py:77`) | wrong password shows "Authentication required. Please sign in to continue." |
| M4 | User role | `role: 'admin' \| 'security_auditor' \| 'analyst' \| 'viewer'` (`types:30`) | `role: str`, DB default `'user'` (`schemas/auth.py:57`, `database/schema.sql:44`) | `'user'` is not in the union; the raw value is printed (low) |
| M5 | Project create body | sends `repository_url` (`api.ts:241-245`, `ProjectForm.tsx:36-40`) | `ProjectCreate` = `name`, `description` only (`schemas/project.py:9-11`) | repo URL silently dropped; the form collects it for nothing |
| M6 | Project response | needs `repository_url`, `branch`, `last_scan_id/at/status`, `findings_count` (`types:68-85`) | `ProjectOut` = `id`, `name`, `description`, `created_at` (`schemas/project.py:14-20`) | all missing; UI invents values (FE-14). `updated_at` required by the type is not returned either |
| M7 | Project description | `description: string` (`types:71`), `.toLowerCase()` at `Projects.tsx:101` | `description: str \| None` (`schemas/project.py:19`) | crash on null (FE-12) |
| M8 | Upload response | reads `file_name` (`api.ts:263-272`, `RepositoryUpload.tsx:94`) | returns `filename` (`schemas/scan.py:28-31`, `services/storage_service.py:53`) | file name is `undefined` in the UI |
| M9 | Scan create body | sends `file_name`, `file_size` (`api.ts:284-289`, `NewScanModal.tsx:50-55`) | `ScanCreate` = `project_id`, `upload_id` only (`schemas/scan.py:34-36`) | extras ignored |
| M10 | `upload_id` empty | `upload_id: uploadedFile?.upload_id \|\| ''` (`NewScanModal.tsx:52`) | `UuidStr` pattern (`schemas/common.py:5-8`) | 422 if user skips the upload step; error swallowed (FE-15) |
| M11 | Scan response | needs `project_name`, `repository_name`, `branch`, `total_findings`, `critical/high/medium/low_count`, `pqc_readiness_score`, `file_name`, `file_size`, `progress_percent` (`types:96-115`) | `ScanOut` = `id`, `project_id`, `status`, `created_at`, `started_at`, `completed_at`, `upload_id` (`schemas/scan.py:39-56`) | Project/Repository/Branch columns blank (`ScanTable.tsx:54-66`), search crashes (`Scans.tsx:93-95`) |
| M12 | 503 on queue down | generic `SERVER_ERROR` text (`api.ts:49-51`); modal only `console.error` (`NewScanModal.tsx:59-61`) | `503 "Scan queue is unavailable..."` and leaves a FAILED row (`scans.py:40-45`) | user sees nothing happen |
| M13 | 409 on cancel | catch only logs (`Scans.tsx:81-83`) | `409 "Scan already <STATUS>"` (`scans.py:84-85`) | no feedback |
| M14 | Findings id | `id` (`types:118`; `Findings.tsx:67`; `FindingsTable.tsx:36,50`; `FindingDetails`) | `finding_id` (`schemas/finding.py:18`) | ID column empty, row key `undefined`, `f.id.toLowerCase()` crash |
| M15 | Findings engine/category | `category: 'SAST'\|'CRYPTO'\|'DEPENDENCY'\|'CONFIGURATION'` (`types:13,122`; filter list `FindingFilters.tsx:35-41`, compare `Findings.tsx:61`) | `engine: 'sast'\|'crypto'\|'dependency'\|'configuration'` lowercase (`finding.py:9,20`); `category` is a free-form string or null (`finding.py:21`) | category filter never matches; badge prints the free-form category (e.g. "rsa") |
| M16 | Findings severity case | `'CRITICAL'...` uppercase (`types:11`; `Findings.tsx:58`; `Dashboard.tsx:62-65`) | lowercase `critical/high/medium/low` (`finding.py:10`) | severity filter never matches; Dashboard counts all 0 even with a critical finding (observed) |
| M17 | Findings file / line | `file`, `line` (`types:123-124`; `FindingsTable.tsx:75-79`; `FindingDetails.tsx:72-76`; `Findings.tsx:70`) | `file_path`, `line_number` (nullable, `finding.py:24-25`) | blank location; `f.file.toLowerCase()` crash |
| M18 | Findings confidence | `'HIGH'\|'MEDIUM'\|'LOW'` (`types:15,125`) | float 0..1 or null (`finding.py:31`) | table shows `0.9` |
| M19 | Nullable text | `explanation`, `evidence`, `recommendation` required strings (`types:126-128`; `Findings.tsx:69` calls `.toLowerCase()`) | all nullable (`finding.py:26-32`) | crash on null |
| M20 | Extra fields | expects `cwe_id`, `detected_at`, `status` (`types:129-131`); `FindingDetails.tsx:132` falls back to the hard-coded text "CWE-327 / FIPS 203" | not returned; backend adds `engine`, `is_development` (`finding.py:33-36`) | a fake CWE shown for every finding; `is_development` is never used, it should drive the mock badge |
| M21 | Findings query | `getFindings` accepts `scan_id` (`api.ts:312-322`) | no `scan_id` parameter on `GET /findings` (`findings.py:11-26`); filters are `severity`, `category` (deprecated alias of engine), `engine`, `finding_category`, `limit` (default 100, max 500), `offset` | `scan_id` ignored, so "findings for this scan" would return all scans' findings; no pagination in the UI, so silently capped at 100 |
| M22 | Findings auth | sends bearer token | no `get_current_user` on findings or report routes (`findings.py:12-26`, `:47`; `reports.py:13-14`) and no org scoping | anyone on the machine can read findings; frontend cannot tell. Backend side, see FE-20 |
| M23 | Findings/report not mounted | calls `/findings`, `/reports/{id}` | `routers` list on aakash-port is `projects, uploads, scans, redis_test` (`router.py:3-10`); findings and reports exist only on sathwik | 404 on the merged auth+scans backend. Waiting on merge (FE-20) |
| M24 | Report shape | `Report` needs `project_name`, `executive_summary`, `summary.*_findings`, `pqc_risk_summary`, `crypto_inventory_summary` (`types:176-200`) | `ReportOut` = `scan_id`, `status`, `generated_at`, `total_findings`, `findings_by_severity{critical,high,medium,low}` (`finding.py:39-53`) | `api.getReport` (`api.ts:333-335`) is defined but no page calls it; Reports page is all mock data. Day 1 report is a skeleton, so this is for planning |

findings-explorer (Hema) already follows the backend names for findings: `finding_id`, `engine`, `category: string|null`, `file_path`, `line_number`, nullable `evidence`/`explanation`/`recommendation` (`findings-ui .../types/index.ts:116-129`), so M14-M19 do not exist on her branch. Differences left on hers: `confidence: string | null` while the backend sends a float (`:127` vs `finding.py:31`), and `scan_id`/`category` query param usage (`api.ts:329-341`).

## 4. Desktop build and runtime

1. Unpatched, scratch copy of PQC-frontend: `npm run tauri build -- --debug` fails immediately on the identifier (DSK-02, reproduced).
2. Patched copy (`identifier` changed to `com.silicofeller.pqc.qa` in `scratchpad/fe/patched` only): builds. `Finished dev profile in 3m 18s`, `.app` 31.34 MiB, `.dmg` 8.61 MiB (debug).
3. Launched `target/debug/app` for about 20 s with no backend running. `lsof -nP -a -p <pid> -i` three times, 3 s apart: no internet sockets at all for the app process; the WebKit Networking helper that belongs to it also had none. Nothing was talking to any non-loopback address. With the backend down there was nothing on 8000 to see connections to, so this proves "no outbound traffic at idle", not "only 127.0.0.1:8000 under load". CSP `connect-src` is what will enforce that under load. I killed the app and confirmed no `debug/app` or WebKit helper from it remained.
   One thing I would not rely on: a plain `lsof -p <pid> -i` without `-a` lists every socket on the machine, so use `-a`.
4. `cargo audit` was not installed. `cargo install cargo-audit --locked` worked (this machine has network) and I ran it on the generated lockfile (424 crates): 0 vulnerabilities, 2 allowed warnings: `proc-macro-error 1.0.4` unmaintained (RUSTSEC-2024-0370) and `glib 0.18.5` unsound `VariantStrIter` (RUSTSEC-2024-0429). Both come in through Tauri's Linux GTK stack, not macOS. Needs `Cargo.lock` to be committed to be repeatable (DSK-03, DSK-07).
5. Debug logging: `tauri-plugin-log` is only registered under `cfg!(debug_assertions)` (`lib.rs`) and writes to `~/Library/Logs/<identifier>/`. Fine, but that folder is named from the identifier, so change the identifier before anyone relies on log paths.

## 5. Tauri configuration checks

| Check | Result |
|---|---|
| Capabilities | `capabilities/default.json`: only `core:default` on window `main`. No shell, fs, http, opener, dialog, updater, process plugin. Generated `gen/schemas/capabilities.json` agrees. Pass. |
| Plugins in `Cargo.toml` | `tauri 2.12`, `tauri-plugin-log`, serde. No shell/fs/http/opener/updater crates. `tauri.conf.json` has no `plugins` section. Pass. |
| Devtools in release | `tauri` is declared with `features = []`, so the `devtools` feature is not on; release builds have no devtools. (Debug builds always have them.) Pass; I did not build a release bundle. |
| Updater | not present. Pass. |
| `withGlobalTauri` | not set (defaults off). Pass. |
| `dangerousRemoteDomainIpcAccess`, `dangerousUseHttpScheme`, remote window `url` | none. Pass. |
| `assetProtocol` | not enabled, no scope. Pass. |
| `app.windows[0].url` / external navigation | none; frontend is `../dist` (`frontendDist`). Pass. |
| CSP | set (see DSK-01). `devCsp` exists and is only used in `tauri dev`. |
| `core:default` | broader than the app needs (window, webview, event, path, menu, tray, resources, image defaults). Not a bug; if you want least privilege, list only what the app calls. |

## 6. Other frontend checks

| Check | Result |
|---|---|
| XSS sinks | none: no `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacent*`, `document.write`, `eval`, `new Function`, no `target="_blank"`/`window.open`/user-controlled `href` in `src/` on either branch. |
| Finding code and evidence rendering | React text nodes only (`FindingDetails.tsx:106` `<code>{finding.evidence}</code>`, findings-explorer `FindingDetails.tsx:99`). Test: stub returned a finding with title `<img src=x onerror=alert(1)>` and evidence `<script>alert(1)</script>`; the page printed them as text, no element was created, no alert fired. Pass. |
| Logout clears token | The function does (`AuthContext.tsx:135-139` calls `api.clearToken()`), but nothing in the UI calls it. The only caller is `TopHeader.tsx:276`, and `TopHeader` is not imported anywhere; `AppShell.tsx:3,29` renders `Topbar`, which has no sign-out. See FE-13. A 401 is the only thing that clears the token. |
| Route guard | `AuthGate` (`App.tsx:137-158`) shows `LoginPage` whenever not authenticated, for every route. It is a single gate rather than per-route guards, and works: with no token, direct URLs such as `#/findings` render the login form. Pass. Note it is only a UI gate; the real check is the backend's. |
| `console.log` of tokens/secrets | no `console.log` at all. `console.error` prints error objects in page loaders (`Dashboard.tsx:50`, `Projects.tsx:39`, `Scans.tsx:44,65,82`, `Findings.tsx:29,45`, `NewScanModal.tsx:60`). `ApiError` carries only status and user message, no token. Pass. |
| Source maps in dist | none on either branch. Pass. |
| Token placement | localStorage (FE-07); also the profile "identity" (`pqc_sentinel_user_profile`) is stored in localStorage and not cleared on logout (`UserContext.tsx:22-66`). |
| Tests run without a build step | `npm test` passes 9/9, see FE-16. |

## 7. New issues

Severity scale as before. Commit is the branch under test.

### Integration risks (both owners need to agree the contract)

#### FE-10 (High) Findings page uses a different field set than the findings API
- Label: Integration risk. Owners: Sathish (PQC-frontend) and Sathwik (API). Hema's findings-explorer branch already follows the API.
- Branch: PQC-frontend@f398717 vs sathwik@fd856c3.
- Where: `desktop/src/types/index.ts:117-132`, `services/api.ts:312-327`, `pages/Findings.tsx:57-74`, `Dashboard.tsx:62-65`, `components/findings/*` vs `backend/app/schemas/finding.py:13-36`. Full list is M14-M21.
- Evidence: stub backend returning one `FindingOut`-shaped row. Findings table printed an empty ID cell, severity chip "Critical" but Dashboard CRITICAL count 0, category shown as "rsa", confidence "0.9", empty file/line.
- Expected: finding rows show ID, file, line; severity and category filters work; Dashboard counts add up.
- Actual: see above. Typing one character in the search box white-screens the app (FE-12).
- Fix: agree one contract in the team channel. Easiest: frontend adopts the backend names (Hema's type already does) and normalises case once in the API layer. Decide whether `confidence` is a string or a number and make both sides say so. Add `scan_id` to the backend if the UI needs per-scan findings, or stop sending it.

#### FE-11 (High) Projects, Scans and Uploads: the UI expects fields the API never sends
- Label: Integration risk. Owners: Sathish and Aakash.
- Branch: PQC-frontend@f398717 vs aakash-port@239761f.
- Where: M5, M6, M8-M11 above. `types/index.ts:68-115`, `api.ts:241-294`, `RepositoryUpload.tsx:94`, `ScanTable.tsx:54-66`.
- Evidence: stub returned `ProjectOut` and `ScanOut` exactly as the schemas define. Scans table shows the scan ID, status and date, but blank Project, Repository, Branch cells and `—` for findings; the project card shows a made-up status and counts (FE-14); upload `file_name` is undefined.
- Expected: the project name, branch and counts come from the API or are not shown.
- Actual: blanks and invented values.
- Fix: decide which of these the backend will add (project name on scans is the obvious one: either a join in `ScanOut` or the frontend looks it up from `/projects`). Drop `repository_url` from the form and `branch`/`findings_count` from the type until the backend has them. Rename `file_name` to `filename` (or the reverse).

#### FE-17 (Medium) findings-explorer and PQC-frontend cannot be merged without a decision on `Finding` and `api.ts`
- Label: Integration risk. Owners: Hema and Sathish.
- Branch: findings-explorer@10234f7 vs PQC-frontend@f398717.
- Where: `findings-ui desktop/src/types/index.ts:116-129` (backend field names) vs `pqc-frontend desktop/src/types/index.ts:117-132` (old names); `findings-ui src/services/api.ts` (mock fallbacks, no `ApiError`, no auth handling) vs `pqc-frontend src/services/api.ts`.
- Evidence: the two files diverge in the same lines; findings-explorer also lacks `AuthContext`, `LoginPage`, `ApiErrorBanner`, `KeyInsights` that PQC-frontend has, and PQC-frontend lacks `FindingDetails` changes, `GlobalSearch`, `QuantumRiskHeatmap`, `ScanPipelineCard`.
- Expected: one `Finding` type and one API client.
- Actual: a textual conflict plus a silent semantic one (a merge that keeps both would compile but the Findings page would break, or the mock fallback would return to the shared client).
- Fix: Hema rebases on PQC-frontend, keeps her `Finding` type and finding components, and removes the mock fallbacks from her `api.ts` rather than the other way round.

#### FE-19 (Low) Register form versus register rules
- Label: Integration risk. Owners: Sathish and Amrutha.
- Where: M1, M2: `LoginPage.tsx:33-34`, `AuthContext.tsx:121-130` vs `schemas/auth.py:36-38`.
- Fix: tell the user "12 or more characters" in the form, validate before sending, and show the first message of the 422 `detail` array. Either stop sending `full_name` or have the backend store it.

### Waiting on merge

#### FE-20 (High, for integration) Findings and report routes are not on the merged backend and are not authenticated
- Label: Waiting on merge. Owners: Sathwik and Aakash.
- Where: `aakash-port backend/app/api/v1/router.py:3-10` (no findings/reports); `sathwik backend/app/api/v1/findings.py:12-26,47`, `reports.py:13-14` (no `get_current_user`, no organisation filter).
- Expected: after merge, findings and reports are mounted and behind the same `get_current_user` and org check as projects/scans.
- Actual: today `/findings` is a 404 on the merged branch, and on sathwik's branch it is open to anyone.
- Fix: when merging, include the two routers and add `Depends(get_current_user)` plus org-scoped queries (join through `scans` and `projects` like `scans.py:55`). Same item as BE-01.

### Branch bugs (this branch's own code)

#### FE-12 (High) White screen on search with real API data, no error boundary
- Label: Branch bug. Owner: Sathish.
- Branch: PQC-frontend@f398717.
- Where: `pages/Findings.tsx:67-70`, `pages/Projects.tsx:98-103`, `pages/Scans.tsx:90-96`; no `ErrorBoundary` anywhere in `src/`.
- Evidence: ran against the stub: typed one character into the Findings search: `Uncaught TypeError: Cannot read properties of undefined (reading 'toLowerCase')`, `#root` had no children, page blank. Projects search with a project whose `description` is null: `Cannot read properties of null (reading 'toLowerCase')`, blank. Scans search: same `undefined` error, blank. Only a reload recovers.
- Expected: an API record with a missing or null field renders as blank or "n/a" and never takes the app down; an unexpected render error shows an error panel.
- Actual: any nullable or missing field in a filter callback takes down the whole UI. In a security tool that people will leave open for hours this is a bad failure mode.
- Fix: guard with `(x ?? '')` in the three filters, and add a top-level React error boundary in `App.tsx` that shows a message and a "Reload" button. Better: validate responses once in `api.ts` and map to a UI model (this is what removes FE-10 and FE-11 as well).

#### FE-13 (Medium) There is no way to sign out
- Label: Branch bug. Owner: Sathish / Harshith.
- Branch: PQC-frontend@f398717.
- Where: `components/layout/TopHeader.tsx:272-283` has the only "Sign Out" button; `TopHeader` is imported nowhere. `AppShell.tsx:3,29` uses `components/layout/Topbar.tsx`, which has no user menu.
- Evidence: `grep -rn "TopHeader"` shows only its own file. In the running app the header has only the profile avatar link (goes to `#/profile`); no sign-out anywhere in the UI. Also the "SO" avatar and sidebar name "SecOfficer" come from `defaultUserProfile` (`types/index.ts:51-66`), not from the logged-in user.
- Expected: a visible Sign out that clears the token and returns to the login screen. This matters more because the token sits in localStorage for the life of the install (FE-07) and survives app restarts.
- Actual: the session ends only when the backend returns 401 (30 minutes by `core/config.py:14`) and only if the app makes another request.
- Fix: render `TopHeader` (or add the button to `Topbar`), clear `pqc_sentinel_user_profile` as well on logout, and delete whichever header is unused.

#### FE-14 (Medium) Invented figures and a hard-coded identity are shown as if they were real
- Label: Branch bug. Owner: Sathish.
- Branch: PQC-frontend@f398717.
- Where: `pages/Projects.tsx:162-169` (defaults 1 critical, 3 high, 8 medium, 4 low, status "completed", date "Sep 29, 2026", description "Air-gapped repository target", branch "main"); `pages/Dashboard.tsx:15-19` (fixed activity list "SCAN-001 queued", "SCAN-002 completed (18 findings)"), `:185` and `components/dashboard/ScanStatusCard.tsx:16-18` ("SCAN-001", "core-services.zip"); `NewScanModal.tsx:53-54` (`'8.2 MB'`, `'repository.zip'`); `types/index.ts:51-66` and `pages/Profile.tsx` (name "Sathish V.", e-mail, PGP key id, "Level 4 (Top Secret / PQC Defense)" for whoever logs in); `FindingDetails.tsx:132` ("CWE-327 / FIPS 203"); `data/mockData.ts:177` (`"jwt_signing_secret": "prod_sec_..."` string).
- Evidence: a brand-new project with no scans, from the stub, rendered "Completed", 1 CRIT / 3 HIGH / 8 MED / 4 LOW and "Sep 29, 2026". The Profile page for the logged-in `qa@example.com` showed "Sathish V.".
- Expected: no data unless it comes from the API; anything demo is labelled; the profile is the signed-in user.
- Actual: this is FE-06 coming back by another route, and it is worse because there is no fallback banner. An auditor would read the project card as a scan result.
- Fix: show "No scans yet" and no counts for a project without a scan; show empty states instead of defaults; build the profile from `AuthContext.user`; remove the secret-looking string from mock data.

#### FE-15 (Medium) Errors are swallowed or reduced to a generic line
- Label: Branch bug. Owner: Sathish.
- Branch: PQC-frontend@f398717.
- Where: `NewScanModal.tsx:59-61` (create-scan failure only `console.error`, modal looks idle, also sends an empty `upload_id` at `:52` when no file was uploaded), `Scans.tsx:81-83` (cancel failure), `Findings.tsx:28-30,44-46` (load failure: the list shows "No findings matched your criteria" as if the scan was clean), `api.ts:37-39,49-54` (401 detail dropped, 422 array detail dropped, 503 detail dropped).
- Expected: the user sees what the backend said: "Invalid email or password", "Scan queue is unavailable; please retry", "Scan already COMPLETED".
- Actual: a failed findings load and a clean scan look the same. That is the more dangerous one for a security product.
- Fix: surface `ApiError.userMessage` in each of those catch blocks (Dashboard and Projects already do this with `ApiErrorBanner`), and keep the server `detail` when it is a string or the first `msg` when it is an array. Disable "Start scan" until an upload exists.

#### FE-16 (Low-Medium) The auth contract tests do not test `api.ts`
- Label: Branch bug. Owner: Sathish / Harshith.
- Branch: PQC-frontend@f398717.
- Where: `desktop/src/services/__tests__/apiAuthContract.test.mjs:34-151` defines its own `ApiError` and its own `ApiClient` ("mirrors the TypeScript implementation") and never imports `src/services/api.ts` (only imports are `node:assert` and `node:test`, lines 16-17).
- Evidence: all 9 tests pass, including TEST 5/6/9 ("never returns mock data"). They would still pass if `api.ts` were changed back to the mock-fallback version, so they cannot catch a regression of FE-06. I did confirm FE-06 separately in the live run above.
- Expected: tests import the real client (for example compile `api.ts` with `tsc`/`vite-node` and stub `fetch` and `localStorage`).
- Actual: the file duplicates the code under test.
- Also: this file adds two scanner false positives (`password: 'secret'` at `:242`, token variables at `:86-151`) and an unused `before` import (lint). I will allowlist `__tests__/` in my secret scan, but you should still change the fixture to something obviously fake.

#### FE-18 (Low) A slow or down backend at start-up logs the user out
- Label: Branch bug. Owner: Harshith.
- Where: `context/AuthContext.tsx:75-81`: any failure of `GET /auth/me` at boot, including a network error, clears the token.
- Evidence: backend stopped, reload with a stored token: token removed, login shown.
- Expected: only a 401 clears the token; a network error shows "Backend unavailable" and keeps the token.
- Fix: check `err instanceof ApiError && err.errorType === 'UNAUTHORIZED'` before clearing.

#### DSK-06 (Low) Production `index.html` ships a looser, dev-style CSP meta tag
- Label: Branch bug. Owner: Harshith / Sathish.
- Where: `desktop/index.html:7-11`: `script-src 'self' 'unsafe-inline'`, `connect-src ... ws://localhost:5173 ws://127.0.0.1:5173`, and it is copied into `dist/index.html`. Tauri's own CSP (`tauri.conf.json`) is stricter and both apply, so the effective policy is the intersection and this is not exploitable today; but the file reads as if inline scripts were allowed, and `style-src 'unsafe-inline'` is in both.
- Fix: remove the meta tag and rely on `tauri.conf.json` (keep a strict one only if the plain browser build matters), drop `unsafe-inline` for scripts, and keep `unsafe-inline` for styles only if Tailwind really needs it.

#### DSK-07 (Info) Rust dependency warnings
- Label: Branch bug (upstream, track only). Owner: Harshith.
- Evidence: section 4, item 4. `glib 0.18.5` RUSTSEC-2024-0429 and `proc-macro-error 1.0.4` RUSTSEC-2024-0370, Linux-only paths through Tauri's GTK stack. No action beyond committing `Cargo.lock` (DSK-03) and bumping Tauri when a release drops them.

## 8. Counts and summary

Open items, by label (an ID that is open on two branches with different labels is counted once per label):

- Branch bug: 13. FE-07, FE-08 (PQC-frontend), DSK-02, DSK-03, DSK-04, FE-12, FE-13, FE-14, FE-15, FE-16, FE-18, DSK-06, DSK-07.
- Integration risk: 4. FE-10, FE-11, FE-17, FE-19.
- Waiting on merge: 6. FE-06, FE-08, FE-09, DSK-01 (all on findings-explorer, the fix exists on PQC-frontend), FE-20 (findings and reports routes), root `.gitignore` (8 test failures).
- Closed today (PQC-frontend): FE-05, FE-06, FE-09, DSK-01, DSK-05, Google Fonts / external URLs, Tauri capabilities, XSS and rendering of evidence.

Top things I would fix first:

1. FE-12 plus FE-10/FE-11: the first real sign-in against the new backend will give blank columns and, on the first search, a white screen. Until one contract is agreed the Findings, Projects and Scans pages cannot be demoed against a real backend.
2. DSK-02: one line in `tauri.conf.json` (`"identifier": "com.silicofeller.pqc"`) unblocks every packaged build; I built and ran a patched copy fine.
3. FE-13 and FE-07 together: no sign-out, and the token lives in localStorage across restarts.
4. FE-14: invented project figures and a fixed profile are being shown as live data.
5. DSK-03: commit `Cargo.lock` so Rust dependency audits are repeatable.

Housekeeping done: stub backend (127.0.0.1:8000) and `vite preview` (127.0.0.1:4173) stopped, debug app killed, no listener left on either port. Scratch copies left in place under `.../scratchpad/fe` (including `patched/`, which has the changed identifier and must not be used as source).
