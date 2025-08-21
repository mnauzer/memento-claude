// ==============================================
// DOCHÁDZKA NOTIFICATION CLEANUP MODULE
// Verzia: 1.0 | Dátum: 20.08.2025 | Autor: ASISTANTO
// ==============================================
// 📋 FUNKCIA:
//    - Modul pre správu notifikácií v dochádzke
//    - Vymazávanie starých notifikácií pri úprave
//    - Integrácia s Telegram Delete API
//    - Prepojenie cez pole "Notifikácie"
// ==============================================

var DochadzkaNotifsCleanup = (function() {
    'use strict';
    
    // Import knižníc
    var utils = null;
    var notifHelper = null;
    var telegramApi = null;
    
    /**
     * Získa MementoUtils s lazy loading
     */
    function getUtils() {
        if (!utils) {
            try {
                if (typeof MementoUtils !== 'undefined') {
                    utils = MementoUtils;
                } else {
                    throw new Error("MementoUtils knižnica nie je dostupná!");
                }
            } catch(e) {
                showError("MementoUtils nie je načítané. Script nemôže pokračovať.", e);
                cancel();
            }
        }
        return utils;
    }

    /**
     * Získa ASISTANTONotifications helper
     */
    function getNotifHelper() {
        if (!notifHelper) {
            try {
                if (typeof ASISTANTONotifications !== 'undefined') {
                    notifHelper = ASISTANTONotifications;
                } else {
                    getUtils().addDebug(getCurrentEntry(), "⚠️ ASISTANTONotifications nie je dostupný");
                }
            } catch(e) {
                // Optional dependency
            }
        }
        return notifHelper;
    }
    
    /**
     * Získa ASISTANTONotifications helper
     */
    function getTelegramApi() {
        if (!telegramApi) {
            try {
                if (typeof ASISTANTOTelegram !== 'undefined') {
                    telegramApi = ASISTANTOTelegram;
                } else {
                    getUtils().addDebug(getCurrentEntry(), "⚠️ ASISTANTOTelegram nie je dostupný");
                }
            } catch(e) {
                // Optional dependency
            }
        }
        return telegramApi;
    }

    var CONFIG = {
        version: "1.0",
        fields: {
            notifikacie: "Notifikácie", // Nové pole v Dochádzke
            messageId: "Message ID",
            chatId: "Chat ID",
            status: "Status"
        }
    };
    
    /**
     * Vymaže všetky linknuté notifikácie z dochádzky
     * @param {Entry} dochadzkaEntry - Záznam dochádzky
     * @returns {Object} - Výsledok cleanup operácie
     */
    function cleanupOldNotifications(dochadzkaEntry) {
        var result = {
            deleted: 0,
            telegramDeleted: 0,
            errors: [],
            success: true
        };
        
        try {
            utils.addDebug(dochadzkaEntry, "🧹 === CLEANUP NOTIFIKÁCIÍ ===");
            
            // Získaj linknuté notifikácie
            var linkedNotifications = utils.safeGetLinks(dochadzkaEntry, CONFIG.fields.notifikacie);
            
            if (!linkedNotifications || linkedNotifications.length === 0) {
                utils.addDebug(dochadzkaEntry, "ℹ️ Žiadne linknuté notifikácie na vymazanie");
                return result;
            }
            
            utils.addDebug(dochadzkaEntry, "📋 Našiel som " + linkedNotifications.length + " notifikácií na vymazanie");
            
            // Spracuj každú notifikáciu
            for (var i = 0; i < linkedNotifications.length; i++) {
                var notif = linkedNotifications[i];
                var notifId = notif.field("ID");
                
                try {
                    // 1. Pokús sa vymazať Telegram správu
                    var telegramResult = deleteTelegramMessage(notif);
                    if (telegramResult.success) {
                        result.telegramDeleted++;
                    }
                    
                    // 2. Vymaž notifikáciu z Memento
                    notif.remove();
                    result.deleted++;
                    
                    utils.addDebug(dochadzkaEntry, "✅ Notifikácia #" + notifId + " vymazaná");
                    
                } catch (error) {
                    result.errors.push("Notifikácia #" + notifId + ": " + error.toString());
                    utils.addError(dochadzkaEntry, "Chyba pri mazaní notifikácie #" + notifId + ": " + error.toString());
                }
            }
            
            // 3. Vyčisti pole Notifikácie v dochádzke
            dochadzkaEntry.set(CONFIG.fields.notifikacie, []);
            
            utils.addDebug(dochadzkaEntry, "🧹 Cleanup dokončený: " + result.deleted + " vymazaných, " + 
                          result.telegramDeleted + " Telegram správ");
            
            result.success = result.errors.length === 0;
            return result;
            
        } catch (error) {
            utils.addError(dochadzkaEntry, "Kritická chyba v cleanup: " + error.toString());
            result.success = false;
            result.errors.push(error.toString());
            return result;
        }
    }
    
    /**
     * Vymaže Telegram správu ak existuje
     * @param {Entry} notificationEntry - Notifikačný záznam
     * @returns {Object} - Výsledok mazania
     */
    function deleteTelegramMessage(notificationEntry) {
        try {
            var messageId = notificationEntry.field(CONFIG.fields.messageId);
            var chatId = notificationEntry.field(CONFIG.fields.chatId);
            var status = notificationEntry.field(CONFIG.fields.status);
            
            // Kontrola či má zmysel mazať
            if (!messageId || !chatId || status !== "Odoslané") {
                return { success: false, reason: "Správa nebola odoslaná alebo chýbajú údaje" };
            }
            
            // Použitie Telegram API na vymazanie
            if (telegramApi && typeof telegramApi.deleteTelegramMessage === 'function') {
                var deleteResult = telegramApi.deleteTelegramMessage(chatId, messageId);
                
                if (deleteResult.success) {
                    utils.addDebug(notificationEntry, "🗑️ Telegram správa vymazaná: " + messageId);
                    return { success: true };
                } else {
                    // Telegram API môže vrátiť chybu ak správa už neexistuje - to je OK
                    if (deleteResult.error && deleteResult.error.indexOf("message to delete not found") > -1) {
                        return { success: true, note: "Správa už bola vymazaná" };
                    }
                    return { success: false, error: deleteResult.error };
                }
            } else {
                // Fallback ak Telegram modul nie je dostupný
                utils.addDebug(notificationEntry, "⚠️ Telegram API nie je dostupné pre mazanie");
                return { success: false, reason: "Telegram API nedostupné" };
            }
            
        } catch (error) {
            return { success: false, error: error.toString() + "Line: " + error.lineNumber };
        }
    }
    
    /**
     * Linkuje novo vytvorené notifikácie k dochádzke
     * @param {Entry} dochadzkaEntry - Záznam dochádzky
     * @param {Array} notifications - Array notifikačných záznamov
     * @returns {boolean} - Úspešnosť linkovania
     */
    function linkNotificationsToDochadzka(dochadzkaEntry, notifications) {
        try {
            if (!notifications || notifications.length === 0) {
                return true; // Nič na linkovanie
            }
            
            // Získaj existujúce notifikácie
            var existingNotifs = dochadzkaEntry.field(CONFIG.fields.notifikacie) || [];
            
            // Pridaj nové
            var allNotifs = existingNotifs.concat(notifications);
            
            // Ulož späť
            dochadzkaEntry.set(CONFIG.fields.notifikacie, allNotifs);
            
            utils.addDebug(dochadzkaEntry, "🔗 Linknutých " + notifications.length + " nových notifikácií");
            
            return true;
            
        } catch (error) {
            utils.addError(dochadzkaEntry, "Chyba pri linkovaní notifikácií: " + error.toString() + "Line: " + error.lineNumber, error);
            return false;
        }
    }
    
    // Public API
    return {
        version: CONFIG.version,
        cleanupOldNotifications: cleanupOldNotifications,
        linkNotificationsToDochadzka: linkNotificationsToDochadzka
    };
    
})();