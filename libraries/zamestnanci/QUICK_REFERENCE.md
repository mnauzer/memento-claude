# Zamestnanci - Quick Reference

**Library ID:** `nWb00Nogf` | **Fields:** 48 | **Updated:** 2026-03-20

---

## 🔑 Kľúčové Polia (Must-Know)

| Pole | ID | Typ | Dôležitosť |
|------|----|-----|------------|
| **Nick** | 22 | text | ⭐⭐⭐ Primary name (role: "name", required) |
| **Aktuálna hodinovka** | 42 | double | ⭐⭐⭐ Hodinová sadzba pre výpočty |
| **Odpracované** | 31 | double | ⭐⭐⭐ Odpracované hodiny (current period) |
| **Zarobené** | 33 | currency | ⭐⭐⭐ Zarobená mzda (current period) |
| **Prémie** | 94 | currency | ⭐⭐ Prémie (status field) |
| **Vyplatené** | 34 | currency | ⭐⭐ Vyplatená mzda |
| **Saldo** | 97 | currency | ⭐⭐ Finančné saldo (status field) |
| **obdobie** | 86 | choice | ⭐⭐ Časové obdobie pre prepočet |
| **Aktívny** | 37 | boolean | ⭐ Je zamestnanec aktívny? |

---

## 📋 Všetky Polia (Kategorizované)

### Identifikácia (3)
```
Nick (22)           ✅ REQUIRED, role: "name"
Meno (1)
Priezvisko (2)      role: "desc"
```

### Kontakt (4)
```
Mobil (4)           phone
Email (7)           email
Telegram ID (101)   text
Pozícia (28)        radio (Brigádnik/Zamestnanec/Vedúcko/Externý)
```

### Hodiny - Aktuálne (3)
```
Odpracované (31)        double, unit: h
Na zákazkách (32)       double, unit: h
Jazdy (88)              double, unit: h
```

### Hodiny - Total (3)
```
Odpracované total (55)      double, unit: h
Na zákazkách total (57)     double, unit: h
Jazdy total (89)            double, unit: h
```

### Mzdy - Aktuálne (3)
```
Zarobené (33)       currency EUR
Prémie (94)         currency EUR, status field
Vyplatené (34)      currency EUR
```

### Mzdy - Total (3)
```
Zarobené total (54)     currency EUR
Prémie total (102)      currency EUR, status field
Vyplatené total (56)    currency EUR
```

### Sadzby & Saldo (5)
```
Aktuálna hodinovka (42)         double, unit: €
Hrubá mzda (96)                 currency EUR
Preplatok/Nedoplatok (35)       currency EUR, status field
Záväzky (98)                    currency EUR
Pohľadávky (99)                 currency EUR
Saldo (97)                      currency EUR, status field
```

### Nastavenia (2)
```
obdobie (86)            choice (deň/týždeň/mesiac/rok...)
obdobie total (90)      choice (mesiac/rok/Total...)
```

### Hodnotenie (3)
```
Dochádzka (62)      int, unit: ★
Zákazky (64)        int, unit: ★
Celkom (65)         int, unit: ★
```

### Notifikácie (2)
```
notifikácia (108)   checkboxes (sms/telegram/email/whatsapp)
Telegram ID (101)   text
```

### Technické (5)
```
Debug_Log (80)      text
Error_Log (81)      text
info (93)           text
Aktívny (37)        boolean (default: true)
Šofér (84)          boolean (default: false)
ID (70)             int (custom ID)
```

### UI (4)
```
view (95)               choice (Tlač/Editácia/Debug)
farba záznamu (72)      color
farba pozadia (73)      color
Poznámka (17)           text (multiline)
```

---

## 💻 Code Snippets

### Get Employee Data
```javascript
var config = utils.config;
var emp = entry();

// Primary info
var nick = utils.safeGet(emp, config.fields.employee.nick, "N/A");
var fullName = utils.formatEmployeeName(emp); // "Nick (Meno Priezvisko)"

// Work hours
var hours = utils.safeGet(emp, config.fields.employee.workedHours, 0);
var ordersHours = utils.safeGet(emp, config.fields.employee.ordersHours, 0);

// Wage calculation
var hourlyRate = utils.safeGet(emp, config.fields.employee.hourlyRate, 0);
var earned = hourlyRate * hours;

// Financial
var balance = utils.safeGet(emp, config.fields.employee.balance, 0);
var paid = utils.safeGet(emp, config.fields.employee.paid, 0);
```

### Set Calculated Values
```javascript
// Set earned wage
utils.safeSet(emp, config.fields.employee.earned, earned);

// Set balance
var balance = earned - paid;
utils.safeSet(emp, config.fields.employee.balance, balance);

// Add to info field
utils.addInfo(emp, "Wage calculated", {
    hours: hours,
    rate: hourlyRate,
    earned: earned
}, { scriptName: "Employee Calculator", scriptVersion: "1.0" });
```

### Check Employee Status
```javascript
var isActive = utils.safeGet(emp, config.fields.employee.active, true);
var isDriver = utils.safeGet(emp, config.fields.employee.driver, false);
var position = utils.safeGet(emp, config.fields.employee.position, null);

if (!isActive) {
    message("⚠️ Zamestnanec nie je aktívny!");
    cancel();
}

if (isDriver) {
    // Driver-specific logic
}
```

---

## 🎯 Field ID Quick Lookup

**Most Used:**
```
22  = Nick (PRIMARY, required)
42  = Aktuálna hodinovka (hourly rate)
31  = Odpracované (worked hours)
33  = Zarobené (earned)
34  = Vyplatené (paid)
94  = Prémie (bonuses)
97  = Saldo (balance)
86  = obdobie (period setting)
37  = Aktívny (active flag)
```

**Logging:**
```
80  = Debug_Log
81  = Error_Log
93  = info
```

**Total Fields:**
```
55  = Odpracované total
54  = Zarobené total
56  = Vyplatené total
102 = Prémie total
```

---

## ⚙️ Period Options

### Field: obdobie (ID 86)
```
1  = tento deň
2  = tento týždeň (DEFAULT)
3  = tento mesiac
4  = tento rok
6  = minulý týždeň
7  = minulý mesiac
8  = minulý rok
9  = posledných 7 dní
10 = posledných 14 dní
11 = posledných 30 dní
12 = posledných 90 dní
```

### Field: obdobie total (ID 90)
```
3  = tento mesiac
4  = tento rok
5  = Total
7  = minulý mesiac
8  = minulý rok
```

---

## 📊 Position Options (ID 28)

```
1 = Brigádnik
2 = Zamestnanec
3 = Vedúcko
4 = Externý
```

---

## 🔔 Notification Options (ID 108)

```
1 = sms
2 = telegram
3 = email
4 = whatsapp
```

---

## ⚠️ Critical Rules

1. **ALWAYS use config** - Never hardcode "Nick" or "Aktuálna hodinovka"
2. **Use safe accessors** - `utils.safeGet()` / `utils.safeSet()`
3. **Check active status** - Filter by `Aktívny` field
4. **Nick is required** - Primary display field (ID 22)
5. **Hourly rate critical** - Field ID 42 for wage calculation
6. **Status fields** - IDs 94, 102, 35, 97 (often displayed as record status)
7. **Period-based** - Fields 31-34 depend on `obdobie` (86), fields 54-57 on `obdobie total` (90)

---

## 📚 See Also

- **Full Documentation:** `libraries/zamestnanci/README.md`
- **Field Cache:** `libraries/zamestnanci/fields.json`
- **MementoConfig:** `core/MementoConfig.js`
- **Core Functions:** `docs/CORE_MODULES_DOCUMENTATION.md`
