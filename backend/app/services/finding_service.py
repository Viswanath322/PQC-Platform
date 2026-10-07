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
    q: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[FindingOut]:
    """Return findings with optional exact filters, text search, and bounded pagination."""
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
    if q is not None and q.strip():
        clauses.append("(findings.title LIKE :q_like OR findings.file_path LIKE :q_like OR findings.category LIKE :q_like OR findings.explanation LIKE :q_like)")
        params["q_like"] = f"%{q.strip()}%"

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
            engine=str(f.engine.value) if hasattr(f.engine, "value") else str(f.engine),
            category=f.category,
            severity=str(f.severity.value) if hasattr(f.severity, "value") else str(f.severity),
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
            group_key=getattr(f, "group_key", None),
            correlation_id=getattr(f, "group_key", None) or getattr(f, "correlation_id", None),
            source_engine=getattr(f, "source_engine", None) or (str(f.engine.value) if hasattr(f.engine, "value") else str(f.engine)),
            correlation_group_id=getattr(f, "correlation_group_id", None),
        )
        db.add(db_finding)
        inserted += 1

    db.commit()
    return inserted


def persist_sbom_components(
    db: Session,
    scan_id: str,
    components: "tuple | list",
) -> int:
    """
    Persist a sequence of SBOM dependency components scoped to a scan.
    """
    from uuid import uuid4
    from app.models import SBOMComponent as DBSBOMComponent

    inserted = 0
    existing_ids: set[str] = set()
    rows = db.execute(
        text("SELECT id FROM sbom_components WHERE scan_id = :scan_id"),
        {"scan_id": scan_id},
    ).mappings()
    for row in rows:
        existing_ids.add(str(row["id"]))

    for c in components:
        comp_id = (
            getattr(c, "id", None)
            or getattr(c, "component_id", None)
            or (c.get("id") if isinstance(c, dict) else None)
            or str(uuid4())
        )
        if comp_id in existing_ids:
            continue
        name = getattr(c, "name", None) if not isinstance(c, dict) else c.get("name")
        if not name:
            continue
        db_comp = DBSBOMComponent(
            id=comp_id,
            scan_id=scan_id,
            name=name,
            version=getattr(c, "version", None) if not isinstance(c, dict) else c.get("version"),
            package_type=getattr(c, "package_type", "pypi") if not isinstance(c, dict) else c.get("package_type", "pypi"),
            source_file=getattr(c, "source_file", "") if not isinstance(c, dict) else c.get("source_file", ""),
            line_number=getattr(c, "line_number", None) if not isinstance(c, dict) else c.get("line_number"),
            license=getattr(c, "license", None) if not isinstance(c, dict) else c.get("license"),
            is_direct=getattr(c, "is_direct", True) if not isinstance(c, dict) else c.get("is_direct", True),
            detection_method=getattr(c, "detection_method", "manifest_parser") if not isinstance(c, dict) else c.get("detection_method", "manifest_parser"),
            confidence=getattr(c, "confidence", 1.0) if not isinstance(c, dict) else c.get("confidence", 1.0),
            is_development=getattr(c, "is_development", False) if not isinstance(c, dict) else c.get("is_development", False),
        )
        db.add(db_comp)
        inserted += 1

    db.commit()
    return inserted


def persist_cbom_components(
    db: Session,
    scan_id: str,
    components: "tuple | list",
) -> int:
    """
    Persist a sequence of CBOM cryptographic components scoped to a scan.
    """
    from uuid import uuid4
    from app.models import CBOMComponent as DBCBOMComponent

    inserted = 0
    existing_ids: set[str] = set()
    rows = db.execute(
        text("SELECT id FROM cbom_components WHERE scan_id = :scan_id"),
        {"scan_id": scan_id},
    ).mappings()
    for row in rows:
        existing_ids.add(str(row["id"]))

    for c in components:
        comp_id = (
            getattr(c, "component_id", None)
            or getattr(c, "id", None)
            or (c.get("component_id") or c.get("id") if isinstance(c, dict) else None)
            or str(uuid4())
        )
        if comp_id in existing_ids:
            continue
        algo = getattr(c, "algorithm", None) if not isinstance(c, dict) else c.get("algorithm")
        if not algo:
            continue
        db_comp = DBCBOMComponent(
            id=comp_id,
            scan_id=scan_id,
            algorithm=algo,
            category=getattr(c, "category", "general") if not isinstance(c, dict) else c.get("category", "general"),
            library=getattr(c, "library", None) if not isinstance(c, dict) else c.get("library"),
            version=getattr(c, "version", None) if not isinstance(c, dict) else c.get("version"),
            file_path=getattr(c, "file_path", "") if not isinstance(c, dict) else c.get("file_path", ""),
            line_number=getattr(c, "line_number", None) if not isinstance(c, dict) else c.get("line_number"),
            usage_context=getattr(c, "usage_context", None) if not isinstance(c, dict) else c.get("usage_context"),
            detection_method=getattr(c, "detection_method", "engine") if not isinstance(c, dict) else c.get("detection_method", "engine"),
            confidence=getattr(c, "confidence", 1.0) if not isinstance(c, dict) else c.get("confidence", 1.0),
            quantum_risk=getattr(c, "quantum_risk", "unknown") if not isinstance(c, dict) else c.get("quantum_risk", "unknown"),
            nist_migration_target=getattr(c, "nist_migration_target", None) if not isinstance(c, dict) else c.get("nist_migration_target"),
            pqc_mapping_version=getattr(c, "pqc_mapping_version", "1.0") if not isinstance(c, dict) else c.get("pqc_mapping_version", "1.0"),
            pqc_mapping_source=getattr(c, "pqc_mapping_source", "NIST FIPS 203/204/205") if not isinstance(c, dict) else c.get("pqc_mapping_source", "NIST FIPS 203/204/205"),
            rule_id=getattr(c, "rule_id", None) if not isinstance(c, dict) else c.get("rule_id"),
            rule_version=getattr(c, "rule_version", None) if not isinstance(c, dict) else c.get("rule_version"),
            is_development=getattr(c, "is_development", False) if not isinstance(c, dict) else c.get("is_development", False),
        )
        db.add(db_comp)
        inserted += 1

    db.commit()
    return inserted

