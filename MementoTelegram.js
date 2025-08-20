// ==============================================
// MEMENTOTELEGRAM - Telegram integrácia a notifikácie
// Verzia: 1.0 | Dátum: August 2025 | Autor: ASISTANTO
// ==============================================
// 📋 OBSAH:
//    - Telegram API integrácia
//    - Správa notifikácií
//    - Message lifecycle management
//    - Skupiny a témy support
// ==============================================
// 🔗 ZÁVISLOSTI: MementoCore.js, MementoAI.js

var MementoTelegram = (function() {
    'use strict';
    
    // Import dependencies
    // Lazy loading dependencies
    var core, ai;
    function ensureDependencies() {
        if (!core && typeof MementoCore !== 'undefined') {
            core = MementoCore;
        }
        if (!ai && typeof MementoAI !== 'undefined') {
            ai = MementoAI;
        }
        return core && ai;
    }
    
    // ==============================================
    // CONFIGURATION
    // ==============================================
    
    var config = {
        version: "1.0",
        
        // Libraries
        defaultsLibrary: "ASISTANTO Defaults",
        notificationsLibrary: "ASISTANTO Notifications",
        telegramGroupsLibrary: "ASISTANTO Telegram Groups",
        
        // Telegram settings
        telegramBotTokenField: "Telegram Bot Token",
        telegramBaseUrl: "https://api.telegram.org/bot",
        
        // Notification settings
        maxRetries: 3,
        retryDelay: 5000 // 5 seconds
    };
    
    // ==============================================
    // TELEGRAM API FUNCTIONS
    // ==============================================
    
    function sendTelegramMessage(chatId, text, options) {
        ensureDependencies();
        options = options || {};
        
        try {
            var botToken = core.getSettings(config.defaultsLibrary, config.telegramBotTokenField);
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
            
            core.addDebug(entry(), "📤 Sending Telegram message to chat: " + chatId);
            
            var result = ai.httpRequest("POST", url, payload);
            
            if (result.success && result.data && result.data.ok) {
                core.addDebug(entry(), "✅ Telegram message sent successfully");
                return {
                    success: true,
                    messageId: result.data.result.message_id,
                    data: result.data.result
                };
            } else {
                var errorMsg = "Telegram API error: " + (result.error || "Unknown error");
                if (result.data && result.data.description) {
                    errorMsg += " - " + result.data.description;
                }
                core.addError(entry(), errorMsg, "sendTelegramMessage");
                return {
                    success: false,
                    error: errorMsg,
                    data: result.data
                };
            }
            
        } catch (error) {
            core.addError(entry(), error.toString(), "sendTelegramMessage", error);
            return {
                success: false,
                error: error.toString()
            };
        }
    }
    
    function deleteTelegramMessage(chatId, messageId) {
        ensureDependencies();
        try {
            var botToken = core.getSettings(config.defaultsLibrary, config.telegramBotTokenField);
            if (!botToken) {
                return { success: false, error: "Telegram bot token not found" };
            }
            
            var url = config.telegramBaseUrl + botToken + "/deleteMessage";
            
            var payload = {
                chat_id: chatId,
                message_id: messageId
            };
            
            core.addDebug(entry(), "🗑️ Deleting Telegram message: " + messageId);
            
            var result = ai.httpRequest("POST", url, payload);
            
            return {
                success: result.success && result.data && result.data.ok,
                error: result.error
            };
            
        } catch (error) {
            core.addError(entry(), error.toString(), "deleteTelegramMessage", error);
            return {
                success: false,
                error: error.toString()
            };
        }
    }
    
    function editTelegramMessage(chatId, messageId, newText, options) {
        ensureDependencies();
        options = options || {};
        
        try {
            var botToken = core.getSettings(config.defaultsLibrary, config.telegramBotTokenField);
            if (!botToken) {
                return { success: false, error: "Telegram bot token not found" };
            }
            
            var url = config.telegramBaseUrl + botToken + "/editMessageText";
            
            var payload = {
                chat_id: chatId,
                message_id: messageId,
                text: newText,
                parse_mode: options.parseMode || "HTML",
                disable_web_page_preview: options.disablePreview || false
            };
            
            if (options.replyMarkup) {
                payload.reply_markup = JSON.stringify(options.replyMarkup);
            }
            
            var result = ai.httpRequest("POST", url, payload);
            
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
    // NOTIFICATION MANAGEMENT
    // ==============================================
    
    function createNotificationEntry(type, data) {
        ensureDependencies();
        try {
            var notifLib = libByName(config.notificationsLibrary);
            if (!notifLib) {
                return { success: false, error: "Notifications library not found" };
            }
            
            var notifData = {
                "Typ": type,
                "Stav": {name: "Čaká"},
                "Vytvorené": moment().toDate(),
                "Data": JSON.stringify(data),
                "Pokusov": 0
            };
            
            // Pridaj špecifické polia podľa typu
            if (type === "telegram") {
                notifData["Chat ID"] = data.chatId;
                notifData["Text"] = data.text;
                notifData["Thread ID"] = data.threadId || "";
                notifData["Message ID"] = data.messageId || "";
            }
            
            if (data.sourceEntryId) {
                notifData["Source Entry ID"] = data.sourceEntryId;
            }
            
            var newNotif = notifLib.create(notifData);
            
            core.addDebug(entry(), "📝 Created notification entry: " + newNotif.field("ID"));
            
            return {
                success: true,
                entry: newNotif,
                id: newNotif.field("ID")
            };
            
        } catch (error) {
            core.addError(entry(), error.toString(), "createNotificationEntry", error);
            return {
                success: false,
                error: error.toString()
            };
        }
    }
    
    function manageNotifications(sourceEntryId, deleteOld) {
        ensureDependencies();
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
                        // Ak má notifikácia message ID, pokús sa vymazať aj správu
                        var messageId = oldNotifs[i].field("Message ID");
                        var chatId = oldNotifs[i].field("Chat ID");
                        
                        if (messageId && chatId) {
                            deleteTelegramMessage(chatId, messageId);
                        }
                        
                        oldNotifs[i].trash();
                        results.deleted++;
                    } catch (e) {
                        results.errors.push("Failed to delete notification: " + e.toString());
                    }
                }
                
                core.addDebug(entry(), "🗑️ Deleted " + results.deleted + " old notifications");
            }
            
            return {
                success: true,
                results: results
            };
            
        } catch (error) {
            core.addError(entry(), error.toString(), "manageNotifications", error);
            return {
                success: false,
                error: error.toString()
            };
        }
    }
    
    function processNotificationQueue() {
        ensureDependencies();
        try {
            var notifLib = libByName(config.notificationsLibrary);
            if (!notifLib) {
                return { success: false, error: "Notifications library not found" };
            }
            
            // Načítaj čakajúce notifikácie
            var pendingNotifs = notifLib.find("Stav", "Čaká");
            var processed = 0;
            var failed = 0;
            
            core.addDebug(entry(), "📬 Processing " + pendingNotifs.length + " pending notifications");
            
            for (var i = 0; i < pendingNotifs.length; i++) {
                var notif = pendingNotifs[i];
                var attempts = notif.field("Pokusov") || 0;
                
                // Skip ak prekročil max pokusov
                if (attempts >= config.maxRetries) {
                    notif.set("Stav", "Zlyhalo");
                    failed++;
                    continue;
                }
                
                try {
                    var data = JSON.parse(notif.field("Data"));
                    var type = notif.field("Typ");
                    var result = null;
                    
                    if (type === "telegram") {
                        result = sendTelegramMessage(data.chatId, data.text, data.options || {});
                        
                        if (result.success) {
                            notif.set("Stav", "Odoslané");
                            notif.set("Message ID", result.messageId);
                            notif.set("Odoslané", moment().toDate());
                            processed++;
                        }
                    }
                    
                    if (!result || !result.success) {
                        notif.set("Pokusov", attempts + 1);
                        notif.set("Posledná chyba", result ? result.error : "Unknown error");
                        
                        if (attempts + 1 >= config.maxRetries) {
                            notif.set("Stav", "Zlyhalo");
                            failed++;
                        }
                    }
                    
                } catch (e) {
                    notif.set("Pokusov", attempts + 1);
                    notif.set("Posledná chyba", e.toString());
                    
                    if (attempts + 1 >= config.maxRetries) {
                        notif.set("Stav", "Zlyhalo");
                        failed++;
                    }
                }
            }
            
            core.addInfo(entry(), "Notification queue processed", {
                total: pendingNotifs.length,
                processed: processed,
                failed: failed
            });
            
            return {
                success: true,
                processed: processed,
                failed: failed,
                total: pendingNotifs.length
            };
            
        } catch (error) {
            core.addError(entry(), error.toString(), "processNotificationQueue", error);
            return {
                success: false,
                error: error.toString()
            };
        }
    }
    
    // ==============================================
    // TELEGRAM GROUPS SUPPORT
    // ==============================================
    
    function getTelegramGroup(groupName) {
        ensureDependencies();
        try {
            var groupsLib = libByName(config.telegramGroupsLibrary);
            if (!groupsLib) {
                return null;
            }
            
            var groups = groupsLib.find("Názov", groupName);
            if (groups.length > 0) {
                var group = groups[0];
                return {
                    chatId: group.field("Chat ID"),
                    threadId: group.field("Thread ID"),
                    groupName: group.field("Názov skupiny"),
                    threadName: group.field("Názov témy")
                };
            }
            
            return null;
            
        } catch (error) {
            core.addError(entry(), error.toString(), "getTelegramGroup", error);
            return null;
        }
    }
    
    // ==============================================
    // PUBLIC API
    // ==============================================
    
    return {
        // Version
        version: config.version,
        
        // Telegram API
        sendTelegramMessage: sendTelegramMessage,
        deleteTelegramMessage: deleteTelegramMessage,
        editTelegramMessage: editTelegramMessage,
        
        // Notifications
        createNotificationEntry: createNotificationEntry,
        manageNotifications: manageNotifications,
        processNotificationQueue: processNotificationQueue,
        
        // Groups
        getTelegramGroup: getTelegramGroup
    };
})();