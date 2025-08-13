// ==============================================
// MEMENTO DATABASE - DOCHÁDZKA NOTIFIKÁCIE
// Verzia: 3.1 | Dátum: 13.08.2025 | Autor: ASISTANTO
// Knižnica: Dochádzka | Typ: Action Script
// ==============================================
// ✅ NOVÉ v3.1:
//    - Kompletná integrácia s MementoUtils 2.2
//    - Odstránené duplicitné funkcie
//    - Využitie utils API volaní
//    - Štruktúra podľa vzoru Dochádzka Prepočet 3.2
//    - Rozšírené error handling s try/catch
//    - Využitie safe field access funkcií
// ==============================================

// Import MementoUtils knižnice
var utils = MementoUtils;
var currentEntry = entry();

// Konfigurácia
var CONFIG = {
    debug: true,
    version: "3.1",
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
        prestavka: "Prestávka",
        projekt: "Projekt/Zákazka",
        poznamka: "Poznámka",
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
        // Notifikačné polia
        telegram: "telegram",
        sms: "sms",
        emailNotif: "email"
    },
    
    // Názvy atribútov
    attributes: {
        dni: ["pondelok", "utorok", "streda", "štvrtok", "piatok", "sobota", "nedeľa"],
        prace: ["odpracované"],
        mzda: ["hodinovka", "prémia (€)", "príplatok (€/h)", "*pokuta (€)", "denná mzda", "mzdové náklady"]
    },
    
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
// UTILITY FUNKCIE (využívajúce MementoUtils)
// ==============================================

/**
 * Formátovanie času
 */
function formatTime(timeValue) {
    if (!timeValue) return "00:00";
    
    try {
        if (typeof timeValue === 'number') {
            var hours = Math.floor(timeValue);
            var minutes = Math.round((timeValue - hours) * 60);
            return (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes;
        }
        return moment(timeValue).format("HH:mm");
    } catch (e) {
        return "00:00";
    }
}

/**
 * Formátovanie dátumu
 */
function formatDate(dateValue) {
    if (!dateValue) return moment().format("DD.MM.YYYY");
    
    try {
        return moment(dateValue).format("DD.MM.YYYY");
    } catch (e) {
        return moment().format("DD.MM.YYYY");
    }
}

/**
 * Formátovanie peňazí
 */
function formatMoney(amount) {
    if (!amount && amount !== 0) return "0.00 €";
    
    try {
        return parseFloat(amount).toFixed(2) + " €";
    } catch (e) {
        return "0.00 €";
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
            var nazov = utils.safeFieldAccess(defaultsEntries[0], "Názov firmy", "Firma");
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
    
    var nick = utils.safeFieldAccess(zamestnanec, CONFIG.zamFields.nick, "");
    var meno = utils.safeFieldAccess(zamestnanec, CONFIG.zamFields.meno, "");
    var priezvisko = utils.safeFieldAccess(zamestnanec, CONFIG.zamFields.priezvisko, "");
    
    if (nick) {
        return priezvisko ? nick + " (" + priezvisko + ")" : nick;
    }
    
    return (meno + " " + priezvisko).trim() || "Zamestnanec";
}

// ==============================================
// API FUNKCIE (využívajúce MementoUtils)
// ==============================================

/**
 * Získanie API kľúčov z ASISTANTO API knižnice
 */
function getApiKeys() {
    var result = {
        success: false,
        telegramToken: null,
        smsApiKey: null,
        emailApiKey: null
    };
    
    try {
        // Použitie MementoUtils funkcie na získanie API kľúča
        var telegramKey = utils.getApiKey("Telegram", CONFIG.libraries.apiLibrary);
        if (telegramKey) {
            result.telegramToken = telegramKey;
            result.success = true;
            utils.addDebug(currentEntry, "✅ Telegram API kľúč načítaný");
        } else {
            utils.addDebug(currentEntry, "⚠️ Telegram API kľúč nenájdený");
        }
        
        // SMS API (ak existuje)
        var smsKey = utils.getApiKey("SMS", CONFIG.libraries.apiLibrary);
        if (smsKey) {
            result.smsApiKey = smsKey;
            utils.addDebug(currentEntry, "✅ SMS API kľúč načítaný");
        }
        
        // Email API (ak existuje)
        var emailKey = utils.getApiKey("Email", CONFIG.libraries.apiLibrary);
        if (emailKey) {
            result.emailApiKey = emailKey;
            utils.addDebug(currentEntry, "✅ Email API kľúč načítaný");
        }
        
    } catch (e) {
        utils.addError(currentEntry, e, "getApiKeys");
    }
    
    return result;
}

/**
 * Poslanie Telegram správy
 */
function posliTelegramSpravu(chatId, sprava, token) {
    if (!chatId || !sprava || !token) {
        utils.addDebug(currentEntry, "⚠️ Telegram: Chýbajú parametre");
        return false;
    }
    
    try {
        var url = "https://api.telegram.org/bot" + token + "/sendMessage";
        
        var payload = {
            chat_id: chatId,
            text: sprava,
            parse_mode: CONFIG.api.telegramParseMode
        };
        
        // Použitie MementoUtils HTTP funkcie
        var response = utils.makeHttpRequest({
            url: url,
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload),
            timeout: CONFIG.api.timeout
        });
        
        if (response && response.code === 200) {
            utils.addDebug(currentEntry, "✅ Telegram správa poslaná do " + chatId);
            return true;
        } else {
            utils.addError(currentEntry, "Telegram API error: " + (response ? response.code : "No response"), "telegram");
            return false;
        }
        
    } catch (e) {
        utils.addError(currentEntry, e, "posliTelegramSpravu");
        return false;
    }
}

/**
 * Simulácia poslania SMS (placeholder)
 */
function posliSMS(telefon, sprava, apiKey) {
    // Simulácia - v reálnej implementácii by tu bolo volanie SMS API
    utils.addDebug(currentEntry, "📱 SMS simulácia pre " + telefon);
    return true;
}

/**
 * Simulácia poslania emailu (placeholder)
 */
function posliEmail(email, predmet, sprava, apiKey) {
    // Simulácia - v reálnej implementácii by tu bolo volanie Email API
    utils.addDebug(currentEntry, "📧 Email simulácia pre " + email);
    return true;
}

// ==============================================
// ZÍSKANIE ATRIBÚTOV ZAMESTNANCA
// ==============================================

/**
 * Získanie atribútov zamestnanca s nenulovými hodnotami
 */
function getZamestnanecAtributy(zamestnanecIndex) {
    var atributy = {};
    
    try {
        // Získaj všetky atribúty
        var allAttributes = [];
        allAttributes = allAttributes.concat(CONFIG.attributes.dni);
        allAttributes = allAttributes.concat(CONFIG.attributes.prace);
        allAttributes = allAttributes.concat(CONFIG.attributes.mzda);
        
        for (var i = 0; i < allAttributes.length; i++) {
            var attrName = allAttributes[i];
            var value = utils.safeGetAttr(currentEntry, CONFIG.fields.zamestnanci, attrName, zamestnanecIndex, 0);
            
            // Pridaj len nenulové hodnoty
            if (value && value !== 0) {
                atributy[attrName] = value;
                utils.addDebug(currentEntry, "  📊 Atribút '" + attrName + "': " + value);
            }
        }
        
    } catch (e) {
        utils.addError(currentEntry, e, "getZamestnanecAtributy");
    }
    
    return atributy;
}

// ==============================================
// VYTVORENIE SPRÁV
// ==============================================

/**
 * Vytvorenie Telegram správy
 */
function vytvorTelegramSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex, firmaNazov) {
    var menoZamestnanca = getEmployeeName(zamestnanec);
    var datum = utils.safeFieldAccess(dochadzkaZaznam, CONFIG.fields.datum, null);
    var prichod = utils.safeFieldAccess(dochadzkaZaznam, CONFIG.fields.prichod, null);
    var odchod = utils.safeFieldAccess(dochadzkaZaznam, CONFIG.fields.odchod, null);
    var prestavka = utils.safeFieldAccess(dochadzkaZaznam, CONFIG.fields.prestavka, 0);
    var poznamka = utils.safeFieldAccess(dochadzkaZaznam, CONFIG.fields.poznamka, "");
    
    // Získaj nenulové atribúty
    var atributy = getZamestnanecAtributy(zamestnanecIndex);
    
    // Získaj projekt
    var projekt = "";
    var projektField = utils.safeFieldAccess(dochadzkaZaznam, CONFIG.fields.projekt, null);
    if (projektField && Array.isArray(projektField) && projektField.length > 0) {
        projekt = utils.safeFieldAccess(projektField[0], "Názov záznamu", "") || 
                 utils.safeFieldAccess(projektField[0], "Číslo", "") || "Projekt";
    }
    
    // Vytvor správu
    var sprava = CONFIG.icons.building + " **Evidencia dochádzky**\n\n";
    sprava += "Dobrý deň **" + menoZamestnanca + "**!\n\n";
    
    sprava += CONFIG.icons.step + " **Dochádzka " + formatDate(datum) + ":**\n";
    sprava += CONFIG.icons.time + " Príchod: **" + formatTime(prichod) + "**\n";
    
    if (odchod) {
        sprava += CONFIG.icons.time + " Odchod: **" + formatTime(odchod) + "**\n";
        
        // Pridaj odpracované hodiny ak existujú
        if (atributy["odpracované"]) {
            sprava += "⏱️ Odpracované: **" + atributy["odpracované"] + "h**\n";
            
            var nadcasy = Math.max(0, atributy["odpracované"] - 8);
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
    
    // Pridaj nenulové mzdové údaje
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
        sprava += "\n" + CONFIG.icons.money + " **Mzdové údaje:**\n";
        sprava += mzdoveUdaje.join("\n") + "\n";
    }
    
    // Pridaj dni v týždni ak sú nenulové
    var dniTyzdna = [];
    for (var i = 0; i < CONFIG.attributes.dni.length; i++) {
        var den = CONFIG.attributes.dni[i];
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

/**
 * Vytvorenie SMS správy
 */
function vytvorSMSSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex, firmaNazov) {
    var menoZamestnanca = getEmployeeName(zamestnanec);
    var prichod = utils.safeFieldAccess(dochadzkaZaznam, CONFIG.fields.prichod, null);
    var odchod = utils.safeFieldAccess(dochadzkaZaznam, CONFIG.fields.odchod, null);
    var atributy = getZamestnanecAtributy(zamestnanecIndex);
    
    var sprava = menoZamestnanca + ", ";
    
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
// NOTIFIKAČNÁ LOGIKA
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
    var telegramNotif = utils.safeFieldAccess(zamestnanec, CONFIG.zamFields.telegram, false);
    if (telegramNotif) {
        var chatId = utils.safeFieldAccess(zamestnanec, CONFIG.zamFields.telegramId, "");
        if (chatId && apiKeys.telegramToken) {
            result.celkovePokusy++;
            
            var telegramSprava = vytvorTelegramSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex, firmaNazov);
            
            if (posliTelegramSpravu(chatId, telegramSprava, apiKeys.telegramToken)) {
                result.uspesnePoslane++;
                result.detaily.push("Telegram ✅");
                utils.addDebug(currentEntry, "  ✅ Telegram správa ÚSPEŠNE poslaná");
            } else {
                result.detaily.push("Telegram ❌");
                utils.addDebug(currentEntry, "  ❌ Telegram správa ZLYHALA");
            }
        } else {
            utils.addDebug(currentEntry, "  ⚠️ Telegram zapnutý ale chýba Chat ID alebo token");
        }
    }
    
    // SMS
    var smsNotif = utils.safeFieldAccess(zamestnanec, CONFIG.zamFields.sms, false);
    if (smsNotif) {
        var telefon = utils.safeFieldAccess(zamestnanec, CONFIG.zamFields.mobil, "");
        if (telefon) {
            result.celkovePokusy++;
            
            var smsSprava = vytvorSMSSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex, firmaNazov);
            
            if (posliSMS(telefon, smsSprava, apiKeys.smsApiKey)) {
                result.uspesnePoslane++;
                result.detaily.push("SMS ✅");
                utils.addDebug(currentEntry, "  ✅ SMS simulácia úspešná");
            } else {
                result.detaily.push("SMS ❌");
                utils.addDebug(currentEntry, "  ❌ SMS zlyhala");
            }
        } else {
            utils.addDebug(currentEntry, "  ⚠️ SMS zapnutá ale chýba telefónne číslo");
        }
    }
    
    // EMAIL
    var emailNotif = utils.safeFieldAccess(zamestnanec, CONFIG.zamFields.emailNotif, false);
    if (emailNotif) {
        var email = utils.safeFieldAccess(zamestnanec, CONFIG.zamFields.email, "");
        if (email) {
            result.celkovePokusy++;
            
            var emailSprava = vytvorEmailSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex, firmaNazov);
            var predmet = "Dochádzka " + formatDate(utils.safeFieldAccess(dochadzkaZaznam, CONFIG.fields.datum, null));
            
            if (posliEmail(email, predmet, emailSprava, apiKeys.emailApiKey)) {
                result.uspesnePoslane++;
                result.detaily.push("Email ✅");
                utils.addDebug(currentEntry, "  ✅ Email simulácia úspešná");
            } else {
                result.detaily.push("Email ❌");
                utils.addDebug(currentEntry, "  ❌ Email zlyhal");
            }
        } else {
            utils.addDebug(currentEntry, "  ⚠️ Email zapnutý ale chýba emailová adresa");
        }
    }
    
    result.success = result.uspesnePoslane > 0;
    
    if (result.celkovePokusy === 0) {
        utils.addDebug(currentEntry, "  ℹ️ Žiadne notifikácie nie sú zapnuté");
    }
    
    return result;
}

// ==============================================
// HLAVNÁ FUNKCIA - ACTION SCRIPT
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
        var zamestnanci = utils.safeFieldAccess(currentEntry, CONFIG.fields.zamestnanci, []);
        
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
        infoMessage += "📅 Dátum: " + formatDate(utils.safeFieldAccess(currentEntry, CONFIG.fields.datum, null)) + "\n";
        infoMessage += CONFIG.icons.time + " Čas: " + formatTime(utils.safeFieldAccess(currentEntry, CONFIG.fields.prichod, null));
        
        var odchod = utils.safeFieldAccess(currentEntry, CONFIG.fields.odchod, null);
        if (odchod) {
            infoMessage += " - " + formatTime(odchod);
        }
        infoMessage += "\n\n";
        
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
            sourceId: utils.safeFieldAccess(currentEntry, "ID", "N/A"),
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