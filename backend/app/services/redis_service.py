import os
import logging
import json

from dataclasses import asdict, dataclass, replace

import redis

QUEUE_KEY = "pqc:scan_queue"
logger = logging.getLogger("pqc.queue")


@dataclass(frozen=True, slots=True)
class ScanJob:
    """Versioned queue contract shared by scan API and worker."""

    scan_id: str
    repository_workspace: str
    selected_engines: tuple[str, ...]
    project_id: str | None = None
    payload_version: int = 2
    attempt: int = 0

    def __post_init__(self) -> None:
        if self.payload_version not in (1, 2):
            raise ValueError("Unsupported scan job payload")
        if self.payload_version == 2 and not self.project_id:
            raise ValueError("Scan job has no project ID")
        if self.payload_version == 1 and self.project_id is not None:
            raise ValueError("Legacy scan job has an unexpected project ID")

    def encode(self) -> str:
        payload = asdict(self)
        payload["selected_engines"] = list(self.selected_engines)
        return json.dumps(payload, sort_keys=True, separators=(",", ":"))

    @classmethod
    def decode(cls, value: str) -> "ScanJob":
        payload = json.loads(value)
        if not isinstance(payload, dict):
            raise ValueError("Unsupported scan job payload")
        version = payload.get("payload_version")
        if version not in (1, 2):
            raise ValueError("Unsupported scan job payload")
        scan_id = payload.get("scan_id")
        workspace = payload.get("repository_workspace")
        engines = payload.get("selected_engines")
        project_id = payload.get("project_id")
        attempt = payload.get("attempt", 0)
        if not isinstance(scan_id, str) or not scan_id:
            raise ValueError("Scan job has no scan ID")
        if not isinstance(workspace, str) or not workspace:
            raise ValueError("Scan job has no repository workspace")
        if not isinstance(engines, list) or not engines or any(not isinstance(item, str) for item in engines):
            raise ValueError("Scan job has invalid engine configuration")
        if version == 2 and (not isinstance(project_id, str) or not project_id):
            raise ValueError("Scan job has no project ID")
        if version == 1 and project_id is not None:
            raise ValueError("Legacy scan job has an unexpected project ID")
        if not isinstance(attempt, int) or isinstance(attempt, bool) or attempt < 0:
            raise ValueError("Scan job has invalid retry count")
        return cls(
            scan_id=scan_id,
            repository_workspace=workspace,
            selected_engines=tuple(engines),
            project_id=project_id,
            payload_version=version,
            attempt=attempt,
        )

    def for_retry(self) -> "ScanJob":
        return replace(self, attempt=self.attempt + 1)


def get_redis() -> redis.Redis:
    try:
        from app.core.config import get_settings
        url = os.getenv("PQC_REDIS_URL") or os.getenv("REDIS_URL") or get_settings().redis_url
    except Exception:
        url = os.getenv("PQC_REDIS_URL") or os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
    return redis.Redis.from_url(
        url,
        decode_responses=True,
        socket_connect_timeout=2,
    )


def enqueue_scan(
    scan_id: str,
    project_id: str,
    repository_workspace: str,
    selected_engines: tuple[str, ...],
) -> bool:
    """Queue a stable, versioned analysis job payload."""
    try:
        job = ScanJob(
            scan_id=scan_id,
            repository_workspace=repository_workspace,
            selected_engines=selected_engines,
            project_id=project_id,
        )
        return enqueue_job(job)
    except redis.RedisError as exc:
        logger.warning("Redis enqueue failed for scan %s: %s", scan_id, exc)
        return False


def enqueue_job(job: ScanJob) -> bool:
    """Queue an existing job payload, including its bounded retry count."""
    try:
        get_redis().rpush(QUEUE_KEY, job.encode())
        return True
    except redis.RedisError as exc:
        logger.warning("Redis enqueue failed for scan %s: %s", job.scan_id, exc)
        return False


def dequeue_scan(scan_id: str) -> bool:
    """Best-effort removal of a cancelled scan from the pending queue."""
    try:
        client = get_redis()
        # Include legacy raw scan IDs while recognizing structured jobs.
        for item in client.lrange(QUEUE_KEY, 0, -1):
            if item == scan_id:
                client.lrem(QUEUE_KEY, 0, item)
                continue
            try:
                job = ScanJob.decode(item)
            except (ValueError, TypeError, json.JSONDecodeError):
                continue
            if job.scan_id == scan_id:
                client.lrem(QUEUE_KEY, 0, item)
        return True
    except redis.RedisError as exc:
        logger.warning("Redis dequeue failed for scan %s: %s", scan_id, exc)
        return False
