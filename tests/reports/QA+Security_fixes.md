# QA + Security Fixes

From the Day 3 retest (1 Oct 2026). Only open issues are listed, most important first.
Please fix your part, push, and tell me so I can retest. The IDs in brackets match the daily reports in `daily/2026-10-01/`.

Each item has a label:
- **Branch bug**: in your own code. It won't go away when we merge, so fix it now.
- **Integration risk**: two branches disagree on something shared. The people named need to agree on one version first.
- **Waiting on merge**: not a bug yet. The piece isn't delivered or combined; it's listed so it doesn't get lost.

## P1: fix first (blocks the demo or is a real security hole)

**1. Everyone who registers joins the same organization** (BE-19, INT-36) · Amrutha + Aakash · Branch bug
`routes/auth.py:14,58-65` puts every new user in `org-default-001`. A second user could read the first user's project and scan, and a third could cancel that scan. Org scoping itself works (users in different orgs get 404); everyone is just in the same org.
Fix: create an organization on register, or close registration after the first admin and add users by invite. Keep `org-default-001` for the dev admin only. Add a test with two registered users that expects 404.

**2. Findings and reports need no login** (BE-20, INT-34, INT-35, FE-20) · Sathwik · Branch bug
`findings.py`, `reports.py` and `finding_service.py` have no `get_current_user` and no organization filter. On a merged copy, `/findings`, `/findings/{id}` and `/reports/{scan}` returned another org's data with no token. `?scan_id=` is also ignored, so every scan's findings come back.
Fix: add `Depends(get_current_user)` to both routers, join `findings -> scans -> projects` and filter on `projects.organization_id` (Harshitha's service already does this), return 404 for another org's ids, and add a real `scan_id` filter.

**3. Harshitha's backend doesn't start** (INT-30, INT-31, INT-32) · Harshitha · Branch bug
- `scans.py:7` imports `get_current_user` from `app.core.security`, where it doesn't exist.
- `finding_service.py:77` is a syntax error (the docstring is on the same line as the signature).
- Once both are fixed, the findings and reports routes give 500 because they don't pass the now-required `organization_id`.

Fix: import from `app.api.v1.routes.auth`, put the docstring on its own line, and pass `get_user_organization_id(user)` into the service. Then rebase on `aakash-port` so `scans.py` doesn't conflict.

**4. Nothing reads the scan queue** (INT-33) · Harshitha + Aakash · Waiting on merge
`POST /scans` pushes the id onto `pqc:scan_queue`, but no code in any branch takes it off, so scans stay `QUEUED` forever. On a merged copy with a small test worker, the rest of the pipeline worked: 22 findings stored and the scan reached `COMPLETED`.
Fix: add a worker entry point (`python -m app.worker`) that does `BLPOP pqc:scan_queue`, checks the scan is still `QUEUED`, runs `process_scan` with its own DB session, and marks `FAILED` (with a reason, see item 13) on error. Agree who owns it.

**5. One `database/` folder, then wire findings in** (BE-21, INT-15, INT-16, INT-40, INT-41) · Vamsi + Aakash/Amrutha + Sathwik · Integration risk
- `aakash-port` carries old copies of `database/` and `docker-compose.yml`. They have no `explanation` or `is_development`, `confidence` is `VARCHAR(50)`, and the seed still aborts on 40-character ids. So the branch we'll demo still crashes `/findings` and loads no seed.
- Vamsi's branch has the fixed `database/`, but also a `backend/` stub (a Postgres default in `database.py`, a `dotenv` import, `.env.example`) that conflicts with the backend.
- The findings and reports routers aren't in `router.py` yet.

Fix:
- Vamsi owns `database/` only: delete `backend/` and the Postgres files from his branch.
- Aakash deletes `database/` and `docker-compose.yml` from his branch and takes Vamsi's.
- After item 2, add `findings` and `reports` to `api_router`.

**6. UI and API use different field names** (FE-10, FE-11, FE-17, FE-19) · Sathish + Sathwik, Sathish + Aakash, Sathish + Hema · Integration risk
Against backend-shaped data:
- **Findings:** the ID, file and line columns are blank and the Dashboard shows 0 criticals.
  - `id` vs `finding_id`, `file`/`line` vs `file_path`/`line_number`.
  - Uppercase vs lowercase severity, `category` vs `engine`.
  - `confidence` is a string in the UI but a float in the API.
- **Projects, scans and uploads:**
  - The UI expects `repository_url`, `branch`, project names on scans, and findings counts, none of which exist.
  - The UI reads `file_name`, but the API sends `filename`.
- **Register:**
  - The form allows short passwords while the API needs 12+ characters, and the 422 error is shown as "Unexpected error".
  - `full_name` is dropped.

Fix:
- Frontend adopts the backend names: Hema's `Finding` type already matches, so use it.
- Normalise case once in `api.ts`.
- Remove `repository_url`, `branch` and counts from the types and forms until the backend has them.
- Show the backend's error message on register.
- Hema rebases `frontend/findings-explorer` onto `PQC-frontend` and drops her old `api.ts` with the mock fallbacks, the null CSP and the `github.com/internal/` URL.

**7. UI white-screens when you search** (FE-12) · Sathish · Branch bug
Typing in the Findings, Projects or Scans search box with real data throws `Cannot read properties of undefined (reading 'toLowerCase')` and the whole app goes blank. There's no error boundary.
Fix: `(f.title ?? '').toLowerCase()` (and the same for every field) in the three filters, plus a top-level `ErrorBoundary` in `App.tsx` with a Reload button.

**8. Scans silently find nothing under folders named build, dist, vendor and so on** (ingestion item 1, AE-14) · Hima + Harshitha · Branch bug
Both the ingestion filter (`summary.py:15`, `file_filter.py:14-15`) and the analysis engines (`sast/engine.py:41-43`) check folder names against the whole absolute path. If the storage folder is anywhere under `build/`, `dist/`, `vendor/`, `gen/` or `venv/`, every file is skipped and the scan reports 0 findings as if it were clean.
Fix: check the path relative to the repo root:
```python
relative = path.relative_to(root)
if is_excluded(relative): continue
```
Only treat ambiguous names (`build`, `out`, `target`, `gen`) as excluded at the repo root.

**9. One long line can hang the analysis worker** (AE-13) · Harshitha · Branch bug
Several rules use unbounded `.*`, so time grows with the square of the line length: 100 KB takes 5 s, 400 KB more than 40 s, and 1 MB more than 2 minutes. A minified bundle is enough. Worst rules: `sast/rules.py:105,148,215` and `crypto/rules.py:199,262`. The worker has no timeout.
Fix: `line = line[:2000]` before matching, bounded patterns such as `[^\n]{0,200}?` and `Cipher.{0,100}CBC`, and a time budget per file and per scan.

**10. Ingestion rejects normal repositories** (ingestion item 2) · Hima · Branch bug
The 200:1 compression ratio check applies to every file with no minimum size. One 24 KB repetitive JSON fixture rejects the whole upload, and so do lockfiles and SQL dumps.
Fix: only apply the ratio to files (or the archive total) above a floor, e.g. 10 MB. The streamed size cap already stops zip bombs.

**11. Tauri app identifier is still the default** (DSK-02) · Harshith · Branch bug
`tauri build` refuses to run with `com.tauri.dev`. With it changed, the app builds and launches fine.
Fix: `"identifier": "com.silicofeller.pqc"` in `tauri.conf.json`. One line.

## P2: fix this week

**12. Upload path isn't checked by ingestion** (ingestion item 3) · Hima + Aakash · Integration risk
`scan_adapter.py:41-44` uses `repository_path` from the scan row as-is, so any ZIP on disk can be ingested.
Fix: Hima resolves the path and checks `p.relative_to(uploads_root)`, rejecting symlinks. Aakash confirms the upload root (`UPLOAD_DIR/<sha256(org)>/<uuid>.zip`).

**13. Worker and ingestion don't fit together** (INT-37, INT-38, INT-39) · Harshitha + Hima + Vamsi + Aakash · Integration risk
- Harshitha's worker calls `ingest_repository` directly instead of Hima's `ingest_scan_record`, and running both on one scan fails with "destination not empty".
- The worker says it saves errors to `error_message`, but that column doesn't exist, so a failed scan shows no reason.
- The storage root is guessed from path depth.

Fix:
- Pick one ingestion call. Use `ingest_scan_record`, and make re-running safe.
- Add `error_message TEXT NULL` to `scans` (schema, model, `ScanOut`).
- Read the storage root from settings.

**14. Seed admin can never log in** (INT-08) · Vamsi + Amrutha · Integration risk
The seed hash is bcrypt, the app only verifies argon2, and no dev password is written down. It no longer crashes (401 now), but nobody can use the admin.
Fix: seed an argon2 hash of a documented dev-only password (in the README, not in code).

**15. Demo findings mixed with real ones** (AE-06, DB-16) · Sathwik + Vamsi · Integration risk
`is_development` exists everywhere, but `GET /findings` returns the 2 seed rows next to real results. The seed scan points at a ZIP that doesn't exist, so it can never run.
Fix: Sathwik filters out `is_development = 1` by default (`?include_dev=true` to show them). Vamsi seeds that scan as `COMPLETED` or drops the dev findings from the default seed.

**16. No way to sign out, and the token lives forever** (FE-13, FE-07, FE-18) · Sathish / Harshith · Branch bug
- The only Sign Out button is in `TopHeader.tsx`, which nothing renders.
- The token is in `localStorage` and survives restarts.
- A network error at start-up logs the user out, but a real 401 is the only thing that should.

Fix:
- Put Sign Out in `Topbar`, and clear the token and the profile on logout.
- Keep the token in memory for now.
- Only clear it on `ApiError` with type `UNAUTHORIZED`.

**17. UI shows invented data and hides errors** (FE-14, FE-15, FE-08) · Sathish · Branch bug
**Invented data:**
- A new project with no scans shows "Completed" and 1/3/8/4 findings.
- The Profile page shows "Sathish V." for anyone.
- The Dashboard has a fixed "SCAN-001" activity list.
- `App.tsx` puts mock project data in the header with no badge.

**Hidden errors:**
- A failed findings load looks like "No findings", the same as a clean scan.
- Create-scan and cancel failures only go to the console.

Fix:
- Show empty states instead of defaults, and build the profile from the logged-in user.
- Label anything that's still mock.
- Show `ApiError.userMessage` in every catch.
- Keep "Start scan" disabled until an upload exists.
- Remove the `"jwt_signing_secret": "prod_sec_..."` text from `mockData.ts:177`.

**18. Analysis misses and false alarms** (AE-16, AE-17, AE-20, AE-23, AE-15) · Harshitha · Branch bug
On the demo repo, SAST + Crypto found 18 of 27 (no false positives on the 7 safe lines). Missing:
- `eval`, SSRF, `innerHTML` XSS, `open(a + b)`.
- AES-ECB, a constant IV, Java `MessageDigest "MD5"`, `AWS_SECRET_ACCESS_KEY`.

False alarms on harmless code:
- `adhere` read as DH, `designs` read as DES.
- Every `os.path.join` flagged.
- `md5(usedforsecurity=False)`.
- Placeholder tokens.

Two other bugs:
- `explanation` is never filled in, so every stored finding has NULL even though every rule has text.
- Symlinks are followed.

Fix:
- Add the rules: `\beval\s*\(`, `\.innerHTML\s*=`, `MODE_ECB|modes\.ECB|"AES/ECB`, `getInstance\(\s*"(MD5|SHA-?1)"`, and a wider secret-name pattern.
- Use word boundaries and skip comment lines.
- Pass `explanation=rule.explanation`.
- Skip `is_symlink()` files.

**19. Configuration and dependency engines** (AE-18) · Harshitha · Waiting on merge
Still stubs, so 10 of the 37 planted issues can't be found, and `.env`, `.yaml`, `.json` and `.pem` files are never scanned.
Fix: deliver the two engines. Meanwhile, add those extensions to `_SCANNABLE` for the secret rules.

**20. Severity table** (AE-19) · Harshitha + Pushpam · Integration risk
Only 7 of 18 severities match the answer key. RSA-1024 and RSA-2048 are both critical.
Fix: agree one table (PRD, answer key and rules). Suggested: RSA under 2048 is high; 2048 and up is medium with a "PQC migration" tag.

**21. Ingestion medium items** · Hima · Branch bug (the first one is an Integration risk with Harshitha)
- Retrying a scan always fails, and two runs at once can delete each other's files. Extract to a temp folder and rename it on success.
- Size and file-count limits count `node_modules` and `.git`, and excluded folders are still written to disk.
- Error handling leaves raw errors and half-extracted folders.
- 99k directory entries created 396k folders in 56 s. Add depth, path-length and folder-count limits.
- Windows path gaps (`a/b.txt:evil`, `CON`, trailing dots).
- `package.json`, `Cargo.toml` and key files aren't recognised.
- `vendor/` is excluded completely.
- Each ZIP is decompressed twice.

Details and fixes are in `hima-ingestion_audit_2026-10-01.docx`.

**22. `/redis/ping` is public** (BE-22) · Aakash · Branch bug
No token needed. It shows the queue length, and when Redis is down it shows the host and port.
Fix: `Depends(get_current_user)` (or drop the route outside development), and return just "Redis unavailable".

**23. Login abuse** (BE-17) · Amrutha · Branch bug
No lockout after 40 wrong passwords, `password1234` is accepted, and a 409 on register tells anyone which emails exist.
Fix: slow down or lock after repeated failures, reject common passwords, and close registration (see item 1).

**24. `Cargo.lock` not committed** (DSK-03) · Harshith · Branch bug
Fix: commit `desktop/src-tauri/Cargo.lock`. `cargo audit` on the generated one is clean apart from two Linux-only warnings (DSK-07).

**25. `.gitignore` on main and on the backend branches** (SEC-02, SEC-11, SEC-12) · whoever owns `main` (Waiting on merge) + Aakash/Amrutha (Branch bug)
- There's no root `.gitignore` on `main`, aakash-scan, sathwik, hima, PQC-frontend or findings-explorer. This causes the same 8 test failures on every one of them; they aren't bugs in those branches.
- `foundation` and `aakash-port` still have the old, too-broad file: `lib/`, `build/`, `dist/` and `*.zip` hide real source.
- Vamsi's `env/` and `ENV/` rules are unanchored.

Fix:
- Get Vamsi's root `.gitignore` onto `main` and anchor `env/` as `/env/`.
- Backend branches take that file instead of their own.

## P3: clean up when you can

**26. Security headers** (BE-09) · Amrutha / Aakash · Branch bug
Fix: add the `nosniff` middleware to foundation as well (aakash-port has it), and put `--no-server-header` in the README run command and the sidecar start.

**27. "Newest first" order is random within a second** (BE-15) · Vamsi + Aakash · Integration risk
Fix: `created_at DATETIME(6)` in the schema; the code already orders by `created_at DESC, id DESC`.

**28. Small auth hardening** (BE-23, BE-24) · Amrutha · Branch bug
- 422 errors echo the submitted password back.
- A token without `exp` is accepted.

Fix:
- Add a `RequestValidationError` handler that drops `input`.
- Decode with `options={"require": ["exp", "sub"]}`.

**29. Scan docs and failed rows** (BE-25, BE-26) · Aakash · Branch bug
The README still describes an `X-Queue-Status` header and "best-effort" queueing, but the code returns 503. Each failed enqueue also leaves a `FAILED` row.
Fix: update `backend/README.md` and `docs/api-projects-scans.md`, and decide whether to keep or delete those rows.

**30. Compose and DB scripts** (DB-04, DB-14, DB-15, DB-17, DB-18, SEC-06, SEC-13) · Vamsi (and the copies on foundation/aakash-port) · Branch bug
- Passwords still fall back to `change_me_locally` and are visible on the healthcheck command lines.
- MySQL has `root@%`.
- `verify_db.py` quietly falls back to SQLite.
- `run_combined_flow.py` leaves its user, project, scan and queue entry behind.

Fix:
- Read passwords from an untracked `.env` with no fallback, and pass them to the healthcheck via env, not `-p`.
- Set `MYSQL_ROOT_HOST=localhost`.
- Make `verify_db.py` exit non-zero if MySQL is unreachable.
- Clean up in a `finally` block.

**31. `category` filter** (BE-18) · Sathwik + Sathish · Branch bug
`category=` is still an alias for `engine`.
Fix: UI uses `engine` and `finding_category`; remove the alias once it does.

**32. Analysis small fixes** (AE-02, AE-07, AE-08, AE-09, AE-21, AE-22) · Harshitha · Branch bug
Fix:
- Dummy finding id: `uuid4()`, or don't store dummy findings.
- Accept lists for `findings`.
- Add `to_dict()`.
- Add length checks for `file_path`.
- Split lines on `\n` only, so line numbers match editors.
- De-duplicate on `(file, line, algorithm)`, and don't flag imports or `def` lines.

**33. Extra files on Harshitha's branch** (SEC-14, SEC-15) · Harshitha · Branch bug
Her branch has a copy of the QA suite, including the vulnerable demo repo, plus an old pytest with an advisory.
Fix: delete `tests/` from her branch. The suite lives on `qa/pushpam` and the demo repo on `tests/pushpam`.

**34. Test passwords trip the secret scanners** (SEC-16) · Aakash, Vamsi, Harshitha, Sathish · Branch bug
At `test_api_auth_scoping.py:44`, `run_combined_flow.py:71`, `backend/.env.example:3` and `apiAuthContract.test.mjs:242`. None of them is real.
Fix: obviously fake values with `# pragma: allowlist secret`, and leave the password empty in `.env.example`.

**35. Pin backend dependencies** (SEC-17) · Aakash / Amrutha · Branch bug
Fix: add a pinned `requirements.lock` (with hashes if possible) for the air-gapped installer, and audit that file.

**36. Desktop leftovers** (DSK-04, DSK-06, FE-16) · Harshith / Sathish · Branch bug
- `Cargo.toml` still says `name = "app"` and `authors = ["you"]`, and `bundle.targets` is `"all"`.
- `index.html` ships a looser CSP meta tag with `'unsafe-inline'` scripts.
- The new auth tests test a copy of the client, not `api.ts`.

Fix:
- Real metadata and only the targets we ship.
- Remove the meta CSP.
- Import the real `api.ts` in the tests.

**37. Ingestion small items** · Hima · Branch bug
Classification edge cases, language map gaps, `is_excluded("")` returning `[]`, paths in error messages, no logging, encrypted entries only rejected by accident, unguarded `stat()`, README tidy-up and missing tests. Details are in the Hima docx.

## On my side (QA)

- Done today: the suite now logs in automatically on backends with auth, so routes that need a token no longer show up as false 401 failures.
- To do:
  - Update `tests/analysis` for the new `analysis_engines` package (93 tests show as Blocked until then).
  - Remove the stale xfail markers.
  - Allowlist test fixtures in the secret check.
