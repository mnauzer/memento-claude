# Knižnica: Zamestnanci (Employees)

**Library ID:** `nWb00Nogf`
**Počet polí:** 48
**Posledná aktualizácia:** 2026-03-20

## Účel Knižnice

Centrálna knižnica pre správu zamestnancov a evidenciu ich odpracovaného času, miezd, prémií a hodnotenia.

---

## Kategórie Polí

### 📋 Základné Informácie (8 polí)

| ID | Pole | Typ | Povinné | Rola | Poznámka |
|----|------|-----|---------|------|----------|
| 1 | Meno | text | ❌ | - | Krstné meno |
| 2 | Priezvisko | text | ❌ | desc | Priezvisko zamestnanca |
| 22 | **Nick** | text | ✅ | **name** | Prezývka (PRIMARY DISPLAY) |
| 28 | Pozícia | radio | ❌ | - | Brigádnik/Zamestnanec/Vedúcko/Externý |
| 17 | Poznámka | text | ❌ | - | Voľné poznámky |
| 4 | Mobil | phone | ❌ | - | Telefónne číslo |
| 7 | Email | email | ❌ | - | Emailová adresa |
| 101 | Telegram ID | text | ❌ | - | ID pre Telegram notifikácie |

**Dôležité:**
- **Nick** (ID 22) je hlavné pole (`role: "name"`) - zobrazuje sa ako názov záznamu
- **Priezvisko** (ID 2) je popisné pole (`role: "desc"`)
- **Pozícia** má 4 možnosti: 1=Brigádnik, 2=Zamestnanec, 3=Vedúcko, 4=Externý

---

### 📊 Odpracované Hodiny - Aktuálne Obdobie (6 polí)

**Sekcia:** `--- Odpracované ---`

| ID | Pole | Typ | Jednotka | Poznámka |
|----|------|-----|----------|----------|
| 32 | Na zákazkách | double | h | Hodiny na zákazkách (aktuálne obdobie) |
| 88 | Jazdy | double | h | Hodiny v jazdách (aktuálne obdobie) |
| 31 | Odpracované | double | h | Celkom odpracované hodiny (aktuálne obdobie) |
| 33 | Zarobené | currency | EUR | Zarobená mzda (aktuálne obdobie) |
| 94 | **Prémie** | currency | EUR | Prémie k vyplateniu (status field) |
| 34 | Vyplatené | currency | EUR | Už vyplatená mzda (aktuálne obdobie) |

**Prepočítavané na základe poľa:** `obdobie` (ID 86)

---

### 📈 Odpracované Hodiny - Total (6 polí)

**Sekcia:** `--- Odpracované total---`

| ID | Pole | Typ | Jednotka | Poznámka |
|----|------|-----|----------|----------|
| 57 | Na zákazkách total | double | h | Všetky hodiny na zákazkách |
| 89 | Jazdy total | double | h | Všetky hodiny v jazdách |
| 55 | Odpracované total | double | h | Celkom všetky odpracované hodiny |
| 54 | Zarobené total | currency | EUR | Celková zarobená mzda |
| 102 | **Prémie total** | currency | EUR | Celkové prémie (status field) |
| 56 | Vyplatené total | currency | EUR | Celkovo vyplatená mzda |

**Prepočítavané na základe poľa:** `obdobie total` (ID 90)

---

### 💰 Mzdy a Saldo (7 polí)

**Sekcia:** `--- Mzdy ---` a `--- Saldo ---`

| ID | Pole | Typ | Jednotka | Rola | Poznámka |
|----|------|-----|----------|------|----------|
| 96 | Hrubá mzda | currency | EUR | - | Aktuálna hrubá mzda |
| 42 | **Aktuálna hodinovka** | double | € | - | Hodinová sadzba |
| 35 | Preplatok/Nedoplatok | currency | EUR | status | Rozdiel Zarobené - Vyplatené |
| 98 | Záväzky | currency | EUR | - | Dlh firmy voči zamestnancovi |
| 99 | Pohľadávky | currency | EUR | - | Dlh zamestnanca voči firme |
| 97 | **Saldo** | currency | EUR | status | Finálne saldo (Záväzky - Pohľadávky) |
| 93 | info | text | - | - | Výpočtové informácie, markdown |

**Dôležité:**
- **Aktuálna hodinovka** (ID 42) - použije sa na prepočet mzdy
- **Saldo** (ID 97) - status field, hlavný indikátor finančného stavu

---

### ⚙️ Nastavenia a Prepočty (2 polia)

**Sekcia:** `--- Nastavenie prepočtu ---`

| ID | Pole | Typ | Default | Možnosti |
|----|------|-----|---------|----------|
| 86 | **obdobie** | choice | "tento týždeň" | 1=tento deň, 2=tento týždeň, 3=mesiac, 4=rok, 6-8=minulé, 9-12=posledných X dní |
| 90 | **obdobie total** | choice | - | 3=tento mesiac, 4=tento rok, 5=Total, 7=minulý mesiac, 8=minulý rok |

**Použitie:**
- `obdobie` (ID 86) - určuje, za aké obdobie sa prepočítavajú hodnoty v sekcii "Odpracované"
- `obdobie total` (ID 90) - určuje obdobie pre sekciu "Odpracované total"

---

### ⭐ Hodnotenie (4 polia)

**Sekcia:** `--- Hodnotenie ---`

| ID | Pole | Typ | Jednotka | Poznámka |
|----|------|-----|----------|----------|
| 62 | Dochádzka | int | ★ | Hodnotenie dochádzky (hviezdičky) |
| 64 | Zákazky | int | ★ | Hodnotenie zákaziek (hviezdičky) |
| 65 | Celkom | int | ★ | Celkové hodnotenie |

---

### 🔔 Notifikácie (2 polia)

**Sekcia:** `--- Správy posielať ---`

| ID | Pole | Typ | Možnosti |
|----|------|-----|----------|
| 108 | notifikácia | checkboxes | 1=sms, 2=telegram, 3=email, 4=whatsapp |
| 101 | Telegram ID | text | ID pre Telegram Bot API |

---

### 🛠️ Technické Polia (5 polí)

| ID | Pole | Typ | Účel |
|----|------|-----|------|
| 80 | Debug_Log | text | Debugging trace |
| 81 | Error_Log | text | Error messages |
| 37 | Aktívny | boolean | Je zamestnanec aktívny? (default: true) |
| 84 | Šofér | boolean | Je zamestnanec šofér? (default: false) |
| 70 | ID | int | Custom ID (default: 1) |

---

### 🎨 UI Polia (4 polia)

| ID | Pole | Typ | Možnosti |
|----|------|-----|----------|
| 95 | view | choice | 1=Tlač (default), 2=Editácia, 3=Debug |
| 72 | farba záznamu | color | Farba textu záznamu |
| 73 | farba pozadia | color | Farba pozadia záznamu |

---

## Mapa Dôležitých Polí Pre Scripty

### Primary Identifiers
```javascript
var config = {
    fields: {
        employee: {
            // Primary display
            nick: "Nick",              // ID 22, role: "name", REQUIRED
            surname: "Priezvisko",     // ID 2, role: "desc"
            firstName: "Meno",         // ID 1

            // Position
            position: "Pozícia",       // ID 28 (radio: 1=Brigádnik, 2=Zamestnanec, 3=Vedúcko, 4=Externý)

            // Contact
            phone: "Mobil",            // ID 4
            email: "Email",            // ID 7
            telegramId: "Telegram ID", // ID 101
        }
    }
};
```

### Work Hours & Wages (Current Period)
```javascript
var config = {
    fields: {
        employee: {
            // Hours (period-based, field ID 86)
            ordersHours: "Na zákazkách",    // ID 32
            ridesHours: "Jazdy",            // ID 88
            workedHours: "Odpracované",     // ID 31

            // Wages (period-based)
            earned: "Zarobené",             // ID 33
            bonuses: "Prémie",              // ID 94 (status field)
            paid: "Vyplatené",              // ID 34

            // Hourly rate
            hourlyRate: "Aktuálna hodinovka", // ID 42 (critical for wage calculation!)
        }
    }
};
```

### Work Hours & Wages (Total)
```javascript
var config = {
    fields: {
        employee: {
            // Hours (period-based, field ID 90)
            ordersHoursTotal: "Na zákazkách total",  // ID 57
            ridesHoursTotal: "Jazdy total",          // ID 89
            workedHoursTotal: "Odpracované total",   // ID 55

            // Wages (total)
            earnedTotal: "Zarobené total",           // ID 54
            bonusesTotal: "Prémie total",            // ID 102 (status field)
            paidTotal: "Vyplatené total",            // ID 56
        }
    }
};
```

### Financial Balance
```javascript
var config = {
    fields: {
        employee: {
            // Gross wage
            grossWage: "Hrubá mzda",              // ID 96

            // Balance (Zarobené - Vyplatené)
            overUnderPayment: "Preplatok/Nedoplatok", // ID 35 (status field)

            // Saldo section
            liabilities: "Záväzky",               // ID 98 (firma dlhuje zamestnancovi)
            receivables: "Pohľadávky",            // ID 99 (zamestnanec dlhuje firme)
            balance: "Saldo",                     // ID 97 (status field, Záväzky - Pohľadávky)
        }
    }
};
```

### Period Settings
```javascript
var config = {
    fields: {
        employee: {
            // Period for "Odpracované" section
            period: "obdobie",           // ID 86 (default: "tento týždeň")
            // Options: 1=deň, 2=týždeň, 3=mesiac, 4=rok, 6-8=minulé, 9-12=posledných X

            // Period for "Odpracované total" section
            periodTotal: "obdobie total", // ID 90
            // Options: 3=mesiac, 4=rok, 5=Total, 7=minulý mesiac, 8=minulý rok
        }
    }
};
```

### Technical & Logging
```javascript
var config = {
    fields: {
        employee: {
            // Logging
            debugLog: "Debug_Log",     // ID 80
            errorLog: "Error_Log",     // ID 81
            info: "info",              // ID 93

            // Status
            active: "Aktívny",         // ID 37 (boolean, default: true)
            driver: "Šofér",           // ID 84 (boolean, default: false)

            // Custom ID
            customId: "ID",            // ID 70 (int, default: 1)

            // UI
            view: "view",              // ID 95 (choice: 1=Tlač, 2=Editácia, 3=Debug)
        }
    }
};
```

### Notifications
```javascript
var config = {
    fields: {
        employee: {
            notification: "notifikácia", // ID 108 (checkboxes: 1=sms, 2=telegram, 3=email, 4=whatsapp)
            telegramId: "Telegram ID",   // ID 101
        }
    }
};
```

---

## Script Usage Examples

### Prístup K Poľu - Safe Pattern
```javascript
// NEVER hardcode field names!
var config = utils.config;
var employee = entry();

// Use safe accessor
var nick = utils.safeGet(employee, config.fields.employee.nick, "N/A");
var hourlyRate = utils.safeGet(employee, config.fields.employee.hourlyRate, 0);
var workedHours = utils.safeGet(employee, config.fields.employee.workedHours, 0);
```

### Výpočet Mzdy
```javascript
// Calculate wage based on hours and hourly rate
var hourlyRate = utils.safeGet(employee, config.fields.employee.hourlyRate, 0);
var workedHours = utils.safeGet(employee, config.fields.employee.workedHours, 0);
var earned = hourlyRate * workedHours;

// Set earned wage
utils.safeSet(employee, config.fields.employee.earned, earned);
```

### Formátovanie Mena Zamestnanca
```javascript
// Use MementoCore function
var employeeName = utils.formatEmployeeName(employee);
// Returns: "Nick (Meno Priezvisko)" or "Nick" if no full name
```

### Kontrola Aktívnosti
```javascript
var isActive = utils.safeGet(employee, config.fields.employee.active, true);
if (!isActive) {
    message("⚠️ Zamestnanec nie je aktívny!");
    cancel();
}
```

---

## Field Type Reference

| Memento Typ | JavaScript Typ | Príklad Hodnoty | Poznámka |
|-------------|----------------|-----------------|----------|
| text | string | "Ján Novák" | Jednoriadkové/viacriadkové |
| int | number | 42 | Celé číslo |
| double | number | 8.5 | Desatinné číslo |
| currency | number | 120.50 | Mena (EUR) |
| boolean | boolean | true/false | Áno/Nie |
| phone | string | "+421901234567" | Telefónne číslo |
| email | string | "jan@firma.sk" | Email |
| radio | string | "Zamestnanec" | Výber z možností (1 hodnota) |
| choice | string | "tento týždeň" | Dropdown výber |
| checkboxes | array | ["telegram", "email"] | Viacero možností |
| color | string | "#FF0000" | Hex farba |
| subheader | N/A | N/A | Len vizuálny oddeľovač |

---

## Známe Problémy a Best Practices

### ⚠️ CRITICAL: Použitie Správneho ID Poľa

**NIKDY nevolať pole priamo stringom!**
```javascript
// ❌ WRONG - Direct field name
var nick = employee.field("Nick");

// ✅ CORRECT - Use config + safe accessor
var nick = utils.safeGet(employee, config.fields.employee.nick, "N/A");
```

### ⚠️ Status Fields (role: "status")

Tieto polia sú často zobrazované ako hlavný status záznamu:
- **Prémie** (ID 94)
- **Prémie total** (ID 102)
- **Preplatok/Nedoplatok** (ID 35)
- **Saldo** (ID 97)

### ⚠️ Prepočítavané Polia

Tieto polia sa automaticky prepočítavajú na základe `obdobie` a `obdobie total`:
- Odpracované (31), Na zákazkách (32), Jazdy (88)
- Zarobené (33), Prémie (94), Vyplatené (34)
- Odpracované total (55), Na zákazkách total (57), Jazdy total (89)
- Zarobené total (54), Prémie total (102), Vyplatené total (56)

**DÔLEŽITÉ:** Prepočet musí byť implementovaný v calculation scripte!

### ⚠️ Nick vs Meno/Priezvisko

- **Nick** (ID 22) je hlavné pole (`role: "name"`) - VŽDY vyplniť
- **Meno** (ID 1) + **Priezvisko** (ID 2) sú voliteľné
- Pri formátovaní použiť `utils.formatEmployeeName()`

---

## Súvisiace Dokumenty

- **Field Cache:** `libraries/zamestnanci/fields.json` - Úplný zoznam polí s detailmi
- **MementoConfig.js:** `core/MementoConfig.js` - Centrálna konfigurácia
- **Core Modules Doc:** `docs/CORE_MODULES_DOCUMENTATION.md` - API funkcie

---

## Verzia Dokumentácie

**Verzia:** 1.0.0
**Dátum:** 2026-03-20
**Autor:** Claude Code + Memento API
**Posledná synchronizácia s API:** 2026-03-20 17:48:55
