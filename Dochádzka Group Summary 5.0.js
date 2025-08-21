// ==============================================
// DOCHÁDZKA GROUP SUMMARY
// Verzia: 5.0 | Dátum: 20.08.2025 | Autor: ASISTANTO
// Knižnica: Dochádzka | Trigger: After Save
// ==============================================
// 📋 FUNKCIA:
//    - Po uložení dochádzky vytvorí súhrnnú notifikáciu
//    - Pre Telegram skupinu/tému s prehľadom všetkých zamestnancov
//    - Využíva ASISTANTO Notifications Helper
//    - Neodosiela priamo - len vytvára záznam
// ✅ v5.0 ZMENY:
//    - Opravené všetky syntax chyby
//    - Pridaný proper lazy loading
//    - Action mode kompatibilita
//    - Vylepšené error handling
//    - Konzistentné funkcie a vzťahy
// ==============================================

// Lazy loading premenné
var utils = null;
var notifHelper = null;
var currentEntry = null;

// ==============================================
// LAZY LOADING FUNKCIE
// ==============================================

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
 * Detekuje či beží v Action mode
 */
function isActionMode() {
    try {
        return typeof entry === 'undefined' || !entry();
    } catch(e) {
        return true;
    }
}

/**
 * Získa aktuálny entry (kompatibilné s Action mode)
 */
function getCurrentEntry() {
    if (!currentEntry) {
        if (isActionMode()) {
            var selected = lib().entries();
            if (selected && selected.length > 0) {
                currentEntry = selected[0];
            } else {
                showError("Žiadne záznamy nie sú vybrané!");
                cancel();
            }
        } else {
            currentEntry = entry();
        }
        
        if (!currentEntry) {
            showError("Žiadny záznam na spracovanie!");
            cancel();
        }
    }
    return currentEntry;
}

/**
 * Zobrazí error správu
 */
function showError(msg, error) {
    var fullMessage = "❌ " + msg;
    if (error) {
        fullMessage += "\n\nDetail: " + error.toString();
    }
    
    if (typeof message === 'function') {
        message(fullMessage);
    }
}

// ==============================================
// KONFIGURÁCIA
// ==============================================

var CONFIG = {
    debug: true,
    version: "5.0",
    scriptName: "Dochádzka Group Summary",
    
    // Knižnice
    defaultsLibrary: "ASISTANTO Defaults",
    notificationsLibrary: "Notifications",
    telegramGroupsLibrary: "Telegram Groups",
    
    // Názvy polí v Defaults
    defaultsFields: {
        dochadzkaGroupEnabled: "Dochádzka skupinové notifikácie",
        telegramGroupLink: "Telegram skupina dochádzky",
        telegramDochadzkaId: "Telegram Dochádzka ID",
        nazovFirmy: "Názov firmy",
        includeFinancials: "Zahrnúť finančné údaje",
        summaryDelay: "Oneskorenie súhrnu (min)"
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
        notifikacie: "Notifikácie"
    },
    
    // Názvy atribútov
    attributes: {
        odpracovane: "odpracované",
        dennaMzda: "denná mzda",
        hodinovka: "hodinovka"
    },
    
    // Polia v ASISTANTO Telegram Groups
    telegramGroupsFields: {
        chatId: "Chat ID",
        threadId: "Thread ID",
        threadName: "Názov témy",
        groupName: "Názov skupiny"
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        var utils = getUtils();
        var currentEntry = getCurrentEntry();
        
        utils.addDebug(currentEntry, "🚀 === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        
        // 0. CLEANUP - Vymaž staré notifikácie ak existujú
        var cleanupModule = getCleanupModule();
        if (cleanupModule) {
            var cleanupResult = cleanupModule.cleanupOldNotifications(currentEntry);
            if (cleanupResult.deleted > 0) {
                utils.addDebug(currentEntry, "🧹 Vymazaných " + cleanupResult.deleted + " starých notifikácií");
            }
        }
        
        // 1. Kontrola či sú povolené skupinové notifikácie
        var settings = loadAllSettings();
        
        var enabled = settings[CONFIG.defaultsFields.dochadzkaGroupEnabled];
        utils.addDebug(currentEntry, "Skupinové notifikácie povolené: " + enabled);
        
        if (!enabled) {
            utils.addDebug(currentEntry, "ℹ️ Skupinové notifikácie sú vypnuté");
            return;
        }
        
        // 2. Kontrola či je nastavená skupina
        var targetGroup = findTargetGroup(settings);
        
        if (!targetGroup) {
            utils.addDebug(currentEntry, "❌ Nie je nastavená žiadna Telegram skupina pre dochádzku");
            utils.addError(currentEntry, "Nie je nastavená Telegram skupina pre dochádzku", CONFIG.scriptName);
            return;
        }
        
        // 3. Získaj zamestnancov
        var zamestnanci = utils.safeGetLinks(currentEntry, CONFIG.fields.zamestnanci);
        if (!zamestnanci || zamestnanci.length === 0) {
            utils.addDebug(currentEntry, "ℹ️ Žiadni zamestnanci v zázname");
            return;
        }
        
        utils.addDebug(currentEntry, "👥 Počet zamestnancov: " + zamestnanci.length);
        
        // 4. Priprav súhrnnú správu
        var summaryMessage = prepareSummaryMessage(zamestnanci, settings);
        
        // 5. Vytvor notifikáciu pomocou Notifications Helper
        var notification = createGroupNotification(summaryMessage, targetGroup);
        
        if (notification) {
            // 6. Linkuj notifikáciu k dochádzke
            if (cleanupModule) {
                cleanupModule.linkNotificationsToDochadzka(currentEntry, [notification]);
            }
            
            utils.addInfo(currentEntry, "Vytvorená skupinová notifikácia", {
                notificationId: notification.field("ID"),
                skupina: targetGroup.name,
                pocetZamestnancov: zamestnanci.length,
                datum: utils.formatDate(currentEntry.field(CONFIG.fields.datum), "DD.MM.YYYY")
            });
            
            utils.addDebug(currentEntry, "✅ === KONIEC - Skupinová notifikácia vytvorená ===");
        } else {
            utils.addError(currentEntry, "Nepodarilo sa vytvoriť skupinovú notifikáciu", CONFIG.scriptName);
        }
        
    } catch (error) {
        getUtils().addError(getCurrentEntry(), error.toString(), CONFIG.scriptName, error);
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
    var utils = getUtils();
    
    for (var key in CONFIG.defaultsFields) {
        if (CONFIG.defaultsFields.hasOwnProperty(key)) {
            settings[CONFIG.defaultsFields[key]] = utils.getSettings(CONFIG.defaultsLibrary, CONFIG.defaultsFields[key]);
        }
    }
    
    utils.addDebug(getCurrentEntry(), "📋 Nastavenia načítané z " + CONFIG.defaultsLibrary);
    
    return settings;
}

/**
 * Nájde cieľovú Telegram skupinu/tému
 */
function findTargetGroup(settings) {
    var targetGroup = null;
    var utils = getUtils();
    var currentEntry = getCurrentEntry();
    
    // Najprv skús získať linknutý záznam (preferovaný spôsob)
    var telegramGroupLink = CONFIG.defaultsFields.telegramGroupLink;
    if (telegramGroupLink && settings[telegramGroupLink]) {
        utils.addDebug(currentEntry, "📎 Kontrolujem linknutý záznam z '" + telegramGroupLink + "'");
        targetGroup = getTargetGroupFromLink(telegramGroupLink);
    }
    
    if (!targetGroup) {
        // Fallback na staré textové pole pre spätnú kompatibilitu
        var telegramId = settings[CONFIG.defaultsFields.telegramDochadzkaId];
        if (telegramId) {
            utils.addDebug(currentEntry, "📝 Používam textové pole 'Telegram Dochádzka ID' (legacy): " + telegramId);
            targetGroup = findTargetGroupByTextId(telegramId);
        }
    }
    
    return targetGroup;
}

/**
 * Získa cieľovú skupinu z Link to Entry poľa
 */
function getTargetGroupFromLink(linkFieldName) {
    var utils = getUtils();
    var currentEntry = getCurrentEntry();
    
    try {
        var defaultsLib = libByName(CONFIG.defaultsLibrary);
        if (!defaultsLib) {
            utils.addError(currentEntry, "Knižnica " + CONFIG.defaultsLibrary + " nenájdená", "getTargetGroupFromLink");
            return null;
        }
        
        var defaultsEntries = defaultsLib.entries();
        if (!defaultsEntries || defaultsEntries.length === 0) {
            return null;
        }
        
        var defaultsEntry = defaultsEntries[0];
        var linkedGroups = defaultsEntry.field(linkFieldName);
        // Debug info
        utils.addDebug(currentEntry, "🔗 Linknuté skupiny z '" + linkFieldName + "': "     + linkedGroups); 
        if (!linkedGroups) {
            return null;
        }
        
        // Konvertuj na array ak nie je
        // var groupsArray = Array.isArray(linkedGroups) ? linkedGroups : [linkedGroups];
        // var group = groupsArray[0];
        // // Debug info
        // addDebug(currentEntry, "🔍 Skupina z linku: " + group.field(CONFIG.telegramGroupsFields.threadName));
        var group = null;
        if (Array.isArray(linkedGroups) && linkedGroups.length > 0) {
            group = linkedGroups[0];
        } else if (linkedGroups) {
            group = linkedGroups;
        }

        if (!group) {
            return null;
        }
        
        // // Získaj potrebné údaje
        // var chatId = group.field(CONFIG.telegramGroupsFields.chatId);
        // var threadId = group.field(CONFIG.telegramGroupsFields.threadId);
        // var nazov = group.field(CONFIG.telegramGroupsFields.groupName) || 
        //             group.field(CONFIG.telegramGroupsFields.threadName);
        
        // if (!chatId) {
        //     utils.addError(currentEntry, "Linknutá skupina nemá Chat ID", "getTargetGroupFromLink");
        //     return null;
        // }
              // OPRAVA: Použitie entry() metódy pre získanie skutočného Entry objektu
        var actualEntry = null;
        try {
            // Ak má entry() metódu, použiť ju
            if (group.entry && typeof group.entry === 'function') {
                actualEntry = group.entry();
            } else {
                // Inak skús priamo
                actualEntry = group;
            }
        } catch (e) {
            utils.addDebug(currentEntry, "⚠️ Nepodarilo sa získať entry objekt: " + e.toString());
            actualEntry = group;
        }
        
        // Teraz získaj údaje
        var chatId = null;
        var threadId = null;
        var nazov = null;
        
        try {
            chatId = actualEntry.field(CONFIG.telegramGroupsFields.chatId);
            threadId = actualEntry.field(CONFIG.telegramGroupsFields.threadId);
            nazov = actualEntry.field(CONFIG.telegramGroupsFields.groupName) || 
                    actualEntry.field(CONFIG.telegramGroupsFields.threadName);
        } catch (fieldError) {
            utils.addError(currentEntry, "Chyba pri čítaní polí z linknutej skupiny: " + fieldError.toString() + "Line: " + fieldError.lineNumber);
            return null;
        }
        
        if (!chatId) {
            utils.addError(currentEntry, "Linknutá skupina nemá Chat ID", "getTargetGroupFromLink");
            return null;
        }

        var result = {
            entries: [actualEntry],
            //entries: [group],
            chatId: chatId,
            threadId: threadId,
            isThread: !!threadId,
            name: nazov || (threadId ? "Téma #" + threadId : "Skupina")
        };
        
        utils.addDebug(currentEntry, "✅ Získaná skupina z linku: " + result.name + 
                      " (Chat: " + chatId + (threadId ? ", Thread: " + threadId : "") + ")");
        
        return result;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString() +", line: " + error.lineNumber, "getTargetGroupFromLink", error);
        return null;
    }
}

/**
 * Nájde cieľovú skupinu/tému podľa ID (starý spôsob pre spätnú kompatibilitu)
 */
function findTargetGroupByTextId(telegramId) {
    var utils = getUtils();
    var currentEntry = getCurrentEntry();
    
    try {
        var telegramGroups = libByName(CONFIG.telegramGroupsLibrary);
        if (!telegramGroups) {
            utils.addError(currentEntry, "Knižnica " + CONFIG.telegramGroupsLibrary + " nenájdená", "findTargetGroupByTextId");
            return null;
        }
        
        // Rozpoznaj či je to skupina alebo téma
        var isThread = telegramId.indexOf("/") > -1;
        var result = {
            isThread: isThread,
            entries: []
        };
        
        if (isThread) {
            // Formát: "-1001234567890/123"
            var parts = telegramId.split("/");
            var chatId = parts[0];
            var threadId = parts[1];
            
            utils.addDebug(currentEntry, "🔍 Hľadám tému: Chat ID = " + chatId + ", Thread ID = " + threadId);
            
            // Nájdi všetky skupiny
            var allGroups = telegramGroups.entries();
            
            for (var i = 0; i < allGroups.length; i++) {
                var group = allGroups[i];
                if (group.field(CONFIG.telegramGroupsFields.chatId) === chatId && 
                    group.field(CONFIG.telegramGroupsFields.threadId) === threadId) {
                    result.entries.push(group);
                    result.threadName = group.field(CONFIG.telegramGroupsFields.groupName) + " - " + 
                                       (group.field(CONFIG.telegramGroupsFields.threadName) || "Téma #" + threadId);
                    result.chatId = chatId;
                    result.threadId = threadId;
                    result.name = result.threadName;
                    utils.addDebug(currentEntry, "✅ Našla sa téma: " + result.threadName);
                    break;
                }
            }
        } else {
            // Jednoduchá skupina
            utils.addDebug(currentEntry, "🔍 Hľadám skupinu: Chat ID = " + telegramId);
            
            var groups = telegramGroups.find(CONFIG.telegramGroupsFields.chatId, telegramId);
            if (groups && groups.length > 0) {
                result.entries.push(groups[0]);
                result.name = groups[0].field(CONFIG.telegramGroupsFields.groupName) || "Skupina";
                result.chatId = telegramId;
                utils.addDebug(currentEntry, "✅ Našla sa skupina: " + result.name);
            }
        }
        
        return result.entries.length > 0 ? result : null;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString() + "Line: " + error.lineNumber, "findTargetGroupByTextId" , error);
        return null;
    }
}

/**
 * Pripraví súhrnnú správu s novým dizajnom
 */
function prepareSummaryMessage(zamestnanci, settings) {
    var utils = getUtils();
    var currentEntry = getCurrentEntry();
    
    var datum = currentEntry.field(CONFIG.fields.datum);
    var datumFormatted = utils.formatDate(datum, "D.M.YYYY");
    var dayName = moment(datum).format("dddd");
    var prichod = currentEntry.field(CONFIG.fields.prichod);
    var odchod = currentEntry.field(CONFIG.fields.odchod);
    
    // Header - jednoduchý a profesionálny
    var message = "*Súhrn dochádzky - " + datumFormatted + " (" + dayName + ")*\n";
    message += "─────────────────────\n\n";
    
    // Základné info
    if (prichod || odchod) {
        var prichodFormatted = prichod ? utils.formatTime(prichod) : "—";
        var odchodFormatted = odchod ? utils.formatTime(odchod) : "—";
        message += "Čas: " + prichodFormatted + " - " + odchodFormatted + "\n";
    }
    
    message += "Počet pracovníkov: " + zamestnanci.length + "\n";
    
    // Celkové hodiny
    var totalHours = currentEntry.field(CONFIG.fields.odpracovane) || 0;
    if (totalHours > 0) {
        message += "Celkom odpracované: " + totalHours + "h\n";
    }
    
    // Mzdové náklady
    var includeFinancials = settings[CONFIG.defaultsFields.includeFinancials];
    if (includeFinancials) {
        var mzdoveNaklady = currentEntry.field(CONFIG.fields.mzdoveNaklady);
        if (mzdoveNaklady) {
            message += "Mzdové náklady: " + utils.formatMoney(mzdoveNaklady) + "\n";
        }
    }
    
    // Prázdny riadok pred zamestnancami
    message += "\n*Zamestnanci:*\n";
    
    // Zoraď zamestnancov podľa priezviska
    var sortedEmployees = sortEmployees(zamestnanci);
    
    for (var i = 0; i < sortedEmployees.length; i++) {
        var emp = sortedEmployees[i];
        message += formatEmployeeDetailNew(emp, i + 1, includeFinancials);
    }
    
    // Poznámka ak existuje
    var poznamka = currentEntry.field(CONFIG.fields.poznamka);
    if (poznamka) {
        message += "\n_Poznámka: " + poznamka + "_\n";
    }
    
    return message;
}

/**
 * Zoradí zamestnancov podľa priezviska
 */
function sortEmployees(zamestnanci) {
    var sorted = zamestnanci.slice(); // Kópia array
    var utils = getUtils();
    
    sorted.sort(function(a, b) {
        var priezviskoA = utils.safeGet(a, "Priezvisko", "").toLowerCase();
        var priezviskoB = utils.safeGet(b, "Priezvisko", "").toLowerCase();
        
        if (priezviskoA < priezviskoB) return -1;
        if (priezviskoA > priezviskoB) return 1;
        return 0;
    });
    
    return sorted;
}

/**
 * Formátuje detail zamestnanca - nový formát
 */
function formatEmployeeDetailNew(zamestnanec, poradie, includeFinancials) {
    var utils = getUtils();
    var detail = poradie + ". ";
    
    // Nick (Priezvisko) formát
    var nick = utils.safeGet(zamestnanec, "Nick", "");
    var priezvisko = utils.safeGet(zamestnanec, "Priezvisko", "");
    
    if (nick && priezvisko) {
        detail += nick + " (" + priezvisko + ")";
    } else if (nick) {
        detail += nick;
    } else if (priezvisko) {
        detail += priezvisko;
    } else {
        detail += "Neznámy";
    }
    
    // Odpracované hodiny
    var odpracovane = getEmployeeAttribute(zamestnanec, CONFIG.attributes.odpracovane);
    if (odpracovane && odpracovane > 0) {
        detail += " - " + odpracovane.toFixed(1).replace('.0', '') + "h";
    }
    
    // Denná mzda ak sú financie povolené
    if (includeFinancials) {
        var dennaMzda = getEmployeeAttribute(zamestnanec, CONFIG.attributes.dennaMzda);
        if (dennaMzda && dennaMzda > 0) {
            detail += " (" + utils.formatMoney(dennaMzda) + ")";
        }
    }
    
    detail += "\n";
    
    return detail;
}

/**
 * Získa atribút zamestnanca z poľa
 */
function getEmployeeAttribute(zamestnanec, attributeName) {
    var currentEntry = getCurrentEntry();
    
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

// /**
//  * Vytvorí skupinovú notifikáciu pomocou Notifications Helper
//  */
// function createGroupNotification(message, targetGroup) {
//     var utils = getUtils();
//     var currentEntry = getCurrentEntry();
//     var notifHelper = getNotifHelper();
    
//     if (!notifHelper) {
//         utils.addError(currentEntry, "ASISTANTONotifications nie je dostupný", "createGroupNotification");
//         return null;
//     }
    
//     try {
//         // Priprav dáta pre notifikáciu
//         var notificationData = {
//             typSpravy: "Dochádzka",
//             zdrojSpravy: "Automatická",
//             sprava: message,
//             predmet: "Súhrnná dochádzka - " + utils.formatDate(currentEntry.field(CONFIG.fields.datum), "DD.MM.YYYY"),
//             adresat: targetGroup.isThread ? "Téma" : "Skupina",
//             formatovanie: "Markdown",
//             priorita: "Normálna",
//             zdrojovaKniznica: "Dochádzka",
//             zdrojovyId: currentEntry.field(CONFIG.fields.id)
//         };
        
//         // Pridaj správnu skupinu/tému
//         if (targetGroup.isThread || !targetGroup.isThread) {
//             notificationData.skupinaTema = targetGroup.entries;
//         }
        
//         // Oneskorenie ak je nastavené
//         var delay = utils.getSettings(CONFIG.defaultsLibrary, CONFIG.defaultsFields.summaryDelay);
//         if (delay && delay > 0) {
//             var sendAt = moment().add(delay, 'minutes').toDate();
//             notificationData.poslatO = sendAt;
//             utils.addDebug(currentEntry, "⏰ Notifikácia bude odoslaná o: " + utils.formatDate(sendAt));
//         }
        
//         // Vytvor notifikáciu pomocou Helper
//         var notification = notifHelper.createNotification(notificationData);
        
//         if (notification) {
//             utils.addDebug(currentEntry, "✅ Notifikácia vytvorená: ID #" + notification.field("ID"));
//             return notification;
//         } else {
//             utils.addError(currentEntry, "Nepodarilo sa vytvoriť notifikáciu", "createGroupNotification");
//             return null;
//         }
        
//     } catch (error) {
//         utils.addError(currentEntry, error.toString(), "createGroupNotification", error);
//         return null;
//     }
// }

function createGroupNotification(message, targetGroup) {
    var utils = getUtils();
    var currentEntry = getCurrentEntry();
    var notifHelper = getNotifHelper();
    
    if (!notifHelper) {
        utils.addError(currentEntry, "ASISTANTONotifications nie je dostupný", "createGroupNotification");
        return null;
    }
    
    try {
        // OPRAVA: Správne mapovanie názvov polí
        var notificationData = {
            // Používaj presné názvy polí z Notifications Helper
            "Typ správy": "Dochádzka",
            "Zdroj správy": "Automatická", 
            "Správa": message,  // Zmena z 'sprava' na 'Správa'
            "Predmet": "Súhrnná dochádzka - " + utils.formatDate(currentEntry.field(CONFIG.fields.datum), "DD.MM.YYYY"),
            "Adresát": targetGroup.isThread ? "Téma" : "Skupina",
            "Formátovanie": "Markdown",
            "Priorita": "Normálna",
            "Zdrojová knižnica": "Dochádzka",
            "Zdrojový ID": currentEntry.field(CONFIG.fields.id).toString()
        };
        
        // OPRAVA: Správne priradenie skupiny/témy
        if (targetGroup.entries && targetGroup.entries.length > 0) {
            notificationData["Skupina/Téma"] = targetGroup.entries;
        }
        
        // Oneskorenie ak je nastavené
        var delay = utils.getSettings(CONFIG.defaultsLibrary, CONFIG.defaultsFields.summaryDelay);
        if (delay && delay > 0) {
            var sendAt = moment().add(delay, 'minutes').toDate();
            notificationData["Poslať o"] = sendAt;
            utils.addDebug(currentEntry, "⏰ Notifikácia bude odoslaná o: " + utils.formatDate(sendAt));
        }
        
        // Debug - vypíš čo posielame
        utils.addDebug(currentEntry, "📤 Vytváram notifikáciu s dátami: " + JSON.stringify(Object.keys(notificationData)));
        
        // Vytvor notifikáciu pomocou Helper
        var notification = notifHelper.createNotification(notificationData);
        
        if (notification) {
            utils.addDebug(currentEntry, "✅ Notifikácia vytvorená: ID #" + notification.field("ID"));
            return notification;
        } else {
            utils.addError(currentEntry, "Nepodarilo sa vytvoriť notifikáciu", "createGroupNotification");
            return null;
        }
        
    } catch (error) {
        utils.addError(currentEntry, error.toString() + "Line: " + error.lineNumber, "createGroupNotification", error);
        return null;
    }
}
// ==============================================
// CLEANUP MODULE (s lazy loading)
// ==============================================

/**
 * Získa cleanup modul s lazy loading
 */
function getCleanupModule() {
    // Inline definícia modulu
    return (function() {
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
                var utils = getUtils();
                utils.addDebug(dochadzkaEntry, "🧹 === CLEANUP NOTIFIKÁCIÍ ===");
                
                var linkedNotifications = utils.safeGetLinks(dochadzkaEntry, CONFIG.fields.notifikacie);
                
                if (!linkedNotifications || linkedNotifications.length === 0) {
                    utils.addDebug(dochadzkaEntry, "ℹ️ Žiadne linknuté notifikácie na vymazanie");
                    return result;
                }
                
                utils.addDebug(dochadzkaEntry, "📋 Našiel som " + linkedNotifications.length + " notifikácií na vymazanie");
                
                for (var i = 0; i < linkedNotifications.length; i++) {
                    var notif = linkedNotifications[i];
                    //var notifId = notif.field("ID");
                    var notifId = utils.safeGet(notif, "ID", "Neznáme ID");
                    
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
                utils.addError(dochadzkaEntry, "Chyba v cleanup: " + error.toString() + "Line: " + error.lineNumber);
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
                
                getUtils().addDebug(dochadzkaEntry, "🔗 Linknutých " + notifications.length + " notifikácií");
                
                return true;
                
            } catch (error) {
                getUtils().addError(dochadzkaEntry, "Chyba pri linkovaní: " + error.toString() + "Line: " + error.lineNumber);
                return false;
            }
        }
        
        return {
            version: CONFIG.version,
            cleanupOldNotifications: cleanupOldNotifications,
            linkNotificationsToDochadzka: linkNotificationsToDochadzka
        };
    })();
}

// ==============================================
// SPUSTENIE HLAVNEJ FUNKCIE
// ==============================================

main();