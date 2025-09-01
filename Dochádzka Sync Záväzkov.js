// ==============================================
// MEMENTO DATABASE - DOCHÁDZKA SYNC ZÁVÄZKOV
// Verzia: 6.1 | Dátum: September 2025 | Autor: ASISTANTO
// Knižnica: Dochádzka | Trigger: After Save
// ==============================================
// ✅ KOMPLETNÝ REFAKTORING v6.1:
//    - Štruktúra ako v Záznam prác 8.0 a Dochádzka 7.3
//    - Plné využitie MementoUtils v7.0
//    - Prepočet záväzkov a pohľadávok zamestnancov
//    - Aktualizácia finančných polí v zamestnancoch
//    - Čistá organizácia kódu
// ==============================================
// 🔗 VYŽADOVANÉ KNIŽNICE:
//    - MementoUtils v7.0 (agregátor)
//    - MementoCore (základné funkcie)
//    - MementoConfig (konfigurácia)
//    - MementoBusiness (business funkcie)
// ==============================================
// 📋 FUNKCIE:
//    - Vytvorenie/aktualizácia záväzkov z dochádzky
//    - Prepočet finančných polí zamestnancov
//    - Výpočet celkových záväzkov a pohľadávok
//    - Automatické označenie checkboxov
//    - Komplexné info záznamy
// ==============================================

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var config = utils.getConfig();
var centralConfig = utils.config;
var currentEntry = entry();

var CONFIG = {
    scriptName: "Dochádzka Sync Záväzkov",
    version: "6.1.2",
    
    // Referencie na centrálny config
    fields: {
        attendance: centralConfig.fields.attendance || {},
        obligations: centralConfig.fields.obligations || {},
        employees: centralConfig.fields.employees || {},
        common: centralConfig.fields.common || {},
        
        // Špecifické mapovanie pre tento script
        datum: centralConfig.fields.attendance.date || "Dátum",
        zamestnanci: centralConfig.fields.attendance.employees || "Zamestnanci",
        zavazky: centralConfig.fields.attendance.obligations || "Záväzky",
        info: centralConfig.fields.common.info || "info",
        infoTelegram: centralConfig.fields.common.infoTelegram || "info_telegram"
    },
    
    attributes: {
        attendance: centralConfig.attributes.attendanceEmployees || {
            dennaMzda: "denná mzda",
            odpracovane: "odpracované",
            hodinovka: "hodinovka"
        }
    },
    
    libraries: centralConfig.libraries || {
        business: {
            obligations: "Záväzky",
            employees: "Zamestnanci",
            attendance: "Dochádzka"
        }
    },
    
    icons: centralConfig.icons || {},
    
    // Špecifické konštanty pre záväzky
    constants: {
        stavy: {
            neuhradene: "Neuhradené",
            ciastocneUhradene: "Čiastočne uhradené",
            uhradene: "Uhradené"
        },
        typy: {
            mzda: "Mzda",
            odmena: "Odmena",
            ine: "Iné"
        }
    }
};

// ==============================================
// SLEDOVANIE KROKOV
// ==============================================

var steps = {
    step1: { name: "Validácia vstupných dát", success: false },
    step2: { name: "Kontrola knižníc", success: false },
    step3: { name: "Nájdenie existujúcich záväzkov", success: false },
    step4: { name: "Spracovanie záväzkov", success: false },
    step5: { name: "Prepočet financií zamestnancov", success: false },
    step6: { name: "Finalizácia záznamu", success: false }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, "🚀 === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        utils.addDebug(currentEntry, "⏰ Čas spustenia: " + utils.formatDate(moment(), "DD.MM.YYYY HH:mm:ss"));
        
        // KROK 1: Validácia vstupných dát
        utils.addDebug(currentEntry, utils.getIcon("check") + " KROK 1: Validácia vstupných dát");
        var validationResult = validateInputData();
        if (!validationResult.success) {
            utils.addError(currentEntry, validationResult.error, "main");
            message("❌ " + validationResult.error);
            return false;
        }
        steps.step1.success = true;
        
        // KROK 2: Kontrola knižníc
        utils.addDebug(currentEntry, utils.getIcon("library") + " KROK 2: Kontrola potrebných knižníc");
        var libraries = getRequiredLibraries();
        if (!libraries) {
            message("❌ Nepodarilo sa načítať potrebné knižnice!");
            return false;
        }
        steps.step2.success = true;
        
        // KROK 3: Nájdenie existujúcich záväzkov
        utils.addDebug(currentEntry, utils.getIcon("search") + " KROK 3: Hľadanie existujúcich záväzkov");
        var existingObligations = findExistingObligations(libraries.zavazky);
        utils.addDebug(currentEntry, "📊 Nájdené existujúce záväzky: " + existingObligations.length);
        steps.step3.success = true;
        
        // KROK 4: Spracovanie záväzkov
        utils.addDebug(currentEntry, utils.getIcon("update") + " KROK 4: Vytvorenie/aktualizácia záväzkov");
        var processingResult = processEmployees(
            validationResult.employees,
            validationResult.date,
            libraries,
            existingObligations
        );
        steps.step4.success = processingResult.success;
        
        // KROK 5: Prepočet financií zamestnancov
        utils.addDebug(currentEntry, utils.getIcon("money") + " KROK 5: Prepočet financií zamestnancov");
        var financialResult = updateEmployeeFinancials(validationResult.employees, libraries);
        steps.step5.success = financialResult.success;
        
        // KROK 6: Finalizácia
        utils.addDebug(currentEntry, utils.getIcon("checkmark") + " KROK 6: Finalizácia záznamu");
        if (processingResult.total > 0) {
            markCheckboxes();
            createInfoRecord(processingResult, validationResult.date, financialResult);
            steps.step6.success = true;
        }
        
        // Finálne zhrnutie
        logFinalSummary(steps, processingResult);
        
        // Informuj používateľa
        showUserMessage(processingResult, financialResult);
        
        return processingResult.success;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v main: " + error.toString(), "main", error);
        message("💥 Kritická chyba!\n" + error.toString());
        return false;
    }
}

// ==============================================
// KROK 1: VALIDÁCIA
// ==============================================

/**
 * Validuje vstupné dáta z dochádzky
 */
function validateInputData() {
    try {
        utils.addDebug(currentEntry, "📋 Validácia vstupných dát...");
        
        // Načítaj dáta
        var datum = utils.safeGet(currentEntry, CONFIG.fields.datum);
        var zamestnanci = utils.safeGetLinks(currentEntry, CONFIG.fields.zamestnanci);
        
        // Validácia dátumu
        if (!datum) {
            return { 
                success: false, 
                error: "Dátum dochádzky nie je vyplnený!" 
            };
        }
        
        // Validácia zamestnancov
        if (!zamestnanci || zamestnanci.length === 0) {
            return { 
                success: false, 
                error: "Žiadni zamestnanci v dochádzke!" 
            };
        }
        
        // Kontrola atribútov zamestnancov
        var validEmployees = [];
        var zamArray = currentEntry.field(CONFIG.fields.zamestnanci);
        
        for (var i = 0; i < zamestnanci.length; i++) {
            var employee = zamestnanci[i];
            if (!employee) continue;
            
            // Získaj atribút denná mzda
            var dennaMzda = 0;
            try {
                dennaMzda = zamArray[i].attr(CONFIG.attributes.attendance.dennaMzda) || 0;
            } catch (e) {
                utils.addDebug(currentEntry, "⚠️ Chyba pri čítaní atribútu: " + e.toString());
            }
            
            if (dennaMzda && dennaMzda > 0) {
                validEmployees.push({
                    entry: employee,
                    index: i,
                    dailyWage: dennaMzda,
                    name: utils.formatEmployeeName ? utils.formatEmployeeName(employee) : 
                          employee.field("Nick") || employee.field("Priezvisko") || "Zamestnanec"
                });
                
                utils.addDebug(currentEntry, "✅ " + validEmployees[validEmployees.length-1].name + 
                               " - denná mzda: " + utils.formatMoney(dennaMzda));
            } else {
                var empName = employee.field("Nick") || employee.field("Priezvisko") || "Zamestnanec";
                utils.addDebug(currentEntry, "⚠️ " + empName + " - nemá nastavenú dennú mzdu");
            }
        }
        
        if (validEmployees.length === 0) {
            return { 
                success: false, 
                error: "Žiadni zamestnanci nemajú nastavenú dennú mzdu!" 
            };
        }
        
        utils.addDebug(currentEntry, "✅ Validácia úspešná");
        utils.addDebug(currentEntry, "  📅 Dátum: " + utils.formatDate(datum));
        utils.addDebug(currentEntry, "  👥 Platní zamestnanci: " + validEmployees.length + "/" + zamestnanci.length);
        
        return {
            success: true,
            date: datum,
            employees: validEmployees,
            allEmployees: zamestnanci
        };
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri validácii: " + error.toString(), "validateInputData", error);
        return { 
            success: false, 
            error: "Chyba pri validácii dát" 
        };
    }
}

// ==============================================
// KROK 2: KONTROLA KNIŽNÍC
// ==============================================

/**
 * Získa potrebné knižnice
 */
function getRequiredLibraries() {
    try {
        utils.addDebug(currentEntry, "📚 Získavam potrebné knižnice...");
        
        var libraries = {};
        
        // Knižnica Záväzky
        var zavazkyName = CONFIG.libraries.business.obligations || "Záväzky";
        libraries.zavazky = libByName(zavazkyName);
        if (!libraries.zavazky) {
            utils.addError(currentEntry, "Knižnica '" + zavazkyName + "' nenájdená!", "getRequiredLibraries");
            return null;
        }
        utils.addDebug(currentEntry, "✅ Knižnica Záväzky načítaná");
        
        // Knižnica Zamestnanci
        var zamestnanciName = CONFIG.libraries.business.employees || "Zamestnanci";
        libraries.zamestnanci = libByName(zamestnanciName);
        if (!libraries.zamestnanci) {
            utils.addError(currentEntry, "Knižnica '" + zamestnanciName + "' nenájdená!", "getRequiredLibraries");
            return null;
        }
        utils.addDebug(currentEntry, "✅ Knižnica Zamestnanci načítaná");
        
        return libraries;
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri získavaní knižníc: " + error.toString(), "getRequiredLibraries", error);
        return null;
    }
}

// ==============================================
// KROK 3: HĽADANIE EXISTUJÚCICH ZÁVÄZKOV
// ==============================================

/**
 * Nájde existujúce záväzky pre túto dochádzku
 */
function findExistingObligations(zavazkyLib) {
    try {
        utils.addDebug(currentEntry, "🔍 Hľadám existujúce záväzky...");
        
        var currentEntryId = currentEntry.field("ID");
        if (!currentEntryId) {
            utils.addDebug(currentEntry, "⚠️ Current entry nemá ID");
            return [];
        }
        
        // Hľadaj záväzky ktoré majú link na túto dochádzku
        var dochadzkaField = CONFIG.fields.obligations.attendance || "Dochádzka";
        var query = dochadzkaField + " = '" + currentEntryId + "'";
        
        var existingObligations = zavazkyLib.find(query);
        
        utils.addDebug(currentEntry, "📊 Nájdených záväzkov cez query: " + existingObligations.length);
        
        return existingObligations || [];
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri hľadaní záväzkov: " + error.toString(), "findExistingObligations", error);
        return [];
    }
}

/**
 * Nájde záväzok pre konkrétneho zamestnanca
 */
function findObligationForEmployee(existingObligations, employee) {
    try {
        if (!existingObligations || !employee) return null;
        
        var employeeId = employee.field("ID");
        var zamestnanecField = CONFIG.fields.obligations.employee || "Zamestnanec";
        
        for (var i = 0; i < existingObligations.length; i++) {
            var obligation = existingObligations[i];
            var linkedEmployees = utils.safeGetLinks(obligation, zamestnanecField);
            
            for (var j = 0; j < linkedEmployees.length; j++) {
                if (linkedEmployees[j] && linkedEmployees[j].field("ID") === employeeId) {
                    return obligation;
                }
            }
        }
        
        return null;
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri hľadaní záväzku: " + error.toString(), "findObligationForEmployee");
        return null;
    }
}

// ==============================================
// KROK 4: SPRACOVANIE ZÁVÄZKOV
// ==============================================

/**
 * Spracuje všetkých zamestnancov a vytvorí/aktualizuje záväzky
 */
function processEmployees(employees, datum, libraries, existingObligations) {
    var result = {
        created: 0,
        updated: 0,
        errors: 0,
        total: 0,
        totalAmount: 0,
        success: false
    };
    
    try {
        utils.addDebug(currentEntry, "\n📋 Spracovávam zamestnancov...");
        
        for (var i = 0; i < employees.length; i++) {
            var empData = employees[i];
            
            utils.addDebug(currentEntry, "\n--- Zamestnanec " + (i + 1) + "/" + employees.length + ": " + empData.name + " ---");
            
            try {
                // Nájdi existujúci záväzok pre tohto zamestnanca
                var existingObligation = findObligationForEmployee(existingObligations, empData.entry);
                
                if (existingObligation) {
                    // Aktualizuj existujúci
                    if (updateExistingObligation(existingObligation, empData.dailyWage, empData.name, datum)) {
                        result.updated++;
                        result.totalAmount += empData.dailyWage;
                    } else {
                        result.errors++;
                    }
                } else {
                    // Vytvor nový
                    if (createNewObligation(libraries.zavazky, empData.entry, datum, empData.dailyWage, empData.name)) {
                        result.created++;
                        result.totalAmount += empData.dailyWage;
                    } else {
                        result.errors++;
                    }
                }
                
                result.total++;
                
            } catch (error) {
                utils.addError(currentEntry, "Chyba pri spracovaní zamestnanca: " + error.toString(), "processEmployees");
                result.errors++;
            }
        }
        
        result.success = result.errors === 0 && result.total > 0;
        
        utils.addDebug(currentEntry, "\n📊 Výsledky spracovania:");
        utils.addDebug(currentEntry, "  ✅ Vytvorené: " + result.created);
        utils.addDebug(currentEntry, "  🔄 Aktualizované: " + result.updated);
        utils.addDebug(currentEntry, "  ❌ Chyby: " + result.errors);
        utils.addDebug(currentEntry, "  💰 Celková suma: " + utils.formatMoney(result.totalAmount));
        
        return result;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba pri spracovaní: " + error.toString(), "processEmployees", error);
        result.success = false;
        return result;
    }
}

/**
 * Vytvorí nový záväzok
 */
function createNewObligation(zavazkyLib, employee, datum, amount, employeeName) {
    try {
        utils.addDebug(currentEntry, "  ➕ Vytváranie nového záväzku...");
        
        // Príprava dát
        var description = "Mzda zamestnanca " + employeeName + " za deň " + utils.formatDate(datum);
        
        // Info text
        var infoText = "📋 AUTOMATICKY VYTVORENÝ ZÁVÄZOK\n";
        infoText += "=====================================\n\n";
        infoText += "📅 Dátum: " + utils.formatDate(datum) + "\n";
        infoText += "👤 Zamestnanec: " + employeeName + "\n";
        infoText += "💰 Suma: " + utils.formatMoney(amount) + "\n\n";
        infoText += "⏰ Vytvorené: " + utils.formatDate(moment(), "DD.MM.YYYY HH:mm:ss") + "\n";
        infoText += "🔧 Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        infoText += "📂 Zdroj: Knižnica Dochádzka\n\n";
        infoText += "✅ ZÁVÄZOK VYTVORENÝ ÚSPEŠNE";
        
        // Dáta pre nový záznam
        var obligationData = {};
        obligationData[CONFIG.fields.obligations.state || "Stav"] = CONFIG.constants.stavy.neuhradene;
        obligationData[CONFIG.fields.obligations.date || "Dátum"] = datum;
        obligationData[CONFIG.fields.obligations.type || "Typ"] = CONFIG.constants.typy.mzda;
        obligationData[CONFIG.fields.obligations.employee || "Zamestnanec"] = [employee];
        obligationData[CONFIG.fields.obligations.creditor || "Veriteľ"] = "Zamestnanec";
        obligationData[CONFIG.fields.obligations.attendance || "Dochádzka"] = [currentEntry];
        obligationData[CONFIG.fields.obligations.description || "Popis"] = description;
        obligationData[CONFIG.fields.obligations.amount || "Suma"] = amount;
        obligationData[CONFIG.fields.obligations.paid || "Zaplatené"] = 0;
        obligationData[CONFIG.fields.obligations.balance || "Zostatok"] = amount;
        obligationData[CONFIG.fields.common.info || "info"] = infoText;
        
        // Vytvor záznam
        var newObligation = zavazkyLib.create(obligationData);
        
        if (newObligation) {
            utils.addDebug(currentEntry, "  ✅ Záväzok vytvorený (ID: " + newObligation.field("ID") + ")");
            return true;
        } else {
            utils.addError(currentEntry, "Vytvorenie záväzku zlyhalo", "createNewObligation");
            return false;
        }
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri vytváraní záväzku: " + error.toString(), "createNewObligation", error);
        return false;
    }
}

/**
 * Aktualizuje existujúci záväzok
 */
function updateExistingObligation(obligation, amount, employeeName, datum) {
    try {
        utils.addDebug(currentEntry, "  🔄 Aktualizácia existujúceho záväzku...");
        
        var paidAmount = utils.safeGet(obligation, CONFIG.fields.obligations.paid || "Zaplatené", 0);
        var newBalance = amount - paidAmount;
        var newStatus = calculateObligationStatus(newBalance);
        
        // Aktualizuj polia
        obligation.set(CONFIG.fields.obligations.amount || "Suma", amount);
        obligation.set(CONFIG.fields.obligations.balance || "Zostatok", newBalance);
        obligation.set(CONFIG.fields.obligations.state || "Stav", newStatus);
        
        // Aktualizuj info
        var existingInfo = utils.safeGet(obligation, CONFIG.fields.common.info || "info", "");
        var updateInfo = "\n\n🔄 AKTUALIZOVANÉ: " + utils.formatDate(moment(), "DD.MM.YYYY HH:mm:ss") + "\n";
        updateInfo += "• Nová suma: " + utils.formatMoney(amount) + "\n";
        updateInfo += "• Zaplatené: " + utils.formatMoney(paidAmount) + " (zachované)\n";
        updateInfo += "• Zostatok: " + utils.formatMoney(newBalance) + "\n";
        updateInfo += "• Stav: " + newStatus + "\n";
        updateInfo += "• Script: " + CONFIG.scriptName + " v" + CONFIG.version;
        
        obligation.set(CONFIG.fields.common.info || "info", existingInfo + updateInfo);
        
        utils.addDebug(currentEntry, "  ✅ Záväzok aktualizovaný");
        utils.addDebug(currentEntry, "    💰 Suma: " + utils.formatMoney(amount));
        utils.addDebug(currentEntry, "    💵 Zostatok: " + utils.formatMoney(newBalance));
        utils.addDebug(currentEntry, "    📊 Stav: " + newStatus);
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri aktualizácii záväzku: " + error.toString(), "updateExistingObligation", error);
        return false;
    }
}

/**
 * Vypočíta stav záväzku podľa zostatku
 */
function calculateObligationStatus(zostatok) {
    if (zostatok === null || zostatok === undefined) {
        return CONFIG.constants.stavy.neuhradene;
    } else if (zostatok <= 0) {
        return CONFIG.constants.stavy.uhradene;
    } else if (zostatok > 0) {
        return CONFIG.constants.stavy.ciastocneUhradene;
    } else {
        return CONFIG.constants.stavy.neuhradene;
    }
}

// ==============================================
// KROK 5: PREPOČET FINANCIÍ ZAMESTNANCOV
// ==============================================

/**
 * Aktualizuje finančné polia všetkých zamestnancov
 * Prepočíta záväzky, pohľadávky a saldo
 */
function updateEmployeeFinancials(employees, libraries) {
    var result = {
        success: false,
        processed: 0,
        errors: 0,
        totals: {
            zavazky: 0,
            pohladavky: 0,
            saldo: 0
        }
    };
    
    try {
        utils.addDebug(currentEntry, "\n💰 Prepočítavam financie zamestnancov...");
        
        // Spracuj každého zamestnanca
        for (var i = 0; i < employees.length; i++) {
            var empData = employees[i];
            
            try {
                var employeeEntry = empData.entry;
                utils.addDebug(currentEntry, "\n📊 Prepočet pre: " + empData.name);
                
                // Získaj všetky záväzky zamestnanca
                var obligations = getEmployeeObligations(employeeEntry, libraries.zavazky);
                
                // Vypočítaj súhrny
                var financials = calculateEmployeeFinancials(obligations);
                
                // Aktualizuj polia v zamestnancovi
                updateEmployeeFields(employeeEntry, financials);
                
                // Pridaj do celkových súm
                result.totals.zavazky += financials.totalObligations;
                result.totals.pohladavky += financials.totalReceivables;
                result.totals.saldo += financials.saldo;
                
                result.processed++;
                
                utils.addDebug(currentEntry, "  💸 Záväzky: " + utils.formatMoney(financials.totalObligations));
                utils.addDebug(currentEntry, "  💰 Pohľadávky: " + utils.formatMoney(financials.totalReceivables));
                utils.addDebug(currentEntry, "  📊 Saldo: " + utils.formatMoney(financials.saldo));
                
            } catch (error) {
                utils.addError(currentEntry, "Chyba pri prepočte zamestnanca: " + error.toString(), "updateEmployeeFinancials");
                result.errors++;
            }
        }
        
        result.success = result.errors === 0 && result.processed > 0;
        
        utils.addDebug(currentEntry, "\n📈 CELKOVÉ SÚHRNY:");
        utils.addDebug(currentEntry, "  💸 Celkové záväzky: " + utils.formatMoney(result.totals.zavazky));
        utils.addDebug(currentEntry, "  💰 Celkové pohľadávky: " + utils.formatMoney(result.totals.pohladavky));
        utils.addDebug(currentEntry, "  📊 Celkové saldo: " + utils.formatMoney(result.totals.saldo));
        
        return result;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba pri prepočte financií: " + error.toString(), "updateEmployeeFinancials", error);
        result.success = false;
        return result;
    }
}

/**
 * Získa všetky záväzky zamestnanca
 */
function getEmployeeObligations(employee, zavazkyLib) {
    try {
        var employeeId = employee.field("ID");
        var zamestnanecField = CONFIG.fields.obligations.employee || "Zamestnanec";
        
        // Hľadaj záväzky kde je tento zamestnanec
        var obligations = zavazkyLib.find(zamestnanecField + " = '" + employeeId + "'");
        
        return obligations || [];
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri získavaní záväzkov: " + error.toString(), "getEmployeeObligations");
        return [];
    }
}

/**
 * Vypočíta finančné súhrny zamestnanca
 */
function calculateEmployeeFinancials(obligations) {
    var result = {
        totalObligations: 0,    // Celkové záväzky (čo firma dlží zamestnancovi)
        totalReceivables: 0,    // Celkové pohľadávky (čo zamestnanec dlží firme)
        paidObligations: 0,     // Zaplatené záväzky
        paidReceivables: 0,     // Zaplatené pohľadávky
        unpaidObligations: 0,   // Nezaplatené záväzky
        unpaidReceivables: 0,   // Nezaplatené pohľadávky
        saldo: 0               // Saldo (pohľadávky - záväzky)
    };
    
    try {
        for (var i = 0; i < obligations.length; i++) {
            var obligation = obligations[i];
            var suma = utils.safeGet(obligation, CONFIG.fields.obligations.amount || "Suma", 0);
            var zaplatene = utils.safeGet(obligation, CONFIG.fields.obligations.paid || "Zaplatené", 0);
            var zostatok = utils.safeGet(obligation, CONFIG.fields.obligations.balance || "Zostatok", 0);
            var typ = utils.safeGet(obligation, CONFIG.fields.obligations.type || "Typ", "");
            
            // Rozlíš záväzky a pohľadávky podľa typu
            if (typ === "Mzda" || typ === "Odmena") {
                // Záväzky - firma dlží zamestnancovi
                result.totalObligations += suma;
                result.paidObligations += zaplatene;
                result.unpaidObligations += zostatok;
            } else if (typ === "Pôžička" || typ === "Škoda" || typ === "Zrážka") {
                // Pohľadávky - zamestnanec dlží firme
                result.totalReceivables += suma;
                result.paidReceivables += zaplatene;
                result.unpaidReceivables += zostatok;
            }
        }
        
        // Vypočítaj saldo (+ znamená že firma dlží, - znamená že zamestnanec dlží)
        result.saldo = result.unpaidObligations - result.unpaidReceivables;
        
        return result;
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri výpočte financií: " + error.toString(), "calculateEmployeeFinancials");
        return result;
    }
}

/**
 * Aktualizuje finančné polia v zamestnancovi
 */
function updateEmployeeFields(employee, financials) {
    try {
        // Aktualizuj polia
        employee.set(CONFIG.fields.employees.obligations || "Záväzky", financials.unpaidObligations);
        employee.set(CONFIG.fields.employees.receivables || "Pohľadávky", financials.unpaidReceivables);
        employee.set(CONFIG.fields.employees.balance || "Saldo", financials.saldo);
        
        // Voliteľné - aktualizuj aj platené sumy
        var paidObligField = CONFIG.fields.employees.paidObligations || "Vyplatené";
        if (employee.field(paidObligField) !== undefined) {
            employee.set(paidObligField, financials.paidObligations);
        }
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri aktualizácii polí zamestnanca: " + error.toString(), "updateEmployeeFields");
        return false;
    }
}

// ==============================================
// KROK 6: FINALIZÁCIA
// ==============================================

/**
 * Označí checkbox Záväzky v dochádzke
 */
function markCheckboxes() {
    try {
        // Checkbox pre záväzky
        var checkboxField = CONFIG.fields.zavazky;
        currentEntry.set(checkboxField, true);
        utils.addDebug(currentEntry, "☑️ Checkbox '" + checkboxField + "' označený");
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri označovaní checkboxu: " + error.toString(), "markCheckboxes", error);
    }
}

/**
 * Vytvorí info záznam so súhrnom
 */
function createInfoRecord(processingResult, datum, financialResult) {
    try {
        var infoMessage = "📋 SYNCHRONIZÁCIA ZÁVÄZKOV\n";
        infoMessage += "=====================================\n\n";
        infoMessage += "📅 Dátum: " + utils.formatDate(datum) + "\n";
        infoMessage += "⏰ Čas sync: " + utils.formatDate(moment(), "DD.MM.YYYY HH:mm:ss") + "\n\n";
        
        infoMessage += "📊 VÝSLEDKY ZÁVÄZKOV:\n";
        infoMessage += "• ➕ Nové záväzky: " + processingResult.created + "\n";
        infoMessage += "• 🔄 Aktualizované: " + processingResult.updated + "\n";
        infoMessage += "• 💰 Celková suma: " + utils.formatMoney(processingResult.totalAmount) + "\n";
        
        if (processingResult.errors > 0) {
            infoMessage += "• ⚠️ Chyby: " + processingResult.errors + "\n";
        }
        
        if (financialResult) {
            infoMessage += "\n💰 FINANČNÉ SÚHRNY:\n";
            infoMessage += "• 💸 Celkové záväzky: " + utils.formatMoney(financialResult.totals.zavazky) + "\n";
            infoMessage += "• 💰 Celkové pohľadávky: " + utils.formatMoney(financialResult.totals.pohladavky) + "\n";
            infoMessage += "• 📊 Celkové saldo: " + utils.formatMoney(financialResult.totals.saldo) + "\n";
            infoMessage += "• 👥 Spracovaní zamestnanci: " + financialResult.processed + "\n";
        }
        
        infoMessage += "\n🔧 TECHNICKÉ INFO:\n";
        infoMessage += "• Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        infoMessage += "• MementoUtils: v" + utils.version + "\n";
        infoMessage += "• Trigger: After Save\n";
        infoMessage += "• Knižnica: Dochádzka\n\n";
        
        if (processingResult.total === processingResult.created + processingResult.updated) {
            infoMessage += "✅ VŠETKY ZÁVÄZKY ÚSPEŠNE SYNCHRONIZOVANÉ";
        } else {
            infoMessage += "⚠️ ČIASTOČNÁ SYNCHRONIZÁCIA\n";
            infoMessage += "Pre detaily pozri Debug_Log";
        }
        
        currentEntry.set(CONFIG.fields.info, infoMessage);
        
        // Vytvor aj Telegram info ak je pole dostupné
        if (CONFIG.fields.infoTelegram) {
            var telegramInfo = createTelegramInfo(processingResult, datum, financialResult);
            currentEntry.set(CONFIG.fields.infoTelegram, telegramInfo);
        }
        
        utils.addDebug(currentEntry, "📝 Info záznamy vytvorené");
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri vytváraní info záznamu: " + error.toString(), "createInfoRecord", error);
    }
}

/**
 * Vytvorí Telegram info správu
 */
function createTelegramInfo(processingResult, datum, financialResult) {
    try {
        var msg = "*📋 SYNC ZÁVÄZKOV*\\n";
        msg += "```" + utils.formatDate(datum, "DD.MM.YYYY") + "```\\n\\n";
        
        msg += "*Záväzky:*\\n";
        msg += "• Nové: " + processingResult.created + "\\n";
        msg += "• Aktualizované: " + processingResult.updated + "\\n";
        msg += "• Suma: " + escapeMarkdown(utils.formatMoney(processingResult.totalAmount)) + "\\n";
        
        if (financialResult) {
            msg += "\\n*Financie celkom:*\\n";
            msg += "• Záväzky: " + escapeMarkdown(utils.formatMoney(financialResult.totals.zavazky)) + "\\n";
            msg += "• Pohľadávky: " + escapeMarkdown(utils.formatMoney(financialResult.totals.pohladavky)) + "\\n";
            msg += "• Saldo: " + escapeMarkdown(utils.formatMoney(financialResult.totals.saldo)) + "\\n";
        }
        
        return msg;
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri vytváraní Telegram info: " + error.toString(), "createTelegramInfo");
        return "";
    }
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

/**
 * Escape markdown pre Telegram
 */
function escapeMarkdown(text) {
    if (!text) return "";
    return text.toString()
        .replace(/\\/g, "\\\\")
        .replace(/\*/g, "\\*")
        .replace(/_/g, "\\_")
        .replace(/\[/g, "\\[")
        .replace(/\]/g, "\\]")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)")
        .replace(/~/g, "\\~")
        .replace(/`/g, "\\`")
        .replace(/>/g, "\\>")
        .replace(/#/g, "\\#")
        .replace(/\+/g, "\\+")
        .replace(/-/g, "\\-")
        .replace(/=/g, "\\=")
        .replace(/\|/g, "\\|")
        .replace(/\{/g, "\\{")
        .replace(/\}/g, "\\}")
        .replace(/\./g, "\\.")
        .replace(/!/g, "\\!");
}

/**
 * Zaloguje finálne štatistiky
 */
function logFinalSummary(steps, processingResult) {
    try {
        utils.addDebug(currentEntry, "\n📊 === FINÁLNY SÚHRN ===");
        
        var allSuccess = true;
        for (var step in steps) {
            var status = steps[step].success ? "✅" : "❌";
            utils.addDebug(currentEntry, status + " " + steps[step].name);
            if (!steps[step].success) allSuccess = false;
        }
        
        if (allSuccess) {
            utils.addDebug(currentEntry, "\n🎉 === VŠETKY KROKY ÚSPEŠNÉ ===");
        } else {
            utils.addDebug(currentEntry, "\n⚠️ === NIEKTORÉ KROKY ZLYHALI ===");
        }
        
        utils.addDebug(currentEntry, "⏱️ Čas ukončenia: " + moment().format("HH:mm:ss"));
        utils.addDebug(currentEntry, "📋 === KONIEC " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "logFinalSummary", error);
    }
}

/**
 * Zobrazí správu používateľovi
 */
function showUserMessage(processingResult, financialResult) {
    try {
        if (processingResult.total > 0) {
            var summaryMsg = "✅ Záväzky úspešne synchronizované!\n\n";
            summaryMsg += "📊 Výsledky:\n";
            summaryMsg += "• Nové: " + processingResult.created + "\n";
            summaryMsg += "• Aktualizované: " + processingResult.updated + "\n";
            summaryMsg += "• Celková suma: " + utils.formatMoney(processingResult.totalAmount) + "\n";
            
            if (financialResult && financialResult.success) {
                summaryMsg += "\n💰 Financie zamestnancov:\n";
                summaryMsg += "• Celkové záväzky: " + utils.formatMoney(financialResult.totals.zavazky) + "\n";
                summaryMsg += "• Celkové pohľadávky: " + utils.formatMoney(financialResult.totals.pohladavky) + "\n";
                summaryMsg += "• Celkové saldo: " + utils.formatMoney(financialResult.totals.saldo);
            }
            
            if (processingResult.errors > 0) {
                summaryMsg += "\n\n⚠️ Chyby: " + processingResult.errors;
            }
            
            message(summaryMsg);
        } else {
            message("❌ Synchronizácia záväzkov zlyhala!\nPozri Error_Log pre detaily.");
        }
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri zobrazení správy: " + error.toString(), "showUserMessage");
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

// Kontrola závislostí
var depCheck = utils.checkDependencies(['config', 'core', 'business']);
if (!depCheck.success) {
    message("❌ Chýbajú potrebné moduly: " + depCheck.missing.join(", "));
    cancel();
}

// Spustenie hlavnej funkcie
var result = main();

// Ak hlavná funkcia zlyhala, zruš uloženie
if (!result) {
    utils.addError(currentEntry, "Script zlyhal - zrušené uloženie", "main");
    cancel();
}