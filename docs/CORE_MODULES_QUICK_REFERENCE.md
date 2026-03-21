# Memento Core Modules - Quick Reference

**Rýchly referenčný sprievodca** | Verzia 1.0.0 | 2026-03-18

---

## Import a Použitie

```javascript
// Základný import (vstupný bod)
var utils = MementoUtils;
var config = utils.config;
var currentEntry = entry();

// Logging
utils.addDebug(currentEntry, "Debug správa", "iconName");
utils.addError(currentEntry, "Chyba", "source", error);
utils.addInfo(currentEntry, "Info", data, options);
utils.clearLogs(currentEntry, false);

// View režimy
utils.setEdit(currentEntry);   // "Editácia "
utils.setPrint(currentEntry);  // "Tlač"
utils.setDebug(currentEntry);  // "Debug"
```

---

## MementoConfig - Prístup ku Konfigurácii

```javascript
var config = MementoUtils.config;

// === LIBRARIES ===
config.libraries.attendance        // "Dochádzka"
config.libraries.workRecords       // "Záznam prác"
config.libraries.rideLog          // "Kniha jázd"
config.libraries.employees        // "Zamestnanci"
config.libraries.quotes           // "Cenové ponuky"
config.libraries.orders           // "Zákazky"
config.libraries.defaults         // "ASISTANTO Defaults"

// === LIBRARY IDS ===
config.libraryIds.quotes          // "90RmdjWuk"
config.libraryIds.orders          // "CfRHN7QTG"
config.libraryIds.machinesReport  // "uCRaUwsTo"

// === COMMON FIELDS ===
config.fields.common.id              // "ID"
config.fields.common.view            // "view"
config.fields.common.debugLog        // "Debug_Log"
config.fields.common.errorLog        // "Error_Log"
config.fields.common.info            // "info"
config.fields.common.createdBy       // "zapísal"
config.fields.common.modifiedBy      // "upravil"
config.fields.common.createdDate     // "dátum zápisu"
config.fields.common.modifiedDate    // "dátum úpravy"

// === ATTENDANCE FIELDS ===
config.fields.attendance.date           // "Dátum"
config.fields.attendance.arrival        // "Príchod"
config.fields.attendance.departure      // "Odchod"
config.fields.attendance.employees      // "Zamestnanci"
config.fields.attendance.workTime       // "Pracovná doba"
config.fields.attendance.workedHours    // "Odpracované"
config.fields.attendance.wageCosts      // "Mzdové náklady"
config.fields.attendance.employeeCount  // "Počet pracovníkov"

// Employee attributes
config.fields.attendance.employeeAttributes.workedHours  // "odpracované"
config.fields.attendance.employeeAttributes.hourlyRate   // "hodinovka"
config.fields.attendance.employeeAttributes.dailyWage    // "denná mzda"
config.fields.attendance.employeeAttributes.bonus        // "+príplatok (€/h)"
config.fields.attendance.employeeAttributes.premium      // "+prémia (€)"
config.fields.attendance.employeeAttributes.penalty      // "-pokuta (€)"

// === WORK RECORD FIELDS ===
config.fields.workRecord.date         // "Dátum"
config.fields.workRecord.order        // "Zákazka"
config.fields.workRecord.employees    // "Zamestnanci"
config.fields.workRecord.startTime    // "Od"
config.fields.workRecord.endTime      // "Do"
config.fields.workRecord.workedHours  // "Odpracované"
config.fields.workRecord.hzs          // "Hodinová zúčtovacia sadzba"

// === RIDE LOG FIELDS ===
config.fields.rideLog.date          // "Dátum"
config.fields.rideLog.vehicle       // "Vozidlo"
config.fields.rideLog.driver        // "Šofér"
config.fields.rideLog.crew          // "Posádka"
config.fields.rideLog.km            // "Km"
config.fields.rideLog.start         // "Štart"
config.fields.rideLog.destination   // "Cieľ"

// === GLOBAL SETTINGS ===
config.global.timezone       // "Europe/Bratislava"
config.global.dateFormat     // "DD.MM.YYYY"
config.global.timeFormat     // "HH:mm"
config.global.currency       // "EUR"
config.global.language       // "sk_SK"
```

---

## MementoCore - Safe Field Access

```javascript
// Získanie hodnoty
var value = utils.safeGet(entry, "Pole", defaultValue);
var date = utils.safeGet(entry, "Dátum", null);
var hours = utils.safeGet(entry, "Odpracované", 0);

// Nastavenie hodnoty
utils.safeSet(entry, "Odpracované", 8.5);

// Links (LinkToEntry)
var employees = utils.safeGetLinks(entry, "Zamestnanci");  // Array alebo []
var workRecords = utils.safeGetLinksFrom(entry, "Záznam prác", "Dochádzka");

// Atribúty (single link)
var rate = utils.safeGetAttribute(entry, "Zamestnanec", "hodinovka", 0);
utils.safeSetAttribute(entry, "Zamestnanec", "hodinovka", 15);

// Atribúty (multi-select link)
var rates = utils.safeGetAttribute(entry, "Zamestnanci", "hodinovka", []);  // Array
utils.safeSetAttribute(entry, "Zamestnanci", "odpracované", 8);  // Všetkým
utils.safeSetAttribute(entry, "Zamestnanci", "odpracované", 8, 0);  // Index 0
```

---

## MementoCore - Formátovanie

```javascript
// Dátum
var formatted = utils.formatDate(new Date(), "DD.MM.YYYY");  // "18.03.2026"

// Čas (minúty → HH:mm)
var time = utils.formatTime(510);  // "08:30"
var time = utils.formatTime(90);   // "01:30"

// Peniaze
var price = utils.formatMoney(1250.50, "EUR");  // "1 250,50 €"

// Parsing času
var minutes = utils.parseTimeToMinutes("08:30");  // 510
var time = utils.parseTimeInput("8:30");  // moment object

// Zaokrúhľovanie
var rounded = utils.roundToQuarter(8.37);  // 8.25 (na štvrtiny)
var roundedMin = utils.roundToQuarterHour(487);  // 480 (na 15 min)
var roundedTime = utils.roundTimeToQuarter(momentObj);  // moment

// Konverzie
var hours = utils.convertDurationToHours("08:30");  // 8.5
var duration = utils.convertHoursToDuration(8.5);    // "08:30"
var timeStr = utils.convertHoursToTimeString(8.5);  // "08:30"
```

---

## MementoCore - Validácia

```javascript
// Povinné polia
var result = utils.validateRequiredFields(entry, ["Dátum", "Zamestnanec", "Od", "Do"]);
if (!result.valid) {
    message("Chýba: " + result.missing.join(", "));
}

// Schema validácia
var schema = {
    date: { required: true, type: "date" },
    hours: { required: true, type: "number", min: 0, max: 24 }
};
var result = utils.validateInputData({ date: new Date(), hours: 8 }, schema);
```

---

## MementoCore - Utility

```javascript
// Nastavenia
var apiKey = utils.getSettings("ASISTANTO Defaults", "OpenAI API Key");

// Užívateľ
var user = utils.getCurrentUser();

// Dátum utility
var dayName = utils.getDayNameSK(new Date());  // "Pondelok", "Utorok", ...
utils.setDayOfWeekField(entry);  // Automaticky nastaví "Deň" pole
var isHoliday = utils.isHoliday(new Date());  // true/false
var isWeekend = utils.isWeekend(new Date());  // true/false

// Ikony
utils.addRecordIcon(entry, "✅");
utils.removeRecordIcon(entry, "✅");
```

---

## MementoBusiness - Pracovný Čas

```javascript
// Základný výpočet
var result = utils.calculateWorkHours(
    moment("2026-03-18 08:00"),
    moment("2026-03-18 16:30")
);
// Returns: { hours: 8.5, minutes: 30, totalMinutes: 510, regularHours: 8,
//            overtimeHours: 0.5, crossesMidnight: false, formatted: "08:30" }

// Univerzálny výpočet s parsing a zaokrúhľovaním
var result = utils.calculateWorkTime("8:17", "16:43", {
    roundToQuarter: true,
    startFieldName: "Od",
    endFieldName: "Do",
    workTimeFieldName: "Pracovná doba"
});
// Returns: { success, startTimeRounded, endTimeRounded, pracovnaDobaHodiny: 8.5 }
```

---

## MementoBusiness - Zamestnanci

```javascript
// Formátovanie mena
var name = utils.formatEmployeeName(employee);  // "Jožko (Mrkvička)"

// Detaily
var details = utils.getEmployeeDetails(employee, new Date());
// Returns: { id, nick, fullName, status, hourlyRate, ... }

// Vyhľadávanie
var employee = utils.findEmployeeByNick("Jožko");
var employees = utils.getActiveEmployees();  // Len aktívni

// Sadzby
var wage = utils.findValidSalary(entry, employee, new Date());
var rate = utils.findValidHourlyRate(entry, employee, new Date());
var price = utils.findValidWorkPrice(entry, workItem, new Date());
```

---

## MementoBusiness - Výkazy

```javascript
// Vytvorenie/aktualizácia výkazu
var result = utils.createOrUpdateReport({
    entry: entry(),
    reportType: "work",  // work, ride, machines, materials
    sourceLibrary: "Záznam prác",
    sourceField: "Práce HZS",
    config: config
});
// Returns: { success, report, isNew }
```

---

## MementoBusiness - Obligations

```javascript
var obligation = utils.createObligation({
    entry: entry(),
    obligationType: "Mzdy",
    amount: 1200,
    creditor: employeeEntry,
    description: "Mzda za marec 2026"
});
```

---

## MementoAI - AI Integrácia

```javascript
// AI Providers
var providers = utils.AI_PROVIDERS;
// { OPENAI: {...}, CLAUDE: {...} }

// HTTP Request
var response = utils.httpRequest("POST", url, data, headers);
// Returns: { code: 200, body: "...", headers: {...} }

// API kľúč
var key = utils.getApiKey("OPENAI");

// Volanie AI
var result = utils.callAI("OPENAI", "Prompt text", {
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 1000
});
// Returns: { success, response, usage }

// Analýza obrázka
var result = utils.analyzeImage(imageUrl, "What's in this image?", "OPENAI");
```

---

## MementoTelegram - Správy

```javascript
// Token
var token = utils.getBotToken();

// Odoslanie správy
var result = utils.sendTelegramMessage(
    "-1001234567890",  // Chat ID
    "*Bold text*\nNormal text",
    {
        parseMode: "Markdown",  // alebo "HTML"
        threadId: 123,          // Thread ID (téma)
        disablePreview: true,
        silent: false
    },
    {  // Inline keyboard
        inline_keyboard: [
            [{ text: "✅ Áno", callback_data: "yes" }]
        ]
    }
);
// Returns: { success, messageId, chatId, date }

// Editácia
utils.editTelegramMessage(chatId, messageId, newText, options);

// Mazanie
utils.deleteTelegramMessage(chatId, messageId);

// Thread
utils.sendToTelegramThread(chatId, threadId, text, options);
```

---

## MementoTelegram - Notifikácie

```javascript
// Vytvorenie notifikácie
utils.createNotificationEntry("sent", {
    chatId: "-1001234567890",
    messageId: 12345,
    text: "..."
});

// Získanie skupiny
var group = utils.getTelegramGroup("Zákazka XYZ");
// Returns: { chatId, threadId }

// Routing
var telegram = utils.getTelegramID(entry);
// Returns: { chatId, threadId, type }

// Cleanup
utils.cleanupOldNotifications();  // Starších ako 30 dní
```

---

## MementoTelegram - Formatting

```javascript
// Escapovanie Markdown
var escaped = utils.escapeMarkdown("Text_with*special");

// Inline keyboard
var keyboard = utils.createInlineKeyboard([
    [
        { text: "✅ Áno", callback_data: "yes" },
        { text: "❌ Nie", callback_data: "no" }
    ]
]);
```

---

## MementoGPS - Routing

```javascript
// OSRM Route
var result = utils.calculateOSRMRoute(
    { lat: 48.1486, lon: 17.1077 },  // Bratislava
    { lat: 48.3060, lon: 18.0809 }   // Nitra
);
// Returns: { success, km: 95.2, duration: 68 }

// Segment s retry
var result = utils.calculateSegment(startGPS, destGPS, "Segment name");
// Returns: { success, km, duration, metoda: "OSRM" }

// Vzdušná vzdialenosť (nie pre routing!)
var km = utils.calculateAirDistance(start, end);  // 75.4 km

// Celková trasa
var total = utils.calculateTotalRoute([
    { km: 95.2, duration: 68 },
    { km: 45.0, duration: 35 }
]);
// Returns: { totalKm: 140.2, totalDuration: 103 }

// Extrakcia GPS
var gps = utils.extractGPSFromPlace(placeEntry);
// Returns: { lat: 48.1486, lon: 17.1077 }
```

---

## MementoRecordTracking - Tracking

```javascript
// View režimy
utils.setEditMode(entry);   // "Editácia " (opening card)
utils.setPrintMode(entry);  // "Tlač" (before save)
utils.setDebugMode(entry);  // "Debug" (manuálne)

// Tracking
utils.trackRecordCreation(entry);      // zapísal, dátum zápisu
utils.trackRecordModification(entry);  // upravil, dátum úpravy

// Kombinované
utils.initializeNewRecord(entry);  // setEditMode + trackRecordCreation
utils.processRecordUpdate(entry);  // setPrintMode + trackRecordModification
```

---

## MementoIDConflictResolver - ID Konflikty

```javascript
// Kontrola a riešenie
var result = utils.checkAndResolveIDConflict(entry, "ID");
// Returns: { success, conflictDetected, oldID, newID }

if (result.conflictDetected) {
    message("ID konflikt: " + result.oldID + " → " + result.newID);
}

// Helper
var maxID = utils.findMaxID("ID");      // 125
var exists = utils.idExists(123, "ID"); // true/false
```

---

## MementoAutoNumber - Auto-generovanie Čísel

```javascript
// Placeholder formát (v ASISTANTO Defaults):
// YYYY → 2026, YY → 26, MM → 01-12, DD → 01-31, XXX → 001, 002...
// Príklady: "CYYXXX" → C26001, "INV-YYYY-XXXX" → INV-2026-0001

// Generovanie čísla
var result = utils.generateNextNumber(
    "Cenové ponuky",           // Knižnica
    "Číslo",                   // Pole pre číslo
    "Cenové ponuky Placeholder"  // Pole v ASISTANTO Defaults
);
// Returns: { success, number: "C26001", prefix: "C26", sequence: 1 }

if (result.success) {
    entry().set("Číslo", result.number);
}
```

---

## Typický Script Pattern

```javascript
/**
 * Knižnica: Dochádzka
 * Typ: Calculation (Trigger - After Save)
 * Verzia: 8.0
 */

// Import
var utils = MementoUtils;
var config = utils.config;
var currentEntry = entry();

// Vyčisti logy
utils.clearLogs(currentEntry, false);
utils.addDebug(currentEntry, "=== Script Start ===", "start");

try {
    // 1. Validácia
    var validation = utils.validateRequiredFields(currentEntry, [
        config.fields.attendance.date,
        config.fields.attendance.employees
    ]);

    if (!validation.valid) {
        throw new Error("Missing: " + validation.missing.join(", "));
    }

    // 2. Získaj dáta
    var date = utils.safeGet(currentEntry, config.fields.attendance.date);
    var employees = utils.safeGetLinks(currentEntry, config.fields.attendance.employees);

    utils.addDebug(currentEntry, "Processing " + employees.length + " employees");

    // 3. Hlavná logika
    var totalHours = 0;
    for (var i = 0; i < employees.length; i++) {
        var emp = employees[i];
        var hours = utils.safeGetAttribute(emp, null, "odpracované", 0);
        totalHours += hours;
    }

    // 4. Ulož výsledky
    utils.safeSet(currentEntry, config.fields.attendance.workedHours, totalHours);

    // 5. View režim a tracking
    utils.processRecordUpdate(currentEntry);

    // 6. Info správa
    utils.addInfo(currentEntry, "Calculation complete", {
        employees: employees.length,
        totalHours: totalHours
    }, {
        scriptName: "Attendance Calculator",
        scriptVersion: "8.0"
    });

    utils.addDebug(currentEntry, "=== Success ===", "success");

} catch (error) {
    utils.addError(currentEntry, error.toString(), "MainScript", error);
    message("❌ Error: " + error.toString());
}
```

---

## Kritické Poznámky

### ⚠️ View Pole
```javascript
// Hodnoty majú MEDZERY!
"Editácia "  // ← Medzera na konci
"Tlač"       // ← Bez medzery
"Debug"      // ← Bez medzery
```

### ⚠️ Library Info
```javascript
// ❌ ZLE: lib().name (nefunguje spoľahlivo)
var name = lib().name;

// ✅ DOBRE: lib().title
var name = lib().title;  // "Dochádzka"
```

### ⚠️ Entry ID vs Custom ID
```javascript
// Entry ID (Memento ID) - pre foreign keys
var mementoId = entry().id;  // "RFtIS3VOcHpEaTRJWDVlaFs2TTo"

// Custom ID field - interné číslo
var customId = entry().field("ID");  // 123

// ⚠️ Junction tables používajú entry.id!
```

### ⚠️ TIME Fields - Timezone Fix
```javascript
// Memento vracia TIME fields ako Date object s rokom 1970
// Potrebuješ extrahovať LOCAL time komponenty, NIE UTC!

if (fieldValue && fieldValue.getFullYear && fieldValue.getFullYear() === 1970) {
    var hours = fieldValue.getHours();     // LOCAL, nie UTC!
    var minutes = fieldValue.getMinutes();
    // ... format manually
}
```

---

## Dependency Chain

```
MementoConfig (BASE)
    ↓
MementoCore
    ↓
MementoBusiness, MementoAI, MementoRecordTracking, MementoIDConflictResolver
    ↓
MementoGPS (Config + Core + AI)
    ↓
MementoTelegram (Config + Core + AI)
        ↓
        MementoUtils (lazy loading všetkých)
```

---

## Štatistika

| Modul | Verzia | Funkcie |
|-------|--------|---------|
| MementoConfig | 7.0.53 | 10+ |
| MementoCore | 7.0.2 | 30+ |
| MementoUtils | 7.4.0 | 100+ |
| MementoBusiness7 | 7.4.0 | 25+ |
| MementoAI7 | 7.0 | 4 |
| MementoTelegram8 | 8.0.2 | 25+ |
| MementoGPS | 1.1.0 | 6 |
| MementoRecordTracking | 1.1.0 | 6 |
| MementoIDConflictResolver | 1.0.0 | 3 |
| MementoAutoNumber | 2.0.0 | 3 |

**Spolu:** 200+ funkcií

---

**Pre detailnú dokumentáciu pozri:** `CORE_MODULES_DOCUMENTATION.md`
