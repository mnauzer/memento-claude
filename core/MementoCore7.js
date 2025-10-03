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
    
    var version = "7.0.2";
    
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
            if (!config) {
                // Fallback: config nie je dostupný, nemôžeme logovať
                if (typeof message === 'function') {
                    message("⚠️ MementoCore.addDebug: CONFIG nie je dostupný, debug správa sa neloží: " + message);
                }
                return;
            }
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

            // Debug pre fallback values
            if (!config) {
                if (typeof message === 'function') {
                    message("⚠️ MementoCore.addError: CONFIG nie je dostupný, používam fallback hodnoty");
                }
            }

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
            // Fallback pre kritické chyby
            if (typeof message === 'function') {
                message("❌ KRITICKÁ CHYBA: MementoCore.addError zlyhalo: " + e.toString());
            }
        }
    }
    
    function addInfo(entry, message, data, options) {
        try {
            var config = getConfig();
            var infoFieldName = config ? config.fields.common.info : "info";

            // Predvolené nastavenia
            var settings = {
                scriptName: options && options.scriptName ? options.scriptName : "Memento Script",
                scriptVersion: options && options.scriptVersion ? options.scriptVersion : "1.0",
                moduleName: options && options.moduleName ? options.moduleName : null,
                sectionName: options && options.sectionName ? options.sectionName : "Výsledok",
                includeHeader: options && options.includeHeader !== undefined ? options.includeHeader : true,
                includeFooter: options && options.includeFooter !== undefined ? options.includeFooter : true,
                addTimestamp: options && options.addTimestamp !== undefined ? options.addTimestamp : true
            };

            var infoMessage = buildInfoMessage(message, data, settings);
            var existingInfo = entry.field(infoFieldName) || "";
            entry.set(infoFieldName, existingInfo + infoMessage + "\n\n");
        } catch (e) {
            // Nemôžeme logovať chybu logovania
        }
    }

    function addInfoTelegram(entry, message, data, options) {
        try {
            var config = getConfig();
            var infoFieldName = config ? config.fields.common.info : "info";

            // Predvolené nastavenia pre Telegram
            var settings = {
                scriptName: options && options.scriptName ? options.scriptName : "Memento Script",
                scriptVersion: options && options.scriptVersion ? options.scriptVersion : "1.0",
                moduleName: options && options.moduleName ? options.moduleName : null,
                sectionName: options && options.sectionName ? options.sectionName : "Výsledok",
                format: options && options.format ? options.format : "markdown", // "markdown" alebo "html"
                includeHeader: options && options.includeHeader !== undefined ? options.includeHeader : true,
                includeFooter: options && options.includeFooter !== undefined ? options.includeFooter : true,
                addTimestamp: options && options.addTimestamp !== undefined ? options.addTimestamp : true,
                inlineKeyboard: options && options.inlineKeyboard ? options.inlineKeyboard : null
            };

            var telegramMessage = buildTelegramMessage(message, data, settings);
            var existingInfo = entry.field(infoFieldName) || "";
            entry.set(infoFieldName, existingInfo + telegramMessage + "\n\n");
        } catch (e) {
            // Nemôžeme logovať chybu logovania
        }
    }

    function buildInfoMessage(message, data, settings) {
        var config = getConfig();
        var icons = config ? config.icons : { info: "ℹ️", script: "📋", time: "🕐", data: "💾" };
        var parts = [];

        // HEADER
        if (settings.includeHeader) {
            var headerParts = [];
            headerParts.push("=".repeat(50));
            headerParts.push(icons.script + " " + settings.scriptName + " v" + settings.scriptVersion);

            if (settings.addTimestamp) {
                var timestamp = moment().format("DD.MM.YYYY HH:mm:ss");
                headerParts.push(icons.time + " " + timestamp);
            }

            if (settings.moduleName) {
                headerParts.push("📦 Modul: " + settings.moduleName);
            }

            headerParts.push("=".repeat(50));
            parts.push(headerParts.join("\n"));
        }

        // SECTION
        if (settings.sectionName && message) {
            parts.push("\n" + icons.info + " " + settings.sectionName.toUpperCase());
            parts.push("-".repeat(30));
            parts.push(message);
        } else if (message) {
            parts.push("\n" + icons.info + " " + message);
        }

        // DATA SECTION
        if (data) {
            parts.push("\n" + icons.data + " DÁTA");
            parts.push("-".repeat(30));

            if (typeof data === 'object') {
                // Formátované zobrazenie objektu
                parts.push(formatObjectData(data));
            } else {
                parts.push(String(data));
            }
        }

        // FOOTER
        if (settings.includeFooter) {
            var footerParts = [];
            footerParts.push("\n" + "=".repeat(50));
            footerParts.push("🏁 Spracovanie dokončené");
            footerParts.push("⚙️ MementoCore v7.0 | Memento Database System");
            footerParts.push("=".repeat(50));
            parts.push(footerParts.join("\n"));
        }

        return parts.join("\n");
    }

    function buildTelegramMessage(message, data, settings) {
        var config = getConfig();
        var icons = config ? config.icons : { info: "ℹ️", script: "📋", time: "🕐", data: "💾" };
        var parts = [];
        var format = settings.format.toLowerCase();

        // HEADER
        if (settings.includeHeader) {
            if (format === "html") {
                parts.push("<b>" + icons.script + " " + settings.scriptName + " v" + settings.scriptVersion + "</b>");

                if (settings.addTimestamp) {
                    var timestamp = moment().format("DD.MM.YYYY HH:mm");
                    parts.push("<i>" + icons.time + " " + timestamp + "</i>");
                }

                if (settings.moduleName) {
                    parts.push("📦 <code>" + settings.moduleName + "</code>");
                }

                parts.push("➖➖➖➖➖➖➖➖➖➖");
            } else {
                // Markdown format
                parts.push("*" + icons.script + " " + settings.scriptName + " v" + settings.scriptVersion + "*");

                if (settings.addTimestamp) {
                    var timestamp = moment().format("DD.MM.YYYY HH:mm");
                    parts.push("_" + icons.time + " " + timestamp + "_");
                }

                if (settings.moduleName) {
                    parts.push("📦 `" + settings.moduleName + "`");
                }

                parts.push("➖➖➖➖➖➖➖➖➖➖");
            }
        }

        // SECTION
        if (settings.sectionName && message) {
            if (format === "html") {
                parts.push("<b>" + icons.info + " " + settings.sectionName.toUpperCase() + "</b>");
                parts.push(message);
            } else {
                parts.push("*" + icons.info + " " + settings.sectionName.toUpperCase() + "*");
                parts.push(message);
            }
        } else if (message) {
            parts.push(icons.info + " " + message);
        }

        // DATA SECTION
        if (data) {
            if (format === "html") {
                parts.push("<b>" + icons.data + " DÁTA</b>");
                if (typeof data === 'object') {
                    parts.push("<pre>" + formatObjectDataTelegram(data, format) + "</pre>");
                } else {
                    parts.push("<code>" + String(data) + "</code>");
                }
            } else {
                parts.push("*" + icons.data + " DÁTA*");
                if (typeof data === 'object') {
                    parts.push("```\n" + formatObjectDataTelegram(data, format) + "\n```");
                } else {
                    parts.push("`" + String(data) + "`");
                }
            }
        }

        // FOOTER
        if (settings.includeFooter) {
            if (format === "html") {
                parts.push("➖➖➖➖➖➖➖➖➖➖");
                parts.push("🏁 <i>Spracovanie dokončené</i>");
                parts.push("⚙️ <small>MementoCore v7.0</small>");
            } else {
                parts.push("➖➖➖➖➖➖➖➖➖➖");
                parts.push("🏁 _Spracovanie dokončené_");
                parts.push("⚙️ `MementoCore v7.0`");
            }
        }

        var finalMessage = parts.join("\n");

        // Pridaj inline keyboard ak je definovaná
        if (settings.inlineKeyboard) {
            finalMessage += "\n\n📱 Inline Keyboard: " + JSON.stringify(settings.inlineKeyboard);
        }

        return finalMessage;
    }

    function formatObjectData(obj, indent) {
        indent = indent || 0;
        var spaces = "  ".repeat(indent);
        var result = [];

        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                var value = obj[key];
                if (typeof value === 'object' && value !== null) {
                    result.push(spaces + key + ":");
                    result.push(formatObjectData(value, indent + 1));
                } else {
                    result.push(spaces + key + ": " + String(value));
                }
            }
        }

        return result.join("\n");
    }

    function formatObjectDataTelegram(obj, format, indent) {
        indent = indent || 0;
        var spaces = "  ".repeat(indent);
        var result = [];

        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                var value = obj[key];
                if (typeof value === 'object' && value !== null) {
                    result.push(spaces + key + ":");
                    result.push(formatObjectDataTelegram(value, format, indent + 1));
                } else {
                    result.push(spaces + key + ": " + String(value));
                }
            }
        }

        return result.join("\n");
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
                // Debug informácia pre neplatné vstupy
                if (!entry) {
                    addDebug(null, "⚠️ safeGet: entry je null/undefined, používam defaultValue: " + (defaultValue || "null"));
                }
                if (!fieldName) {
                    addDebug(null, "⚠️ safeGet: fieldName je null/undefined, používam defaultValue: " + (defaultValue || "null"));
                }
                return defaultValue !== undefined ? defaultValue : null;
            }

            var value = entry.field(fieldName);

            // Debug informácia pre použitie defaultValue
            if ((value === null || value === undefined) && defaultValue !== undefined) {
                addDebug(null, "ℹ️ safeGet: pole '" + fieldName + "' je prázdne, používam defaultValue: " + defaultValue);
            }

            return value !== null && value !== undefined ? value :
                   (defaultValue !== undefined ? defaultValue : null);
        } catch (e) {
            // Debug informácia pre chyby
            addDebug(null, "❌ safeGet: chyba pri prístupe k poľu '" + fieldName + "': " + e.toString() + ", používam defaultValue: " + (defaultValue || "null"));
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

            // Debug pre fallback format
            if (!config) {
                addDebug(null, "⚠️ formatDate: CONFIG nie je dostupný, používam fallback formát: " + defaultFormat);
            }

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

    function convertHoursToDuration(hours) {
    // Konvertuj hodiny na milisekundy pre Duration typ
    // Duration v Memento = milisekundy
    return Math.round(hours * 60 * 60 * 1000);
    }

    function convertDurationToHours(duration) {
        // Konvertuj Duration (milisekundy) na hodiny
        if (!duration || isNaN(duration)) {
            return 0;
        }
        return duration / (60 * 60 * 1000);
    }

    function convertHoursToTimeString(hours) {
        // Konvertuj hodiny na HH:MM formát
        var totalMinutes = Math.round(hours * 60);
        var h = Math.floor(totalMinutes / 60);
        var m = totalMinutes % 60;
        return h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0');
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

    /**
     * Univerzálna validácia vstupných dát pre akúkoľvek knižnicu
     * @param {Entry} entry - Záznam na validáciu
     * @param {string} librarySection - Názov sekcie knižnice v config.fields (napr. "attendance", "workRecord")
     * @param {Object} options - Voliteľné nastavenia
     * @param {Object} options.config - MementoConfig (voliteľné, ak nie je dostupný ako globálna premenná)
     * @param {Object} options.customMessages - Vlastné error správy pre jednotlivé polia
     * @param {Array} options.additionalFields - Ďalšie polia na validáciu navyše k requiredFields
     * @returns {Object} - { success: boolean, error: string, data: { fieldKey: fieldValue, ... } }
     */
    function validateInputData(entry, librarySection, options) {
        try {
            options = options || {};
            var config = options.config || getConfig();

            if (!config) {
                addError(entry, "CONFIG nie je dostupný pre validáciu", "validateInputData");
                return { success: false, error: "Chyba konfigurácie" };
            }

            // Získame field mapping pre túto knižnicu
            var fields = config.fields[librarySection];
            if (!fields) {
                addError(entry, "Neznáma sekcia knižnice: " + librarySection, "validateInputData");
                return { success: false, error: "Neznáma sekcia knižnice" };
            }

            // Získame zoznam povinných polí
            var requiredFieldKeys = fields.requiredFields || [];
            if (options.additionalFields && Array.isArray(options.additionalFields)) {
                requiredFieldKeys = requiredFieldKeys.concat(options.additionalFields);
            }

            if (requiredFieldKeys.length === 0) {
                addDebug(entry, "⚠️ Žiadne povinné polia nie sú definované pre: " + librarySection);
            }

            // Validácia a zber dát
            var data = {};
            var missingFields = [];
            var customMessages = options.customMessages || {};

            addDebug(entry, "🔍 Validujem vstupné dáta pre: " + librarySection);

            for (var i = 0; i < requiredFieldKeys.length; i++) {
                var fieldKey = requiredFieldKeys[i];
                var fieldName = fields[fieldKey];

                if (!fieldName) {
                    addError(entry, "Pole '" + fieldKey + "' nie je definované v config.fields." + librarySection, "validateInputData");
                    continue;
                }

                var value = entry.field(fieldName);

                // Kontrola prázdnosti
                var isEmpty = (value === null || value === undefined || value === "" ||
                              (Array.isArray(value) && value.length === 0));

                if (isEmpty) {
                    missingFields.push(fieldName);
                    var errorMsg = customMessages[fieldKey] || ("Chýba povinné pole: " + fieldName);
                    addDebug(entry, "❌ " + errorMsg);
                } else {
                    data[fieldKey] = value;
                    addDebug(entry, "✅ " + fieldName + ": OK");
                }
            }

            // Výsledok validácie
            if (missingFields.length > 0) {
                var errorMessage = "Chýbajú povinné polia: " + missingFields.join(", ");
                addError(entry, errorMessage, "validateInputData");
                addInfo(entry, "❌ Validácia zlyhala: " + errorMessage);
                return {
                    success: false,
                    error: errorMessage,
                    missingFields: missingFields,
                    data: data
                };
            }

            addDebug(entry, "✅ Validácia úspešná - všetky povinné polia sú vyplnené");
            addInfo(entry, "✅ Vstupné dáta validované");

            return {
                success: true,
                data: data
            };

        } catch (e) {
            addError(entry, "Chyba pri validácii vstupných dát: " + e.toString(), "validateInputData", e);
            return {
                success: false,
                error: "Chyba validácie: " + e.toString()
            };
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

            // Debug pre fallback library name
            if (!config) {
                addDebug(null, "⚠️ getSettings: CONFIG nie je dostupný, používam fallback knižnicu: " + defaultsLib);
            } else if (!libraryName) {
                addDebug(null, "ℹ️ getSettings: používam defaultnú knižnicu z CONFIG: " + defaultsLib);
            }

            var lib = libByName(defaultsLib);
            if (!lib) {
                addDebug(null, "❌ getSettings: knižnica '" + defaultsLib + "' neexistuje");
                return null;
            }

            var settings = lib.entries();
            if (settings && settings.length > 0) {
                // Zoberieme najnovší záznam
                var latestSettings = settings[settings.length - 1];
                var value = latestSettings.field(fieldName);

                if (value === null || value === undefined) {
                    addDebug(null, "⚠️ getSettings: pole '" + fieldName + "' v knižnici '" + defaultsLib + "' je prázdne");
                }

                return value;
            }

            addDebug(null, "⚠️ getSettings: knižnica '" + defaultsLib + "' neobsahuje žiadne záznamy");
            return null;
        } catch (e) {
            addDebug(null, "❌ getSettings: chyba pri získavaní nastavení: " + e.toString());
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

            // Debug pre fallback ikony
            if (!config) {
                addDebug(null, "⚠️ getIcon: CONFIG nie je dostupný pre ikonu '" + name + "', používam fallback");
            } else if (!config.icons || !config.icons[name]) {
                addDebug(null, "ℹ️ getIcon: ikona '" + name + "' nie je v CONFIG, používam fallback");
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
    // DIALÓGY
    // ==============================================

    /**
     * Zobrazí dialóg s chybou
     * @param {string} message - Text správy
     * @param {string} title - Titulok dialógu (voliteľný, default: "CHYBA")
     */
    function showErrorDialog(message, title) {
        var dialogTitle = title || "CHYBA";
        dialog()
            .title(dialogTitle)
            .text(message)
            .positiveButton("OK", function() {})
            .show();
    }

    /**
     * Zobrazí dialóg s úspechom
     * @param {string} message - Text správy
     * @param {string} title - Titulok dialógu (voliteľný, default: "ÚSPECH")
     */
    function showSuccessDialog(message, title) {
        var dialogTitle = title || "ÚSPECH";
        dialog()
            .title(dialogTitle)
            .text(message)
            .positiveButton("OK", function() {})
            .show();
    }

    /**
     * Zobrazí dialóg s informáciou
     * @param {string} message - Text správy
     * @param {string} title - Titulok dialógu (voliteľný, default: "INFORMÁCIA")
     */
    function showInfoDialog(message, title) {
        var dialogTitle = title || "INFORMÁCIA";
        dialog()
            .title(dialogTitle)
            .text(message)
            .positiveButton("OK", function() {})
            .show();
    }
  // ==============================================
    // SPRÁVA KNIŽNÍC - PREČÍSLOVANIE ZÁZNAMOV
    // ==============================================

    /**
     * Prečísluje záznamy knižnice podľa dátumu
     * @param {Library} targetLibrary - Knižnica pre prečíslovanie (ak null, použije sa aktuálna knižnica)
     * @param {string} dateField - Názov poľa s dátumom (ak null, použije sa "Dátum")
     * @param {string} idField - Názov poľa pre ID (ak null, použije sa "ID")
     * @param {number} startNumber - Počiatočné číslo (default: 1)
     * @param {boolean} ascending - Smer zoradenia: true = od najstaršieho, false = od najnovšieho (default: true)
     * @returns {object} Výsledok operácie
     *
     * @example
     * // Použitie v action scripte knižnice
     * var result = MementoCore.renumberLibraryRecords();
     *
     * // Vlastné nastavenia
     * var result = MementoCore.renumberLibraryRecords(myLibrary, "Dátum vytvorenia", "Poradové číslo", 100, false);
     */
    function renumberLibraryRecords(targetLibrary, dateField, idField, startNumber, ascending) {
        var result = {
            success: false,
            processed: 0,
            errors: 0,
            message: "",
            details: []
        };

        try {
            addDebug(null, "🔢 === ZAČÍNA PREČÍSLOVANIE ZÁZNAMOV ===", "start");

            // Parametrické hodnoty s fallbackmi
            var library = targetLibrary || lib;
            var dateFld = dateField || "Dátum";
            var idFld = idField || "ID";
            var startNum = startNumber || 1;
            var sortAscending = ascending !== false; // Default true

            if (!library) {
                result.message = "Chýba knižnica pre prečíslovanie";
                addError(null, result.message, "renumberLibraryRecords");
                return result;
            }

            addDebug(null, "📚 Knižnica: " + library.name);
            addDebug(null, "📅 Pole dátumu: " + dateFld);
            addDebug(null, "🆔 Pole ID: " + idFld);
            addDebug(null, "🔢 Začiatočné číslo: " + startNum);
            addDebug(null, "↕️ Smer: " + (sortAscending ? "od najstaršieho" : "od najnovšieho"));

            // Získaj všetky záznamy
            var allEntries = library.entries();
            if (!allEntries || allEntries.length === 0) {
                result.message = "Knižnica neobsahuje žiadne záznamy";
                addDebug(null, "⚠️ " + result.message);
                result.success = true; // Nie je to chyba
                return result;
            }

            addDebug(null, "📊 Celkový počet záznamov: " + allEntries.length);

            // Priprav záznamy pre zoradenie
            var recordsWithDates = [];
            var recordsWithoutDates = [];

            for (var i = 0; i < allEntries.length; i++) {
                var entryRecord = allEntries[i];
                var dateValue = safeGet(entryRecord, dateFld);

                if (dateValue) {
                    // Má dátum - pridaj do hlavného zoznamu
                    recordsWithDates.push({
                        entry: entryRecord,
                        date: new Date(dateValue),
                        originalId: safeGet(entryRecord, idFld)
                    });
                } else {
                    // Nemá dátum - použi dátum vytvorenia záznamu
                    var createdDate = entryRecord.created ? new Date(entryRecord.created) : new Date();
                    recordsWithDates.push({
                        entry: entryRecord,
                        date: createdDate,
                        originalId: safeGet(entryRecord, idFld),
                        usedCreatedDate: true
                    });
                }
            }

            addDebug(null, "📅 Záznamy s dátumom: " + recordsWithDates.length);
            addDebug(null, "❓ Záznamy bez dátumu: " + recordsWithoutDates.length);

            // Zoraď podľa dátumu
            recordsWithDates.sort(function(a, b) {
                if (sortAscending) {
                    return a.date - b.date; // Od najstaršieho
                } else {
                    return b.date - a.date; // Od najnovšieho
                }
            });

            addDebug(null, "✅ Záznamy zoradené podľa dátumu");

            // Prečísluj záznamy
            var currentNumber = startNum;
            var processed = 0;
            var errors = 0;

            for (var j = 0; j < recordsWithDates.length; j++) {
                try {
                    var record = recordsWithDates[j];
                    var oldId = record.originalId;

                    // Nastav nové ID
                    safeSet(record.entry, idFld, currentNumber);

                    var dateInfo = record.usedCreatedDate ? " (dátum vytvorenia)" : "";
                    addDebug(null, "✅ #" + currentNumber + ": " + formatDate(record.date) + dateInfo +
                           (oldId ? " (bolo: " + oldId + ")" : ""));

                    result.details.push({
                        newId: currentNumber,
                        oldId: oldId,
                        date: record.date,
                        usedCreatedDate: record.usedCreatedDate || false
                    });

                    currentNumber++;
                    processed++;

                } catch (entryError) {
                    errors++;
                    addError(null, "Chyba pri prečíslovaní záznamu: " + entryError.toString(), "renumberLibraryRecords");
                }
            }

            // Finálny súhrn
            result.success = errors === 0;
            result.processed = processed;
            result.errors = errors;
            result.message = "Prečíslovaných " + processed + " záznamov" +
                           (errors > 0 ? " (" + errors + " chýb)" : "");

            addDebug(null, "📊 === SÚHRN PREČÍSLOVANIA ===");
            addDebug(null, "✅ Úspešne prečíslovaných: " + processed);
            addDebug(null, "❌ Chýb: " + errors);
            addDebug(null, "🆔 Rozsah ID: " + startNum + " - " + (currentNumber - 1));
            addDebug(null, "🔢 === PREČÍSLOVANIE DOKONČENÉ ===");

            return result;

        } catch (error) {
            result.message = "Kritická chyba pri prečíslovaní: " + error.toString();
            addError(null, result.message, "renumberLibraryRecords", error);
            return result;
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
        addInfoTelegram: addInfoTelegram,
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
        convertDurationToHours: convertDurationToHours,
        convertHoursToDuration: convertHoursToDuration,
        convertHoursToTimeString: convertHoursToTimeString,
        
        //roundToQuarter: roundToQuarter,
        //roundToQuarterHour: roundToQuarterHour,
        
        // Validácia
        validateRequiredFields: validateRequiredFields,
        validateInputData: validateInputData,
        
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
        getIcon: getIcon,

        // Správa knižníc
        renumberLibraryRecords: renumberLibraryRecords,

        // Dialógy
        showErrorDialog: showErrorDialog,
        showSuccessDialog: showSuccessDialog,
        showInfoDialog: showInfoDialog

    };

  

})();