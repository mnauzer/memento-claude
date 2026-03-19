// ==============================================
// MEMENTO DATE - Date Utilities Module
// Verzia: 1.0.0 | Dátum: 2026-03-19 | Autor: ASISTANTO
// ==============================================
// 📋 PURPOSE:
//    - Date manipulation and formatting utilities
//    - Slovak calendar support (holidays, workdays)
//    - Week number calculations
//    - Date range utilities
// ==============================================
// 🔧 DEPENDENCIES:
//    - moment.js (provided by Memento Database)
//    - MementoConfig (optional - for extended holiday config)
// ==============================================
// 📖 USAGE:
//    var isHol = MementoDate.isHoliday(new Date());
//    var isWe = MementoDate.isWeekend(new Date());
//    var weekNum = MementoDate.getWeekNumber(new Date());
//    var workdays = MementoDate.getWorkdaysInMonth(2026, 3);
// ==============================================
// 🎯 EXTRACTED FROM: MementoCore.js (Phase 3 refactoring)
// ==============================================

var MementoDate = (function() {
    'use strict';

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "MementoDate",
        version: "1.0.0",
        author: "ASISTANTO",
        description: "Date utilities for Slovak calendar, holidays, workdays, week numbers",
        dependencies: [],  // Optional: MementoConfig for extended features
        provides: ["isHoliday", "isWeekend", "isWorkday", "getWeekNumber", "getWorkdaysInMonth", "formatDate"],
        status: "stable",
        note: "Phase 3: Extracted from MementoCore.js"
    };

    // ==============================================
    // CONSTANTS - Slovak Holidays
    // ==============================================

    /**
     * Fixed Slovak holidays (same date every year)
     */
    var SLOVAK_FIXED_HOLIDAYS = [
        "01-01",  // Nový rok / Deň vzniku SR
        "01-06",  // Traja králi (Zjavenie Pána)
        "05-01",  // Sviatok práce
        "05-08",  // Deň víťazstva nad fašizmom
        "07-05",  // Sviatok sv. Cyrila a Metoda
        "08-29",  // Slovenské národné povstanie
        "09-01",  // Deň Ústavy SR
        "09-15",  // Sedembolestná Panna Mária
        "11-01",  // Sviatok všetkých svätých
        "11-17",  // Deň boja za slobodu a demokraciu
        "12-24",  // Štedrý deň
        "12-25",  // 1. sviatok vianočný
        "12-26"   // 2. sviatok vianočný
    ];

    /**
     * Movable Slovak holidays (calculated based on Easter)
     * Easter dates for years 2020-2030
     */
    var EASTER_DATES = {
        2020: "04-12",
        2021: "04-04",
        2022: "04-17",
        2023: "04-09",
        2024: "03-31",
        2025: "04-20",
        2026: "04-05",
        2027: "03-28",
        2028: "04-16",
        2029: "04-01",
        2030: "04-21"
    };

    // ==============================================
    // PRIVATE HELPER FUNCTIONS
    // ==============================================

    /**
     * Validates that moment.js is available
     * @private
     */
    function checkMoment() {
        if (typeof moment === 'undefined') {
            throw new Error("MementoDate requires moment.js (provided by Memento Database)");
        }
    }

    /**
     * Get Easter Monday for given year
     * @private
     */
    function getEasterMonday(year) {
        var easterSunday = EASTER_DATES[year];
        if (!easterSunday) return null;

        checkMoment();
        var sunday = moment(year + "-" + easterSunday);
        return sunday.add(1, 'days').format("MM-DD");
    }

    /**
     * Get Good Friday for given year
     * @private
     */
    function getGoodFriday(year) {
        var easterSunday = EASTER_DATES[year];
        if (!easterSunday) return null;

        checkMoment();
        var sunday = moment(year + "-" + easterSunday);
        return sunday.subtract(2, 'days').format("MM-DD");
    }

    // ==============================================
    // PUBLIC API - Holiday Detection
    // ==============================================

    /**
     * Check if date is a Slovak public holiday
     *
     * @param {Date|String|moment} date - Date to check
     * @returns {boolean} True if date is a Slovak public holiday
     *
     * @example
     * var newYear = new Date("2026-01-01");
     * MementoDate.isHoliday(newYear); // true
     *
     * var workday = new Date("2026-03-19");
     * MementoDate.isHoliday(workday); // false
     */
    function isHoliday(date) {
        try {
            checkMoment();

            if (!date) return false;

            var m = moment(date);
            if (!m.isValid()) return false;

            var year = m.year();
            var dateStr = m.format("MM-DD");

            // Check fixed holidays
            if (SLOVAK_FIXED_HOLIDAYS.indexOf(dateStr) !== -1) {
                return true;
            }

            // Check movable holidays (Easter-based)
            var easterMonday = getEasterMonday(year);
            var goodFriday = getGoodFriday(year);

            if (easterMonday && dateStr === easterMonday) {
                return true;
            }

            if (goodFriday && dateStr === goodFriday) {
                return true;
            }

            return false;

        } catch (error) {
            return false;
        }
    }

    /**
     * Check if date is a weekend (Saturday or Sunday)
     *
     * @param {Date|String|moment} date - Date to check
     * @returns {boolean} True if Saturday or Sunday
     *
     * @example
     * var saturday = new Date("2026-03-21");
     * MementoDate.isWeekend(saturday); // true
     *
     * var monday = new Date("2026-03-23");
     * MementoDate.isWeekend(monday); // false
     */
    function isWeekend(date) {
        try {
            checkMoment();

            if (!date) return false;

            var m = moment(date);
            if (!m.isValid()) return false;

            var dayOfWeek = m.day(); // 0 = Sunday, 6 = Saturday
            return dayOfWeek === 0 || dayOfWeek === 6;

        } catch (error) {
            return false;
        }
    }

    /**
     * Check if date is a workday (not weekend, not holiday)
     *
     * @param {Date|String|moment} date - Date to check
     * @returns {boolean} True if workday (Monday-Friday, not holiday)
     *
     * @example
     * var thursday = new Date("2026-03-19");
     * MementoDate.isWorkday(thursday); // true
     *
     * var newYear = new Date("2026-01-01");
     * MementoDate.isWorkday(newYear); // false (holiday)
     */
    function isWorkday(date) {
        return !isWeekend(date) && !isHoliday(date);
    }

    // ==============================================
    // PUBLIC API - Week Number
    // ==============================================

    /**
     * Get ISO week number for date
     *
     * @param {Date|String|moment} date - Date to check
     * @returns {number} ISO week number (1-53)
     *
     * @example
     * var jan5 = new Date("2026-01-05");
     * MementoDate.getWeekNumber(jan5); // 2 (2nd week of 2026)
     */
    function getWeekNumber(date) {
        try {
            checkMoment();

            if (!date) return 0;

            var m = moment(date);
            if (!m.isValid()) return 0;

            return m.isoWeek();

        } catch (error) {
            return 0;
        }
    }

    // ==============================================
    // PUBLIC API - Month Utilities
    // ==============================================

    /**
     * Count workdays in a given month
     *
     * @param {number} year - Year (e.g., 2026)
     * @param {number} month - Month (1-12, where 1 = January)
     * @returns {Object} {total, weekends, holidays, workdays}
     *
     * @example
     * var stats = MementoDate.getWorkdaysInMonth(2026, 3);
     * // { total: 31, weekends: 8, holidays: 0, workdays: 23 }
     */
    function getWorkdaysInMonth(year, month) {
        try {
            checkMoment();

            var startDate = moment([year, month - 1, 1]);
            var endDate = moment(startDate).endOf('month');
            var totalDays = endDate.date();

            var stats = {
                total: totalDays,
                weekends: 0,
                holidays: 0,
                workdays: 0
            };

            var current = startDate.clone();
            while (current.isSameOrBefore(endDate, 'day')) {
                if (isWeekend(current)) {
                    stats.weekends++;
                } else if (isHoliday(current)) {
                    stats.holidays++;
                } else {
                    stats.workdays++;
                }
                current.add(1, 'days');
            }

            return stats;

        } catch (error) {
            return {
                total: 0,
                weekends: 0,
                holidays: 0,
                workdays: 0,
                error: error.toString()
            };
        }
    }

    // ==============================================
    // PUBLIC API - Date Formatting
    // ==============================================

    /**
     * Format date to string
     *
     * @param {Date|String|moment} date - Date to format
     * @param {String} format - moment.js format string (default: "DD.MM.YYYY")
     * @returns {String} Formatted date string
     *
     * @example
     * var date = new Date("2026-03-19");
     * MementoDate.formatDate(date); // "19.03.2026"
     * MementoDate.formatDate(date, "DD/MM/YYYY"); // "19/03/2026"
     * MementoDate.formatDate(date, "YYYY-MM-DD"); // "2026-03-19"
     */
    function formatDate(date, format) {
        try {
            checkMoment();

            if (!date) return "";

            format = format || "DD.MM.YYYY";

            var m = moment(date);
            if (!m.isValid()) return "";

            return m.format(format);

        } catch (error) {
            return "";
        }
    }

    /**
     * Parse date from string
     *
     * @param {String} dateStr - Date string to parse
     * @param {String} format - moment.js format string (optional)
     * @returns {moment|null} Parsed moment object or null if invalid
     *
     * @example
     * var date = MementoDate.parseDate("19.03.2026", "DD.MM.YYYY");
     */
    function parseDate(dateStr, format) {
        try {
            checkMoment();

            if (!dateStr) return null;

            var m;
            if (format) {
                m = moment(dateStr, format);
            } else {
                m = moment(dateStr);
            }

            return m.isValid() ? m : null;

        } catch (error) {
            return null;
        }
    }

    // ==============================================
    // PUBLIC API - Date Range Utilities
    // ==============================================

    /**
     * Get date range between two dates
     *
     * @param {Date|String|moment} startDate - Start date
     * @param {Date|String|moment} endDate - End date
     * @param {String} unit - Unit for iteration ("days", "weeks", "months")
     * @returns {Array<moment>} Array of moment objects
     *
     * @example
     * var start = new Date("2026-03-01");
     * var end = new Date("2026-03-05");
     * var dates = MementoDate.getDateRange(start, end, "days");
     * // [moment("2026-03-01"), moment("2026-03-02"), ...]
     */
    function getDateRange(startDate, endDate, unit) {
        try {
            checkMoment();

            unit = unit || "days";

            var start = moment(startDate);
            var end = moment(endDate);

            if (!start.isValid() || !end.isValid()) {
                return [];
            }

            var dates = [];
            var current = start.clone();

            while (current.isSameOrBefore(end)) {
                dates.push(current.clone());
                current.add(1, unit);
            }

            return dates;

        } catch (error) {
            return [];
        }
    }

    // ==============================================
    // PUBLIC API - Holiday List
    // ==============================================

    /**
     * Get list of all holidays in a year
     *
     * @param {number} year - Year (e.g., 2026)
     * @returns {Array<Object>} Array of {date: moment, name: string}
     *
     * @example
     * var holidays = MementoDate.getHolidaysInYear(2026);
     * // [{ date: moment("2026-01-01"), name: "Nový rok" }, ...]
     */
    function getHolidaysInYear(year) {
        try {
            checkMoment();

            var holidays = [];

            // Fixed holidays with names
            var fixedHolidaysWithNames = [
                { date: year + "-01-01", name: "Nový rok / Deň vzniku SR" },
                { date: year + "-01-06", name: "Traja králi" },
                { date: year + "-05-01", name: "Sviatok práce" },
                { date: year + "-05-08", name: "Deň víťazstva nad fašizmom" },
                { date: year + "-07-05", name: "Sviatok sv. Cyrila a Metoda" },
                { date: year + "-08-29", name: "Slovenské národné povstanie" },
                { date: year + "-09-01", name: "Deň Ústavy SR" },
                { date: year + "-09-15", name: "Sedembolestná Panna Mária" },
                { date: year + "-11-01", name: "Sviatok všetkých svätých" },
                { date: year + "-11-17", name: "Deň boja za slobodu a demokraciu" },
                { date: year + "-12-24", name: "Štedrý deň" },
                { date: year + "-12-25", name: "1. sviatok vianočný" },
                { date: year + "-12-26", name: "2. sviatok vianočný" }
            ];

            for (var i = 0; i < fixedHolidaysWithNames.length; i++) {
                var h = fixedHolidaysWithNames[i];
                holidays.push({
                    date: moment(h.date),
                    name: h.name
                });
            }

            // Movable holidays
            var goodFriday = getGoodFriday(year);
            if (goodFriday) {
                holidays.push({
                    date: moment(year + "-" + goodFriday),
                    name: "Veľký piatok"
                });
            }

            var easterMonday = getEasterMonday(year);
            if (easterMonday) {
                holidays.push({
                    date: moment(year + "-" + easterMonday),
                    name: "Veľkonočný pondelok"
                });
            }

            // Sort by date
            holidays.sort(function(a, b) {
                return a.date.diff(b.date);
            });

            return holidays;

        } catch (error) {
            return [];
        }
    }

    // ==============================================
    // PUBLIC API
    // ==============================================

    return {
        // Module metadata
        info: MODULE_INFO,
        version: MODULE_INFO.version,

        // Constants
        SLOVAK_FIXED_HOLIDAYS: SLOVAK_FIXED_HOLIDAYS,
        EASTER_DATES: EASTER_DATES,

        // Holiday detection
        isHoliday: isHoliday,
        isWeekend: isWeekend,
        isWorkday: isWorkday,

        // Week utilities
        getWeekNumber: getWeekNumber,

        // Month utilities
        getWorkdaysInMonth: getWorkdaysInMonth,

        // Date formatting
        formatDate: formatDate,
        parseDate: parseDate,

        // Date ranges
        getDateRange: getDateRange,

        // Holiday list
        getHolidaysInYear: getHolidaysInYear
    };
})();
