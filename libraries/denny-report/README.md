# Denný report - Dokumentácia

## Verzia: 2.0.0 (DennyReport Module v1.2.0)

**Posledná aktualizácia:** 2026-03-20

---

## 📋 Popis

Knižnica **Denný report** agreguje dáta z 4 zdrojových knižníc (Dochádzka, Záznam prác, Kniha jázd, Pokladňa), vykonáva validácie, výpočty a vytvára komplexné zhrnutia.

**Nová architektúra (v2.0.0):**
- ✅ **Ultra-thin wrapper scripts** (10-20 riadkov) - iba volania modulu
- ✅ **DennyReport reusable module** - všetka logika v module
- ✅ **GitHub synchronizácia** - verzovanie a centrálna údržba
- ✅ **Event-specific handlers** - samostatné scripty pre každý event

---

## 📁 Štruktúra Scriptov

### Event Handlers (Thin Wrappers)

| Script | Event | Verzia | Účel |
|--------|-------|--------|------|
| `newEntryBeforeSave.js` | BeforeSave (new) | 2.0.0 | Volá `DennyReport.handleBeforeSave()` |
| `updateEntryBeforeSave.js` | BeforeSave (update) | 2.0.0 | Volá `DennyReport.handleBeforeSave()` |
| `newEntryAfterSave.js` | AfterSave (new) | 2.0.0 | Volá `DennyReport.handleAfterSave()` |
| `updateEntryAfterSave.js` | AfterSave (update) | 2.0.0 | Volá `DennyReport.handleAfterSave()` |
| `recalculate.js` | Action (manual) | 2.0.0 | Volá `DennyReport.recalculateAll()` |

**Každý wrapper script obsahuje:**
```javascript
// Validácia závislostí
if (typeof DennyReport === 'undefined') {
    message("❌ Chýba DennyReport modul!");
    cancel();
}

// Volanie modulu
try {
    var result = DennyReport.handleBeforeSave(entry());
    if (result && result.message) {
        message(result.message);
    }
} catch (error) {
    dialog("Kritická chyba", error.toString(), "OK");
    cancel();
}
```

### Reusable Module

| Module | Verzia | Umiestnenie | GitHub |
|--------|--------|-------------|--------|
| `DennyReport` | 1.2.0 | `modules/DennyReport.js` | ✅ Synchronized |

---

## 🔧 DennyReport Module v1.2.0

### Závislosti

**Vyžadované moduly:**
- `MementoUtils` (v8.0+)
- `MementoConfig` (v8.0+)
- `MementoCore` (v8.0+)

**Load order v Memento Database:**
```
1. MementoConfig
2. MementoCore
3. MementoUtils
4. DennyReport ← Tento modul
5. Wrapper scripts (newEntryBeforeSave, etc.)
```

### Poskytované Funkcie

#### High-Level Handlers (v1.1.0+)

| Funkcia | Účel | Použitie |
|---------|------|----------|
| `handleBeforeSave(entry)` | Kompletná logika pre BeforeSave trigger | Volá sa z wrapper scriptov |
| `handleAfterSave(entry)` | Aktualizácia ikon v linknutých záznamoch | Volá sa z wrapper scriptov |
| `recalculateAll()` | Prepočet všetkých Denných reportov | Volá sa z action scriptu |

#### Agregačné Funkcie (v1.2.0+)

| Funkcia | Return | Agreguje |
|---------|--------|----------|
| `processAttendance(entry)` | `{success, count, totalHours, employees}` | Dochádzka: hodiny, zamestnanci |
| `processWorkRecords(entry)` | `{success, count, totalHours, employees, orders, orderFullNames}` | Práce: hodiny, zákazky, zamestnanci |
| `processRideLog(entry)` | `{success, count, totalKm, vehicles, crew}` | Jazdy: km, vozidlá, posádka |
| `processCashBook(entry)` | `{success, count, totalIncome, totalExpense}` | Pokladňa: príjmy, výdavky |

#### Validačné a Výpočtové Funkcie (v1.2.0+)

| Funkcia | Účel |
|---------|------|
| `calculateTotalHours(attendance, workRecords)` | Vypočíta celkové odpracované hodiny (max z Dochádzky/Prác) |
| `validateRecordsData(entry, attendance, workRecords, rideLog)` | Validuje konzistenciu zamestnancov medzi sekciami |
| `createCommonInfo(entry, attendance, workRecords, rideLog, cashBook, totalHours, validation)` | Vytvorí markdown zhrnutie do info poľa |

#### Core Funkcie (v1.0.0+)

| Funkcia | Účel |
|---------|------|
| `processReport(entry, options)` | Auto-linkovanie + validácia dátumov |
| `autoLinkRecords(entry, reportDate, options)` | Nájde a nalinkuje záznamy s rovnakým dátumom |
| `validateAndUnlinkInvalidDates(entry, reportDate)` | Unlinkne záznamy s nesprávnym dátumom |
| `mergeDuplicates(entry)` | Zlúči duplicitné Denné reporty (rovnaký dátum) |

---

## 🎯 Funkcionalita

### 1. Auto-Linkovanie Záznamov

**Ako funguje:**
1. Kontroluje posledných 200 záznamov z každej knižnice
2. Hľadá záznamy s rovnakým dátumom ako Denný report
3. Automaticky linkne nájdené záznamy
4. Unlinkne záznamy s nesprávnym dátumom

**Linkované knižnice:**
- 📋 Dochádzka → pole "Dochádzka"
- 📝 Záznam prác → pole "Záznam prác"
- 🚗 Kniha jázd → pole "Kniha jázd"
- 💰 Pokladňa → pole "Pokladňa"

**Debug log:**
```
🔗 KROK 1: Auto-linkovanie a validácia
  🔍 Kontrolujem Dochádzka: 200 posledných záznamov (z 1500)
  ✅ Linknutý záznam Dochádzka #123
  ✅ Linknutý záznam Dochádzka #124
  ✅ Nalinkované: 2 nových záznamov
```

### 2. Agregácia Dát

**Spracovanie Dochádzky:**
- Agreguje hodiny zo všetkých linknutých záznamov
- Zbiera unikátny zoznam zamestnancov (nick)
- Počíta celkové odpracované hodiny

**Spracovanie Záznamov Prác:**
- Agreguje hodiny zo všetkých linknutých záznamov
- Zbiera unikátny zoznam zákaziek (názov)
- Zbiera unikátny zoznam zamestnancov
- Vytvorí formát "Číslo.Názov" pre každú zákazku

**Spracovanie Knihy Jázd:**
- Agreguje km zo všetkých linknutých záznamov
- Zbiera unikátny zoznam vozidiel
- Zbiera unikátny zoznam posádky

**Spracovanie Pokladne:**
- Agreguje príjmy (typ "Príjem")
- Agreguje výdavky (typ "Výdaj" alebo "Výdavok")
- Ignoruje PP (Priebežná položka)
- Vypočíta bilanciu

**Debug log:**
```
📊 KROK 2: Agregácia dát a ikony
  ✅ Dochádzka: 3 záznamov, 24.00 h
  ✅ Práce: 5 záznamov, 22.50 h
  ✅ Jazdy: 2 záznamov, 45.50 km
  ✅ Pokladňa: 2 záznamov
  🎨 Ikony sekcií aktualizované
  📋 Popis (zákazky): Struhárová (Kováčová), Pazer (BB Slnečné stráne)
```

### 3. Validácia Konzistencie

**Kontroluje:**
- ⚠️ Chýbajúce záznamy (Dochádzka, Práce, Jazdy)
- ⚠️ Nezhoda počtu zamestnancov medzi Dochádzkou a Prácami
- ⚠️ Nezhoda počtu zamestnancov medzi Dochádzkou a Jazdami

**Príklad upozornení:**
```
❌ Počet zamestnancov sa nezhoduje: Dochádzka (3) ≠ Záznamy prác (2)
⚠️ Chybuje záznam z Knihy jázd
```

### 4. Detekcia Prestojov

**Logika:**
- Porovnáva hodiny z Dochádzky vs. hodiny z Prác
- Tolerancia: ±0.1 hodiny
- **Prestoje:** Dochádzka > Práce (zamestnanci prítomní, ale nepracovali)
- **Chyba:** Práce > Dochádzka (treba skontrolovať)

**Príklad:**
```
## ⏸️ Prestoje

- **Prestoj:** 1.50 h
- **Dochádzka:** 24.00 h
- **Práce:** 22.50 h
- ⚠️ Zamestnanci boli prítomní, ale nevykonávali práce
```

### 5. Generovanie Info Zhrnutia

**Pole:** `info - Denný report - Zhrnutie`

**Formát:** Markdown

**Sekcie:**
1. 📊 Hlavička (dátum, čas aktualizácie)
2. ⚠️ Upozornenia (ak existujú)
3. ⏸️ Prestoje (ak existujú)
4. 👥 Dochádzka (ak existuje)
5. 📝 Záznamy prác (ak existujú)
6. 🚗 Kniha jázd (ak existuje)
7. 💰 Pokladňa (ak existuje)
8. ⏱️ Celkové hodiny (ak > 0)

**Príklad:**
```markdown
## 📊 DENNÝ REPORT - ZHRNUTIE

**Dátum:** 20.03.2026
**Aktualizované:** 20.03.2026 14:30

## ⚠️ Upozornenia

- ❌ Počet zamestnancov sa nezhoduje: Dochádzka (3) ≠ Záznamy prác (2)

## ⏸️ Prestoje

- **Prestoj:** 1.50 h
- **Dochádzka:** 24.00 h
- **Práce:** 22.50 h
- ⚠️ Zamestnanci boli prítomní, ale nevykonávali práce

---

## 👥 Dochádzka

- **Počet záznamov:** 3
- **Odpracované hodiny:** 24.00 h
- **Zamestnanci (3):** Janko, Ferko, Jožko

## 📝 Záznamy prác

- **Počet záznamov:** 5
- **Celkom hodín:** 22.50 h
- **Zamestnanci (2):** Janko, Ferko
- **Zákazky (2):** Struhárová (Kováčová), Pazer (BB Slnečné stráne)

## 🚗 Kniha jázd

- **Počet záznamov:** 2
- **Celkom km:** 45.50 km
- **Posádka (3):** Janko, Ferko, Jožko
- **Vozidlá (2):** Volkswagen, Ford

## 💰 Pokladňa

- **Počet záznamov:** 2
- **Príjmy:** +1500.00 €
- **Výdavky:** -350.00 €
- **Bilancia:** +1150.00 €

---

## ⏱️ Celkové hodiny

**24.00 h**
```

### 6. Aktualizácia Polí

**Automaticky sa vypĺňajú:**

| Pole | Zdroj | Formát | Príklad |
|------|-------|--------|---------|
| `Deň v týždni` | Vypočítané z dátumu | "Utorok", "Streda" | "Utorok" |
| `Odpracované hodiny` | max(Dochádzka, Práce) | Číslo | 24.00 |
| `Popis` | Názvy zákaziek z Prác | Text, čiarkou oddelené | "Struhárová (Kováčová), Pazer (BB Slnečné stráne)" |
| `info` | Markdown zhrnutie | Markdown | (viď príklad vyššie) |

**Ak nie sú žiadne zákazky:**
- Pole `Popis` = `"Žiadna zákazka"`

### 7. Ikony Záznamu

**Pole:** `ikony záznamu`

**Automaticky sa pridávajú/odstraňujú:**

| Ikona | Podmienka | Význam |
|-------|-----------|--------|
| 👥 | Dochádzka count > 0 | Má záznamy Dochádzky |
| 🛠️ | Práce count > 0 | Má záznamy Prác |
| 🚗 | Jazdy count > 0 | Má záznamy Jázd |
| 💰 | Pokladňa count > 0 | Má záznamy Pokladne |
| ⚠️ | Upozornenia existujú | Sú problémy na kontrolu |
| ⏸️ | Prestoje > 0.1h | Detekované prestoje |

**Príklad:** `👥 🛠️ 🚗 💰 ⚠️ ⏸️`

### 8. Ikony v Linknutých Záznamoch

**Pole:** `ikony záznamu` (v Dochádzke, Prácach, Jazdách, Pokladni)

**Automaticky sa pridáva:** 📊

**Kedy:** Po uložení Denného reportu (handleAfterSave)

**Význam:** Tento záznam je prepojený s Denným reportom

**Debug log:**
```
🔄 DennyReport.handleAfterSave v1.2.0
  🔍 Dochádzka: 3 záznamov
    ✅ Pridaná ikona do Dochádzka #123
    ✅ Pridaná ikona do Dochádzka #124
    ✅ Pridaná ikona do Dochádzka #125
  🔍 Práce: 5 záznamov
    ✅ Pridaná ikona do Práce #456
  ✅ Aktualizovaných 8 ikon v linknutých záznamoch
```

---

## 🔄 Workflow

### Pri uložení Denného reportu (BeforeSave)

1. ✅ **Validácia** - Skontroluje dátum (povinné)
2. ✅ **Auto-linkovanie** - Nájde a nalinkuje záznamy s rovnakým dátumom
3. ✅ **Validácia dátumov** - Unlinkne záznamy s nesprávnym dátumom
4. ✅ **Agregácia** - Spracuje všetky 4 sekcie
5. ✅ **Ikony sekcií** - Pridá/odstráni ikony podľa obsahu
6. ✅ **Pole Popis** - Vyplní názvy zákaziek
7. ✅ **Výpočet hodín** - Vypočíta celkové odpracované hodiny
8. ✅ **Validácia konzistencie** - Skontroluje zamestnancov
9. ✅ **Info zhrnutie** - Vytvorí markdown zhrnutie
10. ✅ **Message** - Zobrazí krátke zhrnutie zmien

### Po uložení Denného reportu (AfterSave)

1. ✅ **Ikony v linknutých záznamoch** - Pridá 📊 do všetkých linknutých záznamov

### Manuálny prepočet (Action)

1. ✅ **Načíta všetky Denné reporty** - Zoradené od najnovších
2. ✅ **Prepočíta každý záznam** - Volá handleBeforeSave() pre každý
3. ✅ **Zobrazí štatistiky** - Dialog s výsledkami prepočtu

---

## 📊 Debug Logging

**Pole:** `Debug_Log`

**Formát:** Chronologický log s timestampmi

**Príklad kompletného logu:**
```
🚀 === ŠTART handleBeforeSave v1.2.0 ===
📅 Dátum reportu: 20.03.2026

🔗 KROK 1: Auto-linkovanie a validácia
  🔍 Kontrolujem Dochádzka: 200 posledných záznamov (z 1500)
  ✅ Linknutý záznam Dochádzka #123
  ✅ Linknutý záznam Dochádzka #124
  🔍 Kontrolujem Práce: 200 posledných záznamov (z 800)
  ✅ Linknutý záznam Práce #456
  ✅ Nalinkované: 3 nových záznamov

🔍 VALIDÁCIA DÁTUMOV: Kontrolujem zhodu s dátumom 20.03.2026
✅ Všetky linknuté záznamy majú správny dátum

📊 KROK 2: Agregácia dát a ikony
  ✅ Dochádzka: 3 záznamov, 24.00 h
  ✅ Práce: 5 záznamov, 22.50 h
  ✅ Jazdy: 2 záznamov, 45.50 km
  ✅ Pokladňa: 2 záznamov
  🎨 Ikony sekcií aktualizované
  📋 Popis (zákazky): Struhárová (Kováčová), Pazer (BB Slnečné stráne)

⏱️ Celkové hodiny: 24.00 h
⚠️ Validácia: 1 upozornení

📝 KROK 3: Vytvorenie info zhrnutia
  ✅ Spoločný info záznam vytvorený a zapísaný

✅ === PREPOČET DOKONČENÝ ===
```

---

## ⚠️ Chybové Stavy

### Chýbajúci modul

**Chyba:**
```
❌ Chýba DennyReport modul!

Nahrajte modul pre tento script.
```

**Riešenie:** Nahrajte `DennyReport` modul v Nastavenia → Automations

### Chýbajúci dátum

**Chyba:**
```
❌ Dátum nie je vyplnený!
```

**Riešenie:** Vyplňte pole "Dátum" v Dennom reporte

### Kritická chyba v module

**Chyba:**
```
❌ KRITICKÁ CHYBA

Script: DennyReport.handleBeforeSave v1.2.0

Chyba: [error message]

Stack trace: [...]
```

**Riešenie:**
1. Skontrolujte `Error_Log` pre detaily
2. Skontrolujte `Debug_Log` pre trace
3. Overte že všetky závislosti sú nahrané (MementoUtils, MementoConfig)

---

## 🧪 Testovanie

### Základný test

1. Vytvorte nový Denný report s dátumom (napr. dnes)
2. Pridajte záznamy s rovnakým dátumom v Dochádzke, Prácach, Jazdách, Pokladni
3. Uložte Denný report
4. Skontrolujte:
   - ✅ Pole `info` má markdown zhrnutie
   - ✅ Pole `Popis` má názvy zákaziek
   - ✅ Pole `ikony záznamu` má ikony sekcií (👥🛠️🚗💰)
   - ✅ Linknuté záznamy majú ikonu 📊
   - ✅ `Debug_Log` bez chýb

### Test auto-linkovania

1. Vytvorte Denný report bez linknutých záznamov
2. Dátum: napr. 15.03.2026
3. Vytvorte záznamy v Dochádzke s dátumom 15.03.2026
4. Uložte Denný report (BeforeSave trigger)
5. Skontrolujte:
   - ✅ Dochádzka záznamy sa automaticky nalinkovali
   - ✅ `Debug_Log` ukazuje "Linknutý záznam Dochádzka #..."

### Test validácie dátumov

1. Manuálne nalinkujte záznam s nesprávnym dátumom
2. Uložte Denný report
3. Skontrolujte:
   - ✅ Záznam s nesprávnym dátumom sa unlinkol
   - ✅ `Debug_Log` ukazuje "Unlinknutý ... (nesprávny dátum)"

### Test prestojov

1. Vytvorte Denný report s:
   - Dochádzka: 24 hodín
   - Práce: 22.5 hodín
2. Uložte
3. Skontrolujte:
   - ✅ Pole `info` obsahuje sekciu "⏸️ Prestoje"
   - ✅ Pole `ikony záznamu` obsahuje ⏸️
   - ✅ Prestoj: 1.5h

### Test manuálneho prepočtu

1. Otvorte knižnicu Denný report
2. Spustite akciu "Prepočítať všetky záznamy"
3. Skontrolujte:
   - ✅ Dialog zobrazí štatistiky prepočtu
   - ✅ Všetky záznamy majú aktualizované info polia

---

## 🔧 Riešenie Problémov

### Problem: Pole `info` je prázdne

**Príčina:** createCommonInfo() zlyhala

**Riešenie:**
1. Skontrolujte `Error_Log`
2. Overte že pole `info` existuje v knižnici
3. Overte že MementoCore má funkciu `safeSet()`

### Problem: Ikony sa nepridávajú

**Príčina:** Pole "ikony záznamu" neexistuje alebo má iný názov

**Riešenie:**
1. Overte že pole "ikony záznamu" existuje v knižnici
2. Overte že MementoCore má funkcie `addRecordIcon()` a `removeRecordIcon()`

### Problem: Auto-linkovanie nefunguje

**Príčina:** Záznamy majú iný dátum alebo knižnica má iný názov

**Riešenie:**
1. Skontrolujte `Debug_Log` pre "Kontrolujem ... záznamov"
2. Overte že dátumy sa zhodujú (formát DD.MM.YYYY)
3. Overte názvy knižníc v MementoConfig

### Problem: Zákazky sa nezobrazujú v poli Popis

**Príčina:** Záznamy prác nemajú linknutú Zákazku

**Riešenie:**
1. Overte že Záznamy prác majú vyplnené pole "Zákazka"
2. Overte že Zákazka má vyplnené pole "Názov"

### Problem: Duplicitné Denné reporty pre jeden dátum

**Príčina:** Race condition pri auto-linkovaní (súbežné uloženia)

**Riešenie:**
1. Spustite akciu "Zlúčiť duplikáty" (ak existuje)
2. Alebo manuálne zlúčte záznamy a zmažte duplikáty

---

## 📚 História Verzií

### v2.0.0 (2026-03-20) - MAJOR REFACTORING

**Ultra-thin wrappers + DennyReport module:**
- ✅ Rozdelené na 5 event-specific scriptov (10-20 riadkov každý)
- ✅ Všetka logika presunutá do DennyReport modulu v1.2.0
- ✅ GitHub synchronizácia pre centrálnu údržbu
- ✅ Eliminované duplicitné kódy

**DennyReport Module v1.2.0:**
- ✅ Agregačné funkcie (processAttendance, processWorkRecords, processRideLog, processCashBook)
- ✅ Výpočtové funkcie (calculateTotalHours)
- ✅ Validačné funkcie (validateRecordsData)
- ✅ Info generovanie (createCommonInfo) - markdown zhrnutie
- ✅ Ikony sekcií (👥🛠️🚗💰⚠️⏸️)
- ✅ Ikony v linknutých záznamoch (📊)
- ✅ Automatické vypĺňanie poľa Popis (názvy zákaziek)

**DennyReport Module v1.1.0:**
- ✅ High-level handlers (handleBeforeSave, handleAfterSave, recalculateAll)
- ✅ Wrapper scripty znížené z 100-150 riadkov na 10-20 riadkov

**DennyReport Module v1.0.0:**
- ✅ Auto-linkovanie záznamov podľa dátumu
- ✅ Validácia dátumov (unlink nesprávnych)
- ✅ Merge duplicates funkcionalita

### v1.0.1 (2025-10-05) - INITIAL VERSION

- ✅ Agregácia dát z 4 sekcií (Dochádzka, Práce, Jazdy, Pokladňa)
- ✅ Debug výstupy do Debug_Log
- ⏳ Zatiaľ bez zapisovania do polí (iba výpočty)

---

## 🚀 Roadmap

### v2.1.0 (plánované)

- [ ] Telegram notifikácie pri uložení Denného reportu
- [ ] AI analýzy prestojov a odporúčania
- [ ] Export do PDF/Excel
- [ ] Grafické vizualizácie (grafy)

### v2.2.0 (plánované)

- [ ] Multi-day reports (týždenné, mesačné zhrnutia)
- [ ] Porovnanie s predchádzajúcimi dňami
- [ ] Automatická detekcia anomálií

---

## 📞 Podpora

**Problémy?**
1. Skontrolujte `Debug_Log` a `Error_Log`
2. Pozrite sekciu "Riešenie problémov" vyššie
3. Overte že všetky závislosti sú nahrané

**GitHub Issues:**
- Nahláste problémy na GitHub repozitári projektu

---

## 📄 Licencia

ASISTANTO Internal Project © 2026
