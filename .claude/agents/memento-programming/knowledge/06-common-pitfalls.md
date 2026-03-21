---
name: "Common Pitfalls and Solutions"
---

# Common Pitfalls and Solutions

## 1. Entry ID Confusion

### Problem
Confusing Memento Entry ID with custom "ID" field.

### Symptoms
- Foreign key constraints fail
- Junction tables don't work
- Linked entries not found

### Solution
```javascript
// ✓ CORRECT - Use entry.id for foreign keys
var mementoId = entry.id;  // Unique Memento identifier

// ✗ WRONG - Custom ID is for business purposes only
var customId = entry.field("ID");  // Optional company ID

// In PostgreSQL sync:
// - entry.id → table column `id` (primary key)
// - entry.field("ID") → table column `record_number` (display)
```

## 2. TIME Field UTC Conversion

### Problem
TIME fields automatically converted to UTC, causing 1-hour shift.

### Symptoms
- User sees 7:00 in Memento
- PostgreSQL stores 06:00:00
- Reports show wrong times

### Solution
```javascript
// Detect TIME field (year 1970)
if (timeValue && timeValue.getFullYear && timeValue.getFullYear() === 1970) {
    // Extract LOCAL time (NOT UTC!)
    var hours = timeValue.getHours();
    var minutes = timeValue.getMinutes();
    var seconds = timeValue.getSeconds();
    
    var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
    var timeStr = pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}
```

## 3. lib().name vs lib().title

### Problem
Using lib().name which doesn't work reliably.

### Symptoms
- Library name is undefined
- Script fails in Action scope
- Inconsistent behavior

### Solution
```javascript
// ✗ WRONG
var name = lib().name;      // Unreliable
var name = lib().title();   // title is property, not method!

// ✓ CORRECT
var name = lib().title;     // Property access
var id = lib().id;          // Property access
```

## 4. LinkToEntry Array Confusion

### Problem
Treating LinkToEntry as true JavaScript Array.

### Symptoms
- Array.isArray() returns false
- Array methods don't work
- Cannot iterate properly

### Solution
```javascript
var links = entry.field("Zamestnanci");

// ✓ CORRECT - Check for array-like object
if (links && typeof links === 'object' && links.length !== undefined) {
    for (var i = 0; i < links.length; i++) {
        var item = links[i];
        var id = item.id;  // Property, not method!
    }
}
```

## 5. message() for Long Messages

### Problem
Using message() for detailed results or confirmations.

### Symptoms
- Message disappears before user can read
- Only 2 lines visible
- No way to confirm action

### Solution
```javascript
// ✗ WRONG - message() for long text
message("Výsledok:\nHodiny: 8\nMzda: 120€");
// User sees only first 2 lines, disappears in 2 seconds

// ✓ CORRECT - dialog() for details
dialog("Výsledok prepočtu",
       "Hodiny: 8\n" +
       "Mzda: 120€\n" +
       "Celkom: 144€",
       "OK");
// User sees all lines, stays until closed
```

## 6. Hardcoded Field Names

### Problem
Field names hardcoded instead of using MementoConfig.

### Symptoms
- Script breaks when field renamed
- Case sensitivity issues
- Difficult maintenance

### Solution
```javascript
// ✗ WRONG
var date = entry.field("Dátum");

// ✓ CORRECT
var config = MementoConfig.getConfig();
var dateField = config.fields.attendance.date;
var date = utils.safeGet(currentEntry, dateField, null);
```

## 7. Missing Dependency Checks

### Problem
Not validating required modules are loaded.

### Symptoms
- "MementoUtils is not defined"
- Functions not available
- Script fails silently

### Solution
```javascript
// ✓ ALWAYS check dependencies
var depCheck = utils.checkAllDependencies();
if (!depCheck.success) {
    dialog("❌ Chýbajúce moduly",
           "Potrebné: " + depCheck.missing.join(", "),
           "OK");
    cancel();
}
```

## 8. MementoTelegram Circular Dependency

### Problem
Trying to access MementoTelegram via MementoUtils.

### Symptoms
- utils.telegram is undefined
- Notifications don't send
- No error message

### Solution
```javascript
// ✗ WRONG - NOT in Utils (circular dep!)
var telegram = utils.telegram;  // undefined!

// ✓ CORRECT - Import directly
var telegram = typeof MementoTelegram !== 'undefined' ? MementoTelegram : null;

if (telegram) {
    telegram.sendNotificationEntry(entry());
}
```

## 9. Version Mismatch

### Problem
Header version doesn't match CONFIG.version.

### Symptoms
- Confusion about actual version
- Debugging uses wrong version
- Documentation inconsistent

### Solution
```javascript
// ✓ ALWAYS keep versions in sync

// Header
// Verzia: 8.2.0 | Dátum: 2026-03-19

// CONFIG
var CONFIG = {
    scriptName: "Script Name",
    version: "8.2.0",  // Must match header!
};
```

## 10. Not Verifying Library Structure

### Problem
Generating code without checking current field names/types.

### Symptoms
- "Field not found" errors
- Wrong field types
- Code breaks in production

### Solution
```javascript
// ✓ ALWAYS verify BEFORE coding
// Use MCP: memento_get_library_structure
// Or: python memento_api_simple.py --library "Name" --structure
```
