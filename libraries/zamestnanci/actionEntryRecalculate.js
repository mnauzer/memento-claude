/**
 * Knižnica:    Zamestnanci
 * Názov:       Zam.Action.Recalculate
 * Typ:         Action (Button) - Ultra-Thin Wrapper
 * Verzia:      3.0.0
 * Autor:       ASISTANTO
 * Dátum:       2026-03-21
 *
 * Účel:
 *   Ultra-thin wrapper pre button action prepočtu miezd.
 *   Všetka logika je v modules/Zamestnanci.js module.
 *
 * DÔLEŽITÉ: dialog() nefunguje vo vnútri IIFE modulov (globálne scripty).
 *   Všetky dialog() volania musia byť na top-leveli action scriptu.
 *   Preto wrapper volá calculateWages() priamo, nie calculateWagesAction().
 *
 * Changelog:
 *   v3.0.0 (2026-03-21) - Fix: presunúť dialog() na top-level wrappera
 *     - Volá calculateWages() priamo (nie calculateWagesAction)
 *     - Confirmačný a výsledkový dialog na top-leveli (funguje)
 *     - Odstránené cancel() a 'use strict' (nespoľahlivé v action scriptoch)
 *   v2.x.x (2026-03-21) - Diagnostické verzie
 *   v2.0.0 (2026-03-20) - Refactor to ultra-thin wrapper (nefungoval dialog)
 */

// ==============================================
// DEPENDENCY CHECK
// ==============================================

if (typeof MementoUtils === 'undefined') {
    message("CHYBA: Chyba MementoUtils modul!");
}

else if (typeof Zamestnanci === 'undefined') {
    message("CHYBA: Chyba Zamestnanci modul!");
}

// ==============================================
// MAIN EXECUTION
// ==============================================

else {
    var currentEntry = entry();
    var employeeName = currentEntry.field("Nick") || "N/A";

    // Confirmačný dialog na TOP-LEVEL wrappera (tu dialog() funguje)
    var confirmed = dialog(
        "Prepočet miezd",
        "Prepocitat mzdy pre: " + employeeName + "?\n\n" +
        "Prepocitaju sa polia:\n" +
        "  Odpracovane / Odpracovane total\n" +
        "  Zarobene / Zarobene total\n" +
        "  Premie / Premie total\n" +
        "  Vyplatene / Vyplatene total\n" +
        "  Preplatok/Nedoplatok\n\n" +
        "Pokracovat?",
        "Ano",
        "Zrusit"
    );

    if (confirmed === 0) {

        // Vymaž Debug_Log pre čistý prepočet
        currentEntry.set("Debug_Log", "");

        try {
            var result = Zamestnanci.calculateWages(currentEntry, MementoUtils.config, MementoUtils);

            if (result.success) {
                // Načítaj vypočítané hodnoty pre dialog
                var odpracovane  = currentEntry.field("Odpracované")         || 0;
                var zarobene     = currentEntry.field("Zarobené")             || 0;
                var premie       = currentEntry.field("Prémie")               || 0;
                var vyplatene    = currentEntry.field("Vyplatené")            || 0;
                var preplatok    = currentEntry.field("Preplatok/Nedoplatok") || 0;

                var odpracovaneT = currentEntry.field("Odpracované total")    || 0;
                var zarobeneT    = currentEntry.field("Zarobené total")       || 0;
                var premieT      = currentEntry.field("Prémie total")         || 0;
                var vyplateneT   = currentEntry.field("Vyplatené total")      || 0;

                // Výsledkový dialog na TOP-LEVEL (tu funguje)
                dialog(
                    "Prepocet dokonceny",
                    "Zamestnanec: " + employeeName + "\n\n" +
                    "ZAKLADNE (obdobie):\n" +
                    "  Odpracovane:        " + odpracovane.toFixed(2)  + " h\n" +
                    "  Zarobene:           " + zarobene.toFixed(2)     + " EUR\n" +
                    "  Premie:             " + premie.toFixed(2)       + " EUR\n" +
                    "  Vyplatene:          " + vyplatene.toFixed(2)    + " EUR\n" +
                    "  Preplatok/Nedopl.:  " + preplatok.toFixed(2)   + " EUR\n\n" +
                    "TOTAL (obdobie total):\n" +
                    "  Odpracovane total:  " + odpracovaneT.toFixed(2) + " h\n" +
                    "  Zarobene total:     " + zarobeneT.toFixed(2)    + " EUR\n" +
                    "  Premie total:       " + premieT.toFixed(2)      + " EUR\n" +
                    "  Vyplatene total:    " + vyplateneT.toFixed(2)   + " EUR",
                    "OK"
                );

            } else {
                dialog("Chyba prepoctu", result.error || result.message || "Neznama chyba", "OK");
            }

        } catch (e) {
            dialog("Kriticka chyba", e.toString(), "OK");
        }
    }
}
