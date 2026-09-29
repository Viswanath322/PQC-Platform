# PQC Security Assessment Platform — Database (Day 1)

**Owner:** Vamsi (Database Engineer)  
**Target Engine:** MySQL 8.0+  
**Database Name:** `pqc_security`  
**Git Branch:** `database/vamsi`

---

## 1. Architecture & Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ USERS : "has members"
    ORGANIZATIONS ||--o{ PROJECTS : "owns"
    PROJECTS ||--o{ SCANS : "undergoes"
    SCANS ||--o{ SCAN_FILES : "contains"
    SCANS ||--o{ FINDINGS : "produces"

    ORGANIZATIONS {
        VARCHAR(36) id PK
        VARCHAR(255) name
        DATETIME created_at
        DATETIME updated_at
    }

    USERS {
        VARCHAR(36) id PK
        VARCHAR(36) organization_id FK
        VARCHAR(255) email UK
        VARCHAR(255) password_hash
        VARCHAR(50) role
        DATETIME created_at
        DATETIME updated_at
    }

    PROJECTS {
        VARCHAR(36) id PK
        VARCHAR(36) organization_id FK
        VARCHAR(255) name
        TEXT description
        DATETIME created_at
        DATETIME updated_at
    }

    SCANS {
        VARCHAR(36) id PK
        VARCHAR(36) project_id FK
        ENUM status "QUEUED, INGESTING, ANALYZING, PROCESSING, AI_ANALYSIS, COMPLETED, FAILED, CANCELLED"
        VARCHAR(1024) repository_path
        DATETIME created_at
        DATETIME started_at
        DATETIME completed_at
    }

    SCAN_FILES {
        VARCHAR(36) id PK
        VARCHAR(36) scan_id FK
        VARCHAR(1024) file_path
        VARCHAR(100) file_type
        VARCHAR(100) language
        BIGINT size_bytes
        DATETIME created_at
    }

    FINDINGS {
        VARCHAR(36) id PK
        VARCHAR(36) scan_id FK
        ENUM engine "sast, crypto, dependency, configuration"
        VARCHAR(100) category
        ENUM severity "critical, high, medium, low"
        VARCHAR(255) title
        VARCHAR(1024) file_path
        INT line_number
        TEXT evidence
        VARCHAR(50) confidence
        TEXT recommendation
        DATETIME created_at
    }
```

---

## 2. Table Specifications & Index Strategy

### Table: `organizations`
* **Purpose:** Multi-tenant / customer organization boundary.
* **Primary Key:** `id` (`VARCHAR(36)`, default `UUID()`).

### Table: `users`
* **Purpose:** User identities, authentication records, and authorization roles.
* **Foreign Keys:** `organization_id` &rarr; `organizations.id` (`ON DELETE SET NULL`).
* **Indexes:**
  * `uq_users_email` (UNIQUE): Fast lookups during login/auth.
  * `idx_users_organization_id`: Lookup all users within an organization.

### Table: `projects`
* **Purpose:** Target software repositories / projects being scanned.
* **Foreign Keys:** `organization_id` &rarr; `organizations.id` (`ON DELETE SET NULL`).
* **Indexes:**
  * `idx_projects_organization_id`: Filter projects by organization.
  * `idx_projects_name`: Project listing and search.

### Table: `scans`
* **Purpose:** Scan execution lifecycle and repository reference.
* **Important Rule:** `repository_path` stores the filesystem location of the ZIP/extracted directory. **Never store ZIP binaries in MySQL**.
* **Foreign Keys:** `project_id` &rarr; `projects.id` (`ON DELETE CASCADE`).
* **Indexes:**
  * `idx_scans_project_id`: Retrieve all scan runs for a given project.
  * `idx_scans_status`: Worker polling for `QUEUED` scans.
  * `idx_scans_created_at`: Sorting scans chronologically.
  * `idx_scans_project_status`: Composite index for filtering a project's active scans.

### Table: `scan_files`
* **Purpose:** File catalog discovered during the ingestion phase.
* **Foreign Keys:** `scan_id` &rarr; `scans.id` (`ON DELETE CASCADE`).
* **Indexes:**
  * `idx_scan_files_scan_id`: Load all files for a scan run.
  * `idx_scan_files_language`: Aggregate code language breakdown.

### Table: `findings`
* **Purpose:** Normalized security, cryptographic, and dependency findings.
* **Foreign Keys:** `scan_id` &rarr; `scans.id` (`ON DELETE CASCADE`).
* **Indexes:**
  * `idx_findings_scan_id`: Query findings for a specific scan.
  * `idx_findings_severity`: Filter by severity (`critical`, `high`, `medium`, `low`).
  * `idx_findings_engine`: Filter by engine (`sast`, `crypto`, `dependency`, `configuration`).
  * `idx_findings_scan_severity`: Composite index for the Dashboard summary cards.

---

## 3. How to Run & Verify

### Step 1: Start MySQL with Docker Compose
```bash
docker compose up -d mysql
```
*Port:* `3306`  
*Default User:* `pqc`  
*Default Password:* `change_me_locally`  
*Database:* `pqc_security`

### Step 2: Verify Tables Created
Using any MySQL client (e.g. CLI, DBeaver):
```bash
docker exec -it pqc_mysql mysql -u pqc -pchange_me_locally -e "USE pqc_security; SHOW TABLES;"
```

### Step 3: Run the Python Verification Script
```bash
python database/verify_db.py
```

---

## 4. Teammate Integration Hand-off

* **Amrutha (FastAPI Foundation):**
  * Connection string: `mysql+pymysql://pqc:change_me_locally@localhost:3306/pqc_security`
  * Pre-built SQLAlchemy models: see `backend/app/models/` or `database/models.py`.
* **Aakash (Scans API):**
  * Creating a scan: INSERT into `scans` with `status = 'QUEUED'`.
  * Status transition lifecycle: `QUEUED` &rarr; `INGESTING` &rarr; `ANALYZING` &rarr; `PROCESSING` &rarr; `AI_ANALYSIS` &rarr; `COMPLETED` / `FAILED`.
* **Sathwik (Findings API):**
  * Field names in `findings` table: `id`, `scan_id`, `engine`, `category`, `severity`, `title`, `file_path`, `line_number`, `evidence`, `confidence`, `recommendation`.
