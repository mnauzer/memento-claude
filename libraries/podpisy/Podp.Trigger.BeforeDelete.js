/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.BeforeDelete
 * Typ:         Trigger — Before deleting entry (synchronous)
 * Verzia:      6.3.0
 * Dátum:       2026-03-24
 *
 * Účel:
 *   1. Ochrana "Čaká" záznamov mladších ako 1 hodina
 *   2. Vytvorí DELETE notifikáciu v Notifications Hub
 *
 * Závislosti: NotificationHub modul (globálny skript)
 *
 * CHANGELOG:
 *   v6.3.0 — Diagnostika: dump VŠETKÝCH polí + test rôznych variácií názvov
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
        logEntry.set("script", "BeforeDelete v6.3.0");
        logEntry.set("text", text || "");
        if (variables) logEntry.set("variables", variables);
    } catch(ignore) {}
}

// Safe field read
function sf(n) { try { return ce.field(n); } catch(x) { return "ERR:" + x; } }

// === DIAGNOSTIKA: prečítaj VŠETKY známe polia ===
var allFields = [
    "ID", "Názov", "Stav", "Dátum odoslania", "Poznámka",
    "TG Chat ID", "TG Správa ID", "TG Follow-up ID", "TG Správa",
    "Zdroj ID", "Zdrojová lib ID", "Zdrojový field ID",
    "Debug_Log", "Knižnica"
];

var dump = [];
for (var i = 0; i < allFields.length; i++) {
    var val = sf(allFields[i]);
    if (val !== null && val !== "" && val !== 0) {
        dump.push(allFields[i] + "=[" + val + "]");
    }
}
writeLog("debug", "FIELD DUMP (" + dump.length + " non-empty)", dump.join(" | "));

// Čítaj TG polia
var chatId     = sf("TG Chat ID");
var messageId  = sf("TG Správa ID");
var followupId = sf("TG Follow-up ID");

writeLog("debug", "TG polia",
    "chatId=[" + chatId + "] msgId=[" + messageId + "] followup=[" + followupId + "] NH=" + (typeof NotificationHub !== 'undefined'));

// 1. Ochrana "Čaká"
var stav = sf("Stav");
if (stav && String(stav).trim() === "Čaká") {
    var datum = sf("Dátum odoslania");
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
                "NHv=" + (NotificationHub.version || "?"));
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
        // Záložný pokus
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
                writeLog("warn", "Záložná notifikácia vytvorená priamo");
            }
        } catch(fe) {
            writeLog("error", "Záložný pokus zlyhal", fe.toString());
        }
    }
} else {
    writeLog("warn", "Preskakujem — chýba chatId alebo msgId",
        "chatId=[" + chatId + "] msgId=[" + messageId + "]");
}
