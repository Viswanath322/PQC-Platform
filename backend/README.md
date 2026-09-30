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

The API uses the shared SQLAlchemy models under `database.models` through `app.models`; it does not declare a second `Base` or duplicate project/scan tables.

## Local security notes

The API is intended for local development. CORS origins are limited to the documented local React/Tauri origins and can be overridden with the comma-separated `CORS_ORIGINS` setting. Do not commit `.env`, real credentials, or production secrets. Replace the development JWT secret before using auth, and do not expose this development server to an untrusted network.
