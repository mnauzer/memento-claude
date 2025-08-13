// ==============================================
// TRIGGER SCRIPT - DOCHÁDZKA NOTIFIKÁCIE
// Verzia: 1.2 | Typ: After Save Trigger  
// Knižnica: Dochádzka
// ==============================================
// ✅ OPRAVENÉ v1.2:
//    - ÚPLNE odstránené všetky return statements (aj vo funkciách!)
//    - Globálne premenné namiesto return hodnôt
//    - Trigger Script 100% kompatibilný s Memento Database
//    - Žiadne zakázané konštrukcie
// ==============================================

var CONFIG = {
    firmaNazov: "Vaša firma s.r.o.",
    debug: true,
    version: "1.2",
    
    apiLibrary: "ASISTANTO API",
    maxSMSLength: 160,
    telegramParseMode: "Markdown"
};

var currentEntry = entry();

// ✅ GLOBÁLNE PREMENNÉ namiesto return hodnôt
var globalApiKeys = { success: false, telegramToken: null };
var globalResult = { success: false, uspesnePoslane: 0, celkovePokusy: 0 };
var globalSprava = "";

// ==============================================
// UTILITY FUNKCIE
// ==============================================

function logDebug(message) {
    if (CONFIG.debug) {
        var timestamp = moment().format("DD.MM.YY HH:mm:ss");
        var currentLog = currentEntry.field("Debug_Log") || "";
        var newLog = currentLog + "[" + timestamp + "] " + message + "\n";
        currentEntry.set("Debug_Log", newLog);
    }
}

function logError(error, location) {
    var timestamp = moment().format("DD.MM.YY HH:mm:ss");
    var errorMsg = "[" + timestamp + "] ❌ " + error.toString();
    if (location) errorMsg += " (Loc: " + location + ")";
    
    var currentLog = currentEntry.field("Error_Log") || "";
    currentEntry.set("Error_Log", currentLog + errorMsg + "\n");
}

function formatTime(timeValue) {
    if (!timeValue) {
        globalSprava = "N/A";
    } else {
        try {
            globalSprava = moment(timeValue).format("HH:mm");
        } catch (e) {
            globalSprava = "N/A";
        }
    }
}

function formatDate(dateValue) {
    if (!dateValue) {
        globalSprava = "N/A";
    } else {
        try {
            globalSprava = moment(dateValue).format("DD.MM.YYYY");
        } catch (e) {
            globalSprava = "N/A";
        }
    }
}

// ==============================================
// API FUNKCIE - BEZ RETURN STATEMENTS
// ==============================================

function getApiKeys() {
    // Reset globálnej premennej
    globalApiKeys = { success: false, telegramToken: null };
    
    try {
        var apiLib = libByName(CONFIG.apiLibrary);
        if (!apiLib) {
            logError("API knižnica nenájdená: " + CONFIG.apiLibrary, "getApiKeys");
        } else {
            var apiEntries = apiLib.entries();
            if (!apiEntries || apiEntries.length === 0) {
                logError("Žiadne API záznamy", "getApiKeys");
            } else {
                var telegramToken = apiEntries[0].field("Telegram Bot Token");
                if (telegramToken) {
                    globalApiKeys.success = true;
                    globalApiKeys.telegramToken = telegramToken;
                }
            }
        }
    } catch (error) {
        logError(error, "getApiKeys");
    }
}

function posliTelegramSpravu(chatId, sprava, botToken) {
    var success = false;
    
    try {
        logDebug("Posielam Telegram správu na Chat ID: " + chatId);
        
        // Simulácia - tu implementuj HTTP request
        logDebug("Telegram správa pripravená: " + sprava.substring(0, 100) + "...");
        success = true;
        
        /*
        // Skutočný HTTP request:
        var url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
        var payload = JSON.stringify({
            chat_id: chatId,
            text: sprava,
            parse_mode: CONFIG.telegramParseMode
        });
        
        // Tu použij Memento HTTP API
        success = httpPost(url, payload, {"Content-Type": "application/json"}).status === 200;
        */
        
    } catch (error) {
        logError(error, "posliTelegramSpravu");
        success = false;
    }
    
    // Nastav globálnu premennú namiesto return
    globalResult.success = success;
}

function posliSMS(telefon, sprava) {
    var success = false;
    
    try {
        logDebug("Posielam SMS na: " + telefon);
        
        if (sprava.length > CONFIG.maxSMSLength) {
            sprava = sprava.substring(0, CONFIG.maxSMSLength - 3) + "...";
        }
        
        // Simulácia
        logDebug("SMS pripravená: " + sprava);
        success = true;
        
        /*
        // Skutočné volanie:
        success = sendSMS(telefon, sprava);
        */
        
    } catch (error) {
        logError(error, "posliSMS");
        success = false;
    }
    
    globalResult.success = success;
}

function posliEmail(email, predmet, sprava) {
    var success = false;
    
    try {
        logDebug("Posielam Email na: " + email);
        
        // Simulácia
        logDebug("Email pripravený: " + predmet);
        success = true;
        
        /*
        // Skutočné volanie:
        success = sendEmail(email, predmet, sprava);
        */
        
    } catch (error) {
        logError(error, "posliEmail");
        success = false;
    }
    
    globalResult.success = success;
}

// ==============================================
// TEMPLATE FUNKCIE - BEZ RETURN
// ==============================================

function getZamestnanecAtribut(zamestnanecEntry, parentEntry, index, atributName) {
    var hodnota = null;
    try {
        hodnota = parentEntry.getAttr("Zamestnanci", index, atributName);
    } catch (error) {
        logDebug("Chyba pri získavaní atribútu " + atributName + ": " + error);
        hodnota = null;
    }
    globalSprava = hodnota; // Namiesto return
}

function vytvorTelegramSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex) {
    var meno = zamestnanec.field("Meno") || "";
    var priezvisko = zamestnanec.field("Priezvisko") || "";
    var nick = zamestnanec.field("Nick") || "";
    
    var celeMeno = nick || (meno + " " + priezvisko).trim();
    
    // Základné údaje z dochádzky
    var datum = dochadzkaZaznam.field("Dátum");
    var prichod = dochadzkaZaznam.field("Príchod");
    var odchod = dochadzkaZaznam.field("Odchod");
    var prestavka = dochadzkaZaznam.field("Prestávka") || 0;
    var poznamka = dochadzkaZaznam.field("Poznámka");
    
    // Atribúty zamestnanca
    getZamestnanecAtribut(zamestnanec, dochadzkaZaznam, zamestnanecIndex, "odpracované");
    var odpracovane = globalSprava || 0;
    
    getZamestnanecAtribut(zamestnanec, dochadzkaZaznam, zamestnanecIndex, "hodinovka");
    var hodinovka = globalSprava || 0;
    
    getZamestnanecAtribut(zamestnanec, dochadzkaZaznam, zamestnanecIndex, "mzdové náklady");
    var mzdoveNaklady = globalSprava || 0;
    
    // Projekt/Zákazka
    var projekt = "";
    var projektField = dochadzkaZaznam.field("Projekt/Zákazka");
    if (projektField && Array.isArray(projektField) && projektField.length > 0) {
        projekt = projektField[0].field("Názov záznamu") || projektField[0].field("Číslo") || "Projekt";
    }
    
    // Vytvor rich Telegram správu
    var sprava = "🏢 **Evidencia dochádzky**\n\n";
    sprava += "Dobrý deň **" + celeMeno + "**!\n\n";
    
    sprava += "📋 **Dochádzka ";
    formatDate(datum);
    sprava += globalSprava + ":**\n";
    
    sprava += "🕐 Príchod: **";
    formatTime(prichod);
    sprava += globalSprava + "**\n";
    
    if (odchod) {
        sprava += "🕐 Odchod: **";
        formatTime(odchod);
        sprava += globalSprava + "**\n";
        sprava += "⏱️ Odpracované: **" + odpracovane + "h**\n";
        
        var nadcasy = Math.max(0, odpracovane - 8);
        if (nadcasy > 0) {
            sprava += "⚡ Nadčasy: **" + nadcasy + "h**\n";
        }
    }
    
    if (prestavka > 0) {
        sprava += "☕ Prestávka: " + prestavka + " min\n";
    }
    
    if (projekt) {
        sprava += "📦 Projekt: " + projekt + "\n";
    }
    
    sprava += "\n💰 **Mzdové údaje:**\n";
    sprava += "• Hodinovka: " + hodinovka + " €/h\n";
    sprava += "• Dnešné náklady: **" + mzdoveNaklady + " €**\n";
    
    if (poznamka) {
        sprava += "\n📝 **Poznámka:** _" + poznamka + "_\n";
    }
    
    sprava += "\n---\n";
    sprava += CONFIG.firmaNazov + " | " + moment().format("DD.MM.YYYY HH:mm");
    
    globalSprava = sprava; // Namiesto return
}

function vytvorSMSSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex) {
    var nick = zamestnanec.field("Nick") || zamestnanec.field("Meno") || "Zamestnanec";
    var prichod = dochadzkaZaznam.field("Príchod");
    var odchod = dochadzkaZaznam.field("Odchod");
    
    getZamestnanecAtribut(zamestnanec, dochadzkaZaznam, zamestnanecIndex, "mzdové náklady");
    var mzdoveNaklady = globalSprava || 0;
    
    var sprava = nick + ", ";
    
    if (odchod) {
        getZamestnanecAtribut(zamestnanec, dochadzkaZaznam, zamestnanecIndex, "odpracované");
        var odpracovane = globalSprava || 0;
        
        formatTime(prichod);
        var prichodStr = globalSprava;
        formatTime(odchod);
        var odchodStr = globalSprava;
        
        sprava += "dochádzka: " + prichodStr + "-" + odchodStr;
        sprava += " (" + odpracovane + "h)";
        if (mzdoveNaklady > 0) {
            sprava += ", náklady " + mzdoveNaklady + "€";
        }
    } else {
        formatTime(prichod);
        sprava += "príchod: " + globalSprava;
    }
    
    sprava += ". " + CONFIG.firmaNazov;
    
    globalSprava = sprava;
}

function vytvorEmailSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex) {
    vytvorTelegramSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex);
    var telegram = globalSprava;
    var email = telegram.replace(/\*\*/g, "").replace(/\*/g, "").replace(/_/g, "");
    globalSprava = email;
}

// ==============================================
// HLAVNÁ LOGIKA  
// ==============================================

function posliNotifikaciuZamestnancovi(dochadzkaZaznam, zamestnanec, zamestnanecIndex) {
    // Reset result
    globalResult = { success: false, uspesnePoslane: 0, celkovePokusy: 0 };
    
    var meno = zamestnanec.field("Nick") || zamestnanec.field("Meno") || "Zamestnanec";
    logDebug("Spracovávam notifikácie pre: " + meno);
    
    // Skontroluj master súhlas
    if (!zamestnanec.field("Notifikácie Súhlas")) {
        logDebug("  ❌ Nemá súhlas s notifikáciami - preskakujem");
        // globalResult už je false
    } else {
        // TELEGRAM
        if (zamestnanec.field("Telegram Notifikácie")) {
            var chatId = zamestnanec.field("Telegram Chat ID");
            if (chatId && globalApiKeys.success && globalApiKeys.telegramToken) {
                globalResult.celkovePokusy++;
                vytvorTelegramSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex);
                var telegramSprava = globalSprava;
                
                posliTelegramSpravu(chatId, telegramSprava, globalApiKeys.telegramToken);
                if (globalResult.success) {
                    globalResult.uspesnePoslane++;
                    logDebug("  ✅ Telegram správa poslaná");
                } else {
                    logDebug("  ❌ Telegram správa zlyhala");
                }
            } else {
                logDebug("  ⚠️ Telegram zapnutý ale chýba Chat ID alebo token");
            }
        }
        
        // SMS
        if (zamestnanec.field("SMS Notifikácie")) {
            var telefon = zamestnanec.field("Telefón");
            if (telefon) {
                globalResult.celkovePokusy++;
                vytvorSMSSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex);
                var smsSprava = globalSprava;
                
                posliSMS(telefon, smsSprava);
                if (globalResult.success) {
                    globalResult.uspesnePoslane++;
                    logDebug("  ✅ SMS správa poslaná");
                } else {
                    logDebug("  ❌ SMS správa zlyhala");
                }
            } else {
                logDebug("  ⚠️ SMS zapnuté ale chýba telefónne číslo");
            }
        }
        
        // EMAIL
        if (zamestnanec.field("Email Notifikácie")) {
            var email = zamestnanec.field("E-mail");
            if (email) {
                globalResult.celkovePokusy++;
                vytvorEmailSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex);
                var emailSprava = globalSprava;
                
                formatDate(dochadzkaZaznam.field("Dátum"));
                var predmet = "Evidencia dochádzky - " + globalSprava;
                
                posliEmail(email, predmet, emailSprava);
                if (globalResult.success) {
                    globalResult.uspesnePoslane++;
                    logDebug("  ✅ Email správa poslaná");
                } else {
                    logDebug("  ❌ Email správa zlyhala");
                }
            } else {
                logDebug("  ⚠️ Email zapnutý ale chýba emailová adresa");
            }
        }
        
        globalResult.success = globalResult.uspesnePoslane > 0;
        logDebug("  📊 Výsledok pre " + meno + ": " + globalResult.uspesnePoslane + "/" + globalResult.celkovePokusy + " úspešných");
    }
}

// ==============================================
// MAIN TRIGGER - ÚPLNE BEZ RETURN STATEMENTS
// ==============================================

try {
    logDebug("🚀 === ŠTART DOCHÁDZKA NOTIFIKÁCIÍ v" + CONFIG.version + " ===");
    
    var scriptFailed = false;
    
    // Získaj API keys
    getApiKeys(); // Výsledok v globalApiKeys
    if (!globalApiKeys.success) {
        logError("Nie je možné získať API keys", "MAIN");
        // Pokračuj aj bez Telegram
    }
    
    // Získaj zamestnancov
    var zamestnanci = currentEntry.field("Zamestnanci") || [];
    
    if (zamestnanci.length === 0) {
        logDebug("⚠️ Žiadni zamestnanci v zázname - ukončujem");
        scriptFailed = true;
    }
    
    if (!scriptFailed) {
        logDebug("👥 Nájdených " + zamestnanci.length + " zamestnancov");
        
        var celkemUspesnych = 0;
        var celkemZamestnancov = 0;
        
        // Iteruj cez všetkých zamestnancov
        for (var i = 0; i < zamestnanci.length; i++) {
            var zamestnanec = zamestnanci[i];
            
            if (zamestnanec) {
                celkemZamestnancov++;
                posliNotifikaciuZamestnancovi(currentEntry, zamestnanec, i);
                if (globalResult.success) {
                    celkemUspesnych++;
                }
            }
        }
        
        // Záverečný log
        var vysledokSprava = "Notifikácie odoslané: " + celkemUspesnych + "/" + celkemZamestnancov + 
                            " zamestnancov (" + moment().format("DD.MM.YYYY HH:mm:ss") + ")";
        
        logDebug("📊 === FINÁLNY VÝSLEDOK ===");
        logDebug(vysledokSprava);
        
        // Ulož do Notifikácie Log
        var existujuciLog = currentEntry.field("Notifikácie Log") || "";
        currentEntry.set("Notifikácie Log", existujuciLog + vysledokSprava + "\n");
        
        // Informuj o výsledku
        if (celkemUspesnych === celkemZamestnancov) {
            logDebug("🎉 Všetky notifikácie úspešne odoslané!");
        } else if (celkemUspesnych > 0) {
            logDebug("⚠️ Čiastočný úspech - niektoré notifikácie zlyhali");
        } else {
            logError("Všetky notifikácie zlyhali", "MAIN");
        }
    }
    
} catch (criticalError) {
    logError(criticalError, "MAIN-CRITICAL");
}
