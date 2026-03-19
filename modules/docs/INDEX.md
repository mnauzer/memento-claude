# Memento Database Modules - Documentation Index

**Last Updated:** 2026-03-19 23:00
**Total Modules:** 18 (17 library modules + 1 shared module)
**Documentation Files:** 20 (18 library docs + 2 meta docs)

---

## Table of Contents

1. [Module Overview](#module-overview)
2. [Module Status Matrix](#module-status-matrix)
3. [Library Categories](#library-categories)
4. [Quick Links](#quick-links)
5. [Development Roadmap](#development-roadmap)
6. [Getting Started](#getting-started)

---

## Module Overview

The Memento Database module system provides reusable, library-specific functionality that eliminates code duplication and provides a consistent API across all libraries.

### Key Features

- **IIFE Pattern** - All modules use Immediately Invoked Function Expression pattern
- **Public API** - Clear, documented function exports
- **Version Tracking** - Semantic versioning (v0.1.0 → v1.0.0)
- **Error Handling** - Comprehensive logging via MementoUtils
- **Git Synchronized** - Modules stored in GitHub, loaded via URL
- **Auto-Loading** - Modules export info on load

### Module Structure

Each module follows this pattern:

```javascript
var ModuleName = (function() {
    'use strict';

    var MODULE_INFO = {
        name: "ModuleName",
        version: "0.1.0",
        status: "initial" // initial, active, stable
    };

    // Private functions
    // Public API

    return {
        info: MODULE_INFO,
        version: MODULE_INFO.version,
        publicFunction: publicFunction
    };
})();
```

---

## Module Status Matrix

| Module | Version | Status | Scripts | Functions | Docs | Priority |
|--------|---------|--------|---------|-----------|------|----------|
| **High Priority (Existing Scripts)** |||||||
| [Dochadzka](./Dochadzka.md) | 0.1.0 | 🟡 Initial | 12 | 0/10 | ✅ | High |
| [CenovePonuky](./CenovePonuky.md) | 0.1.0 | 🟡 Initial | 10 | 0/15 | ✅ | High |
| [Material](./Material.md) | 0.1.0 | 🟡 Initial | 8 | 0/8 | ✅ | High |
| [Pokladna](./Pokladna.md) | 0.1.0 | 🟡 Initial | 4 | 0/12 | ✅ | High |
| **Medium Priority (Existing Scripts)** |||||||
| [Zakazky](./Zakazky.md) | 0.1.0 | 🟡 Initial | 5 | 0/12 | ✅ | Medium |
| [ZaznamPrac](./ZaznamPrac.md) | 0.1.0 | 🟡 Initial | 2 | 0/6 | ✅ | Medium |
| [KnihaJazd](./KnihaJazd.md) | 0.1.0 | 🟡 Initial | 3 | 0/8 | ✅ | Medium |
| [Zamestnanci](./Zamestnanci.md) | 0.1.0 | 🟡 Initial | 2 | 0/6 | ✅ | Medium |
| [Miesta](./Miesta.md) | 0.1.0 | 🟡 Initial | 2 | 0/4 | ✅ | Medium |
| [Vyuctovani](./Vyuctovani.md) | 0.1.0 | 🟡 Initial | 0 | 0/6 | ✅ | Medium |
| [DennyReport](./DennyReport.md) | 0.1.0 | 🟡 Initial | 1 | 1/4 | ✅ | Medium |
| **Low Priority (Skeleton Libraries)** |||||||
| [Partneri](./Partneri.md) | 0.1.0 | 🟡 Initial | 0 | 0/4 | ✅ | Low |
| [Dodavatelia](./Dodavatelia.md) | 0.1.0 | 🟡 Initial | 0 | 0/4 | ✅ | Low |
| [Klienti](./Klienti.md) | 0.1.0 | 🟡 Initial | 0 | 0/4 | ✅ | Low |
| [Vozidla](./Vozidla.md) | 0.1.0 | 🟡 Initial | 0 | 0/6 | ✅ | Low |
| [Mechanizacia](./Mechanizacia.md) | 0.1.0 | 🟡 Initial | 0 | 0/6 | ✅ | Low |
| [CennikPrac](./CennikPrac.md) | 0.1.0 | 🟡 Initial | 0 | 0/4 | ✅ | Low |
| [Ucty](./Ucty.md) | 0.1.0 | 🟡 Initial | 0 | 0/4 | ✅ | Low |

**Status Legend:**
- 🟡 **Initial** - Module skeleton created, docs complete, no functions implemented yet
- 🟠 **Active** - Some functions implemented, under active development
- 🟢 **Stable** - All planned functions implemented, tested, production-ready

---

## Library Categories

### Transaction & Operations (8 libraries)

Daily operational records and business transactions:

| Library | Module | Purpose |
|---------|--------|---------|
| Dochádzka | [Dochadzka](./Dochadzka.md) | Employee attendance tracking, wage calculations |
| Záznam prác | [ZaznamPrac](./ZaznamPrac.md) | Work record tracking, labor costs |
| Kniha jázd | [KnihaJazd](./KnihaJazd.md) | Vehicle ride log, GPS tracking |
| Pokladňa | [Pokladna](./Pokladna.md) | Cash book, payment distribution |
| Cenové ponuky | [CenovePonuky](./CenovePonuky.md) | Price quotes, quote-to-order conversion |
| Zákazky | [Zakazky](./Zakazky.md) | Order management, invoicing |
| Vyúčtovania | [Vyuctovani](./Vyuctovani.md) | Settlement calculations, aggregations |
| Denný report | [DennyReport](./DennyReport.md) | Daily report aggregations |

### Master Data (9 libraries)

Core business entities and reference data:

| Library | Module | Purpose |
|---------|--------|---------|
| Zamestnanec | [Zamestnanci](./Zamestnanci.md) | Employee profiles, wage rates |
| Miesta | [Miesta](./Miesta.md) | Locations, GPS coordinates |
| Partneri | [Partneri](./Partneri.md) | Partner contact management |
| Dodávatelia | [Dodavatelia](./Dodavatelia.md) | Supplier management |
| Klienti | [Klienti](./Klienti.md) | Client management |
| Vozidlá | [Vozidla](./Vozidla.md) | Vehicle tracking, odometer |
| Mechanizácia | [Mechanizacia](./Mechanizacia.md) | Equipment tracking, operating hours |
| Materiál | [Material](./Material.md) | Inventory, stock levels |
| Cenník prác | [CennikPrac](./CennikPrac.md) | Work item pricing |
| Účty | [Ucty](./Ucty.md) | Bank/cash account balances |

---

## Quick Links

### Documentation

- [RELATIONSHIPS.md](./RELATIONSHIPS.md) - Library relationship diagram
- [INDEX.md](./INDEX.md) - This file

### Core Dependencies

All library modules depend on:
- **MementoUtils** v7.0+ - Core utilities, logging, field access
- **MementoConfig** - Central configuration for all libraries
- **MementoTime** (optional) - Time rounding utilities
- **MementoVAT** (optional) - VAT calculations
- **MementoGPS** (optional) - GPS routing
- **DailyReportModule** (optional) - Daily report updates

### External Resources

- **Project Root:** `X:\claude\projects\memento-claude\`
- **Module Directory:** `X:\claude\projects\memento-claude\modules\`
- **Library Scripts:** `X:\claude\projects\memento-claude\libraries\`
- **Core Modules:** `X:\claude\projects\memento-claude\core\`

---

## Development Roadmap

### Phase 4.1: Foundation (Complete ✅)
- [x] Create 17 library module files
- [x] Create module documentation structure
- [x] Establish IIFE pattern
- [x] Define placeholder functions

### Phase 4.2: Documentation (Current 🔄)
- [x] Create INDEX.md (this file)
- [x] Create RELATIONSHIPS.md
- [ ] Populate field data from MementoConfig
- [ ] Document existing business rules
- [ ] Add usage examples

### Phase 4.3: High-Priority Implementation
- [ ] Extract Pokladna.payObligations() (1,113 lines)
- [ ] Extract CenovePonuky.calculateQuote()
- [ ] Extract Dochadzka.calculateAttendance()
- [ ] Extract Material calculations

### Phase 4.4: Medium-Priority Implementation
- [ ] Implement Zakazky functions
- [ ] Implement ZaznamPrac functions
- [ ] Implement KnihaJazd functions
- [ ] Implement Zamestnanci aggregations

### Phase 5: GitHub Integration
- [ ] Create GitHub repository
- [ ] Configure Memento Automations URLs
- [ ] Test module loading from GitHub
- [ ] Setup version pinning

---

## Getting Started

### For Module Users (Script Developers)

1. **Load module** in Memento Database (Settings → Automations → Add URL)
2. **Check module loaded** with:
   ```javascript
   if (typeof ModuleName === 'undefined') {
       message("❌ Module not loaded!");
       cancel();
   }
   ```
3. **Call module function**:
   ```javascript
   var result = ModuleName.functionName(entry(), {
       option1: value1
   });
   ```
4. **Handle result**:
   ```javascript
   if (result.success) {
       // Use result.data
   } else {
       dialog("Error", result.error, "OK");
   }
   ```

### For Module Developers

1. **Read module documentation** (e.g., `docs/Dochadzka.md`)
2. **Locate function** to implement (check TODOs)
3. **Edit module file** (`modules/Dochadzka.js`)
4. **Test locally** (review logic)
5. **Deploy to GitHub** (commit & push)
6. **Test in Memento** (after cache refresh ~10-15 min)

### Common Patterns

**Time Calculations:**
```javascript
// Use MementoTime module
var rounded = MementoTime.roundToQuarterHour(time, "nearest");
```

**VAT Calculations:**
```javascript
// Use MementoVAT module
var result = MementoVAT.calculateVAT(entry(), config);
```

**Daily Report Updates:**
```javascript
// Use DailyReportModule
var result = DailyReportModule.updateLinkedDailyReports(entry(), config);
```

---

## Contributing

### Adding New Functions

1. Update module file (`modules/ModuleName.js`)
2. Add function to public API export
3. Update documentation (`modules/docs/ModuleName.md`)
4. Update function count in this INDEX.md
5. Test thoroughly in Memento Database

### Reporting Issues

Document issues in module's "Known Issues" section:
- Module name and version
- Function name
- Expected vs actual behavior
- Steps to reproduce

---

## Support

For questions or issues:
1. Check module documentation (`modules/docs/`)
2. Check core modules documentation (`docs/CORE_MODULES_DOCUMENTATION.md`)
3. Review CLAUDE.md for project conventions
4. Check PROJECT_MAP.md for file locations

---

**Document Version:** 1.0
**Created:** 2026-03-19
**Author:** ASISTANTO
**Status:** 🟢 Complete
