/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.BeforeDelete
 * Typ:         Trigger — Before deleting entry (synchronous)
 * Verzia:      3.1.0
 * Dátum:       2026-03-24
 *
 * Účel:
 *   Len ochrana "Čaká" záznamov mladších ako 1 hodina.
 *   TG mazanie je v AfterDelete (http() nie je dostupný v BeforeDelete).
 */

var stav = null;
try { stav = entry().field("Stav"); } catch(e) {}

if (stav && String(stav).trim() === "Čaká") {
    var datum = null;
    try { datum = entry().field("Dátum odoslania"); } catch(e) {}
    if (datum) {
        try {
            var ageMs = new Date() - new Date(datum);
            if (ageMs < 3600000) {
                message("⛔ Záznam 'Čaká' mladší ako 1h — mazanie blokované.");
                cancel();
            }
        } catch(e) {}
    }
}
