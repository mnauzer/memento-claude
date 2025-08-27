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

  
    function addDebug(entry, message, iconName) {
        try {
            var icon = null;
            var config = getConfig();
            if (!config) return;
            
            if (!iconName) {
                icon = " ";
            } else {
                icon = config.icons[iconName];
            }
            var debugFieldName = config ? config.fields.common.debugLog : "Debug_Log";
            
            var timestamp = moment().format("DD.MM.YY HH:mm");
            var debugMessage = "[" + timestamp + "] " + icon + " " + message;
            
            var existingDebug = entry.field(debugFieldName) || "";
            entry.set(debugFieldName, existingDebug + debugMessage + "\n");
        } catch (e) {
            addError(entry, "Nepodarilo sa pridať debug správu: " + e.toString(), "addDebug", e);
            // Nemôžeme logovať chybu logovania
        }
    }
    
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

    function safeGetLinksFrom(entry, libraryName, linkFieldName) {
        try {
            if (!entry || !linkFieldName || !libraryName) return [];
            
            var links = entry.linksFrom(libraryName, linkFieldName);
            if (!links) return [];
         
            return links;
            
        } catch (error) {
            addError(entry, "Chyba pri získavaní linkov: " + error.toString(), "MememtoCore/safeGetLinksFrom", error);
            return [];
        }
    }

    function formatDate(date, format) {
        try {
            var config = getConfig();
            var defaultFormat = config ? config.global.dateFormat : "DD.MM.YYYY";
            
            if (!date) {
                return "";
            }
            
            return moment(date).format(format || defaultFormat);
        } catch (e) {
            addError(null, "Chyba pri formátovaní dátumu: " + e.toString(), "formatDate", e);
            return date ? date.toString() : "";
        }
    }


    function isWeekend(date) {
        try {
            var day = moment(date).day();
            return day === 0 || day === 6; // Nedeľa = 0, Sobota = 6
        } catch (error) {
            return false;
        }
    }

    function isHoliday(date) {
        try {
            var config = getConfig();
            var year = moment(date).year();
            
            // Slovenské štátne sviatky
            var holidays = [
                year + "-01-01", // Deň vzniku SR
                year + "-01-06", // Zjavenie Pána
                year + "-05-01", // Sviatok práce
                year + "-05-08", // Deň víťazstva
                year + "-07-05", // Cyril a Metod
                year + "-08-29", // SNP
                year + "-09-01", // Deň ústavy
                year + "-09-15", // Sedembolestná
                year + "-11-01", // Sviatok všetkých svätých
                year + "-11-17", // Deň boja za slobodu
                year + "-12-24", // Štedrý deň
                year + "-12-25", // 1. sviatok vianočný
                year + "-12-26"  // 2. sviatok vianočný
            ];
            
            // Pohyblivé sviatky (potrebuje výpočet)
            // Veľký piatok, Veľkonočný pondelok
            var easter = calculateEaster(year);
            if (easter) {
                holidays.push(
                    moment(easter).subtract(2, 'days').format('YYYY-MM-DD'), // Veľký piatok
                    moment(easter).add(1, 'days').format('YYYY-MM-DD')      // Veľkonočný pondelok
                );
            }
            
            var dateStr = moment(date).format('YYYY-MM-DD');
            return holidays.indexOf(dateStr) !== -1;
            
        } catch (error) {
            return false;
        }
    }

    function calculateEaster(year) {
        // Algoritmus pre výpočet Veľkej noci
        var a = year % 19;
        var b = Math.floor(year / 100);
        var c = year % 100;
        var d = Math.floor(b / 4);
        var e = b % 4;
        var f = Math.floor((b + 8) / 25);
        var g = Math.floor((b - f + 1) / 3);
        var h = (19 * a + b - d - g + 15) % 30;
        var i = Math.floor(c / 4);
        var k = c % 4;
        var l = (32 + 2 * e + 2 * i - h - k) % 7;
        var m = Math.floor((a + 11 * h + 22 * l) / 451);
        var month = Math.floor((h + l - 7 * m + 114) / 31);
        var day = ((h + l - 7 * m + 114) % 31) + 1;
        
        return new Date(year, month - 1, day);
    }
    
    function formatMoney(amount, currency, decimals) {
        if (typeof amount !== "number") return "0.00 €";
        
        currency = currency || "€";
        decimals = decimals !== undefined ? decimals : 2;
        
        return amount.toFixed(decimals) + " " + currency;
    }

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

    // function formatTime(hours) {
    //     if (!hours && hours !== 0) return "00:00";
        
    //     var totalMinutes = Math.round(hours * 60);
    //     var h = Math.floor(totalMinutes / 60);
    //     var m = totalMinutes % 60;
    //     return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
    // }

    // function roundToQuarterHour(hours) {
    //     if (!hours && hours !== 0) return 0;
    //     return Math.round(hours * 4) / 4;
    // }
    // function formatTime(time) {
    //     if (!time) return "00:00";
        
    //     try {
    //         // Ak je to moment objekt
    //         if (time._isAMomentObject) {
    //             return time.format(config.global.timeFormat);
    //         }
            
    //         // Ak je to číslo (minúty)
    //         if (typeof time === "number") {
    //             var hours = Math.floor(time / 60);
    //             var minutes = time % 60;
    //             return (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes;
    //         }
            
    //         // Ak je to string alebo Date
    //         return moment(time).format(config.global.timeFormat);
            
    //     } catch (e) {
    //         addDebug(null, "Chyba pri formátovaní času: " + e.toString() + e.lineNumber);
    //         return "00:00";
    //     }
    // }

    // function roundToQuarter(time, direction) {
    // try {
    //     // Ak je to už string formát času, konvertuj na moment
    //     if (typeof time === 'string') {
    //         time = moment(time, 'HH:mm');
    //     }
        
    //     // Ak nie je moment objekt, skús základnú konverziu
    //     if (!time._isAMomentObject) {
    //         time = moment(time);
    //     }
        
    //     var quarterMinutes = 15;
    //     var mom = moment(time).seconds(0).milliseconds(0);
    //     var minutes = mom.minutes();
    //     var roundedMinutes;
        
    //     if (direction === 'up') {
    //         roundedMinutes = Math.ceil(minutes / quarterMinutes) * quarterMinutes;
    //     } else if (direction === 'down') {
    //         roundedMinutes = Math.floor(minutes / quarterMinutes) * quarterMinutes;
    //     } else {
    //         roundedMinutes = Math.round(minutes / quarterMinutes) * quarterMinutes;
    //     }
        
    //     if (roundedMinutes >= 60) {
    //         mom.add(1, 'hour').minutes(0);
    //     } else {
    //         mom.minutes(roundedMinutes);
    //     }
        
    //     return mom;
        
    // } catch (e) {
    //     // Ak zlyhá všetko, vráť originálny čas
    //     return moment(time);
    // }
    // }

    function formatTime(timeValue) {
        try {
            if (!timeValue && timeValue !== 0) return "00:00";
            
            // Ak je to moment objekt
            if (timeValue._isAMomentObject) {
                return timeValue.format("HH:mm");
            }
            
            // Ak je to číslo hodín (napr. 8.25 = 8:15)
            if (typeof timeValue === "number") {
                var totalMinutes = Math.round(timeValue * 60);
                var hours = Math.floor(totalMinutes / 60);
                var minutes = totalMinutes % 60;
                return (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes;
            }
            
            // Ak je to string alebo Date objekt
            var momentTime = moment(timeValue);
            if (momentTime.isValid()) {
                return momentTime.format("HH:mm");
            }
            
            return "00:00";
        } catch (e) {
            addError(null, "Chyba pri formátovaní času: " + e.toString(), "formatTime", e);
            return "00:00";
        }
    }

    function roundTimeToQuarter(timeValue, direction) {
        try {
            if (!timeValue) return null;
            
            var momentTime;
            
            // Konverzia na moment objekt
            if (timeValue._isAMomentObject) {
                momentTime = moment(timeValue);
            } else if (typeof timeValue === "string") {
                // Pre čas v string formáte ako "08:30"
                momentTime = moment(timeValue, "HH:mm");
            } else {
                momentTime = moment(timeValue);
            }
            
            if (!momentTime.isValid()) {
                return timeValue; // Vráť originál ak konverzia zlyhala
            }
            
            // Zaokrúhli na 15 minút
            var minutes = momentTime.minutes();
            var roundedMinutes;
            
            switch(direction) {
                case 'up':
                    roundedMinutes = Math.ceil(minutes / 15) * 15;
                    break;
                case 'down':
                    roundedMinutes = Math.floor(minutes / 15) * 15;
                    break;
                default:
                    roundedMinutes = Math.round(minutes / 15) * 15;
            }
            
            // Ak presahuje 60 minút, pridaj hodinu
            if (roundedMinutes >= 60) {
                momentTime.add(1, 'hour').minutes(0);
            } else {
                momentTime.minutes(roundedMinutes);
            }
            
            // Vynuluj sekundy a milisekundy
            momentTime.seconds(0).milliseconds(0);
            
            return momentTime;
            
        } catch (e) {
            addError(null, "Chyba pri zaokrúhľovaní času: " + e.toString(), "roundTimeToQuarter", e);
            return timeValue;
        }
    }

    function parseTimeInput(timeInput) {
        try {
            if (!timeInput) return null;
            
            // Ak je už moment objekt
            if (timeInput._isAMomentObject) {
                return timeInput;
            }
            
            // Ak je to string v formáte "HH:mm"
            if (typeof timeInput === "string") {
                var parsed = moment(timeInput, "HH:mm");
                if (parsed.isValid()) {
                    return parsed;
                }
            }
            
            // Ak je to Date objekt alebo timestamp
            var parsed = moment(timeInput);
            if (parsed.isValid()) {
                return parsed;
            }
            
            return null;
        } catch (e) {
            return null;
        }
    }
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
    
    function isWeekend(date) {
        try {
            var day = moment(date).day();
            return day === 0 || day === 6; // Nedeľa = 0, Sobota = 6
        } catch (e) {
            return false;
        }
    }

    function getCurrentUser() {
        try {
            var user = user();
            return user ? user.name : "Neznámy";
        } catch (e) {
            return "Neznámy";
        }
    }

    function getDayNameSK(dayNumber) {
    var days = ["NEDEĽA", "PONDELOK", "UTOROK", "STREDA", "ŠTVRTOK", "PIATOK", "SOBOTA"];
    return days[dayNumber] || "";
    }

    function selectOsobaForm(count) {
        if (count === 1) return "osoba";
        if (count >= 2 && count <= 4) return "osoby";
        return "osôb";
    }
    
    function getPersonCountForm(count) {
        if (count === 1) return "osoba";
        if (count >= 2 && count <= 4) return "osoby";
        return "osôb";
    }

    // ==============================================
    // NOTIFIKÁCIE
    //
    // V MementoCore7.js
    function getLinkedNotifications(entry) {
        try {
            var config = getConfig();
            var notifications = safeGetLinks(entry, config.fields.common.notifications);
            return notifications || [];
        } catch (error) {
            return [];
        }
    }

    function linkNotificationToSource(sourceEntry, notificationEntry) {
        try {
            var config = getConfig();
            var currentNotifications = safeGetLinks(sourceEntry, config.fields.common.notifications);
            currentNotifications.push(notificationEntry);
            sourceEntry.set(config.fields.common.notifications, currentNotifications);
            return true;
        } catch (error) {
            return false;
        }
    }

    function deleteNotificationAndTelegram(notificationEntry) {
        try {
            // 1. Získaj Telegram údaje
            var chatId = safeGet(notificationEntry, "Chat ID");
            var messageId = safeGet(notificationEntry, "Message ID");
            
            // 2. Vymaž z Telegramu (ak existuje message ID)
            if (chatId && messageId && typeof MementoTelegram !== 'undefined') {
                MementoTelegram.deleteTelegramMessage(chatId, messageId);
            }
            
            // 3. Vymaž z knižnice Notifications
            notificationEntry.remove();
            return true;
        } catch (error) {
            return false;
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
        getSettings: getSettings,
        
        // Safe field access
        safeGet: safeGet,
        safeSet: safeSet,
        safeGetAttribute: safeGetAttribute,
        safeSetAttribute: safeSetAttribute,
        safeGetLinks: safeGetLinks,
        safeGetLinksFrom: safeGetLinksFrom,
        
        // Formátovanie
        formatDate: formatDate,
        formatTime: formatTime,
        formatMoney: formatMoney,
        parseTimeToMinutes: parseTimeToMinutes,
        roundTimeToQuarter: roundTimeToQuarter,
        parseTimeInput: parseTimeInput,
        
        //roundToQuarter: roundToQuarter,
        //roundToQuarterHour: roundToQuarterHour,
        
        // Validácia
        validateRequiredFields: validateRequiredFields,
        
        // Utility
        findEntryById: findEntryById,
        getCurrentUser: getCurrentUser,


        getDayNameSK: getDayNameSK,
        selectOsobaForm: selectOsobaForm,       
        getPersonCountForm: getPersonCountForm,
        isHoliday: isHoliday,
        isWeekend: isWeekend,
        calculateEaster: calculateEaster,

        // Notifikácie
        getLinkedNotifications: getLinkedNotifications,
        linkNotificationToSource: linkNotificationToSource,
        deleteNotificationAndTelegram: deleteNotificationAndTelegram 

    };
})();