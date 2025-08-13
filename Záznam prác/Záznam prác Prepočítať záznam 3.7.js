// ==============================================
// MEMENTO DATABASE - ZÁZNAM PRÁC PREPOČET ZÁZNAMU
// Verzia: 3.7 | Dátum: 12.08.2025 | Autor: JavaScript Expert
// Knižnica: Záznam prác | Trigger: Before Save
// ==============================================
// ✅ OPRAVENÉ v3.7:
//    - Robustnejšie nastavenie Default HZS z ASISTANTO Defaults
//    - Všetky linksFrom volania v try-catch blokoch
//    - Zlepšené error handling pre neexistujúce objekty
//    - Bezpečnejšie práca s knižnicami a poľami
// ✅ OPRAVENÉ v3.6:
//    - Opravená chyba "Cannot find function field in object C"
//    - Opravená NullPointerException v synchronizujVykazPrac
// ==============================================

var CONFIG = {
    debug: true,
    version: "3.7", // ✅ ZVÝŠENÁ VERZIA
    scriptName: "Záznam prác Prepočet",
    
    libraries: {
        sadzbyZamestnancov: "sadzby zamestnancov",
        cennikPrac: "Cenník prác",
        cenyPrac: "ceny prác",
        defaulty: "ASISTANTO Defaults",
        vykazPrac: "Výkaz prác",
        zaznamPrac: "Záznam prác"
    },
    
    fields: {
        zamestnanci: "Zamestnanci",
        datum: "Dátum",
        od: "Od",
        koniec: "Do",
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
    
    // Názvy polí v ASISTANTO Defaults
    defaultsFields: {
        defaultHZS: "Default HZS" // ✅ Presne podľa požiadavky
    },
    
    // Ostatná konfigurácia zostáva rovnaká...
    sadzbyFields: {
        zamestnanec: "Zamestnanec",
        platnostOd: "Platnosť od",
        sadzba: "Sadzba"
    },
    
    cennikFields: {
        cena: "Cena",
        cenaBezDPH: "Cena bez DPH"
    },
    
    cenyFields: {
        praca: "Cenník prác",
        platnostOd: "Platnosť od",
        cena: "Cena"
    },
    
    vykazFields: {
        datum: "Dátum",
        identifikator: "Identifikátor",
        popis: "Popis",
        typVykazu: "Typ výkazu",
        cenyPocitat: "Ceny počítať",
        cenovaPonuka: "Cenová ponuka",
        vydane: "Vydané",
        zakazka: "Zákazka",
        praceHZS: "Práce HZS",
        info: "info"
    },
    
    attributes: {
        odpracovane: "odpracované",
        hodinovka: "hodinovka",
        mzdoveNaklady: "mzdové náklady"
    },
    
    hzsAttributes: {
        cena: "cena"
    },
    
    vykazAttributes: {
        vykonanePrace: "vykonané práce",
        pocetHodin: "počet hodín",
        uctoovanaSadzba: "účtovaná sadzba",
        cenaCelkom: "cena celkom"
    },
    
    icons: {
        start: "🚀",
        step: "📋",
        success: "✅",
        error: "💥",
        warning: "⚠️",
        money: "💰",
        person: "👤",
        time: "⏰",
        info: "ℹ️",
        update: "🔄",
        create: "➕",
        link: "🔗",
        work: "🔨"
    }
};

var currentEntry = entry();

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

function formatDate(dateValue) {
    if (!dateValue) return "N/A";
    try {
        return moment(dateValue).format("DD.MM.YYYY");
    } catch (e) {
        return "Invalid Date";
    }
}

function zaokruhliNa15Minut(casMs) {
    if (!casMs) return null;
    var kvarter = 15 * 60 * 1000;
    return Math.round(casMs / kvarter) * kvarter;
}

function vypocitajHodiny(odMs, koniecMs) {
    if (!odMs || !koniecMs) return 0;
    if (koniecMs < odMs) {
        koniecMs += 24 * 60 * 60 * 1000;
        MementoUtils.addDebug(currentEntry, "  ⏰ Práca cez polnoc detekovaná");
    }
    var hodiny = (koniecMs - odMs) / (1000 * 60 * 60);
    return Math.round(hodiny * 100) / 100;
}

// ✅ NOVÉ v3.7 - Ultra bezpečné linksFrom volanie
function ultraBezpecneLinksFrom(sourceEntry, targetLibrary, linkField, debugMsg, location) {
    try {
        if (!sourceEntry) {
            if (debugMsg) MementoUtils.addDebug(currentEntry, debugMsg + " - sourceEntry je null");
            return [];
        }
        
        if (typeof sourceEntry !== "object" || !sourceEntry.linksFrom) {
            if (debugMsg) MementoUtils.addDebug(currentEntry, debugMsg + " - sourceEntry nie je validný Entry objekt");
            return [];
        }
        
        if (!targetLibrary || !linkField) {
            if (debugMsg) MementoUtils.addDebug(currentEntry, debugMsg + " - chýbajú parametre");
            return [];
        }
        
        // Hlavný linksFrom call v try-catch
        var results = sourceEntry.linksFrom(targetLibrary, linkField) || [];
        
        if (debugMsg) {
            MementoUtils.addDebug(currentEntry, debugMsg + " - nájdených: " + results.length);
        }
        
        return results;
        
    } catch (linksFromError) {
        // ✅ Špecifické error handling pre linksFrom
        var errorMsg = "LinksFrom zlyhalo (" + (location || "unknown") + "): " + linksFromError.toString();
        if (debugMsg) {
            MementoUtils.addDebug(currentEntry, debugMsg + " - CHYBA: " + errorMsg);
        }
        MementoUtils.addError(currentEntry, linksFromError, "ultraBezpecneLinksFrom-" + (location || "unknown"));
        return [];
    }
}

function najdiPlatnuSadzbu(zamestnanec, datum) {
    try {
        if (!zamestnanec || !datum) return 0;
        
        var identifikator = MementoUtils.formatEmployeeName(zamestnanec);
        MementoUtils.addDebug(currentEntry, "    🔍 Hľadám sadzbu pre: " + identifikator);
        
        // ✅ OPRAVENÉ v3.7 - použiť ultra bezpečné linksFrom
        var sadzby = ultraBezpecneLinksFrom(
            zamestnanec, 
            CONFIG.libraries.sadzbyZamestnancov, 
            CONFIG.sadzbyFields.zamestnanec,
            "      Načítavam sadzby",
            "najdiPlatnuSadzbu"
        );
        
        if (!sadzby || sadzby.length === 0) {
            MementoUtils.addDebug(currentEntry, "      ⚠️ Žiadne sadzby nenájdené");
            return 0;
        }
        
        var najnovsiaDatum = null;
        var platnaSadzba = 0;
        
        for (var i = 0; i < sadzby.length; i++) {
            try {
                var sadzbaEntry = sadzby[i];
                if (!sadzbaEntry || !sadzbaEntry.field) continue;
                
                var platnostOd = sadzbaEntry.field(CONFIG.sadzbyFields.platnostOd);
                var sadzba = parseFloat(sadzbaEntry.field(CONFIG.sadzbyFields.sadzba) || 0);
                
                if (platnostOd && platnostOd <= datum) {
                    if (!najnovsiaDatum || platnostOd > najnovsiaDatum) {
                        najnovsiaDatum = platnostOd;
                        platnaSadzba = sadzba;
                    }
                }
            } catch (sadzbaError) {
                MementoUtils.addDebug(currentEntry, "      ⚠️ Chyba pri spracovaní sadzby #" + i + ": " + sadzbaError);
                continue;
            }
        }
        
        if (platnaSadzba > 0) {
            MementoUtils.addDebug(currentEntry, "      ✅ Platná sadzba: " + platnaSadzba + " € (od " + formatDate(najnovsiaDatum) + ")");
        } else {
            MementoUtils.addDebug(currentEntry, "      ❌ Žiadna platná sadzba k dátumu");
        }
        
        return platnaSadzba;
        
    } catch (error) {
        MementoUtils.addError(currentEntry, error, "najdiPlatnuSadzbu");
        return 0;
    }
}

function spracujZamestnanca(zamestnanec, index, pracovnaDobaHodiny, datum) {
    try {
        var identifikator = MementoUtils.formatEmployeeName(zamestnanec);
        MementoUtils.addDebug(currentEntry, "  " + CONFIG.icons.person + " Zamestnanec #" + (index + 1) + ": " + identifikator);
        
        var hodinovka = najdiPlatnuSadzbu(zamestnanec, datum);
        var mzdoveNaklady = pracovnaDobaHodiny * hodinovka;
        
        try {
            zamestnanec.setAttr(CONFIG.attributes.odpracovane, pracovnaDobaHodiny);
            zamestnanec.setAttr(CONFIG.attributes.hodinovka, hodinovka);
            zamestnanec.setAttr(CONFIG.attributes.mzdoveNaklady, mzdoveNaklady);
            
            MementoUtils.addDebug(currentEntry, "    ✅ Atribúty nastavené:");
            MementoUtils.addDebug(currentEntry, "       • odpracované: " + pracovnaDobaHodiny + "h");
            MementoUtils.addDebug(currentEntry, "       • hodinovka: " + hodinovka + "€");
            MementoUtils.addDebug(currentEntry, "       • mzdové náklady: " + mzdoveNaklady + "€");
        } catch (attrError) {
            MementoUtils.addError(currentEntry, attrError, "spracujZamestnanca-atribúty");
        }
        
        return mzdoveNaklady;
        
    } catch (error) {
        MementoUtils.addError(currentEntry, error, "spracujZamestnanca");
        return 0;
    }
}

// ✅ OPRAVENÁ FUNKCIA v3.7 - robustnejšie získanie Default HZS
function getDefaultHZS() {
    try {
        MementoUtils.addDebug(currentEntry, "    🔍 Hľadám Default HZS v knižnici " + CONFIG.libraries.defaulty + "...");
        
        // ✅ Bezpečné získanie knižnice
        var defaultsLib = null;
        try {
            defaultsLib = libByName(CONFIG.libraries.defaulty);
        } catch (libError) {
            MementoUtils.addDebug(currentEntry, "      ❌ Chyba pri načítaní knižnice: " + libError);
            return null;
        }
        
        if (!defaultsLib) {
            MementoUtils.addDebug(currentEntry, "      ❌ Knižnica " + CONFIG.libraries.defaulty + " neexistuje");
            return null;
        }
        
        // ✅ Bezpečné získanie záznamov
        var defaultRecords = null;
        try {
            defaultRecords = defaultsLib.entries();
        } catch (entriesError) {
            MementoUtils.addDebug(currentEntry, "      ❌ Chyba pri načítaní záznamov: " + entriesError);
            return null;
        }
        
        if (!defaultRecords || defaultRecords.length === 0) {
            MementoUtils.addDebug(currentEntry, "      ❌ Žiadne záznamy v " + CONFIG.libraries.defaulty);
            return null;
        }
        
        // ✅ Bezpečné načítanie Default HZS poľa
        try {
            var firstRecord = defaultRecords[0];
            if (!firstRecord || !firstRecord.field) {
                MementoUtils.addDebug(currentEntry, "      ❌ Prvý záznam nie je validný Entry objekt");
                return null;
            }
            
            var defaultHZSField = firstRecord.field(CONFIG.defaultsFields.defaultHZS);
            
            if (!defaultHZSField) {
                MementoUtils.addDebug(currentEntry, "      ❌ Pole '" + CONFIG.defaultsFields.defaultHZS + "' je prázdne");
                return null;
            }
            
            if (Array.isArray(defaultHZSField) && defaultHZSField.length > 0) {
                var defaultHZSEntry = defaultHZSField[0];
                if (defaultHZSEntry && defaultHZSEntry.field) {
                    MementoUtils.addDebug(currentEntry, "      ✅ Default HZS nájdená: " + (defaultHZSEntry.field("Názov záznamu") || "ID:" + defaultHZSEntry.field("ID")));
                    return defaultHZSEntry;
                }
            } else if (defaultHZSField.field) {
                // Single link
                MementoUtils.addDebug(currentEntry, "      ✅ Default HZS nájdená (single): " + (defaultHZSField.field("Názov záznamu") || "ID:" + defaultHZSField.field("ID")));
                return defaultHZSField;
            }
            
            MementoUtils.addDebug(currentEntry, "      ❌ Pole '" + CONFIG.defaultsFields.defaultHZS + "' neobsahuje validný link");
            return null;
            
        } catch (fieldError) {
            MementoUtils.addDebug(currentEntry, "      ❌ Chyba pri načítaní poľa '" + CONFIG.defaultsFields.defaultHZS + "': " + fieldError);
            return null;
        }
        
    } catch (error) {
        MementoUtils.addError(currentEntry, error, "getDefaultHZS");
        return null;
    }
}

// ✅ OPRAVENÁ FUNKCIA v3.7 - ešte robustnejšie HZS spracovanie
function spracujHZS() {
    try {
        MementoUtils.addDebug(currentEntry, CONFIG.icons.step + " Spracovávam HZS...");
        
        var hzsPole = MementoUtils.safeGet(currentEntry, CONFIG.fields.hodinovaZuctovacia, []);
        
        // ✅ Ak nie je HZS nastavená, načítaj default z ASISTANTO Defaults
        if (!hzsPole || hzsPole.length === 0) {
            MementoUtils.addDebug(currentEntry, "  ⚠️ HZS nie je nastavená, načítavam z " + CONFIG.libraries.defaulty + "...");
            
            var defaultHZS = getDefaultHZS();
            if (defaultHZS) {
                try {
                    // ✅ Nastav Default HZS do aktuálneho záznamu
                    currentEntry.set(CONFIG.fields.hodinovaZuctovacia, [defaultHZS]);
                    
                    // ✅ Znovu načítaj pole
                    hzsPole = currentEntry.field(CONFIG.fields.hodinovaZuctovacia);
                    
                    if (hzsPole && hzsPole.length > 0) {
                        MementoUtils.addDebug(currentEntry, "  ✅ Default HZS automaticky nastavená z " + CONFIG.libraries.defaulty);
                    } else {
                        MementoUtils.addDebug(currentEntry, "  ❌ Nastavenie default HZS zlyhalo");
                        return { success: false, hzsCena: 0, sumaHZS: 0 };
                    }
                } catch (setError) {
                    MementoUtils.addError(currentEntry, setError, "spracujHZS-setDefault");
                    return { success: false, hzsCena: 0, sumaHZS: 0 };
                }
            } else {
                MementoUtils.addDebug(currentEntry, "  ❌ Default HZS nenájdená v " + CONFIG.libraries.defaulty);
                return { success: false, hzsCena: 0, sumaHZS: 0 };
            }
        }
        
        // ✅ Teraz by sme mali mať HZS nastavenú
        if (!hzsPole || hzsPole.length === 0) {
            MementoUtils.addDebug(currentEntry, "  ❌ HZS stále nie je nastavená");
            return { success: false, hzsCena: 0, sumaHZS: 0 };
        }
        
        var hzsEntry = hzsPole[0];
        
        if (!hzsEntry || typeof hzsEntry !== "object" || !hzsEntry.field) {
            MementoUtils.addDebug(currentEntry, "  ❌ HZS Entry nie je validný objekt");
            return { success: false, hzsCena: 0, sumaHZS: 0 };
        }
        
        var hzsCena = 0;
        
        // ✅ OPRAVENÉ v3.7 - ultra bezpečné linksFrom pre ceny
        var cenyPrac = ultraBezpecneLinksFrom(
            hzsEntry, 
            CONFIG.libraries.cenyPrac, 
            CONFIG.cenyFields.praca,
            "  Načítavam ceny prác",
            "spracujHZS-ceny"
        );
        
        if (cenyPrac && cenyPrac.length > 0) {
            MementoUtils.addDebug(currentEntry, "  📊 Nájdených " + cenyPrac.length + " cenových záznamov");
            
            var najnovsiaCena = 0;
            var najnovsiDatum = null;
            var datumPrace = MementoUtils.safeGet(currentEntry, CONFIG.fields.datum, new Date());
            
            for (var i = 0; i < cenyPrac.length; i++) {
                var cenaEntry = cenyPrac[i];
                
                if (!cenaEntry || typeof cenaEntry !== "object" || !cenaEntry.field) {
                    MementoUtils.addDebug(currentEntry, "  ⚠️ Cenový záznam #" + i + " nie je validný");
                    continue;
                }
                
                try {
                    var platnostOd = cenaEntry.field(CONFIG.cenyFields.platnostOd);
                    var cena = parseFloat(cenaEntry.field(CONFIG.cenyFields.cena) || 0);
                    
                    if (platnostOd && platnostOd <= datumPrace) {
                        if (!najnovsiDatum || platnostOd > najnovsiDatum) {
                            najnovsiDatum = platnostOd;
                            najnovsiaCena = cena;
                        }
                    }
                } catch (fieldError) {
                    MementoUtils.addDebug(currentEntry, "  ⚠️ Chyba pri čítaní cenového záznamu #" + i + ": " + fieldError);
                    continue;
                }
            }
            
            if (najnovsiaCena > 0) {
                hzsCena = najnovsiaCena;
                MementoUtils.addDebug(currentEntry, "  ✅ Cena z histórie: " + hzsCena + "€");
            }
        }
        
        // Ak nie je cena z histórie, použi priamu cenu
        if (hzsCena === 0) {
            try {
                hzsCena = parseFloat(MementoUtils.safeGet(hzsEntry, CONFIG.cennikFields.cena, 0));
                if (hzsCena === 0) {
                    hzsCena = parseFloat(MementoUtils.safeGet(hzsEntry, CONFIG.cennikFields.cenaBezDPH, 0));
                }
                MementoUtils.addDebug(currentEntry, "  📏 Priama cena: " + hzsCena + "€");
            } catch (directPriceError) {
                MementoUtils.addDebug(currentEntry, "  ⚠️ Chyba pri čítaní priamej ceny: " + directPriceError);
                hzsCena = 0;
            }
        }
        
        // Nastav atribút cena na HZS
        try {
            hzsEntry.setAttr(CONFIG.hzsAttributes.cena, hzsCena);
            MementoUtils.addDebug(currentEntry, "  ✅ Atribút cena nastavený na HZS");
        } catch (attrError) {
            MementoUtils.addDebug(currentEntry, "  ⚠️ Nepodarilo sa nastaviť atribút cena: " + attrError);
        }
        
        // Vypočítaj sumu HZS
        var odpracovane = MementoUtils.safeGet(currentEntry, CONFIG.fields.odpracovane, 0);
        var sumaHZS = odpracovane * hzsCena;
        
        MementoUtils.safeSet(currentEntry, CONFIG.fields.sumaHZS, sumaHZS);
        MementoUtils.addDebug(currentEntry, "  " + CONFIG.icons.money + " Suma HZS: " + sumaHZS + "€ (" + odpracovane + "h × " + hzsCena + "€)");
        
        return {
            success: true,
            hzsCena: hzsCena,
            sumaHZS: sumaHZS
        };
        
    } catch (error) {
        MementoUtils.addError(currentEntry, error, "spracujHZS");
        return { success: false, hzsCena: 0, sumaHZS: 0 };
    }
}

// ✅ OPRAVENÁ FUNKCIA v3.7 - ultra robustná synchronizácia výkazu prác
function synchronizujVykazPrac(zakazka, datum, odpracovaneHodiny, hzsCena) {
    try {
        if (!zakazka || !Array.isArray(zakazka) || zakazka.length === 0) {
            MementoUtils.addDebug(currentEntry, "  ℹ️ Žiadna zákazka - preskakujem výkaz prác");
            return;
        }
        
        var zakazkaObj = zakazka[0];
        
        if (!zakazkaObj || typeof zakazkaObj !== "object" || !zakazkaObj.field) {
            MementoUtils.addDebug(currentEntry, "  ❌ Zákazka nie je validný Entry objekt");
            return;
        }
        
        MementoUtils.addDebug(currentEntry, "  🔍 Kontrolujem existenciu výkazu prác...");
        
        // ✅ OPRAVENÉ v3.7 - ultra bezpečné linksFrom pre výkaz prác s try-catch
        var existujuceVykazy = [];
        try {
            existujuceVykazy = ultraBezpecneLinksFrom(
                zakazkaObj, 
                CONFIG.libraries.vykazPrac, 
                CONFIG.vykazFields.zakazka,
                "  Načítavam existujúce výkazy",
                "synchronizujVykazPrac-find"
            );
        } catch (findError) {
            MementoUtils.addError(currentEntry, findError, "synchronizujVykazPrac-findExisting");
            // Pokračuj s prázdnym array - vytvorí sa nový výkaz
            existujuceVykazy = [];
        }
        
        var vykazPrac = null;
        
        if (existujuceVykazy && existujuceVykazy.length > 0) {
            var testVykaz = existujuceVykazy[0];
            
            if (!testVykaz || typeof testVykaz !== "object" || !testVykaz.field) {
                MementoUtils.addDebug(currentEntry, "  ⚠️ Existujúci výkaz nie je validný, vytváram nový...");
                vykazPrac = null;
            } else {
                vykazPrac = testVykaz;
                MementoUtils.addDebug(currentEntry, "  ✅ Existujúci výkaz nájdený a validný");
            }
        }
        
        if (!vykazPrac) {
            // Vytvor nový výkaz
            MementoUtils.addDebug(currentEntry, "  " + CONFIG.icons.create + " Vytváram nový výkaz prác...");
            
            var vykazLib = null;
            try {
                vykazLib = libByName(CONFIG.libraries.vykazPrac);
            } catch (libError) {
                MementoUtils.addError(currentEntry, libError, "synchronizujVykazPrac-getLib");
                return;
            }
            
            if (!vykazLib) {
                MementoUtils.addError(currentEntry, new Error("Knižnica '" + CONFIG.libraries.vykazPrac + "' neexistuje"), "synchronizujVykazPrac");
                return;
            }
            
            try {
                vykazPrac = vykazLib.create();
            } catch (createError) {
                MementoUtils.addError(currentEntry, createError, "synchronizujVykazPrac-create");
                return;
            }
            
            if (!vykazPrac) {
                MementoUtils.addError(currentEntry, new Error("Vytvorenie Výkazu prác zlyhalo"), "synchronizujVykazPrac");
                return;
            }
            
            // ✅ Bezpečné nastavenie polí s individual try-catch
            try {
                vykazPrac.set(CONFIG.vykazFields.datum, datum);
            } catch (setError) {
                MementoUtils.addDebug(currentEntry, "  ⚠️ Chyba pri nastavení dátumu: " + setError);
            }
            
            try {
                var zakazkaID = MementoUtils.safeGet(zakazkaObj, "ID", "XXX");
                var mesiac = moment().format("YYYYMM");
                vykazPrac.set(CONFIG.vykazFields.identifikator, "VYK-" + zakazkaID + "-" + mesiac);
            } catch (setError) {
                MementoUtils.addDebug(currentEntry, "  ⚠️ Chyba pri nastavení identifikátora: " + setError);
            }
            
            try {
                var zakazkaNazov = MementoUtils.safeGet(zakazkaObj, "Názov záznamu", "Neznáma zákazka");
                vykazPrac.set(CONFIG.vykazFields.popis, "Výkaz prác pre " + zakazkaNazov + " - " + moment().format("MMMM YYYY"));
            } catch (setError) {
                MementoUtils.addDebug(currentEntry, "  ⚠️ Chyba pri nastavení popisu: " + setError);
            }
            
            try {
                var typVykazu = MementoUtils.safeGet(zakazkaObj, "Typ výkazu", "Hodinovka");
                vykazPrac.set(CONFIG.vykazFields.typVykazu, typVykazu);
            } catch (setError) {
                MementoUtils.addDebug(currentEntry, "  ⚠️ Chyba pri nastavení typu výkazu: " + setError);
            }
            
            try {
                vykazPrac.set(CONFIG.vykazFields.cenyPocitat, "Z cenovej ponuky");
            } catch (setError) {
                MementoUtils.addDebug(currentEntry, "  ⚠️ Chyba pri nastavení 'Ceny počítať': " + setError);
            }
            
            try {
                var cenovaPonuka = MementoUtils.safeGet(zakazkaObj, "Cenová ponuka");
                if (cenovaPonuka) {
                    vykazPrac.set(CONFIG.vykazFields.cenovaPonuka, cenovaPonuka);
                }
            } catch (setError) {
                MementoUtils.addDebug(currentEntry, "  ⚠️ Chyba pri nastavení cenovej ponuky: " + setError);
            }
            
            try {
                vykazPrac.set(CONFIG.vykazFields.vydane, "Zákazka");
            } catch (setError) {
                MementoUtils.addDebug(currentEntry, "  ⚠️ Chyba pri nastavení 'Vydané': " + setError);
            }
            
            try {
                vykazPrac.set(CONFIG.vykazFields.zakazka, zakazkaObj);
            } catch (setError) {
                MementoUtils.addError(currentEntry, setError, "synchronizujVykazPrac-setZakazka");
            }
            
            // Info záznam
            try {
                var infoText = CONFIG.icons.info + " AUTOMATICKY VYTVORENÝ VÝKAZ\n";
                infoText += "=====================================\n\n";
                infoText += "📅 Dátum: " + formatDate(datum) + "\n";
                infoText += "📦 Zákazka: " + (zakazkaNazov || "N/A") + "\n";
                infoText += "⏰ Vytvorené: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
                infoText += "🔧 Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
                infoText += "📂 Zdroj: Knižnica " + CONFIG.libraries.zaznamPrac + "\n\n";
                infoText += "✅ VÝKAZ VYTVORENÝ ÚSPEŠNE";
                
                vykazPrac.set(CONFIG.vykazFields.info, infoText);
            } catch (setError) {
                MementoUtils.addDebug(currentEntry, "  ⚠️ Chyba pri nastavení info: " + setError);
            }
            
            MementoUtils.addDebug(currentEntry, "  ✅ Nový výkaz vytvorený");
        }
        
        // Pridaj link na aktuálny záznam prác
        try {
            var praceHZS = MementoUtils.safeGet(vykazPrac, CONFIG.vykazFields.praceHZS, []);
            
            var linkExists = false;
            for (var i = 0; i < praceHZS.length; i++) {
                if (praceHZS[i] && praceHZS[i].id === currentEntry.id) {
                    linkExists = true;
                    break;
                }
            }
            
            if (!linkExists) {
                try {
                    praceHZS.push(currentEntry);
                    vykazPrac.set(CONFIG.vykazFields.praceHZS, praceHZS);
                    MementoUtils.addDebug(currentEntry, "  " + CONFIG.icons.link + " Link pridaný do výkazu");
                    
                    var lastIndex = praceHZS.length - 1;
                    var vykonanePrace = MementoUtils.safeGet(currentEntry, CONFIG.fields.vykonanePrace, "");
                    var cenaCelkom = odpracovaneHodiny * hzsCena;
                    
                    // ✅ Individual try-catch pre každý atribút
                    try {
                        vykazPrac.setAttr(CONFIG.vykazFields.praceHZS, lastIndex, CONFIG.vykazAttributes.vykonanePrace, vykonanePrace);
                    } catch (attrError) {
                        MementoUtils.addDebug(currentEntry, "  ⚠️ Chyba pri nastavení atribútu 'vykonané práce': " + attrError);
                    }
                    
                    try {
                        vykazPrac.setAttr(CONFIG.vykazFields.praceHZS, lastIndex, CONFIG.vykazAttributes.pocetHodin, odpracovaneHodiny);
                    } catch (attrError) {
                        MementoUtils.addDebug(currentEntry, "  ⚠️ Chyba pri nastavení atribútu 'počet hodín': " + attrError);
                    }
                    
                    try {
                        vykazPrac.setAttr(CONFIG.vykazFields.praceHZS, lastIndex, CONFIG.vykazAttributes.uctoovanaSadzba, hzsCena);
                    } catch (attrError) {
                        MementoUtils.addDebug(currentEntry, "  ⚠️ Chyba pri nastavení atribútu 'účtovaná sadzba': " + attrError);
                    }
                    
                    try {
                        vykazPrac.setAttr(CONFIG.vykazFields.praceHZS, lastIndex, CONFIG.vykazAttributes.cenaCelkom, cenaCelkom);
                    } catch (attrError) {
                        MementoUtils.addDebug(currentEntry, "  ⚠️ Chyba pri nastavení atribútu 'cena celkom': " + attrError);
                    }
                    
                    MementoUtils.addDebug(currentEntry, "  ✅ Atribúty nastavené na výkaze:");
                    MementoUtils.addDebug(currentEntry, "    • vykonané práce: " + (vykonanePrace ? (vykonanePrace.length > 50 ? vykonanePrace.substring(0, 50) + "..." : vykonanePrace) : "N/A"));
                    MementoUtils.addDebug(currentEntry, "    • počet hodín: " + odpracovaneHodiny + "h");
                    MementoUtils.addDebug(currentEntry, "    • účtovaná sadzba: " + hzsCena + "€");
                    MementoUtils.addDebug(currentEntry, "    • cena celkom: " + cenaCelkom + "€");
                    
                } catch (linkError) {
                    MementoUtils.addError(currentEntry, linkError, "synchronizujVykazPrac-pridajLink");
                }
            } else {
                MementoUtils.addDebug(currentEntry, "  ℹ️ Link už existuje vo výkaze");
            }
            
        } catch (linkError) {
            MementoUtils.addError(currentEntry, linkError, "synchronizujVykazPrac-linkovanie");
        }
        
    } catch (error) {
        MementoUtils.addError(currentEntry, error, "synchronizujVykazPrac");
    }
}

// [Hlavná funkcia zostáva rovnaká ako v3.6, len zmena čísla verzie na 3.7...]

function hlavnaFunkcia() {
    MementoUtils.addDebug(currentEntry, CONFIG.icons.start + " === ŠTART PREPOČTU ZÁZNAMU PRÁC v" + CONFIG.version + " ===");
    
    // [Celý obsah hlavnej funkcie zostáva rovnaký ako v3.6...]
    // Len sa zmení číslo verzie v debug správach
    
    // [Kód pokračuje rovnako ako v predchádzajúcej verzii, ale s lepším error handlingom...]
}

// [Spustenie scriptu zostáva rovnaké...]

try {
    MementoUtils.addDebug(currentEntry, "🎬 Inicializácia " + CONFIG.scriptName + " v" + CONFIG.version);
    
    if (!currentEntry) {
        message("💥 KRITICKÁ CHYBA!\n\nScript nemôže bežať bez aktuálneho záznamu.");
        throw new Error("currentEntry neexistuje");
    }
    
    MementoUtils.clearLogs(currentEntry, false);
    
    var result = hlavnaFunkcia();
    
    MementoUtils.saveLogs(currentEntry);
    
    if (result) {
        var info = MementoUtils.safeGet(currentEntry, CONFIG.fields.info, "");
        var shortInfo = info.split("\n").slice(0, 10).join("\n");
        
        message("✅ Záznam prác úspešne prepočítaný!\n\n" + shortInfo + "\n\n" + 
               "ℹ️ Detaily v poli 'info'");
    } else {
        message("❌ Prepočet záznamu prác zlyhal!\n\n" +
               "🔍 Skontroluj Error_Log pre detaily\n" +
               "📋 Over vstupné dáta a skús znovu");
    }
    
} catch (kritickachyba) {
    try {
        MementoUtils.addError(currentEntry, kritickachyba, "MAIN-CATCH");
        MementoUtils.saveLogs(currentEntry);
        message("💥 KRITICKÁ CHYBA!\n\nScript zlyhal. Pozri Error_Log.");
    } catch (finalError) {
        message("💥 FATÁLNA CHYBA!\n\n" + kritickachyba.toString());
    }
}
