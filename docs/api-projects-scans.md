# Projects, Upload and Scan APIs (Day 1)

Owner: Aakash | Branch: `backend/aakash-scan` | Base URL: `http://127.0.0.1:8000/api/v1`

Auth is not enforced on these endpoints on Day 1.

## Run locally
```
cd backend
python -m venv .venv
.venv\Scripts\activate
python -m pip install fastapi uvicorn sqlalchemy pymysql pydantic-settings python-multipart redis
python -m uvicorn dev_main:app --reload
```
Swagger: http://127.0.0.1:8000/docs

Env vars (optional): `DATABASE_URL` (default `sqlite:///./dev.db`), `REDIS_URL` (default `redis://127.0.0.1:6379/0`), `UPLOAD_DIR` (default `storage/uploads`).
MySQL example: `mysql+pymysql://pqc:change_me_locally@127.0.0.1:3306/pqc_security`

## Projects

### POST /projects
Request:
```json
{"name": "Demo Banking Application", "description": "test"}
```
Response `201`:
```json
{"id": 1, "name": "Demo Banking Application", "description": "test", "created_at": "2026-09-29T07:36:47.994612"}
```

### GET /projects
Response `200`: list of project objects, newest first.

### GET /projects/{id}
Response `200`: one project. `404` if not found.

## Upload

### POST /uploads
`multipart/form-data` with a field named `file` (a `.zip`, max 200 MB).

Response `201`:
```json
{"upload_id": "a9b51b95-3e0b-4ccd-ba85-49fa06a7a43f", "filename": "aakash-backend-files.zip", "size_bytes": 6723}
```
Errors: `400` not a .zip or invalid ZIP, `413` too large.

The ZIP is stored on disk at `storage/uploads/{upload_id}.zip` (never in MySQL).

## Scans

### POST /scans
Request:
```json
{"project_id": 1, "upload_id": "a9b51b95-3e0b-4ccd-ba85-49fa06a7a43f"}
```
Response `201`:
```json
{
  "id": "0d522be1-3f0d-4098-9695-c43923de94e8",
  "project_id": 1,
  "status": "QUEUED",
  "repository_path": "C:\\...\\backend\\storage\\uploads\\a9b51b95-3e0b-4ccd-ba85-49fa06a7a43f.zip",
  "created_at": "2026-09-29T07:52:02.389114",
  "started_at": null,
  "completed_at": null
}
```
Errors: `404` project or upload not found, `400` invalid `upload_id`.
The scan id is also pushed to the Redis list `pqc:scan_queue` (skipped silently if Redis is down).

### GET /scans
Optional query: `?project_id=1`. Response `200`: list of scans, newest first.

### GET /scans/{scan_id}
Response `200`: scan object. `404` if not found.

### POST /scans/{scan_id}/cancel
Sets status to `CANCELLED` and fills `completed_at`.
Errors: `404` not found, `409` if already `COMPLETED`, `FAILED` or `CANCELLED`.

## Redis test

### GET /redis/ping
Response `200`:
```json
{"redis": "ok", "queue_length": 1}
```
`503` if Redis is unreachable.

## Notes for teammates
- Scan `id` is a UUID string. Project `id` is an integer.
- `repository_path` is the stored ZIP path; ingestion reads from it.
- Only `QUEUED` is produced on Day 1. Other statuses are reserved for later stages.