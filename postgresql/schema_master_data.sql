-- PostgreSQL Schema for Memento Master Data Libraries
-- Generated: 2026-03-18
-- Libraries: Zamestnanci, Dodávatelia, Partneri, Klienti, Miesta

-- ============================================================================
-- SYNC ORDER: Create tables in dependency order
-- 1. Zamestnanci (Employees) - no dependencies
-- 2. Dodávatelia (Suppliers) - no dependencies
-- 3. Klienti (Clients) - self-referencing
-- 4. Partneri (Partners) - references Dodávatelia, Klienti
-- 5. Miesta (Places) - references all above
-- ============================================================================

-- ============================================================================
-- 1. ZAMESTNANCI (Employees)
-- ============================================================================

CREATE TABLE IF NOT EXISTS memento_employees (
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
    record_number INTEGER UNIQUE,

    -- Personal information
    name VARCHAR(255),
    surname VARCHAR(255),
    nickname VARCHAR(255),
    position VARCHAR(100),

    -- Work hours (for selected period)
    period_total VARCHAR(100),
    period_selection VARCHAR(100),
    hours_on_orders NUMERIC(10,2),
    hours_driving NUMERIC(10,2),
    hours_worked NUMERIC(10,2),
    earned NUMERIC(15,2),
    bonuses NUMERIC(15,2),
    paid_out NUMERIC(15,2),

    -- Work hours (total)
    hours_on_orders_total NUMERIC(10,2),
    hours_driving_total NUMERIC(10,2),
    hours_worked_total NUMERIC(10,2),
    earned_total NUMERIC(15,2),
    bonuses_total NUMERIC(15,2),
    paid_out_total NUMERIC(15,2),

    -- Wages
    gross_wage NUMERIC(15,2),
    overpayment_underpayment NUMERIC(15,2),
    current_hourly_rate NUMERIC(10,2),

    -- Financial balance
    obligations NUMERIC(15,2),
    receivables NUMERIC(15,2),
    balance NUMERIC(15,2),

    -- Contact & notifications
    send_sms BOOLEAN DEFAULT false,
    mobile VARCHAR(50),
    send_email BOOLEAN DEFAULT false,
    email_address VARCHAR(255),
    telegram_notifications BOOLEAN DEFAULT false,
    telegram_id VARCHAR(100),

    -- Status flags
    is_active BOOLEAN DEFAULT true,
    is_driver BOOLEAN DEFAULT false,

    -- Ratings
    attendance_rating INTEGER,
    orders_rating INTEGER,
    total_rating INTEGER,

    -- Additional fields
    note TEXT,
    view_mode VARCHAR(50),
    record_color VARCHAR(20),
    background_color VARCHAR(20),

    -- Info and logs
    entry_info TEXT,
    debug_log TEXT,
    error_log TEXT
);

CREATE INDEX idx_employees_is_active ON memento_employees(is_active);
CREATE INDEX idx_employees_is_driver ON memento_employees(is_driver);
CREATE INDEX idx_employees_surname ON memento_employees(surname);
CREATE INDEX idx_employees_record_number ON memento_employees(record_number);

-- ============================================================================
-- 2. DODÁVATELIA (Suppliers)
-- ============================================================================

CREATE TABLE IF NOT EXISTS memento_suppliers (
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
    record_number INTEGER UNIQUE,

    -- Supplier information
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Address
    street VARCHAR(255),
    postal_code VARCHAR(20),
    city VARCHAR(100),

    -- Contact
    website VARCHAR(255),
    email VARCHAR(255),

    -- Info and logs
    entry_info TEXT,
    debug_log TEXT,
    error_log TEXT,

    -- System fields
    created_date DATE,
    modified_date DATE,
    modified_by VARCHAR(255)
);

CREATE INDEX idx_suppliers_name ON memento_suppliers(name);
CREATE INDEX idx_suppliers_record_number ON memento_suppliers(record_number);

-- ============================================================================
-- 3. KLIENTI (Clients)
-- ============================================================================

CREATE TABLE IF NOT EXISTS memento_clients (
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
    record_number INTEGER UNIQUE,

    -- Type and status
    entity_type VARCHAR(20), -- 'firma' or 'osoba'
    is_active BOOLEAN DEFAULT true,

    -- Personal/Company information
    nickname VARCHAR(100),
    first_name VARCHAR(255),
    surname VARCHAR(255),
    title_before VARCHAR(50),
    title_after VARCHAR(50),
    company_name VARCHAR(255),
    contact TEXT,

    -- Address
    street VARCHAR(255),
    postal_code VARCHAR(20),
    city VARCHAR(100),

    -- Contact
    email VARCHAR(255),
    mobile VARCHAR(50),

    -- Additional information
    note TEXT,
    company_id_number VARCHAR(50),
    vat_payer BOOLEAN DEFAULT false,
    vat_number VARCHAR(50),

    -- Info and logs
    entry_info TEXT,
    debug_log TEXT,
    error_log TEXT,

    -- System fields
    view_mode VARCHAR(50),
    created_date DATE,
    modified_date DATE,
    modified_by VARCHAR(255)
);

CREATE INDEX idx_clients_is_active ON memento_clients(is_active);
CREATE INDEX idx_clients_entity_type ON memento_clients(entity_type);
CREATE INDEX idx_clients_surname ON memento_clients(surname);
CREATE INDEX idx_clients_company_name ON memento_clients(company_name);
CREATE INDEX idx_clients_record_number ON memento_clients(record_number);

-- Junction table for client self-references
CREATE TABLE IF NOT EXISTS memento_clients_related (
    client_id VARCHAR(255) REFERENCES memento_clients(id) ON DELETE CASCADE,
    related_client_id VARCHAR(255) REFERENCES memento_clients(id) ON DELETE CASCADE,
    PRIMARY KEY (client_id, related_client_id)
);

-- ============================================================================
-- 4. PARTNERI (Partners)
-- ============================================================================

CREATE TABLE IF NOT EXISTS memento_partners (
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

    -- Type and status
    entity_type VARCHAR(20), -- 'firma' or 'osoba'
    is_active BOOLEAN DEFAULT true,

    -- Personal/Company information
    nickname VARCHAR(100),
    name VARCHAR(255),
    first_name VARCHAR(255),
    surname VARCHAR(255),
    contact TEXT,

    -- References to other entities
    supplier_id VARCHAR(255) REFERENCES memento_suppliers(id) ON DELETE SET NULL,
    client_id VARCHAR(255) REFERENCES memento_clients(id) ON DELETE SET NULL,

    -- System fields
    view_mode VARCHAR(50)
);

CREATE INDEX idx_partners_is_active ON memento_partners(is_active);
CREATE INDEX idx_partners_entity_type ON memento_partners(entity_type);
CREATE INDEX idx_partners_supplier_id ON memento_partners(supplier_id);
CREATE INDEX idx_partners_client_id ON memento_partners(client_id);

-- Junction table for partner self-references
CREATE TABLE IF NOT EXISTS memento_partners_related (
    partner_id VARCHAR(255) REFERENCES memento_partners(id) ON DELETE CASCADE,
    related_partner_id VARCHAR(255) REFERENCES memento_partners(id) ON DELETE CASCADE,
    PRIMARY KEY (partner_id, related_partner_id)
);

-- ============================================================================
-- 5. MIESTA (Places)
-- ============================================================================

CREATE TABLE IF NOT EXISTS memento_places (
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
    record_number INTEGER UNIQUE,

    -- Place information
    name VARCHAR(255) NOT NULL,
    locality VARCHAR(255),
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    is_order BOOLEAN DEFAULT false,

    -- Location
    address TEXT,
    gps_location JSONB, -- Store GPS coordinates as JSON {lat, lon}
    distance NUMERIC(10,2), -- in km
    drive_time INTEGER, -- in minutes

    -- References to other entities
    client_id VARCHAR(255) REFERENCES memento_clients(id) ON DELETE SET NULL,
    supplier_id VARCHAR(255) REFERENCES memento_suppliers(id) ON DELETE SET NULL,
    partner_id VARCHAR(255) REFERENCES memento_partners(id) ON DELETE SET NULL,
    employee_id VARCHAR(255) REFERENCES memento_employees(id) ON DELETE SET NULL,

    -- Additional fields
    note TEXT,
    photos_garden TEXT, -- Image field - store as JSON array of URLs
    photos_irrigation TEXT, -- Image field - store as JSON array of URLs

    -- Info and logs
    entry_info TEXT,
    debug_log TEXT,
    error_log TEXT,

    -- System fields
    view_mode VARCHAR(50),
    created_date DATE,
    modified_date DATE,
    modified_by VARCHAR(255),
    record_icons TEXT
);

CREATE INDEX idx_places_is_active ON memento_places(is_active);
CREATE INDEX idx_places_is_order ON memento_places(is_order);
CREATE INDEX idx_places_category ON memento_places(category);
CREATE INDEX idx_places_name ON memento_places(name);
CREATE INDEX idx_places_client_id ON memento_places(client_id);
CREATE INDEX idx_places_supplier_id ON memento_places(supplier_id);
CREATE INDEX idx_places_partner_id ON memento_places(partner_id);
CREATE INDEX idx_places_employee_id ON memento_places(employee_id);
CREATE INDEX idx_places_record_number ON memento_places(record_number);

-- ============================================================================
-- PostgreSQL Triggers for Change Notification
-- ============================================================================

-- Create notification function if it doesn't exist
CREATE OR REPLACE FUNCTION notify_memento_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
BEGIN
    -- Skip if this change came from Memento sync (avoid loop)
    IF NEW.sync_source = 'memento' THEN
        RETURN NEW;
    END IF;

    -- Build notification payload
    payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'id', NEW.id,
        'pg_modified_time', NEW.pg_modified_time
    );

    -- Notify Python listener
    PERFORM pg_notify('memento_sync_channel', payload::text);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all master data tables
DROP TRIGGER IF EXISTS memento_sync_trigger ON memento_employees;
CREATE TRIGGER memento_sync_trigger
    AFTER INSERT OR UPDATE ON memento_employees
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();

DROP TRIGGER IF EXISTS memento_sync_trigger ON memento_suppliers;
CREATE TRIGGER memento_sync_trigger
    AFTER INSERT OR UPDATE ON memento_suppliers
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();

DROP TRIGGER IF EXISTS memento_sync_trigger ON memento_clients;
CREATE TRIGGER memento_sync_trigger
    AFTER INSERT OR UPDATE ON memento_clients
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();

DROP TRIGGER IF EXISTS memento_sync_trigger ON memento_partners;
CREATE TRIGGER memento_sync_trigger
    AFTER INSERT OR UPDATE ON memento_partners
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();

DROP TRIGGER IF EXISTS memento_sync_trigger ON memento_places;
CREATE TRIGGER memento_sync_trigger
    AFTER INSERT OR UPDATE ON memento_places
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE memento_employees IS 'Zamestnanci (Employees) - Master data for employees with work hours and wages';
COMMENT ON TABLE memento_suppliers IS 'Dodávatelia (Suppliers) - Master data for suppliers';
COMMENT ON TABLE memento_clients IS 'Klienti (Clients) - Master data for clients (both individuals and companies)';
COMMENT ON TABLE memento_partners IS 'Partneri (Partners) - Master data for business partners';
COMMENT ON TABLE memento_places IS 'Miesta (Places) - Master data for locations with GPS coordinates';

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Custom "ID" field is mapped to "record_number" column (NOT primary key!)
-- 2. Primary key "id" is always the Memento entry ID
-- 3. All foreign keys use ON DELETE SET NULL (preserve referential integrity)
-- 4. Junction tables use ON DELETE CASCADE (clean up orphaned relationships)
-- 5. GPS location stored as JSONB for flexible querying
-- 6. Image fields stored as JSON arrays of URLs
-- 7. All tables have PostgreSQL triggers for change notification
-- 8. Sync order: Zamestnanci → Dodávatelia → Klienti → Partneri → Miesta
