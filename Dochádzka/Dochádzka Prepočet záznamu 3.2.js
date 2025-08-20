// ==============================================
// MEMENTO DATABASE - DOCHÁDZKA PREPOČÍTAŤ ZÁZNAM
// Verzia: 3.2 | Dátum: 13.08.2025 | Autor: JavaScript Expert  
// Knižnica: Dochádzka | Trigger: Before Save
// ==============================================
// ✅ NOVÉ v3.2:
//    - Využitie MementoUtils 2.2 funkcií
//    - Odstránené duplicitné debug/error funkcie
//    - Využitie safe field access funkcií
//    - Elegantnejší a kratší kód
//    - Zachovaná plná funkcionalita
// ==============================================

// Import MementoUtils knižnice
var utils = MementoUtils;
var currentEntry = entry();

// Konfigurácia
var CONFIG = {
    debug: true,
    version: "3.2",
    scriptName: "Dochádzka Prepočet",
    
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
    
    // Názvy atribútov pre zamestnancov
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

// ==============================================
// UTILITY FUNKCIE (využívajúce MementoUtils)
// ==============================================

function formatTime(hours) {
    if (!hours && hours !== 0) return "00:00";
    
    var totalMinutes = Math.round(hours * 60);
    var h = Math.floor(totalMinutes / 60);
    var m = totalMinutes % 60;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
}

function roundToQuarterHour(hours) {
    if (!hours && hours !== 0) return 0;
    return Math.round(hours * 4) / 4;
}

function getEmployeeName(zamestnanec) {
    if (!zamestnanec) return "Neznámy";
    
    try {
        var nick = utils.safeFieldAccess(zamestnanec, "Nick", "");
        var priezvisko = utils.safeFieldAccess(zamestnanec, "Priezvisko", "");
        
        if (nick) {
            return priezvisko ? nick + " (" + priezvisko + ")" : nick;
        }
        return priezvisko || "Neznámy";
    } catch (e) {
        utils.addError(currentEntry, e, "getEmployeeName");
        return "Neznámy";
    }
}

// ==============================================
// HLAVNÉ FUNKCIE PREPOČTU
// ==============================================

function findValidSalary(zamestnanec, datum) {
    var menoZamestnanca = getEmployeeName(zamestnanec);
    
    utils.addDebug(currentEntry, "🔍 Hľadám platnú sadzbu pre " + menoZamestnanca);
    
    // Použitie MementoUtils funkcie pre linksFrom
    var sadzby = utils.safeLinksFrom(zamestnanec, CONFIG.libraries.sadzbyZamestnancov, CONFIG.sadzbyFields.zamestnanec);
    
    if (!sadzby || sadzby.length === 0) {
        utils.addError(currentEntry, "Zamestnanec " + menoZamestnanca + " nemá sadzby", "findValidSalary");
        return null;
    }
    
    utils.addDebug(currentEntry, "  ✅ Našiel " + sadzby.length + " sadzieb");
    
    var aktualnaHodinovka = null;
    var najnovsiDatum = null;
    
    utils.addDebug(currentEntry, "  📋 Analyzujem sadzby k dátumu " + moment(datum).format("DD.MM.YYYY") + ":");
    
    for (var j = 0; j < sadzby.length; j++) {
        var sadzbaEntry = sadzby[j];
        
        if (!sadzbaEntry) {
            utils.addDebug(currentEntry, "    ⚠️ Sadzba " + j + " je null");
            continue;
        }
        
        try {
            var platnostOd = utils.safeFieldAccess(sadzbaEntry, CONFIG.sadzbyFields.platnostOd, null);
            var hodinovka = utils.safeFieldAccess(sadzbaEntry, CONFIG.sadzbyFields.sadzba, null);
            
            utils.addDebug(currentEntry, "    📋 Sadzba " + j + ": " + hodinovka + " €/h od " + 
                    (platnostOd ? moment(platnostOd).format("DD.MM.YYYY") : "?"));
            
            if (platnostOd && hodinovka && platnostOd <= datum) {
                if (!najnovsiDatum || platnostOd > najnovsiDatum) {
                    najnovsiDatum = platnostOd;
                    aktualnaHodinovka = hodinovka;
                    utils.addDebug(currentEntry, "    ✅ Najnovšia platná sadzba: " + hodinovka + " €/h");
                }
            } else {
                utils.addDebug(currentEntry, "    ❌ Sadzba neplatná k dátumu");
            }
        } catch (sadzbaFieldError) {
            utils.addDebug(currentEntry, "    ⚠️ Chyba pri čítaní sadzby " + j + ": " + sadzbaFieldError.toString());
        }
    }
    
    if (!aktualnaHodinovka || aktualnaHodinovka <= 0) {
        utils.addError(currentEntry, "Nenašla sa platná sadzba pre " + menoZamestnanca + " k dátumu", "findValidSalary");
        return null;
    }
    
    utils.addDebug(currentEntry, "  💶 Finálna hodinovka: " + aktualnaHodinovka + " €/h");
    return aktualnaHodinovka;
}

// ==============================================
// HLAVNÁ FUNKCIA PREPOČTU
// ==============================================

function hlavnaFunkcia() {
    // Vyčisti logy na začiatku
    utils.clearLogs(currentEntry, false);
    
    utils.addDebug(currentEntry, "==================================================");
    utils.addDebug(currentEntry, "🚀 ZAČÍNAM PREPOČET DOCHÁDZKY v" + CONFIG.version);
    utils.addDebug(currentEntry, "📅 Čas spustenia: " + moment().format("DD.MM.YYYY HH:mm:ss"));
    utils.addDebug(currentEntry, "==================================================");
    
    var step1Success = false, step2Success = false, step3Success = false;
    var step4Success = false, step5Success = false, step6Success = false, step7Success = false;
    
    // KROK 1: NAČÍTANIE A VALIDÁCIA DÁT
    utils.addDebug(currentEntry, "\n📋 KROK 1: Načítanie vstupných dát");
    
    var zamestnanci = utils.safeFieldAccess(currentEntry, CONFIG.fields.zamestnanci, []);
    var datum = utils.safeFieldAccess(currentEntry, CONFIG.fields.datum, null);
    var prichod = utils.safeFieldAccess(currentEntry, CONFIG.fields.prichod, null);
    var odchod = utils.safeFieldAccess(currentEntry, CONFIG.fields.odchod, null);
    
    if (!zamestnanci || zamestnanci.length === 0) {
        utils.addError(currentEntry, "Žiadni zamestnanci nie sú vybraní", "validation");
        return false;
    }
    
    if (!datum) {
        utils.addError(currentEntry, "Dátum nie je vyplnený", "validation");
        return false;
    }
    
    utils.addDebug(currentEntry, "✅ Dáta načítané - " + zamestnanci.length + " zamestnancov");
    step1Success = true;
    
    // KROK 2: VÝPOČET ČASOV
    utils.addDebug(currentEntry, "\n📋 KROK 2: Výpočet pracovnej doby");
    
    var prichodRounded = 0;
    var odchodRounded = 0; 
    var pracovnaDobaHodiny = 0;
    
    if (prichod !== null && odchod !== null) {
        try {
            prichodRounded = roundToQuarterHour(prichod);
            odchodRounded = roundToQuarterHour(odchod);
            
            utils.safeSet(currentEntry, CONFIG.fields.prichod, prichodRounded);
            utils.safeSet(currentEntry, CONFIG.fields.odchod, odchodRounded);
            
            pracovnaDobaHodiny = odchodRounded - prichodRounded;
            
            if (pracovnaDobaHodiny < 0) {
                pracovnaDobaHodiny += 24;
                utils.addDebug(currentEntry, "⚠️ Práca cez polnoc detekovaná");
            }
            
            utils.safeSet(currentEntry, CONFIG.fields.pracovnaDoba, pracovnaDobaHodiny);
            
            utils.addDebug(currentEntry, "✅ Príchod: " + formatTime(prichodRounded));
            utils.addDebug(currentEntry, "✅ Odchod: " + formatTime(odchodRounded));
            utils.addDebug(currentEntry, "✅ Pracovná doba: " + pracovnaDobaHodiny + " hodín");
            step2Success = true;
            
        } catch (timeError) {
            utils.addError(currentEntry, timeError, "timeCalculation");
            step2Success = false;
        }
    } else {
        utils.addDebug(currentEntry, "⚠️ Časy príchodu/odchodu nie sú vyplnené");
        step2Success = true; // Nie je to kritická chyba
    }
    
    // KROK 3: SPRACOVANIE ZAMESTNANCOV
    utils.addDebug(currentEntry, "\n📋 KROK 3: Spracovanie " + zamestnanci.length + " zamestnancov");
    
    var pocetPracovnikov = zamestnanci.length;
    var odpracovaneTotal = 0;
    var celkoveMzdy = 0;
    
    utils.safeSet(currentEntry, CONFIG.fields.pocetPracovnikov, pocetPracovnikov);
    
    for (var i = 0; i < zamestnanci.length; i++) {
        var zamestnanec = zamestnanci[i];
        
        if (!zamestnanec) {
            utils.addDebug(currentEntry, "⚠️ Zamestnanec " + i + " je null - preskakujem");
            continue;
        }
        
        var menoZamestnanca = getEmployeeName(zamestnanec);
        utils.addDebug(currentEntry, "\n👤 [" + (i+1) + "/" + pocetPracovnikov + "] " + menoZamestnanca);
        
        // Nájdi platnú hodinovku
        var hodinovka = findValidSalary(zamestnanec, datum);
        
        if (!hodinovka || hodinovka <= 0) {
            utils.addDebug(currentEntry, "  ❌ Preskakujem - nemá platnú sadzbu");
            continue;
        }
        
        // Nastav atribúty zamestnanca
        try {
            utils.safeSetAttribute(currentEntry, CONFIG.fields.zamestnanci, zamestnanec, CONFIG.attributes.odpracovane, pracovnaDobaHodiny);
            utils.safeSetAttribute(currentEntry, CONFIG.fields.zamestnanci, zamestnanec, CONFIG.attributes.hodinovka, hodinovka);
            
            // Vypočítaj príplatky a pokuty
            var priplatok = utils.safeGetAttribute(currentEntry, CONFIG.fields.zamestnanci, zamestnanec, CONFIG.attributes.priplatok, 0) || 0;
            var premia = utils.safeGetAttribute(currentEntry, CONFIG.fields.zamestnanci, zamestnanec, CONFIG.attributes.premia, 0) || 0;
            var pokuta = utils.safeGetAttribute(currentEntry, CONFIG.fields.zamestnanci, zamestnanec, CONFIG.attributes.pokuta, 0) || 0;
            
            var dennaMzda = (pracovnaDobaHodiny * (hodinovka + priplatok)) + premia - pokuta;
            dennaMzda = Math.round(dennaMzda * 100) / 100;
            
            utils.safeSetAttribute(currentEntry, CONFIG.fields.zamestnanci, zamestnanec, CONFIG.attributes.dennaMzda, dennaMzda);
            
            odpracovaneTotal += pracovnaDobaHodiny;
            celkoveMzdy += dennaMzda;
            
            utils.addDebug(currentEntry, "  ✅ Hodinovka: " + hodinovka + " €/h");
            utils.addDebug(currentEntry, "  ✅ Denná mzda: " + dennaMzda + " €");
            
        } catch (attrError) {
            utils.addError(currentEntry, attrError, "attributes-" + menoZamestnanca);
        }
    }
    
    step3Success = true;
    
    // KROK 4: CELKOVÉ VÝPOČTY
    utils.addDebug(currentEntry, "\n📋 KROK 4: Celkové výpočty");
    
    try {
        utils.safeSet(currentEntry, CONFIG.fields.odpracovane, odpracovaneTotal);
        utils.safeSet(currentEntry, CONFIG.fields.mzdoveNaklady, celkoveMzdy);
        
        utils.addDebug(currentEntry, "✅ Odpracované spolu: " + odpracovaneTotal + " hodín");
        utils.addDebug(currentEntry, "✅ Mzdové náklady: " + celkoveMzdy + " €");
        step4Success = true;
        
    } catch (totalError) {
        utils.addError(currentEntry, totalError, "totals");
        step4Success = false;
    }
    
    // KROK 5: INFO ZÁZNAM
    utils.addDebug(currentEntry, "\n📋 KROK 5: Vytvorenie info záznamu");
    
    if (step1Success && step2Success && step3Success && step4Success) {
        try {
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
                            "• Priemer na osobu: " + (pocetPracovnikov > 0 ? (celkoveMzdy / pocetPracovnikov).toFixed(2) : "0") + " €\n\n" +
                            "🔧 TECHNICKÉ INFO:\n" +
                            "• Script verzia: " + CONFIG.version + "\n" +
                            "• MementoUtils: " + utils.version + "\n" +
                            "• Čas generovania: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n" +
                            "• Trigger: Before Save\n\n" +
                            "📝 Pre detaily pozri Debug_Log";
            
            utils.addInfo(currentEntry, "Dochádzka prepočítaná", {
                method: CONFIG.scriptName,
                sourceId: utils.safeFieldAccess(currentEntry, "ID", "N/A"),
                result: "Spracovaných " + pocetPracovnikov + " zamestnancov, mzdy: " + celkoveMzdy + " €",
                libraryName: "Dochádzka"
            });
            
            utils.safeSet(currentEntry, CONFIG.fields.info, infoMessage);
            utils.addDebug(currentEntry, "✅ Info záznam vytvorený");
            step5Success = true;
            
        } catch (infoError) {
            utils.addError(currentEntry, infoError, "info");
            step5Success = false;
        }
    }
    
    // Finálne vyhodnotenie
    var globalSuccess = step1Success && step2Success && step3Success && step4Success && step5Success;
    
    if (globalSuccess) {
        utils.addDebug(currentEntry, "\n🎉 === PREPOČET DOKONČENÝ ÚSPEŠNE! ===");
    } else {
        utils.addDebug(currentEntry, "\n❌ === PREPOČET ZLYHAL ===");
        utils.addDebug(currentEntry, "Kroky: 1=" + step1Success + " 2=" + step2Success + " 3=" + step3Success + 
                " 4=" + step4Success + " 5=" + step5Success);
    }
    
    // Ulož logy
    utils.saveLogs(currentEntry);
    
    return globalSuccess;
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

try {
    utils.addDebug(currentEntry, "🎬 Inicializácia " + CONFIG.scriptName + " v" + CONFIG.version);
    utils.addDebug(currentEntry, "📚 Používam MementoUtils v" + utils.version);
    
    // Kontrola existencie currentEntry
    if (!currentEntry) {
        utils.addError(currentEntry, "KRITICKÁ CHYBA: currentEntry neexistuje", "startup");
        message("💥 KRITICKÁ CHYBA!\n\nScript nemôže bežať bez aktuálneho záznamu.");
    } else {
        // Spustenie hlavnej funkcie
        var result = hlavnaFunkcia();
        
        // Informuj používateľa
        if (result) {
            var pocet = utils.safeFieldAccess(currentEntry, CONFIG.fields.pocetPracovnikov, 0);
            var mzdy = utils.safeFieldAccess(currentEntry, CONFIG.fields.mzdoveNaklady, 0);
            var hodiny = utils.safeFieldAccess(currentEntry, CONFIG.fields.pracovnaDoba, 0);
            
            message("✅ Dochádzka prepočítaná úspešne!\n\n" +
                   "⏰ Časy zaokrúhlené na 15 min\n" +
                   "📊 Pracovná doba: " + hodiny + " h\n" +
                   "👥 Zamestnanci: " + pocet + " osôb\n" +
                   "💰 Mzdové náklady: " + mzdy + " €\n\n" +
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
        utils.addError(currentEntry, kritickachyba, "critical");
        utils.saveLogs(currentEntry);
        message("💥 KRITICKÁ CHYBA!\n\nScript zlyhal. Pozri Error_Log.");
    } catch (finalError) {
        message("💥 FATÁLNA CHYBA!\n\n" + kritickachyba.toString());
    }
}