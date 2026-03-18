# MementoSync - Knižnica pre PostgreSQL synchronizáciu

## 🎯 Prehľad

**MementoSync** je knižnica funkcií pre jednoduchú synchronizáciu medzi Memento Database a PostgreSQL.

**Výhody:**
- ✅ Jednoduchosť - jeden riadok kódu
- ✅ Univerzálnosť - funguje v bulk actions, triggers, buttons
- ✅ Flexibilita - vlastná konfigurácia
- ✅ Automatizácia - trigger-based sync

---

## 📦 Inštalácia

### 1. Nahraj knižnicu do Memento

1. Otvor Memento Database
2. Choď do **Settings → Scripts**
3. Klikni **+ Add Library**
4. Názov: `MementoSync`
5. Skopíruj obsah súboru: `core/MementoSync1.js`
6. Ulož

**Hotovo!** Knižnica je teraz dostupná vo všetkých knižniciach.

---

## 🚀 Rýchly štart

### Bulk Action - Sync aktívnych záznamov

**Použitie v Memento:**
```javascript
// Pole "Script" v Bulk Action:
SyncToPostgreSQL(entries);
```

**To je všetko!** 🎉

---

## 📚 API - Hlavné funkcie

### 1. `SyncToPostgreSQL(entries, options)`

Syncuje **aktívne záznamy** do PostgreSQL.

**Parametre:**
- `entries` - Entry alebo array of entries
- `options` - (voliteľné) Konfigurácia

**Return:**
```javascript
{
    total: 10,     // Celkový počet
    success: 9,    // Úspešne syncnuté
    failed: 1,     // Zlyhané
    errors: [...]  // Detaily chýb
}
```

**Príklady:**
```javascript
// Bulk Action
SyncToPostgreSQL(entries);

// Trigger
SyncToPostgreSQL(entry());

// Button
SyncToPostgreSQL([entry()]);

// Custom config
SyncToPostgreSQL(entries, {
    apiUrl: 'http://custom:8889',
    showProgress: false
});
```

---

### 2. `SyncTrashToPostgreSQL(entries, options)`

Syncuje **záznamy z koša** a označí ich ako `deleted` v PostgreSQL.

**Príklad:**
```javascript
// Bulk Action na trash entries
SyncTrashToPostgreSQL(entries);
```

**Použitie:**
- Spusti na záznamoch v koši
- Záznamy ostanú v PostgreSQL (soft delete)
- Status sa zmení na `deleted`

---

### 3. `DeleteFromPostgreSQL(entry, options)`

**Permanentne vymaže** záznam z PostgreSQL.

**Príklad:**
```javascript
// After Delete trigger
DeleteFromPostgreSQL(entry());
```

**Použitie:**
- Nastav ako After Delete trigger
- Automaticky vymaže pri vymazaní z koša
- Hard delete - záznam sa fyzicky vymaže

---

## ⚙️ Konfigurácia

### Default nastavenia:

```javascript
{
    apiUrl: 'http://192.168.5.241:8889',
    apiKey: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    timeout: 10000,
    showProgress: true,
    progressInterval: 10
}
```

### Zmena nastavení:

**Spôsob 1: V knižnici (globálne)**
Uprav `DEFAULT_CONFIG` v `MementoSync1.js`:
```javascript
var DEFAULT_CONFIG = {
    apiUrl: 'http://tvoj-server:8889',
    apiKey: 'tvoj-api-key',
    ...
};
```

**Spôsob 2: Pri volaní (lokálne)**
```javascript
SyncToPostgreSQL(entries, {
    apiUrl: 'http://custom:8889',
    apiKey: 'custom-key',
    showProgress: false,
    progressInterval: 50
});
```

---

## 📋 Podporované knižnice

Automaticky detekované:

| Memento Knižnica | PostgreSQL Tabuľka |
|------------------|-------------------|
| Zamestnanci | `memento_employees` |
| Klienti | `memento_clients` |
| Partneri | `memento_partners` |
| Dodávatelia | `memento_suppliers` |
| Dochádzka | `memento_attendance` |
| Záznam prác | `memento_work_records` |
| Kniha jázd | `memento_ride_log` |
| Pokladňa | `memento_cash_book` |
| Zákazky | `memento_orders` |
| Cenové ponuky | `memento_quotes` |

**Pridanie novej knižnice:**
Uprav `TABLE_MAPPING` v `MementoSync1.js`:
```javascript
var TABLE_MAPPING = {
    'Tvoja Knižnica': 'memento_tvoja_tabulka',
    ...
};
```

---

## 🎯 Odporúčané použitie

### Setup (raz):

**1. Nahraj knižnicu MementoSync1.js**

**2. Nastav After Delete trigger v každej knižnici:**
```javascript
// Trigger Type: After Delete
DeleteFromPostgreSQL(entry());
```

### Bežné použitie:

**Vytvorenie/úprava záznamov:**

*Možnosť A - Manuálny sync:*
```javascript
// Bulk Action
SyncToPostgreSQL(entries);
```

*Možnosť B - Automatický sync (voliteľné):*
```javascript
// After Save trigger
SyncToPostgreSQL(entry(), {
    showProgress: false
});
```

**Presun do koša:**
```javascript
// Bulk Action na trash entries
SyncTrashToPostgreSQL(entries);
```

**Permanentné vymazanie:**
```
Automaticky cez After Delete trigger
```

---

## 🔄 Workflow diagram

```
┌─────────────────┐
│ Nový záznam     │
│ v Memento       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│ After Save      │      │ Bulk Action      │
│ (automaticky)   │ ALEBO│ (manuálne)       │
└────────┬────────┘      └─────────┬────────┘
         │                         │
         └──────────┬──────────────┘
                    │
                    ▼
         SyncToPostgreSQL(entry)
                    │
                    ▼
         ┌──────────────────┐
         │ PostgreSQL       │
         │ status='active'  │
         └──────────────────┘
                    │
         ┌──────────┴───────────┐
         │                      │
         ▼                      ▼
  ┌─────────────┐      ┌──────────────┐
  │ Do koša     │      │ Ostáva       │
  │ v Memento   │      │ aktívny      │
  └──────┬──────┘      └──────────────┘
         │
         ▼
  SyncTrashToPostgreSQL(entries)
         │
         ▼
  ┌──────────────────┐
  │ PostgreSQL       │
  │ status='deleted' │
  └─────────┬────────┘
            │
            ▼
  ┌──────────────────┐
  │ Vymazať z koša   │
  │ v Memento        │
  └─────────┬────────┘
            │
            ▼
  After Delete trigger
  DeleteFromPostgreSQL(entry)
            │
            ▼
  ┌──────────────────┐
  │ VYMAZANÉ         │
  │ z PostgreSQL     │
  └──────────────────┘
```

---

## 📖 Dokumentácia

- **EXAMPLES_USAGE.md** - 10+ príkladov použitia
- **MementoSync1.js** - Zdrojový kód s inline komentármi
- **README_SYNC_SCRIPTS.md** - Pôvodné standalone skripty (deprecated)

---

## 🆚 Porovnanie: Knižnica vs Standalone skripty

| Vlastnosť | MementoSync knižnica | Standalone skripty |
|-----------|---------------------|-------------------|
| **Jednoduchosť** | ✅ Jeden riadok kódu | ❌ 300+ riadkov kódu |
| **Univerzálnosť** | ✅ Bulk/Trigger/Button | ⚠️ Len Bulk Action |
| **Údržba** | ✅ Jedna knižnica | ❌ Samostatný script v každej knižnici |
| **Konfigurácia** | ✅ Centrálna | ❌ V každom scripte |
| **Error handling** | ✅ Return value | ⚠️ Message only |

**Odporúčanie:** Používaj **MementoSync knižnicu** pre nové projekty.

---

## 🐛 Troubleshooting

**Problem:** "Unknown library: XYZ"
```
Riešenie: Pridaj mapping do TABLE_MAPPING v knižnici
```

**Problem:** "API nedostupné"
```
Riešenie: Skontroluj apiUrl a apiKey v konfigurácii
```

**Problem:** Žiadny progress
```
Riešenie: Skontroluj showProgress option (default: true)
```

**Problem:** Syncujú sa záznamy z koša
```
Riešenie: lib().entries() vracia LEN aktívne záznamy.
         Pre trash použi lib().entries('trash')
```

---

## 📝 Verzia

**MementoSync v1.0** (2026-03-18)
- Initial release
- Support pre 10 knižníc
- 3 hlavné funkcie (sync, syncTrash, delete)

---

## 👨‍💻 Autor

Claude Code + rasto (2026)

---

## 📄 Licencia

MIT - použiteľné vo vlastných projektoch
