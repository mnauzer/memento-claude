# Migration Guide: Standalone Scripts → MementoSync Knižnica

## 🎯 Prečo migrovať?

### Pred (Standalone):
```javascript
// 300+ riadkov kódu v každom Bulk Action scripte
(function() {
    'use strict';
    var SCRIPT_VERSION = '4.3';
    var CONFIG = {...};
    // ... 250+ riadkov ...
})();
```

### Po (Knižnica):
```javascript
// 1 riadok kódu
SyncToPostgreSQL(entries);
```

**Výhody:**
- ✅ Jednoduchosť - 99% menej kódu
- ✅ Univerzálnosť - funguje všade (bulk, trigger, button)
- ✅ Údržba - jedna knižnica namiesto N scriptov
- ✅ Flexibilita - vlastná konfigurácia per-call

---

## 📋 Migration checklist

- [ ] 1. Nahraj MementoSync1.js knižnicu
- [ ] 2. Testuj na jednej knižnici
- [ ] 3. Nahraď všetky Bulk Action scripty
- [ ] 4. Nastav After Delete triggers
- [ ] 5. (Voliteľne) Nastav After Save triggers
- [ ] 6. Vymaž staré standalone scripty

---

## 🔄 Krok za krokom

### Krok 1: Nahraj knižnicu

1. Settings → Scripts
2. Add Library → "MementoSync"
3. Skopíruj `core/MementoSync1.js`
4. Ulož

### Krok 2: Testuj na Partneri knižnici

**Pôvodný Bulk Action script:**
```javascript
// Starý Universal.BulkAction.SyncToPostgreSQL.js (300+ riadkov)
(function() {
    'use strict';
    var SCRIPT_VERSION = '4.3';
    // ... veľa kódu ...
})();
```

**Nový Bulk Action script:**
```javascript
// Nový - len 1 riadok!
SyncToPostgreSQL(entries);
```

**Test:**
1. Vyber 2-3 záznamy v Partneri
2. Spusti Bulk Action s novým scriptom
3. Skontroluj, či sa syncli do PostgreSQL
4. Skontroluj progress messages

### Krok 3: Nahraď všetky Bulk Actions

Pre každú knižnicu (Zamestnanci, Klienti, Dodávatelia...):

**Nahraď:**
```javascript
// STARÝ SCRIPT (zmaž)
(function() {
    'use strict';
    var SCRIPT_VERSION = '4.3';
    var CONFIG = {
        apiUrl: 'http://192.168.5.241:8889',
        // ... 250+ riadkov ...
    };
})();
```

**Za:**
```javascript
// NOVÝ SCRIPT
SyncToPostgreSQL(entries);
```

### Krok 4: Nastav After Delete triggers

Pre každú knižnicu:

1. Settings → Triggers → Add Trigger
2. Trigger Type: **After Delete**
3. Script:
   ```javascript
   DeleteFromPostgreSQL(entry());
   ```
4. Save

**Zoznam knižníc pre trigger:**
- [ ] Zamestnanci
- [ ] Klienti
- [ ] Partneri
- [ ] Dodávatelia
- [ ] (ďalšie podľa potreby...)

### Krok 5 (Voliteľné): After Save triggers

Ak chceš **automatický sync pri každom uložení**:

1. Settings → Triggers → Add Trigger
2. Trigger Type: **After Save**
3. Script:
   ```javascript
   SyncToPostgreSQL(entry(), {
       showProgress: false
   });
   ```
4. Save

**Poznámka:** Pre veľké knižnice môže spomaľovať ukladanie.

### Krok 6: Cleanup

Po úspešnej migrácii:
1. Vymaž staré standalone scripty z repozitára
2. Označ ich ako deprecated v dokumentácii
3. Zachovaj pre historical reference (optional)

---

## 📊 Mapping: Starý → Nový

| Starý script | Nová funkcia | Použitie |
|--------------|--------------|----------|
| `Universal.BulkAction.SyncToPostgreSQL.js` | `SyncToPostgreSQL(entries)` | Bulk Action |
| `Universal.BulkAction.SyncTrashToPostgreSQL.js` | `SyncTrashToPostgreSQL(entries)` | Bulk Action na trash |
| `Universal.Trigger.DeleteToPostgreSQL.js` | `DeleteFromPostgreSQL(entry())` | After Delete trigger |

---

## 🎯 Príklady migrácie

### Príklad 1: Bulk Action - Partneri

**PRED:**
```javascript
/**
 * Universal Bulk Action - Sync to PostgreSQL
 * Version: 4.3
 */
(function() {
    'use strict';

    var SCRIPT_VERSION = '4.3';

    var CONFIG = {
        apiUrl: 'http://192.168.5.241:8889',
        apiKey: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
        timeout: 10000
    };

    var currentLibrary = lib();
    CONFIG.libraryId = currentLibrary.id;
    CONFIG.libraryName = currentLibrary.name;

    // ... 250+ riadkov kódu ...

    for (var i = 0; i < totalEntries; i++) {
        var e = allEntries[i];
        // sync logic...
    }

    message('✅ Hotovo!');
})();
```

**PO:**
```javascript
SyncToPostgreSQL(entries);
```

---

### Príklad 2: After Delete Trigger

**PRED:**
```javascript
/**
 * Delete Trigger - v1.0
 */
(function() {
    'use strict';

    var CONFIG = {
        apiUrl: 'http://192.168.5.241:8889',
        apiKey: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
    };

    var currentEntry = entry();
    var entryId = currentEntry.id;

    // ... 100+ riadkov ...

    var httpClient = http();
    var result = httpClient.delete({...});

    message('✅ Vymazané');
})();
```

**PO:**
```javascript
DeleteFromPostgreSQL(entry());
```

---

### Príklad 3: Custom konfigurácia

Ak máš vlastný API URL alebo kľúč v standalone scripte:

**PRED:**
```javascript
var CONFIG = {
    apiUrl: 'http://custom-server:9999',
    apiKey: 'my-custom-key-123'
};
```

**PO (Option 1 - Globálne v knižnici):**
Uprav `DEFAULT_CONFIG` v `MementoSync1.js`:
```javascript
var DEFAULT_CONFIG = {
    apiUrl: 'http://custom-server:9999',
    apiKey: 'my-custom-key-123',
    ...
};
```

**PO (Option 2 - Lokálne pri volaní):**
```javascript
SyncToPostgreSQL(entries, {
    apiUrl: 'http://custom-server:9999',
    apiKey: 'my-custom-key-123'
});
```

---

## ⚠️ Známe rozdiely

### 1. Progress messages

**Starý script:**
```
🚀 Syncujem 10 aktívnych záznamov (v4.3)
   ⚠️ 4 záznamov v koši sa NEsyncuje
🔄 1/10 - ✅ 1 ❌ 0
...
```

**Nový script:**
```
🚀 Syncujem 10 záznamov...
🔄 1/10 - ✅ 1 ❌ 0
...
✅ Hotovo!
   Syncnutých: 10/10
   Zlyhalo: 0
   Čas: 2.3s
```

**Rozdiel:** Nový script neukazuje trash count (jednoduchší output).

### 2. Return value

**Starý script:**
- Len message() output
- Žiadny return value

**Nový script:**
```javascript
var result = SyncToPostgreSQL(entries);
// result = { total: 10, success: 10, failed: 0, errors: [] }
```

**Výhoda:** Môžeš programovo spracovať výsledok.

### 3. Error handling

**Starý script:**
- Chyby len v logs
- Message s count

**Nový script:**
```javascript
var result = SyncToPostgreSQL(entries);

if (result.failed > 0) {
    // Detailné chyby v result.errors
    for (var i = 0; i < result.errors.length; i++) {
        log('Error: ' + result.errors[i].error);
    }
}
```

---

## ✅ Verifikácia po migrácii

### Checklist:

1. **Bulk Actions fungujú:**
   - [ ] Partneri - SyncToPostgreSQL(entries)
   - [ ] Klienti - SyncToPostgreSQL(entries)
   - [ ] Zamestnanci - SyncToPostgreSQL(entries)
   - [ ] Dodávatelia - SyncToPostgreSQL(entries)

2. **Trash sync funguje:**
   - [ ] SyncTrashToPostgreSQL(entries) na trash entries

3. **Delete triggers fungujú:**
   - [ ] Vymazanie z koša → záznam zmizne z PostgreSQL

4. **Konfigurácia je správna:**
   - [ ] API URL je správne
   - [ ] API kľúč je správny
   - [ ] Timeout je OK

### Test scenár:

1. **Vytvor nový záznam** v Partneri → Spusti sync → Skontroluj PostgreSQL
2. **Uprav záznam** → Spusti sync → Skontroluj UPDATE
3. **Presuň do koša** → SyncTrashToPostgreSQL → Skontroluj status='deleted'
4. **Vymaž z koša** → After Delete trigger → Skontroluj že zmizol z PG

---

## 🆘 Rollback plán

Ak niečo nefunguje:

1. **Zachovaj staré scripty** - nekopíruj ich hneď
2. **Vráť sa na starý script** - zmeň Bulk Action späť
3. **Reportuj problém** - GitHub issue s detailmi
4. **Temporary fix** - používaj staré scripty zatiaľ čo sa rieši

**Staré scripty ostávajú v repozitári pre rollback:**
- `Universal.BulkAction.SyncToPostgreSQL.js` (v4.3)
- `Universal.BulkAction.SyncTrashToPostgreSQL.js` (v1.0)
- `Universal.Trigger.DeleteToPostgreSQL.js` (v1.0)

---

## 📞 Podpora

**Problémy s migráciou?**
1. Skontroluj EXAMPLES_USAGE.md pre príklady
2. Skontroluj README_MEMENTO_SYNC.md pre API docs
3. Vytvor GitHub issue s detailmi

---

## 🎉 Výsledok

**Pred migráciou:**
- 4 knižnice × 300 riadkov = 1200 riadkov kódu
- Údržba 4 samostatných scriptov
- Len Bulk Actions

**Po migrácii:**
- 1 knižnica = 600 riadkov (zdieľané)
- 4× `SyncToPostgreSQL(entries)` = 4 riadky kódu
- Funguje v Bulk Actions, Triggers, Buttons

**Saving:** 99.7% menej kódu! 🎉
