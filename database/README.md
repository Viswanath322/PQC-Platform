# PQC Security Assessment Platform — Database

Day 3 Findings/Reports extensions are described in the additive migration [`migrations/20261006_day3_findings_components.sql`](migrations/20261006_day3_findings_components.sql). Apply it once to an existing Day 2 database before deploying the expanded API. Fresh databases receive the same columns and `scan_components` table from `schema.sql`.

**Owner:** Vamsi (Database Engineer)  
**Target Engine:** MySQL 8.0+  
**Database Name:** `pqc` (with `pqc_security` backwards-compatibility)  
**Git Branch:** `vamsi`

> 📘 **Comprehensive Manual Available:**  
> For the complete step-by-step guide with full SQL schema code, seed data, required vs non-required breakdown, and troubleshooting, see [DATABASE_README.md](file:///d:/Projects/PQC/PQC-Platform/database/DATABASE_README.md).

---

![PQC Database Schema Diagram](schema_diagram.jpg)

## 1. Architecture & Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ USERS : "has members"
    ORGANIZATIONS ||--o{ PROJECTS : "owns"
    PROJECTS ||--o{ SCANS : "undergoes"
    SCANS ||--o{ SCAN_FILES : "contains"
    SCANS ||--o{ FINDINGS : "produces"

    ORGANIZATIONS {
        VARCHAR(36) id PK "UUID / seed: org-default-001"
        VARCHAR(255) name
        DATETIME(6) created_at
        DATETIME(6) updated_at
    }

    USERS {
        CHAR(36) id PK "UUID"
        VARCHAR(36) organization_id FK
        VARCHAR(255) email UK
        VARCHAR(255) password_hash "Argon2id"
        VARCHAR(50) role
        DATETIME(6) created_at
        DATETIME(6) updated_at
    }

    PROJECTS {
        VARCHAR(36) id PK "UUID (DEFAULT UUID())"
        VARCHAR(36) organization_id FK "DEFAULT org-default-001"
        VARCHAR(255) name
        TEXT description
        DATETIME(6) created_at
        DATETIME(6) updated_at
    }

    SCANS {
        CHAR(36) id PK "UUID (DEFAULT UUID())"
        VARCHAR(36) project_id FK "REFERENCES projects(id)"
        ENUM status "QUEUED, INGESTING, ANALYZING, PROCESSING, AI_ANALYSIS, COMPLETED, FAILED, CANCELLED"
        VARCHAR(1024) repository_path
        TEXT error_message "Failure explanation"
        DATETIME(6) created_at
        DATETIME(6) started_at
        DATETIME(6) completed_at
    }

    SCAN_FILES {
        CHAR(36) id PK "UUID"
        CHAR(36) scan_id FK "REFERENCES scans(id)"
        VARCHAR(1024) file_path
        VARCHAR(100) file_type
        VARCHAR(100) language
        BIGINT size_bytes
        DATETIME(6) created_at
    }

    FINDINGS {
        CHAR(36) id PK "UUID"
        CHAR(36) scan_id FK "REFERENCES scans(id)"
        ENUM engine "sast, crypto, dependency, configuration"
        VARCHAR(100) category
        ENUM severity "critical, high, medium, low"
        VARCHAR(255) title
        VARCHAR(1024) file_path
        INT line_number
        TEXT evidence
        TEXT explanation
        FLOAT confidence "0.0 - 1.0"
        TEXT recommendation
        BOOLEAN is_development
        DATETIME(6) created_at
    }
```

---

## 2. Table Specifications & Identifier Standard

### Identifier Standard (Agreed Contract)
All entities (`organizations`, `users`, `projects`, `scans`, `scan_files`, `findings`) strictly use **standard 36-character UUID strings (`VARCHAR(36)` / `CHAR(36)`)** with automatic generation `DEFAULT (UUID())`. Auto-incrementing integer IDs are deprecated across all routes and models.
* **Project IDs:** Standard 36-char lowercase UUID string (`VARCHAR(36)`), e.g. `00000000-0000-0000-0001-000000000001`. Validated in FastAPI routes via `UUID_PATTERN`.
* **Organization IDs:** Standard 36-char string (`VARCHAR(36)`). Standardized on the single default organization `'org-default-001'`. The legacy numeric compatibility row `'1'` has been dropped (resolving DB-11).
* **Scan & Finding IDs:** Standard 36-char UUID string (`CHAR(36)`).
* **High-Precision Timestamps:** All `created_at` and `updated_at` columns use `DATETIME(6)` microsecond precision with `CURRENT_TIMESTAMP(6)` to guarantee deterministic and stable sorting for newest-first queries.
* **Scan Error Reporting:** The `scans` table includes `error_message TEXT NULL` so failed scans capture worker and ingestion failure reasons.
* **Findings Schema Alignment:** Includes `explanation TEXT NULL` (for API queries), `confidence FLOAT NULL` (0.0 to 1.0, matching analysis engine contract), and `is_development BOOLEAN NOT NULL DEFAULT FALSE` (distinguishing synthetic fixtures).

---

## 3. Seed Data & Development Credentials

The development seed data in `database/seed.sql` pre-populates:
1. **Organization:** `org-default-001` ("Default Organization").
2. **Admin User:**
   - **ID:** `00000000-0000-0000-0000-000000000001`
   - **Email:** `admin@pqc.example`
   - **Password (Dev only):** `dev-admin-password-2026!`
   - **Hash Scheme:** Argon2id via `pwdlib[argon2]` (`$argon2id$v=19$m=65536,t=3,p=4$M7uTQkr8amx0e06HMfk1ig$gtZiERUEonf1XFq0AvpCmShrVe8nVdDTL27ty6iV5x4`)
3. **Demo Project:** `00000000-0000-0000-0001-000000000001` ("Demo Banking Application").
4. **Demo Scan:** `a8098c1a-f86e-11da-bd1a-00112444be1e` seeded with status `COMPLETED` for preloaded demo findings.
5. **Demo Findings:** Two development findings (`is_development = TRUE`) attached to the demo scan.

---

## 4. How to Run & Verify

### Step 1: Configure Environment (.env)
Create an untracked `.env` in the repository root (or export environment variables):
```ini
DB_HOST=localhost
DB_PORT=3306
DB_NAME=pqc
DB_USER=pqc_user
DB_PASSWORD=your_secure_mysql_password
DATABASE_URL=mysql+pymysql://pqc_user:your_secure_mysql_password@127.0.0.1:3306/pqc
```

### Step 2: Initialize Database and Application User (Local MySQL)
In MySQL Workbench or MySQL Shell:
```sql
CREATE DATABASE IF NOT EXISTS pqc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'pqc_user'@'localhost' IDENTIFIED BY 'your_secure_mysql_password';
GRANT ALL PRIVILEGES ON pqc.* TO 'pqc_user'@'localhost';
FLUSH PRIVILEGES;
```
Then load the schema and seed:
```bash
mysql -u pqc_user -p pqc < database/schema.sql
mysql -u pqc_user -p pqc < database/seed.sql
```

*(Alternatively, run `docker compose up -d mysql` if using containerized local development.)*

### Step 3: Run the Verification Script
```bash
python database/verify_db.py
```
Validates:
* All 6 core tables and relationships.
* Idempotent seed data checking.
* Unified UUID identifier standard.
* `error_message` column on `scans`.
* Findings `explanation`, `confidence`, and `is_development` columns.
* Clean teardown in a `finally` block with zero leftover test rows.
* Strictly connects to MySQL (exits non-zero if unreachable; no silent fallback).

