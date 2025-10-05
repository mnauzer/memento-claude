# Denný report - Prepočtový Script

## Verzia: 1.0.1

## Popis

Hlavný prepočtový script pre knižnicu **Denný report**. Agreguje dáta z viacerých knižníc (Dochádzka, Záznam prác, Kniha jázd, Pokladňa), vykonáva výpočty a vytvára prehľadné info záznamy.

## Umiestnenie

`/home/rasto/memento-claude/libraries/denny-report/Drep.Calc.Main.js`

## Trigger

**Before Save** v knižnici Denný report

## Závislosti

- **MementoUtils7.js** - utility funkcie
- **MementoConfig7.js v7.0.23+** - konfigurácia polí
- **MementoTelegram** - pripravené na integráciu (TODO)
- **MementoAI** - pripravené na integráciu (TODO)

## Funkcionalita

### 1. Spracovanie Dochádzky (`processAttendance()`)

**Vstup:**
- Linknuté záznamy z knižnice Dochádzka (pole "Dochádzka")

**Proces:**
1. Získa všetky linknuté záznamy dochádzky
2. Pre každý záznam:
   - Zamestnanci
   - Príchod a odchod
   - Odpracované hodiny
3. Agreguje celkové hodiny
4. Zbiera unikátny zoznam zamestnancov

**Výstup (v Debug logu):**
```
📊 DOCHÁDZKA - ZHRNUTIE: 2025-10-05 13:04:00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Celkom záznamov: 1
⏱️ Celkom odpracovaných hodín: 8.00 h
👥 Zamestnanci (2): Novák, Horák
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Dochádzka #123
  👥 Zamestnanci: Novák, Horák
  🕐 Príchod: 07:00
  🕑 Odchod: 15:00
  ⏱️ Odpracované: 8.00 h
```

**Return objekt:**
```javascript
{
    success: true,
    count: 1,
    totalHours: 8.0,
    employees: ["Novák", "Horák"],
    info: "..." // formátovaný text
}
```

---

### 2. Spracovanie Záznamov prác (`processWorkRecords()`)

**Vstup:**
- Linknuté záznamy z knižnice Záznam prác (pole "Záznam prác")

**Proces:**
1. Získa všetky linknuté záznamy prác
2. Pre každý záznam:
   - Zákazka
   - Zamestnanec
   - Popis práce
   - Hodiny
3. Agreguje celkové hodiny
4. Zbiera unikátny zoznam zákaziek

**Výstup (v Debug logu):**
```
📝 ZÁZNAMY PRÁC - ZHRNUTIE: 2025-10-05 13:04:00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Celkom záznamov: 1
⏱️ Celkom hodín: 5.50 h
🎯 Zákazky (1): Projekt ABC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Záznam prác #456
  🎯 Zákazka: Projekt ABC
  👤 Zamestnanec: Novák
  📋 Popis: Inštalácia okien
  ⏱️ Hodiny: 5.50 h
```

**Return objekt:**
```javascript
{
    success: true,
    count: 1,
    totalHours: 5.5,
    orders: ["Projekt ABC"],
    info: "..."
}
```

---

### 3. Spracovanie Knihy jázd (`processRideLog()`)

**Vstup:**
- Linknuté záznamy z knižnice Kniha jázd (pole "Kniha jázd")

**Proces:**
1. Získa všetky linknuté záznamy jázd
2. Pre každý záznam:
   - Vozidlo
   - Vodič
   - Trasa
   - Km
3. Agreguje celkové km
4. Zbiera unikátny zoznam vozidiel

**Výstup (v Debug logu):**
```
🚗 KNIHA JÁZD - ZHRNUTIE: 2025-10-05 13:04:00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Celkom záznamov: 2
📏 Celkom km: 250.50 km
🚙 Vozidlá (2): VW Caddy, Ford Transit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚗 Kniha jázd #789
  🚙 Vozidlo: VW Caddy
  👤 Vodič: Novák
  📍 Trasa: Lučenec - Bratislava - Lučenec
  📏 Km: 150.00 km
```

**Return objekt:**
```javascript
{
    success: true,
    count: 2,
    totalKm: 250.5,
    vehicles: ["VW Caddy", "Ford Transit"],
    info: "..."
}
```

---

### 4. Spracovanie Pokladne (`processCashBook()`)

**Vstup:**
- Linknuté záznamy z knižnice Pokladňa (pole "Pokladňa")

**Proces:**
1. Získa všetky linknuté záznamy pokladne
2. Pre každý záznam:
   - Typ (Príjem/Výdavok)
   - Suma
   - Popis
3. Agreguje príjmy a výdavky
4. Vypočíta bilanciu

**Výstup (v Debug logu):**
```
💰 POKLADŇA - ZHRNUTIE: 2025-10-05 13:04:00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Celkom záznamov: 3
📈 Príjmy: +1500.00 €
📉 Výdavky: -450.00 €
💰 Bilancia: 1050.00 €
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Pokladňa #101
  📊 Typ: Príjem
  💵 Suma: 1500.00 €
  📋 Popis: Platba od zákazníka
```

**Return objekt:**
```javascript
{
    success: true,
    count: 3,
    totalIncome: 1500.0,
    totalExpense: 450.0,
    info: "..."
}
```

---

### 5. Výpočet celkových hodín (`calculateTotalHours()`)

**Vstup:**
- `attendanceResult` - výsledok z dochádzky
- `workRecordsResult` - výsledok zo záznamov prác

**Proces:**
1. Získa hodiny z dochádzky
2. Získa hodiny zo záznamov prác
3. Použije maximum z oboch hodnôt
4. Ak sú obe 0, sčíta ich

**Výstup:**
```
⏱️ Celkové odpracované hodiny: 8.00 h
ℹ️ Zatiaľ nezapisujeme do poľa hoursWorked
```

**Return objekt:**
```javascript
{
    success: true,
    totalHours: 8.0
}
```

---

### 6. Generovanie popisu záznamu (`generateRecordDescription()`)

**Vstup:**
- Všetky result objekty zo sekcií

**Proces:**
1. Vytvorí stručný popis z jednotlivých sekcií
2. Formát: "👥 X dochádzka | 📝 Y práca | 🚗 Z jazda | 💰 W pokladňa"

**Výstup:**
```
✅ Popis záznamu: 👥 1 dochádzka (Novák, Horák) | 📝 1 práca (Projekt ABC) | 🚗 2 jazda (VW Caddy, Ford Transit) | 💰 3 pokladňa
ℹ️ Zatiaľ nezapisujeme do poľa recordDescription
```

**Return objekt:**
```javascript
{
    success: true,
    description: "..."
}
```

---

## Aktuálny stav (v1.0.1)

### ✅ Implementované:
- Agregácia dát z 4 hlavných sekcií
- Výpočty celkových hodnôt (hodiny, km, príjmy, výdavky)
- Vytváranie formátovaných info záznamov
- Debug výstupy do Debug_Log

### ⏳ TODO (pripravené na implementáciu):
- Zapisovanie do polí (`infoAttendance`, `infoWorkRecords`, `infoRideLog`, `infoCashBook`)
- Zapisovanie do polí (`hoursWorked`, `recordDescription`)
- Spätné linkovanie do jednotlivých záznamov
- Telegram notifikácie (integrácia s MementoTelegram)
- AI analýzy (integrácia s MementoAI)

### ❌ Odstránené:
- `formatDateTime()` → opravené na `formatDate() + formatTime()`
- Spätné linkovanie (funkcia `createBacklinks()`)
- Priame zapisovanie do polí (zatiaľ len debug výstupy)

---

## Testovanie

### Pred testovaním:
1. Skontroluj, či máš v knižnici Denný report záznam s dátumom
2. Pridaj linknuté záznamy z Dochádzky, Záznamov prác, Knihy jázd, Pokladne
3. Skontroluj Debug_Log pre výstupy

### Očakávané výsledky:
- Všetky info bloky sa zobrazia v Debug_Log
- Výpočty sú správne (hodiny, km, príjmy, výdavky)
- Žiadne chyby v Error_Log

### Príklad Debug výstupu:
```
🚀 === ŠTART Denný report Prepočet v1.0.1 ===
📅 Dátum reportu: 02.10.2025
🧮 KROK 1: Spracovanie Dochádzky
  📊 Počet záznamov dochádzky: 1
  📊 INFO DOCHÁDZKA:
  [celý info blok]
  ✅ Info dochádzka vytvorený (1 záznamov)
...
✅ === PREPOČET DOKONČENÝ ===
```

---

## Chybové stavy

### Chýbajúci dátum:
```
❌ Dátum nie je vyplnený!
```

### Žiadne záznamy v sekcii:
```
ℹ️ Žiadne záznamy dochádzky
ℹ️ Žiadne záznamy prác
ℹ️ Žiadne záznamy z knihy jázd
ℹ️ Žiadne záznamy z pokladne
```

### Chyba v spracovaní:
```
❌ ERROR: Chyba pri spracovaní dochádzky: [error message]
```

---

## Ďalšie kroky

1. Otestovať agregácie a výpočty
2. Overiť formátovanie info záznamov
3. Po schválení pridať zapisovanie do polí
4. Implementovať spätné linkovanie
5. Integrovať Telegram notifikácie
6. Integrovať AI analýzy

---

## Poznámky

- Script dodržiava štandardy MementoUtils ekosystému
- Štruktúra podobná `Knij.Calc.Main.js` a `Zazp.Calc.Main.js`
- Používa lazy loading cez MementoUtils7
- Konzistentné error handling a debug logging
