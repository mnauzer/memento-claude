# Library Script Patterns

## Script Structure Template

Based on Template-Script.js v9.0.0 (915 lines)

### Complete Pattern

```javascript
// 1. MODULE INITIALIZATION
var utils = MementoUtils;
var currentEntry = entry();

// 2. SCRIPT CONFIGURATION
var CONFIG = utils.createScriptConfig({
    scriptName: "Script Name",
    version: "1.0.0",
    library: "Dochádzka"
});

// 3. DEPENDENCY VALIDATION
var depCheck = utils.checkAllDependencies();
if (!depCheck.success) {
    dialog("❌ Chýbajúce moduly",
           "Potrebné: " + depCheck.missing.join(", "),
           "OK");
    cancel();
}

// 4. INPUT VALIDATION
function validateInput() {
    var config = MementoConfig.getConfig();
    var dateField = config.fields.attendance.date;
    var date = utils.safeGet(currentEntry, dateField, null);
    
    if (!date) {
        utils.addError(currentEntry, "Chýba dátum", "validateInput");
        return {success: false, error: "Missing date"};
    }
    
    return {success: true, data: {date: date}};
}

// 5. MAIN LOGIC
function processData(input) {
    try {
        var result = utils.calculations.calculateDailyWage(hours, rate);
        return {success: true, result: result};
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "processData", error);
        return {success: false, error: error.toString()};
    }
}

// 6. EXECUTION
function main() {
    try {
        utils.clearLogs(currentEntry, true);
        
        var validation = validateInput();
        if (!validation.success) {
            dialog("❌ Chyba", validation.error, "OK");
            return false;
        }
        
        var result = processData(validation.data);
        if (!result.success) {
            dialog("❌ Chyba", result.error, "OK");
            return false;
        }
        
        utils.addInfo(currentEntry, "Hotovo", result.result, {
            scriptName: CONFIG.scriptName,
            scriptVersion: CONFIG.version
        });
        
        message("✅ Hotovo");
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "main", error);
        dialog("❌ Chyba", error.toString(), "OK");
        return false;
    }
}

main();
```

## Script Types

### Calculation Script (Calc)
- **Trigger:** Before Save
- **Purpose:** Prepočítať polia
- **Pattern:** Validate → Calculate → Set fields → Log

### Trigger Script
- **Trigger:** Before/After Save/Delete
- **Purpose:** Event handling, cascading updates
- **Pattern:** Get linked entries → Update → Log

### Action Script
- **Trigger:** Button click
- **Purpose:** User-initiated operations
- **Pattern:** Confirm → Execute → Show result

### Notification Script (Notif)
- **Trigger:** After Save
- **Purpose:** Send notifications
- **Pattern:** Build message → Send → Log
