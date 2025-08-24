# 🚀 MEMENTO SCRIPT TEMPLATE - QUICK START GUIDE

## 📋 PRED POUŽITÍM TEMPLATE

### ✅ Checklist:
- [ ] **MementoCore v1.1+** je nainštalovaný a funguje
- [ ] **MementoUtils v3.3+** je dostupný
- [ ] Vieš presne **aká je funkcionalita** nového scriptu
- [ ] Máš definované **vstupné a výstupné polia**
- [ ] Poznáš **target knižnicu** kde bude script bežať

---

## 🛠️ POSTUP VYTVORENIA SCRIPTU (10 minút)

### **KROK 1: Setup (2 min)**
1. **Skopíruj celý template** do nového scriptu
2. **Nahraď všetky [PLACEHOLDER] hodnoty**:
   - `[NÁZOV SCRIPTU]` → skutočný názov
   - `[DD.MM.YYYY]` → dnešný dátum
   - `[MENO]` → tvoje meno
   - `[NÁZOV KNIŽNICE]` → cieľová knižnica
   - `[Before Save / After Save / Action]` → trigger type

### **KROK 2: CONFIG Setup (3 min)**
```javascript
// Aktualizuj CONFIG objekt:
var CONFIG = {
    debug: true,
    version: "1.0",
    scriptName: "TVOJ_SCRIPT_NAZOV",
    
    // 1. FIELDS - aktualizuj podľa cieľovej knižnice
    fields: {
        // Business fields
        datum: "Dátum",                    // ← názov poľa v knižnici
        zamestnanci: "Zamestnanci",        // ← link pole
        suma: "Suma",                      // ← číselné pole
        
        // System fields - nemeň!
        info: "info",
        debugLog: "Debug_Log",
        errorLog: "Error_Log"
    },
    
    // 2. ATTRIBUTES - ak pracuješ s linked entries
    attributes: {
        hodinovka: "hodinovka",           // ← názov atribútu
        odpracovane: "odpracované"        // ← názov atribútu
    },
    
    // 3. LIBRARIES - ktoré knižnice budeš používať
    libraries: {
        defaults: "ASISTANTO Defaults",
        targetLib: "NAZOV_KNIZNICE"       // ← tvoja cieľová knižnica
    },
    
    // 4. BUSINESS RULES - validácie a limity
    businessRules: {
        povinneFields: ["datum"]          // ← field keys z CONFIG.fields
    }
};
```

### **KROK 3: Business Logic (4 min)**
Implementuj tieto 4 kľúčové funkcie:

#### **A) validateInputData()** 
```javascript
function performCustomValidation() {
    // PRÍKLAD: Kontrola dátumu
    var datum = utils.safeGetField(currentEntry, CONFIG, "datum");
    if (!datum) {
        return { success: false, errors: ["Dátum je povinný"] };
    }
    
    // PRIDAJ TVOJE VALIDÁCIE
    return { success: true };
}
```

#### **B) processData()**
```javascript
function processData() {
    // PRÍKLAD: Spracovanie linked entries
    var zamestnanci = utils.safeGetField(currentEntry, CONFIG, "zamestnanci", []);
    
    // PRIDAJ TVOJU LOGIKU SPRACOVANIA
    
    return { success: true, data: processedData };
}
```

#### **C) executeBusinessLogic()**
```javascript
function executeBusinessLogic(processedData) {
    var results = {
        calculations: {},
        updates: []
    };
    
    // PRÍKLAD: Výpočty
    var totalAmount = 0;
    for (var i = 0; i < processedData.items.length; i++) {
        totalAmount += processedData.items[i].amount;
    }
    
    results.calculations.totalAmount = totalAmount;
    
    // PRIDAJ TVOJU BUSINESS LOGIKU
    
    return { success: true, results: results };
}
```

#### **D) saveResults()**
```javascript
function saveResults(results) {
    // PRÍKLAD: Uloženie výsledkov
    utils.safeSetField(currentEntry, CONFIG, "suma", results.calculations.totalAmount);
    
    // PRIDAJ TVOJE SAVE OPERÁCIE
    
    return { success: true, data: {} };
}
```

### **KROK 4: Test & Deploy (1 min)**
1. **Ulož script**
2. **Otestuj na vzorových dátach**
3. **Skontroluj logy** (Debug_Log, Error_Log, info)

---

## 🎯 NAJČASTEJŠIE USE CASES

### **📊 VÝPOČTOVÝ SCRIPT (Dochádzka, Mzdy)**
```javascript
// CONFIG aktualizácia:
fields: {
    zamestnanci: "Zamestnanci",
    prichod: "Príchod", 
    odchod: "Odchod",
    mzdoveNaklady: "Mzdové náklady"
},
attributes: {
    hodinovka: "hodinovka",
    odpracovane: "odpracované"
}

// Business logic focus:
// - processData(): spracuj zamestnancov a ich hodiny
// - executeBusinessLogic(): vypočítaj mzdy a náklady  
// - saveResults(): nastav vypočítané polia
```

### **🔗 SYNC SCRIPT (Záväzky, Notifikácie)**
```javascript
// CONFIG aktualizácia:
libraries: {
    zavazky: "Záväzky",
    notifications: "Notifications"
}

// Business logic focus:
// - processData(): identifikuj čo treba synchronizovať
// - executeBusinessLogic(): vytvor/aktualizuj záznamy v iných knižniciach
// - saveResults(): linkuj vytvorené záznamy späť
```

### **📧 NOTIFICATION SCRIPT**
```javascript
// CONFIG aktualizácia:
libraries: {
    notifications: "Notifications",
    telegramGroups: "Telegram Groups"
}

// Business logic focus:
// - processData(): priprav dáta pre správy
// - executeBusinessLogic(): vytvor notification entries
// - saveResults(): linkuj notifikácie na pôvodný záznam
```

### **📋 VALIDATION & CLEANUP SCRIPT**
```javascript
// Business logic focus:
// - validateInputData(): rozšírené validácie
// - processData(): identifikuj čo treba vyčistiť/opraviť
// - executeBusinessLogic(): vykonaj cleanup operácie
// - saveResults(): nastav oprávené hodnoty
```

---

## 🔧 ADVANCED FEATURES

### **Action Mode Support**
Template automaticky detekuje Action mode:
```javascript
// Funguje pre všetky 3 typy spustenia:
// ✅ Before Save trigger  
// ✅ After Save trigger
// ✅ Action button (viacero vybraných záznamov)
```

### **Business Module Integration**
```javascript
// Ak je MementoBusiness dostupný:
var business = getBusiness();
if (business) {
    var result = business.calculateWorkHours(start, end);
    // použij advanced business functions
} else {
    // fallback na základné výpočty
}
```

### **Config Adapter Support**
```javascript
// Template sa pokúsi použiť centrálny config:
if (typeof MementoConfigAdapter !== 'undefined') {
    var adapter = MementoConfigAdapter.getAdapter('attendance');
    // použije centrálnu konfiguráciu
} else {
    // fallback na lokálnu konfiguráciu
}
```

---

## 🐛 DEBUGGING TIPS

### **Štandardné logy format:**
```
Debug_Log:
[14:25:30] 🚀 === ŠTART Script Name v1.0 ===
[14:25:30] 📋 KROK 1: Validácia vstupných dát
[14:25:31] ✅ Validácia úspešná
[14:25:32] 🏁 === KONIEC - ✅ ÚSPECH ===

Error_Log:
[22.08.25 14:25] ❌ Script Name v1.0 - Error message (Loc: functionName)

info:
📋 SCRIPT COMPLETED
=====================================
⏰ Čas: 22.08.2025 14:25:32
📊 DÁTA:
• processedItems: 5
• totalAmount: 1250.00 €
```

### **Debugging checklist:**
- [ ] **Field mappings** sú správne (CONFIG.fields)
- [ ] **Library names** sú presné (CONFIG.libraries)  
- [ ] **Attribute names** sú presné (CONFIG.attributes)
- [ ] **Validation rules** pokrývajú všetky edge cases
- [ ] **Error handling** je implementovaný vo všetkých funkciách

---

## ⚠️ COMMON PITFALLS

### **❌ Čo NËROBIŤ:**
```javascript
// 1. Priamy field access namiesto CONFIG
var datum = currentEntry.field("Dátum");           // ❌ BAD
var datum = utils.safeGetField(currentEntry, CONFIG, "datum"); // ✅ GOOD

// 2. Hardcoded library names  
var lib = libByName("Záväzky");                    // ❌ BAD
var lib = libByName(CONFIG.libraries.zavazky);     // ✅ GOOD

// 3. Chýbajúce error handling
var result = riskyFunction();                      // ❌ BAD
try {                                              // ✅ GOOD
    var result = riskyFunction();
} catch (error) {
    utils.addError(currentEntry, CONFIG, error.toString(), "location", error);
}

// 4. Zabudnuté lifecycle funkcie
// Na začiatku main():
utils.logScriptStart(currentEntry, CONFIG);        // ✅ POVINNÉ

// Na konci main():  
utils.logScriptEnd(currentEntry, CONFIG, success, summary); // ✅ POVINNÉ
```

### **✅ Best Practices:**
- **Vždy používaj CONFIG mappings** pre field access
- **Implementuj comprehensive error handling** 
- **Testuj všetky edge cases** (prázdne polia, neexistujúce linky)
- **Dokumentuj business rules** v CONFIG objekte
- **Používaj meaningful debug messages** pre troubleshooting

---

## 🎓 TEMPLATE MASTERY LEVELS

### **🥉 BRONZE - Basic Usage (5 min)**
- Skopíruj template
- Aktualizuj CONFIG.fields 
- Implementuj basic business logic
- Test & deploy

### **🥈 SILVER - Advanced Features (15 min)**  
- Custom validation rules
- Cross-library operations
- Enhanced error handling
- Business module integration

### **🥇 GOLD - Expert Level (30 min)**
- Config adapter integration
- Complex business workflows
- Performance optimization
- Comprehensive test coverage

---

## 📚 ĎALŠIE RESOURCES

### **Súvisiace scripty pre štúdium:**
- `Dochádzka Prepočítať záznam 5.1.js` - výpočtový pattern
- `Dochádzka Sync záväzkov 4.3.js` - sync pattern  
- `Notifications Helper 2.1.js` - notification pattern
- `Dochádzka Orchestrator 1.0.js` - orchestration pattern

### **Knowledge base odkazy:**
- MementoCore v1.1 dokumentácia
- MementoUtils v3.3 API reference
- Field mapping best practices
- Error handling guidelines

---

## 🚀 QUICK START CHECKLIST

Pred začatím nového scriptu:
- [ ] **Template skopírovaný** do nového súboru
- [ ] **Všetky [PLACEHOLDER]** nahradené
- [ ] **CONFIG.fields** aktualizované podľa knižnice
- [ ] **CONFIG.libraries** obsahujú všetky potrebné knižnice  
- [ ] **Business logic functions** implementované
- [ ] **Script otestovaný** na vzorových dátach
- [ ] **Logy skontrolované** (Debug_Log, Error_Log, info)
- [ ] **User message** je informatívny a užitočný

**Čas od template po funkčný script: ~10 minút** ⚡