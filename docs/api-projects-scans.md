# Projects, Upload, and Scan API

Base URL: `http://127.0.0.1:8000/api/v1`  
Swagger: `http://127.0.0.1:8000/docs`

All project and scan IDs are UUID strings. The seeded organization ID is the opaque string `org-default-001`.

## Authentication and organization access

Register with `POST /auth/register`, then log in with `POST /auth/login`. Send the returned token as `Authorization: Bearer <access_token>` on every project, upload, and scan request. Missing, invalid, or expired tokens return `401`. An authenticated account without an organization returns `403` for organization-scoped operations.

New registrations are assigned to `org-default-001`; the organization must exist in the database seed. Project creation assigns the authenticated user's organization. Project and scan list/detail operations only return records belonging to that organization. Upload files are stored beneath an organization-specific directory and can only be used to create scans within that organization.

## Projects

- `POST /projects` — JSON `{"name": "Demo", "description": "optional"}`; creates a project in the caller's organization.
- `GET /projects` — lists projects in the caller's organization.
- `GET /projects/{project_id}` — returns an organization-scoped project; inaccessible and missing IDs both return `404`.

## Uploads

- `POST /uploads` — multipart form data with field `file`; accepts valid ZIP files up to 200 MB.
- Response includes `upload_id`, a sanitized basename-only `filename`, and `size_bytes`.
- Upload files are stored on local disk, not in MySQL. The upload ID is only valid within the organization that uploaded it.

## Scans

- `POST /scans` — JSON `{"project_id": "<uuid>", "upload_id": "<uuid>"}`; project and upload must belong to the caller's organization.
- The response omits `repository_path`. That server-side path remains stored in `scans.repository_path` for ingestion.
- Response header `X-Queue-Status` is `enqueued` when Redis accepted the scan ID or `deferred` when Redis is unavailable. The scan row remains saved as `QUEUED` either way.
- `GET /scans` — lists scans in the caller's organization; optional filter `?project_id=<uuid>`.
- `GET /scans/{scan_id}` — returns a scan in the caller's organization.
- `POST /scans/{scan_id}/cancel` — cancels an active scan and best-effort removes it from the Redis queue.

Other organizations' project and scan IDs return `404`, avoiding disclosure of their existence. The Redis diagnostic endpoint is `GET /redis/ping`.
