// ==============================================
// DOCHÁDZKA GROUP SUMMARY
// Verzia: 3.1 | Dátum: 17.08.2025 | Autor: ASISTANTO
// Knižnica: Dochádzka | Trigger: After Save
// ==============================================
// 📋 FUNKCIA:
//    - Po uložení dochádzky vytvorí súhrnnú notifikáciu
//    - Pre Telegram skupinu/tému s prehľadom všetkých zamestnancov
//    - Využíva ASISTANTO Notifications Helper
//    - Neodosiela priamo - len vytvára záznam
// ✅ v3.1 ZMENY:
//    - Pridaná podpora pre Link to Entry pole "Telegram skupina dochádzky"
//    - Zachovaná spätná kompatibilita s textovým polom
//    - Opravené názvy polí podľa GitHub verzie
// ==============================================

// Import knižníc
var utils = MementoUtils;
var notifHelper = ASISTANTONotifications;
var currentEntry = entry();

// Konfigurácia
var CONFIG = {
    debug: true,
    version: "3.1.1",
    scriptName: "Dochádzka Group Summary",
    
    // Knižnice
    defaultsLibrary: "ASISTANTO Defaults",
    notificationsLibrary: "ASISTANTO Notifications",
    telegramGroupsLibrary: "ASISTANTO Telegram Groups",
    
    // Názvy polí v Defaults - UPRAVENÉ PODĽA TVOJICH SCREENSHOTOV
    defaultsFields: {
        dochadzkaGroupEnabled: "Dochádzka skupinové notifikácie",  // Upravené
        telegramGroupLink: "Telegram skupina dochádzky",                // Link to Entry pole
        telegramDochadzkaId: "Telegram Dochádzka ID",                   // Textové pole pre spätnú kompatibilitu
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
        id: "ID"
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
        threadName: "Téma Názov",
        nazov: "Názov"
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, "🚀 === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        
        // 1. Kontrola či sú povolené skupinové notifikácie
        var settings = {};
        // Načítaj všetky potrebné nastavenia individuálne
        for (var key in CONFIG.defaultsFields) {
            settings[CONFIG.defaultsFields[key]] = utils.getSettings(CONFIG.defaultsLibrary, CONFIG.defaultsFields[key]);
        }
        
        utils.addDebug(currentEntry, "📋 Nastavenia načítané z " + CONFIG.defaultsLibrary);
        
        var enabled = settings[CONFIG.defaultsFields.dochadzkaGroupEnabled];
        utils.addDebug(currentEntry, "Skupinové notifikácie povolené: " + enabled);
        
        if (!enabled) {
            utils.addDebug(currentEntry, "ℹ️ Skupinové notifikácie sú vypnuté");
            return;
        }
        
        // 2. Kontrola či je nastavená skupina
        // Najprv skús získať linknutý záznam (preferovaný spôsob)
        var telegramGroupLink = settings[CONFIG.defaultsFields.telegramGroupLink];
        var targetGroup = null;
        
        if (telegramGroupLink) {
            // Používame Link to Entry pole
            utils.addDebug(currentEntry, "📎 Kontrolujem linknutý záznam z '" + telegramGroupLink + "'");
            targetGroup = getTargetGroupFromLink(telegramGroupLink);
        }
        
        if (!targetGroup) {
            // Fallback na staré textové pole pre spätnú kompatibilitu
            var telegramId = settings[CONFIG.defaultsFields.telegramDochadzkaId];
            if (telegramId) {
                utils.addDebug(currentEntry, "📝 Používam textové pole 'Telegram Dochádzka ID' (legacy): " + telegramId);
                targetGroup = findTargetGroup(telegramId);
            }
        }
        
        if (!targetGroup) {
            utils.addDebug(currentEntry, "❌ Nie je nastavená žiadna Telegram skupina pre dochádzku");
            utils.addError(currentEntry, "Nie je nastavená Telegram skupina pre dochádzku", "main");
            return;
        }
        
        // 3. Získaj zamestnancov
        var zamestnanci = utils.safeGetLinks(currentEntry, CONFIG.fields.zamestnanci);
        if (!zamestnanci || zamestnanci.length === 0) {
            utils.addDebug(currentEntry, "ℹ️ Žiadni zamestnanci v zázname");
            return;
        }
        
        utils.addDebug(currentEntry, "👥 Počet zamestnancov: " + zamestnanci.length);
        
        // 4. Nájdi cieľovú skupinu/tému
        // (táto časť už je vyriešená vyššie)
        
        // 5. Priprav súhrnnú správu
        var summaryMessage = prepareSummaryMessage(zamestnanci);
        
        // 6. Vytvor notifikáciu
        var notification = createGroupNotification(summaryMessage, targetGroup);
        
        if (notification) {
            utils.addInfo(currentEntry, "Vytvorená skupinová notifikácia", {
                notificationId: notification.field("ID"),
                skupina: targetGroup.name,
                pocetZamestnancov: zamestnanci.length,
                datum: utils.formatDate(currentEntry.field(CONFIG.fields.datum), "DD.MM.YYYY")
            });
            
            utils.addDebug(currentEntry, "✅ === KONIEC - Skupinová notifikácia vytvorená ===");
        } else {
            utils.addError(currentEntry, "Nepodarilo sa vytvoriť skupinovú notifikáciu", "main");
        }
        
    } catch (error) {
        utils.addError(currentEntry, error, "main");
    }
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================
function formatStatistics(zamestnanci, includeFinancials) {
    var stats = "";
    
    // Priemerné odpracované hodiny
    var totalHours = 0;
    var countWithHours = 0;
    
    for (var i = 0; i < zamestnanci.length; i++) {
        var hours = getEmployeeAttribute(zamestnanci[i], CONFIG.attributes.odpracovane);
        if (hours) {
            totalHours += hours;
            countWithHours++;
        }
    }
    
    if (countWithHours > 0) {
        var avgHours = totalHours / countWithHours;
        stats += "• Priemerný čas: " + utils.formatTime(avgHours) + "\n";
    }
    
    // Finančné štatistiky
    if (includeFinancials) {
        var totalWages = 0;
        var countWithWages = 0;
        
        for (var j = 0; j < zamestnanci.length; j++) {
            var wage = getEmployeeAttribute(zamestnanci[j], CONFIG.attributes.dennaMzda);
            if (wage) {
                totalWages += wage;
                countWithWages++;
            }
        }
        
        if (countWithWages > 0) {
            var avgWage = totalWages / countWithWages;
            stats += "• Priemerná denná mzda: " + utils.formatMoney(avgWage) + "\n";
            stats += "• Náklady na zamestnanca: " + utils.formatMoney(totalWages / zamestnanci.length) + "\n";
        }
    }
    
    // Účasť
    var totalEmployees = getTotalActiveEmployees();
    if (totalEmployees > 0) {
        var attendanceRate = (zamestnanci.length / totalEmployees) * 100;
        stats += "• Účasť: " + attendanceRate.toFixed(1) + "% (" + zamestnanci.length + "/" + totalEmployees + ")\n";
    }
    
    return stats;
}

// ==============================================
/**
 * Získa cieľovú skupinu z Link to Entry poľa (nový preferovaný spôsob)
 */
function getTargetGroupFromLink(telegramGroupLink) {
    try {
        if (!telegramGroupLink) {
            utils.addDebug(currentEntry, "⚠️ Link to Entry parameter je prázdny");
            return null;
        }
        
        // Pre stringové ID treba získať settings entry priamo
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
        var linkedGroups = utils.safeGetLinks(defaultsEntry, telegramGroupLink) || [];
        
        if (!linkedGroups || (Array.isArray(linkedGroups) && linkedGroups.length === 0)) {
            utils.addDebug(currentEntry, "⚠️ Žiadne linknuté skupiny v poli '" + telegramGroupLink + "'");
            return null;
        }
        
        // Konvertuj na pole ak nie je
        var groupsArray = Array.isArray(linkedGroups) ? linkedGroups : [linkedGroups];
        var group = groupsArray[0];
        
        if (!group) {
            return null;
        }
        
        // Získaj potrebné údaje
        var chatId = group.field(CONFIG.telegramGroupsFields.chatId);
        var threadId = group.field(CONFIG.telegramGroupsFields.threadId);
        var nazov = group.field(CONFIG.telegramGroupsFields.nazov) || 
                    group.field(CONFIG.telegramGroupsFields.threadName);
        
        if (!chatId) {
            utils.addError(currentEntry, "Linknutá skupina nemá Chat ID", "getTargetGroupFromLink");
            return null;
        }
        
        var result = {
            entries: [group],
            chatId: chatId,
            threadId: threadId,
            isThread: !!threadId,
            name: nazov || (threadId ? "Téma #" + threadId : "Skupina")
        };
        
        utils.addDebug(currentEntry, "✅ Získaná skupina z linku: " + result.name + " (Chat: " + chatId + (threadId ? ", Thread: " + threadId : "") + ")");
        
        return result;
        
    } catch (error) {
        utils.addError(currentEntry, error, "getTargetGroupFromLink");
        return null;
    }
}

/**
 * Nájde cieľovú skupinu/tému podľa ID (starý spôsob pre spätnú kompatibilitu)
 */
function findTargetGroup(telegramId) {
    try {
        var telegramGroups = libByName(CONFIG.telegramGroupsLibrary);
        if (!telegramGroups) {
            utils.addError(currentEntry, "Knižnica " + CONFIG.telegramGroupsLibrary + " nenájdená", "findTargetGroup");
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
                    result.name = group.field(CONFIG.telegramGroupsFields.threadName) || "Téma #" + threadId;
                    result.chatId = chatId;
                    result.threadId = threadId;
                    utils.addDebug(currentEntry, "✅ Našla sa téma: " + result.name);
                    break;
                }
            }
        } else {
            // Jednoduchá skupina
            utils.addDebug(currentEntry, "🔍 Hľadám skupinu: Chat ID = " + telegramId);
            
            var groups = telegramGroups.find(CONFIG.telegramGroupsFields.chatId, telegramId);
            if (groups && groups.length > 0) {
                result.entries.push(groups[0]);
                result.name = groups[0].field(CONFIG.telegramGroupsFields.nazov) || "Skupina";
                result.chatId = telegramId;
                utils.addDebug(currentEntry, "✅ Našla sa skupina: " + result.name);
            }
        }
        
        return result.entries.length > 0 ? result : null;
        
    } catch (error) {
        utils.addError(currentEntry, error, "findTargetGroup");
        return null;
    }
}

/**
 * Pripraví súhrnnú správu
 */
function prepareSummaryMessage(zamestnanci) {
    var nazovFirmy = utils.getSettings(CONFIG.defaultsLibrary, CONFIG.defaultsFields.nazovFirmy) || "Firma";
    var datum = utils.formatDate(currentEntry.field(CONFIG.fields.datum), "DD.MM.YYYY");
    var prichod = currentEntry.field(CONFIG.fields.prichod);
    var odchod = currentEntry.field(CONFIG.fields.odchod);
    
    // Header
    var message = "📊 *DOCHÁDZKA - " + nazovFirmy + "*\n";
    message += "📅 " + datum + "\n";
    message += "━━━━━━━━━━━━━━━━━━━━\n\n";
    
    // Celkové info
    message += "📋 *SÚHRN*\n";
    message += "👥 Počet pracovníkov: " + zamestnanci.length + "\n";
    
    if (prichod || odchod) {
        message += "⏰ Čas: " + (prichod || "—") + " → " + (odchod || "—") + "\n";
    }
    
    // Celkové odpracované hodiny
    var totalHours = currentEntry.field(CONFIG.fields.odpracovane) || 0;
    if (totalHours > 0) {
        message += "⏱️ Odpracované spolu: " + utils.formatTime(totalHours) + "\n";
    }
    
    // Finančné údaje ak sú povolené
    var includeFinancials = utils.getSettings(CONFIG.defaultsLibrary, CONFIG.defaultsFields.includeFinancials);
    if (includeFinancials) {
        var mzdoveNaklady = currentEntry.field(CONFIG.fields.mzdoveNaklady);
        if (mzdoveNaklady) {
            message += "💰 Mzdové náklady: " + utils.formatMoney(mzdoveNaklady) + "\n";
        }
    }
    
    // Detail zamestnancov
    message += "\n👷 *ZAMESTNANCI*\n";
    
    // Zoraď zamestnancov podľa priezviska
    var sortedEmployees = sortEmployees(zamestnanci);
    
    for (var i = 0; i < sortedEmployees.length; i++) {
        var emp = sortedEmployees[i];
        message += formatEmployeeDetail(emp, i + 1);
    }
    
    // Štatistiky
    message += "\n📈 *ŠTATISTIKY*\n";
    message += formatStatistics(zamestnanci, includeFinancials);
    
    // Poznámka ak existuje
    var poznamka = currentEntry.field(CONFIG.fields.poznamka);
    if (poznamka) {
        message += "\n📝 *Poznámka:* " + poznamka + "\n";
    }
    
    // Footer
    message += "\n━━━━━━━━━━━━━━━━━━━━\n";
    message += "_Dochádzka #" + currentEntry.field(CONFIG.fields.id) + "_";
    
    return message;
}

/**
 * Zoradí zamestnancov podľa priezviska
 */
function sortEmployees(zamestnanci) {
    var sorted = zamestnanci.slice(); // Kópia array
    
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
 * Formátuje detail zamestnanca
 */
function formatEmployeeDetail(zamestnanec, poradie) {
    var detail = poradie + ". ";
    
    // Meno
    detail += utils.formatEmployeeName(zamestnanec);
    
    // Odpracované hodiny z atribútu
    var odpracovane = getEmployeeAttribute(zamestnanec, CONFIG.attributes.odpracovane);
    if (odpracovane) {
        detail += " - " + utils.formatTime(odpracovane);
    }
    
    // Denná mzda z atribútu
    var dennaMzda = getEmployeeAttribute(zamestnanec, CONFIG.attributes.dennaMzda);
    if (dennaMzda) {
        detail += " (" + utils.formatMoney(dennaMzda) + ")";
    }
    
    detail += "\n";
    
    return detail;
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
 * Formátuje štatistiky
 */
function formatStatistics(zamestnanci, settings) {
    var stats = "";
    
    // Priemerné odpracované hodiny
    var totalHours = 0;
    var countWithHours = 0;
    
    for (var i = 0; i < zamestnanci.length; i++) {
        var hours = getEmployeeAttribute(zamestnanci[i], CONFIG.attributes.odpracovane);
        if (hours) {
            totalHours += hours;
            countWithHours++;
        }
    }
    
    if (countWithHours > 0) {
        var avgHours = totalHours / countWithHours;
        stats += "• Priemerný čas: " + utils.formatTime(avgHours) + "\n";
    }
    
    // Finančné štatistiky
    if (settings[CONFIG.defaultsFields.includeFinancials]) {
        var totalWages = 0;
        var countWithWages = 0;
        
        for (var j = 0; j < zamestnanci.length; j++) {
            var wage = getEmployeeAttribute(zamestnanci[j], CONFIG.attributes.dennaMzda);
            if (wage) {
                totalWages += wage;
                countWithWages++;
            }
        }
        
        if (countWithWages > 0) {
            var avgWage = totalWages / countWithWages;
            stats += "• Priemerná denná mzda: " + utils.formatMoney(avgWage) + "\n";
            stats += "• Náklady na zamestnanca: " + utils.formatMoney(totalWages / zamestnanci.length) + "\n";
        }
    }
    
    // Účasť
    var totalEmployees = getTotalActiveEmployees();
    if (totalEmployees > 0) {
        var attendanceRate = (zamestnanci.length / totalEmployees) * 100;
        stats += "• Účasť: " + attendanceRate.toFixed(1) + "% (" + zamestnanci.length + "/" + totalEmployees + ")\n";
    }
    
    return stats;
}

/**
 * Získa počet aktívnych zamestnancov
 */
function getTotalActiveEmployees() {
    try {
        var zamestnanciLib = libByName("Zamestnanci");
        if (!zamestnanciLib) return 0;
        
        var activeEmployees = zamestnanciLib.find("Status", "Aktívny");
        return activeEmployees ? activeEmployees.length : 0;
        
    } catch (error) {
        return 0;
    }
}

/**
 * Vytvorí skupinovú notifikáciu
 */
function createGroupNotification(message, targetGroup) {
    try {
        // Načítaj oneskorenie
        var delay = utils.getSettings(CONFIG.defaultsLibrary, CONFIG.defaultsFields.summaryDelay) || 0;
        
        // Základné dáta notifikácie
        var notifData = {
            typSpravy: "Dochádzka",
            zdrojSpravy: "Automatická", 
            predmet: "Dochádzka - súhrn " + utils.formatDate(currentEntry.field(CONFIG.fields.datum), "DD.MM.YYYY"),
            sprava: message,
            formatovanie: "Markdown",
            priorita: "Normálna",
            zdrojovaKniznica: lib().title,
            zdrojovyId: currentEntry.field(CONFIG.fields.id)
        };
        
        // Nastav adresáta
        if (targetGroup.isThread) {
            notifData.adresat = "Skupina-Téma";
        } else {
            notifData.adresat = "Skupina";
        }
        
        notifData.skupinaTema = targetGroup.entries;
        
        // Nastav čas odoslania ak je oneskorenie
        if (delay > 0) {
            notifData.poslatO = moment().add(delay, 'minutes').toDate();
            utils.addDebug(currentEntry, "⏰ Súhrn naplánovaný o " + delay + " minút");
        }
        
        // Vytvor notifikáciu
        var notification = notifHelper.createNotification(notifData);
        
        if (notification) {
            utils.addDebug(currentEntry, "✅ Skupinová notifikácia vytvorená (ID: " + notification.field("ID") + ")");
        }
        
        return notification;
        
    } catch (error) {
        utils.addError(currentEntry, error, "createGroupNotification");
        return null;
    }
}

// ==============================================
// SPUSTENIE
// ==============================================

main();