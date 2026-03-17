/**
 * Bulk Action: Sync All Dochádzka Entries to PostgreSQL
 *
 * Knižnica:    Dochádzka
 * Verzia:      2.3 (FIXED - správne Library ID)
 *
 * Zmeny v2.3:
 * - OPRAVENÉ: Používa public API library ID (qU4Br5hU6) namiesto internal ID
 * - Poznámka: lib().id vracia internal ID, ale API potrebuje public ID
 * - Bezpečné field() volania s try/catch
 */

(function() {
    'use strict';

    // ======================================
    // KONFIGURÁCIA
    // ======================================
    var CONFIG = {
        apiUrl: 'http://192.168.5.241:8889',
        apiKey: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',

        // DÔLEŽITÉ: lib().id vracia internal ID (napr. "EIL-cPe57cbZ;d:DK4vC")
        // ale sync API potrebuje public API ID z Memento REST API
        libraryId: 'qU4Br5hU6',  // Dochádzka - Public API ID
        libraryName: 'Dochádzka',

        batchDelay: 100,
        showProgress: true,
        continueOnError: true
    };

    log('=== BULK SYNC START ===');
    log('Library: ' + CONFIG.libraryName);
    log('Library ID (Public API): ' + CONFIG.libraryId);

    // ======================================
    // SAFE FIELD ACCESS
    // ======================================

    function safeGetField(entry, fieldName) {
        try {
            return entry.field(fieldName);
        } catch (e) {
            return null;
        }
    }

    // ======================================
    // TEST CONNECTION
    // ======================================

    function testConnection() {
        log('Testing API connection...');
        try {
            var httpClient = http();
            var result = httpClient.get(CONFIG.apiUrl + '/api/memento/health');

            if (result.code === 200) {
                log('✅ API reachable');
                return true;
            }
            log('❌ API returned: ' + result.code);
            return false;
        } catch (err) {
            log('❌ Connection test failed: ' + err.toString());
            return false;
        }
    }

    if (!testConnection()) {
        message('❌ API nedostupné!');
        exit();
    }

    // ======================================
    // EXTRACT ENTRY DATA
    // ======================================

    function extractEntryData(e) {
        try {
            var entryData = {
                id: e.id,
                status: 'active',  // Default hodnota, nie z poľa!
                createdTime: e.creationTime,
                modifiedTime: e.lastModifiedTime,
                createdBy: e.author,
                modifiedBy: null,
                fields: {}
            };

            var fieldNames = lib().fields();

            for (var i = 0; i < fieldNames.length; i++) {
                var fieldName = fieldNames[i];

                // Skip system fields
                if (fieldName === 'Debug_Log' || fieldName === 'Error_Log' ||
                    fieldName === 'info' || fieldName === 'Sync_Status') {
                    continue;
                }

                var fieldValue = safeGetField(e, fieldName);

                if (fieldValue === null || fieldValue === undefined) {
                    entryData.fields[fieldName] = null;
                } else if (Array.isArray(fieldValue)) {
                    var arrayData = [];
                    for (var j = 0; j < fieldValue.length; j++) {
                        var item = fieldValue[j];
                        if (item && item.id) {
                            arrayData.push(item.id);
                        } else {
                            arrayData.push(item);
                        }
                    }
                    entryData.fields[fieldName] = arrayData;
                } else if (fieldValue && typeof fieldValue === 'object' && fieldValue.id) {
                    entryData.fields[fieldName] = [fieldValue.id];
                } else {
                    entryData.fields[fieldName] = fieldValue;
                }
            }

            return entryData;
        } catch (err) {
            log('❌ Extract error: ' + err.toString());
            throw err;
        }
    }

    // ======================================
    // SYNC ENTRY
    // ======================================

    function syncEntry(e) {
        try {
            var entryData = extractEntryData(e);

            // Používame hardcoded public API ID, nie lib().id (ktoré vracia internal ID)
            var url = CONFIG.apiUrl + '/api/memento/from-memento/' + CONFIG.libraryId;

            var httpClient = http();
            httpClient.headers({
                'Content-Type': 'application/json',
                'X-API-Key': CONFIG.apiKey
            });

            var result = httpClient.post(url, JSON.stringify(entryData));

            if (result && (result.code === 200 || result.code === 201)) {
                return { success: true, entryId: e.id };
            } else {
                log('❌ Sync failed: ' + result.code + ' - ' + result.body);
                return {
                    success: false,
                    entryId: e.id,
                    error: 'HTTP ' + result.code,
                    details: result.body
                };
            }
        } catch (err) {
            log('❌ Sync exception: ' + err.toString());
            return {
                success: false,
                entryId: e.id,
                error: err.toString()
            };
        }
    }

    // ======================================
    // MAIN
    // ======================================

    var selectedEntries;
    try {
        selectedEntries = entries();
    } catch (err) {
        selectedEntries = lib().entries();
    }

    var totalEntries = selectedEntries.length;

    if (totalEntries === 0) {
        message('⚠️ Žiadne záznamy');
        exit();
    }

    log('Syncing ' + totalEntries + ' entries...');
    message('🚀 Syncujem ' + totalEntries + ' záznamov...');

    var stats = {
        total: totalEntries,
        success: 0,
        failed: 0,
        errors: []
    };

    var startTime = new Date();

    for (var i = 0; i < totalEntries; i++) {
        var e = selectedEntries[i];

        if (i % 5 === 0 || i === totalEntries - 1) {
            message('🔄 ' + (i + 1) + '/' + totalEntries + ' - ✅ ' + stats.success + ' ❌ ' + stats.failed);
        }

        var result = syncEntry(e);

        if (result.success) {
            stats.success++;
            log('✅ ' + e.id);
        } else {
            stats.failed++;
            stats.errors.push(result);
            log('❌ ' + e.id + ': ' + result.error);

            if (!CONFIG.continueOnError) {
                break;
            }
        }

        if (CONFIG.batchDelay > 0 && i < totalEntries - 1) {
            var start = new Date().getTime();
            while (new Date().getTime() < start + CONFIG.batchDelay) {}
        }
    }

    var endTime = new Date();
    var durationSec = (endTime - startTime) / 1000;

    // ======================================
    // RESULTS
    // ======================================

    var summary = '═══ BULK SYNC ═══\n' +
                  'Knižnica: ' + CONFIG.libraryName + '\n' +
                  'Celkom: ' + stats.total + '\n' +
                  '✅ Úspešných: ' + stats.success + '\n' +
                  '❌ Zlyhalo: ' + stats.failed + '\n' +
                  'Čas: ' + durationSec.toFixed(1) + 's\n';

    if (stats.failed > 0 && stats.errors.length > 0) {
        summary += '\n⚠️ PRVÉ 3 CHYBY:\n';
        var limit = Math.min(3, stats.errors.length);
        for (var j = 0; j < limit; j++) {
            var err = stats.errors[j];
            summary += '• ' + err.entryId + ': ' + err.error + '\n';
        }
    }

    summary += '═══════════════';

    log(summary);

    var msg = '✅ ' + stats.success + '/' + stats.total;
    if (stats.failed > 0) {
        msg += ' (❌ ' + stats.failed + ' zlyhalo)';
    }
    message(msg);

    // Write to Debug_Log
    try {
        var firstEntry = selectedEntries[0];
        var timestamp = new Date().toISOString();
        var logEntry = '[' + timestamp + '] ' + summary;
        var existingLog = safeGetField(firstEntry, 'Debug_Log') || '';
        firstEntry.set('Debug_Log', logEntry + '\n\n' + existingLog);
    } catch (err) {
        log('Could not write Debug_Log: ' + err.toString());
    }

    log('=== SYNC END ===');

})();
