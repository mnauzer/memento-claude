/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.BeforeDelete
 * Typ:         Trigger — Before Delete
 * Verzia:      1.7.0
 * Dátum:       2026-03-23
 *
 * Účel:
 *   Pred vymazaním Podpis záznamu:
 *   1. Blokuje vymazanie ak je záznam v stave "Čaká" a mladší ako 1 hodina
 *   2. Zmaže príslušné Telegram správy (TG Správa ID + TG Follow-up ID)
 *   3. Diagnostický log do knižnice ASISTANTO Logs (vždy funguje,
 *      aj v BeforeDelete kde set() na vlastný záznam nepersistuje)
 *
 * Závislosti:
 *   - MementoSign v1.9.2+ (deleteMessage)
 *
 * Polia Podpis záznamu:
 *   "Stav"            — stav záznamu ('Čaká ', 'Doručená', 'Potvrdil', 'Odmietol', 'Zrušená ')
 *   "Dátum odoslania" — dátum/čas odoslania žiadosti (id:3)
 *   "TG Chat ID"      — Telegram chat ID zamestnanca (id:24)
 *   "TG Správa ID"    — Telegram message_id pôvodnej správy (id:23)
 *   "TG Follow-up ID" — Telegram message_id force-reply správy (id:25)
 */

var SCRIPT_NAME    = "Podp.Trigger.BeforeDelete";
var SCRIPT_VERSION = "1.7.0";

var currentEntry = entry();
var sf = function(n) { try { return currentEntry.field(n); } catch(ex) { return null; } };

// Diagnostický log — zapisuje do ASISTANTO Logs knižnice
var debugLines = [];
function dbg(msg) { debugLines.push(new Date().toISOString().substr(11,8) + " " + msg); }

dbg("▶ " + SCRIPT_NAME + " v" + SCRIPT_VERSION);

// ── 1. Ochrana "Čaká" záznamov ──────────────────────────────────────────────
var stav = sf("Stav");
dbg("Stav: [" + stav + "]");

if (stav && String(stav).trim() === "Čaká") {
    var datumOdoslania = sf("Dátum odoslania");
    if (datumOdoslania) {
        try {
            var d = new Date(datumOdoslania);
            var ageMs = new Date() - d;
            var oneHour = 60 * 60 * 1000;
            dbg("Čaká vek: " + Math.round(ageMs/1000) + "s");
            if (ageMs < oneHour) {
                message("⛔ Záznam je v stave 'Čaká' a bol vytvorený pred menej ako 1 hodinou.");
                cancel();
            }
        } catch(e) {
            dbg("Čaká check error: " + e);
        }
    }
}

// ── 2. Zmazanie TG správ ─────────────────────────────────────────────────────
var hasSign = typeof MementoSign !== 'undefined';
dbg("MementoSign loaded: " + hasSign);

if (!hasSign) {
    dbg("⚠️ MementoSign NEDOSTUPNÝ — TG správy sa nemažú!");
} else {
    // Verzia MementoSign
    try {
        var sv = MementoSign.MODULE_INFO ? MementoSign.MODULE_INFO.version : "?";
        dbg("MementoSign version: " + sv);
    } catch(ex) { dbg("version check err: " + ex); }

    // Bot token check
    try {
        if (typeof MementoSign._getBotToken === 'function') {
            var tok = MementoSign._getBotToken();
            dbg("token: " + (tok ? tok.substring(0, 10) + "...(" + tok.length + ")" : "NULL!"));
        } else {
            dbg("_getBotToken nie je public");
        }
    } catch(ex) { dbg("token check err: " + ex); }

    try {
        var chatId     = sf("TG Chat ID");
        var messageId  = sf("TG Správa ID");
        var followupId = sf("TG Follow-up ID");

        dbg("chatId: [" + chatId + "] msgId: [" + messageId + "] followupId: [" + followupId + "]");

        if (chatId && messageId) {
            try {
                var r1 = MementoSign.deleteMessage(chatId, messageId);
                dbg("delete msg: " + JSON.stringify(r1));
            } catch(e) {
                dbg("delete msg EXCEPTION: " + e);
            }
        } else {
            dbg("⚠️ chatId/messageId prázdne — skip");
        }

        if (chatId && followupId) {
            try {
                var r2 = MementoSign.deleteMessage(chatId, followupId);
                dbg("delete followup: " + JSON.stringify(r2));
            } catch(e) {
                dbg("delete followup EXCEPTION: " + e);
            }
        } else {
            dbg("followup prázdne — skip");
        }

    } catch(e) {
        dbg("OUTER EXCEPTION: " + e);
    }
}

// ── 3. Zapíš log do ASISTANTO Logs ──────────────────────────────────────────
try {
    var logsLib = libByName("ASISTANTO Logs");
    if (logsLib) {
        var logEntry = logsLib.createEntry();
        logEntry.set("type", "debug");                         // id:8 radio
        logEntry.set("date", new Date());                      // id:6 datetime
        logEntry.set("memento library", "podpisy");            // id:9 text
        logEntry.set("script", SCRIPT_NAME);                   // id:3 text
        logEntry.set("line", "v" + SCRIPT_VERSION);            // id:7 text
        logEntry.set("text", debugLines.join("\n"));            // id:1 text (multiline)
    } else {
        dbg("⚠️ ASISTANTO Logs knižnica nenájdená!");
    }
} catch(e) {
    // Posledná záchrana — message
    message("BD: " + debugLines.join(" | "));
}
