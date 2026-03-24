/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.AfterDelete
 * Typ:         Trigger — After deleting entry (asynchronous)
 * Verzia:      1.0.0
 * Dátum:       2026-03-24
 *
 * Účel:
 *   Po vymazaní (presune do koša) Podpis záznamu zmaže TG správy.
 *   AfterDelete je asynchrónny — http() by mal byť dostupný.
 *
 * Závislosti:
 *   - MementoSign v1.9.2+ (deleteMessage)
 */

var SCRIPT_NAME    = "Podp.AfterDelete";
var SCRIPT_VERSION = "1.0.0";

var ce = entry();
var sf = function(n) { try { return ce.field(n); } catch(x) { return null; } };

var lines = [];
function dbg(msg) { lines.push(msg); }

dbg("v" + SCRIPT_VERSION);

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
            dbg("del msg: ok=" + (r1 ? r1.success : "null") + " err=" + (r1 ? (r1.error || "") : "null"));
        } catch(e) { dbg("del msg EX:" + e); }
    } else {
        dbg("skip msg (empty)");
    }

    if (chatId && followupId) {
        try {
            var r2 = MementoSign.deleteMessage(chatId, followupId);
            dbg("del fup: ok=" + (r2 ? r2.success : "null") + " err=" + (r2 ? (r2.error || "") : "null"));
        } catch(e) { dbg("del fup EX:" + e); }
    }
} else {
    dbg("MementoSign CHÝBA!");
}

// Log do ASISTANTO Logs
try {
    var logsLib = libByName("ASISTANTO Logs");
    if (logsLib) {
        var le = logsLib.create({});
        le.set("script", SCRIPT_NAME);
        le.set("memento library", "podpisy");
        le.set("line", "v" + SCRIPT_VERSION);
        le.set("Debug_Log", lines.join("\n"));
    }
} catch(e) {}
