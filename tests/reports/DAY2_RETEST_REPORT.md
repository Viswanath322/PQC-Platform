# Day 2 Retest Report

PQC Security Assessment Platform (desktop) · Silicofeller Quantum
Pushpam, QA / security · 30 Sep 2026 · branch `qa/pushpam`

## Where we are

Big improvement since yesterday. The Day 1 flow now works end to end on MySQL: Aakash's backend on Vamsi's database creates a project with a UUID, uploads a ZIP, creates a scan, stores it as `QUEUED`, pushes it onto the Redis queue and cancels it (a second cancel correctly gets a 409). Yesterday's Critical (INT-01) is fixed.

Most of the other Day 1 issues are fixed too. Google Fonts is gone, MySQL and Redis only listen on `127.0.0.1`, Redis has a password, the committed `dev.db` / ZIP / `.pyc` files are gone from Aakash's branch, and Hima Bindu's ingestion blocks every path traversal trick I have (`../`, absolute paths, Windows paths, symlinks).

Everyone has now pushed something, so this was also the first real look at ingestion, the analysis engine base, auth, the findings API and the Tauri shell. That's where most of today's new issues come from.

What worries me most right now:

- **The seed data doesn't load (DB-09).** Some IDs in `seed.sql` are 39 to 45 characters and the column is `CHAR(36)`, so MySQL aborts the seed. A fresh database comes up with organizations but no users, projects or findings.
- **The UI hides backend failures (FE-06).** When an API call fails, `services/api.ts` quietly returns mock data. Logging in with any password gives a fake admin token, and a scan shows `QUEUED` even if the backend never received it. For a security product that's dangerous, because the screen can look fine while nothing is actually working.
- **The findings API crashes on MySQL (BE-13 / AE-05).** Sathwik's service reads a `findings.explanation` column that isn't in Vamsi's schema, so `/findings` returns a 500. With the ALTER from Sathwik's docs applied, everything passes, so this is just a schema sync.
- **The two backends can't be merged as they are (INT-09 / BE-16).** Aakash's and Amrutha's branches both add `backend/app/core/database.py`, and a combined app crashes with `Table 'projects' is already defined`. Until one app serves everything, auth can't protect the project and scan routes and Aakash's routes have no CORS.
- **Zip bombs get through ingestion (ING-01).** A 1 MB archive expanded to 1 GB on disk. Traversal is solid, but there are no size or ratio limits yet.
- **Tauri CSP is off (DSK-01).** `tauri.conf.json` has `"csp": null`. The good news is that the capabilities are minimal (no fs, shell, http, updater or devtools).
- **Auth has a default JWT secret (BE-12).** Amrutha's backend starts with `development-only-change-this-secret` if nothing is set. I forged a token with that key and `/auth/me` accepted it.

### What I'd do first

1. Vamsi: shorten the seed IDs to real 36 character UUIDs and add the `explanation` column (DB-09, BE-13).
2. Aakash + Amrutha: agree on one `database.py` and one set of models, and merge into a single app with auth and CORS (INT-09, BE-16, BE-01, BE-07).
3. Harshith / Sathish: remove the silent mock fallback in `api.ts`, and set a real CSP and app identifier in `tauri.conf.json` (FE-06, DSK-01, DSK-02).
4. Hima Bindu: add limits for total uncompressed size, compression ratio and file count (ING-01).
5. Amrutha: no default JWT secret. Refuse to start without one (BE-12).

## What I tested

| Branch | Commit | Owner | What changed since Day 1 |
|---|---|---|---|
| `backend/aakash-scan` | `7ce9382` | Aakash | UUID project IDs, input validation, committed files removed |
| `vamsi` | `fca83d5` | Vamsi | Ports on `127.0.0.1`, Redis password, `.gitignore` fixes, UUIDs |
| `backend/foundation` | `46519fb` | Amrutha | New: `/health`, register / login / me, CORS, config |
| `backend/sathwik-findings` | `8d6c278` | Sathwik | New: findings + reports API |
| `backend/hima-ingestion` | `67e7f11` | Hima Bindu | New: ingestion module |
| `backend/harshitha-analysis` | `89f3041` | Harshitha | New: analysis engine base + DummyEngine |
| `PQC-frontend` | `4c3c5e8` | Sathish | Fonts bundled, all pages, API client, Backend Status, Tauri shell |
| `frontend/findings-explorer` | `ad84266` | Hema | Findings explorer (same base as PQC-frontend) |

Same setup as yesterday: macOS, Python 3.10.6, Node 24.7, Docker (Colima), MySQL 8.0.46, Redis 7. Harshitha's code needs Python 3.11 (`enum.StrEnum`), so I ran the analysis tests in a `python:3.11-slim` container. There's no Rust on this machine, so I reviewed the Tauri config by reading it and couldn't build or launch the desktop app yet.

## Numbers

| Area | Target | Pass | Fail | Blocked | XFail |
|---|---|---|---|---|---|
| Integration | Aakash's backend on Vamsi's MySQL | 12 | 0 | 5 | 1 |
| Integration | Amrutha's backend on Vamsi's MySQL | 4 | 2 | 12 | 0 |
| Database | `vamsi` | 74 | 6 | 2 | 4 |
| Backend API | Aakash on SQLite | 100 | 8 | 63 | 8 |
| Backend API | Amrutha on MySQL | 53 | 1 | 123 | 2 |
| Backend API | Sathwik (as delivered) | 30 | 14 | 132 | 3 |
| Ingestion | Hima Bindu's module | 45 | 3 | 0 | 13 |
| Analysis | Harshitha's engines (Python 3.11) | 83 | 3 | 1 | 8 |
| Security + frontend | `PQC-frontend` | 37 | 14 | 2 | 0 |
| Security + frontend | `vamsi` | 25 | 0 | 28 | 0 |
| Security + frontend | `backend/foundation` | 25 | 1 | 27 | 0 |

Yesterday the integration run was 2 pass / 1 fail and stopped at "create project". Today it runs all the way through. Per-branch security counts for every branch are in [raw/retest_security_frontend.md](raw/retest_security_frontend.md).

## Day 1 defects: fixed or not

### Fixed

| ID | What it was | Owner |
|---|---|---|
| INT-01 | Backend and DB IDs didn't match, project creation gave a 500 | Aakash, Vamsi |
| INT-02 | `create_all` hid the mismatch (now SQLite only) | Aakash |
| INT-04 | No `/health` or auth (now on Amrutha's branch) | Amrutha |
| INT-06 | Second cancel now gets a 409 | Aakash |
| BE-03 | Empty project names accepted | Aakash |
| BE-04 | No length limits | Aakash |
| BE-05 | Huge IDs gave a 500 (now 422) | Aakash |
| FE-01 | Google Fonts loaded from the internet | Sathish |
| FE-02 | Dashboard, Projects, Scans, Findings pages missing | Harshith, Hema |
| FE-03 | No central API client | Harshith |
| FE-04 | No Backend Status indicator | Harshith |
| SEC-01 | `dev.db`, upload ZIP and `.pyc` committed (still in old history at `192fa3b`, only dummy data) | Aakash |
| SEC-01 (ingestion) | ZIP path traversal on extraction | Hima Bindu |
| DB-01 / SEC-04 | Redis had no password | Vamsi |
| DB-02 / SEC-03 | MySQL and Redis open on `0.0.0.0` | Vamsi |
| SEC-05 | `.gitignore` missed `*.db` and `desktop/src-tauri/target` | Vamsi |

### Partly fixed

| ID | What's left | Owner |
|---|---|---|
| BE-07 | CORS is set up on Amrutha's backend (Tauri origins allowed, `evil.example` blocked) but still missing on Aakash's | Aakash, Amrutha |
| INT-03 | Status is still free text in the model; only the MySQL ENUM enforces it | Aakash |
| SEC-02 | Root `.gitignore` exists on `vamsi` and `backend/foundation` only. Still missing on `main`, both frontends, and the aakash, sathwik, hima, harshitha and qa branches | Everyone |
| SEC-07 | Tauri shell exists and the static checks run, but I can't test it running yet | Harshith |
| FE-05 | Page title fixed, but some PQC pages lost their mock data label (FE-08) | Sathish |

### Not fixed

| ID | What's still wrong | Owner |
|---|---|---|
| BE-01 | No route requires login (blocked by BE-16) | Amrutha, Aakash |
| BE-02 | Scan response still includes the absolute server path | Aakash |
| BE-06 | Upload response still echoes the raw filename | Aakash |
| BE-09 | No `nosniff` header, `server: uvicorn` still shown | Aakash |
| BE-10 / INT-10 | If Redis is down or the password is wrong, scans still say `QUEUED` but are never queued | Aakash |
| DB-03 to DB-07 | Image pinning, shared dev password on command lines, no Redis healthcheck, deprecated options, `verify_db.py` cleanup | Vamsi |
| SEC-06 | Placeholder passwords still in compose and code defaults | Vamsi, Aakash |

## New issues

### High

| ID | What's wrong | Owner |
|---|---|---|
| DB-09 | `seed.sql` fails with `ERROR 1406 Data too long for column 'id'`. Fresh DB has 0 users, 0 projects, 0 findings | Vamsi |
| BE-13 / AE-05 | `finding_service.py` selects `findings.explanation`, which isn't in `schema.sql`. `/findings` and `/findings/{id}` return 500 on MySQL | Sathwik, Vamsi |
| INT-09 / BE-16 | Aakash's and Amrutha's backends both add `backend/app/core/database.py`, and a combined app fails with `Table 'projects' is already defined`. No single app serves health, auth, projects, scans and findings | Aakash, Amrutha |
| INT-07 | The seed admin `admin@pqc.local` can't log in; `EmailStr` rejects `.local` (422) | Amrutha, Vamsi |
| INT-08 | Logging in as a user with the seed's bcrypt hash gives a 500 (`UnknownHashError`); the backend only knows argon2 | Amrutha, Vamsi |
| BE-12 | JWT secret defaults to `development-only-change-this-secret` and the server starts with it. A token signed with it was accepted | Amrutha |
| FE-06 | `api.ts` falls back to mock data on any error. Any password logs in as a mock admin, and scans and cancels "succeed" without the backend | Harshith, Sathish |
| DSK-01 | Tauri CSP is `null` (`tauri.conf.json:24`) | Harshith |
| ING-01 | Zip bomb accepted: 1 MB archive became 1 GiB on disk, no size, ratio or count limits (`extractor.py:54-55`) | Hima Bindu |

### Medium

| ID | What's wrong | Owner |
|---|---|---|
| DB-10 | `verify_db.py` exits 1 on a fresh DB (duplicate `org-default-001` insert) | Vamsi |
| DB-12 / SEC-11 | `.gitignore` rule `lib/` also hides `desktop/src/lib/utils.ts`; `build/`, `dist/`, `env/`, `*.zip` are too broad | Vamsi |
| INT-11 | Seed-style IDs show up in `GET /projects` but give 422 on get-by-id and can't be used for scans | Vamsi |
| INT-12 | A cancelled scan stays in the `pqc:scan_queue` list | Aakash |
| DSK-02 | App identifier is still `com.tauri.dev` | Harshith |
| DSK-03 | No `Cargo.lock` committed, so Rust dependencies can't be audited | Harshith |
| FE-07 | Auth token stored in `localStorage` | Harshith |
| FE-08 | Mock data label missing on PQC, Reports and Crypto Inventory, and the badge says "Demo Telemetry" | Sathish |
| SEC-08 / AE-10 | 9 `__pycache__/*.pyc` files committed on `backend/harshitha-analysis`, no `.gitignore` | Harshitha |
| SEC-09 | `ecdsa` (via `python-jose`) has an advisory with no fixed version; requirements use ranges, not pins | Amrutha |
| SEC-10 | DB password also has a default in `config.py`, no startup check | Amrutha |
| ING-04 | Unknown file types become "binary" (`Dockerfile`, `.env`, `.tf`, `.pem`, `.html`), so later engines may skip them | Hima Bindu |
| ING-06 | Exclusions match folder names anywhere, so real code under `out/`, `env/` or `target/` is dropped | Hima Bindu |
| AE-02 | DummyEngine's `finding_id` is always `dummy-development-001`, not a UUID; a second scan would clash on the DB primary key | Harshitha |
| AE-03 | `analysis-engines/` has a hyphen, so it can't be imported by name; only a `PYTHONPATH` workaround works | Harshitha |
| AE-04 | `confidence` is a float in the engine but a string in the API and `VARCHAR(50)` in the DB | Harshitha, Sathwik, Vamsi |
| AE-06 | `is_development` has no API or DB field, so a stored dummy finding looks real | Harshitha, Sathwik, Vamsi |

### Low and info

These are all in the raw reports with evidence: DB-11, DB-13, DB-14, INT-13, INT-14, BE-15, BE-17, BE-18, ING-02, ING-03, ING-05, ING-07 to ING-10, AE-07 to AE-09, AE-11, AE-12, DSK-04, DSK-05, FE-09, SEC-12, SEC-13.

A couple worth mentioning: registration is open and 30 wrong passwords in a row never trigger a lockout (BE-17), and the `category` filter on `/findings` actually filters on `engine` (BE-18).

## Things that held up

- Hima Bindu's extractor rejects every traversal and symlink case with a typed error, never wrote outside the scan folder, and cleans up partial output. Fake, corrupted, empty, nested, unicode and 5,000-file archives are all handled.
- Amrutha's auth hashes passwords with argon2id, returns a generic 401 on bad logins, a 409 on duplicate emails, rejects `alg=none` and tampered tokens, and requires 12+ character passwords.
- Harshitha's Finding model rejects NaN, infinity, booleans, blank strings and out-of-range values. Engine and severity values match Sathwik's API and Vamsi's ENUMs exactly.
- The Tauri capabilities are minimal: only `core:default`, no shell, fs, http or opener permissions, no updater, no devtools.
- No real secrets on any branch, and `npm audit` is clean on both frontends.

## Merging the frontend branches

Less risky than I expected. `frontend/findings-explorer` is only one commit (a lockfile sync) past the point where it split from `PQC-frontend`, and `git merge-tree` merges cleanly with the result identical to `PQC-frontend`. So the findings explorer branch currently adds nothing new on top of it. Hema, if you're building Findings there, please rebase onto `PQC-frontend` first.

## Still blocked

- Running the desktop app itself (launch, Backend Status going red when FastAPI stops, watching network traffic with Wi-Fi off). I need Rust installed to build it, or someone to hand me a build. The steps are ready in [MANUAL_DESKTOP_SMOKE.md](../frontend/MANUAL_DESKTOP_SMOKE.md).
- Auth on the project and scan routes, until the backends are merged into one app.

## Running it yourself

```bash
source .venv/bin/activate
pip install -r tests/requirements.txt

# ingestion and analysis against the teammates' checkouts (analysis needs Python 3.11+)
PQC_INGESTION_ROOT=.worktrees/hima pytest tests/ingestion -v -rs
PQC_ANALYSIS_ROOT=.worktrees/harshitha pytest tests/analysis -v -rs

# security and frontend on any checkout
PQC_SCAN_ROOT=.worktrees/<branch> pytest tests/security tests/frontend -v -rs
```

The raw reports have the exact commands, ports and environment variables for each run:
[backend](raw/retest_backend.md) ·
[database and integration](raw/retest_database_integration.md) ·
[ingestion and analysis](raw/retest_ingestion_analysis.md) ·
[security, frontend and desktop](raw/retest_security_frontend.md)
