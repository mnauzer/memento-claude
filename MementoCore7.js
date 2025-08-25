// ==============================================
// MEMENTO CORE - Základné funkcie
// Verzia: 7.0 | Dátum: August 2025 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
//    - Základné utility funkcie pre všetky scripty
//    - Logging, formátovanie, validácia
//    - Safe field access
//    - Žiadne závislosti na iných moduloch
// ==============================================
// 🔧 CHANGELOG v7.0:
//    - Zjednodušená štruktúra bez fallbackov
//    - Priamy prístup k MementoConfig
//    - Slovenské komentáre
//    - Optimalizované funkcie
// ==============================================

var MementoCore = (function() {
    'use strict';
    
    var version = "7.0";
    
    // Lazy loading pre MementoConfig
    var _config = null;
    function getConfig() {
        if (!_config && typeof MementoConfig !== 'undefined') {
            _config = MementoConfig.getConfig();
        }
        return _config;
    }
    
    // ==============================================
    // LOGGING FUNKCIE
    // ==============================================
    
    /**
     * Pridá debug správu do Debug_Log poľa
     * @param {Entry} entry - Memento entry objekt
     * @param {string} message - Debug správa
     */
    function addDebug(entry, message) {
        try {
            var config = getConfig();
            var debugFieldName = config ? config.fields.common.debugLog : "Debug_Log";
            
            var timestamp = moment().format("DD.MM.YY HH:mm");
            var debugMessage = "[" + timestamp + "] " + message;
            
            var existingDebug = entry.field(debugFieldName) || "";
            entry.set(debugFieldName, existingDebug + debugMessage + "\n");
        } catch (e) {
            // Nemôžeme logovať chybu logovania
        }
    }
    
    /**
     * Pridá error správu do Error_Log poľa
     * @param {Entry} entry - Memento entry objekt
     * @param {string} message - Error správa
     * @param {string} source - Názov funkcie/miesto kde vznikla chyba
     * @param {Error} error - JavaScript Error objekt (optional)
     */
    function addError(entry, message, source, error) {
        try {
            var config = getConfig();
            var errorFieldName = config ? config.fields.common.errorLog : "Error_Log";
            var icons = config ? config.icons : { error: "❌" };
            
            var timestamp = moment().format("DD.MM.YY HH:mm:ss");
            var errorMessage = "[" + timestamp + "] " + icons.error + " ERROR: " + message;
            
            if (source) {
                errorMessage += " | Zdroj: " + source;
            }
            
            if (error && error.stack) {
                errorMessage += "\nStack trace:\n" + error.stack;
            }
            
            var existingError = entry.field(errorFieldName) || "";
            entry.set(errorFieldName, existingError + errorMessage + "\n");
        } catch (e) {
            // Nemôžeme logovať chybu logovania
        }
    }
    
    /**
     * Pridá info správu do info poľa
     * @param {Entry} entry - Memento entry objekt
     * @param {string} message - Info správa
     * @param {Object} data - Dodatočné dáta (optional)
     */
    function addInfo(entry, message, data) {
        try {
            var config = getConfig();
            var infoFieldName = config ? config.fields.common.info : "info";
            var icons = config ? config.icons : { info: "ℹ️" };
            
            var timestamp = moment().format("DD.MM.YY HH:mm");
            var infoMessage = "[" + timestamp + "] " + icons.info + " " + message;
            
            if (data) {
                infoMessage += "\nDáta: " + JSON.stringify(data);
            }
            
            var existingInfo = entry.field(infoFieldName) || "";
            entry.set(infoFieldName, existingInfo + infoMessage + "\n");
        } catch (e) {
            // Nemôžeme logovať chybu logovania
        }
    }
    
    /**
     * Vyčistí logy v entry
     * @param {Entry} entry - Memento entry objekt
     * @param {boolean} clearError - Či vyčistiť aj Error_Log (default: false)
     */
    function clearLogs(entry, clearError) {
        try {
            var config = getConfig();
            var debugFieldName = config ? config.fields.common.debugLog : "Debug_Log";
            var errorFieldName = config ? config.fields.common.errorLog : "Error_Log";
            
            entry.set(debugFieldName, "");
            
            if (clearError) {
                entry.set(errorFieldName, "");
            }
        } catch (e) {
            // Ignoruj chyby pri čistení
        }
    }
    
    // ==============================================
    // SAFE FIELD ACCESS
    // ==============================================
    
    /**
     * Bezpečne získa hodnotu poľa
     * @param {Entry} entry - Memento entry objekt
     * @param {string} fieldName - Názov poľa
     * @param {*} defaultValue - Predvolená hodnota ak pole neexistuje
     * @returns {*} Hodnota poľa alebo defaultValue
     */
    function safeGet(entry, fieldName, defaultValue) {
        try {
            if (!entry || !fieldName) {
                return defaultValue !== undefined ? defaultValue : null;
            }
            
            var value = entry.field(fieldName);
            return value !== null && value !== undefined ? value : 
                   (defaultValue !== undefined ? defaultValue : null);
        } catch (e) {
            return defaultValue !== undefined ? defaultValue : null;
        }
    }
    
    /**
     * Bezpečne nastaví hodnotu poľa
     * @param {Entry} entry - Memento entry objekt
     * @param {string} fieldName - Názov poľa
     * @param {*} value - Hodnota na nastavenie
     * @returns {boolean} Úspešnosť operácie
     */
    function safeSet(entry, fieldName, value) {
        try {
            if (!entry || !fieldName) {
                return false;
            }
            
            entry.set(fieldName, value);
            return true;
        } catch (e) {
            addError(entry, "Nepodarilo sa nastaviť pole '" + fieldName + "': " + e.toString(), "safeSet", e);
            return false;
        }
    }
    
    /**
     * Bezpečne získa atribút z Link to Entry poľa
     * @param {Entry} entry - Memento entry objekt
     * @param {string} fieldName - Názov Link to Entry poľa
     * @param {string} attrName - Názov atribútu
     * @param {*} defaultValue - Predvolená hodnota
     * @returns {*} Hodnota atribútu alebo defaultValue
     */
    function safeGetAttribute(entry, fieldName, attrName, defaultValue) {
        try {
            if (!entry || !fieldName || !attrName) {
                return defaultValue !== undefined ? defaultValue : null;
            }
            
            var field = entry.field(fieldName);
            if (!field || field.length === 0) {
                return defaultValue !== undefined ? defaultValue : null;
            }
            
            // Pre multi-select pole vráť pole hodnôt
            if (Array.isArray(field)) {
                var values = [];
                for (var i = 0; i < field.length; i++) {
                    if (field[i] && typeof field[i].attr === 'function') {
                        var attrValue = field[i].attr(attrName);
                        if (attrValue !== null && attrValue !== undefined) {
                            values.push(attrValue);
                        }
                    }
                }
                return values.length > 0 ? values : 
                       (defaultValue !== undefined ? defaultValue : []);
            }
            
            // Pre single link
            if (field && typeof field.attr === 'function') {
                var value = field.attr(attrName);
                return value !== null && value !== undefined ? value : 
                       (defaultValue !== undefined ? defaultValue : null);
            }
            
            return defaultValue !== undefined ? defaultValue : null;
        } catch (e) {
            return defaultValue !== undefined ? defaultValue : null;
        }
    }
    
    /**
     * Bezpečne nastaví atribút na Link to Entry poli
     * @param {Entry} entry - Memento entry objekt
     * @param {string} fieldName - Názov Link to Entry poľa
     * @param {string} attrName - Názov atribútu
     * @param {*} value - Hodnota atribútu
     * @param {number} index - Index v poli (pre multi-select)
     * @returns {boolean} Úspešnosť operácie
     */
    function safeSetAttribute(entry, fieldName, attrName, value, index) {
        try {
            if (!entry || !fieldName || !attrName) {
                return false;
            }
            
            var field = entry.field(fieldName);
            if (!field) {
                return false;
            }
            
            // Pre multi-select pole
            if (Array.isArray(field)) {
                if (index !== undefined && index >= 0 && index < field.length) {
                    // Nastav atribút na konkrétnom indexe
                    if (field[index] && typeof field[index].setAttr === 'function') {
                        field[index].setAttr(attrName, value);
                        return true;
                    }
                } else {
                    // Nastav atribút na všetkých prvkoch
                    var success = false;
                    for (var i = 0; i < field.length; i++) {
                        if (field[i] && typeof field[i].setAttr === 'function') {
                            field[i].setAttr(attrName, value);
                            success = true;
                        }
                    }
                    return success;
                }
            }
            
            // Pre single link
            if (field && typeof field.setAttr === 'function') {
                field.setAttr(attrName, value);
                return true;
            }
            
            return false;
        } catch (e) {
            addError(entry, "Nepodarilo sa nastaviť atribút '" + attrName + "' na poli '" + fieldName + "': " + e.toString(), "safeSetAttribute", e);
            return false;
        }
    }
    
    /**
     * Bezpečne získa linky z Link to Entry poľa
     * @param {Entry} entry - Memento entry objekt
     * @param {string} fieldName - Názov Link to Entry poľa
     * @returns {Array} Pole linknutých objektov
     */
    // function safeGetLinks(entry, fieldName) {
    //     try {
    //         if (!entry || !fieldName) {
    //             return [];
    //         }
            
    //         var field = entry.field(fieldName);
    //         if (!field) {
    //             return [];
    //         }
            
    //         // Ak je to už pole, vráť ho
    //         if (Array.isArray(field)) {
    //             return field;
    //         }
            
    //         // Ak je to single link, vráť ako pole
    //         return [field];
    //     } catch (e) {
    //         return [];
    //     }
    // }
    function safeGetLinks(entry, linkFieldName) {
        try {
            if (!entry || !linkFieldName) return [];
            
            var links = entry.field(linkFieldName);
            if (!links) return [];
         
            return links;
            
        } catch (error) {
            addError(entry, "Chyba pri získavaní linkov: " + error.toString(), "MememtoCore/safeGetLinks", error);
            return [];
        }
    }
    // ==============================================
    // FORMÁTOVANIE
    // ==============================================
    
    /**
     * Formátuje dátum
     * @param {Date|string} date - Dátum na formátovanie
     * @param {string} format - Formát (default: "DD.MM.YYYY")
     * @returns {string} Formátovaný dátum
     */
    function formatDate(date, format) {
        try {
            var config = getConfig();
            var defaultFormat = config ? config.global.dateFormat : "DD.MM.YYYY";
            
            if (!date) {
                return "";
            }
            
            return moment(date).format(format || defaultFormat);
        } catch (e) {
            return date ? date.toString() : "";
        }
    }
    
    /**
     * Formátuje čas
     * @param {number} minutes - Počet minút
     * @returns {string} Formátovaný čas (HH:mm)
     */
    // function formatTime(minutes) {
    //     try {
    //         if (!minutes && minutes !== 0) {
    //             return "00:00";
    //         }
            
    //         var hours = Math.floor(minutes / 60);
    //         var mins = minutes % 60;
            
    //         return (hours < 10 ? "0" : "") + hours + ":" + 
    //                (mins < 10 ? "0" : "") + mins;
    //     } catch (e) {
    //         return "00:00";
    //     }
    // }
    function formatTime(time) {
        var config = getConfig();
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
    /**
     * Formátuje peniaze
     * @param {number} amount - Suma
     * @param {boolean} withSymbol - Či pridať symbol meny
     * @returns {string} Formátovaná suma
     */
    // function formatMoney(amount, withSymbol) {
    //     if (typeof amount !== "number") return "0.00 €";
    //     try {
    //         var config = getConfig();
    //         var currency = config ? config.global.currency : "EUR";
            
    //         if (!amount && amount !== 0) {
    //             return withSymbol ? "0.00 €" : "0.00";
    //         }
            
    //         var formatted = amount.toFixed(2).replace(".", ",");
            
    //         if (withSymbol !== false) {
    //             formatted += " €";
    //         }
            
    //         return formatted;
    //     } catch (e) {
    //         return amount ? amount.toString() : "0.00";
    //     }
    // }

    function formatMoney(amount, currency, decimals) {
        if (typeof amount !== "number") return "0.00 €";
        
        currency = currency || "€";
        decimals = decimals !== undefined ? decimals : 2;
        
        return amount.toFixed(decimals) + " " + currency;
    }
    
    /**
     * Parsuje čas z reťazca na minúty
     * @param {string} timeString - Čas vo formáte "HH:mm" alebo "HH:mm:ss"
     * @returns {number} Počet minút
     */
    function parseTimeToMinutes(timeString) {
        try {
            if (!timeString) {
                return 0;
            }
            
            var parts = timeString.split(":");
            if (parts.length < 2) {
                return 0;
            }
            
            var hours = parseInt(parts[0], 10) || 0;
            var minutes = parseInt(parts[1], 10) || 0;
            
            return hours * 60 + minutes;
        } catch (e) {
            return 0;
        }
    }
    
    /**
     * Zaokrúhli čas na štvrťhodiny
     * @param {number} minutes - Počet minút
     * @param {string} direction - "up", "down" alebo "nearest" (default)
     * @returns {number} Zaokrúhlený počet minút
     */
    // function roundToQuarter(minutes, direction) {
    //     try {
    //         if (!minutes && minutes !== 0) {
    //             return 0;
    //         }
            
    //         var quarter = 15;
            
    //         if (direction === "up") {
    //             return Math.ceil(minutes / quarter) * quarter;
    //         } else if (direction === "down") {
    //             return Math.floor(minutes / quarter) * quarter;
    //         } else {
    //             // Nearest (default)
    //             return Math.round(minutes / quarter) * quarter;
    //         }
    //     } catch (e) {
    //         return minutes || 0;
    //     }
    // }
    function roundToQuarter(time, direction) {
        try {
            //var config = getConfig();
            var quarterMinutes = config ? config.global.quarterRoundingMinutes : 15;
            
            if (!time) return moment();
            
            var mom = moment(time);
            var minutes = mom.minutes();
            var roundedMinutes;
            
            if (direction === 'up') {
                roundedMinutes = Math.ceil(minutes / quarterMinutes) * quarterMinutes;
            } else if (direction === 'down') {
                roundedMinutes = Math.floor(minutes / quarterMinutes) * quarterMinutes;
            } else {
                roundedMinutes = Math.round(minutes / quarterMinutes) * quarterMinutes;
            }
            
            if (roundedMinutes === 60) {
                mom.add(1, 'hour').minutes(0);
            } else {
                mom.minutes(roundedMinutes);
            }
            
            return mom;
        } catch (e) {
            addDebug(null, "Chyba pri zaokrúhľovaní času: " + e.toString() + e.lineNumber);
            return moment();
        }
    }
    // ==============================================
    // VALIDÁCIA
    // ==============================================
     // ==============================================
    // BASIC VALIDATION
    // ==============================================
    
    function validateRequiredFields(entry, requiredFields) {
        try {
            if (!entry || !requiredFields || !Array.isArray(requiredFields)) {
                return false;
            }
            
            var missingFields = [];
            
            for (var i = 0; i < requiredFields.length; i++) {
                var fieldName = requiredFields[i];
                var value = entry.field(fieldName);
                
                if (value === null || value === undefined || value === "" || 
                    (Array.isArray(value) && value.length === 0)) {
                    missingFields.push(fieldName);
                }
            }
            
            if (missingFields.length > 0) {
                addDebug(entry, "❌ Chýbajú povinné polia: " + missingFields.join(", "));
                return false;
            }
            
            return true;
        } catch (e) {
            addError(entry, "Chyba pri validácii polí: " + e.toString(), "validateRequiredFields", e);
            return false;
        }
    } 
    /**
     * Validuje povinné polia
     * @param {Entry} entry - Memento entry objekt
     * @param {Array} fields - Zoznam názvov povinných polí
     * @returns {boolean} Či sú všetky polia vyplnené
     */
    // function validateRequiredFields(entry, fields) {
    //     try {
    //         if (!entry || !fields || !Array.isArray(fields)) {
    //             return false;
    //         }
            
    //         var missingFields = [];
            
    //         for (var i = 0; i < fields.length; i++) {
    //             var fieldName = fields[i];
    //             var value = entry.field(fieldName);
                
    //             if (value === null || value === undefined || value === "" || 
    //                 (Array.isArray(value) && value.length === 0)) {
    //                 missingFields.push(fieldName);
    //             }
    //         }
            
    //         if (missingFields.length > 0) {
    //             addError(entry, "Chýbajú povinné polia: " + missingFields.join(", "), "validateRequiredFields");
    //             return false;
    //         }
            
    //         return true;
    //     } catch (e) {
    //         addError(entry, "Chyba pri validácii polí: " + e.toString(), "validateRequiredFields", e);
    //         return false;
    //     }
    // }
    
    // ==============================================
    // UTILITY FUNKCIE
    // ==============================================
    
    /**
     * Nájde entry podľa ID v knižnici
     * @param {string} libraryName - Názov knižnice
     * @param {number} id - ID záznamu
     * @returns {Entry|null} Nájdený entry alebo null
     */
    function findEntryById(libraryName, id) {
        try {
            if (!libraryName || !id) {
                return null;
            }
            
            var lib = libByName(libraryName);
            if (!lib) {
                return null;
            }
            
            var entries = lib.find("ID", id);
            return entries && entries.length > 0 ? entries[0] : null;
        } catch (e) {
            return null;
        }
    }
    
    /**
     * Získa aktuálne nastavenia z ASISTANTO Defaults
     * @param {string} libraryName - Názov defaults knižnice (default: "ASISTANTO Defaults")
     * @param {string} fieldName - Názov poľa s nastavením
     * @returns {*} Hodnota nastavenia alebo null
     */
    function getSettings(libraryName, fieldName) {
        try {
            var config = getConfig();
            var defaultsLib = libraryName || (config ? config.libraries.defaults : "ASISTANTO Defaults");
            
            var lib = libByName(defaultsLib);
            if (!lib) {
                return null;
            }
            
            var settings = lib.entries();
            if (settings && settings.length > 0) {
                // Zoberieme najnovší záznam
                var latestSettings = settings[settings.length - 1];
                return latestSettings.field(fieldName);
            }
            
            return null;
        } catch (e) {
            return null;
        }
    }
    
    /**
     * Kontroluje či je víkend
     * @param {Date} date - Dátum na kontrolu
     * @returns {boolean} True ak je víkend
     */
    function isWeekend(date) {
        try {
            var day = moment(date).day();
            return day === 0 || day === 6; // Nedeľa = 0, Sobota = 6
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Získa meno aktuálneho používateľa
     * @returns {string} Meno používateľa
     */
    function getCurrentUser() {
        try {
            var user = user();
            return user ? user.name : "Neznámy";
        } catch (e) {
            return "Neznámy";
        }
    }
    
    // ==============================================
    // PUBLIC API
    // ==============================================
    
    return {
        version: version,
        
        // Logging
        addDebug: addDebug,
        addError: addError,
        addInfo: addInfo,
        clearLogs: clearLogs,
        
        // Safe field access
        safeGet: safeGet,
        safeSet: safeSet,
        safeGetAttribute: safeGetAttribute,
        safeSetAttribute: safeSetAttribute,
        safeGetLinks: safeGetLinks,
        
        // Formátovanie
        formatDate: formatDate,
        formatTime: formatTime,
        formatMoney: formatMoney,
        parseTimeToMinutes: parseTimeToMinutes,
        roundToQuarter: roundToQuarter,
        
        // Validácia
        validateRequiredFields: validateRequiredFields,
        
        // Utility
        findEntryById: findEntryById,
        getSettings: getSettings,
        isWeekend: isWeekend,
        getCurrentUser: getCurrentUser
    };
})();