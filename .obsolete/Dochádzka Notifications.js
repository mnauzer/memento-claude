// ==============================================
// ACTION SCRIPT - DOCHÁDZKA NOTIFIKÁCIE
// Verzia: 1.5 | Typ: Action Script  
// Knižnica: Dochádzka
// ==============================================
// ✅ OPRAVENÉ v1.5:
//    - Fix pre názvy polí s diakritikou a medzerami
//    - Bezpečný prístup k všetkým poliam
//    - Alternatívne názvy polí pre kompatibilitu
// ==============================================

var CONFIG = {
    firmaNazov: "Vaša firma s.r.o.",
    debug: true,
    version: "1.5",
    scriptType: "Action Script",
    
    apiLibrary: "ASISTANTO API",
    maxSMSLength: 160,
    telegramParseMode: "Markdown"
};

var currentEntry = entry();

// Globálne premenné
var globalApiKeys = { success: false, telegramToken: null, botName: null, provider: null };
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

function clearLogs() {
    try {
        currentEntry.set("Debug_Log", "");
        currentEntry.set("Error_Log", "");
        currentEntry.set("Notifikácie Log", "");
    } catch (e) {
        // Silent fail
    }
}

// ✅ NOVÁ FUNKCIA - bezpečný prístup k poliam
function safeFieldGet(entryObj, fieldName, defaultValue) {
    try {
        // Skús rôzne spôsoby prístupu
        var value = null;
        
        // Metóda 1: Priamy prístup
        try {
            value = entryObj.field(fieldName);
        } catch (e1) {
            // Metóda 2: Skús bez diakritiky
            try {
                var simpleName = fieldName
                    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
                    .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ý/g, 'y')
                    .replace(/ň/g, 'n').replace(/ť/g, 't').replace(/ď/g, 'd')
                    .replace(/ľ/g, 'l').replace(/š/g, 's').replace(/č/g, 'c')
                    .replace(/ž/g, 'z').replace(/ô/g, 'o').replace(/ä/g, 'a')
                    .replace(/Á/g, 'A').replace(/É/g, 'E').replace(/Í/g, 'I')
                    .replace(/Ó/g, 'O').replace(/Ú/g, 'U').replace(/Ý/g, 'Y')
                    .replace(/Ň/g, 'N').replace(/Ť/g, 'T').replace(/Ď/g, 'D')
                    .replace(/Ľ/g, 'L').replace(/Š/g, 'S').replace(/Č/g, 'C')
                    .replace(/Ž/g, 'Z').replace(/Ô/g, 'O').replace(/Ä/g, 'A');
                value = entryObj.field(simpleName);
            } catch (e2) {
                // Metóda 3: Skús anglický názov
                var englishNames = {
                    "Notifikácie Súhlas": "Notifications Consent",
                    "Telegram Notifikácie": "Telegram Notifications", 
                    "SMS Notifikácie": "SMS Notifications",
                    "Email Notifikácie": "Email Notifications",
                    "Telegram Chat ID": "Telegram Chat ID",
                    "Telefón": "Phone",
                    "E-mail": "Email"
                };
                
                if (englishNames[fieldName]) {
                    try {
                        value = entryObj.field(englishNames[fieldName]);
                    } catch (e3) {
                        value = defaultValue;
                    }
                } else {
                    value = defaultValue;
                }
            }
        }
        
        if (value === null || value === undefined) {
            value = defaultValue;
        }
        
        return value;
        
    } catch (error) {
        logDebug("⚠️ Chyba pri čítaní poľa '" + fieldName + "': " + error);
        return defaultValue;
    }
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
// API FUNKCIE - FILTROVANIE TELEGRAM PROVIDER
// ==============================================

function getApiKeys() {
    globalApiKeys = { success: false, telegramToken: null, botName: null, provider: null };
    
    try {
        logDebug("🔑 Načítavam API keys z " + CONFIG.apiLibrary + "...");
        
        var apiLib = libByName(CONFIG.apiLibrary);
        if (!apiLib) {
            logError("API knižnica nenájdená: " + CONFIG.apiLibrary, "getApiKeys");
        } else {
            var apiEntries = apiLib.entries();
            if (!apiEntries || apiEntries.length === 0) {
                logError("Žiadne API záznamy", "getApiKeys");
            } else {
                logDebug("📊 Celkovo API záznamov: " + apiEntries.length);
                
                var telegramEntry = null;
                var foundProviders = [];
                
                for (var i = 0; i < apiEntries.length; i++) {
                    var entry = apiEntries[i];
                    
                    // ✅ OPRAVENÉ - bezpečný prístup k poliam
                    var provider = safeFieldGet(entry, "provider", "");
                    var nazov = safeFieldGet(entry, "názov", "") || safeFieldGet(entry, "nazov", "");
                    
                    foundProviders.push(provider + " (" + nazov + ")");
                    
                    if (provider && provider.toLowerCase() === "telegram") {
                        telegramEntry = entry;
                        logDebug("✅ Nájdený Telegram provider: " + nazov);
                        break;
                    }
                }
                
                logDebug("📋 Dostupní provideri: " + foundProviders.join(", "));
                
                if (telegramEntry) {
                    var telegramToken = safeFieldGet(telegramEntry, "api", "");
                    var botName = safeFieldGet(telegramEntry, "názov", "") || safeFieldGet(telegramEntry, "nazov", "");
                    var provider = safeFieldGet(telegramEntry, "provider", "");
                    
                    logDebug("📊 Telegram API záznam detaily:");
                    logDebug("   • Názov bota: " + (botName || "N/A"));
                    logDebug("   • Provider: " + (provider || "N/A"));
                    logDebug("   • API token: " + (telegramToken ? "✅ Načítaný" : "❌ Chýba"));
                    
                    if (telegramToken) {
                        globalApiKeys.success = true;
                        globalApiKeys.telegramToken = telegramToken;
                        globalApiKeys.botName = botName;
                        globalApiKeys.provider = provider;
                        
                        logDebug("✅ Telegram API úspešne načítané");
                        logDebug("   Bot: " + botName + " (" + provider + ")");
                    } else {
                        logError("API token nenájdený v poli 'api' pre Telegram", "getApiKeys");
                    }
                } else {
                    logError("Nenájdený provider 'Telegram' v API záznamoch", "getApiKeys");
                    logError("Dostupní provideri: " + foundProviders.join(", "), "getApiKeys");
                }
            }
        }
    } catch (error) {
        logError(error, "getApiKeys");
    }
}

// ==============================================
// HANDLING PRE ZAMESTNANCI POLE  
// ==============================================

function getZamestnanciArray() {
    var zamestnanci = [];
    
    try {
        // ✅ OPRAVENÉ - bezpečný prístup
        var zamestnanciField = safeFieldGet(currentEntry, "Zamestnanci", null);
        
        logDebug("👥 Zamestnanci field analýza:");
        logDebug("   • Typ: " + typeof zamestnanciField);
        logDebug("   • Je null: " + (zamestnanciField === null));
        logDebug("   • Je undefined: " + (zamestnanciField === undefined));
        logDebug("   • Je array: " + Array.isArray(zamestnanciField));
        
        if (!zamestnanciField) {
            logDebug("   ❌ Pole je prázdne/null");
        } else if (Array.isArray(zamestnanciField)) {
            logDebug("   ✅ Pole je array s dĺžkou: " + zamestnanciField.length);
            zamestnanci = zamestnanciField;
        } else if (typeof zamestnanciField === "object") {
            logDebug("   🔄 Pole je objekt - konvertujem na array");
            
            if (zamestnanciField.length !== undefined) {
                logDebug("   • Má length property: " + zamestnanciField.length);
                for (var i = 0; i < zamestnanciField.length; i++) {
                    if (zamestnanciField[i]) {
                        zamestnanci.push(zamestnanciField[i]);
                    }
                }
                logDebug("   ✅ Konvertovaných: " + zamestnanci.length + " zamestnancov");
            } else {
                logDebug("   • Single objekt - jeden zamestnanec");
                zamestnanci = [zamestnanciField];
                logDebug("   ✅ Vytvorený array s 1 zamestnancom");
            }
        } else {
            logDebug("   ❌ Neočakávaný typ: " + typeof zamestnanciField);
        }
        
    } catch (error) {
        logError("Chyba pri spracovaní Zamestnanci poľa: " + error, "getZamestnanciArray");
    }
    
    return zamestnanci;
}

// ==============================================
// TELEGRAM/SMS/EMAIL FUNKCIE  
// ==============================================

function posliTelegramSpravu(chatId, sprava, botToken) {
    var success = false;
    
    try {
        logDebug("📱 Posielam Telegram správu...");
        logDebug("   • Bot: " + (globalApiKeys.botName || "Unknown"));
        logDebug("   • Provider: " + (globalApiKeys.provider || "Unknown"));
        logDebug("   • Chat ID: " + chatId);
        logDebug("   • Dĺžka správy: " + sprava.length + " znakov");
        
        var telegramUrl = "https://api.telegram.org/bot" + botToken + "/sendMessage";
        var payload = {
            chat_id: chatId,
            text: sprava,
            parse_mode: CONFIG.telegramParseMode
        };
        
        logDebug("🌐 URL: " + telegramUrl);
        logDebug("📦 Payload pripravený");
        
        // Simulácia - nahraď skutočným HTTP requestom
        success = Math.random() > 0.01; // 99% success rate
        
        if (success) {
            logDebug("✅ Telegram správa úspešne odoslaná (simulácia)");
        } else {
            logDebug("❌ Telegram správa zlyhala (simulácia)");
        }
        
    } catch (error) {
        logError(error, "posliTelegramSpravu");
        success = false;
    }
    
    globalResult.success = success;
}

function posliSMS(telefon, sprava) {
    var success = false;
    
    try {
        logDebug("📲 Posielam SMS na: " + telefon);
        
        if (sprava.length > CONFIG.maxSMSLength) {
            sprava = sprava.substring(0, CONFIG.maxSMSLength - 3) + "...";
            logDebug("✂️ SMS skrátená na " + CONFIG.maxSMSLength + " znakov");
        }
        
        logDebug("📝 SMS pripravená: " + sprava);
        success = Math.random() > 0.05; // 95% success rate
        
        if (success) {
            logDebug("✅ SMS úspešne odoslaná (simulácia)");
        } else {
            logDebug("❌ SMS zlyhala (simulácia)");
        }
        
    } catch (error) {
        logError(error, "posliSMS");
        success = false;
    }
    
    globalResult.success = success;
}

function posliEmail(email, predmet, sprava) {
    var success = false;
    
    try {
        logDebug("📧 Posielam Email na: " + email);
        logDebug("📋 Predmet: " + predmet);
        
        success = Math.random() > 0.02; // 98% success rate
        
        if (success) {
            logDebug("✅ Email úspešne odoslaný (simulácia)");
        } else {
            logDebug("❌ Email zlyhal (simulácia)");
        }
        
    } catch (error) {
        logError(error, "posliEmail");
        success = false;
    }
    
    globalResult.success = success;
}

// ==============================================
// TEMPLATE FUNKCIE
// ==============================================

function getZamestnanecAtribut(zamestnanecEntry, parentEntry, index, atributName) {
    var hodnota = null;
    try {
        hodnota = parentEntry.getAttr("Zamestnanci", index, atributName);
        if (hodnota === null || hodnota === undefined) {
            hodnota = 0;
        }
    } catch (error) {
        logDebug("⚠️ Chyba pri získavaní atribútu " + atributName + ": " + error);
        hodnota = 0;
    }
    globalSprava = hodnota;
}

function vytvorTelegramSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex) {
    // ✅ OPRAVENÉ - bezpečný prístup k poliam zamestnanca
    var meno = safeFieldGet(zamestnanec, "Meno", "");
    var priezvisko = safeFieldGet(zamestnanec, "Priezvisko", "");
    var nick = safeFieldGet(zamestnanec, "Nick", "");
    
    var celeMeno = nick || (meno + " " + priezvisko).trim() || "Zamestnanec";
    
    // Základné údaje z dochádzky
    var datum = safeFieldGet(dochadzkaZaznam, "Dátum", null);
    var prichod = safeFieldGet(dochadzkaZaznam, "Príchod", null);
    var odchod = safeFieldGet(dochadzkaZaznam, "Odchod", null);
    var prestavka = safeFieldGet(dochadzkaZaznam, "Prestávka", 0);
    var poznamka = safeFieldGet(dochadzkaZaznam, "Poznámka", "");
    
    // Atribúty zamestnanca
    getZamestnanecAtribut(zamestnanec, dochadzkaZaznam, zamestnanecIndex, "odpracované");
    var odpracovane = globalSprava || 0;
    
    getZamestnanecAtribut(zamestnanec, dochadzkaZaznam, zamestnanecIndex, "hodinovka");
    var hodinovka = globalSprava || 0;
    
    getZamestnanecAtribut(zamestnanec, dochadzkaZaznam, zamestnanecIndex, "mzdové náklady");
    var mzdoveNaklady = globalSprava || 0;
    
    // Projekt/Zákazka
    var projekt = "";
    var projektField = safeFieldGet(dochadzkaZaznam, "Projekt/Zákazka", null);
    if (projektField && Array.isArray(projektField) && projektField.length > 0) {
        projekt = safeFieldGet(projektField[0], "Názov záznamu", "") || 
                 safeFieldGet(projektField[0], "Číslo", "") || "Projekt";
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
    
    globalSprava = sprava;
}

function vytvorSMSSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex) {
    var nick = safeFieldGet(zamestnanec, "Nick", "") || 
               safeFieldGet(zamestnanec, "Meno", "") || "Zamestnanec";
    var prichod = safeFieldGet(dochadzkaZaznam, "Príchod", null);
    var odchod = safeFieldGet(dochadzkaZaznam, "Odchod", null);
    
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
// NOTIFIKAČNÁ LOGIKA - OPRAVENÉ
// ==============================================

function posliNotifikaciuZamestnancovi(dochadzkaZaznam, zamestnanec, zamestnanecIndex) {
    globalResult = { success: false, uspesnePoslane: 0, celkovePokusy: 0 };
    
    // ✅ OPRAVENÉ - bezpečný prístup k meno/nick
    var meno = safeFieldGet(zamestnanec, "Nick", "") || 
               safeFieldGet(zamestnanec, "Meno", "") || 
               "Zamestnanec #" + (zamestnanecIndex + 1);
    
    logDebug("👤 Spracovávam notifikácie pre: " + meno);
    
    // ✅ OPRAVENÉ - bezpečný prístup k súhlasu
    var notifikacieSuhlas = safeFieldGet(zamestnanec, "Notifikácie Súhlas", false);
    
    logDebug("   🔍 Kontrolujem súhlas s notifikáciami...");
    logDebug("   • Súhlas hodnota: " + notifikacieSuhlas);
    logDebug("   • Súhlas typ: " + typeof notifikacieSuhlas);
    
    if (!notifikacieSuhlas) {
        logDebug("  ❌ Nemá súhlas s notifikáciami - preskakujem");
    } else {
        logDebug("  ✅ Má súhlas s notifikáciami - pokračujem");
        
        // ✅ TELEGRAM - bezpečný prístup
        var telegramNotif = safeFieldGet(zamestnanec, "Telegram Notifikácie", false);
        if (telegramNotif) {
            var chatId = safeFieldGet(zamestnanec, "Telegram Chat ID", "");
            if (chatId && globalApiKeys.success && globalApiKeys.telegramToken) {
                globalResult.celkovePokusy++;
                logDebug("  📱 Telegram: Vytváram správu...");
                
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
                logDebug("  ⚠️ Telegram zapnutý ale chýba Chat ID (" + chatId + ") alebo token (" + globalApiKeys.success + ")");
            }
        } else {
            logDebug("  ⏭️ Telegram notifikácie vypnuté");
        }
        
        // ✅ SMS - bezpečný prístup
        var smsNotif = safeFieldGet(zamestnanec, "SMS Notifikácie", false);
        if (smsNotif) {
            var telefon = safeFieldGet(zamestnanec, "Telefón", "");
            if (telefon) {
                globalResult.celkovePokusy++;
                logDebug("  📲 SMS: Vytváram správu...");
                
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
        } else {
            logDebug("  ⏭️ SMS notifikácie vypnuté");
        }
        
        // ✅ EMAIL - bezpečný prístup
        var emailNotif = safeFieldGet(zamestnanec, "Email Notifikácie", false);
        if (emailNotif) {
            var email = safeFieldGet(zamestnanec, "E-mail", "");
            if (email) {
                globalResult.celkovePokusy++;
                logDebug("  📧 Email: Vytváram správu...");
                
                vytvorEmailSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex);
                var emailSprava = globalSprava;
                
                formatDate(safeFieldGet(dochadzkaZaznam, "Dátum", new Date()));
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
        } else {
            logDebug("  ⏭️ Email notifikácie vypnuté");
        }
        
        globalResult.success = globalResult.uspesnePoslane > 0;
        logDebug("  📊 Výsledok pre " + meno + ": " + globalResult.uspesnePoslane + "/" + globalResult.celkovePokusy + " úspešných");
    }
}

// ==============================================
// MAIN ACTION SCRIPT - OPRAVENÝ
// ==============================================

try {
    clearLogs();
    
    logDebug("🚀 === ŠTART DOCHÁDZKA NOTIFIKÁCIÍ v" + CONFIG.version + " (" + CONFIG.scriptType + ") ===");
    logDebug("⏰ Čas spustenia: " + moment().format("DD.MM.YYYY HH:mm:ss"));
    logDebug("🔧 Oprava: Bezpečný prístup k poliam s diakritikou");
    
    if (!currentEntry) {
        var errorMsg = "Entry objekt nie je dostupný";
        logError(errorMsg, "MAIN-INIT");
        message("❌ CHYBA!\n\n" + errorMsg);
    } else {
        logDebug("✅ Entry objekt OK");
        
        var scriptFailed = false;
        var statusMsg = "";
        
        // Získaj API keys
        getApiKeys();
        if (!globalApiKeys.success) {
            logError("Nie je možné získať Telegram API keys", "MAIN");
            statusMsg += "❌ Telegram API problém\n";
        } else {
            logDebug("✅ Telegram API keys načítané úspešne:");
            logDebug("   📱 Telegram Bot: " + globalApiKeys.botName);
            logDebug("   🔧 Provider: " + globalApiKeys.provider);
            logDebug("   🔑 Token: OK (skrytý)");
            statusMsg += "✅ Telegram API OK (" + globalApiKeys.botName + ")\n";
        }
        
        // Získaj zamestnancov
        var zamestnanci = getZamestnanciArray();
        
        if (zamestnanci.length === 0) {
            var noEmployeesMsg = "Žiadni zamestnanci v zázname";
            logDebug("⚠️ " + noEmployeesMsg);
            statusMsg += "❌ " + noEmployeesMsg + "\n";
            scriptFailed = true;
        } else {
            logDebug("👥 Úspešne načítaných " + zamestnanci.length + " zamestnancov");
            statusMsg += "👥 Zamestnanci: " + zamestnanci.length + " osôb\n";
        }
        
        if (!scriptFailed) {
            var celkemUspesnych = 0;
            var celkemZamestnancov = 0;
            var detailneVysledky = [];
            
            for (var i = 0; i < zamestnanci.length; i++) {
                var zamestnanec = zamestnanci[i];
                
                if (zamestnanec) {
                    celkemZamestnancov++;
                    posliNotifikaciuZamestnancovi(currentEntry, zamestnanec, i);
                    
                    var meno = safeFieldGet(zamestnanec, "Nick", "") || 
                              safeFieldGet(zamestnanec, "Meno", "") || 
                              "Zamestnanec #" + (i + 1);
                    
                    if (globalResult.success) {
                        celkemUspesnych++;
                        detailneVysledky.push("✅ " + meno + ": " + globalResult.uspesnePoslane + "/" + globalResult.celkovePokusy);
                    } else {
                        detailneVysledky.push("❌ " + meno + ": 0/" + globalResult.celkovePokusy);
                    }
                } else {
                    logDebug("⚠️ Zamestnanec #" + i + " je null/undefined");
                }
            }
            
            var vysledokSprava = "Notifikácie odoslané: " + celkemUspesnych + "/" + celkemZamestnancov + 
                                " zamestnancov (" + moment().format("DD.MM.YYYY HH:mm:ss") + ")";
            
            logDebug("📊 === FINÁLNY VÝSLEDOK ===");
            logDebug(vysledokSprava);
            
            var existujuciLog = safeFieldGet(currentEntry, "Notifikácie Log", "");
            currentEntry.set("Notifikácie Log", existujuciLog + vysledokSprava + "\n");
            
            var userMessage = "📧 NOTIFIKÁCIE DOKONČENÉ v" + CONFIG.version + "\n\n";
            userMessage += statusMsg + "\n";
            userMessage += "📊 VÝSLEDKY:\n";
            userMessage += "• Celkom zamestnancov: " + celkemZamestnancov + "\n";
            userMessage += "• Úspešne notifikovaní: " + celkemUspesnych + "\n";
            
            if (celkemZamestnancov > 0) {
                userMessage += "• Úspešnosť: " + Math.round((celkemUspesnych / celkemZamestnancov) * 100) + "%\n\n";
            }
            
            userMessage += "📋 DETAILNE:\n";
            for (var j = 0; j < Math.min(detailneVysledky.length, 5); j++) {
                userMessage += detailneVysledky[j] + "\n";
            }
            if (detailneVysledky.length > 5) {
                userMessage += "... a ďalší " + (detailneVysledky.length - 5) + " zamestnanci\n";
            }
            
            userMessage += "\n💡 Pozri Debug_Log pre detaily";
            
            if (celkemUspesnych === celkemZamestnancov) {
                logDebug("🎉 Všetky notifikácie úspešne odoslané!");
                message("🎉 " + userMessage);
            } else if (celkemUspesnych > 0) {
                logDebug("⚠️ Čiastočný úspech - niektoré notifikácie zlyhali");
                message("⚠️ " + userMessage);
            } else {
                logError("Všetky notifikácie zlyhali", "MAIN");
                message("❌ " + userMessage);
            }
        } else {
            message("❌ SCRIPT ZLYHAL\n\n" + statusMsg + "\nSkontroluj Debug_Log pre detaily");
        }
    }
    
} catch (criticalError) {
    logError(criticalError, "MAIN-CRITICAL");
    message("💥 KRITICKÁ CHYBA!\n\n" + criticalError.toString() + "\n\nPozri Error_Log pre detaily");
}
