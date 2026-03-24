/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.BeforeDelete
 * Typ:         Trigger — Before deleting entry
 * Verzia:      2.1.0
 * Dátum:       2026-03-24
 *
 * DIAGNOSTIKA: vypíše VŠETKY polia entry() do ASISTANTO Logs
 */

var SCRIPT_NAME = "Podp.BeforeDelete";
var ce = entry();
var lines = [];

// Skús prečítať každé pole podľa názvu
var fieldNames = [
    "ID", "Názov", "Dátum odoslania", "Dátum potvrdenia",
    "Zamestnanec", "Knižnica", "Stav", "Poznámka",
    "Debug_Log", "TG Správa ID", "TG Chat ID",
    "Zdroj ID", "Zdrojová lib ID", "Zdrojový field ID",
    "Stav: potvrdené", "Stav: odmietnuté",
    "Dôvod odmietnutia", "TG Follow-up ID", "TG Správa"
];

for (var i = 0; i < fieldNames.length; i++) {
    var fn = fieldNames[i];
    var val = null;
    try { val = ce.field(fn); } catch(x) { val = "ERR:" + x; }
    if (val !== null && val !== undefined && val !== "") {
        lines.push(fn + "=[" + val + "]");
    }
}

// Zapíš do ASISTANTO Logs
try {
    var logsLib = libByName("ASISTANTO Logs");
    if (logsLib) {
        var le = logsLib.create({});
        le.set("script", SCRIPT_NAME);
        le.set("text", lines.join("\n"));
        le.set("memento library", "podpisy");
    }
} catch(e) {
    message("Log: " + lines.join(" | "));
}
