# Projects, Upload and Scan APIs (login required, organization scoped)

Base URL: `http://127.0.0.1:8000/api/v1` | Swagger: `/docs`
All ids are UUID strings. Example values below are illustrative.

## Authentication
Every route below needs `Authorization: Bearer <access_token>`.

1. `POST /auth/register` is disabled by default. For local development only, set `ALLOW_PUBLIC_REGISTRATION=true`; each accepted account gets its own organization. The generic `202` response does not reveal whether an email already exists.
2. `POST /auth/login` returns `{"access_token": "...", "token_type": "bearer"}`.
3. Send the token on every request. In Swagger, click **Authorize** and paste the token.

| Situation | Response |
|---|---|
| No token, bad token, expired token, unknown user | `401` |
| User has no organization | `403` |
| Object belongs to another organization | `404` (same as "does not exist") |

## Organization scoping
- A project gets the organization of the user who creates it.
- Users only see projects, scans and uploads of their own organization.
- Uploads are stored per organization on disk, so an `upload_id` from another organization returns `404`.
- Users in the same organization share data.

## Projects
- `POST /projects` `{"name": "Demo Banking Application", "description": "test"}` returns `201`. `name` is trimmed, 1-255 chars; `description` max 10,000.
- `GET /projects` returns your organization's projects, newest first.
- `GET /projects/{project_id}` returns `200`, `422` if not a UUID, or `404`.

## Upload
`POST /uploads` is `multipart/form-data`, field `file`, a `.zip` up to 200 MB. Returns `201`:
```json
{"upload_id": "d9752a19-855b-445b-a6b3-5c5e82545e14", "filename": "test-repo.zip", "size_bytes": 130}
```
`filename` is sanitized (basename only, harmless characters, max 100 chars). Errors: `400` not a valid `.zip`, `413` too large.

## Scans
`POST /scans` `{"project_id": "<uuid>", "upload_id": "<uuid>"}` returns `201`:
```json
{"id": "01f62f10-e8c6-4f3e-88de-65af165b33a7", "project_id": "<uuid>", "status": "QUEUED",
 "created_at": "2026-09-30T09:50:10.837998", "started_at": null, "completed_at": null}
```
- The server-side ZIP path is not returned. It is saved in `scans.repository_path` in MySQL for ingestion.
- The response includes `X-Queue-Status: enqueued` when Redis accepted the scan or `deferred` when Redis is unavailable. A deferred scan is saved as `QUEUED`; an operator or worker retry must enqueue it later.
- Errors: `422` ids that are not UUIDs, `404` project or upload not found (or in another organization).

Other routes:
- `GET /scans` (optional `?project_id=<uuid>`) and `GET /scans/{scan_id}`.
- `POST /scans/{scan_id}/cancel` sets `CANCELLED`, fills `completed_at`, and removes the scan from the Redis queue. `409` if already `COMPLETED`, `FAILED` or `CANCELLED`.

## Redis test
`GET /redis/ping` requires a bearer token and returns `{"redis": "ok", "queue_length": 0}`, or the generic `503` response `Redis unavailable` if Redis is unreachable.

## Local run
```
cd backend
copy .env.example .env          # then set DATABASE_URL and a random JWT_SECRET_KEY (32+ chars)
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```
`REDIS_URL` must use the same locally chosen password as `REDIS_PASSWORD` in the repository-root `.env` (URL-encode reserved characters in the password). For Memurai without authentication, use `redis://127.0.0.1:6379/0`.

## Tests
```
python -m pip install pytest httpx
python -m pytest tests -v
```
Uses a throwaway SQLite DB and random JWT secret. Redis tests are skipped when Redis is not running.
