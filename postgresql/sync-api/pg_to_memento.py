"""
PostgreSQL to Memento Sync Handler

Handles sync from PostgreSQL to Memento Database:
- Receives notifications from PostgreSQL triggers
- Fetches changed data from PostgreSQL
- Checks for conflicts
- Updates entries in Memento via API
- Handles rate limiting
"""

import logging
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
import aiohttp
from sqlalchemy.orm import Session
from sqlalchemy import text

from models import SyncLog, TABLE_TO_MODEL
from conflict_resolver import ConflictResolver
from config import Config
import sys
sys.path.append('..')
from library_mapping import get_slovak_name_by_table, get_library_id

logger = logging.getLogger(__name__)


class PostgreSQLToMementoSync:
    """Handles synchronization from PostgreSQL to Memento"""

    def __init__(self, db_session: Session):
        self.db = db_session
        self.config = Config()
        self.conflict_resolver = ConflictResolver(db_session)
        self.memento_api_url = self.config.MEMENTO_API_BASE_URL
        self.api_key = self.config.MEMENTO_API_KEY
        self.session: Optional[aiohttp.ClientSession] = None

        # Rate limiting
        self.last_request_time = 0
        self.min_request_interval = 60.0 / self.config.MEMENTO_RATE_LIMIT  # seconds between requests

    async def init_session(self):
        """Initialize aiohttp session"""
        if not self.session:
            self.session = aiohttp.ClientSession(
                headers={
                    'Authorization': f'Bearer {self.api_key}',
                    'Content-Type': 'application/json'
                }
            )

    async def close_session(self):
        """Close aiohttp session"""
        if self.session:
            await self.session.close()
            self.session = None

    async def rate_limit(self):
        """Enforce rate limiting (10 requests/minute)"""
        now = asyncio.get_event_loop().time()
        time_since_last = now - self.last_request_time

        if time_since_last < self.min_request_interval:
            wait_time = self.min_request_interval - time_since_last
            logger.debug(f"Rate limiting: waiting {wait_time:.2f}s")
            await asyncio.sleep(wait_time)

        self.last_request_time = asyncio.get_event_loop().time()

    async def sync_entry(
        self,
        table_name: str,
        entry_id: str,
        operation: str = 'update'
    ) -> Dict[str, Any]:
        """
        Sync single entry from PostgreSQL to Memento

        Args:
            table_name: PostgreSQL table name
            entry_id: Entry ID
            operation: 'update' or 'delete'

        Returns:
            Sync result
        """
        try:
            # Get library info
            library_name = get_slovak_name_by_table(table_name)
            if not library_name:
                raise ValueError(f"Unknown table: {table_name}")

            library_id = get_library_id(library_name)
            if not library_id:
                logger.warning(f"Library ID not found for {library_name}, skipping sync to Memento")
                return {
                    'success': False,
                    'error': f"Library ID not found for {library_name}",
                    'skipped': True
                }

            logger.info(f"Syncing {table_name}:{entry_id} to Memento library {library_name} ({library_id})")

            # Check if sync is enabled for this direction
            if not self.config.ENABLE_PG_TO_MEMENTO:
                logger.info("PostgreSQL → Memento sync is disabled")
                return {
                    'success': False,
                    'error': 'PG → Memento sync disabled',
                    'skipped': True
                }

            # Get entry from PostgreSQL
            model_class = TABLE_TO_MODEL.get(table_name)
            if not model_class:
                raise ValueError(f"Model not found for table: {table_name}")

            pg_entry = self.db.query(model_class).filter_by(id=entry_id).first()

            if not pg_entry and operation != 'delete':
                raise ValueError(f"Entry {entry_id} not found in {table_name}")

            # For delete operations
            if operation == 'delete':
                return await self._delete_memento_entry(
                    library_id=library_id,
                    library_name=library_name,
                    entry_id=entry_id
                )

            # Check if this change originated from Memento (avoid loop)
            if hasattr(pg_entry, 'sync_source') and pg_entry.sync_source == 'memento':
                logger.debug(f"Skipping sync - change originated from Memento")
                return {
                    'success': True,
                    'skipped': True,
                    'reason': 'Change originated from Memento'
                }

            # Get Memento entry to check for conflicts
            memento_entry = await self._fetch_memento_entry(library_id, entry_id)

            if memento_entry:
                # Check for conflict
                memento_modified = self._parse_memento_timestamp(
                    memento_entry.get('modifiedTime')
                )
                pg_modified = pg_entry.pg_modified_time if hasattr(pg_entry, 'pg_modified_time') else datetime.now()

                resolution = await self.conflict_resolver.resolve_and_sync(
                    library_id=library_id,
                    library_name=library_name,
                    table_name=table_name,
                    entry_id=entry_id,
                    pg_modified_time=pg_modified,
                    memento_modified_time=memento_modified
                )

                if resolution == 'memento_wins':
                    logger.info(f"Conflict: Memento wins - skipping PostgreSQL → Memento sync")
                    # Optionally: sync Memento → PostgreSQL instead
                    return {
                        'success': False,
                        'skipped': True,
                        'reason': 'Memento has newer version (conflict resolved)'
                    }

            # Prepare entry data for Memento
            entry_data = self._prepare_memento_data(pg_entry)

            # Update Memento entry
            result = await self._update_memento_entry(
                library_id=library_id,
                entry_id=entry_id,
                entry_data=entry_data
            )

            # Log success
            await self._log_sync(
                library_id=library_id,
                library_name=library_name,
                entry_id=entry_id,
                sync_direction='pg_to_memento',
                success=True
            )

            return {
                'success': True,
                'entry_id': entry_id,
                'library': library_name,
                'operation': 'update',
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error syncing {table_name}:{entry_id} to Memento: {e}", exc_info=True)

            # Log failure
            library_name = get_slovak_name_by_table(table_name)
            library_id = get_library_id(library_name) if library_name else None

            await self._log_sync(
                library_id=library_id,
                library_name=library_name,
                entry_id=entry_id,
                sync_direction='pg_to_memento',
                success=False,
                error_message=str(e)
            )

            return {
                'success': False,
                'entry_id': entry_id,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    def _prepare_memento_data(self, pg_entry) -> Dict[str, Any]:
        """
        Prepare PostgreSQL entry data for Memento API

        Args:
            pg_entry: SQLAlchemy model instance

        Returns:
            Dictionary formatted for Memento API
        """
        fields = {}

        # Get all columns from model
        for column in pg_entry.__table__.columns:
            column_name = column.name

            # Skip system columns
            if column_name in (
                'id', 'status', 'memento_created_time', 'memento_modified_time',
                'pg_modified_time', 'created_by', 'modified_by', 'synced_at',
                'sync_source', 'created_at', 'updated_at'
            ):
                continue

            # Get value
            value = getattr(pg_entry, column_name, None)

            if value is None:
                continue

            # Convert to Memento-compatible format
            if isinstance(value, datetime):
                # Convert to ISO format
                fields[self._to_camel_case(column_name)] = value.isoformat()
            elif isinstance(value, (int, float, str, bool)):
                fields[self._to_camel_case(column_name)] = value
            else:
                # Convert other types to string
                fields[self._to_camel_case(column_name)] = str(value)

        return fields

    async def _fetch_memento_entry(
        self,
        library_id: str,
        entry_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch entry from Memento API

        Args:
            library_id: Memento library ID
            entry_id: Entry ID

        Returns:
            Entry data or None if not found
        """
        try:
            await self.init_session()
            await self.rate_limit()

            url = f"{self.memento_api_url}/libraries/{library_id}/entries/{entry_id}"

            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    return data
                elif response.status == 404:
                    # Entry not found
                    return None
                else:
                    logger.error(f"Memento API error: {response.status}")
                    return None

        except Exception as e:
            logger.error(f"Error fetching Memento entry: {e}", exc_info=True)
            return None

    async def _update_memento_entry(
        self,
        library_id: str,
        entry_id: str,
        entry_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update entry in Memento via API

        Args:
            library_id: Memento library ID
            entry_id: Entry ID
            entry_data: Field values

        Returns:
            API response
        """
        await self.init_session()
        await self.rate_limit()

        url = f"{self.memento_api_url}/libraries/{library_id}/entries/{entry_id}"

        payload = {
            'fields': entry_data
        }

        try:
            async with self.session.patch(url, json=payload) as response:
                if response.status in (200, 204):
                    logger.info(f"Successfully updated Memento entry {entry_id}")
                    return {'success': True}
                else:
                    error_text = await response.text()
                    logger.error(f"Memento API error {response.status}: {error_text}")
                    raise Exception(f"Memento API error: {response.status} - {error_text}")

        except Exception as e:
            logger.error(f"Error updating Memento entry: {e}", exc_info=True)
            raise

    async def _delete_memento_entry(
        self,
        library_id: str,
        library_name: str,
        entry_id: str
    ) -> Dict[str, Any]:
        """
        Delete entry from Memento (soft delete - set status to deleted)

        Args:
            library_id: Memento library ID
            library_name: Library name
            entry_id: Entry ID

        Returns:
            Delete result
        """
        try:
            await self.init_session()
            await self.rate_limit()

            url = f"{self.memento_api_url}/libraries/{library_id}/entries/{entry_id}"

            # Memento doesn't have hard delete, so we update status to 'deleted'
            payload = {
                'fields': {},
                'status': 'deleted'
            }

            async with self.session.patch(url, json=payload) as response:
                if response.status in (200, 204):
                    logger.info(f"Successfully deleted Memento entry {entry_id}")

                    await self._log_sync(
                        library_id=library_id,
                        library_name=library_name,
                        entry_id=entry_id,
                        sync_direction='pg_to_memento',
                        success=True
                    )

                    return {
                        'success': True,
                        'entry_id': entry_id,
                        'operation': 'delete'
                    }
                else:
                    error_text = await response.text()
                    raise Exception(f"Memento API error: {response.status} - {error_text}")

        except Exception as e:
            logger.error(f"Error deleting Memento entry: {e}", exc_info=True)

            await self._log_sync(
                library_id=library_id,
                library_name=library_name,
                entry_id=entry_id,
                sync_direction='pg_to_memento',
                success=False,
                error_message=str(e)
            )

            return {
                'success': False,
                'error': str(e)
            }

    async def _log_sync(
        self,
        library_id: Optional[str],
        library_name: Optional[str],
        entry_id: str,
        sync_direction: str,
        success: bool,
        error_message: Optional[str] = None
    ) -> None:
        """Log sync operation"""
        try:
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
        except Exception as e:
            logger.error(f"Error logging sync: {e}")
            self.db.rollback()

    @staticmethod
    def _parse_memento_timestamp(ts: Optional[str]) -> Optional[datetime]:
        """Parse Memento timestamp string to datetime"""
        if not ts:
            return None

        try:
            if ts.endswith('Z'):
                ts = ts.replace('Z', '+00:00')
            return datetime.fromisoformat(ts)
        except Exception as e:
            logger.warning(f"Failed to parse timestamp {ts}: {e}")
            return None

    @staticmethod
    def _to_camel_case(text: str) -> str:
        """Convert snake_case to camelCase"""
        components = text.split('_')
        return components[0] + ''.join(x.title() for x in components[1:])
