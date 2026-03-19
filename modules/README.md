# Library-Specific Modules

This directory contains **library-specific reusable modules** for Memento Database applications. These modules extract common business logic from monolithic scripts into maintainable, reusable components.

---

## 📁 Directory Purpose

**Problem Solved:** Eliminates massive code duplication across library scripts (30-50% reduction in codebase size).

**Before:**
- ❌ 1,113 line PayObligations script with duplicated logic
- ❌ Same VAT calculation copied into 3+ libraries
- ❌ Time rounding duplicated 5+ times
- ❌ Daily report updates duplicated in 4 libraries

**After:**
- ✅ Thin wrapper scripts (50-200 lines)
- ✅ Shared modules loaded once, used everywhere
- ✅ Single source of truth for business logic
- ✅ Git-synchronized, version-controlled modules

---

## 🗂️ Directory Structure Comparison

### `core/` - Universal Modules (Cross-Library)
**Location:** `core/`
**Scope:** Work across ALL libraries
**Examples:** MementoCore, MementoUtils, MementoVAT, MementoTime

```javascript
// Universal - works in ANY library
var result = MementoVAT.calculateVAT(entry(), config);
var rounded = MementoTime.roundToQuarterHour(time, "nearest");
```

### `modules/` - Library-Specific Modules (THIS DIRECTORY)
**Location:** `modules/`
**Scope:** Specific to ONE library's business logic
**Examples:** Pokladna.js, Dochadzka.js, CenovePonuky.js

```javascript
// Library-specific - only works in Pokladňa library
var result = Pokladna.payObligations(entry(), {amount: 1000});

// Library-specific - only works in Dochádzka library
var result = Dochadzka.calculateAttendance(entry(), config);
```

### `libraries/{library}/*.Module.js` - Legacy Modules
**Location:** `libraries/dochadzka/`, `libraries/cenove-ponuky/`, etc.
**Status:** Legacy format (being replaced)
**Migration Path:** Will be refactored into `modules/*.js` format

```javascript
// OLD: Inline module in library directory
// File: libraries/cenove-ponuky/CP.Calculate.Module.js
var CPCalculateModule = (function() { ... })();

// NEW: Centralized module in modules/
// File: modules/CenovePonuky.js
var CenovePonuky = (function() { ... })();
```

---

## 📋 Planned Modules (Priority Order)

### High Priority (Week 2-3)

| Module | File | Target Scripts | Expected Reduction |
|--------|------|----------------|-------------------|
| **Pokladna.js** | `modules/Pokladna.js` | Pokl.Action.PayObligations.js | 1,113 → 200 lines |
| **CenovePonuky.js** | `modules/CenovePonuky.js` | CenPon.Calculate.js | 1,278 → 800 lines |
| **Dochadzka.js** | `modules/Dochadzka.js` | 5 calculation scripts | 35-45% → 10% duplication |

### Medium Priority (Week 4)

| Module | File | Purpose |
|--------|------|---------|
| **Zakazky.js** | `modules/Zakazky.js` | Order calculations, price methods |
| **Material.js** | `modules/Material.js` | Material operations, VAT conversion |
| **ZaznamPrac.js** | `modules/ZaznamPrac.js` | Work record calculations |
| **KnihaJazd.js** | `modules/KnihaJazd.js` | Vehicle logbook, GPS routing |

### Shared Patterns (Week 1)

| Module | File | Purpose |
|--------|------|---------|
| **DailyReport.js** | `modules/DailyReport.js` | Daily report update pattern (used in 4 libraries) |

### Low Priority (Future)

| Module | File | Purpose |
|--------|------|---------|
| **Zamestnanci.js** | `modules/Zamestnanci.js` | Employee aggregations |

---

## 🏗️ Module Template (IIFE Pattern)

All modules in this directory follow the **IIFE (Immediately Invoked Function Expression)** pattern:

```javascript
// ==============================================
// LIBRARY MODULE - Library Name
// Verzia: 1.0 | Dátum: 2026-03-XX | Autor: ASISTANTO
// ==============================================
// PURPOSE:
//    - Reusable module for [library] operations
//    - [Primary function 1]
//    - [Primary function 2]
// ==============================================
// DEPENDENCIES:
//    - MementoUtils v7.0+
//    - MementoConfig (central configuration)
// ==============================================
// USAGE:
//    var result = LibraryModule.mainFunction(entry(), config);
// ==============================================

var LibraryModule = (function() {
    'use strict';

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "LibraryModule",
        version: "1.0",
        author: "ASISTANTO",
        description: "Module description"
    };

    // ==============================================
    // PRIVATE FUNCTIONS
    // ==============================================

    function privateHelper() {
        // Internal logic
    }

    // ==============================================
    // PUBLIC API
    // ==============================================

    return {
        info: MODULE_INFO,

        getVersion: function() {
            return MODULE_INFO.version;
        },

        mainFunction: function(entry, userConfig) {
            try {
                // Business logic here
                return {
                    success: true,
                    data: { /* results */ }
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.toString()
                };
            }
        }
    };

})();

// Auto-export info on load
if (typeof log !== 'undefined') {
    log("✅ LibraryModule v" + LibraryModule.info.version + " loaded");
}
```

---

## 📖 Usage Patterns

### Pattern 1: Simple Function Call

```javascript
// Wrapper script: Pokl.Action.PayObligations.js
var result = Pokladna.payObligations(entry(), {
    amount: 1000,
    offsetReceivables: true
});

if (result.success) {
    dialog("Success", result.message, "OK");
} else {
    dialog("Error", result.error, "OK");
    cancel();
}
```

### Pattern 2: Multiple Operations

```javascript
// Wrapper script: Doch.Calc.Main.js
var config = {
    roundingMode: "nearest",
    includeBreaks: true
};

var result = Dochadzka.calculateAttendance(entry(), config);

if (!result.success) {
    dialog("Chyba", result.error, "OK");
    cancel();
}

// Use results
entry().set("Odpracované hodiny", result.hoursWorked);
entry().set("Mzda", result.wage);
```

### Pattern 3: Fallback for Missing Module

```javascript
// Graceful degradation if module not loaded
if (typeof Pokladna !== 'undefined') {
    var result = Pokladna.payObligations(entry());
} else {
    dialog("Chyba", "❌ Chýba Pokladna modul!", "OK");
    cancel();
}
```

---

## 🔄 GitHub Integration (Phase 5)

Modules will be synchronized via GitHub URLs in Memento Database:

**Location in Memento:** Settings → Automations → Add URL

**Load Order (CRITICAL):**
```
1. Core modules first (MementoConfig, MementoCore, MementoUtils...)
2. Shared pattern modules (DailyReport.js)
3. Library-specific modules (Pokladna.js, Dochadzka.js...)
4. Wrapper scripts last
```

**GitHub URL Format:**
```
https://raw.githubusercontent.com/{user}/memento-modules/main/modules/Pokladna.js
https://raw.githubusercontent.com/{user}/memento-modules/main/modules/Dochadzka.js
```

---

## 🎯 Success Metrics

### Code Quality Targets
- **Dochádzka:** 35-45% duplication → 10% duplication
- **Pokladňa:** 1,113 lines → 200 lines wrapper
- **Cenové ponuky:** 1,278 lines → 250 lines wrapper
- **Overall:** 30% reduction in codebase size

### Operational Targets
- Module load time: < 500ms per module
- Script execution: within 10% of old implementation
- Error rate: 0 errors after 1 week in production

---

## 📚 Reference Examples

### ✅ Perfect Module Structure
**File:** `core/MementoVAT.js`
**Why:** Clean IIFE pattern, comprehensive API, excellent documentation

### ✅ Module Usage Example
**File:** `libraries/pokladna/Pokl.Calc.VAT.js`
**Why:** Thin wrapper demonstrating proper module usage

---

## ⚠️ Important Notes

### When to Create a Module Here

**Create in `modules/` when:**
- ✅ Logic is **library-specific** (only one library uses it)
- ✅ Code is **complex** (100+ lines)
- ✅ Multiple scripts in **same library** need the logic
- ✅ Needs **centralized maintenance**

**Create in `core/` when:**
- ✅ Logic works across **multiple libraries** (universal)
- ✅ General-purpose utility (time, validation, formatting)

### Module Naming Convention

- **File:** `ModuleName.js` (PascalCase, singular)
- **Variable:** `var ModuleName = (function() { ... })()`
- **Examples:** Pokladna.js, Dochadzka.js, CenovePonuky.js

### Version Management

- Version in MODULE_INFO object
- Version in file header
- **NO version in filename** (unlike core modules)

---

## 🔍 Verification Checklist

Before deploying a new module:

- [ ] Module follows IIFE template
- [ ] Public API documented in header
- [ ] Error handling implemented
- [ ] Logging to Debug_Log field
- [ ] Module loads without errors in Memento
- [ ] Wrapper script tested with module
- [ ] Performance comparable to old implementation
- [ ] Version number updated
- [ ] README.md updated (this file)

---

## 📝 Documentation Files

- **This file:** `modules/README.md` - Module directory overview
- **Main docs:** `../docs/CORE_MODULES_DOCUMENTATION.md` - Core module API reference
- **Implementation plan:** `../docs/GITHUB_INTEGRATION.md` - GitHub sync guide (to be created)
- **Project structure:** `../MEMENTO_PROJECT_STRUCTURE.md` - Overall project organization

---

**Last Updated:** 2026-03-19
**Status:** 🟢 Active - Phase 2 Complete
