# Dochádzka - Quick Reference

**Library ID:** `zNoMvrv8U` | **Fields:** 27 | **Updated:** 2026-03-20

---

## 🔑 Kľúčové Polia (Must-Know)

| Pole | ID | Typ | Dôležitosť |
|------|----|-----|------------|
| **Dátum** | 0 | date | ⭐⭐⭐ Primary name (role: "name") |
| **Zamestnanci** | 5 | entries | ⭐⭐⭐ LinkToEntry with 7 attributes! |
| **Príchod** | 1 | time | ⭐⭐⭐ ⚠️ Timezone fix required! |
| **Odchod** | 2 | time | ⭐⭐⭐ ⚠️ Timezone fix required! |
| **Odpracované** | 17 | double | ⭐⭐⭐ Status field (aggregated) |
| **Mzdové náklady** | 87 | currency | ⭐⭐⭐ Status field (aggregated) |
| **Pracovná doba** | 18 | double | ⭐⭐ Status field (calculated) |
| **Počet pracovníkov** | 81 | int | ⭐⭐ Aggregated count |
| **ikony záznamu** | 88 | text | ⭐ Visual indicators |
| **info** | 90 | richtext | ⭐ Markdown summary |

---

## 📋 Všetky Polia (Quick List)

### Identity & Time (4)
```
Dátum (0)           ✅ PRIMARY (role: "name")
Deň (92)            choice (Pondelok-Nedeľa)
Príchod (1)         ⚠️ TIME - timezone fix!
Odchod (2)          ⚠️ TIME - timezone fix!
```

### LinkToEntry (2)
```
Zamestnanci (5)     ENTRIES, multiple, 7 attributes ⭐
Notifikácie (86)    ENTRIES, multiple, no attributes
```

### Aggregated (4)
```
Počet pracovníkov (81)      int
Pracovná doba (18)          double, status
Odpracované (17)            double, status
Mzdové náklady (87)         currency, status
```

### Notes & Icons (3)
```
Poznámka (38)       text, single-line, role: "desc"
Poznámka (91)       text, multiline (⚠️ DUPLICATE NAME!)
ikony záznamu (88)  text, role: "name"
```

### Status & Settings (2)
```
Voľno (85)          boolean
stav záznamu (89)   checkboxes (1=Záväzky)
```

### Info & Logging (3)
```
info (90)           richtext (markdown)
Debug_Log (94)      text
Error_Log (77)      text
```

### Technical (5)
```
ID (67)                 int, REQUIRED ⭐
zapísal (48)            user
dátum zápisu (70)       datetime
upravil (57)            user
dátum úpravy (71)       datetime
```

### UI (3)
```
view (93)               choice (Editácia/Tlač/Debug)
farba záznamu (27)      color
farba pozadia (29)      color
```

### Visual (1)
```
--- Dochádzka --- (61)  subheader
```

---

## 👥 LinkToEntry Atribúty (Field ID 5)

**CRITICAL:** Attributes have separate IDs (0-6), **NOT field IDs**!

| Attr ID | Názov | Typ | Účel |
|---------|-------|-----|------|
| 6 | odpracované | double | Odpracované hodiny |
| 0 | hodinovka | currency | Hodinová sadzba |
| 1 | +príplatok (€/h) | currency | Príplatok |
| 2 | +prémia (€) | currency | Prémia |
| 4 | -pokuta (€) | currency | Pokuta |
| 3 | denná mzda | currency | Vypočítaná mzda |
| 5 | poznámka | text | Poznámka |

---

## 💻 Code Snippets

### Get Basic Data
```javascript
var config = utils.config;
var entry = entry();

// Get date
var date = utils.safeGet(entry, config.fields.attendance.date, null);

// Get time (⚠️ Timezone fix required!)
var arrival = utils.safeGet(entry, config.fields.attendance.arrival, null);
var departure = utils.safeGet(entry, config.fields.attendance.departure, null);

// Calculate work time
if (arrival && departure) {
    var workTime = utils.time.calculateHoursDifference(arrival, departure);
}
```

### Process Employees Table
```javascript
var employees = utils.safeGetLinks(entry, config.fields.attendance.employees);
if (!employees || employees.length === 0) {
    message("⚠️ Žiadni zamestnanci!");
    cancel();
}

var totalWorked = 0;
var totalWages = 0;

employees.forEach(function(empLink) {
    // Get employee entry
    var employee = empLink.e;

    // Get hourly rate from employee library
    var baseRate = utils.safeGet(employee, config.fields.employee.hourlyRate, 0);

    // Set attribute (attr ID 0)
    empLink.set(0, baseRate);

    // Get attributes (use attr IDs, NOT field IDs!)
    var worked = empLink.get(6) || 0;      // odpracované
    var hourlyRate = empLink.get(0) || 0;  // hodinovka
    var supplement = empLink.get(1) || 0;  // +príplatok
    var bonus = empLink.get(2) || 0;       // +prémia
    var penalty = empLink.get(4) || 0;     // -pokuta

    // Calculate wage
    var wage = (hourlyRate + supplement) * worked + bonus - penalty;

    // Set attribute (attr ID 3)
    empLink.set(3, wage);

    // Sum
    totalWorked += worked;
    totalWages += wage;
});

// Set aggregated fields
utils.safeSet(entry, config.fields.attendance.employeeCount, employees.length);
utils.safeSet(entry, config.fields.attendance.workedHours, totalWorked);
utils.safeSet(entry, config.fields.attendance.laborCosts, totalWages);
```

### Manage Icons
```javascript
// Add employee icon
var employees = utils.safeGetLinks(entry, config.fields.attendance.employees);
if (employees && employees.length > 0) {
    utils.addRecordIcon(entry, "👥");
}

// Add obligation icon after creating obligations
utils.addRecordIcon(entry, "💸");

// Add daily report link icon
utils.addRecordIcon(entry, "📅");
```

### Check Holiday/Weekend
```javascript
var date = utils.safeGet(entry, config.fields.attendance.date, null);
var isHoliday = utils.safeGet(entry, config.fields.attendance.holiday, false);

if (isHoliday) {
    message("📅 Voľný deň");
} else {
    var isWeekend = utils.date.isWeekend(date);
    if (isWeekend) {
        message("⚠️ Víkend");
    }
}
```

---

## 🎯 Field ID Quick Lookup

**Most Used:**
```
0   = Dátum (PRIMARY)
1   = Príchod (TIME - timezone fix!)
2   = Odchod (TIME - timezone fix!)
5   = Zamestnanci (linkToEntry with attributes)
17  = Odpracované (status, aggregated)
18  = Pracovná doba (status, calculated)
87  = Mzdové náklady (status, aggregated)
81  = Počet pracovníkov (aggregated)
88  = ikony záznamu
```

**Logging:**
```
90  = info (richtext, markdown)
94  = Debug_Log
77  = Error_Log
```

**LinkToEntry Attribute IDs:**
```
6   = odpracované (worked hours)
0   = hodinovka (hourly rate)
1   = +príplatok (€/h) (supplement)
2   = +prémia (€) (bonus)
4   = -pokuta (€) (penalty)
3   = denná mzda (daily wage)
5   = poznámka (note)
```

---

## ⚙️ Choice Options

### Deň (ID 92)
```
1 = Pondelok
2 = Utorok
3 = Streda
4 = Štvrtok
5 = Piatok
6 = Sobota
7 = Nedeľa
```

### view (ID 93)
```
1 = Editácia (DEFAULT)
2 = Tlač
3 = Debug
```

### stav záznamu (ID 89)
```
1 = Záväzky (neuhradené mzdy)
```

---

## 👤 Users

```
0 = krajinkamato
1 = mementokrajinka
2 = krajinkarasto
3 = rasto
```

---

## ⚠️ Critical Rules

### 1. TIME Field Timezone Fix
**ALWAYS apply timezone conversion for Príchod (1) and Odchod (2)!**

See `MEMORY.md` section: **TIME and DATE Fields - CRITICAL TIMEZONE FIX**

### 2. LinkToEntry Attribute IDs
**Use attribute IDs (0-6), NOT field IDs!**

```javascript
// ❌ WRONG
var worked = empLink.get(17);  // Field ID 17 is "Odpracované"!

// ✅ CORRECT
var worked = empLink.get(6);   // Attribute ID 6 is "odpracované"
```

### 3. Duplicate "Poznámka"
Two fields named "Poznámka":
- ID 38: Single-line (role: "desc")
- ID 91: Multiline

**Solution:** Use field ID

### 4. Status Fields
Display as record status:
- Pracovná doba (18)
- Odpracované (17)
- Mzdové náklady (87)

### 5. Multiple "name" Roles
- Dátum (0) - primary
- Zamestnanci (5) - secondary
- ikony záznamu (88) - tertiary

### 6. Aggregated Fields
**Must be calculated in script!**
- Počet pracovníkov (81)
- Pracovná doba (18)
- Odpracované (17)
- Mzdové náklady (87)

### 7. Custom ID vs Memento ID
- Field "ID" (67) = Custom company ID
- `entry.id` = Memento entry ID (use for foreign keys!)

---

## 🔗 Prepojené Knižnice

### Zamestnanci (Employees)
**UUID:** `NKWNzJgL:*tA*i88[tT2`
**Link Field:** Zamestnanci (ID 5)
**Attributes:** 7 (odpracované, hodinovka, príplatok, prémia, pokuta, denná mzda, poznámka)

### Notifikácie
**UUID:** `*-*lt>[QN(bc+@UDSVRm`
**Link Field:** Notifikácie (ID 86)
**Attributes:** None

---

## 📊 Typical Calculation Flow

1. **Validate** - Check Dátum, Príchod, Odchod
2. **Day of week** - Set "Deň" (1-7)
3. **Work time** - Calculate from Príchod/Odchod
4. **Process employees:**
   - Get hourly rate from Zamestnanci library
   - Set attribute "hodinovka" (attr 0)
   - Get attribute "odpracované" (attr 6)
   - Calculate "denná mzda" (attr 3)
5. **Aggregate:**
   - Sum "odpracované" → Odpracované (17)
   - Sum "denná mzda" → Mzdové náklady (87)
   - Count employees → Počet pracovníkov (81)
6. **Icons:**
   - Add/remove based on state
7. **Info:**
   - Create markdown summary
8. **Cleanup:**
   - Clear old logs

---

## 🎨 Ikony (Auto-added)

```
👥 = Zamestnanci present
💸 = Obligations created
📅 = Daily report linked
📊 = Record in Daily report
⚠️ = Warning/issue
⏸️ = Downtime detected
```

---

## 📚 See Also

- **Workflow Doc:** `libraries/dochadzka/README.md`
- **Field Reference:** `libraries/dochadzka/FIELD_REFERENCE.md`
- **Field Cache:** `libraries/dochadzka/fields.json`
- **MementoConfig:** `core/MementoConfig.js`
- **MEMORY.md:** TIME field timezone fix
