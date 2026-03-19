# Memento Database Project - Štruktúra

## Organizácia projektu

```
memento-claude/
├── core/                           # Základné moduly systému (17 modules - Phase 3/4 complete)
│   ├── MementoConfig7.js          # v7.1.0 - Centralized configuration + MODULE_INFO
│   ├── MementoCore7.js            # v7.6.0 - Foundation utilities (logging, validation, field access)
│   │
│   ├── MementoTime.js             # v1.1.0 🆕 Phase 3 - Time operations, 15min rounding
│   ├── MementoDate.js             # v1.0.0 🆕 Phase 3 - Slovak calendar, holidays, weekends
│   ├── MementoValidation.js       # v1.0.0 🆕 Phase 3 - Validation patterns
│   ├── MementoFormatting.js       # v1.0.0 🆕 Phase 3 - Money, duration, date formatters
│   ├── MementoCalculations.js     # v1.0.0 🆕 Phase 3 - Wages, overtime, VAT calculations
│   │
│   ├── MementoBusiness.js         # v8.0.0 ♻️ REFACTORED - High-level workflows (1,050 lines, was 3,942)
│   ├── MementoUtils7.js           # v8.1.0 - Lazy-loading aggregator for all modules
│   │
│   ├── MementoAI7.js              # v7.1.0 - AI services (OpenAI, Claude)
│   ├── MementoTelegram8.js        # v8.2.0 - Telegram Bot API (depends on Core only)
│   ├── MementoGPS.js              # v1.1.0 - GPS utilities and routing
│   ├── MementoRecordTracking.js   # v1.1.0 - Record lifecycle tracking
│   ├── MementoIDConflictResolver.js # v1.1.0 - ID conflict resolution
│   ├── MementoAutoNumber.js       # v1.1.0 ⚠️ DEPRECATED - Use utils.business.generateNextNumber()
│   └── MementoSync1.js            # v1.1.0 - PostgreSQL synchronization
│
├── libraries/                      # Knižnice Memento Database
│   ├── dochadzka/                 # Dochádzka (Attendance)
│   │   ├── Doch.Calc.Main.js
│   │   ├── Doch.Calc.Universal.js
│   │   ├── Doch.Calc.Custom.PeterBabicenko.js
│   │   ├── Doch.Trigger.BeforeDelete.js
│   │   └── Doch.Notif.Individual.js
│   │
│   ├── kniha-jazd/                # Kniha jázd (Vehicle Logbook)
│   │   ├── Knij.Calc.Main.js
│   │   ├── Knij.Action.LinkOrders.js
│   │   └── Knij.Action.SetStartEnd.js
│   │
│   ├── material/                  # Materiál (Materials Management)
│   │   ├── Mat.Calc.Receipts.js
│   │   ├── Mat.Calc.Issues.js
│   │   ├── Mat.Action.SetFields.js
│   │   ├── Mat.Action.CalcPrice.js
│   │   ├── Mat.BulkAction.SetFields.v1.0.js
│   │   ├── Mat.BulkAction.SetFields.v1.1.js
│   │   ├── Mat.BulkAction.UpdatePrices.js
│   │   ├── Mat.BulkAction.UniversalSettings.js
│   │   └── Mat.Button.CalcPrice.js
│   │
│   ├── pokladna/                  # Pokladňa (Cash Register)
│   │   ├── Pokl.Calc.VAT.js
│   │   └── Pokl.Action.PayObligations.js
│   │
│   ├── zamestnanec/               # Zamestnanec (Employee)
│   │   ├── Zam.Calc.Main.js
│   │   └── Zam.Calc.Universal.js
│   │
│   ├── zakazky/                   # Zákazky (Projects/Orders)
│   │   └── Zak.Calc.Main.js
│   │
│   └── zaznam-prac/               # Záznam prác (Work Records)
│       └── Zazp.Calc.Main.js
│
├── utils/                          # Všeobecné utility scripty
│   ├── Notif.Trigger.OnDelete.js
│   ├── Utils.Action.ExtractLibraryIDs.js
│   ├── Utils.Action.Renumber.js
│   └── Utils.Action.RenumberRecords.js
│
└── templates/                      # Šablóny pre nové scripty
```

## Závislosť modulov (v8.0+ Architecture - Phase 3/4)

### Dependency Chain - 4 Levels

```
LEVEL 0: Configuration
┌────────────────────┐
│ MementoConfig 7.1  │ (no dependencies)
└────────────────────┘
          ↓
LEVEL 1: Foundation
┌────────────────────┐
│ MementoCore 7.6    │ (depends on Config)
└────────────────────┘
          ↓
LEVEL 2: Focused Utilities (NEW in Phase 3)
┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│ MementoTime 1.1    │  │ MementoDate 1.0    │  │ MementoValidation  │
└────────────────────┘  └────────────────────┘  │      1.0           │
┌────────────────────┐  ┌────────────────────┐  └────────────────────┘
│ MementoFormatting  │  │ MementoCalculations│
│      1.0           │  │      1.0           │
└────────────────────┘  └────────────────────┘
          ↓
LEVEL 3: Business Logic
┌────────────────────────────────────────┐
│ MementoBusiness 8.0                    │
│ (orchestrates focused utilities)       │
└────────────────────────────────────────┘
          ↓
LEVEL 4: Aggregator
┌────────────────────────────────────────┐
│ MementoUtils 8.1                       │
│ (lazy-loading facade)                  │
└────────────────────────────────────────┘

SEPARATE CHAINS (no circular dependencies):
┌────────────────────┐
│ MementoTelegram 8.2│ ← Depends ONLY on MementoCore (NOT Utils)
└────────────────────┘

┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│ MementoAI 7.1      │  │ MementoGPS 1.1     │  │ Other modules...   │
└────────────────────┘  └────────────────────┘  └────────────────────┘
```

**Key Changes in v8.0:**
- ✅ MementoBusiness split into 5 focused modules (Phase 3)
- ✅ MementoTelegram separated from Utils (circular dependency fix)
- ✅ 4-level architecture for better organization
- ✅ All modules now have MODULE_INFO metadata

## Knižnice - Popis a súvislosti

### 1. Dochádzka (libraries/dochadzka/)
**Účel:** Evidencia dochádzky zamestnancov, výpočet odpracovaných hodín a miezd

**Scripty:**
- `Dochádzka Prepočet 7.js` - Hlavný prepočtový engine
  - Výpočet hodín s 15-minútovým zaokrúhlením
  - Výpočet miezdy (hodinové sadzby, prémie, zrážky)
  - Vytváranie záväzkov pre zamestnancov

- `Dochádzka Universal Attendance Calculator 1.0.js` - Univerzálny kalkulátor
- `Peter Babičenko Attendance Calculator 1.0.js` - Špecializovaný kalkulátor
- `Dochádzka Individual Notifications 3.0.js` - Individuálne notifikácie
- `Dochádzka Before Delete Cleanup.js` - Cleanup pri mazaní záznamov

**Súvislosti:**
- Linkuje na knižnicu Zamestnanec (employee rates)
- Vytvára záväzky pre zamestnancov
- Prepojenie s MementoBusiness7.js pre business logiku

### 2. Kniha jázd (libraries/kniha-jazd/)
**Účel:** Evidencia jazd vozidiel, výpočet kilometrov a nákladov

**Scripty:**
- `Kniha jázd Prepočet 9.js` - Hlavný prepočtový engine
- `Kniha jázd Nalinkuj zákazky.js` - Linkovanie na zákazky
- `Kniha jázd nastavenie Štart a Cieľ.js` - Nastavenie štartovacích/cieľových bodov

**Súvislosti:**
- Linkuje na knižnicu Zákazky
- Používa MementoGPS.js pre GPS funkcie

### 3. Materiál (libraries/material/)
**Účel:** Správa materiálu, príjemky, výdajky, cenové prepočty

**Scripty:**
- `Príjemky materiálu Prepočet.js` - Prepočet príjemiek
- `Výdajky materiálu Prepočet.js` - Prepočet výdajiek
- `Materiál Universal Bulk Settings 2.0.js` - Hromadné nastavenia v2.0
- `Materiál Nastavenie polí Action.js` - Nastavenie polí (akcia)
- `Materiál Nastavenie polí Bulk Action.js` - Hromadné nastavenie polí
- `Materiál Nastavenie polí Bulk Action v1.1.js` - Hromadné nastavenie v1.1
- `Materiál Prepočet ceny Action.js` - Prepočet ceny (akcia)
- `Materiál Prepočet ceny Bulk Action.js` - Hromadný prepočet ceny
- `Materiál Prepočet ceny Button.js` - Prepočet ceny (tlačidlo)

**Súvislosti:**
- Linkuje na cenníky materiálu
- Prepojenie s Zákazkami a Záznamom prác

### 4. Pokladňa (libraries/pokladna/)
**Účel:** Evidencia pokladničných operácií, DPH, úhrady záväzkov

**Scripty:**
- `Pokladňa prepočet dph.js` - Výpočet DPH
- `Pokladňa Úhrada záväzkov.js` - Úhrada záväzkov

**Súvislosti:**
- Linkuje na záväzky zamestnancov a dodávateľov
- Prepojenie s účtovníctvom

### 5. Zamestnanec (libraries/zamestnanec/)
**Účel:** Evidencia zamestnancov, sadzieb, prepočty

**Scripty:**
- `Zamestnanec Prepočet.js` - Hlavný prepočtový script
- `Zamestnanec Universal Calculator 2.0.js` - Univerzálny kalkulátor v2.0

**Súvislosti:**
- Poskytuje dáta pre Dochádzku (hodinové sadzby)
- Vytvára rate tables pre zamestnancov

### 6. Zákazky (libraries/zakazky/)
**Účel:** Evidencia zákaziek/projektov, výpočet nákladov a výnosov

**Scripty:**
- `Zákazky Prepočet.js` - Hlavný prepočtový engine

**Súvislosti:**
- Linkuje na Záznam prác
- Linkuje na Knihu jázd
- Prepojenie s Materials a cenníkmi

### 7. Záznam prác (libraries/zaznam-prac/)
**Účel:** Evidencia vykonaných prác, výpočet hodín a nákladov

**Scripty:**
- `Záznam prác Prepočet.js` - Hlavný prepočtový engine

**Súvislosti:**
- Linkuje na Zákazky
- Linkuje na Zamestnancov (sadzby)
- Vytvára work statements

## Core moduly - Popis (v8.0+)

Všetky core moduly sú umiestnené priamo v `core/` adresári pre jednoduchú prístupnosť z Memento Database.

**Total:** 17 core modules (Phase 3/4: +5 new focused utilities)

### Foundation Layer

#### core/MementoConfig7.js (v7.1.0)
- Centrálna konfigurácia - single source of truth
- Field name mappings pre všetky knižnice
- Library IDs a metadata
- MODULE_INFO registry pre všetky moduly
- Nastavenia pre všetky scripty

#### core/MementoCore7.js (v7.6.0)
- Foundation utilities - základ všetkých skriptov
- Safe field access (safeGet, safeSet, safeGetLinks)
- Logging system (addDebug, addError, addInfo)
- Validation utilities
- Icon management
- MODULE_INFO standard implementation

### Focused Utilities Layer (🆕 NEW in Phase 3)

#### core/MementoTime.js (v1.1.0)
- Time operations - 15-minute rounding (Slovak standard)
- Work hours calculation with overnight support
- Break time calculation (Slovak labor law)
- Time formatting and conversions
- Eliminuje 35-45% code duplication across 5+ attendance scripts

#### core/MementoDate.js (v1.0.0)
- Slovak calendar utilities
- Holiday detection (13 fixed + movable holidays)
- Weekend checking
- Week number calculation (ISO 8601)
- Workdays calculation
- Date parsing and formatting

#### core/MementoValidation.js (v1.0.0)
- Validation patterns pre všetky typy polí
- Time validation (allowFuture, maxHours, etc.)
- Date validation (minDate, maxDate, allowPast)
- Number validation (min, max, decimals)
- Required fields checking
- Email and phone validation (Slovak format)

#### core/MementoFormatting.js (v1.0.0)
- Display formatters pre všetky výstupy
- Money formatting (Slovak: "1 250,50 €")
- Duration formatting ("8:30")
- Date/time formatting
- Employee name formatting
- Phone number formatting (Slovak: "+421 901 234 567")
- Markdown generation for Telegram

#### core/MementoCalculations.js (v1.0.0)
- Business calculations - mzdy, nadčasy, DPH
- Daily wage with overtime (Slovak law)
- Overtime calculation (standard 8h + 25% bonus)
- Break time calculation
- VAT calculation and extraction
- Profitability calculation
- Proration logic

### Business Logic Layer

#### core/MementoBusiness.js (v8.0.0 - ♻️ REFACTORED)
- High-level business workflows only
- Employee processing (orchestrates focused utilities)
- Report generation
- Obligation management
- **Reduced from 3,942 to 1,050 lines (73% reduction)**
- Depends on: Time, Date, Validation, Formatting, Calculations

### Aggregator Layer

#### core/MementoUtils7.js (v8.1.0)
- Lazy-loading aggregator pre všetky moduly
- Single import point: `var utils = MementoUtils;`
- Comprehensive dependency checking (`checkAllDependencies`)
- Backward compatibility facade
- Access patterns: `utils.time`, `utils.date`, `utils.validation`, etc.

### Integration Layer

#### core/MementoAI7.js (v7.1.0)
- OpenAI GPT-4 integration
- Claude API integration
- HTTP wrapper pre AI services
- Image analysis
- Access via: `utils.ai`

#### core/MementoTelegram8.js (v8.2.0)
- Telegram Bot API integration
- Message sending/editing/deletion
- Group and thread support
- Notification aggregation
- **⚠️ NOT in MementoUtils** (circular dependency fix)
- Import directly: `var telegram = typeof MementoTelegram !== 'undefined' ? MementoTelegram : null;`

#### core/MementoGPS.js (v1.1.0)
- GPS coordinate utilities
- Distance calculations
- OSRM routing API integration
- Location services
- Access via: `utils.gps`

### Infrastructure Layer

#### core/MementoRecordTracking.js (v1.1.0)
- Record lifecycle tracking
- Creation/modification timestamps
- Edit mode management

#### core/MementoIDConflictResolver.js (v1.1.0)
- ID conflict resolution for team environments
- Automatic ID regeneration

#### core/MementoAutoNumber.js (v1.1.0)
- ⚠️ DEPRECATED - Use `utils.business.generateNextNumber()` instead
- Auto-numbering for records

#### core/MementoSync1.js (v1.1.0)
- PostgreSQL synchronization
- Bulk data sync
- Specialized module (import on demand)

## Utility Scripts

### Notifications Delete Trigger.js
- Cleanup notifikácií pri mazaní záznamov
- Univerzálny pre všetky knižnice

### Extract Library IDs.js
- Extrakcia Library IDs z Memento Database
- Development utility

### Library Renumber Action.js
- Prečíslovanie záznamov v knižnici
- Univerzálny pre všetky knižnice

### Utils Prečísluj záznamy.js
- Utility pre prečíslovanie
- Všeobecný helper

## Konvencie pomenovania

### Scripty typu "Prepočet"
- Hlavné prepočtové engines pre knižnice
- Nazývané: `{Knižnica} Prepočet.js`
- Primárna business logika

### Scripty typu "Action"
- Jednorázové akcie/operácie
- Nazývané: `{Knižnica} {Operácia} Action.js`

### Scripty typu "Bulk Action"
- Hromadné operácie
- Nazývané: `{Knižnica} {Operácia} Bulk Action.js`

### Scripty typu "Universal Calculator"
- Univerzálne kalkulátory
- Nazývané: `{Knižnica} Universal Calculator {verzia}.js`

### Scripty typu "Notifications"
- Notification handling
- Nazývané: `{Knižnica} {Typ} Notifications {verzia}.js`

## Git Synchronizácia

**Synchronizované:**
- core/ - všetky core moduly
- libraries/ - všetky library scripty
- utils/ - utility scripty
- templates/ - šablóny

**Ignorované (lokálne):**
- telegram-integration/
- python-utilities/
- workflows/
- logs-temp/
- kb-docs/
- config/
- Debug*, Test*, Template* súbory

## Naming Convention

**Formát názvu scriptu:** `[Knižnica].[Typ].[Názov].js`

**Príklady:**
- `Doch.Calc.Main.js` - Hlavný prepočet dochádzky
- `Mat.Action.SetFields.js` - Akcia nastavenia polí materiálu
- `Notif.Trigger.OnDelete.js` - Trigger cleanup notifikácií

**Verzia** je uvedená v hlavičke scriptu, NIE v názve súboru!

Pre úplnú konvenciu pomenovania pozri: **MEMENTO_NAMING_CONVENTION.md**

## Použitie v Claude Code

Pri práci so scriptami referencovať:
- `core/MementoCore7.js:123` - core utilities
- `core/MementoConfig7.js:45` - configuration
- `libraries/dochadzka/Doch.Calc.Main.js:456` - attendance calculation
- `libraries/material/Mat.Action.SetFields.js:78` - material fields setup

**Dôležité:** Všetky core moduly sú v `core/` adresári (bez podadresárov) pre jednoduchšiu prístupnosť z Memento Database.

Claude Code má prístup k tejto knowledge base a vie:
1. Kde nájsť príslušné scripty
2. Aké sú závislosti medzi modulmi
3. Ktoré scripty spolu súvisia
4. Kde pridávať nové funkcie
5. Ako pomenovať nové scripty
6. Že core moduly sú všetky v `core/` root adresári
