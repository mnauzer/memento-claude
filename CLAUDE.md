# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is a **Memento Database scripting project** - a JavaScript library and utilities for building business applications in Memento Database, a mobile/cloud database platform. Scripts run server-side within Memento Database, not as standalone Node.js applications.

**Important:** This is NOT a traditional Node.js project. There is no package.json, no build process, no npm install. Scripts are copied directly into Memento Database via their UI.

## High-Level Architecture

### Module Dependency Chain (v8.0+)

All scripts follow a strict dependency hierarchy:

```
LEVEL 0: Configuration
MementoConfig (v8.0+) - No dependencies

LEVEL 1: Foundation
MementoCore (v8.0+) - Depends on Config

LEVEL 2: Focused Utilities
MementoTime (v1.1+) - Time operations
MementoDate (v1.0+) - Slovak calendar
MementoValidation (v1.0+) - Validation patterns
MementoFormatting (v1.0+) - Formatters
MementoCalculations (v1.0+) - Business calculations

LEVEL 3: Business Logic
MementoBusiness (v8.0+) - High-level workflows (uses focused utilities)

LEVEL 4: Aggregator
MementoUtils (v8.1+) - Lazy-loading facade for all above

SEPARATE CHAIN:
MementoTelegram (v8.2+) - Depends ONLY on MementoCore (not Utils)
                          Import directly: var telegram = typeof MementoTelegram !== 'undefined' ? MementoTelegram : null;

Library Scripts - Depend on relevant core modules
```

**Critical:** Load order matters in Memento Database. See `docs/CORE_MODULES_AGGREGATION.md` for complete load order documentation.

**Breaking Change v7→v8:** MementoTelegram NO LONGER accessible via `utils.telegram` (circular dependency fixed). Must import directly.

### Core Modules (`core/`)

Located in `core/` directory for easy access from Memento Database.

**NOTE:** Core module filenames do NOT include version numbers (changed in v8.0 refactoring). Version tracking is in MODULE_INFO metadata only. This allows version updates without file renames.

#### Foundation (ALWAYS REQUIRED)

- **MementoConfig (v8.0+)** - Single source of truth for all library names, field names, library IDs, icons, constants, module metadata. Never hardcode field names; always use `config.fields.{library}.{field}`.

- **MementoCore (v8.0+)** - Foundation utilities: logging (`addDebug`, `addError`, `addInfo`), safe field access, validation, icon management. Zero external dependencies. Access via `utils.core` or direct functions on `utils`.

#### Focused Utilities (NEW in v8.0 - Phase 3)

- **MementoTime (v1.1+)** - Time operations: 15-minute rounding (`roundToQuarterHour`), work hours calculation (`calculateHoursDifference`), time formatting, break time calculation. Access via `utils.time`.

- **MementoDate (v1.0+)** - Slovak calendar utilities: weekend detection (`isWeekend`), holiday checking (`isHoliday`), week numbers (`getWeekNumber`), workday calculations. Access via `utils.date`.

- **MementoValidation (v1.0+)** - Validation patterns: time validation (`validateTime`), date validation (`validateDate`), number validation, required field checking. Access via `utils.validation`.

- **MementoFormatting (v1.0+)** - Display formatters: money formatting (`formatMoney`), duration formatting (`formatDuration`), date/time formatting, employee name formatting. Access via `utils.formatting`.

- **MementoCalculations (v1.0+)** - Business calculations: daily wage (`calculateDailyWage`), overtime (`calculateOvertime`), VAT calculation, break time, profitability. Access via `utils.calculations`.

#### Business Logic

- **MementoBusiness (v8.0+)** - High-level workflows: employee processing, attendance aggregation, report generation, obligation management. Orchestrates focused utilities. **Reduced from 3,942 to 1,050 lines in v8.0**. Access via `utils.business`.

#### Aggregator

- **MementoUtils (v8.1+)** - Universal aggregator providing single import point for all modules. Lazy-loading pattern for optimal performance. Comprehensive dependency checking (`checkAllDependencies`). See `docs/CORE_MODULES_AGGREGATION.md` for complete documentation.

#### Specialized Modules

- **MementoAI (v8.0+)** - AI service integration: OpenAI GPT-4, Claude API, HTTP wrappers, image analysis. Access via `utils.ai`.

- **MementoTelegram (v8.2+)** - Telegram Bot API: message sending/editing/deleting, group chat support, thread support, notification aggregation. **⚠️ NOT aggregated in MementoUtils** (circular dependency). Must import directly: `var telegram = typeof MementoTelegram !== 'undefined' ? MementoTelegram : null;`

- **MementoGPS (v1.1+)** - GPS utilities: coordinate handling, distance calculations, OSRM routing. Access via `utils.gps`.

- **MementoRecordTracking (v1.1+)** - Record lifecycle tracking. Access via `utils.recordTracking`.

- **MementoIDConflictResolver (v1.1+)** - ID conflict resolution for team environments. Access via `utils.idConflictResolver`.

- **MementoSync (v1.1+)** - PostgreSQL synchronization module (specialized, import on demand).

#### Deprecated Modules

- **MementoVAT** - ⚠️ Deprecated: Use `utils.calculations.calculateVAT()` instead
- **MementoAutoNumber** - ⚠️ Deprecated: Use `utils.business.generateNextNumber()` instead

**See `docs/CORE_MODULES_DOCUMENTATION.md` for complete API reference.**

### Library Scripts (`libraries/`)

Organized by business domain (dochadzka, kniha-jazd, material, etc.). Each library has multiple script types serving different purposes.

## Naming Convention

**CRITICAL:** All scripts must follow this exact format:

```
[Library].[Type].[Name].js
```

### Library Abbreviations

| Full Name | Abbreviation | Example |
|-----------|--------------|---------|
| Dochádzka | Doch | Doch.Calc.Main.js |
| Kniha jázd | Knij | Knij.Action.SetStartEnd.js |
| Materiál | Mat | Mat.BulkAction.UpdatePrices.js |
| Pokladňa | Pokl | Pokl.Calc.VAT.js |
| Zamestnanec | Zam | Zam.Calc.Universal.js |
| Zákazky | Zak | Zak.Calc.Main.js |
| Záznam prác | Zazp | Zazp.Calc.Main.js |

### Script Types

- **Calc** - Calculation engine (triggers on save, recalculates fields)
- **Trigger** - Database event handlers (BeforeDelete, AfterSave, etc.)
- **Action** - Manual operations (buttons, menu actions)
- **BulkAction** - Batch operations on multiple records
- **Button** - UI button handlers
- **Notif** - Notification management (Telegram, email)

### Version Management

**Never include version in filename.** Version goes in script header only.

```javascript
/**
 * Knižnica:    Dochádzka
 * Názov:       Doch.Calc.Main
 * Typ:         Calculation (Trigger - After Save)
 * Verzia:      8.0     ← Version here, not in filename
 */
```

## Working with Scripts

### Script Structure Pattern

Every script follows this template (see `Template-Script.js`):

1. **Module initialization** - Import MementoUtils, get current entry
2. **Script config** - Create config via `utils.createScriptConfig()`
3. **Dependency validation** - Check required modules with `utils.checkDependencies()`
4. **Input validation** - Validate required fields
5. **Main logic** - Business operations
6. **Cleanup & logging** - Clear old logs, add results to info field
7. **Error handling** - Comprehensive try/catch with logging

### Accessing Configuration

**Always use MementoConfig, never hardcode:**

```javascript
var config = MementoConfig.getConfig();

// Library names
var libraryName = config.libraries.attendance; // "Dochádzka"

// Field names
var dateField = config.fields.attendance.date; // "Dátum"
var employeeField = config.fields.attendance.employee; // "Zamestnanec"

// Common fields (Debug_Log, Error_Log, info, etc.)
var debugField = config.fields.common.debugLog;

// Icons
var successIcon = config.icons.success; // "✅"
```

### Logging Pattern

Use logging functions from MementoCore:

```javascript
// Debug logging (goes to Debug_Log field)
utils.addDebug(entry, "Starting calculation", "start");

// Error logging (goes to Error_Log field)
utils.addError(entry, "Invalid date format", "validateDate", error);

// Info logging (goes to info field - user-visible results)
utils.addInfo(entry, "Calculation complete", {hours: 8, wage: 120}, {
    scriptName: "Attendance Calculator",
    scriptVersion: "8.0"
});
```

### Field Access Pattern

**Never access fields directly**, use safe accessors:

```javascript
// BAD - direct access, will break if field doesn't exist
var date = entry.field("Dátum");

// GOOD - use config
var dateFieldName = config.fields.attendance.date;
var date = entry.field(dateFieldName);

// BETTER - use safe accessor (handles null/undefined)
var date = utils.safeGetField(entry, dateFieldName, null);
```

## Development Workflow

### Adding a New Library Script

**CRITICAL FIRST STEP:** Before writing any code, verify the library structure!

1. **Verify library structure via API/MCP:**
   - Check current field names and types
   - Verify library ID
   - Confirm field structure hasn't changed
   - Use: `memento_api_simple.py` or MCP Google Calendar/Gmail tools
   - Example: `python memento_api_simple.py --library "Dochádzka" --structure`

2. Check `MEMENTO_NAMING_CONVENTION.md` for naming rules
3. Copy `templates/Template-Script.js` as starting point
4. Rename following convention: `[Lib].[Type].[Name].js`
5. Update script header with library, name, version, dependencies
6. Add configuration to `MementoConfig.js` if new fields/libraries
7. Implement logic following the template structure
8. Test in Memento Database (cannot test locally)
9. Document in library README if needed

**Why verify first?**
- Field names must be **exact** (case-sensitive, Slovak characters)
- Field types affect how you access data (text vs number vs date vs linkToEntry)
- Library structure may have changed since last update
- Prevents runtime errors and failed field access

---

### Creating Reusable Modules (PREFERRED APPROACH)

**IMPORTANT:** All scripts should be created as **reusable modules** whenever possible.

#### What is a Reusable Module?

A reusable module is a script that:
- ✅ Uses IIFE (Immediately Invoked Function Expression) pattern
- ✅ Exports public API functions
- ✅ Can be called from other scripts without copying code
- ✅ Is synchronized with GitHub
- ✅ Lives in `core/` directory

#### Why Reusable Modules?

**Traditional approach (BAD):**
```javascript
// ❌ Copy 300+ lines of code into every script that needs VAT calculation
function calculateVAT() { /* 300 lines */ }
function getValidVatRate() { /* 100 lines */ }
// ...repeat in every library
```

**Reusable module approach (GOOD):**
```javascript
// ✅ Load once, use everywhere
var result = MementoVAT.calculateVAT(entry(), config);
```

**Benefits:**
- 🚀 No code duplication - Load once, use everywhere
- 🔧 Central maintenance - Fix bug once, works everywhere
- 📦 Git synchronization - Version control for business logic
- 🎯 Simpler scripts - One line instead of 300+ lines
- 🔄 Easy updates - Update module, all scripts benefit

#### Creating a Reusable Module

**1. Module Structure (IIFE Pattern):**

```javascript
var ModuleName = (function() {
    'use strict';

    // Private variables
    var version = "1.0";

    // Private functions
    function privateHelper() {
        // Internal logic
    }

    // Public API
    return {
        version: version,

        publicFunction: function(entry, config) {
            // Public logic
            return { success: true, data: {} };
        },

        anotherFunction: function(param1, param2) {
            // More logic
            return result;
        }
    };
})();
```

**2. Module Template Checklist:**

- [ ] File in `core/` directory (e.g., `core/MementoVAT.js`)
- [ ] IIFE pattern: `var ModuleName = (function() { ... })()`
- [ ] Version info in module
- [ ] Comprehensive header documentation
- [ ] Public API with clear function signatures
- [ ] Parameter validation
- [ ] Error handling with helpful messages
- [ ] Usage examples in header
- [ ] Separate documentation file in `docs/`

**3. Using a Reusable Module:**

**In Memento Database:**
```javascript
// Wrapper script (e.g., Pokl.Calc.VAT.js)

// 1. Validate module exists
if (typeof MementoVAT === 'undefined') {
    message("❌ Chýba MementoVAT modul!");
    cancel();
}

// 2. Configure for your library
var config = {
    fields: {
        isVat: "s DPH",
        sum: "Suma",
        sumTotal: "Suma s DPH"
    }
};

// 3. Call module function
var result = MementoVAT.calculateVAT(entry(), config);

// 4. Handle result
if (!result.success) {
    dialog("Chyba", result.error, "OK");
    cancel();
}
```

**4. Load Order in Memento:**

**CRITICAL:** Reusable modules must load BEFORE scripts that use them.

In Memento Database:
1. Go to **Nastavenia → Skripty**
2. Drag & drop reusable modules to the TOP
3. Wrapper scripts below

```
Load order:
1. MementoVAT.js ← Reusable module FIRST
2. Pokl.Calc.VAT.js ← Wrapper script AFTER
3. Other scripts...
```

#### Git Synchronization for Reusable Modules

**IMPORTANT:** Reusable modules are synchronized with GitHub.

**Workflow:**
1. **Develop in Git:** Edit `core/ModuleName.js` locally
2. **Test:** Verify logic, run examples
3. **Commit:** `git commit -m "feat: update ModuleName to v2.0"`
4. **Deploy to Memento:** Copy updated code to Memento Database
5. **Verify:** Test in actual Memento environment

**Git → Memento Sync:**
```
Git Repository              Memento Database
├── core/
│   └── MementoVAT.js  →   Global Script "MementoVAT"
├── libraries/
│   └── pokladna/
│       └── Pokl.Calc.VAT.js → Script "Pokl.Calc.VAT"
```

**Benefits of Git Sync:**
- ✅ Version control (full history)
- ✅ Backup (never lose code)
- ✅ Collaboration (multiple developers)
- ✅ Testing (test before deploy)
- ✅ Rollback (revert if needed)

#### When to Create Reusable Module vs Regular Script

**Create Reusable Module when:**
- ✅ Logic will be used in **multiple libraries** (VAT calculation, GPS routing, etc.)
- ✅ Code is **complex** (100+ lines)
- ✅ Logic is **stable** (doesn't change per library)
- ✅ Needs **centralized maintenance**

**Create Regular Script when:**
- ⚠️ Logic is **library-specific** (only one library uses it)
- ⚠️ Code is **simple** (< 50 lines)
- ⚠️ Frequently changes per use case

**Examples:**
- **Reusable Module:** VAT calculation, GPS routing, Telegram notifications, Auto-numbering
- **Regular Script:** Library-specific field calculations, simple triggers, one-off actions

#### Existing Reusable Modules

| Module | File | Purpose |
|--------|------|---------|
| MementoConfig | `core/MementoConfig.js` | Central configuration |
| MementoCore | `core/MementoCore.js` | Core utilities |
| MementoUtils | `core/MementoUtils.js` | Aggregator (lazy loading) |
| MementoBusiness | `core/MementoBusiness.js` | Business logic |
| MementoAI | `core/MementoAI.js` | AI integration |
| MementoTelegram | `core/MementoTelegram.js` | Telegram Bot API |
| MementoGPS | `core/MementoGPS.js` | GPS utilities |
| MementoVAT | `core/MementoVAT.js` | VAT calculations |
| MementoAutoNumber | `core/MementoAutoNumber.js` | Auto-numbering |

**All reusable modules:**
- Live in `core/` directory
- Use IIFE pattern
- Export public API
- Synchronized with Git
- Documented in `docs/`

---

### Modifying Core Modules

**CAUTION:** Core modules are used by ALL scripts. Changes have broad impact.

1. Check version in MODULE_INFO (filenames no longer contain versions)
2. Update MODULE_INFO.version if breaking changes (e.g., 8.0.0 → 9.0.0)
3. Update CHANGELOG section in script header
4. Test with multiple library scripts before committing
5. Consider backward compatibility - many scripts may depend on current behavior

### Testing

**No automated tests.** Testing happens in Memento Database:

1. Copy script to Memento Database library
2. Trigger the script (save record, click button, etc.)
3. Check Debug_Log field for execution trace
4. Check Error_Log field for errors
5. Check info field for results

## Key Documentation Files

- **MEMENTO_PROJECT_STRUCTURE.md** - Complete project organization, module descriptions, dependencies
- **MEMENTO_NAMING_CONVENTION.md** - Detailed naming rules, script types, examples
- **MEMENTO_API_ACCESS.md** - Python API utilities, environment setup, Memento Database API usage

## Python Utilities

Located in `python-utilities/` directory (not in git). These provide API access to Memento Database for automation and data extraction.

**Key script:** `memento_api_simple.py`
- CLI for listing libraries, getting structure, reading/writing entries
- Requires `MEMENTO_API_KEY` environment variable

**Environment files:**
- Root `.env` - For new scripts, minimal config
- `config/.env` - For existing utilities, includes all library IDs

See `MEMENTO_API_ACCESS.md` for complete Python API documentation.

## Important Constraints

### Platform Limitations

- **No npm packages** - Only Memento Database's built-in JavaScript APIs
- **No Node.js APIs** - No fs, path, http modules
- **No async/await** - Memento uses callback-style async
- **No ES6 modules** - Use IIFE pattern: `var Module = (function() { ... })()`

### Available APIs in Memento

- `entry()` - Current database record
- `lib()` - Current library metadata
- `moment()` - Date/time manipulation
- `message()` - Show brief messages to user (see User Communication below)
- `dialog()` - Show detailed dialogs with buttons (see User Communication below)
- HTTP requests via Memento's API

### User Communication Best Practices

**CRITICAL:** Choose the right function for user communication:

#### message() - Pre krátke správy

**Použitie:**
- Krátke notifikácie (1-2 riadky)
- Rýchle potvrdenia ("Uložené", "Hotovo")
- Jednoduché chybové hlásenia

**Vlastnosti:**
- Zobrazuje sa len **2 riadky textu**
- Automaticky zmizne po **~2 sekundách**
- Žiadne tlačidlá
- Nemožnosť interakcie

**Príklad:**
```javascript
message("✅ Záznam uložený");
message("⚠️ Chyba: Chýba dátum");
```

**Kedy NEPOUŽÍVAŤ:**
- ❌ Dlhé správy (viac ako 2 riadky)
- ❌ Detailné výsledky výpočtov
- ❌ Zoznamy položiek
- ❌ Viacnásobné informácie
- ❌ Keď užívateľ potrebuje čas na prečítanie

#### dialog() - Pre podrobné správy

**Použitie:**
- Detailné výsledky výpočtov
- Zoznam zmien/položiek
- Potvrdzovacie dialógy s tlačidlami
- Dôležité informácie vyžadujúce potvrdenie
- Viacstupňové správy

**Vlastnosti:**
- Zobrazuje **ľubovoľné množstvo textu**
- Zostáva na obrazovke až **kým užívateľ nezatvorí**
- Môže obsahovať **tlačidlá** (OK, Cancel, custom)
- Formátovanie textu (zalomenie riadkov)
- Užívateľ má čas prečítať

**Príklad:**
```javascript
// Jednoduchý dialog
dialog("Prepočet dokončený", "Celková suma: 1250 €\nDPH: 250 €\nBez DPH: 1000 €", "OK");

// Dialog s potvrdením
var result = dialog("Potvrdenie", "Naozaj chcete zmazať tento záznam?", "Áno", "Nie");
if (result === 0) {
    // Užívateľ klikol "Áno"
}

// Podrobný výsledok
var details = "=== VÝSLEDKY PREPOČTU ===\n\n";
details += "Odpracované hodiny: 8.5h\n";
details += "Hodinová sadzba: 12 €/h\n";
details += "Mzda: 102 €\n";
details += "Prémie: 20 €\n";
details += "Celkom: 122 €\n";
dialog("Výsledok prepočtu", details, "OK");
```

**Kedy POUŽÍVAŤ:**
- ✅ Výsledky výpočtov s viacerými hodnotami
- ✅ Sumáre operácií
- ✅ Chybové hlásenia s detailmi
- ✅ Potvrdzovacie dialógy
- ✅ Akékoľvek správy dlhšie ako 2 riadky

### Code Style

- **Slovak language** for comments and user-facing strings (this is a Slovak business app)
- **English** for code identifiers (function names, variables)
- Use IIFE pattern for modules
- Strict mode: `'use strict';`

## Common Pitfalls

1. **Hardcoding field names** - Always use MementoConfig
2. **Breaking dependency chain** - MementoBusiness can't use MementoTelegram
3. **Version mismatch** - Check required versions in script headers
4. **Missing validation** - Always validate dependencies and required fields
5. **Poor error handling** - Wrap operations in try/catch, log to Error_Log
6. **Direct field access** - Use safe accessors from MementoUtils
7. **Using message() for long text** - Use dialog() for detailed info (message() shows only 2 lines for ~2 seconds)
8. **Not verifying library structure** - Always check field names/types via API/MCP before coding (field names must be exact!)
9. **Copying code instead of using reusable modules** - Create reusable modules for shared logic, call functions instead of duplicating code

## When Modifying Files

### For Core Modules
- Update version number if breaking changes
- Update CHANGELOG in header
- Test with dependent scripts
- Consider backward compatibility

### For Library Scripts
- Follow naming convention strictly
- Update header (version, date modified)
- Verify dependencies are loaded
- Test in actual Memento Database environment

### For Configuration
- Add new entries to MementoConfig.js
- Document in appropriate section (libraries, fields, constants)
- Use descriptive keys following existing patterns
- Update version number in MementoConfig

## File Organization

```
memento-claude/
├── core/                   # Universal core modules (cross-library)
├── modules/                # Library-specific reusable modules (NEW)
│   ├── README.md          # Module directory documentation
│   ├── Pokladna.js        # (Planned) Cash register operations
│   ├── Dochadzka.js       # (Planned) Attendance calculations
│   └── ...                # See modules/README.md for complete list
├── libraries/              # Business domain scripts (27 directories)
│   ├── dochadzka/         # Attendance
│   ├── kniha-jazd/        # Vehicle logbook
│   ├── material/          # Materials
│   ├── cenove-ponuky/     # Price quotes
│   ├── zakazky/           # Orders
│   └── ...                # See PROJECT_MAP.md for complete list
├── utils/                  # Cross-library utilities
├── templates/              # Script templates
│   └── Template-Script.js # Script template
├── docs/                   # Documentation
├── .obsolete/             # Archived old files
└── *.md                    # Documentation
```

**Notes:**
- **`core/`** - Universal modules that work across ALL libraries (MementoCore, MementoVAT, MementoTime)
- **`modules/`** - Library-specific reusable modules (Pokladna.js, Dochadzka.js, etc.) - NEW in Phase 2
- **`libraries/*/`** - Thin wrapper scripts that call module functions
- Core modules are flat in `core/` for easy access from Memento Database. Do not create subdirectories.

---


## Project Navigation Guide

### Kde nájsť čo - Quick Reference

> **TIP:** Pre kompletný zoznam všetkých súborov s detailmi pozri `PROJECT_MAP.md`

#### Core Modules (Základné knižnice)
**Umiestnenie:** `core/`

| Modul | Súbor | Účel |
|-------|-------|------|
| Config | `MementoConfig.js` | Centrálna konfigurácia všetkých knižníc, polí, ikon |
| Core | `MementoCore.js` | Logging, formátovanie, validácia, safe field access |
| Utils | `MementoUtils.js` | Agregátor všetkých modulov (lazy loading) |
| Business | `MementoBusiness.js` | Business logika: mzdy, pracovný čas, výkazy |
| AI | `MementoAI.js` | OpenAI, Claude API integrácia |
| Telegram | `MementoTelegram.js` | Telegram Bot API, notifikácie |
| GPS | `MementoGPS.js` | GPS routing, OSRM API |
| RecordTracking | `MementoRecordTracking.js` | Sledovanie vytvorenia/úpravy záznamov |
| IDConflictResolver | `MementoIDConflictResolver.js` | Riešenie ID konfliktov (team verzia) |
| AutoNumber | `MementoAutoNumber.js` | Automatické generovanie čísel |
| Sync | `MementoSync.js` | PostgreSQL synchronizácia |

**Reusable Moduly pre knižnice:**
- `CP.Calculate.Module.js` - Prepočet cenovej ponuky
- `CP.Diely.Calculate.Module.js` - Prepočet položiek CP
- `CP.Action.CreateOrder.Module.js` - Vytvorenie zákazky z CP
- `Order.Calculate.Module.js` - Prepočet zákazky
- `Order.Diely.Calculate.Module.js` - Prepočet položiek zákazky
- `Doch.Calc.Module.js` - Prepočet dochádzky (modul)

---

#### Library Scripts (Obchodná logika)
**Umiestnenie:** `libraries/{kniznica}/`

**EVIDENCIA - DENNÉ ZÁZNAMY:**

| Knižnica | Adresár | Skratka | Príklady súborov |
|----------|---------|---------|------------------|
| Dochádzka | `dochadzka/` | `Doch` | Doch.Calc.Main.js, Doch.Notif.Individual.js |
| Záznam prác | `zaznam-prac/` | `Zazp` | Zazp.Calc.Main.js, Zazp.Update.DailyReport.js |
| Kniha jázd | `kniha-jazd/` | `Knij` | Knij.Calc.Main.js, Knij.Action.SetStartEnd.js |
| Pokladňa | `pokladna/` | `Pokl` | Pokl.Calc.VAT.js, Pokl.Action.PayObligations.js |
| Denný report | `denny-report/` | `DenRep` | DenRep.Calc.Main.js |

**EVIDENCIA POMOCNÉ - VÝKAZY:**

| Knižnica | Adresár | Skratka | Status |
|----------|---------|---------|--------|
| Výkaz prác | `vykaz-prac/` | `VykPr` | ✅ Existuje |
| Výkaz dopravy | `vykaz-dopravy/` | `VykDop` | 📁 Pripravený adresár |
| Výkaz strojov | `vykaz-strojov/` | `VykStr` | 📁 Pripravený adresár |
| Výkaz materiálu | `vykaz-materialu/` | `VykMat` | 📁 Pripravený adresár |

**CENNÍKY A SKLAD:**

| Knižnica | Adresár | Skratka | Príklady súborov |
|----------|---------|---------|------------------|
| Materiál | `material/` | `Mat` | Mat.Calc.Receipts.js, Mat.BulkAction.UpdatePrices.js |
| Cenník prác | `cennik-prac/` | `CenPr` | 📁 Pripravený adresár |

**OBCHODNÉ DOKUMENTY:**

| Knižnica | Adresár | Skratka | Príklady súborov |
|----------|---------|---------|------------------|
| Cenové ponuky | `cenove-ponuky/` | `CenPon` | CenPon.Calculate.js, CenPon.Diely.Calculate.js |
| Zákazky | `zakazky/` | `Zak` | Zak.Calc.Main.js, Zak.Trigger.AutoNumber.js |
| Vyúčtovania | `vyuctovani/` | `Vyuct` | 📁 Pripravený adresár |
| Pohľadávky | `pohladavky/` | `Pohl` | 📁 Pripravený adresár |
| Záväzky | `zavazky/` | `Zav` | 📁 Pripravený adresár |

**FIREMNÉ KNIŽNICE - MASTER DATA:**

| Knižnica | Adresár | Skratka | Status |
|----------|---------|---------|--------|
| Zamestnanec | `zamestnanec/` | `Zam` | ✅ Existuje |
| Miesta | `miesta/` | `Mies` | ✅ Existuje |
| Adresy | `adresy/` | `Adr` | 📁 Pripravený adresár |
| Partneri | `partneri/` | `Part` | 📁 Pripravený adresár |
| Klienti | `klienti/` | `Klient` | 📁 Pripravený adresár |
| Dodávatelia | `doddavatelia/` | `Dod` | 📁 Pripravený adresár |
| Vozidlá | `vozidla/` | `Voz` | 📁 Pripravený adresár |
| Mechanizácia | `mechanizacia/` | `Mech` | 📁 Pripravený adresár |
| Účty | `ucty/` | `Uct` | 📁 Pripravený adresár |

---

#### Utilities a Templates
**Umiestnenie:** `utils/`, `templates/`

| Typ | Adresár | Súbory |
|-----|---------|--------|
| Cross-library utils | `utils/` | Utils.Action.Renumber.js, Notif.Trigger.OnDelete.js |
| Script templates | `templates/` | Template-Script.js |

---

#### Dokumentácia
**Umiestnenie:** `docs/`, root

| Dokument | Umiestnenie | Účel |
|----------|-------------|------|
| Project Map | `PROJECT_MAP.md` | **ŽIVÁ MAPA** - kompletný zoznam súborov |
| Navigation Index | `docs/INDEX.md` | Hlavný index dokumentácie |
| Core Modules Doc | `docs/CORE_MODULES_DOCUMENTATION.md` | Komplexná dokumentácia core modulov |
| Quick Reference | `docs/CORE_MODULES_QUICK_REFERENCE.md` | Rýchly referenčný sprievodca |
| Project Structure | `MEMENTO_PROJECT_STRUCTURE.md` | Organizácia projektu |
| Naming Convention | `MEMENTO_NAMING_CONVENTION.md` | Konvencie pomenovania |
| API Access | `MEMENTO_API_ACCESS.md` | Python API utilities |
| This file | `CLAUDE.md` | Claude Code inštrukcie |

---

#### Zastarané Súbory
**Umiestnenie:** `.obsolete/`

Všetky staré verzie, testovacie a backup súbory sa nachádzajú v `.obsolete/` adresári, organizované podľa knižníc:
- `.obsolete/core/` - Staré verzie core modulov
- `.obsolete/dochadzka/` - Staré verzie dochádzky
- `.obsolete/material/` - Staré verzie materiálu
- atď.

---

### Ako Nájsť Script Pre Konkrétnu Knižnicu

**Postup:**
1. Identifikuj knižnicu (napr. "Dochádzka")
2. Pozri sa do tabuľky vyššie pre adresár (napr. `dochadzka/`)
3. Pozri sa do tabuľky pre skratku (napr. `Doch`)
4. Všetky skripty pre túto knižnicu začínajú prefixom skratky: `Doch.*`
5. Celá cesta: `libraries/dochadzka/Doch.Calc.Main.js`

**Príklady:**
- Hľadám prepočet dochádzky → `libraries/dochadzka/Doch.Calc.Main.js`
- Hľadám telegram notifikácie pre dochádzku → `libraries/dochadzka/Doch.Notif.Individual.js`
- Hľadám prepočet cenovej ponuky → `libraries/cenove-ponuky/CenPon.Calculate.js`
- Hľadám vytvorenie zákazky z CP → `core/CP.Action.CreateOrder.Module.js` (reusable modul)
- Hľadám prepočet položiek materiálu → `libraries/material/Mat.Calc.Receipts.js`

---

### Ako Nájsť Core Funkciu

**Postup:**
1. Všetky core moduly sú v `core/` adresári
2. Všetky core moduly začínajú `Memento*` (napr. MementoCore.js, MementoUtils.js)
3. Detailnú dokumentáciu nájdeš v `docs/CORE_MODULES_DOCUMENTATION.md`
4. Quick reference v `docs/CORE_MODULES_QUICK_REFERENCE.md`

**Príklady:**
- Hľadám funkciu na zaokrúhľovanie času → `core/MementoCore.js` → `roundToQuarterHour()`
- Hľadám centrálnu konfiguráciu → `core/MementoConfig.js`
- Hľadám Telegram API → `core/MementoTelegram.js`
- Hľadám GPS routing → `core/MementoGPS.js`

---

## Documentation Maintenance

### Keeping Project Documentation Up-to-Date

**CRITICAL:** Vždy keď vykonáš zmeny v projekte, aktualizuj príslušnú dokumentáciu.

#### Ktoré Dokumenty Aktualizovať

| Zmena | Aktualizuj Dokument | Čo Zmeniť |
|-------|---------------------|-----------|
| Nový/premenovaný súbor | `PROJECT_MAP.md` | Pridaj/aktualizuj záznam v príslušnej sekcii |
| Nový adresár | `PROJECT_MAP.md`, `MEMENTO_PROJECT_STRUCTURE.md` | Pridaj do stromovej štruktúry |
| Nová skratka knižnice | `MEMENTO_NAMING_CONVENTION.md` | Pridaj do tabuľky skratiek |
| Nová core funkcia | `docs/CORE_MODULES_DOCUMENTATION.md` | Pridaj API dokumentáciu |
| Zmena závislostí | `PROJECT_MAP.md`, `CLAUDE.md` | Aktualizuj dependency chain |
| Nový typ scriptu | `MEMENTO_NAMING_CONVENTION.md` | Pridaj do sekcie "Typy scriptov" |

#### Automatická Aktualizácia PROJECT_MAP.md

**Kedy:** Po KAŽDEJ zmene súborov (pridanie, premenovanie, presun, zmena verzie)

**Kroky:**
1. Otvor `PROJECT_MAP.md`
2. Nájdi príslušnú sekciu (Core/Library/Utils/Docs)
3. Aktualizuj relevantné informácie:
   - Názov súboru
   - Verzia (ak sa zmenila)
   - Umiestnenie (ak presun)
   - Závislosti (ak nové)
4. Aktualizuj timestamp v hlavičke: `**Posledná aktualizácia:** YYYY-MM-DD HH:MM`
5. Aktualizuj celkový počet súborov (ak pridanie/odstránenie)
6. Ulož súbor

**Príklad aktualizácie:**

```diff
# PROJECT_MAP.md

- **Posledná aktualizácia:** 2026-03-17 10:00
+ **Posledná aktualizácia:** 2026-03-18 22:52
- **Celkový počet súborov:** 69
+ **Celkový počet súborov:** 70

### Library Scripts - Cenové ponuky

| Súbor | Verzia | Účel |
|-------|--------|------|
- | CP.Calculate.js | 2.1.0 | Prepočet cenovej ponuky |
+ | CenPon.Calculate.js | 2.1.0 | Prepočet cenovej ponuky |
```

#### Documentation Checklist Pre Nový Script

Keď vytváraš nový script, aktualizuj:

- [ ] `PROJECT_MAP.md` - Pridaj nový súbor do príslušnej sekcie
- [ ] `MEMENTO_NAMING_CONVENTION.md` - Ak používaš novú skratku, pridaj do tabuľky
- [ ] `MEMENTO_PROJECT_STRUCTURE.md` - Ak nový adresár, pridaj do stromovej štruktúry
- [ ] `CLAUDE.md` - Navigation Guide - Aktualizuj tabuľku knižníc ak nová knižnica

#### Documentation Checklist Pre Core Module Update

Keď aktualizuješ core modul:

- [ ] `PROJECT_MAP.md` - Aktualizuj verziu a počet riadkov
- [ ] `docs/CORE_MODULES_DOCUMENTATION.md` - Aktualizuj API dokumentáciu
- [ ] `docs/CORE_MODULES_QUICK_REFERENCE.md` - Aktualizuj quick reference ak nové funkcie
- [ ] Hlavička modulu - Aktualizuj CHANGELOG sekciu

---

### Live Documentation Principle

**Dokumentácia musí byť vždy synchronizovaná s kódom.**

Claude Code má inštrukcie automaticky aktualizovať dokumentáciu po každej zmene.
Ak vidíš neaktuálnu dokumentáciu, OKAMŽITE ju aktualizuj.

**Pravidlo:** Commit kódu = Commit aktualizovanej dokumentácie

---

## Summary

Tento projekt používa:
- **Core moduly** v `core/` - základné utility (19 súborov)
- **Library skripty** v `libraries/` - obchodná logika (27 adresárov)
- **Utilities** v `utils/` - cross-library nástroje
- **Templates** v `templates/` - šablóny skriptov
- **Documentation** v `docs/` a root - kompletná dokumentácia
- **.obsolete** - archivované staré súbory

Pre kompletný prehľad všetkých súborov pozri **`PROJECT_MAP.md`**.
