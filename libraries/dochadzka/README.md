# Dochádzka - Attendance Scripts

**Library:** Dochádzka (Attendance)
**Purpose:** Automated attendance calculation, wage computation, and daily report integration

---

## 📂 Adresárová štruktúra

```
libraries/dochadzka/
├── triggers/              ← Automatické event scripty
│   ├── beforeSave.js           (Before Save - štandardný)
│   ├── beforeSave-minimal.js   (Before Save - minimálny)
│   ├── beforeDelete.js         (Before Delete - cleanup)
│   └── README.md
├── actions/               ← Manuálne action buttony
│   ├── recalculate.js          (Prepočítať)
│   ├── validate.js             (Validovať)
│   ├── debug.js                (Zobraziť debug)
│   ├── summary.js              (Súhrn)
│   └── README.md
├── Doch.Calc.Main.js      ← Legacy (v8.2 - pre git history)
├── Doch.Calc.v9.js        ← Wrapper (v9.0 - pre git history)
└── README.md              ← Tento súbor
```

---

## 🚀 Quick Start

### 1️⃣ Pridaj Shared Scripts (JS knižnice)

V Memento Database:
**Nastavenia → Automations → Scripts → Shared**

Pridaj tieto moduly (v tomto poradí):
```
1. MementoConfig
2. MementoCore
3. MementoUtils
4. Dochadzka      ← Library module (modules/Dochadzka.js)
```

### 2️⃣ Vytvor Trigger (automatický prepočet)

**Nastavenia → Automations → Scripts → Triggers → Before Save**

1. Create Script
2. **Pridaj JS knižnice:** Dochadzka, MementoUtils
3. **Skopíruj kód** z `triggers/beforeSave.js`
4. Save

**Hotovo!** Prepočet beží automaticky pri každom uložení.

### 3️⃣ Vytvor Actions (voliteľné)

**Nastavenia → Automations → Scripts → Actions**

Vytvor buttony podľa potreby:
- **Prepočítať** - `actions/recalculate.js`
- **Validovať** - `actions/validate.js`
- **Debug** - `actions/debug.js`
- **Súhrn** - `actions/summary.js`

---

## 📋 Triggers vs Actions

| Typ | Kedy sa spúšťa | Použitie | Príklady |
|-----|----------------|----------|----------|
| **Trigger** | Automaticky (event) | Prepočty, validácie, cleanup | Before Save, After Save, Before Delete |
| **Action** | Manuálne (tlačidlo) | Dodatočné operácie, debug | Prepočítať, Validovať, Zobraziť debug |

---

## 🎯 Ktorý script použiť?

### Pre produkciu:

**Trigger:**
- `triggers/beforeSave.js` - Štandardný prepočet (8 riadkov)
- `triggers/beforeDelete.js` - Cleanup záväzkov (20 riadkov)

**Actions (odporúčané):**
- `actions/recalculate.js` - Prepočet existujúcich záznamov
- `actions/debug.js` - Troubleshooting

### Pre mobile:

**Trigger:**
- `triggers/beforeSave-minimal.js` - Len 6 riadkov!

**Actions:**
- `actions/summary.js` - Žiadne dependencies
- `actions/debug.js` - Žiadne dependencies

---

## 📦 Module: Dochadzka.js

**Location:** `modules/Dochadzka.js`
**Version:** 1.0.1
**Type:** Reusable Library Module

**Public API:**

### calculateAttendance(entry, options)
Hlavná funkcia pre prepočet dochádzky.

**Returns:**
```javascript
{
    success: boolean,
    isDayOff: boolean,
    data: {
        workHours: number,      // Pracovná doba
        totalHours: number,     // Celkom odpracované
        totalWages: number,     // Celkové mzdy
        employeeCount: number,  // Počet pracovníkov
        obligationsCreated: number,
        obligationsUpdated: number
    },
    steps: { ... }              // Status každého kroku
}
```

**Príklad:**
```javascript
var result = Dochadzka.calculateAttendance(entry(), {});

if (!result.success) {
    message("❌ " + result.error);
    cancel();
}

message("✅ Hotovo");
```

### validateEntry(entry, options)
Validácia bez prepočtu.

**Returns:**
```javascript
{
    valid: boolean,
    errors: Array<string>,
    data: Object
}
```

---

## 🔧 Konfigurácia (voliteľná)

Štandardné nastavenia:
```javascript
var result = Dochadzka.calculateAttendance(entry(), {
    settings: {
        roundToQuarterHour: true,     // 15-min zaokrúhľovanie
        roundDirection: "nearest",    // "up", "down", "nearest"
        includeBreaks: true,          // Automatické prestávky
        breakThreshold: 6,            // hodín pred prestávkou
        breakDuration: 30             // minút prestávka
    },
    skipDailyReport: false,           // Preskočiť Denný report
    skipColoring: false               // Preskočiť farebné označenie
});
```

---

## 🔄 Migration Guide

### Z _manual/ → triggers/actions/

Stará štruktúra (`_manual/`) je **zastaraná**.

**Mapovanie:**
```
_manual/trigger-before-save.js    → triggers/beforeSave.js
_manual/trigger-minimal.js        → triggers/beforeSave-minimal.js
_manual/action-recalculate.js     → actions/recalculate.js
_manual/action-validate-only.js   → actions/validate.js
_manual/action-debug.js           → actions/debug.js
_manual/action-quick-summary.js   → actions/summary.js
```

**Zmeny:**
- ✅ Lepšia organizácia (triggers/ vs actions/)
- ✅ Štandardizované názvy súborov
- ✅ Jednotné hlavičky s verziou a eventom
- ✅ Samostatné README pre každý adresár

---

## 🐛 Troubleshooting

### "Dochadzka is not defined"
**Riešenie:** Pridaj `Dochadzka` modul do JS knižníc scriptu

### "MementoUtils is not defined"
**Riešenie:** Pridaj `MementoUtils` do JS knižníc scriptu

### Load Order Error
**Riešenie:** Overeď správne poradie v Shared Scripts:
```
1. MementoConfig
2. MementoCore
3. MementoUtils
4. Dochadzka       ← Pred trigger/action scriptom!
```

### Prepočet nefunguje
**Skontroluj:**
1. Debug_Log pole v zázname
2. Error_Log pole
3. Povinné polia (Dátum, Príchod, Odchod, Zamestnanci)
4. Hodinová sadzba u zamestnancov

---

## 📊 Script Verzie

| Script | Typ | Event | Verzia | Status |
|--------|-----|-------|--------|--------|
| triggers/beforeSave.js | Trigger | Before Save | 1.0.0 | ✅ Production |
| triggers/beforeSave-minimal.js | Trigger | Before Save | 1.0.0 | ✅ Production |
| triggers/beforeDelete.js | Trigger | Before Delete | 1.0.0 | ✅ Production |
| actions/recalculate.js | Action | Manual | 1.0.0 | ✅ Production |
| actions/validate.js | Action | Manual | 1.0.0 | ✅ Production |
| actions/debug.js | Action | Manual | 1.0.0 | ✅ Production |
| actions/summary.js | Action | Manual | 1.0.0 | ✅ Production |

---

## 📚 Ďalšie Dokumentácie

- **Triggers:** `triggers/README.md`
- **Actions:** `actions/README.md`
- **Module API:** `modules/docs/Dochadzka.md`
- **Core Modules:** `docs/CORE_MODULES_DOCUMENTATION.md`

---

## 💡 Tips

### Minimálny setup (mobile):
1. Trigger: `beforeSave-minimal.js` (6 riadkov)
2. Action: `summary.js` (žiadne dependencies)

### Plný setup (desktop):
1. Trigger: `beforeSave.js` + `beforeDelete.js`
2. Actions: všetky 4 (recalculate, validate, debug, summary)

### Pre debugging:
1. Action: `debug.js` - zobrazí logy
2. Skontroluj Debug_Log a Error_Log polia

---

## 🔄 Aktualizácia

Keď aktualizuješ `modules/Dochadzka.js`:
1. Zmaž starý Dochadzka v Shared Scripts
2. Importuj nový z GitHub
3. **Trigger/Action scripty NIE JE potrebné meniť!** ✅

---

**Version:** 1.0.0
**Last Updated:** 2026-03-19
