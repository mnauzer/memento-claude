// ==============================================
// DOCHÁDZKA PREPOČET - AUTOMATICKÝ VÝPOČET
// Verzia: 8.2.0 | Dátum: 2026-03-19 | Autor: ASISTANTO
// Knižnica: Dochádzka | Trigger: Before Save
// ==============================================
// 📋 FUNKCIA:
//    - Automatický výpočet odpracovaných hodín
//    - Výpočet prestávok podľa pracovnej doby
//    - Výpočet mzdových nákladov pre všetkých zamestnancov
//    - Kontrola víkendov a sviatkov
//    - Nastavenie atribútov na zamestnancoch
// ==============================================

// ==============================================
// INICIALIZÁCIA MODULOV
// ==============================================


// Jednoduchý import všetkého cez MementoUtils
var utils = MementoUtils;
var config = utils.getConfig();
var centralConfig = utils.config;
var currentEntry = entry();

var CONFIG = {
    // Script špecifické nastavenia
    scriptName: "Dochádzka Prepočet",
    version: "8.2.0",  // Refaktorizácia - odstránené Na zákazkách/Prestoje, Markdown v info, opravené kroky
    
    // Referencie na centrálny config
    fields: {
        place: centralConfig.fields.place,
        vehicle: centralConfig.fields.vehicle,
        bookOfRides: centralConfig.fields.bookOfRides,
        account: centralConfig.fields.account,
        notifications: centralConfig.fields.notifications,
        rideLog: centralConfig.fields.rideLog,
        cashBook: centralConfig.fields.cashBook,
        workRecord: centralConfig.fields.workRecord,
        attendance: centralConfig.fields.attendance,
        obligations: centralConfig.fields.obligations,
        common: centralConfig.fields.common,
        // Pridané mapovanie pre arrival/departure polia
        date: centralConfig.fields.attendance.date,
        employees: centralConfig.fields.attendance.employees,
        arrival: centralConfig.fields.attendance.arrival,      // "Príchod"
        departure: centralConfig.fields.attendance.departure,  // "Odchod"
        pracovnaDoba: centralConfig.fields.attendance.workTime, // "Pracovná doba"
        odpracovane: centralConfig.fields.attendance.workedHours, // "Odpracované"
        pocetPracovnikov: centralConfig.fields.attendance.employeeCount, // "Počet pracovníkov"
        info: centralConfig.fields.common.info
    },
    attributes: centralConfig.fields.attendance.employeeAttributes,
    libraries: centralConfig.libraries,
    icons: centralConfig.icons,
    
    // Lokálne nastavenia pre tento script
    settings: {
        roundToQuarterHour: true,  // VYPNUTÉ - ako quickfix!
        roundDirection: "nearest", // "up", "down", "nearest"
        includeBreaks: true,
        breakThreshold: 6, // hodín
        breakDuration: 30  // minút
    },

     // Konštanty pre záväzky - s fallback hodnotami
    obligationTypes: {
        wages:  centralConfig.constants.obligationTypes.wages,
               
    },
    obligationStates: {
        paid: (centralConfig.constants && centralConfig.constants.obligationStates)
              ? centralConfig.constants.obligationStates.paid
              : "Zaplatené",
        unpaid: (centralConfig.constants && centralConfig.constants.obligationStates)
                ? centralConfig.constants.obligationStates.unpaid
                : "Nezaplatené",
        partiallyPaid: (centralConfig.constants && centralConfig.constants.obligationStates)
                       ? centralConfig.constants.obligationStates.partiallyPaid
                       : "Čiastočne zaplatené"
    },
    
    // Správne mapovanie pre sadzby
    sadzbyFields: centralConfig.fields.wages
};

function validateInputData() {
    try {
        // Použiť univerzálnu validáciu z MementoCore
        var options = {
            config: CONFIG,
            customMessages: {
                date: "Dátum nie je vyplnený",
                arrival: "Príchod nie je vyplnený",
                departure: "Odchod nie je vyplnený",
                employees: "Žiadni zamestnanci v zázname"
            }
        };

        var result = utils.validateInputData(currentEntry, "attendance", options);

        if (!result.success) {
            return result;
        }

        // Pridaj doplňujúce debug informácie
        utils.addDebug(currentEntry, "  • Dátum: " + moment(result.data.date).format("DD.MM.YYYY") + " (" + utils.getDayNameSK(moment(result.data.date).day()).toUpperCase() + ")");
        utils.addDebug(currentEntry, "  • Čas: " + moment(result.data.arrival).format("HH:mm") + " - " + moment(result.data.departure).format("HH:mm"));
        utils.addDebug(currentEntry, "  • Počet zamestnancov: " + result.data.employees.length);

        return result;

    } catch (error) {
        utils.addError(currentEntry, error.toString(), "validateInputData", error);
        return { success: false, error: error.toString() };
    }
}

function calculateWorkTime(arrival, departure) {
    try {
        // Priprav options pre univerzálnu funkciu z business modulu
        var options = {
            entry: currentEntry,
            config: CONFIG,
            roundToQuarter: CONFIG.settings.roundToQuarterHour,
            startFieldName: CONFIG.fields.attendance.arrival,
            endFieldName: CONFIG.fields.attendance.departure,
            workTimeFieldName: CONFIG.fields.attendance.workTime,
            debugLabel: "Pracovná doba"
        };

        // Volaj univerzálnu funkciu z business modulu cez utils
        var result = utils.calculateWorkTime(arrival, departure, options);

        // Pre spätnu kompatibilitu mapuj názvy výstupných polí
        if (result.success) {
            result.arrivalRounded = result.startTimeRounded;
            result.departureRounded = result.endTimeRounded;
            result.arrivalOriginal = result.startTimeOriginal;
            result.departureOriginal = result.endTimeOriginal;
        }

        return result;
    }   catch (error) {
        utils.addError(currentEntry, error.toString(), "calculateWorkTime", error);
        return { success: false, error: error.toString() };
    }   
}
// ==============================================
// KROK 3: SPRACOVANIE ZAMESTNANCOV
// ==============================================

function processEmployees(zamestnanci, pracovnaDobaHodiny, datum) {
    // Priprav options pre univerzálnu funkciu z business modulu
    var options = {
        entry: currentEntry,
        config: CONFIG,
        employeeFieldName: CONFIG.fields.attendance.employees,
        attributes: CONFIG.attributes,
        includeExtras: true,  // Dochádzka používa príplatky/prémie/pokuty
        processObligations: true,  // Dochádzka spracováva záväzky
        processObligation: processObligation,  // Lokálna funkcia pre záväzky
        findLinkedObligations: utils.findLinkedObligations,
        libraryType: 'attendance'
    };

    // Volaj univerzálnu funkciu z business modulu cez utils
    return utils.processEmployees(zamestnanci, pracovnaDobaHodiny, datum, options);
}

function processObligation(date, empData, obligations) {
    var employee = empData.entry;
    var result = {
        created: 0,
        updated: 0,
        errors: 0,
        total: 0,
        totalAmount: 0,
        success: false
    };
   
    try {
        utils.addDebug(currentEntry, utils.getIcon("search") +
        " Hľadám záväzok " + utils.formatEmployeeName(employee));
        try {
            // Nájdi existujúci záväzok pre tohto zamestnanca
            var existingObligation = null;
            for (var j = 0; j < obligations.length; j++) {
                var obligation = obligations[j];
                var linkedEmployee = utils.safeGetLinks(obligation, CONFIG.fields.obligations.employee);
          
                if (linkedEmployee && linkedEmployee.length > 0 && 
                    linkedEmployee[0].field("ID") === employee.field("ID")) {
                        utils.addDebug(currentEntry, utils.getIcon("exclamation") + "nájdený záväzok" )
                        existingObligation = obligation;
                    break;
                }
            }

            if (existingObligation) {
                // Aktualizuj existujúci
                if (utils.updateObligation(date, existingObligation, empData.dailyWage)) {
                    result.updated++;
                    result.totalAmount += empData.dailyWage;
                } else {
                    result.errors++;
                }
            } else {
                // Vytvor nový
                if (utils.createObligation(date, empData, "attendance")) {
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
        
        result.success = result.errors === 0 && result.total > 0;
        
        
        
        return result;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba pri spracovaní: " + error.toString(), "processObligations", error);
        return result;
    }
}

// ==============================================
// KROK 4: CELKOVÉ VÝPOČTY
// ==============================================

function setEntryFields(employeeResult, entryIcons, entryStatus) {
    try {
        // Ulož celkové hodnoty
        utils.safeSet(currentEntry, CONFIG.fields.attendance.workedHours, employeeResult.odpracovaneTotal);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.wageCosts, employeeResult.celkoveMzdy);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.entryIcons, entryIcons);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.entryStatus, entryStatus);

        utils.addDebug(currentEntry, "  • Pracovná doba: " + employeeResult.pracovnaDoba + " hodín");
        utils.addDebug(currentEntry, "  • Odpracované spolu: " + employeeResult.odpracovaneTotal + " hodín");
        utils.addDebug(currentEntry, "  • Mzdové náklady: " + utils.formatMoney(employeeResult.celkoveMzdy));
        utils.addDebug(currentEntry, " Celkové výpočty úspešné", "success");

        return {
            success: true
        };

    } catch (error) {
        utils.addError(currentEntry, error.toString(), "setEntryFields", error);
        return false;
    }
}

function logFinalSummary(steps) {
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
            var date = utils.safeGet(currentEntry, CONFIG.fields.attendance.date);
            var dateFormatted = utils.formatDate(date, "DD.MM.YYYY");
            var employeeCount = utils.safeGet(currentEntry, CONFIG.fields.attendance.employeeCount, 0);
            var totalHours = utils.safeGet(currentEntry, CONFIG.fields.attendance.workedHours, 0);
            var totalCosts = utils.safeGet(currentEntry, CONFIG.fields.attendance.wageCosts, 0);

            var summaryMsg = "✅ PREPOČET DOKONČENÝ\n\n";
            summaryMsg += "📅 " + dateFormatted + "\n";
            summaryMsg += "━━━━━━━━━━━━━━━━━━━━━\n";
            summaryMsg += "👥 Počet zamestnancov: " + employeeCount + "\n";
            summaryMsg += "⏱️ Odpracované: " + totalHours.toFixed(2) + " h\n";
            summaryMsg += "💰 Mzdové náklady: " + utils.formatMoney(totalCosts) + "\n";
            summaryMsg += "━━━━━━━━━━━━━━━━━━━━━\n";
            summaryMsg += "ℹ️ Detaily v poli 'info'";

            message(summaryMsg);
        } else {
            utils.addDebug(currentEntry, "\n⚠️ Niektoré kroky zlyhali!");
            message("⚠️ Prepočet dokončený s chybami.\nSkontrolujte Debug Log.");
        }

        utils.addDebug(currentEntry, "⏱️ Čas ukončenia: " + moment().format("HH:mm:ss"));
        utils.addDebug(currentEntry, "📋 === KONIEC " + CONFIG.scriptName + " v" + CONFIG.version + " ===");

    } catch (error) {
        utils.addError(currentEntry, error.toString(), "logFinalSummary", error);
    }
}

// ==============================================
// KROK 5: VYTVORENIE INFO ZÁZNAMU
// ==============================================

function createInfoRecord(workTimeResult, employeeResult) {
    try {
        var date = currentEntry.field(CONFIG.fields.attendance.date);
        var dateFormatted = utils.formatDate(date, "DD.MM.YYYY");
        var dayName = utils.getDayNameSK(moment(date).day()).toUpperCase();

        var infoMessage = "# 📋 DOCHÁDZKA - AUTOMATICKÝ PREPOČET\n\n";

        infoMessage += "## 📅 Základné údaje \n";
        infoMessage += "- **Dátum:** " + dateFormatted + " (" + dayName + ")\n";
        infoMessage += "- **Pracovný čas:** " + moment(workTimeResult.arrivalRounded).format("HH:mm") +
                       " - " + moment(workTimeResult.departureRounded).format("HH:mm") + "\n";
        infoMessage += "- **Pracovná doba:** " + workTimeResult.pracovnaDobaHodiny + " hodín\n\n";

        infoMessage += "## 👥 ZAMESTNANCI (" + employeeResult.pocetPracovnikov + " " + utils.selectOsobaForm(employeeResult.pocetPracovnikov) + ")\n\n";

        for (var i = 0; i < employeeResult.detaily.length; i++) {
            var detail = employeeResult.detaily[i];
            infoMessage += "### 👤 " + utils.formatEmployeeName(employeeResult.detaily[i].zamestnanec) + "\n";
            infoMessage += "- **Hodinovka:** " + detail.hodinovka + " €/h\n";
            if (detail.priplatok > 0) infoMessage += "- **Príplatok:** +" + detail.priplatok + " €/h\n";
            if (detail.premia > 0) infoMessage += "- **Prémia:** +" + detail.premia + " €\n";
            if (detail.pokuta > 0) infoMessage += "- **Pokuta:** -" + detail.pokuta + " €\n";
            infoMessage += "- **Denná mzda:** " + detail.dennaMzda + " €\n\n";
        }

        infoMessage += "## 💰 SÚHRN\n"
        infoMessage += "- **Odpracované celkom:** " + employeeResult.odpracovaneTotal + " hodín\n";
        infoMessage += "- **Mzdové náklady:** " + utils.formatMoney(employeeResult.celkoveMzdy) + "\n\n";

        infoMessage += "## 🔧 TECHNICKÉ INFORMÁCIE\n";
        infoMessage += "- **Script:** " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        infoMessage += "- **Čas spracovania:** " + moment().format("HH:mm:ss") + "\n";
        infoMessage += "- **MementoUtils:** v" + (utils.version || "N/A") + "\n";

        if (typeof MementoConfig !== 'undefined') {
            infoMessage += "- **MementoConfig:** v" + MementoConfig.version + "\n";
        }

        infoMessage += "\n---\n**✅ PREPOČET DOKONČENÝ ÚSPEŠNE**";

        currentEntry.set(CONFIG.fields.info, infoMessage);

        utils.addDebug(currentEntry, "✅ Info záznam vytvorený s Markdown formátovaním");

        return true;

    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createInfoRecord", error);
        return false;
    }
}

// ==============================================
// FINÁLNY SÚHRN
// ==============================================
function markCheckbox() {
    try {
        utils.safeSet(currentEntry, CONFIG.fields.obligations.obligations, true);
        utils.addDebug(currentEntry, "☑️ Checkbox Záväzky označený");
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri označovaní checkboxu: " + error.toString(), "markCheckbox");
    }
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        var depCheck = utils.checkDependencies(['config', 'core', 'business']);
        if (!depCheck.success) {
            utils.addError(currentEntry, "Chýbajú potrebné moduly: " + depCheck.missing.join(", "), "main");
            message("❌ Chýbajú potrebné moduly!\n\n" + depCheck.missing.join(", "));
            return false;
        }
        utils.clearLogs(currentEntry, true);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.entryIcons, "");
        utils.addDebug(currentEntry, "=== DOCHÁDZKA PREPOČET ===");
        utils.addDebug(currentEntry, "MementoUtils verzia: " + utils.version);
        // Kontrola závislostí
         // KONTROLA ČI MÁ SCRIPT BEŽAŤ
         var entryStatus = utils.safeGet(currentEntry, CONFIG.fields.attendance.entryStatus, []);
         var entryIcons = utils.safeGet(currentEntry, CONFIG.fields.attendance.entryIcons, null);
         
         if (entryStatus.indexOf("Voľno") !== -1) {
            message("Záznam je nastavený na: " + utils.safeGet(currentEntry, CONFIG.fields.attendance.dayOffReason));
            var dayOffReason = utils.safeGet(currentEntry, CONFIG.fields.attendance.dayOffReason, null);
            if (dayOffReason === "Dažď") {
                utils.safeSet(currentEntry, CONFIG.fields.attendance.entryIcons, CONFIG.icons.weather_delay);
            } else if (dayOffReason === "Voľný deň") {
                utils.safeSet(currentEntry, CONFIG.fields.attendance.entryIcons, CONFIG.icons.vacation);
            } else if (dayOffReason === "Dovolenka") {
                utils.safeSet(currentEntry, CONFIG.fields.attendance.entryIcons, CONFIG.icons.vacation);
            } else if (dayOffReason === "Voľno - mokrý terén") {
                utils.safeSet(currentEntry, CONFIG.fields.attendance.entryIcons, CONFIG.icons.soil_wet);
            }
            utils.setColor(currentEntry, "bg", "light gray");
            exit();
        }

        // Debug info o načítaných moduloch
        utils.addDebug(currentEntry, "=== ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===", "start");
        utils.addDebug(currentEntry, "Čas spustenia: " + utils.formatDate(moment()) ,"calendar");

        // Kroky prepočtu
        var steps = {
            step1: { success: false, name: "Načítanie a validácia dát" },
            step2: { success: false, name: "Výpočet pracovnej doby" },
            step3: { success: false, name: "Spracovanie zamestnancov" },
            step4: { success: false, name: "Celkové výpočty" },
            step5: { success: false, name: "Vytvorenie info záznamu" },
            step6: { success: false, name: "Spracovanie Denný report" },
        };

        // KROK 1: Načítanie a validácia dát
        utils.addDebug(currentEntry, " KROK 1: Načítanie a validácia dát", "validation");
        var validationResult = validateInputData();  // ✅ Volaj bez parametrov
        if (!validationResult.success) {
            utils.addError(currentEntry, "Validácia zlyhala: " + validationResult.error, CONFIG.scriptName);
            message("❌ " + validationResult.error);
            return false;
        }
        steps.step1.success = true;

        // KROK 2: Výpočet pracovného času
        utils.addDebug(currentEntry, " KROK 2: Výpočet pracovnej doby", "update");
        
        var workTimeResult = calculateWorkTime(validationResult.data.arrival, validationResult.data.departure);    
        if (!workTimeResult.success) {
            utils.addError(currentEntry, "Výpočet času zlyhal: " + workTimeResult.error, CONFIG.scriptName);
            return false;
        }
        steps.step2.success = workTimeResult.success;
        
        // KROK 3: Spracovanie zamestnancov
        utils.addDebug(currentEntry, " KROK 3: Spracovanie zamestnancov", "group");
        var employeeResult = processEmployees(validationResult.data.employees, workTimeResult.pracovnaDobaHodiny, validationResult.data.date);
        if(employeeResult.success) {
            if (entryStatus.indexOf("Záväzky") === -1) {
                 entryStatus.push("Záväzky");
                }
            if(employeeResult.created || employeeResult.updated > 0){
                entryIcons += CONFIG.icons.obligations;
            }
        }
        steps.step3.success = employeeResult.success;

        // KROK 4: Celkové výpočty
        utils.addDebug(currentEntry, " KROK 4: Celkové výpočty", "calculation");
        var totals = setEntryFields(employeeResult, entryIcons, entryStatus)
        steps.step4.success = totals.success;

        // KROK 5: Vytvorenie info záznamu
        utils.addDebug(currentEntry, " KROK 5: Vytvorenie info záznamu", "note");
        steps.step5.success = createInfoRecord(workTimeResult, employeeResult);

        // KROK 6: Vytvorenie/aktualizácia Denný report
        utils.addDebug(currentEntry, " KROK 6: Spracovanie Denný report", "note");
        var dailyReportResult = utils.createOrUpdateDailyReport(currentEntry, 'attendance', {
            debugEntry: currentEntry,
            createBackLink: false  // Zatiaľ bez spätného linku
        });
        steps.step6.success = dailyReportResult.success;

        if (dailyReportResult.success) {
            var action = dailyReportResult.created ? "vytvorený" : "aktualizovaný";
            utils.addDebug(currentEntry, "✅ Denný report " + action + " úspešne");
        } else {
            utils.addDebug(currentEntry, "⚠️ Chyba pri spracovaní Denný report: " + (dailyReportResult.error || "Neznáma chyba"));
        }
        
        var isHoliday = utils.isHoliday(validationResult.data.date);
        var isWeekend = utils.isWeekend(validationResult.data.date);
         //var farba = "#FFFFFF"; // Biela - štandard
        if (isHoliday) {
            utils.setColor(currentEntry, "bg", "pastel blue")
        } else if (isWeekend) {
            utils.setColor(currentEntry, "bg", "pastel orange")
        }

        // Kontrola úspešnosti všetkých krokov
        var allSuccess = true;
        for (var step in steps) {
            if (!steps[step].success) {
                allSuccess = false;
                break;
            }
        }

        // Záverečný súhrn
        logFinalSummary(steps);
        utils.addDebug(currentEntry, "\n✅ === PREPOČET DOKONČENÝ ===");

        return allSuccess;
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        message("❌ Kritická chyba! Line: " + error.lineNumber + ": " + error.toString());
        return false;
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

// Spustenie hlavnej funkcie
var result = main();

// Ak hlavná funkcia zlyhala, zruš uloženie
if (!result) {
    utils.addError(currentEntry, "Script zlyhal - zrušené uloženie", "main");
    cancel();
}