// ==============================================
// CREATING TRIGGER - ASISTANTO NOTIFICATIONS
// Verzia: 4.0 | Dátum: 20.08.2025 | Autor: ASISTANTO
// Knižnica: ASISTANTO Notifications | Trigger: Creating
// ==============================================
// 📋 FUNKCIA:
//    - Automaticky spracováva novo vytvorené notifikácie
//    - Routing podľa typu adresáta (Zamestnanec, Skupina, Téma, Zákazka)
//    - Odošle správy cez Telegram API s retry logikou
//    - N8N workflow integrácia
// ✅ v4.0 KOMPLETNÝ REFAKTORING:
//    - Využitie ASISTANTO Notifications Helper funkcií
//    - Zjednodušená štruktúra (z 800+ na ~400 riadkov)
//    - Jednotné API s ostatnými scriptami
//    - N8N integrácia cez MementoAI modul
//    - Odstránená duplicitná logika
// ==============================================

// Import knižníc
var utils = MementoUtils;
var notifHelper = ASISTANTONotifications;
var currentEntry = entry();

// ==============================================
// KONFIGURÁCIA
// ==============================================

var CONFIG = {
    debug: true,
    version: "4.0",
    scriptName: "Notifications Creating Trigger",
    
    // Využívame Helper CONFIG pre konzistentnosť
    helperConfig: notifHelper.CONFIG,
    
    // Trigger-špecifické nastavenia
    settings: {
        maxRetries: 3,
        retryDelayMs: [1000, 5000, 15000], // 1s, 5s, 15s
        n8nIntegration: true,
        workingHoursCheck: true,
        dailyLimitCheck: true
    },
    
    // Knižnice
    libraries: {
        telegramGroups: "Telegram Groups",
        defaults: "ASISTANTO Defaults",
        zamestnanci: "Zamestnanci"
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.clearLogs(currentEntry, false);
        utils.addDebug(currentEntry, "🚀 === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        
        // 1. Validácia statusu a základné kontroly
        if (!validateNotificationStatus()) {
            return;
        }
        
        // 2. Kontrola časovania a retry logiky
        if (!checkTimingAndRetry()) {
            return;
        }
        
        // 3. Získanie cieľových adresátov
        var targets = getNotificationTargets();
        if (!targets || targets.length === 0) {
            updateNotificationStatus("failed", "Žiadni adresáti nenájdení");
            return;
        }
        
        utils.addDebug(currentEntry, "🎯 Počet cieľov: " + targets.length);
        
        // 4. Spracovanie všetkých cieľov
        var results = processAllTargets(targets);
        
        // 5. Vyhodnotenie výsledkov a update statusu
        processResults(results, targets.length);
        
        // 6. N8N workflow integrácia
        if (CONFIG.settings.n8nIntegration) {
            triggerN8NWorkflow(results);
        }
        
        // 7. Kontrola opakovania
        if (shouldCreateRepetition()) {
            createNextRepetition();
        }
        
        utils.addDebug(currentEntry, "✅ === KONIEC TRIGGER SPRACOVANIA ===");
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba: " + error.toString(), CONFIG.scriptName, error);
        updateNotificationStatus("failed", "Kritická chyba: " + error.toString());
    }
}

// ==============================================
// VALIDÁCIA A KONTROLY
// ==============================================

function validateNotificationStatus() {
    var status = currentEntry.field("Status");
    utils.addDebug(currentEntry, "📊 Aktuálny status: " + status);
    
    if (status !== "Čaká") {
        utils.addDebug(currentEntry, "⏭️ Preskakujem - status nie je 'Čaká'");
        return false;
    }
    
    // Kontrola vypršania
    var vyprsat = currentEntry.field("Vypršať o");
    if (vyprsat && moment(vyprsat).isBefore(moment())) {
        utils.addDebug(currentEntry, "⏰ Notifikácia vypršala");
        updateNotificationStatus("expired", "Notifikácia vypršala");
        return false;
    }
    
    return true;
}

function checkTimingAndRetry() {
    // Kontrola retry timing
    var retryCount = utils.safeGet(currentEntry, "Retry Count", 0);
    if (retryCount > 0) {
        var nextRetryAt = currentEntry.field("Next Retry At");
        if (nextRetryAt && moment(nextRetryAt).isAfter(moment())) {
            utils.addDebug(currentEntry, "⏳ Čakám na retry...");
            return false;
        }
    }
    
    // Kontrola naplánovaného času
    var poslatO = currentEntry.field("Poslať o");
    if (poslatO && moment(poslatO).isAfter(moment())) {
        utils.addDebug(currentEntry, "⏰ Naplánované na: " + utils.formatDate(poslatO, "DD.MM.YYYY HH:mm"));
        return false;
    }
    
    return true;
}

// ==============================================
// ZÍSKANIE CIEĽOVÝCH ADRESÁTOV
// ==============================================

function getNotificationTargets() {
    var addresseeType = currentEntry.field("Adresát");
    utils.addDebug(currentEntry, "📬 Typ adresáta: " + addresseeType);
    
    switch (addresseeType) {
        case "Zamestnanec":
            return getEmployeeTargets();
        case "Skupina":
        case "Skupina-Téma":
            return getGroupTargets();
        case "Klient":
            return getClientTargets();
        case "Partner":
            return getPartnerTargets();
        case "Zákazka":
            return getOrderTargets();
        default:
            utils.addError(currentEntry, "Neznámy typ adresáta: " + addresseeType, CONFIG.scriptName);
            return [];
    }
}

function getEmployeeTargets() {
    var targets = [];
    var employees = utils.safeGetLinks(currentEntry, "Zamestnanec");
    
    for (var i = 0; i < employees.length; i++) {
        var emp = employees[i];
        var telegramId = utils.safeGet(emp, "Telegram ID", null);
        var enabled = utils.safeGet(emp, "telegram", false);
        
        if (telegramId && enabled) {
            targets.push({
                type: "employee",
                chatId: telegramId,
                entity: emp,
                name: utils.formatEmployeeName(emp),
                settings: getDefaultWorkingHours()
            });
            
            utils.addDebug(currentEntry, "✅ Zamestnanec: " + utils.formatEmployeeName(emp));
        } else {
            utils.addDebug(currentEntry, "⏭️ Preskakujem: " + utils.formatEmployeeName(emp) + " - Telegram neaktívny");
        }
    }
    
    return targets;
}

function getGroupTargets() {
    var targets = [];
    var groups = utils.safeGetLinks(currentEntry, "Skupina/Téma");
    
    for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        var chatId = utils.safeGet(group, "Chat ID", null);
        var threadId = utils.safeGet(group, "Thread ID", null);
        var enabled = utils.safeGet(group, "Povoliť notifikácie", true);
        
        if (chatId && enabled) {
            targets.push({
                type: threadId ? "group_thread" : "group",
                chatId: chatId,
                threadId: threadId,
                entity: group,
                name: utils.safeGet(group, "Názov skupiny", "Skupina"),
                settings: extractGroupSettings(group)
            });
            
            utils.addDebug(currentEntry, "✅ " + (threadId ? "Téma" : "Skupina") + ": " + 
                          utils.safeGet(group, "Názov skupiny", "Skupina"));
        }
    }
    
    return targets;
}

function getClientTargets() {
    var targets = [];
    var clients = utils.safeGetLinks(currentEntry, "Klient");
    
    for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        var telegramId = utils.safeGet(client, "Telegram ID", null);
        
        if (telegramId) {
            targets.push({
                type: "client",
                chatId: telegramId,
                entity: client,
                name: utils.safeGet(client, "Názov", "Klient"),
                settings: getDefaultWorkingHours()
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
// NASTAVENIA A PRACOVNÉ HODINY
// ==============================================

function getDefaultWorkingHours() {
    return {
        workingHoursEnabled: false, // Pre zamestnancov defaultne vypnuté
        weekendEnabled: true,
        dailyLimit: 0 // Bez limitu
    };
}

function extractGroupSettings(group) {
    return {
        workingHoursEnabled: utils.safeGet(group, "Povoliť notifikácie", true),
        workingHoursFrom: utils.safeGet(group, "Pracovný čas od", null),
        workingHoursTo: utils.safeGet(group, "Pracovný čas do", null),
        weekendEnabled: utils.safeGet(group, "Víkend povolený", false),
        dailyLimit: utils.safeGet(group, "Denný limit správ", 0),
        sentToday: utils.safeGet(group, "Počet správ dnes", 0),
        silentMode: utils.safeGet(group, "Tichá správa", false)
    };
}

function checkWorkingHours(target) {
    if (!target.settings || !target.settings.workingHoursEnabled) return true;
    
    var now = moment();
    var dayOfWeek = now.day();
    
    // Kontrola víkendu
    if ((dayOfWeek === 0 || dayOfWeek === 6) && !target.settings.weekendEnabled) {
        utils.addDebug(currentEntry, "🚫 Víkend - notifikácie zakázané pre " + target.name);
        return false;
    }
    
    // Kontrola pracovného času
    if (target.settings.workingHoursFrom && target.settings.workingHoursTo) {
        var from = moment(target.settings.workingHoursFrom, "HH:mm");
        var to = moment(target.settings.workingHoursTo, "HH:mm");
        var nowTime = moment(now.format("HH:mm"), "HH:mm");
        
        if (!nowTime.isBetween(from, to)) {
            utils.addDebug(currentEntry, "⏰ Mimo pracovného času pre " + target.name);
            return false;
        }
    }
    
    return true;
}

function checkDailyLimit(target) {
    if (!target.settings || !target.settings.dailyLimit) return true;
    
    var limit = target.settings.dailyLimit;
    var sentToday = target.settings.sentToday || 0;
    
    if (limit > 0 && sentToday >= limit) {
        utils.addDebug(currentEntry, "📊 Prekročený denný limit pre " + target.name + ": " + sentToday + "/" + limit);
        return false;
    }
    
    return true;
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
        utils.addDebug(currentEntry, "\n📤 Spracovávam cieľ " + (i + 1) + "/" + targets.length + ": " + target.name);
        
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
        // Kontroly pred odoslaním
        if (!checkDailyLimit(target)) {
            return {
                status: "skipped",
                reason: "Prekročený denný limit",
                target: target
            };
        }
        
        if (!checkWorkingHours(target)) {
            return {
                status: "skipped",
                reason: "Mimo pracovného času",
                target: target
            };
        }
        
        // Príprava správy pomocou Helper funkcií
        var message = preparePersonalizedMessage(target);
        var options = prepareMessageOptions(target);
        
        // Odoslanie cez utils (MementoTelegram)
        var result = utils.sendTelegramMessage(target.chatId, message, options);
        
        if (result.success) {
            // Ulož detaily odpovede
            saveSuccessfulResponse(result);
            
            // Aktualizuj denný počítadlo pre skupiny
            updateDailyCounter(target);
            
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
        utils.addError(currentEntry, "Chyba pri spracovaní cieľa: " + error.toString(), CONFIG.scriptName, error);
        return {
            status: "failed",
            error: error.toString(),
            target: target
        };
    }
}

// ==============================================
// PRÍPRAVA SPRÁVY
// ==============================================

function preparePersonalizedMessage(target) {
    var message = currentEntry.field("Správa") || "";
    var predmet = currentEntry.field("Predmet");
    var formatovanie = currentEntry.field("Formátovanie") || "HTML";
    
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
    
    // Personalizácia pomocou Helper funkcie
    if (target.entity) {
        message = notifHelper.personalizeMessage(message, target.entity);
    }
    
    // Metadata footer
    message += createMetadataFooter(formatovanie);
    
    return message;
}

function prepareMessageOptions(target) {
    var options = {
        parseMode: currentEntry.field("Formátovanie") || "HTML"
    };
    
    // Thread ID pre skupiny
    if (target.threadId) {
        options.messageThreadId = target.threadId;
    }
    
    // Silent mode
    if (target.settings && target.settings.silentMode) {
        options.silent = true;
    }
    
    // Urgentné správy majú tlačidlo
    var priorita = currentEntry.field("Priorita");
    if (priorita === "Urgentná") {
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

function createMetadataFooter(formatovanie) {
    var footer = "\n\n";
    
    if (formatovanie === "HTML") {
        footer += "<i>";
        footer += utils.formatDate(moment(), "DD.MM HH:mm");
        footer += " | " + currentEntry.field("Typ správy");
        footer += " | #" + currentEntry.field("ID");
        footer += "</i>";
    } else {
        footer += "_";
        footer += utils.formatDate(moment(), "DD.MM HH:mm");
        footer += " | " + currentEntry.field("Typ správy");
        footer += " | #" + currentEntry.field("ID");
        footer += "_";
    }
    
    return footer;
}

function escapeHtml(text) {
    if (!text) return "";
    
    return text.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/"/g, "&quot;")
               .replace(/'/g, "&#039;");
}

// ==============================================
// RESPONSE HANDLING
// ==============================================

function saveSuccessfulResponse(result) {
    // Ulož Message ID a čas odoslania
    utils.safeSet(currentEntry, "Message ID", result.messageId);
    utils.safeSet(currentEntry, "Odoslané o", moment().toDate());
    
    // Response data pre debugging
    if (result.data) {
        utils.safeSet(currentEntry, "Response Data", JSON.stringify(result.data));
        
        // URL na správu ak je možné
        if (result.data.chat && result.data.chat.username) {
            var messageUrl = "https://t.me/" + result.data.chat.username + "/" + result.messageId;
            utils.safeSet(currentEntry, "Message URL", messageUrl);
        }
    }
    
    utils.addInfo(currentEntry, "Správa úspešne odoslaná", {
        messageId: result.messageId,
        chatId: result.data.chat.id,
        chatTitle: result.data.chat.title || result.data.chat.username || "N/A"
    });
}

function updateDailyCounter(target) {
    // Aktualizuj denný počítadlo pre skupiny
    if (target.type.indexOf("group") === 0 && target.entity) {
        try {
            var currentCount = utils.safeGet(target.entity, "Počet správ dnes", 0);
            utils.safeSet(target.entity, "Počet správ dnes", currentCount + 1);
        } catch (error) {
            // Ignoruj chybu aktualizácie počítadla
        }
    }
}

function incrementRetryCount() {
    var retryCount = utils.safeGet(currentEntry, "Retry Count", 0);
    retryCount++;
    
    utils.safeSet(currentEntry, "Retry Count", retryCount);
    utils.safeSet(currentEntry, "Pokusov o odoslanie", retryCount);
    
    if (retryCount < CONFIG.settings.maxRetries) {
        // Nastav next retry time s exponential backoff
        var delayMs = CONFIG.settings.retryDelayMs[Math.min(retryCount - 1, CONFIG.settings.retryDelayMs.length - 1)];
        var nextRetry = moment().add(delayMs, 'milliseconds');
        
        utils.safeSet(currentEntry, "Next Retry At", nextRetry.toDate());
        utils.addDebug(currentEntry, "⏰ Ďalší pokus o: " + nextRetry.format("HH:mm:ss"));
    }
}

function updateNotificationStatus(newStatus, errorMessage) {
    utils.safeSet(currentEntry, "Status", newStatus);
    
    if (errorMessage) {
        utils.safeSet(currentEntry, "Posledná chyba", errorMessage);
    }
    
    utils.addInfo(currentEntry, "Status zmenený na: " + newStatus, {
        previousStatus: "Čaká",
        errorMessage: errorMessage || "N/A"
    });
}

// ==============================================
// VYHODNOTENIE VÝSLEDKOV
// ==============================================

function processResults(results, totalTargets) {
    if (results.success === totalTargets) {
        updateNotificationStatus("Odoslané");
        utils.addDebug(currentEntry, "✅ Všetky správy odoslané (" + results.success + "/" + totalTargets + ")");
        
    } else if (results.success > 0) {
        updateNotificationStatus("Odoslané", "Čiastočne odoslané: " + results.success + "/" + totalTargets);
        utils.addDebug(currentEntry, "⚠️ Čiastočný úspech: " + results.success + "/" + totalTargets);
        
    } else if (results.skipped === totalTargets) {
        utils.addDebug(currentEntry, "⏭️ Všetky správy preskočené (limity/čas)");
        // Zostáva status "Čaká" pre neskorší pokus
        
    } else {
        var retryCount = utils.safeGet(currentEntry, "Retry Count", 0);
        if (retryCount < CONFIG.settings.maxRetries - 1) {
            utils.addDebug(currentEntry, "🔄 Nastavujem retry #" + (retryCount + 1));
            // Status zostáva "Čaká" pre retry
        } else {
            updateNotificationStatus("Zlyhalo", "Všetky správy zlyhali po " + CONFIG.settings.maxRetries + " pokusoch");
            utils.addError(currentEntry, "Všetky správy zlyhali", CONFIG.scriptName);
        }
    }
}

// ==============================================
// N8N INTEGRÁCIA
// ==============================================

function triggerN8NWorkflow(results) {
    try {
        // Používa Helper funkciu pre N8N integráciu
        if (notifHelper.triggerN8NIfConfigured) {
            var n8nResult = notifHelper.triggerN8NIfConfigured(currentEntry, {
                includeResults: true,
                results: results,
                scriptVersion: CONFIG.version
            });
            
            if (n8nResult.success) {
                utils.addDebug(currentEntry, "✅ N8N workflow spustený úspešne");
            } else {
                utils.addDebug(currentEntry, "⚠️ N8N workflow: " + (n8nResult.reason || n8nResult.error || "unknown"));
            }
        }
        
    } catch (error) {
        utils.addError(currentEntry, "N8N integrácia zlyhala: " + error.toString(), CONFIG.scriptName, error);
    }
}

// ==============================================
// OPAKOVANIE SPRÁV
// ==============================================

function shouldCreateRepetition() {
    var opakovat = currentEntry.field("Opakovať");
    var status = currentEntry.field("Status");
    
    return opakovat && opakovat !== "Nie" && status === "Odoslané";
}

function createNextRepetition() {
    try {
        var opakovat = currentEntry.field("Opakovať");
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
        
        // Vytvor novú notifikáciu pomocou Helper funkcie
        var newNotificationData = {
            typSpravy: currentEntry.field("Typ správy"),
            sprava: currentEntry.field("Správa"),
            predmet: currentEntry.field("Predmet"),
            formatovanie: currentEntry.field("Formátovanie"),
            priorita: currentEntry.field("Priorita"),
            adresat: currentEntry.field("Adresát"),
            poslatO: nextTime.toDate(),
            opakovat: opakovat,
            zdrojovaKniznica: lib().title,
            zdrojovyId: currentEntry.field("ID")
        };
        
        // Skopíruj prepojenia na adresátov
        copyAddresseeLinks(newNotificationData);
        
        var newNotification = notifHelper.createNotification(newNotificationData);
        
        if (newNotification) {
            utils.addInfo(currentEntry, "Vytvorená opakovaná notifikácia", {
                newId: newNotification.field("ID"),
                scheduledFor: nextTime.format("DD.MM.YYYY HH:mm"),
                repetitionType: opakovat
            });
        }
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri vytváraní opakovania: " + error.toString(), CONFIG.scriptName, error);
    }
}

function copyAddresseeLinks(newData) {
    var addresseeType = currentEntry.field("Adresát");
    
    // Skopíruj linky podľa typu adresáta
    var linkMappings = {
        "Zamestnanec": "Zamestnanec",
        "Skupina": "Skupina/Téma",
        "Skupina-Téma": "Skupina/Téma",
        "Klient": "Klient",
        "Partner": "Partner",
        "Zákazka": "Zákazka"
    };
    
    var fieldName = linkMappings[addresseeType];
    if (fieldName) {
        var links = utils.safeGetLinks(currentEntry, fieldName);
        if (links.length > 0) {
            newData[fieldName] = links;
        }
    }
}

// ==============================================
// SPUSTENIE HLAVNEJ FUNKCIE
// ==============================================

main();