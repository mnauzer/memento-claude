// ==============================================
// LIBRARY MODULE - Dochadzka (Attendance)
// Verzia: 1.0.5 | Dátum: 2026-03-20 | Autor: ASISTANTO
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
        version: "1.0.5",
        author: "ASISTANTO",
        description: "Attendance calculation and wage management module",
        library: "Dochádzka",
        status: "active",
        extractedFrom: "Doch.Calc.Main.js v8.2.0",
        extractedLines: 528,
        extractedDate: "2026-03-19",
        changelog: "v1.0.5 - Fixed: rounded times, work time calculation, employee info display, obligations creation"
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

            // CRITICAL: Process obligations separately (utils.processEmployees doesn't use our callback)
            var obligationsCreated = 0;
            var obligationsUpdated = 0;

            if (result.success && result.details && result.details.length > 0) {
                // Get linked obligations from this attendance entry
                var linkedObligations = utils.findLinkedObligations ?
                    utils.findLinkedObligations(entry, config.fields.obligations) : [];

                for (var i = 0; i < result.details.length; i++) {
                    var empDetail = result.details[i];
                    if (!empDetail.employeeEntry || !empDetail.wage) continue;

                    // Find existing obligation for this employee
                    var existingObligation = null;
                    for (var j = 0; j < linkedObligations.length; j++) {
                        var obl = linkedObligations[j];
                        var oblEmployee = utils.safeGetLinks(obl, config.fields.obligations.employee);
                        if (oblEmployee && oblEmployee.length > 0 &&
                            oblEmployee[0].id === empDetail.employeeEntry.id) {
                            existingObligation = obl;
                            break;
                        }
                    }

                    if (existingObligation) {
                        // Update existing
                        if (utils.updateObligation && utils.updateObligation(date, existingObligation, empDetail.wage)) {
                            obligationsUpdated++;
                        }
                    } else {
                        // Create new
                        var oblData = {
                            employee: empDetail.employeeEntry,
                            amount: empDetail.wage,
                            hours: empDetail.hours,
                            hourlyRate: empDetail.hourlyRate,
                            date: date,
                            sourceEntry: entry
                        };
                        if (utils.createObligation && utils.createObligation(date, oblData, "attendance")) {
                            obligationsCreated++;
                        }
                    }
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
                utils.safeSet(entry, config.fields.arrival, workTimeResult.arrivalRounded);
                utils.safeSet(entry, config.fields.departure, workTimeResult.departureRounded);
                utils.safeSet(entry, config.fields.workTime, workTimeResult.pracovnaDobaHodiny);
            }

            // Set employee results
            utils.safeSet(entry, config.fields.workedHours, employeeResult.odpracovaneTotal);
            utils.safeSet(entry, config.fields.wageCosts, employeeResult.celkoveMzdy);
            utils.safeSet(entry, config.fields.entryIcons, entryIcons);
            utils.safeSet(entry, config.fields.entryStatus, entryStatus);

            addDebug(entry, "  • Pracovná doba: " + employeeResult.pracovnaDoba + " hodín");
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
            infoMessage += "- **Pracovná doba:** " + workTimeResult.pracovnaDobaHodiny + " hodín\n\n";

            infoMessage += "## 👥 ZAMESTNANCI (" + employeeResult.pocetPracovnikov + " " +
                          utils.selectOsobaForm(employeeResult.pocetPracovnikov) + ")\n\n";

            // Check if employee details exist before iterating
            if (employeeResult.detaily && employeeResult.detaily.length > 0) {
                for (var i = 0; i < employeeResult.detaily.length; i++) {
                    var detail = employeeResult.detaily[i];
                    // CRITICAL: Use correct property names from utils.processEmployees result
                    // detail.employeeEntry (not zamestnanec), detail.hourlyRate (not hodinovka), detail.wage (not dennaMzda)
                    var empName = detail.employee || utils.formatEmployeeName(detail.employeeEntry) || "N/A";
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
            infoMessage += "- **Čas spracovania:** " + moment().format("HH:mm:ss") + "\n";
            infoMessage += "- **MementoUtils:** v" + (utils.version || "N/A") + "\n";

            if (typeof MementoConfig !== 'undefined') {
                infoMessage += "- **MementoConfig:** v" + MementoConfig.version + "\n";
            }

            infoMessage += "\n---\n**✅ PREPOČET DOKONČENÝ ÚSPEŠNE**";

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

            // STEP 4: Process employees
            addDebug(entry, " KROK 4: Spracovanie zamestnancov", "group");
            var employeeResult = processEmployees(
                entry,
                validationResult.data.employees,
                workTimeResult.pracovnaDobaHodiny,
                validationResult.data.date,
                config,
                utils
            );

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
            steps.step4.success = employeeResult.success;

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
