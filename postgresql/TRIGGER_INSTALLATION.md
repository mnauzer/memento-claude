# Memento Trigger Installation Guide

## Overview

This guide shows how to install JavaScript trigger scripts in Memento Database to enable automatic syncing to PostgreSQL.

**Current Status:** Memento → PostgreSQL sync is FULLY WORKING. Install these triggers to start syncing data automatically.

---

## Prerequisites

✅ Phase 1 & 2 deployed on reddwarf
✅ Services running: `memento-sync-api` and `memento-pg-listener`
✅ API accessible at: `http://192.168.5.241:8889`

---

## Installation Steps

### 1. Open Memento Database App

On your mobile device, open the library you want to sync (e.g., "Záznam prác").

### 2. Access Triggers

1. Tap the **library menu** (three dots)
2. Select **"Triggers"**
3. Tap **"+"** to create new trigger

### 3. Create AfterSave Trigger

**Trigger Configuration:**
- **Name**: `SyncToPostgreSQL`
- **Event**: `After Save`
- **Action**: `Run Script`

**Script**: Copy the template below (see next section)

### 4. Configure API Endpoint

In the script, you need to set the correct library ID. Get it from this table:

| Library Name | Library ID | Status |
|--------------|------------|--------|
| Záznam prác | ArdaPo5TU | ✅ Registered |
| Dochádzka | qU4Br5hU6 | ✅ Registered |
| Denný report | Tt4pxN4xQ | ✅ Registered |
| Zákazky | CfRHN7QTG | ✅ Registered |
| Cenové ponuky | 90RmdjWuk | ✅ Registered |
| Cenové ponuky Diely | nCAgQkfvK | ✅ Registered |
| Zákazky Diely | iEUC79O2T | ✅ Registered |
| Zamestnanci | nWb00Nogf | ✅ Registered |
| Dodávatelia | 3FSQN0reH | ✅ Registered |
| Partneri | NffZSLRKU | ✅ Registered |
| Klienti | rh7YHaVRM | ✅ Registered |
| Výkaz materiálu | z3sxkUHgT | ✅ Registered |
| Výkaz strojov | uCRaUwsTo | ✅ Registered |
| sadzby zamestnancov | CqXNnosKP | ✅ Registered |

**Note:** 22 library IDs are still missing. For those libraries, you'll need to find the ID first.

### 5. Test the Trigger

1. Save a test entry in the library
2. Check PostgreSQL to verify sync:
   ```bash
   ssh rasto@reddwarf
   psql -h localhost -U smarthome -d memento_mirror -c "SELECT * FROM memento_sync_log ORDER BY sync_time DESC LIMIT 5;"
   ```
3. Check for your entry in the corresponding table

---

## Trigger Script Template

Copy this entire script into the Memento trigger editor. Replace `YOUR_LIBRARY_ID` with the actual library ID from the table above.

```javascript
/**
 * Memento → PostgreSQL Sync Trigger
 *
 * Library: [Your Library Name]
 * Library ID: [Your Library ID]
 * Version: 1.0
 *
 * This script syncs entry data to PostgreSQL after every save.
 */

(function() {
    'use strict';

    // ======================================
    // CONFIGURATION
    // ======================================
    var config = {
        apiUrl: 'http://192.168.5.241:8889',
        apiKey: '7d8f9e3a-2b4c-4e1f-9a8b-3c5d6e7f8a9b',  // From reddwarf:/opt/memento-sync/sync-api/.env
        libraryId: 'YOUR_LIBRARY_ID',  // ⚠️ REPLACE THIS WITH YOUR LIBRARY ID
        timeout: 10000
    };

    // ======================================
    // EXTRACT ENTRY DATA
    // ======================================
    function extractEntryData() {
        try {
            var entryData = {
                id: entry().id(),
                status: entry().status(),
                createdTime: entry().createdTime(),
                modifiedTime: entry().modifiedTime(),
                createdBy: entry().createdBy() ? entry().createdBy().name() : null,
                modifiedBy: entry().modifiedBy() ? entry().modifiedBy().name() : null,
                fields: {}
            };

            // Extract all fields
            var fields = lib().fields();
            for (var i = 0; i < fields.length; i++) {
                var field = fields[i];
                var fieldName = field.name();
                var fieldType = field.type();
                var fieldValue = entry().field(fieldName);

                // Skip system fields
                if (fieldName === 'Debug_Log' || fieldName === 'Error_Log' ||
                    fieldName === 'info' || fieldName === 'Sync_Status') {
                    continue;
                }

                // Handle different field types
                if (fieldValue === null || fieldValue === undefined) {
                    entryData.fields[fieldName] = null;
                } else if (fieldType === 'entries') {
                    // Link to entry - extract IDs
                    var linkedIds = [];
                    if (Array.isArray(fieldValue)) {
                        for (var j = 0; j < fieldValue.length; j++) {
                            if (fieldValue[j] && fieldValue[j].id) {
                                linkedIds.push(fieldValue[j].id());
                            }
                        }
                    } else if (fieldValue.id) {
                        linkedIds.push(fieldValue.id());
                    }
                    entryData.fields[fieldName] = linkedIds;
                } else if (fieldType === 'date') {
                    // Date field
                    entryData.fields[fieldName] = fieldValue ? fieldValue.toString() : null;
                } else if (fieldType === 'time') {
                    // Time field
                    entryData.fields[fieldName] = fieldValue ? fieldValue.toString() : null;
                } else if (fieldType === 'datetime') {
                    // Datetime field
                    entryData.fields[fieldName] = fieldValue ? fieldValue.toISOString() : null;
                } else if (fieldType === 'files') {
                    // File field - extract URLs
                    var fileUrls = [];
                    if (Array.isArray(fieldValue)) {
                        for (var k = 0; k < fieldValue.length; k++) {
                            if (fieldValue[k] && fieldValue[k].url) {
                                fileUrls.push(fieldValue[k].url());
                            }
                        }
                    }
                    entryData.fields[fieldName] = fileUrls;
                } else {
                    // Simple field types (text, number, checkbox, etc.)
                    entryData.fields[fieldName] = fieldValue;
                }
            }

            return entryData;

        } catch (e) {
            return {
                error: 'Failed to extract entry data: ' + e.message
            };
        }
    }

    // ======================================
    // SYNC TO POSTGRESQL
    // ======================================
    function syncToPostgreSQL() {
        try {
            // Extract entry data
            var entryData = extractEntryData();
            if (entryData.error) {
                addError(entryData.error);
                return;
            }

            // Build API URL
            var url = config.apiUrl + '/api/memento/from-memento/' + config.libraryId;

            // Make HTTP POST request
            var response = http.post({
                url: url,
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': config.apiKey
                },
                body: JSON.stringify(entryData),
                timeout: config.timeout
            });

            // Check response
            if (response && (response.status === 200 || response.status === 201)) {
                addSuccess('✅ Synced to PostgreSQL');
            } else {
                var errorMsg = 'Sync failed: HTTP ' + (response ? response.status : 'no response');
                if (response && response.body) {
                    errorMsg += ' - ' + response.body;
                }
                addError(errorMsg);
            }

        } catch (e) {
            addError('Sync error: ' + e.message);
        }
    }

    // ======================================
    // LOGGING HELPERS
    // ======================================
    function addSuccess(msg) {
        try {
            var info = entry().field('info') || '';
            var timestamp = new Date().toISOString();
            var newInfo = '[' + timestamp + '] ' + msg + '\n' + info;
            entry().set('info', newInfo.substring(0, 5000));  // Limit size
        } catch (e) {
            // Silent fail if info field doesn't exist
        }
    }

    function addError(msg) {
        try {
            var errorLog = entry().field('Error_Log') || '';
            var timestamp = new Date().toISOString();
            var newError = '[' + timestamp + '] ❌ ' + msg + '\n' + errorLog;
            entry().set('Error_Log', newError.substring(0, 10000));  // Limit size
        } catch (e) {
            // Fallback to message if Error_Log doesn't exist
            message(msg);
        }
    }

    // ======================================
    // EXECUTE
    // ======================================
    syncToPostgreSQL();

})();
```

---

## Finding Missing Library IDs

If your library is not in the registered list above, you need to find its ID:

### Method 1: Using Memento Script

Create a temporary button script in the library:

```javascript
// Show Library ID
var libId = lib().id();
message('Library ID: ' + libId);
```

Copy the ID and add it to the trigger template.

### Method 2: Using Python API

On your Windows machine:

```bash
cd X:\claude\projects\memento-claude\python-utilities
python memento_api_simple.py list-libraries
```

Find your library in the output and note its ID.

---

## Verification Steps

After installing the trigger:

### 1. Check Sync API Logs

```bash
ssh rasto@reddwarf
sudo journalctl -u memento-sync-api -f
```

You should see incoming POST requests when you save entries.

### 2. Check Sync Log Table

```bash
psql -h localhost -U smarthome -d memento_mirror -c "
SELECT
    library_name,
    entry_id,
    sync_direction,
    sync_time,
    success,
    error_message
FROM memento_sync_log
ORDER BY sync_time DESC
LIMIT 10;
"
```

### 3. Check Data Table

Find your library's table name from the mapping and check:

```bash
# Example for Work Records (Záznam prác)
psql -h localhost -U smarthome -d memento_mirror -c "
SELECT id, status, synced_at, sync_source
FROM memento_work_records
ORDER BY synced_at DESC
LIMIT 5;
"
```

### 4. Check Stats Endpoint

```bash
curl -H "X-API-Key: 7d8f9e3a-2b4c-4e1f-9a8b-3c5d6e7f8a9b" \
  http://192.168.5.241:8889/api/memento/stats | jq
```

Should show increasing entry counts as you sync data.

---

## Troubleshooting

### ❌ Trigger Script Error: "http is not defined"

**Cause:** Memento's `http` object may not be available in all contexts.

**Solution:** Use Memento's `$http` global instead:
```javascript
var response = $http.post({ ... });
```

### ❌ No Response from API

**Cause:** Network connectivity issue or API not running.

**Check:**
1. Can you access `http://192.168.5.241:8889/api/memento/health` from your device?
2. Is sync API service running? `sudo systemctl status memento-sync-api`

### ❌ Sync Failed: HTTP 401

**Cause:** Incorrect API key.

**Solution:** Get the correct key from reddwarf:
```bash
ssh rasto@reddwarf
grep SYNC_API_KEY /opt/memento-sync/sync-api/.env
```

Update the `apiKey` in your trigger script.

### ❌ Sync Failed: HTTP 500

**Cause:** Server error (field mapping issue, database error, etc.)

**Debug:**
```bash
# Check detailed error logs
sudo journalctl -u memento-sync-api -n 50
```

Look for Python traceback showing the exact error.

### ❌ Data Not Appearing in PostgreSQL

**Check:**
1. Was the trigger actually executed? Look for success/error message in entry's `info` or `Error_Log` field
2. Check sync_log table for the entry
3. Verify table name mapping is correct
4. Check API logs for processing errors

---

## Recommended Installation Order

Start with these libraries (most commonly used, already have IDs):

1. **Záznam prác** (ArdaPo5TU) - Work Records
2. **Dochádzka** (qU4Br5hU6) - Attendance
3. **Denný report** (Tt4pxN4xQ) - Daily Report
4. **Zákazky** (CfRHN7QTG) - Orders
5. **Zamestnanci** (nWb00Nogf) - Employees

Then expand to others as needed.

---

## Next Steps

After successful installation:

1. **Monitor for a few days** - Check sync_log for any errors
2. **Install bulk sync** - Sync historical data for libraries with triggers installed
3. **Complete PG → Memento** - Work on the reverse direction (ongoing)
4. **Find remaining IDs** - Identify the 22 missing library IDs
5. **Install more triggers** - Expand to all 36 libraries gradually

---

## Quick Reference

```bash
# View sync activity (real-time)
sudo journalctl -u memento-sync-api -f

# Check recent syncs
psql -h localhost -U smarthome -d memento_mirror -c \
  "SELECT * FROM memento_sync_log ORDER BY sync_time DESC LIMIT 10;"

# Check stats
curl -H "X-API-Key: 7d8f9e3a-2b4c-4e1f-9a8b-3c5d6e7f8a9b" \
  http://192.168.5.241:8889/api/memento/stats | jq

# Restart services if needed
sudo systemctl restart memento-sync-api
sudo systemctl restart memento-pg-listener
```

---

**Ready to start syncing! 🚀**

Install the trigger in your first library and save a test entry. Within seconds, you should see it in PostgreSQL.
