/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.BeforeDelete
 * Typ:         Trigger — Before Delete
 * Verzia:      1.4.0
 * Dátum:       2026-03-23
 *
 * Účel:
 *   Pred vymazaním Podpis záznamu zmaže príslušnú Telegram správu.
 *   Spúšťa sa automaticky aj keď requestSign() volá podpisLib.trash(ep)
 *   pri znovuposielaní správy — žiadna zmena v requestSign() nie je potrebná.
 *
 * Závislosti:
 *   - MementoSign v1.9.2+ (deleteMessage)
 *
 * Polia Podpis záznamu (všetky text od 2026-03-23):
 *   "TG Chat ID"      — Telegram chat ID zamestnanca
 *   "TG Správa ID"    — Telegram message_id pôvodnej správy
 *   "TG Follow-up ID" — Telegram message_id force-reply správy (dôvod odmietnutia)
 *
 * Poznámky:
 *   - Silent fail — trigger NESMIE zabrániť vymazaniu záznamu
 *   - Chyba (napr. správa už vymazaná) sa ignoruje
 */

var SCRIPT_NAME    = "Podp.Trigger.BeforeDelete";
var SCRIPT_VERSION = "1.4.0";

var hasSign = typeof MementoSign !== 'undefined';

if (hasSign) {

var currentEntry = entry();

try {
    var sf = function(n) { try { return currentEntry.field(n); } catch(ex) { return null; } };
    var chatId     = sf("TG Chat ID");
    var messageId  = sf("TG Správa ID");
    var followupId = sf("TG Follow-up ID");

    // Silent fail — výsledok ignorujeme (správa mohla byť vymazaná manuálne)
    if (chatId && messageId)  { try { MementoSign.deleteMessage(chatId, messageId);  } catch(e) {} }
    if (chatId && followupId) { try { MementoSign.deleteMessage(chatId, followupId); } catch(e) {} }

} catch(e) {
    // Silent fail — nesmie zabrániť vymazaniu záznamu
}

} // end if (hasSign)
