"""Read and write functions for findings and Day 2 report summaries."""

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas.finding import (
    ComponentOut,
    FindingBreakdown,
    FindingOut,
    FindingSummaryOut,
    ReportSeverityCounts,
)


def list_findings(
    db: Session,
    *,
    organization_id: str,
    scan_id: str | None = None,
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
    if scan_id is not None:
        clauses.append("findings.scan_id = :scan_id")
        params["scan_id"] = scan_id
    if severity is not None:
        clauses.append("findings.severity = :severity")
        params["severity"] = severity.lower()
    if category is not None:
        clauses.append("findings.category = :category")
        params["category"] = category
    if engine is not None:
        clauses.append("findings.engine = :engine")
        params["engine"] = engine.lower()

    where = f" WHERE {' AND '.join(clauses)}" if clauses else ""
    rows = db.execute(
        text(
            "SELECT findings.id AS finding_id, findings.scan_id, findings.engine, "
            "findings.category, findings.severity, findings.title, findings.file_path, "
            "findings.line_number, findings.evidence, findings.explanation, "
            "findings.confidence, findings.recommendation, findings.is_development, "
            "findings.rule_id, findings.rule_version, findings.source_engine, findings.correlation_group_id "
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
            "findings.confidence, findings.recommendation, findings.is_development, "
            "findings.rule_id, findings.rule_version, findings.source_engine, findings.correlation_group_id "
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
) -> tuple[
    str, str, str, int, ReportSeverityCounts, list[FindingOut],
    dict[str, int], dict[str, int], list[ComponentOut], list[ComponentOut], bool,
] | None:
    """Return scan status, project name, target repository, finding counts, and findings list."""
    import os

    scan = db.execute(
        text(
            "SELECT scans.status, scans.repository_path, projects.name AS project_name "
            "FROM scans "
            "JOIN projects ON projects.id = scans.project_id "
            "WHERE scans.id = :scan_id AND projects.organization_id = :organization_id"
        ),
        {"scan_id": scan_id, "organization_id": organization_id},
    ).mappings().first()
    if scan is None:
        return None

    project_name = scan["project_name"] or "Demo Banking Application"
    raw_path = scan["repository_path"] or ""
    target_repo = os.path.basename(raw_path.rstrip("/\\")) if raw_path else "repository"
    if not target_repo:
        target_repo = "pqc_sample_banking_app.zip"

    findings = list_findings(db, organization_id=organization_id, scan_id=scan_id, limit=5000)

    summary = get_finding_summary(db, scan_id, organization_id=organization_id)
    components = db.execute(
        text(
            "SELECT id AS component_id, component_kind, component_type, name, version, purl, "
            "source_file, line_number, detection_method, confidence, metadata_json AS metadata "
            "FROM scan_components WHERE scan_id = :scan_id "
            "ORDER BY component_kind, name, version, source_file, id"
        ),
        {"scan_id": scan_id},
    ).mappings().all()
    sbom = [ComponentOut.model_validate(row) for row in components if row["component_kind"] == "dependency"]
    cbom = [ComponentOut.model_validate(row) for row in components if row["component_kind"] == "crypto"]

    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for f in findings:
        sev = str(f.severity).lower()
        if sev in counts:
            counts[sev] += 1

    return (
        str(scan["status"]),
        str(project_name),
        str(target_repo),
        summary.total_findings,
        ReportSeverityCounts(**{**counts, **{item.key: item.count for item in summary.by_severity}}),
        findings,
        {item.key: item.count for item in summary.by_engine},
        {item.key: item.count for item in summary.by_category},
        sbom,
        cbom,
        summary.total_findings > len(findings),
    )


def get_finding_summary(
    db: Session, scan_id: str, *, organization_id: str
) -> FindingSummaryOut | None:
    """Return deterministic grouped counts for a scan the organization can access."""
    scan = db.execute(
        text(
            "SELECT scans.id FROM scans JOIN projects ON projects.id = scans.project_id "
            "WHERE scans.id = :scan_id AND projects.organization_id = :organization_id"
        ),
        {"scan_id": scan_id, "organization_id": organization_id},
    ).first()
    if scan is None:
        return None

    total = db.execute(
        text("SELECT COUNT(*) FROM findings WHERE scan_id = :scan_id"),
        {"scan_id": scan_id},
    ).scalar_one()

    def breakdown(column: str, *, null_key: str | None = None) -> list[FindingBreakdown]:
        expression = f"COALESCE({column}, :null_key)" if null_key else column
        rows = db.execute(
            text(
                f"SELECT {expression} AS group_key, COUNT(*) AS item_count "
                f"FROM findings WHERE scan_id = :scan_id "
                f"GROUP BY {expression} ORDER BY group_key"
            ),
            {"scan_id": scan_id, "null_key": null_key} if null_key else {"scan_id": scan_id},
        ).mappings()
        return [FindingBreakdown(key=str(row["group_key"]), count=int(row["item_count"])) for row in rows]

    return FindingSummaryOut(
        scan_id=scan_id,
        total_findings=int(total),
        by_engine=breakdown("engine"),
        by_severity=breakdown("severity"),
        by_category=breakdown("category", null_key="uncategorized"),
    )


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
            rule_id=getattr(f, "rule_id", None),
            rule_version=getattr(f, "rule_version", None),
            source_engine=getattr(f, "source_engine", None) or str(f.engine.value),
            correlation_group_id=getattr(f, "correlation_group_id", None),
        )
        db.add(db_finding)
        inserted += 1

    db.commit()
    return inserted
