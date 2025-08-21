// ==============================================
// DOCHÁDZKA NOTIFICATIONS ORCHESTRATOR
// Verzia: 1.0 | Dátum: 20.08.2025 | Autor: ASISTANTO
// Knižnica: Dochádzka | Trigger: After Save
// ==============================================
// 📋 FUNKCIA:
//    - Centrálny orchestrátor pre všetky dochádzka notifikácie
//    - Spravuje individuálne aj skupinové notifikácie
//    - Jednotný cleanup a linking proces
//    - Modulárny dizajn pre ľahkú údržbu
// ==============================================

// Import knižníc
var utils = MementoUtils;
var notifHelper = ASISTANTONotifications;
var currentEntry = entry();

// Konfigurácia
var CONFIG = {
    debug: true,
    version: "1.0",
    scriptName: "Dochádzka Notifications Orchestrator",
    
    // Knižnice
    defaultsLibrary: "ASISTANTO Defaults",
    notificationsLibrary: "Notifications",
    telegramGroupsLibrary: "Telegram Groups",
    
    // Centrálne nastavenia
    defaultsFields: {
        // Individuálne notifikácie
        individualEnabled: "Dochádzka individuálne notifikácie",
        individualDelay: "Oneskorenie notifikácie (min)",
        includeStats: "Zahrnúť štatistiky",
        
        // Skupinové notifikácie
        groupEnabled: "Dochádzka skupinové notifikácie",
        groupDelay: "Oneskorenie súhrnu (min)",
        telegramGroupLink: "Telegram skupina dochádzky",
        telegramDochadzkaId: "Telegram Dochádzka ID",
        
        // Spoločné
        nazovFirmy: "Názov firmy",
        includeFinancials: "Zahrnúť finančné údaje"
    },
    
    // Polia v Dochádzke
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
    
    // Atribúty
    attributes: {
        odpracovane: "odpracované",
        dennaMzda: "denná mzda",
        hodinovka: "hodinovka"
    }
};

// ==============================================
// HLAVNÁ ORCHESTRÁCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, "🎼 === ŠTART ORCHESTRÁTOR v" + CONFIG.version + " ===");
        
        // 1. Cleanup starých notifikácií
        var cleanupResult = cleanupOldNotifications();
        if (cleanupResult.deleted > 0) {
            utils.addDebug(currentEntry, "🧹 Vymazaných " + cleanupResult.deleted + " starých notifikácií");
        }
        
        // 2. Načítaj nastavenia
        var settings = loadAllSettings();
        
        // 3. Získaj zamestnancov
        var zamestnanci = utils.safeGetLinks(currentEntry, CONFIG.fields.zamestnanci);
        if (!zamestnanci || zamestnanci.length === 0) {
            utils.addDebug(currentEntry, "ℹ️ Žiadni zamestnanci - končím");
            return;
        }
        
        utils.addDebug(currentEntry, "👥 Počet zamestnancov: " + zamestnanci.length);
        
        // 4. Zbierka vytvorených notifikácií
        var createdNotifications = [];
        var results = {
            individual: { enabled: false, created: 0, errors: 0 },
            group: { enabled: false, created: 0, errors: 0 }
        };
        
        // 5. Spracuj individuálne notifikácie
        if (settings[CONFIG.defaultsFields.individualEnabled]) {
            results.individual.enabled = true;
            utils.addDebug(currentEntry, "📧 Spracovávam individuálne notifikácie...");
            
            var individualResults = processIndividualNotifications(zamestnanci, settings);
            results.individual.created = individualResults.created;
            results.individual.errors = individualResults.errors;
            createdNotifications = createdNotifications.concat(individualResults.notifications);
        }
        
        // 6. Spracuj skupinové notifikácie
        if (settings[CONFIG.defaultsFields.groupEnabled]) {
            results.group.enabled = true;
            utils.addDebug(currentEntry, "📊 Spracovávam skupinovú notifikáciu...");
            
            var groupResult = processGroupNotification(zamestnanci, settings);
            if (groupResult.notification) {
                results.group.created = 1;
                createdNotifications.push(groupResult.notification);
            } else {
                results.group.errors = 1;
            }
        }
        
        // 7. Linkuj všetky vytvorené notifikácie
        if (createdNotifications.length > 0) {
            linkNotificationsToDochadzka(createdNotifications);
            utils.addDebug(currentEntry, "🔗 Linknutých " + createdNotifications.length + " notifikácií");
        }
        
        // 8. Finálne info
        logFinalSummary(results);
        
        utils.addDebug(currentEntry, "✅ === ORCHESTRÁTOR DOKONČENÝ ===");
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), CONFIG.scriptName, error);
    }
}

// ==============================================
// CLEANUP MODUL
// ==============================================

function cleanupOldNotifications() {
    var result = {
        deleted: 0,
        telegramDeleted: 0,
        errors: []
    };
    
    try {
        var linkedNotifications = utils.safeGetLinks(currentEntry, CONFIG.fields.notifikacie);
        
        if (!linkedNotifications || linkedNotifications.length === 0) {
            return result;
        }
        
        for (var i = 0; i < linkedNotifications.length; i++) {
            var notif = linkedNotifications[i];
            
            try {
                // Pokús sa vymazať Telegram správu
                if (typeof ASISTANTOTelegram !== 'undefined') {
                    var messageId = notif.field("Message ID");
                    var chatId = notif.field("Chat ID");
                    
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
                
            } catch (error) {
                result.errors.push(error.toString());
            }
        }
        
        // Vyčisti pole
        currentEntry.set(CONFIG.fields.notifikacie, []);
        
    } catch (error) {
        utils.addError(currentEntry, "Cleanup error: " + error.toString());
    }
    
    return result;
}

// ==============================================
// INDIVIDUÁLNE NOTIFIKÁCIE
// ==============================================

function processIndividualNotifications(zamestnanci, settings) {
    var result = {
        created: 0,
        errors: 0,
        notifications: []
    };
    
    // Základné dáta pre všetky notifikácie
    var baseData = {
        typSpravy: "Dochádzka",
        zdrojSpravy: "Automatická",
        formatovanie: "Markdown",
        priorita: "Normálna",
        zdrojovaKniznica: "Dochádzka",
        zdrojovyId: currentEntry.field(CONFIG.fields.id)
    };
    
    // Oneskorenie
    var delay = settings[CONFIG.defaultsFields.individualDelay] || 0;
    if (delay > 0) {
        baseData.poslatO = moment().add(delay, 'minutes').toDate();
    }
    
    // Spracuj každého zamestnanca
    for (var i = 0; i < zamestnanci.length; i++) {
        var zamestnanec = zamestnanci[i];
        
        try {
            // Kontrola či má zamestnanec Telegram
            var empDetails = utils.getEmployeeDetails(zamestnanec, currentEntry.field(CONFIG.fields.datum));
            if (!empDetails || !empDetails.telegramEnabled || !empDetails.telegramId) {
                utils.addDebug(currentEntry, "ℹ️ " + utils.formatEmployeeName(zamestnanec) + " nemá Telegram");
                continue;
            }
            
            // Priprav správu
            var message = prepareIndividualMessage(zamestnanec, empDetails, settings);
            
            // Vytvor notifikáciu
            var notifData = Object.assign({}, baseData, {
                predmet: "Dochádzka " + utils.formatDate(currentEntry.field(CONFIG.fields.datum), "DD.MM.YYYY"),
                sprava: message,
                adresat: "Zamestnanec",
                zamestnanec: [zamestnanec]
            });
            
            var notification = notifHelper.createNotification(notifData);
            
            if (notification) {
                result.created++;
                result.notifications.push(notification);
            } else {
                result.errors++;
            }
            
        } catch (error) {
            result.errors++;
            utils.addError(currentEntry, "Individual notif error: " + error.toString());
        }
    }
    
    return result;
}

// ==============================================
// SKUPINOVÁ NOTIFIKÁCIA
// ==============================================

function processGroupNotification(zamestnanci, settings) {
    var result = {
        notification: null,
        error: null
    };
    
    try {
        // Nájdi cieľovú skupinu
        var targetGroup = findTargetGroup(settings);
        
        if (!targetGroup) {
            result.error = "Nie je nastavená Telegram skupina";
            utils.addError(currentEntry, result.error);
            return result;
        }
        
        // Priprav správu
        var message = prepareGroupMessage(zamestnanci, settings);
        
        // Základné dáta
        var notifData = {
            typSpravy: "Dochádzka",
            zdrojSpravy: "Automatická",
            sprava: message,
            predmet: "Súhrn dochádzky - " + utils.formatDate(currentEntry.field(CONFIG.fields.datum), "DD.MM.YYYY"),
            adresat: targetGroup.isThread ? "Téma" : "Skupina",
            skupinaTema: targetGroup.entries,
            formatovanie: "Markdown",
            priorita: "Normálna",
            zdrojovaKniznica: "Dochádzka",
            zdrojovyId: currentEntry.field(CONFIG.fields.id)
        };
        
        // Oneskorenie
        var delay = settings[CONFIG.defaultsFields.groupDelay] || 0;
        if (delay > 0) {
            notifData.poslatO = moment().add(delay, 'minutes').toDate();
        }
        
        // Vytvor notifikáciu
        var notification = notifHelper.createNotification(notifData);
        
        if (notification) {
            result.notification = notification;
        } else {
            result.error = "Nepodarilo sa vytvoriť notifikáciu";
        }
        
    } catch (error) {
        result.error = error.toString();
        utils.addError(currentEntry, "Group notif error: " + error.toString());
    }
    
    return result;
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

function loadAllSettings() {
    var settings = {};
    
    for (var key in CONFIG.defaultsFields) {
        settings[CONFIG.defaultsFields[key]] = utils.getSettings(CONFIG.defaultsLibrary, CONFIG.defaultsFields[key]);
    }
    
    return settings;
}

function linkNotificationsToDochadzka(notifications) {
    try {
        currentEntry.set(CONFIG.fields.notifikacie, notifications);
        return true;
    } catch (error) {
        utils.addError(currentEntry, "Linking error: " + error.toString());
        return false;
    }
}

function logFinalSummary(results) {
    var summary = {
        datum: utils.formatDate(currentEntry.field(CONFIG.fields.datum), "DD.MM.YYYY"),
        pocetZamestnancov: utils.safeGetLinks(currentEntry, CONFIG.fields.zamestnanci).length,
        individualneVytvorene: results.individual.created,
        individualneChyby: results.individual.errors,
        skupinovaVytvorena: results.group.created === 1,
        skupinovaChyba: results.group.errors > 0
    };
    
    utils.addInfo(currentEntry, "Notifikácie spracované", summary);
}

// ==============================================
// MESSAGE PREPARATION FUNKCIE
// ==============================================

function prepareIndividualMessage(zamestnanec, empDetails, settings) {
    var message = "*Vaša dochádzka bola zaznamenaná*\n\n";
    
    message += "👤 " + empDetails.fullName + "\n";
    message += "📅 Dátum: " + utils.formatDate(currentEntry.field(CONFIG.fields.datum), "DD.MM.YYYY") + "\n";
    
    var prichod = currentEntry.field(CONFIG.fields.prichod);
    var odchod = currentEntry.field(CONFIG.fields.odchod);
    
    if (prichod || odchod) {
        message += "⏰ Čas: " + utils.formatTime(prichod) + " - " + utils.formatTime(odchod) + "\n";
    }
    
    // Odpracované hodiny
    var odpracovane = getEmployeeAttribute(zamestnanec, CONFIG.attributes.odpracovane);
    if (odpracovane && odpracovane > 0) {
        message += "⏱️ Odpracované: " + odpracovane.toFixed(1).replace('.0', '') + "h\n";
    }
    
    // Financie ak povolené
    if (settings[CONFIG.defaultsFields.includeFinancials]) {
        var dennaMzda = getEmployeeAttribute(zamestnanec, CONFIG.attributes.dennaMzda);
        if (dennaMzda && dennaMzda > 0) {
            message += "💰 Denná mzda: " + utils.formatMoney(dennaMzda) + "\n";
        }
    }
    
    return message;
}

function prepareGroupMessage(zamestnanci, settings) {
    var datum = currentEntry.field(CONFIG.fields.datum);
    var datumFormatted = utils.formatDate(datum, "D.M.YYYY");
    var dayName = moment(datum).format("dddd");
    
    var message = "*Súhrn dochádzky - " + datumFormatted + " (" + dayName + ")*\n";
    message += "─────────────────────\n\n";
    
    // Časy
    var prichod = currentEntry.field(CONFIG.fields.prichod);
    var odchod = currentEntry.field(CONFIG.fields.odchod);
    if (prichod || odchod) {
        message += "Čas: " + utils.formatTime(prichod) + " - " + utils.formatTime(odchod) + "\n";
    }
    
    message += "Počet pracovníkov: " + zamestnanci.length + "\n";
    
    // Celkové hodiny
    var totalHours = currentEntry.field(CONFIG.fields.odpracovane) || 0;
    if (totalHours > 0) {
        message += "Celkom odpracované: " + totalHours + "h\n";
    }
    
    // Mzdové náklady
    if (settings[CONFIG.defaultsFields.includeFinancials]) {
        var mzdoveNaklady = currentEntry.field(CONFIG.fields.mzdoveNaklady);
        if (mzdoveNaklady) {
            message += "Mzdové náklady: " + utils.formatMoney(mzdoveNaklady) + "\n";
        }
    }
    
    // Zamestnanci
    message += "\n*Zamestnanci:*\n";
    
    var sortedEmployees = sortEmployees(zamestnanci);
    for (var i = 0; i < sortedEmployees.length; i++) {
        var emp = sortedEmployees[i];
        message += formatEmployeeShort(emp, i + 1, settings[CONFIG.defaultsFields.includeFinancials]);
    }
    
    return message;
}

// Utility funkcie
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

function sortEmployees(zamestnanci) {
    var sorted = zamestnanci.slice();
    
    sorted.sort(function(a, b) {
        var priezviskoA = utils.safeGet(a, "Priezvisko", "").toLowerCase();
        var priezviskoB = utils.safeGet(b, "Priezvisko", "").toLowerCase();
        
        if (priezviskoA < priezviskoB) return -1;
        if (priezviskoA > priezviskoB) return 1;
        return 0;
    });
    
    return sorted;
}

function formatEmployeeShort(zamestnanec, poradie, includeFinancials) {
    var detail = poradie + ". ";
    
    var nick = utils.safeGet(zamestnanec, "Nick", "");
    var priezvisko = utils.safeGet(zamestnanec, "Priezvisko", "");
    
    detail += nick + " (" + priezvisko + ")";
    
    var odpracovane = getEmployeeAttribute(zamestnanec, CONFIG.attributes.odpracovane);
    if (odpracovane && odpracovane > 0) {
        detail += " - " + odpracovane.toFixed(1).replace('.0', '') + "h";
    }
    
    if (includeFinancials) {
        var dennaMzda = getEmployeeAttribute(zamestnanec, CONFIG.attributes.dennaMzda);
        if (dennaMzda && dennaMzda > 0) {
            detail += " (" + utils.formatMoney(dennaMzda) + ")";
        }
    }
    
    return detail + "\n";
}

function findTargetGroup(settings) {
    // Implementácia z Group Summary scriptu
    // ... (skrátené pre prehľadnosť)
    return null; // placeholder
}

// ==============================================
// SPUSTENIE
// ==============================================

main();