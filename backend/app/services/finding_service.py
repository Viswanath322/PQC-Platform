"""Read-only queries for findings and Day 1 report summaries."""

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas.finding import FindingOut, ReportSeverityCounts


def list_findings(
    db: Session,
    *,
    severity: str | None = None,
    category: str | None = None,
) -> list[FindingOut]:
    """Return findings, optionally filtered by severity and UI category (engine)."""
    clauses: list[str] = []
    params: dict[str, str] = {}
    if severity is not None:
        clauses.append("severity = :severity")
        params["severity"] = severity
    if category is not None:
        # Day 1 UI categories are the four analysis engines; the Finding.category
        # field itself remains the more specific rule/category label (e.g. injection).
        clauses.append("engine = :category")
        params["category"] = category

    where = f" WHERE {' AND '.join(clauses)}" if clauses else ""
    rows = db.execute(
        text(
            "SELECT id AS finding_id, scan_id, engine, category, severity, title, "
            "file_path, line_number, evidence, confidence, recommendation "
            "FROM findings" + where + " ORDER BY created_at DESC, id"
        ),
        params,
    ).mappings()
    return [FindingOut.model_validate(row) for row in rows]


def get_finding(db: Session, finding_id: str) -> FindingOut | None:
    row = db.execute(
        text(
            "SELECT id AS finding_id, scan_id, engine, category, severity, title, "
            "file_path, line_number, evidence, confidence, recommendation "
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
