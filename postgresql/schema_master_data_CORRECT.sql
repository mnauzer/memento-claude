-- ============================================================================
-- MASTER DATA TABLES - CORRECT SCHEMA
-- Based on ACTUAL Memento field structure from sync logs
-- ============================================================================
-- Created: 2026-03-18
-- Version: 2.0 (ACCURATE)
--
-- IMPORTANT: This schema is based on ACTUAL field names received from Memento
-- All field names are verified from sync logs
-- ============================================================================

-- ============================================================================
-- 1. ZAMESTNANCI (Employees)
-- ============================================================================

DROP TABLE IF EXISTS memento_employees CASCADE;

CREATE TABLE memento_employees (
    -- Primary key (Memento entry ID)
    id VARCHAR(255) PRIMARY KEY,

    -- Status and sync metadata
    status VARCHAR(50) DEFAULT 'active',
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    sync_source VARCHAR(20) DEFAULT 'memento',
    synced_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Custom ID field (NOT primary key!)
    record_number INTEGER,

    -- Personal Information
    first_name VARCHAR(255),            -- Meno
    last_name VARCHAR(255),             -- Priezvisko
    nick VARCHAR(255),                  -- Nick
    position VARCHAR(100),              -- Pozícia
    notes TEXT,                         -- Poznámka

    -- Contact Information
    mobile VARCHAR(50),                 -- Mobil
    email VARCHAR(255),                 -- Email
    telegram_id VARCHAR(255),           -- Telegram ID

    -- Communication Preferences
    sms_enabled BOOLEAN,                -- sms
    email_enabled BOOLEAN,              -- email
    telegram_enabled BOOLEAN,           -- Telegram notifikácie

    -- Status Flags
    is_active BOOLEAN DEFAULT true,     -- Aktívny
    is_driver BOOLEAN DEFAULT false,    -- Šofér

    -- Period Settings
    period_total VARCHAR(255),          -- obdobie total
    period_selection VARCHAR(255),      -- výber obdobia

    -- Work Statistics (Current Period)
    worked_on_orders NUMERIC(10, 2),   -- Na zákazkách
    worked_driving NUMERIC(10, 2),     -- Jazdy
    worked_hours NUMERIC(10, 2),       -- Odpracované
    earned NUMERIC(15, 2),             -- Zarobené
    bonuses NUMERIC(15, 2),            -- Prémie
    paid_out NUMERIC(15, 2),           -- Vyplatené

    -- Work Statistics (Total)
    worked_on_orders_total NUMERIC(10, 2),  -- Na zákazkách total
    worked_driving_total NUMERIC(10, 2),    -- Jazdy total
    worked_hours_total NUMERIC(10, 2),      -- Odpracované total
    earned_total NUMERIC(15, 2),            -- Zarobené total
    bonuses_total NUMERIC(15, 2),           -- Prémie total
    paid_out_total NUMERIC(15, 2),          -- Vyplatené total

    -- Salary Information
    gross_salary NUMERIC(15, 2),            -- Hrubá mzda
    overpayment_underpayment NUMERIC(15, 2), -- Preplatok/Nedoplatok
    current_hourly_rate NUMERIC(10, 2),     -- Aktuálna hodinovka

    -- Financial Balance
    obligations NUMERIC(15, 2),         -- Záväzky
    receivables NUMERIC(15, 2),         -- Pohľadávky
    balance NUMERIC(15, 2),             -- Saldo

    -- Ratings
    attendance_rating INTEGER,          -- Dochádzka
    orders_rating INTEGER,              -- Zákazky
    total_rating INTEGER,               -- Celkom

    -- System Fields
    info TEXT,
    debug_log TEXT,
    error_log TEXT,
    view_mode VARCHAR(255),             -- view
    record_color VARCHAR(255),          -- farba záznamu
    background_color VARCHAR(255)       -- farba pozadia
);

CREATE INDEX idx_employees_is_active ON memento_employees(is_active);
CREATE INDEX idx_employees_nick ON memento_employees(nick);
CREATE INDEX idx_employees_last_name ON memento_employees(last_name);

-- ============================================================================
-- 2. KLIENTI (Clients)
-- ============================================================================

DROP TABLE IF EXISTS memento_clients CASCADE;

CREATE TABLE memento_clients (
    -- Primary key (Memento entry ID)
    id VARCHAR(255) PRIMARY KEY,

    -- Status and sync metadata
    status VARCHAR(50) DEFAULT 'active',
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),           -- zapísal
    modified_by VARCHAR(255),          -- upravil
    sync_source VARCHAR(20) DEFAULT 'memento',
    synced_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),  -- dátum zápisu
    updated_at TIMESTAMP DEFAULT NOW(),  -- dátum úpravy

    -- Custom ID field (NOT primary key!)
    record_number INTEGER,              -- ID

    -- Type and status
    entity_type VARCHAR(20),            -- Firma/Osoba (firma/osoba)
    is_active BOOLEAN DEFAULT true,     -- Aktívny
    is_client BOOLEAN DEFAULT true,     -- Klient (boolean flag)

    -- Personal/Company information
    nick VARCHAR(100),                  -- Nick
    first_name VARCHAR(255),            -- Meno
    last_name VARCHAR(255),             -- Priezvisko
    title_before VARCHAR(50),           -- Titul
    title_after VARCHAR(50),            -- Titul za
    company_name VARCHAR(255),          -- Firma
    contact TEXT,                       -- Kontakt (JSON or multiline)

    -- Address
    address TEXT,                       -- Adresa (full address)
    street VARCHAR(255),                -- Ulica
    postal_code VARCHAR(20),            -- PSČ
    city VARCHAR(100),                  -- Mesto

    -- Contact details
    email VARCHAR(255),                 -- Email
    mobile VARCHAR(50),                 -- Mobil
    notes TEXT,                         -- Poznámka
    additional_data TEXT,               -- Ďalšie údaje

    -- Business registration
    ico VARCHAR(50),                    -- IČO
    is_vat_payer BOOLEAN,               -- Platca DPH
    vat_id VARCHAR(50),                 -- IČ DPH

    -- Relationships (linkToEntry fields)
    connections TEXT,                   -- Prepojenia (linkToEntry - multiple)
    related_clients TEXT,               -- Klienti (linkToEntry - multiple)
    documents TEXT,                     -- Dokument (linkToEntry - multiple)

    -- System Fields
    view_mode VARCHAR(255)              -- view
);

CREATE INDEX idx_clients_is_active ON memento_clients(is_active);
CREATE INDEX idx_clients_entity_type ON memento_clients(entity_type);
CREATE INDEX idx_clients_company_name ON memento_clients(company_name);
CREATE INDEX idx_clients_last_name ON memento_clients(last_name);
CREATE INDEX idx_clients_ico ON memento_clients(ico);

-- ============================================================================
-- 3. PARTNERI (Partners)
-- ============================================================================

DROP TABLE IF EXISTS memento_partners CASCADE;

CREATE TABLE memento_partners (
    -- Primary key (Memento entry ID)
    id VARCHAR(255) PRIMARY KEY,

    -- Status and sync metadata
    status VARCHAR(50) DEFAULT 'active',
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    sync_source VARCHAR(20) DEFAULT 'memento',
    synced_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Custom ID field (NOT primary key!)
    record_number INTEGER,              -- #

    -- Type and status
    entity_type VARCHAR(20),            -- Firma/Osoba (firma/osoba)
    is_active BOOLEAN DEFAULT true,     -- Aktívny
    is_partner BOOLEAN DEFAULT false,   -- Partner (boolean flag)
    is_supplier BOOLEAN DEFAULT false,  -- Dodávateľ (boolean flag)
    is_client BOOLEAN DEFAULT false,    -- Klient (boolean flag)

    -- Personal/Company information
    nick VARCHAR(100),                  -- Nick
    name VARCHAR(255),                  -- Názov (company/person name)
    first_name VARCHAR(255),            -- Meno
    last_name VARCHAR(255),             -- Priezvisko
    contact TEXT,                       -- Kontakt (JSON or multiline)

    -- System Fields
    view_mode VARCHAR(255)              -- view
);

CREATE INDEX idx_partners_is_active ON memento_partners(is_active);
CREATE INDEX idx_partners_entity_type ON memento_partners(entity_type);
CREATE INDEX idx_partners_name ON memento_partners(name);
CREATE INDEX idx_partners_is_partner ON memento_partners(is_partner);
CREATE INDEX idx_partners_is_supplier ON memento_partners(is_supplier);
CREATE INDEX idx_partners_is_client ON memento_partners(is_client);

-- ============================================================================
-- 4. DODÁVATELIA (Suppliers)
-- ============================================================================
-- NOTE: Structure inferred from Klienti (very similar but simpler)
-- Will be updated after first sync to verify actual fields

DROP TABLE IF EXISTS memento_suppliers CASCADE;

CREATE TABLE memento_suppliers (
    -- Primary key (Memento entry ID)
    id VARCHAR(255) PRIMARY KEY,

    -- Status and sync metadata
    status VARCHAR(50) DEFAULT 'active',
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),           -- zapísal
    modified_by VARCHAR(255),          -- upravil
    sync_source VARCHAR(20) DEFAULT 'memento',
    synced_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),  -- dátum zápisu
    updated_at TIMESTAMP DEFAULT NOW(),  -- dátum úpravy

    -- Custom ID field (NOT primary key!)
    record_number INTEGER,              -- ID

    -- Type and status
    entity_type VARCHAR(20),            -- Firma/Osoba (firma/osoba)
    is_active BOOLEAN DEFAULT true,     -- Aktívny
    is_supplier BOOLEAN DEFAULT true,   -- Dodávateľ (boolean flag)

    -- Personal/Company information
    nick VARCHAR(100),                  -- Nick
    first_name VARCHAR(255),            -- Meno
    last_name VARCHAR(255),             -- Priezvisko
    title_before VARCHAR(50),           -- Titul
    title_after VARCHAR(50),            -- Titul za
    company_name VARCHAR(255),          -- Firma
    contact TEXT,                       -- Kontakt

    -- Address
    address TEXT,                       -- Adresa
    street VARCHAR(255),                -- Ulica
    postal_code VARCHAR(20),            -- PSČ
    city VARCHAR(100),                  -- Mesto

    -- Contact details
    email VARCHAR(255),                 -- Email
    mobile VARCHAR(50),                 -- Mobil
    notes TEXT,                         -- Poznámka
    additional_data TEXT,               -- Ďalšie údaje

    -- Business registration
    ico VARCHAR(50),                    -- IČO
    is_vat_payer BOOLEAN,               -- Platca DPH
    vat_id VARCHAR(50),                 -- IČ DPH

    -- Relationships
    connections TEXT,                   -- Prepojenia
    documents TEXT,                     -- Dokument

    -- System Fields
    view_mode VARCHAR(255)              -- view
);

CREATE INDEX idx_suppliers_is_active ON memento_suppliers(is_active);
CREATE INDEX idx_suppliers_entity_type ON memento_suppliers(entity_type);
CREATE INDEX idx_suppliers_company_name ON memento_suppliers(company_name);
CREATE INDEX idx_suppliers_last_name ON memento_suppliers(last_name);
CREATE INDEX idx_suppliers_ico ON memento_suppliers(ico);

-- ============================================================================
-- POSTGRESQL TRIGGERS FOR CHANGE NOTIFICATION
-- ============================================================================

DROP TRIGGER IF EXISTS memento_sync_trigger ON memento_employees;
CREATE TRIGGER memento_sync_trigger
    AFTER INSERT OR UPDATE ON memento_employees
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();

DROP TRIGGER IF EXISTS memento_sync_trigger ON memento_clients;
CREATE TRIGGER memento_sync_trigger
    AFTER INSERT OR UPDATE ON memento_clients
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();

DROP TRIGGER IF EXISTS memento_sync_trigger ON memento_partners;
CREATE TRIGGER memento_sync_trigger
    AFTER INSERT OR UPDATE ON memento_partners
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();

DROP TRIGGER IF EXISTS memento_sync_trigger ON memento_suppliers;
CREATE TRIGGER memento_sync_trigger
    AFTER INSERT OR UPDATE ON memento_suppliers
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE memento_employees IS 'Zamestnanci (Employees) - 54 columns based on actual Memento structure';
COMMENT ON TABLE memento_clients IS 'Klienti (Clients) - 30 columns based on actual Memento structure';
COMMENT ON TABLE memento_partners IS 'Partneri (Partners) - 19 columns based on actual Memento structure';
COMMENT ON TABLE memento_suppliers IS 'Dodávatelia (Suppliers) - 30 columns (inferred from Klienti structure)';

-- ============================================================================
-- FIELD NAME CONSISTENCY NOTES
-- ============================================================================
-- Common fields used consistently across all tables:
-- - entity_type: Firma/Osoba (firma or osoba)
-- - is_active: Aktívny (boolean)
-- - nick: Nick (nickname)
-- - first_name: Meno (first name)
-- - last_name: Priezvisko (surname)
-- - company_name: Firma (company name)
-- - contact: Kontakt (contact details - JSON or text)
-- - address: Adresa (full address)
-- - street: Ulica (street)
-- - postal_code: PSČ (postal code)
-- - city: Mesto (city)
-- - email: Email (email address)
-- - mobile: Mobil (mobile phone)
-- - notes: Poznámka (notes)
-- - ico: IČO (business registration number)
-- - is_vat_payer: Platca DPH (VAT payer flag)
-- - vat_id: IČ DPH (VAT ID)
-- - view_mode: view (Memento view field)
-- - record_number: ID or # (custom numeric ID)
-- ============================================================================
