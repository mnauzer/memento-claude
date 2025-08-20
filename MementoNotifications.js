// ==============================================
// MEMENTO DATABASE - ASISTANTO NOTIFICATIONS HELPER
// Verzia: 1.2 | Dátum: 17.08.2025 | Autor: ASISTANTO
// Knižnica: ASISTANTO Notifications | Typ: Helper Script
// ==============================================
// 📋 FUNKCIE:
//    - Pomocné funkcie pre vytváranie notifikácií
//    - Automatické vyplnenie polí na základe zdroja
//    - Správa lifecycle notifikácií
//    - Template funkcie pre rôzne typy správ
//    - Bulk operácie a batch processing
// ✅ v1.2 KOMPLETNÁ IMPLEMENTÁCIA:
//    - Dokončené všetky funkcie
//    - Integrácia s MementoUtils 3.1
//    - Template systém pre rôzne typy správ
//    - Validácia a error handling
// ==============================================

// Lazy loading MementoUtils - neinicializuj hneď!
var utils = null;

/**
 * Získa MementoUtils instance (lazy loading)
 */
function getUtils() {
    if (!utils) {
        if (typeof MementoUtils !== 'undefined') {
            utils = MementoUtils;
        } else {
            // Fallback - základné funkcie ak MementoUtils nie je dostupný
            utils = {
                addDebug: function(entry, msg) {
                    var existing = entry.field("Debug_Log") || "";
                    entry.set("Debug_Log", existing + "[" + moment().format("HH:mm:ss") + "] " + msg + "\n");
                },
                addError: function(entry, error, location) {
                    var msg = "[" + moment().format("HH:mm:ss") + "] ❌ " + 
                             (location ? "(" + location + ") " : "") + error.toString();
                    var existing = entry.field("Error_Log") || "";
                    entry.set("Error_Log", existing + msg + "\n");
                },
                addInfo: function(entry, message, details) {
                    var timestamp = moment().format("DD.MM.YY HH:mm:ss");
                    var infoMessage = "[" + timestamp + "] " + message;
                    
                    if (details && typeof details === "object") {
                        infoMessage += "\n";
                        for (var key in details) {
                            if (details.hasOwnProperty(key)) {
                                infoMessage += "  • " + key + ": " + details[key] + "\n";
                            }
                        }
                    }
                    
                    var existingInfo = entry.field("info") || "";
                    entry.set("info", existingInfo + infoMessage + "\n");
                },
                safeGet: function(entry, fieldName, defaultValue) {
                    try {
                        if (!entry || !fieldName) return defaultValue;
                        var value = entry.field(fieldName);
                        return (value !== null && value !== undefined) ? value : defaultValue;
                    } catch (error) {
                        return defaultValue;
                    }
                },
                safeGetLinks: function(entry, linkFieldName) {
                    try {
                        if (!entry || !linkFieldName) return [];
                        var links = entry.field(linkFieldName);
                        if (!links) return [];
                        return Array.isArray(links) ? links : [links];
                    } catch (error) {
                        return [];
                    }
                },
                formatDate: function(date, format) {
                    if (!date) return "";
                    try {
                        var m = moment(date);
                        return m.isValid() ? m.format(format || "DD.MM.YY HH:mm") : "";
                    } catch (error) {
                        return "";
                    }
                },
                formatEmployeeName: function(employee) {
                    if (!employee) return "Neznámy zamestnanec";
                    try {
                        var nick = employee.field("Nick") || "";
                        var priezvisko = employee.field("Priezvisko") || "";
                        
                        if (nick && priezvisko) {
                            return nick + " (" + priezvisko + ")";
                        } else if (nick) {
                            return nick;
                        } else if (priezvisko) {
                            var meno = employee.field("Meno") || "";
                            return meno ? meno + " " + priezvisko : priezvisko;
                        }
                        
                        return "Zamestnanec #" + (employee.field("ID") || "?");
                    } catch (error) {
                        return "Neznámy zamestnanec";
                    }
                }
            };
        }
    }
    return utils;
}

// ==============================================
// KONFIGURÁCIA
// ==============================================

var CONFIG = {
    debug: true,
    version: "1.2.1",
    scriptName: "Notifications Helper",
    
    // Knižnice
    notificationsLibrary: "Notifications",
    telegramGroupsLibrary: "Telegram Groups",
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
        temaId: "Thread ID",
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
        statusCancelled: "Zrušené",
        statusExpired: "Vypršané",
        
        // Max pokusov
        maxRetries: 3,
        
        // DEBUG SEKCIA
        errorLog: "Error_Log",
        debugLog: "Debug_Log"
    },
    
    // Možnosti dropdownov
    options: {
        typSpravy: ["Dochádzka", "Záznam prác", "Kniha jázd", "ToDo", "Manuálna", "Systémová", "Zákazka", "Faktúra", "Platba"],
        zdrojSpravy: ["Automatická", "Manuálna", "Naplánovaná", "Trigger", "API"],
        formatovanie: ["Obyčajný text", "Markdown", "HTML"],
        priorita: ["Nízka", "Normálna", "Vysoká", "Urgentná"],
        adresat: ["Zamestnanec", "Klient", "Partner", "Skupina", "Skupina-Téma", "Zákazka"],
        opakovat: ["Nie", "Každý deň", "Každý týždeň", "Každý mesiac", "Každý rok"],
        status: ["Čaká", "Odoslané", "Zlyhalo", "Zrušené", "Vypršané"]
    }
};

// ==============================================
// HLAVNÉ HELPER FUNKCIE
// ==============================================

/**
 * Vytvorí nový záznam notifikácie s predvyplnenými údajmi
 * @param {Object} data - Dáta pre notifikáciu
 * @returns {Entry|null} - Vytvorený záznam alebo null
 */
function createNotification(data) {
    try {
        getUtils().addDebug(entry(), "📝 Vytváranie novej notifikácie");
        
        var notifLib = libByName(CONFIG.notificationsLibrary);
        if (!notifLib) {
            getUtils().addError(entry(), "Knižnica " + CONFIG.notificationsLibrary + " nenájdená", "createNotification");
            return null;
        }
        
        // Validácia povinných polí
        if (!data.sprava) {
            getUtils().addError(entry(), "Správa je povinné pole", "createNotification");
            return null;
        }
        
        // Predvolené hodnoty
        var notificationData = {
            // Povinné polia
            "Typ správy": data.typSpravy || "Systémová",
            "Zdroj správy": data.zdrojSpravy || "Automatická",
            "Správa": data.sprava || "",
            "Status": data.status || CONFIG.fields.statusWaiting,
            "Formátovanie": data.formatovanie || "Markdown",
            "Priorita": data.priorita || "Normálna",
            
            // Metadata
            "Vytvoril": user(),
            "Vytvorené": moment().toDate(),
            "Zdrojová knižnica": data.zdrojovaKniznica || lib().name,
            "Zdrojový ID": data.zdrojovyId || entry().field("ID"),
            
            // Info záznam
            "info": getUtils().formatDate(new Date()) + " | Vytvorené automaticky\n" +
                   "Zdroj: " + (data.zdrojovaKniznica || lib().title) + " #" + (data.zdrojovyId || entry().field("ID")) + "\n" +
                   "Script: " + CONFIG.scriptName + " v" + CONFIG.version
        };
        
        // Voliteľné polia
        if (data.predmet) notificationData["Predmet"] = data.predmet;
        if (data.priloha) notificationData["Príloha"] = data.priloha;
        if (data.adresat) notificationData["Adresát"] = data.adresat;
        
        // Cielenie podľa typu adresáta
        if (data.adresat === "Zamestnanec" && data.zamestnanec) {
            notificationData["Zamestnanec"] = data.zamestnanec;
        } else if (data.adresat === "Klient" && data.klient) {
            notificationData["Klient"] = data.klient;
        } else if (data.adresat === "Partner" && data.partner) {
            notificationData["Partner"] = data.partner;
        } else if ((data.adresat === "Skupina" || data.adresat === "Skupina-Téma") && data.skupinaTema) {
            notificationData["Skupina/Téma"] = data.skupinaTema;
        } else if (data.adresat === "Zákazka" && data.zakazka) {
            notificationData["Zákazka"] = data.zakazka;
        }
        
        // Časovanie
        if (data.poslatO) notificationData["Poslať o"] = data.poslatO;
        if (data.vyprsat) notificationData["Vypršať o"] = data.vyprsat;
        if (data.opakovat) notificationData["Opakovať"] = data.opakovat;
        
        // Direct ID/Chat ID ak je poskytnuté
        if (data.telegramId) notificationData["Telegram ID"] = data.telegramId;
        if (data.chatId) notificationData["Chat ID"] = data.chatId;
        if (data.temaId) notificationData["Thread ID"] = data.temaId;
        
        // Vytvor záznam
        var newNotification = notifLib.create(notificationData);
        
        if (newNotification) {
            utils.addDebug(entry(), "✅ Notifikácia vytvorená: ID #" + newNotification.field("ID"));
            utils.addInfo(newNotification, "Notifikácia vytvorená pomocou Helper scriptu", {
                sourceEntry: entry().field("ID"),
                sourceLibrary: lib().title
            });
        }
        
        return newNotification;
        
    } catch (error) {
        utils.addError(entry(), error.toString(), "createNotification", error);
        return null;
    }
}

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
                
                // Personalizuj správu
                if (notifData.sprava) {
                    notifData.sprava = personalizeMessage(notifData.sprava, recipient);
                }
                
            } else if (recipient.field && recipient.field("Názov")) {
                // Je to klient alebo partner
                if (recipient.lib().title === "Klienti") {
                    notifData.adresat = "Klient";
                    notifData.klient = [recipient];
                } else if (recipient.lib().title === "Partneri") {
                    notifData.adresat = "Partner";
                    notifData.partner = [recipient];
                }
                
            } else if (typeof recipient === "string") {
                // Je to Chat ID
                notifData.chatId = recipient;
                notifData.adresat = "Skupina";
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

/**
 * Personalizuje správu nahradením premenných
 * @param {string} message - Správa s premennými
 * @param {Entry} recipient - Adresát
 * @returns {string} - Personalizovaná správa
 */
function personalizeMessage(message, recipient) {
    if (!message || !recipient) return message;
    
    try {
        // Základné premenné
        message = message.replace(/{meno}/g, utils.safeGet(recipient, "Meno", ""));
        message = message.replace(/{priezvisko}/g, utils.safeGet(recipient, "Priezvisko", ""));
        message = message.replace(/{nick}/g, utils.safeGet(recipient, "Nick", ""));
        message = message.replace(/{email}/g, utils.safeGet(recipient, "Email", ""));
        message = message.replace(/{telefon}/g, utils.safeGet(recipient, "Telefón", ""));
        
        // Firemné údaje
        message = message.replace(/{nazov}/g, utils.safeGet(recipient, "Názov", ""));
        message = message.replace(/{ico}/g, utils.safeGet(recipient, "IČO", ""));
        
        // Časové premenné
        message = message.replace(/{datum}/g, utils.formatDate(moment(), "DD.MM.YYYY"));
        message = message.replace(/{cas}/g, utils.formatDate(moment(), "HH:mm"));
        message = message.replace(/{den}/g, moment().format("dddd"));
        
    } catch (error) {
        utils.addError(entry(), error, "personalizeMessage");
    }
    
    return message;
}

// ==============================================
// TEMPLATE FUNKCIE
// ==============================================

/**
 * Vytvorí template pre dochádzku notifikáciu
 * @param {Entry} dochadzkaEntry - Záznam dochádzky
 * @returns {Object} - Template dáta
 */
function createDochadzkaTemplate(dochadzkaEntry) {
    try {
        var zamestnanci = utils.safeGetLinks(dochadzkaEntry, "Zamestnanci");
        var datum = utils.formatDate(dochadzkaEntry.field("Dátum"), "DD.MM.YYYY");
        var prichod = dochadzkaEntry.field("Príchod");
        var odchod = dochadzkaEntry.field("Odchod");
        
        var message = "📋 *Dochádzka zaznamenaná*\n\n";
        message += "📅 Dátum: " + datum + "\n";
        message += "⏰ Príchod: " + (prichod || "—") + "\n";
        message += "🏁 Odchod: " + (odchod || "—") + "\n";
        
        if (zamestnanci.length > 1) {
            message += "\n👥 Zamestnanci:\n";
            for (var i = 0; i < zamestnanci.length; i++) {
                message += "• " + utils.formatEmployeeName(zamestnanci[i]) + "\n";
            }
        }
        
        return {
            typSpravy: "Dochádzka",
            predmet: "Dochádzka " + datum,
            sprava: message,
            formatovanie: "Markdown",
            zdrojovaKniznica: "Dochádzka",
            zdrojovyId: dochadzkaEntry.field("ID")
        };
        
    } catch (error) {
        utils.addError(entry(), error, "createDochadzkaTemplate");
        return null;
    }
}

/**
 * Vytvorí template pre záznam prác
 * @param {Entry} zaznamEntry - Záznam prác
 * @returns {Object} - Template dáta
 */
function createZaznamPracTemplate(zaznamEntry) {
    try {
        var datum = utils.formatDate(zaznamEntry.field("Dátum"), "DD.MM.YYYY");
        var zakazka = utils.safeGet(zaznamEntry.field("Zákazka"), "Číslo zákazky", "");
        var hodiny = utils.formatTime(zaznamEntry.field("Odpracované hodiny"));
        var popis = zaznamEntry.field("Popis prác");
        
        var message = "🔧 *Záznam prác*\n\n";
        message += "📅 Dátum: " + datum + "\n";
        message += "🏷️ Zákazka: " + zakazka + "\n";
        message += "⏱️ Odpracované: " + hodiny + "\n";
        
        if (popis) {
            message += "\n📝 Popis:\n" + popis;
        }
        
        return {
            typSpravy: "Záznam prác",
            predmet: "Práce " + datum + " - " + zakazka,
            sprava: message,
            formatovanie: "Markdown",
            zdrojovaKniznica: "Záznamy prác",
            zdrojovyId: zaznamEntry.field("ID")
        };
        
    } catch (error) {
        utils.addError(entry(), error, "createZaznamPracTemplate");
        return null;
    }
}

/**
 * Vytvorí template pre ToDo úlohu
 * @param {Object} todoData - Dáta úlohy
 * @returns {Object} - Template dáta
 */
function createTodoTemplate(todoData) {
    try {
        var priorityEmoji = {
            "Nízka": "🟢",
            "Normálna": "🟡",
            "Vysoká": "🟠",
            "Urgentná": "🔴"
        };
        
        var message = "✅ *Nová úloha*\n\n";
        message += priorityEmoji[todoData.priorita || "Normálna"] + " Priorita: " + (todoData.priorita || "Normálna") + "\n";
        message += "📋 Úloha: " + todoData.nazov + "\n";
        
        if (todoData.popis) {
            message += "\n📝 Popis:\n" + todoData.popis + "\n";
        }
        
        if (todoData.termin) {
            message += "\n⏰ Termín: " + utils.formatDate(todoData.termin, "DD.MM.YYYY HH:mm");
        }
        
        return {
            typSpravy: "ToDo",
            predmet: todoData.nazov,
            sprava: message,
            formatovanie: "Markdown",
            priorita: todoData.priorita || "Normálna",
            vyprsat: todoData.termin
        };
        
    } catch (error) {
        utils.addError(entry(), error, "createTodoTemplate");
        return null;
    }
}

/**
 * Vytvorí template pre systémovú správu
 * @param {string} title - Názov správy
 * @param {Object} data - Dáta vo formáte key-value
 * @returns {Object} - Template dáta
 */
function createSystemTemplate(title, data) {
    try {
        var message = "ℹ️ *" + title + "*\n\n";
        
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                message += key + ": " + data[key] + "\n";
            }
        }
        
        message += "\n_" + utils.formatDate(moment()) + "_";
        
        return {
            typSpravy: "Systémová",
            predmet: title,
            sprava: message,
            formatovanie: "Markdown",
            priorita: "Normálna"
        };
        
    } catch (error) {
        utils.addError(entry(), error, "createSystemTemplate");
        return null;
    }
}

// ==============================================
// FORMÁTOVANIE POMOCNÉ FUNKCIE
// ==============================================

/**
 * Formátuje správu pre Telegram s Markdown
 * @param {string} title - Názov správy
 * @param {Object} data - Dáta vo formáte key-value
 * @param {Object} options - Možnosti formátovania
 * @returns {string} - Naformátovaná správa
 */
function formatTelegramMessage(title, data, options) {
    options = options || {};
    
    try {
        var message = "";
        
        // Emoji a title
        if (options.emoji) {
            message += options.emoji + " ";
        }
        message += "*" + escapeMarkdown(title) + "*\n\n";
        
        // Data sekcia
        if (data && typeof data === "object") {
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    var value = data[key];
                    
                    // Formátuj hodnotu
                    if (value instanceof Date) {
                        value = utils.formatDate(value);
                    } else if (typeof value === "number" && key.toLowerCase().indexOf("cena") !== -1) {
                        value = utils.formatMoney(value);
                    }
                    
                    message += "• " + escapeMarkdown(key) + ": " + escapeMarkdown(value.toString()) + "\n";
                }
            }
        }
        
        // Footer
        if (!options.noFooter) {
            message += "\n_" + utils.formatDate(moment()) + "_";
        }
        
        return message;
        
    } catch (error) {
        utils.addError(entry(), error, "formatTelegramMessage");
        return title;
    }
}

/**
 * Escapuje špeciálne znaky pre Markdown
 * @param {string} text - Text na escape
 * @returns {string} - Escaped text
 */
function escapeMarkdown(text) {
    if (!text) return "";
    
    return text.toString()
        .replace(/\*/g, "\\*")
        .replace(/_/g, "\\_")
        .replace(/\[/g, "\\[")
        .replace(/\]/g, "\\]")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)")
        .replace(/~/g, "\\~")
        .replace(/`/g, "\\`")
        .replace(/>/g, "\\>")
        .replace(/#/g, "\\#")
        .replace(/\+/g, "\\+")
        .replace(/-/g, "\\-")
        .replace(/=/g, "\\=")
        .replace(/\|/g, "\\|")
        .replace(/\{/g, "\\{")
        .replace(/\}/g, "\\}")
        .replace(/\./g, "\\.")
        .replace(/!/g, "\\!");
}

// ==============================================
// LIFECYCLE MANAGEMENT
// ==============================================

/**
 * Zruší všetky čakajúce notifikácie pre daný zdroj
 * @param {string} sourceId - ID zdrojového záznamu
 * @param {string} sourceLibrary - Názov zdrojovej knižnice
 * @returns {number} - Počet zrušených notifikácií
 */
function cancelNotificationsBySource(sourceId, sourceLibrary) {
    try {
        var notifLib = libByName(CONFIG.notificationsLibrary);
        if (!notifLib) return 0;
        
        sourceLibrary = sourceLibrary || lib().title;
        var cancelled = 0;
        
        // Nájdi všetky notifikácie z tohto zdroja
        var notifications = notifLib.find("Zdrojový ID", sourceId);
        
        for (var i = 0; i < notifications.length; i++) {
            var notif = notifications[i];
            
            // Kontrola zdrojovej knižnice a statusu
            if (notif.field("Zdrojová knižnica") === sourceLibrary && 
                notif.field("Status") === CONFIG.fields.statusWaiting) {
                
                utils.safeSet(notif, "Status", CONFIG.fields.statusCancelled);
                utils.addInfo(notif, "Notifikácia zrušená", {
                    reason: "Source entry cancelled",
                    cancelledBy: user().name()
                });
                
                cancelled++;
            }
        }
        
        utils.addDebug(entry(), "❌ Zrušených " + cancelled + " notifikácií pre zdroj #" + sourceId);
        return cancelled;
        
    } catch (error) {
        utils.addError(entry(), error, "cancelNotificationsBySource");
        return 0;
    }
}

/**
 * Spracuje vypršané notifikácie
 * @returns {Object} - Štatistiky spracovania
 */
function processExpiredNotifications() {
    try {
        var notifLib = libByName(CONFIG.notificationsLibrary);
        if (!notifLib) return { processed: 0, error: "Library not found" };
        
        var now = moment();
        var stats = { 
            processed: 0, 
            expired: 0,
            total: 0 
        };
        
        // Nájdi všetky čakajúce notifikácie
        var waitingNotifs = notifLib.find("Status", CONFIG.fields.statusWaiting);
        stats.total = waitingNotifs.length;
        
        for (var i = 0; i < waitingNotifs.length; i++) {
            var notif = waitingNotifs[i];
            var vyprsat = notif.field("Vypršať o");
            
            if (vyprsat && moment(vyprsat).isBefore(now)) {
                utils.safeSet(notif, "Status", CONFIG.fields.statusExpired);
                utils.addInfo(notif, "Notifikácia vypršala", {
                    expiredAt: utils.formatDate(vyprsat),
                    processedAt: utils.formatDate(now)
                });
                
                stats.expired++;
            }
            
            stats.processed++;
        }
        
        utils.addDebug(entry(), "⏰ Spracovaných " + stats.processed + " notifikácií, " + stats.expired + " vypršalo");
        return stats;
        
    } catch (error) {
        utils.addError(entry(), error, "processExpiredNotifications");
        return { processed: 0, error: error.toString() };
    }
}

/**
 * Získa štatistiky notifikácií
 * @param {Object} filter - Filter kritériá
 * @returns {Object} - Štatistiky
 */
function getNotificationStats(filter) {
    try {
        var notifLib = libByName(CONFIG.notificationsLibrary);
        if (!notifLib) return null;
        
        var stats = {
            total: 0,
            waiting: 0,
            sent: 0,
            failed: 0,
            cancelled: 0,
            expired: 0,
            byType: {},
            byPriority: {},
            byAddressee: {}
        };
        
        var notifications;
        
        // Aplikuj filter
        if (filter && filter.dateFrom) {
            notifications = notifLib.entries();
            var filtered = [];
            
            for (var i = 0; i < notifications.length; i++) {
                var created = notifications[i].field("Vytvorené");
                if (created && moment(created).isSameOrAfter(moment(filter.dateFrom))) {
                    if (!filter.dateTo || moment(created).isSameOrBefore(moment(filter.dateTo))) {
                        filtered.push(notifications[i]);
                    }
                }
            }
            
            notifications = filtered;
        } else {
            notifications = notifLib.entries();
        }
        
        // Spočítaj štatistiky
        for (var j = 0; j < notifications.length; j++) {
            var notif = notifications[j];
            stats.total++;
            
            // Status
            var status = notif.field("Status");
            switch (status) {
                case CONFIG.fields.statusWaiting:
                    stats.waiting++;
                    break;
                case CONFIG.fields.statusSent:
                    stats.sent++;
                    break;
                case CONFIG.fields.statusFailed:
                    stats.failed++;
                    break;
                case CONFIG.fields.statusCancelled:
                    stats.cancelled++;
                    break;
                case CONFIG.fields.statusExpired:
                    stats.expired++;
                    break;
            }
            
            // Typ správy
            var typ = notif.field("Typ správy");
            stats.byType[typ] = (stats.byType[typ] || 0) + 1;
            
            // Priorita
            var priorita = notif.field("Priorita");
            stats.byPriority[priorita] = (stats.byPriority[priorita] || 0) + 1;
            
            // Adresát
            var adresat = notif.field("Adresát");
            stats.byAddressee[adresat] = (stats.byAddressee[adresat] || 0) + 1;
        }
        
        return stats;
        
    } catch (error) {
        utils.addError(entry(), error, "getNotificationStats");
        return null;
    }
}

// ==============================================
// EXPORT A PUBLIC API
// ==============================================

var ASISTANTONotifications = {
    // Verzia
    version: CONFIG.version,
    
    // Konfigurácia
    CONFIG: CONFIG,
    
    // Hlavné funkcie
    createNotification: createNotification,
    createBulkNotifications: createBulkNotifications,
    personalizeMessage: personalizeMessage,
    
    // Template funkcie
    createDochadzkaTemplate: createDochadzkaTemplate,
    createZaznamPracTemplate: createZaznamPracTemplate,
    createTodoTemplate: createTodoTemplate,
    createSystemTemplate: createSystemTemplate,
    
    // Formátovanie
    formatTelegramMessage: formatTelegramMessage,
    escapeMarkdown: escapeMarkdown,
    
    // Lifecycle management
    cancelNotificationsBySource: cancelNotificationsBySource,
    processExpiredNotifications: processExpiredNotifications,
    getNotificationStats: getNotificationStats
};

// ==============================================
// PRÍKLADY POUŽITIA
// ==============================================

/*
// 1. Vytvorenie jednoduchej notifikácie pre zamestnanca
var notifData = {
    typSpravy: "Dochádzka",
    sprava: "Vaša dochádzka bola zaznamenaná. Príchod: {prichod}, Odchod: {odchod}",
    zamestnanec: [zamestnanecEntry],
    adresat: "Zamestnanec"
};
var notifikacia = ASISTANTONotifications.createNotification(notifData);

// 2. Vytvorenie notifikácie pre skupinu s témou
var groupNotif = {
    typSpravy: "Systémová",
    sprava: ASISTANTONotifications.formatTelegramMessage("Denný report", {
        "Počet zamestnancov": 15,
        "Odpracované hodiny": 120,
        "Mzdové náklady": "1,234.56 €"
    }),
    skupinaTema: [telegramGroupEntry],
    adresat: "Skupina-Téma"
};
ASISTANTONotifications.createNotification(groupNotif);

// 3. Bulk notifikácie pre všetkých aktívnych zamestnancov
var baseData = {
    typSpravy: "ToDo",
    sprava: "Nezabudnite vyplniť mesačný report do {termin}",
    priorita: "Vysoká",
    vyprsat: moment().endOf('month').toDate()
};
var recipients = lib("Zamestnanci").find("Status", "Aktívny");
ASISTANTONotifications.createBulkNotifications(baseData, recipients);

// 4. Naplánovaná notifikácia s opakovaním
var scheduledNotif = {
    typSpravy: "Systémová",
    predmet: "Týždenná porada",
    sprava: "Pripomíname týždennú poradu o 10:00 v zasadačke",
    poslatO: moment().day(1).hour(9).minute(0).toDate(), // Pondelok 9:00
    opakovat: "Každý týždeň",
    adresat: "Skupina",
    skupinaTema: [poradaGroupEntry]
};
ASISTANTONotifications.createNotification(scheduledNotif);

// 5. Použitie template pre dochádzku
var dochadzkaTemplate = ASISTANTONotifications.createDochadzkaTemplate(dochadzkaEntry);
dochadzkaTemplate.zamestnanec = dochadzkaEntry.field("Zamestnanci");
dochadzkaTemplate.adresat = "Zamestnanec";
ASISTANTONotifications.createBulkNotifications(dochadzkaTemplate, dochadzkaTemplate.zamestnanec);

// 6. Zrušenie notifikácií pri vymazaní záznamu
var cancelled = ASISTANTONotifications.cancelNotificationsBySource(
    entry().field("ID"),
    lib().title
);

// 7. Spracovanie vypršaných notifikácií (napr. v scheduled action)
var expiredStats = ASISTANTONotifications.processExpiredNotifications();
message("Spracované: " + expiredStats.processed + ", Vypršané: " + expiredStats.expired);

// 8. Získanie štatistík za tento mesiac
var stats = ASISTANTONotifications.getNotificationStats({
    dateFrom: moment().startOf('month').toDate(),
    dateTo: moment().endOf('month').toDate()
});
message("Odoslané: " + stats.sent + "/" + stats.total);
*/

// ==============================================
// INICIALIZÁCIA
// ==============================================

// Vypíš informáciu o načítaní - používaj priamo entry() a základné funkcie
try {
    var debugMsg = "✅ ASISTANTO Notifications Helper v" + CONFIG.version + " načítaný";
    var existingDebug = entry().field("Debug_Log") || "";
    entry().set("Debug_Log", existingDebug + "[" + moment().format("HH:mm:ss") + "] " + debugMsg + "\n");
} catch (e) {
    // Ignoruj chybu pri inicializácii
}

// Pre kompatibilitu s globálnym namespace
if (typeof global !== 'undefined') {
    global.ASISTANTONotifications = ASISTANTONotifications;
}