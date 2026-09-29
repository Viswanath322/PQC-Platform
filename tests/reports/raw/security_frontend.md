# Security, air-gap and frontend build results (raw)

Date: 2026-09-29 · QA: Pushpam · Suite: `tests/security/`, `tests/frontend/` (branch `qa/pushpam`, no commit)

Commits under test: frontend `63d183c` (origin/PQC-frontend) · aakash `192fa3b` (origin/backend/aakash-scan) · vamsi `45b70ac` (origin/vamsi) · main `ec931f6` · repo root = `qa/pushpam` @ `6cf1f7f` + untracked tests/.

## Commands run
```bash
cd /Users/pushpamraj/Desktop/PQC-Platform
export PYTHONDONTWRITEBYTECODE=1
# per branch (worktrees are read-only; npm ci/build inside .worktrees/frontend/desktop write only gitignored node_modules/ + dist/)
for b in frontend aakash vamsi; do
  PQC_SCAN_ROOT=$PWD/.worktrees/$b .venv/bin/pytest tests/security tests/frontend -rA -p no:cacheprovider --tb=short
done
.venv/bin/pytest tests/security tests/frontend -rA -p no:cacheprovider --tb=short       # repo root (qa/pushpam)
bash tests/security/scan_all_branches.sh                                                  # tests/security only, all origin/* via temp worktrees
# runtime air-gap check of the built bundle
cd .worktrees/frontend/desktop && npx vite preview --host 127.0.0.1 --port 4173 &        # then curl index.html + assets, grep, pkill
git -C .worktrees/frontend status --short                                                # -> empty (clean; dist/ and node_modules/ show only under --ignored)
```

## Summary (pytest counts, tests/security + tests/frontend, 47 tests)
| Scan root | Passed | Failed | Blocked (skipped) |
|---|---|---|---|
| repo root (qa/pushpam) | 16 | 8 | 23 |
| .worktrees/frontend (PQC-frontend) | 23 | 13 | 11 |
| .worktrees/aakash (backend/aakash-scan) | 12 | 12 | 23 |
| .worktrees/vamsi (vamsi) | 22 | 2 | 23 |

`scan_all_branches.sh` (tests/security only, no npm build): origin/main 8 failed/15 passed/16 blocked; origin/PQC-frontend 9/19/11; origin/backend/aakash-scan 12/12/15; origin/vamsi 2/22/15.
Blocked = dependency not delivered (Tauri shell, backend/ or desktop/ absent, no requirements*.txt). All 8 Tauri checks are Blocked on every branch; their logic is validated by `test_tauri_checks_selftest.py` (synthetic good/bad configs).

## Test results per branch
| Test | repo root (qa/pushpam) | frontend | aakash | vamsi |
|---|---|---|---|---|
| security/test_committed_artifacts.py::test_not_committed[database files (*.db, *.sqlite, *.sqlite3)] | Pass | Pass | FAIL | Pass |
| security/test_committed_artifacts.py::test_not_committed[zip archives outside fixtures] | Pass | Pass | FAIL | Pass |
| security/test_committed_artifacts.py::test_not_committed[python bytecode / __pycache__] | Pass | Pass | FAIL | Pass |
| security/test_committed_artifacts.py::test_not_committed[.env files] | Pass | Pass | Pass | Pass |
| security/test_committed_artifacts.py::test_not_committed[node_modules] | Pass | Pass | Pass | Pass |
| security/test_committed_artifacts.py::test_not_committed[dist/build output] | Pass | Pass | Pass | Pass |
| security/test_committed_artifacts.py::test_not_committed[private keys/certs (*.pem, *.key)] | Pass | Pass | Pass | Pass |
| security/test_committed_artifacts.py::test_not_committed[storage/uploads content] | Pass | Pass | FAIL | Pass |
| security/test_dependencies.py::test_pip_audit_requirements | Pass | Blocked | Blocked | Blocked |
| security/test_dependencies.py::test_npm_audit_desktop | Blocked | Pass | Blocked | Blocked |
| security/test_gitignore.py::test_root_gitignore_exists | FAIL | FAIL | FAIL | Pass |
| security/test_gitignore.py::test_path_is_ignored[.env] | FAIL | FAIL | FAIL | Pass |
| security/test_gitignore.py::test_path_is_ignored[backend/.env] | FAIL | FAIL | FAIL | Pass |
| security/test_gitignore.py::test_path_is_ignored[backend/app/__pycache__/x.cpython-310.pyc] | FAIL | FAIL | FAIL | Pass |
| security/test_gitignore.py::test_path_is_ignored[desktop/node_modules/react/index.js] | FAIL | FAIL | FAIL | Pass |
| security/test_gitignore.py::test_path_is_ignored[backend/dev.db] | FAIL | FAIL | FAIL | FAIL |
| security/test_gitignore.py::test_path_is_ignored[backend/storage/uploads/a9b51b95.zip] | FAIL | FAIL | FAIL | Pass |
| security/test_gitignore.py::test_path_is_ignored[desktop/src-tauri/target/debug/app] | FAIL | FAIL | FAIL | FAIL |
| security/test_no_external_calls.py::test_no_external_urls_in_desktop | Blocked | Pass | Blocked | Blocked |
| security/test_no_external_calls.py::test_no_cdn_or_web_fonts | Blocked | FAIL | Blocked | Blocked |
| security/test_no_external_calls.py::test_no_telemetry_or_analytics | Blocked | Pass | Blocked | Blocked |
| security/test_no_external_calls.py::test_tauri_config_has_no_remote_urls | Blocked | Blocked | Blocked | Blocked |
| security/test_no_external_calls.py::test_desktop_runtime_http_calls_are_local_only | Blocked | Pass | Blocked | Blocked |
| security/test_no_external_calls.py::test_no_outbound_http_in_backend | Blocked | Blocked | Pass | Pass |
| security/test_secrets.py::test_env_files_not_present | Pass | Pass | Pass | Pass |
| security/test_secrets.py::test_private_keys_and_cloud_keys | Pass | Pass | Pass | Pass |
| security/test_secrets.py::test_hardcoded_passwords | Pass | Pass | Pass | Pass |
| security/test_secrets.py::test_placeholder_credentials_inventory | Pass | Pass | Pass | Pass |
| security/test_secrets.py::test_detect_secrets | Pass | Pass | Pass | Pass |
| security/test_tauri_checks_selftest.py::test_good_config_passes | Pass | Pass | Pass | Pass |
| security/test_tauri_checks_selftest.py::test_bad_config_is_detected | Pass | Pass | Pass | Pass |
| security/test_tauri_config.py::test_csp_is_set | Blocked | Blocked | Blocked | Blocked |
| security/test_tauri_config.py::test_csp_no_unsafe_eval_or_remote_origins | Blocked | Blocked | Blocked | Blocked |
| security/test_tauri_config.py::test_connect_src_limited_to_local_backend | Blocked | Blocked | Blocked | Blocked |
| security/test_tauri_config.py::test_no_wildcard_capabilities | Blocked | Blocked | Blocked | Blocked |
| security/test_tauri_config.py::test_shell_open_disabled_or_scoped | Blocked | Blocked | Blocked | Blocked |
| security/test_tauri_config.py::test_fs_scope_restricted | Blocked | Blocked | Blocked | Blocked |
| security/test_tauri_config.py::test_devtools_off_in_release | Blocked | Blocked | Blocked | Blocked |
| security/test_tauri_config.py::test_updater_disabled_or_local | Blocked | Blocked | Blocked | Blocked |
| frontend/test_frontend_build.py::test_npm_ci | Blocked | Pass | Blocked | Blocked |
| frontend/test_frontend_build.py::test_npm_run_build | Blocked | Pass | Blocked | Blocked |
| frontend/test_frontend_build.py::test_npm_run_lint | Blocked | Pass | Blocked | Blocked |
| frontend/test_frontend_build.py::test_day1_pages_exist | Blocked | FAIL | Blocked | Blocked |
| frontend/test_frontend_build.py::test_http_calls_centralised_in_services_api | Blocked | FAIL | Blocked | Blocked |
| frontend/test_frontend_build.py::test_mock_data_is_labelled | Blocked | Pass | Blocked | Blocked |
| frontend/test_frontend_build.py::test_backend_health_indicator | Blocked | FAIL | Blocked | Blocked |
| frontend/test_frontend_build.py::test_built_dist_has_no_external_urls | Blocked | FAIL | Blocked | Blocked |

## Runtime air-gap check (frontend, after `npm run build`)
- dist/ contains index.html, assets/index-BqaE9rZB.js, assets/index-Ciwxn6Dr.css. `npx vite preview` served both with HTTP 200 on 127.0.0.1:4173 (server stopped afterwards, port free).
- `grep -o '@import[^;]*' dist/assets/*.css` -> `@import "https://fonts.googleapis.com/css2?family=Inter:wght@300...`: the production CSS imports Google Fonts, so the WebView requests fonts.googleapis.com on every launch (fails offline; fonts silently fall back). See FE-01.
- JS bundle URLs: w3.org XML/SVG/MathML namespace ids (inert), `https://react.dev/errors/` (inert React error-decoder string), `https://github.com/enterprise/core-services.git` (mock display data from src/data/pqcMockData.ts:13). No fetch/XHR/WebSocket to a remote host in the app code.
- `npm ci`, `npm run build` (tsc -b && vite build), `npm run lint` (oxlint) all pass; `npm audit --omit=dev`: 0 vulnerabilities.
- Dev-server/preview only needed loopback. Not verified (needs the Tauri shell): actual socket traffic - see tests/frontend/MANUAL_DESKTOP_SMOKE.md section 4.

## Defects / Findings
| ID | Severity | Title | Owner |
|---|---|---|---|
| FE-01 | High | Google Fonts imported by the UI (air-gap violation) | Sathish |
| SEC-01 | High | backend/dev.db, upload ZIP and __pycache__/*.pyc committed on backend/aakash-scan | Aakash |
| SEC-02 | High | No .gitignore on main, aakash-scan, PQC-frontend root (or qa/pushpam) | All (Sathish/Aakash) |
| SEC-03 | High | MySQL and Redis published on all interfaces (0.0.0.0) in docker-compose | Vamsi |
| SEC-04 | Medium | Redis has no password | Vamsi |
| SEC-05 | Medium | vamsi .gitignore gaps: `*.db` missing; `src-tauri/target/` anchored to repo root | Vamsi |
| SEC-06 | Low | Dev placeholder credentials (change_me_locally, admin123) in code/config/seed | Vamsi / Aakash |
| SEC-07 | Info | Tauri hardening checks cannot run - shell not delivered | Harshith |
| FE-02 | Medium | Day 1 pages Dashboard, Projects, Scans, Findings missing | Sathish |
| FE-03 | Medium | No central API client (desktop/src/services/api.ts missing) | Sathish |
| FE-04 | Medium | No Backend Status indicator / no call to /api/v1/health | Sathish |
| FE-05 | Info | Mock data is labelled; index.html title is "desktop" | Sathish |

### FE-01 (High) Google Fonts import in UI
- Evidence: `.worktrees/frontend/desktop/src/index.css:1`: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');`. Test: `test_no_cdn_or_web_fonts` FAIL; `test_built_dist_has_no_external_urls` FAIL (same @import survives in dist/assets/index-Ciwxn6Dr.css).
- Expected: zero outbound requests; fonts bundled locally. Actual: WebView requests fonts.googleapis.com/fonts.gstatic.com at startup (also leaks usage to Google when the machine is online).
- Fix: `npm i @fontsource/inter @fontsource/jetbrains-mono` (or vendor woff2 into src/assets/fonts) and use `@font-face`/imports of local files; remove line 1. Re-run the tests.

### SEC-01 (High) Database, upload and bytecode committed on backend/aakash-scan
- Evidence: `git -C .worktrees/aakash ls-files` includes `backend/dev.db` (16 KB SQLite, tables projects/scans, 2 project rows), `backend/storage/uploads/a9b51b95-3e0b-4ccd-ba85-49fa06a7a43f.zip` (6.7 KB, an upload of the backend's own app/ tree) and 18 `__pycache__/*.cpython-314.pyc` files. Tests test_not_committed[database, zip, bytecode, storage/uploads] FAIL (4).
- Expected: none tracked (team rule: no generated artifacts/customer uploads). Actual: committed in 192fa3b. Once uploads are real customer repos, this pattern leaks customer code into git history.
- Fix: `git rm -r --cached backend/dev.db backend/storage/uploads backend/**/__pycache__`, add .gitignore (SEC-02), create the DB/uploads dir at runtime; for real customer data consider a history rewrite. Also make the SQLite dev DB path configurable outside the repo.

### SEC-02 (High) No root .gitignore
- Evidence: `git ls-tree --name-only origin/main` -> `README.md` only; origin/backend/aakash-scan -> `README.md backend docs`; origin/PQC-frontend -> `README.md desktop` (only desktop/.gitignore covering node_modules/dist); qa/pushpam has none. test_root_gitignore_exists and 7 test_path_is_ignored cases FAIL on root, frontend, aakash (and main via scan_all_branches). It is the direct cause of SEC-01.
- Expected: root .gitignore covering .env, __pycache__, node_modules, *.db, storage/uploads, src-tauri/target. Actual: absent. Fix: merge vamsi's .gitignore into main (after SEC-05 fixes); other branches rebase onto it.

### SEC-03 (High) DB and cache ports exposed on all interfaces
- Evidence: `.worktrees/vamsi/docker-compose.yml:14` `- "3306:3306"`, `:31` `- "6379:6379"` (Docker binds 0.0.0.0). MySQL runs with the well-known password (SEC-06), root password identical.
- Expected: services reachable from the host only. Actual: reachable from the LAN. Fix: `"127.0.0.1:3306:3306"`, `"127.0.0.1:6379:6379"` (or no published ports if only the backend container needs them). Note the QA suite's default URLs use 127.0.0.1 so they keep working.

### SEC-04 (Medium) Redis without authentication
- Evidence: docker-compose.yml:26-32 redis service has no `command: redis-server --requirepass ...`, no ACL; combined with SEC-03 anyone on the network can read/flush the queue and can use Redis for RCE-style abuse. Fix: requirepass from an untracked env file (`REDIS_PASSWORD`), bind to loopback, update the redis URL in backend config.

### SEC-05 (Medium) vamsi .gitignore gaps
- Evidence: test_path_is_ignored[backend/dev.db] FAIL (no `*.db`/`*.sqlite` rule) and [desktop/src-tauri/target/debug/app] FAIL: `.gitignore:46 src-tauri/target/` contains a slash so git anchors it to the repo root and does not match `desktop/src-tauri/target/`. Fix: add `*.db`, `*.sqlite*`; use `**/src-tauri/target/`.

### SEC-06 (Low) Dev placeholder credentials
- Evidence (warnings, not failures): vamsi docker-compose.yml:11-12 (`MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` = change_me_locally), backend/app/core/database.py:13, database/verify_db.py:35, database/seed.sql:17 (`-- 2. Development Admin User (password: 'admin123' bcrypt hash placeholder)`), database/README.md:140-159; aakash backend/app/core/database.py:5 (comment), docs/api-projects-scans.md:18. detect-secrets: 5 hits on vamsi, 2 on aakash, all placeholders. No real keys, private keys, AWS keys, JWTs or .env files found on any branch.
- Expected for a release: no default credentials (seed admin must be forced to change password / generated per install; DB passwords read from an untracked env file). Fix: read credentials from env, ship `.env.example` only, seed generates a random admin password or requires first-run setup.

### SEC-07 (Info) Tauri baseline unverified
- All 8 test_tauri_config.py tests are Blocked: "Tauri shell not delivered yet (Harshith)". Checks (CSP, no unsafe-eval/remote origins, connect-src only 127.0.0.1:8000, no wildcard permissions, shell open scoped, fs scope, devtools off, updater local) will run automatically once desktop/src-tauri/tauri.conf.json exists. Manual checklist: tests/frontend/MANUAL_DESKTOP_SMOKE.md.

### FE-02 (Medium) Day 1 pages missing
- Evidence: `ls desktop/src/pages` -> CryptoInventory.tsx, PQC.tsx, Reports.tsx. Missing: Dashboard, Projects, Scans, Findings (found: PQC, Reports). Owner Sathish; expected all six pages; Actual 2/6 (+ CryptoInventory).

### FE-03 (Medium) No centralized API client
- Evidence: desktop/src/services/api.ts does not exist; no fetch/axios currently anywhere in src (so no stray calls yet, but nothing talks to the backend either). Fix: add services/api.ts with a single base URL (http://127.0.0.1:8000/api/v1) and route all calls through it (also lets CSP connect-src stay minimal).

### FE-04 (Medium) No backend health indicator
- Evidence: `grep -rn "/api/v1/health" desktop/src` -> no matches. Expected a Backend Status indicator calling GET /api/v1/health (needed by the manual smoke test "healthy -> unhealthy"). Fix: add to TopHeader using services/api.ts.

### FE-05 (Info)
- Mock data is labelled: MockDataBadge is used in App.tsx, TopHeader.tsx, PQC.tsx, Reports.tsx, CryptoInventory.tsx, MigrationCandidates.tsx (test_mock_data_is_labelled PASS). URL in mock data (info only): desktop/src/data/pqcMockData.ts:13 `https://github.com/enterprise/core-services.git`; desktop/vite.config.ts:4 comment URL. index.html `<title>desktop</title>` should be the product name.

## Notes / limitations
- pip-audit reports no severity, so any advisory fails; on repo root it audited tests/requirements.txt (clean). No requirements*.txt exist on any teammate branch yet (Blocked). vulnerable-demo-repo/requirements.txt is excluded by design.
- Dependency audits need network access to PyPI/npm advisory services (dev/CI only; not part of the shipped app).
- Root-branch failures in test_gitignore (8) are real: qa/pushpam itself has no root .gitignore either, and tests/ + .venv/ + .worktrees/ are unignored.
- .worktrees/frontend stays clean after npm ci/build (`git status --short` empty).
