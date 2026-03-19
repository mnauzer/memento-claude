// ==============================================
// MEMENTO VALIDATION - Validation Utilities Module
// Verzia: 1.0.0 | Dátum: 2026-03-19 | Autor: ASISTANTO
// ==============================================
// 📋 PURPOSE:
//    - Field validation patterns
//    - Data type validation
//    - Business rule validation
//    - Range checks
//    - Required field validation
// ==============================================
// 🔧 DEPENDENCIES:
//    - moment.js (for date validation)
//    - MementoCore (for safe field access)
// ==============================================
// 📖 USAGE:
//    var isValid = MementoValidation.validateTime(timeValue);
//    var result = MementoValidation.validateNumber(amount, {min: 0, max: 1000});
//    var check = MementoValidation.validateRequired(entry, ["Dátum", "Suma"]);
// ==============================================
// 🎯 PHASE 3: New focused validation module
// ==============================================

var MementoValidation = (function() {
    'use strict';

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "MementoValidation",
        version: "1.0.0",
        author: "ASISTANTO",
        description: "Validation utilities and patterns for data integrity",
        dependencies: ["MementoCore"],  // Optional for enhanced validation
        provides: [
            "validateTime", "validateDate", "validateNumber", "validateRequired",
            "validateRange", "validateEmail", "validatePhone", "validateEmployee"
        ],
        status: "stable",
        note: "Phase 3: New focused validation module"
    };

    // ==============================================
    // PRIVATE HELPERS
    // ==============================================

    /**
     * Check if value is empty (null, undefined, empty string)
     * @private
     */
    function isEmpty(value) {
        return value === null || value === undefined || value === "";
    }

    /**
     * Get safe Core reference
     * @private
     */
    function getCore() {
        return (typeof MementoCore !== 'undefined') ? MementoCore : null;
    }

    // ==============================================
    // PUBLIC API - Basic Type Validation
    // ==============================================

    /**
     * Validate time value
     *
     * @param {Date|String|moment} timeValue - Time value to validate
     * @param {Object} options - Validation options
     * @param {Boolean} options.required - Is field required (default: false)
     * @param {String} options.format - Expected time format (default: auto-detect)
     * @returns {Object} {valid: boolean, error: string}
     *
     * @example
     * var result = MementoValidation.validateTime("08:30");
     * // { valid: true, error: null }
     *
     * var result2 = MementoValidation.validateTime(null, {required: true});
     * // { valid: false, error: "Time is required" }
     */
    function validateTime(timeValue, options) {
        options = options || {};

        try {
            // Check if required
            if (options.required && isEmpty(timeValue)) {
                return { valid: false, error: "Time is required" };
            }

            // Allow empty if not required
            if (isEmpty(timeValue)) {
                return { valid: true, error: null };
            }

            // Check if moment.js is available
            if (typeof moment === 'undefined') {
                return { valid: false, error: "moment.js not available" };
            }

            // Try to parse time
            var timeMoment = moment(timeValue);
            if (!timeMoment.isValid()) {
                return { valid: false, error: "Invalid time format" };
            }

            return { valid: true, error: null };

        } catch (error) {
            return { valid: false, error: error.toString() };
        }
    }

    /**
     * Validate date value
     *
     * @param {Date|String|moment} dateValue - Date value to validate
     * @param {Object} options - Validation options
     * @param {Boolean} options.required - Is field required (default: false)
     * @param {Date} options.minDate - Minimum allowed date
     * @param {Date} options.maxDate - Maximum allowed date
     * @returns {Object} {valid: boolean, error: string}
     *
     * @example
     * var result = MementoValidation.validateDate("2026-03-19");
     * // { valid: true, error: null }
     *
     * var result2 = MementoValidation.validateDate("2020-01-01", {
     *     minDate: new Date("2025-01-01")
     * });
     * // { valid: false, error: "Date is before minimum allowed date" }
     */
    function validateDate(dateValue, options) {
        options = options || {};

        try {
            // Check if required
            if (options.required && isEmpty(dateValue)) {
                return { valid: false, error: "Date is required" };
            }

            // Allow empty if not required
            if (isEmpty(dateValue)) {
                return { valid: true, error: null };
            }

            // Check if moment.js is available
            if (typeof moment === 'undefined') {
                return { valid: false, error: "moment.js not available" };
            }

            // Try to parse date
            var dateMoment = moment(dateValue);
            if (!dateMoment.isValid()) {
                return { valid: false, error: "Invalid date format" };
            }

            // Check min date
            if (options.minDate) {
                var minMoment = moment(options.minDate);
                if (dateMoment.isBefore(minMoment)) {
                    return { valid: false, error: "Date is before minimum allowed date" };
                }
            }

            // Check max date
            if (options.maxDate) {
                var maxMoment = moment(options.maxDate);
                if (dateMoment.isAfter(maxMoment)) {
                    return { valid: false, error: "Date is after maximum allowed date" };
                }
            }

            return { valid: true, error: null };

        } catch (error) {
            return { valid: false, error: error.toString() };
        }
    }

    /**
     * Validate number value
     *
     * @param {Number|String} numValue - Number value to validate
     * @param {Object} options - Validation options
     * @param {Boolean} options.required - Is field required (default: false)
     * @param {Number} options.min - Minimum allowed value
     * @param {Number} options.max - Maximum allowed value
     * @param {Boolean} options.integer - Must be integer (default: false)
     * @param {Boolean} options.positive - Must be positive (default: false)
     * @returns {Object} {valid: boolean, error: string, value: number}
     *
     * @example
     * var result = MementoValidation.validateNumber(150, {min: 0, max: 1000});
     * // { valid: true, error: null, value: 150 }
     *
     * var result2 = MementoValidation.validateNumber(-5, {positive: true});
     * // { valid: false, error: "Number must be positive" }
     */
    function validateNumber(numValue, options) {
        options = options || {};

        try {
            // Check if required
            if (options.required && isEmpty(numValue)) {
                return { valid: false, error: "Number is required", value: null };
            }

            // Allow empty if not required
            if (isEmpty(numValue)) {
                return { valid: true, error: null, value: null };
            }

            // Try to parse number
            var num = parseFloat(numValue);
            if (isNaN(num)) {
                return { valid: false, error: "Invalid number format", value: null };
            }

            // Check if integer required
            if (options.integer && num !== Math.floor(num)) {
                return { valid: false, error: "Number must be an integer", value: null };
            }

            // Check if positive required
            if (options.positive && num <= 0) {
                return { valid: false, error: "Number must be positive", value: null };
            }

            // Check min value
            if (options.min !== undefined && num < options.min) {
                return { valid: false, error: "Number must be at least " + options.min, value: null };
            }

            // Check max value
            if (options.max !== undefined && num > options.max) {
                return { valid: false, error: "Number must be at most " + options.max, value: null };
            }

            return { valid: true, error: null, value: num };

        } catch (error) {
            return { valid: false, error: error.toString(), value: null };
        }
    }

    // ==============================================
    // PUBLIC API - Field Validation
    // ==============================================

    /**
     * Validate required fields exist and are not empty
     *
     * @param {Object} entry - Memento entry object
     * @param {Array<String>} fieldNames - Array of required field names
     * @returns {Object} {valid: boolean, missing: Array<String>, error: string}
     *
     * @example
     * var result = MementoValidation.validateRequired(entry(), ["Dátum", "Suma"]);
     * // { valid: true, missing: [], error: null }
     *
     * var result2 = MementoValidation.validateRequired(entry(), ["ID", "Názov"]);
     * // { valid: false, missing: ["Názov"], error: "Missing required fields: Názov" }
     */
    function validateRequired(entry, fieldNames) {
        try {
            if (!entry || !fieldNames || !Array.isArray(fieldNames)) {
                return { valid: false, missing: [], error: "Invalid parameters" };
            }

            var core = getCore();
            var missing = [];

            for (var i = 0; i < fieldNames.length; i++) {
                var fieldName = fieldNames[i];
                var value;

                if (core && core.safeGet) {
                    value = core.safeGet(entry, fieldName);
                } else {
                    value = entry.field(fieldName);
                }

                if (isEmpty(value)) {
                    missing.push(fieldName);
                }
            }

            if (missing.length > 0) {
                return {
                    valid: false,
                    missing: missing,
                    error: "Missing required fields: " + missing.join(", ")
                };
            }

            return { valid: true, missing: [], error: null };

        } catch (error) {
            return { valid: false, missing: [], error: error.toString() };
        }
    }

    /**
     * Validate value is within range
     *
     * @param {Number} value - Value to check
     * @param {Number} min - Minimum value (inclusive)
     * @param {Number} max - Maximum value (inclusive)
     * @returns {Object} {valid: boolean, error: string}
     *
     * @example
     * var result = MementoValidation.validateRange(50, 0, 100);
     * // { valid: true, error: null }
     *
     * var result2 = MementoValidation.validateRange(150, 0, 100);
     * // { valid: false, error: "Value 150 is outside range 0-100" }
     */
    function validateRange(value, min, max) {
        try {
            if (isEmpty(value)) {
                return { valid: false, error: "Value is empty" };
            }

            var num = parseFloat(value);
            if (isNaN(num)) {
                return { valid: false, error: "Value is not a number" };
            }

            if (num < min || num > max) {
                return {
                    valid: false,
                    error: "Value " + num + " is outside range " + min + "-" + max
                };
            }

            return { valid: true, error: null };

        } catch (error) {
            return { valid: false, error: error.toString() };
        }
    }

    // ==============================================
    // PUBLIC API - Pattern Validation
    // ==============================================

    /**
     * Validate email format
     *
     * @param {String} email - Email address to validate
     * @param {Object} options - Validation options
     * @param {Boolean} options.required - Is field required (default: false)
     * @returns {Object} {valid: boolean, error: string}
     *
     * @example
     * var result = MementoValidation.validateEmail("user@example.com");
     * // { valid: true, error: null }
     *
     * var result2 = MementoValidation.validateEmail("invalid-email");
     * // { valid: false, error: "Invalid email format" }
     */
    function validateEmail(email, options) {
        options = options || {};

        try {
            // Check if required
            if (options.required && isEmpty(email)) {
                return { valid: false, error: "Email is required" };
            }

            // Allow empty if not required
            if (isEmpty(email)) {
                return { valid: true, error: null };
            }

            // Simple email regex pattern
            var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(email)) {
                return { valid: false, error: "Invalid email format" };
            }

            return { valid: true, error: null };

        } catch (error) {
            return { valid: false, error: error.toString() };
        }
    }

    /**
     * Validate Slovak phone number format
     *
     * @param {String} phone - Phone number to validate
     * @param {Object} options - Validation options
     * @param {Boolean} options.required - Is field required (default: false)
     * @returns {Object} {valid: boolean, error: string}
     *
     * @example
     * var result = MementoValidation.validatePhone("+421901234567");
     * // { valid: true, error: null }
     *
     * var result2 = MementoValidation.validatePhone("123");
     * // { valid: false, error: "Invalid phone number format" }
     */
    function validatePhone(phone, options) {
        options = options || {};

        try {
            // Check if required
            if (options.required && isEmpty(phone)) {
                return { valid: false, error: "Phone number is required" };
            }

            // Allow empty if not required
            if (isEmpty(phone)) {
                return { valid: true, error: null };
            }

            // Remove spaces and common separators
            var cleaned = phone.replace(/[\s\-\(\)]/g, '');

            // Slovak phone number patterns:
            // +421XXXXXXXXX (international format)
            // 0XXXXXXXXX (national format)
            var phonePattern = /^(\+421|0)[0-9]{9}$/;
            if (!phonePattern.test(cleaned)) {
                return { valid: false, error: "Invalid phone number format" };
            }

            return { valid: true, error: null };

        } catch (error) {
            return { valid: false, error: error.toString() };
        }
    }

    // ==============================================
    // PUBLIC API - Business Rule Validation
    // ==============================================

    /**
     * Validate employee entry
     *
     * @param {Object} employee - Employee entry object
     * @param {Object} options - Validation options
     * @param {Boolean} options.checkActive - Check if employee is active (default: false)
     * @returns {Object} {valid: boolean, error: string}
     *
     * @example
     * var result = MementoValidation.validateEmployee(empEntry);
     * // { valid: true, error: null }
     */
    function validateEmployee(employee, options) {
        options = options || {};

        try {
            if (!employee) {
                return { valid: false, error: "Employee entry is null" };
            }

            var core = getCore();

            // Check required fields
            var name;
            if (core && core.safeGet) {
                name = core.safeGet(employee, "Meno a priezvisko");
            } else {
                name = employee.field("Meno a priezvisko");
            }

            if (isEmpty(name)) {
                return { valid: false, error: "Employee name is missing" };
            }

            // Check if active (if required)
            if (options.checkActive) {
                var active;
                if (core && core.safeGet) {
                    active = core.safeGet(employee, "Aktívny");
                } else {
                    active = employee.field("Aktívny");
                }

                if (active === false) {
                    return { valid: false, error: "Employee is not active" };
                }
            }

            return { valid: true, error: null };

        } catch (error) {
            return { valid: false, error: error.toString() };
        }
    }

    /**
     * Validate work hours are within reasonable range
     *
     * @param {Number} hours - Work hours to validate
     * @param {Object} options - Validation options
     * @param {Number} options.maxDailyHours - Max daily hours (default: 24)
     * @param {Number} options.maxMonthlyHours - Max monthly hours (default: 250)
     * @returns {Object} {valid: boolean, error: string}
     *
     * @example
     * var result = MementoValidation.validateWorkHours(8);
     * // { valid: true, error: null }
     *
     * var result2 = MementoValidation.validateWorkHours(30);
     * // { valid: false, error: "Work hours exceed maximum daily limit" }
     */
    function validateWorkHours(hours, options) {
        options = options || {};
        var maxDaily = options.maxDailyHours || 24;
        var maxMonthly = options.maxMonthlyHours || 250;

        try {
            if (isEmpty(hours)) {
                return { valid: false, error: "Work hours is empty" };
            }

            var num = parseFloat(hours);
            if (isNaN(num)) {
                return { valid: false, error: "Work hours is not a number" };
            }

            if (num < 0) {
                return { valid: false, error: "Work hours cannot be negative" };
            }

            if (num > maxDaily) {
                return { valid: false, error: "Work hours exceed maximum daily limit (" + maxDaily + "h)" };
            }

            return { valid: true, error: null };

        } catch (error) {
            return { valid: false, error: error.toString() };
        }
    }

    // ==============================================
    // PUBLIC API
    // ==============================================

    return {
        // Module metadata
        info: MODULE_INFO,
        version: MODULE_INFO.version,

        // Basic type validation
        validateTime: validateTime,
        validateDate: validateDate,
        validateNumber: validateNumber,

        // Field validation
        validateRequired: validateRequired,
        validateRange: validateRange,

        // Pattern validation
        validateEmail: validateEmail,
        validatePhone: validatePhone,

        // Business rule validation
        validateEmployee: validateEmployee,
        validateWorkHours: validateWorkHours
    };
})();
