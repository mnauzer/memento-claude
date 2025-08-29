// ==============================================
// NOTIFICATIONS CREATING TRIGGER - Odoslanie na Telegram
// Verzia: 2.1 | Dátum: August 2025 | Autor: ASISTANTO
// Knižnica: Notifications | Trigger: Creating a new entry
// ==============================================
// 📋 FUNKCIA:
//    - Automatické odoslanie notifikácie na Telegram
//    - Kontrola časových obmedzení (pracovný čas, víkendy)
//    - Kontrola duplicitného odoslania
//    - Dynamické formátovanie (HTML/Markdown/Text)
//    - Inteligentné error handling
//    - Update statusu po odoslaní
// ==============================================
// 🔧 ZMENY v2.1:
//    - Vrátené časové kontroly
//    - Status "Čaká" pre nesplnené časové podmienky
//    - Pripravené pre scheduled trigger
// ==============================================

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var centralConfig = utils.config;
var currentEntry = entry();

var CONFIG = {
    scriptName: "Notifications Creating Trigger",
    version: "2.1",
    
    // Referencie na centrálny config
    fields: centralConfig.fields.notifications,
    telegramFields: centralConfig.fields.telegramGroups,
    icons: centralConfig.icons,
    
    // Lokálne nastavenia
    settings: {
        maxRetries: 3,
        retryDelay: 5000, // ms
        defaultFormatting: "Markdown"
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, utils.getIcon("start") + " === " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        
        // 1. Kontrola statusu
        var status = utils.safeGet(currentEntry, CONFIG.fields.status, "");
        utils.addDebug(currentEntry, "Status: " + status);
        
        if (status !== "Čaká") {
            utils.addDebug(currentEntry, utils.getIcon("info") + " Status '" + status + "' - nič nerobím");
            return true;
        }
        
        // 2. Kontrola duplicitného odoslania
        var existingMessageId = utils.safeGet(currentEntry, CONFIG.fields.messageId);
        if (existingMessageId) {
            utils.addDebug(currentEntry, utils.getIcon("warning") + " Notifikácia už bola odoslaná (Message ID: " + existingMessageId + ")");
            utils.safeSet(currentEntry, CONFIG.fields.status, "Duplicita");
            return true;
        }
        
        // 3. Validácia potrebných polí
        var requiredFields = [CONFIG.fields.chatId, CONFIG.fields.message];
        if (!utils.validateRequiredFields(currentEntry, requiredFields)) {
            utils.addError(currentEntry, "Chýbajú povinné polia", "main");
            utils.safeSet(currentEntry, CONFIG.fields.status, "Chyba");
            utils.safeSet(currentEntry, CONFIG.fields.lastError, "Chýbajú povinné polia");
            return false;
        }
        
        // 4. Kontrola časových obmedzení
        var telegramGroup = utils.safeGet(currentEntry, CONFIG.fields.groupOrTopic);
        if (telegramGroup && telegramGroup.length > 0) {
            telegramGroup = telegramGroup[0]; // Link to Entry je array
            
            if (!checkTimeRestrictions(telegramGroup)) {
                utils.addDebug(currentEntry, utils.getIcon("time") + " Nesplnené časové podmienky - správa čaká na vhodný čas");
                // Status ostáva "Čaká" pre scheduled trigger
                return true;
            }
        }
        
        // 5. Získanie dát pre odoslanie
        var chatId = utils.safeGet(currentEntry, CONFIG.fields.chatId);
        var message = utils.safeGet(currentEntry, CONFIG.fields.message);
        var threadId = utils.safeGet(currentEntry, CONFIG.fields.threadId);
        var formatting = utils.safeGet(currentEntry, CONFIG.fields.formatting, CONFIG.settings.defaultFormatting);
        var priority = utils.safeGet(currentEntry, CONFIG.fields.priority, "Normálna");
        
        utils.addDebug(currentEntry, "Chat ID: " + chatId);
        utils.addDebug(currentEntry, "Thread ID: " + (threadId || "žiadny"));
        utils.addDebug(currentEntry, "Formátovanie: " + formatting);
        utils.addDebug(currentEntry, "Priorita: " + priority);
        
        // 6. Príprava možností odoslania
        var sendOptions = {
            parseMode: formatting === "Text" ? undefined : formatting,
            disableNotification: priority === "Nízka",
            disablePreview: true
        };
        
        // Pridaj thread ID ak existuje
        if (threadId) {
            sendOptions.threadId = threadId;
        }
        
        // 7. Odoslanie na Telegram
        utils.addDebug(currentEntry, utils.getIcon("telegram") + " Odosielam na Telegram...");
        
        var result = utils.sendTelegramMessage(chatId, message, sendOptions);
        
        // 8. Spracovanie výsledku
        if (result && result.success) {
            // Úspešné odoslanie
            utils.safeSet(currentEntry, CONFIG.fields.status, "Odoslané");
            utils.safeSet(currentEntry, CONFIG.fields.messageId, result.messageId);
            utils.safeSet(currentEntry, CONFIG.fields.lastMessage, new Date());
            
            // Vyčisti chybové pole
            utils.safeSet(currentEntry, CONFIG.fields.lastError, "");
            
            // Aktualizuj počítadlo
            var messageCount = utils.safeGet(currentEntry, CONFIG.fields.messageCount, 0);
            utils.safeSet(currentEntry, CONFIG.fields.messageCount, messageCount + 1);
            
            // Aktualizuj štatistiky skupiny
            updateGroupStats(telegramGroup);
            
            utils.addDebug(currentEntry, utils.getIcon("success") + " Notifikácia odoslaná (Message ID: " + result.messageId + ")");
            
        } else {
            // Chyba pri odoslaní
            var errorMessage = result ? result.error : "Neznáma chyba";
            
            // Rozlíš typy chýb
            var errorStatus = categorizeError(errorMessage);
            
            utils.safeSet(currentEntry, CONFIG.fields.status, errorStatus);
            utils.safeSet(currentEntry, CONFIG.fields.lastError, errorMessage);
            utils.safeSet(currentEntry, CONFIG.fields.lastUpdate, new Date());
            
            // Aktualizuj retry counter
            var retryCount = utils.safeGet(currentEntry, CONFIG.fields.retryCount, 0);
            utils.safeSet(currentEntry, CONFIG.fields.retryCount, retryCount + 1);
            
            utils.addError(currentEntry, "Odoslanie zlyhalo: " + errorMessage, "main");
        }
        
        utils.addDebug(currentEntry, utils.getIcon("success") + " === SCRIPT DOKONČENÝ ===");
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        utils.safeSet(currentEntry, CONFIG.fields.status, "Kritická chyba");
        utils.safeSet(currentEntry, CONFIG.fields.lastError, error.toString());
        return false;
    }
}

// ==============================================
// ČASOVÉ KONTROLY
// ==============================================

/**
 * Kontroluje časové obmedzenia pre odoslanie
 * @param {Entry} telegramGroup - Telegram skupina s nastaveniami
 * @returns {boolean} true ak možno odoslať
 */
function checkTimeRestrictions(telegramGroup) {
    try {
        var now = moment();
        
        // 1. Kontrola víkendu
        if (utils.isWeekend(now)) {
            var weekendAllowed = utils.safeGet(telegramGroup, CONFIG.telegramFields.weekendEnabled, false);
            if (!weekendAllowed) {
                utils.addDebug(currentEntry, utils.getIcon("warning") + " Víkendové správy nie sú povolené pre túto skupinu");
                return false;
            }
        }
        
        // 2. Kontrola sviatku
        if (utils.isHoliday(now)) {
            // Sviatky považujeme ako víkendy
            var weekendAllowed = utils.safeGet(telegramGroup, CONFIG.telegramFields.weekendEnabled, false);
            if (!weekendAllowed) {
                utils.addDebug(currentEntry, utils.getIcon("warning") + " Správy počas sviatkov nie sú povolené");
                return false;
            }
        }
        
        // 3. Kontrola pracovného času
        var workTimeFrom = utils.safeGet(telegramGroup, CONFIG.telegramFields.workTimeFrom);
        var workTimeTo = utils.safeGet(telegramGroup, CONFIG.telegramFields.workTimeTo);
        
        if (workTimeFrom && workTimeTo) {
            var currentTime = now.format("HH:mm");
            var fromTime = moment(workTimeFrom).format("HH:mm");
            var toTime = moment(workTimeTo).format("HH:mm");
            
            // Kontrola či je aktuálny čas v rozmedzí
            var isInWorkTime = isTimeInRange(currentTime, fromTime, toTime);
            
            if (!isInWorkTime) {
                utils.addDebug(currentEntry, utils.getIcon("time") + " Mimo pracovného času (" + fromTime + " - " + toTime + ")");
                utils.addDebug(currentEntry, "  • Aktuálny čas: " + currentTime);
                return false;
            }
        }
        
        // 4. Kontrola denného limitu správ
        var dailyLimit = utils.safeGet(telegramGroup, CONFIG.telegramFields.dailyMessageLimit, 0);
        if (dailyLimit > 0) {
            var todayMessages = getTodayMessageCount(telegramGroup);
            if (todayMessages >= dailyLimit) {
                utils.addDebug(currentEntry, utils.getIcon("warning") + " Prekročený denný limit správ (" + todayMessages + "/" + dailyLimit + ")");
                return false;
            }
        }
        
        utils.addDebug(currentEntry, utils.getIcon("checkmark") + " Časové podmienky splnené");
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "checkTimeRestrictions", error);
        return true; // Pri chybe povoľ odoslanie
    }
}

/**
 * Kontroluje či je čas v rozmedzí
 * @param {string} time - Kontrolovaný čas (HH:mm)
 * @param {string} from - Začiatok rozmedzia (HH:mm)
 * @param {string} to - Koniec rozmedzia (HH:mm)
 * @returns {boolean} true ak je čas v rozmedzí
 */
function isTimeInRange(time, from, to) {
    var timeMoment = moment(time, "HH:mm");
    var fromMoment = moment(from, "HH:mm");
    var toMoment = moment(to, "HH:mm");
    
    // Ak je koniec pred začiatkom, ide cez polnoc
    if (toMoment.isBefore(fromMoment)) {
        return timeMoment.isSameOrAfter(fromMoment) || timeMoment.isSameOrBefore(toMoment);
    } else {
        return timeMoment.isSameOrAfter(fromMoment) && timeMoment.isSameOrBefore(toMoment);
    }
}

/**
 * Získa počet správ odoslaných dnes do skupiny
 * @param {Entry} telegramGroup - Telegram skupina
 * @returns {number} Počet správ dnes
 */
function getTodayMessageCount(telegramGroup) {
    try {
        // Tu by si mohol implementovať logiku na počítanie správ
        // Zatiaľ vrátime 0
        return 0;
    } catch (error) {
        return 0;
    }
}

/**
 * Aktualizuje štatistiky skupiny po úspešnom odoslaní
 * @param {Entry} telegramGroup - Telegram skupina
 */
function updateGroupStats(telegramGroup) {
    try {
        if (!telegramGroup) return;
        
        var currentCount = utils.safeGet(telegramGroup, CONFIG.telegramFields.messageCount, 0);
        var totalCount = utils.safeGet(telegramGroup, CONFIG.telegramFields.totalMessageCount, 0);
        
        telegramGroup.set(CONFIG.telegramFields.messageCount, currentCount + 1);
        telegramGroup.set(CONFIG.telegramFields.totalMessageCount, totalCount + 1);
        telegramGroup.set(CONFIG.telegramFields.lastMessage, new Date());
        
    } catch (error) {
        // Ignoruj chyby štatistík
    }
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

/**
 * Kategorizuje chybu pre lepší status
 * @param {string} errorMessage - Chybová správa
 * @returns {string} Kategória chyby
 */
function categorizeError(errorMessage) {
    if (!errorMessage) return "Zlyhalo";
    
    var error = errorMessage.toLowerCase();
    
    if (error.includes("chat not found") || error.includes("chat_id_invalid")) {
        return "Neplatný chat";
    } else if (error.includes("message is too long") || error.includes("message_too_long")) {
        return "Príliš dlhá správa";
    } else if (error.includes("forbidden") || error.includes("bot was blocked")) {
        return "Bot blokovaný";
    } else if (error.includes("too many requests") || error.includes("429")) {
        return "Rate limit";
    } else if (error.includes("parse_mode") || error.includes("can't parse")) {
        return "Chyba formátovania";
    } else if (error.includes("network") || error.includes("timeout")) {
        return "Sieťová chyba";
    } else if (error.includes("thread_id_invalid")) {
        return "Neplatné vlákno";
    }
    
    return "Zlyhalo";
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

// Kontrola závislostí
var dependencyCheck = utils.checkDependencies(['config', 'core']);
if (!dependencyCheck.success) {
    message("❌ Chýbajú potrebné moduly: " + dependencyCheck.missing.join(", "));
    cancel();
}

// Spustenie hlavnej funkcie
var result = main();

// Ak hlavná funkcia zlyhala, zruš vytvorenie záznamu
if (!result) {
    utils.addError(currentEntry, "Script zlyhal - ruším vytvorenie záznamu", "main");
    cancel();
}