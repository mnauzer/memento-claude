# CRITICAL FIX: Wrong Library Was Being Synced!

**Date:** 2026-03-18
**Severity:** CRITICAL
**Status:** FIXED

## Problem Discovered

The Dochádzka (Attendance) sync script was using **WRONG library ID**:
- ❌ **Script used:** `qU4Br5hU6` → "Zamestnanci Semiramis" (2,806 entries)
- ✅ **Should use:** `zNoMvrv8U` → "Dochádzka" (573 entries)

## Impact

- **Previous syncs were syncing employee data, NOT attendance data!**
- The "Zamestnanci Semiramis" library has NO attendance fields (Príchod, Odchod)
- PostgreSQL `memento_attendance` table was populated with wrong data

## Root Cause

Confusion between multiple Memento libraries with similar names:
- Dochádzka (Main) - `zNoMvrv8U` - **This is the correct one**
- Zamestnanci Semiramis - `qU4Br5hU6` - Employee library (NOT attendance)
- Dochádzka Semiramis - `5ez6J8sJr` - Historical attendance (1,996 entries)
- Dochádzka 2019 - `FGxx369FV` - Historical attendance (363,200 entries)
- Dochádzka 2020 - `6c9NiSCCf` - Historical attendance (50,828 entries)

## Files Changed

### 1. Field Name Mapper (`sync-api/field_name_mapper.py`)
- ✅ Updated DOCHADZKA_FIELDS based on actual library structure
- ✅ Changed library ID mapping from `qU4Br5hU6` → `zNoMvrv8U`
- ✅ Updated junction fields for Dochádzka
- ✅ Updated EMPLOYEES_FIELDS based on actual Zamestnanci structure
- ✅ Added field mappings for 5 new master data libraries:
  - Miesta (Places) - `mVadrV6p2`
  - Klienti (Clients) - `rh7YHaVRM`
  - Dodávatelia (Suppliers) - `3FSQN0reH`
  - Partneri (Partners) - `NffZSLRKU`
  - Zamestnanci (Employees) - `nWb00Nogf`

### 2. Sync Script (`memento-scripts/Dochadzka.BulkAction.SyncToPostgreSQL.js`)
- ✅ Changed libraryId from `qU4Br5hU6` → `zNoMvrv8U`
- ✅ Updated version to 3.6
- ✅ Added changelog entry explaining the fix

### 3. Documentation
- ✅ Updated `LIBRARY_IDS.md` with correct IDs and warning
- ✅ Created `schema_master_data.sql` for 5 master data tables
- ✅ Created this CRITICAL_FIX document

## Actual Dochádzka Fields

From Memento API (library `zNoMvrv8U`):
```
Field ID | Field Name              | Type
---------|-------------------------|----------
0        | Dátum                   | date
92       | Deň                     | choice
1        | Príchod                 | time ← TIME FIELD
2        | Odchod                  | time ← TIME FIELD
5        | Zamestnanci             | entries (junction table)
86       | Notifikácie             | entries
38       | Poznámka                | text
88       | ikony záznamu           | text
91       | Poznámka                | text
85       | Voľno                   | boolean
81       | Počet pracovníkov       | int
18       | Pracovná doba           | double
17       | Odpracované             | double
87       | Mzdové náklady          | currency
89       | stav záznamu            | checkboxes
90       | info                    | richtext
94       | Debug_Log               | text
77       | Error_Log               | text
67       | ID                      | int ← Custom ID (not primary key!)
93       | view                    | choice
27       | farba záznamu           | color
29       | farba pozadia           | color
```

**Critical Fields:**
- `Príchod` (arrival) - TIME field
- `Odchod` (departure) - TIME field
- These require the TIME field Date object conversion from v3.5!

## Next Steps

1. ✅ Drop old `memento_attendance` table (contains wrong data)
2. ✅ Re-create `memento_attendance` table with correct schema
3. ⏳ Update sync script in Memento Database app (copy new v3.6 script)
4. ⏳ Run bulk sync with correct library ID
5. ⏳ Verify data in PostgreSQL
6. ⏳ Test TIME field conversion (Príchod, Odchod)

## Database Schema Update Required

The `memento_attendance` table schema needs to be updated to match actual fields:

```sql
-- Drop old table (contains wrong data)
DROP TABLE IF EXISTS memento_attendance CASCADE;
DROP TABLE IF EXISTS memento_attendance_employees CASCADE;
DROP TABLE IF EXISTS memento_attendance_notifications CASCADE;

-- Create new table with correct fields
CREATE TABLE memento_attendance (
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    sync_source VARCHAR(20) DEFAULT 'memento',
    synced_at TIMESTAMP DEFAULT NOW(),

    -- Custom ID (NOT primary key!)
    record_number INTEGER,

    -- Attendance fields
    date DATE NOT NULL,
    day_of_week VARCHAR(50),
    arrival TIME,  -- Príchod
    departure TIME,  -- Odchod
    day_off BOOLEAN DEFAULT false,

    -- Statistics
    employee_count INTEGER,
    work_time NUMERIC(10,2),
    worked_hours NUMERIC(10,2),
    wage_costs NUMERIC(15,2),

    -- Additional fields
    note TEXT,
    entry_icons TEXT,
    entry_status TEXT,
    entry_info TEXT,
    debug_log TEXT,
    error_log TEXT,
    view_mode VARCHAR(50),
    record_color VARCHAR(20),
    background_color VARCHAR(20),
    created_date TIMESTAMP,
    created_by_user VARCHAR(255),
    modified_date TIMESTAMP,
    modified_by_user VARCHAR(255)
);

-- Junction table for employees
CREATE TABLE memento_attendance_employees (
    attendance_id VARCHAR(255) REFERENCES memento_attendance(id) ON DELETE CASCADE,
    employee_id VARCHAR(255) REFERENCES memento_employees(id) ON DELETE CASCADE,
    PRIMARY KEY (attendance_id, employee_id)
);

-- Junction table for notifications (if needed)
CREATE TABLE memento_attendance_notifications (
    attendance_id VARCHAR(255) REFERENCES memento_attendance(id) ON DELETE CASCADE,
    notification_id VARCHAR(255),
    PRIMARY KEY (attendance_id, notification_id)
);

-- Indexes
CREATE INDEX idx_attendance_date ON memento_attendance(date);
CREATE INDEX idx_attendance_day_off ON memento_attendance(day_off);
CREATE INDEX idx_attendance_record_number ON memento_attendance(record_number);
```

## Lessons Learned

1. **Always verify library ID via API** - Don't trust script comments
2. **Check actual field structure** - Field names can differ from assumptions
3. **Multiple libraries can have similar names** - Verify by fields, not just name
4. **Public API ID ≠ Internal ID** - These are different identifiers
5. **Test with actual data early** - Would have caught this sooner

## Memory Update

This fix should be added to auto memory (`MEMORY.md`):

```markdown
## Library ID Verification - CRITICAL!

**ALWAYS verify library ID via Memento REST API before syncing:**
```bash
curl "https://api.mementodatabase.com/v1/libraries?token=xxx"
curl "https://api.mementodatabase.com/v1/libraries/{library_id}?token=xxx"
```

**Check actual fields match expected structure!** Library names can be misleading.

**Example:** "Dochádzka" sync was using ID `qU4Br5hU6` which was actually "Zamestnanci Semiramis", not attendance data!
```
