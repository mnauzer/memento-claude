/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.AfterDelete
 * Typ:         Trigger — After deleting entry (asynchronous)
 * Verzia:      2.0.0
 * Dátum:       2026-03-24
 *
 * Účel:
 *   Prečíta TG dáta z globálnej premennej _pendingTgDelete
 *   (nastavené v BeforeDelete) a zavolá deleteMessage.
 *   http() funguje v asynchrónnych triggeroch.
 */

var SCRIPT_NAME = "Podp.AfterDelete";
var lines = [];
function dbg(msg) { lines.push(msg); }

dbg("v2.0.0");

var hasData = typeof _pendingTgDelete !== 'undefined' && _pendingTgDelete !== null;
dbg("pendingData:" + hasData);

var hasSign = typeof MementoSign !== 'undefined';
dbg("Sign:" + hasSign);

if (hasData && hasSign) {
    var chatId     = _pendingTgDelete.chatId;
    var messageId  = _pendingTgDelete.messageId;
    var followupId = _pendingTgDelete.followupId;
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

    // Vyčisti globálnu premennú
    _pendingTgDelete = null;

} else if (!hasData) {
    dbg("žiadne TG dáta z BeforeDelete");
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
        le.set("Debug_Log", lines.join("\n"));
    }
} catch(e) {}
