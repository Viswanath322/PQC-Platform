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

On macOS or Linux, activate with `source .venv/bin/activate` instead. Set `DATABASE_URL` in `.env` to the local MySQL connection supplied by the team. Set `JWT_SECRET_KEY` to a long random development secret before using authentication.

Open `http://127.0.0.1:8000/docs` for Swagger. The health endpoint is `GET http://127.0.0.1:8000/api/v1/health` and returns `{"status":"healthy"}`.

## Authentication endpoints

- `POST /api/v1/auth/register` — JSON body with `email` and a password of at least 12 characters. Returns the created user; passwords are stored as Argon2 hashes.
- `POST /api/v1/auth/login` — JSON body with `email` and `password`. Returns a bearer access token.
- `GET /api/v1/auth/me` — requires `Authorization: Bearer <access_token>`.

The current database schema does not store a display name, so `full_name` in the response is derived from the email address.

These endpoints use the `users` table and expect Vamsi's shared schema to provide `users` and `organizations`. This app does not create or migrate tables; align the model with the agreed SQL schema before database integration.

## Local security notes

The API is intended for local development. CORS origins are limited to the documented local React/Tauri origins and can be overridden with the comma-separated `CORS_ORIGINS` setting. Do not commit `.env`, real credentials, or production secrets. Replace the development JWT secret before using auth, and do not expose this development server to an untrusted network.
