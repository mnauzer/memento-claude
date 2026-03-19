# MementoUtils - Module Aggregation Guide

**Version:** 8.1.0
**Last Updated:** 2026-03-19
**Phase 4:** Complete MementoUtils Aggregator Documentation

---

## Overview

**MementoUtils** is the universal aggregator that provides a single import point for all Memento core modules. It uses lazy loading for optimal performance and provides comprehensive dependency checking.

```javascript
// Single import for all modules
var utils = MementoUtils;

// Access any aggregated module
utils.time.roundToQuarterHour(time, "nearest");
utils.formatting.formatMoney(1250);
utils.calculations.calculateDailyWage(8.5, 12);
```

---

## What's Aggregated in MementoUtils

### Core Foundation (ALWAYS REQUIRED)

| Module | Version | Access | Purpose |
|--------|---------|--------|---------|
| **MementoConfig** | v7.1+ | `utils.config` | Central configuration (libraries, fields, icons) |
| **MementoCore** | v7.6+ | `utils.core` OR direct functions | Logging, field access, validation, formatting |

**Example:**
```javascript
var config = utils.config;  // Get full config object
var debugField = config.fields.common.debugLog;

utils.addDebug(entry, "Hello!");  // Direct core function
// OR
utils.core.addDebug(entry, "Hello!");  // Via module
```

---

### Business Logic

| Module | Version | Access | Purpose |
|--------|---------|--------|---------|
| **MementoBusiness** | v8.0+ | `utils.business` | High-level workflows (employee processing, reports, obligations) |

**Example:**
```javascript
var result = utils.business.processEmployees(employees, workHours, date);
var obligation = utils.business.createObligation(date, data, creditor);
```

---

### Focused Utility Modules (NEW in v8.0)

| Module | Version | Access | Purpose |
|--------|---------|--------|---------|
| **MementoTime** | v1.1+ | `utils.time` | Time rounding, calculations, conversions |
| **MementoDate** | v1.0+ | `utils.date` | Slovak calendar, holidays, workdays, week numbers |
| **MementoValidation** | v1.0+ | `utils.validation` | Field validation, type checking, business rules |
| **MementoFormatting** | v1.0+ | `utils.formatting` | Money, numbers, duration, phone, markdown |
| **MementoCalculations** | v1.0+ | `utils.calculations` | Wages, overtime, break time, VAT, profitability |

**Examples:**
```javascript
// Time utilities
var rounded = utils.time.roundToQuarterHour(time, "nearest");
var hours = utils.time.calculateHoursDifference(start, end);

// Date utilities
var isWeekend = utils.date.isWeekend(today);
var isHoliday = utils.date.isHoliday(date);
var workdays = utils.date.getWorkdaysInMonth(2026, 3);

// Validation
var result = utils.validation.validateTime(timeValue);
var check = utils.validation.validateRequired(entry, ["Dátum", "Suma"]);

// Formatting
var money = utils.formatting.formatMoney(1250.50);  // "1 250,50 €"
var duration = utils.formatting.formatDuration(8.5);  // "8:30"
var empName = utils.formatting.formatEmployeeName(employee);

// Calculations
var wage = utils.calculations.calculateDailyWage(8.5, 12);
var vat = utils.calculations.calculateVAT(1000, 0.20);
var overtime = utils.calculations.calculateOvertime(10, 8);
```

---

### Specialized Modules

| Module | Version | Access | Purpose |
|--------|---------|--------|---------|
| **MementoAI** | v7.1+ | `utils.ai` | OpenAI GPT-4, Claude API, image analysis |
| **MementoGPS** | v1.1+ | `utils.gps` | GPS routing, OSRM API, distance calculations |
| **MementoRecordTracking** | v1.1+ | `utils.recordTracking` | Record lifecycle tracking |
| **MementoIDConflictResolver** | v1.1+ | `utils.idConflictResolver` | ID conflict resolution (team version) |

**Examples:**
```javascript
// AI
var aiResult = utils.ai.callAI("OPENAI", "What is the weather?", options);
var imageAnalysis = utils.ai.analyzeImage(imageUrl, "What's in this image?");

// GPS
var route = utils.gps.getRoute(startCoords, endCoords, "car");

// Record tracking
utils.recordTracking.trackRecordCreation(entry, "employee");
utils.recordTracking.setEditMode(entry, true);

// ID conflicts
var resolved = utils.idConflictResolver.checkAndResolveIDConflict(entry, "ID");
```

---

## What's NOT Aggregated (Import Separately)

### MementoTelegram (CIRCULAR DEPENDENCY)

**❌ NOT in MementoUtils**

**Why:** MementoTelegram depends on MementoCore, and aggregating it in MementoUtils would create a circular dependency (MementoUtils → MementoTelegram → MementoCore → MementoUtils).

**How to use:**
```javascript
// WRONG - will not work
var telegram = utils.telegram;  // undefined!

// CORRECT - import directly
var telegram = typeof MementoTelegram !== 'undefined' ? MementoTelegram : null;

if (telegram) {
    telegram.sendMessage(chatId, message);
} else {
    utils.addDebug(entry, "Telegram not available", "warning");
}
```

**Version:** v8.2+

---

### MementoSync (SPECIALIZED)

**❌ NOT in MementoUtils**

**Why:** MementoSync is a specialized module for PostgreSQL synchronization. It's rarely used in regular scripts and should be imported on demand.

**How to use:**
```javascript
var sync = typeof MementoSync !== 'undefined' ? MementoSync : null;

if (sync) {
    sync.syncToPostgres(entry, config);
}
```

**Version:** v1.1+

---

### Deprecated Modules

These modules are deprecated and functionality moved elsewhere:

| Module | Status | Use Instead |
|--------|--------|-------------|
| **MementoVAT** | ⚠️ Deprecated | `utils.calculations.calculateVAT()` |
| **MementoAutoNumber** | ⚠️ Deprecated | `utils.business.generateNextNumber()` |

---

## Dependency Checking

### Check All Dependencies

```javascript
// Check all module dependencies and versions
var check = utils.checkAllDependencies();

if (!check.success) {
    var errorMsg = "Chýbajúce moduly:\n";
    for (var i = 0; i < check.missing.length; i++) {
        errorMsg += "- " + check.missing[i] + "\n";
    }
    dialog("Chyba", errorMsg, "OK");
    cancel();
}
```

**Returns:**
```javascript
{
    success: true/false,
    missing: ["MementoCore v7.6+ (have 7.5.0)"],
    outdated: ["MementoTime v1.1+ (have 1.0.0)"],
    available: ["MementoConfig v7.1.0", "MementoCore v7.6.0", ...]
}
```

### Check Specific Modules

```javascript
// Check if specific modules are loaded
var check = utils.checkDependencies(["config", "core", "time"]);

if (!check.success) {
    dialog("Chyba", "Chýbajúce moduly: " + check.missing.join(", "), "OK");
    cancel();
}
```

### Debug Module Status

```javascript
// Simple status check
utils.debugModules(entry);

// Detailed version check
utils.debugModules(entry, true);
```

---

## Migration Guide: v7 → v8

### Breaking Changes

**MementoBusiness v7 → v8:**
- Utility functions extracted to focused modules
- Use new modules directly for calculations, formatting, validation

### Old Code (v7)

```javascript
// OLD - functions directly on utils or business
utils.formatMoney(1250);
utils.calculateWorkHours(start, end);
utils.isWeekend(date);
MementoBusiness.formatEmployeeName(employee);
MementoBusiness.calculateDailyWage(employee, 8.5, date);
```

### New Code (v8) - PREFERRED

```javascript
// NEW - via focused modules
utils.formatting.formatMoney(1250);
utils.calculations.calculateWorkHours(start, end);
utils.date.isWeekend(date);
utils.formatting.formatEmployeeName(employee);
utils.calculations.calculateDailyWage(8.5, 12);  // Note: different signature!
```

### Backward Compatibility

**Most old functions still work** via facade functions in MementoUtils, but are **deprecated**. Update your code to use the new modules for:
- Better organization
- Clearer dependencies
- Easier maintenance
- Future compatibility

---

## Usage Examples

### Complete Script Pattern

```javascript
'use strict';

// STEP 1: Import MementoUtils (single import point)
var utils = MementoUtils;
if (!utils) {
    message("❌ MementoUtils nie je načítaný!");
    cancel();
}

var currentEntry = entry();

// STEP 2: Check dependencies
var depCheck = utils.checkDependencies(["config", "core", "time", "calculations"]);
if (!depCheck.success) {
    dialog("Chyba", "Chýbajúce moduly: " + depCheck.missing.join(", "), "OK");
    cancel();
}

// STEP 3: Get configuration
var config = utils.config;

// STEP 4: Use focused modules
try {
    // Time operations
    var startTime = utils.safeGet(currentEntry, "Príchod");
    var endTime = utils.safeGet(currentEntry, "Odchod");
    var rounded = utils.time.roundToQuarterHour(startTime, "nearest");

    // Calculations
    var workHours = utils.calculations.calculateWorkHours(startTime, endTime);
    var wage = utils.calculations.calculateDailyWage(workHours.hours, 12);

    // Formatting
    var wageStr = utils.formatting.formatMoney(wage.wage);
    var hoursStr = utils.formatting.formatDuration(workHours.hours);

    // Logging
    utils.addDebug(currentEntry, "Hodiny: " + hoursStr + ", Mzda: " + wageStr);

} catch (error) {
    utils.addError(currentEntry, "Chyba: " + error.toString(), "main", error);
    cancel();
}
```

### Using Telegram (Not Aggregated)

```javascript
'use strict';

var utils = MementoUtils;
var currentEntry = entry();

// Import Telegram separately
var telegram = typeof MementoTelegram !== 'undefined' ? MementoTelegram : null;

if (!telegram) {
    utils.addDebug(currentEntry, "⚠️ Telegram not available", "warning");
    // Continue without Telegram
} else {
    // Create notification
    var message = "✅ Záznam spracovaný\n\nHodiny: 8.5h\nMzda: 102 €";
    var notif = telegram.createTelegramMessage(currentEntry, message);

    if (notif.success) {
        telegram.sendNotificationEntry(notif.notification);
        utils.addDebug(currentEntry, "✅ Telegram notifikácia odoslaná");
    }
}
```

---

## Module Load Order

**Recommended load order in Memento Database:**

1. **Core Foundation (REQUIRED FIRST):**
   - MementoConfig
   - MementoCore

2. **Focused Utilities:**
   - MementoTime
   - MementoDate
   - MementoValidation
   - MementoFormatting
   - MementoCalculations

3. **Business Logic:**
   - MementoBusiness

4. **Specialized Modules:**
   - MementoAI
   - MementoGPS
   - MementoRecordTracking
   - MementoIDConflictResolver

5. **Aggregator:**
   - MementoUtils

6. **Separate (Circular Dependency):**
   - MementoTelegram

7. **On Demand:**
   - MementoSync

---

## Troubleshooting

### Error: "Module not loaded"

**Problem:** Module getter returns null with error message.

**Solution:**
1. Check module is loaded in Memento Database (Settings → Scripts)
2. Verify module is loaded BEFORE MementoUtils
3. Check module version is compatible

**Example:**
```javascript
if (!utils.time) {
    dialog("Chyba", "MementoTime nie je načítaný! Načítaj core/MementoTime.js (v1.1.0+)", "OK");
    cancel();
}
```

### Error: "Circular dependency"

**Problem:** Trying to use `utils.telegram`.

**Solution:** Import MementoTelegram directly (see examples above).

### Error: "Outdated version"

**Problem:** Module version is too old.

**Solution:**
1. Run `utils.checkAllDependencies()` to see which modules are outdated
2. Update modules to required versions
3. Reload Memento Database

---

## Summary

**MementoUtils v8.1.0** provides:
- ✅ Single import point for 12 core modules
- ✅ Lazy loading for optimal performance
- ✅ Comprehensive dependency checking
- ✅ Helpful error messages
- ✅ Backward compatible facade
- ✅ Clear documentation

**What's aggregated:**
- Config, Core, Business, Time, Date, Validation, Formatting, Calculations, AI, GPS, RecordTracking, IDConflictResolver

**What's NOT aggregated:**
- Telegram (circular dependency), Sync (specialized), VAT (deprecated), AutoNumber (deprecated)

**Always check dependencies:**
```javascript
var check = utils.checkAllDependencies();
if (!check.success) {
    // Handle missing/outdated modules
}
```

---

**For more information:**
- See `CORE_MODULES_DOCUMENTATION.md` for complete API reference
- See `CORE_MODULES_QUICK_REFERENCE.md` for quick lookup
- See main `CLAUDE.md` for project overview
