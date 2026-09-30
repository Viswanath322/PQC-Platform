-- Add the nullable explanation field required by the Findings API contract.
-- Apply once to an existing pqc_security database before deploying the updated
-- backend/app/services/finding_service.py queries.
ALTER TABLE `findings`
    ADD COLUMN `explanation` TEXT NULL AFTER `evidence`;
