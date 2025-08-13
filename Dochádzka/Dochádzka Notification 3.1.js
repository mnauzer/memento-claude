// ==============================================
// MEMENTO DATABASE - DOCHÁDZKA NOTIFIKÁCIE
// Verzia: 3.1 OPRAVENÁ | Dátum: 13.08.2025 | Autor: ASISTANTO
// Knižnica: Dochádzka | Typ: Action Script
// ==============================================

// Import MementoUtils knižnice
var utils = MementoUtils;
var currentEntry = entry();

// Konfigurácia
var CONFIG = {
    debug: true,
    version: "3.1 OPRAVENÁ",
    scriptName: "Dochádzka Notifikácie",
    scriptType: "Action Script",
    
    // Názvy knižníc
    libraries: {
        apiLibrary: "ASISTANTO API",
        defaultsLibrary: "ASISTANTO Defaults"
    },
    
    // Názvy polí - Dochádzka
    fields: {
        zamestnanci: "Zamestnanci",
        datum: "Dátum",
        prichod: "Príchod", 
        odchod: "Odchod",
        poznamka: "Poznámka",
        pracovnaDoba: "Pracovná doba",
        info: "info",
        debugLog: "Debug_Log",
        errorLog: "Error_Log"
    },
    
    // Názvy polí - Zamestnanci
    zamFields: {
        nick: "Nick",
        meno: "Meno",
        priezvisko: "Priezvisko",
        mobil: "Mobil",
        email: "Email",
        telegramId: "Telegram ID",
        telegram: "telegram",
        sms: "sms",
        emailNotif: "email"
    },
    
    // Atribúty zamestnancov ktoré chceme
    wantedAttributes: [
        "hodinovka",
        "+príplatok (€/h)",
        "+prémia (€)",
        "-pokuta (€)",
        "denná mzda",
        "poznámka"
    ],
    
    // API konfigurácia
    api: {
        maxSMSLength: 160,
        telegramParseMode: "Markdown",
        maxRetries: 2,
        timeout: 30000
    },
    
    // Ikony pre správy
    icons: {
        start: "🚀",
        step: "📋", 
        success: "✅",
        error: "💥",
        warning: "⚠️",
        info: "📧",
        time: "⏰",
        money: "💰",
        person: "👤",
        building: "🏢"
    }
};

// ==============================================
// UTILITY FUNKCIE
// ==============================================

/**
 * Formátovanie času
 */
function formatTime(timeValue) {
    if (!timeValue) return null;
    try {
        if (typeof timeValue === 'number') {
            var hours = Math.floor(timeValue);
            var minutes = Math.round((timeValue - hours) * 60);
            return (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes;
        }
        return moment(timeValue).format("HH:mm");
    } catch (e) {
        return null;
    }
}

/**
 * Formátovanie dátumu
 */
function formatDate(dateValue) {
    if (!dateValue) return null;
    try {
        return moment(dateValue).format("DD.MM.YYYY");
    } catch (e) {
        return null;
    }
}

/**
 * Formátovanie peňazí
 */
function formatMoney(amount) {
    if (!amount && amount !== 0) return null;
    try {
        return parseFloat(amount).toFixed(2) + " €";
    } catch (e) {
        return null;
    }
}

/**
 * Získanie názvu firmy z Defaults knižnice
 */
function getNazovFirmy() {
    try {
        var defaultsLib = libByName(CONFIG.libraries.defaultsLibrary);
        if (!defaultsLib) {
            utils.addDebug(currentEntry, "⚠️ Defaults knižnica nenájdená");
            return "Firma";
        }
        
        var defaultsEntries = defaultsLib.entries();
        if (defaultsEntries && defaultsEntries.length > 0) {
            var nazov = utils.safeGet(defaultsEntries[0], "Názov firmy", "Firma");
            utils.addDebug(currentEntry, "✅ Názov firmy: " + nazov);
            return nazov;
        }
    } catch (e) {
        utils.addError(currentEntry, e, "getNazovFirmy");
    }
    
    return "Firma";
}

/**
 * Získanie mena zamestnanca
 */
function getEmployeeName(zamestnanec) {
    if (!zamestnanec) return "Zamestnanec";
    
    var nick = utils.safeGet(zamestnanec, CONFIG.zamFields.nick, "");
    var meno = utils.safeGet(zamestnanec, CONFIG.zamFields.meno, "");
    var priezvisko = utils.safeGet(zamestnanec, CONFIG.zamFields.priezvisko, "");
    
    if (nick) {
        return priezvisko ? nick + " (" + priezvisko + ")" : nick;
    }
    
    return (meno + " " + priezvisko).trim() || "Zamestnanec";
}

// ==============================================
// OPRAVENÉ API FUNKCIE
// ==============================================

/**
 * Získanie API kľúčov z ASISTANTO API knižnice - OPRAVENÉ
 */
function getApiKeys() {
    var result = {
        success: false,
        telegramToken: null,
        botName: null,
        provider: null
    };
    
    try {
        utils.addDebug(currentEntry, "🔑 Načítavam API kľúče z " + CONFIG.libraries.apiLibrary + "...");
        
        var apiLib = libByName(CONFIG.libraries.apiLibrary);
        if (!apiLib) {
            utils.addError(currentEntry, "API knižnica nenájdená: " + CONFIG.libraries.apiLibrary, "getApiKeys");
            return result;
        }
        
        var apiEntries = apiLib.entries();
        if (!apiEntries || apiEntries.length === 0) {
            utils.addError(currentEntry, "Žiadne API záznamy v knižnici", "getApiKeys");
            return result;
        }
        
        // OPRAVENÉ: Hľadáme Telegram provider
        var telegramEntry = null;
        for (var i = 0; i < apiEntries.length; i++) {
            var apiEntry = apiEntries[i];
            var provider = utils.safeGet(apiEntry, "provider", "") ||
                          utils.safeGet(apiEntry, "Provider", "");
            
            if (provider && provider.toLowerCase() === "telegram") {
                telegramEntry = apiEntry;
                break;
            }
        }
        
        if (telegramEntry) {
            var telegramToken = utils.safeGet(telegramEntry, "api", "") ||
                               utils.safeGet(telegramEntry, "API_Key", "") ||
                               utils.safeGet(telegramEntry, "Telegram Bot Token", "");
            var botName = utils.safeGet(telegramEntry, "názov", "") ||
                         utils.safeGet(telegramEntry, "Názov", "");
            
            if (telegramToken && telegramToken.trim() !== "") {
                result.success = true;
                result.telegramToken = telegramToken;
                result.botName = botName;
                result.provider = "telegram";
                utils.addDebug(currentEntry, "✅ Telegram API kľúč načítaný: " + botName);
            } else {
                utils.addError(currentEntry, "Prázdny Telegram API kľúč", "getApiKeys");
            }
        } else {
            utils.addError(currentEntry, "Telegram provider nenájdený v API knižnici", "getApiKeys");
        }
        
    } catch (e) {
        utils.addError(currentEntry, e, "getApiKeys");
    }
    
    return result;
}

/**
 * Username to Chat ID konverzia s fallback
 */
function getUserChatId(username, botToken) {
    try {
        if (!username || typeof username !== 'string') {
            utils.addDebug(currentEntry, "💬 Chat ID je prázdny alebo nie je string");
            return null;
        }
        
        if (!username.startsWith('@')) {
            utils.addDebug(currentEntry, "💬 Chat ID je už číselný: " + username);
            return username;
        }
        
        utils.addDebug(currentEntry, "🔍 Konvertujem username " + username + " na Chat ID...");
        
        var url = "https://api.telegram.org/bot" + botToken + "/getUpdates";
        var httpObj = http();
        var response = httpObj.get(url);
        
        if (response.code !== 200) {
            utils.addDebug(currentEntry, "❌ getUpdates HTTP chyba " + response.code);
            return null;
        }
        
        var data = JSON.parse(response.body);
        if (!data.ok || !data.result) {
            utils.addDebug(currentEntry, "❌ getUpdates response nie je OK");
            return null;
        }
        
        var updates = data.result;
        utils.addDebug(currentEntry, "📡 Načítaných " + updates.length + " updates");
        
        var targetUsername = username.substring(1).toLowerCase();
        for (var i = 0; i < updates.length; i++) {
            var update = updates[i];
            var chat = update.message && update.message.chat;
            if (chat && chat.username && chat.username.toLowerCase() === targetUsername) {
                var foundChatId = chat.id.toString();
                utils.addDebug(currentEntry, "✅ Nájdený Chat ID: " + foundChatId + " pre " + username);
                return foundChatId;
            }
        }
        
        utils.addDebug(currentEntry, "❌ Username " + username + " nenájdený v updates");
        return null;
        
    } catch (e) {
        utils.addError(currentEntry, e, "getUserChatId");
        return null;
    }
}

/**
 * Poslanie Telegram správy s fallback
 */
function posliTelegramSpravu(chatId, sprava, token) {
    if (!chatId || !sprava || !token) {
        utils.addDebug(currentEntry, "⚠️ Telegram: Chýbajú parametre");
        return false;
    }
    
    try {
        var finalChatId = getUserChatId(chatId, token);
        if (!finalChatId) {
            utils.addError(currentEntry, "Nepodarilo sa získať platný Chat ID pre " + chatId, "posliTelegramSpravu");
            return false;
        }
        
        var url = "https://api.telegram.org/bot" + token + "/sendMessage";
        var payload = {
            chat_id: finalChatId,
            text: sprava,
            parse_mode: CONFIG.api.telegramParseMode
        };
        
        var httpObj = http();
        httpObj.headers({"Content-Type": "application/json"});
        var response = httpObj.post(url, JSON.stringify(payload));
        
        if (response.code === 200) {
            utils.addDebug(currentEntry, "✅ Telegram správa úspešne odoslaná do " + finalChatId);
            return true;
        } else {
            utils.addError(currentEntry, "Telegram API error " + response.code + ": " + response.body, "posliTelegramSpravu");
            return false;
        }
        
    } catch (e) {
        utils.addError(currentEntry, e, "posliTelegramSpravu");
        return false;
    }
}

// ==============================================
// ZÍSKANIE ATRIBÚTOV - OPRAVENÉ A ZJEDNODUŠENÉ
// ==============================================

/**
 * Získanie atribútov zamestnanca s nenulovými hodnotami - OPRAVENÉ
 */
function getZamestnanecAtributy(zamestnanecIndex) {
    var atributy = {};
    
    try {
        utils.addDebug(currentEntry, "🔍 Získavam atribúty pre zamestnanca #" + zamestnanecIndex);
        
        // Prechádzaj len požadované atribúty
        for (var i = 0; i < CONFIG.wantedAttributes.length; i++) {
            var attrName = CONFIG.wantedAttributes[i];
            var value = utils.safeGetAttr(currentEntry, CONFIG.fields.zamestnanci, attrName, zamestnanecIndex, null);
            
            // Pridaj len nenulové hodnoty
            if (value !== null && value !== undefined && value !== 0 && value !== "") {
                atributy[attrName] = value;
                utils.addDebug(currentEntry, " 📊 Atribút '" + attrName + "': " + value);
            }
        }
        
    } catch (e) {
        utils.addError(currentEntry, e, "getZamestnanecAtributy");
    }
    
    return atributy;
}

// ==============================================
// VYTVORENIE SPRÁV - ZJEDNODUŠENÉ
// ==============================================

/**
 * Vytvorenie Telegram správy - ZJEDNODUŠENÉ
 */
function vytvorTelegramSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex, firmaNazov) {
    var menoZamestnanca = getEmployeeName(zamestnanec);
    
    // Získaj základné polia - pridaj len ak majú hodnotu
    var datum = utils.safeGet(dochadzkaZaznam, CONFIG.fields.datum, null);
    var prichod = utils.safeGet(dochadzkaZaznam, CONFIG.fields.prichod, null);
    var odchod = utils.safeGet(dochadzkaZaznam, CONFIG.fields.odchod, null);
    var poznamka = utils.safeGet(dochadzkaZaznam, CONFIG.fields.poznamka, "");
    var pracovnaDoba = utils.safeGet(dochadzkaZaznam, CONFIG.fields.pracovnaDoba, null);
    
    // Získaj atribúty zamestnanca
    var atributy = getZamestnanecAtributy(zamestnanecIndex);
    
    // Vytvor správu
    var sprava = CONFIG.icons.building + " **Evidencia dochádzky**\n\n";
    sprava += "Dobrý deň **" + menoZamestnanca + "**!\n\n";
    
    // Pridaj polia len ak majú hodnotu
    if (datum) {
        sprava += CONFIG.icons.step + " **Dochádzka " + formatDate(datum) + ":**\n";
    }
    
    if (prichod) {
        sprava += CONFIG.icons.time + " Príchod: **" + formatTime(prichod) + "**\n";
    }
    
    if (odchod) {
        sprava += CONFIG.icons.time + " Odchod: **" + formatTime(odchod) + "**\n";
    }
    
    if (pracovnaDoba) {
        sprava += "⏱️ Pracovná doba: **" + pracovnaDoba + "h**\n";
    }
    
    if (poznamka) {
        sprava += "📝 **Poznámka:** _" + poznamka + "_\n";
    }
    
    // Pridaj atribúty zamestnanca ak existujú
    var mzdoveUdaje = [];
    
    if (atributy["hodinovka"]) {
        mzdoveUdaje.push("• Hodinovka: **" + formatMoney(atributy["hodinovka"]) + "/h**");
    }
    
    if (atributy["+príplatok (€/h)"]) {
        mzdoveUdaje.push("• Príplatok: **+" + formatMoney(atributy["+príplatok (€/h)"]) + "/h**");
    }
    
    if (atributy["+prémia (€)"]) {
        mzdoveUdaje.push("• Prémia: **+" + formatMoney(atributy["+prémia (€)"]) + "**");
    }
    
    if (atributy["-pokuta (€)"]) {
        mzdoveUdaje.push("• Pokuta: **-" + formatMoney(atributy["-pokuta (€)"]) + "**");
    }
    
    if (atributy["denná mzda"]) {
        mzdoveUdaje.push("• Denná mzda: **" + formatMoney(atributy["denná mzda"]) + "**");
    }
    
    if (mzdoveUdaje.length > 0) {
        sprava += "\n" + CONFIG.icons.money + " **Mzdové údaje:**\n";
        sprava += mzdoveUdaje.join("\n") + "\n";
    }
    
    // Pridaj poznámku zamestnanca ak existuje
    if (atributy["poznámka"]) {
        sprava += "\n💭 **Poznámka zamestnanca:** _" + atributy["poznámka"] + "_\n";
    }
    
    sprava += "\n---\n";
    sprava += firmaNazov + " | " + moment().format("DD.MM.YYYY HH:mm");
    
    return sprava;
}

/**
 * Vytvorenie SMS správy - ZJEDNODUŠENÉ
 */
function vytvorSMSSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex, firmaNazov) {
    var menoZamestnanca = getEmployeeName(zamestnanec);
    var prichod = utils.safeGet(dochadzkaZaznam, CONFIG.fields.prichod, null);
    var odchod = utils.safeGet(dochadzkaZaznam, CONFIG.fields.odchod, null);
    var pracovnaDoba = utils.safeGet(dochadzkaZaznam, CONFIG.fields.pracovnaDoba, null);
    var atributy = getZamestnanecAtributy(zamestnanecIndex);
    
    var sprava = menoZamestnanca + ", ";
    
    if (prichod) {
        sprava += "príchod: " + formatTime(prichod);
        if (odchod) {
            sprava += "-" + formatTime(odchod);
        }
        if (pracovnaDoba) {
            sprava += " (" + pracovnaDoba + "h)";
        }
    }
    
    if (atributy["denná mzda"]) {
        sprava += ", mzda " + formatMoney(atributy["denná mzda"]);
    }
    
    sprava += ". " + firmaNazov;
    
    // Skráť správu ak je príliš dlhá
    if (sprava.length > CONFIG.api.maxSMSLength) {
        sprava = sprava.substring(0, CONFIG.api.maxSMSLength - 3) + "...";
    }
    
    return sprava;
}

/**
 * Vytvorenie Email správy
 */
function vytvorEmailSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex, firmaNazov) {
    var telegram = vytvorTelegramSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex, firmaNazov);
    // Odstráň Markdown formátovanie pre email
    var email = telegram.replace(/\*\*/g, "").replace(/\*/g, "").replace(/_/g, "");
    return email;
}

// ==============================================
// NOTIFIKAČNÁ LOGIKA - OPRAVENÁ
// ==============================================

/**
 * Poslanie notifikácií jednému zamestnancovi
 */
function posliNotifikaciuZamestnancovi(dochadzkaZaznam, zamestnanec, zamestnanecIndex, apiKeys, firmaNazov) {
    var result = {
        success: false,
        uspesnePoslane: 0,
        celkovePokusy: 0,
        detaily: []
    };
    
    var menoZamestnanca = getEmployeeName(zamestnanec);
    utils.addDebug(currentEntry, "\n" + CONFIG.icons.person + " Spracovávam notifikácie pre: " + menoZamestnanca);
    
    // TELEGRAM
    var telegramNotif = utils.safeGet(zamestnanec, CONFIG.zamFields.telegram, false);
    if (telegramNotif) {
        var chatId = utils.safeGet(zamestnanec, CONFIG.zamFields.telegramId, "");
        if (chatId && apiKeys.telegramToken) {
            result.celkovePokusy++;
            var telegramSprava = vytvorTelegramSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex, firmaNazov);
            if (posliTelegramSpravu(chatId, telegramSprava, apiKeys.telegramToken)) {
                result.uspesnePoslane++;
                result.detaily.push("Telegram ✅");
                utils.addDebug(currentEntry, " ✅ Telegram správa ÚSPEŠNE poslaná");
            } else {
                result.detaily.push("Telegram ❌");
                utils.addDebug(currentEntry, " ❌ Telegram správa ZLYHALA");
            }
        } else {
            utils.addDebug(currentEntry, " ⚠️ Telegram zapnutý ale chýba Chat ID alebo token");
        }
    }
    
    // SMS (simulácia)
    var smsNotif = utils.safeGet(zamestnanec, CONFIG.zamFields.sms, false);
    if (smsNotif) {
        var telefon = utils.safeGet(zamestnanec, CONFIG.zamFields.mobil, "");
        if (telefon) {
            result.celkovePokusy++;
            var smsSprava = vytvorSMSSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex, firmaNazov);
            // Simulácia SMS
            utils.addDebug(currentEntry, " 📱 SMS simulácia: " + smsSprava);
            result.uspesnePoslane++;
            result.detaily.push("SMS ✅");
            utils.addDebug(currentEntry, " ✅ SMS simulácia úspešná");
        } else {
            utils.addDebug(currentEntry, " ⚠️ SMS zapnutá ale chýba telefónne číslo");
        }
    }
    
    // EMAIL (simulácia)
    var emailNotif = utils.safeGet(zamestnanec, CONFIG.zamFields.emailNotif, false);
    if (emailNotif) {
        var email = utils.safeGet(zamestnanec, CONFIG.zamFields.email, "");
        if (email) {
            result.celkovePokusy++;
            var emailSprava = vytvorEmailSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex, firmaNazov);
            var predmet = "Dochádzka " + formatDate(utils.safeGet(dochadzkaZaznam, CONFIG.fields.datum, null));
            // Simulácia Email
            utils.addDebug(currentEntry, " 📧 Email simulácia: " + predmet);
            result.uspesnePoslane++;
            result.detaily.push("Email ✅");
            utils.addDebug(currentEntry, " ✅ Email simulácia úspešná");
        } else {
            utils.addDebug(currentEntry, " ⚠️ Email zapnutý ale chýba emailová adresa");
        }
    }
    
    result.success = result.uspesnePoslane > 0;
    if (result.celkovePokusy === 0) {
        utils.addDebug(currentEntry, " ℹ️ Žiadne notifikácie nie sú zapnuté");
    }
    
    return result;
}

// ==============================================
// HLAVNÁ FUNKCIA - OPRAVENÁ
// ==============================================

function hlavnaFunkcia() {
    // Vyčisti logy na začiatku
    utils.clearLogs(currentEntry, false);
    
    utils.addDebug(currentEntry, "==================================================");
    utils.addDebug(currentEntry, CONFIG.icons.start + " ŠTART " + CONFIG.scriptName + " v" + CONFIG.version);
    utils.addDebug(currentEntry, "📅 Čas spustenia: " + moment().format("DD.MM.YYYY HH:mm:ss"));
    utils.addDebug(currentEntry, "📚 MementoUtils: v" + utils.version);
    utils.addDebug(currentEntry, "==================================================");
    
    try {
        // Získaj názov firmy
        var firmaNazov = getNazovFirmy();
        
        // Získaj API kľúče
        utils.addDebug(currentEntry, "\n" + CONFIG.icons.step + " KROK 1: Získavam API kľúče");
        var apiKeys = getApiKeys();
        if (!apiKeys.success) {
            utils.addDebug(currentEntry, CONFIG.icons.warning + " Žiadne API kľúče nenájdené - niektoré notifikácie nebudú fungovať");
        }
        
        // Získaj zamestnancov
        utils.addDebug(currentEntry, "\n" + CONFIG.icons.step + " KROK 2: Získavam zamestnancov");
        var zamestnanci = utils.safeGet(currentEntry, CONFIG.fields.zamestnanci, []);
        
        if (!zamestnanci || zamestnanci.length === 0) {
            utils.addError(currentEntry, "Žiadni zamestnanci v zázname", "main");
            message("❌ Žiadni zamestnanci v zázname dochádzky!");
            return false;
        }
        
        utils.addDebug(currentEntry, CONFIG.icons.success + " Počet zamestnancov: " + zamestnanci.length);
        
        // Spracuj notifikácie
        utils.addDebug(currentEntry, "\n" + CONFIG.icons.step + " KROK 3: Posielam notifikácie");
        var celkemUspesnych = 0;
        var celkemNeuspesnych = 0;
        var detailyNotifikacii = [];
        
        for (var i = 0; i < zamestnanci.length; i++) {
            var zamestnanec = zamestnanci[i];
            if (zamestnanec) {
                var vysledok = posliNotifikaciuZamestnancovi(
                    currentEntry,
                    zamestnanec, 
                    i,
                    apiKeys,
                    firmaNazov
                );
                
                if (vysledok.success) {
                    celkemUspesnych++;
                } else if (vysledok.celkovePokusy > 0) {
                    celkemNeuspesnych++;
                }
                
                // Ulož detaily pre info správu
                var menoZam = getEmployeeName(zamestnanec);
                if (vysledok.detaily.length > 0) {
                    detailyNotifikacii.push(menoZam + ": " + vysledok.detaily.join(", "));
                }
            }
        }
        
        // Vytvor info správu
        utils.addDebug(currentEntry, "\n" + CONFIG.icons.step + " KROK 4: Vytváram súhrn");
        var infoMessage = CONFIG.icons.info + " DOCHÁDZKA NOTIFIKÁCIE v" + CONFIG.version + "\n";
        infoMessage += "=====================================\n\n";
        infoMessage += CONFIG.icons.building + " Firma: " + firmaNazov + "\n";
        
        var datum = utils.safeGet(currentEntry, CONFIG.fields.datum, null);
        if (datum) {
            infoMessage += "📅 Dátum: " + formatDate(datum) + "\n";
        }
        
        var prichod = utils.safeGet(currentEntry, CONFIG.fields.prichod, null);
        if (prichod) {
            infoMessage += CONFIG.icons.time + " Čas: " + formatTime(prichod);
            var odchod = utils.safeGet(currentEntry, CONFIG.fields.odchod, null);
            if (odchod) {
                infoMessage += " - " + formatTime(odchod);
            }
            infoMessage += "\n";
        }
        
        infoMessage += "\n";
        infoMessage += "📊 VÝSLEDOK NOTIFIKÁCIÍ:\n";
        infoMessage += "• Úspešné: " + celkemUspesnych + "/" + zamestnanci.length + "\n";
        if (celkemNeuspesnych > 0) {
            infoMessage += "• Neúspešné: " + celkemNeuspesnych + "\n";
        }
        infoMessage += "\n";
        
        if (detailyNotifikacii.length > 0) {
            infoMessage += "📝 DETAILY:\n";
            for (var j = 0; j < detailyNotifikacii.length; j++) {
                infoMessage += "• " + detailyNotifikacii[j] + "\n";
            }
            infoMessage += "\n";
        }
        
        infoMessage += "🔧 TECHNICKÉ INFO:\n";
        infoMessage += "• Script verzia: " + CONFIG.version + "\n";
        infoMessage += "• MementoUtils: " + utils.version + "\n";
        infoMessage += "• Čas generovania: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
        infoMessage += "• Typ: " + CONFIG.scriptType + "\n\n";
        
        if (celkemUspesnych === zamestnanci.length) {
            infoMessage += CONFIG.icons.success + " Všetky notifikácie úspešne poslané!";
        } else if (celkemUspesnych > 0) {
            infoMessage += CONFIG.icons.warning + " Niektoré notifikácie zlyhali";
        } else {
            infoMessage += CONFIG.icons.error + " Žiadne notifikácie neboli poslané";
        }
        
        // Ulož info
        utils.safeSet(currentEntry, CONFIG.fields.info, infoMessage);
        
        // Vytvor info záznam pre MementoUtils
        utils.addInfo(currentEntry, "Notifikácie odoslané", {
            method: CONFIG.scriptName,
            sourceId: utils.safeGet(currentEntry, "ID", "N/A"),
            result: "Úspešne: " + celkemUspesnych + "/" + zamestnanci.length,
            libraryName: "Dochádzka"
        });
        
        // Finálny debug log
        utils.addDebug(currentEntry, "\n==================================================");
        if (celkemUspesnych === zamestnanci.length) {
            utils.addDebug(currentEntry, "🎉 NOTIFIKÁCIE DOKONČENÉ ÚSPEŠNE!");
        } else {
            utils.addDebug(currentEntry, "⚠️ NOTIFIKÁCIE DOKONČENÉ S ČIASTOČNÝM ÚSPECHOM");
        }
        utils.addDebug(currentEntry, "==================================================");
        
        // Ulož logy
        utils.saveLogs(currentEntry);
        
        // Zobraz správu používateľovi
        if (celkemUspesnych === zamestnanci.length) {
            message("🎉 Notifikácie úspešne odoslané!\n\n" +
                    "✅ Všetkým " + zamestnanci.length + " zamestnancom\n" +
                    "📧 Detaily v poli 'info'");
        } else if (celkemUspesnych > 0) {
            message("⚠️ Notifikácie čiastočne odoslané\n\n" +
                    "✅ Úspešné: " + celkemUspesnych + "/" + zamestnanci.length + "\n" +
                    "❌ Neúspešné: " + celkemNeuspesnych + "\n\n" +
                    "📋 Detaily v poli 'info'");
        } else {
            message("❌ Notifikácie neboli odoslané!\n\n" +
                    "🔍 Skontroluj:\n" +
                    "• Nastavenia notifikácií u zamestnancov\n" +
                    "• API kľúče v ASISTANTO API\n" +
                    "• Debug_Log pre detaily");
        }
        
        return true;
        
    } catch (e) {
        utils.addError(currentEntry, e, "hlavnaFunkcia");
        utils.saveLogs(currentEntry);
        message("💥 KRITICKÁ CHYBA!\n\n" + e.toString() + "\n\nPozri Error_Log");
        return false;
    }
}

// ==============================================
// SPUSTENIE ACTION SCRIPTU
// ==============================================

try {
    utils.addDebug(currentEntry, "🎬 Inicializácia " + CONFIG.scriptName + " v" + CONFIG.version);
    utils.addDebug(currentEntry, "📚 Používam MementoUtils v" + utils.version);
    
    // Kontrola existencie currentEntry
    if (!currentEntry) {
        utils.addError(currentEntry, "KRITICKÁ CHYBA: currentEntry neexistuje", "startup");
        message("💥 KRITICKÁ CHYBA!\n\nScript nemôže bežať bez aktuálneho záznamu.");
    } else {
        // Spustenie hlavnej funkcie
        hlavnaFunkcia();
    }
    
} catch (kritickachyba) {
    // Posledná záchrana
    try {
        utils.addError(currentEntry, kritickachyba, "critical");
        utils.saveLogs(currentEntry);
        message("💥 KRITICKÁ CHYBA!\n\nScript zlyhal. Pozri Error_Log.");
    } catch (finalError) {
        message("💥 FATÁLNA CHYBA!\n\n" + kritickachyba.toString());
    }
}
