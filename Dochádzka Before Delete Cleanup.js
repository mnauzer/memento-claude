// ==============================================
// DOCHÁDZKA - BEFORE DELETE CLEANUP
// Verzia: 1.1 | Dátum: December 2024 | Autor: ASISTANTO
// Knižnica: Dochádzka | Trigger: Before Delete (Deleting an Entry)
// ==============================================
// 📋 FUNKCIA:
//    - Odstráni všetky záväzky linkované na tento záznam (linksFrom)
//    - Odstráni notifikácie linkované na tento záznam
//    - Vymaže správy z Telegramu ak existujú
//    - Vytvorí audit log pred vymazaním
// ==============================================
// 🔧 POUŽÍVA:
//    - MementoUtils v7.0+ (agregátor)
//    - MementoConfig (centrálna konfigurácia)
//    - MementoCore (základné funkcie)
//    - MementoTelegram (Telegram funkcie)
// ==============================================

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var config = utils.getConfig();
var centralConfig = utils.config;
var currentEntry = entry();

var CONFIG = {
    scriptName: "Dochádzka Before Delete Cleanup",
    version: "1.0",
    
    // Referencie na centrálny config
    fields: {
        attendance: centralConfig.fields.attendance,
        obligations: centralConfig.fields.obligations,
        notifications: centralConfig.fields.notifications,
        common: centralConfig.fields.common
    },
    
    libraries: centralConfig.libraries,
    icons: centralConfig.icons,
    
    // Audit log nastavenia
    auditLog: {
        enabled: true,
        libraryName: "Audit Log",
        createRecord: true
    }
};

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

/**
 * Vytvorí audit log pred vymazaním
 * @param {Object} deletedData - Údaje o vymazávaných záznamoch
 */
function createAuditLog(deletedData) {
    try {
        if (!CONFIG.auditLog.enabled) return;
        
        var auditLib = libByName(CONFIG.auditLog.libraryName);
        if (!auditLib && CONFIG.auditLog.createRecord) {
            // Vytvor jednoduchý audit záznam v poli info
            var auditInfo = "=== AUDIT LOG - VYMAZANIE ZÁZNAMU ===\n";
            auditInfo += "Dátum/čas: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
            auditInfo += "Používateľ: " + utils.getCurrentUser() + "\n";
            auditInfo += "Knižnica: Dochádzka\n";
            auditInfo += "Záznam ID: " + currentEntry.field("ID") + "\n";
            auditInfo += "Dátum záznamu: " + utils.formatDate(currentEntry.field(CONFIG.fields.attendance.date)) + "\n\n";
            
            auditInfo += "VYMAZANÉ SÚVISIACE ZÁZNAMY:\n";
            auditInfo += "• Záväzky: " + deletedData.obligations.count + " záznamov\n";
            auditInfo += "• Notifikácie: " + deletedData.notifications.count + " záznamov\n";
            auditInfo += "• Telegram správy: " + deletedData.telegram.count + " správ\n\n";
            
            auditInfo += "DETAILY:\n" + JSON.stringify(deletedData, null, 2);
            
            // Ulož do existujúceho info poľa (bude vymazané s hlavným záznamom)
            utils.safeSet(currentEntry, CONFIG.fields.common.info, 
                         utils.safeGet(currentEntry, CONFIG.fields.common.info, "") + "\n\n" + auditInfo);
            
            utils.addDebug(currentEntry, "Audit log vytvorený");
        }
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri vytváraní audit logu", "createAuditLog", error);
    }
}

/**
 * Odstráni záväzky linkované na tento záznam
 * @returns {Object} Výsledok operácie
 */
function deleteLinkedObligations() {
    var result = {
        count: 0,
        deleted: [],
        errors: []
    };
    
    try {
        utils.addDebug(currentEntry, utils.getIcon("start") + " Začínam mazanie linkovaných záväzkov");
        
        // Získaj záväzky cez linksFrom
        var obligations = currentEntry.linksFrom(CONFIG.libraries.obligations, CONFIG.fields.obligations.attendance);
        
        if (!obligations || obligations.length === 0) {
            utils.addDebug(currentEntry, "Žiadne linkované záväzky nenájdené");
            return result;
        }
        
        utils.addDebug(currentEntry, "Našiel som " + obligations.length + " záväzkov na vymazanie");
        
        // Vymaž každý záväzok
        for (var i = 0; i < obligations.length; i++) {
            try {
                var obligation = obligations[i];
                var obligationId = obligation.field("ID");
                var obligationType = utils.safeGet(obligation, "Typ", "Neznámy");
                var obligationAmount = utils.safeGet(obligation, "Suma", 0);
                
                // Zaznamenaj údaje pred vymazaním
                result.deleted.push({
                    id: obligationId,
                    typ: obligationType,
                    suma: obligationAmount
                });
                
                // Vymaž záväzok
                obligation.trash();
                result.count++;
                
                utils.addDebug(currentEntry, "✅ Vymazaný záväzok #" + obligationId + 
                             " (" + obligationType + ", " + utils.formatMoney(obligationAmount) + ")");
                
            } catch (deleteError) {
                result.errors.push(deleteError.toString());
                utils.addError(currentEntry, "Chyba pri mazaní záväzku: " + deleteError.toString(), 
                             "deleteLinkedObligations", deleteError);
            }
        }
        
        utils.addDebug(currentEntry, utils.getIcon("success") + " Vymazaných " + result.count + 
                      " z " + obligations.length + " záväzkov");
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba pri mazaní záväzkov", "deleteLinkedObligations", error);
        result.errors.push(error.toString());
    }
    
    return result;
}

/**
 * Odstráni notifikácie a Telegram správy
 * @returns {Object} Výsledok operácie
 */
function deleteLinkedNotifications() {
    var result = {
        notifications: {
            count: 0,
            deleted: []
        },
        telegram: {
            count: 0,
            deleted: []
        },
        errors: []
    };
    
    try {
        utils.addDebug(currentEntry, utils.getIcon("start") + " Začínam mazanie notifikácií");
        
        // Získaj linkované notifikácie
        var notifications = utils.safeGetLinks(currentEntry, CONFIG.fields.common.notifications);
        
        if (!notifications || notifications.length === 0) {
            utils.addDebug(currentEntry, "Žiadne linkované notifikácie nenájdené");
            return result;
        }
        
        utils.addDebug(currentEntry, "Našiel som " + notifications.length + " notifikácií");
        
        // Spracuj každú notifikáciu
        for (var i = 0; i < notifications.length; i++) {
            try {
                var notification = notifications[i];
                var notificationId = notification.field("ID");
                var chatId = utils.safeGet(notification, CONFIG.fields.notifications.chatId);
                var messageId = utils.safeGet(notification, CONFIG.fields.notifications.messageId);
                
                // Zaznamenaj údaje
                result.notifications.deleted.push({
                    id: notificationId,
                    chatId: chatId,
                    messageId: messageId
                });
                
                // Vymaž správu z Telegramu (ak existuje)
                if (chatId && messageId) {
                    utils.addDebug(currentEntry, "Mažem Telegram správu - Chat: " + chatId + ", Message: " + messageId);
                    
                    var deleteResult = utils.deleteTelegramMessage(chatId, messageId);
                    
                    if (deleteResult && deleteResult.success) {
                        result.telegram.count++;
                        result.telegram.deleted.push({
                            chatId: chatId,
                            messageId: messageId
                        });
                        utils.addDebug(currentEntry, "✅ Telegram správa vymazaná");
                    } else {
                        utils.addDebug(currentEntry, "⚠️ Nepodarilo sa vymazať Telegram správu: " + 
                                     (deleteResult ? deleteResult.error : "Neznáma chyba"));
                    }
                }
                
                // Vymaž notifikáciu z knižnice
                notification.trash();
                result.notifications.count++;
                
                utils.addDebug(currentEntry, "✅ Vymazaná notifikácia #" + notificationId);
                
            } catch (deleteError) {
                result.errors.push(deleteError.toString());
                utils.addError(currentEntry, "Chyba pri mazaní notifikácie: " + deleteError.toString(), 
                             "deleteLinkedNotifications", deleteError);
            }
        }
        
        utils.addDebug(currentEntry, utils.getIcon("success") + " Vymazané notifikácie: " + 
                      result.notifications.count + ", Telegram správy: " + result.telegram.count);
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba pri mazaní notifikácií", "deleteLinkedNotifications", error);
        result.errors.push(error.toString());
    }
    
    return result;
}

/**
 * Odstráni všetky linkované záznamy práce, knihy jázd a pokladne
 * @returns {Object} Výsledok operácie
 */
function deleteOtherLinkedRecords() {
    var result = {
        workRecords: 0,
        rideLog: 0,
        cashBook: 0
    };
    
    try {
        // Záznamy práce
        var workRecords = utils.safeGetLinks(currentEntry, CONFIG.fields.attendance.workRecord);
        if (workRecords && workRecords.length > 0) {
            utils.addDebug(currentEntry, "⚠️ Našiel som " + workRecords.length + 
                          " linkovaných záznamov práce - tie sa nemažú automaticky");
            result.workRecords = workRecords.length;
        }
        
        // Kniha jázd
        var rideLog = utils.safeGetLinks(currentEntry, CONFIG.fields.attendance.rideLog);
        if (rideLog && rideLog.length > 0) {
            utils.addDebug(currentEntry, "⚠️ Našiel som " + rideLog.length + 
                          " linkovaných jázd - tie sa nemažú automaticky");
            result.rideLog = rideLog.length;
        }
        
        // Pokladňa
        var cashBook = utils.safeGetLinks(currentEntry, CONFIG.fields.attendance.cashBook);
        if (cashBook && cashBook.length > 0) {
            utils.addDebug(currentEntry, "⚠️ Našiel som " + cashBook.length + 
                          " linkovaných pokladničných dokladov - tie sa nemažú automaticky");
            result.cashBook = cashBook.length;
        }
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri kontrole ostatných linkovaných záznamov", 
                      "deleteOtherLinkedRecords", error);
    }
    
    return result;
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, utils.getIcon("start") + " === " + CONFIG.scriptName + 
                      " v" + CONFIG.version + " ===");
        
        var date = currentEntry.field(CONFIG.fields.attendance.date);
        var employees = utils.safeGetLinks(currentEntry, CONFIG.fields.attendance.employees);
        
        utils.addDebug(currentEntry, "Mažem dochádzku z " + utils.formatDate(date) + 
                      " pre " + employees.length + " zamestnancov");
        
        // Zbierka výsledkov pre audit
        var deletedData = {
            date: date,
            employeesCount: employees.length,
            obligations: { count: 0, deleted: [], errors: [] },
            notifications: { count: 0, deleted: [] },
            telegram: { count: 0, deleted: [] },
            otherRecords: {}
        };
        
        // KROK 1: Vymaž záväzky
        utils.addDebug(currentEntry, utils.getIcon("delete") + " KROK 1: Mazanie záväzkov");
        var obligationsResult = deleteLinkedObligations();
        deletedData.obligations = obligationsResult;
        
        // KROK 2: Vymaž notifikácie a Telegram správy
        utils.addDebug(currentEntry, utils.getIcon("delete") + " KROK 2: Mazanie notifikácií a Telegram správ");
        var notificationsResult = deleteLinkedNotifications();
        deletedData.notifications = notificationsResult.notifications;
        deletedData.telegram = notificationsResult.telegram;
        
        // KROK 3: Skontroluj ostatné linkované záznamy
        utils.addDebug(currentEntry, utils.getIcon("info") + " KROK 3: Kontrola ostatných linkovaných záznamov");
        deletedData.otherRecords = deleteOtherLinkedRecords();
        
        // KROK 4: Vytvor audit log
        if (CONFIG.auditLog.enabled) {
            utils.addDebug(currentEntry, utils.getIcon("note") + " KROK 4: Vytvorenie audit logu");
            createAuditLog(deletedData);
        }
        
        // Finálny súhrn
        utils.addDebug(currentEntry, "\n" + utils.getIcon("success") + " === SÚHRN VYMAZANÝCH ZÁZNAMOV ===");
        utils.addDebug(currentEntry, "• Záväzky: " + deletedData.obligations.count);
        utils.addDebug(currentEntry, "• Notifikácie: " + deletedData.notifications.count);
        utils.addDebug(currentEntry, "• Telegram správy: " + deletedData.telegram.count);
        
        if (deletedData.otherRecords.workRecords > 0 || 
            deletedData.otherRecords.rideLog > 0 || 
            deletedData.otherRecords.cashBook > 0) {
            utils.addDebug(currentEntry, "\n⚠️ UPOZORNENIE - Tieto záznamy ostávajú:");
            if (deletedData.otherRecords.workRecords > 0) {
                utils.addDebug(currentEntry, "• Záznamy práce: " + deletedData.otherRecords.workRecords);
            }
            if (deletedData.otherRecords.rideLog > 0) {
                utils.addDebug(currentEntry, "• Kniha jázd: " + deletedData.otherRecords.rideLog);
            }
            if (deletedData.otherRecords.cashBook > 0) {
                utils.addDebug(currentEntry, "• Pokladňa: " + deletedData.otherRecords.cashBook);
            }
        }
        
        utils.addDebug(currentEntry, "\n" + utils.getIcon("success") + 
                      " === CLEANUP DOKONČENÝ - záznam bude vymazaný ===");
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        
        // Pri chybe zastavíme vymazanie
        cancel();
        message("❌ Chyba pri čistení súvisiacich záznamov! Vymazanie bolo zrušené.\n\n" + 
                "Chyba: " + error.toString());
        return false;
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

// Spustenie hlavnej funkcie
var result = main();

if (!result) {
    // Ak nastala chyba, zruš vymazanie
    cancel();
}