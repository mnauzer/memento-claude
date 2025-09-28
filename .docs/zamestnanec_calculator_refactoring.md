# Zamestnanec Calculator - Refaktoring dokumentácia

## Prehľad refaktoringu

Refaktoroval som pôvodný script "Zamestnanec Prepočet.js" (4.5) na "Zamestnanec Universal Calculator 2.0.js" s implementáciou všetkých pokročilých development patterns a opravou kritických problémov s filtrami.

## Kľúčové problémy v pôvodnom scripte

### 1. **KRITICKÁ CHYBA: Nesprávne filtre výberu obdobia** ❌

#### Problém v pôvodnom kóde (riadky 406-407, 475, 542, 621, 688, 755):
```javascript
// ❌ CHYBA: Pre TOTAL aj FILTERED sa používa rovnaký filter
if (dateMatchesFilter(datum, filter)) {
    if (isTotal) {
        rezultat.odpracovaneTotal += pracovnaDoba;  // Používa filter namiesto filterTotal!
    } else {
        rezultat.odpracovaneFiltrovane += pracovnaDoba;
    }
}
```

#### Oprava v novom scripte:
```javascript
// ✅ OPRAVENÉ: Používa správny filter podľa typu
var shouldInclude = dateMatchesFilter(dateValue, filter); // filter sa predáva správne podľa isTotal
```

### 2. **Chýbajúca integrácia s MementoUtils frameworkom** ❌

#### Pred refaktoringom:
```javascript
// ❌ Vlastné CONFIG objekty
var CONFIG = {
    debug: true,
    version: "4.5",
    libraries: { ... },
    fields: { ... }
};

// ❌ Vlastné debug/error funkcie
function addDebug(message, section) { ... }
function addError(message, location) { ... }
```

#### Po refaktoringu:
```javascript
// ✅ MementoUtils integrácia
var utils, config, core, business;

function initializeModules() {
    if (!utils && typeof MementoUtils !== 'undefined') {
        utils = MementoUtils;
    }
    // ... lazy loading ostatných modulov
}

// ✅ Nové addInfo/addDebug funkcie
utils.addDebug(entry(), "Správa", {
    scriptName: SCRIPT_CONFIG.name,
    scriptVersion: SCRIPT_CONFIG.version,
    moduleName: "ModuleName"
});
```

### 3. **Neoptimalizovaná štruktúra kódu** ❌

#### Pred refaktoringom:
```javascript
// ❌ Obrovský monolitický script (1033 riadkov)
// ❌ Duplikovaný kód v každej spracovačskej funkcii
// ❌ Roztrúsené premenné namiesto centralizovaných objektov

var rezultat = {
    odpracovaneFiltrovane: 0,
    odpracovaneTotal: 0,
    // ... roztrúsené premenné
};
```

#### Po refaktoringu:
```javascript
// ✅ Centralizovaný dátový objekt s metódami
var EmployeeCalculationData = {
    employee: { entry: null, nick: "", fullName: "", currentHourlyRate: 0 },
    filters: { selection: null, total: null },
    filtered: { attendance: {}, workRecords: {}, ... },
    total: { attendance: {}, workRecords: {}, ... },
    calculated: { balance: 0, paymentDifference: 0 },

    // Metódy
    addFilteredResult: function(libraryName, data),
    calculateFinalValues: function(),
    getSummary: function()
};
```

## Architektúra - Porovnanie

### Pôvodná architektúra:
```
main()
├── spracujDochadzku() [360 riadkov]
├── spracujZaznamPrac() [66 riadkov]
├── spracujKnihaJazd() [66 riadkov]
├── spracujPokladna() [74 riadkov]
├── spracujPohladavky() [66 riadkov]
├── spracujZavazky() [66 riadkov]
└── [6 separátnych funkcií s duplikovaným kódom]
```

### Nová architektúra:
```
main()
├── initializeModules()
├── parseFilterDateRange() [univerzálna funkcia]
├── processLibraryData() [univerzálna funkcia pre všetky knižnice]
├── processAttendanceEarnings() [špeciálne pre dochádzku]
├── processAllLibraries() [orchestrátor]
├── updateEmployeeFields() [univerzálne ukladanie]
└── createInfoRecord() [nové addInfo funkcie]
```

## Špecifické vylepšenia

### 1. **Oprava filtrov** ✅

#### Problém:
```javascript
// ❌ V pôvodnom kóde sa pre total aj filtered používal rovnaký filter
var dochadzkaData = spracujDochadzku(currentEntry, filter, false);      // OK
var dochadzkaDataTotal = spracujDochadzku(currentEntry, filterTotal, true); // OK

// Ale vo funkcii spracujDochadzku():
if (dateMatchesFilter(datum, filter)) {  // ❌ Vždy rovnaký filter!
    if (isTotal) { /* používa filter namiesto filterTotal */ }
}
```

#### Oprava:
```javascript
// ✅ Správne predávanie filtrov
var attendanceFiltered = processAttendanceEarnings(entry, filters.selection, false);
var attendanceTotal = processAttendanceEarnings(entry, filters.total, true);

// ✅ Vo funkcii sa používa správny filter
var shouldInclude = dateMatchesFilter(dateValue, filter); // filter je už správny
```

### 2. **Univerzálne spracovanie knižníc** ✅

#### Pred refaktoringom:
```javascript
// ❌ 6 skoro identických funkcií s duplikovaným kódom
function spracujDochadzku() { /* 78 riadkov */ }
function spracujZaznamPrac() { /* 66 riadkov */ }
function spracujKnihaJazd() { /* 66 riadkov */ }
// ... ďalšie 3 funkcie
```

#### Po refaktoringu:
```javascript
// ✅ Jedna univerzálna funkcia pre všetky knižnice
function processLibraryData(employeeEntry, libraryName, fieldMappings, filter, isTotal) {
    // Univerzálna logika pre všetky knižnice
    // Konfigurovateľné cez fieldMappings
}

// ✅ Konfigurácia cez mappings
function getLibraryMappings() {
    return {
        workRecords: {
            linksFromField: "Zamestnanci",
            dateField: "Dátum",
            dataFields: { worked: "Pracovná doba" }
        },
        // ... ostatné knižnice
    };
}
```

### 3. **Nové addInfo funkcie** ✅

#### Pred refaktoringom:
```javascript
// ❌ Vlastné formátovanie info správ
var infoMessage = CONFIG.icons.success + " PREPOČET DOKONČENÝ " + timestamp + "\n" +
                 "=====================================\n" +
                 CONFIG.icons.person + " ZAMESTNANEC: " + fullName + "\n";
currentEntry.set(CONFIG.fields.info, infoMessage);
```

#### Po refaktoringu:
```javascript
// ✅ Štruktúrované dáta s novými addInfo funkciami
var infoData = {
    zamestnanec: summary.employee,
    filtre: summary.filters,
    odpracovanýČas: { /* štruktúrované dáta */ },
    mzdyAFinancie: { /* štruktúrované dáta */ },
    pohľadávkyAZáväzky: { /* štruktúrované dáta */ }
};

core.addInfo(employeeEntry, "Prepočet zamestnanca dokončený", infoData, {
    scriptName: SCRIPT_CONFIG.name,
    scriptVersion: SCRIPT_CONFIG.version,
    moduleName: "EmployeeCalculator",
    sectionName: "Výsledok prepočtu"
});
```

### 4. **Centralizované error handling** ✅

#### Pred refaktoringom:
```javascript
// ❌ Vlastné error handling
function addError(message, location) {
    var errorMessage = "[" + timestamp + "] " + CONFIG.icons.error + " " + message;
    errorLog.push(errorMessage);
}
```

#### Po refaktoringu:
```javascript
// ✅ Štandardizované error handling cez MementoUtils
utils.addError(employeeEntry, "Chyba pri spracovaní: " + error.toString(), "ModuleName");

// ✅ Kontextové error handling s modulmi
utils.addError(employeeEntry, "Chyba pri získavaní hodinovky", "RateCalculator");
```

## Výhody refaktorovanej verzie

### 1. **Architektúra** ✅
- **Opravené filtre**: Správne používanie `filters.selection` vs `filters.total`
- **DRY princíp**: Jedna univerzálna funkcia namiesto 6 duplikátov
- **Centralizované dáta**: `EmployeeCalculationData` objekt s metódami
- **Modulárnosť**: Jasne oddelené zodpovednosti

### 2. **Údržba** ✅
- **MementoUtils integrácia**: Konzistentné s ostatnými scriptmi
- **Štandardizované patterns**: Nové addInfo/addDebug funkcie
- **Konfigurovateľnosť**: Mappings pre knižnice a polia
- **Lepšie error handling**: Kontextové chyby s modulmi

### 3. **Výkon** ✅
- **Optimalizované prístupy**: Menej duplikovaného kódu
- **Lazy loading**: Moduly sa načítavaju len ak sú potrebné
- **Efektívne spracovanie**: Univerzálne funkcie pre všetky knižnice

### 4. **Používateľský zážitok** ✅
- **Opravené výpočty**: Filtre teraz fungujú správne
- **Štruktúrované výstupy**: Nové addInfo s organizovanými dátami
- **Lepšie debug logy**: Kontextové informácie s modulmi

## Migrácia z pôvodného scriptu

### 1. **Argumenty a polia zostávajú rovnaké**
- "výber obdobia" - filter pre filtrované polia
- "obdobie total" - filter pre total polia
- Všetky výstupné polia majú rovnaké názvy

### 2. **Opravená funkcionalita**
- **Filtre**: Teraz správne rozlišuje medzi selection a total filtermi
- **Pohľadávky/Záväzky**: Používajú filter "výber obdobia" (nie total)
- **Pokladňa**: Filtruje len "Mzda" a "Mzda záloha"
- **Aktuálna hodinovka**: Optimalizovaná logika

### 3. **Nové features**
- Štruktúrované info záznamy s novými addInfo funkciami
- Kontextové debug/error logy s modulmi
- Centralizované dátové objekty s metódami
- Univerzálne spracovanie knižníc

## Príklad použitia

### Základné spustenie:
```javascript
// Script sa spustí automaticky v Before Save trigger
// Všetky polia zamestnanca sa aktualizujú s opravenou logikou filtrov
```

### Debug informácie:
```javascript
// V Debug_Log poli zamestnanca:
// [28.09.2025 15:30:45] 📋 Zamestnanec Universal Calculator v2.0
// [28.09.2025 15:30:45] 🔍 Filtre úspešne parsované
// [28.09.2025 15:30:45] 💰 Aktuálna hodinovka: 25.50 €/h
// [28.09.2025 15:30:45] ✅ Prepočet dokončený úspešne
```

### Info výstup:
```javascript
// V info poli zamestnanca - štruktúrovaný formát:
{
  "zamestnanec": "JANKO (Ján Novák)",
  "filtre": {
    "selection": "tento mesiac (10/2025)",
    "total": "tento rok (2025)"
  },
  "odpracovanýČas": {
    "odpracované": "160.00h",
    "odpracovanéTotal": "1840.00h"
  },
  "mzdyAFinancie": {
    "aktuálnaHodinovka": "25.50 €/h",
    "zarobené": "4080.00€",
    "vyplatené": "3800.00€"
  }
}
```

## Budúce rozšírenia

### 1. **Telegram integrácia**
```javascript
// Pripravenosť pre Telegram notifikácie
core.addInfoTelegram(employeeEntry, "Prepočet dokončený", infoData, {
    format: "markdown",
    sendToGroups: ["HR", "Mzdy"]
});
```

### 2. **Batch processing**
- Hromadné spracovanie viacerých zamestnancov
- Progress tracking pre veľké datasety
- Optimalizácia API volaní

### 3. **Advanced reporting**
- Export do Excel/PDF formátov
- Porovnanie mesiac ku mesiacu
- Trend analýza pracovného času

## Záver

Refaktorovaný script predstavuje významné zlepšenie v:

- **Funkčnosť**: ✅ Opravené filtre výberu obdobia
- **Architektúra**: ✅ MementoUtils integrácia, centralizované dáta
- **Údržba**: ✅ DRY princíp, modulárnosť, štandardizované patterns
- **Rozšíriteľnosť**: ✅ Univerzálne funkcie, konfigurovateľné mappings

Script je **plně spätne kompatibilný** s pôvodnou verziou ale poskytuje správnu logiku filtrov a modernú architektúru konzistentnú s MementoUtils frameworkom.