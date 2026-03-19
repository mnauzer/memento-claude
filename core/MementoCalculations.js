// ==============================================
// MEMENTO CALCULATIONS - Business Calculation Utilities Module
// Verzia: 1.0.0 | Dátum: 2026-03-19 | Autor: ASISTANTO
// ==============================================
// 📋 PURPOSE:
//    - Business calculation utilities
//    - Wage calculations (hourly, daily, monthly)
//    - Overtime calculations
//    - Profitability calculations
//    - Price calculations (with VAT)
//    - Break time calculations
// ==============================================
// 🔧 DEPENDENCIES:
//    - moment.js (provided by Memento Database)
//    - MementoTime (for time calculations)
//    - MementoConfig (optional - for business rules)
// ==============================================
// 📖 USAGE:
//    var wage = MementoCalculations.calculateDailyWage(employee, 8.5, date);
//    var overtime = MementoCalculations.calculateOvertime(10, 8);
//    var profit = MementoCalculations.calculateProfitability(costs, revenue);
// ==============================================
// 🎯 PHASE 3: Extracted from MementoBusiness7.js
// ==============================================

var MementoCalculations = (function() {
    'use strict';

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "MementoCalculations",
        version: "1.0.0",
        author: "ASISTANTO",
        description: "Business calculation utilities (wages, overtime, profitability, prices)",
        dependencies: ["MementoTime", "MementoDate"],  // Optional: MementoConfig
        provides: [
            "calculateWorkHours", "calculateDailyWage", "calculateOvertime",
            "calculateMonthlyStats", "calculateProfitability", "calculateBreak",
            "calculateVAT", "calculateProration"
        ],
        status: "stable",
        note: "Phase 3: Extracted from MementoBusiness7.js"
    };

    // ==============================================
    // CONSTANTS
    // ==============================================

    var STANDARD_WORK_DAY_HOURS = 8;
    var OVERTIME_MULTIPLIER = 1.25; // 25% príplatok za nadčas
    var MINUTES_PER_HOUR = 60;
    var STANDARD_VAT_RATE = 0.20; // 20% DPH

    // ==============================================
    // PRIVATE HELPERS
    // ==============================================

    /**
     * Check if value is empty
     * @private
     */
    function isEmpty(value) {
        return value === null || value === undefined || value === "";
    }

    /**
     * Get safe Time module reference
     * @private
     */
    function getTime() {
        return (typeof MementoTime !== 'undefined') ? MementoTime : null;
    }

    /**
     * Get safe Date module reference
     * @private
     */
    function getDate() {
        return (typeof MementoDate !== 'undefined') ? MementoDate : null;
    }

    /**
     * Get safe Config reference
     * @private
     */
    function getConfig() {
        return (typeof MementoConfig !== 'undefined') ? MementoConfig.getConfig() : null;
    }

    // ==============================================
    // PUBLIC API - Work Hours Calculations
    // ==============================================

    /**
     * Calculate work hours between start and end time
     *
     * @param {Date|String|moment} startTime - Start time (arrival)
     * @param {Date|String|moment} endTime - End time (departure)
     * @param {Object} options - Calculation options
     * @param {Number} options.standardHours - Standard work day hours (default: 8)
     * @returns {Object} {hours, minutes, totalMinutes, regularHours, overtimeHours, crossesMidnight}
     *
     * @example
     * var result = MementoCalculations.calculateWorkHours("08:00", "16:30");
     * // { hours: 8.5, minutes: 30, totalMinutes: 510, regularHours: 8, overtimeHours: 0.5, crossesMidnight: false }
     */
    function calculateWorkHours(startTime, endTime, options) {
        options = options || {};
        var standardHours = options.standardHours || STANDARD_WORK_DAY_HOURS;

        try {
            // Check if moment.js is available
            if (typeof moment === 'undefined') {
                return {
                    hours: 0,
                    minutes: 0,
                    totalMinutes: 0,
                    regularHours: 0,
                    overtimeHours: 0,
                    crossesMidnight: false,
                    error: "moment.js not available"
                };
            }

            var start = moment(startTime);
            var end = moment(endTime);

            if (!start.isValid() || !end.isValid()) {
                return {
                    hours: 0,
                    minutes: 0,
                    totalMinutes: 0,
                    regularHours: 0,
                    overtimeHours: 0,
                    crossesMidnight: false,
                    error: "Invalid time format"
                };
            }

            var diffMinutes = end.diff(start, 'minutes');
            var crossesMidnight = false;

            // If difference is negative, work crosses midnight
            if (diffMinutes < 0) {
                diffMinutes += 24 * MINUTES_PER_HOUR;
                crossesMidnight = true;
            }

            var hours = Math.floor(diffMinutes / MINUTES_PER_HOUR);
            var minutes = diffMinutes % MINUTES_PER_HOUR;
            var totalHours = hours + (minutes / MINUTES_PER_HOUR);

            // Calculate regular and overtime hours
            var regularHours = Math.min(totalHours, standardHours);
            var overtimeHours = Math.max(0, totalHours - standardHours);

            return {
                hours: totalHours,
                hoursOnly: hours,
                minutes: minutes,
                totalMinutes: diffMinutes,
                regularHours: regularHours,
                overtimeHours: overtimeHours,
                crossesMidnight: crossesMidnight
            };

        } catch (error) {
            return {
                hours: 0,
                minutes: 0,
                totalMinutes: 0,
                regularHours: 0,
                overtimeHours: 0,
                crossesMidnight: false,
                error: error.toString()
            };
        }
    }

    /**
     * Calculate overtime hours
     *
     * @param {Number} totalHours - Total hours worked
     * @param {Number} standardHours - Standard work day hours (default: 8)
     * @returns {Object} {overtime, regular, total}
     *
     * @example
     * var result = MementoCalculations.calculateOvertime(10, 8);
     * // { overtime: 2, regular: 8, total: 10 }
     */
    function calculateOvertime(totalHours, standardHours) {
        standardHours = standardHours || STANDARD_WORK_DAY_HOURS;

        try {
            if (isEmpty(totalHours)) {
                return { overtime: 0, regular: 0, total: 0 };
            }

            var hours = parseFloat(totalHours);
            if (isNaN(hours)) {
                return { overtime: 0, regular: 0, total: 0 };
            }

            var regular = Math.min(hours, standardHours);
            var overtime = Math.max(0, hours - standardHours);

            return {
                overtime: overtime,
                regular: regular,
                total: hours
            };

        } catch (error) {
            return { overtime: 0, regular: 0, total: 0, error: error.toString() };
        }
    }

    // ==============================================
    // PUBLIC API - Wage Calculations
    // ==============================================

    /**
     * Calculate daily wage for employee
     *
     * @param {Number} hoursWorked - Hours worked
     * @param {Number} hourlyRate - Hourly rate (€/h)
     * @param {Object} options - Calculation options
     * @param {Number} options.standardHours - Standard work day (default: 8)
     * @param {Number} options.overtimeMultiplier - Overtime multiplier (default: 1.25)
     * @returns {Object} {wage, regularWage, overtimeWage, regularHours, overtimeHours, hourlyRate}
     *
     * @example
     * var result = MementoCalculations.calculateDailyWage(8.5, 12);
     * // { wage: 107.5, regularWage: 96, overtimeWage: 7.5, regularHours: 8, overtimeHours: 0.5, hourlyRate: 12 }
     */
    function calculateDailyWage(hoursWorked, hourlyRate, options) {
        options = options || {};
        var standardHours = options.standardHours || STANDARD_WORK_DAY_HOURS;
        var overtimeMultiplier = options.overtimeMultiplier || OVERTIME_MULTIPLIER;

        try {
            if (isEmpty(hoursWorked) || isEmpty(hourlyRate)) {
                return {
                    wage: 0,
                    regularWage: 0,
                    overtimeWage: 0,
                    regularHours: 0,
                    overtimeHours: 0,
                    hourlyRate: 0
                };
            }

            var hours = parseFloat(hoursWorked);
            var rate = parseFloat(hourlyRate);

            if (isNaN(hours) || isNaN(rate)) {
                return {
                    wage: 0,
                    regularWage: 0,
                    overtimeWage: 0,
                    regularHours: 0,
                    overtimeHours: 0,
                    hourlyRate: 0
                };
            }

            // Calculate regular and overtime hours
            var regularHours = Math.min(hours, standardHours);
            var overtimeHours = Math.max(0, hours - standardHours);

            // Calculate wages
            var regularWage = regularHours * rate;
            var overtimeWage = overtimeHours * rate * overtimeMultiplier;
            var totalWage = regularWage + overtimeWage;

            return {
                wage: Math.round(totalWage * 100) / 100,  // Round to 2 decimals
                regularWage: Math.round(regularWage * 100) / 100,
                overtimeWage: Math.round(overtimeWage * 100) / 100,
                regularHours: regularHours,
                overtimeHours: overtimeHours,
                hourlyRate: rate
            };

        } catch (error) {
            return {
                wage: 0,
                regularWage: 0,
                overtimeWage: 0,
                regularHours: 0,
                overtimeHours: 0,
                hourlyRate: 0,
                error: error.toString()
            };
        }
    }

    /**
     * Calculate monthly statistics for employee
     *
     * @param {Array} attendanceRecords - Array of attendance records
     * @param {Object} options - Calculation options
     * @returns {Object} {totalDays, workDays, weekends, holidays, totalHours, totalWage, overtimeHours}
     *
     * @example
     * var stats = MementoCalculations.calculateMonthlyStats(records);
     * // { totalDays: 31, workDays: 23, weekends: 8, holidays: 0, totalHours: 184, totalWage: 2208, overtimeHours: 0 }
     */
    function calculateMonthlyStats(attendanceRecords, options) {
        options = options || {};

        try {
            var dateModule = getDate();

            var stats = {
                totalDays: 0,
                workDays: 0,
                weekends: 0,
                holidays: 0,
                totalHours: 0,
                totalWage: 0,
                overtimeHours: 0,
                averageHours: 0
            };

            if (!attendanceRecords || !Array.isArray(attendanceRecords)) {
                return stats;
            }

            stats.totalDays = attendanceRecords.length;

            for (var i = 0; i < attendanceRecords.length; i++) {
                var record = attendanceRecords[i];

                // Check if weekend or holiday
                if (dateModule) {
                    if (dateModule.isWeekend(record.date)) {
                        stats.weekends++;
                    } else if (dateModule.isHoliday(record.date)) {
                        stats.holidays++;
                    } else {
                        stats.workDays++;
                    }
                } else {
                    stats.workDays++;
                }

                // Add hours and wage
                if (record.hours) {
                    stats.totalHours += record.hours;

                    // Calculate overtime
                    if (record.hours > STANDARD_WORK_DAY_HOURS) {
                        stats.overtimeHours += (record.hours - STANDARD_WORK_DAY_HOURS);
                    }
                }

                if (record.wage) {
                    stats.totalWage += record.wage;
                }
            }

            // Calculate average
            if (stats.totalDays > 0) {
                stats.averageHours = Math.round((stats.totalHours / stats.totalDays) * 100) / 100;
            }

            // Round totals
            stats.totalHours = Math.round(stats.totalHours * 100) / 100;
            stats.totalWage = Math.round(stats.totalWage * 100) / 100;
            stats.overtimeHours = Math.round(stats.overtimeHours * 100) / 100;

            return stats;

        } catch (error) {
            return {
                totalDays: 0,
                workDays: 0,
                weekends: 0,
                holidays: 0,
                totalHours: 0,
                totalWage: 0,
                overtimeHours: 0,
                averageHours: 0,
                error: error.toString()
            };
        }
    }

    // ==============================================
    // PUBLIC API - Break Time Calculations
    // ==============================================

    /**
     * Calculate mandatory break time based on work hours (Slovak labor law)
     *
     * @param {Number} workHours - Work hours
     * @returns {Object} {breakMinutes, breakHours, isRequired}
     *
     * @example
     * var breakTime = MementoCalculations.calculateBreak(8.5);
     * // { breakMinutes: 30, breakHours: 0.5, isRequired: true }
     */
    function calculateBreak(workHours) {
        try {
            if (isEmpty(workHours)) {
                return { breakMinutes: 0, breakHours: 0, isRequired: false };
            }

            var hours = parseFloat(workHours);
            if (isNaN(hours)) {
                return { breakMinutes: 0, breakHours: 0, isRequired: false };
            }

            // Slovak labor law: 30 min break for > 6 hours
            var breakMinutes = 0;
            var isRequired = false;

            if (hours > 6) {
                breakMinutes = 30;
                isRequired = true;
            }

            return {
                breakMinutes: breakMinutes,
                breakHours: breakMinutes / MINUTES_PER_HOUR,
                isRequired: isRequired
            };

        } catch (error) {
            return { breakMinutes: 0, breakHours: 0, isRequired: false, error: error.toString() };
        }
    }

    // ==============================================
    // PUBLIC API - Financial Calculations
    // ==============================================

    /**
     * Calculate profitability from costs and revenue
     *
     * @param {Number} costs - Total costs
     * @param {Number} revenue - Total revenue
     * @returns {Object} {profit, margin, marginPercent, roi}
     *
     * @example
     * var result = MementoCalculations.calculateProfitability(1000, 1500);
     * // { profit: 500, margin: 500, marginPercent: 33.33, roi: 0.5 }
     */
    function calculateProfitability(costs, revenue) {
        try {
            if (isEmpty(costs) || isEmpty(revenue)) {
                return { profit: 0, margin: 0, marginPercent: 0, roi: 0 };
            }

            var c = parseFloat(costs);
            var r = parseFloat(revenue);

            if (isNaN(c) || isNaN(r)) {
                return { profit: 0, margin: 0, marginPercent: 0, roi: 0 };
            }

            var profit = r - c;
            var margin = profit;
            var marginPercent = (r > 0) ? (profit / r) * 100 : 0;
            var roi = (c > 0) ? profit / c : 0;

            return {
                profit: Math.round(profit * 100) / 100,
                margin: Math.round(margin * 100) / 100,
                marginPercent: Math.round(marginPercent * 100) / 100,
                roi: Math.round(roi * 100) / 100
            };

        } catch (error) {
            return { profit: 0, margin: 0, marginPercent: 0, roi: 0, error: error.toString() };
        }
    }

    /**
     * Calculate VAT from base amount
     *
     * @param {Number} baseAmount - Amount without VAT
     * @param {Number} vatRate - VAT rate (default: 0.20 for 20%)
     * @returns {Object} {baseAmount, vatAmount, totalAmount, vatRate}
     *
     * @example
     * var result = MementoCalculations.calculateVAT(1000, 0.20);
     * // { baseAmount: 1000, vatAmount: 200, totalAmount: 1200, vatRate: 0.20 }
     */
    function calculateVAT(baseAmount, vatRate) {
        vatRate = vatRate !== undefined ? vatRate : STANDARD_VAT_RATE;

        try {
            if (isEmpty(baseAmount)) {
                return { baseAmount: 0, vatAmount: 0, totalAmount: 0, vatRate: vatRate };
            }

            var base = parseFloat(baseAmount);
            if (isNaN(base)) {
                return { baseAmount: 0, vatAmount: 0, totalAmount: 0, vatRate: vatRate };
            }

            var vat = base * vatRate;
            var total = base + vat;

            return {
                baseAmount: Math.round(base * 100) / 100,
                vatAmount: Math.round(vat * 100) / 100,
                totalAmount: Math.round(total * 100) / 100,
                vatRate: vatRate
            };

        } catch (error) {
            return { baseAmount: 0, vatAmount: 0, totalAmount: 0, vatRate: vatRate, error: error.toString() };
        }
    }

    /**
     * Calculate base amount from total (remove VAT)
     *
     * @param {Number} totalAmount - Amount with VAT
     * @param {Number} vatRate - VAT rate (default: 0.20 for 20%)
     * @returns {Object} {baseAmount, vatAmount, totalAmount, vatRate}
     *
     * @example
     * var result = MementoCalculations.removeVAT(1200, 0.20);
     * // { baseAmount: 1000, vatAmount: 200, totalAmount: 1200, vatRate: 0.20 }
     */
    function removeVAT(totalAmount, vatRate) {
        vatRate = vatRate !== undefined ? vatRate : STANDARD_VAT_RATE;

        try {
            if (isEmpty(totalAmount)) {
                return { baseAmount: 0, vatAmount: 0, totalAmount: 0, vatRate: vatRate };
            }

            var total = parseFloat(totalAmount);
            if (isNaN(total)) {
                return { baseAmount: 0, vatAmount: 0, totalAmount: 0, vatRate: vatRate };
            }

            var base = total / (1 + vatRate);
            var vat = total - base;

            return {
                baseAmount: Math.round(base * 100) / 100,
                vatAmount: Math.round(vat * 100) / 100,
                totalAmount: Math.round(total * 100) / 100,
                vatRate: vatRate
            };

        } catch (error) {
            return { baseAmount: 0, vatAmount: 0, totalAmount: 0, vatRate: vatRate, error: error.toString() };
        }
    }

    // ==============================================
    // PUBLIC API - Proration Calculations
    // ==============================================

    /**
     * Calculate prorated amount based on days
     *
     * @param {Number} amount - Full amount
     * @param {Number} days - Days worked/used
     * @param {Number} totalDays - Total days in period
     * @returns {Object} {proratedAmount, percentage, days, totalDays}
     *
     * @example
     * var result = MementoCalculations.calculateProration(1000, 15, 30);
     * // { proratedAmount: 500, percentage: 50, days: 15, totalDays: 30 }
     */
    function calculateProration(amount, days, totalDays) {
        try {
            if (isEmpty(amount) || isEmpty(days) || isEmpty(totalDays)) {
                return { proratedAmount: 0, percentage: 0, days: 0, totalDays: 0 };
            }

            var amt = parseFloat(amount);
            var d = parseFloat(days);
            var td = parseFloat(totalDays);

            if (isNaN(amt) || isNaN(d) || isNaN(td) || td === 0) {
                return { proratedAmount: 0, percentage: 0, days: 0, totalDays: 0 };
            }

            var percentage = (d / td) * 100;
            var prorated = amt * (d / td);

            return {
                proratedAmount: Math.round(prorated * 100) / 100,
                percentage: Math.round(percentage * 100) / 100,
                days: d,
                totalDays: td
            };

        } catch (error) {
            return { proratedAmount: 0, percentage: 0, days: 0, totalDays: 0, error: error.toString() };
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
        STANDARD_WORK_DAY_HOURS: STANDARD_WORK_DAY_HOURS,
        OVERTIME_MULTIPLIER: OVERTIME_MULTIPLIER,
        STANDARD_VAT_RATE: STANDARD_VAT_RATE,

        // Work hours calculations
        calculateWorkHours: calculateWorkHours,
        calculateOvertime: calculateOvertime,

        // Wage calculations
        calculateDailyWage: calculateDailyWage,
        calculateMonthlyStats: calculateMonthlyStats,

        // Break time calculations
        calculateBreak: calculateBreak,

        // Financial calculations
        calculateProfitability: calculateProfitability,
        calculateVAT: calculateVAT,
        removeVAT: removeVAT,

        // Proration calculations
        calculateProration: calculateProration
    };
})();
