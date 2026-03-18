# Quick Start - Memento → PostgreSQL Sync

## TL;DR

Your Memento → PostgreSQL sync is **FULLY WORKING** and ready to use! Follow these 3 steps to start syncing data.

---

## 3-Minute Setup

### Step 1: Pick a Library (30 seconds)

Start with one of these (IDs already known):

- **Záznam prác** (Work Records) - ID: `ArdaPo5TU`
- **Dochádzka** (Attendance) - ID: `qU4Br5hU6`
- **Denný report** (Daily Report) - ID: `Tt4pxN4xQ`

### Step 2: Install Trigger (2 minutes)

1. Open the library in Memento app
2. Tap menu → **Triggers** → **+**
3. Create trigger:
   - **Name**: `SyncToPostgreSQL`
   - **Event**: `After Save`
   - **Action**: `Run Script`
4. Copy the script from `TRIGGER_INSTALLATION.md` (section "Trigger Script Template")
5. Replace `YOUR_LIBRARY_ID` with your library ID (e.g., `ArdaPo5TU`)
6. Save trigger

### Step 3: Test It (30 seconds)

1. Create or edit an entry in the library
2. Save it
3. Check PostgreSQL:

```bash
ssh rasto@reddwarf
psql -h localhost -U smarthome -d memento_mirror -c "
SELECT * FROM memento_sync_log ORDER BY sync_time DESC LIMIT 5;
"
```

You should see your sync! ✅

---

## What's Working Right Now

✅ **Memento → PostgreSQL** - Instant sync, fully tested
✅ **API Service** - Running on port 8889
✅ **PostgreSQL Listener** - Monitoring changes
✅ **14 Libraries Registered** - Ready to sync
✅ **47 Tables Created** - Complete schema

---

## What's Still Being Tuned

🔧 **PostgreSQL → Memento** - Infrastructure ready, needs API method completion
🔧 **Missing 22 Library IDs** - Need to find and register
🔧 **Bulk Historical Sync** - Ready to run after triggers installed

---

## Quick Commands

### Check if Services are Running

```bash
ssh rasto@reddwarf
sudo systemctl status memento-sync-api memento-pg-listener
```

Both should show **active (running)** ✅

### Watch Sync Activity Live

```bash
sudo journalctl -u memento-sync-api -f
```

### Check Stats

```bash
curl -H "X-API-Key: 7d8f9e3a-2b4c-4e1f-9a8b-3c5d6e7f8a9b" \
  http://192.168.5.241:8889/api/memento/stats | jq
```

### Query Your Data

```bash
# Example: Latest work records
psql -h localhost -U smarthome -d memento_mirror -c "
SELECT id, work_description, worked_hours, synced_at
FROM memento_work_records
ORDER BY synced_at DESC
LIMIT 10;
"
```

---

## Documentation Map

| File | Purpose |
|------|---------|
| **QUICK_START.md** (this file) | Get started in 3 minutes |
| **TRIGGER_INSTALLATION.md** | Detailed trigger setup guide |
| **DEPLOYMENT_STATUS.md** | Complete system status & TODO |
| **DEPLOYMENT_CHECKLIST.md** | Original deployment guide |
| **TESTING_GUIDE.md** | Comprehensive testing procedures |

---

## Support & Troubleshooting

### ❌ Can't Connect to API

Check if service is running:
```bash
sudo systemctl status memento-sync-api
```

If not running:
```bash
sudo systemctl start memento-sync-api
```

### ❌ Sync Not Working

1. Check trigger executed (look in entry's `info` or `Error_Log` field)
2. Check API logs: `sudo journalctl -u memento-sync-api -n 50`
3. Verify API key in trigger matches: `grep SYNC_API_KEY /opt/memento-sync/sync-api/.env`

### ❌ Data Missing in PostgreSQL

Check sync log for errors:
```bash
psql -h localhost -U smarthome -d memento_mirror -c "
SELECT * FROM memento_sync_log
WHERE success = false
ORDER BY sync_time DESC
LIMIT 10;
"
```

---

## Next Steps After First Library Works

1. ✅ Verify data syncing correctly
2. ✅ Run bulk sync for historical data (see DEPLOYMENT_STATUS.md TODO #3)
3. ✅ Install triggers on 2-3 more libraries
4. ✅ Monitor for a few days
5. ✅ Expand to all libraries gradually

---

## Getting Help

**Full documentation:** See `TRIGGER_INSTALLATION.md` and `DEPLOYMENT_STATUS.md`

**System status:** Check `DEPLOYMENT_STATUS.md` section "Current Status"

**Logs:**
- API: `sudo journalctl -u memento-sync-api -f`
- Listener: `sudo journalctl -u memento-pg-listener -f`

---

**Happy syncing! 🎉**

Your data is now flowing from Memento to PostgreSQL automatically. Query it without rate limits, use it in n8n workflows, analyze it with SQL!
