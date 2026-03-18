# Memento Scripts - PostgreSQL Sync

Tento adresár obsahuje JavaScript scripty pre použitie priamo v Memento Database aplikácii.

## ⚠️ DÔLEŽITÉ: Library ID Problém

Memento Database má **dva rôzne formáty ID**:

1. **Internal ID** - vracia `lib().id` v JavaScripte
   - Formát: Base64-encoded string (napr. `RUlMLWNQZTU3Y2JaO2Q6REs0dkM`)
   - Dekóduje sa na: `EIL-cPe57cbZ;d:DK4vC`
   - Používa sa interne v Memento

2. **Public API ID** - používa sa v REST API volaniach
   - Formát: Krátky alfanumerický (napr. `qU4Br5hU6`)
   - Toto očakáva naša sync API
   - Nájdeš v Memento API dokumentácii

**Riešenie:** Každý bulk sync script má hardcoded správne public API library ID v CONFIG sekcii.

### Library IDs

| Knižnica | Public API ID | Script |
|----------|--------------|--------|
| Dochádzka | `qU4Br5hU6` | `Dochadzka.BulkAction.SyncToPostgreSQL.js` ✅ |
| Denný report | `Tt4pxN4xQ` | TODO |
| Záznam prác | `ArdaPo5TU` | TODO |
| Zamestnanci | `nWb00Nogf` | TODO |
| Cenové ponuky | `90RmdjWuk` | TODO |
| Zákazky | `CfRHN7QTG` | TODO |

## Scripty

### ✅ PRODUCTION - Dochadzka.BulkAction.SyncToPostgreSQL.js

**Typ:** Bulk Action (hromadná akcia)

**Účel:** Sync všetkých záznamov z Dochádzka knižnice do PostgreSQL.

**Výhody:**
- ✅ Správne Library ID (`qU4Br5hU6`)
- ✅ Bezpečný prístup k poliam (try/catch)
- ✅ Funguje bez Status field requirement
- ✅ Verzia 2.3 - stabilná

**Použitie:**

1. Otvor knižnicu **Dochádzka** v Memento Database
2. Menu → Scripts → Bulk Actions → **+**
3. Name: `Sync to PostgreSQL`
4. Skopíruj celý kód z `Dochadzka.BulkAction.SyncToPostgreSQL.js`
5. Ulož
6. Spusti: Menu → Bulk Actions → `Sync to PostgreSQL`

**Pre ostatné knižnice:** Skopíruj tento script a zmeň len:
- Line 26: `libraryId: 'YOUR_PUBLIC_API_ID'` (z tabuľky vyššie)
- Line 27: `libraryName: 'Tvoja Knižnica'`

---

### 🔍 DIAGNOSTIC - CHECK-LibraryID.js

**Typ:** Debug script

**Účel:** Zistí Library ID a meno knižnice.

**Použitie:**
1. Otvor knižnicu v Memento
2. Pridaj ako Button action alebo Calculation script
3. Spusti → pozri Script Log a Debug_Log field

**Output:**
```
Library Name: Dochádzka
Library ID: RUlMLWNQZTU3Y2JaO2Q6REs0dkM  ← Internal ID (nepoužívať!)
ID Length: 27
```

**Poznámka:** `lib().id` vracia **internal ID**, nie public API ID! Nepoužívaj ho pre sync API.

---

### 🧪 TEST - TEST-SingleEntry.js

**Typ:** Test script

**Účel:** Test sync jedného záznamu (minimálny test).

**Použitie:**
1. Otvor záznam v Memento
2. Pridaj ako Entry action
3. Spusti → skontroluj výsledok

**Output:**
- HTTP 200/201 → ✅ SUCCESS
- HTTP 403 → ❌ Zlý API key
- HTTP 404 → ❌ Zlé Library ID

---

### 📦 LEGACY - Memento.BulkAction.SyncAllToPostgreSQL.js

**Typ:** Bulk Action (hromadná akcia) - DEPRECATED

**Účel:** Hromadný sync všetkých vybraných záznamov z Memento do PostgreSQL.

**Použitie:**

1. **Otvor knižnicu** v Memento Database app
2. **Vytvor novú akciu:**
   - Menu → Bulk Actions → **+**
   - Name: `Sync All to PostgreSQL`
   - Type: `Run Script`
3. **Skopíruj celý kód** z `Memento.BulkAction.SyncAllToPostgreSQL.js`
4. **Uprav konfiguráciu** (začiatok scriptu):
   ```javascript
   var CONFIG = {
       apiUrl: 'http://192.168.5.241:8889',  // Tvoja Sync API URL
       apiKey: '...',                        // Tvoj API key z .env
       batchDelay: 100,
       showProgress: true,
       continueOnError: true
   };
   ```
5. **Ulož script**

**Spustenie:**

1. V knižnici vyber záznamy (alebo Select All pre všetky)
2. Menu → Bulk Actions → `Sync All to PostgreSQL`
3. Potvrď dialog
4. Sleduj progress

**Output:**

```
═══════════════════════════════
✅ BULK SYNC DOKONČENÝ
═══════════════════════════════

📊 ŠTATISTIKA:
  Celkom:     156
  Úspešných:  156 ✅
  Zlyhalo:    0 ❌
  Trvanie:    2.3 min

📚 Knižnica:  Záznam prác
🆔 Library ID: ArdaPo5TU

═══════════════════════════════

🎉 Všetky záznamy úspešne syncované!
```

---

## Konfigurácia

### API Key

Aktuálny API key (z reddwarf servera):

```javascript
apiKey: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
```

**Overenie API key:**

```bash
ssh rasto@reddwarf
grep SYNC_API_KEY /opt/memento-sync/sync-api/.env
```

### API URL

- **Lokálna sieť:** `http://192.168.5.241:8889`
- **Localhost** (ak beží na tom istom stroji): `http://localhost:8889`

---

## Výhody Memento Scriptov vs Python Script

### ✅ Memento JavaScript (Odporúčané)

- **Žiadne rate limity** - interný prístup k dátam
- **Rýchlejšie** - priamy prístup bez API overhead
- **Jednoduchšie** - spustíš tlačidlom v app
- **Vizuálny feedback** - progress dialógy v app
- **Portable** - funguje na mobile aj desktop

### ⚠️ Python Script (Alternatíva)

- Musí volať Memento API (rate limit 10/min)
- Pomalšie (6 sekúnd medzi requestmi)
- Beží na serveri
- Pre automatizáciu (cron jobs)

**Záver:** Pre bulk sync používaj Memento scripty! Python script len pre automatizáciu.

---

## Postup Pre Migráciu Dát

### Krok 1: Začni s Jednou Knižnicou

Odporúčam začať s malou knižnicou (napr. Zamestnanci):

1. Otvor knižnicu "Zamestnanci"
2. Nainštaluj bulk action script
3. Select All
4. Spusti Sync All to PostgreSQL
5. Overiť v PostgreSQL:
   ```sql
   SELECT COUNT(*) FROM memento_employees;
   ```

### Krok 2: Overiť Dáta

```bash
ssh rasto@reddwarf
psql -h localhost -U smarthome -d memento_mirror

-- Pozri syncnuté záznamy
SELECT * FROM memento_employees LIMIT 10;

-- Skontroluj sync log
SELECT * FROM memento_sync_log
WHERE library_name = 'Zamestnanci'
ORDER BY sync_time DESC
LIMIT 20;
```

### Krok 3: Postupne Všetky Knižnice

Potom postupne pre každú knižnicu:

1. Záznam prác (Work Records)
2. Dochádzka (Attendance)
3. Denný report (Daily Report)
4. Zákazky (Orders)
5. ... atď.

**Odhadovaný čas:** 5-10 minút na knižnicu (závisí od počtu záznamov)

---

## Troubleshooting

### ❌ Script Error: "http is not defined"

Použite `$http` namiesto `http`:

```javascript
var response = $http.post({...});
```

### ❌ Connection Failed

Skontroluj:
1. Je Sync API running? `sudo systemctl status memento-sync-api`
2. Je API dostupná z tvojho zariadenia? Otvor v prehliadači: `http://192.168.5.241:8889/api/memento/health`
3. Správny API key?

### ❌ Some Entries Failed

Pozri API logy:

```bash
ssh rasto@reddwarf
sudo journalctl -u memento-sync-api -n 100 | grep ERROR
```

Skontroluj sync_log pre detaily:

```sql
SELECT entry_id, error_message
FROM memento_sync_log
WHERE success = false
ORDER BY sync_time DESC;
```

---

## Budúce Scripty

V tomto adresári budú aj:

- `Memento.Trigger.SyncToPostgreSQL.js` - AfterSave trigger pre real-time sync
- `Memento.Action.VerifySync.js` - Overiť či je entry syncnutý
- `Memento.Action.ForceSyncEntry.js` - Manuálny sync jedného záznamu
- `Memento.Action.SyncStats.js` - Zobraziť štatistiky syncu

---

## Poznámky

- **API Key je citlivý údaj** - nezdieľaj scripty s API keyom verejne
- **Backup** - pred prvým bulk syncom urob backup PostgreSQL DB
- **Testing** - najprv otestuj na malej knižnici
- **Monitoring** - sleduj logy počas prvých syncov

---

**Happy syncing! 🚀**
