-- =============================================================================
-- Migration 001: Day 1 Baseline Core Schema
-- Platform: PQC Security Assessment Platform
-- Engines: MySQL 8.0+
-- =============================================================================

CREATE TABLE IF NOT EXISTS `organizations` (
    `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
    `name` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
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

CREATE TABLE IF NOT EXISTS `projects` (
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

CREATE TABLE IF NOT EXISTS `scans` (
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

CREATE TABLE IF NOT EXISTS `scan_files` (
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

CREATE TABLE IF NOT EXISTS `findings` (
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
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    KEY `idx_findings_scan_id` (`scan_id`),
    KEY `idx_findings_severity` (`severity`),
    KEY `idx_findings_engine` (`engine`),
    KEY `idx_findings_category` (`category`),
    KEY `idx_findings_scan_severity` (`scan_id`, `severity`),
    KEY `idx_findings_scan_engine` (`scan_id`, `engine`),
    CONSTRAINT `fk_findings_scan`
        FOREIGN KEY (`scan_id`) REFERENCES `scans` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
