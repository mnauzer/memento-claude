// ==============================================
// MEMENTO DATABASE - ZÁZNAM PRÁC PREPOČET ZÁZNAMU
// Verzia: 3.1 | Dátum: 11.08.2025 | Autor: JavaScript Expert
// Knižnica: Záznam prác | Trigger: Before Save
// ==============================================
// ✅ NOVÉ v3.1:
//    - Využitie MementoUtils knižnice pre všetky utility funkcie
//    - Čistejší kód bez duplicitných funkcií
//    - Profesionálna štruktúra podľa vzoru Dochádzka 3.1
//    - SPRÁVNA SYNTAX pre setAttr cez MementoUtils
//    - Robustný error handling cez MementoUtils
// ✅ FUNKCIONALITY:
//    - Zaokrúhľovanie časov Od/Do(Dp) na 15 minút
//    - Výpočet pracovnej doby a odpracovaných hodín
//    - Automatické hľadanie sadzieb zamestnancov
//    - HZS spracovanie s auto-linkovaním defaults
//    - Výkaz prác linksFrom spracovanie
//    - Info záznamy pre audit trail
// ==============================================

var CONFIG = {
    debug: true,
    version: "3.1",
    scriptName: "Záznam prác Prepočet",
    
    // Názvy polí - Záznam prác
    fields: {
        zamestnanci: "Zamestnanci",
        datum: "Dátum",
        od: "Od",
        do: "Do",  // V knowledge base je "Dp", ale v praxi sa používa "Do"
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
        vykazPrac: "Výkaz prác"
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
        praceHZS: "Práce HZS",
        zakazka: "Zákazka"
    },
    
    // Emoji pre lepšiu čitateľnosť logov
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

// Globálne premenné
var currentEntry = null;

// ==============================================
// INICIALIZÁCIA
// ==============================================

try {
    currentEntry = entry();
} catch (e) {
    // Ak zlyhá získanie entry, nemôžeme pokračovať
    message("❌ Kritická chyba: Nemožno získať aktuálny záznam");
}

// ==============================================
// POMOCNÉ FUNKCIE PRE SADZBY A CENY
// ==============================================

function findValidSalary(zamestnanecObject, datum) {
    if (!zamestnanecObject || !datum) {
        MementoUtils.addError("Neplatné parametre pre hľadanie sadzby", "findValidSalary");
        return 0;
    }
    
    MementoUtils.addDebug("🔍 Hľadám sadzbu pre zamestnanca k dátumu: " + moment(datum).format("DD.MM.YYYY"));
    
    try {
        var sadzby = MementoUtils.safeLinksFrom(zamestnanecObject, CONFIG.libraries.sadzbyZamestnancov, CONFIG.sadzbyFields.zamestnanec);
        
        if (!sadzby || sadzby.length === 0) {
            MementoUtils.addDebug(CONFIG.icons.warning + " Žiadne sadzby nenájdené");
            return 0;
        }
        
        var platnaHodinovka = 0;
        var najnovsiDatum = null;
        
        for (var i = 0; i < sadzby.length; i++) {
            var sadzbaEntry = sadzby[i];
            var platnostOd = MementoUtils.safeGet(sadzbaEntry, CONFIG.sadzbyFields.platnostOd);
            var hodinovka = MementoUtils.safeGet(sadzbaEntry, CONFIG.sadzbyFields.sadzba, 0);
            
            if (platnostOd && hodinovka && platnostOd <= datum) {
                if (!najnovsiDatum || platnostOd > najnovsiDatum) {
                    najnovsiDatum = platnostOd;
                    platnaHodinovka = hodinovka;
                }
            }
        }
        
        if (platnaHodinovka > 0) {
            MementoUtils.addDebug(CONFIG.icons.success + " Platná hodinovka: " + platnaHodinovka + " €/h");
        } else {
            MementoUtils.addDebug(CONFIG.icons.warning + " Žiadna platná sadzba k dátumu");
        }
        
        return platnaHodinovka;
        
    } catch (error) {
        MementoUtils.addError("Chyba pri hľadaní sadzby: " + error.toString(), "findValidSalary");
        return 0;
    }
}

function processEmployee(zamestnanec, index, pracovnaDobaHodiny, datum) {
    if (!zamestnanec) {
        MementoUtils.addError("Neplatný zamestnanec na pozícii " + index, "processEmployee");
        return 0;
    }
    
    try {
        var nick = MementoUtils.safeGet(zamestnanec, "Nick", "Neznámy");
        var priezvisko = MementoUtils.safeGet(zamestnanec, "Priezvisko", "");
        MementoUtils.addDebug(CONFIG.icons.person + " Spracúvam zamestnanca " + (index + 1) + ": " + nick + " (" + priezvisko + ")");
        
        // 1. Nájdi hodinovku
        var aktualnaHodinovka = findValidSalary(zamestnanec, datum);
        
        // 2. Nastav atribúty - používame MementoUtils pre správnu syntax
        MementoUtils.safeSetAttr(currentEntry, CONFIG.fields.zamestnanci, index, CONFIG.attributes.odpracovane, pracovnaDobaHodiny);
        MementoUtils.addDebug("  " + CONFIG.icons.success + " Odpracované nastavené: " + pracovnaDobaHodiny + "h");
        
        MementoUtils.safeSetAttr(currentEntry, CONFIG.fields.zamestnanci, index, CONFIG.attributes.hodinovka, aktualnaHodinovka);
        MementoUtils.addDebug("  " + CONFIG.icons.success + " Hodinovka nastavená: " + aktualnaHodinovka + " €/h");
        
        // 3. Vypočítaj mzdové náklady
        var mzdoveNaklady = pracovnaDobaHodiny * aktualnaHodinovka;
        
        MementoUtils.safeSetAttr(currentEntry, CONFIG.fields.zamestnanci, index, CONFIG.attributes.mzdoveNaklady, mzdoveNaklady);
        MementoUtils.addDebug("  " + CONFIG.icons.money + " Mzdové náklady: " + mzdoveNaklady.toFixed(2) + " €");
        
        return mzdoveNaklady;
        
    } catch (error) {
        MementoUtils.addError("Chyba pri spracovaní zamestnanca " + index + ": " + error.toString(), "processEmployee");
        return 0;
    }
}

function getDefaultHZS() {
    try {
        MementoUtils.addDebug(CONFIG.icons.link + " Hľadám default HZS v knižnici ASISTANTO Defaults");
        
        var defaultsLib = MementoUtils.safeGetLibrary(CONFIG.libraries.defaulty);
        if (!defaultsLib) {
            MementoUtils.addError("Knižnica ASISTANTO Defaults nenájdená", "getDefaultHZS");
            return null;
        }
        
        var defaultsEntries = defaultsLib.entries();
        if (defaultsEntries && defaultsEntries.length > 0) {
            var defaultEntry = defaultsEntries[0];
            var defaultHZS = MementoUtils.safeGet(defaultEntry, CONFIG.defaultsFields.defaultHZS);
            
            if (defaultHZS && defaultHZS.length > 0) {
                MementoUtils.addDebug(CONFIG.icons.success + " Default HZS nájdené");
                return defaultHZS;
            }
        }
        
        MementoUtils.addDebug(CONFIG.icons.warning + " Default HZS nenájdené");
        return null;
        
    } catch (error) {
        MementoUtils.addError("Chyba pri získavaní default HZS: " + error.toString(), "getDefaultHZS");
        return null;
    }
}

function getHZSPrice(hzsZaznam, datum) {
    if (!hzsZaznam || !datum) {
        return 0;
    }
    
    try {
        // Najprv skús nájsť cenu v linksFrom "ceny prác"
        var ceny = MementoUtils.safeLinksFrom(hzsZaznam, CONFIG.libraries.cenyPrac, CONFIG.cenyFields.praca);
        
        if (ceny && ceny.length > 0) {
            MementoUtils.addDebug("  Našiel som " + ceny.length + " historických cien");
            
            var platnaCena = 0;
            var najnovsiDatum = null;
            
            for (var i = 0; i < ceny.length; i++) {
                var cenaEntry = ceny[i];
                var platnostOd = MementoUtils.safeGet(cenaEntry, CONFIG.cenyFields.platnostOd);
                var cena = MementoUtils.safeGet(cenaEntry, CONFIG.cenyFields.cena, 0);
                
                if (platnostOd && cena && platnostOd <= datum) {
                    if (!najnovsiDatum || platnostOd > najnovsiDatum) {
                        najnovsiDatum = platnostOd;
                        platnaCena = cena;
                    }
                }
            }
            
            if (platnaCena > 0) {
                MementoUtils.addDebug("  " + CONFIG.icons.success + " Platná historická cena: " + platnaCena + " €");
                return platnaCena;
            }
        }
        
        // Ak nenájde historickú cenu, použi priamu cenu z Cenníka prác
        var cenaBezDPH = MementoUtils.safeGet(hzsZaznam, "Cena bez DPH", 0);
        if (cenaBezDPH) {
            MementoUtils.addDebug("  Používam priamu cenu z Cenníka prác: " + cenaBezDPH + " €");
            return cenaBezDPH;
        }
        
        MementoUtils.addDebug("  " + CONFIG.icons.warning + " Žiadna cena nenájdená");
        return 0;
        
    } catch (error) {
        MementoUtils.addError("Chyba pri získavaní HZS ceny: " + error.toString(), "getHZSPrice");
        return 0;
    }
}

function processVykazPrac(zakazka, currentEntry, hzsCena, odpracovaneHodiny) {
    if (!zakazka) {
        MementoUtils.addDebug(CONFIG.icons.warning + " Žiadna zákazka, preskakujem výkaz prác");
        return;
    }
    
    try {
        MementoUtils.addDebug(CONFIG.icons.link + " KROK 8: Kontrolujem výkaz prác pre zákazku...");
        
        // Získaj výkazy prác linknuté na zákazku
        var vykazyPrac = MementoUtils.safeLinksFrom(zakazka, CONFIG.libraries.vykazPrac, CONFIG.vykazFields.zakazka);
        
        if (!vykazyPrac || vykazyPrac.length === 0) {
            MementoUtils.addDebug("  Žiadny výkaz prác nenájdený pre túto zákazku");
            return;
        }
        
        MementoUtils.addDebug("  Našiel som " + vykazyPrac.length + " výkaz(ov) prác");
        
        // Spracuj prvý výkaz (zvyčajne je len jeden na zákazku)
        var vykaz = vykazyPrac[0];
        
        // Pridaj link na aktuálny záznam prác
        var existujucePrace = MementoUtils.safeGet(vykaz, CONFIG.vykazFields.praceHZS, []);
        existujucePrace.push(currentEntry);
        MementoUtils.safeSet(vykaz, CONFIG.vykazFields.praceHZS, existujucePrace);
        
        // Nastav atribúty linku
        var linkIndex = existujucePrace.length - 1;
        
        // Vykonané práce
        var vykonanePrace = MementoUtils.safeGet(currentEntry, CONFIG.fields.vykonanePrace, "");
        MementoUtils.safeSetAttr(vykaz, CONFIG.vykazFields.praceHZS, linkIndex, CONFIG.vykazAttributes.vykonanePrace, vykonanePrace);
        
        // Počet hodín
        MementoUtils.safeSetAttr(vykaz, CONFIG.vykazFields.praceHZS, linkIndex, CONFIG.vykazAttributes.pocetHodin, odpracovaneHodiny);
        
        // Účtovaná sadzba
        MementoUtils.safeSetAttr(vykaz, CONFIG.vykazFields.praceHZS, linkIndex, CONFIG.vykazAttributes.uctoovanaSadzba, hzsCena);
        
        // Cena celkom
        var cenaCelkom = odpracovaneHodiny * hzsCena;
        MementoUtils.safeSetAttr(vykaz, CONFIG.vykazFields.praceHZS, linkIndex, CONFIG.vykazAttributes.cenaCelkom, cenaCelkom);
        
        MementoUtils.addDebug("  " + CONFIG.icons.success + " Výkaz prác aktualizovaný:");
        MementoUtils.addDebug("    • Vykonané práce: " + (vykonanePrace ? vykonanePrace.substring(0, 50) + "..." : ""));
        MementoUtils.addDebug("    • Počet hodín: " + odpracovaneHodiny + "h");
        MementoUtils.addDebug("    • Účtovaná sadzba: " + hzsCena + " €");
        MementoUtils.addDebug("    • Cena celkom: " + cenaCelkom.toFixed(2) + " €");
        
    } catch (error) {
        MementoUtils.addError("Chyba pri spracovaní výkazu prác: " + error.toString(), "processVykazPrac");
    }
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function hlavnaFunkcia() {
    MementoUtils.addDebug(CONFIG.icons.start + " === ŠTART PREPOČTU ZÁZNAMU PRÁC v" + CONFIG.version + " ===");
    MementoUtils.addDebug("📱 Používam MementoUtils knižnicu");
    
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
        MementoUtils.addDebug(CONFIG.icons.step + " KROK 1: Načítavam vstupné dáta...");
        
        datum = MementoUtils.safeGet(currentEntry, CONFIG.fields.datum);
        odRaw = MementoUtils.safeGet(currentEntry, CONFIG.fields.od);
        
        // Skús najprv "Do", ak nefunguje, skús "Dp"
        doRaw = MementoUtils.safeGet(currentEntry, CONFIG.fields.do);
        if (!doRaw) {
            doRaw = MementoUtils.safeGet(currentEntry, "Dp");
            if (doRaw) {
                MementoUtils.addDebug("  📝 Poznámka: Pole 'Dp' použité namiesto 'Do'");
            }
        }
        
        zamestnanci = MementoUtils.safeGet(currentEntry, CONFIG.fields.zamestnanci, []);
        zakazka = MementoUtils.safeGet(currentEntry, CONFIG.fields.zakazka);
        
        MementoUtils.addDebug("  📅 Dátum: " + (datum ? moment(datum).format("DD.MM.YYYY") : "NULL"));
        MementoUtils.addDebug("  🕐 Od (raw): " + MementoUtils.formatTime(odRaw));
        MementoUtils.addDebug("  🕐 Do (raw): " + MementoUtils.formatTime(doRaw));
        MementoUtils.addDebug("  " + CONFIG.icons.person + " Zamestnanci: " + zamestnanci.length);
        MementoUtils.addDebug("  📦 Zákazka: " + (zakazka && zakazka.length > 0 ? "ÁNO" : "NIE"));
        
        // Validácia
        if (!datum || !odRaw || !doRaw || zamestnanci.length === 0) {
            MementoUtils.addError("Chýbajú povinné údaje", "validacia");
            step1Success = false;
        } else {
            MementoUtils.addDebug(CONFIG.icons.success + " Vstupné dáta OK");
            step1Success = true;
        }
        
    } catch (inputError) {
        MementoUtils.addError("Chyba pri načítaní vstupných dát: " + inputError.toString(), "input");
        step1Success = false;
    }
    
    // KROK 2: Zaokrúhľovanie časov
    if (step1Success) {
        try {
            MementoUtils.addDebug(CONFIG.icons.time + " KROK 2: Zaokrúhľujem časy na 15 minút...");
            
            odRounded = MementoUtils.roundToQuarter(odRaw);
            doRounded = MementoUtils.roundToQuarter(doRaw);
            
            if (!odRounded || !doRounded) {
                MementoUtils.addError("Zaokrúhľovanie časov zlyhalo", "rounding");
                step2Success = false;
            } else {
                MementoUtils.addDebug("  Pôvodne: " + MementoUtils.formatTime(odRaw) + " - " + MementoUtils.formatTime(doRaw));
                MementoUtils.addDebug("  Zaokrúhlené: " + MementoUtils.formatTime(odRounded) + " - " + MementoUtils.formatTime(doRounded));
                
                MementoUtils.safeSet(currentEntry, CONFIG.fields.od, odRounded);
                
                // Ulož do správneho poľa
                var doSaved = MementoUtils.safeSet(currentEntry, CONFIG.fields.do, doRounded);
                if (!doSaved) {
                    MementoUtils.safeSet(currentEntry, "Dp", doRounded);
                    MementoUtils.addDebug("  📝 Použité pole 'Dp' pre uloženie času Do");
                }
                
                MementoUtils.addDebug(CONFIG.icons.success + " Časy zaokrúhlené a uložené");
                step2Success = true;
            }
        } catch (roundError) {
            MementoUtils.addError("Chyba pri zaokrúhľovaní: " + roundError.toString(), "round");
            step2Success = false;
        }
    }
    
    // KROK 3: Výpočet pracovnej doby
    if (step2Success) {
        try {
            MementoUtils.addDebug(CONFIG.icons.calculate + " KROK 3: Počítam pracovnú dobu...");
            
            pracovnaDobaHodiny = MementoUtils.calculateHours(odRounded, doRounded);
            
            if (pracovnaDobaHodiny <= 0 || pracovnaDobaHodiny > 24) {
                MementoUtils.addError("Neplatná pracovná doba: " + pracovnaDobaHodiny, "pracovna_doba");
                step3Success = false;
            } else {
                MementoUtils.addDebug("  " + CONFIG.icons.time + " Pracovná doba: " + pracovnaDobaHodiny + " hodín");
                MementoUtils.safeSet(currentEntry, CONFIG.fields.pracovnaDoba, pracovnaDobaHodiny);
                MementoUtils.addDebug("  💾 Pracovná doba uložená");
                step3Success = true;
            }
            
        } catch (calcError) {
            MementoUtils.addError("Chyba pri výpočte pracovnej doby: " + calcError.toString(), "calc");
            step3Success = false;
        }
    }
    
    // KROK 4: Počet pracovníkov a odpracované
    if (step3Success) {
        try {
            MementoUtils.addDebug(CONFIG.icons.step + " KROK 4: Počítam odpracované hodiny...");
            
            pocetPracovnikov = zamestnanci.length;
            odpracovaneTotal = pracovnaDobaHodiny * pocetPracovnikov;
            
            MementoUtils.addDebug("  " + CONFIG.icons.person + " Počet pracovníkov: " + pocetPracovnikov);
            MementoUtils.addDebug("  📊 Odpracované: " + pracovnaDobaHodiny + "h × " + pocetPracovnikov + " = " + odpracovaneTotal + "h");
            
            MementoUtils.safeSet(currentEntry, CONFIG.fields.pocetPracovnikov, pocetPracovnikov);
            MementoUtils.safeSet(currentEntry, CONFIG.fields.odpracovane, odpracovaneTotal);
            
            MementoUtils.addDebug(CONFIG.icons.success + " Počty uložené");
            step4Success = true;
            
        } catch (countError) {
            MementoUtils.addError("Chyba pri počítaní: " + countError.toString(), "count");
            step4Success = false;
        }
    }
    
    // KROK 5: Spracovanie zamestnancov a výpočet miezd
    if (step4Success) {
        try {
            MementoUtils.addDebug(CONFIG.icons.money + " KROK 5: Spracúvam zamestnancov a počítam mzdy...");
            
            celkoveMzdy = 0;
            var spracovaniUspesni = 0;
            
            for (var i = 0; i < zamestnanci.length; i++) {
                var mzda = processEmployee(zamestnanci[i], i, pracovnaDobaHodiny, datum);
                celkoveMzdy += mzda;
                if (mzda > 0) {
                    spracovaniUspesni++;
                }
            }
            
            MementoUtils.addDebug("📊 SÚHRN ZAMESTNANCOV:");
            MementoUtils.addDebug("  • Spracovaní: " + spracovaniUspesni + "/" + zamestnanci.length);
            MementoUtils.addDebug("  • Celkové mzdy: " + celkoveMzdy.toFixed(2) + " €");
            
            MementoUtils.safeSet(currentEntry, CONFIG.fields.mzdoveNaklady, celkoveMzdy);
            
            if (spracovaniUspesni > 0) {
                MementoUtils.addDebug(CONFIG.icons.success + " Mzdy vypočítané");
                step5Success = true;
            } else {
                MementoUtils.addError("Žiadny zamestnanec nebol úspešne spracovaný", "mzdy");
                step5Success = false;
            }
            
        } catch (mzdyError) {
            MementoUtils.addError("Chyba pri výpočte miezd: " + mzdyError.toString(), "mzdy");
            step5Success = false;
        }
    }
    
    // KROK 6: HZS spracovanie s auto-linkovaním
    if (step5Success) {
        try {
            MementoUtils.addDebug(CONFIG.icons.money + " KROK 6: Spracúvam HZS...");
            
            hzsPole = MementoUtils.safeGet(currentEntry, CONFIG.fields.hodinovaZuctovacia);
            
            // Ak nie je HZS vyplnené, skús auto-linkovať default
            if (!hzsPole || hzsPole.length === 0) {
                MementoUtils.addDebug("  " + CONFIG.icons.warning + " HZS nie je vyplnené, hľadám default...");
                
                var defaultHZS = getDefaultHZS();
                if (defaultHZS) {
                    MementoUtils.safeSet(currentEntry, CONFIG.fields.hodinovaZuctovacia, defaultHZS);
                    MementoUtils.addDebug("  " + CONFIG.icons.success + " Default HZS nastavené");
                    
                    // DÔLEŽITÉ: Znovu načítaj pole po linkovaní
                    hzsPole = MementoUtils.safeGet(currentEntry, CONFIG.fields.hodinovaZuctovacia);
                } else {
                    MementoUtils.addDebug("  " + CONFIG.icons.warning + " Default HZS nenájdené, pokračujem bez HZS");
                }
            }
            
            // Ak máme HZS, spracuj ho
            if (hzsPole && hzsPole.length > 0) {
                var hzsZaznam = hzsPole[0];
                hzsCena = getHZSPrice(hzsZaznam, datum);
                
                if (hzsCena > 0) {
                    // Nastav atribút cena
                    MementoUtils.safeSetAttr(currentEntry, CONFIG.fields.hodinovaZuctovacia, 0, CONFIG.hzsAttributes.cena, hzsCena);
                    MementoUtils.addDebug("  " + CONFIG.icons.success + " Atribút cena nastavený: " + hzsCena + " €");
                    
                    // Vypočítaj sumu HZS
                    sumaHZS = odpracovaneTotal * hzsCena;
                    MementoUtils.safeSet(currentEntry, CONFIG.fields.sumaHZS, sumaHZS);
                    
                    MementoUtils.addDebug("  " + CONFIG.icons.calculate + " Suma HZS: " + odpracovaneTotal + "h × " + hzsCena + "€ = " + sumaHZS.toFixed(2) + " €");
                    step6Success = true;
                } else {
                    MementoUtils.addDebug("  " + CONFIG.icons.warning + " Cena HZS je 0 alebo nenájdená");
                    step6Success = true; // Nie je to kritická chyba
                }
            } else {
                MementoUtils.addDebug("  " + CONFIG.icons.info + " Žiadne HZS, preskakujem výpočet");
                step6Success = true; // Nie je to kritická chyba
            }
            
        } catch (hzsError) {
            MementoUtils.addError("Chyba pri spracovaní HZS: " + hzsError.toString(), "hzs");
            step6Success = true; // Nie je to kritická chyba
        }
    }
    
    // KROK 7: Výkaz prác spracovanie
    if (step6Success && zakazka && zakazka.length > 0) {
        try {
            processVykazPrac(zakazka[0], currentEntry, hzsCena, odpracovaneTotal);
            step7Success = true;
        } catch (vykazError) {
            MementoUtils.addError("Chyba pri spracovaní výkazu prác: " + vykazError.toString(), "vykaz");
            step7Success = true; // Nie je to kritická chyba
        }
    } else {
        step7Success = true; // Nie je zákazka, tak OK
    }
    
    // KROK 8: Vytvorenie info záznamu
    if (step1Success && step2Success && step3Success) {
        try {
            MementoUtils.addDebug(CONFIG.icons.info + " KROK 9: Vytváram info záznam...");
            
            var infoMessage = CONFIG.icons.work + " ZÁZNAM PRÁC - AUTOMATICKÝ PREPOČET\n" +
                            "=====================================\n\n" +
                            "📅 Dátum: " + moment(datum).format("DD.MM.YYYY") + "\n" +
                            CONFIG.icons.time + " Pracovný čas: " + MementoUtils.formatTime(odRounded) + " - " + MementoUtils.formatTime(doRounded) + "\n" +
                            CONFIG.icons.time + " Pracovná doba: " + pracovnaDobaHodiny + " hodín\n";
            
            if (zakazka && zakazka.length > 0) {
                var zakazkaObj = zakazka[0];
                var cisloZakazky = MementoUtils.safeGet(zakazkaObj, "Číslo", "");
                var nazovZakazky = MementoUtils.safeGet(zakazkaObj, "Názov záznamu", "");
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
                         "• Trigger: Before Save\n" +
                         "• MementoUtils: Aktívne\n\n" +
                         "📝 Pre detaily pozri Debug_Log";
            
            MementoUtils.safeSet(currentEntry, CONFIG.fields.info, infoMessage);
            MementoUtils.addDebug(CONFIG.icons.success + " Info záznam vytvorený");
            step8Success = true;
            
        } catch (infoError) {
            MementoUtils.addError("Chyba pri vytváraní info záznamu: " + infoError.toString(), "info");
            step8Success = false;
        }
    }
    
    // Finálne vyhodnotenie
    var globalSuccess = step1Success && step2Success && step3Success && 
                       step4Success && step5Success;
    
    if (globalSuccess) {
        MementoUtils.addDebug("🎉 === PREPOČET DOKONČENÝ ÚSPEŠNE! ===");
    } else {
        MementoUtils.addDebug(CONFIG.icons.error + " === PREPOČET ZLYHAL ===");
        MementoUtils.addDebug("Kroky: 1=" + step1Success + " 2=" + step2Success + " 3=" + step3Success + 
                " 4=" + step4Success + " 5=" + step5Success + " 6=" + step6Success + 
                " 7=" + step7Success + " 8=" + step8Success);
    }
    
    return globalSuccess;
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

try {
    MementoUtils.addDebug("🎬 Inicializácia " + CONFIG.scriptName + " v" + CONFIG.version);
    MementoUtils.addDebug("📚 MementoUtils knižnica dostupná");
    
    // Kontrola existencie currentEntry
    if (!currentEntry) {
        MementoUtils.addError("KRITICKÁ CHYBA: currentEntry neexistuje", "startup");
        message(CONFIG.icons.error + " KRITICKÁ CHYBA!\n\nScript nemôže bežať bez aktuálneho záznamu.");
    } else {
        // Spustenie hlavnej funkcie
        var result = hlavnaFunkcia();
        
        // Ulož logy cez MementoUtils
        MementoUtils.saveLogs(currentEntry);
        
        // Informuj používateľa
        if (result) {
            message(CONFIG.icons.success + " Záznam prác prepočítaný úspešne!\n\n" +
                   CONFIG.icons.time + " Časy zaokrúhlené na 15 min\n" +
                   "📊 Pracovná doba: " + MementoUtils.safeGet(currentEntry, CONFIG.fields.pracovnaDoba, 0) + " h\n" +
                   CONFIG.icons.person + " Zamestnanci: " + MementoUtils.safeGet(currentEntry, CONFIG.fields.pocetPracovnikov, 0) + " osôb\n" +
                   CONFIG.icons.money + " Mzdové náklady: " + MementoUtils.safeGet(currentEntry, CONFIG.fields.mzdoveNaklady, 0) + " €\n" +
                   "💼 Suma HZS: " + MementoUtils.safeGet(currentEntry, CONFIG.fields.sumaHZS, 0) + " €\n\n" +
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
        MementoUtils.addError("KRITICKÁ CHYBA: " + kritickachyba.toString(), "critical");
        MementoUtils.saveLogs(currentEntry);
        message(CONFIG.icons.error + " KRITICKÁ CHYBA!\n\nScript zlyhal. Pozri Error_Log.");
    } catch (finalError) {
        message(CONFIG.icons.error + " FATÁLNA CHYBA!\n\n" + kritickachyba.toString());
    }
}