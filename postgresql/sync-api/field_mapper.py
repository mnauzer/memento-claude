"""
Field Type Mapper - Converts between Memento field types and PostgreSQL types

Handles the mapping of Memento Database field types to appropriate PostgreSQL
column types, including special handling for linkToEntry fields (foreign keys).
"""

from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, date, time
import logging

logger = logging.getLogger(__name__)


class FieldTypeMapper:
    """Maps Memento field types to PostgreSQL column types"""

    # Mapping of Memento field types to PostgreSQL types
    TYPE_MAPPING: Dict[str, str] = {
        # Text types
        'text': 'TEXT',
        'richtext': 'TEXT',
        'textarea': 'TEXT',

        # Numeric types
        'int': 'INTEGER',
        'integer': 'INTEGER',
        'double': 'NUMERIC',
        'number': 'NUMERIC',
        'currency': 'NUMERIC(15,2)',

        # Date/Time types
        'date': 'DATE',
        'time': 'TIME',
        'datetime': 'TIMESTAMP',

        # Boolean
        'checkbox': 'BOOLEAN',
        'boolean': 'BOOLEAN',

        # Choice/Select (stored as text)
        'choice': 'VARCHAR(255)',
        'radio': 'VARCHAR(255)',
        'select': 'VARCHAR(255)',

        # User (stored as user ID/name)
        'user': 'VARCHAR(255)',

        # Color (stored as hex string)
        'color': 'VARCHAR(10)',

        # File/Image (stored as URL or file path)
        'file': 'TEXT',
        'image': 'TEXT',
        'photo': 'TEXT',

        # Location (GPS coordinates)
        'location': 'POINT',  # PostgreSQL geography type
        'gps': 'VARCHAR(100)',  # Or store as "lat,lng" string

        # Link to entry (foreign key)
        'entries': 'VARCHAR(255)',  # Memento entry ID
        'linkToEntry': 'VARCHAR(255)',

        # Calculated fields (read-only in Memento)
        'calculated': 'TEXT',
        'formula': 'TEXT',

        # Special types
        'barcode': 'VARCHAR(255)',
        'email': 'VARCHAR(255)',
        'phone': 'VARCHAR(50)',
        'url': 'TEXT',
    }

    @classmethod
    def get_pg_type(cls, memento_type: str, field_name: str = '') -> str:
        """
        Get PostgreSQL type for a Memento field type

        Args:
            memento_type: Memento field type (e.g., 'text', 'date', 'entries')
            field_name: Optional field name for context-specific handling

        Returns:
            PostgreSQL column type (e.g., 'TEXT', 'DATE', 'VARCHAR(255)')
        """
        pg_type = cls.TYPE_MAPPING.get(memento_type.lower(), 'TEXT')

        # Special handling for ID fields
        if 'id' in field_name.lower():
            return 'VARCHAR(255)'

        return pg_type

    @classmethod
    def is_link_field(cls, memento_type: str) -> bool:
        """Check if field is a linkToEntry (foreign key)"""
        return memento_type.lower() in ('entries', 'linktoentry')

    @classmethod
    def convert_value_to_pg(cls, value: Any, memento_type: str) -> Any:
        """
        Convert a Memento field value to PostgreSQL-compatible value

        Args:
            value: The value from Memento
            memento_type: Memento field type

        Returns:
            Value ready for PostgreSQL insertion
        """
        if value is None:
            return None

        memento_type = memento_type.lower()

        try:
            # Text types - keep as is
            if memento_type in ('text', 'richtext', 'textarea'):
                return str(value)

            # Numeric types
            if memento_type in ('int', 'integer'):
                return int(value) if value != '' else None
            if memento_type in ('double', 'number', 'currency'):
                return float(value) if value != '' else None

            # Date/Time types
            if memento_type == 'date':
                if isinstance(value, datetime):
                    return value.date()
                if isinstance(value, date):
                    return value
                if isinstance(value, str):
                    # Parse date string (format: YYYY-MM-DD or DD.MM.YYYY)
                    if '-' in value:
                        return datetime.strptime(value, '%Y-%m-%d').date()
                    elif '.' in value:
                        return datetime.strptime(value, '%d.%m.%Y').date()
                return None

            if memento_type == 'time':
                if isinstance(value, time):
                    return value
                if isinstance(value, str):
                    # Parse time string (format: HH:MM or HH:MM:SS)
                    try:
                        return datetime.strptime(value, '%H:%M:%S').time()
                    except ValueError:
                        return datetime.strptime(value, '%H:%M').time()
                return None

            if memento_type == 'datetime':
                if isinstance(value, datetime):
                    return value
                if isinstance(value, str):
                    # Parse datetime string (ISO format)
                    return datetime.fromisoformat(value.replace('Z', '+00:00'))
                return None

            # Boolean
            if memento_type in ('checkbox', 'boolean'):
                if isinstance(value, bool):
                    return value
                if isinstance(value, str):
                    return value.lower() in ('true', '1', 'yes', 'ano')
                return bool(value)

            # Choice/Select - keep as string
            if memento_type in ('choice', 'radio', 'select'):
                return str(value)

            # LinkToEntry - extract ID(s)
            if memento_type in ('entries', 'linktoentry'):
                if isinstance(value, list):
                    # Multiple entries - return first one (junction table handles rest)
                    return value[0] if value else None
                elif isinstance(value, dict):
                    # Single entry as dict
                    return value.get('id')
                elif isinstance(value, str):
                    # Already an ID
                    return value
                return None

            # Default: convert to string
            return str(value)

        except Exception as e:
            logger.warning(f"Error converting value {value} of type {memento_type}: {e}")
            return None

    @classmethod
    def extract_linked_ids(cls, value: Any) -> List[str]:
        """
        Extract all entry IDs from a linkToEntry field

        Args:
            value: The linkToEntry field value (can be single entry or list)

        Returns:
            List of entry IDs
        """
        if value is None:
            return []

        ids = []

        if isinstance(value, list):
            # Multiple entries
            for item in value:
                if isinstance(item, dict):
                    entry_id = item.get('id')
                    if entry_id:
                        ids.append(str(entry_id))
                elif isinstance(item, str):
                    ids.append(item)
        elif isinstance(value, dict):
            # Single entry
            entry_id = value.get('id')
            if entry_id:
                ids.append(str(entry_id))
        elif isinstance(value, str):
            # Already an ID
            ids.append(value)

        return ids

    @classmethod
    def prepare_insert_data(cls, entry_data: Dict[str, Any], field_types: Dict[str, str]) -> Dict[str, Any]:
        """
        Prepare entry data for PostgreSQL insertion

        Args:
            entry_data: Raw entry data from Memento
            field_types: Mapping of field names to Memento types

        Returns:
            Dictionary of field names to PostgreSQL-compatible values
        """
        pg_data = {}

        for field_name, value in entry_data.items():
            memento_type = field_types.get(field_name, 'text')

            # Convert value
            pg_value = cls.convert_value_to_pg(value, memento_type)
            pg_data[field_name] = pg_value

        return pg_data

    @classmethod
    def get_field_definition(cls, field_name: str, memento_type: str, is_nullable: bool = True) -> str:
        """
        Get complete PostgreSQL column definition

        Args:
            field_name: Name of the column
            memento_type: Memento field type
            is_nullable: Whether column allows NULL values

        Returns:
            PostgreSQL column definition (e.g., "field_name TEXT NULL")
        """
        pg_type = cls.get_pg_type(memento_type, field_name)
        nullable = "NULL" if is_nullable else "NOT NULL"

        return f"{field_name} {pg_type} {nullable}"


# Convenience functions
def memento_to_pg_type(memento_type: str) -> str:
    """Convert Memento type to PostgreSQL type"""
    return FieldTypeMapper.get_pg_type(memento_type)


def prepare_for_insert(data: Dict[str, Any], types: Dict[str, str]) -> Dict[str, Any]:
    """Prepare data for PostgreSQL insertion"""
    return FieldTypeMapper.prepare_insert_data(data, types)


def extract_linked_ids(value: Any) -> List[str]:
    """Extract entry IDs from linkToEntry field"""
    return FieldTypeMapper.extract_linked_ids(value)


if __name__ == "__main__":
    # Test type mappings
    print("=== Memento to PostgreSQL Type Mapping ===")
    for memento_type, pg_type in FieldTypeMapper.TYPE_MAPPING.items():
        print(f"{memento_type:20} → {pg_type}")

    # Test value conversion
    print("\n=== Value Conversion Examples ===")
    test_cases = [
        ("2025-03-15", "date"),
        ("14:30", "time"),
        ("true", "checkbox"),
        ("123.45", "currency"),
        ([{"id": "abc123"}], "entries"),
    ]

    for value, memento_type in test_cases:
        converted = FieldTypeMapper.convert_value_to_pg(value, memento_type)
        print(f"{value!r} ({memento_type}) → {converted!r}")
