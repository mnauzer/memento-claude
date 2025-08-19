// ==============================================
// ACTION SCRIPT - DOCHÁDZKA NOTIFIKÁCIE
// Verzia: 2.17 | Typ: Action Script  
// Knižnica: Dochádzka
// ==============================================
// ✅ NOVÉ v2.17:
//    - Vymaže staré notifikácie pred vytvorením nových
//    - Linkuje vytvorené notifikácie do poľa "Telegram Notifikácie"
//    - Pri zmene údajov automaticky vymaže staré správy z Telegramu
//    - Zabezpečuje konzistenciu medzi DB a Telegramom
// ✅ NOVÉ v2.16:
//    - Thread ID sa zapisuje do samostatného poľa v ASISTANTO Notifications
//    - Kompatibilné s aktualizovanou štruktúrou knižnice
// ✅ NOVÉ v2.15:
//    - Zaznamenáva všetky odoslané notifikácie do ASISTANTO Notifications
//    - Ukladá Message ID z Telegram API pre tracking
//    - Podporuje zaznamenávanie SMS a Email notifikácií
// ✅ OPRAVENÉ v2.14:
//    - Používa MementoUtils.safeGetAttribute() pre čítanie atribútov
//    - Správne API volania cez entry objekt s indexom
//    - Pridáva do správy len atribúty s nenulovou hodnotou
//    - Elegantnejší kód využívajúci MementoUtils knižnicu
// ==============================================
// 🔄 WORKFLOW:
//    1. Vymaže všetky staré notifikácie (DB + Telegram)
//    2. Pošle nové notifikácie všetkým zamestnancom
//    3. Zaznamená ich do ASISTANTO Notifications
//    4. Nalinkuje vytvorené záznamy do poľa "Telegram Notifikácie"
// ==============================================

var CONFIG = {
    debug: true,
    version: "2.17",
    scriptName: "Dochádzka Notifikácie",
    scriptType: "Action Script",
    
    // Knižnice
    apiLibrary: "ASISTANTO API",
    defaultsLibrary: "ASISTANTO Defaults",
    notificationsLibrary: "ASISTANTO Notifications",
    
    // Nastavenia
    maxSMSLength: 160,
    telegramParseMode: "Markdown",
    
    // Názvy polí
    fields: {
        zamestnanci: "Zamestnanci",
        datum: "Dátum",
        prichod: "Príchod",
        odchod: "Odchod",
        prestavka: "Prestávka",
        poznamka: "Poznámka",
        projekt: "Projekt/Zákazka",
        info: "info",
        debugLog: "Debug_Log",
        errorLog: "Error_Log",
        telegramNotifikacie: "Telegram Notifikácie"  // Nové pole pre linky
    },
    
    // Názvy atribútov podľa screenshotu
    attributes: {
        // Pracovné údaje
        odpracovane: "odpracované",
        
        // Mzdové údaje  
        hodinovka: "hodinovka",
        priplatok: "+príplatok (€/h)", 
        premia: "+prémia (€)",
        pokuta: "-pokuta (€)",
        dennaMzda: "denná mzda"
    },
    
    // Ikony pre správy
    icons: {
        start: "🚀",
        step: "📋", 
        success: "✅",
        error: "💥",
        warning: "⚠️",
        info: "ℹ️"
    }
};

// Globálne premenné
var currentEntry = entry();
var utils = null;
var firmaNazov = "Firma";
var vytvoreneNotifikacie = [];  // Pole pre uloženie vytvorených notifikácií

// ==============================================
// VYMAZANIE STARÝCH NOTIFIKÁCIÍ
// ==============================================

function vymazStareNotifikacie() {
    try {
        utils.addDebug(currentEntry, "\n🗑️ Kontrolujem staré notifikácie...");
        
        // Získaj existujúce notifikácie
        var stareNotifikacie = utils.safeGet(currentEntry, CONFIG.fields.telegramNotifikacie, []);
        
        if (!stareNotifikacie || stareNotifikacie.length === 0) {
            utils.addDebug(currentEntry, "   ℹ️ Žiadne staré notifikácie");
            return;
        }
        
        utils.addDebug(currentEntry, "   🔍 Našiel " + stareNotifikacie.length + " starých notifikácií");
        
        var notifLib = libByName(CONFIG.notificationsLibrary);
        if (!notifLib) {
            utils.addDebug(currentEntry, "   ⚠️ Notifications knižnica neexistuje - čistím len linky");
            utils.safeSet(currentEntry, CONFIG.fields.telegramNotifikacie, []);
            return;
        }
        
        var pocetVymazanych = 0;
        var pocetTelegramVymazanych = 0;
        
        // Prejdi všetky staré notifikácie
        for (var i = 0; i < stareNotifikacie.length; i++) {
            var notifikacia = stareNotifikacie[i];
            
            if (notifikacia) {
                try {
                    // Získaj údaje pred vymazaním (pre prípad že delete trigger nefunguje)
                    var chatId = utils.safeGet(notifikacia, "Chat ID", "");
                    var messageId = utils.safeGet(notifikacia, "Message ID", "");
                    var threadId = utils.safeGet(notifikacia, "Thread ID", "");
                    
                    utils.addDebug(currentEntry, "   🗑️ Mažem notifikáciu ID " + notifikacia.field("ID"));
                    
                    // Vymaž záznam - toto by malo spustiť Before Delete trigger
                    notifikacia.trash();
                    pocetVymazanych++;
                    
                    // Pre istotu vymaž aj priamo z Telegramu ak máme Message ID
                    // (v prípade že trigger nefunguje pri programovom mazaní)
                    if (messageId && !messageId.startsWith("SMS-") && !messageId.startsWith("EMAIL-")) {
                        if (vymazTelegramSpravu(chatId, messageId)) {
                            pocetTelegramVymazanych++;
                        }
                    }
                    
                } catch (deleteError) {
                    utils.addError(currentEntry, deleteError, "vymazStareNotifikacie-delete");
                }
            }
        }
        
        // Vyčisti pole s notifikáciami
        utils.safeSet(currentEntry, CONFIG.fields.telegramNotifikacie, []);
        
        utils.addDebug(currentEntry, "   ✅ Vymazaných " + pocetVymazanych + " notifikácií");
        if (pocetTelegramVymazanych > 0) {
            utils.addDebug(currentEntry, "   ✅ Z Telegramu vymazaných " + pocetTelegramVymazanych + " správ");
        }
        
    } catch (error) {
        utils.addError(currentEntry, error, "vymazStareNotifikacie");
    }
}

function vymazTelegramSpravu(chatId, messageId) {
    try {
        // Získaj token
        var apiKeys = getApiKeys();
        if (!apiKeys.telegramToken || !chatId || !messageId) {
            return false;
        }
        
        var url = "https://api.telegram.org/bot" + apiKeys.telegramToken + "/deleteMessage";
        
        var httpObj = http();
        httpObj.headers({"Content-Type": "application/json"});
        
        var payload = {
            chat_id: chatId,
            message_id: parseInt(messageId)
        };
        
        var response = httpObj.post(url, JSON.stringify(payload));
        
        if (response.code === 200) {
            utils.addDebug(currentEntry, "      ✅ Správa " + messageId + " vymazaná z Telegramu");
            return true;
        } else {
            utils.addDebug(currentEntry, "      ⚠️ Nepodarilo sa vymazať správu " + messageId);
            return false;
        }
        
    } catch (error) {
        // Tichá chyba - nie je kritické
        return false;
    }
}

// ==============================================
// INICIALIZÁCIA
// ==============================================

function initializeUtils() {
    try {
        // Skús načítať MementoUtils
        if (typeof MementoUtils !== 'undefined' && MementoUtils !== null) {
            utils = MementoUtils;
            utils.addDebug(currentEntry, CONFIG.icons.success + " MementoUtils v" + (utils.version || "?") + " načítané");
            return true;
        } else {
            // Fallback pre základné funkcie
            utils = createFallbackUtils();
            addDebugDirect(CONFIG.icons.warning + " MementoUtils nenájdené - používam fallback");
            return false;
        }
    } catch (e) {
        utils = createFallbackUtils();
        addDebugDirect(CONFIG.icons.error + " Chyba pri načítaní MementoUtils: " + e.toString());
        return false;
    }
}

function createFallbackUtils() {
    return {
        // Základné fallback funkcie
        safeGet: function(entry, fieldName, defaultValue) {
            try {
                var value = entry.field(fieldName);
                return (value !== null && value !== undefined) ? value : defaultValue;
            } catch (e) {
                return defaultValue;
            }
        },
        
        safeSet: function(entry, fieldName, value) {
            try {
                entry.set(fieldName, value);
                return true;
            } catch (e) {
                return false;
            }
        },
        
        addDebug: function(entry, message) {
            addDebugDirect(message);
        },
        
        addError: function(entry, error, location) {
            addErrorDirect(error, location);
        },
        
        // Dummy funkcie pre atribúty
        safeGetAttribute: function() { return null; },
        safeSetAttribute: function() { return false; }
    };
}

// Direct log funkcie pre prípad že MementoUtils nie je dostupné
function addDebugDirect(message) {
    if (!CONFIG.debug) return;
    
    var timestamp = moment().format("DD.MM.YY HH:mm:ss");
    var debugMessage = "[" + timestamp + "] " + message;
    
    var existingDebug = currentEntry.field(CONFIG.fields.debugLog) || "";
    currentEntry.set(CONFIG.fields.debugLog, existingDebug + debugMessage + "\n");
}

function addErrorDirect(error, location) {
    var timestamp = moment().format("DD.MM.YY HH:mm:ss");
    var errorMessage = "[" + timestamp + "] " + CONFIG.icons.error + " ";
    
    if (location) errorMessage += "(" + location + ") ";
    errorMessage += error.toString();
    
    var existingError = currentEntry.field(CONFIG.fields.errorLog) || "";
    currentEntry.set(CONFIG.fields.errorLog, existingError + errorMessage + "\n");
}

// ==============================================
// ZÍSKAVANIE ATRIBÚTOV ZAMESTNANCA
// ==============================================

function getZamestnanecAtributy(zamestnanecIndex) {
    var atributy = {};
    
    try {
        utils.addDebug(currentEntry, "🔍 Získavam atribúty pre zamestnanca #" + zamestnanecIndex);
        
        // Použitie MementoUtils pre bezpečné získanie atribútov
        atributy.odpracovane = utils.safeGetAttribute(currentEntry, CONFIG.fields.zamestnanci, zamestnanecIndex, CONFIG.attributes.odpracovane, null);
        atributy.hodinovka = utils.safeGetAttribute(currentEntry, CONFIG.fields.zamestnanci, zamestnanecIndex, CONFIG.attributes.hodinovka, null);
        atributy.priplatok = utils.safeGetAttribute(currentEntry, CONFIG.fields.zamestnanci, zamestnanecIndex, CONFIG.attributes.priplatok, null);
        atributy.premia = utils.safeGetAttribute(currentEntry, CONFIG.fields.zamestnanci, zamestnanecIndex, CONFIG.attributes.premia, null);
        atributy.pokuta = utils.safeGetAttribute(currentEntry, CONFIG.fields.zamestnanci, zamestnanecIndex, CONFIG.attributes.pokuta, null);
        atributy.dennaMzda = utils.safeGetAttribute(currentEntry, CONFIG.fields.zamestnanci, zamestnanecIndex, CONFIG.attributes.dennaMzda, null);
        
        // Vyfiltruj len nenulové hodnoty
        var filtrované = {};
        var pocet = 0;
        
        for (var key in atributy) {
            var hodnota = atributy[key];
            if (hodnota !== null && hodnota !== undefined && hodnota !== 0 && hodnota !== "") {
                filtrované[key] = hodnota;
                pocet++;
                utils.addDebug(currentEntry, "  ✅ " + key + " = " + hodnota);
            }
        }
        
        utils.addDebug(currentEntry, "  📊 Celkom nenulových atribútov: " + pocet);
        return filtrované;
        
    } catch (error) {
        utils.addError(currentEntry, error, "getZamestnanecAtributy");
        return {};
    }
}

// ==============================================
// TEMPLATE FUNKCIE PRE SPRÁVY
// ==============================================

function vytvorTelegramSpravu(zamestnanec, zamestnanecIndex) {
    var meno = utils.safeGet(zamestnanec, "Meno", "");
    var priezvisko = utils.safeGet(zamestnanec, "Priezvisko", "");
    var nick = utils.safeGet(zamestnanec, "Nick", "");
    
    var celeMeno = nick || (meno + " " + priezvisko).trim() || "Zamestnanec";
    
    var datum = utils.safeGet(currentEntry, CONFIG.fields.datum, null);
    var prichod = utils.safeGet(currentEntry, CONFIG.fields.prichod, null);
    var odchod = utils.safeGet(currentEntry, CONFIG.fields.odchod, null);
    var prestavka = utils.safeGet(currentEntry, CONFIG.fields.prestavka, 0);
    var poznamka = utils.safeGet(currentEntry, CONFIG.fields.poznamka, "");
    
    // Získaj atribúty cez MementoUtils
    var atributy = getZamestnanecAtributy(zamestnanecIndex);
    
    // Projekt/Zákazka
    var projekt = "";
    var projektField = utils.safeGet(currentEntry, CONFIG.fields.projekt, null);
    if (projektField && Array.isArray(projektField) && projektField.length > 0) {
        projekt = utils.safeGet(projektField[0], "Názov záznamu", "") || 
                 utils.safeGet(projektField[0], "Číslo", "") || "Projekt";
    }
    
    // Vytvor správu
    var sprava = "🏢 **Evidencia dochádzky**\n\n";
    sprava += "Dobrý deň **" + celeMeno + "**!\n\n";
    
    sprava += "📋 **Dochádzka " + formatDate(datum) + ":**\n";
    sprava += "🕐 Príchod: **" + formatTime(prichod) + "**\n";
    
    if (odchod) {
        sprava += "🕐 Odchod: **" + formatTime(odchod) + "**\n";
        
        // Pridaj odpracované hodiny ak existujú
        if (atributy.odpracovane) {
            sprava += "⏱️ Odpracované: **" + atributy.odpracovane + "h**\n";
            
            var nadcasy = Math.max(0, atributy.odpracovane - 8);
            if (nadcasy > 0) {
                sprava += "⚡ Nadčasy: **" + nadcasy.toFixed(2) + "h**\n";
            }
        }
    }
    
    if (prestavka > 0) {
        sprava += "☕ Prestávka: " + prestavka + " min\n";
    }
    
    if (projekt) {
        sprava += "📦 Projekt: " + projekt + "\n";
    }
    
    // Pridaj len nenulové mzdové údaje
    var mzdoveUdaje = [];
    
    if (atributy.hodinovka) {
        mzdoveUdaje.push("• Hodinovka: " + atributy.hodinovka + " €/h");
    }
    if (atributy.premia) {
        mzdoveUdaje.push("• Prémia: **" + formatMoney(atributy.premia) + "**");
    }
    if (atributy.priplatok) {
        mzdoveUdaje.push("• Príplatok: " + atributy.priplatok + " €/h");
    }
    if (atributy.pokuta) {
        mzdoveUdaje.push("• Pokuta: **-" + formatMoney(atributy.pokuta) + "**");
    }
    if (atributy.dennaMzda) {
        mzdoveUdaje.push("• **Denná mzda: " + formatMoney(atributy.dennaMzda) + "**");
    }
    
    if (mzdoveUdaje.length > 0) {
        sprava += "\n💰 **Mzdové údaje:**\n" + mzdoveUdaje.join("\n") + "\n";
    }
    
    if (poznamka) {
        sprava += "\n📝 Poznámka: _" + poznamka + "_\n";
    }
    
    sprava += "\n---\n";
    sprava += firmaNazov + " | " + moment().format("DD.MM.YYYY HH:mm");
    
    return sprava;
}

// ==============================================
// HELPER FUNKCIE
// ==============================================

function formatTime(timeValue) {
    if (!timeValue) return "N/A";
    try {
        return moment(timeValue).format("HH:mm");
    } catch (e) {
        return "N/A";
    }
}

function formatDate(dateValue) {
    if (!dateValue) return "N/A";
    try {
        return moment(dateValue).format("DD.MM.YYYY");
    } catch (e) {
        return "N/A";
    }
}

function formatMoney(amount) {
    if (typeof amount !== "number") return "0.00 €";
    return amount.toFixed(2) + " €";
}

// ==============================================
// ZAZNAMENÁVANIE NOTIFIKÁCIÍ
// ==============================================

function zaznamenajNotifikaciu(chatId, sprava, zamestnanec, messageId, threadId) {
    try {
        var notifLib = libByName(CONFIG.notificationsLibrary);
        if (!notifLib) {
            // Knižnica neexistuje, vráť null ale neprerušuj script
            return null;
        }
        
        utils.addDebug(currentEntry, "📝 Zaznamenávam notifikáciu do " + CONFIG.notificationsLibrary);
        
        var notifData = {
            "Dátum": moment().toDate(),
            "Knižnica": "Dochádzka",
            "Chat ID": chatId,
            "Thread ID": threadId || "",  // Samostatné pole pre Thread ID
            "Message ID": messageId || "",
            "Adresát": "Zamestnanec",
            "Zamestnanec": zamestnanec,
            "Message": sprava
        };
        
        var novyZaznam = notifLib.create(notifData);
        
        if (novyZaznam) {
            utils.addDebug(currentEntry, "  ✅ Notifikácia zaznamenaná: ID " + novyZaznam.field("ID"));
            return novyZaznam;  // Vráť vytvorený záznam
        } else {
            utils.addError(currentEntry, "Nepodarilo sa vytvoriť záznam notifikácie", "zaznamenajNotifikaciu");
            return null;
        }
        
    } catch (error) {
        utils.addError(currentEntry, error, "zaznamenajNotifikaciu");
        return null;
    }
}

// ==============================================
// NAČÍTANIE KONFIGURÁCIE
// ==============================================

function getNazovFirmy() {
    try {
        utils.addDebug(currentEntry, "🏢 Načítavam názov firmy z " + CONFIG.defaultsLibrary);
        
        var defaultsLib = libByName(CONFIG.defaultsLibrary);
        if (!defaultsLib) {
            utils.addError(currentEntry, "Defaults knižnica nenájdená", "getNazovFirmy");
            return firmaNazov;
        }
        
        var defaultsEntries = defaultsLib.entries();
        if (!defaultsEntries || defaultsEntries.length === 0) {
            utils.addError(currentEntry, "Žiadne záznamy v Defaults knižnici", "getNazovFirmy");
            return firmaNazov;
        }
        
        var nazov = utils.safeGet(defaultsEntries[0], "Názov firmy", "");
        
        if (nazov) {
            utils.addDebug(currentEntry, "✅ Názov firmy: " + nazov);
            return nazov;
        }
        
        return firmaNazov;
        
    } catch (error) {
        utils.addError(currentEntry, error, "getNazovFirmy");
        return firmaNazov;
    }
}

function getApiKeys() {
    var result = { success: false, telegramToken: null };
    
    try {
        utils.addDebug(currentEntry, "🔑 Načítavam API keys z " + CONFIG.apiLibrary);
        
        var apiLib = libByName(CONFIG.apiLibrary);
        if (!apiLib) {
            utils.addError(currentEntry, "API knižnica nenájdená", "getApiKeys");
            return result;
        }
        
        var apiEntries = apiLib.entries();
        
        for (var i = 0; i < apiEntries.length; i++) {
            var provider = utils.safeGet(apiEntries[i], "provider", "");
            
            if (provider.toLowerCase() === "telegram") {
                var token = utils.safeGet(apiEntries[i], "api", "");
                if (token) {
                    result.success = true;
                    result.telegramToken = token;
                    utils.addDebug(currentEntry, "✅ Telegram API token načítaný");
                    break;
                }
            }
        }
        
    } catch (error) {
        utils.addError(currentEntry, error, "getApiKeys");
    }
    
    return result;
}

// ==============================================
// NOTIFIKAČNÁ LOGIKA  
// ==============================================

function posliNotifikaciuZamestnancovi(zamestnanec, zamestnanecIndex, apiKeys) {
    var result = { success: false, pocetOdoslanych: 0 };
    
    var nick = utils.safeGet(zamestnanec, "Nick", "") || 
               utils.safeGet(zamestnanec, "Meno", "") || 
               "Zamestnanec #" + (zamestnanecIndex + 1);
    
    utils.addDebug(currentEntry, "\n👤 Spracovávam notifikácie pre: " + nick);
    
    // Telegram notifikácia
    var telegramEnabled = utils.safeGet(zamestnanec, "telegram", false);
    if (telegramEnabled && apiKeys.telegramToken) {
        var chatId = utils.safeGet(zamestnanec, "Telegram ID", "");
        
        if (chatId) {
            var sprava = vytvorTelegramSpravu(zamestnanec, zamestnanecIndex);
            var telegramResult = posliTelegramSpravu(chatId, sprava, apiKeys.telegramToken);
            
            if (telegramResult.success) {
                result.pocetOdoslanych++;
                utils.addDebug(currentEntry, "  ✅ Telegram správa odoslaná");
                
                // Zaznamenaj notifikáciu (null pre threadId pri individuálnych notifikáciách)
                var notifZaznam = zaznamenajNotifikaciu(chatId, sprava, zamestnanec, telegramResult.messageId, null);
                if (notifZaznam) {
                    utils.addDebug(currentEntry, "  ✅ Notifikácia zaznamenaná v knižnici");
                    vytvoreneNotifikacie.push(notifZaznam);  // Ulož pre neskoršie linkovanie
                }
            } else {
                utils.addDebug(currentEntry, "  ❌ Telegram správa zlyhala");
            }
        } else {
            utils.addDebug(currentEntry, "  ⚠️ Chýba Telegram Chat ID");
        }
    }
    
    // SMS notifikácia (simulácia)
    var smsEnabled = utils.safeGet(zamestnanec, "sms", false);
    if (smsEnabled) {
        var telefon = utils.safeGet(zamestnanec, "Mobil", "");
        if (telefon) {
            utils.addDebug(currentEntry, "  📱 SMS simulácia na: " + telefon);
            result.pocetOdoslanych++;
            
            // Zaznamenaj SMS notifikáciu
            var smsSprava = "SMS: Dochádzka " + formatDate(utils.safeGet(currentEntry, CONFIG.fields.datum, null));
            var smsZaznam = zaznamenajNotifikaciu(telefon, smsSprava, zamestnanec, "SMS-" + moment().format("YYYYMMDDHHmmss"), null);
            if (smsZaznam) {
                vytvoreneNotifikacie.push(smsZaznam);
            }
        }
    }
    
    // Email notifikácia (simulácia)
    var emailEnabled = utils.safeGet(zamestnanec, "email", false);
    if (emailEnabled) {
        var email = utils.safeGet(zamestnanec, "Email", "");
        if (email) {
            utils.addDebug(currentEntry, "  📧 Email simulácia na: " + email);
            result.pocetOdoslanych++;
            
            // Zaznamenaj Email notifikáciu
            var emailSprava = vytvorTelegramSpravu(zamestnanec, zamestnanecIndex).replace(/\*/g, "");
            var emailZaznam = zaznamenajNotifikaciu(email, emailSprava, zamestnanec, "EMAIL-" + moment().format("YYYYMMDDHHmmss"), null);
            if (emailZaznam) {
                vytvoreneNotifikacie.push(emailZaznam);
            }
        }
    }
    
    result.success = result.pocetOdoslanych > 0;
    return result;
}

function posliTelegramSpravu(chatId, sprava, botToken) {
    try {
        var url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
        
        var httpObj = http();
        httpObj.headers({"Content-Type": "application/json"});
        
        var payload = {
            chat_id: chatId,
            text: sprava,
            parse_mode: CONFIG.telegramParseMode
        };
        
        var response = httpObj.post(url, JSON.stringify(payload));
        
        if (response.code === 200) {
            try {
                var responseData = JSON.parse(response.body);
                if (responseData.ok && responseData.result && responseData.result.message_id) {
                    return {
                        success: true,
                        messageId: responseData.result.message_id.toString()
                    };
                }
            } catch (e) {
                // Ak sa nepodarí parsovať response, aspoň vrátime success
                return { success: true, messageId: null };
            }
        }
        
        return { success: false, messageId: null };
        
    } catch (error) {
        utils.addError(currentEntry, error, "posliTelegramSpravu");
        return { success: false, messageId: null };
    }
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        // Inicializácia
        initializeUtils();
        utils.clearLogs(currentEntry, false); // Vyčisti len Debug_Log
        
        utils.addDebug(currentEntry, "\n" + CONFIG.icons.start + " === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        utils.addDebug(currentEntry, "✅ POUŽÍVA MementoUtils pre správne API volania");
        utils.addDebug(currentEntry, "✅ ZAZNAMENÁVA notifikácie do " + CONFIG.notificationsLibrary);
        utils.addDebug(currentEntry, "✅ Thread ID sa ukladá do samostatného poľa");
        utils.addDebug(currentEntry, "✅ VYMAŽE staré notifikácie pred vytvorením nových");
        
        // Vymaž staré notifikácie (vždy pri spustení scriptu)
        vymazStareNotifikacie();
        
        // Skontroluj existenciu notifications knižnice
        var notifLib = libByName(CONFIG.notificationsLibrary);
        if (!notifLib) {
            utils.addError(currentEntry, "Knižnica " + CONFIG.notificationsLibrary + " neexistuje!", "main");
            message("⚠️ UPOZORNENIE!\n\nKnižnica " + CONFIG.notificationsLibrary + " neexistuje.\n\nNotifikácie sa odošlú, ale nebudú zaznamenané.");
        }
        
        // Načítaj konfiguráciu
        firmaNazov = getNazovFirmy();
        var apiKeys = getApiKeys();
        
        if (!apiKeys.success) {
            message("❌ Chýba API konfigurácia!\n\nSkontroluj knižnicu " + CONFIG.apiLibrary);
            return;
        }
        
        // Získaj zamestnancov
        var zamestnanci = utils.safeGet(currentEntry, CONFIG.fields.zamestnanci, []);
        
        if (!zamestnanci || zamestnanci.length === 0) {
            message("❌ Žiadni zamestnanci v zázname!");
            return;
        }
        
        utils.addDebug(currentEntry, "\n📊 Spracovávam " + zamestnanci.length + " zamestnancov");
        
        // Spracuj každého zamestnanca
        var celkomUspesnych = 0;
        
        for (var i = 0; i < zamestnanci.length; i++) {
            var zamestnanec = zamestnanci[i];
            
            if (zamestnanec) {
                var vysledok = posliNotifikaciuZamestnancovi(zamestnanec, i, apiKeys);
                if (vysledok.success) {
                    celkomUspesnych++;
                }
            }
        }
        
        // Linkuj vytvorené notifikácie do dochádzky
        if (vytvoreneNotifikacie.length > 0) {
            utils.addDebug(currentEntry, "\n🔗 Linkujem " + vytvoreneNotifikacie.length + " notifikácií do dochádzky");
            utils.safeSet(currentEntry, CONFIG.fields.telegramNotifikacie, vytvoreneNotifikacie);
            utils.addDebug(currentEntry, "✅ Notifikácie nalinkované");
        }
        
        // Záverečná správa
        var vysledokSprava = "📧 NOTIFIKÁCIE v" + CONFIG.version + " DOKONČENÉ\n\n";
        vysledokSprava += "✅ Používa MementoUtils API\n";
        vysledokSprava += "✅ Zaznamenáva do " + CONFIG.notificationsLibrary + "\n";
        vysledokSprava += "✅ Thread ID v samostatnom poli\n";
        vysledokSprava += "✅ Automatické vymazanie starých notifikácií\n\n";
        vysledokSprava += "🏢 Firma: " + firmaNazov + "\n";
        vysledokSprava += "📊 Úspešné: " + celkomUspesnych + "/" + zamestnanci.length + "\n";
        vysledokSprava += "🔗 Nalinkovaných: " + vytvoreneNotifikacie.length + " notifikácií\n\n";
        vysledokSprava += "💡 Pri zmene záznamu sa staré notifikácie automaticky vymažú";
        
        utils.safeSet(currentEntry, CONFIG.fields.info, vysledokSprava);
        utils.addDebug(currentEntry, "\n✅ === KONIEC ÚSPEŠNÝ ===");
        
        message("🎉 " + vysledokSprava);
        
    } catch (criticalError) {
        utils.addError(currentEntry, criticalError, "MAIN-CRITICAL");
        message("💥 KRITICKÁ CHYBA!\n\n" + criticalError.toString() + "\n\nSkontroluj Error_Log");
    }
}

// Spustenie hlavnej funkcie
main();