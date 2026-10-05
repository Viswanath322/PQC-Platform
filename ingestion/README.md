# Repository ingestion

This package validates a ZIP archive, extracts it into a scan-specific directory, and returns a JSON-serializable inventory of included files. The public entry point is `ingestion.summary.ingest_repository(archive_path, scan_directory)`.

```python
from ingestion import ingest_repository

summary = ingest_repository("uploads/repository.zip", "storage/scans/<scan-id>/repository")
```

The destination must be empty or not yet exist. Archive members with absolute paths, parent traversal, drive-qualified paths, duplicate/colliding paths, or symbolic links are rejected. A failed extraction removes the partial destination. ZIPs are limited by default to 512 MiB expanded content, a 200:1 compression ratio, 50,000 files, and 100,000 total entries. Limits can be overridden with `ZipLimits` for controlled deployments and tests. Excluded directories are `.git`, `.hg`, `.svn`, `node_modules`, common build/cache/coverage directories, standard virtual environments, and `vendor`; `.DS_Store` and `Thumbs.db` are excluded files. Generic folder names such as `out`, `env`, and `target` are retained. Files under excluded directories are not included in the summary.

The initial exclusions come from the Day 1 guide and common generated/dependency directories. The guide points to additional exclusions in the product PRD, but that PRD was not present in this repository when this package was implemented; reconcile `ingestion/file_filter.py` with the PRD before integration sign-off.

## Scan API integration

The scan API stores the uploaded ZIP in `Scan.repository_path` and uses a UUID string for `Scan.id`. Since the API response no longer exposes the file path, the ingestion worker should use its database session and the shared Scan ORM model to load the row:

```python
from ingestion import ingest_scan_record

summary = ingest_scan_record(db, Scan, scan_id, storage_root="backend/storage", uploads_root="backend/storage/uploads")
```

`db` is the SQLAlchemy session configured for the application database (MySQL in the integrated deployment); `Scan` is the same ORM model used by the scan API. The adapter loads the row with `db.get(Scan, scan_id)` and reads `repository_path` from that database record. It never depends on the path being returned by the API. A missing scan raises `ScanNotFoundError`; a missing stored path raises `ValueError`.

**Security (Issue #3):** The `uploads_root` parameter confines `repository_path` to the uploads folder, preventing path traversal attacks.

Ingestion creates `backend/storage/scans/<scan-id>/repository/` and writes `ingestion-summary.json` beside it. The adapter validates the scan UUID before using it in a path. The scan route currently queues scans; the scan-processing worker should invoke this adapter when it handles that queue item.

Run the tests with `pytest ingestion/tests` or `python -m pytest ingestion/tests`. Tests use `unittest` assertions and can also run without pytest via `python -m unittest discover -s ingestion/tests`.

The ingestion package does not change the upload or scan API. The scan-processing caller should pass `scan.repository_path`, `scan.id`, and the backend storage root to `ingest_scan_upload` after loading a queued scan.
