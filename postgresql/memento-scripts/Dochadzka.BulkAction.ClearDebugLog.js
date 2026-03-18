/**
 * Bulk Action: Clear Debug_Log Field from All Entries
 *
 * Knižnica:    Dochádzka (Attendance) - ale funguje pre akúkoľvek knižnicu
 * Verzia:      1.0
 * Účel:        Vymaže Debug_Log pole zo všetkých záznamov aby sa zabránilo SQLiteBlobTooBigException
 *
 * POUŽITIE:
 * 1. Otvor knižnicu cez tri bodky (aj keď crashuje)
 * 2. Spravovať scripty → Nový Bulk Action
 * 3. Skopíruj tento kód
 * 4. Spusti na všetkých záznamoch
 * 5. Debug_Log bude vymazaný a knižnica sa bude dať otvoriť
 *
 * POZNÁMKA:
 * Tento script je emergency fix pre SQLiteBlobTooBigException.
 * Po vyčistení použite sync script v3.3+ ktorý limituje veľkosť logu.
 */

(function() {
    'use strict';

    var entries;
    try {
        entries = lib().entries();
    } catch (err) {
        message('❌ Chyba: ' + err.toString());
        exit();
    }

    var totalEntries = entries.length;

    if (totalEntries === 0) {
        message('⚠️ Žiadne záznamy');
        exit();
    }

    message('🧹 Čistím Debug_Log z ' + totalEntries + ' záznamov...');

    var cleared = 0;
    var errors = 0;

    for (var i = 0; i < totalEntries; i++) {
        try {
            entries[i].set('Debug_Log', '');
            cleared++;

            // Show progress every 10 entries
            if (cleared % 10 === 0 || i === totalEntries - 1) {
                message('🔄 ' + (i + 1) + '/' + totalEntries + ' - ✅ ' + cleared);
            }
        } catch (e) {
            errors++;
            log('❌ Error clearing entry ' + i + ': ' + e.toString());
        }
    }

    var summary = '✅ Hotovo!\n' +
                  'Vyčistené: ' + cleared + '\n' +
                  'Chyby: ' + errors + '\n' +
                  'Celkom: ' + totalEntries;

    message(summary);
    log(summary);
})();
