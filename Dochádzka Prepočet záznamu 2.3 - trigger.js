// ==============================================
// MEMENTO DATABASE - DOCHÁDZKA PREPOČÍTAŤ ZÁZNAM
// Verzia: 2.3 | Dátum: 11.08.2025 | Autor: JavaScript Expert  
// Knižnica: Dochádzka | Trigger: Before Save
// ==============================================
// ✅ OPRAVENÉ v2.3: SPRÁVNA ATRIBÚTY API
//    - attr() namiesto getAttr() - getAttr neexistuje v Memento
//    - Správna syntax: entry().field("pole")[index].attr("atribút")
//    - setAttr() s indexom: entry().field("pole")[index].setAttr("atribút", hodnota)
//    - Kombinované API: currentEntry pre základné polia, entry() pre atribúty
//    - Presná dokumentácia syntax podľa Memento API
// ==============================================

var CONFIG = {
    debug: true,
    version: "2.3",
    
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
    
    // Názvy atribútov pre zamestnancov (presné z TODO)
    attributes: {
        odpracovane: "odpracované",
        hodinovka: "hodinovka", 
        priplatok: "+príplatok (€/h)",
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
    
    var globalSuccess = false;
    
    try {
        // KROK 1: Získanie vstupných dát
        addDebug("📋 KROK 1: Získavam vstupné dáta...");
        
        var datum = currentEntry.field(CONFIG.fields.datum);
        var prichodRaw = currentEntry.field(CONFIG.fields.prichod);
        var odchodRaw = currentEntry.field(CONFIG.fields.odchod);
        var zamestnanci = currentEntry.field(CONFIG.fields.zamestnanci);
        
        // Validácia
        if (!datum || !prichodRaw || !odchodRaw || !zamestnanci || zamestnanci.length === 0) {
            addError("Chýbajú povinné údaje", "validacia");
            return false;
        }
        
        addDebug("✅ Vstupné dáta OK - Dátum: " + moment(datum).format("DD.MM.YYYY") + 
                 ", Zamestnanci: " + zamestnanci.length);
        
        // KROK 2: Zaokrúhľovanie časov na 15 minút
        addDebug("⏰ KROK 2: Zaokrúhľujem časy na 15 minút...");
        
        var prichodRounded = roundToQuarter(prichodRaw);
        var odchodRounded = roundToQuarter(odchodRaw);
        
        addDebug("Pôvodne: " + formatTime(prichodRaw) + " - " + formatTime(odchodRaw));
        addDebug("Zaokrúhlené: " + formatTime(prichodRounded) + " - " + formatTime(odchodRounded));
        
        // Ulož zaokrúhlené časy
        currentEntry.set(CONFIG.fields.prichod, prichodRounded);
        currentEntry.set(CONFIG.fields.odchod, odchodRounded);
        
        // KROK 3: Výpočet pracovnej doby
        addDebug("🧮 KROK 3: Počítam pracovnú dobu...");
        
        var pracovnaDobaHodiny = calculateHours(prichodRounded, odchodRounded);
        
        if (pracovnaDobaHodiny <= 0 || pracovnaDobaHodiny > 24) {
            addError("Neplatná pracovná doba: " + pracovnaDobaHodiny + " h", "pracovnaDoba");
            return false;
        }
        
        addDebug("Pracovná doba: " + pracovnaDobaHodiny + " h");
        currentEntry.set(CONFIG.fields.pracovnaDoba, pracovnaDobaHodiny);
        
        // KROK 4: Počet pracovníkov a odpracované hodiny
        addDebug("📊 KROK 4: Počítam celkové hodnoty...");
        
        var pocetPracovnikov = zamestnanci.length;
        var odpracovaneTotal = Math.round((pocetPracovnikov * pracovnaDobaHodiny) * 100) / 100;
        
        currentEntry.set(CONFIG.fields.pocetPracovnikov, pocetPracovnikov);
        currentEntry.set(CONFIG.fields.odpracovane, odpracovaneTotal);
        
        addDebug("Počet pracovníkov: " + pocetPracovnikov);
        addDebug("Odpracované celkom: " + odpracovaneTotal + " h");
        
        // KROK 5: Spracovanie zamestnancov a atribúty
        addDebug("👥 KROK 5: Spracúvam zamestnancov s atribútmi...");
        
        var celkoveMzdy = 0;
        var uspesneSpracovani = 0;
        
        for (var i = 0; i < zamestnanci.length; i++) {
            var zamestnanec = zamestnanci[i];
            
            try {
                addDebug("👤 Spracúvam zamestnanca " + (i + 1) + "/" + zamestnanci.length);
                
                // 1. Nastav odpracované hodiny (= pracovná doba)
                entry().field(CONFIG.fields.zamestnanci)[i].setAttr(CONFIG.attributes.odpracovane, pracovnaDobaHodiny);
                addDebug("  Odpracované: " + pracovnaDobaHodiny + " h");
                
                // 2. Nájdi hodinovú sadzbu 
                var hodinovka = findValidSalary(zamestnanec, datum);
                entry().field(CONFIG.fields.zamestnanci)[i].setAttr(CONFIG.attributes.hodinovka, hodinovka);
                addDebug("  Hodinovka: " + hodinovka + " €/h");
                
                // 3. Získaj príplatky a odmeny (defaultne 0)
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
                
                // 4. Vypočítaj dennú mzdu podľa vzorca z TODO
                // "denná mzda" = ("odpracované" * "hodinovka") + ("odpracované" * "+príplatok") + "+prémia (€)" - "-pokuta (€)"
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
        
        // KROK 6: Mzdové náklady
        addDebug("💰 KROK 6: Finalizujem mzdové náklady...");
        
        celkoveMzdy = Math.round(celkoveMzdy * 100) / 100;
        currentEntry.set(CONFIG.fields.mzdoveNaklady, celkoveMzdy);
        
        addDebug("Celkové mzdové náklady: " + celkoveMzdy + " €");
        addDebug("Úspešne spracovaných: " + uspesneSpracovani + "/" + zamestnanci.length);
        
        // KROK 7: Info pole
        addDebug("📝 KROK 7: Vytváram info záznam...");
        
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
        
        addDebug("🎉 PREPOČET DOKONČENÝ ÚSPEŠNE!");
        globalSuccess = true;
        
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
// SPUSTENIE SCRIPTU
// ==============================================

try {
    addDebug("🎬 Inicializácia Dochádzka script v" + CONFIG.version + " - OPRAVENÉ atribúty API");
    hlavnaFunkcia();
} catch (spusteniaChyba) {
    // Posledná záchrana pre critical errors
    try {
        addError("CHYBA SPUSTENIA: " + spusteniaChyba.toString(), "startup");
        saveLogs();
        message("💥 KRITICKÁ CHYBA SPUSTENIA!\n\nPozri Error_Log pre detaily.");
    } catch (finalError) {
        message("💥 KRITICKÁ CHYBA!\nScript sa nepodarilo spustiť:\n" + spusteniaChyba.toString());
    }
}