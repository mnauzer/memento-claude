// ==============================================
// MEMENTO DATABASE - DOCHÁDZKA PREPOČÍTAŤ ZÁZNAM
// Verzia: 3.1 | Dátum: 11.08.2025 | Autor: JavaScript Expert  
// Knižnica: Dochádzka | Trigger: Before Save
// ==============================================
// ✅ KOMPLETNE REFAKTOROVANÉ v3.1:
//    - Odstránené duplicitné definície premenných
//    - Opravené všetky try-catch syntax errors
//    - Správne názvy atribútov podľa knowledge base
//    - Pridané robustné null kontroly
//    - Optimalizované spracovanie zamestnancov
//    - Vylepšené debug a error logovanie
// ==============================================

var CONFIG = {
    debug: true,
    version: "3.1",
    
    // Názvy polí - Dochádzka
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
    
    // Názvy atribútov pre zamestnancov - OPRAVENÉ PODĽA KNOWLEDGE BASE
    attributes: {
        odpracovane: "odpracované",
        hodinovka: "hodinovka",
        priplatok: "príplatok (€/h)",
        premia: "prémia (€)",
        pokuta: "pokuta (€)",
        dennaMzda: "denná mzda"
    },
    
    // Názvy knižníc
    libraries: {
        sadzbyZamestnancov: "sadzby zamestnancov"
    },
    
    // Polia v knižnici sadzby zamestnancov
    sadzbyFields: {
        zamestnanec: "Zamestnanec",
        platnostOd: "Platnosť od",
        sadzba: "Sadzba"
    }
};

// Globálne premenné pre logy
var debugLog = [];
var errorLog = [];
var currentEntry = entry();

// ==============================================
// DEBUG A ERROR SYSTÉM
// ==============================================

function addDebug(message) {
    if (CONFIG.debug) {
        var timestamp = moment().format("DD.MM.YY HH:mm");
        debugLog.push("[" + timestamp + "] " + message);
    }
}

function addError(message, location) {
    var timestamp = moment().format("DD.MM.YY HH:mm");
    var errorText = "[" + timestamp + "] ❌ ERROR: " + message;
    if (location) {
        errorText += " (Loc: " + location + ")";
    }
    errorLog.push(errorText);
}

function saveLogs() {
    try {
        // Vymaž staré logy pred zápisom nových
        currentEntry.set(CONFIG.fields.debugLog, "");
        currentEntry.set(CONFIG.fields.errorLog, "");
        
        // Ulož nové logy
        if (debugLog.length > 0) {
            currentEntry.set(CONFIG.fields.debugLog, debugLog.join("\n"));
        }
        if (errorLog.length > 0) {
            currentEntry.set(CONFIG.fields.errorLog, errorLog.join("\n"));
        }
    } catch (saveError) {
        // Nemôžeme logovať chybu logovania
    }
}

// ==============================================
// UTILITY FUNKCIE
// ==============================================

function roundToQuarter(timeMs) {
    if (!timeMs || timeMs === null) {
        return null;
    }
    // Zaokrúhli na 15 minút
    var quarterMs = 15 * 60 * 1000;
    return Math.round(timeMs / quarterMs) * quarterMs;
}

function formatTime(timeMs) {
    if (!timeMs) return "NULL";
    var date = new Date(timeMs);
    return ("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2);
}

function calculateHours(prichodMs, odchodMs) {
    if (!prichodMs || !odchodMs) {
        return 0;
    }
    
    // Ak odchod < príchod, práca cez polnoc
    if (odchodMs < prichodMs) {
        odchodMs += 24 * 60 * 60 * 1000;
        addDebug("⏰ Detekovaná práca cez polnoc");
    }
    
    var rozdielMs = odchodMs - prichodMs;
    return Math.round((rozdielMs / (1000 * 60 * 60)) * 100) / 100;
}

// ==============================================
// HĽADANIE SADZIEB
// ==============================================

function findValidSalary(zamestnanecObject, datum) {
    if (!zamestnanecObject || !datum) {
        addError("Neplatné parametre pre hľadanie sadzby", "findValidSalary");
        return 0;
    }
    
    addDebug("🔍 Hľadám sadzbu pre zamestnanca k dátumu: " + moment(datum).format("DD.MM.YYYY"));
    
    try {
        var sadzby = zamestnanecObject.linksFrom(CONFIG.libraries.sadzbyZamestnancov, CONFIG.sadzbyFields.zamestnanec);
        
        if (!sadzby || sadzby.length === 0) {
            addDebug("⚠️ Žiadne sadzby nenájdené");
            return 0;
        }
        
        var platnaHodinovka = 0;
        var najnovsiDatum = null;
        
        for (var i = 0; i < sadzby.length; i++) {
            var sadzbaEntry = sadzby[i];
            var platnostOd = sadzbaEntry.field(CONFIG.sadzbyFields.platnostOd);
            var hodinovka = sadzbaEntry.field(CONFIG.sadzbyFields.sadzba);
            
            if (platnostOd && hodinovka && platnostOd <= datum) {
                if (!najnovsiDatum || platnostOd > najnovsiDatum) {
                    najnovsiDatum = platnostOd;
                    platnaHodinovka = hodinovka;
                }
            }
        }
        
        if (platnaHodinovka > 0) {
            addDebug("✅ Platná hodinovka: " + platnaHodinovka + " €/h");
        } else {
            addDebug("⚠️ Žiadna platná sadzba k dátumu");
        }
        
        return platnaHodinovka;
        
    } catch (error) {
        addError("Chyba pri hľadaní sadzby: " + error.toString(), "findValidSalary");
        return 0;
    }
}

// ==============================================
// SPRACOVANIE ZAMESTNANCOV
// ==============================================

function processEmployee(zamestnanec, index, pracovnaDobaHodiny, datum) {
    if (!zamestnanec) {
        addError("Neplatný zamestnanec na pozícii " + index, "processEmployee");
        return 0;
    }
    
    try {
        var nick = zamestnanec.field("Nick") || "Neznámy";
        addDebug("👤 Spracúvam zamestnanca " + (index + 1) + ": " + nick);
        
        // 1. Nájdi hodinovku
        var aktualnaHodinovka = findValidSalary(zamestnanec, datum);
        
        // 2. Nastav atribúty cez currentEntry.setAttr s indexom
        var atributSuccess = 0;
        
        // Odpracované hodiny
        try {
            currentEntry.setAttr(CONFIG.fields.zamestnanci, CONFIG.attributes.odpracovane, pracovnaDobaHodiny);
            addDebug("  ✅ Atribút 'odpracované': " + pracovnaDobaHodiny + " h");
            atributSuccess++;
        } catch (attrError) {
            addError("setAttr odpracované zlyhalo: " + attrError.toString(), "attr_odpracovane_" + index);
        }
        
        // Hodinovka
        try {
            currentEntry.setAttr(CONFIG.fields.zamestnanci, CONFIG.attributes.hodinovka, aktualnaHodinovka);
            addDebug("  ✅ Atribút 'hodinovka': " + aktualnaHodinovka + " €/h");
            atributSuccess++;
        } catch (attrError) {
            addError("setAttr hodinovka zlyhalo: " + attrError.toString(), "attr_hodinovka_" + index);
        }
        
        // Príplatok (default 0)
        try {
            var priplatok = currentEntry.attr(CONFIG.fields.zamestnanci, CONFIG.attributes.priplatok) || 0;
            currentEntry.setAttr(CONFIG.fields.zamestnanci, CONFIG.attributes.priplatok, priplatok);
            addDebug("  ✅ Atribút 'príplatok': " + priplatok + " €/h");
            atributSuccess++;
        } catch (attrError) {
            addError("setAttr príplatok zlyhalo: " + attrError.toString(), "attr_priplatok_" + index);
        }
        
        // Prémia (default 0)
        try {
            var premia = currentEntry.attr(CONFIG.fields.zamestnanci, CONFIG.attributes.premia) || 0;
            currentEntry.setAttr(CONFIG.fields.zamestnanci, CONFIG.attributes.premia, premia);
            addDebug("  ✅ Atribút 'prémia': " + premia + " €");
            atributSuccess++;
        } catch (attrError) {
            addError("setAttr prémia zlyhalo: " + attrError.toString(), "attr_premia_" + index);
        }
        
        // Pokuta (default 0)
        try {
            var pokuta = currentEntry.attr(CONFIG.fields.zamestnanci, CONFIG.attributes.pokuta) || 0;
            currentEntry.setAttr(CONFIG.fields.zamestnanci, CONFIG.attributes.pokuta, pokuta);
            addDebug("  ✅ Atribút 'pokuta': " + pokuta + " €");
            atributSuccess++;
        } catch (attrError) {
            addError("setAttr pokuta zlyhalo: " + attrError.toString(), "attr_pokuta_" + index);
        }
        
        // 3. Vypočítaj dennú mzdu
        var dennaMzda = (pracovnaDobaHodiny * aktualnaHodinovka) + 
                       (pracovnaDobaHodiny * priplatok) + 
                       premia - pokuta;
        dennaMzda = Math.round(dennaMzda * 100) / 100;
        
        try {
            currentEntry.setAttr(CONFIG.fields.zamestnanci, CONFIG.attributes.dennaMzda, dennaMzda);
            addDebug("  💰 Denná mzda: " + dennaMzda + " €");
            addDebug("     Vzorec: (" + pracovnaDobaHodiny + " × " + aktualnaHodinovka + ") + (" + 
                    pracovnaDobaHodiny + " × " + priplatok + ") + " + premia + " - " + pokuta);
            atributSuccess++;
        } catch (attrError) {
            addError("setAttr denná mzda zlyhalo: " + attrError.toString(), "attr_dennaMzda_" + index);
        }
        
        addDebug("  📊 Úspešne nastavených atribútov: " + atributSuccess + "/6");
        
        return dennaMzda;
        
    } catch (error) {
        addError("Kritická chyba pri spracovaní zamestnanca " + index + ": " + error.toString(), "processEmployee");
        return 0;
    }
}

// ==============================================
// HLAVNÁ FUNKCIA - KOMPLETNÝ WORKFLOW
// ==============================================

function hlavnaFunkcia() {
    addDebug("🚀 === ŠTART DOCHÁDZKA PREPOČTU v" + CONFIG.version + " ===");
    
    // Reset logov
    debugLog = [];
    errorLog = [];
    
    // Premenné pre celý workflow - DEFINOVANÉ LEN RAZ!
    var datum, prichodRaw, odchodRaw, zamestnanci;
    var prichodRounded, odchodRounded, pracovnaDobaHodiny;
    var pocetPracovnikov, odpracovaneTotal, celkoveMzdy;
    
    // Success flags - DEFINOVANÉ LEN RAZ!
    var step1Success = false;
    var step2Success = false;
    var step3Success = false;
    var step4Success = false;
    var step5Success = false;
    var step6Success = false;
    var step7Success = false;
    
    try {
        // KROK 1: Získanie vstupných dát
        addDebug("📋 KROK 1: Získavam vstupné dáta...");
        
        datum = currentEntry.field(CONFIG.fields.datum);
        prichodRaw = currentEntry.field(CONFIG.fields.prichod);
        odchodRaw = currentEntry.field(CONFIG.fields.odchod);
        zamestnanci = currentEntry.field(CONFIG.fields.zamestnanci);
        
        addDebug("  📅 Dátum: " + (datum ? moment(datum).format("DD.MM.YYYY") : "NULL"));
        addDebug("  🕐 Príchod: " + formatTime(prichodRaw));
        addDebug("  🕐 Odchod: " + formatTime(odchodRaw));
        addDebug("  👥 Zamestnanci: " + (zamestnanci ? zamestnanci.length : 0));
        
        // Validácia
        if (!datum || !prichodRaw || !odchodRaw || !zamestnanci || zamestnanci.length === 0) {
            addError("Chýbajú povinné údaje", "validacia");
            step1Success = false;
        } else {
            addDebug("✅ Vstupné dáta OK");
            step1Success = true;
        }
        
    } catch (inputError) {
        addError("Chyba pri načítaní vstupných dát: " + inputError.toString(), "input");
        step1Success = false;
    }
    
    // KROK 2: Zaokrúhľovanie časov
    if (step1Success) {
        try {
            addDebug("⏰ KROK 2: Zaokrúhľujem časy na 15 minút...");
            
            prichodRounded = roundToQuarter(prichodRaw);
            odchodRounded = roundToQuarter(odchodRaw);
            
            if (!prichodRounded || !odchodRounded) {
                addError("Zaokrúhľovanie časov zlyhalo", "rounding");
                step2Success = false;
            } else {
                addDebug("  Pôvodne: " + formatTime(prichodRaw) + " - " + formatTime(odchodRaw));
                addDebug("  Zaokrúhlené: " + formatTime(prichodRounded) + " - " + formatTime(odchodRounded));
                
                currentEntry.set(CONFIG.fields.prichod, prichodRounded);
                currentEntry.set(CONFIG.fields.odchod, odchodRounded);
                
                addDebug("✅ Časy zaokrúhlené a uložené");
                step2Success = true;
            }
        } catch (roundError) {
            addError("Chyba pri zaokrúhľovaní: " + roundError.toString(), "round");
            step2Success = false;
        }
    }
    
    // KROK 3: Výpočet pracovnej doby
    if (step2Success) {
        try {
            addDebug("🧮 KROK 3: Počítam pracovnú dobu...");
            
            pracovnaDobaHodiny = calculateHours(prichodRounded, odchodRounded);
            
            if (pracovnaDobaHodiny <= 0 || pracovnaDobaHodiny > 24) {
                addError("Neplatná pracovná doba: " + pracovnaDobaHodiny + " h", "workTime");
                step3Success = false;
            } else {
                addDebug("  Pracovná doba: " + pracovnaDobaHodiny + " hodín");
                currentEntry.set(CONFIG.fields.pracovnaDoba, pracovnaDobaHodiny);
                addDebug("✅ Pracovná doba vypočítaná");
                step3Success = true;
            }
        } catch (workError) {
            addError("Chyba pri výpočte pracovnej doby: " + workError.toString(), "workTime");
            step3Success = false;
        }
    }
    
    // KROK 4: Počet pracovníkov a celkové odpracované
    if (step3Success) {
        try {
            addDebug("📊 KROK 4: Počítam celkové hodnoty...");
            
            pocetPracovnikov = zamestnanci.length;
            odpracovaneTotal = Math.round((pocetPracovnikov * pracovnaDobaHodiny) * 100) / 100;
            
            currentEntry.set(CONFIG.fields.pocetPracovnikov, pocetPracovnikov);
            currentEntry.set(CONFIG.fields.odpracovane, odpracovaneTotal);
            
            addDebug("  Počet pracovníkov: " + pocetPracovnikov);
            addDebug("  Odpracované spolu: " + odpracovaneTotal + " hodín");
            addDebug("✅ Celkové hodnoty vypočítané");
            step4Success = true;
            
        } catch (totalError) {
            addError("Chyba pri výpočte celkových hodnôt: " + totalError.toString(), "totals");
            step4Success = false;
        }
    }
    
    // KROK 5: Spracovanie jednotlivých zamestnancov
    if (step4Success) {
        try {
            addDebug("👥 KROK 5: Spracúvam jednotlivých zamestnancov...");
            
            celkoveMzdy = 0;
            var uspesneSpracovani = 0;
            
            for (var i = 0; i < zamestnanci.length; i++) {
                var dennaMzda = processEmployee(zamestnanci[i], i, pracovnaDobaHodiny, datum);
                
                if (dennaMzda > 0) {
                    celkoveMzdy += dennaMzda;
                    uspesneSpracovani++;
                } else {
                    addDebug("⚠️ Zamestnanec " + (i + 1) + " spracovaný s nulovou mzdou");
                }
            }
            
            addDebug("📈 Súhrn spracovania:");
            addDebug("  Úspešne spracovaní: " + uspesneSpracovani + "/" + zamestnanci.length);
            addDebug("  Celkové mzdové náklady: " + celkoveMzdy + " €");
            
            if (uspesneSpracovani > 0) {
                step5Success = true;
            } else {
                addError("Žiadny zamestnanec nebol úspešne spracovaný", "employees");
                step5Success = false;
            }
            
        } catch (employeeError) {
            addError("Chyba pri spracovaní zamestnancov: " + employeeError.toString(), "employees");
            step5Success = false;
        }
    }
    
    // KROK 6: Uloženie mzdových nákladov
    if (step5Success) {
        try {
            addDebug("💰 KROK 6: Ukladám mzdové náklady...");
            
            currentEntry.set(CONFIG.fields.mzdoveNaklady, celkoveMzdy);
            addDebug("✅ Mzdové náklady uložené: " + celkoveMzdy + " €");
            step6Success = true;
            
        } catch (saveError) {
            addError("Chyba pri ukladaní mzdových nákladov: " + saveError.toString(), "saveCosts");
            step6Success = false;
        }
    }
    
    // KROK 7: Vytvorenie info záznamu
    if (step6Success) {
        try {
            addDebug("ℹ️ KROK 7: Vytváram info záznam...");
            
            var infoMessage = "📋 DOCHÁDZKA - AUTOMATICKÝ PREPOČET\n" +
                            "=====================================\n\n" +
                            "📅 Dátum: " + moment(datum).format("DD.MM.YYYY") + "\n" +
                            "⏰ Pracovný čas: " + formatTime(prichodRounded) + " - " + formatTime(odchodRounded) + "\n" +
                            "⏱️ Pracovná doba: " + pracovnaDobaHodiny + " hodín\n\n" +
                            "👥 ZAMESTNANCI:\n" +
                            "• Počet: " + pocetPracovnikov + " osôb\n" +
                            "• Odpracované spolu: " + odpracovaneTotal + " hodín\n\n" +
                            "💰 MZDOVÉ NÁKLADY:\n" +
                            "• Celkom: " + celkoveMzdy + " €\n" +
                            "• Priemer na osobu: " + (celkoveMzdy / pocetPracovnikov).toFixed(2) + " €\n\n" +
                            "🔧 TECHNICKÉ INFO:\n" +
                            "• Script verzia: " + CONFIG.version + "\n" +
                            "• Čas generovania: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n" +
                            "• Trigger: Before Save\n\n" +
                            "📝 Pre detaily pozri Debug_Log";
            
            currentEntry.set(CONFIG.fields.info, infoMessage);
            addDebug("✅ Info záznam vytvorený");
            step7Success = true;
            
        } catch (infoError) {
            addError("Chyba pri vytváraní info záznamu: " + infoError.toString(), "info");
            step7Success = false;
        }
    }
    
    // Finálne vyhodnotenie
    var globalSuccess = step1Success && step2Success && step3Success && 
                       step4Success && step5Success && step6Success && step7Success;
    
    if (globalSuccess) {
        addDebug("🎉 === PREPOČET DOKONČENÝ ÚSPEŠNE! ===");
    } else {
        addDebug("❌ === PREPOČET ZLYHAL ===");
        addDebug("Kroky: 1=" + step1Success + " 2=" + step2Success + " 3=" + step3Success + 
                " 4=" + step4Success + " 5=" + step5Success + " 6=" + step6Success + " 7=" + step7Success);
    }
    
    return globalSuccess;
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

try {
    addDebug("🎬 Inicializácia Dochádzka script v" + CONFIG.version);
    
    // Kontrola existencie currentEntry
    if (!currentEntry) {
        addError("KRITICKÁ CHYBA: currentEntry neexistuje", "startup");
        message("💥 KRITICKÁ CHYBA!\n\nScript nemôže bežať bez aktuálneho záznamu.");
    } else {
        // Spustenie hlavnej funkcie
        var result = hlavnaFunkcia();
        
        // Ulož logy
        saveLogs();
        
        // Informuj používateľa
        if (result) {
            message("✅ Dochádzka prepočítaná úspešne!\n\n" +
                   "⏰ Časy zaokrúhlené na 15 min\n" +
                   "📊 Pracovná doba: " + currentEntry.field(CONFIG.fields.pracovnaDoba) + " h\n" +
                   "👥 Zamestnanci: " + currentEntry.field(CONFIG.fields.pocetPracovnikov) + " osôb\n" +
                   "💰 Mzdové náklady: " + currentEntry.field(CONFIG.fields.mzdoveNaklady) + " €\n\n" +
                   "ℹ️ Detaily v poli 'info'");
        } else {
            message("❌ Prepočet dochádzky zlyhal!\n\n" +
                   "🔍 Skontroluj Error_Log pre detaily\n" +
                   "📋 Over vstupné dáta a skús znovu");
        }
    }
    
} catch (kritickachyba) {
    // Posledná záchrana
    try {
        addError("KRITICKÁ CHYBA: " + kritickachyba.toString(), "critical");
        saveLogs();
        message("💥 KRITICKÁ CHYBA!\n\nScript zlyhal. Pozri Error_Log.");
    } catch (finalError) {
        message("💥 FATÁLNA CHYBA!\n\n" + kritickachyba.toString());
    }
}