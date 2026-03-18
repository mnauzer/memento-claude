# Phase 2 Deployment Checklist

Postupný checklist pre deployment Phase 2 na reddwarf server.

---

## ☑️ Pre-Deployment (Windows)

### 1. Overiť Vytvorené Súbory

```powershell
# Zkontroluj že všetky Phase 2 súbory existujú
cd X:\claude\projects\memento-claude\postgresql

# Core files
ls sync-api\conflict_resolver.py
ls sync-api\pg_to_memento.py
ls sync-api\pg_listener.py

# Deployment files
ls deployment\systemd\memento-pg-listener.service
ls deploy-phase2.sh
ls test_bidirectional_sync.py

# Documentation
ls PHASE2_README.md
ls TESTING_GUIDE.md
```

**Expected:** Všetky súbory by mali existovať ✅

### 2. Pripraviť Súbory na Transfer

**Možnosť A: Git Push** (Recommended)
```bash
cd X:\claude\projects\memento-claude
git add postgresql/
git commit -m "feat: add Phase 2 bidirectional sync implementation"
git push origin main
```

**Možnosť B: SCP Transfer**
```powershell
# V PowerShell (z Windows)
cd X:\claude\projects\memento-claude\postgresql

# Transfer Phase 2 files
scp sync-api\conflict_resolver.py rasto@reddwarf:/opt/memento-sync/sync-api/
scp sync-api\pg_to_memento.py rasto@reddwarf:/opt/memento-sync/sync-api/
scp sync-api\pg_listener.py rasto@reddwarf:/opt/memento-sync/sync-api/
scp test_bidirectional_sync.py rasto@reddwarf:/opt/memento-sync/
scp deployment\systemd\memento-pg-listener.service rasto@reddwarf:/tmp/
scp deploy-phase2.sh rasto@reddwarf:/tmp/
```

---

## ☑️ Deployment na reddwarf

### 3. SSH na reddwarf

```bash
ssh rasto@reddwarf
# alebo
ssh rasto@192.168.5.241
```

### 4. Overiť Phase 1 Beží

```bash
# Check Sync API is running
sudo systemctl status memento-sync-api

# Test health endpoint
curl http://localhost:8888/api/memento/health

# Expected: {"status":"healthy",...}
```

**Ak Phase 1 nie je deployed:**
```bash
cd /opt/memento-sync
sudo ./deploy.sh
```

### 5. Deploy Phase 2 (Automatický)

```bash
# Make script executable
chmod +x /tmp/deploy-phase2.sh

# Run deployment script
sudo /tmp/deploy-phase2.sh
```

**Očakávaný output:**
```
==================================================
Memento PostgreSQL Sync - Phase 2 Deployment
Bidirectional Sync & PostgreSQL Listener
==================================================

➡ Step 1: Copying Phase 2 files...
✅ Phase 2 files copied

➡ Step 2: Installing PostgreSQL listener service...
✅ Listener service installed and enabled

➡ Step 3: Checking configuration...
✅ PG → Memento sync is enabled
✅ Conflict resolution: memento_wins

➡ Step 4: Verifying PostgreSQL triggers...
✅ PostgreSQL triggers active (72 found)

➡ Step 5: Restarting Sync API...
✅ Sync API restarted successfully

➡ Step 6: Starting PostgreSQL listener...
✅ PostgreSQL listener started successfully

➡ Step 7: Verifying services...
✅ Sync API is healthy

==================================================
✅ Phase 2 Deployment Complete!
==================================================

Services status:
  Sync API:         active
  PG Listener:      active
```

### 6. Overiť Services Bežia

```bash
# Check both services
sudo systemctl status memento-sync-api
sudo systemctl status memento-pg-listener

# Both should show: active (running)
```

### 7. Sleduj Listener Logs (Real-time)

```bash
# Open new terminal and watch logs
sudo journalctl -u memento-pg-listener -f
```

**Očakávaný output:**
```
=================================================
PostgreSQL Listener for Memento Sync
=================================================
Configuration:
  Database: localhost:5432/memento_mirror
  Channel: memento_sync_channel
  PG → Memento: Enabled
  Conflict Resolution: memento_wins
=================================================
✅ Connected to PostgreSQL and listening on channel: memento_sync_channel
🎧 Listener active - waiting for notifications...
```

---

## ☑️ Testing Phase 2

### 8. Test 1: PostgreSQL → Memento Sync

```bash
# Activate venv
cd /opt/memento-sync
source venv/bin/activate

# Run automated test
python test_bidirectional_sync.py --test pg-to-memento
```

**Expected result:** ✅ Test passes, entry synced to Memento

### 9. Test 2: Manual PostgreSQL Insert

```sql
# Open PostgreSQL
psql -h localhost -U smarthome -d memento_mirror

-- Create test entry
INSERT INTO memento_work_records (
    id, status, date, work_description, worked_hours,
    sync_source, memento_created_time, memento_modified_time
) VALUES (
    'deployment_test_001',
    'active',
    CURRENT_DATE,
    'Deployment test - Phase 2 working!',
    8.0,
    'postgresql',
    NOW(),
    NOW()
);

-- Exit psql
\q
```

**Check listener logs** (in other terminal):
```
📨 Received notification: INSERT on memento_work_records:deployment_test_001
✅ Synced memento_work_records:deployment_test_001 to Memento
```

**Verify in Memento app:**
- Open "Záznam prác" library
- Refresh
- Entry "deployment_test_001" should appear! 🎉

### 10. Test 3: Memento → PostgreSQL Sync

```bash
# Run automated test
python test_bidirectional_sync.py --test memento-to-pg
```

**Expected result:** ✅ Test passes, entry appears in PostgreSQL

### 11. Test 4: Full Bidirectional

```bash
# Run both tests
python test_bidirectional_sync.py --test both
```

**Expected result:** ✅ Both directions working

---

## ☑️ Monitoring & Verification

### 12. Check Sync Statistics

```bash
# Set your API key
export SYNC_API_KEY="your_api_key_here"

# Get stats
curl -H "X-API-Key: $SYNC_API_KEY" \
  http://localhost:8888/api/memento/stats | jq
```

**Expected output:**
```json
{
  "total_libraries": 36,
  "total_entries": 150,
  "last_sync": "2026-03-17T15:30:00",
  "sync_errors_24h": 0,
  "conflicts_unresolved": 0
}
```

### 13. Check Recent Sync Logs

```bash
curl -H "X-API-Key: $SYNC_API_KEY" \
  "http://localhost:8888/api/memento/logs?limit=10" | jq
```

### 14. Check for Conflicts

```sql
psql -h localhost -U smarthome -d memento_mirror -c "
SELECT
    library_name,
    entry_id,
    conflict_time,
    resolution,
    resolved
FROM memento_sync_conflicts
ORDER BY conflict_time DESC
LIMIT 5;
"
```

**Expected:** No conflicts (empty result) - this is good! ✅

### 15. Monitor Services Health

```bash
# Install jq if not present
sudo apt-get install -y jq

# Live stats dashboard (refresh every 3 seconds)
watch -n 3 'curl -s -H "X-API-Key: $SYNC_API_KEY" \
  http://localhost:8888/api/memento/stats | jq'
```

---

## ☑️ Production Readiness

### 16. Enable Services on Boot

```bash
# Ensure both services start on boot
sudo systemctl enable memento-sync-api
sudo systemctl enable memento-pg-listener

# Verify
sudo systemctl is-enabled memento-sync-api
sudo systemctl is-enabled memento-pg-listener

# Both should show: enabled
```

### 17. Setup Log Rotation (Optional)

```bash
# Create logrotate config
sudo tee /etc/logrotate.d/memento-sync << EOF
/opt/memento-sync/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0644 smarthome smarthome
    sharedscripts
    postrotate
        systemctl reload memento-sync-api > /dev/null 2>&1 || true
    endscript
}
EOF

# Test logrotate
sudo logrotate -f /etc/logrotate.d/memento-sync
```

### 18. Backup Configuration

```bash
# Backup .env file
sudo cp /opt/memento-sync/sync-api/.env \
  /opt/memento-sync/sync-api/.env.backup.$(date +%Y%m%d)

# Backup database schema (optional)
sudo -u postgres pg_dump memento_mirror \
  --schema-only > /tmp/memento_mirror_schema_$(date +%Y%m%d).sql
```

### 19. Document API Key

```bash
# Save API key securely
echo "SYNC_API_KEY=$(grep SYNC_API_KEY /opt/memento-sync/sync-api/.env | cut -d'=' -f2)" \
  >> ~/.bashrc

# Source it
source ~/.bashrc

# Test
echo $SYNC_API_KEY
```

### 20. Final Verification Checklist

```bash
# Run full verification
echo "=== Phase 2 Deployment Verification ==="
echo ""

# 1. Services running
echo "✓ Checking services..."
systemctl is-active memento-sync-api > /dev/null && echo "  ✅ Sync API: running" || echo "  ❌ Sync API: not running"
systemctl is-active memento-pg-listener > /dev/null && echo "  ✅ PG Listener: running" || echo "  ❌ PG Listener: not running"

# 2. API health
echo ""
echo "✓ Checking API health..."
curl -s http://localhost:8888/api/memento/health | grep -q "healthy" && echo "  ✅ API is healthy" || echo "  ❌ API unhealthy"

# 3. Listener active
echo ""
echo "✓ Checking listener..."
sudo journalctl -u memento-pg-listener --since "5 minutes ago" | grep -q "Listener active" && echo "  ✅ Listener is active" || echo "  ❌ Listener not active"

# 4. No recent errors
echo ""
echo "✓ Checking for errors..."
ERROR_COUNT=$(sudo journalctl -u memento-pg-listener --since "1 hour ago" | grep -c "ERROR" || true)
if [ "$ERROR_COUNT" -eq 0 ]; then
    echo "  ✅ No errors in last hour"
else
    echo "  ⚠️  $ERROR_COUNT errors found (check logs)"
fi

echo ""
echo "=== Verification Complete ==="
```

---

## ✅ Success Criteria

Po dokončení všetkých krokov:

- [x] **Services Running**
  - `memento-sync-api`: active (running)
  - `memento-pg-listener`: active (running)

- [x] **Tests Passing**
  - PostgreSQL → Memento: ✅
  - Memento → PostgreSQL: ✅
  - Bidirectional: ✅

- [x] **Monitoring Working**
  - Stats endpoint responsive
  - Logs show successful syncs
  - No conflicts detected

- [x] **Production Ready**
  - Services enabled on boot
  - Log rotation configured
  - Configuration backed up

---

## 🆘 Troubleshooting

### Listener Won't Start

```bash
# Check logs
sudo journalctl -u memento-pg-listener -n 50

# Common issues:
# 1. Database connection failed
psql -h localhost -U smarthome -d memento_mirror -c "SELECT 1"

# 2. Python dependencies missing
/opt/memento-sync/venv/bin/pip install -r /opt/memento-sync/sync-api/requirements.txt

# 3. Permission issues
sudo chown -R smarthome:smarthome /opt/memento-sync
```

### Changes Not Syncing

```bash
# 1. Check ENABLE_PG_TO_MEMENTO
grep ENABLE_PG_TO_MEMENTO /opt/memento-sync/sync-api/.env

# 2. Check listener is receiving notifications
# Insert test entry and watch logs:
sudo journalctl -u memento-pg-listener -f

# 3. Test notification manually
psql -h localhost -U smarthome -d memento_mirror -c "
SELECT pg_notify('memento_sync_channel', '{\"test\":\"123\"}');
"
# Should see notification in listener logs
```

### Need to Rollback

```bash
# Stop Phase 2 services
sudo systemctl stop memento-pg-listener
sudo systemctl disable memento-pg-listener

# Remove Phase 2 files
sudo rm /opt/memento-sync/sync-api/conflict_resolver.py
sudo rm /opt/memento-sync/sync-api/pg_to_memento.py
sudo rm /opt/memento-sync/sync-api/pg_listener.py
sudo rm /etc/systemd/system/memento-pg-listener.service
sudo systemctl daemon-reload

# Restart Sync API (Phase 1 still works)
sudo systemctl restart memento-sync-api
```

---

## 📞 Support

- **Listener Logs**: `sudo journalctl -u memento-pg-listener -f`
- **API Logs**: `sudo journalctl -u memento-sync-api -f`
- **Testing Guide**: `/opt/memento-sync/TESTING_GUIDE.md`
- **Phase 2 README**: `/opt/memento-sync/PHASE2_README.md`

---

**Ready for deployment! 🚀**
