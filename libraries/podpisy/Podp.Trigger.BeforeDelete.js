/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.BeforeDelete
 * Typ:         Trigger — Before deleting entry (synchronous)
 * Verzia:      5.0.0
 * Dátum:       2026-03-24
 *
 * Účel:
 *   1. Ochrana "Čaká" záznamov mladších ako 1 hodina
 *   2. Uloží TG dáta do ASISTANTO Logs (script="PENDING_TG_DELETE")
 *      pre AfterDelete trigger (http() tu nefunguje)
 */

var ce = entry();
var sf = function(n) { try { return ce.field(n); } catch(x) { return null; } };

// 1. Ochrana "Čaká"
var stav = sf("Stav");
if (stav && String(stav).trim() === "Čaká") {
    var datum = sf("Dátum odoslania");
    if (datum) {
        try {
            if (new Date() - new Date(datum) < 3600000) {
                message("⛔ Záznam 'Čaká' mladší ako 1h — mazanie blokované.");
                cancel();
            }
        } catch(e) {}
    }
}

// 2. Uloží TG dáta do ASISTANTO Logs pre AfterDelete
var chatId     = sf("TG Chat ID");
var messageId  = sf("TG Správa ID");
var followupId = sf("TG Follow-up ID");

if (chatId && messageId) {
    try {
        var logsLib = libByName("ASISTANTO Logs");
        if (logsLib) {
            var le = logsLib.create({});
            le.set("script", "PENDING_TG_DELETE");
            le.set("text", String(chatId) + "|" + String(messageId) + "|" + String(followupId || ""));
            le.set("memento library", "podpisy");
        }
    } catch(e) {}
}
