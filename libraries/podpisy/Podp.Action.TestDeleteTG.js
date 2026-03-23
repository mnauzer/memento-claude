/**
 * Knižnica:    podpisy
 * Názov:       Podp.Action.TestDeleteTG
 * Typ:         Action — manuálny test mazania TG správy
 * Verzia:      1.0.0
 * Dátum:       2026-03-23
 *
 * Účel:
 *   Testovací script — zmaže TG správu aktuálneho záznamu a zobrazí
 *   výsledok v dialógu (vrátane presného error message).
 *   Záznam sa NEVYMAŽE — len TG správa.
 *
 * Závislosti:
 *   - MementoSign v1.9.1+
 */

// ⚠️ dialog() len na top-leveli, žiadny 'use strict'

if (typeof MementoSign === 'undefined') {
    dialog("Chyba", "❌ MementoSign nie je načítaný!", "OK");
} else {

    var e = entry();
    var chatId     = e.field("TG Chat ID");
    var messageId  = e.field("TG Správa ID");
    var followupId = e.field("TG Follow-up ID");

    var info = "chatId:     " + chatId
             + "\nmessageId:  " + messageId
             + "\nfollowupId: " + (followupId || "(prázdne)");

    if (!chatId || !messageId) {
        dialog("Test DeleteTG", info + "\n\n⚠️ chatId alebo messageId je prázdne — nič sa neodošle.", "OK");
    } else {

        var r1 = MementoSign.deleteMessage(chatId, messageId);
        var r2 = followupId ? MementoSign.deleteMessage(chatId, followupId) : null;

        var result = info
            + "\n\n--- TG Správa ID ---"
            + "\nsuccess: " + (r1 ? r1.success : "null")
            + "\nerror:   " + (r1 ? (r1.error || "—") : "null");

        if (r2) {
            result += "\n\n--- TG Follow-up ID ---"
                    + "\nsuccess: " + r2.success
                    + "\nerror:   " + (r2.error || "—");
        }

        dialog("Test DeleteTG", result, "OK");
    }

} // end if MementoSign
