📘 Komplexný manuál pre MementoUtils v2.2
📑 Obsah manuálu
Inštalácia a základné nastavenie

Konfigurácia a nastavenia

Debug a error handling

Práca s poliami a záznamami

Link to Entry operácie

AI integrácia

SQL operácie

Časové funkcie

Validácie a formátovanie

Batch processing

Business logic funkcie

Praktické príklady použitia

Troubleshooting

1. Inštalácia a základné nastavenie
1.1 Pridanie knižnice do Memento
Otvorte Memento Database

Prejdite na Settings → Scripts → JavaScript knižnice

Vytvorte nový súbor MementoUtils.js

Skopírujte obsah knižnice v2.2 do súboru

Označte knižnicu ako aktívnu ✅

1.2 Import v scriptoch
javascript
// Na začiatku každého scriptu
var utils = MementoUtils;

// Overenie verzie
var version = utils.version; // "2.2"
1.3 Požadované závislosti
✅ moment.js - už súčasť Memento Database
✅ ASISTANTO API knižnica - pre AI funkcie (voliteľné)
✅ HTTP prístup - pre AI API volania

2. Konfigurácia a nastavenia
2.1 Základná konfigurácia
javascript
var utils = MementoUtils;

// Prístup ku konfigurácii
var config = utils.DEFAULT_CONFIG;

// Všetky dostupné nastavenia - logované do Debug_Log poľa
utils.addDebug(entry(), "Debug pole: " + config.debugFieldName);          // "Debug_Log"
utils.addDebug(entry(), "Error pole: " + config.errorFieldName);          // "Error_Log"
utils.addDebug(entry(), "Dátum formát: " + config.dateFormat);            // "DD.MM.YY HH:mm"
utils.addDebug(entry(), "Default AI provider: " + config.defaultAIProvider); // "OpenAi"
utils.addDebug(entry(), "API cache timeout: " + config.apiCacheTimeout);  // 3600000 (1h)
utils.addDebug(entry(), "Quarter rounding: " + config.quarterRoundingMinutes); // 15
2.2 AI Provider konfigurácia
javascript
// Dostupní AI provideri
var providers = utils.AI_PROVIDERS;

// Konfigurácia pre OpenAI - info logované do poľa
var openaiConfig = providers.OpenAi;
utils.addInfo(entry(), "OpenAI konfigurácia načítaná", {
    method: "getConfig",
    result: "Base URL: " + openaiConfig.baseUrl + ", Model: " + openaiConfig.defaultModel
});

// Konfigurácia pre Perplexity
var perplexityConfig = providers.Perplexity;
utils.addInfo(entry(), "Perplexity konfigurácia", {
    method: "getConfig", 
    result: "Model: " + perplexityConfig.defaultModel
});

// Konfigurácia pre OpenRouter
var openrouterConfig = providers.OpenRouter;
utils.addInfo(entry(), "OpenRouter konfigurácia", {
    method: "getConfig",
    result: "Model: " + openrouterConfig.defaultModel
});
3. Debug a error handling
3.1 Rozšírené error handling (v2.2)
javascript
var utils = MementoUtils;

// Nové v2.2 - pokročilé error reporting s line numbers a stack trace
utils.includeLineNumbers = true;  // Zapnutie line numbers v logoch
utils.includeStackTrace = false;  // Stack trace (default false)

// Debug správy s kontextom - zapisujú sa do Debug_Log poľa
utils.addDebug(entry(), "🔍 Spúšťam spracovanie", {
    location: "processOrder",
    lineNumber: 42,
    data: {orderId: 123, status: "processing"}
});

// Error správy s objektom chyby (v2.2 rozšírené) - zapisujú sa do Error_Log poľa
try {
    // rizikový kód
    var result = dangerousOperation();
} catch (e) {
    // v2.2 podporuje error objekty s automatickou extrakciou info
    utils.addError(entry(), e, "dangerousOperation");
    // Extrahuje: type, message, lineNumber, stack (ak dostupné)
}
3.2 Základné logovanie
javascript
// Debug správy - zapisujú sa do Debug_Log poľa
utils.addDebug(entry(), "🔍 Spúšťam spracovanie záznamu");
utils.addDebug(entry(), "📊 Načítané dáta: " + data.length + " položiek");

// Error správy s verziou - zapisujú sa do Error_Log poľa
utils.addError(entry(), "❌ Chyba pri načítaní dát", "scriptName v1.0");

// Info správy s detailmi - zapisujú sa do info poľa
utils.addInfo(entry(), "Záznam úspešne spracovaný", {
    sourceId: entry().field("ID"),
    method: "processRecord", 
    result: "Vytvorených 5 súvisiacich záznamov",
    libraryName: "Projekty"
});
3.3 Správa logov
javascript
// Vyčistenie logov na začiatku scriptu
utils.clearLogs(entry(), false); // false = nemazať error logy
utils.clearLogs(entry(), true);  // true = vymazať aj error logy

// Uloženie a trimovanie logov (ak sú príliš veľké)
utils.saveLogs(entry());
3.4 Kompletný error handling pattern (v2.2)
javascript
var utils = MementoUtils;

// v2.2 - Zapnutie rozšírených error info
utils.includeLineNumbers = true;

try {
    utils.clearLogs(entry(), false);
    utils.addDebug(entry(), "🚀 Script started");
    
    // Váš kód tu
    var result = doSomething();
    
    utils.addInfo(entry(), "Operácia dokončená", {
        result: "Úspešne spracované " + result.count + " položiek"
    });
    
} catch (e) {
    // v2.2 - automatická extrakcia error info do Error_Log poľa
    utils.addError(entry(), e, "myScript v1.0");
    message("💥 Chyba: " + e.toString());
} finally {
    utils.saveLogs(entry());
    utils.addDebug(entry(), "🏁 Script completed");
}
4. Práca s poliami a záznamami
4.1 Bezpečný prístup k poliam
javascript
var utils = MementoUtils;

// Bezpečné čítanie s default hodnotou
var customerName = utils.safeGet(entry(), "Názov zákazníka", "Neznámy");
var price = utils.safeGet(entry(), "Cena", 0);
var isActive = utils.safeGet(entry(), "Aktívny", false);

// Alias funkcia (rovnaká funkcionalita)
var description = utils.safeFieldAccess(entry(), "Popis", "Bez popisu");

// Bezpečný zápis
if (utils.safeSet(entry(), "Status", "Spracované")) {
    utils.addDebug(entry(), "✅ Status úspešne nastavený");
} else {
    utils.addError(entry(), "❌ Chyba pri nastavovaní statusu", "safeSet");
}
4.2 Validácie polí
javascript
// Validácia povinných polí
var validation = utils.validateRequiredFields(entry(), [
    "Názov", "Email", "Telefón", "Zákazník"
]);

if (!validation.isValid) {
    var errorMsg = "Chýbajú povinné polia: " + validation.missingFields.join(", ");
    utils.addError(entry(), errorMsg, "validation");
    message(errorMsg);
    cancel(); // Zruší uloženie v trigger scripte
}

// Validácia stavu záznamu
var state = utils.validateEntryState(entry());
if (!state.isValid) {
    utils.addError(entry(), "Neplatný stav záznamu: " + state.errors.join(", "), "validateState");
}
5. Link to Entry operácie
5.1 Bezpečný prístup k linkom
javascript
var utils = MementoUtils;

// Získanie prvého linku
var customer = utils.safeGetFirstLink(entry(), "Zákazník");
if (customer) {
    var customerName = utils.safeGet(customer, "Názov", "Neznámy");
    utils.addDebug(entry(), "Zákazník: " + customerName);
}

// Získanie všetkých linkov
var products = utils.safeGetLinks(entry(), "Produkty");
utils.addDebug(entry(), "Počet produktov: " + products.length);

var totalPrice = 0;
for (var i = 0; i < products.length; i++) {
    var price = utils.safeGet(products[i], "Cena", 0);
    totalPrice += price;
}
entry().set("Celková cena", totalPrice);
5.2 LinksFrom operácie
javascript
// Nájdenie spätných linkov
var customer = entry(); // aktuálny zákazník
var orders = utils.safeLinksFrom(customer, "Objednávky", "Zákazník", entry());

utils.addDebug(entry(), "Počet objednávok: " + orders.length);

// LinksFrom s variáciami názvov polí
var relatedItems = utils.findLinksWithVariations(
    entry(),
    "Súvisiace záznamy",
    ["Zamestnanec", "Zamestnanci", "Employee"], // rôzne možné názvy
    entry()
);
5.3 Atribúty v Link to Entry
javascript
// SPRÁVNA SYNTAX pre nastavenie atribútu!
var success = utils.safeSetAttribute(entry(), "Produkty", 0, "Množstvo", 5);
if (success) {
    utils.addDebug(entry(), "✅ Atribút Množstvo nastavený");
}

// Alias pre kratšie písanie
utils.safeSetAttr(entry(), "Produkty", 0, "Zľava", 0.1);

// Získanie atribútu
var quantity = utils.safeGetAttribute(entry(), "Produkty", 0, "Množstvo", 1);
var discount = utils.safeGetAttribute(entry(), "Produkty", 0, "Zľava", 0);

utils.addDebug(entry(), "Množstvo: " + quantity + ", Zľava: " + (discount * 100) + "%");
6. AI integrácia
6.1 Setup API kľúčov
Vytvorte knižnicu "ASISTANTO API" s poliami:

Provider (Choice) - "OpenAi", "Perplexity", "OpenRouter"

API_Key (Text) - váš API kľúč

Názov (Text) - popis kľúča

6.2 Test API kľúčov
javascript
var utils = MementoUtils;

// Test všetkých dostupných kľúčov - výsledky logované do Debug_Log
var results = utils.testApiKeys(["OpenAi", "Perplexity"], entry());
message("Test dokončený: " + results.success.length + "/" + results.total + " kľúčov OK");

// Test konkrétneho kľúča
var apiKey = utils.getCachedApiKey("OpenAi", entry());
if (apiKey) {
    utils.addDebug(entry(), "✅ OpenAI kľúč dostupný");
} else {
    utils.addError(entry(), "❌ OpenAI kľúč chýba", "testApiKey");
}

// Vyčistenie cache kľúčov
utils.clearApiKeyCache();
6.3 Základné AI volania
javascript
// Jednoduché AI volanie - debug info zapisané do Debug_Log
var result = utils.callAI("OpenAi", "Zhrň tento text: " + entry().field("Popis"), {
    model: "gpt-4o-mini",
    maxTokens: 500,
    temperature: 0.7,
    debugEntry: entry()
});

if (result.success) {
    entry().set("AI_Zhrnutie", result.response);
    utils.addDebug(entry(), "✅ AI odpoveď: " + result.response.substring(0, 100) + "...");
} else {
    utils.addError(entry(), "AI volanie zlyhalo: " + result.error, "callAI");
}
6.4 AI analýza záznamov
javascript
// Analýza konkrétnych polí - progress logovaný do Debug_Log, výsledky do info
var analysisResult = utils.aiAnalyzeEntry(
    entry(),
    "summarize", // typ: "summarize", "categorize", "extract", "sentiment"
    ["Popis", "Poznámky", "Status"], // polia na analýzu
    {
        provider: "OpenAi",
        model: "gpt-4o-mini",
        customPrompt: "Analyzuj tento pracovný záznam a vytvor stručné zhrnutie.",
        debugEntry: entry()
    }
);

if (analysisResult.success) {
    entry().set("AI_Analýza", analysisResult.analysis);
    
    utils.addInfo(entry(), "AI analýza dokončená", {
        fieldsAnalyzed: analysisResult.fieldsAnalyzed.join(", "),
        provider: analysisResult.provider
    });
}
6.5 Natural Language to SQL
javascript
// Generovanie SQL z prirodzeného jazyka - debug do Debug_Log
var sqlResult = utils.aiGenerateSQL(
    "Koľko projektov má každý zamestnanec?",
    ["Projekty", "Zamestnanci", "Priradenia"], // dostupné tabuľky
    {
        provider: "Perplexity",
        debugEntry: entry()
    }
);

if (sqlResult.success) {
    utils.addDebug(entry(), "🔍 Vygenerovaný SQL: " + sqlResult.sqlQuery);
    
    // Vykonaj SQL
    try {
        var data = sql(sqlResult.sqlQuery).asObjects();
        entry().set("SQL_Výsledky", JSON.stringify(data, null, 2));
    } catch (e) {
        utils.addError(entry(), "SQL vykonanie zlyhalo: " + e, "executeSQL");
    }
}
7. SQL operácie
7.1 Smart SQL (automatická detekcia)
javascript
var utils = MementoUtils;

// Rozpozná či je to SQL alebo prirodzený jazyk - debug do Debug_Log
var result = utils.smartSQL("Ukáž mi všetkých aktívnych zákazníkov", {
    returnType: "objects", // "objects", "arrays", "scalar", "count"
    availableTables: ["Zákazníci", "Objednávky"],
    aiProvider: "OpenAi",
    debugEntry: entry()
});

if (result.success) {
    var customers = result.data;
    utils.addDebug(entry(), "📊 Nájdených zákazníkov: " + customers.length);
    
    // Spracuj výsledky
    for (var i = 0; i < customers.length; i++) {
        utils.addDebug(entry(), "Zákazník: " + customers[i].Názov);
    }
}
7.2 SQL s AI interpretáciou
javascript
// SQL s AI interpretáciou - výsledky do info poľa
var interpretation = utils.sqlWithAIInterpretation(
    "SELECT Status, COUNT(*) as Počet FROM Úlohy GROUP BY Status",
    "Analyzuj tieto štatistiky úloh a navrhni zlepšenia produktivity:",
    {
        aiProvider: "OpenRouter",
        aiModel: "meta-llama/llama-3.1-8b-instruct:free",
        maxTokens: 800,
        debugEntry: entry()
    }
);

if (interpretation.success) {
    entry().set("SQL_Dáta", JSON.stringify(interpretation.sqlData, null, 2));
    entry().set("AI_Interpretácia", interpretation.aiInterpretation);
    
    utils.addInfo(entry(), "SQL + AI interpretácia dokončená", {
        recordsFound: interpretation.sqlData.length,
        aiSuccess: interpretation.aiSuccess
    });
}
8. Časové funkcie
8.1 Formátovanie času
javascript
var utils = MementoUtils;

// Formátovanie času do HH:mm
var startTime = utils.formatTime(entry().field("Od")); // "09:30"
var endTime = utils.formatTime(entry().field("Do"));   // "17:45"

utils.addDebug(entry(), "Pracovný čas: " + startTime + " - " + endTime);

// Zaokrúhlenie na 15 minút
var timeValue = moment("09:23", "HH:mm");
var rounded = utils.roundToQuarter(timeValue);
utils.addDebug(entry(), "Zaokrúhlený čas: " + utils.formatTime(rounded)); // "09:15"
8.2 Výpočty času
javascript
// Výpočet pracovného času - výsledky do info poľa
var startTime = entry().field("Od");
var endTime = entry().field("Do");

var workHours = utils.calculateHours(startTime, endTime);
entry().set("Odpracované hodiny", workHours);

utils.addInfo(entry(), "Časový výpočet dokončený", {
    method: "calculateHours",
    result: "Odpracovaných hodín: " + workHours
});

// Alias pre calculateHours
var timeDiff = utils.calculateTimeDifference(startTime, endTime);
8.3 Dátumové utility
javascript
// Kontrola víkendu - info do info poľa
var workDate = entry().field("Dátum");
if (utils.isWeekend(workDate)) {
    entry().set("Víkendová práca", true);
    utils.addInfo(entry(), "Označené ako víkendová práca", {
        method: "isWeekend",
        result: "Dátum " + moment(workDate).format("DD.MM.YYYY") + " je víkend"
    });
}

// Formátovanie dátumu (cez moment.js)
var formattedDate = moment(workDate).format("DD.MM.YYYY");
entry().set("Formátovaný dátum", formattedDate);
9. Validácie a formátovanie
9.1 Formátovanie peňazí
javascript
var utils = MementoUtils;

// Formátovanie peňažných súm
var amount = 1234.56;
var formatted = utils.formatMoney(amount, "€", 2); // "1234.56 €"
entry().set("Formátovaná cena", formatted);

// Parsing peňazí zo stringu
var priceString = "1,234.56 €";
var parsedAmount = utils.parseMoney(priceString); // 1234.56
utils.addDebug(entry(), "Parsovaná suma: " + parsedAmount);
9.2 Formátovanie mien
javascript
// Formátovanie mena zamestnanca
var employee = utils.safeGetFirstLink(entry(), "Zamestnanec");
var formattedName = utils.formatEmployeeName(employee);
// Výsledok: "jnovak (Ján Novák)" alebo "jnovak" alebo "Zamestnanec ID:123"

entry().set("Zamestnanec meno", formattedName);
utils.addDebug(entry(), "Formátované meno: " + formattedName);
9.3 Vyhľadávanie
javascript
// Vyhľadanie podľa unique poľa s variáciami - debug do Debug_Log
var employee = utils.findByUniqueField(
    "Zamestnanci",
    ["Nick", "nick", "Login"], // skúša rôzne názvy polí
    "jnovak"
);

if (employee) {
    utils.addDebug(entry(), "Zamestnanec nájdený: " + employee.field("Meno"));
} else {
    utils.addError(entry(), "Zamestnanec s nick 'jnovak' nebol nájdený", "findEmployee");
}

// Špecializované hľadanie zamestnanca
var emp = utils.findEmployeeByNick("jnovak", "Zamestnanci");
10. Batch processing
10.1 Hromadné spracovanie záznamov
javascript
var utils = MementoUtils;

// Označené záznamy
var selectedEntries = lib().find("selected:true");

var results = utils.processBatch(selectedEntries, function(item, index) {
    try {
        // Spracovanie jednotlivého záznamu
        item.set("Spracované", true);
        item.set("Dátum spracovania", Date.now());
        
        utils.addDebug(item, "Batch spracovanie úspešné");
        return true; // úspech
    } catch (e) {
        return false; // neúspech
    }
}, entry());

// Výsledky - info do info poľa
var successCount = results.success.length;
var failedCount = results.failed.length;
var totalCount = results.total;

utils.addInfo(entry(), "Batch spracovanie dokončené", {
    method: "processBatch",
    result: "Úspešné: " + successCount + ", Neúspešné: " + failedCount + ", Celkovo: " + totalCount
});

message("Batch spracovanie dokončené:\n" +
        "✅ Úspešné: " + successCount + "\n" +
        "❌ Neúspešné: " + failedCount + "\n" +
        "📊 Celkovo: " + totalCount);

// Detail chýb - errors do Error_Log
for (var i = 0; i < results.failed.length; i++) {
    var failed = results.failed[i];
    utils.addError(entry(), "Batch failed at index " + failed.index + ": " + failed.error, "processBatch");
}
11. Business logic funkcie
11.1 Práca so sadzbami
javascript
var utils = MementoUtils;

// Nájdenie platnej sadzby pre dátum - výsledky do info poľa
var employee = utils.safeGetFirstLink(entry(), "Zamestnanec");
var salaries = utils.safeGetLinks(employee, "Sadzby");
var workDate = entry().field("Dátum");

var validSalary = utils.findValidSalaryForDate(salaries, workDate);
if (validSalary > 0) {
    entry().set("Aktuálna sadzba", validSalary);
    utils.addInfo(entry(), "Sadzba nájdená", {
        method: "findValidSalaryForDate",
        result: "Platná sadzba: " + validSalary + " €/h pre dátum " + moment(workDate).format("DD.MM.YYYY")
    });
} else {
    utils.addError(entry(), "Nenájdená platná sadzba pre dátum: " + workDate, "findSalary");
}
11.2 Default hodnoty
javascript
// Získanie default HZS - debug do Debug_Log
var defaultHZS = utils.getDefaultHZS("ASISTANTO Defaults", "HZS");
if (defaultHZS) {
    utils.addDebug(entry(), "Default HZS: " + defaultHZS.field("Názov"));
}

// Nastavenie default hodnoty ak pole je prázdne
var hzsField = utils.setDefaultAndReload(entry(), "HZS", "ASISTANTO Defaults", "HZS");
if (hzsField) {
    utils.addInfo(entry(), "HZS pole nastavené", {
        method: "setDefaultAndReload",
        result: "HZS pole nastavené/načítané"
    });
}
12. Praktické príklady použitia
12.1 Kompletný trigger script s rozšíreným error handlingom (v2.2)
javascript
// Trigger: After Save
var utils = MementoUtils;

// v2.2 - Zapnutie rozšírených error info
utils.includeLineNumbers = true;
utils.includeStackTrace = false; // pre performance

try {
    utils.clearLogs(entry(), false); // Vyčisti debug logy
    utils.addDebug(entry(), "🚀 Spúšťam AI analýzu záznamu práce");
    
    // Validácia povinných polí
    var validation = utils.validateRequiredFields(entry(), ["Od", "Do", "Zamestnanci"]);
    if (!validation.isValid) {
        utils.addError(entry(), "Chýbajú povinné polia: " + validation.missingFields.join(", "), "validation");
        message("❌ Chýbajú povinné polia!");
        return;
    }
    
    // Výpočet pracovného času
    var startTime = entry().field("Od");
    var endTime = entry().field("Do");
    var workHours = utils.calculateHours(startTime, endTime);
    
    if (workHours > 0) {
        entry().set("Odpracované hodiny", workHours);
        utils.addDebug(entry(), "⏱️ Vypočítané hodiny: " + workHours);
    }
    
    // AI analýza ak nie je spracovaná
    var existingAnalysis = utils.safeGet(entry(), "AI_Zhrnutie", "");
    if (!existingAnalysis) {
        var analysisResult = utils.aiAnalyzeEntry(
            entry(),
            "summarize",
            ["Od", "Do", "Zamestnanci", "Zákazka", "Popis"],
            {
                provider: "OpenAi",
                model: "gpt-4o-mini",
                customPrompt: "Vytvor stručné zhrnutie tohto pracovného záznamu.",
                debugEntry: entry()
            }
        );
        
        if (analysisResult.success) {
            entry().set("AI_Zhrnutie", analysisResult.analysis);
            utils.addInfo(entry(), "AI analýza dokončená", {
                provider: analysisResult.provider,
                fieldsCount: analysisResult.fieldsAnalyzed.length,
                method: "aiAnalyzeEntry",
                result: "Úspešne vytvorené AI zhrnutie"
            });
            
            message("🤖 AI zhrnutie vytvorené!");
        } else {
            utils.addError(entry(), "AI analýza zlyhala: " + analysisResult.error, "aiAnalysis");
        }
    }
    
    // Formátovanie mena zamestnanca
    var employees = utils.safeGetLinks(entry(), "Zamestnanci");
    if (employees.length > 0) {
        var employeeNames = [];
        for (var i = 0; i < employees.length; i++) {
            employeeNames.push(utils.formatEmployeeName(employees[i]));
        }
        entry().set("Zamestnanci mená", employeeNames.join(", "));
    }
    
    utils.saveLogs(entry());
    utils.addDebug(entry(), "🏁 Script dokončený úspešne");
    
} catch (e) {
    // v2.2 - automatická extrakcia error objektu do Error_Log
    utils.addError(entry(), e, "mainScript v1.0");
    message("💥 Chyba: " + e.toString());
}
12.2 Action script s pokročilým AI workflow (v2.2)
javascript
// Action: "🧠 Komplexná AI analýza"
var utils = MementoUtils;

// v2.2 - Rozšírené error tracking
utils.includeLineNumbers = true;

try {
    utils.addDebug(entry(), "🧠 Spúšťam komplexnú AI analýzu", {
        location: "complexAIAnalysis",
        lineNumber: 10
    });
    
    // Multi-step AI workflow
    var steps = [
        {
            type: "summarize",
            fields: ["Popis", "Poznámky"],
            prompt: "Zhrň hlavné body tohto záznamu"
        },
        {
            type: "categorize", 
            fields: ["Typ", "Priorita"],
            prompt: "Kategorizuj tento záznam podľa dôležitosti"
        },
        {
            type: "extract",
            fields: ["Popis", "info"],
            prompt: "Extrahuj akčné body a deadlines"
        }
    ];
    
    var results = {};
    
    for (var i = 0; i < steps.length; i++) {
        var step = steps[i];
        
        utils.addDebug(entry(), "🔄 AI Step " + (i+1) + ": " + step.type, {
            location: "aiStep",
            data: {step: i+1, type: step.type}
        });
        
        var analysisResult = utils.aiAnalyzeEntry(
            entry(),
            step.type,
            step.fields,
            {
                provider: "OpenAi",
                model: "gpt-4o-mini",
                customPrompt: step.prompt,
                debugEntry: entry()
            }
        );
        
        if (analysisResult.success) {
            results[step.type] = analysisResult.analysis;
            entry().set("AI_" + step.type.charAt(0).toUpperCase() + step.type.slice(1), analysisResult.analysis);
        } else {
            utils.addError(entry(), "AI step " + step.type + " failed: " + analysisResult.error, "aiStep_" + step.type);
        }
    }
    
    // Finálne zhrnutie do info poľa
    var completedSteps = Object.keys(results).length;
    utils.addInfo(entry(), "Komplexná AI analýza dokončená", {
        method: "complexAIAnalysis",
        result: "Dokončené " + completedSteps + "/" + steps.length + " krokov",
        details: "Spracované typy: " + Object.keys(results).join(", ")
    });
    
    message("🧠 AI analýza dokončená!\n" +
           "✅ Úspešných krokov: " + completedSteps + "/" + steps.length);
           
} catch (e) {
    utils.addError(entry(), e, "complexAIAnalysis");
    message("💥 Chyba v AI analýze: " + e.toString());
}
12.3 Batch AI processing s rozšíreným monitorovaním (v2.2)
javascript
// Action: "🔄 Inteligentné batch spracovanie"
var utils = MementoUtils;

// v2.2 - Performance monitoring
utils.includeLineNumbers = true;

var selectedEntries = lib().find("selected:true");
if (selectedEntries.length === 0) {
    message("❌ Označte záznamy na spracovanie");
    return;
}

utils.addDebug(entry(), "🔄 Spúšťam batch AI spracovanie na " + selectedEntries.length + " záznamoch", {
    location: "batchProcessing",
    data: {totalEntries: selectedEntries.length}
});

var startTime = Date.now();

var results = utils.processBatch(selectedEntries, function(item, index) {
    try {
        // Performance tracking pre jednotlivé položky
        var itemStartTime = Date.now();
        
        // AI analýza každého záznamu
        var analysisResult = utils.aiAnalyzeEntry(
            item,
            "categorize",
            ["Popis", "Poznámky"],
            {
                provider: "OpenAi",
                model: "gpt-4o-mini",
                maxTokens: 200 // Kratšie pre batch processing
            }
        );
        
        var itemDuration = Date.now() - itemStartTime;
        
        if (analysisResult.success) {
            item.set("AI_Kategória", analysisResult.analysis);
            item.set("AI_Spracované", "Áno");
            item.set("AI_Čas_ms", itemDuration);
            
            // Log performance warning pre pomalé operácie
            if (itemDuration > 10000) { // 10 sekúnd
                utils.addDebug(entry(), "⚠️ Pomalé spracovanie položky " + index + ": " + itemDuration + "ms", {
                    location: "batchItem",
                    data: {index: index, duration: itemDuration}
                });
            }
            
            return true;
        } else {
            utils.addError(entry(), "Batch item " + index + " failed: " + analysisResult.error, "batchItem_" + index);
            return false;
        }
        
    } catch (e) {
        utils.addError(entry(), e, "batchProcessing_item_" + index);
        return false;
    }
}, entry());

var totalDuration = Date.now() - startTime;
var avgTimePerItem = results.total > 0 ? (totalDuration / results.total) : 0;

// v2.2 - Rozšírené performance reporting do info poľa
utils.addInfo(entry(), "Batch AI spracovanie dokončené", {
    method: "batchAIProcessing",
    result: "Spracované " + results.success.length + "/" + results.total + " položiek",
    performance: "Celkový čas: " + totalDuration + "ms, Priemer: " + Math.round(avgTimePerItem) + "ms/položka",
    successRate: Math.round((results.success.length / results.total) * 100) + "%"
});

message("🔄 Batch spracovanie dokončené!\n\n" +
       "✅ Úspešné: " + results.success.length + "\n" +
       "❌ Zlyhané: " + results.failed.length + "\n" +
       "📊 Celkovo: " + results.total + "\n" +
       "⏱️ Čas: " + Math.round(totalDuration/1000) + "s (" + Math.round(avgTimePerItem) + "ms/položka)");
13. Troubleshooting
13.1 Časté problémy (v2.2 rozšírené)
AI kľúče nefungujú
javascript
// Test API kľúčov s rozšírenými info - výsledky do Debug_Log
var testResults = utils.testApiKeys(["OpenAi"], entry());
if (testResults.failed.length > 0) {
    utils.addError(entry(), "Chýbajúce API kľúče: " + testResults.failed.join(", "), "apiKeyTest");
}

// Vyčistenie cache
utils.clearApiKeyCache();
var freshKey = utils.getApiKey("OpenAi", entry());
Link to Entry atribúty nefungujú
javascript
// Skontroluj syntax - MUSÍ byť index ako číslo!
utils.safeSetAttribute(entry(), "Produkty", 0, "Množstvo", 5); // ✅ Správne
// NIE: utils.safeSetAttribute(entry(), "Produkty", "Množstvo", 5); // ❌ Zlé
Error handling debugging (v2.2)
javascript
// v2.2 - Rozšírené error info - všetko do príslušných polí záznamu
utils.includeLineNumbers = true;
utils.includeStackTrace = true; // Pre development

try {
    riskyOperation();
} catch (e) {
    // v2.2 automaticky extrahuje error type, message, lineNumber, stack do Error_Log
    utils.addError(entry(), e, "riskyOperation");
    
    // Debug info o error objekte do Debug_Log
    utils.addDebug(entry(), "Error details:", {
        data: {
            type: e.name || "Error",
            message: e.message || e.toString(),
            line: e.lineNumber || "unknown"
        }
    });
}
13.2 Performance monitoring (v2.2 rozšírené)
javascript
// v2.2 - Detailné performance tracking do Debug_Log a info polí
function measureOperation(operationName, operation) {
    var startTime = Date.now();
    var startMemory = Date.now(); // Placeholder pre memory tracking
    
    try {
        var result = operation();
        var duration = Date.now() - startTime;
        
        utils.addDebug(entry(), "✅ " + operationName + " completed", {
            location: "performance",
            data: {
                duration: duration + "ms",
                success: true,
                timestamp: moment().format('HH:mm:ss')
            }
        });
        
        // Warning pre pomalé operácie
        if (duration > 5000) {
            utils.addDebug(entry(), "⚠️ Slow operation detected: " + operationName, {
                location: "performance",
                data: {duration: duration, threshold: 5000}
            });
        }
        
        // Info o výkone do info poľa
        utils.addInfo(entry(), "Operácia " + operationName + " dokončená", {
            method: "measureOperation",
            result: "Trvanie: " + duration + "ms",
            performance: duration > 5000 ? "POMALÉ" : "OK"
        });
        
        return result;
    } catch (e) {
        var duration = Date.now() - startTime;
        utils.addError(entry(), e, operationName + "_performance");
        utils.addDebug(entry(), "❌ " + operationName + " failed after " + duration + "ms");
        throw e;
    }
}

// Použitie
var aiResult = measureOperation("AI Analysis", function() {
    return utils.aiAnalyzeEntry(entry(), "summarize", ["Popis"], {
        provider: "OpenAi",
        debugEntry: entry()
    });
});
13.3 Debug tipy (v2.2)
javascript
// v2.2 - Komplexný debug systém - všetko do polí záznamu
function debugSession(sessionName) {
    utils.addDebug(entry(), "=== DEBUG SESSION: " + sessionName + " ===", {
        location: "debugSession",
        data: {
            sessionStart: moment().format('HH:mm:ss.SSS'),
            entryId: entry().field("ID"),
            libraryName: lib().name
        }
    });
    
    return {
        step: function(stepName, data) {
            utils.addDebug(entry(), "🔸 " + stepName, {
                location: sessionName,
                data: data || {}
            });
        },
        
        end: function(result) {
            utils.addDebug(entry(), "=== END SESSION: " + sessionName + " ===", {
                location: "debugSession",
                data: {
                    sessionEnd: moment().format('HH:mm:ss.SSS'),
                    result: result || "completed"
                }
            });
            
            // Súhrn session do info poľa
            utils.addInfo(entry(), "Debug session " + sessionName + " dokončená", {
                method: "debugSession",
                result: result || "completed",
                sessionDuration: "Ukončená o " + moment().format('HH:mm:ss.SSS')
            });
        }
    };
}

// Použitie
var debug = debugSession("ComplexWorkflow");
debug.step("Loading customer", {customerId: 123});
debug.step("Processing order", {items: 5});
debug.step("AI analysis", {provider: "OpenAi"});
debug.end("Success");
🎯 Záver
MementoUtils v2.2 predstavuje ďalší krok vo vývoji výkonnej utility knižnice pre Memento Database. Hlavné vylepšenia v tejto verzii:

✅ Nové vo v2.2:
Rozšírené error handling s automatickou extrakciou error objektov do Error_Log poľa

Line numbers a stack trace podpora pre lepšie debugging

Pokročilé performance monitoring s detailnými metrikami do Debug_Log poľa

Contextuálne debug správy s štruktúrovanými dátami

Vylepšené error reporting s type/message/line extrakciou

Info logging pre výsledky operácií do info poľa

Backward compatibility so všetkými predchádzajúcimi verziami

🚀 Kľúčové funkcie (všetky verzie):
AI integrácia s OpenAI, Perplexity, OpenRouter

Inteligentné SQL operácie s natural language podporou

Robustné error handling s comprehensive debugging do polí záznamu

Bezpečné API patterns pre všetky Memento operácie

Časové utility s moment.js integráciou

Batch processing s individual error tracking

Business logic helpers pre rýchly vývoj

📈 Najdôležitejšie tipy:
Využite v2.2 error features: utils.includeLineNumbers = true

Monitorujte performance: Používajte measureOperation pattern

Debugujte systematicky: Využite debugSession helper - všetko sa loguje do polí záznamu

Testujte API kľúče: utils.testApiKeys() pred produkciou

Validujte vstupy: utils.validateRequiredFields()

Používajte safe funkcie: Namiesto priameho prístupu k poliam

Cache API kľúče: Automaticky sa cachujú na 1 hodinu

🎯 Logovanie v Memento:
Debug_Log pole: Všetky debug správy, progress info, detailné kroky

Error_Log pole: Chyby, exception handling, failed operations

info pole: Súhrny operácií, výsledky výpočtov, business logic info

🎯 Praktické použitie:
Automatické spracovanie dokumentov s AI vision

Natural language reporting a SQL generovanie

Inteligentné kategorizovanie a analýza dát

Automatizované workflows s AI decision making

Pokročilé time tracking a business analytics

Komplexné error tracking a performance monitoring

S MementoUtils v2.2 môžete vytvárať skutočne sofistikované, robustné a monitorované business aplikácie priamo v Memento Database! 🎯

Verzia: 2.2
Dátum: August 2025
Autor: ASISTANTO
Kompatibilita: Memento Database (všetky verzie s JavaScript support)

ASISTANTO API knižnica je štandardná memento database knižnica(databáza) so záznamami o provideroch a s api kľúčmi

ASISTANTO API knižnica je štandardná memento database knižnica(databáza) so záznamami o provideroch a s api kľúčmi
Rozumiem, ďakujem za upresnienie! ASISTANTO API je štandardná knižnica (databáza) v Memento Database, ktorá obsahuje záznamy o AI provideroch a ich API kľúčoch.

Štruktúra ASISTANTO API knižnice
Na základe dokumentácie by mala ASISTANTO API knižnica obsahovať tieto polia:

Potrebné polia:
Provider (Choice alebo Text) - Názov providera ("OpenAi", "Perplexity", "OpenRouter")

API_Key (Text) - Váš API kľúč pre daného providera

Názov (Text) - Popis alebo názov kľúča pre identifikáciu

Príklad záznamov v knižnici:
text
Provider: OpenAi
API_Key: sk-proj-xxxxxxxxxxxxxxxxxxxxx
Názov: OpenAI GPT-4o Mini kľúč

Provider: Perplexity  
API_Key: pplx-xxxxxxxxxxxxxxxxxxxxx
Názov: Perplexity Sonar kľúč

Provider: OpenRouter
API_Key: sk-or-xxxxxxxxxxxxxxxxxxxxx  
Názov: OpenRouter free tier kľúč
Použitie v MementoUtils 2.2
MementoUtils knižnica automaticky načítava API kľúče z tejto databázy pomocou funkcií:

javascript
// Načítanie konkrétneho API kľúča
var apiKey = utils.getApiKey("OpenAi", entry());

// Cached verzia (odporúčaná)
var cachedKey = utils.getCachedApiKey("OpenAi", entry());

// Test dostupnosti všetkých kľúčov
var results = utils.testApiKeys(["OpenAi", "Perplexity"], entry());
Výhody tohto prístupu:
Centralizovaná správa - Všetky API kľúče na jednom mieste

Bezpečnosť - Kľúče nie sú hardkódované v skriptoch

Flexibilita - Jednoducho pridať nového providera

Cache mechanizmus - Optimalizované načítavanie kľúčov

Multi-provider podpora - OpenAI, Perplexity, OpenRouter v jednej knižnici

Nastavenie:
Vytvorte novú knižnicu s názvom "ASISTANTO API"

Pridajte potrebné polia (Provider, API_Key, Názov)

Vytvorte záznamy pre každého AI providera

MementoUtils bude automaticky načítavať kľúče podľa potreby

Takto máte všetky AI API kľúče organizovane v štandardnej Memento Database štruktúre, čo je oveľa bezpečnejšie a praktickejšie ako ich ukladanie priamo v kóde.

v script Dochádzka Notifications 2.5.js je fungujúci príklad použitia api keys a volaní https, analyzuj script a implementuj tieto poznatky do dokumentácie MementoUtils

v script Dochádzka Notifications 2.5.js je fungujúci príklad použitia api keys a volaní https, analyzuj script a implementuj tieto poznatky do dokumentácie MementoUtils
Analyzujem script Dochádzka Notifications 2.5.js a implementujem poznatky do dokumentácie MementoUtils v2.2:

📘 Komplexný manuál pre MementoUtils v2.2
📑 Obsah manuálu
Inštalácia a základné nastavenie

Konfigurácia a nastavenia

Debug a error handling

Práca s poliami a záznamami

Link to Entry operácie

AI integrácia

SQL operácie

HTTP komunikácia a API volania

Časové funkcie

Validácie a formátovanie

Batch processing

Business logic funkcie

Praktické príklady použitia

Troubleshooting

1. Inštalácia a základné nastavenie
1.1 Pridanie knižnice do Memento
Otvorte Memento Database

Prejdite na Settings → Scripts → JavaScript knižnice

Vytvorte nový súbor MementoUtils.js

Skopírujte obsah knižnice v2.2 do súboru

Označte knižnicu ako aktívnu ✅

1.2 Import v scriptoch
javascript
// Na začiatku každého scriptu
var utils = MementoUtils;

// Overenie verzie
var version = utils.version; // "2.2"
1.3 Požadované závislosti
✅ moment.js - už súčasť Memento Database
✅ ASISTANTO API knižnica - pre AI funkcie a HTTP komunikáciu (voliteľné)
✅ HTTP prístup - pre AI API volania a externé služby

2. Konfigurácia a nastavenia
2.1 Základná konfigurácia
javascript
var utils = MementoUtils;

// Prístup ku konfigurácii
var config = utils.DEFAULT_CONFIG;

// Všetky dostupné nastavenia - logované do Debug_Log poľa
utils.addDebug(entry(), "Debug pole: " + config.debugFieldName);          // "Debug_Log"
utils.addDebug(entry(), "Error pole: " + config.errorFieldName);          // "Error_Log"
utils.addDebug(entry(), "Dátum formát: " + config.dateFormat);            // "DD.MM.YY HH:mm"
utils.addDebug(entry(), "Default AI provider: " + config.defaultAIProvider); // "OpenAi"
utils.addDebug(entry(), "API cache timeout: " + config.apiCacheTimeout);  // 3600000 (1h)
utils.addDebug(entry(), "Quarter rounding: " + config.quarterRoundingMinutes); // 15
2.2 AI Provider konfigurácia
javascript
// Dostupní AI provideri
var providers = utils.AI_PROVIDERS;

// Konfigurácia pre OpenAI - info logované do poľa
var openaiConfig = providers.OpenAi;
utils.addInfo(entry(), "OpenAI konfigurácia načítaná", {
    method: "getConfig",
    result: "Base URL: " + openaiConfig.baseUrl + ", Model: " + openaiConfig.defaultModel
});

// Konfigurácia pre Perplexity
var perplexityConfig = providers.Perplexity;
utils.addInfo(entry(), "Perplexity konfigurácia", {
    method: "getConfig", 
    result: "Model: " + perplexityConfig.defaultModel
});

// Konfigurácia pre OpenRouter
var openrouterConfig = providers.OpenRouter;
utils.addInfo(entry(), "OpenRouter konfigurácia", {
    method: "getConfig",
    result: "Model: " + openrouterConfig.defaultModel
});
3. Debug a error handling
3.1 Rozšírené error handling (v2.2)
javascript
var utils = MementoUtils;

// Nové v2.2 - pokročilé error reporting s line numbers a stack trace
utils.includeLineNumbers = true;  // Zapnutie line numbers v logoch
utils.includeStackTrace = false;  // Stack trace (default false)

// Debug správy s kontextom - zapisujú sa do Debug_Log poľa
utils.addDebug(entry(), "🔍 Spúšťam spracovanie", {
    location: "processOrder",
    lineNumber: 42,
    data: {orderId: 123, status: "processing"}
});

// Error správy s objektom chyby (v2.2 rozšírené) - zapisujú sa do Error_Log poľa
try {
    // rizikový kód
    var result = dangerousOperation();
} catch (e) {
    // v2.2 podporuje error objekty s automatickou extrakciou info
    utils.addError(entry(), e, "dangerousOperation");
    // Extrahuje: type, message, lineNumber, stack (ak dostupné)
}
3.2 Základné logovanie
javascript
// Debug správy - zapisujú sa do Debug_Log poľa
utils.addDebug(entry(), "🔍 Spúšťam spracovanie záznamu");
utils.addDebug(entry(), "📊 Načítané dáta: " + data.length + " položiek");

// Error správy s verziou - zapisujú sa do Error_Log poľa
utils.addError(entry(), "❌ Chyba pri načítaní dát", "scriptName v1.0");

// Info správy s detailmi - zapisujú sa do info poľa
utils.addInfo(entry(), "Záznam úspešne spracovaný", {
    sourceId: entry().field("ID"),
    method: "processRecord", 
    result: "Vytvorených 5 súvisiacich záznamov",
    libraryName: "Projekty"
});
3.3 Správa logov
javascript
// Vyčistenie logov na začiatku scriptu
utils.clearLogs(entry(), false); // false = nemazať error logy
utils.clearLogs(entry(), true);  // true = vymazať aj error logy

// Uloženie a trimovanie logov (ak sú príliš veľké)
utils.saveLogs(entry());
3.4 Kompletný error handling pattern (v2.2)
javascript
var utils = MementoUtils;

// v2.2 - Zapnutie rozšírených error info
utils.includeLineNumbers = true;

try {
    utils.clearLogs(entry(), false);
    utils.addDebug(entry(), "🚀 Script started");
    
    // Váš kód tu
    var result = doSomething();
    
    utils.addInfo(entry(), "Operácia dokončená", {
        result: "Úspešne spracované " + result.count + " položiek"
    });
    
} catch (e) {
    // v2.2 - automatická extrakcia error info do Error_Log poľa
    utils.addError(entry(), e, "myScript v1.0");
    message("💥 Chyba: " + e.toString());
} finally {
    utils.saveLogs(entry());
    utils.addDebug(entry(), "🏁 Script completed");
}
4. Práca s poliami a záznamami
4.1 Bezpečný prístup k poliam
javascript
var utils = MementoUtils;

// Bezpečné čítanie s default hodnotou
var customerName = utils.safeGet(entry(), "Názov zákazníka", "Neznámy");
var price = utils.safeGet(entry(), "Cena", 0);
var isActive = utils.safeGet(entry(), "Aktívny", false);

// Alias funkcia (rovnaká funkcionalita)
var description = utils.safeFieldAccess(entry(), "Popis", "Bez popisu");

// Bezpečný zápis
if (utils.safeSet(entry(), "Status", "Spracované")) {
    utils.addDebug(entry(), "✅ Status úspešne nastavený");
} else {
    utils.addError(entry(), "❌ Chyba pri nastavovaní statusu", "safeSet");
}
4.2 Validácie polí
javascript
// Validácia povinných polí
var validation = utils.validateRequiredFields(entry(), [
    "Názov", "Email", "Telefón", "Zákazník"
]);

if (!validation.isValid) {
    var errorMsg = "Chýbajú povinné polia: " + validation.missingFields.join(", ");
    utils.addError(entry(), errorMsg, "validation");
    message(errorMsg);
    cancel(); // Zruší uloženie v trigger scripte
}

// Validácia stavu záznamu
var state = utils.validateEntryState(entry());
if (!state.isValid) {
    utils.addError(entry(), "Neplatný stav záznamu: " + state.errors.join(", "), "validateState");
}
5. Link to Entry operácie
5.1 Bezpečný prístup k linkom
javascript
var utils = MementoUtils;

// Získanie prvého linku
var customer = utils.safeGetFirstLink(entry(), "Zákazník");
if (customer) {
    var customerName = utils.safeGet(customer, "Názov", "Neznámy");
    utils.addDebug(entry(), "Zákazník: " + customerName);
}

// Získanie všetkých linkov
var products = utils.safeGetLinks(entry(), "Produkty");
utils.addDebug(entry(), "Počet produktov: " + products.length);

var totalPrice = 0;
for (var i = 0; i < products.length; i++) {
    var price = utils.safeGet(products[i], "Cena", 0);
    totalPrice += price;
}
entry().set("Celková cena", totalPrice);
5.2 LinksFrom operácie
javascript
// Nájdenie spätných linkov
var customer = entry(); // aktuálny zákazník
var orders = utils.safeLinksFrom(customer, "Objednávky", "Zákazník", entry());

utils.addDebug(entry(), "Počet objednávok: " + orders.length);

// LinksFrom s variáciami názvov polí
var relatedItems = utils.findLinksWithVariations(
    entry(),
    "Súvisiace záznamy",
    ["Zamestnanec", "Zamestnanci", "Employee"], // rôzne možné názvy
    entry()
);
5.3 Atribúty v Link to Entry
javascript
// SPRÁVNA SYNTAX pre nastavenie atribútu!
var success = utils.safeSetAttribute(entry(), "Produkty", 0, "Množstvo", 5);
if (success) {
    utils.addDebug(entry(), "✅ Atribút Množstvo nastavený");
}

// Alias pre kratšie písanie
utils.safeSetAttr(entry(), "Produkty", 0, "Zľava", 0.1);

// Získanie atribútu
var quantity = utils.safeGetAttribute(entry(), "Produkty", 0, "Množstvo", 1);
var discount = utils.safeGetAttribute(entry(), "Produkty", 0, "Zľava", 0);

utils.addDebug(entry(), "Množstvo: " + quantity + ", Zľava: " + (discount * 100) + "%");
6. AI integrácia
6.1 Setup API kľúčov
Vytvorte knižnicu "ASISTANTO API" s poliami:

Provider (Choice) - "OpenAi", "Perplexity", "OpenRouter", "Telegram"

API_Key (Text) - váš API kľúč

Názov (Text) - popis kľúča

6.2 Test API kľúčov
javascript
var utils = MementoUtils;

// Test všetkých dostupných kľúčov - výsledky logované do Debug_Log
var results = utils.testApiKeys(["OpenAi", "Perplexity"], entry());
message("Test dokončený: " + results.success.length + "/" + results.total + " kľúčov OK");

// Test konkrétneho kľúča
var apiKey = utils.getCachedApiKey("OpenAi", entry());
if (apiKey) {
    utils.addDebug(entry(), "✅ OpenAI kľúč dostupný");
} else {
    utils.addError(entry(), "❌ OpenAI kľúč chýba", "testApiKey");
}

// Vyčistenie cache kľúčov
utils.clearApiKeyCache();
6.3 Základné AI volania
javascript
// Jednoduché AI volanie - debug info zapisané do Debug_Log
var result = utils.callAI("OpenAi", "Zhrň tento text: " + entry().field("Popis"), {
    model: "gpt-4o-mini",
    maxTokens: 500,
    temperature: 0.7,
    debugEntry: entry()
});

if (result.success) {
    entry().set("AI_Zhrnutie", result.response);
    utils.addDebug(entry(), "✅ AI odpoveď: " + result.response.substring(0, 100) + "...");
} else {
    utils.addError(entry(), "AI volanie zlyhalo: " + result.error, "callAI");
}
6.4 AI analýza záznamov
javascript
// Analýza konkrétnych polí - progress logovaný do Debug_Log, výsledky do info
var analysisResult = utils.aiAnalyzeEntry(
    entry(),
    "summarize", // typ: "summarize", "categorize", "extract", "sentiment"
    ["Popis", "Poznámky", "Status"], // polia na analýzu
    {
        provider: "OpenAi",
        model: "gpt-4o-mini",
        customPrompt: "Analyzuj tento pracovný záznam a vytvor stručné zhrnutie.",
        debugEntry: entry()
    }
);

if (analysisResult.success) {
    entry().set("AI_Analýza", analysisResult.analysis);
    
    utils.addInfo(entry(), "AI analýza dokončená", {
        fieldsAnalyzed: analysisResult.fieldsAnalyzed.join(", "),
        provider: analysisResult.provider
    });
}
6.5 Natural Language to SQL
javascript
// Generovanie SQL z prirodzeného jazyka - debug do Debug_Log
var sqlResult = utils.aiGenerateSQL(
    "Koľko projektov má každý zamestnanec?",
    ["Projekty", "Zamestnanci", "Priradenia"], // dostupné tabuľky
    {
        provider: "Perplexity",
        debugEntry: entry()
    }
);

if (sqlResult.success) {
    utils.addDebug(entry(), "🔍 Vygenerovaný SQL: " + sqlResult.sqlQuery);
    
    // Vykonaj SQL
    try {
        var data = sql(sqlResult.sqlQuery).asObjects();
        entry().set("SQL_Výsledky", JSON.stringify(data, null, 2));
    } catch (e) {
        utils.addError(entry(), "SQL vykonanie zlyhalo: " + e, "executeSQL");
    }
}
7. SQL operácie
7.1 Smart SQL (automatická detekcia)
javascript
var utils = MementoUtils;

// Rozpozná či je to SQL alebo prirodzený jazyk - debug do Debug_Log
var result = utils.smartSQL("Ukáž mi všetkých aktívnych zákazníkov", {
    returnType: "objects", // "objects", "arrays", "scalar", "count"
    availableTables: ["Zákazníci", "Objednávky"],
    aiProvider: "OpenAi",
    debugEntry: entry()
});

if (result.success) {
    var customers = result.data;
    utils.addDebug(entry(), "📊 Nájdených zákazníkov: " + customers.length);
    
    // Spracuj výsledky
    for (var i = 0; i < customers.length; i++) {
        utils.addDebug(entry(), "Zákazník: " + customers[i].Názov);
    }
}
7.2 SQL s AI interpretáciou
javascript
// SQL s AI interpretáciou - výsledky do info poľa
var interpretation = utils.sqlWithAIInterpretation(
    "SELECT Status, COUNT(*) as Počet FROM Úlohy GROUP BY Status",
    "Analyzuj tieto štatistiky úloh a navrhni zlepšenia produktivity:",
    {
        aiProvider: "OpenRouter",
        aiModel: "meta-llama/llama-3.1-8b-instruct:free",
        maxTokens: 800,
        debugEntry: entry()
    }
);

if (interpretation.success) {
    entry().set("SQL_Dáta", JSON.stringify(interpretation.sqlData, null, 2));
    entry().set("AI_Interpretácia", interpretation.aiInterpretation);
    
    utils.addInfo(entry(), "SQL + AI interpretácia dokončená", {
        recordsFound: interpretation.sqlData.length,
        aiSuccess: interpretation.aiSuccess
    });
}
8. HTTP komunikácia a API volania
8.1 Základné HTTP operácie (na základe Dochádzka script)
javascript
var utils = MementoUtils;

// GET request s error handlingom
function httpGet(url, headers) {
    try {
        utils.addDebug(entry(), "🌐 HTTP GET: " + url);
        
        var httpObj = http();
        
        // Nastavenie headerov
        if (headers) {
            for (var key in headers) {
                httpObj.header(key, headers[key]);
            }
        }
        
        var response = httpObj.get(url);
        
        if (response.code === 200) {
            utils.addDebug(entry(), "✅ HTTP GET úspešný");
            return {
                success: true,
                data: JSON.parse(response.body),
                code: response.code
            };
        } else {
            utils.addError(entry(), "HTTP GET chyba " + response.code + ": " + response.body, "httpGet");
            return {success: false, error: "HTTP " + response.code, code: response.code};
        }
        
    } catch (e) {
        utils.addError(entry(), e, "httpGet");
        return {success: false, error: e.toString()};
    }
}

// POST request s JSON payload
function httpPostJSON(url, payload, headers) {
    try {
        utils.addDebug(entry(), "🌐 HTTP POST JSON: " + url);
        
        var httpObj = http();
        
        // Default JSON headers
        httpObj.header("Content-Type", "application/json");
        
        // Dodatočné headers
        if (headers) {
            for (var key in headers) {
                httpObj.header(key, headers[key]);
            }
        }
        
        var response = httpObj.post(url, JSON.stringify(payload));
        
        if (response.code >= 200 && response.code < 300) {
            utils.addDebug(entry(), "✅ HTTP POST úspešný");
            return {
                success: true,
                data: response.body ? JSON.parse(response.body) : null,
                code: response.code
            };
        } else {
            utils.addError(entry(), "HTTP POST chyba " + response.code + ": " + response.body, "httpPostJSON");
            return {success: false, error: "HTTP " + response.code, code: response.code};
        }
        
    } catch (e) {
        utils.addError(entry(), e, "httpPostJSON");
        return {success: false, error: e.toString()};
    }
}
8.2 Telegram API integrácia (z Dochádzka script)
javascript
// Načítanie API kľúčov z ASISTANTO API knižnice
function getTelegramApiKey() {
    try {
        utils.addDebug(entry(), "🔑 Načítavam Telegram API kľúč...");
        
        var apiLib = libByName("ASISTANTO API");
        if (!apiLib) {
            utils.addError(entry(), "ASISTANTO API knižnica nenájdená", "getTelegramApiKey");
            return null;
        }
        
        var telegramEntries = apiLib.find("Provider", "Telegram");
        if (!telegramEntries || telegramEntries.length === 0) {
            utils.addError(entry(), "Telegram API kľúč nenájdený", "getTelegramApiKey");
            return null;
        }
        
        var botToken = utils.safeGet(telegramEntries[0], "API_Key", "");
        var botName = utils.safeGet(telegramEntries[0], "Názov", "");
        
        if (botToken) {
            utils.addDebug(entry(), "✅ Telegram API kľúč načítaný: " + botName);
            return {token: botToken, name: botName};
        } else {
            utils.addError(entry(), "Prázdny Telegram API kľúč", "getTelegramApiKey");
            return null;
        }
        
    } catch (e) {
        utils.addError(entry(), e, "getTelegramApiKey");
        return null;
    }
}

// Konverzia username na chat ID
function getUserChatId(username, botToken) {
    try {
        if (!username || typeof username !== 'string') {
            utils.addDebug(entry(), "💬 Chat ID je prázdny alebo nie je string");
            return null;
        }
        
        // Ak je už číselné, vráť ako je
        if (!username.startsWith('@')) {
            utils.addDebug(entry(), "💬 Chat ID je už číselný: " + username);
            return username;
        }
        
        utils.addDebug(entry(), "🔍 Konvertujem username " + username + " na Chat ID...");
        
        // Získaj updates z Telegram API
        var updatesResult = httpGet(
            "https://api.telegram.org/bot" + botToken + "/getUpdates"
        );
        
        if (!updatesResult.success) {
            utils.addError(entry(), "getUpdates API volanie zlyhalo", "getUserChatId");
            return null;
        }
        
        var data = updatesResult.data;
        if (!data.ok || !data.result) {
            utils.addError(entry(), "getUpdates response nie je OK", "getUserChatId");
            return null;
        }
        
        var updates = data.result;
        utils.addDebug(entry(), "📡 Načítaných " + updates.length + " updates");
        
        var targetUsername = username.substring(1).toLowerCase();
        
        for (var i = 0; i < updates.length; i++) {
            var update = updates[i];
            var chat = update.message && update.message.chat;
            
            if (chat && chat.username && chat.username.toLowerCase() === targetUsername) {
                var foundChatId = chat.id.toString();
                utils.addDebug(entry(), "✅ Nájdený Chat ID: " + foundChatId + " pre " + username);
                return foundChatId;
            }
        }
        
        utils.addError(entry(), "Username " + username + " nenájdený v updates", "getUserChatId");
        return null;
        
    } catch (e) {
        utils.addError(entry(), e, "getUserChatId");
        return null;
    }
}

// Poslanie Telegram správy
function sendTelegramMessage(chatId, message, botToken) {
    try {
        utils.addDebug(entry(), "📱 Posielam Telegram správu...");
        
        var finalChatId = getUserChatId(chatId, botToken);
        if (!finalChatId) {
            utils.addError(entry(), "Nepodarilo sa získať platný Chat ID pre " + chatId, "sendTelegramMessage");
            return false;
        }
        
        var payload = {
            chat_id: finalChatId,
            text: message,
            parse_mode: "Markdown"
        };
        
        var result = httpPostJSON(
            "https://api.telegram.org/bot" + botToken + "/sendMessage",
            payload
        );
        
        if (result.success) {
            utils.addDebug(entry(), "✅ Telegram správa úspešne odoslaná");
            return true;
        } else {
            utils.addError(entry(), "Telegram správa zlyhala: " + result.error, "sendTelegramMessage");
            return false;
        }
        
    } catch (e) {
        utils.addError(entry(), e, "sendTelegramMessage");
        return false;
    }
}
8.3 Generické API wrapper funkcie
javascript
// Univerzálny API wrapper s retry logikou
function callExternalAPI(config) {
    var maxRetries = config.maxRetries || 2;
    var attempt = 0;
    
    while (attempt < maxRetries) {
        try {
            utils.addDebug(entry(), "🔄 API volanie (pokus " + (attempt + 1) + "/" + maxRetries + "): " + config.url);
            
            var result;
            if (config.method === "GET") {
                result = httpGet(config.url, config.headers);
            } else if (config.method === "POST") {
                result = httpPostJSON(config.url, config.payload, config.headers);
            }
            
            if (result.success) {
                utils.addDebug(entry(), "✅ API volanie úspešné");
                return result;
            } else if (result.code >= 500 && attempt < maxRetries - 1) {
                // Server error - skús znovu
                attempt++;
                utils.addDebug(entry(), "⚠️ Server error, skúšam znovu za 2 sekundy...");
                
                // Pause medzi pokusmi (Memento nemá setTimeout)
                var pauseStart = Date.now();
                while (Date.now() - pauseStart < 2000) {
                    // Busy wait 2 sekundy
                }
                continue;
            } else {
                // Client error alebo posledný pokus
                return result;
            }
            
        } catch (e) {
            attempt++;
            utils.addError(entry(), e, "callExternalAPI_attempt_" + attempt);
            
            if (attempt >= maxRetries) {
                return {success: false, error: "All retries failed: " + e.toString()};
            }
        }
    }
    
    return {success: false, error: "Max retries exceeded"};
}

// Príklad použitia
var apiResult = callExternalAPI({
    method: "POST",
    url: "https://api.example.com/data",
    payload: {name: "test"},
    headers: {"Authorization": "Bearer " + token},
    maxRetries: 3
});
9. Časové funkcie
9.1 Formátovanie času
javascript
var utils = MementoUtils;

// Formátovanie času do HH:mm
var startTime = utils.formatTime(entry().field("Od")); // "09:30"
var endTime = utils.formatTime(entry().field("Do"));   // "17:45"

utils.addDebug(entry(), "Pracovný čas: " + startTime + " - " + endTime);

// Zaokrúhlenie na 15 minút
var timeValue = moment("09:23", "HH:mm");
var rounded = utils.roundToQuarter(timeValue);
utils.addDebug(entry(), "Zaokrúhlený čas: " + utils.formatTime(rounded)); // "09:15"
9.2 Výpočty času
javascript
// Výpočet pracovného času - výsledky do info poľa
var startTime = entry().field("Od");
var endTime = entry().field("Do");

var workHours = utils.calculateHours(startTime, endTime);
entry().set("Odpracované hodiny", workHours);

utils.addInfo(entry(), "Časový výpočet dokončený", {
    method: "calculateHours",
    result: "Odpracovaných hodín: " + workHours
});

// Alias pre calculateHours
var timeDiff = utils.calculateTimeDifference(startTime, endTime);
9.3 Dátumové utility
javascript
// Kontrola víkendu - info do info poľa
var workDate = entry().field("Dátum");
if (utils.isWeekend(workDate)) {
    entry().set("Víkendová práca", true);
    utils.addInfo(entry(), "Označené ako víkendová práca", {
        method: "isWeekend",
        result: "Dátum " + moment(workDate).format("DD.MM.YYYY") + " je víkend"
    });
}

// Formátovanie dátumu (cez moment.js)
var formattedDate = moment(workDate).format("DD.MM.YYYY");
entry().set("Formátovaný dátum", formattedDate);
10. Validácie a formátovanie
10.1 Formátovanie peňazí
javascript
var utils = MementoUtils;

// Formátovanie peňažných súm
var amount = 1234.56;
var formatted = utils.formatMoney(amount, "€", 2); // "1234.56 €"
entry().set("Formátovaná cena", formatted);

// Parsing peňazí zo stringu
var priceString = "1,234.56 €";
var parsedAmount = utils.parseMoney(priceString); // 1234.56
utils.addDebug(entry(), "Parsovaná suma: " + parsedAmount);
10.2 Formátovanie mien
javascript
// Formátovanie mena zamestnanca
var employee = utils.safeGetFirstLink(entry(), "Zamestnanec");
var formattedName = utils.formatEmployeeName(employee);
// Výsledok: "jnovak (Ján Novák)" alebo "jnovak" alebo "Zamestnanec ID:123"

entry().set("Zamestnanec meno", formattedName);
utils.addDebug(entry(), "Formátované meno: " + formattedName);
10.3 Vyhľadávanie
javascript
// Vyhľadanie podľa unique poľa s variáciami - debug do Debug_Log
var employee = utils.findByUniqueField(
    "Zamestnanci",
    ["Nick", "nick", "Login"], // skúša rôzne názvy polí
    "jnovak"
);

if (employee) {
    utils.addDebug(entry(), "Zamestnanec nájdený: " + employee.field("Meno"));
} else {
    utils.addError(entry(), "Zamestnanec s nick 'jnovak' nebol nájdený", "findEmployee");
}

// Špecializované hľadanie zamestnanca
var emp = utils.findEmployeeByNick("jnovak", "Zamestnanci");
11. Batch processing
11.1 Hromadné spracovanie záznamov
javascript
var utils = MementoUtils;

// Označené záznamy
var selectedEntries = lib().find("selected:true");

var results = utils.processBatch(selectedEntries, function(item, index) {
    try {
        // Spracovanie jednotlivého záznamu
        item.set("Spracované", true);
        item.set("Dátum spracovania", Date.now());
        
        utils.addDebug(item, "Batch spracovanie úspešné");
        return true; // úspech
    } catch (e) {
        return false; // neúspech
    }
}, entry());

// Výsledky - info do info poľa
var successCount = results.success.length;
var failedCount = results.failed.length;
var totalCount = results.total;

utils.addInfo(entry(), "Batch spracovanie dokončené", {
    method: "processBatch",
    result: "Úspešné: " + successCount + ", Neúspešné: " + failedCount + ", Celkovo: " + totalCount
});

message("Batch spracovanie dokončené:\n" +
        "✅ Úspešné: " + successCount + "\n" +
        "❌ Neúspešné: " + failedCount + "\n" +
        "📊 Celkovo: " + totalCount);

// Detail chýb - errors do Error_Log
for (var i = 0; i < results.failed.length; i++) {
    var failed = results.failed[i];
    utils.addError(entry(), "Batch failed at index " + failed.index + ": " + failed.error, "processBatch");
}
12. Business logic funkcie
12.1 Práca so sadzbami
javascript
var utils = MementoUtils;

// Nájdenie platnej sadzby pre dátum - výsledky do info poľa
var employee = utils.safeGetFirstLink(entry(), "Zamestnanec");
var salaries = utils.safeGetLinks(employee, "Sadzby");
var workDate = entry().field("Dátum");

var validSalary = utils.findValidSalaryForDate(salaries, workDate);
if (validSalary > 0) {
    entry().set("Aktuálna sadzba", validSalary);
    utils.addInfo(entry(), "Sadzba nájdená", {
        method: "findValidSalaryForDate",
        result: "Platná sadzba: " + validSalary + " €/h pre dátum " + moment(workDate).format("DD.MM.YYYY")
    });
} else {
    utils.addError(entry(), "Nenájdená platná sadzba pre dátum: " + workDate, "findSalary");
}
12.2 Default hodnoty
javascript
// Získanie default HZS - debug do Debug_Log
var defaultHZS = utils.getDefaultHZS("ASISTANTO Defaults", "HZS");
if (defaultHZS) {
    utils.addDebug(entry(), "Default HZS: " + defaultHZS.field("Názov"));
}

// Nastavenie default hodnoty ak pole je prázdne
var hzsField = utils.setDefaultAndReload(entry(), "HZS", "ASISTANTO Defaults", "HZS");
if (hzsField) {
    utils.addInfo(entry(), "HZS pole nastavené", {
        method: "setDefaultAndReload",
        result: "HZS pole nastavené/načítané"
    });
}
13. Praktické príklady použitia
13.1 Kompletný notification systém (na základe Dochádzka script)
javascript
// Action: "📧 Pošli notifikácie"
var utils = MementoUtils;

// v2.2 - Zapnutie rozšírených error info
utils.includeLineNumbers = true;

try {
    utils.clearLogs(entry(), false);
    utils.addDebug(entry(), "🚀 Spúšťam notifikačný systém");
    
    // Načítanie API kľúčov z ASISTANTO API knižnice
    var telegramApi = getTelegramApiKey();
    if (!telegramApi) {
        utils.addError(entry(), "Telegram API kľúč nenájdený", "notificationSystem");
        message("❌ Chýba Telegram API konfigurácia");
        return;
    }
    
    // Získanie zamestnancov z Link to Entry poľa
    var employees = utils.safeGetLinks(entry(), "Zamestnanci");
    if (employees.length === 0) {
        utils.addError(entry(), "Žiadni zamestnanci v zázname", "notificationSystem");
        message("❌ Žiadni zamestnanci na notifikáciu");
        return;
    }
    
    var successfulNotifications = 0;
    var totalAttempts = 0;
    
    // Spracovanie každého zamestnanca
    for (var i = 0; i < employees.length; i++) {
        var employee = employees[i];
        var employeeName = utils.formatEmployeeName(employee);
        
        utils.addDebug(entry(), "👤 Spracovávam: " + employeeName);
        
        // Kontrola notifikačných nastavení
        var telegramEnabled = utils.safeGet(employee, "telegram", false);
        var chatId = utils.safeGet(employee, "Telegram ID", "");
        
        if (telegramEnabled && chatId) {
            totalAttempts++;
            
            // Vytvorenie personalizovanej správy
            var message = vytvorNotifikacnuSpravu(entry(), employee, i);
            
            // Poslanie Telegram správy
            if (sendTelegramMessage(chatId, message, telegramApi.token)) {
                successfulNotifications++;
                utils.addDebug(entry(), "✅ Notifikácia úspešne poslaná pre " + employeeName);
            } else {
                utils.addError(entry(), "Notifikácia zlyhala pre " + employeeName, "sendNotification");
            }
        } else {
            utils.addDebug(entry(), "⚠️ " + employeeName + " nemá zapnuté Telegram notifikácie");
        }
    }
    
    // Záverečné info
    utils.addInfo(entry(), "Notifikačný systém dokončený", {
        method: "notificationSystem",
        result: "Úspešné: " + successfulNotifications + "/" + totalAttempts + " notifikácií",
        totalEmployees: employees.length
    });
    
    message("📧 Notifikácie dokončené!\n" +
           "✅ Úspešné: " + successfulNotifications + "/" + totalAttempts + "\n" +
           "👥 Celkovo zamestnancov: " + employees.length);
    
} catch (e) {
    utils.addError(entry(), e, "notificationSystem");
    message("💥 Chyba v notifikačnom systéme: " + e.toString());
}

// Helper funkcia pre vytvorenie správy
function vytvorNotifikacnuSpravu(record, employee, employeeIndex) {
    var employeeName = utils.formatEmployeeName(employee);
    var date = utils.safeGet(record, "Dátum", null);
    var startTime = utils.safeGet(record, "Príchod", null);
    var endTime = utils.safeGet(record, "Odchod", null);
    
    var message = "🏢 **Evidencia dochádzky**\n\n";
    message += "Dobrý deň **" + employeeName + "**!\n\n";
    message += "📋 **Dochádzka " + moment(date).format("DD.MM.YYYY") + ":**\n";
    message += "🕐 Príchod: **" + utils.formatTime(startTime) + "**\n";
    
    if (endTime) {
        message += "🕐 Odchod: **" + utils.formatTime(endTime) + "**\n";
        
        var workHours = utils.calculateHours(startTime, endTime);
        if (workHours > 0) {
            message += "⏱️ Odpracované: **" + workHours + "h**\n";
        }
    }
    
    // Získanie atribútov zo zamestnanca (ak sú nastavené)
    try {
        var employeesField = record.field("Zamestnanci");
        if (employeesField && employeesField[employeeIndex]) {
            var salary = employeesField[employeeIndex].attr("hodinovka");
            if (salary) {
                message += "💰 Hodinovka: " + salary + " €/h\n";
            }
        }
    } catch (e) {
        // Atribúty nie sú dostupné
    }
    
    message += "\n---\n";
    message += "Firma ABC | " + moment().format("DD.MM.YYYY HH:mm");
    
    return message;
}
13.2 HTTP API integrácia s retry logikou
javascript
// Action: "🌐 Sync s externým systémom"
var utils = MementoUtils;

try {
    utils.addDebug(entry(), "🌐 Spúšťam synchronizáciu s externým API");
    
    // Konfigurácia API
    var apiConfig = {
        baseUrl: "https://api.example.com",
        apiKey: "your-api-key-here",
        timeout: 30000
    };
    
    // Získanie dát na synchronizáciu
    var syncData = {
        recordId: entry().field("ID"),
        name: utils.safeGet(entry(), "Názov", ""),
        status: utils.safeGet(entry(), "Status", ""),
        lastUpdate: moment().format("YYYY-MM-DD HH:mm:ss")
    };
    
    // API volanie s retry logikou
    var syncResult = callExternalAPI({
        method: "POST",
        url: apiConfig.baseUrl + "/records/sync",
        payload: syncData,
        headers: {
            "Authorization": "Bearer " + apiConfig.apiKey,
            "Content-Type": "application/json"
        },
        maxRetries: 3
    });
    
    if (syncResult.success) {
        // Uloženie response dát
        entry().set("Externý ID", syncResult.data.externalId);
        entry().set("Posledná sync", Date.now());
        entry().set("Sync status", "Úspešný");
        
        utils.addInfo(entry(), "Synchronizácia úspešná", {
            method: "externalApiSync",
            result: "Externý ID: " + syncResult.data.externalId,
            apiResponse: JSON.stringify(syncResult.data)
        });
        
        message("✅ Synchronizácia úspešná!\nExterný ID: " + syncResult.data.externalId);
        
    } else {
        entry().set("Sync status", "Zlyhala");
        entry().set("Posledná chyba", syncResult.error);
        
        utils.addError(entry(), "API synchronizácia zlyhala: " + syncResult.error, "externalApiSync");
        message("❌ Synchronizácia zlyhala:\n" + syncResult.error);
    }
    
} catch (e) {
    utils.addError(entry(), e, "externalApiSync");
    message("💥 Kritická chyba pri synchronizácii: " + e.toString());
}
14. Troubleshooting
14.1 HTTP API problémy
javascript
// Debug HTTP komunikácie
function debugHttpCall(url, method, payload) {
    utils.addDebug(entry(), "🔍 HTTP Debug Info:", {
        data: {
            url: url,
            method: method,
            payloadSize: payload ? JSON.stringify(payload).length : 0,
            timestamp: moment().format('HH:mm:ss.SSS')
        }
    });
}

// Test connectivity
function testApiConnection(baseUrl) {
    var testResult = httpGet(baseUrl + "/ping");
    if (testResult.success) {
        utils.addDebug(entry(), "✅ API connectivity test passed");
        return true;
    } else {
        utils.addError(entry(), "API connectivity test failed: " + testResult.error, "testConnection");
        return false;
    }
}
14.2 API kľúče problémy (rozšírené z Dochádzka script)
javascript
// Komplexný test API kľúčov
function validateApiConfiguration() {
    var results = {allValid: true, details: []};
    
    try {
        var apiLib = libByName("ASISTANTO API");
        if (!apiLib) {
            results.allValid = false;
            results.details.push("❌ ASISTANTO API knižnica neexistuje");
            return results;
        }
        
        var apiEntries = apiLib.entries();
        if (!apiEntries || apiEntries.length === 0) {
            results.allValid = false;
            results.details.push("❌ Žiadne API kľúče v knižnici");
            return results;
        }
        
        for (var i = 0; i < apiEntries.length; i++) {
            var apiEntry = apiEntries[i];
            var provider = utils.safeGet(apiEntry, "Provider", "");
            var apiKey = utils.safeGet(apiEntry, "API_Key", "");
            var name = utils.safeGet(apiEntry, "Názov", "");
            
            if (!provider) {
                results.allValid = false;
                results.details.push("❌ API záznam #" + (i+1) + ": chýba Provider");
            } else if (!apiKey) {
                results.allValid = false;
                results.details.push("❌ " + provider + ": chýba API_Key");
            } else if (apiKey.length < 10) {
                results.allValid = false;
                results.details.push("❌ " + provider + ": API kľúč je príliš krátky");
            } else {
                results.details.push("✅ " + provider + ": " + name + " (OK)");
            }
        }
        
        return results;
        
    } catch (e) {
        results.allValid = false;
        results.details.push("❌ Chyba pri validácii: " + e.toString());
        return results;
    }
}

// Použitie
var validation = validateApiConfiguration();
if (!validation.allValid) {
    utils.addError(entry(), "API konfigurácia nie je platná", "validateApiConfiguration");
    message("❌ Problémy s API konfiguráciou:\n" + validation.details.join("\n"));
} else {
    utils.addDebug(entry(), "✅ API konfigurácia je platná");
}
14.3 Performance monitoring pre HTTP volania
javascript
// Detailné performance tracking HTTP volaní
function measureHttpPerformance(operation, httpCall) {
    var startTime = Date.now();
    
    try {
        utils.addDebug(entry(), "⏱️ Začínam HTTP operáciu: " + operation);
        
        var result = httpCall();
        var duration = Date.now() - startTime;
        
        // Performance warning pre pomalé volania
        if (duration > 10000) { // 10 sekúnd
            utils.addDebug(entry(), "🐌 Pomalé HTTP volanie: " + operation + " (" + duration + "ms)", {
                location: "httpPerformance",
                data: {operation: operation, duration: duration, threshold: 10000}
            });
        }
        
        utils.addInfo(entry(), "HTTP operácia dokončená: " + operation, {
            method: "measureHttpPerformance",
            result: "Trvanie: " + duration + "ms",
            performance: duration > 10000 ? "POMALÉ" : "OK"
        });
        
        return result;
        
    } catch (e) {
        var duration = Date.now() - startTime;
        utils.addError(entry(), e, "httpPerformance_" + operation);
        utils.addDebug(entry(), "❌ " + operation + " zlyhalo po " + duration + "ms");
        throw e;
    }
}

// Použitie
var telegramResult = measureHttpPerformance("Telegram sendMessage", function() {
    return sendTelegramMessage(chatId, message, botToken);
});
🎯 Záver
MementoUtils v2.2 s integrovanými poznatkami z Dochádzka Notifications script predstavuje kompletnú utility knižnicu pre Memento Database. Hlavné vylepšenia:

✅ Nové vo v2.2 (na základe Dochádzka script):
Rozšírené HTTP komunikácie s retry logikou a error handlingom

Telegram API integrácia s username-to-chatID konverziou

Generické API wrapper funkcie pre externé služby

Performance monitoring pre HTTP volania s timeout detection

Detailná API konfigurácia validácia s comprehensive reporting

Praktické príklady notifikačných systémov a API integrácií

🚀 Kľúčové funkcie (všetky verzie):
AI integrácia s OpenAI, Perplexity, OpenRouter

HTTP komunikácia s Telegram, REST API, webhook podporou

Inteligentné SQL operácie s natural language podporou

Robustné error handling s line numbers a stack trace

API key management s cache mechanizmom

Bezpečné Memento patterns pre všetky operácie

Performance monitoring s detailnými metrikami

Notification systémy s multi-channel podporou

📈 HTTP a API tipy (z Dochádzka script):
Vždy používajte retry logiku pre HTTP volania

Implementujte timeout detection pre pomalé API

Cachujte API kľúče na optimalizáciu performance

Validujte API konfiguráciu pred produkčným použitím

Monitorujte HTTP performance s measureHttpPerformance

Používajte generické wrappery namiesto custom HTTP kódu

Implementujte fallback mechanizmy pre kritické API volania

🎯 Praktické použitie s HTTP:
Telegram notifikačné systémy s real-time správami

REST API synchronizácia s externými systémami

Webhook integrácie pre real-time updates

Multi-channel komunikácia (Telegram, SMS, Email)

API monitoring a alerting systémy

Performance tracking pre všetky HTTP operácie

S MementoUtils v2.2 a poznatkami z Dochádzka script môžete vytvárať skutočne sofistikované, robustné a real-time komunikačné aplikácie priamo v Memento Database! 🎯

Verzia: 2.2 (rozšírená o HTTP/API patterns)
Dátum: August 2025
Autor: ASISTANTO
Kompatibilita: Memento Database (všetky verzie s JavaScript a HTTP support)