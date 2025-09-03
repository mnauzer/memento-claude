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

            var defaultsLib = libByName(CONFIG.libraries.defaults);
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
            var defaultsLib = libByName(CONFIG.libraries.defaults);
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
            var notificationsEnabled = core.safeGet(telegramGroup, CONFIG.fields.telegramGroups.enableNotifications, false);
            if (!notificationsEnabled) {
                core.addDebug(currentEntry, core.getIcon("warning") + " Skupina má vypnuté notifikácie");
                return null;
            }
            
            var groupName = core.safeGet(telegramGroup, CONFIG.fields.telegramGroups.groupName);
            var chatId = core.safeGet(telegramGroup, CONFIG.fields.telegramGroups.chatId);
            
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
            var notifLib = libByName(CONFIG.libraries.notifications);
            if (!notifLib) {
                core.addError(currentEntry, "Knižnica " + CONFIG.libraries.notifications + " nenájdená", "createNotification");
                return null;
            }
            
            var notification = notifLib.create({});
            
        
            
            // Formátovanie - detekuj podľa obsahu správy
            var formatting = detectFormatting(params.message);
            notification.set(CONFIG.fields.notifications.formatting, formatting);
            
            // Telegram polia
            notification.set(CONFIG.fields.notifications.chatId, 
                core.safeGet(params.telegramGroup, CONFIG.fields.telegramGroups.chatId));
            
            var threadId = core.safeGet(params.telegramGroup, CONFIG.fields.telegramGroups.threadId);
            if (threadId) {
                notification.set(CONFIG.fields.notifications.threadId, threadId);
            }
            
            // Obsah správy
            notification.set(CONFIG.fields.notifications.message, params.message);
            
            // Prepojenia
            notification.set(CONFIG.fields.notifications.groupOrTopic, params.telegramGroup);

            // Základné polia
            notification.set(CONFIG.fields.notifications.status, "Čaká");
            notification.set(CONFIG.fields.notifications.priority, 
                core.safeGet(params.telegramGroup, CONFIG.fields.telegramGroups.messagePriority, CONFIG.fields.notifications.messagePriority));
            notification.set(CONFIG.fields.notifications.messageType, params.messageType);
            notification.set(CONFIG.fields.notifications.messageSource, "Automatická");
            notification.set(CONFIG.fields.notifications.recipient, threadId ? "Skupina-Téma":"Skupina");
            
            // Info pole
            var infoMsg = "📋 NOTIFIKÁCIA - " + params.messageType.toUpperCase() + "\n";
            infoMsg += "Vytvorené: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
            infoMsg += "Zdrojová knižnica: " + lib().title + "\n";
            infoMsg += "Zdrojový záznam: #" + currentEntry.field("ID") + "\n";
            infoMsg += "Skupina: " + core.safeGet(params.telegramGroup, CONFIG.fields.telegramGroups.groupName) + "\n";
            infoMsg += "Chat ID: " + core.safeGet(params.telegramGroup, CONFIG.fields.telegramGroups.chatId) + "\n";
            if (threadId) {
                infoMsg += "Thread ID: " + threadId + "\n";
            }
            infoMsg += "Formátovanie: " + formatting;
            
            notification.set(CONFIG.fields.common.info, infoMsg);
            
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
        
     
    };
})();