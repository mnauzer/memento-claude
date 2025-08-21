// ==============================================
// DOCHÁDZKA INDIVIDUAL NOTIFICATIONS
// Verzia: 4.0 | Dátum: 20.08.2025 | Autor: ASISTANTO
// Knižnica: Dochádzka | Trigger: After Save
// ==============================================
// 📋 FUNKCIA:
//    - Po uložení dochádzky vytvorí individuálne notifikácie
//    - Pre každého zamestnanca v zázname
//    - Využíva ASISTANTO Notifications Helper
//    - Neodosiela priamo - len vytvára záznamy
// ✅ v4.0 REFAKTORING:
//    - Integrácia s poľom "Notifikácie" v dochádzke
//    - Cleanup starých notifikácií pri update
//    - Konzistentné s Group Summary v4.1
//    - Optimalizovaný kód a lepšie formátovanie času
//    - Odstránené duplicity, využitie MementoUtils
// ==============================================

// Import knižníc
var utils = MementoUtils;
var notifHelper = ASISTANTONotifications;
var cleanupModule = DochadzkaNotifsCleanup;
var currentEntry = entry();

// Konfigurácia
var CONFIG = {
    debug: true,
    version: "4.0",
    scriptName: "Dochádzka Individual Notifications",
    
    // Knižnice
    defaultsLibrary: "ASISTANTO Defaults",
    notificationsLibrary: "Notifications",
    
    // Názvy polí v Defaults
    defaultsFields: {
        dochadzkaIndividualEnabled: "Dochádzka individuálne notifikácie",
        notificationDelay: "Oneskorenie notifikácie (min)",
        nazovFirmy: "Názov firmy",
        includeFinancials: "Zahrnúť finančné údaje",
        includeStats: "Zahrnúť štatistiky"
    },
    
    // Názvy polí v Dochádzke
    fields: {
        zamestnanci: "Zamestnanci",
        datum: "Dátum",
        prichod: "Príchod",
        odchod: "Odchod",
        pracovnaDoba: "Pracovná doba",
        mzdoveNaklady: "Mzdové náklady",
        pocetPracovnikov: "Počet pracovníkov",
        odpracovane: "Odpracované",
        poznamka: "Poznámka",
        id: "ID",
        notifikacie: "Notifikácie"  // NOVÉ pole pre linknuté notifikácie
    },
    
    // Názvy atribútov
    attributes: {
        odpracovane: "odpracované",
        hodinovka: "hodinovka",
        priplatokHodinovka: "+príplatok (€/h)",
        premia: "+prémia (€)",
        pokuta: "-pokuta (€)",
        dennaMzda: "denná mzda",
        poznamka: "poznámka"
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, "🚀 === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        
        // 0. CLEANUP - Vymaž staré notifikácie ak existujú
        if (cleanupModule && typeof cleanupModule.cleanupOldNotifications === 'function') {
            var cleanupResult = cleanupModule.cleanupOldNotifications(currentEntry);
            if (cleanupResult.deleted > 0) {
                utils.addDebug(currentEntry, "🧹 Vymazaných " + cleanupResult.deleted + " starých notifikácií");
            }
        } else {
            utils.addDebug(currentEntry, "⚠️ Cleanup modul nie je dostupný");
        }
        
        // 1. Kontrola či sú povolené individuálne notifikácie
        var settings = loadAllSettings();
        
        var enabled = settings[CONFIG.defaultsFields.dochadzkaIndividualEnabled];
        utils.addDebug(currentEntry, "Individuálne notifikácie povolené: " + enabled);
        
        if (!enabled) {
            utils.addDebug(currentEntry, "ℹ️ Individuálne notifikácie sú vypnuté");
            return;
        }

        // 2. Získaj zamestnancov
        var zamestnanci = utils.safeGetLinks(currentEntry, CONFIG.fields.zamestnanci);
        if (!zamestnanci || zamestnanci.length === 0) {
            utils.addDebug(currentEntry, "ℹ️ Žiadni zamestnanci v zázname");
            return;
        }
        
        utils.addDebug(currentEntry, "👥 Počet zamestnancov: " + zamestnanci.length);
        
        // 3. Priprav základné dáta
        var baseData = prepareBaseData(settings);
        
        // 4. Vytvor notifikácie pre každého zamestnanca
        var createdCount = 0;
        var createdNotifications = [];
        
        for (var i = 0; i < zamestnanci.length; i++) {
            var zamestnanec = zamestnanci[i];
            utils.addDebug(currentEntry, "👤 Spracovávam: " + utils.formatEmployeeName(zamestnanec));
            
            var notification = createIndividualNotification(zamestnanec, baseData, settings);
            if (notification) {
                createdCount++;
                createdNotifications.push(notification);
            }
        }
        
        // 5. NOVÉ - Linkuj notifikácie k dochádzke
        if (createdNotifications.length > 0 && cleanupModule && typeof cleanupModule.linkNotificationsToDochadzka === 'function') {
            cleanupModule.linkNotificationsToDochadzka(currentEntry, createdNotifications);
        }
        
        // 6. Záverečné info
        utils.addInfo(currentEntry, "Vytvorené individuálne notifikácie", {
            celkom: createdCount,
            zamestnanci: zamestnanci.length,
            datum: utils.formatDate(currentEntry.field(CONFIG.fields.datum), "DD.MM.YYYY")
        });
        
        utils.addDebug(currentEntry, "✅ === KONIEC - Vytvorených " + createdCount + " notifikácií ===");
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), CONFIG.scriptName, error);
    }
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

/**
 * Načíta všetky nastavenia z Defaults knižnice
 */
function loadAllSettings() {
    var settings = {};
    
    for (var key in CONFIG.defaultsFields) {
        settings[CONFIG.defaultsFields[key]] = utils.getSettings(CONFIG.defaultsLibrary, CONFIG.defaultsFields[key]);
    }
    
    utils.addDebug(currentEntry, "📋 Nastavenia načítané z " + CONFIG.defaultsLibrary);
    
    return settings;
}

/**
 * Pripraví základné dáta pre notifikáciu
 */
function prepareBaseData(settings) {
    var datum = currentEntry.field(CONFIG.fields.datum);
    var prichod = currentEntry.field(CONFIG.fields.prichod);
    var odchod = currentEntry.field(CONFIG.fields.odchod);
    var pracovnaDoba = currentEntry.field(CONFIG.fields.pracovnaDoba);
    
    var baseData = {
        typSpravy: "Dochádzka",
        zdrojSpravy: "Automatická",
        formatovanie: "Markdown",
        priorita: "Normálna",
        status: "Čaká",
        zdrojovaKniznica: "Dochádzka",
        zdrojovyId: currentEntry.field(CONFIG.fields.id),
        datum: datum,
        prichod: prichod,
        odchod: odchod,
        pracovnaDoba: pracovnaDoba
    };
    
    // Nastav čas odoslania ak je oneskorenie
    var delay = settings[CONFIG.defaultsFields.notificationDelay] || 0;
    if (delay > 0) {
        baseData.poslatO = moment().add(delay, 'minutes').toDate();
        utils.addDebug(currentEntry, "⏰ Notifikácie naplánované o " + delay + " minút");
    }
    
    return baseData;
}

/**
 * Vytvorí individuálnu notifikáciu pre zamestnanca
 */
function createIndividualNotification(zamestnanec, baseData, settings) {
    try {
        // Získaj údaje zamestnanca
        var zamestnanecInfo = utils.getEmployeeDetails(zamestnanec, currentEntry.field(CONFIG.fields.datum));
        if (!zamestnanecInfo) {
            utils.addDebug(currentEntry, "⚠️ Nepodarilo sa získať info o zamestnancovi");
            return null;
        }
        
        // Kontrola či má Telegram
        if (!zamestnanecInfo.telegramEnabled || !zamestnanecInfo.telegramId) {
            utils.addDebug(currentEntry, "ℹ️ " + zamestnanecInfo.fullName + " nemá povolený Telegram");
            return null;
        }
        
        // Priprav správu
        var message = prepareIndividualMessage(zamestnanec, zamestnanecInfo, settings);
        
        // Vytvor notifikáciu
        var notifData = Object.assign({}, baseData, {
            predmet: "Dochádzka " + utils.formatDate(baseData.datum, "DD.MM.YYYY"),
            sprava: message,
            adresat: "Zamestnanec",
            zamestnanec: [zamestnanec]
        });
        
        var notification = notifHelper.createNotification(notifData);
        
        if (notification) {
            utils.addDebug(currentEntry, "✅ Notifikácia vytvorená pre " + zamestnanecInfo.fullName + " (ID: " + notification.field("ID") + ")");
            return notification;
        } else {
            utils.addError(currentEntry, "Nepodarilo sa vytvoriť notifikáciu pre " + zamestnanecInfo.fullName, "createIndividualNotification");
            return null;
        }
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createIndividualNotification", error);
        return null;
    }
}

/**
 * Pripraví personalizovanú správu pre zamestnanca
 */
function prepareIndividualMessage(zamestnanec, zamestnanecInfo, settings) {
    var datum = currentEntry.field(CONFIG.fields.datum);
    var datumFormatted = utils.formatDate(datum, "D.M.YYYY");
    var dayName = moment(datum).format("dddd");
    
    // Header - čistý formát
    var message = "*Vaša dochádzka - " + datumFormatted + " (" + dayName + ")*\n";
    message += "─────────────────────\n\n";
    
    // Základné info
    message += "👤 " + zamestnanecInfo.fullName + "\n";
    
    // Časy - správne formátované
    var prichod = currentEntry.field(CONFIG.fields.prichod);
    var odchod = currentEntry.field(CONFIG.fields.odchod);
    
    if (prichod || odchod) {
        var prichodFormatted = prichod ? utils.formatTime(prichod) : "—";
        var odchodFormatted = odchod ? utils.formatTime(odchod) : "—";
        message += "⏰ Čas: " + prichodFormatted + " - " + odchodFormatted + "\n";
    }
    
    // Odpracované hodiny (z atribútu)
    var odpracovane = getEmployeeAttribute(zamestnanec, CONFIG.attributes.odpracovane);
    if (odpracovane && odpracovane > 0) {
        message += "⏱️ Odpracované: " + odpracovane.toFixed(1).replace('.0', '') + "h\n";
    }
    
    // Finančné údaje ak sú povolené
    if (settings[CONFIG.defaultsFields.includeFinancials]) {
        var dennaMzda = getEmployeeAttribute(zamestnanec, CONFIG.attributes.dennaMzda);
        if (dennaMzda && dennaMzda > 0) {
            message += "💰 Denná mzda: " + utils.formatMoney(dennaMzda) + "\n";
        }
        
        // Hodinovka
        if (zamestnanecInfo.hodinovka && zamestnanecInfo.hodinovka > 0) {
            message += "💵 Hodinová sadzba: " + utils.formatMoney(zamestnanecInfo.hodinovka) + "/h\n";
        }
    }
    
    // Štatistiky ak sú povolené
    if (settings[CONFIG.defaultsFields.includeStats]) {
        message += "\n*Mesačné štatistiky:*\n";
        
        var monthStats = getMonthlyStats(zamestnanec);
        if (monthStats && monthStats.days > 0) {
            message += "• Odpracované dni: " + monthStats.days + "\n";
            message += "• Celkom hodín: " + monthStats.hours.toFixed(1).replace('.0', '') + "h\n";
            
            if (settings[CONFIG.defaultsFields.includeFinancials] && monthStats.earned > 0) {
                message += "• Zarobené: " + utils.formatMoney(monthStats.earned) + "\n";
            }
        } else {
            message += "• Zatiaľ žiadne údaje tento mesiac\n";
        }
    }
    
    // Poznámka zamestnanca ak existuje
    var poznamkaZam = getEmployeeAttribute(zamestnanec, CONFIG.attributes.poznamka);
    if (poznamkaZam) {
        message += "\n📝 Vaša poznámka: " + poznamkaZam + "\n";
    }
    
    // Poznámka dochádzky ak existuje
    var poznamka = currentEntry.field(CONFIG.fields.poznamka);
    if (poznamka) {
        message += "\n📌 Poznámka k dochádzke: " + poznamka;
    }
    
    return message;
}

/**
 * Získa atribút zamestnanca z poľa
 */
function getEmployeeAttribute(zamestnanec, attributeName) {
    try {
        var zamArray = currentEntry.field(CONFIG.fields.zamestnanci);
        
        if (zamArray && zamArray.length > 0) {
            for (var i = 0; i < zamArray.length; i++) {
                if (zamArray[i].field("ID") === zamestnanec.field("ID")) {
                    return zamArray[i].attr(attributeName);
                }
            }
        }
        
        return null;
        
    } catch (error) {
        return null;
    }
}

/**
 * Získa mesačné štatistiky pre zamestnanca
 */
function getMonthlyStats(zamestnanec) {
    try {
        var monthStart = moment(currentEntry.field(CONFIG.fields.datum)).startOf('month');
        var monthEnd = moment(currentEntry.field(CONFIG.fields.datum)).endOf('month');
        
        // Nájdi všetky dochádzky tohto mesiaca
        var dochadzkyLib = lib();
        var allDochadzky = dochadzkyLib.entries();
        
        var stats = {
            days: 0,
            hours: 0,
            earned: 0
        };
        
        for (var i = 0; i < allDochadzky.length; i++) {
            var dochadzka = allDochadzky[i];
            var datum = dochadzka.field(CONFIG.fields.datum);
            
            // Kontrola či je v správnom období
            if (!datum || !moment(datum).isBetween(monthStart, monthEnd, 'day', '[]')) {
                continue;
            }
            
            // Kontrola či obsahuje tohto zamestnanca
            var zamestnanci = utils.safeGetLinks(dochadzka, CONFIG.fields.zamestnanci);
            var hasEmployee = false;
            
            for (var j = 0; j < zamestnanci.length; j++) {
                if (zamestnanci[j].field("ID") === zamestnanec.field("ID")) {
                    hasEmployee = true;
                    break;
                }
            }
            
            if (hasEmployee) {
                stats.days++;
                
                // Získaj odpracované hodiny z atribútu
                var hodiny = 0;
                var zamArray = dochadzka.field(CONFIG.fields.zamestnanci);
                
                if (zamArray && zamArray.length > 0) {
                    for (var k = 0; k < zamArray.length; k++) {
                        if (zamArray[k].field("ID") === zamestnanec.field("ID")) {
                            hodiny = zamArray[k].attr(CONFIG.attributes.odpracovane) || 0;
                            break;
                        }
                    }
                }
                
                stats.hours += hodiny;
                
                // Vypočítaj zárobok
                var hodinovka = getEmployeeAttribute(zamestnanec, CONFIG.attributes.hodinovka) || 0;
                if (hodinovka > 0 && hodiny > 0) {
                    stats.earned += hodiny * hodinovka;
                }
            }
        }
        
        return stats;
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri výpočte mesačných štatistík: " + error.toString(), "getMonthlyStats", error);
        return null;
    }
}

// ==============================================
// SPUSTENIE
// ==============================================

main();

// ==============================================
// CLEANUP MODULE (inline pre jednoduchosť)
// ==============================================

var DochadzkaNotifsCleanup = (function() {
    'use strict';
    
    var CONFIG = {
        version: "1.0",
        fields: {
            notifikacie: "Notifikácie",
            messageId: "Message ID",
            chatId: "Chat ID",
            status: "Status"
        }
    };
    
    function cleanupOldNotifications(dochadzkaEntry) {
        var result = {
            deleted: 0,
            telegramDeleted: 0,
            errors: [],
            success: true
        };
        
        try {
            utils.addDebug(dochadzkaEntry, "🧹 === CLEANUP NOTIFIKÁCIÍ ===");
            
            var linkedNotifications = utils.safeGetLinks(dochadzkaEntry, CONFIG.fields.notifikacie);
            
            if (!linkedNotifications || linkedNotifications.length === 0) {
                utils.addDebug(dochadzkaEntry, "ℹ️ Žiadne linknuté notifikácie na vymazanie");
                return result;
            }
            
            utils.addDebug(dochadzkaEntry, "📋 Našiel som " + linkedNotifications.length + " notifikácií na vymazanie");
            
            for (var i = 0; i < linkedNotifications.length; i++) {
                var notif = linkedNotifications[i];
                var notifId = notif.field("ID");
                
                try {
                    // Pokús sa vymazať Telegram správu
                    if (typeof ASISTANTOTelegram !== 'undefined' && ASISTANTOTelegram.deleteTelegramMessage) {
                        var messageId = notif.field(CONFIG.fields.messageId);
                        var chatId = notif.field(CONFIG.fields.chatId);
                        
                        if (messageId && chatId) {
                            var deleteResult = ASISTANTOTelegram.deleteTelegramMessage(chatId, messageId);
                            if (deleteResult.success) {
                                result.telegramDeleted++;
                            }
                        }
                    }
                    
                    // Vymaž notifikáciu
                    notif.remove();
                    result.deleted++;
                    
                    utils.addDebug(dochadzkaEntry, "✅ Notifikácia #" + notifId + " vymazaná");
                    
                } catch (error) {
                    result.errors.push("Notifikácia #" + notifId + ": " + error.toString());
                }
            }
            
            // Vyčisti pole
            dochadzkaEntry.set(CONFIG.fields.notifikacie, []);
            
            utils.addDebug(dochadzkaEntry, "🧹 Cleanup dokončený: " + result.deleted + " vymazaných");
            
            return result;
            
        } catch (error) {
            utils.addError(dochadzkaEntry, "Chyba v cleanup: " + error.toString());
            result.success = false;
            return result;
        }
    }
    
    function linkNotificationsToDochadzka(dochadzkaEntry, notifications) {
        try {
            if (!notifications || notifications.length === 0) return true;
            
            var existingNotifs = dochadzkaEntry.field(CONFIG.fields.notifikacie) || [];
            var allNotifs = existingNotifs.concat(notifications);
            
            dochadzkaEntry.set(CONFIG.fields.notifikacie, allNotifs);
            
            utils.addDebug(dochadzkaEntry, "🔗 Linknutých " + notifications.length + " notifikácií");
            
            return true;
            
        } catch (error) {
            utils.addError(dochadzkaEntry, "Chyba pri linkovaní: " + error.toString());
            return false;
        }
    }
    
    return {
        version: CONFIG.version,
        cleanupOldNotifications: cleanupOldNotifications,
        linkNotificationsToDochadzka: linkNotificationsToDochadzka
    };
})();