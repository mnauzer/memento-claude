"""
Memento to PostgreSQL Sync Handler

Handles sync from Memento Database to PostgreSQL:
- Receives entry data from Memento trigger scripts
- Transforms to PostgreSQL format
- Performs UPSERT (INSERT or UPDATE)
- Logs sync operations
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, date, time
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import text

from models import (
    Base, SyncLog, SyncMetadata, TABLE_TO_MODEL,
    WorkRecordEmployee, AttendanceEmployee, RideLogCrew, RideLogOrder,
    WorkRecordMachinery, CashBookObligation, CashBookReceivable
)
from field_mapper import FieldTypeMapper
from field_name_mapper import get_column_name, is_junction_field
from config import Config

logger = logging.getLogger(__name__)


class MementoToPostgreSQLSync:
    """Handles synchronization from Memento to PostgreSQL"""

    def __init__(self, db_session: Session):
        self.db = db_session
        self.config = Config()
        self.field_mapper = FieldTypeMapper()

    async def sync_entry(
        self,
        library_id: str,
        library_name: str,
        table_name: str,
        entry_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Sync a single entry from Memento to PostgreSQL

        Args:
            library_id: Memento library ID
            library_name: Slovak library name
            table_name: PostgreSQL table name
            entry_data: Entry data from Memento

        Returns:
            Sync result with success status and details
        """
        try:
            # Get SQLAlchemy model
            model_class = TABLE_TO_MODEL.get(table_name)
            if not model_class:
                raise ValueError(f"Unknown table: {table_name}")

            # Extract core fields
            entry_id = entry_data.get('id')
            if not entry_id:
                raise ValueError("Entry ID is required")

            status = entry_data.get('status', 'active')
            created_time = entry_data.get('createdTime')
            modified_time = entry_data.get('modifiedTime')
            created_by = entry_data.get('createdBy', {}).get('name') if isinstance(entry_data.get('createdBy'), dict) else entry_data.get('createdBy')
            modified_by = entry_data.get('modifiedBy', {}).get('name') if isinstance(entry_data.get('modifiedBy'), dict) else entry_data.get('modifiedBy')

            # Extract custom fields
            fields = entry_data.get('fields', {})

            # Debug logging - show what fields we received
            logger.info(f"Entry {entry_id}: Received fields: {list(fields.keys())}")
            if 'Zamestnanci' in fields or 'employees' in fields:
                logger.info(f"Entry {entry_id}: Zamestnanci field = {fields.get('Zamestnanci', fields.get('employees'))}")

            # Prepare data for PostgreSQL
            pg_data = self._prepare_entry_data(
                model_class=model_class,
                library_id=library_id,
                library_name=library_name,
                entry_id=entry_id,
                status=status,
                fields=fields,
                created_time=created_time,
                modified_time=modified_time,
                created_by=created_by,
                modified_by=modified_by
            )

            # Handle linkToEntry fields (junction tables)
            junction_data = self._extract_junction_data(table_name, entry_id, fields, library_name)

            # Perform UPSERT
            await self._upsert_entry(model_class, pg_data)

            # Update junction tables
            for junction_table, links in junction_data.items():
                await self._update_junction_table(junction_table, entry_id, links)

            # Log success
            await self._log_sync(
                library_id=library_id,
                library_name=library_name,
                entry_id=entry_id,
                sync_direction='memento_to_pg',
                success=True
            )

            # Update metadata
            await self._update_metadata(library_id, library_name, table_name)

            return {
                'success': True,
                'entry_id': entry_id,
                'table': table_name,
                'operation': 'upsert',
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error syncing entry {entry_data.get('id')} to {table_name}: {e}", exc_info=True)

            # Log failure
            await self._log_sync(
                library_id=library_id,
                library_name=library_name,
                entry_id=entry_data.get('id'),
                sync_direction='memento_to_pg',
                success=False,
                error_message=str(e)
            )

            return {
                'success': False,
                'entry_id': entry_data.get('id'),
                'table': table_name,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    def _prepare_entry_data(
        self,
        model_class,
        library_id: str,
        library_name: str,
        entry_id: str,
        status: str,
        fields: Dict[str, Any],
        created_time: Optional[str],
        modified_time: Optional[str],
        created_by: Optional[str],
        modified_by: Optional[str]
    ) -> Dict[str, Any]:
        """
        Prepare entry data for PostgreSQL insertion

        Args:
            model_class: SQLAlchemy model class
            library_id: Memento library ID
            library_name: Slovak library name
            entry_id: Entry ID
            status: Entry status
            fields: Custom fields
            created_time: Created timestamp
            modified_time: Modified timestamp
            created_by: Created by user
            modified_by: Modified by user

        Returns:
            Dictionary ready for PostgreSQL insertion
        """
        pg_data = {
            'id': entry_id,
            'status': status,
            'memento_created_time': self._parse_timestamp(created_time),
            'memento_modified_time': self._parse_timestamp(modified_time),
            'created_by': created_by,
            'modified_by': modified_by,
            'sync_source': 'memento',
            'synced_at': datetime.now()
        }

        # Get model columns
        model_columns = {col.name for col in model_class.__table__.columns}

        # Map custom fields to PostgreSQL columns
        for field_name, field_value in fields.items():
            # Convert Slovak field name to English column name
            column_name = get_column_name(field_name, library_name, library_id)

            logger.info(f"Mapping field '{field_name}' -> column '{column_name}'")

            # CRITICAL: Never overwrite the primary key 'id' column with custom field data
            if column_name == 'id':
                logger.warning(f"Skipping field '{field_name}' - would overwrite primary key 'id'")
                continue

            # Skip if column doesn't exist in model
            if column_name not in model_columns:
                logger.debug(f"Skipping unknown column: {column_name}")
                continue

            # Parse field value based on column type
            field_value = self._parse_field_value(field_value, column_name, model_class)

            # Handle linkToEntry fields (foreign keys)
            if isinstance(field_value, dict) and 'id' in field_value:
                # Single linkToEntry - extract ID
                pg_data[column_name] = field_value['id']
            elif isinstance(field_value, list) and len(field_value) > 0:
                # Multiple linkToEntry - check if first item is dict
                if isinstance(field_value[0], dict) and 'id' in field_value[0]:
                    # Take first ID for single FK column
                    # (rest will be in junction table)
                    if column_name.endswith('_id'):
                        pg_data[column_name] = field_value[0]['id']
                    # Skip non-FK columns with multiple values
                    continue
                else:
                    # Regular list value
                    pg_data[column_name] = field_value
            else:
                # Regular value
                pg_data[column_name] = field_value

        return pg_data

    def _extract_junction_data(
        self,
        table_name: str,
        entry_id: str,
        fields: Dict[str, Any],
        library_name: str = None
    ) -> Dict[str, List[str]]:
        """
        Extract data for junction tables (many-to-many relationships)

        Args:
            table_name: Main table name
            entry_id: Entry ID
            fields: Entry fields
            library_name: Library name for field mapping lookup

        Returns:
            Dictionary of junction table names to list of linked IDs
        """
        junction_data = {}

        # Define junction table mappings
        junction_mappings = {
            'memento_work_records': {
                'employees': ('memento_work_records_employees', 'employee_id'),
                'machinery': ('memento_work_records_machinery', 'machinery_id'),
            },
            'memento_attendance': {
                'employees': ('memento_attendance_employees', 'employee_id'),
            },
            'memento_ride_log': {
                'crew': ('memento_ride_log_crew', 'employee_id'),
                'orders': ('memento_ride_log_orders', 'order_id'),
            },
            'memento_cash_book': {
                'obligations': ('memento_cash_book_obligations', 'obligation_id'),
                'claims': ('memento_cash_book_receivables', 'receivable_id'),
            }
        }

        # Get mappings for this table
        table_mappings = junction_mappings.get(table_name, {})

        for field_name, (junction_table, id_column) in table_mappings.items():
            # Try to find the field value - check both English and Slovak names
            field_value = None

            # Try English name first
            if field_name in fields:
                field_value = fields.get(field_name)
            # Try Slovak name from field_name_mapper
            else:
                from field_name_mapper import FIELD_MAPPINGS_BY_NAME
                # Get Slovak name that maps to this English column name
                field_map = FIELD_MAPPINGS_BY_NAME.get(library_name, {})
                slovak_name = None
                for slovak, english in field_map.items():
                    if english == field_name:
                        slovak_name = slovak
                        break
                if slovak_name:
                    field_value = fields.get(slovak_name)

            if not field_value:
                logger.debug(f"No value found for junction field: {field_name}")
                continue

            logger.info(f"Processing junction field {field_name}: {len(field_value) if isinstance(field_value, list) else 1} items")

            # Extract IDs
            linked_ids = []
            if isinstance(field_value, list):
                for item in field_value:
                    if isinstance(item, dict) and 'id' in item:
                        linked_ids.append(item['id'])
                    elif isinstance(item, str):
                        linked_ids.append(item)
            elif isinstance(field_value, dict) and 'id' in field_value:
                linked_ids.append(field_value['id'])

            if linked_ids:
                junction_data[junction_table] = linked_ids

        return junction_data

    async def _upsert_entry(self, model_class, data: Dict[str, Any]) -> None:
        """
        Perform UPSERT (INSERT or UPDATE) operation

        Args:
            model_class: SQLAlchemy model class
            data: Data to insert/update
        """
        # PostgreSQL UPSERT using INSERT ... ON CONFLICT
        stmt = insert(model_class).values(**data)
        stmt = stmt.on_conflict_do_update(
            index_elements=['id'],
            set_={k: v for k, v in data.items() if k != 'id'}
        )

        self.db.execute(stmt)
        self.db.commit()

    async def _update_junction_table(
        self,
        junction_table: str,
        parent_id: str,
        linked_ids: List[str]
    ) -> None:
        """
        Update junction table (many-to-many relationship)

        Args:
            junction_table: Junction table name
            parent_id: Parent entry ID
            linked_ids: List of linked entry IDs
        """
        # Delete existing links
        parent_column = f"{junction_table.split('_')[-2]}_id"
        child_column = f"{junction_table.split('_')[-1]}_id"

        # Special handling for specific junction tables
        if junction_table == 'memento_work_records_employees':
            parent_column = 'work_record_id'
            child_column = 'employee_id'
        elif junction_table == 'memento_attendance_employees':
            parent_column = 'attendance_id'
            child_column = 'employee_id'
        elif junction_table == 'memento_ride_log_crew':
            parent_column = 'ride_log_id'
            child_column = 'employee_id'
        elif junction_table == 'memento_ride_log_orders':
            parent_column = 'ride_log_id'
            child_column = 'order_id'
        elif junction_table == 'memento_work_records_machinery':
            parent_column = 'work_record_id'
            child_column = 'machinery_id'
        elif junction_table == 'memento_cash_book_obligations':
            parent_column = 'cash_book_id'
            child_column = 'obligation_id'
        elif junction_table == 'memento_cash_book_receivables':
            parent_column = 'cash_book_id'
            child_column = 'receivable_id'

        # Delete old links
        delete_stmt = text(f"DELETE FROM {junction_table} WHERE {parent_column} = :parent_id")
        self.db.execute(delete_stmt, {'parent_id': parent_id})

        # Insert new links
        for linked_id in linked_ids:
            insert_stmt = text(f"""
                INSERT INTO {junction_table} ({parent_column}, {child_column})
                VALUES (:parent_id, :child_id)
                ON CONFLICT DO NOTHING
            """)
            self.db.execute(insert_stmt, {'parent_id': parent_id, 'child_id': linked_id})

        self.db.commit()

    async def _log_sync(
        self,
        library_id: str,
        library_name: str,
        entry_id: str,
        sync_direction: str,
        success: bool,
        error_message: Optional[str] = None
    ) -> None:
        """Log sync operation"""
        log_entry = SyncLog(
            library_id=library_id,
            library_name=library_name,
            entry_id=entry_id,
            sync_direction=sync_direction,
            success=success,
            error_message=error_message
        )
        self.db.add(log_entry)
        self.db.commit()

    async def _update_metadata(
        self,
        library_id: str,
        library_name: str,
        table_name: str
    ) -> None:
        """Update sync metadata"""
        metadata = self.db.query(SyncMetadata).filter_by(library_id=library_id).first()

        if metadata:
            metadata.last_sync = datetime.now()
            metadata.updated_at = datetime.now()
        else:
            # Create if doesn't exist
            metadata = SyncMetadata(
                library_id=library_id,
                library_name=library_name,
                table_name=table_name,
                last_sync=datetime.now()
            )
            self.db.add(metadata)

        # Update entry count
        count_stmt = text(f"SELECT COUNT(*) FROM {table_name} WHERE status = 'active'")
        result = self.db.execute(count_stmt)
        count = result.scalar()
        metadata.entry_count = count

        self.db.commit()

    def _parse_field_value(self, value: Any, column_name: str, model_class) -> Any:
        """
        Parse field value based on column type

        Handles special conversions:
        - BOOLEAN columns: Convert string/numeric values to boolean
        - TIME columns: Extract time from datetime string
        - DATE columns: Parse date strings
        - TIMESTAMP columns: Parse datetime strings
        """
        # Get column type from model
        try:
            column = model_class.__table__.columns[column_name]
            column_type = str(column.type)

            # Handle BOOLEAN columns BEFORE null check (empty string = False for booleans)
            if 'BOOLEAN' in column_type.upper():
                logger.info(f"BOOLEAN column '{column_name}': value={repr(value)}, type={type(value).__name__}")
                # Handle None and empty string for boolean columns
                if value is None:
                    logger.info(f"  → Returning None (value is None)")
                    return None
                if value == '':
                    logger.info(f"  → Returning False (empty string)")
                    return False
                # Convert various representations to boolean
                if isinstance(value, bool):
                    return value
                if isinstance(value, str):
                    # Common boolean string representations
                    value_lower = value.lower().strip()
                    if value_lower in ('true', 'yes', 'ano', '1', 't', 'y'):
                        return True
                    elif value_lower in ('false', 'no', 'nie', '0', 'f', 'n', ''):
                        return False
                    # Non-empty string = True (Memento checkbox field name = checked)
                    return len(value.strip()) > 0
                if isinstance(value, (int, float)):
                    return value != 0
                # Default: truthy values = True
                return bool(value)
        except Exception as e:
            logger.warning(f"Exception in _parse_field_value for column '{column_name}': {e}")

        # For non-boolean columns, None and empty string = None
        if value is None or value == '':
            logger.info(f"Non-boolean column '{column_name}': Returning None for empty/null value={repr(value)}")
            return None

        # Get column type from model again (for non-boolean types)
        try:
            column = model_class.__table__.columns[column_name]
            column_type = str(column.type)

            # Handle TIME columns
            if 'TIME' in column_type.upper() and 'TIMESTAMP' not in column_type.upper():
                # Memento sends time as "1970-01-01T07:00:00.000Z"
                # The 'Z' is misleading - it's actually local time, not UTC!
                # Extract just the time part WITHOUT timezone conversion
                if isinstance(value, str):
                    try:
                        logger.info(f"Parsing TIME field '{column_name}': raw value = '{value}'")
                        # Remove 'Z' and milliseconds, parse as naive datetime
                        time_str = value.replace('Z', '').split('.')[0]  # "1970-01-01T07:00:00"
                        logger.info(f"  After removing Z and ms: '{time_str}'")
                        dt = datetime.fromisoformat(time_str)
                        result_time = dt.time()
                        logger.info(f"  Parsed time result: {result_time}")
                        return result_time  # Returns 07:00:00 (local time)
                    except Exception as e:
                        logger.warning(f"Failed to parse time value '{value}': {e}")
                        return None
                return value

            # Handle DATE columns
            elif 'DATE' in column_type.upper() and 'TIME' not in column_type.upper():
                if isinstance(value, str):
                    try:
                        return datetime.fromisoformat(value.replace('Z', '+00:00')).date()
                    except Exception as e:
                        logger.warning(f"Failed to parse date value '{value}': {e}")
                        return None
                return value

            # Handle TIMESTAMP columns
            elif 'TIMESTAMP' in column_type.upper():
                return self._parse_timestamp(value)

            # Handle INTEGER and NUMERIC columns
            elif 'INTEGER' in column_type.upper():
                if isinstance(value, int):
                    return value
                if isinstance(value, str):
                    # Try to parse string to int
                    try:
                        return int(value)
                    except (ValueError, TypeError):
                        # Invalid integer value (like "#" or empty string)
                        logger.warning(f"Invalid integer value for column '{column_name}': {repr(value)}, setting to NULL")
                        return None
                return value

            elif 'NUMERIC' in column_type.upper() or 'DECIMAL' in column_type.upper():
                if isinstance(value, (int, float)):
                    return value
                if isinstance(value, str):
                    # Try to parse string to number
                    try:
                        return float(value)
                    except (ValueError, TypeError):
                        logger.warning(f"Invalid numeric value for column '{column_name}': {repr(value)}, setting to NULL")
                        return None
                return value

        except Exception as e:
            logger.debug(f"Could not determine column type for {column_name}: {e}")

        # Handle dict/object values (linkToEntry that wasn't processed correctly)
        if isinstance(value, dict):
            # If it has an 'id' field, extract it
            if 'id' in value:
                logger.info(f"Extracting ID from dict value for column '{column_name}'")
                return value['id']
            # Otherwise, convert to JSON string
            import json
            logger.warning(f"Converting dict to JSON string for column '{column_name}'")
            return json.dumps(value)

        return value

    @staticmethod
    def _parse_timestamp(ts: Optional[str]) -> Optional[datetime]:
        """Parse Memento timestamp string to datetime"""
        if not ts:
            return None

        try:
            # Handle ISO format with Z
            if ts.endswith('Z'):
                ts = ts.replace('Z', '+00:00')
            return datetime.fromisoformat(ts)
        except Exception as e:
            logger.warning(f"Failed to parse timestamp {ts}: {e}")
            return None

    @staticmethod
    def _to_snake_case(text: str) -> str:
        """Convert text to snake_case"""
        import re
        # Insert underscore before uppercase letters
        s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', text)
        # Insert underscore before uppercase followed by lowercase
        s2 = re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1)
        return s2.lower()

    @staticmethod
    def _to_camel_case(text: str) -> str:
        """Convert snake_case to camelCase"""
        components = text.split('_')
        return components[0] + ''.join(x.title() for x in components[1:])

    async def delete_entry(
        self,
        library_id: str,
        library_name: str,
        table_name: str,
        entry_id: str
    ) -> Dict[str, Any]:
        """
        Delete (or soft-delete) entry from PostgreSQL

        Args:
            library_id: Memento library ID
            library_name: Slovak library name
            table_name: PostgreSQL table name
            entry_id: Entry ID to delete

        Returns:
            Delete result
        """
        try:
            model_class = TABLE_TO_MODEL.get(table_name)
            if not model_class:
                raise ValueError(f"Unknown table: {table_name}")

            # Check if soft delete is enabled
            if self.config.SYNC_DELETED_ENTRIES:
                # Soft delete - update status
                entry = self.db.query(model_class).filter_by(id=entry_id).first()
                if entry:
                    entry.status = 'deleted'
                    entry.sync_source = 'memento'
                    self.db.commit()
            else:
                # Hard delete
                self.db.query(model_class).filter_by(id=entry_id).delete()
                self.db.commit()

            # Log success
            await self._log_sync(
                library_id=library_id,
                library_name=library_name,
                entry_id=entry_id,
                sync_direction='memento_to_pg',
                success=True
            )

            return {
                'success': True,
                'entry_id': entry_id,
                'operation': 'delete',
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error deleting entry {entry_id} from {table_name}: {e}", exc_info=True)

            # Log failure
            await self._log_sync(
                library_id=library_id,
                library_name=library_name,
                entry_id=entry_id,
                sync_direction='memento_to_pg',
                success=False,
                error_message=str(e)
            )

            return {
                'success': False,
                'entry_id': entry_id,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
