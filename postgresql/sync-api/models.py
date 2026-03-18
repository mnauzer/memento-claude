"""
SQLAlchemy ORM Models - Database models for all Memento tables

This module defines SQLAlchemy models for all 36 Memento libraries plus
system tables for sync tracking.
"""

from sqlalchemy import (
    Column, String, Integer, Numeric, Date, Time, DateTime, Boolean, Text,
    ForeignKey, TIMESTAMP, Index, JSON
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime

Base = declarative_base()


# ==================================================
# SYSTEM TABLES
# ==================================================

class SyncLog(Base):
    """Sync operation log"""
    __tablename__ = 'memento_sync_log'

    id = Column(Integer, primary_key=True, autoincrement=True)
    library_id = Column(String(255), index=True)
    library_name = Column(String(255))
    entry_id = Column(String(255), index=True)
    sync_direction = Column(String(20), nullable=False)
    sync_time = Column(TIMESTAMP, default=func.now(), index=True)
    success = Column(Boolean, nullable=False, default=True)
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    sync_metadata = Column(JSON)


class SyncConflict(Base):
    """Conflict tracking"""
    __tablename__ = 'memento_sync_conflicts'

    id = Column(Integer, primary_key=True, autoincrement=True)
    library_id = Column(String(255), index=True)
    library_name = Column(String(255))
    entry_id = Column(String(255), index=True)
    conflict_time = Column(TIMESTAMP, default=func.now())
    memento_modified_time = Column(TIMESTAMP)
    pg_modified_time = Column(TIMESTAMP)
    resolution = Column(String(50), nullable=False)
    conflict_data = Column(JSON)
    resolved = Column(Boolean, default=False, index=True)
    resolved_at = Column(TIMESTAMP)
    resolved_by = Column(String(255))


class SyncMetadata(Base):
    """Per-library sync metadata"""
    __tablename__ = 'memento_sync_metadata'

    library_id = Column(String(255), primary_key=True)
    library_name = Column(String(255), nullable=False)
    table_name = Column(String(255), nullable=False)
    last_sync = Column(TIMESTAMP)
    last_bulk_sync = Column(TIMESTAMP)
    entry_count = Column(Integer, default=0)
    last_error = Column(Text)
    sync_enabled = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, default=func.now())
    updated_at = Column(TIMESTAMP, default=func.now(), onupdate=func.now())


# ==================================================
# MIXIN FOR COMMON FIELDS
# ==================================================

class MementoBaseMixin:
    """Mixin for common Memento fields"""
    id = Column(String(255), primary_key=True)
    status = Column(String(50), default='active')
    memento_created_time = Column(TIMESTAMP)
    memento_modified_time = Column(TIMESTAMP, index=True)
    pg_modified_time = Column(TIMESTAMP, default=func.now())
    created_by = Column(String(255))
    modified_by = Column(String(255))
    synced_at = Column(TIMESTAMP, default=func.now())
    sync_source = Column(String(20), default='memento')
    created_at = Column(TIMESTAMP, default=func.now())
    updated_at = Column(TIMESTAMP, default=func.now(), onupdate=func.now())


# ==================================================
# DAILY RECORDS & LOGS
# ==================================================

class DailyReport(Base, MementoBaseMixin):
    """Denný report (Daily Report)"""
    __tablename__ = 'memento_daily_report'

    date = Column(Date, nullable=False, index=True)
    day_of_week = Column(String(20))
    record_icons = Column(Text)
    record_description = Column(Text)
    description = Column(Text)
    hours_worked = Column(Numeric(10, 2))
    info_attendance = Column(Text)
    info_work_records = Column(Text)
    info_cash_book = Column(Text)
    info_ride_log = Column(Text)


class Attendance(Base, MementoBaseMixin):
    """Dochádzka (Attendance)"""
    __tablename__ = 'memento_attendance'

    date = Column(Date, nullable=False, index=True)
    day_of_week = Column(String(20))
    arrival = Column(Time)
    departure = Column(Time)
    employee_count = Column(Integer)
    work_time = Column(Numeric(10, 2))
    worked_hours = Column(Numeric(10, 2))
    worked_on_orders = Column(Numeric(10, 2))
    down_time = Column(Numeric(10, 2))
    wage_costs = Column(Numeric(15, 2))
    entry_status = Column(Text)
    day_off_reason = Column(String(100))
    entry_icons = Column(Text)
    note = Column(Text)
    entry_info = Column(Text)
    entry_photo = Column(Text)
    info_rich = Column(Text)


class WorkRecord(Base, MementoBaseMixin):
    """Záznam prác (Work Records)"""
    __tablename__ = 'memento_work_records'

    date = Column(Date, nullable=False, index=True)
    order_id = Column(String(255), ForeignKey('memento_orders.id'), index=True)
    hzs = Column(Numeric(15, 2))
    work_description = Column(Text)
    employee_count = Column(Integer)
    work_time = Column(Numeric(10, 2))
    worked_hours = Column(Numeric(10, 2))
    wage_costs = Column(Numeric(15, 2))
    hzs_sum = Column(Numeric(15, 2))
    machines_sum = Column(Numeric(15, 2))
    machines_costs = Column(Numeric(15, 2))
    work_items_sum = Column(Numeric(15, 2))
    start_time = Column(Time)
    end_time = Column(Time)
    icons = Column(Text)
    daily_report_id = Column(String(255), ForeignKey('memento_daily_report.id'))


class RideLog(Base, MementoBaseMixin):
    """Kniha jázd (Ride Log)"""
    __tablename__ = 'memento_ride_log'

    date = Column(Date, nullable=False, index=True)
    ride_type = Column(String(100))
    ride_purpose = Column(String(255))
    ride_description = Column(Text)
    vehicle_id = Column(String(255), ForeignKey('memento_vehicles.id'), index=True)
    driver_id = Column(String(255), ForeignKey('memento_employees.id'), index=True)
    rate = Column(Numeric(10, 2))
    km = Column(Numeric(10, 2))
    wage_costs = Column(Numeric(15, 2))
    vehicle_costs = Column(Numeric(15, 2))
    ride_time = Column(Numeric(10, 2))
    stop_time = Column(Numeric(10, 2))
    total_time = Column(Numeric(10, 2))
    start_location = Column(String(255))
    destination = Column(String(255))
    stops = Column(Text)
    icons = Column(Text)
    daily_report_id = Column(String(255), ForeignKey('memento_daily_report.id'))


class CashBook(Base, MementoBaseMixin):
    """Pokladňa (Cash Book)"""
    __tablename__ = 'memento_cash_book'

    date = Column(Date, nullable=False, index=True)
    transaction_type = Column(String(50), index=True)
    from_account_id = Column(String(255), ForeignKey('memento_accounts.id'))
    to_account_id = Column(String(255), ForeignKey('memento_accounts.id'))
    paid_by_id = Column(String(255), ForeignKey('memento_employees.id'))
    paid_to_id = Column(String(255), ForeignKey('memento_employees.id'))
    obligation_payment = Column(Boolean, default=False)
    obligation_type = Column(String(100))
    offset_claim = Column(Boolean, default=False)
    from_overpayment_create = Column(String(100))
    transfer_purpose = Column(String(255))
    record_to_customer = Column(Boolean, default=False)
    order_id = Column(String(255), ForeignKey('memento_orders.id'), index=True)
    operational_overhead = Column(String(255))
    tool_id = Column(String(255), ForeignKey('memento_machinery.id'))
    vehicle_id = Column(String(255), ForeignKey('memento_vehicles.id'))
    financial_fees = Column(String(255))
    employee_id = Column(String(255), ForeignKey('memento_employees.id'))
    supplier_id = Column(String(255), ForeignKey('memento_suppliers.id'))
    partner_id = Column(String(255), ForeignKey('memento_partners.id'))
    sum = Column(Numeric(15, 2))
    sum_total = Column(Numeric(15, 2))
    vat = Column(Numeric(15, 2))
    description = Column(Text)
    note = Column(Text)
    document_image = Column(Text)
    is_vat = Column(Boolean, default=False)
    vat_rate = Column(String(50))
    vat_rate_value = Column(Numeric(5, 2))


# ==================================================
# REPORTS & OUTPUTS
# ==================================================

class WorkReport(Base, MementoBaseMixin):
    """Výkaz prác (Work Report)"""
    __tablename__ = 'memento_work_report'

    date = Column(Date, nullable=False, index=True)
    identifier = Column(String(255), unique=True, index=True)
    description = Column(Text)
    report_type = Column(String(100))
    price_calculation = Column(String(100))
    order_id = Column(String(255), ForeignKey('memento_orders.id'), index=True)
    total_hours = Column(Numeric(10, 2))
    hzs_sum = Column(Numeric(15, 2))
    hzs_count = Column(Integer)


class MaterialsReport(Base, MementoBaseMixin):
    """Výkaz materiálu (Materials Report)"""
    __tablename__ = 'memento_materials_report'

    date = Column(Date, nullable=False, index=True)
    identifier = Column(String(255), unique=True)
    description = Column(Text)
    order_id = Column(String(255), ForeignKey('memento_orders.id'), index=True)
    total_quantity = Column(Numeric(15, 2))
    purchase_price_total = Column(Numeric(15, 2))
    sell_price_total = Column(Numeric(15, 2))
    margin_total = Column(Numeric(15, 2))
    vat_total = Column(Numeric(15, 2))
    sum_with_vat = Column(Numeric(15, 2))
    material_count = Column(Integer)


class RideReport(Base, MementoBaseMixin):
    """Výkaz dopravy (Ride Report)"""
    __tablename__ = 'memento_ride_report'

    date = Column(Date, nullable=False, index=True)
    number = Column(String(255))
    description = Column(Text)
    report_type = Column(String(100))
    order_id = Column(String(255), ForeignKey('memento_orders.id'), index=True)
    km_total = Column(Numeric(10, 2))
    hours_total = Column(Numeric(10, 2))
    ride_count = Column(Integer)
    wage_costs_total = Column(Numeric(15, 2))
    transport_costs = Column(Numeric(15, 2))
    sum = Column(Numeric(15, 2))


class MachinesReport(Base, MementoBaseMixin):
    """Výkaz strojov (Machines Report)"""
    __tablename__ = 'memento_machines_report'

    date = Column(Date, nullable=False, index=True)
    order_id = Column(String(255), ForeignKey('memento_orders.id'), index=True)
    sum_without_vat = Column(Numeric(15, 2))
    vat = Column(Numeric(15, 2))
    sum_with_vat = Column(Numeric(15, 2))


# ==================================================
# MASTER DATA
# ==================================================

class Employee(Base, MementoBaseMixin):
    """Zamestnanci (Employees) - 54 columns"""
    __tablename__ = 'memento_employees'

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


class Supplier(Base, MementoBaseMixin):
    """Dodávatelia (Suppliers)"""
    __tablename__ = 'memento_suppliers'

    name = Column(String(255), nullable=False, index=True)
    ico = Column(String(50), index=True)
    dic = Column(String(50))
    ic_dph = Column(String(50))
    email = Column(String(255))
    phone = Column(String(50))
    address = Column(Text)
    contact_person = Column(String(255))
    note = Column(Text)


class Partner(Base, MementoBaseMixin):
    """Partneri (Partners)"""
    __tablename__ = 'memento_partners'

    name = Column(String(255), nullable=False, index=True)
    ico = Column(String(50))
    email = Column(String(255))
    phone = Column(String(50))
    telegram_id = Column(String(100), index=True)
    address = Column(Text)
    note = Column(Text)


class Client(Base, MementoBaseMixin):
    """Klienti (Clients)"""
    __tablename__ = 'memento_clients'

    name = Column(String(255), nullable=False, index=True)
    ico = Column(String(50), index=True)
    dic = Column(String(50))
    ic_dph = Column(String(50))
    email = Column(String(255))
    phone = Column(String(50))
    telegram_id = Column(String(100), index=True)
    address = Column(Text)
    contact_person = Column(String(255))
    note = Column(Text)


class Vehicle(Base, MementoBaseMixin):
    """Vozidlá (Vehicles)"""
    __tablename__ = 'memento_vehicles'

    name = Column(String(255), nullable=False, index=True)
    registration_number = Column(String(50), index=True)
    brand = Column(String(100))
    model = Column(String(100))
    year = Column(Integer)
    km_rate = Column(Numeric(10, 2))
    is_active = Column(Boolean, default=True)


class Machinery(Base, MementoBaseMixin):
    """Mechanizácia (Machinery)"""
    __tablename__ = 'memento_machinery'

    name = Column(String(255), nullable=False, index=True)
    type = Column(String(100), index=True)
    brand = Column(String(100))
    model = Column(String(100))
    serial_number = Column(String(100))
    hourly_rate = Column(Numeric(10, 2))
    pausal_rate = Column(Numeric(10, 2))
    is_active = Column(Boolean, default=True)


# ==================================================
# LOCATIONS & CATALOGS
# ==================================================

class Place(Base, MementoBaseMixin):
    """Miesta (Places)"""
    __tablename__ = 'memento_places'

    name = Column(String(255), nullable=False, index=True)
    address = Column(Text)
    city = Column(String(100), index=True)
    postal_code = Column(String(20))
    country = Column(String(100))
    gps_coordinates = Column(String(100))
    note = Column(Text)


class Address(Base, MementoBaseMixin):
    """Adresy (Addresses)"""
    __tablename__ = 'memento_addresses'

    street = Column(String(255))
    house_number = Column(String(50))
    city = Column(String(100), index=True)
    postal_code = Column(String(20), index=True)
    country = Column(String(100), default='Slovakia')
    full_address = Column(Text)


class PriceListWork(Base, MementoBaseMixin):
    """Cenník prác (Price List Work)"""
    __tablename__ = 'memento_price_list_work'

    name = Column(String(255), nullable=False, index=True)
    unit = Column(String(50))
    unit_price = Column(Numeric(15, 2))
    vat_rate = Column(Numeric(5, 2))
    price_with_vat = Column(Numeric(15, 2))
    category = Column(String(100), index=True)
    description = Column(Text)
    is_active = Column(Boolean, default=True)


class Material(Base, MementoBaseMixin):
    """Materiál (Materials)"""
    __tablename__ = 'memento_materials'

    name = Column(String(255), nullable=False, index=True)
    code = Column(String(100), index=True)
    unit = Column(String(50))
    quantity = Column(Numeric(15, 2))
    purchase_price = Column(Numeric(15, 2))
    sell_price = Column(Numeric(15, 2))
    vat_rate = Column(Numeric(5, 2))
    margin = Column(Numeric(5, 2))
    category = Column(String(100), index=True)
    supplier_id = Column(String(255), ForeignKey('memento_suppliers.id'))
    description = Column(Text)
    is_active = Column(Boolean, default=True)


# ==================================================
# INVENTORY MOVEMENT
# ==================================================

class MaterialExpense(Base, MementoBaseMixin):
    """Výdajky materiálu (Material Expenses)"""
    __tablename__ = 'memento_material_expenses'

    date = Column(Date, nullable=False, index=True)
    material_id = Column(String(255), ForeignKey('memento_materials.id'), index=True)
    quantity = Column(Numeric(15, 2))
    unit = Column(String(50))
    price_per_unit = Column(Numeric(15, 2))
    total_price = Column(Numeric(15, 2))
    order_id = Column(String(255), ForeignKey('memento_orders.id'), index=True)
    issued_to_id = Column(String(255), ForeignKey('memento_employees.id'))
    note = Column(Text)


class MaterialReceipt(Base, MementoBaseMixin):
    """Príjemky materiálu (Material Receipts)"""
    __tablename__ = 'memento_material_receipts'

    date = Column(Date, nullable=False, index=True)
    material_id = Column(String(255), ForeignKey('memento_materials.id'), index=True)
    quantity = Column(Numeric(15, 2))
    unit = Column(String(50))
    price_per_unit = Column(Numeric(15, 2))
    total_price = Column(Numeric(15, 2))
    supplier_id = Column(String(255), ForeignKey('memento_suppliers.id'), index=True)
    invoice_number = Column(String(100))
    received_by_id = Column(String(255), ForeignKey('memento_employees.id'))
    note = Column(Text)


# ==================================================
# BUSINESS DOCUMENTS
# ==================================================

class Quote(Base, MementoBaseMixin):
    """Cenové ponuky (Quotes)"""
    __tablename__ = 'memento_quotes'

    date = Column(Date, nullable=False, index=True)
    quote_number = Column(String(100), unique=True, index=True)
    client_id = Column(String(255), ForeignKey('memento_clients.id'), index=True)
    valid_until = Column(Date)
    description = Column(Text)
    total_sum = Column(Numeric(15, 2))
    vat = Column(Numeric(15, 2))
    sum_with_vat = Column(Numeric(15, 2))
    quote_status = Column(String(50), index=True)
    note = Column(Text)


class QuotePart(Base, MementoBaseMixin):
    """Cenové ponuky Diely (Quote Parts)"""
    __tablename__ = 'memento_quote_parts'

    quote_id = Column(String(255), ForeignKey('memento_quotes.id'), nullable=False, index=True)
    item_name = Column(String(255))
    unit = Column(String(50))
    quantity = Column(Numeric(15, 2))
    unit_price = Column(Numeric(15, 2))
    total_price = Column(Numeric(15, 2))
    vat_rate = Column(Numeric(5, 2))
    description = Column(Text)
    sort_order = Column(Integer)


class Order(Base, MementoBaseMixin):
    """Zákazky (Orders)"""
    __tablename__ = 'memento_orders'

    date = Column(Date, nullable=False, index=True)
    order_number = Column(String(100), unique=True, index=True)
    order_name = Column(String(255), nullable=False, index=True)
    client_id = Column(String(255), ForeignKey('memento_clients.id'), index=True)
    quote_id = Column(String(255), ForeignKey('memento_quotes.id'))
    start_date = Column(Date)
    end_date = Column(Date)
    order_status = Column(String(50), index=True)
    telegram_group_id = Column(String(255))
    description = Column(Text)
    note = Column(Text)


class OrderPart(Base, MementoBaseMixin):
    """Zákazky Diely (Order Parts)"""
    __tablename__ = 'memento_order_parts'

    order_id = Column(String(255), ForeignKey('memento_orders.id'), nullable=False, index=True)
    item_name = Column(String(255))
    unit = Column(String(50))
    quantity = Column(Numeric(15, 2))
    unit_price = Column(Numeric(15, 2))
    total_price = Column(Numeric(15, 2))
    vat_rate = Column(Numeric(5, 2))
    description = Column(Text)
    sort_order = Column(Integer)


class Settlement(Base, MementoBaseMixin):
    """Vyúčtovania (Settlements)"""
    __tablename__ = 'memento_settlements'

    date = Column(Date, nullable=False, index=True)
    settlement_number = Column(String(100))
    order_id = Column(String(255), ForeignKey('memento_orders.id'), index=True)
    client_id = Column(String(255), ForeignKey('memento_clients.id'), index=True)
    period_from = Column(Date)
    period_to = Column(Date)
    work_sum = Column(Numeric(15, 2))
    materials_sum = Column(Numeric(15, 2))
    transport_sum = Column(Numeric(15, 2))
    machinery_sum = Column(Numeric(15, 2))
    total_sum = Column(Numeric(15, 2))
    vat = Column(Numeric(15, 2))
    sum_with_vat = Column(Numeric(15, 2))
    description = Column(Text)
    note = Column(Text)


# ==================================================
# FINANCIAL DOCUMENTS
# ==================================================

class Receivable(Base, MementoBaseMixin):
    """Pohľadávky (Receivables)"""
    __tablename__ = 'memento_receivables'

    date = Column(Date, nullable=False, index=True)
    due_date = Column(Date, index=True)
    debtor_id = Column(String(255), ForeignKey('memento_clients.id'), index=True)
    order_id = Column(String(255), ForeignKey('memento_orders.id'))
    amount = Column(Numeric(15, 2))
    paid_amount = Column(Numeric(15, 2), default=0)
    remaining_amount = Column(Numeric(15, 2))
    payment_status = Column(String(50), index=True)
    description = Column(Text)
    note = Column(Text)


class Obligation(Base, MementoBaseMixin):
    """Záväzky (Obligations)"""
    __tablename__ = 'memento_obligations'

    date = Column(Date, nullable=False, index=True)
    due_date = Column(Date, index=True)
    creditor_id = Column(String(255), ForeignKey('memento_suppliers.id'), index=True)
    order_id = Column(String(255), ForeignKey('memento_orders.id'))
    amount = Column(Numeric(15, 2))
    paid_amount = Column(Numeric(15, 2), default=0)
    remaining_amount = Column(Numeric(15, 2))
    payment_status = Column(String(50), index=True)
    description = Column(Text)
    note = Column(Text)


class IssuedInvoice(Base, MementoBaseMixin):
    """Vystavené faktúry (Issued Invoices)"""
    __tablename__ = 'memento_issued_invoices'

    date = Column(Date, nullable=False, index=True)
    invoice_number = Column(String(100), unique=True, index=True)
    client_id = Column(String(255), ForeignKey('memento_clients.id'), index=True)
    order_id = Column(String(255), ForeignKey('memento_orders.id'))
    due_date = Column(Date)
    total_sum = Column(Numeric(15, 2))
    vat = Column(Numeric(15, 2))
    sum_with_vat = Column(Numeric(15, 2))
    payment_status = Column(String(50), index=True)
    paid_date = Column(Date)
    description = Column(Text)
    note = Column(Text)


class ReceivedInvoice(Base, MementoBaseMixin):
    """Prijaté faktúry (Received Invoices)"""
    __tablename__ = 'memento_received_invoices'

    date = Column(Date, nullable=False, index=True)
    invoice_number = Column(String(100), index=True)
    supplier_id = Column(String(255), ForeignKey('memento_suppliers.id'), index=True)
    order_id = Column(String(255), ForeignKey('memento_orders.id'))
    due_date = Column(Date)
    total_sum = Column(Numeric(15, 2))
    vat = Column(Numeric(15, 2))
    sum_with_vat = Column(Numeric(15, 2))
    payment_status = Column(String(50), index=True)
    paid_date = Column(Date)
    description = Column(Text)
    note = Column(Text)


# ==================================================
# HISTORICAL PRICES
# ==================================================

class WorkPriceHistory(Base, MementoBaseMixin):
    """ceny prác (Work Prices History)"""
    __tablename__ = 'memento_work_prices_history'

    valid_from = Column(Date, nullable=False, index=True)
    valid_to = Column(Date, index=True)
    work_item_id = Column(String(255), ForeignKey('memento_price_list_work.id'), index=True)
    work_name = Column(String(255))
    unit = Column(String(50))
    unit_price = Column(Numeric(15, 2))
    vat_rate = Column(Numeric(5, 2))
    note = Column(Text)


class MaterialPriceHistory(Base, MementoBaseMixin):
    """ceny materiálu (Material Prices History)"""
    __tablename__ = 'memento_material_prices_history'

    valid_from = Column(Date, nullable=False, index=True)
    valid_to = Column(Date, index=True)
    material_id = Column(String(255), ForeignKey('memento_materials.id'), index=True)
    material_name = Column(String(255))
    unit = Column(String(50))
    purchase_price = Column(Numeric(15, 2))
    sell_price = Column(Numeric(15, 2))
    vat_rate = Column(Numeric(5, 2))
    note = Column(Text)


class MachineryPriceHistory(Base, MementoBaseMixin):
    """ceny mechanizácie (Machinery Prices History)"""
    __tablename__ = 'memento_machinery_prices_history'

    valid_from = Column(Date, nullable=False, index=True)
    valid_to = Column(Date, index=True)
    machinery_id = Column(String(255), ForeignKey('memento_machinery.id'), index=True)
    machinery_name = Column(String(255))
    hourly_rate = Column(Numeric(10, 2))
    pausal_rate = Column(Numeric(10, 2))
    note = Column(Text)


class TransportPriceHistory(Base, MementoBaseMixin):
    """ceny dopravy (Transport Prices History)"""
    __tablename__ = 'memento_transport_prices_history'

    valid_from = Column(Date, nullable=False, index=True)
    valid_to = Column(Date, index=True)
    vehicle_id = Column(String(255), ForeignKey('memento_vehicles.id'), index=True)
    vehicle_name = Column(String(255))
    km_rate = Column(Numeric(10, 2))
    note = Column(Text)


class EmployeeRateHistory(Base, MementoBaseMixin):
    """sadzby zamestnancov (Employee Rates History)"""
    __tablename__ = 'memento_employee_rates_history'

    valid_from = Column(Date, nullable=False, index=True)
    valid_to = Column(Date, index=True)
    employee_id = Column(String(255), ForeignKey('memento_employees.id'), index=True)
    employee_name = Column(String(255))
    hourly_rate = Column(Numeric(10, 2))
    position = Column(String(255))
    note = Column(Text)


class VATRateHistory(Base, MementoBaseMixin):
    """sadzby dph (VAT Rates History)"""
    __tablename__ = 'memento_vat_rates_history'

    valid_from = Column(Date, nullable=False, index=True)
    valid_to = Column(Date, index=True)
    rate_name = Column(String(100), index=True)
    rate_percentage = Column(Numeric(5, 2))
    note = Column(Text)


# ==================================================
# OTHER
# ==================================================

class Account(Base, MementoBaseMixin):
    """Účty (Accounts)"""
    __tablename__ = 'memento_accounts'

    account_name = Column(String(255), nullable=False, index=True)
    account_number = Column(String(100))
    bank_name = Column(String(255))
    iban = Column(String(50))
    swift = Column(String(20))
    balance = Column(Numeric(15, 2), default=0)
    account_type = Column(String(50), index=True)
    currency = Column(String(10), default='EUR')
    is_active = Column(Boolean, default=True)
    note = Column(Text)


# ==================================================
# JUNCTION TABLES (Many-to-Many)
# ==================================================

class WorkRecordEmployee(Base):
    """Work Records ↔ Employees"""
    __tablename__ = 'memento_work_records_employees'

    work_record_id = Column(String(255), ForeignKey('memento_work_records.id'), primary_key=True)
    employee_id = Column(String(255), ForeignKey('memento_employees.id'), primary_key=True)


class AttendanceEmployee(Base):
    """Attendance ↔ Employees (with attributes)"""
    __tablename__ = 'memento_attendance_employees'

    attendance_id = Column(String(255), ForeignKey('memento_attendance.id'), primary_key=True)
    employee_id = Column(String(255), ForeignKey('memento_employees.id'), primary_key=True)
    worked_hours = Column(Numeric(10, 2))
    hourly_rate = Column(Numeric(10, 2))
    bonus = Column(Numeric(10, 2))
    premium = Column(Numeric(15, 2))
    penalty = Column(Numeric(15, 2))
    daily_wage = Column(Numeric(15, 2))
    note = Column(Text)


class RideLogCrew(Base):
    """Ride Log ↔ Crew (Employees)"""
    __tablename__ = 'memento_ride_log_crew'

    ride_log_id = Column(String(255), ForeignKey('memento_ride_log.id'), primary_key=True)
    employee_id = Column(String(255), ForeignKey('memento_employees.id'), primary_key=True)


class RideLogOrder(Base):
    """Ride Log ↔ Orders"""
    __tablename__ = 'memento_ride_log_orders'

    ride_log_id = Column(String(255), ForeignKey('memento_ride_log.id'), primary_key=True)
    order_id = Column(String(255), ForeignKey('memento_orders.id'), primary_key=True)


class WorkRecordMachinery(Base):
    """Work Records ↔ Machinery"""
    __tablename__ = 'memento_work_records_machinery'

    work_record_id = Column(String(255), ForeignKey('memento_work_records.id'), primary_key=True)
    machinery_id = Column(String(255), ForeignKey('memento_machinery.id'), primary_key=True)


class CashBookObligation(Base):
    """Cash Book ↔ Obligations"""
    __tablename__ = 'memento_cash_book_obligations'

    cash_book_id = Column(String(255), ForeignKey('memento_cash_book.id'), primary_key=True)
    obligation_id = Column(String(255), ForeignKey('memento_obligations.id'), primary_key=True)


class CashBookReceivable(Base):
    """Cash Book ↔ Receivables"""
    __tablename__ = 'memento_cash_book_receivables'

    cash_book_id = Column(String(255), ForeignKey('memento_cash_book.id'), primary_key=True)
    receivable_id = Column(String(255), ForeignKey('memento_receivables.id'), primary_key=True)


# ==================================================
# TABLE NAME TO MODEL MAPPING
# ==================================================

TABLE_TO_MODEL = {
    'memento_daily_report': DailyReport,
    'memento_attendance': Attendance,
    'memento_work_records': WorkRecord,
    'memento_ride_log': RideLog,
    'memento_cash_book': CashBook,
    'memento_work_report': WorkReport,
    'memento_materials_report': MaterialsReport,
    'memento_ride_report': RideReport,
    'memento_machines_report': MachinesReport,
    'memento_employees': Employee,
    'memento_suppliers': Supplier,
    'memento_partners': Partner,
    'memento_clients': Client,
    'memento_vehicles': Vehicle,
    'memento_machinery': Machinery,
    'memento_places': Place,
    'memento_addresses': Address,
    'memento_price_list_work': PriceListWork,
    'memento_materials': Material,
    'memento_material_expenses': MaterialExpense,
    'memento_material_receipts': MaterialReceipt,
    'memento_quotes': Quote,
    'memento_quote_parts': QuotePart,
    'memento_orders': Order,
    'memento_order_parts': OrderPart,
    'memento_settlements': Settlement,
    'memento_receivables': Receivable,
    'memento_obligations': Obligation,
    'memento_issued_invoices': IssuedInvoice,
    'memento_received_invoices': ReceivedInvoice,
    'memento_work_prices_history': WorkPriceHistory,
    'memento_material_prices_history': MaterialPriceHistory,
    'memento_machinery_prices_history': MachineryPriceHistory,
    'memento_transport_prices_history': TransportPriceHistory,
    'memento_employee_rates_history': EmployeeRateHistory,
    'memento_vat_rates_history': VATRateHistory,
    'memento_accounts': Account,
}


def get_model_by_table_name(table_name: str):
    """Get SQLAlchemy model class by table name"""
    return TABLE_TO_MODEL.get(table_name)
