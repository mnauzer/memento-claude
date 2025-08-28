// ==============================================
// NOTIFICATION CREATING TRIGGER - Odoslanie na Telegram
// Verzia: 8.0 | Dátum: December 2024 | Autor: ASISTANTO
// Knižnica: Notifications | Trigger: Creating an Entry
// ==============================================
// 📋 FUNKCIA:
//    - Po vytvorení záznamu v knižnici Notifications
//    - Odošle správu na Telegram podľa nastavení
//    - Podporuje skupiny aj témy (threads)
//    - Aktualizuje stav notifikácie po odoslaní
// ==============================================
// 🔧 POUŽÍVA:
//    - MementoUtils v7.0+ (agregátor)
//    - MementoTelegram v8.0 (Telegram funkcie)
//    - MementoConfig v7.0+ (centrálny CONFIG)
//    - MementoCore v7.0+ (základné funkcie)
// ==============================================
// ✅ REFAKTOROVANÉ v8.0:
//    - Kompletná integrácia s MementoUtils
//    - Využitie MementoTelegram pre odosielanie
//    - Centralizovaný CONFIG z MementoConfig
//    - Konzistentné error/debug logovanie
// ==============================================

// ==============================================
// INICIALIZÁCIA MODULOV
// ==============================================

var utils = MementoUtils;
var telegram = MementoTelegram;
var centralConfig = utils.config;
var currentEntry = entry();

var CONFIG = {
    // Script špecifické nastavenia
    scriptName: "Notification Creating Trigger",
    version: "8.0",
    
    // Referencie na centrálny config
    fields: centralConfig.fields,
    libraries: centralConfig.libraries,
    icons: centralConfig.icons,
    constants: centralConfig.constants,
    
    // Lokálne nastavenia
    settings: {
        defaultParseMode: "Markdown",
        maxRetries: 3,
        retryDelay: 1000,
        validateMessage: true,
        updateStatusAfterSend: true,
        logToDebug: true
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, utils.getIcon("start") + " === NOTIFICATION TRIGGER v" + CONFIG.version + " ===");
        utils.addDebug(currentEntry, "Čas spustenia: " + utils.formatDate(moment()));
        
        // 1. KONTROLA ZÁVISLOSTÍ
        var depCheck = utils.checkDependencies(['config', 'core', 'telegram']);
        if (!depCheck.success) {
            utils.addError(currentEntry, "Chýbajú potrebné moduly: " + depCheck.missing.join(", "), "main");
            message("❌ Chýbajú potrebné moduly!\n\n" + depCheck.missing.join(", "));
            cancel();
        }
        
        // 2. VALIDÁCIA NOTIFIKÁCIE
        utils.addDebug(currentEntry, utils.getIcon("validation") + " Validujem notifikáciu");
        
        var validationResult = validateNotification();
        if (!validationResult.success) {
            utils.addError(currentEntry, "Validácia zlyhala: " + validationResult.error, "main");
            setNotificationStatus("Chyba", validationResult.error);
            return;
        }
        
        utils.addDebug(currentEntry, "  • Typ správy: " + validationResult.messageType);
        utils.addDebug(currentEntry, "  • Priorita: " + validationResult.priority);
        utils.addDebug(currentEntry, "  • Chat ID: " + validationResult.chatId);
        
        // 3. KONTROLA ČASU A OBMEDZENÍ
        utils.addDebug(currentEntry, utils.getIcon("time") + " Kontrolujem časové obmedzenia");
        
        if (!checkTimeRestrictions()) {
            utils.addDebug(currentEntry, utils.getIcon("warning") + " Správa odložená - mimo pracovného času");
            setNotificationStatus("Odložené", "Mimo pracovného času");
            return;
        }
        
        // 4. PRÍPRAVA SPRÁVY
        utils.addDebug(currentEntry, utils.getIcon("document") + " Pripravujem správu");
        
        var messageData = prepareMessage();
        if (!messageData.success) {
            utils.addError(currentEntry, "Príprava správy zlyhala: " + messageData.error, "main");
            setNotificationStatus("Chyba", "Nepodarilo sa pripraviť správu");
            return;
        }
        
        // 5. ODOSLANIE NA TELEGRAM
        utils.addDebug(currentEntry, utils.getIcon("telegram") + " Odosielam na Telegram");
        
        var sendResult = sendToTelegram(
            validationResult.chatId,
            messageData.message,
            validationResult.threadId,
            validationResult.silent
        );
        
        if (sendResult.success) {
            utils.addDebug(currentEntry, utils.getIcon("success") + " Správa odoslaná úspešne");
            utils.addDebug(currentEntry, "  • Message ID: " + sendResult.messageId);
            
            // 6. AKTUALIZÁCIA STAVU
            updateNotificationAfterSend(sendResult);
            
        } else {
            utils.addError(currentEntry, "Odoslanie zlyhalo: " + sendResult.error, "main");
            setNotificationStatus("Zlyhalo", sendResult.error);
        }
        
        utils.addDebug(currentEntry, utils.getIcon("success") + " === TRIGGER DOKONČENÝ ===");
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        setNotificationStatus("Chyba", "Kritická chyba: " + error.toString());
    }
}

// ==============================================
// VALIDÁCIA NOTIFIKÁCIE
// ==============================================

function validateNotification() {
    try {
        // Povinné polia
        var status = utils.safeGet(currentEntry, CONFIG.fields.notifications.status);
        var message = utils.safeGet(currentEntry, CONFIG.fields.notifications.message);
        var chatId = utils.safeGet(currentEntry, CONFIG.fields.notifications.chatId);
        
        // Kontrola stavu - neodosielať ak už bolo odoslané
        if (status === "Odoslané") {
            return {
                success: false,
                error: "Notifikácia už bola odoslaná"
            };
        }
        
        // Kontrola správy
        if (!message || message.trim() === "") {
            return {
                success: false,
                error: "Správa je prázdna"
            };
        }
        
        // Kontrola chat ID
        if (!chatId) {
            // Pokús sa získať zo skupiny
            var group = utils.safeGet(currentEntry, CONFIG.fields.notifications.groupOrTopic);
            if (group) {
                chatId = utils.safeGet(group, CONFIG.fields.telegramGroups.chatId);
            }
            
            if (!chatId) {
                return {
                    success: false,
                    error: "Chýba Chat ID"
                };
            }
        }
        
        // Získaj voliteľné údaje
        var messageType = utils.safeGet(currentEntry, CONFIG.fields.notifications.messageType, "Neurčený");
        var priority = utils.safeGet(currentEntry, CONFIG.fields.notifications.priority, "Normálna");
        var threadId = utils.safeGet(currentEntry, CONFIG.fields.notifications.threadId);
        var formatting = utils.safeGet(currentEntry, CONFIG.fields.notifications.formatting, "Markdown");
        
        // Silent správa pre nízku prioritu
        var silent = false;
        if (priority === "Nízka") {
            silent = true;
        }
        
        // Ak máme skupinu, skontroluj jej nastavenia
        var group = utils.safeGet(currentEntry, CONFIG.fields.notifications.groupOrTopic);
        if (group) {
            var groupSilent = utils.safeGet(group, CONFIG.fields.telegramGroups.silentMessage, false);
            if (groupSilent) silent = true;
            
            // Ak skupina má tému ale nemáme thread ID
            var hasTopic = utils.safeGet(group, CONFIG.fields.telegramGroups.hasTopic, false);
            if (hasTopic && !threadId) {
                threadId = utils.safeGet(group, CONFIG.fields.telegramGroups.threadId);
            }
        }
        
        return {
            success: true,
            chatId: chatId,
            threadId: threadId,
            messageType: messageType,
            priority: priority,
            formatting: formatting,
            silent: silent
        };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "validateNotification", error);
        return {
            success: false,
            error: error.toString()
        };
    }
}

// ==============================================
// KONTROLA ČASOVÝCH OBMEDZENÍ
// ==============================================

function checkTimeRestrictions() {
    try {
        // Získaj skupinu ak existuje
        var group = utils.safeGet(currentEntry, CONFIG.fields.notifications.groupOrTopic);
        if (!group) {
            // Ak nie je skupina, povoľ odoslanie
            return true;
        }
        
        var now = moment();
        
        // Kontrola víkendu
        if (utils.isWeekend(now)) {
            var weekendAllowed = utils.safeGet(group, CONFIG.fields.telegramGroups.weekendEnabled, false);
            if (!weekendAllowed) {
                utils.addDebug(currentEntry, utils.getIcon("warning") + " Víkendové správy nie sú povolené");
                return false;
            }
        }
        
        // Kontrola pracovného času
        var workTimeFrom = utils.safeGet(group, CONFIG.fields.telegramGroups.workTimeFrom);
        var workTimeTo = utils.safeGet(group, CONFIG.fields.telegramGroups.workTimeTo);
        
        if (workTimeFrom && workTimeTo) {
            var currentTime = now.format("HH:mm");
            var fromTime = moment(workTimeFrom).format("HH:mm");
            var toTime = moment(workTimeTo).format("HH:mm");
            
            // Špeciálna logika pre časy cez polnoc
            if (fromTime > toTime) {
                // Napr. 22:00 - 06:00
                if (currentTime < toTime || currentTime >= fromTime) {
                    return true;
                }
                utils.addDebug(currentEntry, "  • Mimo pracovného času (" + fromTime + " - " + toTime + ")");
                return false;
            } else {
                // Normálny čas, napr. 08:00 - 17:00
                if (currentTime >= fromTime && currentTime <= toTime) {
                    return true;
                }
                utils.addDebug(currentEntry, "  • Mimo pracovného času (" + fromTime + " - " + toTime + ")");
                return false;
            }
        }
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "checkTimeRestrictions", error);
        // Pri chybe radšej povoľ odoslanie
        return true;
    }
}

// ==============================================
// PRÍPRAVA SPRÁVY
// ==============================================

function prepareMessage() {
    try {
        var message = utils.safeGet(currentEntry, CONFIG.fields.notifications.message, "");
        var formatting = utils.safeGet(currentEntry, CONFIG.fields.notifications.formatting, "Markdown");
        
        // Validácia správy
        if (CONFIG.settings.validateMessage) {
            message = validateAndCleanMessage(message, formatting);
        }
        
        // Pridaj footer s informáciami (voliteľné)
        var messageType = utils.safeGet(currentEntry, CONFIG.fields.notifications.messageType);
        if (messageType) {
            message += "\n\n_📋 " + messageType + " • " + moment().format("HH:mm") + "_";
        }
        
        return {
            success: true,
            message: message,
            formatting: formatting
        };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "prepareMessage", error);
        return {
            success: false,
            error: error.toString()
        };
    }
}

function validateAndCleanMessage(message, formatting) {
    if (!message) return "";
    
    // Odstráň prázdne riadky na začiatku a konci
    message = message.trim();
    
    // Nahraď viacnásobné prázdne riadky jedným
    message = message.replace(/\n\n\n+/g, '\n\n');
    
    // Pre Markdown skontroluj základné značky
    if (formatting === "Markdown") {
        // Skontroluj párové značky
        var asteriskCount = (message.match(/\*/g) || []).length;
        if (asteriskCount % 2 !== 0) {
            // Nepárny počet *, pridaj na koniec
            message += "*";
        }
        
        var underscoreCount = (message.match(/_/g) || []).length;
        if (underscoreCount % 2 !== 0) {
            message += "_";
        }
    }
    
    return message;
}

// ==============================================
// ODOSLANIE NA TELEGRAM
// ==============================================

function sendToTelegram(chatId, message, threadId, silent) {
    try {
        var options = {
            parseMode: CONFIG.settings.defaultParseMode,
            silent: silent || false,
            createNotification: false // Už máme notifikáciu
        };
        
        // Pridaj thread ID ak existuje
        if (threadId) {
            options.threadId = threadId;
        }
        
        // Odošli cez MementoTelegram
        var result = telegram.sendTelegramMessage(chatId, message, options);
        
        if (result.success) {
            utils.addDebug(currentEntry, "  • Správa odoslaná do chatu: " + chatId);
            if (threadId) {
                utils.addDebug(currentEntry, "  • Do témy (thread): " + threadId);
            }
            
            return {
                success: true,
                messageId: result.messageId,
                chatId: result.chatId,
                date: result.date
            };
        } else {
            // Retry logika
            if (CONFIG.settings.maxRetries > 0) {
                return retryTelegramSend(chatId, message, options, 1);
            }
            
            return {
                success: false,
                error: result.error
            };
        }
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "sendToTelegram", error);
        return {
            success: false,
            error: error.toString()
        };
    }
}

function retryTelegramSend(chatId, message, options, attempt) {
    utils.addDebug(currentEntry, utils.getIcon("round") + " Pokus č. " + attempt + " z " + CONFIG.settings.maxRetries);
    
    // Čakanie pred ďalším pokusom
    java.lang.Thread.sleep(CONFIG.settings.retryDelay * attempt);
    
    var result = telegram.sendTelegramMessage(chatId, message, options);
    
    if (result.success) {
        return {
            success: true,
            messageId: result.messageId,
            chatId: result.chatId,
            date: result.date
        };
    }
    
    if (attempt < CONFIG.settings.maxRetries) {
        return retryTelegramSend(chatId, message, options, attempt + 1);
    }
    
    return {
        success: false,
        error: "Všetky pokusy zlyhali: " + result.error
    };
}

// ==============================================
// AKTUALIZÁCIA STAVU
// ==============================================

function updateNotificationAfterSend(sendResult) {
    try {
        // Nastav stav na Odoslané
        currentEntry.set(CONFIG.fields.notifications.status, "Odoslané");
        
        // Ulož Message ID
        currentEntry.set(CONFIG.fields.notifications.messageId, String(sendResult.messageId));
        
        // Ulož čas odoslania
        currentEntry.set(CONFIG.fields.notifications.lastMessage, new Date());
        
        // Vyčisti error log ak bol
        currentEntry.set(CONFIG.fields.notifications.lastError, "");
        
        // Aktualizuj počítadlo
        var currentCount = utils.safeGet(currentEntry, CONFIG.fields.notifications.messageCount, 0);
        currentEntry.set(CONFIG.fields.notifications.messageCount, currentCount + 1);
        
        // Pridaj do info
        var infoText = utils.safeGet(currentEntry, CONFIG.fields.common.info, "");
        infoText += "\n\n📱 TELEGRAM ODOSLANIE:\n";
        infoText += "• Čas: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
        infoText += "• Message ID: " + sendResult.messageId + "\n";
        infoText += "• Chat ID: " + sendResult.chatId + "\n";
        
        currentEntry.set(CONFIG.fields.common.info, infoText);
        
        utils.addDebug(currentEntry, utils.getIcon("success") + " Stav notifikácie aktualizovaný");
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "updateNotificationAfterSend", error);
    }
}

function setNotificationStatus(status, error) {
    try {
        currentEntry.set(CONFIG.fields.notifications.status, status);
        
        if (error) {
            currentEntry.set(CONFIG.fields.notifications.lastError, error);
            
            // Zvýš retry counter
            var retryCount = utils.safeGet(currentEntry, CONFIG.fields.notifications.retryCount, 0);
            currentEntry.set(CONFIG.fields.notifications.retryCount, retryCount + 1);
        }
        
        currentEntry.set(CONFIG.fields.notifications.lastUpdate, new Date());
        
    } catch (e) {
        utils.addError(currentEntry, e.toString(), "setNotificationStatus", e);
    }
}

// ==============================================
// HELPER FUNKCIE
// ==============================================

function getDefaultsSettings() {
    try {
        var defaultsLib = libByName(CONFIG.libraries.defaults);
        if (!defaultsLib) {
            return null;
        }
        
        var settings = defaultsLib.entries();
        if (!settings || settings.length === 0) {
            return null;
        }
        
        // Vráť najnovší záznam
        return settings[settings.length - 1];
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "getDefaultsSettings", error);
        return null;
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

try {
    // Kontrola závislostí
    var depCheck = utils.checkDependencies(['config', 'core', 'telegram']);
    if (!depCheck.success) {
        message("❌ Chýbajú potrebné moduly: " + depCheck.missing.join(", "));
        cancel();
    }
    
    // Spustenie hlavnej funkcie
    main();
    
} catch (error) {
    utils.addError(currentEntry, "Kritická chyba pri spustení", "global", error);
    
    // Nastav stav na chybu
    try {
        currentEntry.set(CONFIG.fields.notifications.status, "Chyba");
        currentEntry.set(CONFIG.fields.notifications.lastError, "Kritická chyba: " + error.toString());
    } catch (e) {
        // Ignoruj
    }
}