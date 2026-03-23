/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.BeforeDelete
 * Typ:         Trigger — Before Delete
 * Verzia:      1.6.0
 * Dátum:       2026-03-23
 *
 * Účel:
 *   Pred vymazaním Podpis záznamu:
 *   1. Blokuje vymazanie ak je záznam v stave "Čaká" a mladší ako 1 hodina
 *      (chráni in-flight žiadosti o podpis pred náhodným vymazaním)
 *   2. Zmaže príslušné Telegram správy (TG Správa ID + TG Follow-up ID)
 *
 * Závislosti:
 *   - MementoSign v1.9.2+ (deleteMessage)
 *
 * Polia Podpis záznamu:
 *   "Stav"            — stav záznamu ('Čaká ', 'Doručená', 'Potvrdil', 'Odmietol', 'Zrušená ')
 *   "Dátum odoslania" — dátum/čas odoslania žiadosti (id:3)
 *   "TG Chat ID"      — Telegram chat ID zamestnanca
 *   "TG Správa ID"    — Telegram message_id pôvodnej správy
 *   "TG Follow-up ID" — Telegram message_id force-reply správy (dôvod odmietnutia)
 *   "Debug_Log"       — diagnostický log (id:27)
 *
 * Poznámky:
 *   - "Čaká " má trailing space (Memento choice label)
 *   - v1.6.0: diagnostický log do Debug_Log poľa — namiesto silent fail
 */

var SCRIPT_NAME    = "Podp.Trigger.BeforeDelete";
var SCRIPT_VERSION = "1.6.0";

var currentEntry = entry();
var sf = function(n) { try { return currentEntry.field(n); } catch(ex) { return null; } };

// Diagnostický log — zapíše do Debug_Log poľa
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
                message("⛔ Záznam je v stave 'Čaká' a bol vytvorený pred menej ako 1 hodinou. Počkaj na vybavenie alebo skús neskôr.");
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
    try {
        var chatId     = sf("TG Chat ID");
        var messageId  = sf("TG Správa ID");
        var followupId = sf("TG Follow-up ID");

        dbg("chatId: [" + chatId + "] msgId: [" + messageId + "] followupId: [" + followupId + "]");

        if (chatId && messageId) {
            try {
                var r1 = MementoSign.deleteMessage(chatId, messageId);
                dbg("deleteMsg r1: " + JSON.stringify(r1));
            } catch(e) {
                dbg("deleteMsg r1 EXCEPTION: " + e);
            }
        } else {
            dbg("⚠️ chatId alebo messageId prázdne — skip msg delete");
        }

        if (chatId && followupId) {
            try {
                var r2 = MementoSign.deleteMessage(chatId, followupId);
                dbg("deleteMsg r2: " + JSON.stringify(r2));
            } catch(e) {
                dbg("deleteMsg r2 EXCEPTION: " + e);
            }
        } else {
            dbg("skip followup (empty)");
        }

    } catch(e) {
        dbg("OUTER EXCEPTION: " + e);
    }
}

// Zapíš diagnostický log do Debug_Log poľa
try {
    currentEntry.set("Debug_Log", debugLines.join("\n"));
} catch(e) {
    // set() môže zlyhať v BeforeDelete — skús message
    message("BD log: " + debugLines.join(" | "));
}
