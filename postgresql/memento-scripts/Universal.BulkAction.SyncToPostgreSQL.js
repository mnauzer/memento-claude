/**
 * UNIVERZÁLNY Bulk Action: Sync knižnice do PostgreSQL
 *
 * Typ:         Bulk Action (UNIVERSAL - funguje pre VŠETKY knižnice!)
 * Verzia:      4.0
 *
 * POUŽITIE:
 * 1. Skopíruj tento script do KAŽDEJ knižnice ktorú chceš syncovať
 * 2. Script automaticky zistí názov a ID knižnice
 * 3. Server automaticky vyberie správnu PostgreSQL tabuľku
 * 4. Funguje pre: Dochádzka, Zamestnanci, Záznam prác, Miesta, Klienti, atď.
 *
 * VÝHODY:
 * - Jeden script pre všetky knižnice
 * - Automatická detekcia library ID a názvu
 * - Syncuje VŠETKY záznamy v knižnici (výber nemá efekt)
 * - TIME field conversion (Príchod, Odchod)
 * - Handling array-like objects (linkToEntry)
 * - Debug logging s limitom (50KB)
 *
 * CHANGELOG:
 * v4.2 - SPRÁVNA OPRAVA!
 *      - lib().title a lib().id sú PROPERTIES (BEZ zátvoriek!)
 *      - Opravená detekcia library názvu a ID
 * v4.0 - UNIVERZÁLNY script!
 *      - Automaticky zistí lib().name() a lib().id()
 *      - Server route používa názov knižnice namiesto ID
 *      - Funguje pre všetky knižnice bez úpravy kódu
 * v3.6 - Opravené library ID pre Dochádzku
 * v3.5 - TIME field Date object conversion
 * v3.3 - Debug_Log limit (50KB)
 */

(function() {
    'use strict';

    // ======================================
    // KONFIGURÁCIA (AUTOMATICKÁ!)
    // ======================================
    var SCRIPT_VERSION = '4.2';

    // AUTOMATICKY ZISTI KNIŽNICU
    var currentLibrary = lib();
    var libraryName = currentLibrary.title;  // ✅ Property (BEZ zátvoriek!)
    var libraryId = currentLibrary.id || 'auto-' + libraryName;  // Property, fallback ak undefined

    var CONFIG = {
        apiUrl: 'http://192.168.5.241:8889',
        apiKey: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',

        // AUTOMATICKY zistené
        libraryId: libraryId,
        libraryName: libraryName,

        batchDelay: 100,
        showProgress: true,
        continueOnError: true
    };

    // Logging buffer
    var LOG_BUFFER = [];

    function addLog(msg) {
        LOG_BUFFER.push('[' + new Date().toISOString() + '] ' + msg);
        log(msg);
    }

    addLog('=== UNIVERSAL BULK SYNC v' + SCRIPT_VERSION + ' ===');
    addLog('Library Name: ' + CONFIG.libraryName);
    addLog('Library ID (Internal): ' + CONFIG.libraryId);
    addLog('Timestamp: ' + new Date().toISOString());

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
        addLog('Testing API connection...');
        try {
            var httpClient = http();
            var result = httpClient.get(CONFIG.apiUrl + '/api/memento/health');

            if (result.code === 200) {
                addLog('✅ API reachable');
                return true;
            }
            addLog('❌ API returned: ' + result.code);
            return false;
        } catch (err) {
            addLog('❌ Connection test failed: ' + err.toString());
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
                status: 'active',
                createdTime: e.creationTime,
                modifiedTime: e.lastModifiedTime,
                createdBy: e.author,
                modifiedBy: null,
                fields: {}
            };

            var fieldNames = currentLibrary.fields();

            for (var i = 0; i < fieldNames.length; i++) {
                var fieldName = fieldNames[i];

                // Skip system fields
                if (fieldName === 'Debug_Log' || fieldName === 'Error_Log' ||
                    fieldName === 'info' || fieldName === 'Sync_Status') {
                    continue;
                }

                var fieldValue = safeGetField(e, fieldName);

                // TIME FIELD FIX: Memento returns Date object with year 1970
                if (fieldValue && typeof fieldValue === 'object' &&
                    fieldValue.getFullYear && fieldValue.getFullYear() === 1970) {

                    var hours = fieldValue.getHours();
                    var minutes = fieldValue.getMinutes();
                    var seconds = fieldValue.getSeconds();
                    var ms = fieldValue.getMilliseconds();

                    var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
                    var pad3 = function(n) { return n < 10 ? '00' + n : (n < 100 ? '0' + n : '' + n); };
                    var timeStr = '1970-01-01T' + pad(hours) + ':' + pad(minutes) + ':' +
                                  pad(seconds) + '.' + pad3(ms) + 'Z';

                    fieldValue = timeStr;
                }

                // NULL/UNDEFINED
                if (fieldValue === null || fieldValue === undefined) {
                    entryData.fields[fieldName] = null;
                }
                // ARRAY OR ARRAY-LIKE (linkToEntry multiple)
                else if (Array.isArray(fieldValue) ||
                         (fieldValue && typeof fieldValue === 'object' &&
                          fieldValue.length !== undefined && fieldValue.length > 0)) {

                    var arrayData = [];
                    for (var j = 0; j < fieldValue.length; j++) {
                        var item = fieldValue[j];
                        var itemId = null;

                        if (item && item.id) {
                            itemId = item.id;  // Entry object
                        } else if (typeof item === 'string') {
                            itemId = item;  // String ID
                        }

                        if (itemId) {
                            arrayData.push({id: itemId});
                        }
                    }
                    entryData.fields[fieldName] = arrayData;
                }
                // SINGLE OBJECT (linkToEntry single)
                else if (fieldValue && typeof fieldValue === 'object') {
                    var singleId = null;
                    if (fieldValue.id) {
                        singleId = fieldValue.id;
                    }

                    if (singleId) {
                        entryData.fields[fieldName] = [{id: singleId}];
                    } else {
                        entryData.fields[fieldName] = fieldValue;
                    }
                }
                // PRIMITIVE VALUES
                else {
                    entryData.fields[fieldName] = fieldValue;
                }
            }

            return entryData;
        } catch (err) {
            addLog('❌ Extract error: ' + err.toString());
            throw err;
        }
    }

    // ======================================
    // SYNC ENTRY
    // ======================================

    function syncEntry(e) {
        try {
            var entryData = extractEntryData(e);

            // UNIVERSAL ROUTE: uses library name, server maps to correct table
            var url = CONFIG.apiUrl + '/api/memento/sync';

            // Add library metadata
            var payload = {
                library_id: CONFIG.libraryId,
                library_name: CONFIG.libraryName,
                entry: entryData
            };

            var httpClient = http();
            httpClient.headers({
                'Content-Type': 'application/json',
                'X-API-Key': CONFIG.apiKey
            });

            var result = httpClient.post(url, JSON.stringify(payload));

            if (result && (result.code === 200 || result.code === 201)) {
                return { success: true, entryId: e.id };
            } else {
                addLog('❌ Sync failed: ' + result.code + ' - ' + result.body);
                return {
                    success: false,
                    entryId: e.id,
                    error: 'HTTP ' + result.code,
                    details: result.body
                };
            }
        } catch (err) {
            addLog('❌ Sync exception: ' + err.toString());
            return {
                success: false,
                entryId: e.id,
                error: err.toString()
            };
        }
    }

    // ======================================
    // MAIN - SYNC ALL ENTRIES (not just selected!)
    // ======================================

    // POZOR: Syncuje VŠETKY záznamy v knižnici, nie len vybraté!
    var allEntries = currentLibrary.entries();
    var totalEntries = allEntries.length;

    if (totalEntries === 0) {
        message('⚠️ Žiadne záznamy v knižnici');
        exit();
    }

    addLog('Syncing ALL ' + totalEntries + ' entries from library...');
    message('🚀 Syncujem ' + totalEntries + ' záznamov (v' + SCRIPT_VERSION + ') - ' + CONFIG.libraryName);

    var stats = {
        total: totalEntries,
        success: 0,
        failed: 0,
        errors: []
    };

    var startTime = new Date();

    for (var i = 0; i < totalEntries; i++) {
        var e = allEntries[i];

        // Progress every 50 records
        if (totalEntries >= 50) {
            if (i % 50 === 0 || i === totalEntries - 1) {
                message('🔄 ' + (i + 1) + '/' + totalEntries + ' - ✅ ' + stats.success + ' ❌ ' + stats.failed);
            }
        }

        var result = syncEntry(e);

        if (result.success) {
            stats.success++;
        } else {
            stats.failed++;
            stats.errors.push(result);
            addLog('❌ ' + e.id + ': ' + result.error);

            if (!CONFIG.continueOnError) {
                break;
            }
        }

        // Delay between requests
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
    addLog(summary);

    var msg = '✅ ' + stats.success + '/' + stats.total;
    if (stats.failed > 0) {
        msg += ' (❌ ' + stats.failed + ' zlyhalo)';
    }
    message(msg);

    addLog('=== SYNC END ===');

    // ======================================
    // WRITE LOG (50KB LIMIT)
    // ======================================

    var completeLog = LOG_BUFFER.join('\n');

    try {
        var firstEntry = allEntries[0];
        var maxLogLength = 50000;
        var finalLog = completeLog;

        if (finalLog.length > maxLogLength) {
            finalLog = '...(truncated)\n' + finalLog.substring(finalLog.length - maxLogLength);
        }

        firstEntry.set('Debug_Log', finalLog);
    } catch (err) {
        log('❌ Could not write Debug_Log: ' + err.toString());
    }

    // Send log to server
    try {
        var httpClient = http();
        httpClient.headers({
            'Content-Type': 'application/json',
            'X-API-Key': CONFIG.apiKey
        });

        var logData = {
            library_id: CONFIG.libraryId,
            library_name: CONFIG.libraryName,
            timestamp: new Date().toISOString(),
            stats: stats,
            log: completeLog
        };

        httpClient.post(CONFIG.apiUrl + '/api/memento/bulk-sync-log', JSON.stringify(logData));
    } catch (err) {
        // Ignore
    }

})();
