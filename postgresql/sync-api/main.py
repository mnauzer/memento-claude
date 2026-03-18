"""
Memento PostgreSQL Sync API - Main Application

FastAPI application providing endpoints for bidirectional sync between
Memento Database and PostgreSQL.

Endpoints:
- POST /api/memento/from-memento/{library_id} - Sync entry from Memento
- DELETE /api/memento/from-memento/{library_id}/{entry_id} - Delete entry
- GET /api/memento/health - Health check
- GET /api/memento/stats - Sync statistics
- POST /api/memento/bulk-sync/{library_id} - Bulk sync library
- GET /api/memento/conflicts - List conflicts
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

from config import Config
from auth import verify_api_key
from models import Base, SyncLog, SyncMetadata, SyncConflict
from memento_to_pg import MementoToPostgreSQLSync
from sync_logs import router as logs_router
from universal_sync_endpoint import router as universal_router
import sys
sys.path.append('..')
from library_mapping import get_table_name, get_slovak_name_by_id, LIBRARY_MAP

# Configure logging
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format=Config.LOG_FORMAT,
    handlers=[
        logging.FileHandler(Config.LOG_FILE) if Config.LOG_FILE else logging.StreamHandler(),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Memento PostgreSQL Sync API",
    description="Bidirectional sync between Memento Database and PostgreSQL",
    version="1.0.0",
    docs_url="/api/memento/docs",
    redoc_url="/api/memento/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(logs_router)
app.include_router(universal_router)

# Database setup
engine = create_engine(Config.get_async_pg_url().replace('+asyncpg', ''))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==================================================
# REQUEST/RESPONSE MODELS
# ==================================================

class MementoEntry(BaseModel):
    """Memento entry data"""
    id: str
    status: Optional[str] = 'active'
    fields: Dict[str, Any] = Field(default_factory=dict)
    createdTime: Optional[str] = None
    modifiedTime: Optional[str] = None
    createdBy: Optional[Any] = None
    modifiedBy: Optional[Any] = None


class SyncResponse(BaseModel):
    """Sync operation response"""
    success: bool
    entry_id: Optional[str] = None
    table: Optional[str] = None
    operation: Optional[str] = None
    error: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: str
    database: str
    version: str


class StatsResponse(BaseModel):
    """Statistics response"""
    total_libraries: int
    total_entries: int
    last_sync: Optional[str]
    sync_errors_24h: int
    conflicts_unresolved: int


# ==================================================
# ENDPOINTS
# ==================================================

@app.get("/api/memento/health", response_model=HealthResponse)
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint

    Returns API status and database connectivity
    """
    try:
        # Test database connection
        db.execute(text("SELECT 1"))

        return HealthResponse(
            status="healthy",
            timestamp=datetime.now().isoformat(),
            database="connected",
            version="1.0.0"
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {str(e)}"
        )


@app.get("/api/memento/stats", response_model=StatsResponse)
async def get_stats(
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Get sync statistics

    Returns:
    - Total number of synced libraries
    - Total number of entries
    - Last sync timestamp
    - Error count in last 24 hours
    - Unresolved conflicts count
    """
    try:
        # Get total libraries
        total_libraries = db.query(SyncMetadata).filter_by(sync_enabled=True).count()

        # Get total entries
        total_entries = db.query(SyncMetadata).with_entities(
            text("SUM(entry_count)")
        ).scalar() or 0

        # Get last sync time
        last_sync_obj = db.query(SyncMetadata).order_by(
            SyncMetadata.last_sync.desc()
        ).first()
        last_sync = last_sync_obj.last_sync.isoformat() if last_sync_obj and last_sync_obj.last_sync else None

        # Get errors in last 24 hours
        sync_errors_24h = db.query(SyncLog).filter(
            SyncLog.success == False,
            SyncLog.sync_time >= text("NOW() - INTERVAL '24 hours'")
        ).count()

        # Get unresolved conflicts
        conflicts_unresolved = db.query(SyncConflict).filter_by(resolved=False).count()

        return StatsResponse(
            total_libraries=total_libraries,
            total_entries=int(total_entries),
            last_sync=last_sync,
            sync_errors_24h=sync_errors_24h,
            conflicts_unresolved=conflicts_unresolved
        )

    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.post("/api/memento/from-memento/{library_id}", response_model=SyncResponse)
async def sync_from_memento(
    library_id: str,
    entry: MementoEntry,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Sync entry from Memento to PostgreSQL

    Args:
        library_id: Memento library ID
        entry: Entry data from Memento

    Returns:
        Sync result
    """
    try:
        # Get library name and table name
        library_name = get_slovak_name_by_id(library_id)
        if not library_name:
            # Try to find in LIBRARY_MAP by ID
            for name, data in LIBRARY_MAP.items():
                if data.get('id') == library_id:
                    library_name = name
                    break

        if not library_name:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Library ID {library_id} not found in mapping"
            )

        table_name = get_table_name(library_name)
        if not table_name:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Table mapping not found for library: {library_name}"
            )

        logger.info(f"Syncing entry {entry.id} from Memento library {library_name} ({library_id}) to {table_name}")

        # Create sync handler
        sync_handler = MementoToPostgreSQLSync(db)

        # Sync entry
        result = await sync_handler.sync_entry(
            library_id=library_id,
            library_name=library_name,
            table_name=table_name,
            entry_data=entry.dict()
        )

        if result['success']:
            return SyncResponse(**result)
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Unknown error')
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing from Memento: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.delete("/api/memento/from-memento/{library_id}/{entry_id}", response_model=SyncResponse)
async def delete_from_memento(
    library_id: str,
    entry_id: str,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Delete entry from PostgreSQL (synced from Memento delete)

    Args:
        library_id: Memento library ID
        entry_id: Entry ID to delete

    Returns:
        Delete result
    """
    try:
        # Get library name and table name
        library_name = get_slovak_name_by_id(library_id)
        if not library_name:
            for name, data in LIBRARY_MAP.items():
                if data.get('id') == library_id:
                    library_name = name
                    break

        if not library_name:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Library ID {library_id} not found"
            )

        table_name = get_table_name(library_name)
        if not table_name:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Table not found for library: {library_name}"
            )

        logger.info(f"Deleting entry {entry_id} from {table_name}")

        # Create sync handler
        sync_handler = MementoToPostgreSQLSync(db)

        # Delete entry
        result = await sync_handler.delete_entry(
            library_id=library_id,
            library_name=library_name,
            table_name=table_name,
            entry_id=entry_id
        )

        if result['success']:
            return SyncResponse(**result)
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Unknown error')
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting from Memento: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.get("/api/memento/conflicts")
async def list_conflicts(
    limit: int = Query(default=50, le=500),
    offset: int = Query(default=0, ge=0),
    resolved: Optional[bool] = None,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    List sync conflicts

    Args:
        limit: Maximum number of conflicts to return
        offset: Number of conflicts to skip
        resolved: Filter by resolved status (None = all)

    Returns:
        List of conflicts
    """
    try:
        query = db.query(SyncConflict)

        if resolved is not None:
            query = query.filter_by(resolved=resolved)

        conflicts = query.order_by(
            SyncConflict.conflict_time.desc()
        ).limit(limit).offset(offset).all()

        total = query.count()

        return {
            'conflicts': [
                {
                    'id': c.id,
                    'library_name': c.library_name,
                    'entry_id': c.entry_id,
                    'conflict_time': c.conflict_time.isoformat(),
                    'memento_modified': c.memento_modified_time.isoformat() if c.memento_modified_time else None,
                    'pg_modified': c.pg_modified_time.isoformat() if c.pg_modified_time else None,
                    'resolution': c.resolution,
                    'resolved': c.resolved,
                    'resolved_at': c.resolved_at.isoformat() if c.resolved_at else None
                }
                for c in conflicts
            ],
            'total': total,
            'limit': limit,
            'offset': offset
        }

    except Exception as e:
        logger.error(f"Error listing conflicts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.get("/api/memento/libraries")
async def list_libraries(
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    List all synced libraries with metadata

    Returns:
        List of libraries and their sync status
    """
    try:
        libraries = db.query(SyncMetadata).order_by(SyncMetadata.library_name).all()

        return {
            'libraries': [
                {
                    'library_id': lib.library_id,
                    'library_name': lib.library_name,
                    'table_name': lib.table_name,
                    'entry_count': lib.entry_count,
                    'last_sync': lib.last_sync.isoformat() if lib.last_sync else None,
                    'last_bulk_sync': lib.last_bulk_sync.isoformat() if lib.last_bulk_sync else None,
                    'sync_enabled': lib.sync_enabled,
                    'last_error': lib.last_error
                }
                for lib in libraries
            ],
            'total': len(libraries)
        }

    except Exception as e:
        logger.error(f"Error listing libraries: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.get("/api/memento/logs")
async def get_sync_logs(
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0, ge=0),
    success: Optional[bool] = None,
    library_id: Optional[str] = None,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    Get sync operation logs

    Args:
        limit: Maximum number of logs to return
        offset: Number of logs to skip
        success: Filter by success status
        library_id: Filter by library ID

    Returns:
        List of sync logs
    """
    try:
        query = db.query(SyncLog)

        if success is not None:
            query = query.filter_by(success=success)

        if library_id:
            query = query.filter_by(library_id=library_id)

        logs = query.order_by(
            SyncLog.sync_time.desc()
        ).limit(limit).offset(offset).all()

        total = query.count()

        return {
            'logs': [
                {
                    'id': log.id,
                    'library_name': log.library_name,
                    'entry_id': log.entry_id,
                    'sync_direction': log.sync_direction,
                    'sync_time': log.sync_time.isoformat(),
                    'success': log.success,
                    'error_message': log.error_message,
                    'retry_count': log.retry_count
                }
                for log in logs
            ],
            'total': total,
            'limit': limit,
            'offset': offset
        }

    except Exception as e:
        logger.error(f"Error getting logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# Bulk sync log endpoint is now handled by sync_logs router (included below)
# This provides database logging + file backup


@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    logger.info("=== Memento PostgreSQL Sync API Starting ===")
    logger.info(Config.display())

    try:
        # Validate configuration
        Config.validate()
        logger.info("✅ Configuration validated")

        # Test database connection
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        logger.info("✅ Database connection successful")

        logger.info("=== Sync API Ready ===")

    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown"""
    logger.info("=== Memento PostgreSQL Sync API Shutting Down ===")


# ==================================================
# ERROR HANDLERS
# ==================================================

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "error": str(exc)
        }
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=Config.API_HOST,
        port=Config.API_PORT,
        reload=False,  # Set to True for development
        log_level=Config.LOG_LEVEL.lower()
    )
