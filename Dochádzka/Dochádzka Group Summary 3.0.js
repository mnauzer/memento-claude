// ==============================================
// DOCHÁDZKA GROUP SUMMARY
// Verzia: 3.0 | Dátum: 17.08.2025 | Autor: ASISTANTO
// Knižnica: Dochádzka | Trigger: After Save
// ==============================================
// 📋 FUNKCIA:
//    - Po uložení dochádzky vytvorí súhrnnú notifikáciu
//    - Pre Telegram skupinu/tému s prehľadom všetkých zamestnancov
//    - Využíva ASISTANTO Notifications Helper
//    - Neodosiela priamo - len vytvára záznam
// ✅ v3.0 REFAKTORING:
//    - Odstránené všetky Telegram funkcie
//    - Využitie centrálnych knižníc
//    - Jednoduchá a čistá implementácia
//    - Focus na súhrnné reporty
// ==============================================

// Import knižníc
var utils = MementoUtils;
var notifHelper = ASISTANTONotifications;
var currentEntry = entry();

// Konfigurácia
var CONFIG = {
    debug: true,
    version: "3.0",
    scriptName: "Dochádzka Group Summary",
    
    // Knižnice
    defaultsLibrary: "ASISTANTO Defaults",
    notificationsLibrary: "ASISTANTO Notifications",
    telegramGroupsLibrary: "ASISTANTO Telegram Groups",
    
    // Názvy polí v Defaults
    defaultsFields: {
        dochadzkaGroupEnabled: "Dochádzka skupinové notifikácie",
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
        id: "ID"
    },
    
    // Názvy atribútov
    attributes: {
        odpracovane: "odpracované",
        dennaMzda: "denná mzda",
        hodinovka: "hodinovka"
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, "🚀 === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        
        // 1. Kontrola či sú povolené skupinové notifikácie
        var settings = utils.getSettings(CONFIG.defaultsLibrary);
        utils.addDebug(currentEntry, "Nastavenia načítané z knižnice: " + CONFIG.defaultsLibrary);
        if (!settings) {
            utils.addDebug(currentEntry, "⚠️ Nenašli sa nastavenia v " + CONFIG.defaultsLibrary);
            return;
        }
        
        var enabled = settings[CONFIG.defaultsFields.dochadzkaGroupEnabled];
        utils.addDebug(currentEntry, "Skupinové notifikácie povolené: " + enabled);
        if (!enabled) {
            utils.addDebug(currentEntry, "ℹ️ Skupinové notifikácie sú vypnuté");
            return;
        }
        
        // 2. Kontrola či je nastavená skupina
        var telegramId = settings[CONFIG.defaultsFields.telegramDochadzkaId];
        utils.addDebug(currentEntry, "Telegram Dochádzka ID: " + telegramId);
        if (!telegramId) {
            utils.addDebug(currentEntry, "⚠️ Nie je nastavené Telegram Dochádzka ID");
            return;
        }
        
        // 3. Získaj zamestnancov
        var zamestnanci = utils.safeGetLinks(currentEntry, CONFIG.fields.zamestnanci);
        utils.addDebug(currentEntry, "Zamestnanci načítaní: " + (zamestnanci ? zamestnanci.length : 0));
        if (!zamestnanci || zamestnanci.length === 0) {
            utils.addDebug(currentEntry, "ℹ️ Žiadni zamestnanci v zázname");
            return;
        }
        
        utils.addDebug(currentEntry, "👥 Počet zamestnancov: " + zamestnanci.length);
        
        // 4. Nájdi cieľovú skupinu/tému
        var targetGroup = findTargetGroup(telegramId);
        utils.addDebug(currentEntry, "Cieľová skupina nájdená: " + (targetGroup ? targetGroup.name : "N/A"));
        if (!targetGroup) {
            utils.addError(currentEntry, "Nepodarilo sa nájsť cieľovú skupinu pre ID: " + telegramId, "main");
            return;
        }
        
        // 5. Priprav súhrnnú správu
        var summaryMessage = prepareSummaryMessage(zamestnanci, settings);
        
        // 6. Vytvor notifikáciu
        var notification = createGroupNotification(summaryMessage, targetGroup, settings);
        
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

/**
 * Nájde cieľovú skupinu/tému podľa ID
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
                if (group.field("Chat ID") === chatId && group.field("Téma ID") === threadId) {
                    result.entries.push(group);
                    result.name = group.field("Téma Názov") || "Téma #" + threadId;
                    utils.addDebug(currentEntry, "✅ Našla sa téma: " + result.name);
                    break;
                }
            }
        } else {
            // Jednoduchá skupina
            utils.addDebug(currentEntry, "🔍 Hľadám skupinu: Chat ID = " + telegramId);
            
            var groups = telegramGroups.find("Chat ID", telegramId);
            if (groups && groups.length > 0) {
                result.entries.push(groups[0]);
                result.name = groups[0].field("Názov") || "Skupina";
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
function prepareSummaryMessage(zamestnanci, settings) {
    var nazovFirmy = settings[CONFIG.defaultsFields.nazovFirmy] || "Firma";
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
    if (settings[CONFIG.defaultsFields.includeFinancials]) {
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
    message += formatStatistics(zamestnanci, settings);
    
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
function createGroupNotification(message, targetGroup, settings) {
    try {
        // Základné dáta notifikácie
        var notifData = {
            typSpravy: "Dochádzka",
            zdrojSpravy: "Automatická", 
            predmet: "Dochádzka - súhrn " + utils.formatDate(currentEntry.field(CONFIG.fields.datum), "DD.MM.YYYY"),
            sprava: message,
            formatovanie: "Markdown",
            priorita: "Normálna",
            zdrojovaKniznica: lib().name(),
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
        var delay = settings[CONFIG.defaultsFields.summaryDelay] || 0;
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