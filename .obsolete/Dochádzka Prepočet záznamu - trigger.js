// ==============================================
// MEMENTO DATABASE - PREPOČET DOCHÁDZKY S ZAOKRÚHĽOVANÍM
// ==============================================
// Knižnica: Záznam prác
// Účel: Prepočet pracovnej doby, odpracovaných hodín a mzdových nákladov s precíznym zaokrúhľovaním
// 
// POLIA V KNIŽNICI "Záznam prác":
// - Zamestnanci (Link to Entry) - zoznam zamestnancov na práci
// - Dátum (Date) - dátum práce
// - Príchod (Time) - začiatok práce (zaokrúhlené na 15min)
// - Odchod (Time) - koniec práce (zaokrúhlené na 15min)
// - Pracovná doba (Number) - vypočítaná doba práce jedného človeka (1 des. miesto)
// - Odpracované (Number) - celkové hodiny všetkých zamestnancov (1 des. miesto)
// - Počet pracovníkov (Number) - počet zamestnancov
// - Mzdové náklady (Number) - celkové mzdy v EUR
// - Debug_Log (Text) - debug informácie
// - Error_Log (Text) - chyby a problémy
// 
// LINKED KNIŽNICA: "sadzby zamestnancov"
// - Zamestnanec (Link to Entry) - odkaz na zamestnanca
// - Platnosť od (Date) - od kedy platí sadzba
// - Sadzba (Number) - hodinová sadzba v EUR
// ==============================================

// Konfigurácia scriptu
var CONFIG = {
    // Debug nastavenia
    debug: true,
    debugFieldName: "Debug_Log",
    errorFieldName: "Error_Log",
    
    // Názvy knižníc
    sadzbyLibrary: "sadzby zamestnancov",
    
    // Názvy polí - knižnica "Záznam prác"
    fields: {
        zamestnanci: "Zamestnanci",
        datum: "Dátum",
        prichod: "Príchod", 
        odchod: "Odchod",
        pracovnaDoba: "Pracovná doba",
        odpracovane: "Odpracované",
        pocetPracovnikov: "Počet pracovníkov",
        mzdy: "Mzdové náklady"
    },
    
    // Názvy polí - knižnica "sadzby zamestnancov"
    sadzbyFields: {
        zamestnanec: "Zamestnanec",
        platnostOd: "Platnosť od",
        sadzba: "Sadzba"
    },
    
    // Názvy polí - knižnica "Zamestnanci"
    zamestnancilFields: {
        meno: "Meno"
    }
};

// Globálne premenné pre logging
var debugLog = [];
var errorLog = [];

// ==============================================
// DEBUG A ERROR LOGGING SYSTÉM
// ==============================================

function addDebug(message) {
    if (CONFIG.debug) {
        var timestamp = moment().format("DD.MM.YY HH:mm:ss");
        debugLog.push("[" + timestamp + "] " + message);
    }
}

function addError(message, location) {
    var timestamp = moment().format("DD.MM.YY HH:mm:ss");
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

// ==============================================
// ZAOKRÚHĽOVACIE FUNKCIE
// ==============================================

function roundTimeToQuarter(timeMs) {
    // Zaokrúhli čas na 15 minút
    var minutes = timeMs / (1000 * 60);
    var roundedMinutes = Math.round(minutes / 15) * 15;
    return roundedMinutes * 60 * 1000;
}

function roundToOneDecimal(number) {
    // Zaokrúhli na 1 desatinné miesto
    return Math.round(number * 10) / 10;
}

function formatTimeDisplay(timeMs) {
    // Konvertuj ms na HH:MM pre debug
    var hours = Math.floor(timeMs / (1000 * 60 * 60));
    var minutes = Math.floor((timeMs % (1000 * 60 * 60)) / (1000 * 60));
    return hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0');
}

// ==============================================
// VALIDAČNÉ FUNKCIE
// ==============================================

function validateAndRoundTimes(currentEntry) {
    addDebug("⏰ === VALIDÁCIA A ZAOKRÚHĽOVANIE ČASOV ===");
    
    var prichod = currentEntry.field(CONFIG.fields.prichod);
    var odchod = currentEntry.field(CONFIG.fields.odchod);
    
    addDebug("📋 Originálne časy:");
    addDebug("  🕐 Príchod: " + (prichod ? formatTimeDisplay(prichod) : "CHÝBA"));
    addDebug("  🕐 Odchod: " + (odchod ? formatTimeDisplay(odchod) : "CHÝBA"));
    
    if (!prichod || !odchod) {
        addError("Príchod alebo Odchod nie je vyplnený", "validateAndRoundTimes");
        return null;
    }
    
    // Zaokrúhli časy na 15 minút
    var prichodRounded = roundTimeToQuarter(prichod);
    var odchodRounded = roundTimeToQuarter(odchod);
    
    addDebug("🔄 Zaokrúhlené časy:");
    addDebug("  🕐 Príchod: " + formatTimeDisplay(prichodRounded));
    addDebug("  🕐 Odchod: " + formatTimeDisplay(odchodRounded));
    
    // Ulož zaokrúhlené časy späť do polí
    try {
        currentEntry.set(CONFIG.fields.prichod, prichodRounded);
        currentEntry.set(CONFIG.fields.odchod, odchodRounded);
        addDebug("💾 Zaokrúhlené časy uložené");
    } catch (saveError) {
        addError("Nepodarilo sa uložiť zaokrúhlené časy: " + saveError.toString(), "validateAndRoundTimes");
        return null;
    }
    
    return {
        prichod: prichodRounded,
        odchod: odchodRounded
    };
}

function calculateWorkHours(prichodMs, odchodMs) {
    addDebug("📊 === VÝPOČET PRACOVNEJ DOBY ===");
    
    var odMs = odchodMs;
    var priMs = prichodMs;
    
    addDebug("  🕐 Príchod ms: " + priMs + " (" + formatTimeDisplay(priMs) + ")");
    addDebug("  🕐 Odchod ms: " + odMs + " (" + formatTimeDisplay(odMs) + ")");
    
    // Ak je odchod menší ako príchod, ide o prácu cez polnoc
    if (odMs < priMs) {
        odMs += 24 * 60 * 60 * 1000; // Pridaj 24 hodín
        addDebug("  🌙 Práca cez polnoc - pridal som 24 hodín");
    }
    
    var rozdielMs = odMs - priMs;
    var pracovnaDobaHodiny = rozdielMs / (1000 * 60 * 60);
    
    addDebug("  ⏱️ Surová pracovná doba: " + pracovnaDobaHodiny.toFixed(3) + " h");
    
    if (pracovnaDobaHodiny > 0 && pracovnaDobaHodiny <= 24) {
        // Zaokrúhli na 1 desatinné miesto
        var pracovnaDobaRounded = roundToOneDecimal(pracovnaDobaHodiny);
        addDebug("  🔄 Zaokrúhlená pracovná doba: " + pracovnaDobaRounded + " h");
        return pracovnaDobaRounded;
    } else {
        addError("Neplatná pracovná doba: " + pracovnaDobaHodiny.toFixed(2) + " h", "calculateWorkHours");
        return null;
    }
}

// ==============================================
// SPRACOVANIE ZAMESTNANCOV A SADZIEB
// ==============================================

function findValidSalary(zamestnanec, datum, menoZamestnanca) {
    addDebug("  🔍 Hľadám sadzby cez linksFrom...");
    
    var sadzby = null;
    var linksFromSuccess = false;
    
    try {
        sadzby = zamestnanec.linksFrom(CONFIG.sadzbyLibrary, CONFIG.sadzbyFields.zamestnanec);
        if (sadzby && sadzby.length > 0) {
            addDebug("  ✅ Našiel " + sadzby.length + " sadzieb");
            linksFromSuccess = true;
        } else {
            addError("Zamestnanec " + menoZamestnanca + " nemá sadzby", "findValidSalary");
            return null;
        }
    } catch (linksError) {
        addError("LinksFrom zlyhalo pre " + menoZamestnanca + ": " + linksError.toString(), "findValidSalary");
        return null;
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
            addError("Nenašla sa platná sadzba pre " + menoZamestnanca + " k dátumu", "findValidSalary");
            return null;
        } else {
            addDebug("  💶 Finálna hodinovka: " + aktualnaHodinovka + " €/h");
            return aktualnaHodinovka;
        }
    }
    
    return null;
}

function processEmployees(currentEntry, zamestnanci, datum, pracovnaDobaHodiny) {
    addDebug("👥 === SPRACOVANIE ZAMESTNANCOV S ATRIBÚTMI ===");
    
    var celkoveMzdy = 0;
    var uspesneSpracovani = 0;
    var chyby = 0;
    var hodinovkyZamestnancov = []; // Lokálne uloženie hodinoviek
    
    // Iteruj cez každého zamestnanca
    for (var i = 0; i < zamestnanci.length; i++) {
        addDebug("\n--- Zamestnanec " + (i + 1) + "/" + zamestnanci.length + " ---");
        
        var zamestnanec = zamestnanci[i];
        
        if (!zamestnanec) {
            addError("Zamestnanec na pozícii " + i + " je null", "processEmployees_zamestnanec_" + i);
            hodinovkyZamestnancov[i] = 0; // Nastav 0 pre null zamestnancov
            chyby++;
        } else {
            try {
                // Získaj meno zamestnanca
                var menoZamestnanca = "Neznámy";
                try {
                    var tempMeno = zamestnanec.field(CONFIG.zamestnancilFields.meno);
                    if (tempMeno) {
                        menoZamestnanca = tempMeno;
                    }
                } catch (menoError) {
                    addDebug("  ⚠️ Nepodarilo sa získať meno");
                }
                
                addDebug("  👤 " + menoZamestnanca);
                
                // Inicializuj hodinovku pre tohto zamestnanca
                hodinovkyZamestnancov[i] = 0;
                
                // Nájdi platnú sadzbu
                var aktualnaHodinovka = findValidSalary(zamestnanec, datum, menoZamestnanca);
                
                if (aktualnaHodinovka) {
                    // Ulož hodinovku do lokálneho poľa
                    hodinovkyZamestnancov[i] = aktualnaHodinovka;
                    addDebug("  💾 Hodinovka uložená lokálne: " + aktualnaHodinovka + " €/h");
                    
                    // === NASTAVENIE VŠETKÝCH ATRIBÚTOV ZAMESTNANCA ===
                    var atributSuccess = 0;
                    var atributTotal = 6; // Počet atribútov na nastavenie
                    
                    // 1. Nastav atribút "odpracované" s hodnotou "Pracovná doba"
                    try {
                        zamestnanec.setAttr("odpracované", pracovnaDobaHodiny);
                        addDebug("  💾 Atribút 'odpracované' nastavený: " + pracovnaDobaHodiny + " h");
                        atributSuccess++;
                    } catch (attrError1) {
                        addError("setAttr('odpracované') zlyhalo: " + attrError1.toString(), "processEmployees_attr1_" + i);
                    }
                    
                    // 2. Nastav atribút "hodinovka"
                    try {
                        zamestnanec.setAttr("hodinovka", aktualnaHodinovka);
                        addDebug("  💾 Atribút 'hodinovka' nastavený: " + aktualnaHodinovka + " €/h");
                        atributSuccess++;
                    } catch (attrError2) {
                        addError("setAttr('hodinovka') zlyhalo: " + attrError2.toString(), "processEmployees_attr2_" + i);
                    }
                    
                    // 3-6. Získaj existujúce hodnoty ostatných atribútov alebo nastav 0
                    var priplatokHodinovka = 0;
                    var premia = 0;
                    var pokuta = 0;
                    
                    try {
                        var existujuciPriplatok = zamestnanec.attr("+príplatok (€/h)");
                        priplatokHodinovka = existujuciPriplatok || 0;
                        
                        // Ak nie je nastavený, nastav na 0
                        if (!existujuciPriplatok) {
                            zamestnanec.setAttr("+príplatok (€/h)", 0);
                            addDebug("  💾 Atribút '+príplatok (€/h)' nastavený na 0");
                        } else {
                            addDebug("  📋 Existujúci '+príplatok (€/h)': " + priplatokHodinovka + " €/h");
                        }
                        atributSuccess++;
                    } catch (attrError3) {
                        addError("Spracovanie '+príplatok (€/h)' zlyhalo: " + attrError3.toString(), "processEmployees_attr3_" + i);
                    }
                    
                    try {
                        var existujucaPremia = zamestnanec.attr("+prémia (€)");
                        premia = existujucaPremia || 0;
                        
                        // Ak nie je nastavená, nastav na 0
                        if (!existujucaPremia) {
                            zamestnanec.setAttr("+prémia (€)", 0);
                            addDebug("  💾 Atribút '+prémia (€)' nastavený na 0");
                        } else {
                            addDebug("  📋 Existujúca '+prémia (€)': " + premia + " €");
                        }
                        atributSuccess++;
                    } catch (attrError4) {
                        addError("Spracovanie '+prémia (€)' zlyhalo: " + attrError4.toString(), "processEmployees_attr4_" + i);
                    }
                    
                    try {
                        var existujucaPokuta = zamestnanec.attr("-pokuta (€)");
                        pokuta = existujucaPokuta || 0;
                        
                        // Ak nie je nastavená, nastav na 0
                        if (!existujucaPokuta) {
                            zamestnanec.setAttr("-pokuta (€)", 0);
                            addDebug("  💾 Atribút '-pokuta (€)' nastavený na 0");
                        } else {
                            addDebug("  📋 Existujúca '-pokuta (€)': " + pokuta + " €");
                        }
                        atributSuccess++;
                    } catch (attrError5) {
                        addError("Spracovanie '-pokuta (€)' zlyhalo: " + attrError5.toString(), "processEmployees_attr5_" + i);
                    }
                    
                    // 7. Vypočítaj a nastav "denná mzda" podľa vzorca
                    // ("odpracované" * "hodinovka") + ("odpracované" * "+príplatok (€/h)") + "+prémia (€)" - "-pokuta (€)" = "denná mzda"
                    try {
                        var zakladnaMzda = pracovnaDobaHodiny * aktualnaHodinovka;
                        var priplatokCelkom = pracovnaDobaHodiny * priplatokHodinovka;
                        var dennaMzda = zakladnaMzda + priplatokCelkom + premia - pokuta;
                        
                        addDebug("  🧮 VÝPOČET DENNEJ MZDY:");
                        addDebug("    Základná mzda: " + pracovnaDobaHodiny + " h × " + aktualnaHodinovka + " €/h = " + zakladnaMzda.toFixed(2) + " €");
                        addDebug("    Príplatok: " + pracovnaDobaHodiny + " h × " + priplatokHodinovka + " €/h = " + priplatokCelkom.toFixed(2) + " €");
                        addDebug("    Prémia: +" + premia.toFixed(2) + " €");
                        addDebug("    Pokuta: -" + pokuta.toFixed(2) + " €");
                        addDebug("    CELKOM: " + zakladnaMzda.toFixed(2) + " + " + priplatokCelkom.toFixed(2) + " + " + premia.toFixed(2) + " - " + pokuta.toFixed(2) + " = " + dennaMzda.toFixed(2) + " €");
                        
                        // Zaokrúhli dennú mzdu na 2 desatinné miesta
                        var dennaMzdaRounded = Math.round(dennaMzda * 100) / 100;
                        
                        zamestnanec.setAttr("denná mzda", dennaMzdaRounded);
                        addDebug("  💾 Atribút 'denná mzda' nastavený: " + dennaMzdaRounded + " €");
                        atributSuccess++;
                        
                        // Použiť dennú mzdu namiesto základnej mzdy pre celkové mzdy
                        celkoveMzdy += dennaMzdaRounded;
                        
                    } catch (attrError6) {
                        addError("Výpočet 'denná mzda' zlyhal: " + attrError6.toString(), "processEmployees_attr6_" + i);
                        
                        // Fallback na základnú mzdu
                        var fallbackMzda = aktualnaHodinovka * pracovnaDobaHodiny;
                        celkoveMzdy += fallbackMzda;
                        addDebug("  🔄 Použitá fallback mzda: " + fallbackMzda.toFixed(2) + " €");
                    }
                    
                    addDebug("  📊 Atribúty nastavené: " + atributSuccess + "/" + atributTotal);
                    
                    // Overenie nastavenia kľúčových atribútov
                    try {
                        var kontrolaOdpracovane = zamestnanec.attr("odpracované");
                        var kontrolaHodinovka = zamestnanec.attr("hodinovka");
                        var kontrolaDennaMzda = zamestnanec.attr("denná mzda");
                        
                        addDebug("  ✅ Overenie atribútov:");
                        addDebug("    odpracované: " + (kontrolaOdpracovane || "null"));
                        addDebug("    hodinovka: " + (kontrolaHodinovka || "null"));
                        addDebug("    denná mzda: " + (kontrolaDennaMzda || "null"));
                    } catch (checkError) {
                        addDebug("  ⚠️ Nepodarilo sa overiť atribúty: " + checkError.toString());
                    }
                    
                    uspesneSpracovani++;
                } else {
                    chyby++;
                }
                
            } catch (zamestnanecError) {
                addError("Chyba pri spracovaní zamestnanca " + (i + 1) + ": " + zamestnanecError.toString(), "processEmployees_general_zamestnanec_" + i);
                chyby++;
            }
        }
    }
    
    addDebug("\n📊 VÝSLEDKY SPRACOVANIA ZAMESTNANCOV S ATRIBÚTMI:");
    addDebug("  ✅ Úspešne spracovaných: " + uspesneSpracovani + "/" + zamestnanci.length);
    addDebug("  ❌ Chýb: " + chyby);
    addDebug("  💰 Celkové mzdy (s atribútmi): " + celkoveMzdy.toFixed(2) + " €");
    addDebug("  📋 Hodinovky lokálne: [" + hodinovkyZamestnancov.join(", ") + "] €/h");
    
    return {
        success: uspesneSpracovani > 0,
        celkoveMzdy: celkoveMzdy,
        uspesneSpracovani: uspesneSpracovani,
        chyby: chyby,
        hodinovkyZamestnancov: hodinovkyZamestnancov
    };
}

// ==============================================
// HLAVNÁ FUNKCIA - SUCCESS FLAG WORKFLOW
// ==============================================

function hlavnaFunkcia() {
    addDebug("🚀 === ŠTART PREPOČTU DOCHÁDZKY (REFAKTOROVANÝ) ===");
    
    var currentEntry = entry();
    var globalSuccess = false;
    
    // Vymaž predchádzajúce logy hneď na začiatku
    currentEntry.set(CONFIG.debugFieldName, "");
    currentEntry.set(CONFIG.errorFieldName, "");
    addDebug("🧹 Vymazané predchádzajúce logy");
    
    var step1Success = false; // Validácia základných údajov
    var step2Success = false; // Zaokrúhľovanie časov
    var step3Success = false; // Výpočet pracovnej doby
    var step4Success = false; // Spracovanie zamestnancov
    var step5Success = false; // Finalizácia
    
    // KROK 1: Získaj a validuj základné údaje
    addDebug("📋 KROK 1: Získavam základné údaje...");
    
    var datum = currentEntry.field(CONFIG.fields.datum);
    var prichod = currentEntry.field(CONFIG.fields.prichod);
    var odchod = currentEntry.field(CONFIG.fields.odchod);
    var zamestnanci = currentEntry.field(CONFIG.fields.zamestnanci);
    
    addDebug("  📅 Dátum: " + (datum ? moment(datum).format("DD.MM.YYYY") : "CHÝBA"));
    addDebug("  🕐 Príchod: " + (prichod ? formatTimeDisplay(prichod) : "CHÝBA"));
    addDebug("  🕐 Odchod: " + (odchod ? formatTimeDisplay(odchod) : "CHÝBA"));
    addDebug("  👥 Zamestnanci: " + (zamestnanci && zamestnanci.length > 0 ? zamestnanci.length + " zamestnancov" : "CHÝBA"));
    
    // Základná validácia
    if (!datum) {
        addError("Dátum nie je vyplnený", "krok1");
    } else if (!prichod) {
        addError("Príchod nie je vyplnený", "krok1");
    } else if (!odchod) {
        addError("Odchod nie je vyplnený", "krok1");
    } else if (!zamestnanci || zamestnanci.length === 0) {
        addError("Zamestnanci nie sú vyplnení", "krok1");
    } else {
        addDebug("✅ Základné údaje sú v poriadku - " + zamestnanci.length + " zamestnancov");
        step1Success = true;
    }
    
    if (step1Success) {
        // KROK 2: Zaokrúhli časy na 15 minút
        addDebug("\n🔄 KROK 2: Zaokrúhľujem časy na 15 minút...");
        
        var roundedTimes = validateAndRoundTimes(currentEntry);
        if (roundedTimes) {
            addDebug("✅ Časy úspešne zaokrúhlené a uložené");
            step2Success = true;
        } else {
            addDebug("❌ Zaokrúhľovanie časov zlyhalo");
        }
    }
    
    if (step1Success && step2Success) {
        // KROK 3: Vypočítaj pracovnú dobu z zaokrúhlených časov
        addDebug("\n⏰ KROK 3: Počítam pracovnú dobu z zaokrúhlených časov...");
        
        var pracovnaDobaHodiny = calculateWorkHours(roundedTimes.prichod, roundedTimes.odchod);
        
        if (pracovnaDobaHodiny) {
            try {
                currentEntry.set(CONFIG.fields.pracovnaDoba, pracovnaDobaHodiny);
                addDebug("  💾 Pracovná doba uložená: " + pracovnaDobaHodiny + " h");
                step3Success = true;
            } catch (saveError) {
                addError("Nepodarilo sa uložiť pracovnú dobu: " + saveError.toString(), "krok3");
            }
        } else {
            addDebug("❌ Výpočet pracovnej doby zlyhal");
        }
    }
    
    if (step1Success && step2Success && step3Success) {
        // KROK 4: Vypočítaj odpracované hodiny a počet pracovníkov
        addDebug("\n📊 KROK 4: Počítam odpracované hodiny...");
        
        var pocetZamestnancov = zamestnanci.length;
        var odpracovaneHodiny = pracovnaDobaHodiny * pocetZamestnancov;
        
        // Zaokrúhli odpracované hodiny na 1 desatinné miesto
        var odpracovaneRounded = roundToOneDecimal(odpracovaneHodiny);
        
        addDebug("  📊 Odpracované: " + pracovnaDobaHodiny + " h × " + pocetZamestnancov + " = " + odpracovaneRounded + " h");
        
        // Ulož počet pracovníkov
        try {
            currentEntry.set(CONFIG.fields.pocetPracovnikov, pocetZamestnancov);
            addDebug("  💾 Počet pracovníkov uložený: " + pocetZamestnancov);
        } catch (error) {
            addError("Nepodarilo sa uložiť počet pracovníkov: " + error.toString(), "krok4_pocet");
        }
        
        // Ulož odpracované hodiny
        try {
            currentEntry.set(CONFIG.fields.odpracovane, odpracovaneRounded);
            addDebug("  💾 Odpracované uložené: " + odpracovaneRounded + " h");
            step4Success = true;
        } catch (error) {
            addError("Nepodarilo sa uložiť odpracované hodiny: " + error.toString(), "krok4_odpracovane");
        }
    }
    
    if (step1Success && step2Success && step3Success && step4Success) {
        // KROK 5: Spracuj zamestnancov a vypočítaj mzdy
        addDebug("\n💰 KROK 5: Spracúvam zamestnancov a počítam mzdy...");
        
        var employeeResult = processEmployees(currentEntry, zamestnanci, datum, pracovnaDobaHodiny);
        
        if (employeeResult && employeeResult.success) {
            // Ulož celkové mzdy
            try {
                var finalMzdy = Math.round(employeeResult.celkoveMzdy * 100) / 100;
                currentEntry.set(CONFIG.fields.mzdy, finalMzdy);
                addDebug("  💾 Mzdové náklady uložené: " + finalMzdy + " €");
                step5Success = true;
                globalSuccess = true;
            } catch (saveError) {
                addError("Nepodarilo sa uložiť mzdové náklady: " + saveError.toString(), "krok5");
            }
        } else {
            addDebug("❌ Spracovanie zamestnancov zlyhalo");
        }
    }
    
    // Finalizácia a správa používateľovi
    addDebug("\n🏁 === KONIEC PREPOČTU DOCHÁDZKY ===");
    
    saveLogs();
    
    if (globalSuccess) {
        var sprava = "✅ Prepočet dochádzky dokončený! (s atribútmi)\n\n";
        sprava += "⏰ Časy (zaokrúhlené na 15 min):\n";
        sprava += "  🕐 Príchod: " + formatTimeDisplay(roundedTimes.prichod) + "\n";
        sprava += "  🕐 Odchod: " + formatTimeDisplay(roundedTimes.odchod) + "\n\n";
        sprava += "📊 Výsledky (1 des. miesto):\n";
        sprava += "  ⏱️ Pracovná doba: " + pracovnaDobaHodiny + " h\n";
        sprava += "  📊 Odpracované: " + odpracovaneRounded + " h\n";
        sprava += "  👥 Počet pracovníkov: " + pocetZamestnancov + "\n\n";
        sprava += "💰 Mzdové náklady (s atribútmi): " + employeeResult.celkoveMzdy.toFixed(2) + " €\n";
        sprava += "🏗️ Spracovaných: " + employeeResult.uspesneSpracovani + "/" + zamestnanci.length + "\n";
        sprava += "🏷️ Atribúty: odpracované, hodinovka, príplatok, prémia, pokuta, denná mzda";
        
        if (employeeResult.chyby > 0) {
            sprava += "\n⚠️ Chyby: " + employeeResult.chyby + " (pozrite Error_Log)";
        }
        
        message(sprava);
    } else {
        var chybovaSprava = "❌ Prepočet dochádzky sa nepodaril!\n";
        if (errorLog.length > 0) {
            chybovaSprava += "Pozrite Error_Log pre detaily.";
        }
        message(chybovaSprava);
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

addDebug("=== INICIALIZÁCIA DOCHÁDZKA SCRIPTU (S ATRIBÚTMI) ===");
addDebug("Nové funkcie: Zaokrúhľovanie na 15min + 1 des. miesto + Atribúty zamestnancov");
addDebug("Atribúty: odpracované, hodinovka, +príplatok (€/h), +prémia (€), -pokuta (€), denná mzda");
addDebug("Vzorec dennej mzdy: (odpracované × hodinovka) + (odpracované × príplatok) + prémia - pokuta");
addDebug("API: Správne setAttr() použitie");
addDebug("Timestamp: " + moment().format("DD.MM.YY HH:mm:ss"));

try {
    hlavnaFunkcia();
} catch (kritickachyba) {
    addError("KRITICKÁ CHYBA: " + kritickachyba.toString(), "main");
    saveLogs();
    message("❌ KRITICKÁ CHYBA! Pozrite Error_Log.");
}