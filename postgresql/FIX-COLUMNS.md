# Fix Missing Columns - Quick Guide

## Problem
Sync zlyhalo s chybou:
```
column "modified_by" of relation "memento_employees" does not exist
```

## Solution

### Option 1: Direct SSH Command (Fastest)
```bash
ssh rasto@192.168.5.241
sudo -u postgres psql memento_mirror -c "ALTER TABLE memento_employees ADD COLUMN IF NOT EXISTS modified_by VARCHAR(255);"
```

### Option 2: Run SQL Script
```bash
ssh rasto@192.168.5.241
sudo -u postgres psql memento_mirror -f /path/to/fix-missing-columns.sql
```

### Option 3: Interactive psql
```bash
ssh rasto@192.168.5.241
sudo -u postgres psql memento_mirror
```

Then run:
```sql
ALTER TABLE memento_employees ADD COLUMN IF NOT EXISTS modified_by VARCHAR(255);
\d memento_employees  -- Verify column added
\q
```

## Verify Fix

After adding column, check sync logs:
```bash
# Option 1: File logs
tail -f /opt/memento-sync/logs/bulk-sync/*.log

# Option 2: Database logs (after restarting service)
sudo -u postgres psql memento_mirror -c "SELECT * FROM memento_script_logs ORDER BY created_at DESC LIMIT 1;"
```

## Restart Sync API (After Fixing Columns)

```bash
ssh rasto@192.168.5.241
sudo systemctl restart memento-sync-api
sudo systemctl status memento-sync-api
```

## Next Steps

1. Fix column: `modified_by`
2. Restart service
3. Run sync again in Memento app
4. Check if additional columns are missing
5. If more missing columns, repeat process

## All System Columns That Should Exist

```sql
-- Core system columns
id VARCHAR(255) PRIMARY KEY
status VARCHAR(50) DEFAULT 'active'
memento_created_time TIMESTAMP
memento_modified_time TIMESTAMP
pg_modified_time TIMESTAMP DEFAULT NOW()
created_by VARCHAR(255)
modified_by VARCHAR(255)  -- ← This one was missing!
synced_at TIMESTAMP DEFAULT NOW()
sync_source VARCHAR(20) DEFAULT 'memento'
```
