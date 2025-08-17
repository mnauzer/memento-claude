// ==============================================
// CREATING TRIGGER - ASISTANTO NOTIFICATIONS
// Verzia: 2.1 | Dátum: 16.08.2025 | Autor: ASISTANTO
// Knižnica: ASISTANTO Notifications | Trigger: Creating | Artifact: 2
// ==============================================
// 📋 FUNKCIA:
//    - Automaticky spracováva novo vytvorené notifikácie
//    - Routing podľa typu adresáta (Zamestnanec, Skupina, Téma, Zákazka)
//    - Synchronizácia nastavení z ASISTANTO Telegram Groups
//    - Odošle správy cez Telegram API s retry logikou
// ✅ v2.1 ZMENY:
//    - Odstránené načítavanie Helper scriptu
//    - Implementovaná kontrola denného limitu
//    - Pridaný retry mechanizmus
//    - Podpora pre opakovanie správ
//    - Podpora pre prílohy (základná)
// ==============================================

// Globálne premenné
var currentEntry = entry();
var utils = MementoUtils;
var notifHelper = ASISTANTONotifications;

// Konfigurácia
var CONFIG = {
    debug: true,
    version: "2.1",
    scriptName: "ASISTANTO Notifications Creating Trigger",
    
    // Knižnice
    telegramGroupsLibrary: "ASISTANTO Telegram Groups",
    apiLibrary: "ASISTANTO API",
    defaultsLibrary: "ASISTANTO Defaults",
    
    // Statusy
    statusWaiting: "Čaká",
    statusSent: "Odoslané",
    statusFailed: "Zlyhalo",
    statusCancelled: "Zrušené",
    statusScheduled: "Naplánované",
    statusExpired: "Vypršané",
    
    // Max pokusov
    maxRetries: 3,
    retryDelayMs: [1000, 5000, 15000], // 1s, 5s, 15s
    
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
        utils.addDebug(currentEntry, "\n🚀 === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        utils.addDebug(currentEntry, "📋 Entry ID: " + currentEntry.field("ID"));
        
        // 1. Validácia statusu
        var status = currentEntry.field("Status");
        utils.addDebug(currentEntry, "📊 Aktuálny status: " + status);
        
        if (status !== CONFIG.statusWaiting) {
            utils.addDebug(currentEntry, "⏭️ Preskakujem - status nie je '" + CONFIG.statusWaiting + "'");
            return;
        }
        
        // 2. Kontrola retry
        if (!checkRetryTiming()) {
            utils.addDebug(currentEntry, "⏳ Čakám na retry...");
            return;
        }
        
        // 3. Kontrola časovania
        if (!checkTiming()) {
            return;
        }
        
        // 4. Kontrola opakovania
        if (checkRepetition()) {
            createNextRepetition();
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
        var skippedCount = 0;
        
        for (var i = 0; i < targets.length; i++) {
            var target = targets[i];
            utils.addDebug(currentEntry, "\n📤 Spracovávam cieľ " + (i + 1) + "/" + targets.length);
            
            // Kontrola denného limitu
            if (!checkDailyLimit(target)) {
                skippedCount++;
                continue;
            }
            
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
        } else if (skippedCount === targets.length) {
            utils.addDebug(currentEntry, "⏭️ Všetky správy preskočené (limity)");
            // Zostáva status "Čaká" pre neskorší pokus
        } else {
            // Ak všetky zlyhali a máme ešte pokusy, nastavíme retry
            var retryCount = currentEntry.field("Retry Count") || 0;
            if (retryCount < CONFIG.maxRetries - 1) {
                scheduleRetry(retryCount + 1);
            } else {
                updateStatus(CONFIG.statusFailed, "Všetky správy zlyhali po " + CONFIG.maxRetries + " pokusoch");
                utils.addError(currentEntry, "Všetky správy zlyhali", "main");
            }
        }
        
        utils.addDebug(currentEntry, "\n✅ === KONIEC TRIGGER SPRACOVANIA ===");
        
    } catch (error) {
        utils.addError(currentEntry, error, "main-critical");
        updateStatus(CONFIG.statusFailed, "Kritická chyba: " + error.toString());
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
        updateStatus(CONFIG.statusScheduled);
        return false;
    }
    
    // Kontrola vypršania
    var vyprsat = currentEntry.field("Vypršať o");
    if (vyprsat && moment(vyprsat).isBefore(moment())) {
        utils.addDebug(currentEntry, "⏰ Správa vypršala: " + moment(vyprsat).format("DD.MM.YYYY HH:mm"));
        updateStatus(CONFIG.statusExpired, "Správa vypršala");
        return false;
    }
    
    return true;
}

function checkRetryTiming() {
    var retryAfter = currentEntry.field("Retry After");
    if (retryAfter && moment(retryAfter).isAfter(moment())) {
        return false;
    }
    return true;
}

function scheduleRetry(retryCount) {
    var delay = CONFIG.retryDelayMs[Math.min(retryCount - 1, CONFIG.retryDelayMs.length - 1)];
    currentEntry.set("Retry Count", retryCount);
    currentEntry.set("Retry After", moment().add(delay, 'ms').toDate());
    
    utils.addDebug(currentEntry, "🔄 Naplánovaný retry #" + retryCount + " o " + 
                  moment().add(delay, 'ms').format("HH:mm:ss"));
    
    // Pridaj info
    var info = currentEntry.field("info") || "";
    info += "\n" + moment().format("YYYY-MM-DD HH:mm:ss") + " | Retry #" + retryCount + " naplánovaný";
    currentEntry.set("info", info);
}

function checkRepetition() {
    var opakovat = currentEntry.field("Opakovať");
    return opakovat && opakovat !== "Nie";
}

function createNextRepetition() {
    try {
        var opakovat = currentEntry.field("Opakovať");
        var nextDate = moment();
        
        switch (opakovat) {
            case "Každý deň":
                nextDate.add(1, 'day');
                break;
            case "Každý týždeň":
                nextDate.add(1, 'week');
                break;
            case "Každý mesiac":
                nextDate.add(1, 'month');
                break;
            default:
                return;
        }
        
        // Vytvor kópiu pre ďalšie opakovanie
        var notifData = {
            typSpravy: currentEntry.field("Typ správy"),
            zdrojSpravy: currentEntry.field("Zdroj správy"),
            predmet: currentEntry.field("Predmet"),
            sprava: currentEntry.field("Správa"),
            formatovanie: currentEntry.field("Formátovanie"),
            priorita: currentEntry.field("Priorita"),
            adresat: currentEntry.field("Adresát"),
            poslatO: nextDate.toDate(),
            opakovat: opakovat,
            
            // Linknuté záznamy
            zamestnanec: currentEntry.field("Zamestnanec"),
            klient: currentEntry.field("Klient"),
            partner: currentEntry.field("Partner"),
            skupinaTema: currentEntry.field("Skupina/Téma"),
            zakazka: currentEntry.field("Zákazka")
        };
        
        var nextNotif = notifHelper.createNotificationOnly(notifData);
        if (nextNotif) {
            utils.addDebug(currentEntry, "📅 Vytvorené ďalšie opakovanie na: " + nextDate.format("DD.MM.YYYY HH:mm"));
        }
        
    } catch (error) {
        utils.addError(currentEntry, error, "createNextRepetition");
    }
}

// ==============================================
// KONTROLA DENNÉHO LIMITU
// ==============================================

function checkDailyLimit(target) {
    if (!target.settings || !target.settings.dailyLimit) return true;
    
    try {
        var today = moment().startOf('day');
        var notifLib = lib();
        
        // Nájdi všetky dnešné odoslané správy pre tento chat
        var sentToday = notifLib.entries().filter(function(e) {
            var chatId = e.field("Chat ID");
            var sentDate = e.field("Odoslané o");
            var status = e.field("Status");
            
            return chatId === target.chatId &&
                   status === CONFIG.statusSent &&
                   sentDate && moment(sentDate).isSameOrAfter(today);
        });
        
        if (sentToday.length >= target.settings.dailyLimit) {
            utils.addDebug(currentEntry, "📊 Prekročený denný limit: " + 
                          sentToday.length + "/" + target.settings.dailyLimit);
            
            // Pridaj info
            var info = currentEntry.field("info") || "";
            info += "\n" + moment().format("YYYY-MM-DD HH:mm:ss") + 
                   " | Preskočené - denný limit pre " + target.name;
            currentEntry.set("info", info);
            
            return false;
        }
        
        utils.addDebug(currentEntry, "📊 Denný limit OK: " + 
                      sentToday.length + "/" + target.settings.dailyLimit);
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, error, "checkDailyLimit");
        return true; // Pri chybe povoľ odoslanie
    }
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
        var telegramId = utils.safeGet(employee, "Telegram ID", "");
        var telegramEnabled = utils.safeGet(employee, "telegram", false);
        
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
    var groups = currentEntry.field("Skupina/Téma");
    
    if (!groups || groups.length === 0) {
        // Skús získať priame Chat ID
        var directChatId = currentEntry.field("Chat ID");
        if (directChatId) {
            targets.push({
                type: includeThread ? "thread" : "group",
                name: "Direct Chat ID",
                chatId: directChatId,
                threadId: includeThread ? currentEntry.field("Thread ID") : null,
                settings: getDefaultGroupSettings()
            });
            utils.addDebug(currentEntry, "✅ Použitý priamy Chat ID: " + directChatId);
        }
        return targets;
    }
    
    for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        var chatId = utils.safeGet(group, "Chat ID", "");
        var threadId = includeThread ? utils.safeGet(group, "Thread ID", "") : null;
        var enabled = utils.safeGet(group, "Povoliť notifikácie", true);
        
        if (chatId && enabled) {
            targets.push({
                type: includeThread ? "thread" : "group",
                name: utils.safeGet(group, "Názov záznamu", "Skupina") || utils.safeGet(group, "Názov skupiny", "Skupina"),
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
        
        // Získaj Chat ID a Thread ID priamo zo zákazky
        var chatId = utils.safeGet(order, "Chat ID", "");
        var threadId = utils.safeGet(order, "Thread ID", "");
        
        if (chatId) {
            // Ak má zákazka priame Chat ID, použi ho
            targets.push({
                type: "order-direct",
                name: utils.safeGet(order, "Názov záznamu", "Zákazka") + " (priame)",
                chatId: chatId,
                threadId: threadId,
                settings: getDefaultGroupSettings(),
                entry: order
            });
            utils.addDebug(currentEntry, "✅ Zákazka (priame ID): " + targets[targets.length - 1].name);
        }
        
        // Získaj aj linknuté Telegram skupiny
        var telegramGroups = utils.safeGet(order, "Telegram skupina", []);
        
        for (var j = 0; j < telegramGroups.length; j++) {
            var group = telegramGroups[j];
            var groupChatId = utils.safeGet(group, "Chat ID", "");
            var groupThreadId = utils.safeGet(group, "Thread ID", "");
            
            if (groupChatId) {
                targets.push({
                    type: "order",
                    name: utils.safeGet(order, "Názov záznamu", "Zákazka"),
                    chatId: groupChatId,
                    threadId: groupThreadId,
                    settings: extractGroupSettings(group),
                    entry: group
                });
                utils.addDebug(currentEntry, "✅ Zákazka (cez skupinu): " + targets[targets.length - 1].name);
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
        var telegramId = utils.safeGet(client, "Telegram ID", "");
        
        if (telegramId) {
            targets.push({
                type: "client",
                name: utils.safeGet(client, "Názov záznamu", "Klient"),
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
        var telegramId = utils.safeGet(partner, "Telegram ID", "");
        
        if (telegramId) {
            targets.push({
                type: "partner",
                name: utils.safeGet(partner, "Názov záznamu", "Partner"),
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
    // Kontrola priorit - urgentné správy ignorujú časové obmedzenia
    var messagePriority = currentEntry.field("Priorita");
    if (messagePriority === "Urgentná") {
        utils.addDebug(currentEntry, "🚨 Urgentná priorita - ignorujem časové obmedzenia");
        return true;
    }
    
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
        var attachment = currentEntry.field("Príloha");
        
        // Debug - vypíš hodnoty
        utils.addDebug(currentEntry, "📝 Správa: " + (message ? message.substring(0, 50) + "..." : "PRÁZDNA"));
        utils.addDebug(currentEntry, "🎨 Formátovanie: " + parseMode);
        utils.addDebug(currentEntry, "📎 Príloha: " + (attachment || "žiadna"));
        
        if (!message) {
            utils.addError(currentEntry, "Prázdna správa", "sendToTarget");
            return false;
        }
        
        // Kontrola API kľúča
        var apiKey = utils.getApiKey ? utils.getApiKey("Telegram") : null;
        if (!apiKey) {
            utils.addDebug(currentEntry, "⚠️ API kľúč možno chýba - pokračujem");
        }
        
        // Konverzia parse mode
        if (parseMode === "Obyčajný text") parseMode = null;
        if (parseMode === "HTML") parseMode = "HTML";
        if (parseMode === "Markdown") parseMode = "Markdown";
        
        utils.addDebug(currentEntry, "📤 Volám sendTelegramMessage:");
        utils.addDebug(currentEntry, "   - chatId: " + target.chatId);
        utils.addDebug(currentEntry, "   - message length: " + message.length);
        utils.addDebug(currentEntry, "   - parseMode: " + (parseMode || "none"));
        
        // Odoslanie
        var result;
        
        if (attachment) {
            // Ak máme prílohu, pošleme ju s caption
            result = sendWithAttachment(target, message, attachment, parseMode);
        } else {
            // Štandardné odoslanie správy
            var options = {
                parseMode: parseMode,
                disableNotification: target.settings ? target.settings.silentMode : false
            };
            
            if (target.threadId) {
                options.threadId = target.threadId;
            }
            
            result = utils.sendTelegramMessage(target.chatId, message, options);
        }
        
        utils.addDebug(currentEntry, "📬 Výsledok: " + (result ? "success=" + result.success : "null"));
        if (result && !result.success) {
            utils.addDebug(currentEntry, "❌ Error detail: " + result.error);
        }
        
        if (result && result.success) {
            utils.addDebug(currentEntry, "✅ Odoslané - Message ID: " + result.messageId);
            
            // Aktualizuj response data
            if (!currentEntry.field("Message ID")) {
                currentEntry.set("Message ID", result.messageId);
            }
            currentEntry.set("Odoslané o", moment().toDate());
            
            // Ulož Chat ID pre daily limit kontrolu
            currentEntry.set("Chat ID", target.chatId);
            
            // Pridaj info o odoslaní
            var info = currentEntry.field("info") || "";
            info += "\n" + moment().format("YYYY-MM-DD HH:mm:ss") + " | Odoslané: " + target.name;
            currentEntry.set("info", info);
            
            return true;
        } else {
            utils.addError(currentEntry, "Telegram error: " + (result ? result.error : "Unknown error"), "sendToTarget");
            return false;
        }
        
    } catch (error) {
        utils.addError(currentEntry, error, "sendToTarget");
        return false;
    }
}

function sendWithAttachment(target, message, attachment, parseMode) {
    // Základná implementácia - Telegram Bot API podporuje rôzne metódy
    // Toto je placeholder - MementoUtils by potreboval rozšírenie
    
    utils.addDebug(currentEntry, "📎 Detekovaná príloha - pokus o odoslanie");
    
    // Zatiaľ pošleme aspoň správu s poznámkou o prílohe
    var fullMessage = message + "\n\n📎 _Príloha: " + attachment + "_";
    
    var options = {
        parseMode: parseMode || "Markdown",
        disableNotification: target.settings ? target.settings.silentMode : false
    };
    
    if (target.threadId) {
        options.threadId = target.threadId;
    }
    
    return utils.sendTelegramMessage(target.chatId, fullMessage, options);
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
        
        // Increment pokusov (len pri finálnych statusoch)
        if (newStatus === CONFIG.statusSent || newStatus === CONFIG.statusFailed) {
            var pokusy = currentEntry.field("Pokusov o odoslanie") || 0;
            currentEntry.set("Pokusov o odoslanie", pokusy + 1);
        }
        
        // Info log
        var infoMsg = moment().format("YYYY-MM-DD HH:mm:ss") + " | Status: " + newStatus;
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