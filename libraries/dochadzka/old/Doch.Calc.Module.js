// ==============================================
// DOCHÁDZKA PREPOČET - MODUL
// Verzia: 9.0.4 | Dátum: 2026-03-19 | Autor: ASISTANTO
// Knižnica: Dochádzka | Typ: Module
// ==============================================
// 📋 FUNKCIA:
//    - Automatický výpočet odpracovaných hodín
//    - Výpočet prestávok podľa pracovnej doby
//    - Výpočet mzdových nákladov pre všetkých zamestnancov
//    - Kontrola víkendov a sviatkov
//    - Nastavenie atribútov na zamestnancoch
//    - Výpočet a uloženie dňa v týždni
// ==============================================
// 🔧 POUŽITIE:
//    var DochadzkaCalc = require('Doch.Calc.Module');
//    var result = DochadzkaCalc.calculate(entry());
// ==============================================

var DochadzkaCalcModule = (function() {
    'use strict';

    // ==============================================
    // INICIALIZÁCIA MODULOV
    // ==============================================

    var utils = MementoUtils;
    var centralConfig = utils.config;

    var CONFIG = {
        // Script špecifické nastavenia
        scriptName: "Dochádzka Prepočet (Modul)",
        version: "9.0.4",  // Opravený findLinkedObligations + scope problémy

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
            arrival: centralConfig.fields.attendance.arrival,
            departure: centralConfig.fields.attendance.departure,
            pracovnaDoba: centralConfig.fields.attendance.workTime,
            odpracovane: centralConfig.fields.attendance.workedHours,
            pocetPracovnikov: centralConfig.fields.attendance.employeeCount,
            info: centralConfig.fields.common.info,
            // NOVÉ: Pole pre deň v týždni
            dayOfWeek: centralConfig.fields.attendance.dayOfWeek
        },
        attributes: centralConfig.fields.attendance.employeeAttributes,
        libraries: centralConfig.libraries,
        icons: centralConfig.icons,

        // Lokálne nastavenia pre tento script
        settings: {
            roundToQuarterHour: true,
            roundDirection: "nearest",
            includeBreaks: true,
            breakThreshold: 6,
            breakDuration: 30
        },

        // Konštanty pre záväzky
        obligationTypes: {
            wages: centralConfig.constants.obligationTypes.wages,
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

        sadzbyFields: centralConfig.fields.wages
    };

    // ==============================================
    // POMOCNÉ FUNKCIE
    // ==============================================

    /**
     * Výpočet a nastavenie dňa v týždni
     */
    function calculateAndSetDayOfWeek(currentEntry, date) {
        try {
            var dayIndex = moment(date).day();
            var dayName = utils.getDayNameSK(dayIndex);

            utils.safeSet(currentEntry, CONFIG.fields.dayOfWeek, dayName);
            utils.addDebug(currentEntry, "  • Deň v týždni: " + dayName);

            return {
                success: true,
                dayName: dayName,
                dayIndex: dayIndex
            };
        } catch (error) {
            utils.addError(currentEntry, error.toString(), "calculateAndSetDayOfWeek", error);
            return {
                success: false,
                error: error.toString()
            };
        }
    }

    /**
     * Validácia vstupných dát
     */
    function validateInputData(currentEntry) {
        try {
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

            utils.addDebug(currentEntry, "  • Dátum: " + moment(result.data.date).format("DD.MM.YYYY") + " (" + utils.getDayNameSK(moment(result.data.date).day()).toUpperCase() + ")");
            utils.addDebug(currentEntry, "  • Čas: " + moment(result.data.arrival).format("HH:mm") + " - " + moment(result.data.departure).format("HH:mm"));
            utils.addDebug(currentEntry, "  • Počet zamestnancov: " + result.data.employees.length);

            return result;

        } catch (error) {
            utils.addError(currentEntry, error.toString(), "validateInputData", error);
            return { success: false, error: error.toString() };
        }
    }

    /**
     * Výpočet pracovnej doby
     */
    function calculateWorkTime(currentEntry, arrival, departure) {
        try {
            var options = {
                entry: currentEntry,
                config: CONFIG,
                roundToQuarter: CONFIG.settings.roundToQuarterHour,
                startFieldName: CONFIG.fields.attendance.arrival,
                endFieldName: CONFIG.fields.attendance.departure,
                workTimeFieldName: CONFIG.fields.attendance.workTime,
                debugLabel: "Pracovná doba"
            };

            var result = utils.calculateWorkTime(arrival, departure, options);

            if (result.success) {
                result.arrivalRounded = result.startTimeRounded;
                result.departureRounded = result.endTimeRounded;
                result.arrivalOriginal = result.startTimeOriginal;
                result.departureOriginal = result.endTimeOriginal;
            }

            return result;
        } catch (error) {
            utils.addError(currentEntry, error.toString(), "calculateWorkTime", error);
            return { success: false, error: error.toString() };
        }
    }

    /**
     * Vytvorenie info záznamu
     */
    function createInfoRecord(currentEntry, workTimeResult, employeeResult) {
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

            // OPRAVA: Kontrola či existuje detaily
            if (employeeResult.detaily && employeeResult.detaily.length > 0) {
                for (var i = 0; i < employeeResult.detaily.length; i++) {
                    var detail = employeeResult.detaily[i];
                    infoMessage += "### 👤 " + utils.formatEmployeeName(detail.zamestnanec) + "\n";
                    infoMessage += "- **Hodinovka:** " + detail.hodinovka + " €/h\n";
                    if (detail.priplatok > 0) infoMessage += "- **Príplatok:** +" + detail.priplatok + " €/h\n";
                    if (detail.premia > 0) infoMessage += "- **Prémia:** +" + detail.premia + " €\n";
                    if (detail.pokuta > 0) infoMessage += "- **Pokuta:** -" + detail.pokuta + " €\n";
                    infoMessage += "- **Denná mzda:** " + detail.dennaMzda + " €\n\n";
                }
            }

            infoMessage += "## 💰 SÚHRN\n";
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

    /**
     * Nastavenie polí v zázname
     */
    function setEntryFields(currentEntry, employeeResult, entryIcons, entryStatus) {
        try {
            utils.safeSet(currentEntry, CONFIG.fields.attendance.workedHours, employeeResult.odpracovaneTotal);
            utils.safeSet(currentEntry, CONFIG.fields.attendance.wageCosts, employeeResult.celkoveMzdy);
            utils.safeSet(currentEntry, CONFIG.fields.attendance.entryIcons, entryIcons);
            utils.safeSet(currentEntry, CONFIG.fields.attendance.entryStatus, entryStatus);

            utils.addDebug(currentEntry, "  • Pracovná doba: " + employeeResult.pracovnaDoba + " hodín");
            utils.addDebug(currentEntry, "  • Odpracované spolu: " + employeeResult.odpracovaneTotal + " hodín");
            utils.addDebug(currentEntry, "  • Mzdové náklady: " + utils.formatMoney(employeeResult.celkoveMzdy));
            utils.addDebug(currentEntry, " Celkové výpočty úspešné", "success");

            return { success: true };

        } catch (error) {
            utils.addError(currentEntry, error.toString(), "setEntryFields", error);
            return { success: false };
        }
    }

    /**
     * Finálny súhrn
     */
    function logFinalSummary(currentEntry, steps) {
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

                var date = utils.safeGet(currentEntry, CONFIG.fields.attendance.date);
                var dateFormatted = utils.formatDate(date, "DD.MM.YYYY");
                var dayName = utils.safeGet(currentEntry, CONFIG.fields.dayOfWeek, "");
                var employeeCount = utils.safeGet(currentEntry, CONFIG.fields.attendance.employeeCount, 0);
                var totalHours = utils.safeGet(currentEntry, CONFIG.fields.attendance.workedHours, 0);
                var totalCosts = utils.safeGet(currentEntry, CONFIG.fields.attendance.wageCosts, 0);

                var summaryMsg = "✅ PREPOČET DOKONČENÝ\n\n";
                summaryMsg += "📅 " + dateFormatted + " (" + dayName + ")\n";
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
    // HLAVNÁ FUNKCIA MODULU
    // ==============================================

    /**
     * Hlavná funkcia pre výpočet dochádzky
     */
    function calculate(currentEntry, options) {
        options = options || {};

        try {
            // Kontrola závislostí
            var depCheck = utils.checkDependencies(['config', 'core', 'business']);
            if (!depCheck.success) {
                utils.addError(currentEntry, "Chýbajú potrebné moduly: " + depCheck.missing.join(", "), "calculate");
                return {
                    success: false,
                    error: "Chýbajú potrebné moduly: " + depCheck.missing.join(", ")
                };
            }

            // VNÚTORNÁ FUNKCIA: Spracovanie záväzku
            // OPRAVA: currentEntry je teraz v closure scope
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

                    var existingObligation = null;
                    for (var j = 0; j < obligations.length; j++) {
                        var obligation = obligations[j];
                        var linkedEmployee = utils.safeGetLinks(obligation, CONFIG.fields.obligations.employee);

                        if (linkedEmployee && linkedEmployee.length > 0 &&
                            linkedEmployee[0].field("ID") === employee.field("ID")) {
                            utils.addDebug(currentEntry, utils.getIcon("exclamation") + "nájdený záväzok");
                            existingObligation = obligation;
                            break;
                        }
                    }

                    if (existingObligation) {
                        if (utils.updateObligation(date, existingObligation, empData.dailyWage)) {
                            result.updated++;
                            result.totalAmount += empData.dailyWage;
                        } else {
                            result.errors++;
                        }
                    } else {
                        if (utils.createObligation(date, empData, "attendance")) {
                            result.created++;
                            result.totalAmount += empData.dailyWage;
                        } else {
                            result.errors++;
                        }
                    }

                    result.total++;
                    result.success = result.errors === 0 && result.total > 0;

                    return result;

                } catch (error) {
                    utils.addError(currentEntry, "Kritická chyba pri spracovaní: " + error.toString(), "processObligations", error);
                    return result;
                }
            }

            // VNÚTORNÁ FUNKCIA: Wrapper pre findLinkedObligations
            // OPRAVA: Musí mať prístup k currentEntry cez closure
            function findLinkedObligationsWrapper(creditor) {
                try {
                    var creditorField = CONFIG.fields.obligations[creditor];
                    return utils.safeGetLinksFrom(currentEntry, CONFIG.libraries.obligations, creditorField);
                } catch (error) {
                    utils.addError(currentEntry, "Chyba pri hľadaní záväzkov: " + error.toString(), "findLinkedObligations");
                    return [];
                }
            }

            // VNÚTORNÁ FUNKCIA: Spracovanie zamestnancov
            // OPRAVA: currentEntry je v closure scope
            function processEmployees(zamestnanci, pracovnaDobaHodiny, datum) {
                var opts = {
                    entry: currentEntry,
                    config: CONFIG,
                    employeeFieldName: CONFIG.fields.attendance.employees,
                    attributes: CONFIG.attributes,
                    includeExtras: true,
                    processObligations: true,
                    processObligation: processObligation,
                    findLinkedObligations: findLinkedObligationsWrapper,  // OPRAVA: Použiť wrapper
                    libraryType: 'attendance'
                };

                return utils.processEmployees(zamestnanci, pracovnaDobaHodiny, datum, opts);
            }

            // Inicializácia
            utils.clearLogs(currentEntry, true);
            utils.safeSet(currentEntry, CONFIG.fields.attendance.entryIcons, "");
            utils.addDebug(currentEntry, "=== " + CONFIG.scriptName + " ===");
            utils.addDebug(currentEntry, "MementoUtils verzia: " + utils.version);

            // KONTROLA ČI MÁ SCRIPT BEŽAŤ
            var entryStatus = utils.safeGet(currentEntry, CONFIG.fields.attendance.entryStatus, []);
            var entryIcons = utils.safeGet(currentEntry, CONFIG.fields.attendance.entryIcons, null);

            if (entryStatus.indexOf("Voľno") !== -1) {
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

                return {
                    success: true,
                    skipped: true,
                    reason: dayOffReason
                };
            }

            utils.addDebug(currentEntry, "=== ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===", "start");
            utils.addDebug(currentEntry, "Čas spustenia: " + utils.formatDate(moment()), "calendar");

            // Kroky prepočtu
            var steps = {
                step1: { success: false, name: "Načítanie a validácia dát" },
                step1b: { success: false, name: "Výpočet dňa v týždni" },
                step2: { success: false, name: "Výpočet pracovnej doby" },
                step3: { success: false, name: "Spracovanie zamestnancov" },
                step4: { success: false, name: "Celkové výpočty" },
                step5: { success: false, name: "Vytvorenie info záznamu" },
                step6: { success: false, name: "Spracovanie Denný report" }
            };

            // KROK 1: Načítanie a validácia dát
            utils.addDebug(currentEntry, " KROK 1: Načítanie a validácia dát", "validation");
            var validationResult = validateInputData(currentEntry);
            if (!validationResult.success) {
                utils.addError(currentEntry, "Validácia zlyhala: " + validationResult.error, CONFIG.scriptName);
                return {
                    success: false,
                    error: validationResult.error
                };
            }
            steps.step1.success = true;

            // KROK 1b: Výpočet dňa v týždni
            utils.addDebug(currentEntry, " KROK 1b: Výpočet dňa v týždni", "calendar");
            var dayResult = calculateAndSetDayOfWeek(currentEntry, validationResult.data.date);
            steps.step1b.success = dayResult.success;

            // KROK 2: Výpočet pracovného času
            utils.addDebug(currentEntry, " KROK 2: Výpočet pracovnej doby", "update");
            var workTimeResult = calculateWorkTime(currentEntry, validationResult.data.arrival, validationResult.data.departure);
            if (!workTimeResult.success) {
                utils.addError(currentEntry, "Výpočet času zlyhal: " + workTimeResult.error, CONFIG.scriptName);
                return {
                    success: false,
                    error: workTimeResult.error
                };
            }
            steps.step2.success = workTimeResult.success;

            // KROK 3: Spracovanie zamestnancov
            utils.addDebug(currentEntry, " KROK 3: Spracovanie zamestnancov", "group");
            var employeeResult = processEmployees(validationResult.data.employees, workTimeResult.pracovnaDobaHodiny, validationResult.data.date);
            if (employeeResult.success) {
                if (entryStatus.indexOf("Záväzky") === -1) {
                    entryStatus.push("Záväzky");
                }
                if (employeeResult.created || employeeResult.updated > 0) {
                    entryIcons += CONFIG.icons.obligations;
                }
            }
            steps.step3.success = employeeResult.success;

            // KROK 4: Celkové výpočty
            utils.addDebug(currentEntry, " KROK 4: Celkové výpočty", "calculation");
            var totals = setEntryFields(currentEntry, employeeResult, entryIcons, entryStatus);
            steps.step4.success = totals.success;

            // KROK 5: Vytvorenie info záznamu
            utils.addDebug(currentEntry, " KROK 5: Vytvorenie info záznamu", "note");
            steps.step5.success = createInfoRecord(currentEntry, workTimeResult, employeeResult);

            // KROK 6: Vytvorenie/aktualizácia Denný report
            utils.addDebug(currentEntry, " KROK 6: Spracovanie Denný report", "note");
            var dailyReportResult = utils.createOrUpdateDailyReport(currentEntry, 'attendance', {
                debugEntry: currentEntry,
                createBackLink: false
            });
            steps.step6.success = dailyReportResult.success;

            if (dailyReportResult.success) {
                var action = dailyReportResult.created ? "vytvorený" : "aktualizovaný";
                utils.addDebug(currentEntry, "✅ Denný report " + action + " úspešne");
            } else {
                utils.addDebug(currentEntry, "⚠️ Chyba pri spracovaní Denný report: " + (dailyReportResult.error || "Neznáma chyba"));
            }

            // Nastavenie farby podľa typu dňa
            var isHoliday = utils.isHoliday(validationResult.data.date);
            var isWeekend = utils.isWeekend(validationResult.data.date);
            if (isHoliday) {
                utils.setColor(currentEntry, "bg", "pastel blue");
            } else if (isWeekend) {
                utils.setColor(currentEntry, "bg", "pastel orange");
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
            logFinalSummary(currentEntry, steps);
            utils.addDebug(currentEntry, "\n✅ === PREPOČET DOKONČENÝ ===");

            return {
                success: allSuccess,
                steps: steps,
                data: {
                    date: validationResult.data.date,
                    dayOfWeek: dayResult.dayName,
                    workTime: workTimeResult.pracovnaDobaHodiny,
                    workedHours: employeeResult.odpracovaneTotal,
                    wageCosts: employeeResult.celkoveMzdy,
                    employeeCount: employeeResult.pocetPracovnikov
                }
            };

        } catch (error) {
            utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "calculate", error);
            return {
                success: false,
                error: "Kritická chyba! Line: " + error.lineNumber + ": " + error.toString()
            };
        }
    }

    // ==============================================
    // EXPORT MODULU
    // ==============================================

    return {
        calculate: calculate,
        validateInputData: validateInputData,
        calculateWorkTime: calculateWorkTime,
        calculateAndSetDayOfWeek: calculateAndSetDayOfWeek,
        CONFIG: CONFIG,
        version: CONFIG.version
    };

})();

// Export modulu
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DochadzkaCalcModule;
}
