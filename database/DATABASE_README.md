# PQC Security Assessment Platform — Database Manual & Setup Guide

**Owner:** Vamsi (Database Engineer)
**Target Engine:** Local MySQL 8.0+
**Default Port:** `3306`
**Target Database:** `pqc`
**Branch:** `vamsi`
**Architecture:** Desktop / Air-Gapped Local Deployment (Zero Cloud Dependencies)

---

![PQC Database Schema Diagram](schema_diagram.jpg)

## Table of Contents
1. [Required vs. Not Required Quick Reference](#1-required-vs-not-required-quick-reference)
2. [Local MySQL Server Setup (Windows)](#2-local-mysql-server-setup-windows)
3. [Step-by-Step Initialization Guide](#3-step-by-step-initialization-guide)
4. [Complete Schema Code (schema.sql) & Table Specifications](#4-complete-schema-code-schemasql--table-specifications)
5. [Complete Seed Data Code (seed.sql) & Dev Credentials](#5-complete-seed-data-code-seedsql--dev-credentials)
6. [SQLAlchemy ORM Mapping (models.py)](#6-sqlalchemy-orm-mapping-modelspy)
7. [Verification & Health Checks (verify_db.py)](#7-verification--health-checks-verify_dbpy)
8. [Troubleshooting & Common Gotchas](#8-troubleshooting--common-gotchas)
9. [Hand-off Instructions for Backend Team (Aakash)](#9-hand-off-instructions-for-backend-team-aakash)

---

## 1. Required vs. Not Required Quick Reference

### MySQL User Accounts
| User Account | Host | Status | Purpose |
| :--- | :--- | :--- | :--- |
| `root` | `localhost` | **Admin Only** | Administrative management via MySQL Workbench (schema migrations, user creation). |
| `root` | `127.0.0.1` | **Admin Only** | Administrative management via TCP loopback. |
| `pqc_user` | `localhost` | **REQUIRED** | Application runtime user for the FastAPI backend connecting via local socket / named pipe. |
| `pqc_user` | `127.0.0.1` | **REQUIRED** | Application runtime user for the FastAPI backend connecting via TCP/IP loopback (`127.0.0.1:3306`). |

> **Why are both `localhost` and `127.0.0.1` required?**
> In MySQL on Windows, `'user'@'localhost'` authenticates via local named pipes or sockets, while `'user'@'127.0.0.1'` authenticates via TCP/IP networking. Python libraries (such as SQLAlchemy, PyMySQL, or async engines) frequently resolve `localhost` to `127.0.0.1`. If only `'localhost'` exists, connecting to `127.0.0.1` will fail with `Access denied for user 'pqc_user'@'127.0.0.1'`. Creating both prevents authentication mismatch.

---

### Databases
| Database | Status | Purpose |
| :--- | :--- | :--- |
| `pqc_security` | **REQUIRED** | The primary database for the PQC Platform storing all application entities. |
| `sys`, `mysql`, `information_schema`, `performance_schema` | **System DBs** | Built-in MySQL internal catalogs. Do **not** drop or modify. |

---

### Repository Files (Branch: `vamsi`)
| File / Directory | Status | Notes |
| :--- | :--- | :--- |
| `database/schema.sql` | **REQUIRED** | Primary DDL definition for all 6 tables, UUID generation, foreign keys, and indexes. |
| `database/seed.sql` | **REQUIRED** | Development seed data with Argon2id admin credentials and completed demo scan. |
| `database/models.py` | **REQUIRED** | SQLAlchemy 2.0 ORM models matching MySQL DDL with microsecond timestamp precision. |
| `database/verify_db.py` | **REQUIRED** | Standalone verification script. Strictly tests MySQL (fails fast, zero SQLite fallback). |
| `database/run_combined_flow.py`| **REQUIRED** | End-to-end integration and verification script with automatic teardown. |
| `backend/` stub files | **PROHIBITED** | Must **NOT** exist on branch `vamsi`. Backend code belongs to Aakash (`backend/aakash-port`). |
| `schema_postgres.sql`, `seed_postgres.sql` | **PROHIBITED** | PostgreSQL is forbidden. Target is local MySQL only. |
| `*.db` (SQLite files) | **PROHIBITED** | SQLite fallback is forbidden. The platform is strictly MySQL. |

---

## 2. Local MySQL Server Setup (Windows)

### Check if MySQL is Running
Open PowerShell and verify whether port `3306` is open:
```powershell
Test-NetConnection -ComputerName 127.0.0.1 -Port 3306
```
If `TcpTestSucceeded : True`, your MySQL server is already listening.

### Start MySQL Daemon (If not running)
If MySQL is installed as a Windows Service:
```powershell
Start-Service MySQL80   # or your specific service name
```
Or start the daemon manually with your `my.ini` configuration:
```powershell
& "C:\Program Files\MySQL\MySQL Server 26.7\bin\mysqld.exe" --defaults-file="C:\ProgramData\MySQL\MySQL Server 26.7\my.ini" --console
```

---

## 3. Step-by-Step Initialization Guide

### Step 1: Create Database & Dedicated Application User
Open MySQL Workbench (connecting as `root`), or open PowerShell / Command Prompt and run:
```sql
-- 1. Create target database
CREATE DATABASE IF NOT EXISTS `pqc_security`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- 2. Create compatibility database (optional)
CREATE DATABASE IF NOT EXISTS `pqc_security`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- 3. Create application user for both localhost and 127.0.0.1
CREATE USER IF NOT EXISTS 'pqc_user'@'localhost' IDENTIFIED BY 'your_password';
CREATE USER IF NOT EXISTS 'pqc_user'@'127.0.0.1' IDENTIFIED BY 'your_password';

-- 4. Grant privileges on pqc and pqc_security
GRANT ALL PRIVILEGES ON `pqc_security`.* TO 'pqc_user'@'localhost';
GRANT ALL PRIVILEGES ON `pqc_security`.* TO 'pqc_user'@'127.0.0.1';
GRANT ALL PRIVILEGES ON `pqc_security`.* TO 'pqc_user'@'localhost';
GRANT ALL PRIVILEGES ON `pqc_security`.* TO 'pqc_user'@'127.0.0.1';

-- 5. Apply privilege changes
FLUSH PRIVILEGES;
```

---

### Step 2: Configure Environment Variables (`.env`)
Create a `.env` file in your project root (or set environment variables):
```ini
# Database Connection Parameters
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=pqc_security
DB_USER=pqc_user
DB_PASSWORD=your_password

# Database URL for SQLAlchemy (note: encode special characters such as @ as %40)
DATABASE_URL=mysql+pymysql://pqc_user:your_password@127.0.0.1:3306/pqc_security
```

> **Special Character Warning in Passwords:**
> If your password contains `@` (e.g. `Vsvg@mysql`), you must URL-encode it as `%40` in `DATABASE_URL`:
> `mysql+pymysql://pqc_user:Vsvg%40mysql@127.0.0.1:3306/pqc_security`
> In discrete `DB_PASSWORD=Vsvg@mysql`, write it normally without URL encoding.

---

### Step 3: Apply the Schema (`schema.sql`)
Run the schema script to create all 6 tables and default organization:
```powershell
# Using MySQL CLI
mysql -u pqc_user -p pqc_security < database/schema.sql

# Or open database/schema.sql in MySQL Workbench and execute all statements
```

---

### Step 4: Load Seed Data (`seed.sql`)
Populate initial development data:
```powershell
# Using MySQL CLI
mysql -u pqc_user -p pqc_security < database/seed.sql

# Or open database/seed.sql in MySQL Workbench and execute all statements
```

---

### Step 5: Verify the Database Setup
Run the standalone verification test script:
```powershell
python database/verify_db.py
```
**Expected Output:**
```text
Connecting to MySQL at 127.0.0.1:3306/pqc_security...
[OK] Connected to MySQL successfully.
[OK] Table 'organizations' verified.
[OK] Table 'users' verified.
[OK] Table 'projects' verified.
[OK] Table 'scans' verified (including 'error_message' column).
[OK] Table 'scan_files' verified.
[OK] Table 'findings' verified (including 'explanation', 'confidence', 'is_development').
[OK] Microsecond timestamp precision DATETIME(6) confirmed.
[OK] Seed data verified (Admin user present with Argon2id hash).
[OK] Verification completed successfully with 0 errors. All test rows cleaned up.
```

---

## 4. Complete Schema Code (`schema.sql`) & Table Specifications

Below is the complete, official SQL schema for the PQC platform:

```sql
-- =============================================================================
-- PQC Security Assessment Platform - Core Database Schema
-- Author: Vamsi (Database Engineer)
-- Target: MySQL 8.0+
-- Database: pqc_security
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `pqc_security`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `pqc_security`;

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
-- Password hash: Argon2id format
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
-- Notes:
--   - repository_path stores local filesystem path only; NEVER store ZIP binaries in DB!
--   - error_message captures worker/pipeline failure diagnostics
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
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
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

-- -----------------------------------------------------------------------------
-- Default Seed: Organization (Standard UUID-compatible string)
-- -----------------------------------------------------------------------------
INSERT INTO `organizations` (`id`, `name`, `created_at`, `updated_at`)
VALUES
    ('org-default-001', 'Default Organization', NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

SET FOREIGN_KEY_CHECKS = 1;
```

---

### Architectural Design Standards
1. **Unified UUID Primary Keys (`CHAR(36)` / `VARCHAR(36)`):**
   All tables use standard 36-character UUID strings with automatic generation via `DEFAULT (UUID())`. Auto-incrementing integers are forbidden. This supports distributed agents and offline air-gapped sync without collision.
2. **High-Precision Microsecond Timestamps (`DATETIME(6)`):**
   Every `created_at` and `updated_at` column defines `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` to ensure microsecond ordering accuracy during rapid sequential automated scans.
3. **No Binary Blobs in Database:**
   Uploaded ZIP files and extracted codebases reside strictly on the local filesystem (`storage/uploads/`). The `scans.repository_path` column stores only the local filesystem path string.
4. **Scan Diagnostics Column (`error_message`):**
   The `scans` table includes an `error_message TEXT NULL` column to record the exact stack trace / reason if a scan transitions to `FAILED`.

---

## 5. Complete Seed Data Code (`seed.sql`) & Dev Credentials

```sql
-- =============================================================================
-- PQC Security Assessment Platform - Development Seed Data
-- Database: pqc_security
-- =============================================================================

USE `pqc_security`;

-- 1. Default Organization
INSERT INTO `organizations` (`id`, `name`, `created_at`, `updated_at`)
VALUES
    ('org-default-001', 'Default Organization', NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. Development Admin User
-- Email: admin@pqc.example
-- Plaintext Password: dev-admin-password-2026!
-- Hash Scheme: Argon2id via pwdlib[argon2]
INSERT INTO `users` (`id`, `organization_id`, `email`, `password_hash`, `role`, `created_at`, `updated_at`)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'org-default-001',
    'admin@pqc.example',
    '$argon2id$v=19$m=65536,t=3,p=4$M7uTQkr8amx0e06HMfk1ig$gtZiERUEonf1XFq0AvpCmShrVe8nVdDTL27ty6iV5x4',
    'admin',
    NOW(6),
    NOW(6)
) ON DUPLICATE KEY UPDATE `email` = VALUES(`email`), `password_hash` = VALUES(`password_hash`);

-- 3. Demo Banking Application Project
INSERT INTO `projects` (`id`, `organization_id`, `name`, `description`, `created_at`, `updated_at`)
VALUES (
    '00000000-0000-0000-0001-000000000001',
    'org-default-001',
    'Demo Banking Application',
    'Sample legacy banking app repository for Day 1 security & PQC assessment testing',
    NOW(6),
    NOW(6)
) ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 4. Initial Scan with Status COMPLETED
INSERT INTO `scans` (`id`, `project_id`, `status`, `repository_path`, `error_message`, `created_at`, `started_at`, `completed_at`)
VALUES (
    'a8098c1a-f86e-11da-bd1a-00112444be1e',
    '00000000-0000-0000-0001-000000000001',
    'COMPLETED',
    'uploads/demo-banking.zip',
    NULL,
    NOW(6),
    NOW(6),
    NOW(6)
) ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `started_at` = VALUES(`started_at`), `completed_at` = VALUES(`completed_at`);

-- 5. Mock Findings (Development fixtures)
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
    NOW(6)
) ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);
```

### Seed Credentials Summary
* **Admin Login Email:** `admin@pqc.example`
* **Admin Password (Dev Only):** `dev-admin-password-2026!`
* **Password Algorithm:** Argon2id (`$argon2id$v=19$m=65536,t=3,p=4$...`)
* **Default Organization ID:** `org-default-001`
* **Demo Project ID:** `00000000-0000-0000-0001-000000000001`
* **Demo Scan ID:** `a8098c1a-f86e-11da-bd1a-00112444be1e` (Status: `COMPLETED`)

---

## 6. SQLAlchemy ORM Mapping (`models.py`)

The file `database/models.py` provides exact 1:1 SQLAlchemy 2.0 ORM mappings for all 6 tables:
* `Organization` (`organizations`)
* `User` (`users`)
* `Project` (`projects`)
* `Scan` (`scans`) — includes `error_message` column and `status` Enum
* `ScanFile` (`scan_files`)
* `Finding` (`findings`) — includes `explanation`, `confidence`, and `is_development`

It implements `DateTime6` with MySQL dialect `DATETIME(fsp=6)` to maintain microsecond accuracy in Python.

---

## 7. Verification & Health Checks (`verify_db.py`)

Run the automated verification suite:
```powershell
python database/verify_db.py
```
What it verifies:
1. **Active MySQL Connection:** Directly connects using PyMySQL / SQLAlchemy. Fails immediately with `exit 1` if MySQL is unavailable (no silent SQLite fallback).
2. **Table Existence & Schema Columns:** Checks all 6 tables and verifies mandatory columns (`scans.error_message`, `findings.confidence`, `findings.is_development`, etc.).
3. **Microsecond Precision:** Verifies timestamps support 6 decimal places.
4. **Seed Data Integrity:** Confirms `admin@pqc.example` exists with valid Argon2id hash.
5. **Zero-Pollution Teardown:** Inserts temporary test rows and cleans them up using reverse foreign key order in a `finally:` block, leaving 0 leftover rows in MySQL.

---

## 8. Troubleshooting & Common Gotchas

### Gotcha 1: Password contains `@` or special characters
* **Problem:** If your password is `Vsvg@mysql`, connection fails with:
  `[Errno 11001] getaddrinfo failed` because the URL parser thinks `@mysql` is part of the host address.
* **Solution:** URL-encode the password in `DATABASE_URL`:
  Replace `@` with `%40`:
  `DATABASE_URL=mysql+pymysql://pqc_user:Vsvg%40mysql@127.0.0.1:3306/pqc_security`

### Gotcha 2: `Access denied for user 'pqc_user'@'127.0.0.1'`
* **Problem:** User was created with `'pqc_user'@'localhost'`, but the application connects via TCP loopback (`127.0.0.1`).
* **Solution:** Run in MySQL Workbench as root:
  ```sql
  CREATE USER IF NOT EXISTS 'pqc_user'@'127.0.0.1' IDENTIFIED BY 'your_password';
  GRANT ALL PRIVILEGES ON pqc_security.* TO 'pqc_user'@'127.0.0.1';
  FLUSH PRIVILEGES;
  ```

### Gotcha 3: `Can't connect to MySQL server on '127.0.0.1:3306'`
* **Problem:** MySQL daemon is stopped or not running on port 3306.
* **Solution:** Start the MySQL service or run:
  ```powershell
  & "C:\Program Files\MySQL\MySQL Server 26.7\bin\mysqld.exe" --defaults-file="C:\ProgramData\MySQL\MySQL Server 26.7\my.ini" --console
  ```

---

## 9. Hand-off Instructions for Backend Team (Aakash)

To integrate the database layer into the main backend:
1. Make sure your local MySQL 8.0+ server is running on `127.0.0.1:3306`.
2. Delete any stale local copies of `database/` and `docker-compose.yml`.
3. Pull the `database/` folder and `docker-compose.yml` directly from branch `vamsi`.
4. Run `python database/verify_db.py` to confirm your local database is completely healthy.
5. Point your FastAPI backend `.env` to:
   ```ini
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_NAME=pqc_security
   DB_USER=pqc_user
   DB_PASSWORD=your_password
   DATABASE_URL=mysql+pymysql://pqc_user:your_password@127.0.0.1:3306/pqc_security
   ```

**Hand-off Message:**
> *"My database layer is ready. Take the `database/` folder from my branch (`vamsi`)."*
