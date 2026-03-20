# Dochádzka - Attendance Management

## Verzia: 2.0.0 (Dochadzka Module v1.0.14)

**Posledná aktualizácia:** 2026-03-20

---

## 📋 Popis

Knižnica **Dochádzka** (Attendance) automatizuje evidenciu pracovného času, výpočet miezd a integrá

ciu s Denným reportom. Používa reusable module pattern pre jednoduchú údržbu.

**Architektúra:**
- ✅ **Ultra-thin trigger scripts** (6-48 riadkov) - iba volania modulu
- ✅ **Dochadzka reusable module** - všetka business logika
- ✅ **GitHub synchronizácia** - verzovanie a centrálna údržba

---

## 📁 Štruktúra Projektových Súborov

```
libraries/dochadzka/
├── triggers/                  ← Automatické event handlers
│   ├── beforeSave.js             (Before Save - production) v2.0.0
│   ├── beforeSave-minimal.js     (Before Save - lightweight) v1.0.0
│   ├── beforeDelete.js           (Before Delete - cleanup) v1.0.0
│   └── afterSave-logCapture.js   (After Save - log backup)
│
├── actions/                   ← Manuálne action buttony
│   ├── recalculate.js            (Prepočítať všetky)
│   ├── validate.js               (Validovať záznam)
│   ├── debug.js                  (Zobraziť debug log)
│   ├── summary.js                (Zobrazť súhrn)
│   └── debug-*.js                (Test/debug scripty)
│
├── Doch.*.js                  ← Legacy/reference scripts (pre git history)
│   ├── Doch.Calc.Main.js         (v8.2 - archív)
│   ├── Doch.Calc.Module.js       (v1.0.14 - archív pred extrakciou)
│   ├── Doch.Calc.Universal.js    (Universal wrapper)
│   ├── Doch.Trigger.*.js         (Old trigger patterns)
│   └── Doch.Update.DailyReport.js (After Save - Denný report update)
│
└── README.md                  ← Tento súbor
```

**Aktuálne používané (Production):**
- `triggers/beforeSave.js` - Hlavný prepočtový trigger
- `triggers/beforeDelete.js` - Cleanup záväzkov
- `Doch.Update.DailyReport.js` - After Save trigger pre Denný report
- `actions/recalculate.js` - Manuálny prepočet

**Legacy (iba pre históriu):**
- `Doch.Calc.Main.js` - Starý monolitický script (528 riadkov)
- `Doch.Calc.Module.js` - Pred extrakciou do modules/
- Ostatné `Doch.*.js` - Staré verzie

---

## 🚀 Quick Start

### 1️⃣ Nahraj Shared Scripts (JS Knižnice)

V Memento Database:
**Nastavenia → Automations → Scripts → Shared Scripts**

Pridaj tieto moduly **v tomto poradí** (load order je kritický!):

```
1. MementoConfig (v8.0+)
2. MementoCore (v8.0+)
3. MementoUtils (v8.1+)
4. MementoBusiness (v8.0+)
5. Dochadzka (v1.0.14+)    ← Library module
```

**GitHub URLs:**
- MementoConfig: `https://raw.githubusercontent.com/mnauzer/memento-claude/main/core/MementoConfig.js`
- MementoCore: `https://raw.githubusercontent.com/mnauzer/memento-claude/main/core/MementoCore.js`
- MementoUtils: `https://raw.githubusercontent.com/mnauzer/memento-claude/main/core/MementoUtils.js`
- MementoBusiness: `https://raw.githubusercontent.com/mnauzer/memento-claude/main/core/MementoBusiness.js`
- Dochadzka: `https://raw.githubusercontent.com/mnauzer/memento-claude/main/modules/Dochadzka.js`

### 2️⃣ Vytvor Before Save Trigger

**Nastavenia → Automations → Scripts → Before Save Trigger**

1. **Create New Trigger**
2. **Attach JS Libraries:**
   - ✅ Dochadzka
   - ✅ MementoUtils
   - ✅ MementoBusiness
3. **Skopíruj kód** z `triggers/beforeSave.js`
4. **Save**

**Kód trigger scriptu (8 riadkov):**
```javascript
// Call Dochadzka module calculation function
var result = Dochadzka.calculateAttendance(entry(), {});

// Handle errors
if (!result.success) {
    message("❌ Chyba: " + result.error);
    cancel();
}

// Success confirmation
message("✅ Hotovo");
```

### 3️⃣ Vytvor Before Delete Trigger

**Nastavenia → Automations → Scripts → Before Delete Trigger**

1. **Create New Trigger**
2. **Attach JS Libraries:** MementoUtils
3. **Skopíruj kód** z `triggers/beforeDelete.js`
4. **Save**

**Účel:** Automaticky zmaže záväzky (Obligations) spojené s dochádzkou pri vymazaní záznamu.

### 4️⃣ Vytvor After Save Trigger (Denný Report)

**Nastavenia → Automations → Scripts → After Save Trigger**

1. **Create New Trigger**
2. **Attach JS Libraries:** MementoUtils
3. **Skopíruj kód** z `Doch.Update.DailyReport.js`
4. **Save**

**Účel:** Aktualizuje linknuté Denné reporty po uložení dochádzky.

### 5️⃣ Vytvor Actions (Voliteľné)

**Nastavenia → Automations → Scripts → Actions**

Odporúčané actions:

| Action | Súbor | Scope | Účel |
|--------|-------|-------|------|
| **Prepočítať** | `actions/recalculate.js` | Library | Prepočíta všetky záznamy |
| **Validovať** | `actions/validate.js` | Entry | Validácia bez prepočtu |
| **Debug** | `actions/debug.js` | Entry | Zobrazí debug log |
| **Súhrn** | `actions/summary.js` | Entry | Zobrazí súhrn bez dependencies |

---

## 🎯 Funkcionalita

### Automatický Prepočet (Before Save Trigger)

**Spúšťa sa:** Pri každom uložení záznamu Dochádzky

**Kroky:**
1. ✅ **Validácia dátumu** - Kontroluje víkend/sviatok
2. ✅ **Výpočet pracovného času** - Odchod - Príchod (zaokrúhlené na 15 min)
3. ✅ **Výpočet odpracovaných hodín** - Pracovný čas - prestávka
4. ✅ **Spracovanie zamestnancov** - Pre každého:
   - Vypočíta mzdu (hodinová sadzba × hodiny)
   - Vytvorí/aktualizuje záväzok (Obligation)
   - Aggreguje počet zamestnancov a celkové náklady
5. ✅ **Vytvorenie/aktualizácia Denný report**
6. ✅ **Info záznam** - Vytvorí markdown súhrn
7. ✅ **Ikony** - Pridá vizuálne indikátory (💸, 📅)

### Výpočet Pracovného Času

**Pravidlá:**
- **15-minute rounding:** Čas zaokrúhľovaný na najbližších 15 minút
- **Automatická prestávka:** 30 min prestávka ak pracovný čas > 6 hodín
- **Víkend/Sviatok:** Označené, ale nevyžaduje prepočet

**Vzorec:**
```
Pracovný čas = Odchod - Príchod (zaokrúhlené na 15 min)
Odpracované hodiny = Pracovný čas - prestávka (ak > 6h)
```

**Príklad:**
```
Príchod: 07:03
Odchod: 15:47
→ Pracovný čas: 8.75h (zaokrúhlené z 8h 44min)
→ Prestávka: 0.5h (automaticky pridaná)
→ Odpracované: 8.25h
```

### Výpočet Miezd a Záväzkov

**Pre každého zamestnanca:**

1. **Získaj hodinovú sadzbu** (z knižnice Zamestnanec)
2. **Vypočítaj mzdu:**
   ```
   Mzda = Hodinová sadzba × Odpracované hodiny
   ```
3. **Vytvor/aktualizuj záväzok (Obligation):**
   - **Typ:** "Mzdy"
   - **Veriteľ:** Meno zamestnanca (Nick)
   - **Dlžník:** "ASISTANTO s.r.o."
   - **Suma:** Vypočítaná mzda
   - **Popis:** Auto-generovaný (Dátum, Hodiny, Sadzba)
   - **Link:** Prepojenie na Dochádzku (linkToEntry)

**Deduplikácia:**
- Ak už existuje záväzok pre daný deň a zamestnanca → AKTUALIZUJ
- Ak neexistuje → VYTVOR NOVÝ
- Používa `linkToEntry` field pre identifikáciu

### Denný Report Integrácia

**After Save Trigger:**
- Nájde všetky linknuté Denné reporty
- Triggeruje ich prepočet (nastavením modifiedDate)
- Denný report potom agreguje dáta z Dochádzky

**Čo Denný report robí:**
- Agreguje odpracované hodiny zo všetkých Dochádzok
- Zbiera zoznam zamestnancov
- Pridáva ikonu 📊 do Dochádzky záznamu (indikátor prepojenia)

---

## 📦 Module: Dochadzka.js

**Location:** `modules/Dochadzka.js`
**Version:** 1.0.14
**Type:** Reusable Library Module (IIFE Pattern)
**GitHub:** Synchronized

### Závislosti

**Vyžadované moduly:**
- `MementoUtils` (v7.0+) - Utility funkcience
- `MementoConfig` (v8.0+) - Centrálna konfigurácia
- `MementoTime` (v1.1+) - Time utilities (zaokrúhľovanie)
- `MementoBusiness` (v8.0+) - Business logic (mzdy, záväzky)

### Public API

#### calculateAttendance(entry, options)

Hlavná funkcia pre prepočet dochádzky.

**Parametre:**
- `entry` (Object) - Memento entry object (current record)
- `options` (Object) - Configuration options (optional)

**Options:**
```javascript
{
    settings: {
        roundToQuarterHour: true,     // 15-min zaokrúhľovanie
        roundDirection: "nearest",    // "up", "down", "nearest"
        includeBreaks: true,          // Automatické prestávky
        breakThreshold: 6,            // hodín pred prestávkou
        breakDuration: 30             // minút prestávka
    },
    skipDailyReport: false,           // Preskočiť Denný report vytvorenie
    skipColoring: false               // Preskočiť farebné označenie
}
```

**Return Value:**
```javascript
{
    success: boolean,              // Úspešnosť prepočtu
    isDayOff: boolean,             // Je víkend/sviatok?
    error: string,                 // Chybová správa (ak !success)

    data: {
        workHours: number,         // Pracovná doba (Odchod - Príchod)
        totalHours: number,        // Odpracované (Pracovná doba - prestávka)
        totalWages: number,        // Celkové mzdové náklady
        employeeCount: number,     // Počet pracovníkov
        obligationsCreated: number,  // Počet vytvorených záväzkov
        obligationsUpdated: number   // Počet aktualizovaných záväzkov
    },

    steps: {
        step1: { name: "Validácia dátumu", success: boolean },
        step2: { name: "Výpočet pracovného času", success: boolean },
        step3: { name: "Spracovanie zamestnancov", success: boolean },
        step4: { name: "Vytvorenie/aktualizácia Denný report", success: boolean },
        step5: { name: "Vytvorenie info záznamu", success: boolean }
    }
}
```

**Príklad použitia:**
```javascript
// Basic usage
var result = Dochadzka.calculateAttendance(entry(), {});

if (!result.success) {
    message("❌ " + result.error);
    cancel();
}

message("✅ Hotovo: " + result.data.totalHours + "h");
```

**Custom settings:**
```javascript
var result = Dochadzka.calculateAttendance(entry(), {
    settings: {
        roundToQuarterHour: false,  // Vypni zaokrúhľovanie
        includeBreaks: false        // Bez automatických prestávok
    },
    skipDailyReport: true           // Nevytváraj Denný report
});
```

#### validateEntry(entry, options)

Validácia bez prepočtu (iba kontrola).

**Return Value:**
```javascript
{
    valid: boolean,
    errors: Array<string>,
    data: Object
}
```

**Príklad:**
```javascript
var validation = Dochadzka.validateEntry(entry(), {});

if (!validation.valid) {
    dialog("Chyby", validation.errors.join("\n"), "OK");
    cancel();
}
```

---

## 🎨 Vizuálne Indikátory (Ikony)

**Pole:** `ikony záznamu`

### Automaticky pridávané ikony:

| Ikona | Kedy | Význam |
|-------|------|--------|
| 💸 | Po vytvorení záväzkov | Vytvorené mzdové záväzky |
| 📅 | Po prepojení s Denným reportom | Linknuté s Denným reportom |
| 📊 | Pridané Denným reportom (AfterSave) | Tento záznam je v Dennom reporte |

**Príklad:**
```
ikony záznamu: 💸 📅 📊
```

---

## 📊 Pole Info - Zhrnutie

**Pole:** `info`

**Formát:** Markdown

**Obsah:**
```markdown
## 📋 DOCHÁDZKA - ZHRNUTIE

**Dátum:** 20.03.2026 (Utorok)
**Aktualizované:** 20.03.2026 14:30

### 👥 Zamestnanci (3)
- Janko (8.25h × 12€ = 99€)
- Ferko (8.25h × 15€ = 123.75€)
- Jožko (8.25h × 10€ = 82.50€)

### ⏱️ Pracovný čas
- **Príchod:** 07:00
- **Odchod:** 15:45
- **Pracovný čas:** 8.75h
- **Prestávka:** 0.5h
- **Odpracované:** 8.25h

### 💰 Mzdové náklady
- **Celkom:** 305.25€
- **Počet pracovníkov:** 3

### 💸 Záväzky
- Vytvorené: 2
- Aktualizované: 1
```

---

## 🔄 Workflow

### 1. Vytvorenie Nového Záznamu

```
1. Užívateľ vytvorí záznam (Dátum, Príchod, Odchod, Zamestnanci)
   ↓
2. Before Save Trigger sa spustí
   ↓
3. Dochadzka.calculateAttendance() prepočíta:
   - Pracovný čas
   - Odpracované hodiny
   - Mzdy pre každého zamestnanca
   - Vytvorí záväzky
   - Vytvorí/aktualizuje Denný report
   ↓
4. Záznam sa uloží
   ↓
5. After Save Trigger sa spustí
   ↓
6. Aktualizuje linknuté Denné reporty
   ↓
7. Denný report pridá ikonu 📊 do Dochádzky
```

### 2. Aktualizácia Existujúceho Záznamu

```
1. Užívateľ zmení čas/zamestnancov
   ↓
2. Before Save Trigger prepočíta
   ↓
3. AKTUALIZUJE existujúce záväzky (neduplikuje!)
   ↓
4. AKTUALIZUJE Denný report
   ↓
5. Uloží zmeny
```

### 3. Vymazanie Záznamu

```
1. Užívateľ zmaže záznam
   ↓
2. Before Delete Trigger sa spustí
   ↓
3. Nájde všetky linknuté záväzky (cez linkToEntry)
   ↓
4. Zmaže záväzky
   ↓
5. Zmaže záznam
```

---

## 🧪 Testovanie

### Základný Test

1. **Vytvor nový záznam:**
   - Dátum: dnes
   - Príchod: 07:00
   - Odchod: 15:00
   - Zamestnanci: 1-3 zamestnancov s hodinovou sadzbou

2. **Ulož záznam**

3. **Skontroluj výsledky:**
   - ✅ `Pracovná doba` = 8h
   - ✅ `Odpracované` = 7.5h (8h - 0.5h prestávka)
   - ✅ `Počet pracovníkov` = počet zamestnancov
   - ✅ `Mzdové náklady` = súčet miezd
   - ✅ `ikony záznamu` obsahuje 💸 📅
   - ✅ `info` pole má markdown zhrnutie
   - ✅ V knižnici Záväzky sú vytvorené záznamy

4. **Skontroluj záväzky:**
   - ✅ Typ = "Mzdy"
   - ✅ Veriteľ = meno zamestnanca
   - ✅ Suma = hodinová sadzba × hodiny
   - ✅ `linkToEntry` field ukazuje na Dochádzku

5. **Skontroluj Denný report:**
   - ✅ Existuje záznam pre daný dátum
   - ✅ Dochádzka je linknutá
   - ✅ Dochádzka má ikonu 📊

### Test Aktualizácie

1. **Zmeň čas alebo zamestnancov**
2. **Ulož**
3. **Skontroluj:**
   - ✅ Záväzky AKTUALIZOVANÉ (nie duplikované!)
   - ✅ Počty súhlasia
   - ✅ Denný report aktualizovaný

### Test Vymazania

1. **Vymaž záznam Dochádzky**
2. **Skontroluj:**
   - ✅ Záväzky ZMAZANÉ
   - ✅ Denný report stále existuje (ale bez tohto linku)

### Test Víkendu/Sviatku

1. **Vytvor záznam pre sobotu/nedeľu**
2. **Ulož**
3. **Skontroluj:**
   - ✅ `Stav záznamu` = "Víkend" alebo "Sviatok"
   - ✅ Neprepočítava mzdy (optional behavior)

---

## 🐛 Troubleshooting

### "Dochadzka is not defined"

**Príčina:** Modul Dochadzka nie je nahraný

**Riešenie:**
1. Nastavenia → Automations → Scripts → Shared Scripts
2. Add Script → From URL
3. Paste: `https://raw.githubusercontent.com/mnauzer/memento-claude/main/modules/Dochadzka.js`
4. Save

### "MementoUtils is not defined"

**Príčina:** Core moduly nie sú nahrané alebo zlé poradie

**Riešenie:**
1. Skontroluj load order v Shared Scripts (viď Quick Start)
2. Overeď že všetky 5 modulov sú nahrané

### Prepočet nefunguje / Chyby v Error_Log

**Skontroluj:**
1. **Debug_Log pole** - Detailný trace prepočtu
2. **Error_Log pole** - Presné chybové hlásenia
3. **Povinné polia:**
   - ✅ Dátum
   - ✅ Príchod (TIME pole)
   - ✅ Odchod (TIME pole)
   - ✅ Zamestnanci (linkToEntry, aspoň 1)
4. **Zamestnanci majú hodinovú sadzbu:**
   - Otvor zamestnanca → skontroluj pole "Hodinovka"

### Záväzky sa duplikujú

**Príčina:** Stará verzia modulu (< v1.0.14)

**Riešenie:**
1. Aktualizuj Dochadzka modul na v1.0.14+
2. V knižnici Záväzky zmaž duplikáty manuálne
3. Prepočítaj Dochádzku znova (Action: Prepočítať)

### Denný report sa nevytvára

**Príčina:** Chýba MementoBusiness modul

**Riešenie:**
1. Pridaj MementoBusiness do Shared Scripts
2. Pridaj MementoBusiness do JS Libraries trigger scriptu

### "Cannot read property 'attendance' of undefined"

**Príčina:** MementoConfig chýba alebo chybná verzia

**Riešenie:**
1. Overeď MementoConfig v8.0+
2. Skontroluj že MementoConfig obsahuje `fields.attendance`

---

## 📚 Dokumentácia Polí

### Vstupné Polia (User-filled)

| Pole | Typ | Povinné | Popis |
|------|-----|---------|-------|
| `Dátum` | DATE | ✅ | Dátum dochádzky |
| `Príchod` | TIME | ✅ | Čas príchodu |
| `Odchod` | TIME | ✅ | Čas odchodu |
| `Zamestnanci` | linkToEntry | ✅ | Link na Zamestnanec (min. 1) |
| `Dôvod` | TEXT | ❌ | Dôvod voľna (ak víkend/sviatok) |

### Vypočítané Polia (Auto-calculated)

| Pole | Typ | Vypočítané ako | Príklad |
|------|-----|----------------|---------|
| `Deň v týždni` | TEXT | moment(Dátum).format("dddd") | "Utorok" |
| `Pracovná doba` | NUMBER | Odchod - Príchod (zaokrúhlené) | 8.75 |
| `Odpracované` | NUMBER | Pracovná doba - prestávka | 8.25 |
| `Počet pracovníkov` | NUMBER | Zamestnanci.length | 3 |
| `Mzdové náklady` | NUMBER | Súčet miezd všetkých zamestnancov | 305.25 |
| `Stav záznamu` | TEXT | "Víkend" / "Sviatok" / "" | "Víkend" |
| `ikony záznamu` | TEXT | Automaticky pridané | "💸 📅 📊" |
| `info` | TEXT | Markdown zhrnutie | (viď vyššie) |

### Debugging Polia

| Pole | Typ | Účel |
|------|-----|------|
| `Debug_Log` | TEXT | Detailný trace prepočtu |
| `Error_Log` | TEXT | Chybové hlásenia |

### Prepojenia

| Pole | Typ | Target Library | Popis |
|------|-----|----------------|-------|
| `Denný report` | linksFrom | Denný report | Backlink na Denný report |

---

## 🔄 Aktualizácia Modulu

**Kedy aktualizovať:**
- Nová verzia Dochadzka modulu na GitHub
- Bug fix alebo nová funkcionalita
- Security patch

**Ako aktualizovať:**
1. **Shared Scripts:**
   - Nastavenia → Automations → Scripts → Shared Scripts
   - Klikni na "Dochadzka"
   - Klikni "Update from URL" (ak je button)
   - ALebo zmaž a pridaj znova z GitHub URL

2. **Trigger/Action scripty:**
   - **NIE JE potrebné meniť!** ✅
   - Thin wrappers sú stabilné
   - Všetka logika je v module

3. **Testovanie:**
   - Vytvor testovací záznam
   - Skontroluj Debug_Log a Error_Log
   - Overeď že všetko funguje

---

## 📈 Verzie

### Module: Dochadzka.js

| Verzia | Dátum | Zmeny |
|--------|-------|-------|
| v1.0.14 | 2026-03-20 | FIX: Removed duplicate obligation creation |
| v1.0.6 | 2026-03-19 | Added visual icons (💸, 📅) |
| v1.0.0 | 2026-03-19 | Initial extracted from Doch.Calc.Main.js |

### Trigger Scripts

| Script | Verzia | Status |
|--------|--------|--------|
| triggers/beforeSave.js | 2.0.0 | ✅ Production |
| triggers/beforeSave-minimal.js | 1.0.0 | ✅ Production (mobile) |
| triggers/beforeDelete.js | 1.0.0 | ✅ Production |
| Doch.Update.DailyReport.js | 1.0.0 | ✅ Production (After Save) |

### Action Scripts

| Script | Verzia | Status |
|--------|--------|--------|
| actions/recalculate.js | 1.0.0 | ✅ Production |
| actions/validate.js | 1.0.0 | ✅ Production |
| actions/debug.js | 1.0.0 | ✅ Production |
| actions/summary.js | 1.0.0 | ✅ Production |

---

## 🎓 Best Practices

### 1. Používaj Thin Wrappers

**GOOD:**
```javascript
var result = Dochadzka.calculateAttendance(entry(), {});
if (!result.success) {
    message("❌ " + result.error);
    cancel();
}
```

**BAD:**
```javascript
// 500 riadkov copy-paste kódu...
```

### 2. Vždy kontroluj result.success

```javascript
var result = Dochadzka.calculateAttendance(entry(), {});

if (!result.success) {
    // Handle error
    message("❌ " + result.error);
    cancel();
}

// Continue with success
message("✅ " + result.data.totalHours + "h");
```

### 3. Používaj Debug_Log pre troubleshooting

```javascript
// V module sa automaticky loguje do Debug_Log
// Pre zobrazenie:
// - Otvor záznam
// - Klikni na pole Debug_Log
// - Alebo použij Action "Debug"
```

### 4. Netlač manuálne "Ulož" bez potreby

- Before Save trigger sa spúšťa automaticky
- Prepočet prebieha pri každom uložení
- Netestuj opakovaným ukladaním (vzniknú duplikáty záväzkov v starších verziách)

---

## 💡 Tips & Tricks

### Minimálny Setup (Mobile/Lightweight)

**Trigger:**
```javascript
// triggers/beforeSave-minimal.js (6 riadkov!)
var result = Dochadzka.calculateAttendance(entry(), {});
if (!result.success) cancel();
```

**Action:**
```javascript
// actions/summary.js (žiadne dependencies!)
dialog("Súhrn", entry().field("info"), "OK");
```

### Full-featured Setup (Desktop)

**Triggers:**
- beforeSave.js (prepočet)
- beforeDelete.js (cleanup)
- Doch.Update.DailyReport.js (after save)

**Actions:**
- recalculate.js
- validate.js
- debug.js
- summary.js

### Debugging Workflow

1. **Action: Debug** - Zobraz Debug_Log
2. **Skontroluj Error_Log** - Presné chyby
3. **Skontroluj info** - Výsledky prepočtu
4. **Overeď závislosti** - Shared Scripts load order

---

## 📞 Podpora

**Problémy?**
1. Skontroluj Debug_Log a Error_Log polia
2. Pozri sekciu "Troubleshooting"
3. Overeď že všetky závislosti sú nahrané (5 modulov)
4. Skontroluj load order v Shared Scripts

**GitHub Issues:**
- Nahláste problémy na GitHub repozitári projektu
- Priložte Debug_Log a Error_Log output

---

## 🔗 Súvisiace Dokumentácie

- **Denný Report:** `libraries/denny-report/README.md`
- **Core Modules:** `docs/CORE_MODULES_DOCUMENTATION.md`
- **MementoBusiness:** Wage & obligation logic
- **MementoTime:** Time rounding utilities
- **Project Structure:** `MEMENTO_PROJECT_STRUCTURE.md`

---

**Version:** 2.0.0
**Module Version:** 1.0.14
**Last Updated:** 2026-03-20
**Maintainer:** ASISTANTO

**License:** ASISTANTO Internal Project © 2026
