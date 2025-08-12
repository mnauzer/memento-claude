📘 Komplexný manuál pre MementoUtils knižnica v2.1
📑 Obsah manuálu
Inštalácia a setup

Základné funkcie

AI integrácia

SQL operácie

Práca s poliami

Link to Entry operácie

Časové funkcie

Validácie a formátovanie

Batch processing

Praktické príklady

Troubleshooting

1. Inštalácia a setup
1.1 Pridanie knižnice do Memento
Otvorte Memento Database

Prejdite na Settings → Scripts → JavaScript knižnice

Pridajte nový súbor MementoUtils.js

Skopírujte obsah knižnice do súboru

Označte ako aktívnu ✅

1.2 Import v scriptoch
javascript
// Na začiatku každého scriptu
eval(sharedScript('MementoUtils'));
var utils = MementoUtils;

// Alebo priamo
var utils = MementoUtils;
1.3 Požadované závislosti
✅ moment.js - pre časové operácie (už je súčasť Mementa)

✅ ASISTANTO API knižnica - pre AI funkcie (voliteľné)

2. Základné funkcie
2.1 Debug a error logging
Základné logovanie
javascript
var utils = MementoUtils;

// Debug správy
utils.addDebug(entry(), "🔍 Spúšťam spracovanie záznamu");
utils.addDebug(entry(), "📊 Načítané dáta: " + data.length + " položiek");

// Error správy
utils.addError(entry(), "❌ Chyba pri načítaní dát", "scriptName v1.0");

// Info správy s detailmi
utils.addInfo(entry(), "Záznam úspešne spracovaný", {
    method: "processRecord",
    sourceId: entry().field("ID"),
    result: "Vytvorených 5 súvisiacich záznamov"
});
Čistenie logov
javascript
// Vyčistenie debug logov na začiatku scriptu
utils.clearLogs(entry(), false); // false = nemazať error logy
utils.clearLogs(entry(), true);  // true = vymazať aj error logy

// Uloženie logov (automatické trimovanie ak je príliš veľké)
utils.saveLogs(entry());
2.2 Konfigurácia
javascript
// Prístup ku konfigurácii
var config = utils.DEFAULT_CONFIG;

console.log(config.debugFieldName);     // "Debug_Log"
console.log(config.errorFieldName);     // "Error_Log"
console.log(config.dateFormat);         // "DD.MM.YY HH:mm"
console.log(config.defaultAIProvider);  // "OpenAi"
3. AI integrácia
3.1 Setup API kľúčov
Vytvorte knižnicu "ASISTANTO API" s poliami:

Provider (Text) - názov providera ("OpenAi", "Perplexity", "OpenRouter")

API_Key (Text) - API kľúč

Názov (Text) - popis kľúča

3.2 Test API kľúčov
javascript
// Test všetkých dostupných kľúčov
var results = utils.testApiKeys(["OpenAi", "Perplexity"], entry());
message("Test dokončený: " + results.success.length + "/" + results.total + " kľúčov OK");

// Test konkrétneho kľúča
var apiKey = utils.getCachedApiKey("OpenAi", entry());
if (apiKey) {
    utils.addDebug(entry(), "✅ OpenAI kľúč dostupný");
} else {
    utils.addError(entry(), "❌ OpenAI kľúč chýba");
}
3.3 Základné AI volania
javascript
// Jednoduché AI volanie
var result = utils.callAI("OpenAi", "Zhrň tento text: " + entry().field("Popis"), {
    model: "gpt-4o-mini",
    maxTokens: 500,
    temperature: 0.7,
    debugEntry: entry()
});

if (result.success) {
    entry().set("AI_Zhrnutie", result.response);
} else {
    utils.addError(entry(), "AI volanie zlyhalo: " + result.error);
}
3.4 AI analýza záznamov
javascript
// Analýza konkrétnych polí
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
3.5 Natural Language to SQL
javascript
// Generovanie SQL z prirodzeného jazyka
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
        utils.addError(entry(), "SQL vykonanie zlyhalo: " + e);
    }
}
4. SQL operácie
4.1 Smart SQL (automatická detekcia)
javascript
// Rozpozná či je to SQL alebo prirodzený jazyk
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
4.2 SQL s AI interpretáciou
javascript
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
}
5. Práca s poliami
5.1 Bezpečný prístup k poliam
javascript
// Bezpečné čítanie s default hodnotou
var customerName = utils.safeGet(entry(), "Názov zákazníka", "Neznámy");
var price = utils.safeGet(entry(), "Cena", 0);
var isActive = utils.safeGet(entry(), "Aktívny", false);

// Bezpečný zápis
if (utils.safeSet(entry(), "Status", "Spracované")) {
    utils.addDebug(entry(), "✅ Status úspešne nastavený");
} else {
    utils.addError(entry(), "❌ Chyba pri nastavovaní statusu");
}

// Alias funkcie
var description = utils.safeFieldAccess(entry(), "Popis", "Bez popisu");
5.2 Validácie polí
javascript
// Validácia povinných polí
var validation = utils.validateRequiredFields(entry(), [
    "Názov", "Email", "Telefón", "Zákazník"
]);

if (!validation.isValid) {
    var errorMsg = "Chýbajú povinné polia: " + validation.missingFields.join(", ");
    utils.addError(entry(), errorMsg);
    message(errorMsg);
    cancel(); // Zruší uloženie v trigger scripte
}

// Validácia stavu záznamu
var state = utils.validateEntryState(entry());
if (!state.isValid) {
    utils.addError(entry(), "Neplatný stav záznamu: " + state.errors.join(", "));
}
6. Link to Entry operácie
6.1 Bezpečný prístup k linkom
javascript
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
6.2 LinksFrom operácie
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
6.3 Atribúty v Link to Entry
javascript
// Nastavenie atribútu (SPRÁVNA SYNTAX!)
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
7. Časové funkcie
7.1 Formátovanie času
javascript
// Formátovanie času do HH:mm
var startTime = utils.formatTime(entry().field("Od")); // "09:30"
var endTime = utils.formatTime(entry().field("Do"));   // "17:45"

utils.addDebug(entry(), "Pracovný čas: " + startTime + " - " + endTime);

// Zaokrúhlenie na 15 minút
var rounded = utils.roundToQuarter(moment("09:23", "HH:mm"));
utils.addDebug(entry(), "Zaokrúhlený čas: " + utils.formatTime(rounded)); // "09:15"
7.2 Výpočty času
javascript
// Výpočet pracovného času
var startTime = entry().field("Od");
var endTime = entry().field("Do");

var workHours = utils.calculateHours(startTime, endTime);
entry().set("Odpracované hodiny", workHours);

utils.addDebug(entry(), "Odpracovaných hodín: " + workHours);

// Alias pre calculateHours
var timeDiff = utils.calculateTimeDifference(startTime, endTime);
7.3 Dátumové utility
javascript
// Kontrola víkendu
var workDate = entry().field("Dátum");
if (utils.isWeekend(workDate)) {
    entry().set("Víkendová práca", true);
    utils.addInfo(entry(), "Označené ako víkendová práca");
}

// Formátovanie dátumu (cez moment.js)
var formattedDate = moment(workDate).format("DD.MM.YYYY");
entry().set("Formátovaný dátum", formattedDate);
8. Validácie a formátovanie
8.1 Formátovanie peňazí
javascript
// Formátovanie peňažných súm
var amount = 1234.56;
var formatted = utils.formatMoney(amount, "€", 2); // "1234.56 €"
entry().set("Formátovaná cena", formatted);

// Parsing peňazí zo stringu
var priceString = "1,234.56 €";
var parsedAmount = utils.parseMoney(priceString); // 1234.56
utils.addDebug(entry(), "Parsovaná suma: " + parsedAmount);
8.2 Formátovanie mien
javascript
// Formátovanie mena zamestnanca
var employee = utils.safeGetFirstLink(entry(), "Zamestnanec");
var formattedName = utils.formatEmployeeName(employee);
// Výsledok: "jnovak (Ján Novák)" alebo "jnovak" alebo "Zamestnanec ID:123"

entry().set("Zamestnanec meno", formattedName);
8.3 Vyhľadávanie
javascript
// Vyhľadanie podľa unique poľa s variáciami
var employee = utils.findByUniqueField(
    "Zamestnanci",
    ["Nick", "nick", "Login"], // skúša rôzne názvy polí
    "jnovak"
);

if (employee) {
    utils.addDebug(entry(), "Zamestnanec nájdený: " + employee.field("Meno"));
} else {
    utils.addError(entry(), "Zamestnanec s nick 'jnovak' nebol nájdený");
}

// Špecializované hľadanie zamestnanca
var emp = utils.findEmployeeByNick("jnovak", "Zamestnanci");
9. Batch processing
9.1 Hromadné spracovanie
javascript
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

// Výsledky
var successCount = results.success.length;
var failedCount = results.failed.length;
var totalCount = results.total;

message("Batch spracovanie dokončené:\n" +
        "✅ Úspešné: " + successCount + "\n" +
        "❌ Neúspešné: " + failedCount + "\n" +
        "📊 Celkovo: " + totalCount);

// Detail chýb
for (var i = 0; i < results.failed.length; i++) {
    var failed = results.failed[i];
    utils.addError(entry(), "Batch failed at index " + failed.index + ": " + failed.error);
}
10. Praktické príklady
10.1 Kompletný trigger script s AI analýzou
javascript
// Trigger: After Save
var utils = MementoUtils;

try {
    utils.clearLogs(entry(), false); // Vyčisti debug logy
    utils.addDebug(entry(), "🚀 Spúšťam AI analýzu záznamu práce");
    
    // Validácia povinných polí
    var validation = utils.validateRequiredFields(entry(), ["Od", "Do", "Zamestnanci"]);
    if (!validation.isValid) {
        utils.addError(entry(), "Chýbajú povinné polia: " + validation.missingFields.join(", "));
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
                fieldsCount: analysisResult.fieldsAnalyzed.length
            });
            
            message("🤖 AI zhrnutie vytvorené!");
        } else {
            utils.addError(entry(), "AI analýza zlyhala: " + analysisResult.error);
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
    utils.addError(entry(), "Kritická chyba v scripte: " + e.toString());
    message("💥 Chyba: " + e.toString());
}
10.2 Action script s SQL generovaním
javascript
// Action: "📊 Generuj report"
var utils = MementoUtils;

try {
    utils.addDebug(entry(), "📊 Generujem AI SQL report");
    
    // Natural language dotaz
    var queryText = "Ukáž mi top 10 zamestnancov podľa odpracovaných hodín za posledný mesiac";
    
    var sqlResult = utils.aiGenerateSQL(queryText, [
        "Záznamy práce", "Zamestnanci", "Zákazky"
    ], {
        provider: "Perplexity",
        debugEntry: entry()
    });
    
    if (sqlResult.success) {
        utils.addDebug(entry(), "🔍 SQL: " + sqlResult.sqlQuery);
        
        // Vykonaj SQL s interpretáciou
        var interpretation = utils.sqlWithAIInterpretation(
            sqlResult.sqlQuery,
            "Analyzuj tieto výsledky a vytvor report s odporúčaniami:",
            {
                aiProvider: "OpenAi",
                maxTokens: 800,
                debugEntry: entry()
            }
        );
        
        if (interpretation.success) {
            entry().set("SQL_Dotaz", interpretation.sqlQuery);
            entry().set("SQL_Výsledky", JSON.stringify(interpretation.sqlData, null, 2));
            entry().set("AI_Report", interpretation.aiInterpretation);
            
            message("📊 Report vytvorený!\n\n" +
                   "📝 SQL: " + sqlResult.sqlQuery.substring(0, 50) + "...\n" +
                   "📊 Výsledkov: " + interpretation.sqlData.length);
        } else {
            utils.addError(entry(), "Interpretácia zlyhala: " + interpretation.error);
        }
    } else {
        utils.addError(entry(), "SQL generovanie zlyhalo: " + sqlResult.error);
        message("❌ SQL generovanie zlyhalo");
    }
    
} catch (e) {
    utils.addError(entry(), "Action script error: " + e.toString());
    message("💥 Chyba: " + e.toString());
}
10.3 Batch aktualizácia s AI
javascript
// Action: "🔄 Batch AI spracovanie"
var utils = MementoUtils;

var selectedEntries = lib().find("selected:true");
if (selectedEntries.length === 0) {
    message("❌ Označte záznamy na spracovanie");
    return;
}

utils.addDebug(entry(), "🔄 Spúšťam batch AI spracovanie na " + selectedEntries.length + " záznamoch");

var results = utils.processBatch(selectedEntries, function(item, index) {
    try {
        // AI analýza každého záznamu
        var analysisResult = utils.aiAnalyzeEntry(
            item,
            "categorize",
            ["Popis", "Poznámky"],
            {
                provider: "OpenAi",
                model: "gpt-4o-mini"
            }
        );
        
        if (analysisResult.success) {
            item.set("AI_Kategória", analysisResult.analysis);
            item.set("AI_Spracované", "Áno");
            return true;
        }
        return false;
        
    } catch (e) {
        return false;
    }
}, entry());

message("🔄 Batch spracovanie dokončené!\n\n" +
       "✅ Úspešné: " + results.success.length + "\n" +
       "❌ Zlyhané: " + results.failed.length + "\n" +
       "📊 Celkovo: " + results.total);

utils.addInfo(entry(), "Batch AI spracovanie dokončené", {
    total: results.total,
    success: results.success.length,
    failed: results.failed.length
});
11. Troubleshooting
11.1 Časté problémy
AI kľúče nefungujú
javascript
// Test API kľúčov
var testResults = utils.testApiKeys(["OpenAi"], entry());
if (testResults.failed.length > 0) {
    utils.addError(entry(), "Chýbajúce API kľúče: " + testResults.failed.join(", "));
}

// Vyčistenie cache
utils.clearApiKeyCache();
var freshKey = utils.getApiKey("OpenAi", entry());
Link to Entry atribúty nefungujú
javascript
// Skontroluj syntax - MUSÍ byť index ako číslo!
utils.safeSetAttribute(entry(), "Produkty", 0, "Množstvo", 5); // ✅ Správne
// NIE: utils.safeSetAttribute(entry(), "Produkty", "Množstvo", 5); // ❌ Zlé
SQL chyby
javascript
// Bezpečné SQL volanie
var result = utils.smartSQL("SELECT * FROM NeexistujúcaTabuľka", {
    debugEntry: entry()
});

if (!result.success) {
    utils.addError(entry(), "SQL zlyhalo: " + result.error);
}
11.2 Debug tipy
javascript
// Detailný debug konkrétnej funkcie
utils.addDebug(entry(), "=== DEBUG START ===");
utils.addDebug(entry(), "Entry ID: " + entry().field("ID"));
utils.addDebug(entry(), "Library: " + lib().name);

var customers = utils.safeGetLinks(entry(), "Zákazníci");
utils.addDebug(entry(), "Customers count: " + customers.length);

for (var i = 0; i < customers.length; i++) {
    utils.addDebug(entry(), "Customer " + i + ": " + utils.safeGet(customers[i], "Názov", "N/A"));
}
utils.addDebug(entry(), "=== DEBUG END ===");
11.3 Performance monitoring
javascript
// Meranie výkonu operácií
var startTime = Date.now();

var result = utils.aiAnalyzeEntry(entry(), "summarize", ["Popis"], {
    provider: "OpenAi",
    debugEntry: entry()
});

var duration = Date.now() - startTime;
utils.addDebug(entry(), "⏱️ AI analýza trvala: " + duration + "ms");

if (duration > 5000) {
    utils.addDebug(entry(), "⚠️ Pomalá AI operácia!");
}
🎯 Záver
MementoUtils v2.1 je výkonná knižnica ktorá rozširuje možnosti Memento Database o:

✅ AI integráciu s multi-provider podporou
✅ Inteligentné SQL operácie s natural language
✅ Robustné error handling a debugging
✅ Bezpečné API patterns pre všetky operácie
✅ Časové utility a formátovanie
✅ Batch processing s error tracking

Najdôležitejšie tipy:
Vždy používajte debug logging - utils.addDebug() vo všetkých scriptoch

Testujte API kľúče pred produkčným použitím

Používajte safe funkcie* namiesto priameho prístupu k poliam

Implementujte postupne - začnite jednoduchými funkciami

Monitorujte performance - AI volania môžu byť pomalé

S touto knižnicou môžete vytvárať inteligentné, robustné a automatizované workflows priamo v Memento Database! 🚀