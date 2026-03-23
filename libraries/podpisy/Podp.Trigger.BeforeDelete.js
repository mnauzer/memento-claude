/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.BeforeDelete
 * Typ:         Trigger — Before Delete
 * Verzia:      1.5.0
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
 *
 * Poznámky:
 *   - "Čaká " má trailing space (Memento choice label)
 *   - Pre TG mazanie: silent fail — chyba (napr. správa už vymazaná) sa ignoruje
 */

var SCRIPT_NAME    = "Podp.Trigger.BeforeDelete";
var SCRIPT_VERSION = "1.5.0";

var currentEntry = entry();
var sf = function(n) { try { return currentEntry.field(n); } catch(ex) { return null; } };

// ── 1. Ochrana "Čaká" záznamov ──────────────────────────────────────────────
var stav = sf("Stav");
if (stav && String(stav).trim() === "Čaká") {
    var datumOdoslania = sf("Dátum odoslania");
    if (datumOdoslania) {
        try {
            var d = new Date(datumOdoslania);
            var ageMs = new Date() - d;
            var oneHour = 60 * 60 * 1000;
            if (ageMs < oneHour) {
                message("⛔ Záznam je v stave 'Čaká' a bol vytvorený pred menej ako 1 hodinou. Počkaj na vybavenie alebo skús neskôr.");
                cancel();
            }
        } catch(e) {
            // Ak nevieme overiť vek, radšej neblokujeme
        }
    }
}

// ── 2. Zmazanie TG správ ─────────────────────────────────────────────────────
var hasSign = typeof MementoSign !== 'undefined';

if (hasSign) {
    try {
        var chatId     = sf("TG Chat ID");
        var messageId  = sf("TG Správa ID");
        var followupId = sf("TG Follow-up ID");

        // Silent fail — výsledok ignorujeme (správa mohla byť vymazaná manuálne)
        if (chatId && messageId)  { try { MementoSign.deleteMessage(chatId, messageId);  } catch(e) {} }
        if (chatId && followupId) { try { MementoSign.deleteMessage(chatId, followupId); } catch(e) {} }

    } catch(e) {
        // Silent fail — nesmie zabrániť vymazaniu záznamu
    }
} // end if (hasSign)
