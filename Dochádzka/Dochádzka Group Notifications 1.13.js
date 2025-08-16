// ==============================================
// TRIGGER SCRIPT - DOCHÁDZKA GROUP NOTIFICATION
// Verzia: 1.3 | Typ: After Save Trigger
// Knižnica: Dochádzka
// ==============================================
// 📋 FUNKCIA:
//    - Po uložení záznamu dochádzky pošle súhrnnú správu
//    - Do Telegram skupiny/témy (thread)
//    - Obsahuje prehľad všetkých zamestnancov a celkové údaje
//    - Kontroluje nastavenie v ASISTANTO Defaults
// ✅ v1.3: Thread ID sa zapisuje do samostatného poľa
// ✅ v1.2: Vylepšená podpora pre group/thread ID formáty
// ✅ v1.1: Opravené zobrazenie času, pridaný deň v týždni
// ==============================================
// 📌 FORMÁTY pre "Telegram Dochádzka ID":
//    - Obyčajná skupina: "-1001234567890"
//    - Téma v supergroup: "-1001234567890/123"
//    - Súkromný chat: "123456789"
// 
// 🔍 AKO ZÍSKAŤ ID:
//    - Group ID: Pridaj @RawDataBot do skupiny
//    - Thread ID: V téme klikni na správu → Copy Link
//                 Z linku https://t.me/c/1234567890/123/456
//                 Thread ID je prostredné číslo (123)
// ==============================================

var CONFIG = {
    debug: true,
    version: "1.3",
    scriptName: "Dochádzka Group Notification",
    
    // Knižnice
    apiLibrary: "ASISTANTO API",
    defaultsLibrary: "ASISTANTO Defaults",
    notificationsLibrary: "ASISTANTO Notifications",
    
    // Názvy polí v Defaults
    defaultsFields: {
        dochadzkaEnabled: "dochádzka",
        telegramGroupId: "Telegram Dochádzka ID",
        nazovFirmy: "Názov firmy"
    },
    
    // Názvy polí v Dochádzke
    fields: {
        zamestnanci: "Zamestnanci",
        datum: "Dátum",
        prichod: "Príchod",
        odchod: "Odchod",
        pracovnaDoba: "Pracovná doba",
        pocetPracovnikov: "Počet pracovníkov",
        odpracovane: "Odpracované",
        mzdoveNaklady: "Mzdové náklady",
        projekt: "Projekt/Zákazka",
        poznamka: "Poznámka",
        debugLog: "Debug_Log",
        errorLog: "Error_Log"
    },
    
    // Atribúty
    attributes: {
        odpracovane: "odpracované",
        hodinovka: "hodinovka",
        priplatok: "+príplatok (€/h)",
        premia: "+prémia (€)",
        pokuta: "-pokuta (€)",
        dennaMzda: "denná mzda"
    }
};

// Globálne premenné
var currentEntry = entry();
var utils = null;

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
        
        safeGetAttribute: function(entry, field, index, attr, defaultValue) {
            try {
                var fieldValue = entry.field(field);
                if (fieldValue && fieldValue[index] && fieldValue[index].attr) {
                    var value = fieldValue[index].attr(attr);
                    return (value !== null && value !== undefined) ? value : defaultValue;
                }
            } catch (e) {}
            return defaultValue;
        },
        
        addDebug: function(entry, message) {
            if (!CONFIG.debug) return;
            var timestamp = moment().format("DD.MM.YY HH:mm:ss");
            var existing = entry.field(CONFIG.fields.debugLog) || "";
            entry.set(CONFIG.fields.debugLog, existing + "[" + timestamp + "] " + message + "\n");
        },
        
        addError: function(entry, error, location) {
            var timestamp = moment().format("DD.MM.YY HH:mm:ss");
            var msg = "[" + timestamp + "] ❌ " + (location ? "(" + location + ") " : "") + error.toString();
            var existing = entry.field(CONFIG.fields.errorLog) || "";
            entry.set(CONFIG.fields.errorLog, existing + msg + "\n");
        }
    };
    
    return false;
}

// ==============================================
// HELPER FUNKCIE
// ==============================================

function formatTime(timeValue) {
    if (!timeValue) return "00:00";
    
    try {
        // Ak je to Date objekt alebo timestamp
        return moment(timeValue).format("HH:mm");
    } catch (e) {
        // Ak je to číslo (hodiny)
        if (typeof timeValue === "number") {
            var totalMinutes = Math.round(timeValue * 60);
            var h = Math.floor(totalMinutes / 60);
            var m = totalMinutes % 60;
            return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
        }
        return "00:00";
    }
}

function formatMoney(amount) {
    if (typeof amount !== "number") return "0.00 €";
    return amount.toFixed(2) + " €";
}

function getEmployeeName(zamestnanec) {
    if (!zamestnanec) return "Neznámy";
    
    var nick = utils.safeGet(zamestnanec, "Nick", "");
    var meno = utils.safeGet(zamestnanec, "Meno", "");
    var priezvisko = utils.safeGet(zamestnanec, "Priezvisko", "");
    
    if (nick) {
        return priezvisko ? nick + " (" + priezvisko + ")" : nick;
    }
    
    return (meno + " " + priezvisko).trim() || "Neznámy";
}

// ==============================================
// KONFIGURÁCIA A NASTAVENIA
// ==============================================

function getDefaultsSettings() {
    try {
        utils.addDebug(currentEntry, "📋 Načítavam nastavenia z " + CONFIG.defaultsLibrary);
        
        var defaultsLib = libByName(CONFIG.defaultsLibrary);
        if (!defaultsLib) {
            utils.addError(currentEntry, "Defaults knižnica nenájdená", "getDefaultsSettings");
            return null;
        }
        
        var entries = defaultsLib.entries();
        if (!entries || entries.length === 0) {
            utils.addError(currentEntry, "Žiadne záznamy v Defaults", "getDefaultsSettings");
            return null;
        }
        
        var defaultsEntry = entries[0];
        
        return {
            enabled: utils.safeGet(defaultsEntry, CONFIG.defaultsFields.dochadzkaEnabled, false),
            groupId: utils.safeGet(defaultsEntry, CONFIG.defaultsFields.telegramGroupId, ""),
            firmName: utils.safeGet(defaultsEntry, CONFIG.defaultsFields.nazovFirmy, "Firma")
        };
        
    } catch (error) {
        utils.addError(currentEntry, error, "getDefaultsSettings");
        return null;
    }
}

function getTelegramToken() {
    try {
        var apiLib = libByName(CONFIG.apiLibrary);
        if (!apiLib) return null;
        
        var entries = apiLib.entries();
        for (var i = 0; i < entries.length; i++) {
            var provider = utils.safeGet(entries[i], "provider", "");
            if (provider.toLowerCase() === "telegram") {
                return utils.safeGet(entries[i], "api", "");
            }
        }
        
    } catch (error) {
        utils.addError(currentEntry, error, "getTelegramToken");
    }
    
    return null;
}

// ==============================================
// VYTVORENIE SÚHRNNEJ SPRÁVY
// ==============================================

function vytvorSuhrnnuSpravu(settings) {
    var datum = utils.safeGet(currentEntry, CONFIG.fields.datum, new Date());
    var prichod = utils.safeGet(currentEntry, CONFIG.fields.prichod, null);
    var odchod = utils.safeGet(currentEntry, CONFIG.fields.odchod, null);
    var pracovnaDoba = utils.safeGet(currentEntry, CONFIG.fields.pracovnaDoba, 0);
    var pocetPracovnikov = utils.safeGet(currentEntry, CONFIG.fields.pocetPracovnikov, 0);
    var odpracovaneTotal = utils.safeGet(currentEntry, CONFIG.fields.odpracovane, 0);
    var mzdoveNaklady = utils.safeGet(currentEntry, CONFIG.fields.mzdoveNaklady, 0);
    var poznamka = utils.safeGet(currentEntry, CONFIG.fields.poznamka, "");
    
    // Projekt
    var projekt = "";
    var projektField = utils.safeGet(currentEntry, CONFIG.fields.projekt, null);
    if (projektField && Array.isArray(projektField) && projektField.length > 0) {
        projekt = utils.safeGet(projektField[0], "Názov záznamu", "") || 
                 utils.safeGet(projektField[0], "Číslo", "") || "";
    }
    
    // Začiatok správy
    var sprava = "📊 **DOCHÁDZKA - DENNÝ SÚHRN**\n";
    sprava += "🏢 " + settings.firmName + "\n";
    
    // Dátum s dňom v týždni
    var dayNames = ["Nedeľa", "Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota"];
    var dayOfWeek = dayNames[moment(datum).day()];
    sprava += "📅 " + moment(datum).format("DD.MM.YYYY") + " (" + dayOfWeek + ")\n";
    
    sprava += "═══════════════════════\n\n";
    
    // Základné info
    sprava += "⏰ **Pracovný čas:** " + formatTime(prichod) + " - " + formatTime(odchod) + "\n";
    sprava += "⏱️ **Pracovná doba:** " + pracovnaDoba + " hodín\n";
    sprava += "👥 **Počet pracovníkov:** " + pocetPracovnikov + "\n";
    
    if (projekt) {
        sprava += "📦 **Projekt:** " + projekt + "\n";
    }
    
    sprava += "\n";
    
    // Detail zamestnancov
    var zamestnanci = utils.safeGet(currentEntry, CONFIG.fields.zamestnanci, []);
    
    if (zamestnanci.length > 0) {
        sprava += "👷 **ZAMESTNANCI:**\n";
        sprava += "```\n";
        
        for (var i = 0; i < zamestnanci.length; i++) {
            var zamestnanec = zamestnanci[i];
            if (!zamestnanec) continue;
            
            var meno = getEmployeeName(zamestnanec);
            var odpracovane = utils.safeGetAttribute(currentEntry, CONFIG.fields.zamestnanci, i, CONFIG.attributes.odpracovane, pracovnaDoba);
            var hodinovka = utils.safeGetAttribute(currentEntry, CONFIG.fields.zamestnanci, i, CONFIG.attributes.hodinovka, 0);
            var dennaMzda = utils.safeGetAttribute(currentEntry, CONFIG.fields.zamestnanci, i, CONFIG.attributes.dennaMzda, 0);
            
            sprava += (i + 1) + ". " + meno + "\n";
            sprava += "   • Odpracované: " + odpracovane + "h\n";
            sprava += "   • Hodinovka: " + hodinovka + " €/h\n";
            sprava += "   • Denná mzda: " + formatMoney(dennaMzda) + "\n";
            
            if (i < zamestnanci.length - 1) sprava += "\n";
        }
        
        sprava += "```\n\n";
    }
    
    // Súhrn
    sprava += "💰 **CELKOVÝ SÚHRN:**\n";
    sprava += "• Odpracované spolu: **" + odpracovaneTotal + " hodín**\n";
    sprava += "• Mzdové náklady: **" + formatMoney(mzdoveNaklady) + "**\n";
    sprava += "• Priemer na osobu: **" + (pocetPracovnikov > 0 ? formatMoney(mzdoveNaklady / pocetPracovnikov) : "0 €") + "**\n";
    
    if (poznamka) {
        sprava += "\n📝 _Poznámka: " + poznamka + "_\n";
    }
    
    sprava += "\n---\n";
    sprava += "🤖 _Automatická notifikácia | " + moment().format("HH:mm:ss") + "_";
    
    return sprava;
}

// ==============================================
// TELEGRAM FUNKCIE
// ==============================================

function posliTelegramSpravu(chatId, sprava, botToken, messageThreadId) {
    try {
        var url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
        
        var payload = {
            chat_id: chatId,
            text: sprava,
            parse_mode: "Markdown"
        };
        
        // Ak máme thread ID (pre témy v supergroup)
        if (messageThreadId && messageThreadId !== "" && messageThreadId !== "0") {
            payload.message_thread_id = parseInt(messageThreadId);
            utils.addDebug(currentEntry, "📍 Posielam do témy #" + messageThreadId);
        }
        
        var httpObj = http();
        httpObj.headers({"Content-Type": "application/json"});
        
        var response = httpObj.post(url, JSON.stringify(payload));
        
        if (response.code === 200) {
            try {
                var data = JSON.parse(response.body);
                if (data.ok && data.result) {
                    return {
                        success: true,
                        messageId: data.result.message_id ? data.result.message_id.toString() : null
                    };
                }
            } catch (e) {
                return { success: true, messageId: null };
            }
        } else {
            utils.addError(currentEntry, "Telegram API error " + response.code + ": " + response.body, "posliTelegramSpravu");
        }
        
    } catch (error) {
        utils.addError(currentEntry, error, "posliTelegramSpravu");
    }
    
    return { success: false, messageId: null };
}

function zaznamenajNotifikaciu(chatId, sprava, messageId, isGroup, threadId) {
    try {
        var notifLib = libByName(CONFIG.notificationsLibrary);
        if (!notifLib) return false;
        
        var notifData = {
            "Dátum": moment().toDate(),
            "Knižnica": "Dochádzka",
            "Chat ID": chatId,
            "Thread ID": threadId || "",  // Samostatné pole pre Thread ID
            "Message ID": messageId || "",
            "Adresát": isGroup ? (threadId ? "Skupina-Téma" : "Skupina") : "Zamestnanec",
            "Message": sprava
        };
        
        var novyZaznam = notifLib.create(notifData);
        return novyZaznam !== null;
        
    } catch (error) {
        utils.addError(currentEntry, error, "zaznamenajNotifikaciu");
        return false;
    }
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    // Zabezpečenie že script beží len ako After Save trigger
    if (typeof entry === 'undefined' || !entry()) {
        return;
    }
    
    try {
        initializeUtils();
        
        utils.addDebug(currentEntry, "\n🚀 === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        
        // 1. Načítaj nastavenia
        var settings = getDefaultsSettings();
        if (!settings) {
            utils.addDebug(currentEntry, "❌ Nepodarilo sa načítať nastavenia");
            return;
        }
        
        utils.addDebug(currentEntry, "📋 Nastavenia: enabled=" + settings.enabled + ", groupId=" + settings.groupId);
        
        // 2. Skontroluj či je funkcia zapnutá
        if (!settings.enabled) {
            utils.addDebug(currentEntry, "⏸️ Group notifikácie sú vypnuté");
            return;
        }
        
        // 3. Skontroluj group ID
        if (!settings.groupId) {
            utils.addError(currentEntry, "Chýba Telegram Group ID v nastaveniach", "main");
            utils.addDebug(currentEntry, "💡 TIP: Do poľa 'Telegram Dochádzka ID' zadaj:");
            utils.addDebug(currentEntry, "   • Pre skupinu: -1001234567890");
            utils.addDebug(currentEntry, "   • Pre tému: -1001234567890/123");
            return;
        }
        
        // 4. Získaj API token
        var botToken = getTelegramToken();
        if (!botToken) {
            utils.addError(currentEntry, "Telegram API token nenájdený", "main");
            return;
        }
        
        utils.addDebug(currentEntry, "✅ API token načítaný");
        
        // 5. Vytvor súhrnnú správu
        var sprava = vytvorSuhrnnuSpravu(settings);
        utils.addDebug(currentEntry, "📝 Súhrnná správa vytvorená (" + sprava.length + " znakov)");
        
        // 6. Pošli správu do skupiny
        // Podpora pre formáty: "groupId" alebo "groupId/threadId"
        var groupId = settings.groupId;
        var threadId = null;
        
        // Detekcia formátu s thread ID
        if (settings.groupId && settings.groupId.toString().indexOf("/") > -1) {
            var parts = settings.groupId.toString().split("/");
            groupId = parts[0].trim();
            threadId = parts[1] ? parts[1].trim() : null;
            
            utils.addDebug(currentEntry, "📌 Detekovaná téma v supergroup:");
            utils.addDebug(currentEntry, "   • Group ID: " + groupId);
            utils.addDebug(currentEntry, "   • Thread ID: " + threadId);
        } else {
            utils.addDebug(currentEntry, "📌 Obyčajná skupina: " + groupId);
        }
        
        // Validácia group ID
        if (!groupId || groupId === "") {
            utils.addError(currentEntry, "Neplatné Group ID", "main");
            return;
        }
        
        var result = posliTelegramSpravu(groupId, sprava, botToken, threadId);
        
        if (result.success) {
            utils.addDebug(currentEntry, "✅ Správa úspešne odoslaná do skupiny");
            utils.addDebug(currentEntry, "   • Message ID: " + (result.messageId || "N/A"));
            if (threadId) {
                utils.addDebug(currentEntry, "   • Thread ID: " + threadId);
            }
            
            // 7. Zaznamenaj notifikáciu
            if (zaznamenajNotifikaciu(groupId, sprava, result.messageId, true, threadId)) {
                utils.addDebug(currentEntry, "✅ Notifikácia zaznamenaná v knižnici");
            }
            
            utils.addDebug(currentEntry, "\n✅ === GROUP NOTIFICATION ÚSPEŠNÁ ===");
        } else {
            utils.addError(currentEntry, "Nepodarilo sa poslať správu do skupiny", "main");
        }
        
    } catch (error) {
        utils.addError(currentEntry, error, "main-critical");
    }
}

// Spustenie
main();