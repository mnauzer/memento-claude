/**
 * Knižnica:    podpisy
 * Názov:       Podp.BulkAction.DeleteWithTG
 * Typ:         Bulk Action — vymazanie označených záznamov
 * Verzia:      1.1.0
 * Dátum:       2026-03-23
 *
 * Účel:
 *   Vymaže označené Podpis záznamy vrátane ich TG správ.
 *   TG správy sa mažú explicitne pred trash() — BeforeDelete trigger
 *   nemusí byť spoľahlivý pri bulk operáciách.
 *
 * Závislosti:
 *   - MementoSign v1.9.0+
 *
 * Polia Podpis záznamu:
 *   "TG Chat ID"      — Telegram chat ID zamestnanca
 *   "TG Správa ID"    — Telegram message_id pôvodnej správy
 *   "TG Follow-up ID" — Telegram message_id force-reply správy
 */

// ⚠️ KRITICKÉ: dialog() funguje len na top-leveli action/bulkAction scriptu!
// Žiadny 'use strict'

if (typeof MementoSign === 'undefined') {
    message("❌ Chýba MementoSign!");
} else {

    var selectedEntries = entries();
    var count = selectedEntries ? selectedEntries.length : 0;

    if (count === 0) {
        message("Žiadne záznamy nie sú označené.");
    } else {

        var confirmed = dialog(
            "Vymazať podpisy",
            "Vymazať " + count + " " + (count === 1 ? "podpis" : "podpisov") + " vrátane TG správ?",
            "Vymazať", "Zrušiť"
        );

        if (confirmed === 0) {
            var deleted = 0;
            var tgDeleted = 0;
            var errors = 0;

            for (var i = 0; i < count; i++) {
                var e = selectedEntries[i];
                try {
                    // Vymaž TG správy (silent fail — mohli byť už vymazané)
                    try {
                        var chatId     = e.field("TG Chat ID");
                        var messageId  = e.field("TG Správa ID");
                        var followupId = e.field("TG Follow-up ID");
                        if (chatId && messageId) {
                            var tgResult = MementoSign.deleteMessage(chatId, messageId);
                            if (tgResult && tgResult.success) tgDeleted++;
                        }
                        if (chatId && followupId) {
                            MementoSign.deleteMessage(chatId, followupId);
                        }
                    } catch(tgErr) {}

                    // Vymaž záznam
                    e.trash();
                    deleted++;

                } catch(err) {
                    errors++;
                }
            }

            var msg = "Vymazaných: " + deleted + " / " + count;
            if (tgDeleted > 0) msg += "\nTG správy: " + tgDeleted;
            if (errors > 0)    msg += "\nChýb: " + errors;
            dialog("Hotovo", msg, "OK");
        }

    }

} // end if MementoSign
