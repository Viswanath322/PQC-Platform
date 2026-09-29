-- =============================================================================
-- PQC Security Assessment Platform - Day 1 Development Seed Data
-- Database: pqc_security
-- =============================================================================

USE `pqc_security`;

-- 1. Default Organizations (supporting both 'org-default-001' and '1')
INSERT INTO `organizations` (`id`, `name`, `created_at`, `updated_at`)
VALUES 
    ('org-default-001', 'Default Organization', NOW(), NOW()),
    ('1', 'Default Organization', NOW(), NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. Development Admin User
INSERT INTO `users` (`id`, `organization_id`, `email`, `password_hash`, `role`, `created_at`, `updated_at`)
VALUES (
    'usr-admin-00000000-0000-0000-000000000001',
    'org-default-001',
    'admin@pqc.local',
    '$2b$12$e80yq5p5L6iSgGg06xWj3OP0pUcmGv0.7hE5e3rB6eB8uY1vW.oO2',
    'admin',
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

-- 3. Demo Banking Application Project (UUID primary key)
INSERT INTO `projects` (`id`, `organization_id`, `name`, `description`, `created_at`, `updated_at`)
VALUES (
    'prj-demo-banking-0000-0000-000000000001',
    'org-default-001',
    'Demo Banking Application',
    'Sample legacy banking app repository for Day 1 security & PQC assessment testing',
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 4. Initial Scan with Status QUEUED
INSERT INTO `scans` (`id`, `project_id`, `status`, `repository_path`, `created_at`, `started_at`, `completed_at`)
VALUES (
    'a8098c1a-f86e-11da-bd1a-00112444be1e',
    'prj-demo-banking-0000-0000-000000000001',
    'QUEUED',
    'uploads/demo-banking.zip',
    NOW(),
    NULL,
    NULL
) ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- 5. Mock Findings
INSERT INTO `findings` (
    `id`,
    `scan_id`,
    `engine`,
    `category`,
    `severity`,
    `title`,
    `file_path`,
    `line_number`,
    `evidence`,
    `confidence`,
    `recommendation`,
    `created_at`
) VALUES (
    'fnd-demo-00000000-0000-0000-0000-000000000001',
    'a8098c1a-f86e-11da-bd1a-00112444be1e',
    'crypto',
    'Weak Cryptography',
    'high',
    'Vulnerable RSA-1024 Key Size Detected',
    'src/crypto/key_generator.py',
    42,
    'RSA.generate(1024)',
    'high',
    'Upgrade to post-quantum hybrid algorithm (ML-KEM/Kyber) or minimum RSA-3072.',
    NOW()
),
(
    'fnd-demo-00000000-0000-0000-0000-000000000002',
    'a8098c1a-f86e-11da-bd1a-00112444be1e',
    'sast',
    'SQL Injection',
    'critical',
    'Potential SQL Injection in User Lookup',
    'src/auth/service.py',
    108,
    'cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")',
    'high',
    'Use parameterized queries with SQLAlchemy prepared statements.',
    NOW()
) ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);
