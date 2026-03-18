"""
SQLAlchemy ORM Models - CORRECT VERSION
Based on actual PostgreSQL schema (schema_master_data_CORRECT.sql)

IMPORTANT: These models MUST match the database schema EXACTLY!
Version: 2.0 (2026-03-18)
"""

from sqlalchemy import Column, String, Integer, Boolean, Numeric, Date, Time, DateTime, Text, TIMESTAMP, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime

Base = declarative_base()


# ==================================================
# MEMENTO BASE MIXIN
# ==================================================

class MementoBaseMixin:
    """Common columns for all Memento tables"""

    # Primary key (Memento entry ID)
    id = Column(String(255), primary_key=True)

    # Status and sync metadata
    status = Column(String(50), default='active')
    memento_created_time = Column(TIMESTAMP)
    memento_modified_time = Column(TIMESTAMP)
    pg_modified_time = Column(TIMESTAMP, default=func.now())
    created_by = Column(String(255))
    modified_by = Column(String(255))
    sync_source = Column(String(20), default='memento')
    synced_at = Column(TIMESTAMP, default=func.now())
    created_at = Column(TIMESTAMP, default=func.now())
    updated_at = Column(TIMESTAMP, default=func.now())


# ==================================================
# EMPLOYEE MODEL (Zamestnanci)
# ==================================================

class Employee(Base, MementoBaseMixin):
    """Zamestnanci (Employees) - 54 columns"""
    __tablename__ = 'memento_employees'

    # Override mixin id to add it first
    id = Column(String(255), primary_key=True)

    # Custom ID field (NOT primary key!)
    record_number = Column(Integer)

    # Personal Information
    first_name = Column(String(255))            # Meno
    last_name = Column(String(255))             # Priezvisko
    nick = Column(String(255))                  # Nick
    position = Column(String(100))              # Pozícia
    notes = Column(Text)                        # Poznámka

    # Contact Information
    mobile = Column(String(50))                 # Mobil
    email = Column(String(255))                 # Email
    telegram_id = Column(String(255))           # Telegram ID

    # Communication Preferences
    sms_enabled = Column(Boolean)               # sms
    email_enabled = Column(Boolean)             # email
    telegram_enabled = Column(Boolean)          # Telegram notifikácie

    # Status Flags
    is_active = Column(Boolean, default=True, index=True)   # Aktívny
    is_driver = Column(Boolean, default=False)              # Šofér

    # Period Settings
    period_total = Column(String(255))          # obdobie total
    period_selection = Column(String(255))      # výber obdobia

    # Work Statistics (Current Period)
    worked_on_orders = Column(Numeric(10, 2))   # Na zákazkách
    worked_driving = Column(Numeric(10, 2))     # Jazdy
    worked_hours = Column(Numeric(10, 2))       # Odpracované
    earned = Column(Numeric(15, 2))             # Zarobené
    bonuses = Column(Numeric(15, 2))            # Prémie
    paid_out = Column(Numeric(15, 2))           # Vyplatené

    # Work Statistics (Total)
    worked_on_orders_total = Column(Numeric(10, 2))     # Na zákazkách total
    worked_driving_total = Column(Numeric(10, 2))       # Jazdy total
    worked_hours_total = Column(Numeric(10, 2))         # Odpracované total
    earned_total = Column(Numeric(15, 2))               # Zarobené total
    bonuses_total = Column(Numeric(15, 2))              # Prémie total
    paid_out_total = Column(Numeric(15, 2))             # Vyplatené total

    # Salary Information
    gross_salary = Column(Numeric(15, 2))               # Hrubá mzda
    overpayment_underpayment = Column(Numeric(15, 2))   # Preplatok/Nedoplatok
    current_hourly_rate = Column(Numeric(10, 2))        # Aktuálna hodinovka

    # Financial Balance
    obligations = Column(Numeric(15, 2))        # Záväzky
    receivables = Column(Numeric(15, 2))        # Pohľadávky
    balance = Column(Numeric(15, 2))            # Saldo

    # Ratings
    attendance_rating = Column(Integer)         # Dochádzka
    orders_rating = Column(Integer)             # Zákazky
    total_rating = Column(Integer)              # Celkom

    # System Fields
    info = Column(Text)
    debug_log = Column(Text)
    error_log = Column(Text)
    view_mode = Column(String(255))             # view
    record_color = Column(String(255))          # farba záznamu
    background_color = Column(String(255))      # farba pozadia


# ==================================================
# CLIENT MODEL (Klienti)
# ==================================================

class Client(Base, MementoBaseMixin):
    """Klienti (Clients) - 37 columns"""
    __tablename__ = 'memento_clients'

    id = Column(String(255), primary_key=True)

    # Custom ID field (NOT primary key!)
    record_number = Column(Integer)              # ID

    # Type and status
    entity_type = Column(String(20))            # Firma/Osoba (firma/osoba)
    is_active = Column(Boolean, default=True, index=True)   # Aktívny
    is_client = Column(Boolean, default=True)   # Klient (boolean flag)

    # Personal/Company information
    nick = Column(String(100))                  # Nick
    first_name = Column(String(255))            # Meno
    last_name = Column(String(255))             # Priezvisko
    title_before = Column(String(50))           # Titul
    title_after = Column(String(50))            # Titul za
    company_name = Column(String(255), index=True)  # Firma
    contact = Column(Text)                      # Kontakt (JSON or multiline)

    # Address
    address = Column(Text)                      # Adresa (full address)
    street = Column(String(255))                # Ulica
    postal_code = Column(String(20))            # PSČ
    city = Column(String(100))                  # Mesto

    # Contact details
    email = Column(String(255))                 # Email
    mobile = Column(String(50))                 # Mobil
    notes = Column(Text)                        # Poznámka
    additional_data = Column(Text)              # Ďalšie údaje

    # Business registration
    ico = Column(String(50), index=True)        # IČO
    is_vat_payer = Column(Boolean)              # Platca DPH
    vat_id = Column(String(50))                 # IČ DPH

    # Relationships (linkToEntry fields - stored as TEXT/JSON)
    connections = Column(Text)                  # Prepojenia (linkToEntry - multiple)
    related_clients = Column(Text)              # Klienti (linkToEntry - multiple)
    documents = Column(Text)                    # Dokument (linkToEntry - multiple)

    # System Fields
    view_mode = Column(String(255))             # view


# ==================================================
# PARTNER MODEL (Partneri)
# ==================================================

class Partner(Base, MementoBaseMixin):
    """Partneri (Partners) - 19 columns"""
    __tablename__ = 'memento_partners'

    id = Column(String(255), primary_key=True)

    # Custom ID field (NOT primary key!)
    record_number = Column(Integer)              # #

    # Type and status
    entity_type = Column(String(20), index=True)    # Firma/Osoba (firma/osoba)
    is_active = Column(Boolean, default=True, index=True)   # Aktívny
    is_partner = Column(Boolean, default=False, index=True)  # Partner (boolean flag)
    is_supplier = Column(Boolean, default=False, index=True) # Dodávateľ (boolean flag)
    is_client = Column(Boolean, default=False, index=True)   # Klient (boolean flag)

    # Personal/Company information
    nick = Column(String(100))                  # Nick
    name = Column(String(255), index=True)      # Názov (company/person name)
    first_name = Column(String(255))            # Meno
    last_name = Column(String(255))             # Priezvisko
    contact = Column(Text)                      # Kontakt (JSON or multiline)

    # System Fields
    view_mode = Column(String(255))             # view


# ==================================================
# SUPPLIER MODEL (Dodávatelia)
# ==================================================

class Supplier(Base, MementoBaseMixin):
    """Dodávatelia (Suppliers) - 37 columns"""
    __tablename__ = 'memento_suppliers'

    id = Column(String(255), primary_key=True)

    # Custom ID field (NOT primary key!)
    record_number = Column(Integer)              # ID

    # Type and status
    entity_type = Column(String(20), index=True)    # Firma/Osoba (firma/osoba)
    is_active = Column(Boolean, default=True, index=True)   # Aktívny
    is_supplier = Column(Boolean, default=True)  # Dodávateľ (boolean flag)

    # Personal/Company information
    nick = Column(String(100))                  # Nick
    first_name = Column(String(255))            # Meno
    last_name = Column(String(255))             # Priezvisko
    title_before = Column(String(50))           # Titul
    title_after = Column(String(50))            # Titul za
    company_name = Column(String(255), index=True)  # Firma
    contact = Column(Text)                      # Kontakt

    # Address
    address = Column(Text)                      # Adresa
    street = Column(String(255))                # Ulica
    postal_code = Column(String(20))            # PSČ
    city = Column(String(100))                  # Mesto

    # Contact details
    email = Column(String(255))                 # Email
    mobile = Column(String(50))                 # Mobil
    notes = Column(Text)                        # Poznámka
    additional_data = Column(Text)              # Ďalšie údaje

    # Business registration
    ico = Column(String(50), index=True)        # IČO
    is_vat_payer = Column(Boolean)              # Platca DPH
    vat_id = Column(String(50))                 # IČ DPH

    # Relationships
    connections = Column(Text)                  # Prepojenia
    documents = Column(Text)                    # Dokument

    # System Fields
    view_mode = Column(String(255))             # view


# ==================================================
# SYSTEM TABLES
# ==================================================

class SyncLog(Base):
    """Sync operation log"""
    __tablename__ = 'memento_sync_log'

    id = Column(Integer, primary_key=True, autoincrement=True)
    library_id = Column(String(255))
    library_name = Column(String(255))
    entry_id = Column(String(255))
    sync_direction = Column(String(20))  # 'memento_to_pg' or 'pg_to_memento'
    sync_time = Column(TIMESTAMP, default=func.now())
    success = Column(Boolean)
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)


class SyncMetadata(Base):
    """Per-library sync metadata"""
    __tablename__ = 'memento_sync_metadata'

    library_id = Column(String(255), primary_key=True)
    library_name = Column(String(255))
    table_name = Column(String(255))
    entry_count = Column(Integer, default=0)
    last_sync = Column(TIMESTAMP)
    last_bulk_sync = Column(TIMESTAMP)
    sync_enabled = Column(Boolean, default=True)
    last_error = Column(Text)


class SyncConflict(Base):
    """Conflict tracking"""
    __tablename__ = 'memento_sync_conflicts'

    id = Column(Integer, primary_key=True, autoincrement=True)
    library_name = Column(String(255))
    entry_id = Column(String(255))
    conflict_time = Column(TIMESTAMP, default=func.now())
    memento_modified_time = Column(TIMESTAMP)
    pg_modified_time = Column(TIMESTAMP)
    resolution = Column(String(50))  # 'memento_wins', 'pg_wins', 'manual'
    resolved = Column(Boolean, default=False)
    resolved_at = Column(TIMESTAMP)
    conflict_data = Column(Text)


# ==================================================
# VALIDATION
# ==================================================

def validate_models():
    """Validate that models match database schema"""
    issues = []

    # Check that all models have MementoBaseMixin fields
    for model_class in [Employee, Client, Partner, Supplier]:
        table_name = model_class.__tablename__
        columns = {col.name for col in model_class.__table__.columns}

        # Check required mixin fields
        required = {'id', 'status', 'memento_created_time', 'memento_modified_time',
                   'pg_modified_time', 'created_by', 'modified_by', 'sync_source',
                   'synced_at', 'created_at', 'updated_at'}

        missing = required - columns
        if missing:
            issues.append(f"{table_name}: Missing mixin fields: {missing}")

    return issues


if __name__ == "__main__":
    # Validate models
    issues = validate_models()
    if issues:
        print("❌ Model validation issues:")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("✅ All models are valid")

    # Print summary
    print("\n📊 Model Summary:")
    for model_class in [Employee, Client, Partner, Supplier]:
        columns = list(model_class.__table__.columns)
        print(f"\n{model_class.__tablename__}:")
        print(f"  - Total columns: {len(columns)}")
        print(f"  - Business columns: {len(columns) - 11}")  # Minus mixin columns
