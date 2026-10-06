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

Request validation failures return `422` using a stable, non-echoing shape. Submitted values are deliberately omitted from each issue:

```json
{
  "detail": "Request validation failed",
  "errors": [
    {"loc": ["body", "name"], "msg": "Invalid request value", "type": "string_too_long"}
  ]
}
```

Unexpected server failures return `500` with `{"detail":"Internal server error"}`; tracebacks and exception messages stay in server logs. Redis failures return `503` with `{"detail":"Redis unavailable"}`. Scan worker failures are stored as short user-safe messages; host paths and raw exception details are not returned in scan responses. Scan and report IDs, project filters, finding scan filters, and project IDs are validated as UUIDs. Findings filters enforce the declared severity and engine values and bounded pagination (`limit` 1–500, `offset` 0 or greater).

### Current analysis and report endpoints

Day 3 engine-specific response contracts are not implemented by this branch yet. Existing endpoints remain authenticated and return only persisted data:

| Endpoint | Parameters | Success response |
|---|---|---|
| `GET /api/v1/findings` | Optional `scan_id`, `severity`, `engine`, `finding_category`, `limit`, `offset` | JSON array of `FindingOut`; `[]` when no records match |
| `GET /api/v1/findings/{finding_id}` | UUID path parameter | One `FindingOut` |
| `GET /api/v1/reports/{scan_id}` | UUID path parameter | `ReportOut` with scan status, generation time, totals, severity counts, and findings |

Example report response:

```json
{
  "scan_id": "0d522be1-3f0d-4098-9695-c43923de94e8",
  "status": "COMPLETED",
  "generated_at": "2026-09-29T12:00:00Z",
  "project_name": "Demo Project",
  "target_repository": "repository",
  "total_findings": 0,
  "findings_by_severity": {"critical": 0, "high": 0, "medium": 0, "low": 0},
  "findings": []
}
```

Invalid request parameters return the validation shape above; a valid but inaccessible finding or scan returns `404`. Reports currently summarize findings and do not claim to provide Day 3 SBOM/CBOM or engine status sections until those contracts are implemented.

## Local security notes

The API is intended for local development. CORS origins are limited to the documented local React/Tauri origins and can be overridden with the comma-separated `CORS_ORIGINS` setting. Do not commit `.env`, real credentials, or production secrets. Replace the development JWT secret before using auth, and do not expose this development server to an untrusted network.
