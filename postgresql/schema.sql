-- ==================================================
-- Memento PostgreSQL Mirror Database Schema
-- ==================================================
-- This schema mirrors 36 Memento Database libraries for bidirectional sync
--
-- Generated: 2026-03-17
-- PostgreSQL Version: 14+
-- Database: memento_mirror
--
-- Organization:
--   1. Database & Extensions
--   2. System Tables (sync metadata, logs, conflicts)
--   3. Data Tables (36 Memento libraries)
--   4. Junction Tables (many-to-many relationships)
--   5. Indexes
--   6. Trigger Functions
--   7. Triggers (per table)
-- ==================================================

-- ==================================================
-- 1. DATABASE & EXTENSIONS
-- ==================================================

-- Create database (run separately if needed)
-- CREATE DATABASE memento_mirror WITH ENCODING 'UTF8';

-- Connect to database
\c memento_mirror

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Text search (trigram matching)
CREATE EXTENSION IF NOT EXISTS "postgis";        -- Geography/geometry types (for GPS)

-- ==================================================
-- 2. SYSTEM TABLES
-- ==================================================

-- Sync operation log
CREATE TABLE memento_sync_log (
    id SERIAL PRIMARY KEY,
    library_id VARCHAR(255),
    library_name VARCHAR(255),
    entry_id VARCHAR(255),
    sync_direction VARCHAR(20) NOT NULL,  -- 'memento_to_pg' or 'pg_to_memento'
    sync_time TIMESTAMP DEFAULT NOW(),
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    metadata JSONB
);

CREATE INDEX idx_sync_log_entry ON memento_sync_log(library_id, entry_id);
CREATE INDEX idx_sync_log_time ON memento_sync_log(sync_time DESC);
CREATE INDEX idx_sync_log_errors ON memento_sync_log(success) WHERE success = false;

-- Conflict tracking
CREATE TABLE memento_sync_conflicts (
    id SERIAL PRIMARY KEY,
    library_id VARCHAR(255),
    library_name VARCHAR(255),
    entry_id VARCHAR(255),
    conflict_time TIMESTAMP DEFAULT NOW(),
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP,
    resolution VARCHAR(50) NOT NULL,  -- 'memento_wins', 'pg_wins', 'manual'
    conflict_data JSONB,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(255)
);

CREATE INDEX idx_conflicts_entry ON memento_sync_conflicts(library_id, entry_id);
CREATE INDEX idx_conflicts_unresolved ON memento_sync_conflicts(resolved) WHERE resolved = false;

-- Per-library sync metadata
CREATE TABLE memento_sync_metadata (
    library_id VARCHAR(255) PRIMARY KEY,
    library_name VARCHAR(255) NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    last_sync TIMESTAMP,
    last_bulk_sync TIMESTAMP,
    entry_count INTEGER DEFAULT 0,
    last_error TEXT,
    sync_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================================================
-- 3. DATA TABLES - DAILY RECORDS & LOGS (5)
-- ==================================================

-- Denný report (Daily Report)
CREATE TABLE memento_daily_report (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    date DATE NOT NULL,
    day_of_week VARCHAR(20),
    record_icons TEXT,
    record_description TEXT,
    description TEXT,
    hours_worked NUMERIC(10,2),

    -- Info aggregations (from related records)
    info_attendance TEXT,
    info_work_records TEXT,
    info_cash_book TEXT,
    info_ride_log TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_daily_report_date ON memento_daily_report(date DESC);
CREATE INDEX idx_daily_report_status ON memento_daily_report(status);
CREATE INDEX idx_daily_report_modified ON memento_daily_report(memento_modified_time DESC);

-- Dochádzka (Attendance)
CREATE TABLE memento_attendance (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    date DATE NOT NULL,
    day_of_week VARCHAR(20),
    arrival TIME,
    departure TIME,
    employee_count INTEGER,
    work_time NUMERIC(10,2),
    worked_hours NUMERIC(10,2),
    worked_on_orders NUMERIC(10,2),
    down_time NUMERIC(10,2),
    wage_costs NUMERIC(15,2),
    entry_status TEXT,  -- multi-checkboxes
    day_off_reason VARCHAR(100),
    entry_icons TEXT,
    note TEXT,
    entry_info TEXT,
    entry_photo TEXT,  -- URL or path
    info_rich TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attendance_date ON memento_attendance(date DESC);
CREATE INDEX idx_attendance_status ON memento_attendance(status);
CREATE INDEX idx_attendance_modified ON memento_attendance(memento_modified_time DESC);

-- Záznam prác (Work Records)
CREATE TABLE memento_work_records (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    date DATE NOT NULL,
    order_id VARCHAR(255),  -- FK to memento_orders
    hzs NUMERIC(15,2),  -- Hourly billing rate
    work_description TEXT,
    employee_count INTEGER,
    work_time NUMERIC(10,2),
    worked_hours NUMERIC(10,2),
    wage_costs NUMERIC(15,2),
    hzs_sum NUMERIC(15,2),
    machines_sum NUMERIC(15,2),
    machines_costs NUMERIC(15,2),
    work_items_sum NUMERIC(15,2),
    start_time TIME,
    end_time TIME,
    icons TEXT,
    daily_report_id VARCHAR(255),  -- FK to memento_daily_report

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_work_records_date ON memento_work_records(date DESC);
CREATE INDEX idx_work_records_order ON memento_work_records(order_id);
CREATE INDEX idx_work_records_status ON memento_work_records(status);
CREATE INDEX idx_work_records_modified ON memento_work_records(memento_modified_time DESC);

-- Kniha jázd (Ride Log)
CREATE TABLE memento_ride_log (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    date DATE NOT NULL,
    ride_type VARCHAR(100),
    ride_purpose VARCHAR(255),
    ride_description TEXT,
    vehicle_id VARCHAR(255),  -- FK to memento_vehicles
    driver_id VARCHAR(255),  -- FK to memento_employees
    rate NUMERIC(10,2),
    km NUMERIC(10,2),
    wage_costs NUMERIC(15,2),
    vehicle_costs NUMERIC(15,2),
    ride_time NUMERIC(10,2),  -- Hours
    stop_time NUMERIC(10,2),  -- Hours
    total_time NUMERIC(10,2),  -- Hours
    start_location VARCHAR(255),
    destination VARCHAR(255),
    stops TEXT,  -- JSON array or comma-separated
    icons TEXT,
    daily_report_id VARCHAR(255),  -- FK to memento_daily_report

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ride_log_date ON memento_ride_log(date DESC);
CREATE INDEX idx_ride_log_vehicle ON memento_ride_log(vehicle_id);
CREATE INDEX idx_ride_log_driver ON memento_ride_log(driver_id);
CREATE INDEX idx_ride_log_status ON memento_ride_log(status);
CREATE INDEX idx_ride_log_modified ON memento_ride_log(memento_modified_time DESC);

-- Pokladňa (Cash Book)
CREATE TABLE memento_cash_book (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    date DATE NOT NULL,
    transaction_type VARCHAR(50),  -- Príjem, Výdaj, PP
    from_account_id VARCHAR(255),  -- FK to memento_accounts
    to_account_id VARCHAR(255),  -- FK to memento_accounts
    paid_by_id VARCHAR(255),  -- FK to memento_employees
    paid_to_id VARCHAR(255),  -- FK to memento_employees
    obligation_payment BOOLEAN DEFAULT false,
    obligation_type VARCHAR(100),
    offset_claim BOOLEAN DEFAULT false,
    from_overpayment_create VARCHAR(100),
    transfer_purpose VARCHAR(255),
    record_to_customer BOOLEAN DEFAULT false,
    order_id VARCHAR(255),  -- FK to memento_orders
    operational_overhead VARCHAR(255),
    tool_id VARCHAR(255),  -- FK to memento_machinery
    vehicle_id VARCHAR(255),  -- FK to memento_vehicles
    financial_fees VARCHAR(255),
    employee_id VARCHAR(255),  -- FK to memento_employees
    supplier_id VARCHAR(255),  -- FK to memento_suppliers
    partner_id VARCHAR(255),  -- FK to memento_partners
    sum NUMERIC(15,2),
    sum_total NUMERIC(15,2),  -- with VAT
    vat NUMERIC(15,2),
    description TEXT,
    note TEXT,
    document_image TEXT,  -- URL or path
    is_vat BOOLEAN DEFAULT false,
    vat_rate VARCHAR(50),
    vat_rate_value NUMERIC(5,2),

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cash_book_date ON memento_cash_book(date DESC);
CREATE INDEX idx_cash_book_type ON memento_cash_book(transaction_type);
CREATE INDEX idx_cash_book_order ON memento_cash_book(order_id);
CREATE INDEX idx_cash_book_status ON memento_cash_book(status);
CREATE INDEX idx_cash_book_modified ON memento_cash_book(memento_modified_time DESC);

-- ==================================================
-- 3. DATA TABLES - REPORTS & OUTPUTS (4)
-- ==================================================

-- Výkaz prác (Work Report)
CREATE TABLE memento_work_report (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    date DATE NOT NULL,
    identifier VARCHAR(255) UNIQUE,
    description TEXT,
    report_type VARCHAR(100),
    price_calculation VARCHAR(100),
    order_id VARCHAR(255),  -- FK to memento_orders
    total_hours NUMERIC(10,2),
    hzs_sum NUMERIC(15,2),
    hzs_count INTEGER,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_work_report_date ON memento_work_report(date DESC);
CREATE INDEX idx_work_report_order ON memento_work_report(order_id);
CREATE INDEX idx_work_report_identifier ON memento_work_report(identifier);

-- Výkaz materiálu (Materials Report)
CREATE TABLE memento_materials_report (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    date DATE NOT NULL,
    identifier VARCHAR(255) UNIQUE,
    description TEXT,
    order_id VARCHAR(255),  -- FK to memento_orders
    total_quantity NUMERIC(15,2),
    purchase_price_total NUMERIC(15,2),
    sell_price_total NUMERIC(15,2),
    margin_total NUMERIC(15,2),
    vat_total NUMERIC(15,2),
    sum_with_vat NUMERIC(15,2),
    material_count INTEGER,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_materials_report_date ON memento_materials_report(date DESC);
CREATE INDEX idx_materials_report_order ON memento_materials_report(order_id);

-- Výkaz dopravy (Ride Report)
CREATE TABLE memento_ride_report (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    date DATE NOT NULL,
    number VARCHAR(255),
    description TEXT,
    report_type VARCHAR(100),
    order_id VARCHAR(255),  -- FK to memento_orders
    km_total NUMERIC(10,2),
    hours_total NUMERIC(10,2),
    ride_count INTEGER,
    wage_costs_total NUMERIC(15,2),
    transport_costs NUMERIC(15,2),
    sum NUMERIC(15,2),

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ride_report_date ON memento_ride_report(date DESC);
CREATE INDEX idx_ride_report_order ON memento_ride_report(order_id);

-- Výkaz strojov (Machines Report)
CREATE TABLE memento_machines_report (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    date DATE NOT NULL,
    order_id VARCHAR(255),  -- FK to memento_orders
    sum_without_vat NUMERIC(15,2),
    vat NUMERIC(15,2),
    sum_with_vat NUMERIC(15,2),

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_machines_report_date ON memento_machines_report(date DESC);
CREATE INDEX idx_machines_report_order ON memento_machines_report(order_id);

-- ==================================================
-- 3. DATA TABLES - MASTER DATA (6)
-- ==================================================

-- Zamestnanci (Employees)
CREATE TABLE memento_employees (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    telegram_id VARCHAR(100),
    hourly_rate NUMERIC(10,2),
    position VARCHAR(255),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_employees_name ON memento_employees(name);
CREATE INDEX idx_employees_active ON memento_employees(is_active);
CREATE INDEX idx_employees_telegram ON memento_employees(telegram_id);

-- Dodávatelia (Suppliers)
CREATE TABLE memento_suppliers (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    name VARCHAR(255) NOT NULL,
    ico VARCHAR(50),
    dic VARCHAR(50),
    ic_dph VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    contact_person VARCHAR(255),
    note TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_suppliers_name ON memento_suppliers(name);
CREATE INDEX idx_suppliers_ico ON memento_suppliers(ico);

-- Partneri (Partners)
CREATE TABLE memento_partners (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    name VARCHAR(255) NOT NULL,
    ico VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(50),
    telegram_id VARCHAR(100),
    address TEXT,
    note TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_partners_name ON memento_partners(name);
CREATE INDEX idx_partners_telegram ON memento_partners(telegram_id);

-- Klienti (Clients)
CREATE TABLE memento_clients (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    name VARCHAR(255) NOT NULL,
    ico VARCHAR(50),
    dic VARCHAR(50),
    ic_dph VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(50),
    telegram_id VARCHAR(100),
    address TEXT,
    contact_person VARCHAR(255),
    note TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_clients_name ON memento_clients(name);
CREATE INDEX idx_clients_ico ON memento_clients(ico);
CREATE INDEX idx_clients_telegram ON memento_clients(telegram_id);

-- Vozidlá (Vehicles)
CREATE TABLE memento_vehicles (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(50),
    brand VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    km_rate NUMERIC(10,2),  -- Cost per km
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vehicles_name ON memento_vehicles(name);
CREATE INDEX idx_vehicles_registration ON memento_vehicles(registration_number);

-- Mechanizácia (Machinery)
CREATE TABLE memento_machinery (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    hourly_rate NUMERIC(10,2),
    pausal_rate NUMERIC(10,2),
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_machinery_name ON memento_machinery(name);
CREATE INDEX idx_machinery_type ON memento_machinery(type);

-- ==================================================
-- 3. DATA TABLES - LOCATIONS & CATALOGS (4)
-- ==================================================

-- Miesta (Places)
CREATE TABLE memento_places (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    gps_coordinates VARCHAR(100),  -- "lat,lng"
    note TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_places_name ON memento_places(name);
CREATE INDEX idx_places_city ON memento_places(city);

-- Adresy (Addresses)
CREATE TABLE memento_addresses (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    street VARCHAR(255),
    house_number VARCHAR(50),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Slovakia',
    full_address TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_addresses_city ON memento_addresses(city);
CREATE INDEX idx_addresses_postal ON memento_addresses(postal_code);

-- Cenník prác (Price List Work)
CREATE TABLE memento_price_list_work (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50),
    unit_price NUMERIC(15,2),
    vat_rate NUMERIC(5,2),
    price_with_vat NUMERIC(15,2),
    category VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_price_list_work_name ON memento_price_list_work(name);
CREATE INDEX idx_price_list_work_category ON memento_price_list_work(category);

-- Materiál (Materials)
CREATE TABLE memento_materials (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    unit VARCHAR(50),
    quantity NUMERIC(15,2),
    purchase_price NUMERIC(15,2),
    sell_price NUMERIC(15,2),
    vat_rate NUMERIC(5,2),
    margin NUMERIC(5,2),
    category VARCHAR(100),
    supplier_id VARCHAR(255),  -- FK to memento_suppliers
    description TEXT,
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_materials_name ON memento_materials(name);
CREATE INDEX idx_materials_code ON memento_materials(code);
CREATE INDEX idx_materials_category ON memento_materials(category);

-- ==================================================
-- 3. DATA TABLES - INVENTORY MOVEMENT (2)
-- ==================================================

-- Výdajky materiálu (Material Expenses)
CREATE TABLE memento_material_expenses (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    date DATE NOT NULL,
    material_id VARCHAR(255),  -- FK to memento_materials
    quantity NUMERIC(15,2),
    unit VARCHAR(50),
    price_per_unit NUMERIC(15,2),
    total_price NUMERIC(15,2),
    order_id VARCHAR(255),  -- FK to memento_orders
    issued_to_id VARCHAR(255),  -- FK to memento_employees
    note TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_material_expenses_date ON memento_material_expenses(date DESC);
CREATE INDEX idx_material_expenses_material ON memento_material_expenses(material_id);
CREATE INDEX idx_material_expenses_order ON memento_material_expenses(order_id);

-- Príjemky materiálu (Material Receipts)
CREATE TABLE memento_material_receipts (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    date DATE NOT NULL,
    material_id VARCHAR(255),  -- FK to memento_materials
    quantity NUMERIC(15,2),
    unit VARCHAR(50),
    price_per_unit NUMERIC(15,2),
    total_price NUMERIC(15,2),
    supplier_id VARCHAR(255),  -- FK to memento_suppliers
    invoice_number VARCHAR(100),
    received_by_id VARCHAR(255),  -- FK to memento_employees
    note TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_material_receipts_date ON memento_material_receipts(date DESC);
CREATE INDEX idx_material_receipts_material ON memento_material_receipts(material_id);
CREATE INDEX idx_material_receipts_supplier ON memento_material_receipts(supplier_id);

-- ==================================================
-- 3. DATA TABLES - BUSINESS DOCUMENTS (5)
-- ==================================================

-- Cenové ponuky (Quotes)
CREATE TABLE memento_quotes (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    date DATE NOT NULL,
    quote_number VARCHAR(100) UNIQUE,
    client_id VARCHAR(255),  -- FK to memento_clients
    valid_until DATE,
    description TEXT,
    total_sum NUMERIC(15,2),
    vat NUMERIC(15,2),
    sum_with_vat NUMERIC(15,2),
    quote_status VARCHAR(50),  -- Draft, Sent, Accepted, Rejected
    note TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_quotes_date ON memento_quotes(date DESC);
CREATE INDEX idx_quotes_number ON memento_quotes(quote_number);
CREATE INDEX idx_quotes_client ON memento_quotes(client_id);
CREATE INDEX idx_quotes_status ON memento_quotes(quote_status);

-- Cenové ponuky Diely (Quote Parts)
CREATE TABLE memento_quote_parts (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    quote_id VARCHAR(255) NOT NULL,  -- FK to memento_quotes
    item_name VARCHAR(255),
    unit VARCHAR(50),
    quantity NUMERIC(15,2),
    unit_price NUMERIC(15,2),
    total_price NUMERIC(15,2),
    vat_rate NUMERIC(5,2),
    description TEXT,
    sort_order INTEGER,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_quote_parts_quote ON memento_quote_parts(quote_id);

-- Zákazky (Orders)
CREATE TABLE memento_orders (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    date DATE NOT NULL,
    order_number VARCHAR(100) UNIQUE,
    order_name VARCHAR(255) NOT NULL,
    client_id VARCHAR(255),  -- FK to memento_clients
    quote_id VARCHAR(255),  -- FK to memento_quotes (if created from quote)
    start_date DATE,
    end_date DATE,
    order_status VARCHAR(50),  -- Planning, In Progress, Completed, Invoiced
    telegram_group_id VARCHAR(255),  -- Telegram chat ID
    description TEXT,
    note TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_date ON memento_orders(date DESC);
CREATE INDEX idx_orders_number ON memento_orders(order_number);
CREATE INDEX idx_orders_client ON memento_orders(client_id);
CREATE INDEX idx_orders_status ON memento_orders(order_status);
CREATE INDEX idx_orders_name ON memento_orders(order_name);

-- Zákazky Diely (Order Parts)
CREATE TABLE memento_order_parts (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    order_id VARCHAR(255) NOT NULL,  -- FK to memento_orders
    item_name VARCHAR(255),
    unit VARCHAR(50),
    quantity NUMERIC(15,2),
    unit_price NUMERIC(15,2),
    total_price NUMERIC(15,2),
    vat_rate NUMERIC(5,2),
    description TEXT,
    sort_order INTEGER,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_order_parts_order ON memento_order_parts(order_id);

-- Vyúčtovania (Settlements)
CREATE TABLE memento_settlements (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    date DATE NOT NULL,
    settlement_number VARCHAR(100),
    order_id VARCHAR(255),  -- FK to memento_orders
    client_id VARCHAR(255),  -- FK to memento_clients
    period_from DATE,
    period_to DATE,
    work_sum NUMERIC(15,2),
    materials_sum NUMERIC(15,2),
    transport_sum NUMERIC(15,2),
    machinery_sum NUMERIC(15,2),
    total_sum NUMERIC(15,2),
    vat NUMERIC(15,2),
    sum_with_vat NUMERIC(15,2),
    description TEXT,
    note TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_settlements_date ON memento_settlements(date DESC);
CREATE INDEX idx_settlements_order ON memento_settlements(order_id);
CREATE INDEX idx_settlements_client ON memento_settlements(client_id);

-- ==================================================
-- 3. DATA TABLES - FINANCIAL DOCUMENTS (4)
-- ==================================================

-- Pohľadávky (Receivables)
CREATE TABLE memento_receivables (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    date DATE NOT NULL,
    due_date DATE,
    debtor_id VARCHAR(255),  -- FK to memento_clients (who owes)
    order_id VARCHAR(255),  -- FK to memento_orders
    amount NUMERIC(15,2),
    paid_amount NUMERIC(15,2) DEFAULT 0,
    remaining_amount NUMERIC(15,2),
    payment_status VARCHAR(50),  -- Unpaid, Partial, Paid, Overdue
    description TEXT,
    note TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_receivables_date ON memento_receivables(date DESC);
CREATE INDEX idx_receivables_due ON memento_receivables(due_date);
CREATE INDEX idx_receivables_debtor ON memento_receivables(debtor_id);
CREATE INDEX idx_receivables_status ON memento_receivables(payment_status);

-- Záväzky (Obligations)
CREATE TABLE memento_obligations (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    date DATE NOT NULL,
    due_date DATE,
    creditor_id VARCHAR(255),  -- FK to memento_suppliers (who we owe)
    order_id VARCHAR(255),  -- FK to memento_orders
    amount NUMERIC(15,2),
    paid_amount NUMERIC(15,2) DEFAULT 0,
    remaining_amount NUMERIC(15,2),
    payment_status VARCHAR(50),  -- Unpaid, Partial, Paid, Overdue
    description TEXT,
    note TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_obligations_date ON memento_obligations(date DESC);
CREATE INDEX idx_obligations_due ON memento_obligations(due_date);
CREATE INDEX idx_obligations_creditor ON memento_obligations(creditor_id);
CREATE INDEX idx_obligations_status ON memento_obligations(payment_status);

-- Vystavené faktúry (Issued Invoices)
CREATE TABLE memento_issued_invoices (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    date DATE NOT NULL,
    invoice_number VARCHAR(100) UNIQUE,
    client_id VARCHAR(255),  -- FK to memento_clients
    order_id VARCHAR(255),  -- FK to memento_orders
    due_date DATE,
    total_sum NUMERIC(15,2),
    vat NUMERIC(15,2),
    sum_with_vat NUMERIC(15,2),
    payment_status VARCHAR(50),  -- Unpaid, Partial, Paid, Overdue
    paid_date DATE,
    description TEXT,
    note TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_issued_invoices_date ON memento_issued_invoices(date DESC);
CREATE INDEX idx_issued_invoices_number ON memento_issued_invoices(invoice_number);
CREATE INDEX idx_issued_invoices_client ON memento_issued_invoices(client_id);
CREATE INDEX idx_issued_invoices_status ON memento_issued_invoices(payment_status);

-- Prijaté faktúry (Received Invoices)
CREATE TABLE memento_received_invoices (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    date DATE NOT NULL,
    invoice_number VARCHAR(100),
    supplier_id VARCHAR(255),  -- FK to memento_suppliers
    order_id VARCHAR(255),  -- FK to memento_orders
    due_date DATE,
    total_sum NUMERIC(15,2),
    vat NUMERIC(15,2),
    sum_with_vat NUMERIC(15,2),
    payment_status VARCHAR(50),  -- Unpaid, Partial, Paid, Overdue
    paid_date DATE,
    description TEXT,
    note TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_received_invoices_date ON memento_received_invoices(date DESC);
CREATE INDEX idx_received_invoices_supplier ON memento_received_invoices(supplier_id);
CREATE INDEX idx_received_invoices_status ON memento_received_invoices(payment_status);

-- ==================================================
-- 3. DATA TABLES - HISTORICAL PRICES (6)
-- ==================================================

-- ceny prác (Work Prices History)
CREATE TABLE memento_work_prices_history (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    valid_from DATE NOT NULL,
    valid_to DATE,
    work_item_id VARCHAR(255),  -- FK to memento_price_list_work
    work_name VARCHAR(255),
    unit VARCHAR(50),
    unit_price NUMERIC(15,2),
    vat_rate NUMERIC(5,2),
    note TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_work_prices_valid ON memento_work_prices_history(valid_from, valid_to);
CREATE INDEX idx_work_prices_item ON memento_work_prices_history(work_item_id);

-- ceny materiálu (Material Prices History)
CREATE TABLE memento_material_prices_history (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    valid_from DATE NOT NULL,
    valid_to DATE,
    material_id VARCHAR(255),  -- FK to memento_materials
    material_name VARCHAR(255),
    unit VARCHAR(50),
    purchase_price NUMERIC(15,2),
    sell_price NUMERIC(15,2),
    vat_rate NUMERIC(5,2),
    note TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_material_prices_valid ON memento_material_prices_history(valid_from, valid_to);
CREATE INDEX idx_material_prices_item ON memento_material_prices_history(material_id);

-- ceny mechanizácie (Machinery Prices History)
CREATE TABLE memento_machinery_prices_history (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    valid_from DATE NOT NULL,
    valid_to DATE,
    machinery_id VARCHAR(255),  -- FK to memento_machinery
    machinery_name VARCHAR(255),
    hourly_rate NUMERIC(10,2),
    pausal_rate NUMERIC(10,2),
    note TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_machinery_prices_valid ON memento_machinery_prices_history(valid_from, valid_to);
CREATE INDEX idx_machinery_prices_item ON memento_machinery_prices_history(machinery_id);

-- ceny dopravy (Transport Prices History)
CREATE TABLE memento_transport_prices_history (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    valid_from DATE NOT NULL,
    valid_to DATE,
    vehicle_id VARCHAR(255),  -- FK to memento_vehicles
    vehicle_name VARCHAR(255),
    km_rate NUMERIC(10,2),
    note TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transport_prices_valid ON memento_transport_prices_history(valid_from, valid_to);
CREATE INDEX idx_transport_prices_item ON memento_transport_prices_history(vehicle_id);

-- sadzby zamestnancov (Employee Rates History)
CREATE TABLE memento_employee_rates_history (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    valid_from DATE NOT NULL,
    valid_to DATE,
    employee_id VARCHAR(255),  -- FK to memento_employees
    employee_name VARCHAR(255),
    hourly_rate NUMERIC(10,2),
    position VARCHAR(255),
    note TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_employee_rates_valid ON memento_employee_rates_history(valid_from, valid_to);
CREATE INDEX idx_employee_rates_item ON memento_employee_rates_history(employee_id);

-- sadzby dph (VAT Rates History)
CREATE TABLE memento_vat_rates_history (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    valid_from DATE NOT NULL,
    valid_to DATE,
    rate_name VARCHAR(100),  -- "základná", "znížená", "nulová"
    rate_percentage NUMERIC(5,2),
    note TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vat_rates_valid ON memento_vat_rates_history(valid_from, valid_to);
CREATE INDEX idx_vat_rates_name ON memento_vat_rates_history(rate_name);

-- ==================================================
-- 3. DATA TABLES - OTHER (1)
-- ==================================================

-- Účty (Accounts)
CREATE TABLE memento_accounts (
    -- Memento core fields
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'active',

    -- Custom fields
    account_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100),
    bank_name VARCHAR(255),
    iban VARCHAR(50),
    swift VARCHAR(20),
    balance NUMERIC(15,2) DEFAULT 0,
    account_type VARCHAR(50),  -- Cash, Bank, Credit Card
    currency VARCHAR(10) DEFAULT 'EUR',
    is_active BOOLEAN DEFAULT true,
    note TEXT,

    -- Metadata
    memento_created_time TIMESTAMP,
    memento_modified_time TIMESTAMP,
    pg_modified_time TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    synced_at TIMESTAMP DEFAULT NOW(),
    sync_source VARCHAR(20) DEFAULT 'memento',

    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_accounts_name ON memento_accounts(account_name);
CREATE INDEX idx_accounts_type ON memento_accounts(account_type);

-- ==================================================
-- 4. JUNCTION TABLES (Many-to-Many Relationships)
-- ==================================================

-- Work Records ↔ Employees
CREATE TABLE memento_work_records_employees (
    work_record_id VARCHAR(255) NOT NULL,
    employee_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (work_record_id, employee_id),
    FOREIGN KEY (work_record_id) REFERENCES memento_work_records(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES memento_employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_wr_employees_wr ON memento_work_records_employees(work_record_id);
CREATE INDEX idx_wr_employees_emp ON memento_work_records_employees(employee_id);

-- Attendance ↔ Employees
CREATE TABLE memento_attendance_employees (
    attendance_id VARCHAR(255) NOT NULL,
    employee_id VARCHAR(255) NOT NULL,
    -- Employee attributes (from linkToEntry attributes)
    worked_hours NUMERIC(10,2),
    hourly_rate NUMERIC(10,2),
    bonus NUMERIC(10,2),
    premium NUMERIC(15,2),
    penalty NUMERIC(15,2),
    daily_wage NUMERIC(15,2),
    note TEXT,
    PRIMARY KEY (attendance_id, employee_id),
    FOREIGN KEY (attendance_id) REFERENCES memento_attendance(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES memento_employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_att_employees_att ON memento_attendance_employees(attendance_id);
CREATE INDEX idx_att_employees_emp ON memento_attendance_employees(employee_id);

-- Ride Log ↔ Crew (Employees)
CREATE TABLE memento_ride_log_crew (
    ride_log_id VARCHAR(255) NOT NULL,
    employee_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (ride_log_id, employee_id),
    FOREIGN KEY (ride_log_id) REFERENCES memento_ride_log(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES memento_employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_ride_crew_ride ON memento_ride_log_crew(ride_log_id);
CREATE INDEX idx_ride_crew_emp ON memento_ride_log_crew(employee_id);

-- Ride Log ↔ Orders (multiple orders per ride)
CREATE TABLE memento_ride_log_orders (
    ride_log_id VARCHAR(255) NOT NULL,
    order_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (ride_log_id, order_id),
    FOREIGN KEY (ride_log_id) REFERENCES memento_ride_log(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES memento_orders(id) ON DELETE CASCADE
);

CREATE INDEX idx_ride_orders_ride ON memento_ride_log_orders(ride_log_id);
CREATE INDEX idx_ride_orders_order ON memento_ride_log_orders(order_id);

-- Work Records ↔ Machinery
CREATE TABLE memento_work_records_machinery (
    work_record_id VARCHAR(255) NOT NULL,
    machinery_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (work_record_id, machinery_id),
    FOREIGN KEY (work_record_id) REFERENCES memento_work_records(id) ON DELETE CASCADE,
    FOREIGN KEY (machinery_id) REFERENCES memento_machinery(id) ON DELETE CASCADE
);

CREATE INDEX idx_wr_machinery_wr ON memento_work_records_machinery(work_record_id);
CREATE INDEX idx_wr_machinery_mach ON memento_work_records_machinery(machinery_id);

-- Cash Book ↔ Obligations
CREATE TABLE memento_cash_book_obligations (
    cash_book_id VARCHAR(255) NOT NULL,
    obligation_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (cash_book_id, obligation_id),
    FOREIGN KEY (cash_book_id) REFERENCES memento_cash_book(id) ON DELETE CASCADE,
    FOREIGN KEY (obligation_id) REFERENCES memento_obligations(id) ON DELETE CASCADE
);

-- Cash Book ↔ Receivables
CREATE TABLE memento_cash_book_receivables (
    cash_book_id VARCHAR(255) NOT NULL,
    receivable_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (cash_book_id, receivable_id),
    FOREIGN KEY (cash_book_id) REFERENCES memento_cash_book(id) ON DELETE CASCADE,
    FOREIGN KEY (receivable_id) REFERENCES memento_receivables(id) ON DELETE CASCADE
);

-- ==================================================
-- 5. TRIGGER FUNCTIONS
-- ==================================================

-- Function to notify on changes (for PostgreSQL → Memento sync)
CREATE OR REPLACE FUNCTION notify_memento_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
BEGIN
    -- Skip if this change came from Memento sync (avoid loop)
    IF NEW.sync_source = 'memento' THEN
        -- Reset sync_source for next change
        NEW.sync_source := 'postgresql';
        RETURN NEW;
    END IF;

    -- Build notification payload
    payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'id', COALESCE(NEW.id, OLD.id),
        'pg_modified_time', NOW()
    );

    -- Notify Python listener
    PERFORM pg_notify('memento_sync_channel', payload::text);

    -- Update pg_modified_time
    NEW.pg_modified_time := NOW();
    NEW.updated_at := NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- 6. APPLY TRIGGERS TO ALL TABLES
-- ==================================================

-- Daily Records
CREATE TRIGGER trg_sync_daily_report AFTER INSERT OR UPDATE ON memento_daily_report
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_daily_report BEFORE UPDATE ON memento_daily_report
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_attendance AFTER INSERT OR UPDATE ON memento_attendance
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_attendance BEFORE UPDATE ON memento_attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_work_records AFTER INSERT OR UPDATE ON memento_work_records
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_work_records BEFORE UPDATE ON memento_work_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_ride_log AFTER INSERT OR UPDATE ON memento_ride_log
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_ride_log BEFORE UPDATE ON memento_ride_log
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_cash_book AFTER INSERT OR UPDATE ON memento_cash_book
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_cash_book BEFORE UPDATE ON memento_cash_book
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Reports
CREATE TRIGGER trg_sync_work_report AFTER INSERT OR UPDATE ON memento_work_report
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_work_report BEFORE UPDATE ON memento_work_report
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_materials_report AFTER INSERT OR UPDATE ON memento_materials_report
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_materials_report BEFORE UPDATE ON memento_materials_report
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_ride_report AFTER INSERT OR UPDATE ON memento_ride_report
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_ride_report BEFORE UPDATE ON memento_ride_report
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_machines_report AFTER INSERT OR UPDATE ON memento_machines_report
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_machines_report BEFORE UPDATE ON memento_machines_report
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Master Data
CREATE TRIGGER trg_sync_employees AFTER INSERT OR UPDATE ON memento_employees
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_employees BEFORE UPDATE ON memento_employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_suppliers AFTER INSERT OR UPDATE ON memento_suppliers
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_suppliers BEFORE UPDATE ON memento_suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_partners AFTER INSERT OR UPDATE ON memento_partners
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_partners BEFORE UPDATE ON memento_partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_clients AFTER INSERT OR UPDATE ON memento_clients
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_clients BEFORE UPDATE ON memento_clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_vehicles AFTER INSERT OR UPDATE ON memento_vehicles
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_vehicles BEFORE UPDATE ON memento_vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_machinery AFTER INSERT OR UPDATE ON memento_machinery
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_machinery BEFORE UPDATE ON memento_machinery
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Locations & Catalogs
CREATE TRIGGER trg_sync_places AFTER INSERT OR UPDATE ON memento_places
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_places BEFORE UPDATE ON memento_places
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_addresses AFTER INSERT OR UPDATE ON memento_addresses
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_addresses BEFORE UPDATE ON memento_addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_price_list_work AFTER INSERT OR UPDATE ON memento_price_list_work
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_price_list_work BEFORE UPDATE ON memento_price_list_work
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_materials AFTER INSERT OR UPDATE ON memento_materials
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_materials BEFORE UPDATE ON memento_materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Inventory Movement
CREATE TRIGGER trg_sync_material_expenses AFTER INSERT OR UPDATE ON memento_material_expenses
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_material_expenses BEFORE UPDATE ON memento_material_expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_material_receipts AFTER INSERT OR UPDATE ON memento_material_receipts
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_material_receipts BEFORE UPDATE ON memento_material_receipts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Business Documents
CREATE TRIGGER trg_sync_quotes AFTER INSERT OR UPDATE ON memento_quotes
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_quotes BEFORE UPDATE ON memento_quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_quote_parts AFTER INSERT OR UPDATE ON memento_quote_parts
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_quote_parts BEFORE UPDATE ON memento_quote_parts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_orders AFTER INSERT OR UPDATE ON memento_orders
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_orders BEFORE UPDATE ON memento_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_order_parts AFTER INSERT OR UPDATE ON memento_order_parts
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_order_parts BEFORE UPDATE ON memento_order_parts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_settlements AFTER INSERT OR UPDATE ON memento_settlements
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_settlements BEFORE UPDATE ON memento_settlements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Financial Documents
CREATE TRIGGER trg_sync_receivables AFTER INSERT OR UPDATE ON memento_receivables
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_receivables BEFORE UPDATE ON memento_receivables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_obligations AFTER INSERT OR UPDATE ON memento_obligations
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_obligations BEFORE UPDATE ON memento_obligations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_issued_invoices AFTER INSERT OR UPDATE ON memento_issued_invoices
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_issued_invoices BEFORE UPDATE ON memento_issued_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_received_invoices AFTER INSERT OR UPDATE ON memento_received_invoices
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_received_invoices BEFORE UPDATE ON memento_received_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Historical Prices
CREATE TRIGGER trg_sync_work_prices_history AFTER INSERT OR UPDATE ON memento_work_prices_history
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_work_prices_history BEFORE UPDATE ON memento_work_prices_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_material_prices_history AFTER INSERT OR UPDATE ON memento_material_prices_history
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_material_prices_history BEFORE UPDATE ON memento_material_prices_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_machinery_prices_history AFTER INSERT OR UPDATE ON memento_machinery_prices_history
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_machinery_prices_history BEFORE UPDATE ON memento_machinery_prices_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_transport_prices_history AFTER INSERT OR UPDATE ON memento_transport_prices_history
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_transport_prices_history BEFORE UPDATE ON memento_transport_prices_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_employee_rates_history AFTER INSERT OR UPDATE ON memento_employee_rates_history
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_employee_rates_history BEFORE UPDATE ON memento_employee_rates_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sync_vat_rates_history AFTER INSERT OR UPDATE ON memento_vat_rates_history
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_vat_rates_history BEFORE UPDATE ON memento_vat_rates_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Other
CREATE TRIGGER trg_sync_accounts AFTER INSERT OR UPDATE ON memento_accounts
    FOR EACH ROW EXECUTE FUNCTION notify_memento_change();
CREATE TRIGGER trg_update_accounts BEFORE UPDATE ON memento_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==================================================
-- 7. INITIALIZE SYNC METADATA
-- ==================================================

-- Insert initial metadata for all libraries
INSERT INTO memento_sync_metadata (library_id, library_name, table_name, sync_enabled) VALUES
    ('Tt4pxN4xQ', 'Denný report', 'memento_daily_report', true),
    ('qU4Br5hU6', 'Dochádzka', 'memento_attendance', true),
    ('ArdaPo5TU', 'Záznam prác', 'memento_work_records', true),
    (NULL, 'Kniha jázd', 'memento_ride_log', true),
    (NULL, 'Pokladňa', 'memento_cash_book', true),
    (NULL, 'Výkaz prác', 'memento_work_report', true),
    ('z3sxkUHgT', 'Výkaz materiálu', 'memento_materials_report', true),
    (NULL, 'Výkaz dopravy', 'memento_ride_report', true),
    ('uCRaUwsTo', 'Výkaz strojov', 'memento_machines_report', true),
    ('nWb00Nogf', 'Zamestnanci', 'memento_employees', true),
    ('3FSQN0reH', 'Dodávatelia', 'memento_suppliers', true),
    ('NffZSLRKU', 'Partneri', 'memento_partners', true),
    ('rh7YHaVRM', 'Klienti', 'memento_clients', true),
    (NULL, 'Vozidlá', 'memento_vehicles', true),
    (NULL, 'Mechanizácia', 'memento_machinery', true),
    (NULL, 'Miesta', 'memento_places', true),
    (NULL, 'Adresy', 'memento_addresses', true),
    (NULL, 'Cenník prác', 'memento_price_list_work', true),
    (NULL, 'Materiál', 'memento_materials', true),
    (NULL, 'Výdajky materiálu', 'memento_material_expenses', true),
    (NULL, 'Príjemky materiálu', 'memento_material_receipts', true),
    ('90RmdjWuk', 'Cenové ponuky', 'memento_quotes', true),
    ('nCAgQkfvK', 'Cenové ponuky Diely', 'memento_quote_parts', true),
    ('CfRHN7QTG', 'Zákazky', 'memento_orders', true),
    ('iEUC79O2T', 'Zákazky Diely', 'memento_order_parts', true),
    (NULL, 'Vyúčtovania', 'memento_settlements', true),
    (NULL, 'Pohľadávky', 'memento_receivables', true),
    (NULL, 'Záväzky', 'memento_obligations', true),
    (NULL, 'Vystavené faktúry', 'memento_issued_invoices', true),
    (NULL, 'Prijaté faktúry', 'memento_received_invoices', true),
    (NULL, 'ceny prác', 'memento_work_prices_history', true),
    (NULL, 'ceny materiálu', 'memento_material_prices_history', true),
    (NULL, 'ceny mechanizácie', 'memento_machinery_prices_history', true),
    (NULL, 'ceny dopravy', 'memento_transport_prices_history', true),
    ('CqXNnosKP', 'sadzby zamestnancov', 'memento_employee_rates_history', true),
    (NULL, 'sadzby dph', 'memento_vat_rates_history', true),
    (NULL, 'Účty', 'memento_accounts', true)
ON CONFLICT (library_id) DO NOTHING;

-- ==================================================
-- SCHEMA COMPLETE
-- ==================================================

-- Verify tables created
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'memento_%'
ORDER BY tablename;

-- Summary
SELECT
    'Data Tables' AS category,
    COUNT(*) AS count
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'memento_%'
  AND tablename NOT LIKE 'memento_sync%'
  AND tablename NOT LIKE '%_%_%'  -- Exclude junction tables
UNION ALL
SELECT
    'Junction Tables' AS category,
    COUNT(*) AS count
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'memento_%_%_%'  -- Junction tables have 3+ parts
UNION ALL
SELECT
    'System Tables' AS category,
    COUNT(*) AS count
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'memento_sync%';
