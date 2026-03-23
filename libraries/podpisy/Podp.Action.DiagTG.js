/**
 * Knižnica:    podpisy
 * Názov:       Podp.Action.DiagTG
 * Typ:         Action — diagnostika TG mazania
 * Verzia:      1.2.0
 * Dátum:       2026-03-24
 *
 * POZOR: Rovno odošle deleteMessage (bez potvrdenia) a zobrazí výsledok.
 */

var _e = entry();
var _sf = function(n) { try { return _e.field(n); } catch(x) { return null; } };

var _chatId = _sf("TG Chat ID");
var _msgId  = _sf("TG Správa ID");
var _fupId  = _sf("TG Follow-up ID");
var _stav   = _sf("Stav");

var _signVer = "CHÝBA";
if (typeof MementoSign !== 'undefined') {
    try { _signVer = MementoSign.version || "?"; } catch(x) {}
}

var _out = "MementoSign: v" + _signVer
    + "\nStav: [" + _stav + "]"
    + "\nchatId: [" + _chatId + "]"
    + "\nmsgId: [" + _msgId + "]"
    + "\nfollowupId: [" + (_fupId || "") + "]";

if (typeof MementoSign === 'undefined') {
    _out += "\n\nMementoSign CHÝBA!";
} else if (!_chatId || !_msgId) {
    _out += "\n\nchatId alebo msgId prázdne!";
} else {
    // Rovno odoslať deleteMessage — bez potvrdenia
    var _r1 = null;
    try {
        _r1 = MementoSign.deleteMessage(_chatId, _msgId);
    } catch(x) {
        _r1 = { success: false, error: "EXCEPTION: " + x };
    }
    _out += "\n\n--- deleteMessage msgId ---";
    _out += "\nsuccess: " + (_r1 ? _r1.success : "null");
    _out += "\nerror: " + (_r1 ? (_r1.error || "žiadna") : "null");

    if (_fupId) {
        var _r2 = null;
        try {
            _r2 = MementoSign.deleteMessage(_chatId, _fupId);
        } catch(x) {
            _r2 = { success: false, error: "EXCEPTION: " + x };
        }
        _out += "\n\n--- deleteMessage followupId ---";
        _out += "\nsuccess: " + (_r2 ? _r2.success : "null");
        _out += "\nerror: " + (_r2 ? (_r2.error || "žiadna") : "null");
    }
}

// Zapíš do Debug_Log
try { _e.set("Debug_Log", _out); } catch(x) {}

// Zobraz výsledok
dialog().title("DiagTG v1.2.0").text(_out).positiveButton("OK", function() { return true; }).show();
