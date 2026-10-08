-- =============================================================================
-- PQC Security Assessment Platform - Day 4 Development Seed Data
-- Database: pqc_security
-- =============================================================================

USE `pqc_security`;

-- 1. Default Organization (Standardized on 'org-default-001')
INSERT INTO `organizations` (`id`, `name`, `created_at`, `updated_at`)
VALUES 
    ('org-default-001', 'Default Organization', NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. Development Admin User (Standard 36-char UUID; .example domain for QA and EmailStr compatibility)
-- Password hash is Argon2id (valid hash for dev admin password 'change_me_locally')
INSERT INTO `users` (`id`, `organization_id`, `email`, `password_hash`, `role`, `created_at`, `updated_at`)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'org-default-001',
    'admin@pqc.example',
    '$argon2id$v=19$m=65536,t=3,p=4$2l5/H8oE+Vn/Z6D9gP7kcA$4Q8x8k4y7l2p3m9n5o1q8r7s6t5u4v3w2x1y0z9a8b7',
    'admin',
    NOW(6),
    NOW(6)
) ON DUPLICATE KEY UPDATE `email` = VALUES(`email`), `password_hash` = VALUES(`password_hash`);

-- 3. Demo Banking Application Project (Standard 36-char UUID)
INSERT INTO `projects` (`id`, `organization_id`, `name`, `description`, `created_at`, `updated_at`)
VALUES (
    '00000000-0000-0000-0001-000000000001',
    'org-default-001',
    'Demo Banking Application',
    'Sample legacy banking app repository for security & PQC assessment testing',
    NOW(6),
    NOW(6)
) ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 4. Initial Scan with Status COMPLETED (Standard 36-char UUID; completed scan for preloaded demo findings)
INSERT INTO `scans` (`id`, `project_id`, `status`, `repository_path`, `error_message`, `engine_statuses`, `created_at`, `started_at`, `completed_at`)
VALUES (
    'a8098c1a-f86e-11da-bd1a-00112444be1e',
    '00000000-0000-0000-0001-000000000001',
    'COMPLETED',
    'uploads/demo-banking.zip',
    NULL,
    '{"sast": "COMPLETED", "crypto": "COMPLETED", "dependency": "COMPLETED", "configuration": "COMPLETED"}',
    NOW(6),
    NOW(6),
    NOW(6)
) ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `started_at` = VALUES(`started_at`), `completed_at` = VALUES(`completed_at`), `engine_statuses` = VALUES(`engine_statuses`);

-- 4b. Seed Scan with Status QUEUED (Standard 36-char UUID; required for worker queue tests)
INSERT INTO `scans` (`id`, `project_id`, `status`, `repository_path`, `error_message`, `engine_statuses`, `created_at`, `started_at`, `completed_at`)
VALUES (
    'b91a9d2b-f86e-11da-bd1a-00112444be1f',
    '00000000-0000-0000-0001-000000000001',
    'QUEUED',
    'uploads/demo-banking-queued.zip',
    NULL,
    '{}',
    NOW(6),
    NULL,
    NULL
) ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `engine_statuses` = VALUES(`engine_statuses`);

-- 5. Mock Findings (Standard 36-char UUIDs; includes Day 3/4 rule_id, rule_version, source_engine, group_key)
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
    `explanation`,
    `confidence`,
    `recommendation`,
    `is_development`,
    `rule_id`,
    `rule_version`,
    `source_engine`,
    `group_key`,
    `correlation_id`,
    `correlation_group_id`,
    `created_at`
) VALUES (
    '00000000-0000-0000-0002-000000000001',
    'a8098c1a-f86e-11da-bd1a-00112444be1e',
    'crypto',
    'Weak Cryptography',
    'high',
    'Vulnerable RSA-1024 Key Size Detected',
    'src/crypto/key_generator.py',
    42,
    'RSA.generate(1024)',
    'RSA with 1024-bit modulus is cryptographically broken and vulnerable to factorization attacks.',
    0.95,
    'Upgrade to post-quantum hybrid algorithm (ML-KEM/Kyber) or minimum RSA-3072.',
    TRUE,
    'CRYPTO-RSA-001',
    '1.0',
    'crypto',
    'CRYPTO-RSA-001:src/crypto/key_generator.py',
    'corr-001',
    '00000000-0000-0000-0005-000000000001',
    NOW(6)
),
(
    '00000000-0000-0000-0002-000000000002',
    'a8098c1a-f86e-11da-bd1a-00112444be1e',
    'sast',
    'SQL Injection',
    'critical',
    'Potential SQL Injection in User Lookup',
    'src/auth/service.py',
    108,
    'cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")',
    'Directly interpolating user input into a SQL query allows attackers to execute arbitrary SQL commands.',
    0.85,
    'Use parameterized queries with SQLAlchemy prepared statements.',
    TRUE,
    'SAST-SQLI-001',
    '1.0',
    'sast',
    'SAST-SQLI-001:src/auth/service.py',
    NULL,
    NULL,
    NOW(6)
) ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- 6. Seed SBOM Components (Day 3/4: Dependency component records)
INSERT INTO `sbom_components` (
    `id`,
    `scan_id`,
    `name`,
    `version`,
    `package_type`,
    `source_file`,
    `line_number`,
    `license`,
    `is_direct`,
    `detection_method`,
    `confidence`,
    `is_development`,
    `created_at`
) VALUES (
    '00000000-0000-0000-0003-000000000001',
    'a8098c1a-f86e-11da-bd1a-00112444be1e',
    'pycryptodome',
    '3.9.0',
    'pypi',
    'requirements.txt',
    4,
    'BSD-2-Clause',
    TRUE,
    'manifest_parser',
    1.0,
    TRUE,
    NOW(6)
),
(
    '00000000-0000-0000-0003-000000000002',
    'a8098c1a-f86e-11da-bd1a-00112444be1e',
    'flask',
    '0.12.2',
    'pypi',
    'requirements.txt',
    1,
    'BSD-3-Clause',
    TRUE,
    'manifest_parser',
    1.0,
    TRUE,
    NOW(6)
) ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 7. Seed CBOM Components (Day 3/4: Cryptographic component records)
INSERT INTO `cbom_components` (
    `id`,
    `scan_id`,
    `algorithm`,
    `category`,
    `library`,
    `version`,
    `file_path`,
    `line_number`,
    `usage_context`,
    `detection_method`,
    `confidence`,
    `quantum_risk`,
    `nist_migration_target`,
    `pqc_mapping_version`,
    `pqc_mapping_source`,
    `rule_id`,
    `rule_version`,
    `is_development`,
    `created_at`
) VALUES (
    '00000000-0000-0000-0004-000000000001',
    'a8098c1a-f86e-11da-bd1a-00112444be1e',
    'RSA',
    'asymmetric',
    'pycryptodome',
    '3.9.0',
    'src/crypto/key_generator.py',
    42,
    'Key generation and digital signatures',
    'regex:api-call',
    0.95,
    'quantum_vulnerable',
    'ML-KEM (FIPS 203) / ML-DSA (FIPS 204)',
    '1.0',
    'NIST FIPS 203/204/205',
    'CRYPTO-RSA-001',
    '1.0',
    TRUE,
    NOW(6)
),
(
    '00000000-0000-0000-0004-000000000002',
    'a8098c1a-f86e-11da-bd1a-00112444be1e',
    'AES-256',
    'symmetric',
    'cryptography',
    NULL,
    'src/crypto/cipher.py',
    18,
    'Bulk data payload encryption',
    'regex:api-call',
    0.90,
    'safe',
    'None (Quantum resistant at 256 bits)',
    '1.0',
    'NIST FIPS 203/204/205',
    'CRYPTO-AES-001',
    '1.0',
    TRUE,
    NOW(6)
) ON DUPLICATE KEY UPDATE `algorithm` = VALUES(`algorithm`);

-- 8. Seed Unified scan_components (Day 4: API and reports component inventory)
INSERT INTO `scan_components` (
    `id`,
    `scan_id`,
    `component_kind`,
    `component_type`,
    `name`,
    `version`,
    `purl`,
    `source_file`,
    `line_number`,
    `detection_method`,
    `confidence`,
    `metadata_json`,
    `created_at`
) VALUES (
    '00000000-0000-0000-0005-000000000001',
    'a8098c1a-f86e-11da-bd1a-00112444be1e',
    'dependency',
    'pypi',
    'pycryptodome',
    '3.9.0',
    'pkg:pypi/pycryptodome@3.9.0',
    'requirements.txt',
    4,
    'manifest_parser',
    1.0,
    '{"license": "BSD-2-Clause", "is_direct": true}',
    NOW(6)
),
(
    '00000000-0000-0000-0005-000000000002',
    'a8098c1a-f86e-11da-bd1a-00112444be1e',
    'crypto',
    'asymmetric',
    'RSA',
    '3.9.0',
    NULL,
    'src/crypto/key_generator.py',
    42,
    'regex:api-call',
    0.95,
    '{"quantum_risk": "quantum_vulnerable", "target": "ML-KEM (FIPS 203)"}',
    NOW(6)
) ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
