/**
 * Knižnica:    podpisy
 * Názov:       Podp.BulkAction.DeleteWithTG
 * Typ:         Bulk Action — vymazanie označených záznamov
 * Verzia:      1.5.0
 * Dátum:       2026-03-23
 *
 * Účel:
 *   Vymaže označené Podpis záznamy vrátane ich TG správ.
 *   TG správy sa mažú explicitne pred trash() — BeforeDelete trigger
 *   nemusí byť spoľahlivý pri bulk operáciách.
 *
 * Ochrana:
 *   Záznamy v stave "Čaká" mladšie ako 1 hodinu sú označené ako nebezpečné
 *   a zobrazené v potvrdzovacom dialógu. Napriek tomu je ich vymazanie POVOLENÉ
 *   (zodpovednosť je na používateľovi pri bulk operácii).
 *
 * Závislosti:
 *   - MementoSign v1.9.2+
 *
 * Polia Podpis záznamu (text od 2026-03-23):
 *   "Stav"            — stav záznamu
 *   "Dátum odoslania" — dátum odoslania (na kontrolu veku)
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

        // Zisti "Čaká" záznamy mladšie ako 1 hodina
        var oneHour = 60 * 60 * 1000;
        var now = new Date();
        var freshCakaCount = 0;

        for (var i = 0; i < count; i++) {
            var e = selectedEntries[i];
            try {
                var stav = e.field("Stav");
                if (stav && String(stav).trim() === "Čaká") {
                    var datumOdoslania = e.field("Dátum odoslania");
                    if (datumOdoslania) {
                        var ageMs = now - new Date(datumOdoslania);
                        if (ageMs < oneHour) freshCakaCount++;
                    }
                }
            } catch(ex) {}
        }

        var confirmMsg = "Vymazať " + count + " " + (count === 1 ? "podpis" : "podpisov") + " vrátane TG správ?";
        if (freshCakaCount > 0) {
            confirmMsg += "\n\n⚠️ POZOR: " + freshCakaCount + " záznam" +
                (freshCakaCount === 1 ? "" : "ov") +
                " je v stave 'Čaká' a mladší ako 1 hodina.\nMôžu byť stále spracovávané!";
        }

        var confirmed = false;
        dialog()
            .title("Vymazať podpisy")
            .text(confirmMsg)
            .positiveButton("Vymazať", function() { confirmed = true; return true; })
            .negativeButton("Zrušiť", function() { return true; })
            .show();

        if (confirmed) {
            var deleted   = 0;
            var tgDeleted = 0;
            var errors    = 0;

            for (var j = 0; j < count; j++) {
                var ep = selectedEntries[j];
                try {
                    var sf = function(n) { try { return ep.field(n); } catch(ex) { return null; } };
                    var chatId     = sf("TG Chat ID");
                    var messageId  = sf("TG Správa ID");
                    var followupId = sf("TG Follow-up ID");

                    if (chatId && messageId) {
                        var r1 = MementoSign.deleteMessage(chatId, messageId);
                        if (r1 && r1.success) tgDeleted++;
                    }
                    if (chatId && followupId) {
                        var r2 = MementoSign.deleteMessage(chatId, followupId);
                        if (r2 && r2.success) tgDeleted++;
                    }

                    ep.trash();
                    deleted++;

                } catch(err) {
                    errors++;
                }
            }

            var msg = "Vymazaných: " + deleted + " / " + count;
            if (tgDeleted > 0) msg += "\nTG správy: " + tgDeleted;
            if (errors > 0)    msg += "\nChýb: " + errors;
            dialog().title("Hotovo").text(msg).positiveButton("OK", function() { return true; }).show();
        }

    }

} // end if MementoSign
