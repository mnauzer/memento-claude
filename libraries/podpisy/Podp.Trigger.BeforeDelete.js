/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.BeforeDelete
 * Typ:         Trigger — Before deleting entry (synchronous)
 * Verzia:      6.1.0
 * Dátum:       2026-03-24
 *
 * Účel:
 *   1. Ochrana "Čaká" záznamov mladších ako 1 hodina
 *   2. Vytvorí DELETE notifikáciu v Notifications Hub
 *      (N8N spracuje mazanie TG správ serverovo)
 *
 * Závislosti: NotificationHub modul (globálny skript)
 *
 * CHANGELOG:
 *   v6.1.0 — Diagnostika cez Debug_Log + záložný log do Notifications
 *   v6.0.1 — Debug logging + message() keď NotificationHub chýba
 *   v6.0.0 — Notifications Hub namiesto ASISTANTO Logs hack
 */

var ce = entry();
var sf = function(n) { try { return ce.field(n); } catch(x) { return null; } };
var log = [];

function addLog(msg) {
    log.push(msg);
    try { ce.set("Debug_Log", log.join("\n")); } catch(ignore) {}
}

addLog("=== BeforeDelete v6.1.0 ===");

// 1. Ochrana "Čaká"
var stav = sf("Stav");
addLog("Stav: [" + stav + "]");
if (stav && String(stav).trim() === "Čaká") {
    var datum = sf("Dátum odoslania");
    if (datum) {
        try {
            if (new Date() - new Date(datum) < 3600000) {
                addLog("BLOKOVANÉ — Čaká < 1h");
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

addLog("chatId: [" + chatId + "]");
addLog("messageId: [" + messageId + "]");
addLog("followupId: [" + followupId + "]");
addLog("NotificationHub: " + (typeof NotificationHub !== 'undefined'));

if (chatId && messageId) {
    if (typeof NotificationHub !== 'undefined') {
        addLog("NH verzia: " + (NotificationHub.version || "?"));
        try {
            var result = NotificationHub.createNotification({
                typ: "DELETE",
                chatId: chatId,
                messageId: messageId,
                zdroj: "podpisy",
                zdrojId: ce.id
            });
            addLog("createNotification result: " + (result ? "OK (entry created)" : "FAIL (returned null)"));
        } catch(ex) {
            addLog("CHYBA createNotification: " + ex.toString());
        }

        // Ak existuje follow-up správa, zmaž aj tú
        if (followupId) {
            try {
                NotificationHub.createNotification({
                    typ: "DELETE",
                    chatId: chatId,
                    messageId: followupId,
                    zdroj: "podpisy",
                    zdrojId: ce.id
                });
                addLog("Follow-up notification created");
            } catch(ex2) {
                addLog("Follow-up CHYBA: " + ex2.toString());
            }
        }
    } else {
        addLog("⚠️ NotificationHub NENÁJDENÝ!");
        addLog("Skontroluj: Nastavenia → Skripty → NotificationHub.js musí byť PRED BeforeDelete");

        // Záložný pokus — priamo cez libByName
        try {
            var notifLib = libByName("Notifications");
            addLog("libByName('Notifications'): " + (notifLib ? "OK" : "null"));
            if (notifLib) {
                var n = notifLib.create({});
                n.set("Typ operácie", "DELETE");
                n.set("Chat ID", String(chatId));
                n.set("Message ID", String(messageId));
                n.set("Status", "Čaká");
                n.set("Správa", "");
                n.set("Zdroj správy", "Automatická ");
                n.set("Zdrojová knižnica", "podpisy");
                n.set("Zdrojový ID", String(ce.id));
                n.set("Retry Count", 0);
                addLog("Záložná notifikácia vytvorená priamo");
            }
        } catch(fallbackErr) {
            addLog("Záložný pokus ZLYHAL: " + fallbackErr.toString());
        }
    }
} else {
    addLog("ℹ️ Žiadne TG údaje — preskakujem");
    if (!chatId) addLog("  chatId je prázdny/null");
    if (!messageId) addLog("  messageId je prázdny/null");
}

addLog("=== KONIEC ===");
