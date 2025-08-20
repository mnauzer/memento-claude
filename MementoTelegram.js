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
    var core = MementoCore;
    var ai = MementoAI;
    
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
            
            core.addDebug(entry(), "🗑️ Deleting