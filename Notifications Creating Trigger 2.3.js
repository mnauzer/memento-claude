// ==============================================
// NOTIFICATION CREATE TRIGGER - Vytvorenie a odoslanie
// Verzia: 2.3 | Dátum: December 2024 | Autor: ASISTANTO
// Knižnica: Notifications | Trigger: After Save
// ==============================================
// 📋 FUNKCIA:
//    - Vytvorí záznam v knižnici Notifications
//    - Odošle správu na Telegram
//    - Aktualizuje info pole s detailami odoslania
//    - Získava Telegram ID podľa typu adresáta
// ==============================================
// 🔧 ZMENY v2.3:
//    - Opravená logika pre typ Zákazka
//    - Dvojúrovňová navigácia cez zákazku k Telegram skupine
//    - Vylepšené debug logy pre sledovanie navigácie
// ==============================================

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var centralConfig = utils.config;
var currentEntry = entry();

var CONFIG = {
    scriptName: "Notification Create Trigger",
    version: "2.3",
    
    // Referencie na centrálny config
    fields: centralConfig.fields,
    libraries: centralConfig.libraries,
    icons: centralConfig.icons,
    
    // Mapovanie typov adresátov na polia
    recipientMapping: {
        "Partner": {
            linkField: "Partner",
            telegramField: "Telegram ID",
            type: "individual"
        },
        "Zamestnanec": {
            linkField: "Zamestnanec",
            telegramField: "Telegram ID",
            type: "individual"
        },
        "Klient": {
            linkField: "Klient",
            telegramField: "Telegram ID",
            type: "individual"
        },
        "Zákazka": {
            linkField: "Zákazka",
            telegramGroupField: "Telegram skupina",  // Pole v zákazke
            type: "customer"  // Špeciálny typ
        },
        "Skupina": {
            linkField: "Skupina/Téma",
            chatIdField: "Chat ID",
            threadIdField: null,
            type: "group"
        },
        "Skupina-Téma": {
            linkField: "Skupina/Téma",
            chatIdField: "Chat ID",
            threadIdField: "Thread ID",
            type: "group"
        }
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, utils.getIcon("start") + " === " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        utils.addDebug(currentEntry, "Čas spustenia: " + utils.formatDate(moment()));
        
        // 1. Kontrola či je to nový záznam
        if (!isNewRecord()) {
            utils.addDebug(currentEntry, "Nie je nový záznam - preskakujem");
            return true;
        }
        
        // 2. Kontrola statusu
        var status = utils.safeGet(currentEntry, CONFIG.fields.notifications.status);
        if (status !== "Čaká") {
            utils.addDebug(currentEntry, "Status nie je 'Čaká' - preskakujem");
            return true;
        }
        
        // 3. Získanie Telegram ID podľa adresáta
        var telegramData = getTelegramID();
        if (!telegramData.success) {
            utils.addError(currentEntry, "Nepodarilo sa získať Telegram údaje: " + telegramData.error, "main");
            updateStatus("Zlyhalo", telegramData.error);
            return false;
        }
        
        utils.addDebug(currentEntry, "Telegram údaje získané:");
        utils.addDebug(currentEntry, "  • Chat ID: " + telegramData.chatId);
        if (telegramData.threadId) {
            utils.addDebug(currentEntry, "  • Thread ID: " + telegramData.threadId);
        }
        
        // 4. Príprava správy
        var message = utils.safeGet(currentEntry, CONFIG.fields.notifications.message);
        if (!message) {
            utils.addError(currentEntry, "Správa je prázdna", "main");
            updateStatus("Zlyhalo", "Prázdna správa");
            return false;
        }
        
        // 5. Odoslanie na Telegram
        var sendResult = sendToTelegram(telegramData.chatId, message, telegramData.threadId);
        
        if (!sendResult.success) {
            utils.addError(currentEntry, "Odoslanie zlyhalo: " + sendResult.error, "main");
            updateStatus("Zlyhalo", sendResult.error);
            return false;
        }
        
        // 6. Aktualizácia záznamu po úspešnom odoslaní
        updateAfterSuccess(sendResult, telegramData);
        
        // 7. Aktualizácia info poľa zdrojového záznamu
        updateSourceEntryInfo(sendResult, telegramData);
        
        utils.addDebug(currentEntry, utils.getIcon("success") + " === NOTIFIKÁCIA ÚSPEŠNE ODOSLANÁ ===");
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        updateStatus("Chyba", error.toString());
        return false;
    }
}

// ==============================================
// FUNKCIA PRE ZÍSKANIE TELEGRAM ID
// ==============================================

function getTelegramID() {
    try {
        // Získaj typ adresáta
        var recipientType = utils.safeGet(currentEntry, CONFIG.fields.notifications.recipient);
        
        if (!recipientType) {
            // Ak nie je vyplnený adresát, použi priame polia
            var directChatId = utils.safeGet(currentEntry, CONFIG.fields.notifications.chatId);
            var directThreadId = utils.safeGet(currentEntry, CONFIG.fields.notifications.threadId);
            
            if (directChatId) {
                utils.addDebug(currentEntry, "Používam priame Chat ID: " + directChatId);
                return {
                    success: true,
                    chatId: directChatId,
                    threadId: directThreadId,
                    source: "direct"
                };
            } else {
                return {
                    success: false,
                    error: "Nie je definovaný adresát ani priame Chat ID"
                };
            }
        }
        
        utils.addDebug(currentEntry, "Typ adresáta: " + recipientType);
        
        // Získaj konfiguráciu pre daný typ
        var recipientConfig = CONFIG.recipientMapping[recipientType];
        if (!recipientConfig) {
            return {
                success: false,
                error: "Neznámy typ adresáta: " + recipientType
            };
        }
        
        // Spracuj podľa typu
        switch (recipientConfig.type) {
            case "individual":
                return getTelegramFromIndividual(recipientConfig);
                
            case "group":
                return getTelegramFromGroup(recipientConfig);
                
            case "customer":
                return getTelegramFromCustomer(recipientConfig);
                
            default:
                return {
                    success: false,
                    error: "Neznámy typ konfigurácie: " + recipientConfig.type
                };
        }
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba v getTelegramID: " + error.toString(), "getTelegramID", error);
        return {
            success: false,
            error: error.toString()
        };
    }
}

// ==============================================
// FUNKCIA PRE ZÍSKANIE TELEGRAM ID ZO ZÁKAZKY
// ==============================================

function getTelegramFromCustomer(config) {
    try {
        utils.addDebug(currentEntry, "Získavam Telegram údaje cez Zákazku");
        
        // 1. Získaj zákazku z notifikácie
        var customerRecords = utils.safeGet(currentEntry, config.linkField);
        
        if (!customerRecords || customerRecords.length === 0) {
            return {
                success: false,
                error: "Nie je vyplnené pole '" + config.linkField + "'"
            };
        }
        
        var customerRecord = customerRecords[0];
        var customerName = utils.safeGet(customerRecord, "Názov") || 
                          utils.safeGet(customerRecord, "Zákazka") || 
                          "Neznáma zákazka";
                          
        utils.addDebug(currentEntry, "  • Zákazka: " + customerName);
        
        // 2. Získaj Telegram skupinu zo zákazky
        var telegramGroups = utils.safeGet(customerRecord, config.telegramGroupField);
        
        if (!telegramGroups || telegramGroups.length === 0) {
            return {
                success: false,
                error: "Zákazka '" + customerName + "' nemá priradenú Telegram skupinu"
            };
        }
        
        var telegramGroup = telegramGroups[0];
        var groupName = utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.groupName) || "Neznáma skupina";
        
        utils.addDebug(currentEntry, "  • Telegram skupina: " + groupName);
        
        // 3. Získaj Chat ID z Telegram skupiny
        var chatId = utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.chatId);
        
        if (!chatId) {
            return {
                success: false,
                error: "Telegram skupina '" + groupName + "' nemá vyplnené Chat ID"
            };
        }
        
        // 4. Získaj Thread ID (ak existuje)
        var threadId = utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.threadId);
        
        // 5. Kontrola či má skupina povolené notifikácie
        var notificationsEnabled = utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.enableNotifications, true);
        
        if (!notificationsEnabled) {
            return {
                success: false,
                error: "Skupina '" + groupName + "' má vypnuté notifikácie"
            };
        }
        
        utils.addDebug(currentEntry, "  • Chat ID získané: " + chatId);
        if (threadId) {
            utils.addDebug(currentEntry, "  • Thread ID získané: " + threadId);
        }
        
        return {
            success: true,
            chatId: chatId,
            threadId: threadId,
            source: "customer",
            customerName: customerName,
            groupName: groupName
        };
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri získavaní údajov zo zákazky: " + error.toString(), "getTelegramFromCustomer", error);
        return {
            success: false,
            error: "Chyba pri spracovaní zákazky: " + error.toString()
        };
    }
}

// ==============================================
// POMOCNÉ FUNKCIE PRE ZÍSKANIE TELEGRAM ID
// ==============================================

function getTelegramFromIndividual(config) {
    try {
        // Získaj linknutý záznam
        var linkedRecords = utils.safeGet(currentEntry, config.linkField);
        
        if (!linkedRecords || linkedRecords.length === 0) {
            return {
                success: false,
                error: "Nie je vyplnené pole '" + config.linkField + "'"
            };
        }
        
        var linkedRecord = linkedRecords[0];
        
        // Získaj Telegram ID z linknutého záznamu
        var telegramId = utils.safeGet(linkedRecord, config.telegramField);
        
        if (!telegramId) {
            var recordName = utils.safeGet(linkedRecord, "Nick") || 
                           utils.safeGet(linkedRecord, "Názov") || 
                           utils.safeGet(linkedRecord, "Meno") || 
                           "Neznámy";
                           
            return {
                success: false,
                error: "Adresát '" + recordName + "' nemá vyplnené Telegram ID"
            };
        }
        
        utils.addDebug(currentEntry, "Telegram ID získané z " + config.linkField + ": " + telegramId);
        
        return {
            success: true,
            chatId: telegramId,
            threadId: null,
            source: config.linkField,
            recipientName: recordName
        };
        
    } catch (error) {
        return {
            success: false,
            error: "Chyba pri získavaní Telegram ID: " + error.toString()
        };
    }
}

function getTelegramFromGroup(config) {
    try {
        // Získaj linknutú skupinu
        var linkedGroups = utils.safeGet(currentEntry, config.linkField);
        
        if (!linkedGroups || linkedGroups.length === 0) {
            return {
                success: false,
                error: "Nie je vyplnené pole '" + config.linkField + "'"
            };
        }
        
        var groupRecord = linkedGroups[0];
        
        // Získaj Chat ID
        var chatId = utils.safeGet(groupRecord, config.chatIdField);
        
        if (!chatId) {
            var groupName = utils.safeGet(groupRecord, "Názov skupiny") || "Neznáma skupina";
            return {
                success: false,
                error: "Skupina '" + groupName + "' nemá vyplnené Chat ID"
            };
        }
        
        // Pre Skupina-Téma získaj aj Thread ID
        var threadId = null;
        if (config.threadIdField) {
            threadId = utils.safeGet(groupRecord, config.threadIdField);
            
            if (!threadId && config.threadIdField) {
                utils.addDebug(currentEntry, "⚠️ Skupina-Téma nemá Thread ID, posielam do hlavného chatu");
            }
        }
        
        utils.addDebug(currentEntry, "Chat údaje získané zo skupiny: " + groupName);
        
        return {
            success: true,
            chatId: chatId,
            threadId: threadId,
            source: "group",
            groupName: groupName
        };
        
    } catch (error) {
        return {
            success: false,
            error: "Chyba pri získavaní skupinových údajov: " + error.toString()
        };
    }
}

// ==============================================
// ODOSLANIE NA TELEGRAM
// ==============================================

function sendToTelegram(chatId, message, threadId) {
    try {
        var formatting = utils.safeGet(currentEntry, CONFIG.fields.notifications.formatting, "Markdown");
        var silent = utils.safeGet(currentEntry, "Tichá správa", false);
        
        var options = {
            parseMode: formatting,
            silent: silent,
            createNotification: false // Netvoriť ďalšiu notifikáciu
        };
        
        if (threadId) {
            options.threadId = threadId;
        }
        
        utils.addDebug(currentEntry, "Odosielam správu:");
        utils.addDebug(currentEntry, "  • Chat ID: " + chatId);
        utils.addDebug(currentEntry, "  • Thread ID: " + (threadId || "N/A"));
        utils.addDebug(currentEntry, "  • Formátovanie: " + formatting);
        utils.addDebug(currentEntry, "  • Tichá správa: " + (silent ? "Áno" : "Nie"));
        
        var result = utils.sendTelegramMessage(chatId, message, options);
        
        if (result.success) {
            utils.addDebug(currentEntry, utils.getIcon("success") + " Správa odoslaná, Message ID: " + result.messageId);
            return {
                success: true,
                messageId: result.messageId,
                chatId: result.chatId,
                date: result.date
            };
        } else {
            return {
                success: false,
                error: result.error || "Neznáma chyba"
            };
        }
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri odosielaní: " + error.toString(), "sendToTelegram", error);
        return {
            success: false,
            error: error.toString()
        };
    }
}

// ==============================================
// AKTUALIZÁCIA PO ÚSPEŠNOM ODOSLANÍ
// ==============================================

function updateAfterSuccess(sendResult, telegramData) {
    try {
        // Aktualizuj status
        currentEntry.set(CONFIG.fields.notifications.status, "Odoslané");
        
        // Ulož Telegram údaje
        currentEntry.set(CONFIG.fields.notifications.messageId, sendResult.messageId);
        currentEntry.set(CONFIG.fields.notifications.chatId, sendResult.chatId);
        
        if (telegramData.threadId) {
            currentEntry.set(CONFIG.fields.notifications.threadId, telegramData.threadId);
        }
        
        // Časové údaje
        currentEntry.set(CONFIG.fields.notifications.lastMessage, new Date());
        
        // Aktualizuj info pole
        var infoMsg = utils.safeGet(currentEntry, CONFIG.fields.common.info, "");
        infoMsg += "\n\n✅ ÚSPEŠNE ODOSLANÉ\n";
        infoMsg += "Čas odoslania: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
        infoMsg += "Message ID: " + sendResult.messageId + "\n";
        infoMsg += "Chat ID: " + sendResult.chatId + "\n";
        
        if (telegramData.threadId) {
            infoMsg += "Thread ID: " + telegramData.threadId + "\n";
        }
        
        infoMsg += "Zdroj Chat ID: " + telegramData.source + "\n";
        
        if (telegramData.recipientName) {
            infoMsg += "Adresát: " + telegramData.recipientName + "\n";
        }
        
        if (telegramData.customerName) {
            infoMsg += "Zákazka: " + telegramData.customerName + "\n";
        }
        
        if (telegramData.groupName) {
            infoMsg += "Skupina: " + telegramData.groupName + "\n";
        }
        
        currentEntry.set(CONFIG.fields.common.info, infoMsg);
        
        utils.addDebug(currentEntry, "Záznam aktualizovaný po odoslaní");
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri aktualizácii záznamu: " + error.toString(), "updateAfterSuccess", error);
    }
}

// ==============================================
// AKTUALIZÁCIA ZDROJOVÉHO ZÁZNAMU
// ==============================================

function updateSourceEntryInfo(sendResult, telegramData) {
    try {
        // Získaj zdrojový záznam (ak existuje prepojenie)
        var sourceLibrary = utils.safeGet(currentEntry, "Zdrojová knižnica");
        var sourceEntryId = utils.safeGet(currentEntry, "Zdrojový záznam ID");
        
        if (!sourceLibrary || !sourceEntryId) {
            utils.addDebug(currentEntry, "Zdrojový záznam nie je definovaný");
            return;
        }
        
        // Nájdi zdrojový záznam
        var sourceLib = libByName(sourceLibrary);
        if (!sourceLib) {
            utils.addDebug(currentEntry, "Zdrojová knižnica '" + sourceLibrary + "' nenájdená");
            return;
        }
        
        var sourceEntries = sourceLib.find("ID", sourceEntryId);
        if (!sourceEntries || sourceEntries.length === 0) {
            utils.addDebug(currentEntry, "Zdrojový záznam ID " + sourceEntryId + " nenájdený");
            return;
        }
        
        var sourceEntry = sourceEntries[0];
        
        // Aktualizuj info pole zdrojového záznamu
        var existingInfo = utils.safeGet(sourceEntry, CONFIG.fields.common.info, "");
        
        var updateInfo = "\n\n📨 TELEGRAM NOTIFIKÁCIA ODOSLANÁ\n";
        updateInfo += "═══════════════════════════════════\n";
        updateInfo += "Čas: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
        updateInfo += "Message ID: " + sendResult.messageId + "\n";
        updateInfo += "Chat ID: " + sendResult.chatId + "\n";
        
        if (telegramData.threadId) {
            updateInfo += "Thread ID: " + telegramData.threadId + "\n";
        }
        
        if (telegramData.recipientName) {
            updateInfo += "Adresát: " + telegramData.recipientName + "\n";
        }
        
        if (telegramData.customerName) {
            updateInfo += "Zákazka: " + telegramData.customerName + "\n";
        }
        
        if (telegramData.groupName) {
            updateInfo += "Skupina: " + telegramData.groupName + "\n";
        }
        
        updateInfo += "Notifikácia ID: " + currentEntry.field("ID") + "\n";
        updateInfo += "Script: " + CONFIG.scriptName + " v" + CONFIG.version;
        
        sourceEntry.set(CONFIG.fields.common.info, existingInfo + updateInfo);
        
        utils.addDebug(currentEntry, "Info pole zdrojového záznamu aktualizované");
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri aktualizácii zdrojového záznamu: " + error.toString(), "updateSourceEntryInfo", error);
    }
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

function isNewRecord() {
    var createdDate = utils.safeGet(currentEntry, CONFIG.fields.common.createdDate);
    var modifiedDate = utils.safeGet(currentEntry, CONFIG.fields.common.modifiedDate);
    
    if (!createdDate || !modifiedDate) return true;
    
    var timeDiff = Math.abs(moment(createdDate).diff(moment(modifiedDate), 'seconds'));
    return timeDiff < 5;
}

function updateStatus(status, error) {
    try {
        currentEntry.set(CONFIG.fields.notifications.status, status);
        
        if (error) {
            currentEntry.set(CONFIG.fields.notifications.lastError, error);
            
            var retryCount = utils.safeGet(currentEntry, CONFIG.fields.notifications.retryCount, 0);
            currentEntry.set(CONFIG.fields.notifications.retryCount, retryCount + 1);
        }
        
        currentEntry.set(CONFIG.fields.notifications.lastUpdate, new Date());
        
    } catch (e) {
        utils.addError(currentEntry, "Chyba pri update statusu: " + e.toString(), "updateStatus", e);
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

// Kontrola závislostí
var dependencyCheck = utils.checkDependencies(['config', 'core', 'telegram']);
if (!dependencyCheck.success) {
    message("❌ Chýbajú potrebné moduly: " + dependencyCheck.missing.join(", "));
    cancel();
}

// Spustenie hlavnej funkcie
var result = main();

// Ak hlavná funkcia zlyhala, zaloguj ale neprerušuj uloženie (After Save)
if (!result) {
    utils.addError(currentEntry, "Script zlyhal ale záznam bol uložený", "main");
}