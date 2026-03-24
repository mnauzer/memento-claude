/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.BeforeDelete
 * Typ:         Trigger — Before deleting entry (synchronous)
 * Verzia:      6.0.0
 * Dátum:       2026-03-24
 *
 * Účel:
 *   1. Ochrana "Čaká" záznamov mladších ako 1 hodina
 *   2. Vytvorí DELETE notifikáciu v Notifications Hub
 *      (N8N spracuje mazanie TG správ serverovo)
 *
 * Závislosti: NotificationHub modul
 *
 * CHANGELOG:
 *   v6.0.0 — Notifications Hub namiesto ASISTANTO Logs hack
 *   v5.0.0 — ASISTANTO Logs queue pre AfterDelete
 *   v4.0.0 — Globálne premenné (nefungovalo)
 *   v3.0.0 — Prvý pokus o TG mazanie v BeforeDelete (http() nefunguje)
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

// 2. Vytvor DELETE notifikáciu cez NotificationHub
var chatId     = sf("TG Chat ID");
var messageId  = sf("TG Správa ID");
var followupId = sf("TG Follow-up ID");

if (chatId && messageId && typeof NotificationHub !== 'undefined') {
    NotificationHub.createNotification({
        typ: "DELETE",
        chatId: chatId,
        messageId: messageId,
        zdroj: "podpisy",
        zdrojId: ce.id
    });

    // Ak existuje follow-up správa, zmaž aj tú
    if (followupId) {
        NotificationHub.createNotification({
            typ: "DELETE",
            chatId: chatId,
            messageId: followupId,
            zdroj: "podpisy",
            zdrojId: ce.id
        });
    }
}
