/**
 * Knižnica:    podpisy
 * Názov:       Podp.Trigger.AfterDelete
 * Typ:         Trigger — After Deleting an Entry (asynchronous)
 * Verzia:      1.0.0
 * Dátum:       2026-03-25
 *
 * Účel:
 *   Po zmazaní záznamu podpisu vymaže príslušnú TG správu priamo cez Bot API.
 *   AfterDelete = async kontext = http() FUNGUJE.
 *
 * Prečo AfterDelete (nie BeforeDelete):
 *   BeforeDelete = synchronous = http() NEFUNGUJE.
 *   Pole "TG Správa ID" (id=23) je novšie pole — v BeforeDelete môže
 *   hádzať ReferenceError cez entry().field(). AfterDelete má plný prístup.
 *
 * Závislosti: MementoSign (core/MementoSign.js)
 *
 * CHANGELOG:
 *   v1.0.0 (2026-03-25) — INIT: direct TG delete via MementoSign.deleteMessage()
 *                          Nahrádza nespoľahlivú BeforeDelete → NotificationHub cestu
 */

if (typeof MementoSign !== 'undefined') {

    var _podpis     = entry();
    var _chatId     = '';
    var _msgId      = '';
    var _followupId = '';

    try { _chatId     = String(_podpis.field('TG Chat ID')      || '').trim(); } catch(e) {}
    try { _msgId      = String(_podpis.field('TG Správa ID')    || '').trim(); } catch(e) {}
    try { _followupId = String(_podpis.field('TG Follow-up ID') || '').trim(); } catch(e) {}

    // Zmaž hlavnú TG správu
    if (_chatId && _msgId) {
        MementoSign.deleteMessage(_chatId, _msgId);
        // Tichý fail — ak TG správa už neexistuje, je to v poriadku
    }

    // Zmaž follow-up správu (ak existuje)
    if (_chatId && _followupId) {
        MementoSign.deleteMessage(_chatId, _followupId);
    }

}
