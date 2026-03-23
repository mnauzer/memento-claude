/**
 * Knižnica:    podpisy
 * Názov:       Podp.Action.DiagTG
 * Typ:         Action — diagnostika TG mazania
 * Verzia:      1.0.0
 * Dátum:       2026-03-23
 */

// ⚠️ KRITICKÉ: dialog() len na top-leveli, žiadny 'use strict'

var _e = entry();
var _sf = function(n) { try { return _e.field(n); } catch(x) { return "FIELD_ERR:" + n; } };
var _lines = [];

_lines.push("=== DIAGNOSTIKA TG MAZANIA ===");
_lines.push("");

// 1. MementoSign
var _hasSign = typeof MementoSign !== 'undefined';
_lines.push("MementoSign: " + (_hasSign ? "NAČÍTANÝ" : "CHÝBA!"));

if (_hasSign) {
    try { _lines.push("Verzia: " + (MementoSign.version || "?")); } catch(x) { _lines.push("Verzia: ERR " + x); }
}

// 2. Polia záznamu
var _chatId = _sf("TG Chat ID");
var _msgId  = _sf("TG Správa ID");
var _fupId  = _sf("TG Follow-up ID");
var _stav   = _sf("Stav");

_lines.push("");
_lines.push("Stav:       [" + _stav + "]");
_lines.push("TG Chat ID: [" + _chatId + "]");
_lines.push("TG Správa ID: [" + _msgId + "]");
_lines.push("TG Follow-up ID: [" + _fupId + "]");

// 3. Test deleteMessage
if (!_hasSign) {
    _lines.push("");
    _lines.push("⚠️ MementoSign nie je načítaný — nemôžem testovať!");
    dialog("DiagTG", _lines.join("\n"), "OK");
} else if (!_chatId || !_msgId) {
    _lines.push("");
    _lines.push("⚠️ chatId alebo msgId prázdne — nič neodošlem.");
    dialog("DiagTG", _lines.join("\n"), "OK");
} else {
    var _go = dialog("DiagTG", _lines.join("\n") + "\n\nOdoslať deleteMessage?", "Odoslať", "Zrušiť");
    if (_go === 0) {
        var _r1 = null;
        try {
            _r1 = MementoSign.deleteMessage(_chatId, _msgId);
        } catch(x) {
            _r1 = { success: false, error: "EXCEPTION: " + x };
        }

        var _res = "=== VÝSLEDOK ===\n";
        _res += "TG Správa ID [" + _msgId + "]: ";
        _res += _r1 ? ("success=" + _r1.success + " error=" + (_r1.error || "žiadna")) : "NULL";

        if (_fupId) {
            var _r2 = null;
            try {
                _r2 = MementoSign.deleteMessage(_chatId, _fupId);
            } catch(x) {
                _r2 = { success: false, error: "EXCEPTION: " + x };
            }
            _res += "\nTG Follow-up [" + _fupId + "]: ";
            _res += _r2 ? ("success=" + _r2.success + " error=" + (_r2.error || "žiadna")) : "NULL";
        }

        // Zapíš aj do ASISTANTO Logs
        try {
            var _logLib = libByName("ASISTANTO Logs");
            if (_logLib) {
                var _log = _logLib.createEntry();
                _log.set("type", "debug");
                _log.set("date", new Date());
                _log.set("memento library", "podpisy");
                _log.set("script", "Podp.Action.DiagTG");
                _log.set("text", _lines.join("\n") + "\n\n" + _res);
            }
        } catch(x) {}

        dialog("DiagTG — Výsledok", _res, "OK");
    }
}
