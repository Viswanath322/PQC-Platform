# QA + Security Fixes

From the Day 2 retest (30 Sep 2026). Only open issues are listed, most important first.
Please fix your part, push, and tell me so I can retest. The ID in brackets matches the QA reports.

## P1: fix first (blocks the demo or is a real security hole)

**1. Seed data fails to load** (DB-09, INT-11) · Vamsi
The user, project and finding IDs in `seed.sql` are 39 to 45 characters, but the columns are `CHAR(36)`, so MySQL aborts and a fresh DB has no users or projects.
Fix: use real 36 character UUIDs for every seed ID, e.g. `00000000-0000-0000-0000-000000000001`, and update the foreign keys that point to them. Do the same for `org-default-001`.

**2. `/findings` crashes on MySQL** (BE-13, AE-05) · Vamsi
Sathwik's API reads `findings.explanation`, which isn't in the schema.
Fix: add `explanation TEXT NULL` after `evidence` in the `findings` table in `schema.sql`.

**3. The two backends can't be merged** (INT-09, BE-16) · Aakash + Amrutha
Both branches add `backend/app/core/database.py`, and a combined app crashes with `Table 'projects' is already defined`.
Fix: keep one `database.py` and one `Base`. Put all models (users, projects, scans) in `app/models/`, and have one `app/main.py` that includes the health, auth, projects, uploads, scans, findings and reports routers.

**4. No login required on any route** (BE-01) · Amrutha + Aakash
Fix: after the merge, add a `get_current_user` dependency (from Amrutha's auth) to the projects, uploads, scans, findings and reports routers. Only `/health`, `/auth/register` and `/auth/login` stay public.

**5. UI silently falls back to mock data** (FE-06) · Harshith / Sathish
In `desktop/src/services/api.ts`, every `catch` returns mock data. Any password logs in as a fake admin, and scans show `QUEUED` even when the backend never got them. I saw this in the running desktop app: the header said "Live" while `/projects`, `/scans` and `/findings` returned 404, and the Dashboard showed a score of 74 and 14 findings that were all mock data with no label.
Fix: remove the mock fallbacks from the `catch` blocks and show the error in the UI. If mock data is still needed for development, only use it behind an explicit `VITE_USE_MOCK=true` flag, and never for login.

**6. Default JWT secret** (BE-12, SEC-10) · Amrutha
`config.py` defaults to `development-only-change-this-secret`. I forged a token with it and `/auth/me` accepted it.
Fix: remove the default values for the JWT secret and the DB password. Refuse to start if `JWT_SECRET_KEY` isn't set or is shorter than 32 characters.

**7. Seed admin can't log in** (INT-07, INT-08) · Amrutha + Vamsi
`admin@pqc.local` is rejected by `EmailStr` (422), and the seed's bcrypt hash causes a 500 because the backend only knows argon2.
Fix: Vamsi, change the seed email to one that validates, e.g. `admin@example.com`, and generate the seed password hash with argon2. Amrutha, catch unknown hash formats and return 401 instead of 500.

**8. Tauri CSP is off** (DSK-01) · Harshith
`tauri.conf.json` has `"csp": null`.
Fix: set
`"csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' http://127.0.0.1:8000"`

**9. Zip bomb accepted by ingestion** (ING-01) · Hima Bindu
A 1 MB archive expanded to 1 GB on disk.
Fix: before extracting, check the `infolist()` totals, and count bytes while copying too, because headers can lie. Reject if total uncompressed size is over a limit (make it configurable, e.g. 2 GB), any file's compression ratio is over 100, or there are more than e.g. 100,000 entries. Delete partial output on rejection.

**10. No CORS on Aakash's routes** (BE-07) · Aakash + Amrutha
Fix: solved by the merge in item 3, since Amrutha's CORS setup already allows the Tauri origins and blocks others.

## P2: fix this week

**11. Scans say `QUEUED` when Redis fails** (BE-10, INT-10) · Aakash
Fix: if `enqueue_scan` fails, log it and either mark the scan `FAILED` or return 503. Don't return 201 `QUEUED`.

**12. Cancelled scans stay in the Redis queue** (INT-12) · Aakash
Fix: on cancel, remove the scan ID from `pqc:scan_queue` (`LREM`).

**13. Scan response leaks the server path** (BE-02) · Aakash
Fix: don't return the absolute `repository_path`. Return the upload ID or the original filename instead.

**14. Scan status is free text in the model** (INT-03) · Aakash
Fix: use an `Enum` with the 8 statuses in the model and schema, matching the MySQL ENUM.

**15. No root `.gitignore` on most branches** (SEC-02, SEC-12) · Vamsi first, then everyone
Fix: Vamsi, get the root `.gitignore` merged into `main`. Everyone else, rebase on `main` once it's there.

**16. `.gitignore` rules are too broad** (DB-12, SEC-11) · Vamsi
`lib/` also hides `desktop/src/lib/utils.ts`. `build/`, `dist/`, `env/` and `*.zip` also match more than they should.
Fix: remove `lib/`, and anchor the others to where they belong, e.g. `/desktop/dist/`, `/backend/build/`, `/backend/storage/`. Keep `*.zip` only for the storage folders.

**17. `.pyc` files committed** (AE-10, SEC-08) · Harshitha
Fix: `find analysis-engines -name __pycache__ -exec git rm -r --cached {} +`, then add a `.gitignore` (or rebase on `main` once item 15 is in).

**18. Dummy finding ID is fixed** (AE-02) · Harshitha
`dummy-development-001` isn't a UUID, and a second scan would clash on the primary key.
Fix: generate `finding_id` with `uuid4()`.

**19. `analysis-engines` can't be imported** (AE-03) · Harshitha
Fix: rename the folder to `analysis_engines` and switch to relative imports (`from .base import ...`).

**20. `confidence` type doesn't match** (AE-04) · Harshitha + Sathwik + Vamsi
It's a float in the engine, a string in the API and `VARCHAR(50)` in the DB.
Fix: agree on one type. I suggest a float from 0 to 1 everywhere, with `DECIMAL(3,2)` in the DB.

**21. Dummy findings look real once stored** (AE-06) · Harshitha + Sathwik + Vamsi
Fix: either add an `is_development` field to the API and DB, or don't store dummy findings at all.

**22. Some file types classified as binary** (ING-04) · Hima Bindu
Fix: classify `Dockerfile`, `.env`, `.tf`, `.yaml`, `.yml`, `.toml`, `.ini` and `.pem` as config, and `.html` as source.

**23. Exclusions drop real code** (ING-06) · Hima Bindu
Folders named `out`, `env` or `target` are skipped anywhere in the path.
Fix: only exclude `.git`, `node_modules`, `__pycache__`, `.venv`, `venv` and similar by name. Only exclude build output folders when a matching build file sits next to them (e.g. `target/` next to `Cargo.toml`), and confirm the final list against the PRD.

**24. Tauri app identifier is the default** (DSK-02) · Harshith
This blocks the build: `npx tauri build` stops with "The default value `com.tauri.dev` is not allowed", so the app can't be packaged until it's changed. Please do this one early.
Fix: set `"identifier": "com.silicofeller.pqc"` in `tauri.conf.json`.

**25. `Cargo.lock` not committed** (DSK-03) · Harshith
Fix: commit `desktop/src-tauri/Cargo.lock` so Rust dependencies can be audited.

**26. Auth token in `localStorage`** (FE-07) · Harshith
Fix: keep the token in memory for now, and move it to secure storage once the Tauri shell is final.

**27. Mock data labels missing** (FE-08) · Sathish
Fix: add `MockDataBadge` back on PQC, Reports and Crypto Inventory, and change the badge text from "Demo Telemetry" to "Mock data".

**28. `ecdsa` advisory with no fix** (SEC-09) · Amrutha
`python-jose` pulls in `ecdsa`, which has an advisory and no fixed version.
Fix: switch from `python-jose` to `PyJWT`, and pin exact versions in `requirements.txt`.

**29. `verify_db.py` fails and leaves rows behind** (DB-10, DB-07) · Vamsi
Fix: don't insert `org-default-001` again (check first or use `INSERT IGNORE`), and delete the rows the script creates when it finishes.

## P3: clean up when you can

**30. Upload echoes the raw filename** (BE-06) · Aakash
Fix: return only the base name (`Path(name).name`), never `../../evil.zip`.

**31. Missing security headers** (BE-09) · Aakash / Amrutha
Fix: add `X-Content-Type-Options: nosniff` in a small middleware, and run uvicorn with `--no-server-header`.

**32. "Newest first" isn't reliable on MySQL** (BE-15) · Aakash + Vamsi
Fix: use `DATETIME(6)` for `created_at`, and order by `created_at DESC, id DESC`.

**33. Login has no rate limit, and registration is open** (BE-17) · Amrutha
Fix: lock out or slow down after repeated failed logins, reject common passwords, and make registration admin-only or dev-only.

**34. `category` filter uses `engine`** (BE-18) · Sathwik + Hema
Fix: filter on the actual `category` field (or rename the parameter to `engine`), accept any case for severity, and add basic pagination.

**35. Compose passwords** (DB-04, DB-14, SEC-06, SEC-13) · Vamsi
Fix: move passwords to a `.env` file (commit only `.env.example`), use different passwords for MySQL root, the MySQL app and Redis, and keep them off the healthcheck command line.

**36. Compose cleanup** (DB-03, DB-05, DB-06) · Vamsi
Fix: pin exact image versions (e.g. `mysql:8.0.46`), add a Redis healthcheck (`redis-cli -a $REDIS_PASSWORD ping`), and remove `version:` and `--default-authentication-plugin`.

**37. Duplicate default organization** (DB-11) · Vamsi
Fix: remove the `'1'` organization row.

**38. ORM cascades don't match the SQL** (DB-13) · Vamsi
Fix: make `database/models.py` match the schema (`ON DELETE SET NULL` means no `delete-orphan` cascade).

**39. Users get no organization** (INT-14) · Amrutha + Aakash
Fix: set `organization_id` on register, and take the project's organization from the logged-in user instead of a hardcoded default.

**40. API docs out of date** (INT-13) · Aakash
Fix: update `docs/api-projects-scans.md` to UUID IDs and a Redis URL with a password.

**41. Ingestion small fixes** (ING-02, ING-03, ING-05, ING-07, ING-08, ING-09) · Hima Bindu
Fix:
- Raise a proper `ExtractionError` for duplicate entry names.
- Don't write excluded folders to disk at all.
- Recognise `requirements-*.txt`, `Pipfile`, `Gemfile` and `setup.py` as manifests.
- Make `is_excluded("")` return `False`.
- Add a `conftest.py` so plain `pytest ingestion/tests` works.
- Add tests for absolute paths, symlinks and zip bombs.

**42. Analysis engine small fixes** (AE-07, AE-08, AE-09, AE-11) · Harshitha
Fix:
- Accept lists and plain strings where tuples and enums are expected.
- Add a `to_dict()` method.
- Add length checks that match the DB columns.
- Add a few tests to your branch.

**43. Tauri scaffold leftovers** (DSK-04) · Harshith
Fix: in `Cargo.toml` and `tauri.conf.json`, set the real name, authors, description and license. Add a minimum window size, and limit bundle targets to what we ship.

**44. Hardcoded GitHub URL in the UI** (FE-09) · Sathish
Fix: remove the `https://github.com/internal/` default in `api.ts:185`. Leave `repository_url` empty if not given.
