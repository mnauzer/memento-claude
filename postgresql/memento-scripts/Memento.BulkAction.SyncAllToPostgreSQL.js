/**
 * Bulk Action: Sync All Entries to PostgreSQL
 *
 * Knižnica:    Universal (použiteľný v každej knižnici)
 * Názov:       Memento.BulkAction.SyncAllToPostgreSQL
 * Typ:         Bulk Action
 * Verzia:      2.0
 *
 * Popis:
 * Hromadný sync všetkých záznamov z aktuálnej knižnice do PostgreSQL.
 * Spustí sa nad vybranými záznamami alebo všetkými.
 *
 * Použitie:
 * 1. Otvor knižnicu v Memento
 * 2. Vytvor Bulk Action → Run Script
 * 3. Skopíruj tento kód
 * 4. Vyber záznamy (alebo Select All)
 * 5. Spusti akciu
 *
 * Konfigurácia:
 * - Uprav CONFIG sekciu nižšie (API URL, API key)
 *
 * Changelog v2.0:
 * - Kompletne prepísané podľa oficiálnej Memento API dokumentácie
 * - Opravené: entry properties (id, author, creationTime, lastModifiedTime)
 * - Opravené: lib() properties (name, id)
 * - Opravené: HTTP API (http().post(), result.code, result.body)
 * - Odstránené: neexistujúce funkcie (confirm(), status())
 */

(function() {
    'use strict';

    // ======================================
    // KONFIGURÁCIA
    // ======================================
    var CONFIG = {
        // PostgreSQL Sync API
        apiUrl: 'http://192.168.5.241:8889',
        apiKey: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',  // Z /opt/memento-sync/sync-api/.env

        // Nastavenia
        batchDelay: 100,        // ms medzi záznamami (throttling)
        showProgress: true,      // Zobrazovať progress správy
        continueOnError: true    // Pokračovať aj pri chybách
    };

    // ======================================
    // HELPER FUNCTIONS
    // ======================================

    /**
     * Extract entry data in sync format
     */
    function extractEntryData(e) {
        var entryData = {
            id: e.id,                           // property, nie funkcia!
            status: e.field('Status') || 'active',  // cez field(), nie status()
            createdTime: e.creationTime,        // property: creationTime
            modifiedTime: e.lastModifiedTime,   // property: lastModifiedTime
            createdBy: e.author,                // property: author
            modifiedBy: null,                   // Memento API nemá modifiedBy
            fields: {}
        };

        // Extract all fields
        var fieldNames = lib().fields();  // Vráti array of strings
        for (var i = 0; i < fieldNames.length; i++) {
            var fieldName = fieldNames[i];
            var fieldValue = e.field(fieldName);

            // Skip system fields
            if (fieldName === 'Debug_Log' || fieldName === 'Error_Log' ||
                fieldName === 'info' || fieldName === 'Sync_Status') {
                continue;
            }

            // Handle different field types
            if (fieldValue === null || fieldValue === undefined) {
                entryData.fields[fieldName] = null;
            } else if (Array.isArray(fieldValue)) {
                // Array field (linkToEntry multiple, files, etc.)
                var arrayData = [];
                for (var j = 0; j < fieldValue.length; j++) {
                    var item = fieldValue[j];
                    // If it's an entry object, get its ID
                    if (item && item.id) {
                        arrayData.push(item.id);  // property, nie funkcia!
                    } else {
                        arrayData.push(item);
                    }
                }
                entryData.fields[fieldName] = arrayData;
            } else if (fieldValue && typeof fieldValue === 'object' && fieldValue.id) {
                // Single entry reference
                entryData.fields[fieldName] = [fieldValue.id];  // property!
            } else {
                // Simple field types (text, number, boolean, date, etc.)
                entryData.fields[fieldName] = fieldValue;
            }
        }

        return entryData;
    }

    /**
     * Sync single entry to PostgreSQL
     */
    function syncEntry(e) {
        try {
            // Extract entry data
            var entryData = extractEntryData(e);

            // Build URL
            var url = CONFIG.apiUrl + '/api/memento/from-memento/' + lib().id;  // property!

            // Setup HTTP client with headers
            var httpClient = http();
            httpClient.headers({
                'Content-Type': 'application/json',
                'X-API-Key': CONFIG.apiKey
            });

            // Make HTTP POST request
            var result = httpClient.post(url, JSON.stringify(entryData));

            // Check response (result.code, nie result.status!)
            if (result && (result.code === 200 || result.code === 201)) {
                return {
                    success: true,
                    entryId: e.id  // property!
                };
            } else {
                return {
                    success: false,
                    entryId: e.id,  // property!
                    error: 'HTTP ' + (result ? result.code : 'no response'),
                    details: result ? result.body : null
                };
            }

        } catch (err) {
            return {
                success: false,
                entryId: e.id,  // property!
                error: err.message || err.toString(),
                details: err.toString()
            };
        }
    }

    /**
     * Sleep/delay function
     */
    function sleep(ms) {
        var start = new Date().getTime();
        while (new Date().getTime() < start + ms) {
            // Busy wait
        }
    }

    // ======================================
    // MAIN BULK SYNC LOGIC
    // ======================================

    // Get all entries from current library
    // Pre bulk action môže byť entries() alebo lib().entries()
    var selectedEntries;
    try {
        // Skús získať vybrané entries (ak existuje entries() funkcia pre bulk actions)
        selectedEntries = entries();
    } catch (err) {
        // Fallback: použij všetky entries z knižnice
        selectedEntries = lib().entries();
    }

    var totalEntries = selectedEntries.length;

    if (totalEntries === 0) {
        message('⚠️ Nie sú vybrané žiadne záznamy');
        exit();
    }

    // Start message
    var startMsg = '🚀 BULK SYNC DO POSTGRESQL\n\n' +
                   'Knižnica: ' + lib().name + '\n' +  // property!
                   'Záznamy: ' + totalEntries + '\n' +
                   'API: ' + CONFIG.apiUrl + '\n\n' +
                   'Začínam sync...';
    message(startMsg);

    // Progress tracking
    var stats = {
        total: totalEntries,
        success: 0,
        failed: 0,
        errors: []
    };

    var startTime = new Date();

    // Process each entry
    for (var i = 0; i < totalEntries; i++) {
        var e = selectedEntries[i];
        var entryId = e.id;  // property!

        // Show progress
        if (CONFIG.showProgress && (i % 10 === 0 || i === totalEntries - 1)) {
            var progress = ((i + 1) / totalEntries * 100).toFixed(1);
            var progressMsg = '🔄 Sync: ' + (i + 1) + '/' + totalEntries + ' (' + progress + '%)\n' +
                            '✅ Success: ' + stats.success + '\n' +
                            '❌ Failed: ' + stats.failed;
            message(progressMsg);
        }

        // Sync entry
        var result = syncEntry(e);

        if (result.success) {
            stats.success++;
        } else {
            stats.failed++;
            stats.errors.push({
                entryId: entryId,
                error: result.error,
                details: result.details
            });

            // Stop on error if configured
            if (!CONFIG.continueOnError) {
                message('❌ Sync failed for entry: ' + entryId + '\n' + result.error);
                exit();
            }
        }

        // Throttling delay
        if (CONFIG.batchDelay > 0 && i < totalEntries - 1) {
            sleep(CONFIG.batchDelay);
        }
    }

    var endTime = new Date();
    var durationSec = (endTime - startTime) / 1000;
    var durationMin = (durationSec / 60).toFixed(1);

    // Final summary
    var summary = '═══════════════════════════════\n' +
                  '✅ BULK SYNC DOKONČENÝ\n' +
                  '═══════════════════════════════\n\n' +
                  '📊 ŠTATISTIKA:\n' +
                  '  Celkom:     ' + stats.total + '\n' +
                  '  Úspešných:  ' + stats.success + ' ✅\n' +
                  '  Zlyhalo:    ' + stats.failed + ' ❌\n' +
                  '  Trvanie:    ' + durationMin + ' min\n\n' +
                  '📚 Knižnica:  ' + lib().name + '\n' +  // property!
                  '🆔 Library ID: ' + lib().id + '\n\n';  // property!

    // Add error details if any
    if (stats.failed > 0) {
        summary += '⚠️ CHYBY (prvých 5):\n';
        var errorLimit = Math.min(5, stats.errors.length);
        for (var j = 0; j < errorLimit; j++) {
            var err = stats.errors[j];
            summary += '  • ' + err.entryId + ': ' + err.error + '\n';
        }
        if (stats.errors.length > 5) {
            summary += '  ... a ďalších ' + (stats.errors.length - 5) + ' chýb\n';
        }
        summary += '\n';
    }

    summary += '═══════════════════════════════\n\n';

    if (stats.failed === 0) {
        summary += '🎉 Všetky záznamy úspešne syncované!';
    } else {
        summary += '⚠️ Niektoré záznamy zlyhali. Skontroluj API logy:\n' +
                   'ssh rasto@reddwarf\n' +
                   'sudo journalctl -u memento-sync-api -n 50';
    }

    message(summary);

    // Log to debug field if available
    try {
        var debugLog = 'Bulk sync: ' + stats.success + '/' + stats.total + ' entries synced';
        var firstEntry = selectedEntries[0];
        var existingLog = firstEntry.field('Debug_Log') || '';
        firstEntry.set('Debug_Log', debugLog + '\n' + existingLog);
    } catch (err) {
        // Ignore if Debug_Log doesn't exist
    }

})();
