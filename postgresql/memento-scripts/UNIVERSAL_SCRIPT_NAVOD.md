# Univerzálny Sync Script v4.0 - Návod

## 🎯 Čo je nové?

**JEDEN script funguje pre VŠETKY knižnice!**

- ✅ Automaticky zistí názov knižnice (`lib().name`)
- ✅ Automaticky zistí ID knižnice (`lib().id`)
- ✅ Server automaticky vyberie správnu PostgreSQL tabuľku
- ✅ Funguje pre: Dochádzka, Zamestnanci, Záznam prác, Miesta, atď.

---

## 📋 Inštalácia

### 1. Skopíruj script do KAŽDEJ knižnice

**Súbor:** `Universal.BulkAction.SyncToPostgreSQL.js`

1. Otvor knižnicu v Memento (napr. Dochádzka)
2. Menu (⋮) → **Spravovať skripty**
3. **Nový Bulk Action**
4. Názov: `Sync All To PostgreSQL v4.0`
5. Vlož celý script
6. **Ulož**

### 2. Opakuj pre všetky knižnice

Skopíruj TEN ISTÝ script do:
- ✅ Dochádzka
- ✅ Zamestnanci
- ✅ Záznam prác
- ✅ Miesta
- ✅ Klienti
- ✅ Dodávatelia
- ✅ Partneri
- ✅ Pokladňa
- atď...

**Nepotrebuješ meniť kód!** Script sa automaticky prispôsobí každej knižnici.

---

## 🚀 Použitie

### Test (1 záznam)

1. Otvor knižnicu
2. Vyber **JEDEN** záznam
3. Menu (⋮) → **Bulk Actions** → **Sync All To PostgreSQL v4.0**
4. Počkaj na: "✅ 1/1"
5. Skontroluj Debug_Log

### Bulk Sync (všetky záznamy)

**⚠️ POZOR:** Script syncuje **VŠETKY** záznamy v knižnici, nie len vybrané!

1. Otvor knižnicu
2. **NIE JE potrebné vyberať záznamy** (ignorujú sa)
3. Menu (⋮) → **Bulk Actions** → **Sync All To PostgreSQL v4.0**
4. Progress: "🔄 50/1000 - ✅ 48 ❌ 2"
5. Koniec: "✅ 998/1000 (❌ 2 zlyhalo)"

---

## 🔍 Ako script funguje?

```javascript
// 1. Automaticky zistí knižnicu
var currentLibrary = lib();
var libraryName = currentLibrary.name;  // napr. "Dochádzka"
var libraryId = currentLibrary.id;      // internal ID

// 2. Syncuje VŠETKY záznamy
var allEntries = currentLibrary.entries();

// 3. Pošle na univerzálny endpoint
POST /api/memento/sync
{
    "library_name": "Dochádzka",
    "library_id": "...",
    "entry": { ... }
}

// 4. Server namapuje názov na tabuľku
"Dochádzka" → memento_attendance
"Zamestnanci" → memento_employees
atď.
```

---

## ✅ Podporované knižnice

Server automaticky rozpozná:

| Slovak Názov | PostgreSQL Tabuľka |
|--------------|-------------------|
| Dochádzka | memento_attendance |
| Zamestnanci | memento_employees |
| Záznam prác | memento_work_records |
| Kniha jázd | memento_ride_log |
| Miesta | memento_places |
| Klienti | memento_clients |
| Dodávatelia | memento_suppliers |
| Partneri | memento_partners |
| Pokladňa | memento_cash_book |
| Zákazky | memento_orders |
| Cenové ponuky | memento_quotes |
| Materiál | memento_materials |

**+ ďalších 20+ knižníc** (pozri `library_table_mapper.py`)

---

## 🆚 Rozdiel oproti starej verzii

### Stará verzia (v3.6)

```javascript
// ❌ Hardcoded library ID
libraryId: 'zNoMvrv8U',  // Dochádzka

// ❌ Rôzny script pre každú knižnicu
// - Dochadzka.BulkAction.SyncToPostgreSQL.js
// - Zamestnanci.BulkAction.SyncToPostgreSQL.js
// - ...
```

### Nová verzia (v4.0)

```javascript
// ✅ Automatická detekcia
var libraryName = lib().name;
var libraryId = lib().id;

// ✅ JEDEN script pre všetky knižnice
// - Universal.BulkAction.SyncToPostgreSQL.js (všade!)
```

---

## 🛠 Riešenie problémov

### Chyba: "Library 'XYZ' is not supported"

**Príčina:** Knižnica nie je v `library_table_mapper.py`

**Riešenie:**
1. Skontroluj presný názov knižnice: `lib().name`
2. Pridaj mapping do `library_table_mapper.py` na serveri
3. Reštartuj službu: `sudo systemctl restart memento-sync-api`

### Chyba: "❌ API nedostupné!"

**Riešenie:**
1. Skontroluj IP: `192.168.5.241:8889`
2. Test: `curl http://192.168.5.241:8889/api/memento/health`
3. Skontroluj službu: `sudo systemctl status memento-sync-api`

### Debug_Log príliš veľký

Script automaticky limituje na 50KB.

Ak crashuje app:
1. Spusti: `Dochadzka.BulkAction.ClearDebugLog.js`
2. Tento script vymaže všetky Debug_Log polia

---

## 📊 Overenie syncu

### PostgreSQL

```sql
-- Počet záznamov
SELECT COUNT(*) FROM memento_attendance;

-- Posledný sync
SELECT date, arrival, departure, synced_at
FROM memento_attendance
ORDER BY synced_at DESC
LIMIT 5;

-- Časy správne?
SELECT date, arrival, departure
FROM memento_attendance
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;
```

### Memento

Skontroluj Debug_Log v prvom zázname knižnice:
- `✅ API reachable`
- `Library Name: Dochádzka`
- `Syncing ALL 1234 entries...`
- `✅ 1234/1234`

---

## 🎁 Výhody univerzálneho scriptu

1. **Jednoduchosť:** Jeden script namiesto 36 verzií
2. **Bezpečnosť:** Žiadne hardcoded ID (menej chýb)
3. **Flexibilita:** Pridaj novú knižnicu len v mapper súbore
4. **Maintenance:** Update scriptu = update všade naraz
5. **Prehľadnosť:** Vidíš presne akú knižnicu syncuješ

---

## 🔄 Bulk Action vs Trigger

**Otázka:** Prečo Bulk Action ak syncuje všetky záznamy?

**Odpoveď:**
- **Bulk Action** = Manuálny sync VŠETKÝCH záznamov (ignoruje výber)
- **Trigger (AfterSave)** = Automatický sync PRI ULOŽENÍ jedného záznamu

**Odporúčanie:**
1. Použij **Bulk Action** pre prvotný import
2. Potom pridaj **Trigger (AfterSave)** pre priebežný sync

---

## 📝 Changelog

### v4.0 (2026-03-18) - UNIVERZÁLNY SCRIPT
- ✅ Automatická detekcia knižnice (`lib().name`, `lib().id`)
- ✅ Univerzálny endpoint `/api/memento/sync`
- ✅ Jeden script pre všetky knižnice
- ✅ Server-side library → table mapping

### v3.6 (2026-03-18) - Opravené library ID
- ✅ Dochádzka: `qU4Br5hU6` → `zNoMvrv8U`
- ✅ Aktualizované field mappings

### v3.5 (2026-03-17) - TIME field fix
- ✅ Date object conversion (7:00 → 07:00:00)

---

## 💡 Tip: Rapid Deploy

Ak máš 10+ knižníc:

1. Otvor Memento na **počítači** (nie mobile)
2. Skopíruj script do **prvej** knižnice
3. **Export** tej knižnice
4. **Import** do ostatných knižníc
5. Scripty sa skopírujú automaticky!

(Alebo použij Memento web interface pre hromadné kopírovanie)
