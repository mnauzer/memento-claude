"""
Sync Logs Endpoint - Save and retrieve sync logs from Memento scripts
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging
import json
from pathlib import Path

from auth import verify_api_key
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter()


# Database dependency (copied from main.py to avoid circular import)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import Config

engine = create_engine(Config.get_async_pg_url().replace('+asyncpg', ''))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency to get DB session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Log storage directory
LOG_DIR = Path("/opt/memento-sync/logs/script-logs")
LOG_DIR.mkdir(parents=True, exist_ok=True)


class BulkSyncLogRequest(BaseModel):
    """Request model for bulk sync log"""
    library_id: str
    library_name: str
    timestamp: str
    stats: Optional[Dict[str, Any]] = None
    log: str


class SyncLogResponse(BaseModel):
    """Response model for log save"""
    success: bool
    log_file: str
    message: str


@router.post("/api/memento/bulk-sync-log", response_model=SyncLogResponse)
async def save_bulk_sync_log(
    request: BulkSyncLogRequest,
    db=Depends(get_db),
    _=Depends(verify_api_key)
):
    """
    Save bulk sync log from Memento script

    Logs are saved to:
    1. PostgreSQL table: memento_script_logs
    2. File: /opt/memento-sync/logs/script-logs/{library_name}_{timestamp}.log
    """
    try:
        # Save to PostgreSQL first
        from sqlalchemy import text

        sql = text("""
            INSERT INTO memento_script_logs
            (library_id, library_name, sync_timestamp, total_entries,
             success_count, failed_count, log_content, errors)
            VALUES
            (:library_id, :library_name, :sync_timestamp, :total_entries,
             :success_count, :failed_count, :log_content, :errors)
            RETURNING id
        """)

        result = db.execute(sql, {
            'library_id': request.library_id,
            'library_name': request.library_name,
            'sync_timestamp': request.timestamp,
            'total_entries': request.stats.get('total') if request.stats else None,
            'success_count': request.stats.get('success') if request.stats else None,
            'failed_count': request.stats.get('failed') if request.stats else None,
            'log_content': request.log,
            'errors': json.dumps(request.stats.get('errors', [])) if request.stats else None
        })
        db.commit()

        log_id = result.fetchone()[0]
        logger.info(f"Saved sync log to database: ID={log_id}, library={request.library_name}")

        # Also save to file for backup (continue with existing code)
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_lib_name = request.library_name.replace(" ", "_").replace("/", "_")
        log_filename = f"{safe_lib_name}_{timestamp}.log"
        log_path = LOG_DIR / log_filename

        # Prepare log content
        log_content = f"""
{'='*80}
MEMENTO BULK SYNC LOG
{'='*80}
Library Name: {request.library_name}
Library ID: {request.library_id}
Timestamp: {request.timestamp}
Script Version: (from log)

"""

        if request.stats:
            log_content += f"""
STATISTICS:
-----------
Total: {request.stats.get('total', 'N/A')}
Success: {request.stats.get('success', 'N/A')}
Failed: {request.stats.get('failed', 'N/A')}

"""

        log_content += f"""
{'='*80}
DETAILED LOG:
{'='*80}
{request.log}

{'='*80}
END OF LOG
{'='*80}
"""

        # Write log file
        log_path.write_text(log_content, encoding='utf-8')

        logger.info(f"Saved sync log: {log_filename}")

        return SyncLogResponse(
            success=True,
            log_file=str(log_path),
            message=f"Log saved to {log_filename}"
        )

    except Exception as e:
        logger.error(f"Failed to save sync log: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save log: {str(e)}")


@router.get("/api/memento/logs/list")
async def list_sync_logs(
    library_name: Optional[str] = None,
    limit: int = 20,
    _=Depends(verify_api_key)
):
    """
    List available sync logs

    Query parameters:
    - library_name: Filter by library name (optional)
    - limit: Maximum number of logs to return (default 20)
    """
    try:
        # Get all log files
        log_files = sorted(LOG_DIR.glob("*.log"), key=lambda p: p.stat().st_mtime, reverse=True)

        # Filter by library name if specified
        if library_name:
            safe_lib_name = library_name.replace(" ", "_").replace("/", "_")
            log_files = [f for f in log_files if safe_lib_name in f.name]

        # Limit results
        log_files = log_files[:limit]

        # Build response
        logs = []
        for log_file in log_files:
            stat = log_file.stat()
            logs.append({
                "filename": log_file.name,
                "path": str(log_file),
                "size_bytes": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "library_name": log_file.name.split("_")[0].replace("_", " ")
            })

        return {
            "total": len(logs),
            "logs": logs
        }

    except Exception as e:
        logger.error(f"Failed to list logs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list logs: {str(e)}")


@router.get("/api/memento/logs/view/{filename}")
async def view_sync_log(
    filename: str,
    tail: Optional[int] = None,
    _=Depends(verify_api_key)
):
    """
    View contents of a sync log file

    Query parameters:
    - tail: Return only last N lines (optional)
    """
    try:
        log_path = LOG_DIR / filename

        if not log_path.exists():
            raise HTTPException(status_code=404, detail=f"Log file not found: {filename}")

        # Read log content
        content = log_path.read_text(encoding='utf-8')

        # Tail if requested
        if tail:
            lines = content.split('\n')
            content = '\n'.join(lines[-tail:])

        return {
            "filename": filename,
            "size_bytes": log_path.stat().st_size,
            "content": content
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to read log: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to read log: {str(e)}")


@router.get("/api/memento/logs/latest")
async def get_latest_log(
    library_name: Optional[str] = None,
    tail: Optional[int] = 100,
    _=Depends(verify_api_key)
):
    """
    Get the most recent sync log

    Query parameters:
    - library_name: Filter by library name (optional)
    - tail: Return only last N lines (default 100)
    """
    try:
        # Get all log files
        log_files = sorted(LOG_DIR.glob("*.log"), key=lambda p: p.stat().st_mtime, reverse=True)

        # Filter by library name if specified
        if library_name:
            safe_lib_name = library_name.replace(" ", "_").replace("/", "_")
            log_files = [f for f in log_files if safe_lib_name in f.name]

        if not log_files:
            raise HTTPException(status_code=404, detail="No logs found")

        # Get latest log
        latest_log = log_files[0]
        content = latest_log.read_text(encoding='utf-8')

        # Tail if requested
        if tail:
            lines = content.split('\n')
            content = '\n'.join(lines[-tail:])

        return {
            "filename": latest_log.name,
            "size_bytes": latest_log.stat().st_size,
            "modified": datetime.fromtimestamp(latest_log.stat().st_mtime).isoformat(),
            "content": content
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get latest log: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get latest log: {str(e)}")


# ============================================================================
# ADD TO main.py:
# ============================================================================
#
# from sync_logs import router as logs_router
# app.include_router(logs_router)
#
# ============================================================================
