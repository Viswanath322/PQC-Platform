-- =============================================================================
-- Migration 003: Day 3 Scan Lifecycle & Engine Telemetry
-- Author: Muni Sankar (Day 3 Backend Scan Lifecycle Integration)
-- Description: Adds engine_statuses, attempt_count, and max_retries to scans
-- =============================================================================

ALTER TABLE `scans`
    ADD COLUMN IF NOT EXISTS `engine_statuses` TEXT NULL AFTER `completed_at`,
    ADD COLUMN IF NOT EXISTS `attempt_count` INT NOT NULL DEFAULT 1 AFTER `engine_statuses`,
    ADD COLUMN IF NOT EXISTS `max_retries` INT NOT NULL DEFAULT 3 AFTER `attempt_count`;
