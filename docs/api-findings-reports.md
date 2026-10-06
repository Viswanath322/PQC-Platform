# Findings and Reports API (Day 1)

Owner: Sathwik | Branch: `backend/sathwik-findings` | Base URL: `http://127.0.0.1:8000/api/v1`

These endpoints are read-only on Day 1. Findings may be empty until an analysis engine writes rows. Empty results are valid and do not represent a clean scan. UI mock data must be labelled as development data.

## Finding contract

The API uses lower-case enum values to match the MySQL schema. `finding_id` maps to the database primary key `findings.id`; `scan_id` is included so consumers can associate a finding with its scan. `line_number`, `evidence`, `explanation`, `confidence`, `recommendation`, and `category` may be null. `explanation` is a distinct, human-readable reason the finding matters; it is not a duplicate of the code evidence, rule/category, or remediation.

The Day 3 contract adds optional `rule_id`, `rule_version`, `source_engine`, and `correlation_group_id` fields. Correlation metadata groups source findings without removing or replacing them. Existing records may return null for these fields.

```json
{
  "finding_id": "4f60a71c-c536-4ac3-9861-bb683ee9099a",
  "scan_id": "0d522be1-3f0d-4098-9695-c43923de94e8",
  "engine": "sast",
  "category": "injection",
  "severity": "high",
  "title": "Unsafe query construction",
  "file_path": "src/db.py",
  "line_number": 42,
  "evidence": "query = 'SELECT * FROM users WHERE id=' + user_id",
  "explanation": "An attacker may alter the query through user-controlled input and access records outside their authorization.",
  "confidence": 0.92,
  "rule_id": "SAST-INJ-001",
  "rule_version": "1.0.0",
  "source_engine": "sast",
  "correlation_group_id": null,
  "recommendation": "Use a parameterized query.",
  "is_development": false
}
```

The example above is illustrative only; it is not a real finding. Hema can use these field names and types for the Findings UI. The engine values are `sast`, `crypto`, `dependency`, and `configuration`; severity values are `critical`, `high`, `medium`, and `low`.

The API query requires `explanation TEXT NULL`, `confidence FLOAT NULL`, and `is_development BOOLEAN NOT NULL DEFAULT FALSE` in the findings table. Keep the DDL and SQLAlchemy model in sync before integrating this API against MySQL. For a fresh schema, define those columns directly. For an existing database, add the nullable/flag columns and migrate any nonnumeric confidence values deliberately before changing the confidence type; do not blindly cast qualitative values to floats.

```sql
ALTER TABLE findings
  ADD COLUMN explanation TEXT NULL AFTER evidence,
  ADD COLUMN is_development BOOLEAN NOT NULL DEFAULT FALSE;
```

Also make the schema/model `confidence` a nullable numeric score from 0 to 1. Until the schema changes are applied, the API query must not be deployed against the old schema. Day 1 findings can leave `explanation` null and default `is_development` to false; the UI should describe a missing explanation instead of inferring one from evidence or remediation.

## Endpoints

### `GET /findings`

Optional query parameters: `scan_id` (UUID), `severity` (`critical|high|medium|low`, case-insensitive), `engine` (`sast|crypto|dependency|configuration`, case-insensitive), `finding_category` (exact finding category, such as `injection`), `limit` (1–500, default 100), and `offset` (zero or greater, default 0). Filters can be combined. Results are newest first with a stable ID tie-break; when no records match, returns `[]`. The Day 1 UI called its analysis group filter `category`; that name remains as a deprecated alias for `engine` to avoid breaking the current UI. New consumers should use `engine` for the analysis group and `finding_category` for the response `category` field.

Example: `GET /api/v1/findings?severity=HIGH&engine=sast&limit=50&offset=0`

### `GET /findings/{finding_id}`

Returns one Finding object. Returns `404` with `{"detail":"Finding not found"}` when absent.

### `GET /findings/summary?scan_id=<uuid>`

Returns `total_findings` and deterministic counts grouped by engine, severity, and category for one organization-visible scan. Each group is an array of `{ "key": "...", "count": 0 }` objects sorted by key. Null categories are counted as `uncategorized`; empty scans return zero and empty group arrays. A scan not visible to the caller returns `404`.

## Report contract

`GET /reports/{scan_id}` returns scan status, finding totals, findings grouped by engine/category/severity, and the finding details. It also returns `sbom` and `cbom` arrays of persisted components. Each component includes type, name, version, PURL, source file/line, detection method, confidence, and metadata. Empty arrays indicate no components were persisted. The detail list is bounded at 5,000 records and `findings_truncated` indicates whether it is incomplete. It does not generate PDF/CSV exports or claim that a queued/in-progress scan is complete.

Component example:

```json
{
  "component_id": "9d1a2d27-b4e1-4ea1-8f9f-ef234fb88ea1",
  "component_type": "library",
  "name": "requests",
  "version": "2.32.0",
  "purl": "pkg:pypi/requests@2.32.0",
  "source_file": "requirements.txt",
  "line_number": null,
  "detection_method": "manifest",
  "confidence": 1.0,
  "metadata": {}
}
```

```json
{
  "scan_id": "0d522be1-3f0d-4098-9695-c43923de94e8",
  "status": "COMPLETED",
  "generated_at": "2026-09-29T12:00:00Z",
  "total_findings": 0,
  "findings_by_engine": {},
  "findings_by_category": {},
  "findings_by_severity": {
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0
  },
  "findings_truncated": false,
  "findings": [],
  "sbom": [],
  "cbom": []
}
```

This example shows a valid empty report. A report with findings includes the same `FindingOut` fields documented above.

`generated_at` is when the summary response was generated, not the scan completion time. A scan with no findings returns zero counts. An unknown scan returns `404` with `{"detail":"Scan not found"}`.

## Integration note

Include `findings.router` and `reports.router` in the FastAPI app with prefix `/api/v1`. The routers use the shared `app.core.database.get_db` dependency and read the `findings`/`scans` columns documented by the database workstream. No findings are fabricated by these endpoints.
