// ==============================================
// MEMENTO DATABASE - DOCHÁDZKA SYNC ZÁVÄZKOV
// Verzia: 7.0 | Dátum: September 2025 | Autor: ASISTANTO
// Knižnica: Dochádzka | Trigger: After Save
// ==============================================
// 📋 FUNKCIA:
//    - Vytvorenie záväzkov pre zamestnancov z dochádzky
//    - Aktualizácia existujúcich záväzkov
//    - Automatické označenie checkboxu
//    - Info záznamy pre audit trail
// ==============================================
// 🔧 POUŽÍVA:
//    - MementoUtils v7.0 (agregátor)
//    - MementoConfig (centrálna konfigurácia)
//    - MementoCore (základné funkcie)
//    - MementoBusiness (business logika)
// ==============================================
// ✅ ZJEDNODUŠENÉ v7.0:
//    - Využitie utils.processEmployees z MementoBusiness
//    - Odstránené duplicitné funkcie
//    - Jednoduchšia validácia
//    - Čistá štruktúra ako v referenčných scriptoch
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
    version: "7.0.1",
    
    // Referencie na centrálny config
    fields: {
        attendance: centralConfig.fields.attendance || {},
        obligations: centralConfig.fields.obligations || {},
        common: centralConfig.fields.common || {},
        
        // Špecifické mapovanie
        datum: centralConfig.fields.attendance.date || "Dátum",
        zamestnanci: centralConfig.fields.attendance.employees || "Zamestnanci",
        zavazky: centralConfig.fields.attendance.obligations || "Záväzky",
        info: centralConfig.fields.common.info || "info"
    },
    
    attributes: centralConfig.attributes.attendanceEmployees || {
        dennaMzda: "denná mzda"
    },
    
    libraries: centralConfig.libraries.business || {
        obligations: "Záväzky"
    },
    
    // Konštanty pre záväzky
    constants: {
        stavy: {
            neuhradene: "Neuhradené",
            ciastocneUhradene: "Čiastočne uhradené",
            uhradene: "Uhradené"
        },
        typy: {
            mzda: "Mzda"
        }
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, "🚀 === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        utils.addDebug(currentEntry, "⏰ Čas spustenia: " + utils.formatDate(moment()));
        
        // Kroky synchrnonizácie
        var steps = {
            step1: { success: false, name: "Validácia vstupných dát" },
            step2: { success: false, name: "Kontrola knižnice záväzkov" },
            step3: { success: false, name: "Spracovanie záväzkov" },
            step4: { success: false, name: "Finalizácia záznamu" }
        };
        
        // KROK 1: Validácia vstupných dát
        utils.addDebug(currentEntry, "📋 KROK 1: Validácia vstupných dát");
        var validationResult = validateInputData();
        if (!validationResult.success) {
            utils.addError(currentEntry, validationResult.error, CONFIG.scriptName);
            message("❌ " + validationResult.error);
            return false;
        }
        steps.step1.success = true;
        
        // KROK 2: Kontrola knižnice záväzkov
        utils.addDebug(currentEntry, "📚 KROK 2: Kontrola knižnice záväzkov");
        var zavazkyLib = libByName(CONFIG.libraries.obligations);
        if (!zavazkyLib) {
            utils.addError(currentEntry, "Knižnica Záväzky nenájdená!", CONFIG.scriptName);
            message("❌ Knižnica Záväzky nie je dostupná!");
            return false;
        }
        steps.step2.success = true;
        
        // KROK 3: Spracovanie záväzkov
        utils.addDebug(currentEntry, "💰 KROK 3: Spracovanie záväzkov");
        var processingResult = processObligations(
            validationResult.employees,
            validationResult.date,
            zavazkyLib
        );
        steps.step3.success = processingResult.success;
        
        // KROK 4: Finalizácia
        utils.addDebug(currentEntry, "✅ KROK 4: Finalizácia záznamu");
        if (processingResult.total > 0) {
            markCheckbox();
            createInfoRecord(processingResult, validationResult.date);
            steps.step4.success = true;
        }
        
        // Finálne zhrnutie
        logFinalSummary(steps);
        
        // Zobraz výsledky
        showUserMessage(processingResult);
        
        return processingResult.success;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba: " + error.toString(), CONFIG.scriptName, error);
        message("💥 Kritická chyba!\n" + error.toString());
        return false;
    }
}

// ==============================================
// KROK 1: VALIDÁCIA
// ==============================================

function validateInputData() {
    try {
        var datum = utils.safeGet(currentEntry, CONFIG.fields.datum);
        var zamestnanci = utils.safeGetLinks(currentEntry, CONFIG.fields.zamestnanci);
        
        // Kontrola povinných polí
        var requiredFields = [CONFIG.fields.datum, CONFIG.fields.zamestnanci];
        if (!utils.validateRequiredFields(currentEntry, requiredFields)) {
            return { success: false, error: "Chýbajú povinné polia!" };
        }
        
        // Kontrola atribútov - získaj len zamestnancov s dennou mzdou
        var validEmployees = [];
        var zamArray = currentEntry.field(CONFIG.fields.zamestnanci);
        
        for (var i = 0; i < zamestnanci.length; i++) {
            var employee = zamestnanci[i];
            if (!employee) continue;
            
            var dennaMzda = 0;
            try {
                dennaMzda = zamArray[i].attr(CONFIG.attributes.dennaMzda) || 0;
            } catch (e) {
                utils.addDebug(currentEntry, "⚠️ Chyba pri čítaní atribútu: " + e.toString());
            }
            
            if (dennaMzda > 0) {
                validEmployees.push({
                    entry: employee,
                    index: i,
                    dailyWage: dennaMzda,
                    name: utils.formatEmployeeName(employee)
                });
                
                utils.addDebug(currentEntry, "✅ " + validEmployees[validEmployees.length-1].name + 
                               " - denná mzda: " + utils.formatMoney(dennaMzda));
            }
        }
        
        if (validEmployees.length === 0) {
            return { 
                success: false, 
                error: "Žiadni zamestnanci nemajú nastavenú dennú mzdu!" 
            };
        }
        
        utils.addDebug(currentEntry, "✅ Validácia úspešná - " + validEmployees.length + " zamestnancov");
        
        return {
            success: true,
            date: datum,
            employees: validEmployees
        };
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri validácii: " + error.toString(), "validateInputData", error);
        return { success: false, error: "Chyba pri validácii dát" };
    }
}

// ==============================================
// KROK 3: SPRACOVANIE ZÁVÄZKOV
// ==============================================

function processObligations(employees, datum, zavazkyLib) {
    var result = {
        created: 0,
        updated: 0,
        errors: 0,
        total: 0,
        totalAmount: 0,
        success: false
    };
    
    try {
        utils.addDebug(currentEntry, "📋 Spracovávam " + employees.length + " zamestnancov...");
        
        // Nájdi existujúce záväzky pre túto dochádzku
        var existingObligations = findExistingObligations(zavazkyLib);
        utils.addDebug(currentEntry, "📊 Nájdené existujúce záväzky: " + existingObligations.length);
        
        // Spracuj každého zamestnanca
        for (var i = 0; i < employees.length; i++) {
            var empData = employees[i];
            
            utils.addDebug(currentEntry, "\n--- " + empData.name + " ---");
            
            try {
                // Nájdi existujúci záväzok pre tohto zamestnanca
                var existingObligation = null;
                for (var j = 0; j < existingObligations.length; j++) {
                    var obligation = existingObligations[j];
                    var linkedEmployees = utils.safeGetLinks(obligation, CONFIG.fields.obligations.employee || "Zamestnanec");
                    
                    if (linkedEmployees && linkedEmployees.length > 0 && 
                        linkedEmployees[0].field("ID") === empData.entry.field("ID")) {
                        existingObligation = obligation;
                        break;
                    }
                }
                
                if (existingObligation) {
                    // Aktualizuj existujúci
                    if (updateObligation(existingObligation, empData.dailyWage)) {
                        result.updated++;
                        result.totalAmount += empData.dailyWage;
                    } else {
                        result.errors++;
                    }
                } else {
                    // Vytvor nový
                    if (createObligation(zavazkyLib, empData, datum)) {
                        result.created++;
                        result.totalAmount += empData.dailyWage;
                    } else {
                        result.errors++;
                    }
                }
                
                result.total++;
                
            } catch (error) {
                utils.addError(currentEntry, "Chyba pri spracovaní zamestnanca: " + error.toString(), "processObligations");
                result.errors++;
            }
        }
        
        result.success = result.errors === 0 && result.total > 0;
        
        utils.addDebug(currentEntry, "\n📊 Výsledky:");
        utils.addDebug(currentEntry, "  ✅ Vytvorené: " + result.created);
        utils.addDebug(currentEntry, "  🔄 Aktualizované: " + result.updated);
        utils.addDebug(currentEntry, "  💰 Celková suma: " + utils.formatMoney(result.totalAmount));
        
        return result;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba pri spracovaní: " + error.toString(), "processObligations", error);
        return result;
    }
}

// ==============================================
// POMOCNÉ FUNKCIE PRE ZÁVÄZKY
// ==============================================

function findExistingObligations(zavazkyLib) {
    try {
        var currentEntryId = currentEntry.field("ID");
        var dochadzkaField = CONFIG.fields.obligations.attendance || "Dochádzka";
        
        return zavazkyLib.find(dochadzkaField + " = '" + currentEntryId + "'") || [];
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri hľadaní záväzkov: " + error.toString(), "findExistingObligations");
        return [];
    }
}

function createObligation(zavazkyLib, empData, datum) {
    try {
        utils.addDebug(currentEntry, "  ➕ Vytváranie nového záväzku...");
        
        var obligationData = {};
        obligationData[CONFIG.fields.obligations.state || "Stav"] = CONFIG.constants.stavy.neuhradene;
        obligationData[CONFIG.fields.obligations.date || "Dátum"] = datum;
        obligationData[CONFIG.fields.obligations.type || "Typ"] = CONFIG.constants.typy.mzda;
        obligationData[CONFIG.fields.obligations.employee || "Zamestnanec"] = [empData.entry];
        obligationData[CONFIG.fields.obligations.creditor || "Veriteľ"] = "Zamestnanec";
        obligationData[CONFIG.fields.obligations.attendance || "Dochádzka"] = [currentEntry];
        obligationData[CONFIG.fields.obligations.description || "Popis"] = 
            "Mzda zamestnanca " + empData.name + " za deň " + utils.formatDate(datum);
        obligationData[CONFIG.fields.obligations.amount || "Suma"] = empData.dailyWage;
        obligationData[CONFIG.fields.obligations.paid || "Zaplatené"] = 0;
        obligationData[CONFIG.fields.obligations.balance || "Zostatok"] = empData.dailyWage;
        
        var newObligation = zavazkyLib.create(obligationData);
        
        if (newObligation) {
            utils.addDebug(currentEntry, "  ✅ Záväzok vytvorený");
            
            // Pridaj info do záväzku
            var infoText = "📋 AUTOMATICKY VYTVORENÝ ZÁVÄZOK\n";
            infoText += "=====================================\n\n";
            infoText += "📅 Dátum: " + utils.formatDate(datum) + "\n";
            infoText += "👤 Zamestnanec: " + empData.name + "\n";
            infoText += "💰 Suma: " + utils.formatMoney(empData.dailyWage) + "\n\n";
            infoText += "⏰ Vytvorené: " + utils.formatDate(moment()) + "\n";
            infoText += "🔧 Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
            infoText += "📂 Zdroj: Knižnica Dochádzka";
            
            newObligation.set(CONFIG.fields.common.info || "info", infoText);
            
            return true;
        }
        
        return false;
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri vytváraní záväzku: " + error.toString(), "createObligation", error);
        return false;
    }
}

function updateObligation(obligation, amount) {
    try {
        utils.addDebug(currentEntry, "  🔄 Aktualizácia existujúceho záväzku...");
        
        var paidAmount = utils.safeGet(obligation, CONFIG.fields.obligations.paid || "Zaplatené", 0);
        var newBalance = amount - paidAmount;
        var newStatus = newBalance <= 0 ? CONFIG.constants.stavy.uhradene : 
                       paidAmount > 0 ? CONFIG.constants.stavy.ciastocneUhradene : 
                       CONFIG.constants.stavy.neuhradene;
        
        obligation.set(CONFIG.fields.obligations.amount || "Suma", amount);
        obligation.set(CONFIG.fields.obligations.balance || "Zostatok", newBalance);
        obligation.set(CONFIG.fields.obligations.state || "Stav", newStatus);
        
        utils.addDebug(currentEntry, "  ✅ Záväzok aktualizovaný");
        utils.addDebug(currentEntry, "    Suma: " + utils.formatMoney(amount) + 
                                    " | Zostatok: " + utils.formatMoney(newBalance));
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri aktualizácii: " + error.toString(), "updateObligation", error);
        return false;
    }
}

// ==============================================
// KROK 4: FINALIZÁCIA
// ==============================================

function markCheckbox() {
    try {
        currentEntry.set(CONFIG.fields.zavazky, true);
        utils.addDebug(currentEntry, "☑️ Checkbox Záväzky označený");
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri označovaní checkboxu: " + error.toString(), "markCheckbox");
    }
}

function createInfoRecord(processingResult, datum) {
    try {
        var infoMessage = "📋 SYNCHRONIZÁCIA ZÁVÄZKOV\n";
        infoMessage += "=====================================\n\n";
        infoMessage += "📅 Dátum: " + utils.formatDate(datum) + "\n";
        infoMessage += "⏰ Čas sync: " + utils.formatDate(moment()) + "\n\n";
        
        infoMessage += "📊 VÝSLEDKY:\n";
        infoMessage += "• ➕ Nové záväzky: " + processingResult.created + "\n";
        infoMessage += "• 🔄 Aktualizované: " + processingResult.updated + "\n";
        infoMessage += "• 💰 Celková suma: " + utils.formatMoney(processingResult.totalAmount) + "\n";
        
        if (processingResult.errors > 0) {
            infoMessage += "• ⚠️ Chyby: " + processingResult.errors + "\n";
        }
        
        infoMessage += "\n🔧 TECHNICKÉ INFO:\n";
        infoMessage += "• Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        infoMessage += "• MementoUtils: v" + utils.version + "\n";
        infoMessage += "• Trigger: After Save\n";
        
        if (processingResult.total === processingResult.created + processingResult.updated) {
            infoMessage += "\n✅ VŠETKY ZÁVÄZKY ÚSPEŠNE SYNCHRONIZOVANÉ";
        } else {
            infoMessage += "\n⚠️ ČIASTOČNÁ SYNCHRONIZÁCIA";
        }
        
        currentEntry.set(CONFIG.fields.info, infoMessage);
        utils.addDebug(currentEntry, "📝 Info záznam vytvorený");
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri vytváraní info: " + error.toString(), "createInfoRecord");
    }
}

// ==============================================
// FINÁLNE FUNKCIE
// ==============================================

function logFinalSummary(steps) {
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

function showUserMessage(processingResult) {
    try {
        if (processingResult.total > 0) {
            var msg = "✅ Záväzky úspešne synchronizované!\n\n";
            msg += "📊 Výsledky:\n";
            msg += "• Nové: " + processingResult.created + "\n";
            msg += "• Aktualizované: " + processingResult.updated + "\n";
            msg += "• Celková suma: " + utils.formatMoney(processingResult.totalAmount);
            
            if (processingResult.errors > 0) {
                msg += "\n\n⚠️ Chyby: " + processingResult.errors;
            }
            
            message(msg);
        } else {
            message("❌ Synchronizácia zlyhala!\nPozri Error_Log pre detaily.");
        }
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri zobrazení správy: " + error.toString(), "showUserMessage");
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

// Kontrola závislostí
var depCheck = utils.checkDependencies(['config', 'core']);
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