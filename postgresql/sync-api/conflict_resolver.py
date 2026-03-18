"""
Conflict Resolver - Detects and resolves sync conflicts

When both Memento and PostgreSQL have modifications to the same entry,
this module determines which version wins based on timestamps and
configured resolution strategy.
"""

import logging
from typing import Dict, Any, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session

from models import SyncConflict, TABLE_TO_MODEL
from config import Config

logger = logging.getLogger(__name__)


class ConflictResolver:
    """Handles conflict detection and resolution"""

    def __init__(self, db_session: Session):
        self.db = db_session
        self.config = Config()

    async def check_conflict(
        self,
        table_name: str,
        entry_id: str,
        pg_modified_time: datetime,
        memento_modified_time: Optional[datetime] = None
    ) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """
        Check if there's a conflict between PostgreSQL and Memento versions

        Args:
            table_name: PostgreSQL table name
            entry_id: Entry ID
            pg_modified_time: PostgreSQL modification timestamp
            memento_modified_time: Memento modification timestamp (if known)

        Returns:
            Tuple of (has_conflict, resolution, conflict_data)
            - has_conflict: True if conflict detected
            - resolution: 'memento_wins', 'pg_wins', or None
            - conflict_data: Details about the conflict
        """
        try:
            # Get model class
            model_class = TABLE_TO_MODEL.get(table_name)
            if not model_class:
                raise ValueError(f"Unknown table: {table_name}")

            # Fetch current entry from PostgreSQL
            pg_entry = self.db.query(model_class).filter_by(id=entry_id).first()

            if not pg_entry:
                # Entry doesn't exist in PostgreSQL - no conflict
                return False, None, None

            # Get PostgreSQL timestamp
            pg_ts = pg_entry.memento_modified_time if hasattr(pg_entry, 'memento_modified_time') else None

            # If we don't have Memento timestamp yet, we'll get it later
            if memento_modified_time is None:
                # No conflict yet (we don't know Memento state)
                return False, None, None

            # Check if timestamps are different
            if pg_ts and memento_modified_time:
                # Convert to comparable format (remove microseconds)
                pg_ts_compare = pg_ts.replace(microsecond=0)
                memento_ts_compare = memento_modified_time.replace(microsecond=0)

                if pg_ts_compare == memento_ts_compare:
                    # Same timestamp - no conflict
                    return False, None, None

                # Timestamps differ - conflict detected!
                logger.warning(
                    f"Conflict detected for {table_name}:{entry_id} - "
                    f"PG: {pg_ts_compare}, Memento: {memento_ts_compare}"
                )

                # Determine resolution based on strategy
                resolution = self._resolve_conflict(
                    pg_ts=pg_ts_compare,
                    memento_ts=memento_ts_compare
                )

                conflict_data = {
                    'table_name': table_name,
                    'entry_id': entry_id,
                    'pg_modified': pg_ts_compare.isoformat(),
                    'memento_modified': memento_ts_compare.isoformat(),
                    'resolution': resolution,
                    'pg_sync_source': pg_entry.sync_source if hasattr(pg_entry, 'sync_source') else None
                }

                return True, resolution, conflict_data

            return False, None, None

        except Exception as e:
            logger.error(f"Error checking conflict for {table_name}:{entry_id}: {e}", exc_info=True)
            return False, None, None

    def _resolve_conflict(
        self,
        pg_ts: datetime,
        memento_ts: datetime
    ) -> str:
        """
        Resolve conflict based on configured strategy

        Args:
            pg_ts: PostgreSQL timestamp
            memento_ts: Memento timestamp

        Returns:
            Resolution: 'memento_wins', 'pg_wins', or 'timestamp'
        """
        strategy = self.config.CONFLICT_RESOLUTION

        if strategy == 'memento_wins':
            # Memento always wins
            return 'memento_wins'

        elif strategy == 'pg_wins':
            # PostgreSQL always wins
            return 'pg_wins'

        elif strategy == 'timestamp':
            # Newest timestamp wins
            if memento_ts > pg_ts:
                return 'memento_wins'
            else:
                return 'pg_wins'

        else:
            # Default: Memento wins
            logger.warning(f"Unknown conflict resolution strategy: {strategy}, defaulting to memento_wins")
            return 'memento_wins'

    async def log_conflict(
        self,
        library_id: str,
        library_name: str,
        entry_id: str,
        conflict_data: Dict[str, Any],
        resolution: str
    ) -> None:
        """
        Log conflict to database

        Args:
            library_id: Memento library ID
            library_name: Library name
            entry_id: Entry ID
            conflict_data: Conflict details
            resolution: Resolution strategy applied
        """
        try:
            conflict = SyncConflict(
                library_id=library_id,
                library_name=library_name,
                entry_id=entry_id,
                memento_modified_time=datetime.fromisoformat(conflict_data['memento_modified']),
                pg_modified_time=datetime.fromisoformat(conflict_data['pg_modified']),
                resolution=resolution,
                conflict_data=conflict_data,
                resolved=True,  # Auto-resolved based on strategy
                resolved_at=datetime.now()
            )

            self.db.add(conflict)
            self.db.commit()

            logger.info(f"Logged conflict for {library_name}:{entry_id} - Resolution: {resolution}")

        except Exception as e:
            logger.error(f"Error logging conflict: {e}", exc_info=True)
            self.db.rollback()

    async def should_skip_sync(
        self,
        table_name: str,
        entry_id: str,
        source: str,
        memento_modified_time: Optional[datetime] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if sync should be skipped due to conflict

        Args:
            table_name: PostgreSQL table name
            entry_id: Entry ID
            source: Sync source ('memento' or 'postgresql')
            memento_modified_time: Memento timestamp (if known)

        Returns:
            Tuple of (should_skip, reason)
        """
        try:
            # Get current entry from PostgreSQL
            model_class = TABLE_TO_MODEL.get(table_name)
            if not model_class:
                return False, None

            pg_entry = self.db.query(model_class).filter_by(id=entry_id).first()

            if not pg_entry:
                # Entry doesn't exist - don't skip
                return False, None

            # If source is from Memento, check if PostgreSQL has newer changes
            if source == 'memento':
                # Check if PostgreSQL was modified after last sync from Memento
                if hasattr(pg_entry, 'sync_source') and pg_entry.sync_source == 'postgresql':
                    # PostgreSQL has local changes
                    pg_ts = pg_entry.pg_modified_time if hasattr(pg_entry, 'pg_modified_time') else None
                    memento_ts = pg_entry.memento_modified_time if hasattr(pg_entry, 'memento_modified_time') else None

                    if pg_ts and memento_ts and pg_ts > memento_ts:
                        # PostgreSQL is newer - skip Memento sync
                        return True, "PostgreSQL has newer changes"

            # If source is from PostgreSQL, check against Memento
            elif source == 'postgresql':
                if memento_modified_time:
                    pg_ts = pg_entry.memento_modified_time if hasattr(pg_entry, 'memento_modified_time') else None

                    if pg_ts and memento_modified_time > pg_ts:
                        # Memento is newer - skip PostgreSQL sync
                        if self.config.CONFLICT_RESOLUTION == 'memento_wins':
                            return True, "Memento has newer changes (memento_wins policy)"

            return False, None

        except Exception as e:
            logger.error(f"Error checking skip condition: {e}", exc_info=True)
            return False, None

    async def resolve_and_sync(
        self,
        library_id: str,
        library_name: str,
        table_name: str,
        entry_id: str,
        pg_modified_time: datetime,
        memento_modified_time: datetime
    ) -> str:
        """
        Detect conflict, resolve it, and return which version to use

        Args:
            library_id: Memento library ID
            library_name: Library name
            table_name: PostgreSQL table name
            entry_id: Entry ID
            pg_modified_time: PostgreSQL timestamp
            memento_modified_time: Memento timestamp

        Returns:
            Resolution: 'memento_wins' or 'pg_wins'
        """
        has_conflict, resolution, conflict_data = await self.check_conflict(
            table_name=table_name,
            entry_id=entry_id,
            pg_modified_time=pg_modified_time,
            memento_modified_time=memento_modified_time
        )

        if has_conflict:
            # Log the conflict
            await self.log_conflict(
                library_id=library_id,
                library_name=library_name,
                entry_id=entry_id,
                conflict_data=conflict_data,
                resolution=resolution
            )

            logger.warning(
                f"Conflict resolved for {library_name}:{entry_id} - "
                f"Winner: {resolution}"
            )

            return resolution

        # No conflict - use configured default
        return self.config.CONFLICT_RESOLUTION


# Convenience function
async def check_and_resolve_conflict(
    db: Session,
    library_id: str,
    library_name: str,
    table_name: str,
    entry_id: str,
    pg_modified_time: datetime,
    memento_modified_time: datetime
) -> str:
    """
    Check for conflict and resolve it

    Returns:
        Resolution: 'memento_wins' or 'pg_wins'
    """
    resolver = ConflictResolver(db)
    return await resolver.resolve_and_sync(
        library_id=library_id,
        library_name=library_name,
        table_name=table_name,
        entry_id=entry_id,
        pg_modified_time=pg_modified_time,
        memento_modified_time=memento_modified_time
    )
