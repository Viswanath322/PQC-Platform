-- =============================================================================
-- Migration 003: Day 4 Full Platform Integration & Multi-Engine Contract Alignment
-- Platform: PQC Security Assessment Platform
-- Author: Vamsi (Database Engineer - Person 10)
-- Target: MySQL 8.0+
-- =============================================================================

-- Disable foreign key checks while applying migrations
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Extend `scans` table with engine_statuses JSON column
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `ApplyDay4ScansMigration`;
DELIMITER $$
CREATE PROCEDURE `ApplyDay4ScansMigration`()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'scans' AND COLUMN_NAME = 'engine_statuses'
    ) THEN
        ALTER TABLE `scans` ADD COLUMN `engine_statuses` JSON NULL AFTER `error_message`;
    END IF;

    -- Ensure idx_scans_project_status exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'scans' AND INDEX_NAME = 'idx_scans_project_status'
    ) THEN
        ALTER TABLE `scans` ADD KEY `idx_scans_project_status` (`project_id`, `status`);
    END IF;
END $$
DELIMITER ;

CALL `ApplyDay4ScansMigration`();
DROP PROCEDURE `ApplyDay4ScansMigration`;

-- -----------------------------------------------------------------------------
-- 2. Extend `findings` table with source_engine and correlation_group_id
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `ApplyDay4FindingsMigration`;
DELIMITER $$
CREATE PROCEDURE `ApplyDay4FindingsMigration`()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'findings' AND COLUMN_NAME = 'source_engine'
    ) THEN
        ALTER TABLE `findings` ADD COLUMN `source_engine` VARCHAR(50) NULL AFTER `rule_version`;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'findings' AND COLUMN_NAME = 'correlation_group_id'
    ) THEN
        ALTER TABLE `findings` ADD COLUMN `correlation_group_id` VARCHAR(36) NULL AFTER `correlation_id`;
    END IF;

    -- Add query indexes for scan, engine, severity, and category queries
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'findings' AND INDEX_NAME = 'idx_findings_rule_id'
    ) THEN
        ALTER TABLE `findings` ADD KEY `idx_findings_rule_id` (`rule_id`);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'findings' AND INDEX_NAME = 'idx_findings_correlation_group'
    ) THEN
        ALTER TABLE `findings` ADD KEY `idx_findings_correlation_group` (`correlation_group_id`);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'findings' AND INDEX_NAME = 'idx_findings_scan_severity'
    ) THEN
        ALTER TABLE `findings` ADD KEY `idx_findings_scan_severity` (`scan_id`, `severity`);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'findings' AND INDEX_NAME = 'idx_findings_scan_engine'
    ) THEN
        ALTER TABLE `findings` ADD KEY `idx_findings_scan_engine` (`scan_id`, `engine`);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'findings' AND INDEX_NAME = 'idx_findings_scan_category'
    ) THEN
        ALTER TABLE `findings` ADD KEY `idx_findings_scan_category` (`scan_id`, `category`);
    END IF;
END $$
DELIMITER ;

CALL `ApplyDay4FindingsMigration`();
DROP PROCEDURE `ApplyDay4FindingsMigration`;

-- -----------------------------------------------------------------------------
-- 3. Table: scan_components (Unified API & Frontend Inventory Storage)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `scan_components` (
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

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
