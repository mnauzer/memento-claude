// ==============================================
// MEMENTO TELEGRAM - TELEGRAM BOT API
// Verzia: 8.2.0 | Dátum: 2026-03-19 | Autor: ASISTANTO
// Predchádzajúca verzia: MementoTelegram8.js v8.2.0 (filename only changed)
// ==============================================
// 📋 ÚČEL:
//    - Telegram Bot API integrácia
//    - Odosielanie, editácia a mazanie správ
//    - Práca s thread/témami
//    - Notifikačný systém
//    - Group summary funkcie
//    - Message formatting a šablóny
// ==============================================
// ⚠️ DÔLEŽITÉ:
//    - Tento modul NEMOŽNO agregovať v MementoUtils (circular dependency)
//    - Import priamo: var telegram = typeof MementoTelegram !== 'undefined' ? MementoTelegram : null;
// ==============================================
// 🔧 CHANGELOG v8.2.0:
//    - ODSTRÁNENÉ: Závislosť na MementoUtils (circular dependency fix)
//    - Teraz závisí len na MementoCore a MementoConfig
//    - Phase 2: Break Circular Dependencies COMPLETE
// 🔧 CHANGELOG v8.0:
//    - Pridané Group Summary funkcie
//    - Message formatting šablóny
//    - Agregačné funkcie
//    - Štatistické funkcie
//    - Refaktorovaná štruktúra
// ==============================================

var MementoTelegram = (function() {
    'use strict';

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "MementoTelegram",
        version: "8.2.0",
        author: "ASISTANTO",
        description: "Telegram Bot API integration with group chat and thread support",
        dependencies: ["MementoCore", "MementoConfig"],  // Changed from MementoUtils to avoid circular dependency
        provides: ["sendMessage", "editMessage", "deleteMessage", "sendGroupSummary", "formatMarkdown"],
        status: "stable",
        note: "Phase 2: No longer depends on MementoUtils (circular dependency fixed)"
    };

    var version = MODULE_INFO.version;

    // Lazy loading pre závislosti
    var _config = null;
    var _core = null;
    var _ai = null;
    // _utils removed - no longer depends on MementoUtils (circular dependency)

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
    // TELEGRAM API - ZÁKLADNÉ FUNKCIE
    // ==============================================
    
    /**
     * Získa Telegram Bot API token
     * @returns {string|null} API token alebo null
     */
    function getBotToken() {
        try {
            var core = getCore();
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
    // function sendTelegramMessage(chatId, text, options, inlineKeyboard) {
    //     try {
    //         var core = getCore();
    //         var ai = getAI();
            
    //         if (!ai) {
    //             throw new Error("MementoAI modul nie je dostupný");
    //         }
            
    //         var token = getBotToken();
    //         if (!token) {
    //             throw new Error("Telegram Bot API token nebol nájdený");
    //         }
            
    //         options = options || {};
            
    //         // Príprava URL a dát
    //         var url = "https://api.telegram.org/bot" + token + "/sendMessage";
    //         var data = {
    //             chat_id: chatId,
    //             text: text,
    //             parse_mode: options.parseMode || "Markdown",
    //             disable_web_page_preview: options.disablePreview || false,
    //             disable_notification: options.silent || false,
    //             reply_markup: inlineKeyboard
    //         };
            
    //         // Thread ID pre odpoveď v téme
    //         if (options.threadId) {
    //             data.message_thread_id = options.threadId;
    //         }
            
    //         // Reply to message
    //         if (options.replyToMessageId) {
    //             data.reply_to_message_id = options.replyToMessageId;
    //         }
            
    //         // Inline keyboard
    //         if (options.inlineKeyboard) {
    //             data.reply_markup = {
    //                 inline_keyboard: options.inlineKeyboard
    //             };
    //         }
            
    //         // Odoslanie requestu
    //         var response = ai.httpRequest("POST", url, data);
            
    //         if (response.code !== 200) {
    //             var errorData = JSON.parse(response.body);
    //             throw new Error("Telegram API error: " + (errorData.description || response.body));
    //         }
            
    //         var responseData = JSON.parse(response.body);
            
    //         // Ulož info o správe do notifikácií
    //         if (options.createNotification !== false) {
    //             createNotificationEntry("sent", {
    //                 chatId: chatId,
    //                 messageId: responseData.result.message_id,
    //                 threadId: options.threadId,
    //                 text: text,
    //                 timestamp: new Date()
    //             });
    //         }
            
    //         return {
    //             success: true,
    //             messageId: responseData.result.message_id,
    //             chatId: responseData.result.chat.id,
    //             date: responseData.result.date
    //         };
            
    //     } catch (error) {
    //         if (core) {
    //             core.addError(entry(), "Odoslanie Telegram správy zlyhalo: " + error.toString(), "sendTelegramMessage", error);
    //         }
            
    //         return {
    //             success: false,
    //             error: error.toString()
    //         };
    //     }
    // }
    function sendTelegramMessage(chatId, text, options, inlineKeyboard) {
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
            
            // OPRAVA: Správne spracovanie inline keyboard
            if (inlineKeyboard) {
                data.reply_markup = {
                    inline_keyboard: inlineKeyboard
                };
            } else if (options.inlineKeyboard) {
                data.reply_markup = {
                    inline_keyboard: options.inlineKeyboard
                };
            }
            
            // Debug log pre kontrolu
            core.addDebug(entry(), "Telegram API data: " + JSON.stringify(data));
            
            // Odoslanie requestu
            var response = ai.httpRequest("POST", url, data);
            
            if (response.code !== 200) {
                var errorData = JSON.parse(response.body);
                throw new Error("Telegram API error: " + (errorData.description || response.body));
            }
            
            var responseData = JSON.parse(response.body);
            
            return {
                success: true,
                messageId: responseData.result.message_id,
                chatId: responseData.result.chat.id,
                date: responseData.result.date
            };
            
        } catch (error) {
            core.addError(entry(), "SendTelegramMessage error: " + error.toString(), "sendTelegramMessage", error);
            return {
                success: false,
                error: error.toString()
            };
        }
    }
    function createTelegramMessage(sourceEntry){
    try {
        var core = getCore();
        var config = getConfig();
        var currentEntry = sourceEntry || entry();
        var libraryName = lib().title;
        
        // 1. Kontrola či máme info_telegram pole
        var telegramMessage = core.safeGet(currentEntry, config.fields.common.infoTelegram);
        if (!telegramMessage) {
            core.addDebug(currentEntry, core.getIcon("info") + " Pole info_telegram je prázdne - žiadna notifikácia");
            return {
                success: false,
                reason: "Prázdne info_telegram pole"
            };
        }
        
        // 2. Identifikácia knižnice
        var libraryConfig = config.libraryMapping[libraryName];
        if (!libraryConfig) {
            core.addDebug(currentEntry, core.getIcon("info") + " Knižnica '" + libraryName + "' nie je nakonfigurovaná pre notifikácie");
            return {
                success: false,
                reason: "Knižnica nie je nakonfigurovaná"
            };
        }
        
        // 3. Kontrola povolení
        if (!checkPermissions(libraryConfig.permissionField)) {
            core.addDebug(currentEntry, core.getIcon("info") + " Skupinové notifikácie sú vypnuté");
            return {
                success: false,
                reason: "Notifikácie vypnuté"
            };
        }
        
        // 4. Získanie Telegram skupiny
        var telegramGroup = getTelegramGroup(libraryConfig.telegramGroupField, currentEntry);
        if (!telegramGroup) {
            core.addDebug(currentEntry, core.getIcon("warning") + " Telegram skupina nenájdená alebo neaktívna");
            return {
                success: false,
                reason: "Telegram skupina nenájdená"
            };
        }
        
        // 5. Cleanup starých notifikácií
        var cleanupResult = cleanupOldNotifications(currentEntry);
        if (cleanupResult.deletedCount > 0) {
            core.addDebug(currentEntry, core.getIcon("delete") + " Vymazaných " + cleanupResult.deletedCount + " starých notifikácií");
        }
        
        // 6. Vytvorenie novej notifikácie
        var notification = createNotification({
            message: telegramMessage,
            messageType: libraryName,
            telegramGroup: telegramGroup
        }, currentEntry);
        
        if (!notification) {
            core.addError(currentEntry, "Nepodarilo sa vytvoriť notifikáciu", "createTelegramMessage");
            return {
                success: false,
                error: "Vytvorenie notifikácie zlyhalo"
            };
        }
        
        // 7. Nalinkuj notifikáciu k záznamu
        linkNotification(notification, currentEntry);
        
        core.addDebug(currentEntry, core.getIcon("success") + " Notifikácia vytvorená (ID: " + notification.field("ID") + ")");
        
        return {
            success: true,  
            notification: notification
        };
        
    } catch (error) {
        core.addError(sourceEntry || entry(), "Kritická chyba v createTelegramMessage", "main", error);
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
    // function editTelegramMessage(chatId, messageId, newText, options) {
    //     try {
    //         var ai = getAI();
    //         if (!ai) {
    //             throw new Error("MementoAI modul nie je dostupný");
    //         }
            
    //         var token = getBotToken();
    //         if (!token) {
    //             throw new Error("Telegram Bot API token nebol nájdený");
    //         }
            
    //         options = options || {};
            
    //         var url = "https://api.telegram.org/bot" + token + "/editMessageText";
    //         var data = {
    //             chat_id: chatId,
    //             message_id: messageId,
    //             text: newText,
    //             parse_mode: options.parseMode || "Markdown",
    //             disable_web_page_preview: options.disablePreview || false
    //         };
            
    //         if (options.inlineKeyboard) {
    //             data.reply_markup = {
    //                 inline_keyboard: options.inlineKeyboard
    //             };
    //         }
            
    //         var response = ai.httpRequest("POST", url, data);
            
    //         if (response.code !== 200) {
    //             var errorData = JSON.parse(response.body);
    //             throw new Error("Telegram API error: " + (errorData.description || response.body));
    //         }
            
    //         return {
    //             success: true,
    //             messageId: messageId
    //         };
            
    //     } catch (error) {
    //         var core = getCore();
    //         if (core) {
    //             core.addError(entry(), "Editácia Telegram správy zlyhala: " + error.toString(), "editTelegramMessage", error);
    //         }
            
    //         return {
    //             success: false,
    //             error: error.toString()
    //         };
    //     }
    // }
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
            
            // OPRAVA: Správne spracovanie inline keyboard pri editácii
            if (options.inlineKeyboard) {
                // Ak dostaneš pole (z createInlineKeyboard), zabaľ ho
                if (Array.isArray(options.inlineKeyboard)) {
                    data.reply_markup = {
                        inline_keyboard: options.inlineKeyboard
                    };
                } else {
                    // Ak už je to objekt s inline_keyboard
                    data.reply_markup = options.inlineKeyboard;
                }
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
    
    // function sendToTelegram(chatId, message, threadId, sourceEntry, inlineKeyboard) {
    //     try {
    //         var core = getCore();
    //         var config = getConfig();
    //         var currentEntry = sourceEntry || entry();
            
    //         // Získaj formátovanie z notifikácie
    //         var formatting = core.safeGet(currentEntry, config.fields.notifications.formatting, "Markdown");
            
    //         // OPRAVA: Získaj "Tichá správa" z Telegram Groups, nie z notifikácie
    //         var silent = false;
            
    //         // Skús získať skupinu z notifikácie
    //         var groupOrTopic = core.safeGetLinks(currentEntry, config.fields.notifications.groupOrTopic || "Skupina/Téma");
    //         if (groupOrTopic && groupOrTopic.length > 0) {
    //             var telegramGroup = groupOrTopic[0];
    //             // Získaj "Tichá správa" z Telegram Groups záznamu
    //             silent = core.safeGet(telegramGroup, config.fields.telegramGroups.silentMessage || "Tichá správa", false);
                
    //             core.addDebug(currentEntry, "  • Telegram skupina: " + core.safeGet(telegramGroup, "Názov skupiny"));
    //             core.addDebug(currentEntry, "  • Tichá správa (zo skupiny): " + (silent ? "Áno" : "Nie"));
    //         } else {
    //             // Fallback - skús získať priamo z notifikácie
    //             silent = core.safeGet(currentEntry, "Tichá správa", false);
    //             core.addDebug(currentEntry, "  • Tichá správa (z notifikácie): " + (silent ? "Áno" : "Nie"));
    //         }
            
    //         var options = {
    //             parseMode: formatting,
    //             silent: silent,
    //             createNotification: false,
    //             inlineKeyboard: inlineKeyboard
    //         };
            
    //         if (threadId) {
    //             options.threadId = threadId;
    //         }
            
    //         core.addDebug(currentEntry, "Odosielam správu:");
    //         core.addDebug(currentEntry, "  • Chat ID: " + chatId);
    //         core.addDebug(currentEntry, "  • Thread ID: " + (threadId || "N/A"));
    //         core.addDebug(currentEntry, "  • Formátovanie: " + formatting);
    //         core.addDebug(currentEntry, "  • Tichá správa: " + (silent ? "Áno ✅" : "Nie ❌"));
            
    //         var result = sendTelegramMessage(chatId, message, options, inlineKeyboard);
            
    //         if (result.success) {
    //             core.addDebug(currentEntry, core.getIcon("success") + " Správa odoslaná, Message ID: " + result.messageId);
    //             return {
    //                 success: true,
    //                 messageId: result.messageId,
    //                 chatId: result.chatId,
    //                 date: result.date
    //             };
    //         } else {
    //             return {
    //                 success: false,
    //                 error: result.error || "Neznáma chyba"
    //             };
    //         }
            
    //     } catch (error) {
    //         var errorEntry = sourceEntry || entry();
    //         core.addError(errorEntry, "Chyba pri odosielaní: " + error.toString(), "sendToTelegram", error);
    //         return {
    //             success: false,
    //             error: error.toString()
    //         };
    //     }
    // }
    function sendToTelegram(chatId, message, threadId, sourceEntry, inlineKeyboard) {
        try {
            var core = getCore();
            var config = getConfig();
            var currentEntry = sourceEntry || entry();
            
            // Získaj formátovanie z notifikácie
            var formatting = core.safeGet(currentEntry, config.fields.notifications.formatting, "Markdown");
            
            // Získaj "Tichá správa" z Telegram Groups
            var silent = false;
            var groupOrTopic = core.safeGetLinks(currentEntry, config.fields.notifications.groupOrTopic || "Skupina/Téma");
            
            if (groupOrTopic && groupOrTopic.length > 0) {
                var telegramGroup = groupOrTopic[0];
                silent = core.safeGet(telegramGroup, config.fields.telegramGroups.silentMessage || "Tichá správa", true);
            }
            
            var options = {
                parseMode: formatting,
                silent: silent,
                createNotification: false
            };
            
            if (threadId) {
                options.threadId = threadId;
            }
            
            core.addDebug(currentEntry, "Odosielam správu:");
            core.addDebug(currentEntry, "  • Chat ID: " + chatId);
            core.addDebug(currentEntry, "  • Thread ID: " + (threadId || "N/A"));
            core.addDebug(currentEntry, "  • Formátovanie: " + formatting);
            core.addDebug(currentEntry, "  • Tichá správa: " + (silent ? "Áno" : "Nie"));
            
            // OPRAVA: Priamo posielaj inlineKeyboard ako parameter, nie cez options
            var result = sendTelegramMessage(chatId, message, options, inlineKeyboard);
            
            if (result.success) {
                core.addDebug(currentEntry, core.getIcon("success") + " Správa odoslaná, Message ID: " + result.messageId);
                return result;
            } else {
                return {
                    success: false,
                    error: result.error || "Neznáma chyba"
                };
            }
            
        } catch (error) {
            var errorEntry = sourceEntry || entry();
            core.addError(errorEntry, "Chyba pri odosielaní: " + error.toString(), "sendToTelegram", error);
            return {
                success: false,
                error: error.toString()
            };
        }
    }
    function sendNotificationEntry(notificationEntry, inlineKeyboard) {
        try {
            var core = getCore();
            var config = getConfig();
            // 1. Kontrola či je to nový záznam
            if (!isNewRecord()) {
                core.addDebug(notificationEntry, "Nie je nový záznam - preskakujem");
                return true;
            }
            
            // 2. Kontrola statusu
            var status = core.safeGet(notificationEntry, config.fields.notifications.status);
            if (status !== "Čaká") {
                core.addDebug(notificationEntry, "Status nie je 'Čaká' - preskakujem");
                return true;
            }
            
            // 3. Získanie Telegram ID podľa adresáta
            var telegramData = getTelegramID(notificationEntry);
            if (!telegramData.success) {
                core.addError(notificationEntry, "Nepodarilo sa získať Telegram údaje: " + telegramData.error, "main");
                updateStatus("Zlyhalo", telegramData.error, notificationEntry);
                return false;
            }
            
            core.addDebug(notificationEntry, "Telegram údaje získané:");
            core.addDebug(notificationEntry, "  • Chat ID: " + telegramData.chatId);
            if (telegramData.threadId) {
                core.addDebug(notificationEntry, "  • Thread ID: " + telegramData.threadId);
            }
            
            // 4. Príprava správy
            var message = core.safeGet(notificationEntry, config.fields.notifications.message);
            if (!message) {
                core.addError(notificationEntry, "Správa je prázdna", "main");
                updateStatus("Zlyhalo", "Prázdna správa");
                return false;
            }
            
            // 5. Odoslanie na Telegram
            var sendResult = sendToTelegram(telegramData.chatId, message, telegramData.threadId, notificationEntry, inlineKeyboard);
            
            if (!sendResult.success) {
                core.addError(notificationEntry, "Odoslanie zlyhalo: " + sendResult.error, "main");
                updateStatus("Zlyhalo", sendResult.error, notificationEntry);
                return false;
            }
            
            // 6. Aktualizácia záznamu po úspešnom odoslaní
            updateAfterSuccess(sendResult, telegramData, notificationEntry);
            
            // 7. Aktualizácia info poľa zdrojového záznamu
            updateSourceEntryInfo(sendResult, telegramData);
            
            core.addDebug(notificationEntry, core.getIcon("success") + " === NOTIFIKÁCIA ÚSPEŠNE ODOSLANÁ ===");
            
            return {
                success: true,
            };
            
        } catch (error) {
            core.addError(notificationEntry, "Kritická chyba v hlavnej funkcii", "main", error);
            updateStatus("Chyba", error.toString(), notificationEntry);
            return false;
        }
    }
    // ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

    function cleanupOldNotifications(sourceEntry) {
        try {
            var core = getCore();
            var config = getConfig();
            var currentEntry = sourceEntry || entry();
            var existingNotifications = core.safeGet(currentEntry, config.fields.common.notifications, []);
            var deletedCount = 0;
            
            for (var i = 0; i < existingNotifications.length; i++) {
                try {
                    var notification = existingNotifications[i];
                    if (notification && notification.trash) {
                        notification.trash();
                        deletedCount++;
                    }
                } catch (deleteError) {
                    core.addError(currentEntry, "Chyba pri mazaní notifikácie: " + deleteError.toString(), "cleanupOldNotifications");
                }
            }
            
            // Vyčisti pole
            core.safeSet(currentEntry, config.fields.common.notifications, []);
            
            return {
                success: true,
                deletedCount: deletedCount
            };
            
        } catch (error) {
            core.addError(currentEntry, "Kritická chyba pri cleanup: " + error.toString(), "cleanupOldNotifications", error);
            return {
                success: false,
                deletedCount: 0
            };
        }
    }

    function createNotification(params, sourceEntry) {
        try {
            var core = getCore();
            var config = getConfig();
            var currentEntry = sourceEntry || entry();
            var notifLib = libByName(config.libraries.notifications);
            if (!notifLib) {
                core.addError(currentEntry, "Knižnica " + config.libraries.notifications + " nenájdená", "createNotification");
                return null;
            }
            
            var notification = notifLib.create({});
            
            // Formátovanie - detekuj podľa obsahu správy
            var formatting = detectFormatting(params.message);
            notification.set(config.fields.notifications.formatting, formatting);
            
            // Telegram polia
            notification.set(config.fields.notifications.chatId, 
                core.safeGet(params.telegramGroup, config.fields.telegramGroups.chatId));
            
            var threadId = core.safeGet(params.telegramGroup, config.fields.telegramGroups.threadId);
            if (threadId) {
                notification.set(config.fields.notifications.threadId, threadId);
            }
            
            // Obsah správy
            notification.set(config.fields.notifications.message, params.message);
            
            // Prepojenia
            notification.set(config.fields.notifications.groupOrTopic, params.telegramGroup);

            // Základné polia
            notification.set(config.fields.notifications.status, "Čaká");
            notification.set(config.fields.notifications.priority, 
                core.safeGet(params.telegramGroup, config.fields.telegramGroups.messagePriority, config.fields.notifications.messagePriority));
            notification.set(config.fields.notifications.messageType, params.messageType);
            notification.set(config.fields.notifications.messageSource, "Automatická");
            notification.set(config.fields.notifications.recipient, threadId ? "Skupina-Téma":"Skupina");
            
            // Info pole
            var infoMsg = "📋 NOTIFIKÁCIA - " + params.messageType.toUpperCase() + "\n";
            infoMsg += "Vytvorené: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
            infoMsg += "Zdrojová knižnica: " + lib().title + "\n";
            infoMsg += "Zdrojový záznam: #" + currentEntry.field("ID") + "\n";
            infoMsg += "Skupina: " + core.safeGet(params.telegramGroup, config.fields.telegramGroups.groupName) + "\n";
            infoMsg += "Chat ID: " + core.safeGet(params.telegramGroup, config.fields.telegramGroups.chatId) + "\n";
            if (threadId) {
                infoMsg += "Thread ID: " + threadId + "\n";
            }
            infoMsg += "Formátovanie: " + formatting;
            
            notification.set(config.fields.common.info, infoMsg);
            
            return notification;
            
        } catch (error) {
            core.addError(currentEntry, error.toString(), "createNotification", error);
            return null;
        }
    }

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
            
            // Dodatočné dáta
            if (data.summaryData) {
                notif.set(config.fields.common.info, data.summaryData);
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

    function linkNotification(notification, sourceEntry) {
        try {
            var core = getCore();
            var currentEntry = sourceEntry || entry();
            var existingNotifications = core.safeGet(currentEntry, "Notifikácie", []);
            existingNotifications.push(notification);
            currentEntry.set("Notifikácie", existingNotifications);
            
            core.addDebug(currentEntry, "  • Notifikácia nalinkovaná k záznamu");
            
        } catch (error) {
            core.addError(currentEntry, "Chyba pri linkovaní notifikácie: " + error.toString(), "linkNotification", error);
        }
    }
    // ==============================================
    // FUNKCIA PRE ZÍSKANIE TELEGRAM ID
    // ==============================================

    function getTelegramID(sourceEntry) {
        try {
            var core = getCore();
            var config = getConfig();
            var currentEntry = sourceEntry || entry();
            // Získaj typ adresáta
            var recipientType = core.safeGet(currentEntry, config.fields.notifications.recipient);
            
            if (!recipientType) {
                // Ak nie je vyplnený adresát, použi priame polia
                var directChatId = core.safeGet(currentEntry, config.fields.notifications.chatId);
                var directThreadId = core.safeGet(currentEntry, config.fields.notifications.threadId);
                
                if (directChatId) {
                    core.addDebug(currentEntry, "Používam priame Chat ID: " + directChatId);
                    return {
                        success: true,
                        chatId: directChatId,
                        threadId: directThreadId,
                        source: "direct"
                    };
                } else {
                    return {
                        success: false,
                        error: "Nie je definovaný adresát ani priame Chat ID"
                    };
                }
            }
            
            core.addDebug(currentEntry, "Typ adresáta: " + recipientType);
            
            // Získaj konfiguráciu pre daný typ
            var recipientconfig = config.recipientMapping[recipientType];
            if (!recipientconfig) {
                return {
                    success: false,
                    error: "Neznámy typ adresáta: " + recipientType
                };
            }
            
            // Spracuj podľa typu
            switch (recipientconfig.type) {
                case "individual":
                    return getTelegramFromIndividual(recipientconfig, currentEntry);
                    
                case "group":
                    return getTelegramFromGroup(recipientconfig, currentEntry);
                    
                case "customer":
                    return getTelegramFromOrder(recipientconfig, currentEntry);
                    
                default:
                    return {
                        success: false,
                        error: "Neznámy typ konfigurácie: " + recipientconfig.type
                    };
            }
            
        } catch (error) {
            core.addError(currentEntry, "Chyba v getTelegramID: " + error.toString(), "getTelegramID", error);
            return {
                success: false,
                error: error.toString()
            };
        }
    }

    function getTelegramFromOrder(recipientconfig, sourceEntry) {
        try {
            var core = getCore();
            var config = getConfig();
            var currentEntry = sourceEntry || entry();

            core.addDebug(currentEntry, "Získavam Telegram údaje cez Zákazku");
            
            // 1. Získaj zákazku z notifikácie
            var customerRecords = core.safeGet(currentEntry, recipientconfig.linkField);
            
            if (!customerRecords || customerRecords.length === 0) {
                return {
                    success: false,
                    error: "Nie je vyplnené pole '" + recipientconfig.linkField + "'"
                };
            }
            
            var customerRecord = customerRecords[0];
            var customerName = core.safeGet(customerRecord, "Názov") || 
                            core.safeGet(customerRecord, "Zákazka") || 
                            "Neznáma zákazka";
                            
            core.addDebug(currentEntry, "  • Zákazka: " + customerName);
            
            // 2. Získaj Telegram skupinu zo zákazky
            var telegramGroups = core.safeGet(customerRecord, recipientconfig.telegramGroupField);
            
            if (!telegramGroups || telegramGroups.length === 0) {
                return {
                    success: false,
                    error: "Zákazka '" + customerName + "' nemá priradenú Telegram skupinu"
                };
            }
            
            var telegramGroup = telegramGroups[0];
            var groupName = core.safeGet(telegramGroup, config.fields.telegramGroups.groupName) || "Neznáma skupina";
            
            core.addDebug(currentEntry, "  • Telegram skupina: " + groupName);
            
            // 3. Získaj Chat ID z Telegram skupiny
            var chatId = core.safeGet(telegramGroup, config.fields.telegramGroups.chatId);
            
            if (!chatId) {
                return {
                    success: false,
                    error: "Telegram skupina '" + groupName + "' nemá vyplnené Chat ID"
                };
            }
            
            // 4. Získaj Thread ID (ak existuje)
            var threadId = core.safeGet(telegramGroup, config.fields.telegramGroups.threadId);
            
            // 5. Kontrola či má skupina povolené notifikácie
            var notificationsEnabled = core.safeGet(telegramGroup, config.fields.telegramGroups.enableNotifications, true);
            
            if (!notificationsEnabled) {
                return {
                    success: false,
                    error: "Skupina '" + groupName + "' má vypnuté notifikácie"
                };
            }
            
            core.addDebug(currentEntry, "  • Chat ID získané: " + chatId);
            if (threadId) {
                core.addDebug(currentEntry, "  • Thread ID získané: " + threadId);
            }
            
            return {
                success: true,
                chatId: chatId,
                threadId: threadId,
                source: "customer",
                customerName: customerName,
                groupName: groupName
            };
            
        } catch (error) {
            core.addError(currentEntry, "Chyba pri získavaní údajov zo zákazky: " + error.toString(), "getTelegramFromOrder", error);
            return {
                success: false,
                error: "Chyba pri spracovaní zákazky: " + error.toString()
            };
        }
    }

    function getTelegramFromIndividual(recipientconfig, sourceEntry) {
        try {
            var core = getCore();
            var config = getConfig();
            var currentEntry = sourceEntry || entry();
            // Získaj linknutý záznam
            var linkedRecords = core.safeGet(currentEntry, recipientconfig.linkField);
            
            if (!linkedRecords || linkedRecords.length === 0) {
                return {
                    success: false,
                    error: "Nie je vyplnené pole '" + recipientconfig.linkField + "'"
                };
            }
            
            var linkedRecord = linkedRecords[0];
            
            // Získaj Telegram ID z linknutého záznamu
            var telegramId = core.safeGet(linkedRecord, recipientconfig.telegramField);
            
            if (!telegramId) {
                var recordName = core.safeGet(linkedRecord, "Nick") || 
                            core.safeGet(linkedRecord, "Názov") || 
                            core.safeGet(linkedRecord, "Meno") || 
                            "Neznámy";
                            
                return {
                    success: false,
                    error: "Adresát '" + recordName + "' nemá vyplnené Telegram ID"
                };
            }
            
            core.addDebug(currentEntry, "Telegram ID získané z " + recipientconfig.linkField + ": " + telegramId);
            
            return {
                success: true,
                chatId: telegramId,
                threadId: null,
                source: recipientconfig.linkField,
                recipientName: recordName
            };
            
        } catch (error) {
            return {
                success: false,
                error: "Chyba pri získavaní Telegram ID: " + error.toString()
            };
        }
    }

    function getTelegramFromGroup(recipientconfig, sourceEntry) {
        try {
            var core = getCore();
            var currentEntry = sourceEntry || entry();
            
            // Získaj linknutú skupinu
            var linkedGroups = core.safeGet(currentEntry, recipientconfig.linkField);
            
            if (!linkedGroups || linkedGroups.length === 0) {
                return {
                    success: false,
                    error: "Nie je vyplnené pole '" + recipientconfig.linkField + "'"
                };
            }
            
            var groupRecord = linkedGroups[0];
            
            // Získaj Chat ID
            var chatId = core.safeGet(groupRecord, recipientconfig.chatIdField);
            
            if (!chatId) {
                var groupName = core.safeGet(groupRecord, "Názov skupiny") || "Neznáma skupina";
                return {
                    success: false,
                    error: "Skupina '" + groupName + "' nemá vyplnené Chat ID"
                };
            }
            
            // Pre Skupina-Téma získaj aj Thread ID
            var threadId = null;
            if (recipientconfig.threadIdField) {
                threadId = core.safeGet(groupRecord, recipientconfig.threadIdField);
                
                if (!threadId && recipientconfig.threadIdField) {
                    core.addDebug(currentEntry, "⚠️ Skupina-Téma nemá Thread ID, posielam do hlavného chatu");
                }
            }
            
            core.addDebug(currentEntry, "Chat údaje získané zo skupiny: " + groupName);
            
            return {
                success: true,
                chatId: chatId,
                threadId: threadId,
                source: "group",
                groupName: groupName
            };
            
        } catch (error) {
            return {
                success: false,
                error: "Chyba pri získavaní skupinových údajov: " + error.toString()
            };
        }
    }

    function getTelegramGroup(telegramGroupField, sourceEntry) {
        try {
            var core = getCore();
            var config = getConfig();
            var currentEntry = sourceEntry || entry();
            var defaultsLib = libByName(config.libraries.defaults);
            if (!defaultsLib) return null;
            
            var settings = defaultsLib.entries();
            if (!settings || settings.length === 0) return null;
            
            var defaultSettings = settings[settings.length - 1];
            
            // Získaj pole telegram skupín (je to array!)
            var telegramGroupEntries = core.safeGet(defaultSettings, telegramGroupField);
            
            if (!telegramGroupEntries || telegramGroupEntries.length === 0) {
                core.addError(currentEntry, "Telegram skupina nie je nastavená v poli '" + telegramGroupField + "'", "getTelegramGroup");
                return null;
            }
            
            // Vyber prvú skupinu z array
            var telegramGroup = telegramGroupEntries[0];
            
            // Kontrola povolených notifikácií
            var notificationsEnabled = core.safeGet(telegramGroup, config.fields.telegramGroups.enableNotifications, false);
            if (!notificationsEnabled) {
                core.addDebug(currentEntry, core.getIcon("warning") + " Skupina má vypnuté notifikácie");
                return null;
            }
            
            var groupName = core.safeGet(telegramGroup, config.fields.telegramGroups.groupName);
            var chatId = core.safeGet(telegramGroup, config.fields.telegramGroups.chatId);
            
            core.addDebug(currentEntry, "  • Skupina: " + groupName);
            core.addDebug(currentEntry, "  • Chat ID: " + chatId);
            
            return telegramGroup;
            
        } catch (error) {
            core.addError(currentEntry, error.toString(), "getTelegramGroup", error);
            return null;
        }
    }
    // ==============================================
    // POMOCNÉ FUNKCIE
    // ==============================================

    function isNewRecord(sourceEntry) {
        var core = getCore();
        var config = getConfig();
        var currentEntry = sourceEntry || entry();

        var createdDate = core.safeGet(currentEntry, config.fields.common.createdDate);
        var modifiedDate = core.safeGet(currentEntry, config.fields.common.modifiedDate);
        
        if (!createdDate || !modifiedDate) return true;
        
        var timeDiff = Math.abs(moment(createdDate).diff(moment(modifiedDate), 'seconds'));
        return timeDiff < 5;
    }

    function updateStatus(status, error, sourceEntry) {
        try {
            var core = getCore();
            var config = getConfig();
            var currentEntry = sourceEntry || entry();
            currentEntry.set(config.fields.notifications.status, status);
            
            if (error) {
                currentEntry.set(config.fields.notifications.lastError, error);
                
                var retryCount = core.safeGet(currentEntry, config.fields.notifications.retryCount, 0);
                currentEntry.set(config.fields.notifications.retryCount, retryCount + 1);
            }
            
            currentEntry.set(config.fields.notifications.lastUpdate, new Date());
            
        } catch (e) {
            core.addError(currentEntry, "Chyba pri update statusu: " + e.toString(), "updateStatus", e);
        }
    } 

    function detectFormatting(message) {
        // Detekuj HTML tagy
        if (message.match(/<[^>]+>/)) {
            return "HTML";
        }
        // Detekuj Markdown
        else if (message.match(/\*[^*]+\*|_[^_]+_|`[^`]+`|\[.+\]\(.+\)/)) {
            return "Markdown";
        }
        // Defaultne text
        return "Text";
    }

    function checkPermissions(permissionField, sourceEntry) {
        try {
            var core = getCore();
            var config = getConfig();
            var currentEntry = sourceEntry || entry();

            var defaultsLib = libByName(config.libraries.defaults);
            if (!defaultsLib) return false;
            
            var settings = defaultsLib.entries();
            if (!settings || settings.length === 0) return false;
            
            var defaultSettings = settings[settings.length - 1];
            var enabled = core.safeGet(defaultSettings, permissionField, false);
            
            core.addDebug(currentEntry, "  • " + permissionField + ": " + (enabled ? "ÁNO" : "NIE"));
            
            return enabled;
            
        } catch (error) {
            core.addError(currentEntry, error.toString(), "checkPermissions", error);
            return false;
        }
    }

    function escapeMarkdown(text) {
        if (!text) return "";
        
        // Escape špeciálne znaky pre Markdown
        return String(text)
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
     * @returns {Object} Inline keyboard objekt
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
        
        // OPRAVA: Vráť priamo pole, nie objekt s inline_keyboard
        return keyboard;
    }

    // ==============================================
    // AKTUALIZÁCIA ZDROJOVÉHO ZÁZNAMU
    // ==============================================

    function updateSourceEntryInfo(sendResult, telegramData, sourceEntry) {
        try {
            var core = getCore();
            var config = getConfig();
            var currentEntry = sourceEntry || entry();
            // Získaj zdrojový záznam (ak existuje prepojenie)
            var sourceLibrary = core.safeGet(currentEntry, "Zdrojová knižnica");
            var sourceEntryId = core.safeGet(currentEntry, "Zdrojový záznam ID");
            
            if (!sourceLibrary || !sourceEntryId) {
                core.addDebug(currentEntry, "Zdrojový záznam nie je definovaný");
                return;
            }
            
            // Nájdi zdrojový záznam
            var sourceLib = libByName(sourceLibrary);
            if (!sourceLib) {
                core.addDebug(currentEntry, "Zdrojová knižnica '" + sourceLibrary + "' nenájdená");
                return;
            }
            
            var sourceEntries = sourceLib.find("ID", sourceEntryId);
            if (!sourceEntries || sourceEntries.length === 0) {
                core.addDebug(currentEntry, "Zdrojový záznam ID " + sourceEntryId + " nenájdený");
                return;
            }
            
            var sourceEntry = sourceEntries[0];
            
            // Aktualizuj info pole zdrojového záznamu
            var existingInfo = core.safeGet(sourceEntry, config.fields.common.info, "");
            
            var updateInfo = "\n\n📨 TELEGRAM NOTIFIKÁCIA ODOSLANÁ\n";
            updateInfo += "═══════════════════════════════════\n";
            updateInfo += "Čas: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
            updateInfo += "Message ID: " + sendResult.messageId + "\n";
            updateInfo += "Chat ID: " + sendResult.chatId + "\n";
            
            if (telegramData.threadId) {
                updateInfo += "Thread ID: " + telegramData.threadId + "\n";
            }
            
            if (telegramData.recipientName) {
                updateInfo += "Adresát: " + telegramData.recipientName + "\n";
            }
            
            if (telegramData.customerName) {
                updateInfo += "Zákazka: " + telegramData.customerName + "\n";
            }
            
            if (telegramData.groupName) {
                updateInfo += "Skupina: " + telegramData.groupName + "\n";
            }
            
            updateInfo += "Notifikácia ID: " + currentEntry.field("ID") + "\n";
            updateInfo += "Script: " + config.scriptName + " v" + config.version;
            
            sourceEntry.set(config.fields.common.info, existingInfo + updateInfo);
            
            core.addDebug(currentEntry, "Info pole zdrojového záznamu aktualizované");
            
        } catch (error) {
            core.addError(currentEntry, "Chyba pri aktualizácii zdrojového záznamu: " + error.toString(), "updateSourceEntryInfo", error);
        }
    }

    function updateAfterSuccess(sendResult, telegramData, sourceEntry) {
        try {
            var core = getCore();
            var config = getConfig();
            var currentEntry = sourceEntry;
            // Aktualizuj status
            currentEntry.set(config.fields.notifications.status, "Odoslané");
            
            // Ulož Telegram údaje
            currentEntry.set(config.fields.notifications.messageId, sendResult.messageId);
            currentEntry.set(config.fields.notifications.chatId, sendResult.chatId);
            
            if (telegramData.threadId) {
                currentEntry.set(config.fields.notifications.threadId, telegramData.threadId);
            }
            
            // Časové údaje
            currentEntry.set(config.fields.notifications.lastMessage, new Date());
            
            // Aktualizuj info pole
            var infoMsg = core.safeGet(currentEntry, config.fields.common.info, "");
            infoMsg += "\n\n✅ ÚSPEŠNE ODOSLANÉ\n";
            infoMsg += "Čas odoslania: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
            infoMsg += "Message ID: " + sendResult.messageId + "\n";
            infoMsg += "Chat ID: " + sendResult.chatId + "\n";
            
            if (telegramData.threadId) {
                infoMsg += "Thread ID: " + telegramData.threadId + "\n";
            }
            
            infoMsg += "Zdroj Chat ID: " + telegramData.source + "\n";
            
            if (telegramData.recipientName) {
                infoMsg += "Adresát: " + telegramData.recipientName + "\n";
            }
            
            if (telegramData.customerName) {
                infoMsg += "Zákazka: " + telegramData.customerName + "\n";
            }
            
            if (telegramData.groupName) {
                infoMsg += "Skupina: " + telegramData.groupName + "\n";
            }
            
            currentEntry.set(config.fields.common.info, infoMsg);
            
            core.addDebug(currentEntry, "Záznam aktualizovaný po odoslaní");
            
        } catch (error) {
            core.addError(currentEntry, "Chyba pri aktualizácii záznamu: " + error.toString(), "updateAfterSuccess", error);
        }
    }   
    // ==============================================
    // NOTIFIKÁCIE
    //
    function getLinkedNotifications(sourceEntry) {
        try {
            var core = getCore();
            var config = getConfig();
            var currentEntry = sourceEntry
            var notifications = core.safeGetLinks(currentEntry, config.fields.common.notifications);
            return notifications || [];
        } catch (error) {
            return [];
        }
    }

    function linkNotificationToSource(sourceEntry, notificationEntry) {
        try {
            var core = getCore();
            var config = getConfig();
            var currentNotifications = core.safeGetLinks(sourceEntry, config.fields.common.notifications);
            currentNotifications.push(notificationEntry);
            sourceEntry.set(config.fields.common.notifications, currentNotifications);
            return true;
        } catch (error) {
            return false;
        }
    }

    function deleteNotificationAndTelegram(notificationEntry) {
        try {
            var core = getCore();
            var config = getConfig();
            // 1. Získaj Telegram údaje
            var chatId = core.safeGet(notificationEntry, "Chat ID");
            var messageId = core.safeGet(notificationEntry, "Message ID");
            
            // 2. Vymaž z Telegramu (ak existuje message ID)
            if (chatId && messageId) {
                deleteTelegramMessage(chatId, messageId);
            }
            
            // 3. Vymaž z knižnice Notifications
            notificationEntry.trash();
            return true;
        } catch (error) {
            return false;
        }
    }


    // ==============================================
    // PUBLIC API
    // ==============================================

    return {
        // Module metadata
        info: MODULE_INFO,
        version: version,

        // Základné Telegram funkcie
        createTelegramMessage: createTelegramMessage,
        editTelegramMessage: editTelegramMessage,
        deleteTelegramMessage: deleteTelegramMessage,
        getBotToken: getBotToken,
        
        sendTelegramMessage: sendTelegramMessage,
        sendToTelegram: sendToTelegram,
        sendNotificationEntry: sendNotificationEntry,
        //  sendToTelegramThread: sendToTelegramThread,
        
        // Skupiny a témy
        getTelegramGroup: getTelegramGroup,
        getTelegramID: getTelegramID,
        getTelegramFromIndividual: getTelegramFromIndividual,
        getTelegramFromGroup: getTelegramFromGroup,
        getTelegramFromOrder: getTelegramFromOrder,
        
        // Notifikácie
        createNotification: createNotification,
        createNotificationEntry: createNotificationEntry,
        linkNotification: linkNotification,
        linkNotificationToSource: linkNotificationToSource,
        
        // CLEANUP
        cleanupOldNotifications: cleanupOldNotifications,
        getLinkedNotifications: getLinkedNotifications,
        deleteNotificationAndTelegram: deleteNotificationAndTelegram,
        
        // POMOCNÉ FUNKCIE
        isNewRecord: isNewRecord,
        checkPermissions: checkPermissions,
        updateStatus: updateStatus,
        detectFormatting: detectFormatting,
        escapeMarkdown: escapeMarkdown,
        createInlineKeyboard: createInlineKeyboard,
        
        // UPDATING Entry fields
        updateSourceEntryInfo: updateSourceEntryInfo,
        updateAfterSuccess: updateAfterSuccess,

    };
})();