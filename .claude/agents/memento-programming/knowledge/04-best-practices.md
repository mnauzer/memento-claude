# Memento Database Best Practices

## 1. Naming Convention

### Script Files
```
Pattern: [Library].[Type].[Name].js

Examples:
✅ Doch.Calc.Main.js
✅ Knij.Action.SetStartEnd.js
✅ Pokl.Notif.Individual.js

❌ Doch.v2.js              (version in filename)
❌ dochadzka_calc.js       (lowercase, underscore)
❌ Main.js                 (no library prefix)
```

### Library Abbreviations

| Library | Abbr | Example |
|---------|------|---------|
| Dochádzka | Doch | Doch.Calc.Main.js |
| Záznam prác | Zazp | Zazp.Calc.Main.js |
| Kniha jázd | Knij | Knij.Calc.Main.js |
| Pokladňa | Pokl | Pokl.Calc.VAT.js |
| Materiál | Mat | Mat.Calc.Receipts.js |
| Cenové ponuky | CenPon | CenPon.Calculate.js |
| Zákazky | Zak | Zak.Calc.Main.js |

## 2. Field Access Safety

### NEVER Hardcode Field Names

```javascript
// ❌ BAD - Hardcoded
var date = entry.field("Dátum");
var employees = entry.field("Zamestnanci");

// ✅ GOOD - Use MementoConfig
var config = MementoConfig.getConfig();
var dateField = config.fields.attendance.date;
var empField = config.fields.attendance.employees;

var date = entry.field(dateField);
var employees = entry.field(empField);

// ✅ BETTER - Use safe accessors
var date = utils.safeGet(currentEntry, dateField, null);
var employees = utils.safeGetLinks(currentEntry, empField);
```

## 3. Dependency Chain Rules

### Load Order

```
1. MementoConfig.js      (foundation)
2. MementoCore.js        (depends on Config)
3. Focused Utilities     (depend on Core)
4. MementoBusiness.js    (depends on utilities)
5. MementoUtils.js       (aggregates all above)
6. Library scripts       (depend on Utils)
```

### Special Case: MementoTelegram

```javascript
// ❌ WRONG - NOT in Utils (circular dep!)
var telegram = utils.telegram;  // undefined!

// ✅ CORRECT - Import directly
var telegram = typeof MementoTelegram !== 'undefined' ? MementoTelegram : null;

if (telegram) {
    telegram.sendNotificationEntry(entry());
}
```

## 4. Logging Standards

```javascript
// DEBUG_LOG - Technical execution trace
utils.addDebug(currentEntry, "Starting calculation", "start");

// ERROR_LOG - Exceptions and failures
try {
    // ...
} catch (error) {
    utils.addError(currentEntry, "Calculation failed", "calculateWage", error);
}

// INFO - User-visible results
utils.addInfo(currentEntry, "Výpočet dokončený",
    {hours: 8, wage: 120},
    {scriptName: "Attendance Calculator", scriptVersion: "8.2.0"}
);

// Clear old logs at start
utils.clearLogs(currentEntry, true);
```

## 5. Error Handling Pattern

```javascript
function processData() {
    try {
        utils.addDebug(currentEntry, "Processing started", "start");
        
        if (!input.isValid) {
            throw new Error("Invalid input");
        }
        
        var result = complexOperation();
        
        utils.addDebug(currentEntry, "Processing complete", "success");
        return {success: true, data: result};
        
    } catch (error) {
        utils.addError(currentEntry, "Processing failed", "processData", error);
        return {success: false, error: error.toString()};
    }
}
```

## 6. User Communication

```javascript
// ✅ message() - For SHORT notifications
message("✅ Uložené");

// ❌ DON'T use message() for:
// - Long messages (>2 lines)
// - Detailed results
// - Lists
// - Confirmations

// ✅ dialog() - For LONG messages
dialog("Výsledok prepočtu",
       "Odpracované hodiny: 8.5h\n" +
       "Hodinová sadzba: 12 €/h\n" +
       "Mzda: 102 €",
       "OK");
```

## 7. Version Management

### Semantic Versioning

```
MAJOR.MINOR.PATCH

1.2.3 → 1.2.4  (PATCH - bug fix)
1.2.3 → 1.3.0  (MINOR - new feature)
1.2.3 → 2.0.0  (MAJOR - breaking change)
```

### Where to Update

```javascript
// 1. Script header
// Verzia: 1.2.3 | Dátum: 2026-03-19

// 2. CONFIG object
var CONFIG = {
    scriptName: "Script Name",
    version: "1.2.3",  // ← MUST MATCH HEADER
};
```

## 8. CRITICAL FIXES

### TIME Field Timezone Fix

```javascript
// Extract LOCAL time (NOT UTC!)
if (timeField && timeField.getFullYear && timeField.getFullYear() === 1970) {
    var hours = timeField.getHours();
    var minutes = timeField.getMinutes();
    var seconds = timeField.getSeconds();
    
    var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
    var timeStr = pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}
```

### Library Info Access

```javascript
// ❌ WRONG
var name = lib().name;         // Not reliable!
var name = lib().title();      // title is property, not method!

// ✅ CORRECT
var name = lib().title;        // Property access
var id = lib().id;             // Property access
```

### Entry ID vs Custom ID

```javascript
// entry.id - Memento Entry ID (unique, long string)
var mementoId = entry.id;           // For FK, junction tables

// "ID" field - Custom company ID (optional, numeric)
var companyId = entry.field("ID");  // For display, business use
```

### LinkToEntry Iteration

```javascript
var links = entry.field("Zamestnanci");

// ❌ WRONG - Not a true Array
if (Array.isArray(links)) { }  // Returns false

// ✅ CORRECT - Array-like object
if (links && typeof links === 'object' && links.length !== undefined) {
    for (var i = 0; i < links.length; i++) {
        var item = links[i];
        var id = item.id;  // Property, not method!
    }
}
```
