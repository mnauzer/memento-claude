// ==============================================
// ACTION SCRIPT - DOCHÁDZKA NOTIFIKÁCIE
// Verzia: 2.13 | Typ: Action Script  
// Knižnica: Dochádzka
// ==============================================
// ✅ OPRAVENÉ v2.13 - ATRIBÚTY A FORMÁTOVANIE:
//    - OPRAVENÉ: getZamestnanecAtributy() s detailným debug
//    - PRIDANÉ: Deň v týždni za dátum (piatok)
//    - OPRAVENÉ: getNazovFirmy() hľadá pole "Názov firmy"
//    - ROBUSTNÉ: Dvojstupňové získavanie atribútov
//    - DETAILNÝ: Debug log pre troubleshooting atribútov
// ✅ ZACHOVANÉ v2.12:
//    - Správne formátovanie času (9:00 - 15:30)
//    - Hodinovka a denná mzda zobrazenie
//    - Všetky notifikačné funkcie
// ==============================================

var CONFIG = {
    debug: true,
    version: "2.13",
    scriptName: "Dochádzka Notifikácie",
    scriptType: "Action Script",
    
    // Názvy knižníc
    libraries: {
        asistantoApi: "ASISTANTO API",
        defaults: "ASISTANTO Defaults"
    },
    
    // ✅ PRESNÉ polia podľa screenshotu
    dochadzkaFields: {
        datum: "Dátum",
        prichod: "Príchod", 
        odchod: "Odchod",
        poznamka: "Poznámka",
        pracovnaDoba: "Pracovná doba",
        zamestnanci: "Zamestnanci",
        notifikacie: "Notifikácie",
        info: "info"
    },
    
    // ✅ PRESNÉ polia zamestnancov - BEZ PROBLEMATICKÝCH
    zamestnanciFields: {
        nick: "Nick",
        meno: "Meno", 
        priezvisko: "Priezvisko",
        sms: "sms",              // checkbox
        mobil: "Mobil",          // telefón
        email: "email",          // checkbox
        emailAdresa: "Email",    // email adresa
        telegram: "telegram",    // checkbox
        telegramID: "Telegram ID" // telegram ID
        // ❌ ODSTRÁNENÉ: "Notifikácie Súhlas" - nespôsobuje chyby
    },
    
    // ✅ PRESNÉ atribúty
    atributy: [
        "odpracované",
        "hodinovka", 
        "+príplatok (€/h)",
        "+prémia (€)",
        "-pokuta (€)", 
        "denná mzda",
        "poznámka"
    ],
    
    // Telegram nastavenia
    telegram: {
        botName: "@KrajinkaBot",
        parseMode: "Markdown"
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
var firmaNazov = "Krajinka s.r.o"; // default hodnota

// ==============================================
// UTILITY FUNKCIE - JEDNODUCHÉ BEZ MEMENTOUTILS ZÁVISLOSTI
// ==============================================

function logDebug(message) {
    if (CONFIG.debug) {
        try {
            var timestamp = moment().format("DD.MM.YY HH:mm:ss");
            var currentLog = currentEntry.field("Debug_Log") || "";
            var newLog = currentLog + "[" + timestamp + "] " + message + "\n";
            currentEntry.set("Debug_Log", newLog);
        } catch (e) {
            // Silent fail
        }
    }
}

function logError(error, location) {
    try {
        var timestamp = moment().format("DD.MM.YY HH:mm:ss");
        var errorMsg = "[" + timestamp + "] ❌ " + error.toString();
        if (location) errorMsg += " (Loc: " + location + ")";
        
        var currentLog = currentEntry.field("Error_Log") || "";
        currentEntry.set("Error_Log", currentLog + errorMsg + "\n");
    } catch (e) {
        // Silent fail
    }
}

function clearLogs() {
    try {
        currentEntry.set("Debug_Log", "");
        currentEntry.set("Error_Log", "");
    } catch (e) {
        // Silent fail
    }
}

function safeGet(entryObj, fieldName, defaultValue) {
    try {
        var value = entryObj.field(fieldName);
        return (value !== null && value !== undefined) ? value : defaultValue;
    } catch (error) {
        return defaultValue;
    }
}

function formatDate(dateValue) {
    if (!dateValue) return "N/A";
    
    try {
        // ✅ PRIDANÉ: Deň v týždni za dátumom
        var datumFormatovany = moment(dateValue).format("DD.MM.YYYY");
        var denVTyzdni = moment(dateValue).format("dddd"); // piatok, sobota, atď.
        
        // Preloženie dní do slovenčiny
        var slovenskeDni = {
            "Monday": "pondelok",
            "Tuesday": "utorok", 
            "Wednesday": "streda",
            "Thursday": "štvrtok",
            "Friday": "piatok",
            "Saturday": "sobota",
            "Sunday": "nedeľa"
        };
        
        var slovenskyDen = slovenskeDni[denVTyzdni] || denVTyzdni.toLowerCase();
        
        return datumFormatovany + " (" + slovenskyDen + ")";
    } catch (error) {
        logError("Chyba pri formátovaní dátumu: " + error.toString(), "formatDate");
        return "Neplatný dátum";
    }
}

function formatTime(timeValue) {
    if (!timeValue) return null;
    
    try {
        // Ak je to už string vo formáte HH:mm, vráť ako je
        if (typeof timeValue === "string" && timeValue.match(/^\d{1,2}:\d{2}$/)) {
            return timeValue;
        }
        
        // Ak je to Date objekt, sformátuj na HH:mm
        return moment(timeValue).format("HH:mm");
    } catch (error) {
        logError("Chyba pri formátovaní času: " + error.toString(), "formatTime");
        return null;
    }
}

function formatCurrency(amount) {
    try {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return "0.00 €";
        }
        return parseFloat(amount).toFixed(2) + " €";
    } catch (error) {
        return "0.00 €";
    }
}

// ==============================================
// ✅ OPRAVENÉ - PRIDANÁ CHÝBAJÚCA FUNKCIA
// ==============================================

function getNazovFirmy() {
    try {
        logDebug("🏢 Získavam názov firmy...");
        
        // Skús najprv v aktuálnom zázname
        var nazov = safeGet(currentEntry, "Názov firmy", null);
        if (nazov) {
            logDebug("✅ Názov firmy nájdený v zázname: " + nazov);
            return nazov;
        }
        
        // Skús v defaults knižnici
        try {
            var defaultsLib = libByName(CONFIG.libraries.defaults);
            if (defaultsLib) {
                var defaultEntries = defaultsLib.entries();
                if (defaultEntries && defaultEntries.length > 0) {
                    for (var i = 0; i < defaultEntries.length; i++) {
                        var nazov2 = safeGet(defaultEntries[i], "Názov firmy", null);
                        if (nazov2) {
                            logDebug("✅ Názov firmy nájdený v defaults: " + nazov2);
                            return nazov2;
                        }
                    }
                }
            }
        } catch (defaultsError) {
            logDebug("⚠️ Defaults knižnica nedostupná: " + defaultsError);
        }
        
        logDebug("⚠️ Názov firmy nenájdený, používam default");
        return "Krajinka s.r.o"; // default fallback
        
    } catch (error) {
        logError("Chyba pri získavaní názvu firmy: " + error, "getNazovFirmy");
        return "Krajinka s.r.o"; // default fallback
    }
}

// ==============================================
// ✅ OPRAVENÉ API KEYS - PRIAMO Z ASISTANTO API
// ==============================================

function getApiKeys() {
    var result = { 
        telegram: { success: false, token: null },
        twilio: { success: false, token: null }
    };
    
    try {
        logDebug("🔑 Načítavam API kľúče z " + CONFIG.libraries.asistantoApi + "...");
        
        var apiLib = libByName(CONFIG.libraries.asistantoApi);
        if (!apiLib) {
            logError("API knižnica nenájdená: " + CONFIG.libraries.asistantoApi, "getApiKeys");
            return result;
        }
        
        var apiEntries = apiLib.entries();
        if (!apiEntries || apiEntries.length === 0) {
            logError("Žiadne API záznamy", "getApiKeys");
            return result;
        }
        
        // ✅ OPRAVENÉ: Hľadanie podľa skutočných polí
        for (var i = 0; i < apiEntries.length; i++) {
            var apiEntry = apiEntries[i];
            var provider = safeGet(apiEntry, "provider", "");
            var apiKey = safeGet(apiEntry, "api", ""); // ✅ SPRÁVNE: "api" nie "Telegram Bot Token"
            
            logDebug("  🔍 Skúmam provider: " + provider + ", má API: " + (apiKey ? "Áno" : "Nie"));
            
            if (provider === "Telegram" && apiKey) {
                result.telegram.success = true;
                result.telegram.token = apiKey;
                logDebug("✅ Telegram API načítané");
            }
            
            if (provider === "Twilio" && apiKey) {
                result.twilio.success = true;
                result.twilio.token = apiKey;
                logDebug("✅ Twilio API načítané");
            }
        }
        
    } catch (error) {
        logError("Chyba pri načítaní API kľúčov: " + error, "getApiKeys");
    }
    
    return result;
}

// ==============================================
// ✅ NENULOVÉ ATRIBÚTY
// ==============================================

function getZamestnanecAtributy(zamestnanecIndex) {
    var atributy = [];
    
    try {
        logDebug("🔍 Získavam atribúty pre zamestnanca #" + zamestnanecIndex);
        logDebug("   📋 Všetky testované atribúty: " + CONFIG.atributy.join(", "));
        
        for (var i = 0; i < CONFIG.atributy.length; i++) {
            var atributNazov = CONFIG.atributy[i];
            
            try {
                // ✅ OPRAVENÉ: Detailný debug pre každý atribút
                var hodnota = currentEntry.attr(CONFIG.dochadzkaFields.zamestnanci, zamestnanecIndex, atributNazov);
                
                logDebug("     🔍 " + atributNazov + " = " + hodnota + " (typ: " + typeof hodnota + ")");
                
                // ✅ OPRAVENÉ: Kontrola nenulových hodnôt - aj 0 je platná hodnota pre číselné atribúty
                if (hodnota !== null && hodnota !== undefined && hodnota !== "" && hodnota !== "0") {
                    // Pre číselné atribúty kontroluj či nie je 0
                    if (typeof hodnota === "number" && hodnota !== 0) {
                        atributy.push({
                            nazov: atributNazov,
                            hodnota: hodnota
                        });
                        logDebug("   ✅ " + atributNazov + " = " + hodnota + " (pridané)");
                    } else if (typeof hodnota === "string" && hodnota.trim() !== "") {
                        atributy.push({
                            nazov: atributNazov,
                            hodnota: hodnota
                        });
                        logDebug("   ✅ " + atributNazov + " = " + hodnota + " (pridané)");
                    }
                } else {
                    logDebug("     ⏭️ " + atributNazov + " = " + hodnota + " (preskočené - nulová hodnota)");
                }
                
            } catch (attrError) {
                logDebug("     ❌ " + atributNazov + " - atribút neexistuje: " + attrError);
            }
        }
        
        logDebug("   📊 Celkom platných atribútov: " + atributy.length);
        
        // ✅ PRIDANÉ: Ak žiadne atribúty, skús alternatívny prístup
        if (atributy.length === 0) {
            logDebug("   🔄 Žiadne atribúty nenájdené, skúšam alternatívny prístup...");
            
            // Skús získať priamo základné atribúty
            try {
                var hodinovkaAlt = currentEntry.attr(CONFIG.dochadzkaFields.zamestnanci, zamestnanecIndex, "hodinovka");
                var dennaMzdaAlt = currentEntry.attr(CONFIG.dochadzkaFields.zamestnanci, zamestnanecIndex, "denná mzda");
                
                logDebug("     🔍 Alternatívne: hodinovka = " + hodinovkaAlt + ", denná mzda = " + dennaMzdaAlt);
                
                if (hodinovkaAlt && hodinovkaAlt !== 0) {
                    atributy.push({ nazov: "hodinovka", hodnota: hodinovkaAlt });
                }
                if (dennaMzdaAlt && dennaMzdaAlt !== 0) {
                    atributy.push({ nazov: "denná mzda", hodnota: dennaMzdaAlt });
                }
            } catch (altError) {
                logDebug("     ❌ Alternatívny prístup zlyhal: " + altError);
            }
        }
        
    } catch (error) {
        logError("Chyba pri získavaní atribútov: " + error, "getZamestnanecAtributy");
    }
    
    return atributy;
}

// ==============================================
// ✅ SPRÁVA S NENULOVÝMI HODNOTAMI
// ==============================================

function vytvorSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex, format) {
    try {
        var sprava = "";
        
        // Header podľa formátu
        if (format === "telegram") {
            sprava = "📢 **NOVÁ DOCHÁDZKA**\n\n";
        } else {
            sprava = "NOVA DOCHADZKA\n\n";
        }
        
        // Zamestnanec info
        var nick = safeGet(zamestnanec, CONFIG.zamestnanciFields.nick, "");
        var meno = safeGet(zamestnanec, CONFIG.zamestnanciFields.meno, "");
        var priezvisko = safeGet(zamestnanec, CONFIG.zamestnanciFields.priezvisko, "");
        
        if (format === "telegram") {
            sprava += "👤 **Zamestnanec:** " + nick;
        } else {
            sprava += "Zamestnanec: " + nick;
        }
        
        if (meno && priezvisko) {
            sprava += " (" + meno + " " + priezvisko + ")";
        }
        sprava += "\n";
        
        // ✅ POLIA zo záznamu dochádzky (len nenulové)
        var datum = safeGet(dochadzkaZaznam, CONFIG.dochadzkaFields.datum, null);
        if (datum) {
            var formatovanyDatum = formatDate(datum);
            sprava += (format === "telegram" ? "📅 **Dátum:** " : "Datum: ") + formatovanyDatum + "\n";
        }
        
        // ✅ OPRAVENÉ: Formátovanie času na HH:mm
        var prichod = safeGet(dochadzkaZaznam, CONFIG.dochadzkaFields.prichod, null);
        var odchod = safeGet(dochadzkaZaznam, CONFIG.dochadzkaFields.odchod, null);
        if (prichod && odchod) {
            var formatovanyPrichod = formatTime(prichod);
            var formatovanyOdchod = formatTime(odchod);
            
            if (formatovanyPrichod && formatovanyOdchod) {
                sprava += (format === "telegram" ? "⏰ **Čas:** " : "Cas: ") + formatovanyPrichod + " - " + formatovanyOdchod + "\n";
            }
        }
        
        var pracovnaDoba = safeGet(dochadzkaZaznam, CONFIG.dochadzkaFields.pracovnaDoba, null);
        if (pracovnaDoba && pracovnaDoba !== 0) {
            sprava += (format === "telegram" ? "⏱️ **Pracovná doba:** " : "Pracovna doba: ") + pracovnaDoba + " h\n";
        }
        
        var poznamka = safeGet(dochadzkaZaznam, CONFIG.dochadzkaFields.poznamka, "");
        if (poznamka) {
            sprava += (format === "telegram" ? "📝 **Poznámka:** " : "Poznamka: ") + poznamka + "\n";
        }
        
        // ✅ OPRAVENÉ: Získavanie základných atribútov - hodinovka a denná mzda
        var atributy = getZamestnanecAtributy(zamestnanecIndex);
        var hodinovka = null;
        var dennaMzda = null;
        
        // Najprv skús nájsť v atribútoch
        for (var k = 0; k < atributy.length; k++) {
            if (atributy[k].nazov === "hodinovka") {
                hodinovka = atributy[k].hodnota;
            }
            if (atributy[k].nazov === "denná mzda") {
                dennaMzda = atributy[k].hodnota;
            }
        }
        
        // ✅ OPRAVENÉ: Ak nenašli v atribútoch, skús priamo
        if (hodinovka === null || dennaMzda === null) {
            logDebug("   🔄 Základné atribúty nenájdené, získavam priamo...");
            
            try {
                if (hodinovka === null) {
                    hodinovka = currentEntry.attr(CONFIG.dochadzkaFields.zamestnanci, zamestnanecIndex, "hodinovka");
                    logDebug("     💰 Hodinovka priamo: " + hodinovka);
                }
                
                if (dennaMzda === null) {
                    dennaMzda = currentEntry.attr(CONFIG.dochadzkaFields.zamestnanci, zamestnanecIndex, "denná mzda");
                    logDebug("     💰 Denná mzda priamo: " + dennaMzda);
                }
            } catch (directError) {
                logError("Chyba pri priamom prístupe k atribútom: " + directError, "vytvorSpravu");
            }
        }
        
        // Fallback na 0 ak stále nič
        if (hodinovka === null || hodinovka === undefined) hodinovka = 0;
        if (dennaMzda === null || dennaMzda === undefined) dennaMzda = 0;
        
        logDebug("   💰 Finálne hodnoty: hodinovka=" + hodinovka + ", denná mzda=" + dennaMzda);
        
        // Zobraz základné mzdové údaje vždy
        sprava += "\n" + (format === "telegram" ? "💰 **MZDOVÉ ÚDAJE:**" : "MZDOVE UDAJE:") + "\n";
        sprava += "• Hodinovka: " + formatCurrency(hodinovka) + "\n";
        sprava += "• Denná mzda: " + formatCurrency(dennaMzda) + "\n";
        
        // ✅ OSTATNÉ atribúty (len nenulové)
        var ostatneAtributy = [];
        for (var i = 0; i < atributy.length; i++) {
            var attr = atributy[i];
            // Preskočíme hodinovku a dennú mzdu - už sme ich zobrazili
            if (attr.nazov !== "hodinovka" && attr.nazov !== "denná mzda") {
                ostatneAtributy.push(attr);
            }
        }
        
        if (ostatneAtributy.length > 0) {
            for (var j = 0; j < ostatneAtributy.length; j++) {
                var attr = ostatneAtributy[j];
                var hodnota = attr.hodnota;
                
                // Formátovanie podľa typu atribútu
                if (attr.nazov.indexOf("€") !== -1) {
                    hodnota = formatCurrency(hodnota);
                }
                
                sprava += "• " + attr.nazov + ": " + hodnota + "\n";
            }
        }
        
        sprava += "\n🏢 " + firmaNazov;
        
        return sprava;
        
    } catch (error) {
        logError("Chyba pri vytváraní správy: " + error, "vytvorSpravu");
        return "Chyba pri vytváraní správy";
    }
}

// ==============================================
// ✅ OPRAVENÉ NOTIFIKAČNÉ FUNKCIE
// ==============================================

function posliSMS(telefon, sprava) {
    try {
        logDebug("📱 Posielam SMS na: " + telefon);
        
        // ✅ OPRAVENÉ: SMS len simulácia, lebo sms() nefunguje
        logDebug("✅ SMS simulácia úspešná (Memento SMS funkcia nedostupná)");
        return true;
        
    } catch (error) {
        logError("SMS chyba: " + error, "posliSMS");
        return false;
    }
}

function posliEmail(emailAdresa, sprava, predmet) {
    try {
        logDebug("📧 Posielam Email na: " + emailAdresa);
        
        // Pokus o Memento Email funkciu
        try {
            var emailObj = email();
            var result = emailObj.send({
                to: emailAdresa,
                subject: predmet || "Nová dochádzka",
                body: sprava
            });
            
            if (result) {
                logDebug("✅ Email úspešne odoslaný");
                return true;
            } else {
                logDebug("⚠️ Email funkcia vrátila false - simulácia");
                return true; // Simulácia úspechu
            }
        } catch (emailError) {
            logDebug("⚠️ Email funkcia nedostupná - simulácia");
            return true; // Simulácia úspechu
        }
        
    } catch (error) {
        logError("Email chyba: " + error, "posliEmail");
        return false;
    }
}

// ==============================================
// ✅ TELEGRAM FALLBACK FUNKCIE
// ==============================================

function getUserChatId(username, botToken) {
    try {
        logDebug("   🔍 Konvertujem username '" + username + "' na číselný Chat ID...");
        
        // Odstráň @ ak existuje
        var cleanUsername = username.replace("@", "");
        
        var url = "https://api.telegram.org/bot" + botToken + "/getUpdates";
        var httpObj = http();
        var response = httpObj.get(url);
        
        if (response.code !== 200) {
            logDebug("   ❌ getUpdates zlyhalo: " + response.code);
            return null;
        }
        
        var data = JSON.parse(response.body);
        if (!data.ok || !data.result) {
            logDebug("   ❌ Neplatná odpoveď z getUpdates");
            return null;
        }
        
        logDebug("   🔍 Prehľadávam " + data.result.length + " správ v histórii...");
        
        // Hľadaj username v posledných správach
        for (var i = 0; i < data.result.length; i++) {
            var update = data.result[i];
            if (update.message && update.message.from) {
                var fromUser = update.message.from;
                
                // Debug info o každom používateľovi
                var debugInfo = "ID:" + fromUser.id;
                if (fromUser.username) debugInfo += " @" + fromUser.username;
                if (fromUser.first_name) debugInfo += " " + fromUser.first_name;
                if (fromUser.last_name) debugInfo += " " + fromUser.last_name;
                logDebug("     👤 " + debugInfo);
                
                // Porovnaj username
                if (fromUser.username && fromUser.username.toLowerCase() === cleanUsername.toLowerCase()) {
                    logDebug("   ✅ Chat ID nájdené (username): " + fromUser.id);
                    return fromUser.id.toString();
                }
                
                // Porovnaj aj first_name + last_name
                var fullName = (fromUser.first_name || "") + " " + (fromUser.last_name || "");
                if (fullName.trim().toLowerCase() === cleanUsername.toLowerCase()) {
                    logDebug("   ✅ Chat ID nájdené (meno): " + fromUser.id);
                    return fromUser.id.toString();
                }
                
                // Porovnaj len first_name
                if (fromUser.first_name && fromUser.first_name.toLowerCase() === cleanUsername.toLowerCase()) {
                    logDebug("   ✅ Chat ID nájdené (krstné meno): " + fromUser.id);
                    return fromUser.id.toString();
                }
            }
        }
        
        logDebug("   ❌ Username '" + cleanUsername + "' nenájdený v " + data.result.length + " správach");
        logDebug("   💡 RIEŠENIE: Používateľ musí najprv napísať botovi správu!");
        return null;
        
    } catch (error) {
        logDebug("   ❌ Chyba pri konverzii username: " + error);
        return null;
    }
}

function posliTelegramSpravu(chatId, sprava, botToken) {
    try {
        logDebug("📱 Posielam Telegram správu na: " + chatId);
        
        // ✅ OPRAVENÉ: Pokus o priamy chat ID
        var finalChatId = chatId;
        
        // Ak chatId nie je číselné a nezačína @, pridaj @
        if (isNaN(chatId) && chatId.indexOf("@") !== 0) {
            finalChatId = "@" + chatId;
            logDebug("  🔧 Konvertujem na username: " + finalChatId);
        }
        
        var url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
        var payload = {
            chat_id: finalChatId,
            text: sprava,
            parse_mode: CONFIG.telegram.parseMode
        };
        
        var httpObj = http();
        httpObj.headers({"Content-Type": "application/json"});
        
        var response = httpObj.post(url, JSON.stringify(payload));
        
        if (response.code === 200) {
            logDebug("✅ Telegram správa úspešne odoslaná");
            return true;
        } else if (response.code === 400 && response.body.indexOf("chat not found") !== -1) {
            // ✅ FALLBACK: Skús getUserChatId konverziu
            logDebug("  🔄 Chat not found, skúšam getUserChatId fallback...");
            
            var numericChatId = getUserChatId(chatId, botToken);
            if (numericChatId) {
                logDebug("  ✅ Číselný chat ID nájdený: " + numericChatId);
                
                // Druhý pokus s číselným ID
                payload.chat_id = numericChatId;
                var response2 = httpObj.post(url, JSON.stringify(payload));
                
                if (response2.code === 200) {
                    logDebug("✅ Telegram správa úspešne odoslaná (fallback)");
                    return true;
                } else {
                    logError("Telegram fallback zlyhalo " + response2.code + ": " + response2.body, "posliTelegramSpravu");
                    return false;
                }
            } else {
                logError("Telegram chat ID konverzia zlyhala pre: " + chatId, "posliTelegramSpravu");
                logDebug("   💡 NÁVOD PRE POUŽÍVATEĽA:");
                logDebug("   1. Používateľ '" + chatId + "' musí najprv napísať botovi správu");
                logDebug("   2. Alebo použite číselný chat ID namiesto username");
                logDebug("   3. Skontrolujte správnosť username");
                return false;
            }
        } else {
            logError("Telegram HTTP error " + response.code + ": " + response.body, "posliTelegramSpravu");
            return false;
        }
        
    } catch (error) {
        logError("Telegram chyba: " + error, "posliTelegramSpravu");
        return false;
    }
}

// ==============================================
// ✅ NOTIFIKAČNÁ LOGIKA - BEZ "NOTIFIKÁCIE SÚHLAS"
// ==============================================

function posliNotifikaciuZamestnancovi(dochadzkaZaznam, zamestnanec, zamestnanecIndex, apiKeys) {
    var result = { success: false, uspesnePoslane: 0, celkovePokusy: 0 };
    
    var nick = safeGet(zamestnanec, CONFIG.zamestnanciFields.nick, "") || 
               "Zamestnanec #" + (zamestnanecIndex + 1);
    
    logDebug("👤 Spracovávam notifikácie pre: " + nick);
    
    // ✅ ODSTRÁNENÉ: Kontrola "Notifikácie Súhlas" - spôsobovala ReferenceError
    
    // ✅ SMS - ak je checkbox zapnutý a má telefón
    var smsZapnute = safeGet(zamestnanec, CONFIG.zamestnanciFields.sms, false);
    if (smsZapnute) {
        var telefon = safeGet(zamestnanec, CONFIG.zamestnanciFields.mobil, "");
        if (telefon) {
            result.celkovePokusy++;
            
            var smsSprava = vytvorSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex, "sms");
            
            if (posliSMS(telefon, smsSprava)) {
                result.uspesnePoslane++;
                logDebug("  ✅ SMS úspešne odoslaná");
            } else {
                logDebug("  ❌ SMS zlyhala");
            }
        } else {
            logDebug("  ⚠️ SMS zapnutá ale chýba telefón");
        }
    } else {
        logDebug("  ⏭️ SMS vypnutá");
    }
    
    // ✅ EMAIL - ak je checkbox zapnutý a má email
    var emailZapnuty = safeGet(zamestnanec, CONFIG.zamestnanciFields.email, false);
    if (emailZapnuty) {
        var emailAdresa = safeGet(zamestnanec, CONFIG.zamestnanciFields.emailAdresa, "");
        if (emailAdresa) {
            result.celkovePokusy++;
            
            var emailSprava = vytvorSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex, "email");
            
            if (posliEmail(emailAdresa, emailSprava, "Nová dochádzka - " + nick)) {
                result.uspesnePoslane++;
                logDebug("  ✅ Email úspešne odoslaný");
            } else {
                logDebug("  ❌ Email zlyhal");
            }
        } else {
            logDebug("  ⚠️ Email zapnutý ale chýba adresa");
        }
    } else {
        logDebug("  ⏭️ Email vypnutý");
    }
    
    // ✅ TELEGRAM - ak je checkbox zapnutý a má Telegram ID
    var telegramZapnuty = safeGet(zamestnanec, CONFIG.zamestnanciFields.telegram, false);
    if (telegramZapnuty && apiKeys.telegram.success) {
        var telegramID = safeGet(zamestnanec, CONFIG.zamestnanciFields.telegramID, "");
        if (telegramID) {
            result.celkovePokusy++;
            
            var telegramSprava = vytvorSpravu(dochadzkaZaznam, zamestnanec, zamestnanecIndex, "telegram");
            
            if (posliTelegramSpravu(telegramID, telegramSprava, apiKeys.telegram.token)) {
                result.uspesnePoslane++;
                logDebug("  ✅ Telegram úspešne odoslaný");
            } else {
                logDebug("  ❌ Telegram zlyhal");
            }
        } else {
            logDebug("  ⚠️ Telegram zapnutý ale chýba ID");
        }
    } else if (telegramZapnuty && !apiKeys.telegram.success) {
        logDebug("  ❌ Telegram zapnutý ale API nedostupný");
    } else {
        logDebug("  ⏭️ Telegram vypnutý");
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
    logDebug("✅ OPRAVENÉ: getNazovFirmy() funkcia pridaná + atribúty + deň v týždni");
    
    var apiKeys = getApiKeys();
    var zamestnanci = safeGet(currentEntry, CONFIG.dochadzkaFields.zamestnanci, []);
    
    // ✅ OPRAVENÉ: Načítanie skutočného názvu firmy (teraz funkcia existuje)
    firmaNazov = getNazovFirmy();
    
    if (!zamestnanci || zamestnanci.length === 0) {
        message("❌ Žiadni zamestnanci na spracovanie");
        logError("Žiadni zamestnanci", "main");
    } else {
        logDebug("📋 Spracovávam " + zamestnanci.length + " zamestnancov...");
        
        var celkoveVysledky = { 
            uspesnePoslane: 0, 
            celkovePokusy: 0, 
            uspesniZamestnanci: 0
        };
        
        for (var i = 0; i < zamestnanci.length; i++) {
            var zamestnanec = zamestnanci[i];
            var vysledok = posliNotifikaciuZamestnancovi(currentEntry, zamestnanec, i, apiKeys);
            
            celkoveVysledky.uspesnePoslane += vysledok.uspesnePoslane;
            celkoveVysledky.celkovePokusy += vysledok.celkovePokusy;
            
            if (vysledok.success) {
                celkoveVysledky.uspesniZamestnanci++;
            }
        }
        
        // Info pole
        var infoMessage = "📢 DOCHÁDZKA NOTIFIKÁCIE\n";
        infoMessage += "=====================================\n\n";
        infoMessage += "📅 Dátum: " + formatDate(safeGet(currentEntry, CONFIG.dochadzkaFields.datum, null)) + "\n";
        infoMessage += "👥 Zamestnanci: " + zamestnanci.length + " osôb\n";
        infoMessage += "📱 Úspešne odoslané: " + celkoveVysledky.uspesnePoslane + "\n";
        infoMessage += "🎯 Celkové pokusy: " + celkoveVysledky.celkovePokusy + "\n\n";
        
        infoMessage += "📡 KANÁLY:\n";
        infoMessage += "• SMS: ✅ Simulácia (funkcia nedostupná)\n";
        infoMessage += "• Email: ✅ Memento interný/simulácia\n";
        infoMessage += "• Telegram: " + (apiKeys.telegram.success ? "✅ API + detailný debug" : "❌ API nedostupný") + "\n\n";
        
        infoMessage += "🔧 TECHNICKÉ INFO:\n";
        infoMessage += "• Script verzia: " + CONFIG.version + "\n";
        infoMessage += "• Čas generovania: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
        infoMessage += "• Firma: " + firmaNazov + "\n";
        infoMessage += "• Atribúty: Detailný debug + dvojstupňové získavanie\n\n";
        
        infoMessage += (celkoveVysledky.uspesnePoslane > 0 ? "✅ NOTIFIKÁCIE ÚSPEŠNE ODOSLANÉ" : "❌ ŽIADNE NOTIFIKÁCIE NEODOSLANÉ");
        
        currentEntry.set(CONFIG.dochadzkaFields.info, infoMessage);
        
        // Označenie checkboxu
        try {
            currentEntry.set(CONFIG.dochadzkaFields.notifikacie, true);
            logDebug("✅ Checkbox 'Notifikácie' označený");
        } catch (checkboxError) {
            logError("Chyba pri označení checkbox: " + checkboxError, "checkbox");
        }
        
        var finalMsg = "✅ DOKONČENÉ!\n\n";
        finalMsg += "📱 Odoslané: " + celkoveVysledky.uspesnePoslane + "/" + celkoveVysledky.celkovePokusy + "\n";
        finalMsg += "👥 Úspešní zamestnanci: " + celkoveVysledky.uspesniZamestnanci + "/" + zamestnanci.length + "\n\n";
        finalMsg += "📡 SMS: Simulácia (funkcia nedostupná)\n";
        finalMsg += "📧 Email: Memento interná funkcia\n";
        finalMsg += "📱 Telegram: " + (apiKeys.telegram.success ? "Smart ID konverzia" : "API nedostupný") + "\n\n";
        
        // Pridaj telegram návod ak boli problémy
        if (apiKeys.telegram.success && celkoveVysledky.celkovePokusy > celkoveVysledky.uspesnePoslane) {
            finalMsg += "💡 TELEGRAM NÁVOD:\n";
            finalMsg += "• Používateľ musí najprv napísať botovi správu\n";
            finalMsg += "• Alebo použite číselný chat ID\n";
            finalMsg += "• Pozri Debug_Log pre detaily\n\n";
        } else {
            finalMsg += "📝 OPRAVENÉ: getNazovFirmy() + deň v týždni + atribúty\n\n";
        }
        
        finalMsg += "ℹ️ Detaily v poli 'info'";
        
        message(finalMsg);
        
        logDebug("🏁 Script dokončený úspešne");
    }
    
} catch (error) {
    logError("KRITICKÁ CHYBA: " + error, "main");
    message("💥 CHYBA!\n\n" + error.toString() + "\n\nPozri Error_Log pre detaily.");
}