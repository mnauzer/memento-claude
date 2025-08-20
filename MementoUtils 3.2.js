// ==============================================
// MEMENTOUTILS 3.2 - Centrálna zdieľaná knižnica
// Verzia: 3.2 | Dátum: August 2025 | Autor: ASISTANTO
// ==============================================
// 📋 HLAVNÉ ZMENY V 3.2:
//    - KRITICKÉ OPRAVY: Odstránené duplicitné funkcie
//    - Implementované všetky chýbajúce core funkcie
//    - Opravená addError() signatúra s 4. parametrom
//    - Dokončené formatting a time utility funkcie
//    - Implementované business logic funkcie
//    - Pridané Telegram a notification funkcie
// ==============================================

var MementoUtils = (function() {
    'use strict';
    
    // ==============================================
    // CONFIGURATION & CONSTANTS
    // ==============================================
    
    var config = {
        version: "3.2",
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
        
        // Libraries - bezpečná inicializácia
        currentLib: null, // Nastaví sa v init()
        apiLibrary: "ASISTANTO API",
        defaultsLibrary: "ASISTANTO Defaults",
        notificationsLibrary: "ASISTANTO Notifications",
        telegramGroupsLibrary: "ASISTANTO Telegram Groups",
        
        // Telegram settings
        telegramBotTokenField: "Telegram Bot Token",
        telegramBaseUrl: "https://api.telegram.org/bot",
        
        // AI Providers
        defaultAIProvider: "OpenAi",
        
        // Business logic
        quarterRoundingMinutes: 15,
        defaultWorkHoursPerDay: 8,
        
        // API Field Names
        provider: "provider",
        apiKey: "Key",
        
        // N8N Integration
        n8nWebhookUrlField: "N8N Webhook URL",
        n8nApiKeyField: "N8N API Key",
        n8nAuthTypeField: "N8N Auth Type" // "none", "basic", "header", "apikey"
    };
    
    // Bezpečná inicializácia current library
    try {
        config.currentLib = lib();
    } catch (e) {
        // OK - môže byť volané mimo Memento kontext
    }
    
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
            defaultModel: "meta-llama/llama-3.1-8b-instruct:free",
            headers: function(apiKey) {
                return {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + apiKey,
                    "HTTP-Referer": "https://memento.database",
                    "X-Title": "Memento Database"
                };
            }
        }
    };
    
    // Cache pre API kľúče
    var _apiKeyCache = {};
    var _apiKeyCacheTimestamp = {};
    
    // ==============================================
    // LOGGING FUNCTIONS - OPRAVENÉ
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
            // Memento špecifická metóda
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
            
            // Stack trace ak je povolený
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
    // DATA & ENTRIES MANAGEMENT - BEZ DUPLICÍT
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
                return settingsEntry.field(fieldName);
            }
            
            // Return whole settings object
            var settings = {};
            var libFields = lib.fields();
            
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
    
    // function safeGetLinks(entry, linkFieldName) {
    //     try {
    //         if (!entry || !linkFieldName) return [];
            
    //         var links = entry.field(linkFieldName);
    //         if (!links) return [];
            
    //         return Array.isArray(links) ? links : [links];
            
    //     } catch (error) {
    //         return [];
    //     }
    // }

     /**
     * Získanie všetkých linkov z Link to Entry poľa
     * @param {Entry} entry - Entry objekt
     * @param {string} fieldName - Názov poľa
     * @return {Array} Array linknutých entries alebo []
     */
    function safeGetLinks(entry, fieldName) {
        var links = safeFieldAccess(entry, fieldName, []);
        return links || [];
    }

     function safeGetFirstLink(entry, fieldName) {
        var links = safeFieldAccess(entry, fieldName, []);
        return (links && links.length > 0) ? links[0] : null;
    }
    // ========================================
    // LINKS FROM OPERÁCIE (v1.0 + v2.1)
    // ========================================
    
    /**
     * Bezpečné LinksFrom volanie s error handlingom
     * @param {Entry} sourceEntry - Zdrojový entry objekt  
     * @param {string} targetLibrary - Názov cieľovej knižnice
     * @param {string} linkField - Názov poľa ktoré odkazuje späť
     * @param {Entry} debugEntry - Entry pre debug log (optional)
     * @return {Array} Array linknutých entries alebo []
     */
    function safeLinksFrom(sourceEntry, targetLibrary, linkField, debugEntry) {
        if (!sourceEntry || !targetLibrary || !linkField) return [];
        
        try {
            var results = sourceEntry.linksFrom(targetLibrary, linkField);
            
            if (debugEntry) {
                var count = results ? results.length : 0;
                addDebug(debugEntry, "✅ LinksFrom '" + targetLibrary + "': " + count + " záznamov");
            }
            
            return results || [];
        } catch (error) {
            if (debugEntry) {
                addError(debugEntry, "LinksFrom failed: " + error.toString(), "safeLinksFrom");
            }
            return [];
        }
    }
     
    // ==============================================
    // FORMATTING & TIME UTILITIES - IMPLEMENTOVANÉ
    // ==============================================
    
    function formatDate(date, format) {    /**
     * Získanie prvého linku z Link to Entry poľa
     * @param {Entry} entry - Entry objekt
     * @param {string} fieldName - Názov poľa
     * @return {Entry|null} Prvý linknutý entry alebo null
     */
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
    
    function formatEmployeeName(employeeEntry) {
        if (!employeeEntry) return "Neznámy";
        
        try {
            var nick = safeGet(employeeEntry, "Nick", "");
            var meno = safeGet(employeeEntry, "Meno", "");
            var priezvisko = safeGet(employeeEntry, "Priezvisko", "");
            
            // Priorita: nick (priezvisko) alebo meno priezvisko
            if (nick) {
                return priezvisko ? nick + " (" + priezvisko + ")" : nick;
            }
            
            if (meno || priezvisko) {
                return (meno + " " + priezvisko).trim();
            }
            
            return "Zamestnanec #" + safeGet(employeeEntry, "ID", "?");
            
        } catch (error) {
            return "Neznámy";
        }
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
    // HTTP & API FUNCTIONS - IMPLEMENTOVANÉ
    // ==============================================
    
    function getApiKey(provider) {
        provider = provider || config.defaultAIProvider;
        
        // Check cache
        if (_apiKeyCache[provider]) {
            var cacheTime = _apiKeyCacheTimestamp[provider];
            if (cacheTime && (Date.now() - cacheTime) < config.apiCacheTimeout) {
                return _apiKeyCache[provider];
            }
        }
        
        try {
            var apiLib = libByName(config.apiLibrary);
            if (!apiLib) {
                addError(entry(), "API library not found: " + config.apiLibrary, "getApiKey");
                return null;
            }
            
            var apiEntries = apiLib.entries();
            
            for (var i = 0; i < apiEntries.length; i++) {
                var apiEntry = apiEntries[i];
                if (apiEntry.field(config.provider) === provider) {
                    var apiKey = apiEntry.field(config.apiKey);
                    
                    // Cache it
                    _apiKeyCache[provider] = apiKey;
                    _apiKeyCacheTimestamp[provider] = Date.now();
                    
                    return apiKey;
                }
            }
            
            return null;
            
        } catch (error) {
            addError(entry(), "Error getting API key: " + error.toString(), "getApiKey", error);
            return null;
        }
    }
    
    function httpRequest(method, url, data, options) {
        options = options || {};
        var maxRetries = options.maxRetries || config.maxRetries;
        var timeout = options.timeout || config.httpTimeout;
        var headers = options.headers || {};
        
        for (var attempt = 0; attempt < maxRetries; attempt++) {
            try {
                var httpObj = http();
                
                // Set headers
                for (var header in headers) {
                    httpObj.header(header, headers[header]);
                }
                
                // Set timeout
                if (timeout && httpObj.timeout) {
                    httpObj.timeout(timeout);
                }
                
                var response;
                
                switch (method.toUpperCase()) {
                    case "GET":
                        response = httpObj.get(url);
                        break;
                    case "POST":
                        response = httpObj.post(url, JSON.stringify(data));
                        break;
                    case "PUT":
                        response = httpObj.put(url, JSON.stringify(data));
                        break;
                    case "DELETE":
                        response = httpObj.del(url);
                        break;
                    default:
                        throw new Error("Unsupported HTTP method: " + method);
                }
                
                if (response.code >= 200 && response.code < 300) {
                    return {
                        success: true,
                        data: response.body ? JSON.parse(response.body) : null,
                        code: response.code
                    };
                } else if (response.code >= 500 && attempt < maxRetries - 1) {
                    // Retry on server errors
                    continue;
                } else {
                    return {
                        success: false,
                        error: "HTTP " + response.code,
                        data: response.body,
                        code: response.code
                    };
                }
                
            } catch (error) {
                if (attempt >= maxRetries - 1) {
                    return {
                        success: false,
                        error: error.toString(),
                        code: 0
                    };
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
    // TELEGRAM FUNCTIONS - IMPLEMENTOVANÉ
    // ==============================================
    
    function sendTelegramMessage(chatId, text, options) {
        options = options || {};
        
        try {
            var botToken = getSettings(config.defaultsLibrary, config.telegramBotTokenField);
            if (!botToken) {
                return { success: false, error: "Telegram bot token not found" };
            }
            
            var url = config.telegramBaseUrl + botToken + "/sendMessage";
            
            var payload = {
                chat_id: chatId,
                text: text,
                parse_mode: options.parseMode || "HTML",
                disable_web_page_preview: options.disablePreview || false,
                disable_notification: options.silent || false
            };
            
            // Reply to message
            if (options.replyToMessageId) {
                payload.reply_to_message_id = options.replyToMessageId;
            }
            
            // Reply markup (keyboards, buttons)
            if (options.replyMarkup) {
                payload.reply_markup = JSON.stringify(options.replyMarkup);
            }
            
            // Thread/topic support
            if (options.messageThreadId) {
                payload.message_thread_id = options.messageThreadId;
            }
            
            var result = httpRequest("POST", url, payload);
            
            if (result.success && result.data && result.data.ok) {
                return {
                    success: true,
                    messageId: result.data.result.message_id,
                    data: result.data.result
                };
            } else {
                return {
                    success: false,
                    error: result.error || "Telegram API error",
                    data: result.data
                };
            }
            
        } catch (error) {
            return {
                success: false,
                error: error.toString()
            };
        }
    }
    
    function deleteTelegramMessage(chatId, messageId) {
        try {
            var botToken = getSettings(config.defaultsLibrary, config.telegramBotTokenField);
            if (!botToken) {
                return { success: false, error: "Telegram bot token not found" };
            }
            
            var url = config.telegramBaseUrl + botToken + "/deleteMessage";
            
            var payload = {
                chat_id: chatId,
                message_id: messageId
            };
            
            var result = httpRequest("POST", url, payload);
            
            return {
                success: result.success && result.data && result.data.ok,
                error: result.error
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.toString()
            };
        }
    }
    
    // ==============================================
    // NOTIFICATION MANAGEMENT - IMPLEMENTOVANÉ
    // ==============================================
    
    function createNotificationEntry(type, data) {
        try {
            var notifLib = libByName(config.notificationsLibrary);
            if (!notifLib) {
                return { success: false, error: "Notifications library not found" };
            }
            
            var notifData = {
                "Typ": type,
                "Stav": "Čaká",
                "Vytvorené": moment().toDate(),
                "Data": JSON.stringify(data),
                "Pokusov": 0
            };
            
            // Pridaj špecifické polia podľa typu
            if (type === "telegram") {
                notifData["Chat ID"] = data.chatId;
                notifData["Text"] = data.text;
                notifData["Thread ID"] = data.threadId || "";
            }
            
            var newNotif = notifLib.create(notifData);
            
            return {
                success: true,
                entry: newNotif,
                id: newNotif.field("ID")
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.toString()
            };
        }
    }
    
    function manageNotifications(sourceEntryId, deleteOld) {
        deleteOld = deleteOld !== false; // Default true
        
        try {
            var notifLib = libByName(config.notificationsLibrary);
            if (!notifLib) {
                return { success: false, error: "Notifications library not found" };
            }
            
            var results = {
                deleted: 0,
                created: 0,
                errors: []
            };
            
            // Vymaž staré notifikácie ak je to požadované
            if (deleteOld && sourceEntryId) {
                var oldNotifs = notifLib.find("Source Entry ID", sourceEntryId);
                
                for (var i = 0; i < oldNotifs.length; i++) {
                    try {
                        oldNotifs[i].trash();
                        results.deleted++;
                    } catch (e) {
                        results.errors.push("Failed to delete notification: " + e.toString());
                    }
                }
            }
            
            return {
                success: true,
                results: results
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.toString()
            };
        }
    }
    
    // ==============================================
    // AI INTEGRATION - IMPLEMENTOVANÉ
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
            
            // Špecifické nastavenia pre provider
            if (options.temperature !== undefined) payload.temperature = options.temperature;
            if (options.maxTokens) payload.max_tokens = options.maxTokens;
            if (options.jsonMode) payload.response_format = { type: "json_object" };
            
            var headers = providerConfig.headers(apiKey);
            
            var result = httpRequest("POST", providerConfig.baseUrl, payload, {
                headers: headers,
                timeout: options.timeout || 60000,
                maxRetries: options.maxRetries || 2
            });
            
            if (result.success && result.data) {
                return {
                    success: true,
                    content: result.data.choices[0].message.content,
                    usage: result.data.usage,
                    raw: result.data
                };
            } else {
                return {
                    success: false,
                    error: result.error || "AI API call failed",
                    data: result.data
                };
            }
            
        } catch (error) {
            return {
                success: false,
                error: error.toString()
            };
        }
    }
    
    // ==============================================
    // BUSINESS LOGIC FUNCTIONS - IMPLEMENTOVANÉ
    // ==============================================
    
    function calculateWorkHours(startTime, endTime) {
        try {
            var start = moment(startTime);
            var end = moment(endTime);
            
            if (!start.isValid() || !end.isValid()) {
                return {
                    hours: 0,
                    minutes: 0,
                    crossesMidnight: false,
                    error: "Invalid time format"
                };
            }
            
            var diffMinutes = end.diff(start, 'minutes');
            var crossesMidnight = false;
            
            // Ak je rozdiel záporný, práca cez polnoc
            if (diffMinutes < 0) {
                diffMinutes += 24 * 60;
                crossesMidnight = true;
            }
            
            var hours = Math.floor(diffMinutes / 60);
            var minutes = diffMinutes % 60;
            
            return {
                hours: hours + (minutes / 60),
                hoursOnly: hours,
                minutes: minutes,
                totalMinutes: diffMinutes,
                crossesMidnight: crossesMidnight
            };
            
        } catch (error) {
            return {
                hours: 0,
                minutes: 0,
                error: error.toString()
            };
        }
    }
    
    function getEmployeeDetails(employeeEntry, date) {
        if (!employeeEntry) {
            return {
                hasValidRate: false,
                error: "No employee entry provided"
            };
        }
        
        try {
            var details = {
                id: safeGet(employeeEntry, "ID", ""),
                nick: safeGet(employeeEntry, "Nick", ""),
                name: safeGet(employeeEntry, "Meno", ""),
                surname: safeGet(employeeEntry, "Priezvisko", ""),
                fullName: formatEmployeeName(employeeEntry),
                telegramEnabled: safeGet(employeeEntry, "telegran", false),
                telegramId: safeGet(employeeEntry, "Telegram ID", ""),
                hasValidRate: false,
                hourlyRate: 0,
                rateValidFrom: null
            };
            
            // Získaj hodinovú sadzbu
            var ratesLib = libByName("sadzby zamestnancov");
            if (ratesLib) {
                var rates = employeeEntry.linksFrom("sadzby zamestnancov", "Zamestnanec");
                
                if (rates && rates.length > 0) {
                    // Zoraď podľa dátumu platnosti
                    rates.sort(function(a, b) {
                        var dateA = moment(a.field("Platnosť od"));
                        var dateB = moment(b.field("Platnosť od"));
                        return dateB.valueOf() - dateA.valueOf();
                    });
                    
                    // Nájdi platnú sadzbu
                    var checkDate = date ? moment(date) : moment();
                    
                    for (var i = 0; i < rates.length; i++) {
                        var rate = rates[i];
                        var validFrom = moment(rate.field("Platnosť od"));
                        
                        if (validFrom.isSameOrBefore(checkDate)) {
                            details.hourlyRate = parseFloat(rate.field("Sadzba")) || 0;
                            details.rateValidFrom = validFrom.toDate();
                            details.hasValidRate = details.hourlyRate > 0;
                            break;
                        }
                    }
                }
            }
            
            return details;
            
        } catch (error) {
            return {
                hasValidRate: false,
                error: error.toString()
            };
        }
    }
    
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
    // ALIAS FUNKCIE PRE SPÄTNÚ KOMPATIBILITU
    // ==============================================
    
    function safeFieldAccess(entry, fieldName, defaultValue) {
        return safeGet(entry, fieldName, defaultValue);
    }
    
    function saveLogs(entry) {
        // V Memento sa logy ukladajú automaticky
        // Táto funkcia je len pre kompatibilitu
        return true;
    }
    
    // ==============================================
    // EXPORT PUBLIC API
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
        saveLogs: saveLogs, // Alias pre kompatibilitu
        
        // Data Management
        getSettings: getSettings,
        findEntryById: findEntryById,
        safeGet: safeGet,
        safeSet: safeSet,
        safeFieldAccess: safeFieldAccess, // Alias
        safeGetAttribute: safeGetAttribute,
        safeSetAttribute: safeSetAttribute,
        safeGetLinks: safeGetLinks,
        safeGetFirstLink: safeGetFirstLink,
        safeLinksFrom: safeLinksFrom,

        // Formatting & Time
        formatDate: formatDate,
        formatTime: formatTime,
        formatMoney: formatMoney,
        formatEmployeeName: formatEmployeeName,
        parseTimeToMinutes: parseTimeToMinutes,
        roundToQuarter: roundToQuarter,
        
        // HTTP & API
        getApiKey: getApiKey,
        httpRequest: httpRequest,
        
        // Telegram
        sendTelegramMessage: sendTelegramMessage,
        deleteTelegramMessage: deleteTelegramMessage,
        
        // Notifications
        createNotificationEntry: createNotificationEntry,
        manageNotifications: manageNotifications,
        
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