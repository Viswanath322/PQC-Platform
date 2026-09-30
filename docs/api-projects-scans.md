# Projects, Upload and Scan APIs

Owner: Aakash | Base URL: `http://127.0.0.1:8000/api/v1` | Swagger: `/docs`

All ids are UUID strings (`CHAR(36)`). Example values below are illustrative.
Auth is not enforced on these routes in the standalone branch. Login/organization scoping is being agreed with the foundation branch.

## Run locally (standalone branch)
```
cd backend
python -m venv .venv
.venv\Scripts\activate
python -m pip install fastapi uvicorn sqlalchemy pymysql cryptography pydantic-settings python-multipart redis
python -m uvicorn dev_main:app --reload
```

| Env var | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./dev.db` | MySQL: `mysql+pymysql://pqc:change_me_locally@127.0.0.1:3306/pqc_security` (schema comes from `database/schema.sql`; tables are only auto-created on SQLite) |
| `REDIS_URL` | `redis://127.0.0.1:6379/0` | With the compose password: `redis://:change_me_locally@127.0.0.1:6379/0`. Memurai on Windows also works. |
| `UPLOAD_DIR` | `storage/uploads` | ZIPs are stored on disk, never in MySQL |

## Projects

### POST /projects
```json
{"name": "Demo Banking Application", "description": "test"}
```
`201`:
```json
{"id": "1eab70da-be6e-431f-a44f-e8bf2a04f107", "name": "Demo Banking Application", "description": "test", "created_at": "2026-09-30T09:50:10.304997"}
```
Rules: `name` is trimmed, 1-255 chars (else `422`); `description` max 10,000 chars.

### GET /projects
`200`: list of projects, newest first.

### GET /projects/{project_id}
`200` project. `422` if the id is not a UUID, `404` if it does not exist.

## Upload

### POST /uploads
`multipart/form-data`, field name `file`, a `.zip` up to 200 MB.

`201`:
```json
{"upload_id": "d9752a19-855b-445b-a6b3-5c5e82545e14", "filename": "test-repo.zip", "size_bytes": 130}
```
`filename` is sanitized (basename only, harmless characters, max 100 chars); the raw client filename is never echoed.
Errors: `400` not a `.zip` or not a valid ZIP, `413` too large.

## Scans

### POST /scans
```json
{"project_id": "1eab70da-be6e-431f-a44f-e8bf2a04f107", "upload_id": "d9752a19-855b-445b-a6b3-5c5e82545e14"}
```
`201`:
```json
{
  "id": "01f62f10-e8c6-4f3e-88de-65af165b33a7",
  "project_id": "1eab70da-be6e-431f-a44f-e8bf2a04f107",
  "status": "QUEUED",
  "created_at": "2026-09-30T09:50:10.837998",
  "started_at": null,
  "completed_at": null
}
```
- The server-side ZIP path is **not** returned. It is saved in `scans.repository_path` in MySQL for ingestion to read.
- Response header `X-Queue-Status`: `enqueued` when the scan id was pushed to the Redis list `pqc:scan_queue`, or `deferred` when Redis was unreachable. The scan is saved and `QUEUED` either way (the database is the source of truth), and the failure is logged as a warning by `pqc.queue`. A worker should also pick up `QUEUED` scans from the database on startup.
- Errors: `422` project_id is not a UUID, `404` project or upload not found, `400` invalid `upload_id`.

### GET /scans
Optional `?project_id=<uuid>` (`422` if not a UUID). Newest first.

### GET /scans/{scan_id}
`200` scan, `404` if not found.

### POST /scans/{scan_id}/cancel
Sets `CANCELLED`, fills `completed_at`, and removes the scan id from the Redis queue.
Errors: `404` not found, `409` if already `COMPLETED`, `FAILED` or `CANCELLED`.

## Redis test

### GET /redis/ping
`200`: `{"redis": "ok", "queue_length": 1}`. `503` if Redis is unreachable or the password is wrong.

## Tests
```
cd backend
python -m pip install pytest httpx
python -m pytest tests -v
```
Uses a throwaway SQLite DB and upload folder. Redis tests are skipped when Redis is not running.