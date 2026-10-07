-- Day 3 Findings, correlation metadata, and SBOM/CBOM component storage.
-- Apply once to an existing Day 2 database. Back up the database first.

ALTER TABLE findings
    ADD COLUMN rule_id VARCHAR(100) NULL,
    ADD COLUMN rule_version VARCHAR(50) NULL,
    ADD COLUMN source_engine VARCHAR(50) NULL,
    ADD COLUMN correlation_group_id VARCHAR(36) NULL,
    ADD KEY idx_findings_rule_id (rule_id),
    ADD KEY idx_findings_correlation_group (correlation_group_id);

CREATE TABLE scan_components (
    id CHAR(36) NOT NULL DEFAULT (UUID()),
    scan_id CHAR(36) NOT NULL,
    component_kind VARCHAR(20) NOT NULL,
    component_type VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(255) NULL,
    purl VARCHAR(1024) NULL,
    source_file VARCHAR(1024) NULL,
    line_number INT NULL,
    detection_method VARCHAR(100) NOT NULL,
    confidence FLOAT NULL,
    metadata_json JSON NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_scan_components_scan_kind (scan_id, component_kind),
    KEY idx_scan_components_name_version (name, version),
    CONSTRAINT fk_scan_components_scan
        FOREIGN KEY (scan_id) REFERENCES scans (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_scan_components_kind
        CHECK (component_kind IN ('dependency', 'crypto'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
