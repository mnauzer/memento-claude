// ==============================================
// NOTIFICATION DELETE TRIGGER - Vymazanie z Telegramu
// Verzia: 8.1 | Dátum: December 2024 | Autor: ASISTANTO
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
// ✅ REFAKTOROVANÉ v8.1:
//    - Odstránené všetky return statements
//    - Použitie shouldContinue flag logiky
//    - Kompletná integrácia s MementoUtils
//    - Logovanie do ASISTANTO Logs knižnice
// ==============================================

// ==============================================
// INICIALIZÁCIA MODULOV
// ==============================================

var utils = MementoUtils;
var telegram = MementoTelegram;
var centralConfig = utils.config;
var deletedEntry = entry(); // Záznam ktorý sa maže

var CONFIG = {
    // Script špecifické nastavenia
    scriptName: "Notification Delete Trigger",
    version: "8.1",
    
    // Referencie na centrálny config
    fields: centralConfig.fields,
    libraries: centralConfig.libraries,
    icons: centralConfig.icons,
    constants: centralConfig.constants,
    
    // Lokálne nastavenia
    settings: {
        logsLibrary: "ASISTANTO Logs", // Knižnica pre logovanie
        createLogEntry: true,           // Vytvoriť log záznam
        deleteFromTelegram: true,       // Vymazať aj z Telegramu
        logRetention: 30,              // Dni uchovania logov
        debugMode: true
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    var logEntry = null;
    var shouldContinue = true;
    
    try {
        // 1. VYTVORENIE LOG ZÁZNAMU
        logEntry = createLogEntry("START", "Začínam spracovanie vymazania notifikácie");
        
        if (logEntry) {
            addLogDebug(logEntry, utils.getIcon("start") + " === NOTIFICATION DELETE TRIGGER v" + CONFIG.version + " ===");
            addLogDebug(logEntry, "Čas spustenia: " + utils.formatDate(moment()));
        }
        
        // 2. KONTROLA ZÁVISLOSTÍ
        if (shouldContinue) {
            var depCheck = utils.checkDependencies(['config', 'core', 'telegram']);
            if (!depCheck.success) {
                addLogError(logEntry, "Chýbajú potrebné moduly: " + depCheck.missing.join(", "), "main");
                updateLogStatus(logEntry, "CHYBA", "Chýbajú moduly");
                shouldContinue = false;
            }
        }
        
        // 3. ZÍSKANIE ÚDAJOV Z MAZANÉHO ZÁZNAMU
        var notificationData = null;
        
        if (shouldContinue) {
            addLogDebug(logEntry, utils.getIcon("search") + " Získavam údaje z mazaného záznamu");
            
            notificationData = extractNotificationData();
            if (!notificationData.success) {
                addLogError(logEntry, "Nepodarilo sa získať údaje: " + notificationData.error, "main");
                updateLogStatus(logEntry, "CHYBA", notificationData.error);
                shouldContinue = false;
            } else {
                logNotificationData(logEntry, notificationData);
            }
        }
        
        // 4. KONTROLA ČI MÁ BYŤ SPRÁVA VYMAZANÁ Z TELEGRAMU
        if (shouldContinue && notificationData) {
            if (!shouldDeleteFromTelegram(notificationData, logEntry)) {
                addLogDebug(logEntry, utils.getIcon("info") + " Správa nebude vymazaná z Telegramu");
                updateLogStatus(logEntry, "PRESKOČENÉ", "Nevyžaduje vymazanie z Telegramu");
                shouldContinue = false;
            }
        }
        
        // 5. VYMAZANIE SPRÁVY Z TELEGRAMU
        if (shouldContinue && notificationData) {
            addLogDebug(logEntry, utils.getIcon("delete") + " Mažem správu z Telegramu");
            
            var deleteResult = deleteFromTelegram(
                notificationData.chatId,
                notificationData.messageId
            );
            
            if (deleteResult.success) {
                addLogDebug(logEntry, utils.getIcon("success") + " Správa úspešne vymazaná z Telegramu");
                updateLogStatus(logEntry, "ÚSPECH", "Správa vymazaná");
                
                // Pridaj dodatočné info
                addLogInfo(logEntry, "Vymazanie dokončené", {
                    chatId: notificationData.chatId,
                    messageId: notificationData.messageId,
                    notificationId: notificationData.id,
                    messageType: notificationData.messageType
                });
                
            } else {
                addLogError(logEntry, "Vymazanie z Telegramu zlyhalo: " + deleteResult.error, "main");
                updateLogStatus(logEntry, "ZLYHALO", deleteResult.error);
            }
        }
        
        if (logEntry) {
            addLogDebug(logEntry, utils.getIcon("success") + " === TRIGGER DOKONČENÝ ===");
        }
        
    } catch (error) {
        addLogError(logEntry, "Kritická chyba v hlavnej funkcii: " + error.toString(), "main", error);
        updateLogStatus(logEntry, "KRITICKÁ CHYBA", error.toString());
    }
}

// ==============================================
// ZÍSKAVANIE DÁT Z MAZANÉHO ZÁZNAMU
// ==============================================

function extractNotificationData() {
    try {
        // Kontrola Telegram Bot Token
        var botToken = telegram.getBotToken();
        if (!botToken) {
            return {
                success: false,
                error: "Telegram Bot Token nie je nastavený v ASISTANTO Defaults"
            };
        }
        
        // Získaj základné údaje
        var id = deletedEntry.field("ID");
        var status = utils.safeGet(deletedEntry, CONFIG.fields.notifications.status, "Neznámy");
        var messageId = utils.safeGet(deletedEntry, CONFIG.fields.notifications.messageId);
        var chatId = utils.safeGet(deletedEntry, CONFIG.fields.notifications.chatId);
        var threadId = utils.safeGet(deletedEntry, CONFIG.fields.notifications.threadId);
        var messageType = utils.safeGet(deletedEntry, CONFIG.fields.notifications.messageType, "Neurčený");
        var priority = utils.safeGet(deletedEntry, CONFIG.fields.notifications.priority, "Normálna");
        
        // Debug logy pre diagnostiku
        if (CONFIG.settings.debugMode) {
            var debugInfo = "Extrahované údaje: ID=" + id + ", Status=" + status + 
                           ", MessageID=" + (messageId || "NULL") + ", ChatID=" + (chatId || "NULL");
        }
        
        // Ak nemáme priame chat ID, skús získať zo skupiny
        if (!chatId) {
            var group = utils.safeGet(deletedEntry, CONFIG.fields.notifications.groupOrTopic);
            if (group) {
                chatId = utils.safeGet(group, CONFIG.fields.telegramGroups.chatId);
                if (CONFIG.settings.debugMode && chatId) {
                    debugInfo += " (ChatID získané zo skupiny)";
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
            var errorDetail = {
                id: id,
                status: status,
                messageId: messageId || "CHÝBA",
                chatId: chatId || "CHÝBA",
                messageType: messageType,
                debugInfo: debugInfo || "N/A"
            };
            
            return {
                success: false,
                error: "Chýba " + missingField + " - nemožno vymazať z Telegramu",
                details: errorDetail
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
            messagePreview: message,
            debugInfo: debugInfo || ""
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

function shouldDeleteFromTelegram(notificationData, logEntry) {
    // Nevymazávať ak:
    // 1. Je vypnuté v nastaveniach
    if (!CONFIG.settings.deleteFromTelegram) {
        addLogDebug(logEntry, "  • Vymazávanie z Telegramu je vypnuté v nastaveniach");
        return false;
    }
    
    // 2. Správa nebola nikdy odoslaná
    if (notificationData.status !== "Odoslané") {
        addLogDebug(logEntry, "  • Správa nebola odoslaná (status: " + notificationData.status + ")");
        return false;
    }
    
    // 3. Nemáme potrebné údaje
    if (!notificationData.messageId || !notificationData.chatId) {
        addLogDebug(logEntry, "  • Chýbajú potrebné údaje pre vymazanie");
        return false;
    }
    
    addLogDebug(logEntry, "  • Správa spĺňa podmienky pre vymazanie");
    return true;
}

// ==============================================
// VYMAZANIE Z TELEGRAMU
// ==============================================

function deleteFromTelegram(chatId, messageId) {
    try {
        addLogDebug(null, "  • Pokus o vymazanie - ChatID: " + chatId + ", MessageID: " + messageId);
        
        // Vymazanie cez MementoTelegram
        var result = telegram.deleteTelegramMessage(chatId, messageId);
        
        if (result.success) {
            addLogDebug(null, "  • Telegram API vrátilo úspech");
            return {
                success: true
            };
        }
        
        // Ak zlyhalo, skontroluj či správa stále existuje
        // (mohla byť už vymazaná manuálne)
        if (result.error && result.error.indexOf("message to delete not found") !== -1) {
            addLogDebug(null, "  • Správa už neexistuje v Telegrame");
            return {
                success: true,
                note: "Správa už bola vymazaná"
            };
        }
        
        // Ak zlyhalo z iného dôvodu
        addLogDebug(null, "  • Telegram API vrátilo chybu: " + result.error);
        return {
            success: false,
            error: result.error || "Neznáma chyba"
        };
        
    } catch (error) {
        addLogDebug(null, "  • Výnimka pri volaní Telegram API: " + error.toString());
        return {
            success: false,
            error: error.toString()
        };
    }
}

// ==============================================
// LOGOVANIE DO ASISTANTO LOGS
// ==============================================

function createLogEntry(status, description) {
    try {
        if (!CONFIG.settings.createLogEntry) {
            return null;
        }
        
        var logsLib = libByName(CONFIG.settings.logsLibrary);
        if (!logsLib) {
            // Ak knižnica neexistuje, nevytváraj log
            return null;
        }
        
        var logEntry = logsLib.create({});
        
        // Základné polia
        logEntry.set("Dátum", new Date());
        logEntry.set("Script", CONFIG.scriptName);
        logEntry.set("Verzia", CONFIG.version);
        logEntry.set("Status", status);
        logEntry.set("Popis", description);
        logEntry.set("Knižnica", "Notifications");
        logEntry.set("Operácia", "Delete");
        
        // Záznam ktorý sa maže
        if (deletedEntry) {
            logEntry.set("Zdrojový záznam ID", deletedEntry.field("ID"));
        }
        
        // Inicializuj log polia
        logEntry.set(CONFIG.fields.common.debugLog, "");
        logEntry.set(CONFIG.fields.common.errorLog, "");
        logEntry.set(CONFIG.fields.common.info, "");
        
        return logEntry;
        
    } catch (error) {
        // Nemôžeme logovať chybu logovania
        return null;
    }
}

function addLogDebug(logEntry, message) {
    if (!logEntry || !CONFIG.settings.debugMode) return;
    
    try {
        var debugField = CONFIG.fields.common.debugLog;
        var timestamp = moment().format("HH:mm:ss");
        var debugMessage = "[" + timestamp + "] " + message;
        
        var existingDebug = logEntry.field(debugField) || "";
        logEntry.set(debugField, existingDebug + debugMessage + "\n");
    } catch (e) {
        // Ignoruj
    }
}

function addLogError(logEntry, message, source, error) {
    if (!logEntry) return;
    
    try {
        var errorField = CONFIG.fields.common.errorLog;
        var timestamp = moment().format("HH:mm:ss");
        var errorMessage = "[" + timestamp + "] " + message;
        
        if (source) {
            errorMessage += " | Zdroj: " + source;
        }
        
        if (error && error.lineNumber) {
            errorMessage += " | Riadok: " + error.lineNumber;
        }
        
        var existingError = logEntry.field(errorField) || "";
        logEntry.set(errorField, existingError + errorMessage + "\n");
    } catch (e) {
        // Ignoruj
    }
}

function addLogInfo(logEntry, message, data) {
    if (!logEntry) return;
    
    try {
        var infoField = CONFIG.fields.common.info;
        var timestamp = moment().format("DD.MM.YYYY HH:mm:ss");
        var infoMessage = "[" + timestamp + "] " + message;
        
        if (data) {
            infoMessage += "\nDáta: " + JSON.stringify(data, null, 2);
        }
        
        var existingInfo = logEntry.field(infoField) || "";
        logEntry.set(infoField, existingInfo + infoMessage + "\n\n");
    } catch (e) {
        // Ignoruj
    }
}

function updateLogStatus(logEntry, status, description) {
    if (!logEntry) return;
    
    try {
        logEntry.set("Status", status);
        if (description) {
            logEntry.set("Popis", description);
        }
        logEntry.set("Čas ukončenia", new Date());
    } catch (e) {
        // Ignoruj
    }
}

function logNotificationData(logEntry, data) {
    if (!logEntry) return;
    
    addLogDebug(logEntry, "📋 Údaje vymazanej notifikácie:");
    addLogDebug(logEntry, "  • ID: " + data.id);
    addLogDebug(logEntry, "  • Status: " + data.status);
    addLogDebug(logEntry, "  • Typ správy: " + data.messageType);
    addLogDebug(logEntry, "  • Priorita: " + data.priority);
    addLogDebug(logEntry, "  • Chat ID: " + data.chatId);
    addLogDebug(logEntry, "  • Message ID: " + data.messageId);
    
    if (data.threadId) {
        addLogDebug(logEntry, "  • Thread ID: " + data.threadId);
    }
    
    // Pridaj do info poľa štruktúrované dáta
    var infoData = {
        notificationId: data.id,
        status: data.status,
        messageType: data.messageType,
        priority: data.priority,
        chatId: data.chatId,
        messageId: data.messageId,
        threadId: data.threadId || null
    };
    
    if (data.messagePreview) {
        infoData.messagePreview = data.messagePreview;
    }
    
    addLogInfo(logEntry, "Detaily notifikácie", infoData);
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

function cleanupOldLogs() {
    try {
        if (CONFIG.settings.logRetention <= 0) return;
        
        var logsLib = libByName(CONFIG.settings.logsLibrary);
        if (!logsLib) return;
        
        var cutoffDate = moment().subtract(CONFIG.settings.logRetention, 'days').toDate();
        var logs = logsLib.entries();
        var deletedCount = 0;
        
        for (var i = 0; i < logs.length; i++) {
            var log = logs[i];
            var logDate = log.field("Dátum");
            
            if (logDate && logDate < cutoffDate) {
                // Skontroluj či je to náš log
                var scriptName = log.field("Script");
                if (scriptName === CONFIG.scriptName) {
                    log.trash();
                    deletedCount++;
                }
            }
        }
        
        if (deletedCount > 0) {
            // Vytvor info log o vyčistení
            var cleanupLog = createLogEntry("CLEANUP", "Vymazaných " + deletedCount + " starých logov");
            if (cleanupLog) {
                addLogDebug(cleanupLog, "Cleanup dokončený - vymazaných " + deletedCount + " logov starších ako " + CONFIG.settings.logRetention + " dní");
            }
        }
        
    } catch (error) {
        // Ignoruj chyby pri čistení
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

try {
    var shouldExecute = true;
    
    // Kontrola závislostí
    var depCheck = utils.checkDependencies(['config', 'core', 'telegram']);
    if (!depCheck.success) {
        // Pokús sa aspoň vytvoriť log
        var errorLog = createLogEntry("CHYBA", "Chýbajú moduly: " + depCheck.missing.join(", "));
        if (errorLog) {
            addLogError(errorLog, "Chýbajú potrebné moduly: " + depCheck.missing.join(", "), "global");
            addLogDebug(errorLog, "Script nemôže pokračovať bez potrebných modulov");
        }
        shouldExecute = false;
    }
    
    // Spustenie hlavnej funkcie len ak sú všetky moduly
    if (shouldExecute) {
        main();
        
        // Vyčisti staré logy (voliteľné)
        cleanupOldLogs();
    }
    
} catch (error) {
    // Pokús sa zaznamenať kritickú chybu
    try {
        var errorLog = createLogEntry("KRITICKÁ CHYBA", error.toString());
        if (errorLog) {
            addLogError(errorLog, "Kritická chyba pri spustení: " + error.toString(), "global", error);
            if (error.stack) {
                addLogDebug(errorLog, "Stack trace:\n" + error.stack);
            }
        }
    } catch (e) {
        // Už naozaj nemôžeme nič robiť
    }
}