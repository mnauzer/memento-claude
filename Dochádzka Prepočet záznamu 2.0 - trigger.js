// ==============================================
// MEMENTO DATABASE - DOCHÁDZKA PREPOČÍTAŤ ZÁZNAM
// Verzia: 2.0 | Dátum: 11.08.2025 | Autor: JavaScript Expert
// Knižnica: Dochádzka | Trigger: Before Save
// ==============================================
// ✅ NOVÉ v2.0: KOMPLETNÝ REFAKTORING
//    - PRIDANÉ: Zaokrúhľovanie príchod/odchod na 15min
//    - PRIDANÉ: Atribúty zamestnancov (odpracované, hodinovka, denná mzda)
//    - PRIDANÉ: LinksFrom pre hodinové sadzby k dátumu
//    - PRIDANÉ: Vzorec dennej mzdy s príplatkami a pokutami
//    - PRIDANÉ: Info pole s detailným popisom prepočtu
//    - OPRAVENÉ: Success flag workflow namiesto return statements
//    - VYLEPŠENÉ: Null-safe prístupy a robustný error handling
//    - ZAOKRÚHLENÉ: Všetky časy a sumy na správne desatinné miesta
// ==============================================

var CONFIG = {
    // Základné nastavenia
    debug: true,
    version: "2.0",
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
        sadzbyZamestnancov: "sadzby zamestnancov",
        zamestnanci: "Zamestnanci"
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
        priplatok: "+príplatok (€/h)",
        premia: "+prémia (€)",
        pokuta: "-pokuta (€)",
        dennaMzda: "denná mzda",
        poznamka: "poznámka"
    },
    
    // Emoji pre debug
    icons: {
        start: "🚀",
        step: "📋", 
        calc: "🧮",
        employee: "👤",
        money: "💰",
        time: "⏰",
        success: "✅",
        error: "❌",
        warning: "⚠️"
    }
};

// Globálne premenné pre logging
var debugMessages = [];
var errorMessages = [];

// ==============================================
// DEBUG A ERROR HANDLING SYSTÉM
// ==============================================

function addDebug(message, category) {
    if (CONFIG.debug) {
        var timestamp = moment().format("DD.MM.YY HH:mm");
        var icon = CONFIG.icons.step;
        
        switch (category) {
            case "start": icon = CONFIG.icons.start; break;
            case "calc": icon = CONFIG.icons.calc; break;
            case "employee": icon = CONFIG.icons.employee; break;
            case "money": icon = CONFIG.icons.money; break;
            case "time": icon = CONFIG.icons.time; break;
            case "success": icon = CONFIG.icons.success; break;
            case "warning": icon = CONFIG.icons.warning; break;
        }
        
        debugMessages.push("[" + timestamp + "] " + icon + " " + message);
    }
}

function addError(message, location) {
    var timestamp = moment().format("DD.MM.YY HH:mm");
    var errorText = "[" + timestamp + "] " + CONFIG.icons.error + " " + message;
    if (location) {
        errorText += " (Location: " + location + ")";
    }
    errorMessages.push(errorText);
}

function saveLogsToEntry() {
    try {
        // Vynuluj staré logy
        currentEntry.set(CONFIG.fields.debugLog, "");
        currentEntry.set(CONFIG.fields.errorLog, "");
        
        // Ulož nové logy
        if (debugMessages.length > 0) {
            currentEntry.set(CONFIG.fields.debugLog, debugMessages.join("\n"));
        }
        
        if (errorMessages.length > 0) {
            currentEntry.set(CONFIG.fields.errorLog, errorMessages.join("\n"));
        }
    } catch (logError) {
        // Fallback ak zlyhá logovanie
    }
}

// ==============================================
// UTILITY FUNKCIE
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
        addDebug("Detekovaná práca cez polnoc", "time");
    }
    
    var rozdielMs = odchodMs - prichodMs;
    var hodiny = rozdielMs / (1000 * 60 * 60);
    
    return Math.round(hodiny * 100) / 100; // Zaokrúhli na 2 desatinné miesta
}

function roundToTwoDecimals(number) {
    return Math.round(number * 100) / 100;
}

// ==============================================
// HLAVNÉ BUSINESS LOGIC FUNKCIE
// ==============================================

function validateInputData() {
    addDebug("Validácia vstupných dát...", "step");
    
    var datum = currentEntry.field(CONFIG.fields.datum);
    var prichod = currentEntry.field(CONFIG.fields.prichod);
    var odchod = currentEntry.field(CONFIG.fields.odchod);
    var zamestnanci = currentEntry.field(CONFIG.fields.zamestnanci);
    
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
    
    addDebug("Validácia úspešná - Datum: " + moment(datum).format("DD.MM.YYYY") + 
             ", Zamestnanci: " + zamestnanci.length, "success");
    
    return true;
}

function processTimeRounding() {
    addDebug("Spracúvam zaokrúhľovanie časov na 15 minút...", "time");
    
    var prichodRaw = currentEntry.field(CONFIG.fields.prichod);
    var odchodRaw = currentEntry.field(CONFIG.fields.odchod);
    
    // Zaokrúhli na 15 minút
    var prichodRounded = roundToQuarter(prichodRaw);
    var odchodRounded = roundToQuarter(odchodRaw);
    
    addDebug("Pôvodné časy - Príchod: " + formatTimeForDisplay(prichodRaw) + 
             ", Odchod: " + formatTimeForDisplay(odchodRaw), "time");
    addDebug("Zaokrúhlené časy - Príchod: " + formatTimeForDisplay(prichodRounded) + 
             ", Odchod: " + formatTimeForDisplay(odchodRounded), "time");
    
    try {
        currentEntry.set(CONFIG.fields.prichod, prichodRounded);
        currentEntry.set(CONFIG.fields.odchod, odchodRounded);
        addDebug("Zaokrúhlené časy uložené úspešne", "success");
        return { prichod: prichodRounded, odchod: odchodRounded };
    } catch (error) {
        addError("Nepodarilo sa uložiť zaokrúhlené časy: " + error.toString(), "processTimeRounding");
        return null;
    }
}

function calculateWorkingTime(roundedTimes) {
    addDebug("Počítam pracovnú dobu...", "calc");
    
    var pracovnaDobaHodiny = calculateWorkHours(roundedTimes.prichod, roundedTimes.odchod);
    
    if (pracovnaDobaHodiny <= 0 || pracovnaDobaHodiny > 24) {
        addError("Neplatná pracovná doba: " + pracovnaDobaHodiny + " hodín", "calculateWorkingTime");
        return null;
    }
    
    addDebug("Pracovná doba vypočítaná: " + pracovnaDobaHodiny + " hodín", "calc");
    
    try {
        currentEntry.set(CONFIG.fields.pracovnaDoba, pracovnaDobaHodiny);
        addDebug("Pracovná doba uložená", "success");
        return pracovnaDobaHodiny;
    } catch (error) {
        addError("Nepodarilo sa uložiť pracovnú dobu: " + error.toString(), "calculateWorkingTime");
        return null;
    }
}

function findValidSalaryForEmployee(zamestnanecObject, datum) {
    addDebug("Hľadám platnú sadzbu pre zamestnanca k dátumu " + moment(datum).format("DD.MM.YYYY"), "employee");
    
    try {
        var sadzby = zamestnanecObject.linksFrom(CONFIG.libraries.sadzbyZamestnancov, CONFIG.sadzbyFields.zamestnanec);
        
        if (!sadzby || sadzby.length === 0) {
            addError("Žiadne sadzby nenájdené pre zamestnanca", "findValidSalaryForEmployee");
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
        
        addDebug("Platná sadzba: " + najnovsiaHodinovka + " €/h od " + 
                (najnovsiDatum ? moment(najnovsiDatum).format("DD.MM.YYYY") : "?"), "money");
        
        return najnovsiaHodinovka;
    } catch (error) {
        addError("Chyba pri hľadaní sadzby: " + error.toString(), "findValidSalaryForEmployee");
        return 0;
    }
}

function processEmployeesWithAttributes(zamestnanci, datum, pracovnaDobaHodiny) {
    addDebug("Spracúvam zamestnancov s atribútmi...", "employee");
    
    var uspesneSpracovani = 0;
    var chyby = 0;
    var celkoveMzdy = 0;
    
    for (var i = 0; i < zamestnanci.length; i++) {
        var zamestnanec = zamestnanci[i];
        
        try {
            // Získaj meno zamestnanca pre debug
            var zamestnanecMeno = "";
            try {
                zamestnanecMeno = zamestnanec.field("Nick") || zamestnanec.field("Meno") || "Neznámy";
            } catch (nameError) {
                zamestnanecMeno = "ID:" + (zamestnanec.field("ID") || "?");
            }
            
            addDebug("Spracúvam zamestnanca: " + zamestnanecMeno, "employee");
            
            // 1. Nastav odpracované hodiny (= pracovná doba pre každého)
            var odpracovaneHodiny = pracovnaDobaHodiny;
            currentEntry.setAttr(CONFIG.fields.zamestnanci + "[" + i + "]", CONFIG.attributes.odpracovane, odpracovaneHodiny);
            addDebug("  Odpracované: " + odpracovaneHodiny + " h", "calc");
            
            // 2. Zisti hodinovú sadzbu
            var hodinovka = findValidSalaryForEmployee(zamestnanec, datum);
            currentEntry.setAttr(CONFIG.fields.zamestnanci + "[" + i + "]", CONFIG.attributes.hodinovka, hodinovka);
            addDebug("  Hodinovka: " + hodinovka + " €/h", "money");
            
            // 3. Získaj príplatky a odmeny (ak existujú)
            var priplatok = 0;
            var premia = 0;
            var pokuta = 0;
            
            try {
                priplatok = currentEntry.getAttr(CONFIG.fields.zamestnanci + "[" + i + "]", CONFIG.attributes.priplatok) || 0;
                premia = currentEntry.getAttr(CONFIG.fields.zamestnanci + "[" + i + "]", CONFIG.attributes.premia) || 0;
                pokuta = currentEntry.getAttr(CONFIG.fields.zamestnanci + "[" + i + "]", CONFIG.attributes.pokuta) || 0;
            } catch (attrError) {
                addDebug("  Používam defaultné hodnoty pre príplatky", "warning");
            }
            
            addDebug("  Príplatok: " + priplatok + " €/h, Prémia: " + premia + " €, Pokuta: " + pokuta + " €", "money");
            
            // 4. Vypočítaj dennú mzdu
            // Vzorec: (odpracované × hodinovka) + (odpracované × príplatok) + prémia - pokuta
            var dennaMzda = (odpracovaneHodiny * hodinovka) + 
                           (odpracovaneHodiny * priplatok) + 
                           premia - pokuta;
            
            dennaMzda = roundToTwoDecimals(dennaMzda);
            
            currentEntry.setAttr(CONFIG.fields.zamestnanci + "[" + i + "]", CONFIG.attributes.dennaMzda, dennaMzda);
            addDebug("  Denná mzda: " + dennaMzda + " €", "money");
            
            celkoveMzdy += dennaMzda;
            uspesneSpracovani++;
            
        } catch (employeeError) {
            addError("Chyba pri spracovaní zamestnanca " + (i + 1) + ": " + employeeError.toString(), "processEmployeesWithAttributes");
            chyby++;
        }
    }
    
    addDebug("Spracovanie zamestnancov dokončené - Úspešne: " + uspesneSpracovani + 
             "/" + zamestnanci.length + ", Chyby: " + chyby, "success");
    
    return {
        success: uspesneSpracovani > 0,
        uspesneSpracovani: uspesneSpracovani,
        chyby: chyby,
        celkoveMzdy: roundToTwoDecimals(celkoveMzdy)
    };
}

function calculateTotalFields(zamestnanci, pracovnaDobaHodiny, mzdoveNaklady) {
    addDebug("Počítam celkové hodnoty...", "calc");
    
    var pocetPracovnikov = zamestnanci.length;
    var odpracovaneTotal = roundToTwoDecimals(pocetPracovnikov * pracovnaDobaHodiny);
    
    try {
        currentEntry.set(CONFIG.fields.pocetPracovnikov, pocetPracovnikov);
        currentEntry.set(CONFIG.fields.odpracovane, odpracovaneTotal);
        currentEntry.set(CONFIG.fields.mzdoveNaklady, mzdoveNaklady);
        
        addDebug("Uložené hodnoty:", "success");
        addDebug("  Počet pracovníkov: " + pocetPracovnikov, "calc");
        addDebug("  Odpracované celkom: " + odpracovaneTotal + " h", "calc");
        addDebug("  Mzdové náklady: " + mzdoveNaklady + " €", "money");
        
        return true;
    } catch (error) {
        addError("Nepodarilo sa uložiť celkové hodnoty: " + error.toString(), "calculateTotalFields");
        return false;
    }
}

function createInfoRecord(employeeResult, pracovnaDobaHodiny, datum) {
    addDebug("Vytváram info záznam...", "step");
    
    var timestamp = moment().format("DD.MM.YYYY HH:mm");
    var datumStr = moment(datum).format("DD.MM.YYYY");
    
    var infoMessage = "📊 AUTOMATICKÝ PREPOČET DOCHÁDZKY\n" +
                     "════════════════════════════════════\n" +
                     "🕐 Vytvorené: " + timestamp + "\n" +
                     "📅 Dátum dochádzky: " + datumStr + "\n" +
                     "🤖 Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n\n" +
                     
                     "⚙️ VYKONANÉ PREPOČTY:\n" +
                     "• Zaokrúhlenie príchod/odchod na 15 min\n" +
                     "• Výpočet pracovnej doby: " + pracovnaDobaHodiny + " h\n" +
                     "• Spracovanie " + employeeResult.uspesneSpracovani + " zamestnancov\n" +
                     "• Nastavenie atribútov: odpracované, hodinovka, denná mzda\n" +
                     "• LinksFrom prepojenie s knižnicou 'sadzby zamestnancov'\n\n" +
                     
                     "💰 FINANČNÉ VÝSLEDKY:\n" +
                     "• Celkové mzdové náklady: " + employeeResult.celkoveMzdy + " €\n" +
                     "• Vzorec dennej mzdy: (odpracované × hodinovka) + \n" +
                     "  + (odpracované × príplatok) + prémia - pokuta\n\n" +
                     
                     "📊 ŠTATISTIKY:\n" +
                     "• Úspešne spracovaní: " + employeeResult.uspesneSpracovani + "/" + 
                     (employeeResult.uspesneSpracovani + employeeResult.chyby) + " zamestnancov\n";
    
    if (employeeResult.chyby > 0) {
        infoMessage += "• ⚠️ Chyby: " + employeeResult.chyby + " (pozri Error_Log)\n";
    }
    
    infoMessage += "\n🔧 TECHNICKÉ DETAILY:\n" +
                   "• Použité knižnice: sadzby zamestnancov, Zamestnanci\n" +
                   "• API: setAttr() s 2 parametrami\n" +
                   "• Zaokrúhľovanie: časy na 15 min, sumy na 2 des. miesta\n" +
                   "• Null-safe prístup ku všetkým poliam\n\n" +
                   
                   "📋 Pre detailné informácie pozri Debug_Log\n" +
                   "❗ Pri problémoch pozri Error_Log";
    
    try {
        currentEntry.set(CONFIG.fields.info, infoMessage);
        addDebug("Info záznam vytvorený úspešne", "success");
        return true;
    } catch (error) {
        addError("Nepodarilo sa vytvoriť info záznam: " + error.toString(), "createInfoRecord");
        return false;
    }
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function hlavnaFunkcia() {
    addDebug("=== SPUSTENIE DOCHÁDZKA PREPOČTU v" + CONFIG.version + " ===", "start");
    addDebug("Timestamp: " + moment().format("DD.MM.YYYY HH:mm:ss"), "start");
    
    // Reset logov
    debugMessages = [];
    errorMessages = [];
    
    var globalSuccess = false;
    var step1Success = false;
    var step2Success = false;
    var step3Success = false;
    var step4Success = false;
    var step5Success = false;
    var step6Success = false;
    
    // KROK 1: Validácia vstupných dát
    if (validateInputData()) {
        step1Success = true;
        addDebug("KROK 1: Validácia úspešná", "success");
        
        // KROK 2: Zaokrúhľovanie časov
        var roundedTimes = processTimeRounding();
        if (roundedTimes) {
            step2Success = true;
            addDebug("KROK 2: Zaokrúhľovanie časov úspešné", "success");
            
            // KROK 3: Výpočet pracovnej doby
            var pracovnaDobaHodiny = calculateWorkingTime(roundedTimes);
            if (pracovnaDobaHodiny) {
                step3Success = true;
                addDebug("KROK 3: Výpočet pracovnej doby úspešný", "success");
                
                // KROK 4: Spracovanie zamestnancov s atribútmi
                var zamestnanci = currentEntry.field(CONFIG.fields.zamestnanci);
                var datum = currentEntry.field(CONFIG.fields.datum);
                
                var employeeResult = processEmployeesWithAttributes(zamestnanci, datum, pracovnaDobaHodiny);
                if (employeeResult && employeeResult.success) {
                    step4Success = true;
                    addDebug("KROK 4: Spracovanie zamestnancov úspešné", "success");
                    
                    // KROK 5: Výpočet celkových hodnôt
                    if (calculateTotalFields(zamestnanci, pracovnaDobaHodiny, employeeResult.celkoveMzdy)) {
                        step5Success = true;
                        addDebug("KROK 5: Výpočet celkových hodnôt úspešný", "success");
                        
                        // KROK 6: Vytvorenie info záznamu
                        if (createInfoRecord(employeeResult, pracovnaDobaHodiny, datum)) {
                            step6Success = true;
                            addDebug("KROK 6: Info záznam vytvorený", "success");
                            globalSuccess = true;
                        }
                    }
                }
            }
        }
    }
    
    // Finalizácia a uloženie logov
    addDebug("=== ZÁVEREČNÉ HODNOTENIE ===", "step");
    addDebug("Krok 1 (Validácia): " + (step1Success ? "✅" : "❌"), "step");
    addDebug("Krok 2 (Zaokrúhľovanie): " + (step2Success ? "✅" : "❌"), "step");
    addDebug("Krok 3 (Pracovná doba): " + (step3Success ? "✅" : "❌"), "step");
    addDebug("Krok 4 (Zamestnanci): " + (step4Success ? "✅" : "❌"), "step");
    addDebug("Krok 5 (Celkové hodnoty): " + (step5Success ? "✅" : "❌"), "step");
    addDebug("Krok 6 (Info záznam): " + (step6Success ? "✅" : "❌"), "step");
    
    if (globalSuccess) {
        addDebug("🎉 PREPOČET DOKONČENÝ ÚSPEŠNE!", "success");
    } else {
        addDebug("💥 PREPOČET ZLYHAL! Pozri Error_Log pre detaily.", "error");
    }
    
    saveLogsToEntry();
    
    // User message
    var sprava = "";
    if (globalSuccess) {
        var zamestnanci = currentEntry.field(CONFIG.fields.zamestnanci);
        var pracovnaDoba = currentEntry.field(CONFIG.fields.pracovnaDoba);
        var mzdoveNaklady = currentEntry.field(CONFIG.fields.mzdoveNaklady);
        
        sprava = "✅ Dochádzka prepočítaná úspešne!\n\n" +
                "⏰ Časy zaokrúhlené na 15 min\n" +
                "📊 Pracovná doba: " + pracovnaDoba + " h\n" +
                "👥 Zamestnanci: " + zamestnanci.length + " osôb\n" +
                "💰 Mzdové náklady: " + mzdoveNaklady + " €\n" +
                "🏷️ Atribúty: odpracované, hodinovka, denná mzda\n\n" +
                "ℹ️ Detaily v poli Info";
    } else {
        sprava = "❌ Prepočet dochádzky zlyhal!\n\n" +
                "🔍 Skontroluj Error_Log pre detailné chyby\n" +
                "📋 Overte vstupné dáta a skúste znovu";
    }
    
    message(sprava);
    
    return globalSuccess;
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

try {
    hlavnaFunkcia();
} catch (kritickachyba) {
    addError("KRITICKÁ CHYBA SCRIPTU: " + kritickachyba.toString(), "main");
    saveLogsToEntry();
    message("💥 KRITICKÁ CHYBA!\n\nScript sa nepodarilo spustiť.\nPozri Error_Log pre detaily.");
}