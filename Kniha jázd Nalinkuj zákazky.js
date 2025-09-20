// ==============================================
// AUTO-LINKOVANIE ZÁKAZIEK - S ATRIBÚTMI
// ==============================================
// Riešenie:
// 1. Používaj Číslo zákazky namiesto Názvu (jedinečnosť)
// 2. Nalinkuj správne zákazky do Link to Entry poľa
// 3. Nastav atribúty pomocou entry().setAttr("počet", array)
// 4. Počet výskytov do atribútov linknutých zákaziek
// ==============================================

// Konfigurácia
var CONFIG = {
    debug: true,
    debugFieldName: "Debug_Log",
    errorFieldName: "Error_Log",
    
    // Názvy knižníc
    zakazkyLibrary: "Zákazky",
    
    // Názvy polí - Kniha jázd
    fields: {
        zastavky: "Zastávky",
        zakazky: "Zákazky",
        datum: "Dátum"
    },
    
    // Názvy polí - Miesta
    miestalFields: {
        nazov: "Názov",
        jeZakazka: "Zákazka"  // Checkbox pole
    },
    
    // Názvy polí - Zákazky
    zakazkyFields: {
        cislo: "Číslo",      // KĽÚČOVÉ - použiť namiesto názvu
        nazov: "Názov",
        miesto: "Miesto",
        stav: "Stav",
        datum: "Dátum"
    }
};

// Globálne premenné
var debugLog = [];
var errorLog = [];

function addDebug(message) {
    if (CONFIG.debug) {
        var timestamp = moment().format("HH:mm:ss");
        debugLog.push("[" + timestamp + "] " + message);
    }
}

function addError(message, location) {
    var timestamp = moment().format("HH:mm:ss");
    var prefix = location ? "[" + location + "] " : "";
    errorLog.push("[" + timestamp + "] ❌ " + prefix + message);
}

function saveLogs() {
    var currentEntry = entry();
    
    try {
        currentEntry.set(CONFIG.debugFieldName, debugLog.join("\n"));
        currentEntry.set(CONFIG.errorFieldName, errorLog.join("\n"));
    } catch (e) {
        // Ignoruj chyby ukladania logov
    }
}

function getNazovMiesta(miestoEntry) {
    if (!miestoEntry) return "null miesto";
    
    try {
        var nazov = miestoEntry.field(CONFIG.miestalFields.nazov);
        return nazov || "Bez názvu";
    } catch (error) {
        return "Chyba názvu";
    }
}

function getZakazkaInfo(zakazkaEntry) {
    if (!zakazkaEntry) return { cislo: null, nazov: "null zákazka", display: "null zákazka" };
    
    var cislo = null;
    var nazov = "Bez názvu";
    
    try {
        cislo = zakazkaEntry.field(CONFIG.zakazkyFields.cislo);
    } catch (cisloError) {
        // Ignoruj chybu - možno pole neexistuje
    }
    
    try {
        var tempNazov = zakazkaEntry.field(CONFIG.zakazkyFields.nazov);
        if (tempNazov) {
            nazov = tempNazov;
        }
    } catch (nazovError) {
        // Ignoruj chybu
    }
    
    var display = cislo ? "#" + cislo + " " + nazov : nazov;
    
    return {
        cislo: cislo,
        nazov: nazov,
        display: display
    };
}

function najdiNajnovsieZakazku(zakazky, datumZaznamu) {
    if (!zakazky || zakazky.length === 0) {
        return null;
    }
    
    if (zakazky.length === 1) {
        return zakazky[0];
    }
    
    // Ak je viac zákaziek, vyber najnovšiu platná k dátumu
    var najlepsiaZakazka = null;
    var najnovsiDatum = null;
    
    for (var i = 0; i < zakazky.length; i++) {
        var zakazka = zakazky[i];
        if (!zakazka) continue;
        
        try {
            var datumZakazky = zakazka.field(CONFIG.zakazkyFields.datum);
            
            // Kontrola platnosti k dátumu
            var jePlatna = false;
            if (!datumZakazky) {
                jePlatna = true; // Zákazky bez dátumu sú vždy platné
            } else if (!datumZaznamu) {
                jePlatna = true; // Ak záznam nemá dátum, akceptuj všetky
            } else {
                jePlatna = (datumZakazky <= datumZaznamu);
            }
            
            if (jePlatna) {
                if (!najlepsiaZakazka || 
                    (datumZakazky && (!najnovsiDatum || datumZakazky > najnovsiDatum))) {
                    najlepsiaZakazka = zakazka;
                    najnovsiDatum = datumZakazky;
                }
            }
        } catch (error) {
            // Ignoruj chybné zákazky
        }
    }
    
    return najlepsiaZakazka || zakazky[0]; // Fallback na prvú zákazku
}

// Hlavná funkcia
function hlavnaFunkcia() {
    addDebug("🚀 === ŠTART AUTO-LINKOVANIE ZÁKAZIEK (S ATRIBÚTMI) ===");
    
    var currentEntry = entry();
    
    // Vymaž predchádzajúce logy
    currentEntry.set(CONFIG.debugFieldName, "");
    currentEntry.set(CONFIG.errorFieldName, "");
    addDebug("🧹 Vymazané predchádzajúce logy");
    
    // Získaj dátum záznamu
    var datumZaznamu = null;
    try {
        datumZaznamu = currentEntry.field(CONFIG.fields.datum);
        addDebug("📅 Dátum záznamu: " + (datumZaznamu ? moment(datumZaznamu).format("DD.MM.YYYY") : "NEVYPLNENÝ"));
    } catch (datumError) {
        addError("Chyba pri získavaní dátumu: " + datumError.toString(), "datum");
    }
    
    // Získaj zastávky
    var zastavky = null;
    try {
        zastavky = currentEntry.field(CONFIG.fields.zastavky);
        addDebug("📍 Zastávok: " + (zastavky ? zastavky.length : 0));
    } catch (zastavkyError) {
        addError("Chyba pri získavaní zastávok: " + zastavkyError.toString(), "zastavky");
    }
    
    if (!zastavky || zastavky.length === 0) {
        addDebug("⚠️ Žiadne zastávky - ukončujem");
        saveLogs();
        message("ℹ️ Žiadne zastávky na spracovanie");
        return;
    }
    
    // KROK 1: Spočítaj zákazky podľa ID/čísla
    addDebug("\n🔢 === POČÍTANIE ZÁKAZIEK (POUŽITIE ČÍSLA) ===");
    
    var countZakaziek = {}; // cislo_zakazky → počet výskytov
    var unikatneZakazky = {}; // cislo_zakazky → zákazka object (len prvý výskyt)
    var zastavokSoZakazkou = 0;
    var najdeneZakazky = 0;
    
    for (var i = 0; i < zastavky.length; i++) {
        var zastavka = zastavky[i];
        addDebug("\n--- Zastávka " + (i + 1) + " ---");
        
        if (!zastavka) {
            addDebug("  ❌ Zastávka je null");
            continue;
        }
        
        var nazovMiesta = getNazovMiesta(zastavka);
        addDebug("  📍 Miesto: " + nazovMiesta);
        
        // Kontrola checkbox "Zákazka"
        var jeZakazka = false;
        try {
            var checkboxValue = zastavka.field(CONFIG.miestalFields.jeZakazka);
            jeZakazka = (checkboxValue === true);
            addDebug("  🔍 Checkbox 'Zákazka': " + (jeZakazka ? "✅ TRUE" : "❌ FALSE"));
        } catch (checkboxError) {
            addError("Chyba pri čítaní checkbox: " + checkboxError.toString(), "checkbox_" + i);
            addDebug("  ⚠️ Chyba checkbox - považujem za FALSE");
        }
        
        if (!jeZakazka) {
            addDebug("  ⏭️ PRESKAKUJEM - nie je zákazka");
            continue;
        }
        
        zastavokSoZakazkou++;
        
        // Nájdi zákazky pre toto miesto
        var zakazky = null;
        try {
            zakazky = zastavka.linksFrom(CONFIG.zakazkyLibrary, CONFIG.zakazkyFields.miesto);
            addDebug("  🔗 LinksFrom našiel: " + (zakazky ? zakazky.length : 0) + " zákaziek");
        } catch (linksFromError) {
            addError("LinksFrom zlyhalo: " + linksFromError.toString(), "linksFrom_" + i);
            addDebug("  ❌ LinksFrom zlyhalo");
            continue;
        }
        
        if (!zakazky || zakazky.length === 0) {
            addDebug("  ❌ Žiadne zákazky nenájdené");
            continue;
        }
        
        // Vyber najlepšiu zákazku
        var vybranaZakazka = najdiNajnovsieZakazku(zakazky, datumZaznamu);
        
        if (!vybranaZakazka) {
            addDebug("  ❌ Nepodarilo sa vybrať zákazku");
            continue;
        }
        
        najdeneZakazky++;
        var zakazkaInfo = getZakazkaInfo(vybranaZakazka);
        addDebug("  ✅ Vybraná zákazka: " + zakazkaInfo.display);
        
        // Spočítaj výskyt podľa čísla (alebo názvu ako fallback)
        var identifikator = zakazkaInfo.cislo ? zakazkaInfo.cislo.toString() : zakazkaInfo.nazov;
        
        if (countZakaziek[identifikator]) {
            countZakaziek[identifikator]++;
            addDebug("    📊 Zvýšený count na: " + countZakaziek[identifikator]);
        } else {
            countZakaziek[identifikator] = 1;
            unikatneZakazky[identifikator] = vybranaZakazka;
            addDebug("    ➕ Nová zákazka (count: 1)");
        }
        
        // Debug info o identifikátore
        if (zakazkaInfo.cislo) {
            addDebug("    🆔 Identifikátor: Číslo #" + zakazkaInfo.cislo);
        } else {
            addDebug("    🆔 Identifikátor: Názov '" + zakazkaInfo.nazov + "' (číslo chýba)");
        }
    }
    
    // KROK 2: Výsledky počítania
    addDebug("\n📊 === VÝSLEDKY POČÍTANIA ===");
    addDebug("  🏁 Spracovaných zastávok: " + zastavky.length);
    addDebug("  🎯 Zastávok označených ako zákazka: " + zastavokSoZakazkou);
    addDebug("  💼 Úspešne nájdených zákaziek: " + najdeneZakazky);
    
    var zakazkyArray = [];
    var celkovyCount = 0;
    
    for (var identifikator in unikatneZakazky) {
        var zakazka = unikatneZakazky[identifikator];
        var pocet = countZakaziek[identifikator];
        var info = getZakazkaInfo(zakazka);
        
        zakazkyArray.push(zakazka);
        celkovyCount += pocet;
        
        addDebug("  📋 " + info.display + ": " + pocet + "x (ID: " + identifikator + ")");
    }
    
    addDebug("🎯 Unikátnych zákaziek: " + zakazkyArray.length);
    addDebug("🎯 Celkový count: " + celkovyCount);
    
    if (zakazkyArray.length === 0) {
        addDebug("⚠️ Žiadne zákazky na linkovanie");
        saveLogs();
        message("ℹ️ Žiadne zákazky nenájdené");
        return;
    }
    
    // KROK 3: Nastavenie Link to Entry poľa + ATRIBÚTY
    addDebug("\n💾 === NASTAVENIE LINKOV + ATRIBÚTY ===");
    
    try {
        // Nastav Link to Entry pole
        currentEntry.set(CONFIG.fields.zakazky, zakazkyArray);
        addDebug("✅ Link to Entry pole nastavené (" + zakazkyArray.length + " zákaziek)");
        
        // KROK 3.1: Nastavenie atribútov pomocou správnej syntax Link to Entry
        addDebug("\n🔢 === NASTAVENIE ATRIBÚTOV ===");
        addDebug("Syntax: entry().field(\"Zákazky\")[index].setAttr(\"počet\", value)");
        
        var atributUspechy = 0;
        var atributChyby = 0;
        
        // Znovu načítaj Link to Entry pole po nastavení
        var linknuteZakazky = null;
        try {
            linknuteZakazky = currentEntry.field(CONFIG.fields.zakazky);
            addDebug("🔗 Znovu načítané Link to Entry pole: " + (linknuteZakazky ? linknuteZakazky.length : 0) + " zákaziek");
        } catch (reloadError) {
            addError("Chyba pri znovu načítaní poľa: " + reloadError.toString(), "reload");
        }
        
        if (linknuteZakazky && linknuteZakazky.length > 0) {
            for (var j = 0; j < linknuteZakazky.length; j++) {
                var zakazkaObj = linknuteZakazky[j];
                var zakazkaInfo = getZakazkaInfo(zakazkaObj);
                var identifikator = zakazkaInfo.cislo ? zakazkaInfo.cislo.toString() : zakazkaInfo.nazov;
                var pocet = countZakaziek[identifikator];
                
                addDebug("  📝 Index " + j + ": " + zakazkaInfo.display + " → počet = " + pocet);
                
                // VARIANT 1: Cez entry().field()[index].setAttr()
                try {
                    addDebug("    🎯 API: entry().field(\"Zákazky\")[" + j + "].setAttr(\"počet\", " + pocet + ")");
                    currentEntry.field(CONFIG.fields.zakazky)[j].setAttr("počet", pocet);
                    addDebug("    ✅ VARIANT 1 ÚSPEŠNÉ!");
                    atributUspechy++;
                } catch (attr1Error) {
                    addDebug("    ❌ VARIANT 1 ZLYHALO: " + attr1Error.toString());
                    
                    // VARIANT 2: Priamo na objekte
                    try {
                        addDebug("    🔄 VARIANT 2: zakazkaObj.setAttr(\"počet\", " + pocet + ")");
                        zakazkaObj.setAttr("počet", pocet);
                        addDebug("    ✅ VARIANT 2 ÚSPEŠNÉ!");
                        atributUspechy++;
                    } catch (attr2Error) {
                        addDebug("    ❌ VARIANT 2 ZLYHALO: " + attr2Error.toString());
                        atributChyby++;
                    }
                }
            }
        } else {
            addError("Linknuté zákazky nie sú dostupné pre atribúty", "attributes_no_links");
            atributChyby = zakazkyArray.length;
        }
        
        addDebug("📊 Atribúty výsledky: " + atributUspechy + " úspešných, " + atributChyby + " chýb");
        
        // Overenie atribútov
        if (atributUspechy > 0) {
            addDebug("\n🔍 === OVERENIE ATRIBÚTOV ===");
            
            // VARIANT 1: Cez entry().field()[index].getAttr()
            for (var k = 0; k < Math.min(zakazkyArray.length, 3); k++) {
                var zakazkaInfoTest = getZakazkaInfo(zakazkyArray[k]);
                
                try {
                    addDebug("  🔍 Test " + (k + 1) + ": " + zakazkaInfoTest.display);
                    
                    // Test cez entry().field()[index].getAttr()
                    var testPocet1 = currentEntry.field(CONFIG.fields.zakazky)[k].getAttr("počet");
                    if (testPocet1 !== null && testPocet1 !== undefined) {
                        addDebug("    ✅ entry().field()[" + k + "].getAttr(): počet = " + testPocet1);
                    } else {
                        addDebug("    ❌ entry().field()[" + k + "].getAttr(): počet = null");
                    }
                    
                } catch (test1Error) {
                    addDebug("    ⚠️ Test 1 zlyhalo: " + test1Error.toString());
                    
                    // Fallback test priamo na objekte
                    try {
                        var testPocet2 = zakazkyArray[k].getAttr("počet");
                        if (testPocet2 !== null && testPocet2 !== undefined) {
                            addDebug("    ✅ objekt.getAttr(): počet = " + testPocet2);
                        } else {
                            addDebug("    ❌ objekt.getAttr(): počet = null");
                        }
                    } catch (test2Error) {
                        addDebug("    ⚠️ Test 2 zlyhalo: " + test2Error.toString());
                    }
                }
            }
        }
        
        saveLogs();
        
        // User notification s detailnými informáciami
        var spravovaText = "✅ Zákazky úspešne nalinkované!\n";
        spravovaText += "📋 Unikátnych zákaziek: " + zakazkyArray.length + "\n";
        spravovaText += "🔢 Celkovo výskytov: " + celkovyCount + "\n";
        spravovaText += "🎯 Zastávok so zákazkami: " + zastavokSoZakazkou + "/" + zastavky.length + "\n";
        
        if (atributUspechy > 0) {
            spravovaText += "💾 Atribúty 'počet': ✅ NASTAVENÉ";
        } else {
            spravovaText += "💾 Atribúty 'počet': ❌ PROBLÉM";
        }
        
        // Pridaj zoznam zákaziek do správy ak nie je príliš dlhý
        if (zakazkyArray.length <= 5) {
            spravovaText += "\n\n📝 Linknuté zákazky:";
            for (var msg = 0; msg < zakazkyArray.length; msg++) {
                var zakazka = zakazkyArray[msg];
                var info = getZakazkaInfo(zakazka);
                var identifikator = info.cislo ? info.cislo.toString() : info.nazov;
                var pocet = countZakaziek[identifikator];
                spravovaText += "\n• " + info.display + " (" + pocet + "x)";
            }
        }
        
        message(spravovaText);
        addDebug("🎉 Auto-linkovanie dokončené úspešne");
        
    } catch (setError) {
        addError("Chyba pri nastavovaní linkov: " + setError.toString(), "set");
        saveLogs();
        message("❌ Chyba pri nastavovaní zákaziek\nPozrite Error_Log");
    }
}

// Spustenie scriptu
addDebug("=== INICIALIZÁCIA AUTO-LINKOVANIE ZÁKAZIEK ===");
addDebug("Prístup: Číslo zákazky + individuálne setAttr");
addDebug("Identifikácia: Pole 'Číslo' namiesto 'Názov'");
addDebug("Atribúty: zakazkaObj.setAttr(\"počet\", value) pre každú zákazku");
addDebug("Timestamp: " + moment().format("DD.MM.YY HH:mm:ss"));

try {
    hlavnaFunkcia();
} catch (initError) {
    addError("INIT CHYBA: " + initError.toString(), "init");
    message("❌ KRITICKÁ CHYBA! Pozrite Error_Log.");
} finally {
    saveLogs();
}