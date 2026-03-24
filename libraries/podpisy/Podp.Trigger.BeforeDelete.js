/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.BeforeDelete
 * Typ:         Trigger — Before deleting entry (synchronous)
 * Verzia:      6.2.0
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
 *   v6.2.0 — Debug do ASISTANTO Logs (trvalý záznam aj po zmazaní podpisu)
 *   v6.1.0 — Diagnostika cez Debug_Log + záložný log do Notifications
 *   v6.0.0 — Notifications Hub namiesto ASISTANTO Logs hack
 */

var ce = entry();
var sf = function(n) { try { return ce.field(n); } catch(x) { return null; } };
var log = [];

// === Debug do ASISTANTO Logs ===
function writeLog(type, text, variables) {
    try {
        var logsLib = libByName("ASISTANTO Logs");
        if (logsLib) {
            var logEntry = logsLib.create({});
            logEntry.set("type", type || "debug");
            logEntry.set("date", new Date());
            logEntry.set("memento library", "podpisy");
            logEntry.set("script", "Podp.Trigger.BeforeDelete");
            logEntry.set("library", "v6.2.0");
            logEntry.set("text", text || "");
            if (variables) {
                logEntry.set("variables", variables);
            }
        }
    } catch(ignore) {}
}

// 1. Ochrana "Čaká"
var stav = sf("Stav");
if (stav && String(stav).trim() === "Čaká") {
    var datum = sf("Dátum odoslania");
    if (datum) {
        try {
            if (new Date() - new Date(datum) < 3600000) {
                writeLog("warn", "Mazanie blokované — Čaká < 1h", "stav=" + stav);
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

var vars = "chatId=[" + chatId + "] messageId=[" + messageId + "] followupId=[" + followupId + "] NH=" + (typeof NotificationHub !== 'undefined');
writeLog("debug", "BeforeDelete štart", vars);

if (chatId && messageId) {
    if (typeof NotificationHub !== 'undefined') {
        try {
            var result = NotificationHub.createNotification({
                typ: "DELETE",
                chatId: chatId,
                messageId: messageId,
                zdroj: "podpisy",
                zdrojId: ce.id
            });
            writeLog(result ? "log" : "error",
                result ? "Notifikácia vytvorená" : "createNotification vrátil null",
                "entryId=" + ce.id + " NHv=" + (NotificationHub.version || "?"));
        } catch(ex) {
            writeLog("error", "createNotification CHYBA: " + ex.toString(), vars);
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
                writeLog("log", "Follow-up notifikácia vytvorená", "followupId=" + followupId);
            } catch(ex2) {
                writeLog("error", "Follow-up CHYBA: " + ex2.toString());
            }
        }
    } else {
        writeLog("error", "NotificationHub NENÁJDENÝ! Skontroluj globálne skripty a load order.", vars);

        // Záložný pokus — priamo cez libByName
        try {
            var notifLib = libByName("Notifications");
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
                writeLog("warn", "Záložná notifikácia vytvorená (bez NH)", "chatId=" + chatId);
            } else {
                writeLog("error", "libByName('Notifications') vrátil null!");
            }
        } catch(fallbackErr) {
            writeLog("error", "Záložný pokus ZLYHAL: " + fallbackErr.toString());
        }
    }
} else {
    writeLog("warn", "Žiadne TG údaje — preskakujem", "chatId=[" + chatId + "] messageId=[" + messageId + "]");
}
