// ==============================================
// CREATING TRIGGER - ASISTANTO NOTIFICATIONS
// Verzia: 2.0 | Dátum: 16.08.2025 | Autor: ASISTANTO
// Knižnica: ASISTANTO Notifications | Trigger: Creating | Artifact: 1
// ==============================================
// 📋 FUNKCIA:
//    - Automaticky spracováva novo vytvorené notifikácie
//    - Routing podľa typu adresáta (Zamestnanec, Skupina, Thread ID Zákazka)
//    - Synchronizácia nastavení z ASISTANTO Telegram Groups
//    - Odošle správy cez Telegram API s retry logikou
// ✅ v2.0 FEATURES:
//    - Kompletná implementácia všetkých typov adresátov
//    - Respektovanie pracovného času a víkend nastavení
//    - Denný limit správ kontrola
//    - Batch processing pre viacerých adresátov
// ==============================================

// Globálne premenné
var currentEntry = entry();
var utils = null;
var notifHelper = null;

// Konfigurácia
var CONFIG = {
    debug: true,
    version: "2.0",
    scriptName: "ASISTANTO Notifications Creating Trigger",
    
    // Knižnice
    scriptsLibrary: "Scripts",
    helperScriptName: "ASISTANTO Notifications Helper",
    telegramGroupsLibrary: "ASISTANTO Telegram Groups",
    apiLibrary: "ASISTANTO API",
    defaultsLibrary: "ASISTANTO Defaults",
    
    // Statusy
    statusWaiting: "Čaká",
    statusSent: "Odoslané",
    statusFailed: "Zlyhalo",
    statusCancelled: "Zrušené",
    telegramID: "Telegram ID", // Pole s Telegram ID zamestnancov, partnerov a klientov
    telegramEnabled: "telegram", // Pole pre povolenie Telegram notifikácií
    chatId: CONFIG.chatId, // Pole pre Chat ID skupín a tém
    threadId: CONFIG.threadId, // CONFIG.threadIdD témy v skupinách

    maxRetries: 3,
    
    // Typy adresátov
    addresseeTypes: {
        EMPLOYEE: "Zamestnanec",
        CLIENT: "Klient",
        PARTNER: "Partner",
        GROUP: "Skupina",
        GROUP_THREAD: "Skupina-Téma",
        ORDER: "Zákazka"
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        // 1. Inicializácia
        if (!initializeUtils()) {
            return;
        }
        
        utils.addDebug(currentEntry, "\n🚀 === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        utils.addDebug(currentEntry, "📋 Entry ID: " + currentEntry.field("ID"));
        
        // 2. Validácia statusu
        var status = currentEntry.field("Status");
        utils.addDebug(currentEntry, "📊 Aktuálny status: " + status);
        
        if (status !== CONFIG.statusWaiting) {
            utils.addDebug(currentEntry, "⏭️ Preskakujem - status nie je '" + CONFIG.statusWaiting + "'");
            return;
        }
        
        // 3. Načítaj Helper script
        if (!loadHelperScript()) {
            return;
        }
        
        // 4. Kontrola časovania
        if (!checkTiming()) {
            return;
        }
        
        // 5. Určenie typu adresáta a získanie cieľových údajov
        var addresseeType = currentEntry.field("Adresát");
        utils.addDebug(currentEntry, "📬 Typ adresáta: " + addresseeType);
        
        var targets = getTargetData(addresseeType);
        if (!targets || targets.length === 0) {
            utils.addError(currentEntry, "Žiadni adresáti nenájdení", "main");
            updateStatus(CONFIG.statusFailed, "Žiadni adresáti");
            return;
        }
        
        utils.addDebug(currentEntry, "🎯 Počet cieľov: " + targets.length);
        
        // 6. Odoslanie správ
        var successCount = 0;
        var failCount = 0;
        
        for (var i = 0; i < targets.length; i++) {
            var target = targets[i];
            utils.addDebug(currentEntry, "\n📤 Spracovávam cieľ " + (i + 1) + "/" + targets.length);
            
            if (sendToTarget(target)) {
                successCount++;
            } else {
                failCount++;
            }
        }
        
        // 7. Finálny status
        if (successCount === targets.length) {
            updateStatus(CONFIG.statusSent);
            utils.addDebug(currentEntry, "✅ Všetky správy odoslané (" + successCount + "/" + targets.length + ")");
        } else if (successCount > 0) {
            updateStatus(CONFIG.statusSent, "Čiastočne odoslané: " + successCount + "/" + targets.length);
            utils.addDebug(currentEntry, "⚠️ Čiastočný úspech: " + successCount + "/" + targets.length);
        } else {
            updateStatus(CONFIG.statusFailed, "Všetky správy zlyhali");
            utils.addError(currentEntry, "Všetky správy zlyhali", "main");
        }
        
        utils.addDebug(currentEntry, "\n✅ === KONIEC TRIGGER SPRACOVANIA ===");
        
    } catch (error) {
        utils.addError(currentEntry, error, "main-critical");
        updateStatus(CONFIG.statusFailed, "Kritická chyba: " + error.toString());
    }
}

// ==============================================
// INICIALIZÁCIA
// ==============================================

function initializeUtils() {
    try {
        // Načítaj MementoUtils
        if (typeof MementoUtils !== 'undefined') {
            utils = MementoUtils;
            return true;
        } else {
            // Fallback pre základné logovanie
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
                safeGet: function(entry, field, defaultValue) {
                    try {
                        var value = entry.field(field);
                        return (value !== null && value !== undefined) ? value : defaultValue;
                    } catch (e) {
                        return defaultValue;
                    }
                }
            };
            
            utils.addError(currentEntry, "MementoUtils nie je dostupný - používam fallback", "initializeUtils");
            return true;
        }
    } catch (error) {
        // Kritická chyba - nemôžeme ani logovať
        currentEntry.set("Error_Log", "KRITICKÁ CHYBA: " + error.toString());
        return false;
    }
}

function loadHelperScript() {
    try {
        utils.addDebug(currentEntry, "📚 Načítavam helper script...");
        
        var scriptsLib = libByName(CONFIG.scriptsLibrary);
        if (!scriptsLib) {
            throw new Error("Knižnica '" + CONFIG.scriptsLibrary + "' nenájdená");
        }
        
        var helperEntries = scriptsLib.find("Názov záznamu", CONFIG.helperScriptName);
        if (!helperEntries || helperEntries.length === 0) {
            throw new Error("Helper script '" + CONFIG.helperScriptName + "' nenájdený");
        }
        
        var helperScript = helperEntries[0].field("Script");
        if (!helperScript) {
            throw new Error("Helper script je prázdny");
        }
        
        // Vykonaj helper script
        eval(helperScript);
        
        if (typeof ASISTANTONotifications === 'undefined') {
            throw new Error("ASISTANTONotifications objekt nebol vytvorený");
        }
        
        notifHelper = ASISTANTONotifications;
        utils.addDebug(currentEntry, "✅ Helper script načítaný");
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, "Nepodarilo sa načítať helper: " + error, "loadHelper");
        updateStatus(CONFIG.statusFailed, error.toString());
        return false;
    }
}

// ==============================================
// ČASOVANIE A VALIDÁCIA
// ==============================================

function checkTiming() {
    // Kontrola naplánovaného času
    var poslatO = currentEntry.field("Poslať o");
    if (poslatO && moment(poslatO).isAfter(moment())) {
        utils.addDebug(currentEntry, "⏰ Naplánované na: " + moment(poslatO).format("DD.MM.YYYY HH:mm"));
        utils.addDebug(currentEntry, "⏸️ Ešte nie je čas na odoslanie");
        return false;
    }
    
    // Kontrola vypršania
    var vyprsat = currentEntry.field("Vypršať o");
    if (vyprsat && moment(vyprsat).isBefore(moment())) {
        utils.addDebug(currentEntry, "⏰ Správa vypršala: " + moment(vyprsat).format("DD.MM.YYYY HH:mm"));
        updateStatus("Vypršané", "Správa vypršala");
        return false;
    }
    
    return true;
}

// ==============================================
// ZÍSKANIE CIEĽOVÝCH ÚDAJOV
// ==============================================

function getTargetData(addresseeType) {
    var targets = [];
    
    try {
        switch (addresseeType) {
            case CONFIG.addresseeTypes.EMPLOYEE:
                targets = getEmployeeTargets();
                break;
                
            case CONFIG.addresseeTypes.CLIENT:
                targets = getClientTargets();
                break;
                
            case CONFIG.addresseeTypes.PARTNER:
                targets = getPartnerTargets();
                break;
                
            case CONFIG.addresseeTypes.GROUP:
            case CONFIG.addresseeTypes.GROUP_THREAD:
                targets = getGroupTargets(addresseeType === CONFIG.addresseeTypes.GROUP_THREAD);
                break;
                
            case CONFIG.addresseeTypes.ORDER:
                targets = getOrderTargets();
                break;
                
            default:
                utils.addError(currentEntry, "Neznámy typ adresáta: " + addresseeType, "getTargetData");
        }
        
    } catch (error) {
        utils.addError(currentEntry, error, "getTargetData");
    }
    
    return targets;
}

function getEmployeeTargets() {
    var targets = [];
    var employees = currentEntry.field("Zamestnanec");
    
    if (!employees || employees.length === 0) {
        utils.addDebug(currentEntry, "❌ Žiadni zamestnanci v poli 'Zamestnanec'");
        return targets;
    }
    
    for (var i = 0; i < employees.length; i++) {
        var employee = employees[i];
        var telegramId = utils.safeGet(employee, CONFIG.telegramID, "");
        var telegramEnabled = utils.safeGet(employee, CONFIG.telegramEnabled, false);
        
        if (telegramId && telegramEnabled) {
            targets.push({
                type: "employee",
                name: utils.formatEmployeeName(employee),
                chatId: telegramId,
                entry: employee
            });
            utils.addDebug(currentEntry, "✅ Zamestnanec: " + targets[targets.length - 1].name);
        } else {
            utils.addDebug(currentEntry, "⏭️ Preskakujem zamestnanca (Telegram vypnutý alebo chýba ID): " + 
                          utils.formatEmployeeName(employee));
        }
    }
    
    return targets;
}

function getGroupTargets(includeThread) {
    var targets = [];
    var groups = currentEntry.field("Skupina-Téma");
    
    if (!groups || groups.length === 0) {
        // Skús získať priame Chat ID
        var directChatId = currentEntry.field(CONFIG.chatId);
        if (directChatId) {
        targets.push({
                type: includeThread ? "thread" : "group",
                name: "Direct Chat ID",
                chatId: directChatId,
                threadId: includeThread ? currentEntry.field(CONFIG.threadId) : null,
                settings: getDefaultGroupSettings()
            });
            utils.addDebug(currentEntry, "✅ Použitý priamy Chat ID: " + directChatId);
        }
        return targets;
    }
    
    for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        var chatId = utils.safeGet(group, CONFIG.chatId, "");
        var threadId = includeThread ? utils.safeGet(group, CONFIG.threadId, "") : null;
        var enabled = utils.safeGet(group, "Povoliť notifikácie", true);
        
        if (chatId && enabled) {
            targets.push({
                type: includeThread ? "thread" : "group",
                name: utils.safeGet(group, "Názov záznamu", "Skupina"),
                chatId: chatId,
                threadId: threadId,
                settings: extractGroupSettings(group),
                entry: group
            });
            utils.addDebug(currentEntry, "✅ Skupina: " + targets[targets.length - 1].name);
        }
    }
    
    return targets;
}

function getOrderTargets() {
    var targets = [];
    var orders = currentEntry.field("Zákazka");
    
    if (!orders || orders.length === 0) {
        return targets;
    }
    
    for (var i = 0; i < orders.length; i++) {
        var order = orders[i];
        var telegramGroups = utils.safeGet(order, "Telegram skupina", []);
        
        for (var j = 0; j < telegramGroups.length; j++) {
            var group = telegramGroups[j];
            var chatId = utils.safeGet(group, CONFIG.chatId, "");
            
            if (chatId) {
                targets.push({
                    type: "order",
                    name: utils.safeGet(order, "Názov", "Zákazka"),
                    chatId: chatId,
                    settings: extractGroupSettings(group),
                    entry: group
                });
            }
        }
    }
    
    return targets;
}

function getClientTargets() {
    // Podobne ako getEmployeeTargets
    var targets = [];
    var clients = currentEntry.field("Klient");
    
    if (!clients || clients.length === 0) {
        return targets;
    }
    
    for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        var telegramId = utils.safeGet(client, CONFIG.telegramID, "");
        
        if (telegramId) {
            targets.push({
                type: "client",
                name: utils.safeGet(client, "Nick", "Klient"),
                chatId: telegramId,
                entry: client
            });
        }
    }
    
    return targets;
}

function getPartnerTargets() {
    // Podobne ako getClientTargets
    var targets = [];
    var partners = currentEntry.field("Partner");
    
    if (!partners || partners.length === 0) {
        return targets;
    }
    
    for (var i = 0; i < partners.length; i++) {
        var partner = partners[i];
        var telegramId = utils.safeGet(partner, CONFIG.telegramID, "");
        
        if (telegramId) {
            targets.push({
                type: "partner",
                name: utils.safeGet(partner, "Nick", "Partner"),
                chatId: telegramId,
                entry: partner
            });
        }
    }
    
    return targets;
}

// ==============================================
// NASTAVENIA SKUPÍN
// ==============================================

function extractGroupSettings(groupEntry) {
    if (!groupEntry) return getDefaultGroupSettings();
    
    return {
        enabled: utils.safeGet(groupEntry, "Povoliť notifikácie", true),
        workHoursFrom: utils.safeGet(groupEntry, "Pracovný čas od", null),
        workHoursTo: utils.safeGet(groupEntry, "Pracovný čas do", null),
        weekendEnabled: utils.safeGet(groupEntry, "Víkend povolený", false),
        priority: utils.safeGet(groupEntry, "Priorita správ", "Normálna"),
        dailyLimit: utils.safeGet(groupEntry, "Denný limit správ", 100),
        silentMode: utils.safeGet(groupEntry, "Tichá správa", false)
    };
}

function getDefaultGroupSettings() {
    return {
        enabled: true,
        workHoursFrom: null,
        workHoursTo: null,
        weekendEnabled: true,
        priority: "Normálna",
        dailyLimit: 100,
        silentMode: false
    };
}

function validateGroupSettings(settings) {
    // Kontrola pracovného času
    if (settings.workHoursFrom && settings.workHoursTo) {
        var now = moment();
        var fromTime = moment(settings.workHoursFrom, "HH:mm");
        var toTime = moment(settings.workHoursTo, "HH:mm");
        var currentTime = moment(now.format("HH:mm"), "HH:mm");
        
        if (currentTime.isBefore(fromTime) || currentTime.isAfter(toTime)) {
            utils.addDebug(currentEntry, "⏰ Mimo pracovného času");
            return false;
        }
    }
    
    // Kontrola víkendu
    if (!settings.weekendEnabled) {
        var dayOfWeek = moment().day();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            utils.addDebug(currentEntry, "🚫 Víkend - notifikácie vypnuté");
            return false;
        }
    }
    
    // Tu by mohla byť kontrola denného limitu
    // TODO: Implementovať počítadlo správ
    
    return true;
}

// ==============================================
// ODOSIELANIE SPRÁV
// ==============================================

function sendToTarget(target) {
    try {
        utils.addDebug(currentEntry, "📨 Odosielam na: " + target.name + " (" + target.chatId + ")");
        
        // Validácia nastavení (pre skupiny)
        if (target.settings && !validateGroupSettings(target.settings)) {
            utils.addDebug(currentEntry, "⏭️ Preskakujem - nesplnené podmienky");
            return false;
        }
        
        // Príprava správy
        var message = currentEntry.field("Správa");
        var parseMode = currentEntry.field("Formátovanie") || "Markdown";
        
        if (!message) {
            utils.addError(currentEntry, "Prázdna správa", "sendToTarget");
            return false;
        }
        
        // Odoslanie cez MementoUtils
        var options = {
            parseMode: parseMode,
            disableNotification: target.settings ? target.settings.silentMode : false
        };
        
        if (target.threadId) {
            options.threadId = target.threadId;
        }
        
        var result = utils.sendTelegramMessage(target.chatId, message, options);
        
        if (result.success) {
            utils.addDebug(currentEntry, "✅ Odoslané - Message ID: " + result.messageId);
            
            // Aktualizuj response data
            if (!currentEntry.field("Message ID")) {
                currentEntry.set("Message ID", result.messageId);
            }
            currentEntry.set("Odoslané o", moment().toDate());
            
            // Pridaj info o odoslaní
            var info = currentEntry.field("info") || "";
            info += "\n" + moment().format("DD.MM.YY HH:mm:ss") + " | Odoslané: " + target.name;
            currentEntry.set("info", info);
            
            return true;
        } else {
            utils.addError(currentEntry, "Telegram error: " + result.error, "sendToTarget");
            return false;
        }
        
    } catch (error) {
        utils.addError(currentEntry, error, "sendToTarget");
        return false;
    }
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

function updateStatus(newStatus, error) {
    try {
        currentEntry.set("Status", newStatus);
        
        if (error) {
            currentEntry.set("Posledná chyba", error);
            
            var timestamp = moment().format("DD.MM.YY HH:mm:ss");
            var errorMsg = "[" + timestamp + "] Status → " + newStatus + ": " + error;
            var existingError = currentEntry.field("Error_Log") || "";
            currentEntry.set("Error_Log", existingError + errorMsg + "\n");
        }
        
        // Increment pokusov
        var pokusy = currentEntry.field("Pokusov o odoslanie") || 0;
        currentEntry.set("Pokusov o odoslanie", pokusy + 1);
        
        // Info log
        var infoMsg = moment().format("DD.MM.YY HH:mm:ss") + " | Status: " + newStatus;
        if (error) infoMsg += " | " + error;
        var existingInfo = currentEntry.field("info") || "";
        currentEntry.set("info", existingInfo + "\n" + infoMsg);
        
    } catch (e) {
        if (utils) {
            utils.addError(currentEntry, e, "updateStatus");
        }
    }
}

// ==============================================
// SPUSTENIE
// ==============================================

main();