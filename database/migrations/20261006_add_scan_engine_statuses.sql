-- Persist per-engine lifecycle so scan polling can report truthful progress.
ALTER TABLE `scans`
    ADD COLUMN `engine_statuses` JSON NULL AFTER `error_message`;

UPDATE `scans`
SET `engine_statuses` = JSON_OBJECT()
WHERE `engine_statuses` IS NULL;
