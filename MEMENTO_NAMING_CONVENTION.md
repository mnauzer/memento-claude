# Memento Database - Naming Convention

## Konvencia pomenovania scriptov

### Formát názvu scriptu

```
[Knižnica].[Typ].[Názov]
```

**Bez čísla verzie v názve súboru** - verzia je uvedená v hlavičke scriptu.

### Komponenty názvu

1. **[Knižnica]** - Skratka knižnice (povinné)
2. **[Typ]** - Typ scriptu (povinné)
3. **[Názov]** - Popisný názov (voliteľné, ale odporúčané)

---

## Skratky knižníc

| Knižnica | Skratka | Príklad |
|----------|---------|---------|
| Dochádzka | `Doch` | Doch.Calc.Main |
| Kniha jázd | `Knij` | Knij.Calc.Main |
| Materiál | `Mat` | Mat.Action.SetPrice |
| Pokladňa | `Pokl` | Pokl.Calc.VAT |
| Zamestnanec | `Zam` | Zam.Calc.Main |
| Zákazky | `Zak` | Zak.Calc.Main |
| Záznam prác | `Zazp` | Zazp.Calc.Main |
| Notifications | `Notif` | Notif.Trigger.Delete |
| Utils | `Utils` | Utils.Action.Renumber |

---

## Typy scriptov

### 1. **Calc** - Calculation/Prepočet
Hlavný prepočtový engine pre knižnicu. Vykonáva primárne výpočty.

**Príklady:**
- `Doch.Calc.Main.js` (hlavný prepočet dochádzky)
- `Mat.Calc.Receipts.js` (prepočet príjemiek materiálu)
- `Pokl.Calc.VAT.js` (prepočet DPH)

**Použitie:**
- Výpočty miezd, hodín, nákladov
- Agregácie dát
- Aktualizácia vypočítaných polí

### 2. **Trigger** - Trigger Script
Automaticky sa spúšťa pri databázových udalostiach.

**Príklady:**
- `Doch.Trigger.BeforeDelete.js` (cleanup pred zmazaním)
- `Notif.Trigger.OnCreate.js` (vytvorenie notifikácie)
- `Zam.Trigger.AfterSave.js` (aktualizácia po uložení)

**Použitie:**
- Validácia pred uložením
- Cleanup pri mazaní
- Automatická tvorba záznamov
- Linkovanie záznamov

### 3. **Action** - Action Script
Manuálne spúšťaný script (tlačidlo, menu).

**Príklady:**
- `Mat.Action.SetFields.js` (nastavenie polí)
- `Utils.Action.Renumber.js` (prečíslovanie)
- `Knij.Action.LinkOrders.js` (linkovanie zákaziek)

**Použitie:**
- Hromadné operácie
- Manuálne prepočty
- Import/export dát
- Údržbové operácie

### 4. **BulkAction** - Bulk Action Script
Hromadné operácie nad viacerými záznamami.

**Príklady:**
- `Mat.BulkAction.SetFields.js` (hromadné nastavenie polí)
- `Mat.BulkAction.UpdatePrices.js` (hromadná aktualizácia cien)
- `Doch.BulkAction.RecalculateWages.js` (prepočet miezd)

**Použitie:**
- Batch processing
- Hromadné úpravy
- Migrácie dát

### 5. **Button** - Button Script
Script priradený konkrétnemu tlačidlu v UI.

**Príklady:**
- `Mat.Button.CalcPrice.js` (tlačidlo prepočet ceny)
- `Doch.Button.SendNotif.js` (odoslať notifikáciu)

**Použitie:**
- Inline akcie v zázname
- Rýchle operácie
- UI interakcie

### 6. **Notif** - Notification Script
Správa notifikácií (Telegram, email).

**Príklady:**
- `Doch.Notif.Individual.js` (individuálne notifikácie)
- `Doch.Notif.Group.js` (skupinové notifikácie)
- `Notif.Trigger.Delete.js` (cleanup notifikácií)

**Použitie:**
- Odosielanie Telegram správ
- Vytvorenie notifikačných záznamov
- Cleanup starých notifikácií

### 7. **Calc.Universal** - Universal Calculator
Univerzálny kalkulátor použiteľný pre viac scenárov.

**Príklady:**
- `Doch.Calc.Universal.js` (univerzálny kalkulátor dochádzky)
- `Zam.Calc.Universal.js` (univerzálny kalkulátor zamestnancov)

**Použitie:**
- Flexibilné výpočty
- Rôzne módy spracovania
- Parametrizovateľné výpočty

### 8. **Calc.Custom** - Custom Calculator
Špecializovaný kalkulátor pre konkrétny use case.

**Príklady:**
- `Doch.Calc.Custom.PeterBabicenko.js` (kalkulátor pre konkrétneho zamestnanca)
- `Zak.Calc.Custom.ProjectX.js` (kalkulátor pre projekt X)

**Použitie:**
- Špeciálne prípady
- Zákaznícke customizácie
- Dočasné riešenia

### 9. **DataSource** - Data Source Script
Poskytuje dáta pre automatické dopĺňanie.

**Príklady:**
- `Zam.DataSource.ActiveEmployees.js` (aktívni zamestnanci)
- `Mat.DataSource.ItemPrices.js` (cenník materiálu)

**Použitie:**
- Dynamické zoznamy
- Automatické dopĺňanie
- Závislé polia

### 10. **Widget** - Widget Script
Vlastný widget/UI komponent.

**Príklady:**
- `Doch.Widget.Calendar.js` (kalendárový widget)
- `Zak.Widget.Timeline.js` (timeline projektov)

**Použitie:**
- Vlastné vizualizácie
- Interaktívne komponenty
- Dashboardy

---

## Štruktúra hlavičky scriptu

Každý script musí obsahovať štandardizovanú hlavičku s metadátami:

```javascript
/**
 * ============================================================================
 * MEMENTO DATABASE SCRIPT
 * ============================================================================
 *
 * Knižnica:    Dochádzka
 * Názov:       Doch.Calc.Main
 * Typ:         Calculation (Trigger - After Save)
 * Verzia:      8.0
 *
 * Popis:
 * Hlavný prepočtový engine pre dochádzku. Vypočíta odpracované hodiny,
 * mzdy zamestnancov, vytvorí záväzky a odošle Telegram notifikácie.
 *
 * Závislosti:
 * - MementoCore 7.0+
 * - MementoConfig 7.0+
 * - MementoUtils 7.0+
 * - MementoBusiness 7.0+
 * - MementoTelegram 8.0+
 *
 * Autor:       Memento Team
 * Vytvorené:   2024-03-15
 * Upravené:    2025-01-30
 *
 * ============================================================================
 */
```

### Povinné sekcie hlavičky:

1. **Knižnica** - Slovenský názov knižnice
2. **Názov** - Názov scriptu v konvencii
3. **Typ** - Typ scriptu + trigger typ (ak je trigger)
4. **Verzia** - Verzia scriptu (major.minor)
5. **Popis** - Stručný popis funkcionality (2-3 vety)
6. **Závislosti** - Zoznam potrebných Memento modulov s verziami
7. **Autor** - Autor/tím
8. **Vytvorené** - Dátum vytvorenia
9. **Upravené** - Dátum poslednej úpravy

---

## Pravidlá verzionovania

### Sémantické verziovanie: `MAJOR.MINOR`

- **MAJOR** - Breaking changes, nová architektúra, veľké refaktory
- **MINOR** - Nová funkcionalita, vylepšenia, bugfixy

**Príklady:**
- `1.0` - Prvá produkčná verzia
- `1.1` - Pridané nové funkcie
- `2.0` - Prepísaný na nový framework
- `8.0` - Aktuálna verzia s MementoUtils 7.0+

**Verzia je len v hlavičke, NIE v názve súboru!**

---

## Príklady premenovania

### Pred (staré názvy):
```
Dochádzka Prepočet 7.js
Dochádzka Individual Notifications 3.0.js
Dochádzka Before Delete Cleanup.js
Materiál Nastavenie polí Action.js
Materiál Prepočet ceny Bulk Action.js
Pokladňa prepočet dph.js
```

### Po (nové názvy):
```
Doch.Calc.Main.js
Doch.Notif.Individual.js
Doch.Trigger.BeforeDelete.js
Mat.Action.SetFields.js
Mat.BulkAction.UpdatePrices.js
Pokl.Calc.VAT.js
```

---

## Pravidlá pre názvy

### ✅ Správne:
- `Doch.Calc.Main.js`
- `Mat.Action.SetFields.js`
- `Zam.Calc.Universal.js`
- `Notif.Trigger.OnDelete.js`

### ❌ Nesprávne:
- `Dochádzka Prepočet.js` (celý názov knižnice)
- `Doch-Calc-Main.js` (pomlčky namiesto bodiek)
- `DochCalcMain.js` (camelCase)
- `Doch.Calc.Main.v8.js` (verzia v názve)
- `doch.calc.main.js` (malé písmená)

---

## Organizácia v adresároch

```
libraries/
├── dochadzka/
│   ├── Doch.Calc.Main.js
│   ├── Doch.Calc.Universal.js
│   ├── Doch.Calc.Custom.PeterBabicenko.js
│   ├── Doch.Trigger.BeforeDelete.js
│   ├── Doch.Notif.Individual.js
│   └── Doch.Notif.Group.js
│
├── kniha-jazd/
│   ├── Knij.Calc.Main.js
│   ├── Knij.Action.LinkOrders.js
│   └── Knij.Action.SetStartEnd.js
│
├── material/
│   ├── Mat.Calc.Receipts.js
│   ├── Mat.Calc.Issues.js
│   ├── Mat.Action.SetFields.js
│   ├── Mat.BulkAction.SetFields.js
│   ├── Mat.BulkAction.UpdatePrices.js
│   └── Mat.Button.CalcPrice.js
│
└── ...
```

---

## Špeciálne prípady

### Core moduly
Core moduly používajú vlastný formát:

```
core/
├── MementoCore7.js
├── config/MementoConfig7.js
├── utils/MementoUtils7.js
├── business/MementoBusiness7.js
└── integrations/
    ├── MementoAI7.js
    ├── MementoTelegram8.js
    └── MementoGPS.js
```

**Formát:** `Memento[Module][Version].js`
- Obsahuje číslo verzie v názve (výnimka z pravidla)
- Používa PascalCase

### Utility scripty
Utility scripty sú cross-library:

```
utils/
├── Utils.Action.Renumber.js
├── Utils.Action.ExtractLibraryIDs.js
└── Notif.Trigger.OnDelete.js
```

### Templates
```
templates/
└── Template.Script.js
```

---

## Migračný plán

1. ✅ Vytvorená adresárová štruktúra
2. ✅ Core moduly presunuté do `core/`
3. ⏳ Premenovanie library scriptov podľa konvencie
4. ⏳ Pridanie štandardizovaných hlavičiek
5. ⏳ Aktualizácia dokumentácie
6. ⏳ Testing po premenovaní

---

## Výhody konvencie

### 1. **Okamžitá identifikácia**
Z názvu súboru hneď vieš:
- Pre akú knižnicu je script
- Aký je jeho typ/účel
- Kde ho nájdeš v štruktúre

### 2. **Konzistentné organizovanie**
- Jednoduchá navigácia
- Logické zoskupenie
- Ľahké vyhľadávanie

### 3. **Lepšia údržba**
- Verziovanie v hlavičke
- Jasné závislosti
- Dokumentovaný účel

### 4. **IDE podpora**
- Autocomplete podľa prefixu
- Rýchle vyhľadávanie
- Lepšia navigácia

### 5. **Git friendly**
- Krátke názvy súborov
- Jasné commit messages
- Ľahké code review

---

## Quick Reference

### Najčastejšie typy:

| Typ | Použitie | Príklad |
|-----|----------|---------|
| `Calc.Main` | Hlavný prepočet | `Doch.Calc.Main.js` |
| `Trigger.BeforeDelete` | Cleanup | `Doch.Trigger.BeforeDelete.js` |
| `Action.X` | Manuálna akcia | `Mat.Action.SetFields.js` |
| `BulkAction.X` | Hromadná akcia | `Mat.BulkAction.UpdatePrices.js` |
| `Notif.Individual` | Notifikácie | `Doch.Notif.Individual.js` |

### Template pre nový script:

1. Kópíruj `templates/Template.Script.js`
2. Premenuj podľa konvencie: `[Lib].[Type].[Name].js`
3. Vyplň hlavičku
4. Implementuj funkcionalitu
5. Testuj
6. Commit + push

---

## Changelog

- **2025-01-30** - Vytvorená prvá verzia naming convention
- **2025-01-30** - Pridané typy: Calc, Trigger, Action, BulkAction, Button, Notif
- **2025-01-30** - Definovaná štruktúra hlavičky scriptu
