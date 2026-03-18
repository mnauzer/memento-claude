# MementoSync - Príklady použitia

## 📚 Príprava

**1. Nahraj knižnicu do Memento:**
- Choď do Settings → Scripts
- Vytvor novú knižnicu "MementoSync"
- Skopíruj obsah `MementoSync1.js`

**2. Konfigurácia (voliteľné):**
Ak chceš zmeniť API URL alebo kľúč, uprav DEFAULT_CONFIG v knižnici.

---

## 🚀 Príklady

### 1. Bulk Action - Sync všetkých aktívnych záznamov

**Script v Memento:**
```javascript
// Bulk Action v knižnici Partneri
SyncToPostgreSQL(entries);
```

**Čo sa stane:**
- Syncuje všetky vybrané záznamy
- Status: `active`
- Zobrazí progress každých 10 záznamov

---

### 2. Bulk Action - Sync koša

**Script v Memento:**
```javascript
// Bulk Action v knižnici Partneri - spustené na trash entries
SyncTrashToPostgreSQL(entries);
```

**Čo sa stane:**
- Syncuje záznamy z koša
- Status: `deleted`
- Záznamy ostávajú v PostgreSQL (soft delete)

---

### 3. After Save Trigger - Automatický sync pri uložení

**Script v Memento:**
```javascript
// Trigger: After Save v knižnici Partneri
SyncToPostgreSQL(entry());
```

**Čo sa stane:**
- Automaticky syncuje záznam pri každom uložení
- Funguje pre nové aj upravené záznamy

---

### 4. After Delete Trigger - Automatické vymazanie

**Script v Memento:**
```javascript
// Trigger: After Delete v knižnici Partneri
DeleteFromPostgreSQL(entry());
```

**Čo sa stane:**
- Permanentne vymaže záznam z PostgreSQL
- Spustí sa pri vymazaní z koša

---

### 5. Button Action - Sync jedného záznamu

**Script v Memento:**
```javascript
// Button v zázname
var result = SyncToPostgreSQL(entry());

if (result.success > 0) {
    message('✅ Záznam syncnutý!');
} else {
    message('❌ Chyba pri syncu!');
}
```

---

### 6. Custom konfigurácia

**Script v Memento:**
```javascript
// Bulk Action s vlastnou konfiguráciou
var result = SyncToPostgreSQL(entries, {
    apiUrl: 'http://custom-server:8889',
    apiKey: 'custom-key-123',
    showProgress: false,  // Skryť progress messages
    progressInterval: 50  // Ukázať progress každých 50 záznamov
});

message('Syncnutých: ' + result.success + '/' + result.total);
```

---

### 7. Podmienený sync - len aktívne záznamy

**Script v Memento:**
```javascript
// Bulk Action - sync len aktívnych partnerov
var activeEntries = [];

for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    var isActive = e.field('Aktívny');

    if (isActive) {
        activeEntries.push(e);
    }
}

if (activeEntries.length > 0) {
    SyncToPostgreSQL(activeEntries);
} else {
    message('⚠️ Žiadne aktívne záznamy');
}
```

---

### 8. Viacnásobné knižnice - batch sync

**Script v Memento:**
```javascript
// Standalone script - sync viacerých knižníc naraz

// Partneri
var partnersLib = library('Partneri');
var partners = partnersLib.entries();
message('📦 Syncujem Partneri...');
var result1 = SyncToPostgreSQL(partners);

// Klienti
var clientsLib = library('Klienti');
var clients = clientsLib.entries();
message('📦 Syncujem Klienti...');
var result2 = SyncToPostgreSQL(clients);

message('✅ Hotovo!\n' +
        'Partneri: ' + result1.success + '/' + result1.total + '\n' +
        'Klienti: ' + result2.success + '/' + result2.total);
```

---

### 9. Error handling - detailné chyby

**Script v Memento:**
```javascript
// Bulk Action s error handling
var result = SyncToPostgreSQL(entries, {
    showProgress: false
});

if (result.failed > 0) {
    var errorLog = '❌ Zlyhalo ' + result.failed + ' záznamov:\n\n';

    for (var i = 0; i < result.errors.length; i++) {
        var err = result.errors[i];
        errorLog += '• ' + err.entryId + ': ' + err.error + '\n';
    }

    message(errorLog);
} else {
    message('✅ Všetko OK! Syncnutých: ' + result.success);
}
```

---

### 10. Scheduled Script - pravidelný sync

**Script v Memento:**
```javascript
// Scheduled Script - spustí sa automaticky (napr. každých 30 minút)

var currentLib = lib();
var allEntries = currentLib.entries();

var result = SyncToPostgreSQL(allEntries, {
    showProgress: false
});

// Log do systémového logu
log('Scheduled sync: ' + result.success + '/' + result.total +
    ' (failed: ' + result.failed + ')');
```

---

## 🎯 Odporúčané nastavenia

### Pre veľké knižnice (>100 záznamov):
```javascript
SyncToPostgreSQL(entries, {
    progressInterval: 50  // Progress každých 50 záznamov
});
```

### Pre trigger scripts (bez UI):
```javascript
SyncToPostgreSQL(entry(), {
    showProgress: false  // Žiadne message() volania
});
```

### Pre debugging:
```javascript
var result = SyncToPostgreSQL(entries);

// Zobraz detailné info
log('Total: ' + result.total);
log('Success: ' + result.success);
log('Failed: ' + result.failed);
log('Errors: ' + JSON.stringify(result.errors));
```

---

## 📋 Kompletný workflow

### Setup (raz):

1. **Nahraj knižnicu MementoSync1.js**
2. **Nastav After Delete trigger:**
   ```javascript
   DeleteFromPostgreSQL(entry());
   ```

### Bežné použitie:

1. **Vytvorenie/úprava záznamov:**
   - Bulk Action: `SyncToPostgreSQL(entries)`
   - Alebo After Save trigger (automaticky)

2. **Presun do koša:**
   - Bulk Action na trash entries: `SyncTrashToPostgreSQL(entries)`

3. **Permanentné vymazanie:**
   - After Delete trigger (automaticky): `DeleteFromPostgreSQL(entry())`

---

## ❓ FAQ

**Q: Musím nahrať knižnicu do každej Memento knižnice?**
A: Nie, nahraj ju raz do Settings → Scripts. Bude dostupná vo všetkých knižniciach.

**Q: Čo ak chcem syncovať len niektoré záznamy?**
A: Vyber ich v UI a spusti Bulk Action, alebo použi filter v scripte (viď príklad 7).

**Q: Funguje to s linkToEntry poľami?**
A: Áno, automaticky spracováva single aj multiple linkToEntry polia.

**Q: Ako poznám, či sync fungoval?**
A: Skontroluj return value:
```javascript
var result = SyncToPostgreSQL(entries);
// result.success, result.failed, result.errors
```

**Q: Môžem zmeniť API URL?**
A: Áno, buď v DEFAULT_CONFIG v knižnici, alebo v options pri volaní.
