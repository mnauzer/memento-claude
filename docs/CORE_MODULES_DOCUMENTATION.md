# Memento Database - Dokumentácia Core Modulov

**Projekt:** memento-claude
**Verzia dokumentácie:** 1.0.0
**Dátum:** 2026-03-18
**Autor:** Claude Code Analysis

---

## Obsah

1. [Úvod](#úvod)
2. [Architektúra a Závislosti](#architektúra-a-závislosti)
3. [MementoConfig7.js](#mementoconfig7js)
4. [MementoCore7.js](#mementocore7js)
5. [MementoTime.js](#mementotimejs) - **🆕 NEW in Phase 3**
6. [MementoDate.js](#mementodatejs) - **🆕 NEW in Phase 3**
7. [MementoValidation.js](#mementovalidationjs) - **🆕 NEW in Phase 3**
8. [MementoFormatting.js](#mementoformattingjs) - **🆕 NEW in Phase 3**
9. [MementoCalculations.js](#mementocalculationsjs) - **🆕 NEW in Phase 3**
10. [MementoBusiness.js](#mementobusinessjs) - **♻️ REFACTORED in Phase 3**
11. [MementoUtils7.js](#mementoutils7js)
12. [MementoAI7.js](#mementoai7js)
13. [MementoTelegram8.js](#mementotelegram8js)
14. [MementoGPS.js](#mementogpsjs)
15. [MementoRecordTracking.js](#mentorecordtrackingjs)
16. [MementoIDConflictResolver.js](#mementoidconflictresolverjs)
17. [MementoAutoNumber.js](#mementoautonumberjs)
18. [Best Practices](#best-practices)
19. [Príklady Použitia](#príklady-použitia)

---

## Úvod

Tento dokument poskytuje komplexný prehľad všetkých core modulov v Memento Database projekte. Core moduly tvoria základ celého systému a poskytujú jednotné API pre prácu s databázou, konfiguráciou, AI službami, Telegram notifikáciami a ďalšími funkciami.

### Účel Core Modulov

- **Centralizovaná konfigurácia** - Všetky názvy knižníc, polí a konštánt na jednom mieste
- **Bezpečný prístup k dátam** - Safe field access bez chýb
- **Logging a debugging** - Štandardizovaný logging systém
- **Business logika** - Výpočty miezd, pracovného času, cien
- **Integrácie** - AI (OpenAI, Claude), Telegram, GPS routing
- **Utility funkcie** - Formátovanie, validácia, tracking

### Filozofia Lazy Loading

Všetky moduly používajú lazy loading pattern - načítavajú sa až pri prvom použití, čo optimalizuje výkon a pamäť.

---

## Architektúra a Závislosti

### Dependency Chain (v8.0+)

**Phase 3/4 Architecture:** 4-level hierarchy with focused utilities

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
│ (time operations)  │  │ (Slovak calendar)  │  │      1.0           │
└────────────────────┘  └────────────────────┘  └────────────────────┘
┌────────────────────┐  ┌────────────────────┐
│ MementoFormatting  │  │ MementoCalculations│
│      1.0           │  │      1.0           │
└────────────────────┘  └────────────────────┘
          ↓
LEVEL 3: Business Logic
┌────────────────────────────────────────┐
│ MementoBusiness 8.0                    │
│ (orchestrates focused utilities)       │
│ REFACTORED: 3,942 → 1,050 lines       │
└────────────────────────────────────────┘
          ↓
LEVEL 4: Aggregator
┌────────────────────────────────────────┐
│ MementoUtils 8.1                       │
│ (lazy-loading facade for all above)   │
└────────────────────────────────────────┘

SEPARATE CHAINS (no circular dependencies):
┌────────────────────┐
│ MementoTelegram    │
│      8.2           │ ← Depends ONLY on Core (NOT Utils)
└────────────────────┘

┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│ MementoAI 7.1      │  │ MementoGPS 1.1     │  │ MementoRecordTracking│
│ (AI services)      │  │ (GPS routing)      │  │      1.1           │
└────────────────────┘  └────────────────────┘  └────────────────────┘
```

**Key Changes in v8.0:**
- ✅ MementoBusiness split into 5 focused modules
- ✅ MementoTelegram separated from Utils (circular dependency fixed)
- ✅ 4-level architecture for better organization
- ✅ All modules have MODULE_INFO metadata

### Pravidlá Závislostí

1. **MementoConfig** - Nemá žiadne závislosti, je to BASE modul
2. **MementoCore** - Môže závisieť len od Config
3. **Ostatné moduly** - Môžu závisieť od Config a Core
4. **MementoTelegram** - Závisí od Config, Core a AI
5. **MementoUtils** - Agreguje všetko, je to vstupný bod

### Štatistika Modulov (v8.1.0 - Phase 3/4 Complete)

| Modul | Verzia | Funkcie | Lines | Typ |
|-------|--------|---------|-------|-----|
| MementoConfig | **7.1.0** | 10+ | ~600 | CONFIG |
| MementoCore | **7.6.0** | 30+ | ~1,200 | CORE |
| **MementoTime** | **1.1.0** | **9** | **370** | **TIME UTILS** |
| **MementoDate** | **1.0.0** | **7** | **470** | **DATE UTILS** |
| **MementoValidation** | **1.0.0** | **5** | **600** | **VALIDATION** |
| **MementoFormatting** | **1.0.0** | **8** | **550** | **FORMATTING** |
| **MementoCalculations** | **1.0.0** | **6** | **750** | **CALCULATIONS** |
| MementoBusiness | **8.0.0** | 9 | **1,050** | BUSINESS |
| MementoUtils | **8.1.0** | 100+ | ~1,800 | AGGREGATOR |
| MementoAI | **7.1.0** | 4 | ~800 | AI API |
| MementoTelegram | **8.2.0** | 25+ | ~1,200 | TELEGRAM |
| MementoGPS | **1.1.0** | 6 | ~400 | GPS |
| MementoRecordTracking | **1.1.0** | 6 | ~300 | TRACKING |
| MementoIDConflictResolver | **1.1.0** | 3 | ~250 | ID FIX |
| MementoAutoNumber | **1.1.0** | 3 | ~200 | NUMBERING |

**Spolu:** 17 core modules, 230+ functions

**Phase 3/4 Changes:**
- ➕ Added 5 new focused modules (Time, Date, Validation, Formatting, Calculations)
- ♻️ Refactored MementoBusiness from 3,942 to 1,050 lines (73% reduction)
- 🔄 Updated all module versions with MODULE_INFO standard
- 🔗 Fixed circular dependency (MementoTelegram now depends on Core only)

---

## MementoConfig7.js

**Verzia:** 7.0.53
**Závislosť:** Žiadne
**Účel:** Centralizovaná konfigurácia - single source of truth

### Kľúčové Sekcie

#### 1. Libraries (Knižnice)

```javascript
var config = MementoConfig.getConfig();

// Evidencia - denné záznamy
config.libraries.dailyReport      // "Denný report"
config.libraries.attendance        // "Dochádzka"
config.libraries.workRecords       // "Záznam prác"
config.libraries.rideLog          // "Kniha jázd"
config.libraries.cashBook         // "Pokladňa"

// Výkazy
config.libraries.workReport       // "Výkaz prác"
config.libraries.materialsReport  // "Výkaz materiálu"
config.libraries.rideReport       // "Výkaz dopravy"
config.libraries.machinesReport   // "Výkaz strojov"

// Cenníky a sklad
config.libraries.priceList        // "Cenník prác"
config.libraries.inventory        // "Materiál"
config.libraries.materialExpenses // "Výdajky materiálu"
config.libraries.materialIncomes  // "Príjemky materiálu"

// Systémové
config.libraries.defaults         // "ASISTANTO Defaults"
config.libraries.apiKeys          // "ASISTANTO API"
config.libraries.globalLogs       // "ASISTANTO Logs"

// Firemné
config.libraries.employees        // "Zamestnanci"
config.libraries.suppliers        // "Dodávatelia"
config.libraries.partners         // "Partneri"
config.libraries.clients          // "Klienti"
config.libraries.vehicles         // "Vozidlá"
config.libraries.machines         // "Mechanizácia"

// Obchodné dokumenty
config.libraries.quotes           // "Cenové ponuky"
config.libraries.orders           // "Zákazky"
config.libraries.issuedInvoices   // "Vystavené faktúry"
config.libraries.receivedInvoices // "Prijaté faktúry"

// Telegram
config.libraries.notifications    // "Notifications"
config.libraries.telegramGroups   // "Telegram Groups"
```

#### 2. Library IDs (Pre API prístup)

```javascript
config.libraryIds.dailyReport      // "Tt4pxN4xQ"
config.libraryIds.machinesReport   // "uCRaUwsTo"
config.libraryIds.materialsReport  // "z3sxkUHgT"
config.libraryIds.quotes           // "90RmdjWuk"
config.libraryIds.quoteParts       // "nCAgQkfvK"
config.libraryIds.orders           // "CfRHN7QTG"
config.libraryIds.orderParts       // "iEUC79O2T"
config.libraryIds.employeeRates    // "CqXNnosKP"
config.libraryIds.defaults         // "KTZ6dsnY9"
```

#### 3. Fields (Polia)

**Common Fields (Spoločné):**
```javascript
config.fields.common.id              // "ID"
config.fields.common.view            // "view"
config.fields.common.debugLog        // "Debug_Log"
config.fields.common.errorLog        // "Error_Log"
config.fields.common.info            // "info"
config.fields.common.createdBy       // "zapísal"
config.fields.common.modifiedBy      // "upravil"
config.fields.common.createdDate     // "dátum zápisu"
config.fields.common.modifiedDate    // "dátum úpravy"
config.fields.common.rowColor        // "farba záznamu"
config.fields.common.backgroundColor // "farba pozadia"
config.fields.common.infoTelegram    // "info_telegram"
config.fields.common.notifications   // "Notifikácie"
config.fields.common.recordIcons     // "ikony záznamu"
```

**Attendance (Dochádzka):**
```javascript
config.fields.attendance.date           // "Dátum"
config.fields.attendance.dayOfWeek      // "Deň"
config.fields.attendance.arrival        // "Príchod"
config.fields.attendance.departure      // "Odchod"
config.fields.attendance.employees      // "Zamestnanci"
config.fields.attendance.works          // "Práce"
config.fields.attendance.rides          // "Jazdy"
config.fields.attendance.cashBook       // "Pokladňa"
config.fields.attendance.material       // "Materiál"
config.fields.attendance.employeeCount  // "Počet pracovníkov"
config.fields.attendance.workTime       // "Pracovná doba"
config.fields.attendance.workedHours    // "Odpracované"
config.fields.attendance.wageCosts      // "Mzdové náklady"
config.fields.attendance.entryStatus    // "stav záznamu"
config.fields.attendance.dayOffReason   // "Dôvod voľna"
config.fields.attendance.note           // "Poznámka"

// Employee attributes v dochádzke
config.fields.attendance.employeeAttributes.workedHours  // "odpracované"
config.fields.attendance.employeeAttributes.hourlyRate   // "hodinovka"
config.fields.attendance.employeeAttributes.bonus        // "+príplatok (€/h)"
config.fields.attendance.employeeAttributes.premium      // "+prémia (€)"
config.fields.attendance.employeeAttributes.penalty      // "-pokuta (€)"
config.fields.attendance.employeeAttributes.dailyWage    // "denná mzda"
config.fields.attendance.employeeAttributes.note         // "poznámka"
```

**Work Record (Záznam prác):**
```javascript
config.fields.workRecord.date              // "Dátum"
config.fields.workRecord.order             // "Zákazka"
config.fields.workRecord.employees         // "Zamestnanci"
config.fields.workRecord.hzs               // "Hodinová zúčtovacia sadzba"
config.fields.workRecord.workReport        // "Výkaz prác"
config.fields.workRecord.workDescription   // "Vykonané práce"
config.fields.workRecord.employeeCount     // "Počet pracovníkov"
config.fields.workRecord.workTime          // "Pracovná doba"
config.fields.workRecord.workedHours       // "Odpracované"
config.fields.workRecord.wageCosts         // "Mzdové náklady"
config.fields.workRecord.hzsSum            // "Suma HZS"
config.fields.workRecord.machinesSum       // "Suma stroje"
config.fields.workRecord.machinesCosts     // "Náklady stroje"
config.fields.workRecord.startTime         // "Od"
config.fields.workRecord.endTime           // "Do"
config.fields.workRecord.machinery         // "Mechanizácia"
config.fields.workRecord.workItems         // "Práce Položky"
config.fields.workRecord.icons             // "ikony záznamu"
```

**Ride Log (Kniha jázd):**
```javascript
config.fields.rideLog.date           // "Dátum"
config.fields.rideLog.rideType       // "Typ jazdy"
config.fields.rideLog.ridePurpose    // "Účel jazdy"
config.fields.rideLog.vehicle        // "Vozidlo"
config.fields.rideLog.driver         // "Šofér"
config.fields.rideLog.crew           // "Posádka"
config.fields.rideLog.orders         // "Zákazky"
config.fields.rideLog.rate           // "Sadzba za km"
config.fields.rideLog.km             // "Km"
config.fields.rideLog.wageCosts      // "Mzdové náklady"
config.fields.rideLog.rideTime       // "Čas jazdy"
config.fields.rideLog.stopTime       // "Čas na zastávkach"
config.fields.rideLog.totalTime      // "Celkový čas"
config.fields.rideLog.start          // "Štart"
config.fields.rideLog.destination    // "Cieľ"
config.fields.rideLog.stops          // "Zastávky"
config.fields.rideLog.vehicleCosts   // "Náklady vozidlo"
```

#### 4. Report Configs (Výkazy)

```javascript
// Výkaz prác
config.reportConfigs.work = {
    library: "workReport",
    sourceField: "workRecords",
    prefix: "VP",
    attributes: ["workDescription", "hoursCount", "billedRate", "totalPrice"],
    summaryFields: ["totalHours", "hzsSum", "hzsCount"],
    requiredFields: ["date", "order"]
}

// Výkaz dopravy
config.reportConfigs.ride = {
    library: "rideReport",
    sourceField: "rides",
    prefix: "VD",
    attributes: ["km", "description", "wageCosts", "vehicleCosts"],
    summaryFields: ["kmTotal", "hoursTotal", "rideCount"],
    requiredFields: ["date", "order"]
}

// Výkaz strojov
config.reportConfigs.machines = {
    library: "machinesReport",
    sourceField: "workRecord",
    prefix: "VS",
    attributes: ["mth", "pausalPocet", "cenaMth"],
    summaryFields: ["sumWithoutVat", "vat", "sumWithVat"],
    requiredFields: ["date", "order", "machines"]
}

// Výkaz materiálu
config.reportConfigs.materials = {
    library: "materialsReport",
    sourceField: "material",
    prefix: "VM",
    attributes: ["quantity", "pricePerUnit", "vatRate", "totalPrice"],
    summaryFields: ["totalQuantity", "sellPriceTotal", "marginTotal"],
    requiredFields: ["date", "order"]
}
```

#### 5. Global Settings

```javascript
config.global.debug           // true
config.global.defaultTimeout  // 30000
config.global.dateFormat      // "DD.MM.YYYY"
config.global.timeFormat      // "HH:mm"
config.global.timezone        // "Europe/Bratislava"
config.global.currency        // "EUR"
config.global.currencySymbol  // "€"
config.global.language        // "sk_SK"
```

### API Funkcie

```javascript
// Základné
MementoConfig.getConfig()                      // Celý CONFIG objekt
MementoConfig.getLibrary("attendance")         // "Dochádzka"
MementoConfig.getField("attendance", "date")   // "Dátum"
MementoConfig.getCommonField("debugLog")       // "Debug_Log"
MementoConfig.getIcon("success")               // "✅"
MementoConfig.getGlobalSetting("timezone")     // "Europe/Bratislava"

// Advanced
MementoConfig.get("fields.attendance.date")    // Cesta k hodnote
MementoConfig.getSection("libraries")          // Celá sekcia
MementoConfig.hasLibrary("attendance")         // true/false
MementoConfig.hasField("attendance", "date")   // true/false
MementoConfig.getAllLibraries()                // Array názvov
MementoConfig.getAllFields("attendance")       // Array polí
```

### Príklad Použitia

```javascript
// Import config
var config = MementoConfig.getConfig();

// Získaj názov knižnice
var libraryName = config.libraries.attendance;  // "Dochádzka"

// Získaj názov poľa
var dateField = config.fields.attendance.date;  // "Dátum"

// Získaj hodnotu z entry
var date = entry().field(dateField);

// Získaj atribút
var workedHours = config.fields.attendance.employeeAttributes.workedHours;
```

---

## MementoCore7.js

**Verzia:** 7.0.2
**Závislosť:** MementoConfig7
**Účel:** Základné utility - logging, formátovanie, validácia, safe field access

### Logging Funkcie

#### addDebug(entry, message, iconName)
Debug správy do Debug_Log poľa.

```javascript
var core = MementoCore;
core.addDebug(entry(), "Začínam výpočet", "calculation");
// [18.03.26 14:30] 🧮 Začínam výpočet

core.addDebug(entry(), "Zamestnanci načítaní", "success");
// [18.03.26 14:30] ✅ Zamestnanci načítaní
```

**Parametre:**
- `entry` - Entry objekt
- `message` - Debug správa
- `iconName` - (Optional) Názov ikony z config.icons

#### addError(entry, message, source, error)
Chybové správy do Error_Log poľa.

```javascript
core.addError(entry(), "Zamestnanec nebol nájdený", "calculateWages", error);
// [18.03.26 14:30:15] ❌ ERROR: Zamestnanec nebol nájdený | Zdroj: calculateWages
```

**Parametre:**
- `entry` - Entry objekt
- `message` - Chybová správa
- `source` - Názov funkcie/modulu
- `error` - (Optional) Error objekt (pre stack trace)

#### addInfo(entry, message, data, options)
Info správy do info poľa s formátovaním.

```javascript
core.addInfo(entry(), "Výpočet dokončený",
    {
        hours: 8.5,
        wage: 120,
        total: 1020
    },
    {
        scriptName: "Attendance Calculator",
        scriptVersion: "8.0",
        sectionName: "Výsledok",
        includeHeader: true,
        includeFooter: true,
        addTimestamp: true
    }
);
```

**Output:**
```
==================================================
📋 Attendance Calculator v8.0
🕐 18.03.2026 14:30:15
==================================================

ℹ️ VÝSLEDOK
------------------------------
Výpočet dokončený

💾 DÁTA
------------------------------
hours: 8.5
wage: 120
total: 1020

==================================================
🏁 Spracovanie dokončené
⚙️ MementoCore v7.0 | Memento Database System
==================================================
```

**Options:**
- `scriptName` - Názov scriptu
- `scriptVersion` - Verzia
- `moduleName` - (Optional) Názov modulu
- `sectionName` - Názov sekcie
- `includeHeader` - true/false
- `includeFooter` - true/false
- `addTimestamp` - true/false

#### clearLogs(entry, clearError)
Vyčistenie logov.

```javascript
core.clearLogs(entry(), false);  // Vyčistí len Debug_Log
core.clearLogs(entry(), true);   // Vyčistí Debug_Log aj Error_Log
```

### View Režimy

```javascript
core.setEdit(entry());   // Nastaví view pole na "Editácia "
core.setPrint(entry());  // Nastaví view pole na "Tlač"
core.setDebug(entry());  // Nastaví view pole na "Debug"

// Univerzálna funkcia
core.setView(entry(), "Editácia ");  // Custom hodnota
```

**POZOR:** View pole má hodnoty s medzerami! "Editácia " (s medzerou na konci)

### Safe Field Access

#### safeGet(entry, fieldName, defaultValue)
Bezpečné získanie hodnoty poľa.

```javascript
// Štandardný prístup (môže vyhodiť chybu)
var date = entry().field("Dátum");  // NEBEZPEČNÉ!

// Safe prístup
var date = core.safeGet(entry(), "Dátum", null);  // BEZPEČNÉ
// Ak pole neexistuje alebo je prázdne, vráti null

var hours = core.safeGet(entry(), "Odpracované", 0);
// Ak pole neexistuje, vráti 0
```

#### safeSet(entry, fieldName, value)
Bezpečné nastavenie hodnoty poľa.

```javascript
var success = core.safeSet(entry(), "Odpracované", 8.5);
// Returns: true (úspech) alebo false (chyba)
```

#### safeGetAttribute(entry, fieldName, attrName, defaultValue)
Bezpečné získanie atribútu z LinkToEntry poľa.

```javascript
// Single link
var hourlyRate = core.safeGetAttribute(entry(), "Zamestnanec", "hodinovka", 0);

// Multi-select link (vráti array)
var hourlyRates = core.safeGetAttribute(entry(), "Zamestnanci", "hodinovka", []);
// Returns: [15, 18, 20] alebo []
```

#### safeSetAttribute(entry, fieldName, attrName, value, index)
Bezpečné nastavenie atribútu.

```javascript
// Single link
core.safeSetAttribute(entry(), "Zamestnanec", "hodinovka", 15);

// Multi-select - nastav všetkým
core.safeSetAttribute(entry(), "Zamestnanci", "odpracované", 8);

// Multi-select - nastav konkrétnemu indexu
core.safeSetAttribute(entry(), "Zamestnanci", "odpracované", 8, 0);
```

#### safeGetLinks(entry, linkFieldName)
Bezpečné získanie LinkToEntry poľa.

```javascript
var employees = core.safeGetLinks(entry(), "Zamestnanci");
// Returns: Array of entry objects alebo []

for (var i = 0; i < employees.length; i++) {
    var name = employees[i].field("Meno");
}
```

#### safeGetLinksFrom(entry, libraryName, linkFieldName)
Bezpečné získanie spätných linkov (linksFrom).

```javascript
var workRecords = core.safeGetLinksFrom(entry(), "Záznam prác", "Dochádzka");
// Returns: Array of entry objects ktoré linkujú na tento záznam
```

### Formátovanie Funkcií

#### formatDate(date, format)
```javascript
var formatted = core.formatDate(new Date(), "DD.MM.YYYY");  // "18.03.2026"
var formatted = core.formatDate(new Date(), "YYYY-MM-DD");  // "2026-03-18"
```

#### formatTime(minutes)
```javascript
var timeStr = core.formatTime(510);  // "08:30"
var timeStr = core.formatTime(90);   // "01:30"
```

#### formatMoney(amount, currency)
```javascript
var price = core.formatMoney(1250.50, "EUR");  // "1 250,50 €"
var price = core.formatMoney(1250.50);         // "1 250,50 €" (default EUR)
```

#### parseTimeToMinutes(timeString)
```javascript
var minutes = core.parseTimeToMinutes("08:30");  // 510
var minutes = core.parseTimeToMinutes("1:15");   // 75
```

#### roundToQuarter(value)
Zaokrúhlenie na 0.25 (štvrtiny).

```javascript
var rounded = core.roundToQuarter(8.37);  // 8.25
var rounded = core.roundToQuarter(8.13);  // 8.25
var rounded = core.roundToQuarter(8.38);  // 8.50
```

#### roundToQuarterHour(minutes)
Zaokrúhlenie minút na 15-minútové intervaly.

```javascript
var rounded = core.roundToQuarterHour(487);  // 480 (8:00)
var rounded = core.roundToQuarterHour(493);  // 495 (8:15)
var rounded = core.roundToQuarterHour(502);  // 495 (8:15)
var rounded = core.roundToQuarterHour(508);  // 510 (8:30)
```

#### roundTimeToQuarter(time)
Zaokrúhlenie moment objektu na 15 minút.

```javascript
var time = moment("2026-03-18 08:17");
var rounded = core.roundTimeToQuarter(time);
// Returns: moment("2026-03-18 08:15")
```

#### parseTimeInput(input)
Flexibilný parsing času z rôznych formátov.

```javascript
var time = core.parseTimeInput("8:30");        // moment object
var time = core.parseTimeInput("08:30");       // moment object
var time = core.parseTimeInput(new Date());    // moment object
var time = core.parseTimeInput(momentObject);  // moment object
```

#### convertDurationToHours(duration)
```javascript
var hours = core.convertDurationToHours("08:30");  // 8.5
var hours = core.convertDurationToHours("1:15");   // 1.25
```

#### convertHoursToDuration(hours)
```javascript
var duration = core.convertHoursToDuration(8.5);  // "08:30"
var duration = core.convertHoursToDuration(1.25); // "01:15"
```

### Validácia

#### validateRequiredFields(entry, fields)
```javascript
var result = core.validateRequiredFields(entry(), ["Dátum", "Zamestnanec", "Od", "Do"]);

if (!result.valid) {
    message("Chýbajúce polia: " + result.missing.join(", "));
}

// Returns: { valid: true/false, missing: [] }
```

#### validateInputData(data, schema)
```javascript
var schema = {
    date: { required: true, type: "date" },
    hours: { required: true, type: "number", min: 0, max: 24 }
};

var result = core.validateInputData({ date: new Date(), hours: 8 }, schema);
// Returns: { valid: true/false, errors: [] }
```

### Utility Funkcie

#### getSettings(libraryName, fieldName)
Získa nastavenie z ASISTANTO Defaults.

```javascript
var apiKey = core.getSettings("ASISTANTO Defaults", "OpenAI API Key");
var botToken = core.getSettings("ASISTANTO Defaults", "Telegram Bot API Key");
```

#### getCurrentUser()
```javascript
var user = core.getCurrentUser();
// Returns: User objekt alebo null
```

#### getDayNameSK(date)
```javascript
var dayName = core.getDayNameSK(new Date());  // "Pondelok", "Utorok", ...
```

#### setDayOfWeekField(entry)
Automaticky nastaví pole "Deň" podľa dátumu.

```javascript
core.setDayOfWeekField(entry());
// Prečíta "Dátum" pole a nastaví "Deň" pole na "Pondelok", "Utorok", atď.
```

#### isHoliday(date)
```javascript
var isHoliday = core.isHoliday(new Date("2026-01-01"));  // true (Nový rok)
var isHoliday = core.isHoliday(new Date("2026-12-25"));  // true (Vianoce)
```

**Slovenské sviatky:**
- 1.1. - Deň vzniku SR
- 6.1. - Traja králi
- Veľký piatok (vypočítaný)
- Veľkonočný pondelok (vypočítaný)
- 1.5. - Sviatok práce
- 8.5. - Deň víťazstva
- 5.7. - Cyril a Metod
- 29.8. - SNP
- 1.9. - Deň Ústavy
- 15.9. - Sedembolestná
- 1.11. - Všetci svätí
- 17.11. - Deň boja za slobodu
- 24.12. - Štedrý deň
- 25.12. - 1. sviatok vianočný
- 26.12. - 2. sviatok vianočný

#### isWeekend(date)
```javascript
var isWeekend = core.isWeekend(new Date());  // true ak sobota/nedeľa
```

#### addRecordIcon/removeRecordIcon(entry, icon)
```javascript
core.addRecordIcon(entry(), "✅");  // Pridá ikonu
core.removeRecordIcon(entry(), "✅");  // Odstráni ikonu
```

---

## MementoTime.js

**Verzia:** 1.1.0
**Závislosť:** moment.js (built-in)
**Účel:** Time operations - 15-minute rounding, work hours calculation, time formatting
**Prístup:** `utils.time` alebo `MementoTime` (direct import)
**Phase 3:** Extracted from MementoBusiness - eliminates code duplication across 5+ scripts

### Overview

MementoTime centralizuje všetky časové operácie vrátane slovenskej business logiky (15-minútové intervaly, pracovný čas, prestávky podľa zákonníka práce).

### Key Functions

#### roundToQuarterHour(time, direction)

Zaokrúhli čas na 15-minútové intervaly (Slovak business standard).

```javascript
var time = new Date("2026-03-19 08:17:00");

// Nearest (default)
var rounded = utils.time.roundToQuarterHour(time, "nearest");  // 08:15:00

// Round up
var roundedUp = utils.time.roundToQuarterHour(time, "up");     // 08:30:00

// Round down
var roundedDown = utils.time.roundToQuarterHour(time, "down"); // 08:15:00
```

**Directions:** `"nearest"`, `"up"`, `"down"`

#### calculateHoursDifference(startTime, endTime, options)

Vypočíta rozdiel v hodinách medzi dvoma časmi (podporuje nočné zmeny).

```javascript
var start = "2026-03-19 08:00";
var end = "2026-03-19 16:30";

var result = utils.time.calculateHoursDifference(start, end, {
    roundQuarters: true,   // Zaokrúhli časy na 15min
    includeBreak: true,    // Odráta prestávku
    breakDuration: 30      // 30 minút prestávka
});

// Returns:
// {
//   hours: 8,
//   minutes: 0,
//   decimalHours: 8.0,
//   totalMinutes: 480,
//   crossesMidnight: false
// }
```

**Options:**
- `roundQuarters` (boolean) - Zaokrúhli časy pred výpočtom
- `includeBreak` (boolean) - Odráta prestávku
- `breakDuration` (number) - Minúty prestávky (default: 30)

#### calculateBreakTime(workHours, options)

Vypočíta povinnú prestávku podľa Zákonníka práce SR.

```javascript
var breakTime = utils.time.calculateBreakTime(8.5, {
    threshold: 6,   // Po 6h práce
    duration: 30    // 30min prestávka
});
// Returns: 30 (minút)

var noBreak = utils.time.calculateBreakTime(5);  // 0 (pod 6h)
```

#### minutesToDecimalHours(minutes) / decimalHoursToMinutes(hours)

```javascript
var hours = utils.time.minutesToDecimalHours(90);    // 1.5
var minutes = utils.time.decimalHoursToMinutes(1.5); // 90
```

#### formatHoursAsTime(decimalHours)

```javascript
var time = utils.time.formatHoursAsTime(7.5);   // "7:30"
var time = utils.time.formatHoursAsTime(8.75);  // "8:45"
```

#### formatHoursDisplay(decimalHours, decimals)

```javascript
var display = utils.time.formatHoursDisplay(6.75);     // "6.75h"
var display = utils.time.formatHoursDisplay(8.5, 1);   // "8.5h"
```

#### crossesMidnight(startTime, endTime)

```javascript
var crosses = utils.time.crossesMidnight("22:00", "02:00");  // true
var crosses = utils.time.crossesMidnight("08:00", "16:00");  // false
```

#### isValidTime(time)

```javascript
var valid = utils.time.isValidTime(new Date());     // true
var valid = utils.time.isValidTime("invalid");      // false
```

### Constants

```javascript
utils.time.CONSTANTS.MINUTES_PER_HOUR;  // 60
utils.time.CONSTANTS.HOURS_PER_DAY;     // 24
utils.time.CONSTANTS.QUARTER_HOUR;      // 15
```

---

## MementoDate.js

**Verzia:** 1.0.0
**Závislosť:** MementoConfig (pre sviatky)
**Účel:** Slovak calendar utilities - holidays, weekends, workdays
**Prístup:** `utils.date` alebo `MementoDate` (direct import)
**Phase 3:** NEW - Centralized Slovak calendar logic

### Overview

MementoDate poskytuje kompletnú podporu pre slovenský kalendár vrátane všetkých sviatkov (pevných aj pohyblivých), víkendov a pracovných dní.

### Key Functions

#### isHoliday(date)

Skontroluje či je dátum slovenský sviatok.

```javascript
var jan1 = new Date("2026-01-01");
var isHoliday = utils.date.isHoliday(jan1);  // true (Nový rok)

var workday = new Date("2026-01-02");
var isHoliday = utils.date.isHoliday(workday);  // false
```

**Podporované sviatky:**
- **Pevné:** 1.1., 6.1., 1.5., 8.5., 5.7., 29.8., 1.9., 15.9., 1.11., 17.11., 24.12., 25.12., 26.12.
- **Pohyblivé:** Veľký piatok, Veľkonočný pondelok, Druhý sviatok vianočný

#### getHolidayName(date)

```javascript
var name = utils.date.getHolidayName(new Date("2026-05-01"));
// Returns: "Sviatok práce"

var name = utils.date.getHolidayName(new Date("2026-08-29"));
// Returns: "Výročie Slovenského národného povstania"
```

#### isWeekend(date)

```javascript
var saturday = new Date("2026-03-21");
var isWeekend = utils.date.isWeekend(saturday);  // true

var monday = new Date("2026-03-23");
var isWeekend = utils.date.isWeekend(monday);     // false
```

#### getWeekNumber(date)

ISO 8601 week number.

```javascript
var week = utils.date.getWeekNumber(new Date("2026-03-19"));
// Returns: 12
```

#### getWorkdaysInMonth(year, month)

Vypočíta počet pracovných dní v mesiaci (vynecháva víkendy a sviatky).

```javascript
var workdays = utils.date.getWorkdaysInMonth(2026, 3);  // March 2026
// Returns: 21 (example - depends on actual month)
```

#### parseDate(str, format) / formatDate(date, format)

```javascript
// Parse
var date = utils.date.parseDate("19.03.2026", "DD.MM.YYYY");

// Format
var str = utils.date.formatDate(new Date(), "DD.MM.YYYY");  // "19.03.2026"
var str = utils.date.formatDate(new Date(), "YYYY-MM-DD");  // "2026-03-19"
```

### Slovak Holidays Reference

```javascript
// Fixed holidays (always same date)
utils.date.SLOVAK_FIXED_HOLIDAYS = [
    "01-01",  // Nový rok
    "01-06",  // Zjavenie Pána (Traja králi)
    "05-01",  // Sviatok práce
    "05-08",  // Deň víťazstva nad fašizmom
    "07-05",  // Sviatok sv. Cyrila a Metoda
    "08-29",  // Výročie SNP
    "09-01",  // Deň Ústavy SR
    "09-15",  // Sedembolestná Panna Mária
    "11-01",  // Sviatok všetkých svätých
    "11-17",  // Deň boja za slobodu a demokraciu
    "12-24",  // Štedrý deň
    "12-25",  // 1. sviatok vianočný
    "12-26"   // 2. sviatok vianočný
];

// Movable holidays calculated automatically
// - Veľký piatok (Good Friday)
// - Veľkonočný pondelok (Easter Monday)
```

---

## MementoValidation.js

**Verzia:** 1.0.0
**Závislosť:** MementoCore
**Účel:** Validation patterns - time, date, number, required fields
**Prístup:** `utils.validation` alebo `MementoValidation` (direct import)
**Phase 3:** NEW - Standardized validation across all libraries

### Overview

MementoValidation poskytuje jednotné validačné vzory pre všetky typy polí s konzistentnými chybovými hláseniami.

### Key Functions

#### validateTime(timeValue, options)

Validuje TIME pole s možnosťami kontroly.

```javascript
var startTime = utils.safeGet(entry(), "Príchod");

var result = utils.validation.validateTime(startTime, {
    required: true,
    allowFuture: false,
    maxHours: 24
});

if (!result.valid) {
    dialog("Chyba", result.error, "OK");
    cancel();
}

// Returns:
// {
//   valid: true/false,
//   error: null or "error message",
//   value: parsed value
// }
```

**Options:**
- `required` (boolean) - Pole musí mať hodnotu
- `allowFuture` (boolean) - Povoliť budúce časy
- `allowPast` (boolean) - Povoliť minulé časy
- `maxHours` (number) - Maximum hodín

#### validateDate(dateValue, options)

Validuje DATE pole.

```javascript
var workDate = utils.safeGet(entry(), "Dátum");

var result = utils.validation.validateDate(workDate, {
    required: true,
    allowFuture: false,
    minDate: moment().subtract(1, 'year').toDate(),
    maxDate: new Date()
});

if (!result.valid) {
    dialog("Chyba", result.error, "OK");
    cancel();
}
```

**Options:**
- `required` (boolean) - Pole musí mať hodnotu
- `allowFuture` (boolean) - Povoliť budúce dátumy
- `allowPast` (boolean) - Povoliť minulé dátumy
- `minDate` (Date) - Minimálny dátum
- `maxDate` (Date) - Maximálny dátum

#### validateNumber(numValue, options)

Validuje číselné polia.

```javascript
var amount = utils.safeGet(entry(), "Suma");

var result = utils.validation.validateNumber(amount, {
    required: true,
    min: 0,
    max: 1000000,
    allowNegative: false,
    decimals: 2
});
```

**Options:**
- `required` (boolean) - Pole musí mať hodnotu
- `min` (number) - Minimálna hodnota
- `max` (number) - Maximálna hodnota
- `allowNegative` (boolean) - Povoliť záporné čísla
- `decimals` (number) - Počet desatinných miest

#### validateRequired(entry, fieldNames)

Kontroluje povinné polia (najpouživanejšia funkcia).

```javascript
var result = utils.validation.validateRequired(entry(), [
    "Dátum",
    "Príchod",
    "Odchod",
    "Zamestnanci"
]);

if (!result.valid) {
    dialog("Chyba",
           "Chýbajú povinné polia:\n" + result.missing.join(", "),
           "OK");
    cancel();
}

// Returns:
// {
//   valid: true/false,
//   missing: ["field1", "field2"],  // Zoznam chýbajúcich polí
//   error: "error message"
// }
```

#### validateRange(value, min, max)

```javascript
var result = utils.validation.validateRange(hours, 0, 24);
// Returns: { valid: true/false, error: "..." }
```

#### validateEmail(email)

```javascript
var result = utils.validation.validateEmail("user@example.com");
// Returns: { valid: true, error: null }
```

#### validatePhone(phone, format)

Validuje slovenské telefónne čísla.

```javascript
var result = utils.validation.validatePhone("0901234567", "SK");
// Returns: { valid: true/false, error: "...", formatted: "+421 901 234 567" }
```

---

## MementoFormatting.js

**Verzia:** 1.0.0
**Závislosť:** None (standalone)
**Účel:** Display formatters - money, duration, date, phone, markdown
**Prístup:** `utils.formatting` alebo `MementoFormatting` (direct import)
**Phase 3:** NEW - Centralized formatting logic

### Overview

MementoFormatting poskytuje jednotné formátovanie pre všetky typy výstupov s podporou slovenskej lokalizácie.

### Key Functions

#### formatMoney(amount, decimals)

Formátuje peniaze v slovenskom formáte.

```javascript
var formatted = utils.formatting.formatMoney(1250.50);
// Returns: "1 250,50 €"

var formatted = utils.formatting.formatMoney(1000000);
// Returns: "1 000 000,00 €"

var formatted = utils.formatting.formatMoney(12.5, 0);
// Returns: "13 €" (rounded)
```

**Format:**
- Tisícový oddeľovač: medzera
- Desatinný oddeľovač: čiarka
- Symbol: €
- Default decimals: 2

#### formatDuration(hours, format)

Formátuje hodiny na časový formát.

```javascript
var duration = utils.formatting.formatDuration(8.5);
// Returns: "8:30"

var duration = utils.formatting.formatDuration(0.75);
// Returns: "0:45"

var duration = utils.formatting.formatDuration(12.25);
// Returns: "12:15"
```

#### formatNumber(num, decimals, thousandSep)

```javascript
var num = utils.formatting.formatNumber(1234567.89, 2, " ");
// Returns: "1 234 567,89"

var num = utils.formatting.formatNumber(1234.5, 0);
// Returns: "1 235"
```

#### formatPercent(value, decimals)

```javascript
var percent = utils.formatting.formatPercent(0.25, 0);
// Returns: "25%"

var percent = utils.formatting.formatPercent(0.333, 2);
// Returns: "33,3%"
```

#### formatDate(date, format) / formatTime(date, format)

```javascript
// Date
var str = utils.formatting.formatDate(new Date(), "DD.MM.YYYY");
// Returns: "19.03.2026"

var str = utils.formatting.formatDate(new Date(), "YYYY-MM-DD");
// Returns: "2026-03-19"

// Time
var str = utils.formatting.formatTime(new Date(), "HH:mm");
// Returns: "14:30"

var str = utils.formatting.formatTime(new Date(), "HH:mm:ss");
// Returns: "14:30:45"
```

#### formatEmployeeName(employee)

Formátuje meno zamestnanca konzistentne.

```javascript
var name = utils.formatting.formatEmployeeName(employeeEntry);
// Returns: "Meno Priezvisko" alebo "Priezvisko Meno" (podľa konfigurácie)
```

#### formatPhone(phone, format)

Formátuje telefónne číslo.

```javascript
var phone = utils.formatting.formatPhone("0901234567");
// Returns: "+421 901 234 567"

var phone = utils.formatting.formatPhone("+421901234567", "SK");
// Returns: "+421 901 234 567"
```

#### formatMarkdown(data, template)

Generuje markdown text pre Telegram notifikácie.

```javascript
var markdown = utils.formatting.formatMarkdown({
    title: "Dochádzka",
    date: new Date(),
    hours: 8.5,
    wage: 102
}, "attendance");

// Returns formatted Telegram markdown
```

---

## MementoCalculations.js

**Verzia:** 1.0.0
**Závislosť:** MementoTime, MementoDate
**Účel:** Business calculations - wages, overtime, VAT, profitability
**Prístup:** `utils.calculations` alebo `MementoCalculations` (direct import)
**Phase 3:** NEW - Extracted from MementoBusiness (complex calculations)

### Overview

MementoCalculations obsahuje všetky business výpočty s podporou slovenskej legislatívy (nadčasy, DPH, prestávky).

### Key Functions

#### calculateDailyWage(hoursWorked, hourlyRate, options)

Vypočíta dennú mzdu s nadčasmi a príplatkami.

```javascript
var wage = utils.calculations.calculateDailyWage(10.5, 12, {
    standardHours: 8,           // 8h normálne
    overtimeMultiplier: 1.25,   // 25% príplatok za nadčas
    weekendBonus: 1.0,          // Žiadny víkendový príplatok (pracovný deň)
    holidayBonus: 1.0           // Žiadny sviatkový príplatok
});

// Returns:
// {
//   wage: 157.50,              // Celková mzda
//   regularWage: 96.00,        // Základná mzda (8h × 12€)
//   overtimeWage: 37.50,       // Nadčasy (2.5h × 12€ × 1.25)
//   regularHours: 8.0,         // Štandardné hodiny
//   overtimeHours: 2.5,        // Nadčasové hodiny
//   hourlyRate: 12.00          // Hodinovka
// }
```

**Options:**
- `standardHours` (number) - Štandardný pracovný čas (default: 8)
- `overtimeMultiplier` (number) - Násobok pre nadčasy (default: 1.25)
- `weekendBonus` (number) - Príplatok za víkend (default: 1.5)
- `holidayBonus` (number) - Príplatok za sviatok (default: 2.0)

#### calculateOvertime(totalHours, standardHours, hourlyRate)

Vypočíta nadčasy samostatne.

```javascript
var overtime = utils.calculations.calculateOvertime(10, 8, 12);

// Returns:
// {
//   overtimeHours: 2.0,
//   overtimeWage: 30.00,      // 2h × 12€ × 1.25
//   regularHours: 8.0,
//   regularWage: 96.00
// }
```

#### calculateBreakTime(workHours, rules)

```javascript
var breakMinutes = utils.calculations.calculateBreakTime(8.5, {
    threshold: 6,    // Po 6h práce
    duration: 30     // 30min prestávka
});
// Returns: 30 (minút)
```

#### calculateVAT(amount, rate)

Vypočíta DPH a rozdelí základnú cenu.

```javascript
var vat = utils.calculations.calculateVAT(1200, 0.20);

// Returns:
// {
//   amountWithVat: 1200.00,    // Suma s DPH
//   amountWithoutVat: 1000.00, // Základ dane
//   vatAmount: 200.00,         // Suma DPH
//   vatRate: 0.20              // Sadzba DPH (20%)
// }
```

#### calculateProration(totalAmount, days, totalDays)

Proporcionálny výpočet (napr. mzda za časť mesiaca).

```javascript
var prorated = utils.calculations.calculateProration(1200, 15, 30);
// Returns: 600.00 (half month)
```

#### calculateProfitability(revenue, costs)

Vypočíta ziskovosť.

```javascript
var profit = utils.calculations.calculateProfitability(10000, 7500);

// Returns:
// {
//   revenue: 10000,
//   costs: 7500,
//   profit: 2500,
//   profitMargin: 0.25,        // 25%
//   profitability: 0.33        // 33% (profit/costs)
// }
```

#### calculateHourlyRate(dailyWage, standardHours)

```javascript
var rate = utils.calculations.calculateHourlyRate(96, 8);
// Returns: 12.00
```

### Complete Example

```javascript
// Real-world attendance calculation
var entry = entry();
var date = utils.safeGet(entry, "Dátum");
var startTime = utils.safeGet(entry, "Príchod");
var endTime = utils.safeGet(entry, "Odchod");
var employees = utils.safeGetLinks(entry, "Zamestnanci");

var totalWage = 0;

for (var i = 0; i < employees.length; i++) {
    var emp = employees[i];

    // Calculate work hours
    var workHours = utils.time.calculateHoursDifference(startTime, endTime, {
        roundQuarters: true,
        includeBreak: true,
        breakDuration: 30
    });

    // Get hourly rate
    var rate = utils.safeGet(emp, "Hodinovka", 0);

    // Check for bonuses
    var isWeekend = utils.date.isWeekend(date);
    var isHoliday = utils.date.isHoliday(date);

    // Calculate wage
    var wage = utils.calculations.calculateDailyWage(workHours.decimalHours, rate, {
        standardHours: 8,
        overtimeMultiplier: 1.25,
        weekendBonus: isWeekend ? 1.5 : 1.0,
        holidayBonus: isHoliday ? 2.0 : 1.0
    });

    totalWage += wage.wage;

    // Log details
    utils.addDebug(entry,
        utils.formatting.formatEmployeeName(emp) + ": " +
        utils.formatting.formatDuration(workHours.decimalHours) + " / " +
        utils.formatting.formatMoney(wage.wage)
    );
}

// Save result
utils.safeSet(entry, "Celková mzda", totalWage);
utils.safeSet(entry, "info",
    "Celková mzda: " + utils.formatting.formatMoney(totalWage));
```

---

## MementoUtils7.js

**Verzia:** 7.4.0
**Závislosť:** Všetky moduly (lazy loading)
**Účel:** Jednotný vstupný bod - agregátor všetkých funkcií

### Lazy Loading Systém

```javascript
// MementoUtils automaticky načíta potrebný modul pri prvom použití
var utils = MementoUtils;

// Toto automaticky načíta MementoCore
utils.addDebug(entry(), "Test");

// Toto automaticky načíta MementoTelegram
utils.sendTelegramMessage(chatId, "Hello");

// Toto automaticky načíta MementoBusiness
utils.calculateWorkHours(start, end);
```

### CONFIG API

```javascript
// Priamy prístup k CONFIG
var config = MementoUtils.config;
var libraryName = config.libraries.attendance;

// Helper funkcie
var value = MementoUtils.getConfig("fields.attendance.date");
var library = MementoUtils.getLibrary("attendance");
var field = MementoUtils.getField("attendance", "date");
```

### CORE Funkcie (vždy dostupné)

Všetky funkcie z MementoCore sú dostupné priamo cez MementoUtils:

```javascript
// Logging
MementoUtils.addDebug(entry, message, iconName)
MementoUtils.addError(entry, message, source, error)
MementoUtils.addInfo(entry, message, data, options)
MementoUtils.clearLogs(entry, clearError)

// View režimy
MementoUtils.setEdit(entry)
MementoUtils.setPrint(entry)
MementoUtils.setDebug(entry)
MementoUtils.setView(entry, viewMode)

// Safe field access
MementoUtils.safeGet(entry, fieldName, defaultValue)
MementoUtils.safeSet(entry, fieldName, value)
MementoUtils.safeGetAttribute(entry, fieldName, attrName, defaultValue)
MementoUtils.safeSetAttribute(entry, fieldName, attrName, value, index)
MementoUtils.safeGetLinks(entry, linkFieldName)
MementoUtils.safeGetLinksFrom(entry, libraryName, linkFieldName)

// Formátovanie
MementoUtils.formatDate(date, format)
MementoUtils.formatTime(minutes)
MementoUtils.formatMoney(amount, currency)
MementoUtils.parseTimeToMinutes(timeString)
MementoUtils.roundToQuarter(value)
MementoUtils.roundToQuarterHour(minutes)
MementoUtils.roundTimeToQuarter(time)
MementoUtils.parseTimeInput(input)
MementoUtils.convertDurationToHours(duration)
MementoUtils.convertHoursToDuration(hours)
MementoUtils.convertHoursToTimeString(hours)

// Validácia
MementoUtils.validateRequiredFields(entry, fields)
MementoUtils.validateInputData(data, schema)

// Utility
MementoUtils.getSettings(libraryName, fieldName)
MementoUtils.findEntryById(id)
MementoUtils.getCurrentUser()
MementoUtils.getDayNameSK(date)
MementoUtils.setDayOfWeekField(entry)
MementoUtils.isHoliday(date)
MementoUtils.isWeekend(date)
MementoUtils.addRecordIcon(entry, icon)
MementoUtils.removeRecordIcon(entry, icon)
```

### BUSINESS Funkcie

```javascript
// Pracovný čas
MementoUtils.calculateWorkHours(startTime, endTime)
MementoUtils.calculateWorkTime(startTime, endTime, options)

// Zamestnanci
MementoUtils.formatEmployeeName(employeeEntry)
MementoUtils.getEmployeeDetails(employee, date)
MementoUtils.findEmployeeByNick(nick)
MementoUtils.getActiveEmployees()
MementoUtils.getEmployeeWageForDate(employee, date)

// Sadzby
MementoUtils.findValidSalary(entry, employee, date)
MementoUtils.findValidHourlyRate(entry, employee, date)
MementoUtils.findValidWorkPrice(entry, workItem, date)

// Výkazy
MementoUtils.createOrUpdateReport()
MementoUtils.validateReportData()
MementoUtils.findExistingReport()

// Obligations
MementoUtils.createObligation()
MementoUtils.updateObligation()
```

### AI Funkcie

```javascript
// AI Providers
var providers = MementoUtils.AI_PROVIDERS;
// { OPENAI: {...}, CLAUDE: {...} }

MementoUtils.getApiKey(provider)
MementoUtils.httpRequest(method, url, data, headers)
MementoUtils.callAI(provider, prompt, options)
MementoUtils.analyzeImage(imageUrl, prompt, provider)
```

### TELEGRAM Funkcie

```javascript
// Správy
MementoUtils.sendTelegramMessage(chatId, text, options, keyboard)
MementoUtils.editTelegramMessage(chatId, messageId, text, options)
MementoUtils.deleteTelegramMessage(chatId, messageId)
MementoUtils.sendToTelegramThread(chatId, threadId, text, options)

// Notifikácie
MementoUtils.createNotificationEntry(type, data)
MementoUtils.getTelegramGroup(groupIdentifier)
MementoUtils.cleanupOldNotifications()
MementoUtils.createNotification()
MementoUtils.linkNotification()

// Formatting
MementoUtils.escapeMarkdown(text)
MementoUtils.createInlineKeyboard(buttons)

// Routing
MementoUtils.getTelegramID(entry)
MementoUtils.getTelegramFromOrder()
MementoUtils.isNewRecord()
MementoUtils.checkPermissions()
```

### GPS Funkcie

```javascript
MementoUtils.calculateOSRMRoute(start, end)
MementoUtils.calculateSegment(start, end, segmentName)
MementoUtils.calculateAirDistance(start, end)
MementoUtils.calculateTotalRoute(segments)
MementoUtils.extractGPSFromPlace(place)
```

### Helper Funkcie

```javascript
// Debugging
MementoUtils.getLoadedModules()        // Status modulov
MementoUtils.checkDependencies(required)  // Kontrola
MementoUtils.debugModules(entry)       // Debug info

// Script config
MementoUtils.createScriptConfig(name, version)

// Dialógy
MementoUtils.showErrorDialog(message)
MementoUtils.showSuccessDialog(message)
MementoUtils.showInfoDialog(message)

// Auto-numbering
MementoUtils.generateNextNumber()

// Record tracking
MementoUtils.setEditMode(entry)
MementoUtils.setPrintMode(entry)
MementoUtils.trackRecordCreation(entry)
MementoUtils.trackRecordModification(entry)

// ID conflict resolution
MementoUtils.checkAndResolveIDConflict(entry, idFieldName)
```

---

## MementoBusiness7.js

**Verzia:** 7.4.0
**Závislosť:** MementoConfig, MementoCore
**Účel:** Business logika - pracovný čas, mzdy, výkazy, ceny

### Pracovný Čas

#### calculateWorkHours(startTime, endTime)
Výpočet pracovného času s detailmi.

```javascript
var result = MementoBusiness.calculateWorkHours(
    moment("2026-03-18 08:00"),
    moment("2026-03-18 16:30")
);

// Returns:
{
    hours: 8.5,                // Celkové hodiny (8.5)
    hoursOnly: 8,              // Len hodiny (8)
    minutes: 30,               // Len minúty (30)
    totalMinutes: 510,         // Celkové minúty
    regularHours: 8,           // Bežné hodiny (do 8h)
    overtimeHours: 0.5,        // Nadčasy (nad 8h)
    crossesMidnight: false,    // Práca cez polnoc?
    formatted: "08:30"         // Formátované
}
```

**Práca cez polnoc:**
```javascript
var result = MementoBusiness.calculateWorkHours(
    moment("2026-03-18 22:00"),
    moment("2026-03-19 06:00")
);

// Returns:
{
    hours: 8,
    totalMinutes: 480,
    crossesMidnight: true,  // ⚠️ Práca cez polnoc
    regularHours: 8,
    overtimeHours: 0
}
```

#### calculateWorkTime(startTime, endTime, options)
Univerzálny výpočet s parsing a zaokrúhľovaním.

```javascript
var result = MementoBusiness.calculateWorkTime(
    "8:17",   // String input
    "16:43",  // String input
    {
        entry: entry(),
        roundToQuarter: true,  // Zaokrúhliť na 15 minút
        startFieldName: "Od",  // Uloží zaokrúhlený čas
        endFieldName: "Do",
        workTimeFieldName: "Pracovná doba",
        debugLabel: "Pracovný čas"
    }
);

// Returns:
{
    success: true,
    startTimeRounded: moment("08:15"),    // Zaokrúhlené
    endTimeRounded: moment("16:45"),      // Zaokrúhlené
    startTimeOriginal: moment("08:17"),   // Originál
    endTimeOriginal: moment("16:43"),     // Originál
    pracovnaDobaHodiny: 8.5,              // Výsledok
    workHours: { ... }                     // Detail z calculateWorkHours
}
```

**Options:**
- `entry` - Entry objekt (default: entry())
- `config` - Config objekt (default: MementoConfig)
- `roundToQuarter` - Zaokrúhliť na 15 minút? (default: false)
- `startFieldName` - Pole pre začiatok (pre uloženie)
- `endFieldName` - Pole pre koniec (pre uloženie)
- `workTimeFieldName` - Pole pre pracovnú dobu (pre uloženie)
- `debugLabel` - Label pre debug (default: "Pracovný čas")

### Zamestnanci

#### formatEmployeeName(employeeEntry)
```javascript
var name = MementoBusiness.formatEmployeeName(employee);

// Ak má nick: "Jožko (Mrkvička)"
// Ak nemá nick: "Jozef Mrkvička"
// Ak nič: "Zamestnanec #123"
```

#### getEmployeeDetails(employee, date)
```javascript
var details = MementoBusiness.getEmployeeDetails(employee, new Date());

// Returns:
{
    id: 123,
    nick: "Jožko",
    firstName: "Jozef",
    lastName: "Mrkvička",
    fullName: "Jožko (Mrkvička)",
    status: "Aktívny",
    position: "Robotník",
    department: "Výroba",
    phone: "+421 123 456 789",
    email: "jozko@firma.sk",
    telegramId: "123456789",
    hourlyRate: 15,           // Ak je zadaný dátum
    rateType: "Hodinová sadzba",
    validFrom: "2026-01-01",
    validTo: "2026-12-31"
}
```

#### findEmployeeByNick(nick)
```javascript
var employee = MementoBusiness.findEmployeeByNick("Jožko");
// Returns: Entry objekt alebo null
```

#### getActiveEmployees()
```javascript
var employees = MementoBusiness.getActiveEmployees();
// Returns: Array aktívnych zamestnancov
```

### Sadzby a Ceny

#### findValidSalary(entry, employee, date)
Nájde platnú mzdu pre zamestnanca na daný dátum.

```javascript
var wage = MementoBusiness.findValidSalary(entry(), employee, new Date());

// Returns:
{
    hourlyRate: 15,
    rateType: "Hodinová sadzba",
    validFrom: "2026-01-01",
    validTo: "2026-12-31"
}
// alebo null
```

#### findValidHourlyRate(entry, employee, date)
```javascript
var rate = MementoBusiness.findValidHourlyRate(entry(), employee, new Date());
// Returns: 15 (number) alebo null
```

#### findValidWorkPrice(entry, workItem, date)
```javascript
var price = MementoBusiness.findValidWorkPrice(entry(), workItem, new Date());
// Returns: { price: 50, unit: "hod", validFrom: ..., validTo: ... }
```

### Výkazy (Reports)

#### createOrUpdateReport()
Univerzálna funkcia pre vytvorenie alebo aktualizáciu výkazu.

```javascript
var result = MementoBusiness.createOrUpdateReport({
    entry: entry(),
    reportType: "work",  // work, ride, machines, materials
    sourceLibrary: "Záznam prác",
    sourceField: "Práce HZS",
    config: config
});

// Returns: { success: true, report: entry, isNew: true }
```

### Obligations (Záväzky)

#### createObligation()
```javascript
var obligation = MementoBusiness.createObligation({
    entry: entry(),
    obligationType: "Mzdy",
    amount: 1200,
    creditor: employeeEntry,
    description: "Mzda za marec 2026"
});
```

---

## MementoAI7.js

**Verzia:** 7.0
**Závislosť:** MementoConfig, MementoCore
**Účel:** AI služby (OpenAI, Claude), HTTP wrapper

### AI Providers

```javascript
var providers = MementoAI.AI_PROVIDERS;

// OpenAI
providers.OPENAI.baseUrl  // "https://api.openai.com/v1"
providers.OPENAI.models.GPT4           // "gpt-4"
providers.OPENAI.models.GPT4_TURBO     // "gpt-4-turbo-preview"
providers.OPENAI.models.GPT35_TURBO    // "gpt-3.5-turbo"
providers.OPENAI.models.GPT4_VISION    // "gpt-4-vision-preview"

// Claude
providers.CLAUDE.baseUrl  // "https://api.anthropic.com/v1"
providers.CLAUDE.models.CLAUDE_3_OPUS    // "claude-3-opus-20240229"
providers.CLAUDE.models.CLAUDE_3_SONNET  // "claude-3-sonnet-20240229"
providers.CLAUDE.models.CLAUDE_3_HAIKU   // "claude-3-haiku-20240307"
```

### HTTP Request

#### httpRequest(method, url, data, headers)
```javascript
var response = MementoAI.httpRequest(
    "POST",
    "https://api.example.com/endpoint",
    { name: "Test", value: 123 },
    { "Authorization": "Bearer token123" }
);

// Returns:
{
    code: 200,           // HTTP status code
    body: "...",         // Response body (string)
    headers: { ... }     // Response headers
}
```

**Supported methods:** GET, POST, PUT, DELETE

### AI Funkcie

#### getApiKey(provider)
```javascript
var openAIKey = MementoAI.getApiKey("OPENAI");
var claudeKey = MementoAI.getApiKey("CLAUDE");
```

**Kľúče sa získavajú z:** ASISTANTO Defaults knižnica

#### callAI(provider, prompt, options)
```javascript
var result = MementoAI.callAI(
    "OPENAI",
    "Vyrátaj 15% DPH zo sumy 1200€",
    {
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 1000,
        systemPrompt: "Si finančný asistent."
    }
);

// Returns:
{
    success: true,
    response: "DPH zo sumy 1200€ je 180€...",
    usage: {
        promptTokens: 25,
        completionTokens: 50,
        totalTokens: 75
    }
}
```

#### analyzeImage(imageUrl, prompt, provider)
```javascript
var result = MementoAI.analyzeImage(
    "https://example.com/receipt.jpg",
    "Prečítaj text z účtenky a vráť sumu s DPH",
    "OPENAI"
);

// Returns:
{
    success: true,
    response: "Suma s DPH: 45,80 €",
    usage: { ... }
}
```

---

## MementoTelegram8.js

**Verzia:** 8.0.2
**Závislosť:** MementoConfig, MementoCore, MementoAI
**Účel:** Telegram Bot API, správy, notifikácie, skupiny, threads

### Základné Funkcie

#### getBotToken()
```javascript
var token = MementoTelegram.getBotToken();
// Returns: "123456:ABC-DEF..." alebo null
```

#### sendTelegramMessage(chatId, text, options, inlineKeyboard)
```javascript
var result = MementoTelegram.sendTelegramMessage(
    "-1001234567890",  // Chat ID (negative pre skupiny)
    "*Nová dochádzka*\n\nDátum: 18.03.2026\nHodiny: 8.5",
    {
        parseMode: "Markdown",  // "Markdown" alebo "HTML"
        threadId: 123,          // Thread ID (téma v skupine)
        disablePreview: true,   // Vypnúť web preview
        silent: false,          // Tichá notifikácia
        createNotification: true  // Vytvoriť záznam v Notifications
    },
    {
        inline_keyboard: [
            [
                { text: "✅ Schváliť", callback_data: "approve" },
                { text: "❌ Zamietnuť", callback_data: "reject" }
            ]
        ]
    }
);

// Returns:
{
    success: true,
    messageId: 12345,
    chatId: "-1001234567890",
    date: 1710765000
}
```

#### editTelegramMessage(chatId, messageId, text, options)
```javascript
var result = MementoTelegram.editTelegramMessage(
    "-1001234567890",
    12345,
    "*Aktualizovaná dochádzka*\n\nDátum: 18.03.2026\nHodiny: 9.0",
    { parseMode: "Markdown" }
);
```

#### deleteTelegramMessage(chatId, messageId)
```javascript
var result = MementoTelegram.deleteTelegramMessage(
    "-1001234567890",
    12345
);
```

#### sendToTelegramThread(chatId, threadId, text, options)
```javascript
var result = MementoTelegram.sendToTelegramThread(
    "-1001234567890",
    123,  // Thread ID
    "Správa do témy",
    { parseMode: "Markdown" }
);
```

### Notifikačný Systém

#### createNotificationEntry(type, data)
```javascript
var notification = MementoTelegram.createNotificationEntry(
    "sent",
    {
        chatId: "-1001234567890",
        messageId: 12345,
        threadId: 123,
        text: "Správa...",
        timestamp: new Date()
    }
);
```

#### getTelegramGroup(groupIdentifier)
```javascript
var group = MementoTelegram.getTelegramGroup("Zákazka XYZ");
// Returns: { chatId: "-100...", threadId: 123 } alebo null
```

#### cleanupOldNotifications()
```javascript
MementoTelegram.cleanupOldNotifications();
// Vymaže notifikácie staršie ako 30 dní
```

### Formatting

#### escapeMarkdown(text)
```javascript
var escaped = MementoTelegram.escapeMarkdown("Test_text*bold");
// Returns: "Test\\_text\\*bold"
```

#### createInlineKeyboard(buttons)
```javascript
var keyboard = MementoTelegram.createInlineKeyboard([
    [
        { text: "✅ Áno", callback_data: "yes" },
        { text: "❌ Nie", callback_data: "no" }
    ],
    [
        { text: "ℹ️ Info", url: "https://example.com" }
    ]
]);

// Returns:
{
    inline_keyboard: [
        [ ... ],
        [ ... ]
    ]
}
```

### Routing

#### getTelegramID(entry)
Získa Telegram ID z entry podľa typu príjemcu.

```javascript
var result = MementoTelegram.getTelegramID(entry());

// Returns:
{
    chatId: "-1001234567890",
    threadId: 123,
    type: "group"  // "individual", "group", "customer"
}
```

---

## MementoGPS.js

**Verzia:** 1.1.0
**Závislosť:** MementoConfig, MementoCore, MementoAI
**Účel:** OSRM routing API, vzdialenosti, GPS utility

### OSRM Config

```javascript
var config = {
    osrm: {
        maxRetries: 3,
        baseUrl: "https://router.project-osrm.org/route/v1/driving/",
        requestTimeout: 5000
    }
};
```

### Routing Funkcie

#### calculateOSRMRoute(start, end)
Zavolá OSRM API pre routing.

```javascript
var result = MementoGPS.calculateOSRMRoute(
    { lat: 48.1486, lon: 17.1077 },  // Bratislava
    { lat: 48.3060, lon: 18.0809 }   // Nitra
);

// Returns:
{
    success: true,
    km: 95.2,
    duration: 68  // minúty
}
```

#### calculateSegment(start, end, segmentName)
Segment s retry logikou.

```javascript
var result = MementoGPS.calculateSegment(
    { lat: 48.1486, lon: 17.1077 },
    { lat: 48.3060, lon: 18.0809 },
    "Bratislava - Nitra"
);

// Returns (úspech):
{
    success: true,
    km: 95.2,
    duration: 68,
    metoda: "OSRM"
}

// Returns (zlyhanie):
{
    success: false,
    km: 0,
    duration: 0,
    metoda: "none"
}
```

**⚠️ DÔLEŽITÉ:** Ak OSRM zlyhá, NEvracia fallback vzdialenosť - vracia `success: false`

#### calculateAirDistance(start, end)
Vzdušná vzdialenosť (Haversine formula). Nie pre routing!

```javascript
var km = MementoGPS.calculateAirDistance(
    { lat: 48.1486, lon: 17.1077 },
    { lat: 48.3060, lon: 18.0809 }
);
// Returns: 75.4 (km vzdušnou čiarou)
```

#### calculateTotalRoute(segments)
```javascript
var total = MementoGPS.calculateTotalRoute([
    { km: 95.2, duration: 68 },
    { km: 45.0, duration: 35 },
    { km: 30.5, duration: 25 }
]);

// Returns:
{
    totalKm: 170.7,
    totalDuration: 128  // minúty
}
```

### GPS Utility

#### extractGPSFromPlace(place)
```javascript
var gps = MementoGPS.extractGPSFromPlace(placeEntry);

// Returns:
{
    lat: 48.1486,
    lon: 17.1077
}
// alebo null
```

---

## MementoRecordTracking.js

**Verzia:** 1.1.0
**Závislosť:** MementoConfig
**Účel:** Automatické sledovanie vytvorenia/úpravy záznamov

### View Režimy

#### setEditMode(entry)
```javascript
var result = MementoRecordTracking.setEditMode(entry());
// Nastaví view pole na "Editácia " (opening card phase)

// Returns: { success: true, editMode: true }
```

#### setPrintMode(entry)
```javascript
var result = MementoRecordTracking.setPrintMode(entry());
// Nastaví view pole na "Tlač" (before save phase)

// Returns: { success: true, printMode: true }
```

#### setDebugMode(entry)
```javascript
var result = MementoRecordTracking.setDebugMode(entry());
// Nastaví view pole na "Debug" (manuálne)

// Returns: { success: true, debugMode: true }
```

**⚠️ POZOR:** Hodnoty sa automaticky normalizujú (trim) pre kompatibilitu

### Tracking Funkcie

#### trackRecordCreation(entry)
```javascript
var result = MementoRecordTracking.trackRecordCreation(entry());
// Nastaví:
// - "zapísal" = current user
// - "dátum zápisu" = now

// Returns: { success: true, tracking: true }
```

#### trackRecordModification(entry)
```javascript
var result = MementoRecordTracking.trackRecordModification(entry());
// Nastaví:
// - "upravil" = current user
// - "dátum úpravy" = now

// Returns: { success: true, tracking: true }
```

### Kombinované Funkcie

#### initializeNewRecord(entry)
```javascript
var result = MementoRecordTracking.initializeNewRecord(entry());
// = setEditMode + trackRecordCreation

// Returns:
{
    success: true,
    editMode: true,
    tracking: true
}
```

#### processRecordUpdate(entry)
```javascript
var result = MementoRecordTracking.processRecordUpdate(entry());
// = setPrintMode + trackRecordModification

// Returns:
{
    success: true,
    printMode: true,
    tracking: true
}
```

### Použitie v Scriptoch

**Opening Card Phase:**
```javascript
// Na začiatku scriptu (opening card)
MementoRecordTracking.initializeNewRecord(entry());
```

**Before Save Phase:**
```javascript
// Pred uložením (before save)
MementoRecordTracking.processRecordUpdate(entry());
```

---

## MementoIDConflictResolver.js

**Verzia:** 1.0.0
**Závislosť:** MementoConfig, MementoCore
**Účel:** Riešenie ID konfliktov v team verzii Memento Database

### Hlavná Funkcia

#### checkAndResolveIDConflict(entry, idFieldName)
```javascript
var result = MementoIDConflictResolver.checkAndResolveIDConflict(
    entry(),
    "ID"  // Názov ID poľa
);

// Returns (žiadny konflikt):
{
    success: true,
    conflictDetected: false,
    oldID: 123,
    newID: 123
}

// Returns (konflikt vyriešený):
{
    success: true,
    conflictDetected: true,
    oldID: 123,
    newID: 124,  // Nové ID = maxID + 1
    message: "ID konflikt vyriešený: 123 → 124"
}

// Returns (chyba):
{
    success: false,
    error: "Error message..."
}
```

**Algoritmus:**
1. Iteruje cez všetky existujúce záznamy
2. Trackuje maximum ID
3. Hľadá konflikt s aktuálnym ID
4. Ak konflikt, nastaví newID = maxID + 1

### Helper Funkcie

#### findMaxID(idFieldName)
```javascript
var maxID = MementoIDConflictResolver.findMaxID("ID");
// Returns: 125 (number) alebo 0
```

#### idExists(id, idFieldName)
```javascript
var exists = MementoIDConflictResolver.idExists(123, "ID");
// Returns: true/false
```

### Use Case

Team verzia Memento s viacerými užívateľmi:

```javascript
// V Before Save scripte:
var result = MementoIDConflictResolver.checkAndResolveIDConflict(entry(), "ID");

if (result.conflictDetected) {
    message("⚠️ ID konflikt vyriešený: " + result.oldID + " → " + result.newID);
}
```

---

## MementoAutoNumber.js

**Verzia:** 2.0.0
**Závislosť:** ASISTANTO Defaults
**Účel:** Auto-generovanie čísel záznamov s placeholdermi

### Placeholder Formát

```
YYYY → 2026 (4-ciferný rok)
YY   → 26 (2-ciferný rok)
MM   → 01-12 (mesiac)
DD   → 01-31 (deň)
XXX  → 001, 002, 003... (sekvenčné číslo s paddingom)
```

### Príklady Placeholderov

```
"CYYXXX"        → C26001, C26002, C26003...
"ZYYXXX"        → Z26001, Z26002, Z26003...
"INV-YYYY-XXXX" → INV-2026-0001, INV-2026-0002...
"FYYMMXXX"      → F2603001, F2603002... (rok, mesiac, číslo)
```

### Hlavná Funkcia

#### autoGenerateNumber(libraryName, numberFieldName, placeholderFieldName)
```javascript
var result = MementoAutoNumber.autoGenerateNumber(
    "Cenové ponuky",     // Názov knižnice
    "Číslo",             // Pole pre číslo
    "Placeholder"        // Pole s placeholderom v ASISTANTO Defaults
);

// Returns (úspech):
{
    success: true,
    number: "C26001",
    prefix: "C26",
    sequence: 1,
    placeholder: "CYYXXX"
}

// Returns (chyba):
{
    success: false,
    error: "Placeholder nie je definovaný"
}
```

**⚠️ POZOR:** Placeholder sa získava z ASISTANTO Defaults knižnice!

### Konfigurácia v ASISTANTO Defaults

V ASISTANTO Defaults knižnici vytvorte polia:

```
Cenové ponuky Placeholder: "CYYXXX"
Zákazky Placeholder: "ZYYXXX"
Faktúry Placeholder: "INV-YYYY-XXXX"
```

### Helper Funkcie (interné)

```javascript
// Parsing placeholdera
parsePlaceholder(placeholder, year, month, day)

// Nájdenie voľného čísla (vrátane vyplnenia medzier)
findNextAvailableNumber(existingNumbers)

// Padding
padLeft(str, length, char)
```

### Použitie v Scripte

```javascript
// V Before Save scripte:
var currentEntry = entry();
var numberField = MementoConfig.getField("quotes", "number");

// Skontroluj, či už má číslo
if (!currentEntry.field(numberField)) {
    var result = MementoAutoNumber.autoGenerateNumber(
        "Cenové ponuky",
        numberField,
        "Cenové ponuky Placeholder"
    );

    if (result.success) {
        currentEntry.set(numberField, result.number);
        message("✅ Číslo priradené: " + result.number);
    } else {
        message("❌ Chyba: " + result.error);
    }
}
```

---

## Best Practices

### 1. Vždy používaj MementoConfig

**❌ ZLE:**
```javascript
var date = entry().field("Dátum");  // Hardcoded názov poľa
```

**✅ DOBRE:**
```javascript
var config = MementoConfig.getConfig();
var dateField = config.fields.attendance.date;
var date = entry().field(dateField);
```

### 2. Používaj Safe Field Access

**❌ ZLE:**
```javascript
var employees = entry().field("Zamestnanci");  // Môže vyhodiť chybu
for (var i = 0; i < employees.length; i++) {
    var rate = employees[i].attr("hodinovka");  // Môže vyhodiť chybu
}
```

**✅ DOBRE:**
```javascript
var employees = MementoCore.safeGetLinks(entry(), "Zamestnanci");  // Vždy vráti array
for (var i = 0; i < employees.length; i++) {
    var rate = MementoCore.safeGetAttribute(employees[i], null, "hodinovka", 0);  // Default 0
}
```

### 3. Používaj MementoUtils ako Vstupný Bod

**❌ ZLE:**
```javascript
var core = MementoCore;
core.addDebug(entry(), "Test");
```

**✅ DOBRE:**
```javascript
var utils = MementoUtils;
utils.addDebug(entry(), "Test");  // Automatický lazy loading
```

### 4. Loguj Všetko

```javascript
var utils = MementoUtils;

// Na začiatku scriptu
utils.clearLogs(entry(), false);
utils.addDebug(entry(), "Script started", "start");

// Počas vykonávania
utils.addDebug(entry(), "Calculating hours", "calculation");

// Pri chybe
try {
    // ... kód ...
} catch (error) {
    utils.addError(entry(), "Calculation failed", "calculateHours", error);
}

// Na konci
utils.addInfo(entry(), "Calculation complete", { hours: 8.5, wage: 120 });
```

### 5. Validuj Vstupy

```javascript
var utils = MementoUtils;
var config = utils.config;

// Validuj povinné polia
var validation = utils.validateRequiredFields(entry(), [
    config.fields.attendance.date,
    config.fields.attendance.employees,
    config.fields.attendance.arrival,
    config.fields.attendance.departure
]);

if (!validation.valid) {
    message("❌ Chýbajúce polia: " + validation.missing.join(", "));
    return;
}
```

### 6. Používaj Lazy Loading

```javascript
// MementoUtils automaticky načíta potrebné moduly
var utils = MementoUtils;

// Toto načíta MementoTelegram len ak sa použije
utils.sendTelegramMessage(chatId, "Test");

// Toto načíta MementoBusiness len ak sa použije
utils.calculateWorkHours(start, end);
```

### 7. Handling Chýb

```javascript
var utils = MementoUtils;

try {
    // Hlavný kód
    var result = utils.calculateWorkHours(start, end);

    if (!result || result.error) {
        throw new Error("Calculation failed: " + (result ? result.error : "Unknown"));
    }

    // Spracuj výsledok
    utils.addDebug(entry(), "Hours calculated: " + result.hours);

} catch (error) {
    utils.addError(entry(), error.toString(), "MainScript", error);
    message("❌ Chyba: " + error.toString());
}
```

### 8. Zaokrúhľovanie Časov

```javascript
var utils = MementoUtils;

// 15-minútové zaokrúhľovanie
var result = utils.calculateWorkTime(
    "8:17",
    "16:43",
    {
        roundToQuarter: true,
        startFieldName: "Od",
        endFieldName: "Do"
    }
);

// Výsledok: 8:15 - 16:45 = 8.5 hodín
```

### 9. Práca s Library Info

```javascript
// ❌ ZLE: lib().name (nefunguje spoľahlivo)
var libraryName = lib().name;

// ✅ DOBRE: lib().title
var libraryName = lib().title;  // "Dochádzka"
```

### 10. Entry ID vs Custom ID Field

```javascript
// Entry ID (Memento ID) - použiť pre foreign keys
var mementoId = entry().id;  // "RFtIS3VOcHpEaTRJWDVlaFs2TTo"

// Custom ID field - interné číslo
var config = MementoUtils.config;
var customId = entry().field(config.fields.common.id);  // 123

// ⚠️ KRITICKÉ: Junction tables používajú entry.id, NIE custom ID!
```

---

## Príklady Použitia

### Príklad 1: Výpočet Dochádzky

```javascript
/**
 * Dochádzka - Hlavný prepočet
 * Verzia: 8.0
 */

// Import modulov
var utils = MementoUtils;
var config = utils.config;
var currentEntry = entry();

// Vyčisti logy
utils.clearLogs(currentEntry, false);
utils.addDebug(currentEntry, "=== Dochádzka Prepočet v8.0 ===", "start");

try {
    // Validuj povinné polia
    var validation = utils.validateRequiredFields(currentEntry, [
        config.fields.attendance.date,
        config.fields.attendance.arrival,
        config.fields.attendance.departure,
        config.fields.attendance.employees
    ]);

    if (!validation.valid) {
        throw new Error("Chýbajúce polia: " + validation.missing.join(", "));
    }

    // Získaj dáta
    var date = utils.safeGet(currentEntry, config.fields.attendance.date);
    var arrival = utils.safeGet(currentEntry, config.fields.attendance.arrival);
    var departure = utils.safeGet(currentEntry, config.fields.attendance.departure);
    var employees = utils.safeGetLinks(currentEntry, config.fields.attendance.employees);

    utils.addDebug(currentEntry, "Dátum: " + utils.formatDate(date));
    utils.addDebug(currentEntry, "Príchod: " + utils.formatTime(arrival));
    utils.addDebug(currentEntry, "Odchod: " + utils.formatTime(departure));
    utils.addDebug(currentEntry, "Zamestnanci: " + employees.length);

    // Výpočet pracovného času s zaokrúhľovaním
    var workTime = utils.calculateWorkTime(arrival, departure, {
        entry: currentEntry,
        roundToQuarter: true,
        startFieldName: config.fields.attendance.arrival,
        endFieldName: config.fields.attendance.departure,
        workTimeFieldName: config.fields.attendance.workTime,
        debugLabel: "Pracovná doba"
    });

    if (!workTime.success) {
        throw new Error("Výpočet pracovného času zlyhal: " + workTime.error);
    }

    // Výpočet miezd pre zamestnancov
    var totalWageCosts = 0;
    var totalWorkedHours = 0;

    for (var i = 0; i < employees.length; i++) {
        var employee = employees[i];
        var employeeName = utils.formatEmployeeName(employee);

        // Získaj hodinovú sadzbu
        var hourlyRate = utils.findValidHourlyRate(currentEntry, employee, date);
        if (!hourlyRate) {
            utils.addError(currentEntry, "Nenájdená sadzba pre " + employeeName, "calculateWages");
            continue;
        }

        // Získaj odpracované hodiny z atribútu
        var workedHours = utils.safeGetAttribute(employee, null,
            config.fields.attendance.employeeAttributes.workedHours,
            workTime.pracovnaDobaHodiny);

        // Výpočet mzdy
        var dailyWage = workedHours * hourlyRate;

        // Uloopž atribúty
        utils.safeSetAttribute(currentEntry, config.fields.attendance.employees,
            config.fields.attendance.employeeAttributes.hourlyRate, hourlyRate, i);
        utils.safeSetAttribute(currentEntry, config.fields.attendance.employees,
            config.fields.attendance.employeeAttributes.dailyWage, dailyWage, i);

        totalWageCosts += dailyWage;
        totalWorkedHours += workedHours;

        utils.addDebug(currentEntry, "  • " + employeeName + ": " + workedHours + "h × " + hourlyRate + "€ = " + dailyWage + "€");
    }

    // Uloň výsledky
    utils.safeSet(currentEntry, config.fields.attendance.employeeCount, employees.length);
    utils.safeSet(currentEntry, config.fields.attendance.workedHours, totalWorkedHours);
    utils.safeSet(currentEntry, config.fields.attendance.wageCosts, totalWageCosts);

    // Nastaň view režim
    utils.setPrint(currentEntry);

    // Track modifikáciu
    utils.trackRecordModification(currentEntry);

    // Info správa
    utils.addInfo(currentEntry, "Výpočet úspešne dokončený", {
        pracovnaDoba: workTime.pracovnaDobaHodiny + " h",
        pocetZamestnancov: employees.length,
        celkoveHodiny: totalWorkedHours + " h",
        mzdoveNaklady: totalWageCosts + " €"
    }, {
        scriptName: "Dochádzka Prepočet",
        scriptVersion: "8.0"
    });

    utils.addDebug(currentEntry, "=== Výpočet dokončený ===", "success");

} catch (error) {
    utils.addError(currentEntry, error.toString(), "MainScript", error);
    message("❌ Chyba: " + error.toString());
}
```

### Príklad 2: Telegram Notifikácia

```javascript
/**
 * Dochádzka - Individual Notification
 * Verzia: 3.0
 */

var utils = MementoUtils;
var config = utils.config;
var currentEntry = entry();

try {
    // Získaj zamestnancov
    var employees = utils.safeGetLinks(currentEntry, config.fields.attendance.employees);

    for (var i = 0; i < employees.length; i++) {
        var employee = employees[i];
        var telegramId = utils.safeGet(employee, config.fields.employee.telegramId);

        if (!telegramId) {
            utils.addDebug(currentEntry, "Zamestnanec nemá Telegram ID, preskakujem");
            continue;
        }

        // Zís Vytvor správu
        var message = "*📋 Dochádzka zaevidovaná*\n\n";
        message += "*Dátum:* " + utils.formatDate(currentEntry.field("Dátum")) + "\n";
        message += "*Príchod:* " + utils.formatTime(currentEntry.field("Príchod")) + "\n";
        message += "*Odchod:* " + utils.formatTime(currentEntry.field("Odchod")) + "\n";

        var workedHours = utils.safeGetAttribute(currentEntry, config.fields.attendance.employees,
            config.fields.attendance.employeeAttributes.workedHours, 0, i);
        var dailyWage = utils.safeGetAttribute(currentEntry, config.fields.attendance.employees,
            config.fields.attendance.employeeAttributes.dailyWage, 0, i);

        message += "*Odpracované:* " + workedHours + " h\n";
        message += "*Mzda:* " + dailyWage + " €\n";

        // Odošli
        var result = utils.sendTelegramMessage(
            telegramId,
            message,
            { parseMode: "Markdown" }
        );

        if (result.success) {
            utils.addDebug(currentEntry, "Notifikácia odoslaná: " + utils.formatEmployeeName(employee));
        } else {
            utils.addError(currentEntry, "Zlyhalo odoslanie: " + result.error);
        }
    }

} catch (error) {
    utils.addError(currentEntry, error.toString(), "TelegramNotification", error);
}
```

### Príklad 3: GPS Routing

```javascript
/**
 * Kniha jázd - GPS Routing
 * Verzia: 9.0
 */

var utils = MementoUtils;
var config = utils.config;
var currentEntry = entry();

try {
    // Získaj štart a cieľ
    var startPlace = utils.safeGet(currentEntry, config.fields.rideLog.start);
    var destinationPlace = utils.safeGet(currentEntry, config.fields.rideLog.destination);

    if (!startPlace || !destinationPlace) {
        throw new Error("Chýba štart alebo cieľ");
    }

    // Extrahuj GPS súradnice
    var startGPS = utils.extractGPSFromPlace(startPlace);
    var destGPS = utils.extractGPSFromPlace(destinationPlace);

    if (!startGPS || !destGPS) {
        throw new Error("Nepodarilo sa získať GPS súradnice");
    }

    utils.addDebug(currentEntry, "Štart: " + startGPS.lat + ", " + startGPS.lon);
    utils.addDebug(currentEntry, "Cieľ: " + destGPS.lat + ", " + destGPS.lon);

    // Výpočet trasy cez OSRM
    var result = utils.calculateSegment(startGPS, destGPS, "Hlavná trasa");

    if (result.success) {
        // Uloží výsledky
        utils.safeSet(currentEntry, config.fields.rideLog.km, result.km);
        utils.safeSet(currentEntry, config.fields.rideLog.rideTime, result.duration);

        utils.addDebug(currentEntry, "Trasa vypočítaná: " + result.km + " km, " + result.duration + " min");

        // Výpočet nákladov
        var rate = utils.safeGet(currentEntry, config.fields.rideLog.rate, 0.5);  // Default 0.5€/km
        var vehicleCosts = result.km * rate;

        utils.safeSet(currentEntry, config.fields.rideLog.vehicleCosts, vehicleCosts);

        utils.addInfo(currentEntry, "GPS routing dokončený", {
            km: result.km,
            duration: result.duration + " min",
            rate: rate + " €/km",
            costs: vehicleCosts + " €"
        });

    } else {
        utils.addError(currentEntry, "OSRM routing zlyhal", "GPSRouting");
    }

} catch (error) {
    utils.addError(currentEntry, error.toString(), "GPSRouting", error);
}
```

---

## Záver

Tento dokument pokrýva kompletné API všetkých 10 core modulov Memento Database projektu. Pre viac informácií pozri:

- **MEMENTO_PROJECT_STRUCTURE.md** - Organizácia projektu
- **MEMENTO_NAMING_CONVENTION.md** - Konvencie pomenovania
- **MEMENTO_API_ACCESS.md** - Python API utilities
- **CLAUDE.md** - Claude Code inštrukcie

**Verzia dokumentácie:** 1.0.0
**Posledná aktualizácia:** 2026-03-18
