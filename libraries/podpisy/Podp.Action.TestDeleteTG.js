/**
 * Knižnica:    podpisy
 * Názov:       Podp.Action.TestDeleteTG
 * Typ:         Action — manuálny test mazania TG správy
 * Verzia:      2.0.0
 * Dátum:       2026-03-23
 *
 * Účel:
 *   Kompletná diagnostika TG mazania — zobrazí v dialógu:
 *   1. Či je MementoSign načítaný + verzia
 *   2. Aký bot token _getBotToken() vracia (prvých 10 znakov)
 *   3. Hodnoty chatId / messageId / followupId
 *   4. Výsledok deleteMessage() s presným errorom
 *   Záznam sa NEVYMAŽE — len TG správa.
 *
 * Závislosti:
 *   - MementoSign v1.9.2+
 */

// ⚠️ dialog() len na top-leveli, žiadny 'use strict'

if (typeof MementoSign === 'undefined') {
    dialog("❌ Test DeleteTG", "MementoSign NIE JE načítaný!\n\nSkontroluj či je modul importovaný v nastaveniach knižnice podpisy.", "OK");
} else {

    var e = entry();
    var sf = function(n) { try { return e.field(n); } catch(ex) { return null; } };

    // 1. Verzia MementoSign
    var signVer = "(neznáma)";
    try {
        if (MementoSign.MODULE_INFO) signVer = MementoSign.MODULE_INFO.version;
        else if (MementoSign.version) signVer = MementoSign.version;
    } catch(ex) {}

    // 2. Bot token test
    var tokenInfo = "(nedostupné)";
    try {
        if (typeof MementoSign._getBotToken === 'function') {
            var tok = MementoSign._getBotToken();
            if (tok) {
                tokenInfo = tok.substring(0, 10) + "... (" + tok.length + " znakov)";
            } else {
                tokenInfo = "NULL — token nenájdený!";
            }
        } else {
            tokenInfo = "_getBotToken nie je public";
        }
    } catch(ex) {
        tokenInfo = "EXCEPTION: " + ex;
    }

    // 3. Hodnoty polí
    var chatId     = sf("TG Chat ID");
    var messageId  = sf("TG Správa ID");
    var followupId = sf("TG Follow-up ID");
    var stav       = sf("Stav");

    var info = "=== DIAGNOSTIKA ===\n"
        + "MementoSign: v" + signVer + "\n"
        + "Bot token: " + tokenInfo + "\n"
        + "\n=== POLIA ZÁZNAMU ===\n"
        + "Stav:       [" + stav + "]\n"
        + "chatId:     [" + chatId + "]\n"
        + "messageId:  [" + messageId + "]\n"
        + "followupId: [" + (followupId || "") + "]";

    if (!chatId || !messageId) {
        dialog("Test DeleteTG", info + "\n\n⚠️ chatId alebo messageId je prázdne — nič sa neodošle.", "OK");
    } else {

        var confirmed = dialog("Test DeleteTG", info + "\n\nOdoslať deleteMessage?", "Odoslať", "Zrušiť");

        if (confirmed === 0) {
            var r1 = null;
            var r1err = null;
            try {
                r1 = MementoSign.deleteMessage(chatId, messageId);
            } catch(ex) {
                r1err = ex.toString();
            }

            var r2 = null;
            var r2err = null;
            if (followupId) {
                try {
                    r2 = MementoSign.deleteMessage(chatId, followupId);
                } catch(ex) {
                    r2err = ex.toString();
                }
            }

            var result = "=== VÝSLEDKY ===\n"
                + "\n--- TG Správa ID [" + messageId + "] ---\n"
                + (r1err ? "EXCEPTION: " + r1err : "success: " + (r1 ? r1.success : "null") + "\nerror:   " + (r1 ? (r1.error || "—") : "null"));

            if (followupId) {
                result += "\n\n--- TG Follow-up ID [" + followupId + "] ---\n"
                    + (r2err ? "EXCEPTION: " + r2err : "success: " + (r2 ? r2.success : "null") + "\nerror:   " + (r2 ? (r2.error || "—") : "null"));
            }

            // Zapíš výsledok aj do Debug_Log
            try { e.set("Debug_Log", info + "\n\n" + result); } catch(ex) {}

            dialog("Test DeleteTG — Výsledok", result, "OK");
        }
    }

} // end if MementoSign
