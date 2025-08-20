// ==============================================
// CREATING TRIGGER - ASISTANTO NOTIFICATIONS
// Verzia: 3.0 | Dátum: 19.08.2025 | Autor: ASISTANTO
// Knižnica: ASISTANTO Notifications | Trigger: Creating
// ==============================================
// 📋 FUNKCIA:
//    - Automaticky spracováva novo vytvorené notifikácie
//    - Routing podľa typu adresáta (Zamestnanec, Skupina, Téma, Zákazka)
//    - Synchronizácia nastavení z ASISTANTO Telegram Groups
//    - Odošle správy cez Telegram API s retry logikou
// ✅ v3.0 REFAKTORING:
//    - Využitie modulárnych MementoUtils knižníc
//    - Kompletná CONFIG sekcia so všetkými názvami polí
//    - Vylepšené spracovanie Telegram response dát
//    - Podpora pre úpravu a mazanie správ
//    - Optimalizovaný kód s lepšou štruktúrou
// ==============================================

// Import knižníc
var utils = MementoUtils;
var telegram = MementoTelegram;
var business = MementoBusiness;
var currentEntry = entry();

// ==============================================
// KONFIGURÁCIA
// ==============================================

var CONFIG = {
    debug: true,
    version: "3.0",
    scriptName: "ASISTANTO Notifications Creating Trigger",
    
    // Knižnice
    libraries: {
        telegramGroups: "ASISTANTO Telegram Groups",
        api: "ASISTANTO API", 
        defaults: "ASISTANTO Defaults",
        zamestnanci: "Zamestnanci",
        klienti: "Klienti",
        partneri: "Partneri",
        zakazky: "Zákazky"
    },
    
    // Polia v notifikácii
    fields: {
        // Status hodnoty
        status: "Status",
        statusValues: {
            waiting: "Čaká",
            sent: "Odoslané",
            failed: "Zlyhalo",
            cancelled: "Zrušené",
            scheduled: "Naplánované",
            expired: "Vypršané"
        },
        
        // Základné info
        typSpravy: "Typ správy",
        sprava: "Správa",
        predmet: "Predmet",
        formatovanie: "Formátovanie",
        priorita: "Priorita",
        priloha: "Príloha",
        
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
        vytvoril: "Vytvoril"
    },
    
    // Polia v externých knižniciach
    externalFields: {
        // Zamestnanci/Klienti/Partneri
        telegramId: "Telegram ID",
        telegramEnabled: "telegram",
        meno: "Meno",
        priezvisko: "Priezvisko",
        nick: "Nick",
        
        // ASISTANTO Telegram Groups
        groupChatId: "Chat ID",
        groupThreadId: "Thread ID",
        groupName: "Názov skupiny",
        threadName: "Názov témy",
        
        // Nastavenia skupín
        workingHoursEnabled: "Povoliť notifikácie",
        workingHoursFrom: "Pracovný čas od",
        workingHoursTo: "Pracovný čas do",
        weekendEnabled: "Víkend povolený",
        dailyLimit: "Denný limit správ",
        sentToday: "Počet správ dnes",
        silentMode: "Tichá správa",
        
        // ASISTANTO Defaults
        defaultBotToken: "Telegram Bot Token",
        defaultWorkingHoursFrom: "Pracovný čas od",
        defaultWorkingHoursTo: "Pracovný čas do"
    },
    
    // Nastavenia
    settings: {
        maxRetries: 3,
        retryDelayMs: [1000, 5000, 15000], // 1s, 5s, 15s
        defaultParseMode: "HTML",
        includeMetadata: true,
        personalizationEnabled: true
    },
    
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
        utils.clearLogs(currentEntry, false);
        utils.addDebug(currentEntry, "🚀 === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        utils.addDebug(currentEntry, "📋 Entry ID: " + currentEntry.field("ID"));
        
        // 1. Validácia statusu
        var status = currentEntry.field(CONFIG.fields.status);
        utils.addDebug(currentEntry, "📊 Aktuálny status: " + status);
        
        if (status !== CONFIG.fields.statusValues.waiting) {
            utils.addDebug(currentEntry, "⏭️ Preskakujem - status nie je '" + CONFIG.fields.statusValues.waiting + "'");
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
            updateStatus(CONFIG.fields.statusValues.expired, "Notifikácia vypršala");
            return;
        }
        
        // 5. Určenie typu adresáta a získanie cieľových údajov
        var addresseeType = currentEntry.field(CONFIG.fields.adresat);
        utils.addDebug(currentEntry, "📬 Typ adresáta: " + addresseeType);
        
        var targets = getTargetData(addresseeType);
        if (!targets || targets.length === 0) {
            utils.addError(currentEntry, "Žiadni adresáti nenájdení", CONFIG.scriptName);
            updateStatus(CONFIG.fields.statusValues.failed, "Žiadni adresáti");
            return;
        }
        
        utils.addDebug(currentEntry, "🎯 Počet cieľov: " + targets.length);
        
        // 6. Spracovanie správ
        var results = processAllTargets(targets);
        
        // 7. Vyhodnotenie výsledkov
        processResults(results, targets.length);
        
        // 8. Kontrola opakovania
        if (shouldCreateRepetition()) {
            createNextRepetition();
        }
        
        // 9. N8N webhook ak je nakonfigurovaný
        triggerN8NIfConfigured(results);
        
        utils.addDebug(currentEntry, "\n✅ === KONIEC TRIGGER SPRACOVANIA ===");
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba: " + error.toString(), CONFIG.scriptName, error);
        updateStatus(CONFIG.fields.statusValues.failed, "Kritická chyba: " + error.toString());
    }
}

// ==============================================
// SPRACOVANIE CIEĽOV
// ==============================================

function processAllTargets(targets) {
    var results = {
        success: 0,
        failed: 0,
        skipped: 0,
        details: []
    };
    
    for (var i = 0; i < targets.length; i++) {
        var target = targets[i];
        utils.addDebug(currentEntry, "\n📤 Spracovávam cieľ " + (i + 1) + "/" + targets.length);
        
        var result = processTarget(target);
        
        if (result.status === "sent") {
            results.success++;
        } else if (result.status === "skipped") {
            results.skipped++;
        } else {
            results.failed++;
        }
        
        results.details.push(result);
    }
    
    return results;
}

function processTarget(target) {
    try {
        // Kontrola denného limitu
        if (!checkDailyLimit(target)) {
            return {
                status: "skipped",
                reason: "Prekročený denný limit",
                target: target
            };
        }
        
        // Kontrola pracovného času
        if (!checkWorkingHours(target)) {
            return {
                status: "skipped", 
                reason: "Mimo pracovného času",
                target: target
            };
        }
        
        // Príprava správy
        var message = prepareMessage(target);
        var options = prepareMessageOptions(target);
        
        // Odoslanie správy
        var result = telegram.sendTelegramMessage(target.chatId, message, options);
        
        if (result.success) {
            // Ulož detaily odpovede
            saveResponseData(result);
            
            return {
                status: "sent",
                messageId: result.messageId,
                target: target,
                response: result
            };
        } else {
            incrementRetryCount();
            
            return {
                status: "failed",
                error: result.error,
                target: target
            };
        }
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri spracovaní cieľa: " + error.toString(), 
                      CONFIG.scriptName, error);
        return {
            status: "failed",
            error: error.toString(),
            target: target
        };
    }
}

// ==============================================
// ZÍSKANIE CIEĽOVÝCH DÁT
// ==============================================

function getTargetData(addresseeType) {
    var targets = [];
    
    switch (addresseeType) {
        case CONFIG.addresseeTypes.EMPLOYEE:
            targets = getEmployeeTargets();
            break;
            
        case CONFIG.addresseeTypes.GROUP:
        case CONFIG.addresseeTypes.GROUP_THREAD:
            targets = getGroupTargets();
            break;
            
        case CONFIG.addresseeTypes.CLIENT:
            targets = getClientTargets();
            break;
            
        case CONFIG.addresseeTypes.PARTNER:
            targets = getPartnerTargets();
            break;
            
        case CONFIG.addresseeTypes.ORDER:
            targets = getOrderTargets();
            break;
            
        default:
            utils.addError(currentEntry, "Neznámy typ adresáta: " + addresseeType, CONFIG.scriptName);
    }
    
    return targets;
}

function getEmployeeTargets() {
    var targets = [];
    var employees = utils.safeGetLinks(currentEntry, CONFIG.fields.zamestnanec);
    
    for (var i = 0; i < employees.length; i++) {
        var emp = employees[i];
        var telegramId = utils.safeGet(emp, CONFIG.externalFields.telegramId, null);
        var enabled = utils.safeGet(emp, CONFIG.externalFields.telegramEnabled, false);
        
        if (telegramId && enabled) {
            targets.push({
                type: CONFIG.addresseeTypes.EMPLOYEE,
                chatId: telegramId,
                entity: emp,
                name: business.formatEmployeeName(emp),
                settings: getDefaultSettings()
            });
            
            utils.addDebug(currentEntry, "✅ Zamestnanec: " + business.formatEmployeeName(emp) + 
                          " (ID: " + telegramId + ")");
        } else {
            utils.addDebug(currentEntry, "⏭️ Preskakujem zamestnanca: " + 
                          business.formatEmployeeName(emp) + " - Telegram neaktívny");
        }
    }
    
    return targets;
}

function getGroupTargets() {
    var targets = [];
    var groups = utils.safeGetLinks(currentEntry, CONFIG.fields.skupinaTema);
    
    for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        var chatId = utils.safeGet(group, CONFIG.externalFields.groupChatId, null);
        var threadId = utils.safeGet(group, CONFIG.externalFields.groupThreadId, null);
        var enabled = utils.safeGet(group, CONFIG.externalFields.workingHoursEnabled, true);
        
        if (chatId && enabled) {
            var target = {
                type: threadId ? CONFIG.addresseeTypes.GROUP_THREAD : CONFIG.addresseeTypes.GROUP,
                chatId: chatId,
                threadId: threadId,
                entity: group,
                name: utils.safeGet(group, CONFIG.externalFields.groupName, "Skupina"),
                settings: extractGroupSettings(group)
            };
            
            targets.push(target);
            
            utils.addDebug(currentEntry, "✅ " + (threadId ? "Téma" : "Skupina") + ": " + 
                          target.name + " (Chat: " + chatId + 
                          (threadId ? ", Thread: " + threadId : "") + ")");
        }
    }
    
    return targets;
}

function getClientTargets() {
    var targets = [];
    var clients = utils.safeGetLinks(currentEntry, CONFIG.fields.klient);
    
    for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        var telegramId = utils.safeGet(client, CONFIG.externalFields.telegramId, null);
        
        if (telegramId) {
            targets.push({
                type: CONFIG.addresseeTypes.CLIENT,
                chatId: telegramId,
                entity: client,
                name: utils.safeGet(client, CONFIG.externalFields.meno, "Klient") + " " + 
                      utils.safeGet(client, CONFIG.externalFields.priezvisko, ""),
                settings: getDefaultSettings()
            });
        }
    }
    
    return targets;
}

function getPartnerTargets() {
    // Podobná implementácia ako getClientTargets
    return [];
}

function getOrderTargets() {
    // TODO: Implementovať podľa business logiky
    return [];
}

// ==============================================
// NASTAVENIA A KONTROLY
// ==============================================

function getDefaultSettings() {
    var defaults = utils.getSettings(CONFIG.libraries.defaults);
    
    return {
        workingHoursFrom: defaults ? defaults[CONFIG.externalFields.defaultWorkingHoursFrom] : null,
        workingHoursTo: defaults ? defaults[CONFIG.externalFields.defaultWorkingHoursTo] : null,
        botToken: defaults ? defaults[CONFIG.externalFields.defaultBotToken] : null
    };
}

function extractGroupSettings(group) {
    return {
        workingHoursEnabled: utils.safeGet(group, CONFIG.externalFields.workingHoursEnabled, true),
        workingHoursFrom: utils.safeGet(group, CONFIG.externalFields.workingHoursFrom, null),
        workingHoursTo: utils.safeGet(group, CONFIG.externalFields.workingHoursTo, null),
        weekendEnabled: utils.safeGet(group, CONFIG.externalFields.weekendEnabled, false),
        dailyLimit: utils.safeGet(group, CONFIG.externalFields.dailyLimit, 0),
        sentToday: utils.safeGet(group, CONFIG.externalFields.sentToday, 0),
        silentMode: utils.safeGet(group, CONFIG.externalFields.silentMode, false)
    };
}

function checkDailyLimit(target) {
    if (!target.settings || !target.settings.dailyLimit) return true;
    
    var limit = target.settings.dailyLimit;
    var sentToday = target.settings.sentToday || 0;
    
    if (limit > 0 && sentToday >= limit) {
        utils.addDebug(currentEntry, "📊 Prekročený denný limit: " + sentToday + "/" + limit);
        return false;
    }
    
    return true;
}

function checkWorkingHours(target) {
    if (!target.settings || !target.settings.workingHoursEnabled) return true;
    
    var now = moment();
    var dayOfWeek = now.day();
    
    // Kontrola víkendu
    if ((dayOfWeek === 0 || dayOfWeek === 6) && !target.settings.weekendEnabled) {
        utils.addDebug(currentEntry, "🚫 Víkend - notifikácie zakázané");
        return false;
    }
    
    // Kontrola pracovného času
    if (target.settings.workingHoursFrom && target.settings.workingHoursTo) {
        var from = moment(target.settings.workingHoursFrom, "HH:mm");
        var to = moment(target.settings.workingHoursTo, "HH:mm");
        var nowTime = moment(now.format("HH:mm"), "HH:mm");
        
        if (!nowTime.isBetween(from, to)) {
            utils.addDebug(currentEntry, "⏰ Mimo pracovného času");
            return false;
        }
    }
    
    return true;
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

// ==============================================
// PRÍPRAVA SPRÁVY
// ==============================================

function prepareMessage(target) {
    var message = currentEntry.field(CONFIG.fields.sprava) || "";
    var predmet = currentEntry.field(CONFIG.fields.predmet);
    var formatovanie = currentEntry.field(CONFIG.fields.formatovanie) || "HTML";
    
    // Pridaj predmet ak existuje
    if (predmet) {
        if (formatovanie === "HTML") {
            message = "<b>" + escapeHtml(predmet) + "</b>\n\n" + message;
        } else if (formatovanie === "Markdown") {
            message = "**" + predmet + "**\n\n" + message;
        } else {
            message = predmet + "\n\n" + message;
        }
    }
    
    // Personalizácia
    if (CONFIG.settings.personalizationEnabled && target.entity) {
        message = personalizeMessage(message, target);
    }
    
    // Metadata footer
    if (CONFIG.settings.includeMetadata) {
        message += createMetadataFooter();
    }
    
    return message;
}

function personalizeMessage(message, target) {
    if (target.type === CONFIG.addresseeTypes.EMPLOYEE && target.entity) {
        message = message.replace(/{meno}/g, utils.safeGet(target.entity, CONFIG.externalFields.meno, ""));
        message = message.replace(/{priezvisko}/g, utils.safeGet(target.entity, CONFIG.externalFields.priezvisko, ""));
        message = message.replace(/{nick}/g, utils.safeGet(target.entity, CONFIG.externalFields.nick, ""));
    }
    
    // Univerzálne nahradenia
    message = message.replace(/{datum}/g, moment().format("DD.MM.YYYY"));
    message = message.replace(/{cas}/g, moment().format("HH:mm"));
    
    return message;
}

function createMetadataFooter() {
    var footer = "\n\n";
    var formatovanie = currentEntry.field(CONFIG.fields.formatovanie) || "HTML";
    
    if (formatovanie === "HTML") {
        footer += "<i>";
        footer += utils.formatDate(moment(), "DD.MM HH:mm");
        footer += " | " + currentEntry.field(CONFIG.fields.typSpravy);
        footer += " | #" + currentEntry.field("ID");
        footer += "</i>";
    } else {
        footer += "_";
        footer += utils.formatDate(moment(), "DD.MM HH:mm");
        footer += " | " + currentEntry.field(CONFIG.fields.typSpravy);
        footer += " | #" + currentEntry.field("ID");
        footer += "_";
    }
    
    return footer;
}

function prepareMessageOptions(target) {
    var options = {
        parseMode: currentEntry.field(CONFIG.fields.formatovanie) || CONFIG.settings.defaultParseMode
    };
    
    // Thread ID pre skupiny
    if (target.threadId) {
        options.messageThreadId = target.threadId;
    }
    
    // Silent mode
    if (target.settings && target.settings.silentMode) {
        options.silent = true;
    }
    
    // Reply markup pre interaktívne tlačidlá
    var priorita = currentEntry.field(CONFIG.fields.priorita);
    if (priorita === "Urgentné") {
        options.replyMarkup = {
            inline_keyboard: [[
                {
                    text: "✅ Prečítané",
                    callback_data: "read_" + currentEntry.field("ID")
                }
            ]]
        };
    }
    
    return options;
}

// ==============================================
// RESPONSE A STATUS MANAGEMENT
// ==============================================

function saveResponseData(result) {
    // Ulož Message ID
    utils.safeSet(currentEntry, CONFIG.fields.messageId, result.messageId);
    
    // Ulož čas odoslania
    utils.safeSet(currentEntry, CONFIG.fields.odoslaneO, moment().toDate());
    
    // Vytvor URL na správu (ak je to možné)
    if (result.data && result.data.chat && result.data.chat.username) {
        var messageUrl = "https://t.me/" + result.data.chat.username + "/" + result.messageId;
        utils.safeSet(currentEntry, CONFIG.fields.messageUrl, messageUrl);
    }
    
    // Ulož celú response pre debugging
    utils.safeSet(currentEntry, CONFIG.fields.responseData, JSON.stringify(result.data));
    
    utils.addInfo(currentEntry, "Správa úspešne odoslaná", {
        messageId: result.messageId,
        chatId: result.data.chat.id,
        chatTitle: result.data.chat.title || result.data.chat.username || "N/A"
    });
}

function updateStatus(newStatus, errorMessage) {
    utils.safeSet(currentEntry, CONFIG.fields.status, newStatus);
    
    if (errorMessage) {
        utils.safeSet(currentEntry, CONFIG.fields.poslednaChyba, errorMessage);
    }
    
    utils.addInfo(currentEntry, "Status zmenený na: " + newStatus, {
        previousStatus: CONFIG.fields.statusValues.waiting,
        errorMessage: errorMessage || "N/A"
    });
}

function incrementRetryCount() {
    var retryCount = utils.safeGet(currentEntry, CONFIG.fields.retryCount, 0);
    retryCount++;
    
    utils.safeSet(currentEntry, CONFIG.fields.retryCount, retryCount);
    utils.safeSet(currentEntry, CONFIG.fields.pokusovOdoslanie, retryCount);
    
    if (retryCount < CONFIG.settings.maxRetries) {
        // Nastav next retry time s exponential backoff
        var delayMs = CONFIG.settings.retryDelayMs[Math.min(retryCount - 1, CONFIG.settings.retryDelayMs.length - 1)];
        var nextRetry = moment().add(delayMs, 'milliseconds');
        
        utils.safeSet(currentEntry, CONFIG.fields.nextRetryAt, nextRetry.toDate());
        utils.addDebug(currentEntry, "⏰ Ďalší pokus o: " + nextRetry.format("HH:mm:ss"));
    }
}

function processResults(results, totalTargets) {
    if (results.success === totalTargets) {
        updateStatus(CONFIG.fields.statusValues.sent);
        utils.addDebug(currentEntry, "✅ Všetky správy odoslané (" + results.success + "/" + totalTargets + ")");
        
    } else if (results.success > 0) {
        updateStatus(CONFIG.fields.statusValues.sent, 
                    "Čiastočne odoslané: " + results.success + "/" + totalTargets);
        utils.addDebug(currentEntry, "⚠️ Čiastočný úspech: " + results.success + "/" + totalTargets);
        
    } else if (results.skipped === totalTargets) {
        utils.addDebug(currentEntry, "⏭️ Všetky správy preskočené (limity/čas)");
        // Zostáva status "Čaká" pre neskorší pokus
        
    } else {
        var retryCount = utils.safeGet(currentEntry, CONFIG.fields.retryCount, 0);
        if (retryCount < CONFIG.settings.maxRetries - 1) {
            utils.addDebug(currentEntry, "🔄 Nastavujem retry #" + (retryCount + 1));
            // Status zostáva "Čaká" pre retry
        } else {
            updateStatus(CONFIG.fields.statusValues.failed, 
                        "Všetky správy zlyhali po " + CONFIG.settings.maxRetries + " pokusoch");
            utils.addError(currentEntry, "Všetky správy zlyhali", CONFIG.scriptName);
        }
    }
}

// ==============================================
// OPAKOVANIE SPRÁV
// ==============================================

function shouldCreateRepetition() {
    var opakovat = currentEntry.field(CONFIG.fields.opakovat);
    var status = currentEntry.field(CONFIG.fields.status);
    
    return opakovat && opakovat !== "Nie" && status === CONFIG.fields.statusValues.sent;
}

function createNextRepetition() {
    try {
        var opakovat = currentEntry.field(CONFIG.fields.opakovat);
        var now = moment();
        var nextTime;
        
        switch (opakovat) {
            case "Každý deň":
                nextTime = now.add(1, 'day').startOf('day').add(9, 'hours');
                break;
            case "Každý týždeň":
                nextTime = now.add(1, 'week').startOf('week').add(1, 'day').add(9, 'hours');
                break;
            case "Každý mesiac":
                nextTime = now.add(1, 'month').startOf('month').add(9, 'hours');
                break;
            default:
                return;
        }
        
        // Vytvor novú notifikáciu
        var newData = {
            status: CONFIG.fields.statusValues.scheduled,
            typSpravy: currentEntry.field(CONFIG.fields.typSpravy),
            sprava: currentEntry.field(CONFIG.fields.sprava),
            predmet: currentEntry.field(CONFIG.fields.predmet),
            formatovanie: currentEntry.field(CONFIG.fields.formatovanie),
            priorita: currentEntry.field(CONFIG.fields.priorita),
            adresat: currentEntry.field(CONFIG.fields.adresat),
            poslatO: nextTime.toDate(),
            opakovat: opakovat,
            zdrojovaKniznica: lib().name,
            zdrojovyId: currentEntry.field("ID")
        };
        
        // Skopíruj prepojenia na adresátov
        copyAddresseeLinks(newData);
        
        // Vytvor novú notifikáciu
        var newNotification = lib().create(newData);
        
        if (newNotification) {
            utils.addInfo(currentEntry, "Vytvorená opakovaná notifikácia", {
                newId: newNotification.field("ID"),
                scheduledFor: nextTime.format("DD.MM.YYYY HH:mm"),
                repetitionType: opakovat
            });
        }
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri vytváraní opakovania: " + error.toString(), 
                      CONFIG.scriptName, error);
    }
}

function copyAddresseeLinks(newData) {
    var addresseeType = currentEntry.field(CONFIG.fields.adresat);
    
    switch (addresseeType) {
        case CONFIG.addresseeTypes.EMPLOYEE:
            var employees = utils.safeGetLinks(currentEntry, CONFIG.fields.zamestnanec);
            if (employees.length > 0) {
                newData[CONFIG.fields.zamestnanec] = employees;
            }
            break;
            
        case CONFIG.addresseeTypes.GROUP:
        case CONFIG.addresseeTypes.GROUP_THREAD:
            var groups = utils.safeGetLinks(currentEntry, CONFIG.fields.skupinaTema);
            if (groups.length > 0) {
                newData[CONFIG.fields.skupinaTema] = groups;
            }
            break;
            
        case CONFIG.addresseeTypes.CLIENT:
            var clients = utils.safeGetLinks(currentEntry, CONFIG.fields.klient);
            if (clients.length > 0) {
                newData[CONFIG.fields.klient] = clients;
            }
            break;
            
        case CONFIG.addresseeTypes.PARTNER:
            var partners = utils.safeGetLinks(currentEntry, CONFIG.fields.partner);
            if (partners.length > 0) {
                newData[CONFIG.fields.partner] = partners;
            }
            break;
            
        case CONFIG.addresseeTypes.ORDER:
            var orders = utils.safeGetLinks(currentEntry, CONFIG.fields.zakazka);
            if (orders.length > 0) {
                newData[CONFIG.fields.zakazka] = orders;
            }
            break;
    }
}

// ==============================================
// N8N INTEGRÁCIA
// ==============================================

function triggerN8NIfConfigured(results) {
    try {
        var settings = utils.getSettings(CONFIG.libraries.defaults);
        if (!settings || !settings["N8N Webhook URL"]) {
            return;
        }
        
        var workflowData = {
            notificationId: currentEntry.field("ID"),
            type: currentEntry.field(CONFIG.fields.typSpravy),
            status: currentEntry.field(CONFIG.fields.status),
            addresseeType: currentEntry.field(CONFIG.fields.adresat),
            priority: currentEntry.field(CONFIG.fields.priorita),
            results: {
                sent: results.success,
                failed: results.failed,
                skipped: results.skipped,
                total: results.success + results.failed + results.skipped,
                details: results.details
            },
            telegram: {
                messageId: currentEntry.field(CONFIG.fields.messageId),
                messageUrl: currentEntry.field(CONFIG.fields.messageUrl),
                sentAt: currentEntry.field(CONFIG.fields.odoslaneO)
            },
            metadata: {
                retryCount: utils.safeGet(currentEntry, CONFIG.fields.retryCount, 0),
                sourceLibrary: currentEntry.field(CONFIG.fields.zdrojovaKniznica),
                sourceId: currentEntry.field(CONFIG.fields.zdrojovyId),
                createdBy: currentEntry.field(CONFIG.fields.vytvoril)
            }
        };
        
        // Zavolaj N8N webhook
        var httpResult = utils.httpRequest("POST", settings["N8N Webhook URL"], workflowData, {
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": settings["N8N API Key"] || ""
            }
        });
        
        if (httpResult.success) {
            utils.addDebug(currentEntry, "✅ N8N webhook notifikovaný");
            utils.addInfo(currentEntry, "N8N workflow spustený", {
                webhookUrl: settings["N8N Webhook URL"].substring(0, 50) + "...",
                responseCode: httpResult.code
            });
        } else {
            utils.addDebug(currentEntry, "⚠️ N8N webhook zlyhal: " + httpResult.error);
        }
        
    } catch (error) {
        utils.addError(currentEntry, "N8N integrácia zlyhala: " + error.toString(), 
                      CONFIG.scriptName, error);
    }
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

function escapeHtml(text) {
    if (!text) return "";
    
    return text.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/"/g, "&quot;")
               .replace(/'/g, "&#039;");
}

// ==============================================
// KOMPATIBILITA A PRÍLOHY
// ==============================================

function checkAndProcessAttachment() {
    var priloha = currentEntry.field(CONFIG.fields.priloha);
    if (!priloha || priloha.length === 0) return null;
    
    try {
        // Memento nepodporuje priame odosielanie súborov cez Telegram API
        // Môžeme len poskytnúť link na stiahnutie
        utils.addDebug(currentEntry, "📎 Príloha detekovaná - funkcia v development");
        
        // TODO: Implementovať upload na cloud a získanie verejného linku
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri spracovaní prílohy: " + error.toString(), 
                      CONFIG.scriptName, error);
    }
    
    return null;
}

// ==============================================
// SPUSTENIE HLAVNEJ FUNKCIE
// ==============================================

main();