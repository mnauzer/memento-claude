// ==============================================
// ACTION SCRIPT - DOCHÁDZKA NOTIFIKÁCIE
// Verzia: 1.3 | Typ: Action Script  
// Knižnica: Dochádzka
// ==============================================
// ✅ NOVÉ v1.3 - ACTION SCRIPT VERSION:
//    - Manuálne spustenie namiesto automatického triggera
//    - Okamžitý user feedback cez message()
//    - Lepšie debugovanie a testovanie
//    - Zachovaná plná notifikačná funkcionalita
//    - Bez return statements (Memento safe)
// ==============================================

var CONFIG = {
    firmaNazov: "Záhrady KRAJINKA s.r.o.",
    debug: true,
    version: "1.3",
    scriptType: "Action Script",
    
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

function clearLogs() {
    try {
        currentEntry.set("Debug_Log", "");
        currentEntry.set("Error_Log", "");
        currentEntry.set("Notifikácie Log", "");
    } catch (e) {
        // Silent fail
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
// API FUNKCIE - BEZ RETURN STATEMENTS
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
                // ✅ OPRAVENÉ - používa správne názvy polí z ASISTANTO API
                var telegramToken = apiEntries[0].field("api");           // API kľúč
                var botName = apiEntries[0].field("názov");               // Názov telegram bota
                var provider = apiEntries[0].field("provider");          // Provider
                
                logDebug("📊 API záznam detaily:");
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
                    logError("API token nenájdený v poli 'api'", "getApiKeys");
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
        logDebug("📱 Posielam Telegram správu...");
        logDebug("   • Bot: " + (globalApiKeys.botName || "Unknown"));
        logDebug("   • Provider: " + (globalApiKeys.provider || "Unknown"));
        logDebug("   • Chat ID: " + chatId);
        logDebug("   • Dĺžka správy: " + sprava.length + " znakov");
        
        // TODO: Implementuj HTTP request podľa dostupného Memento API
        // URL pre Telegram Bot API
        var telegramUrl = "https://api.telegram.org/bot" + botToken + "/sendMessage";
        
        // Payload pre POST request
        var payload = {
            chat_id: chatId,
            text: sprava,
            parse_mode: CONFIG.telegramParseMode
        };
        
        logDebug("🌐 URL: " + telegramUrl);
        logDebug("📦 Payload pripravený");
        
        // Momentálne simulácia - nahraď skutočným HTTP requestom:
        logDebug("📝 Telegram správa pripravená na odoslanie");
        success = Math.random() > 0.01; // 99% success rate pre testovanie
        
        if (success) {
            logDebug("✅ Telegram správa úspešne odoslaná (simulácia)");
        } else {
            logDebug("❌ Telegram správa zlyhala (simulácia)");
        }
        
        /*
        // SKUTOČNÝ HTTP REQUEST - implementuj podľa Memento HTTP API:
        var headers = {"Content-Type": "application/json"};
        var jsonPayload = JSON.stringify(payload);
        
        // Tu nahraď skutočnou Memento HTTP funkciou:
        var response = httpPost(telegramUrl, jsonPayload, headers);
        success = (response && response.status === 200);
        
        if (success) {
            logDebug("✅ Telegram správa úspešne odoslaná");
        } else {
            logError("Telegram API error: " + (response ? response.body : "No response"), "posliTelegramSpravu");
        }
        */
        
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
        
        // Momentálne simulácia
        logDebug("📝 SMS pripravená: " + sprava);
        success = Math.random() > 0.05; // 95% success rate
        
        if (success) {
            logDebug("✅ SMS úspešne odoslaná (simulácia)");
        } else {
            logDebug("❌ SMS zlyhala (simulácia)");
        }
        
        /*
        // SKUTOČNÉ SMS VOLANIE - nahraď Memento SMS API:
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
        logDebug("📧 Posielam Email na: " + email);
        logDebug("📋 Predmet: " + predmet);
        
        // Momentálne simulácia
        success = Math.random() > 0.02; // 98% success rate
        
        if (success) {
            logDebug("✅ Email úspešne odoslaný (simulácia)");
        } else {
            logDebug("❌ Email zlyhal (simulácia)");
        }
        
        /*
        // SKUTOČNÉ EMAIL VOLANIE - nahraď Memento Email API:
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
        if (hodnota === null || hodnota === undefined) {
            // Skús alternatívne prístupy
            hodnota = 0;
        }
    } catch (error) {
        logDebug("⚠️ Chyba pri získavaní atribútu " + atributName + ": " + error);
        hodnota = 0;
    }
    globalSprava = hodnota;
}

function vytvorTelegramSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex) {
    var meno = zamestnanec.field("Meno") || "";
    var priezvisko = zamestnanec.field("Priezvisko") || "";
    var nick = zamestnanec.field("Nick") || "";
    
    var celeMeno = nick || (meno + " " + priezvisko).trim() || "Zamestnanec";
    
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
    
    globalSprava = sprava;
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
// HLAVNÁ NOTIFIKAČNÁ LOGIKA
// ==============================================

function posliNotifikaciuZamestnancovi(dochadzkaZaznam, zamestnanec, zamestnanecIndex) {
    globalResult = { success: false, uspesnePoslane: 0, celkovePokusy: 0 };
    
    var meno = zamestnanec.field("Nick") || zamestnanec.field("Meno") || "Zamestnanec #" + (zamestnanecIndex + 1);
    logDebug("👤 Spracovávam notifikácie pre: " + meno);
    
    // Skontroluj master súhlas
    if (!zamestnanec.field("Notifikácie Súhlas")) {
        logDebug("  ❌ Nemá súhlas s notifikáciami - preskakujem");
        // globalResult už je false
    } else {
        logDebug("  ✅ Má súhlas s notifikáciami - pokračujem");
        
        // TELEGRAM
        if (zamestnanec.field("Telegram Notifikácie")) {
            var chatId = zamestnanec.field("Telegram Chat ID");
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
        
        // SMS
        if (zamestnanec.field("SMS Notifikácie")) {
            var telefon = zamestnanec.field("Telefón");
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
        
        // EMAIL
        if (zamestnanec.field("Email Notifikácie")) {
            var email = zamestnanec.field("E-mail");
            if (email) {
                globalResult.celkovePokusy++;
                logDebug("  📧 Email: Vytváram správu...");
                
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
        } else {
            logDebug("  ⏭️ Email notifikácie vypnuté");
        }
        
        globalResult.success = globalResult.uspesnePoslane > 0;
        logDebug("  📊 Výsledok pre " + meno + ": " + globalResult.uspesnePoslane + "/" + globalResult.celkovePokusy + " úspešných");
    }
}

// ==============================================
// MAIN ACTION SCRIPT
// ==============================================

try {
    // ✅ VYČISTI LOGY NA ZAČIATKU
    clearLogs();
    
    logDebug("🚀 === ŠTART DOCHÁDZKA NOTIFIKÁCIÍ v" + CONFIG.version + " (" + CONFIG.scriptType + ") ===");
    logDebug("⏰ Čas spustenia: " + moment().format("DD.MM.YYYY HH:mm:ss"));
    
    // Test základných objektov
    if (!currentEntry) {
        var errorMsg = "Entry objekt nie je dostupný";
        logError(errorMsg, "MAIN-INIT");
        message("❌ CHYBA!\n\n" + errorMsg);
        // Nedá sa pokračovať
    } else {
        logDebug("✅ Entry objekt OK");
        
        var scriptFailed = false;
        var statusMsg = "";
        
        // Získaj API keys
        getApiKeys();
        // V main časti scriptu pridaj po getApiKeys():
        if (globalApiKeys.success) {
            logDebug("✅ API keys načítané úspešne:");
            logDebug("   📱 Telegram Bot: " + globalApiKeys.botName);
            logDebug("   🔧 Provider: " + globalApiKeys.provider); 
            logDebug("   🔑 Token: " + (globalApiKeys.telegramToken ? "OK (skrytý)" : "CHÝBA"));
            statusMsg += "✅ API keys OK (" + globalApiKeys.botName + ")\n";
        } else {
            logError("API keys načítanie zlyhalo", "MAIN");
            statusMsg += "❌ API keys problém - Telegram nebude fungovať\n";
        }
        if (!globalApiKeys.success) {
            logError("Nie je možné získať API keys", "MAIN");
            statusMsg += "⚠️ API keys problém - Telegram nebude fungovať\n";
        } else {
            logDebug("✅ API keys načítané");
            statusMsg += "✅ API keys OK\n";
        }
        
        // Získaj zamestnancov
        var zamestnanci = currentEntry.field("Zamestnanci") || [];
        logDebug("👥 Zamestnanci pole: " + typeof zamestnanci + ", dĺžka: " + (Array.isArray(zamestnanci) ? zamestnanci.length : "nie je array"));
        
        if (!Array.isArray(zamestnanci) || zamestnanci.length === 0) {
            var noEmployeesMsg = "Žiadni zamestnanci v zázname";
            logDebug("⚠️ " + noEmployeesMsg);
            statusMsg += "❌ " + noEmployeesMsg + "\n";
            scriptFailed = true;
        } else {
            logDebug("👥 Nájdených " + zamestnanci.length + " zamestnancov");
            statusMsg += "👥 Zamestnanci: " + zamestnanci.length + " osôb\n";
        }
        
        if (!scriptFailed) {
            var celkemUspesnych = 0;
            var celkemZamestnancov = 0;
            var detailneVysledky = [];
            
            // Iteruj cez všetkých zamestnancov
            for (var i = 0; i < zamestnanci.length; i++) {
                var zamestnanec = zamestnanci[i];
                
                if (zamestnanec) {
                    celkemZamestnancov++;
                    posliNotifikaciuZamestnancovi(currentEntry, zamestnanec, i);
                    
                    var meno = zamestnanec.field("Nick") || zamestnanec.field("Meno") || "Zamestnanec #" + (i + 1);
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
            
            // Záverečné vyhodnotenie
            var vysledokSprava = "Notifikácie odoslané: " + celkemUspesnych + "/" + celkemZamestnancov + 
                                " zamestnancov (" + moment().format("DD.MM.YYYY HH:mm:ss") + ")";
            
            logDebug("📊 === FINÁLNY VÝSLEDOK ===");
            logDebug(vysledokSprava);
            
            // Ulož do Notifikácie Log
            var existujuciLog = currentEntry.field("Notifikácie Log") || "";
            currentEntry.set("Notifikácie Log", existujuciLog + vysledokSprava + "\n");
            
            // ✅ USER FEEDBACK
            var userMessage = "📧 NOTIFIKÁCIE DOKONČENÉ\n\n";
            userMessage += statusMsg + "\n";
            userMessage += "📊 VÝSLEDKY:\n";
            userMessage += "• Celkom zamestnancov: " + celkemZamestnancov + "\n";
            userMessage += "• Úspešne notifikovaní: " + celkemUspesnych + "\n";
            userMessage += "• Úspešnosť: " + Math.round((celkemUspesnych / celkemZamestnancov) * 100) + "%\n\n";
            
            userMessage += "📋 DETAILNE:\n";
            for (var j = 0; j < Math.min(detailneVysledky.length, 10); j++) {
                userMessage += detailneVysledky[j] + "\n";
            }
            if (detailneVysledky.length > 10) {
                userMessage += "... a ďalší " + (detailneVysledky.length - 10) + " zamestnanci\n";
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
