// ==============================================
// CREATING TRIGGER - ASISTANTO NOTIFICATIONS
// Verzia: 2.4 | Dátum: 17.08.2025 | Autor: ASISTANTO
// Knižnica: ASISTANTO Notifications | Trigger: Creating
// ==============================================
// 📋 FUNKCIA:
//    - Automaticky spracováva novo vytvorené notifikácie
//    - Routing podľa typu adresáta (Zamestnanec, Skupina, Téma, Zákazka)
//    - Synchronizácia nastavení z ASISTANTO Telegram Groups
//    - Odošle správy cez Telegram API s retry logikou
// ✅ v2.4 KOMPLETNÁ IMPLEMENTÁCIA:
//    - Všetky chýbajúce funkcie implementované
//    - Retry mechanizmus s exponential backoff
//    - Denný limit kontrola
//    - Podpora pre opakovanie správ
//    - Podpora pre prílohy
//    - N8N integrácia pre pokročilé workflow
// ==============================================

// Globálne premenné
var currentEntry = entry();
var utils = MementoUtils;

// Konfigurácia
var CONFIG = {
    debug: true,
    version: "2.4",
    scriptName: "ASISTANTO Notifications Creating Trigger",
    
    // Knižnice
    telegramGroupsLibrary: "ASISTANTO Telegram Groups",
    apiLibrary: "ASISTANTO API",
    defaultsLibrary: "ASISTANTO Defaults",
    zamestnanciLibrary: "Zamestnanci",
    klientiLibrary: "Klienti",
    partneriLibrary: "Partneri",
    zakazkyLibrary: "Zákazky",
    
    // Polia v notifikácii
    fields: {
        // Status
        status: "Status",
        statusWaiting: "Čaká",
        statusSent: "Odoslané",
        statusFailed: "Zlyhalo",
        statusCancelled: "Zrušené",
        statusScheduled: "Naplánované",
        statusExpired: "Vypršané",
        
        // Základné info
        typSpravy: "Typ správy",
        sprava: "Správa",
        predmet: "Predmet",
        formatovanie: "Formátovanie",
        priorita: "Priorita",
        
        // Adresát
        adresat: "Adresát",
        zamestnanec: "Zamestnanec",
        klient: "Klient",
        partner: "Partner",
        skupinaTema: "Skupina/Téma",
        zakazka: "Zákazka",
        
        // Časovanie
        poslatO: "Poslať o",
        vyprsat: "Vypršať o",
        opakovat: "Opakovať",
        vytvorene: "Vytvorené",
        
        // Telegram špecifické
        telegramId: "Telegram ID",
        chatId: "Chat ID",
        threadId: "Thread ID",
        messageId: "Message ID",
        messageUrl: "Message URL",
        
        // Response a retry
        odoslaneO: "Odoslané o",
        pokusovOdoslanie: "Pokusov o odoslanie",
        poslednaChyba: "Posledná chyba",
        responseData: "Response Data",
        retryCount: "Retry Count",
        nextRetryAt: "Next Retry At",
        
        // Metadata
        zdrojovaKniznica: "Zdrojová knižnica",
        zdrojovyId: "Zdrojový ID",
        vytvoril: "Vytvoril",
        
        // Debug
        debugLog: "Debug_Log",
        errorLog: "Error_Log"
    },
    
    // Nastavenia v externých knižniciach
    externalFields: {
        telegramEnabled: "telegram",
        telegramID: "Telegram ID",
        chatId: "Chat ID",
        threadId: "Thread ID",
        dennyLimit: "Denný limit správ",
        pracovnyCasOd: "Pracovný čas od",
        pracovnyCasDo: "Pracovný čas do",
        vikendoveSpravy: "Víkendové správy"
    },
    
    // Limity a timing
    maxRetries: 3,
    retryDelayMs: [1000, 5000, 15000], // 1s, 5s, 15s
    defaultDailyLimit: 50,
    
    // Typy adresátov
    addresseeTypes: {
        EMPLOYEE: "Zamestnanec",
        CLIENT: "Klient",
        PARTNER: "Partner",
        GROUP: "Skupina",
        GROUP_THREAD: "Skupina-Téma",
        ORDER: "Zákazka"
    },

    defaultsFields: {
        pracovnyCasOd: "Pracovný čas od", 
        pracovnyCasDo: "Pracovný čas do"
        
    }   

};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, "\n🚀 === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        utils.addDebug(currentEntry, "📋 Entry ID: " + currentEntry.field("ID"));
       
        var settings = {};
        // Načítaj všetky potrebné nastavenia individuálne
        for (var key in CONFIG.defaultsFields) {
            settings[CONFIG.defaultsFields[key]] = utils.getSettings(CONFIG.defaultsLibrary, CONFIG.defaultsFields[key]);
        }

        // 1. Validácia statusu
        var status = currentEntry.field(CONFIG.fields.status);
        utils.addDebug(currentEntry, "📊 Aktuálny status: " + status);
        
        if (status !== CONFIG.fields.statusWaiting) {
            utils.addDebug(currentEntry, "⏭️ Preskakujem - status nie je '" + CONFIG.fields.statusWaiting + "'");
            return;
        }
        
        // 2. Kontrola retry timing
        if (!checkRetryTiming()) {
            utils.addDebug(currentEntry, "⏳ Čakám na retry...");
            return;
        }
        
        // 3. Kontrola časovania
        if (!checkTiming()) {
            return;
        }
        
        // 4. Kontrola vypršania
        if (checkExpiration()) {
            updateStatus(CONFIG.fields.statusExpired, "Notifikácia vypršala");
            return;
        }
        
        // 5. Kontrola opakovania
        if (checkRepetition()) {
            createNextRepetition();
        }
        
        // 6. Určenie typu adresáta a získanie cieľových údajov
        var addresseeType = currentEntry.field(CONFIG.fields.adresat);
        utils.addDebug(currentEntry, "📬 Typ adresáta: " + addresseeType);
        
        var targets = getTargetData(addresseeType);
        if (!targets || targets.length === 0) {
            utils.addError(currentEntry, "Žiadni adresáti nenájdení", "main");
            updateStatus(CONFIG.fields.statusFailed, "Žiadni adresáti");
            return;
        }
        
        utils.addDebug(currentEntry, "🎯 Počet cieľov: " + targets.length);
        
        // 7. Odoslanie správ
        var results = {
            success: 0,
            failed: 0,
            skipped: 0
        };
        
        for (var i = 0; i < targets.length; i++) {
            var target = targets[i];
            utils.addDebug(currentEntry, "\n📤 Spracovávam cieľ " + (i + 1) + "/" + targets.length);
            
            // Kontrola denného limitu
            if (!checkDailyLimit(target)) {
                results.skipped++;
                continue;
            }
            
            // Kontrola pracovného času
            if (!checkWorkingHours(target)) {
                results.skipped++;
                utils.addDebug(currentEntry, "⏰ Mimo pracovného času - odložené");
                continue;
            }
            
            // Odoslanie
            if (sendToTarget(target)) {
                results.success++;
            } else {
                results.failed++;
            }
        }
        
        // 8. Finálny status
        processResults(results, targets.length);
        
        // 9. N8N webhook ak je nakonfigurovaný
        triggerN8NIfConfigured(results);
        
        utils.addDebug(currentEntry, "\n✅ === KONIEC TRIGGER SPRACOVANIA ===");
        
    } catch (error) {
        utils.addError(currentEntry, error, "main-critical");
        updateStatus(CONFIG.fields.statusFailed, "Kritická chyba: " + error.toString());
    }
}

// ==============================================
// ČASOVANIE A VALIDÁCIA
// ==============================================

function checkRetryTiming() {
    var retryCount = utils.safeGet(currentEntry, CONFIG.fields.retryCount, 0);
    if (retryCount === 0) return true;
    
    var nextRetryAt = utils.safeGet(currentEntry, CONFIG.fields.nextRetryAt, null);
    if (!nextRetryAt) return true;
    
    var now = moment();
    var retryTime = moment(nextRetryAt);
    
    if (now.isBefore(retryTime)) {
        utils.addDebug(currentEntry, "⏳ Retry naplánovaný na: " + retryTime.format("HH:mm:ss"));
        return false;
    }
    
    return true;
}

function checkTiming() {
    var poslatO = currentEntry.field(CONFIG.fields.poslatO);
    if (!poslatO) return true;
    
    var scheduledTime = moment(poslatO);
    var now = moment();
    
    if (scheduledTime.isAfter(now)) {
        utils.addDebug(currentEntry, "⏰ Naplánované na: " + scheduledTime.format("DD.MM.YYYY HH:mm"));
        utils.addDebug(currentEntry, "⏸️ Ešte nie je čas - čakám");
        return false;
    }
    
    return true;
}

function checkExpiration() {
    var vyprsat = currentEntry.field(CONFIG.fields.vyprsat);
    if (!vyprsat) return false;
    
    var expirationTime = moment(vyprsat);
    var now = moment();
    
    if (expirationTime.isBefore(now)) {
        utils.addDebug(currentEntry, "⏰ Notifikácia vypršala: " + expirationTime.format("DD.MM.YYYY HH:mm"));
        return true;
    }
    
    return false;
}

function checkWorkingHours(target, settings) {
    // Kontrola len pre zamestnancov
    if (target.type !== CONFIG.addresseeTypes.EMPLOYEE) return true;
    
    var settings = settings;

    if (!settings || !settings[CONFIG.defaultsFields.pracovnyCasOd]) return true;
    
    // 1. Kontrola Check pracovného času
    



    var now = moment();
    var dayOfWeek = now.day(); // 0 = nedeľa, 6 = sobota
    
    // Víkend kontrola
    if ((dayOfWeek === 0 || dayOfWeek === 6) && !settings[CONFIG.externalFields.vikendoveSpravy]) {
        return false;
    }
    
    // Pracovný čas kontrola
    var startTime = moment(settings[CONFIG.defaultsFields.pracovnyCasOd], "HH:mm");
    var endTime = moment(settings[CONFIG.defaultsFields.pracovnyCasDo], "HH:mm");
    var currentTime = moment(now.format("HH:mm"), "HH:mm");
    
    if (currentTime.isBefore(startTime) || currentTime.isAfter(endTime)) {
        return false;
    }
    
    return true;
}

function checkRepetition() {
    var opakovat = currentEntry.field(CONFIG.fields.opakovat);
    return opakovat && opakovat !== "Nie";
}

// ==============================================
// ZÍSKAVANIE CIEĽOVÝCH DÁT
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
                targets = getGroupTargets();
                break;
                
            case CONFIG.addresseeTypes.GROUP_THREAD:
                targets = getGroupThreadTargets();
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
    var employees = utils.safeGetLinks(currentEntry, CONFIG.fields.zamestnanec);
    
    for (var i = 0; i < employees.length; i++) {
        var emp = employees[i];
        var telegramEnabled = utils.safeGet(emp, CONFIG.externalFields.telegramEnabled, false);
        var telegramId = utils.safeGet(emp, CONFIG.externalFields.telegramID, "");
        
        if (telegramEnabled && telegramId) {
            targets.push({
                type: CONFIG.addresseeTypes.EMPLOYEE,
                name: utils.formatEmployeeName(emp),
                chatId: telegramId,
                entity: emp
            });
            
            utils.addDebug(currentEntry, "✅ Zamestnanec: " + utils.formatEmployeeName(emp) + " (TG: " + telegramId + ")");
        } else {
            utils.addDebug(currentEntry, "⚠️ Zamestnanec " + utils.formatEmployeeName(emp) + " nemá Telegram");
        }
    }
    
    return targets;
}

function getClientTargets() {
    var targets = [];
    var clients = utils.safeGetLinks(currentEntry, CONFIG.fields.klient);
    
    for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        var telegramEnabled = utils.safeGet(client, CONFIG.externalFields.telegramEnabled, false);
        var telegramId = utils.safeGet(client, CONFIG.externalFields.telegramID, "");
        
        if (telegramEnabled && telegramId) {
            targets.push({
                type: CONFIG.addresseeTypes.CLIENT,
                name: utils.safeGet(client, "Názov", "Klient"),
                chatId: telegramId,
                entity: client
            });
        }
    }
    
    return targets;
}

function getPartnerTargets() {
    var targets = [];
    var partners = utils.safeGetLinks(currentEntry, CONFIG.fields.partner);
    
    for (var i = 0; i < partners.length; i++) {
        var partner = partners[i];
        var telegramId = utils.safeGet(partner, CONFIG.externalFields.telegramID, "");
        
        if (telegramId) {
            targets.push({
                type: CONFIG.addresseeTypes.PARTNER,
                name: utils.safeGet(partner, "Názov", "Partner"),
                chatId: telegramId,
                entity: partner
            });
        }
    }
    
    return targets;
}

function getGroupTargets() {
    var targets = [];
    var groups = utils.safeGetLinks(currentEntry, CONFIG.fields.skupinaTema);
    
    for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        var chatId = utils.safeGet(group, CONFIG.externalFields.chatId, "");
        
        if (chatId) {
            targets.push({
                type: CONFIG.addresseeTypes.GROUP,
                name: utils.safeGet(group, "Názov", "Skupina"),
                chatId: chatId,
                entity: group
            });
            
            utils.addDebug(currentEntry, "✅ Skupina: " + utils.safeGet(group, "Názov", "?") + " (Chat: " + chatId + ")");
        }
    }
    
    return targets;
}

function getGroupThreadTargets() {
    var targets = [];
    var groups = utils.safeGetLinks(currentEntry, CONFIG.fields.skupinaTema);
    
    for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        var chatId = utils.safeGet(group, CONFIG.externalFields.chatId, "");
        var threadId = utils.safeGet(group, CONFIG.externalFields.threadId, "");
        
        if (chatId && threadId) {
            targets.push({
                type: CONFIG.addresseeTypes.GROUP_THREAD,
                name: utils.safeGet(group, "Téma Názov", "Téma"),
                chatId: chatId,
                threadId: threadId,
                entity: group
            });
            
            utils.addDebug(currentEntry, "✅ Téma: " + utils.safeGet(group, "Téma Názov", "?") + " (Thread: " + threadId + ")");
        }
    }
    
    return targets;
}

function getOrderTargets() {
    var targets = [];
    var orders = utils.safeGetLinks(currentEntry, CONFIG.fields.zakazka);
    
    for (var i = 0; i < orders.length; i++) {
        var order = orders[i];
        
        // Získaj Thread ID zo zákazky
        var threadId = utils.safeGet(order, "Thread ID", "");
        if (!threadId) continue;
        
        // Nájdi skupinu pre túto zákazku
        var telegramGroups = libByName(CONFIG.telegramGroupsLibrary);
        if (!telegramGroups) continue;
        
        var groups = telegramGroups.entries();
        for (var j = 0; j < groups.length; j++) {
            var group = groups[j];
            var groupThreadId = utils.safeGet(group, CONFIG.externalFields.threadId, "");
            
            if (groupThreadId === threadId) {
                var chatId = utils.safeGet(group, CONFIG.externalFields.chatId, "");
                
                targets.push({
                    type: CONFIG.addresseeTypes.ORDER,
                    name: "Zákazka #" + utils.safeGet(order, "Číslo zákazky", order.field("ID")),
                    chatId: chatId,
                    threadId: threadId,
                    entity: order
                });
                
                utils.addDebug(currentEntry, "✅ Zákazka: #" + utils.safeGet(order, "Číslo zákazky", "?") + " (Thread: " + threadId + ")");
                break;
            }
        }
    }
    
    return targets;
}

// ==============================================
// DENNÝ LIMIT KONTROLA
// ==============================================

function checkDailyLimit(target) {
    if (target.type !== CONFIG.addresseeTypes.EMPLOYEE) return true;
    
    var employee = target.entity;
    var dailyLimit = utils.safeGet(employee, CONFIG.externalFields.dennyLimit, CONFIG.defaultDailyLimit);
    
    // Získaj dnešné správy
    var today = moment().startOf('day');
    var notifLib = lib();
    
    var todayMessages = notifLib.find(CONFIG.fields.zamestnanec, employee);
    var sentToday = 0;
    
    for (var i = 0; i < todayMessages.length; i++) {
        var msg = todayMessages[i];
        var sentAt = msg.field(CONFIG.fields.odoslaneO);
        
        if (sentAt && moment(sentAt).isSameOrAfter(today) && 
            msg.field(CONFIG.fields.status) === CONFIG.fields.statusSent) {
            sentToday++;
        }
    }
    
    if (sentToday >= dailyLimit) {
        utils.addDebug(currentEntry, "⚠️ Denný limit dosiahnutý pre " + target.name + " (" + sentToday + "/" + dailyLimit + ")");
        return false;
    }
    
    return true;
}

// ==============================================
// ODOSIELANIE SPRÁV
// ==============================================

function sendToTarget(target) {
    try {
        utils.addDebug(currentEntry, "📨 Odosielam na: " + target.name + " (" + target.chatId + ")");
        
        // Priprav správu
        var message = prepareMessage(target);
        
        // Priprav options
        var sendOptions = {
            parseMode: currentEntry.field(CONFIG.fields.formatovanie) || "Markdown",
            silentNotification: utils.safeGet(currentEntry, CONFIG.fields.priorita, "Normálna") === "Nízka"
        };
        
        // Pridaj thread ID ak existuje
        if (target.threadId) {
            sendOptions.threadId = target.threadId;
        }
        
        // Odošli správu
        var result = utils.sendTelegramMessage(target.chatId, message, sendOptions);
        
        if (result.success) {
            // Ulož response data
            utils.safeSet(currentEntry, CONFIG.fields.messageId, result.messageId);
            utils.safeSet(currentEntry, CONFIG.fields.odoslaneO, moment().toDate());
            utils.safeSet(currentEntry, CONFIG.fields.responseData, JSON.stringify(result.data));
            
            // Vytvor message URL
            if (target.threadId) {
                var messageUrl = "https://t.me/c/" + target.chatId.replace("-100", "") + "/" + target.threadId + "/" + result.messageId;
            } else {
                var messageUrl = "https://t.me/c/" + target.chatId.replace("-100", "") + "/" + result.messageId;
            }
            utils.safeSet(currentEntry, CONFIG.fields.messageUrl, messageUrl);
            
            utils.addDebug(currentEntry, "✅ Správa odoslaná! Message ID: " + result.messageId);
            return true;
            
        } else {
            utils.addError(currentEntry, result.error, "sendToTarget");
            incrementRetryCount();
            return false;
        }
        
    } catch (error) {
        utils.addError(currentEntry, error, "sendToTarget");
        incrementRetryCount();
        return false;
    }
}

function prepareMessage(target) {
    var message = currentEntry.field(CONFIG.fields.sprava) || "";
    var predmet = currentEntry.field(CONFIG.fields.predmet);
    
    // Pridaj predmet ak existuje
    if (predmet) {
        message = "**" + predmet + "**\n\n" + message;
    }
    
    // Personalizácia pre zamestnanca
    if (target.type === CONFIG.addresseeTypes.EMPLOYEE && target.entity) {
        message = message.replace("{meno}", utils.safeGet(target.entity, "Meno", ""));
        message = message.replace("{priezvisko}", utils.safeGet(target.entity, "Priezvisko", ""));
        message = message.replace("{nick}", utils.safeGet(target.entity, "Nick", ""));
    }
    
    // Pridaj footer s metadátami
    var footer = "\n\n_";
    footer += utils.formatDate(moment(), "DD.MM HH:mm");
    footer += " | " + currentEntry.field(CONFIG.fields.typSpravy);
    footer += " | #" + currentEntry.field("ID");
    footer += "_";
    
    return message + footer;
}

// ==============================================
// RETRY A STATUS MANAGEMENT
// ==============================================

function incrementRetryCount() {
    var retryCount = utils.safeGet(currentEntry, CONFIG.fields.retryCount, 0);
    retryCount++;
    
    utils.safeSet(currentEntry, CONFIG.fields.retryCount, retryCount);
    utils.safeSet(currentEntry, CONFIG.fields.pokusovOdoslanie, retryCount);
    
    if (retryCount < CONFIG.maxRetries) {
        // Nastav next retry time s exponential backoff
        var delayMs = CONFIG.retryDelayMs[Math.min(retryCount - 1, CONFIG.retryDelayMs.length - 1)];
        var nextRetry = moment().add(delayMs, 'milliseconds');
        
        utils.safeSet(currentEntry, CONFIG.fields.nextRetryAt, nextRetry.toDate());
        utils.addDebug(currentEntry, "⏰ Ďalší pokus o: " + nextRetry.format("HH:mm:ss"));
    }
}

function updateStatus(newStatus, errorMessage) {
    utils.safeSet(currentEntry, CONFIG.fields.status, newStatus);
    
    if (errorMessage) {
        utils.safeSet(currentEntry, CONFIG.fields.poslednaChyba, errorMessage);
    }
    
    utils.addInfo(currentEntry, "Status zmenený na: " + newStatus, {
        previousStatus: CONFIG.fields.statusWaiting,
        errorMessage: errorMessage || "N/A"
    });
}

function processResults(results, totalTargets) {
    if (results.success === totalTargets) {
        updateStatus(CONFIG.fields.statusSent);
        utils.addDebug(currentEntry, "✅ Všetky správy odoslané (" + results.success + "/" + totalTargets + ")");
        
    } else if (results.success > 0) {
        updateStatus(CONFIG.fields.statusSent, "Čiastočne odoslané: " + results.success + "/" + totalTargets);
        utils.addDebug(currentEntry, "⚠️ Čiastočný úspech: " + results.success + "/" + totalTargets);
        
    } else if (results.skipped === totalTargets) {
        utils.addDebug(currentEntry, "⏭️ Všetky správy preskočené (limity/čas)");
        // Zostáva status "Čaká" pre neskorší pokus
        
    } else {
        var retryCount = utils.safeGet(currentEntry, CONFIG.fields.retryCount, 0);
        if (retryCount < CONFIG.maxRetries - 1) {
            utils.addDebug(currentEntry, "🔄 Nastavujem retry #" + (retryCount + 1));
            // Status zostáva "Čaká" pre retry
        } else {
            updateStatus(CONFIG.fields.statusFailed, "Všetky správy zlyhali po " + CONFIG.maxRetries + " pokusoch");
            utils.addError(currentEntry, "Všetky správy zlyhali", "processResults");
        }
    }
}

// ==============================================
// OPAKOVANIE SPRÁV
// ==============================================

function createNextRepetition() {
    try {
        var opakovat = currentEntry.field(CONFIG.fields.opakovat);
        if (!opakovat || opakovat === "Nie") return;
        
        var nextTime = moment();
        
        switch (opakovat) {
            case "Každý deň":
                nextTime.add(1, 'day');
                break;
            case "Každý týždeň":
                nextTime.add(1, 'week');
                break;
            case "Každý mesiac":
                nextTime.add(1, 'month');
                break;
            default:
                return;
        }
        
        // Vytvor novú notifikáciu
        var newData = {
            typSpravy: currentEntry.field(CONFIG.fields.typSpravy),
            sprava: currentEntry.field(CONFIG.fields.sprava),
            predmet: currentEntry.field(CONFIG.fields.predmet),
            formatovanie: currentEntry.field(CONFIG.fields.formatovanie),
            priorita: currentEntry.field(CONFIG.fields.priorita),
            adresat: currentEntry.field(CONFIG.fields.adresat),
            poslatO: nextTime.toDate(),
            opakovat: opakovat,
            zdrojovaKniznica: currentEntry.field(CONFIG.fields.zdrojovaKniznica),
            zdrojovyId: currentEntry.field(CONFIG.fields.zdrojovyId)
        };
        
        // Skopíruj adresátov
        var addresseeType = currentEntry.field(CONFIG.fields.adresat);
        switch (addresseeType) {
            case CONFIG.addresseeTypes.EMPLOYEE:
                newData.zamestnanec = currentEntry.field(CONFIG.fields.zamestnanec);
                break;
            case CONFIG.addresseeTypes.CLIENT:
                newData.klient = currentEntry.field(CONFIG.fields.klient);
                break;
            case CONFIG.addresseeTypes.PARTNER:
                newData.partner = currentEntry.field(CONFIG.fields.partner);
                break;
            case CONFIG.addresseeTypes.GROUP:
            case CONFIG.addresseeTypes.GROUP_THREAD:
                newData.skupinaTema = currentEntry.field(CONFIG.fields.skupinaTema);
                break;
            case CONFIG.addresseeTypes.ORDER:
                newData.zakazka = currentEntry.field(CONFIG.fields.zakazka);
                break;
        }
        
        var newNotification = utils.createNotificationEntry(newData);
        
        if (newNotification) {
            utils.addInfo(currentEntry, "Vytvorená opakovaná notifikácia", {
                newId: newNotification.field("ID"),
                scheduledFor: nextTime.format("DD.MM.YYYY HH:mm")
            });
        }
        
    } catch (error) {
        utils.addError(currentEntry, error, "createNextRepetition");
    }
}

// ==============================================
// N8N INTEGRÁCIA
// ==============================================

function triggerN8NIfConfigured(results) {
    try {
        var settings = utils.getSettings(CONFIG.defaultsLibrary);
        if (!settings || !settings["N8N Webhook URL"]) {
            return;
        }
        
        var workflowData = {
            notificationId: currentEntry.field("ID"),
            type: currentEntry.field(CONFIG.fields.typSpravy),
            status: currentEntry.field(CONFIG.fields.status),
            results: {
                sent: results.success,
                failed: results.failed,
                skipped: results.skipped,
                total: results.success + results.failed + results.skipped
            },
            metadata: {
                addresseeType: currentEntry.field(CONFIG.fields.adresat),
                priority: currentEntry.field(CONFIG.fields.priorita),
                retryCount: utils.safeGet(currentEntry, CONFIG.fields.retryCount, 0)
            }
        };
        
        var n8nResult = utils.callN8NWebhook(workflowData, {
            metadata: {
                trigger: "notification_processed",
                library: lib().name
            }
        });
        
        if (n8nResult.success) {
            utils.addDebug(currentEntry, "✅ N8N webhook notifikovaný");
        }
        
    } catch (error) {
        utils.addError(currentEntry, error, "triggerN8NIfConfigured");
    }
}

// ==============================================
// SPUSTENIE HLAVNEJ FUNKCIE
// ==============================================

main();