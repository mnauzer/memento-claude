# Dochádzka - Complete Field Reference

**Library ID:** `zNoMvrv8U`
**Počet polí:** 27
**Posledná aktualizácia:** 2026-03-20

---

## 📊 Complete Field List

### Field Overview

| # | ID | Pole | Typ | Role | Required | Default |
|---|----|------|-----|------|----------|---------|
| 1 | 0 | **Dátum** | date | name | ❌ | Current date |
| 2 | 92 | Deň | choice | desc | ❌ | - |
| 3 | 1 | Príchod | time | desc | ❌ | - |
| 4 | 2 | Odchod | time | desc | ❌ | - |
| 5 | 5 | **Zamestnanci** | entries | name | ❌ | - |
| 6 | 86 | Notifikácie | entries | - | ❌ | - |
| 7 | 38 | Poznámka | text | desc | ❌ | "" |
| 8 | 88 | ikony záznamu | text | name | ❌ | "" |
| 9 | 91 | Poznámka | text | - | ❌ | "" |
| 10 | 85 | Voľno | boolean | - | ❌ | false |
| 11 | 81 | Počet pracovníkov | int | - | ❌ | 0 |
| 12 | 18 | **Pracovná doba** | double | status | ❌ | 0.0 |
| 13 | 17 | **Odpracované** | double | status | ❌ | 0.0 |
| 14 | 87 | **Mzdové náklady** | currency | status | ❌ | 0 |
| 15 | 89 | stav záznamu | checkboxes | - | ❌ | [] |
| 16 | 90 | info | richtext | - | ❌ | "" |
| 17 | 94 | Debug_Log | text | - | ❌ | "" |
| 18 | 77 | Error_Log | text | - | ❌ | "" |
| 19 | 67 | **ID** | int | - | ✅ | 1 |
| 20 | 93 | view | choice | - | ❌ | "Editácia" |
| 21 | 27 | farba záznamu | color | - | ❌ | - |
| 22 | 29 | farba pozadia | color | - | ❌ | - |
| 23 | 48 | zapísal | user | - | ❌ | - |
| 24 | 70 | dátum zápisu | datetime | - | ❌ | Current datetime |
| 25 | 57 | upravil | user | - | ❌ | - |
| 26 | 71 | dátum úpravy | datetime | - | ❌ | Current datetime |
| 27 | 61 | --- Dochádzka --- | subheader | - | ❌ | - |

---

## 📋 Primary Fields (Identity & Time)

### Field ID 0: Dátum
**Type:** DATE
**Role:** name (PRIMARY DISPLAY)
**Required:** ❌
**Default:** Current date

**Purpose:** Dátum dochádzky - hlavné pole záznamu

**Usage:**
```javascript
var date = utils.safeGet(entry, config.fields.attendance.date, null);
if (!date) {
    message("⚠️ Chýba dátum!");
    cancel();
}

// Check if weekend
var isWeekend = utils.date.isWeekend(date);
```

---

### Field ID 92: Deň
**Type:** CHOICE
**Role:** desc (SECONDARY DISPLAY)
**Required:** ❌

**Options:**
```
1 = Pondelok
2 = Utorok
3 = Streda
4 = Štvrtok
5 = Piatok
6 = Sobota
7 = Nedeľa
```

**Purpose:** Deň v týždni (auto-calculated from Dátum)

**Usage:**
```javascript
// Auto-calculate from date
var date = utils.safeGet(entry, config.fields.attendance.date, null);
if (date) {
    var dayOfWeek = utils.date.getDayOfWeek(date); // Returns 1-7
    var dayName = ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota", "Nedeľa"][dayOfWeek - 1];
    utils.safeSet(entry, config.fields.attendance.dayOfWeek, dayName);
}
```

---

### Field ID 1: Príchod
**Type:** TIME
**Role:** desc
**Required:** ❌

**⚠️ CRITICAL:** TIME fields require timezone conversion! See MEMORY.md

**Purpose:** Čas príchodu do práce

**Usage:**
```javascript
// CRITICAL: Apply timezone fix when reading TIME fields!
var arrival = utils.safeGet(entry, config.fields.attendance.arrival, null);

// For calculation, use MementoTime utilities
if (arrival && departure) {
    var workTime = utils.time.calculateHoursDifference(arrival, departure);
}
```

**Format:** JavaScript Date object with year 1970
**Example:** `Date("1970-01-01T07:00:00.000Z")` represents 07:00 local time

---

### Field ID 2: Odchod
**Type:** TIME
**Role:** desc
**Required:** ❌

**⚠️ CRITICAL:** TIME fields require timezone conversion! See MEMORY.md

**Purpose:** Čas odchodu z práce

**Usage:** Same as Príchod (field ID 1)

---

## 👥 LinkToEntry Fields

### Field ID 5: Zamestnanci ⭐
**Type:** ENTRIES
**Role:** name
**Required:** ❌
**Multiple:** ✅ Yes
**Library Link:** `NKWNzJgL:*tA*i88[tT2` (Zamestnanci library)

**Purpose:** Prepojenie na zamestnancov s mzdovými atribútmi

#### **Atribúty (Tabuľkové Polia):**

| Attr ID | Názov | Typ | Účel |
|---------|-------|-----|------|
| 6 | odpracované | double | Odpracované hodiny zamestnanca |
| 0 | hodinovka | currency | Hodinová sadzba (€/h) |
| 1 | +príplatok (€/h) | currency | Príplatok k hodinovke |
| 2 | +prémia (€) | currency | Prémia k mzde |
| 4 | -pokuta (€) | currency | Pokuta (zrážka) |
| 3 | denná mzda | currency | Vypočítaná denná mzda |
| 5 | poznámka | text | Poznámka k zamestnancovi |

**⚠️ CRITICAL:** Atribúty majú vlastné IDs (0-6), **nie field IDs**!

**Usage:**
```javascript
var config = utils.config;
var entry = entry();
var employees = utils.safeGetLinks(entry, config.fields.attendance.employees);

if (!employees || employees.length === 0) {
    message("⚠️ Žiadni zamestnanci!");
    cancel();
}

var totalWorked = 0;
var totalWages = 0;

employees.forEach(function(empLink) {
    // Get linked employee entry
    var employee = empLink.e;
    var employeeName = utils.formatEmployeeName(employee);

    // Get hourly rate from employee library
    var baseRate = utils.safeGet(employee, config.fields.employee.hourlyRate, 0);

    // Set attribute: hodinovka (attr ID 0)
    empLink.set(0, baseRate);

    // Get attribute values (attr IDs, NOT field IDs!)
    var worked = empLink.get(6) || 0;      // odpracované
    var hourlyRate = empLink.get(0) || 0;  // hodinovka
    var supplement = empLink.get(1) || 0;  // +príplatok (€/h)
    var bonus = empLink.get(2) || 0;       // +prémia (€)
    var penalty = empLink.get(4) || 0;     // -pokuta (€)

    // Calculate daily wage
    var wage = (hourlyRate + supplement) * worked + bonus - penalty;

    // Set attribute: denná mzda (attr ID 3)
    empLink.set(3, wage);

    // Add to totals
    totalWorked += worked;
    totalWages += wage;

    // Log
    utils.addDebug(entry, employeeName + ": " + worked + "h × " + hourlyRate + "€ = " + wage + "€");
});

// Set aggregated fields
utils.safeSet(entry, config.fields.attendance.employeeCount, employees.length);
utils.safeSet(entry, config.fields.attendance.workedHours, totalWorked);
utils.safeSet(entry, config.fields.attendance.laborCosts, totalWages);
```

**Attribute ID Constants (for code clarity):**
```javascript
var ATTR_WORKED_HOURS = 6;
var ATTR_HOURLY_RATE = 0;
var ATTR_SUPPLEMENT = 1;
var ATTR_BONUS = 2;
var ATTR_PENALTY = 4;
var ATTR_DAILY_WAGE = 3;
var ATTR_NOTE = 5;
```

---

### Field ID 86: Notifikácie
**Type:** ENTRIES
**Multiple:** ✅ Yes
**Library Link:** `*-*lt>[QN(bc+@UDSVRm` (Notifikácie library)

**Purpose:** Prepojenie na notifikačné záznamy

**Atribúty:** Žiadne (plain link, no table columns)

**Usage:**
```javascript
var notifications = utils.safeGetLinks(entry, config.fields.attendance.notifications);
if (notifications && notifications.length > 0) {
    // Process notifications
}
```

---

## 📊 Calculated/Aggregated Fields

### Field ID 81: Počet pracovníkov
**Type:** INT
**Unit:** os (osoby)
**Default:** 0

**Purpose:** Počet zamestnancov v tabuľke

**Calculation:**
```javascript
var employees = utils.safeGetLinks(entry, config.fields.attendance.employees);
var count = employees ? employees.length : 0;
utils.safeSet(entry, config.fields.attendance.employeeCount, count);
```

---

### Field ID 18: Pracovná doba ⭐
**Type:** DOUBLE
**Role:** status (MAIN DISPLAY)
**Unit:** h (hodiny)
**Default:** 0.0

**Purpose:** Celková pracovná doba (Odchod - Príchod) × počet pracovníkov

**Calculation:**
```javascript
var arrival = utils.safeGet(entry, config.fields.attendance.arrival, null);
var departure = utils.safeGet(entry, config.fields.attendance.departure, null);

if (arrival && departure) {
    // Calculate work time per person (with 15-min rounding)
    var workTimePerPerson = utils.time.calculateHoursDifference(arrival, departure);

    // Total work time = per person × count
    var employeeCount = utils.safeGet(entry, config.fields.attendance.employeeCount, 1);
    var totalWorkTime = workTimePerPerson * employeeCount;

    utils.safeSet(entry, config.fields.attendance.workTime, totalWorkTime);
}
```

---

### Field ID 17: Odpracované ⭐
**Type:** DOUBLE
**Role:** status (MAIN DISPLAY)
**Unit:** h (hodiny)
**Default:** 0.0

**Purpose:** Celkovo odpracované hodiny (suma atribútov "odpracované")

**Calculation:**
```javascript
var employees = utils.safeGetLinks(entry, config.fields.attendance.employees);
var totalWorked = 0;

employees.forEach(function(empLink) {
    var worked = empLink.get(6) || 0; // attr ID 6: odpracované
    totalWorked += worked;
});

utils.safeSet(entry, config.fields.attendance.workedHours, totalWorked);
```

---

### Field ID 87: Mzdové náklady ⭐
**Type:** CURRENCY
**Role:** status (MAIN DISPLAY)
**Unit:** EUR

**Purpose:** Celkové mzdové náklady (suma atribútov "denná mzda")

**Calculation:**
```javascript
var employees = utils.safeGetLinks(entry, config.fields.attendance.employees);
var totalCosts = 0;

employees.forEach(function(empLink) {
    var wage = empLink.get(3) || 0; // attr ID 3: denná mzda
    totalCosts += wage;
});

utils.safeSet(entry, config.fields.attendance.laborCosts, totalCosts);
```

---

## 📝 Notes & Icons

### Field ID 38: Poznámka (Short)
**Type:** TEXT
**Role:** desc
**Single Line:** ✅ Yes
**Default:** ""

**Purpose:** Krátka jednoriadková poznámka

**Usage:**
```javascript
var noteShort = utils.safeGet(entry, config.fields.attendance.noteShort, "");
```

---

### Field ID 91: Poznámka (Long)
**Type:** TEXT
**Single Line:** ❌ No (multiline)
**Default:** ""

**⚠️ WARNING:** Duplicate name! Both field 38 and 91 are named "Poznámka". Use field ID to distinguish.

**Purpose:** Dlhšia viacriadková poznámka

**Usage:**
```javascript
// Use field ID to distinguish from field 38
var noteLong = entry.field(91);
```

---

### Field ID 88: ikony záznamu
**Type:** TEXT
**Role:** name
**Default:** ""

**Purpose:** Emoji ikony pre vizuálnu identifikáciu stavu

**Icons:**
- 👥 = Zamestnanci prítomní
- 💸 = Záväzky vytvorené
- 📅 = Denný report linknutý
- 📊 = Tento záznam v Dennom reporte
- ⚠️ = Warning/issue
- ⏸️ = Downtime detected

**Usage:**
```javascript
// Add icon
utils.addRecordIcon(entry, "👥");

// Remove icon
utils.removeRecordIcon(entry, "👥");

// Check icon presence
var icons = utils.safeGet(entry, config.fields.attendance.recordIcons, "");
var hasEmployeeIcon = icons.indexOf("👥") !== -1;
```

---

## ⚙️ Status & Settings

### Field ID 85: Voľno
**Type:** BOOLEAN
**Default:** false

**Purpose:** Je tento deň voľno/sviatok?

**Usage:**
```javascript
var isHoliday = utils.safeGet(entry, config.fields.attendance.holiday, false);
if (isHoliday) {
    message("📅 Voľný deň");
    // Different calculation logic
}
```

---

### Field ID 89: stav záznamu
**Type:** CHECKBOXES
**Default:** []

**Options:**
```
1 = Záväzky (neuhradené mzdy)
```

**Purpose:** Indikátor neuhradených mzdových záväzkov

**Usage:**
```javascript
var recordStatus = utils.safeGet(entry, config.fields.attendance.recordStatus, []);
var hasLiabilities = recordStatus.indexOf("Záväzky") !== -1;

if (hasLiabilities) {
    message("⚠️ Neuhradené mzdy!");
}
```

---

## 📄 Info & Logging

### Field ID 90: info
**Type:** RICHTEXT
**Markdown:** ✅ Yes
**Default:** ""

**Purpose:** Markdown summary of calculation results

**Example Content:**
```markdown
## 📋 DOCHÁDZKA - ZHRNUTIE

**Dátum:** 20.03.2026 (Utorok)

### 👥 Zamestnanci (3)
- Janko (8.25h × 12€ = 99€)
- Ferko (8.25h × 15€ = 123.75€)

### ⏱️ Pracovný čas
- **Pracovný čas:** 8.75h
- **Odpracované:** 8.25h

### 💰 Mzdové náklady
- **Celkom:** 222.75€
```

**Usage:**
```javascript
var summary = "## 📋 DOCHÁDZKA - ZHRNUTIE\n\n";
summary += "**Dátum:** " + formattedDate + "\n\n";
// ... build markdown

utils.safeSet(entry, config.fields.attendance.info, summary);
```

---

### Field ID 94: Debug_Log
**Type:** TEXT
**Multiline:** ✅ Yes
**Default:** ""

**Purpose:** Detailed execution trace for debugging

**Usage:**
```javascript
utils.addDebug(entry, "Starting calculation...");
utils.addDebug(entry, "Employee count: " + count);
```

---

### Field ID 77: Error_Log
**Type:** TEXT
**Multiline:** ✅ Yes
**Default:** ""

**Purpose:** Error messages and stack traces

**Usage:**
```javascript
try {
    // ... calculation
} catch (error) {
    utils.addError(entry, "Calculation failed", "calculateWages", error);
}
```

---

## 🛠️ Technical Fields

### Field ID 67: ID ⭐
**Type:** INT
**Required:** ✅ Yes
**Default:** 1

**Purpose:** Custom company ID (NOT Memento entry.id!)

**⚠️ CRITICAL:** This is custom ID for internal use. For foreign keys, ALWAYS use `entry.id` (Memento entry ID)!

---

### Field ID 48: zapísal
**Type:** USER

**Users:**
```
0 = krajinkamato
1 = mementokrajinka
2 = krajinkarasto
3 = rasto
```

**Purpose:** Kto vytvoril záznam

---

### Field ID 70: dátum zápisu
**Type:** DATETIME
**Default:** Current datetime

**Purpose:** Kedy vytvorený záznam

---

### Field ID 57: upravil
**Type:** USER

**Purpose:** Kto naposledy upravil záznam

---

### Field ID 71: dátum úpravy
**Type:** DATETIME
**Default:** Current datetime

**Purpose:** Kedy naposledy upravený záznam

---

## 🎨 UI Fields

### Field ID 93: view
**Type:** CHOICE
**Default:** "Editácia"

**Options:**
```
1 = Editácia (DEFAULT)
2 = Tlač
3 = Debug
```

**Purpose:** View mode selector

---

### Field ID 27: farba záznamu
**Type:** COLOR

**Purpose:** Text color

---

### Field ID 29: farba pozadia
**Type:** COLOR

**Purpose:** Background color

---

### Field ID 61: --- Dochádzka ---
**Type:** SUBHEADER

**Purpose:** Visual separator (no data)

---

## 🗺️ Config Mapping

### Complete Config Object

```javascript
var config = {
    fields: {
        attendance: {
            // Primary identity
            date: "Dátum",              // ID 0, role: "name"
            dayOfWeek: "Deň",           // ID 92, role: "desc"

            // Time (CRITICAL: Timezone fix required!)
            arrival: "Príchod",         // ID 1, type: TIME
            departure: "Odchod",        // ID 2, type: TIME

            // LinkToEntry
            employees: "Zamestnanci",   // ID 5, type: ENTRIES, multiple: true
            notifications: "Notifikácie", // ID 86, type: ENTRIES

            // Employee link attributes (NOT field IDs!)
            attrs: {
                workedHours: 6,         // odpracované
                hourlyRate: 0,          // hodinovka
                supplement: 1,          // +príplatok (€/h)
                bonus: 2,               // +prémia (€)
                penalty: 4,             // -pokuta (€)
                dailyWage: 3,           // denná mzda
                note: 5                 // poznámka
            },

            // Aggregated results
            employeeCount: "Počet pracovníkov",  // ID 81
            workTime: "Pracovná doba",           // ID 18, role: "status"
            workedHours: "Odpracované",          // ID 17, role: "status"
            laborCosts: "Mzdové náklady",        // ID 87, role: "status"

            // Notes & icons
            noteShort: "Poznámka",               // ID 38, singleLine: true
            noteLong: "Poznámka",                // ID 91, multiline (DUPLICATE NAME!)
            recordIcons: "ikony záznamu",        // ID 88

            // Status & settings
            holiday: "Voľno",                    // ID 85, boolean
            recordStatus: "stav záznamu",        // ID 89, checkboxes

            // Info & logging
            info: "info",                        // ID 90, richtext
            debugLog: "Debug_Log",               // ID 94
            errorLog: "Error_Log",               // ID 77

            // Technical
            customId: "ID",                      // ID 67, REQUIRED
            createdBy: "zapísal",                // ID 48, user
            createdAt: "dátum zápisu",           // ID 70, datetime
            modifiedBy: "upravil",               // ID 57, user
            modifiedAt: "dátum úpravy",          // ID 71, datetime

            // UI
            view: "view",                        // ID 93, choice
            recordColor: "farba záznamu",        // ID 27, color
            backgroundColor: "farba pozadia"     // ID 29, color
        }
    }
};
```

---

## ⚠️ Critical Notes

### 1. TIME Field Timezone Fix

**ALWAYS apply timezone conversion for TIME fields!**

See `MEMORY.md` section: **TIME and DATE Fields - CRITICAL TIMEZONE FIX**

Fields affected:
- Príchod (ID 1)
- Odchod (ID 2)

### 2. LinkToEntry Attribute IDs

**Attributes have separate IDs from field IDs!**

```javascript
// ❌ WRONG
var worked = empLink.get(config.fields.attendance.workedHours);

// ✅ CORRECT
var worked = empLink.get(6); // Attribute ID 6
```

### 3. Duplicate Field Names

**"Poznámka" appears twice!**

- Field ID 38: Single-line (role: "desc")
- Field ID 91: Multiline

**Solution:** Use field ID instead of name

### 4. Status Fields

These fields display as record status:
- Pracovná doba (ID 18)
- Odpracované (ID 17)
- Mzdové náklady (ID 87)

### 5. Multiple "name" Roles

Three fields have `role: "name"`:
- Dátum (ID 0) - primary
- Zamestnanci (ID 5) - secondary
- ikony záznamu (ID 88) - tertiary

Memento combines all for display name.

---

## 📚 Related Documentation

- **Workflow README:** `libraries/dochadzka/README.md`
- **Field Cache:** `libraries/dochadzka/fields.json`
- **MementoConfig:** `core/MementoConfig.js`
- **MEMORY.md:** TIME field timezone fix

---

**Version:** 2.0.0
**Date:** 2026-03-20
**API Sync:** 2026-03-20 18:42:26
