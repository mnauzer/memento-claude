// ==============================================
// MEMENTOUTILS 3.1 - Centrálna zdieľaná knižnica
// Verzia: 3.1 | Dátum: August 2025 | Autor: ASISTANTO
// ==============================================
// 📋 HLAVNÉ ZMENY V 3.1:
//    - Kompletná implementácia všetkých funkcií
//    - Funkčná Telegram integrácia
//    - Dokončené business logic funkcie
//    - Vylepšené error handling
//    - Plná kompatibilita s Memento JavaScript
// ==============================================

var MementoUtils = (function() {
    'use strict';
    
    // ==============================================
    // CONFIGURATION & CONSTANTS
    // ==============================================
    
    var config = {
        version: "3.1.1",
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
        currentLib: lib(),
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
        n8nAuthTypeField: "N8N Auth Type", // "none", "basic", "header"
        n8nUsernameField: "N8N Username",
        n8nPasswordField: "N8N Password",
        n8nHeaderNameField: "N8N Header Name",
        n8nTimeoutMs: 30000,
        n8nMaxRetries: 3
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
            defaultModel: "meta-llama/llama-3.1-8b-instruct:free",
            headers: function(apiKey) {
                return {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + apiKey
                };
            }
        }
    };
    
    // Cache for API keys
    var apiKeyCache = {};
    var cacheTimestamps = {};
    
    // ==============================================
    // LOGGING FUNCTIONS
    // ==============================================
    
    function getCurrentLine() {
        if (!config.includeLineNumbers) return "";
        
        try {
            throw new Error();
        } catch (e) {
            var stack = e.stack || "";
            var lines = stack.split("\n");
            if (lines.length >= 3) {
                var match = lines[2].match(/:(\d+):\d+/);
                if (match) return match[1];
            }
        }
        return "";
    }
    
    function addDebug(entry, message) {
        if (!entry || !config.debug) return;
        
        var timestamp = moment().format("HH:mm:ss");
        var debugMessage = "[" + timestamp + "] " + message;
        
        if (config.includeLineNumbers) {
            var line = getCurrentLine();
            if (line) debugMessage += " (line " + line + ")";
        }
        
        var existingDebug = entry.field(config.debugFieldName) || "";
        entry.set(config.debugFieldName, existingDebug + debugMessage + "\n");
    }
    
    function addError(entry, errorMessage, scriptName, errorObject) {
       
    // Ak máme error objekt, pokúsime sa získať číslo riadku
        if (!entry) return;
        
        var timestamp = moment().format("DD.MM.YY HH:mm:ss");
        var formattedMessage = "[" + timestamp + "] ";
        
        if (scriptName) {
            formattedMessage += scriptName + " - ";
        }
        
        formattedMessage += errorMessage;
     if (errorObject && typeof errorObject === "object" && errorObject.lineNumber) {
        try {
            var lineNum = errorObject.lineNumber();
            if (lineNum) {
                formattedMessage += " (line: " + lineNum + ")";
            }
        } catch (e) {
            // Ticho ignorujeme ak lineNumber nie je dostupné
        }
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
            
            // Pre konkrétne pole vráť jeho hodnotu
            if (fieldName) {
                var value = settingsEntry.field(fieldName);
                return value;
            }
            
            // Pre celý objekt nastavení
            var settings = {};
            var libFields = lib.fields();
            
            for (var i = 0; i < libFields.length; i++) {
                var fieldDef = libFields[i];
                var fieldValue = settingsEntry.field(fieldDef.name);
                settings[fieldDef.name] = fieldValue;
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
            addError(entry, error, "safeSet: " + fieldName);
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
            addError(entry, error, "safeSetAttribute: " + linkFieldName + "." + attributeName);
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
            addError(entry, error, "safeGetLinks: " + linkFieldName);
            return [];
        }
    }
    
    // ==============================================
    // TELEGRAM INTEGRATION
    // ==============================================
    
    function getTelegramBotToken() {
        try {
            var apiLib = libByName(config.apiLibrary);
            if (!apiLib) {
                addError(entry(), "API Library not found", "getTelegramBotToken");
                return null;
            }
            
            var telegramEntries = apiLib.find(config.provider, "Telegram");
            if (!telegramEntries || telegramEntries.length === 0) {
                addError(entry(), "Telegram bot token not found", "getTelegramBotToken");
                return null;
            }
            
            return telegramEntries[0].field(config.apiKey);
            
        } catch (error) {
            addError(entry(), error, "getTelegramBotToken");
            return null;
        }
    }
    
    function sendTelegramMessage(chatId, message, options) {
        options = options || {};
        
        try {
            var botToken = getTelegramBotToken();
            if (!botToken) {
                return { success: false, error: "Bot token not found" };
            }
            
            var url = config.telegramBaseUrl + botToken + "/sendMessage";
            
            var payload = {
                chat_id: chatId,
                text: message,
                parse_mode: options.parseMode || "Markdown",
                disable_web_page_preview: options.disablePreview || false,
                disable_notification: options.silentNotification || false
            };
            
            // Ak je to téma v supergroup, pridaj message_thread_id
            if (options.threadId) {
                payload.message_thread_id = options.threadId;
            }
            
            // Inline keyboard
            if (options.replyMarkup) {
                payload.reply_markup = JSON.stringify(options.replyMarkup);
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
                    error: result.error || (result.data && result.data.description) || "Unknown error"
                };
            }
            
        } catch (error) {
            addError(entry(), error, "sendTelegramMessage");
            return { success: false, error: error.toString() };
        }
    }
    
    function deleteTelegramMessage(chatId, messageId) {
        try {
            var botToken = getTelegramBotToken();
            if (!botToken) {
                return { success: false, error: "Bot token not found" };
            }
            
            var url = config.telegramBaseUrl + botToken + "/deleteMessage";
            
            var payload = {
                chat_id: chatId,
                message_id: messageId
            };
            
            var result = httpRequest("POST", url, payload);
            
            return {
                success: result.success && result.data && result.data.ok,
                error: result.error || (result.data && result.data.description)
            };
            
        } catch (error) {
            addError(entry(), error, "deleteTelegramMessage");
            return { success: false, error: error.toString() };
        }
    }
    
    // ==============================================
    // NOTIFICATION MANAGEMENT
    // ==============================================
    
    function createNotificationEntry(data) {
        try {
            var notifLib = libByName(config.notificationsLibrary);
            if (!notifLib) {
                addError(entry(), "Notifications library not found", "createNotificationEntry");
                return null;
            }
            
            var notificationData = {
                "Typ správy": data.typSpravy || "Systémová",
                "Zdroj správy": data.zdrojSpravy || "Automatická",
                "Správa": data.sprava || "",
                "Status": "Čaká",
                "Formátovanie": data.formatovanie || "Markdown",
                "Priorita": data.priorita || "Normálna",
                "Vytvoril": user(),
                "Vytvorené": moment().toDate(),
                "Zdrojová knižnica": data.zdrojovaKniznica || lib().name(),
                "Zdrojový ID": data.zdrojovyId || entry().field("ID")
            };
            
            // Voliteľné polia
            if (data.predmet) notificationData["Predmet"] = data.predmet;
            if (data.priloha) notificationData["Príloha"] = data.priloha;
            if (data.adresat) notificationData["Adresát"] = data.adresat;
            if (data.zamestnanec) notificationData["Zamestnanec"] = data.zamestnanec;
            if (data.klient) notificationData["Klient"] = data.klient;
            if (data.partner) notificationData["Partner"] = data.partner;
            if (data.skupinaTema) notificationData["Skupina/Téma"] = data.skupinaTema;
            if (data.zakazka) notificationData["Zákazka"] = data.zakazka;
            if (data.poslatO) notificationData["Poslať o"] = data.poslatO;
            if (data.vyprsat) notificationData["Vypršať o"] = data.vyprsat;
            if (data.opakovat) notificationData["Opakovať"] = data.opakovat;
            
            var newNotification = notifLib.create(notificationData);
            
            addInfo(newNotification, "Notifikácia vytvorená", {
                method: "createNotificationEntry",
                result: "ID: " + newNotification.field("ID"),
                type: data.typSpravy
            });
            
            return newNotification;
            
        } catch (error) {
            addError(entry(), error, "createNotificationEntry");
            return null;
        }
    }
    
    function manageNotifications(action, criteria) {
        try {
            var notifLib = libByName(config.notificationsLibrary);
            if (!notifLib) {
                return { success: false, error: "Notifications library not found" };
            }
            
            var results = { processed: 0, failed: 0, errors: [] };
            
            switch (action) {
                case "processExpired":
                    var now = moment();
                    var expiredNotifs = notifLib.find("Status", "Čaká");
                    
                    for (var i = 0; i < expiredNotifs.length; i++) {
                        var notif = expiredNotifs[i];
                        var vyprsat = notif.field("Vypršať o");
                        
                        if (vyprsat && moment(vyprsat).isBefore(now)) {
                            safeSet(notif, "Status", "Vypršané");
                            results.processed++;
                        }
                    }
                    break;
                    
                case "cancelBySource":
                    if (!criteria || !criteria.sourceId) {
                        return { success: false, error: "Source ID required" };
                    }
                    
                    var sourceNotifs = notifLib.find("Zdrojový ID", criteria.sourceId);
                    for (var j = 0; j < sourceNotifs.length; j++) {
                        if (sourceNotifs[j].field("Status") === "Čaká") {
                            safeSet(sourceNotifs[j], "Status", "Zrušené");
                            results.processed++;
                        }
                    }
                    break;
                    
                case "resendFailed":
                    var failedNotifs = notifLib.find("Status", "Zlyhalo");
                    for (var k = 0; k < failedNotifs.length; k++) {
                        var retryCount = safeGet(failedNotifs[k], "Pokusov o odoslanie", 0);
                        if (retryCount < config.maxRetries) {
                            safeSet(failedNotifs[k], "Status", "Čaká");
                            results.processed++;
                        }
                    }
                    break;
                    
                default:
                    return { success: false, error: "Unknown action: " + action };
            }
            
            return {
                success: true,
                results: results
            };
            
        } catch (error) {
            addError(entry(), error, "manageNotifications");
            return { success: false, error: error.toString() };
        }
    }
    
    // ==============================================
    // FORMATTING UTILITIES
    // ==============================================
    
    function formatDate(date, format) {
        if (!date) return "";
        
        try {
            var m = moment(date);
            return m.isValid() ? m.format(format || config.dateFormat) : "";
        } catch (error) {
            return "";
        }
    }
    
    function formatTime(hours) {
        if (!hours && hours !== 0) return "00:00";
        
        var totalMinutes = Math.round(hours * 60);
        var h = Math.floor(totalMinutes / 60);
        var m = totalMinutes % 60;
        return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
    }
    
    function formatMoney(amount, currency) {
        if (amount === null || amount === undefined) return "0.00 " + (currency || "€");
        
        var formatted = parseFloat(amount).toFixed(2).replace(".", ",");
        return formatted + " " + (currency || "€");
    }
    
    function formatEmployeeName(employee) {
        if (!employee) return "Neznámy zamestnanec";
        
        try {
            var nick = safeGet(employee, "Nick", "");
            var priezvisko = safeGet(employee, "Priezvisko", "");
            
            if (nick && priezvisko) {
                return nick + " (" + priezvisko + ")";
            } else if (nick) {
                return nick;
            } else if (priezvisko) {
                var meno = safeGet(employee, "Meno", "");
                return meno ? meno + " " + priezvisko : priezvisko;
            }
            
            return "Zamestnanec #" + safeGet(employee, "ID", "?");
            
        } catch (error) {
            return "Neznámy zamestnanec";
        }
    }
    
    function parseTimeToMinutes(timeString) {
        if (!timeString) return 0;
        
        try {
            if (typeof timeString === "number") {
                return Math.round(timeString * 60);
            }
            
            var parts = timeString.toString().split(":");
            if (parts.length === 2) {
                return parseInt(parts[0]) * 60 + parseInt(parts[1]);
            }
            
            return 0;
        } catch (error) {
            return 0;
        }
    }
    
    function roundToQuarter(hours) {
        if (!hours && hours !== 0) return 0;
        return Math.round(hours * 4) / 4;
    }
    
    // ==============================================
    // HTTP & API
    // ==============================================
    
    function getApiKey(provider) {
        var cacheKey = "apikey_" + provider;
        var now = Date.now();
        
        // Check cache
        if (apiKeyCache[cacheKey] && cacheTimestamps[cacheKey] &&
            (now - cacheTimestamps[cacheKey]) < config.apiCacheTimeout) {
            return apiKeyCache[cacheKey];
        }
        
        try {
            var apiLib = libByName(config.apiLibrary);
            if (!apiLib) return null;
            
            var keys = apiLib.find(config.provider, provider);
            if (keys && keys.length > 0) {
                var key = keys[0].field(config.apiKey);
                
                // Update cache
                apiKeyCache[cacheKey] = key;
                cacheTimestamps[cacheKey] = now;
                
                return key;
            }
            
            return null;
            
        } catch (error) {
            addError(entry(), error, "getApiKey");
            return null;
        }
    }
    
    function httpRequest(method, url, data, options) {
        options = options || {};
        var maxRetries = options.maxRetries || config.maxRetries;
        var attempt = 0;
        
        while (attempt < maxRetries) {
            try {
                var httpObj = http();
                
                // Set timeout
                if (options.timeout) {
                    httpObj.timeout(options.timeout);
                } else {
                    httpObj.timeout(config.httpTimeout);
                }
                
                // Set headers
                if (options.headers) {
                    httpObj.headers(options.headers);
                } else if (data) {
                    httpObj.headers({"Content-Type": "application/json"});
                }
                
                // Make request
                var response;
                var body = data ? JSON.stringify(data) : null;
                
                switch (method.toUpperCase()) {
                    case "GET":
                        response = httpObj.get(url);
                        break;
                    case "POST":
                        response = httpObj.post(url, body);
                        break;
                    case "PUT":
                        response = httpObj.put(url, body);
                        break;
                    case "DELETE":
                        response = httpObj.delete(url);
                        break;
                    default:
                        return { success: false, error: "Unsupported method: " + method };
                }
                
                // Parse response
                if (response.code >= 200 && response.code < 300) {
                    var responseData;
                    try {
                        responseData = JSON.parse(response.body);
                    } catch (e) {
                        responseData = response.body;
                    }
                    
                    return {
                        success: true,
                        data: responseData,
                        code: response.code
                    };
                } else if (response.code >= 500 && attempt < maxRetries - 1) {
                    // Server error - retry
                    attempt++;
                    
                    // Exponential backoff
                    var delay = Math.pow(2, attempt) * 1000;
                    var start = Date.now();
                    while (Date.now() - start < delay) {
                        // Busy wait
                    }
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
                attempt++;
                if (attempt >= maxRetries) {
                    return {
                        success: false,
                        error: error.toString(),
                        code: 0
                    };
                }
                
                // Simple exponential backoff
                var retryDelay = Math.pow(2, attempt) * 1000;
                var retryStart = Date.now();
                while (Date.now() - retryStart < retryDelay) {
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
    // AI INTEGRATION
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
            var messages = [];
            
            // System prompt
            if (options.systemPrompt) {
                messages.push({
                    role: "system",
                    content: options.systemPrompt
                });
            }
            
            // User prompt
            messages.push({
                role: "user",
                content: prompt
            });
            
            var payload = {
                model: options.model || providerConfig.defaultModel,
                messages: messages,
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 1000
            };
            
            // Provider specific adjustments
            if (provider === "OpenRouter") {
                payload.transforms = ["middle-out"];
                if (options.appName) {
                    providerConfig.headers = function(apiKey) {
                        return {
                            "Content-Type": "application/json",
                            "Authorization": "Bearer " + apiKey,
                            "HTTP-Referer": options.appUrl || "https://memento.database",
                            "X-Title": options.appName || "Memento AI Assistant"
                        };
                    };
                }
            }
            
            var result = httpRequest("POST", providerConfig.baseUrl, payload, {
                headers: providerConfig.headers(apiKey),
                timeout: options.timeout || 60000 // 60 seconds for AI
            });
            
            if (result.success && result.data) {
                var content = "";
                
                if (result.data.choices && result.data.choices.length > 0) {
                    content = result.data.choices[0].message.content;
                }
                
                return {
                    success: true,
                    content: content,
                    usage: result.data.usage || {},
                    model: result.data.model || payload.model
                };
            } else {
                return {
                    success: false,
                    error: result.error || "AI request failed"
                };
            }
            
        } catch (error) {
            addError(entry(), error, "callAI");
            return { success: false, error: error.toString() };
        }
    }
    
    // ==============================================
    // N8N INTEGRATION
    // ==============================================
    
    function getN8NConfig() {
        try {
            var defaults = getSettings(config.defaultsLibrary);
            if (!defaults) {
                return null;
            }
            
            var n8nConfig = {
                webhookUrl: defaults[config.n8nWebhookUrlField] || "",
                authType: defaults[config.n8nAuthTypeField] || "none",
                apiKey: defaults[config.n8nApiKeyField] || "",
                username: defaults[config.n8nUsernameField] || "",
                password: defaults[config.n8nPasswordField] || "",
                headerName: defaults[config.n8nHeaderNameField] || "X-API-Key"
            };
            
            // Validácia
            if (!n8nConfig.webhookUrl) {
                addError(entry(), "N8N Webhook URL not configured", "getN8NConfig");
                return null;
            }
            
            return n8nConfig;
            
        } catch (error) {
            addError(entry(), error, "getN8NConfig");
            return null;
        }
    }
    
    function callN8NWebhook(workflowData, options) {
        options = options || {};
        
        try {
            var n8nConfig = getN8NConfig();
            if (!n8nConfig) {
                return { 
                    success: false, 
                    error: "N8N configuration not found in " + config.defaultsLibrary 
                };
            }
            
            // Priprav headers
            var headers = {
                "Content-Type": "application/json"
            };
            
            // Pridaj autentifikáciu podľa typu
            switch (n8nConfig.authType) {
                case "basic":
                    if (n8nConfig.username && n8nConfig.password) {
                        var authString = n8nConfig.username + ":" + n8nConfig.password;
                        // Base64 encode pre Basic auth
                        headers["Authorization"] = "Basic " + base64Encode(authString);
                    }
                    break;
                    
                case "header":
                    if (n8nConfig.apiKey && n8nConfig.headerName) {
                        headers[n8nConfig.headerName] = n8nConfig.apiKey;
                    }
                    break;
                    
                case "apikey":
                    if (n8nConfig.apiKey) {
                        headers["X-API-Key"] = n8nConfig.apiKey;
                    }
                    break;
                    
                case "none":
                default:
                    // Žiadna autentifikácia
                    break;
            }
            
            // Pridaj custom headers ak sú
            if (options.headers) {
                for (var key in options.headers) {
                    headers[key] = options.headers[key];
                }
            }
            
            // Priprav payload
            var payload = {
                timestamp: moment().toISOString(),
                source: "MementoDatabase",
                library: lib().name(),
                entryId: entry().field("ID"),
                user: user().name(),
                data: workflowData
            };
            
            // Pridaj metadata ak sú
            if (options.metadata) {
                payload.metadata = options.metadata;
            }
            
            addDebug(entry(), "🔗 Calling N8N webhook: " + n8nConfig.webhookUrl.substring(0, 50) + "...");
            
            // Zavolaj webhook
            var result = httpRequest("POST", n8nConfig.webhookUrl, payload, {
                headers: headers,
                timeout: options.timeout || config.n8nTimeoutMs,
                maxRetries: options.maxRetries || config.n8nMaxRetries
            });
            
            if (result.success) {
                addInfo(entry(), "N8N webhook úspešne zavolaný", {
                    webhookUrl: n8nConfig.webhookUrl.substring(0, 50) + "...",
                    responseCode: result.code,
                    workflowId: result.data.workflowId || "N/A"
                });
                
                return {
                    success: true,
                    data: result.data,
                    code: result.code
                };
            } else {
                addError(entry(), "N8N webhook failed: " + result.error, "callN8NWebhook");
                return {
                    success: false,
                    error: result.error,
                    code: result.code
                };
            }
            
        } catch (error) {
            addError(entry(), error, "callN8NWebhook");
            return { 
                success: false, 
                error: error.toString() 
            };
        }
    }
    
    function triggerN8NWorkflow(workflowName, inputData, options) {
        options = options || {};
        
        try {
            var workflowData = {
                workflow: workflowName,
                trigger: "memento",
                input: inputData
            };
            
            // Pridaj execution options
            if (options.waitForCompletion) {
                workflowData.waitForCompletion = true;
                workflowData.timeout = options.completionTimeout || 60000;
            }
            
            if (options.testRun) {
                workflowData.testRun = true;
            }
            
            return callN8NWebhook(workflowData, {
                metadata: {
                    workflowName: workflowName,
                    triggered: moment().toISOString(),
                    options: options
                }
            });
            
        } catch (error) {
            addError(entry(), error, "triggerN8NWorkflow");
            return { 
                success: false, 
                error: error.toString() 
            };
        }
    }
    
    // Helper funkcia pre base64 encoding (jednoduchá implementácia)
    function base64Encode(str) {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        var encoded = '';
        var i = 0;
        
        while (i < str.length) {
            var a = str.charCodeAt(i++);
            var b = i < str.length ? str.charCodeAt(i++) : 0;
            var c = i < str.length ? str.charCodeAt(i++) : 0;
            
            var bitmap = (a << 16) | (b << 8) | c;
            
            encoded += chars.charAt((bitmap >> 18) & 63);
            encoded += chars.charAt((bitmap >> 12) & 63);
            encoded += i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=';
            encoded += i - 1 < str.length ? chars.charAt(bitmap & 63) : '=';
        }
        
        return encoded;
    }
    
    // ==============================================
    // BUSINESS LOGIC HELPERS
    // ==============================================
    
    function calculateWorkHours(startTime, endTime, breakMinutes) {
        try {
            if (!startTime || !endTime) return 0;
            
            var start = moment(startTime);
            var end = moment(endTime);
            
            if (!start.isValid() || !end.isValid()) return 0;
            
            // Handle overnight work
            if (end.isBefore(start)) {
                end.add(1, "day");
            }
            
            var diffMinutes = end.diff(start, "minutes");
            var workMinutes = diffMinutes - (breakMinutes || 0);
            
            return Math.max(0, workMinutes / 60);
            
        } catch (error) {
            addError(entry(), error, "calculateWorkHours");
            return 0;
        }
    }
    
    function getEmployeeDetails(employee, date) {
        try {
            if (!employee) return null;
            
            var details = {
                nick: safeGet(employee, "Nick", ""),
                meno: safeGet(employee, "Meno", ""),
                priezvisko: safeGet(employee, "Priezvisko", ""),
                fullName: formatEmployeeName(employee),
                telegramEnabled: safeGet(employee, "telegram", false),
                telegramId: safeGet(employee, "Telegram ID", ""),
                email: safeGet(employee, "Email", ""),
                telefon: safeGet(employee, "Telefón", ""),
                hodinovka: 0,
                dennaMzda: 0
            };
            
            // Získaj aktuálnu sadzbu pre daný dátum
            if (date) {
                var sadzbyLib = libByName("sadzby zamestnancov");
                if (sadzbyLib) {
                    var sadzby = employee.linksFrom("sadzby zamestnancov", "Zamestnanec");
                    var aktualnaSadzba = null;
                    var najnovsiDatum = null;
                    
                    for (var i = 0; i < sadzby.length; i++) {
                        var platnostOd = sadzby[i].field("Platnosť od");
                        if (platnostOd && moment(platnostOd).isSameOrBefore(moment(date))) {
                            if (!najnovsiDatum || moment(platnostOd).isAfter(moment(najnovsiDatum))) {
                                najnovsiDatum = platnostOd;
                                aktualnaSadzba = sadzby[i];
                            }
                        }
                    }
                    
                    if (aktualnaSadzba) {
                        details.hodinovka = safeGet(aktualnaSadzba, "Sadzba", 0);
                        details.dennaMzda = details.hodinovka * config.defaultWorkHoursPerDay;
                    }
                }
            }
            
            return details;
            
        } catch (error) {
            addError(entry(), error, "getEmployeeDetails");
            return null;
        }
    }
    
    function validateRequiredFields(entry, requiredFields) {
        try {
            var errors = [];
            
            for (var i = 0; i < requiredFields.length; i++) {
                var fieldName = requiredFields[i];
                var value = entry.field(fieldName);
                
                if (value === null || value === undefined || value === "") {
                    errors.push("Pole '" + fieldName + "' je povinné");
                }
            }
            
            return {
                valid: errors.length === 0,
                errors: errors
            };
            
        } catch (error) {
            addError(entry, error, "validateRequiredFields");
            return {
                valid: false,
                errors: ["Chyba validácie: " + error.toString()]
            };
        }
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
        
        // Data Management
        getSettings: getSettings,
        findEntryById: findEntryById,
        safeGet: safeGet,
        safeSet: safeSet,
        safeGetAttribute: safeGetAttribute,
        safeSetAttribute: safeSetAttribute,
        safeGetLinks: safeGetLinks,
        
        // Telegram Integration
        sendTelegramMessage: sendTelegramMessage,
        deleteTelegramMessage: deleteTelegramMessage,
        
        // N8N Integration
        callN8NWebhook: callN8NWebhook,
        triggerN8NWorkflow: triggerN8NWorkflow,
        getN8NConfig: getN8NConfig,
        
        // Notifications
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
        includeStackTrace: config.includeStackTrace,
        
        // Utility functions for field access
        safeFieldAccess: safeGet  // Alias for compatibility
    };
})();

// Pre kompatibilitu s require() - ak Memento podporuje
//if (typeof module !== 'undefined' && module.exports) {
//    module.exports = MementoUtils;
//}
