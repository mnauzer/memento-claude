// ==============================================
// DELETE TRIGGER - ASISTANTO NOTIFICATIONS
// Verzia: 1.0 | Dátum: 20.08.2025 | Autor: ASISTANTO
// Knižnica: ASISTANTO Notifications | Trigger: Deleting
// ==============================================
// 📋 FUNKCIA:
//    - Spracováva vymazávanie notifikačných záznamov
//    - Cleanup pending notifikácií
//    - Vymazávanie Telegram správ (ak je možné)
//    - N8N workflow notifikácia o vymazaní
//    - Aktualizácia statusov súvisiacich záznamov
// ✅ v1.0 IMPLEMENTÁCIA:
//    - Využitie ASISTANTO Notifications Helper funkcií
//    - Modulárne využitie MementoUtils a MementoAI
//    - Support pre Before/After delete fázy
//    - Robustné error handling s rollback možnosťami
// ==============================================

// Import knižníc
var utils = MementoUtils;
var notifHelper = ASISTANTONotifications;
var currentEntry = entry();

// ==============================================
// KONFIGURÁCIA
// ==============================================

var CONFIG = {
    debug: true,
    version: "1.0",
    scriptName: "ASISTANTO Notifications Delete Trigger",
    
    // Využívame Helper CONFIG pre konzistentnosť
    helperConfig: notifHelper.CONFIG,
    
    // Delete-špecifické nastavenia
    settings: {
        cleanupTelegramMessages: true,
        notifyN8N: true,
        cleanupRelatedNotifications: true,
        backupBeforeDelete: true,
        confirmationRequired: false, // Pre future use
        maxCleanupRetries: 3
    },
    
    // Knižnice
    libraries: {
        defaults: "ASISTANTO Defaults"
    },
    
    // Cleanup actions
    cleanupActions: {
        CANCEL_PENDING: "cancel_pending",
        DELETE_TELEGRAM: "delete_telegram", 
        UPDATE_RELATED: "update_related",
        NOTIFY_N8N: "notify_n8n",
        CREATE_BACKUP: "create_backup"
    }
};

// Globálne premenné pre cleanup tracking
var cleanupResults = {
    telegramDeleted: 0,
    notificationsCancelled: 0,
    relatedUpdated: 0,
    backupCreated: false,
    n8nNotified: false,
    errors: []
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.clearLogs(currentEntry, false);
        utils.addDebug(currentEntry, "🗑️ === ŠTART DELETE TRIGGER ===");
        utils.addDebug(currentEntry, "📋 Script: " + CONFIG.scriptName + " v" + CONFIG.version);
        utils.addDebug(currentEntry, "🆔 Entry ID: " + currentEntry.field("ID"));
        
        // 1. Validácia entry a získanie základných údajov
        var entryData = gatherEntryData();
        if (!entryData) {
            utils.addError(currentEntry, "Nepodarilo sa získať dáta entry", CONFIG.scriptName);
            return false;
        }
        
        utils.addDebug(currentEntry, "📊 Status: " + entryData.status + " | Typ: " + entryData.type);
        
        // 2. Vytvor backup ak je povolený
        if (CONFIG.settings.backupBeforeDelete) {
            createEntryBackup(entryData);
        }
        
        // 3. Cleanup Telegram správ (ak boli odoslané)
        if (CONFIG.settings.cleanupTelegramMessages && entryData.messageId) {
            cleanupTelegramMessage(entryData);
        }
        
        // 4. Zruš súvisiace pending notifikácie
        if (CONFIG.settings.cleanupRelatedNotifications) {
            cleanupRelatedNotifications(entryData);
        }
        
        // 5. N8N workflow notifikácia
        if (CONFIG.settings.notifyN8N) {
            notifyN8NAboutDeletion(entryData);
        }
        
        // 6. Final cleanup summary
        logCleanupSummary(entryData);
        
        utils.addDebug(currentEntry, "✅ === DELETE TRIGGER DOKONČENÝ ===");
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v Delete Trigger: " + error.toString(), CONFIG.scriptName, error);
        
        // Pokus o emergency cleanup
        try {
            logEmergencyState(error);
        } catch (emergencyError) {
            // Posledná záchrana - aspoň zapisuj error
            currentEntry.set("Error_Log", "EMERGENCY: " + error.toString() + " | " + emergencyError.toString());
        }
        
        return false;
    }
}

// ==============================================
// ZÍSKANIE DÁT ENTRY
// ==============================================

function gatherEntryData() {
    try {
        var entryData = {
            id: currentEntry.field("ID"),
            status: utils.safeGet(currentEntry, "Status", ""),
            type: utils.safeGet(currentEntry, "Typ správy", ""),
            priority: utils.safeGet(currentEntry, "Priorita", ""),
            subject: utils.safeGet(currentEntry, "Predmet", ""),
            message: utils.safeGet(currentEntry, "Správa", ""),
            
            // Telegram špecifické
            messageId: utils.safeGet(currentEntry, "Message ID", ""),
            chatId: utils.safeGet(currentEntry, "Chat ID", ""),
            threadId: utils.safeGet(currentEntry, "Thread ID", ""),
            messageUrl: utils.safeGet(currentEntry, "Message URL", ""),
            
            // Časovanie
            created: utils.safeGet(currentEntry, "Vytvorené", null),
            scheduledFor: utils.safeGet(currentEntry, "Poslať o", null),
            sentAt: utils.safeGet(currentEntry, "Odoslané o", null),
            
            // Source info
            sourceLibrary: utils.safeGet(currentEntry, "Zdrojová knižnica", ""),
            sourceId: utils.safeGet(currentEntry, "Zdrojový ID", ""),
            creator: utils.safeGet(currentEntry, "Vytvoril", ""),
            
            // Adresáti
            addresseeType: utils.safeGet(currentEntry, "Adresát", ""),
            employees: utils.safeGetLinks(currentEntry, "Zamestnanec"),
            groups: utils.safeGetLinks(currentEntry, "Skupina/Téma"),
            clients: utils.safeGetLinks(currentEntry, "Klient")
        };
        
        // Validácia
        if (!entryData.id) {
            utils.addError(currentEntry, "Entry nemá ID", "gatherEntryData");
            return null;
        }
        
        utils.addDebug(currentEntry, "📋 Entry dáta získané úspešne");
        return entryData;
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri získavaní entry dát: " + error.toString(), "gatherEntryData", error);
        return null;
    }
}

// ==============================================
// BACKUP FUNKCIE
// ==============================================

function createEntryBackup(entryData) {
    try {
        utils.addDebug(currentEntry, "💾 Vytváranie backup entry...");
        
        // Vytvor backup záznam v info poli
        var backupData = {
            deletedAt: moment().toISOString(),
            deletedBy: user().name(),
            originalId: entryData.id,
            
            // Kompletné dáta
            notificationData: {
                status: entryData.status,
                type: entryData.type,
                priority: entryData.priority,
                subject: entryData.subject,
                message: entryData.message,
                addresseeType: entryData.addresseeType,
                
                telegram: {
                    messageId: entryData.messageId,
                    chatId: entryData.chatId,
                    threadId: entryData.threadId,
                    messageUrl: entryData.messageUrl
                },
                
                timing: {
                    created: entryData.created,
                    scheduledFor: entryData.scheduledFor,
                    sentAt: entryData.sentAt
                },
                
                source: {
                    library: entryData.sourceLibrary,
                    id: entryData.sourceId,
                    creator: entryData.creator
                },
                
                addressees: {
                    employees: entryData.employees.map(function(emp) {
                        return {
                            id: emp.field("ID"),
                            name: utils.formatEmployeeName(emp)
                        };
                    }),
                    groups: entryData.groups.map(function(group) {
                        return {
                            id: group.field("ID"),
                            name: utils.safeGet(group, "Názov skupiny", "")
                        };
                    }),
                    clients: entryData.clients.map(function(client) {
                        return {
                            id: client.field("ID"),
                            name: utils.safeGet(client, "Názov", "")
                        };
                    })
                }
            },
            
            // Cleanup metadata
            cleanupInfo: {
                scriptVersion: CONFIG.version,
                cleanupActions: Object.keys(CONFIG.cleanupActions),
                backupCreated: true
            }
        };
        
        // Ulož backup do info poľa
        var backupText = "🗑️ NOTIFICATION DELETED - BACKUP DATA\n";
        backupText += "=====================================\n";
        backupText += JSON.stringify(backupData, null, 2);
        
        var existingInfo = utils.safeGet(currentEntry, "info", "");
        utils.safeSet(currentEntry, "info", existingInfo + "\n\n" + backupText);
        
        cleanupResults.backupCreated = true;
        utils.addDebug(currentEntry, "✅ Backup vytvorený úspešne");
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, "Backup creation failed: " + error.toString(), "createEntryBackup", error);
        cleanupResults.errors.push("backup_failed: " + error.toString());
        return false;
    }
}

// ==============================================
// TELEGRAM CLEANUP
// ==============================================

function cleanupTelegramMessage(entryData) {
    try {
        utils.addDebug(currentEntry, "📱 Cleanup Telegram správy...");
        
        if (!entryData.messageId || !entryData.chatId) {
            utils.addDebug(currentEntry, "⏭️ Žiadne Telegram dáta na cleanup");
            return false;
        }
        
        utils.addDebug(currentEntry, "🗑️ Mažem Telegram správu: " + entryData.messageId + " v chat: " + entryData.chatId);
        
        // Pokús sa vymazať správu cez utils (MementoTelegram)
        var deleteResult = utils.deleteTelegramMessage(entryData.chatId, entryData.messageId);
        
        if (deleteResult && deleteResult.success) {
            cleanupResults.telegramDeleted++;
            utils.addDebug(currentEntry, "✅ Telegram správa vymazaná úspešne");
            
            // Clear Telegram fields
            utils.safeSet(currentEntry, "Message ID", "");
            utils.safeSet(currentEntry, "Message URL", "");
            
            return true;
        } else {
            var errorMsg = deleteResult ? deleteResult.error : "Unknown error";
            utils.addDebug(currentEntry, "⚠️ Telegram správu sa nepodarilo vymazať: " + errorMsg);
            cleanupResults.errors.push("telegram_delete_failed: " + errorMsg);
            
            return false;
        }
        
    } catch (error) {
        utils.addError(currentEntry, "Telegram cleanup error: " + error.toString(), "cleanupTelegramMessage", error);
        cleanupResults.errors.push("telegram_cleanup_error: " + error.toString());
        return false;
    }
}

// ==============================================
// CLEANUP SÚVISIACICH NOTIFIKÁCIÍ
// ==============================================

function cleanupRelatedNotifications(entryData) {
    try {
        utils.addDebug(currentEntry, "🔗 Cleanup súvisiacich notifikácií...");
        
        if (!entryData.sourceLibrary || !entryData.sourceId) {
            utils.addDebug(currentEntry, "⏭️ Žiadne source info - preskakujem related cleanup");
            return false;
        }
        
        // Nájdi všetky notifikácie z rovnakého zdroja
        var notifLib = libByName(CONFIG.helperConfig.notificationsLibrary);
        if (!notifLib) {
            utils.addError(currentEntry, "Notifications library nenájdená", "cleanupRelatedNotifications");
            return false;
        }
        
        var relatedNotifications = notifLib.find("Zdrojový ID", entryData.sourceId);
        var updatedCount = 0;
        
        utils.addDebug(currentEntry, "🔍 Našiel som " + relatedNotifications.length + " súvisiacich notifikácií");
        
        for (var i = 0; i < relatedNotifications.length; i++) {
            var relatedNotif = relatedNotifications[i];
            
            // Preskač seba samého
            if (relatedNotif.field("ID") === entryData.id) {
                continue;
            }
            
            var relatedStatus = relatedNotif.field("Status");
            var relatedLibrary = relatedNotif.field("Zdrojová knižnica");
            
            // Aktualizuj len ak je z rovnakej knižnice a má relevantný status
            if (relatedLibrary === entryData.sourceLibrary && 
                (relatedStatus === "Čaká" || relatedStatus === "Naplánované")) {
                
                try {
                    // Zruš pending notifikáciu
                    utils.safeSet(relatedNotif, "Status", "Zrušené");
                    utils.safeSet(relatedNotif, "Posledná chyba", "Source entry deleted: " + entryData.sourceLibrary + " #" + entryData.sourceId);
                    
                    // Pridaj info o zrušení
                    utils.addInfo(relatedNotif, "Notifikácia zrušená", {
                        reason: "Source entry deleted",
                        deletedEntryId: entryData.id,
                        deletedBy: user().name(),
                        deletedAt: moment().format("DD.MM.YYYY HH:mm:ss")
                    });
                    
                    updatedCount++;
                    utils.addDebug(currentEntry, "✅ Zrušená notifikácia ID: " + relatedNotif.field("ID"));
                    
                } catch (updateError) {
                    utils.addError(currentEntry, "Chyba pri aktualizácii notifikácie #" + relatedNotif.field("ID") + ": " + updateError.toString(), "cleanupRelatedNotifications");
                    cleanupResults.errors.push("related_update_error: " + updateError.toString());
                }
            }
        }
        
        cleanupResults.relatedUpdated = updatedCount;
        cleanupResults.notificationsCancelled = updatedCount;
        
        utils.addDebug(currentEntry, "✅ Cleanup dokončený - aktualizovaných " + updatedCount + " notifikácií");
        return updatedCount > 0;
        
    } catch (error) {
        utils.addError(currentEntry, "Related notifications cleanup error: " + error.toString(), "cleanupRelatedNotifications", error);
        cleanupResults.errors.push("related_cleanup_error: " + error.toString());
        return false;
    }
}

// ==============================================
// N8N NOTIFIKÁCIA
// ==============================================

function notifyN8NAboutDeletion(entryData) {
    try {
        utils.addDebug(currentEntry, "🔔 N8N notifikácia o vymazaní...");
        
        // Použij Helper funkciu pre N8N ak je dostupná
        if (notifHelper.triggerN8NIfConfigured) {
            
            // Priprav špeciálny payload pre deletion event
            var deletionPayload = {
                event: "notification_deleted",
                deletedNotification: entryData,
                cleanup: cleanupResults,
                metadata: {
                    deletedAt: moment().toISOString(),
                    deletedBy: user().name(),
                    scriptVersion: CONFIG.version,
                    hasBackup: cleanupResults.backupCreated
                }
            };
            
            // Dočasne uprav current entry pre N8N call
            var originalInfo = currentEntry.field("info") || "";
            utils.safeSet(currentEntry, "info", originalInfo + "\n\nN8N_DELETION_EVENT: " + JSON.stringify(deletionPayload));
            
            var n8nResult = notifHelper.triggerN8NIfConfigured(currentEntry, {
                includeMetadata: true,
                customPayload: deletionPayload,
                scriptVersion: CONFIG.version
            });
            
            if (n8nResult && n8nResult.success) {
                cleanupResults.n8nNotified = true;
                utils.addDebug(currentEntry, "✅ N8N notifikovaný úspešne o vymazaní");
                return true;
            } else {
                var reason = n8nResult ? (n8nResult.reason || n8nResult.error) : "Unknown error";
                utils.addDebug(currentEntry, "⚠️ N8N notifikácia zlyhala: " + reason);
                cleanupResults.errors.push("n8n_notification_failed: " + reason);
                return false;
            }
            
        } else {
            utils.addDebug(currentEntry, "⏭️ N8N Helper funkcia nie je dostupná");
            return false;
        }
        
    } catch (error) {
        utils.addError(currentEntry, "N8N notification error: " + error.toString(), "notifyN8NAboutDeletion", error);
        cleanupResults.errors.push("n8n_notification_error: " + error.toString());
        return false;
    }
}

// ==============================================
// LOGGING A SUMMARY
// ==============================================

function logCleanupSummary(entryData) {
    try {
        utils.addDebug(currentEntry, "\n📊 === CLEANUP SUMMARY ===");
        utils.addDebug(currentEntry, "🗑️ Telegram správy vymazané: " + cleanupResults.telegramDeleted);
        utils.addDebug(currentEntry, "❌ Notifikácie zrušené: " + cleanupResults.notificationsCancelled);
        utils.addDebug(currentEntry, "🔄 Súvisiace aktualizované: " + cleanupResults.relatedUpdated);
        utils.addDebug(currentEntry, "💾 Backup vytvorený: " + (cleanupResults.backupCreated ? "Áno" : "Nie"));
        utils.addDebug(currentEntry, "🔔 N8N notifikovaný: " + (cleanupResults.n8nNotified ? "Áno" : "Nie"));
        utils.addDebug(currentEntry, "⚠️ Chyby: " + cleanupResults.errors.length);
        
        if (cleanupResults.errors.length > 0) {
            utils.addDebug(currentEntry, "\n❌ ZOZNAM CHÝB:");
            for (var i = 0; i < cleanupResults.errors.length; i++) {
                utils.addDebug(currentEntry, "  • " + cleanupResults.errors[i]);
            }
        }
        
        // Vytvor finálny info záznam
        var summaryInfo = "🗑️ NOTIFICATION DELETE SUMMARY\n";
        summaryInfo += "=====================================\n";
        summaryInfo += "📅 Vymazané: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
        summaryInfo += "👤 Vymazal: " + user().name() + "\n";
        summaryInfo += "🆔 Entry ID: " + entryData.id + "\n";
        summaryInfo += "📋 Typ: " + entryData.type + "\n";
        summaryInfo += "📊 Status: " + entryData.status + "\n\n";
        
        summaryInfo += "🧹 CLEANUP ACTIONS:\n";
        summaryInfo += "• Telegram správy vymazané: " + cleanupResults.telegramDeleted + "\n";
        summaryInfo += "• Notifikácie zrušené: " + cleanupResults.notificationsCancelled + "\n";
        summaryInfo += "• Súvisiace aktualizované: " + cleanupResults.relatedUpdated + "\n";
        summaryInfo += "• Backup vytvorený: " + (cleanupResults.backupCreated ? "✅" : "❌") + "\n";
        summaryInfo += "• N8N notifikovaný: " + (cleanupResults.n8nNotified ? "✅" : "❌") + "\n\n";
        
        if (cleanupResults.errors.length > 0) {
            summaryInfo += "⚠️ CHYBY (" + cleanupResults.errors.length + "):\n";
            for (var j = 0; j < cleanupResults.errors.length; j++) {
                summaryInfo += "• " + cleanupResults.errors[j] + "\n";
            }
            summaryInfo += "\n";
        }
        
        summaryInfo += "🔧 Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        summaryInfo += "📚 Helper: " + (notifHelper ? notifHelper.version : "N/A");
        
        // Pridaj summary k existujúcemu info
        var existingInfo = utils.safeGet(currentEntry, "info", "");
        utils.safeSet(currentEntry, "info", existingInfo + "\n\n" + summaryInfo);
        
        utils.addInfo(currentEntry, "Delete trigger dokončený", {
            telegramDeleted: cleanupResults.telegramDeleted,
            notificationsCancelled: cleanupResults.notificationsCancelled,
            relatedUpdated: cleanupResults.relatedUpdated,
            errors: cleanupResults.errors.length,
            success: cleanupResults.errors.length === 0
        });
        
    } catch (error) {
        utils.addError(currentEntry, "Summary logging error: " + error.toString(), "logCleanupSummary", error);
    }
}

function logEmergencyState(error) {
    try {
        var emergencyInfo = "🚨 EMERGENCY DELETE STATE\n";
        emergencyInfo += "========================\n";
        emergencyInfo += "❌ Critical Error: " + error.toString() + "\n";
        emergencyInfo += "⏰ Time: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
        emergencyInfo += "👤 User: " + user().name() + "\n";
        emergencyInfo += "🆔 Entry ID: " + (currentEntry.field("ID") || "unknown") + "\n";
        emergencyInfo += "🔧 Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n\n";
        
        emergencyInfo += "📊 Partial cleanup results:\n";
        emergencyInfo += "• Telegram deleted: " + cleanupResults.telegramDeleted + "\n";
        emergencyInfo += "• Notifications cancelled: " + cleanupResults.notificationsCancelled + "\n";
        emergencyInfo += "• Related updated: " + cleanupResults.relatedUpdated + "\n";
        emergencyInfo += "• Backup created: " + cleanupResults.backupCreated + "\n";
        emergencyInfo += "• N8N notified: " + cleanupResults.n8nNotified + "\n";
        emergencyInfo += "• Previous errors: " + cleanupResults.errors.length;
        
        var existingInfo = utils.safeGet(currentEntry, "info", "");
        utils.safeSet(currentEntry, "info", existingInfo + "\n\n" + emergencyInfo);
        
    } catch (emergencyError) {
        // Ak sa ani emergency logging nepodarí, aspoň do Debug_Log
        var emergencyDebug = "EMERGENCY: " + error.toString() + " | " + moment().format("HH:mm:ss");
        var existingDebug = currentEntry.field("Debug_Log") || "";
        currentEntry.set("Debug_Log", existingDebug + "\n" + emergencyDebug);
    }
}

// ==============================================
// SPUSTENIE HLAVNEJ FUNKCIE
// ==============================================

main();