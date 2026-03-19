# Log Capture Pattern - Automatic Log Sharing

## Overview

The Log Capture Pattern enables automatic sharing of Debug_Log and Error_Log content from any Memento Database library to the centralized **ASISTANTO Logs** library. This eliminates manual copy-pasting and allows Claude Code to access logs via MCP tools.

## Problem Statement

### Before Log Capture

**Manual Process:**
1. Script runs and writes to Debug_Log/Error_Log
2. User must screenshot or copy-paste log content
3. User sends logs to Claude Code manually
4. Time-consuming and error-prone

**Pain Points:**
- 📱 Difficult on mobile (long text copy-paste)
- ⏱️ Time-consuming (every debug session)
- 🔄 Repetitive (same process for each error)
- 📋 No history (logs lost after field overwrite)

### After Log Capture

**Automatic Process:**
1. Script runs and writes to Debug_Log/Error_Log
2. **Trigger automatically copies logs to ASISTANTO Logs**
3. Claude Code fetches logs via MCP query
4. Zero manual intervention required

**Benefits:**
- ✅ Works on mobile (no copy-paste needed)
- ⚡ Instant (automatic capture)
- 🤖 Claude can fetch logs autonomously
- 📊 Full history in ASISTANTO Logs library

---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    MEMENTO DATABASE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         ┌──────────────────┐            │
│  │  Dochádzka   │         │ ASISTANTO Logs   │            │
│  │              │         │                  │            │
│  │  Entry:      │ Trigger │  Log Entry:      │            │
│  │  - Debug_Log ├────────>│  - date          │            │
│  │  - Error_Log │  copy   │  - library       │            │
│  │              │         │  - script        │            │
│  └──────────────┘         │  - Debug_Log     │            │
│                           │  - Error_Log     │            │
│                           │  - status        │            │
│                           │  - info          │            │
│                           └────────┬─────────┘            │
│                                    │                       │
└────────────────────────────────────┼───────────────────────┘
                                     │
                                     │ MCP Query
                                     │ (memento_query)
                                     ▼
                           ┌──────────────────┐
                           │   CLAUDE CODE    │
                           │                  │
                           │  - Fetch logs    │
                           │  - Analyze errors│
                           │  - Suggest fixes │
                           └──────────────────┘
```

### Flow Diagram

```
User Action
    │
    ▼
┌──────────────────────┐
│ Edit entry in        │
│ source library       │
│ (e.g., Dochádzka)    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Script runs          │
│ (Calc, Trigger, etc.)│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Script writes to     │
│ Debug_Log, Error_Log │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Entry saved          │
│                      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ AfterSave trigger    │
│ detects logs         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ MementoLogCapture    │
│ .createLogEntry()    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ New entry in         │
│ ASISTANTO Logs       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Claude Code          │
│ fetches via MCP      │
└──────────────────────┘
```

---

## Implementation Guide

### Prerequisites

1. **ASISTANTO Logs Library** - Must exist in Memento Database
2. **MementoLogCapture.js** - Core module loaded globally
3. **MementoConfig.js** - Configuration module (for field names)

### Step 1: Load Core Module

**In Memento Database:**

1. Go to **Nastavenia** (Settings) → **Skripty** (Scripts)
2. Add **Global Script**: MementoLogCapture
3. Copy content from `core/MementoLogCapture.js`
4. Save

**Load Order:**
```
1. MementoConfig.js     (first - configuration)
2. MementoCore.js       (second - logging functions)
3. MementoLogCapture.js (third - log capture)
4. Other modules...
```

### Step 2: Create Trigger Script

**File:** `libraries/{library}/triggers/afterSave-logCapture.js`

**Template:**
```javascript
// ==============================================
// {LIBRARY NAME} - Automatické zachytávanie logov
// ==============================================
// Typ: Trigger
// Udalosť: Aktualizácia záznamu
// Fáza: Po uložení záznamu
// Verzia: 1.0.0
// ==============================================

// Check dependencies
if (typeof MementoLogCapture === 'undefined') {
    return; // Module not loaded - silently skip
}

if (typeof MementoConfig === 'undefined') {
    return; // Config not loaded - silently skip
}

// Get config
var config = MementoConfig.getConfig();
if (!config) {
    return;
}

// Get field names
var debugFieldName = config.fields.common.debugLog;
var errorFieldName = config.fields.common.errorLog;

// Get log content
var debugLog = entry().field(debugFieldName) || "";
var errorLog = entry().field(errorFieldName) || "";

// Skip if no logs to capture
if (debugLog.trim().length === 0 && errorLog.trim().length === 0) {
    return;
}

// Create log entry in ASISTANTO Logs
var logEntry = MementoLogCapture.createLogEntry(
    lib().title,
    "Auto-capture (AfterSave)",
    "1.0.0"
);

if (!logEntry) {
    return; // Failed to create log entry
}

// Copy logs from current entry
logEntry.set("Debug_Log", debugLog);
logEntry.set("Error_Log", errorLog);

// Set status based on errors
var status = errorLog.trim().length > 0 ? "❌ Error" : "✅ Success";
logEntry.set("status", status);

// Add summary info
var infoText = "# Automaticky zachytené logy\n\n";
infoText += "**Zdroj:** " + lib().title + "\n";
infoText += "**Dátum:** " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
infoText += "**Debug Log:** " + (debugLog.trim().length > 0 ? "✅" : "⚪") + "\n";
infoText += "**Error Log:** " + (errorLog.trim().length > 0 ? "❌" : "⚪") + "\n";
logEntry.set("info", infoText);

// Note: No message() - runs silently
```

### Step 3: Enable Trigger in Memento

**In Memento Database:**

1. Go to library (e.g., Dochádzka)
2. **Nastavenia** → **Skripty** → **Triggery**
3. Create new trigger:
   - **Udalosť:** Aktualizácia záznamu
   - **Fáza:** Po uložení záznamu
   - **Script:** Copy content from afterSave-logCapture.js
4. Save and enable trigger

### Step 4: Test Log Capture

**Test Process:**

1. Create/edit entry in source library
2. Trigger calculation that writes to Debug_Log
3. Save entry
4. Check ASISTANTO Logs library for new entry
5. Verify Debug_Log and Error_Log copied correctly

**Expected Result:**
- ✅ New entry in ASISTANTO Logs
- ✅ `library` field = source library name
- ✅ `script` field = "Auto-capture (AfterSave) v1.0.0"
- ✅ `Debug_Log` field = copied content
- ✅ `Error_Log` field = copied content (if any)
- ✅ `status` field = "✅ Success" or "❌ Error"
- ✅ `info` field = formatted summary

### Step 5: Verify Claude Code Access

**Test MCP Query:**

In Claude Code terminal:
```bash
claude mcp memento_query --library "ASISTANTO Logs" --limit 5
```

**Expected Output:**
```json
{
  "entries": [
    {
      "date": "2026-03-19",
      "library": "Dochádzka",
      "script": "Auto-capture (AfterSave) v1.0.0",
      "status": "✅ Success",
      "Debug_Log": "[14:43:01] === Dochadzka v1.0.1 ===\n...",
      "Error_Log": "",
      "info": "# Automaticky zachytené logy\n..."
    }
  ]
}
```

---

## MementoLogCapture.js API Reference

### Function: createLogEntry()

**Purpose:** Create a new log entry in ASISTANTO Logs library

**Signature:**
```javascript
MementoLogCapture.createLogEntry(libraryName, scriptName, scriptVersion)
```

**Parameters:**
- `libraryName` (string) - Source library name (e.g., "Dochádzka")
- `scriptName` (string) - Script name (e.g., "Doch.Calc.Main")
- `scriptVersion` (string) - Script version (e.g., "8.0.0")

**Returns:**
- `Entry` object - Log entry in ASISTANTO Logs
- `null` - If ASISTANTO Logs library not found

**Example:**
```javascript
var logEntry = MementoLogCapture.createLogEntry(
    lib().title,
    "Doch.Calc.Main",
    "8.0.0"
);

if (!logEntry) {
    // ASISTANTO Logs library not found
    return;
}
```

---

### Function: captureLogsToEntry()

**Purpose:** Redirect all logging functions to write to log entry

**Signature:**
```javascript
MementoLogCapture.captureLogsToEntry(logEntry)
```

**Parameters:**
- `logEntry` (Entry) - Log entry to capture logs into

**Side Effects:**
- Overrides `MementoCore.addDebug()`
- Overrides `MementoCore.addError()`
- Overrides `MementoCore.addInfo()`

**Example:**
```javascript
var logEntry = MementoLogCapture.createLogEntry(lib().title, "Script", "1.0");
MementoLogCapture.captureLogsToEntry(logEntry);

// Now all logging goes to logEntry
utils.addDebug(entry(), "This goes to logEntry", "info");
utils.addError(entry(), "Error also captured", "main", null);
```

---

### Function: restoreOriginalLogging()

**Purpose:** Restore original logging functions

**Signature:**
```javascript
MementoLogCapture.restoreOriginalLogging()
```

**Parameters:** None

**Example:**
```javascript
// At end of script
MementoLogCapture.restoreOriginalLogging();

// Now logging goes back to normal (entry fields)
utils.addDebug(entry(), "This goes to entry Debug_Log", "info");
```

---

### Function: finalizeLogEntry()

**Purpose:** Finalize log entry with summary and status

**Signature:**
```javascript
MementoLogCapture.finalizeLogEntry(logEntry, success, summary)
```

**Parameters:**
- `logEntry` (Entry) - Log entry to finalize
- `success` (boolean) - Whether script succeeded
- `summary` (object) - Summary data

**Example:**
```javascript
MementoLogCapture.finalizeLogEntry(logEntry, true, {
    recordsProcessed: 10,
    errors: 0,
    duration: "0.5s"
});
```

---

### Function: appendToField()

**Purpose:** Append text to field without overwriting

**Signature:**
```javascript
MementoLogCapture.appendToField(entry, fieldName, text)
```

**Parameters:**
- `entry` (Entry) - Entry object
- `fieldName` (string) - Field name
- `text` (string) - Text to append

**Example:**
```javascript
MementoLogCapture.appendToField(logEntry, "Debug_Log", "New log line\n");
```

---

## MCP Query Examples

See `utils/mcp-helpers/query-logs.md` for complete query templates.

### Quick Examples

**Latest Error Logs:**
```json
{
  "library": "ASISTANTO Logs",
  "fields": ["date", "library", "script", "Error_Log"],
  "filter": {"status": {"contains": "Error"}},
  "sort": [{"field": "date", "order": "desc"}],
  "limit": 5
}
```

**Logs from Dochádzka:**
```json
{
  "library": "ASISTANTO Logs",
  "fields": ["date", "script", "Debug_Log", "Error_Log"],
  "filter": {"library": {"eq": "Dochádzka"}},
  "sort": [{"field": "date", "order": "desc"}],
  "limit": 10
}
```

---

## Advanced Usage

### Programmatic Log Capture

For scripts that need full control over log capture:

```javascript
// 1. Create log entry
var logEntry = MementoLogCapture.createLogEntry(
    lib().title,
    "MyScript",
    "1.0.0"
);

// 2. Redirect logging
MementoLogCapture.captureLogsToEntry(logEntry);

// 3. Run business logic
try {
    utils.addDebug(entry(), "Starting calculation", "start");

    // ... business logic ...

    utils.addInfo(entry(), "Calculation complete", {
        result: 123.45
    });

} catch (error) {
    utils.addError(entry(), error.toString(), "main", error);
}

// 4. Finalize
MementoLogCapture.finalizeLogEntry(logEntry, true, {
    recordsProcessed: 1,
    errors: 0
});

// 5. Restore
MementoLogCapture.restoreOriginalLogging();
```

### Selective Log Capture

Capture logs only for specific conditions:

```javascript
// Only capture if error occurred
var errorLog = entry().field("Error_Log") || "";
if (errorLog.trim().length > 0) {
    // Capture error log
    var logEntry = MementoLogCapture.createLogEntry(...);
    logEntry.set("Error_Log", errorLog);
    logEntry.set("status", "❌ Error");
}
```

---

## Troubleshooting

### Issue: Logs not captured

**Symptoms:**
- No entries in ASISTANTO Logs
- Trigger seems to run but no log entry created

**Possible Causes:**
1. ASISTANTO Logs library doesn't exist
2. MementoLogCapture.js not loaded
3. Trigger running in wrong phase (must be "Po uložení")
4. Debug_Log and Error_Log both empty

**Solutions:**
1. Create ASISTANTO Logs library if missing
2. Verify MementoLogCapture.js loaded globally
3. Check trigger configuration (Event: Update, Phase: After Save)
4. Verify source script writes to Debug_Log/Error_Log

---

### Issue: Duplicate log entries

**Symptoms:**
- Multiple log entries for single operation
- Same logs captured multiple times

**Possible Causes:**
1. Trigger runs on every save (expected behavior)
2. Script saves entry multiple times
3. Multiple triggers enabled

**Solutions:**
1. This is expected - each save creates log entry
2. Optimize script to save entry only once
3. Check only one afterSave-logCapture trigger enabled

---

### Issue: Logs incomplete or truncated

**Symptoms:**
- Debug_Log field cut off
- Error_Log missing parts

**Possible Causes:**
1. Field size limit in Memento (text fields have limits)
2. Logs too verbose

**Solutions:**
1. Use RICH TEXT field type for Debug_Log/Error_Log (larger limit)
2. Reduce log verbosity in source scripts
3. Implement log rotation/archival

---

### Issue: Claude Code can't fetch logs

**Symptoms:**
- MCP query returns empty
- MCP query fails with error

**Possible Causes:**
1. ASISTANTO Logs library not accessible via MCP
2. Field names incorrect
3. Filter syntax wrong

**Solutions:**
1. Verify library name exact: "ASISTANTO Logs"
2. Check field names match library structure
3. Test with simple query first (no filters)
4. See `utils/mcp-helpers/query-logs.md` for correct syntax

---

## Performance Considerations

### Trigger Overhead

**Impact:**
- AfterSave trigger adds ~50-100ms per save
- Minimal impact for interactive operations
- May accumulate for bulk operations

**Optimization:**
- Skip log capture if logs empty (already implemented)
- Consider disabling for bulk import operations
- Use bulk operations carefully

### Storage Growth

**Impact:**
- Each log entry = ~1-10 KB (depending on log verbosity)
- 100 operations/day = ~1 MB/day
- 30 days = ~30 MB

**Mitigation:**
- Implement periodic cleanup (archive old logs)
- Delete successful logs after X days
- Keep only error logs long-term

---

## Best Practices

### 1. Log Capture Hygiene

**DO:**
- ✅ Keep Debug_Log concise (key steps only)
- ✅ Include timestamps in logs
- ✅ Use structured error messages
- ✅ Clear logs at script start (`utils.clearLogs()`)

**DON'T:**
- ❌ Log every variable value
- ❌ Include sensitive data (passwords, API keys)
- ❌ Log large objects/arrays without limit

### 2. Trigger Configuration

**DO:**
- ✅ Use "Po uložení záznamu" (After Save) phase
- ✅ Run silently (no message() calls)
- ✅ Check dependencies before execution
- ✅ Handle missing ASISTANTO Logs gracefully

**DON'T:**
- ❌ Use "Pred uložením" (Before Save) phase
- ❌ Show messages to user (interrupts workflow)
- ❌ Fail loudly if module missing

### 3. Claude Code Integration

**DO:**
- ✅ Fetch logs before asking user for details
- ✅ Parse error messages for root cause
- ✅ Suggest specific fixes with code
- ✅ Use appropriate query for context

**DON'T:**
- ❌ Always fetch all logs (use filters)
- ❌ Ask user to paste logs manually
- ❌ Show raw log dumps (parse and summarize)

---

## Future Enhancements

### Planned Features

- [ ] **Log Aggregation** - Group logs by library/script
- [ ] **Error Trends** - Detect recurring errors
- [ ] **Auto-Cleanup** - Delete old successful logs
- [ ] **Real-Time Streaming** - Push logs to external service
- [ ] **Log Export** - CSV/JSON export for analysis
- [ ] **Performance Metrics** - Track script execution times
- [ ] **Alert Thresholds** - Notify on error spikes

### Ideas for Consideration

- **Log Levels** - INFO, WARN, ERROR, DEBUG
- **Source Entry Link** - Link back to original entry
- **User Tracking** - Record which user triggered script
- **Log Search** - Full-text search in logs
- **Log Visualization** - Charts/graphs of errors over time

---

## Related Documentation

- **MCP Query Templates:** `utils/mcp-helpers/query-logs.md`
- **Module Source Code:** `core/MementoLogCapture.js`
- **Trigger Scripts:** `libraries/*/triggers/afterSave-logCapture.js`
- **Script Organization:** `docs/LIBRARY_SCRIPT_ORGANIZATION.md`
- **Core Modules:** `docs/CORE_MODULES_DOCUMENTATION.md`

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review MCP query templates
3. Verify module load order
4. Ask Claude Code for help (it can debug logs!)

---

**Version:** 1.0.0
**Last Updated:** 2026-03-19
**Author:** ASISTANTO
**Status:** Production Ready
