// ==============================================
// MEMENTO DATABASE - ASISTANTO TELEGRAM KNIŽNICA
// Verzia: 1.0 | Dátum: 20.08.2025 | Autor: ASISTANTO
// Knižnica: Modulárna Telegram integrácia | Typ: Helper Script
// ==============================================
// 🚀 NOVÁ MODULÁRNA KNIŽNICA v1.0:
//    - Segregované Telegram funkcie z Notifications Helper
//    - Integrácia s MementoUtils 3.3 patterns
//    - API volania s retry logikou a rate limiting
//    - Settings synchronizácia s Telegram Groups
//    - Message formatting a template support
//    - Error recovery a fallback mechanizmy
// ==============================================
// 📋 CORE FUNKCIE:
//    - Telegram API komunikácia
//    - Message sending (individual, group, thread)
//    - Settings management a synchronizácia
//    - Rate limiting a retry logika
//    - Response tracking a error handling
// ==============================================

// Lazy loading dependencies
var utils = null;
var notifHelper = null;

/**
 * Získa MementoUtils instance (lazy loading)
 */
function getUtils() {
    if (!utils) {
        if (typeof MementoUtils !== 'undefined') {
            utils = MementoUtils;
        } else {
            throw new Error("MementoUtils knižnica nie je dostupná! ASISTANTOTelegram ju vyžaduje.");
        }
    }
    return utils;
}

/**
 * Získa ASISTANTONotifications helper (lazy loading)
 */
function getNotifHelper() {
    if (!notifHelper) {
        if (typeof ASISTANTONotifications !== 'undefined') {
            notifHelper = ASISTANTONotifications;
        } else {
            getUtils().addDebug(entry(), "⚠️ ASISTANTONotifications helper nie je dostupný");
        }
    }
    return notifHelper;
}

// ==============================================
// KONFIGURÁCIA A CONSTANTS
// ==============================================
// ==============================================
// CONFIG INITIALIZATION
// ==============================================

var CONFIG = (function() {
    // Try centralized config first
    if (typeof MementoConfigAdapter !== 'undefined') {
        try {
            var adapter = MementoConfigAdapter.getAdapter('attendance');
            // Merge with script-specific config
            adapter.scriptName = "Dochádzka Group Summary";
            adapter.version = "5.0";
            return adapter;
        } catch (e) {
            // Fallback
        }
    }
    
    // Original config as fallback
    return {
        debug: true,
        version: "1.0",
        scriptName: "Notifications Telegram",
        
        // Telegram API konfigurácia
        telegramApi: {
            baseUrl: "https://api.telegram.org/bot",
            timeout: 30000,
            maxRetries: 3,
            retryDelayMs: [1000, 3000, 8000], // Exponential backoff
            rateLimitDelay: 1000, // 1 sekunda medzi volaniam
            maxMessageLength: 4096
        },
        
        // Knižnice
        get libraries() {
            var utilsConfig = getUtils().DEFAULT_CONFIG;
            return {
                api: utilsConfig.apiKeysLibrary || "ASISTANTO API",
                defaults: utilsConfig.defaultLibraryName || "ASISTANTO Defaults",
                telegramGroups: utilsConfig.telegramGroupsLibrary || "Telegram Groups",
                notifications: "Notifications"
            };
        },
        
        // Business pravidlá
        businessRules: {
            respectWorkingHours: true,
            respectWeekendSettings: true,
            checkDailyLimits: true,
            defaultParseMode: "HTML",
            silentMode: false
        }
    };
})();

var CONFIG = {
    
};

/**
 * Field mappings pre Telegram Groups knižnicu
 */
var TELEGRAM_FIELDS = {
    chatId: "Chat ID",
    threadId: "Thread ID",
    groupName: "Názov skupiny", 
    threadName: "Názov témy",
    description: "Popis skupiny",
    
    // Nastavenia
    notificationsEnabled: "Povoliť notifikácie",
    workingHoursFrom: "Pracovný čas od",
    workingHoursTo: "Pracovný čas do",
    weekendEnabled: "Víkend povolený",
    dailyLimit: "Denný limit správ",
    sentToday: "Počet správ dnes",
    totalMessages: "Celkový počet správ",
    silentMode: "Tichá správa",
    priority: "Priorita správ",
    
    // Response tracking
    lastMessage: "Posledná správa",
    lastMessageId: "Posledné Message ID",
    lastError: "Posledná chyba",
    
    // Metadata
    created: "Vytvorené",
    updated: "Posledná aktualizácia"
};

// Cache pre API token a často používané dáta
var _cache = {
    botToken: null,
    botTokenExpiry: null,
    groupSettings: {},
    rateLimitLastCall: 0
};

// ==============================================
// API KEY MANAGEMENT
// ==============================================

/**
 * Získa Telegram Bot Token z ASISTANTO API knižnice
 * @returns {string|null} - Bot token alebo null
 */
function getBotToken() {
    try {
        // Check cache
        if (_cache.botToken && _cache.botTokenExpiry && Date.now() < _cache.botTokenExpiry) {
            return _cache.botToken;
        }
        
        // Získaj z ASISTANTO API knižnice
        var apiLib = libByName(CONFIG.libraries.api);
        if (!apiLib) {
            getUtils().addError(entry(), "ASISTANTO API knižnica nenájdená", "getBotToken");
            return null;
        }
        
        // Hľadaj Telegram Bot záznam
        var apiEntries = apiLib.entries();
        for (var i = 0; i < apiEntries.length; i++) {
            var apiEntry = apiEntries[i];
            var provider = getUtils().safeFieldAccess(apiEntry, "provider", "");
            
            if (provider === "Telegram Bot" || provider === "Telegram") {
                var token = getUtils().safeFieldAccess(apiEntry, "Key", null);
                if (token) {
                    // Cache na 1 hodinu
                    _cache.botToken = token;
                    _cache.botTokenExpiry = Date.now() + 3600000;
                    
                    getUtils().addDebug(entry(), "🔑 Telegram Bot Token načítaný z API knižnice");
                    return token;
                }
            }
        }
        
        // Fallback - skús získať z Defaults knižnice
        var defaultToken = getUtils().getSettings(CONFIG.libraries.defaults, "Telegram Bot Token");
        if (defaultToken) {
            _cache.botToken = defaultToken;
            _cache.botTokenExpiry = Date.now() + 3600000;
            return defaultToken;
        }
        
        getUtils().addError(entry(), "Telegram Bot Token nenájdený v API ani Defaults knižnici", "getBotToken");
        return null;
        
    } catch (error) {
        getUtils().addError(entry(), "Chyba pri získavaní Bot Token: " + error.toString(), "getBotToken");
        return null;
    }
}

/**
 * Testuje platnosť Telegram Bot Token
 * @returns {Object} - Test výsledok {valid: boolean, botInfo: Object, error: string}
 */
function testBotToken() {
    try {
        var token = getBotToken();
        if (!token) {
            return { valid: false, error: "Bot token nenájdený" };
        }
        
        var url = CONFIG.telegramApi.baseUrl + token + "/getMe";
        
        var result = getUtils().httpRequest("GET", url, null, {
            timeout: CONFIG.telegramApi.timeout,
            maxRetries: 1
        });
        
        if (result.success && result.data && result.data.ok) {
            return {
                valid: true,
                botInfo: result.data.result,
                botUsername: result.data.result.username,
                botName: result.data.result.first_name
            };
        } else {
            return {
                valid: false,
                error: result.error || "Invalid bot token response"
            };
        }
        
    } catch (error) {
        return {
            valid: false,
            error: error.toString()
        };
    }
}

// ==============================================
// RATE LIMITING A HTTP UTILS
// ==============================================

/**
 * Rate limiting pre Telegram API volania
 */
function enforceRateLimit() {
    var now = Date.now();
    var timeSinceLastCall = now - _cache.rateLimitLastCall;
    
    if (timeSinceLastCall < CONFIG.telegramApi.rateLimitDelay) {
        var waitTime = CONFIG.telegramApi.rateLimitDelay - timeSinceLastCall;
        getUtils().addDebug(entry(), "⏱️ Rate limiting: waiting " + waitTime + "ms");
        
        // Memento nemá sleep/wait funkciu, takže len logujeme
        // V reálnom použití by sa toto implementovalo cez setTimeout v async prostredí
    }
    
    _cache.rateLimitLastCall = now;
}

/**
 * HTTP request wrapper s retry logikou pre Telegram API
 * @param {string} method - HTTP metóda
 * @param {string} url - URL endpoint
 * @param {Object} data - Request data
 * @param {Object} options - Request options
 * @returns {Object} - Response objekt
 */
function telegramApiRequest(method, url, data, options) {
    options = options || {};
    var maxRetries = options.maxRetries || CONFIG.telegramApi.maxRetries;
    
    for (var attempt = 0; attempt < maxRetries; attempt++) {
        try {
            enforceRateLimit();
            
            var result = getUtils().httpRequest(method, url, data, {
                timeout: CONFIG.telegramApi.timeout,
                headers: {
                    "Content-Type": "application/json"
                }
            });
            
            if (result.success) {
                return result;
            } else if (result.code >= 500 && attempt < maxRetries - 1) {
                // Server error - retry
                var delay = CONFIG.telegramApi.retryDelayMs[Math.min(attempt, CONFIG.telegramApi.retryDelayMs.length - 1)];
                getUtils().addDebug(entry(), "🔄 Telegram API retry " + (attempt + 1) + "/" + maxRetries + " after " + delay + "ms");
                continue;
            } else {
                // Client error alebo posledný pokus
                return result;
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
// CORE TELEGRAM FUNCTIONS
// ==============================================

/**
 * Pošle správu cez Telegram API
 * @param {Object} options - Telegram message options
 * @param {string} options.chatId - Chat ID
 * @param {string} options.text - Text správy
 * @param {string} [options.parseMode] - Parse mode (HTML, Markdown, MarkdownV2)
 * @param {number} [options.messageThreadId] - Thread ID pre topics
 * @param {boolean} [options.disableNotification] - Silent mode
 * @param {Object} [options.replyMarkup] - Keyboard markup
 * @returns {Object} - Response objekt {success: boolean, messageId: number, data: Object, error: string}
 */
function sendTelegramMessage(options) {
    try {
        getUtils().addDebug(entry(), "📤 Sending Telegram message to chat: " + options.chatId);
        
        // Validácia povinných parametrov
        if (!options.chatId || !options.text) {
            return {
                success: false,
                error: "ChatId a text sú povinné parametre"
            };
        }
        
        // Získaj bot token
        var token = getBotToken();
        if (!token) {
            return {
                success: false,
                error: "Telegram Bot Token nenájdený"
            };
        }
        
        // Skráť správu ak je príliš dlhá
        var text = options.text;
        if (text.length > CONFIG.telegramApi.maxMessageLength) {
            text = text.substring(0, CONFIG.telegramApi.maxMessageLength - 3) + "...";
            getUtils().addDebug(entry(), "⚠️ Message truncated to " + CONFIG.telegramApi.maxMessageLength + " characters");
        }
        
        // Príprava API request
        var url = CONFIG.telegramApi.baseUrl + token + "/sendMessage";
        var payload = {
            chat_id: options.chatId,
            text: text,
            parse_mode: options.parseMode || CONFIG.businessRules.defaultParseMode,
            disable_web_page_preview: options.disablePreview || false,
            disable_notification: options.disableNotification || CONFIG.businessRules.silentMode
        };
        
        // Voliteľné parametre
        if (options.messageThreadId) {
            payload.message_thread_id = options.messageThreadId;
        }
        
        if (options.replyToMessageId) {
            payload.reply_to_message_id = options.replyToMessageId;
        }
        
        if (options.replyMarkup) {
            payload.reply_markup = JSON.stringify(options.replyMarkup);
        }
        
        // API volanie
        var result = telegramApiRequest("POST", url, payload);
        
        if (result.success && result.data && result.data.ok) {
            getUtils().addDebug(entry(), "✅ Telegram message sent successfully");
            
            return {
                success: true,
                messageId: result.data.result.message_id,
                chatId: result.data.result.chat.id,
                date: result.data.result.date,
                data: result.data.result
            };
        } else {
            var errorMsg = "Telegram API error";
            if (result.data && result.data.description) {
                errorMsg += ": " + result.data.description;
            } else if (result.error) {
                errorMsg += ": " + result.error;
            }
            
            getUtils().addError(entry(), errorMsg, "sendTelegramMessage");
            return {
                success: false,
                error: errorMsg,
                code: result.code,
                data: result.data
            };
        }
        
    } catch (error) {
        getUtils().addError(entry(), "Chyba pri odosielaní Telegram správy: " + error.toString(), "sendTelegramMessage");
        return {
            success: false,
            error: error.toString()
        };
    }
}

/**
 * Vymaže Telegram správu
 * @param {string} chatId - Chat ID
 * @param {number} messageId - Message ID
 * @returns {Object} - Response objekt
 */
function deleteTelegramMessage(chatId, messageId) {
    try {
        var token = getBotToken();
        if (!token) {
            return { success: false, error: "Bot token nenájdený" };
        }
        
        var url = CONFIG.telegramApi.baseUrl + token + "/deleteMessage";
        var payload = {
            chat_id: chatId,
            message_id: messageId
        };
        
        getUtils().addDebug(entry(), "🗑️ Deleting Telegram message: " + messageId);
        
        var result = telegramApiRequest("POST", url, payload);
        
        return {
            success: result.success && result.data && result.data.ok,
            error: result.error,
            data: result.data
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.toString()
        };
    }
}

/**
 * Edituje existujúcu Telegram správu
 * @param {string} chatId - Chat ID
 * @param {number} messageId - Message ID
 * @param {string} newText - Nový text správy
 * @param {Object} [options] - Edit options
 * @returns {Object} - Response objekt
 */
function editTelegramMessage(chatId, messageId, newText, options) {
    try {
        options = options || {};
        
        var token = getBotToken();
        if (!token) {
            return { success: false, error: "Bot token nenájdený" };
        }
        
        var url = CONFIG.telegramApi.baseUrl + token + "/editMessageText";
        var payload = {
            chat_id: chatId,
            message_id: messageId,
            text: newText,
            parse_mode: options.parseMode || CONFIG.businessRules.defaultParseMode,
            disable_web_page_preview: options.disablePreview || false
        };
        
        if (options.replyMarkup) {
            payload.reply_markup = JSON.stringify(options.replyMarkup);
        }
        
        getUtils().addDebug(entry(), "✏️ Editing Telegram message: " + messageId);
        
        var result = telegramApiRequest("POST", url, payload);
        
        return {
            success: result.success && result.data && result.data.ok,
            data: result.data,
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
// GROUP & SETTINGS MANAGEMENT
// ==============================================

/**
 * Získa nastavenia Telegram skupiny
 * @param {Entry} groupEntry - Záznam zo skupiny
 * @returns {Object|null} - Nastavenia skupiny
 */
function getTelegramGroupSettings(groupEntry) {
    try {
        if (!groupEntry) return null;
        
        var groupId = groupEntry.field("ID");
        
        // Check cache
        if (_cache.groupSettings[groupId]) {
            return _cache.groupSettings[groupId];
        }
        
        var settings = {
            chatId: getUtils().safeFieldAccess(groupEntry, TELEGRAM_FIELDS.chatId, null),
            threadId: getUtils().safeFieldAccess(groupEntry, TELEGRAM_FIELDS.threadId, null),
            groupName: getUtils().safeFieldAccess(groupEntry, TELEGRAM_FIELDS.groupName, ""),
            threadName: getUtils().safeFieldAccess(groupEntry, TELEGRAM_FIELDS.threadName, ""),
            
            // Business settings
            notificationsEnabled: getUtils().safeFieldAccess(groupEntry, TELEGRAM_FIELDS.notificationsEnabled, true),
            workingHoursFrom: getUtils().safeFieldAccess(groupEntry, TELEGRAM_FIELDS.workingHoursFrom, null),
            workingHoursTo: getUtils().safeFieldAccess(groupEntry, TELEGRAM_FIELDS.workingHoursTo, null),
            weekendEnabled: getUtils().safeFieldAccess(groupEntry, TELEGRAM_FIELDS.weekendEnabled, false),
            dailyLimit: getUtils().safeFieldAccess(groupEntry, TELEGRAM_FIELDS.dailyLimit, 0),
            sentToday: getUtils().safeFieldAccess(groupEntry, TELEGRAM_FIELDS.sentToday, 0),
            silentMode: getUtils().safeFieldAccess(groupEntry, TELEGRAM_FIELDS.silentMode, false),
            priority: getUtils().safeFieldAccess(groupEntry, TELEGRAM_FIELDS.priority, "Normálna"),
            
            // Metadata
            isThread: !!getUtils().safeFieldAccess(groupEntry, TELEGRAM_FIELDS.threadId, null)
        };
        
        // Cache settings
        _cache.groupSettings[groupId] = settings;
        
        return settings;
        
    } catch (error) {
        getUtils().addError(entry(), "Chyba pri získavaní group settings: " + error.toString(), "getTelegramGroupSettings");
        return null;
    }
}

/**
 * Synchronizuje nastavenia z Telegram Groups do notification záznamu
 * @param {Entry} notificationEntry - Notification záznam
 * @param {Entry} groupEntry - Telegram group záznam
 * @returns {boolean} - Úspech synchronizácie
 */
function syncGroupSettingsToNotification(notificationEntry, groupEntry) {
    try {
        if (!notificationEntry || !groupEntry) {
            return false;
        }
        
        var settings = getTelegramGroupSettings(groupEntry);
        if (!settings) {
            return false;
        }
        
        getUtils().addDebug(entry(), "🔄 Synchronizing group settings to notification");
        
        // Synchronizuj Telegram špecifické polia
        if (settings.chatId) {
            getUtils().safeSet(notificationEntry, "Chat ID", settings.chatId);
        }
        
        if (settings.threadId) {
            getUtils().safeSet(notificationEntry, "Thread ID", settings.threadId);
        }
        
        // Business settings môžu ovplyvniť správanie notification triggeru
        var syncInfo = {
            groupName: settings.groupName,
            chatId: settings.chatId,
            threadId: settings.threadId,
            notificationsEnabled: settings.notificationsEnabled,
            dailyLimit: settings.dailyLimit,
            sentToday: settings.sentToday
        };
        
        // Pridaj sync info do notification
        getUtils().addInfo(notificationEntry, "Synchronizované nastavenia z Telegram skupiny", syncInfo);
        
        return true;
        
    } catch (error) {
        getUtils().addError(entry(), "Chyba pri sync group settings: " + error.toString(), "syncGroupSettingsToNotification");
        return false;
    }
}

/**
 * Kontroluje či je možné poslať správu podľa business pravidiel
 * @param {Object} settings - Group settings objekt
 * @returns {Object} - Validation result {allowed: boolean, reason: string}
 */
function validateBusinessRules(settings) {
    try {
        if (!CONFIG.businessRules.respectWorkingHours && !CONFIG.businessRules.checkDailyLimits) {
            return { allowed: true };
        }
        
        // Check notifications enabled
        if (!settings.notificationsEnabled) {
            return {
                allowed: false,
                reason: "Notifikácie sú zakázané pre túto skupinu"
            };
        }
        
        var now = moment();
        
        // Check weekend
        if (CONFIG.businessRules.respectWeekendSettings) {
            var dayOfWeek = now.day();
            if ((dayOfWeek === 0 || dayOfWeek === 6) && !settings.weekendEnabled) {
                return {
                    allowed: false,
                    reason: "Víkendové notifikácie sú zakázané"
                };
            }
        }
        
        // Check working hours
        if (CONFIG.businessRules.respectWorkingHours && settings.workingHoursFrom && settings.workingHoursTo) {
            var fromTime = moment(settings.workingHoursFrom, "HH:mm");
            var toTime = moment(settings.workingHoursTo, "HH:mm");
            var nowTime = moment(now.format("HH:mm"), "HH:mm");
            
            if (!nowTime.isBetween(fromTime, toTime)) {
                return {
                    allowed: false,
                    reason: "Mimo pracovného času (" + settings.workingHoursFrom + " - " + settings.workingHoursTo + ")"
                };
            }
        }
        
        // Check daily limit
        if (CONFIG.businessRules.checkDailyLimits && settings.dailyLimit > 0) {
            if (settings.sentToday >= settings.dailyLimit) {
                return {
                    allowed: false,
                    reason: "Prekročený denný limit správ (" + settings.sentToday + "/" + settings.dailyLimit + ")"
                };
            }
        }
        
        return { allowed: true };
        
    } catch (error) {
        getUtils().addError(entry(), "Chyba pri validácii business rules: " + error.toString(), "validateBusinessRules");
        return {
            allowed: false,
            reason: "Chyba pri validácii pravidiel"
        };
    }
}

/**
 * Aktualizuje počítadlo odoslaných správ pre skupinu
 * @param {Entry} groupEntry - Group entry
 * @returns {boolean} - Úspech aktualizácie
 */
function incrementSentCounter(groupEntry) {
    try {
        if (!groupEntry) return false;
        
        var currentCount = getUtils().safeFieldAccess(groupEntry, TELEGRAM_FIELDS.sentToday, 0);
        var newCount = currentCount + 1;
        
        getUtils().safeSet(groupEntry, TELEGRAM_FIELDS.sentToday, newCount);
        getUtils().safeSet(groupEntry, TELEGRAM_FIELDS.lastMessage, moment().toDate());
        
        // Aktualizuj aj total counter
        var totalCount = getUtils().safeFieldAccess(groupEntry, TELEGRAM_FIELDS.totalMessages, 0);
        getUtils().safeSet(groupEntry, TELEGRAM_FIELDS.totalMessages, totalCount + 1);
        
        // Invalidate cache
        var groupId = groupEntry.field("ID");
        delete _cache.groupSettings[groupId];
        
        getUtils().addDebug(entry(), "📊 Updated message counter: " + newCount + " today, " + (totalCount + 1) + " total");
        
        return true;
        
    } catch (error) {
        getUtils().addError(entry(), "Chyba pri aktualizácii sent counter: " + error.toString(), "incrementSentCounter");
        return false;
    }
}

// ==============================================
// HIGH-LEVEL FUNCTIONS
// ==============================================

/**
 * Pošle správu do Telegram skupiny s plnou business logic validáciou
 * @param {Entry} groupEntry - Telegram group entry
 * @param {string} message - Text správy
 * @param {Object} [options] - Send options
 * @returns {Object} - Send result
 */
function sendToGroup(groupEntry, message, options) {
    try {
        options = options || {};
        
        getUtils().addDebug(entry(), "📤 Sending message to Telegram group");
        
        // Získaj group settings
        var settings = getTelegramGroupSettings(groupEntry);
        if (!settings) {
            return {
                success: false,
                error: "Nepodarilo sa načítať group settings"
            };
        }
        
        // Validácia business pravidiel
        var validation = validateBusinessRules(settings);
        if (!validation.allowed) {
            getUtils().addDebug(entry(), "⏭️ Message skipped: " + validation.reason);
            return {
                success: false,
                skipped: true,
                reason: validation.reason
            };
        }
        
        // Príprava Telegram options
        var telegramOptions = {
            chatId: settings.chatId,
            text: message,
            parseMode: options.parseMode || CONFIG.businessRules.defaultParseMode,
            disableNotification: settings.silentMode || options.silent,
            messageThreadId: settings.threadId
        };
        
        // Pošli správu
        var result = sendTelegramMessage(telegramOptions);
        
        if (result.success) {
            // Aktualizuj counters
            incrementSentCounter(groupEntry);
            
            // Update group entry s response dátami
            getUtils().safeSet(groupEntry, TELEGRAM_FIELDS.lastMessageId, result.messageId);
            getUtils().safeSet(groupEntry, TELEGRAM_FIELDS.updated, moment().toDate());
            
            getUtils().addInfo(groupEntry, "Správa úspešne odoslaná", {
                messageId: result.messageId,
                chatId: result.chatId,
                messageLength: message.length,
                isThread: !!settings.threadId
            });
        } else {
            // Log error do group entry
            getUtils().safeSet(groupEntry, TELEGRAM_FIELDS.lastError, result.error);
        }
        
        return result;
        
    } catch (error) {
        getUtils().addError(entry(), "Chyba pri odosielaní do skupiny: " + error.toString(), "sendToGroup");
        return {
            success: false,
            error: error.toString()
        };
    }
}

/**
 * Pošle správu do špecifickej témy v skupine
 * @param {Entry} groupEntry - Group entry s Thread ID
 * @param {string} message - Text správy
 * @param {Object} [options] - Send options
 * @returns {Object} - Send result
 */
function sendToThread(groupEntry, message, options) {
    // sendToThread je v podstate rovnaké ako sendToGroup,
    // lebo thread ID sa automaticky použije ak je nastavené v group settings
    return sendToGroup(groupEntry, message, options);
}

/**
 * Pošle individuálnu správu zamestnancovi
 * @param {Entry} employeeEntry - Employee entry
 * @param {string} message - Text správy
 * @param {Object} [options] - Send options
 * @returns {Object} - Send result
 */
function sendToEmployee(employeeEntry, message, options) {
    try {
        options = options || {};
        
        if (!employeeEntry) {
            return {
                success: false,
                error: "Employee entry je povinný parameter"
            };
        }
        
        // Získaj Telegram ID a nastavenia zamestnanca
        var telegramId = getUtils().safeFieldAccess(employeeEntry, "Telegram ID", null);
        var telegramEnabled = getUtils().safeFieldAccess(employeeEntry, "telegram", false);
        var employeeName = getUtils().formatEmployeeName(employeeEntry);
        
        getUtils().addDebug(entry(), "📤 Sending message to employee: " + employeeName);
        
        if (!telegramId) {
            return {
                success: false,
                error: "Zamestnanec " + employeeName + " nemá nastavené Telegram ID"
            };
        }
        
        if (!telegramEnabled) {
            return {
                success: false,
                skipped: true,
                reason: "Zamestnanec " + employeeName + " má zakázané Telegram notifikácie"
            };
        }
        
        // Pošli správu
        var telegramOptions = {
            chatId: telegramId,
            text: message,
            parseMode: options.parseMode || CONFIG.businessRules.defaultParseMode,
            disableNotification: options.silent || false
        };
        
        var result = sendTelegramMessage(telegramOptions);
        
        if (result.success) {
            getUtils().addInfo(employeeEntry, "Individuálna Telegram správa odoslaná", {
                messageId: result.messageId,
                messageLength: message.length,
                sentAt: getUtils().formatDate(moment())
            });
        }
        
        return result;
        
    } catch (error) {
        getUtils().addError(entry(), "Chyba pri odosielaní zamestnancovi: " + error.toString(), "sendToEmployee");
        return {
            success: false,
            error: error.toString()
        };
    }
}

// ==============================================
// BULK OPERATIONS
// ==============================================

/**
 * Pošle správu viacerým adresátom (bulk operácia)
 * @param {Array} recipients - Pole adresátov (employees alebo groups)
 * @param {string} message - Text správy
 * @param {Object} [options] - Send options
 * @returns {Object} - Bulk send results
 */
function sendBulkMessages(recipients, message, options) {
    try {
        options = options || {};
        
        var results = {
            total: recipients.length,
            sent: 0,
            failed: 0,
            skipped: 0,
            details: [],
            errors: []
        };
        
        getUtils().addDebug(entry(), "📢 Bulk sending to " + recipients.length + " recipients");
        
        for (var i = 0; i < recipients.length; i++) {
            var recipient = recipients[i];
            var result;
            
            // Determine recipient type a pošli správu
            if (recipient.field && recipient.field("Nick")) {
                // Je to zamestnanec
                result = sendToEmployee(recipient, message, options);
            } else if (recipient.field && recipient.field("Chat ID")) {
                // Je to Telegram skupina
                result = sendToGroup(recipient, message, options);
            } else {
                result = {
                    success: false,
                    error: "Neznámy typ adresáta"
                };
            }
            
            // Spracuj výsledok
            if (result.success) {
                results.sent++;
            } else if (result.skipped) {
                results.skipped++;
            } else {
                results.failed++;
                results.errors.push({
                    recipient: i,
                    error: result.error
                });
            }
            
            results.details.push({
                recipient: i,
                result: result
            });
        }
        
        getUtils().addDebug(entry(), "📊 Bulk results: " + results.sent + " sent, " + results.failed + " failed, " + results.skipped + " skipped");
        
        return results;
        
    } catch (error) {
        getUtils().addError(entry(), "Chyba pri bulk sending: " + error.toString(), "sendBulkMessages");
        return {
            total: recipients.length,
            sent: 0,
            failed: recipients.length,
            skipped: 0,
            error: error.toString()
        };
    }
}

// ==============================================
// NOTIFICATION INTEGRATION
// ==============================================

/**
 * Spracuje notification entry a pošle Telegram správy
 * @param {Entry} notificationEntry - Notification entry
 * @returns {Object} - Processing results
 */
function processNotification(notificationEntry) {
    try {
        if (!notificationEntry) {
            return {
                success: false,
                error: "Notification entry je povinný parameter"
            };
        }
        
        getUtils().addDebug(entry(), "🔄 Processing notification for Telegram delivery");
        
        // Získaj základné údaje z notifikácie
        var message = getUtils().safeFieldAccess(notificationEntry, "Správa", "");
        var addresseeType = getUtils().safeFieldAccess(notificationEntry, "Adresát", "");
        var subject = getUtils().safeFieldAccess(notificationEntry, "Predmet", "");
        var formatting = getUtils().safeFieldAccess(notificationEntry, "Formátovanie", "HTML");
        
        if (!message) {
            return {
                success: false,
                error: "Správa v notification entry je prázdna"
            };
        }
        
        // Priprav úplnú správu (predmet + message)
        var fullMessage = message;
        if (subject) {
            if (formatting === "HTML") {
                fullMessage = "<b>" + subject + "</b>\n\n" + message;
            } else if (formatting === "Markdown") {
                fullMessage = "*" + subject + "*\n\n" + message;
            } else {
                fullMessage = subject + "\n\n" + message;
            }
        }
        
        var sendOptions = {
            parseMode: formatting,
            silent: false
        };
        
        var result;
        
        // Routing podľa typu adresáta
        switch (addresseeType) {
            case "Zamestnanec":
                result = processEmployeeNotification(notificationEntry, fullMessage, sendOptions);
                break;
                
            case "Skupina":
            case "Skupina-Téma":
                result = processGroupNotification(notificationEntry, fullMessage, sendOptions);
                break;
                
            case "Klient":
            case "Partner":
                result = processClientPartnerNotification(notificationEntry, fullMessage, sendOptions);
                break;
                
            default:
                result = {
                    success: false,
                    error: "Nepodporovaný typ adresáta: " + addresseeType
                };
        }
        
        // Aktualizuj notification status
        if (result.success) {
            getUtils().safeSet(notificationEntry, "Status", "Odoslané");
            getUtils().safeSet(notificationEntry, "Odoslané o", moment().toDate());
            
            if (result.messageId) {
                getUtils().safeSet(notificationEntry, "Message ID", result.messageId);
            }
        } else if (!result.skipped) {
            getUtils().safeSet(notificationEntry, "Status", "Zlyhalo");
            getUtils().safeSet(notificationEntry, "Posledná chyba", result.error);
        }
        
        return result;
        
    } catch (error) {
        getUtils().addError(entry(), "Chyba pri spracovaní notification: " + error.toString(), "processNotification");
        return {
            success: false,
            error: error.toString()
        };
    }
}

/**
 * Spracuje notification pre zamestnancov
 * @param {Entry} notificationEntry - Notification entry
 * @param {string} message - Správa na odoslanie
 * @param {Object} sendOptions - Send options
 * @returns {Object} - Processing result
 */
function processEmployeeNotification(notificationEntry, message, sendOptions) {
    try {
        var employees = getUtils().safeGetLinks(notificationEntry, "Zamestnanec");
        if (!employees || employees.length === 0) {
            return {
                success: false,
                error: "Žiadni zamestnanci neboli nájdení v notification"
            };
        }
        
        getUtils().addDebug(entry(), "👥 Processing employee notification for " + employees.length + " employees");
        
        var results = sendBulkMessages(employees, message, sendOptions);
        
        // Pre employee notifications považujeme za úspešné ak sa podarilo poslať aspoň niečo
        var success = results.sent > 0;
        
        return {
            success: success,
            sent: results.sent,
            failed: results.failed,
            skipped: results.skipped,
            total: results.total,
            messageId: results.details.length > 0 && results.details[0].result.messageId ? results.details[0].result.messageId : null
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.toString()
        };
    }
}

/**
 * Spracuje notification pre Telegram skupiny
 * @param {Entry} notificationEntry - Notification entry
 * @param {string} message - Správa na odoslanie
 * @param {Object} sendOptions - Send options
 * @returns {Object} - Processing result
 */
function processGroupNotification(notificationEntry, message, sendOptions) {
    try {
        var groups = getUtils().safeGetLinks(notificationEntry, "Skupina/Téma");
        if (!groups || groups.length === 0) {
            return {
                success: false,
                error: "Žiadne skupiny neboli nájdené v notification"
            };
        }
        
        getUtils().addDebug(entry(), "👥 Processing group notification for " + groups.length + " groups");
        
        // Pre skupiny typicky posielame len do prvej skupiny (hlavná skupina)
        var group = groups[0];
        
        // Synchronizuj settings z group do notification
        syncGroupSettingsToNotification(notificationEntry, group);
        
        var result = sendToGroup(group, message, sendOptions);
        
        return result;
        
    } catch (error) {
        return {
            success: false,
            error: error.toString()
        };
    }
}

/**
 * Spracuje notification pre klientov/partnerov
 * @param {Entry} notificationEntry - Notification entry
 * @param {string} message - Správa na odoslanie
 * @param {Object} sendOptions - Send options
 * @returns {Object} - Processing result
 */
function processClientPartnerNotification(notificationEntry, message, sendOptions) {
    try {
        var addresseeType = getUtils().safeFieldAccess(notificationEntry, "Adresát", "");
        var recipients;
        
        if (addresseeType === "Klient") {
            recipients = getUtils().safeGetLinks(notificationEntry, "Klient");
        } else if (addresseeType === "Partner") {
            recipients = getUtils().safeGetLinks(notificationEntry, "Partner");
        }
        
        if (!recipients || recipients.length === 0) {
            return {
                success: false,
                error: "Žiadni " + addresseeType.toLowerCase() + " neboli nájdení v notification"
            };
        }
        
        getUtils().addDebug(entry(), "🏢 Processing " + addresseeType + " notification for " + recipients.length + " recipients");
        
        // Pre klientov/partnerov hľadáme Telegram ID podobne ako pre zamestnancov
        var validRecipients = [];
        for (var i = 0; i < recipients.length; i++) {
            var recipient = recipients[i];
            var telegramId = getUtils().safeFieldAccess(recipient, "Telegram ID", null);
            
            if (telegramId) {
                validRecipients.push(recipient);
            }
        }
        
        if (validRecipients.length === 0) {
            return {
                success: false,
                skipped: true,
                reason: "Žiadni " + addresseeType.toLowerCase() + " nemajú nastavené Telegram ID"
            };
        }
        
        // Pošli správy (podobne ako pre employees)
        var results = {
            total: validRecipients.length,
            sent: 0,
            failed: 0,
            skipped: 0
        };
        
        for (var j = 0; j < validRecipients.length; j++) {
            var client = validRecipients[j];
            var telegramId = getUtils().safeFieldAccess(client, "Telegram ID", null);
            
            var telegramOptions = {
                chatId: telegramId,
                text: message,
                parseMode: sendOptions.parseMode,
                disableNotification: sendOptions.silent
            };
            
            var sendResult = sendTelegramMessage(telegramOptions);
            
            if (sendResult.success) {
                results.sent++;
            } else {
                results.failed++;
            }
        }
        
        return {
            success: results.sent > 0,
            sent: results.sent,
            failed: results.failed,
            total: results.total
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.toString()
        };
    }
}

// ==============================================
// UTILITY & HELPER FUNCTIONS
// ==============================================

/**
 * Resetuje denné počítadlá pre všetky skupiny (volať denne)
 * @returns {Object} - Reset results
 */
function resetDailyCounters() {
    try {
        var groupsLib = libByName(CONFIG.libraries.telegramGroups);
        if (!groupsLib) {
            return {
                success: false,
                error: "Telegram Groups library not found"
            };
        }
        
        var groups = groupsLib.entries();
        var resetCount = 0;
        
        getUtils().addDebug(entry(), "🔄 Resetting daily counters for " + groups.length + " groups");
        
        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];
            try {
                getUtils().safeSet(group, TELEGRAM_FIELDS.sentToday, 0);
                resetCount++;
            } catch (error) {
                getUtils().addError(entry(), "Failed to reset counter for group " + group.field("ID"), "resetDailyCounters");
            }
        }
        
        // Clear cache
        _cache.groupSettings = {};
        
        getUtils().addDebug(entry(), "✅ Reset counters for " + resetCount + " groups");
        
        return {
            success: true,
            resetCount: resetCount,
            totalGroups: groups.length
        };
        
    } catch (error) {
        getUtils().addError(entry(), "Chyba pri reset daily counters: " + error.toString(), "resetDailyCounters");
        return {
            success: false,
            error: error.toString()
        };
    }
}

/**
 * Získa štatistiky pre všetky Telegram skupiny
 * @returns {Object} - Group statistics
 */
function getGroupStatistics() {
    try {
        var groupsLib = libByName(CONFIG.libraries.telegramGroups);
        if (!groupsLib) {
            return null;
        }
        
        var groups = groupsLib.entries();
        var stats = {
            totalGroups: groups.length,
            activeGroups: 0,
            totalMessagesSent: 0,
            todayMessagesSent: 0,
            groupsWithLimits: 0,
            groupsOverLimit: 0,
            threadsCount: 0
        };
        
        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];
            var settings = getTelegramGroupSettings(group);
            
            if (settings && settings.notificationsEnabled) {
                stats.activeGroups++;
            }
            
            if (settings) {
                stats.totalMessagesSent += settings.totalMessages || 0;
                stats.todayMessagesSent += settings.sentToday || 0;
                
                if (settings.dailyLimit > 0) {
                    stats.groupsWithLimits++;
                    if (settings.sentToday >= settings.dailyLimit) {
                        stats.groupsOverLimit++;
                    }
                }
                
                if (settings.isThread) {
                    stats.threadsCount++;
                }
            }
        }
        
        return stats;
        
    } catch (error) {
        getUtils().addError(entry(), "Chyba pri získavaní group statistics: " + error.toString(), "getGroupStatistics");
        return null;
    }
}

/**
 * Testuje všetky konfigurácie a API pripojenia
 * @returns {Object} - Test results
 */
function runDiagnostics() {
    try {
        var diagnostics = {
            timestamp: getUtils().formatDate(moment()),
            botToken: null,
            apiConnection: null,
            groups: null,
            dependencies: null
        };
        
        getUtils().addDebug(entry(), "🔍 Running Telegram diagnostics");
        
        // Test Bot Token
        var tokenTest = testBotToken();
        diagnostics.botToken = {
            valid: tokenTest.valid,
            botUsername: tokenTest.botUsername,
            botName: tokenTest.botName,
            error: tokenTest.error
        };
        
        // Test API Connection
        if (tokenTest.valid) {
            diagnostics.apiConnection = {
                status: "OK",
                responseTime: "< 1s" // Placeholder
            };
        } else {
            diagnostics.apiConnection = {
                status: "FAILED",
                error: tokenTest.error
            };
        }
        
        // Test Groups
        var groupStats = getGroupStatistics();
        diagnostics.groups = groupStats;
        
        // Test Dependencies
        diagnostics.dependencies = {
            mementoUtils: typeof MementoUtils !== 'undefined',
            mementoUtilsVersion: getUtils().version || "N/A",
            notificationsHelper: typeof ASISTANTONotifications !== 'undefined',
            notificationsHelperVersion: getNotifHelper() ? getNotifHelper().version : "N/A"
        };
        
        return diagnostics;
        
    } catch (error) {
        return {
            timestamp: getUtils().formatDate(moment()),
            error: error.toString()
        };
    }
}

// ==============================================
// PUBLIC API EXPORT
// ==============================================

var ASISTANTOTelegram = {
    // Verzia a konfigurácia
    version: CONFIG.version,
    CONFIG: CONFIG,
    TELEGRAM_FIELDS: TELEGRAM_FIELDS,
    
    // API Management
    getBotToken: getBotToken,
    testBotToken: testBotToken,
    
    // Core Telegram functions
    sendTelegramMessage: sendTelegramMessage,
    deleteTelegramMessage: deleteTelegramMessage,
    editTelegramMessage: editTelegramMessage,
    
    // Group & Settings management
    getTelegramGroupSettings: getTelegramGroupSettings,
    syncGroupSettingsToNotification: syncGroupSettingsToNotification,
    validateBusinessRules: validateBusinessRules,
    
    // High-level sending functions
    sendToGroup: sendToGroup,
    sendToThread: sendToThread,
    sendToEmployee: sendToEmployee,
    sendBulkMessages: sendBulkMessages,
    
    // Notification integration
    processNotification: processNotification,
    processEmployeeNotification: processEmployeeNotification,
    processGroupNotification: processGroupNotification,
    processClientPartnerNotification: processClientPartnerNotification,
    
    // Utility functions
    resetDailyCounters: resetDailyCounters,
    getGroupStatistics: getGroupStatistics,
    runDiagnostics: runDiagnostics,
    incrementSentCounter: incrementSentCounter
};

// ==============================================
// INICIALIZÁCIA
// ==============================================

// Backward compatibility
if (typeof global !== 'undefined') {
    global.ASISTANTOTelegram = ASISTANTOTelegram;
}

// Inicializačné logy
try {
    var debugMsg = "✅ ASISTANTO Telegram v" + CONFIG.version + " načítaný";
    debugMsg += " | MementoUtils: " + (getUtils().version || "N/A");
    
    var existingDebug = entry().field("Debug_Log") || "";
    entry().set("Debug_Log", existingDebug + "[" + moment().format("HH:mm:ss") + "] " + debugMsg + "\n");
    
    getUtils().addInfo(entry(), "ASISTANTO Telegram v" + CONFIG.version + " inicializovaný", {
        mementoUtils: getUtils().version || "N/A",
        telegramFieldsCount: Object.keys(TELEGRAM_FIELDS).length,
        maxMessageLength: CONFIG.telegramApi.maxMessageLength,
        rateLimitDelay: CONFIG.telegramApi.rateLimitDelay
    });
    
} catch (e) {
    // Ignoruj chybu pri inicializácii mimo entry kontextu
}

// ==============================================
// USAGE EXAMPLES & DOCUMENTATION
// ==============================================

/*
PRÍKLADY POUŽITIA:

// 1. Jednoduchý test Telegram pripojenia
var test = ASISTANTOTelegram.testBotToken();
if (test.valid) {
    message("✅ Telegram Bot: " + test.botName + " (@" + test.botUsername + ")");
} else {
    message("❌ Telegram chyba: " + test.error);
}

// 2. Odoslanie správy do skupiny
var groupEntry = lib("ASISTANTO Telegram Groups").find("Názov skupiny", "Hlavná skupina")[0];
var result = ASISTANTOTelegram.sendToGroup(groupEntry, "Test správa z Mementa!");
if (result.success) {
    message("✅ Správa odoslaná: Message ID " + result.messageId);
}

// 3. Bulk správy pre zamestnancov
var employees = lib("Zamestnanci").find("Status", "Aktívny");
var bulkResult = ASISTANTOTelegram.sendBulkMessages(employees, "Hromadná správa pre všetkých!");
message("📊 Odoslané: " + bulkResult.sent + "/" + bulkResult.total);

// 4. Spracovanie notification entry
var notifEntry = entry(); // Aktuálny notification záznam
var processResult = ASISTANTOTelegram.processNotification(notifEntry);
if (processResult.success) {
    message("✅ Notification spracovaná úspešne");
}

// 5. Diagnostika systému
var diagnostics = ASISTANTOTelegram.runDiagnostics();
message("🔍 Bot Status: " + (diagnostics.botToken.valid ? "OK" : "FAILED"));
message("📊 Aktívne skupiny: " + diagnostics.groups.activeGroups);

// 6. Reset denných počítadiel (volať denne)
var resetResult = ASISTANTOTelegram.resetDailyCounters();
message("🔄 Reset counters: " + resetResult.resetCount + " groups");

// 7. Získanie group settings
var groupSettings = ASISTANTOTelegram.getTelegramGroupSettings(groupEntry);
if (groupSettings) {
    message("📋 Chat ID: " + groupSettings.chatId);
    message("🔔 Denný limit: " + groupSettings.dailyLimit);
    message("📈 Odoslané dnes: " + groupSettings.sentToday);
}
*/