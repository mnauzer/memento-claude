// ==============================================
// MEMENTOUTILS 3.0 - Centrálna zdieľaná knižnica
// Verzia: 3.0 | Dátum: August 2025 | Autor: ASISTANTO
// ==============================================
// 📋 HLAVNÉ ZMENY V 3.0:
//    - Centralizované Telegram funkcie z Dochádzka skriptov
//    - Vylepšené notification management s lifecycle podporou
//    - Rozšírené formatting utility pre dátumy, časy, peniaze
//    - Modulárna štruktúra s jasne oddelenými sekciami
//    - Zachovaná spätná kompatibilita s v2.2
// ==============================================

var MementoUtils = (function() {
    'use strict';
    
    // ==============================================
    // CONFIGURATION & CONSTANTS
    // ==============================================
    
    var config = {
        version: "3.0",
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
        
        // API settings
        apiCacheTimeout: 3600000, // 1 hour
        httpTimeout: 30000, // 30 seconds
        maxRetries: 3,
        
        // Libraries
        apiLibrary: "ASISTANTO API",
        defaultsLibrary: "ASISTANTO Defaults",
        notificationsLibrary: "ASISTANTO Notifications",
        
        // AI Providers
        defaultAIProvider: "OpenAi"
    };
    
    var AI_PROVIDERS = {
        OpenAi: {
            name: "OpenAI",
            baseUrl: "https://api.openai.com/v1/chat/completions",
            defaultModel: "gpt-4o-mini",
            headers: function(apiKey) {
                return {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + apiKey
                };
            }
        },
        Perplexity: {
            name: "Perplexity",
            baseUrl: "https://api.perplexity.ai/chat/completions",
            defaultModel: "llama-3.1-sonar-small-128k-online",
            headers: function(apiKey) {
                return {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + apiKey
                };
            }
        },
        OpenRouter: {
            name: "OpenRouter",
            baseUrl: "https://openrouter.ai/api/v1/chat/completions",
            defaultModel: "openai/gpt-4o-mini",
            headers: function(apiKey) {
                return {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + apiKey,
                    "HTTP-Referer": "https://memento.database",
                    "X-Title": "Memento Database Assistant"
                };
            }
        }
    };
    
    // API response cache
    var apiCache = {};
    
    // ==============================================
    // CORE & LOGGING
    // ==============================================
    
    function getCurrentLineNumber() {
        if (!config.includeLineNumbers) return null;
        
        try {
            throw new Error();
        } catch (e) {
            var stack = e.stack || "";
            var lines = stack.split("\n");
            return lines[3] ? lines[3].match(/:(\d+)/) ? lines[3].match(/:(\d+)/)[1] : null : null;
        }
    }
    
    function addDebug(entry, message, context) {
        if (!config.debug || !entry) return;
        
        var timestamp = moment().format("DD.MM.YY HH:mm:ss");
        var logEntry = "[" + timestamp + "] ";
        
        if (context) {
            logEntry += "(" + context + ") ";
        }
        
        logEntry += message;
        
        if (config.includeLineNumbers) {
            var lineNumber = getCurrentLineNumber();
            if (lineNumber) {
                logEntry += " [L:" + lineNumber + "]";
            }
        }
        
        var existingDebug = entry.field(config.debugFieldName) || "";
        entry.set(config.debugFieldName, existingDebug + logEntry + "\n");
    }
    
    function addError(entry, error, context) {
        if (!entry) return;
        
        var timestamp = moment().format("DD.MM.YY HH:mm:ss");
        var errorMessage = "[" + timestamp + "] v" + config.version;
        
        if (context) {
            errorMessage += " (" + context + ")";
        }
        
        errorMessage += " - ";
        
        // Handle different error types
        if (error && typeof error === "object") {
            if (error.message) {
                errorMessage += error.message;
            } else {
                errorMessage += error.toString();
            }
            
            if (config.includeStackTrace && error.stack) {
                errorMessage += "\nStack: " + error.stack;
            }
        } else {
            errorMessage += error;
        }
        
        var existingError = entry.field(config.errorFieldName) || "";
        entry.set(config.errorFieldName, existingError + errorMessage + "\n");
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
    // DATA & ENTRIES MANAGEMENT
    // ==============================================
    
    function getSettings(libraryName, fieldName) {
        try {
            var lib = libByName(libraryName || config.defaultsLibrary);
            if (!lib) {
                addError(entry(), "Library '" + libraryName + "' not found", "getSettings");
                return null;
            }
            
            var entries = lib.entries();
            if (!entries || entries.length === 0) {
                addError(entry(), "No entries in '" + libraryName + "'", "getSettings");
                return null;
            }
            
            var settingsEntry = entries[0];
            
            if (fieldName) {
                return safeGet(settingsEntry, fieldName, null);
            }
            
            // Return whole settings object
            var settings = {};
            var fields = settingsEntry.fields();
            for (var i = 0; i < fields.length; i++) {
                var field = fields[i];
                settings[field.name] = settingsEntry.field(field.name);
            }
            
            return settings;
            
        } catch (error) {
            addError(entry(), error, "getSettings");
            return null;
        }
    }
    
    function findEntryById(libraryName, entryId) {
        try {
            var lib = libByName(libraryName);
            if (!lib) return null;
            
            var entries = lib.find("ID", entryId);
            return entries.length > 0 ? entries[0] : null;
            
        } catch (error) {
            addError(entry(), error, "findEntryById");
            return null;
        }
    }
    
    function safeGet(entry, field, defaultValue) {
        try {
            if (!entry) return defaultValue;
            var value = entry.field(field);
            return (value !== null && value !== undefined) ? value : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }
    
    function safeSet(entry, field, value) {
        try {
            if (!entry) return false;
            entry.set(field, value);
            return true;
        } catch (e) {
            addError(entry, "Failed to set field '" + field + "': " + e.toString(), "safeSet");
            return false;
        }
    }
    
    function safeGetAttribute(entry, field, index, attr, defaultValue) {
        try {
            if (!entry) return defaultValue;
            
            var linkedEntries = entry.field(field);
            if (!linkedEntries || !Array.isArray(linkedEntries)) return defaultValue;
            
            if (index < 0 || index >= linkedEntries.length) return defaultValue;
            
            var linkedEntry = linkedEntries[index];
            if (!linkedEntry) return defaultValue;
            
            // Try to get attribute
            var value = entry.attr(field, attr);
            return (value !== null && value !== undefined) ? value : defaultValue;
            
        } catch (e) {
            return defaultValue;
        }
    }
    
    function safeSetAttribute(entry, field, index, attr, value) {
        try {
            if (!entry) return false;
            
            var linkedEntries = entry.field(field);
            if (!linkedEntries || !Array.isArray(linkedEntries)) return false;
            
            if (index < 0 || index >= linkedEntries.length) return false;
            
            entry.setAttr(field, attr, value);
            return true;
            
        } catch (e) {
            addError(entry, "Failed to set attribute '" + attr + "': " + e.toString(), "safeSetAttribute");
            return false;
        }
    }
    
    function safeGetLinks(entry, fieldName) {
        try {
            if (!entry) return [];
            var links = entry.field(fieldName);
            return (links && Array.isArray(links)) ? links : [];
        } catch (e) {
            return [];
        }
    }
    
    // ==============================================
    // NOTIFICATION & TELEGRAM INTEGRATION
    // ==============================================
    
    function sendTelegramMessage(options) {
        try {
            if (!options || !options.chatId || !options.message || !options.botToken) {
                return { success: false, error: "Missing required parameters" };
            }
            
            var url = "https://api.telegram.org/bot" + options.botToken + "/sendMessage";
            
            var payload = {
                chat_id: options.chatId,
                text: options.message,
                parse_mode: options.parseMode || "Markdown"
            };
            
            // Support for message threads (topics in supergroups)
            if (options.topicId && options.topicId !== "" && options.topicId !== "0") {
                payload.message_thread_id = parseInt(options.topicId);
            }
            
            // Silent notifications
            if (options.silent) {
                payload.disable_notification = true;
            }
            
            var httpObj = http();
            httpObj.headers({"Content-Type": "application/json"});
            
            var response = httpObj.post(url, JSON.stringify(payload));
            
            if (response.code === 200) {
                try {
                    var data = JSON.parse(response.body);
                    if (data.ok && data.result) {
                        return {
                            success: true,
                            messageId: data.result.message_id ? data.result.message_id.toString() : null,
                            chatId: data.result.chat.id ? data.result.chat.id.toString() : null
                        };
                    }
                } catch (e) {
                    return { success: true, messageId: null };
                }
            } else {
                return { 
                    success: false, 
                    error: "HTTP " + response.code + ": " + response.body 
                };
            }
            
        } catch (error) {
            return { 
                success: false, 
                error: error.toString() 
            };
        }
    }
    
    function deleteTelegramMessage(options) {
        try {
            if (!options || !options.chatId || !options.messageId || !options.botToken) {
                return { success: false, error: "Missing required parameters" };
            }
            
            var url = "https://api.telegram.org/bot" + options.botToken + "/deleteMessage";
            
            var payload = {
                chat_id: options.chatId,
                message_id: parseInt(options.messageId)
            };
            
            var httpObj = http();
            httpObj.headers({"Content-Type": "application/json"});
            
            var response = httpObj.post(url, JSON.stringify(payload));
            
            return {
                success: response.code === 200,
                error: response.code !== 200 ? "HTTP " + response.code : null
            };
            
        } catch (error) {
            return { 
                success: false, 
                error: error.toString() 
            };
        }
    }
    
    function createNotificationEntry(data) {
        try {
            if (!data || !data.type) {
                return { success: false, error: "Missing notification data", entry: null };
            }
            
            var notifLib = libByName(config.notificationsLibrary);
            if (!notifLib) {
                return { success: false, error: "Notifications library not found", entry: null };
            }
            
            // Prepare notification data
            var notifData = {
                "Dátum": data.date || moment().toDate(),
                "Typ": data.type || "Telegram",
                "Knižnica": data.library || "",
                "Chat ID": data.chatId || "",
                "Thread ID": data.threadId || "",
                "Message ID": data.messageId || "",
                "Adresát": data.recipient || "",
                "Message": data.message || "",
                "Status": data.status || "Odoslané"
            };
            
            var newEntry = notifLib.create(notifData);
            
            return {
                success: newEntry !== null,
                entry: newEntry,
                error: newEntry ? null : "Failed to create notification entry"
            };
            
        } catch (error) {
            return { 
                success: false, 
                error: error.toString(),
                entry: null
            };
        }
    }
    
    function manageNotifications(entry, newNotificationEntries, linkFieldName) {
        try {
            if (!entry || !linkFieldName) {
                return { success: false, error: "Invalid parameters" };
            }
            
            linkFieldName = linkFieldName || "Telegram Notifikácie";
            
            // Get existing notifications
            var existingNotifications = safeGetLinks(entry, linkFieldName);
            
            // Delete old notifications from Telegram
            for (var i = 0; i < existingNotifications.length; i++) {
                var notif = existingNotifications[i];
                if (!notif) continue;
                
                var chatId = safeGet(notif, "Chat ID", "");
                var messageId = safeGet(notif, "Message ID", "");
                var botToken = getApiKey("telegram");
                
                if (chatId && messageId && botToken) {
                    deleteTelegramMessage({
                        chatId: chatId,
                        messageId: messageId,
                        botToken: botToken
                    });
                }
                
                // Delete the notification entry
                try {
                    notif.trash();
                } catch (e) {
                    // Silent fail
                }
            }
            
            // Link new notifications
            if (newNotificationEntries && newNotificationEntries.length > 0) {
                safeSet(entry, linkFieldName, newNotificationEntries);
            } else {
                safeSet(entry, linkFieldName, []);
            }
            
            return {
                success: true,
                deletedCount: existingNotifications.length,
                linkedCount: newNotificationEntries ? newNotificationEntries.length : 0
            };
            
        } catch (error) {
            return { 
                success: false, 
                error: error.toString() 
            };
        }
    }
    
    // ==============================================
    // FORMATTING & PARSING UTILITIES
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
            if (typeof time === "number") {
                // Convert minutes to HH:mm
                var hours = Math.floor(time / 60);
                var minutes = time % 60;
                return (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes;
            } else {
                return moment(time).format(config.timeFormat);
            }
        } catch (e) {
            return "00:00";
        }
    }
    
    function formatMoney(amount, currency) {
        if (typeof amount !== "number") return "0.00 €";
        
        currency = currency || "€";
        return amount.toFixed(2) + " " + currency;
    }
    
    function formatEmployeeName(employeeEntry, format) {
        if (!employeeEntry) return "Neznámy";
        
        var nick = safeGet(employeeEntry, "Nick", "");
        var meno = safeGet(employeeEntry, "Meno", "");
        var priezvisko = safeGet(employeeEntry, "Priezvisko", "");
        
        format = format || "nick_surname"; // Options: full, nick_only, nick_surname
        
        switch (format) {
            case "full":
                return (meno + " " + priezvisko).trim() || nick || "Neznámy";
            case "nick_only":
                return nick || (meno + " " + priezvisko).trim() || "Neznámy";
            case "nick_surname":
            default:
                if (nick) {
                    return priezvisko ? nick + " (" + priezvisko + ")" : nick;
                }
                return (meno + " " + priezvisko).trim() || "Neznámy";
        }
    }
    
    function parseTimeToMinutes(timeString) {
        if (!timeString) return 0;
        
        try {
            if (typeof timeString === "number") return timeString;
            
            var parts = timeString.split(":");
            if (parts.length === 2) {
                return parseInt(parts[0]) * 60 + parseInt(parts[1]);
            }
            
            return 0;
        } catch (e) {
            return 0;
        }
    }
    
    function roundToQuarter(minutes, quarterSize) {
        quarterSize = quarterSize || 15;
        return Math.round(minutes / quarterSize) * quarterSize;
    }
    
    // ==============================================
    // HTTP & API UTILITIES
    // ==============================================
    
    function getApiKey(provider) {
        var cacheKey = "apiKey_" + provider;
        
        // Check cache
        if (apiCache[cacheKey]) {
            var cached = apiCache[cacheKey];
            if (Date.now() - cached.timestamp < config.apiCacheTimeout) {
                return cached.value;
            }
        }
        
        try {
            var apiLib = libByName(config.apiLibrary);
            if (!apiLib) return null;
            
            var entries = apiLib.entries();
            for (var i = 0; i < entries.length; i++) {
                var providerName = safeGet(entries[i], "provider", "").toLowerCase();
                if (providerName === provider.toLowerCase()) {
                    var apiKey = safeGet(entries[i], "api", "");
                    
                    // Cache the result
                    apiCache[cacheKey] = {
                        value: apiKey,
                        timestamp: Date.now()
                    };
                    
                    return apiKey;
                }
            }
            
        } catch (error) {
            addError(entry(), error, "getApiKey");
        }
        
        return null;
    }
    
    function httpRequest(url, options) {
        options = options || {};
        var method = options.method || "GET";
        var headers = options.headers || {};
        var body = options.body || null;
        var maxRetries = options.maxRetries || config.maxRetries;
        
        var attempt = 0;
        
        while (attempt < maxRetries) {
            try {
                var httpObj = http();
                
                if (headers) {
                    httpObj.headers(headers);
                }
                
                var response;
                if (method === "GET") {
                    response = httpObj.get(url);
                } else if (method === "POST") {
                    response = httpObj.post(url, body);
                } else if (method === "PUT") {
                    response = httpObj.put(url, body);
                } else if (method === "DELETE") {
                    response = httpObj.del(url);
                }
                
                if (response.code === 200) {
                    return {
                        success: true,
                        data: response.body,
                        code: response.code
                    };
                } else if (response.code >= 500 && attempt < maxRetries - 1) {
                    // Server error - retry
                    attempt++;
                    continue;
                } else {
                    // Client error or final attempt
                    return {
                        success: false,
                        error: "HTTP " + response.code,
                        data: response.body,
                        code: response.code
                    };
                }
                
            } catch (error) {
                attempt++;
                if (attempt >= maxRetries) {
                    return {
                        success: false,
                        error: error.toString(),
                        code: 0
                    };
                }
                
                // Simple exponential backoff
                var delay = Math.pow(2, attempt) * 1000;
                var start = Date.now();
                while (Date.now() - start < delay) {
                    // Busy wait
                }
            }
        }
        
        return {
            success: false,
            error: "Max retries exceeded",
            code: 0
        };
    }
    
    // ==============================================
    // AI INTEGRATION (preserved from v2.2)
    // ==============================================
    
    function callAI(provider, prompt, options) {
        options = options || {};
        provider = provider || config.defaultAIProvider;
        
        var providerConfig = AI_PROVIDERS[provider];
        if (!providerConfig) {
            return { success: false, error: "Unknown AI provider: " + provider };
        }
        
        var apiKey = options.apiKey || getApiKey(provider);
        if (!apiKey) {
            return { success: false, error: "API key not found for " + provider };
        }
        
        try {
            var payload = {
                model: options.model || providerConfig.defaultModel,
                messages: [
                    {
                        role: options.systemPrompt ? "system" : "user",
                        content: options.systemPrompt || prompt
                    }
                ]
            };
            
            if (options.systemPrompt) {
                payload.messages.push({
                    role: "user",
                    content: prompt
                });
            }
            
            if (options.temperature !== undefined) {
                payload.temperature = options.temperature;
            }
            
            if (options.maxTokens) {
                payload.max_tokens = options.maxTokens;
            }
            
            var response = httpRequest(providerConfig.baseUrl, {
                method: "POST",
                headers: providerConfig.headers(apiKey),
                body: JSON.stringify(payload)
            });
            
            if (response.success) {
                try {
                    var data = JSON.parse(response.data);
                    if (data.choices && data.choices[0] && data.choices[0].message) {
                        return {
                            success: true,
                            content: data.choices[0].message.content,
                            usage: data.usage || null
                        };
                    }
                } catch (e) {
                    return { success: false, error: "Failed to parse AI response" };
                }
            }
            
            return response;
            
        } catch (error) {
            return { success: false, error: error.toString() };
        }
    }
    
    // ==============================================
    // BUSINESS LOGIC HELPERS
    // ==============================================
    
    function calculateWorkHours(startTime, endTime, breakMinutes) {
        try {
            var start = moment(startTime);
            var end = moment(endTime);
            
            if (!start.isValid() || !end.isValid()) {
                return 0;
            }
            
            var diffMinutes = end.diff(start, "minutes");
            diffMinutes -= (breakMinutes || 0);
            
            return Math.max(0, diffMinutes / 60);
            
        } catch (e) {
            return 0;
        }
    }
    
    function getEmployeeDetails(employeeEntry) {
        if (!employeeEntry) return null;
        
        return {
            id: safeGet(employeeEntry, "ID", ""),
            nick: safeGet(employeeEntry, "Nick", ""),
            name: safeGet(employeeEntry, "Meno", ""),
            surname: safeGet(employeeEntry, "Priezvisko", ""),
            fullName: formatEmployeeName(employeeEntry),
            telegramId: safeGet(employeeEntry, "Telegram ID", ""),
            telegramEnabled: safeGet(employeeEntry, "telegram", false),
            email: safeGet(employeeEntry, "Email", ""),
            phone: safeGet(employeeEntry, "Telefón", "")
        };
    }
    
    function validateRequiredFields(entry, requiredFields) {
        var errors = [];
        
        for (var i = 0; i < requiredFields.length; i++) {
            var fieldName = requiredFields[i];
            var value = safeGet(entry, fieldName, null);
            
            if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
                errors.push("Pole '" + fieldName + "' je povinné");
            }
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    // ==============================================
    // PUBLIC API
    // ==============================================
    
    return {
        // Version
        version: config.version,
        
        // Configuration
        DEFAULT_CONFIG: config,
        AI_PROVIDERS: AI_PROVIDERS,
        
        // Logging
        addDebug: addDebug,
        addError: addError,
        addInfo: addInfo,
        clearLogs: clearLogs,
        
        // Data Management
        getSettings: getSettings,
        findEntryById: findEntryById,
        safeGet: safeGet,
        safeSet: safeSet,
        safeGetAttribute: safeGetAttribute,
        safeSetAttribute: safeSetAttribute,
        safeGetLinks: safeGetLinks,
        
        // Notifications
        sendTelegramMessage: sendTelegramMessage,
        deleteTelegramMessage: deleteTelegramMessage,
        createNotificationEntry: createNotificationEntry,
        manageNotifications: manageNotifications,
        
        // Formatting
        formatDate: formatDate,
        formatTime: formatTime,
        formatMoney: formatMoney,
        formatEmployeeName: formatEmployeeName,
        parseTimeToMinutes: parseTimeToMinutes,
        roundToQuarter: roundToQuarter,
        
        // HTTP & API
        getApiKey: getApiKey,
        httpRequest: httpRequest,
        
        // AI Integration
        callAI: callAI,
        
        // Business Logic
        calculateWorkHours: calculateWorkHours,
        getEmployeeDetails: getEmployeeDetails,
        validateRequiredFields: validateRequiredFields,
        
        // Legacy support
        includeLineNumbers: config.includeLineNumbers,
        includeStackTrace: config.includeStackTrace
    };
})();