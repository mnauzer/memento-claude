# Design: Generic Telegram Signing Protocol (v2)

**Dátum:** 2026-03-22
**Stav:** Schválený, pripravený na implementáciu
**Problém:** Každá nová knižnica vyžaduje zmeny v N8N flow aj v Memento module
**Riešenie:** Podpis záznam nesie všetky metadata → N8N flow je generický

---

## Kontext

Súčasný stav (`build_flows_v54.py`, Confirm Handler v5.4):

N8N `Confirm Handler` má hardcoded `libMap`:
```javascript
const libMap = {
  'D': { libId: 'zNoMvrv8U', sourceFieldId: 96,  podpisFieldId: 95  },
  'P': { libId: 'g9eS5Ny2E', sourceFieldId: 133, podpisFieldId: 131 }
};
```

Callback data formát: `sign_{sourceId}_{libCode}_{action}`
→ N8N potrebuje vedieť čo znamená 'D' a 'P' → hardcoded

---

## Cieľová Architektúra

### Princíp

**Podpis záznam = single source of truth pre N8N.**
Všetky metadata potrebné pre spätný zápis sú uložené v Podpis zázname.
N8N flow je generický — neobsahuje žiadne informácie o konkrétnych knižniciach.

### Nový callback_data formát

```
sign_{podpisId}_{action}
```
Jednoduchší — žiadny `libCode`, N8N vyhľadá Podpis podľa `podpisId`.

---

## Krok 1: Podpisy — Nové polia (manuálne v Memento UI)

Pridať 4 nové text polia do knižnice `podpisy` (ID: `2fNM2Za4G`):

| Pole | Typ | Príklad | Popis |
|------|-----|---------|-------|
| `Zdrojová lib ID` | text | `g9eS5Ny2E` | Memento library ID zdrojovej knižnice |
| `Zdrojový field ID` | text | `133` | Field ID stavu na zdrojovom zázname |
| `Stav: Potvrdené` | text | `Hotovo` | Hodnota pri potvrdení |
| `Stav: Odmietnuté` | text | `Odmietnutá ` | Hodnota pri odmietnutí |

Existujúce polia (zachovajú sa):
- id:3 Dátum odoslania, id:7 Dátum potvrdenia
- id:4 Stav (Čaká/Potvrdil/Odmietol/Zrušené)
- id:2 Zamestnanec, id:6 Zdroj ID, id:8 TG Správa ID, id:9 TG Chat ID
- id:10 Poznámka, id:11 Knižnica (choice — zostane pre human-readable info)

---

## Krok 2: `core/MementoSign.js` — Generický modul

```javascript
var MementoSign = (function() {
    'use strict';

    return {
        version: "1.0.0",

        // signConfig: {
        //   libId: 'g9eS5Ny2E',          // ID zdrojovej knižnice
        //   sourceFieldId: 133,           // field ID stavu na zdrojovom zázname
        //   stavPotvrdene: 'Hotovo',      // hodnota pri potvrdení
        //   stavOdmietnutie: 'Odmietnutá ', // hodnota pri odmietnutí
        //   kniznicaLabel: 'Pokladňa ',   // label pre Knižnica choice field
        //   buildMessage: function(entry) { return 'text správy'; }
        // }
        requestSign: function(entry, signConfig, utils) {
            // 1. Získaj Zamestnanca a chatId
            // 2. Vytvor Podpis záznam s metadata poliami
            // 3. Pošli N8N webhook (podpisId + chatId + message)
            // 4. Aktualizuj Stav podpisu na zdrojovom zázname
            return { success: true };
        }
    };
})();
```

**Použitie v Pokladna.js:**
```javascript
MementoSign.requestSign(entry, {
    libId: 'g9eS5Ny2E',
    sourceFieldId: 133,
    stavPotvrdene: 'Hotovo',
    stavOdmietnutie: 'Odmietnutá ',
    kniznicaLabel: 'Pokladňa ',
    buildMessage: function(e) {
        return '💸 Platba ' + e.field('Suma') + ' €\n...'
    }
}, utils);
```

**Použitie v Dochadzka.js (keď príde rad):**
```javascript
MementoSign.requestSign(entry, {
    libId: 'zNoMvrv8U',
    sourceFieldId: 96,
    stavPotvrdene: 'Hotovo',
    stavOdmietnutie: 'Odmietnutá ',
    kniznicaLabel: 'Dochádzka ',
    buildMessage: function(e) { return '⏰ Dochádzka ...' }
}, utils);
```

---

## Krok 3: N8N Confirm Handler v5.5

### Zmeny v `parse_cb_code`

**Pred:**
```javascript
// Format: "sign_{sourceId}_{libCode}_{action}"
const libMap = { 'D': {...}, 'P': {...} };
```

**Po:**
```javascript
// Format: "sign_{podpisId}_{action}"
const podpisId = withoutAction;   // všetko medzi "sign_" a posledným "_"
const action = ...;
// žiadny libMap!
```

### Nový node: `GET Podpis Record`

Po `Is Sign Callback?` → GET Podpis záznamu:
```
GET https://api.mementodatabase.com/v1/libraries/2fNM2Za4G/entries/{podpisId}
```
Extrahuj metadata polia → `sourceLibId`, `sourceEntryId`, `sourceFieldId`, `stavValue`

### PATCH Source (generický)

```javascript
PATCH /libraries/{sourceLibId}/entries/{sourceEntryId}
Body: { fields: [{ id: parseInt(sourceFieldId), value: stavValue }] }
```

Žiadne `libMap`, žiadne hardcoded library/field IDs.

---

## Krok 4: Refaktor Pokladna.js

`requestSign()` v Pokladna.js → deleguje na `MementoSign.requestSign()`.
Zostane len `buildMessage()` funkcia špecifická pre Pokladňu.

---

## Poradie Implementácie

| # | Krok | Kde | Poznámka |
|---|------|-----|----------|
| 1 | Pridaj 4 polia do Podpisy | Memento UI | **Manuálne!** Musí byť prvé |
| 2 | Vytvor `core/MementoSign.js` | Git | Nový modul |
| 3 | Napíš `build_flows_v55.py` | C:/Temp | Nový confirm handler |
| 4 | Uprav `modules/Pokladna.js` | Git | Deleguj na MementoSign |
| 5 | Test end-to-end | Memento+Telegram | Rasťo podpisuje platbu |

---

## Výhody

- ✅ Nová knižnica = 0 zmien v N8N flow
- ✅ Nová knižnica = 1 konfig objekt v module
- ✅ Podpis záznam je self-contained (audit trail)
- ✅ N8N flow je čistý a pochopiteľný
- ✅ Jeden modul pre signing logiku (`MementoSign.js`)
