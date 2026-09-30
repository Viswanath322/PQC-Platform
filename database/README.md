# PQC Security Assessment Platform — Database (Day 1)

**Owner:** Vamsi (Database Engineer)  
**Target Engine:** MySQL 8.0+  
**Database Name:** `pqc_security`  
**Git Branch:** `vamsi`

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
        VARCHAR(36) id PK "UUID / seed: org-default-001, 1"
        VARCHAR(255) name
        DATETIME created_at
        DATETIME updated_at
    }

    USERS {
        CHAR(36) id PK "UUID"
        VARCHAR(36) organization_id FK
        VARCHAR(255) email UK
        VARCHAR(255) password_hash
        VARCHAR(50) role
        DATETIME created_at
        DATETIME updated_at
    }

    PROJECTS {
        VARCHAR(36) id PK "UUID (DEFAULT UUID())"
        VARCHAR(36) organization_id FK "DEFAULT org-default-001"
        VARCHAR(255) name
        TEXT description
        DATETIME created_at
        DATETIME updated_at
    }

    SCANS {
        CHAR(36) id PK "UUID (DEFAULT UUID())"
        VARCHAR(36) project_id FK "REFERENCES projects(id)"
        ENUM status "QUEUED, INGESTING, ANALYZING, PROCESSING, AI_ANALYSIS, COMPLETED, FAILED, CANCELLED"
        VARCHAR(1024) repository_path
        DATETIME created_at
        DATETIME started_at
        DATETIME completed_at
    }

    SCAN_FILES {
        CHAR(36) id PK "UUID"
        CHAR(36) scan_id FK "REFERENCES scans(id)"
        VARCHAR(1024) file_path
        VARCHAR(100) file_type
        VARCHAR(100) language
        BIGINT size_bytes
        DATETIME created_at
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
        VARCHAR(50) confidence
        TEXT recommendation
        DATETIME created_at
    }
```

---

## 2. Table Specifications & Identifier Standard

### Identifier Standard
All entities (`organizations`, `users`, `projects`, `scans`, `scan_files`, `findings`) use standard **UUID strings (`VARCHAR(36)` / `CHAR(36)`)** with automatic MySQL generation `DEFAULT (UUID())`. This guarantees:
* Client-side offline generation for desktop shells.
* Seamless multi-agent asynchronous scanning without sequence contention.
* Zero ID collisions across air-gapped sync nodes.

### Seed Compatibility
The default organization seeds both `'org-default-001'` and `'1'`, ensuring full compatibility with both string-based and legacy numeric references.

---

## 3. How to Run & Verify

### Option A: Local PostgreSQL & pgAdmin (Recommended for Lab / Desktop Setup)
* **Status:** Fully supported. Uses the local PostgreSQL service (`localhost:5432`).
* **Database Name:** `pqc_security`
* **Schema Script:** [`database/schema_postgres.sql`](file:///d:/Projects/PQC/PQC-Platform/database/schema_postgres.sql)
* **Seed Script:** [`database/seed_postgres.sql`](file:///d:/Projects/PQC/PQC-Platform/database/seed_postgres.sql)

To initialize and verify with Python:
```bash
python database/verify_db.py
```

To view or manage in **pgAdmin**:
1. Open **pgAdmin**.
2. Connect to your local PostgreSQL server (`localhost:5432`).
3. Expand **Databases** -> **pqc_security** -> **Schemas** -> **public** -> **Tables**.
4. You will see all 6 core tables: `organizations`, `users`, `projects`, `scans`, `scan_files`, `findings`.

---

### Option B: Start MySQL with Docker Compose
If Docker Desktop is installed:
```bash
docker compose up -d mysql
```
*Port:* `127.0.0.1:3306` (Localhost restricted for security)  
*Default User:* `pqc`  
*Default Password:* `change_me_locally`  
*Database:* `pqc_security`

---

### Step 2: Run the Verification Script
```bash
python database/verify_db.py
```
Automatically detects PostgreSQL first, then MySQL, or falls back to SQLite for schema validation.

