# Phase 2 Testing Guide - Bidirectional Sync

Komplexný testing guide pre overenie bidirectional sync funkcionality.

---

## Pre-requisites

1. ✅ Phase 1 deployed and working (Memento → PostgreSQL)
2. ✅ Phase 2 deployed (PostgreSQL listener running)
3. ✅ Both services active:
   ```bash
   sudo systemctl status memento-sync-api
   sudo systemctl status memento-pg-listener
   ```

---

## Test Suite

### Test 1: PostgreSQL → Memento Sync ⭐

**Cieľ:** Overiť, že zmeny v PostgreSQL sa syncujú do Memento

#### 1.1 Automatický Test

```bash
cd /opt/memento-sync
source venv/bin/activate
python test_bidirectional_sync.py --test pg-to-memento
```

**Očakávaný výstup:**
```
==============================================================
TEST: PostgreSQL → Memento Sync
==============================================================

1. Creating test entry in PostgreSQL (ID: test_pg_1710681234)...
✅ Created entry in PostgreSQL: test_pg_1710681234

2. Syncing to Memento...
✅ Successfully synced to Memento!
   Result: {
     "success": true,
     "entry_id": "test_pg_1710681234",
     "library": "Záznam prác",
     "operation": "update"
   }

3. Verifying entry in PostgreSQL...
✅ Entry found in PostgreSQL

4. Cleaning up test entry...
✅ Test entry deleted

==============================================================
PostgreSQL → Memento test complete
==============================================================
```

#### 1.2 Manuálny Test (SQL)

```sql
-- 1. Connect to PostgreSQL
psql -h localhost -U smarthome -d memento_mirror

-- 2. Create test entry
INSERT INTO memento_work_records (
    id,
    status,
    date,
    work_description,
    worked_hours,
    sync_source,
    memento_created_time,
    memento_modified_time,
    pg_modified_time
) VALUES (
    'manual_pg_test_001',
    'active',
    CURRENT_DATE,
    'Manual test from PostgreSQL - should appear in Memento',
    8.5,
    'postgresql',
    NOW(),
    NOW(),
    NOW()
);

-- 3. Verify entry was created
SELECT id, work_description, sync_source, synced_at
FROM memento_work_records
WHERE id = 'manual_pg_test_001';
```

**Čo kontrolovať:**

1. **Listener logs** (v reálnom čase):
   ```bash
   sudo journalctl -u memento-pg-listener -f
   ```

   **Očakávaný output:**
   ```
   📨 Received notification: INSERT on memento_work_records:manual_pg_test_001
   ✅ Synced memento_work_records:manual_pg_test_001 to Memento
   ```

2. **Sync logs (API)**:
   ```bash
   curl -H "X-API-Key: YOUR_API_KEY" \
     "http://localhost:8888/api/memento/logs?limit=5" | jq
   ```

3. **Memento Database App** (na mobile):
   - Otvor knižnicu "Záznam prác"
   - Refresh
   - Entry `manual_pg_test_001` by sa mal objaviť!

4. **Cleanup:**
   ```sql
   DELETE FROM memento_work_records WHERE id = 'manual_pg_test_001';
   ```

---

### Test 2: Memento → PostgreSQL Sync ⭐

**Cieľ:** Overiť, že zmeny z Memento sa syncujú do PostgreSQL

#### 2.1 Automatický Test

```bash
python test_bidirectional_sync.py --test memento-to-pg
```

**Očakávaný výstup:**
```
==============================================================
TEST: Memento → PostgreSQL Sync
==============================================================

1. Preparing test data...
   Entry ID: test_memento_1710681234

2. Sending to Sync API (simulating Memento trigger)...
✅ Sync API accepted entry:
   {
     "success": true,
     "entry_id": "test_memento_1710681234",
     "table": "memento_work_records"
   }

3. Verifying entry in PostgreSQL...
✅ Entry found in PostgreSQL:
   ID: test_memento_1710681234
   Description: Test entry from Memento API simulation
   Sync source: memento

4. Cleaning up test entry...
✅ Test entry deleted

==============================================================
Memento → PostgreSQL test complete
==============================================================
```

#### 2.2 Manuálny Test (Memento App)

1. **V Memento mobile app:**
   - Otvor knižnicu "Záznam prác" (alebo inú syncovanú knižnicu)
   - Vytvor nový záznam:
     - Dátum: dnes
     - Popis: "Test z Memento - kontrola sync do PostgreSQL"
     - Odpracované: 8.0
   - ULOŽ záznam

2. **Overenie v PostgreSQL** (do 5 sekúnd):
   ```sql
   -- Najnovšie záznamy
   SELECT
       id,
       work_description,
       worked_hours,
       sync_source,
       synced_at
   FROM memento_work_records
   ORDER BY synced_at DESC
   LIMIT 5;
   ```

3. **Kontrola sync logs:**
   ```bash
   curl -H "X-API-Key: YOUR_API_KEY" \
     "http://localhost:8888/api/memento/logs?sync_direction=memento_to_pg&limit=5" | jq
   ```

---

### Test 3: Conflict Resolution ⚠️

**Cieľ:** Overiť, že konflikty sa správne riešia

#### 3.1 Simulácia Konfliktu (Memento Wins)

```sql
-- 1. Vytvor entry s older Memento timestamp
INSERT INTO memento_work_records (
    id,
    status,
    date,
    work_description,
    worked_hours,
    sync_source,
    memento_created_time,
    memento_modified_time,  -- Older timestamp
    pg_modified_time        -- Newer timestamp
) VALUES (
    'conflict_test_001',
    'active',
    CURRENT_DATE,
    'PostgreSQL version (newer)',
    8.0,
    'postgresql',
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '1 hour',  -- Memento: 1 hour ago
    NOW()                        -- PG: now (newer)
);

-- 2. Try to sync to Memento (should be skipped if memento_wins)
-- Listener will detect this and check conflict

-- 3. Check conflict log
SELECT
    library_name,
    entry_id,
    conflict_time,
    resolution,
    memento_modified_time,
    pg_modified_time,
    resolved
FROM memento_sync_conflicts
WHERE entry_id = 'conflict_test_001'
ORDER BY conflict_time DESC;
```

**Očakávaný výsledok s `CONFLICT_RESOLUTION=memento_wins`:**
- Conflict detected
- Resolution: `memento_wins`
- PostgreSQL → Memento sync **SKIPPED**
- Entry v `memento_sync_conflicts` table

#### 3.2 Overenie Conflict Strategy

```bash
# Check current strategy
grep CONFLICT_RESOLUTION /opt/memento-sync/sync-api/.env

# Expected: CONFLICT_RESOLUTION=memento_wins
```

---

### Test 4: Bidirectional Update ⭐⭐

**Cieľ:** Overiť full round-trip update

#### 4.1 Test Scenár

1. **Create v Memento** → PostgreSQL
2. **Update v PostgreSQL** → Memento
3. **Update v Memento** → PostgreSQL

```bash
# Step 1: Create in Memento (cez app alebo API simulation)
curl -X POST http://localhost:8888/api/memento/from-memento/ArdaPo5TU \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "bidirectional_test_001",
    "status": "active",
    "fields": {
      "date": "2026-03-17",
      "workDescription": "Initial version from Memento",
      "workedHours": 8.0
    },
    "createdTime": "2026-03-17T10:00:00Z",
    "modifiedTime": "2026-03-17T10:00:00Z"
  }'

# Step 2: Update in PostgreSQL
psql -h localhost -U smarthome -d memento_mirror -c "
UPDATE memento_work_records
SET work_description = 'Updated in PostgreSQL',
    worked_hours = 9.0,
    sync_source = 'postgresql',
    pg_modified_time = NOW()
WHERE id = 'bidirectional_test_001';
"

# Wait 5 seconds for sync to complete
sleep 5

# Step 3: Verify in Memento app
# Entry should show: "Updated in PostgreSQL", 9.0 hours

# Step 4: Update again in Memento app
# Change description to: "Final update from Memento"
# Change hours to: 7.5

# Step 5: Verify in PostgreSQL
psql -h localhost -U smarthome -d memento_mirror -c "
SELECT id, work_description, worked_hours, sync_source, synced_at
FROM memento_work_records
WHERE id = 'bidirectional_test_001';
"

# Expected: "Final update from Memento", 7.5, sync_source='memento'
```

---

### Test 5: Real-time Monitoring 📊

**Cieľ:** Sledovať sync v reálnom čase

#### 5.1 Terminal 1: Listener Logs

```bash
sudo journalctl -u memento-pg-listener -f
```

#### 5.2 Terminal 2: Sync API Logs

```bash
sudo journalctl -u memento-sync-api -f
```

#### 5.3 Terminal 3: Statistics Dashboard

```bash
# Install jq if not installed
sudo apt-get install -y jq

# Live stats (refresh every 2 seconds)
watch -n 2 'curl -s -H "X-API-Key: YOUR_API_KEY" \
  http://localhost:8888/api/memento/stats | jq'
```

**Očakávaný output:**
```json
{
  "total_libraries": 36,
  "total_entries": 142,
  "last_sync": "2026-03-17T14:30:15",
  "sync_errors_24h": 0,
  "conflicts_unresolved": 0
}
```

#### 5.4 Terminal 4: PostgreSQL Activity

```bash
# Watch recent syncs
watch -n 2 'psql -h localhost -U smarthome -d memento_mirror -c "
SELECT
    library_name,
    entry_id,
    sync_direction,
    sync_time,
    success
FROM memento_sync_log
ORDER BY sync_time DESC
LIMIT 10;
" '
```

---

### Test 6: Stress Test 💪

**Cieľ:** Overiť stabilitu pri väčšom počte zmien

#### 6.1 Bulk Insert Test

```sql
-- Insert 10 test entries quickly
DO $$
DECLARE
    i INT;
BEGIN
    FOR i IN 1..10 LOOP
        INSERT INTO memento_work_records (
            id,
            status,
            date,
            work_description,
            worked_hours,
            sync_source,
            memento_created_time,
            memento_modified_time
        ) VALUES (
            'stress_test_' || LPAD(i::TEXT, 3, '0'),
            'active',
            CURRENT_DATE,
            'Stress test entry #' || i,
            8.0,
            'postgresql',
            NOW(),
            NOW()
        );

        -- Small delay to avoid overwhelming API
        PERFORM pg_sleep(0.5);
    END LOOP;
END $$;
```

**Kontrola:**
```bash
# Check listener processed all 10
sudo journalctl -u memento-pg-listener --since "1 minute ago" | grep "Synced"

# Should see 10 successful syncs

# Check sync logs
curl -H "X-API-Key: YOUR_API_KEY" \
  "http://localhost:8888/api/memento/logs?limit=20" | jq

# Cleanup
psql -h localhost -U smarthome -d memento_mirror -c "
DELETE FROM memento_work_records WHERE id LIKE 'stress_test_%';
"
```

---

## Troubleshooting Checklist

### ❌ Listener Not Receiving Notifications

```bash
# 1. Check listener is running
sudo systemctl status memento-pg-listener

# 2. Check PostgreSQL triggers exist
psql -h localhost -U smarthome -d memento_mirror -c "
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgname LIKE '%sync%'
LIMIT 10;
"

# 3. Test notification manually
psql -h localhost -U smarthome -d memento_mirror -c "
SELECT pg_notify('memento_sync_channel',
  '{\"table\":\"test\",\"id\":\"123\",\"operation\":\"UPDATE\"}');
"

# Check listener logs - should see notification
sudo journalctl -u memento-pg-listener -n 5
```

### ❌ Changes Not Syncing to Memento

```bash
# 1. Check ENABLE_PG_TO_MEMENTO
grep ENABLE_PG_TO_MEMENTO /opt/memento-sync/sync-api/.env

# 2. Check Memento API key
grep MEMENTO_API_KEY /opt/memento-sync/sync-api/.env

# 3. Check library ID exists
python3 << EOF
import sys
sys.path.append('/opt/memento-sync')
from library_mapping import get_library_id
lib_id = get_library_id("Záznam prác")
print(f"Library ID: {lib_id}")
EOF

# 4. Check sync logs for errors
curl -H "X-API-Key: YOUR_API_KEY" \
  "http://localhost:8888/api/memento/logs?success=false&limit=10" | jq
```

### ❌ Rate Limit Errors (429)

```bash
# 1. Check current rate limit
grep MEMENTO_RATE_LIMIT /opt/memento-sync/sync-api/.env

# 2. Reduce to 8/min (safer)
sudo sed -i 's/MEMENTO_RATE_LIMIT=10/MEMENTO_RATE_LIMIT=8/' \
  /opt/memento-sync/sync-api/.env

# 3. Restart listener
sudo systemctl restart memento-pg-listener
```

---

## Success Criteria ✅

Po dokončení všetkých testov by si mal vidieť:

- [x] **Test 1 passed** - PostgreSQL → Memento funguje
- [x] **Test 2 passed** - Memento → PostgreSQL funguje
- [x] **Test 3 passed** - Konflikty sa správne riešia
- [x] **Test 4 passed** - Bidirectional updates fungujú
- [x] **Test 5 working** - Real-time monitoring funguje
- [x] **Test 6 passed** - Stress test stable
- [x] **Zero errors** v sync logs (last 24h)
- [x] **< 10 second latency** - Zmeny sa syncujú rýchlo
- [x] **Services stable** - Oba services running bez crashov

---

## Quick Reference Commands

```bash
# Service status
sudo systemctl status memento-sync-api memento-pg-listener

# View logs
sudo journalctl -u memento-pg-listener -f
sudo journalctl -u memento-sync-api -f

# Run tests
cd /opt/memento-sync && source venv/bin/activate
python test_bidirectional_sync.py --test both

# Check stats
curl -H "X-API-Key: $SYNC_API_KEY" http://localhost:8888/api/memento/stats | jq

# Check recent syncs
curl -H "X-API-Key: $SYNC_API_KEY" \
  "http://localhost:8888/api/memento/logs?limit=10" | jq

# Check conflicts
psql -h localhost -U smarthome -d memento_mirror -c \
  "SELECT * FROM memento_sync_conflicts ORDER BY conflict_time DESC LIMIT 5;"

# Restart services
sudo systemctl restart memento-pg-listener
sudo systemctl restart memento-sync-api
```

---

**Happy Testing! 🎉**
