# Memento PostgreSQL Bidirectional Sync System

Comprehensive bidirectional synchronization system between Memento Database (mobile/cloud) and PostgreSQL (homelab reddwarf server).

---

## 🚀 Quick Start

**Want to start syncing right now?** See **[QUICK_START.md](QUICK_START.md)** - Get your first library syncing in 3 minutes!

**Current Status:**
- ✅ **Memento → PostgreSQL** - FULLY WORKING, ready to use!
- 🔧 **PostgreSQL → Memento** - Infrastructure ready, needs completion
- ✅ **14/36 Libraries Registered** - Ready for triggers
- ✅ **Both Services Running** - API on port 8889, Listener active

**Documentation:**
- **[QUICK_START.md](QUICK_START.md)** - Get started in 3 minutes
- **[TRIGGER_INSTALLATION.md](TRIGGER_INSTALLATION.md)** - Detailed trigger setup
- **[DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md)** - Complete system status & TODO list
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Original deployment guide
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Testing procedures

---

## Overview

**Problem:** Memento Database API has strict rate limits (10 requests/minute) that make querying data impractical for automation, reporting, and n8n workflows.

**Solution:** Bidirectional sync system that mirrors 36 Memento libraries to PostgreSQL, enabling:
- Fast local queries without rate limits
- SQL query capabilities for complex analytics
- Integration with n8n workflows
- Real-time sync via triggers
- Preservation of relationships between libraries

**Architecture:**
- **Memento → PostgreSQL**: Memento AfterSave triggers → HTTP POST to Sync API → PostgreSQL UPSERT
- **PostgreSQL → Memento**: PostgreSQL triggers → pg_notify() → Python listener → Memento API update
- **Conflict Resolution**: Memento always wins (timestamp-based)

## Components

### 1. PostgreSQL Schema (`schema.sql`)

**36 Data Tables:**
- Daily Records (5): Daily Report, Attendance, Work Records, Ride Log, Cash Book
- Reports (4): Work Report, Materials Report, Ride Report, Machines Report
- Master Data (6): Employees, Suppliers, Partners, Clients, Vehicles, Machinery
- Locations (2): Places, Addresses
- Catalogs (2): Price List Work, Materials
- Inventory (2): Material Expenses, Material Receipts
- Business Docs (5): Quotes, Quote Parts, Orders, Order Parts, Settlements
- Financial Docs (4): Receivables, Obligations, Issued Invoices, Received Invoices
- Historical Prices (6): Work, Material, Machinery, Transport, Employee Rates, VAT Rates
- Other (1): Accounts

**System Tables:**
- `memento_sync_log` - Sync operation log
- `memento_sync_conflicts` - Conflict tracking
- `memento_sync_metadata` - Per-library sync status

**Junction Tables (6):**
- `memento_work_records_employees`
- `memento_attendance_employees`
- `memento_ride_log_crew`
- `memento_ride_log_orders`
- `memento_work_records_machinery`
- `memento_cash_book_obligations`
- `memento_cash_book_receivables`

### 2. Sync API Service (`sync-api/`)

**FastAPI Application** with endpoints:

```
POST   /api/memento/from-memento/{library_id}      - Sync entry from Memento
DELETE /api/memento/from-memento/{library_id}/{entry_id}  - Delete entry
GET    /api/memento/health                          - Health check
GET    /api/memento/stats                           - Sync statistics
GET    /api/memento/libraries                       - List all libraries
GET    /api/memento/conflicts                       - List conflicts
GET    /api/memento/logs                            - Sync operation logs
```

**Core Modules:**
- `main.py` - FastAPI application entry point
- `config.py` - Configuration management
- `models.py` - SQLAlchemy ORM models (36 tables)
- `memento_to_pg.py` - Memento → PostgreSQL sync handler
- `field_mapper.py` - Field type conversion
- `auth.py` - API key authentication
- `library_mapping.py` - Slovak ↔ English library name mapping

### 3. Library Mapping (`library_mapping.py`)

Maps Slovak library names to English table names and library IDs:

```python
from library_mapping import get_table_name, get_library_id

table_name = get_table_name("Dochádzka")  # Returns "memento_attendance"
library_id = get_library_id("Dochádzka")  # Returns "qU4Br5hU6"
```

**36 Libraries Mapped:**
- Daily records (5)
- Reports (4)
- Master data (6)
- And more...

## Setup Instructions

### Prerequisites

- PostgreSQL 14+ on reddwarf (already installed)
- Python 3.10+ on reddwarf
- Memento Database account with API access

### 1. Database Setup

```bash
# On reddwarf, as postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE memento_mirror WITH ENCODING 'UTF8';

# Exit psql
\q

# Run schema
sudo -u postgres psql memento_mirror < schema.sql
```

**Verify tables created:**

```sql
-- Should show 36 data tables + 3 system tables + 6 junction tables
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'memento_%'
ORDER BY tablename;
```

### 2. Sync API Setup

```bash
# On reddwarf
cd /opt/memento-sync
mkdir -p sync-api logs

# Copy files (from Windows via SSH or Git)
# scp -r X:\claude\projects\memento-claude\postgresql\sync-api/* rasto@reddwarf:/opt/memento-sync/sync-api/
# Or clone from Git

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r sync-api/requirements.txt
```

### 3. Configuration

```bash
# Copy environment template
cp sync-api/.env.example sync-api/.env

# Edit configuration
nano sync-api/.env
```

**Required settings:**

```bash
# PostgreSQL
PG_HOST=localhost
PG_PORT=5432
PG_USER=smarthome
PG_PASSWORD=<your_password>
PG_DATABASE=memento_mirror

# Memento API
MEMENTO_API_KEY=d0cY7KqOQ0NtT4lLch863w3n0hGTWP

# Sync API
SYNC_API_KEY=<generate_strong_key>  # Use: python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 4. Test Sync API

```bash
# Activate virtual environment
source /opt/memento-sync/venv/bin/activate

# Run API server
cd /opt/memento-sync/sync-api
python main.py
```

**Test endpoints:**

```bash
# Health check (no auth required)
curl http://localhost:8888/api/memento/health

# Get stats (requires API key)
curl -H "X-API-Key: YOUR_API_KEY" http://localhost:8888/api/memento/stats

# List libraries
curl -H "X-API-Key: YOUR_API_KEY" http://localhost:8888/api/memento/libraries
```

### 5. Production Deployment

**systemd Service:**

```bash
# Copy service file
sudo cp deployment/systemd/memento-sync-api.service /etc/systemd/system/

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable memento-sync-api
sudo systemctl start memento-sync-api

# Check status
sudo systemctl status memento-sync-api

# View logs
sudo journalctl -u memento-sync-api -f
```

**nginx Configuration:**

```bash
# Copy nginx config
sudo cp deployment/nginx/memento-sync /etc/nginx/sites-available/

# Enable site
sudo ln -s /etc/nginx/sites-available/memento-sync /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

**Access externally:**

```
https://reddwarf.local/api/memento/health
```

## Usage

### Sync Single Entry from Memento

```bash
curl -X POST https://reddwarf.local/api/memento/from-memento/ArdaPo5TU \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "12345",
    "status": "active",
    "fields": {
      "date": "2026-03-17",
      "workDescription": "Test práce",
      "workedHours": 8.0
    },
    "createdTime": "2026-03-17T10:00:00Z",
    "modifiedTime": "2026-03-17T10:00:00Z"
  }'
```

### Query PostgreSQL Directly

```sql
-- Get all work records for today
SELECT * FROM memento_work_records
WHERE date = CURRENT_DATE
ORDER BY start_time;

-- Get attendance by employee
SELECT
    a.date,
    e.name as employee_name,
    ae.worked_hours,
    ae.daily_wage
FROM memento_attendance a
JOIN memento_attendance_employees ae ON a.id = ae.attendance_id
JOIN memento_employees e ON ae.employee_id = e.id
WHERE a.date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY a.date DESC, e.name;

-- Get work records with order details
SELECT
    wr.date,
    wr.work_description,
    wr.worked_hours,
    o.order_name,
    o.order_number,
    c.name as client_name
FROM memento_work_records wr
LEFT JOIN memento_orders o ON wr.order_id = o.id
LEFT JOIN memento_clients c ON o.client_id = c.id
WHERE wr.date >= '2026-01-01'
ORDER BY wr.date DESC;
```

### Get Sync Statistics

```bash
curl -H "X-API-Key: YOUR_API_KEY" https://reddwarf.local/api/memento/stats
```

**Response:**

```json
{
  "total_libraries": 36,
  "total_entries": 5420,
  "last_sync": "2026-03-17T14:30:00",
  "sync_errors_24h": 2,
  "conflicts_unresolved": 0
}
```

### View Sync Logs

```bash
# Get recent logs
curl -H "X-API-Key: YOUR_API_KEY" \
  "https://reddwarf.local/api/memento/logs?limit=10"

# Get errors only
curl -H "X-API-Key: YOUR_API_KEY" \
  "https://reddwarf.local/api/memento/logs?success=false&limit=20"

# Get logs for specific library
curl -H "X-API-Key: YOUR_API_KEY" \
  "https://reddwarf.local/api/memento/logs?library_id=ArdaPo5TU"
```

## Memento Trigger Scripts

To enable real-time sync from Memento → PostgreSQL, create trigger scripts in Memento Database app.

**Template for AfterSave Trigger:**

```javascript
// {Library}.Trigger.SyncToPostgreSQL.js
// Example: Doch.Trigger.SyncToPostgreSQL.js

var utils = MementoUtils;
var config = MementoConfig.getConfig();

try {
    var entryData = {
        id: entry().id(),
        status: entry().status(),
        fields: {},
        createdTime: entry().createdTime(),
        modifiedTime: entry().modifiedTime(),
        createdBy: entry().createdBy(),
        modifiedBy: entry().modifiedBy()
    };

    // Extract all fields
    var fields = lib().fields();
    for (var i = 0; i < fields.length; i++) {
        var field = fields[i];
        var fieldName = field.name();
        var fieldValue = entry().field(fieldName);

        // Handle linkToEntry fields
        if (field.type() === 'entries') {
            var linkedIds = [];
            if (fieldValue && fieldValue.length > 0) {
                for (var j = 0; j < fieldValue.length; j++) {
                    linkedIds.push(fieldValue[j].id());
                }
            }
            entryData.fields[fieldName] = linkedIds;
        } else {
            entryData.fields[fieldName] = fieldValue;
        }
    }

    // HTTP POST to sync API
    var response = http.post({
        url: 'https://reddwarf.local/api/memento/from-memento/' + lib().id(),
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': config.constants.postgresqlSyncApiKey
        },
        body: JSON.stringify(entryData),
        timeout: 5000
    });

    if (response.status !== 200 && response.status !== 201) {
        utils.addError(entry(), 'PostgreSQL sync failed: HTTP ' + response.status,
                      'syncToPostgreSQL', response.body);
    }
} catch (e) {
    utils.addError(entry(), 'PostgreSQL sync error: ' + e.message,
                  'syncToPostgreSQL', e.toString());
}
```

**Install for each library:**

1. Open Memento Database app
2. Go to library settings
3. Add new "After Save" trigger
4. Paste template code
5. Update library-specific field handling if needed
6. Test by creating/updating entry

## Monitoring

### Check Service Status

```bash
# API service
sudo systemctl status memento-sync-api

# View logs
sudo journalctl -u memento-sync-api -f

# Check errors
sudo journalctl -u memento-sync-api --since "1 hour ago" | grep ERROR
```

### Database Monitoring

```sql
-- Check sync metadata
SELECT
    library_name,
    entry_count,
    last_sync,
    sync_enabled,
    last_error
FROM memento_sync_metadata
ORDER BY last_sync DESC NULLS LAST;

-- Recent sync operations
SELECT
    library_name,
    entry_id,
    sync_direction,
    sync_time,
    success,
    error_message
FROM memento_sync_log
ORDER BY sync_time DESC
LIMIT 50;

-- Unresolved conflicts
SELECT
    library_name,
    entry_id,
    conflict_time,
    resolution
FROM memento_sync_conflicts
WHERE resolved = false
ORDER BY conflict_time DESC;
```

### API Health Check

```bash
# Continuous monitoring
watch -n 5 'curl -s http://localhost:8888/api/memento/health | jq'
```

## Troubleshooting

### Sync API Not Starting

```bash
# Check logs
sudo journalctl -u memento-sync-api -n 100

# Common issues:
# 1. Database connection failed
#    - Check PG_PASSWORD in .env
#    - Verify PostgreSQL is running: sudo systemctl status postgresql

# 2. Port already in use
#    - Change API_PORT in .env
#    - Or kill existing process: sudo lsof -i :8888

# 3. Missing dependencies
#    - Reinstall: pip install -r requirements.txt
```

### Entries Not Syncing

```bash
# 1. Check Memento trigger is installed
#    - View entry Debug_Log field for errors

# 2. Check API logs
curl -H "X-API-Key: YOUR_API_KEY" \
  "https://reddwarf.local/api/memento/logs?success=false&limit=10"

# 3. Test manual sync
curl -X POST https://reddwarf.local/api/memento/from-memento/ArdaPo5TU \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d @test_entry.json
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -h localhost -U smarthome -d memento_mirror -c "SELECT 1"

# Check PostgreSQL is accepting connections
sudo nano /etc/postgresql/14/main/postgresql.conf
# Ensure: listen_addresses = 'localhost'

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Performance

### Expected Metrics

- **Sync latency**: < 5 seconds per entry (Memento → PostgreSQL)
- **Query performance**: < 100ms for simple queries
- **API response time**: < 200ms for most endpoints
- **Rate limit**: No limits on PostgreSQL queries (vs 10/min on Memento API)

### Optimization

```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_work_records_date_order ON memento_work_records(date, order_id);
CREATE INDEX idx_attendance_date_employee ON memento_attendance(date);

-- Analyze tables after bulk sync
ANALYZE memento_work_records;
ANALYZE memento_attendance;
```

## Next Steps

### Phase 2: Bidirectional Sync (PostgreSQL → Memento)

- [ ] Implement `pg_listener.py` - PostgreSQL NOTIFY listener
- [ ] Implement `pg_to_memento.py` - PostgreSQL → Memento sync
- [ ] Test bidirectional sync
- [ ] Deploy listener as systemd service

### Phase 3: Bulk Sync (Historical Data)

- [ ] Implement `bulk_sync.py` - Import all existing entries
- [ ] Test with small library first
- [ ] Run full bulk sync (~90 minutes estimated)

### Phase 4: MCP Integration

- [ ] Add PostgreSQL query tools to MCP server
- [ ] Test with Claude Code
- [ ] Create example n8n workflows

## Files Overview

```
postgresql/
├── schema.sql                    # PostgreSQL schema (36 tables)
├── library_mapping.py            # Slovak ↔ English mappings
├── README.md                     # This file
├── sync-api/
│   ├── main.py                   # FastAPI application
│   ├── config.py                 # Configuration
│   ├── models.py                 # SQLAlchemy ORM models
│   ├── memento_to_pg.py          # Memento → PG sync
│   ├── field_mapper.py           # Type conversion
│   ├── auth.py                   # API authentication
│   ├── requirements.txt          # Python dependencies
│   └── .env.example              # Environment template
└── deployment/
    ├── systemd/
    │   └── memento-sync-api.service
    └── nginx/
        └── memento-sync
```

## Support

- **Documentation**: This README
- **API Docs**: https://reddwarf.local/api/memento/docs (Swagger UI)
- **Logs**: `/opt/memento-sync/logs/sync.log`
- **Database**: PostgreSQL on reddwarf:5432

## License

Internal project for Semiramis business automation.
