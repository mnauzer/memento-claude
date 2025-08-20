// ==============================================
// MEMENTOCORE - Základné utility funkcie
// Verzia: 1.0 | Dátum: August 2025 | Autor: ASISTANTO
// ==============================================
// 📋 OBSAH:
//    - Logging funkcie (addDebug, addError, addInfo)
//    - Safe field access funkcie
//    - Časové a formátovacie funkcie
//    - Základné validácie
// ==============================================

var MementoCore = (function() {
    'use strict';
    
    // ==============================================
    // CONFIGURATION
    // ==============================================
    
    var config = {
        version: "1.0",
        debug: true,
        includeLineNumbers: true,
        includeStackTrace: false,
        
        // Field names
        debugFieldName: "Debug_Log",
        errorFieldName: "Error_Log",
        infoFieldName: "info",
        
        // Formatting
        dateFormat: "DD.MM.YY HH:mm",
        dateOnlyFormat: "DD.MM.YYYY",
        timeFormat: "HH:mm",
        quarterRoundingMinutes: 15,
        
        // Current library
        currentLib: null
    };
    
    // Bezpečná inicializácia
    try {
        config.currentLib = lib();
    } catch (e) {
        // OK - môže byť volané mimo Memento kontext
    }
    
    // ==============================================
    // LOGGING FUNCTIONS
    // ==============================================
    
    function addDebug(entry, message) {
        if (!entry || !config.debug) return;
        
        var timestamp = moment().format("HH:mm:ss");
        var debugMessage = "[" + timestamp + "] " + message;
        
        var existingDebug = entry.field(config.debugFieldName) || "";
        entry.set(config.debugFieldName, existingDebug + debugMessage + "\n");
    }
    
    function addError(entry, errorMessage, scriptName, errorObject) {
        if (!entry) return;
        
        var timestamp = moment().format("YYYY-MM-DD HH:mm:ss");
        var formattedMessage = "[" + timestamp + "] ";
        
        if (scriptName) {
            formattedMessage += scriptName + " - ";
        }
        
        formattedMessage += errorMessage;
        
        // Ak máme error objekt, pokúsime sa získať číslo riadku
        if (errorObject && typeof errorObject === "object") {
            if (errorObject.lineNumber && typeof errorObject.lineNumber === "function") {
                try {
                    var lineNum = errorObject.lineNumber();
                    if (lineNum) {
                        formattedMessage += " (line: " + lineNum + ")";
                    }
                } catch (e) {
                    // Ignoruj ak lineNumber nie je dostupné
                }
            }
            
            if (config.includeStackTrace && errorObject.stack) {
                formattedMessage += "\nStack: " + errorObject.stack;
            }
        }
        
        var existingError = entry.field(config.errorFieldName) || "";
        entry.set(config.errorFieldName, existingError + formattedMessage + "\n");
    }
    
    function addInfo(entry, message, details) {
        if (!entry) return;
        
        var timestamp = moment().format("DD.MM.YY HH:mm:ss");
        var infoMessage = "[" + timestamp + "] " + message;
        
        if (details && typeof details === "object") {
            infoMessage += "\n";
            for (var key in details) {
                if (details.hasOwnProperty(key)) {
                    infoMessage += "  • " + key + ": " + details[key] + "\n";
                }
            }
        }
        
        var existingInfo = entry.field(config.infoFieldName) || "";
        entry.set(config.infoFieldName, existingInfo + infoMessage + "\n");
    }
    
    function clearLogs(entry, clearErrors) {
        if (!entry) return;
        
        entry.set(config.debugFieldName, "");
        
        if (clearErrors) {
            entry.set(config.errorFieldName, "");
        }
    }
    
    // ==============================================
    // SAFE FIELD ACCESS
    // ==============================================
    
    function safeGet(entry, fieldName, defaultValue) {
        try {
            if (!entry || !fieldName) return defaultValue;
            
            var value = entry.field(fieldName);
            return (value !== null && value !== undefined) ? value : defaultValue;
            
        } catch (error) {
            return defaultValue;
        }
    }
    
    function safeSet(entry, fieldName, value) {
        try {
            if (!entry || !fieldName) return false;
            
            entry.set(fieldName, value);
            return true;
            
        } catch (error) {
            addError(entry, error.toString(), "safeSet: " + fieldName, error);
            return false;
        }
    }
    
    function safeGetAttribute(entry, linkFieldName, attributeName, defaultValue) {
        try {
            if (!entry || !linkFieldName || !attributeName) return defaultValue;
            
            var linkField = entry.field(linkFieldName);
            if (!linkField || linkField.length === 0) return defaultValue;
            
            var linkedEntry = Array.isArray(linkField) ? linkField[0] : linkField;
            var attrValue = linkedEntry.attr(attributeName);
            
            return (attrValue !== null && attrValue !== undefined) ? attrValue : defaultValue;
            
        } catch (error) {
            return defaultValue;
        }
    }
    
    function safeSetAttribute(entry, linkFieldName, attributeName, value) {
        try {
            if (!entry || !linkFieldName || !attributeName) return false;
            
            entry.setAttr(linkFieldName, attributeName, value);
            return true;
            
        } catch (error) {
            addError(entry, error.toString(), "safeSetAttribute: " + linkFieldName + "." + attributeName, error);
            return false;
        }
    }
    
    function safeGetLinks(entry, linkFieldName) {
        try {
            if (!entry || !linkFieldName) return [];
            
            var links = entry.field(linkFieldName);
            if (!links) return [];
            
            return Array.isArray(links) ? links : [links];
            
        } catch (error) {
            return [];
        }
    }
    
    // ==============================================
    // TIME & FORMATTING FUNCTIONS
    // ==============================================
    
    function formatDate(date, format) {
        if (!date) return "";
        
        try {
            return moment(date).format(format || config.dateOnlyFormat);
        } catch (e) {
            return "";
        }
    }
    
    function formatTime(time) {
        if (!time) return "00:00";
        
        try {
            // Ak je to moment objekt
            if (time._isAMomentObject) {
                return time.format(config.timeFormat);
            }
            
            // Ak je to číslo (minúty)
            if (typeof time === "number") {
                var hours = Math.floor(time / 60);
                var minutes = time % 60;
                return (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes;
            }
            
            // Ak je to string alebo Date
            return moment(time).format(config.timeFormat);
            
        } catch (e) {
            return "00:00";
        }
    }
    
    function formatMoney(amount, currency, decimals) {
        if (typeof amount !== "number") return "0.00 €";
        
        currency = currency || "€";
        decimals = decimals !== undefined ? decimals : 2;
        
        return amount.toFixed(decimals) + " " + currency;
    }
    
    function parseTimeToMinutes(timeString) {
        if (!timeString) return 0;
        
        try {
            // Formát HH:mm
            if (timeString.indexOf(":") > -1) {
                var parts = timeString.split(":");
                var hours = parseInt(parts[0]) || 0;
                var minutes = parseInt(parts[1]) || 0;
                return hours * 60 + minutes;
            }
            
            // Ak je to číslo, považuj za minúty
            return parseInt(timeString) || 0;
            
        } catch (e) {
            return 0;
        }
    }
    
    function roundToQuarter(time) {
        try {
            var mom = moment(time);
            var minutes = mom.minutes();
            var roundedMinutes = Math.round(minutes / config.quarterRoundingMinutes) * config.quarterRoundingMinutes;
            
            if (roundedMinutes === 60) {
                mom.add(1, 'hour').minutes(0);
            } else {
                mom.minutes(roundedMinutes);
            }
            
            return mom;
            
        } catch (e) {
            return moment();
        }
    }
    
    // ==============================================
    // BASIC VALIDATION
    // ==============================================
    
    function validateRequiredFields(entry, requiredFields) {
        var result = {
            valid: true,
            errors: [],
            missingFields: []
        };
        
        if (!entry || !requiredFields || !Array.isArray(requiredFields)) {
            result.valid = false;
            result.errors.push("Invalid parameters");
            return result;
        }
        
        for (var i = 0; i < requiredFields.length; i++) {
            var fieldName = requiredFields[i];
            var value = entry.field(fieldName);
            
            if (value === null || value === undefined || value === "") {
                result.valid = false;
                result.missingFields.push(fieldName);
                result.errors.push("Pole '" + fieldName + "' je povinné");
            }
        }
        
        return result;
    }
    
    // ==============================================
    // UTILITY FUNCTIONS
    // ==============================================
    
    function findEntryById(libraryName, entryId) {
        try {
            var targetLib = libByName(libraryName);
            if (!targetLib) return null;
            
            var entries = targetLib.find("ID", entryId);
            return entries.length > 0 ? entries[0] : null;
            
        } catch (error) {
            addError(entry(), error.toString(), "findEntryById", error);
            return null;
        }
    }
    
    function getSettings(libraryName, fieldName) {
        try {
            var settingsLib = libByName(libraryName);
            if (!settingsLib) {
                addError(entry(), "Library '" + libraryName + "' not found", "getSettings");
                return null;
            }
            
            var entries = settingsLib.entries();
            if (!entries || entries.length === 0) {
                addError(entry(), "No entries in '" + libraryName + "'", "getSettings");
                return null;
            }
            
            var settingsEntry = entries[0];
            
            if (fieldName) {
                return settingsEntry.field(fieldName);
            }
            
            // Return whole settings object
            var settings = {};
            var libFields = settingsLib.fields();
            
            for (var i = 0; i < libFields.length; i++) {
                var fieldDef = libFields[i];
                var fieldValue = settingsEntry.field(fieldDef.name);
                settings[fieldDef.name] = fieldValue;
            }
            
            return settings;
            
        } catch (error) {
            addError(entry(), error.toString(), "getSettings", error);
            return null;
        }
    }
    
    // ==============================================
    // ALIAS FUNCTIONS
    // ==============================================
    
    function safeFieldAccess(entry, fieldName, defaultValue) {
        return safeGet(entry, fieldName, defaultValue);
    }
    
    function saveLogs(entry) {
        // V Memento sa logy ukladajú automaticky
        return true;
    }
    
    // ==============================================
    // PUBLIC API
    // ==============================================
    
    return {
        // Version
        version: config.version,
        config: config,
        
        // Logging
        addDebug: addDebug,
        addError: addError,
        addInfo: addInfo,
        clearLogs: clearLogs,
        saveLogs: saveLogs,
        
        // Safe field access
        safeGet: safeGet,
        safeSet: safeSet,
        safeFieldAccess: safeFieldAccess,
        safeGetAttribute: safeGetAttribute,
        safeSetAttribute: safeSetAttribute,
        safeGetLinks: safeGetLinks,
        
        // Time & formatting
        formatDate: formatDate,
        formatTime: formatTime,
        formatMoney: formatMoney,
        parseTimeToMinutes: parseTimeToMinutes,
        roundToQuarter: roundToQuarter,
        
        // Validation
        validateRequiredFields: validateRequiredFields,
        
        // Utilities
        findEntryById: findEntryById,
        getSettings: getSettings
    };
})();