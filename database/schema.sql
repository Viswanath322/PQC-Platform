-- =============================================================================
-- PQC Security Assessment Platform - Core Database Schema (Day 1)
-- Author: Vamsi (Database Engineer)
-- Target: MySQL 8.0+
-- Database: pqc
--
-- Unified Identifier Standard:
--   - All entities use UUID strings (CHAR(36) / VARCHAR(36)) with DEFAULT (UUID())
--   - Compatible with air-gapped distributed clients and local desktop agents
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `pqc`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `pqc_security`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `pqc`;

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
    `correlation_group_id` VARCHAR(36) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    KEY `idx_findings_scan_id` (`scan_id`),
    KEY `idx_findings_severity` (`severity`),
    KEY `idx_findings_engine` (`engine`),
    KEY `idx_findings_scan_severity` (`scan_id`, `severity`),
    KEY `idx_findings_scan_engine` (`scan_id`, `engine`),
    KEY `idx_findings_rule_id` (`rule_id`),
    KEY `idx_findings_correlation_group` (`correlation_group_id`),
    CONSTRAINT `fk_findings_scan`
        FOREIGN KEY (`scan_id`) REFERENCES `scans` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Table: scan_components (Day 3 SBOM / CBOM inventory)
-- -----------------------------------------------------------------------------
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
    CONSTRAINT `chk_scan_components_kind` CHECK (`component_kind` IN ('dependency', 'crypto'))
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

