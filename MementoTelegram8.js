// ==============================================
// MEMENTO TELEGRAM - Telegram integrácia
// Verzia: 8.0 | Dátum: December 2024 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
//    - Telegram Bot API integrácia
//    - Odosielanie, editácia a mazanie správ
//    - Práca s thread/témami
//    - Notifikačný systém
//    - Group summary funkcie
//    - Message formatting a šablóny
// ==============================================
// 🔧 CHANGELOG v8.0:
//    - Pridané Group Summary funkcie
//    - Message formatting šablóny
//    - Agregačné funkcie
//    - Štatistické funkcie
//    - Refaktorovaná štruktúra
// ==============================================

var MementoTelegram = (function() {
    'use strict';
    
    var version = "8.0";
    
    // Lazy loading pre závislosti
    var _config = null;
    var _core = null;
    var _ai = null;
    
    function getConfig() {
        if (!_config && typeof MementoConfig !== 'undefined') {
            _config = Mementoconfig.getConfig();
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
// POMOCNÉ FUNKCIE
// ==============================================

    function checkPermissions(permissionField) {
        try {
            var core = getCore();

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

    function getTelegramGroup(telegramGroupField) {
        try {
            var core = getCore();
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

    function cleanupOldNotifications() {
        try {
            var core = getCore();
            var existingNotifications = core.safeGet(currentEntry, "Notifikácie", []);
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
            currentEntry.set("Notifikácie", []);
            
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

    function createNotification(params) {
        try {
            var core = getCore();
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

    function linkNotification(notification) {
        try {
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

    function getTelegramID() {
        try {
            var core = getCore();
            if (!core) return null;
            
            var config = getConfig();
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
            var recipientConfig = config.recipientMapping[recipientType];
            if (!recipientConfig) {
                return {
                    success: false,
                    error: "Neznámy typ adresáta: " + recipientType
                };
            }
            
            // Spracuj podľa typu
            switch (recipientconfig.type) {
                case "individual":
                    return getTelegramFromIndividual(recipientConfig);
                    
                case "group":
                    return getTelegramFromGroup(recipientConfig);
                    
                case "customer":
                    return getTelegramFromCustomer(recipientConfig);
                    
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

    // ==============================================
    // FUNKCIA PRE ZÍSKANIE TELEGRAM ID ZO ZÁKAZKY
    // ==============================================

    function getTelegramFromCustomer(recipientConfig) {
        try {
            var core = getCore();
            if (!core) return null;
            var config = getConfig();

            core.addDebug(currentEntry, "Získavam Telegram údaje cez Zákazku");
            
            // 1. Získaj zákazku z notifikácie
            var customerRecords = core.safeGet(currentEntry, recipientConfig.linkField);
            
            if (!customerRecords || customerRecords.length === 0) {
                return {
                    success: false,
                    error: "Nie je vyplnené pole '" + recipientConfig.linkField + "'"
                };
            }
            
            var customerRecord = customerRecords[0];
            var customerName = core.safeGet(customerRecord, "Názov") || 
                            core.safeGet(customerRecord, "Zákazka") || 
                            "Neznáma zákazka";
                            
            core.addDebug(currentEntry, "  • Zákazka: " + customerName);
            
            // 2. Získaj Telegram skupinu zo zákazky
            var telegramGroups = core.safeGet(customerRecord, recipientConfig.telegramGroupField);
            
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
            core.addError(currentEntry, "Chyba pri získavaní údajov zo zákazky: " + error.toString(), "getTelegramFromCustomer", error);
            return {
                success: false,
                error: "Chyba pri spracovaní zákazky: " + error.toString()
            };
        }
    }
    // ==============================================
    // POMOCNÉ FUNKCIE
    // ==============================================

    function isNewRecord() {
        var core = getCore();
        var config = getConfig();

        var createdDate = core.safeGet(currentEntry, config.fields.common.createdDate);
        var modifiedDate = core.safeGet(currentEntry, config.fields.common.modifiedDate);
        
        if (!createdDate || !modifiedDate) return true;
        
        var timeDiff = Math.abs(moment(createdDate).diff(moment(modifiedDate), 'seconds'));
        return timeDiff < 5;
    }

    function updateStatus(status, error) {
        try {
            var core = getCore();
            var config = getConfig();
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
    // ==============================================
    // AKTUALIZÁCIA ZDROJOVÉHO ZÁZNAMU
    // ==============================================

    function updateSourceEntryInfo(sendResult, telegramData) {
        try {
            var core = getCore();
            var config = getConfig();
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
    // ==============================================
    // GROUP MANAGEMENT
    // ==============================================
    
    // /**
    //  * Získa Telegram skupinu podľa ID
    //  * @param {string} groupId - ID skupiny alebo názov
    //  * @returns {Entry|null} Entry skupiny alebo null
    //  */
    // function getTelegramGroup(groupId) {
    //     try {
    //         var config = getConfig();
    //         var groupsLib = config ? config.libraries.telegramGroups : "Telegram Groups";
            
    //         var lib = libByName(groupsLib);
    //         if (!lib) {
    //             return null;
    //         }
            
    //         // Hľadaj podľa ID alebo názvu
    //         var groups = lib.find(config.fields.telegramGroups.chatId, groupId);
    //         if (!groups || groups.length === 0) {
    //             groups = lib.find(config.fields.telegramGroups.groupName, groupId);
    //         }
            
    //         return groups && groups.length > 0 ? groups[0] : null;
            
    //     } catch (error) {
    //         return null;
    //     }
    // }
    // ==============================================
// ODOSLANIE NA TELEGRAM
// ==============================================

    function sendToTelegram(chatId, message, threadId) {
        try {
            var core = getCore();
            var config = getConfig();
            var formatting = core.safeGet(currentEntry, config.fields.notifications.formatting, "Markdown");
            var silent = core.safeGet(currentEntry, "Tichá správa", false);
            
            var options = {
                parseMode: formatting,
                silent: silent,
                createNotification: false // Netvoriť ďalšiu notifikáciu
            };
            
            if (threadId) {
                options.threadId = threadId;
            }
            
            core.addDebug(currentEntry, "Odosielam správu:");
            core.addDebug(currentEntry, "  • Chat ID: " + chatId);
            core.addDebug(currentEntry, "  • Thread ID: " + (threadId || "N/A"));
            core.addDebug(currentEntry, "  • Formátovanie: " + formatting);
            core.addDebug(currentEntry, "  • Tichá správa: " + (silent ? "Áno" : "Nie"));
            
            var result = core.sendTelegramMessage(chatId, message, options);
            
            if (result.success) {
                core.addDebug(currentEntry, core.getIcon("success") + " Správa odoslaná, Message ID: " + result.messageId);
                return {
                    success: true,
                    messageId: result.messageId,
                    chatId: result.chatId,
                    date: result.date
                };
            } else {
                return {
                    success: false,
                    error: result.error || "Neznáma chyba"
                };
            }
            
        } catch (error) {
            core.addError(currentEntry, "Chyba pri odosielaní: " + error.toString(), "sendToTelegram", error);
            return {
                success: false,
                error: error.toString()
            };
        }
    }

    // ==============================================
    // AKTUALIZÁCIA PO ÚSPEŠNOM ODOSLANÍ
    // ==============================================

    function updateAfterSuccess(sendResult, telegramData) {
        try {
            var core = getCore();
            var config = getConfig();
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
    // POMOCNÉ FUNKCIE PRE ZÍSKANIE TELEGRAM ID
    // ==============================================

    function getTelegramFromIndividual(recipientConfig) {
        try {
            var core = getCore();
            var config = getConfig();
            // Získaj linknutý záznam
            var linkedRecords = core.safeGet(currentEntry, recipientConfig.linkField);
            
            if (!linkedRecords || linkedRecords.length === 0) {
                return {
                    success: false,
                    error: "Nie je vyplnené pole '" + recipientConfig.linkField + "'"
                };
            }
            
            var linkedRecord = linkedRecords[0];
            
            // Získaj Telegram ID z linknutého záznamu
            var telegramId = core.safeGet(linkedRecord, recipientConfig.telegramField);
            
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
            
            core.addDebug(currentEntry, "Telegram ID získané z " + recipientConfig.linkField + ": " + telegramId);
            
            return {
                success: true,
                chatId: telegramId,
                threadId: null,
                source: recipientConfig.linkField,
                recipientName: recordName
            };
            
        } catch (error) {
            return {
                success: false,
                error: "Chyba pri získavaní Telegram ID: " + error.toString()
            };
        }
    }

    function getTelegramFromGroup(recipientConfig) {
        try {
            var core = getCore();
            
            // Získaj linknutú skupinu
            var linkedGroups = core.safeGet(currentEntry, recipientConfig.linkField);
            
            if (!linkedGroups || linkedGroups.length === 0) {
                return {
                    success: false,
                    error: "Nie je vyplnené pole '" + recipientConfig.linkField + "'"
                };
            }
            
            var groupRecord = linkedGroups[0];
            
            // Získaj Chat ID
            var chatId = core.safeGet(groupRecord, recipientConfig.chatIdField);
            
            if (!chatId) {
                var groupName = core.safeGet(groupRecord, "Názov skupiny") || "Neznáma skupina";
                return {
                    success: false,
                    error: "Skupina '" + groupName + "' nemá vyplnené Chat ID"
                };
            }
            
            // Pre Skupina-Téma získaj aj Thread ID
            var threadId = null;
            if (recipientConfig.threadIdField) {
                threadId = core.safeGet(groupRecord, recipientConfig.threadIdField);
                
                if (!threadId && recipientConfig.threadIdField) {
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

    /**
     * Odošle správu do konkrétnej témy v skupine
     * @param {string} groupId - ID skupiny
     * @param {string} threadId - ID témy
     * @param {string} text - Text správy
     * @param {Object} options - Dodatočné parametre
     * @returns {Object} Výsledok operácie
     */
    // function sendToTelegramThread(groupId, threadId, text, options) {
    //     options = options || {};
    //     options.threadId = threadId;
        
    //     return sendTelegramMessage(groupId, text, options);
    // }
    
    // /**
    //  * Odošle súhrnnú správu do skupiny
    //  * @param {string} groupId - ID skupiny
    //  * @param {Object} summaryData - Dáta pre súhrn
    //  * @param {Object} options - Možnosti odoslania
    //  * @returns {Object} Výsledok odoslania
    //  */
    // function sendGroupSummary(groupId, summaryData, options) {
    //     try {
    //         var core = getCore();
    //         var config = getConfig();
            
    //         // Získaj skupinu
    //         var group = getTelegramGroup(groupId);
    //         if (!group) {
    //             throw new Error("Skupina nenájdená: " + groupId);
    //         }
            
    //         // Skontroluj či má skupina povolené notifikácie
    //         if (!group.field(config.fields.telegramGroups.enableNotifications)) {
    //             return {
    //                 success: false,
    //                 error: "Skupina nemá povolené notifikácie"
    //             };
    //         }
            
    //         // Sformátuj správu podľa typu
    //         var template = options.template || 'summary';
    //         var message = formatTelegramMessage(summaryData, template);
            
    //         // Priprav možnosti odoslania
    //         var sendOptions = {
    //             parseMode: options.parseMode || "Markdown",
    //             silent: options.silent || group.field(config.fields.telegramGroups.silentMessage),
    //             disablePreview: true
    //         };
            
    //         // Pridaj thread ID ak existuje
    //         if (group.field(config.fields.telegramGroups.hasTopic)) {
    //             sendOptions.threadId = group.field(config.fields.telegramGroups.threadId);
    //         }
            
    //         // Odošli správu
    //         var result = sendTelegramMessage(
    //             group.field(config.fields.telegramGroups.chatId),
    //             message,
    //             sendOptions
    //         );
            
    //         // Vytvor notifikačný záznam
    //         if (result.success && options.createNotification !== false) {
    //             createNotificationEntry("group_summary", {
    //                 chatId: group.field(config.fields.telegramGroups.chatId),
    //                 messageId: result.messageId,
    //                 groupName: group.field(config.fields.telegramGroups.groupName),
    //                 summaryType: template,
    //                 summaryData: JSON.stringify(summaryData)
    //             });
    //         }
            
    //         // Aktualizuj štatistiky skupiny
    //         if (result.success) {
    //             updateGroupStats(group);
    //         }
            
    //         return result;
            
    //     } catch (error) {
    //         if (core) {
    //             core.addError(entry(), "Odoslanie group summary zlyhalo: " + error.toString(), "sendGroupSummary", error);
    //         }
    //         return { 
    //             success: false, 
    //             error: error.toString() 
    //         };
    //     }
    // }
    
    // /**
    //  * Odošle denný súhrn do skupín
    //  */
    // function sendDailySummary(date, targetGroups) {
    //     try {
    //         var config = getConfig();
    //         var core = getCore();
            
    //         // Získaj dáta pre súhrn
    //         var attendanceData = getDailyAttendanceData(date);
    //         var workRecordData = getDailyWorkRecordData(date);
            
    //         // Agreguj dáta
    //         var allEntries = attendanceData.concat(workRecordData);
    //         var aggregated = aggregateDataForGroup(allEntries);
            
    //         // Vytvor súhrn
    //         var summaryData = {
    //             title: "Denný súhrn",
    //             date: date,
    //             attendance: {
    //                 employeeCount: attendanceData.length > 0 ? attendanceData[0].field(config.fields.attendance.employeeCount) : 0,
    //                 totalHours: aggregated.totalHours,
    //                 totalCosts: aggregated.totalCosts
    //             },
    //             workRecords: {
    //                 count: workRecordData.length,
    //                 totalHours: workRecordData.reduce(function(sum, wr) {
    //                     return sum + (wr.field(config.fields.workRecord.workedHours) || 0);
    //                 }, 0),
    //                 totalHZS: workRecordData.reduce(function(sum, wr) {
    //                     return sum + (wr.field(config.fields.workRecord.hzsSum) || 0);
    //                 }, 0)
    //             },
    //             topEmployees: getTopEmployees(aggregated.employeeStats, 3)
    //         };
            
    //         // Odošli do skupín
    //         var results = [];
    //         targetGroups.forEach(function(group) {
    //             var result = sendGroupSummary(group.field("ID"), summaryData, {
    //                 template: 'daily'
    //             });
    //             results.push(result);
    //         });
            
    //         return results;
            
    //     } catch (error) {
    //         if (core) {
    //             core.addError(entry(), "Denný súhrn zlyhal: " + error.toString(), "sendDailySummary", error);
    //         }
    //         return [];
    //     }
    // }
    
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
    
    // ==============================================
    // HELPER FUNKCIE
    // ==============================================
    
    /**
     * Formátuje text pre Telegram Markdown
     * @param {string} text - Text na formátovanie
     * @returns {string} Formátovaný text
     */
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
        
        // Základné Telegram funkcie
        sendTelegramMessage: sendTelegramMessage,
        editTelegramMessage: editTelegramMessage,
        deleteTelegramMessage: deleteTelegramMessage,
        getBotToken: getBotToken,
        
        // Skupiny a témy
        getTelegramGroup: getTelegramGroup,
        sendToTelegramThread: sendToTelegramThread,
        
        checkPermissions: checkPermissions,
        cleanupOldNotifications: cleanupOldNotifications,
        createNotification: createNotification,
        linkNotification: linkNotification,

        //
        escapeMarkdown: escapeMarkdown,
        createInlineKeyboard: createInlineKeyboard,


        // Notifikácie
        createNotificationEntry: createNotificationEntry,

        // new
        // getTelegramID: getTelegramID,
        // getTelegramFromCustomer: getTelegramFromCustomer,
        // isNewRecord: isNewRecord,
        // updateStatus: updateStatus,
        // updateSourceEntryInfo: updateSourceEntryInfo,
        // sendToTelegram: sendToTelegram,
        // updateAfterSuccess: updateAfterSuccess,
        // getTelegramFromIndividual: getTelegramFromIndividual,
        // getTelegramFromGroup: getTelegramFromGroup,





    };
})();