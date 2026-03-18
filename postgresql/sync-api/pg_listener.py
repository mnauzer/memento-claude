"""
PostgreSQL NOTIFY Listener Daemon

Listens for PostgreSQL NOTIFY events and triggers sync to Memento.
This daemon runs as a background service and processes change notifications
in real-time.
"""

import asyncio
import asyncpg
import json
import logging
import signal
import sys
from typing import Optional
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config import Config
from pg_to_memento import PostgreSQLToMementoSync

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(Config.LOG_FILE) if Config.LOG_FILE else logging.StreamHandler(),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class PostgreSQLListener:
    """PostgreSQL NOTIFY listener for sync events"""

    def __init__(self):
        self.config = Config()
        self.conn: Optional[asyncpg.Connection] = None
        self.running = False
        self.reconnect_delay = self.config.LISTENER_RECONNECT_DELAY

        # Setup database session for sync operations
        engine = create_engine(self.config.get_pg_url())
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

        # Statistics
        self.events_processed = 0
        self.events_failed = 0
        self.start_time = datetime.now()

    async def connect(self):
        """Connect to PostgreSQL and setup listener"""
        try:
            logger.info("Connecting to PostgreSQL...")

            # Create asyncpg connection
            self.conn = await asyncpg.connect(
                host=self.config.PG_HOST,
                port=self.config.PG_PORT,
                user=self.config.PG_USER,
                password=self.config.PG_PASSWORD,
                database=self.config.PG_DATABASE
            )

            # Add listener for sync channel
            await self.conn.add_listener(
                self.config.PG_NOTIFY_CHANNEL,
                self.handle_notification
            )

            logger.info(f"✅ Connected to PostgreSQL and listening on channel: {self.config.PG_NOTIFY_CHANNEL}")

        except Exception as e:
            logger.error(f"❌ Failed to connect to PostgreSQL: {e}")
            raise

    async def disconnect(self):
        """Disconnect from PostgreSQL"""
        if self.conn:
            try:
                await self.conn.remove_listener(
                    self.config.PG_NOTIFY_CHANNEL,
                    self.handle_notification
                )
                await self.conn.close()
                logger.info("Disconnected from PostgreSQL")
            except Exception as e:
                logger.error(f"Error disconnecting: {e}")

    async def handle_notification(self, connection, pid, channel, payload):
        """
        Handle PostgreSQL NOTIFY event

        Args:
            connection: asyncpg connection
            pid: PostgreSQL backend PID
            channel: Notification channel name
            payload: JSON payload with change details
        """
        try:
            # Parse notification payload
            data = json.loads(payload)

            table_name = data.get('table')
            operation = data.get('operation')  # INSERT, UPDATE, DELETE
            entry_id = data.get('id')
            pg_modified_time = data.get('pg_modified_time')

            logger.info(
                f"📨 Received notification: {operation} on {table_name}:{entry_id}"
            )

            # Skip if not a relevant table
            if not table_name or not table_name.startswith('memento_'):
                logger.debug(f"Skipping non-memento table: {table_name}")
                return

            # Skip system tables
            if table_name in ('memento_sync_log', 'memento_sync_conflicts', 'memento_sync_metadata'):
                logger.debug(f"Skipping system table: {table_name}")
                return

            # Process the change
            await self.process_change(
                table_name=table_name,
                entry_id=entry_id,
                operation=operation.lower()
            )

            self.events_processed += 1

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON payload: {payload} - {e}")
            self.events_failed += 1

        except Exception as e:
            logger.error(f"Error handling notification: {e}", exc_info=True)
            self.events_failed += 1

    async def process_change(
        self,
        table_name: str,
        entry_id: str,
        operation: str
    ):
        """
        Process a change notification by syncing to Memento

        Args:
            table_name: PostgreSQL table name
            entry_id: Entry ID
            operation: 'insert', 'update', or 'delete'
        """
        try:
            # Create database session
            db = self.SessionLocal()

            try:
                # Create sync handler
                sync_handler = PostgreSQLToMementoSync(db)

                # Sync to Memento
                result = await sync_handler.sync_entry(
                    table_name=table_name,
                    entry_id=entry_id,
                    operation=operation
                )

                if result.get('success'):
                    logger.info(f"✅ Synced {table_name}:{entry_id} to Memento")
                elif result.get('skipped'):
                    logger.info(f"⏭️  Skipped {table_name}:{entry_id} - {result.get('reason', 'No reason')}")
                else:
                    logger.error(f"❌ Failed to sync {table_name}:{entry_id} - {result.get('error')}")

                # Close aiohttp session
                await sync_handler.close_session()

            finally:
                db.close()

        except Exception as e:
            logger.error(f"Error processing change: {e}", exc_info=True)

    async def run(self):
        """Main listener loop"""
        self.running = True

        logger.info("=================================================")
        logger.info("PostgreSQL Listener for Memento Sync")
        logger.info("=================================================")
        logger.info(f"Configuration:")
        logger.info(f"  Database: {self.config.PG_HOST}:{self.config.PG_PORT}/{self.config.PG_DATABASE}")
        logger.info(f"  Channel: {self.config.PG_NOTIFY_CHANNEL}")
        logger.info(f"  PG → Memento: {'Enabled' if self.config.ENABLE_PG_TO_MEMENTO else 'Disabled'}")
        logger.info(f"  Conflict Resolution: {self.config.CONFLICT_RESOLUTION}")
        logger.info("=================================================")

        while self.running:
            try:
                # Connect to PostgreSQL
                await self.connect()

                logger.info("🎧 Listener active - waiting for notifications...")

                # Keep connection alive
                while self.running:
                    await asyncio.sleep(1)

                    # Heartbeat every 60 seconds
                    if int(asyncio.get_event_loop().time()) % 60 == 0:
                        uptime = datetime.now() - self.start_time
                        logger.info(
                            f"💓 Heartbeat - Uptime: {uptime}, "
                            f"Processed: {self.events_processed}, "
                            f"Failed: {self.events_failed}"
                        )

            except asyncio.CancelledError:
                logger.info("Listener cancelled")
                break

            except Exception as e:
                logger.error(f"Listener error: {e}", exc_info=True)
                logger.info(f"Reconnecting in {self.reconnect_delay} seconds...")
                await asyncio.sleep(self.reconnect_delay)

            finally:
                await self.disconnect()

        logger.info("Listener stopped")

    def stop(self):
        """Stop the listener"""
        logger.info("Stopping listener...")
        self.running = False

    async def shutdown(self, signal_name: str):
        """Graceful shutdown"""
        logger.info(f"Received {signal_name}, shutting down...")
        self.stop()


# Global listener instance
listener = None


def signal_handler(signum, frame):
    """Handle shutdown signals"""
    signal_name = signal.Signals(signum).name
    logger.info(f"Received signal {signal_name}")

    if listener:
        asyncio.create_task(listener.shutdown(signal_name))


async def main():
    """Main entry point"""
    global listener

    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Create and run listener
    listener = PostgreSQLListener()

    try:
        await listener.run()
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    finally:
        await listener.disconnect()

    logger.info("Shutdown complete")


if __name__ == "__main__":
    # Validate configuration
    try:
        Config.validate()
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        sys.exit(1)

    # Run listener
    try:
        asyncio.run(main())
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)
