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
uvicorn app.main:app --reload --no-server-header
```

On macOS or Linux, activate with `source .venv/bin/activate` instead. Set `DATABASE_URL` in `backend/.env` to your local MySQL connection and `REDIS_URL` to the Redis instance configured in the root `.env`. Generate a unique JWT secret with `python -c "import secrets; print(secrets.token_urlsafe(48))"` and put it in `.env` as `JWT_SECRET_KEY`. The backend refuses to start if the database URL or a strong JWT secret is missing, or if a known placeholder secret is used.

Open `http://127.0.0.1:8000/docs` for Swagger. The health endpoint is `GET http://127.0.0.1:8000/api/v1/health` and returns `{"status":"healthy"}`.

## Authentication endpoints

- `POST /api/v1/auth/register` — disabled by default. Set `ALLOW_PUBLIC_REGISTRATION=true` only for local development; each accepted registration gets an isolated organization. The generic `202` response does not reveal whether an email already exists.
- `POST /api/v1/auth/login` — JSON body with `email` and `password`. Returns a bearer access token.
- `GET /api/v1/auth/me` — requires `Authorization: Bearer <access_token>`.

The current database schema does not store a display name, so `full_name` in the response is derived from the email address. Development/test environments also accept `.local` account addresses used by local seed data; production rejects them.

These endpoints use the seeded development administrator (`admin@pqc.example`) when public registration is disabled. The dev-only password is documented in `database/DATABASE_README.md`; change it before any shared deployment. Login attempts are throttled and common passwords are rejected during registration.

## Projects, uploads, and scans

The API exposes project, upload, scan, findings, report, and authenticated Redis health routes. Uploads use multipart form data with the field name `file`; ZIP files are saved under `UPLOAD_DIR` (default `backend/storage/uploads`) and are not stored in MySQL. Scan creation records the saved ZIP path and starts in `QUEUED` only when Redis accepts the job. If Redis is unavailable, the API returns `503` and retains a `FAILED` scan row with `QUEUE_UNAVAILABLE` for troubleshooting. Current request and response schemas are available in Swagger at `http://127.0.0.1:8000/docs`.

Project, upload, scan, findings, report, and Redis diagnostic endpoints require `Authorization: Bearer <access_token>`. Access is scoped to the authenticated user's organization. Uploads are stored in an organization-specific directory, and a scan can only reference an upload from the same organization. Scan responses omit the server-side `repository_path`; ingestion reads it from the `scans` row. Findings default to excluding development fixtures and accept `scan_id`, `severity`, `engine`, and `finding_category` filters.

The API uses the shared SQLAlchemy models under `database.models` through `app.models`; it does not declare a second `Base` or duplicate project/scan tables.

## Findings and reports

`GET /api/v1/findings` requires authentication and scopes results to the caller's organization. It supports `scan_id`, `severity`, `engine`, and `finding_category` filters. Development seed findings are omitted unless `include_dev=true` is explicitly requested. `GET /api/v1/findings/{finding_id}` and `GET /api/v1/reports/{scan_id}` use the same organization boundary and return `404` for records outside it.

## Local security notes

The API is intended for local development. CORS origins are limited to the documented local React/Tauri origins and can be overridden with the comma-separated `CORS_ORIGINS` setting. Do not commit `.env`, real credentials, or production secrets. Replace the development JWT secret before using auth, and do not expose this development server to an untrusted network.
