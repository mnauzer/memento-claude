/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.AfterDelete
 * Typ:         Trigger — After deleting entry (asynchronous)
 * Verzia:      3.0.0
 * Dátum:       2026-03-24
 *
 * Účel:
 *   Prečíta TG dáta z ASISTANTO Logs (script="PENDING_TG_DELETE")
 *   zapísané BeforeDelete triggerom a zavolá deleteMessage.
 *   Po spracovaní vymaže pending záznam.
 */

var SCRIPT_NAME = "Podp.AfterDelete";
var lines = [];
function dbg(msg) { lines.push(msg); }

dbg("v3.0.0");

var hasSign = typeof MementoSign !== 'undefined';
dbg("Sign:" + hasSign);

if (!hasSign) {
    dbg("MementoSign CHÝBA!");
} else {
    try {
        var logsLib = libByName("ASISTANTO Logs");
        if (!logsLib) {
            dbg("ASISTANTO Logs nenájdená!");
        } else {
            var pending = logsLib.find("PENDING_TG_DELETE");
            dbg("pending:" + (pending ? pending.length : 0));

            if (pending && pending.length > 0) {
                for (var i = 0; i < pending.length; i++) {
                    var pe = pending[i];
                    var scriptVal = null;
                    try { scriptVal = pe.field("script"); } catch(x) {}

                    if (scriptVal === "PENDING_TG_DELETE") {
                        var data = null;
                        try { data = pe.field("text"); } catch(x) {}
                        dbg("data:[" + data + "]");

                        if (data) {
                            var parts = String(data).split("|");
                            var chatId     = parts[0] || null;
                            var messageId  = parts[1] || null;
                            var followupId = parts[2] || null;

                            dbg("chat:[" + chatId + "] msg:[" + messageId + "] fup:[" + followupId + "]");

                            if (chatId && messageId) {
                                try {
                                    var r1 = MementoSign.deleteMessage(chatId, messageId);
                                    dbg("del msg: ok=" + (r1 ? r1.success : "null") + " err=" + (r1 ? (r1.error || "") : "null"));
                                } catch(e) { dbg("del msg EX:" + e); }
                            }

                            if (chatId && followupId) {
                                try {
                                    var r2 = MementoSign.deleteMessage(chatId, followupId);
                                    dbg("del fup: ok=" + (r2 ? r2.success : "null") + " err=" + (r2 ? (r2.error || "") : "null"));
                                } catch(e) { dbg("del fup EX:" + e); }
                            }
                        }

                        // Vymaž spracovaný pending záznam
                        try { pe.trash(); } catch(x) { dbg("trash err:" + x); }
                    }
                }
            } else {
                dbg("žiadne pending záznamy");
            }
        }
    } catch(e) {
        dbg("EXCEPTION:" + e);
    }
}

// Log výsledok
try {
    var logsLib2 = libByName("ASISTANTO Logs");
    if (logsLib2) {
        var le = logsLib2.create({});
        le.set("script", SCRIPT_NAME);
        le.set("memento library", "podpisy");
        le.set("Debug_Log", lines.join("\n"));
    }
} catch(e) {}
