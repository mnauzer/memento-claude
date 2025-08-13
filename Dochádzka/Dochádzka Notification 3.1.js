// ==============================================
// DOCHÁDZKA NOTIFIKÁCIE v3.1 - OPRAVENÝ pre MementoUtils 2.2
// ==============================================

var utils = MementoUtils;
var currentEntry = entry();

// Konfigurácia - bez zmien
var CONFIG = {
    debug: true,
    version: "3.1 OPRAVENÝ",
    scriptName: "Dochádzka Notifikácie",
    
    fields: {
        zamestnanci: "Zamestnanci",
        datum: "Dátum",
        prichod: "Príchod", 
        odchod: "Odchod",
        poznamka: "Poznámka",
        pracovnaDoba: "Pracovná doba",
        info: "info"
    },
    
    wantedAttributes: [
        "hodinovka",
        "+príplatok (€/h)",
        "+prémia (€)",
        "-pokuta (€)",
        "denná mzda",
        "poznámka"
    ],
    
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
// OPRAVENÉ FUNKCIE
// ==============================================

/**
 * Získanie atribútov zamestnanca - OPRAVENÉ
 */
function getZamestnanecAtributy(zamestnanecIndex) {
    var atributy = {};
    
    try {
        utils.addDebug(currentEntry, "🔍 Získavam atribúty pre zamestnanca #" + zamestnanecIndex);
        
        for (var i = 0; i < CONFIG.wantedAttributes.length; i++) {
            var attrName = CONFIG.wantedAttributes[i];
            
            // ✅ OPRAVA: Správny názov funkcie
            var value = utils.safeGetAttribute(
                currentEntry, 
                CONFIG.fields.zamestnanci, 
                zamestnanecIndex, 
                attrName, 
                null
            );
            
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

/**
 * Získanie API kľúčov - ZJEDNODUŠENÉ s MementoUtils
 */
function getApiKeys() {
    try {
        utils.addDebug(currentEntry, "🔑 Načítavam API kľúče...");
        
        var telegramToken = utils.getApiKey("Telegram", "ASISTANTO API", currentEntry);
        
        if (telegramToken) {
            utils.addDebug(currentEntry, "✅ Telegram API kľúč načítaný");
            return {
                success: true,
                telegramToken: telegramToken,
                provider: "telegram"
            };
        } else {
            utils.addError(currentEntry, "Telegram API kľúč nenájdený", "getApiKeys");
            return {success: false, telegramToken: null};
        }
        
    } catch (e) {
        utils.addError(currentEntry, e, "getApiKeys");
        return {success: false, telegramToken: null};
    }
}

/**
 * Poslanie Telegram správy - ZJEDNODUŠENÉ s MementoUtils
 */
function posliTelegramSpravu(chatId, sprava, token) {
    if (!chatId || !sprava || !token) {
        utils.addDebug(currentEntry, "⚠️ Telegram: Chýbajú parametre");
        return false;
    }
    
    // Použij MementoUtils funkciu ktorá má všetko implementované
    return utils.sendTelegramMessage(chatId, sprava, token, "Markdown", currentEntry);
}

// ==============================================
// OSTATNÉ FUNKCIE - BEZ ZMIEN
// ==============================================

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

function formatDate(dateValue) {
    if (!dateValue) return null;
    try {
        return moment(dateValue).format("DD.MM.YYYY");
    } catch (e) {
        return null;
    }
}

function formatMoney(amount) {
    if (!amount && amount !== 0) return null;
    try {
        return parseFloat(amount).toFixed(2) + " €";
    } catch (e) {
        return null;
    }
}

function getNazovFirmy() {
    try {
        var defaultsLib = libByName("ASISTANTO Defaults");
        if (!defaultsLib) return "Firma";
        
        var defaultsEntries = defaultsLib.entries();
        if (defaultsEntries && defaultsEntries.length > 0) {
            var nazov = utils.safeGet(defaultsEntries[0], "Názov firmy", "Firma");
            return nazov;
        }
    } catch (e) {
        utils.addError(currentEntry, e, "getNazovFirmy");
    }
    return "Firma";
}

function getEmployeeName(zamestnanec) {
    if (!zamestnanec) return "Zamestnanec";
    
    var nick = utils.safeGet(zamestnanec, "Nick", "");
    var meno = utils.safeGet(zamestnanec, "Meno", "");
    var priezvisko = utils.safeGet(zamestnanec, "Priezvisko", "");
    
    if (nick) {
        return priezvisko ? nick + " (" + priezvisko + ")" : nick;
    }
    
    return (meno + " " + priezvisko).trim() || "Zamestnanec";
}

// Funkcie pre vytvorenie správ - bez zmien, len používajú opravené getZamestnanecAtributy()
function vytvorTelegramSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex, firmaNazov) {
    var menoZamestnanca = getEmployeeName(zamestnanec);
    
    var datum = utils.safeGet(dochadzkaZaznam, CONFIG.fields.datum, null);
    var prichod = utils.safeGet(dochadzkaZaznam, CONFIG.fields.prichod, null);
    var odchod = utils.safeGet(dochadzkaZaznam, CONFIG.fields.odchod, null);
    var poznamka = utils.safeGet(dochadzkaZaznam, CONFIG.fields.poznamka, "");
    var pracovnaDoba = utils.safeGet(dochadzkaZaznam, CONFIG.fields.pracovnaDoba, null);
    
    // ✅ Táto funkcia je teraz opravená
    var atributy = getZamestnanecAtributy(zamestnanecIndex);
    
    var sprava = CONFIG.icons.building + " **Evidencia dochádzky**\n\n";
    sprava += "Dobrý deň **" + menoZamestnanca + "**!\n\n";
    
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
    
    // Mzdové údaje
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
    
    if (atributy["poznámka"]) {
        sprava += "\n💭 **Poznámka zamestnanca:** _" + atributy["poznámka"] + "_\n";
    }
    
    sprava += "\n---\n";
    sprava += firmaNazov + " | " + moment().format("DD.MM.YYYY HH:mm");
    
    return sprava;
}

// Hlavná funkcia - bez zmien, používa opravené funkcie
function hlavnaFunkcia() {
    utils.clearLogs(currentEntry, false);
    
    utils.addDebug(currentEntry, "==================================================");
    utils.addDebug(currentEntry, CONFIG.icons.start + " ŠTART " + CONFIG.scriptName + " v" + CONFIG.version);
    utils.addDebug(currentEntry, "📚 MementoUtils: v" + utils.version);
    utils.addDebug(currentEntry, "==================================================");
    
    try {
        var firmaNazov = getNazovFirmy();
        
        utils.addDebug(currentEntry, "\n" + CONFIG.icons.step + " KROK 1: Získavam API kľúče");
        var apiKeys = getApiKeys();
        
        utils.addDebug(currentEntry, "\n" + CONFIG.icons.step + " KROK 2: Získavam zamestnancov");
        var zamestnanci = utils.safeGet(currentEntry, CONFIG.fields.zamestnanci, []);
        
        if (!zamestnanci || zamestnanci.length === 0) {
            utils.addError(currentEntry, "Žiadni zamestnanci v zázname", "main");
            message("❌ Žiadni zamestnanci v zázname dochádzky!");
            return false;
        }
        
        utils.addDebug(currentEntry, CONFIG.icons.success + " Počet zamestnancov: " + zamestnanci.length);
        
        // Spracovanie notifikácií - bez zmien
        utils.addDebug(currentEntry, "\n" + CONFIG.icons.step + " KROK 3: Posielam notifikácie");
        
        for (var i = 0; i < zamestnanci.length; i++) {
            var zamestnanec = zamestnanci[i];
            var menoZam = getEmployeeName(zamestnanec);
            
            utils.addDebug(currentEntry, "\n👤 Spracovávam: " + menoZam);
            
            // Test Telegram notifikácie
            var telegramNotif = utils.safeGet(zamestnanec, "telegram", false);
            if (telegramNotif && apiKeys.success) {
                var chatId = utils.safeGet(zamestnanec, "Telegram ID", "");
                if (chatId) {
                    var telegramSprava = vytvorTelegramSpravu(currentEntry, zamestnanec, i, firmaNazov);
                    if (posliTelegramSpravu(chatId, telegramSprava, apiKeys.telegramToken)) {
                        utils.addDebug(currentEntry, " ✅ Telegram správa odoslaná");
                    }
                }
            }
        }
        
        utils.addDebug(currentEntry, "\n==================================================");
        utils.addDebug(currentEntry, "🎉 NOTIFIKÁCIE DOKONČENÉ!");
        utils.addDebug(currentEntry, "==================================================");
        
        utils.saveLogs(currentEntry);
        message("✅ Notifikácie úspešne spracované!");
        
        return true;
        
    } catch (e) {
        utils.addError(currentEntry, e, "hlavnaFunkcia");
        utils.saveLogs(currentEntry);
        message("💥 CHYBA: " + e.toString());
        return false;
    }
}

// Spustenie
try {
    hlavnaFunkcia();
} catch (kritickachyba) {
    utils.addError(currentEntry, kritickachyba, "critical");
    utils.saveLogs(currentEntry);
    message("💥 KRITICKÁ CHYBA: " + kritickachyba.toString());
}
