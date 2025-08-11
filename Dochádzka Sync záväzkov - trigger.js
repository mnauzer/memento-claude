// ==============================================
// DOCHÁDZKA → ZÁVÄZKY SYNC (S FINANČNÝMI POĽAMI + INFO TRACKING)
// ==============================================
// Trigger: After save v knižnici "Dochádzka"
// Účel: Automatické vytvorenie/aktualizácia záznamov záväzkov pre zamestnancov
// Funkcie: Anti-duplicity, Update/Create logika, Finančné polia, Info tracking, Checkbox označenie
// JavaScript 1.7 kompatibilný
// ==============================================

// Konfigurácia
var CONFIG = {
    debug: true,
    debugFieldName: "Debug_Log",
    errorFieldName: "Error_Log",
    
    // Názvy knižníc
    zavazkyLibrary: "Záväzky",
    zamestnancipLibrary: "Zamestnanci",
    
    // Názvy polí - Dochádzka
    fields: {
        zamestnanci: "Zamestnanci",
        datum: "Dátum",
        zavazkyCheckbox: "Záväzky",  // Nové checkbox pole
        zavazkyInfo: "Záväzky_Info"  // Nové info pole (ak existuje)
    },
    
    // Názvy polí - Záväzky
    zavazkyFields: {
        stav: "Stav",
        datum: "Dátum",
        typ: "Typ",
        zamestnanec: "Zamestnanec",
        dochadzka: "Dochádzka",
        popis: "Popis",
        suma: "Suma",
        zaplatene: "Zaplatené",
        zostatok: "Zostatok",
        info: "info"
    },
    
    // Názvy polí - Zamestnanci
    zamestnancilFields: {
        nick: "Nick",
        meno: "Meno"
    }
};

// Globálne premenné pre logging a tracking
var debugLog = [];
var errorLog = [];
var vytvorenieZavazkyInfo = [];  // Tracking vytvorených/aktualizovaných záväzkov

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

function addZavazokInfo(typ, zamestnanec, suma, zavazokId) {
    var info = {
        typ: typ,  // "NOVÝ" alebo "AKTUALIZOVANÝ"
        zamestnanec: zamestnanec,
        suma: suma,
        zavazokId: zavazokId || "neznáme",
        cas: moment().format("DD.MM.YY HH:mm:ss")
    };
    vytvorenieZavazkyInfo.push(info);
}

function saveLogs() {
    var currentEntry = entry();
    
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

function getMenoZamestnanca(zamestnanec) {
    if (!zamestnanec) return "Neznámy";
    
    var nick = "";
    var meno = "";
    
    try {
        var tempNick = zamestnanec.field(CONFIG.zamestnancilFields.nick);
        if (tempNick) nick = tempNick;
    } catch (error) {
        // Ignoruj chybu
    }
    
    try {
        var tempMeno = zamestnanec.field(CONFIG.zamestnancilFields.meno);
        if (tempMeno) meno = tempMeno;
    } catch (error) {
        // Ignoruj chybu
    }
    
    // Vráť najlepšiu dostupnú kombináciu
    if (nick && meno) {
        return nick + " (" + meno + ")";
    } else if (nick) {
        return nick;
    } else if (meno) {
        return meno;
    } else {
        return "Neznámy";
    }
}

function getSumaZamestnanca(zamestnanec) {
    if (!zamestnanec) return 0;
    
    // Skús získať sumu z atribútu "denná mzda"
    try {
        var dennaMzda = zamestnanec.attr("denná mzda");
        if (dennaMzda && dennaMzda > 0) {
            addDebug("    💰 Suma z atribútu 'denná mzda': " + dennaMzda + " €");
            return parseFloat(dennaMzda);
        }
    } catch (attrError) {
        addDebug("    🔍 Atribút 'denná mzda' nedostupný");
    }
    
    // Skús iné atribúty
    var mozneAtributy = ["suma", "hodinovka", "mzda"];
    for (var a = 0; a < mozneAtributy.length; a++) {
        try {
            var atributSuma = zamestnanec.attr(mozneAtributy[a]);
            if (atributSuma && atributSuma > 0) {
                addDebug("    💰 Suma z atribútu '" + mozneAtributy[a] + "': " + atributSuma + " €");
                return parseFloat(atributSuma);
            }
        } catch (attrError) {
            // Pokračuj na ďalší atribút
        }
    }
    
    // Skús polia
    var moznePoliaSum = ["Suma", "Mzda", "Hodinovka", "Sadzba"];
    for (var i = 0; i < moznePoliaSum.length; i++) {
        try {
            var suma = zamestnanec.field(moznePoliaSum[i]);
            if (suma && suma > 0) {
                addDebug("    💰 Suma z poľa '" + moznePoliaSum[i] + "': " + suma + " €");
                return parseFloat(suma);
            }
        } catch (fieldError) {
            // Pokračuj na ďalšie pole
        }
    }
    
    addDebug("    ⚠️ Žiadna suma nenájdená - používam 0");
    return 0; // Default suma
}

function findExistingZavazky(currentEntry) {
    addDebug("🔍 === HĽADANIE EXISTUJÚCICH ZÁVÄZKOV ===");
    
    var existujuceZavazky = [];
    
    try {
        // Použiť linksFrom na nájdenie záväzkov ktoré odkazujú na tento záznam dochádzky
        existujuceZavazky = currentEntry.linksFrom(CONFIG.zavazkyLibrary, CONFIG.zavazkyFields.dochadzka);
        
        if (existujuceZavazky && existujuceZavazky.length > 0) {
            addDebug("✅ Našiel " + existujuceZavazky.length + " existujúcich záväzkov");
            
            // Debug info o existujúcich záväzkoch
            for (var i = 0; i < existujuceZavazky.length; i++) {
                var zavazok = existujuceZavazky[i];
                try {
                    var zamestnanciZavazku = zavazok.field(CONFIG.zavazkyFields.zamestnanec);
                    var zamestnanecMeno = "Neznámy";
                    
                    if (zamestnanciZavazku && zamestnanciZavazku.length > 0) {
                        zamestnanecMeno = getMenoZamestnanca(zamestnanciZavazku[0]);
                    }
                    
                    var suma = zavazok.field(CONFIG.zavazkyFields.suma) || 0;
                    var zaplatene = zavazok.field(CONFIG.zavazkyFields.zaplatene) || 0;
                    var zostatok = zavazok.field(CONFIG.zavazkyFields.zostatok) || 0;
                    var stav = zavazok.field(CONFIG.zavazkyFields.stav) || "Neznámy";
                    
                    addDebug("  📋 Záväzok " + (i + 1) + ": " + zamestnanecMeno + " - " + suma.toFixed(2) + " € (" + stav + ")");
                    addDebug("      💳 Zaplatené: " + zaplatene.toFixed(2) + " €, Zostatok: " + zostatok.toFixed(2) + " €");
                } catch (debugError) {
                    addDebug("  ⚠️ Chyba pri čítaní záväzku " + (i + 1) + ": " + debugError.toString());
                }
            }
        } else {
            addDebug("📋 Žiadne existujúce záväzky nenájdené");
        }
        
    } catch (linksFromError) {
        addError("LinksFrom zlyhalo pri hľadaní záväzkov: " + linksFromError.toString(), "findExistingZavazky");
        
        // Fallback: SQL query
        addDebug("🔄 Skúšam SQL fallback...");
        try {
            var dochadzkallID = currentEntry.field("ID");
            if (dochadzkallID) {
                var sqlQuery = "SELECT * FROM " + CONFIG.zavazkyLibrary + " WHERE Dochádzka = '" + dochadzkallID + "'";
                var sqlResult = sql(sqlQuery).asEntries();
                
                if (sqlResult && sqlResult.length > 0) {
                    existujuceZavazky = sqlResult;
                    addDebug("✅ SQL fallback našiel " + existujuceZavazky.length + " záväzkov");
                } else {
                    addDebug("📋 SQL fallback nenašiel žiadne záväzky");
                }
            }
        } catch (sqlError) {
            addError("SQL fallback tiež zlyhal: " + sqlError.toString(), "findExistingZavazky_sql");
        }
    }
    
    return existujuceZavazky;
}

function findZavazokForEmployee(existujuceZavazky, zamestnanec) {
    // Nájdi záväzok pre konkrétneho zamestnanca
    for (var i = 0; i < existujuceZavazky.length; i++) {
        var zavazok = existujuceZavazky[i];
        
        try {
            var zamestnanciZavazku = zavazok.field(CONFIG.zavazkyFields.zamestnanec);
            
            if (zamestnanciZavazku && zamestnanciZavazku.length > 0) {
                var zamestnanecZavazku = zamestnanciZavazku[0];
                
                // Porovnaj zamestnancov - skús viacero metód
                if (zamestnanecZavazku === zamestnanec) {
                    return zavazok;
                }
                
                // Fallback porovnanie cez meno
                var menoZavazku = getMenoZamestnanca(zamestnanecZavazku);
                var menoHladaneho = getMenoZamestnanca(zamestnanec);
                
                if (menoZavazku !== "Neznámy" && menoHladaneho !== "Neznámy" && menoZavazku === menoHladaneho) {
                    return zavazok;
                }
            }
        } catch (compareError) {
            // Pokračuj na ďalší záväzok
        }
    }
    
    return null; // Nenašiel
}

function updateExistingZavazok(zavazok, zamestnanec, datumDochadzky, sumaZamestnanca, menoZamestnanca, currentEntry) {
    addDebug("  🔄 Aktualizujem existujúci záväzok...");
    
    try {
        // Získaj existujúcu hodnotu "Zaplatené"
        var existujuceZaplatene = 0;
        try {
            var tempZaplatene = zavazok.field(CONFIG.zavazkyFields.zaplatene);
            if (tempZaplatene && tempZaplatene >= 0) {
                existujuceZaplatene = parseFloat(tempZaplatene);
                addDebug("    💰 Existujúce Zaplatené: " + existujuceZaplatene.toFixed(2) + " €");
            } else {
                addDebug("    💰 Existujúce Zaplatené: nedostupné - nastavujem na 0");
            }
        } catch (zaplatenemaError) {
            addDebug("    💰 Chyba pri čítaní Zaplatené - nastavujem na 0");
        }
        
        // Vypočítaj nový zostatok
        var novyZostatok = sumaZamestnanca - existujuceZaplatene;
        addDebug("    🧮 Výpočet zostatok: " + sumaZamestnanca.toFixed(2) + " € - " + existujuceZaplatene.toFixed(2) + " € = " + novyZostatok.toFixed(2) + " €");
        
        // Aktualizuj všetky relevantné polia
        zavazok.set(CONFIG.zavazkyFields.datum, datumDochadzky);
        zavazok.set(CONFIG.zavazkyFields.suma, sumaZamestnanca);
        zavazok.set(CONFIG.zavazkyFields.zostatok, novyZostatok);
        // Poznámka: Zaplatené ponechávame aké je
        
        // Vytvor nový popis
        var popis = "Mzda zamestnanca " + menoZamestnanca + " za deň " + moment(datumDochadzky).format("DD.MM.YYYY");
        zavazok.set(CONFIG.zavazkyFields.popis, popis);
        
        // Aktualizuj info text - ROZŠÍRENÉ INFO
        var infoText = "🔄 ZÁVÄZOK AKTUALIZOVANÝ AUTOMATICKY\n";
        infoText += "═══════════════════════════════════════\n\n";
        infoText += "📋 ZÁKLADNÉ INFORMÁCIE:\n";
        infoText += "📅 Dátum dochádzky: " + moment(datumDochadzky).format("DD.MM.YYYY") + "\n";
        infoText += "👤 Zamestnanec: " + menoZamestnanca + "\n";
        infoText += "🔗 Automaticky synchronizované z knižnice Dochádzka\n\n";
        
        infoText += "💰 FINANČNÉ ÚDAJE:\n";
        infoText += "💵 Nová suma: " + sumaZamestnanca.toFixed(2) + " €\n";
        infoText += "💳 Zaplatené (zachované): " + existujuceZaplatene.toFixed(2) + " €\n";
        infoText += "💸 Nový zostatok: " + novyZostatok.toFixed(2) + " € (prepočítané)\n\n";
        
        infoText += "⚙️ TECHNICKÉ ÚDAJE:\n";
        infoText += "⏰ Čas aktualizácie: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
        
        // Získaj ID dochádzky
        var dochadzkallID = "neznáme";
        try {
            var tempID = currentEntry.field("ID");
            if (tempID) dochadzkallID = tempID;
        } catch (idError) {
            // Ignoruj chybu
        }
        
        infoText += "🆔 Zdroj Dochádzka ID: #" + dochadzkallID + "\n";
        
        // Získaj ID záväzku
        var zavazokID = "neznáme";
        try {
            var tempZavazokID = zavazok.field("ID");
            if (tempZavazokID) zavazokID = tempZavazokID;
        } catch (zavazokIdError) {
            // Ignoruj chybu
        }
        
        infoText += "🆔 Záväzok ID: #" + zavazokID + "\n\n";
        
        infoText += "📝 AKTUALIZOVANÉ POLIA:\n";
        infoText += "• ✅ Dátum: aktualizovaný na " + moment(datumDochadzky).format("DD.MM.YYYY") + "\n";
        infoText += "• ✅ Suma: aktualizovaná na " + sumaZamestnanca.toFixed(2) + " €\n";
        infoText += "• ✅ Zostatok: prepočítaný na " + novyZostatok.toFixed(2) + " €\n";
        infoText += "• ✅ Popis: aktualizovaný\n";
        infoText += "• ✅ Info: aktualizované\n";
        infoText += "• 📌 Zaplatené: zachované (" + existujuceZaplatene.toFixed(2) + " €)\n";
        infoText += "• 📌 Stav: zachovaný\n\n";
        
        infoText += "🔄 AKTUALIZÁCIA ÚSPEŠNÁ ✅";
        
        zavazok.set(CONFIG.zavazkyFields.info, infoText);
        
        // Pridaj do trackovania
        addZavazokInfo("AKTUALIZOVANÝ", menoZamestnanca, sumaZamestnanca, zavazokID);
        
        addDebug("  ✅ Existujúci záväzok aktualizovaný");
        addDebug("    🆔 Záväzok ID: " + zavazokID);
        addDebug("    💰 Nová suma: " + sumaZamestnanca.toFixed(2) + " €");
        addDebug("    💳 Zaplatené: " + existujuceZaplatene.toFixed(2) + " € (zachované)");
        addDebug("    💵 Zostatok: " + novyZostatok.toFixed(2) + " € (prepočítané)");
        
        return true;
        
    } catch (updateError) {
        addError("Chyba pri aktualizácii záväzku: " + updateError.toString(), "updateExistingZavazok");
        return false;
    }
}

function createNewZavazok(zavazkyLib, zamestnanec, datumDochadzky, sumaZamestnanca, menoZamestnanca, currentEntry) {
    addDebug("  ➕ Vytvárram nový záväzok...");
    
    try {
        // Pre nový záväzok: Zaplatené = 0, Zostatok = Suma
        var novyZaplatene = 0;
        var novyZostatok = sumaZamestnanca;
        
        addDebug("    💰 Nový záväzok - finančné hodnoty:");
        addDebug("      Suma: " + sumaZamestnanca.toFixed(2) + " €");
        addDebug("      Zaplatené: " + novyZaplatene.toFixed(2) + " €");
        addDebug("      Zostatok: " + novyZostatok.toFixed(2) + " €");
        
        // Vytvor popis
        var popis = "Mzda zamestnanca " + menoZamestnanca + " za deň " + moment(datumDochadzky).format("DD.MM.YYYY");
        
        // Vytvor info text - ROZŠÍRENÉ INFO
        var infoText = "🆕 NOVÝ ZÁVÄZOK VYTVORENÝ AUTOMATICKY\n";
        infoText += "═══════════════════════════════════════\n\n";
        infoText += "📋 ZÁKLADNÉ INFORMÁCIE:\n";
        infoText += "📅 Dátum dochádzky: " + moment(datumDochadzky).format("DD.MM.YYYY") + "\n";
        infoText += "👤 Zamestnanec: " + menoZamestnanca + "\n";
        infoText += "🔗 Automaticky vygenerované z knižnice Dochádzka\n\n";
        
        infoText += "💰 FINANČNÉ ÚDAJE:\n";
        infoText += "💵 Suma: " + sumaZamestnanca.toFixed(2) + " €\n";
        infoText += "💳 Zaplatené: " + novyZaplatene.toFixed(2) + " € (nový záväzok)\n";
        infoText += "💸 Zostatok: " + novyZostatok.toFixed(2) + " € (= suma)\n\n";
        
        infoText += "⚙️ TECHNICKÉ ÚDAJE:\n";
        infoText += "⏰ Čas vytvorenia: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
        
        // Získaj ID dochádzky
        var dochadzkallID = "neznáme";
        try {
            var tempID = currentEntry.field("ID");
            if (tempID) dochadzkallID = tempID;
        } catch (idError) {
            // Ignoruj chybu
        }
        
        infoText += "🆔 Zdroj Dochádzka ID: #" + dochadzkallID + "\n\n";
        
        infoText += "📝 AUTOMATICKY NASTAVENÉ HODNOTY:\n";
        infoText += "• ✅ Stav: Neuhradené\n";
        infoText += "• ✅ Typ: Mzda\n";
        infoText += "• ✅ Dátum: " + moment(datumDochadzky).format("DD.MM.YYYY") + "\n";
        infoText += "• ✅ Suma: " + sumaZamestnanca.toFixed(2) + " €\n";
        infoText += "• ✅ Zaplatené: 0 € (nový záväzok)\n";
        infoText += "• ✅ Zostatok: " + novyZostatok.toFixed(2) + " € (= suma)\n";
        infoText += "• ✅ Zamestnanec: " + menoZamestnanca + "\n";
        infoText += "• ✅ Spätný link na dochádzku: nastavený\n";
        infoText += "• ✅ Popis: automaticky generovaný\n\n";
        
        infoText += "🔗 PREPOJENIA:\n";
        infoText += "• Dochádzka → Záväzok: ✅ Aktívne\n";
        infoText += "• Záväzok → Dochádzka: ✅ Aktívne\n";
        infoText += "• Anti-duplicita: ✅ Kontrolované\n\n";
        
        infoText += "🆕 VYTVORENIE ÚSPEŠNÉ ✅";
        
        // Vytvor objekt pre nový záznam
        var dataZaznamu = {};
        dataZaznamu[CONFIG.zavazkyFields.stav] = "Neuhradené";
        dataZaznamu[CONFIG.zavazkyFields.datum] = datumDochadzky;
        dataZaznamu[CONFIG.zavazkyFields.typ] = "Mzda";
        dataZaznamu[CONFIG.zavazkyFields.zamestnanec] = [zamestnanec];
        dataZaznamu[CONFIG.zavazkyFields.dochadzka] = [currentEntry];
        dataZaznamu[CONFIG.zavazkyFields.popis] = popis;
        dataZaznamu[CONFIG.zavazkyFields.suma] = sumaZamestnanca;
        dataZaznamu[CONFIG.zavazkyFields.zaplatene] = novyZaplatene;  // 0 pre nový záväzok
        dataZaznamu[CONFIG.zavazkyFields.zostatok] = novyZostatok;    // = suma pre nový záväzok
        dataZaznamu[CONFIG.zavazkyFields.info] = infoText;
        
        // Vytvor nový záznam
        var novyZavazok = zavazkyLib.create(dataZaznamu);
        
        if (novyZavazok) {
            // Získaj ID nového záväzku
            var novyZavazokID = "neznáme";
            try {
                var id = novyZavazok.field("ID");
                if (id) {
                    novyZavazokID = id;
                    addDebug("    🆔 Nový záznam ID: " + id);
                    
                    // Aktualizuj info text s ID záväzku
                    var aktualizovanyInfoText = infoText.replace("🆔 Zdroj Dochádzka ID: #" + dochadzkallID + "\n\n", 
                                                              "🆔 Zdroj Dochádzka ID: #" + dochadzkallID + "\n🆔 Záväzok ID: #" + novyZavazokID + "\n\n");
                    novyZavazok.set(CONFIG.zavazkyFields.info, aktualizovanyInfoText);
                }
            } catch (idCheckError) {
                // Ignoruj chybu kontroly ID
            }
            
            // Pridaj do trackovania
            addZavazokInfo("NOVÝ", menoZamestnanca, sumaZamestnanca, novyZavazokID);
            
            addDebug("  ✅ Nový záväzok vytvorený");
            addDebug("    🆔 Záväzok ID: " + novyZavazokID);
            addDebug("    💰 Suma: " + sumaZamestnanca.toFixed(2) + " €");
            addDebug("    💳 Zaplatené: " + novyZaplatene.toFixed(2) + " €");
            addDebug("    💵 Zostatok: " + novyZostatok.toFixed(2) + " €");
            
            return true;
        } else {
            addError("Vytvorenie nového záväzku vrátilo null", "createNewZavazok");
            return false;
        }
        
    } catch (createError) {
        addError("Chyba pri vytváraní nového záväzku: " + createError.toString(), "createNewZavazok");
        return false;
    }
}

function createDochadzkallnfoText(datumDochadzky, vytvorenieZavazkyInfo, uspesneVytvorene, uspesneAktualizovane, celkovaSuma) {
    var infoText = "📊 AUTOMATICKÁ SYNCHRONIZÁCIA ZÁVÄZKOV\n";
    infoText += "════════════════════════════════════════════\n\n";
    
    infoText += "📅 DÁTUM DOCHÁDZKY: " + moment(datumDochadzky).format("DD.MM.YYYY") + "\n";
    infoText += "⏰ ČAS SYNCHRONIZÁCIE: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n\n";
    
    infoText += "📈 SÚHRN VÝSLEDKOV:\n";
    infoText += "➕ Nových záväzkov: " + uspesneVytvorene + "\n";
    infoText += "🔄 Aktualizovaných záväzkov: " + uspesneAktualizovane + "\n";
    infoText += "💰 Celková suma záväzkov: " + celkovaSuma.toFixed(2) + " €\n";
    infoText += "👥 Spracovaných zamestnancov: " + vytvorenieZavazkyInfo.length + "\n\n";
    
    if (vytvorenieZavazkyInfo.length > 0) {
        infoText += "📋 DETAIL ZÁVÄZKOV:\n";
        infoText += "─────────────────────────\n";
        
        for (var i = 0; i < vytvorenieZavazkyInfo.length; i++) {
            var info = vytvorenieZavazkyInfo[i];
            var ikona = (info.typ === "NOVÝ") ? "🆕" : "🔄";
            infoText += ikona + " " + info.typ + " - " + info.zamestnanec + "\n";
            infoText += "   💰 Suma: " + info.suma.toFixed(2) + " €\n";
            infoText += "   🆔 ID: #" + info.zavazokId + "\n";
            infoText += "   ⏰ Čas: " + info.cas + "\n";
            if (i < vytvorenieZavazkyInfo.length - 1) {
                infoText += "\n";
            }
        }
        
        infoText += "\n";
    }
    
    infoText += "⚙️ AUTOMATICKÉ FUNKCIE:\n";
    infoText += "• ✅ Anti-duplicita záväzkov\n";
    infoText += "• ✅ Aktualizácia existujúcich záznamov\n";
    infoText += "• ✅ Finančné polia (Suma, Zaplatené, Zostatok)\n";
    infoText += "• ✅ Spätné odkazy medzi knižnicami\n";
    infoText += "• ✅ Automatické označenie checkbox Záväzky\n\n";
    
    infoText += "🔗 Všetky záväzky sú prepojené s týmto záznamom dochádzky\n";
    infoText += "📝 Pre detaily pozrite záznamy v knižnici Záväzky\n\n";
    
    infoText += "✅ SYNCHRONIZÁCIA DOKONČENÁ ÚSPEŠNE";
    
    return infoText;
}

function setZavazkyCheckboxAndInfo(currentEntry, datumDochadzky, vytvorenieZavazkyInfo, uspesneVytvorene, uspesneAktualizovane, celkovaSuma) {
    addDebug("📝 === NASTAVOVANIE CHECKBOX A INFO ===");
    
    try {
        // Nastav checkbox Záväzky na true
        currentEntry.set(CONFIG.fields.zavazkyCheckbox, true);
        addDebug("✅ Checkbox 'Záväzky' označený ako true");
        
        // Vytvor a nastav info text o záväzkoch
        var dochadzkallnfoText = createDochadzkallnfoText(datumDochadzky, vytvorenieZavazkyInfo, uspesneVytvorene, uspesneAktualizovane, celkovaSuma);
        
        // Skús nastaviť do poľa Záväzky_Info ak existuje
        try {
            currentEntry.set(CONFIG.fields.zavazkyInfo, dochadzkallnfoText);
            addDebug("✅ Info text uložený do poľa 'Záväzky_Info'");
        } catch (infoFieldError) {
            addDebug("⚠️ Pole 'Záväzky_Info' neexistuje - info text neuložený");
        }
        
        return true;
        
    } catch (checkboxError) {
        addError("Chyba pri nastavovaní checkbox/info: " + checkboxError.toString(), "setZavazkyCheckboxAndInfo");
        return false;
    }
}

// Hlavná funkcia - S PODPOROU UPDATE/CREATE LOGIKY + INFO TRACKING
function hlavnaFunkcia() {
    addDebug("🏢 === ŠTART DOCHÁDZKA → ZÁVÄZKY SYNC (UPDATE/CREATE + INFO) ===");
    
    var currentEntry = entry();
    
    // Vymaž predchádzajúce logy
    try {
        currentEntry.set(CONFIG.debugFieldName, "");
        currentEntry.set(CONFIG.errorFieldName, "");
    } catch (clearError) {
        // Ignoruj chybu vymazávania
    }
    addDebug("🧹 Vymazané predchádzajúce logy");
    
    // Získaj základné údaje z Dochádzky
    var datumDochadzky = null;
    var zamestnanci = null;
    
    try {
        datumDochadzky = currentEntry.field(CONFIG.fields.datum);
        addDebug("📅 Dátum dochádzky: " + (datumDochadzky ? moment(datumDochadzky).format("DD.MM.YYYY") : "CHÝBA"));
    } catch (datumError) {
        addError("Chyba pri získavaní dátumu: " + datumError.toString(), "datum");
    }
    
    try {
        zamestnanci = currentEntry.field(CONFIG.fields.zamestnanci);
        addDebug("👥 Zamestnanci: " + (zamestnanci ? zamestnanci.length + " osôb" : "CHÝBA"));
    } catch (zamestnancilError) {
        addError("Chyba pri získavaní zamestnancov: " + zamestnancilError.toString(), "zamestnanci");
    }
    
    // Validácia základných údajov
    if (!datumDochadzky) {
        addError("Dátum dochádzky nie je vyplnený", "validacia");
        saveLogs();
        message("❌ Chyba: Dátum dochádzky nie je vyplnený");
        return;
    }
    
    if (!zamestnanci || zamestnanci.length === 0) {
        addDebug("⚠️ Žiadni zamestnanci - ukončujem");
        saveLogs();
        message("ℹ️ Žiadni zamestnanci na spracovanie");
        return;
    }
    
    // Získaj knižnicu Záväzky
    var zavazkyLib = null;
    try {
        zavazkyLib = libByName(CONFIG.zavazkyLibrary);
        if (!zavazkyLib) {
            addError("Knižnica '" + CONFIG.zavazkyLibrary + "' neexistuje", "library");
            saveLogs();
            message("❌ Chyba: Knižnica Záväzky neexistuje");
            return;
        }
        addDebug("✅ Knižnica '" + CONFIG.zavazkyLibrary + "' načítaná");
    } catch (libError) {
        addError("Chyba pri načítaní knižnice: " + libError.toString(), "library");
        saveLogs();
        message("❌ Chyba: Nepodarilo sa načítať knižnicu Záväzky");
        return;
    }
    
    // Nájdi existujúce záväzky pre tento záznam dochádzky
    var existujuceZavazky = findExistingZavazky(currentEntry);
    
    // Spracuj každého zamestnanca - UPDATE alebo CREATE
    addDebug("\n💼 === SYNCHRONIZÁCIA ZÁVÄZKOV (UPDATE/CREATE + INFO) ===");
    
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
            // Získaj informácie o zamestnancovi
            var menoZamestnanca = getMenoZamestnanca(zamestnanec);
            var sumaZamestnanca = getSumaZamestnanca(zamestnanec);
            
            addDebug("👤 " + menoZamestnanca);
            addDebug("💰 Suma: " + sumaZamestnanca.toFixed(2) + " €");
            
            // Nájdi existujúci záväzok pre tohto zamestnanca
            var existujuciZavazok = findZavazokForEmployee(existujuceZavazky, zamestnanec);
            
            if (existujuciZavazok) {
                // === AKTUALIZUJ EXISTUJÚCI ZÁVÄZOK ===
                addDebug("🔄 Existujúci záväzok nájdený - aktualizujem");
                
                var updateSuccess = updateExistingZavazok(
                    existujuciZavazok,
                    zamestnanec,
                    datumDochadzky,
                    sumaZamestnanca,
                    menoZamestnanca,
                    currentEntry
                );
                
                if (updateSuccess) {
                    uspesneAktualizovane++;
                    celkovaSuma += sumaZamestnanca;
                } else {
                    chyby++;
                }
                
            } else {
                // === VYTVOR NOVÝ ZÁVÄZOK ===
                addDebug("➕ Existujúci záväzok nenájdený - vytvárram nový");
                
                var createSuccess = createNewZavazok(
                    zavazkyLib,
                    zamestnanec,
                    datumDochadzky,
                    sumaZamestnanca,
                    menoZamestnanca,
                    currentEntry
                );
                
                if (createSuccess) {
                    uspesneVytvorene++;
                    celkovaSuma += sumaZamestnanca;
                } else {
                    chyby++;
                }
            }
            
        } catch (processError) {
            addError("Chyba pri spracovaní zamestnanca " + getMenoZamestnanca(zamestnanec) + ": " + processError.toString(), "process_zamestnanec_" + i);
            chyby++;
        }
    }
    
    // Nastav checkbox a info ak bola synchronizácia úspešná
    var totalUspesnych = uspesneVytvorene + uspesneAktualizovane;
    if (totalUspesnych > 0) {
        addDebug("\n📝 === NASTAVOVANIE CHECKBOX A INFO ===");
        
        var checkboxSuccess = setZavazkyCheckboxAndInfo(
            currentEntry,
            datumDochadzky,
            vytvorenieZavazkyInfo,
            uspesneVytvorene,
            uspesneAktualizovane,
            celkovaSuma
        );
        
        if (checkboxSuccess) {
            addDebug("✅ Checkbox a info úspešne nastavené");
        } else {
            addDebug("⚠️ Problém pri nastavovaní checkbox/info");
        }
    }
    
    // Finalizácia a správa
    addDebug("\n📊 === VÝSLEDKY SYNCHRONIZÁCIE ===");
    addDebug("✅ Nových záznamov: " + uspesneVytvorene);
    addDebug("🔄 Aktualizovaných záznamov: " + uspesneAktualizovane);
    addDebug("❌ Chýb: " + chyby);
    addDebug("👥 Celkovo spracovaných: " + zamestnanci.length);
    addDebug("💰 Celková suma záväzkov: " + celkovaSuma.toFixed(2) + " €");
    addDebug("📋 Existujúcich záväzkov na začiatku: " + existujuceZavazky.length);
    addDebug("📝 Vytvorených info záznamov: " + vytvorenieZavazkyInfo.length);
    
    saveLogs();
    
    // User notification
    var finalMessage = "";
    
    if (totalUspesnych > 0) {
        finalMessage = "✅ ZÁVÄZKY ÚSPEŠNE SYNCHRONIZOVANÉ!\n\n";
        finalMessage += "📊 VÝSLEDKY:\n";
        finalMessage += "➕ Nových záznamov: " + uspesneVytvorene + "\n";
        finalMessage += "🔄 Aktualizovaných: " + uspesneAktualizovane + "\n";
        finalMessage += "👥 Z celkovo: " + zamestnanci.length + " zamestnancov\n";
        finalMessage += "💰 Celková suma: " + celkovaSuma.toFixed(2) + " €\n";
        finalMessage += "📅 Dátum: " + moment(datumDochadzky).format("DD.MM.YYYY") + "\n\n";
        
        finalMessage += "✅ CHECKBOX 'ZÁVÄZKY' OZNAČENÝ\n";
        finalMessage += "📝 INFO O ZÁVÄZKOCH ULOŽENÉ\n\n";
        
        if (chyby > 0) {
            finalMessage += "⚠️ Chyby: " + chyby + " (pozrite Error_Log)\n\n";
        }
        
        finalMessage += "🔗 AKTÍVNE FUNKCIE:\n";
        finalMessage += "• ✅ Automatická detekcia duplicitov\n";
        finalMessage += "• ✅ Podpora úprav záznamov\n";
        finalMessage += "• ✅ Finančné polia (Suma, Zaplatené, Zostatok)\n";
        finalMessage += "• ✅ Info tracking v oboch knižniciach\n";
        finalMessage += "• ✅ Checkbox označenie\n\n";
        
        if (uspesneVytvorene > 0) {
            finalMessage += "💰 NOVÉ ZÁVÄZKY:\n";
            finalMessage += "• Zaplatené: 0 € (nové záväzky)\n";
            finalMessage += "• Zostatok: = Suma (nepreplatené)\n\n";
        }
        
        if (uspesneAktualizovane > 0) {
            finalMessage += "🔄 AKTUALIZOVANÉ ZÁVÄZKY:\n";
            finalMessage += "• Zaplatené: zachované\n";
            finalMessage += "• Zostatok: prepočítané (Suma - Zaplatené)\n\n";
        }
        
        finalMessage += "📋 Pre detailné informácie o každom záväzku\n";
        finalMessage += "pozrite záznamy v knižnici Záväzky";
        
    } else {
        finalMessage = "❌ NEPODARILO SA VYTVORIŤ ANI AKTUALIZOVAŤ ŽIADNE ZÁVÄZKY!\n\n";
        if (errorLog.length > 0) {
            finalMessage += "🔍 Pozrite Error_Log pre detaily chýb.\n";
        }
        finalMessage += "🔄 Skúste synchronizáciu znovu alebo\n";
        finalMessage += "skontrolujte údaje zamestnancov.";
    }
    
    message(finalMessage);
    addDebug("🏁 Synchronizácia záväzkov dokončená");
}

// Spustenie scriptu
addDebug("=== INICIALIZÁCIA DOCHÁDZKA → ZÁVÄZKY SYNC (S INFO TRACKING) ===");
addDebug("Verzia: JavaScript 1.7 kompatibilná s UPDATE/CREATE + finančné polia + info tracking");
addDebug("Nové funkcie: Rozšírené info texty, Checkbox označenie, Tracking vytvorených záväzkov");
addDebug("Trigger: After Save (podporuje aj úpravy záznamov)");
addDebug("Timestamp: " + moment().format("DD.MM.YY HH:mm:ss"));

try {
    hlavnaFunkcia();
} catch (kritickachyba) {
    addError("KRITICKÁ CHYBA: " + kritickachyba.toString(), "main");
    saveLogs();
    message("❌ KRITICKÁ CHYBA! Pozrite Error_Log.");
}