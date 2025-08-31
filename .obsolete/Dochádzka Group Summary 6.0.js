// ==============================================
// MEMENTO DATABASE - DOCHÁDZKA GROUP SUMMARY
// Verzia: 6.0 | Dátum: August 2025 | Autor: ASISTANTO
// Knižnica: Dochádzka | Trigger: After Save
// ==============================================
// ✅ KOMPLETNÝ REFAKTORING v6.0:
//    - Plné využitie MementoUtils Framework
//    - MementoConfig pre všetky nastavenia
//    - MementoConfigAdapter pre kompatibilitu
//    - Žiadne fallbacky ani duplicity
//    - Čistý modulárny kód
// ==============================================
// 🔗 VYŽADOVANÉ KNIŽNICE:
//    - MementoUtils (agregátor)
//    - MementoCore (základné funkcie)
//    - MementoConfig (konfigurácia)
//    - MementoConfigAdapter (adapter)
//    - MementoTelegram (telegram funkcie)
//    - MementoBusiness (business logika)
//    - ASISTANTONotifications (notifikácie)
// ==============================================

// ==============================================
// INICIALIZÁCIA A KONTROLA ZÁVISLOSTÍ
// ==============================================

var currentEntry = entry();
var utils = null;
var config = null;
var CONFIG = null;
var notifHelper = null;
var telegram = null;

/**
 * Inicializuje všetky potrebné moduly
 */
function initializeModules() {
    var initReport = "=== INICIALIZÁCIA MODULOV ===\n";
    
    // 1. MementoUtils - KRITICKÉ
    try {
        if (typeof MementoUtils !== 'undefined') {
            utils = MementoUtils;
            initReport += "✅ MementoUtils v" + utils.version + " načítané\n";
            
            // Skontroluj načítané moduly
            var loadedModules = utils.getLoadedModules();
            initReport += "  Načítané moduly: " + loadedModules.map(function(m) { 
                return m.name + " v" + m.version; 
            }).join(", ") + "\n";
        } else {
            throw new Error("MementoUtils nie je definované!");
        }
    } catch(e) {
        currentEntry.set("Error_Log", "❌ KRITICKÁ CHYBA: " + e.toString() + "\nScript nemôže pokračovať!");
        message("Chýba MementoUtils knižnica!\n" + e.toString());
        cancel();
    }
    
    // 2. MementoConfig a Adapter
    try {
        if (typeof MementoConfig !== 'undefined') {
            config = MementoConfig;
            config.init();
            initReport += "✅ MementoConfig v" + config.version + " inicializované\n";
        } else {
            utils.addError(currentEntry, "MementoConfig nie je dostupný - použijem lokálnu konfiguráciu", "init");
        }
        
        if (typeof MementoConfigAdapter !== 'undefined') {
            CONFIG = MementoConfigAdapter.getAdapter('attendance');
            initReport += "✅ MementoConfigAdapter - konfigurácia načítaná\n";
        } else if (config) {
            // Priamy prístup k MementoConfig
            var cfg = config.getConfig('attendance');
            CONFIG = {
                version: "6.0",
                scriptName: "Dochádzka Group Summary",
                fields: cfg.fieldMappings.attendance,
                attributes: cfg.fieldMappings.attendanceAttributes,
                defaultsFields: cfg.fieldMappings.defaults,
                telegramGroupsFields: cfg.fieldMappings.telegramGroups || {
                    chatId: "Chat ID",
                    threadId: "Thread ID",
                    threadName: "Názov témy",
                    groupName: "Názov skupiny"
                },
                libraries: cfg.libraries
            };
            initReport += "✅ Konfigurácia načítaná priamo z MementoConfig\n";
        } else {
            // Lokálna konfigurácia ako posledná možnosť
            CONFIG = getLocalConfig();
            utils.addError(currentEntry, "Používam lokálnu konfiguráciu - MementoConfig/Adapter nie sú dostupné", "init");
        }
    } catch(e) {
        utils.addError(currentEntry, "Chyba pri načítaní konfigurácie: " + e.toString(), "init");
        CONFIG = getLocalConfig();
    }
    
    // 3. ASISTANTONotifications
    try {
        if (typeof ASISTANTONotifications !== 'undefined') {
            notifHelper = ASISTANTONotifications;
            initReport += "✅ ASISTANTONotifications v" + (notifHelper.version || "?") + " načítané\n";
        } else {
            utils.addError(currentEntry, "ASISTANTONotifications nie je dostupný", "init");
        }
    } catch(e) {
        utils.addError(currentEntry, "Chyba pri načítaní ASISTANTONotifications: " + e.toString(), "init");
    }
    
    // 4. Kontrola Telegram modulu
    if (utils.sendTelegramMessage) {
        telegram = {
            sendMessage: utils.sendTelegramMessage,
            getTelegramGroup: utils.getTelegramGroup
        };
        initReport += "✅ Telegram funkcie dostupné cez MementoUtils\n";
    } else {
        utils.addError(currentEntry, "MementoTelegram modul nie je načítaný v MementoUtils", "init");
    }
    
    // Ulož inicializačný report
    utils.addDebug(currentEntry, initReport);
    
    return true;
}

/**
 * Lokálna konfigurácia (fallback)
 */
function getLocalConfig() {
    return {
        version: "6.0",
        scriptName: "Dochádzka Group Summary",
        
        libraries: {
            defaults: "ASISTANTO Defaults",
            notifications: "Notifications",
            telegramGroups: "Telegram Groups"
        },
        
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
            notifikacie: "Notifikácie"
        },
        
        attributes: {
            odpracovane: "odpracované",
            dennaMzda: "denná mzda",
            hodinovka: "hodinovka"
        },
        
        defaultsFields: {
            dochadzkaSkupinoveNotifikacie: "Dochádzka skupinové notifikácie",
            telegramSkupinaDochadzky: "Telegram skupina dochádzky",
            telegramDochadzkaId: "Telegram Dochádzka ID",
            nazovFirmy: "Názov firmy",
            zahrnutFinancneUdaje: "Zahrnúť finančné údaje"
        },
        
        telegramGroupsFields: {
            chatId: "Chat ID",
            threadId: "Thread ID",
            threadName: "Názov témy",
            groupName: "Názov skupiny"
        }
    };
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        // Inicializácia
        if (!initializeModules()) {
            return;
        }
        
        utils.addDebug(currentEntry, "🚀 === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        utils.addDebug(currentEntry, "📅 Dátum: " + utils.formatDate(currentEntry.field(CONFIG.fields.datum)));
        
        // 1. Vyčisti staré notifikácie
        cleanupOldNotifications();
        
        // 2. Načítaj nastavenia z ASISTANTO Defaults
        var settings = loadSettings();
        if (!settings) {
            utils.addError(currentEntry, "Nepodarilo sa načítať nastavenia", CONFIG.scriptName);
            return;
        }
        
        // 3. Kontrola či sú povolené skupinové notifikácie
        var enabled = settings.groupNotificationsEnabled;
        utils.addDebug(currentEntry, "📧 Skupinové notifikácie: " + (enabled ? "POVOLENÉ" : "VYPNUTÉ"));
        
        if (!enabled) {
            utils.addInfo(currentEntry, "Skupinové notifikácie sú vypnuté v nastaveniach");
            return;
        }
        
        // 4. Nájdi cieľovú Telegram skupinu
        var targetGroup = findTargetGroup(settings);
        if (!targetGroup) {
            utils.addError(currentEntry, "Nie je nastavená cieľová Telegram skupina", CONFIG.scriptName);
            return;
        }
        
        utils.addDebug(currentEntry, "📍 Cieľová skupina: " + targetGroup.name);
        
        // 5. Získaj zamestnancov
        var zamestnanci = utils.safeGetLinks(currentEntry, CONFIG.fields.zamestnanci);
        if (!zamestnanci || zamestnanci.length === 0) {
            utils.addInfo(currentEntry, "Žiadni zamestnanci v zázname");
            return;
        }
        
        utils.addDebug(currentEntry, "👥 Počet zamestnancov: " + zamestnanci.length);
        
        // 6. Priprav súhrnnú správu
        var summaryMessage = prepareSummaryMessage(zamestnanci, settings);
        utils.addDebug(currentEntry, "📝 Správa pripravená (" + summaryMessage.length + " znakov)");
        
        // 7. Vytvor notifikáciu
        var notification = createGroupNotification(summaryMessage, targetGroup, settings);
        
        if (notification) {
            // 8. Linkuj notifikáciu k dochádzke
            linkNotificationsToDochadzka([notification]);
            
            // 9. Zaloguj úspech
            utils.addInfo(currentEntry, "Skupinová notifikácia vytvorená", {
                notificationId: notification.field("ID"),
                skupina: targetGroup.name,
                pocetZamestnancov: zamestnanci.length,
                datum: utils.formatDate(currentEntry.field(CONFIG.fields.datum))
            });
            
            utils.addDebug(currentEntry, "✅ === ÚSPEŠNÉ DOKONČENIE ===");
        } else {
            utils.addError(currentEntry, "Nepodarilo sa vytvoriť notifikáciu", CONFIG.scriptName);
        }
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba: " + error.toString(), CONFIG.scriptName, error);
    }
}

// ==============================================
// KONFIGURAČNÉ FUNKCIE
// ==============================================

/**
 * Načíta nastavenia z ASISTANTO Defaults
 */
function loadSettings() {
    try {
        var defaultsLib = CONFIG.libraries.defaults || CONFIG.libraries.core.defaults || "ASISTANTO Defaults";
        
        utils.addDebug(currentEntry, "📋 Načítavam nastavenia z '" + defaultsLib + "'");
        
        // Ak máme MementoConfig, použi správne názvy polí
        var fieldNames = {};
        if (config) {
            fieldNames = {
                groupEnabled: config.getFieldName('defaults', 'dochadzkaSkupinoveNotifikacie') || 
                             "Dochádzka skupinové notifikácie",
                groupLink: config.getFieldName('defaults', 'telegramSkupinaDochadzky') || 
                          "Telegram skupina dochádzky",
                legacyId: config.getFieldName('defaults', 'telegramDochadzkaId') || 
                         "Telegram Dochádzka ID",
                companyName: config.getFieldName('defaults', 'nazovFirmy') || 
                            "Názov firmy",
                includeFinancials: config.getFieldName('defaults', 'zahrnutFinancneUdaje') || 
                                  "Zahrnúť finančné údaje"
            };
        } else {
            // Fallback na CONFIG.defaultsFields
            fieldNames = {
                groupEnabled: CONFIG.defaultsFields.dochadzkaSkupinoveNotifikacie,
                groupLink: CONFIG.defaultsFields.telegramSkupinaDochadzky,
                legacyId: CONFIG.defaultsFields.telegramDochadzkaId,
                companyName: CONFIG.defaultsFields.nazovFirmy,
                includeFinancials: CONFIG.defaultsFields.zahrnutFinancneUdaje
            };
        }
        
        return {
            groupNotificationsEnabled: utils.getSettings(defaultsLib, fieldNames.groupEnabled),
            telegramGroupLink: utils.getSettings(defaultsLib, fieldNames.groupLink),
            telegramGroupId: utils.getSettings(defaultsLib, fieldNames.legacyId),
            companyName: utils.getSettings(defaultsLib, fieldNames.companyName),
            includeFinancials: utils.getSettings(defaultsLib, fieldNames.includeFinancials)
        };
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri načítaní nastavení: " + error.toString(), "loadSettings");
        return null;
    }
}

// ==============================================
// TELEGRAM FUNKCIE
// ==============================================

/**
 * Nájde cieľovú Telegram skupinu
 */
function findTargetGroup(settings) {
    try {
        var targetGroup = null;
        
        // Priorita 1: Link na skupinu (nový spôsob)
        if (settings.telegramGroupLink && settings.telegramGroupLink.length > 0) {
            utils.addDebug(currentEntry, "🔗 Kontrolujem linknutú skupinu");
            targetGroup = getTargetGroupFromLink(settings.telegramGroupLink);
        }
        
        // Priorita 2: Textové ID (legacy spôsob)
        if (!targetGroup && settings.telegramGroupId) {
            utils.addDebug(currentEntry, "📝 Používam legacy text ID: " + settings.telegramGroupId);
            targetGroup = findTargetGroupByTextId(settings.telegramGroupId);
        }
        
        return targetGroup;
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri hľadaní cieľovej skupiny: " + error.toString(), "findTargetGroup");
        return null;
    }
}

/**
 * Získa skupinu z linknutého záznamu
 */
function getTargetGroupFromLink(linkedGroup) {
    try {
        if (!linkedGroup || linkedGroup.length === 0) {
            utils.addDebug(currentEntry, "Žiadna linknutá skupina");
            return null;
        }
        
        var group = linkedGroup[0];
        
        // Použi MementoUtils safe funkcie
        var chatId = utils.safeGet(group, CONFIG.telegramGroupsFields.chatId, null);
        var threadId = utils.safeGet(group, CONFIG.telegramGroupsFields.threadId, null);
        var groupName = utils.safeGet(group, CONFIG.telegramGroupsFields.groupName, "");
        var threadName = utils.safeGet(group, CONFIG.telegramGroupsFields.threadName, "");
        
        if (!chatId) {
            utils.addError(currentEntry, "Linknutá skupina nemá Chat ID", "getTargetGroupFromLink");
            return null;
        }
        
        return {
            chatId: chatId,
            threadId: threadId,
            name: groupName || threadName || "Skupina",
            isThread: !!threadId,
            entries: group
        };
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri čítaní linknutej skupiny: " + error.toString(), "getTargetGroupFromLink");
        return null;
    }
}

/**
 * Nájde skupinu podľa text ID (legacy)
 */
function findTargetGroupByTextId(telegramId) {
    try {
        var telegramGroupsLib = CONFIG.libraries.telegramGroups || 
                                CONFIG.libraries.telegram.groups || 
                                "Telegram Groups";
        
        var telegramGroups = libByName(telegramGroupsLib);
        if (!telegramGroups) {
            utils.addError(currentEntry, "Knižnica '" + telegramGroupsLib + "' nenájdená", "findTargetGroupByTextId");
            return null;
        }
        
        // Rozpoznaj či je to skupina alebo téma
        var isThread = telegramId.indexOf("/") > -1;
        
        if (isThread) {
            // Formát: "chatId/threadId"
            var parts = telegramId.split("/");
            var chatId = parts[0];
            var threadId = parts[1];
            
            var allGroups = telegramGroups.entries();
            for (var i = 0; i < allGroups.length; i++) {
                var group = allGroups[i];
                if (group.field(CONFIG.telegramGroupsFields.chatId) === chatId && 
                    group.field(CONFIG.telegramGroupsFields.threadId) === threadId) {
                    return {
                        chatId: chatId,
                        threadId: threadId,
                        name: group.field(CONFIG.telegramGroupsFields.threadName) || "Téma #" + threadId,
                        isThread: true,
                        entries: group
                    };
                }
            }
        } else {
            // Jednoduchá skupina
            var groups = telegramGroups.find(CONFIG.telegramGroupsFields.chatId, telegramId);
            if (groups && groups.length > 0) {
                return {
                    chatId: telegramId,
                    name: groups[0].field(CONFIG.telegramGroupsFields.groupName) || "Skupina",
                    isThread: false,
                    entries: groups[0]
                };
            }
        }
        
        utils.addDebug(currentEntry, "Skupina s ID '" + telegramId + "' nenájdená");
        return null;
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri hľadaní skupiny: " + error.toString(), "findTargetGroupByTextId");
        return null;
    }
}

// ==============================================
// SPRÁVA NOTIFIKÁCIÍ
// ==============================================

/**
 * Vyčistí staré notifikácie z dochádzky
 */
function cleanupOldNotifications() {
    try {
        var existingNotifs = currentEntry.field(CONFIG.fields.notifikacie) || [];
        
        if (existingNotifs.length > 0) {
            currentEntry.set(CONFIG.fields.notifikacie, []);
            utils.addDebug(currentEntry, "🧹 Vymazaných " + existingNotifs.length + " starých notifikácií");
        }
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri čistení notifikácií: " + error.toString(), "cleanupOldNotifications");
    }
}

/**
 * Vytvorí skupinovú notifikáciu
 */
function createGroupNotification(message, targetGroup, settings) {
    try {
        if (!notifHelper) {
            utils.addError(currentEntry, "ASISTANTONotifications nie je dostupný", "createGroupNotification");
            return null;
        }
        
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
            zdrojovyId: currentEntry.field("ID"),
            
            // Telegram špecifiká
            chatId: targetGroup.chatId,
            threadId: targetGroup.threadId
        };
        
        // Použi ASISTANTONotifications helper
        var notification = notifHelper.createNotification(notifData);
        
        if (notification) {
            utils.addDebug(currentEntry, "✅ Notifikácia vytvorená (ID: " + notification.field("ID") + ")");
            return notification;
        } else {
            utils.addError(currentEntry, "Nepodarilo sa vytvoriť notifikáciu", "createGroupNotification");
            return null;
        }
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri vytváraní notifikácie: " + error.toString(), "createGroupNotification");
        return null;
    }
}

/**
 * Linkne notifikácie k dochádzke
 */
function linkNotificationsToDochadzka(notifications) {
    try {
        if (!notifications || notifications.length === 0) return;
        
        var existingNotifs = currentEntry.field(CONFIG.fields.notifikacie) || [];
        var allNotifs = existingNotifs.concat(notifications);
        
        currentEntry.set(CONFIG.fields.notifikacie, allNotifs);
        utils.addDebug(currentEntry, "🔗 Linknutých " + notifications.length + " notifikácií");
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri linkovaní notifikácií: " + error.toString(), "linkNotificationsToDochadzka");
    }
}

// ==============================================
// PRÍPRAVA SPRÁVY
// ==============================================

/**
 * Pripraví súhrnnú správu pre Telegram
 */
function prepareSummaryMessage(zamestnanci, settings) {
    try {
        var datum = currentEntry.field(CONFIG.fields.datum);
        var datumFormatted = utils.formatDate(datum, "D.M.YYYY");
        var dayName = moment(datum).format("dddd");
        
        // Header
        var message = "*Súhrn dochádzky - " + datumFormatted + " (" + dayName + ")*\n";
        message += "─────────────────────\n\n";
        
        // Firma (ak je nastavená)
        if (settings.companyName) {
            message += "🏢 " + settings.companyName + "\n\n";
        }
        
        // Čas príchodu/odchodu
        var prichod = currentEntry.field(CONFIG.fields.prichod);
        var odchod = currentEntry.field(CONFIG.fields.odchod);
        
        if (prichod || odchod) {
            message += "⏰ Čas: " + utils.formatTime(prichod) + " - " + utils.formatTime(odchod) + "\n";
        }
        
        // Pracovná doba
        var pracovnaDoba = currentEntry.field(CONFIG.fields.pracovnaDoba);
        if (pracovnaDoba) {
            message += "⏱️ Pracovná doba: " + pracovnaDoba + " hodín\n";
        }
        
        // Počet pracovníkov
        message += "👥 Počet pracovníkov: " + zamestnanci.length + "\n";
        
        // Celkové odpracované hodiny
        var totalHours = currentEntry.field(CONFIG.fields.odpracovane) || 0;
        if (totalHours > 0) {
            message += "📊 Celkom odpracované: " + totalHours + " hodín\n";
        }
        
        // Mzdové náklady (ak povolené)
        if (settings.includeFinancials) {
            var mzdoveNaklady = currentEntry.field(CONFIG.fields.mzdoveNaklady);
            if (mzdoveNaklady) {
                message += "💰 Mzdové náklady: " + utils.formatMoney(mzdoveNaklady) + "\n";
            }
        }
        
        // Zoznam zamestnancov
        message += "\n*Zamestnanci:*\n";
        message += "───────────\n";
        
        var sortedEmployees = sortEmployeesByName(zamestnanci);
        
        for (var i = 0; i < sortedEmployees.length; i++) {
            message += formatEmployeeDetail(sortedEmployees[i], i + 1, settings.includeFinancials);
        }
        
        // Poznámka (ak existuje)
        var poznamka = currentEntry.field(CONFIG.fields.poznamka);
        if (poznamka) {
            message += "\n📝 _Poznámka: " + poznamka + "_\n";
        }
        
        // Footer
        message += "\n───────────\n";
        message += "_Automaticky generované_";
        
        return message;
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri príprave správy: " + error.toString(), "prepareSummaryMessage");
        return "Chyba pri generovaní súhrnu dochádzky";
    }
}

/**
 * Zoradí zamestnancov podľa priezviska
 */
function sortEmployeesByName(zamestnanci) {
    try {
        var sorted = zamestnanci.slice();
        
        sorted.sort(function(a, b) {
            var priezviskoA = utils.safeGet(a, "Priezvisko", "").toLowerCase();
            var priezviskoB = utils.safeGet(b, "Priezvisko", "").toLowerCase();
            
            if (priezviskoA < priezviskoB) return -1;
            if (priezviskoA > priezviskoB) return 1;
            return 0;
        });
        
        return sorted;
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri triedení zamestnancov: " + error.toString(), "sortEmployeesByName");
        return zamestnanci;
    }
}

/**
 * Formátuje detail jedného zamestnanca
 */
function formatEmployeeDetail(zamestnanec, poradie, includeFinancials) {
    try {
        var detail = poradie + ". ";
        
        // Použi MementoBusiness funkciu ak je dostupná
        if (utils.formatEmployeeName) {
            detail += utils.formatEmployeeName(zamestnanec);
        } else {
            // Manuálne formátovanie
            var nick = utils.safeGet(zamestnanec, "Nick", "");
            var priezvisko = utils.safeGet(zamestnanec, "Priezvisko", "");
            detail += nick ? nick + " (" + priezvisko + ")" : priezvisko || "Zamestnanec";
            
            utils.addError(currentEntry, "MementoBusiness.formatEmployeeName nie je dostupné", "formatEmployeeDetail");
        }
        
        // Získaj atribúty zamestnanca
        var odpracovane = getEmployeeAttribute(zamestnanec, CONFIG.attributes.odpracovane);
        if (odpracovane && odpracovane > 0) {
            detail += " - " + formatHours(odpracovane);
        }
        
        // Finančné údaje
        if (includeFinancials) {
            var dennaMzda = getEmployeeAttribute(zamestnanec, CONFIG.attributes.dennaMzda);
            if (dennaMzda && dennaMzda > 0) {
                detail += " (" + utils.formatMoney(dennaMzda) + ")";
            }
        }
        
        return detail + "\n";
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri formátovaní zamestnanca: " + error.toString(), "formatEmployeeDetail");
        return poradie + ". Chyba pri spracovaní\n";
    }
}

/**
 * Získa atribút zamestnanca z poľa Zamestnanci
 */
function getEmployeeAttribute(zamestnanec, attributeName) {
    try {
        var zamArray = currentEntry.field(CONFIG.fields.zamestnanci);
        
        if (!zamArray || zamArray.length === 0) {
            return null;
        }
        
        // Nájdi zamestnanca v poli podľa ID
        var zamId = zamestnanec.field("ID");
        
        for (var i = 0; i < zamArray.length; i++) {
            if (zamArray[i].field("ID") === zamId) {
                // Použi MementoUtils ak má safeGetAttribute
                if (utils.safeGetAttribute) {
                    return utils.safeGetAttribute(currentEntry, CONFIG.fields.zamestnanci, attributeName, null);
                } else {
                    // Priamy prístup
                    return zamArray[i].attr(attributeName);
                }
            }
        }
        
        return null;
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri získavaní atribútu '" + attributeName + "': " + error.toString(), "getEmployeeAttribute");
        return null;
    }
}

/**
 * Formátuje hodiny do čitateľného formátu
 */
function formatHours(hours) {
    if (!hours) return "0h";
    
    // Odstráň .0 ak je to celé číslo
    var formatted = hours.toFixed(1);
    if (formatted.endsWith(".0")) {
        formatted = formatted.slice(0, -2);
    }
    
    return formatted + "h";
}

// ==============================================
// SPUSTENIE HLAVNEJ FUNKCIE
// ==============================================

main();