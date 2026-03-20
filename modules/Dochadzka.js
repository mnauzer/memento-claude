// ==============================================
// LIBRARY MODULE - Dochadzka (Attendance)
// Verzia: 1.1.1 | Dátum: 2026-03-20 | Autor: ASISTANTO
// ==============================================
// 📋 PURPOSE:
//    - Reusable module for attendance calculations
//    - Work time calculation with 15-minute rounding
//    - Employee wage computation (hourly rate + extras)
//    - Obligation creation/update for wages
//    - Daily report integration
// ==============================================
// 🔧 DEPENDENCIES:
//    - MementoUtils v7.0+
//    - MementoConfig (central configuration)
//    - MementoTime (for time rounding)
//    - MementoBusiness (for wage calculations)
// ==============================================
// 📖 USAGE:
//    var result = Dochadzka.calculateAttendance(entry(), config);
//    if (result.success) {
//        // Attendance calculated successfully
//    }
// ==============================================
// 📚 DOCUMENTATION:
//    See modules/docs/Dochadzka.md for complete field reference
// ==============================================
// 📝 EXTRACTED FROM:
//    - Doch.Calc.Main.js v8.2.0 (528 lines)
//    - Extraction date: 2026-03-19
// ==============================================

var Dochadzka = (function() {
    'use strict';

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "Dochadzka",
        version: "1.1.1",
        author: "ASISTANTO",
        description: "Attendance calculation and wage management module",
        library: "Dochádzka",
        status: "active",
        extractedFrom: "Doch.Calc.Main.js v8.2.0",
        extractedLines: 528,
        extractedDate: "2026-03-19",
        changelog: [
            "v1.1.1 (2026-03-20) - CRITICAL FIX: Pass linkToEntry objects to processEmployees()",
            "  - FIX: processEmployees() now receives linkToEntry field directly from entry",
            "  - BEFORE: Passed validationResult.data.employees (plain entries from safeGetLinks)",
            "  - AFTER: Pass entry.field(employees) (linkToEntry objects with .e property)",
            "  - RESULT: MementoBusiness now correctly detects linkToEntry and sets attributes!",
            "v1.1.0 (2026-03-20) - CRITICAL FIX: LinkToEntry Attribute API",
            "  - NEW: setEmployeeAttributes() function sets attributes BEFORE processEmployees()",
            "  - FIX: Uses CORRECT Memento attribute API:",
            "    * .setAttr(name, value) NOT .set(id, value)",
            "    * .attr(name) NOT .get(id)",
            "    * Attributes use STRING NAMES: 'odpracované', 'hodinovka', 'denná mzda'",
            "  - Order: 1) Set attributes, 2) Create obligations, 3) Aggregate",
            "  - Formula: denná mzda = (hodinovka + príplatok) × odpracované + prémia - pokuta",
            "v1.0.14 (2026-03-20) - FIX: Removed duplicate obligation creation logic",
            "  - Obligation creation now handled ONLY by utils.processEmployees()",
            "  - Prevents duplicate obligations with 'N/A' in description",
            "  - Count obligations from result.details instead of manual processing",
            "v1.0.6 - Added visual icons for created obligations (💸) and daily report (📅)"
        ].join("\n")
    };

    // ==============================================
    // CONFIGURATION
    // ==============================================

    var DEFAULT_CONFIG = {
        scriptName: "Dochádzka Prepočet",

        settings: {
            roundToQuarterHour: true,  // 15-minute rounding
            roundDirection: "nearest", // "up", "down", "nearest"
            includeBreaks: true,
            breakThreshold: 6, // hours before break required
            breakDuration: 30  // minutes
        },

        // Field names will be populated from MementoConfig
        fields: {
            date: null,
            employees: null,
            arrival: null,
            departure: null,
            workTime: null,
            workedHours: null,
            employeeCount: null,
            wageCosts: null,
            entryIcons: null,
            entryStatus: null,
            dayOffReason: null,
            info: null
        }
    };

    // ==============================================
    // PRIVATE HELPER FUNCTIONS
    // ==============================================

    /**
     * Get configuration from MementoConfig or use defaults
     * @private
     */
    function getConfig() {
        if (typeof MementoConfig !== 'undefined') {
            return MementoConfig.getConfig();
        }
        return null;
    }

    /**
     * Get MementoUtils reference
     * @private
     */
    function getUtils() {
        if (typeof MementoUtils !== 'undefined') {
            return MementoUtils;
        }
        throw new Error("MementoUtils not loaded - required dependency");
    }

    /**
     * Add debug message to entry
     * @private
     */
    function addDebug(entry, message, icon) {
        try {
            var utils = getUtils();
            if (utils.addDebug) {
                utils.addDebug(entry, message, icon);
            }
        } catch (e) {
            // Silent fail if utils not available
        }
    }

    /**
     * Add error message to entry
     * @private
     */
    function addError(entry, message, functionName, error) {
        try {
            var utils = getUtils();
            if (utils.addError) {
                utils.addError(entry, message, functionName, error);
            }
        } catch (e) {
            // Silent fail if utils not available
        }
    }

    /**
     * Merge user config with defaults
     * @private
     */
    function mergeConfig(userConfig) {
        if (!userConfig) return DEFAULT_CONFIG;

        var config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

        // Merge settings
        if (userConfig.settings) {
            for (var key in userConfig.settings) {
                config.settings[key] = userConfig.settings[key];
            }
        }

        // Merge field names from MementoConfig
        var centralConfig = getConfig();
        if (centralConfig && centralConfig.fields && centralConfig.fields.attendance) {
            config.fields = {
                date: centralConfig.fields.attendance.date,
                employees: centralConfig.fields.attendance.employees,
                arrival: centralConfig.fields.attendance.arrival,
                departure: centralConfig.fields.attendance.departure,
                workTime: centralConfig.fields.attendance.workTime,
                workedHours: centralConfig.fields.attendance.workedHours,
                employeeCount: centralConfig.fields.attendance.employeeCount,
                wageCosts: centralConfig.fields.attendance.wageCosts,
                entryIcons: centralConfig.fields.attendance.entryIcons,
                entryStatus: centralConfig.fields.attendance.entryStatus,
                dayOffReason: centralConfig.fields.attendance.dayOffReason,
                info: centralConfig.fields.common.info
            };

            config.attributes = centralConfig.fields.attendance.employeeAttributes;
            config.libraries = centralConfig.libraries;
            config.icons = centralConfig.icons;

            // Obligation settings
            config.obligationTypes = {
                wages: centralConfig.constants.obligationTypes.wages
            };
            config.obligationStates = {
                paid: centralConfig.constants.obligationStates.paid || "Zaplatené",
                unpaid: centralConfig.constants.obligationStates.unpaid || "Nezaplatené",
                partiallyPaid: centralConfig.constants.obligationStates.partiallyPaid || "Čiastočne zaplatené"
            };
            config.obligationsFields = centralConfig.fields.obligations;
        }

        return config;
    }

    /**
     * Validate input data for attendance entry
     * @private
     */
    function validateInputData(entry, config, utils) {
        try {
            // MANUAL VALIDATION (bez závislosti na utils.validateInputData)
            var errors = [];

            // Validácia dátumu
            var date = utils.safeGet(entry, config.fields.date);
            if (!date) {
                errors.push("Dátum nie je vyplnený");
            }

            // Validácia príchodu
            var arrival = utils.safeGet(entry, config.fields.arrival);
            if (!arrival) {
                errors.push("Príchod nie je vyplnený");
            }

            // Validácia odchodu
            var departure = utils.safeGet(entry, config.fields.departure);
            if (!departure) {
                errors.push("Odchod nie je vyplnený");
            }

            // Validácia zamestnancov
            var employees = utils.safeGetLinks(entry, config.fields.employees);
            if (!employees || employees.length === 0) {
                errors.push("Žiadni zamestnanci v zázname");
            }

            // Ak sú chyby, vráť ich
            if (errors.length > 0) {
                return {
                    success: false,
                    error: errors.join(", ")
                };
            }

            // Validácia úspešná - vráť dáta
            addDebug(entry, "  • Dátum: " + moment(date).format("DD.MM.YYYY") +
                    " (" + utils.getDayNameSK(moment(date).day()).toUpperCase() + ")");
            addDebug(entry, "  • Čas: " + moment(arrival).format("HH:mm") +
                    " - " + moment(departure).format("HH:mm"));
            addDebug(entry, "  • Počet zamestnancov: " + employees.length);

            return {
                success: true,
                data: {
                    date: date,
                    arrival: arrival,
                    departure: departure,
                    employees: employees
                }
            };

        } catch (error) {
            addError(entry, error.toString(), "validateInputData", error);
            return { success: false, error: error.toString() };
        }
    }

    /**
     * Calculate work time from arrival to departure
     * @private
     */
    function calculateWorkTime(entry, arrival, departure, config, utils) {
        try {
            var options = {
                entry: entry,
                config: config,
                roundToQuarter: config.settings.roundToQuarterHour,
                startFieldName: config.fields.arrival,
                endFieldName: config.fields.departure,
                workTimeFieldName: config.fields.workTime,
                debugLabel: "Pracovná doba"
            };

            var result = utils.calculateWorkTime(arrival, departure, options);

            // Map field names for backward compatibility
            if (result.success) {
                result.arrivalRounded = result.startTimeRounded;
                result.departureRounded = result.endTimeRounded;
                result.arrivalOriginal = result.startTimeOriginal;
                result.departureOriginal = result.endTimeOriginal;
            }

            return result;

        } catch (error) {
            addError(entry, error.toString(), "calculateWorkTime", error);
            return { success: false, error: error.toString() };
        }
    }

    /**
     * Set linkToEntry attributes DIRECTLY on entry object
     * CRITICAL: Must be called BEFORE processEmployees() to set attributes
     * @private
     */
    function setEmployeeAttributes(entry, workHours, date, config, utils) {
        try {
            addDebug(entry, "📝 === NASTAVUJEM ATRIBÚTY LINKTOENTRY ===", "attribute");

            // Get employees linkToEntry field DIRECTLY from entry
            var employeesFieldName = config.fields.employees;
            var employeesLinks = entry.field(employeesFieldName);

            if (!employeesLinks || employeesLinks.length === 0) {
                addDebug(entry, "⚠️ Žiadni zamestnanci na nastavenie atribútov");
                return { success: false, error: "No employees" };
            }

            addDebug(entry, "👥 Počet zamestnancov: " + employeesLinks.length);

            var totalWage = 0;
            var employeeDetails = [];

            // Process each employee link DIRECTLY
            for (var i = 0; i < employeesLinks.length; i++) {
                var empLink = employeesLinks[i];
                var employee = empLink.e; // Get linked employee entry

                // Get employee name
                var employeeName = utils.formatEmployeeName ?
                    utils.formatEmployeeName(employee) :
                    (employee.field("Nick") || "N/A");

                addDebug(entry, "  [" + (i + 1) + "] " + employeeName);

                // STEP 1: Get hourly rate from employee
                var hourlyRate = 0;
                if (utils.findValidHourlyRate) {
                    hourlyRate = utils.findValidHourlyRate(employee, date);
                } else {
                    // Fallback: get from Hodinovka field
                    hourlyRate = employee.field("Aktuálna hodinovka") || 0;
                }

                if (!hourlyRate || hourlyRate <= 0) {
                    addError(entry, "Zamestnanec " + employeeName + " nemá hodinovú sadzbu!", "setEmployeeAttributes");
                    continue;
                }

                addDebug(entry, "    • Hodinovka z knižnice: " + hourlyRate + "€/h");

                // STEP 2: Set basic attributes
                // CRITICAL: Use .setAttr(name, value) NOT .set(id, value)!
                try {
                    // odpracované = work hours
                    empLink.setAttr("odpracované", workHours);
                    addDebug(entry, "    • SET odpracované = " + workHours + "h");

                    // hodinovka = hourly rate
                    empLink.setAttr("hodinovka", hourlyRate);
                    addDebug(entry, "    • SET hodinovka = " + hourlyRate + "€/h");

                } catch (setError) {
                    addError(entry, "CHYBA pri nastavení základných atribútov: " + setError.toString(), "setEmployeeAttributes");
                    continue;
                }

                // STEP 3: Read manual attributes (user-entered)
                // CRITICAL: Use .attr(name) NOT .get(id)!
                var supplement = empLink.attr("+príplatok (€/h)") || 0;
                var bonus = empLink.attr("+prémia (€)") || 0;
                var penalty = empLink.attr("-pokuta (€)") || 0;

                if (supplement !== 0 || bonus !== 0 || penalty !== 0) {
                    var extrasLog = "    • Manuálne hodnoty:";
                    if (supplement !== 0) extrasLog += " príplatok=" + supplement + "€/h";
                    if (bonus !== 0) extrasLog += " prémia=" + bonus + "€";
                    if (penalty !== 0) extrasLog += " pokuta=" + penalty + "€";
                    addDebug(entry, extrasLog);
                }

                // STEP 4: Calculate daily wage
                // Formula: (hourlyRate + supplement) × workHours + bonus - penalty
                var dailyWage = (hourlyRate + supplement) * workHours + bonus - penalty;

                addDebug(entry, "    • VÝPOČET: (" + hourlyRate + " + " + supplement + ") × " +
                    workHours + " + " + bonus + " - " + penalty + " = " + dailyWage + "€");

                // STEP 5: Set daily wage attribute
                // CRITICAL: Use .setAttr(name, value) NOT .set(id, value)!
                try {
                    empLink.setAttr("denná mzda", dailyWage);
                    addDebug(entry, "    • SET denná mzda = " + dailyWage + "€");
                    addDebug(entry, "    ✅ Atribúty NASTAVENÉ pre " + employeeName);

                } catch (wageError) {
                    addError(entry, "CHYBA pri nastavení dennej mzdy: " + wageError.toString(), "setEmployeeAttributes");
                    continue;
                }

                totalWage += dailyWage;

                // Store details for later use
                employeeDetails.push({
                    employee: employeeName,
                    employeeEntry: employee,
                    hours: workHours,
                    hourlyRate: hourlyRate,
                    supplement: supplement,
                    bonus: bonus,
                    penalty: penalty,
                    wage: dailyWage
                });
            }

            addDebug(entry, "✅ === ATRIBÚTY NASTAVENÉ PRE VŠETKÝCH " + employeesLinks.length + " ZAMESTNANCOV ===");
            addDebug(entry, "💰 Celková mzda: " + totalWage + "€");

            return {
                success: true,
                count: employeesLinks.length,
                totalWage: totalWage,
                details: employeeDetails
            };

        } catch (error) {
            addError(entry, "Kritická chyba pri nastavovaní atribútov: " + error.toString(), "setEmployeeAttributes", error);
            return {
                success: false,
                error: error.toString()
            };
        }
    }

    /**
     * Process employees - calculate wages and create/update obligations
     * @private
     */
    function processEmployees(entry, employees, workHours, date, config, utils) {
        try {
            var options = {
                entry: entry,
                config: config,
                employeeFieldName: config.fields.employees,
                attributes: config.attributes,
                includeExtras: true,  // Include extras/premiums/penalties
                processObligations: true,  // Process wage obligations
                processObligation: function(date, empData, obligations) {
                    return processObligation(entry, date, empData, obligations, config, utils);
                },
                findLinkedObligations: utils.findLinkedObligations,
                libraryType: 'attendance'
            };

            var result = utils.processEmployees(employees, workHours, date, options);

            // Count obligations created/updated from result.details
            var obligationsCreated = 0;
            var obligationsUpdated = 0;

            if (result.details && result.details.length > 0) {
                for (var i = 0; i < result.details.length; i++) {
                    if (result.details[i].obligationCreated) {
                        obligationsCreated++;
                    }
                    // Note: obligationUpdated info not currently tracked in processEmployee
                    // Could add in future if needed
                }
            }

            // CRITICAL: Transform result from utils.processEmployees() format to expected format
            // utils.processEmployees returns: {processed, failed, totalWage, details, success}
            // Expected format: {odpracovaneTotal, celkoveMzdy, pocetPracovnikov, detaily, pracovnaDoba, created, updated, success}
            return {
                success: result.success,
                pocetPracovnikov: result.processed || 0,
                odpracovaneTotal: workHours * (result.processed || 0), // Total hours = workHours per employee * count
                celkoveMzdy: result.totalWage || 0,
                detaily: result.details || [],
                pracovnaDoba: workHours, // Work time per employee
                created: obligationsCreated,
                updated: obligationsUpdated,
                error: result.error
            };

        } catch (error) {
            addError(entry, error.toString(), "processEmployees", error);
            return {
                success: false,
                error: error.toString(),
                pocetPracovnikov: 0,
                odpracovaneTotal: 0,
                celkoveMzdy: 0,
                detaily: [],
                pracovnaDoba: 0,
                created: 0,
                updated: 0,
                errors: 1
            };
        }
    }

    /**
     * Process obligation for single employee
     * @private
     */
    function processObligation(entry, date, empData, obligations, config, utils) {
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
            addDebug(entry, utils.getIcon("search") +
                    " Hľadám záväzok " + utils.formatEmployeeName(employee));

            // Find existing obligation for this employee
            var existingObligation = null;
            for (var j = 0; j < obligations.length; j++) {
                var obligation = obligations[j];
                var linkedEmployee = utils.safeGetLinks(obligation, config.obligationsFields.employee);

                if (linkedEmployee && linkedEmployee.length > 0 &&
                    linkedEmployee[0].field("ID") === employee.field("ID")) {
                    addDebug(entry, utils.getIcon("exclamation") + " Nájdený záväzok");
                    existingObligation = obligation;
                    break;
                }
            }

            if (existingObligation) {
                // Update existing obligation
                if (utils.updateObligation(date, existingObligation, empData.dailyWage)) {
                    result.updated++;
                    result.totalAmount += empData.dailyWage;
                } else {
                    result.errors++;
                }
            } else {
                // Create new obligation
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
            addError(entry, "Chyba pri spracovaní zamestnanca: " + error.toString(),
                    "processObligation");
            result.errors++;
            return result;
        }
    }

    /**
     * Set calculated fields on entry
     * @private
     */
    function setEntryFields(entry, workTimeResult, employeeResult, entryIcons, entryStatus, config, utils) {
        try {
            // CRITICAL: Set rounded times and work time
            if (workTimeResult && workTimeResult.success) {
                // IMPORTANT: Convert TIME field values to millisecond timestamps
                // Memento TIME fields need numeric timestamp (milliseconds since epoch)
                // roundToQuarterHour() returns values that need conversion
                var arrivalTimestamp = null;
                var departureTimestamp = null;

                if (workTimeResult.arrivalRounded) {
                    try {
                        // Always convert to Date and then to timestamp
                        // This handles Date objects, strings, and timestamps
                        var arrivalDate = new Date(workTimeResult.arrivalRounded);
                        if (!isNaN(arrivalDate.getTime())) {
                            arrivalTimestamp = arrivalDate.getTime();
                        }
                    } catch (e) {
                        addError(entry, "Failed to convert arrival time: " + e.toString(), "setEntryFields");
                    }
                }

                if (workTimeResult.departureRounded) {
                    try {
                        var departureDate = new Date(workTimeResult.departureRounded);
                        if (!isNaN(departureDate.getTime())) {
                            departureTimestamp = departureDate.getTime();
                        }
                    } catch (e) {
                        addError(entry, "Failed to convert departure time: " + e.toString(), "setEntryFields");
                    }
                }

                utils.safeSet(entry, config.fields.arrival, arrivalTimestamp);
                utils.safeSet(entry, config.fields.departure, departureTimestamp);
                utils.safeSet(entry, config.fields.workTime, workTimeResult.pracovnaDobaHodiny);
            }

            // Set employee results
            utils.safeSet(entry, config.fields.workedHours, employeeResult.odpracovaneTotal);
            utils.safeSet(entry, config.fields.wageCosts, employeeResult.celkoveMzdy);
            utils.safeSet(entry, config.fields.entryIcons, entryIcons);
            utils.safeSet(entry, config.fields.entryStatus, entryStatus);

            addDebug(entry, "  • Pracovná doba: " + employeeResult.pracovnaDoba.toFixed(2) + " hodín");
            addDebug(entry, "  • Odpracované spolu: " + employeeResult.odpracovaneTotal + " hodín");
            addDebug(entry, "  • Mzdové náklady: " + utils.formatMoney(employeeResult.celkoveMzdy));
            addDebug(entry, " Celkové výpočty úspešné", "success");

            return { success: true };

        } catch (error) {
            addError(entry, error.toString(), "setEntryFields", error);
            return { success: false, error: error.toString() };
        }
    }

    /**
     * Create markdown info record
     * @private
     */
    function createInfoRecord(entry, workTimeResult, employeeResult, config, utils) {
        try {
            var date = entry.field(config.fields.date);
            var dateFormatted = utils.formatDate(date, "DD.MM.YYYY");
            var dayName = utils.getDayNameSK(moment(date).day()).toUpperCase();

            var infoMessage = "# 📋 DOCHÁDZKA - AUTOMATICKÝ PREPOČET\n\n";

            infoMessage += "## 📅 Základné údaje \n";
            infoMessage += "- **Dátum:** " + dateFormatted + " (" + dayName + ")\n";
            infoMessage += "- **Pracovný čas:** " + moment(workTimeResult.arrivalRounded).format("HH:mm") +
                           " - " + moment(workTimeResult.departureRounded).format("HH:mm") + "\n";
            infoMessage += "- **Pracovná doba:** " + workTimeResult.pracovnaDobaHodiny.toFixed(2) + " hodín\n\n";

            infoMessage += "## 👥 ZAMESTNANCI (" + employeeResult.pocetPracovnikov + " " +
                          utils.selectOsobaForm(employeeResult.pocetPracovnikov) + ")\n\n";

            // Check if employee details exist before iterating
            if (employeeResult.detaily && employeeResult.detaily.length > 0) {
                for (var i = 0; i < employeeResult.detaily.length; i++) {
                    var detail = employeeResult.detaily[i];
                    // CRITICAL: Use correct property names from utils.processEmployees result
                    // detail.employee is already formatted string "Nick (Priezvisko)" from MementoBusiness
                    // detail.employeeEntry is the entry object
                    var empName = detail.employee || "N/A";
                    infoMessage += "### 👤 " + empName + "\n";
                    infoMessage += "- **Hodinovka:** " + (detail.hourlyRate || 0) + " €/h\n";
                    if (detail.overtimeHours && detail.overtimeHours > 0) {
                        infoMessage += "- **Nadčas:** " + detail.overtimeHours + " h\n";
                    }
                    infoMessage += "- **Denná mzda:** " + (detail.wage || 0).toFixed(2) + " €\n\n";
                }
            } else {
                infoMessage += "⚠️ Žiadne detaily zamestnancov (spracovanie zlyhalo)\n\n";
            }

            infoMessage += "## 💰 SÚHRN\n";
            infoMessage += "- **Odpracované celkom:** " + employeeResult.odpracovaneTotal + " hodín\n";
            infoMessage += "- **Mzdové náklady:** " + utils.formatMoney(employeeResult.celkoveMzdy) + "\n\n";

            infoMessage += "## 🔧 TECHNICKÉ INFORMÁCIE\n";
            infoMessage += "- **Module:** " + MODULE_INFO.name + " v" + MODULE_INFO.version + "\n";
            infoMessage += "- **Čas spracovania:** " + moment().format("HH:mm:ss") + "\n\n";

            infoMessage += "### 📦 Použité moduly:\n";
            infoMessage += "- **MementoUtils:** v" + (utils.version || "N/A") + "\n";

            if (typeof MementoConfig !== 'undefined') {
                infoMessage += "- **MementoConfig:** v" + (MementoConfig.version || "N/A") + "\n";
            }

            if (typeof MementoCore !== 'undefined') {
                infoMessage += "- **MementoCore:** v" + (MementoCore.version || "N/A") + "\n";
            }

            if (typeof MementoBusiness !== 'undefined') {
                infoMessage += "- **MementoBusiness:** v" + (MementoBusiness.version || "N/A") + "\n";
            }

            if (typeof MementoFormatting !== 'undefined') {
                infoMessage += "- **MementoFormatting:** v" + (MementoFormatting.version || "N/A") + "\n";
            }

            if (typeof MementoTime !== 'undefined') {
                infoMessage += "- **MementoTime:** v" + (MementoTime.version || "N/A") + "\n";
            }

            if (typeof MementoDate !== 'undefined') {
                infoMessage += "- **MementoDate:** v" + (MementoDate.version || "N/A") + "\n";
            }

            if (typeof MementoValidation !== 'undefined') {
                infoMessage += "- **MementoValidation:** v" + (MementoValidation.version || "N/A") + "\n";
            }

            if (typeof MementoCalculations !== 'undefined') {
                infoMessage += "- **MementoCalculations:** v" + (MementoCalculations.version || "N/A") + "\n";
            }

            infoMessage += "\n---\n**✅ PREPOČET DOKONČENÝ ÚSPEŠNE**";

            addDebug(entry, "📝 Info message length: " + infoMessage.length + " chars");
            addDebug(entry, "📝 Info field name: '" + config.fields.info + "'");

            entry.set(config.fields.info, infoMessage);

            addDebug(entry, "✅ Info záznam vytvorený s Markdown formátovaním");

            return { success: true };

        } catch (error) {
            addError(entry, error.toString(), "createInfoRecord", error);
            return { success: false, error: error.toString() };
        }
    }

    /**
     * Apply weekend/holiday coloring
     * @private
     */
    function applyDateColoring(entry, date, utils) {
        try {
            var isHoliday = utils.isHoliday(date);
            var isWeekend = utils.isWeekend(date);

            if (isHoliday) {
                utils.setColor(entry, "bg", "pastel blue");
            } else if (isWeekend) {
                utils.setColor(entry, "bg", "pastel orange");
            }

            return { success: true };

        } catch (error) {
            addError(entry, error.toString(), "applyDateColoring", error);
            return { success: false, error: error.toString() };
        }
    }

    /**
     * Handle day off entries (Voľno)
     * @private
     */
    function handleDayOff(entry, config, utils) {
        try {
            var entryStatus = utils.safeGet(entry, config.fields.entryStatus, []);

            if (entryStatus.indexOf("Voľno") !== -1) {
                var dayOffReason = utils.safeGet(entry, config.fields.dayOffReason, null);
                var icon = null;

                if (dayOffReason === "Dažď") {
                    icon = config.icons.weather_delay;
                } else if (dayOffReason === "Voľný deň" || dayOffReason === "Dovolenka") {
                    icon = config.icons.vacation;
                } else if (dayOffReason === "Voľno - mokrý terén") {
                    icon = config.icons.soil_wet;
                }

                if (icon) {
                    utils.safeSet(entry, config.fields.entryIcons, icon);
                }

                utils.setColor(entry, "bg", "light gray");

                return {
                    success: true,
                    isDayOff: true,
                    reason: dayOffReason
                };
            }

            return {
                success: true,
                isDayOff: false
            };

        } catch (error) {
            addError(entry, error.toString(), "handleDayOff", error);
            return {
                success: false,
                isDayOff: false
            };
        }
    }

    // ==============================================
    // PUBLIC API
    // ==============================================

    /**
     * Calculate attendance for entry
     *
     * Main function that orchestrates the entire attendance calculation process:
     * 1. Check for day off status
     * 2. Validate input data
     * 3. Calculate work time with rounding
     * 4. Process employees (wages + obligations)
     * 5. Set calculated fields
     * 6. Create info record
     * 7. Update daily report
     * 8. Apply date coloring
     *
     * @param {Entry} entry - Memento entry object
     * @param {Object} options - Configuration options
     * @param {Object} options.settings - Override default settings
     * @param {boolean} options.skipDailyReport - Skip daily report update
     * @param {boolean} options.skipColoring - Skip date-based coloring
     * @returns {Object} Result object with success status and data
     *
     * @example
     * var result = Dochadzka.calculateAttendance(entry(), {
     *     settings: {
     *         roundToQuarterHour: true,
     *         roundDirection: "nearest"
     *     }
     * });
     *
     * if (result.success) {
     *     message("✅ Prepočet dokončený: " + result.data.totalHours + " hodín");
     * } else {
     *     message("❌ Chyba: " + result.error);
     * }
     */
    function calculateAttendance(entry, options) {
        try {
            options = options || {};

            // Get dependencies
            var utils = getUtils();
            var config = mergeConfig(options);

            // Clear logs and initialize
            utils.clearLogs(entry, true);
            utils.safeSet(entry, config.fields.entryIcons, "");

            addDebug(entry, "=== " + MODULE_INFO.name + " v" + MODULE_INFO.version + " ===", "start");
            addDebug(entry, "Čas spustenia: " + utils.formatDate(moment()), "calendar");

            // Track steps for summary
            var steps = {
                step1: { success: false, name: "Kontrola voľného dňa" },
                step2: { success: false, name: "Validácia dát" },
                step3: { success: false, name: "Výpočet pracovnej doby" },
                step4: { success: false, name: "Spracovanie zamestnancov" },
                step5: { success: false, name: "Celkové výpočty" },
                step6: { success: false, name: "Info záznam" },
                step7: { success: false, name: "Denný report" },
                step8: { success: false, name: "Farebné označenie" }
            };

            // STEP 1: Check for day off
            addDebug(entry, " KROK 1: Kontrola voľného dňa", "validation");
            var dayOffResult = handleDayOff(entry, config, utils);
            steps.step1.success = dayOffResult.success;

            if (dayOffResult.isDayOff) {
                addDebug(entry, "✅ Záznam je nastavený na: " + dayOffResult.reason);
                addDebug(entry, "⏹️ Prepočet preskočený (voľný deň)");

                return {
                    success: true,
                    isDayOff: true,
                    reason: dayOffResult.reason,
                    steps: steps
                };
            }

            // STEP 2: Validate input data
            addDebug(entry, " KROK 2: Načítanie a validácia dát", "validation");
            var validationResult = validateInputData(entry, config, utils);
            if (!validationResult.success) {
                addError(entry, "Validácia zlyhala: " + validationResult.error, "calculateAttendance");
                return {
                    success: false,
                    error: validationResult.error,
                    steps: steps
                };
            }
            steps.step2.success = true;

            // STEP 3: Calculate work time
            addDebug(entry, " KROK 3: Výpočet pracovnej doby", "update");
            var workTimeResult = calculateWorkTime(
                entry,
                validationResult.data.arrival,
                validationResult.data.departure,
                config,
                utils
            );

            if (!workTimeResult.success) {
                addError(entry, "Výpočet času zlyhal: " + workTimeResult.error, "calculateAttendance");
                return {
                    success: false,
                    error: workTimeResult.error,
                    steps: steps
                };
            }
            steps.step3.success = true;

            // STEP 3.5: Set linkToEntry attributes DIRECTLY on entry
            addDebug(entry, " KROK 3.5: Nastavenie atribútov linkToEntry", "attribute");
            var attributeResult = setEmployeeAttributes(
                entry,
                workTimeResult.pracovnaDobaHodiny,
                validationResult.data.date,
                config,
                utils
            );

            if (!attributeResult.success) {
                addError(entry, "Nastavenie atribútov zlyhalo: " + attributeResult.error, "calculateAttendance");
                // Don't fail completely, continue with warnings
            }

            // STEP 4: Process employees (create obligations)
            addDebug(entry, "👥   KROK 4: Vytvorenie záväzkov", "group");
            // CRITICAL: Get linkToEntry field directly, NOT from validation (which extracts plain entries)
            var employeesLinkToEntry = entry.field(config.fields.employees);
            var employeeResult = processEmployees(
                entry,
                employeesLinkToEntry,  // Pass linkToEntry objects, not plain entries!
                workTimeResult.pracovnaDobaHodiny,
                validationResult.data.date,
                config,
                utils
            );
            steps.step4.success = employeeResult.success;

            // STEP 4.5: Display attribute setting results
            addDebug(entry, " KROK 4.5: Výsledky nastavenia atribútov linkToEntry", "summary");
            if (employeeResult.success && employeeResult.detaily && employeeResult.detaily.length > 0) {
                addDebug(entry, "  📊 Zhrnutie atribútov pre " + employeeResult.pocetPracovnikov + " zamestnancov:");
                for (var ei = 0; ei < employeeResult.detaily.length; ei++) {
                    var empDetail = employeeResult.detaily[ei];
                    var attrSummary = "    [" + (ei + 1) + "] " + empDetail.employee + ":";
                    addDebug(entry, attrSummary);
                    addDebug(entry, "        • odpracované: " + empDetail.hours + "h");
                    addDebug(entry, "        • hodinovka: " + empDetail.hourlyRate + "€/h");
                    if (empDetail.supplement) {
                        addDebug(entry, "        • +príplatok: " + empDetail.supplement + "€/h");
                    }
                    if (empDetail.bonus) {
                        addDebug(entry, "        • +prémia: " + empDetail.bonus + "€");
                    }
                    if (empDetail.penalty) {
                        addDebug(entry, "        • -pokuta: " + empDetail.penalty + "€");
                    }
                    addDebug(entry, "        • denná mzda: " + empDetail.wage + "€");
                }
                addDebug(entry, "  ✅ Všetky atribúty nastavené");
            } else {
                addDebug(entry, "  ⚠️ Žiadne detaily zamestnancov dostupné");
            }

            // Update entry status and icons based on obligations
            var entryStatus = utils.safeGet(entry, config.fields.entryStatus, []);
            var entryIcons = utils.safeGet(entry, config.fields.entryIcons, "") || "";

            if (employeeResult.success) {
                if (entryStatus.indexOf("Záväzky") === -1) {
                    entryStatus.push("Záväzky");
                }
                if (employeeResult.created > 0 || employeeResult.updated > 0) {
                    entryIcons += config.icons.obligations;
                }
            }

            // STEP 5: Set entry fields
            addDebug(entry, " KROK 5: Celkové výpočty", "calculation");
            var totalsResult = setEntryFields(entry, workTimeResult, employeeResult, entryIcons, entryStatus, config, utils);
            steps.step5.success = totalsResult.success;

            // STEP 6: Create info record
            addDebug(entry, " KROK 6: Vytvorenie info záznamu", "note");
            var infoResult = createInfoRecord(entry, workTimeResult, employeeResult, config, utils);
            steps.step6.success = infoResult.success;

            // STEP 7: Update daily report (unless skipped)
            if (!options.skipDailyReport) {
                addDebug(entry, " KROK 7: Spracovanie Denný report", "note");
                var dailyReportResult = utils.createOrUpdateDailyReport(entry, 'attendance', {
                    debugEntry: entry,
                    createBackLink: false
                });
                steps.step7.success = dailyReportResult.success;

                if (dailyReportResult.success) {
                    var action = dailyReportResult.created ? "vytvorený" : "aktualizovaný";
                    addDebug(entry, "✅ Denný report " + action + " úspešne");

                    // CRITICAL: Add daily report icon to entry
                    if (dailyReportResult.created || dailyReportResult.updated) {
                        var currentIcons = utils.safeGet(entry, config.fields.entryIcons, "") || "";
                        if (currentIcons.indexOf(config.icons.calendar) === -1) {
                            currentIcons += config.icons.calendar;
                            utils.safeSet(entry, config.fields.entryIcons, currentIcons);
                            addDebug(entry, "  ✅ Pridaná ikona denného reportu");
                        }
                    }
                } else {
                    addDebug(entry, "⚠️ Chyba pri spracovaní Denný report: " +
                            (dailyReportResult.error || "Neznáma chyba"));
                }
            } else {
                steps.step7.success = true; // Skipped
            }

            // STEP 8: Apply date coloring (unless skipped)
            if (!options.skipColoring) {
                addDebug(entry, " KROK 8: Farebné označenie", "color");
                var coloringResult = applyDateColoring(entry, validationResult.data.date, utils);
                steps.step8.success = coloringResult.success;
            } else {
                steps.step8.success = true; // Skipped
            }

            // Check overall success
            var allSuccess = true;
            for (var step in steps) {
                if (!steps[step].success) {
                    allSuccess = false;
                    break;
                }
            }

            // Final summary
            addDebug(entry, "\n📊 === FINÁLNY SÚHRN ===");
            var failedSteps = [];
            for (var stepKey in steps) {
                var status = steps[stepKey].success ? "✅" : "❌";
                addDebug(entry, status + " " + steps[stepKey].name);
                if (!steps[stepKey].success) {
                    failedSteps.push(steps[stepKey].name);
                }
            }

            if (allSuccess) {
                addDebug(entry, "\n✅ Všetky kroky dokončené úspešne!");
            } else {
                addDebug(entry, "\n⚠️ Niektoré kroky zlyhali!");
            }

            addDebug(entry, "⏱️ Čas ukončenia: " + moment().format("HH:mm:ss"));
            addDebug(entry, "📋 === KONIEC " + MODULE_INFO.name + " v" + MODULE_INFO.version + " ===");

            // Build result object
            var result = {
                success: allSuccess,
                isDayOff: false,
                data: {
                    date: validationResult.data.date,
                    workHours: workTimeResult.pracovnaDobaHodiny,
                    totalHours: employeeResult.odpracovaneTotal,
                    totalWages: employeeResult.celkoveMzdy,
                    employeeCount: employeeResult.pocetPracovnikov,
                    obligationsCreated: employeeResult.created || 0,
                    obligationsUpdated: employeeResult.updated || 0
                },
                steps: steps
            };

            // CRITICAL: Add error message if any step failed
            if (!allSuccess) {
                result.error = "Zlyhali kroky: " + failedSteps.join(", ");
            }

            return result;

        } catch (error) {
            addError(entry, "Kritická chyba v calculateAttendance", "calculateAttendance", error);
            return {
                success: false,
                error: error.toString()
            };
        }
    }

    /**
     * Validate attendance entry without performing calculation
     *
     * @param {Entry} entry - Memento entry object
     * @param {Object} options - Configuration options
     * @returns {Object} Validation result
     *
     * @example
     * var result = Dochadzka.validateEntry(entry());
     * if (!result.valid) {
     *     message("❌ Chyby: " + result.errors.join(", "));
     * }
     */
    function validateEntry(entry, options) {
        try {
            options = options || {};
            var utils = getUtils();
            var config = mergeConfig(options);

            var validationResult = validateInputData(entry, config, utils);

            return {
                valid: validationResult.success,
                errors: validationResult.success ? [] : [validationResult.error],
                data: validationResult.data || null
            };

        } catch (error) {
            return {
                valid: false,
                errors: [error.toString()],
                data: null
            };
        }
    }

    // ==============================================
    // PUBLIC API EXPORT
    // ==============================================

    return {
        // Module info
        info: MODULE_INFO,
        version: MODULE_INFO.version,

        // Main functions
        calculateAttendance: calculateAttendance,
        validateEntry: validateEntry
    };

})();

// ==============================================
// AUTO-EXPORT INFO ON LOAD
// ==============================================

if (typeof log !== 'undefined') {
    log("✅ " + Dochadzka.info.name + " v" + Dochadzka.version + " loaded (" + Dochadzka.info.status + ")");
}
