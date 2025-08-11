// ==============================================
// MEMENTO DATABASE - DOCHÁDZKA PREPOČÍTAŤ ZÁZNAM
// Verzia: 2.1 | Dátum: 11.08.2025 | Autor: JavaScript Expert
// Knižnica: Dochádzka | Trigger: Before Save
// ==============================================
// ✅ OPRAVENÉ v2.1: KRITICKÉ CHYBY
//    - OPRAVENÉ: entry() namiesto currentEntry
//    - OPRAVENÉ: Atribúty syntax podľa Memento API
//    - OPRAVENÉ: Základné error handling
//    - PRIDANÉ: Fallback pre moment() ak nie je dostupný
//    - TESTOVANÉ: Základná funkcionalita pred pokročilými funkciami
// ==============================================

var CONFIG = {
    // Základné nastavenia
    debug: true,
    version: "2.1",
    scriptName: "Dochádzka Prepočítať záznam",
    
    // Názvy polí v knižnici Dochádzka
    fields: {
        zamestnanci: "Zamestnanci",
        datum: "Dátum", 
        prichod: "Príchod",
        odchod: "Odchod",
        pracovnaDoba: "Pracovná doba",
        pocetPracovnikov: "Počet pracovníkov",
        odpracovane: "Odpracované",
        mzdoveNaklady: "Mzdové náklady",
        info: "info",
        debugLog: "Debug_Log",
        errorLog: "Error_Log"
    },
    
    // Názvy knižníc
    libraries: {
        sadzbyZamestnancov: "sadzby zamestnancov"
    },
    
    // Názvy polí v knižnici "sadzby zamestnancov"
    sadzbyFields: {
        zamestnanec: "Zamestnanec",
        platnostOd: "Platnosť od", 
        sadzba: "Sadzba"
    },
    
    // Názvy atribútov pre zamestnancov
    attributes: {
        odpracovane: "odpracované",
        hodinovka: "hodinovka",
        priplatok: "+príplatok",
        premia: "+prémia (€)",
        pokuta: "-pokuta (€)",
        dennaMzda: "denná mzda"
    }
};

// Globálne premenné pre logging
var debugMessages = [];
var errorMessages = [];

// ==============================================
// ZÁKLADNÉ UTILITY FUNKCIE
// ==============================================

function getCurrentTimeString() {
    // Fallback pre moment() ak nie je dostupný
    try {
        return moment().format("DD.MM.YY HH:mm");
    } catch (momentError) {
        var now = new Date();
        return now.getDate() + "." + (now.getMonth() + 1) + "." + 
               now.getFullYear().toString().slice(-2) + " " +
               ("0" + now.getHours()).slice(-2) + ":" + 
               ("0" + now.getMinutes()).slice(-2);
    }
}

function addDebug(message) {
    if (CONFIG.debug) {
        var timestamp = getCurrentTimeString();
        debugMessages.push("[" + timestamp + "] 📋 " + message);
    }
}

function addError(message, location) {
    var timestamp = getCurrentTimeString();
    var errorText = "[" + timestamp + "] ❌ " + message;
    if (location) {
        errorText += " (Loc: " + location + ")";
    }
    errorMessages.push(errorText);
}

function saveLogsToEntry() {
    try {
        // Vymaž staré logy
        entry().set(CONFIG.fields.debugLog, "");
        entry().set(CONFIG.fields.errorLog, "");
        
        // Ulož nové logy
        if (debugMessages.length > 0) {
            entry().set(CONFIG.fields.debugLog, debugMessages.join("\n"));
        }
        
        if (errorMessages.length > 0) {
            entry().set(CONFIG.fields.errorLog, errorMessages.join("\n"));
        }
        
        addDebug("Logy uložené: Debug=" + debugMessages.length + ", Error=" + errorMessages.length);
        
    } catch (logError) {
        // Fallback - aspoň message() ak zlyhá logovanie
        message("Chyba pri logovaní: " + logError.toString());
    }
}

// ==============================================
// ZAOKRÚHĽOVANIE A ČASY
// ==============================================

function roundToQuarter(timeInMs) {
    // Zaokrúhli čas na najbližších 15 minút
    var quarterHour = 15 * 60 * 1000; // 15 minút v ms
    return Math.round(timeInMs / quarterHour) * quarterHour;
}

function formatTimeForDisplay(timeInMs) {
    var date = new Date(timeInMs);
    return ("0" + date.getHours()).slice(-2) + ":" + 
           ("0" + date.getMinutes()).slice(-2);
}

function calculateWorkHours(prichodMs, odchodMs) {
    // Ak je odchod menší ako príchod, práca pokračuje cez polnoc
    if (odchodMs < prichodMs) {
        odchodMs += 24 * 60 * 60 * 1000; // Pridaj 24 hodín
        addDebug("⏰ Detekovaná práca cez polnoc");
    }
    
    var rozdielMs = odchodMs - prichodMs;
    var hodiny = rozdielMs / (1000 * 60 * 60);
    
    return Math.round(hodiny * 100) / 100; // Zaokrúhli na 2 desatinné miesta
}

// ==============================================
// VALIDÁCIA VSTUPNÝCH DÁTOIOD
// ==============================================

function validateInputData() {
    addDebug("🔍 Validácia vstupných dát...");
    
    try {
        var datum = entry().field(CONFIG.fields.datum);
        var prichod = entry().field(CONFIG.fields.prichod);
        var odchod = entry().field(CONFIG.fields.odchod);
        var zamestnanci = entry().field(CONFIG.fields.zamestnanci);
        
        if (!datum) {
            addError("Chýba dátum", "validateInputData");
            return false;
        }
        
        if (!prichod || !odchod) {
            addError("Chybajú časy príchodu alebo odchodu", "validateInputData");
            return false;
        }
        
        if (!zamestnanci || zamestnanci.length === 0) {
            addError("Nie sú vybratí žiadni zamestnanci", "validateInputData");
            return false;
        }
        
        addDebug("✅ Validácia úspešná: Dátum OK, Časy OK, Zamestnanci: " + zamestnanci.length);
        return true;
        
    } catch (error) {
        addError("Chyba pri validácii: " + error.toString(), "validateInputData");
        return false;
    }
}

// ==============================================
// SPRACOVANIE ČASOV
// ==============================================

function processTimeRounding() {
    addDebug("⏰ Spracúvam zaokrúhľovanie časov na 15 minút...");
    
    try {
        var prichodRaw = entry().field(CONFIG.fields.prichod);
        var odchodRaw = entry().field(CONFIG.fields.odchod);
        
        // Zaokrúhli na 15 minút
        var prichodRounded = roundToQuarter(prichodRaw);
        var odchodRounded = roundToQuarter(odchodRaw);
        
        addDebug("Pôvodné časy - Príchod: " + formatTimeForDisplay(prichodRaw) + 
                 ", Odchod: " + formatTimeForDisplay(odchodRaw));
        addDebug("Zaokrúhlené časy - Príchod: " + formatTimeForDisplay(prichodRounded) + 
                 ", Odchod: " + formatTimeForDisplay(odchodRounded));
        
        // Ulož zaokrúhlené časy
        entry().set(CONFIG.fields.prichod, prichodRounded);
        entry().set(CONFIG.fields.odchod, odchodRounded);
        
        addDebug("✅ Zaokrúhlené časy uložené");
        return { prichod: prichodRounded, odchod: odchodRounded };
        
    } catch (error) {
        addError("Chyba pri zaokrúhľovaní časov: " + error.toString(), "processTimeRounding");
        return null;
    }
}

// ==============================================
// VÝPOČET PRACOVNEJ DOBY
// ==============================================

function calculateWorkingTime(roundedTimes) {
    addDebug("🧮 Počítam pracovnú dobu...");
    
    try {
        var pracovnaDobaHodiny = calculateWorkHours(roundedTimes.prichod, roundedTimes.odchod);
        
        if (pracovnaDobaHodiny <= 0 || pracovnaDobaHodiny > 24) {
            addError("Neplatná pracovná doba: " + pracovnaDobaHodiny + " hodín", "calculateWorkingTime");
            return null;
        }
        
        addDebug("Pracovná doba vypočítaná: " + pracovnaDobaHodiny + " hodín");
        
        // Ulož pracovnú dobu
        entry().set(CONFIG.fields.pracovnaDoba, pracovnaDobaHodiny);
        addDebug("✅ Pracovná doba uložená");
        
        return pracovnaDobaHodiny;
        
    } catch (error) {
        addError("Chyba pri výpočte pracovnej doby: " + error.toString(), "calculateWorkingTime");
        return null;
    }
}

// ==============================================
// HĽADANIE SADZIEB PRE ZAMESTNANCOV
// ==============================================

function findValidSalaryForEmployee(zamestnanecObject, datum) {
    addDebug("💰 Hľadám platnú sadzbu pre zamestnanca...");
    
    try {
        var sadzby = zamestnanecObject.linksFrom(CONFIG.libraries.sadzbyZamestnancov, CONFIG.sadzbyFields.zamestnanec);
        
        if (!sadzby || sadzby.length === 0) {
            addDebug("⚠️ Žiadne sadzby nenájdené");
            return 0;
        }
        
        var najnovsiaHodinovka = 0;
        var najnovsiDatum = null;
        
        for (var i = 0; i < sadzby.length; i++) {
            var sadzbaEntry = sadzby[i];
            var platnostOd = sadzbaEntry.field(CONFIG.sadzbyFields.platnostOd);
            var hodinovka = sadzbaEntry.field(CONFIG.sadzbyFields.sadzba);
            
            // Kontrola platnosti k dátumu
            if (platnostOd && hodinovka && platnostOd <= datum) {
                if (!najnovsiDatum || platnostOd > najnovsiDatum) {
                    najnovsiDatum = platnostOd;
                    najnovsiaHodinovka = hodinovka;
                }
            }
        }
        
        addDebug("💰 Platná sadzba: " + najnovsiaHodinovka + " €/h");
        return najnovsiaHodinovka;
        
    } catch (error) {
        addError("Chyba pri hľadaní sadzby: " + error.toString(), "findValidSalaryForEmployee");
        return 0;
    }
}

// ==============================================
// SPRACOVANIE ZAMESTNANCOV S ATRIBÚTMI
// ==============================================

function processEmployeesWithAttributes(zamestnanci, datum, pracovnaDobaHodiny) {
    addDebug("👥 Spracúvam " + zamestnanci.length + " zamestnancov...");
    
    var uspesneSpracovani = 0;
    var chyby = 0;
    var celkoveMzdy = 0;
    
    for (var i = 0; i < zamestnanci.length; i++) {
        var zamestnanec = zamestnanci[i];
        
        try {
            addDebug("👤 Spracúvam zamestnanca " + (i + 1) + "/" + zamestnanci.length);
            
            // 1. Nastav odpracované hodiny (= pracovná doba pre každého)
            var odpracovaneHodiny = pracovnaDobaHodiny;
            entry().setAttr(CONFIG.fields.zamestnanci, CONFIG.attributes.odpracovane, odpracovaneHodiny);
            addDebug("  📊 Odpracované: " + odpracovaneHodiny + " h");
            
            // 2. Zisti hodinovú sadzbu
            var hodinovka = findValidSalaryForEmployee(zamestnanec, datum);
            entry().setAttr(CONFIG.fields.zamestnanci, CONFIG.attributes.hodinovka, hodinovka);
            addDebug("  💰 Hodinovka: " + hodinovka + " €/h");
            
            // 3. Získaj príplatky a odmeny (ak existujú)
            var priplatok = 0;
            var premia = 0;
            var pokuta = 0;
            
            try {
                priplatok = entry().getAttr(CONFIG.fields.zamestnanci, CONFIG.attributes.priplatok) || 0;
                premia = entry().getAttr(CONFIG.fields.zamestnanci, CONFIG.attributes.premia) || 0;
                pokuta = entry().getAttr(CONFIG.fields.zamestnanci, CONFIG.attributes.pokuta) || 0;
            } catch (attrError) {
                addDebug("  ℹ️ Používam defaultné hodnoty pre príplatky");
            }
            
            addDebug("  📈 Príplatok: " + priplatok + " €/h, Prémia: " + premia + " €, Pokuta: " + pokuta + " €");
            
            // 4. Vypočítaj dennú mzdu
            // Vzorec: (odpracované × hodinovka) + (odpracované × príplatok) + prémia - pokuta
            var dennaMzda = (odpracovaneHodiny * hodinovka) + 
                           (odpracovaneHodiny * priplatok) + 
                           premia - pokuta;
            
            dennaMzda = Math.round(dennaMzda * 100) / 100; // Zaokrúhli na 2 desatinné
            
            entry().setAttr(CONFIG.fields.zamestnanci, CONFIG.attributes.dennaMzda, dennaMzda);
            addDebug("  💰 Denná mzda: " + dennaMzda + " €");
            
            celkoveMzdy += dennaMzda;
            uspesneSpracovani++;
            
        } catch (employeeError) {
            addError("Chyba pri spracovaní zamestnanca " + (i + 1) + ": " + employeeError.toString(), "processEmployees");
            chyby++;
        }
    }
    
    addDebug("✅ Spracovanie dokončené - Úspešne: " + uspesneSpracovani + "/" + zamestnanci.length);
    
    return {
        success: uspesneSpracovani > 0,
        uspesneSpracovani: uspesneSpracovani,
        chyby: chyby,
        celkoveMzdy: Math.round(celkoveMzdy * 100) / 100
    };
}

// ==============================================
// VÝPOČET CELKOVÝCH HODNÔT
// ==============================================

function calculateTotalFields(zamestnanci, pracovnaDobaHodiny, mzdoveNaklady) {
    addDebug("📊 Počítam celkové hodnoty...");
    
    try {
        var pocetPracovnikov = zamestnanci.length;
        var odpracovaneTotal = Math.round((pocetPracovnikov * pracovnaDobaHodiny) * 100) / 100;
        
        entry().set(CONFIG.fields.pocetPracovnikov, pocetPracovnikov);
        entry().set(CONFIG.fields.odpracovane, odpracovaneTotal);
        entry().set(CONFIG.fields.mzdoveNaklady, mzdoveNaklady);
        
        addDebug("✅ Uložené - Pracovníci: " + pocetPracovnikov + 
                 ", Odpracované: " + odpracovaneTotal + " h, Mzdy: " + mzdoveNaklady + " €");
        
        return true;
        
    } catch (error) {
        addError("Chyba pri výpočte celkových hodnôt: " + error.toString(), "calculateTotalFields");
        return false;
    }
}

// ==============================================
// VYTVORENIE INFO ZÁZNAMU
// ==============================================

function createInfoRecord(employeeResult, pracovnaDobaHodiny) {
    addDebug("📝 Vytváram info záznam...");
    
    try {
        var timestamp = getCurrentTimeString();
        
        var infoMessage = "📊 AUTOMATICKÝ PREPOČET DOCHÁDZKY\n" +
                         "════════════════════════════════════\n" +
                         "🕐 Vytvorené: " + timestamp + "\n" +
                         "🤖 Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n\n" +
                         
                         "⚙️ VYKONANÉ PREPOČTY:\n" +
                         "• Zaokrúhlenie príchod/odchod na 15 min\n" +
                         "• Výpočet pracovnej doby: " + pracovnaDobaHodiny + " h\n" +
                         "• Spracovanie " + employeeResult.uspesneSpracovani + " zamestnancov\n" +
                         "• Nastavenie atribútov zamestnancov\n\n" +
                         
                         "💰 FINANČNÉ VÝSLEDKY:\n" +
                         "• Celkové mzdové náklady: " + employeeResult.celkoveMzdy + " €\n" +
                         "• Vzorec: (hodiny × sadzba) + príplatky + prémie - pokuty\n\n" +
                         
                         "📊 ŠTATISTIKY:\n" +
                         "• Úspešne spracovaní: " + employeeResult.uspesneSpracovani + " zamestnancov\n";
        
        if (employeeResult.chyby > 0) {
            infoMessage += "• ⚠️ Chyby: " + employeeResult.chyby + " (pozri Error_Log)\n";
        }
        
        infoMessage += "\n📋 Detaily v Debug_Log | ❗ Chyby v Error_Log";
        
        entry().set(CONFIG.fields.info, infoMessage);
        addDebug("✅ Info záznam vytvorený");
        
        return true;
        
    } catch (error) {
        addError("Chyba pri vytváraní info záznamu: " + error.toString(), "createInfoRecord");
        return false;
    }
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function hlavnaFunkcia() {
    // Reset logov
    debugMessages = [];
    errorMessages = [];
    
    addDebug("🚀 === SPUSTENIE DOCHÁDZKA PREPOČTU v" + CONFIG.version + " ===");
    
    var globalSuccess = false;
    
    try {
        // KROK 1: Validácia vstupných dát
        if (!validateInputData()) {
            addError("Validácia zlyhala", "hlavnaFunkcia");
            return false;
        }
        
        // KROK 2: Zaokrúhľovanie časov
        var roundedTimes = processTimeRounding();
        if (!roundedTimes) {
            addError("Zaokrúhľovanie časov zlyhalo", "hlavnaFunkcia");
            return false;
        }
        
        // KROK 3: Výpočet pracovnej doby
        var pracovnaDobaHodiny = calculateWorkingTime(roundedTimes);
        if (!pracovnaDobaHodiny) {
            addError("Výpočet pracovnej doby zlyhal", "hlavnaFunkcia");
            return false;
        }
        
        // KROK 4: Spracovanie zamestnancov s atribútmi
        var zamestnanci = entry().field(CONFIG.fields.zamestnanci);
        var datum = entry().field(CONFIG.fields.datum);
        
        var employeeResult = processEmployeesWithAttributes(zamestnanci, datum, pracovnaDobaHodiny);
        if (!employeeResult || !employeeResult.success) {
            addError("Spracovanie zamestnancov zlyhalo", "hlavnaFunkcia");
            return false;
        }
        
        // KROK 5: Výpočet celkových hodnôt
        if (!calculateTotalFields(zamestnanci, pracovnaDobaHodiny, employeeResult.celkoveMzdy)) {
            addError("Výpočet celkových hodnôt zlyhal", "hlavnaFunkcia");
            return false;
        }
        
        // KROK 6: Vytvorenie info záznamu
        if (!createInfoRecord(employeeResult, pracovnaDobaHodiny)) {
            addError("Vytvorenie info záznamu zlyhalo", "hlavnaFunkcia");
            return false;
        }
        
        addDebug("🎉 VŠETKY KROKY ÚSPEŠNE DOKONČENÉ!");
        globalSuccess = true;
        
    } catch (error) {
        addError("Kritická chyba v hlavnej funkcii: " + error.toString(), "hlavnaFunkcia");
        globalSuccess = false;
    }
    
    // Uloženie logov a user message
    saveLogsToEntry();
    
    if (globalSuccess) {
        var pracovnaDoba = entry().field(CONFIG.fields.pracovnaDoba);
        var zamestnanci = entry().field(CONFIG.fields.zamestnanci);
        var mzdoveNaklady = entry().field(CONFIG.fields.mzdoveNaklady);
        
        message("✅ Dochádzka prepočítaná úspešne!\n\n" +
               "📊 Pracovná doba: " + pracovnaDoba + " h\n" +
               "👥 Zamestnanci: " + zamestnanci.length + " osôb\n" +
               "💰 Mzdové náklady: " + mzdoveNaklady + " €\n\n" +
               "ℹ️ Detaily v poli 'info'");
    } else {
        message("❌ Prepočet dochádzky zlyhal!\n\n" +
               "🔍 Skontroluj Error_Log pre detailné chyby\n" +
               "📋 Overte vstupné dáta a skúste znovu");
    }
    
    return globalSuccess;
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

try {
    addDebug("🎬 Inicializácia scriptu...");
    hlavnaFunkcia();
} catch (kritickachyba) {
    // Posledná záchrana pre error handling
    try {
        addError("KRITICKÁ CHYBA SCRIPTU: " + kritickachyba.toString(), "main");
        saveLogsToEntry();
    } catch (logError) {
        // Ak ani logovanie nefunguje, aspoň message
        message("💥 KRITICKÁ CHYBA!\n\nScript sa nepodarilo spustiť. Chyba: " + kritickachyba.toString());
    }
}