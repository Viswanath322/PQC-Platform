-- =============================================================================
-- PQC Security Assessment Platform - Core Database Schema (PostgreSQL 13+)
-- Target: PostgreSQL (Local / pgAdmin)
-- Database: pqc_security
--
-- Unified Identifier Standard:
--   - All entities use UUID strings (VARCHAR(36))
--   - Compatible with air-gapped distributed clients and local desktop agents
-- =============================================================================

-- 1. Create Enum Types (if not already existing)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scan_status_enum') THEN
        CREATE TYPE scan_status_enum AS ENUM (
            'QUEUED',
            'INGESTING',
            'ANALYZING',
            'PROCESSING',
            'AI_ANALYSIS',
            'COMPLETED',
            'FAILED',
            'CANCELLED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'finding_engine_enum') THEN
        CREATE TYPE finding_engine_enum AS ENUM (
            'sast',
            'crypto',
            'dependency',
            'configuration'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'finding_severity_enum') THEN
        CREATE TYPE finding_severity_enum AS ENUM (
            'critical',
            'high',
            'medium',
            'low'
        );
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. Table: organizations
-- Description: Multi-tenant / enterprise organization container
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 2. Table: users
-- Description: Platform users with roles and organization association
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id VARCHAR(36) NULL REFERENCES organizations(id) ON DELETE SET NULL ON UPDATE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);

-- -----------------------------------------------------------------------------
-- 3. Table: projects
-- Description: Projects containing uploaded code repositories to be scanned
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id VARCHAR(36) NULL DEFAULT 'org-default-001' REFERENCES organizations(id) ON DELETE SET NULL ON UPDATE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);

-- -----------------------------------------------------------------------------
-- 4. Table: scans
-- Description: Security scan jobs initiated for a project
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scans (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE ON UPDATE CASCADE,
    status scan_status_enum NOT NULL DEFAULT 'QUEUED',
    repository_path VARCHAR(1024) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITHOUT TIME ZONE NULL,
    completed_at TIMESTAMP WITHOUT TIME ZONE NULL
);
CREATE INDEX IF NOT EXISTS idx_scans_project_id ON scans(project_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_project_status ON scans(project_id, status);

-- -----------------------------------------------------------------------------
-- 5. Table: scan_files
-- Description: Extracted repository files indexed during scan ingestion
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scan_files (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    scan_id VARCHAR(36) NOT NULL REFERENCES scans(id) ON DELETE CASCADE ON UPDATE CASCADE,
    file_path VARCHAR(1024) NOT NULL,
    file_type VARCHAR(100) NULL,
    language VARCHAR(100) NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_scan_files_scan_id ON scan_files(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_files_language ON scan_files(language);
CREATE INDEX IF NOT EXISTS idx_scan_files_file_type ON scan_files(file_type);

-- -----------------------------------------------------------------------------
-- 6. Table: findings
-- Description: Security and Cryptographic findings produced by analysis engines
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS findings (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    scan_id VARCHAR(36) NOT NULL REFERENCES scans(id) ON DELETE CASCADE ON UPDATE CASCADE,
    engine finding_engine_enum NOT NULL,
    category VARCHAR(100) NULL,
    severity finding_severity_enum NOT NULL,
    title VARCHAR(255) NOT NULL,
    file_path VARCHAR(1024) NOT NULL,
    line_number INT NULL,
    evidence TEXT NULL,
    explanation TEXT NULL,
    confidence DOUBLE PRECISION NULL,
    recommendation TEXT NULL,
    is_development BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_findings_scan_id ON findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings(severity);
CREATE INDEX IF NOT EXISTS idx_findings_engine ON findings(engine);
CREATE INDEX IF NOT EXISTS idx_findings_scan_severity ON findings(scan_id, severity);
CREATE INDEX IF NOT EXISTS idx_findings_scan_engine ON findings(scan_id, engine);

-- -----------------------------------------------------------------------------
-- Default Seed: Organization (Standardized on 'org-default-001')
-- -----------------------------------------------------------------------------
INSERT INTO organizations (id, name, created_at, updated_at)
VALUES 
    ('org-default-001', 'Default Organization', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
