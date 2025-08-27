// ==============================================
// UNIVERSAL GROUP NOTIFICATION - Vytvorenie notifikácie
// Verzia: 10.0 | Dátum: December 2024 | Autor: ASISTANTO
// Knižnica: Univerzálna | Trigger: After Save
// ==============================================
// 📋 FUNKCIA:
//    - Univerzálny script pre všetky knižnice
//    - Automaticky rozpozná typ knižnice
//    - Vytvorí záznam v knižnici Notifications
//    - Pripravený pre migráciu do MementoNotifications
// ==============================================
// 🔧 POUŽÍVA:
//    - MementoUtils v7.0+ (základné funkcie)
//    - MementoConfig v7.0+ (centrálny CONFIG)
//    - Pripravené pre MementoNotifications v7.0
// ==============================================
// ✅ UNIVERZÁLNE v10.0:
//    - Automatická detekcia knižnice
//    - Dynamické mapovanie polí
//    - Flexibilné formátovanie správ
//    - Pripravené pre migráciu
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
    version: "10.0",
    
    // Referencie na centrálny config
    fields: centralConfig.fields,
    attributes: centralConfig.attributes,
    libraries: centralConfig.libraries,
    icons: centralConfig.icons,
    
    // Mapovanie knižníc na ich konfigurácie
    libraryMapping: {
        // Názov knižnice -> konfigurácia
        "Dochádzka": {
            type: "attendance",
            telegramGroupField: "Telegram skupina dochádzky",
            permissionField: "Dochádzka skupinové notifikácie",
            messageType: "Dochádzka",
            fields: centralConfig.fields.attendance,
            formatFunction: formatAttendanceMessage,
            dataExtractor: extractAttendanceData
        },
        "Záznam práce": {
            type: "workRecord",
            telegramGroupField: "Telegram skupina záznamu prác",
            permissionField: "Záznam prác skupinové notifikácie",
            messageType: "Záznam prác",
            fields: centralConfig.fields.workRecord,
            formatFunction: formatWorkRecordMessage,
            dataExtractor: extractWorkRecordData
        },
        "ASISTANTO API": {
            type: "workRecord",
            telegramGroupField: "Telegram skupina záznamu prác",
            permissionField: "Záznam prác skupinové notifikácie",
            messageType: "Záznam prác",
            fields: centralConfig.fields.workRecord,
            formatFunction: formatWorkRecordMessage,
            dataExtractor: extractWorkRecordData
        },
        "Kniha jázd": {
            type: "bookOfRides",
            telegramGroupField: "Telegram skupina knihy jázd",
            permissionField: "Kniha jázd skupinové notifikácie",
            messageType: "Kniha jázd",
            fields: centralConfig.fields.bookOfRides,
            formatFunction: formatBookOfRidesMessage,
            dataExtractor: extractBookOfRidesData
        },
        "Záväzky": {
            type: "obligations",
            telegramGroupField: "Telegram skupina záväzkov",
            permissionField: "Záväzky skupinové notifikácie",
            messageType: "Záväzky",
            fields: centralConfig.fields.obligations,
            formatFunction: formatObligationsMessage,
            dataExtractor: extractObligationsData
        },
        "Pokladňa": {
            type: "cashRegister",
            telegramGroupField: "Telegram skupina pokladne",
            permissionField: "Pokladňa skupinové notifikácie",
            messageType: "Pokladňa",
            fields: centralConfig.fields.cashRegister,
            formatFunction: formatCashRegisterMessage,
            dataExtractor: extractCashRegisterData
        }
    }
};

// ==============================================
// HLAVNÁ FUNKCIA - UNIVERZÁLNA
// ==============================================

function main() {
    try {
        var libraryName = currentLibrary.title;
        utils.addDebug(currentEntry, utils.getIcon("start") + " === UNIVERSAL GROUP NOTIFICATION v" + CONFIG.version + " ===");
        utils.addDebug(currentEntry, "Knižnica: " + libraryName);
        
        // 1. IDENTIFIKÁCIA KNIŽNICE
        var libraryConfig = identifyLibrary(libraryName);
        if (!libraryConfig) {
            utils.addDebug(currentEntry, utils.getIcon("info") + " Knižnica '" + libraryName + "' nie je nakonfigurovaná pre notifikácie");
            return true; // Nie je to chyba
        }
        
        // 2. KONTROLA ZÁVISLOSTÍ
        var depCheck = utils.checkDependencies(['config', 'core']);
        if (!depCheck.success) {
            utils.addError(currentEntry, "Chýbajú potrebné moduly: " + depCheck.missing.join(", "), "main");
            return false;
        }
        
        // 3. KONTROLA POVOLENÍ
        if (!checkPermissions(libraryConfig)) {
            utils.addDebug(currentEntry, utils.getIcon("info") + " Skupinové notifikácie sú vypnuté pre " + libraryName);
            return true;
        }
        
        // 4. ZÍSKANIE TELEGRAM SKUPINY
        var telegramGroup = getTelegramGroup(libraryConfig);
        if (!telegramGroup) {
            utils.addDebug(currentEntry, utils.getIcon("warning") + " Telegram skupina nenájdená alebo neaktívna");
            return true;
        }
        
        // 5. EXTRAKCIA DÁT
        var extractedData = extractData(libraryConfig);
        if (!extractedData) {
            utils.addError(currentEntry, "Nepodarilo sa extrahovať dáta", "main");
            return false;
        }
        
        // 6. FORMÁTOVANIE SPRÁVY
        var message = formatMessage(libraryConfig, extractedData);
        if (!message) {
            utils.addError(currentEntry, "Nepodarilo sa sformátovať správu", "main");
            return false;
        }
        
        // 7. VYTVORENIE NOTIFIKÁCIE
        var notification = createNotification({
            libraryConfig: libraryConfig,
            telegramGroup: telegramGroup,
            message: message,
            data: extractedData
        });
        
        if (!notification) {
            utils.addError(currentEntry, "Nepodarilo sa vytvoriť notifikáciu", "main");
            return false;
        }
        
        utils.addDebug(currentEntry, utils.getIcon("success") + " Notifikácia vytvorená (ID: " + notification.field("ID") + ")");
        utils.addDebug(currentEntry, utils.getIcon("success") + " === SCRIPT DOKONČENÝ ===");
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        return false;
    }
}

// ==============================================
// UNIVERZÁLNE FUNKCIE
// ==============================================

function identifyLibrary(libraryName) {
    return CONFIG.libraryMapping[libraryName] || null;
}

function checkPermissions(libraryConfig) {
    try {
        var defaultsLib = libByName(CONFIG.libraries.defaults);
        if (!defaultsLib) return false;
        
        var settings = defaultsLib.entries();
        if (!settings || settings.length === 0) return false;
        
        var defaultSettings = settings[settings.length - 1];
        var enabled = utils.safeGet(defaultSettings, libraryConfig.permissionField, false);
        
        utils.addDebug(currentEntry, "  • " + libraryConfig.permissionField + ": " + (enabled ? "ÁNO" : "NIE"));
        
        return enabled;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "checkPermissions", error);
        return false;
    }
}

function getTelegramGroup(libraryConfig) {
    try {
        var defaultsLib = libByName(CONFIG.libraries.defaults);
        if (!defaultsLib) return null;
        
        
        var settings = defaultsLib.entries();
        if (!settings || settings.length === 0) return false;
        
        var defaultSettings = settings[settings.length - 1];
        var enabled = utils.safeGet(defaultSettings, libraryConfig.telegramGroupField , " ");
        utils.addDebug(currentEntry, "  • " + libraryConfig.telegramGroupField + ": " + (enabled ? "NÁJDENÁ" : "NENÁJDENÁ"));
        var telegramGroupEntries = utils.safeGet(defaultSettings, libraryConfig.telegramGroupField); // Telegram skupina dochádzky hardcoded for no
        var telegramGroup = telegramGroupEntries[0];
        utils.addDebug(currentEntry, "  • Telegram skupina: " + utils.safeGet(telegramGroup, "Názov skupiny") + " " + utils.safeGet(telegramGroup, "Názov témy"));
        if (!telegramGroup) {
            utils.addError(currentEntry, "Telegram skupina nie je nastavená v poli '" + libraryConfig.telegramGroupField + "'", "getTelegramGroup");
            return null;
        }
        
        // Validácia skupiny
        if (!validateTelegramGroup(telegramGroup)) {
            return null;
        }
        
        return telegramGroup;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "getTelegramGroup", error);
        return null;
    }
}

function validateTelegramGroup(telegramGroup) {
    // Kontrola povolených notifikácií
    var notificationsEnabled = utils.safeGet(telegramGroup, "Povoliť notifikácie", false); // Hardcoded for now
    if (!notificationsEnabled) {
        utils.addDebug(currentEntry, utils.getIcon("warning") + " Skupina má vypnuté notifikácie");
        return false;
    }
    
    // Kontrola časových obmedzení
    if (!checkTimeRestrictions(telegramGroup)) {
        return false;
    }
    
    var groupName = utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.groupName);
    var chatId = utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.chatId);
    
    utils.addDebug(currentEntry, "  • Skupina: " + groupName);
    utils.addDebug(currentEntry, "  • Chat ID: " + chatId);
    
    return true;
}

function checkTimeRestrictions(telegramGroup) {
    try {
        var now = moment();
        
        // Kontrola víkendu
        if (utils.isWeekend(now)) {
            var weekendAllowed = utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.weekendEnabled, false);
            if (!weekendAllowed) {
                utils.addDebug(currentEntry, utils.getIcon("warning") + " Víkendové notifikácie nie sú povolené");
                return false;
            }
        }
        
        // Kontrola pracovného času
        var workTimeFrom = utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.workTimeFrom);
        var workTimeTo = utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.workTimeTo);
        
        if (workTimeFrom && workTimeTo) {
            var currentTime = now.format("HH:mm");
            var fromTime = moment(workTimeFrom).format("HH:mm");
            var toTime = moment(workTimeTo).format("HH:mm");
            
            if (currentTime < fromTime || currentTime > toTime) {
                utils.addDebug(currentEntry, "  • Mimo pracovného času (" + fromTime + " - " + toTime + ")");
                return false;
            }
        }
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "checkTimeRestrictions", error);
        return true;
    }
}

function extractData(libraryConfig) {
    try {
        // Prioritne hľadaj info_telegram pole
        var telegramInfoField = "info_telegram";
        var telegramInfo = utils.safeGet(currentEntry, telegramInfoField);
        
        if (telegramInfo) {
            utils.addDebug(currentEntry, "  • Použijem info_telegram pole");
            return {
                formattedMessage: telegramInfo,
                useDirectMessage: true
            };
        }
        
        // Ak nie je info_telegram, skús obyčajné info pole a preformátuj
        var infoField = CONFIG.fields.common.info;
        var infoContent = utils.safeGet(currentEntry, infoField);
        
        if (infoContent) {
            utils.addDebug(currentEntry, "  • Konvertujem info pole na Markdown");
            return {
                formattedMessage: convertTextToMarkdown(infoContent),
                useDirectMessage: true
            };
        }
        
        // Fallback na pôvodný data extractor
        utils.addDebug(currentEntry, "  • Používam štandardný data extractor");
        if (libraryConfig.dataExtractor) {
            return libraryConfig.dataExtractor(currentEntry, libraryConfig.fields);
        }
        
        return null;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "extractData", error);
        return null;
    }
}

function formatMessage(libraryConfig, data) {
    try {
        // Ak máme priamo formátovanú správu, použi ju
        if (data && data.useDirectMessage && data.formattedMessage) {
            return data.formattedMessage;
        }
        
        // Inak použi štandardný formatter
        if (libraryConfig.formatFunction) {
            return libraryConfig.formatFunction(data, currentEntry);
        }
        
        return formatDefaultMessage(libraryConfig.messageType, data);
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "formatMessage", error);
        return null;
    }
}

// Pomocná funkcia na konverziu textu na Markdown
function convertTextToMarkdown(text) {
    if (!text) return "";
    
    // Základná konverzia
    var lines = text.split('\n');
    var markdown = "";
    
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        
        // Detekuj hlavičky (riadky s veľkými písmenami alebo === podčiarknutím)
        if (line.match(/^[A-Z\s]+$/) || line.match(/^═+$/)) {
            if (line.match(/^═+$/)) {
                continue; // Preskočí podčiarknutie
            }
            markdown += "*" + line.trim() + "*\n";
        }
        // Detekuj sekcie (riadky s dvojbodkou na konci)
        else if (line.match(/^.+:$/)) {
            markdown += "\n*" + line + "*\n";
        }
        // Detekuj položky zoznamu
        else if (line.match(/^[•●▪▫◦‣⁃]\s/) || line.match(/^[-*]\s/)) {
            markdown += line + "\n";
        }
        // Zvýrazni čísla a sumy
        else if (line.match(/\d+\s*(€|EUR|hodín|h|km)/)) {
            markdown += line.replace(/(\d+(?:\.\d+)?)\s*(€|EUR|hodín|h|km)/g, "*$1 $2*") + "\n";
        }
        // Ostatné riadky
        else {
            markdown += escapeMarkdown(line) + "\n";
        }
    }
    
    return markdown;
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
        notification.set(CONFIG.fields.notifications.messageType, params.libraryConfig.messageType);
        notification.set(CONFIG.fields.notifications.messageSource, "Automatická");
        notification.set(CONFIG.fields.notifications.formatting, "Markdown");
        
        // Telegram polia
        notification.set(CONFIG.fields.notifications.chatId, 
            utils.safeGet(params.telegramGroup, CONFIG.fields.telegramGroups.chatId));
        
        var threadId = utils.safeGet(params.telegramGroup, CONFIG.fields.telegramGroups.threadId);
        if (threadId) {
            notification.set(CONFIG.fields.notifications.threadId, threadId);
        }
        
        // Obsah
        notification.set(CONFIG.fields.notifications.message, params.message);
        
        // Prepojenia
        notification.set(CONFIG.fields.notifications.groupOrTopic, params.telegramGroup);
        
        // Info pole
        var infoMsg = createNotificationInfo(params);
        notification.set(CONFIG.fields.common.info, infoMsg);
        
        return notification;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createNotification", error);
        return null;
    }
}

function createNotificationInfo(params) {
    var info = "📋 NOTIFIKÁCIA - " + params.libraryConfig.messageType.toUpperCase() + "\n";
    info += "Vytvorené: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
    info += "Zdrojová knižnica: " + lib().title + "\n";
    info += "Zdrojový záznam: #" + currentEntry.field("ID") + "\n";
    info += "Skupina: " + utils.safeGet(params.telegramGroup, CONFIG.fields.telegramGroups.groupName) + "\n";
    info += "Chat ID: " + utils.safeGet(params.telegramGroup, CONFIG.fields.telegramGroups.chatId) + "\n";
    
    var threadId = utils.safeGet(params.telegramGroup, CONFIG.fields.telegramGroups.threadId);
    if (threadId) {
        info += "Thread ID: " + threadId + "\n";
    }
    
    return info;
}
// ==============================================
// BIDIRECTIONAL LINKING FUNKCIE
// ==============================================

/**
 * Vytvorí obojstranné prepojenie medzi zdrojovým záznamom a notifikáciou
 * @param {Entry} sourceEntry - Zdrojový záznam
 * @param {Entry} notification - Vytvorená notifikácia
 * @param {string} linkFieldName - Názov poľa pre linkovanie (default: "Notifikácie")
 */
function createBidirectionalLink(sourceEntry, notification, linkFieldName) {
    try {
        linkFieldName = linkFieldName || "Notifikácie";
        
        // 1. Získaj existujúce notifikácie zo zdrojového záznamu
        var existingNotifications = utils.safeGet(sourceEntry, linkFieldName, []);
        
        // 2. Pridaj novú notifikáciu ak tam ešte nie je
        var notificationExists = false;
        for (var i = 0; i < existingNotifications.length; i++) {
            if (existingNotifications[i].id === notification.id) {
                notificationExists = true;
                break;
            }
        }
        
        if (!notificationExists) {
            existingNotifications.push(notification);
            sourceEntry.set(linkFieldName, existingNotifications);
            
            utils.addDebug(sourceEntry, "  • Notifikácia #" + notification.field("ID") + 
                          " prilinková k záznamu #" + sourceEntry.field("ID"));
        }
        
        // 3. Nastav spätnú referenciu v notifikácii (už by malo byť nastavené pri vytvorení)
        // ale pre istotu skontrolujeme
        var sourceLibraryField = "Zdrojová knižnica";
        var sourceEntryField = "Zdrojový záznam";
        
        if (!notification.field(sourceLibraryField)) {
            notification.set(sourceLibraryField, lib().title);
        }
        
        if (!notification.field(sourceEntryField)) {
            notification.set(sourceEntryField, sourceEntry);
        }
        
        return true;
        
    } catch (error) {
        utils.addError(sourceEntry, "Chyba pri vytváraní prepojenia: " + error.toString(), 
                      "createBidirectionalLink", error);
        return false;
    }
}

/**
 * Vymaže staré notifikácie pred vytvorením nových
 * @param {Entry} sourceEntry - Zdrojový záznam
 * @param {string} linkFieldName - Názov poľa s notifikáciami
 * @returns {Object} {success: boolean, deletedCount: number}
 */
function cleanupOldNotifications(sourceEntry, linkFieldName) {
    try {
        linkFieldName = linkFieldName || "Notifikácie";
        
        utils.addDebug(sourceEntry, utils.getIcon("delete") + " Začínam cleanup notifikácií");
        
        // 1. Získaj existujúce notifikácie
        var existingNotifications = utils.safeGet(sourceEntry, linkFieldName, []);
        
        if (existingNotifications.length === 0) {
            utils.addDebug(sourceEntry, "  • Žiadne notifikácie na vymazanie");
            return { success: true, deletedCount: 0 };
        }
        
        var deletedCount = 0;
        var failedDeletions = [];
        
        // 2. Vymaž každú notifikáciu
        for (var i = 0; i < existingNotifications.length; i++) {
            try {
                var notification = existingNotifications[i];
                
                // Kontrola či notifikácia stále existuje
                if (!notification || !notification.field) {
                    utils.addDebug(sourceEntry, "  ⚠️ Notifikácia na indexe " + i + " už neexistuje");
                    continue;
                }
                
                var notifId = notification.field("ID");
                var status = notification.field(CONFIG.fields.notifications.status);
                
                // Nevymazať už odoslané notifikácie (voliteľné)
                if (status === "Odoslané") {
                    utils.addDebug(sourceEntry, "  ℹ️ Notifikácia #" + notifId + 
                                  " už bola odoslaná - preskakujem");
                    continue;
                }
                
                // Vymaž notifikáciu
                notification.trash();
                deletedCount++;
                
                utils.addDebug(sourceEntry, "  ✅ Notifikácia #" + notifId + " vymazaná");
                
            } catch (deleteError) {
                failedDeletions.push({
                    index: i,
                    error: deleteError.toString()
                });
            }
        }
        
        // 3. Vyčisti pole v zdrojovom zázname
        sourceEntry.set(linkFieldName, []);
        
        // 4. Výsledok
        if (failedDeletions.length > 0) {
            utils.addError(sourceEntry, "Nepodarilo sa vymazať " + failedDeletions.length + 
                          " notifikácií", "cleanupOldNotifications");
            
            return {
                success: false,
                deletedCount: deletedCount,
                failedCount: failedDeletions.length,
                errors: failedDeletions
            };
        }
        
        utils.addDebug(sourceEntry, utils.getIcon("success") + " Cleanup dokončený - vymazaných " + 
                      deletedCount + " notifikácií");
        
        return {
            success: true,
            deletedCount: deletedCount
        };
        
    } catch (error) {
        utils.addError(sourceEntry, "Kritická chyba pri cleanup: " + error.toString(), 
                      "cleanupOldNotifications", error);
        return {
            success: false,
            deletedCount: 0,
            error: error.toString()
        };
    }
}

/**
 * Bezpečné vytvorenie notifikácie s cleanup a linkovaním
 * @param {Entry} sourceEntry - Zdrojový záznam
 * @param {Object} notificationData - Dáta pre notifikáciu
 * @returns {Object} {success: boolean, notification: Entry}
 */
function safeCreateNotificationWithCleanup(sourceEntry, notificationData) {
    try {
        // 1. Najprv cleanup starých notifikácií
        var cleanupResult = cleanupOldNotifications(sourceEntry);
        
        if (!cleanupResult.success) {
            utils.addError(sourceEntry, "Cleanup zlyhal, pokračujem s vytvorením novej notifikácie", 
                          "safeCreateNotificationWithCleanup");
        }
        
        // 2. Vytvor novú notifikáciu
        var notification = createNotification(notificationData);
        
        if (!notification) {
            return {
                success: false,
                error: "Nepodarilo sa vytvoriť notifikáciu"
            };
        }
        
        // 3. Vytvor bidirectional link
        var linkResult = createBidirectionalLink(sourceEntry, notification);
        
        if (!linkResult) {
            utils.addError(sourceEntry, "Notifikácia vytvorená ale linking zlyhal", 
                          "safeCreateNotificationWithCleanup");
        }
        
        return {
            success: true,
            notification: notification,
            cleanupCount: cleanupResult.deletedCount
        };
        
    } catch (error) {
        utils.addError(sourceEntry, "Kritická chyba: " + error.toString(), 
                      "safeCreateNotificationWithCleanup", error);
        return {
            success: false,
            error: error.toString()
        };
    }
}
// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

function escapeMarkdown(text) {
    if (!text) return "";
    
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
        .replace(/#/g, "\\#");
}

function formatLocation(location) {
    if (!location) return "Neurčené";
    
    if (typeof location === 'object') {
        return utils.safeGet(location, "Adresa", "Neurčené");
    }
    
    return location;
}

function getCashRegisterName(cashRegister) {
    if (!cashRegister) return "Neurčená";
    
    if (typeof cashRegister === 'object') {
        return utils.safeGet(cashRegister, "Názov", "Neurčená");
    }
    
    return cashRegister;
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

// Kontrola závislostí pred spustením
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