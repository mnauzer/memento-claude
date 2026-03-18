"""
Field Name Mapper - Translates Slovak Memento field names to English PostgreSQL column names

This module provides mappings from Slovak field names (as they appear in Memento Database)
to English column names (as they are defined in PostgreSQL tables).

Each library has its own field mapping dictionary.
"""

from typing import Dict, Optional

# Dochádzka (Attendance) field mappings
# Library ID: zNoMvrv8U (CORRECT ID - was incorrectly using qU4Br5hU6 before!)
DOCHADZKA_FIELDS = {
    "ID": "record_number",  # Custom numeric ID field (not primary key!)
    "Dátum": "date",
    "Deň": "day_of_week",
    "Príchod": "arrival",
    "Odchod": "departure",
    "Zamestnanci": "employees",  # junction table - multiple employees
    "Notifikácie": "notifications",  # linkToEntry - multiple
    "Poznámka": "note",
    "ikony záznamu": "entry_icons",
    "Voľno": "day_off",
    "Počet pracovníkov": "employee_count",
    "Pracovná doba": "work_time",
    "Odpracované": "worked_hours",
    "Mzdové náklady": "wage_costs",
    "stav záznamu": "entry_status",
    "info": "entry_info",
    "Debug_Log": "debug_log",
    "Error_Log": "error_log",
    "view": "view_mode",
    "farba záznamu": "record_color",
    "farba pozadia": "background_color",
    "zapísal": "created_by_user",
    "dátum zápisu": "created_date",
    "upravil": "modified_by_user",
    "dátum úpravy": "modified_date"
}

# Záznam prác (Work Records) field mappings
WORK_RECORDS_FIELDS = {
    "Dátum": "date",
    "Čas od": "time_from",
    "Čas do": "time_to",
    "Hodiny": "hours_worked",
    "Mzdové náklady": "wage_costs",
    "HZS suma": "hzs_sum",
    "Popis": "description",
    "Zákazka": "order_id",
    "Denný report": "daily_report_id",
    "Zamestnanci": "employees",  # junction table
    "Mechanizácia": "machinery",  # junction table
    "Druh práce": "work_type",
    "Množstvo": "quantity",
    "Jednotka": "unit",
    "info": "entry_info"
}

# Kniha jázd (Ride Log) field mappings
RIDE_LOG_FIELDS = {
    "Dátum": "date",
    "Čas od": "time_from",
    "Čas do": "time_to",
    "Vozidlo": "vehicle_id",
    "Osádka": "crew",  # junction table -> employees
    "Zákazky": "orders",  # junction table
    "Počiatočný stav": "odometer_start",
    "Konečný stav": "odometer_end",
    "Najazdené km": "distance_km",
    "Trasa": "route",
    "Poznámka": "note",
    "Náklady dopravy": "transport_costs",
    "info": "entry_info"
}

# Pokladňa (Cash Book) field mappings
CASH_BOOK_FIELDS = {
    "Dátum": "date",
    "Typ": "transaction_type",
    "Suma": "amount",
    "Popis": "description",
    "Kategória": "category",
    "Zákazka": "order_id",
    "Dodávateľ": "supplier_id",
    "Klient": "client_id",
    "Pohľadávky": "receivables",  # junction table
    "Záväzky": "obligations",  # junction table
    "DPH": "vat_amount",
    "info": "entry_info"
}

# Denný report (Daily Report) field mappings
DAILY_REPORT_FIELDS = {
    "Dátum": "date",
    "Deň": "day_of_week",
    "Popis": "description",
    "Celkové hodiny": "hours_total",
    "Dochádzka": "attendance_id",
    "Záznamy prác": "work_records",  # junction table
    "Jazdy": "rides",  # junction table
    "Pokladňa": "cash_book",  # junction table
    "info": "entry_info"
}

# Zamestnanci (Employees) field mappings
EMPLOYEES_FIELDS = {
    "ID": "record_number",  # Custom numeric ID field (not primary key!)
    "Meno": "first_name",  # Fixed: was "name"
    "Priezvisko": "last_name",  # Fixed: was "surname"
    "Nick": "nick",  # Fixed: was "nickname"
    "Pozícia": "position",
    "obdobie total": "period_total",
    "výber obdobia": "period_selection",
    "Na zákazkách": "worked_on_orders",  # Fixed: was "hours_on_orders"
    "Jazdy": "worked_driving",  # Fixed: was "hours_driving"
    "Odpracované": "worked_hours",  # Fixed: was "hours_worked"
    "Zarobené": "earned",
    "Prémie": "bonuses",
    "Vyplatené": "paid_out",
    "Na zákazkách total": "worked_on_orders_total",  # Fixed
    "Jazdy total": "worked_driving_total",  # Fixed
    "Odpracované total": "worked_hours_total",  # Fixed
    "Zarobené total": "earned_total",
    "Prémie total": "bonuses_total",
    "Vyplatené total": "paid_out_total",
    "Hrubá mzda": "gross_salary",  # Fixed: was "gross_wage"
    "Preplatok/Nedoplatok": "overpayment_underpayment",
    "Aktuálna hodinovka": "current_hourly_rate",
    "Záväzky": "obligations",
    "Pohľadávky": "receivables",
    "Saldo": "balance",
    "sms": "sms_enabled",  # Fixed: was "send_sms"
    "Mobil": "mobile",
    "email": "email_enabled",  # Fixed: was "send_email" - this is checkbox!
    "Email": "email",  # Fixed: was "email_address" - this is actual email!
    "Telegram notifikácie": "telegram_enabled",  # Fixed: was "telegram_notifications"
    "Telegram ID": "telegram_id",
    "Aktívny": "is_active",
    "Šofér": "is_driver",
    "Poznámka": "notes",  # Fixed: was "note"
    "view": "view_mode"
}

# Miesta (Places) field mappings
PLACES_FIELDS = {
    "ID": "record_number",  # Custom numeric ID field (not primary key!)
    "Názov": "name",
    "Lokalita": "locality",
    "Kategória": "category",
    "Aktívny": "is_active",
    "Zákazka": "is_order",
    "Adresa": "address",
    "GPS": "gps_location",
    "Vzdialenosť": "distance",
    "Čas jazdy": "drive_time",
    "Klient": "client_id",  # linkToEntry - single
    "Dodávateľ": "supplier_id",  # linkToEntry - single
    "Partner": "partner_id",  # linkToEntry - single
    "Zamestnanec": "employee_id",  # linkToEntry - single
    "Poznámka": "note",
    "info": "entry_info",
    "Debug_Log": "debug_log",
    "Error_Log": "error_log",
    "Fotky záhrada": "photos_garden",
    "Fotky zavlažovanie": "photos_irrigation",
    "view": "view_mode",
    "dátum zápisu": "created_date",
    "zapísal": "created_by",
    "dátum úpravy": "modified_date",
    "upravil": "modified_by",
    "ikony záznamu": "record_icons"
}

# Klienti (Clients) field mappings
CLIENTS_FIELDS = {
    "ID": "record_number",  # Custom numeric ID field (not primary key!)
    "Firma/Osoba": "entity_type",  # radio: firma/osoba
    "Aktívny": "is_active",
    "Nick": "nickname",
    "Meno": "first_name",
    "Priezvisko": "surname",
    "Titul": "title_before",
    "Titul za": "title_after",
    "Firma": "company_name",
    "Kontakt": "contact",
    "Ulica": "street",
    "PSČ": "postal_code",
    "Mesto": "city",
    "Email": "email",
    "Mobil": "mobile",
    "Poznámka": "note",
    "IČO": "company_id_number",
    "Platca DPH": "vat_payer",
    "IČ DPH": "vat_number",
    "Klienti": "related_clients",  # junction table - self-reference
    "info": "entry_info",
    "Dokument": "documents",  # linkToEntry - multiple
    "Debug_Log": "debug_log",
    "Error_Log": "error_log",
    "view": "view_mode",
    "dátum zápisu": "created_date",
    "zapísal": "created_by",
    "dátum úpravy": "modified_date",
    "upravil": "modified_by"
}

# Dodávatelia (Suppliers) field mappings
SUPPLIERS_FIELDS = {
    "ID": "record_number",  # Custom numeric ID field (not primary key!)
    "Názov": "company_name",  # Firma - company name
    "Popis": "notes",  # Poznámka - notes/description
    "Kontakt": "contact",  # Contact info
    "Ulica": "street",
    "PSČ": "postal_code",
    "Mesto": "city",
    "Email": "email",
    "Mobil": "mobile",
    "IČO": "ico",
    "Platca DPH": "is_vat_payer",
    "IČ DPH": "vat_id",
    "Aktívny": "is_active",
    "Nick": "nick"
}

# Partneri (Partners) field mappings
PARTNERS_FIELDS = {
    "view": "view_mode",
    "Firma/Osoba": "entity_type",  # radio: firma/osoba
    "Aktívny": "is_active",
    "Nick": "nickname",
    "Názov": "name",
    "Meno": "first_name",
    "Priezvisko": "surname",
    "Partner": "related_partners",  # junction table - self-reference
    "Dodávateľ": "supplier_id",  # linkToEntry
    "Klient": "client_id",  # linkToEntry
    "Kontakt": "contact"
}

# Zákazky (Orders) field mappings
ORDERS_FIELDS = {
    "Číslo zákazky": "order_number",
    "Názov": "name",
    "Klient": "client_id",
    "Stav": "order_status",
    "Dátum začiatku": "start_date",
    "Dátum ukončenia": "end_date",
    "Adresa": "address_id",
    "Miesto": "place_id",
    "Cenová ponuka": "quote_id",
    "Celková suma": "total_amount",
    "Popis": "description",
    "info": "entry_info"
}

# Cenové ponuky (Quotes) field mappings
QUOTES_FIELDS = {
    "Číslo ponuky": "quote_number",
    "Klient": "client_id",
    "Dátum vytvorenia": "created_date",
    "Platnosť do": "valid_until",
    "Stav": "quote_status",
    "Celková suma": "total_amount",
    "Popis": "description",
    "info": "entry_info"
}

# Master mapping dictionary: library_id -> field_mapping
FIELD_MAPPINGS: Dict[str, Dict[str, str]] = {
    "zNoMvrv8U": DOCHADZKA_FIELDS,  # Dochádzka (CORRECT ID!)
    "ArdaPo5TU": WORK_RECORDS_FIELDS,  # Záznam prác
    "nWb00Nogf": EMPLOYEES_FIELDS,  # Zamestnanci
    "mVadrV6p2": PLACES_FIELDS,  # Miesta
    "rh7YHaVRM": CLIENTS_FIELDS,  # Klienti
    "3FSQN0reH": SUPPLIERS_FIELDS,  # Dodávatelia
    "NffZSLRKU": PARTNERS_FIELDS,  # Partneri
}

# Library name -> field mapping (for fallback)
FIELD_MAPPINGS_BY_NAME: Dict[str, Dict[str, str]] = {
    "Dochádzka": DOCHADZKA_FIELDS,
    "Záznam prác": WORK_RECORDS_FIELDS,
    "Kniha jázd": RIDE_LOG_FIELDS,
    "Pokladňa": CASH_BOOK_FIELDS,
    "Denný report": DAILY_REPORT_FIELDS,
    "Zamestnanci": EMPLOYEES_FIELDS,
    "Zákazky": ORDERS_FIELDS,
    "Cenové ponuky": QUOTES_FIELDS,
    "Miesta": PLACES_FIELDS,
    "Klienti": CLIENTS_FIELDS,
    "Dodávatelia": SUPPLIERS_FIELDS,
    "Partneri": PARTNERS_FIELDS,
}


def get_column_name(library_id: str, slovak_field_name: str, library_name: Optional[str] = None) -> str:
    """
    Get English PostgreSQL column name for a Slovak Memento field name

    Args:
        library_id: Memento library ID (e.g., "qU4Br5hU6")
        slovak_field_name: Slovak field name from Memento (e.g., "Dátum")
        library_name: Optional Slovak library name for fallback lookup

    Returns:
        English column name (e.g., "date"), or snake_case version of input if not found
    """
    # Try lookup by library ID
    field_map = FIELD_MAPPINGS.get(library_id)
    if field_map and slovak_field_name in field_map:
        return field_map[slovak_field_name]

    # Fallback: try lookup by library name
    if library_name:
        field_map = FIELD_MAPPINGS_BY_NAME.get(library_name)
        if field_map and slovak_field_name in field_map:
            return field_map[slovak_field_name]

    # Fallback: convert to snake_case
    import re
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', slovak_field_name)
    s2 = re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1)
    return s2.lower()


def is_junction_field(library_id: str, slovak_field_name: str) -> bool:
    """
    Check if a field represents a many-to-many relationship (junction table)

    Args:
        library_id: Memento library ID
        slovak_field_name: Slovak field name from Memento

    Returns:
        True if field should use junction table, False otherwise
    """
    junction_fields = {
        "zNoMvrv8U": ["Zamestnanci", "Notifikácie"],  # Dochádzka (CORRECT ID!)
        "ArdaPo5TU": ["Zamestnanci", "Mechanizácia"],  # Záznam prác
        "rh7YHaVRM": ["Klienti", "Dokument"],  # Klienti - self-reference and documents
        "NffZSLRKU": ["Partner"],  # Partneri - self-reference
    }

    return slovak_field_name in junction_fields.get(library_id, [])
