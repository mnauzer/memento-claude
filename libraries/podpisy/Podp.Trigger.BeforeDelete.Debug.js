/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.BeforeDelete.Debug
 * Typ:         Trigger — Before Delete (DEBUG verzia)
 * Verzia:      1.0.0
 * Dátum:       2026-03-23
 *
 * Účel:
 *   Debug verzia BeforeDelete triggera — zobrazuje výsledok cez message().
 *   Po odladení nahraď produkčnou verziou Podp.Trigger.BeforeDelete.js
 *
 * Závislosti:
 *   - MementoSign v1.9.0+
 */

var hasSign = typeof MementoSign !== 'undefined';

if (!hasSign) {
    message("ERR: chyba MementoSign");
} else {
    var chatId    = entry().field("TG Chat ID");
    var messageId = entry().field("TG Správa ID");

    if (!chatId || !messageId) {
        message("WARN: chatId=" + chatId + " msgId=" + messageId);
    } else {
        var result = MementoSign.deleteMessage(chatId, messageId);
        message(result.success ? "OK: TG zmazane" : "ERR: " + result.error);
    }
}
