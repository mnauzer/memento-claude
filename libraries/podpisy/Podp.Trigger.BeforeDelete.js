/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.BeforeDelete
 * Typ:         Trigger — Before deleting entry (synchronous)
 * Verzia:      6.4.0
 * Dátum:       2026-03-24
 *
 * Účel:
 *   1. Ochrana "Čaká" záznamov mladších ako 1 hodina
 *   2. Vytvorí DELETE notifikáciu v Notifications Hub
 *
 * Závislosti: NotificationHub modul (globálny skript)
 *
 * WORKAROUND: entry().field() hádže ReferenceError pre novšie polia.
 * Riešenie: nájsť entry cez libByName("podpisy").entries() a čítať odtiaľ.
 *
 * CHANGELOG:
 *   v6.4.0 — WORKAROUND: čítanie polí cez libByName namiesto entry().field()
 *   v6.3.0 — Diagnostika: dump polí odhalil ReferenceError pre novšie polia
 *   v6.2.0 — Debug do ASISTANTO Logs
 *   v6.0.0 — Notifications Hub namiesto ASISTANTO Logs hack
 */

var ce = entry();

// === Debug do ASISTANTO Logs ===
function writeLog(type, text, variables) {
    try {
        var logsLib = libByName("ASISTANTO Logs");
        if (!logsLib) return;
        var logEntry = logsLib.create({});
        logEntry.set("type", type || "debug");
        logEntry.set("date", new Date());
        logEntry.set("memento library", "podpisy");
        logEntry.set("script", "BeforeDelete v6.4.0");
        logEntry.set("text", text || "");
        if (variables) logEntry.set("variables", variables);
    } catch(ignore) {}
}

// Safe field read — priamo z entry()
function sf(n) { try { return ce.field(n); } catch(x) { return null; } }

// WORKAROUND: čítaj pole cez libByName ak entry().field() zlyhá
function getField(fieldName) {
    // Najprv skús priamo
    var val = sf(fieldName);
    if (val !== null) return val;

    // Fallback: nájdi entry v knižnici podľa ID
    try {
        var podpisLib = libByName("podpisy");
        if (!podpisLib) return null;
        var allEntries = podpisLib.entries();
        for (var i = 0; i < allEntries.length; i++) {
            if (allEntries[i].id === ce.id) {
                return allEntries[i].field(fieldName);
            }
        }
    } catch(ex) {
        writeLog("error", "getField fallback chyba: " + fieldName, ex.toString());
    }
    return null;
}

// Čítaj polia
var stav       = getField("Stav");
var chatId     = getField("TG Chat ID");
var messageId  = getField("TG Správa ID");
var followupId = getField("TG Follow-up ID");

writeLog("debug", "Polia",
    "stav=[" + stav + "] chatId=[" + chatId + "] msgId=[" + messageId + "] followup=[" + followupId + "] NH=" + (typeof NotificationHub !== 'undefined'));

// 1. Ochrana "Čaká"
if (stav && String(stav).trim() === "Čaká") {
    var datum = getField("Dátum odoslania");
    if (datum) {
        try {
            if (new Date() - new Date(datum) < 3600000) {
                writeLog("warn", "BLOKOVANÉ — Čaká < 1h");
                message("⛔ Mazanie blokované.");
                cancel();
            }
        } catch(e) {}
    }
}

// 2. Vytvor DELETE notifikáciu
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
                result ? "Notifikácia OK" : "createNotification=null",
                "chatId=" + chatId + " msgId=" + messageId + " NHv=" + (NotificationHub.version || "?"));
        } catch(ex) {
            writeLog("error", "createNotification CHYBA", ex.toString());
        }

        if (followupId) {
            try {
                NotificationHub.createNotification({
                    typ: "DELETE", chatId: chatId, messageId: followupId,
                    zdroj: "podpisy", zdrojId: ce.id
                });
            } catch(ex2) {}
        }
    } else {
        writeLog("error", "NotificationHub NENÁJDENÝ!");
        // Záložný pokus priamo
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
                writeLog("warn", "Záložná notifikácia OK");
            }
        } catch(fe) {
            writeLog("error", "Záložný pokus zlyhal", fe.toString());
        }
    }
} else {
    writeLog("warn", "Preskakujem — chýba chatId alebo msgId",
        "chatId=[" + chatId + "] msgId=[" + messageId + "]");
}
