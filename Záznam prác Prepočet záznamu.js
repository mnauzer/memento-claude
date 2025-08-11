// ==============================================
// MEMENTO DATABASE - PREPOČET MIEZD A ODPRACOVANÉHO ČASU
// ==============================================
// Knižnica: Záznam prác
// Účel: Prepočet pracovnej doby, odpracovaných hodín, mzdových nákladov a HZS
// 
// POLIA V KNIŽNICI "Záznam prác":
// - Zamestnanci (Link to Entry) - zoznam zamestnancov na práci
// - Dátum (Date) - dátum práce
// - Od (Time) - začiatok práce  
// - Do (Time) - koniec práce
// - Pracovná doba (Duration) - vypočítaná doba práce jedného človeka
// - Odpracované (Duration) - celkové hodiny všetkých zamestnancov
// - Počet pracovníkov (Number) - počet zamestnancov
// - Mzdové náklady (Number) - celkové mzdy v EUR
// - Hodinová zúčtovacia sadzba (Link to Entry) - odkaz na Cenník prác
// - Suma HZS (Number) - celková suma hodinovej zúčtovacej sadzby
// - Debug_Log (Text) - debug informácie
// - Error_Log (Text) - chyby a problémy
// 
// LINKED KNIŽNICE:
// - "sadzby zamestnancov": Zamestnanec, Platnosť od, Sadzba
// - "Cenník prác": Cena bez DPH
// - "ceny prác": Práca (Link to Entry), Platnosť od, Cena  
// - "ASISTANTO Defaults": Default HZS
// ==============================================

// Konfigurácia scriptu
var CONFIG = {
    // Debug nastavenia
    debug: true,
    debugFieldName: "Debug_Log",
    errorFieldName: "Error_Log",
    
    // Názvy knižníc
    sadzbyLibrary: "sadzby zamestnancov",
    cennikPracLibrary: "Cenník prác",
    cenyPracLibrary: "ceny prác",
    defaultsLibrary: "ASISTANTO Defaults",
    
    // Názvy polí - knižnica "Záznam prác"
    fields: {
        zamestnanci: "Zamestnanci",
        datum: "Dátum",
        od: "Od", 
        do: "Do",
        pracovnaDoba: "Pracovná doba",
        odpracovane: "Odpracované",
        pocetPracovnikov: "Počet pracovníkov",
        mzdy: "Mzdové náklady",
        hodinovaZuctovacia: "Hodinová zúčtovacia sadzba",
        sumaHZS: "Suma HZS"
    },
    
    // Názvy polí - knižnica "sadzby zamestnancov"
    sadzbyFields: {
        zamestnanec: "Zamestnanec",
        platnostOd: "Platnosť od",
        sadzba: "Sadzba"
    },
    
    // Názvy polí - knižnica "Cenník prác"
    cennikFields: {
        cenaBezDPH: "Cena bez DPH"
    },
    
    // Názvy polí - knižnica "ceny prác"
    cenyFields: {
        praca: "Práca",
        platnostOd: "Platnosť od",
        cena: "Cena"
    },
    
    // Názvy polí - knižnica "ASISTANTO Defaults"
    defaultsFields: {
        defaultHZS: "Default HZS"
    }
};

// Globálne premenné pre logging
var debugLog = [];
var errorLog = [];

// Debug a error logging funkcie
function addDebug(message) {
    if (CONFIG.debug) {
        var timestamp = moment().format("DD.MM.YY HH:mm");
        debugLog.push("[" + timestamp + "] " + message);
    }
}

function addError(message, location) {
    var timestamp = moment().format("DD.MM.YY HH:mm");
    var prefix = location ? "[" + location + "] " : "";
    errorLog.push("[" + timestamp + "] ❌ " + prefix + message);
}

function saveLogs() {
    var currentEntry = entry();
    
    // Vždy prepíš oba logy (aj keď sú prázdne)
    try {
        currentEntry.set(CONFIG.debugFieldName, debugLog.join("\n"));
    } catch (e) {
        // Ignoruj chybu ukladania debug logu
    }
    
    try {
        currentEntry.set(CONFIG.errorFieldName, errorLog.join("\n"));
    } catch (e) {
        // Ignoruj chybu ukladania error logu  
    }
}

// Funkcia pre spracovanie hodinovej zúčtovacej sadzby
function spracujHodinovuZuctovacuSadzbu(currentEntry, datum, odpracovaneHodiny) {
    addDebug("💰 === SPRACOVANIE HODINOVEJ ZÚČTOVACEJ SADZBY ===");
    
    var hzsSuccess = false;
    var finalnaCena = 0;
    
    // Získaj HZS pole
    var hzsPole = currentEntry.field(CONFIG.fields.hodinovaZuctovacia);
    
    if (!hzsPole || hzsPole.length === 0) {
        addDebug("⚠️ HZS nie je linknuté, používam default");
        
        // Získaj default HZS
        try {
            var defaultsLib = libByName(CONFIG.defaultsLibrary);
            if (defaultsLib) {
                var defaultEntry = defaultsLib.lastEntry();
                if (defaultEntry) {
                    var defaultHZS = defaultEntry.field(CONFIG.defaultsFields.defaultHZS);
                    if (defaultHZS && defaultHZS.length > 0) {
                        // Linkni default HZS
                        currentEntry.set(CONFIG.fields.hodinovaZuctovacia, defaultHZS);
                        addDebug("✅ Default HZS linknuté");
                        
                        // DÔLEŽITÉ: Znovu načítaj pole z currentEntry po linknutí
                        try {
                            hzsPole = currentEntry.field(CONFIG.fields.hodinovaZuctovacia);
                            if (hzsPole && hzsPole.length > 0) {
                                addDebug("✅ HZS pole znovu načítané po linknutí");
                            } else {
                                addError("HZS pole je prázdne aj po linknutí", "spracujHZS_reload");
                            }
                        } catch (reloadError) {
                            addError("Chyba pri znovu načítaní HZS: " + reloadError.toString(), "spracujHZS_reload");
                        }
                    } else {
                        addError("Default HZS pole je prázdne", "spracujHZS_default");
                    }
                } else {
                    addError("Defaults knižnica je prázdna", "spracujHZS_default");
                }
            } else {
                addError("Defaults knižnica neexistuje", "spracujHZS_default");
            }
        } catch (defaultError) {
            addError("Chyba pri získavaní default HZS: " + defaultError.toString(), "spracujHZS_default");
        }
    }
    
    if (hzsPole && hzsPole.length > 0) {
        var hzsZaznam = hzsPole[0]; // Prvý linknutý záznam
        
        try {
            addDebug("📋 Spracovávam HZS záznam...");
            
            // Skontroluj existujúcu cenu v atribúte
            var existujucaCena = null;
            try {
                existujucaCena = hzsZaznam.getAttr("cena");
                if (existujucaCena) {
                    addDebug("📌 Existujúca cena v atribúte: " + existujucaCena + " €");
                }
            } catch (attrError) {
                addDebug("🔍 Žiadna existujúca cena v atribúte");
            }
            
            // Získaj ceny cez linksFrom
            addDebug("🔍 Hľadám ceny cez linksFrom...");
            var ceny = null;
            var linksFromSuccess = false;
            
            try {
                // linksFrom(knižnica, názov_poľa_v_tej_knižnici)
                // Pole "Práca" v knižnici "ceny prác" odkazuje na knižnicu "Cenník prác"
                ceny = hzsZaznam.linksFrom(CONFIG.cenyPracLibrary, CONFIG.cenyFields.praca);
                if (ceny && ceny.length > 0) {
                    addDebug("✅ Našiel " + ceny.length + " cien");
                    linksFromSuccess = true;
                } else {
                    addError("HZS záznam nemá žiadne ceny", "spracujHZS_linksFrom");
                }
            } catch (linksError) {
                addError("LinksFrom zlyhalo pre HZS: " + linksError.toString(), "spracujHZS_linksFrom");
            }
            
            if (linksFromSuccess) {
                // Nájdi najnovšiu platnú cenu k dátumu
                var najnovsiaCena = null;
                var najnovsiDatum = null;
                
                addDebug("📋 Analyzujem ceny k dátumu " + moment(datum).format("DD.MM.YYYY") + ":");
                
                for (var k = 0; k < ceny.length; k++) {
                    var cenaEntry = ceny[k];
                    
                    if (!cenaEntry) {
                        addDebug("    ⚠️ Cena " + k + " je null");
                    } else {
                        try {
                            var platnostOd = cenaEntry.field(CONFIG.cenyFields.platnostOd);
                            var cena = cenaEntry.field(CONFIG.cenyFields.cena);
                            
                            addDebug("    📋 Cena " + k + ": " + cena + " € od " + 
                                    (platnostOd ? moment(platnostOd).format("DD.MM.YYYY") : "?"));
                            
                            if (platnostOd && cena && platnostOd <= datum) {
                                if (!najnovsiDatum || platnostOd > najnovsiDatum) {
                                    najnovsiDatum = platnostOd;
                                    najnovsiaCena = cena;
                                    addDebug("    ✅ Najnovšia platná cena: " + cena + " €");
                                }
                            } else {
                                addDebug("    ❌ Cena neplatná k dátumu");
                            }
                        } catch (cenaFieldError) {
                            addDebug("    ⚠️ Chyba pri čítaní ceny " + k + ": " + cenaFieldError.toString());
                        }
                    }
                }
                
                if (!najnovsiaCena || najnovsiaCena <= 0) {
                    addError("Nenašla sa platná cena pre HZS k dátumu", "spracujHZS_validacia");
                } else {
                    addDebug("💶 Finálna HZS cena: " + najnovsiaCena + " €");
                    finalnaCena = najnovsiaCena;
                    
                    // Nastav cenu do atribútu HZS záznamu
                    try {
                        hzsZaznam.setAttr("cena", najnovsiaCena);
                        addDebug("💾 Atribút cena nastavený do HZS záznamu");
                        
                        // Over nastavenie
                        var kontrolaCeny = hzsZaznam.getAttr("cena");
                        if (kontrolaCeny) {
                            addDebug("✅ Overenie HZS atribútu: " + kontrolaCeny + " €");
                        } else {
                            addDebug("⚠️ HZS atribút getAttr() vrátilo null");
                        }
                    } catch (hzsAttrError) {
                        addError("setAttr() cena do HZS zlyhalo: " + hzsAttrError.toString(), "spracujHZS_setAttr");
                    }
                    
                    // Nastav cenu do Cenník prác pole "Cena bez DPH"
                    try {
                        hzsZaznam.set(CONFIG.cennikFields.cenaBezDPH, najnovsiaCena);
                        addDebug("💾 Cena bez DPH nastavená v Cenníku prác: " + najnovsiaCena + " €");
                    } catch (cennikSetError) {
                        addError("Nepodarilo sa nastaviť Cena bez DPH: " + cennikSetError.toString(), "spracujHZS_cennikSet");
                    }
                    
                    hzsSuccess = true;
                }
            }
            
        } catch (hzsError) {
            addError("Chyba pri spracovaní HZS: " + hzsError.toString(), "spracujHZS_general");
        }
    } else {
        addError("Nepodarilo sa získať ani default HZS", "spracujHZS_noHZS");
    }
    
    // Vypočítaj Suma HZS
    if (hzsSuccess && finalnaCena > 0) {
        var sumaHZS = finalnaCena * odpracovaneHodiny;
        addDebug("📊 Suma HZS: " + finalnaCena + " € × " + odpracovaneHodiny.toFixed(2) + " h = " + sumaHZS.toFixed(2) + " €");
        
        try {
            currentEntry.set(CONFIG.fields.sumaHZS, Math.round(sumaHZS * 100) / 100);
            addDebug("💾 Suma HZS uložená: " + sumaHZS.toFixed(2) + " €");
        } catch (sumaError) {
            addError("Nepodarilo sa uložiť Sumu HZS: " + sumaError.toString(), "spracujHZS_sumaSet");
        }
    } else {
        addDebug("❌ HZS sa nepodarilo spracovať, Suma HZS = 0");
        try {
            currentEntry.set(CONFIG.fields.sumaHZS, 0);
            addDebug("💾 Suma HZS nastavená na 0");
        } catch (sumaError) {
            addError("Nepodarilo sa nastaviť Sumu HZS na 0: " + sumaError.toString(), "spracujHZS_suma0");
        }
    }
    
    return hzsSuccess;
}

// Hlavná funkcia scriptu
function hlavnaFunkcia() {
    addDebug("🚀 === ŠTART PREPOČTU MIEZD ===");
    
    var currentEntry = entry();
    var globalSuccess = false;
    
    // Vymaž predchádzajúce logy hneď na začiatku
    currentEntry.set(CONFIG.debugFieldName, "");
    currentEntry.set(CONFIG.errorFieldName, "");
    addDebug("🧹 Vymazané predchádzajúce logy");
    
    // KROK 1: Získaj základné údaje
    addDebug("📋 KROK 1: Získavam základné údaje...");
    
    var datum = currentEntry.field(CONFIG.fields.datum);
    var casOd = currentEntry.field(CONFIG.fields.od);
    var casDo = currentEntry.field(CONFIG.fields.do);
    var zamestnanci = currentEntry.field(CONFIG.fields.zamestnanci);
    
    addDebug("  📅 Dátum: " + (datum ? moment(datum).format("DD.MM.YYYY") : "CHÝBA"));
    addDebug("  🕐 Od: " + (casOd ? moment(casOd).format("HH:mm") : "CHÝBA"));
    addDebug("  🕐 Do: " + (casDo ? moment(casDo).format("HH:mm") : "CHÝBA"));
    addDebug("  👥 Zamestnanci: " + (zamestnanci ? zamestnanci.length + " zamestnancov" : "CHÝBA"));
    
    // Základná validácia
    var basicDataValid = false;
    if (!datum) {
        addError("Dátum nie je vyplnený", "krok1");
    } else if (!casOd) {
        addError("Od nie je vyplnené", "krok1");
    } else if (!casDo) {
        addError("Do nie je vyplnené", "krok1");
    } else if (!zamestnanci || zamestnanci.length === 0) {
        addError("Zamestnanci nie sú vyplnení", "krok1");
    } else {
        addDebug("✅ Základné údaje sú v poriadku - " + zamestnanci.length + " zamestnancov");
        basicDataValid = true;
    }
    
    if (basicDataValid) {
        // KROK 2: Vypočítaj pracovnú dobu
        addDebug("⏰ KROK 2: Počítam pracovnú dobu...");
        
        var pracovnaDobaHodiny = 0;
        var pracovnaDobaValid = false;
        
        try {
            var odMs = casOd;
            var doMs = casDo;
            
            addDebug("  🕐 Od ms: " + moment(odMs).format("HH:mm"));
            addDebug("  🕐 Do ms: " + moment(doMs).format("HH:mm"));
            
            // Ak je do menšie ako od, ide o prácu cez polnoc
            if (doMs < odMs) {
                doMs += 24 * 60 * 60 * 1000; // Pridaj 24 hodín
                addDebug("  🌙 Práca cez polnoc - pridal som 24 hodín");
            }
            
            var rozdielMs = doMs - odMs;
            pracovnaDobaHodiny = rozdielMs / (1000 * 60 * 60);
            
            addDebug("  ⏱️ Pracovná doba: " + pracovnaDobaHodiny.toFixed(2) + " h");
            
            if (pracovnaDobaHodiny > 0 && pracovnaDobaHodiny <= 24) {
                try {
                    currentEntry.set(CONFIG.fields.pracovnaDoba, pracovnaDobaHodiny);
                    addDebug("  💾 Pracovná doba uložená: " + pracovnaDobaHodiny.toFixed(2) + " h");
                    pracovnaDobaValid = true;
                } catch (saveError) {
                    addError("Nepodarilo sa uložiť pracovnú dobu: " + saveError.toString(), "krok2");
                }
            } else {
                addError("Neplatná pracovná doba: " + pracovnaDobaHodiny.toFixed(2) + " h", "krok2");
            }
            
        } catch (error) {
            addError("Chyba pri výpočte pracovnej doby: " + error.toString(), "krok2");
        }
        
        if (pracovnaDobaValid) {
            // KROK 3: Vypočítaj odpracované hodiny a počet pracovníkov
            addDebug("📊 KROK 3: Počítam odpracované hodiny a počet pracovníkov...");
            
            var pocetZamestnancov = zamestnanci.length;
            var odpracovaneHodiny = pracovnaDobaHodiny * pocetZamestnancov;
            
            addDebug("  👥 Počet pracovníkov: " + pocetZamestnancov);
            addDebug("  📊 Odpracované: " + pracovnaDobaHodiny.toFixed(2) + " h × " + pocetZamestnancov + " = " + odpracovaneHodiny.toFixed(2) + " h");
            
            // Ulož počet pracovníkov
            try {
                currentEntry.set(CONFIG.fields.pocetPracovnikov, pocetZamestnancov);
                addDebug("  💾 Počet pracovníkov uložený: " + pocetZamestnancov);
            } catch (error) {
                addError("Nepodarilo sa uložiť počet pracovníkov: " + error.toString(), "krok3_pocet");
            }
            
            // Ulož odpracované hodiny
            try {
                currentEntry.set(CONFIG.fields.odpracovane, odpracovaneHodiny);
                addDebug("  💾 Odpracované uložené: " + odpracovaneHodiny.toFixed(2) + " h");
            } catch (error) {
                addError("Nepodarilo sa uložiť odpracované hodiny: " + error.toString(), "krok3_odpracovane");
            }
            
            // KROK 4: Spracuj zamestnancov a vypočítaj mzdy
            addDebug("💰 KROK 4: Spracúvam zamestnancov...");
            
            var celkoveMzdy = 0;
            var uspesneSpracovani = 0;
            var chyby = 0;
            var hodinovkyZamestnancov = []; // Lokálne uloženie hodinoviek namiesto atribútov
            
            // Iteruj cez každého zamestnanca
            for (var i = 0; i < zamestnanci.length; i++) {
                addDebug("\n--- Zamestnanec " + (i + 1) + "/" + zamestnanci.length + " ---");
                
                var zamestnanec = zamestnanci[i];
                
                if (!zamestnanec) {
                    addError("Zamestnanec na pozícii " + i + " je null", "krok4_zamestnanec_" + i);
                    chyby++;
                    hodinovkyZamestnancov[i] = 0; // Nastav 0 pre null zamestnancov
                } else {
                    try {
                        // Získaj meno zamestnanca
                        var menoZamestnanca = "Neznámy";
                        try {
                            var tempMeno = zamestnanec.field("Meno");
                            if (tempMeno) {
                                menoZamestnanca = tempMeno;
                            }
                        } catch (menoError) {
                            addDebug("  ⚠️ Nepodarilo sa získať meno");
                        }
                        
                        addDebug("  👤 " + menoZamestnanca);
                        
                        // Inicializuj hodinovku pre tohto zamestnanca
                        hodinovkyZamestnancov[i] = 0;
                        
                        // Nájdi sadzby zamestnanca pomocou linksFrom
                        addDebug("  🔍 Hľadám sadzby cez linksFrom...");
                        var sadzby = null;
                        var linksFromSuccess = false;
                        
                        try {
                            sadzby = zamestnanec.linksFrom(CONFIG.sadzbyLibrary, CONFIG.sadzbyFields.zamestnanec);
                            if (sadzby && sadzby.length > 0) {
                                addDebug("  ✅ Našiel " + sadzby.length + " sadzieb");
                                linksFromSuccess = true;
                            } else {
                                addError("Zamestnanec " + menoZamestnanca + " nemá sadzby", "krok4_linksFrom_zamestnanec_" + i);
                                chyby++;
                            }
                        } catch (linksError) {
                            addError("LinksFrom zlyhalo pre " + menoZamestnanca + ": " + linksError.toString(), "krok4_linksFrom_zamestnanec_" + i);
                            chyby++;
                        }
                        
                        if (linksFromSuccess) {
                            // Nájdi najnovšiu platnú sadzbu k dátumu
                            var aktualnaHodinovka = null;
                            var najnovsiDatum = null;
                            
                            addDebug("  📋 Analyzujem sadzby k dátumu " + moment(datum).format("DD.MM.YYYY") + ":");
                            
                            for (var j = 0; j < sadzby.length; j++) {
                                var sadzbaEntry = sadzby[j];
                                
                                if (!sadzbaEntry) {
                                    addDebug("    ⚠️ Sadzba " + j + " je null");
                                } else {
                                    try {
                                        var platnostOd = sadzbaEntry.field(CONFIG.sadzbyFields.platnostOd);
                                        var hodinovka = sadzbaEntry.field(CONFIG.sadzbyFields.sadzba);
                                        
                                        addDebug("    📋 Sadzba " + j + ": " + hodinovka + " €/h od " + 
                                                (platnostOd ? moment(platnostOd).format("DD.MM.YYYY") : "?"));
                                        
                                        if (platnostOd && hodinovka && platnostOd <= datum) {
                                            if (!najnovsiDatum || platnostOd > najnovsiDatum) {
                                                najnovsiDatum = platnostOd;
                                                aktualnaHodinovka = hodinovka;
                                                addDebug("    ✅ Najnovšia platná sadzba: " + hodinovka + " €/h");
                                            }
                                        } else {
                                            addDebug("    ❌ Sadzba neplatná k dátumu");
                                        }
                                    } catch (sadzbaFieldError) {
                                        addDebug("    ⚠️ Chyba pri čítaní sadzby " + j + ": " + sadzbaFieldError.toString());
                                    }
                                }
                            }
                            
                            if (!aktualnaHodinovka || aktualnaHodinovka <= 0) {
                                addError("Nenašla sa platná sadzba pre " + menoZamestnanca + " k dátumu", "krok4_sadzba_zamestnanec_" + i);
                                chyby++;
                            } else {
                                addDebug("  💶 Finálna hodinovka: " + aktualnaHodinovka + " €/h");
                                
                                // Ulož hodinovku do lokálneho poľa
                                hodinovkyZamestnancov[i] = aktualnaHodinovka;
                                addDebug("  💾 Hodinovka uložená: " + aktualnaHodinovka + " €/h");
                                
                                // Vypočítaj mzdu pre tohto zamestnanca
                                var mzdaZamestnanca = aktualnaHodinovka * pracovnaDobaHodiny;
                                addDebug("  💰 Mzda: " + aktualnaHodinovka + " €/h × " + pracovnaDobaHodiny.toFixed(2) + " h = " + mzdaZamestnanca.toFixed(2) + " €");
                                
                                // Priebežne pripočítaj k celkovým mzdám
                                celkoveMzdy += mzdaZamestnanca;
                                uspesneSpracovani++;
                            }
                        }
                        
                    } catch (zamestnanecError) {
                        addError("Chyba pri spracovaní zamestnanca " + (i + 1) + ": " + zamestnanecError.toString(), "krok4_general_zamestnanec_" + i);
                        chyby++;
                    }
                }
            }
            
            // KROK 5: Ulož celkové mzdy
            addDebug("\n🎯 KROK 5: Finalizácia mzdových nákladov...");
            addDebug("  ✅ Úspešne spracovaných: " + uspesneSpracovani + "/" + zamestnanci.length);
            addDebug("  ❌ Chýb: " + chyby);
            addDebug("  💰 Celkové mzdové náklady: " + celkoveMzdy.toFixed(2) + " €");
            
            try {
                var finalMzdy = Math.round(celkoveMzdy * 100) / 100;
                currentEntry.set(CONFIG.fields.mzdy, finalMzdy);
                addDebug("  💾 Mzdové náklady uložené: " + finalMzdy + " €");
                globalSuccess = true;
            } catch (saveError) {
                addError("Nepodarilo sa uložiť mzdové náklady: " + saveError.toString(), "krok5");
            }
            
            // KROK 6: Spracuj hodinovú zúčtovaciu sadzbu
            addDebug("\n💰 KROK 6: Spracúvam hodinovú zúčtovaciu sadzbu...");
            var hzsSuccess = spracujHodinovuZuctovacuSadzbu(currentEntry, datum, odpracovaneHodiny);
            
            if (hzsSuccess) {
                addDebug("✅ Hodinová zúčtovacia sadzba úspešne spracovaná");
            } else {
                addDebug("⚠️ Spracovanie hodinovej zúčtovacej sadzby malo problémy");
            }
            
        } else {
            addDebug("❌ Pracovná doba nie je validná - prerušujem");
        }
    } else {
        addDebug("❌ Základné údaje nie sú validné - prerušujem");
    }
    
    // Finalizácia a správa používateľovi
    addDebug("🏁 === KONIEC PREPOČTU ===");
    
    saveLogs();
    
    var sumaHZS = 0;
    try {
        sumaHZS = currentEntry.field(CONFIG.fields.sumaHZS) || 0;
    } catch (hzsReadError) {
        sumaHZS = 0;
    }
    
    if (globalSuccess) {
        var sprava = "✅ Prepočet dokončený!\n";
        sprava += "💰 Mzdové náklady: " + celkoveMzdy.toFixed(2) + " €\n";
        sprava += "⏱️ Pracovná doba: " + pracovnaDobaHodiny.toFixed(2) + " h\n";
        sprava += "📊 Odpracované: " + odpracovaneHodiny.toFixed(2) + " h\n";
        sprava += "👥 Počet pracovníkov: " + pocetZamestnancov + "\n";
        sprava += "🏗️ Spracovaných: " + uspesneSpracovani + "/" + zamestnanci.length;
        
        if (sumaHZS > 0) {
            sprava += "\n💰 Suma HZS: " + sumaHZS.toFixed(2) + " €";
        }
        
        if (chyby > 0) {
            sprava += "\n⚠️ Chyby: " + chyby + " (pozrite Error_Log)";
        }
        
        message(sprava);
    } else {
        var chybovaSprava = "❌ Prepočet sa nepodaril!\n";
        if (errorLog.length > 0) {
            chybovaSprava += "Pozrite Error_Log pre detaily.";
        }
        message(chybovaSprava);
    }
}

// Spustenie scriptu
addDebug("=== INICIALIZÁCIA SCRIPTU ===");
addDebug("Timestamp: " + moment().format("DD.MM.YY HH:mm"));

try {
    hlavnaFunkcia();
} catch (kritickachyba) {
    addError("KRITICKÁ CHYBA: " + kritickachyba.toString(), "main");
    saveLogs();
    message("❌ KRITICKÁ CHYBA! Pozrite Error_Log.");
}