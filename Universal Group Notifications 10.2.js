// ==============================================
// UNIVERSAL GROUP NOTIFICATION - Vytvorenie notifikácie
// Verzia: 10.2 | Dátum: August 2025 | Autor: ASISTANTO
// Knižnica: Univerzálna | Trigger: After Save
// ==============================================
// 📋 FUNKCIA:
//    - Vytvorí/aktualizuje záznam v knižnici Notifications
//    - Vymaže staré notifikácie pri editácii
//    - Nalinkuje notifikáciu do poľa "Notifikácie"
//    - Používa info_telegram pole pre obsah správy
// ==============================================
// ✅ ZMENY v10.2:
//    - Zjednodušená logika - len vytvorenie záznamu
//    - Odstránené všetky format a extract funkcie
//    - Cleanup existujúcich notifikácií
//    - Bidirectional linking
// ==============================================

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var centralConfig = utils.config;
var currentEntry = entry();
var currentLibrary = lib();

var CONFIG = {
    scriptName: "Universal Group Notification",
    version: "10.2",
    
    // Referencie na centrálny config
    fields: centralConfig.fields,
    libraries: centralConfig.libraries,
    icons: centralConfig.icons,
    
    // Mapovanie knižníc na ich konfigurácie
    libraryMapping: {
        "Dochádzka": {
            messageType: "Dochádzka",
            telegramGroupField: "Telegram skupina dochádzky",
            permissionField: "Dochádzka skupinové notifikácie"
        },
        "Záznam práce": {
            messageType: "Záznam prác",
            telegramGroupField: "Telegram skupina záznamu prác",
            permissionField: "Záznam prác skupinové notifikácie"
        },
        "ASISTANTO API": {
            messageType: "Záznam prác",
            telegramGroupField: "Telegram skupina záznamu prác",
            permissionField: "Záznam prác skupinové notifikácie"
        },
        "Kniha jázd": {
            messageType: "Kniha jázd",
            telegramGroupField: "Telegram skupina knihy jázd",
            permissionField: "Kniha jázd skupinové notifikácie"
        }
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        var libraryName = currentLibrary.title;
        utils.addDebug(currentEntry, utils.getIcon("start") + " === " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        utils.addDebug(currentEntry, "Knižnica: " + libraryName);
        
        // 1. Kontrola či máme info_telegram pole
        var telegramMessage = utils.safeGet(currentEntry, "info_telegram");
        if (!telegramMessage) {
            utils.addDebug(currentEntry, utils.getIcon("info") + " Pole info_telegram je prázdne - žiadna notifikácia");
            return true;
        }
        
        // 2. Identifikácia knižnice
        var libraryConfig = CONFIG.libraryMapping[libraryName];
        if (!libraryConfig) {
            utils.addDebug(currentEntry, utils.getIcon("info") + " Knižnica '" + libraryName + "' nie je nakonfigurovaná pre notifikácie");
            return true;
        }
        
        // 3. Kontrola povolení
        if (!checkPermissions(libraryConfig.permissionField)) {
            utils.addDebug(currentEntry, utils.getIcon("info") + " Skupinové notifikácie sú vypnuté");
            return true;
        }
        
        // 4. Získanie Telegram skupiny
        var telegramGroup = getTelegramGroup(libraryConfig.telegramGroupField);
        if (!telegramGroup) {
            utils.addDebug(currentEntry, utils.getIcon("warning") + " Telegram skupina nenájdená alebo neaktívna");
            return true;
        }
        
        // 5. Cleanup starých notifikácií
        var cleanupResult = cleanupOldNotifications();
        if (cleanupResult.deletedCount > 0) {
            utils.addDebug(currentEntry, utils.getIcon("delete") + " Vymazaných " + cleanupResult.deletedCount + " starých notifikácií");
        }
        
        // 6. Vytvorenie novej notifikácie
        var notification = createNotification({
            message: telegramMessage,
            messageType: libraryConfig.messageType,
            telegramGroup: telegramGroup
        });
        
        if (!notification) {
            utils.addError(currentEntry, "Nepodarilo sa vytvoriť notifikáciu", "main");
            return false;
        }
        
        // 7. Nalinkuj notifikáciu k záznamu
        linkNotification(notification);
        
        utils.addDebug(currentEntry, utils.getIcon("success") + " Notifikácia vytvorená (ID: " + notification.field("ID") + ")");
        utils.addDebug(currentEntry, utils.getIcon("success") + " === SCRIPT DOKONČENÝ ===");
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        return false;
    }
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

function checkPermissions(permissionField) {
    try {
        var defaultsLib = libByName(CONFIG.libraries.defaults);
        if (!defaultsLib) return false;
        
        var settings = defaultsLib.entries();
        if (!settings || settings.length === 0) return false;
        
        var defaultSettings = settings[settings.length - 1];
        var enabled = utils.safeGet(defaultSettings, permissionField, false);
        
        utils.addDebug(currentEntry, "  • " + permissionField + ": " + (enabled ? "ÁNO" : "NIE"));
        
        return enabled;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "checkPermissions", error);
        return false;
    }
}

function getTelegramGroup(telegramGroupField) {
    try {
        var defaultsLib = libByName(CONFIG.libraries.defaults);
        if (!defaultsLib) return null;
        
        var settings = defaultsLib.entries();
        if (!settings || settings.length === 0) return null;
        
        var defaultSettings = settings[settings.length - 1];
        
        // Získaj pole telegram skupín (je to array!)
        var telegramGroupEntries = utils.safeGet(defaultSettings, telegramGroupField);
        
        if (!telegramGroupEntries || telegramGroupEntries.length === 0) {
            utils.addError(currentEntry, "Telegram skupina nie je nastavená v poli '" + telegramGroupField + "'", "getTelegramGroup");
            return null;
        }
        
        // Vyber prvú skupinu z array
        var telegramGroup = telegramGroupEntries[0];
        
        // Kontrola povolených notifikácií
        var notificationsEnabled = utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.enableNotifications, false);
        if (!notificationsEnabled) {
            utils.addDebug(currentEntry, utils.getIcon("warning") + " Skupina má vypnuté notifikácie");
            return null;
        }
        
        var groupName = utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.groupName);
        var chatId = utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.chatId);
        
        utils.addDebug(currentEntry, "  • Skupina: " + groupName);
        utils.addDebug(currentEntry, "  • Chat ID: " + chatId);
        
        return telegramGroup;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "getTelegramGroup", error);
        return null;
    }
}

function cleanupOldNotifications() {
    try {
        var existingNotifications = utils.safeGet(currentEntry, "Notifikácie", []);
        var deletedCount = 0;
        
        for (var i = 0; i < existingNotifications.length; i++) {
            try {
                var notification = existingNotifications[i];
                if (notification && notification.trash) {
                    notification.trash();
                    deletedCount++;
                }
            } catch (deleteError) {
                utils.addError(currentEntry, "Chyba pri mazaní notifikácie: " + deleteError.toString(), "cleanupOldNotifications");
            }
        }
        
        // Vyčisti pole
        currentEntry.set("Notifikácie", []);
        
        return {
            success: true,
            deletedCount: deletedCount
        };
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba pri cleanup: " + error.toString(), "cleanupOldNotifications", error);
        return {
            success: false,
            deletedCount: 0
        };
    }
}

function createNotification(params) {
    try {
        var notifLib = libByName(CONFIG.libraries.notifications);
        if (!notifLib) {
            utils.addError(currentEntry, "Knižnica " + CONFIG.libraries.notifications + " nenájdená", "createNotification");
            return null;
        }
        
        var notification = notifLib.create({});
        
        // Základné polia
        notification.set(CONFIG.fields.notifications.status, "Čaká");
        notification.set(CONFIG.fields.notifications.priority, 
            utils.safeGet(params.telegramGroup, CONFIG.fields.telegramGroups.messagePriority, "Normálna"));
        notification.set(CONFIG.fields.notifications.messageType, params.messageType);
        notification.set(CONFIG.fields.notifications.messageSource, "Automatická");
        
        // Formátovanie - detekuj podľa obsahu správy
        var formatting = detectFormatting(params.message);
        notification.set(CONFIG.fields.notifications.formatting, formatting);
        
        // Telegram polia
        notification.set(CONFIG.fields.notifications.chatId, 
            utils.safeGet(params.telegramGroup, CONFIG.fields.telegramGroups.chatId));
        
        var threadId = utils.safeGet(params.telegramGroup, CONFIG.fields.telegramGroups.threadId);
        if (threadId) {
            notification.set(CONFIG.fields.notifications.threadId, threadId);
        }
        
        // Obsah správy
        notification.set(CONFIG.fields.notifications.message, params.message);
        
        // Prepojenia
        notification.set(CONFIG.fields.notifications.groupOrTopic, params.telegramGroup);
        
        // Info pole
        var infoMsg = "📋 NOTIFIKÁCIA - " + params.messageType.toUpperCase() + "\n";
        infoMsg += "Vytvorené: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
        infoMsg += "Zdrojová knižnica: " + lib().title + "\n";
        infoMsg += "Zdrojový záznam: #" + currentEntry.field("ID") + "\n";
        infoMsg += "Skupina: " + utils.safeGet(params.telegramGroup, CONFIG.fields.telegramGroups.groupName) + "\n";
        infoMsg += "Chat ID: " + utils.safeGet(params.telegramGroup, CONFIG.fields.telegramGroups.chatId) + "\n";
        if (threadId) {
            infoMsg += "Thread ID: " + threadId + "\n";
        }
        infoMsg += "Formátovanie: " + formatting;
        
        notification.set(CONFIG.fields.common.info, infoMsg);
        
        return notification;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createNotification", error);
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
        var existingNotifications = utils.safeGet(currentEntry, "Notifikácie", []);
        existingNotifications.push(notification);
        currentEntry.set("Notifikácie", existingNotifications);
        
        utils.addDebug(currentEntry, "  • Notifikácia nalinkovaná k záznamu");
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri linkovaní notifikácie: " + error.toString(), "linkNotification", error);
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

// Kontrola závislostí
var dependencyCheck = utils.checkDependencies(['config', 'core']);
if (!dependencyCheck.success) {
    message("❌ Chýbajú potrebné moduly: " + dependencyCheck.missing.join(", "));
    cancel();
}

// Spustenie hlavnej funkcie
var result = main();

// Ak hlavná funkcia zlyhala, zaloguj ale neprerušuj uloženie (After Save)
if (!result) {
    utils.addError(currentEntry, "Script zlyhal ale záznam bol uložený", "main");
}