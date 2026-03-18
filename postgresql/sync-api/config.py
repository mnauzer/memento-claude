"""
Configuration for Memento PostgreSQL Sync API

Loads configuration from environment variables and provides access to
database connections, API keys, and sync settings.
"""

import os
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(env_path)
else:
    # Try parent directory
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)


class Config:
    """Configuration settings for sync service"""

    # ========== POSTGRESQL CONFIGURATION ==========
    PG_HOST: str = os.getenv('PG_HOST', 'localhost')
    PG_PORT: int = int(os.getenv('PG_PORT', '5432'))
    PG_USER: str = os.getenv('PG_USER', 'smarthome')
    PG_PASSWORD: str = os.getenv('PG_PASSWORD', '')
    PG_DATABASE: str = os.getenv('PG_DATABASE', 'memento_mirror')

    @classmethod
    def get_pg_url(cls) -> str:
        """Get PostgreSQL connection URL for SQLAlchemy"""
        return (
            f"postgresql://{cls.PG_USER}:{cls.PG_PASSWORD}"
            f"@{cls.PG_HOST}:{cls.PG_PORT}/{cls.PG_DATABASE}"
        )

    @classmethod
    def get_async_pg_url(cls) -> str:
        """Get PostgreSQL connection URL for asyncpg"""
        return (
            f"postgresql+asyncpg://{cls.PG_USER}:{cls.PG_PASSWORD}"
            f"@{cls.PG_HOST}:{cls.PG_PORT}/{cls.PG_DATABASE}"
        )

    # ========== MEMENTO API CONFIGURATION ==========
    MEMENTO_API_KEY: str = os.getenv('MEMENTO_API_KEY', '')
    MEMENTO_API_BASE_URL: str = os.getenv(
        'MEMENTO_API_BASE_URL',
        'https://api.mementodatabase.com/v1'
    )

    # Rate limiting for Memento API (requests per minute)
    MEMENTO_RATE_LIMIT: int = int(os.getenv('MEMENTO_RATE_LIMIT', '10'))

    # ========== SYNC API CONFIGURATION ==========
    # API key for authenticating incoming requests from Memento triggers
    SYNC_API_KEY: str = os.getenv('SYNC_API_KEY', 'CHANGE_THIS_IN_PRODUCTION')

    # Port for FastAPI server
    API_PORT: int = int(os.getenv('API_PORT', '8888'))

    # Host binding (0.0.0.0 for external access, 127.0.0.1 for local only)
    API_HOST: str = os.getenv('API_HOST', '0.0.0.0')

    # ========== SYNC BEHAVIOR ==========
    # Conflict resolution strategy: 'memento_wins', 'pg_wins', 'timestamp'
    CONFLICT_RESOLUTION: str = os.getenv('CONFLICT_RESOLUTION', 'memento_wins')

    # Enable/disable PostgreSQL → Memento sync
    ENABLE_PG_TO_MEMENTO: bool = os.getenv('ENABLE_PG_TO_MEMENTO', 'true').lower() == 'true'

    # Enable/disable Memento → PostgreSQL sync
    ENABLE_MEMENTO_TO_PG: bool = os.getenv('ENABLE_MEMENTO_TO_PG', 'true').lower() == 'true'

    # Sync soft-deleted entries (status='deleted')
    SYNC_DELETED_ENTRIES: bool = os.getenv('SYNC_DELETED_ENTRIES', 'true').lower() == 'true'

    # Maximum retry attempts for failed syncs
    MAX_RETRY_ATTEMPTS: int = int(os.getenv('MAX_RETRY_ATTEMPTS', '3'))

    # Retry delay in seconds (exponential backoff)
    RETRY_DELAY: int = int(os.getenv('RETRY_DELAY', '5'))

    # ========== LOGGING CONFIGURATION ==========
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE: Optional[str] = os.getenv('LOG_FILE', '/opt/memento-sync/logs/sync.log')
    LOG_FORMAT: str = os.getenv(
        'LOG_FORMAT',
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # ========== POSTGRESQL LISTENER ==========
    # PostgreSQL NOTIFY channel name
    PG_NOTIFY_CHANNEL: str = os.getenv('PG_NOTIFY_CHANNEL', 'memento_sync_channel')

    # Listener reconnect delay (seconds)
    LISTENER_RECONNECT_DELAY: int = int(os.getenv('LISTENER_RECONNECT_DELAY', '5'))

    # ========== BULK SYNC SETTINGS ==========
    # Chunk size for bulk sync operations
    BULK_SYNC_CHUNK_SIZE: int = int(os.getenv('BULK_SYNC_CHUNK_SIZE', '50'))

    # Progress report interval (number of entries)
    BULK_SYNC_PROGRESS_INTERVAL: int = int(os.getenv('BULK_SYNC_PROGRESS_INTERVAL', '10'))

    # ========== WEBHOOK SETTINGS ==========
    # Timeout for HTTP requests to Memento (seconds)
    HTTP_TIMEOUT: int = int(os.getenv('HTTP_TIMEOUT', '30'))

    # Webhook retry configuration
    WEBHOOK_MAX_RETRIES: int = int(os.getenv('WEBHOOK_MAX_RETRIES', '3'))
    WEBHOOK_RETRY_DELAY: int = int(os.getenv('WEBHOOK_RETRY_DELAY', '2'))

    # ========== VALIDATION ==========
    @classmethod
    def validate(cls) -> None:
        """Validate required configuration values"""
        errors = []

        if not cls.MEMENTO_API_KEY:
            errors.append("MEMENTO_API_KEY is required")

        if not cls.PG_PASSWORD:
            errors.append("PG_PASSWORD is required")

        if not cls.SYNC_API_KEY or cls.SYNC_API_KEY == 'CHANGE_THIS_IN_PRODUCTION':
            errors.append("SYNC_API_KEY must be set to a secure value")

        if errors:
            raise ValueError(f"Configuration validation failed:\n" + "\n".join(f"  - {e}" for e in errors))

    @classmethod
    def display(cls) -> str:
        """Display current configuration (sanitized)"""
        return f"""
=== Memento PostgreSQL Sync Configuration ===

PostgreSQL:
  Host: {cls.PG_HOST}:{cls.PG_PORT}
  Database: {cls.PG_DATABASE}
  User: {cls.PG_USER}
  Password: {'*' * len(cls.PG_PASSWORD)}

Memento API:
  Base URL: {cls.MEMENTO_API_BASE_URL}
  API Key: {cls.MEMENTO_API_KEY[:8]}...
  Rate Limit: {cls.MEMENTO_RATE_LIMIT} requests/minute

Sync API:
  Host: {cls.API_HOST}:{cls.API_PORT}
  API Key: {cls.SYNC_API_KEY[:8]}...

Sync Behavior:
  Conflict Resolution: {cls.CONFLICT_RESOLUTION}
  Memento → PG: {'Enabled' if cls.ENABLE_MEMENTO_TO_PG else 'Disabled'}
  PG → Memento: {'Enabled' if cls.ENABLE_PG_TO_MEMENTO else 'Disabled'}
  Sync Deleted: {'Yes' if cls.SYNC_DELETED_ENTRIES else 'No'}

Logging:
  Level: {cls.LOG_LEVEL}
  File: {cls.LOG_FILE or 'stdout'}

PostgreSQL Listener:
  Channel: {cls.PG_NOTIFY_CHANNEL}
  Reconnect Delay: {cls.LISTENER_RECONNECT_DELAY}s

Bulk Sync:
  Chunk Size: {cls.BULK_SYNC_CHUNK_SIZE}
  Progress Interval: {cls.BULK_SYNC_PROGRESS_INTERVAL} entries
"""


# Create singleton instance
config = Config()


if __name__ == "__main__":
    # Test configuration
    try:
        Config.validate()
        print(Config.display())
        print("✅ Configuration valid")
    except ValueError as e:
        print(f"❌ Configuration error:\n{e}")
