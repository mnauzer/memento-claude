# Inštalácia Sync Script v3.6 do Memento Database

## ⚠️ DÔLEŽITÉ: Tento script obsahuje KRITICKÉ OPRAVY!

**Verzia:** 3.6
**Dátum:** 2026-03-18
**Kritická zmena:** Opravené library ID z `qU4Br5hU6` → `zNoMvrv8U` (správna Dochádzka!)

---

## Krok 3: Inštalácia scriptu do Memento app

### 1. Otvor Memento Database na mobile/tablete

### 2. Otvor knižnicu "Dochádzka"
   - **POZOR:** Uisti sa, že otvára knižnicu s poliami: Dátum, Príchod, Odchod, Zamestnanci
   - Ak vidíš polia ako "Meno", "Priezvisko", "Pozícia" - to je ZLÁ knižnica!

### 3. Otvor menu knižnice (tri bodky ⋮)
   - Vyber: **Spravovať skripty**

### 4. Vytvor nový Bulk Action script
   - Vyber: **Nový Bulk Action**
   - Názov: `Sync To PostgreSQL v3.6`
   - Popis: `Synchronizuje všetky záznamy do PostgreSQL (OPRAVEN library ID!)`

### 5. Skopíruj celý script
   - Otvor súbor: `Dochadzka.BulkAction.SyncToPostgreSQL.js`
   - Vyber VŠETKO (Ctrl+A alebo Cmd+A)
   - Skopíruj (Ctrl+C alebo Cmd+C)

### 6. Vlož do Memento editora
   - Klikni do editora scriptu v Memento app
   - Vlož (Ctrl+V alebo Cmd+V alebo Long press → Paste)
   - Skontroluj že prvý riadok je: `/**`
   - Skontroluj že posledný riadok je: `})();`

### 7. Ulož script
   - Klikni **Save** alebo **Uložiť**
   - Script by sa mal uložiť bez chýb

---

## Testovanie scriptu (PRED bulk sync!)

### Test 1: Sync 1 záznam

1. Otvor knižnicu Dochádzka
2. Vyber **JEDEN** záznam (napr. dnešný deň)
3. Menu (⋮) → **Bulk Actions** → **Sync To PostgreSQL v3.6**
4. Počkaj na dokončenie
5. Skontroluj správu:
   - ✅ "✅ 1/1" = úspech
   - ❌ "❌ 1 zlyhalo" = PROBLÉM! Pozri Debug_Log

### Test 2: Skontroluj data v PostgreSQL

```sql
-- Na reddwarf serveri
SELECT
    date,
    arrival,
    departure,
    employee_count,
    worked_hours
FROM memento_attendance
ORDER BY date DESC
LIMIT 5;
```

**Očakávaný výsledok:**
- `arrival` a `departure` sú SPRÁVNE časy (napr. 07:00:00, nie 06:00:00)
- `date` je správny dátum
- `employee_count` je číslo zamestnancov

### Test 3: Skontroluj junction table

```sql
-- Zamestnanci priradení k dochádzke
SELECT
    a.date,
    ae.employee_id
FROM memento_attendance a
JOIN memento_attendance_employees ae ON a.id = ae.attendance_id
ORDER BY a.date DESC
LIMIT 10;
```

**Očakávaný výsledok:**
- Vidíš employee_id (dlhé Memento ID ako "RFtIS3VOcHpEaTRJWDVlaFs2TTo")

---

## Bulk Sync (všetky záznamy)

**⚠️ UPOZORNENIE:** Dochádzka má 573 záznamov! Bulk sync bude trvať VEĽMI dlho!

### Odporúčanie:
Namiesto bulk sync VŠETKÝCH záznamov:

1. **Sync posledných 30 dní:**
   - Vytvor filter v Memento: Dátum >= (dnes - 30 dní)
   - Vyber všetky filtrované záznamy
   - Spusti Bulk Action

2. **Sync po mesiacoch:**
   - Filter: Dátum >= 2026-01-01 AND Dátum <= 2026-01-31
   - Spusti Bulk Action
   - Opakuj pre každý mesiac

3. **Sync len aktívne záznamy:**
   - Filter: Voľno = false AND Dátum >= 2025-01-01
   - Spusti Bulk Action

### Postup bulk sync:

1. Vytvor filter (odporúčané!)
2. Vyber všetky záznamy: Menu → **Select All**
3. Menu → **Bulk Actions** → **Sync To PostgreSQL v3.6**
4. **POČKAJ!** Nezatváraj app počas syncu!
5. Sleduj progress: "🔄 50/1000 - ✅ 48 ❌ 2"
6. Počkaj na dokončenie: "✅ 998/1000 (❌ 2 zlyhalo)"

### Čas trvania (odhad):

- 100 záznamov: ~1 minúta
- 1,000 záznamov: ~10 minút
- 10,000 záznamov: ~2 hodiny
- 100,000 záznamov: ~20 hodín
- 1,000,000 záznamov: ~8 dní 😱

**DÔRAZNE odporúčam sync len relevantných dát (napr. posledné 2 roky)!**

---

## Riešenie problémov

### Chyba: "❌ API nedostupné!"
- Skontroluj že reddwarf server beží
- Skontroluj IP adresu v scripte: `192.168.5.241:8889`
- Otestuj v prehliadači: `http://192.168.5.241:8889/api/memento/health`

### Chyba: "❌ Sync failed: HTTP 401"
- Nesprávny API kľúč
- Skontroluj kľúč v scripte: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### Chyba: "❌ Sync failed: HTTP 500"
- Chyba na serveri (PostgreSQL)
- Pozri server logy: `/opt/memento-sync/logs/sync.log`

### Časy sú stále zlé (06:00 namiesto 07:00)
- Skontroluj verziu scriptu: Musí byť **v3.6**!
- V Debug_Log by mal byť: "TIME field Príchod: Local time 7:0:0 -> ISO: ..."
- Ak nevidíš tento log, script je stará verzia!

### SQLiteBlobTooBigException (app crashuje)
- Debug_Log je príliš veľký
- Spusti: `Dochadzka.BulkAction.ClearDebugLog.js`
- Tento script vymaže všetky Debug_Log polia

---

## Overenie úspešnosti

### 1. Počet záznamov v PostgreSQL
```sql
SELECT COUNT(*) FROM memento_attendance;
-- Očakávaný: počet záznamov ktoré si syncoval
```

### 2. Posledný syncovaný záznam
```sql
SELECT date, arrival, departure, synced_at
FROM memento_attendance
ORDER BY synced_at DESC
LIMIT 1;
```

### 3. Skontroluj časy
```sql
SELECT date, arrival, departure
FROM memento_attendance
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;
```

**Časy MUSIA byť správne!** Ak vidíš 06:00 namiesto 07:00, script má chybu!

---

## Ďalšie kroky po úspešnom syncu

1. ✅ Nastavit automatickú synchronizáciu (Trigger - After Save)
2. ✅ Sync ďalších knižníc:
   - Zamestnanci (`nWb00Nogf`)
   - Záznam prác (`ArdaPo5TU`)
   - Kniha jázd
3. ✅ Vytvoriť MCP tools pre query z Claude Code
4. ✅ Integrovať s n8n workflows

---

## Podpora

Pri problémoch skontroluj:
1. Debug_Log v prvom zázname Dochádzka
2. Server logy: `/opt/memento-sync/logs/sync.log`
3. PostgreSQL logy: `journalctl -u postgresql`
4. Dokumentáciu: `CRITICAL_FIX_2026-03-18.md`
