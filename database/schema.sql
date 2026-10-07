-- =============================================================================
-- PQC Security Assessment Platform - Core Database Schema (Day 4 Integration)
-- Author: Vamsi (Database Engineer - Person 10)
-- Target: MySQL 8.0+
-- Database: pqc_security (with pqc compatibility)
--
-- Unified Identifier Standard:
--   - All entities use UUID strings (CHAR(36) / VARCHAR(36)) with DEFAULT (UUID())
--   - Compatible with air-gapped distributed clients, API services, and desktop agent
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `pqc_security`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `pqc`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `pqc_security`;

-- Disable foreign key checks while creating/recreating tables
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Table: organizations
-- Description: Multi-tenant / enterprise organization container
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `organizations`;
CREATE TABLE `organizations` (
    `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
    `name` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Table: users
-- Description: Platform users with roles and organization association
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `organization_id` VARCHAR(36) NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'user',
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_users_email` (`email`),
    KEY `idx_users_organization_id` (`organization_id`),
    CONSTRAINT `fk_users_organization`
        FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Table: projects
-- Description: Projects containing uploaded code repositories to be scanned
-- Standard: UUID primary key with default organization association
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `projects`;
CREATE TABLE `projects` (
    `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
    `organization_id` VARCHAR(36) NULL DEFAULT 'org-default-001',
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    KEY `idx_projects_organization_id` (`organization_id`),
    KEY `idx_projects_name` (`name`),
    CONSTRAINT `fk_projects_organization`
        FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Table: scans
-- Description: Security scan jobs initiated for a project
-- Requirements: scans.id = CHAR(36) UUID, project_id = VARCHAR(36) UUID
-- Note: repository_path stores local filesystem path only; NEVER store ZIP binaries in DB!
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `scans`;
CREATE TABLE `scans` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `project_id` VARCHAR(36) NOT NULL,
    `status` ENUM(
        'QUEUED',
        'INGESTING',
        'ANALYZING',
        'PROCESSING',
        'AI_ANALYSIS',
        'COMPLETED',
        'FAILED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'QUEUED',
    `repository_path` VARCHAR(1024) NOT NULL,
    `error_message` TEXT NULL,
    `engine_statuses` JSON NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `started_at` DATETIME(6) NULL DEFAULT NULL,
    `completed_at` DATETIME(6) NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_scans_project_id` (`project_id`),
    KEY `idx_scans_status` (`status`),
    KEY `idx_scans_created_at` (`created_at` DESC),
    KEY `idx_scans_project_status` (`project_id`, `status`),
    CONSTRAINT `fk_scans_project`
        FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Table: scan_files
-- Description: Extracted repository files indexed during scan ingestion
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `scan_files`;
CREATE TABLE `scan_files` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `scan_id` CHAR(36) NOT NULL,
    `file_path` VARCHAR(1024) NOT NULL,
    `file_type` VARCHAR(100) NULL,
    `language` VARCHAR(100) NULL,
    `size_bytes` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    KEY `idx_scan_files_scan_id` (`scan_id`),
    KEY `idx_scan_files_language` (`language`),
    KEY `idx_scan_files_file_type` (`file_type`),
    CONSTRAINT `fk_scan_files_scan`
        FOREIGN KEY (`scan_id`) REFERENCES `scans` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Table: findings
-- Description: Security and Cryptographic findings produced by analysis engines
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `findings`;
CREATE TABLE `findings` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `scan_id` CHAR(36) NOT NULL,
    `engine` ENUM(
        'sast',
        'crypto',
        'dependency',
        'configuration'
    ) NOT NULL,
    `category` VARCHAR(100) NULL,
    `severity` ENUM(
        'critical',
        'high',
        'medium',
        'low'
    ) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(1024) NOT NULL,
    `line_number` INT NULL,
    `evidence` TEXT NULL,
    `explanation` TEXT NULL,
    `confidence` FLOAT NULL,
    `recommendation` TEXT NULL,
    `is_development` BOOLEAN NOT NULL DEFAULT FALSE,
    `rule_id` VARCHAR(100) NULL,
    `rule_version` VARCHAR(50) NULL,
    `source_engine` VARCHAR(50) NULL,
    `group_key` VARCHAR(255) NULL,
    `correlation_id` VARCHAR(255) NULL,
    `correlation_group_id` VARCHAR(36) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    KEY `idx_findings_scan_id` (`scan_id`),
    KEY `idx_findings_severity` (`severity`),
    KEY `idx_findings_engine` (`engine`),
    KEY `idx_findings_category` (`category`),
    KEY `idx_findings_rule_id` (`rule_id`),
    KEY `idx_findings_correlation_group` (`correlation_group_id`),
    KEY `idx_findings_rule` (`scan_id`, `rule_id`),
    KEY `idx_findings_group_key` (`scan_id`, `group_key`),
    KEY `idx_findings_scan_severity` (`scan_id`, `severity`),
    KEY `idx_findings_scan_engine` (`scan_id`, `engine`),
    KEY `idx_findings_scan_category` (`scan_id`, `category`),
    KEY `idx_findings_scan_engine_severity` (`scan_id`, `engine`, `severity`),
    CONSTRAINT `fk_findings_scan`
        FOREIGN KEY (`scan_id`) REFERENCES `scans` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Table: sbom_components
-- Description: Software Bill of Materials (dependency components) per scan
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `sbom_components`;
CREATE TABLE `sbom_components` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `scan_id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `version` VARCHAR(100) NULL,
    `package_type` VARCHAR(50) NOT NULL DEFAULT 'pypi',
    `source_file` VARCHAR(1024) NOT NULL,
    `line_number` INT NULL,
    `license` VARCHAR(100) NULL,
    `is_direct` BOOLEAN NOT NULL DEFAULT TRUE,
    `detection_method` VARCHAR(100) NOT NULL DEFAULT 'manifest_parser',
    `confidence` FLOAT NOT NULL DEFAULT 1.0,
    `is_development` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    KEY `idx_sbom_scan_id` (`scan_id`),
    KEY `idx_sbom_name` (`name`),
    KEY `idx_sbom_scan_name` (`scan_id`, `name`),
    KEY `idx_sbom_source_file` (`scan_id`, `source_file`(255)),
    CONSTRAINT `fk_sbom_scan`
        FOREIGN KEY (`scan_id`) REFERENCES `scans` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Table: cbom_components
-- Description: Cryptographic Bill of Materials (crypto components) per scan
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `cbom_components`;
CREATE TABLE `cbom_components` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `scan_id` CHAR(36) NOT NULL,
    `algorithm` VARCHAR(100) NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `library` VARCHAR(100) NULL,
    `version` VARCHAR(50) NULL,
    `file_path` VARCHAR(1024) NOT NULL,
    `line_number` INT NULL,
    `usage_context` TEXT NULL,
    `detection_method` VARCHAR(100) NOT NULL DEFAULT 'engine',
    `confidence` FLOAT NOT NULL DEFAULT 1.0,
    `quantum_risk` ENUM(
        'quantum_vulnerable',
        'weakened',
        'safe',
        'deprecated',
        'unknown'
    ) NOT NULL DEFAULT 'unknown',
    `nist_migration_target` VARCHAR(255) NULL,
    `pqc_mapping_version` VARCHAR(50) NOT NULL DEFAULT '1.0',
    `pqc_mapping_source` VARCHAR(100) NOT NULL DEFAULT 'NIST FIPS 203/204/205',
    `rule_id` VARCHAR(100) NULL,
    `rule_version` VARCHAR(50) NULL,
    `is_development` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    KEY `idx_cbom_scan_id` (`scan_id`),
    KEY `idx_cbom_algorithm` (`algorithm`),
    KEY `idx_cbom_quantum_risk` (`quantum_risk`),
    KEY `idx_cbom_scan_risk` (`scan_id`, `quantum_risk`),
    KEY `idx_cbom_scan_algo` (`scan_id`, `algorithm`),
    KEY `idx_cbom_scan_file` (`scan_id`, `file_path`(255)),
    CONSTRAINT `fk_cbom_scan`
        FOREIGN KEY (`scan_id`) REFERENCES `scans` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. Table: finding_correlations
-- Description: Explicit relationships between grouped/related findings
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `finding_correlations`;
CREATE TABLE `finding_correlations` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `scan_id` CHAR(36) NOT NULL,
    `group_key` VARCHAR(255) NOT NULL,
    `primary_finding_id` CHAR(36) NOT NULL,
    `related_finding_id` CHAR(36) NOT NULL,
    `correlation_type` VARCHAR(50) NOT NULL DEFAULT 'duplicate_or_variant',
    `explanation` TEXT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    KEY `idx_correlation_scan` (`scan_id`),
    KEY `idx_correlation_group` (`scan_id`, `group_key`),
    KEY `idx_correlation_primary` (`primary_finding_id`),
    KEY `idx_correlation_related` (`related_finding_id`),
    CONSTRAINT `fk_correlation_scan`
        FOREIGN KEY (`scan_id`) REFERENCES `scans` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_correlation_primary`
        FOREIGN KEY (`primary_finding_id`) REFERENCES `findings` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_correlation_related`
        FOREIGN KEY (`related_finding_id`) REFERENCES `findings` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. Table: scan_components (Unified API & Frontend Inventory Storage)
-- Description: Persisted dependency SBOM and cryptographic CBOM components for a scan
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `scan_components`;
CREATE TABLE `scan_components` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `scan_id` CHAR(36) NOT NULL,
    `component_kind` VARCHAR(20) NOT NULL,
    `component_type` VARCHAR(100) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `version` VARCHAR(255) NULL,
    `purl` VARCHAR(1024) NULL,
    `source_file` VARCHAR(1024) NULL,
    `line_number` INT NULL,
    `detection_method` VARCHAR(100) NOT NULL,
    `confidence` FLOAT NULL,
    `metadata_json` JSON NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    KEY `idx_scan_components_scan_kind` (`scan_id`, `component_kind`),
    KEY `idx_scan_components_name_version` (`name`, `version`),
    CONSTRAINT `fk_scan_components_scan`
        FOREIGN KEY (`scan_id`) REFERENCES `scans` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `chk_scan_components_kind`
        CHECK (`component_kind` IN ('dependency', 'crypto'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Default Seed: Organization (Single unified UUID-compatible standard)
-- -----------------------------------------------------------------------------
INSERT INTO `organizations` (`id`, `name`, `created_at`, `updated_at`)
VALUES
    ('org-default-001', 'Default Organization', NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
