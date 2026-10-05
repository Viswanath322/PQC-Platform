"""Read and write functions for findings and Day 2 report summaries."""

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas.finding import FindingOut, ReportSeverityCounts


def list_findings(
    db: Session,
    *,
    organization_id: str,
    scan_id: str | None = None,
    include_dev: bool = False,
    severity: str | None = None,
    category: str | None = None,
    engine: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[FindingOut]:
    """Return findings with optional exact filters and bounded pagination."""
    clauses: list[str] = ["projects.organization_id = :organization_id"]
    params: dict[str, str | int] = {
        "organization_id": organization_id,
        "limit": limit,
        "offset": offset,
    }
    if not include_dev:
        clauses.append("findings.is_development = FALSE")
    if scan_id is not None:
        clauses.append("findings.scan_id = :scan_id")
        params["scan_id"] = scan_id
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
            "SELECT findings.id AS finding_id, findings.scan_id, findings.engine, "
            "findings.category, findings.severity, findings.title, findings.file_path, "
            "findings.line_number, findings.evidence, findings.explanation, "
            "findings.confidence, findings.recommendation, findings.is_development "
            "FROM findings "
            "JOIN scans ON scans.id = findings.scan_id "
            "JOIN projects ON projects.id = scans.project_id" + where + " "
            "ORDER BY findings.created_at DESC, findings.id DESC "
            "LIMIT :limit OFFSET :offset"
        ),
        params,
    ).mappings()
    return [FindingOut.model_validate(row) for row in rows]


def get_finding(db: Session, finding_id: str, *, organization_id: str) -> FindingOut | None:
    row = db.execute(
        text(
            "SELECT findings.id AS finding_id, findings.scan_id, findings.engine, "
            "findings.category, findings.severity, findings.title, findings.file_path, "
            "findings.line_number, findings.evidence, findings.explanation, "
            "findings.confidence, findings.recommendation, findings.is_development "
            "FROM findings "
            "JOIN scans ON scans.id = findings.scan_id "
            "JOIN projects ON projects.id = scans.project_id "
            "WHERE findings.id = :finding_id AND projects.organization_id = :organization_id"
        ),
        {"finding_id": finding_id, "organization_id": organization_id},
    ).mappings().first()
    return FindingOut.model_validate(row) if row is not None else None


def get_report_data(
    db: Session, scan_id: str, *, organization_id: str
) -> tuple[str, int, ReportSeverityCounts] | None:
    """Return scan status and finding counts; None means the scan does not exist."""
    scan = db.execute(
        text(
            "SELECT scans.status FROM scans "
            "JOIN projects ON projects.id = scans.project_id "
            "WHERE scans.id = :scan_id AND projects.organization_id = :organization_id"
        ),
        {"scan_id": scan_id, "organization_id": organization_id},
    ).mappings().first()
    if scan is None:
        return None

    rows = db.execute(
        text(
            "SELECT severity, COUNT(*) AS count FROM findings "
            "JOIN scans ON scans.id = findings.scan_id "
            "JOIN projects ON projects.id = scans.project_id "
            "WHERE findings.scan_id = :scan_id AND projects.organization_id = :organization_id "
            "AND findings.is_development = FALSE "
            "GROUP BY findings.severity"
        ),
        {"scan_id": scan_id, "organization_id": organization_id},
    ).mappings()
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for row in rows:
        if row["severity"] in counts:
            counts[row["severity"]] = int(row["count"])
    return str(scan["status"]), sum(counts.values()), ReportSeverityCounts(**counts)


def persist_findings(
    db: Session,
    scan_id: str,
    findings: "tuple",
) -> int:
    """
    Persist a tuple of engine-layer Finding objects to the database.

    Returns the number of rows inserted.  Duplicate finding_ids are
    ignored (INSERT IGNORE semantics via on_conflict_do_nothing / skip).
    """
    from app.models import Finding as DBFinding

    inserted = 0
    existing_ids: set[str] = set()
    rows = db.execute(
        text("SELECT id FROM findings WHERE scan_id = :scan_id"),
        {"scan_id": scan_id},
    ).mappings()
    for row in rows:
        existing_ids.add(str(row["id"]))

    for f in findings:
        if f.finding_id in existing_ids:
            continue
        db_finding = DBFinding(
            id=f.finding_id,
            scan_id=scan_id,
            engine=str(f.engine.value),
            category=f.category,
            severity=str(f.severity.value),
            title=f.title,
            file_path=f.file_path,
            line_number=f.line_number,
            evidence=f.evidence,
            explanation=getattr(f, "explanation", None),
            confidence=f.confidence,
            recommendation=f.recommendation,
            is_development=f.is_development,
        )
        db.add(db_finding)
        inserted += 1

    db.commit()
    return inserted
