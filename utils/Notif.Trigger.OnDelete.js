/**
 * Knižnica:    Notifications
 * Názov:       Notif.Trigger.OnDelete
 * Typ:         Trigger — After Deleting an Entry
 * Verzia:      10.0
 * Dátum:       2026-03-24
 *
 * Účel:
 *   Po zmazaní záznamu z knižnice Notifications vymaže príslušnú TG správu.
 *
 * DÔLEŽITÉ — trigger typ v Memento UI:
 *   Nastav na "After Deleting an Entry" (NIE "Deleting an Entry")!
 *   AfterDelete = async kontext = http() FUNGUJE.
 *   BeforeDelete = sync kontext = http() NEFUNGUJE (príčina bugov v9.x).
 *
 * Podmienky pre vymazanie:
 *   - Status záznamu = "Odoslané" (správa bola odoslaná do TG)
 *   - chatId + messageId existujú
 *
 * Závislosti:
 *   - MementoTelegram (core/MementoTelegram.js)
 *   - MementoUtils (core/MementoUtils.js)
 *
 * CHANGELOG:
 *   v10.0 (2026-03-24) — REFACTOR: trigger AfterDelete, priame volanie TG, odstránené logEntry overrides
 *   v9.1  (2024-12)    — Použitie štandardných MementoUtils funkcií [DEPRECATED — BeforeDelete bug]
 */

if (typeof MementoTelegram === 'undefined' || typeof MementoUtils === 'undefined') {
    // Moduly nie sú načítané — delete záznamu pokračuje normálne
} else {

    var _notif  = entry();
    var _status = '';
    var _chatId = '';
    var _msgId  = '';

    try { _status = String(_notif.field('Status') || '').trim(); } catch(e) {}
    try { _chatId = String(_notif.field(MementoUtils.config.fields.notifications.chatId) || '').trim(); } catch(e) {}
    try { _msgId  = String(_notif.field(MementoUtils.config.fields.notifications.messageId) || '').trim(); } catch(e) {}

    // Iba ak bola správa skutočne odoslaná a máme TG identifikátory
    if (_status === 'Odoslané' && _chatId && _msgId) {
        MementoTelegram.deleteTelegramMessage(_chatId, _msgId);
        // Tichý fail — ak TG správa už neexistuje, delete záznamu pokračuje normálne
    }
}
