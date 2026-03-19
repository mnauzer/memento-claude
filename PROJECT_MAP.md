# Memento-Claude Project Map

**Posledná aktualizácia:** 2026-03-19
**Celkový počet súborov:** 77 JavaScript files (Phase 3/4 complete: +5 focused modules)
**Verzia projektu:** 8.0.0

---

## Quick Navigation

- [Core Modules](#core-modules) - 25 základných modulov (univerzálne) - **+5 new in Phase 3/4**
- [Library-Specific Modules](#library-specific-modules) - Moduly pre konkrétne knižnice (nový adresár `modules/`)
- [Library Scripts](#library-scripts) - Obchodná logika po knižniciach
  - [Evidencia - Denné záznamy](#evidencia---denné-záznamy)
  - [Evidencia pomocné - Výkazy](#evidencia-pomocné---výkazy)
  - [Cenníky a sklad](#cenníky-a-sklad)
  - [Obchodné dokumenty](#obchodné-dokumenty)
  - [Firemné knižnice - Master data](#firemné-knižnice---master-data)
- [Utilities](#utilities) - Cross-library nástroje
- [Templates](#templates) - Šablóny skriptov
- [Documentation](#documentation) - Dokumentácia
- [Obsolete Files](#obsolete-files) - Archivované súbory

---

## Core Modules (25 súborov)

**Architecture:** Phase 3/4 (March 2026) - Split MementoBusiness monolith into focused modules

### Foundation Layer (LEVEL 0-1)

| Súbor | Verzia | Lines | Účel | Závislosti |
|-------|--------|-------|------|-------------|
| MementoConfig.js | **8.0.0** | ~600 | Centrálna konfigurácia - názvy knižníc, polí, ikon, konštánt, module metadata | - |
| MementoCore.js | **8.0.0** | ~1,200 | Foundation utilities - logging, validácia, safe field access, MODULE_INFO | MementoConfig |

### Focused Utilities Layer (LEVEL 2 - NEW in Phase 3)

| Súbor | Verzia | Lines | Účel | Závislosti |
|-------|--------|-------|------|-------------|
| **MementoTime.js** | **1.1.0** | **370** | **Time operations - 15min rounding, work hours, time formatting** | **moment.js** |
| **MementoDate.js** | **1.0.0** | **470** | **Slovak calendar - holidays, weekends, workdays, week numbers** | **MementoConfig** |
| **MementoValidation.js** | **1.0.0** | **600** | **Validation patterns - time, date, number, required fields** | **MementoCore** |
| **MementoFormatting.js** | **1.0.0** | **550** | **Formatters - money, duration, date, phone, markdown** | **-** |
| **MementoCalculations.js** | **1.0.0** | **750** | **Business calculations - wages, overtime, VAT, profitability** | **MementoTime, Date** |

### Business Logic Layer (LEVEL 3)

| Súbor | Verzia | Lines | Účel | Závislosti |
|-------|--------|-------|------|-------------|
| MementoBusiness.js | **8.0.0** | **1,050** | **High-level workflows - employee processing, reports (REFACTORED from 3,942 lines)** | Time, Date, Validation, Formatting, Calculations |

**Note:** `.obsolete/core/MementoBusiness7.js` (3,942 lines) archived for reference.

### Aggregator Layer (LEVEL 4)

| Súbor | Verzia | Lines | Účel | Závislosti |
|-------|--------|-------|------|-------------|
| MementoUtils.js | **8.1.0** | ~1,800 | Lazy-loading agregátor všetkých modulov, dependency checking, backward compatibility facade | All above |

### Integration Layer

| Súbor | Verzia | Lines | Účel | Závislosti |
|-------|--------|-------|------|-------------|
| MementoAI.js | **8.0.0** | ~800 | AI integrácia - OpenAI GPT-4, Claude API, image analysis | MementoCore, Config |
| MementoTelegram.js | **8.2.0** | ~1,200 | Telegram Bot API - messaging, groups, threads (**NOT in Utils - circular dependency fix**) | **MementoCore** (NOT Utils) |
| MementoGPS.js | **1.1.0** | ~400 | GPS utilities - coordinates, distance calculations, OSRM routing | MementoCore, Config |
| MementoSync.js | **1.1.0** | ~600 | PostgreSQL synchronizácia | MementoCore, Config |

### Infrastructure Layer

| Súbor | Verzia | Lines | Účel | Závislosti |
|-------|--------|-------|------|-------------|
| MementoRecordTracking.js | **1.1.0** | ~300 | Sledovanie vytvorenia/úpravy záznamov | MementoCore, Config |
| MementoIDConflictResolver.js | **1.1.0** | ~250 | Riešenie ID konfliktov (team verzia) | MementoCore, Config |
| MementoAutoNumber.js | **1.1.0** | ~200 | ⚠️ DEPRECATED - Use `utils.business.generateNextNumber()` | MementoCore, Config |
| MementoConfigProjects.js | 1.x | ~150 | Optimizovaná konfigurácia pre projekty | MementoConfig |

### Deprecated Modules

| Súbor | Status | Use Instead |
|-------|--------|-------------|
| MementoVAT.js | ⚠️ DEPRECATED | `utils.calculations.calculateVAT()` |
| MementoAutoNumber.js | ⚠️ DEPRECATED | `utils.business.generateNextNumber()` |

### Reusable Library Modules

**Note:** Library-specific modules have been moved to their respective library directories (`libraries/*/`). Only universal core modules remain in `core/`.

| Súbor | Verzia | Účel | Závislosti |
|-------|--------|------|-------------|
| CP.Action.CreateOrder.Wrapper.js | 1.x | Wrapper pre CreateOrder modul (v core/ pre kompatibilitu) | CP.Action.CreateOrder.Module |

---

## Library-Specific Modules

**Umiestnenie:** `modules/`
**Status:** 🟢 Active - Phase 2 Complete
**Účel:** Reusable moduly pre konkrétne knižnice (eliminujú duplikáciu kódu)

### Architecture Overview

```
modules/                        # Library-specific reusable modules
├── README.md                   # Module directory documentation (9,906 bytes)
├── DailyReport.js              # ✅ v1.0 - Daily report updates (366 lines)
├── Pokladna.js                 # (Planned) Cash register operations
├── Dochadzka.js                # (Planned) Attendance calculations
├── CenovePonuky.js             # (Planned) Quote calculations
├── Zakazky.js                  # (Planned) Order calculations
├── Material.js                 # (Planned) Material operations
├── ZaznamPrac.js               # (Planned) Work records
├── KnihaJazd.js                # (Planned) Vehicle logbook
└── Zamestnanci.js              # (Planned) Employee aggregations
```

### Key Differences: `core/` vs `modules/` vs `libraries/`

| Directory | Scope | Examples | Usage |
|-----------|-------|----------|-------|
| **`core/`** | Universal (všetky knižnice) | MementoCore, MementoVAT, MementoTime | `MementoVAT.calculateVAT()` |
| **`modules/`** | Library-specific (jedna knižnica) | Pokladna.js, Dochadzka.js | `Pokladna.payObligations()` |
| **`libraries/*/`** | Legacy modules (stará štruktúra) | CP.Calculate.Module.js | Budú refaktorované do `modules/` |

### Planned Modules (Priority Order)

| Module | Status | Target Scripts | Expected Reduction |
|--------|--------|----------------|-------------------|
| **DailyReport.js** | ✅ Complete (v1.0) | 4 update scripts | Shared pattern extraction |
| **Pokladna.js** | 📋 Planned | Pokl.Action.PayObligations.js | 1,113 → 200 lines |
| **CenovePonuky.js** | 📋 Planned | CenPon.Calculate.js | 1,278 → 800 lines |
| **Dochadzka.js** | 📋 Planned | 5 calculation scripts | 35-45% → 10% duplication |
| **Zakazky.js** | 📋 Planned | Zak.Calc.Main.js | Order calculation logic |
| **Material.js** | 📋 Planned | Mat.Calc.Receipts.js | Material operations |
| **ZaznamPrac.js** | 📋 Planned | Zazp.Calc.Main.js | Work record logic |
| **KnihaJazd.js** | 📋 Planned | Knij.Calc.Main.js | Vehicle logbook logic |

### Module Template

All modules follow IIFE pattern (see `core/MementoVAT.js` as reference):

```javascript
var ModuleName = (function() {
    'use strict';

    var MODULE_INFO = {
        name: "ModuleName",
        version: "1.0",
        author: "ASISTANTO"
    };

    return {
        info: MODULE_INFO,
        mainFunction: function(entry, config) { ... }
    };
})();
```

### Documentation

- **README:** `modules/README.md` - Comprehensive module documentation
- **Reference:** `core/MementoVAT.js` - Perfect module structure example
- **Plan:** Implementation plan in project root

---

## Library Scripts

### Evidencia - Denné záznamy

#### Dochádzka (dochadzka/) - 12 súborov

| Súbor | Verzia | Účel | Trigger | Používa |
|-------|--------|------|---------|---------|
| Doch.Calc.Module.js | 1.x | **[MODUL]** Prepočet dochádzky - reusable modul | - | MementoUtils |
| Doch.Calc.Main.js | 9.0 | Hlavný prepočet dochádzky | After Save | MementoUtils, Doch.Calc.Module |
| Doch.Calc.Universal.js | 8.0 | Univerzálny prepočet pre všetkých zamestnancov | After Save | MementoUtils |
| Doch.Calc.Custom.PeterBabicenko.js | 1.0 | Custom prepočet pre Petra Babicenka | After Save | MementoUtils |
| Doch.Trigger.BeforeDelete.js | 1.0 | Before delete handler | Before Delete | MementoUtils |
| Doch.Trigger.Calculate.js | 1.0 | Calculation trigger | After Save | Doch.Calc.Main |
| Doch.Notif.Individual.js | 3.0 | Individuálne Telegram notifikácie | Manual/Scheduled | MementoTelegram |
| Doch.Notif.Group.js | 2.0 | Skupinové Telegram notifikácie | Manual/Scheduled | MementoTelegram |
| Doch.Update.DailyReport.js | 1.0 | Aktualizácia denného reportu | After Save | MementoUtils |
| Doch.Action.SetFields.js | 1.0 | Manual field setting action | Button | MementoUtils |
| Doch.BulkAction.Recalculate.js | 1.0 | Bulk prepočet viacerých záznamov | Bulk Action | MementoUtils |
| Doch.Button.QuickCalc.js | 1.0 | Quick calculation button | Button | Doch.Calc.Main |

#### Záznam prác (zaznam-prac/) - 2 súbory

| Súbor | Verzia | Účel | Trigger | Používa |
|-------|--------|------|---------|---------|
| Zazp.Calc.Main.js | 1.0 | Hlavný prepočet záznamu prác | After Save | MementoUtils |
| Zazp.Update.DailyReport.js | 1.0 | Aktualizácia denného reportu | After Save | MementoUtils |

#### Kniha jázd (kniha-jazd/) - 3 súbory

| Súbor | Verzia | Účel | Trigger | Používa |
|-------|--------|------|---------|---------|
| Knij.Calc.Main.js | 2.0 | Hlavný prepočet knihy jázd | After Save | MementoUtils, MementoGPS |
| Knij.Action.SetStartEnd.js | 1.0 | Nastavenie začiatku/konca trasy | Button | MementoUtils |
| Knij.Update.DailyReport.js | 1.0 | Aktualizácia denného reportu | After Save | MementoUtils |

#### Pokladňa (pokladna/) - 3 súbory

| Súbor | Verzia | Účel | Trigger | Používa |
|-------|--------|------|---------|---------|
| Pokl.Calc.VAT.js | 1.0 | Prepočet DPH | After Save | MementoUtils |
| Pokl.Action.PayObligations.js | 1.0 | Vyplatenie záväzkov | Button | MementoUtils |
| Pokl.Update.DailyReport.js | 1.0 | Aktualizácia denného reportu | After Save | MementoUtils |

#### Denný report (denny-report/) - 1 súbor

| Súbor | Verzia | Účel | Trigger | Používa |
|-------|--------|------|---------|---------|
| DenRep.Calc.Main.js | 2.0 | Hlavný prepočet denného reportu | After Save | MementoUtils |

---

### Evidencia pomocné - Výkazy

#### Výkaz prác (vykaz-prac/) - 1 súbor

| Súbor | Verzia | Účel | Trigger | Používa |
|-------|--------|------|---------|---------|
| VykPr.UpdateInfo.js | 1.0 | Aktualizácia info poľa výkazu | After Save | MementoUtils |

#### Výkaz dopravy (vykaz-dopravy/) - Pripravený adresár

**Status:** 📁 Adresár vytvorený, žiadne skripty zatiaľ
**Očakávaná skratka:** VykDop

#### Výkaz strojov (vykaz-strojov/) - Pripravený adresár

**Status:** 📁 Adresár vytvorený, žiadne skripty zatiaľ
**Očakávaná skratka:** VykStr

#### Výkaz materiálu (vykaz-materialu/) - Pripravený adresár

**Status:** 📁 Adresár vytvorený, žiadne skripty zatiaľ
**Očakávaná skratka:** VykMat

---

### Cenníky a sklad

#### Materiál (material/) - 8 súborov

| Súbor | Verzia | Účel | Trigger | Používa |
|-------|--------|------|---------|---------|
| Mat.Calc.Receipts.js | 1.0 | Prepočet príjmov materiálu | After Save | MementoUtils |
| Mat.Calc.Issues.js | 1.0 | Prepočet výdajov materiálu | After Save | MementoUtils |
| Mat.Action.SetFields.js | 1.0 | Nastavenie polí | Button | MementoUtils |
| Mat.Action.CalcPrice.js | 1.0 | Výpočet ceny | Button | MementoUtils |
| Mat.BulkAction.SetFields.v1.1.js | 1.1 | Hromadné nastavenie polí (aktuálna verzia) | Bulk Action | MementoUtils |
| Mat.BulkAction.UniversalSettings.js | 1.0 | Univerzálne hromadné nastavenia | Bulk Action | MementoUtils |
| Mat.BulkAction.UpdatePrices.js | 1.0 | Hromadná aktualizácia cien | Bulk Action | MementoUtils |
| Mat.Button.CalcPrice.js | 1.0 | Button pre výpočet ceny | Button | Mat.Action.CalcPrice |

#### Cenník prác (cennik-prac/) - Pripravený adresár

**Status:** 📁 Adresár vytvorený, žiadne skripty zatiaľ
**Očakávaná skratka:** CenPr

---

### Obchodné dokumenty

#### Cenové ponuky (cenove-ponuky/) - 10 súborov

| Súbor | Verzia | Účel | Trigger | Používa |
|-------|--------|------|---------|---------|
| CP.Calculate.Module.js | 2.x | **[MODUL]** Prepočet CP - reusable modul | - | MementoUtils |
| CP.Diely.Calculate.Module.js | 2.x | **[MODUL]** Prepočet položiek CP - reusable modul | - | MementoUtils |
| CP.Action.CreateOrder.Module.js | 1.x | **[MODUL]** Vytvorenie zákazky z CP - reusable modul | - | MementoUtils |
| CenPon.Calculate.js | 2.1 | Hlavný prepočet cenovej ponuky | After Save | CP.Calculate.Module |
| CenPon.Diely.Calculate.js | 2.0 | Prepočet položiek (Diely) | After Save | CP.Diely.Calculate.Module |
| CenPon.Action.CreateOrder.js | 1.0 | Vytvorenie zákazky z CP | Button | CP.Action.CreateOrder.Module |
| CenPon.Action.CreateOrder.Example.js | 1.0 | Príklad použitia CreateOrder | Documentation | - |
| CenPon.Action.CreateOrder.MAPPING.js | 1.0 | Mapping pre CreateOrder | Documentation | - |
| CenPon.Trigger.AutoNumber.js | 1.0 | Automatické číslovanie | Before Save | MementoAutoNumber |
| CenPon.Trigger.onCreate.LoadDefaults.js | 1.0 | Načítanie predvolených hodnôt | Before Save | MementoUtils |

#### Zákazky (zakazky/) - 5 súborov

| Súbor | Verzia | Účel | Trigger | Používa |
|-------|--------|------|---------|---------|
| Order.Calculate.Module.js | 2.x | **[MODUL]** Prepočet zákazky - reusable modul | - | MementoUtils |
| Order.Diely.Calculate.Module.js | 2.x | **[MODUL]** Prepočet položiek zákazky - reusable modul | - | MementoUtils |
| Zak.Calc.Main.js | 2.0 | Hlavný prepočet zákazky | After Save | Order.Calculate.Module |
| Zak.Calc.FromOrder.js | 2.0 | Prepočet pri vytvorení z objednávky | After Save | Order.Calculate.Module |
| Zak.Trigger.AutoNumber.js | 1.0 | Automatické číslovanie zákaziek | Before Save | MementoAutoNumber |

#### Vyúčtovania (vyuctovani/) - Pripravený adresár

**Status:** 📁 Adresár vytvorený, žiadne skripty zatiaľ
**Očakávaná skratka:** Vyuct

#### Pohľadávky (pohladavky/) - Pripravený adresár

**Status:** 📁 Adresár vytvorený, žiadne skripty zatiaľ
**Očakávaná skratka:** Pohl

#### Záväzky (zavazky/) - Pripravený adresár

**Status:** 📁 Adresár vytvorený, žiadne skripty zatiaľ
**Očakávaná skratka:** Zav

---

### Firemné knižnice - Master data

#### Zamestnanec (zamestnanec/) - 2 súbory

| Súbor | Verzia | Účel | Trigger | Používa |
|-------|--------|------|---------|---------|
| Zam.Calc.Main.js | 2.0 | Hlavný prepočet zamestnanca | After Save | MementoUtils |
| Zam.Calc.Universal.js | 1.0 | Univerzálny prepočet | After Save | MementoUtils |

#### Miesta (miesta/) - 2 súbory

| Súbor | Verzia | Účel | Trigger | Používa |
|-------|--------|------|---------|---------|
| Mies.Calc.Distance.js | 1.0 | Výpočet vzdialenosti medzi miestami | After Save | MementoGPS |
| Mies.Calc.Main.js | 2.0 | Hlavný prepočet miesta | After Save | MementoUtils |

#### Adresy (adresy/) - Pripravený adresár

**Status:** 📁 Adresár vytvorený, žiadne skripty zatiaľ
**Očakávaná skratka:** Adr

#### Partneri (partneri/) - Pripravený adresár

**Status:** 📁 Adresár vytvorený, žiadne skripty zatiaľ
**Očakávaná skratka:** Part

#### Klienti (klienti/) - Pripravený adresár

**Status:** 📁 Adresár vytvorený, žiadne skripty zatiaľ
**Očakávaná skratka:** Klient

#### Dodávatelia (doddavatelia/) - Pripravený adresár

**Status:** 📁 Adresár vytvorený, žiadne skripty zatiaľ
**Očakávaná skratka:** Dod

#### Vozidlá (vozidla/) - Pripravený adresár

**Status:** 📁 Adresár vytvorený, žiadne skripty zatiaľ
**Očakávaná skratka:** Voz

#### Mechanizácia (mechanizacia/) - Pripravený adresár

**Status:** 📁 Adresár vytvorený, žiadne skripty zatiaľ
**Očakávaná skratka:** Mech

#### Účty (ucty/) - Pripravený adresár

**Status:** 📁 Adresár vytvorený, žiadne skripty zatiaľ
**Očakávaná skratka:** Uct

---

## Utilities (4 súbory)

Cross-library nástroje v `utils/` adresári:

| Súbor | Verzia | Účel | Používa |
|-------|--------|------|---------|
| Notif.Trigger.OnDelete.js | 1.0 | Univerzálny delete trigger pre notifikácie | MementoTelegram |
| Utils.Action.ExtractLibraryIDs.js | 1.0 | Extrakcia library IDs pre všetky knižnice | - |
| Utils.Action.Renumber.js | 1.0 | Prečíslovanie záznamov | MementoUtils |
| Utils.Action.RenumberRecords.js | 1.0 | Hromadné prečíslovanie záznamov | MementoUtils |

---

## Templates (1 súbor)

Šablóny skriptov v `templates/` adresári:

| Súbor | Účel |
|-------|------|
| Template-Script.js | Šablóna pre nové skripty - obsahuje štruktúru, validáciu, logging pattern |

---

## Documentation

Dokumentačné súbory v root a `docs/` adresári:

| Súbor | Umiestnenie | Účel |
|-------|-------------|------|
| CLAUDE.md | root | Claude Code inštrukcie |
| PROJECT_MAP.md | root | **TENTO SÚBOR** - Živá mapa projektu |
| MEMENTO_PROJECT_STRUCTURE.md | root | Organizácia projektu, module dependency chain |
| MEMENTO_NAMING_CONVENTION.md | root | Konvencie pomenovania, skratky, typy skriptov |
| MEMENTO_API_ACCESS.md | root | Python API utilities, environment setup |
| README.md | root | Úvodný prehľad projektu |
| INDEX.md | docs/ | Hlavný index dokumentácie |
| CORE_MODULES_DOCUMENTATION.md | docs/ | Komplexná dokumentácia core modulov |
| CORE_MODULES_QUICK_REFERENCE.md | docs/ | Rýchly referenčný sprievodca |

---

## Obsolete Files

Archivované a zastarané súbory v `.obsolete/` adresári:

### Štruktúra
```
.obsolete/
├── core/                   # Staré verzie core modulov
├── dochadzka/             # Doch.Test.Module.js
├── kniha-jazd/            # Staré verzie knihy jázd
├── material/              # Mat.BulkAction.SetFields.v1.0.js
├── pokladna/              # Staré verzie pokladne
├── zamestnanec/           # Staré verzie zamestnanec
├── zakazky/               # Staré verzie zákaziek
├── zaznam-prac/           # Staré verzie záznamu prác
├── cenove-ponuky/         # Staré verzie cenových ponúk
├── denny-report/          # Staré verzie denného reportu
├── miesta/                # Staré verzie miest
└── vykaz-prac/            # Staré verzie výkazu prác
```

### Pravidlá pre .obsolete
- **NIČ SA NEVYMAZÁVA** - všetky staré súbory sa presúvajú sem
- Organizované podľa knižníc pre ľahkú navigáciu
- Zachováva históriu vývoja projektu
- Umožňuje revert ak je potrebné

---

## Update Instructions for Claude Code

### Kedy aktualizovať PROJECT_MAP.md

**Automaticky aktualizuj po každej z týchto zmien:**

1. ✅ **Pridanie nového súboru** - Pridaj nový riadok do príslušnej tabuľky
2. ✅ **Premenovanie súboru** - Aktualizuj názov v tabuľke
3. ✅ **Presun súboru** - Presun do novej sekcie
4. ✅ **Zmena verzie** - Aktualizuj číslo verzie
5. ✅ **Zmena závislostí** - Aktualizuj stĺpec "Používa"
6. ✅ **Presun do .obsolete** - Odstráň z aktívnej tabuľky, pridaj do .obsolete sekcie

### Ako aktualizovať

1. Otvoriť `PROJECT_MAP.md`
2. Nájsť príslušnú sekciu (Core/Library/Utils/Templates)
3. Aktualizovať relevantné informácie
4. **Aktualizovať timestamp v hlavičke:** `**Posledná aktualizácia:** YYYY-MM-DD HH:MM`
5. **Aktualizovať celkový počet súborov** (ak pridanie/odstránenie)
6. Uložiť súbor

### Príklad aktualizácie

```diff
- **Posledná aktualizácia:** 2026-03-18 22:52
+ **Posledná aktualizácia:** 2026-03-19 10:30
- **Celkový počet súborov:** 70 JavaScript files
+ **Celkový počet súborov:** 71 JavaScript files

### Cenové ponuky (cenove-ponuky/)

| Súbor | Verzia | Účel |
|-------|--------|------|
- | CenPon.Calculate.js | 2.1 | Hlavný prepočet |
+ | CenPon.Calculate.js | 2.2 | Hlavný prepočet s optimalizáciou |
+ | CenPon.Export.PDF.js | 1.0 | Export do PDF |
```

### Povinné aktualizácie

**Po každom commite, ktorý mení súbory, MUSÍŠ aktualizovať PROJECT_MAP.md!**

Toto je **ŽIVÝ DOKUMENT**, ktorý musí byť vždy synchronizovaný s kódom.

---

## Pomocné Príkazy

### Zistiť počet súborov

```bash
# Celkový počet JS súborov
find core/ libraries/ utils/ templates/ -type f -name "*.js" | wc -l

# Počet súborov v konkrétnom adresári
ls -1 libraries/dochadzka/*.js | wc -l

# Zoznam všetkých JS súborov
find libraries/ -type f -name "*.js" | sort
```

### Nájsť verziu modulu

```bash
# V hlavičke súboru - prvých 10 riadkov
head -10 core/MementoCore.js | grep -i "verzia"
```

### Vyhľadať závislosti

```bash
# Hľadať kde sa modul používa
grep -r "MementoTelegram" libraries/ --include="*.js"

# Hľadať importy konkrétneho modulu
grep -r "var utils = MementoUtils" libraries/ --include="*.js"
```

---

## Poznámky

### Konvencie pomenovania súborov

- **Core moduly:** `Memento*.js` (napr. MementoCore.js, MementoUtils.js)
- **Reusable moduly:** `{Prefix}.*.Module.js` (napr. CP.Calculate.Module.js)
- **Library skripty:** `{Skratka}.{Typ}.{Názov}.js` (napr. Doch.Calc.Main.js)
- **Utils:** `Utils.{Typ}.{Názov}.js` (napr. Utils.Action.Renumber.js)

### Verzie v názvoch súborov

- **Verzie v core moduloch:** Len v hlavných moduloch (MementoCore**7**.js)
- **Verzie v library skriptoch:** NIE - len v hlavičke súboru
- **Verzie v reusable moduloch:** NIE - len v hlavičke súboru

### Skratky knižníc

Úplný zoznam v `MEMENTO_NAMING_CONVENTION.md`:
- Doch (Dochádzka), Knij (Kniha jázd), Mat (Materiál), Pokl (Pokladňa)
- Zam (Zamestnanec), Zak (Zákazky), Zazp (Záznam prác)
- CenPon (Cenové ponuky), DenRep (Denný report), VykPr (Výkaz prác)
- Mies (Miesta), Adr (Adresy), Part (Partneri), Klient (Klienti)
- A ďalšie...

---

**Koniec PROJECT_MAP.md**
