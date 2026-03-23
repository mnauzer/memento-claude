/**
 * Knižnica:    podpisy
 * Názov:       Podp.BulkAction.DeleteWithTG
 * Typ:         Bulk Action — vymazanie označených záznamov
 * Verzia:      1.2.0
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
            var debugLines = [];  // DEBUG — odstráň po odladení

            for (var i = 0; i < count; i++) {
                var e = selectedEntries[i];
                try {
                    // chatId z Zamestnanec.Telegram ID (text pole, bez int32 overflow)
                    var chatId = null;
                    try {
                        var zamList = e.field("Zamestnanec");
                        if (zamList && zamList.length > 0) {
                            chatId = String(zamList[0].field("Telegram ID") || '');
                        }
                    } catch(ex2) {}
                    if (!chatId) { try { chatId = String(e.field("TG Chat ID") || ''); } catch(ex3) {} }

                    var messageId  = null; try { messageId  = e.field("TG Správa ID");    } catch(ex4) {}
                    var followupId = null; try { followupId = e.field("TG Follow-up ID"); } catch(ex5) {}

                    // DEBUG — pridaj info o prvom zázname
                    if (i === 0) {
                        debugLines.push("chatId=" + chatId + " msgId=" + messageId + " followup=" + followupId);
                    }

                    if (chatId && messageId) {
                        var tgResult = MementoSign.deleteMessage(chatId, messageId);
                        if (tgResult && tgResult.success) {
                            tgDeleted++;
                        } else {
                            debugLines.push("ERR main: " + (tgResult ? tgResult.error : "null"));
                        }
                    }
                    if (chatId && followupId) {
                        var tgR2 = MementoSign.deleteMessage(chatId, followupId);
                        if (tgR2 && tgR2.success) tgDeleted++;
                        else debugLines.push("ERR followup: " + (tgR2 ? tgR2.error : "null"));
                    }

                    e.trash();
                    deleted++;

                } catch(err) {
                    errors++;
                    debugLines.push("EXC: " + err.toString());
                }
            }

            var msg = "Vymazaných: " + deleted + " / " + count;
            if (tgDeleted > 0) msg += "\nTG správy: " + tgDeleted;
            if (errors > 0)    msg += "\nChýb: " + errors;
            if (debugLines.length > 0) msg += "\n\nDEBUG:\n" + debugLines.join("\n");
            dialog("Hotovo", msg, "OK");
        }

    }

} // end if MementoSign
