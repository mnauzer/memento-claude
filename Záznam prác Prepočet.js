// ==============================================
// MEMENTO DATABASE - ZÁZNAM PRÁC PREPOČET
// Verzia: 8.0 | Dátum: 31.08.2025 | Autor: ASISTANTO
// Knižnica: Záznam práce | Trigger: Before Save
// ==============================================
// ✅ REFAKTOROVANÉ v8.0.1:
//    - Plná integrácia s MementoUtils v7.0+
//    - Využitie centrálneho MementoConfig
//    - Odstránené všetky duplikácie
//    - Zachovaná kompletná funkcionalita
//    - Čistý modulárny kód
// ==============================================
// 🔧 VYŽADUJE:
//    - MementoUtils v7.0+
//    - MementoConfig v7.0+
//    - MementoCore v7.0+
//    - MementoBusiness v7.0+
// ==============================================

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var centralConfig = utils.config;
var currentEntry = entry();

var CONFIG = {
    scriptName: "Záznam prác Prepočet",
    version: "8.0",
    
    // Referencie na centrálny config
    fields: centralConfig.fields.workRecord,
    attributes: centralConfig.attributes,
    libraries: centralConfig.libraries.business,
    commonFields: centralConfig.fields.common,
    employeeFields: centralConfig.fields.employee,
    icons: centralConfig.icons,
    
    // Lokálne nastavenia
    settings: {
        roundToQuarterHour: true,
        defaultCurrency: "€"
    },
    
    // Názvy polí vo výkaze prác (nie sú v central config)
    vykazFields: {
        datum: "Dátum",
        identifikator: "Identifikátor",
        popis: "Popis",
        typVykazu: "Typ výkazu",
        cenyPocitat: "Ceny počítať",
        cenovaPonuka: "Cenová ponuka",
        vydane: "Vydané",
        zakazka: "Zákazka",
        praceHZS: "Práce HZS",
        info: "info"
    }
};


// ==============================================
// VALIDÁCIA
// ==============================================

/**
 * Validuje povinné vstupné polia
 */
function validateInputs() {
    utils.addDebug(currentEntry, CONFIG.icons.step + " KROK 1: Validácia vstupných dát");
    
    var requiredFields = [
         CONFIG.fields.date,
        CONFIG.fields.startTime, 
        CONFIG.fields.endTime
    ];
    
    // Použitie MementoUtils validácie
    var validation = utils.validateRequiredFields(currentEntry, requiredFields);
    if (!validation.valid) {
        return {
            success: false,
            message: "Chýbajúce povinné polia: " + validation.missing.join(", ")
        };
    }
    
    var customer = utils.safeGetLinks(currentEntry, CONFIG.fields.customer);
    var date = utils.safeGet(currentEntry, CONFIG.fields.date);
    
    utils.addDebug(currentEntry, "  ✅ Validácia úspešná");
    
    return {
        success: true,
        hasCustomer: customer && customer.length > 0,
        customer: customer,
        date: date
    };
}

// ==============================================
// VÝPOČTY
// ==============================================

/**
 * Vypočíta pracovnú dobu
 */
function calculateWorkTime() {
    utils.addDebug(currentEntry, CONFIG.icons.step + " KROK 2: Výpočet pracovnej doby");
    
    var startTime = utils.safeGet(currentEntry, CONFIG.fields.startTime);
    var endTime = utils.safeGet(currentEntry, CONFIG.fields.endTime);
    
    if (!startTime || !endTime) {
        utils.addError(currentEntry, "Chýba čas Od alebo Do", "calculateWorkTime");
        return { success: false };
    }
    
    // Použitie MementoBusiness funkcie pre výpočet hodín
    var hours = utils.calculateWorkHours(startTime, endTime);
    
    // Zaokrúhlenie na štvrťhodiny ak je potrebné
    if (CONFIG.settings.roundToQuarterHour) {
        var minutes = hours * 60;
        var roundedMinutes = Math.round(minutes / 15) * 15;
        hours = roundedMinutes / 60;
        utils.addDebug(currentEntry, "  ⏰ Zaokrúhlené na štvrťhodiny");
    }
    
    // Ulož vypočítané hodnoty
    utils.safeSet(currentEntry, CONFIG.fields.workTime, hours);
    utils.safeSet(currentEntry, CONFIG.fields.workedHours, hours);
    
    utils.addDebug(currentEntry, "  " + CONFIG.icons.time + " Pracovná doba: " + hours + " hodín");
    
    return {
        success: true,
        hours: hours,
        startTime: startTime,
        endTime: endTime
    };
}

// ==============================================
// SPRACOVANIE ZAMESTNANCOV
// ==============================================

/**
 * Spracuje zamestnancov a vypočíta mzdové náklady
 */
function processEmployees(workedHours) {
    utils.addDebug(currentEntry, CONFIG.icons.step + " KROK 3: Spracovanie zamestnancov");
    
    var employees = utils.safeGetLinks(currentEntry, CONFIG.fields.employees);
    
    if (!employees || employees.length === 0) {
        utils.addDebug(currentEntry, "  " + CONFIG.icons.info + " Žiadni zamestnanci");
        utils.safeSet(currentEntry, CONFIG.fields.employeeCount, 0);
        utils.safeSet(currentEntry, CONFIG.fields.wageCosts, 0);
        return { 
            count: 0, 
            totalCosts: 0 
        };
    }
    
    var totalCosts = 0;
    var date = utils.safeGet(currentEntry, CONFIG.fields.date);
    
    // Spracuj každého zamestnanca
    for (var i = 0; i < employees.length; i++) {
        var employee = employees[i];
        var empName = getEmployeeName(employee);
        
        try {
            // Získaj detaily cez MementoBusiness
            var empDetails = utils.getEmployeeDetails(employee, date);
            
            if (!empDetails || !empDetails.hourlyRate) {
                utils.addDebug(currentEntry, "  " + CONFIG.icons.warning + 
                             " Chýba hodinová sadzba pre: " + empName);
                continue;
            }
            
            // Nastav atribúty na Link to Entry poli
            var empArray = currentEntry.field(CONFIG.fields.employees);
            
            // Odpracované hodiny
            empArray[i].setAttr(CONFIG.attributes.workRecordEmployees.workedHours, workedHours);
            
            // Hodinová sadzba
            empArray[i].setAttr(CONFIG.attributes.workRecordEmployees.hourlyRate, empDetails.hourlyRate);
            
            // Mzdové náklady
            var costs = Math.round(workedHours * empDetails.hourlyRate * 100) / 100;
            empArray[i].setAttr(CONFIG.attributes.workRecordEmployees.wageCosts, costs);
            
            totalCosts += costs;
            
            utils.addDebug(currentEntry, "  " + CONFIG.icons.person + " " + empName + 
                         ": " + workedHours + "h × " + empDetails.hourlyRate + "€ = " + costs + "€");
            
        } catch (error) {
            utils.addError(currentEntry, "Chyba pri spracovaní zamestnanca " + empName + ": " + error, 
                         "processEmployees");
        }
    }
    
    // Ulož súhrnné hodnoty
    utils.safeSet(currentEntry, CONFIG.fields.employeeCount, employees.length);
    utils.safeSet(currentEntry, CONFIG.fields.wageCosts, totalCosts);
    
    utils.addDebug(currentEntry, "  " + CONFIG.icons.money + " Celkové mzdové náklady: " + 
                  utils.formatMoney(totalCosts));
    
    return {
        count: employees.length,
        totalCosts: totalCosts
    };
}

// ==============================================
// HZS SPRACOVANIE
// ==============================================

/**
 * Získa default HZS z ASISTANTO Defaults
 */
function getDefaultHZS() {
    try {
        var defaultsLib = libByName(centralConfig.libraries.core.defaults);
        var defaults = defaultsLib.entries();
        
        if (defaults && defaults.length > 0) {
            var defaultHZS = utils.safeGet(defaults[0], "Default HZS");
            
            if (defaultHZS && defaultHZS.length > 0) {
                utils.addDebug(currentEntry, "  " + CONFIG.icons.link + " Default HZS nájdené");
                return defaultHZS;
            }
        }
        
        utils.addDebug(currentEntry, "  " + CONFIG.icons.warning + " Default HZS nenájdené");
        return null;
        
    } catch (error) {
        utils.addError(currentEntry, error, "getDefaultHZS");
        return null;
    }
}

/**
 * Spracuje HZS a vypočíta sumu
 */
function processHZS(workedHours) {
    utils.addDebug(currentEntry, CONFIG.icons.step + " KROK 4: Spracovanie HZS");
    
    try {
        var hzsField = utils.safeGetLinks(currentEntry, CONFIG.fields.hzs);
        
        // Ak nie je HZS, skús default
        if (!hzsField || hzsField.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ HZS nie je nastavené, hľadám default...");
            
            var defaultHZS = getDefaultHZS();
            if (defaultHZS) {
                utils.safeSet(currentEntry, CONFIG.fields.hzs, defaultHZS);
                hzsField = currentEntry.field(CONFIG.fields.hzs);
            }
        }
        
        // Získaj cenu z HZS
        var hzsPrice = 0;
        if (hzsField && hzsField.length > 0) {
            hzsPrice = utils.safeGetAttribute(
                currentEntry, 
                CONFIG.fields.hzs, 
                CONFIG.attributes.hzs.price, 
                0
            );
        }
        
        // Vypočítaj sumu
        var hzsSum = Math.round(workedHours * hzsPrice * 100) / 100;
        utils.safeSet(currentEntry, CONFIG.fields.hzsSum, hzsSum);
        
        utils.addDebug(currentEntry, "  " + CONFIG.icons.money + " HZS: " + 
                      workedHours + "h × " + hzsPrice + "€ = " + hzsSum + "€");
        
        return {
            success: true,
            price: hzsPrice,
            sum: hzsSum
        };
        
    } catch (error) {
        utils.addError(currentEntry, error, "processHZS");
        return { 
            success: false, 
            price: 0, 
            sum: 0 
        };
    }
}

// ==============================================
// VÝKAZ PRÁC
// ==============================================

/**
 * Synchronizuje s výkazom prác
 */
function synchronizeWorkReport(customer, date, workedHours, hzsPrice) {
    utils.addDebug(currentEntry, CONFIG.icons.step + " KROK 5: Synchronizácia výkazu prác");
    
    try {
        if (!customer || customer.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadna zákazka - preskakujem výkaz");
            return;
        }
        
        var customerObj = customer[0];
        var customerName = utils.safeGet(customerObj, "Názov", "N/A");
        
        utils.addDebug(currentEntry, "  🔍 Hľadám výkaz pre zákazku: " + customerName);
        
        // Nájdi existujúci výkaz
        var existingReports = safeLinksFrom(
            customerObj,
            CONFIG.libraries.workReport,
            CONFIG.vykazFields.zakazka
        );
        
        var workReport = null;
        
        if (existingReports && existingReports.length > 0) {
            workReport = existingReports[0];
            utils.addDebug(currentEntry, "  " + CONFIG.icons.update + " Existujúci výkaz nájdený");
        } else {
            // Vytvor nový výkaz
            workReport = createNewWorkReport(customerObj, date, customerName);
        }
        
        // Pridaj link na aktuálny záznam
        if (workReport) {
            addWorkRecordLink(workReport, workedHours, hzsPrice);
        }
        
    } catch (error) {
        utils.addError(currentEntry, error, "synchronizeWorkReport");
    }
}

/**
 * Vytvorí nový výkaz prác
 */
function createNewWorkReport(customerObj, date, customerName) {
    try {
        var reportLib = libByName(CONFIG.libraries.workReport);
        var workReport = reportLib.create({});
        
        // Nastav základné polia
        utils.safeSet(workReport, CONFIG.vykazFields.datum, date);
        utils.safeSet(workReport, CONFIG.vykazFields.identifikator, "VP-" + moment(date).format("YYYYMMDD"));
        utils.safeSet(workReport, CONFIG.vykazFields.popis, "Výkaz prác - " + customerName);
        utils.safeSet(workReport, CONFIG.vykazFields.typVykazu, "Podľa vykonaných prác");
        utils.safeSet(workReport, CONFIG.vykazFields.cenyPocitat, "Z cenovej ponuky");
        utils.safeSet(workReport, CONFIG.vykazFields.vydane, "Zákazka");
        utils.safeSet(workReport, CONFIG.vykazFields.zakazka, customerObj);
        
        // Info záznam
        var info = CONFIG.icons.info + " AUTOMATICKY VYTVORENÝ VÝKAZ\n";
        info += "=====================================\n\n";
        info += "📅 Dátum: " + formatDate(date) + "\n";
        info += "📦 Zákazka: " + customerName + "\n";
        info += "⏰ Vytvorené: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
        info += "🔧 Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        info += "📂 Zdroj: Knižnica " + CONFIG.libraries.workRecord + "\n\n";
        info += "✅ VÝKAZ VYTVORENÝ ÚSPEŠNE";
        
        utils.safeSet(workReport, CONFIG.vykazFields.info, info);
        
        utils.addDebug(currentEntry, "  " + CONFIG.icons.create + " Nový výkaz vytvorený");
        
        return workReport;
        
    } catch (error) {
        utils.addError(currentEntry, error, "createNewWorkReport");
        return null;
    }
}

/**
 * Pridá link na záznam prác do výkazu
 */
function addWorkRecordLink(workReport, workedHours, hzsPrice) {
    try {
        var praceHZS = utils.safeGetLinks(workReport, CONFIG.vykazFields.praceHZS);
        
        // Skontroluj či link už neexistuje
        var linkExists = false;
        for (var i = 0; i < praceHZS.length; i++) {
            if (praceHZS[i] && praceHZS[i].id === currentEntry.id) {
                linkExists = true;
                break;
            }
        }
        
        if (linkExists) {
            utils.addDebug(currentEntry, "  ℹ️ Link už existuje vo výkaze");
            return;
        }
        
        // Pridaj nový link
        praceHZS.push(currentEntry);
        workReport.set(CONFIG.vykazFields.praceHZS, praceHZS);
        
        utils.addDebug(currentEntry, "  " + CONFIG.icons.link + " Link pridaný do výkazu");
        
        // Nastav atribúty na novom linku
        var lastIndex = praceHZS.length - 1;
        var workDescription = utils.safeGet(currentEntry, CONFIG.fields.workDescription, "");
        var totalPrice = Math.round(workedHours * hzsPrice * 100) / 100;
        
        try {
            var vykazArray = workReport.field(CONFIG.vykazFields.praceHZS);
            
            vykazArray[lastIndex].setAttr(CONFIG.attributes.workReport.workDescription, workDescription);
            vykazArray[lastIndex].setAttr(CONFIG.attributes.workReport.hoursCount, workedHours);
            vykazArray[lastIndex].setAttr(CONFIG.attributes.workReport.billedRate, hzsPrice);
            vykazArray[lastIndex].setAttr(CONFIG.attributes.workReport.totalPrice, totalPrice);
            
            utils.addDebug(currentEntry, "  ✅ Atribúty nastavené na výkaze");
            
        } catch (attrError) {
            utils.addDebug(currentEntry, "  ⚠️ Chyba pri nastavení atribútov: " + attrError);
        }
        
    } catch (error) {
        utils.addError(currentEntry, error, "addWorkRecordLink");
    }
}

// ==============================================
// INFO ZÁZNAM
// ==============================================

/**
 * Vytvorí info záznam so súhrnom
 */
function createInfoRecord(workTime, employees, hzs) {
    utils.addDebug(currentEntry, CONFIG.icons.step + " KROK 6: Vytvorenie info záznamu");
    
    var info = [];
    
    info.push(CONFIG.icons.info + " ZÁZNAM PRÁC - PREPOČET");
    info.push("=====================================");
    info.push("");
    info.push("📅 Dátum: " + formatDate(utils.safeGet(currentEntry, CONFIG.fields.date)));
    info.push("⏰ Čas: " + utils.formatTime(workTime.startTime) + " - " + utils.formatTime(workTime.endTime));
    info.push("⏱️ Odpracované: " + workTime.hours + " hodín");
    info.push("");
    
    if (employees.count > 0) {
        info.push("👥 ZAMESTNANCI (" + employees.count + "):");
        
        // Detaily zamestnancov
        var empArray = currentEntry.field(CONFIG.fields.employees);
        for (var i = 0; i < empArray.length; i++) {
            var emp = empArray[i];
            var empName = getEmployeeName(emp);
            var empHours = emp.attr(CONFIG.attributes.workRecordEmployees.workedHours) || 0;
            var empRate = emp.attr(CONFIG.attributes.workRecordEmployees.hourlyRate) || 0;
            var empCost = emp.attr(CONFIG.attributes.workRecordEmployees.wageCosts) || 0;
            
            info.push("  • " + empName + ": " + empHours + "h × " + empRate + "€ = " + empCost + "€");
        }
        
        info.push("");
        info.push("💰 Mzdové náklady celkom: " + utils.formatMoney(employees.totalCosts));
        info.push("");
    }
    
    if (hzs.price > 0) {
        info.push("💵 HODINOVÁ ZÚČTOVACIA SADZBA:");
        info.push("  • Sadzba: " + utils.formatMoney(hzs.price) + "/h");
        info.push("  • Suma: " + utils.formatMoney(hzs.sum));
        info.push("");
    }
    
    var customer = utils.safeGetLinks(currentEntry, CONFIG.fields.customer);
    if (customer && customer.length > 0) {
        info.push("📦 Zákazka: " + utils.safeGet(customer[0], "Názov", "N/A"));
    }
    
    var workDescription = utils.safeGet(currentEntry, CONFIG.fields.workDescription);
    if (workDescription) {
        info.push("");
        info.push("🔨 VYKONANÉ PRÁCE:");
        info.push(workDescription);
    }
    
    info.push("");
    info.push("─────────────────────────────────────");
    info.push("⏰ Vytvorené: " + moment().format("DD.MM.YYYY HH:mm:ss"));
    info.push("🔧 Script: " + CONFIG.scriptName + " v" + CONFIG.version);
    
    utils.safeSet(currentEntry, CONFIG.commonFields.info, info.join("\n"));
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, CONFIG.icons.start + " === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        utils.clearLogs(currentEntry, false);
        
        // 1. Validácia vstupných dát
        var validationResult = validateInputs();
        if (!validationResult.success) {
            utils.addError(currentEntry, "Validácia zlyhala: " + validationResult.message, "main");
            return false;
        }
        
        // 2. Výpočet pracovnej doby
        var workTimeResult = calculateWorkTime();
        if (!workTimeResult.success) {
            utils.addError(currentEntry, "Výpočet času zlyhal", "main");
            return false;
        }
        
        // 3. Spracovanie zamestnancov
        var employeeResult = processEmployees(workTimeResult.hours);
        
        // 4. Spracovanie HZS
        var hzsResult = processHZS(workTimeResult.hours);
        
        // 5. Synchronizácia výkazu prác
        if (validationResult.hasCustomer) {
            synchronizeWorkReport(
                validationResult.customer,
                validationResult.date,
                workTimeResult.hours,
                hzsResult.price
            );
        }
        
        // 6. Vytvorenie info záznamu
        createInfoRecord(workTimeResult, employeeResult, hzsResult);
        
        utils.addDebug(currentEntry, CONFIG.icons.success + " === PREPOČET DOKONČENÝ ===");
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, error, "main");
        return false;
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

try {
    utils.addDebug(currentEntry, "🎬 Inicializácia " + CONFIG.scriptName + " v" + CONFIG.version);
    
    // Kontrola či máme currentEntry
    if (!currentEntry) {
        message("💥 KRITICKÁ CHYBA!\n\nScript nemôže bežať bez aktuálneho záznamu.");
        throw new Error("currentEntry neexistuje");
    }
    
    // Kontrola závislostí
    var deps = utils.checkDependencies(['config', 'core', 'business']);
    if (!deps.success) {
        var errorMsg = "❌ Chýbajúce moduly: " + deps.missing.join(", ") + 
                      "\n\nUistite sa, že máte nainštalované všetky MementoUtils knižnice.";
        message(errorMsg);
        cancel();
    }
    
    // Spusti hlavnú funkciu
    var result = main();
    
    if (result) {
        // Zobraz súhrn užívateľovi
        var info = utils.safeGet(currentEntry, CONFIG.commonFields.info, "");
        var lines = info.split("\n");
        var shortInfo = lines.slice(0, 15).join("\n");
        
        if (lines.length > 15) {
            shortInfo += "\n\n... (zobrazených prvých 15 riadkov)";
        }
        
        message("✅ Záznam prác úspešne prepočítaný!\n\n" + shortInfo + 
               "\n\n" + CONFIG.icons.info + " Kompletné detaily nájdete v poli 'info'");
    } else {
        var errorLog = utils.safeGet(currentEntry, CONFIG.commonFields.errorLog, "Žiadne chyby");
        
        message("❌ Prepočet záznamu prác zlyhal!\n\n" +
               "🔍 Skontrolujte:\n" +
               "  • Všetky povinné polia sú vyplnené\n" +
               "  • Časy Od/Do sú správne\n" +
               "  • Zamestnanci majú platné sadzby\n\n" +
               "📋 Error Log:\n" + errorLog);
    }
    
} catch (criticalError) {
    try {
        utils.addError(currentEntry, criticalError, "CRITICAL");
        message("💥 KRITICKÁ CHYBA!\n\n" + criticalError.toString() + 
               "\n\nScript nemohol dokončiť spracovanie.\nSkontrolujte Error_Log pre detaily.");
    } catch (finalError) {
        message("💥 FATÁLNA CHYBA!\n\nScript úplne zlyhal.\n\n" + 
               criticalError.toString());
    }
}