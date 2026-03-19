# Library Script Organization Standard

**Verzia:** 1.1.0
**Dátum:** 2026-03-19
**Účel:** Štandardná organizácia scriptov pre Memento Database knižnice

---

## 📂 Štruktúra adresárov

Každá knižnica v `libraries/` má túto štandardnú štruktúru:

```
libraries/{library-name}/
├── triggers/              ← Automatické event scripty
│   ├── beforeSave.js
│   ├── afterSave.js
│   ├── beforeDelete.js
│   ├── afterDelete.js
│   └── README.md
├── actions/               ← Manuálne action buttony
│   ├── {action-name}.js
│   ├── {action-name}.js
│   └── README.md
├── {Legacy scripts}       ← Staré monolitické scripty (pre git history)
└── README.md              ← Hlavná dokumentácia knižnice
```

---

## 📋 Naming Convention

### Trigger Scripts

**Format:** `{event}.js`

**Prípustné názvy:**
- `beforeSave.js` - Before Save event
- `beforeSave-minimal.js` - Minimálna verzia Before Save
- `afterSave.js` - After Save event
- `beforeDelete.js` - Before Delete event
- `afterDelete.js` - After Delete event
- `beforeCreate.js` - Before Create event
- `afterCreate.js` - After Create event

### Action Scripts

**Format:** `{action-name}.js`

**Prípustné názvy:**
- `recalculate.js` - Prepočítať
- `validate.js` - Validovať
- `debug.js` - Zobraziť debug logy
- `summary.js` - Zobraziť súhrn
- `export.js` - Exportovať dáta
- `import.js` - Importovať dáta
- `cleanup.js` - Vyčistiť dáta

**Pravidlá:**
- ✅ Lowercase názvy
- ✅ Bez prefixov (action-, trigger-)
- ✅ Krátke, výstižné názvy
- ✅ V angličtine (nie slovenčine)

---

## 📝 Script Header Template

Každý script musí mať štandardnú hlavičku:

```javascript
// ==============================================
// {LIBRARY NAME} - {Script Purpose}
// ==============================================
// Typ: Trigger / Action
// Udalosť: {Udalosť} (pre Trigger)
// Fáza: {Fáza} (pre Trigger)
// Verzia: X.Y.Z
// Dátum: YYYY-MM-DD
// ==============================================
// 📋 FUNKCIA:
//    - {Popis čo script robí}
//    - {Ďalšie body}
// ==============================================
// 🔧 JS KNIŽNICE (pridaj v Memento):
//    - {ModuleName}
//    - {ModuleName}
// ==============================================

// Script code here...
```

### Povinné položky v hlavičke:

| Položka | Popis | Príklad |
|---------|-------|---------|
| **Typ** | Trigger alebo Action | `Typ: Trigger` |
| **Udalosť** | Typ udalosti (len pre Trigger) | `Udalosť: Aktualizácia záznamu` |
| **Fáza** | Fáza spracovania (len pre Trigger) | `Fáza: Pred uložením záznamu` |
| **Verzia** | Semantic versioning | `Verzia: 1.0.0` |
| **Dátum** | Dátum vytvorenia/update | `Dátum: 2026-03-19` |
| **FUNKCIA** | Čo script robí | Bullet points s popisom |
| **JS KNIŽNICE** | Potrebné moduly | Zoznam modulov na import |

### Dostupné hodnoty pre Trigger scripty:

#### Udalosť (Event Type):
- **Vytvorenie záznamu** - Pri vytvorení nového záznamu
- **Aktualizácia záznamu** - Pri úprave existujúceho záznamu
- **Odstraňovanie záznamu** - Pri mazaní záznamu
- **Otváranie karty Zobrazenie záznamu** - Pri otvorení detail view
- **Pridávanie záznamov do Obľúbených** - Pri pridaní do favorites
- **Odstraňovanie záznamu z Obľúbených** - Pri odstránení z favorites
- **Otváranie knižnice** - Pri otvorení knižnice
- **Prepojenie záznamu** - Pri vytvorení linku medzi záznamami
- **Zrušenie prepojenia záznamu** - Pri zrušení linku
- **Aktualizácia poľa** - Pri zmene konkrétneho poľa
- **V naplánovanom čase** - Scheduled trigger

#### Fáza (Phase):
- **Otváranie karty Úprava záznamu** - Pri otvorení edit mode
- **Pred uložením záznamu** - Before save/delete
- **Po uložení záznamu** - After save/delete

---

## 📚 README Files

Každý adresár musí mať README.md:

### triggers/README.md

```markdown
# {Library} - Triggers

**Adresár:** `libraries/{library}/triggers/`
**Účel:** Automatické event scripty

## Dostupné Triggers

| Script | Event | Verzia | Riadky | Popis |
|--------|-------|--------|--------|-------|
| beforeSave.js | Before Save | 1.0.0 | X | ... |

## Ako použiť

1. Pridaj JS knižnice
2. Vytvor Trigger Script
3. Skopíruj kód
```

### actions/README.md

```markdown
# {Library} - Actions

**Adresár:** `libraries/{library}/actions/`
**Účel:** Manuálne action buttony

## Dostupné Actions

| Script | Verzia | Riadky | Popis |
|--------|--------|--------|-------|
| recalculate.js | 1.0.0 | X | ... |

## Ako použiť

1. Pridaj JS knižnice
2. Vytvor Action
3. Skopíruj kód
```

### Main README.md

Hlavný README obsahuje:
- 📂 Adresárová štruktúra
- 🚀 Quick Start guide
- 📋 Triggers vs Actions prehľad
- 📦 Module API dokumentácia
- 🔧 Konfigurácia
- 🐛 Troubleshooting
- 📊 Verzie všetkých scriptov

---

## 🎯 Ktoré knižnice použijú túto štruktúru?

### Už implementované:
- ✅ **Dochádzka** (`libraries/dochadzka/`) - vzorová implementácia

### Plánované:
- 🔲 **Pokladňa** (`libraries/pokladna/`)
- 🔲 **Materiál** (`libraries/material/`)
- 🔲 **Kniha jázd** (`libraries/kniha-jazd/`)
- 🔲 **Cenové ponuky** (`libraries/cenove-ponuky/`)
- 🔲 **Zákazky** (`libraries/zakazky/`)
- 🔲 **Záznam prác** (`libraries/zaznam-prac/`)
- ... všetky ostatné knižnice

---

## 🔄 Migration Strategy

Pre existujúce knižnice bez triggers/actions štruktúry:

### Krok 1: Vytvor adresáre
```bash
mkdir -p libraries/{library}/triggers
mkdir -p libraries/{library}/actions
```

### Krok 2: Identifikuj existujúce scripty

Rozdeľ podľa typu:
- **Triggers:** `*Trigger*.js`, `*Calc*.js` (ak je Before Save)
- **Actions:** `*Action*.js`, `*Button*.js`

### Krok 3: Extrahuj mini verzie

Pre každý monolitický script:
1. Vytvor mini wrapper v triggers/ alebo actions/
2. Zavolaj reusable modul (ak existuje)
3. Pridaj štandardnú hlavičku
4. Ponechaj originál pre git history

### Krok 4: Vytvor README súbory

- `triggers/README.md`
- `actions/README.md`
- Aktualizuj hlavný `README.md`

### Krok 5: Commit

```bash
git add libraries/{library}/triggers libraries/{library}/actions
git commit -m "feat: reorganize {library} scripts to triggers/actions structure"
```

---

## 💡 Best Practices

### Trigger Scripts

- ✅ Čo najkratšie (6-20 riadkov)
- ✅ Len volanie modulu + error handling
- ✅ Vždy clear error messages
- ✅ Použiť `cancel()` ak zlyhá

### Action Scripts

- ✅ Zobrazuj výsledky v `dialog()` (nie `message()`)
- ✅ Formátuj výstupy pre user-friendly čítanie
- ✅ Pridaj ikony (✅, ❌, 💰, 📊, atď.)
- ✅ Handle edge cases (prázdne dáta, chyby)

### README Files

- ✅ Tabuľky pre prehľad scriptov
- ✅ Krok-za-krokom návody
- ✅ Troubleshooting sekcie
- ✅ Príklady použitia

---

## 📋 Log Capture Triggers (NEW)

### Purpose

Automaticky kopíruje Debug_Log a Error_Log do ASISTANTO Logs knižnice, čo umožňuje Claude Code čítať logy cez MCP tools bez manuálneho kopírovania.

### Pattern

**Typ:** Trigger
**Udalosť:** Aktualizácia záznamu
**Fáza:** Po uložení záznamu
**Script:** `afterSave-logCapture.js`

### Benefits

- ✅ Claude Code môže fetchovať logy cez MCP automaticky
- ✅ Žiadne manuálne copy-paste screenshots
- ✅ Centralizovaná log history v jednej knižnici
- ✅ Funguje na mobile (žiadne kopírovanie dlhých textov)
- ✅ Real-time debugging bez prerušenia workflow

### Structure

```javascript
// ==============================================
// {LIBRARY} - Automatické zachytávanie logov
// ==============================================
// Typ: Trigger
// Udalosť: Aktualizácia záznamu
// Fáza: Po uložení záznamu
// Verzia: 1.0.0
// ==============================================

// Check dependencies
if (typeof MementoLogCapture === 'undefined') {
    return; // Silently skip if module not loaded
}

// Get log content
var debugLog = entry().field("Debug_Log") || "";
var errorLog = entry().field("Error_Log") || "";

// Skip if no logs to capture
if (debugLog.trim().length === 0 && errorLog.trim().length === 0) {
    return;
}

// Create log entry in ASISTANTO Logs
var logEntry = MementoLogCapture.createLogEntry(
    lib().title,
    "Auto-capture (AfterSave)",
    "1.0.0"
);

// Copy logs
logEntry.set("Debug_Log", debugLog);
logEntry.set("Error_Log", errorLog);
logEntry.set("status", errorLog ? "❌ Error" : "✅ Success");
```

### Implemented In

- ✅ **Dochádzka** - `libraries/dochadzka/triggers/afterSave-logCapture.js`
- ✅ **Záznam prác** - `libraries/zaznam-prac/triggers/afterSave-logCapture.js`
- ✅ **Kniha jázd** - `libraries/kniha-jazd/triggers/afterSave-logCapture.js`
- ✅ **Cenové ponuky** - `libraries/cenove-ponuky/triggers/afterSave-logCapture.js`
- ✅ **Zákazky** - `libraries/zakazky/triggers/afterSave-logCapture.js`

### How to Add to New Library

1. **Create trigger directory** (if doesn't exist):
   ```bash
   mkdir -p libraries/{library}/triggers
   ```

2. **Copy template** from existing implementation:
   ```bash
   cp libraries/dochadzka/triggers/afterSave-logCapture.js \
      libraries/{library}/triggers/afterSave-logCapture.js
   ```

3. **Update library name** in header comment

4. **Enable in Memento Database:**
   - Go to library → Nastavenia → Skripty → Triggery
   - Create trigger: Aktualizácia záznamu → Po uložení záznamu
   - Copy script content
   - Save and enable

### Requirements

- **MementoLogCapture.js** - Core module must be loaded globally
- **MementoConfig.js** - Configuration module (for field names)
- **ASISTANTO Logs** - Library must exist in Memento Database

### MCP Query Example

Claude Code can fetch logs using:

```json
{
  "library": "ASISTANTO Logs",
  "fields": ["date", "library", "script", "Error_Log"],
  "filter": {"library": {"eq": "Dochádzka"}},
  "sort": [{"field": "date", "order": "desc"}],
  "limit": 5
}
```

### Documentation

See complete documentation:
- **Implementation Guide:** `docs/LOG_CAPTURE_PATTERN.md`
- **MCP Query Templates:** `utils/mcp-helpers/query-logs.md`
- **Module Source:** `core/MementoLogCapture.js`

---

## 🔧 Template Generator (budúcnosť)

Plánovaný helper script pre generovanie štruktúry:

```bash
# Vytvorí triggers/, actions/, README súbory
./scripts/create-library-structure.sh {library-name}
```

---

## 📊 Štatistiky

Po úplnej implementácii:

| Metrika | Cieľ |
|---------|------|
| Knižnice s novou štruktúrou | 27/27 |
| Priemerný počet riadkov trigger scriptu | < 15 |
| Priemerný počet riadkov action scriptu | < 25 |
| README coverage | 100% |

---

## 🎓 Vzorová implementácia

**Pozri:** `libraries/dochadzka/`

Obsahuje:
- ✅ Plnú triggers/ štruktúru (3 scripty)
- ✅ Plnú actions/ štruktúru (4 scripty)
- ✅ Kompletné README súbory
- ✅ Všetky štandardné hlavičky
- ✅ Legacy scripty pre git history

**Použij ako referenčný príklad pre ostatné knižnice!**

---

## 📝 Version History

| Verzia | Dátum | Zmeny |
|--------|-------|-------|
| 1.1.0 | 2026-03-19 | Added Log Capture Triggers section |
| 1.0.0 | 2026-03-19 | Initial standard definition |

---

## 📚 Related Documentation

- `MEMENTO_NAMING_CONVENTION.md` - Naming rules
- `MEMENTO_PROJECT_STRUCTURE.md` - Project organization
- `CORE_MODULES_DOCUMENTATION.md` - Module API
- `LOG_CAPTURE_PATTERN.md` - Log capture implementation guide
- `utils/mcp-helpers/query-logs.md` - MCP query templates
- `libraries/dochadzka/README.md` - Reference implementation
