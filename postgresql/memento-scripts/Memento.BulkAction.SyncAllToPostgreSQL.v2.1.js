/**
 * Bulk Action: Sync All Entries to PostgreSQL - DEBUG VERSION
 *
 * Verzia:      2.1 (s detailným logovaním)
 *
 * Zmeny v2.1:
 * - Pridané log() volania pre debugging
 * - Výsledky sa píšu do Debug_Log poľa prvého záznamu
 * - Testovanie HTTP spojenia pred začiatkom
 * - Detailné error handling
 */

(function() {
    'use strict';

    // ======================================
    // KONFIGURÁCIA
    // ======================================
    var CONFIG = {
        apiUrl: 'http://192.168.5.241:8889',
        apiKey: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
        batchDelay: 100,
        showProgress: true,
        continueOnError: true
    };

    log('=== BULK SYNC START ===');
    log('Library: ' + lib().name);
    log('Library ID: ' + lib().id);
    log('API URL: ' + CONFIG.apiUrl);

    // ======================================
    // TEST HTTP CONNECTION
    // ======================================

    function testConnection() {
        log('Testing HTTP connection...');
        try {
            var httpClient = http();
            var testUrl = CONFIG.apiUrl + '/api/memento/health';
            log('Test URL: ' + testUrl);

            var result = httpClient.get(testUrl);
            log('Health check response code: ' + result.code);
            log('Health check response body: ' + result.body);

            if (result.code === 200) {
                log('✅ API is reachable');
                return true;
            } else {
                log('❌ API returned code: ' + result.code);
                return false;
            }
        } catch (err) {
            log('❌ HTTP test failed: ' + err.toString());
            message('❌ HTTP Error: ' + err.toString());
            return false;
        }
    }

    if (!testConnection()) {
        message('❌ API nedostupné! Skontroluj: ' + CONFIG.apiUrl);
        exit();
    }

    // ======================================
    // EXTRACT ENTRY DATA
    // ======================================

    function extractEntryData(e) {
        try {
            var entryData = {
                id: e.id,
                status: e.field('Status') || 'active',
                createdTime: e.creationTime,
                modifiedTime: e.lastModifiedTime,
                createdBy: e.author,
                modifiedBy: null,
                fields: {}
            };

            var fieldNames = lib().fields();
            log('Extracting ' + fieldNames.length + ' fields from entry ' + e.id);

            for (var i = 0; i < fieldNames.length; i++) {
                var fieldName = fieldNames[i];

                if (fieldName === 'Debug_Log' || fieldName === 'Error_Log' ||
                    fieldName === 'info' || fieldName === 'Sync_Status') {
                    continue;
                }

                var fieldValue = e.field(fieldName);

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
            log('❌ Error extracting entry data: ' + err.toString());
            throw err;
        }
    }

    // ======================================
    // SYNC ENTRY
    // ======================================

    function syncEntry(e) {
        try {
            log('Syncing entry: ' + e.id);

            var entryData = extractEntryData(e);
            var url = CONFIG.apiUrl + '/api/memento/from-memento/' + lib().id;

            log('POST URL: ' + url);
            log('Entry data: ' + JSON.stringify(entryData).substring(0, 200) + '...');

            var httpClient = http();
            httpClient.headers({
                'Content-Type': 'application/json',
                'X-API-Key': CONFIG.apiKey
            });

            var result = httpClient.post(url, JSON.stringify(entryData));

            log('Response code: ' + result.code);
            log('Response body: ' + result.body);

            if (result && (result.code === 200 || result.code === 201)) {
                log('✅ Entry synced successfully');
                return {
                    success: true,
                    entryId: e.id
                };
            } else {
                log('❌ Sync failed with code: ' + result.code);
                return {
                    success: false,
                    entryId: e.id,
                    error: 'HTTP ' + (result ? result.code : 'no response'),
                    details: result ? result.body : null
                };
            }

        } catch (err) {
            log('❌ Exception in syncEntry: ' + err.toString());
            return {
                success: false,
                entryId: e.id,
                error: err.message || err.toString(),
                details: err.toString()
            };
        }
    }

    // ======================================
    // MAIN
    // ======================================

    var selectedEntries;
    try {
        selectedEntries = entries();
        log('Got ' + selectedEntries.length + ' entries from entries()');
    } catch (err) {
        log('entries() failed, using lib().entries()');
        selectedEntries = lib().entries();
        log('Got ' + selectedEntries.length + ' entries from lib().entries()');
    }

    var totalEntries = selectedEntries.length;
    log('Total entries to sync: ' + totalEntries);

    if (totalEntries === 0) {
        message('⚠️ Žiadne záznamy na sync');
        log('No entries selected');
        exit();
    }

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

        if (CONFIG.showProgress && (i % 5 === 0 || i === totalEntries - 1)) {
            message('🔄 ' + (i + 1) + '/' + totalEntries + ' - OK: ' + stats.success + ', Chyby: ' + stats.failed);
        }

        var result = syncEntry(e);

        if (result.success) {
            stats.success++;
        } else {
            stats.failed++;
            stats.errors.push({
                entryId: result.entryId,
                error: result.error,
                details: result.details
            });

            if (!CONFIG.continueOnError) {
                log('Stopping on error');
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

    var summary = '═══ BULK SYNC VÝSLEDOK ═══\n' +
                  'Knižnica: ' + lib().name + '\n' +
                  'Celkom: ' + stats.total + '\n' +
                  'Úspešných: ' + stats.success + ' ✅\n' +
                  'Zlyhalo: ' + stats.failed + ' ❌\n' +
                  'Trvanie: ' + durationSec.toFixed(1) + 's\n';

    if (stats.failed > 0) {
        summary += '\nCHYBY:\n';
        var limit = Math.min(3, stats.errors.length);
        for (var j = 0; j < limit; j++) {
            var err = stats.errors[j];
            summary += '• ' + err.entryId + ': ' + err.error + '\n';
        }
    }

    summary += '\n═══════════════════════════';

    log(summary);
    message(stats.success + '/' + stats.total + ' OK ' + (stats.failed > 0 ? '(' + stats.failed + ' chýb)' : '✅'));

    // Write to first entry's Debug_Log field
    try {
        var firstEntry = selectedEntries[0];
        var timestamp = new Date().toISOString();
        var logEntry = '[' + timestamp + '] ' + summary;

        var existingLog = firstEntry.field('Debug_Log') || '';
        firstEntry.set('Debug_Log', logEntry + '\n\n' + existingLog);

        log('Results written to first entry Debug_Log field');
    } catch (err) {
        log('Could not write to Debug_Log: ' + err.toString());
    }

    log('=== BULK SYNC END ===');

})();
