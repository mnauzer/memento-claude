// ==============================================
// MEMENTO TIME - Time Utilities Module
// Verzia: 1.1.0 | Dátum: 2026-03-19 | Autor: ASISTANTO
// ==============================================
// 📋 PURPOSE:
//    - Centralized time manipulation utilities
//    - Eliminates code duplication across 5+ scripts
//    - 15-minute rounding logic (Slovak business rules)
//    - Time difference calculations
//    - Hour formatting and conversions
// ==============================================
// 🔧 DEPENDENCIES:
//    - moment.js (provided by Memento Database)
// ==============================================
// 📖 USAGE:
//    var rounded = MementoTime.roundToQuarterHour(time, "nearest");
//    var hours = MementoTime.calculateHoursDifference(start, end);
//    var timeStr = MementoTime.formatHoursAsTime(7.5); // "7:30"
// ==============================================
// 🎯 ELIMINATES DUPLICATION IN:
//    - Doch.Calc.Main.js
//    - Doch.Calc.Universal.js
//    - Doch.Calc.Custom.PeterBabicenko.js
//    - Zazp.Calc.Main.js
//    - Knij.Calc.Main.js
// ==============================================

var MementoTime = (function() {
    'use strict';

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "MementoTime",
        version: "1.1.0",
        author: "ASISTANTO",
        description: "Time manipulation and formatting utilities (rounding, calculations, conversions)",
        dependencies: [],  // No dependencies - standalone module
        provides: [
            "roundToQuarterHour", "calculateHoursDifference", "calculateBreakTime",
            "minutesToDecimalHours", "decimalHoursToMinutes", "formatHoursAsTime",
            "formatHoursDisplay", "crossesMidnight", "isValidTime"
        ],
        status: "stable",
        note: "Phase 3: Enhanced with complete MODULE_INFO"
    };

    // ==============================================
    // CONSTANTS
    // ==============================================

    var MINUTES_PER_HOUR = 60;
    var HOURS_PER_DAY = 24;
    var QUARTER_HOUR = 15; // minutes

    // ==============================================
    // PRIVATE HELPER FUNCTIONS
    // ==============================================

    /**
     * Validates that a time value is valid
     * @private
     */
    function isValidTime(time) {
        if (!time) return false;
        if (typeof moment === 'undefined') {
            throw new Error("MementoTime requires moment.js");
        }
        return moment(time).isValid();
    }

    /**
     * Logs to console if available (for debugging)
     * @private
     */
    function debugLog(message) {
        if (typeof log !== 'undefined') {
            log("[MementoTime] " + message);
        }
    }

    // ==============================================
    // PUBLIC API - TIME ROUNDING
    // ==============================================

    /**
     * Zaokrúhli čas na 15-minútové intervaly podľa slovenskej business logiky
     *
     * @param {Date|String|moment} time - Čas na zaokrúhlenie
     * @param {String} direction - Smer zaokrúhlenia: "nearest" (default), "up", "down"
     * @returns {moment|null} Zaokrúhlený čas ako moment object, alebo null ak invalid
     *
     * @example
     * var time = new Date("2026-03-19 08:17:00");
     * var rounded = MementoTime.roundToQuarterHour(time, "nearest"); // 08:15:00
     * var roundedUp = MementoTime.roundToQuarterHour(time, "up");    // 08:30:00
     * var roundedDown = MementoTime.roundToQuarterHour(time, "down"); // 08:15:00
     */
    function roundToQuarterHour(time, direction) {
        if (!isValidTime(time)) {
            return null;
        }

        direction = direction || "nearest";

        var timeMoment = moment(time);
        var minutes = timeMoment.minutes();
        var roundedMinutes;

        // Calculate rounded minutes based on direction
        if (direction === "nearest") {
            roundedMinutes = Math.round(minutes / QUARTER_HOUR) * QUARTER_HOUR;
        } else if (direction === "up") {
            roundedMinutes = Math.ceil(minutes / QUARTER_HOUR) * QUARTER_HOUR;
        } else if (direction === "down") {
            roundedMinutes = Math.floor(minutes / QUARTER_HOUR) * QUARTER_HOUR;
        } else {
            // Invalid direction - return original
            debugLog("Invalid direction '" + direction + "', returning original time");
            return timeMoment;
        }

        // Handle minute overflow (60+ minutes)
        if (roundedMinutes >= MINUTES_PER_HOUR) {
            timeMoment.add(1, 'hour');
            roundedMinutes = 0;
        }

        // Set rounded minutes and zero out seconds
        return timeMoment.minutes(roundedMinutes).seconds(0).milliseconds(0);
    }

    // ==============================================
    // PUBLIC API - TIME CALCULATIONS
    // ==============================================

    /**
     * Vypočíta rozdiel v hodinách medzi dvoma časmi (supports overnight shifts)
     *
     * @param {Date|String|moment} startTime - Začiatočný čas
     * @param {Date|String|moment} endTime - Koncový čas
     * @param {Object} options - Možnosti { roundQuarters: boolean, includeBreak: boolean, breakDuration: number }
     * @returns {Object} { hours, minutes, decimalHours, crossesMidnight, error }
     *
     * @example
     * var start = "2026-03-19 08:00";
     * var end = "2026-03-19 16:30";
     * var result = MementoTime.calculateHoursDifference(start, end);
     * // { hours: 8, minutes: 30, decimalHours: 8.5, crossesMidnight: false }
     */
    function calculateHoursDifference(startTime, endTime, options) {
        options = options || {};

        if (!startTime || !endTime) {
            return {
                hours: 0,
                minutes: 0,
                decimalHours: 0,
                crossesMidnight: false,
                error: "Missing start or end time"
            };
        }

        // Round to quarters if requested
        var start = options.roundQuarters ?
            roundToQuarterHour(startTime, "nearest") : moment(startTime);
        var end = options.roundQuarters ?
            roundToQuarterHour(endTime, "nearest") : moment(endTime);

        if (!start || !end || !start.isValid() || !end.isValid()) {
            return {
                hours: 0,
                minutes: 0,
                decimalHours: 0,
                error: "Invalid time format"
            };
        }

        var diffMinutes = end.diff(start, 'minutes');
        var crossesMidnight = false;

        // Handle overnight shifts (negative diff)
        if (diffMinutes < 0) {
            diffMinutes += HOURS_PER_DAY * MINUTES_PER_HOUR;
            crossesMidnight = true;
        }

        // Subtract break if requested
        if (options.includeBreak && options.breakDuration) {
            diffMinutes -= options.breakDuration;
        }

        var hours = Math.floor(diffMinutes / MINUTES_PER_HOUR);
        var minutes = diffMinutes % MINUTES_PER_HOUR;
        var decimalHours = minutesToDecimalHours(diffMinutes);

        return {
            hours: hours,
            minutes: minutes,
            decimalHours: decimalHours,
            totalMinutes: diffMinutes,
            crossesMidnight: crossesMidnight
        };
    }

    /**
     * Vypočíta prestávku na základe odpracovaných hodín (Slovak labor law)
     *
     * @param {Number} workHours - Počet odpracovaných hodín
     * @param {Object} options - Možnosti { threshold: 6, duration: 30 }
     * @returns {Number} Počet minút prestávky
     *
     * @example
     * var breakMinutes = MementoTime.calculateBreakTime(8); // 30 (pre 8h práce)
     * var breakMinutes = MementoTime.calculateBreakTime(5); // 0 (pod 6h)
     */
    function calculateBreakTime(workHours, options) {
        options = options || {};
        var threshold = options.threshold || 6; // hours
        var duration = options.duration || 30; // minutes

        if (workHours >= threshold) {
            return duration;
        }
        return 0;
    }

    // ==============================================
    // PUBLIC API - CONVERSIONS & FORMATTING
    // ==============================================

    /**
     * Konvertuje minúty na decimálny formát hodín
     *
     * @param {Number} minutes - Počet minút
     * @returns {Number} Hodiny v decimálnom formáte (zaokrúhlené na 2 desatinné miesta)
     *
     * @example
     * MementoTime.minutesToDecimalHours(90);  // 1.5
     * MementoTime.minutesToDecimalHours(405); // 6.75
     */
    function minutesToDecimalHours(minutes) {
        return Math.round((minutes / MINUTES_PER_HOUR) * 100) / 100;
    }

    /**
     * Konvertuje decimálne hodiny na minúty
     *
     * @param {Number} decimalHours - Hodiny v decimálnom formáte
     * @returns {Number} Počet minút
     *
     * @example
     * MementoTime.decimalHoursToMinutes(1.5);  // 90
     * MementoTime.decimalHoursToMinutes(6.75); // 405
     */
    function decimalHoursToMinutes(decimalHours) {
        return Math.round(decimalHours * MINUTES_PER_HOUR);
    }

    /**
     * Formátuje decimálne hodiny na časový formát (HH:MM)
     *
     * @param {Number} decimalHours - Hodiny v decimálnom formáte
     * @returns {String} Formátovaný čas "HH:MM"
     *
     * @example
     * MementoTime.formatHoursAsTime(7.5);   // "7:30"
     * MementoTime.formatHoursAsTime(8.75);  // "8:45"
     * MementoTime.formatHoursAsTime(12.25); // "12:15"
     */
    function formatHoursAsTime(decimalHours) {
        var hours = Math.floor(decimalHours);
        var minutes = Math.round((decimalHours - hours) * MINUTES_PER_HOUR);

        // Handle edge case where rounding causes 60 minutes
        if (minutes >= MINUTES_PER_HOUR) {
            hours += 1;
            minutes = 0;
        }

        var paddedMinutes = minutes < 10 ? "0" + minutes : "" + minutes;
        return hours + ":" + paddedMinutes;
    }

    /**
     * Formátuje hodiny pre display s jednotkou (napr. "6.75h")
     *
     * @param {Number} decimalHours - Hodiny v decimálnom formáte
     * @param {Number} decimals - Počet desatinných miest (default: 2)
     * @returns {String} Formátované hodiny s jednotkou
     *
     * @example
     * MementoTime.formatHoursDisplay(6.75);    // "6.75h"
     * MementoTime.formatHoursDisplay(8.5, 1);  // "8.5h"
     */
    function formatHoursDisplay(decimalHours, decimals) {
        decimals = decimals !== undefined ? decimals : 2;
        return decimalHours.toFixed(decimals) + "h";
    }

    // ==============================================
    // PUBLIC API - TIME VALIDATION
    // ==============================================

    /**
     * Validates whether a shift crosses midnight
     *
     * @param {Date|String|moment} startTime - Začiatočný čas
     * @param {Date|String|moment} endTime - Koncový čas
     * @returns {Boolean} True ak zmena prechádza cez polnoc
     */
    function crossesMidnight(startTime, endTime) {
        if (!isValidTime(startTime) || !isValidTime(endTime)) {
            return false;
        }

        var start = moment(startTime);
        var end = moment(endTime);

        return end.isBefore(start);
    }

    // ==============================================
    // PUBLIC API EXPORT
    // ==============================================

    return {
        // Module info
        info: MODULE_INFO,
        version: MODULE_INFO.version,

        // Time rounding
        roundToQuarterHour: roundToQuarterHour,

        // Time calculations
        calculateHoursDifference: calculateHoursDifference,
        calculateBreakTime: calculateBreakTime,
        crossesMidnight: crossesMidnight,

        // Conversions
        minutesToDecimalHours: minutesToDecimalHours,
        decimalHoursToMinutes: decimalHoursToMinutes,

        // Formatting
        formatHoursAsTime: formatHoursAsTime,
        formatHoursDisplay: formatHoursDisplay,

        // Validation
        isValidTime: isValidTime,

        // Constants (read-only access)
        CONSTANTS: {
            MINUTES_PER_HOUR: MINUTES_PER_HOUR,
            HOURS_PER_DAY: HOURS_PER_DAY,
            QUARTER_HOUR: QUARTER_HOUR
        }
    };

})();

// ==============================================
// AUTO-EXPORT INFO ON LOAD
// ==============================================

if (typeof log !== 'undefined') {
    log("✅ MementoTime v" + MementoTime.version + " loaded successfully");
}
