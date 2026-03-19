// ==============================================
// TEMPLATE SCRIPT - Vzorová štruktúra pre Memento scripty
// Verzia: 8.0 | Dátum: September 2025 | Autor: ASISTANTO
// Knižnica: [NÁZOV KNIŽNICE] | Trigger: Before Save
// ==============================================
// 📋 FUNKCIA:
//    - Vzorová štruktúra pre všetky Memento scripty
//    - Štandardizovaná organizácia kódu
//    - Komplexná práca s Memento Framework
//    - Best practices a error handling
// ==============================================
// ⚠️ KRITICKÉ: PRED ZAČIATKOM VÝVOJA SCRIPTU:
//    1. Over štruktúru knižnice cez API alebo MCP
//    2. Skontroluj presné názvy polí (case-sensitive, diakritika)
//    3. Over typy polí (Text, Číslo, Dátum, LinkToEntry, atď.)
//    4. Potvrď Library ID ak pristupuješ k iným knižniciam
//
//    Použiť: python memento_api_simple.py --library "Názov" --structure
//    Alebo: MCP nástroje pre API prístup
// ==============================================
// 💡 USER COMMUNICATION BEST PRACTICES:
//
// message() - PRE KRÁTKE SPRÁVY:
//    - Len 2 riadky textu
//    - Zmizne po ~2 sekundách
//    - Použitie: Rýchle notifikácie ("Uložené", "Hotovo")
//    - Príklad: message("✅ Záznam uložený");
//
// dialog() - PRE PODROBNÉ SPRÁVY:
//    - Ľubovoľné množstvo textu
//    - Zostáva až kým užívateľ nezatvorí
//    - Môže obsahovať tlačidlá (OK, Cancel, custom)
//    - Použitie: Výsledky výpočtov, detailné chyby, potvrdenia
//    - Príklad: dialog("Výsledok", "Suma: 120€\nDPH: 20€", "OK");
//
// PRAVIDLO: Ak správa má viac ako 2 riadky alebo potrebuje čas na prečítanie,
//           vždy používaj dialog() namiesto message()!
// ==============================================

// ==============================================
// INICIALIZÁCIA MODULOV A KONFIGURÁCIE
// ==============================================

// Import Memento Framework cez hlavný agregátor
var utils = MementoUtils;
var currentEntry = entry();

// Vytvorenie script-špecifickej konfigurácie
var CONFIG = utils.createScriptConfig("Template Script", "8.0");

// Rozšírenie CONFIG o script-špecifické nastavenia
CONFIG.settings = {
    // Pridaj vlastné nastavenia pre script
    enableDebugMode: true,
    maxRetries: 3,
    timeoutSeconds: 30
};

// ==============================================
// VALIDÁCIA ZÁVISLOSTÍ A INICIALIZÁCIA
// ==============================================

/**
 * Kontrola závislostí a inicializácia scriptu
 * @returns {Object} {success: boolean, message: string}
 */
function initializeScript() {
    try {
        // Kontrola požadovaných modulov
        var requiredModules = ['config', 'core', 'business'];
        var depCheck = utils.checkDependencies(requiredModules);
        
        if (!depCheck.success) {
            var errorMsg = "Chýbajú potrebné moduly: " + depCheck.missing.join(", ");
            utils.addError(currentEntry, errorMsg, "initializeScript");
            message("❌ " + errorMsg);
            return { success: false, message: errorMsg };
        }
        
        // Vyčisti logy zo starých spustení
        utils.clearLogs(currentEntry, true);
        
        // Hlavičkový log
        utils.addDebug(currentEntry, "=== " + CONFIG.scriptName + " v" + CONFIG.version + " ===", "start");
        utils.addDebug(currentEntry, "Knižnica: " + lib().title);
        utils.addDebug(currentEntry, "Čas spustenia: " + utils.formatDate(moment(), "DD.MM.YYYY HH:mm:ss"));
        
        // Debug info o načítaných moduloch
        if (CONFIG.settings.enableDebugMode) {
            utils.debugModules(currentEntry);
        }
        
        return { success: true, message: "Inicializácia úspešná" };
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri inicializácii: " + error.toString(), "initializeScript", error);
        return { success: false, message: error.toString() };
    }
}

// ==============================================
// VALIDÁCIA VSTUPNÝCH DÁT
// ==============================================
// 📋 PRED ZAČIATKOM VÝVOJA:
//    VŽDY si over štruktúru knižnice cez API alebo MCP!
//
//    Prečo?
//    - Názvy polí musia byť PRESNÉ (case-sensitive, slovenské znaky)
//    - Typ poľa ovplyvňuje ako s ním pracuješ (text/number/date/linkToEntry)
//    - Štruktúra knižnice sa mohla zmeniť od poslednej aktualizácie
//
//    Ako overiť:
//    1. Python API: python memento_api_simple.py --library "Názov" --structure
//    2. MCP nástroje: Použiť Google Calendar/Gmail MCP pre API prístup
//    3. Memento UI: Nastavenia knižnice → Polia
//
//    Čo overiť:
//    ✓ Presné názvy všetkých polí (vrátane diakritiky)
//    ✓ Typy polí (Text, Číslo, Dátum, Čas, LinkToEntry, atď.)
//    ✓ Library ID (ak potrebuješ pristupovať k iným knižniciam)
// ==============================================

/**
 * Validácia povinných polí a vstupných dát
 * @returns {Object} {success: boolean, data: Object, error: string}
 */
function validateInputData() {
    try {
        utils.addDebug(currentEntry, "🔍 Validácia vstupných dát", "validation");
        
        // Definuj povinné polia na základe knižnice
        var requiredFields = [
            CONFIG.fields.common.id,
            // Pridaj ďalšie povinné polia podľa potreby
        ];
        
        // Validuj povinné polia
        if (!utils.validateRequiredFields(currentEntry, requiredFields)) {
            return { 
                success: false, 
                error: "Chýbajú povinné polia",
                data: null 
            };
        }
        
        // Získaj a validuj konkrétne hodnoty
        var data = {
            id: utils.safeGet(currentEntry, CONFIG.fields.common.id),
            // Pridaj ďalšie polia ktoré potrebuješ
        };
        
        // Vlastné validačné pravidlá
        if (!data.id) {
            return { 
                success: false, 
                error: "ID záznamu nie je dostupné",
                data: null 
            };
        }
        
        utils.addDebug(currentEntry, "✅ Validácia úspešná", "success");
        utils.addDebug(currentEntry, "  • ID záznamu: " + data.id);
        
        return {
            success: true,
            data: data,
            error: null
        };
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri validácii: " + error.toString(), "validateInputData", error);
        return { 
            success: false, 
            error: error.toString(),
            data: null 
        };
    }
}

// ==============================================
// HLAVNÉ BUSINESS FUNKCIE
// ==============================================

/**
 * Hlavná business logika scriptu
 * @param {Object} validatedData - Validované vstupné dáta
 * @returns {Object} {success: boolean, result: Object, error: string}
 */
function processBusinessLogic(validatedData) {
    try {
        utils.addDebug(currentEntry, "⚙️ Spracovanie business logiky", "calculation");
        
        var result = {
            processed: 0,
            created: 0,
            updated: 0,
            errors: 0,
            details: []
        };
        
        // Príklad: Spracovanie zamestnancov
        var employees = utils.safeGetLinks(currentEntry, CONFIG.fields.attendance?.employees || "Zamestnanci");
        
        if (employees && employees.length > 0) {
            utils.addDebug(currentEntry, "👥 Spracovávam " + employees.length + " zamestnancov");
            
            for (var i = 0; i < employees.length; i++) {
                var employee = employees[i];
                var empResult = processEmployee(employee, i, validatedData);
                
                if (empResult.success) {
                    result.processed++;
                    result.details.push(empResult.data);
                } else {
                    result.errors++;
                    utils.addError(currentEntry, 
                        "Chyba pri spracovaní zamestnanca #" + (i + 1) + ": " + empResult.error, 
                        "processBusinessLogic");
                }
            }
        }
        
        // Ulož výsledky do poľa
        var summary = "Spracované: " + result.processed + ", Chyby: " + result.errors;
        utils.safeSet(currentEntry, CONFIG.fields.common.info, summary);
        
        utils.addDebug(currentEntry, "✅ Business logika dokončená", "success");
        utils.addDebug(currentEntry, "  • " + summary);
        
        return {
            success: result.errors === 0,
            result: result,
            error: result.errors > 0 ? "Niektoré operácie zlyhali" : null
        };
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba v business logike: " + error.toString(), "processBusinessLogic", error);
        return {
            success: false,
            result: null,
            error: error.toString()
        };
    }
}

/**
 * Spracovanie jednotlivého zamestnanca
 * @param {Object} employee - Entry objekt zamestnanca
 * @param {number} index - Index v poli
 * @param {Object} context - Kontextové dáta
 * @returns {Object} {success: boolean, data: Object, error: string}
 */
function processEmployee(employee, index, context) {
    try {
        var empName = utils.formatEmployeeName(employee);
        utils.addDebug(currentEntry, "  [" + (index + 1) + "] Spracovávam: " + empName, "person");
        
        // Konkrétna logika pre zamestnanca
        var empData = {
            name: empName,
            id: employee.field("ID"),
            // Pridaj ďalšie dáta podľa potreby
        };
        
        // Príklad: Výpočet hodinovej sadzby
        var hourlyRate = utils.findValidHourlyRate(employee, new Date());
        if (hourlyRate) {
            empData.hourlyRate = hourlyRate;
            utils.addDebug(currentEntry, "    • Hodinovka: " + hourlyRate + " €/h");
        }
        
        return {
            success: true,
            data: empData,
            error: null
        };
        
    } catch (error) {
        return {
            success: false,
            data: null,
            error: error.toString()
        };
    }
}

// ==============================================
// TELEGRAM NOTIFIKÁCIE
// ==============================================
// ⚠️ DÔLEŽITÉ: MementoTelegram NIE JE v MementoUtils (circular dependency)
// Musí byť importovaný priamo!

/**
 * Vytvorenie a odoslanie Telegram notifikácie
 * @param {Object} processResult - Výsledky spracovania
 * @returns {Object} {success: boolean, message: string}
 */
function createTelegramNotification(processResult) {
    try {
        // KROK 1: Import MementoTelegram priamo (NIE cez utils!)
        var telegram = typeof MementoTelegram !== 'undefined' ? MementoTelegram : null;

        if (!telegram) {
            utils.addDebug(currentEntry, "⚠️ MementoTelegram nie je dostupný", "warning");
            return { success: false, message: "Telegram modul nie je načítaný" };
        }

        utils.addDebug(currentEntry, "📱 Vytváram Telegram notifikáciu", "telegram");

        // Kontrola povolení pre notifikácie
        var libraryName = lib().title;
        var libraryConfig = CONFIG.libraryMapping?.[libraryName];
        
        if (!libraryConfig) {
            utils.addDebug(currentEntry, "ℹ️ Knižnica nie je nakonfigurovaná pre notifikácie");
            return { success: true, message: "Notifikácie nie sú nakonfigurované" };
        }
        
        if (!utils.checkPermissions(libraryConfig.permissionField)) {
            utils.addDebug(currentEntry, "ℹ️ Notifikácie sú vypnuté");
            return { success: true, message: "Notifikácie sú vypnuté" };
        }
        
        // KROK 2: Vytvorenie Telegram správy
        var telegramMessage = createTelegramMessage(processResult);

        // Uloženie do info_telegram poľa
        utils.safeSet(currentEntry, CONFIG.fields.common.infoTelegram, telegramMessage);

        // KROK 3: Vytvorenie notifikácie (použiť telegram, NIE utils!)
        var notificationResult = telegram.createTelegramMessage(currentEntry);

        if (notificationResult.success) {
            utils.addDebug(currentEntry, "✅ Notifikácia vytvorená", "success");

            // KROK 4: Vytvorenie inline keyboard (použiť telegram, NIE utils!)
            var keyboard = telegram.createInlineKeyboard([
                { text: "✅ OK", callback_data: "ok_" + currentEntry.field("ID") },
                { text: "❓ Info", callback_data: "info_" + currentEntry.field("ID") }
            ], 2);

            // KROK 5: Odoslanie na Telegram (použiť telegram, NIE utils!)
            var sendResult = telegram.sendNotificationEntry(notificationResult.notification, keyboard);

            if (sendResult.success) {
                utils.addDebug(currentEntry, "✅ Notifikácia odoslaná na Telegram", "success");
                return { success: true, message: "Notifikácia úspešne odoslaná" };
            } else {
                utils.addError(currentEntry, "Nepodarilo sa odoslať notifikáciu", "createTelegramNotification");
                return { success: false, message: "Odoslanie notifikácie zlyhalo" };
            }
        } else {
            utils.addError(currentEntry, "Nepodarilo sa vytvoriť notifikáciu", "createTelegramNotification");
            return { success: false, message: "Vytvorenie notifikácie zlyhalo" };
        }
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri Telegram notifikácii: " + error.toString(), "createTelegramNotification", error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Vytvorenie textu Telegram správy
 * @param {Object} data - Dáta pre správu
 * @returns {string} Formátovaná Telegram správa
 */
function createTelegramMessage(data) {
    var message = "📋 **" + CONFIG.scriptName.toUpperCase() + "**\n\n";
    
    // Základné informácie
    message += "📅 Dátum: " + utils.formatDate(new Date(), "DD.MM.YYYY") + "\n";
    message += "🕐 Čas: " + utils.formatTime(new Date()) + "\n\n";
    
    // Výsledky spracovania
    if (data && data.result) {
        message += "📊 **VÝSLEDKY:**\n";
        message += "• Spracované: " + data.result.processed + "\n";
        message += "• Chyby: " + data.result.errors + "\n\n";
    }
    
    // Detaily
    if (data && data.result && data.result.details && data.result.details.length > 0) {
        message += "👥 **DETAILY:**\n";
        for (var i = 0; i < Math.min(3, data.result.details.length); i++) {
            var detail = data.result.details[i];
            message += "• " + detail.name;
            if (detail.hourlyRate) {
                message += " (" + detail.hourlyRate + " €/h)";
            }
            message += "\n";
        }
        
        if (data.result.details.length > 3) {
            message += "• ... a " + (data.result.details.length - 3) + " ďalších\n";
        }
        message += "\n";
    }
    
    // Technické info
    message += "🔧 Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
    message += "📝 Záznam #" + currentEntry.field("ID");
    
    return message;
}

// ==============================================
// FINALIZÁCIA A CLEANUP
// ==============================================

/**
 * Finalizácia spracovania a cleanup
 * @param {Array} stepResults - Výsledky všetkých krokov
 * @returns {Object} {success: boolean, summary: string}
 */
function finalizeProcessing(stepResults) {
    try {
        utils.addDebug(currentEntry, "🔚 Finalizácia spracovania", "checkmark");
        
        // Analýza výsledkov
        var totalSteps = stepResults.length;
        var successfulSteps = 0;
        var failedSteps = [];
        
        for (var i = 0; i < stepResults.length; i++) {
            var step = stepResults[i];
            if (step.success) {
                successfulSteps++;
            } else {
                failedSteps.push(step.name || "Krok " + (i + 1));
            }
        }
        
        // Vytvorenie súhrnu
        var summary = "Úspešných krokov: " + successfulSteps + "/" + totalSteps;
        if (failedSteps.length > 0) {
            summary += "\nZlyhané kroky: " + failedSteps.join(", ");
        }
        
        // Nastavenie farby záznamu
        var allSuccess = failedSteps.length === 0;
        if (allSuccess) {
            utils.setColorByCondition(currentEntry, "success");
            utils.addDebug(currentEntry, "🎉 Všetky kroky úspešné!", "success");
        } else {
            utils.setColorByCondition(currentEntry, "warning");
            utils.addDebug(currentEntry, "⚠️ Niektoré kroky zlyhali", "warning");
        }
        
        // Uloženie súhrnu
        var infoContent = utils.safeGet(currentEntry, CONFIG.fields.common.info, "");
        var finalInfo = infoContent + "\n\n📊 FINÁLNY SÚHRN:\n" + summary;
        finalInfo += "\n⏰ Dokončené: " + utils.formatDate(moment(), "DD.MM.YYYY HH:mm:ss");
        
        utils.safeSet(currentEntry, CONFIG.fields.common.info, finalInfo);
        
        // Log finálneho súhrnu
        utils.addDebug(currentEntry, "\n📊 === FINÁLNY SÚHRN ===");
        
        for (var j = 0; j < stepResults.length; j++) {
            var stepResult = stepResults[j];
            var status = stepResult.success ? "✅" : "❌";
            var stepName = stepResult.name || "Krok " + (j + 1);
            utils.addDebug(currentEntry, status + " " + stepName);
        }
        
        utils.addDebug(currentEntry, "\n⏱️ Čas ukončenia: " + moment().format("HH:mm:ss"));
        utils.addDebug(currentEntry, "📋 === KONIEC " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        
        return {
            success: allSuccess,
            summary: summary
        };
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri finalizácii: " + error.toString(), "finalizeProcessing", error);
        return {
            success: false,
            summary: "Chyba pri finalizácii: " + error.toString()
        };
    }
}

/**
 * Zobrazenie súhrnu používateľovi
 * @param {Object} finalResult - Finálne výsledky
 */
function showUserSummary(finalResult) {
    try {
        var summaryData = {
            success: finalResult.success,
            date: new Date(),
            errors: finalResult.success ? [] : ["Niektoré kroky zlyhali"]
        };
        
        // Používaj utils.showProcessingSummary ak je dostupná
        if (typeof utils.showProcessingSummary === 'function') {
            utils.showProcessingSummary(currentEntry, summaryData, CONFIG);
        } else {
            // Fallback na jednoduchú správu
            var msg = finalResult.success ? 
                "✅ Script úspešne dokončený" : 
                "⚠️ Script dokončený s chybami";
            message(msg + "\n\n" + finalResult.summary);
        }
        
    } catch (error) {
        message("Script dokončený, ale chyba pri zobrazení súhrnu.");
    }
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

/**
 * Hlavná funkcia scriptu - orchestrácia všetkých krokov
 * @returns {boolean} True ak úspešné, false ak treba zrušiť uloženie
 */
function main() {
    try {
        // Zoznam všetkých krokov pre tracking
        var stepResults = [];
        
        // KROK 1: Inicializácia
        var initResult = initializeScript();
        stepResults.push({ 
            name: "Inicializácia", 
            success: initResult.success, 
            data: initResult 
        });
        
        if (!initResult.success) {
            return false;
        }
        
        // KROK 2: Validácia vstupných dát
        var validationResult = validateInputData();
        stepResults.push({ 
            name: "Validácia dát", 
            success: validationResult.success, 
            data: validationResult 
        });
        
        if (!validationResult.success) {
            utils.addError(currentEntry, "Validácia zlyhala: " + validationResult.error, "main");
            message("❌ " + validationResult.error);
            return false;
        }
        
        // KROK 3: Hlavná business logika
        var businessResult = processBusinessLogic(validationResult.data);
        stepResults.push({ 
            name: "Business logika", 
            success: businessResult.success, 
            data: businessResult 
        });
        
        // KROK 4: Telegram notifikácie
        var telegramResult = createTelegramNotification(businessResult);
        stepResults.push({ 
            name: "Telegram notifikácie", 
            success: telegramResult.success, 
            data: telegramResult 
        });
        
        // KROK 5: Finalizácia
        var finalResult = finalizeProcessing(stepResults);
        
        // Zobrazenie súhrnu používateľovi
        showUserSummary(finalResult);
        
        return finalResult.success;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii: " + error.toString(), "main", error);
        
        // Nastavenie chybovej farby
        utils.setColorByCondition(currentEntry, "error");
        
        message("❌ Kritická chyba!\n\n" + error.toString() + 
                (error.lineNumber ? "\nRiadok: " + error.lineNumber : ""));
        
        return false;
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

// Kontrola či už nie je spustený
if (typeof window === 'undefined' || !window.scriptRunning) {
    if (typeof window !== 'undefined') {
        window.scriptRunning = true;
    }
    
    try {
        // Spustenie hlavnej funkcie
        var result = main();
        
        // Ak hlavná funkcia zlyhala, zruš uloženie
        if (!result) {
            utils.addError(currentEntry, "Script zlyhal - zrušené uloženie", "main");
            cancel();
        }
        
    } finally {
        // Cleanup
        if (typeof window !== 'undefined') {
            window.scriptRunning = false;
        }
    }
} else {
    utils.addDebug(currentEntry, "Script už beží - preskakujem spustenie");
}

// ==============================================
// DOKUMENTÁCIA A POZNÁMKY
// ==============================================

/*
POUŽITIE TOHTO TEMPLATE:

1. PREMENUJ SÚBOR:
   Template-Script.js → YourScript.js

2. UPRAVTE HLAVIČKU:
   - Zmeň názov scriptu
   - Aktualizuj verziu
   - Nastav správnu knižnicu a trigger
   - Opíš funkčnosť

3. KONFIGURÁCIA:
   - Upravte CONFIG.scriptName a CONFIG.version
   - Pridajte script-špecifické nastavenia do CONFIG.settings
   - Upravte requiredModules v initializeScript()

4. VALIDÁCIA:
   - Definujte povinné polia v validateInputData()
   - Pridajte vlastné validačné pravidlá
   - Upravte štruktúru validatedData

5. BUSINESS LOGIKA:
   - Implementujte vlastnú logiku v processBusinessLogic()
   - Upravte processEmployee() podľa potrieb
   - Pridajte ďalšie pomocné funkcie

6. TELEGRAM:
   - Upravte createTelegramMessage() pre vlastný formát
   - Zmeňte inline keyboard tlačidlá
   - Nastavte správne callback_data

7. TESTOVANIE:
   - Otestujte všetky scenáre
   - Skontrolujte error handling
   - Overte Telegram notifikácie

TIPY:
- Používajte utils.addDebug() pre logovanie
- Vždy wrapujte do try-catch blokov
- Validujte všetky vstupy
- Používajte utils.safeGet/safeSet pre bezpečný prístup
- Testujte na rôznych typoch dát

PRE VIAC INFORMÁCIÍ:
Pozri Memento-Framework-Manual.md v repozitári
*/