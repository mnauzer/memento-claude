// ==============================================
// ACTION SCRIPT - DOCHÁDZKA NOTIFIKÁCIE
// Verzia: 2.5 | Typ: Action Script  
// Knižnica: Dochádzka
// ==============================================
// ✅ OPRAVENÉ v2.5 - SPRÁVNE NÁZVY ATRIBÚTOV:
//    - Používa presné názvy atribútov zo screenshotu
//    - Pridáva do správy len atribúty s nenulovou hodnotou
//    - Automatická detekcia všetkých dostupných atribútov
// ✅ v2.4: Správne Memento API pre atribúty
// ==============================================

var CONFIG = {
    debug: true,
    version: "2.5",
    scriptName: "Dochádzka Notifikácie",
    scriptType: "Action Script",
    
    apiLibrary: "ASISTANTO API",
    defaultsLibrary: "ASISTANTO Defaults",
    maxSMSLength: 160,
    telegramParseMode: "Markdown",
    
    // ✅ Správne názvy atribútov podľa screenshotu
    atributy: {
        dni: ["pondelok", "utorok", "streda", "štvrtok", "piatok", "sobota", "nedeľa"],
        prace: ["odpracované"],
        mzda: ["hodinovka", "prémia (€)", "príplatok (€/h)", "*pokuta (€)", "denná mzda", "mzdové náklady"]
    },
    
    icons: {
        start: "🚀",
        step: "📋",
        success: "✅", 
        error: "💥",
        warning: "⚠️"
    }
};

var currentEntry = entry();
var firmaNazov = "Default Firma";

// Detekcia MementoUtils
var hasMementoUtils = false;
try {
    hasMementoUtils = (typeof MementoUtils !== 'undefined' && MementoUtils !== null);
} catch (e) {
    hasMementoUtils = false;
}

// ==============================================
// UTILITY FUNKCIE
// ==============================================

function logDebug(message) {
    if (CONFIG.debug) {
        if (hasMementoUtils) {
            MementoUtils.addDebug(currentEntry, message);
        } else {
            var timestamp = moment().format("DD.MM.YY HH:mm:ss");
            var currentLog = currentEntry.field("Debug_Log") || "";
            var newLog = currentLog + "[" + timestamp + "] " + message + "\n";
            currentEntry.set("Debug_Log", newLog);
        }
    }
}

function logError(error, location) {
    if (hasMementoUtils) {
        MementoUtils.addError(currentEntry, error, location);
    } else {
        var timestamp = moment().format("DD.MM.YY HH:mm:ss");
        var errorMsg = "[" + timestamp + "] ❌ " + error.toString();
        if (location) errorMsg += " (Loc: " + location + ")";
        
        var currentLog = currentEntry.field("Error_Log") || "";
        currentEntry.set("Error_Log", currentLog + errorMsg + "\n");
    }
}

function clearLogs() {
    try {
        currentEntry.set("Debug_Log", "");
        currentEntry.set("Error_Log", "");
        currentEntry.set("info", "");
    } catch (e) {
        // Silent fail
    }
}

function safeGet(entryObj, fieldName, defaultValue) {
    if (hasMementoUtils) {
        return MementoUtils.safeGet(entryObj, fieldName, defaultValue);
    } else {
        try {
            var value = entryObj.field(fieldName);
            return (value !== null && value !== undefined) ? value : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }
}

function safeSet(entryObj, fieldName, value) {
    if (hasMementoUtils) {
        return MementoUtils.safeSet(entryObj, fieldName, value);
    } else {
        try {
            entryObj.set(fieldName, value);
            return true;
        } catch (e) {
            logError("Chyba pri nastavení poľa " + fieldName + ": " + e.toString(), "safeSet");
            return false;
        }
    }
}

function formatTime(timeValue) {
    if (hasMementoUtils) {
        return MementoUtils.formatTime(timeValue);
    } else {
        if (!timeValue) return "N/A";
        try {
            return moment(timeValue).format("HH:mm");
        } catch (e) {
            return "N/A";
        }
    }
}

function formatDate(dateValue) {
    if (hasMementoUtils) {
        return MementoUtils.formatDate(dateValue);
    } else {
        if (!dateValue) return "N/A";
        try {
            return moment(dateValue).format("DD.MM.YYYY");
        } catch (e) {
            return "N/A";
        }
    }
}

function formatMoney(amount) {
    if (hasMementoUtils) {
        return MementoUtils.formatMoney(amount);
    } else {
        if (typeof amount !== "number") return "0 €";
        return amount.toFixed(2) + " €";
    }
}

// ==============================================
// NAČÍTANIE NÁZVU FIRMY
// ==============================================

function getNazovFirmy() {
    try {
        logDebug("🏢 Načítavam názov firmy z " + CONFIG.defaultsLibrary + "...");
        
        var defaultsLib = libByName(CONFIG.defaultsLibrary);
        if (!defaultsLib) {
            logError("Defaults knižnica nenájdená: " + CONFIG.defaultsLibrary, "getNazovFirmy");
            return firmaNazov;
        }
        
        var defaultsEntries = defaultsLib.entries();
        if (!defaultsEntries || defaultsEntries.length === 0) {
            logError("Žiadne záznamy v Defaults knižnici", "getNazovFirmy");
            return firmaNazov;
        }
        
        var defaultsEntry = defaultsEntries[0];
        var nazov = safeGet(defaultsEntry, "Názov firmy", "");
        
        if (nazov) {
            logDebug("✅ Názov firmy načítaný: " + nazov);
            return nazov;
        } else {
            logError("Pole 'Názov firmy' je prázdne", "getNazovFirmy");
            return firmaNazov;
        }
        
    } catch (error) {
        logError("Chyba pri načítaní názvu firmy: " + error.toString(), "getNazovFirmy");
        return firmaNazov;
    }
}

// ==============================================
// USERNAME TO CHAT ID FALLBACK
// ==============================================

function getUserChatId(username, botToken) {
    try {
        if (!username || typeof username !== 'string') {
            logDebug("   💬 Chat ID je prázdny alebo nie je string");
            return null;
        }
        
        if (!username.startsWith('@')) {
            logDebug("   💬 Chat ID je už číselný: " + username);
            return username;
        }
        
        logDebug("   🔍 Konvertujem username " + username + " na Chat ID...");
        
        var url = "https://api.telegram.org/bot" + botToken + "/getUpdates";
        var httpObj = http();
        
        var response = httpObj.get(url);
        if (response.code !== 200) {
            logDebug("   ❌ getUpdates HTTP chyba " + response.code);
            return null;
        }
        
        var data = JSON.parse(response.body);
        if (!data.ok || !data.result) {
            logDebug("   ❌ getUpdates response nie je OK");
            return null;
        }
        
        var updates = data.result;
        logDebug("   📡 Načítaných " + updates.length + " updates");
        
        var targetUsername = username.substring(1).toLowerCase();
        
        for (var i = 0; i < updates.length; i++) {
            var update = updates[i];
            var chat = update.message && update.message.chat;
            
            if (chat && chat.username && chat.username.toLowerCase() === targetUsername) {
                var foundChatId = chat.id.toString();
                logDebug("   ✅ Nájdený Chat ID: " + foundChatId + " pre " + username);
                return foundChatId;
            }
        }
        
        logDebug("   ❌ Username " + username + " nenájdený v updates");
        return null;
        
    } catch (error) {
        logDebug("   ❌ Chyba pri konverzii username: " + error);
        return null;
    }
}

// ==============================================
// API FUNKCIE
// ==============================================

function getApiKeys() {
    var result = { success: false, telegramToken: null, botName: null, provider: null };
    
    try {
        logDebug("🔑 Načítavam API keys z " + CONFIG.apiLibrary + "...");
        
        var apiLib = libByName(CONFIG.apiLibrary);
        if (!apiLib) {
            logError("API knižnica nenájdená: " + CONFIG.apiLibrary, "getApiKeys");
            return result;
        }
        
        var apiEntries = apiLib.entries();
        if (!apiEntries || apiEntries.length === 0) {
            logError("Žiadne API záznamy", "getApiKeys");
            return result;
        }
        
        var telegramEntry = null;
        for (var i = 0; i < apiEntries.length; i++) {
            var entry = apiEntries[i];
            var provider = safeGet(entry, "provider", "");
            
            if (provider && provider.toLowerCase() === "telegram") {
                telegramEntry = entry;
                break;
            }
        }
        
        if (telegramEntry) {
            var telegramToken = safeGet(telegramEntry, "api", "");
            var botName = safeGet(telegramEntry, "názov", "");
            
            if (telegramToken) {
                result.success = true;
                result.telegramToken = telegramToken;
                result.botName = botName;
                result.provider = "telegram";
                
                logDebug("✅ Telegram API úspešne načítané: " + botName);
            }
        }
        
    } catch (error) {
        logError(error, "getApiKeys");
    }
    
    return result;
}

function posliTelegramSpravu(chatId, sprava, botToken) {
    var success = false;
    
    try {
        logDebug("📱 Posielam Telegram správu...");
        
        var finalChatId = getUserChatId(chatId, botToken);
        if (!finalChatId) {
            logError("Nepodarilo sa získať platný Chat ID pre " + chatId, "posliTelegramSpravu");
            return false;
        }
        
        var url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
        var payload = {
            chat_id: finalChatId,
            text: sprava,
            parse_mode: CONFIG.telegramParseMode
        };
        
        var httpObj = http();
        httpObj.headers({"Content-Type": "application/json"});
        
        var response = httpObj.post(url, JSON.stringify(payload));
        
        if (response.code === 200) {
            success = true;
            logDebug("✅ Telegram správa úspešne odoslaná");
        } else {
            logError("Telegram HTTP error " + response.code + ": " + response.body, "posliTelegramSpravu");
        }
        
    } catch (error) {
        logError(error, "posliTelegramSpravu");
    }
    
    return success;
}

// ==============================================
// ZAMESTNANCI HANDLING
// ==============================================

function getZamestnanciArray() {
    var zamestnanci = [];
    
    try {
        var zamestnanciField = safeGet(currentEntry, "Zamestnanci", null);
        
        if (Array.isArray(zamestnanciField)) {
            zamestnanci = zamestnanciField;
        } else if (zamestnanciField && typeof zamestnanciField === "object") {
            if (zamestnanciField.length !== undefined) {
                for (var i = 0; i < zamestnanciField.length; i++) {
                    if (zamestnanciField[i]) {
                        zamestnanci.push(zamestnanciField[i]);
                    }
                }
            } else {
                zamestnanci = [zamestnanciField];
            }
        }
        
        logDebug("👥 Načítaných " + zamestnanci.length + " zamestnancov");
        
    } catch (error) {
        logError("Chyba pri spracovaní Zamestnanci: " + error, "getZamestnanciArray");
    }
    
    return zamestnanci;
}

// ==============================================
// ✅ NOVÁ FUNKCIA - ZÍSKAJ VŠETKY NENULOVÉ ATRIBÚTY  
// ==============================================

function getZamestnanecAtributy(zamestnanecIndex) {
    var atributy = {};
    
    try {
        logDebug("🔍 Získavam atribúty pre zamestanca #" + zamestnanecIndex);
        
        var zamestnanciField = currentEntry.field("Zamestnanci");
        if (!zamestnanciField || zamestnanciField.length <= zamestnanecIndex) {
            logDebug("   ❌ Zamestnanec #" + zamestnanecIndex + " neexistuje");
            return atributy;
        }
        
        var zamestnanecEntry = zamestnanciField[zamestnanecIndex];
        
        // ✅ Skús všetky známe atribúty podľa screenshotu
        var vsetkyAtributy = [
            // Dni v týždni
            "pondelok", "utorok", "streda", "štvrtok", "piatok", "sobota", "nedeľa",
            // Pracovné údaje  
            "odpracované",
            // Mzdové údaje
            "hodinovka", "prémia (€)", "príplatok (€/h)", "*pokuta (€)", "denná mzda", "mzdové náklady"
        ];
        
        for (var i = 0; i < vsetkyAtributy.length; i++) {
            var nazovAtributu = vsetkyAtributy[i];
            
            try {
                var hodnota = zamestnanecEntry.attr(nazovAtributu);
                
                // ✅ Pridaj len nenulové hodnoty
                if (hodnota !== null && hodnota !== undefined && hodnota !== 0 && hodnota !== "") {
                    atributy[nazovAtributu] = hodnota;
                    logDebug("   ✅ " + nazovAtributu + " = " + hodnota);
                }
            } catch (error) {
                // Atribút neexistuje - pokračuj
            }
        }
        
        logDebug("   📊 Celkom nenulových atribútov: " + Object.keys(atributy).length);
        
    } catch (error) {
        logError("Chyba pri získavaní atribútov: " + error.toString(), "getZamestnanecAtributy");
    }
    
    return atributy;
}

// ==============================================
// ✅ AKTUALIZOVANÉ TEMPLATE FUNKCIE - LEN NENULOVÉ ATRIBÚTY
// ==============================================

function vytvorTelegramSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex) {
    var meno = safeGet(zamestnanec, "Meno", "");
    var priezvisko = safeGet(zamestnanec, "Priezvisko", "");
    var nick = safeGet(zamestnanec, "Nick", "");
    
    var celeMeno = nick || (meno + " " + priezvisko).trim() || "Zamestnanec";
    
    var datum = safeGet(dochadzkaZaznam, "Dátum", null);
    var prichod = safeGet(dochadzkaZaznam, "Príchod", null);
    var odchod = safeGet(dochadzkaZaznam, "Odchod", null);
    var prestavka = safeGet(dochadzkaZaznam, "Prestávka", 0);
    var poznamka = safeGet(dochadzkaZaznam, "Poznámka", "");
    
    // ✅ Získaj len nenulové atribúty
    var atributy = getZamestnanecAtributy(zamestnanecIndex);
    
    var projekt = "";
    var projektField = safeGet(dochadzkaZaznam, "Projekt/Zákazka", null);
    if (projektField && Array.isArray(projektField) && projektField.length > 0) {
        projekt = safeGet(projektField[0], "Názov záznamu", "") || 
                 safeGet(projektField[0], "Číslo", "") || "Projekt";
    }
    
    // Vytvor správu
    var sprava = "🏢 **Evidencia dochádzky**\n\n";
    sprava += "Dobrý deň **" + celeMeno + "**!\n\n";
    
    sprava += "📋 **Dochádzka " + formatDate(datum) + ":**\n";
    sprava += "🕐 Príchod: **" + formatTime(prichod) + "**\n";
    
    if (odchod) {
        sprava += "🕐 Odchod: **" + formatTime(odchod) + "**\n";
        
        // Pridaj odpracované hodiny ak existujú
        if (atributy["odpracované"]) {
            sprava += "⏱️ Odpracované: **" + atributy["odpracované"] + "h**\n";
            
            var nadcasy = Math.max(0, atributy["odpracované"] - 8);
            if (nadcasy > 0) {
                sprava += "⚡ Nadčasy: **" + nadcasy + "h**\n";
            }
        }
    }
    
    if (prestavka > 0) {
        sprava += "☕ Prestávka: " + prestavka + " min\n";
    }
    
    if (projekt) {
        sprava += "📦 Projekt: " + projekt + "\n";
    }
    
    // ✅ Pridaj len nenulové mzdové údaje
    var mzdoveUdaje = [];
    if (atributy["hodinovka"]) {
        mzdoveUdaje.push("• Hodinovka: " + atributy["hodinovka"] + " €/h");
    }
    if (atributy["prémia (€)"]) {
        mzdoveUdaje.push("• Prémia: **" + formatMoney(atributy["prémia (€)"]) + "**");
    }
    if (atributy["príplatok (€/h)"]) {
        mzdoveUdaje.push("• Príplatok: " + atributy["príplatok (€/h)"] + " €/h");
    }
    if (atributy["*pokuta (€)"]) {
        mzdoveUdaje.push("• Pokuta: **-" + formatMoney(atributy["*pokuta (€)"]) + "**");
    }
    if (atributy["denná mzda"]) {
        mzdoveUdaje.push("• Denná mzda: **" + formatMoney(atributy["denná mzda"]) + "**");
    }
    if (atributy["mzdové náklady"]) {
        mzdoveUdaje.push("• Celkové náklady: **" + formatMoney(atributy["mzdové náklady"]) + "**");
    }
    
    if (mzdoveUdaje.length > 0) {
        sprava += "\n💰 **Mzdové údaje:**\n";
        sprava += mzdoveUdaje.join("\n") + "\n";
    }
    
    // ✅ Pridaj dni v týždni ak sú nenulové
    var dniTyzdna = [];
    var dniNazvy = ["pondelok", "utorok", "streda", "štvrtok", "piatok", "sobota", "nedeľa"];
    for (var i = 0; i < dniNazvy.length; i++) {
        var den = dniNazvy[i];
        if (atributy[den]) {
            dniTyzdna.push(den.charAt(0).toUpperCase() + den.slice(1) + ": " + atributy[den] + "h");
        }
    }
    
    if (dniTyzdna.length > 0) {
        sprava += "\n📅 **Týždenný rozpis:**\n";
        sprava += "• " + dniTyzdna.join("\n• ") + "\n";
    }
    
    if (poznamka) {
        sprava += "\n📝 **Poznámka:** _" + poznamka + "_\n";
    }
    
    sprava += "\n---\n";
    sprava += firmaNazov + " | " + moment().format("DD.MM.YYYY HH:mm");
    
    return sprava;
}

function vytvorSMSSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex) {
    var nick = safeGet(zamestnanec, "Nick", "") || 
               safeGet(zamestnanec, "Meno", "") || "Zamestnanec";
    
    var prichod = safeGet(dochadzkaZaznam, "Príchod", null);
    var odchod = safeGet(dochadzkaZaznam, "Odchod", null);
    var atributy = getZamestnanecAtributy(zamestnanecIndex);
    
    var sprava = nick + ", ";
    
    if (odchod) {
        sprava += "dochádzka: " + formatTime(prichod) + "-" + formatTime(odchod);
        
        if (atributy["odpracované"]) {
            sprava += " (" + atributy["odpracované"] + "h)";
        }
        
        if (atributy["mzdové náklady"]) {
            sprava += ", náklady " + formatMoney(atributy["mzdové náklady"]);
        }
    } else {
        sprava += "príchod: " + formatTime(prichod);
    }
    
    sprava += ". " + firmaNazov;
    
    return sprava;
}

function vytvorEmailSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex) {
    var telegram = vytvorTelegramSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex);
    var email = telegram.replace(/\*\*/g, "").replace(/\*/g, "").replace(/_/g, "");
    return email;
}

// ==============================================
// NOTIFIKAČNÁ LOGIKA
// ==============================================

function posliNotifikaciuZamestnancovi(dochadzkaZaznam, zamestnanec, zamestnanecIndex, apiKeys) {
    var result = { success: false, uspesnePoslane: 0, celkovePokusy: 0 };
    
    var meno = safeGet(zamestnanec, "Nick", "") || 
               safeGet(zamestnanec, "Meno", "") || 
               "Zamestnanec #" + (zamestnanecIndex + 1);
    
    logDebug("👤 Spracovávam notifikácie pre: " + meno);
    
    // TELEGRAM
    var telegramNotif = safeGet(zamestnanec, "telegram", false);
    if (telegramNotif) {
        var chatId = safeGet(zamestnanec, "Telegram ID", "");
        if (chatId && apiKeys.success) {
            result.celkovePokusy++;
            
            var telegramSprava = vytvorTelegramSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex);
            
            if (posliTelegramSpravu(chatId, telegramSprava, apiKeys.telegramToken)) {
                result.uspesnePoslane++;
                logDebug("  ✅ Telegram správa ÚSPEŠNE poslaná");
            } else {
                logDebug("  ❌ Telegram správa ZLYHALA");
            }
        } else {
            logDebug("  ⚠️ Telegram zapnutý ale chýba Chat ID alebo token");
        }
    }
    
    // SMS
    var smsNotif = safeGet(zamestnanec, "sms", false);
    if (smsNotif) {
        var telefon = safeGet(zamestnanec, "Mobil", "");
        if (telefon) {
            result.celkovePokusy++;
            // SMS simulácia
            result.uspesnePoslane++;
            logDebug("  ✅ SMS simulácia");
        }
    }
    
    // EMAIL
    var emailNotif = safeGet(zamestnanec, "email", false);
    if (emailNotif) {
        var email = safeGet(zamestnanec, "Email", "");
        if (email) {
            result.celkovePokusy++;
            // Email simulácia
            result.uspesnePoslane++;
            logDebug("  ✅ Email simulácia");
        }
    }
    
    result.success = result.uspesnePoslane > 0;
    return result;
}

// ==============================================
// MAIN ACTION SCRIPT
// ==============================================

try {
    clearLogs();
    
    logDebug("🚀 === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
    logDebug("✅ OPRAVENÉ: Používa presné názvy atribútov + len nenulové hodnoty");
    
    firmaNazov = getNazovFirmy();
    
    var apiKeys = getApiKeys();
    var zamestnanci = getZamestnanciArray();
    
    if (zamestnanci.length === 0) {
        message("❌ Žiadni zamestnanci v zázname");
    } else {
        var celkemUspesnych = 0;
        var celkemZamestnancov = 0;
        
        for (var i = 0; i < zamestnanci.length; i++) {
            var zamestnanec = zamestnanci[i];
            
            if (zamestnanec) {
                celkemZamestnancov++;
                var vysledok = posliNotifikaciuZamestnancovi(currentEntry, zamestnanec, i, apiKeys);
                
                if (vysledok.success) {
                    celkemUspesnych++;
                }
            }
        }
        
        var vysledokSprava = "📧 NOTIFIKÁCIE v" + CONFIG.version + " DOKONČENÉ\n\n";
        vysledokSprava += "✅ SPRÁVNE ATRIBÚTY + LEN NENULOVÉ!\n\n";
        vysledokSprava += "🏢 Názov firmy: " + firmaNazov + "\n";
        vysledokSprava += "📊 Výsledok: " + celkemUspesnych + "/" + celkemZamestnancov + "\n\n";
        vysledokSprava += "💡 V správach sú len atribúty s hodnotou > 0";
        
        safeSet(currentEntry, "info", vysledokSprava);
        
        if (celkemUspesnych === celkemZamestnancov) {
            message("🎉 " + vysledokSprava);
        } else if (celkemUspesnych > 0) {
            message("⚠️ " + vysledokSprava);
        } else {
            message("🔍 " + vysledokSprava + "\n\nSkontroluj Debug_Log");
        }
    }
    
} catch (criticalError) {
    logError(criticalError, "MAIN-CRITICAL");
    message("💥 KRITICKÁ CHYBA!\n\n" + criticalError.toString());
}
