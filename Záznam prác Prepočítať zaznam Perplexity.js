// After Save trigger script for "Záznam prác"
var utils = MementoUtils;

try {
    // Vyčisti debug log pre nový zápis
    utils.clearLogs(entry(), false);
    utils.addDebug(entry(), "🚀 Spúšťam spracovanie záznamu práce");

    var e = entry();

    // 1. Zaokrúhlenie času Od a Do na 15 minút
    var odRaw = utils.safeFieldAccess(e, "Od");
    var doRaw = utils.safeFieldAccess(e, "Do");

    var odMoment = odRaw ? moment(odRaw) : null;
    var doMoment = doRaw ? moment(doRaw) : null;

    if (odMoment && doMoment) {
        var odRounded = utils.roundToQuarter(odMoment);
        var doRounded = utils.roundToQuarter(doMoment);

        e.set("Od", odRounded.toDate());
        e.set("Do", doRounded.toDate());

        utils.addDebug(e, "⏰ Časy zaokrúhlené na 15 minút (Od: " + odRounded.format("HH:mm") + ", Do: " + doRounded.format("HH:mm") + ")");
    } else {
        utils.addError(e, "⚠️ Chýba platný čas v Od alebo Do");
    }

    // 2. Výpočet pracovnej doby v hodinách
    var pracovnadoba = (odRounded && doRounded) ? doRounded.diff(odRounded, "minutes") / 60 : 0;
    pracovnadoba = pracovnadoba > 0 ? Math.round(pracovnadoba * 100) / 100 : 0;
    e.set("Pracovná doba", pracovnadoba);
    utils.addDebug(e, "🕒 Pracovná doba vypočítaná: " + pracovnadoba + " hodín");

    // 3. Spracovanie poľa Zamestnanci
    var zamestnanci = utils.safeGetLinks(e, "Zamestnanci");
    var pocetPracovnikov = zamestnanci.length;
    e.set("Počet pracovníkov", pocetPracovnikov);
    utils.addDebug(e, "👥 Počet zamestnancov: " + pocetPracovnikov);

    var odpracovaneCelkom = 0;
    var mzdoveNakladyCelkom = 0;

    for (var i = 0; i < pocetPracovnikov; i++) {
        var zam = zamestnanci[i];

        // Atribút odpracované - pracovná doba (v hodinách)
        zam.setAttr("odpracované", pracovnadoba);

        // Zistenie hodinovej sadzby k dátumu Dátum
        var sadzby = zam.linksFrom("sadzby zamestnancov", "Zamestnanec") || [];
        var datum = utils.safeFieldAccess(e, "Dátum", null);
        var hodinovka = 0;

        // Vyber poslednú platnú sadzbu podľa dátumu
        var validSadzba = null;
        for (var j = 0; j < sadzby.length; j++) {
            var s = sadzby[j];
            var platnostOd = moment(utils.safeFieldAccess(s, "Platnosť od"));
            if (datum && platnostOd.isValid() && datum >= platnostOd.toDate()) {
                if (!validSadzba || platnostOd.isAfter(moment(utils.safeFieldAccess(validSadzba, "Platnosť od")))) {
                    validSadzba = s;
                }
            }
        }
        if (validSadzba) {
            hodinovka = parseFloat(utils.safeFieldAccess(validSadzba, "Sadzba hodinová", 0)) || 0;
        }
        zam.setAttr("hodinovka", hodinovka);

        // Výpočet mzdových nákladov = odpracované * hodinovka
        var mzdoveNaklady = pracovnadoba * hodinovka;
        zam.setAttr("mzdové náklady", mzdoveNaklady);

        odpracovaneCelkom += pracovnadoba;
        mzdoveNakladyCelkom += mzdoveNaklady;

        utils.addDebug(e, "🧑 Zamestnanec #" + (i+1) + ": hodinovka=" + hodinovka + ", mzdové náklady=" + mzdoveNaklady.toFixed(2));
    }

    // 4. Výpočet Odpracované (Pracovná doba * počet zamestnancov)
    var odpracovaneTotal = pracovnadoba * pocetPracovnikov;
    e.set("Odpracované", odpracovaneTotal);
    utils.addDebug(e, "🔢 Odpracované celkom: " + odpracovaneTotal + " hodín");

    // 5. Výpočet Mzdové náklady (súčet atribútov)
    e.set("Mzdové náklady", Math.round(mzdoveNakladyCelkom * 100) / 100);
    utils.addDebug(e, "💰 Mzdové náklady celkom: " + mzdoveNakladyCelkom.toFixed(2) + " €");

    // 6. Spracovanie Hodinová zúčtovacia sadzba
    var hzs = utils.safeGetFirstLink(e, "Hodinová zúčtovacia sadzba");
    var cenaHZS = 0;
    if (hzs) {
        // Zisťovanie ceny cez linksFrom "ceny prác"
        var cenyPrac = hzs.linksFrom("ceny prác", "Cenník prác") || [];
        if (cenyPrac.length > 0) {
            var poslednaCena = cenyPrac[cenyPrac.length - 1];
            cenaHZS = parseFloat(utils.safeFieldAccess(poslednaCena, "Cena", 0));
            // Doplníme cenu do HZS záznamu
            poslednaCena.set("Cena", cenaHZS);
        } else {
            // Žiadne ceny prác - použije sa Cena v HZS
            cenaHZS = parseFloat(utils.safeFieldAccess(hzs, "Cena", 0));
        }
        // Zapíš cenu ako atribút "cena"
        hzs.setAttr("cena", cenaHZS);
    }
    utils.addDebug(e, "💵 Hodinová zúčtovacia sadzba (cena): " + cenaHZS);

    // 7. Výpočet Suma HZS
    var sumaHZS = odpracovaneTotal * cenaHZS;
    e.set("Suma HZS", Math.round(sumaHZS * 100) / 100);
    utils.addDebug(e, "💸 Suma HZS vypočítaná: " + sumaHZS.toFixed(2) + " €");

    // 8. Automatické prepojenie s Výkaz prác
    var zakazka = utils.safeGetFirstLink(e, "Zákazka");
    var vymazanyVyrokPrac = null;

    if (zakazka) {
        // Skontrolujeme existujúci Výkaz prác pre túto zákazku
        var vyzPracLib = libByName("Výkaz prác");
        var existujuceVyroky = vyzPracLib ? vyzPracLib.find("Zákazka", zakazka) : [];
        if (neexistujuceVyroky && existujuceVyroky.length > 0) {
            vymazanyVyrokPrac = existujuceVyroky[0]; // Prvý existujúci výkaz
        } else {
            vymazanyVyrokPrac = null;
        }
    }

    if (!vymazanyVyrokPrac) {
        // Vytvoríme nový Výkaz prác
        var vyzPracLib = libByName("Výkaz prác");
        if (vyzPracLib) {
            var newVyrok = vyzPracLib.create();
            newVyrok.set("Dátum", e.field("Dátum") || null);
            // Nastav ostatné polia podľa popisu (používaj default hodnoty ak treba)
            newVyrok.set("Identifikátor", ""); // uprav podľa pravidiel
            newVyrok.set("Popis", "");
            var typVykazu = utils.safeFieldAccess(zakazka, "Typ výkazu", "Hodinovka");
            newVyrok.set("Typ výkazu", typVykazu);
            newVyrok.set("Ceny počítať", "Z cenovej ponuky");
            var cenPonuka = utils.safeGetFirstLink(zakazka, "Cenová ponuka");
            if (cenPonuka) {
                newVyrok.set("Cenová ponuka", cenPonuka);
            }
            newVyrok.set("Vydané", "Zákazka");
            newVyrok.set("Zákazka", zakazka);
            vymazanyVyrokPrac = newVyrok;
            utils.addInfo(e, "💡 Vytvorený nový Výkaz prác");
        } else {
            utils.addError(e, "❌ Knižnica Výkaz prác neexistuje");
        }
    }

    // Pridaj spätný link do Výkazu prác v poli "Práce HZS"
    if (vymazanyVyrokPrac) {
        var praceHZS = vymazanyVyrokPrac.field("Práce HZS") || [];
        var existsLink = false;

        // Skontroluj, či už link na tento záznam existuje
        for (var k = 0; k < praceHZS.length; k++) {
            if (praceHZS[k].id === e.id) {
                existsLink = true;
                break;
            }
        }
        if (!existsLink) {
            praceHZS.push(e);
            vymazanyVyrokPrac.set("Práce HZS", praceHZS);

            // Nastav atribúty linku
            vymazanyVyrokPrac.setAttr("Práce HZS", praceHZS.length -1, "vykonané práce", utils.safeFieldAccess(e, "Vykonané práce", ""));
            vymazanyVyrokPrac.setAttr("Práce HZS", praceHZS.length -1, "počet hodín", utils.safeFieldAccess(e, "Odpracované", 0));
            
            var cenaUc = 0;
            if (hzs) {
                cenaUc = parseFloat(hzs.attr("cena")) || 0;
            }
            vymazanyVyrokPrac.setAttr("Práce HZS", praceHZS.length -1, "účtovaná sadzba", cenaUc);
            var cenaCelk = (utils.safeFieldAccess(e, "Odpracované", 0) * cenaUc);
            vymazanyVyrokPrac.setAttr("Práce HZS", praceHZS.length -1, "cena celkom", Math.round(cenaCelk * 100) / 100);

            utils.addInfo(e, "🔗 Pridaný spätný link do Výkazu prác s atribútmi");
        } else {
            utils.addDebug(e, "ℹ️ Spätný link už v existujúcom Výkaze prác");
        }
    }

    utils.addDebug(e, "🏁 Spracovanie záznamu práce dokončené");

} catch (ex) {
    utils.addError(entry(), "❌ Výnimka v spracovaní záznamu práce: " + ex.toString());
}
