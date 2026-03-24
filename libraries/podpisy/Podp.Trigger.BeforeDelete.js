/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.BeforeDelete
 * Typ:         Trigger — Before deleting entry
 * Verzia:      2.0.0
 * Dátum:       2026-03-24
 *
 * Účel:
 *   1. Blokuje vymazanie ak je záznam v stave "Čaká" a mladší ako 1 hodina
 *   2. Zmaže TG správy (TG Správa ID + TG Follow-up ID)
 *   3. Zapíše diagnostiku do ASISTANTO Logs
 *
 * Memento API:
 *   - lib.create({...}) na vytvorenie záznamu (nie createEntry!)
 *   - dialog() je builder pattern (nie priame parametre)
 */

var SCRIPT_NAME    = "Podp.Trigger.BeforeDelete";
var SCRIPT_VERSION = "2.0.0";

var currentEntry = entry();
var sf = function(n) { try { return currentEntry.field(n); } catch(ex) { return null; } };

var debugLines = [];
function dbg(msg) { debugLines.push(msg); }

dbg("v" + SCRIPT_VERSION);

// ── 1. Ochrana "Čaká" záznamov ──────────────────────────────────────────────
var stav = sf("Stav");
dbg("Stav:[" + stav + "]");

if (stav && String(stav).trim() === "Čaká") {
    var datumOdoslania = sf("Dátum odoslania");
    if (datumOdoslania) {
        try {
            var ageMs = new Date() - new Date(datumOdoslania);
            if (ageMs < 3600000) {
                message("⛔ Záznam 'Čaká' mladší ako 1h — mazanie blokované.");
                cancel();
            }
        } catch(e) {}
    }
}

// ── 2. Zmazanie TG správ ─────────────────────────────────────────────────────
var hasSign = typeof MementoSign !== 'undefined';
dbg("Sign:" + hasSign);

if (hasSign) {
    var chatId     = sf("TG Chat ID");
    var messageId  = sf("TG Správa ID");
    var followupId = sf("TG Follow-up ID");
    dbg("chat:[" + chatId + "] msg:[" + messageId + "] fup:[" + followupId + "]");

    if (chatId && messageId) {
        try {
            var r1 = MementoSign.deleteMessage(chatId, messageId);
            dbg("r1:" + (r1 ? r1.success + " " + (r1.error || "") : "null"));
        } catch(e) { dbg("r1 err:" + e); }
    }
    if (chatId && followupId) {
        try {
            var r2 = MementoSign.deleteMessage(chatId, followupId);
            dbg("r2:" + (r2 ? r2.success + " " + (r2.error || "") : "null"));
        } catch(e) { dbg("r2 err:" + e); }
    }
} else {
    dbg("MementoSign CHÝBA!");
}

// ── 3. Log do ASISTANTO Logs ────────────────────────────────────────────────
try {
    var logsLib = libByName("ASISTANTO Logs");
    if (logsLib) {
        var logE = logsLib.create({});
        logE.set("script", SCRIPT_NAME);
        logE.set("text", debugLines.join("\n"));
        logE.set("memento library", "podpisy");
        logE.set("line", "v" + SCRIPT_VERSION);
    }
} catch(e) {
    message("Log: " + debugLines.join("|"));
}
