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
    
    var version = "7.0.1";
    
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
            var icon = "";
            var config = getConfig();
            if (!config) return;
            if (iconName) {
                icon = getIcon(iconName) + " ";
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

    function findRecordIndex(recordsArray, targetRecord) {
        for (var i = 0; i < recordsArray.length; i++) {
            if (recordsArray[i].field("ID") === targetRecord.field("ID")) {
                return i;
            }
        }
        return -1;
    }

    // Použitie:
    //var priceHistory = hzsRecord.linksFrom("ceny prác", "HZS");
    //var specificRecord = priceHistory[0]; // nejaký záznam
    //var index = findRecordIndex(priceHistory, specificRecord);

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

    // // ==============================================
    // // NOTIFIKÁCIE
    // //
    // // V MementoCore7.js
    // function getLinkedNotifications(entry) {
    //     try {
    //         var config = getConfig();
    //         var notifications = safeGetLinks(entry, config.fields.common.notifications);
    //         return notifications || [];
    //     } catch (error) {
    //         return [];
    //     }
    // }

    // function linkNotificationToSource(sourceEntry, notificationEntry) {
    //     try {
    //         var config = getConfig();
    //         var currentNotifications = safeGetLinks(sourceEntry, config.fields.common.notifications);
    //         currentNotifications.push(notificationEntry);
    //         sourceEntry.set(config.fields.common.notifications, currentNotifications);
    //         return true;
    //     } catch (error) {
    //         return false;
    //     }
    // }

    // function deleteNotificationAndTelegram(notificationEntry) {
    //     try {
    //         // 1. Získaj Telegram údaje
    //         var chatId = safeGet(notificationEntry, "Chat ID");
    //         var messageId = safeGet(notificationEntry, "Message ID");
            
    //         // 2. Vymaž z Telegramu (ak existuje message ID)
    //         if (chatId && messageId && typeof MementoTelegram !== 'undefined') {
    //             MementoTelegram.deleteTelegramMessage(chatId, messageId);
    //         }
            
    //         // 3. Vymaž z knižnice Notifications
    //         notificationEntry.remove();
    //         return true;
    //     } catch (error) {
    //         return false;
    //     }
    // }

    function setEdit(entry) {
        try {
            safeSet(entry, CONFIG.fields.common.view, CONFIG.constants.viewTypes.edit);
        } catch (e){
            return false;
        }
    }

    function setPrint(entry) {
        try {
            safeSet(entry, CONFIG.fields.common.view, CONFIG.constants.viewTypes.print);
        } catch (e){
            return false;
        }
    }

    function setDebug(entry) {
        try {
            safeSet(entry, CONFIG.fields.common.view, CONFIG.constants.viewTypes.debug);
        } catch (e){
            return false;
        }
    }

    function setView(entry, status) {
        try {
            if (!entry || !status) {
                return false;
            }
            safeSet(entry, CONFIG.fields.common.view, CONFIG.constants.viewTypes[status]);
        } catch (e){
            return false;
        }
    }
    function getIcon(name) {
        try {
            var config = getConfig();
            if (config && config.icons && config.icons[name]) {
                return config.icons[name];
            }
            
            // Fallback ikony ak config nie je dostupný
            var fallbackIcons = {
                info: "ℹ️",
                warning: "⚠️",
                error: "❌",
                success: "✅",
                delete: "🗑️",
                start: "🚀",
                notification: "📢",
                telegram: "✈️",
                time: "⏰",
                calendar: "📅",
                group: "👥",
                money: "💰",
                note: "📝",
                calculation: "🧮",
                link: "🔗",
                user: "👤",
                search: "🔍",
                settings: "⚙️",
                check: "✔️",
                cross: "❌",
                arrow: "➡️",
                flag: "🚩",
                star: "⭐",
                heart: "❤️",
                fire: "🔥",
                bolt: "⚡",
                clock: "🕐",
                mail: "📧",
                phone: "📱",
                home: "🏠",
                work: "💼",
                car: "🚗",
                tools: "🔧",
                package: "📦",
                chart: "📊"
            };
            
            return fallbackIcons[name] || "";
            
        } catch (e) {
            return "";
        }
    }

    // Farby
    // ==============================================
// PRIDAŤ DO MementoCore.js (v7.0+)
// Funkcie pre nastavenie farieb záznamu
// ==============================================

/**
 * Nastaví farbu pozadia alebo popredia záznamu
 * @param {Entry} entry - Memento entry objekt (alebo null pre currentEntry)
 * @param {string} type - Typ farby: "background" alebo "foreground" (alebo skratky "bg", "fg")
 * @param {string} color - Názov farby alebo HEX kód
 * @returns {boolean} True ak úspešné, false ak nie
 * 
 * @example
 * // Použitie s currentEntry
 * utils.setColor(null, "background", "light blue");
 * utils.setColor(null, "bg", "#FF5733");
 * 
 * // Použitie s konkrétnym entry
 * utils.setColor(myEntry, "foreground", "red");
 * utils.setColor(myEntry, "fg", "#000000");
 */
function setColor(entry, type, color) {
    try {
        // Ak entry nie je zadané, použi currentEntry
        var targetEntry = entry || currentEntry;
        if (!targetEntry) {
            addError(null, "Neplatný entry objekt", "setColor");
            return false;
        }
        
        // Normalizuj typ
        var colorType = type ? type.toLowerCase() : "";
        
        // Mapovanie názvov polí
        var fieldName = null;
        switch(colorType) {
            case "background":
            case "bg":
            case "pozadie":
                fieldName = CONFIG.fields.common.backgroundColor || "farba pozadia";
                break;
            case "foreground":
            case "fg":
            case "popredie":
            case "text":
                fieldName = CONFIG.fields.common.rowColor || "farba záznamu";
                break;
            default:
                addError(targetEntry, "Neplatný typ farby: " + type + ". Použite 'background' alebo 'foreground'", "setColor");
                return false;
        }
        
        // Konvertuj farbu na HEX ak je to potrebné
        var hexColor = convertToHex(color);
        
        // Nastav farbu
        if (hexColor) {
            safeSet(targetEntry, fieldName, hexColor);
            addDebug(targetEntry, "🎨 Farba " + colorType + " nastavená na: " + hexColor);
            return true;
        } else {
            addError(targetEntry, "Nepodarilo sa konvertovať farbu: " + color, "setColor");
            return false;
        }
        
    } catch (error) {
        addError(targetEntry, "Chyba pri nastavovaní farby: " + error.toString(), "setColor");
        return false;
    }
}

/**
 * Konvertuje názov farby na HEX kód
 * @param {string} color - Názov farby alebo HEX kód
 * @returns {string|null} HEX kód farby alebo null ak neplatná
 */
function convertToHex(color) {
    if (!color) return null;
    
    // Ak už je HEX, vráť ho
    if (color.charAt(0) === '#') {
        return color;
    }
    
    // Slovník farieb - rozšírený o slovenské názvy
    var colorMap = {
        // Základné farby
        "white": "#FFFFFF",
        "biela": "#FFFFFF",
        "black": "#000000",
        "čierna": "#000000",
        "red": "#FF0000",
        "červená": "#FF0000",
        "green": "#00FF00",
        "zelená": "#00FF00",
        "blue": "#0000FF",
        "modrá": "#0000FF",
        "yellow": "#FFFF00",
        "žltá": "#FFFF00",
        "orange": "#FFA500",
        "oranžová": "#FFA500",
        "purple": "#800080",
        "fialová": "#800080",
        "pink": "#FFC0CB",
        "ružová": "#FFC0CB",
        "gray": "#beb9b9ad",
        "grey": "#808080",
        "sivá": "#808080",
        "šedá": "#808080",
        
        // Material Design farby
        "light blue": "#90dcffa2",
        "svetlo modrá": "#03A9F4",
        "svetlomodrá": "#03A9F4",
        "dark blue": "#1976D2",
        "tmavo modrá": "#1976D2",
        "tmavomodrá": "#1976D2",
        "light green": "#b7d693c6",
        "svetlo zelená": "#8BC34A",
        "svetlozelená": "#8BC34A",
        "dark green": "#388E3C",
        "tmavo zelená": "#388E3C",
        "tmavozelená": "#388E3C",
        "light red": "#ec9a99ce",
        "svetlo červená": "#EF5350",
        "svetločervená": "#EF5350",
        "dark red": "#C62828",
        "tmavo červená": "#C62828",
        "tmavočervená": "#C62828",
        
        // Špeciálne farby pre upozornenia
        "warning": "#FFEB3B",
        "upozornenie": "#FFEB3B",
        "error": "#F44336",
        "chyba": "#F44336",
        "success": "#4CAF50",
        "úspech": "#4CAF50",
        "info": "#2196F3",
        "informácia": "#2196F3",
        
        // Pastelové farby
        "pastel blue": "#B3E5FC",
        "pastel green": "#DCEDC8",
        "pastel red": "#FFCDD2",
        "pastel yellow": "#FFF9C4",
        "pastel orange": "#FFE0B2",
        "pastel purple": "#E1BEE7",
        
        // Tmavé varianty
        "dark gray": "#424242",
        "dark grey": "#424242",
        "tmavo sivá": "#424242",
        "tmavosivá": "#424242",
        "light gray": "#E0E0E0",
        "light grey": "#E0E0E0",
        "svetlo sivá": "#E0E0E0",
        "svetlosivá": "#E0E0E0"
    };
    
    // Normalizuj názov farby (malé písmená, bez medzier na začiatku/konci)
    var normalizedColor = color.toLowerCase().trim();
    
    return colorMap[normalizedColor] || null;
}

/**
 * Odstráni farbu pozadia alebo popredia záznamu
 * @param {Entry} entry - Memento entry objekt (alebo null pre currentEntry)
 * @param {string} type - Typ farby: "background" alebo "foreground" (alebo "both" pre obe)
 * @returns {boolean} True ak úspešné
 */
function removeColor(entry, type) {
    try {
        var targetEntry = entry || currentEntry;
        if (!targetEntry) return false;
        
        var colorType = type ? type.toLowerCase() : "both";
        
        switch(colorType) {
            case "background":
            case "bg":
            case "pozadie":
                safeSet(targetEntry, CONFIG.fields.common.backgroundColor || "farba pozadia", null);
                break;
            case "foreground":
            case "fg":
            case "popredie":
            case "text":
                safeSet(targetEntry, CONFIG.fields.common.rowColor || "farba záznamu", null);
                break;
            case "both":
            case "obe":
            case "all":
            case "všetky":
                safeSet(targetEntry, CONFIG.fields.common.backgroundColor || "farba pozadia", null);
                safeSet(targetEntry, CONFIG.fields.common.rowColor || "farba záznamu", null);
                break;
            default:
                return false;
        }
        
        addDebug(targetEntry, "🎨 Farba " + colorType + " odstránená");
        return true;
        
    } catch (error) {
        addError(targetEntry, "Chyba pri odstraňovaní farby: " + error.toString(), "removeColor");
        return false;
    }
}

/**
 * Získa aktuálnu farbu záznamu
 * @param {Entry} entry - Memento entry objekt (alebo null pre currentEntry)
 * @param {string} type - Typ farby: "background" alebo "foreground"
 * @returns {string|null} HEX kód farby alebo null
 */
function getColor(entry, type) {
    try {
        var targetEntry = entry || currentEntry;
        if (!targetEntry) return null;
        
        var colorType = type ? type.toLowerCase() : "";
        var fieldName = null;
        
        switch(colorType) {
            case "background":
            case "bg":
            case "pozadie":
                fieldName = CONFIG.fields.common.backgroundColor || "farba pozadia";
                break;
            case "foreground":
            case "fg":
            case "popredie":
            case "text":
                fieldName = CONFIG.fields.common.rowColor || "farba záznamu";
                break;
            default:
                return null;
        }
        
        return safeGet(targetEntry, fieldName, null);
        
    } catch (error) {
        return null;
    }
}

/**
 * Nastaví farbu podľa podmienky
 * @param {Entry} entry - Memento entry objekt
 * @param {string} condition - Podmienka: "warning", "error", "success", "info"
 * @returns {boolean} True ak úspešné
 * 
 * @example
 * utils.setColorByCondition(null, "warning"); // Žltá
 * utils.setColorByCondition(null, "error");   // Červená
 * utils.setColorByCondition(null, "success"); // Zelená
 */
function setColorByCondition(entry, condition) {
    var conditionColors = {
        "warning": "#FFEB3B",     // Žltá
        "upozornenie": "#FFEB3B",
        "error": "#F44336",       // Červená
        "chyba": "#F44336",
        "success": "#4CAF50",     // Zelená
        "úspech": "#4CAF50",
        "info": "#2196F3",        // Modrá
        "informácia": "#2196F3",
        "late": "#FF9800",        // Oranžová
        "meškanie": "#FF9800",
        "weekend": "#E1BEE7",     // Svetlo fialová
        "víkend": "#E1BEE7",
        "holiday": "#BBDEFB",     // Svetlo modrá
        "sviatok": "#BBDEFB"
    };
    
    var color = conditionColors[condition ? condition.toLowerCase() : ""];
    if (color) {
        return setColor(entry, "background", color);
    }
    
    return false;
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

        // 
        setEdit: setEdit,
        setPrint: setPrint,
        setDebug: setDebug,
        setView: setView,
        
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
        findRecordIndex: findRecordIndex,

        getDayNameSK: getDayNameSK,
        selectOsobaForm: selectOsobaForm,       
        getPersonCountForm: getPersonCountForm,
        isHoliday: isHoliday,
        isWeekend: isWeekend,
        calculateEaster: calculateEaster,

        // Notifikácie
        // getLinkedNotifications: getLinkedNotifications,
        // linkNotificationToSource: linkNotificationToSource,
        // deleteNotificationAndTelegram: deleteNotificationAndTelegram,

        // Funkcie pre farby
        setColor: setColor,
        removeColor: removeColor,
        getColor: getColor,
        setColorByCondition: setColorByCondition,
        convertToHex: convertToHex,
        getIcon: getIcon

    };
})();