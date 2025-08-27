// ==============================================
// DOCHÁDZKA GROUP NOTIFICATION - Vytvorenie notifikácie
// Verzia: 9.0 | Dátum: December 2024 | Autor: ASISTANTO
// Knižnica: Dochádzka | Trigger: After Save
// ==============================================
// 📋 FUNKCIA:
//    - Vytvorí záznam v knižnici Notifications
//    - Získa Chat ID a Thread ID z ASISTANTO Defaults
//    - Sformátuje správu podobnú ako info pole v Dochádzka Prepočet
//    - Skontroluje či sú povolené skupinové notifikácie
// ==============================================
// 🔧 POUŽÍVA:
//    - MementoUtils v7.0+ (základné funkcie)
//    - MementoConfig v7.0+ (centrálny CONFIG)
//    - NEPOTREBUJE MementoTelegram!
// ==============================================
// ✅ ZJEDNODUŠENÉ v9.0:
//    - Odstránené agregácie a súhrny
//    - Priame vytvorenie notifikácie
//    - Jednoduchý lineárny workflow
//    - Čítanie nastavení z Defaults
// ==============================================

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var centralConfig = utils.config;
var currentEntry = entry();

var CONFIG = {
    scriptName: "Dochádzka Group Notification",
    version: "9.0",
    
    // Referencie na centrálny config
    fields: centralConfig.fields,
    attributes: centralConfig.attributes,
    libraries: centralConfig.libraries,
    icons: centralConfig.icons,
    
    // Špecifické názvy polí pre skupiny v Defaults
    telegramGroupFields: {
        attendance: "Telegram skupina dochádzky",
        workRecord: "Telegram skupina záznamu prác",
        bookOfRides: "Telegram skupina knihy jázd"
    },
    
    // Názvy polí pre povolenia v Defaults
    permissionFields: {
        attendanceGroup: "Dochádzka skupinové notifikácie",
        workRecordGroup: "Záznam prác skupinové notifikácie",
        bookOfRidesGroup: "Kniha jázd skupinové notifikácie"
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, utils.getIcon("start") + " === DOCHÁDZKA GROUP NOTIFICATION v" + CONFIG.version + " ===");
        
        // 1. KONTROLA ZÁVISLOSTÍ
        var depCheck = utils.checkDependencies(['config', 'core']);
        if (!depCheck.success) {
            utils.addError(currentEntry, "Chýbajú potrebné moduly: " + depCheck.missing.join(", "), "main");
            return false;
        }
        
        // 2. KONTROLA ČI SÚ POVOLENÉ SKUPINOVÉ NOTIFIKÁCIE
        utils.addDebug(currentEntry, utils.getIcon("search") + " Kontrolujem povolenia");
        
        var groupNotificationsEnabled = checkGroupNotificationsEnabled();
        if (!groupNotificationsEnabled) {
            utils.addDebug(currentEntry, utils.getIcon("info") + " Skupinové notifikácie sú vypnuté - ukončujem");
            return true; // Nie je to chyba, len sú vypnuté
        }
        
        // 3. ZÍSKANIE TELEGRAM SKUPINY
        utils.addDebug(currentEntry, utils.getIcon("search") + " Získavam Telegram skupinu");
        
        var telegramGroup = getTelegramGroup();
        if (!telegramGroup) {
            utils.addError(currentEntry, "Telegram skupina nenájdená alebo neaktívna", "main");
            return false;
        }
        
        // 4. PRÍPRAVA DÁT PRE NOTIFIKÁCIU
        utils.addDebug(currentEntry, utils.getIcon("document") + " Pripravujem dáta pre notifikáciu");
        
        var notificationData = prepareNotificationData(telegramGroup);
        if (!notificationData) {
            utils.addError(currentEntry, "Nepodarilo sa pripraviť dáta pre notifikáciu", "main");
            return false;
        }
        
        // 5. VYTVORENIE ZÁZNAMU V NOTIFICATIONS
        utils.addDebug(currentEntry, utils.getIcon("create") + " Vytváram notifikáciu");
        
        var notification = createNotificationEntry(notificationData);
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
// KONTROLA POVOLENÍ
// ==============================================

function checkGroupNotificationsEnabled() {
    try {
        // Získaj nastavenia z ASISTANTO Defaults
        var defaultsLib = libByName(CONFIG.libraries.defaults);
        if (!defaultsLib) {
            utils.addError(currentEntry, "Knižnica " + CONFIG.libraries.defaults + " nenájdená", "checkGroupNotificationsEnabled");
            return false;
        }
        
        var settings = defaultsLib.entries();
        if (!settings || settings.length === 0) {
            utils.addError(currentEntry, "Žiadne nastavenia v Defaults", "checkGroupNotificationsEnabled");
            return false;
        }
        
        // Zoberieme posledný (najnovší) záznam
        var defaultSettings = settings[settings.length - 1];
        
        // Skontroluj či sú povolené skupinové notifikácie pre dochádzku
        var groupNotificationsField = CONFIG.permissionFields.attendanceGroup;
        var enabled = utils.safeGet(defaultSettings, groupNotificationsField, false);
        
        utils.addDebug(currentEntry, "  • " + groupNotificationsField + ": " + (enabled ? "ÁNO" : "NIE"));
        
        return enabled;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "checkGroupNotificationsEnabled", error);
        return false;
    }
}

// ==============================================
// ZÍSKANIE TELEGRAM SKUPINY
// ==============================================

function getTelegramGroup() {
    try {
        // Získaj nastavenia z ASISTANTO Defaults
        var defaultsLib = libByName(CONFIG.libraries.defaults);
        if (!defaultsLib) {
            return null;
        }
        
        var settings = defaultsLib.entries();
        if (!settings || settings.length === 0) {
            return null;
        }
        
        var defaultSettings = settings[settings.length - 1];
        
        // Získaj odkaz na Telegram skupinu pre dochádzku
        var groupFieldName = CONFIG.telegramGroupFields.attendance;
        var telegramGroup = utils.safeGet(defaultSettings, groupFieldName);
        
        if (!telegramGroup) {
            utils.addError(currentEntry, "Telegram skupina nie je nastavená v poli '" + groupFieldName + "'", "getTelegramGroup");
            return null;
        }
        
        // Skontroluj či má skupina povolené notifikácie
        var notificationsEnabled = utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.enableNotifications, false);
        if (!notificationsEnabled) {
            utils.addDebug(currentEntry, utils.getIcon("warning") + " Skupina '" + 
                          utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.groupName) + 
                          "' má vypnuté notifikácie");
            return null;
        }
        
        // Skontroluj pracovný čas a víkendy
        if (!checkTimeRestrictions(telegramGroup)) {
            utils.addDebug(currentEntry, utils.getIcon("warning") + " Mimo pracovného času alebo víkend");
            return null;
        }
        
        utils.addDebug(currentEntry, "  • Skupina: " + utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.groupName));
        utils.addDebug(currentEntry, "  • Chat ID: " + utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.chatId));
        
        var threadId = utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.threadId);
        if (threadId) {
            utils.addDebug(currentEntry, "  • Thread ID: " + threadId);
        }
        
        return telegramGroup;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "getTelegramGroup", error);
        return null;
    }
}

function checkTimeRestrictions(telegramGroup) {
    try {
        var now = moment();
        
        // Kontrola víkendu
        if (utils.isWeekend(now)) {
            var weekendAllowed = utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.weekendEnabled, false);
            if (!weekendAllowed) {
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
        return true; // V prípade chyby radšej povolíme
    }
}

// ==============================================
// PRÍPRAVA DÁT PRE NOTIFIKÁCIU
// ==============================================

function prepareNotificationData(telegramGroup) {
    try {
        // Získaj základné údaje zo záznamu
        var datum = utils.safeGet(currentEntry, CONFIG.fields.attendance.date);
        var prichod = utils.safeGet(currentEntry, CONFIG.fields.attendance.arrival);
        var odchod = utils.safeGet(currentEntry, CONFIG.fields.attendance.departure);
        var zamestnanci = utils.safeGet(currentEntry, CONFIG.fields.attendance.employees, []);
        var odpracovane = utils.safeGet(currentEntry, CONFIG.fields.attendance.workedHours, 0);
        var mzdoveNaklady = utils.safeGet(currentEntry, CONFIG.fields.attendance.wageCosts, 0);
        
        // Sformátuj správu podobnú ako v info poli
        var message = formatNotificationMessage({
            datum: datum,
            prichod: prichod,
            odchod: odchod,
            zamestnanci: zamestnanci,
            odpracovane: odpracovane,
            mzdoveNaklady: mzdoveNaklady
        });
        
        // Priprav dáta pre notifikáciu
        var notificationData = {
            // Základné polia
            messageType: "Dochádzka",
            status: "Čaká",
            priority: utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.messagePriority, "Normálna"),
            formatting: "Markdown",
            messageSource: "Automatická",
            
            // Telegram polia
            chatId: utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.chatId),
            threadId: utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.threadId),
            silentMessage: utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.silentMessage, false),
            
            // Obsah
            message: message,
            
            // Prepojenia
            sourceEntry: currentEntry,
            sourceLibrary: CONFIG.libraries.attendance,
            telegramGroup: telegramGroup,
            
            // Metadata
            employeeCount: zamestnanci.length,
            totalHours: odpracovane,
            totalCosts: mzdoveNaklady,
            date: datum
        };
        
        return notificationData;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "prepareNotificationData", error);
        return null;
    }
}

function formatNotificationMessage(data) {
    var msg = "📋 *DOCHÁDZKA*\n";
    msg += "═══════════════\n\n";
    
    // Dátum a deň
    msg += "📅 *Dátum:* " + utils.formatDate(data.datum) + " (" + utils.getDayNameSK(moment(data.datum).day()) + ")\n";
    
    // Čas
    if (data.prichod && data.odchod) {
        msg += "⏰ *Čas:* " + utils.formatTime(data.prichod) + " - " + utils.formatTime(data.odchod) + "\n";
    }
    
    // Odpracované
    msg += "⏱️ *Odpracované:* " + data.odpracovane.toFixed(2) + " hodín\n";
    
    // Zamestnanci
    if (data.zamestnanci && data.zamestnanci.length > 0) {
        msg += "\n👥 *Zamestnanci* (" + data.zamestnanci.length + " " + utils.getPersonCountForm(data.zamestnanci.length) + "):\n";
        
        for (var i = 0; i < data.zamestnanci.length; i++) {
            var zam = data.zamestnanci[i];
            var meno = utils.formatEmployeeName(zam);
            
            // Získaj atribúty
            var odpracovaneZam = getEmployeeAttribute(i, CONFIG.attributes.employees.workedHours);
            var hodinovka = getEmployeeAttribute(i, CONFIG.attributes.employees.hourlyRate);
            var dennaMzda = getEmployeeAttribute(i, CONFIG.attributes.employees.dailyWage);
            
            msg += "• " + escapeMarkdown(meno);
            
            if (odpracovaneZam) {
                msg += " - " + odpracovaneZam.toFixed(2) + "h";
            }
            
            if (dennaMzda) {
                msg += " (" + utils.formatMoney(dennaMzda) + ")";
            }
            
            msg += "\n";
        }
    }
    
    // Celkové náklady
    msg += "\n💰 *Mzdové náklady:* " + utils.formatMoney(data.mzdoveNaklady) + "\n";
    
    // Info o zázname
    msg += "\n📝 _Záznam #" + currentEntry.field("ID") + "_";
    
    return msg;
}

function getEmployeeAttribute(index, attrName) {
    try {
        var employees = currentEntry.field(CONFIG.fields.attendance.employees);
        if (employees && employees[index] && employees[index].attr) {
            return employees[index].attr(attrName);
        }
        return null;
    } catch (error) {
        return null;
    }
}

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

// ==============================================
// VYTVORENIE NOTIFIKÁCIE
// ==============================================

function createNotificationEntry(data) {
    try {
        var notifLib = libByName(CONFIG.libraries.notifications);
        if (!notifLib) {
            utils.addError(currentEntry, "Knižnica " + CONFIG.libraries.notifications + " nenájdená", "createNotificationEntry");
            return null;
        }
        
        // Vytvor nový záznam
        var notification = notifLib.create({});
        
        // Nastav základné polia
        notification.set(CONFIG.fields.notifications.status, data.status);
        notification.set(CONFIG.fields.notifications.priority, data.priority);
        notification.set(CONFIG.fields.notifications.messageType, data.messageType);
        notification.set(CONFIG.fields.notifications.messageSource, data.messageSource);
        notification.set(CONFIG.fields.notifications.formatting, data.formatting);
        
        // Nastav Telegram polia
        notification.set(CONFIG.fields.notifications.chatId, data.chatId);
        if (data.threadId) {
            notification.set(CONFIG.fields.notifications.threadId, data.threadId);
        }
        
        // Nastav obsah
        notification.set(CONFIG.fields.notifications.message, data.message);
        
        // Nastav prepojenia
        if (data.telegramGroup) {
            notification.set(CONFIG.fields.notifications.groupOrTopic, data.telegramGroup);
        }
        
        // Vytvor info záznam pre notifikáciu
        var infoMsg = "📋 NOTIFIKÁCIA DOCHÁDZKY\n";
        infoMsg += "Vytvorené: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
        infoMsg += "Zdrojový záznam: Dochádzka #" + currentEntry.field("ID") + "\n";
        infoMsg += "Dátum: " + utils.formatDate(data.date) + "\n";
        infoMsg += "Zamestnancov: " + data.employeeCount + "\n";
        infoMsg += "Hodín: " + data.totalHours.toFixed(2) + "\n";
        infoMsg += "Náklady: " + utils.formatMoney(data.totalCosts) + "\n";
        infoMsg += "Chat ID: " + data.chatId + "\n";
        if (data.threadId) {
            infoMsg += "Thread ID: " + data.threadId + "\n";
        }
        infoMsg += "Priorita: " + data.priority + "\n";
        infoMsg += "Tichá správa: " + (data.silentMessage ? "ÁNO" : "NIE");
        
        notification.set(CONFIG.fields.common.info, infoMsg);
        
        utils.addDebug(currentEntry, "  • Notifikácia vytvorená úspešne");
        
        return notification;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createNotificationEntry", error);
        return null;
    }
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