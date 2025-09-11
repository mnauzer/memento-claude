// ==============================================
// MEMENTO DATABASE - KOMPLEXNÝ PREPOČET ZAMESTNANCA
// Verzia: 5.0 | Dátum: 11.08.2025 | Autor: JavaScript Expert
// Knižnica: Zamestnanci | Trigger: Before Save
// ==============================================
// ✅ NOVÉ v5.0: KRITICKÉ OPRAVY
//    - PRIDANÉ: Vynulovanie všetkých polí pred výpočtom
//    - OPRAVENÉ: Pokladňa linksFrom s debug kontrolou
//    - VYLEPŠENÉ: Filter debug s detailnou analýzou
//    - ZAOKRÚHLENÉ: Odpracované total na 2 desatinné miesta
// ✅ v4.9: Pokladňa Vyplatené/Prémie, debug filtrov
// ==============================================

var CONFIG = {
    debug: true,
    version: "5.0",
    scriptName: "Zamestnanci Prepočet zamestnanca",
    
    // Názvy knižníc
    libraries: {
        zamestnanci: "Zamestnanci",
        sadzby: "sadzby zamestnancov",
        dochadzka: "Dochádzka", 
        zaznamPrac: "Záznam prác",
        knihaJazd: "Kniha jázd",
        pohladavky: "Pohľadávky",
        zavazky: "Záväzky",
        pokladna: "Pokladňa"
    },
    
    // Názvy filtrov - pre ľahšie testovanie
    filterNames: {
        tentoRok: "tento rok",
        tentoTyzden: "tento týždeň",
        tentoMesiac: "tento mesiac",
        minulyRok: "minulý rok", 
        minulyMesiac: "minulý mesiac",
        total: "total",
        vsetko: "všetko"
    },
    
    // Emoji pre debug log
    icons: {
        start: "🚀",
        step: "📋",
        success: "✅",
        warning: "⚠️",
        error: "💥",
        money: "💰",
        time: "⏱️",
        person: "👤",
        info: "ℹ️",
        calculation: "🧮",
        database: "🗃️",
        filter: "🔍",
        summary: "📊",
        clear: "🗑️"
    },
    
    // Polia v knižnici Zamestnanci
    fields: {
        nick: "Nick",
        meno: "Meno",
        priezvisko: "Priezvisko",
        vyberObdobia: "výber obdobia",
        obdobieTotal: "obdobie total",
        
        // Dochádzka
        odpracovane: "Odpracované",
        odpracovaneTotal: "Odpracované total",
        
        // Záznam prác
        naZakazkach: "Na zákazkách", 
        naZakazkachTotal: "Na zákazkách total",
        
        // Kniha jázd
        jazdy: "Jazdy",
        jazdyTotal: "Jazdy total",
        
        // Mzdy
        aktualnaHodinovka: "Aktuálna hodinovka",
        zarobene: "Zarobené",
        zarobeneTotal: "Zarobené total",
        vyplatene: "Vyplatené",
        vyplateneTotal: "Vyplatené total",
        premie: "Prémie",
        premieTotal: "Prémie total",
        preplatokNedoplatok: "Preplatok/Nedoplatok",
        
        // Pohľadávky a Záväzky
        pohladavky: "Pohľadávky",
        zavazky: "Záväzky", 
        saldo: "Saldo",
        
        // Debug fields
        debugLog: "Debug_Log",
        errorLog: "Error_Log"
    },
    
    // LinksFrom polia
    linksFromFields: {
        dochadzkaZamestnanci: "Zamestnanci",
        zaznamPracZamestnanci: "Zamestnanci",
        knihaJazdVodic: "Vodič",
        pohladavkyZamestnanec: "Zamestnanec",
        zavazkyZamestnanec: "Zamestnanec",
        pokladnaZamestnanec: "Zamestnanec"
    },
    
    // Polia v súvisiacich knižniciach
    recordFields: {
        datum: "Dátum",
        pracovnaDoba: "Pracovná doba",
        mzdoveNaklady: "Mzdové náklady",
        casOd: "Čas od",
        casDo: "Čas do",
        zostatok: "Zostatok",
        stav: "Stav",
        suma: "Suma",
        ucelVydaja: "Účel výdaja"
    },
    
    // Validné stavy pre počítanie
    validneStavy: ["Neuhradené", "Čiastočne uhradené"]
};

// Globálne premenné pre logy
var debugMessages = [];
var errorMessages = [];
var currentEntry = entry();

// ==============================================
// HELPER FUNKCIE
// ==============================================

function addDebug(message, type) {
    if (!CONFIG.debug) return;
    
    type = type || "info";
    var timestamp = moment().format("HH:mm:ss");
    var icon = CONFIG.icons[type] || "";
    var formattedMessage = "[" + timestamp + "] " + icon + " " + message;
    debugMessages.push(formattedMessage);
}

function addError(message, context) {
    var timestamp = moment().format("DD.MM.YY HH:mm:ss");
    var errorMsg = "[" + timestamp + "] " + CONFIG.icons.error + " " + message;
    if (context) {
        errorMsg += " | Context: " + context;
    }
    errorMessages.push(errorMsg);
    addDebug("ERROR: " + message, "error");
}

function safeFieldAccess(entry, fieldName, defaultValue) {
    try {
        var value = entry.field(fieldName);
        return value !== null && value !== undefined ? value : (defaultValue || null);
    } catch (error) {
        addError("Field access failed for '" + fieldName + "': " + error, "safeFieldAccess");
        return defaultValue || null;
    }
}

function formatAmount(value) {
    if (value === null || value === undefined || isNaN(value)) return 0;
    return Math.round(value * 100) / 100;
}

function saveLogsToEntry() {
    if (debugMessages.length > 0) {
        currentEntry.set(CONFIG.fields.debugLog, debugMessages.join("\n"));
    }
    if (errorMessages.length > 0) {
        currentEntry.set(CONFIG.fields.errorLog, errorMessages.join("\n"));
    }
}

// ==============================================
// VYNULOVANIE POLÍ - NOVÁ FUNKCIA
// ==============================================

function clearAllFields() {
    addDebug("=== VYNULOVANIE VŠETKÝCH POLÍ ===", "clear");
    
    var fieldsToReset = [
        // Dochádzka
        CONFIG.fields.odpracovane,
        CONFIG.fields.odpracovaneTotal,
        
        // Záznam prác
        CONFIG.fields.naZakazkach,
        CONFIG.fields.naZakazkachTotal,
        
        // Kniha jázd
        CONFIG.fields.jazdy,
        CONFIG.fields.jazdyTotal,
        
        // Mzdy
        CONFIG.fields.zarobene,
        CONFIG.fields.zarobeneTotal,
        CONFIG.fields.vyplatene,
        CONFIG.fields.vyplateneTotal,
        CONFIG.fields.premie,
        CONFIG.fields.premieTotal,
        CONFIG.fields.preplatokNedoplatok,
        
        // Pohľadávky a Záväzky
        CONFIG.fields.pohladavky,
        CONFIG.fields.zavazky,
        CONFIG.fields.saldo
    ];
    
    for (var i = 0; i < fieldsToReset.length; i++) {
        currentEntry.set(fieldsToReset[i], 0);
        addDebug("  Vynulované: " + fieldsToReset[i], "clear");
    }
    
    addDebug("✅ Všetky polia vynulované", "success");
}

// ==============================================
// DÁTUMOVÉ FUNKCIE S DEBUG ANALÝZOU
// ==============================================

function parseFilterDateRange(filterText) {
    addDebug("=== ANALÝZA FILTRA ===", "filter");
    addDebug("Vstupný text: '" + filterText + "'", "filter");
    addDebug("Dĺžka textu: " + filterText.length + " znakov", "filter");
    
    if (!filterText || filterText === "") {
        addDebug("❌ Filter je prázdny", "warning");
        return {
            isValid: false,
            reason: "Filter je prázdny",
            popis: "Prázdny filter"
        };
    }
    
    var normalizedText = filterText.trim().toLowerCase();
    addDebug("Normalizovaný text: '" + normalizedText + "'", "filter");
    var now = moment();
    addDebug("Aktuálny dátum: " + now.format("DD.MM.YYYY"), "info");
    
    // Tento rok
    if (normalizedText === "tento rok" || normalizedText === "rok") {
        var result = {
            isValid: true,
            startDate: moment().startOf('year').toDate(),
            endDate: moment().endOf('year').toDate(),
            popis: "Tento rok (" + now.year() + ")",
            type: "year"
        };
        addDebug("✅ Rozpoznaný filter: " + result.popis, "success");
        addDebug("  Od: " + moment(result.startDate).format("DD.MM.YYYY HH:mm:ss"), "info");
        addDebug("  Do: " + moment(result.endDate).format("DD.MM.YYYY HH:mm:ss"), "info");
        return result;
    }
    
    // Minulý rok
    if (normalizedText === "minulý rok" || normalizedText === "minuly rok") {
        var result = {
            isValid: true,
            startDate: moment().subtract(1, 'year').startOf('year').toDate(),
            endDate: moment().subtract(1, 'year').endOf('year').toDate(),
            popis: "Minulý rok (" + (now.year() - 1) + ")",
            type: "year"
        };
        addDebug("✅ Rozpoznaný filter: " + result.popis, "success");
        addDebug("  Od: " + moment(result.startDate).format("DD.MM.YYYY HH:mm:ss"), "info");
        addDebug("  Do: " + moment(result.endDate).format("DD.MM.YYYY HH:mm:ss"), "info");
        return result;
    }
    
    // Tento mesiac
    if (normalizedText === "tento mesiac" || normalizedText === "mesiac") {
        var result = {
            isValid: true,
            startDate: moment().startOf('month').toDate(),
            endDate: moment().endOf('month').toDate(),
            popis: "Tento mesiac (" + now.format('MM/YYYY') + ")",
            type: "month"
        };
        addDebug("✅ Rozpoznaný filter: " + result.popis, "success");
        addDebug("  Od: " + moment(result.startDate).format("DD.MM.YYYY HH:mm:ss"), "info");
        addDebug("  Do: " + moment(result.endDate).format("DD.MM.YYYY HH:mm:ss"), "info");
        return result;
    }
    
    // Total/Všetko
    if (normalizedText === "total" || normalizedText === "všetko" || normalizedText === "all") {
        var result = {
            isValid: true,
            startDate: new Date(2000, 0, 1),
            endDate: new Date(2100, 0, 1),
            popis: "Všetky záznamy",
            type: "all"
        };
        addDebug("✅ Rozpoznaný filter: " + result.popis, "success");
        return result;
    }
    
    // Tento týždeň
    if (normalizedText === "tento týždeň" || normalizedText === "týždeň" || 
        normalizedText === "tento tyzden" || normalizedText === "tyzden") {
        var result = {
            isValid: true,
            startDate: moment().startOf('isoWeek').toDate(),
            endDate: moment().endOf('isoWeek').toDate(),
            popis: "Tento týždeň",
            type: "week"
        };
        addDebug("✅ Rozpoznaný filter: " + result.popis, "success");
        addDebug("  Od: " + moment(result.startDate).format("DD.MM.YYYY HH:mm:ss"), "info");
        addDebug("  Do: " + moment(result.endDate).format("DD.MM.YYYY HH:mm:ss"), "info");
        return result;
    }
    
    // MM/YYYY formát
    var monthYearMatch = filterText.match(/^(\d{1,2})\/(\d{4})$/);
    if (monthYearMatch) {
        var month = parseInt(monthYearMatch[1]) - 1;
        var year = parseInt(monthYearMatch[2]);
        
        if (month >= 0 && month <= 11) {
            var startDate = new Date(year, month, 1);
            var endDate = new Date(year, month + 1, 0, 23, 59, 59);
            
            var result = {
                isValid: true,
                startDate: startDate,
                endDate: endDate,
                popis: (month + 1) + "/" + year,
                type: "month"
            };
            addDebug("✅ Rozpoznaný filter MM/YYYY: " + result.popis, "success");
            addDebug("  Od: " + moment(result.startDate).format("DD.MM.YYYY HH:mm:ss"), "info");
            addDebug("  Do: " + moment(result.endDate).format("DD.MM.YYYY HH:mm:ss"), "info");
            return result;
        }
    }
    
    // YYYY formát
    var yearMatch = filterText.match(/^(\d{4})$/);
    if (yearMatch) {
        var year = parseInt(yearMatch[1]);
        var result = {
            isValid: true,
            startDate: new Date(year, 0, 1),
            endDate: new Date(year, 11, 31, 23, 59, 59),
            popis: "Rok " + year,
            type: "year"
        };
        addDebug("✅ Rozpoznaný filter YYYY: " + result.popis, "success");
        addDebug("  Od: " + moment(result.startDate).format("DD.MM.YYYY HH:mm:ss"), "info");
        addDebug("  Do: " + moment(result.endDate).format("DD.MM.YYYY HH:mm:ss"), "info");
        return result;
    }
    
    addDebug("❌ Nerozpoznaný formát filtra: '" + filterText + "'", "error");
    return {
        isValid: false,
        reason: "Nerozpoznaný formát filtra: '" + filterText + "'",
        popis: "Neplatný filter"
    };
}

function dateMatchesFilter(date, filter) {
    if (!filter.isValid) return false;
    if (!date) return false;
    
    try {
        var testDate = new Date(date);
        if (isNaN(testDate.getTime())) return false;
        
        var matches = testDate >= filter.startDate && testDate <= filter.endDate;
        return matches;
    } catch (error) {
        addError("Date parsing error: " + error, "dateMatchesFilter");
        return false;
    }
}

// ==============================================
// POHĽADÁVKY SPRACOVANIE
// ==============================================

function spracujPohladavky(zamestnanecEntry, filter, isTotal) {
    addDebug("=== POHĽADÁVKY SPRACOVANIE ===", "database");
    addDebug("Filter: " + filter.popis, "filter");
    
    var rezultat = {
        pohladavkyFiltrovane: 0,
        pohladavkyTotal: 0,
        celkoveZaznamy: 0
    };
    
    var stats = {
        celkoveZaznamy: 0,
        zahrnuteZaznamy: 0,
        vyluceneStav: 0,
        vyluceneDatum: 0,
        chybneZaznamy: 0
    };
    
    try {
        var pohladavkyZaznamy = zamestnanecEntry.linksFrom(CONFIG.libraries.pohladavky, CONFIG.linksFromFields.pohladavkyZamestnanec);
        
        if (!pohladavkyZaznamy || pohladavkyZaznamy.length === 0) {
            addDebug("Žiadne pohľadávky záznamy", "warning");
            return rezultat;
        }
        
        stats.celkoveZaznamy = pohladavkyZaznamy.length;
        addDebug("Načítaných " + stats.celkoveZaznamy + " pohľadávky záznamov", "database");
        
        for (var i = 0; i < pohladavkyZaznamy.length; i++) {
            try {
                var zaznam = pohladavkyZaznamy[i];
                var datum = safeFieldAccess(zaznam, CONFIG.recordFields.datum);
                var zostatok = safeFieldAccess(zaznam, CONFIG.recordFields.zostatok, 0);
                var stav = safeFieldAccess(zaznam, CONFIG.recordFields.stav, "");
                
                // Kontrola stavu
                var platnyStav = false;
                for (var j = 0; j < CONFIG.validneStavy.length; j++) {
                    if (stav === CONFIG.validneStavy[j]) {
                        platnyStav = true;
                        break;
                    }
                }
                
                if (!platnyStav) {
                    stats.vyluceneStav++;
                    continue;
                }
                
                // Kontrola dátumu
                if (!dateMatchesFilter(datum, filter)) {
                    stats.vyluceneDatum++;
                    continue;
                }
                
                // Započítanie
                if (isTotal) {
                    rezultat.pohladavkyTotal += zostatok;
                } else {
                    rezultat.pohladavkyFiltrovane += zostatok;
                }
                stats.zahrnuteZaznamy++;
                
            } catch (zaznamError) {
                stats.chybneZaznamy++;
                addError("Chyba pohľadávky záznam " + i + ": " + zaznamError.toString(), "spracujPohladavky");
            }
        }
        
        addDebug("📊 Pohľadávky výsledky:", "summary");
        addDebug("  Zahrnuté: " + stats.zahrnuteZaznamy + "/" + stats.celkoveZaznamy, "info");
        addDebug("  Vylúčené (stav): " + stats.vyluceneStav, "warning");
        addDebug("  Vylúčené (dátum): " + stats.vyluceneDatum, "warning");
        addDebug("  💰 Celkový zostatok: " + (isTotal ? rezultat.pohladavkyTotal : rezultat.pohladavkyFiltrovane).toFixed(2) + "€", "money");
        
    } catch (linksFromError) {
        addError("LinksFrom zlyhalo: " + linksFromError.toString(), "spracujPohladavky");
    }
    
    return rezultat;
}

// ==============================================
// ZÁVÄZKY SPRACOVANIE
// ==============================================

function spracujZavazky(zamestnanecEntry, filter, isTotal) {
    addDebug("=== ZÁVÄZKY SPRACOVANIE ===", "database");
    addDebug("Filter: " + filter.popis, "filter");
    
    var rezultat = {
        zavazkyFiltrovane: 0,
        zavazkyTotal: 0,
        celkoveZaznamy: 0
    };
    
    var stats = {
        celkoveZaznamy: 0,
        zahrnuteZaznamy: 0,
        vyluceneStav: 0,
        vyluceneDatum: 0,
        chybneZaznamy: 0
    };
    
    try {
        var zavazkyZaznamy = zamestnanecEntry.linksFrom(CONFIG.libraries.zavazky, CONFIG.linksFromFields.zavazkyZamestnanec);
        
        if (!zavazkyZaznamy || zavazkyZaznamy.length === 0) {
            addDebug("Žiadne záväzky záznamy", "warning");
            return rezultat;
        }
        
        stats.celkoveZaznamy = zavazkyZaznamy.length;
        addDebug("Načítaných " + stats.celkoveZaznamy + " záväzky záznamov", "database");
        
        for (var i = 0; i < zavazkyZaznamy.length; i++) {
            try {
                var zaznam = zavazkyZaznamy[i];
                var datum = safeFieldAccess(zaznam, CONFIG.recordFields.datum);
                var zostatok = safeFieldAccess(zaznam, CONFIG.recordFields.zostatok, 0);
                var stav = safeFieldAccess(zaznam, CONFIG.recordFields.stav, "");
                
                // Kontrola stavu
                var platnyStav = false;
                for (var j = 0; j < CONFIG.validneStavy.length; j++) {
                    if (stav === CONFIG.validneStavy[j]) {
                        platnyStav = true;
                        break;
                    }
                }
                
                if (!platnyStav) {
                    stats.vyluceneStav++;
                    continue;
                }
                
                // Kontrola dátumu
                if (!dateMatchesFilter(datum, filter)) {
                    stats.vyluceneDatum++;
                    continue;
                }
                
                // Započítanie
                if (isTotal) {
                    rezultat.zavazkyTotal += zostatok;
                } else {
                    rezultat.zavazkyFiltrovane += zostatok;
                }
                stats.zahrnuteZaznamy++;
                
            } catch (zaznamError) {
                stats.chybneZaznamy++;
                addError("Chyba záväzky záznam " + i + ": " + zaznamError.toString(), "spracujZavazky");
            }
        }
        
        addDebug("📊 Záväzky výsledky:", "summary");
        addDebug("  Zahrnuté: " + stats.zahrnuteZaznamy + "/" + stats.celkoveZaznamy, "info");
        addDebug("  Vylúčené (stav): " + stats.vyluceneStav, "warning");
        addDebug("  Vylúčené (dátum): " + stats.vyluceneDatum, "warning");
        addDebug("  💰 Celkový zostatok: " + (isTotal ? rezultat.zavazkyTotal : rezultat.zavazkyFiltrovane).toFixed(2) + "€", "money");
        
    } catch (linksFromError) {
        addError("LinksFrom zlyhalo: " + linksFromError.toString(), "spracujZavazky");
    }
    
    return rezultat;
}

// ==============================================
// DOCHÁDZKA SPRACOVANIE
// ==============================================

function spracujDochadzku(zamestnanecEntry, filter, isTotal) {
    addDebug("=== DOCHÁDZKA SPRACOVANIE ===", "database");
    addDebug("Filter: " + filter.popis, "filter");
    
    var rezultat = {
        odpracovaneFiltrovane: 0,
        odpracovaneTotal: 0,
        zarobeneFiltrovane: 0,
        zarobeneTotal: 0
    };
    
    try {
        var dochadzkaZaznamy = zamestnanecEntry.linksFrom(CONFIG.libraries.dochadzka, CONFIG.linksFromFields.dochadzkaZamestnanci);
        
        if (!dochadzkaZaznamy || dochadzkaZaznamy.length === 0) {
            addDebug("Žiadne dochádzka záznamy", "warning");
            return rezultat;
        }
        
        var stats = {
            celkom: dochadzkaZaznamy.length,
            zahrnutych: 0
        };
        
        for (var i = 0; i < dochadzkaZaznamy.length; i++) {
            var zaznam = dochadzkaZaznamy[i];
            var datum = safeFieldAccess(zaznam, CONFIG.recordFields.datum);
            var pracovnaDoba = safeFieldAccess(zaznam, CONFIG.recordFields.pracovnaDoba, 0);
            var mzdoveNaklady = safeFieldAccess(zaznam, CONFIG.recordFields.mzdoveNaklady, 0);
            
            if (dateMatchesFilter(datum, filter)) {
                if (isTotal) {
                    rezultat.odpracovaneTotal += pracovnaDoba;
                    rezultat.zarobeneTotal += mzdoveNaklady;
                } else {
                    rezultat.odpracovaneFiltrovane += pracovnaDoba;
                    rezultat.zarobeneFiltrovane += mzdoveNaklady;
                }
                stats.zahrnutych++;
            }
        }
        
        addDebug("📊 Dochádzka výsledky:", "summary");
        addDebug("  Zahrnuté: " + stats.zahrnutych + "/" + stats.celkom, "info");
        addDebug("  ⏰ Odpracované: " + (isTotal ? rezultat.odpracovaneTotal.toFixed(2) : rezultat.odpracovaneFiltrovane.toFixed(2)) + "h", "time");
        addDebug("  💰 Zarobené: " + (isTotal ? rezultat.zarobeneTotal.toFixed(2) : rezultat.zarobeneFiltrovane.toFixed(2)) + "€", "money");
        
    } catch (error) {
        addError("Chyba pri spracovaní dochádzky: " + error.toString(), "spracujDochadzku");
    }
    
    return rezultat;
}

// ==============================================
// POKLADŇA SPRACOVANIE - OPRAVENÁ
// ==============================================

function spracujPokladna(zamestnanecEntry, filter, isTotal) {
    addDebug("=== POKLADŇA SPRACOVANIE ===", "database");
    addDebug("Filter: " + filter.popis, "filter");
    addDebug("Hľadám záznamy pre zamestnanca...", "database");
    
    var rezultat = {
        vyplateneFiltrovane: 0,
        vyplateneTotal: 0,
        premieFiltrovane: 0,
        premieTotal: 0,
        celkoveZaznamy: 0
    };
    
    var stats = {
        celkoveZaznamy: 0,
        mzdaZaznamy: 0,
        mzdaZalohaZaznamy: 0,
        premiaZaznamy: 0,
        ineZaznamy: 0,
        zahrnuteDatum: 0,
        vyluceneDatum: 0,
        chybneZaznamy: 0
    };
    
    try {
        // Debug LinksFrom volanie
        addDebug("LinksFrom: knižnica='" + CONFIG.libraries.pokladna + "', pole='" + CONFIG.linksFromFields.pokladnaZamestnanec + "'", "database");
        
        var pokladnaZaznamy = zamestnanecEntry.linksFrom(CONFIG.libraries.pokladna, CONFIG.linksFromFields.pokladnaZamestnanec);
        
        if (!pokladnaZaznamy) {
            addDebug("LinksFrom vrátilo null", "error");
            return rezultat;
        }
        
        if (pokladnaZaznamy.length === 0) {
            addDebug("Žiadne pokladňa záznamy nenájdené", "warning");
            return rezultat;
        }
        
        stats.celkoveZaznamy = pokladnaZaznamy.length;
        rezultat.celkoveZaznamy = stats.celkoveZaznamy;
        addDebug("✅ Načítaných " + stats.celkoveZaznamy + " pokladňa záznamov", "success");
        
        for (var i = 0; i < pokladnaZaznamy.length; i++) {
            try {
                var zaznam = pokladnaZaznamy[i];
                var datum = safeFieldAccess(zaznam, CONFIG.recordFields.datum);
                var suma = safeFieldAccess(zaznam, CONFIG.recordFields.suma, 0);
                var ucelVydaja = safeFieldAccess(zaznam, CONFIG.recordFields.ucelVydaja, "");
                
                addDebug("  Záznam " + (i+1) + ":", "info");
                addDebug("    Dátum: " + (datum ? moment(datum).format("DD.MM.YYYY") : "N/A"), "info");
                addDebug("    Účel: '" + ucelVydaja + "'", "info");
                addDebug("    Suma: " + suma + "€", "info");
                
                // Kontrola dátumu
                if (!dateMatchesFilter(datum, filter)) {
                    stats.vyluceneDatum++;
                    addDebug("    → Mimo dátumového rozsahu", "filter");
                    continue;
                }
                
                stats.zahrnuteDatum++;
                
                // Roztriedenie podľa účelu výdaja
                if (ucelVydaja === "Mzda") {
                    stats.mzdaZaznamy++;
                    if (isTotal) {
                        rezultat.vyplateneTotal += suma;
                    } else {
                        rezultat.vyplateneFiltrovane += suma;
                    }
                    addDebug("    → MZDA: +" + suma + "€", "money");
                    
                } else if (ucelVydaja === "Mzda záloha") {
                    stats.mzdaZalohaZaznamy++;
                    if (isTotal) {
                        rezultat.vyplateneTotal += suma;
                    } else {
                        rezultat.vyplateneFiltrovane += suma;
                    }
                    addDebug("    → ZÁLOHA: +" + suma + "€", "money");
                    
                } else if (ucelVydaja === "Mzda prémia") {
                    stats.premiaZaznamy++;
                    if (isTotal) {
                        rezultat.premieTotal += suma;
                    } else {
                        rezultat.premieFiltrovane += suma;
                    }
                    addDebug("    → PRÉMIA: +" + suma + "€", "money");
                    
                } else {
                    stats.ineZaznamy++;
                    addDebug("    → INÉ ('" + ucelVydaja + "') - nezapočítané", "warning");
                }
                
            } catch (zaznamError) {
                stats.chybneZaznamy++;
                addError("Chyba pokladňa záznam " + i + ": " + zaznamError.toString(), "spracujPokladna");
            }
        }
        
        // SUMMARY REPORT
        addDebug("📊 Pokladňa súhrn:", "summary");
        addDebug("  Záznamy celkom: " + stats.celkoveZaznamy, "info");
        addDebug("  Zahrnuté (dátum OK): " + stats.zahrnuteDatum, "info");
        addDebug("  Vylúčené (dátum): " + stats.vyluceneDatum, "warning");
        addDebug("  • Mzda: " + stats.mzdaZaznamy, "info");
        addDebug("  • Mzda záloha: " + stats.mzdaZalohaZaznamy, "info");
        addDebug("  • Mzda prémia: " + stats.premiaZaznamy, "info");
        addDebug("  • Iné: " + stats.ineZaznamy, "info");
        
        if (isTotal) {
            addDebug("💰 TOTAL Vyplatené (Mzda+Záloha): " + rezultat.vyplateneTotal.toFixed(2) + "€", "money");
            addDebug("💎 TOTAL Prémie: " + rezultat.premieTotal.toFixed(2) + "€", "money");
        } else {
            addDebug("💰 Vyplatené (Mzda+Záloha): " + rezultat.vyplateneFiltrovane.toFixed(2) + "€", "money");
            addDebug("💎 Prémie: " + rezultat.premieFiltrovane.toFixed(2) + "€", "money");
        }
        
    } catch (linksFromError) {
        addError("LinksFrom zlyhalo: " + linksFromError.toString(), "spracujPokladna");
        addDebug("Detaily chyby: " + linksFromError.stack, "error");
    }
    
    return rezultat;
}

// ==============================================
// AKTUÁLNA HODINOVKA
// ==============================================

function getAktualnaHodinovka(zamestnanecEntry) {
    try {
        var sadzbyZaznamy = zamestnanecEntry.linksFrom(CONFIG.libraries.sadzby, "Zamestnanec");
        
        if (!sadzbyZaznamy || sadzbyZaznamy.length === 0) {
            addDebug("Žiadne sadzby nenájdené", "warning");
            return 0;
        }
        
        // Nájdi najnovšiu sadzbu
        var najnovsiaSadzba = null;
        var najnovsiDatum = null;
        
        for (var i = 0; i < sadzbyZaznamy.length; i++) {
            var zaznam = sadzbyZaznamy[i];
            var platnostOd = safeFieldAccess(zaznam, "Platnosť od");
            var sadzba = safeFieldAccess(zaznam, "Sadzba", 0);
            
            if (platnostOd) {
                var datum = new Date(platnostOd);
                if (!najnovsiDatum || datum > najnovsiDatum) {
                    najnovsiDatum = datum;
                    najnovsiaSadzba = sadzba;
                }
            }
        }
        
        addDebug("Aktuálna hodinovka: " + (najnovsiaSadzba || 0) + "€/h", "money");
        return najnovsiaSadzba || 0;
        
    } catch (error) {
        addError("Chyba pri získavaní hodinovky: " + error.toString(), "getAktualnaHodinovka");
        return 0;
    }
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        addDebug("=== ŠTART PREPOČTU v" + CONFIG.version + " ===", "start");
        
        // KROK 0: Vynulovanie všetkých polí
        clearAllFields();
        
        // KROK 1: Validácia základných polí
        addDebug("KROK 1: Validácia základných polí...", "step");
        
        var nick = safeFieldAccess(currentEntry, CONFIG.fields.nick);
        var vyberObdobia = safeFieldAccess(currentEntry, CONFIG.fields.vyberObdobia, "");
        var obdobieTotal = safeFieldAccess(currentEntry, CONFIG.fields.obdobieTotal, "");
        
        if (!nick) {
            addError("Nick je povinný identifikátor", "validation");
            saveLogsToEntry();
            return false;
        }
        
        addDebug("👤 Zamestnanec: " + nick, "person");
        addDebug("🔍 Filter výber obdobia: '" + vyberObdobia + "'", "filter");
        addDebug("🔍 Filter obdobie total: '" + obdobieTotal + "'", "filter");
        
        // KROK 2: Parsovanie filtrov
        addDebug("KROK 2: Parsovanie filtrov...", "step");
        
        var filter = parseFilterDateRange(vyberObdobia);
        var filterTotal = parseFilterDateRange(obdobieTotal);
        
        if (!filter.isValid) {
            addError("Neplatný filter výber obdobia: " + filter.reason, "filter");
            saveLogsToEntry();
            return false;
        }
        
        if (!filterTotal.isValid) {
            addError("Neplatný filter obdobie total: " + filterTotal.reason, "filter");
            saveLogsToEntry();
            return false;
        }
        
        // KROK 3: Spracovanie všetkých knižníc
        addDebug("KROK 3: Spracovanie všetkých knižníc...", "step");
        
        // Filtrované údaje (používa vyberObdobia filter)
        var pohladavkyData = spracujPohladavky(currentEntry, filter, false);
        var zavazkyData = spracujZavazky(currentEntry, filter, false);
        var dochadzkaData = spracujDochadzku(currentEntry, filter, false);
        var pokladnaData = spracujPokladna(currentEntry, filter, false);
        
        // Total údaje (používa obdobieTotal filter)
        var dochadzkaDataTotal = spracujDochadzku(currentEntry, filterTotal, true);
        var pokladnaDataTotal = spracujPokladna(currentEntry, filterTotal, true);
        
        // KROK 4: Výpočty
        addDebug("KROK 4: Výpočty...", "step");
        
        // Saldo = Záväzky - Pohľadávky
        var saldo = formatAmount(zavazkyData.zavazkyFiltrovane - pohladavkyData.pohladavkyFiltrovane);
        
        addDebug("=== VÝPOČET SALDA ===", "calculation");
        addDebug("📉 Záväzky: " + zavazkyData.zavazkyFiltrovane.toFixed(2) + "€", "money");
        addDebug("📈 Pohľadávky: " + pohladavkyData.pohladavkyFiltrovane.toFixed(2) + "€", "money");
        addDebug("ℹ️ Vzorec: Saldo = Záväzky - Pohľadávky", "info");
        addDebug("🧮 Výpočet: " + zavazkyData.zavazkyFiltrovane.toFixed(2) + " - " + 
                pohladavkyData.pohladavkyFiltrovane.toFixed(2) + " = " + saldo.toFixed(2) + "€", "calculation");
        
        // Preplatok/Nedoplatok = Zarobené - Vyplatené
        var preplatokNedoplatok = formatAmount(dochadzkaData.zarobeneFiltrovane - pokladnaData.vyplateneFiltrovane);
        
        addDebug("=== VÝPOČET PREPLATOK/NEDOPLATOK ===", "calculation");
        addDebug("💵 Zarobené: " + dochadzkaData.zarobeneFiltrovane.toFixed(2) + "€", "money");
        addDebug("💸 Vyplatené (Mzda+Záloha): " + pokladnaData.vyplateneFiltrovane.toFixed(2) + "€", "money");
        addDebug("ℹ️ Vzorec: Preplatok/Nedoplatok = Zarobené - Vyplatené", "info");
        addDebug("🧮 Výpočet: " + dochadzkaData.zarobeneFiltrovane.toFixed(2) + " - " +
                pokladnaData.vyplateneFiltrovane.toFixed(2) + " = " + preplatokNedoplatok.toFixed(2) + "€", "calculation");
        
        // Aktuálna hodinovka
        var aktualnaHodinovka = getAktualnaHodinovka(currentEntry);
        
        // KROK 5: Uloženie výsledkov
        addDebug("KROK 5: Uloženie výsledkov...", "step");
        
        // Pohľadávky a záväzky
        currentEntry.set(CONFIG.fields.pohladavky, formatAmount(pohladavkyData.pohladavkyFiltrovane));
        currentEntry.set(CONFIG.fields.zavazky, formatAmount(zavazkyData.zavazkyFiltrovane));
        currentEntry.set(CONFIG.fields.saldo, saldo);
        
        // Dochádzka - filtrované
        currentEntry.set(CONFIG.fields.odpracovane, formatAmount(dochadzkaData.odpracovaneFiltrovane));
        currentEntry.set(CONFIG.fields.zarobene, formatAmount(dochadzkaData.zarobeneFiltrovane));
        
        // Dochádzka - total (zaokrúhlené na 2 desatinné miesta)
        currentEntry.set(CONFIG.fields.odpracovaneTotal, formatAmount(dochadzkaDataTotal.odpracovaneTotal));
        currentEntry.set(CONFIG.fields.zarobeneTotal, formatAmount(dochadzkaDataTotal.zarobeneTotal));
        
        // Pokladňa - filtrované
        currentEntry.set(CONFIG.fields.vyplatene, formatAmount(pokladnaData.vyplateneFiltrovane));
        currentEntry.set(CONFIG.fields.premie, formatAmount(pokladnaData.premieFiltrovane));
        
        // Pokladňa - total
        currentEntry.set(CONFIG.fields.vyplateneTotal, formatAmount(pokladnaDataTotal.vyplateneTotal));
        currentEntry.set(CONFIG.fields.premieTotal, formatAmount(pokladnaDataTotal.premieTotal));
        
        // Ostatné
        currentEntry.set(CONFIG.fields.preplatokNedoplatok, preplatokNedoplatok);
        currentEntry.set(CONFIG.fields.aktualnaHodinovka, formatAmount(aktualnaHodinovka));
        
        // Finálny súhrn
        addDebug("=== 🏁 FINÁLNY SÚHRN ===", "summary");
        addDebug("📈 Pohľadávky: " + pohladavkyData.pohladavkyFiltrovane.toFixed(2) + "€", "money");
        addDebug("📉 Záväzky: " + zavazkyData.zavazkyFiltrovane.toFixed(2) + "€", "money");
        addDebug("💹 Saldo (Záväzky-Pohľadávky): " + saldo.toFixed(2) + "€", "money");
        addDebug("⏰ Odpracované: " + dochadzkaData.odpracovaneFiltrovane.toFixed(2) + "h / Total: " + 
                dochadzkaDataTotal.odpracovaneTotal.toFixed(2) + "h", "time");
        addDebug("💵 Zarobené: " + dochadzkaData.zarobeneFiltrovane.toFixed(2) + "€ / Total: " + 
                dochadzkaDataTotal.zarobeneTotal.toFixed(2) + "€", "money");
        addDebug("💸 Vyplatené: " + pokladnaData.vyplateneFiltrovane.toFixed(2) + "€ / Total: " + 
                pokladnaDataTotal.vyplateneTotal.toFixed(2) + "€", "money");
        addDebug("💎 Prémie: " + pokladnaData.premieFiltrovane.toFixed(2) + "€ / Total: " + 
                pokladnaDataTotal.premieTotal.toFixed(2) + "€", "money");
        addDebug("📊 Preplatok/Nedoplatok: " + preplatokNedoplatok.toFixed(2) + "€", "money");
        addDebug("💰 Aktuálna hodinovka: " + aktualnaHodinovka.toFixed(2) + "€/h", "money");
        
        addDebug("✅ Prepočet úspešne dokončený", "success");
        saveLogsToEntry();
        
        return true;
        
    } catch (error) {
        addError("Kritická chyba: " + error.toString(), "main");
        addDebug("Stack trace: " + error.stack, "error");
        saveLogsToEntry();
        return false;
    }
}

// Spustenie hlavnej funkcie
main();