/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.BeforeDelete
 * Typ:         Trigger — Before Delete
 * Verzia:      1.0.0
 * Dátum:       2026-03-23
 *
 * Účel:
 *   Pred vymazaním Podpis záznamu zmaže príslušnú Telegram správu.
 *   Spúšťa sa automaticky aj keď requestSign() volá podpisLib.trash(ep)
 *   pri znovuposielaní správy — žiadna zmena v requestSign() nie je potrebná.
 *
 * Závislosti:
 *   - MementoSign v1.9.0+ (deleteMessage)
 *
 * Polia Podpis záznamu:
 *   "TG Chat ID"    — Telegram chat ID zamestnanca
 *   "TG Správa ID"  — Telegram message_id správy
 *
 * Poznámky:
 *   - Silent fail — trigger NESMIE zabrániť vymazaniu záznamu
 *   - Chyba (napr. správa už vymazaná) sa ignoruje
 */

var SCRIPT_NAME    = "Podp.Trigger.BeforeDelete";
var SCRIPT_VERSION = "1.0.0";

var hasSign = typeof MementoSign !== 'undefined';

if (hasSign) {

var currentEntry = entry();

try {
    var chatId    = currentEntry.field("TG Chat ID");
    var messageId = currentEntry.field("TG Správa ID");

    if (chatId && messageId) {
        // Silent fail — výsledok ignorujeme (správa mohla byť vymazaná manuálne)
        try { MementoSign.deleteMessage(chatId, messageId); } catch(e) {}
    }

} catch(e) {
    // Silent fail — nesmie zabrániť vymazaniu záznamu
}

} // end if (hasSign)
