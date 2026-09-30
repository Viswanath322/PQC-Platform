"""Read-only queries for findings and Day 1 report summaries."""

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas.finding import FindingOut, ReportSeverityCounts


def list_findings(
    db: Session,
    *,
    severity: str | None = None,
    category: str | None = None,
    engine: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[FindingOut]:
    """Return findings with optional exact filters and bounded pagination."""
    clauses: list[str] = []
    params: dict[str, str | int] = {"limit": limit, "offset": offset}
    if severity is not None:
        clauses.append("severity = :severity")
        params["severity"] = severity.lower()
    if category is not None:
        clauses.append("category = :category")
        params["category"] = category
    if engine is not None:
        clauses.append("engine = :engine")
        params["engine"] = engine.lower()

    where = f" WHERE {' AND '.join(clauses)}" if clauses else ""
    rows = db.execute(
        text(
            "SELECT id AS finding_id, scan_id, engine, category, severity, title, "
            "file_path, line_number, evidence, explanation, confidence, recommendation, is_development "
            "FROM findings" + where + " ORDER BY created_at DESC, id DESC "
            "LIMIT :limit OFFSET :offset"
        ),
        params,
    ).mappings()
    return [FindingOut.model_validate(row) for row in rows]


def get_finding(db: Session, finding_id: str) -> FindingOut | None:
    row = db.execute(
        text(
            "SELECT id AS finding_id, scan_id, engine, category, severity, title, "
            "file_path, line_number, evidence, explanation, confidence, recommendation, is_development "
            "FROM findings WHERE id = :finding_id"
        ),
        {"finding_id": finding_id},
    ).mappings().first()
    return FindingOut.model_validate(row) if row is not None else None


def get_report_data(db: Session, scan_id: str) -> tuple[str, int, ReportSeverityCounts] | None:
    """Return scan status and finding counts; None means the scan does not exist."""
    scan = db.execute(
        text("SELECT status FROM scans WHERE id = :scan_id"), {"scan_id": scan_id}
    ).mappings().first()
    if scan is None:
        return None

    rows = db.execute(
        text(
            "SELECT severity, COUNT(*) AS count FROM findings "
            "WHERE scan_id = :scan_id GROUP BY severity"
        ),
        {"scan_id": scan_id},
    ).mappings()
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for row in rows:
        if row["severity"] in counts:
            counts[row["severity"]] = int(row["count"])
    return str(scan["status"]), sum(counts.values()), ReportSeverityCounts(**counts)
