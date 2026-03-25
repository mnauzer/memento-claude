/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.BeforeDelete
 * Typ:         Trigger — Before Deleting an Entry (synchronous)
 * Verzia:      7.0.0
 * Dátum:       2026-03-25
 *
 * Účel:
 *   Ochrana záznamu s Stav="Čaká" mladšieho ako 1 hodina.
 *   TG správy sa mažú v AfterDelete (Podp.Trigger.AfterDelete.js).
 *
 * POZNÁMKA: http() nefunguje v BeforeDelete (synchronous context).
 *   TG delete presnutý do AfterDelete (async context).
 *
 * CHANGELOG:
 *   v7.0.0 (2026-03-25) — REFACTOR: iba ochranná logika, TG delete presnutý do AfterDelete
 *   v6.4.0 (2026-03-24) — WORKAROUND: libByName fallback pre ReferenceError
 */

var ce = entry();

function writeLog(type, text, variables) {
    try {
        var logsLib = libByName("ASISTANTO Logs");
        if (!logsLib) return;
        var logEntry = logsLib.create({});
        logEntry.set("type", type || "debug");
        logEntry.set("date", new Date());
        logEntry.set("memento library", "podpisy");
        logEntry.set("script", "BeforeDelete v7.0.0");
        logEntry.set("text", text || "");
        if (variables) logEntry.set("variables", variables);
    } catch(ignore) {}
}

function sf(n) { try { return ce.field(n); } catch(x) { return null; } }

// WORKAROUND: čítaj cez libByName ak entry().field() zlyhá pre novšie polia
function getField(fieldName) {
    var val = sf(fieldName);
    if (val !== null) return val;
    try {
        var podpisLib = libByName("podpisy");
        if (!podpisLib) return null;
        var allEntries = podpisLib.entries();
        for (var i = 0; i < allEntries.length; i++) {
            if (allEntries[i].id === ce.id) {
                return allEntries[i].field(fieldName);
            }
        }
    } catch(ex) {
        writeLog("error", "getField fallback: " + fieldName, ex.toString());
    }
    return null;
}

// Ochrana "Čaká" záznamu < 1 hodina
var stav = getField("Stav");
if (stav && String(stav).trim() === "Čaká") {
    var datum = getField("Dátum odoslania");
    if (datum) {
        try {
            if (new Date() - new Date(datum) < 3600000) {
                writeLog("warn", "BLOKOVANÉ — Čaká < 1h");
                message("⛔ Mazanie blokované — záznam je aktívny.");
                cancel();
            }
        } catch(e) {}
    }
}
