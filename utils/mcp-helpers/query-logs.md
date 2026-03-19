# MCP Query Templates - ASISTANTO Logs

This file contains ready-to-use MCP query templates for fetching logs from the ASISTANTO Logs library in Memento Database.

## Purpose

Enable Claude Code to automatically fetch debug and error logs without manual copying. These queries use the `memento_query` MCP tool to retrieve log entries.

## Available Queries

### 1. Latest Logs (Last 10)

Fetch the 10 most recent log entries regardless of library or status.

**Use Case:** Quick check of recent activity

**MCP Query:**
```json
{
  "library": "ASISTANTO Logs",
  "fields": ["date", "library", "script", "status", "Debug_Log", "Error_Log", "info"],
  "sort": [{"field": "date", "order": "desc"}],
  "limit": 10
}
```

**Claude Code Example:**
```
"Show me the last 10 log entries from ASISTANTO Logs"
```

---

### 2. Error Logs Only

Fetch only log entries that contain errors.

**Use Case:** Troubleshooting - focus on failures

**MCP Query:**
```json
{
  "library": "ASISTANTO Logs",
  "fields": ["date", "library", "script", "status", "Error_Log", "Debug_Log"],
  "filter": {
    "status": {"contains": "Error"}
  },
  "sort": [{"field": "date", "order": "desc"}],
  "limit": 20
}
```

**Claude Code Example:**
```
"Show me all error logs from ASISTANTO Logs"
```

**Alternative Filter (if contains doesn't work):**
```json
{
  "filter": {
    "status": {"eq": "❌ Error"}
  }
}
```

---

### 3. Logs for Specific Library

Fetch logs from a specific source library (e.g., Dochádzka).

**Use Case:** Debug issues in specific library

**MCP Query (Dochádzka):**
```json
{
  "library": "ASISTANTO Logs",
  "fields": ["date", "script", "status", "Debug_Log", "Error_Log"],
  "filter": {
    "library": {"eq": "Dochádzka"}
  },
  "sort": [{"field": "date", "order": "desc"}],
  "limit": 10
}
```

**Claude Code Example:**
```
"Show me the latest logs from Dochádzka library"
```

**Other Libraries:**
- Záznam prác
- Kniha jázd
- Cenové ponuky
- Zákazky

---

### 4. Today's Logs

Fetch all logs from today.

**Use Case:** Daily debugging session

**MCP Query:**
```json
{
  "library": "ASISTANTO Logs",
  "fields": ["date", "library", "script", "status", "Error_Log", "Debug_Log"],
  "filter": {
    "date": {"gte": "2026-03-19"}
  },
  "sort": [{"field": "date", "order": "desc"}}
}
```

**Claude Code Example:**
```
"Show me all logs from today"
```

**Note:** Replace `2026-03-19` with current date dynamically.

---

### 5. Logs with Debug Trace

Fetch logs that contain Debug_Log content (not empty).

**Use Case:** View execution traces

**MCP Query:**
```json
{
  "library": "ASISTANTO Logs",
  "fields": ["date", "library", "script", "Debug_Log"],
  "filter": {
    "Debug_Log": {"ne": ""}
  },
  "sort": [{"field": "date", "order": "desc"}],
  "limit": 5
}
```

**Claude Code Example:**
```
"Show me logs with debug traces"
```

---

### 6. Latest Error for Specific Library

Fetch the most recent error from a specific library.

**Use Case:** Quick error check for single library

**MCP Query (Dochádzka):**
```json
{
  "library": "ASISTANTO Logs",
  "fields": ["date", "script", "Error_Log", "Debug_Log", "info"],
  "filter": {
    "library": {"eq": "Dochádzka"},
    "status": {"contains": "Error"}
  },
  "sort": [{"field": "date", "order": "desc"}],
  "limit": 1
}
```

**Claude Code Example:**
```
"Show me the last error from Dochádzka"
```

---

### 7. Success Logs Only

Fetch only successful executions (no errors).

**Use Case:** Verify successful operations

**MCP Query:**
```json
{
  "library": "ASISTANTO Logs",
  "fields": ["date", "library", "script", "info"],
  "filter": {
    "status": {"eq": "✅ Success"}
  },
  "sort": [{"field": "date", "order": "desc"}],
  "limit": 10
}
```

**Claude Code Example:**
```
"Show me successful operations from today"
```

---

### 8. Logs by Script Name

Fetch logs from a specific script (e.g., "Doch.Calc.Main").

**Use Case:** Debug specific script behavior

**MCP Query:**
```json
{
  "library": "ASISTANTO Logs",
  "fields": ["date", "library", "script", "status", "Debug_Log", "Error_Log"],
  "filter": {
    "script": {"contains": "Doch.Calc.Main"}
  },
  "sort": [{"field": "date", "order": "desc"}],
  "limit": 10
}
```

**Claude Code Example:**
```
"Show me logs from Doch.Calc.Main script"
```

---

### 9. Logs from Last Hour

Fetch logs from the last hour (approximate).

**Use Case:** Real-time debugging

**MCP Query:**
```json
{
  "library": "ASISTANTO Logs",
  "fields": ["date", "library", "script", "status", "Error_Log"],
  "filter": {
    "date": {"gte": "2026-03-19T13:00:00"}
  },
  "sort": [{"field": "date", "order": "desc"}}
}
```

**Note:** Calculate timestamp dynamically (current time - 1 hour).

---

### 10. Full Log Details (Single Entry)

Fetch complete details for a single log entry.

**Use Case:** Deep dive into specific error

**MCP Query:**
```json
{
  "library": "ASISTANTO Logs",
  "fields": ["date", "library", "script", "status", "Debug_Log", "Error_Log", "info", "user"],
  "filter": {
    "id": {"eq": "ENTRY_ID_HERE"}
  },
  "limit": 1
}
```

**Claude Code Example:**
```
"Show me full details for log entry XYZ"
```

---

## MCP Tool Usage in Claude Code

### Basic Pattern

When user reports an error:

1. **User:** "Script zlyhal, pozri logy"
2. **Claude:** Uses MCP query to fetch latest error logs
3. **Claude:** Analyzes Error_Log and Debug_Log content
4. **Claude:** Identifies root cause
5. **Claude:** Suggests fix

### Example Workflow

```markdown
User: "Dochádzka prepočet zlyhal"

Claude (internal):
- Use Query #6: Latest Error for Dochádzka
- Fetch Error_Log and Debug_Log
- Parse error message
- Identify root cause (e.g., missing field, null reference)
- Suggest fix

Claude (response):
"Našiel som chybu v prepočte dochádzky:

**Chyba:** TypeError: Cannot read property 'success' from null
**Súbor:** Dochadzka.js:276
**Príčina:** calculateWorkTime() vrátil null namiesto objektu

**Riešenie:** Pridať validáciu pred prístupom k result.success:
```javascript
var result = calculateWorkTime(...);
if (!result) {
    return { success: false, error: "calculateWorkTime failed" };
}
if (!result.success) {
    return result;
}
```
"
```

---

## Filter Operators Reference

Based on Memento Database MCP tools:

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals | `{"status": {"eq": "✅ Success"}}` |
| `ne` | Not equals | `{"Error_Log": {"ne": ""}}` |
| `contains` | Contains substring | `{"script": {"contains": "Calc"}}` |
| `gte` | Greater than or equal | `{"date": {"gte": "2026-03-19"}}` |
| `lte` | Less than or equal | `{"date": {"lte": "2026-03-20"}}` |
| `gt` | Greater than | `{"date": {"gt": "2026-03-19T12:00:00"}}` |
| `lt` | Less than | `{"date": {"lt": "2026-03-19T12:00:00"}}` |

---

## Troubleshooting

### Issue: No logs returned

**Possible causes:**
1. ASISTANTO Logs library doesn't exist
2. No log entries created yet
3. Filter too restrictive
4. Field names incorrect

**Solution:**
- Try Query #1 (Latest Logs) with no filters
- Check ASISTANTO Logs library exists in Memento
- Verify field names match library structure

### Issue: Logs incomplete

**Possible causes:**
1. MementoLogCapture module not loaded in source library
2. Trigger script not enabled
3. Trigger running in wrong phase

**Solution:**
- Verify MementoLogCapture.js loaded in Memento
- Check trigger script enabled for library
- Verify trigger runs "Po uložení záznamu" (After Save)

### Issue: Too many logs

**Possible causes:**
1. Trigger captures every save operation
2. No cleanup/archival process

**Solution:**
- Add limit to queries (e.g., `"limit": 10`)
- Periodically archive old logs
- Filter by date range

---

## Advanced Queries

### Combine Multiple Filters

Fetch errors from Dochádzka today:

```json
{
  "library": "ASISTANTO Logs",
  "fields": ["date", "script", "Error_Log"],
  "filter": {
    "library": {"eq": "Dochádzka"},
    "status": {"contains": "Error"},
    "date": {"gte": "2026-03-19"}
  },
  "sort": [{"field": "date", "order": "desc"}]
}
```

### Count Errors by Library

**Note:** MCP tools may not support aggregation. If available:

```json
{
  "library": "ASISTANTO Logs",
  "aggregate": {
    "groupBy": ["library"],
    "count": true
  },
  "filter": {
    "status": {"contains": "Error"}
  }
}
```

---

## Best Practices

1. **Always use `limit`** - Avoid fetching thousands of entries
2. **Sort by date desc** - Get most recent entries first
3. **Filter by library** - Narrow down to relevant logs
4. **Fetch Debug_Log too** - Not just Error_Log (execution trace helps)
5. **Use specific queries** - Don't always fetch everything

---

## Integration with Claude Code

### Auto-Fetch on Error Keywords

When user mentions:
- "chyba" / "error"
- "zlyhal" / "failed"
- "nefunguje" / "not working"
- "problem"

Claude should **automatically** fetch latest error logs before asking questions.

### Proactive Analysis

Claude can:
1. Fetch logs
2. Parse error messages
3. Identify root cause
4. Suggest fix
5. Provide code snippet

All **without user having to copy-paste logs manually**.

---

## Future Enhancements

- [ ] Auto-cleanup old logs (>30 days)
- [ ] Log aggregation by library
- [ ] Error trend analysis
- [ ] Link log entries to source records
- [ ] Export logs to CSV
- [ ] Real-time log streaming

---

## Related Documentation

- `docs/LOG_CAPTURE_PATTERN.md` - Implementation guide
- `core/MementoLogCapture.js` - Module source code
- `libraries/*/triggers/afterSave-logCapture.js` - Trigger scripts
- Memento MCP Tools Documentation - Field filters and operators

---

**Last Updated:** 2026-03-19
**Version:** 1.0.0
**Author:** ASISTANTO
