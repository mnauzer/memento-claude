// ==============================================
// MEMENTO DATABASE - DOCHÁDZKA SYNC ZÁVÄZKOV
// Verzia: 4.2 | Dátum: 11.08.2025 | Autor: JavaScript Expert
// Knižnica: Dochádzka | Trigger: After Save
// ==============================================
// ✅ OPRAVENÉ v4.1:
//    - Správne vytvorenie záznamu pre JavaScript 1.7
//    - Odstránené ES6 computed property names
//    - Kompatibilné s Mozilla Rhino engine
// ✅ KOMPLETNE REFAKTOROVANÉ v4.0:
//    - Štruktúra podľa vzoru Dochádzka Prepočet 3.1
//    - Jednotné debug/error logy s DD.MM.YY HH:mm
//    - Pekne formátované info pole
//    - Správne použitie attr (2 parametre)
//    - Robustné null kontroly
//    - Čistý a organizovaný kód
// ==============================================
// FUNKCIE:
//    - Vytvorenie nových záväzkov pre zamestnancov
//    - Aktualizácia existujúcich záväzkov
//    - Nastavenie finančných polí (Suma, Zostatok)
//    - Označenie checkboxu Záväzky
//    - Info záznamy pre audit trail
// ==============================================

// ==============================================
// CONFIG INITIALIZATION
// ==============================================

var CONFIG = (function() {
    // Try centralized config first
    if (typeof MementoConfigAdapter !== 'undefined') {
        try {
            var adapter = MementoConfigAdapter.getAdapter('attendance');
            // Merge with script-specific config
            adapter.scriptName = "Dochádzka Group Summary";
            adapter.version = "5.0";
            return adapter;
        } catch (e) {
            // Fallback
        }
    }
    
    // Original config as fallback
    return {
        debug: true,
        version: "4.2",
        scriptName: "Dochádzka Sync záväzkov",
        
        // Názvy knižníc
        libraries: {
            zavazky: "Záväzky",
            zamestnanci: "Zamestnanci",
            dochadzka: "Dochádzka"
        },
        
        // Názvy polí - Dochádzka
        fields: {
            zamestnanci: "Zamestnanci",
            datum: "Dátum",
            zavazkyCheckbox: "Záväzky",
            info: "info",
            debugLog: "Debug_Log",
            errorLog: "Error_Log"
        },
        
        // Názvy polí - Záväzky
        zavazkyFields: {
            stav: "Stav",
            datum: "Dátum",
            typ: "Typ",
            zamestnanec: "Zamestnanec",
            veritiel: "Veriteľ",
            dochadzka: "Dochádzka",
            popis: "Popis",
            suma: "Suma",
            zaplatene: "Zaplatené",
            zostatok: "Zostatok",
            info: "info"
        },
        
        // Názvy polí - Zamestnanci
        zamestnanciFields: {
            nick: "Nick",
            priezvisko: "Priezvisko"
        },
        
        // Názvy atribútov
        attributes: {
            dennaMzda: "denná mzda"
        },
        
        // Stavy záväzkov
        stavy: {
            neuhradene: "Neuhradené",
            ciastocneUhradene: "Čiastočne uhradené",
            uhradene: "Uhradené"
        },
        
        // Emoji pre debug a info
        icons: {
            start: "🚀",
            step: "📋",
            success: "✅",
            error: "💥",
            warning: "⚠️",
            money: "💰",
            person: "👤",
            info: "ℹ️",
            update: "🔄",
            create: "➕",
            checkmark: "☑️"
        }
    };
})();

var CONFIG = {
    
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
       // currentEntry.set(CONFIG.fields.debugLog, "");
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

function safeFieldAccess(entry, fieldName, defaultValue) {
    try {
        var value = entry.field(fieldName);
        return value !== null && value !== undefined ? value : (defaultValue || null);
    } catch (error) {
        addError("Prístup k poľu '" + fieldName + "' zlyhal: " + error, "safeFieldAccess");
        return defaultValue || null;
    }
}

function formatDate(date) {
    if (!date) return "N/A";
    try {
        return moment(date).format("DD.MM.YYYY");
    } catch (e) {
        return "N/A";
    }
}

function formatCurrency(amount) {
    if (amount === null || amount === undefined) return "0.00 €";
    try {
        return parseFloat(amount).toFixed(2) + " €";
    } catch (e) {
        return "0.00 €";
    }
}

// ==============================================
// FUNKCIE PRE PRÁCU SO ZAMESTNANCAMI
// ==============================================

function getZamestnanecIdentifikator(zamestnanec) {
    if (!zamestnanec) return "Neznámy";
    
    var nick = safeFieldAccess(zamestnanec, CONFIG.zamestnanciFields.nick, "");
    var priezvisko = safeFieldAccess(zamestnanec, CONFIG.zamestnanciFields.priezvisko, "");
    
    // Vráť formát "Nick (Priezvisko)" alebo čo je dostupné
    if (nick && priezvisko) {
        return nick + " (" + priezvisko + ")";
    } else if (nick) {
        return nick;
    } else if (priezvisko) {
        return priezvisko;
    } else {
        return "Neznámy zamestnanec";
    }
}

function getDennaMzdaZamestnanca(zamestnanec, index) {
    if (!zamestnanec) return 0;
    
    try {
        // Získaj dennú mzdu z atribútu cez currentEntry
        var dennaMzda = zamestnanec.attr(CONFIG.attributes.dennaMzda);
        if (dennaMzda !== null && dennaMzda !== undefined && dennaMzda > 0) {
            addDebug("  💰 Denná mzda z atribútu: " + formatCurrency(dennaMzda));
            return parseFloat(dennaMzda);
        } else {
            addDebug("  ⚠️ Denná mzda nie je nastavená alebo je 0");
            return 0;
        }
    } catch (attrError) {
        addError("Chyba pri získavaní dennej mzdy: " + attrError.toString(), "getDennaMzda_" + index);
        return 0;
    }
}

// ==============================================
// FUNKCIE PRE PRÁCU SO ZÁVÄZKAMI
// ==============================================

function najdiExistujuceZavazky(dochadzkaNtry) {
    addDebug("🔍 Hľadám existujúce záväzky pre túto dochádzku...");
    
    try {
        var zavazkyLib = libByName(CONFIG.libraries.zavazky);
        if (!zavazkyLib) {
            addError("Knižnica Záväzky neexistuje", "najdiExistujuceZavazky");
            return [];
        }
        
        // Hľadaj záväzky linknuté na túto dochádzku
        var vsetkyZavazky = zavazkyLib.entries();
        var linknuteZavazky = [];
        
        for (var i = 0; i < vsetkyZavazky.length; i++) {
            var zavazok = vsetkyZavazky[i];
            var dochadzkaField = safeFieldAccess(zavazok, CONFIG.zavazkyFields.dochadzka, []);
            
            // Skontroluj či obsahuje našu dochádzku
            if (dochadzkaField && dochadzkaField.length > 0) {
                for (var j = 0; j < dochadzkaField.length; j++) {
                    if (dochadzkaField[j] && dochadzkaField[j].id === dochadzkaNtry.id) {
                        linknuteZavazky.push(zavazok);
                        break;
                    }
                }
            }
        }
        
        addDebug("  📊 Našiel som " + linknuteZavazky.length + " existujúcich záväzkov");
        return linknuteZavazky;
        
    } catch (error) {
        addError("Chyba pri hľadaní záväzkov: " + error.toString(), "najdiExistujuceZavazky");
        return [];
    }
}

function najdiZavazokPreZamestnanca(existujuceZavazky, zamestnanec) {
    if (!existujuceZavazky || !zamestnanec) return null;
    
    for (var i = 0; i < existujuceZavazky.length; i++) {
        var zavazok = existujuceZavazky[i];
        var zamestnanecField = safeFieldAccess(zavazok, CONFIG.zavazkyFields.zamestnanec, []);
        
        if (zamestnanecField && zamestnanecField.length > 0) {
            for (var j = 0; j < zamestnanecField.length; j++) {
                if (zamestnanecField[j] && zamestnanecField[j].id === zamestnanec.id) {
                    return zavazok;
                }
            }
        }
    }
    
    return null;
}

function vypocitajStavZavazku(zostatok) {
    if (zostatok === null || zostatok === undefined) {
        return CONFIG.stavy.neuhradene;
    } else if (zostatok <= 0) {
        return CONFIG.stavy.uhradene;
    } else if (zostatok > 0) {
        return CONFIG.stavy.ciastocneUhradene;
    } else {
        return CONFIG.stavy.neuhradene;
    }
}

// ==============================================
// HLAVNÉ SPRACOVANIE ZÁVÄZKOV
// ==============================================

function vytvorNovyZavazok(zavazkyLib, zamestnanec, datum, suma, identifikator) {
    addDebug("  ➕ Vytváranie nového záväzku...");
    
    try {
        // Priprav popis
        var popis = "Mzda zamestnanca " + identifikator + " za deň " + formatDate(datum);
        
        // Info text pre záväzok
        var infoText = "📋 AUTOMATICKY VYTVORENÝ ZÁVÄZOK\n";
        infoText += "=====================================\n\n";
        infoText += "📅 Dátum: " + formatDate(datum) + "\n";
        infoText += "👤 Zamestnanec: " + identifikator + "\n";
        infoText += "💰 Suma: " + formatCurrency(suma) + "\n\n";
        infoText += "⏰ Vytvorené: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
        infoText += "🔧 Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        infoText += "📂 Zdroj: Knižnica Dochádzka\n\n";
        infoText += "✅ ZÁVÄZOK VYTVORENÝ ÚSPEŠNE";
        
        // Vytvor objekt pre nový záväzok - SPRÁVNY SPÔSOB pre JavaScript 1.7
        var dataZaznamu = {};
        dataZaznamu[CONFIG.zavazkyFields.stav] = CONFIG.stavy.neuhradene;
        dataZaznamu[CONFIG.zavazkyFields.datum] = datum;
        dataZaznamu[CONFIG.zavazkyFields.typ] = "Mzda";
        dataZaznamu[CONFIG.zavazkyFields.zamestnanec] = [zamestnanec];
        dataZaznamu[CONFIG.zavazkyFields.veritiel] = "Zamestnanec";
        dataZaznamu[CONFIG.zavazkyFields.dochadzka] = [currentEntry];
        dataZaznamu[CONFIG.zavazkyFields.popis] = popis;
        dataZaznamu[CONFIG.zavazkyFields.suma] = suma;
        dataZaznamu[CONFIG.zavazkyFields.zaplatene] = 0;
        dataZaznamu[CONFIG.zavazkyFields.zostatok] = suma;
        dataZaznamu[CONFIG.zavazkyFields.info] = infoText;
        
        // Vytvor nový záznam pomocou Memento API
        var vytvorenyZavazok = zavazkyLib.create(dataZaznamu);
        
        if (vytvorenyZavazok) {
            addDebug("  ✅ Záväzok vytvorený úspešne");
            
            // Pokús sa získať ID nového záznamu
            try {
                var zavazokID = vytvorenyZavazok.field("ID");
                if (zavazokID) {
                    addDebug("    🆔 ID záväzku: #" + zavazokID);
                }
            } catch (idError) {
                // Ignoruj chybu získania ID
            }
            
            return true;
        } else {
            addError("Vytvorenie záväzku zlyhalo", "vytvorNovyZavazok");
            return false;
        }
        
    } catch (error) {
        addError("Chyba pri vytváraní záväzku: " + error.toString(), "vytvorNovyZavazok");
        return false;
    }
}

function aktualizujExistujuciZavazok(zavazok, suma, identifikator, datum) {
    addDebug("  🔄 Aktualizácia existujúceho záväzku...");
    
    try {
        var staraZaplatene = safeFieldAccess(zavazok, CONFIG.zavazkyFields.zaplatene, 0);
        var novyZostatok = suma - staraZaplatene;
        var novyStav = vypocitajStavZavazku(novyZostatok);
        
        // Aktualizuj polia
        zavazok.set(CONFIG.zavazkyFields.suma, suma);
        zavazok.set(CONFIG.zavazkyFields.zostatok, novyZostatok);
        zavazok.set(CONFIG.zavazkyFields.stav, novyStav);
        
        // Aktualizuj info
        var existujuceInfo = safeFieldAccess(zavazok, CONFIG.zavazkyFields.info, "");
        var updateInfo = "\n\n🔄 AKTUALIZOVANÉ: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
        updateInfo += "• Nová suma: " + formatCurrency(suma) + "\n";
        updateInfo += "• Zaplatené: " + formatCurrency(staraZaplatene) + " (zachované)\n";
        updateInfo += "• Zostatok: " + formatCurrency(novyZostatok) + "\n";
        updateInfo += "• Stav: " + novyStav + "\n";
        updateInfo += "• Script: " + CONFIG.scriptName + " v" + CONFIG.version;
        
        zavazok.set(CONFIG.zavazkyFields.info, existujuceInfo + updateInfo);
        
        addDebug("  ✅ Záväzok aktualizovaný");
        addDebug("    💰 Suma: " + formatCurrency(suma));
        addDebug("    💵 Zostatok: " + formatCurrency(novyZostatok));
        addDebug("    📊 Stav: " + novyStav);
        
        return true;
        
    } catch (error) {
        addError("Chyba pri aktualizácii záväzku: " + error.toString(), "aktualizujExistujuciZavazok");
        return false;
    }
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function hlavnaFunkcia() {
    addDebug("🚀 === ŠTART SYNC ZÁVÄZKOV ===");
    addDebug("📋 Script: " + CONFIG.scriptName + " v" + CONFIG.version);
    addDebug("⏰ Čas: " + moment().format("DD.MM.YYYY HH:mm:ss"));
    
    // KROK 1: Validácia vstupných dát
    addDebug("\n📋 KROK 1: Získavam základné údaje...");
    
    var datum = safeFieldAccess(currentEntry, CONFIG.fields.datum, null);
    var zamestnanci = safeFieldAccess(currentEntry, CONFIG.fields.zamestnanci, []);
    
    addDebug("  📅 Dátum: " + formatDate(datum));
    addDebug("  👥 Zamestnanci: " + zamestnanci.length + " osôb");
    
    if (!datum) {
        addError("Dátum nie je vyplnený", "validacia");
        saveLogs();
        message("❌ Chyba: Dátum dochádzky nie je vyplnený!");
        return false;
    }
    
    if (!zamestnanci || zamestnanci.length === 0) {
        addDebug("⚠️ Žiadni zamestnanci - ukončujem");
        saveLogs();
        message("ℹ️ Žiadni zamestnanci na spracovanie");
        return false;
    }
    
    // KROK 2: Získanie knižnice Záväzky
    addDebug("\n📋 KROK 2: Načítavam knižnicu Záväzky...");
    
    var zavazkyLib = null;
    try {
        zavazkyLib = libByName(CONFIG.libraries.zavazky);
        if (!zavazkyLib) {
            addError("Knižnica Záväzky neexistuje", "library");
            saveLogs();
            message("❌ Chyba: Knižnica Záväzky neexistuje!");
            return false;
        }
        addDebug("  ✅ Knižnica načítaná");
    } catch (error) {
        addError("Chyba pri načítaní knižnice: " + error.toString(), "library");
        saveLogs();
        message("❌ Chyba: Nepodarilo sa načítať knižnicu Záväzky!");
        return false;
    }
    
    // KROK 3: Nájdenie existujúcich záväzkov
    addDebug("\n📋 KROK 3: Hľadám existujúce záväzky...");
    var existujuceZavazky = najdiExistujuceZavazky(currentEntry);
    
    // KROK 4: Spracovanie každého zamestnanca
    addDebug("\n📋 KROK 4: Spracovávam zamestnancov...");
    
    var uspesneVytvorene = 0;
    var uspesneAktualizovane = 0;
    var chyby = 0;
    var celkovaSuma = 0;
    
    for (var i = 0; i < zamestnanci.length; i++) {
        var zamestnanec = zamestnanci[i];
        
        addDebug("\n--- Zamestnanec " + (i + 1) + "/" + zamestnanci.length + " ---");
        
        if (!zamestnanec) {
            addError("Zamestnanec na pozícii " + i + " je null", "zamestnanec_" + i);
            chyby++;
            continue;
        }
        
        try {
            // Získaj identifikátor a sumu
            var identifikator = getZamestnanecIdentifikator(zamestnanec);
            var dennaMzda = getDennaMzdaZamestnanca(zamestnanec, i);
            
            addDebug("  👤 " + identifikator);
            addDebug("  💰 Suma: " + formatCurrency(dennaMzda));
            
            if (dennaMzda <= 0) {
                addDebug("  ⚠️ Denná mzda je 0 alebo záporná - preskakujem");
                continue;
            }
            
            celkovaSuma += dennaMzda;
            
            // Skontroluj existujúci záväzok
            var existujuciZavazok = najdiZavazokPreZamestnanca(existujuceZavazky, zamestnanec);
            
            if (existujuciZavazok) {
                // Aktualizuj existujúci
                if (aktualizujExistujuciZavazok(existujuciZavazok, dennaMzda, identifikator, datum)) {
                    uspesneAktualizovane++;
                } else {
                    chyby++;
                }
            } else {
                // Vytvor nový
                if (vytvorNovyZavazok(zavazkyLib, zamestnanec, datum, dennaMzda, identifikator)) {
                    uspesneVytvorene++;
                } else {
                    chyby++;
                }
            }
            
        } catch (error) {
            addError("Chyba pri spracovaní zamestnanca: " + error.toString(), "process_" + i);
            chyby++;
        }
    }
    
    // KROK 5: Označenie checkboxu a vytvorenie info záznamu
    addDebug("\n📋 KROK 5: Finalizácia...");
    
    var totalUspesnych = uspesneVytvorene + uspesneAktualizovane;
    
    if (totalUspesnych > 0) {
        // Označ checkbox
        try {
            currentEntry.set(CONFIG.fields.zavazkyCheckbox, true);
            addDebug("  ☑️ Checkbox 'Záväzky' označený");
        } catch (error) {
            addError("Chyba pri označovaní checkboxu: " + error.toString(), "checkbox");
        }
        
        // Vytvor info záznam
        var infoMessage = "📋 SYNCHRONIZÁCIA ZÁVÄZKOV\n";
        infoMessage += "=====================================\n\n";
        infoMessage += "📅 Dátum: " + formatDate(datum) + "\n";
        infoMessage += "⏰ Čas sync: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n\n";
        infoMessage += "📊 VÝSLEDKY:\n";
        infoMessage += "• ➕ Nové záväzky: " + uspesneVytvorene + "\n";
        infoMessage += "• 🔄 Aktualizované: " + uspesneAktualizovane + "\n";
        infoMessage += "• 👥 Zamestnancov: " + zamestnanci.length + "\n";
        infoMessage += "• 💰 Celková suma: " + formatCurrency(celkovaSuma) + "\n";
        
        if (chyby > 0) {
            infoMessage += "• ⚠️ Chyby: " + chyby + "\n";
        }
        
        infoMessage += "\n🔧 TECHNICKÉ INFO:\n";
        infoMessage += "• Script verzia: " + CONFIG.version + "\n";
        infoMessage += "• Trigger: After Save\n";
        infoMessage += "• Knižnica: Dochádzka\n";
        infoMessage += "• JavaScript: 1.7 (Rhino)\n\n";
        
        if (totalUspesnych === zamestnanci.length) {
            infoMessage += "✅ VŠETKY ZÁVÄZKY ÚSPEŠNE SYNCHRONIZOVANÉ";
        } else {
            infoMessage += "⚠️ ČIASTOČNÁ SYNCHRONIZÁCIA\n";
            infoMessage += "Pre detaily pozri Debug_Log";
        }
        
        try {
            currentEntry.set(CONFIG.fields.info, infoMessage);
            addDebug("  ✅ Info záznam vytvorený");
        } catch (error) {
            addError("Chyba pri vytváraní info záznamu: " + error.toString(), "info");
        }
    }
    
    // Záverečné štatistiky
    addDebug("\n📊 === VÝSLEDKY SYNCHRONIZÁCIE ===");
    addDebug("✅ Nové záväzky: " + uspesneVytvorene);
    addDebug("🔄 Aktualizované: " + uspesneAktualizovane);
    addDebug("❌ Chyby: " + chyby);
    addDebug("💰 Celková suma: " + formatCurrency(celkovaSuma));
    
    if (totalUspesnych === zamestnanci.length && chyby === 0) {
        addDebug("🎉 === SYNC DOKONČENÝ ÚSPEŠNE! ===");
        return true;
    } else if (totalUspesnych > 0) {
        addDebug("⚠️ === ČIASTOČNÝ ÚSPECH ===");
        return true;
    } else {
        addDebug("❌ === SYNC ZLYHAL ===");
        return false;
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

try {
    addDebug("🎬 Inicializácia " + CONFIG.scriptName + " v" + CONFIG.version);
    
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
           // var info = safeFieldAccess(currentEntry, CONFIG.fields.info, "");
            var info = "";
            var shortInfo = info.split("\n").slice(0, 10).join("\n");
            
            message("✅ Záväzky úspešne synchronizované!\n\n" + shortInfo + "\n\n" + 
                   "ℹ️ Detaily v poli 'info'");
        } else {
            message("❌ Synchronizácia záväzkov zlyhala!\n\n" +
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