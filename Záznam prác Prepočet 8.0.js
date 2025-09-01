// ==============================================
// MEMENTO DATABASE - ZÁZNAM PRÁC PREPOČET
// Verzia: 8.1 | Dátum: 31.08.2025 | Autor: ASISTANTO
// Knižnica: Záznam práce | Trigger: Before Save
// ==============================================
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
    version: "8.1.2",
    
    // Referencie na centrálny config
    fields: {
        workReport: centralConfig.fields.workReport,
        workRecord: centralConfig.fields.workRecord,
        common: centralConfig.fields.common,
        employee: centralConfig.fields.employee,
        workPrices: centralConfig.fields.workPrices ,
        // Mapovanie pre časové polia
        startTime: centralConfig.fields.workRecord.startTime || "Od",
        endTime: centralConfig.fields.workRecord.endTime || "Do",
        workTime: centralConfig.fields.workRecord.workTime || "Pracovná doba",
        workedHours: centralConfig.fields.workRecord.workedHours || "Odpracované",
        employeeCount: centralConfig.fields.workRecord.employeeCount || "Počet pracovníkov",
        wageCosts: centralConfig.fields.workRecord.wageCosts || "Mzdové náklady",
        hzsSum: centralConfig.fields.workRecord.hzsSum || "Suma HZS",
        info: centralConfig.fields.common.info,
        infoTelegram: centralConfig.fields.common.infoTelegram || "info_telegram"
    },
    attributes: centralConfig.attributes.workRecordEmployees || {
        workedHours: "odpracované",
        hourlyRate: "hodinovka", 
        wageCosts: "mzdové náklady"
    },
    libraries: centralConfig.libraries,
    icons: centralConfig.icons,
    
    // Lokálne nastavenia
    settings: {
        roundToQuarterHour: false,
        defaultCurrency: "€"
    },
    
    // Mapovanie pre HZS atribúty
    hzsAttributes: centralConfig.attributes.hzs || {
        price: "cena"
    },
    
    // Mapovanie pre výkaz prác
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
    },
    
    // Mapovanie pre výkaz atribúty
    vykazAttributes: centralConfig.attributes.workReport || {
        workDescription: "vykonané práce",
        hoursCount: "počet hodín",
        billedRate: "účtovaná sadzba",
        totalPrice: "cena celkom"
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, utils.getIcon("start") + " === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        utils.addDebug(currentEntry, "Čas spustenia: " + utils.formatDate(moment()));
        
        // Kroky prepočtu
        var steps = {
            step1: { success: false, name: "Načítanie a validácia dát" },
            step2: { success: false, name: "Výpočet pracovnej doby" },
            step3: { success: false, name: "Spracovanie zamestnancov" },
            step4: { success: false, name: "Spracovanie HZS" },
            step5: { success: false, name: "Celkové výpočty" },
            step6: { success: false, name: "Synchronizácia výkazu prác" },
            step7: { success: false, name: "Vytvorenie info záznamov" }
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
        //var employeeResult = processEmployees(validationResult.employees, workTimeResult.pracovnaDobaHodiny, validationResult.date);
        var employeeResult = utils.processEmployees(validationResult.employees, workTimeResult.pracovnaDobaHodiny, validationResult.date);
        steps.step3.success = employeeResult.success;

        // Krok 4: Spracovanie HZS
        utils.addDebug(currentEntry, utils.getIcon("money") + " KROK 4: Spracovanie HZS");
        var hzsResult = processHZS(employeeResult.odpracovaneTotal);
        steps.step4.success = hzsResult.success;

         // KROK 5: Celkové výpočty
        utils.addDebug(currentEntry, " KROK 5: Celkové výpočty", "calculation");
        if (employeeResult.success && hzsResult.success) {
            steps.step5.success = calculateTotals(employeeResult, hzsResult);
        }

        // Krok 6: Synchronizácia výkazu prác
        if (validationResult.hasCustomer) {
            utils.addDebug(currentEntry, utils.getIcon("update") + " KROK 6: Synchronizácia výkazu prác");
            steps.step6.success = synchronizeWorkReport(validationResult.customer, validationResult.date, employeeResult.odpracovaneTotal, hzsResult.price);
       
        }
        
        // Krok 7: Vytvorenie info záznamov
        utils.addDebug(currentEntry, utils.getIcon("note") + " KROK 7: Vytvorenie info záznamov");
        steps.step7.success = createInfoRecord(workTimeResult, employeeResult, hzsResult);
        createTelegramInfoRecord(workTimeResult, employeeResult, hzsResult);
        
        utils.addDebug(currentEntry, utils.getIcon("success") + " === PREPOČET DOKONČENÝ ===");
        
        // Zobraz súhrn
        zobrazSuhrn(employeeResult, hzsResult);
        logFinalSummary(steps);
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
        // Definuj povinné polia
        var requiredFields = [
            CONFIG.fields.workRecord.date,
            CONFIG.fields.startTime,
            CONFIG.fields.endTime
        ];
        
        // Získaj hodnoty
        var date = utils.safeGet(currentEntry, CONFIG.fields.workRecord.date);
        var startTime = utils.safeGet(currentEntry, CONFIG.fields.startTime);
        var endTime = utils.safeGet(currentEntry, CONFIG.fields.endTime);
        var employees = utils.safeGetLinks(currentEntry, CONFIG.fields.workRecord.employees);
        var customer = utils.safeGetLinks(currentEntry, CONFIG.fields.workRecord.customer);
        
        // Kontroly
        var missingFields = [];
        if (!date) missingFields.push("Dátum");
        if (!startTime) missingFields.push("Od");
        if (!endTime) missingFields.push("Do");
        
        if (missingFields.length > 0) {
            return {
                success: false,
                error: "Chýbajú povinné polia: " + missingFields.join(", ")
            };
        }
        
        utils.addDebug(currentEntry, "  • Dátum: " + utils.formatDate(date));
        utils.addDebug(currentEntry, "  • Čas: " + utils.formatTime(startTime) + " - " + utils.formatTime(endTime));
        utils.addDebug(currentEntry, "  • Zamestnancov: " + (employees ? employees.length : 0));
        utils.addDebug(currentEntry, "  • Zákazka: " + (customer && customer.length > 0 ? "ÁNO" : "NIE"));
        utils.addDebug(currentEntry, utils.getIcon("success") + " Validácia úspešná");
        
        return {
            success: true,
            date: date,
            startTime: startTime,
            endTime: endTime,
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
    try {
        utils.addDebug(currentEntry, "  Výpočet pracovného času na zákazke", "calculation");
        
        // Spracuj časy cez nové funkcie
        var startTimeParsed = utils.parseTimeInput(startTime);
        var endTimeParsed = utils.parseTimeInput(endTime);
        
        if (!startTimeParsed || !endTimeParsed) {
            return { success: false, error: "Nepodarilo sa spracovať časy" };
        }
        
        // Zaokrúhli časy ak je to povolené
        var startTimeFinal = startTimeParsed;
        var endTimeFinal = endTimeParsed;
        
        if (CONFIG.settings.roundToQuarterHour) {
            startTimeFinal = utils.roundTimeToQuarter(startTimeParsed); // Začiato zaokrúhli  
            endTimeFinal = utils.roundTimeToQuarter(endTimeParsed); // Koniec zaokrúhli
            
            utils.addDebug(currentEntry, "  Zaokrúhlenie aktivované:", "round");
            utils.addDebug(currentEntry, "  • Od: " + utils.formatTime(startTimeParsed) + " → " + utils.formatTime(startTimeFinal));
            utils.addDebug(currentEntry, "  • Do: " + utils.formatTime(endTimeParsed) + " → " + utils.formatTime(endTimeFinal));
            utils.safeSet(currentEntry, CONFIG.fields.workRecord.startTime, startTimeFinal.toDate());
            utils.safeSet(currentEntry, CONFIG.fields.workRecord.endTime, endTimeFinal.toDate()); 
        }
        
        // Výpočet hodín s novými časmi
        var workHours = utils.calculateWorkHours(startTimeFinal, endTimeFinal);
        
        if (!workHours || workHours.error) {
            return { success: false, error: workHours ? workHours.error : "Nepodarilo sa vypočítať hodiny" };
        }
        
        var pracovnaDobaHodiny = workHours.totalMinutes / 60;
        pracovnaDobaHodiny = Math.round(pracovnaDobaHodiny * 100) / 100;
        
        // Ulož do poľa
        currentEntry.set(CONFIG.fields.workRecord.workTime, pracovnaDobaHodiny);
        
        utils.addDebug(currentEntry, "  • Pracovná doba na zákazke: " + pracovnaDobaHodiny + " hodín");
        
        return {
            success: true,
            startTimeRounded: startTimeFinal,
            endTimeRounded: endTimeFinal,
            startTimeOriginal: startTimeParsed,
            endTimeOriginal: endTimeParsed,
            pracovnaDobaHodiny: pracovnaDobaHodiny
        };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "calculateWorkTime", error);
        return { success: false, error: error.toString() };
    }
}
// ==============================================

// function calculateWorkTime(startTime, endTime) {
//     try {
//         // Použitie MementoBusiness funkcie
//         var workHours = utils.calculateWorkHours(startTime, endTime);
        
//         if (!workHours || workHours.error) {
//             return { 
//                 success: false, 
//                 error: workHours ? workHours.error : "Nepodarilo sa vypočítať hodiny" 
//             };
//         }
        
//         var pracovnaDobaHodiny = workHours.totalMinutes / 60;
        
//         // Zaokrúhlenie ak je potrebné
//         if (CONFIG.settings.roundToQuarterHour) {
//             pracovnaDobaHodiny = Math.round(pracovnaDobaHodiny * 4) / 4;
//             utils.addDebug(currentEntry, "  Zaokrúhlené na štvrťhodiny: " + pracovnaDobaHodiny + "h");
//         }
        
//         // Ulož do polí
//         utils.safeSet(currentEntry, CONFIG.fields.workTime, pracovnaDobaHodiny);
//         utils.safeSet(currentEntry, CONFIG.fields.workedHours, pracovnaDobaHodiny);
        
//         utils.addDebug(currentEntry, "  • Pracovná doba: " + pracovnaDobaHodiny + " hodín");
        
//         return {
//             success: true,
//             pracovnaDobaHodiny: pracovnaDobaHodiny,
//             workHours: workHours,
//             startTime: startTime,
//             endTime: endTime
//         };
        
//     } catch (error) {
//         utils.addError(currentEntry, error.toString(), "calculateWorkTime", error);
//         return { success: false, error: error.toString() };
//     }
// }

// ==============================================
// SPRACOVANIE ZAMESTNANCOV
// ==============================================

// function processEmployees(employees, workedHours, date) {
//     var result = {
//         success: false,
//         pocetPracovnikov: zamestnanci.length,
//         odpracovaneTotal: 0,
//         pracovnaDoba: pracovnaDobaHodiny,
//         celkoveMzdy: 0,
//         detaily: []
//     };
    
//     try {
//         if (!employees || employees.length === 0) {
//             utils.addDebug(currentEntry, "  " + utils.getIcon("info") + " Žiadni zamestnanci");
//             utils.safeSet(currentEntry, CONFIG.fields.employeeCount, 0);
//             utils.safeSet(currentEntry, CONFIG.fields.wageCosts, 0);
//             return result;
//         }
        
//         result.pocetPracovnikov = employees.length;
//         utils.safeSet(currentEntry, CONFIG.fields.employeeCount, result.pocetPracovnikov);
        
//         // Získaj pole zamestnancov pre atribúty
//         var empArray = currentEntry.field(CONFIG.fields.workRecord.employees);
        
//         for (var i = 0; i < employees.length; i++) {
//             var employee = employees[i];
            
//             if (!employee) {
//                 utils.addDebug(currentEntry, "  Zamestnanec[" + i + "] je null - preskakujem");
//                 continue;
//             }
            
//             var employeeName = utils.formatEmployeeName(employee);
//             utils.addDebug(currentEntry, utils.getIcon("person") + " [" + (i+1) + "/" + result.pocetPracovnikov + "] " + employeeName);
            
//             // Nájdi platnú hodinovku
//             var hodinovka = utils.findValidHourlyRate(employee, date);
            
//             if (!hodinovka || hodinovka <= 0) {
//                 utils.addDebug(currentEntry, "  ❌ Preskakujem - nemá platnú sadzbu");
//                 continue;
//             }
            
//             // Nastav atribúty
//             if (empArray && empArray.length > i && empArray[i]) {
//                 empArray[i].setAttr(CONFIG.attributes.workedHours, workedHours);
//                 empArray[i].setAttr(CONFIG.attributes.hourlyRate, hodinovka);
                
//                 var mzdoveNaklady = Math.round(workedHours * hodinovka * 100) / 100;
//                 empArray[i].setAttr(CONFIG.attributes.wageCosts, mzdoveNaklady);
                
//                 result.celkoveMzdy += mzdoveNaklady;
//                 result.detaily.push({
//                     zamestnanec: employee,
//                     hodinovka: hodinovka,
//                     mzdoveNaklady: mzdoveNaklady
//                 });
                
//                 utils.addDebug(currentEntry, "  • Hodinovka: " + hodinovka + " €/h");
//                 utils.addDebug(currentEntry, "  • Mzdové náklady: " + mzdoveNaklady + " €");
//             }
//         }
        
//         // Ulož celkové mzdové náklady
//         utils.safeSet(currentEntry, CONFIG.fields.wageCosts, result.celkoveMzdy);
        
//         utils.addDebug(currentEntry, utils.getIcon("money") + " Celkové mzdové náklady: " + utils.formatMoney(result.celkoveMzdy));
//         result.success = true;
        
//         return result;
        
//     } catch (error) {
//         utils.addError(currentEntry, error.toString(), "processEmployees", error);
//         return result;
//     }
// }
function processEmployees(zamestnanci, pracovnaDobaHodiny, datum) {
 
    try {
        var result = {
            success: false,
            pocetPracovnikov: zamestnanci.length,
            odpracovaneTotal: 0,
            pracovnaDoba: pracovnaDobaHodiny,
            celkoveMzdy: 0,
            detaily: []
        };
        
        // Ulož počet pracovníkov
     utils.safeSet(currentEntry, CONFIG.fields.pocetPracovnikov, result.pocetPracovnikov);
        
        // Spracuj každého zamestnanca
        for (var i = 0; i < zamestnanci.length; i++) {
            var zamestnanec = zamestnanci[i];
            
            if (!zamestnanec) {
                utils.addDebug(currentEntry, "Zamestnanec[" + i + "] je null - preskakujem", "warning");
                continue;
            }
            
            var employeeName = utils.formatEmployeeName(zamestnanec);
            utils.addDebug(currentEntry, " [" + (i+1) + "/" + result.pocetPracovnikov + "] " + employeeName, "person");
            
            // Spracuj zamestnanca
            var empResult = processEmployee(zamestnanec, pracovnaDobaHodiny, datum, i);
            
            if (empResult.success) {
                result.odpracovaneTotal += pracovnaDobaHodiny;
                result.celkoveMzdy += empResult.dennaMzda;
                result.detaily.push(empResult);
                result.success = true;
            } else {
                result.success = false;
            }
        }
        
        return result;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "processEmployees", error);
        return { success: false };
    }
}

function processEmployee(zamestnanec, pracovnaDobaHodiny, datum, index) {
    try {
        // Nájdi platnú hodinovku
        var hodinovka = utils.findValidSalary(currentEntry, zamestnanec, datum);
        
        if (!hodinovka || hodinovka <= 0) {
            utils.addDebug(currentEntry, "  ❌ Preskakujem - nemá platnú sadzbu");
            return { success: false };
        }
        
        var zamArray = currentEntry.field(CONFIG.fields.workRecord.employees);
        
        if (zamArray && zamArray.length > index && zamArray[index]) {
            // Nastav atribúty pomocou .attr() metódy
            zamArray[index].setAttr(CONFIG.attributes.workedHours, pracovnaDobaHodiny);
            zamArray[index].setAttr(CONFIG.attributes.hourlyRate, hodinovka);
            
            // Vypočítaj dennú mzdu
            var dennaMzda = (pracovnaDobaHodiny * hodinovka );
            dennaMzda = Math.round(dennaMzda * 100) / 100;
            
            // Nastav dennú mzdu
            zamArray[index].setAttr(CONFIG.attributes.wageCosts, dennaMzda);
            
            utils.addDebug(currentEntry, "  • Mzdové náklady: " + dennaMzda + " €");
            utils.addDebug(currentEntry, "Spracované úspešne", "success");
            
            return {
                success: true,
                hodinovka: hodinovka,
                dennaMzda: dennaMzda,
                zamestnanec: zamestnanec  // Pridané pre info záznam
            };
        } else {
            utils.addError(currentEntry, "Nepodarilo sa získať zamesnanca na indexe " + index, "processEmployee");
            return { success: false };
        }
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "processEmployee", error);
        return { success: false };
    }
}

function calculateTotals(employeeResult, hzsResult) {
    try {
        // Ulož celkové hodnoty
        utils.safeSet(currentEntry, CONFIG.fields.workRecord.employeeCount, employeeResult.pocetPracovnikov);
        utils.safeSet(currentEntry, CONFIG.fields.workRecord.workedHours, employeeResult.odpracovaneTotal);
        utils.safeSet(currentEntry, CONFIG.fields.workRecord.wageCosts, employeeResult.celkoveMzdy);
        utils.safeSet(currentEntry, CONFIG.fields.workRecord.hzsSum, hzsResult.sum);
        
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

// ==============================================
// OPRAVENÉ FUNKCIE PRE HZS SPRACOVANIE
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
                hzsField = currentEntry.field(CONFIG.fields.workRecord.hzs);
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
            var hzsArray = currentEntry.field(CONFIG.fields.workRecord.hzs);
            if (hzsArray && hzsArray.length > 0 && hzsArray[0]) {
                hzsArray[0].setAttr(CONFIG.hzsAttributes.price, hzsPrice);
                utils.addDebug(currentEntry, "  ✅ Cena nastavená ako atribút: " + hzsPrice + " €");
            }
        }
        
        // Vypočítaj sumu
        var hzsSum = Math.round(workedHours * hzsPrice * 100) / 100;
        utils.safeSet(currentEntry, CONFIG.fields.hzsSum, hzsSum);
        
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
        
        var defaults = defaultsLib.entries();
        if (defaults && defaults.length > 0) {
            var defaultHZS = utils.safeGet(defaults[0], "Default HZS");
            
            if (defaultHZS && defaultHZS.length > 0) {
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
// VÝKAZ PRÁC
// ==============================================

function createNewWorkReport(customerObj, date, customerName) {
    try {
        var reportLib = libByName(CONFIG.libraries.workReport);
        if (!reportLib) return null;
        
        var workReport = reportLib.create({});
        
        // Nastav základné polia
        utils.safeSet(workReport, CONFIG.vykazFields.datum, date);
        utils.safeSet(workReport, CONFIG.vykazFields.identifikator, "VP-" + moment(date).format("YYYYMMDD"));
        utils.safeSet(workReport, CONFIG.vykazFields.popis, "Výkaz prác - " + customerName);
        utils.safeSet(workReport, CONFIG.vykazFields.typVykazu, "Podľa vykonaných prác");
        utils.safeSet(workReport, CONFIG.vykazFields.cenyPocitat, "Z cenovej ponuky");
        utils.safeSet(workReport, CONFIG.vykazFields.vydane, "Zákazka");
        utils.safeSet(workReport, CONFIG.vykazFields.zakazka, [customerObj]);
        
        // Info záznam
        var info = "📋 AUTOMATICKY VYTVORENÝ VÝKAZ\n";
        info += "=====================================\n\n";
        info += "📅 Dátum: " + utils.formatDate(date) + "\n";
        info += "📦 Zákazka: " + customerName + "\n";
        info += "⏰ Vytvorené: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
        info += "🔧 Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        info += "📂 Zdroj: Knižnica Záznam práce\n\n";
        info += "✅ VÝKAZ VYTVORENÝ ÚSPEŠNE";
        
        utils.safeSet(workReport, CONFIG.vykazFields.info, info);
        
        utils.addDebug(currentEntry, "  " + utils.getIcon("create") + " Nový výkaz vytvorený");
        
        return workReport;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createNewWorkReport", error);
        return null;
    }
}

function synchronizeWorkReport(customer, date, workedHours, hzsPrice) {
    try {
        if (!customer || customer.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadna zákazka - preskakujem výkaz");
            return;
        }
        
        var customerObj = customer[0];
        var customerName = utils.safeGet(customerObj, "Názov", "N/A");
        
        utils.addDebug(currentEntry, "  🔍 Hľadám výkaz pre zákazku: " + customerName);
        
        // Nájdi existujúci výkaz
        var existingReports = customerObj.linksFrom(CONFIG.libraries.workReport, CONFIG.vykazFields.zakazka);
        
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
        }
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "synchronizeWorkReport", error);
    }
}

function updateWorkReportLink(workReport, workedHours, hzsPrice) {
    try {
        var praceHZS = utils.safeGetLinks(workReport, CONFIG.vykazFields.praceHZS) || [];
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
            workReport.set(CONFIG.vykazFields.praceHZS, praceHZS);
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
        var vykazArray = workReport.field(CONFIG.vykazFields.praceHZS);
        
        if (!vykazArray || !vykazArray[index]) {
            utils.addError(currentEntry, "Nepodarilo sa získať pole výkazu na indexe " + index, "updateWorkReportAttributes");
            return;
        }
        
        // Získaj aktuálne údaje
        var workDescription = utils.safeGet(currentEntry, CONFIG.fields.workRecord.workDescription, "");
        var totalPrice = Math.round(workedHours * hzsPrice * 100) / 100;
        var date = utils.safeGet(currentEntry, CONFIG.fields.workRecord.date);
        var employees = utils.safeGetLinks(currentEntry, CONFIG.fields.workRecord.employees);
        
        // Nastav/aktualizuj všetky atribúty
        vykazArray[index].setAttr(CONFIG.vykazAttributes.workDescription, workDescription);
        vykazArray[index].setAttr(CONFIG.vykazAttributes.hoursCount, workedHours);
        vykazArray[index].setAttr(CONFIG.vykazAttributes.billedRate, hzsPrice);
        vykazArray[index].setAttr(CONFIG.vykazAttributes.totalPrice, totalPrice);
        
       
       
        
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
        var vykazArray = workReport.field(CONFIG.vykazFields.praceHZS);
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
        var existingInfo = utils.safeGet(workReport, CONFIG.vykazFields.info, "");
        
        // Pridaj informáciu o aktualizácii
        var updateInfo = "\n\n🔄 AKTUALIZOVANÉ: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
        updateInfo += "• Záznam práce #" + currentEntry.field("ID") + " bol aktualizovaný\n";
        updateInfo += "• Script: " + CONFIG.scriptName + " v" + CONFIG.version;
        
        // Obmedz dĺžku info poľa (zachovaj posledných 5000 znakov)
        var newInfo = existingInfo + updateInfo;
        if (newInfo.length > 5000) {
            newInfo = "... (skrátené) ...\n" + newInfo.substring(newInfo.length - 4900);
        }
        
        workReport.set(CONFIG.vykazFields.info, newInfo);
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri aktualizácii info poľa: " + error.toString(), "updateWorkReportInfo", error);
    }
}

// ==============================================
// INFO ZÁZNAMY
// ==============================================

function createInfoRecord(workTimeResult, employeeResult, hzsResult) {
    try {
        var date = currentEntry.field(CONFIG.fields.workRecord.date);
        var dateFormatted = utils.formatDate(date, "DD.MM.YYYY");
        
        var infoMessage = "📋 ZÁZNAM PRÁC - AUTOMATICKÝ PREPOČET\n";
        infoMessage += "═══════════════════════════════════\n";
        
        infoMessage += "📅 Dátum: " + dateFormatted + "\n";
        infoMessage += "⏰ Pracovný čas: " + utils.formatTime(workTimeResult.startTime) + 
                       " - " + utils.formatTime(workTimeResult.endTime) + "\n";
        infoMessage += "⏱️ Odpracované: " + workTimeResult.pracovnaDobaHodiny + " hodín\n\n";
        
        if (employeeResult.pocetPracovnikov > 0) {
            infoMessage += "👥 ZAMESTNANCI (" + employeeResult.pocetPracovnikov + " " + 
                          utils.selectOsobaForm(employeeResult.pocetPracovnikov) + ")\n";
            infoMessage += "───────────────────────────────────\n";
            
            for (var i = 0; i < employeeResult.detaily.length; i++) {
                var detail = employeeResult.detaily[i];
                infoMessage += "👤 " + (i+1) + ": " + utils.formatEmployeeName(detail.zamestnanec) + "\n";
                infoMessage += "  • Hodinovka: " + detail.hodinovka + " €/h\n";
                infoMessage += "  • Mzdové náklady: " + detail.mzdoveNaklady + " €\n\n";
            }
            
            infoMessage += "💰 Celkové mzdové náklady: " + utils.formatMoney(employeeResult.celkoveMzdy) + "\n\n";
        }
        
        if (hzsResult.price > 0) {
            infoMessage += "💵 HODINOVÁ ZÚČTOVACIA SADZBA:\n";
            infoMessage += "───────────────────────────────────\n";
            infoMessage += "  • Sadzba: " + hzsResult.price + " €/h\n";
            infoMessage += "  • Suma HZS: " + utils.formatMoney(hzsResult.sum) + "\n\n";
        }
        
        var customer = utils.safeGetLinks(currentEntry, CONFIG.fields.workRecord.customer);
        if (customer && customer.length > 0) {
            infoMessage += "📦 Zákazka: " + utils.safeGet(customer[0], "Názov", "N/A") + "\n";
        }
        
        var workDescription = utils.safeGet(currentEntry, CONFIG.fields.workRecord.workDescription);
        if (workDescription) {
            infoMessage += "\n🔨 VYKONANÉ PRÁCE:\n";
            infoMessage += "───────────────────────────────────\n";
            infoMessage += workDescription + "\n";
        }
        
        infoMessage += "\n🔧 TECHNICKÉ INFO:\n";
        infoMessage += "• Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        infoMessage += "• Čas spracovania: " + moment().format("HH:mm:ss") + "\n";
        infoMessage += "• MementoUtils: v" + (utils.version || "N/A") + "\n";
        
        infoMessage += "\n✅ PREPOČET DOKONČENÝ ÚSPEŠNE";
        
        currentEntry.set(CONFIG.fields.info, infoMessage);
        
        utils.addDebug(currentEntry, "✅ Info záznam vytvorený");
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createInfoRecord", error);
        return false;
    }
}

function createTelegramInfoRecord(workTimeResult, employeeResult, hzsResult) {
    try {
        var date = currentEntry.field(CONFIG.fields.workRecord.date);
        var dateFormatted = utils.formatDate(date, "DD.MM.YYYY");

        // HTML formátovaná správa
        var telegramInfo = "🔨 <b>ZÁZNAM PRÁC</b>\n";
        telegramInfo += "═══════════════════════════════════\n\n";
        
        telegramInfo += "📅 <b>Dátum:</b> " + dateFormatted + "\n";
        telegramInfo += "⏰ <b>Pracovný čas:</b> " + utils.formatTime(workTimeResult.startTime) + 
                        " - " + utils.formatTime(workTimeResult.endTime) + "\n";
        telegramInfo += "⏱️ <b>Odpracované:</b> " + workTimeResult.pracovnaDobaHodiny + " hodín\n\n";
        
        if (employeeResult.pocetPracovnikov > 0) {
            telegramInfo += "👥 <b>ZAMESTNANCI</b> (" + employeeResult.pocetPracovnikov + " " + 
                            utils.selectOsobaForm(employeeResult.pocetPracovnikov) + ")\n";
            telegramInfo += "───────────────────────────────────\n";
            
            for (var i = 0; i < employeeResult.detaily.length; i++) {
                var detail = employeeResult.detaily[i];
                var empName = utils.formatEmployeeName(detail.zamestnanec);
                
                telegramInfo += "• <b>" + empName + "</b>\n";
                telegramInfo += "  💶 Hodinovka: " + detail.hodinovka + " €/h\n";
                telegramInfo += "  💰 <b>Mzdové náklady: " + detail.mzdoveNaklady + " €</b>\n\n";
            }
            
            telegramInfo += "💰 <b>Celkové mzdové náklady: " + utils.formatMoney(employeeResult.celkoveMzdy) + "</b>\n\n";
        }
        
        if (hzsResult.price > 0) {
            telegramInfo += "💵 <b>HODINOVÁ ZÚČTOVACIA SADZBA</b>\n";
            telegramInfo += "───────────────────────────────────\n";
            telegramInfo += "• Sadzba: <b>" + hzsResult.price + " €/h</b>\n";
            telegramInfo += "• Suma HZS: <b>" + utils.formatMoney(hzsResult.sum) + "</b>\n\n";
        }
        
        var customer = utils.safeGetLinks(currentEntry, CONFIG.fields.workRecord.customer);
        if (customer && customer.length > 0) {
            telegramInfo += "📦 <b>Zákazka:</b> " + utils.safeGet(customer[0], "Názov", "N/A") + "\n";
        }
        
        var workDescription = utils.safeGet(currentEntry, CONFIG.fields.workRecord.workDescription);
        if (workDescription) {
            telegramInfo += "\n🔨 <b>VYKONANÉ PRÁCE:</b>\n";
            telegramInfo += workDescription + "\n";
        }
        
        telegramInfo += "\n🔧 <i>Script: " + CONFIG.scriptName + " v" + CONFIG.version + "</i>\n";
        telegramInfo += "⏰ <i>Spracované: " + moment().format("HH:mm:ss") + "</i>\n";
        telegramInfo += "📝 <i>Záznam #" + currentEntry.field("ID") + "</i>";
        
        // Ulož do poľa info_telegram
        currentEntry.set(CONFIG.fields.infoTelegram, telegramInfo);
        
        utils.addDebug(currentEntry, utils.getIcon("success") + " Info_telegram záznam vytvorený");
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createTelegramInfoRecord", error);
        return false;
    }
}

// ==============================================
// FINÁLNY SÚHRN
// ==============================================

function zobrazSuhrn(employeeResult, hzsResult) {
    var summaryData = {
        success: true,
        date: currentEntry.field(CONFIG.fields.workRecord.date),
        employeeCount: employeeResult.pocetPracovnikov,
        totalHours: currentEntry.field(CONFIG.fields.workedHours),
        totalCosts: employeeResult.celkoveMzdy,
        hzsSum: hzsResult.sum,
        errors: []
    };
    
    utils.showProcessingSummary(currentEntry, summaryData, CONFIG);
}
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