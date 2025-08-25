// ==============================================
// MEMENTO DATABASE - [NÁZOV SCRIPTU]
// Verzia: 1.0 | Dátum: [DD.MM.YYYY] | Autor: [MENO]
// Knižnica: [NÁZOV KNIŽNICE] | Trigger: [Before Save / After Save / Action]
// ==============================================
// 📋 ÚČEL SCRIPTU:
//    - [Opíš hlavnú funkcionalitu]
//    - [Opíš vedľajšie funkcie]
//    - [Opíš výstupy/výsledky]
// ==============================================
// 🔧 ZÁVISLOSTI:
//    - MementoUtils 3.3+ (povinné)
//    - MementoCore 1.1+ (automaticky cez Utils)
//    - MementoBusiness 1.0+ (voliteľné, ak potrebné)
//    - [Ďalšie Helper scripty ak potrebné]
// ==============================================
// 📊 VSTUPNÉ DÁTA:
//    - [Pole 1]: [popis a požiadavky]
//    - [Pole 2]: [popis a požiadavky] 
//    - [Link polia]: [na ktoré knižnice a prečo]
// ==============================================
// 📤 VÝSTUPNÉ DÁTA:
//    - [Pole 1]: [čo sa nastaví/vypočíta]
//    - [Pole 2]: [čo sa nastaví/vypočíta]
//    - [Nové záznamy]: [v ktorých knižniciach]
// ==============================================

// ==============================================
// IMPORTS A LAZY LOADING
// ==============================================

var utils = null;
var business = null; // ak je potrebný business modul
var currentEntry = null;

/**
 * Lazy loading MementoUtils - ŠTANDARDNÝ PATTERN
 */
function getUtils() {
    if (!utils) {
        if (typeof MementoUtils !== 'undefined') {
            utils = MementoUtils;
        } else {
            throw new Error("MementoUtils knižnica nie je dostupná! Script vyžaduje MementoUtils 3.3+");
        }
    }
    return utils;
}

/**
 * Lazy loading Business modulu - VOLITEĽNÉ
 */
function getBusiness() {
    if (!business) {
        try {
            var u = getUtils();
            if (u && u.business) {
                business = u.business;
            } else if (typeof MementoBusiness !== 'undefined') {
                business = MementoBusiness;
            }
        } catch(e) {
            // Business modul je optional - script môže fungovať bez neho
            getUtils().addDebug(getCurrentEntry(), CONFIG, "ℹ️ Business modul nie je dostupný - používam základné funkcie");
        }
    }
    return business;
}

/**
 * Získa aktuálny entry - podporuje Before Save, After Save i Action mode
 */
function getCurrentEntry() {
    if (!currentEntry) {
        try {
            // Before Save / After Save mode
            currentEntry = entry();
        } catch(e) {
            // Action mode - získaj z vybraných záznamov
            try {
                var selected = lib().entries();
                if (selected && selected.length > 0) {
                    currentEntry = selected[0]; // Prvý vybraný záznam
                    getUtils().addDebug(currentEntry, CONFIG, "🔧 Action mode detected - using first selected entry");
                } else {
                    throw new Error("V Action mode nie sú vybrané žiadne záznamy!");
                }
            } catch(actionError) {
                throw new Error("Nedá sa získať aktuálny entry: " + actionError.toString());
            }
        }
    }
    return currentEntry;
}

// ==============================================
// KONFIGURÁCIA - UNIFIED PATTERN
// ==============================================

var CONFIG = (function() {
    // Pokús sa o centrálny config adapter
    if (typeof MementoConfigAdapter !== 'undefined') {
        try {
            var adapter = MementoConfigAdapter.getAdapter('[library_key]'); // napr. 'attendance', 'work_records'
            adapter.scriptName = "[NÁZOV SCRIPTU]";
            adapter.version = "1.0";
            return adapter;
        } catch (e) {
            // Fallback na lokálny config
        }
    }
    
    // Lokálna konfigurácia ako fallback
    return {
        debug: true,
        version: "1.0",
        scriptName: "[NÁZOV SCRIPTU]",
        
        // ==============================================
        // UNIFIED FIELD MAPPINGS - DOPLŇ PODĽA KNIŽNICE
        // ==============================================
        fields: {
            // Core business fields - PRISPÔSOB PODĽA KNIŽNICE
            datum: "Dátum",
            zamestnanci: "Zamestnanci",
            zakazka: "Zákazka",
            suma: "Suma",
            poznamka: "Poznámka",
            
            // System fields - ŠTANDARDNÉ PRE VŠETKY SCRIPTY  
            info: "info",
            debugLog: "Debug_Log",
            errorLog: "Error_Log",
            view: "view",
            id: "ID"
        },
        
        // ==============================================
        // ATTRIBUTE MAPPINGS - DOPLŇ PODĽA POTREBY
        // ==============================================
        attributes: {
            odpracovane: "odpracované",
            hodinovka: "hodinovka",
            priplatokHodinovka: "+príplatok (€/h)",
            premia: "+prémia (€)",
            pokuta: "-pokuta (€)",
            dennaMzda: "denná mzda",
            poznamka: "poznámka"
        },
        
        // ==============================================
        // LIBRARY NAMES - DOPLŇ PODĽA ZÁVISLOSTÍ
        // ==============================================
        libraries: {
            // Core libraries
            defaults: "ASISTANTO Defaults",
            api: "ASISTANTO API", 
            notifications: "Notifications",
            
            // Business libraries - PRISPÔSOB PODĽA POTREBY
            zamestnanci: "Zamestnanci",
            dochadzka: "Dochádzka",
            pracovneZaznamy: "Záznam prác",
            knihaJazd: "Kniha jázd",
            zavazky: "Záväzky",
            sadzby: "sadzby zamestnancov",
            
            // External libraries - DOPLŇ AK POTREBNÉ
            klienti: "Klienti",
            partneri: "Partneri",
            zakazky: "Zákazky"
        },
        
        // ==============================================
        // BUSINESS RULES - DOPLŇ PODĽA LOGIKY SCRIPTU
        // ==============================================
        businessRules: {
            minimalnyPocetZamestnancov: 1,
            maximalnaHodinovaSadzba: 100,
            povoleneStatusy: ["Aktívny", "Dočasne neaktívny"],
            povinneFields: ["datum"] // field keys z CONFIG.fields
        },
        
        // ==============================================
        // VALIDATION RULES - ŠTANDARDNÉ PATTERN
        // ==============================================
        validation: {
            required: [], // field keys ktoré sú povinné
            optional: [], // field keys ktoré sú voliteľné
            maxRetries: 3,
            timeoutMs: 30000
        }
    };
})();

// ==============================================
// HLAVNÁ FUNKCIA - ŠTANDARDNÝ PATTERN
// ==============================================

function main() {
    var utils = getUtils();
    var currentEntry = getCurrentEntry();
    var steps = {}; // Tracking úspešnosti krokov
    
    try {
        // === ŠTANDARDNÝ ZAČIATOK SCRIPTU ===
        utils.logScriptStart(currentEntry, CONFIG);
        
        // === KROK 1: VALIDÁCIA VSTUPNÝCH DÁT ===
        utils.addDebug(currentEntry, CONFIG, "📋 KROK 1: Validácia vstupných dát");
        steps.validation = validateInputData();
        if (!steps.validation.success) {
            utils.addError(currentEntry, CONFIG, "Validácia zlyhala: " + steps.validation.errors.join(", "), "main");
            return finishScript(false, steps, "Validation failed");
        }
        utils.addDebug(currentEntry, CONFIG, "✅ Validácia úspešná");
        
        // === KROK 2: NAČÍTANIE A SPRACOVANIE DÁT ===
        utils.addDebug(currentEntry, CONFIG, "📋 KROK 2: Načítavam a spracovávam dáta");
        steps.dataProcessing = processData();
        if (!steps.dataProcessing.success) {
            utils.addError(currentEntry, CONFIG, "Spracovanie dát zlyhalo", "main");
            return finishScript(false, steps, "Data processing failed");
        }
        utils.addDebug(currentEntry, CONFIG, "✅ Dáta úspešne spracované");
        
        // === KROK 3: BUSINESS LOGIKA ===
        utils.addDebug(currentEntry, CONFIG, "📋 KROK 3: Vykonávam business logiku");
        steps.businessLogic = executeBusinessLogic(steps.dataProcessing.data);
        if (!steps.businessLogic.success) {
            utils.addError(currentEntry, CONFIG, "Business logika zlyhala", "main");
            return finishScript(false, steps, "Business logic failed");
        }
        utils.addDebug(currentEntry, CONFIG, "✅ Business logika dokončená");
        
        // === KROK 4: ULOŽENIE VÝSLEDKOV ===
        utils.addDebug(currentEntry, CONFIG, "📋 KROK 4: Ukladám výsledky");
        steps.saveResults = saveResults(steps.businessLogic.results);
        if (!steps.saveResults.success) {
            utils.addError(currentEntry, CONFIG, "Ukladanie výsledkov zlyhalo", "main");
            return finishScript(false, steps, "Save results failed");
        }
        utils.addDebug(currentEntry, CONFIG, "✅ Výsledky úspešne uložené");
        
        // === KROK 5: POST-PROCESSING (VOLITEĽNÝ) ===
        utils.addDebug(currentEntry, CONFIG, "📋 KROK 5: Post-processing");
        steps.postProcessing = postProcessing(steps.saveResults.data);
        // Post-processing môže byť neúspešný bez prerušenia scriptu
        
        // === FINALIZÁCIA ===
        var overallSuccess = steps.validation.success && 
                           steps.dataProcessing.success && 
                           steps.businessLogic.success && 
                           steps.saveResults.success;
        
        var summary = createExecutionSummary(steps);
        return finishScript(overallSuccess, steps, summary);
        
    } catch (error) {
        utils.addError(currentEntry, CONFIG, error.toString(), "main", error);
        return finishScript(false, steps, "Critical error: " + error.toString());
    }
}

// ==============================================
// BUSINESS LOGIC FUNCTIONS
// ==============================================

/**
 * Validácia vstupných dát - ŠTANDARDNÝ PATTERN
 */
function validateInputData() {
    var utils = getUtils();
    var currentEntry = getCurrentEntry();
    
    try {
        // Validácia pomocí CONFIG
        var validation = utils.validateRequiredFields(currentEntry, CONFIG, CONFIG.businessRules.povinneFields);
        
        if (!validation.valid) {
            utils.addDebug(currentEntry, CONFIG, "❌ Povinné polia chýbajú: " + validation.missingFields.join(", "));
            return { success: false, errors: validation.errors };
        }
        
        // Custom business validácie
        var customValidation = performCustomValidation();
        if (!customValidation.success) {
            return customValidation;
        }
        
        utils.addDebug(currentEntry, CONFIG, "✅ Všetky validácie prešli úspešne");
        return { success: true, data: validation };
        
    } catch (error) {
        utils.addError(currentEntry, CONFIG, error.toString(), "validateInputData", error);
        return { success: false, errors: [error.toString()] };
    }
}

/**
 * Custom business validácie - PRISPÔSOB PODĽA POTREBY
 */
function performCustomValidation() {
    var utils = getUtils();
    var currentEntry = getCurrentEntry();
    
    try {
        // PRÍKLAD: Validácia dátumu
        var datum = utils.safeGetField(currentEntry, CONFIG, "datum");
        if (datum && moment(datum).isAfter(moment())) {
            return { success: false, errors: ["Dátum nemôže byť v budúcnosti"] };
        }
        
        // PRÍKLAD: Validácia linked entries
        var zamestnanci = utils.safeGetField(currentEntry, CONFIG, "zamestnanci", []);
        if (zamestnanci.length < CONFIG.businessRules.minimalnyPocetZamestnancov) {
            return { success: false, errors: ["Minimálny počet zamestnancov je " + CONFIG.businessRules.minimalnyPocetZamestnancov] };
        }
        
        // PRIDAJ ĎALŠIE CUSTOM VALIDÁCIE PODĽA POTREBY
        
        return { success: true };
        
    } catch (error) {
        utils.addError(currentEntry, CONFIG, error.toString(), "performCustomValidation", error);
        return { success: false, errors: [error.toString()] };
    }
}

/**
 * Spracovanie dát - PRISPÔSOB PODĽA KNIŽNICE
 */
function processData() {
    var utils = getUtils();
    var currentEntry = getCurrentEntry();
    
    try {
        // PRÍKLAD: Získanie a spracovanie linked entries
        var zamestnanci = utils.safeGetField(currentEntry, CONFIG, "zamestnanci", []);
        
        var processedData = {
            zamestnanci: [],
            statistics: {
                total: zamestnanci.length,
                processed: 0,
                errors: 0
            }
        };
        
        for (var i = 0; i < zamestnanci.length; i++) {
            var zamestnanec = zamestnanci[i];
            
            try {
                var processedEmployee = processSingleEmployee(zamestnanec, i);
                if (processedEmployee.success) {
                    processedData.zamestnanci.push(processedEmployee.data);
                    processedData.statistics.processed++;
                } else {
                    processedData.statistics.errors++;
                }
                
            } catch (empError) {
                utils.addError(currentEntry, CONFIG, 
                    "Chyba pri spracovaní zamestnanca " + (i+1) + ": " + empError.toString(), 
                    "processData", empError);
                processedData.statistics.errors++;
            }
        }
        
        utils.addDebug(currentEntry, CONFIG, 
            "📊 Spracovaných " + processedData.statistics.processed + "/" + processedData.statistics.total + " zamestnancov");
        
        return { success: processedData.statistics.processed > 0, data: processedData };
        
    } catch (error) {
        utils.addError(currentEntry, CONFIG, error.toString(), "processData", error);
        return { success: false, data: null };
    }
}

/**
 * Spracovanie jednotlivého zamestnanca - PRÍKLAD
 */
function processSingleEmployee(zamestnanec, index) {
    var utils = getUtils();
    
    try {
        // Získaj základné údaje
        var nick = utils.safeGet(zamestnanec, "Nick", "Zamestnanec " + (index + 1));
        utils.addDebug(getCurrentEntry(), CONFIG, "  👤 Spracovávam: " + nick);
        
        // PRÍKLAD: Získanie atribútov
        var hodinovka = utils.safeGetAttribute(zamestnanec, CONFIG.fields.zamestnanci, CONFIG.attributes.hodinovka, 0);
        var odpracovane = utils.safeGetAttribute(zamestnanec, CONFIG.fields.zamestnanci, CONFIG.attributes.odpracovane, 0);
        
        // Business validácie
        if (hodinovka > CONFIG.businessRules.maximalnaHodinovaSadzba) {
            utils.addDebug(getCurrentEntry(), CONFIG, "    ⚠️ " + nick + " má vysokú hodinovku: " + hodinovka + "€");
        }
        
        // Výpočty
        var dennaMzda = hodinovka * odpracovane;
        
        // PRIDAJ ĎALŠIE BUSINESS LOGIKU PODĽA POTREBY
        
        var result = {
            nick: nick,
            hodinovka: hodinovka,
            odpracovane: odpracovane,
            dennaMzda: dennaMzda,
            employee: zamestnanec
        };
        
        utils.addDebug(getCurrentEntry(), CONFIG, 
            "    💰 " + nick + ": " + odpracovane + "h × " + hodinovka + "€ = " + utils.formatMoney(dennaMzda));
        
        return { success: true, data: result };
        
    } catch (error) {
        utils.addError(getCurrentEntry(), CONFIG, error.toString(), "processSingleEmployee", error);
        return { success: false, data: null };
    }
}

/**
 * Hlavná business logika - PRISPÔSOB PODĽA ÚČELU SCRIPTU
 */
function executeBusinessLogic(processedData) {
    var utils = getUtils();
    var business = getBusiness();
    
    try {
        var results = {
            calculations: {},
            updates: [],
            newEntries: []
        };
        
        // PRÍKLAD: Agregované výpočty
        var totalAmount = 0;
        var totalHours = 0;
        
        for (var i = 0; i < processedData.zamestnanci.length; i++) {
            var emp = processedData.zamestnanci[i];
            totalAmount += emp.dennaMzda;
            totalHours += emp.odpracovane;
        }
        
        results.calculations = {
            totalAmount: totalAmount,
            totalHours: totalHours,
            averageHourlyRate: totalHours > 0 ? totalAmount / totalHours : 0,
            employeeCount: processedData.zamestnanci.length
        };
        
        // PRÍKLAD: Business rules aplikácia
        if (business) {
            // Použij business modul ak je dostupný
            var businessResult = business.performCalculations(processedData);
            if (businessResult) {
                results.calculations = Object.assign(results.calculations, businessResult);
            }
        }
        
        // PRIDAJ ĎALŠIU BUSINESS LOGIKU PODĽA POTREBY
        
        utils.addDebug(getCurrentEntry(), CONFIG, 
            "📊 Celkové výpočty: " + utils.formatMoney(totalAmount) + " za " + totalHours + " hodín");
        
        return { success: true, results: results };
        
    } catch (error) {
        utils.addError(getCurrentEntry(), CONFIG, error.toString(), "executeBusinessLogic", error);
        return { success: false, results: null };
    }
}

/**
 * Uloženie výsledkov - PRISPÔSOB PODĽA VÝSTUPOV
 */
function saveResults(results) {
    var utils = getUtils();
    var currentEntry = getCurrentEntry();
    
    try {
        // PRÍKLAD: Nastavenie vypočítaných polí
        utils.safeSetField(currentEntry, CONFIG, "suma", results.calculations.totalAmount);
        
        // PRÍKLAD: Nastavenie atribútov pre zamestnancov
        for (var i = 0; i < results.updates.length; i++) {
            var update = results.updates[i];
            utils.safeSetAttribute(update.employee, CONFIG.fields.zamestnanci, CONFIG.attributes.dennaMzda, update.dennaMzda);
        }
        
        // PRÍKLAD: Vytvorenie nových záznamov v iných knižniciach
        var createdEntries = createRelatedEntries(results);
        
        // PRIDAJ ĎALŠIE SAVE OPERÁCIE PODĽA POTREBY
        
        utils.addDebug(currentEntry, CONFIG, "💾 Všetky výsledky úspešne uložené");
        
        return { success: true, data: { updatedFields: true, createdEntries: createdEntries } };
        
    } catch (error) {
        utils.addError(currentEntry, CONFIG, error.toString(), "saveResults", error);
        return { success: false, data: null };
    }
}

/**
 * Vytvorenie súvisiacich záznamov - VOLITEĽNÉ
 */
function createRelatedEntries(results) {
    // PRÍKLAD: Vytvorenie záväzkov, notifikácií, atď.
    // IMPLEMENTUJ PODĽA POTREBY SCRIPTU
    return [];
}

/**
 * Post-processing - VOLITEĽNÉ
 */
function postProcessing(saveData) {
    var utils = getUtils();
    
    try {
        // PRÍKLAD: Notifikácie, API volania, cleanup, atď.
        
        utils.addDebug(getCurrentEntry(), CONFIG, "🔄 Post-processing dokončený");
        return { success: true };
        
    } catch (error) {
        utils.addError(getCurrentEntry(), CONFIG, error.toString(), "postProcessing", error);
        return { success: false };
    }
}

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Vytvorenie súhrnu vykonania scriptu
 */
function createExecutionSummary(steps) {
    var successful = 0;
    var total = 0;
    
    for (var step in steps) {
        total++;
        if (steps[step] && steps[step].success) {
            successful++;
        }
    }
    
    return "Dokončených " + successful + "/" + total + " krokov úspešne";
}

/**
 * Finalizácia scriptu - ŠTANDARDNÝ PATTERN
 */
function finishScript(success, steps, summary) {
    var utils = getUtils();
    var currentEntry = getCurrentEntry();
    
    try {
        // Vytvor info záznam s výsledkami
        if (success && steps.businessLogic && steps.businessLogic.results) {
            var summaryData = {
                vysledok: success ? "Úspešný" : "Neúspešný",
                // PRIDAJ KONKRÉTNE ŠTATISTIKY PODĽA SCRIPTU
                // napr: spracovanychZamestnancov: steps.dataProcessing.data.statistics.processed
            };
            
            utils.addInfo(currentEntry, CONFIG, "Vykonanie scriptu dokončené", summaryData);
        }
        
        // Štandardný koniec s lifecycle management
        utils.logScriptEnd(currentEntry, CONFIG, success, summary);
        
        // User message
        showUserMessage(success, steps, summary);
        
        return success;
        
    } catch (error) {
        utils.addError(currentEntry, CONFIG, error.toString(), "finishScript", error);
        return false;
    }
}

/**
 * Zobrazenie správy používateľovi
 */
function showUserMessage(success, steps, summary) {
    if (success) {
        message("✅ Script úspešne dokončený!\n\n" +
               "📊 " + summary + "\n\n" +
               "ℹ️ Detaily v poli 'info'\n" +
               "🔍 Debug informácie v 'Debug_Log'");
    } else {
        message("❌ Script zlyhal!\n\n" +
               "📊 " + summary + "\n\n" +
               "🔍 Skontroluj Error_Log pre detaily\n" +
               "📋 Over vstupné dáta a skús znovu");
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

// Spusti hlavnú funkciu
main();

// ==============================================
// TEMPLATE USAGE NOTES
// ==============================================

/*
NÁVOD NA POUŽITIE TOHTO TEMPLATE:

1. 📝 ZÁKLADNÉ NASTAVENIA:
   - Nahraď [NÁZOV SCRIPTU] skutočným názvom
   - Nastav správny trigger (Before Save/After Save/Action)
   - Aktualizuj závislosti a účel scriptu

2. 🏗️ KONFIGURÁCIA:
   - Aktualizuj CONFIG.fields podľa cieľovej knižnice
   - Nastav CONFIG.attributes ak pracuješ s linked entries
   - Definuj CONFIG.libraries pre všetky potrebné knižnice
   - Nastav CONFIG.businessRules podľa logiky scriptu

3. 🔧 BUSINESS LOGIKA:
   - Implementuj validateInputData() pre tvoje validácie
   - Aktualizuj processData() podľa tvojich dát
   - Napíš executeBusinessLogic() s tvojou logikou
   - Implementuj saveResults() pre tvoje výstupy

4. ✅ TESTOVANIE:
   - Otestuj na vzorových dátach
   - Skontroluj všetky logy (Debug_Log, Error_Log, info)
   - Over všetky field mappings
   - Testuj error scenarios

5. 📚 DOKUMENTÁCIA:
   - Aktualizuj header s kompletným popisom
   - Dokumentuj všetky vstupné a výstupné polia  
   - Opíš business rules a validácie
   - Pridaj usage examples ak je to zložité

TENTO TEMPLATE ZABEZPEČUJE:
✅ Konzistentné error handling
✅ Štandardizované logy  
✅ Unified field mappings
✅ Lifecycle management
✅ Backward compatibility
✅ Action mode support
✅ Business modul integráciu
✅ Structured execution flow
✅ Comprehensive validation
✅ User-friendly messages
*/