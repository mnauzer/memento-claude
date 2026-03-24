/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.BeforeDelete
 * Typ:         Trigger — Before deleting entry (synchronous)
 * Verzia:      4.0.0
 * Dátum:       2026-03-24
 *
 * Účel:
 *   1. Ochrana "Čaká" záznamov mladších ako 1 hodina
 *   2. Uloží TG dáta do globálnej premennej pre AfterDelete
 *      (http() nie je dostupný v BeforeDelete, ale field() áno)
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

// 2. Uloží TG dáta pre AfterDelete
var chatId     = sf("TG Chat ID");
var messageId  = sf("TG Správa ID");
var followupId = sf("TG Follow-up ID");

_pendingTgDelete = {
    chatId:     chatId ? String(chatId) : null,
    messageId:  messageId ? String(messageId) : null,
    followupId: followupId ? String(followupId) : null
};
