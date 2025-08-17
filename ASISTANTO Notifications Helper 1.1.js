// ==============================================
// MEMENTO DATABASE - ASISTANTO NOTIFICATIONS HELPER
// Verzia: 1.0 | Dátum: 16.08.2025 | Autor: ASISTANTO
// Knižnica: ASISTANTO Notifications | Typ: Helper Script
// ==============================================
// 📋 FUNKCIE:
//    - Pomocné funkcie pre vytváranie notifikácií
//    - Automatické vyplnenie polí na základe zdroja
//    - Správa lifecycle notifikácií
//    - Integrácia s Telegram API
// ✅ VYUŽÍVA:
//    - MementoUtils 3.0 centralizované funkcie
//    - Štruktúru z paste.txt analýzy
//    - Best practices z Dochádzka Notifications
// ==============================================

// Import MementoUtils 3.0
var utils = MementoUtils;

// ==============================================
// KONFIGURÁCIA
// ==============================================

var CONFIG = {
    debug: true,
    version: "1.1",
    scriptName: "ASISTANTO Notifications Helper",
    
    // Knižnice
    notificationsLibrary: "ASISTANTO Notifications",
    telegramGroupsLibrary: "ASISTANTO Telegram Groups",
    apiLibrary: "ASISTANTO API",
    defaultsLibrary: "ASISTANTO Defaults",
    
    // Názvy polí v ASISTANTO Notifications
    fields: {
        // HLAVNÁ SEKCIA
        typSpravy: "Typ správy",
        zdrojSpravy: "Zdroj správy", 
        predmet: "Predmet",
        sprava: "Správa",
        priloha: "Príloha",
        formatovanie: "Formátovanie",
        status: "Status",
        priorita: "Priorita",
        adresat: "Adresát",
        skupinaTema: "Skupina/Téma",
        zamestnanec: "Zamestnanec",
        klient: "Klient",
        partner: "Partner",
        zakazka: "Zákazka",
        info: "info",
        
        // CIELENIE SEKCIA
        telegramId: "Telegram ID",
        chatId: "Chat ID",
        temaId: "Téma ID",
        temaNazov: "Téma Názov",
        
        // ČASOVANIE SEKCIA
        poslatO: "Poslať o",
        vyprsat: "Vypršať o",
        opakovat: "Opakovať",
        
        // ZDROJOVÉ INFORMÁCIE
        zdrojovaKniznica: "Zdrojová knižnica",
        zdrojovyId: "Zdrojový ID",
        vytvoril: "Vytvoril",
        vytvorene: "Vytvorené",
        
        // RESPONSE DATA
        messageId: "Message ID",
        messageThreadId: "Message Thread ID", 
        messageUrl: "Message URL",
        odoslaneO: "Odoslané o",
        pokusovOdoslanie: "Pokusov o odoslanie",
        poslednaChyba: "Posledná chyba",
        responseData: "Response Data",

         // Statusy
        statusWaiting: "Čaká",
        statusSent: "Odoslané",
        statusFailed: "Zlyhalo",
        
        // Max pokusov
        maxRetries: 3,
        
        // DEBUG SEKCIA
        errorLog: "Error_Log",
        debugLog: "Debug_Log"
    },
    
    // Možnosti dropdownov
    options: {
        typSpravy: ["Dochádzka", "Záznam prác", "Kniha jázd", "ToDo", "Manuálna", "Systémová"],
        zdrojSpravy: ["Automatická", "Manuálna", "Naplánovaná"],
        formatovanie: ["Obyčajný text", "Markdown", "HTML"],
        priorita: ["Nízka", "Normálna", "Vysoká", "Urgentná"],
        adresat: ["Zamestnanec", "Klient", "Partner", "Skupina", "Skupina-Téma", "Zákazka"],
        opakovat: ["Nie", "Každý deň", "Každý týždeň", "Každý mesiac"],
        status: ["Čaká", "Odoslané", "Zlyhalo", "Zrušené", "Vypršané"]
    }
};

// ==============================================
// HELPER FUNKCIE
// ==============================================

/**
 * Vytvorí nový záznam notifikácie s predvyplnenými údajmi
 * @param {Object} data - Dáta pre notifikáciu
 * @returns {Entry|null} - Vytvorený záznam alebo null
 */
function createNotification(data) {
    try {
        utils.addDebug(entry(), "📝 Vytváranie novej notifikácie");
        
        var notifLib = libByName(CONFIG.notificationsLibrary);
        if (!notifLib) {
            utils.addError(entry(), "Knižnica " + CONFIG.notificationsLibrary + " nenájdená", "createNotification");
            return null;
        }
        
        // Predvolené hodnoty
        var notificationData = {
            // Povinné polia
            "Typ správy": data.typSpravy || "Systémová",
            "Zdroj správy": data.zdrojSpravy || "Automatická",
            "Správa": data.sprava || "",
            "Status": "Čaká",
            "Formátovanie": data.formatovanie || "Markdown",
            "Priorita": data.priorita || "Normálna",
            
            // Metadata
            "Vytvoril": user(),
            "Vytvorené": moment().toDate(),
            "Zdrojová knižnica": data.zdrojovaKniznica || lib().name(),
            "Zdrojový ID": data.zdrojovyId || entry().field("ID"),
            
            // Info záznam
            "info": utils.formatDate(new Date()) + " | Vytvorené automaticky\n" +
                   "Zdroj: " + (data.zdrojovaKniznica || lib().name()) + " #" + (data.zdrojovyId || entry().field("ID")) + "\n" +
                   "Script: " + CONFIG.scriptName + " v" + CONFIG.version
        };
        
        // Voliteľné polia
        if (data.predmet) notificationData["Predmet"] = data.predmet;
        if (data.priloha) notificationData["Príloha"] = data.priloha;
        if (data.adresat) notificationData["Adresát"] = data.adresat;
        
        // Cielenie podľa typu adresáta
        switch (data.adresat) {
            case "Zamestnanec":
                if (data.zamestnanec) {
                    notificationData["Zamestnanec"] = data.zamestnanec;
                    // Automaticky získaj Telegram ID
                    var telegramId = getTelegramIdForEmployee(data.zamestnanec);
                    if (telegramId) notificationData["Telegram ID"] = telegramId;
                }
                break;
                
            case "Klient":
                if (data.klient) notificationData["Klient"] = data.klient;
                break;
                
            case "Partner":
                if (data.partner) notificationData["Partner"] = data.partner;
                break;
                
            case "Zákazka":
                if (data.zakazka) notificationData["Zákazka"] = data.zakazka;
                break;
                
            case "Skupina":
            case "Skupina-Téma":
                if (data.skupinaTema) {
                    notificationData["Skupina/Téma"] = data.skupinaTema;
                    // Automaticky získaj Chat ID a Thread ID
                    var groupInfo = getGroupInfo(data.skupinaTema);
                    if (groupInfo) {
                        notificationData["Chat ID"] = groupInfo.chatId;
                        if (groupInfo.threadId) notificationData["Téma ID"] = groupInfo.threadId;
                        notificationData["Téma Názov"] = groupInfo.name;
                    }
                }
                break;
        }
        
        // Časovanie
        if (data.poslatO) notificationData["Poslať o"] = data.poslatO;
        if (data.vyprsat) notificationData["Vypršať o"] = data.vyprsat;
        if (data.opakovat) notificationData["Opakovať"] = data.opakovat;
        
        // Vytvor záznam
        var novyZaznam = notifLib.create(notificationData);
        
        if (novyZaznam) {
            utils.addDebug(entry(), "✅ Notifikácia vytvorená: ID " + novyZaznam.field("ID"));
            
            // Ak je nastavené "Poslať o" v minulosti alebo práve teraz, pošli okamžite
            if (!data.poslatO || moment(data.poslatO).isSameOrBefore(moment())) {
                sendNotification(novyZaznam);
            }
            
            return novyZaznam;
        } else {
            utils.addError(entry(), "Nepodarilo sa vytvoriť notifikáciu", "createNotification");
            return null;
        }
        
    } catch (error) {
        utils.addError(entry(), error, "createNotification");
        return null;
    }
}

/**
 * Vytvorí nový záznam notifikácie BEZ automatického odoslania
 * @param {Object} data - Dáta pre notifikáciu
 * @returns {Entry|null} - Vytvorený záznam alebo null
 */
function createNotificationOnly(data) {
    try {
        utils.addDebug(entry(), "📝 Vytváranie novej notifikácie (bez odoslania)");
        
        var notifLib = libByName(CONFIG.notificationsLibrary);
        if (!notifLib) {
            utils.addError(entry(), "Knižnica " + CONFIG.notificationsLibrary + " nenájdená", "createNotificationOnly");
            return null;
        }
        
        // Predvolené hodnoty - POUŽÍVAME EXISTUJÚCI CONFIG.fields
        var notificationData = {};
        
        // Povinné polia
        notificationData[CONFIG.fields.typSpravy] = data.typSpravy || "Systémová";
        notificationData[CONFIG.fields.zdrojSpravy] = data.zdrojSpravy || "Automatická";
        notificationData[CONFIG.fields.sprava] = data.sprava || "";
        notificationData[CONFIG.fields.status] = "Čaká";
        notificationData[CONFIG.fields.formatovanie] = data.formatovanie || "Markdown";
        notificationData[CONFIG.fields.priorita] = data.priorita || "Normálna";
        
        // Metadata
        notificationData[CONFIG.fields.vytvoril] = user();
        notificationData[CONFIG.fields.vytvorene] = moment().toDate();
        notificationData[CONFIG.fields.zdrojovaKniznica] = data.zdrojovaKniznica || lib().name();
        notificationData[CONFIG.fields.zdrojovyId] = data.zdrojovyId || entry().field("ID");
        
        // Info záznam
        notificationData[CONFIG.fields.info] = utils.formatDate(new Date()) + " | Vytvorené automaticky\n" +
               "Zdroj: " + (data.zdrojovaKniznica || lib().name()) + " #" + (data.zdrojovyId || entry().field("ID")) + "\n" +
               "Script: " + CONFIG.scriptName + " v" + CONFIG.version;
        
        // Voliteľné polia
        if (data.predmet) notificationData[CONFIG.fields.predmet] = data.predmet;
        if (data.priloha) notificationData[CONFIG.fields.priloha] = data.priloha;
        if (data.adresat) notificationData[CONFIG.fields.adresat] = data.adresat;
        if (data.poslatO) notificationData[CONFIG.fields.poslatO] = data.poslatO;
        if (data.vyprsat) notificationData[CONFIG.fields.vyprsat] = data.vyprsat;
        if (data.opakovat) notificationData[CONFIG.fields.opakovat] = data.opakovat;
        
        // Adresáti podľa typu
        if (data.zamestnanec) {
            notificationData[CONFIG.fields.zamestnanec] = data.zamestnanec;
            var telegramId = getTelegramIdForEmployee(data.zamestnanec);
            if (telegramId) {
                notificationData[CONFIG.fields.telegramId] = telegramId;
                notificationData[CONFIG.fields.chatId] = telegramId;
            }
        }
        
        if (data.skupinaTema) {
            notificationData[CONFIG.fields.skupinaTema] = data.skupinaTema;
            var groupInfo = getGroupInfo(data.skupinaTema);
            if (groupInfo) {
                notificationData[CONFIG.fields.chatId] = groupInfo.chatId;
                notificationData[CONFIG.fields.temaId] = groupInfo.threadId;
                notificationData[CONFIG.fields.temaNazov] = groupInfo.name;
            }
        }
        
        if (data.klient) notificationData[CONFIG.fields.klient] = data.klient;
        if (data.partner) notificationData[CONFIG.fields.partner] = data.partner;
        if (data.zakazka) notificationData[CONFIG.fields.zakazka] = data.zakazka;
        
        // Explicitné Chat ID (pre skupiny bez LinkToEntry)
        if (data.chatId) notificationData[CONFIG.fields.chatId] = data.chatId;
        if (data.temaId) notificationData[CONFIG.fields.temaId] = data.temaId;
        
        // Vytvor záznam
        var novyZaznam = notifLib.create(notificationData);
        
        if (novyZaznam) {
            utils.addDebug(entry(), "✅ Záznam notifikácie vytvorený (čaká na trigger): ID " + novyZaznam.field("ID"));
            
            // Debug info
            utils.addDebug(novyZaznam, "📋 Notifikácia vytvorená pomocou createNotificationOnly()");
            utils.addDebug(novyZaznam, "⏳ Status: Čaká na odoslanie");
            utils.addDebug(novyZaznam, "🔄 Trigger sa spustí automaticky");
            
            return novyZaznam;
        } else {
            utils.addError(entry(), "Nepodarilo sa vytvoriť notifikáciu", "createNotificationOnly");
            return null;
        }
        
    } catch (error) {
        utils.addError(entry(), error, "createNotificationOnly");
        return null;
    }
}

/**
 * Získa Telegram ID pre zamestnanca
 * @param {Entry|Array} zamestnanec - Zamestnanec alebo pole zamestnancov
 * @returns {string} - Telegram ID alebo prázdny string
 */
function getTelegramIdForEmployee(zamestnanec) {
    try {
        if (Array.isArray(zamestnanec) && zamestnanec.length > 0) {
            zamestnanec = zamestnanec[0];
        }
        
        if (!zamestnanec) return "";
        
        return utils.safeGet(zamestnanec, "Telegram ID", "");
        
    } catch (error) {
        utils.addError(entry(), error, "getTelegramIdForEmployee");
        return "";
    }
}

/**
 * Získa informácie o Telegram skupine/téme
 * @param {Entry|Array} skupinaTema - Link na záznam v ASISTANTO Telegram Groups
 * @returns {Object|null} - Objekt s chatId, threadId a name
 */
function getGroupInfo(skupinaTema) {
    try {
        if (Array.isArray(skupinaTema) && skupinaTema.length > 0) {
            skupinaTema = skupinaTema[0];
        }
        
        if (!skupinaTema) return null;
        
        var chatId = utils.safeGet(skupinaTema, "Chat ID", "");
        var threadId = utils.safeGet(skupinaTema, "Thread ID", "");
        var name = utils.safeGet(skupinaTema, "Názov", "") || 
                  utils.safeGet(skupinaTema, "Názov záznamu", "");
        
        return {
            chatId: chatId,
            threadId: threadId,
            name: name
        };
        
    } catch (error) {
        utils.addError(entry(), error, "getGroupInfo");
        return null;
    }
}

/**
 * Odošle notifikáciu podľa nastavení
 * @param {Entry} notifikacia - Záznam notifikácie
 * @returns {boolean} - Úspešnosť odoslania
 */
function sendNotification(notifikacia) {
    try {
        utils.addDebug(notifikacia, "📤 Odosielanie notifikácie...");
        
        var adresat = utils.safeGet(notifikacia, CONFIG.fields.adresat, "");
        var sprava = utils.safeGet(notifikacia, CONFIG.fields.sprava, "");
        var formatovanie = utils.safeGet(notifikacia, CONFIG.fields.formatovanie, "Markdown");
        
        if (!sprava) {
            utils.addError(notifikacia, "Prázdna správa", "sendNotification");
            updateNotificationStatus(notifikacia, "Zlyhalo", "Prázdna správa");
            return false;
        }
        
        // Telegram notifikácia
        var chatId = utils.safeGet(notifikacia, CONFIG.fields.chatId, "") || 
                    utils.safeGet(notifikacia, CONFIG.fields.telegramId, "");
        
        if (chatId) {
            var threadId = utils.safeGet(notifikacia, CONFIG.fields.temaId, "");
            
            // Použitie MementoUtils 3.0 sendTelegramMessage
            var result = utils.sendTelegramMessage(chatId, sprava, {
                threadId: threadId,
                parseMode: formatovanie
            });
            
            if (result.success) {
                // Aktualizuj response data
                utils.safeSet(notifikacia, CONFIG.fields.messageId, result.messageId);
                if (result.threadId) {
                    utils.safeSet(notifikacia, CONFIG.fields.messageThreadId, result.threadId);
                }
                utils.safeSet(notifikacia, CONFIG.fields.odoslaneO, moment().toDate());
                utils.safeSet(notifikacia, CONFIG.fields.responseData, JSON.stringify(result.data));
                
                updateNotificationStatus(notifikacia, "Odoslané");
                utils.addDebug(notifikacia, "✅ Notifikácia úspešne odoslaná");
                return true;
            } else {
                updateNotificationStatus(notifikacia, "Zlyhalo", result.error);
                return false;
            }
        }
        
        // Iné typy notifikácií (SMS, Email) - placeholder pre budúce rozšírenie
        utils.addDebug(notifikacia, "⚠️ Žiadny podporovaný komunikačný kanál");
        updateNotificationStatus(notifikacia, "Zlyhalo", "Žiadny komunikačný kanál");
        return false;
        
    } catch (error) {
        utils.addError(notifikacia, error, "sendNotification");
        updateNotificationStatus(notifikacia, "Zlyhalo", error.toString());
        return false;
    }
}

/**
 * Aktualizuje status notifikácie
 * @param {Entry} notifikacia - Záznam notifikácie
 * @param {string} status - Nový status
 * @param {string} error - Chybová správa (voliteľné)
 */
function updateNotificationStatus(notifikacia, status, error) {
    try {
        utils.safeSet(notifikacia, CONFIG.fields.status, status);
        
        if (error) {
            utils.safeSet(notifikacia, CONFIG.fields.poslednaChyba, error);
            utils.addError(notifikacia, error, "sendNotification");
        }
        
        // Increment pokusov
        var pokusy = utils.safeGet(notifikacia, CONFIG.fields.pokusovOdoslanie, 0);
        utils.safeSet(notifikacia, CONFIG.fields.pokusovOdoslanie, pokusy + 1);
        
    } catch (e) {
        utils.addError(notifikacia, e, "updateNotificationStatus");
    }
}

// ==============================================
// BULK OPERÁCIE
// ==============================================

/**
 * Vytvorí notifikácie pre viacerých adresátov
 * @param {Object} baseData - Základné dáta pre všetky notifikácie
 * @param {Array} recipients - Pole adresátov
 * @returns {Array} - Pole vytvorených notifikácií
 */
function createBulkNotifications(baseData, recipients) {
    var created = [];
    
    try {
        utils.addDebug(entry(), "📢 Vytváranie bulk notifikácií pre " + recipients.length + " adresátov");
        
        for (var i = 0; i < recipients.length; i++) {
            var recipient = recipients[i];
            var notifData = Object.assign({}, baseData);
            
            // Prispôsob podľa typu adresáta
            if (recipient.field && recipient.field("Nick")) {
                // Je to zamestnanec
                notifData.adresat = "Zamestnanec";
                notifData.zamestnanec = [recipient];
            } else if (typeof recipient === "string") {
                // Je to Chat ID
                notifData.chatId = recipient;
            }
            
            var notif = createNotification(notifData);
            if (notif) created.push(notif);
        }
        
        utils.addDebug(entry(), "✅ Vytvorených " + created.length + " notifikácií");
        
    } catch (error) {
        utils.addError(entry(), error, "createBulkNotifications");
    }
    
    return created;
}

// ==============================================
// LIFECYCLE MANAGEMENT
// ==============================================

/**
 * Vymaže notifikáciu a jej Telegram správu
 * @param {Entry} notifikacia - Záznam notifikácie
 * @returns {boolean} - Úspešnosť vymazania
 */
function deleteNotificationWithMessage(notifikacia) {
    try {
        var messageId = utils.safeGet(notifikacia, CONFIG.fields.messageId, "");
        var chatId = utils.safeGet(notifikacia, CONFIG.fields.chatId, "") || 
                    utils.safeGet(notifikacia, CONFIG.fields.telegramId, "");
        
        // Vymaž Telegram správu ak existuje
        if (messageId && chatId) {
            utils.deleteTelegramMessage(chatId, messageId);
        }
        
        // Vymaž záznam
        notifikacia.trash();
        return true;
        
    } catch (error) {
        utils.addError(entry(), error, "deleteNotificationWithMessage");
        return false;
    }
}

/**
 * Spracuje vypršané notifikácie
 */
function processExpiredNotifications() {
    try {
        var notifLib = libByName(CONFIG.notificationsLibrary);
        if (!notifLib) return;
        
        var now = moment();
        var expired = notifLib.find(CONFIG.fields.status, "Čaká");
        
        for (var i = 0; i < expired.length; i++) {
            var notif = expired[i];
            var vyprsat = utils.safeGet(notif, CONFIG.fields.vyprsat, null);
            
            if (vyprsat && moment(vyprsat).isBefore(now)) {
                updateNotificationStatus(notif, "Vypršané", "Vypršala platnosť");
                utils.addDebug(notif, "⏰ Notifikácia vypršala");
            }
        }
        
    } catch (error) {
        utils.addError(entry(), error, "processExpiredNotifications");
    }
}

// ==============================================
// TEMPLATE FUNKCIE
// ==============================================

/**
 * Vytvorí template pre dochádzku notifikáciu
 * @param {Entry} dochadzkaEntry - Záznam dochádzky
 * @returns {Object} - Template dáta
 */
function createAttendanceNotificationTemplate(dochadzkaEntry) {
    var datum = utils.safeGet(dochadzkaEntry, "Dátum", new Date());
    var zamestnanci = utils.safeGetLinks(dochadzkaEntry, "Zamestnanci");
    
    var template = {
        typSpravy: "Dochádzka",
        zdrojSpravy: "Automatická",
        predmet: "Dochádzka " + utils.formatDate(datum, "DD.MM.YYYY"),
        formatovanie: "Markdown",
        priorita: "Normálna",
        zdrojovaKniznica: "Dochádzka",
        zdrojovyId: dochadzkaEntry.field("ID")
    };
    
    return template;
}

/**
 * Vytvorí template pre systémovú notifikáciu
 * @param {string} message - Správa
 * @param {string} priority - Priorita
 * @returns {Object} - Template dáta
 */
function createSystemNotificationTemplate(message, priority) {
    return {
        typSpravy: "Systémová",
        zdrojSpravy: "Automatická",
        sprava: message,
        formatovanie: "Markdown",
        priorita: priority || "Normálna",
        adresat: "Skupina"
    };
}

// ==============================================
// UTILITY FUNKCIE
// ==============================================

/**
 * Formátuje správu pre Telegram s Markdown
 * @param {string} title - Nadpis správy
 * @param {Object} data - Dáta pre správu
 * @returns {string} - Naformátovaná správa
 */
function formatTelegramMessage(title, data) {
    var message = "*" + title + "*\n";
    message += "━━━━━━━━━━━━━━━\n\n";
    
    for (var key in data) {
        if (data.hasOwnProperty(key) && data[key]) {
            message += "• *" + key + ":* " + data[key] + "\n";
        }
    }
    
    message += "\n_" + utils.formatDate(new Date()) + "_";
    return message;
}

/**
 * Kontroluje či má používateľ oprávnenie vytvárať notifikácie
 * @returns {boolean}
 */
function canCreateNotifications() {
    // Tu môžeš implementovať kontrolu oprávnení
    return true;
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

/**
 * Aktualizuje status notifikácie
 * @param {Entry} entry - Záznam notifikácie
 * @param {string} newStatus - Nový status
 * @param {string} error - Chybová správa (voliteľné)
 */
function updateStatus(entry, newStatus, error) {
    try {
        entry.set("Status", newStatus);
        
        if (error) {
            entry.set("Posledná chyba", error);
            
            // Pridaj do Error_Log
            var timestamp = moment().format("DD.MM.YY HH:mm:ss");
            var errorMsg = "[" + timestamp + "] Status → " + newStatus + ": " + error;
            var existingError = entry.field("Error_Log") || "";
            entry.set("Error_Log", existingError + errorMsg + "\n");
        }
        
        // Info log
        var infoMsg = moment().format("YYYY-MM-DD HH:mm:ss") + " | Status zmenený na: " + newStatus;
        if (error) infoMsg += " | Dôvod: " + error;
        var existingInfo = entry.field("info") || "";
        entry.set("info", existingInfo + "\n" + infoMsg);
        
    } catch (e) {
        if (utils) {
            utils.addError(entry, e, "updateStatus");
        }
    }
}

/**
 * Kontroluje či má byť notifikácia automaticky vymazaná po odoslaní
 * @param {Entry} entry - Záznam notifikácie
 */
function checkAutoDelete(entry) {
    try {
        var typSpravy = entry.field("Typ správy");
        if (typSpravy === "Systémová") {
            // Systémové správy sa môžu automaticky mazať
            // entry.trash();
            // utils.addDebug(entry, "🗑️ Systémová správa - automaticky vymazaná");
        }
        
    } catch (error) {
        if (utils) {
            utils.addError(entry, error, "checkAutoDelete");
        }
    }
}

/**
 * Kontroluje či je správa urgentná a potrebuje špeciálne spracovanie
 * @param {Entry} entry - Záznam notifikácie
 * @returns {boolean}
 */
function isUrgent(entry) {
    var priorita = entry.field("Priorita");
    return priorita === "Urgentná";
}


// ==============================================
// EXPORT FUNKCIÍ (pre použitie v iných scriptoch)
// ==============================================

var ASISTANTONotifications = {
    // Konfigurácia
    CONFIG: CONFIG,
    
    // Hlavné funkcie
    createNotification: createNotification,
    createNotificationOnly: createNotificationOnly,
    sendNotification: sendNotification,
    deleteNotificationWithMessage: deleteNotificationWithMessage,
    
    // Bulk operácie
    createBulkNotifications: createBulkNotifications,
    
    // Lifecycle
    processExpiredNotifications: processExpiredNotifications,
    updateNotificationStatus: updateNotificationStatus,
    
    // Templates
    createAttendanceNotificationTemplate: createAttendanceNotificationTemplate,
    createSystemNotificationTemplate: createSystemNotificationTemplate,
    
    // Utility
    formatTelegramMessage: formatTelegramMessage,
    getTelegramIdForEmployee: getTelegramIdForEmployee,
    getGroupInfo: getGroupInfo,
    canCreateNotifications: canCreateNotifications,
    isUrgent: isUrgent,
    checkAutoDelete: checkAutoDelete,
    updateStatus: updateStatus,
    sendToN8N: sendToN8N
};
// ==============================================
// PRÍKLAD POUŽITIA
// ==============================================

/*
// 1. Vytvorenie jednoduchej notifikácie pre zamestnanca
var notifData = {
    typSpravy: "Dochádzka",
    sprava: "Vaša dochádzka bola zaznamenaná",
    zamestnanec: [zamestnanecEntry],
    adresat: "Zamestnanec"
};
var notifikacia = ASISTANTONotifications.createNotification(notifData);

// 2. Vytvorenie notifikácie pre skupinu
var groupNotif = {
    typSpravy: "Systémová",
    sprava: formatTelegramMessage("Denný report", {
        "Počet zamestnancov": 15,
        "Odpracované hodiny": 120,
        "Mzdové náklady": "1,234.56 €"
    }),
    skupinaTema: [telegramGroupEntry],
    adresat: "Skupina-Téma"
};
ASISTANTONotifications.createNotification(groupNotif);

// 3. Bulk notifikácie
var baseData = {
    typSpravy: "ToDo",
    sprava: "Nezabudnite vyplniť mesačný report",
    priorita: "Vysoká"
};
var recipients = lib("Zamestnanci").entries();
ASISTANTONotifications.createBulkNotifications(baseData, recipients);

// 4. Naplánovaná notifikácia
var scheduledNotif = {
    sprava: "Týždenná porada o 10:00",
    poslatO: moment().add(1, 'week').hour(9).minute(0).toDate(),
    opakovat: "Každý týždeň",
    adresat: "Skupina"
};
ASISTANTONotifications.createNotification(scheduledNotif);
*/

// Vypíš informáciu o načítaní
utils.addDebug(entry(), "✅ ASISTANTO Notifications Helper v" + CONFIG.version + " načítaný");

// Pre kompatibilitu s require()
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ASISTANTONotifications;
}