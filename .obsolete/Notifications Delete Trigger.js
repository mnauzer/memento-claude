// ==============================================
// BEFORE DELETE TRIGGER - VYMAZANIE TELEGRAM SPRÁVY
// Verzia: 1.1 | Typ: Before Delete Trigger
// Knižnica: ASISTANTO Notifications
// ==============================================
// 📋 FUNKCIA:
//    - Pri vymazaní záznamu notifikácie vymaže aj správu z Telegramu
//    - Podporuje obyčajné chaty, skupiny aj témy (threads)
//    - Používa MementoUtils pre bezpečné operácie
//    - Loguje všetky operácie do ASISTANTO Errors
// ✅ v1.1: Logy sa zapisujú do ASISTANTO Errors knižnice
// ==============================================

var CONFIG = {
    debug: true,
    version: "1.1",
    scriptName: "Delete Telegram Message",
    scriptType: "Before Delete Trigger",
    
    // Knižnice
    apiLibrary: "ASISTANTO API",
    errorsLibrary: "ASISTANTO Errors",
    
    // Názvy polí v ASISTANTO Notifications
    fields: {
        chatId: "Chat ID",
        threadId: "Thread ID", 
        messageId: "Message ID",
        adresat: "Adresát",
        datum: "Dátum",
        message: "Message"
    },
    
    // Názvy polí v ASISTANTO Errors
    errorFields: {
        date: "date",
        mementoLibrary: "memento library",
        library: "library",
        script: "script",
        line: "line",
        text: "text",
        variables: "variables",
        parameters: "parameters",
        attributes: "attributes",
        note: "note",
        debugLog: "Debug_Log",
        errorLog: "Error_Log",
        info: "info",
        user: "user"
    }
};

// Globálne premenné
var currentEntry = entry();
var utils = null;
var errorEntry = null;
var startTime = moment();

// ==============================================
// INICIALIZÁCIA
// ==============================================

function initializeUtils() {
    try {
        if (typeof MementoUtils !== 'undefined' && MementoUtils !== null) {
            utils = MementoUtils;
            return true;
        }
    } catch (e) {}
    
    // Fallback funkcie
    utils = {
        safeGet: function(entry, field, defaultValue) {
            try {
                var value = entry.field(field);
                return (value !== null && value !== undefined) ? value : defaultValue;
            } catch (e) {
                return defaultValue;
            }
        },
        
        safeSet: function(entry, field, value) {
            try {
                entry.set(field, value);
                return true;
            } catch (e) {
                return false;
            }
        },
        
        addDebug: function(entry, message) {
            addDebug(message);
        },
        
        addError: function(entry, error, location) {
            addError(error, location);
        },
        
        addInfo: function(entry, message, details) {
            addInfo(message, details);
        }
    };
    
    return false;
}

// ==============================================
// ERROR LOGGING FUNKCIE
// ==============================================

function createErrorEntry() {
    try {
        var errorsLib = libByName(CONFIG.errorsLibrary);
        if (!errorsLib) {
            message("❌ KRITICKÁ CHYBA: Knižnica " + CONFIG.errorsLibrary + " neexistuje!");
            return null;
        }
        
        // Získaj údaje zo záznamu ktorý sa ide mazať
        var notifData = {
            chatId: utils.safeGet(currentEntry, CONFIG.fields.chatId, ""),
            threadId: utils.safeGet(currentEntry, CONFIG.fields.threadId, ""),
            messageId: utils.safeGet(currentEntry, CONFIG.fields.messageId, ""),
            adresat: utils.safeGet(currentEntry, CONFIG.fields.adresat, ""),
            datum: utils.safeGet(currentEntry, CONFIG.fields.datum, null)
        };
        
        errorEntry = errorsLib.create({});
        
        if (errorEntry) {
            // Základné info
            utils.safeSet(errorEntry, CONFIG.errorFields.date, moment().toDate());
            utils.safeSet(errorEntry, CONFIG.errorFields.mementoLibrary, "ASISTANTO");
            utils.safeSet(errorEntry, CONFIG.errorFields.library, "ASISTANTO Notifications");
            utils.safeSet(errorEntry, CONFIG.errorFields.script, CONFIG.scriptName + " v" + CONFIG.version);
            
            // Uložené parametre
            var params = "Chat ID: " + notifData.chatId + "\n" +
                        "Thread ID: " + (notifData.threadId || "none") + "\n" +
                        "Message ID: " + notifData.messageId + "\n" +
                        "Adresát: " + notifData.adresat + "\n" +
                        "Dátum správy: " + (notifData.datum ? moment(notifData.datum).format("DD.MM.YYYY HH:mm") : "?");
            
            utils.safeSet(errorEntry, CONFIG.errorFields.parameters, params);
            
            // Používateľ
            utils.safeSet(errorEntry, CONFIG.errorFields.user, user());
            
            return errorEntry;
        }
        
    } catch (e) {
        message("❌ KRITICKÁ CHYBA pri vytváraní error záznamu: " + e.toString());
    }
    
    return null;
}

function addDebug(message) {
    if (!CONFIG.debug || !errorEntry) return;
    
    var timestamp = moment().format("DD.MM.YY HH:mm:ss");
    var debugMessage = "[" + timestamp + "] " + message;
    
    var existingDebug = utils.safeGet(errorEntry, CONFIG.errorFields.debugLog, "");
    utils.safeSet(errorEntry, CONFIG.errorFields.debugLog, existingDebug + debugMessage + "\n");
}

function addError(error, location) {
    if (!errorEntry) return;
    
    var timestamp = moment().format("DD.MM.YY HH:mm:ss");
    var errorMessage = "[" + timestamp + "] ❌ ";
    
    if (location) errorMessage += "(" + location + ") ";
    errorMessage += error.toString();
    
    var existingError = utils.safeGet(errorEntry, CONFIG.errorFields.errorLog, "");
    utils.safeSet(errorEntry, CONFIG.errorFields.errorLog, existingError + errorMessage + "\n");
}

function addInfo(message, details) {
    if (!errorEntry) return;
    
    var infoMessage = "📋 " + message;
    
    if (details) {
        if (details.result) infoMessage += "\n   • Výsledok: " + details.result;
        if (details.duration) infoMessage += "\n   • Trvanie: " + details.duration;
        if (details.httpCode) infoMessage += "\n   • HTTP kód: " + details.httpCode;
    }
    
    var existingInfo = utils.safeGet(errorEntry, CONFIG.errorFields.info, "");
    utils.safeSet(errorEntry, CONFIG.errorFields.info, existingInfo + infoMessage + "\n\n");
}

// ==============================================
// TELEGRAM API FUNKCIE
// ==============================================

function getTelegramToken() {
    try {
        var apiLib = libByName(CONFIG.apiLibrary);
        if (!apiLib) {
            addError("API knižnica nenájdená", "getTelegramToken");
            return null;
        }
        
        var entries = apiLib.entries();
        for (var i = 0; i < entries.length; i++) {
            var provider = utils.safeGet(entries[i], "provider", "");
            if (provider.toLowerCase() === "telegram") {
                var token = utils.safeGet(entries[i], "api", "");
                if (token) {
                    addDebug("✅ Telegram API token načítaný");
                    return token;
                }
            }
        }
        
        addError("Telegram token nenájdený v API knižnici", "getTelegramToken");
        
    } catch (error) {
        addError(error, "getTelegramToken");
    }
    
    return null;
}

function deleteTelegramMessage(chatId, messageId, botToken) {
    try {
        addDebug("🗑️ Pokus o vymazanie správy:");
        addDebug("   • Chat ID: " + chatId);
        addDebug("   • Message ID: " + messageId);
        
        var url = "https://api.telegram.org/bot" + botToken + "/deleteMessage";
        
        var payload = {
            chat_id: chatId,
            message_id: parseInt(messageId)
        };
        
        var httpObj = http();
        httpObj.headers({"Content-Type": "application/json"});
        
        var response = httpObj.post(url, JSON.stringify(payload));
        
        if (response.code === 200) {
            try {
                var data = JSON.parse(response.body);
                if (data.ok) {
                    addDebug("✅ Správa úspešne vymazaná z Telegramu");
                    addInfo("Telegram správa vymazaná", {
                        result: "Úspešné vymazanie",
                        httpCode: response.code
                    });
                    return true;
                } else {
                    addDebug("⚠️ Telegram API vrátilo ok=false");
                }
            } catch (e) {
                addDebug("⚠️ Nepodarilo sa parsovať odpoveď, ale HTTP 200 = asi OK");
                return true;
            }
        } else if (response.code === 400) {
            // Bad Request - správa už neexistuje alebo nemáme práva
            addDebug("⚠️ HTTP 400 - Správa už neexistuje alebo nemáme práva");
            
            var errorDetail = "";
            try {
                var errorData = JSON.parse(response.body);
                if (errorData.description) {
                    errorDetail = errorData.description;
                }
            } catch (e) {}
            
            if (errorDetail.indexOf("message to delete not found") > -1) {
                addDebug("ℹ️ Správa už bola vymazaná skôr");
                addInfo("Správa už neexistuje", {
                    result: "Správa už bola vymazaná",
                    httpCode: response.code
                });
            } else if (errorDetail.indexOf("message can't be deleted") > -1) {
                addDebug("⚠️ Správa je príliš stará (>48h) alebo nemáme práva");
                addInfo("Správa sa nedá vymazať", {
                    result: "Príliš stará alebo chýbajú práva",
                    httpCode: response.code
                });
            } else {
                addDebug("⚠️ Detail: " + errorDetail);
                addError("HTTP 400: " + errorDetail, "deleteTelegramMessage");
            }
            
        } else {
            addError("HTTP " + response.code + ": " + response.body, "deleteTelegramMessage");
            addInfo("Vymazanie zlyhalo", {
                result: "HTTP chyba",
                httpCode: response.code
            });
        }
        
    } catch (error) {
        addError(error, "deleteTelegramMessage");
    }
    
    return false;
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        initializeUtils();
        
        // 1. Vytvor error entry pre logovanie
        errorEntry = createErrorEntry();
        if (!errorEntry) {
            // Ak sa nepodarilo vytvoriť, nemôžeme pokračovať
            return;
        }
        
        addDebug("🚀 === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        addDebug("📋 Trigger typ: " + CONFIG.scriptType);
        
        // 2. Získaj údaje zo záznamu ktorý sa ide mazať
        var chatId = utils.safeGet(currentEntry, CONFIG.fields.chatId, "");
        var threadId = utils.safeGet(currentEntry, CONFIG.fields.threadId, "");
        var messageId = utils.safeGet(currentEntry, CONFIG.fields.messageId, "");
        var adresat = utils.safeGet(currentEntry, CONFIG.fields.adresat, "");
        var datum = utils.safeGet(currentEntry, CONFIG.fields.datum, null);
        
        addDebug("📋 Údaje záznamu:");
        addDebug("   • Chat ID: " + chatId);
        addDebug("   • Thread ID: " + (threadId || "žiadny"));
        addDebug("   • Message ID: " + messageId);
        addDebug("   • Adresát: " + adresat);
        addDebug("   • Dátum: " + (datum ? moment(datum).format("DD.MM.YYYY HH:mm") : "?"));
        
        // 3. Kontrola či máme potrebné údaje
        if (!messageId || messageId === "") {
            addDebug("⚠️ Chýba Message ID - nemôžem vymazať správu");
            addInfo("Vymazanie preskočené", {
                result: "Chýba Message ID"
            });
            return;
        }
        
        if (!chatId || chatId === "") {
            addDebug("⚠️ Chýba Chat ID - nemôžem vymazať správu");
            addInfo("Vymazanie preskočené", {
                result: "Chýba Chat ID"
            });
            return;
        }
        
        // 4. Kontrola typu správy - vymazávame len Telegram správy
        var skipTypes = ["SMS-", "EMAIL-"];
        var shouldSkip = false;
        
        for (var i = 0; i < skipTypes.length; i++) {
            if (messageId.indexOf(skipTypes[i]) === 0) {
                addDebug("ℹ️ " + skipTypes[i] + " správa - nevymazávam z Telegramu");
                addInfo("Vymazanie preskočené", {
                    result: skipTypes[i] + " správa"
                });
                shouldSkip = true;
                break;
            }
        }
        
        if (shouldSkip) {
            return;
        }
        
        // 5. Získaj API token
        var botToken = getTelegramToken();
        if (!botToken) {
            addError("Nemôžem pokračovať bez API tokenu", "main");
            addInfo("Vymazanie zlyhalo", {
                result: "Chýba API token"
            });
            return;
        }
        
        // 6. Skontroluj vek správy (Telegram limit je 48 hodín)
        if (datum) {
            var messageAge = moment().diff(moment(datum), 'hours');
            if (messageAge > 48) {
                addDebug("⚠️ Správa je stará " + messageAge + " hodín (limit je 48h)");
                addDebug("ℹ️ Telegram pravdepodobne odmietne vymazanie");
                utils.safeSet(errorEntry, CONFIG.errorFields.note, "Správa staršia ako 48h - " + messageAge + " hodín");
            }
        }
        
        // 7. Vymaž správu z Telegramu
        addDebug("\n🗑️ Mazanie správy z Telegramu...");
        
        var success = deleteTelegramMessage(chatId, messageId, botToken);
        
        if (success) {
            addDebug("\n✅ === ÚSPEŠNÉ VYMAZANIE ===");
        } else {
            addDebug("\n⚠️ === VYMAZANIE NEÚSPEŠNÉ ===");
            addDebug("ℹ️ Záznam v databáze bude aj tak vymazaný");
        }
        
        // 8. Info o thread ID ak existuje
        if (threadId && threadId !== "") {
            addDebug("\nℹ️ Správa bola v téme #" + threadId);
        }
        
        // 9. Finálne info
        var duration = moment().diff(startTime, 'milliseconds');
        addDebug("\n⏱️ Celkové trvanie: " + duration + "ms");
        
        addInfo("Delete trigger dokončený", {
            result: success ? "Správa vymazaná" : "Vymazanie zlyhalo",
            duration: duration + "ms"
        });
        
    } catch (error) {
        addError(error, "main-critical");
        addInfo("KRITICKÁ CHYBA", {
            result: "Script zlyhal"
        });
    }
}

// ==============================================
// TELEGRAM API INFO
// ==============================================
// deleteMessage limitácie:
// - Správu možno vymazať len do 48 hodín od odoslania
// - Bot musí mať práva na mazanie správ v skupine
// - V súkromnom chate môže bot mazať len svoje správy
// - V skupine s admin právami môže mazať aj správy iných
// ==============================================

// Spustenie
main();