"""
Universal Sync Endpoint - Add this to main.py

This endpoint accepts library_name and automatically maps to correct table.
Designed for Universal.BulkAction.SyncToPostgreSQL.js v4.0
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import logging

from auth import verify_api_key
import sys
sys.path.append('..')
from library_mapping import get_table_name
from memento_to_pg import MementoToPostgreSQLSync
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import Config

logger = logging.getLogger(__name__)

router = APIRouter()

# Database setup (copied from main.py to avoid circular import)
engine = create_engine(Config.get_async_pg_url().replace('+asyncpg', ''))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency to get DB session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class UniversalSyncRequest(BaseModel):
    """Request model for universal sync endpoint"""
    library_id: Optional[str] = None  # Internal Memento ID (optional)
    library_name: str  # Slovak library name (e.g., "Dochádzka")
    entry: Dict[str, Any]  # Entry data


class UniversalSyncResponse(BaseModel):
    """Response model for universal sync"""
    success: bool
    library_name: str
    table_name: str
    entry_id: str
    message: Optional[str] = None


@router.post("/api/memento/sync", response_model=UniversalSyncResponse)
async def universal_sync_entry(
    request: UniversalSyncRequest,
    db=Depends(get_db),
    _=Depends(verify_api_key)
):
    """
    Universal sync endpoint - automatically maps library name to table

    This endpoint:
    1. Receives library_name and entry data
    2. Automatically maps library_name to PostgreSQL table
    3. Syncs entry using existing memento_to_pg logic

    Works with Universal.BulkAction.SyncToPostgreSQL.js v4.0

    Example request:
    ```json
    {
        "library_id": "zNoMvrv8U",
        "library_name": "Dochádzka",
        "entry": {
            "id": "abc123",
            "status": "active",
            "fields": {
                "Dátum": "2026-03-18",
                "Príchod": "1970-01-01T07:00:00.000Z",
                "Odchod": "1970-01-01T15:00:00.000Z"
            }
        }
    }
    ```
    """
    library_name = request.library_name
    library_id = request.library_id
    entry_data = request.entry

    logger.info(f"Universal sync: library='{library_name}', entry_id={entry_data.get('id')}")

    # Map library name to table
    table_name = get_table_name(library_name)

    if not table_name:
        raise HTTPException(
            status_code=404,
            detail=f"Library '{library_name}' is not supported for sync. "
                   f"Check library_table_mapper.py for supported libraries."
        )

    logger.info(f"Mapped '{library_name}' → table '{table_name}'")

    try:
        # Use existing sync logic
        sync_handler = MementoToPostgreSQLSync(db)

        result = await sync_handler.sync_entry(
            library_id=library_id,
            library_name=library_name,
            table_name=table_name,
            entry_data=entry_data
        )

        return UniversalSyncResponse(
            success=True,
            library_name=library_name,
            table_name=table_name,
            entry_id=entry_data.get('id'),
            message=f"Synced to {table_name}"
        )

    except Exception as e:
        logger.error(f"Universal sync failed for {library_name}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Sync failed: {str(e)}"
        )


# ============================================================================
# ADD TO main.py:
# ============================================================================
#
# 1. Import this module:
#    from universal_sync_endpoint import router as universal_router
#
# 2. Include router:
#    app.include_router(universal_router)
#
# ============================================================================
