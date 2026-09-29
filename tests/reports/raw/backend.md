# Backend API raw results

- Date: 2026-09-29, QA branch `qa/pushpam`
- Target: teammate branch worktree `.worktrees/aakash` (`backend/dev_main.py`, projects/uploads/scans/redis_test routers under /api/v1), SQLite, Redis 7 in Docker
- Tests: `tests/backend/` (test_health, test_auth, test_projects, test_uploads, test_scans, test_findings_reports, plus test_api_security and helper `backend_helpers.py`)

## How it was run
```bash
docker run -d --name qa-redis-backend -p 127.0.0.1:6380:6379 redis:7-alpine
cd .worktrees/aakash/backend
PYTHONDONTWRITEBYTECODE=1 DATABASE_URL=sqlite:////<tmp>/qa/qa.db UPLOAD_DIR=<tmp>/qa/uploads \
  REDIS_URL=redis://127.0.0.1:6380/0 ../../../.venv/bin/uvicorn dev_main:app --host 127.0.0.1 --port 8001 &
cd /Users/pushpamraj/Desktop/PQC-Platform
PQC_UPLOAD_DIR=<tmp>/qa/uploads PQC_API_URL=http://127.0.0.1:8001 .venv/bin/pytest tests/backend -v -rs -rx
```
Env var names taken from the code: `DATABASE_URL`, `UPLOAD_DIR`, `REDIS_URL`. `PQC_UPLOAD_DIR` is an optional test-side variable that lets the upload tests inspect the disk.

**Summary: 12 failed, 86 passed, 31 skipped (all Blocked), 7 xfailed** (136 tests, ~1.4 s; stable over 4 runs).

Blocked = endpoints not in this branch's OpenAPI: /health, /auth/register|login|me, /findings, /findings/{id}, /reports/{scan_id}. Tests are written and will activate once those routes appear. Reruns are independent (uuid names).

**Redis-down run:** Redis container stopped; `POST /scans` still returns 201 QUEUED (enqueue error is swallowed by design), `GET /redis/ping` returns 503 `Redis unavailable: Error 61 connecting to 127.0.0.1:6380. Connection refused.` Only the 2 unrelated scan failures (BE-02, BE-05) occurred in test_scans.py with Redis down, so scan creation does not depend on Redis. See BE-10 (scan is never queued and nothing records that).

Oversized upload: ~201 MB streamed lazily; server returns 413 (curl-verified, `{"detail":"File too large"}`) and leaves no file. The test also accepts a connection reset (server closes while client is still sending); this happened once in the first run.

## Results
| Test | Result | Note |
|---|---|---|
| test_api_security::test_endpoint_requires_authentication (6 cases) | XFail x5 / Blocked x1 | FINDING: no auth enforced yet |
| test_api_security::test_scan_get_requires_authentication | XFail | FINDING: no auth enforced yet |
| test_api_security::test_redis_ping_requires_authentication | XFail | FINDING: no auth enforced yet |
| test_api_security::test_openapi_docs_exposure_documented | Pass |  |
| test_api_security::test_error_responses_do_not_leak_internals (6 cases) | Pass x6 |  |
| test_api_security::test_not_found_project_error_is_generic | Pass |  |
| test_api_security::test_500_never_returns_traceback | Pass |  |
| test_api_security::test_cors_does_not_allow_arbitrary_origin | Pass |  |
| test_api_security::test_cors_preflight_from_evil_origin_denied | Pass |  |
| test_api_security::test_cors_allows_tauri_origin | Fail | BE-07 no CORS middleware; Tauri webview origins not allowed |
| test_api_security::test_responses_contain_no_absolute_paths | Fail | BE-02 absolute server path in scan JSON |
| test_api_security::test_security_headers_present | Fail | BE-09 no X-Content-Type-Options |
| test_api_security::test_server_header_does_not_disclose_version | Pass |  |
| test_auth::test_register_success | Blocked | POST /api/v1/auth/register not implemented on this backend yet |
| test_auth::test_register_duplicate_email | Blocked | POST /api/v1/auth/register not implemented on this backend yet |
| test_auth::test_register_validation (5 cases) | Blocked x5 | POST /api/v1/auth/register not implemented on this backend yet |
| test_auth::test_register_weak_password_rejected | Blocked | POST /api/v1/auth/register not implemented on this backend yet |
| test_auth::test_login_success_and_me | Blocked | POST /api/v1/auth/login not implemented on this backend yet |
| test_auth::test_login_wrong_password | Blocked | POST /api/v1/auth/login not implemented on this backend yet |
| test_auth::test_login_unknown_user_same_error_as_wrong_password | Blocked | POST /api/v1/auth/login not implemented on this backend yet |
| test_auth::test_login_validation | Blocked | POST /api/v1/auth/login not implemented on this backend yet |
| test_auth::test_me_requires_token | Blocked | GET /api/v1/auth/me not implemented on this backend yet |
| test_auth::test_me_rejects_garbage_token | Blocked | GET /api/v1/auth/me not implemented on this backend yet |
| test_auth::test_sql_injection_login | Blocked | POST /api/v1/auth/login not implemented on this backend yet |
| test_findings_reports::test_list_findings | Blocked | GET /api/v1/findings not implemented on this backend yet |
| test_findings_reports::test_findings_severity_filter | Blocked | GET /api/v1/findings not implemented on this backend yet |
| test_findings_reports::test_findings_category_filter | Blocked | GET /api/v1/findings not implemented on this backend yet |
| test_findings_reports::test_findings_invalid_severity_rejected | Blocked | GET /api/v1/findings not implemented on this backend yet |
| test_findings_reports::test_findings_filter_sql_injection_inert | Blocked | GET /api/v1/findings not implemented on this backend yet |
| test_findings_reports::test_get_finding_unknown_404 | Blocked | GET /api/v1/findings/{finding_id} not implemented on this backend yet |
| test_findings_reports::test_get_finding_path_traversal_id | Blocked | GET /api/v1/findings/{finding_id} not implemented on this backend yet |
| test_findings_reports::test_get_finding_shape | Blocked | GET /api/v1/findings/{finding_id} not implemented on this backend yet |
| test_findings_reports::test_report_unknown_scan_404 | Blocked | GET /api/v1/reports/{scan_id} not implemented on this backend yet |
| test_findings_reports::test_report_malformed_scan_id | Blocked | GET /api/v1/reports/{scan_id} not implemented on this backend yet |
| test_findings_reports::test_report_for_queued_scan_not_500 | Blocked | GET /api/v1/reports/{scan_id} not implemented on this backend yet |
| test_health::test_health_ok | Blocked | GET /api/v1/health not implemented on this backend yet |
| test_health::test_health_post_not_allowed | Blocked | GET /api/v1/health not implemented on this backend yet |
| test_health::test_health_no_sensitive_info | Blocked | GET /api/v1/health not implemented on this backend yet |
| test_health::test_openapi_served_and_lists_day1_routes | Blocked | Day 1 contract routes not yet implemented on this backend: ['/api/v1/health', '/api/v1/auth/register', '/api/v |
| test_projects::test_create_project | Pass |  |
| test_projects::test_create_project_without_description | Pass |  |
| test_projects::test_create_project_validation_422 (6 cases) | Pass x6 |  |
| test_projects::test_create_project_invalid_json_body | Pass |  |
| test_projects::test_create_project_empty_name_rejected | Fail | BE-03 empty name accepted (201) |
| test_projects::test_create_project_whitespace_name_rejected | Fail | BE-03 whitespace name accepted |
| test_projects::test_create_project_overlong_name_rejected | Fail | BE-04 300-char name accepted (sqlite); MySQL String(255) would 500/truncate |
| test_projects::test_create_project_huge_description_rejected | Fail | BE-04 2MB description accepted |
| test_projects::test_create_project_unicode_and_markup_roundtrip | Pass |  |
| test_projects::test_sql_injection_in_name_is_inert | Pass |  |
| test_projects::test_get_project | Pass |  |
| test_projects::test_get_project_unknown_404 | Pass |  |
| test_projects::test_get_project_type_confusion_422 (6 cases) | Pass x6 |  |
| test_projects::test_get_project_huge_int_not_500 | Fail | BE-05 500 on out-of-range int id |
| test_projects::test_list_projects_newest_first_and_contains_new | Pass |  |
| test_projects::test_projects_method_not_allowed | Pass |  |
| test_scans::test_create_scan_is_queued | Pass |  |
| test_scans::test_scan_response_has_no_absolute_server_path | Fail | BE-02 repository_path absolute |
| test_scans::test_create_scan_validation_422 (7 cases) | Pass x7 |  |
| test_scans::test_create_scan_bad_upload_id_400 (6 cases) | Pass x6 |  |
| test_scans::test_create_scan_unknown_upload_404 | Pass |  |
| test_scans::test_create_scan_unknown_project_404 | Pass |  |
| test_scans::test_create_scan_huge_project_id_not_500 | Fail | BE-05 500 on out-of-range project_id |
| test_scans::test_create_scan_negative_project_id | Pass |  |
| test_scans::test_two_scans_same_upload_get_distinct_ids | Pass |  |
| test_scans::test_get_scan | Pass |  |
| test_scans::test_get_scan_unknown_404 | Pass |  |
| test_scans::test_get_scan_malformed_id_is_client_error (4 cases) | Pass x4 |  |
| test_scans::test_list_scans_and_filter_by_project | Pass |  |
| test_scans::test_list_scans_filter_unknown_project_empty | Pass |  |
| test_scans::test_list_scans_filter_type_confusion_422 | Pass |  |
| test_scans::test_list_scans_newest_first | Pass |  |
| test_scans::test_all_listed_statuses_in_allowed_set | Pass |  |
| test_scans::test_cancel_scan | Pass |  |
| test_scans::test_cancel_twice_409 | Pass |  |
| test_scans::test_cancel_unknown_404 | Pass |  |
| test_scans::test_cancel_via_get_not_allowed | Pass |  |
| test_scans::test_cancel_does_not_touch_other_scans | Pass |  |
| test_scans::test_scan_with_deleted_upload_reference_not_a_path | Pass |  |
| test_uploads::test_upload_valid_zip | Pass |  |
| test_uploads::test_upload_uppercase_extension_ok | Pass |  |
| test_uploads::test_upload_missing_file_field_422 | Pass |  |
| test_uploads::test_upload_wrong_field_name_422 | Pass |  |
| test_uploads::test_upload_non_zip_extension_rejected (5 cases) | Pass x5 |  |
| test_uploads::test_upload_text_file_named_zip_rejected | Pass |  |
| test_uploads::test_upload_empty_file_rejected | Pass |  |
| test_uploads::test_upload_truncated_zip_rejected | Pass |  |
| test_uploads::test_upload_html_polyglot_named_zip_rejected | Pass |  |
| test_uploads::test_upload_error_bodies_do_not_leak | Pass |  |
| test_uploads::test_upload_path_traversal_filename | Fail | BE-06 filename echoed as '../../x.zip' (stored name is a UUID, no escape) |
| test_uploads::test_upload_backslash_traversal_filename | Fail | BE-06 filename echoed unsanitised |
| test_uploads::test_upload_null_byte_filename_not_500 | Pass |  |
| test_uploads::test_upload_zip_slip_archive_accepted_but_not_extracted | Pass |  |
| test_uploads::test_upload_oversized_rejected_413 | Pass |  |
| test_uploads::test_uploads_method_not_allowed | Pass |  |

## Defects / Findings

**BE-01 High: No authentication on any endpoint.** Owner: Amrutha (auth) + Aakash (apply dependency to routers).
Repro: `curl -i http://127.0.0.1:8001/api/v1/projects`, also POST /projects, POST /uploads, GET/POST /scans, GET /redis/ping, all return 2xx with no token. Expected 401/403. Actual 200/201. (Documented as Day 1 gap; kept as XFail x7.) Fix: JWT dependency on all routers except /health, /auth/register, /auth/login; lock down or remove /redis/ping and /docs in release builds.

**BE-02 Medium: Absolute server filesystem path returned in scan response.** Owner: Aakash.
Repro: create project+upload, then `curl -s -XPOST localhost:8001/api/v1/scans -H 'content-type: application/json' -d '{"project_id":1,"upload_id":"<id>"}'`. Expected: no server paths. Actual: `"repository_path":"/private/tmp/.../uploads/<uuid>.zip"` (also in GET /scans, GET /scans/{id}). Discloses layout/username. Fix: drop from ScanOut (keep internal) or return the upload_id / relative name.

**BE-03 Medium: Empty and whitespace-only project names accepted.** Owner: Aakash.
Repro: `curl -XPOST localhost:8001/api/v1/projects -H 'content-type: application/json' -d '{"name":""}'` -> 201 with name "". Expected 422. Fix: `name: str = Field(min_length=1, max_length=255)` + strip.

**BE-04 Medium: No length limits on name/description (DB column is String(255)).** Owner: Aakash.
Repro: POST /projects with a 300-char name -> 201 on SQLite; a 2 MB description -> 201. Expected 422. Actual: accepted; on MySQL a >255 name will error (strict mode -> 500) or truncate. (MySQL not tested in this run.) Fix: Pydantic `max_length` matching the columns, cap description (e.g. 10k).

**BE-05 Medium: HTTP 500 on out-of-range integer ids.** Owner: Aakash.
Repro: `curl -i localhost:8001/api/v1/projects/1000000000000000000000000000000` and POST /scans with `"project_id":1000000000000000000000000000000` -> 500 (uvicorn log: `OverflowError: Python int too large to convert to SQLite INTEGER`). Expected 404/422. Fix: `Path(ge=1, le=2**31-1)` / `Field(ge=1, le=2**31-1)`. Response body is just "Internal Server Error" (no stack leak).

**BE-06 Low: Upload response echoes the client filename unsanitised.** Owner: Aakash.
Repro: `curl -F 'file=@a.zip;filename=../../evil.zip' localhost:8001/api/v1/uploads` -> 201 `"filename":"../../evil.zip"`. The file is stored as `<uuid>.zip` inside UPLOAD_DIR and nothing was written outside it (verified on disk), so there is no traversal today, but the raw name will be a hazard once later stages or the UI use it. Fix: store/return `os.path.basename` with control chars stripped.

**BE-07 Medium: No CORS configuration, so the Tauri/React UI cannot call the API from its webview.** Owner: Aakash / Amrutha (app wiring).
Repro: `curl -si -H 'Origin: tauri://localhost' localhost:8001/api/v1/projects | grep -i access-control` -> nothing. Arbitrary origins are (correctly) not allowed, but the legitimate origins (`tauri://localhost`, `http://tauri.localhost`, dev server) are not allowed either. Fix: CORSMiddleware with an explicit allow-list of the app origins, no wildcard.

**BE-08 Info: only the passing security checks:** error bodies contain no stack traces or paths, evil Origin gets no ACAO header, SQL-injection strings are inert (parametrised ORM), upload id path tricks blocked (400 via UUID parse).

**BE-09 Low: Missing hardening headers** (`X-Content-Type-Options: nosniff` absent; `server: uvicorn` shown). Owner: Aakash. Fix: small middleware for security headers; `--no-server-header`.

**BE-10 Low: Redis outage is silent on scan creation.** Owner: Aakash.
With Redis down, POST /scans returns 201 QUEUED but the scan id is never queued and nothing is logged or flagged (`enqueue_scan` returns False, ignored). Scan will sit QUEUED forever. Fix: log a warning and/or persist enqueue state so a worker can re-enqueue on startup. Also `/redis/ping` 503 detail echoes host:port (minor).

**BE-11 Blocked (delivery gap, not a bug): /health, /auth/*, /findings*, /reports/{scan_id} are not present on this branch.** Owner: Aakash / Amrutha. 31 tests wait on these. Also note the branch commits `backend/dev.db`, `backend/storage/uploads/*.zip` and `__pycache__/*.pyc` (tracked in git); should be gitignored (report to Aakash).

## Test-design notes
- Contract items not in this branch are Blocked, never Failed.
- Assertions express the secure/correct expectation; a Fail therefore indicates a product defect (BE-02..BE-07, BE-09).
