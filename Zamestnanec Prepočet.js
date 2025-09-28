// ==============================================
// MEMENTO DATABASE - KOMPLEXNÝ PREPOČET ZAMESTNANCA
// Verzia: 4.5 | Dátum: 10.08.2025 | Autor: JavaScript Expert
// Knižnica: Zamestnanci | Trigger: Before Save
// ==============================================
// ✅ NOVÉ v4.5: KRITICKÉ OPRAVY filtrov a logiky
//    - OPRAVENÉ: Filter total teraz správne filtruje podľa filterTotal
//    - OPRAVENÉ: Pokladňa filtruje len "Mzda" a "Mzda záloha" → "Vyplatené"
//    - OPRAVENÉ: Pohľadávky/Záväzky používajú "výber obdobia" filter
//    - OPRAVENÉ: Aktuálna hodinovka debug a logika
//    - ODSTRÁNENÉ: pole "Zálohy" nahradené "Vyplatené"
// ✅ NOVÉ v4.4: KRITICKÉ OPRAVY a rozšírenia
//    - Týždeň začína v pondelok, Pohľadávky/Záväzky pole "Zostatok"
// ==============================================

var CONFIG = {
    debug: true,
    version: "4.5",
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
        summary: "📊"
    },
    
    // Polia v knižnici Zamestnanci
    fields: {
        nick: "Nick",
        meno: "Meno",
        priezvisko: "Priezvisko",
        vyberObdobia: "výber obdobia",        // Filter pre filtrované polia
        obdobieTotal: "obdobie total",        // Filter pre total polia
        
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
        preplatokNedoplatok: "Preplatok/Nedoplatok",
        
        // NOVÉ: Pohľadávky a Záväzky
        pohladavky: "Pohľadávky",
        zavazky: "Záväzky", 
        saldo: "Saldo",
        
        // NOVÉ: Pokladňa
        vyplatene: "Vyplatené",
        vyplateneTotal: "Vyplatené total",
        preplatokNedoplatok: "Preplatok/Nedoplatok",
        
        // Info a debug
        info: "info",
        debugLog: "Debug_Log",
        errorLog: "Error_Log"
    },
    
    // Názvy polí pre LinksFrom operácie
    linksFromFields: {
        sadzbyZamestnanec: "Zamestnanec",
        dochadzkaZamestnanci: "Zamestnanci",
        zaznamZamestnanci: "Zamestnanci",
        knihaPosadka: "Posádka",
        pohladavkyZamestnanec: "Zamestnanec",
        zavazkyZamestnanec: "Zamestnanec",
        pokladnaZamestnanec: "Zamestnanec"
    },
    
    // Polia v záznamoch
    recordFields: {
        datum: "Dátum",
        pracovnaDoba: "Pracovná doba",
        celkovyCas: "Celkový čas",
        platnostOd: "Platnosť od",
        sadzba: "Sadzba",
        sumaSDPH: "Suma s DPH",
        zaplatene: "Zaplatené",
        zostatok: "Zostatok",
        stav: "Stav",
        suma: "Suma",
        ucelVydaja: "Účel výdaja"
    }
};

// Globálne premenné
var debugLog = [];
var errorLog = [];
var currentEntry = entry();

// ==============================================
// DEBUG A ERROR HANDLING SYSTÉM
// ==============================================

function addDebug(message, section) {
    if (CONFIG.debug) {
        var timestamp = moment().format("DD.MM.YY HH:mm:ss");
        var icon = section ? CONFIG.icons[section] || CONFIG.icons.info : CONFIG.icons.info;
        debugLog.push("[" + timestamp + "] " + icon + " " + message);
    }
}

function addError(message, location) {
    var timestamp = moment().format("DD.MM.YY HH:mm:ss");
    var errorMessage = "[" + timestamp + "] " + CONFIG.icons.error + " " + 
                      (location ? "[" + location + "] " : "") + message;
    errorLog.push(errorMessage);
}

function saveLogsToEntry() {
    try {
        if (debugLog.length > 0) {
            currentEntry.set(CONFIG.fields.debugLog, debugLog.join("\n"));
        }
        if (errorLog.length > 0) {
            currentEntry.set(CONFIG.fields.errorLog, errorLog.join("\n"));
        }
    } catch (error) {
        // Fallback - ak sa nepodaria uložiť logy
    }
}

// ==============================================
// UTILITY FUNKCIE
// ==============================================

function safeFieldAccess(entry, fieldName, defaultValue) {
    try {
        var value = entry ? entry.field(fieldName) : null;
        return value !== null && value !== undefined ? value : (defaultValue || null);
    } catch (error) {
        addError("Field access failed for '" + fieldName + "': " + error, "safeFieldAccess");
        return defaultValue || null;
    }
}

function parseFilterDateRange(filterText) {
    addDebug("Parsovanie dátumového filtra: '" + filterText + "'", "filter");
    
    if (!filterText) {
        return { isValid: false, reason: "Prázdny filter" };
    }
    
    var cleanFilter = filterText.trim().toLowerCase();
    var now = moment();
    
    // TEXTOVÉ VÝRAZY
    var textualPatterns = {
        // ROČNÉ FILTRE
        "tento rok": {
            type: "yearly",
            year: now.year(),
            popis: "tento rok (" + now.year() + ")"
        },
        "minulý rok": {
            type: "yearly", 
            year: now.year() - 1,
            popis: "minulý rok (" + (now.year() - 1) + ")"
        },
        
        // MESAČNÉ FILTRE
        "tento mesiac": {
            type: "monthly",
            month: now.month() + 1,
            year: now.year(),
            popis: "tento mesiac (" + (now.month() + 1) + "/" + now.year() + ")"
        },
        "minulý mesiac": {
            type: "monthly",
            month: now.month() === 0 ? 12 : now.month(),
            year: now.month() === 0 ? now.year() - 1 : now.year(),
            popis: "minulý mesiac (" + (now.month() === 0 ? 12 : now.month()) + "/" + (now.month() === 0 ? now.year() - 1 : now.year()) + ")"
        },
        
        // TÝŽDENNÉ FILTRE (pondelok ako začiatok týždňa)
        "tento týždeň": {
            type: "range",
            startDate: now.clone().startOf('isoWeek'),
            endDate: now.clone().endOf('isoWeek'),
            popis: "tento týždeň (od " + now.clone().startOf('isoWeek').format('DD.MM') + " do " + now.clone().endOf('isoWeek').format('DD.MM') + ")"
        },
        "tento tyzden": {  // alternatívna verzia bez diakritiky
            type: "range",
            startDate: now.clone().startOf('isoWeek'),
            endDate: now.clone().endOf('isoWeek'),
            popis: "tento týždeň (od " + now.clone().startOf('isoWeek').format('DD.MM') + " do " + now.clone().endOf('isoWeek').format('DD.MM') + ")"
        },
        "minulý týždeň": {
            type: "range",
            startDate: now.clone().subtract(1, 'week').startOf('isoWeek'),
            endDate: now.clone().subtract(1, 'week').endOf('isoWeek'),
            popis: "minulý týždeň (od " + now.clone().subtract(1, 'week').startOf('isoWeek').format('DD.MM') + " do " + now.clone().subtract(1, 'week').endOf('isoWeek').format('DD.MM') + ")"
        },
        "minuly tyzden": {  // alternatívna verzia bez diakritiky
            type: "range",
            startDate: now.clone().subtract(1, 'week').startOf('isoWeek'),
            endDate: now.clone().subtract(1, 'week').endOf('isoWeek'),
            popis: "minulý týždeň (od " + now.clone().subtract(1, 'week').startOf('isoWeek').format('DD.MM') + " do " + now.clone().subtract(1, 'week').endOf('isoWeek').format('DD.MM') + ")"
        },
        
        // DENNÉ ROZSAHY
        "posledných 7 dní": {
            type: "range",
            startDate: now.clone().subtract(7, 'days'),
            endDate: now,
            popis: "posledných 7 dní"
        },
        "posledných 14 dní": {
            type: "range",
            startDate: now.clone().subtract(14, 'days'),
            endDate: now,
            popis: "posledných 14 dní"
        },
        "posledných 30 dní": {
            type: "range",
            startDate: now.clone().subtract(30, 'days'),
            endDate: now,
            popis: "posledných 30 dní"
        },
        "posledných 90 dní": {
            type: "range", 
            startDate: now.clone().subtract(90, 'days'),
            endDate: now,
            popis: "posledných 90 dní"
        },
        
        // ŠPECIÁLNE FILTRE
        "total": {
            type: "all",
            popis: "všetky záznamy (bez filtra)"
        },
        "všetko": {
            type: "all",
            popis: "všetky záznamy (bez filtra)"
        },
        "vsetko": {  // bez diakritiky
            type: "all",
            popis: "všetky záznamy (bez filtra)"
        },
        "všetky": {
            type: "all",
            popis: "všetky záznamy (bez filtra)"
        }
    };
    
    // Skontroluj textové výrazy
    if (textualPatterns[cleanFilter]) {
        var pattern = textualPatterns[cleanFilter];
        addDebug("Rozpoznaný textový filter: " + cleanFilter, "success");
        return {
            isValid: true,
            type: pattern.type,
            month: pattern.month,
            year: pattern.year,
            startDate: pattern.startDate,
            endDate: pattern.endDate,
            popis: pattern.popis
        };
    }
    
    // ČÍSELNÉ FORMÁTY: MM/YYYY, MM.YYYY, YYYY, MM/YY, MM.YY
    var numericPatterns = [
        /^(\d{1,2})[\/\.](\d{4})$/, // MM/YYYY alebo MM.YYYY
        /^(\d{4})$/,                // YYYY
        /^(\d{1,2})[\/\.](\d{2})$/  // MM/YY
    ];
    
    for (var i = 0; i < numericPatterns.length; i++) {
        var match = filterText.trim().match(numericPatterns[i]);
        if (match) {
            addDebug("Rozpoznaný číselný filter, pattern " + i, "success");
            if (i === 0) { // MM/YYYY
                return {
                    isValid: true,
                    month: parseInt(match[1]),
                    year: parseInt(match[2]),
                    type: "monthly",
                    popis: "mesiac " + match[1] + "/" + match[2]
                };
            } else if (i === 1) { // YYYY
                return {
                    isValid: true,
                    year: parseInt(match[1]),
                    type: "yearly",
                    popis: "rok " + match[1]
                };
            } else if (i === 2) { // MM/YY
                var fullYear = parseInt(match[2]) + 2000;
                return {
                    isValid: true,
                    month: parseInt(match[1]),
                    year: fullYear,
                    type: "monthly",
                    popis: "mesiac " + match[1] + "/" + fullYear
                };
            }
        }
    }
    
    return { isValid: false, reason: "Neplatný formát. Podporované: 'Tento rok', 'Tento mesiac', 'Tento týždeň', 'Total', 'Všetko', 'MM/YYYY', 'YYYY'" };
}

function dateMatchesFilter(datum, filter) {
    if (!datum || !filter.isValid) return false;
    
    // Špeciálny prípad pre "total" filter - zahrnúť všetko
    if (filter.type === "all") return true;
    
    var recordDate = moment(datum);
    if (!recordDate.isValid()) return false;
    
    if (filter.type === "yearly") {
        return recordDate.year() === filter.year;
    } else if (filter.type === "monthly") {
        return recordDate.year() === filter.year && (recordDate.month() + 1) === filter.month;
    } else if (filter.type === "range") {
        return recordDate.isBetween(filter.startDate, filter.endDate, 'day', '[]');
    }
    
    return false;
}

// ==============================================
// HLAVNÉ VÝPOČTOVÉ FUNKCIE
// ==============================================

function spracujDochadzku(zamestnanecEntry, filter, isTotal) {
    addDebug("=== DOCHÁDZKA SPRACOVANIE ===", "database");
    addDebug("Filter typ: " + (isTotal ? "TOTAL" : "FILTERED") + " (" + filter.popis + ")", "filter");
    
    var rezultat = {
        odpracovaneFiltrovane: 0,
        odpracovaneTotal: 0,
        zarobeneFiltrovane: 0,
        zarobeneTotal: 0,
        celkoveZaznamy: 0
    };
    
    var stats = {
        celkoveZaznamy: 0,
        zahrnuteZaznamy: 0,
        chybneZaznamy: 0
    };
    
    try {
        var dochadzkaZaznamy = zamestnanecEntry.linksFrom(CONFIG.libraries.dochadzka, CONFIG.linksFromFields.dochadzkaZamestnanci);
        
        if (!dochadzkaZaznamy || dochadzkaZaznamy.length === 0) {
            addDebug("Žiadne dochádzka záznamy", "warning");
            return rezultat;
        }
        
        stats.celkoveZaznamy = dochadzkaZaznamy.length;
        rezultat.celkoveZaznamy = stats.celkoveZaznamy;
        addDebug("Spracúvam " + stats.celkoveZaznamy + " dochádzka záznamov", "database");
        
        for (var i = 0; i < dochadzkaZaznamy.length; i++) {
            try {
                var zaznam = dochadzkaZaznamy[i];
                var datum = safeFieldAccess(zaznam, CONFIG.recordFields.datum);
                var pracovnaDoba = safeFieldAccess(zaznam, CONFIG.recordFields.pracovnaDoba, 0);
                
                // Získaj dennú mzdu z atribútov - OPRAVENÉ: getAttr → attr
                var dennaMzda = 0;
                try {
                    dennaMzda = zaznam.attr("denná mzda") || 0;
                } catch (attrError) {
                    addDebug("Atribút 'denná mzda' nedostupný pre záznam " + i, "warning");
                }
                
                // OPRAVENÉ: Pre TOTAL aj FILTERED používaj filter
                if (dateMatchesFilter(datum, filter)) {
                    if (isTotal) {
                        rezultat.odpracovaneTotal += pracovnaDoba;
                        rezultat.zarobeneTotal += dennaMzda;
                    } else {
                        rezultat.odpracovaneFiltrovane += pracovnaDoba;
                        rezultat.zarobeneFiltrovane += dennaMzda;
                    }
                    stats.zahrnuteZaznamy++;
                }
                
            } catch (zaznamError) {
                stats.chybneZaznamy++;
                addError("Chyba dochádzka záznam " + i + ": " + zaznamError.toString(), "spracujDochadzku");
            }
        }
        
        // SUMMARY REPORT
        addDebug("DOCHÁDZKA SUMMARY:", "summary");
        addDebug("📊 Záznamy: " + stats.celkoveZaznamy + " total, " + stats.zahrnuteZaznamy + " zahrnuté, " + stats.chybneZaznamy + " chýb", "info");
        
        if (isTotal) {
            addDebug("📈 Total (" + filter.popis + "): " + rezultat.odpracovaneTotal.toFixed(2) + "h, " + rezultat.zarobeneTotal.toFixed(2) + "€", "calculation");
        } else {
            addDebug("📈 Filtrované (" + filter.popis + "): " + rezultat.odpracovaneFiltrovane.toFixed(2) + "h, " + rezultat.zarobeneFiltrovane.toFixed(2) + "€", "calculation");
        }
        
    } catch (linksFromError) {
        addError("LinksFrom zlyhalo: " + linksFromError.toString(), "spracujDochadzku");
    }
    
    return rezultat;
}

function spracujZaznamPrac(zamestnanecEntry, filter, isTotal) {
    addDebug("=== ZÁZNAM PRÁC SPRACOVANIE ===", "database");
    addDebug("Filter typ: " + (isTotal ? "TOTAL" : "FILTERED") + " (" + filter.popis + ")", "filter");
    
    var rezultat = {
        naZakazkachFiltrovane: 0,
        naZakazkachTotal: 0,
        celkoveZaznamy: 0
    };
    
    var stats = {
        celkoveZaznamy: 0,
        zahrnuteZaznamy: 0,
        chybneZaznamy: 0
    };
    
    try {
        var zaznamyPrac = zamestnanecEntry.linksFrom(CONFIG.libraries.zaznamPrac, CONFIG.linksFromFields.zaznamZamestnanci);
        
        if (!zaznamyPrac || zaznamyPrac.length === 0) {
            addDebug("Žiadne záznam prác záznamy", "warning");
            return rezultat;
        }
        
        stats.celkoveZaznamy = zaznamyPrac.length;
        rezultat.celkoveZaznamy = stats.celkoveZaznamy;
        addDebug("Spracúvam " + stats.celkoveZaznamy + " záznam prác záznamov", "database");
        
        for (var i = 0; i < zaznamyPrac.length; i++) {
            try {
                var zaznam = zaznamyPrac[i];
                var datum = safeFieldAccess(zaznam, CONFIG.recordFields.datum);
                var pracovnaDoba = safeFieldAccess(zaznam, CONFIG.recordFields.pracovnaDoba, 0);
                
                // OPRAVENÉ: Pre TOTAL aj FILTERED používaj filter
                if (dateMatchesFilter(datum, filter)) {
                    if (isTotal) {
                        rezultat.naZakazkachTotal += pracovnaDoba;
                    } else {
                        rezultat.naZakazkachFiltrovane += pracovnaDoba;
                    }
                    stats.zahrnuteZaznamy++;
                }
                
            } catch (zaznamError) {
                stats.chybneZaznamy++;
                addError("Chyba záznam prác " + i + ": " + zaznamError.toString(), "spracujZaznamPrac");
            }
        }
        
        // SUMMARY REPORT
        addDebug("ZÁZNAM PRÁC SUMMARY:", "summary");
        addDebug("📊 Záznamy: " + stats.celkoveZaznamy + " total, " + stats.zahrnuteZaznamy + " zahrnuté, " + stats.chybneZaznamy + " chýb", "info");
        
        if (isTotal) {
            addDebug("📈 Total (" + filter.popis + "): " + rezultat.naZakazkachTotal.toFixed(2) + "h", "calculation");
        } else {
            addDebug("📈 Filtrované (" + filter.popis + "): " + rezultat.naZakazkachFiltrovane.toFixed(2) + "h", "calculation");
        }
        
    } catch (linksFromError) {
        addError("LinksFrom zlyhalo: " + linksFromError.toString(), "spracujZaznamPrac");
    }
    
    return rezultat;
}

function spracujKnihaJazd(zamestnanecEntry, filter, isTotal) {
    addDebug("=== KNIHA JÁZD SPRACOVANIE ===", "database");
    addDebug("Filter typ: " + (isTotal ? "TOTAL" : "FILTERED") + " (" + filter.popis + ")", "filter");
    
    var rezultat = {
        jazdyFiltrovane: 0,
        jazdyTotal: 0,
        celkoveZaznamy: 0
    };
    
    var stats = {
        celkoveZaznamy: 0,
        zahrnuteZaznamy: 0,
        chybneZaznamy: 0
    };
    
    try {
        var knihaZaznamy = zamestnanecEntry.linksFrom(CONFIG.libraries.knihaJazd, CONFIG.linksFromFields.knihaPosadka);
        
        if (!knihaZaznamy || knihaZaznamy.length === 0) {
            addDebug("Žiadne kniha jázd záznamy", "warning");
            return rezultat;
        }
        
        stats.celkoveZaznamy = knihaZaznamy.length;
        rezultat.celkoveZaznamy = stats.celkoveZaznamy;
        addDebug("Spracúvam " + stats.celkoveZaznamy + " kniha jázd záznamov", "database");
        
        for (var i = 0; i < knihaZaznamy.length; i++) {
            try {
                var zaznam = knihaZaznamy[i];
                var datum = safeFieldAccess(zaznam, CONFIG.recordFields.datum);
                var celkovyCas = safeFieldAccess(zaznam, CONFIG.recordFields.celkovyCas, 0);
                
                // OPRAVENÉ: Pre TOTAL aj FILTERED používaj filter
                if (dateMatchesFilter(datum, filter)) {
                    if (isTotal) {
                        rezultat.jazdyTotal += celkovyCas;
                    } else {
                        rezultat.jazdyFiltrovane += celkovyCas;
                    }
                    stats.zahrnuteZaznamy++;
                }
                
            } catch (zaznamError) {
                stats.chybneZaznamy++;
                addError("Chyba kniha jázd " + i + ": " + zaznamError.toString(), "spracujKnihaJazd");
            }
        }
        
        // SUMMARY REPORT
        addDebug("KNIHA JÁZD SUMMARY:", "summary");
        addDebug("📊 Záznamy: " + stats.celkoveZaznamy + " total, " + stats.zahrnuteZaznamy + " zahrnuté, " + stats.chybneZaznamy + " chýb", "info");
        
        if (isTotal) {
            addDebug("📈 Total (" + filter.popis + "): " + rezultat.jazdyTotal.toFixed(2) + "h", "calculation");
        } else {
            addDebug("📈 Filtrované (" + filter.popis + "): " + rezultat.jazdyFiltrovane.toFixed(2) + "h", "calculation");
        }
        
    } catch (linksFromError) {
        addError("LinksFrom zlyhalo: " + linksFromError.toString(), "spracujKnihaJazd");
    }
    
    return rezultat;
}

// ==============================================
// NOVÉ: POKLADŇA SPRACOVANIE
// ==============================================

function spracujPokladna(zamestnanecEntry, filter, isTotal) {
    addDebug("=== POKLADŇA SPRACOVANIE ===", "database");
    addDebug("Filter typ: " + (isTotal ? "TOTAL" : "FILTERED") + " (" + filter.popis + ")", "filter");
    
    var rezultat = {
        pokladnaFiltrovane: 0,
        pokladnaTotal: 0,
        celkoveZaznamy: 0
    };
    
    var stats = {
        celkoveZaznamy: 0,
        zahrnuteZaznamy: 0,
        chybneZaznamy: 0,
        vyluceneUcel: 0
    };
    
    try {
        var pokladnaZaznamy = zamestnanecEntry.linksFrom(CONFIG.libraries.pokladna, CONFIG.linksFromFields.pokladnaZamestnanec);
        
        if (!pokladnaZaznamy || pokladnaZaznamy.length === 0) {
            addDebug("Žiadne pokladňa záznamy", "warning");
            return rezultat;
        }
        
        stats.celkoveZaznamy = pokladnaZaznamy.length;
        rezultat.celkoveZaznamy = stats.celkoveZaznamy;
        addDebug("Spracúvam " + stats.celkoveZaznamy + " pokladňa záznamov", "database");
        
        for (var i = 0; i < pokladnaZaznamy.length; i++) {
            try {
                var zaznam = pokladnaZaznamy[i];
                var datum = safeFieldAccess(zaznam, CONFIG.recordFields.datum);
                var suma = safeFieldAccess(zaznam, CONFIG.recordFields.suma, 0);
                var ucelVydaja = safeFieldAccess(zaznam, CONFIG.recordFields.ucelVydaja, "");
                
                // FILTER LEN "Mzda" a "Mzda záloha"
                if (ucelVydaja !== "Mzda" && ucelVydaja !== "Mzda záloha") {
                    stats.vyluceneUcel++;
                    continue; // Preskočiť tento záznam
                }
                
                // OPRAVENÉ: Pre TOTAL aj FILTERED používaj filter
                if (dateMatchesFilter(datum, filter)) {
                    if (isTotal) {
                        rezultat.pokladnaTotal += suma;
                    } else {
                        rezultat.pokladnaFiltrovane += suma;
                    }
                    stats.zahrnuteZaznamy++;
                }
                
            } catch (zaznamError) {
                stats.chybneZaznamy++;
                addError("Chyba pokladňa záznam " + i + ": " + zaznamError.toString(), "spracujPokladna");
            }
        }
        
        // SUMMARY REPORT
        addDebug("POKLADŇA SUMMARY:", "summary");
        addDebug("📊 Záznamy: " + stats.celkoveZaznamy + " total, " + stats.zahrnuteZaznamy + " mzdové, " + stats.vyluceneUcel + " vylúčené (iný účel), " + stats.chybneZaznamy + " chýb", "info");
        
        if (isTotal) {
            addDebug("💰 Total vyplatené (" + filter.popis + "): " + rezultat.pokladnaTotal.toFixed(2) + "€", "money");
        } else {
            addDebug("💰 Filtrované vyplatené (" + filter.popis + "): " + rezultat.pokladnaFiltrovane.toFixed(2) + "€", "money");
        }
        
    } catch (linksFromError) {
        addError("LinksFrom zlyhalo: " + linksFromError.toString(), "spracujPokladna");
    }
    
    return rezultat;
}

function spracujPohladavky(zamestnanecEntry, filter, isTotal) {
    addDebug("=== POHĽADÁVKY SPRACOVANIE ===", "database");
    addDebug("Filter typ: " + (isTotal ? "TOTAL" : "FILTERED") + " (" + filter.popis + ")", "filter");
    
    var rezultat = {
        pohladavkyFiltrovane: 0,
        pohladavkyTotal: 0,
        celkoveZaznamy: 0
    };
    
    var stats = {
        celkoveZaznamy: 0,
        zahrnuteZaznamy: 0,
        chybneZaznamy: 0
    };
    
    try {
        var pohladavkyZaznamy = zamestnanecEntry.linksFrom(CONFIG.libraries.pohladavky, CONFIG.linksFromFields.pohladavkyZamestnanec);
        
        if (!pohladavkyZaznamy || pohladavkyZaznamy.length === 0) {
            addDebug("Žiadne pohľadávky záznamy", "warning");
            return rezultat;
        }
        
        stats.celkoveZaznamy = pohladavkyZaznamy.length;
        rezultat.celkoveZaznamy = stats.celkoveZaznamy;
        addDebug("Spracúvam " + stats.celkoveZaznamy + " pohľadávky záznamov", "database");
        
        for (var i = 0; i < pohladavkyZaznamy.length; i++) {
            try {
                var zaznam = pohladavkyZaznamy[i];
                var datum = safeFieldAccess(zaznam, CONFIG.recordFields.datum);
                var zostatok = safeFieldAccess(zaznam, CONFIG.recordFields.zostatok, 0);
                
                // OPRAVENÉ: Pre TOTAL aj FILTERED používaj filter
                if (dateMatchesFilter(datum, filter)) {
                    if (isTotal) {
                        rezultat.pohladavkyTotal += zostatok;
                    } else {
                        rezultat.pohladavkyFiltrovane += zostatok;
                    }
                    stats.zahrnuteZaznamy++;
                }
                
            } catch (zaznamError) {
                stats.chybneZaznamy++;
                addError("Chyba pohľadávky záznam " + i + ": " + zaznamError.toString(), "spracujPohladavky");
            }
        }
        
        // SUMMARY REPORT
        addDebug("POHĽADÁVKY SUMMARY:", "summary");
        addDebug("📊 Záznamy: " + stats.celkoveZaznamy + " total, " + stats.zahrnuteZaznamy + " zahrnuté, " + stats.chybneZaznamy + " chýb", "info");
        
        if (isTotal) {
            addDebug("💰 Total zostatok (" + filter.popis + "): " + rezultat.pohladavkyTotal.toFixed(2) + "€", "money");
        } else {
            addDebug("💰 Filtrované zostatok (" + filter.popis + "): " + rezultat.pohladavkyFiltrovane.toFixed(2) + "€", "money");
        }
        
    } catch (linksFromError) {
        addError("LinksFrom zlyhalo: " + linksFromError.toString(), "spracujPohladavky");
    }
    
    return rezultat;
}

function spracujZavazky(zamestnanecEntry, filter, isTotal) {
    addDebug("=== ZÁVÄZKY SPRACOVANIE ===", "database");
    addDebug("Filter typ: " + (isTotal ? "TOTAL" : "FILTERED") + " (" + filter.popis + ")", "filter");
    
    var rezultat = {
        zavazkyFiltrovane: 0,
        zavazkyTotal: 0,
        celkoveZaznamy: 0
    };
    
    var stats = {
        celkoveZaznamy: 0,
        zahrnuteZaznamy: 0,
        chybneZaznamy: 0
    };
    
    try {
        var zavazkyZaznamy = zamestnanecEntry.linksFrom(CONFIG.libraries.zavazky, CONFIG.linksFromFields.zavazkyZamestnanec);
        
        if (!zavazkyZaznamy || zavazkyZaznamy.length === 0) {
            addDebug("Žiadne záväzky záznamy", "warning");
            return rezultat;
        }
        
        stats.celkoveZaznamy = zavazkyZaznamy.length;
        rezultat.celkoveZaznamy = stats.celkoveZaznamy;
        addDebug("Spracúvam " + stats.celkoveZaznamy + " záväzky záznamov", "database");
        
        for (var i = 0; i < zavazkyZaznamy.length; i++) {
            try {
                var zaznam = zavazkyZaznamy[i];
                var datum = safeFieldAccess(zaznam, CONFIG.recordFields.datum);
                var zostatok = safeFieldAccess(zaznam, CONFIG.recordFields.zostatok, 0);
                
                // OPRAVENÉ: Pre TOTAL aj FILTERED používaj filter
                if (dateMatchesFilter(datum, filter)) {
                    if (isTotal) {
                        rezultat.zavazkyTotal += zostatok;
                    } else {
                        rezultat.zavazkyFiltrovane += zostatok;
                    }
                    stats.zahrnuteZaznamy++;
                }
                
            } catch (zaznamError) {
                stats.chybneZaznamy++;
                addError("Chyba záväzky záznam " + i + ": " + zaznamError.toString(), "spracujZavazky");
            }
        }
        
        // SUMMARY REPORT
        addDebug("ZÁVÄZKY SUMMARY:", "summary");
        addDebug("📊 Záznamy: " + stats.celkoveZaznamy + " total, " + stats.zahrnuteZaznamy + " zahrnuté, " + stats.chybneZaznamy + " chýb", "info");
        
        if (isTotal) {
            addDebug("💰 Total zostatok (" + filter.popis + "): " + rezultat.zavazkyTotal.toFixed(2) + "€", "money");
        } else {
            addDebug("💰 Filtrované zostatok (" + filter.popis + "): " + rezultat.zavazkyFiltrovane.toFixed(2) + "€", "money");
        }
        
    } catch (linksFromError) {
        addError("LinksFrom zlyhalo: " + linksFromError.toString(), "spracujZavazky");
    }
    
    return rezultat;
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        addDebug("=== ŠTART PREPOČTU ZAMESTNANCA ===", "start");
        addDebug("Script verzia: " + CONFIG.version, "info");
        
        // KROK 1: Validácia základných údajov
        addDebug("KROK 1: Získavam základné údaje...", "step");
        
        var nick = safeFieldAccess(currentEntry, CONFIG.fields.nick);
        var meno = safeFieldAccess(currentEntry, CONFIG.fields.meno, "");
        var priezvisko = safeFieldAccess(currentEntry, CONFIG.fields.priezvisko, "");
        var vyberObdobia = safeFieldAccess(currentEntry, CONFIG.fields.vyberObdobia, "");
        var obdobieTotal = safeFieldAccess(currentEntry, CONFIG.fields.obdobieTotal, "");
        
        if (!nick) {
            addError("Nick je povinný identifikátor", "validation");
            saveLogsToEntry();
            return false;
        }
        
        var fullName = nick + " (" + meno + " " + priezvisko + ")";
        addDebug("Zamestnanec: " + fullName, "person");
        addDebug("Výber obdobia: '" + vyberObdobia + "'", "filter");
        addDebug("Obdobie total: '" + obdobieTotal + "'", "filter");
        
        // KROK 2: Parsovanie oboch filtrov
        addDebug("KROK 2: Parsovanie dátumových filtrov...", "step");
        
        var filter = parseFilterDateRange(vyberObdobia);
        var filterTotal = parseFilterDateRange(obdobieTotal);
        
        if (!filter.isValid) {
            addError("Neplatný filter 'výber obdobia': " + filter.reason, "filter");
            saveLogsToEntry();
            return false;
        }
        
        if (!filterTotal.isValid) {
            addError("Neplatný filter 'obdobie total': " + filterTotal.reason, "filter");
            saveLogsToEntry();
            return false;
        }
        
        addDebug("Filter pre filtrované úspešne parsovaný: " + filter.popis, "success");
        addDebug("Filter pre total úspešne parsovaný: " + filterTotal.popis, "success");
        addDebug("Podporované formáty: 'Tento rok', 'Tento týždeň', 'Total', 'Všetko', 'MM/YYYY', 'YYYY'", "info");
        
        // KROK 3: Spracovanie všetkých knižníc
        addDebug("KROK 3: Spracovanie všetkých knižníc...", "step");
        
        // Filtrované údaje (používa vyberObdobia filter)
        var dochadzkaData = spracujDochadzku(currentEntry, filter, false);
        var zaznamPracData = spracujZaznamPrac(currentEntry, filter, false);
        var knihaJazdData = spracujKnihaJazd(currentEntry, filter, false);
        var pokladnaData = spracujPokladna(currentEntry, filter, false);
        
        // OPRAVENÉ: Pohľadávky/Záväzky používajú filter (výber obdobia) nie filterTotal
        var pohladavkyData = spracujPohladavky(currentEntry, filter, false);
        var zavazkyData = spracujZavazky(currentEntry, filter, false);
        
        // Total údaje (používa obdobieTotal filter)
        var dochadzkaDataTotal = spracujDochadzku(currentEntry, filterTotal, true);
        var zaznamPracDataTotal = spracujZaznamPrac(currentEntry, filterTotal, true);
        var knihaJazdDataTotal = spracujKnihaJazd(currentEntry, filterTotal, true);
        var pokladnaDataTotal = spracujPokladna(currentEntry, filterTotal, true);
        
        // KROK 4: Výpočet aktuálnej hodinovky
        addDebug("KROK 4: Výpočet aktuálnej hodinovky...", "step");
        
        var aktualnaHodinovka = 0;
        try {
            var sadzbyLib = libByName(CONFIG.libraries.sadzby);
            if (!sadzbyLib) {
                addError("Knižnica '" + CONFIG.libraries.sadzby + "' nenájdená", "aktualnaHodinovka");
            } else {
                addDebug("Hľadám sadzby pre zamestnancea...", "database");
                var platneSadzby = sadzbyLib.find(CONFIG.linksFromFields.sadzbyZamestnanec, currentEntry);
                
                addDebug("Nájdených sadzieb: " + (platneSadzby ? platneSadzby.length : 0), "database");
                
                if (platneSadzby && platneSadzby.length > 0) {
                    // Nájdi najnovšiu platnú sadzbu
                    var najnovsiaPlat = null;
                    var najnovsiDatum = null;
                    
                    for (var i = 0; i < platneSadzby.length; i++) {
                        var sadzba = platneSadzby[i];
                        var platnostOd = safeFieldAccess(sadzba, CONFIG.recordFields.platnostOd);
                        var hodnotaSadzby = safeFieldAccess(sadzba, CONFIG.recordFields.sadzba, 0);
                        
                        addDebug("Sadzba " + (i+1) + ": " + hodnotaSadzby + "€/h od " + (platnostOd ? moment(platnostOd).format('DD.MM.YYYY') : 'N/A'), "database");
                        
                        if (platnostOd && (!najnovsiDatum || moment(platnostOd).isAfter(najnovsiDatum))) {
                            najnovsiDatum = moment(platnostOd);
                            najnovsiaPlat = sadzba;
                        }
                    }
                    
                    if (najnovsiaPlat) {
                        aktualnaHodinovka = safeFieldAccess(najnovsiaPlat, CONFIG.recordFields.sadzba, 0);
                        addDebug("✅ Aktuálna hodinovka: " + aktualnaHodinovka + " €/h (platná od " + najnovsiDatum.format('DD.MM.YYYY') + ")", "money");
                    } else {
                        addDebug("⚠️ Žiadna sadzba nemá platný dátum", "warning");
                    }
                } else {
                    addDebug("⚠️ Pre zamestnanca neboli nájdené žiadne sadzby", "warning");
                }
            }
            
        } catch (hodinovkaError) {
            addError("Chyba pri získavaní hodinovky: " + hodinovkaError.toString(), "aktualnaHodinovka");
        }
        
        // KROK 5: Výpočet SALDO a PREPLATOK/NEDOPLATOK
        addDebug("KROK 5: Výpočet Saldo a Preplatok/Nedoplatok...", "step");
        
        var saldo = pohladavkyData.pohladavkyTotal - zavazkyData.zavazkyTotal;
        var preplatokNedoplatok = dochadzkaData.zarobeneFiltrovane - pokladnaData.pokladnaFiltrovane;
        
        addDebug("Saldo výpočet (používa filter 'výber obdobia'):", "calculation");
        addDebug("  Pohľadávky: " + pohladavkyData.pohladavkyTotal.toFixed(2) + "€", "calculation");
        addDebug("  Záväzky: " + zavazkyData.zavazkyTotal.toFixed(2) + "€", "calculation");
        addDebug("  Saldo = " + pohladavkyData.pohladavkyTotal.toFixed(2) + "€ - " + 
                zavazkyData.zavazkyTotal.toFixed(2) + "€ = " + saldo.toFixed(2) + "€", "calculation");
        
        addDebug("Preplatok/Nedoplatok výpočet:", "calculation");
        addDebug("  Zarobené (filtrované): " + dochadzkaData.zarobeneFiltrovane.toFixed(2) + "€", "calculation");
        addDebug("  Vyplatené (filtrované): " + pokladnaData.pokladnaFiltrovane.toFixed(2) + "€", "calculation");
        addDebug("  Preplatok/Nedoplatok = " + dochadzkaData.zarobeneFiltrovane.toFixed(2) + "€ - " + 
                pokladnaData.pokladnaFiltrovane.toFixed(2) + "€ = " + preplatokNedoplatok.toFixed(2) + "€", "calculation");
        
        // KROK 6: Uloženie všetkých výsledkov
        addDebug("KROK 6: Uloženie výsledkov...", "step");
        
        var fieldsToUpdate = [
            // Filtrované údaje (používa vyberObdobia)
            [CONFIG.fields.odpracovane, dochadzkaData.odpracovaneFiltrovane],
            [CONFIG.fields.naZakazkach, zaznamPracData.naZakazkachFiltrovane],
            [CONFIG.fields.jazdy, knihaJazdData.jazdyFiltrovane],
            [CONFIG.fields.zarobene, dochadzkaData.zarobeneFiltrovane],
            [CONFIG.fields.vyplatene, pokladnaData.pokladnaFiltrovane],
            
            // Total údaje (používa obdobieTotal)
            [CONFIG.fields.odpracovaneTotal, dochadzkaDataTotal.odpracovaneTotal],
            [CONFIG.fields.naZakazkachTotal, zaznamPracDataTotal.naZakazkachTotal],
            [CONFIG.fields.jazdyTotal, knihaJazdDataTotal.jazdyTotal],
            [CONFIG.fields.zarobeneTotal, dochadzkaDataTotal.zarobeneTotal],
            [CONFIG.fields.vyplateneTotal, pokladnaDataTotal.pokladnaTotal],
            
            // Finansie (používajú filter 'výber obdobia')
            [CONFIG.fields.pohladavky, pohladavkyData.pohladavkyTotal],
            [CONFIG.fields.zavazky, zavazkyData.zavazkyTotal],
            [CONFIG.fields.saldo, saldo],
            [CONFIG.fields.preplatokNedoplatok, preplatokNedoplatok],
            
            // Ostatné údaje
            [CONFIG.fields.aktualnaHodinovka, aktualnaHodinovka]
        ];
        
        var savedFields = 0;
        for (var i = 0; i < fieldsToUpdate.length; i++) {
            try {
                currentEntry.set(fieldsToUpdate[i][0], fieldsToUpdate[i][1]);
                savedFields++;
            } catch (saveError) {
                addError("Chyba pri uložení poľa '" + fieldsToUpdate[i][0] + "': " + saveError.toString(), "save");
            }
        }
        
        addDebug("Uložených polí: " + savedFields + "/" + fieldsToUpdate.length, "success");
        
        // KROK 7: Info záznam s kompletnými výpočtami
        addDebug("KROK 7: Vytvorenie rozšíreného info záznamu...", "step");
        
        var timestamp = moment().format("DD.MM.YYYY HH:mm:ss");
        var infoMessage = CONFIG.icons.success + " PREPOČET DOKONČENÝ " + timestamp + "\n" +
                         "=====================================\n" +
                         CONFIG.icons.person + " ZAMESTNANEC: " + fullName + "\n" +
                         CONFIG.icons.filter + " Filter (filtrované): " + filter.popis + "\n" +
                         CONFIG.icons.filter + " Filter (total): " + filterTotal.popis + "\n\n" +
                         
                         "📊 ODPRACOVANÝ ČAS:\n" +
                         "• Odpracované: " + dochadzkaData.odpracovaneFiltrovane.toFixed(2) + "h\n" +
                         "• Odpracované total: " + dochadzkaDataTotal.odpracovaneTotal.toFixed(2) + "h\n" +
                         "• Na zákazkách: " + zaznamPracData.naZakazkachFiltrovane.toFixed(2) + "h\n" +
                         "• Na zákazkách total: " + zaznamPracDataTotal.naZakazkachTotal.toFixed(2) + "h\n" +
                         "• Jazdy: " + knihaJazdData.jazdyFiltrovane.toFixed(2) + "h\n" +
                         "• Jazdy total: " + knihaJazdDataTotal.jazdyTotal.toFixed(2) + "h\n\n" +
                         
                         "💰 MZDY A FINANCIE:\n" +
                         "• Aktuálna hodinovka: " + aktualnaHodinovka.toFixed(2) + " €/h\n" +
                         "• Zarobené: " + dochadzkaData.zarobeneFiltrovane.toFixed(2) + "€\n" +
                         "• Zarobené total: " + dochadzkaDataTotal.zarobeneTotal.toFixed(2) + "€\n" +
                         "• Vyplatené: " + pokladnaData.pokladnaFiltrovane.toFixed(2) + "€\n" +
                         "• Vyplatené total: " + pokladnaDataTotal.pokladnaTotal.toFixed(2) + "€\n\n" +
                         
                         "📈 POHĽADÁVKY A ZÁVÄZKY (filter: výber obdobia):\n" +
                         "• Pohľadávky (zostatok): " + pohladavkyData.pohladavkyTotal.toFixed(2) + "€\n" +
                         "• Záväzky (zostatok): " + zavazkyData.zavazkyTotal.toFixed(2) + "€\n" +
                         "• Saldo = Pohľadávky - Záväzky: " + saldo.toFixed(2) + "€\n\n" +
                         
                         "🧮 VÝPOČTY:\n" +
                         "• Preplatok/Nedoplatok = Zarobené - Vyplatené\n" +
                         "• " + dochadzkaData.zarobeneFiltrovane.toFixed(2) + "€ - " + pokladnaData.pokladnaFiltrovane.toFixed(2) + "€ = " + preplatokNedoplatok.toFixed(2) + "€\n" +
                         "• Saldo = Pohľadávky - Záväzky (používa filter 'výber obdobia')\n" +
                         "• " + pohladavkyData.pohladavkyTotal.toFixed(2) + "€ - " + zavazkyData.zavazkyTotal.toFixed(2) + "€ = " + saldo.toFixed(2) + "€\n\n" +
                         
                         "📊 ŠTATISTIKY ZÁZNAMOV:\n" +
                         "• Dochádzka: " + (dochadzkaData.celkoveZaznamy || 0) + " záznamov\n" +
                         "• Záznam prác: " + (zaznamPracData.celkoveZaznamy || 0) + " záznamov\n" +
                         "• Kniha jázd: " + (knihaJazdData.celkoveZaznamy || 0) + " záznamov\n" +
                         "• Pohľadávky: " + (pohladavkyData.celkoveZaznamy || 0) + " záznamov\n" +
                         "• Záväzky: " + (zavazkyData.celkoveZaznamy || 0) + " záznamov\n" +
                         "• Pokladňa: " + (pokladnaData.celkoveZaznamy || 0) + " záznamov (len Mzda + Mzda záloha)\n\n" +
                         
                         CONFIG.icons.database + " Script v" + CONFIG.version + " | Uložených polí: " + savedFields + "/15";
        
        try {
            currentEntry.set(CONFIG.fields.info, infoMessage);
            addDebug("Info záznam vytvorený", "success");
        } catch (infoError) {
            addError("Chyba pri vytváraní info záznamu: " + infoError.toString(), "info");
        }
        
        addDebug("=== PREPOČET DOKONČENÝ ÚSPEŠNE ===", "success");
        addDebug("📊 Celkovo spracovaných knižníc: 6", "summary");
        addDebug("💾 Uložených polí: " + savedFields + "/14", "summary");
        addDebug("💰 Finálne hodnoty: Saldo=" + saldo.toFixed(2) + "€, Preplatok/Nedoplatok=" + preplatokNedoplatok.toFixed(2) + "€", "summary");
        saveLogsToEntry();
        return true;
        
    } catch (error) {
        addError("Kritická chyba v main(): " + error.toString(), "main");
        saveLogsToEntry();
        return false;
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

main();