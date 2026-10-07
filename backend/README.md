# Backend development setup

## Requirements

- Python 3.11 or newer
- MySQL 8, started with the team's Docker Compose configuration

## Run locally

From this directory, create and activate a virtual environment, install dependencies, and configure the local environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

On macOS or Linux, activate with `source .venv/bin/activate` instead. Set `DATABASE_URL` in `.env` to the local MySQL connection supplied by the team. Generate a unique JWT secret with `python -c "import secrets; print(secrets.token_urlsafe(48))"` and put it in `.env` as `JWT_SECRET_KEY`. The backend refuses to start if the database URL or a strong JWT secret is missing, or if a known placeholder secret is used.

Open `http://127.0.0.1:8000/docs` for Swagger. The health endpoint is `GET http://127.0.0.1:8000/api/v1/health` and returns `{"status":"healthy"}`.

## Authentication endpoints

- `POST /api/v1/auth/register` — JSON body with `email` and a password of at least 12 characters. Returns the created user; passwords are stored as Argon2 hashes.
- `POST /api/v1/auth/login` — JSON body with `email` and `password`. Returns a bearer access token.
- `GET /api/v1/auth/me` — requires `Authorization: Bearer <access_token>`.

The current database schema does not store a display name, so `full_name` in the response is derived from the email address. Development/test environments also accept `.local` account addresses used by local seed data; production rejects them.

These endpoints use the `users` table and expect Vamsi's shared schema to provide `users` and `organizations`. This app does not create or migrate tables; align the model with the agreed SQL schema before database integration.

## Projects, uploads, and scans

The API also exposes project creation/list/detail, ZIP upload, scan creation/list/status/cancellation, and `GET /api/v1/redis/ping`. Uploads use multipart form data with the field name `file`; ZIP files are saved under `UPLOAD_DIR` (default `backend/storage/uploads`) and are not stored in MySQL. Scan creation records the saved ZIP path and starts in `QUEUED`. Redis enqueue is best-effort, so a scan record can be created while Redis is unavailable. Current request and response schemas are available in Swagger at `http://127.0.0.1:8000/docs`.

Project, upload, and scan endpoints require `Authorization: Bearer <access_token>`. Access is scoped to the authenticated user's organization. Newly registered accounts are assigned to the seeded `org-default-001`; registration returns `503` if that organization is not present. Uploads are stored in an organization-specific directory, and a scan can only reference an upload from the same organization. Scan responses omit the server-side `repository_path`; ingestion reads it from the `scans` row. `POST /api/v1/scans` reports Redis enqueue success in `X-Queue-Status` (`enqueued` or `deferred`).

The API uses the shared SQLAlchemy models under `database.models` through `app.models`; it does not declare a second `Base` or duplicate project/scan tables.

## Stable API errors and Day 3 validation

Protected project, upload, scan, finding, and report routes require a bearer token and scope records to the authenticated user's organization. Missing, invalid, expired, or unknown-user tokens return `401`; a user without an organization receives `403`; inaccessible or missing organization-owned records return `404`.

Request validation failures return `422` using a stable, non-echoing shape:

```json
{
  "detail": "Request validation failed",
  "errors": [
    {"loc": ["body", "name"], "msg": "Invalid request value", "type": "string_too_long"}
  ]
}
```

Unexpected server failures return `500` with `{"detail":"Internal server error"}`; tracebacks and exception messages stay in server logs. Redis failures return `503` with `{"detail":"Redis unavailable"}`. Scan worker failures are stored as short user-safe messages; host paths and raw exception details are not returned in scan responses. Scan and report IDs, project filters, finding scan filters, and project IDs are validated as UUIDs. Findings filters enforce the declared severity and engine values and bounded pagination (`limit` 1–500, `offset` 0 or greater).

## Findings, summaries, and reports

All finding and report endpoints require bearer authentication and scope reads to the user's organization. `GET /api/v1/findings` supports optional `scan_id`, `severity`, `engine`, `finding_category`, `limit` (1–500), and `offset` (0 or greater). Results sort by creation time descending and finding ID descending, so page boundaries are stable. The legacy `category` query name remains an alias for `engine`.

`FindingOut` includes `rule_id`, `rule_version`, `source_engine`, and optional `correlation_group_id` when present. `GET /api/v1/findings/summary?scan_id=<uuid>` returns `total_findings` and sorted `by_engine`, `by_severity`, and `by_category` arrays. A scan outside the caller's organization returns `404`, including scans with no findings.

Example summary response:

```json
{
  "scan_id": "0d522be1-3f0d-4098-9695-c43923de94e8",
  "total_findings": 2,
  "by_engine": [{"key": "crypto", "count": 1}, {"key": "sast", "count": 1}],
  "by_severity": [{"key": "high", "count": 1}, {"key": "medium", "count": 1}],
  "by_category": [{"key": "injection", "count": 1}, {"key": "pqc", "count": 1}]
}
```

`GET /api/v1/reports/{scan_id}` returns finding totals and details, per-engine and per-category totals, and separate `sbom` and `cbom` component arrays. Each component carries its type, name/version, repository-relative source file and line when known, detection method, confidence, and optional metadata. Empty arrays mean no components have been persisted. Report details are capped at 5,000 findings; `findings_truncated` indicates when the full count is higher.

Existing MySQL installations must apply [`20261006_day3_findings_components.sql`](../database/migrations/20261006_day3_findings_components.sql) before using the expanded report/finding queries. Fresh installs receive the same contract from `database/schema.sql`. Components are scan-owned and cascade-delete with their scan; source findings remain separate and correlation is represented by an optional group ID.

## Local security notes

The API is intended for local development. CORS origins are limited to the documented local React/Tauri origins and can be overridden with the comma-separated `CORS_ORIGINS` setting. Do not commit `.env`, real credentials, or production secrets. Replace the development JWT secret before using auth, and do not expose this development server to an untrusted network.
