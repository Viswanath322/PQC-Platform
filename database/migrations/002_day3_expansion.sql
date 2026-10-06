-- =============================================================================
-- Migration 002: Day 3 Multi-Engine Analysis & CBOM/SBOM Expansion
-- Platform: PQC Security Assessment Platform
-- Author: Vamsi & Viswanath (Database Engineering)
-- Target: MySQL 8.0+
-- =============================================================================

-- Disable foreign key checks while applying migrations
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Extend `findings` table with rule metadata and correlation tracking
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `ApplyDay3FindingsMigration`;
DELIMITER $$
CREATE PROCEDURE `ApplyDay3FindingsMigration`()
BEGIN
    -- 1a. rule_id (stable identifier of rule)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'findings' AND COLUMN_NAME = 'rule_id'
    ) THEN
        ALTER TABLE `findings` ADD COLUMN `rule_id` VARCHAR(100) NULL AFTER `is_development`;
    END IF;

    -- 1b. rule_version (rule set version string for reproducible runs)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'findings' AND COLUMN_NAME = 'rule_version'
    ) THEN
        ALTER TABLE `findings` ADD COLUMN `rule_version` VARCHAR(50) NULL AFTER `rule_id`;
    END IF;

    -- 1c. group_key (deduplication & correlation key)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'findings' AND COLUMN_NAME = 'group_key'
    ) THEN
        ALTER TABLE `findings` ADD COLUMN `group_key` VARCHAR(255) NULL AFTER `rule_version`;
    END IF;

    -- 1d. correlation_id (alias/reference for grouped findings)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'findings' AND COLUMN_NAME = 'correlation_id'
    ) THEN
        ALTER TABLE `findings` ADD COLUMN `correlation_id` VARCHAR(255) NULL AFTER `group_key`;
    END IF;

    -- 1e. Indexes on findings
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'findings' AND INDEX_NAME = 'idx_findings_rule'
    ) THEN
        ALTER TABLE `findings` ADD KEY `idx_findings_rule` (`scan_id`, `rule_id`);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'findings' AND INDEX_NAME = 'idx_findings_group_key'
    ) THEN
        ALTER TABLE `findings` ADD KEY `idx_findings_group_key` (`scan_id`, `group_key`);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'findings' AND INDEX_NAME = 'idx_findings_scan_engine_severity'
    ) THEN
        ALTER TABLE `findings` ADD KEY `idx_findings_scan_engine_severity` (`scan_id`, `engine`, `severity`);
    END IF;
END $$
DELIMITER ;

CALL `ApplyDay3FindingsMigration`();
DROP PROCEDURE `ApplyDay3FindingsMigration`;

-- -----------------------------------------------------------------------------
-- 2. Table: sbom_components (Task 57: Dependency/SBOM component storage)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sbom_components` (
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
-- 3. Table: cbom_components (Task 58: Crypto/CBOM component storage)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cbom_components` (
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
-- 4. Table: finding_correlations (Task 36 & 56: Grouped and related findings)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `finding_correlations` (
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

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
