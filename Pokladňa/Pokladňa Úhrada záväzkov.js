// ==============================================
// MEMENTO DATABASE - POKLADŇA ÚHRADA ZÁVÄZKOV  
// Verzia: 15.2 | Dátum: 9.8.25 | Autor: JavaScript Expert  
// Trigger: Before Save | Knižnica: Pokladňa
// ==============================================
// ✅ PRIDANÉ v15.2: Pri vytvorení pohľadávky z preplatku sa vytvorí aj pokladničný záznam pre zálohu
//    - Nový pokladničný záznam typu "Výdavok" s účelom "Mzda záloha"
//    - Automatické linkovanie s pohľadávkou
//    - Synchronizácia všetkých potrebných polí
//    - Info záznamy pre audit trail
// ✅ REFAKTOROVANÉ v15.1: Kompletný refaktoring a optimalizácia kódu
// ✅ Odstránené duplicity a testovacie funkcie
// ✅ Správne poradie funkcií - všetky definované pred použitím
// ✅ Kompletná úhrada záväzkov pomocou pohľadávok
// ✅ Validácia vlastníkov, chronologické uhradzovanie
// ✅ Spracovanie preplatkov (Pohľadávka/Prémia)
// ✅ Info záznamy pre audit trail
// ✅ Kompatibilné s Rhino JS engine Mementa
// ==============================================

var CONFIG = {
    debug: true,
    version: "15.2",
    scriptName: "Pokladňa úhrada záväzkov",
    
    // Názvy knižníc
    libraries: {
        pokladna: "Pokladňa",
        zavazky: "Záväzky", 
        pohladavky: "Pohľadávky",
        zamestnanci: "Zamestnanci",
        dodavatelia: "Dodávatelia",
        partneri: "Partneri",
        klienti: "Klienti"
    },
    
    // Emoji pre info polia
    icons: {
        uplnaUhrada: "✅",
        ciastocnaUhrada: "🔄", 
        uhradaDokoncena: "🏆",
        pohladavkaVytvorena: "🎁",
        premiaVytvorena: "💎",
        systemAction: "ℹ️",
        error: "💥",
        warning: "⚠️",
        start: "🚀",
        step: "📋",
        money: "💰"
    },
    
    // Stavy
    stavy: {
        neuhradene: "Neuhradené",
        ciastocneUhradene: "Čiastočne uhradené", 
        uhradene: "Uhradené"
    },
    
    // Typy preplatkov
    typyPreplatku: {
        pohladavka: "Pohľadávku",
        premia: "Prémiu",
        zaloha: "Záloha"
    },
   
    // Typy preplatkov - môže byť doplnený postupne
    typyZavazkov: {
        mzda: "Mzdy",
        faktura: "Faktúry",
        najomne: "Nájomné",
        leasing: "Leasing",

    },
    
    // Účel výdaja
    ucelVydajaOptions: {
        mzda: "Mzda",
        mzdaPremia: "Mzda prémia",
        mzdaZaloha: "Mzda záloha",
        fakturyDodavatelov: "Faktúry dodávateľov",
        ostatneVydavky: "Ostatné výdavky"
    },
    
    // Polia Pokladňa
    pokladnaFields: {
        uhradaZavazku: "Úhrada záväzku",
        typZavazku: "Typ záväzku",
        zapocitatPohladavku: "Započítať pohľadávku",
        zavazky: "Záväzky",
        pohladavky: "Pohľadávky",
        zamestnanec: "Zamestnanec",
        dodavatel: "Dodávateľ",
        partner: "Partner",
        klient: "Klient",
        zPokladne: "Z pokladne",
        suma: "Suma",
        opisPlatby: "Popis platby",
        info: "info",
        debugLog: "Debug_Log",
        errorLog: "Error_Log",
        zPreplatkuVytvoriť: "Z preplatku vytvoriť",
        ucelVydaja: "Účel výdaja",
        pohyb: "Pohyb",
        datum: "Dátum",
        id: "ID"
    },
    
    // Polia Záväzky
    zavazkyFields: {
        zamestnanec: "Zamestnanec",
        dodavatel: "Dodávateľ",
        partner: "Partner",
        klient: "Klient",
        suma: "Suma",
        zostatok: "Zostatok",
        zaplatene: "Zaplatené",
        stav: "Stav",
        datum: "Dátum",
        info: "info",
        infoUhrada: "info úhrada",
        id: "ID"
    },
    
    // Polia Pohľadávky
    pohladavkyFields: {
        zamestnanec: "Zamestnanec",
        dodavatel: "Dodávateľ",
        partner: "Partner",
        klient: "Klient",
        suma: "Suma",
        zostatok: "Zostatok",
        zaplatene: "Zaplatené",
        stav: "Stav",
        typ: "Typ",
        dlznik: "Dlžník",
        datum: "Dátum",
        info: "info",
        id: "ID"
    },
    
    // Polia Zamestnanci
    zamestnanciFields: {
        nick: "Nick",
        meno: "Meno",
        priezvisko: "Priezvisko",
        id: "ID"

    },
    // Polia Dodávatelia
    dodavateliaFields: {
        nazov: "Názov",
        id: "ID"
    },
    
    // Polia Partneri
    partneriFields: {
        nazov: "Názov",
        id: "ID"
    },

    
    // Polia Klienti
    klientiFields: {
        nazov: "Názov",
        id: "ID"
    },
    // Konštanty
    typyPohladavok: {
        preplatok: "Preplatok"
    },
    
    pohybTypy: {
        vydavok: "Výdavok"
    }
};

// ==============================================
// UTILITY FUNKCIE
// ==============================================

function getCurrentLine() {
    try {
        throw new Error();
    } catch (e) {
        var stack = e.stack || "";
        var lines = stack.split("\n");
        if (lines.length > 2) {
            var match = lines[2].match(/:(\d+)/);
            return match ? match[1] : "unknown";
        }
    }
    return "unknown";
}

function parseAmount(value) {
    if (value === null || value === undefined || value === "") {
        return 0;
    }
    
    if (typeof value === "number" && !isNaN(value)) {
        return value;
    }
    
    if (typeof value === "string") {
        var cleanValue = value.toString().trim().replace(/[€\s]/g, "").replace(",", ".");
        var parsed = parseFloat(cleanValue);
        return isNaN(parsed) ? 0 : parsed;
    }
    
    var converted = parseFloat(value);
    return isNaN(converted) ? 0 : converted;
}

function formatAmount(value) {
    var parsed = parseAmount(value);
    return Number(parsed.toFixed(2));
}

// ==============================================
// LOGGING FUNKCIE
// ==============================================

function addDebug(message) {
    if (CONFIG.debug) {
        var timestamp = moment().format("DD.MM.YY HH:mm");
        var debugMessage = "[" + timestamp + "] v" + CONFIG.version + " - " + message;
        
        var existingDebug = entry().field(CONFIG.pokladnaFields.debugLog) || "";
        entry().set(CONFIG.pokladnaFields.debugLog, existingDebug + debugMessage + "\n");
    }
}

function addError(errorMessage, solution) {
    var timestamp = moment().format("DD.MM.YY HH:mm");
    var errorLog = "[" + timestamp + "] " + CONFIG.icons.error + " CHYBA v" + CONFIG.version + " - " + errorMessage;
    errorLog += " | Line: " + getCurrentLine();
    
    if (solution) {
        errorLog += " | Riešenie: " + solution;
    }
    
    var existingError = entry().field(CONFIG.pokladnaFields.errorLog) || "";
    entry().set(CONFIG.pokladnaFields.errorLog, existingError + errorLog + "\n");
}

function addInfoRecord(targetEntry, iconType, actionDescription, details) {
    try {
        var timestamp = moment().format("DD.MM.YY HH:mm");
        var icon = CONFIG.icons[iconType] || CONFIG.icons.systemAction;
        
        var infoText = "[" + timestamp + "] " + icon + " " + actionDescription;
        
        if (details.suma !== undefined) {
            infoText += " | Suma: " + formatAmount(details.suma) + "€";
        }
        if (details.zostatok !== undefined) {
            infoText += " | Zostatok: " + formatAmount(details.zostatok) + "€";
        }
        if (details.vlastnik) {
            infoText += " | Vlastník: " + details.vlastnik;
        }
        
        if (details.autoGenerated) {
            infoText += "\n" + CONFIG.icons.systemAction + " Automaticky generované:";
            infoText += "\n  Kedy: " + timestamp;
            infoText += "\n  Prečo: " + (details.dovod || "Spracovanie preplatku");
            infoText += "\n  Ako: Script v" + CONFIG.version;
            infoText += "\n  Z čoho: " + (details.zdrojZaznam || "Pokladňa #" + entry().field("ID"));
            infoText += "\n  Knižnica: " + (details.zdrojKniznica || CONFIG.libraries.pokladna);
        }
        
        infoText += " | Script: v" + CONFIG.version;
        
        var targetField = details.fieldType === "uhrada" ? CONFIG.zavazkyFields.infoUhrada : "info";
        var existingInfo = targetEntry.field(targetField) || "";
        targetEntry.set(targetField, existingInfo + infoText + "\n");
        
        addDebug("Info záznam pridaný do '" + targetField + "': " + actionDescription);
        
    } catch (error) {
        addError("Zlyhalo pridanie info záznamu: " + error.toString(), "Skontrolujte existenciu info polí");
    }
}

// ==============================================
// DETEKCIA VLASTNÍKOV
// ==============================================

function detectOwnerFromZavazok(zavazok) {
    var ownerFields = [
        {field: CONFIG.zavazkyFields.zamestnanec, type: "employee"},
        {field: CONFIG.zavazkyFields.dodavatel, type: "supplier"}, 
        {field: CONFIG.zavazkyFields.partner, type: "partner"},
        {field: CONFIG.zavazkyFields.klient, type: "client"}
    ];
    
    for (var i = 0; i < ownerFields.length; i++) {
        var fieldInfo = ownerFields[i];
        
        try {
            var ownerField = zavazok.field(fieldInfo.field);
            
            if (ownerField && ownerField !== null && ownerField.length > 0) {
                var owner = ownerField[0];
                var displayName = "Neznámy vlastník";
                
                try {
                    if (fieldInfo.type === "employee") {
                        var nick = owner.field(CONFIG.zamestnanciFields.nick);
                        var meno = owner.field(CONFIG.zamestnanciFields.meno) || "";
                        var priezvisko = owner.field(CONFIG.zamestnanciFields.priezvisko) || "";
                        
                        if (nick) {
                            displayName = priezvisko ? nick + " (" + priezvisko + ")" : nick;
                        } else {
                            displayName = (meno + " " + priezvisko).trim() || "Zamestnanec bez Nick";
                        }
                        
                        addDebug("  📋 Zamestnanec - Nick: " + (nick || "N/A") + ", Priezvisko: " + priezvisko);
                        
                    } else {
                        displayName = owner.field("Názov") || owner.field("Meno") || "Neznámy " + fieldInfo.type;
                    }
                } catch (nameError) {
                    addDebug("⚠️ Chyba pri získavaní mena vlastníka: " + nameError.toString());
                    displayName = "Chyba mena (" + fieldInfo.type + ")";
                }
                
                addDebug("✅ Vlastník identifikovaný: " + displayName + " (typ: " + fieldInfo.type + ")");
                
                return {
                    owner: owner,
                    ownerArray: ownerField,
                    displayName: displayName,
                    type: fieldInfo.type,
                    fieldName: fieldInfo.field
                };
            }
        } catch (fieldError) {
            addDebug("  ⚠️ Pole '" + fieldInfo.field + "' nie je dostupné");
            continue;
        }
    }
    
    addDebug("❌ Žiadny vlastník nenájdený v žiadnom poli");
    return null;
}

function detectOwnerFromPohladavka(pohladavka) {
    var ownerFields = [
        {field: CONFIG.pohladavkyFields.zamestnanec, type: "employee"},
        {field: CONFIG.pohladavkyFields.dodavatel, type: "supplier"}, 
        {field: CONFIG.pohladavkyFields.partner, type: "partner"},
        {field: CONFIG.pohladavkyFields.klient, type: "client"}
    ];
    
    for (var i = 0; i < ownerFields.length; i++) {
        var fieldInfo = ownerFields[i];
        
        try {
            var ownerField = pohladavka.field(fieldInfo.field);
            
            if (ownerField && ownerField !== null && ownerField.length > 0) {
                var owner = ownerField[0];
                var displayName = "Neznámy vlastník";
                
                try {
                    if (fieldInfo.type === "employee") {
                        var nick = owner.field(CONFIG.zamestnanciFields.nick);
                        var meno = owner.field(CONFIG.zamestnanciFields.meno) || "";
                        var priezvisko = owner.field(CONFIG.zamestnanciFields.priezvisko) || "";
                        
                        if (nick) {
                            displayName = priezvisko ? nick + " (" + priezvisko + ")" : nick;
                        } else {
                            displayName = (meno + " " + priezvisko).trim() || "Zamestnanec bez Nick";
                        }
                    } else {
                        displayName = owner.field("Názov") || owner.field("Meno") || "Neznámy " + fieldInfo.type;
                    }
                } catch (nameError) {
                    displayName = "Chyba mena (" + fieldInfo.type + ")";
                }
                
                return {
                    owner: owner,
                    ownerArray: ownerField,
                    displayName: displayName,
                    type: fieldInfo.type,
                    fieldName: fieldInfo.field
                };
            }
        } catch (fieldError) {
            continue;
        }
    }
    
    return null;
}

// ==============================================
// VALIDÁCIA
// ==============================================

function validateOwnership(zavazkyArray) {
    addDebug("Validujem vlastníkov " + zavazkyArray.length + " záväzkov...");
    
    if (zavazkyArray.length === 0) {
        return { isValid: true };
    }
    
    var firstOwnerInfo = detectOwnerFromZavazok(zavazkyArray[0]);
    if (!firstOwnerInfo) {
        return { 
            isValid: false, 
            error: "Prvý záväzok nemá nastaveného vlastníka" 
        };
    }
    
    addDebug("Prvý vlastník: " + firstOwnerInfo.displayName + " (" + firstOwnerInfo.type + ")");
    
    for (var i = 1; i < zavazkyArray.length; i++) {
        var currentOwnerInfo = detectOwnerFromZavazok(zavazkyArray[i]);
        
        if (!currentOwnerInfo) {
            return { 
                isValid: false, 
                error: "Záväzok " + (i+1) + " nemá nastaveného vlastníka" 
            };
        }
        
        var firstOwnerId = firstOwnerInfo.owner.field("ID") || firstOwnerInfo.owner.field("id");
        var currentOwnerId = currentOwnerInfo.owner.field("ID") || currentOwnerInfo.owner.field("id");
        
        if (firstOwnerId !== currentOwnerId || firstOwnerInfo.type !== currentOwnerInfo.type) {
            return { 
                isValid: false, 
                error: "Rôzni vlastníci záväzkov: '" + firstOwnerInfo.displayName + "' vs '" + currentOwnerInfo.displayName + "'" 
            };
        }
    }
    
    addDebug("Validácia vlastníkov úspešná - všetky záväzky patria: " + firstOwnerInfo.displayName);
    
    return {
        isValid: true,
        ownerInfo: firstOwnerInfo
    };
}

function filterValidZavazky(zavazkyArray) {
    addDebug("Filtruje platné záväzky z " + zavazkyArray.length + " záznamov...");
    
    var validZavazky = [];
    var validStates = [CONFIG.stavy.neuhradene, CONFIG.stavy.ciastocneUhradene];
    
    for (var i = 0; i < zavazkyArray.length; i++) {
        var zavazok = zavazkyArray[i];
        
        if (!zavazok) {
            addError("Záväzok na pozícii " + (i+1) + " je null", "Odstráňte prázdne záväzky zo zoznamu");
            continue;
        }
        
        try {
            var zostatkField = zavazok.field(CONFIG.zavazkyFields.zostatok);
            var zostatok = formatAmount(zostatkField);
            var stav = zavazok.field(CONFIG.zavazkyFields.stav) || "";
            
            addDebug("Záväzok " + (i+1) + ": zostatok=" + zostatok + "€ (raw: '" + zostatkField + "'), stav='" + stav + "'");
            
            if (validStates.indexOf(stav) !== -1 && zostatok > 0) {
                validZavazky.push(zavazok);
                addDebug("  ✅ Záväzok zaradený do úhrady");
            } else {
                addDebug("  ⚠️ Záväzok preskočený (stav: '" + stav + "', zostatok: " + zostatok + "€)");
            }
        } catch (error) {
            addError("Chyba pri čítaní záväzku " + (i+1) + ": " + error.toString(), "Skontrolujte štruktúru záväzku");
        }
    }
    
    addDebug("Filtrovanie dokončené: " + validZavazky.length + " platných záväzkov");
    return validZavazky;
}

function validatePohladavky(pohladavkyArray, ownerInfo) {
    addDebug("Validujem pohľadávky pre započítanie...");
    
    var validPohladavky = [];
    var validStates = [CONFIG.stavy.neuhradene, CONFIG.stavy.ciastocneUhradene];
    
    for (var i = 0; i < pohladavkyArray.length; i++) {
        var pohladavka = pohladavkyArray[i];
        
        if (!pohladavka) {
            addError("Pohľadávka na pozícii " + (i+1) + " je null", "Odstráňte prázdne pohľadávky");
            continue;
        }
        
        try {
            var zostatkField = pohladavka.field(CONFIG.pohladavkyFields.zostatok);
            var zostatok = formatAmount(zostatkField);
            var stav = pohladavka.field(CONFIG.pohladavkyFields.stav) || "";
            
            if (validStates.indexOf(stav) === -1 || zostatok <= 0) {
                addDebug("  ⚠️ Pohľadávka " + (i+1) + " preskočená (stav: '" + stav + "', zostatok: " + zostatok + "€)");
                continue;
            }
            
            var pohladavkaOwnerInfo = detectOwnerFromPohladavka(pohladavka);
            
            if (!pohladavkaOwnerInfo) {
                addError("Pohľadávka " + (i+1) + " nemá vlastníka", "Nastavte vlastníka pohľadávky");
                continue;
            }
            
            var zavazokOwnerId = ownerInfo.owner.field("ID") || ownerInfo.owner.field("id");
            var pohladavkaOwnerId = pohladavkaOwnerInfo.owner.field("ID") || pohladavkaOwnerInfo.owner.field("id");
            
            if (zavazokOwnerId !== pohladavkaOwnerId || ownerInfo.type !== pohladavkaOwnerInfo.type) {
                addError("Pohľadávka " + (i+1) + " má iného vlastníka: " + pohladavkaOwnerInfo.displayName + 
                        " (očakávaný: " + ownerInfo.displayName + ")", 
                        "Použite len pohľadávky rovnakého vlastníka");
                continue;
            }
            
            validPohladavky.push({
                entry: pohladavka,
                zostatok: zostatok,
                ownerInfo: pohladavkaOwnerInfo
            });
            
            addDebug("  ✅ Pohľadávka " + (i+1) + " validná: " + zostatok + "€");
            
        } catch (error) {
            addError("Chyba pri validácii pohľadávky " + (i+1) + ": " + error.toString());
        }
    }
    
    addDebug("Validácia pohľadávok dokončená: " + validPohladavky.length + " platných");
    return validPohladavky;
}

// ==============================================
// VÝPOČET SUMY
// ==============================================

function calculateAvailableAmount(ownerInfo) {
    addDebug("Počítam dostupnú sumu na úhrady...");
    
    var sumaField = entry().field(CONFIG.pokladnaFields.suma);
    addDebug("🔍 Hodnota z poľa 'Suma': '" + sumaField + "' (typ: " + typeof sumaField + ")");
    
    var sumaPole = formatAmount(sumaField);
    addDebug("Základná suma z poľa 'Suma': " + sumaPole + "€");
    
    var dostupnaSuma = sumaPole;
    var pohladavkyInfo = {
        pouzite: [],
        celkovaSuma: 0
    };
    
    var zapocitatPohladavku = entry().field(CONFIG.pokladnaFields.zapocitatPohladavku) || false;
    addDebug("Započítať pohľadávky: " + zapocitatPohladavku);
    
    if (zapocitatPohladavku) {
        var pohladavkyArray = entry().field(CONFIG.pokladnaFields.pohladavky) || [];
        
        if (pohladavkyArray.length > 0) {
            addDebug("Validujem " + pohladavkyArray.length + " pohľadávok...");
            
            var validPohladavky = validatePohladavky(pohladavkyArray, ownerInfo);
            
            if (validPohladavky.length > 0) {
                var pohladavkySuma = 0;
                for (var i = 0; i < validPohladavky.length; i++) {
                    pohladavkySuma = formatAmount(pohladavkySuma + validPohladavky[i].zostatok);
                    addDebug("  Pohľadávka " + (i+1) + ": " + validPohladavky[i].zostatok + "€");
                }
                
                dostupnaSuma = formatAmount(dostupnaSuma + pohladavkySuma);
                addDebug("Celková suma z pohľadávok: " + pohladavkySuma + "€");
                
                pohladavkyInfo = {
                    pouzite: validPohladavky,
                    celkovaSuma: pohladavkySuma
                };
            } else {
                addError("Žiadne platné pohľadávky na započítanie", "Skontrolujte vlastníkov a stavy pohľadávok");
            }
        } else {
            addDebug("Žiadne pohľadávky na započítanie");
        }
    }
    
    if (dostupnaSuma === 0) {
        addDebug("Suma nie je zadaná - počítam zo zostatkov záväzkov...");
        var zavazkyArray = entry().field(CONFIG.pokladnaFields.zavazky) || [];
        var celkovyZostatok = 0;
        
        for (var i = 0; i < zavazkyArray.length; i++) {
            var zavazok = zavazkyArray[i];
            
            if (zavazok) {
                try {
                    var zostatkField = zavazok.field(CONFIG.zavazkyFields.zostatok);
                    var zostatok = formatAmount(zostatkField);
                    celkovyZostatok = formatAmount(celkovyZostatok + zostatok);
                    addDebug("  Záväzok " + (i+1) + ": " + zostatok + "€ (raw: '" + zostatkField + "')");
                } catch (error) {
                    addError("Chyba pri čítaní záväzku pri výpočte sumy: " + error.toString());
                }
            }
        }
        
        dostupnaSuma = celkovyZostatok;
        addDebug("Automaticky vypočítaná suma: " + dostupnaSuma + "€");
    }
    
    addDebug("🎯 FINÁLNA dostupná suma: " + dostupnaSuma + "€");
    
    return {
        dostupnaSuma: dostupnaSuma,
        pohladavkyInfo: pohladavkyInfo,
        zakladnaSuma: sumaPole
    };
}

// ==============================================
// SPRACOVANIE PLATIEB
// ==============================================

function processPayments(validZavazky, dostupnaSuma, ownerInfo) {
    addDebug("Spúšťam proces úhrad záväzkov...");
    addDebug("Dostupná suma: " + dostupnaSuma + "€, Záväzky: " + validZavazky.length);
    
    var uhradeneZavazky = [];
    var datumyZavazkov = [];
    var zbyvajucaSuma = dostupnaSuma;
    
    validZavazky.sort(function(a, b) {
        var dateA = a.field(CONFIG.zavazkyFields.datum) || new Date(0);
        var dateB = b.field(CONFIG.zavazkyFields.datum) || new Date(0);
        return new Date(dateA) - new Date(dateB);
    });
    
    addDebug("Záväzky zoradené chronologicky");
    
    for (var i = 0; i < validZavazky.length && zbyvajucaSuma > 0; i++) {
        var zavazok = validZavazky[i];
        var zostatkField = zavazok.field(CONFIG.zavazkyFields.zostatok);
        var zostatok = formatAmount(zostatkField);
        var datum = zavazok.field(CONFIG.zavazkyFields.datum);
        
        addDebug("KROK " + (i+1) + ": Záväzok " + zostatok + "€ (raw: '" + zostatkField + "'), dostupné: " + zbyvajucaSuma + "€");
        
        if (zbyvajucaSuma >= zostatok) {
            var pvodneZaplateneField = zavazok.field(CONFIG.zavazkyFields.zaplatene);
            var pvodneZaplatene = formatAmount(pvodneZaplateneField);
            var noveZaplatene = formatAmount(pvodneZaplatene + zostatok);
            
            addDebug("  📊 Úplná úhrada: pôvodne zaplatené=" + pvodneZaplatene + "€, nové=" + noveZaplatene + "€");
            
            zavazok.set(CONFIG.zavazkyFields.zaplatene, noveZaplatene);
            zavazok.set(CONFIG.zavazkyFields.zostatok, 0);
            zavazok.set(CONFIG.zavazkyFields.stav, CONFIG.stavy.uhradene);
            
            addInfoRecord(zavazok, "uplnaUhrada", "ÚPLNÁ ÚHRADA ZÁVÄZKU", {
                suma: zostatok,
                zostatok: 0,
                vlastnik: ownerInfo.displayName,
                fieldType: "uhrada"
            });
            
            uhradeneZavazky.push({amount: zostatok, type: "úplná"});
            zbyvajucaSuma = formatAmount(zbyvajucaSuma - zostatok);
            
            addDebug("  ✅ Úplná úhrada: " + zostatok + "€, zostáva: " + zbyvajucaSuma + "€");
            
        } else if (zbyvajucaSuma > 0) {
            var pvodneZaplateneField = zavazok.field(CONFIG.zavazkyFields.zaplatene);
            var pvodneZaplatene = formatAmount(pvodneZaplateneField);
            var noveZaplatene = formatAmount(pvodneZaplatene + zbyvajucaSuma);
            var novyZostatok = formatAmount(zostatok - zbyvajucaSuma);
            
            addDebug("  📊 Čiastočná úhrada: pôvodne zaplatené=" + pvodneZaplatene + "€, nové=" + noveZaplatene + "€, nový zostatok=" + novyZostatok + "€");
            
            zavazok.set(CONFIG.zavazkyFields.zaplatene, noveZaplatene);
            zavazok.set(CONFIG.zavazkyFields.zostatok, novyZostatok);
            zavazok.set(CONFIG.zavazkyFields.stav, CONFIG.stavy.ciastocneUhradene);
            
            addInfoRecord(zavazok, "ciastocnaUhrada", "ČIASTOČNÁ ÚHRADA ZÁVÄZKU", {
                suma: zbyvajucaSuma,
                zostatok: novyZostatok,
                vlastnik: ownerInfo.displayName,
                fieldType: "uhrada"
            });
            
            uhradeneZavazky.push({amount: zbyvajucaSuma, type: "čiastočná"});
            
            addDebug("  🔄 Čiastočná úhrada: " + zbyvajucaSuma + "€, zostáva na záväzku: " + novyZostatok + "€");
            zbyvajucaSuma = 0;
        }
        
        if (datum) {
            try {
                datumyZavazkov.push(moment(datum).format("DD.MM.YY"));
            } catch (dateError) {
                datumyZavazkov.push("N/A");
            }
        }
    }
    
    addDebug("Proces úhrad dokončený:");
    addDebug("  Uhradené záväzky: " + uhradeneZavazky.length);
    addDebug("  Preplatok: " + zbyvajucaSuma + "€");
    
    return {
        uhradeneZavazky: uhradeneZavazky,
        datumyZavazkov: datumyZavazkov,
        preplatokSuma: zbyvajucaSuma
    };
}

function processPohladavkyPayments(validPohladavky, potrebnaSuma) {
    addDebug("Spracovávam úhradu pohľadávkami...");
    addDebug("  Potrebná suma: " + potrebnaSuma + "€");
    addDebug("  Dostupné pohľadávky: " + validPohladavky.length);
    
    var pouzitePohladavky = [];
    var zostavajtePouzit = potrebnaSuma;
    var celkovoPouzite = 0;
    
    validPohladavky.sort(function(a, b) {
        var dateA = a.entry.field(CONFIG.pohladavkyFields.datum) || new Date(0);
        var dateB = b.entry.field(CONFIG.pohladavkyFields.datum) || new Date(0);
        return new Date(dateA) - new Date(dateB);
    });
    
    for (var i = 0; i < validPohladavky.length && zostavajtePouzit > 0; i++) {
        var pohladavkaData = validPohladavky[i];
        var pohladavka = pohladavkaData.entry;
        var zostatok = pohladavkaData.zostatok;
        
        var suma = formatAmount(pohladavka.field(CONFIG.pohladavkyFields.suma));
        var pvodneZaplatene = formatAmount(pohladavka.field(CONFIG.pohladavkyFields.zaplatene) || 0);
        
        addDebug("  Pohľadávka " + (i+1) + ": suma=" + suma + "€, zaplatené=" + pvodneZaplatene + "€, zostatok=" + zostatok + "€");
        
        if (zostavajtePouzit >= zostatok) {
            var pouzitieSuma = zostatok;
            var noveZaplatene = formatAmount(pvodneZaplatene + pouzitieSuma);
            var novyZostatok = formatAmount(suma - noveZaplatene);
            
            pohladavka.set(CONFIG.pohladavkyFields.zaplatene, noveZaplatene);
            pohladavka.set(CONFIG.pohladavkyFields.zostatok, novyZostatok);
            pohladavka.set(CONFIG.pohladavkyFields.stav, CONFIG.stavy.uhradene);
            
            addDebug("    ✅ Úplne použitá: zaplatené " + pvodneZaplatene + "€ → " + noveZaplatene + "€, zostatok " + zostatok + "€ → " + novyZostatok + "€");
            
            addInfoRecord(pohladavka, "uplnaUhrada", "POHĽADÁVKA POUŽITÁ NA ÚHRADU ZÁVÄZKOV", {
                suma: pouzitieSuma,
                zostatok: novyZostatok,
                vlastnik: pohladavkaData.ownerInfo.displayName,
                fieldType: "info"
            });
            
            pouzitePohladavky.push({
                entry: pohladavka,
                suma: pouzitieSuma,
                typ: "úplná"
            });
            
            celkovoPouzite = formatAmount(celkovoPouzite + pouzitieSuma);
            zostavajtePouzit = formatAmount(zostavajtePouzit - pouzitieSuma);
            
        } else if (zostavajtePouzit > 0) {
            var pouzitieSuma = zostavajtePouzit;
            var noveZaplatene = formatAmount(pvodneZaplatene + pouzitieSuma);
            var novyZostatok = formatAmount(suma - noveZaplatene);
            
            pohladavka.set(CONFIG.pohladavkyFields.zaplatene, noveZaplatene);
            pohladavka.set(CONFIG.pohladavkyFields.zostatok, novyZostatok);
            pohladavka.set(CONFIG.pohladavkyFields.stav, CONFIG.stavy.ciastocneUhradene);
            
            addDebug("    🔄 Čiastočne použitá: zaplatené " + pvodneZaplatene + "€ → " + noveZaplatene + "€, zostatok " + zostatok + "€ → " + novyZostatok + "€");
            
            addInfoRecord(pohladavka, "ciastocnaUhrada", "POHĽADÁVKA ČIASTOČNE POUŽITÁ NA ÚHRADU ZÁVÄZKOV", {
                suma: pouzitieSuma,
                zostatok: novyZostatok,
                vlastnik: pohladavkaData.ownerInfo.displayName,
                fieldType: "info"
            });
            
            pouzitePohladavky.push({
                entry: pohladavka,
                suma: pouzitieSuma,
                typ: "čiastočná"
            });
            
            celkovoPouzite = formatAmount(celkovoPouzite + pouzitieSuma);
            zostavajtePouzit = 0;
        }
    }
    
    addDebug("Spracovanie pohľadávok dokončené:");
    addDebug("  Použité pohľadávky: " + pouzitePohladavky.length);
    addDebug("  Celkovo použité: " + celkovoPouzite + "€");
    
    return {
        pouzitePohladavky: pouzitePohladavky,
        celkovoPouzite: celkovoPouzite
    };
}

// ==============================================
// SPRACOVANIE PREPLATKU
// ==============================================

function processPreplatok(preplatokSuma, ownerInfo) {
    if (preplatokSuma <= 0) {
        addDebug("Žiadny preplatok na spracovanie");
        return;
    }
    
    addDebug("Spracovávam preplatok: " + preplatokSuma + "€");
    
    var typPreplatku = entry().field(CONFIG.pokladnaFields.zPreplatkuVytvoriť);
    
    if (!typPreplatku) {
        addError("Typ preplatku nie je vybraný", "Vyberte 'Zálohu' alebo 'Prémiu' v poli 'Z preplatku vytvoriť'");
        return;
    }
    
    try {
        if (typPreplatku === CONFIG.typyPreplatku.zaloha) {
            createPohladavka(preplatokSuma, ownerInfo);
        } else if (typPreplatku === CONFIG.typyPreplatku.premia) {
            createPremiovaPokladna(preplatokSuma, ownerInfo);
        } else {
            addError("Neznámy typ preplatku: '" + typPreplatku + "'", "Podporované typy: 'Zálohu', 'Prémiu'");
        }
    } catch (error) {
        addError("Kritická chyba pri spracovaní preplatku: " + error.toString(), "Skontrolujte dostupnosť cieľových knižníc");
        throw error;
    }
}

function createPohladavka(suma, ownerInfo) {
    addDebug("Vytváram pohľadávku zo sumy: " + suma + "€");
    
    try {
        var pohladavkyLib = libByName(CONFIG.libraries.pohladavky);
        
        if (!pohladavkyLib) {
            throw new Error("Knižnica '" + CONFIG.libraries.pohladavky + "' nenájdená");
        }
        
        // 1. VYTVOR POHĽADÁVKU
        var initData = {};
        initData[ownerInfo.fieldName] = [ownerInfo.owner];
        initData[CONFIG.pohladavkyFields.suma] = formatAmount(suma);
        initData[CONFIG.pohladavkyFields.zostatok] = formatAmount(suma);
        initData[CONFIG.pohladavkyFields.zaplatene] = 0;
        initData[CONFIG.pohladavkyFields.stav] = CONFIG.stavy.neuhradene;
        initData[CONFIG.pohladavkyFields.datum] = moment().toDate();
        initData[CONFIG.pohladavkyFields.typ] = CONFIG.typyPohladavok.preplatok;
        
        var dlznikTyp = "";
        if (ownerInfo.type === "employee") dlznikTyp = "Zamestnanec";
        else if (ownerInfo.type === "supplier") dlznikTyp = "Dodávateľ";
        else if (ownerInfo.type === "partner") dlznikTyp = "Partner";
        else if (ownerInfo.type === "client") dlznikTyp = "Klient";
        
        if (dlznikTyp) {
            initData[CONFIG.pohladavkyFields.dlznik] = dlznikTyp;
        }
        
        var novaPohladavka = pohladavkyLib.create(initData);
        
        if (!novaPohladavka) {
            throw new Error("create() vrátilo null pre pohľadávku");
        }
        
        addInfoRecord(novaPohladavka, "pohladavkaVytvorena", "POHĽADÁVKA VYTVORENÁ Z PREPLATKU", {
            suma: suma,
            zostatok: suma,
            vlastnik: ownerInfo.displayName,
            autoGenerated: true,
            dovod: "Preplatok pri úhrade záväzkov",
            zdrojZaznam: "Pokladňa #" + entry().field(CONFIG.pokladnaFields.id),
            zdrojKniznica: CONFIG.libraries.pokladna
        });
        
        addDebug("✅ Pohľadávka úspešne vytvorená pre " + ownerInfo.displayName);
        
        // 2. VYTVOR POKLADNIČNÝ ZÁZNAM PRE ZÁLOHU
        addDebug("Vytváram pokladničný záznam pre zálohu na mzdu...");
        
        var pokladnaLib = libByName(CONFIG.libraries.pokladna);
        
        if (!pokladnaLib) {
            throw new Error("Knižnica '" + CONFIG.libraries.pokladna + "' nenájdená");
        }
        
        // Priprav popis s Nick pre zamestnancov
        var popisZalohy = "";
        if (ownerInfo.type === "employee") {
            try {
                var nick = ownerInfo.owner.field(CONFIG.zamestnanciFields.nick);
                if (nick) {
                    popisZalohy = "Záloha na mzdu pre " + nick + " z preplatku";
                } else {
                    popisZalohy = "Záloha na mzdu pre " + ownerInfo.displayName + " z preplatku";
                }
            } catch (nickError) {
                popisZalohy = "Záloha na mzdu pre " + ownerInfo.displayName + " z preplatku";
            }
        } else {
            popisZalohy = "Záloha pre " + ownerInfo.displayName + " z preplatku";
        }
        
        // Priprav dáta pre nový pokladničný záznam
        var pokladnaData = {};
        pokladnaData[CONFIG.pokladnaFields.suma] = formatAmount(suma);
        pokladnaData[CONFIG.pokladnaFields.pohyb] = CONFIG.pohybTypy.vydavok;
        pokladnaData[CONFIG.pokladnaFields.opisPlatby] = popisZalohy;
        pokladnaData[CONFIG.pokladnaFields.datum] = moment().toDate();
        
        // Nastav účel výdaja podľa typu vlastníka
        if (ownerInfo.type === "employee") {
            pokladnaData[CONFIG.pokladnaFields.ucelVydaja] = CONFIG.ucelVydajaOptions.mzdaZaloha;
        } else {
            pokladnaData[CONFIG.pokladnaFields.ucelVydaja] = CONFIG.ucelVydajaOptions.ostatneVydavky;
        }
        
        // Skopíruj pokladňu z pôvodného záznamu
        var povodnaPokladna = entry().field(CONFIG.pokladnaFields.zPokladne);
        if (povodnaPokladna) {
            pokladnaData[CONFIG.pokladnaFields.zPokladne] = povodnaPokladna;
        }
        
        // Nastav vlastníka
        if (ownerInfo.fieldName) {
            pokladnaData[ownerInfo.fieldName] = [ownerInfo.owner];
        }
        
        // Linkuj na pohľadávku
        pokladnaData[CONFIG.pokladnaFields.pohladavky] = [novaPohladavka];
        
        var novyPokladnicnyZaznam = pokladnaLib.create(pokladnaData);
        
        if (!novyPokladnicnyZaznam) {
            throw new Error("create() vrátilo null pre pokladničný záznam zálohy");
        }
        
        // Info záznam do nového pokladničného záznamu
        addInfoRecord(novyPokladnicnyZaznam, "systemAction", "ZÁLOHA NA MZDU VYTVORENÁ Z PREPLATKU", {
            suma: suma,
            vlastnik: ownerInfo.displayName,
            autoGenerated: true,
            dovod: "Preplatok pri úhrade záväzkov - vytvorená záloha",
            zdrojZaznam: "Pokladňa #" + entry().field("ID"),
            zdrojKniznica: CONFIG.libraries.pokladna
        });
        
        // Pridaj info o linknutej pohľadávke
        var pohladavkaId = novaPohladavka.field("ID") || novaPohladavka.field("id");
        if (pohladavkaId) {
            var existingInfo = novyPokladnicnyZaznam.field(CONFIG.pokladnaFields.info) || "";
            var additionalInfo = "📎 Linknutá pohľadávka #" + pohladavkaId;
            novyPokladnicnyZaznam.set(CONFIG.pokladnaFields.info, existingInfo + additionalInfo + "\n");
        }
        
        // Pridaj info do pohľadávky o vytvorení pokladničného záznamu
        var pokladnaId = novyPokladnicnyZaznam.field("ID") || novyPokladnicnyZaznam.field("id");
        if (pokladnaId) {
            var existingPohladavkaInfo = novaPohladavka.field(CONFIG.pohladavkyFields.info) || "";
            var additionalPohladavkaInfo = "💰 Vytvorený pokladničný záznam pre zálohu #" + pokladnaId;
            novaPohladavka.set(CONFIG.pohladavkyFields.info, existingPohladavkaInfo + additionalPohladavkaInfo + "\n");
        }
        
        addDebug("✅ Pokladničný záznam pre zálohu úspešne vytvorený");
        addDebug("  💰 Suma zálohy: " + suma + "€");
        addDebug("  📝 Popis: " + popisZalohy);
        addDebug("  🎯 Účel výdaja: " + (ownerInfo.type === "employee" ? CONFIG.ucelVydajaOptions.mzdaZaloha : CONFIG.ucelVydajaOptions.ostatneVydavky));
        addDebug("  📎 Linknutá pohľadávka ID: " + (pohladavkaId || "N/A"));
        addDebug("  📋 Pokladničný záznam ID: " + (pokladnaId || "N/A"));
        
    } catch (error) {
        addError("Vytvorenie pohľadávky/zálohy zlyhalo: " + error.toString(), "Skontrolujte dostupnosť knižníc a ich polia");
        throw error;
    }
}

function createPremiovaPokladna(suma, ownerInfo) {
    addDebug("Vytváram prémiový pokladničný záznam so sumou: " + suma + "€");
    
    try {
        var pokladnaLib = libByName(CONFIG.libraries.pokladna);
        
        if (!pokladnaLib) {
            throw new Error("Knižnica '" + CONFIG.libraries.pokladna + "' nenájdená");
        }
        
        var popis = "";
        if (ownerInfo.type === "employee") {
            try {
                var nick = ownerInfo.owner.field(CONFIG.zamestnanciFields.nick);
                if (nick) {
                    popis = "Prémia pre " + nick + " (z preplatku pri úhrade záväzkov)";
                } else {
                    popis = "Prémia pre " + ownerInfo.displayName + " (z preplatku pri úhrade záväzkov)";
                }
            } catch (nickError) {
                popis = "Prémia pre " + ownerInfo.displayName + " (z preplatku pri úhrade záväzkov)";
            }
        } else {
            popis = "Prémia pre " + ownerInfo.displayName + " (z preplatku pri úhrade záväzkov)";
        }
        
        var initData = {};
        initData[CONFIG.pokladnaFields.suma] = formatAmount(suma);
        initData[CONFIG.pokladnaFields.pohyb] = CONFIG.pohybTypy.vydavok;
        initData[CONFIG.pokladnaFields.ucelVydaja] = CONFIG.ucelVydajaOptions.mzdaPremia;
        initData[CONFIG.pokladnaFields.opisPlatby] = popis;
        initData[CONFIG.pokladnaFields.datum] = moment().toDate();
        initData[CONFIG.pokladnaFields.zPokladne] = entry().field(CONFIG.pokladnaFields.zPokladne);
        initData[CONFIG.pokladnaFields.id] = entry().field(CONFIG.pokladnaFields.id) + 1;
        
        if (ownerInfo.fieldName) {
            initData[ownerInfo.fieldName] = [ownerInfo.owner];
        }
        
        var novaPlatba = pokladnaLib.create(initData);
        
        if (!novaPlatba) {
            throw new Error("create() vrátilo null pre záznam prémie");
        }
        
        addInfoRecord(novaPlatba, "premiaVytvorena", "PLATBA PRÉMIE VYTVORENÁ", {
            suma: suma,
            vlastnik: ownerInfo.displayName,
            autoGenerated: true,
            dovod: "Preplatok pri úhrade záväzkov",
            zdrojZaznam: "Pokladňa #" + entry().field("ID"),
            zdrojKniznica: CONFIG.libraries.pokladna
        });
        
        addDebug("✅ Platba prémie úspešne vytvorená pre " + ownerInfo.displayName);
        
    } catch (error) {
        addError("Vytvorenie záznamu prémie zlyhalo: " + error.toString(), "Skontrolujte dostupnosť knižnice 'Pokladňa' a jej polia");
        throw error;
    }
}

// ==============================================
// FINALIZÁCIA
// ==============================================

function finalizeTransaction(originalAmount, preplatokSuma, paymentResult, ownerInfo) {
    addDebug("Finalizujem transakciu...");
    addDebug("  🔍 Pôvodná suma: " + originalAmount + "€, preplatok: " + preplatokSuma + "€");
    
    var finalAmount = formatAmount(originalAmount - preplatokSuma);
    addDebug("  " + CONFIG.icons.money + " Finálna suma na zápis: " + finalAmount + "€");
    
    entry().set(CONFIG.pokladnaFields.suma, finalAmount);
    
    try {
        entry().set(CONFIG.pokladnaFields.zamestnanec, []);
        entry().set(CONFIG.pokladnaFields.dodavatel, []);
        entry().set(CONFIG.pokladnaFields.partner, []);
        entry().set(CONFIG.pokladnaFields.klient, []);
        addDebug("  🧹 Vymazané predchádzajúce vlastníctvo");
    } catch (clearError) {
        addDebug("  ⚠️ Niektoré polia vlastníkov sa nepodarilo vymazať: " + clearError.toString());
    }
    
    if (ownerInfo.type === "employee" && CONFIG.pokladnaFields.zamestnanec) {
        entry().set(CONFIG.pokladnaFields.zamestnanec, [ownerInfo.owner]);
        addDebug("  👤 Nastavený zamestnanec: " + ownerInfo.displayName);
    } else if (ownerInfo.type === "supplier" && CONFIG.pokladnaFields.dodavatel) {
        entry().set(CONFIG.pokladnaFields.dodavatel, [ownerInfo.owner]);
        addDebug("  🏭 Nastavený dodávateľ: " + ownerInfo.displayName);
    } else if (ownerInfo.type === "partner" && CONFIG.pokladnaFields.partner) {
        entry().set(CONFIG.pokladnaFields.partner, [ownerInfo.owner]);
        addDebug("  🤝 Nastavený partner: " + ownerInfo.displayName);
    } else if (ownerInfo.type === "client" && CONFIG.pokladnaFields.klient) {
        entry().set(CONFIG.pokladnaFields.klient, [ownerInfo.owner]);
        addDebug("  👥 Nastavený klient: " + ownerInfo.displayName);
    }
    
    var datumyStr = "";
    if (paymentResult.datumyZavazkov && paymentResult.datumyZavazkov.length > 0) {
        var uniqueDates = [];
        for (var i = 0; i < paymentResult.datumyZavazkov.length; i++) {
            if (uniqueDates.indexOf(paymentResult.datumyZavazkov[i]) === -1) {
                uniqueDates.push(paymentResult.datumyZavazkov[i]);
            }
        }
        uniqueDates.sort();
        datumyStr = uniqueDates.join(", ");
    }
    
    var popis;
    if (ownerInfo.type === "employee") {
        try {
            var nick = ownerInfo.owner.field(CONFIG.zamestnanciFields.nick);
            if (nick) {
                popis = "Mzda " + nick + ", úhrada záväzkov" + (datumyStr ? " zo " + datumyStr : "");
            } else {
                popis = ownerInfo.displayName + ", úhrada záväzkov" + (datumyStr ? " zo " + datumyStr : "");
            }
        } catch (error) {
            popis = ownerInfo.displayName + ", úhrada záväzkov" + (datumyStr ? " zo " + datumyStr : "");
        }
    
    } else if (ownerInfo.type === "supplier") {
        try {
            var nazov = ownerInfo.owner.field(CONFIG.zamestnanciFields.nazov);
            if (nazov) {
                popis = "Uhrada faktúry " + nazov + ", úhrada záväzkov" + (datumyStr ? " zo " + datumyStr : "");
            } else {
                popis = ownerInfo.displayName + ", úhrada záväzkov" + (datumyStr ? " zo " + datumyStr : "");
            }
        } catch (error) {
            popis = ownerInfo.displayName + ", úhrada záväzkov" + (datumyStr ? " zo " + datumyStr : "");
        }
    } else {
        popis = ownerInfo.displayName + ", úhrada záväzkov" + (datumyStr ? " zo " + datumyStr : "");
    }
    
    entry().set(CONFIG.pokladnaFields.opisPlatby, popis);
    addDebug("  📝 Popis platby: " + popis);
    
    var ucelVydaja = CONFIG.ucelVydajaOptions.ostatneVydavky;
    if (ownerInfo.type === "employee") {
        ucelVydaja = CONFIG.ucelVydajaOptions.mzda;
    } else if (ownerInfo.type === "supplier") {
        ucelVydaja = CONFIG.ucelVydajaOptions.fakturyDodavatelov;
    }
    
    entry().set(CONFIG.pokladnaFields.ucelVydaja, ucelVydaja);
    addDebug("  🎯 Účel výdaja: " + ucelVydaja);
    
    addInfoRecord(entry(), "uhradaDokoncena", "ÚHRADA ZÁVÄZKOV DOKONČENÁ", {
        suma: finalAmount,
        vlastnik: ownerInfo.displayName
    });
    
    addDebug("✅ Transakcia finalizovaná - finálna suma: " + finalAmount + "€");
}

function generateFinalReport(originalAmount, preplatokSuma, paymentResult, ownerInfo, typPreplatku, pohladavkyUse) {
    addDebug("Generujem finálny report...");
    
    var finalUsedAmount = formatAmount(originalAmount - preplatokSuma);
    
    var report = CONFIG.icons.uhradaDokoncena + " ÚHRADA ZÁVÄZKOV DOKONČENÁ (v" + CONFIG.version + ")\n\n";
    report += "👤 Veriteľ: " + ownerInfo.displayName + "\n";
    
    if (pohladavkyUse && pohladavkyUse > 0) {
        report += CONFIG.icons.money + " Použité pohľadávky: " + pohladavkyUse + "€\n";
        report += CONFIG.icons.money + " Zadaná suma: " + (originalAmount - pohladavkyUse) + "€\n";
        report += CONFIG.icons.money + " Celková suma na úhrady: " + originalAmount + "€\n";
    } else {
        report += CONFIG.icons.money + " Pôvodná suma: " + originalAmount + "€\n";
    }
    
    report += "📋 Uhradené záväzky: " + paymentResult.uhradeneZavazky.length + "\n";
    report += "💵 Použitá suma na úhrady: " + finalUsedAmount + "€\n";
    
    if (preplatokSuma > 0) {
        report += "\n" + CONFIG.icons.pohladavkaVytvorena + " Preplatok: " + preplatokSuma + "€\n";
        if (typPreplatku === CONFIG.typyPreplatku.zaloha) {
            report += "📝 Vytvorené:\n";
            report += "  • Pohľadávka: " + preplatokSuma + "€\n";
            report += "  • Pokladňa - záloha na mzdu: " + preplatokSuma + "€\n";
        } else if (typPreplatku === CONFIG.typyPreplatku.premia) {
            report += "📝 Vytvorené: Pokladňa - prémia " + preplatokSuma + "€\n";
        } else if (typPreplatku) {
            report += "📝 Vytvorené: " + typPreplatku + "\n";
        }
    } else {
        report += "\n✅ Bez preplatku - presná suma\n";
    }
    
    report += "\n📊 Detaily v Debug_Log a info poliach";
    
    addDebug("📋 Report vygenerovaný - použitá suma: " + finalUsedAmount + "€, preplatok: " + preplatokSuma + "€");
    
    return report;
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        addDebug(CONFIG.icons.start + " " + CONFIG.scriptName + " SPUSTENÝ - v" + CONFIG.version);
        
        // KROK 1: Kontrola spúšťacích podmienok
        addDebug(CONFIG.icons.step + " KROK 1: Kontrola spúšťacích podmienok...");
        
        var uhradaZavazku = entry().field(CONFIG.pokladnaFields.uhradaZavazku) || false;
        var typZavazku = entry().field(CONFIG.pokladnaFields.typZavazku) || false;
        
        if (!uhradaZavazku) {
            addDebug("❌ Script ukončený - 'Úhrada záväzku' nie je zaškrtnutá");
            return;
        }
        if(!typZavazku){
            addDebug("❌ Script ukončený - 'Typ záväzku' nie je vybraný");
            return;
        }

        var infoContent = entry().field(CONFIG.pokladnaFields.info) || "";
        if (infoContent.indexOf("ÚHRADA ZÁVÄZKOV DOKONČENÁ") !== -1) {
            addDebug("✅ Úhrada už bola spracovaná - preskakujem");
            return;
        }
        
        addDebug("✅ Spúšťacie podmienky splnené");
        
        // KROK 2: Validácia a filtrovanie záväzkov
        addDebug(CONFIG.icons.step + " KROK 2: Validácia záväzkov...");
        
        var zavazkyArray = entry().field(CONFIG.pokladnaFields.zavazky) || [];
        
        if (zavazkyArray.length === 0) {
            throw new Error("Žiadne záväzky na spracovanie");
        }
        
        var validZavazky = filterValidZavazky(zavazkyArray);
        
        if (validZavazky.length === 0) {
            throw new Error("Žiadne platné záväzky na úhradu (skontrolujte stavy a zostatky)");
        }
        
        var ownershipValidation = validateOwnership(validZavazky);
        if (!ownershipValidation.isValid) {
            throw new Error("Validácia vlastníctva zlyhala: " + ownershipValidation.error);
        }
        
        var ownerInfo = ownershipValidation.ownerInfo;
        addDebug("✅ Vlastník validovaný: " + ownerInfo.displayName + " (" + ownerInfo.type + ")");
        
        var skutocnePouzitePohladavky = 0;
        
        // KROK 3: Výpočet dostupnej sumy
        addDebug(CONFIG.icons.step + " KROK 3: Výpočet dostupnej sumy...");
        
        var amountResult = calculateAvailableAmount(ownerInfo);
        var dostupnaSuma = amountResult.dostupnaSuma;
        var pohladavkyInfo = amountResult.pohladavkyInfo;
        var zakladnaSuma = amountResult.zakladnaSuma;
        
        if (dostupnaSuma <= 0) {
            throw new Error("Dostupná suma musí byť väčšia ako 0€ (aktuálne: " + dostupnaSuma + "€)");
        }
        
        addDebug("✅ Dostupná suma: " + dostupnaSuma + "€ (základ: " + zakladnaSuma + "€, pohľadávky: " + pohladavkyInfo.celkovaSuma + "€)");
        
        // KROK 3.5: Spracuj pohľadávky ak sú použité
        if (pohladavkyInfo.pouzite.length > 0 && pohladavkyInfo.celkovaSuma > 0) {
            addDebug(CONFIG.icons.step + " KROK 3.5: Spracovanie pohľadávok na úhradu...");
            
            var sumaZavazkov = 0;
            for (var i = 0; i < validZavazky.length; i++) {
                sumaZavazkov = formatAmount(sumaZavazkov + formatAmount(validZavazky[i].field(CONFIG.zavazkyFields.zostatok)));
            }
            addDebug("  Celková suma záväzkov: " + sumaZavazkov + "€");
            
            var potrebnaSumaZPohladavok = 0;
            if (zakladnaSuma < sumaZavazkov) {
                potrebnaSumaZPohladavok = formatAmount(Math.min(pohladavkyInfo.celkovaSuma, sumaZavazkov - zakladnaSuma));
            }
            
            if (potrebnaSumaZPohladavok > 0) {
                var pohladavkyResult = processPohladavkyPayments(pohladavkyInfo.pouzite, potrebnaSumaZPohladavok);
                skutocnePouzitePohladavky = pohladavkyResult.celkovoPouzite;
                addDebug("✅ Pohľadávky spracované - použité: " + skutocnePouzitePohladavky + "€ z " + pohladavkyInfo.celkovaSuma + "€");
                
                dostupnaSuma = formatAmount(zakladnaSuma + skutocnePouzitePohladavky);
                addDebug("  📊 Upravená dostupná suma: " + dostupnaSuma + "€");
            } else {
                addDebug("ℹ️ Pohľadávky neboli potrebné - záväzky pokryté základnou sumou");
                dostupnaSuma = zakladnaSuma;
            }
        } else if (entry().field(CONFIG.pokladnaFields.zapocitatPohladavku)) {
            addDebug("⚠️ Započítanie pohľadávok požadované, ale žiadne platné pohľadávky nenájdené");
            dostupnaSuma = zakladnaSuma;
        }
        
        // KROK 4: Proces úhrad záväzkov
        addDebug(CONFIG.icons.step + " KROK 4: Proces úhrady záväzkov...");
        
        var paymentResult = processPayments(validZavazky, dostupnaSuma, ownerInfo);
        var preplatokSuma = paymentResult.preplatokSuma;
        
        addDebug("✅ Úhrady spracované - preplatok: " + preplatokSuma + "€");
        
        // KROK 5: Spracovanie preplatku
        addDebug(CONFIG.icons.step + " KROK 5: Spracovanie preplatku...");
        
        var typPreplatku = null;
        if (preplatokSuma > 0) {
            typPreplatku = entry().field(CONFIG.pokladnaFields.zPreplatkuVytvoriť);
            processPreplatok(preplatokSuma, ownerInfo);
            addDebug("✅ Preplatok spracovaný ako: " + (typPreplatku || "neurčený typ"));
        } else {
            addDebug("✅ Žiadny preplatok na spracovanie");
        }
        
        // KROK 6: Finalizácia transakcie
        addDebug(CONFIG.icons.step + " KROK 6: Finalizácia transakcie...");
        
        finalizeTransaction(dostupnaSuma, preplatokSuma, paymentResult, ownerInfo);
        
        addDebug("✅ Transakcia finalizovaná");
        
        // KROK 7: Záverečný report
        addDebug(CONFIG.icons.step + " KROK 7: Generovanie záverečného reportu...");
        
        var finalReport = generateFinalReport(dostupnaSuma, preplatokSuma, paymentResult, ownerInfo, typPreplatku, skutocnePouzitePohladavky);
        
        addDebug(CONFIG.icons.uhradaDokoncena + " " + CONFIG.scriptName + " ÚSPEŠNE DOKONČENÝ");
        
        message(finalReport);
        
    } catch (error) {
        addError(CONFIG.icons.error + " KRITICKÁ CHYBA: " + error.toString(), "Skontrolujte štruktúru dát a opakujte operáciu");
        addDebug("❌ Script ukončený s chybou: " + error.toString());
        
        var errorReport = "❌ CHYBA PRI ÚHRADE ZÁVÄZKOV (v" + CONFIG.version + ")\n\n";
        errorReport += CONFIG.icons.error + " " + error.toString() + "\n\n";
        errorReport += "🔍 Odporúčané kontroly:\n";
        errorReport += "• Je zaškrtnutá 'Úhrada záväzku'?\n";
        errorReport += "• Majú všetky záväzky rovnakého vlastníka?\n";
        errorReport += "• Sú záväzky v stave 'Neuhradené' alebo 'Čiastočne uhradené'?\n";
        errorReport += "• Je zadaná suma > 0€?\n";
        errorReport += "• Existujú potrebné knižnice (Záväzky, Pohľadávky)?\n\n";
        errorReport += "📋 Detaily chyby v Debug_Log a Error_Log";
        
        message(errorReport);
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

main();