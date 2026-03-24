/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.BeforeDelete
 * Typ:         Trigger — Before deleting entry
 * Verzia:      3.0.0
 * Dátum:       2026-03-24
 *
 * Účel:
 *   1. Blokuje vymazanie ak je záznam v stave "Čaká" a mladší ako 1 hodina
 *   2. Zmaže TG správy (TG Správa ID + TG Follow-up ID)
 *   3. Zapíše diagnostiku do ASISTANTO Logs (Debug_Log pole)
 *
 * Memento API:
 *   - lib.create({}) + set() na vytvorenie záznamu
 *   - dialog() je builder pattern
 *   - message("text") priamy parameter
 */

var SCRIPT_NAME    = "Podp.BeforeDelete";
var SCRIPT_VERSION = "3.0.0";

var ce = entry();
var sf = function(n) { try { return ce.field(n); } catch(x) { return null; } };

var lines = [];
function dbg(msg) { lines.push(msg); }

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
            dbg("del msg: " + (r1 ? "ok=" + r1.success + " err=" + (r1.error || "") : "null"));
        } catch(e) { dbg("del msg EX:" + e); }
    } else {
        dbg("skip msg (empty)");
    }

    if (chatId && followupId) {
        try {
            var r2 = MementoSign.deleteMessage(chatId, followupId);
            dbg("del fup: " + (r2 ? "ok=" + r2.success + " err=" + (r2.error || "") : "null"));
        } catch(e) { dbg("del fup EX:" + e); }
    }
} else {
    dbg("MementoSign CHÝBA!");
}

// ── 3. Log do ASISTANTO Logs ────────────────────────────────────────────────
try {
    var logsLib = libByName("ASISTANTO Logs");
    if (logsLib) {
        var le = logsLib.create({});
        le.set("script", SCRIPT_NAME);
        le.set("memento library", "podpisy");
        le.set("line", "v" + SCRIPT_VERSION);
        le.set("Debug_Log", lines.join("\n"));
    }
} catch(e) {
    message("Log: " + lines.join("|"));
}
