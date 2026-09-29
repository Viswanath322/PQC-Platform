# Findings and Reports API (Day 1)

Owner: Sathwik | Branch: `backend/sathwik-findings` | Base URL: `http://127.0.0.1:8000/api/v1`

These endpoints are read-only on Day 1. Findings may be empty until an analysis engine writes rows. Empty results are valid and do not represent a clean scan. UI mock data must be labelled as development data.

## Finding contract

The API uses lower-case enum values to match the MySQL schema. `finding_id` maps to the database primary key `findings.id`; `scan_id` is included so consumers can associate a finding with its scan. `line_number`, `evidence`, `explanation`, `confidence`, `recommendation`, and `category` may be null. `explanation` is a distinct, human-readable reason the finding matters; it is not a duplicate of the code evidence, rule/category, or remediation.

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
  "confidence": "medium",
  "recommendation": "Use a parameterized query."
}
```

The example above is illustrative only; it is not a real finding. Hema can use these field names and types for the Findings UI. The engine values are `sast`, `crypto`, `dependency`, and `configuration`; severity values are `critical`, `high`, `medium`, and `low`.

The database schema currently has no `explanation` column. Before serving stored explanations, apply this additive MySQL change and update the finding writer to populate it:

```sql
ALTER TABLE findings ADD COLUMN explanation TEXT NULL AFTER evidence;
```

Until that schema change is applied, the API query must not be deployed against the old schema. Day 1 findings can leave `explanation` null; the UI should describe that limitation instead of inferring an explanation from evidence or remediation.

## Endpoints

### `GET /findings`

Optional query parameters: `severity` (`critical|high|medium|low`) and `category` (`sast|crypto|dependency|configuration`). The Day 1 UI calls its four analysis groups “categories”; this filter maps to the response `engine` field. The response `category` field is the more specific finding label, such as `injection`. Both filters can be combined. Returns newest first; when no records match, returns `[]`.

Example: `GET /api/v1/findings?severity=high&category=sast`

### `GET /findings/{finding_id}`

Returns one Finding object. Returns `404` with `{"detail":"Finding not found"}` when absent.

## Report contract

`GET /reports/{scan_id}` returns the scan status and finding totals by severity. It does not generate PDF/CSV exports or claim that a queued/in-progress scan is complete. Sathish can use this shape for the Reports screen.

```json
{
  "scan_id": "0d522be1-3f0d-4098-9695-c43923de94e8",
  "status": "COMPLETED",
  "generated_at": "2026-09-29T12:00:00Z",
  "total_findings": 3,
  "findings_by_severity": {
    "critical": 0,
    "high": 1,
    "medium": 2,
    "low": 0
  }
}
```

`generated_at` is when the summary response was generated, not the scan completion time. A scan with no findings returns zero counts. An unknown scan returns `404` with `{"detail":"Scan not found"}`.

## Integration note

Include `findings.router` and `reports.router` in the FastAPI app with prefix `/api/v1`. The routers use the shared `app.core.database.get_db` dependency and read the `findings`/`scans` columns documented by the database workstream. No findings are fabricated by these endpoints.
