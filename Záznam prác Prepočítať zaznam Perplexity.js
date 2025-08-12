// ==============================================
// MEMENTO DATABASE - ZÁZNAM PRÁC - AFTER SAVE TRIGGER
// Verzia: 1.0 | Dátum: 12.08.2025
// ==============================================

var CONFIG = {
    debug: true,
    version: "1.0",
    fields: {
        datum: "Dátum",
        zakazka: "Zákazka",
        od: "Od",
        do: "Do",
        zamestnanci: "Zamestnanci",
        hzs: "Hodinová zúčtovacia sadzba",
        vykonanePrace: "Vykonané práce",
        pracovnaDoba: "Pracovná doba",
        odpracovane: "Odpracované",
        pocetPracovnikov: "Počet pracovníkov",
        mzdoveNaklady: "Mzdové náklady",
        sumaHZS: "Suma HZS",
        info: "info",
        debugLog: "Debug_Log",
        errorLog: "Error_Log"
    },
    attributes: {
        odpracovane: "odpracované",
        hodinovka: "hodinovka",
        mzdoveNaklady: "mzdové náklady",
        cena: "cena"
    },
    libraries: {
        sadzbyZam: "sadzby zamestnancov",
        vykazPrac: "Výkaz prác",
        cenyPrac: "ceny prác"
    },
    sadzbyFields: {
        zamestnanec: "Zamestnanec",
        platnostOd: "Platnosť od",
        sadzba: "Sadzba"
    }
};

// Lokálne logy
var debugLog = [];
var errorLog = [];
var e = entry();

function logDebug(msg) {
    if (CONFIG.debug) {
        var ts = moment().format("DD.MM.YY HH:mm:ss");
        debugLog.push("[" + ts + "] " + msg);
    }
}

function logError(msg, loc) {
    var ts = moment().format("DD.MM.YY HH:mm:ss");
    errorLog.push("[" + ts + "] ❌ " + msg + (loc ? " (Loc: " + loc + ")" : ""));
}

function saveLogs() {
    try {
        e.set(CONFIG.fields.debugLog, debugLog.join("\n"));
        e.set(CONFIG.fields.errorLog, errorLog.join("\n"));
    } catch (_) {}
}

function safeVal(val, defVal) {
    return (val !== null && val !== undefined) ? val : defVal;
}

function roundToQuarter(ms) {
    if (!ms) return null;
    var q = 15 * 60 * 1000;
    return Math.round(ms / q) * q;
}

function calcHours(msStart, msEnd) {
    if (!msStart || !msEnd) return 0;
    if (msEnd < msStart) {
        msEnd += 24 * 60 * 60 * 1000;
        logDebug("⏰ Práca cez polnoc");
    }
    return Math.round(((msEnd - msStart) / 3600000) * 100) / 100;
}

function findValidSalary(zamEntry, workDate) {
    try {
        var sadzby = zamEntry.linksFrom(CONFIG.libraries.sadzbyZam, CONFIG.sadzbyFields.zamestnanec) || [];
        if (!sadzby.length) {
            logDebug("⚠️ Žiadne sadzby pre zamestnanca: " + zamEntry.field("Nick"));
            return 0;
        }
        var sel = 0, latest = null;
        for (var i=0; i<sadzby.length; i++) {
            var platOd = sadzby[i].field(CONFIG.sadzbyFields.platnostOd);
            var sadzba = parseFloat(sadzby[i].field(CONFIG.sadzbyFields.sadzba) || 0);
            if (platOd && sadzba && platOd <= workDate) {
                if (!latest || platOd > latest) {
                    latest = platOd;
                    sel = sadzba;
                }
            }
        }
        logDebug("✅ Hodinovka: " + sel);
        return sel;
    } catch(err) {
        logError("Chyba pri hľadaní hodnoty hodinovky: " + err, "findValidSalary");
        return 0;
    }
}

function processEmployee(zam, idx, workHours, datum) {
    try {
        var n = zam.field("Nick") || "Neznámy";
        logDebug("👤 Zamestnanec #" + (idx+1) + ": " + n);

        var hodinovka = findValidSalary(zam, datum);
        var naklady = workHours * hodinovka;
        
        zam.setAttr(CONFIG.attributes.odpracovane, workHours);
        zam.setAttr(CONFIG.attributes.hodinovka, hodinovka);
        zam.setAttr(CONFIG.attributes.mzdoveNaklady, naklady);

        logDebug("  odpracované=" + workHours + " h, hodinovka=" + hodinovka + " €, mzdové náklady=" + naklady);
        return naklady;
    } catch(ex) {
        logError("Chyba spracovania zamestnanca idx=" + idx + ": " + ex, "processEmployee");
        return 0;
    }
}

function generateIdentifikator(zakazka) {
    try {
        var zakazkaID = zakazka.field("ID") || "XXX";
        var datum = moment().format("YYYYMM");
        return "VYK-" + zakazkaID + "-" + datum;
    } catch (e) {
        return "VYK-" + moment().format("YYYYMMDD");
    }
}

function generatePopis(zakazka) {
    try {
        var zakazkaNazov = zakazka.field("Názov") || "Neznáma zákazka";
        var mesiac = moment().format("MMMM YYYY");
        return "Výkaz prác pre zákazku " + zakazkaNazov + " - " + mesiac;
    } catch (e) {
        return "Výkaz prác - " + moment().format("MMMM YYYY");
    }
}

function syncVykazPrac(currentEntry) {
    try {
        var zakazka = currentEntry.field(CONFIG.fields.zakazka);
        if (!zakazka) {
            logError("Chýba pole Zákazka, nemôžem synchronizovať Výkaz prác", "syncVykazPrac");
            return false;
        }

        logDebug("🔍 Kontrolujem existenciu Výkazu prác pre zákazku...");

        var existujuceVyroky = zakazka.linksFrom("Výkaz prác", "Zákazka") || [];
        var vykazPrac = existujuceVyroky.length > 0 ? existujuceVyroky[0] : null;

        if (!vykazPrac) {
            logDebug("💡 Vytváram nový Výkaz prác pre zákazku...");
            
            var vykazLib = libByName("Výkaz prác");
            if (!vykazLib) {
                logError("Knižnica 'Výkaz prác' neexistuje", "syncVykazPrac");
                return false;
            }

            vykazPrac = vykazLib.create();

            vykazPrac.set("Dátum", currentEntry.field(CONFIG.fields.datum) || null);
            vykazPrac.set("Identifikátor", generateIdentifikator(zakazka));
            vykazPrac.set("Popis", generatePopis(zakazka));
            
            var typVykazu = safeVal(zakazka.field("Typ výkazu"), "Hodinovka");
            vykazPrac.set("Typ výkazu", typVykazu);
            vykazPrac.set("Ceny počítať", "Z cenovej ponuky");
            
            var cenovaPonuka = zakazka.field("Cenová ponuka");
            if (cenovaPonuka) {
                vykazPrac.set("Cenová ponuka", cenovaPonuka);
            }
            
            vykazPrac.set("Vydané", "Zákazka");
            vykazPrac.set(CONFIG.fields.zakazka, zakazka);

            logDebug("✅ Nový Výkaz prác vytvorený a vyplnený");
        } else {
            logDebug("ℹ️ Existujúci Výkaz prác nájdený pre zákazku");
        }

        var praceHZS = vykazPrac.field("Práce HZS") || [];
        if (!praceHZS) praceHZS = [];

        var linkExists = praceHZS.some(function(linkedEntry) {
            return linkedEntry.id === currentEntry.id;
        });

        if (!linkExists) {
            praceHZS.push(currentEntry);
            vykazPrac.set("Práce HZS", praceHZS);

            var lastIndex = praceHZS.length - 1;

            vykazPrac.setAttr("Práce HZS", lastIndex, "vykonané práce", safeVal(currentEntry.field(CONFIG.fields.vykonanePrace), ""));
            vykazPrac.setAttr("Práce HZS", lastIndex, "počet hodín", safeVal(currentEntry.field(CONFIG.fields.odpracovane), 0));
            
            var cenaUc = 0;
            var hzsLink = currentEntry.field(CONFIG.fields.hzs);
            if (hzsLink && hzsLink.attr) {
                cenaUc = parseFloat(hzsLink.attr("cena") || 0);
            }
            vykazPrac.setAttr("Práce HZS", lastIndex, "účtovaná sadzba", cenaUc);
            
            var cenaCelk = safeVal(currentEntry.field(CONFIG.fields.odpracovane), 0) * cenaUc;
            vykazPrac.setAttr("Práce HZS", lastIndex, "cena celkom", Math.round(cenaCelk * 100) / 100);

            logDebug("🔗 Spätný link pridaný do Výkazu prác s atribútmi");
        } else {
            logDebug("ℹ️ Spätný link už existuje vo Výkaze prác");
        }

        return true;

    } catch (e) {
        logError("Chyba pri synchronizácii Výkazu prác: " + e.toString(), "syncVykazPrac");
        return false;
    }
}

function safeVal(val, def) {
    return (val !== undefined && val !== null) ? val : def;
}

function main() {
    logDebug("🚀 Štart spracovania Záznamu prác v verzii " + CONFIG.version);
    try {
        var datum = safeVal(e.field(CONFIG.fields.datum), null);
        var odRaw = e.field(CONFIG.fields.od);
        var doRaw = e.field(CONFIG.fields.do);
        var zam = safeVal(e.field(CONFIG.fields.zamestnanci), []);

        if (!datum || !odRaw || !doRaw || zam.length === 0) {
            logError("Chýbajú povinné polia: Dátum, Od, Do alebo Zamestnanci");
            return false;
        }

        var odMs = roundToQuarter(new Date(odRaw).getTime());
        var doMs = roundToQuarter(new Date(doRaw).getTime());
        e.set(CONFIG.fields.od, new Date(odMs));
        e.set(CONFIG.fields.do, new Date(doMs));
        logDebug("⏰ Časy zaokrúhlené na 15 min: Od=" + moment(odMs).format("HH:mm") + ", Do=" + moment(doMs).format("HH:mm"));

        var pracovnadoba = calcHours(odMs, doMs);
        e.set(CONFIG.fields.pracovnaDoba, pracovnadoba);
        logDebug("🕒 Pracovná doba: " + pracovnadoba + " h");

        var pocetPracovnikov = zam.length;
        e.set(CONFIG.fields.pocetPracovnikov, pocetPracovnikov);

        var odpracovaneTotal = pracovnadoba * pocetPracovnikov;
        e.set(CONFIG.fields.odpracovane, odpracovaneTotal);
        logDebug("👥 Počet pracovníkov: " + pocetPracovnikov);
        logDebug("🔢 Odpracované spolu: " + odpracovaneTotal + " h");

        var mzdoveNakladyTotal = 0;
        var uspechCount = 0;
        for (var i=0; i<pocetPracovnikov; i++) {
            var mzda = processEmployee(zam[i], i, pracovnadoba, datum);
            if(mzda>0) {
                mzdoveNakladyTotal += mzda;
                uspechCount++;
            } else {
                logDebug("⚠️ Zamestnanec #" + (i+1) + " má nulové mzdové náklady");
            }
        }
        e.set(CONFIG.fields.mzdoveNaklady, mzdoveNakladyTotal);
        logDebug("💰 Mzdové náklady spolu: " + mzdoveNakladyTotal.toFixed(2) + " €");
        logDebug("📈 Spracovaných zamestnancov: " + uspechCount + "/" + pocetPracovnikov);

        var hzsEntry = e.field(CONFIG.fields.hzs);
        var cenaHZS = 0;
        if (hzsEntry) {
            var cenyPracEntries = hzsEntry.linksFrom(CONFIG.libraries.cenyPrac, "Cenník prác") || [];
            if (cenyPracEntries.length > 0) {
                cenaHZS = parseFloat(cenyPracEntries[cenyPracEntries.length-1].field("Cena") || 0);
            } else {
                cenaHZS = parseFloat(hzsEntry.field("Cena") || 0);
            }
            hzsEntry.setAttr(CONFIG.attributes.cena, cenaHZS);
            logDebug("📏 Hodinová zúčtovacia sadzba: " + cenaHZS.toFixed(2) + " €");
        }
        var sumaHZS = odpracovaneTotal * cenaHZS;
        e.set(CONFIG.fields.sumaHZS, sumaHZS);
        logDebug("Σ Suma HZS: " + sumaHZS.toFixed(2) + " €");

        var syncResult = syncVykazPrac(e);
        if (syncResult) {
            logDebug("✅ Výkaz prác synchronizovaný úspešne");
        } else {
            logError("❌ Synchronizácia Výkazu prác zlyhala");
        }

        return true;
    } catch (ex) {
        logError("Výnimka počas spracovania: " + ex.toString());
        return false;
    }
}

// Spustenie skriptu a uloženie logov
try {
    var success = main();
    saveLogs();
    if (success) {
        message("✅ Záznam prác bol úspešne prepočítaný");
    } else {
        message("❌ Pri prepočte Záznamu prác došlo k chybe, skontrolujte Error_Log");
    }
} catch (fatalErr) {
    logError("Kritická chyba skriptu: " + fatalErr.toString());
    saveLogs();
    message("💥 Kritická chyba počas spracovania záznamu prác");
}
