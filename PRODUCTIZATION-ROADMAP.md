# Productization Roadmap

**Status:** Planning Phase
**Last Updated:** 2026-03-25
**Goal:** Transform MementoDB Framework from a single-customer Slovak deployment into a sellable, localizable product for small businesses worldwide.

---

## Current State Analysis

### What's Already Generic (Framework Logic)
- IIFE module pattern with lazy loading
- 4-level dependency chain architecture
- Safe field access pattern (`safeGet`, `safeSet`)
- Logging infrastructure (`addDebug`, `addError`, `addInfo`)
- Time operations (rounding, difference, break calculation)
- Validation patterns (time, date, number, range, email)
- Aggregator/facade pattern (MementoUtils)
- Telegram Bot API integration
- AI service integration (OpenAI, Claude)
- GPS/OSRM routing
- Record tracking and ID conflict resolution

### What's Hardcoded (Customer-Specific)
- **MementoConfig.js** (2,081 lines): 1000+ field names in Slovak, 40+ library names in Slovak
- **MementoDate.js**: Slovak holidays hardcoded
- **MementoCalculations.js**: Slovak VAT rates (20%/10%), overtime multiplier (1.25x)
- **MementoFormatting.js**: EUR currency, European decimal format
- **MementoCore.js**: Some Slovak strings in UI helpers (`getDayNameSK`, `selectOsobaForm`)
- **Global settings**: `Europe/Bratislava` timezone, `sk_SK` language, `DD.MM.YYYY` date format
- **All library scripts**: Slovak field names throughout

### Coupling Assessment
| Module | Generic % | Changes Needed |
|--------|-----------|----------------|
| MementoTime | 98% | None |
| MementoValidation | 95% | Minor: phone format locale |
| MementoFormatting | 70% | Moderate: currency/locale from config |
| MementoCore | 85% | Minor: remove Slovak string helpers or make configurable |
| MementoCalculations | 75% | Moderate: VAT rates, overtime from config |
| MementoDate | 50% | Major: holidays from config, not hardcoded |
| MementoBusiness | 60% | Major: field names via config (mostly done) |
| MementoConfig | 0% | Complete restructure into schema + template |
| MementoUtils | 100% | None |
| MementoTelegram | 90% | None (already config-driven) |
| MementoAI | 95% | None |
| MementoGPS | 95% | None |

---

## Phase 1: Configuration Split (HIGH PRIORITY)

**Goal:** Separate framework structure from customer values.

### 1.1 Create MementoConfigSchema.js (NEW)

A framework file that defines WHAT configuration is expected, with defaults and validation.

```javascript
var MementoConfigSchema = (function() {
    'use strict';
    return {
        version: "1.0.0",

        // Define which libraries the framework supports
        requiredLibraries: ['attendance', 'employee'],
        optionalLibraries: ['workRecords', 'rideLog', 'cashBook', 'orders', 'quotes',
                            'material', 'dailyReport', 'workReport', 'rideReport', 'machinesReport'],

        // Define required fields per library
        libraryFields: {
            attendance: {
                required: ['date', 'arrival', 'departure', 'employee'],
                optional: ['breakTime', 'workTime', 'overtime', 'totalWages', 'type', 'notes']
            },
            employee: {
                required: ['name', 'hourlyRate'],
                optional: ['nick', 'dailyWage', 'position', 'active', 'telegramId']
            }
            // ... more libraries
        },

        // Default business rules (customer overrides in MementoConfig)
        defaults: {
            locale: {
                timezone: "UTC",
                dateFormat: "YYYY-MM-DD",
                timeFormat: "HH:mm",
                currency: "USD",
                currencySymbol: "$",
                language: "en"
            },
            businessRules: {
                workSchedule: { standardHours: 8, quarterHourRounding: true },
                overtime: { multiplier: 1.5 },
                vat: { standardRate: 0.20, reducedRate: 0.10 }
            },
            holidays: []  // Empty by default, customer fills in
        },

        // Validate customer config
        validate: function(customerConfig) {
            var errors = [];
            // Check required libraries exist
            // Check required fields exist per library
            // Return { valid, errors }
        }
    };
})();
```

### 1.2 Refactor MementoConfig.js into Customer Template

Transform from monolithic config into a clearly marked customer template:

```javascript
var MementoConfig = (function() {
    'use strict';

    // =============================================
    // CUSTOMER CONFIGURATION - EDIT THIS SECTION
    // =============================================
    // Map YOUR Memento Database field names below.
    // Semantic keys (left side) stay the same.
    // Values (right side) = YOUR actual field names.
    // =============================================

    var MY_LOCALE = {
        timezone: "Europe/Bratislava",   // e.g., "America/New_York", "Asia/Tokyo"
        dateFormat: "DD.MM.YYYY",         // e.g., "MM/DD/YYYY", "YYYY-MM-DD"
        timeFormat: "HH:mm",
        currency: "EUR",                  // e.g., "USD", "GBP", "CZK"
        currencySymbol: "€",
        language: "sk"                    // e.g., "en", "de", "cs"
    };

    var MY_LIBRARIES = {
        attendance: "Dochádzka",          // YOUR attendance library name
        employee: "Zamestnanec",          // YOUR employee library name
        // ... fill in your library names
    };

    var MY_FIELDS = {
        attendance: {
            date: "Dátum",               // YOUR date field name
            arrival: "Príchod",           // YOUR arrival time field name
            departure: "Odchod",          // YOUR departure time field name
            employee: "Zamestnanec",      // YOUR employee link field name
            // ...
        },
        common: {
            debugLog: "Debug_Log",
            errorLog: "Error_Log",
            info: "info"
        }
        // ...
    };

    var MY_BUSINESS_RULES = {
        workSchedule: { standardHours: 8 },
        overtime: { multiplier: 1.25 },    // Slovak law: 1.25x; US typical: 1.5x
        vat: { standardRate: 0.20, reducedRate: 0.10 }
    };

    var MY_HOLIDAYS = [
        { month: 1, day: 1, name: "New Year's Day" },
        { month: 1, day: 6, name: "Epiphany" },
        // ... your country's holidays
    ];

    // =============================================
    // DO NOT EDIT BELOW - Framework merges your config
    // =============================================
    // ... merge logic + existing public API (unchanged)
})();
```

### 1.3 Save Current Config as Example

```
configs/
  sk-construction/
    MementoConfig.sk.js    # Current Slovak config (reference example)
    README.md              # "Slovak construction company example"
  en-starter/
    MementoConfig.en.js    # English starter template
    README.md              # "Minimal English configuration"
```

### Migration Path
- **Existing Slovak deployment:** Copy current MementoConfig.js to `configs/sk-construction/` as backup. New MementoConfig.js contains same values in new structure. **Zero breaking changes** - all `getField()`, `getLibrary()` calls return identical values.
- **New customers:** Start from `configs/en-starter/MementoConfig.en.js`, fill in their field names.

---

## Phase 2: Generalize Core Modules

### 2.1 MementoDate.js - Externalize Holidays
- Move `SLOVAK_FIXED_HOLIDAYS` array to `config.holidays`
- `isHoliday(date)` reads from config instead of hardcoded array
- Easter calculation remains generic (Computus algorithm), just needs year
- Add `config.holidays` format: `[{ month: 1, day: 1, name: "..." }, ...]`

### 2.2 MementoCalculations.js - Rates from Config
- `calculateOvertime()` reads multiplier from `config.businessRules.overtime.multiplier`
- `calculateVAT()` reads rate from `config.businessRules.vat.standardRate`
- `STANDARD_WORK_DAY_HOURS` from `config.businessRules.workSchedule.standardHours`
- Functions signatures stay the same, just internal defaults change

### 2.3 MementoFormatting.js - Locale-Aware
- `formatMoney()` reads currency from `config.locale.currency`/`config.locale.currencySymbol`
- Number formatting respects locale (comma vs period for decimals)
- Date formatting uses `config.locale.dateFormat`

### 2.4 MementoCore.js - Remove Slovak-Specific Helpers
- `getDayNameSK()` → `getDayName()` with locale support
- `selectOsobaForm()` → generic pluralization or locale-specific
- Keep backward compatibility: old function names still work, call new ones internally

---

## Phase 3: English Starter Templates

### 3.1 Directory Structure
```
examples/
  starter-templates/
    attendance/
      Attendance.Calc.Main.js       # Basic attendance calculation
      Attendance.Notif.Individual.js # Notification example
      README.md                      # Setup instructions
    invoicing/
      Invoice.Calc.VAT.js           # VAT calculation example
      README.md
    employee-management/
      Employee.Calc.Universal.js     # Employee processing example
      README.md
    inventory/
      Inventory.BulkAction.UpdatePrices.js
      README.md
```

### 3.2 Guidelines
- English semantic field names in config example
- English comments in starter templates
- Business logic identical to existing scripts
- Each template is a minimal working example

---

## Phase 4: Localization Architecture

### 4.1 Language Packs (Future)
```
locales/
  sk/
    holidays.js          # Slovak holidays
    translations.js      # UI strings in Slovak
    config-example.js    # Full Slovak config example
  en/
    holidays.js          # No default holidays (customer adds theirs)
    translations.js      # English UI strings
    config-example.js    # English config example
  cs/
    holidays.js          # Czech holidays
    translations.js      # Czech UI strings
  de/
    holidays.js          # German holidays
    translations.js      # German UI strings
```

### 4.2 Translation Strategy
- UI strings (dialog titles, error messages) come from language pack
- Field names are ALWAYS customer-configured (never translated by framework)
- Business constants (VAT rates, overtime) are country-specific, in config
- Holidays are country-specific, in locale pack or config

### 4.3 Loading Pattern
```javascript
// Customer chooses locale in MementoConfig:
var MY_LOCALE = { language: "sk" };

// Framework loads appropriate language pack:
var strings = MementoLocale.getStrings(config.locale.language);
// strings.validation.required = "This field is required"
// strings.ui.calculationComplete = "Calculation complete"
```

---

## Phase 5: Distribution & Packaging

### 5.1 GitHub Releases
```
memento-framework-v1.0.0.zip
├── QUICK-START.md              # 5-minute setup guide
├── llms.txt                    # AI context (compact)
├── llms-full.txt               # AI context (complete API)
├── core/                       # Framework modules (copy to Memento)
├── configs/
│   ├── en-starter/             # Start here
│   └── sk-example/             # Full example
├── examples/
│   └── starter-templates/      # Example scripts
├── locales/                    # Language packs
└── docs/                       # Documentation
```

### 5.2 Setup Wizard (Future - setup.html)
A single HTML file (no server needed) that:
1. Asks customer for their Memento Database library names
2. Asks for field names per library
3. Asks for locale (country, timezone, currency)
4. Generates a ready-to-use `MementoConfig.js`
5. Provides copy-paste instructions for Memento Database

### 5.3 Documentation
- `QUICK-START.md` - 5-minute guide: copy files, edit config, run
- `CONFIGURATION-GUIDE.md` - Detailed config reference
- `CUSTOMIZATION-GUIDE.md` - How to create custom scripts
- Video tutorials (future)

---

## Implementation Priority

| Priority | Phase | Effort | Impact | Risk |
|----------|-------|--------|--------|------|
| 1 | Phase 1.1-1.2: Config split | Large | Critical | Medium (must not break existing) |
| 2 | Phase 2.1: Externalize holidays | Small | High | Low |
| 3 | Phase 2.2: Rates from config | Small | High | Low |
| 4 | Phase 2.3: Locale-aware formatting | Medium | High | Low |
| 5 | Phase 3: English templates | Medium | High | None (additive) |
| 6 | Phase 2.4: Core Slovak cleanup | Medium | Medium | Medium |
| 7 | Phase 4: Language packs | Large | Medium | Low |
| 8 | Phase 5: Packaging | Medium | High | None |

---

## Success Criteria

1. **Backward compatibility:** Existing Slovak deployment works identically after refactoring
2. **New customer test:** English-speaking customer can set up a basic attendance tracker using only the framework + docs
3. **AI test:** An AI model with only `llms.txt` can correctly generate a new script
4. **Localization test:** A Czech or German customer can configure the framework for their locale
5. **Time to first script:** New customer goes from zero to working script in under 30 minutes

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing deployment | Critical | Save current config as backup; run side-by-side test |
| MementoConfig API change | High | Keep exact same public API (getField, getLibrary, etc.) |
| Performance regression | Medium | Lazy loading already in place; config merge is one-time |
| Memento Database load order issues | Medium | ConfigSchema loads before Config; document clearly |
| Scope creep | Medium | Phased approach; Phase 1 alone delivers 80% of value |
