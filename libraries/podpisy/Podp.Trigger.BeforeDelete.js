/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.BeforeDelete
 * Typ:         Trigger — Before Delete
 * Verzia:      1.2.0
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
 *   "Zamestnanec"     — link na Zamestnanec záznam (má "Telegram ID" = chatId)
 *   "TG Chat ID"      — fallback chatId (int pole — overflow pre veľké Telegram ID!)
 *   "TG Správa ID"    — Telegram message_id pôvodnej správy
 *   "TG Follow-up ID" — Telegram message_id force-reply správy (dôvod odmietnutia)
 *
 * Poznámky:
 *   - chatId čítame z Zamestnanec.Telegram ID (text pole, bez overflow)
 *   - Silent fail — trigger NESMIE zabrániť vymazaniu záznamu
 *   - Chyba (napr. správa už vymazaná) sa ignoruje
 */

var SCRIPT_NAME    = "Podp.Trigger.BeforeDelete";
var SCRIPT_VERSION = "1.2.0";

var hasSign = typeof MementoSign !== 'undefined';

if (hasSign) {

var currentEntry = entry();

try {
    var sf = function(n) { try { return currentEntry.field(n); } catch(ex) { return null; } };

    // chatId z Zamestnanec.Telegram ID — text pole, bez int32 overflow
    var chatId = null;
    try {
        var zamList = currentEntry.field("Zamestnanec");
        if (zamList && zamList.length > 0) {
            chatId = String(zamList[0].field("Telegram ID") || '');
        }
    } catch(e) {}
    if (!chatId) chatId = String(sf("TG Chat ID") || ''); // fallback

    var messageId   = sf("TG Správa ID");
    var followupId  = sf("TG Follow-up ID");

    // Silent fail — výsledok ignorujeme (správa mohla byť vymazaná manuálne)
    if (chatId && messageId)  { try { MementoSign.deleteMessage(chatId, messageId);  } catch(e) {} }
    if (chatId && followupId) { try { MementoSign.deleteMessage(chatId, followupId); } catch(e) {} }

} catch(e) {
    // Silent fail — nesmie zabrániť vymazaniu záznamu
}

} // end if (hasSign)
