# Memento Framework - Kompletný manuál

## 📋 Obsah
1. [Úvod do Memento Framework](#úvod)
2. [MementoConfig - Konfigurácia](#mementoconfig)
3. [MementoCore - Základné funkcie](#mementocore)
4. [MementoUtils - Agregátor modulov](#mementoutils)
5. [MementoBusiness - Business logika](#mementobusiness)
6. [MementoAI - AI integrácia](#mementoai)
7. [MementoTelegram - Telegram API](#mementotelegram)
8. [Praktické príklady použitia](#praktické-príklady)
9. [Najlepšie praktiky](#najlepšie-praktiky)

## 📚 Úvod do Memento Framework {#úvod}

Memento Framework je komplexný systém modulov pre Memento Database, ktorý poskytuje štandardizované API pre:

- **Centralizovanú konfiguráciu** (názvy knižníc, polí, atribútov)
- **Základné utility funkcie** (logging, formátovanie, validácia)
- **Business logiku** (mzdy, dochádzka, výpočty)
- **AI integráciu** (OpenAI, Claude)
- **Telegram notifikácie** (bot API, správy, skupiny)

### Architektúra frameworku

```
MementoUtils (agregátor)
    ├── MementoConfig (konfigurácia)
    ├── MementoCore (základné funkcie)
    ├── MementoBusiness (business logika)
    ├── MementoAI (AI služby)
    └── MementoTelegram (Telegram API)
```

### Lazy Loading
Framework používa lazy loading - moduly sa načítajú až pri prvom použití, čo zabezpečuje optimálny výkon.

---

## ⚙️ MementoConfig - Konfigurácia {#mementoconfig}

Centrálny konfiguračný modul pre všetky ostatné moduly.

### Základné použitie

```javascript
// Získanie celej konfigurácie
var config = MementoConfig.getConfig();

// Získanie konkrétnej hodnoty
var libraryName = MementoConfig.getLibrary("attendance"); // "Dochádzka"
var fieldName = MementoConfig.getField("attendance", "date"); // "Dátum"

// Cez cestu
var dateFormat = MementoConfig.get("global.dateFormat"); // "DD.MM.YYYY"
```

### Hlavné sekcie konfigurácie

#### 🏢 Knižnice (libraries)
```javascript
// Základné knižnice
config.libraries.attendance        // "Dochádzka"
config.libraries.workRecords       // "Záznam prác"
config.libraries.rideLog           // "Kniha jázd"
config.libraries.cashBook          // "Pokladňa"
config.libraries.employees         // "Zamestnanci"
config.libraries.notifications     // "Notifications"

// Systémové knižnice
config.libraries.defaults          // "ASISTANTO Defaults"
config.libraries.apiKeys           // "ASISTANTO API"
```

#### 📝 Polia (fields)
```javascript
// Spoločné polia
config.fields.common.id            // "ID"
config.fields.common.debugLog      // "Debug_Log"
config.fields.common.errorLog      // "Error_Log"
config.fields.common.notifications // "Notifikácie"

// Dochádzka polia
config.fields.attendance.date      // "Dátum"
config.fields.attendance.employees // "Zamestnanci"
config.fields.attendance.workTime  // "Pracovná doba"

// Zamestnanci
config.fields.employee.nick        // "Nick"
config.fields.employee.telegramId  // "Telegram ID"
```

#### 🔧 Atribúty (attributes)
```javascript
// Atribúty zamestnancov
config.attributes.employees.workedHours  // "odpracované"
config.attributes.employees.hourlyRate   // "hodinovka"
config.attributes.employees.dailyWage    // "denná mzda"
```

#### 🎨 Ikony a konštanty
```javascript
// Ikony
config.icons.success     // "✅"
config.icons.error       // "❌" 
config.icons.telegram    // "📱"

// Konštanty
config.constants.status.active        // "Aktívny"
config.constants.obligationStates.unpaid // "Neuhradené"
```

### API funkcie

```javascript
// Získanie knižnice
MementoConfig.getLibrary("employees")

// Získanie poľa
MementoConfig.getField("attendance", "date")
MementoConfig.getCommonField("debugLog")

// Získanie atribútu
MementoConfig.getAttribute("employees", "workedHours")

// Získanie konštanty
MementoConfig.getConstant("status", "active")

// Získanie ikony
MementoConfig.getIcon("success")

// Kontroly existencie
MementoConfig.hasLibrary("attendance")
MementoConfig.hasField("attendance", "date")
```

---

## 🔧 MementoCore - Základné funkcie {#mementocore}

Poskytuje základné utility funkcie pre všetky ostatné moduly.

### Logging funkcie

```javascript
// Debug správy
MementoCore.addDebug(entry, "Spracovávam záznam", "info");

// Chybové správy  
MementoCore.addError(entry, "Chyba pri validácii", "validation", error);

// Info správy
MementoCore.addInfo(entry, "Spracovanie dokončené", {count: 5});

// Vyčistenie logov
MementoCore.clearLogs(entry, true); // true = vyčistiť aj chyby
```

### Safe field access

```javascript
// Bezpečné získanie hodnoty
var hodnota = MementoCore.safeGet(entry, "Názov", "default");

// Bezpečné nastavenie hodnoty  
var success = MementoCore.safeSet(entry, "Stav", "Aktívny");

// Práca s atribútmi
var hodinovka = MementoCore.safeGetAttribute(entry, "Zamestnanci", "hodinovka", 0);
MementoCore.safeSetAttribute(entry, "Zamestnanci", "hodinovka", 12.50, 0);

// Práca s linkmi
var links = MementoCore.safeGetLinks(entry, "Projekty");
var linksFrom = MementoCore.safeGetLinksFrom(entry, "Faktúry", "Zákazník");
```

### Formátovanie

```javascript
// Formátovanie dátumu
var datum = MementoCore.formatDate(new Date(), "DD.MM.YYYY"); 

// Formátovanie času
var cas = MementoCore.formatTime("08:30");

// Formátovanie peňazí
var suma = MementoCore.formatMoney(1250.50, "€"); // "1250.50 €"

// Časové výpočty
var minuty = MementoCore.parseTimeToMinutes("08:30"); // 510
var zaokruhleny = MementoCore.roundTimeToQuarter("08:37"); // 08:30/08:45

// Konverzie
var hodiny = MementoCore.convertDurationToHours(3600000); // 1.0
var milisek = MementoCore.convertHoursToDuration(1.5); // 5400000
```

### Validácia

```javascript
// Validácia povinných polí
var isValid = MementoCore.validateRequiredFields(entry, ["Názov", "Dátum"]);
```

### Utility funkcie

```javascript
// Nájdenie záznamu podľa ID
var zaznam = MementoCore.findEntryById("Zamestnanci", "12345");

// Aktuálny používateľ
var user = MementoCore.getCurrentUser();

// Slovenské pomocné funkcie
var denNazov = MementoCore.getDayNameSK(1); // "PONDELOK"
var forma = MementoCore.getPersonCountForm(5); // "osôb"

// Sviatky a víkendy
var isWeekend = MementoCore.isWeekend(new Date());
var isHoliday = MementoCore.isHoliday(new Date());
```

### Práca s farbami

```javascript
// Nastavenie farby pozadia
MementoCore.setColor(entry, "background", "light blue");

// Nastavenie farby textu
MementoCore.setColor(entry, "foreground", "#FF0000");

// Podmienené farby
MementoCore.setColorByCondition(entry, "error");   // Červená
MementoCore.setColorByCondition(entry, "warning"); // Žltá
MementoCore.setColorByCondition(entry, "success"); // Zelená

// Odstránenie farieb
MementoCore.removeColor(entry, "both");

// Získanie aktuálnej farby
var farba = MementoCore.getColor(entry, "background");
```

---

## 🔀 MementoUtils - Agregátor modulov {#mementoutils}

Hlavný prístupový bod pre všetky moduly. Poskytuje jednotné API a lazy loading.

### Základné použitie

```javascript
// Prístup k CONFIG
var config = MementoUtils.config;
var libraryName = MementoUtils.getLibrary("attendance");

// Core funkcie
MementoUtils.addDebug(entry, "Test správa");
MementoUtils.safeSet(entry, "Pole", "hodnota");

// Business funkcie  
var hours = MementoUtils.calculateWorkHours("08:00", "16:30");
var employee = MementoUtils.findEmployeeByNick("jan.novak");

// Telegram funkcie
MementoUtils.sendTelegramMessage(chatId, "Správa");

// AI funkcie
var response = MementoUtils.callAI("OPENAI", "Zhrň tento text");
```

### Kontrola závislostí

```javascript
// Kontrola načítaných modulov
var modules = MementoUtils.getLoadedModules();
// {config: "7.0", core: "7.0", business: "7.0", ...}

// Kontrola závislostí pre script
var check = MementoUtils.checkDependencies(["core", "telegram"]);
if (!check.success) {
    message("Chýbajú moduly: " + check.missing.join(", "));
}

// Debug informácie
MementoUtils.debugModules(entry);
```

### Vytvorenie CONFIG pre script

```javascript
var CONFIG = MementoUtils.createScriptConfig("Môj Script", "1.0");
// Obsahuje všetky sekcie z MementoConfig + script metadata
```

---

## 💼 MementoBusiness - Business logika {#mementobusiness}

Poskytuje business funkcie pre prácu s dochádzkou, mzdami a zamestnancami.

### Časové výpočty

```javascript
// Výpočet pracovných hodín
var result = MementoBusiness.calculateWorkHours("08:00", "16:30");
// {
//   hours: 8.5,
//   minutes: 30, 
//   regularHours: 8,
//   overtimeHours: 0.5,
//   crossesMidnight: false,
//   formatted: "08:30"
// }
```

### Práca so zamestnancami

```javascript
// Nájdenie zamestnanca podľa nick
var employee = MementoBusiness.findEmployeeByNick("jan.novak");

// Formátovanie mena
var fullName = MementoBusiness.formatEmployeeName(employee);
// "jan.novak (Novák)" alebo "Ján Novák"

// Detaily zamestnanca
var details = MementoBusiness.getEmployeeDetails(employee, new Date());
// {
//   id: "123",
//   nick: "jan.novak",
//   fullName: "Ján Novák", 
//   hourlyRate: 12.50,
//   telegramId: "123456789"
// }

// Aktívni zamestnanci
var active = MementoBusiness.getActiveEmployees();
```

### Mzdy a sadzby

```javascript
// Hodinová sadzba pre dátum
var wageData = MementoBusiness.getEmployeeWageForDate(employee, new Date());
// {
//   hourlyRate: 12.50,
//   rateType: "Základná",
//   validFrom: Date,
//   validTo: null
// }

// Výpočet dennej mzdy
var wage = MementoBusiness.calculateDailyWage(employee, 8.5, new Date());
// {
//   wage: 106.25,
//   hourlyRate: 12.50,
//   regularHours: 8,
//   overtimeHours: 0.5,
//   overtimeWage: 15.63
// }

// Nájdenie platnej sadzby
var rate = MementoBusiness.findValidHourlyRate(employee, new Date());
```

### Ceny prác a materiálu

```javascript
// Platná cena práce
var price = MementoBusiness.findValidWorkPrice(workEntry, new Date());

// Platná cena položky
var itemPrice = MementoBusiness.findValidItemPrice(itemEntry, new Date());
```

### Záväzky

```javascript
// Vytvorenie záväzku
var success = MementoBusiness.createObligation(date, {
    entry: employeeEntry,
    name: "Ján Novák", 
    dailyWage: 100.0
}, "employee");

// Aktualizácia záväzku
MementoBusiness.updateObligation(date, obligationEntry, 120.0);

// Nájdenie existujúcich záväzkov
var obligations = MementoBusiness.findExistingObligations("employee");
```

### Štatistiky

```javascript
// Mesačné štatistiky zamestnanca
var stats = MementoBusiness.calculateMonthlyStats(employee, 3, 2025);
// {
//   totalDays: 22,
//   workDays: 20,
//   weekends: 2,
//   totalHours: 160,
//   totalWage: 2000,
//   overtimeHours: 5
// }
```

---

## 🤖 MementoAI - AI integrácia {#mementoai}

Poskytuje integráciu s AI službami ako OpenAI a Claude.

### Základné AI volania

```javascript
// OpenAI volanie
var response = MementoAI.callAI("OPENAI", "Zhrň tento text", {
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: "Si užitočný asistent."
});

if (response.success) {
    message(response.content);
} else {
    message("Chyba: " + response.error);
}

// Claude volanie
var claudeResponse = MementoAI.callAI("CLAUDE", "Analyzuj tieto dáta", {
    model: "claude-3-sonnet-20240229",
    maxTokens: 1500
});
```

### Analýza obrázkov

```javascript
// Analýza obrázka
var analysis = MementoAI.analyzeImage(
    "https://example.com/image.jpg",
    "Čo je na tomto obrázku?",
    {
        detail: "high",
        maxTokens: 1000
    }
);

if (analysis.success) {
    message("Analýza: " + analysis.content);
}
```

### HTTP requesty

```javascript
// Všeobecný HTTP request
var response = MementoAI.httpRequest("POST", "https://api.example.com/data", {
    key: "value"
}, {
    "Authorization": "Bearer token",
    "Content-Type": "application/json"
});

if (response.code === 200) {
    var data = JSON.parse(response.body);
}
```

### Pomocné funkcie

```javascript
// Príprava promptu s kontextom
var fullPrompt = MementoAI.preparePromptWithContext("Analyzuj dáta", {
    entry: entry(),
    library: "Dochádzka",
    data: {count: 5}
});

// Parsovanie JSON z AI odpovede
var jsonData = MementoAI.parseAIJson(response.content);
```

### Dostupné AI providery

```javascript
// Zoznam poskytovateľov
var providers = MementoAI.AI_PROVIDERS;

// OpenAI modely
providers.OPENAI.models.GPT4           // "gpt-4"
providers.OPENAI.models.GPT4_VISION    // "gpt-4-vision-preview"

// Claude modely  
providers.CLAUDE.models.CLAUDE_3_OPUS   // "claude-3-opus-20240229"
providers.CLAUDE.models.CLAUDE_3_SONNET // "claude-3-sonnet-20240229"
```

---

## 📱 MementoTelegram - Telegram API {#mementotelegram}

Komplexný Telegram Bot API wrapper s pokročilými funkciami pre notifikácie.

### Základné Telegram funkcie

```javascript
// Odoslanie správy
var result = MementoTelegram.sendTelegramMessage(
    "-1001234567890",  // Chat ID
    "Testovacia správa",
    {
        parseMode: "Markdown",
        silent: false,
        threadId: "123"  // Pre témy
    }
);

// Editácia správy
MementoTelegram.editTelegramMessage(
    chatId, 
    messageId, 
    "Nový text správy",
    {parseMode: "Markdown"}
);

// Vymazanie správy
MementoTelegram.deleteTelegramMessage(chatId, messageId);
```

### Pokročilé notifikácie

```javascript
// Vytvorenie Telegram správy (hlavná funkcia)
var result = MementoTelegram.createTelegramMessage(entry());

if (result.success) {
    MementoCore.addDebug(entry(), "Notifikácia vytvorená");
} else {
    MementoCore.addError(entry(), "Chyba: " + result.reason);
}

// Odoslanie notifikačného záznamu
var sendResult = MementoTelegram.sendNotificationEntry(notificationEntry);
```

### Získavanie Telegram údajov

```javascript
// Automatické získanie Chat/Thread ID podľa typu adresáta
var telegramData = MementoTelegram.getTelegramID(notificationEntry);
// {
//   success: true,
//   chatId: "-1001234567890",
//   threadId: "123",
//   source: "group",
//   groupName: "Moja skupina"
// }

// Získanie z individuálneho kontaktu
var individual = MementoTelegram.getTelegramFromIndividual(config, entry);

// Získanie z skupiny/témy  
var group = MementoTelegram.getTelegramFromGroup(config, entry);

// Získanie zo zákazky
var customer = MementoTelegram.getTelegramFromOrder(config, entry);
```

### Práca s notifikáciami

```javascript
// Vytvorenie notifikácie
var notification = MementoTelegram.createNotification({
    message: "Text správy",
    messageType: "Dochádzka", 
    telegramGroup: groupEntry
}, sourceEntry);

// Linkovanie k zdroju
MementoTelegram.linkNotification(notification, sourceEntry);

// Cleanup starých notifikácií
var cleanup = MementoTelegram.cleanupOldNotifications(entry());
// {success: true, deletedCount: 3}

// Vymazanie notifikácie aj z Telegramu
MementoTelegram.deleteNotificationAndTelegram(notificationEntry);
```

### Inline Keyboard

```javascript
// Vytvorenie inline klávesnice
var keyboard = MementoTelegram.createInlineKeyboard([
    {text: "✅ Schváliť", callback_data: "approve"},
    {text: "❌ Zamietnuť", callback_data: "reject"},
    {text: "ℹ️ Info", callback_data: "info"}
], 2); // 2 stĺpce

// Odoslanie s klávesnicou
MementoTelegram.sendTelegramMessage(chatId, "Vyberte akciu:", {}, keyboard);
```

### Pomocné funkcie

```javascript
// Escape Markdown znakov
var safeText = MementoTelegram.escapeMarkdown("Text s *špeciálnymi* znakmi");

// Detekcia formátovania
var format = MementoTelegram.detectFormatting("Text s **markdown**");
// "Markdown" | "HTML" | "Text"

// Kontrola povolení  
var enabled = MementoTelegram.checkPermissions("Dochádzka skupinové notifikácie");

// Kontrola nového záznamu
var isNew = MementoTelegram.isNewRecord(entry());

// Aktualizácia statusu
MementoTelegram.updateStatus("Odoslané", null, notificationEntry);
```

---

## 📖 Praktické príklady použitia {#praktické-príklady}

### 1. Kompletný dochádzka script

```javascript
// Načítanie frameworku
var utils = MementoUtils;
var CONFIG = utils.createScriptConfig("Dochádzka Prepočet", "8.0");

// Kontrola závislostí
var deps = utils.checkDependencies(["core", "business", "telegram"]);
if (!deps.success) {
    message("Chýbajú moduly: " + deps.missing.join(", "));
    cancel();
}

try {
    // Získanie základných údajov
    var currentEntry = entry();
    var datum = utils.safeGet(currentEntry, CONFIG.fields.attendance.date);
    var zamestnanci = utils.safeGet(currentEntry, CONFIG.fields.attendance.employees, []);
    
    utils.addDebug(currentEntry, "=== SPÚŠŤAM PREPOČET DOCHÁDZKY ===");
    utils.addDebug(currentEntry, "Dátum: " + utils.formatDate(datum));
    utils.addDebug(currentEntry, "Počet zamestnancov: " + zamestnanci.length);
    
    // Spracovanie každého zamestnanca
    var celkoveMzdy = 0;
    var celkoveHodiny = 0;
    
    for (var i = 0; i < zamestnanci.length; i++) {
        var zamestnanec = zamestnanci[i];
        var meno = utils.formatEmployeeName(zamestnanec);
        
        // Získanie odpracovaných hodín z atribútu
        var odpracovane = utils.safeGetAttribute(currentEntry, 
            CONFIG.fields.attendance.employees, 
            CONFIG.attributes.employees.workedHours, 
            0, i);
            
        if (odpracovane > 0) {
            // Výpočet mzdy
            var wageCalc = utils.calculateDailyWage(zamestnanec, odpracovane, datum);
            
            // Uloženie do atribútov
            utils.safeSetAttribute(currentEntry, 
                CONFIG.fields.attendance.employees,
                CONFIG.attributes.employees.dailyWage,
                wageCalc.wage, i);
                
            utils.safeSetAttribute(currentEntry, 
                CONFIG.fields.attendance.employees,
                CONFIG.attributes.employees.hourlyRate,
                wageCalc.hourlyRate, i);
                
            celkoveMzdy += wageCalc.wage;
            celkoveHodiny += odpracovane;
            
            utils.addDebug(currentEntry, 
                "✓ " + meno + ": " + odpracovane + "h = " + 
                utils.formatMoney(wageCalc.wage));
        }
    }
    
    // Uloženie súhrnných údajov
    utils.safeSet(currentEntry, CONFIG.fields.attendance.wageCosts, celkoveMzdy);
    utils.safeSet(currentEntry, CONFIG.fields.attendance.workedHours, celkoveHodiny);
    
    // Vytvorenie Telegram notifikácie
    var telegramMsg = "📋 **DOCHÁDZKA** - " + utils.formatDate(datum) + "\n\n";
    telegramMsg += "👥 Pracovníkov: " + zamestnanci.length + "\n";
    telegramMsg += "⏱️ Odpracované: " + celkoveHodiny + " hodín\n";
    telegramMsg += "💰 Mzdové náklady: " + utils.formatMoney(celkoveMzdy);
    
    utils.safeSet(currentEntry, CONFIG.fields.common.infoTelegram, telegramMsg);
    
    // Vytvorenie notifikácie
    var notifResult = utils.createTelegramMessage(currentEntry);
    if (notifResult.success) {
        utils.addDebug(currentEntry, "✅ Telegram notifikácia vytvorená");
    }
    
    utils.addDebug(currentEntry, "=== PREPOČET DOKONČENÝ ===");
    utils.showProcessingSummary(currentEntry, {
        success: true,
        date: datum,
        employeeCount: zamestnanci.length,
        totalHours: celkoveHodiny,
        totalCosts: celkoveMzdy
    });
    
} catch (error) {
    utils.addError(currentEntry, "Kritická chyba: " + error.toString(), "main", error);
    utils.setColorByCondition(currentEntry, "error");
}
```

### 2. Telegram notifikačný script

```javascript
var utils = MementoUtils;

try {
    var currentEntry = entry();
    
    // Kontrola či je nový záznam
    if (!utils.isNewRecord(currentEntry)) {
        utils.addDebug(currentEntry, "Nie je nový záznam");
        return;
    }
    
    // Odoslanie notifikácie s inline klávesnicou  
    var keyboard = utils.createInlineKeyboard([
        {text: "✅ OK", callback_data: "ok"},
        {text: "❌ Problém", callback_data: "problem"}
    ]);
    
    var result = utils.sendNotificationEntry(currentEntry, keyboard);
    
    if (result.success) {
        utils.addDebug(currentEntry, "✅ Notifikácia odoslaná");
        utils.setColorByCondition(currentEntry, "success");
    } else {
        utils.addError(currentEntry, "Odoslanie zlyhalo");
        utils.setColorByCondition(currentEntry, "error");
    }
    
} catch (error) {
    utils.addError(currentEntry, error.toString(), "telegram-script", error);
}
```

### 3. AI analýza dokumentu

```javascript
var utils = MementoUtils;

try {
    var currentEntry = entry();
    var obrazok = utils.safeGet(currentEntry, "Doklad"); // Image field
    
    if (!obrazok) {
        utils.addError(currentEntry, "Žiadny obrázok na analýzu");
        return;
    }
    
    // AI analýza faktúry
    var prompt = `Analyzuj túto faktúru a extrahuj:
    1. Číslo faktúry
    2. Dátum vydania  
    3. Celková suma
    4. Dodávateľ
    5. Položky
    
    Vráť výsledok vo formáte JSON.`;
    
    var analysis = utils.analyzeImage(obrazok.url, prompt, {
        detail: "high",
        maxTokens: 1500
    });
    
    if (analysis.success) {
        var data = utils.parseAIJson(analysis.content);
        
        if (data) {
            // Vyplnenie polí na základe AI analýzy
            utils.safeSet(currentEntry, "Číslo faktúry", data.cisloFaktury);
            utils.safeSet(currentEntry, "Dátum vydania", new Date(data.datumVydania));
            utils.safeSet(currentEntry, "Celková suma", parseFloat(data.celkovaSuma));
            
            utils.addDebug(currentEntry, "✅ AI analýza dokončená");
            utils.safeSet(currentEntry, "AI Analýza", analysis.content);
        }
    } else {
        utils.addError(currentEntry, "AI analýza zlyhala: " + analysis.error);
    }
    
} catch (error) {
    utils.addError(currentEntry, error.toString(), "ai-analysis", error);
}
```

---

## ✨ Najlepšie praktiky {#najlepšie-praktiky}

### 1. Inicializácia scriptu

```javascript
// Vždy na začiatku
var utils = MementoUtils;
var CONFIG = utils.createScriptConfig("Názov Scriptu", "1.0");

// Kontrola závislostí
var deps = utils.checkDependencies(["core", "business"]);
if (!deps.success) {
    message("Chýbajú moduly: " + deps.missing.join(", "));
    cancel();
}
```

### 2. Error handling

```javascript
try {
    var currentEntry = entry();
    
    // Hlavný kód scriptu
    
    utils.addDebug(currentEntry, "✅ Script dokončený úspešne");
    
} catch (error) {
    utils.addError(currentEntry, "Kritická chyba: " + error.toString(), "main", error);
    utils.setColorByCondition(currentEntry, "error");
    
    // Pre debugging
    utils.debugModules(currentEntry);
}
```

### 3. Validácia vstupov

```javascript
// Validácia povinných polí
if (!utils.validateRequiredFields(currentEntry, ["Dátum", "Zamestnanci"])) {
    utils.setColorByCondition(currentEntry, "warning");
    message("Vyplňte všetky povinné polia!");
    cancel();
}

// Kontrola hodnôt
var datum = utils.safeGet(currentEntry, CONFIG.fields.attendance.date);
if (!datum) {
    utils.addError(currentEntry, "Dátum nie je vyplnený");
    return;
}
```

### 4. Použitie CONFIG

```javascript
// Používaj CONFIG namiesto hardcoded názvov
var zamestnanci = utils.safeGet(currentEntry, CONFIG.fields.attendance.employees);
// NIE: var zamestnanci = currentEntry.field("Zamestnanci");

var hodinovka = utils.safeGetAttribute(currentEntry, 
    CONFIG.fields.attendance.employees,
    CONFIG.attributes.employees.hourlyRate, 0, index);
```

### 5. Logging stratégia

```javascript
// Štruktúrované loggovanie
utils.addDebug(currentEntry, "=== ZAČIATOK SPRACOVANIA ===");
utils.addDebug(currentEntry, "Dátum: " + utils.formatDate(datum));
utils.addDebug(currentEntry, "Zamestnanci: " + zamestnanci.length);

// Pre cykly
for (var i = 0; i < zamestnanci.length; i++) {
    utils.addDebug(currentEntry, "[" + (i+1) + "/" + zamestnanci.length + "] " + meno);
    // spracovanie...
}

utils.addDebug(currentEntry, "=== SPRACOVANIE DOKONČENÉ ===");
```

### 6. Výkonnosť

```javascript
// Cachuj často používané objekty  
var config = utils.config;
var fields = config.fields.attendance;

// Minimalizuj počet set() operácií
var updates = {};
updates[fields.wageCosts] = celkoveMzdy;
updates[fields.workedHours] = celkoveHodiny;

for (var field in updates) {
    utils.safeSet(currentEntry, field, updates[field]);
}
```

### 7. Telegram notifikácie

```javascript
// Vždy kontroluj povolenia
if (!utils.checkPermissions("Dochádzka skupinové notifikácie")) {
    utils.addDebug(currentEntry, "Notifikácie vypnuté");
    return;
}

// Používaj štandardný formát správ
var telegramMsg = utils.getIcon("calendar") + " **" + scriptName.toUpperCase() + "**\n\n";
telegramMsg += utils.getIcon("info") + " Dátum: " + utils.formatDate(datum) + "\n";
telegramMsg += utils.getIcon("group") + " Pracovníkov: " + count + "\n";
```

### 8. Testing a debugging

```javascript
// Pre development
if (CONFIG.global.debug) {
    utils.debugModules(currentEntry);
    
    // Dodatočné debug info
    utils.addDebug(currentEntry, "DEBUG MODE - detailné informácie:");
    utils.addDebug(currentEntry, JSON.stringify(someObject, null, 2));
}

// Mock data pre testing
if (utils.safeGet(currentEntry, "Test Mode")) {
    // použiť testové dáta
}
```

---

## 📚 Záver

Memento Framework poskytuje robustný a škálovateľný systém pre vývoj komplexných aplikácií v Memento Database. Použitím lazy loading architektúry, centralizovanej konfigurácie a modulárneho dizajnu umožňuje:

- **Rýchly vývoj** - Hotové funkcie pre časté úlohy
- **Konzistentnosť** - Jednotné API naprieč projektmi  
- **Údržbu** - Centralizované nastavenia a konfigurácie
- **Rozšíriteľnosť** - Jednoduchý pride modulov
- **Spolehlivosť** - Pokročilý error handling a logging

Framework je aktívne vyvíjaný a rozšírovaný podľa potrieb projektov.

**Verzie:**
- MementoConfig: 7.0.2
- MementoCore: 7.0.1  
- MementoUtils: 7.0
- MementoBusiness: 7.0.1
- MementoAI: 7.0
- MementoTelegram: 8.0.2

Pre najnovšie informácie a aktualizácie navštívte [GitHub repozitár](https://github.com/mnauzer/memento-claude).