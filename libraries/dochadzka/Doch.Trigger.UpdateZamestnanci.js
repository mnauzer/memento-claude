/**
 * Knižnica:    Dochádzka
 * Názov:       Doch.Trigger.UpdateZamestnanci
 * Typ:         Trigger — After Save
 * Verzia:      1.0.0
 * Dátum:       2026-03-23
 *
 * Účel:
 *   Po uložení dochádzky prepočíta mzdové polia každého prepojeného zamestnanca.
 *   Aktualizuje: Zarobené, Vyplatené, Preplatok/Nedoplatok (podľa pole "obdobie" na karte zamestnanca).
 *
 *   Umožňuje poslať do TG správy aktuálne hodnoty po uložení dochádzky.
 *
 * Závislosti:
 *   - MementoUtils v8.1+
 *   - Zamestnanci module v1.0+
 *
 * Poznámky:
 *   - Debug_Log dochádzky sa NEMAŽE (iné triggery ho môžu použiť)
 *   - Podrobné logy sú v Debug_Log každého zamestnanca
 *   - Silent fail — trigger nesmie zablokovať uloženie dochádzky
 */

var SCRIPT_NAME    = "Doch.Trigger.UpdateZamestnanci";
var SCRIPT_VERSION = "1.0.0";

var hasUtils       = typeof MementoUtils    !== 'undefined';
var hasZamestnanci = typeof Zamestnanci     !== 'undefined';

// Diagnostika ak chýbajú moduly
if (!hasUtils || !hasZamestnanci) {
    try {
        var _e   = entry();
        var _log = _e.field("Debug_Log") || "";
        _e.set("Debug_Log", _log +
            "❌ " + SCRIPT_NAME + " v" + SCRIPT_VERSION + ": chýbajú moduly" +
            " (Utils:" + hasUtils + " Zamestnanci:" + hasZamestnanci + ")\n");
    } catch(e) {}
}

if (hasUtils && hasZamestnanci) {

var currentEntry = entry();

try {
    var employees = currentEntry.field("Zamestnanci");

    if (!employees || employees.length === 0) {
        // Žiadni zamestnanci — nič nerobíme
    } else {
        for (var i = 0; i < employees.length; i++) {
            var emp = employees[i];
            if (!emp || !emp.field) continue;

            try {
                // Vymaž starý log zamestnanca pred prepočtom
                emp.set("Debug_Log", "");

                // Prepočet — výsledok a podrobné logy sú v employee Debug_Log
                Zamestnanci.calculateWages(emp, MementoUtils.config, MementoUtils);

            } catch (empErr) {
                // Silent fail per zamestnanec
                try {
                    var nick = emp.field("Nick") || "?";
                    var cur  = currentEntry.field("Debug_Log") || "";
                    currentEntry.set("Debug_Log", cur +
                        "❌ " + SCRIPT_NAME + ": chyba pre " + nick + " — " + empErr.toString() + "\n");
                } catch(e) {}
            }
        }
    }

} catch (e) {
    // Silent fail — nesmie zablokovať uloženie dochádzky
    try {
        var errLog = currentEntry.field("Debug_Log") || "";
        currentEntry.set("Debug_Log", errLog +
            "❌ " + SCRIPT_NAME + " KRITICKÁ CHYBA: " + e.toString() + "\n");
    } catch(e2) {}
}

} // end if (hasUtils && hasZamestnanci)
