-- ============================================================================
-- CORRECT Dochádzka (Attendance) Schema
-- Library ID: zNoMvrv8U (NOT qU4Br5hU6!)
-- Generated: 2026-03-18
-- ============================================================================

-- Step 1: DROP OLD TABLES (contains wrong data from Zamestnanci Semiramis)
-- ============================================================================

DROP TABLE IF EXISTS memento_attendance_employees CASCADE;
DROP TABLE IF EXISTS memento_attendance_notifications CASCADE;
DROP TABLE IF EXISTS memento_attendance CASCADE;

-- Step 2: CREATE CORRECT ATTENDANCE TABLE
-- ============================================================================

CREATE TABLE memento_attendance (
    -- Primary key (Memento entry ID)
    id VARCHAR(255) PRIMARY KEY,

    -- Status and sync metadata
    status VARCHAR(50) DEFAULT 'active',
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    sync_source VARCHAR(20) DEFAULT 'memento',
    synced_at TIMESTAMP DEFAULT NOW(),

    -- Custom ID field (NOT primary key!)
    record_number INTEGER,

    -- Attendance fields (CORE DATA)
    date DATE NOT NULL,                    -- Dátum
    day_of_week VARCHAR(50),               -- Deň
    arrival TIME,                          -- Príchod (TIME field!)
    departure TIME,                        -- Odchod (TIME field!)
    day_off BOOLEAN DEFAULT false,         -- Voľno

    -- Statistics
    employee_count INTEGER,                -- Počet pracovníkov
    work_time NUMERIC(10,2),              -- Pracovná doba
    worked_hours NUMERIC(10,2),           -- Odpracované
    wage_costs NUMERIC(15,2),             -- Mzdové náklady

    -- Additional fields
    note TEXT,                            -- Poznámka (field 38)
    entry_icons TEXT,                     -- ikony záznamu
    entry_status TEXT,                    -- stav záznamu
    entry_info TEXT,                      -- info (richtext)

    -- Debug & system fields
    debug_log TEXT,                       -- Debug_Log
    error_log TEXT,                       -- Error_Log
    view_mode VARCHAR(50),                -- view
    record_color VARCHAR(20),             -- farba záznamu
    background_color VARCHAR(20),         -- farba pozadia

    -- Audit fields (from Memento)
    created_date TIMESTAMP,               -- dátum zápisu
    created_by_user VARCHAR(255),         -- zapísal
    modified_date TIMESTAMP,              -- dátum úpravy
    modified_by_user VARCHAR(255)         -- upravil
);

-- Indexes for performance
CREATE INDEX idx_attendance_date ON memento_attendance(date);
CREATE INDEX idx_attendance_date_desc ON memento_attendance(date DESC);
CREATE INDEX idx_attendance_day_off ON memento_attendance(day_off);
CREATE INDEX idx_attendance_record_number ON memento_attendance(record_number);
CREATE INDEX idx_attendance_modified ON memento_attendance(memento_modified_time);

-- Step 3: CREATE JUNCTION TABLES
-- ============================================================================

-- Junction table for multiple employees per attendance record
CREATE TABLE memento_attendance_employees (
    attendance_id VARCHAR(255) REFERENCES memento_attendance(id) ON DELETE CASCADE,
    employee_id VARCHAR(255) REFERENCES memento_employees(id) ON DELETE CASCADE,
    PRIMARY KEY (attendance_id, employee_id)
);

CREATE INDEX idx_attendance_employees_attendance ON memento_attendance_employees(attendance_id);
CREATE INDEX idx_attendance_employees_employee ON memento_attendance_employees(employee_id);

-- Junction table for notifications (field 86)
CREATE TABLE memento_attendance_notifications (
    attendance_id VARCHAR(255) REFERENCES memento_attendance(id) ON DELETE CASCADE,
    notification_id VARCHAR(255),
    PRIMARY KEY (attendance_id, notification_id)
);

CREATE INDEX idx_attendance_notifications_attendance ON memento_attendance_notifications(attendance_id);

-- Step 4: CREATE POSTGRESQL TRIGGER FOR CHANGE NOTIFICATION
-- ============================================================================

-- Apply trigger to attendance table for bidirectional sync
DROP TRIGGER IF EXISTS memento_sync_trigger ON memento_attendance;
CREATE TRIGGER memento_sync_trigger
    AFTER INSERT OR UPDATE ON memento_attendance
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();

-- Step 5: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE memento_attendance IS 'Dochádzka (Attendance) - Library ID: zNoMvrv8U - CORRECT TABLE (40M+ entries)';
COMMENT ON COLUMN memento_attendance.id IS 'Primary key - Memento entry ID (long format)';
COMMENT ON COLUMN memento_attendance.record_number IS 'Custom ID field from Memento (NOT primary key!)';
COMMENT ON COLUMN memento_attendance.arrival IS 'Príchod - TIME field (requires v3.5+ Date object conversion)';
COMMENT ON COLUMN memento_attendance.departure IS 'Odchod - TIME field (requires v3.5+ Date object conversion)';
COMMENT ON TABLE memento_attendance_employees IS 'Junction table - Attendance ↔ Employees (many-to-many)';
COMMENT ON TABLE memento_attendance_notifications IS 'Junction table - Attendance ↔ Notifications';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these after sync to verify data:

-- 1. Check table exists and is empty
SELECT COUNT(*) as row_count FROM memento_attendance;

-- 2. Check schema matches
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'memento_attendance'
ORDER BY ordinal_position;

-- 3. Check indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'memento_attendance';

-- 4. Check foreign keys
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'memento_attendance'
    AND tc.constraint_type = 'FOREIGN KEY';

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. This replaces the OLD incorrect table that was syncing "Zamestnanci Semiramis"
-- 2. TIME fields (arrival, departure) require sync script v3.5+ with Date object conversion
-- 3. Junction table memento_attendance_employees links to memento_employees table
-- 4. After running this, update sync script in Memento app to v3.6 with correct library ID
-- 5. Run bulk sync to populate with correct attendance data
