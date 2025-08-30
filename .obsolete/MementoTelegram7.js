// ==============================================
// MEMENTO TELEGRAM - Telegram integrácia
// Verzia: 7.0 | Dátum: August 2025 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
//    - Telegram Bot API integrácia
//    - Odosielanie, editácia a mazanie správ
//    - Práca s thread/témami
//    - Notifikačný systém
// ==============================================
// 🔧 CHANGELOG v7.0:
//    - Zjednodušená štruktúra
//    - Využitie MementoAI pre HTTP requesty
//    - Slovenské komentáre
//    - Čistejšie API
// ==============================================

var MementoTelegram = (function() {
    'use strict';
    
    var version = "7.0";
    
    // Lazy loading pre závislosti
    var _config = null;
    var _core = null;
    var _ai = null;
    
    function getConfig() {
        if (!_config && typeof MementoConfig !== 'undefined') {
            _config = MementoConfig.getConfig();
        }
        return _config;
    }
    
    function getCore() {
        if (!_core && typeof MementoCore !== 'undefined') {
            _core = MementoCore;
        }
        return _core;
    }
    
    function getAI() {
        if (!_ai && typeof MementoAI !== 'undefined') {
            _ai = MementoAI;
        }
        return _ai;
    }
    
    // ==============================================
    // TELEGRAM API
    // ==============================================
    
    /**
     * Získa Telegram Bot API token
     * @returns {string|null} API token alebo null
     */
    function getBotToken() {
        try {
            var core = getCore();
            if (!core) return null;
            
            var config = getConfig();
            var defaultsLib = config ? config.libraries.defaults : "ASISTANTO Defaults";
            var tokenField = config ? config.fields.defaults.telegramApiKey : "Telegram Bot API Key";
            
            return core.getSettings(defaultsLib, tokenField);
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Odošle správu na Telegram
     * @param {string} chatId - ID chatu alebo username
     * @param {string} text - Text správy
     * @param {Object} options - Dodatočné parametre
     * @returns {Object} Výsledok operácie
     */
    function sendTelegramMessage(chatId, text, options) {
        try {
            var core = getCore();
            var ai = getAI();
            
            if (!ai) {
                throw new Error("MementoAI modul nie je dostupný");
            }
            
            var token = getBotToken();
            if (!token) {
                throw new Error("Telegram Bot API token nebol nájdený");
            }
            
            options = options || {};
            
            // Príprava URL a dát
            var url = "https://api.telegram.org/bot" + token + "/sendMessage";
            var data = {
                chat_id: chatId,
                text: text,
                parse_mode: options.parseMode || "Markdown",
                disable_web_page_preview: options.disablePreview || false,
                disable_notification: options.silent || false
            };
            
            // Thread ID pre odpoveď v téme
            if (options.threadId) {
                data.message_thread_id = options.threadId;
            }
            
            // Reply to message
            if (options.replyToMessageId) {
                data.reply_to_message_id = options.replyToMessageId;
            }
            
            // Inline keyboard
            if (options.inlineKeyboard) {
                data.reply_markup = {
                    inline_keyboard: options.inlineKeyboard
                };
            }
            
            // Odoslanie requestu
            var response = ai.httpRequest("POST", url, data);
            
            if (response.code !== 200) {
                var errorData = JSON.parse(response.body);
                throw new Error("Telegram API error: " + (errorData.description || response.body));
            }
            
            var responseData = JSON.parse(response.body);
            
            // Ulož info o správe do notifikácií
            if (options.createNotification !== false) {
                createNotificationEntry("sent", {
                    chatId: chatId,
                    messageId: responseData.result.message_id,
                    threadId: options.threadId,
                    text: text,
                    timestamp: new Date()
                });
            }
            
            return {
                success: true,
                messageId: responseData.result.message_id,
                chatId: responseData.result.chat.id,
                date: responseData.result.date
            };
            
        } catch (error) {
            if (core) {
                core.addError(entry(), "Odoslanie Telegram správy zlyhalo: " + error.toString(), "sendTelegramMessage", error);
            }
            
            return {
                success: false,
                error: error.toString()
            };
        }
    }
    
    /**
     * Edituje existujúcu správu
     * @param {string} chatId - ID chatu
     * @param {string} messageId - ID správy
     * @param {string} newText - Nový text
     * @param {Object} options - Dodatočné parametre
     * @returns {Object} Výsledok operácie
     */
    function editTelegramMessage(chatId, messageId, newText, options) {
        try {
            var ai = getAI();
            if (!ai) {
                throw new Error("MementoAI modul nie je dostupný");
            }
            
            var token = getBotToken();
            if (!token) {
                throw new Error("Telegram Bot API token nebol nájdený");
            }
            
            options = options || {};
            
            var url = "https://api.telegram.org/bot" + token + "/editMessageText";
            var data = {
                chat_id: chatId,
                message_id: messageId,
                text: newText,
                parse_mode: options.parseMode || "Markdown",
                disable_web_page_preview: options.disablePreview || false
            };
            
            if (options.inlineKeyboard) {
                data.reply_markup = {
                    inline_keyboard: options.inlineKeyboard
                };
            }
            
            var response = ai.httpRequest("POST", url, data);
            
            if (response.code !== 200) {
                var errorData = JSON.parse(response.body);
                throw new Error("Telegram API error: " + (errorData.description || response.body));
            }
            
            return {
                success: true,
                messageId: messageId
            };
            
        } catch (error) {
            var core = getCore();
            if (core) {
                core.addError(entry(), "Editácia Telegram správy zlyhala: " + error.toString(), "editTelegramMessage", error);
            }
            
            return {
                success: false,
                error: error.toString()
            };
        }
    }
    
    /**
     * Vymaže správu
     * @param {string} chatId - ID chatu
     * @param {string} messageId - ID správy
     * @returns {Object} Výsledok operácie
     */
    function deleteTelegramMessage(chatId, messageId) {
        try {
            var ai = getAI();
            if (!ai) {
                throw new Error("MementoAI modul nie je dostupný");
            }
            
            var token = getBotToken();
            if (!token) {
                throw new Error("Telegram Bot API token nebol nájdený");
            }
            
            var url = "https://api.telegram.org/bot" + token + "/deleteMessage";
            var data = {
                chat_id: chatId,
                message_id: messageId
            };
            
            var response = ai.httpRequest("POST", url, data);
            
            if (response.code !== 200) {
                var errorData = JSON.parse(response.body);
                throw new Error("Telegram API error: " + (errorData.description || response.body));
            }
            
            return {
                success: true
            };
            
        } catch (error) {
            var core = getCore();
            if (core) {
                core.addError(entry(), "Vymazanie Telegram správy zlyhalo: " + error.toString(), "deleteTelegramMessage", error);
            }
            
            return {
                success: false,
                error: error.toString()
            };
        }
    }
    
    // ==============================================
    // TELEGRAM GROUPS
    // ==============================================
    
    /**
     * Získa Telegram skupinu podľa ID
     * @param {string} groupId - ID skupiny alebo názov
     * @returns {Entry|null} Entry skupiny alebo null
     */
    function getTelegramGroup(groupId) {
        try {
            var config = getConfig();
            var groupsLib = config ? config.libraries.telegramGroups : "ASISTANTO Telegram Groups";
            
            var lib = libByName(groupsLib);
            if (!lib) {
                return null;
            }
            
            // Hľadaj podľa ID alebo názvu
            var groups = lib.find(config.fields.telegramGroups.chatId, groupId);
            if (!groups || groups.length === 0) {
                groups = lib.find(config.fields.telegramGroups.groupName, groupId);
            }
            
            return groups && groups.length > 0 ? groups[0] : null;
            
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Odošle správu do konkrétnej témy v skupine
     * @param {string} groupId - ID skupiny
     * @param {string} threadId - ID témy
     * @param {string} text - Text správy
     * @param {Object} options - Dodatočné parametre
     * @returns {Object} Výsledok operácie
     */
    function sendToTelegramThread(groupId, threadId, text, options) {
        options = options || {};
        options.threadId = threadId;
        
        return sendTelegramMessage(groupId, text, options);
    }
    
    // ==============================================
    // NOTIFIKÁCIE
    // ==============================================
    
    /**
     * Vytvorí záznam v knižnici notifikácií
     * @param {string} type - Typ notifikácie
     * @param {Object} data - Dáta notifikácie
     * @returns {Entry|null} Vytvorený záznam alebo null
     */
    function createNotificationEntry(type, data) {
        try {
            var config = getConfig();
            var core = getCore();
            
            var notifLib = libByName(config.libraries.notifications);
            if (!notifLib) {
                return null;
            }
            
            var notif = notifLib.create({});
            
            // Základné polia
            notif.set(config.fields.notifications.messageType, type);
            notif.set(config.fields.notifications.status, "Odoslané");
            notif.set(config.fields.notifications.priority, data.priority || "Normálna");
            
            // Telegram špecifické polia
            if (data.chatId) {
                notif.set(config.fields.notifications.chatId, data.chatId);
            }
            if (data.threadId) {
                notif.set(config.fields.notifications.threadId, data.threadId);
            }
            if (data.messageId) {
                notif.set(config.fields.notifications.messageId, data.messageId);
            }
            
            // Obsah správy
            if (data.text) {
                notif.set(config.fields.notifications.message, data.text);
            }
            
            // Časové údaje
            notif.set(config.fields.notifications.lastMessage, new Date());
            
            // Prepojenia
            if (data.employee) {
                notif.set(config.fields.notifications.employeeOrClient, data.employee);
            }
            if (data.customer) {
                notif.set(config.fields.notifications.customer, data.customer);
            }
            
            return notif;
            
        } catch (error) {
            var core = getCore();
            if (core) {
                core.addError(entry(), "Vytvorenie notifikácie zlyhalo: " + error.toString(), "createNotificationEntry", error);
            }
            return null;
        }
    }
    
    // ==============================================
    // HELPER FUNKCIE
    // ==============================================
    
    /**
     * Formátuje text pre Telegram Markdown
     * @param {string} text - Text na formátovanie
     * @returns {string} Formátovaný text
     */
    function formatForTelegram(text) {
        // Escape špeciálne znaky pre Markdown
        return text
            .replace(/\*/g, "\\*")
            .replace(/_/g, "\\_")
            .replace(/\[/g, "\\[")
            .replace(/\]/g, "\\]")
            .replace(/\(/g, "\\(")
            .replace(/\)/g, "\\)")
            .replace(/~/g, "\\~")
            .replace(/`/g, "\\`")
            .replace(/>/g, "\\>")
            .replace(/#/g, "\\#")
            .replace(/\+/g, "\\+")
            .replace(/-/g, "\\-")
            .replace(/=/g, "\\=")
            .replace(/\|/g, "\\|")
            .replace(/\{/g, "\\{")
            .replace(/\}/g, "\\}")
            .replace(/\./g, "\\.")
            .replace(/!/g, "\\!");
    }
    
    /**
     * Vytvorí inline keyboard pre Telegram
     * @param {Array} buttons - Pole tlačidiel [{text: "Text", callback_data: "data"}]
     * @param {number} columns - Počet stĺpcov (default: 2)
     * @returns {Array} Inline keyboard array
     */
    function createInlineKeyboard(buttons, columns) {
        columns = columns || 2;
        var keyboard = [];
        var row = [];
        
        for (var i = 0; i < buttons.length; i++) {
            row.push(buttons[i]);
            
            if (row.length === columns || i === buttons.length - 1) {
                keyboard.push(row);
                row = [];
            }
        }
        
        return keyboard;
    }
    
    // ==============================================
    // PUBLIC API
    // ==============================================
    
    return {
        version: version,
        
        // Základné funkcie
        sendTelegramMessage: sendTelegramMessage,
        editTelegramMessage: editTelegramMessage,
        deleteTelegramMessage: deleteTelegramMessage,
        
        // Skupiny a témy
        getTelegramGroup: getTelegramGroup,
        sendToTelegramThread: sendToTelegramThread,
        
        // Notifikácie
        createNotificationEntry: createNotificationEntry,
        
        // Helper funkcie
        formatForTelegram: formatForTelegram,
        createInlineKeyboard: createInlineKeyboard,
        getBotToken: getBotToken
    };
})();