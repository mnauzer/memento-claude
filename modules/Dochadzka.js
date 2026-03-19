// ==============================================
// LIBRARY MODULE - Dochádzka (Attendance)
// Verzia: 0.1.0 | Dátum: 2026-03-19 | Autor: ASISTANTO
// ==============================================
// 📋 PURPOSE:
//    - Reusable module for Attendance operations
//    - Calculate work hours with 15-minute rounding
//    - Compute wages based on hourly rates
//    - Handle break time calculations (30 min after 6h)
//    - Update daily reports automatically
//    - Track obligations and payments
// ==============================================
// 🔧 DEPENDENCIES:
//    - MementoUtils v7.0+
//    - MementoConfig (central configuration)
//    - MementoTime (for time rounding)
//    - MementoBusiness (wage calculations)
//    - DailyReportModule (daily report updates)
// ==============================================
// 📖 USAGE:
//    // Calculate attendance hours
//    var result = Dochadzka.calculateAttendance(entry(), {
//        roundingMode: "nearest" // "up", "down", "nearest"
//    });
//
//    // Compute wage
//    var wage = Dochadzka.calculateWage(entry(), {
//        employee: employeeEntry,
//        hours: 8.5
//    });
// ==============================================
// 📚 DOCUMENTATION:
//    See modules/docs/Dochadzka.md for complete field reference
// ==============================================

var Dochadzka = (function() {
    'use strict';

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "Dochadzka",
        version: "0.1.0",
        author: "ASISTANTO",
        description: "Attendance management and wage calculation module",
        library: "Dochádzka",
        status: "initial" // initial, active, stable
    };

    // ==============================================
    // CONFIGURATION
    // ==============================================

    var DEFAULT_CONFIG = {
        fields: {
            // Core fields
            date: "Dátum",
            employee: "Zamestnanec",
            arrivalTime: "Príchod",
            departureTime: "Odchod",

            // Calculated fields
            workedHours: "Odpracované hodiny",
            breakTime: "Prestávka",
            wage: "Mzda",
            hourlyRate: "Hodinová sadzba",

            // Tracking fields
            dailyReport: "Denný report",
            obligation: "Záväzok",
            status: "Status",

            // Debug fields
            debugLog: "Debug_Log",
            errorLog: "Error_Log",
            info: "info"
        },
        constants: {
            BREAK_THRESHOLD_HOURS: 6,      // Break required after 6 hours
            BREAK_DURATION_MINUTES: 30,    // 30-minute break
            DEFAULT_ROUNDING: "nearest"    // Default time rounding mode
        }
    };

    // ==============================================
    // PRIVATE HELPER FUNCTIONS
    // ==============================================

    function getConfig() {
        if (typeof MementoConfig !== 'undefined') {
            return MementoConfig.getConfig();
        }
        return null;
    }

    function addDebug(entry, message, icon) {
        if (typeof MementoUtils !== 'undefined' && MementoUtils.addDebug) {
            MementoUtils.addDebug(entry, message, icon);
        } else if (typeof log !== 'undefined') {
            log(message);
        }
    }

    function addError(entry, message, functionName, error) {
        if (typeof MementoUtils !== 'undefined' && MementoUtils.addError) {
            MementoUtils.addError(entry, message, functionName, error);
        } else if (typeof log !== 'undefined') {
            log("ERROR in " + functionName + ": " + message + " | " + error);
        }
    }

    function addInfo(entry, message, data, scriptInfo) {
        if (typeof MementoUtils !== 'undefined' && MementoUtils.addInfo) {
            MementoUtils.addInfo(entry, message, data, scriptInfo);
        }
    }

    function mergeConfig(userConfig) {
        if (!userConfig) return DEFAULT_CONFIG;

        var merged = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

        // Merge fields
        if (userConfig.fields) {
            for (var key in userConfig.fields) {
                if (userConfig.fields.hasOwnProperty(key)) {
                    merged.fields[key] = userConfig.fields[key];
                }
            }
        }

        // Merge constants
        if (userConfig.constants) {
            for (var key in userConfig.constants) {
                if (userConfig.constants.hasOwnProperty(key)) {
                    merged.constants[key] = userConfig.constants[key];
                }
            }
        }

        return merged;
    }

    // ==============================================
    // PUBLIC API - PLACEHOLDER FUNCTIONS
    // ==============================================

    /**
     * Calculate attendance hours with time rounding
     *
     * @param {Entry} entry - Memento entry object
     * @param {Object} options - Configuration options
     *   - roundingMode: "up" | "down" | "nearest" (default: "nearest")
     *   - applyBreak: boolean (default: true)
     * @returns {Object} Result object with calculated hours
     *
     * @example
     * var result = Dochadzka.calculateAttendance(entry(), {
     *     roundingMode: "nearest",
     *     applyBreak: true
     * });
     * // Returns: { success: true, hours: 8.0, breakMinutes: 30, wage: 96.0 }
     */
    function calculateAttendance(entry, options) {
        try {
            var config = mergeConfig(options && options.config);
            var roundingMode = (options && options.roundingMode) || config.constants.DEFAULT_ROUNDING;
            var applyBreak = (options && typeof options.applyBreak !== 'undefined') ? options.applyBreak : true;

            addDebug(entry, "Dochadzka v" + MODULE_INFO.version + " - calculateAttendance started", "info");

            // TODO: Implement attendance calculation logic
            // 1. Get arrival and departure times
            // 2. Round times using MementoTime.roundToQuarterHour()
            // 3. Calculate gross hours
            // 4. Apply break if needed (after 6 hours)
            // 5. Calculate net hours
            // 6. Calculate wage if hourly rate available
            // 7. Update fields

            return {
                success: true,
                message: "Function not yet implemented - placeholder",
                data: {
                    hours: 0,
                    breakMinutes: 0,
                    wage: 0
                }
            };
        } catch (error) {
            addError(entry, "Error in calculateAttendance", "calculateAttendance", error);
            return {
                success: false,
                error: error.toString()
            };
        }
    }

    /**
     * Calculate wage for attendance entry
     *
     * @param {Entry} entry - Memento entry object
     * @param {Object} options - Configuration options
     *   - employee: Employee entry (optional - will be fetched if not provided)
     *   - hours: Number of hours (optional - will be calculated if not provided)
     * @returns {Object} Wage calculation result
     *
     * @example
     * var result = Dochadzka.calculateWage(entry(), {
     *     hours: 8.5
     * });
     */
    function calculateWage(entry, options) {
        try {
            addDebug(entry, "Dochadzka - calculateWage started", "info");

            // TODO: Implement wage calculation
            // 1. Get employee from link or options
            // 2. Get hourly rate from employee or entry
            // 3. Calculate wage = hours × rate
            // 4. Handle overtime if applicable
            // 5. Return result

            return {
                success: true,
                wage: 0,
                hourlyRate: 0,
                hours: 0
            };
        } catch (error) {
            addError(entry, "Error in calculateWage", "calculateWage", error);
            return {
                success: false,
                error: error.toString()
            };
        }
    }

    /**
     * Update linked daily report
     *
     * @param {Entry} entry - Memento entry object
     * @param {Object} options - Configuration options
     * @returns {Object} Update result
     */
    function updateDailyReport(entry, options) {
        try {
            addDebug(entry, "Dochadzka - updateDailyReport started", "info");

            // TODO: Use DailyReportModule.updateLinkedDailyReports()
            // Pass appropriate config for Dochádzka library

            return {
                success: true,
                message: "Function not yet implemented - placeholder"
            };
        } catch (error) {
            addError(entry, "Error in updateDailyReport", "updateDailyReport", error);
            return {
                success: false,
                error: error.toString()
            };
        }
    }

    /**
     * Validate attendance entry
     *
     * @param {Entry} entry - Memento entry object
     * @param {Array<string>} requiredFields - Required field names (optional)
     * @returns {Object} Validation result
     */
    function validateEntry(entry, requiredFields) {
        try {
            var config = DEFAULT_CONFIG;
            var errors = [];

            // Default required fields
            var required = requiredFields || [
                config.fields.date,
                config.fields.employee,
                config.fields.arrivalTime,
                config.fields.departureTime
            ];

            // TODO: Implement validation
            // 1. Check all required fields present
            // 2. Validate date is valid
            // 3. Validate times are valid
            // 4. Validate departure > arrival
            // 5. Validate employee link exists

            return {
                valid: true,
                errors: []
            };
        } catch (error) {
            return {
                valid: false,
                errors: [error.toString()]
            };
        }
    }

    /**
     * Create or update obligation for attendance
     *
     * @param {Entry} entry - Memento entry object
     * @param {Object} options - Configuration options
     * @returns {Object} Obligation creation result
     */
    function manageObligation(entry, options) {
        try {
            addDebug(entry, "Dochadzka - manageObligation started", "info");

            // TODO: Implement obligation management
            // 1. Check if obligation already exists
            // 2. Calculate total amount (wage)
            // 3. Create or update obligation entry
            // 4. Link to attendance entry
            // 5. Set status and due date

            return {
                success: true,
                message: "Function not yet implemented - placeholder"
            };
        } catch (error) {
            addError(entry, "Error in manageObligation", "manageObligation", error);
            return {
                success: false,
                error: error.toString()
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
        calculateWage: calculateWage,
        updateDailyReport: updateDailyReport,
        validateEntry: validateEntry,
        manageObligation: manageObligation

        // Additional functions to be added:
        // - calculateMonthlyTotal: Calculate total hours/wage for month
        // - generateReport: Generate attendance report for period
        // - handleCustomCalculation: Support custom calculation rules per employee
        // - syncWithPayroll: Sync attendance data with payroll system
    };

})();

// ==============================================
// AUTO-EXPORT INFO ON LOAD
// ==============================================

if (typeof log !== 'undefined') {
    log("✅ " + Dochadzka.info.name + " v" + Dochadzka.version + " loaded (" + Dochadzka.info.status + ")");
}
