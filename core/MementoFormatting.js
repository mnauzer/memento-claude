// ==============================================
// MEMENTO FORMATTING - Formatting Utilities Module
// Verzia: 1.0.0 | Dátum: 2026-03-19 | Autor: ASISTANTO
// ==============================================
// 📋 PURPOSE:
//    - Money formatting (€ currency)
//    - Number formatting (Slovak locale)
//    - Duration formatting (hours → "8:30")
//    - Percentage formatting
//    - Employee name formatting
//    - Markdown generation
// ==============================================
// 🔧 DEPENDENCIES:
//    - MementoCore (optional - for safe field access)
// ==============================================
// 📖 USAGE:
//    var money = MementoFormatting.formatMoney(1250.50); // "1 250,50 €"
//    var duration = MementoFormatting.formatDuration(8.5); // "8:30"
//    var percent = MementoFormatting.formatPercent(0.15, 1); // "15,0%"
// ==============================================
// 🎯 PHASE 3: New focused formatting module
// ==============================================

var MementoFormatting = (function() {
    'use strict';

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "MementoFormatting",
        version: "1.0.0",
        author: "ASISTANTO",
        description: "Formatting utilities for display (money, numbers, duration, markdown)",
        dependencies: [],  // Optional: MementoCore for enhanced features
        provides: [
            "formatMoney", "formatNumber", "formatDuration", "formatPercent",
            "formatEmployeeName", "formatMarkdown", "formatPhoneNumber"
        ],
        status: "stable",
        note: "Phase 3: New focused formatting module"
    };

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
     * Get safe Core reference
     * @private
     */
    function getCore() {
        return (typeof MementoCore !== 'undefined') ? MementoCore : null;
    }

    /**
     * Pad number with leading zeros
     * @private
     */
    function padLeft(str, length, char) {
        char = char || '0';
        str = String(str);
        while (str.length < length) {
            str = char + str;
        }
        return str;
    }

    // ==============================================
    // PUBLIC API - Money Formatting
    // ==============================================

    /**
     * Format amount as Slovak currency (Euro)
     *
     * @param {Number} amount - Amount to format
     * @param {Object} options - Formatting options
     * @param {Number} options.decimals - Number of decimal places (default: 2)
     * @param {Boolean} options.showCurrency - Show € symbol (default: true)
     * @param {Boolean} options.showZero - Show "0,00 €" for zero (default: true)
     * @returns {String} Formatted money string
     *
     * @example
     * MementoFormatting.formatMoney(1250.5); // "1 250,50 €"
     * MementoFormatting.formatMoney(1250.5, {decimals: 0}); // "1 251 €"
     * MementoFormatting.formatMoney(0, {showZero: false}); // ""
     */
    function formatMoney(amount, options) {
        options = options || {};
        var decimals = options.decimals !== undefined ? options.decimals : 2;
        var showCurrency = options.showCurrency !== undefined ? options.showCurrency : true;
        var showZero = options.showZero !== undefined ? options.showZero : true;

        try {
            if (isEmpty(amount)) {
                return showZero ? (showCurrency ? "0,00 €" : "0,00") : "";
            }

            var num = parseFloat(amount);
            if (isNaN(num)) {
                return showZero ? (showCurrency ? "0,00 €" : "0,00") : "";
            }

            // Don't show zero if option is false
            if (num === 0 && !showZero) {
                return "";
            }

            // Round to specified decimals
            num = Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);

            // Convert to string with decimals
            var str = num.toFixed(decimals);

            // Replace . with ,
            str = str.replace('.', ',');

            // Add thousands separator (space)
            var parts = str.split(',');
            var integerPart = parts[0];
            var decimalPart = parts[1] || '';

            // Add space every 3 digits from right
            var formatted = '';
            for (var i = integerPart.length - 1, count = 0; i >= 0; i--, count++) {
                if (count > 0 && count % 3 === 0) {
                    formatted = ' ' + formatted;
                }
                formatted = integerPart[i] + formatted;
            }

            // Combine integer and decimal parts
            if (decimalPart) {
                formatted += ',' + decimalPart;
            }

            // Add currency symbol
            if (showCurrency) {
                formatted += ' €';
            }

            return formatted;

        } catch (error) {
            return showZero ? (showCurrency ? "0,00 €" : "0,00") : "";
        }
    }

    /**
     * Format number with Slovak locale (space as thousands separator, comma as decimal)
     *
     * @param {Number} number - Number to format
     * @param {Number} decimals - Number of decimal places (default: 2)
     * @returns {String} Formatted number string
     *
     * @example
     * MementoFormatting.formatNumber(1234.567, 2); // "1 234,57"
     * MementoFormatting.formatNumber(1234.567, 0); // "1 235"
     */
    function formatNumber(number, decimals) {
        decimals = decimals !== undefined ? decimals : 2;

        try {
            if (isEmpty(number)) {
                return "0";
            }

            var num = parseFloat(number);
            if (isNaN(num)) {
                return "0";
            }

            // Round to specified decimals
            num = Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);

            // Convert to string with decimals
            var str = num.toFixed(decimals);

            // Replace . with ,
            str = str.replace('.', ',');

            // Add thousands separator (space)
            var parts = str.split(',');
            var integerPart = parts[0];
            var decimalPart = parts[1] || '';

            // Add space every 3 digits from right
            var formatted = '';
            for (var i = integerPart.length - 1, count = 0; i >= 0; i--, count++) {
                if (count > 0 && count % 3 === 0) {
                    formatted = ' ' + formatted;
                }
                formatted = integerPart[i] + formatted;
            }

            // Combine integer and decimal parts
            if (decimalPart && decimals > 0) {
                formatted += ',' + decimalPart;
            }

            return formatted;

        } catch (error) {
            return "0";
        }
    }

    // ==============================================
    // PUBLIC API - Duration Formatting
    // ==============================================

    /**
     * Format hours as duration string (HH:MM format)
     *
     * @param {Number} hours - Hours as decimal (e.g., 8.5 = 8:30)
     * @param {Object} options - Formatting options
     * @param {Boolean} options.showSeconds - Show seconds (default: false)
     * @returns {String} Formatted duration string
     *
     * @example
     * MementoFormatting.formatDuration(8.5); // "8:30"
     * MementoFormatting.formatDuration(0.25); // "0:15"
     * MementoFormatting.formatDuration(10.75); // "10:45"
     */
    function formatDuration(hours, options) {
        options = options || {};
        var showSeconds = options.showSeconds || false;

        try {
            if (isEmpty(hours)) {
                return "0:00";
            }

            var num = parseFloat(hours);
            if (isNaN(num)) {
                return "0:00";
            }

            // Convert hours to total minutes
            var totalMinutes = Math.round(num * 60);

            // Calculate hours and minutes
            var h = Math.floor(totalMinutes / 60);
            var m = totalMinutes % 60;

            // Format
            var formatted = h + ':' + padLeft(m, 2);

            if (showSeconds) {
                formatted += ':00';
            }

            return formatted;

        } catch (error) {
            return "0:00";
        }
    }

    /**
     * Format minutes as duration string (HH:MM format)
     *
     * @param {Number} minutes - Minutes as number
     * @returns {String} Formatted duration string
     *
     * @example
     * MementoFormatting.formatMinutes(90); // "1:30"
     * MementoFormatting.formatMinutes(15); // "0:15"
     */
    function formatMinutes(minutes) {
        try {
            if (isEmpty(minutes)) {
                return "0:00";
            }

            var num = parseInt(minutes, 10);
            if (isNaN(num)) {
                return "0:00";
            }

            var h = Math.floor(num / 60);
            var m = num % 60;

            return h + ':' + padLeft(m, 2);

        } catch (error) {
            return "0:00";
        }
    }

    // ==============================================
    // PUBLIC API - Percentage Formatting
    // ==============================================

    /**
     * Format decimal as percentage
     *
     * @param {Number} value - Decimal value (0.15 = 15%)
     * @param {Number} decimals - Number of decimal places (default: 1)
     * @returns {String} Formatted percentage string
     *
     * @example
     * MementoFormatting.formatPercent(0.15, 1); // "15,0%"
     * MementoFormatting.formatPercent(0.1234, 2); // "12,34%"
     * MementoFormatting.formatPercent(1, 0); // "100%"
     */
    function formatPercent(value, decimals) {
        decimals = decimals !== undefined ? decimals : 1;

        try {
            if (isEmpty(value)) {
                return "0%";
            }

            var num = parseFloat(value);
            if (isNaN(num)) {
                return "0%";
            }

            // Convert to percentage
            var percent = num * 100;

            // Round to specified decimals
            percent = Math.round(percent * Math.pow(10, decimals)) / Math.pow(10, decimals);

            // Format with comma as decimal separator
            var str = percent.toFixed(decimals);
            str = str.replace('.', ',');

            return str + '%';

        } catch (error) {
            return "0%";
        }
    }

    // ==============================================
    // PUBLIC API - Name Formatting
    // ==============================================

    /**
     * Format employee name from entry
     *
     * @param {Object} employeeEntry - Employee entry object
     * @param {Object} options - Formatting options
     * @param {Boolean} options.showNick - Include nickname if available (default: true)
     * @param {String} options.nameField - Field name for full name (default: "Meno a priezvisko")
     * @param {String} options.nickField - Field name for nickname (default: "Prezývka")
     * @returns {String} Formatted employee name
     *
     * @example
     * MementoFormatting.formatEmployeeName(empEntry);
     * // "Peter Novák (Peťo)"
     *
     * MementoFormatting.formatEmployeeName(empEntry, {showNick: false});
     * // "Peter Novák"
     */
    function formatEmployeeName(employeeEntry, options) {
        options = options || {};
        var showNick = options.showNick !== undefined ? options.showNick : true;
        var nameField = options.nameField || "Meno a priezvisko";
        var nickField = options.nickField || "Prezývka";

        try {
            if (!employeeEntry) {
                return "N/A";
            }

            var core = getCore();

            // Get full name
            var fullName;
            if (core && core.safeGet) {
                fullName = core.safeGet(employeeEntry, nameField, "N/A");
            } else {
                fullName = employeeEntry.field(nameField) || "N/A";
            }

            // Get nickname if requested
            if (showNick) {
                var nick;
                if (core && core.safeGet) {
                    nick = core.safeGet(employeeEntry, nickField);
                } else {
                    nick = employeeEntry.field(nickField);
                }

                if (nick) {
                    return fullName + " (" + nick + ")";
                }
            }

            return fullName;

        } catch (error) {
            return "N/A";
        }
    }

    // ==============================================
    // PUBLIC API - Phone Number Formatting
    // ==============================================

    /**
     * Format Slovak phone number
     *
     * @param {String} phone - Phone number to format
     * @param {Object} options - Formatting options
     * @param {Boolean} options.international - Use international format (default: false)
     * @returns {String} Formatted phone number
     *
     * @example
     * MementoFormatting.formatPhoneNumber("0901234567");
     * // "0901 234 567"
     *
     * MementoFormatting.formatPhoneNumber("0901234567", {international: true});
     * // "+421 901 234 567"
     */
    function formatPhoneNumber(phone, options) {
        options = options || {};
        var international = options.international || false;

        try {
            if (isEmpty(phone)) {
                return "";
            }

            // Remove all spaces and separators
            var cleaned = String(phone).replace(/[\s\-\(\)]/g, '');

            // Handle international format
            if (cleaned.startsWith('+421')) {
                cleaned = cleaned.substring(4);
                international = true;
            } else if (cleaned.startsWith('00421')) {
                cleaned = cleaned.substring(5);
                international = true;
            } else if (cleaned.startsWith('0')) {
                cleaned = cleaned.substring(1);
            }

            // Format as XXX XXX XXX
            if (cleaned.length === 9) {
                var formatted = cleaned.substring(0, 3) + ' ' +
                               cleaned.substring(3, 6) + ' ' +
                               cleaned.substring(6, 9);

                if (international) {
                    return '+421 ' + formatted;
                } else {
                    return '0' + formatted;
                }
            }

            // Return cleaned if format doesn't match
            return phone;

        } catch (error) {
            return phone;
        }
    }

    // ==============================================
    // PUBLIC API - Markdown Formatting
    // ==============================================

    /**
     * Generate markdown formatted text
     *
     * @param {String} type - Markdown type ("bold", "italic", "code", "link")
     * @param {String} text - Text to format
     * @param {String} url - URL for links (optional)
     * @returns {String} Markdown formatted text
     *
     * @example
     * MementoFormatting.formatMarkdown("bold", "Important");
     * // "**Important**"
     *
     * MementoFormatting.formatMarkdown("link", "Click here", "https://example.com");
     * // "[Click here](https://example.com)"
     */
    function formatMarkdown(type, text, url) {
        try {
            if (isEmpty(text)) {
                return "";
            }

            switch (type) {
                case "bold":
                    return "**" + text + "**";
                case "italic":
                    return "*" + text + "*";
                case "code":
                    return "`" + text + "`";
                case "link":
                    if (url) {
                        return "[" + text + "](" + url + ")";
                    }
                    return text;
                case "heading":
                    return "### " + text;
                default:
                    return text;
            }

        } catch (error) {
            return text;
        }
    }

    /**
     * Create formatted list from array
     *
     * @param {Array} items - Array of items
     * @param {Object} options - Formatting options
     * @param {String} options.bullet - Bullet character (default: "•")
     * @param {Number} options.maxItems - Max items to show (default: unlimited)
     * @returns {String} Formatted list string
     *
     * @example
     * var items = ["Item 1", "Item 2", "Item 3"];
     * MementoFormatting.formatList(items);
     * // "• Item 1\n• Item 2\n• Item 3"
     */
    function formatList(items, options) {
        options = options || {};
        var bullet = options.bullet || "•";
        var maxItems = options.maxItems || items.length;

        try {
            if (!items || !Array.isArray(items) || items.length === 0) {
                return "";
            }

            var formatted = "";
            var count = Math.min(items.length, maxItems);

            for (var i = 0; i < count; i++) {
                formatted += bullet + " " + items[i];
                if (i < count - 1) {
                    formatted += "\n";
                }
            }

            if (items.length > maxItems) {
                formatted += "\n" + bullet + " ... a " + (items.length - maxItems) + " ďalších";
            }

            return formatted;

        } catch (error) {
            return "";
        }
    }

    // ==============================================
    // PUBLIC API
    // ==============================================

    return {
        // Module metadata
        info: MODULE_INFO,
        version: MODULE_INFO.version,

        // Money formatting
        formatMoney: formatMoney,
        formatNumber: formatNumber,

        // Duration formatting
        formatDuration: formatDuration,
        formatMinutes: formatMinutes,

        // Percentage formatting
        formatPercent: formatPercent,

        // Name formatting
        formatEmployeeName: formatEmployeeName,

        // Phone formatting
        formatPhoneNumber: formatPhoneNumber,

        // Markdown formatting
        formatMarkdown: formatMarkdown,
        formatList: formatList
    };
})();
