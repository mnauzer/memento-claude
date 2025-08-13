// ==============================================
// MEMENTO DATABASE - ZÁZNAM PRÁC PREPOČET ZÁZNAMU
// Verzia: 1.1 | Dátum: 11.08.2025 | Autor: JavaScript Expert
// Knižnica: Záznam prác | Trigger: Before Save
// ==============================================
// ✅ KOMPLETNE REFAKTOROVANÉ v1.1:
//    - Štruktúra podľa vzoru Dochádzka Prepočet 3.1
//    - Správne názvy polí podľa Knowledge Base
//    - Zaokrúhľovanie časov Od/Do na 15 minút
//    - Správne použitie attr/setAttr (2 parametre)
//    - HZS spracovanie s auto-linkovaním defaults
//    - Výkaz prác linksFrom spracovanie
//    - Robustné null kontroly a error handling
//    - Pekne formátované info pole
// ==============================================

var CONFIG = {
    debug: true,
    version: "1.1",
    scriptName: "Záznam prác Prepočet",
    
    // Názvy polí - Záznam prác
    fields: {
        zamestnanci: "Zamestnanci",
        datum: "Dátum",
        od: "Od",
        do: "Do",
        zakazka: "Zákazka",
        pracovnaDoba: "Pracovná doba",
        pocetPracovnikov: "Počet pracovníkov",
        odpracovane: "Odpracované",
        mzdoveNaklady: "Mzdové náklady",
        hodinovaZuctovacia: "Hodinová zúčtovacia sadzba",
        sumaHZS: "Suma HZS",
        vykonanePrace: "Vykonané práce",
        info: "info",
        debugLog: "Debug_Log",
        errorLog: "Error_Log"
    },
    
    // Názvy atribútov pre zamestnancov
    attributes: {
        odpracovane: "odpracované",
        hodinovka: "hodinovka",
        mzdoveNaklady: "mzdové náklady"
    },
    
    // Názvy atribútov pre HZS
    hzsAttributes: {
        cena: "cena"
    },
    
    // Názvy atribútov pre Výkaz prác
    vykazAttributes: {
        vykonanePrace: "vykonané práce",
        pocetHodin: "počet hodín",
        uctoovanaSadzba: "účtovaná sadzba",
        cenaCelkom: "cena celkom"
    },
    
    // Názvy knižníc
    libraries: {
        sadzbyZamestnancov: "sadzby zamestnancov",
        cennikPrac: "Cenník prác",
        cenyPrac: "ceny prác",
        defaulty: "ASISTANTO Defaults",
        vykazPrac: "Výkaz prác",
        zakazky: "Zákazky"
    },
    
    // Polia v knižnici sadzby zamestnancov
    sadzbyFields: {
        zamestnanec: "Zamestnanec",
        platnostOd: "Platnosť od",
        sadzba: "Sadzba"
    },
    
    // Polia v knižnici ceny prác
    cenyFields: {
        praca: "Práca",
        platnostOd: "Platnosť od",
        cena: "Cena"
    },
    
    // Polia v knižnici ASISTANTO Defaults
    defaultsFields: {
        defaultHZS: "Default HZS"
    },
    
    // Polia v knižnici Výkaz prác
    vykazFields: {
        praceHZS: "Práce HZS"
    },
    
    // Emoji pre debug a info
    icons: {
        start: "🚀",
        step: "📋",
        success: "✅",
        error: "💥",
        warning: "⚠️",
        money: "💰",
        time: "⏱️",
        person: "👤",
        info: "ℹ️",
        work: "🔧",
        link: "🔗",
        calculate: "🧮"
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
    var errorText = "[" + timestamp + "] " + CONFIG.icons.error + " ERROR: " + message;
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

function calculateHours(odMs, doMs) {
    if (!odMs || !doMs) {
        return 0;
    }
    
    // Ak do < od, práca cez polnoc
    if (doMs < odMs) {
        doMs += 24 * 60 * 60 * 1000;
        addDebug(CONFIG.icons.time + " Detekovaná práca cez polnoc");
    }
    
    var rozdielMs = doMs - odMs;
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
            addDebug(CONFIG.icons.warning + " Žiadne sadzby nenájdené");
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
            addDebug(CONFIG.icons.success + " Platná hodinovka: " + platnaHodinovka + " €/h");
        } else {
            addDebug(CONFIG.icons.warning + " Žiadna platná sadzba k dátumu");
        }
        
        return platnaHodinovka;
        
    } catch (error) {
        addError("Chyba pri hľadaní sadzby: " + error.toString(), "findValidSalary");
        return 0;
    }
}

// ==============================================
// HZS SPRACOVANIE
// ==============================================

function getDefaultHZS() {
    try {
        addDebug(CONFIG.icons.link + " Hľadám default HZS v knižnici ASISTANTO Defaults");
        
        var defaultsLib = libByName(CONFIG.libraries.defaulty);
        if (!defaultsLib) {
            addError("Knižnica ASISTANTO Defaults nenájdená", "getDefaultHZS");
            return null;
        }
        
        var defaultsEntries = defaultsLib.entries();
        if (defaultsEntries && defaultsEntries.length > 0) {
            var defaultEntry = defaultsEntries[0];
            var defaultHZS = defaultEntry.field(CONFIG.defaultsFields.defaultHZS);
            
            if (defaultHZS && defaultHZS.length > 0) {
                addDebug(CONFIG.icons.success + " Default HZS nájdené");
                return defaultHZS;
            }
        }
        
        addDebug(CONFIG.icons.warning + " Default HZS nenájdené");
        return null;
        
    } catch (error) {
        addError("Chyba pri získavaní default HZS: " + error.toString(), "getDefaultHZS");
        return null;
    }
}

function getHZSPrice(hzsZaznam, datum) {
    if (!hzsZaznam || !datum) {
        return 0;
    }
    
    try {
        // Najprv skús nájsť cenu v linksFrom "ceny prác"
        var ceny = hzsZaznam.linksFrom(CONFIG.libraries.cenyPrac, CONFIG.cenyFields.praca);
        
        if (ceny && ceny.length > 0) {
            addDebug("  Našiel som " + ceny.length + " historických cien");
            
            var platnaCena = 0;
            var najnovsiDatum = null;
            
            for (var i = 0; i < ceny.length; i++) {
                var cenaEntry = ceny[i];
                var platnostOd = cenaEntry.field(CONFIG.cenyFields.platnostOd);
                var cena = cenaEntry.field(CONFIG.cenyFields.cena);
                
                if (platnostOd && cena && platnostOd <= datum) {
                    if (!najnovsiDatum || platnostOd > najnovsiDatum) {
                        najnovsiDatum = platnostOd;
                        platnaCena = cena;
                    }
                }
            }
            
            if (platnaCena > 0) {
                addDebug("  " + CONFIG.icons.success + " Platná historická cena: " + platnaCena + " €");
                return platnaCena;
            }
        }
        
        // Ak nenájde historickú cenu, použi priamu cenu z Cenníka prác
        var cenaBezDPH = hzsZaznam.field("Cena bez DPH");
        if (cenaBezDPH) {
            addDebug("  Používam priamu cenu z Cenníka prác: " + cenaBezDPH + " €");
            return cenaBezDPH;
        }
        
        addDebug("  " + CONFIG.icons.warning + " Žiadna cena nenájdená");
        return 0;
        
    } catch (error) {
        addError("Chyba pri získavaní HZS ceny: " + error.toString(), "getHZSPrice");
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
        var priezvisko = zamestnanec.field("Priezvisko") || "";
        addDebug(CONFIG.icons.person + " Spracúvam zamestnanca " + (index + 1) + ": " + nick + " (" + priezvisko + ")");
        
        // 1. Nájdi hodinovku
        var aktualnaHodinovka = findValidSalary(zamestnanec, datum);
        
        // 2. Nastav atribúty - SPRÁVNA SYNTAX (2 parametre)
        try {
            currentEntry.setAttr(CONFIG.fields.zamestnanci, index, CONFIG.attributes.odpracovane, pracovnaDobaHodiny);
            addDebug("  " + CONFIG.icons.success + " Odpracované nastavené: " + pracovnaDobaHodiny + "h");
        } catch (attrError) {
            addError("Nepodarilo sa nastaviť odpracované: " + attrError.toString(), "attr_odpracovane");
        }
        
        try {
            currentEntry.setAttr(CONFIG.fields.zamestnanci, index, CONFIG.attributes.hodinovka, aktualnaHodinovka);
            addDebug("  " + CONFIG.icons.success + " Hodinovka nastavená: " + aktualnaHodinovka + " €/h");
        } catch (attrError) {
            addError("Nepodarilo sa nastaviť hodinovku: " + attrError.toString(), "attr_hodinovka");
        }
        
        // 3. Vypočítaj mzdové náklady
        var mzdoveNaklady = pracovnaDobaHodiny * aktualnaHodinovka;
        
        try {
            currentEntry.setAttr(CONFIG.fields.zamestnanci, index, CONFIG.attributes.mzdoveNaklady, mzdoveNaklady);
            addDebug("  " + CONFIG.icons.money + " Mzdové náklady: " + mzdoveNaklady.toFixed(2) + " €");
        } catch (attrError) {
            addError("Nepodarilo sa nastaviť mzdové náklady: " + attrError.toString(), "attr_mzdove");
        }
        
        return mzdoveNaklady;
        
    } catch (error) {
        addError("Chyba pri spracovaní zamestnanca " + index + ": " + error.toString(), "processEmployee");
        return 0;
    }
}

// ==============================================
// SPRACOVANIE VÝKAZU PRÁC
// ==============================================

function processVykazPrac(zakazka, currentEntry, hzsCena, odpracovaneHodiny) {
    if (!zakazka) {
        addDebug(CONFIG.icons.warning + " Žiadna zákazka, preskakujem výkaz prác");
        return;
    }
    
    try {
        addDebug(CONFIG.icons.link + " KROK 8: Kontrolujem výkaz prác pre zákazku...");
        
        // Získaj výkazy prác linknuté na zákazku
        var vykazyPrac = zakazka.linksFrom(CONFIG.libraries.vykazPrac, "Zákazka");
        
        if (!vykazyPrac || vykazyPrac.length === 0) {
            addDebug("  Žiadny výkaz prác nenájdený pre túto zákazku");
            return;
        }
        
        addDebug("  Našiel som " + vykazyPrac.length + " výkaz(ov) prác");
        
        // Spracuj prvý výkaz (zvyčajne je len jeden na zákazku)
        var vykaz = vykazyPrac[0];
        
        // Pridaj link na aktuálny záznam prác
        var existujucePrace = vykaz.field(CONFIG.vykazFields.praceHZS) || [];
        existujucePrace.push(currentEntry);
        vykaz.set(CONFIG.vykazFields.praceHZS, existujucePrace);
        
        // Nastav atribúty linku
        var linkIndex = existujucePrace.length - 1;
        
        // Vykonané práce
        var vykonanePrace = currentEntry.field(CONFIG.fields.vykonanePrace) || "";
        vykaz.setAttr(CONFIG.vykazFields.praceHZS, linkIndex, CONFIG.vykazAttributes.vykonanePrace, vykonanePrace);
        
        // Počet hodín
        vykaz.setAttr(CONFIG.vykazFields.praceHZS, linkIndex, CONFIG.vykazAttributes.pocetHodin, odpracovaneHodiny);
        
        // Účtovaná sadzba
        vykaz.setAttr(CONFIG.vykazFields.praceHZS, linkIndex, CONFIG.vykazAttributes.uctoovanaSadzba, hzsCena);
        
        // Cena celkom
        var cenaCelkom = odpracovaneHodiny * hzsCena;
        vykaz.setAttr(CONFIG.vykazFields.praceHZS, linkIndex, CONFIG.vykazAttributes.cenaCelkom, cenaCelkom);
        
        addDebug("  " + CONFIG.icons.success + " Výkaz prác aktualizovaný:");
        addDebug("    • Vykonané práce: " + vykonanePrace.substring(0, 50) + "...");
        addDebug("    • Počet hodín: " + odpracovaneHodiny + "h");
        addDebug("    • Účtovaná sadzba: " + hzsCena + " €");
        addDebug("    • Cena celkom: " + cenaCelkom.toFixed(2) + " €");
        
    } catch (error) {
        addError("Chyba pri spracovaní výkazu prác: " + error.toString(), "processVykazPrac");
    }
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function hlavnaFunkcia() {
    addDebug(CONFIG.icons.start + " === ŠTART PREPOČTU ZÁZNAMU PRÁC ===");
    addDebug("Script verzia: " + CONFIG.version);
    
    // Premenné pre sledovanie úspešnosti krokov
    var step1Success = false;
    var step2Success = false;
    var step3Success = false;
    var step4Success = false;
    var step5Success = false;
    var step6Success = false;
    var step7Success = false;
    var step8Success = false;
    var step9Success = false;
    
    // Základné premenné
    var datum = null;
    var odRaw = null;
    var doRaw = null;
    var odRounded = null;
    var doRounded = null;
    var zamestnanci = null;
    var zakazka = null;
    var pracovnaDobaHodiny = 0;
    var pocetPracovnikov = 0;
    var odpracovaneTotal = 0;
    var celkoveMzdy = 0;
    var hzsPole = null;
    var hzsCena = 0;
    var sumaHZS = 0;
    
    // KROK 1: Načítanie a validácia vstupných dát
    try {
        addDebug(CONFIG.icons.step + " KROK 1: Načítavam vstupné dáta...");
        
        datum = currentEntry.field(CONFIG.fields.datum);
        odRaw = currentEntry.field(CONFIG.fields.od);
        doRaw = currentEntry.field(CONFIG.fields.do);
        zamestnanci = currentEntry.field(CONFIG.fields.zamestnanci);
        zakazka = currentEntry.field(CONFIG.fields.zakazka);
        
        addDebug("  📅 Dátum: " + (datum ? moment(datum).format("DD.MM.YYYY") : "NULL"));
        addDebug("  🕐 Od (raw): " + formatTime(odRaw));
        addDebug("  🕐 Do (raw): " + formatTime(doRaw));
        addDebug("  " + CONFIG.icons.person + " Zamestnanci: " + (zamestnanci ? zamestnanci.length : 0));
        addDebug("  📦 Zákazka: " + (zakazka ? "ÁNO" : "NIE"));
        
        // Validácia
        if (!datum || !odRaw || !doRaw || !zamestnanci || zamestnanci.length === 0) {
            addError("Chýbajú povinné údaje", "validacia");
            step1Success = false;
        } else {
            addDebug(CONFIG.icons.success + " Vstupné dáta OK");
            step1Success = true;
        }
        
    } catch (inputError) {
        addError("Chyba pri načítaní vstupných dát: " + inputError.toString(), "input");
        step1Success = false;
    }
    
    // KROK 2: Zaokrúhľovanie časov
    if (step1Success) {
        try {
            addDebug(CONFIG.icons.time + " KROK 2: Zaokrúhľujem časy na 15 minút...");
            
            odRounded = roundToQuarter(odRaw);
            doRounded = roundToQuarter(doRaw);
            
            if (!odRounded || !doRounded) {
                addError("Zaokrúhľovanie časov zlyhalo", "rounding");
                step2Success = false;
            } else {
                addDebug("  Pôvodne: " + formatTime(odRaw) + " - " + formatTime(doRaw));
                addDebug("  Zaokrúhlené: " + formatTime(odRounded) + " - " + formatTime(doRounded));
                
                currentEntry.set(CONFIG.fields.od, odRounded);
                currentEntry.set(CONFIG.fields.do, doRounded);
                
                addDebug(CONFIG.icons.success + " Časy zaokrúhlené a uložené");
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
            addDebug(CONFIG.icons.calculate + " KROK 3: Počítam pracovnú dobu...");
            
            pracovnaDobaHodiny = calculateHours(odRounded, doRounded);
            
            if (pracovnaDobaHodiny <= 0 || pracovnaDobaHodiny > 24) {
                addError("Neplatná pracovná doba: " + pracovnaDobaHodiny, "pracovna_doba");
                step3Success = false;
            } else {
                addDebug("  " + CONFIG.icons.time + " Pracovná doba: " + pracovnaDobaHodiny + " hodín");
                currentEntry.set(CONFIG.fields.pracovnaDoba, pracovnaDobaHodiny);
                addDebug("  💾 Pracovná doba uložená");
                step3Success = true;
            }
            
        } catch (calcError) {
            addError("Chyba pri výpočte pracovnej doby: " + calcError.toString(), "calc");
            step3Success = false;
        }
    }
    
    // KROK 4: Počet pracovníkov a odpracované
    if (step3Success) {
        try {
            addDebug(CONFIG.icons.step + " KROK 4: Počítam odpracované hodiny...");
            
            pocetPracovnikov = zamestnanci.length;
            odpracovaneTotal = pracovnaDobaHodiny * pocetPracovnikov;
            
            addDebug("  " + CONFIG.icons.person + " Počet pracovníkov: " + pocetPracovnikov);
            addDebug("  📊 Odpracované: " + pracovnaDobaHodiny + "h × " + pocetPracovnikov + " = " + odpracovaneTotal + "h");
            
            currentEntry.set(CONFIG.fields.pocetPracovnikov, pocetPracovnikov);
            currentEntry.set(CONFIG.fields.odpracovane, odpracovaneTotal);
            
            addDebug(CONFIG.icons.success + " Počty uložené");
            step4Success = true;
            
        } catch (countError) {
            addError("Chyba pri počítaní: " + countError.toString(), "count");
            step4Success = false;
        }
    }
    
    // KROK 5: Spracovanie zamestnancov a výpočet miezd
    if (step4Success) {
        try {
            addDebug(CONFIG.icons.money + " KROK 5: Spracúvam zamestnancov a počítam mzdy...");
            
            celkoveMzdy = 0;
            var spracovaniUspesni = 0;
            
            for (var i = 0; i < zamestnanci.length; i++) {
                var mzda = processEmployee(zamestnanci[i], i, pracovnaDobaHodiny, datum);
                celkoveMzdy += mzda;
                if (mzda > 0) {
                    spracovaniUspesni++;
                }
            }
            
            addDebug("📊 SÚHRN ZAMESTNANCOV:");
            addDebug("  • Spracovaní: " + spracovaniUspesni + "/" + zamestnanci.length);
            addDebug("  • Celkové mzdy: " + celkoveMzdy.toFixed(2) + " €");
            
            currentEntry.set(CONFIG.fields.mzdoveNaklady, celkoveMzdy);
            
            if (spracovaniUspesni > 0) {
                addDebug(CONFIG.icons.success + " Mzdy vypočítané");
                step5Success = true;
            } else {
                addError("Žiadny zamestnanec nebol úspešne spracovaný", "mzdy");
                step5Success = false;
            }
            
        } catch (mzdyError) {
            addError("Chyba pri výpočte miezd: " + mzdyError.toString(), "mzdy");
            step5Success = false;
        }
    }
    
    // KROK 6: HZS spracovanie s auto-linkovaním
    if (step5Success) {
        try {
            addDebug(CONFIG.icons.money + " KROK 6: Spracúvam HZS...");
            
            hzsPole = currentEntry.field(CONFIG.fields.hodinovaZuctovacia);
            
            // Ak nie je HZS vyplnené, skús auto-linkovať default
            if (!hzsPole || hzsPole.length === 0) {
                addDebug("  " + CONFIG.icons.warning + " HZS nie je vyplnené, hľadám default...");
                
                var defaultHZS = getDefaultHZS();
                if (defaultHZS) {
                    currentEntry.set(CONFIG.fields.hodinovaZuctovacia, defaultHZS);
                    addDebug("  " + CONFIG.icons.success + " Default HZS nastavené");
                    
                    // DÔLEŽITÉ: Znovu načítaj pole po linkovaní
                    hzsPole = currentEntry.field(CONFIG.fields.hodinovaZuctovacia);
                } else {
                    addDebug("  " + CONFIG.icons.warning + " Default HZS nenájdené, pokračujem bez HZS");
                }
            }
            
            // Ak máme HZS, spracuj ho
            if (hzsPole && hzsPole.length > 0) {
                var hzsZaznam = hzsPole[0];
                hzsCena = getHZSPrice(hzsZaznam, datum);
                
                if (hzsCena > 0) {
                    // Nastav atribút cena - SPRÁVNA SYNTAX (2 parametre)
                    try {
                        currentEntry.setAttr(CONFIG.fields.hodinovaZuctovacia, 0, CONFIG.hzsAttributes.cena, hzsCena);
                        addDebug("  " + CONFIG.icons.success + " Atribút cena nastavený: " + hzsCena + " €");
                    } catch (attrError) {
                        addError("Nepodarilo sa nastaviť atribút cena: " + attrError.toString(), "attr_cena");
                    }
                    
                    // Vypočítaj sumu HZS
                    sumaHZS = odpracovaneTotal * hzsCena;
                    currentEntry.set(CONFIG.fields.sumaHZS, sumaHZS);
                    
                    addDebug("  " + CONFIG.icons.calculate + " Suma HZS: " + odpracovaneTotal + "h × " + hzsCena + "€ = " + sumaHZS.toFixed(2) + " €");
                    step6Success = true;
                } else {
                    addDebug("  " + CONFIG.icons.warning + " Cena HZS je 0 alebo nenájdená");
                    step6Success = true; // Nie je to kritická chyba
                }
            } else {
                addDebug("  " + CONFIG.icons.info + " Žiadne HZS, preskakujem výpočet");
                step6Success = true; // Nie je to kritická chyba
            }
            
        } catch (hzsError) {
            addError("Chyba pri spracovaní HZS: " + hzsError.toString(), "hzs");
            step6Success = true; // Nie je to kritická chyba
        }
    }
    
    // KROK 7: Výkaz prác spracovanie
    if (step6Success && zakazka) {
        try {
            processVykazPrac(zakazka, currentEntry, hzsCena, odpracovaneTotal);
            step7Success = true;
        } catch (vykazError) {
            addError("Chyba pri spracovaní výkazu prác: " + vykazError.toString(), "vykaz");
            step7Success = true; // Nie je to kritická chyba
        }
    } else {
        step7Success = true; // Nie je zákazka, tak OK
    }
    
    // KROK 8: Vytvorenie info záznamu
    if (step1Success && step2Success && step3Success) {
        try {
            addDebug(CONFIG.icons.info + " KROK 9: Vytváram info záznam...");
            
            var infoMessage = CONFIG.icons.work + " ZÁZNAM PRÁC - AUTOMATICKÝ PREPOČET\n" +
                            "=====================================\n\n" +
                            "📅 Dátum: " + moment(datum).format("DD.MM.YYYY") + "\n" +
                            CONFIG.icons.time + " Pracovný čas: " + formatTime(odRounded) + " - " + formatTime(doRounded) + "\n" +
                            CONFIG.icons.time + " Pracovná doba: " + pracovnaDobaHodiny + " hodín\n";
            
            if (zakazka && zakazka.length > 0) {
                var zakazkaObj = zakazka[0];
                var cisloZakazky = zakazkaObj.field("Číslo") || "";
                var nazovZakazky = zakazkaObj.field("Názov záznamu") || "";
                infoMessage += "📦 Zákazka: " + cisloZakazky + " - " + nazovZakazky + "\n";
            }
            
            infoMessage += "\n" + CONFIG.icons.person + " ZAMESTNANCI:\n" +
                         "• Počet: " + pocetPracovnikov + " osôb\n" +
                         "• Odpracované spolu: " + odpracovaneTotal + " hodín\n\n" +
                         CONFIG.icons.money + " MZDOVÉ NÁKLADY:\n" +
                         "• Celkom: " + celkoveMzdy.toFixed(2) + " €\n" +
                         "• Priemer na osobu: " + (pocetPracovnikov > 0 ? (celkoveMzdy / pocetPracovnikov).toFixed(2) : "0") + " €\n";
            
            if (hzsCena > 0) {
                infoMessage += "\n💼 HZS KALKULÁCIA:\n" +
                             "• Hodinová sadzba: " + hzsCena + " €/h\n" +
                             "• Odpracované: " + odpracovaneTotal + " h\n" +
                             "• Suma HZS: " + sumaHZS.toFixed(2) + " €\n";
            }
            
            infoMessage += "\n" + CONFIG.icons.work + " TECHNICKÉ INFO:\n" +
                         "• Script verzia: " + CONFIG.version + "\n" +
                         "• Čas generovania: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n" +
                         "• Trigger: Before Save\n\n" +
                         "📝 Pre detaily pozri Debug_Log";
            
            currentEntry.set(CONFIG.fields.info, infoMessage);
            addDebug(CONFIG.icons.success + " Info záznam vytvorený");
            step8Success = true;
            
        } catch (infoError) {
            addError("Chyba pri vytváraní info záznamu: " + infoError.toString(), "info");
            step8Success = false;
        }
    }
    
    // Finálne vyhodnotenie
    var globalSuccess = step1Success && step2Success && step3Success && 
                       step4Success && step5Success;
    
    if (globalSuccess) {
        addDebug("🎉 === PREPOČET DOKONČENÝ ÚSPEŠNE! ===");
    } else {
        addDebug(CONFIG.icons.error + " === PREPOČET ZLYHAL ===");
        addDebug("Kroky: 1=" + step1Success + " 2=" + step2Success + " 3=" + step3Success + 
                " 4=" + step4Success + " 5=" + step5Success + " 6=" + step6Success + 
                " 7=" + step7Success + " 8=" + step8Success);
    }
    
    return globalSuccess;
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

try {
    addDebug("🎬 Inicializácia " + CONFIG.scriptName + " v" + CONFIG.version);
    
    // Kontrola existencie currentEntry
    if (!currentEntry) {
        addError("KRITICKÁ CHYBA: currentEntry neexistuje", "startup");
        message(CONFIG.icons.error + " KRITICKÁ CHYBA!\n\nScript nemôže bežať bez aktuálneho záznamu.");
    } else {
        // Spustenie hlavnej funkcie
        var result = hlavnaFunkcia();
        
        // Ulož logy
        saveLogs();
        
        // Informuj používateľa
        if (result) {
            message(CONFIG.icons.success + " Záznam prác prepočítaný úspešne!\n\n" +
                   CONFIG.icons.time + " Časy zaokrúhlené na 15 min\n" +
                   "📊 Pracovná doba: " + currentEntry.field(CONFIG.fields.pracovnaDoba) + " h\n" +
                   CONFIG.icons.person + " Zamestnanci: " + currentEntry.field(CONFIG.fields.pocetPracovnikov) + " osôb\n" +
                   CONFIG.icons.money + " Mzdové náklady: " + currentEntry.field(CONFIG.fields.mzdoveNaklady) + " €\n" +
                   "💼 Suma HZS: " + (currentEntry.field(CONFIG.fields.sumaHZS) || 0) + " €\n\n" +
                   CONFIG.icons.info + " Detaily v poli 'info'");
        } else {
            message(CONFIG.icons.error + " Prepočet záznamu prác zlyhal!\n\n" +
                   "🔍 Skontroluj Error_Log pre detaily\n" +
                   CONFIG.icons.step + " Over vstupné dáta a skús znovu");
        }
    }
    
} catch (kritickachyba) {
    // Posledná záchrana
    try {
        addError("KRITICKÁ CHYBA: " + kritickachyba.toString(), "critical");
        saveLogs();
        message(CONFIG.icons.error + " KRITICKÁ CHYBA!\n\nScript zlyhal. Pozri Error_Log.");
    } catch (finalError) {
        message(CONFIG.icons.error + " FATÁLNA CHYBA!\n\n" + kritickachyba.toString());
    }
} 