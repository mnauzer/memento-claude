-- ===========================================================================
-- PostgreSQL Schema for Memento Sync
-- Created: 2026-03-18
-- Libraries: Zamestnanci (Employees) + Dochádzka (Attendance)
-- ===========================================================================

-- Drop existing tables (CASCADE removes foreign keys)
DROP TABLE IF EXISTS memento_attendance_employees CASCADE;
DROP TABLE IF EXISTS memento_attendance CASCADE;
DROP TABLE IF EXISTS memento_employees CASCADE;

-- ===========================================================================
-- TABLE 1: memento_employees (Master Data)
-- Library ID: nWb00Nogf
-- Library Name: Zamestnanci
-- Entry Count: ~10+ (4 active)
-- ===========================================================================

CREATE TABLE memento_employees (
    -- Primary Key (Memento Entry ID)
    id VARCHAR(255) PRIMARY KEY,

    -- System Fields (Common for all tables)
    status VARCHAR(50) DEFAULT 'active',
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Custom ID Field (NOT primary key!)
    record_number INTEGER,  -- Field: ID (int)

    -- Personal Information
    first_name VARCHAR(255),  -- Meno
    last_name VARCHAR(255),   -- Priezvisko
    nick VARCHAR(255) NOT NULL,  -- Nick (required)
    position VARCHAR(100),    -- Pozícia (radio)

    -- Contact Information
    mobile VARCHAR(50),       -- Mobil (phone)
    email VARCHAR(255),       -- Email (email)
    telegram_id VARCHAR(255), -- Telegram ID

    -- Status Flags
    is_active BOOLEAN DEFAULT true,  -- Aktívny
    is_driver BOOLEAN DEFAULT false, -- Šofér

    -- Communication Preferences
    sms_enabled BOOLEAN DEFAULT false,      -- sms
    email_enabled BOOLEAN DEFAULT false,    -- email
    telegram_enabled BOOLEAN DEFAULT false, -- Telegram notifikácie

    -- Work Statistics (Current Period)
    worked_on_orders NUMERIC(10,2),    -- Na zákzkách
    worked_driving NUMERIC(10,2),      -- Jazdy
    worked_hours NUMERIC(10,2),        -- Odpracované
    earned NUMERIC(15,2),               -- Zarobené
    bonuses NUMERIC(15,2),              -- Prémie
    paid_out NUMERIC(15,2),             -- Vyplatené

    -- Work Statistics (Total)
    worked_on_orders_total NUMERIC(10,2),  -- Na zákzkách total
    worked_driving_total NUMERIC(10,2),    -- Jazdy total
    worked_hours_total NUMERIC(10,2),      -- Odpracované total
    earned_total NUMERIC(15,2),             -- Zarobené total
    bonuses_total NUMERIC(15,2),            -- Prémie total
    paid_out_total NUMERIC(15,2),           -- Vyplatené total

    -- Salary Information
    gross_salary NUMERIC(15,2),        -- Hrubá mzda
    overpayment_underpayment NUMERIC(15,2),  -- Preplatok/Nedoplatok
    current_hourly_rate NUMERIC(10,2), -- Aktuálna hodinovka

    -- Balance (Saldo)
    obligations NUMERIC(15,2),  -- Záväzky
    receivables NUMERIC(15,2),  -- Pohľadávky
    balance NUMERIC(15,2),      -- Saldo

    -- Ratings/Evaluation
    attendance_rating INTEGER,  -- Dochádzka (hodnotenie)
    orders_rating INTEGER,      -- Zákzky (hodnotenie)
    total_rating INTEGER,       -- Celkom (hodnotenie)

    -- Notes and Logs
    notes TEXT,          -- Poznámka
    info TEXT,           -- info
    debug_log TEXT,      -- Debug_Log
    error_log TEXT,      -- Error_Log

    -- UI Settings
    view_mode VARCHAR(50),  -- view
    record_color VARCHAR(20),  -- farba záznamu
    background_color VARCHAR(20),  -- farba pozadia

    -- Period Selection (for reporting)
    period_total VARCHAR(50),    -- obdobie total
    period_selection VARCHAR(50) -- výber obdobia
);

-- Indexes for Employees
CREATE INDEX idx_employees_status ON memento_employees(status);
CREATE INDEX idx_employees_active ON memento_employees(is_active);
CREATE INDEX idx_employees_nick ON memento_employees(nick);
CREATE INDEX idx_employees_synced ON memento_employees(synced_at);

-- ===========================================================================
-- TABLE 2: memento_attendance (Transactional Data)
-- Library ID: zNoMvrv8U
-- Library Name: Dochádzka
-- Entry Count: 279
-- ===========================================================================

CREATE TABLE memento_attendance (
    -- Primary Key (Memento Entry ID)
    id VARCHAR(255) PRIMARY KEY,

    -- System Fields
    status VARCHAR(50) DEFAULT 'active',
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Custom ID Field
    record_number INTEGER,  -- ID (int, required)

    -- Date and Time
    date DATE NOT NULL,           -- Dátum
    day_of_week VARCHAR(20),      -- Deň
    arrival TIME,                 -- Príchod (TIME field!)
    departure TIME,               -- Odchod (TIME field!)

    -- Attendance Details
    employee_count INTEGER,       -- Počet pracovníkov
    work_time NUMERIC(10,2),      -- Pracovná doba (h)
    worked_hours NUMERIC(10,2),   -- Odpracované (h)
    wage_costs NUMERIC(15,2),     -- Mzdové náklady (EUR)

    -- Flags
    is_vacation BOOLEAN DEFAULT false,  -- Voľno

    -- Status and State
    record_status TEXT[],         -- stav záznamu (checkboxes)
    record_icons TEXT,            -- ikony záznamu

    -- Notes
    note TEXT,                    -- Poznámka (singleLine)
    note_long TEXT,               -- Poznámka (multiline)
    info TEXT,                    -- info (richtext)

    -- Logs
    debug_log TEXT,               -- Debug_Log
    error_log TEXT,               -- Error_Log

    -- UI Settings
    view_mode VARCHAR(50),        -- view (choice)
    record_color VARCHAR(20),     -- farba záznamu
    background_color VARCHAR(20), -- farba pozadia

    -- Audit Fields
    recorded_by VARCHAR(100),     -- zapísal (user)
    recorded_at TIMESTAMP,        -- dátum zápisu
    modified_by VARCHAR(100),     -- upravil (user)
    modified_at TIMESTAMP         -- dátum úpravy
);

-- Indexes for Attendance
CREATE INDEX idx_attendance_date ON memento_attendance(date);
CREATE INDEX idx_attendance_status ON memento_attendance(status);
CREATE INDEX idx_attendance_synced ON memento_attendance(synced_at);
CREATE INDEX idx_attendance_is_vacation ON memento_attendance(is_vacation);

-- ===========================================================================
-- JUNCTION TABLE: Attendance ↔ Employees (Many-to-Many)
-- Field: Zamestnanci (linkToEntry multiple)
-- ===========================================================================

CREATE TABLE memento_attendance_employees (
    attendance_id VARCHAR(255) NOT NULL,
    employee_id VARCHAR(255) NOT NULL,

    -- Order in array (optional)
    array_index INTEGER,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),

    PRIMARY KEY (attendance_id, employee_id),
    FOREIGN KEY (attendance_id) REFERENCES memento_attendance(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES memento_employees(id) ON DELETE CASCADE
);

-- Indexes for Junction Table
CREATE INDEX idx_att_emp_att ON memento_attendance_employees(attendance_id);
CREATE INDEX idx_att_emp_emp ON memento_attendance_employees(employee_id);

-- ===========================================================================
-- COMMENTS (Documentation)
-- ===========================================================================

COMMENT ON TABLE memento_employees IS 'Master data: Employees (Zamestnanci) - Library ID: nWb00Nogf';
COMMENT ON TABLE memento_attendance IS 'Transactional data: Attendance (Dochádzka) - Library ID: zNoMvrv8U';
COMMENT ON TABLE memento_attendance_employees IS 'Junction table: Attendance ↔ Employees (many-to-many)';

COMMENT ON COLUMN memento_employees.id IS 'Primary key: Memento Entry ID (long string)';
COMMENT ON COLUMN memento_employees.record_number IS 'Custom ID field (NOT primary key!) - Field: ID';
COMMENT ON COLUMN memento_employees.is_active IS 'Employee status: true=active, false=inactive (Field: Aktívny)';

COMMENT ON COLUMN memento_attendance.id IS 'Primary key: Memento Entry ID (long string)';
COMMENT ON COLUMN memento_attendance.record_number IS 'Custom ID field (NOT primary key!) - Field: ID';
COMMENT ON COLUMN memento_attendance.arrival IS 'Arrival time (LOCAL time, not UTC!) - Field: Príchod';
COMMENT ON COLUMN memento_attendance.departure IS 'Departure time (LOCAL time, not UTC!) - Field: Odchod';

-- ===========================================================================
-- VERIFICATION QUERIES
-- ===========================================================================

-- Check table structures
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name IN ('memento_employees', 'memento_attendance', 'memento_attendance_employees')
-- ORDER BY table_name, ordinal_position;

-- Count records after sync
-- SELECT 'Employees' as table, COUNT(*) as total,
--        SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active
-- FROM memento_employees;

-- SELECT 'Attendance' as table, COUNT(*) as total,
--        SUM(CASE WHEN is_vacation THEN 1 ELSE 0 END) as vacation_days
-- FROM memento_attendance;

-- SELECT 'Junction' as table, COUNT(*) as total
-- FROM memento_attendance_employees;
