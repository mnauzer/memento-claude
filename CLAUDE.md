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

**Note:** Core modules are flat in `core/` for easy access from Memento Database. Do not create subdirectories.

---


## Project Navigation Guide

### Kde nájsť čo - Quick Reference

> **TIP:** Pre kompletný zoznam všetkých súborov s detailmi pozri `PROJECT_MAP.md`

#### Core Modules (Základné knižnice)
**Umiestnenie:** `core/`

| Modul | Súbor | Účel |
|-------|-------|------|
| Config | `MementoConfig7.js` | Centrálna konfigurácia všetkých knižníc, polí, ikon |
| Core | `MementoCore7.js` | Logging, formátovanie, validácia, safe field access |
| Utils | `MementoUtils7.js` | Agregátor všetkých modulov (lazy loading) |
| Business | `MementoBusiness7.js` | Business logika: mzdy, pracovný čas, výkazy |
| AI | `MementoAI7.js` | OpenAI, Claude API integrácia |
| Telegram | `MementoTelegram8.js` | Telegram Bot API, notifikácie |
| GPS | `MementoGPS.js` | GPS routing, OSRM API |
| RecordTracking | `MementoRecordTracking.js` | Sledovanie vytvorenia/úpravy záznamov |
| IDConflictResolver | `MementoIDConflictResolver.js` | Riešenie ID konfliktov (team verzia) |
| AutoNumber | `MementoAutoNumber.js` | Automatické generovanie čísel |
| Sync | `MementoSync1.js` | PostgreSQL synchronizácia |

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
2. Všetky core moduly začínajú `Memento*` (napr. MementoCore7.js)
3. Detailnú dokumentáciu nájdeš v `docs/CORE_MODULES_DOCUMENTATION.md`
4. Quick reference v `docs/CORE_MODULES_QUICK_REFERENCE.md`

**Príklady:**
- Hľadám funkciu na zaokrúhľovanie času → `core/MementoCore7.js` → `roundToQuarterHour()`
- Hľadám centrálnu konfiguráciu → `core/MementoConfig7.js`
- Hľadám Telegram API → `core/MementoTelegram8.js`
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
