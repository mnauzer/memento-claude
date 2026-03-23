/**
 * Knižnica:    Dochádzka
 * Názov:       Doch.Action.ResendSign
 * Typ:         Action — Manual Button
 * Verzia:      1.0.0
 * Dátum:       2026-03-23
 *
 * Účel:
 *   Znovu odošle podpisovaciu TG správu pre všetkých zamestnancov.
 *   Staré Podpis záznamy sa vymažú — Podp.Trigger.BeforeDelete automaticky
 *   zmaže príslušné TG správy pred vymazaním každého záznamu.
 *
 * Závislosti:
 *   - MementoUtils v8.1+
 *   - Dochadzka module v1.0+
 *
 * Poznámky:
 *   - dialog() volania sú NA TOP ÚROVNI (požiadavka action scriptov v Memento)
 *   - Staré TG správy sa mažú automaticky cez Podp.Trigger.BeforeDelete
 */

// ⚠️ KRITICKÉ: dialog() funguje len na top-leveli action scriptu!
// Žiadny 'use strict', cancel() — nespoľahlivé v action scriptoch.

if (typeof MementoUtils === 'undefined') {
    message("❌ Chýba MementoUtils!");
} else if (typeof Dochadzka === 'undefined') {
    message("❌ Chýba Dochadzka modul!");
} else {

    var confirmed = dialog(
        "Znovu odoslať podpisy",
        "Zmazať staré správy a odoslať nové podpisovacie správy všetkým zamestnancom?",
        "Odoslať", "Zrušiť"
    );

    if (confirmed === 0) {

        var currentEntry = entry();
        currentEntry.set("Debug_Log", "");

        try {
            var result = Dochadzka.requestSign(currentEntry, MementoUtils.config, MementoUtils);

            if (result && result.success) {
                var sent = result.sent || 0;
                dialog(
                    "Hotovo",
                    "Podpisovacie správy boli odoslané (" + sent + " zamestnanec/zamestnanci).",
                    "OK"
                );
            } else {
                var errMsg = (result && result.error) ? result.error : "Neznáma chyba";
                dialog("Chyba", "Odoslanie zlyhalo: " + errMsg, "OK");
            }

        } catch(e) {
            dialog("Kritická chyba", e.toString(), "OK");
        }

    }

} // end if
