# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is a **Memento Database scripting project** - a JavaScript library and utilities for building business applications in Memento Database, a mobile/cloud database platform. Scripts run server-side within Memento Database, not as standalone Node.js applications.

**Important:** This is NOT a traditional Node.js project. There is no package.json, no build process, no npm install. Scripts are copied directly into Memento Database via their UI.

## High-Level Architecture

### Module Dependency Chain

All scripts follow a strict dependency hierarchy:

```
MementoConfig7.js (no dependencies - configuration only)
    ↓
MementoCore7.js (depends on Config - logging, validation, field access)
    ↓
MementoUtils7.js, MementoBusiness7.js, MementoAI7.js (depend on Core + Config)
    ↓
MementoTelegram8.js (depends on all above)
    ↓
Library Scripts (depend on relevant core modules)
```

**Critical:** When working with any script, always verify its dependencies in the script header. Load order matters in Memento Database.

### Core Modules (`core/`)

Located in `core/` directory for easy access from Memento Database. All core modules use version numbers in filenames (exception to naming convention).

- **MementoConfig7.js** - Single source of truth for all library names, field names, library IDs, icons, constants. Never hardcode field names; always use `config.fields.{library}.{field}`.

- **MementoCore7.js** - Foundation utilities: logging (`addDebug`, `addError`, `addInfo`), safe field access, validation, icon management. Zero external dependencies.

- **MementoUtils7.js** - Extended helpers: time calculations (15-minute rounding), date formatting, field manipulation, common utilities.

- **MementoBusiness7.js** - Business logic: attendance calculations, payroll processing, work hours, rate calculations. Domain-specific logic lives here.

- **MementoAI7.js** - AI service integration: OpenAI GPT-4, Claude API, HTTP wrappers, image analysis.

- **MementoTelegram8.js** - Telegram Bot API: message sending/editing/deleting, group chat support, thread support, notification aggregation.

- **MementoGPS.js** - GPS utilities: coordinate handling, distance calculations.

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

1. Check `MEMENTO_NAMING_CONVENTION.md` for naming rules
2. Copy `Template-Script.js` as starting point
3. Rename following convention: `[Lib].[Type].[Name].js`
4. Update script header with library, name, version, dependencies
5. Add configuration to `MementoConfig7.js` if new fields/libraries
6. Implement logic following the template structure
7. Test in Memento Database (cannot test locally)
8. Document in library README if needed

### Modifying Core Modules

**CAUTION:** Core modules are used by ALL scripts. Changes have broad impact.

1. Check version in filename (e.g., `MementoCore7.js` is version 7.x)
2. Update version in script if breaking changes (7.0 → 8.0)
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
- `message()` - Show messages to user
- HTTP requests via Memento's API

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
- Add new entries to MementoConfig7.js
- Document in appropriate section (libraries, fields, constants)
- Use descriptive keys following existing patterns
- Update version number in MementoConfig

## File Organization

```
memento-claude/
├── core/                   # Core modules (all in root, no subdirs)
├── libraries/              # Business domain scripts
│   ├── dochadzka/         # Attendance
│   ├── kniha-jazd/        # Vehicle logbook
│   ├── material/          # Materials
│   └── ...
├── utils/                  # Cross-library utilities
├── Template-Script.js      # Script template
└── *.md                    # Documentation
```

**Note:** Core modules are flat in `core/` for easy access from Memento Database. Do not create subdirectories.
