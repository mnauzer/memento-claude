# Dochádzka Scripts

## Prehľad scriptov

### 📚 Knižnice (Shared Scripts)

#### `Doch.Calc.Lib.js`
**Typ:** Calculation Library (Shared Script)
**Použitie:** Import v iných scriptoch

Hlavná knižnica pre prepočet dochádzky. Poskytuje funkciu `dochCalcMain()` ktorú môžu volať iné scripty.

**API:**
```javascript
var result = dochCalcMain(entry, options);
```

**Parametre:**
- `entry` - Entry objekt záznamu dochádzky
- `options` - Voliteľné nastavenia (objekt):
  - `roundToQuarter` (boolean) - Zaokrúhľovať na 15 minút (default: true)
  - `includeBreaks` (boolean) - Započítať prestávky (default: true)

**Návratová hodnota:**
```javascript
{
    success: boolean,
    error?: string,          // Ak success = false
    data?: {                 // Ak success = true
        date: Date,
        workTime: number,
        employees: Array,
        totalWorkedHours: number,
        totalWageCosts: number,
        downtime: number,
        obligations: Array
    }
}
```

**Funkcie:**
- Validácia vstupných dát
- Výpočet pracovnej doby s zaokrúhlením
- Spracovanie všetkých zamestnancov
- Výpočet miezd podľa sadzieb
- Výpočet prestojov
- Vytvorenie záväzkov
- Nastavenie farieb (víkendy, sviatky)

---

### 🔧 Trigger Scripts

#### `Doch.Trigger.Calculate.js`
**Typ:** Trigger (Before Save)
**Popis:** Plne dokumentovaný trigger s error handlingom a user feedback

```javascript
var en = entry();
var options = {
    roundToQuarter: true,
    includeBreaks: true
};

var result = dochCalcMain(en, options);

if (!result.success) {
    message("❌ Chyba: " + result.error);
    cancel();
} else {
    message("✅ Prepočet OK");
}
```

#### `Doch.Trigger.Simple.js`
**Typ:** Trigger (Before Save)
**Popis:** Minimalistický trigger - len 3 riadky kódu

```javascript
var result = dochCalcMain(entry());
if (!result.success) {
    message("❌ " + result.error);
    cancel();
}
```

#### `Doch.Calc.Main.js`
**Typ:** Trigger (Before Save)
**Popis:** Pôvodný monolitický script (zachovaný pre kompatibilitu)

Obsahuje celú logiku priamo v jednom súbore. Používa sa samostatne bez knižnice.

---

### 📊 Calculation Scripts

#### `Doch.Calc.Universal.js`
**Typ:** Universal Calculator
**Popis:** Univerzálny kalkulátor dochádzky

#### `Doch.Calc.Custom.PeterBabicenko.js`
**Typ:** Custom Calculator
**Popis:** Špecializovaný kalkulátor pre konkrétneho zamestnanca

---

### 📱 Notification Scripts

#### `Doch.Notif.Individual.js`
**Typ:** Notification Script
**Popis:** Individuálne Telegram notifikácie

---

### 🗑️ Cleanup Scripts

#### `Doch.Trigger.BeforeDelete.js`
**Typ:** Trigger (Before Delete)
**Popis:** Cleanup notifikácií a prepojení pred zmazaním

---

## Použitie knižnice Doch.Calc.Lib

### 1. Ako Shared Script v Memento Database

1. Nahraj `Doch.Calc.Lib.js` ako **Shared Script** v Memento Database
2. V tvojom trigger scripte ho použij priamo (automaticky dostupný)

### 2. Základné použitie

```javascript
// Minimálne použitie
var result = dochCalcMain(entry());

if (!result.success) {
    message("Chyba: " + result.error);
    cancel();
}
```

### 3. Pokročilé použitie s nastaveniami

```javascript
var en = entry();

var options = {
    roundToQuarter: true,   // Zaokrúhľovanie na 15 min
    includeBreaks: false    // Bez prestávok
};

var result = dochCalcMain(en, options);

if (!result.success) {
    message("❌ Prepočet zlyhal: " + result.error);
    cancel();
} else {
    var data = result.data;

    message("✅ Dokončené!\n" +
            "Pracovníkov: " + data.employees.length + "\n" +
            "Odpracované: " + data.totalWorkedHours + "h\n" +
            "Mzdy: " + data.totalWageCosts.toFixed(2) + "€");
}
```

### 4. Použitie v Action scripte

```javascript
// Hromadný prepočet všetkých záznamov
var lib = libByName("Dochádzka");
var entries = lib.entries();

var processed = 0;
var errors = 0;

for (var i = 0; i < entries.length; i++) {
    var result = dochCalcMain(entries[i]);

    if (result.success) {
        processed++;
    } else {
        errors++;
        console.log("Chyba v zázname " + entries[i].name + ": " + result.error);
    }
}

message("Prepočítané: " + processed + ", Chyby: " + errors);
```

## Výhody knižničnej architektúry

### ✅ Jednoduchosť
- Trigger script má len 3-5 riadkov
- Všetka logika v jednej knižnici
- Jednoduchá údržba

### ✅ Znovupoužiteľnosť
- Jedna knižnica pre všetky trigger scripty
- Použiteľné v action scriptoch
- Použiteľné v iných knižniciach

### ✅ Konzistencia
- Všetky scripty používajú rovnakú logiku
- Jedna verzia, jedno miesto úprav
- Žiadne duplikáty kódu

### ✅ Testovateľnosť
- Jednoduchý unit testing
- Izolovaná logika
- Jasné vstupy/výstupy

### ✅ Error Handling
- Štruktúrované error handling
- Jasné návratové hodnoty
- Detailné error messages

## Migrácia z Doch.Calc.Main

### Postup:

1. **Nahraj Doch.Calc.Lib.js** ako Shared Script
2. **Vytvor nový trigger** (Doch.Trigger.Simple.js alebo Doch.Trigger.Calculate.js)
3. **Otestuj** na testovacích záznamoch
4. **Prepni trigger** z Doch.Calc.Main na nový
5. **Doch.Calc.Main** môžeš nechať ako zálohu

### Rozdiel:

**Predtým (Doch.Calc.Main.js - 1729 riadkov):**
```javascript
// Celá logika priamo v trigger scripte
var utils = MementoUtils;
var config = utils.getConfig();
// ... 1700+ riadkov kódu ...
var result = main();
if (!result) cancel();
```

**Teraz (Doch.Trigger.Simple.js - 3 riadky):**
```javascript
var result = dochCalcMain(entry());
if (!result.success) {
    message("❌ " + result.error);
    cancel();
}
```

## Závislosti

Všetky scripty vyžadujú tieto Memento moduly:
- **MementoCore** 7.0+
- **MementoConfig** 7.0+
- **MementoUtils** 7.0+
- **MementoBusiness** 7.0+

Knižnica automaticky kontroluje dostupnosť modulov.

## Versioning

- **Doch.Calc.Lib** - v1.0 (nová knižničná verzia)
- **Doch.Calc.Main** - v7.3 (pôvodná verzia)

Verzia je uvedená v hlavičke scriptu, nie v názve súboru.
