/**
 * Knižnica:    podpisy
 * Názov:       Podp.Action.TestDeleteTG
 * Typ:         Action — manuálny test mazania TG správy
 * Verzia:      2.1.0
 * Dátum:       2026-03-23
 *
 * Účel:
 *   Kompletná diagnostika TG mazania — zobrazí v dialógu:
 *   1. Či je MementoSign načítaný + verzia
 *   2. Hodnoty chatId / messageId / followupId
 *   3. Výsledok deleteMessage() s presným errorom
 *   Záznam sa NEVYMAŽE — len TG správa.
 *
 * Závislosti:
 *   - MementoSign v1.9.2+
 */

if (typeof MementoSign === 'undefined') {
    dialog().title("Chyba").text("MementoSign NIE JE načítaný!\n\nSkontroluj či je modul importovaný v nastaveniach knižnice podpisy.").positiveButton("OK", function() { return true; }).show();
} else {

    var e = entry();
    var sf = function(n) { try { return e.field(n); } catch(ex) { return null; } };

    var signVer = "(neznáma)";
    try {
        if (MementoSign.version) signVer = MementoSign.version;
    } catch(ex) {}

    var chatId     = sf("TG Chat ID");
    var messageId  = sf("TG Správa ID");
    var followupId = sf("TG Follow-up ID");
    var stav       = sf("Stav");

    var info = "=== DIAGNOSTIKA ===\n"
        + "MementoSign: v" + signVer + "\n"
        + "\n=== POLIA ZÁZNAMU ===\n"
        + "Stav:       [" + stav + "]\n"
        + "chatId:     [" + chatId + "]\n"
        + "messageId:  [" + messageId + "]\n"
        + "followupId: [" + (followupId || "") + "]";

    if (!chatId || !messageId) {
        dialog().title("Test DeleteTG").text(info + "\n\nchatId alebo messageId je prázdne.").positiveButton("OK", function() { return true; }).show();
    } else {

        var doDelete = false;
        dialog()
            .title("Test DeleteTG")
            .text(info + "\n\nOdoslať deleteMessage?")
            .positiveButton("Odoslať", function() { doDelete = true; return true; })
            .negativeButton("Zrušiť", function() { return true; })
            .show();

        if (doDelete) {
            var r1 = null;
            try {
                r1 = MementoSign.deleteMessage(chatId, messageId);
            } catch(ex) {
                r1 = { success: false, error: "EXCEPTION: " + ex };
            }

            var result = "=== VÝSLEDKY ===\n"
                + "\nTG Správa ID [" + messageId + "]:\n"
                + "success: " + (r1 ? r1.success : "null") + "\n"
                + "error:   " + (r1 ? (r1.error || "žiadna") : "null");

            if (followupId) {
                var r2 = null;
                try {
                    r2 = MementoSign.deleteMessage(chatId, followupId);
                } catch(ex) {
                    r2 = { success: false, error: "EXCEPTION: " + ex };
                }
                result += "\n\nTG Follow-up ID [" + followupId + "]:\n"
                    + "success: " + (r2 ? r2.success : "null") + "\n"
                    + "error:   " + (r2 ? (r2.error || "žiadna") : "null");
            }

            try { e.set("Debug_Log", info + "\n\n" + result); } catch(ex) {}

            dialog().title("Test DeleteTG — Výsledok").text(result).positiveButton("OK", function() { return true; }).show();
        }
    }

}
