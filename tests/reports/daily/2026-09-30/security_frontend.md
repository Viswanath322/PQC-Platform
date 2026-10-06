# Retest: security, air-gap, desktop (Tauri) and frontend (raw)

Date: 2026-09-30 · QA: Pushpam · Suites: `tests/security/`, `tests/frontend/` (branch `qa/pushpam`, nothing committed)

This is the retest of the 29 Sep findings after the team said they had fixed them, plus a first look at the branches pushed since.

Commits under test (all read-only worktrees, `git status --short` is empty on every one of them after the runs):

| Worktree | Branch | Commit | Owner |
|---|---|---|---|
| .worktrees/frontend | origin/PQC-frontend | 4c3c5e8 | Sathish |
| .worktrees/findings-ui | origin/frontend/findings-explorer | ad84266 | Sathish / Hema |
| .worktrees/aakash | origin/backend/aakash-scan | 7ce9382 | Aakash |
| .worktrees/vamsi | origin/vamsi | fca83d5 | Vamsi |
| .worktrees/foundation | origin/backend/foundation | 46519fb | Amrutha |
| .worktrees/sathwik | origin/backend/sathwik-findings | 8d6c278 | Sathwik |
| .worktrees/hima | origin/backend/hima-ingestion | 67e7f11 | Hima Bindu |
| .worktrees/harshitha | origin/backend/harshitha-analysis | 89f3041 | Harshitha |
| repo root | qa/pushpam | 511f4c5 | me |
| origin/main | main | ec931f6 (still only README.md) | |

## Commands run

```bash
cd /Users/pushpamraj/Desktop/PQC-Platform
export PYTHONDONTWRITEBYTECODE=1
for b in aakash vamsi foundation sathwik hima harshitha frontend findings-ui; do
  PQC_SCAN_ROOT=$PWD/.worktrees/$b .venv/bin/pytest tests/security tests/frontend -rA -p no:cacheprovider --tb=short -q
done
PQC_SCAN_ROOT=$PWD .venv/bin/pytest tests/security tests/frontend -rA -p no:cacheprovider --tb=short -q   # repo root
bash tests/security/scan_all_branches.sh                                  # tests/security only, all origin/* via temp worktrees
# dependency audits (run inside the tests): pip-audit -r <requirements*.txt>; npm audit --omit=dev in desktop/  (plus a full npm audit by hand)
# merge-risk between the two frontend branches
git merge-base origin/PQC-frontend origin/frontend/findings-explorer
git diff --name-only <base> origin/PQC-frontend ; git diff --name-only <base> origin/frontend/findings-explorer
git merge-tree --write-tree origin/PQC-frontend origin/frontend/findings-explorer     # then npm ci && npm run build on that tree (scratch dir, outside the repo)
# runtime check of the built bundle
cd .worktrees/frontend/desktop && npx vite preview --host 127.0.0.1 --port 4173 &   # curl index.html + assets (all 200), then pkill; port 4173 confirmed free afterwards
```

No Rust or cargo on this machine (and I did not install any), so the Tauri shell was reviewed statically. I could not build it, launch it, or watch its network traffic.

## Changes I made to the tests (scope: tests/security, tests/frontend)

Three checks were producing false positives against real, harmless content, so I tuned them. None of the tuning hides a real defect; each real defect is still listed below.

1. `sec_helpers.py`: `tauri.localhost`, `asset.localhost` and any `*.localhost` host now count as local. Amrutha's CORS default `http://tauri.localhost` is the Windows Tauri v2 origin, not an outbound call. This removes a false FAIL on foundation.
2. `test_secrets.py`: placeholders such as `replace-this-...` and `development-only-...` (foundation `.env.example`, `config.py`) and `mock_jwt_` count as placeholders. Values in `desktop/src/data/*mock*` files are warnings instead of failures (fake evidence strings on purpose).
3. `test_no_external_calls.py`: comment lines in `src-tauri` files are ignored (the scaffold puts a Cargo doc link in `Cargo.toml`). `test_frontend_build.py`: React Router's own warning URLs (`reactrouter.com`, `github.com/ungap/...`) inside the bundled library code are treated like the React error-decoder URL already was.
4. `tauri_checks.py` / `test_tauri_config.py` / `test_tauri_checks_selftest.py`: the existing checks already read the Tauri v2 shape (`app.security.csp`, `capabilities/*.json`, `plugins.updater`). I added five more that a v2 config needs: bundle identifier not the scaffold default, no dangerous WebView flags (`dangerousDisableAssetCspModification`, `dangerousRemoteDomainIpcAccess`, `dangerousUseHttpScheme`, `withGlobalTauri`, `freezePrototype: false`), windows/devUrl not remote, `script-src` with no `'unsafe-inline'`, and `http:`/`opener:` permissions carrying a local-only scope. The self-test covers good and bad configs for them and passes (3 tests).

## Per-branch counts (tests/security + tests/frontend, 53 tests, after the test changes)

| Scan root | Passed | Failed | Blocked (skipped) | What is failing |
|---|---|---|---|---|
| repo root (qa/pushpam) | 17 | 8 | 28 | no root .gitignore (8 checks) |
| origin/main (security only, via scan_all) | 16 | 8 | 21 | no root .gitignore (8 checks) |
| .worktrees/frontend (PQC-frontend) | 37 | 14 | 2 | no root .gitignore (8), csp null, connect-src unset, identifier com.tauri.dev, mock badge, external URL in api.ts:185 (source and dist) |
| .worktrees/findings-ui (findings-explorer) | 37 | 14 | 2 | identical to PQC-frontend |
| .worktrees/aakash | 17 | 8 | 28 | no root .gitignore (8 checks; committed artifacts now pass) |
| .worktrees/vamsi | 25 | 0 | 28 | clean |
| .worktrees/foundation (Amrutha) | 25 | 1 | 27 | pip-audit: ecdsa 0.19.2 PYSEC-2026-1325, no fix version |
| .worktrees/sathwik | 17 | 8 | 28 | no root .gitignore (8 checks) |
| .worktrees/hima | 16 | 8 | 29 | no root .gitignore (8 checks) |
| .worktrees/harshitha | 15 | 9 | 29 | 9 tracked `__pycache__/*.pyc` + no root .gitignore (8 checks) |

`scan_all_branches.sh` (security tests only): PQC-frontend 12 failed / 31 passed / 2 skipped; findings-explorer 12/31/2; aakash-scan 8/17/20; foundation 1/25/19; harshitha-analysis 9/15/21; hima-ingestion 8/16/21; sathwik-findings 8/17/20; main 8/16/21; qa/pushpam 8/17/20; vamsi 0/25/20.

Before my test tuning the two frontend branches showed 16 failed / 29 passed and foundation 3 failed; the difference is the false positives described above.

Blocked on the branches without a `desktop/` or `backend/`: npm and Tauri checks. Blocked on branches without any `requirements*.txt` (aakash, sathwik, hima, harshitha, vamsi): pip-audit. Only foundation ships `backend/requirements.txt`.

Dependency audits: `npm audit` (production and full) reports 0 vulnerabilities on both frontend branches. pip-audit on foundation reports `ecdsa 0.19.2 PYSEC-2026-1325` (pulled in by `python-jose[cryptography]`, fix version n/a). There is no Rust audit because no `Cargo.lock` is committed (see DSK-03).

Secrets: no private keys, cloud keys, JWTs or `.env` files on any branch. `.env.example` on foundation only has placeholders. detect-secrets flags only mock display data (`desktop/src/data/mockData.ts:177`, a fake "jwt_signing_secret" used as a mock finding's evidence) and dev placeholders.

## Verdict on yesterday's IDs

| ID | Verdict | Evidence |
|---|---|---|
| FE-01 Google Fonts | Fixed | `grep fonts.googleapis/gstatic` finds nothing in source or `dist/` on either branch. PQC-frontend bundles Inter, JetBrains Mono and Geist from `@fontsource*` (`src/index.css:2-12`); dist CSS uses `url(/assets/*.woff2)` only. findings-explorer bundles Geist only. `test_no_cdn_or_web_fonts` passes on both. |
| FE-02 Day 1 pages | Fixed | Dashboard, Projects, Scans, Findings, PQC, Reports (plus CryptoInventory, Settings) all in `desktop/src/pages/` on both branches. `test_day1_pages_exist` passes. (Profile page exists only on PQC-frontend.) |
| FE-03 central API client | Fixed, with a serious side effect | `desktop/src/services/api.ts` exists, single `fetch` at line 68, base URL `http://127.0.0.1:8000/api/v1`. No stray `fetch`/axios elsewhere. But see FE-06: every method silently falls back to mock data. |
| FE-04 Backend Status indicator | Fixed | `BackendStatus.tsx` calls `api.health()` -> `GET /api/v1/health` (api.ts:87-93), 25 s polling, used in `TopHeader.tsx`. `App.tsx` also polls every 15 s. Could not check the backend response side; `/health` is on Amrutha's branch only. |
| FE-05 mock data labelled / title | Partially | `index.html` title is now the product name (fixed). Mock labelling regressed: `MockDataBadge` is used only in `TopHeader.tsx` and `SystemSecurityDashboard.tsx`; `App.tsx`, `PQC.tsx`, `Reports.tsx`, `CryptoInventory.tsx` import `pqcMockData` with no badge, and the badge text is "Demo Telemetry", which is misleading in an air-gapped, no-telemetry product. `test_mock_data_is_labelled` fails. See FE-08. |
| SEC-01 committed db/zip/pyc on aakash | Fixed on the tip, still in history | 7ce9382 removes `backend/dev.db`, the upload ZIP and 18 `.pyc` files and adds `backend/.gitignore`. All 8 committed-artifact checks pass on aakash. The files remain reachable in 192fa3b. The db held only 2 dummy project rows and the ZIP was the backend's own source, so I see no customer data; a history rewrite is not needed unless the team wants it. The same defect now exists on Harshitha's branch (SEC-08). |
| SEC-02 no root .gitignore | Partially | Root `.gitignore` now exists on vamsi and foundation (checks pass). Still missing on main, aakash (only `backend/.gitignore`), sathwik, hima, harshitha, PQC-frontend, findings-explorer and qa/pushpam. It has to land on main and the others need to rebase, which is what would have prevented SEC-01 and SEC-08. |
| SEC-03 DB/Redis on 0.0.0.0 | Fixed (not in my list, checked anyway) | `docker-compose.yml` on vamsi/foundation: `127.0.0.1:3306:3306` and `127.0.0.1:6379:6379`. |
| SEC-04 Redis without password | Fixed (checked anyway) | `command: redis-server --requirepass change_me_locally`. The password is a placeholder (SEC-06). |
| SEC-05 vamsi .gitignore gaps | Fixed, but over-broad | `*.db`, `*.sqlite*` and `**/src-tauri/target/` present; both checks pass. Side effect: see SEC-11 (`lib/` swallows `desktop/src/lib/`). |
| SEC-06 dev placeholder credentials | Not fixed | Still present: vamsi/foundation `docker-compose.yml:11,12,22,34`, `backend/app/core/database.py:13` (vamsi), `database/verify_db.py:33`, `foundation/backend/app/core/config.py:8` (DB URL with password as a code default), `.env.example:3`. Expected for Day 1, not shippable. |
| SEC-07 Tauri baseline unverifiable | Partially | The shell now exists on both frontend branches, so the checks run. 5 of the original 8 pass; CSP and connect-src fail (DSK-01). The remaining gap is that I cannot build or run it (no Rust), so nothing is verified at runtime. |

## Desktop (Tauri v2) security review

Files reviewed by hand on both PQC-frontend and findings-explorer (`desktop/src-tauri/` is byte-identical on the two): `tauri.conf.json`, `capabilities/default.json`, `Cargo.toml`, `src/lib.rs`, `src/main.rs`, `.gitignore`, and `desktop/package.json`. Tauri crate `2.12.0`, `tauri-plugin-log 2`, Rust edition 2024.

| Item | Result | Detail |
|---|---|---|
| CSP set | FAIL | `tauri.conf.json:24` `"csp": null` (test_csp_is_set). The WebView has no policy: any injected script can load or connect anywhere. DSK-01. |
| CSP: no unsafe-eval / remote origins | Pass (vacuous) | Passes only because there is no CSP. |
| connect-src limited to local API | FAIL | Unset, so it falls back to no restriction. The UI talks only to `http://127.0.0.1:8000` (`api.ts:16-17`), so `connect-src 'self' ipc: http://ipc.localhost http://127.0.0.1:8000` will be enough. |
| Capabilities minimal, no wildcard | Pass | `capabilities/default.json` grants only `core:default` to window `main`. No `fs:*`, `shell:*`, `http:*`, `opener:*`, no `remote`, no wildcard. `core:default` is the standard bundle of window/webview/event/app/path/menu/tray/image/resources defaults, acceptable for now. Note `windows: ["main"]` matches because the config window has no label (default `main`). |
| Shell open | Pass | No shell or opener plugin in `Cargo.toml` or capabilities. |
| fs scope | Pass | No fs plugin and no `assetProtocol` scope. When the upload flow needs native file pick, add `dialog:allow-open` only and no broad fs grants. |
| Devtools not forced on | Pass | No `devtools` cargo feature, no `devtools: true`. `tauri-plugin-log` is initialised only under `cfg!(debug_assertions)` (`lib.rs:5`). |
| Updater | Pass | No `plugins.updater`, no `tauri-plugin-updater`, no `createUpdaterArtifacts`. |
| Bundle identifier | FAIL | `tauri.conf.json:5` `"identifier": "com.tauri.dev"`. The scaffold default; `tauri build` rejects it and it collides with every other scaffold. DSK-02. Not confirmed by building (no Rust). |
| Dangerous flags | Pass | `dangerousDisableAssetCspModification`, `dangerousRemoteDomainIpcAccess`, `dangerousUseHttpScheme`, `withGlobalTauri` all absent; `freezePrototype` not disabled. |
| Windows / remote URLs | Pass | One window, no `url` (loads the bundled `../dist`), `devUrl` is `http://localhost:5173`. No external navigation configured. |
| Remote URLs in the config | Pass | Only a Cargo doc link in a comment (`Cargo.toml:11`). |
| Router | Good | The app uses `HashRouter` (`App.tsx:2`), which works with the Tauri custom protocol. |
| Build / launch / traffic capture | Can't verify | No Rust toolchain. Untested: does the app compile, does `frontendDist` resolve, does a real CSP break Tailwind inline styles or Vite HMR (needs `devCsp` in dev), and the actual packet-level "zero outbound" check in `tests/frontend/MANUAL_DESKTOP_SMOKE.md` section 4. |

Recommended CSP to start from (needs `style-src 'unsafe-inline'` because components use inline `style={{...}}`, e.g. `BackendStatus.tsx`):
`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ipc: http://ipc.localhost http://127.0.0.1:8000; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`, plus an `app.security.devCsp` that also allows `ws://localhost:5173` and `http://localhost:5173`.

## Frontend results

- `npm ci`, `npm run build` (`tsc -b && vite build`) and `npm run lint` (oxlint) pass on both branches. `npm audit`: 0 vulnerabilities.
- Air-gap grep of source and `dist/` (both branches): no Google Fonts, no CDNs, no analytics/telemetry SDKs, no `WebSocket`/`EventSource`/`sendBeacon`. Only URLs in the bundle: w3.org namespace ids, `react.dev/errors`, `reactrouter.com` and `github.com/ungap/url-search-params` (library warning text and a comment, never fetched), mock repo URLs `github.com/enterprise/*.git` (display data), `http://127.0.0.1` / `http://localhost`, and one real code string: `https://github.com/internal/` from `api.ts:185` (FE-09).
- `vite preview` on 127.0.0.1:4173 served `/`, the JS and the CSS with HTTP 200; server stopped, port free.
- Absolute `url(/assets/...)` for fonts is fine under the Tauri asset protocol.
- PQC-frontend `dist/` has 96 asset files because it ships every subset of Inter, JetBrains Mono and Geist; findings-explorer has 13. Local, so fine for air-gap, only a size note.

### Merge risk: PQC-frontend vs frontend/findings-explorer

- Merge base `4edc11b`. PQC-frontend is 11 commits ahead (theme, glass UI, local fonts, Profile page, `UserContext`); findings-explorer is 1 commit ahead (`ad84266`, "synchronize package-lock.json", 1 file).
- Files changed on both sides since the base: exactly one, `desktop/package-lock.json`. There is no overlap in `src/`, `src-tauri/`, `package.json`, `index.css`, or pages.
- `git merge-tree --write-tree` merges with no conflicts and the merged tree is identical to `origin/PQC-frontend`; `npm ci` and `npm run build` on that merged tree pass. So findings-explorer adds nothing that PQC-frontend does not already contain. Findings, Dashboard, `BackendStatus` and the `src-tauri` scaffold all come from the shared base, not from findings-explorer.
- Practical risk is low, and it is different from a conflict: (a) whoever is working on Findings on `findings-explorer` is on a stale base that lacks local Inter/JetBrains fonts, Profile, `UserContext` and the newer layout; (b) if the lockfile is regenerated on either branch before merging, that is where a conflict will appear, so resolve it by keeping the PQC-frontend lock and running `npm ci` rather than merging JSON by hand. Recommend Hema rebase onto PQC-frontend before adding Findings work. I could not find any Findings-specific code by Hema on the pushed branch.

## New findings

Severity: High / Medium / Low / Info.

| ID | Sev | Title | Owner |
|---|---|---|---|
| DSK-01 | High | Tauri CSP is `null`, no connect-src | Sathish (committer) / Harshith |
| DSK-02 | Medium | Bundle identifier is still `com.tauri.dev` | Harshith |
| DSK-03 | Medium | No `Cargo.lock` committed, Rust deps not auditable or reproducible | Harshith |
| DSK-04 | Low | Scaffold metadata left in (name `app`, authors `you`, description `A Tauri App`, empty license, 800x600 with no minimum size, mobile crate types, `targets: all`) | Harshith |
| DSK-05 | Info | Shell cannot be built or run on the QA machine (no Rust); runtime CSP, traffic and packaging checks remain open | Harshith / me |
| FE-06 | High | `api.ts` silently falls back to mock data on any error, including login | Sathish |
| FE-07 | Medium | Auth token kept in `localStorage` | Sathish |
| FE-08 | Medium | Mock data label regressed (missing on PQC, Reports, CryptoInventory, App; wording "Demo Telemetry") | Sathish |
| FE-09 | Low | Hardcoded `https://github.com/internal/` string in `api.ts:185`, ends up in the bundle | Sathish |
| SEC-08 | Medium | 9 `__pycache__/*.pyc` committed on Harshitha's branch | Harshitha |
| SEC-09 | Medium | foundation dependency `ecdsa 0.19.2` (PYSEC-2026-1325) via `python-jose`; dependencies are ranges, not pinned | Amrutha |
| SEC-10 | Medium | Weak default JWT secret and DB password as code defaults, no startup guard | Amrutha |
| SEC-11 | Medium | Over-broad root `.gitignore` (vamsi, foundation): `lib/`, `env/`, `ENV/`, `var/`, `downloads/`, `parts/`, `build/`, `*.zip`, `storage/` | Vamsi |
| SEC-12 | Low | Root `.gitignore` still missing on 7 branches; no dependency manifest on aakash, sathwik, hima, harshitha | Aakash, Sathwik, Hima Bindu, Harshitha, Sathish |
| SEC-13 | Low | Compose: passwords hard-coded and visible in the healthcheck command line; deprecated `version: '3.8'` and `--default-authentication-plugin` | Vamsi |

### DSK-01 (High) CSP is null
- Evidence: `desktop/src-tauri/tauri.conf.json:24` `"csp": null` on both PQC-frontend and findings-explorer. Tests `test_csp_is_set`, `test_connect_src_limited_to_local_backend` FAIL.
- Expected: strict CSP with `connect-src` limited to the local API. Actual: none. A single XSS (mock data and finding text from customer code are rendered in the UI) could load remote scripts or exfiltrate data.
- Fix: use the CSP given above and re-run `tests/security/test_tauri_config.py`. Add `devCsp` for Vite HMR.

### DSK-02 (Medium) Default bundle identifier
- Evidence: `tauri.conf.json:5` `"identifier": "com.tauri.dev"`. Test `test_bundle_identifier_not_default` FAIL.
- Expected: product-specific reverse-DNS id such as `com.silicofeller.pqc-platform`. Actual: scaffold value, which blocks packaging and shares the app data directory with other scaffolds. Not confirmed by running `tauri build`.
- Fix: change it before the first bundle, since it names the per-user data directory.

### DSK-03 (Medium) No Cargo.lock
- Evidence: `git ls-files desktop/src-tauri` has no `Cargo.lock`; `Cargo.toml` uses floating `tauri = "2.12.0"`, `tauri-plugin-log = "2"`.
- Expected: lockfile committed for an application so builds are reproducible and `cargo audit` can run offline from a vendored advisory DB. Actual: absent, so I cannot audit Rust deps at all.
- Fix: run `cargo generate-lockfile`, commit `Cargo.lock`, add `cargo audit` to CI.

### DSK-04 (Low) Scaffold metadata
- Evidence: `Cargo.toml:2,4,5` (`name = "app"`, `description = "A Tauri App"`, `authors = ["you"]`, `license = ""`), `tauri.conf.json:16-17` window 800x600 with no `minWidth`/`minHeight`, `crate-type = ["staticlib","cdylib","rlib"]` (mobile targets) and `bundle.android` block in a desktop-only product.

### FE-06 (High) Silent mock fallback hides failures and fakes a login
- Evidence: `desktop/src/services/api.ts` (identical on both branches). Every method wraps `request()` in `try/catch` and returns mock or locally invented data on any error (timeouts, 401, 403, 500, backend down): `login` (line 116) returns `mock_jwt_<random>` and a user with `role: 'admin'` for any email/password; `getCurrentUser` (140) returns an admin; `createProject` (167), `uploadRepository` (209), `createScan` (245) (reports `QUEUED` for a scan that never reached the backend), `cancelScan` (311) (reports success), `getFindings`/`getReport` return the mock findings/report.
- Expected: real errors surfaced, mock data only in an explicit, labelled demo mode. Actual: the UI cannot distinguish a real scan result from fabricated data, a wrong password or expired token still opens an "admin" session, and the health indicator can say offline while pages show data as if it were live. For a security assessment product that is an integrity problem: a user could act on invented findings, or believe a scan was queued when nothing was sent.
- Fix: remove the catch-all fallbacks; put mock data behind a build-time flag (`VITE_DEMO_MODE`) with a permanent visible banner; show `ErrorState` on failure; never mint a token client-side.

### FE-07 (Medium) Token in localStorage
- Evidence: `api.ts:26,32,34` reads/writes `pqc_auth_token` in `localStorage`; also `UserContext.tsx` on PQC-frontend stores the profile there. Expected: no long-lived bearer token readable by any script in the page; without a CSP (DSK-01) this is easier to steal. Fix: keep the token in memory (or an OS keychain via a scoped Tauri command), short expiry, and add the CSP.

### FE-08 (Medium) Mock label regression
- Evidence: `grep -rl MockDataBadge desktop/src` -> `TopHeader.tsx`, `SystemSecurityDashboard.tsx`, `MockDataBadge.tsx` only. `test_mock_data_is_labelled` FAIL: `src/App.tsx`, `src/pages/Reports.tsx`, `src/pages/PQC.tsx`, `src/pages/CryptoInventory.tsx` import `pqcMockData` without the badge (yesterday PQC, Reports, CryptoInventory and MigrationCandidates all had it). `Reports.tsx:47` does mark exports `pqc:isMockData: true` and the notices say "Mock Preview", which is good.
- Fix: restore a badge on each mock-fed page and rename the text from "Demo Telemetry" to "Mock data" (the product has no telemetry and the word will alarm an air-gap reviewer). Depends on FE-06: data that arrives via the API fallback needs the same label.

### FE-09 (Low) External URL string in code
- Evidence: `api.ts:185` `repository_url: payload.repository_url || 'https://github.com/internal/' + payload.name.toLowerCase()`; present in `dist/assets/index-*.js`. Not fetched, but fails `test_no_external_urls_in_desktop` and `test_built_dist_has_no_external_urls`. Fix: use an empty string or `undefined`.

### SEC-08 (Medium) Bytecode committed on Harshitha's branch
- Evidence: `git -C .worktrees/harshitha ls-files` -> 9 files: `analysis-engines/__pycache__/dummy_engine.cpython-310.pyc`, `...cpython-311.pyc`, and 7 under `analysis-engines/base/__pycache__/`. `test_not_committed[python bytecode / __pycache__]` FAIL. Confirmed. No root `.gitignore` on that branch either.
- Fix: `git rm -r --cached analysis-engines/**/__pycache__`, rebase onto a main that has the root `.gitignore`.

### SEC-09 (Medium) Vulnerable and unpinned Python dependencies on foundation
- Evidence: `.worktrees/foundation/backend/requirements.txt` -> pip-audit: `ecdsa 0.19.2 - PYSEC-2026-1325 (fix: n/a)`, transitive via `python-jose[cryptography]>=3.3,<4.0`. The file uses ranges only (`fastapi>=0.110,<1.0`, etc.), so resolved versions change between machines.
- Expected: no known-vulnerable packages, reproducible, offline-installable set. Fix: switch JWT handling to `PyJWT` (or `authlib`) which does not depend on `ecdsa`, and generate a fully pinned lock (`pip-compile --generate-hashes`) that can be mirrored to the air-gapped install.

### SEC-10 (Medium) Weak secret and credential defaults in code
- Evidence: `foundation/backend/app/core/config.py:8-9` `database_url ... pqc:change_me_locally@127.0.0.1...` and `jwt_secret_key: str = "development-only-change-this-secret"`; `.env.example:4` `JWT_SECRET_KEY=replace-this-with-a-long-random-local-secret`. If `.env` is missing the app starts and signs tokens with a public constant. Also `docs_url="/docs"` is always on (`main.py:11-12`).
- Fix: no default for `jwt_secret_key` (fail at start-up if unset or equal to a known placeholder when `APP_ENV != development`), generate a random per-install secret at first run, disable `/docs` outside development.

### SEC-11 (Medium) Over-broad .gitignore
- Evidence: `git check-ignore -v desktop/src/lib/utils.ts` on vamsi and foundation -> `.gitignore:18:lib/`. Also matches `backend/lib/x.py`, `database/env/x` (`ENV/`), and `*.zip` also hides ZIPs under `tests/fixtures/`. `desktop/src/lib/utils.ts` is tracked today so it still works, but any new file under a `lib/` folder (a normal place for shared code in this UI) is silently untracked and will not be committed.
- Fix: remove the generic Python-template entries that are not needed (`lib/`, `lib64/`, `env/`, `ENV/`, `var/`, `parts/`, `downloads/`, `build/` unless anchored, `*.zip`), or anchor them (`/backend/lib/`). Re-run `test_gitignore.py`.

### SEC-12 (Low) Repository hygiene gaps
- No root `.gitignore`: main, aakash, sathwik, hima, harshitha, PQC-frontend, findings-explorer, qa/pushpam (8 `test_gitignore.py` failures each; I will add one to qa/pushpam separately). No `requirements*.txt` on aakash (FastAPI, SQLAlchemy, Redis client), sathwik, hima, harshitha, vamsi, so pip-audit is Blocked there and installs are not reproducible. The frontend `desktop/.gitignore` covers `node_modules` and `dist` but not `.env`.

### SEC-13 (Low) Compose details (carried from DB-04/DB-06)
- `docker-compose.yml:22` healthcheck passes `-pchange_me_locally` on the command line; `:1` `version: '3.8'` deprecated; `:20` `--default-authentication-plugin=mysql_native_password` deprecated. Move passwords to an untracked `.env` referenced with `${MYSQL_PASSWORD}`.

## Not fixed / needs another look next round
- Actual runtime network capture of the packaged desktop app (needs Rust and the manual smoke checklist).
- Backend-side checks for foundation (auth, health, CORS) belong to the backend report; I only noted CORS `allow_credentials=True` with an explicit origin list, which is correct.
- Other branches (hima extractor, harshitha engine, sathwik API) were only scanned for secrets, committed artifacts, external HTTP clients (none found) and hygiene here.
