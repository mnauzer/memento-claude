"""
Library Table Mapper - Maps Slovak library names to PostgreSQL table names

This module provides mapping from Slovak Memento library names to
English PostgreSQL table names for universal sync script.
"""

from typing import Optional

# Slovak library name → PostgreSQL table name
LIBRARY_TABLE_MAP = {
    # Attendance & Work Records
    "Dochádzka": "memento_attendance",
    "Záznam prác": "memento_work_records",
    "Kniha jázd": "memento_ride_log",
    "Denný report": "memento_daily_report",

    # Master Data
    "Zamestnanci": "memento_employees",
    "Miesta": "memento_places",
    "Klienti": "memento_clients",
    "Dodávatelia": "memento_suppliers",
    "Partneri": "memento_partners",

    # Financial
    "Pokladňa": "memento_cash_book",
    "Pohľadávky": "memento_receivables",
    "Záväzky": "memento_obligations",
    "Vystavené faktúry": "memento_issued_invoices",
    "Prijaté faktúry": "memento_received_invoices",

    # Business Documents
    "Zákazky": "memento_orders",
    "Cenové ponuky": "memento_quotes",
    "Vyúčtovania": "memento_settlements",

    # Inventory
    "Materiál": "memento_materials",
    "Príjemky materiálu": "memento_material_receipts",
    "Výdajky materiálu": "memento_material_expenses",

    # Price Lists
    "Cenník prác": "memento_price_list_work",
    "ceny prác": "memento_work_prices_history",
    "ceny materiálu": "memento_material_prices_history",
    "ceny mechanizácie": "memento_machinery_prices_history",
    "ceny dopravy": "memento_transport_prices_history",
    "sadzby zamestnancov": "memento_employee_rates_history",
    "sadzby dph": "memento_vat_rates_history",

    # Reports
    "Výkaz prác": "memento_work_report",
    "Výkaz materiálu": "memento_materials_report",
    "Výkaz dopravy": "memento_ride_report",
    "Výkaz strojov": "memento_machines_report",

    # Assets
    "Vozidlá": "memento_vehicles",
    "Mechanizácia": "memento_machinery",

    # Accounts
    "Účty": "memento_accounts",
    "Adresy": "memento_addresses",
}


def get_table_name(library_name: str) -> Optional[str]:
    """
    Get PostgreSQL table name for a Slovak library name

    Args:
        library_name: Slovak library name from Memento (e.g., "Dochádzka")

    Returns:
        PostgreSQL table name (e.g., "memento_attendance") or None if not found

    Examples:
        >>> get_table_name("Dochádzka")
        'memento_attendance'

        >>> get_table_name("Zamestnanci")
        'memento_employees'

        >>> get_table_name("Unknown Library")
        None
    """
    return LIBRARY_TABLE_MAP.get(library_name)


def get_supported_libraries():
    """
    Get list of all supported library names

    Returns:
        List of Slovak library names that can be synced
    """
    return list(LIBRARY_TABLE_MAP.keys())


def is_library_supported(library_name: str) -> bool:
    """
    Check if a library is supported for sync

    Args:
        library_name: Slovak library name

    Returns:
        True if library can be synced, False otherwise
    """
    return library_name in LIBRARY_TABLE_MAP
