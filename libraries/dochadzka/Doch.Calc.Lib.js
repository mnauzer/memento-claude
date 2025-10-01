/**
 * ============================================================================
 * MEMENTO DATABASE SCRIPT LIBRARY
 * ============================================================================
 *
 * Knižnica:    Dochádzka
 * Názov:       Doch.Calc.Lib
 * Typ:         Calculation Library (Shared Script)
 * Verzia:      1.0
 *
 * Popis:
 * Knižničná verzia hlavného prepočtového enginu pre dochádzku.
 * Vypočíta odpracované hodiny, mzdy zamestnancov, vytvorí záväzky.
 * Používa sa volaním funkcie dochCalcMain(entry) z iných scriptov.
 *
 * Závislosti:
 * - MementoCore 7.0+
 * - MementoConfig 7.0+
 * - MementoUtils 7.0+
 * - MementoBusiness 7.0+
 *
 * Použitie:
 * ```javascript
 * // V trigger scripte:
 * var result = dochCalcMain(entry());
 * if (!result.success) {
 *     message("Chyba: " + result.error);
 *     cancel();
 * }
 * ```
 *
 * Autor:       Memento Team
 * Vytvorené:   2025-01-30
 * Upravené:    2025-01-30
 *
 * ============================================================================
 */

// ==============================================
// GLOBÁLNA FUNKCIA - EXPORT
// ==============================================

/**
 * Hlavná funkcia pre prepočet dochádzky
 * @param {Entry} entryObject - Záznam dochádzky na spracovanie
 * @param {Object} options - Voliteľné nastavenia (roundToQuarter, includeBreaks, atď.)
 * @returns {Object} { success: boolean, error?: string, data?: Object }
 */
function dochCalcMain(entryObject, options) {
    // Validácia vstupu
    if (!entryObject) {
        return { success: false, error: "Chýba entry objekt" };
    }

    // Inicializuj kontext
    var context = initializeContext(entryObject, options);
    if (!context.success) {
        return context;
    }

    try {
        // Hlavná logika prepočtu
        return executeCalculation(context);

    } catch (error) {
        context.utils.addError(context.entry, "Kritická chyba v dochCalcMain", "main", error);
        return {
            success: false,
            error: error.toString(),
            lineNumber: error.lineNumber
        };
    }
}

// ==============================================
// INICIALIZÁCIA KONTEXTU
// ==============================================

function initializeContext(entryObject, options) {
    try {
        // Import utils
        var utils = MementoUtils;
        var centralConfig = utils.config;

        // Kontrola závislostí
        var depCheck = utils.checkDependencies(['config', 'core', 'business']);
        if (!depCheck.success) {
            return {
                success: false,
                error: "Chýbajúce moduly: " + depCheck.missing.join(", ")
            };
        }

        // Lokálna konfigurácia
        var CONFIG = {
            scriptName: "Doch.Calc.Lib",
            version: "1.0",

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
                date: centralConfig.fields.attendance.date,
                employees: centralConfig.fields.attendance.employees,
                arrival: centralConfig.fields.attendance.arrival,
                departure: centralConfig.fields.attendance.departure,
                pracovnaDoba: centralConfig.fields.attendance.workTime,
                odpracovane: centralConfig.fields.attendance.workedHours,
                pocetPracovnikov: centralConfig.fields.attendance.employeeCount,
                info: centralConfig.fields.common.info
            },
            attributes: centralConfig.fields.attendance.employeeAttributes,
            libraries: centralConfig.libraries,
            icons: centralConfig.icons,

            settings: {
                roundToQuarterHour: options && options.roundToQuarter !== undefined
                    ? options.roundToQuarter
                    : true,
                roundDirection: "nearest",
                includeBreaks: options && options.includeBreaks !== undefined
                    ? options.includeBreaks
                    : true,
                breakThreshold: 6,
                breakDuration: 30
            },

            obligationTypes: {
                wages: centralConfig.constants.obligationTypes.wages,
            },
            obligationStates: {
                paid: (centralConfig.constants && centralConfig.constants.obligationStates)
                    ? centralConfig.constants.obligationStates.paid : "Zaplatené",
                unpaid: (centralConfig.constants && centralConfig.constants.obligationStates)
                    ? centralConfig.constants.obligationStates.unpaid : "Nezaplatené",
                partiallyPaid: (centralConfig.constants && centralConfig.constants.obligationStates)
                    ? centralConfig.constants.obligationStates.partiallyPaid : "Čiastočne zaplatené"
            },

            sadzbyFields: centralConfig.fields.wages
        };

        return {
            success: true,
            entry: entryObject,
            utils: utils,
            config: CONFIG,
            centralConfig: centralConfig
        };

    } catch (error) {
        return {
            success: false,
            error: "Chyba inicializácie: " + error.toString()
        };
    }
}

// ==============================================
// HLAVNÁ VÝPOČTOVÁ LOGIKA
// ==============================================

function executeCalculation(ctx) {
    var utils = ctx.utils;
    var CONFIG = ctx.config;
    var currentEntry = ctx.entry;

    utils.addDebug(currentEntry, "=== DOCHÁDZKA PREPOČET (LIBRARY) ===");
    utils.addDebug(currentEntry, "Verzia: " + CONFIG.version);

    // 1. VALIDÁCIA VSTUPNÝCH DÁT
    var validation = validateInputData(ctx);
    if (!validation.success) {
        return validation;
    }

    // 2. VÝPOČET PRACOVNEJ DOBY
    var workTime = calculateWorkTime(ctx, validation);
    if (!workTime.success) {
        return workTime;
    }

    // 3. SPRACOVANIE ZAMESTNANCOV
    var employeeResult = processEmployees(ctx, validation, workTime);
    if (!employeeResult.success) {
        return employeeResult;
    }

    // 4. VÝPOČET PRESTOJOV
    var downtime = calculateDowntime(ctx, employeeResult);

    // 5. VYTVORENIE ZÁVÄZKOV
    var obligations = createObligations(ctx, validation, employeeResult);

    // 6. ULOŽENIE VÝSLEDKOV
    saveResults(ctx, validation, workTime, employeeResult, downtime);

    // 7. NASTAVENIE FARIEB
    setColors(ctx, validation);

    utils.addDebug(currentEntry, "=== PREPOČET DOKONČENÝ ===");

    return {
        success: true,
        data: {
            date: validation.date,
            workTime: workTime.pracovnaDobaHodiny,
            employees: employeeResult.employees,
            totalWorkedHours: employeeResult.totalWorkedHours,
            totalWageCosts: employeeResult.totalWageCosts,
            downtime: downtime.downtimeHours,
            obligations: obligations
        }
    };
}

// ==============================================
// VALIDÁCIA VSTUPNÝCH DÁT
// ==============================================

function validateInputData(ctx) {
    var utils = ctx.utils;
    var CONFIG = ctx.config;
    var currentEntry = ctx.entry;

    try {
        var requiredFields = [
            CONFIG.fields.attendance.date,
            CONFIG.fields.attendance.arrival,
            CONFIG.fields.attendance.departure,
            CONFIG.fields.attendance.employees
        ];

        if (!utils.validateRequiredFields(currentEntry, requiredFields)) {
            return { success: false, error: "Chýbajú povinné polia" };
        }

        var date = utils.safeGet(currentEntry, CONFIG.fields.attendance.date);
        var arrival = utils.safeGet(currentEntry, CONFIG.fields.attendance.arrival);
        var departure = utils.safeGet(currentEntry, CONFIG.fields.attendance.departure);
        var employees = utils.safeGet(currentEntry, CONFIG.fields.attendance.employees);

        if (!date) return { success: false, error: "Dátum nie je vyplnený" };
        if (!arrival || !departure) return { success: false, error: "Príchod alebo odchod nie je vyplnený" };
        if (!employees || employees.length === 0) return { success: false, error: "Žiadni zamestnanci" };

        utils.addDebug(currentEntry, "✓ Validácia úspešná");

        return {
            success: true,
            date: date,
            arrival: arrival,
            departure: departure,
            employees: employees
        };

    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// ==============================================
// VÝPOČET PRACOVNEJ DOBY
// ==============================================

function calculateWorkTime(ctx, validation) {
    var utils = ctx.utils;
    var CONFIG = ctx.config;
    var currentEntry = ctx.entry;

    try {
        var arrivalParsed = utils.parseTimeInput(validation.arrival);
        var departureParsed = utils.parseTimeInput(validation.departure);

        if (!arrivalParsed || !departureParsed) {
            return { success: false, error: "Nepodarilo sa spracovať časy" };
        }

        var arrivalFinal = arrivalParsed;
        var departureFinal = departureParsed;

        if (CONFIG.settings.roundToQuarterHour) {
            arrivalFinal = utils.roundTimeToQuarter(arrivalParsed);
            departureFinal = utils.roundTimeToQuarter(departureParsed);

            utils.safeSet(currentEntry, CONFIG.fields.attendance.arrival, arrivalFinal.toDate());
            utils.safeSet(currentEntry, CONFIG.fields.attendance.departure, departureFinal.toDate());
        }

        var workHours = utils.calculateWorkHours(arrivalFinal, departureFinal);
        if (!workHours || workHours.error) {
            return { success: false, error: "Chyba výpočtu hodín" };
        }

        var pracovnaDobaHodiny = Math.round((workHours.totalMinutes / 60) * 100) / 100;
        utils.safeSet(currentEntry, CONFIG.fields.attendance.workTime, pracovnaDobaHodiny);

        return {
            success: true,
            arrivalRounded: arrivalFinal,
            departureRounded: departureFinal,
            pracovnaDobaHodiny: pracovnaDobaHodiny,
            workHours: workHours
        };

    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// ==============================================
// SPRACOVANIE ZAMESTNANCOV
// ==============================================

function processEmployees(ctx, validation, workTime) {
    var utils = ctx.utils;
    var CONFIG = ctx.config;
    var currentEntry = ctx.entry;

    try {
        var employees = validation.employees;
        var totalWorkedHours = 0;
        var totalWageCosts = 0;
        var processedEmployees = [];

        for (var i = 0; i < employees.length; i++) {
            var employee = employees[i];

            // Odpracované hodiny z atribútu
            var workedHours = utils.safeGetAttribute(
                currentEntry,
                CONFIG.fields.attendance.employees,
                CONFIG.attributes.workedHours,
                0,
                i
            );

            if (workedHours > 0) {
                // Výpočet mzdy
                var wageCalc = utils.calculateDailyWage(employee, workedHours, validation.date);

                // Uloženie do atribútov
                utils.safeSetAttribute(
                    currentEntry,
                    CONFIG.fields.attendance.employees,
                    CONFIG.attributes.dailyWage,
                    wageCalc.wage,
                    i
                );

                utils.safeSetAttribute(
                    currentEntry,
                    CONFIG.fields.attendance.employees,
                    CONFIG.attributes.hourlyRate,
                    wageCalc.hourlyRate,
                    i
                );

                totalWorkedHours += workedHours;
                totalWageCosts += wageCalc.wage;

                processedEmployees.push({
                    employee: employee,
                    workedHours: workedHours,
                    wage: wageCalc.wage,
                    hourlyRate: wageCalc.hourlyRate
                });
            }
        }

        return {
            success: true,
            employees: processedEmployees,
            totalWorkedHours: totalWorkedHours,
            totalWageCosts: totalWageCosts
        };

    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// ==============================================
// VÝPOČET PRESTOJOV
// ==============================================

function calculateDowntime(ctx, employeeResult) {
    var utils = ctx.utils;
    var CONFIG = ctx.config;
    var currentEntry = ctx.entry;

    try {
        var pracovnaDoba = utils.safeGet(currentEntry, CONFIG.fields.attendance.workTime, 0);
        var odpracovane = employeeResult.totalWorkedHours;
        var prestoje = Math.max(0, pracovnaDoba - odpracovane);

        utils.safeSet(currentEntry, CONFIG.fields.attendance.downtime, prestoje);

        return {
            success: true,
            downtimeHours: prestoje
        };

    } catch (error) {
        return { success: false, error: error.toString() };
    }
}

// ==============================================
// VYTVORENIE ZÁVÄZKOV
// ==============================================

function createObligations(ctx, validation, employeeResult) {
    var utils = ctx.utils;
    var CONFIG = ctx.config;

    try {
        var obligations = [];

        for (var i = 0; i < employeeResult.employees.length; i++) {
            var emp = employeeResult.employees[i];

            if (emp.wage > 0) {
                var oblResult = utils.createObligation(validation.date, {
                    entry: emp.employee,
                    name: utils.formatEmployeeName(emp.employee),
                    dailyWage: emp.wage
                }, "employee");

                if (oblResult && oblResult.success) {
                    obligations.push(oblResult);
                }
            }
        }

        return obligations;

    } catch (error) {
        return [];
    }
}

// ==============================================
// ULOŽENIE VÝSLEDKOV
// ==============================================

function saveResults(ctx, validation, workTime, employeeResult, downtime) {
    var utils = ctx.utils;
    var CONFIG = ctx.config;
    var currentEntry = ctx.entry;

    try {
        utils.safeSet(currentEntry, CONFIG.fields.attendance.workedHours, employeeResult.totalWorkedHours);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.wageCosts, employeeResult.totalWageCosts);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.employeeCount, validation.employees.length);

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri ukladaní: " + error.toString());
    }
}

// ==============================================
// NASTAVENIE FARIEB
// ==============================================

function setColors(ctx, validation) {
    var utils = ctx.utils;
    var currentEntry = ctx.entry;

    try {
        var isHoliday = utils.isHoliday(validation.date);
        var isWeekend = utils.isWeekend(validation.date);

        if (isHoliday) {
            utils.setColor(currentEntry, "bg", "pastel blue");
        } else if (isWeekend) {
            utils.setColor(currentEntry, "bg", "pastel orange");
        }

    } catch (error) {
        // Ticho ignoruj chyby farieb
    }
}

// ==============================================
// POZNÁMKA: Tento súbor je SHARED SCRIPT
// Neobsahuje automatické spustenie.
// Používa sa importom v iných scriptoch.
// ==============================================
