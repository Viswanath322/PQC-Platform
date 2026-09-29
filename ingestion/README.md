# Repository ingestion

This package validates a ZIP archive, extracts it into a scan-specific directory, and returns a JSON-serializable inventory of included files. The public entry point is `ingestion.summary.ingest_repository(archive_path, scan_directory)`.

```python
from ingestion import ingest_repository

summary = ingest_repository("uploads/repository.zip", "storage/scans/<scan-id>/repository")
```

The destination must be empty or not yet exist. Archive members with absolute paths, parent traversal, drive-qualified paths, or symbolic links are rejected. A failed extraction removes the partial destination. Excluded directories are `.git`, `.hg`, `.svn`, `node_modules`, common build/cache/coverage directories, virtual environments, and `vendor`; `.DS_Store` and `Thumbs.db` are excluded files. Files under excluded directories are not included in the summary.

The initial exclusions come from the Day 1 guide and common generated/dependency directories. The guide points to additional exclusions in the product PRD, but that PRD was not present in this repository when this package was implemented; reconcile `ingestion/file_filter.py` with the PRD before integration sign-off.

## Scan API integration

The Aakash scan API stores the uploaded ZIP in `Scan.repository_path` and uses a UUID string for `Scan.id`. A worker can call the adapter with those values and the backend storage root:

```python
from ingestion import ingest_scan_upload

summary = ingest_scan_upload(scan.repository_path, scan.id, "backend/storage")
```

This creates `backend/storage/scans/<scan-id>/repository/` and writes `ingestion-summary.json` beside it. The adapter validates the scan UUID before using it in a path. The scan route currently only queues the scan; the worker/orchestration code should invoke this adapter when it handles that queue item.

Run the requested cases with `python -m pytest ingestion/tests`. Tests use `unittest` assertions and can also run without pytest via `python -m unittest discover -s ingestion/tests`.

The ingestion package does not change the upload or scan API. The scan-processing caller should pass `scan.repository_path`, `scan.id`, and the backend storage root to `ingest_scan_upload` after loading a queued scan.
