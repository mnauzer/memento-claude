// ==============================================
// MEMENTO DATABASE - ZÁZNAM PRÁC - PREPOČET
// Verzia: 1.0 | Dátum: 12.08.2025 | Autor: JavaScript Expert
// Knižnica: Záznam prác | Trigger: After Save
// ==============================================
// ✅ IMPLEMENTÁCIA PODĽA KNOWLEDGE BASE
//    - Zaokrúhľovanie časov Od/Do na 15 minút
//    - Výpočet pracovnej doby a odpracovaných hodín
//    - Nastavenie atribútov zamestnancov (odpracované, hodinovka, mzdové náklady)
//    - Výpočet súhrnných polí (Počet pracovníkov, Mzdové náklady, Suma HZS)
//    - Prepojenie / vytvorenie "Výkaz prác"
//    - Robustné debug a error logovanie
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

// ======================================================
//  LOGOVACIE FUNKCIE
// ======================================================

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

// ======================================================
//  UTILITY FUNKCIE
// ======================================================

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
    if (msEnd < msStart) { // cez polnoc
        msEnd += 24*60*60*1000;
        logDebug("⏰ Práca cez polnoc");
    }
    return Math.round(((msEnd - msStart) / 3600000) * 100) / 100;
}

// ======================================================
//  DOMÁCANIE HODINOVKY
// ======================================================

function findValidSalary(zamEntry, workDate) {
    try {
        var sadzby = zamEntry.linksFrom(CONFIG.libraries.sadzbyZam, CONFIG.sadzbyFields.zamestnanec) || [];
        if (!sadzby.length) {
            logDebug("⚠️ Žiadne sadzby pre zamestnanca: " + zamEntry.field("Nick"));
            return 0;
        }
        var sel = 0, latest = null;
        for (var i=0;i<sadzby.length;i++) {
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

// ======================================================
//  SPRACOVANIE ZAMESTNANCOV
// ======================================================

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

// ==============================================
// FUNKCIA NA ZAPOJENIE/VYTOVRENIE VÝKAZU PRÁC
// ==============================================

// ==============================================
// OPRAVENÁ FUNKCIA syncVýkazPrac() s linksFrom
// ==============================================

function syncVýkazPrac(currentEntry) {
    try {
        var zakazka = currentEntry.field(CONFIG.fields.zakazka);
        if (!zakazka) {
            logError("Chýba pole Zákazka, nemôžem synchronizovať Výkaz prác", "syncVýkazPrac");
            return false;
        }

        logDebug("🔍 Kontrolujem existenciu Výkazu prác pre zákazku...");

        // ✅ SPRÁVNE - použiť linksFrom na zákazke samotnej
        var existujuceVyroky = zakazka.linksFrom("Výkaz prác", "Zákazka") || [];
        var vykazPrac = existujuceVyroky.length > 0 ? existujuceVyroky[0] : null;

        if (!vykazPrac) {
            // Vytvor nový výkaz prác
            logDebug("💡 Vytvárám nový Výkaz prác pre zákazku...");
            
            var vykazLib = libByName("Výkaz prác");
            if (!vykazLib) {
                logError("Knižnica 'Výkaz prác' neexistuje", "syncVýkazPrac");
                return false;
            }

            vykazPrac = vykazLib.create();

            // Vyplnenie základných polí podľa dokumentácie
            vykazPrac.set("Dátum", currentEntry.field(CONFIG.fields.datum) || null);
            vykazPrac.set("Identifikátor", generateIdentifikator(zakazka)); // Helper funkcia
            vykazPrac.set("Popis", generatePopis(zakazka)); // Helper funkcia
            
            // Typ výkazu zo zákazky
            var typVykazu = safeVal(zakazka.field("Typ výkazu"), "Hodinovka");
            vykazPrac.set("Typ výkazu", typVykazu);
            vykazPrac.set("Ceny počítať", "Z cenovej ponuky");
            
            // Cenová ponuka zo zákazky
            var cenovaPonuka = zakazka.field("Cenová ponuka");
            if (cenovaPonuka) {
                vykazPrac.set("Cenová ponuka", cenovaPonuka);
            }
            
            vykazPrac.set("Vydané", "Zákazka");
            vykazPrac.set("Zákazka", zakazka);

            logDebug("✅ Nový Výkaz prác vytvorený a vyplnený");
        } else {
            logDebug("ℹ️ Existujúci Výkaz prác nájdený pre zákazku");
        }

        // Pridanie spätného linku do poľa "Práce HZS"
        var praceHZS = vykazPrac.field("Práce HZS") || [];
        
        // Kontrola či už link na currentEntry neexistuje
        var linkExists = false;
        for (var i = 0; i < praceHZS.length; i++) {
            if (praceHZS[i].id === currentEntry.id) {
                linkExists = true;
                break;
            }
        }

        if (!linkExists) {
            // Pridaj currentEntry do poľa Práce HZS
            praceHZS.push(currentEntry);
            vykazPrac.set("Práce HZS", praceHZS);

            var lastIndex = praceHZS.length - 1;

            // Nastav atribúty spätného linku podľa pravidiel z dokumentácie
            vykazPrac.setAttr("Práce HZS", lastIndex, "vykonané práce", 
                safeVal(currentEntry.field(CONFIG.fields.vykonanePrace), ""));
            vykazPrac.setAttr("Práce HZS", lastIndex, "počet hodín", 
                safeVal(currentEntry.field(CONFIG.fields.odpracovane), 0));
            
            // Účtovaná sadzba z HZS
            var cenaUc = 0;
            var hzsLink = currentEntry.field(CONFIG.fields.hzs);
            if (hzsLink) {
                cenaUc = parseFloat(hzsLink.attr("cena") || 0);
            }
            vykazPrac.setAttr("Práce HZS", lastIndex, "účtovaná sadzba", cenaUc);
            
            // Cena celkom = počet hodín × účtovaná sadzba
            var cenaCelk = safeVal(currentEntry.field(CONFIG.fields.odpracovane), 0) * cenaUc;
            vykazPrac.setAttr("Práce HZS", lastIndex, "cena celkom", Math.round(cenaCelk * 100) / 100);

            logDebug("🔗 Spätný link pridaný do Výkazu prác s atribútmi:");
            logDebug("   • vykonané práce: " + safeVal(currentEntry.field(CONFIG.fields.vykonanePrace), ""));
            logDebug("   • počet hodín: " + safeVal(currentEntry.field(CONFIG.fields.odpracovane), 0));
            logDebug("   • účtovaná sadzba: " + cenaUc);
            logDebug("   • cena celkom: " + cenaCelk.toFixed(2) + " €");
        } else {
            logDebug("ℹ️ Spätný link už existuje vo Výkaze prác");
        }

        return true;

    } catch (e) {
        logError("Chyba pri synchronizácii Výkazu prác: " + e.toString(), "syncVýkazPrac");
        return false;
    }
}

// ==============================================
// HELPER FUNKCIE PRE GENEROVANIE POLÍ
// ==============================================

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


// ======================================================
//  HLAVNÝ WORKFLOW
// ======================================================

function hlavnyPrepočet() {
    logDebug("🚀 Štart prepočtu Záznamu prác v" + CONFIG.version);

    // 1 - Získanie hodnôt
    var datum = safeVal(e.field(CONFIG.fields.datum), null);
    var odRaw = e.field(CONFIG.fields.od);
    var doRaw = e.field(CONFIG.fields.do);
    var zam = safeVal(e.field(CONFIG.fields.zamestnanci), []);
    if (!datum || !odRaw || !doRaw || zam.length === 0) {
        logError("Chýbajú povinné vstupné údaje", "input");
        return false;
    }

    // 2 - Zaokrúhlenie časov
    var odMs = roundToQuarter(new Date(odRaw).getTime());
    var doMs = roundToQuarter(new Date(doRaw).getTime());
    e.set(CONFIG.fields.od, new Date(odMs));
    e.set(CONFIG.fields.do, new Date(doMs));
    logDebug("⏰ Zaokrúhlené časy: Od=" + moment(odMs).format("HH:mm") + ", Do=" + moment(doMs).format("HH:mm"));

    // 3 - Pracovná doba
    var workHrs = calcHours(odMs, doMs);
    e.set(CONFIG.fields.pracovnaDoba, workHrs);
    logDebug("🕒 Pracovná doba: " + workHrs + " h");

    // 4 - Počet pracovníkov, Odpracované
    var pocet = zam.length;
    var odpracovaneCelk = workHrs * pocet;
    e.set(CONFIG.fields.pocetPracovnikov, pocet);
    e.set(CONFIG.fields.odpracovane, odpracovaneCelk);
    logDebug("👥 Počet pracovníkov: " + pocet);
    logDebug("🔢 Odpracované spolu: " + odpracovaneCelk + " h");

    // 5 - Mzdové náklady
    var nakladyTotal = 0;
    for (var i=0;i<zam.length;i++) {
        nakladyTotal += processEmployee(zam[i], i, workHrs, datum);
    }
    e.set(CONFIG.fields.mzdoveNaklady, nakladyTotal);
    logDebug("💰 Mzdové náklady = " + nakladyTotal + " €");

    // 6 - Hodinová zúčtovacia sadzba a Suma HZS
    var hzs = e.field(CONFIG.fields.hzs);
    var cenaHZS = 0;
    if (hzs) {
        var ceny = hzs.linksFrom(CONFIG.libraries.cenyPrac, "Cenník prác") || [];
        if (ceny.length > 0) {
            cenaHZS = parseFloat(ceny[ceny.length-1].field("Cena") || 0);
        } else {
            cenaHZS = parseFloat(hzs.field("Cena") || 0);
        }
        hzs.setAttr(CONFIG.attributes.cena, cenaHZS);
        logDebug("📏 Hodinová zúčtovacia sadzba: " + cenaHZS + " €");
    }

   
    var suma = odpracovaneCelk * cenaHZS;
    e.set(CONFIG.fields.sumaHZS, suma);
    logDebug("Σ Suma HZS = " + suma + " €");

    
    // 7 - Synchronizácia s Výkazom prác  
    try {
        logDebug("🔗 Synchronizujem s Výkazom prác...");
        var vykazSuccess = syncVýkazPrac(e);
        if (vykazSuccess) {
            logDebug("✅ Výkaz prác úspešne synchronizovaný");
        } else {
            logError("❌ Synchronizácia s Výkazom prác zlyhala", "main");
        }
    } catch (syncError) {
        logError("Chyba pri synchronizácii Výkazu prác: " + syncError.toString(), "main");
    }
    
    return true;
}

// ======================================================
//  SPUSTENIE
// ======================================================

try {
    var ok = hlavnyPrepočet();
    saveLogs();
    if (ok) {
        message("✅ Prepočet záznamu prác dokončený");
    } else {
        message("❌ Prepočet záznamu prác zlyhal – pozri Error_Log");
    }
} catch(err) {
    logError("KRITICKÁ CHYBA: " + err, "main");
    saveLogs();
    message("💥 Kritická chyba! Pozri Error_Log");
}
