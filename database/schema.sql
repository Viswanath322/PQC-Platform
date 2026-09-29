-- =============================================================================
-- PQC Security Assessment Platform - Core Database Schema (Day 1)
-- Author: Vamsi (Database Engineer)
-- Target: MySQL 8.0+
-- Database: pqc_security
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `pqc_security`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `pqc_security`;

-- Disable foreign key checks while creating tables
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Table: organizations
-- Description: Multi-tenant / enterprise organization container
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `organizations`;
CREATE TABLE `organizations` (
    `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
    `name` VARCHAR(255) NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Table: users
-- Description: Platform users with roles and organization association
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
    `organization_id` VARCHAR(36) NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'user',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `projects`;
CREATE TABLE `projects` (
    `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
    `organization_id` VARCHAR(36) NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
-- Standard Status: QUEUED, INGESTING, ANALYZING, PROCESSING, AI_ANALYSIS,
--                  COMPLETED, FAILED, CANCELLED
-- Note: repository_path stores local filesystem path only; NEVER store ZIP binaries in DB!
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `scans`;
CREATE TABLE `scans` (
    `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
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
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `started_at` DATETIME NULL DEFAULT NULL,
    `completed_at` DATETIME NULL DEFAULT NULL,
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
    `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
    `scan_id` VARCHAR(36) NOT NULL,
    `file_path` VARCHAR(1024) NOT NULL,
    `file_type` VARCHAR(100) NULL,
    `language` VARCHAR(100) NULL,
    `size_bytes` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
-- Engines: sast, crypto, dependency, configuration
-- Severities: critical, high, medium, low
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `findings`;
CREATE TABLE `findings` (
    `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
    `scan_id` VARCHAR(36) NOT NULL,
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
    `confidence` VARCHAR(50) NULL,
    `recommendation` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_findings_scan_id` (`scan_id`),
    KEY `idx_findings_severity` (`severity`),
    KEY `idx_findings_engine` (`engine`),
    KEY `idx_findings_scan_severity` (`scan_id`, `severity`),
    KEY `idx_findings_scan_engine` (`scan_id`, `engine`),
    CONSTRAINT `fk_findings_scan`
        FOREIGN KEY (`scan_id`) REFERENCES `scans` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
