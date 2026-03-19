# Core Modules Reference

## Architecture Overview

### 4-Level Dependency Hierarchy (v8.0+)

```
LEVEL 0: Configuration
┌────────────────────┐
│ MementoConfig 8.0  │ (no dependencies)
└────────────────────┘
          ↓
LEVEL 1: Foundation
┌────────────────────┐
│ MementoCore 8.0    │ (depends on Config)
└────────────────────┘
          ↓
LEVEL 2: Focused Utilities
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ MementoTime  │  │ MementoDate  │  │ Memento-     │
│   v1.1       │  │   v1.0       │  │ Validation   │
└──────────────┘  └──────────────┘  └──────────────┘
          ↓
LEVEL 3: Business Logic
┌────────────────────────────────────────┐
│ MementoBusiness v8.0                   │
└────────────────────────────────────────┘
          ↓
LEVEL 4: Aggregator
┌────────────────────────────────────────┐
│ MementoUtils v8.1 (entry point)       │
└────────────────────────────────────────┘
```

## MementoConfig (v8.0+)

**Purpose:** Single source of truth for all configuration

### Usage

```javascript
var config = MementoConfig.getConfig();

// Library names
config.libraries.attendance        // "Dochádzka"
config.libraries.workRecords       // "Záznam prác"

// Field names
config.fields.attendance.date      // "Dátum"
config.fields.attendance.employee  // "Zamestnanec"

// Icons
config.icons.success               // "✅"
config.icons.error                 // "❌"
```

**CRITICAL:** NEVER hardcode field/library names!

## MementoCore (v8.0+)

**Purpose:** Foundation utilities

### Logging

```javascript
utils.addDebug(entry, "Message", "source");
utils.addError(entry, "Error", "func", errorObj);
utils.addInfo(entry, "Success", {data}, {scriptName, scriptVersion});
utils.clearLogs(entry, true);
```

### Safe Field Access

```javascript
var value = utils.safeGet(entry, fieldName, default);
var links = utils.safeGetLinks(entry, fieldName);
utils.safeSet(entry, fieldName, value);
```

## Access via MementoUtils

```javascript
var utils = MementoUtils;

utils.addDebug(entry, "msg", "src");      // Core
utils.time.roundToQuarterHour(time);      // Time
utils.date.isWeekend(date);               // Date  
utils.formatting.formatMoney(amount);     // Formatting
utils.calculations.calculateDailyWage();  // Calculations
```

## MementoTelegram - SPECIAL CASE

```javascript
// ❌ WRONG - NOT in Utils!
var telegram = utils.telegram;  // undefined!

// ✅ CORRECT - Import directly
var telegram = typeof MementoTelegram !== 'undefined' ? MementoTelegram : null;
```
