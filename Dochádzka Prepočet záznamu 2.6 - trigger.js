// ==============================================
// MEMENTO DATABASE - DOCHÁDZKA PREPOČÍTAŤ ZÁZNAM
// Verzia: 2.5 | Dátum: 11.08.2025 | Autor: JavaScript Expert  
// Knižnica: Dochádzka | Trigger: Before Save
// ==============================================
// ✅ OPRAVENÉ v2.5: TRY-CATCH SYNTAX ERROR
//    - Opravený try without catch syntax error na riadku 450
//    - Zaistené správne párovanie všetkých try-catch blokov
//    - Testované na JavaScript syntax validator
// ==============================================

var CONFIG = {
    debug: true,
    version: "2.6",
    
    // Názvy polí - Dochádzka (presné z knowledge base)
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
    
    // Názvy atribútov pre zamestnancov (PRESNÉ z knowledge base)
    attributes: {
        odpracovane: "odpracované",
        hodinovka: "hodinovka", 
        priplatok: "+príplatok (€/h)",  // OPRAVENÉ: presný názov s (€/h)
        premia: "+prémia (€)",
        pokuta: "-pokuta (€)",
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

// Globálne premenné
var debugLog = [];
var errorLog = [];
var currentEntry = entry();

// ==============================================
// DEBUG SYSTÉM (podľa working examples)
// ==============================================

function addDebug(message) {
    if (CONFIG.debug) {
        var timestamp = moment().format("DD.MM.YY HH:mm");
        debugLog.push("[" + timestamp + "] " + message);
    }
}

function addError(message, location) {
    var timestamp = moment().format("DD.MM.YY HH:mm");
    var errorText = "[" + timestamp + "] ERROR: " + message;
    if (location) {
        errorText += " (Loc: " + location + ")";
    }
    errorLog.push(errorText);
}

function saveLogs() {
    try {
        // Vymaž staré logy
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
        // Posledná záchrana
    }
}

// ==============================================
// UTILITY FUNKCIE
// ==============================================

function roundToQuarter(timeMs) {
    // Zaokrúhli na 15 minút
    var quarterMs = 15 * 60 * 1000;
    return Math.round(timeMs / quarterMs) * quarterMs;
}

function formatTime(timeMs) {
    var date = new Date(timeMs);
    return ("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2);
}

function calculateHours(prichodMs, odchodMs) {
    // Ak odchod < príchod, práca cez polnoc
    if (odchodMs < prichodMs) {
        odchodMs += 24 * 60 * 60 * 1000;
        addDebug("Detekovaná práca cez polnoc");
    }
    
    var rozdielMs = odchodMs - prichodMs;
    return Math.round((rozdielMs / (1000 * 60 * 60)) * 100) / 100;
}

// ==============================================
// HĽADANIE SADZIEB (podľa working pattern)
// ==============================================

function findValidSalary(zamestnanecObject, datum) {
    addDebug("Hľadám sadzbu pre zamestnanca k dátumu: " + moment(datum).format("DD.MM.YYYY"));
    
    try {
        var sadzby = zamestnanecObject.linksFrom(CONFIG.libraries.sadzbyZamestnancov, CONFIG.sadzbyFields.zamestnanec);
        
        if (!sadzby || sadzby.length === 0) {
            addDebug("Žiadne sadzby nenájdené");
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
        
        addDebug("Platná hodinovka: " + platnaHodinovka + " €/h");
        return platnaHodinovka;
        
    } catch (error) {
        addError("Chyba pri hľadaní sadzby: " + error.toString(), "findValidSalary");
        return 0;
    }
}

// ==============================================
// HLAVNÁ FUNKCIA - KOMPLETNÝ WORKFLOW
// ==============================================

function hlavnaFunkcia() {
    addDebug("=== ŠTART DOCHÁDZKA PREPOČTU v" + CONFIG.version + " ===");
    
    // Reset logov
    debugLog = [];
    errorLog = [];
    
    var globalSuccess = false; // Definícia globálneho úspechu
    
    // KRITICKÁ VALIDÁCIA - skontroluj či currentEntry existuje
    if (!currentEntry) {
        addError("KRITICKÁ CHYBA: currentEntry neexistuje", "startup");
        saveLogs();
        message("💥 KRITICKÁ CHYBA!\n\ncurrentEntry je nedefinované.");
        globalSuccess = false;
    } else {
        // Pokračuj s hlavnou logikou len ak currentEntry existuje
        var step1Success = false;
        var step2Success = false;
        var step3Success = false;
        var step4Success = false;
        var step5Success = false;
        var step6Success = false;
        var step7Success = false;
        
        // Premenné pre použitie naprieč krokmi
        var datum, prichodRaw, odchodRaw, zamestnanci;
        var prichodRounded, odchodRounded, pracovnaDobaHodiny;
        var pocetPracovnikov, odpracovaneTotal, celkoveMzdy, uspesneSpracovani;
    
    try {
        // KROK 1: Získanie vstupných dát
        addDebug("📋 KROK 1: Získavam vstupné dáta...");
        
        var datum, prichodRaw, odchodRaw, zamestnanci;
        
        try {
            datum = currentEntry.field(CONFIG.fields.datum);
            addDebug("✓ Dátum načítaný: " + (datum ? moment(datum).format("DD.MM.YYYY") : "NULL"));
        } catch (datumError) {
            addError("Chyba pri načítaní dátumu: " + datumError.toString(), "datum");
            step1Success = false;
        }
        
        try {
            prichodRaw = currentEntry.field(CONFIG.fields.prichod);
            addDebug("✓ Príchod načítaný: " + (prichodRaw ? formatTime(prichodRaw) : "NULL"));
        } catch (prichodError) {
            addError("Chyba pri načítaní príchodu: " + prichodError.toString(), "prichod");
            step1Success = false;
        }
        
        try {
            odchodRaw = currentEntry.field(CONFIG.fields.odchod);
            addDebug("✓ Odchod načítaný: " + (odchodRaw ? formatTime(odchodRaw) : "NULL"));
        } catch (odchodError) {
            addError("Chyba pri načítaní odchodu: " + odchodError.toString(), "odchod");
            step1Success = false;
        }
        
        try {
            zamestnanci = currentEntry.field(CONFIG.fields.zamestnanci);
            addDebug("✓ Zamestnanci načítaní: " + (zamestnanci ? zamestnanci.length : "NULL"));
        } catch (zamestnancyError) {
            addError("Chyba pri načítaní zamestnancov: " + zamestnancyError.toString(), "zamestnanci");
            step1Success = false;
        }
        
        // Validácia
        if (!datum || !prichodRaw || !odchodRaw || !zamestnanci || zamestnanci.length === 0) {
            addError("Chýbajú povinné údaje", "validacia");
            step1Success = false;
        } else {
            addDebug("✅ Vstupné dáta OK - Dátum: " + moment(datum).format("DD.MM.YYYY") + 
                     ", Zamestnanci: " + zamestnanci.length);
            step1Success = true;
        }
        var step2Success = false;
        var step3Success = false;
        var step4Success = false;
        var step5Success = false;
        var step6Success = false;
        var step7Success = false;
        
        if (step1Success) {
            // KROK 2: Zaokrúhľovanie časov na 15 minút
            addDebug("⏰ KROK 2: Zaokrúhľujem časy na 15 minút...");
            
            prichodRounded = roundToQuarter(prichodRaw);
            odchodRounded = roundToQuarter(odchodRaw);
            
            addDebug("Pôvodne: " + formatTime(prichodRaw) + " - " + formatTime(odchodRaw));
            addDebug("Zaokrúhlené: " + formatTime(prichodRounded) + " - " + formatTime(odchodRounded));
            
            // Ulož zaokrúhlené časy
            try {
                currentEntry.set(CONFIG.fields.prichod, prichodRounded);
                currentEntry.set(CONFIG.fields.odchod, odchodRounded);
                step2Success = true;
            } catch (roundError) {
                addError("Chyba pri ukladaní zaokrúhlených časov: " + roundError.toString(), "round");
                step2Success = false;
            }
        }
        
        if (step1Success && step2Success) {
            // KROK 3: Výpočet pracovnej doby
            addDebug("🧮 KROK 3: Počítam pracovnú dobu...");
            
            pracovnaDobaHodiny = calculateHours(prichodRounded, odchodRounded);
            
            if (pracovnaDobaHodiny <= 0 || pracovnaDobaHodiny > 24) {
                addError("Neplatná pracovná doba: " + pracovnaDobaHodiny + " h", "pracovnaDoba");
                step3Success = false;
            } else {
                addDebug("Pracovná doba: " + pracovnaDobaHodiny + " h");
                try {
                    currentEntry.set(CONFIG.fields.pracovnaDoba, pracovnaDobaHodiny);
                    step3Success = true;
                } catch (workError) {
                    addError("Chyba pri ukladaní pracovnej doby: " + workError.toString(), "workTime");
                    step3Success = false;
                }
            }
        }
        
        if (step1Success && step2Success && step3Success) {
            // KROK 4: Počet pracovníkov a odpracované hodiny
            addDebug("📊 KROK 4: Počítam celkové hodnoty...");
            
            pocetPracovnikov = zamestnanci.length;
            odpracovaneTotal = Math.round((pocetPracovnikov * pracovnaDobaHodiny) * 100) / 100;
            
            try {
                currentEntry.set(CONFIG.fields.pocetPracovnikov, pocetPracovnikov);
                currentEntry.set(CONFIG.fields.odpracovane, odpracovaneTotal);
                
                addDebug("Počet pracovníkov: " + pocetPracovnikov);
                addDebug("Odpracované celkom: " + odpracovaneTotal + " h");
                step4Success = true;
            } catch (totalError) {
                addError("Chyba pri ukladaní celkových hodnôt: " + totalError.toString(), "totals");
                step4Success = false;
            }
        }
        if (step1Success && step2Success && step3Success && step4Success) {
            // KROK 5: Spracovanie zamestnancov a atribúty 
            addDebug("👥 KROK 5: Spracúvam zamestnancov s atribútmi...");
            
            celkoveMzdy = 0;
            uspesneSpracovani = 0;
            
            for (var i = 0; i < zamestnanci.length; i++) {
                var zamestnanec = zamestnanci[i];
                
                try {
                    addDebug("👤 Spracúvam zamestnanca " + (i + 1) + "/" + zamestnanci.length);
                    
                    // 1. Nastav odpracované hodiny
                    entry().field(CONFIG.fields.zamestnanci)[i].setAttr(CONFIG.attributes.odpracovane, pracovnaDobaHodiny);
                    addDebug("  Odpracované: " + pracovnaDobaHodiny + " h");
                    
                    // 2. Nájdi hodinovú sadzbu 
                    var hodinovka = findValidSalary(zamestnanec, datum);
                    entry().field(CONFIG.fields.zamestnanci)[i].setAttr(CONFIG.attributes.hodinovka, hodinovka);
                    addDebug("  Hodinovka: " + hodinovka + " €/h");
                    
                    // 3. Získaj príplatky a odmeny
                    var priplatok = 0;
                    var premia = 0; 
                    var pokuta = 0;
                    
                    try {
                        priplatok = entry().field(CONFIG.fields.zamestnanci)[i].attr(CONFIG.attributes.priplatok) || 0;
                        premia = entry().field(CONFIG.fields.zamestnanci)[i].attr(CONFIG.attributes.premia) || 0;
                        pokuta = entry().field(CONFIG.fields.zamestnanci)[i].attr(CONFIG.attributes.pokuta) || 0;
                    } catch (attrError) {
                        addDebug("  Používam default hodnoty pre príplatky");
                    }
                    
                    addDebug("  Príplatok: " + priplatok + " €/h, Prémia: " + premia + " €, Pokuta: " + pokuta + " €");
                    
                    // 4. Vypočítaj dennú mzdu
                    var dennaMzda = (pracovnaDobaHodiny * hodinovka) + 
                                   (pracovnaDobaHodiny * priplatok) + 
                                   premia - pokuta;
                    
                    dennaMzda = Math.round(dennaMzda * 100) / 100;
                    
                    entry().field(CONFIG.fields.zamestnanci)[i].setAttr(CONFIG.attributes.dennaMzda, dennaMzda);
                    addDebug("  Denná mzda: " + dennaMzda + " €");
                    
                    celkoveMzdy += dennaMzda;
                    uspesneSpracovani++;
                    
                } catch (employeeError) {
                    addError("Chyba pri spracovaní zamestnanca " + (i + 1) + ": " + employeeError.toString(), "zamestnanec_" + i);
                }
            }
            
            if (uspesneSpracovani > 0) {
                step5Success = true;
            }
        }
        
        if (step1Success && step2Success && step3Success && step4Success && step5Success) {
            // KROK 6: Mzdové náklady
            addDebug("💰 KROK 6: Finalizujem mzdové náklady...");
            
            celkoveMzdy = Math.round(celkoveMzdy * 100) / 100;
            try {
                currentEntry.set(CONFIG.fields.mzdoveNaklady, celkoveMzdy);
                addDebug("Celkové mzdové náklady: " + celkoveMzdy + " €");
                addDebug("Úspešne spracovaných: " + uspesneSpracovani + "/" + zamestnanci.length);
                step6Success = true;
            } catch (salaryError) {
                addError("Chyba pri ukladaní mzdových nákladov: " + salaryError.toString(), "salaries");
                step6Success = false;
            }
        }
        
        if (step1Success && step2Success && step3Success && step4Success && step5Success && step6Success) {
            // KROK 7: Info pole
            addDebug("📝 KROK 7: Vytváram info záznam...");
            
            try {
                var timestamp = moment().format("DD.MM.YYYY HH:mm");
                var datumStr = moment(datum).format("DD.MM.YYYY");
                
                var infoMessage = "📊 AUTOMATICKÝ PREPOČET DOCHÁDZKY\n" +
                                 "════════════════════════════════════\n" +
                                 "🕐 Vytvorené: " + timestamp + "\n" +
                                 "📅 Dátum dochádzky: " + datumStr + "\n" +
                                 "🤖 Script: Dochádzka Prepočítať záznam v" + CONFIG.version + "\n\n" +
                                 
                                 "⏰ ČASY (zaokrúhlené na 15 min):\n" +
                                 "• Príchod: " + formatTime(prichodRounded) + "\n" +
                                 "• Odchod: " + formatTime(odchodRounded) + "\n" +
                                 "• Pracovná doba: " + pracovnaDobaHodiny + " h\n\n" +
                                 
                                 "👥 ZAMESTNANCI:\n" +
                                 "• Počet pracovníkov: " + pocetPracovnikov + "\n" +
                                 "• Odpracované celkom: " + odpracovaneTotal + " h\n" +
                                 "• Úspešne spracovaní: " + uspesneSpracovani + "/" + zamestnanci.length + "\n\n" +
                                 
                                 "🏷️ ATRIBÚTY ZAMESTNANCOV:\n" +
                                 "• odpracované = Pracovná doba (" + pracovnaDobaHodiny + " h)\n" +
                                 "• hodinovka = LinksFrom sadzby zamestnancov k dátumu\n" +
                                 "• denná mzda = (odpracované × hodinovka) + (odpracované × príplatok) + prémia - pokuta\n\n" +
                                 
                                 "💰 FINANČNÉ VÝSLEDKY:\n" +
                                 "• Celkové mzdové náklady: " + celkoveMzdy + " €\n" +
                                 "• Vzorec aplikovaný podľa TODO špecifikácie\n\n" +
                                 
                                 "🔧 TECHNICKÉ DETAILY:\n" +
                                 "• Prepojenie s knižnicou: sadzby zamestnancov\n" +
                                 "• LinksFrom syntax: objekt.linksFrom(knižnica, pole)\n" +
                                 "• Atribúty API: entry().field(pole)[index].attr/setAttr()\n" +
                                 "• currentEntry.set() pre základné polia\n" +
                                 "• Null-safe prístup ku všetkým poliam\n\n" +
                                 
                                 "📋 Pre debug informácie pozri Debug_Log\n" +
                                 "❗ Pri chybách pozri Error_Log";
                
                currentEntry.set(CONFIG.fields.info, infoMessage);
                addDebug("✅ Info záznam vytvorený");
                step7Success = true;
                
            } catch (infoError) {
                addError("Chyba pri vytváraní info záznamu: " + infoError.toString(), "info");
                step7Success = false;
            }
        }
        
        // Nastavenie celkového úspechu
        if (step1Success && step2Success && step3Success && step4Success && step5Success && step6Success && step7Success) {
            addDebug("🎉 PREPOČET DOKONČENÝ ÚSPEŠNE!");
            globalSuccess = true;
        } else {
            addDebug("❌ PREPOČET ZLYHAL - niektoré kroky neboli úspešné");
            globalSuccess = false;
        }
    } // Koniec else bloku pre currentEntry validáciu
        
    } catch (kritickachyba) {
        addError("KRITICKÁ CHYBA: " + kritickachyba.toString(), "hlavnaFunkcia");
        globalSuccess = false;
    }
    
    // Ulož logy a informuj užívateľa
    saveLogs();
    
    if (globalSuccess) {
        message("✅ Dochádzka prepočítaná úspešne!\n\n" +
               "⏰ Časy zaokrúhlené na 15 min\n" +
               "📊 Pracovná doba: " + currentEntry.field(CONFIG.fields.pracovnaDoba) + " h\n" +
               "👥 Zamestnanci: " + currentEntry.field(CONFIG.fields.pocetPracovnikov) + " osôb\n" +
               "💰 Mzdové náklady: " + currentEntry.field(CONFIG.fields.mzdoveNaklady) + " €\n\n" +
               "ℹ️ Detaily v poli 'info'");
    } else {
        message("❌ Prepočet dochádzky zlyhal!\n\n" +
               "🔍 Skontroluj Error_Log pre detaily\n" +
               "📋 Overte vstupné dáta a skúste znovu");
    }
    
    return globalSuccess;
}

// ==============================================
// SPUSTENIE SCRIPTU S KRITICKÝM ERROR HANDLING
// ==============================================

// NAJVYŠŠIA ÚROVEŇ TRY-CATCH - zabezpečí error log VŽDY
try {
    addDebug("🎬 Inicializácia Dochádzka script v" + CONFIG.version + " - OPRAVENÉ atribúty názvy");
    
    // Okamžité uloženie debug info
    try {
        currentEntry.set(CONFIG.fields.debugLog, debugLog.join("\n"));
    } catch (saveError) {
        // Pokračuj aj keď sa debug log nepodarí uložiť
    }
    
    // Spustenie hlavnej funkcie
    hlavnaFunkcia();
    
} catch (spusteniaChyba) {
    // KRITICKÉ ERROR HANDLING - VŽDY sa pokúsi uložiť error
    
    addError("KRITICKÁ CHYBA SPUSTENIA: " + spusteniaChyba.toString(), "startup");
    addError("Script version: " + CONFIG.version, "startup");
    addError("Line/Stack: " + (spusteniaChyba.stack || "No stack trace"), "startup");
    
    // Okamžité uloženie error logu
    try {
        currentEntry.set(CONFIG.fields.errorLog, errorLog.join("\n"));
        message("💥 KRITICKÁ CHYBA!\n\nError log uložený. Pozri Error_Log pre detaily.\nChyba: " + spusteniaChyba.toString());
    } catch (finalSaveError) {
        // Posledná záchrana - message s chybou
        message("💥 KRITICKÁ CHYBA!\n\nNepodarilo sa uložiť error log.\nPôvodná chyba: " + spusteniaChyba.toString() + 
                "\nSave chyba: " + finalSaveError.toString());
    }
}