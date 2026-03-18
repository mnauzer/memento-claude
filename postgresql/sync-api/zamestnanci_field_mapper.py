"""
Zamestnanci (Employees) Field Mapping
Slovak Memento fields → English PostgreSQL columns
"""

ZAMESTNANCI_FIELDS = {
    # System fields
    "ID": "record_number",  # Custom numeric ID (not PK!)
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
