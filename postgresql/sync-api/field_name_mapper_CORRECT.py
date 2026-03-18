"""
Field Name Mapper - CORRECT VERSION
Slovak Memento field names → English PostgreSQL column names

Based on ACTUAL field names received from Memento sync logs
Version: 2.0 (2026-03-18)
"""

from typing import Dict, Optional

# ==================================================
# ZAMESTNANCI (Employees) - ID: nWb00Nogf
# ==================================================
ZAMESTNANCI_FIELDS = {
    # System fields
    "ID": "record_number",
    "info": "info",
    "Debug_Log": "debug_log",
    "Error_Log": "error_log",
    "view": "view_mode",
    "farba záznamu": "record_color",
    "farba pozadia": "background_color",

    # Personal Information
    "Meno": "first_name",
    "Priezvisko": "last_name",
    "Nick": "nick",
    "Pozícia": "position",
    "Poznámka": "notes",

    # Contact Information
    "Mobil": "mobile",
    "Email": "email",
    "Telegram ID": "telegram_id",

    # Communication Preferences
    "sms": "sms_enabled",
    "email": "email_enabled",
    "Telegram notifikácie": "telegram_enabled",

    # Status Flags
    "Aktívny": "is_active",
    "Šofér": "is_driver",

    # Period Settings
    "obdobie total": "period_total",
    "výber obdobia": "period_selection",

    # Work Statistics (Current Period)
    "Na zákazkách": "worked_on_orders",
    "Jazdy": "worked_driving",
    "Odpracované": "worked_hours",
    "Zarobené": "earned",
    "Prémie": "bonuses",
    "Vyplatené": "paid_out",

    # Work Statistics (Total)
    "Na zákazkách total": "worked_on_orders_total",
    "Jazdy total": "worked_driving_total",
    "Odpracované total": "worked_hours_total",
    "Zarobené total": "earned_total",
    "Prémie total": "bonuses_total",
    "Vyplatené total": "paid_out_total",

    # Salary Information
    "Hrubá mzda": "gross_salary",
    "Preplatok/Nedoplatok": "overpayment_underpayment",
    "Aktuálna hodinovka": "current_hourly_rate",

    # Financial Balance
    "Záväzky": "obligations",
    "Pohľadávky": "receivables",
    "Saldo": "balance",

    # Ratings
    "Dochádzka": "attendance_rating",
    "Zákazky": "orders_rating",
    "Celkom": "total_rating",
}

# Subheaders (ignored - not stored in database)
ZAMESTNANCI_SUBHEADERS = [
    "--- Nastavenie prepočtu ---",
    "--- Odpracované ---",
    "--- Odpracované total---",
    "--- Mzdy ---",
    "--- Saldo ---",
    "--- Správy posielať ---",
    "--- Hodnotenie ---",
]

# ==================================================
# KLIENTI (Clients) - ID: rh7YHaVRM
# ==================================================
KLIENTI_FIELDS = {
    # System fields
    "ID": "record_number",
    "view": "view_mode",
    "dátum zápisu": "created_at",
    "zapísal": "created_by",
    "dátum úpravy": "updated_at",
    "upravil": "modified_by",

    # Type and status
    "Firma/Osoba": "entity_type",       # firma or osoba
    "Aktívny": "is_active",
    "Klient": "is_client",              # boolean flag

    # Personal/Company information
    "Nick": "nick",
    "Meno": "first_name",
    "Priezvisko": "last_name",
    "Titul": "title_before",
    "Titul za": "title_after",
    "Firma": "company_name",
    "Kontakt": "contact",               # JSON or multiline text

    # Address
    "Adresa": "address",                # full address
    "Ulica": "street",
    "PSČ": "postal_code",
    "Mesto": "city",

    # Contact details
    "Email": "email",
    "Mobil": "mobile",
    "Poznámka": "notes",
    "Ďalšie údaje": "additional_data",

    # Business registration
    "IČO": "ico",
    "Platca DPH": "is_vat_payer",       # boolean
    "IČ DPH": "vat_id",

    # Relationships (linkToEntry - handled separately as junction tables)
    "Prepojenia": "connections",        # linkToEntry - multiple
    "Klienti": "related_clients",       # linkToEntry - multiple
    "Dokument": "documents",            # linkToEntry - multiple
}

# ==================================================
# PARTNERI (Partners) - ID: NffZSLRKU
# ==================================================
PARTNERI_FIELDS = {
    # System fields
    "#": "record_number",
    "view": "view_mode",

    # Type and status
    "Firma/Osoba": "entity_type",       # firma or osoba
    "Aktívny": "is_active",
    "Partner": "is_partner",            # boolean flag
    "Dodávateľ": "is_supplier",         # boolean flag
    "Klient": "is_client",              # boolean flag

    # Personal/Company information
    "Nick": "nick",
    "Názov": "name",                    # company/person name
    "Meno": "first_name",
    "Priezvisko": "last_name",
    "Kontakt": "contact",               # JSON or multiline text
}

# ==================================================
# DODÁVATELIA (Suppliers) - ID: 3FSQN0reH
# ==================================================
# NOTE: Structure inferred from Klienti (very similar)
# Will be updated after first sync to verify actual fields
DODAVATELIA_FIELDS = {
    # System fields
    "ID": "record_number",
    "view": "view_mode",
    "dátum zápisu": "created_at",
    "zapísal": "created_by",
    "dátum úpravy": "updated_at",
    "upravil": "modified_by",

    # Type and status
    "Firma/Osoba": "entity_type",
    "Aktívny": "is_active",
    "Dodávateľ": "is_supplier",         # boolean flag

    # Personal/Company information
    "Nick": "nick",
    "Meno": "first_name",
    "Priezvisko": "last_name",
    "Titul": "title_before",
    "Titul za": "title_after",
    "Firma": "company_name",
    "Kontakt": "contact",

    # Address
    "Adresa": "address",
    "Ulica": "street",
    "PSČ": "postal_code",
    "Mesto": "city",

    # Contact details
    "Email": "email",
    "Mobil": "mobile",
    "Poznámka": "notes",
    "Ďalšie údaje": "additional_data",

    # Business registration
    "IČO": "ico",
    "Platca DPH": "is_vat_payer",
    "IČ DPH": "vat_id",

    # Relationships
    "Prepojenia": "connections",
    "Dokument": "documents",
}

# ==================================================
# FIELD MAPPINGS REGISTRY
# ==================================================

# Dictionary for fast lookup by library name
FIELD_MAPPINGS_BY_NAME: Dict[str, Dict[str, str]] = {
    'Zamestnanci': ZAMESTNANCI_FIELDS,
    'Klienti': KLIENTI_FIELDS,
    'Partneri': PARTNERI_FIELDS,
    'Dodávatelia': DODAVATELIA_FIELDS,
}

# Dictionary for fast lookup by library ID
FIELD_MAPPINGS: Dict[str, Dict[str, str]] = {
    'nWb00Nogf': ZAMESTNANCI_FIELDS,
    'rh7YHaVRM': KLIENTI_FIELDS,
    'NffZSLRKU': PARTNERI_FIELDS,
    '3FSQN0reH': DODAVATELIA_FIELDS,
}

# ==================================================
# HELPER FUNCTIONS
# ==================================================

def get_field_mapping(library_name: str = None, library_id: str = None) -> Optional[Dict[str, str]]:
    """
    Get field mapping for a library by name or ID

    Args:
        library_name: Slovak library name (e.g., "Zamestnanci")
        library_id: Memento library ID (e.g., "nWb00Nogf")

    Returns:
        Dictionary mapping Slovak field names to English column names
        None if library not found
    """
    if library_id and library_id in FIELD_MAPPINGS:
        return FIELD_MAPPINGS[library_id]

    if library_name and library_name in FIELD_MAPPINGS_BY_NAME:
        return FIELD_MAPPINGS_BY_NAME[library_name]

    return None


def map_field_name(field_name: str, library_name: str = None, library_id: str = None) -> str:
    """
    Map a single field name from Slovak to English

    Args:
        field_name: Slovak field name (e.g., "Meno")
        library_name: Slovak library name (e.g., "Zamestnanci")
        library_id: Memento library ID (e.g., "nWb00Nogf")

    Returns:
        English column name (e.g., "first_name")
        Original field name if no mapping found
    """
    mapping = get_field_mapping(library_name, library_id)

    if mapping and field_name in mapping:
        return mapping[field_name]

    # Return original if no mapping found
    return field_name


def is_subheader(field_name: str, library_name: str = None) -> bool:
    """
    Check if field name is a subheader (should be ignored)

    Args:
        field_name: Field name to check
        library_name: Library name

    Returns:
        True if field is a subheader, False otherwise
    """
    if library_name == 'Zamestnanci':
        return field_name in ZAMESTNANCI_SUBHEADERS

    # Check if field name starts with "---" (common subheader pattern)
    return field_name.startswith('---')


# ==================================================
# VALIDATION
# ==================================================

def validate_mappings():
    """Validate that all mappings are consistent"""
    issues = []

    # Check for duplicate column names within each library
    for lib_name, mapping in FIELD_MAPPINGS_BY_NAME.items():
        column_names = list(mapping.values())
        duplicates = [col for col in set(column_names) if column_names.count(col) > 1]
        if duplicates:
            issues.append(f"{lib_name}: Duplicate column names: {duplicates}")

    # Check consistency of common fields across libraries
    common_fields = {
        "Nick": "nick",
        "Meno": "first_name",
        "Priezvisko": "last_name",
        "Aktívny": "is_active",
        "Email": "email",
        "Mobil": "mobile",
        "Poznámka": "notes",
        "IČO": "ico",
        "view": "view_mode",
    }

    for slovak_name, expected_english in common_fields.items():
        for lib_name, mapping in FIELD_MAPPINGS_BY_NAME.items():
            if slovak_name in mapping and mapping[slovak_name] != expected_english:
                issues.append(
                    f"{lib_name}: Inconsistent mapping for '{slovak_name}': "
                    f"expected '{expected_english}', got '{mapping[slovak_name]}'"
                )

    return issues


if __name__ == "__main__":
    # Validate mappings
    issues = validate_mappings()
    if issues:
        print("❌ Mapping validation issues:")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("✅ All mappings are valid and consistent")

    # Print summary
    print("\n📊 Field Mapping Summary:")
    for lib_name, mapping in FIELD_MAPPINGS_BY_NAME.items():
        print(f"\n{lib_name}:")
        print(f"  - Total fields: {len(mapping)}")
        print(f"  - Library ID: {[k for k, v in FIELD_MAPPINGS.items() if v == mapping][0]}")
