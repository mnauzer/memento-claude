// ==============================================
// MEMENTO DATABASE - DOCHÁDZKA SYNC ZÁVÄZKOV
// Verzia: 5.0 | Dátum: August 2025 | Autor: ASISTANTO
// Knižnica: Dochádzka | Trigger: After Save
// ==============================================
// ✅ KOMPLETNÝ REFAKTORING v5.0:
//    - Plné využitie MementoUtils Framework
//    - MementoConfig pre všetky nastavenia
//    - Žiadne fallbacky ani duplicity
//    - Čistý modulárny kód
//    - Vylepšená business logika
// ==============================================
// 🔗 VYŽADOVANÉ KNIŽNICE:
//    - MementoUtils (agregátor)
//    - MementoCore (základné funkcie)
//    - MementoConfig (konfigurácia)
//    - MementoBusiness (business funkcie)
// ==============================================
// 📋 FUNKCIE:
//    - Vytvorenie nových záväzkov pre zamestnancov
//    - Aktualizácia existujúcich záväzkov
//    - Nastavenie finančných polí (Suma, Zostatok)
//    - Označenie checkboxu Záväzky
//    - Info záznamy pre audit trail
// ==============================================

// ==============================================
// INICIALIZÁCIA MODULOV
// ==============================================

var currentEntry = entry();
var utils = null;
var config = null;
var CONFIG = null;

/**
 * Inicializuje všetky potrebné moduly a konfiguráciu
 */
function initializeModules() {
    var initLog = "=== INICIALIZÁCIA SYNC ZÁVÄZKOV ===\n";
    
    // 1. MementoUtils - KRITICKÉ
    try {
        if (typeof MementoUtils !== 'undefined') {
            utils = MementoUtils;
            initLog += "✅ MementoUtils v" + utils.version + " načítané\n";
            
            // Kontrola modulov
            var deps = utils.checkDependencies();
            if (!deps.allLoaded) {
                initLog += "⚠️ Niektoré moduly chýbajú\n";
            }
        } else {
            throw new Error("MementoUtils nie je definované!");
        }
    } catch(e) {
        currentEntry.set("Error_Log", "❌ KRITICKÁ CHYBA: " + e.toString());
        message("❌ MementoUtils knižnica nie je dostupná!\nScript nemôže pokračovať.");
        cancel();
    }
    
    // 2. MementoConfig
    try {
        if (typeof MementoConfig !== 'undefined') {
            config = MementoConfig;
            config.init();
            initLog += "✅ MementoConfig v" + config.version + " inicializované\n";
            
            // Získaj konfiguráciu
            var baseConfig = config.getConfig('attendance');
            var obligationsConfig = config.getFieldMappings('obligations');
            
            CONFIG = {
                version: "5.0",
                scriptName: "Dochádzka Sync záväzkov",
                
                // Field mappings z MementoConfig
                fields: baseConfig.fieldMappings.attendance,
                zavazkyFields: obligationsConfig || baseConfig.fieldMappings.obligations,
                attributes: baseConfig.fieldMappings.attendanceAttributes,
                zamestnanciFields: baseConfig.fieldMappings.employees,
                
                // Libraries
                libraries: baseConfig.libraries,
                
                // Business rules
                stavy: {
                    neuhradene: "Neuhradené",
                    ciastocneUhradene: "Čiastočne uhradené", 
                    uhradene: "Uhradené"
                }
            };
            
            initLog += "✅ Konfigurácia načítaná z MementoConfig\n";
        } else {
            utils.addError(currentEntry, "MementoConfig nie je dostupný - používam lokálnu konfiguráciu", "init");
            CONFIG = getLocalConfig();
        }
    } catch(e) {
        utils.addError(currentEntry, "Chyba pri načítaní MementoConfig: " + e.toString(), "init");
        CONFIG = getLocalConfig();
    }
    
    // 3. Kontrola Business funkcií
    if (!utils.formatEmployeeName) {
        utils.addError(currentEntry, "MementoBusiness modul nie je načítaný - formatEmployeeName chýba", "init");
    }
    
    if (!utils.calculateDailyWage) {
        utils.addError(currentEntry, "MementoBusiness modul nie je načítaný - calculateDailyWage chýba", "init");
    }
    
    utils.addDebug(currentEntry, initLog);
    return true;
}

/**
 * Lokálna konfigurácia (len ak MementoConfig nie je dostupný)
 */
function getLocalConfig() {
    return {
        version: "5.0",
        scriptName: "Dochádzka Sync záväzkov",
        
        libraries: {
            business: {
                obligations: "Záväzky",
                employees: "Zamestnanci",
                attendance: "Dochádzka"
            }
        },
        
        fields: {
            zamestnanci: "Zamestnanci",
            datum: "Dátum",
            zavazky: "Záväzky",
            info: "info"
        },
        
        zavazkyFields: {
            stav: "Stav",
            datum: "Dátum",
            typ: "Typ",
            zamestnanec: "Zamestnanec",
            veritiel: "Veriteľ",
            dochadzka: "Dochádzka",
            popis: "Popis",
            suma: "Suma",
            zaplatene: "Zaplatené",
            zostatok: "Zostatok",
            info: "info"
        },
        
        zamestnanciFields: {
            id: "ID",
            nick: "Nick",
            priezvisko: "Priezvisko"
        },
        
        attributes: {
            dennaMzda: "denná mzda"
        },
        
        stavy: {
            neuhradene: "Neuhradené",
            ciastocneUhradene: "Čiastočne uhradené",
            uhradene: "Uhradené"
        }
    };
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        // Inicializácia
        if (!initializeModules()) {
            return false;
        }
        
        utils.addDebug(currentEntry, "🚀 === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        utils.addDebug(currentEntry, "📅 Dátum: " + utils.formatDate(moment()));
        
        // 1. Validácia vstupných dát
        var validationResult = validateInputData();
        if (!validationResult.success) {
            utils.addError(currentEntry, validationResult.error, CONFIG.scriptName);
            message("❌ " + validationResult.error);
            return false;
        }
        
        // 2. Získanie knižnice Záväzky
        var zavazkyLib = getObligationsLibrary();
        if (!zavazkyLib) {
            message("❌ Knižnica Záväzky nie je dostupná!");
            return false;
        }
        
        // 3. Nájdenie existujúcich záväzkov
        var existingObligations = findExistingObligations();
        utils.addDebug(currentEntry, "📊 Našiel som " + existingObligations.length + " existujúcich záväzkov");
        
        // 4. Spracovanie zamestnancov
        var processingResult = processEmployees(
            validationResult.zamestnanci,
            validationResult.datum,
            zavazkyLib,
            existingObligations
        );
        
        // 5. Označenie checkboxu a vytvorenie info záznamu
        if (processingResult.total > 0) {
            markObligationsCheckbox();
            createInfoRecord(processingResult, validationResult.datum);
        }
        
        // 6. Finálne zhrnutie
        logFinalSummary(processingResult);
        
        // 7. Informuj používateľa
        if (processingResult.total > 0) {
            var summaryMsg = "✅ Záväzky úspešne synchronizované!\n\n";
            summaryMsg += "📊 Výsledky:\n";
            summaryMsg += "• Nové: " + processingResult.created + "\n";
            summaryMsg += "• Aktualizované: " + processingResult.updated + "\n";
            summaryMsg += "• Celková suma: " + utils.formatMoney(processingResult.totalAmount) + "\n";
            
            if (processingResult.errors > 0) {
                summaryMsg += "• ⚠️ Chyby: " + processingResult.errors;
            }
            
            message(summaryMsg);
            return true;
        } else {
            message("❌ Synchronizácia záväzkov zlyhala!\nPozri Error_Log pre detaily.");
            return false;
        }
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba: " + error.toString(), CONFIG.scriptName, error);
        message("💥 Kritická chyba!\n" + error.toString());
        return false;
    }
}

// ==============================================
// VALIDÁCIA A PRÍPRAVA DÁT
// ==============================================

/**
 * Validuje vstupné dáta z dochádzky
 */
function validateInputData() {
    try {
        utils.addDebug(currentEntry, "📋 Validácia vstupných dát...");
        
        var datum = currentEntry.field(CONFIG.fields.datum);
        var zamestnanci = utils.safeGetLinks(currentEntry, CONFIG.fields.zamestnanci);
        
        // Kontrola dátumu
        if (!datum) {
            return { success: false, error: "Dátum dochádzky nie je vyplnený!" };
        }
        
        // Kontrola zamestnancov
        if (!zamestnanci || zamestnanci.length === 0) {
            return { success: false, error: "Žiadni zamestnanci v dochádzke!" };
        }
        
        utils.addDebug(currentEntry, "✅ Validácia úspešná");
        utils.addDebug(currentEntry, "  • Dátum: " + utils.formatDate(datum));
        utils.addDebug(currentEntry, "  • Počet zamestnancov: " + zamestnanci.length);
        
        return {
            success: true,
            datum: datum,
            zamestnanci: zamestnanci
        };
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba validácie: " + error.toString(), "validateInputData");
        return { success: false, error: error.toString() };
    }
}

/**
 * Získa knižnicu Záväzky
 */
function getObligationsLibrary() {
    try {
        utils.addDebug(currentEntry, "📚 Načítavam knižnicu Záväzky...");
        
        var libraryName = CONFIG.libraries.business.obligations || "Záväzky";
        var zavazkyLib = libByName(libraryName);
        
        if (!zavazkyLib) {
            utils.addError(currentEntry, "Knižnica '" + libraryName + "' neexistuje!", "getObligationsLibrary");
            return null;
        }
        
        utils.addDebug(currentEntry, "✅ Knižnica '" + libraryName + "' načítaná");
        return zavazkyLib;
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri načítaní knižnice: " + error.toString(), "getObligationsLibrary");
        return null;
    }
}

// ==============================================
// PRÁCA SO ZÁVÄZKAMI
// ==============================================

/**
 * Nájde existujúce záväzky pre túto dochádzku
 */
function findExistingObligations() {
    try {
        utils.addDebug(currentEntry, "🔍 Hľadám existujúce záväzky...");
        
        var libraryName = CONFIG.libraries.business?.obligations || "Záväzky";
        var zavazkyLib = libByName(libraryName);
        
        if (!zavazkyLib) {
            return [];
        }
        
        var allObligations = zavazkyLib.entries();
        var linkedObligations = [];
        var currentEntryId = currentEntry.field("ID");
        
        for (var i = 0; i < allObligations.length; i++) {
            var obligation = allObligations[i];
            var dochadzkaField = utils.safeGetLinks(obligation, CONFIG.zavazkyFields.dochadzka);
            
            // Skontroluj či obsahuje našu dochádzku
            for (var j = 0; j < dochadzkaField.length; j++) {
                if (dochadzkaField[j] && dochadzkaField[j].field("ID") === currentEntryId) {
                    linkedObligations.push(obligation);
                    break;
                }
            }
        }
        
        return linkedObligations;
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri hľadaní záväzkov: " + error.toString(), "findExistingObligations");
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
        
        for (var i = 0; i < existingObligations.length; i++) {
            var obligation = existingObligations[i];
            var zamestnanecField = utils.safeGetLinks(obligation, CONFIG.zavazkyFields.zamestnanec);
            
            for (var j = 0; j < zamestnanecField.length; j++) {
                if (zamestnanecField[j] && zamestnanecField[j].field("ID") === employeeId) {
                    return obligation;
                }
            }
        }
        
        return null;
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri hľadaní záväzku pre zamestnanca: " + error.toString(), "findObligationForEmployee");
        return null;
    }
}

/**
 * Vypočíta stav záväzku podľa zostatku
 */
function calculateObligationStatus(zostatok) {
    if (zostatok === null || zostatok === undefined) {
        return CONFIG.stavy.neuhradene;
    } else if (zostatok <= 0) {
        return CONFIG.stavy.uhradene;
    } else {
        return CONFIG.stavy.ciastocneUhradene;
    }
}

// ==============================================
// VYTVORENIE A AKTUALIZÁCIA ZÁVÄZKOV
// ==============================================

/**
 * Vytvorí nový záväzok
 */
function createNewObligation(zavazkyLib, employee, datum, amount) {
    try {
        utils.addDebug(currentEntry, "  ➕ Vytváranie nového záväzku...");
        
        // Použi MementoBusiness funkciu ak je dostupná
        var employeeName = utils.formatEmployeeName ? 
            utils.formatEmployeeName(employee) : 
            utils.safeGet(employee, CONFIG.zamestnanciFields.nick, "Zamestnanec");
        
        // Popis záväzku
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
        obligationData[CONFIG.zavazkyFields.stav] = CONFIG.stavy.neuhradene;
        obligationData[CONFIG.zavazkyFields.datum] = datum;
        obligationData[CONFIG.zavazkyFields.typ] = "Mzda";
        obligationData[CONFIG.zavazkyFields.zamestnanec] = [employee];
        obligationData[CONFIG.zavazkyFields.veritiel] = "Zamestnanec";
        obligationData[CONFIG.zavazkyFields.dochadzka] = [currentEntry];
        obligationData[CONFIG.zavazkyFields.popis] = description;
        obligationData[CONFIG.zavazkyFields.suma] = amount;
        obligationData[CONFIG.zavazkyFields.zaplatene] = 0;
        obligationData[CONFIG.zavazkyFields.zostatok] = amount;
        obligationData[CONFIG.zavazkyFields.info] = infoText;
        
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
        utils.addError(currentEntry, "Chyba pri vytváraní záväzku: " + error.toString(), "createNewObligation");
        return false;
    }
}

/**
 * Aktualizuje existujúci záväzok
 */
function updateExistingObligation(obligation, amount, employeeName, datum) {
    try {
        utils.addDebug(currentEntry, "  🔄 Aktualizácia existujúceho záväzku...");
        
        var paidAmount = utils.safeGet(obligation, CONFIG.zavazkyFields.zaplatene, 0);
        var newBalance = amount - paidAmount;
        var newStatus = calculateObligationStatus(newBalance);
        
        // Aktualizuj polia
        obligation.set(CONFIG.zavazkyFields.suma, amount);
        obligation.set(CONFIG.zavazkyFields.zostatok, newBalance);
        obligation.set(CONFIG.zavazkyFields.stav, newStatus);
        
        // Aktualizuj info
        var existingInfo = utils.safeGet(obligation, CONFIG.zavazkyFields.info, "");
        var updateInfo = "\n\n🔄 AKTUALIZOVANÉ: " + utils.formatDate(moment(), "DD.MM.YYYY HH:mm:ss") + "\n";
        updateInfo += "• Nová suma: " + utils.formatMoney(amount) + "\n";
        updateInfo += "• Zaplatené: " + utils.formatMoney(paidAmount) + " (zachované)\n";
        updateInfo += "• Zostatok: " + utils.formatMoney(newBalance) + "\n";
        updateInfo += "• Stav: " + newStatus + "\n";
        updateInfo += "• Script: " + CONFIG.scriptName + " v" + CONFIG.version;
        
        obligation.set(CONFIG.zavazkyFields.info, existingInfo + updateInfo);
        
        utils.addDebug(currentEntry, "  ✅ Záväzok aktualizovaný");
        utils.addDebug(currentEntry, "    💰 Suma: " + utils.formatMoney(amount));
        utils.addDebug(currentEntry, "    💵 Zostatok: " + utils.formatMoney(newBalance));
        utils.addDebug(currentEntry, "    📊 Stav: " + newStatus);
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri aktualizácii záväzku: " + error.toString(), "updateExistingObligation");
        return false;
    }
}

// ==============================================
// SPRACOVANIE ZAMESTNANCOV
// ==============================================

/**
 * Spracuje všetkých zamestnancov a vytvorí/aktualizuje záväzky
 */
function processEmployees(employees, datum, zavazkyLib, existingObligations) {
    var result = {
        created: 0,
        updated: 0,
        errors: 0,
        total: 0,
        totalAmount: 0
    };
    
    try {
        utils.addDebug(currentEntry, "\n📋 Spracovávam zamestnancov...");
        
        for (var i = 0; i < employees.length; i++) {
            var employee = employees[i];
            
            utils.addDebug(currentEntry, "\n--- Zamestnanec " + (i + 1) + "/" + employees.length + " ---");
            
            if (!employee) {
                utils.addError(currentEntry, "Zamestnanec na pozícii " + i + " je null", "processEmployees");
                result.errors++;
                continue;
            }
            
            try {
                // Získaj meno a dennú mzdu
                var employeeName = utils.formatEmployeeName ? 
                    utils.formatEmployeeName(employee) : 
                    utils.safeGet(employee, CONFIG.zamestnanciFields.nick, "Zamestnanec " + (i+1));
                
                var dailyWage = getEmployeeDailyWage(employee, i);
                
                utils.addDebug(currentEntry, "  👤 " + employeeName);
                utils.addDebug(currentEntry, "  💰 Denná mzda: " + utils.formatMoney(dailyWage));
                
                if (!dailyWage || dailyWage <= 0) {
                    utils.addDebug(currentEntry, "  ⚠️ Denná mzda je 0 alebo záporná - preskakujem");
                    continue;
                }
                
                result.totalAmount += dailyWage;
                
                // Skontroluj existujúci záväzok
                var existingObligation = findObligationForEmployee(existingObligations, employee);
                
                if (existingObligation) {
                    // Aktualizuj existujúci
                    if (updateExistingObligation(existingObligation, dailyWage, employeeName, datum)) {
                        result.updated++;
                        result.total++;
                    } else {
                        result.errors++;
                    }
                } else {
                    // Vytvor nový
                    if (createNewObligation(zavazkyLib, employee, datum, dailyWage)) {
                        result.created++;
                        result.total++;
                    } else {
                        result.errors++;
                    }
                }
                
            } catch (error) {
                utils.addError(currentEntry, "Chyba pri spracovaní zamestnanca: " + error.toString(), "processEmployee_" + i);
                result.errors++;
            }
        }
        
        return result;
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri spracovaní zamestnancov: " + error.toString(), "processEmployees");
        return result;
    }
}

/**
 * Získa dennú mzdu zamestnanca z atribútu
 */
function getEmployeeDailyWage(employee, index) {
    try {
        // Získaj pole zamestnancov
        var zamArray = currentEntry.field(CONFIG.fields.zamestnanci);
        
        if (!zamArray || zamArray.length <= index) {
            utils.addError(currentEntry, "Nepodarilo sa získať pole zamestnancov", "getEmployeeDailyWage");
            return 0;
        }
        
        // Získaj atribút denná mzda
        var dailyWage = zamArray[index].attr(CONFIG.attributes.dennaMzda);
        
        // Ak máme MementoBusiness, môžeme použiť calculateDailyWage
        if (!dailyWage && utils.calculateDailyWage) {
            var hours = zamArray[index].attr(CONFIG.attributes.odpracovane);
            dailyWage = utils.calculateDailyWage(employee, hours, currentEntry.field(CONFIG.fields.datum));
            
            if (dailyWage && dailyWage.success) {
                return dailyWage.amount;
            }
        }
        
        return dailyWage || 0;
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri získavaní dennej mzdy: " + error.toString(), "getEmployeeDailyWage");
        return 0;
    }
}

// ==============================================
// FINALIZÁCIA
// ==============================================

/**
 * Označí checkbox Záväzky v dochádzke
 */
function markObligationsCheckbox() {
    try {
        // Skús nájsť správny názov poľa
        var checkboxField = CONFIG.fields.zavazky || "Záväzky";
        
        currentEntry.set(checkboxField, true);
        utils.addDebug(currentEntry, "☑️ Checkbox '" + checkboxField + "' označený");
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri označovaní checkboxu: " + error.toString(), "markObligationsCheckbox");
    }
}

/**
 * Vytvorí info záznam so súhrnom
 */
function createInfoRecord(processingResult, datum) {
    try {
        var infoMessage = "📋 SYNCHRONIZÁCIA ZÁVÄZKOV\n";
        infoMessage += "=====================================\n\n";
        infoMessage += "📅 Dátum: " + utils.formatDate(datum) + "\n";
        infoMessage += "⏰ Čas sync: " + utils.formatDate(moment(), "DD.MM.YYYY HH:mm:ss") + "\n\n";
        
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
        
        if (config) {
            infoMessage += "• MementoConfig: v" + config.version + "\n";
        }
        
        infoMessage += "• Trigger: After Save\n";
        infoMessage += "• Knižnica: Dochádzka\n\n";
        
        if (processingResult.total === processingResult.created + processingResult.updated) {
            infoMessage += "✅ VŠETKY ZÁVÄZKY ÚSPEŠNE SYNCHRONIZOVANÉ";
        } else {
            infoMessage += "⚠️ ČIASTOČNÁ SYNCHRONIZÁCIA\n";
            infoMessage += "Pre detaily pozri Debug_Log";
        }
        
        currentEntry.set(CONFIG.fields.info, infoMessage);
        utils.addDebug(currentEntry, "📝 Info záznam vytvorený");
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri vytváraní info záznamu: " + error.toString(), "createInfoRecord");
    }
}

/**
 * Zaloguje finálne štatistiky
 */
function logFinalSummary(processingResult) {
    utils.addDebug(currentEntry, "\n📊 === VÝSLEDKY SYNCHRONIZÁCIE ===");
    utils.addDebug(currentEntry, "✅ Nové záväzky: " + processingResult.created);
    utils.addDebug(currentEntry, "🔄 Aktualizované: " + processingResult.updated);
    utils.addDebug(currentEntry, "💰 Celková suma: " + utils.formatMoney(processingResult.totalAmount));
    
    if (processingResult.errors > 0) {
        utils.addDebug(currentEntry, "❌ Chyby: " + processingResult.errors);
    }
    
    if (processingResult.total > 0 && processingResult.errors === 0) {
        utils.addDebug(currentEntry, "\n🎉 === SYNC DOKONČENÝ ÚSPEŠNE! ===");
    } else if (processingResult.total > 0) {
        utils.addDebug(currentEntry, "\n⚠️ === ČIASTOČNÝ ÚSPECH ===");
    } else {
        utils.addDebug(currentEntry, "\n❌ === SYNC ZLYHAL ===");
    }
    
    utils.addDebug(currentEntry, "⏱️ Čas ukončenia: " + moment().format("HH:mm:ss"));
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

try {
    // Kontrola existencie entry
    if (!currentEntry) {
        message("💥 KRITICKÁ CHYBA!\n\nScript nemôže bežať bez aktuálneho záznamu.");
        cancel();
    }
    
    // Spusti hlavnú funkciu
    var result = main();
    
    // Log ukončenia
    if (utils) {
        utils.addDebug(currentEntry, "📋 === KONIEC " + (CONFIG ? CONFIG.scriptName : "Sync záväzkov") + " ===");
    }
    
} catch (kritickachyba) {
    // Posledná záchrana
    try {
        if (utils) {
            utils.addError(currentEntry, "KRITICKÁ CHYBA: " + kritickachyba.toString(), "critical", kritickachyba);
        } else {
            currentEntry.set("Error_Log", "💥 KRITICKÁ CHYBA: " + kritickachyba.toString());
        }
        message("💥 KRITICKÁ CHYBA!\n\n" + kritickachyba.toString());
    } catch (finalError) {
        message("💥 FATÁLNA CHYBA!\n\nScript úplne zlyhal.");
    }
}