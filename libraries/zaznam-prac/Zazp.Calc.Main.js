// ==============================================
// MEMENTO DATABASE - ZÁZNAM PRÁC PREPOČET
// Verzia: 8.3.2 | Dátum: október 2025 | Autor: ASISTANTO
// Knižnica: Záznam práce | Trigger: Before Save
// ==============================================
// ✅ REFAKTOROVANÉ v8.3:
//    - Pridaná integrácia s knižnicou Denný report
//    - Automatické vytvorenie/aktualizácia záznamu pre deň
//    - Používa createOrUpdateDailyReport z MementoBusiness
// ✅ REFAKTOROVANÉ v8.2:
//    - Použitie univerzálnej validateInputData z MementoCore
//    - Použitie univerzálnej processEmployees z MementoBusiness
//    - Použitie univerzálnej calculateWorkTime z MementoBusiness
//    - Configuration-driven validácia (requiredFields z config)
//    - Odstránené duplicitné funkcie
// ✅ REFAKTOROVANÉ v8.1:
//    - Opravené chyby s undefined CONFIG
//    - Použitie funkcií z MementoUtils/MementoBusiness
//    - Pridané info_telegram pole
//    - Zachovaná kompletná funkcionalita
// ==============================================

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var config = utils.getConfig();
var centralConfig = utils.config;
var currentEntry = entry();

var CONFIG = {
    scriptName: "Záznam prác Prepočet",
    version: "8.3.2",  // Opravený pracovný čas, pridané stroje a materiály do info záznamu

    // Referencie na centrálny config
    fields: {
        workReport: centralConfig.fields.workReport,
        workRecord: centralConfig.fields.workRecord,
        common: centralConfig.fields.common,
        employee: centralConfig.fields.employee,
        workPrices: centralConfig.fields.workPrices,
        machine: centralConfig.fields.machine
    },
    attributes:{
        workRecordHzs: centralConfig.attributes.workRecordHzs,
        workRecordEmployees: centralConfig.attributes.workRecordEmployees,
        workRecordMachines: centralConfig.attributes.workRecordMachines,
        workReport: centralConfig.attributes.workReport
    },
    libraries: centralConfig.libraries,
    icons: centralConfig.icons,

    // Lokálne nastavenia
    settings: {
        roundToQuarterHour: true,
        defaultCurrency: "€"
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, utils.getIcon("start") + " === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        utils.addDebug(currentEntry, "Čas spustenia: " + utils.formatDate(moment()));
        utils.clearLogs(currentEntry, true);
        // Kroky prepočtu
        var steps = {
            step1: { success: false, name: "Načítanie a validácia dát" },
            step2: { success: false, name: "Výpočet pracovnej doby" },
            step3: { success: false, name: "Spracovanie zamestnancov" },
            step4: { success: false, name: "Spracovanie HZS" },
            step5: { success: false, name: "Spracovanie strojov" },
            step6: { success: false, name: "Celkové výpočty" },
            step7: { success: false, name: "Synchronizácia výkazu prác" },
            step8: { success: false, name: "Vytvorenie info záznamov" },
            step9: { success: false, name: "Spracovanie Denný report" }
        };

        // Krok 1: Validácia vstupných dát
        utils.addDebug(currentEntry, utils.getIcon("validation") + " KROK 1: Validácia vstupných dát");
        var validationResult = validateInputData();
        if (!validationResult.success) {
            utils.addError(currentEntry, validationResult.error, "main");
            message("❌ " + validationResult.error);
            return false;
        }
        steps.step1.success = true;

        // Krok 2: Výpočet pracovnej doby
        utils.addDebug(currentEntry, utils.getIcon("calculation") + " KROK 2: Výpočet pracovnej doby");
        var workTimeResult = calculateWorkTime(validationResult.startTime, validationResult.endTime);
        if (!workTimeResult.success) {
            utils.addError(currentEntry, "Výpočet času zlyhal: " + workTimeResult.error, "main");
            return false;
        }
        steps.step2.success = true;

        // Krok 3: Spracovanie zamestnancov
        utils.addDebug(currentEntry, utils.getIcon("group") + " KROK 3: Spracovanie zamestnancov");
        var employeeResult = processEmployees(validationResult.employees, workTimeResult.pracovnaDobaHodiny, validationResult.date);
        steps.step3.success = employeeResult.success;

        // Krok 4: Spracovanie HZS
        utils.addDebug(currentEntry, utils.getIcon("money") + " KROK 4: Spracovanie HZS");
        var hzsResult = processHZS(employeeResult.odpracovaneTotal);
        steps.step4.success = hzsResult.success;

        // Krok 5: Spracovanie Strojov
        utils.addDebug(currentEntry, utils.getIcon("money") + " KROK 5: Spracovanie strojov");
        var machinesResult = processMachines();
        steps.step5.success = machinesResult.success;


         // KROK 6: Celkové výpočty
        utils.addDebug(currentEntry, " KROK 6: Celkové výpočty", "calculation");
        if (employeeResult.success && hzsResult.success) {
            steps.step6.success = calculateTotals(employeeResult, hzsResult, machinesResult);
        }
        // Krok 7: Vytvorenie/aktualizácia výkazu prác
        utils.addDebug(currentEntry, utils.getIcon("update") + " KROK 7: Vytvorenie/aktualizácia výkazu prác (nová architektúra)");
        if (validationResult.hasCustomer) {
            steps.step7.success = createOrUpdateWorkReport(employeeResult, hzsResult, machinesResult, validationResult);
        } else {
            utils.addDebug(currentEntry, "  ℹ️ Žiadna zákazka - preskakujem výkaz prác");
            steps.step7.success = true; // Nie je chyba ak nie je zákazka
        }

        // Krok 7.1: Vytvorenie/aktualizácia výkazu strojov (ak sú použité stroje)
        if (machinesResult && machinesResult.success && machinesResult.count > 0 && validationResult.hasCustomer) {
            utils.addDebug(currentEntry, utils.getIcon("heavy_machine") + " KROK 7.1: Vytvorenie/aktualizácia výkazu strojov");
            var machinesReportResult = createOrUpdateMachinesReport(machinesResult, validationResult);
            if (machinesReportResult) {
                utils.addDebug(currentEntry, "  ✅ Výkaz strojov spracovaný úspešne");
            } else {
                utils.addDebug(currentEntry, "  ⚠️ Chyba pri spracovaní výkazu strojov");
            }
        }
        
        // Krok 8: Vytvorenie info záznamov
        utils.addDebug(currentEntry, utils.getIcon("note") + " KROK 8: Vytvorenie info záznamov");
        steps.step8.success = createInfoRecord(workTimeResult, employeeResult, hzsResult, machinesResult);

        // Krok 9: Vytvorenie/aktualizácia Denný report
        utils.addDebug(currentEntry, utils.getIcon("note") + " KROK 9: Spracovanie Denný report");
        var dailyReportResult = utils.createOrUpdateDailyReport(currentEntry, 'workRecord', {
            debugEntry: currentEntry,
            createBackLink: false  // Zatiaľ bez spätného linku
        });
        steps.step9.success = dailyReportResult.success;

        if (dailyReportResult.success) {
            var action = dailyReportResult.created ? "vytvorený" : "aktualizovaný";
            utils.addDebug(currentEntry, "✅ Denný report " + action + " úspešne");
        } else {
            utils.addDebug(currentEntry, "⚠️ Chyba pri spracovaní Denný report: " + (dailyReportResult.error || "Neznáma chyba"));
        }

        utils.addDebug(currentEntry, utils.getIcon("success") + " === PREPOČET DOKONČENÝ ===");

        // Zobraz súhrn
        logFinalSummary(steps, employeeResult, hzsResult);
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        message("❌ Kritická chyba!\n\n" + error.toString());
        return false;
    }
}

// ==============================================
// VALIDÁCIA
// ==============================================

function validateInputData() {
    try {
        // Použiť univerzálnu validáciu z MementoCore
        var options = {
            config: CONFIG,
            customMessages: {
                date: "Dátum nie je vyplnený",
                order: "Zákazka nie je vyplnená",
                employees: "Žiadni zamestnanci v zázname",
                startTime: "Začiatok práce nie je vyplnený",
                endTime: "Koniec práce nie je vyplnený"
            }
        };

        var result = utils.validateInputData(currentEntry, "workRecord", options);

        if (!result.success) {
            return result;
        }

        // Pridaj doplňujúce voliteľné polia
        var employees = utils.safeGetLinks(currentEntry, CONFIG.fields.workRecord.employees);
        var customer = utils.safeGetLinks(currentEntry, CONFIG.fields.workRecord.order);

        // Pridaj doplňujúce debug informácie
        utils.addDebug(currentEntry, "  • Dátum: " + utils.formatDate(result.data.date));
        utils.addDebug(currentEntry, "  • Čas: " + utils.formatTime(result.data.startTime) + " - " + utils.formatTime(result.data.endTime));
        utils.addDebug(currentEntry, "  • Zamestnancov: " + (employees ? employees.length : 0));
        utils.addDebug(currentEntry, "  • Zákazka: " + (customer && customer.length > 0 ? "ÁNO" : "NIE"));

        // Rozšíri result o voliteľné polia
        return {
            success: true,
            data: {
                date: result.data.date,
                startTime: result.data.startTime,
                endTime: result.data.endTime,
                order: result.data.order,
                employees: result.data.employees
            },
            // Backward compatibility
            date: result.data.date,
            startTime: result.data.startTime,
            endTime: result.data.endTime,
            employees: employees,
            customer: customer,
            hasCustomer: customer && customer.length > 0
        };

    } catch (error) {
        utils.addError(currentEntry, error.toString(), "validateInputData", error);
        return { success: false, error: error.toString() };
    }
}

// ==============================================
// VÝPOČET PRACOVNEJ DOBY
function calculateWorkTime(startTime, endTime) {
    // Priprav options pre univerzálnu funkciu z business modulu
    var options = {
        entry: currentEntry,
        config: CONFIG,
        roundToQuarter: CONFIG.settings.roundToQuarterHour,
        startFieldName: CONFIG.fields.workRecord.startTime,
        endFieldName: CONFIG.fields.workRecord.endTime,
        workTimeFieldName: CONFIG.fields.workRecord.workTime,
        debugLabel: "Pracovná doba na zákazke"
    };

    // Volaj univerzálnu funkciu z business modulu cez utils
    return utils.calculateWorkTime(startTime, endTime, options);
}

function processEmployees(zamestnanci, pracovnaDobaHodiny, datum) {
    // Použiť univerzálnu funkciu z MementoBusiness cez utils
    var options = {
        entry: currentEntry,
        config: CONFIG,
        employeeFieldName: CONFIG.fields.workRecord.employees,
        attributes: CONFIG.attributes.workRecordEmployees,
        includeExtras: false,  // Záznam prác nepoužíva bonusy/prémie/pokuty
        processObligations: false,  // Záznam prác nevytvára záväzky
        libraryType: 'workRecord'
    };

    return utils.processEmployees(zamestnanci, pracovnaDobaHodiny, datum, options);
}

function calculateTotals(employeeResult, hzsResult, machinesResult) {
    try {
        // Ulož celkové hodnoty
        utils.safeSet(currentEntry, CONFIG.fields.workRecord.employeeCount, employeeResult.pocetPracovnikov);
        utils.safeSet(currentEntry, CONFIG.fields.workRecord.workedHours, employeeResult.odpracovaneTotal);
        utils.safeSet(currentEntry, CONFIG.fields.workRecord.wageCosts, employeeResult.celkoveMzdy);
        utils.safeSet(currentEntry, CONFIG.fields.workRecord.hzsSum, hzsResult.sum);

        // Ulož sumu strojov ak existuje
        if (machinesResult && machinesResult.total) {
            utils.safeSet(currentEntry, CONFIG.fields.workRecord.machinesSum, machinesResult.total);
            utils.addDebug(currentEntry, "  • Suma strojov: " + utils.formatMoney(machinesResult.total));
        }

        utils.addDebug(currentEntry, "  • Počet zamestnancov: " + employeeResult.pocetPracovnikov);
        utils.addDebug(currentEntry, "  • Pracovná doba: " + employeeResult.pracovnaDoba + " hodín");
        utils.addDebug(currentEntry, "  • Odpracované spolu: " + employeeResult.odpracovaneTotal + " hodín");
        utils.addDebug(currentEntry, "  • Mzdové náklady: " + utils.formatMoney(employeeResult.celkoveMzdy));
        utils.addDebug(currentEntry, "  • HZS Sadzba: " + utils.formatMoney(hzsResult.price));
        utils.addDebug(currentEntry, "  • Suma HZS: " + utils.formatMoney(hzsResult.sum));

        utils.addDebug(currentEntry, " Celkové výpočty úspešné", "success");

        return true;

    } catch (error) {
        utils.addError(currentEntry, error.toString(), "calculateTotals", error);
        return false;
    }
}

// ==============================================
// SPRACOVANIE HZS
// ==============================================

function processHZS(workedHours) {
    try {
        var hzsField = utils.safeGetLinks(currentEntry, CONFIG.fields.workRecord.hzs);
        
        // Ak nie je HZS, skús default
        if (!hzsField || hzsField.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ HZS nie je nastavené, hľadám default...");
            
            var defaultHZS = getDefaultHZS();
            if (defaultHZS) {
                utils.safeSet(currentEntry, CONFIG.fields.workRecord.hzs, defaultHZS);
                hzsField = utils.safeGet(currentEntry, CONFIG.fields.workRecord.hzs);
            }
        }
        
        // Získaj cenu z HZS
        var hzsPrice = 0;
        if (hzsField && hzsField.length > 0) {
            var hzsRecord = hzsField[0]; // Prvý HZS záznam
            var currentDate = utils.safeGet(currentEntry, CONFIG.fields.workRecord.date);
            
            // Získaj platnú cenu z histórie
            hzsPrice = utils.findValidWorkPrice(hzsRecord, currentDate);
            
            // Nastav cenu ako atribút na HZS poli
            var hasHzsPrice = hzsRecord.attr(CONFIG.attributes.workRecordHzs.price); 
            if (!hasHzsPrice) {
                hzsRecord.setAttr(CONFIG.attributes.workRecordHzs.price, hzsPrice);
                utils.addDebug(currentEntry, "  ✅ Nastavený atribút ceny HZS: " + hzsPrice + " €");
            } else {
                utils.addDebug(currentEntry, "  ✅ Atribút ceny hzs už nastavený: " + hasHzsPrice + " €");
                utils.addDebug(currentEntry, "  • ak je potrebné prepočítať túto cenu, vymaž hodnotu a ulož záznam...");
            }
        }
        
        // Vypočítaj sumu
        var hzsSum = Math.round(workedHours * hzsPrice * 100) / 100;
        utils.safeSet(currentEntry, CONFIG.fields.workRecord.hzsSum, hzsSum);
        
        utils.addDebug(currentEntry, "  " + utils.getIcon("money") + " HZS: " + workedHours + "h × " + hzsPrice + "€ = " + hzsSum + "€");
        
        return {
            success: true,
            price: hzsPrice,
            sum: hzsSum
        };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "processHZS", error);
        return { success: false, price: 0, sum: 0 };
    }
}
function getValidHZSPrice(hzsRecord, targetDate) {
    try {
        if (!hzsRecord || !targetDate) {
            utils.addDebug(currentEntry, "  ⚠️ HZS záznam alebo dátum chýba");
            return 0;
        }
        
        // Získaj historické ceny cez linksFrom
        var priceHistory = hzsRecord.linksFrom(CONFIG.libraries.workPrices,CONFIG.fields.workPrices.work); // Upraviť názov poľa podľa skutočnosti
        
        if (!priceHistory || priceHistory.length === 0) {
            utils.addDebug(currentEntry, "  ⚠️ Žiadne historické ceny pre HZS");
            return 0;
        }
        
        utils.addDebug(currentEntry, "  🔍 Nájdených " + priceHistory.length + " historických cien");
        
        // Zoraď záznamy podľa dátumu platnosti (vzostupne)
        priceHistory.sort(function(a, b) {
            var dateA = utils.safeGet(a, CONFIG.fields.workPrices.validFrom);
            var dateB = utils.safeGet(b, CONFIG.fields.workPrices.validFrom);
            
            if (!dateA && !dateB) return 0;
            if (!dateA) return -1;
            if (!dateB) return 1;
            
            return moment(dateA).diff(moment(dateB));
        });
        
        // Nájdi platnú cenu - posledný záznam s dátumom <= targetDate
        var validPrice = 0;
        var validFrom = null;
        
        for (var i = 0; i < priceHistory.length; i++) {
            var priceRecord = priceHistory[i];
            var recordValidFrom = utils.safeGet(priceRecord, CONFIG.fields.workPrices.validFrom);
            var price = utils.safeGet(priceRecord, "Cena", 0);
            
            // Ak je dátum platnosti <= ako náš target dátum
            if (recordValidFrom && moment(recordValidFrom).isSameOrBefore(targetDate)) {
                validPrice = price;
                validFrom = recordValidFrom;
                
                utils.addDebug(currentEntry, "  • Kandidát na platnú cenu: " + price + " € (od " + 
                             utils.formatDate(recordValidFrom) + ")");
            } else {
                // Ak sme našli záznam s dátumom > targetDate, môžeme skončiť
                break;
            }
        }
        
        if (validPrice > 0) {
            utils.addDebug(currentEntry, "  ✅ Finálna platná cena: " + validPrice + " € (platná od " + 
                         utils.formatDate(validFrom) + ")");
            return validPrice;
        } else {
            utils.addDebug(currentEntry, "  ❌ Nenašla sa platná cena k dátumu " + utils.formatDate(targetDate));
            return 0;
        }
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri získavaní ceny HZS: " + error.toString(), "getValidHZSPrice", error);
        return 0;
    }
}
function getDefaultHZS() {
    try {
        var defaultsLib = libByName(CONFIG.libraries.defaults);
        if (!defaultsLib) return null;
        utils.addDebug(currentEntry, "  🔍 Hľadám default HZS v knižnici: " + CONFIG.libraries.defaults);
        var defaults = defaultsLib.entries();
        if (defaults && defaults.length > 0) {
            utils.addDebug(currentEntry, "  🔍 Nájdených default záznamov: " + defaults.length);
            var defaultEntry = defaults[0];
            utils.addDebug(currentEntry, "  🔍 Nájdený default záznam: " + utils.safeGet(defaultEntry, "Účtovný rok", "N/A"));
            var defaultHZS = utils.safeGet(defaultEntry, "Default HZS"); // hardcode názov poľa
            utils.addDebug(currentEntry, "  🔍 Hľadám default HZS v zázname: " + utils.safeGet(defaultEntry, "Účtovný rok", "N/A"));
            utils.addDebug(currentEntry, "  🔍 Nájdených default HZS: " + (defaultHZS ? defaultHZS.length : 0));
            if (defaultHZS && defaultHZS.length > 0) {
                utils.addDebug(currentEntry, "  ✅ Default HZS nájdené: " + utils.safeGet(defaultHZS[0], "Cena", "N/A"));
                utils.addDebug(currentEntry, "  " + utils.getIcon("link") + " Default HZS nájdené");
                return defaultHZS;
            }
        }
        
        utils.addDebug(currentEntry, "  " + utils.getIcon("warning") + " Default HZS nenájdené");
        return null;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "getDefaultHZS", error);
        return null;
    }
}

// ==============================================
// SPRACOVANIE STROJOV
// ==============================================   

function processMachines() {
    try {
        var machineryField = utils.safeGetLinks(currentEntry, CONFIG.fields.workRecord.machinery);
        var usedMachines = {
            success: false,
            count: machineryField ? machineryField.length : 0,
            processed: 0,
            total: 0,
            machines: []
        };
        // Ak nie sú žiadne stroje
        if (!machineryField || machineryField.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadne stroje ani mechanizácia dnes neboli použité...");
            // Napriek tomu nastav pole Suma Stroje na 0
            utils.safeSet(currentEntry, CONFIG.fields.workRecord.machinesSum, 0);
            utils.addDebug(currentEntry, "  ✅ Uložená suma strojov do poľa: 0 €");
            usedMachines.success = true;
            return usedMachines;
        }
        
        // Získaj cenu za stroje
        var machinePrice = {
            priceMth: 0,
            flatRate: 0,            
        };

        if (machineryField && machineryField.length > 0) {
            for (var i = 0; i < machineryField.length; i++) {
                var machine = machineryField[i];
                var machineName = utils.safeGet(machine, CONFIG.fields.machine.name, "Neznámy stroj")
                + " " + utils.safeGet(machine, CONFIG.fields.machine.description, "");
                utils.addDebug(currentEntry, " 🚜 Spracovanie stroja: " + machineName);
                machineName = machineName.trim();

                // Získaj platnú cenu z histórie
                var currentDate = utils.safeGet(currentEntry, CONFIG.fields.workRecord.date);
                machinePrice = utils.findValidMachinePrice(machine, currentDate);

                // Pracuj s atribútmi priamo na machine objekte (ako v processHZS)
                var hasMachinePrice = 0;
                var calculationType = null;
                var usedMth = 1;
                
                // Čítaj atribúty priamo z machine objektu (bezpečne)
                try {
                    hasMachinePrice = machine.attr(CONFIG.attributes.workRecordMachines.totalPrice) || 0;
                    calculationType = machine.attr(CONFIG.attributes.workRecordMachines.calculationType);
                    // Ak je calculationType null, nastav default hodnotu
                    if (!calculationType || calculationType === null) {
                        calculationType = "mth"; // default hodnota
                        utils.addDebug(currentEntry, "    ⚠️ calculationType bol null, nastavujem default: mth");
                    }
                    usedMth = machine.attr(CONFIG.attributes.workRecordMachines.usedMth) || 1;
                } catch (error) {
                    utils.addError(currentEntry, "Chyba pri čítaní atribútov z machine objektu: " + error.toString(), "processMachines");
                    // Fallback hodnoty
                    hasMachinePrice = 0;
                    calculationType = "mth";
                    usedMth = 1;
                }            

                var totalPrice = 0;

                // Skontroluj či je machinePrice platný pred akýmkoľvek výpočtom
                if (!machinePrice || typeof machinePrice !== 'object') {
                    utils.addError(currentEntry, "Nenašiel sa platný cenník pre stroj: " + machineName, "processMachines");
                    continue; // preskočíme tento stroj
                }

                if (!hasMachinePrice || hasMachinePrice == 0) {
                    // vypočítaj sumu za tento stroj
                    if (calculationType === "mth") {
                        var priceMth = machinePrice.priceMth || 0;
                        utils.addDebug(currentEntry, "  • Účtujem motohodiny: " + usedMth + " mth" + " × " + priceMth + " €/mth");
                        utils.safeSetAttribute(currentEntry, CONFIG.fields.workRecord.machinery, CONFIG.attributes.workRecordMachines.usedMth, usedMth, i);
                        utils.safeSetAttribute(currentEntry, CONFIG.fields.workRecord.machinery, CONFIG.attributes.workRecordMachines.priceMth, priceMth, i);
                        totalPrice = priceMth * usedMth;

                    } else if (calculationType === "paušál") {
                        var flatRate = machinePrice.flatRate || 0;
                        utils.addDebug(currentEntry, "  • Účtujem paušál: " + flatRate + " €");
                        //utils.safeSetAttribute(currentEntry, CONFIG.fields.workRecord.machinery, CONFIG.attributes.workRecordMachines.flatRate, flatRate, i);
                        totalPrice = flatRate;
                    } else {
                        utils.addDebug(currentEntry, "  ⚠️ Nezadaný typ účtovania: '" + calculationType + "', nastavujem 'mth'");
                        calculationType = "mth";
                        var priceMth = machinePrice.priceMth || 0;
                        utils.safeSetAttribute(currentEntry, CONFIG.fields.workRecord.machinery, CONFIG.attributes.workRecordMachines.usedMth, usedMth, i);
                        utils.safeSetAttribute(currentEntry, CONFIG.fields.workRecord.machinery, CONFIG.attributes.workRecordMachines.priceMth, priceMth, i);
                        totalPrice = priceMth * usedMth;
                    }

                 

                        utils.safeSetAttribute(currentEntry, CONFIG.fields.workRecord.machinery, CONFIG.attributes.workRecordMachines.totalPrice, totalPrice, i);
                        utils.addDebug(currentEntry, "    ✅ totalPrice nastavené");
                 

                } else {
                    utils.addDebug(currentEntry, "  ✅ Cena atribútu ceny je už nastavená: " + hasMachinePrice + " €");
                    utils.addDebug(currentEntry, "  • ak je potrebné prepočítať túto cenu, vymaž hodnotu a ulož záznam...");
                    totalPrice = hasMachinePrice;
                }
                usedMachines.total += totalPrice;
                usedMachines.processed += 1;
                usedMachines.machines.push({
                    machine: machine,  // Skutočný Memento objekt
                    machineData: {
                        name: machineName,
                        id: machine.field("ID"),
                        usedMth: usedMth,
                        calculationType: calculationType,
                        priceMth: machinePrice.priceMth,
                        flatRate: machinePrice.flatRate,
                        totalPrice: totalPrice
                    }
                });
                usedMachines.success = true;
                utils.addDebug(currentEntry, "  • Cena za stroje: " + totalPrice + " €");    
            }

            // Vypočítaj sumu a ulož do poľa
            utils.safeSet(currentEntry, CONFIG.fields.workRecord.machinesSum, usedMachines.total);
            utils.addDebug(currentEntry, "  ✅ Uložená suma strojov do poľa: " + usedMachines.total + " €");

            utils.addDebug(currentEntry, "  " + utils.getIcon("rate") + " Suma za stroje: " + usedMachines.total + "€");
            utils.addDebug(currentEntry, "  " + utils.getIcon("machine_use") + " Použítých strojov: " + usedMachines.count);
            utils.addDebug(currentEntry, "  " + utils.getIcon("success") + " Spracovanie strojov dokončené úspešne");

            return usedMachines;
                    
        } 
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "processMachines", error);
        return usedMachines;
    }
}
// ==============================================
// SPRACOVANIE MATERIÁLOV
// ==============================================   

function processMaterials() {
    try {
        var materialsField = utils.safeGetLinks(currentEntry, CONFIG.fields.workRecord.materials);
        var usedMaterials = {
            success: false,
            count: materialsField ? materialsField.length : 0,
            processed: 0,
            total: 0,
            materials: []
        };
        // Ak nie sú žiadne materiály
        if (!materialsField || materialsField.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadne materiály dnes neboli použité...");
            // Napriek tomu nastav pole Suma Materiály na 0
            utils.safeSet(currentEntry, CONFIG.fields.workRecord.materialsSum, 0);
            utils.addDebug(currentEntry, "  ✅ Uložená suma materiálov do poľa: 0 €");
            usedMaterials.success = true;
            return usedMaterials;
        }
        
        // Spracuj každý materiál
        for (var i = 0; i < materialsField.length; i++) {
            var material = materialsField[i];                                   
            var materialName = utils.safeGet(material, CONFIG.fields.material.name, "Neznámy materiál")
            + " " + utils.safeGet(material, CONFIG.fields.material.description, "");
            utils.addDebug(currentEntry, " 🧰 Spracovanie materiálu: " + materialName);
            materialName = materialName.trim();
            
            // Získaj cenu materiálu

            var materialPrice = utils.safeGet(material, CONFIG.fields.material.price, 0);
            var quantity = utils.safeGet(material, CONFIG.fields.material.quantity, 0);
            if (!materialPrice || materialPrice <= 0) {
                utils.addDebug(currentEntry, "  ❌ Preskakujem - nemá platnú cenu");
                continue;
            }
            if (!quantity || quantity <= 0) {
                utils.addDebug(currentEntry, "  ❌ Preskakujem - množstvo je nulové");
                continue;
            }
            
            var totalPrice = Math.round(materialPrice * quantity * 100) / 100;
            usedMaterials.total += totalPrice;
            usedMaterials.processed += 1;
            usedMaterials.materials.push({
                material: {
                    name: materialName,
                    id: material.id,
                    price: materialPrice,
                    quantity: quantity,
                    totalPrice: totalPrice
                }
            });
            utils.addDebug(currentEntry, "  • Cena za materiál: " + quantity + " × "    + materialPrice + " € = " + totalPrice + " €");    
            usedMaterials.success = true;
        }

        // Ulož celkovú sumu materiálov do poľa
        utils.safeSet(currentEntry, CONFIG.fields.workRecord.materialsSum, usedMaterials.total);
        utils.addDebug(currentEntry, "  ✅ Uložená suma materiálov do poľa: " + usedMaterials.total + " €");

        utils.addDebug(currentEntry, "  " + utils.getIcon("rate") + " Suma za materiály: " + usedMaterials.total + "€");
        utils.addDebug(currentEntry, "  " + utils.getIcon("materials") + " Použitých materiálov: " + usedMaterials.count);
        utils.addDebug(currentEntry, "  " + utils.getIcon("success") + " Spracovanie materiálov dokončené úspešne");

        return usedMaterials;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "processMaterials", error);
        return { success: false };
    }
}   

// ==============================================
// VÝKAZ PRÁC
// ==============================================

function createNewWorkReport(customerObj, date, customerName) {
    try {
        var reportLib = libByName(CONFIG.libraries.workReport);
        if (!reportLib) return null;
        
        var workReport = reportLib.create({});

        // Nastav základné polia
        utils.safeSet(workReport, CONFIG.fields.workReport.datum, date);
        utils.safeSet(workReport, CONFIG.fields.workReport.identifikator, "VP-" + moment(date).format("YYYYMMDD"));
        utils.safeSet(workReport, CONFIG.fields.workReport.popis, "Výkaz prác - " + customerName);
        utils.safeSet(workReport, CONFIG.fields.workReport.typVykazu, "Podľa vykonaných prác");
        utils.safeSet(workReport, CONFIG.fields.workReport.cenyPocitat, "Z cenovej ponuky");
        utils.safeSet(workReport, CONFIG.fields.workReport.vydane, "Zákazka");
        utils.safeSet(workReport, CONFIG.fields.workReport.zakazka, [customerObj]);
        
        // Info záznam
        var info = "📋 AUTOMATICKY VYTVORENÝ VÝKAZ\n";
        info += "=====================================\n\n";
        info += "📅 Dátum: " + utils.formatDate(date) + "\n";
        info += "📦 Zákazka: " + customerName + "\n";
        info += "⏰ Vytvorené: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
        info += "🔧 Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        info += "📂 Zdroj: Knižnica Záznam práce\n\n";
        info += "✅ VÝKAZ VYTVORENÝ ÚSPEŠNE";

        utils.safeSet(workReport, CONFIG.fields.workReport.info, info);
        
        utils.addDebug(currentEntry, "  " + utils.getIcon("create") + " Nový výkaz vytvorený");
        
        return workReport;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createNewWorkReport", error);
        return null;
    }
}

// ==============================================
// NOVÁ UNIVERZÁLNA ARCHITEKTÚRA PRE VÝKAZY
// ==============================================

function createOrUpdateWorkReport(employeeResult, hzsResult, machinesResult, validationResult) {
    try {
        utils.addDebug(currentEntry, "=== TESTOVANIE NOVEJ ARCHITEKTÚRY VÝKAZOV ===");

        // Priprav calculatedData pre work report
        var calculatedData = {
            totalHours: employeeResult.odpracovaneTotal,
            hzsSum: hzsResult.sum,
            hzsCount: 1  // Jeden záznam práce
        };

        // Vytvor výkaz pomocou novej univerzálnej architektúry
        var reportResult = utils.createOrUpdateReport(currentEntry, 'work', calculatedData, {
            debugEntry: currentEntry,
            date: validationResult.date
        });

        if (reportResult.success) {
            utils.addDebug(currentEntry, "✅ Nová architektúra - výkaz prác: " + reportResult.action);
            utils.addDebug(currentEntry, "📊 Výkaz: " + (reportResult.report ? utils.safeGet(reportResult.report, "Číslo", "N/A") : "N/A"));
            utils.addDebug(currentEntry, "🔗 Súčty: hodiny=" + calculatedData.totalHours + ", suma=" + calculatedData.hzsSum);
            return true;
        } else {
            utils.addDebug(currentEntry, "❌ Nová architektúra zlyhala: " + (reportResult.errors ? reportResult.errors.join(", ") : "Neznáma chyba"));
            // Fallback na starú implementáciu
            utils.addDebug(currentEntry, "🔄 Fallback na starú implementáciu");
            return synchronizeWorkReportOld(validationResult.customer, validationResult.date, employeeResult.odpracovaneTotal, hzsResult.price);
        }

    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createOrUpdateWorkReport", error);
        return false;
    }
}

function createOrUpdateMachinesReport(machinesResult, validationResult) {
    try {
        utils.addDebug(currentEntry, "=== TESTOVANIE VÝKAZU STROJOV ===");

        // Priprav calculatedData pre machines report
        var calculatedData = {
            totalHours: 0,
            totalCost: machinesResult.total,
            machineCount: machinesResult.count
        };

        // Spočítaj celkové motohodiny
        for (var i = 0; i < machinesResult.machines.length; i++) {
            var machineData = machinesResult.machines[i].machineData;
            if (machineData.calculationType === "mth") {
                calculatedData.totalHours += machineData.usedMth || 0;
            }
        }

        // Priprav správne dáta pre súčty vo výkaze
        var reportSummary = {
            sumWithoutVat: machinesResult.total,  // Suma bez DPH
            machineCount: machinesResult.count,   // Počet strojov
            totalMth: calculatedData.totalHours   // Celkové motohodiny
        };

        // Vytvor výkaz strojov pomocou novej univerzálnej architektúry
        var reportResult = utils.createOrUpdateReport(currentEntry, 'machines', reportSummary, {
            debugEntry: currentEntry,
            date: validationResult.date,
            machines: machinesResult.machines  // Dodatočné dáta pre LinkToEntry
        });

        if (reportResult.success) {
            utils.addDebug(currentEntry, "✅ Výkaz strojov: " + reportResult.action);
            utils.addDebug(currentEntry, "📊 Výkaz: " + (reportResult.report ? utils.safeGet(reportResult.report, "Identifikátor", "N/A") : "N/A"));
            utils.addDebug(currentEntry, "🔗 Súčty: mth=" + calculatedData.totalHours + ", suma=" + machinesResult.total);

            // Linkovanie strojov je teraz súčasťou utils.createOrUpdateReport

            return true;
        } else {
            utils.addDebug(currentEntry, "❌ Výkaz strojov zlyhal: " + (reportResult.errors ? reportResult.errors.join(", ") : "Neznáma chyba"));
            return false;
        }

    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createOrUpdateMachinesReport", error);
        return false;
    }
}

// Stará implementácia ako fallback
function synchronizeWorkReportOld(customer, date, workedHours, hzsPrice) {
    try {
        if (!customer || customer.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadna zákazka - preskakujem výkaz");
            return true; // Nie je chyba ak nie je zákazka
        }

        var customerObj = customer[0];
        var customerName = utils.safeGet(customerObj, "Názov", "N/A");

        utils.addDebug(currentEntry, "  🔍 Hľadám výkaz pre zákazku: " + customerName);

        // Nájdi existujúci výkaz
        var existingReports = customerObj.linksFrom(CONFIG.libraries.workReport, CONFIG.fields.workReport.zakazka);

        var workReport = null;

        if (existingReports && existingReports.length > 0) {
            workReport = existingReports[0];
            utils.addDebug(currentEntry, "  " + utils.getIcon("update") + " Existujúci výkaz nájdený");
        } else {
            // Vytvor nový výkaz
            workReport = createNewWorkReport(customerObj, date, customerName);
        }

        // Spracuj link na aktuálny záznam
        if (workReport) {
            updateWorkReportLink(workReport, workedHours, hzsPrice);
            utils.addDebug(currentEntry, "  ✅ Synchronizácia výkazu dokončená úspešne");
            return true;
        } else {
            utils.addDebug(currentEntry, "  ❌ Chyba pri vytváraní/aktualizácii výkazu");
            return false;
        }

    } catch (error) {
        utils.addError(currentEntry, error.toString(), "synchronizeWorkReportOld", error);
        return false;
    }
}

function updateWorkReportLink(workReport, workedHours, hzsPrice) {
    try {
        var praceHZS = utils.safeGetLinks(workReport, CONFIG.fields.workReport.praceHZS) || [];
        var currentEntryId = currentEntry.field("ID");
        
        // Nájdi index aktuálneho záznamu v poli
        var existingIndex = -1;
        for (var i = 0; i < praceHZS.length; i++) {
            if (praceHZS[i] && praceHZS[i].field("ID") === currentEntryId) {
                existingIndex = i;
                break;
            }
        }
        
        // Ak link neexistuje, pridaj ho
        if (existingIndex === -1) {
            praceHZS.push(currentEntry);
            workReport.set(CONFIG.fields.workReport.praceHZS, praceHZS);
            existingIndex = praceHZS.length - 1;
            utils.addDebug(currentEntry, "  " + utils.getIcon("create") + " Nový link pridaný do výkazu");
        } else {
            utils.addDebug(currentEntry, "  " + utils.getIcon("update") + " Aktualizujem existujúci link vo výkaze");
        }
        
        // Aktualizuj atribúty (či už nové alebo existujúce)
        updateWorkReportAttributes(workReport, existingIndex, workedHours, hzsPrice);
        
        // Aktualizuj info pole výkazu
        updateWorkReportInfo(workReport);
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "updateWorkReportLink", error);
    }
}

function updateWorkReportAttributes(workReport, index, workedHours, hzsPrice) {
    try {
        var vykazArray = workReport.field(CONFIG.fields.workReport.praceHZS);
        
        if (!vykazArray || !vykazArray[index]) {
            utils.addError(currentEntry, "Nepodarilo sa získať pole výkazu na indexe " + index, "updateWorkReportAttributes");
            return;
        }
        
        // Získaj aktuálne údaje
        var workDescription = utils.safeGet(currentEntry, CONFIG.fields.workRecord.workDescription, "");
        var totalPrice = Math.round(workedHours * hzsPrice * 100) / 100;
        
        // Nastav/aktualizuj všetky atribúty
        vykazArray[index].setAttr(CONFIG.attributes.workReport.workDescription, workDescription);
        vykazArray[index].setAttr(CONFIG.attributes.workReport.hoursCount, workedHours);
        vykazArray[index].setAttr(CONFIG.attributes.workReport.billedRate, hzsPrice);
        vykazArray[index].setAttr(CONFIG.attributes.workReport.totalPrice, totalPrice);
        
       
       
        
        utils.addDebug(currentEntry, "  ✅ Atribúty aktualizované:");
        utils.addDebug(currentEntry, "    • Popis: " + (workDescription || "N/A"));
        utils.addDebug(currentEntry, "    • Hodiny: " + workedHours);
        utils.addDebug(currentEntry, "    • Sadzba: " + hzsPrice + " €/h");
        utils.addDebug(currentEntry, "    • Cena: " + totalPrice + " €");
        
        // Prepočítaj celkový súčet výkazu
        recalculateWorkReportTotals(workReport);
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri aktualizácii atribútov: " + error.toString(), "updateWorkReportAttributes", error);
    }
}

function recalculateWorkReportTotals(workReport) {
    try {
        var vykazArray = workReport.field(CONFIG.fields.workReport.praceHZS);
        if (!vykazArray) return;
        
        var totalHours = 0;
        var totalAmount = 0;
        var recordCount = vykazArray.length;
        
        // Spočítaj všetky záznamy
        for (var i = 0; i < vykazArray.length; i++) {
            var hours = utils.safeGet(vykazArray[i], CONFIG.fields.workRecord.workedHours || 0);
            var price = utils.safeGet(vykazArray[i], CONFIG.fields.workRecord.hzsSum || 0);
            
            totalHours += hours;
            totalAmount += price;
        }
        
        // Ulož súčty do výkazu (ak máš také polia)
            utils.safeSet(workReport, CONFIG.fields.workReport.totalHours, totalHours);
            utils.safeSet(workReport, CONFIG.fields.workReport.hzsSum, totalAmount);
            utils.safeSet(workReport, CONFIG.fields.workReport.hzsCount, recordCount);

        
        utils.addDebug(currentEntry, "  📊 Výkaz prepočítaný:");
        utils.addDebug(currentEntry, "    • Celkové hodiny: " + totalHours);
        utils.addDebug(currentEntry, "    • Celková suma: " + utils.formatMoney(totalAmount));
        utils.addDebug(currentEntry, "    • Počet záznamov: " + recordCount);
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri prepočte výkazu: " + error.toString(), "recalculateWorkReportTotals", error);
    }
}

function updateWorkReportInfo(workReport) {
    try {
        var existingInfo = utils.safeGet(workReport, CONFIG.fields.workReport.info, "");
        
        // Pridaj informáciu o aktualizácii
        var updateInfo = "\n\n🔄 AKTUALIZOVANÉ: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
        updateInfo += "• Záznam práce #" + currentEntry.field("ID") + " bol aktualizovaný\n";
        updateInfo += "• Script: " + CONFIG.scriptName + " v" + CONFIG.version;
        
        // Obmedz dĺžku info poľa (zachovaj posledných 5000 znakov)
        var newInfo = existingInfo + updateInfo;
        if (newInfo.length > 5000) {
            newInfo = "... (skrátené) ...\n" + newInfo.substring(newInfo.length - 4900);
        }

        workReport.set(CONFIG.fields.workReport.info, newInfo);
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri aktualizácii info poľa: " + error.toString(), "updateWorkReportInfo", error);
    }
}

// ==============================================
// INFO ZÁZNAMY
// ==============================================

function createInfoRecord(workTimeResult, employeeResult, hzsResult, machinesResult) {
    try {
        var date = currentEntry.field(CONFIG.fields.workRecord.date);
        var dateFormatted = utils.formatDate(date, "DD.MM.YYYY");

        // Spracuj materiály ak existujú
        var materialsResult = processMaterials();

        var infoMessage = "# 📋 ZÁZNAM PRÁC - AUTOMATICKÝ PREPOČET\n\n";

        infoMessage += "## 📅 Základné údaje\n";
        var dayName = utils.getDayNameSK(moment(date).day()).toUpperCase();
        infoMessage += "- **Dátum:** " + dateFormatted + " (" + dayName + ")" + "\n";
        infoMessage += "- **Pracovný čas:** " + moment(workTimeResult.startTimeRounded).format("HH:mm") +
                       " - " + moment(workTimeResult.endTimeRounded).format("HH:mm") + "\n";
        infoMessage += "- **Odpracované:** " + workTimeResult.pracovnaDobaHodiny + " hodín\n\n";

        if (employeeResult.pocetPracovnikov > 0) {
            infoMessage += "## 👥 ZAMESTNANCI (" + employeeResult.pocetPracovnikov + " " +
                          utils.selectOsobaForm(employeeResult.pocetPracovnikov) + ")\n\n";

            for (var i = 0; i < employeeResult.detaily.length; i++) {
                var detail = employeeResult.detaily[i];
                infoMessage += "### 👤 " + utils.formatEmployeeName(detail.zamestnanec) + "\n";
                infoMessage += "- **Hodinovka:** " + detail.hodinovka + " €/h\n";
                infoMessage += "- **Mzdové náklady:** " + detail.dennaMzda + " €\n\n";
            }

            infoMessage += "**💰 Celkové mzdové náklady:** " + utils.formatMoney(employeeResult.celkoveMzdy) + "\n\n";
        }

        if (hzsResult.price > 0) {
            infoMessage += "## 💵 HODINOVÁ ZÚČTOVACIA SADZBA\n";
            infoMessage += "- **Sadzba:** " + hzsResult.price + " €/h\n";
            infoMessage += "- **Suma HZS:** " + utils.formatMoney(hzsResult.sum) + "\n\n";
        }

        // Stroje a mechanizácia
        if (machinesResult && machinesResult.success && machinesResult.count > 0) {
            infoMessage += "## 🚜 STROJE A MECHANIZÁCIA (" + machinesResult.count + ")\n\n";

            for (var i = 0; i < machinesResult.machines.length; i++) {
                var machine = machinesResult.machines[i].machine;
                infoMessage += "### 🚜 " + machine.name + "\n";

                if (machine.calculationType === "mth") {
                    infoMessage += "- **Typ účtovania:** Motohodiny\n";
                    infoMessage += "- **Použité motohodiny:** " + machine.usedMth + " mth\n";
                    infoMessage += "- **Cena za mth:** " + machine.priceMth + " €/mth\n";
                } else if (machine.calculationType === "paušál") {
                    infoMessage += "- **Typ účtovania:** Paušál\n";
                    infoMessage += "- **Paušálna cena:** " + machine.flatRate + " €\n";
                }

                infoMessage += "- **Celková cena:** " + utils.formatMoney(machine.totalPrice) + "\n\n";
            }

            infoMessage += "**🚜 Celková suma za stroje:** " + utils.formatMoney(machinesResult.total) + "\n\n";
        }

        // Materiály
        if (materialsResult && materialsResult.success && materialsResult.count > 0) {
            infoMessage += "## 🧰 MATERIÁLY (" + materialsResult.count + ")\n\n";

            for (var i = 0; i < materialsResult.materials.length; i++) {
                var material = materialsResult.materials[i].material;
                infoMessage += "### 🧰 " + material.name + "\n";
                infoMessage += "- **Množstvo:** " + material.quantity + "\n";
                infoMessage += "- **Jednotková cena:** " + material.price + " €\n";
                infoMessage += "- **Celková cena:** " + utils.formatMoney(material.totalPrice) + "\n\n";
            }

            infoMessage += "**🧰 Celková suma za materiály:** " + utils.formatMoney(materialsResult.total) + "\n\n";
        }

        var order = utils.safeGetLinks(currentEntry, CONFIG.fields.workRecord.order);
        if (order && order.length > 0) {
            infoMessage += "## 📦 ZÁKAZKA\n";
            infoMessage += "- **Názov:** " + utils.safeGet(order[0], "Názov", "N/A") + "\n\n";
        }

        var workDescription = utils.safeGet(currentEntry, CONFIG.fields.workRecord.workDescription);
        if (workDescription) {
            infoMessage += "## 🔨 VYKONANÉ PRÁCE\n";
            infoMessage += workDescription + "\n\n";
        }

        // Celkový súhrn nákladov
        var totalCosts = employeeResult.celkoveMzdy + (hzsResult.sum || 0) +
                        (machinesResult && machinesResult.total ? machinesResult.total : 0) +
                        (materialsResult && materialsResult.total ? materialsResult.total : 0);

        if (totalCosts > 0) {
            infoMessage += "## 💰 CELKOVÝ SÚHRN NÁKLADOV\n";
            infoMessage += "- **Mzdové náklady:** " + utils.formatMoney(employeeResult.celkoveMzdy) + "\n";
            if (hzsResult.sum > 0) infoMessage += "- **HZS:** " + utils.formatMoney(hzsResult.sum) + "\n";
            if (machinesResult && machinesResult.total > 0) infoMessage += "- **Stroje:** " + utils.formatMoney(machinesResult.total) + "\n";
            if (materialsResult && materialsResult.total > 0) infoMessage += "- **Materiály:** " + utils.formatMoney(materialsResult.total) + "\n";
            infoMessage += "- **CELKOM:** " + utils.formatMoney(totalCosts) + "\n\n";
        }

        infoMessage += "## 🔧 TECHNICKÉ INFORMÁCIE\n";
        infoMessage += "- **Script:** " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        infoMessage += "- **Čas spracovania:** " + moment().format("HH:mm:ss") + "\n";
        infoMessage += "- **MementoUtils:** v" + (utils.version || "N/A") + "\n";

        if (typeof MementoConfig !== 'undefined') {
            infoMessage += "- **MementoConfig:** v" + MementoConfig.version + "\n";
        }

        infoMessage += "\n---\n**✅ PREPOČET DOKONČENÝ ÚSPEŠNE**";

        currentEntry.set(CONFIG.fields.common.info, infoMessage);

        utils.addDebug(currentEntry, "✅ Info záznam vytvorený s Markdown formátovaním a kompletným súhrnom");

        return true;

    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createInfoRecord", error);
        return false;
    }
}
// ==============================================
// FINÁLNY SÚHRN
// ==============================================

function logFinalSummary(steps, employeeResult, hzsResult) {
    try {
        utils.addDebug(currentEntry, "\n📊 === FINÁLNY SÚHRN ===");

        var allSuccess = true;
        for (var step in steps) {
            var status = steps[step].success ? "✅" : "❌";
            utils.addDebug(currentEntry, status + " " + steps[step].name);
            if (!steps[step].success) {
                allSuccess = false;
            }
        }

        if (allSuccess) {
            utils.addDebug(currentEntry, "\n✅ Všetky kroky dokončené úspešne!");

            // Zobraz súhrn používateľovi
            var date = utils.safeGet(currentEntry, CONFIG.fields.workRecord.date);
            var dateFormatted = utils.formatDate(date, "DD.MM.YYYY");
            var employeeCount = employeeResult.pocetPracovnikov;
            var totalHours = utils.safeGet(currentEntry, CONFIG.fields.workRecord.workedHours, 0);
            var totalCosts = employeeResult.celkoveMzdy;

            var summaryMsg = "✅ PREPOČET DOKONČENÝ\n\n";
            summaryMsg += "📅 " + dateFormatted + "\n";
            summaryMsg += "━━━━━━━━━━━━━━━━━━━━━\n";
            summaryMsg += "👥 Počet zamestnancov: " + employeeCount + "\n";
            summaryMsg += "⏱️ Odpracované: " + totalHours.toFixed(2) + " h\n";
            summaryMsg += "💰 Mzdové náklady: " + utils.formatMoney(totalCosts) + "\n";

            if (hzsResult && hzsResult.sum > 0) {
                summaryMsg += "💵 Suma HZS: " + utils.formatMoney(hzsResult.sum) + "\n";
            }

            summaryMsg += "━━━━━━━━━━━━━━━━━━━━━\n";
            summaryMsg += "ℹ️ Detaily v poli 'info'";

            message(summaryMsg);
        } else {
            utils.addDebug(currentEntry, "\n⚠️ === NIEKTORÉ KROKY ZLYHALI ===");
        }

        utils.addDebug(currentEntry, "⏱️ Čas ukončenia: " + moment().format("HH:mm:ss"));
        utils.addDebug(currentEntry, "📋 === KONIEC " + CONFIG.scriptName + " v" + CONFIG.version + " ===");

    } catch (error) {
        utils.addError(currentEntry, error.toString(), "logFinalSummary", error);
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

// Kontrola závislostí
var dependencyCheck = utils.checkDependencies(['config', 'core', 'business']);
if (!dependencyCheck.success) {
    message("❌ Chýbajú potrebné moduly: " + dependencyCheck.missing.join(", "));
    cancel();
}

// Spustenie hlavnej funkcie
var result = main();

// Ak hlavná funkcia zlyhala, zruš uloženie
if (!result) {
    utils.addError(currentEntry, "Script zlyhal - zrušené uloženie", "main");
    cancel();
}