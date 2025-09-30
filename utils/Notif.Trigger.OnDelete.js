// ==============================================
// NOTIFICATION DELETE TRIGGER - Vymazanie z Telegramu
// Verzia: 9.1 | Dátum: December 2024 | Autor: ASISTANTO
// Knižnica: Notifications | Trigger: Deleting an Entry
// ==============================================
// 📋 FUNKCIA:
//    - Pri vymazaní záznamu z knižnice Notifications
//    - Vymaže správu aj z Telegram chatu
//    - Loguje do knižnice ASISTANTO Logs
//    - Podporuje skupiny aj témy (threads)
// ==============================================
// 🔧 POUŽÍVA:
//    - MementoUtils v7.0+ (agregátor)
//    - MementoTelegram v8.0 (Telegram funkcie)
//    - MementoConfig v7.0+ (centrálny CONFIG)
//    - MementoCore v7.0+ (základné funkcie)
// ==============================================
// ✅ ZMENY v9.1:
//    - Použitie štandardných MementoUtils funkcií
//    - Správne zapisovanie do ASISTANTO Logs
//    - Opravené Telegram mazanie
//    - Debug/Error/Info logy do správnych polí
// ==============================================

// ==============================================
// INICIALIZÁCIA MODULOV
// ==============================================

var utils = MementoUtils;
var centralConfig = utils.config;
var deletedEntry = entry(); // Záznam ktorý sa maže
var logEntry = null; // Globálna premenná pre log záznam

var CONFIG = {
    // Script špecifické nastavenia
    scriptName: "Notification Delete Trigger",
    version: "9.1",
    
    // Referencie na centrálny config
    fields: centralConfig.fields,
    libraries: centralConfig.libraries,
    icons: centralConfig.icons,
    constants: centralConfig.constants,
    
    // Lokálne nastavenia
    settings: {
        logsLibrary: "ASISTANTO Logs",
        createLogEntry: true,
        deleteFromTelegram: true,
        debugMode: true
    },
    
    // Polia v ASISTANTO Logs
    logFields: {
        date: "date",
        library: "library", 
        script: "script",
        line: "line",
        debugLog: "Debug_Log",
        errorLog: "Error_Log",
        info: "info"
    }
};

// ==============================================
// OVERRIDE ŠTANDARDNÝCH FUNKCIÍ
// ==============================================

// Uložíme originálne funkcie
var originalAddDebug = utils.addDebug;
var originalAddError = utils.addError;
var originalAddInfo = utils.addInfo;

// Prepíšeme funkcie aby zapisovali do log entry
utils.addDebug = function(entry, message, iconName) {
    if (logEntry) {
        // Zapisuj do ASISTANTO Logs záznamu
        originalAddDebug.call(this, logEntry, message, iconName);
    }
};

utils.addError = function(entry, message, source, error) {
    if (logEntry) {
        // Zapisuj do ASISTANTO Logs záznamu
        originalAddError.call(this, logEntry, message, source, error);
        
        // Pridaj číslo riadku ak existuje
        if (error && error.lineNumber && !logEntry.field(CONFIG.logFields.line)) {
            logEntry.set(CONFIG.logFields.line, error.lineNumber);
        }
    }
};

utils.addInfo = function(entry, message, data) {
    if (logEntry) {
        // Zapisuj do ASISTANTO Logs záznamu
        originalAddInfo.call(this, logEntry, message, data);
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    var shouldContinue = true;
    var notificationData = null;
    
    try {
        // 1. VYTVORENIE LOG ZÁZNAMU
        if (shouldContinue) {
            logEntry = createLogEntry();
            if (!logEntry) {
                // Ak sa nepodarí vytvoriť log, nemôžeme pokračovať
                shouldContinue = false;
            } else {
                utils.addDebug(logEntry, utils.getIcon("start") + " === NOTIFICATION DELETE TRIGGER v" + CONFIG.version + " ===");
                utils.addDebug(logEntry, "Čas spustenia: " + utils.formatDate(moment()));
                utils.addDebug(logEntry, "Mazaný záznam ID: " + deletedEntry.field("ID"));
            }
        }
        
        // 2. KONTROLA ZÁVISLOSTÍ
        if (shouldContinue) {
            var depCheck = utils.checkDependencies(['config', 'core', 'telegram']);
            if (!depCheck.success) {
                utils.addError(logEntry, "Chýbajú potrebné moduly: " + depCheck.missing.join(", "), "main");
                shouldContinue = false;
            } else {
                utils.addDebug(logEntry, utils.getIcon("success") + " Všetky moduly načítané");
            }
        }
        
        // 3. ZÍSKANIE ÚDAJOV Z MAZANÉHO ZÁZNAMU
        if (shouldContinue) {
            utils.addDebug(logEntry, utils.getIcon("search") + " Získavam údaje z mazaného záznamu");
            
            notificationData = extractNotificationData();
            if (!notificationData.success) {
                utils.addError(logEntry, "Nepodarilo sa získať údaje: " + notificationData.error, "extractNotificationData");
                
                if (notificationData.details) {
                    utils.addInfo(logEntry, "Detaily chyby", notificationData.details);
                }
                
                shouldContinue = false;
            } else {
                utils.addDebug(logEntry, utils.getIcon("success") + " Údaje úspešne získané");
                logNotificationData(notificationData);
            }
        }
        
        // 4. KONTROLA ČI MÁ BYŤ SPRÁVA VYMAZANÁ Z TELEGRAMU
        if (shouldContinue && notificationData) {
            utils.addDebug(logEntry, utils.getIcon("question") + " Kontrolujem podmienky pre vymazanie");
            
            if (!shouldDeleteFromTelegram(notificationData)) {
                utils.addInfo(logEntry, "Správa nebude vymazaná z Telegramu", {
                    dôvod: "Nesplnené podmienky",
                    status: notificationData.status,
                    messageId: notificationData.messageId || "chýba",
                    chatId: notificationData.chatId || "chýba"
                });
                shouldContinue = false;
            } else {
                utils.addDebug(logEntry, utils.getIcon("success") + " Podmienky splnené, pokračujem s vymazaním");
            }
        }
        
        // 5. VYMAZANIE SPRÁVY Z TELEGRAMU
        if (shouldContinue && notificationData) {
            utils.addDebug(logEntry, utils.getIcon("delete") + " Volám Telegram API pre vymazanie správy");
            utils.addDebug(logEntry, "  • Chat ID: " + notificationData.chatId);
            utils.addDebug(logEntry, "  • Message ID: " + notificationData.messageId);
            
            var deleteResult = deleteFromTelegram(notificationData.chatId, notificationData.messageId);
            
            if (deleteResult.success) {
                utils.addDebug(logEntry, utils.getIcon("success") + " Správa úspešne vymazaná z Telegramu");
                
                // Finálne info
                utils.addInfo(logEntry, "✅ VYMAZANIE DOKONČENÉ", {
                    notificationId: notificationData.id,
                    messageType: notificationData.messageType,
                    chatId: notificationData.chatId,
                    messageId: notificationData.messageId,
                    threadId: notificationData.threadId || null,
                    timestamp: moment().format("DD.MM.YYYY HH:mm:ss")
                });
                
            } else {
                utils.addError(logEntry, "Vymazanie z Telegramu zlyhalo: " + deleteResult.error, "deleteFromTelegram");
                
                utils.addInfo(logEntry, "❌ VYMAZANIE ZLYHALO", {
                    error: deleteResult.error,
                    chatId: notificationData.chatId,
                    messageId: notificationData.messageId
                });
            }
        }
        
        utils.addDebug(logEntry, utils.getIcon("success") + " === TRIGGER DOKONČENÝ ===");
        
    } catch (error) {
        utils.addError(logEntry, "Kritická chyba v hlavnej funkcii: " + error.toString(), "main", error);
        
        if (error.stack) {
            utils.addDebug(logEntry, "Stack trace:\n" + error.stack);
        }
    }
}

// ==============================================
// VYTVORENIE LOG ZÁZNAMU
// ==============================================

function createLogEntry() {
    try {
        var logsLib = libByName(CONFIG.settings.logsLibrary);
        if (!logsLib) {
            message("❌ Knižnica " + CONFIG.settings.logsLibrary + " neexistuje!");
            return null;
        }
        
        var newLog = logsLib.create({});
        
        // Základné polia
        newLog.set(CONFIG.logFields.date, new Date());
        newLog.set(CONFIG.logFields.library, "Notifications");
        newLog.set(CONFIG.logFields.script, CONFIG.scriptName + " v" + CONFIG.version);
        
        // Inicializuj log polia
        newLog.set(CONFIG.logFields.debugLog, "");
        newLog.set(CONFIG.logFields.errorLog, "");
        newLog.set(CONFIG.logFields.info, "");
        
        return newLog;
        
    } catch (error) {
        message("❌ Kritická chyba pri vytváraní log záznamu: " + error.toString());
        return null;
    }
}

// ==============================================
// ZÍSKAVANIE DÁT Z MAZANÉHO ZÁZNAMU
// ==============================================

function extractNotificationData() {
    try {
        // Kontrola Telegram Bot Token
        var botToken = MementoTelegram.getBotToken();
        if (!botToken) {
            return {
                success: false,
                error: "Telegram Bot Token nie je nastavený v ASISTANTO Defaults"
            };
        }
        
        utils.addDebug(logEntry, "  • Bot Token: " + (botToken ? "✓ OK" : "✗ Chýba"));
        
        // Získaj základné údaje
        var id = utils.safeGet(deletedEntry, CONFIG.fields.common.id);
        var status = utils.safeGet(deletedEntry, CONFIG.fields.notifications.status, "Neznámy");
        var messageId = utils.safeGet(deletedEntry, CONFIG.fields.notifications.messageId);
        var chatId = utils.safeGet(deletedEntry, CONFIG.fields.notifications.chatId);
        var threadId = utils.safeGet(deletedEntry, CONFIG.fields.notifications.threadId);
        var messageType = utils.safeGet(deletedEntry, CONFIG.fields.notifications.messageType, "Neurčený");
        var priority = utils.safeGet(deletedEntry, CONFIG.fields.notifications.priority, "Normálna");
        
        utils.addDebug(logEntry, "  • Notification ID: " + id);
        utils.addDebug(logEntry, "  • Status: " + status);
        utils.addDebug(logEntry, "  • Message ID: " + (messageId || "NULL"));
        utils.addDebug(logEntry, "  • Chat ID: " + (chatId || "NULL"));
        
        // Ak nemáme priame chat ID, skús získať zo skupiny
        if (!chatId) {
            utils.addDebug(logEntry, "  • Chat ID chýba, skúšam získať zo skupiny");
            
            var group = utils.safeGet(deletedEntry, CONFIG.fields.notifications.groupOrTopic);
            if (group && group.length > 0) {
                var groupEntry = group[0];
                chatId = utils.safeGet(groupEntry, CONFIG.fields.telegramGroups.chatId);
                
                if (chatId) {
                    utils.addDebug(logEntry, "  • Chat ID získané zo skupiny: " + chatId);
                }
            }
        }
        
        // Získaj správu pre log
        var message = utils.safeGet(deletedEntry, CONFIG.fields.notifications.message, "");
        
        // Skráť správu pre log (max 200 znakov)
        if (message.length > 200) {
            message = message.substring(0, 197) + "...";
        }
        
        // Validácia potrebných údajov
        if (!messageId || !chatId) {
            var missingField = !messageId ? "Message ID" : "Chat ID";
            
            return {
                success: false,
                error: "Chýba " + missingField + " - nemožno vymazať z Telegramu",
                details: {
                    id: id,
                    status: status,
                    messageId: messageId || "CHÝBA",
                    chatId: chatId || "CHÝBA",
                    messageType: messageType
                }
            };
        }
        
        return {
            success: true,
            id: id,
            status: status,
            messageId: messageId,
            chatId: chatId,
            threadId: threadId,
            messageType: messageType,
            priority: priority,
            messagePreview: message
        };
        
    } catch (error) {
        return {
            success: false,
            error: "Chyba pri extrakcii dát: " + error.toString()
        };
    }
}

// ==============================================
// KONTROLA ČI VYMAZAŤ Z TELEGRAMU
// ==============================================

function shouldDeleteFromTelegram(notificationData) {
    // Nevymazávať ak:
    
    // 1. Je vypnuté v nastaveniach
    if (!CONFIG.settings.deleteFromTelegram) {
        utils.addDebug(logEntry, "  • Vymazávanie z Telegramu je vypnuté v nastaveniach");
        return false;
    }
    
    // 2. Správa nebola nikdy odoslaná
    if (notificationData.status !== "Odoslané") {
        utils.addDebug(logEntry, "  • Správa nebola odoslaná (status: " + notificationData.status + ")");
        return false;
    }
    
    // 3. Nemáme potrebné údaje
    if (!notificationData.messageId || !notificationData.chatId) {
        utils.addDebug(logEntry, "  • Chýbajú potrebné údaje pre vymazanie");
        return false;
    }
    
    utils.addDebug(logEntry, "  • Všetky podmienky splnené ✓");
    return true;
}

// ==============================================
// VYMAZANIE Z TELEGRAMU
// ==============================================

function deleteFromTelegram(chatId, messageId) {
    try {
        // Použijeme priamo MementoTelegram modul
        var result = MementoTelegram.deleteTelegramMessage(chatId, messageId);
        
        if (result.success) {
            utils.addDebug(logEntry, "  • Telegram API vrátilo úspech");
            return {
                success: true
            };
        }
        
        // Ak zlyhalo, skontroluj či správa stále existuje
        if (result.error && result.error.indexOf("message to delete not found") !== -1) {
            utils.addDebug(logEntry, "  • Správa už neexistuje v Telegrame");
            return {
                success: true,
                note: "Správa už bola vymazaná"
            };
        }
        
        // Ak zlyhalo z iného dôvodu
        utils.addDebug(logEntry, "  • Telegram API vrátilo chybu: " + result.error);
        return {
            success: false,
            error: result.error || "Neznáma chyba"
        };
        
    } catch (error) {
        utils.addError(logEntry, "Výnimka pri volaní Telegram API: " + error.toString(), "deleteFromTelegram", error);
        return {
            success: false,
            error: error.toString()
        };
    }
}

// ==============================================
// LOGOVANIE NOTIFIKAČNÝCH DÁT
// ==============================================

function logNotificationData(data) {
    utils.addDebug(logEntry, "📋 Údaje vymazanej notifikácie:");
    utils.addDebug(logEntry, "  • ID: " + data.id);
    utils.addDebug(logEntry, "  • Status: " + data.status);
    utils.addDebug(logEntry, "  • Typ správy: " + data.messageType);
    utils.addDebug(logEntry, "  • Priorita: " + data.priority);
    utils.addDebug(logEntry, "  • Chat ID: " + data.chatId);
    utils.addDebug(logEntry, "  • Message ID: " + data.messageId);
    
    if (data.threadId) {
        utils.addDebug(logEntry, "  • Thread ID: " + data.threadId);
    }
    
    if (data.messagePreview) {
        utils.addDebug(logEntry, "  • Náhľad správy: " + data.messagePreview);
    }
    
    // Pridaj štruktúrované dáta do info
    utils.addInfo(logEntry, "Detaily notifikácie", {
        notificationId: data.id,
        status: data.status,
        messageType: data.messageType,
        priority: data.priority,
        chatId: data.chatId,
        messageId: data.messageId,
        threadId: data.threadId || null,
        messagePreview: data.messagePreview || null
    });
}

// ==============================================
// OBNOVENIE PÔVODNÝCH FUNKCIÍ
// ==============================================

function restoreOriginalFunctions() {
    utils.addDebug = originalAddDebug;
    utils.addError = originalAddError;
    utils.addInfo = originalAddInfo;
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

try {
    // Kontrola základných podmienok
    if (!CONFIG.settings.createLogEntry) {
        // Ak nemáme vytvárať log, skončíme
        message("ℹ️ Logovanie je vypnuté");
    } else {
        // Spusti hlavnú funkciu
        main();
    }
    
} catch (error) {
    // Kritická chyba - pokús sa aspoň message
    message("❌ Kritická chyba: " + error.toString());
} finally {
    // Vždy obnov originálne funkcie
    restoreOriginalFunctions();
}