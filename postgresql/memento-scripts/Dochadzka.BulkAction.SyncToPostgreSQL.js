/**
 * Bulk Action: Sync All Dochádzka Entries to PostgreSQL
 *
 * Knižnica:    Dochádzka (Attendance)
 * Verzia:      3.1
 *
 * CHANGELOG:
 * v3.3 - Fixed SQLiteBlobTooBigException by limiting Debug_Log size (50KB max, replace not append)
 * v3.2 - Fixed TIME field timezone conversion (Memento sends UTC, convert to local)
 * v3.1 - Added version tracking and logging
 *      - Fixed Memento array-like entry collections handling
 *      - Proper ID extraction from Entry objects (entry.id property)
 * v2.3 - Fixed library ID (public API ID vs internal ID)
 * v2.2 - Removed Status field requirement
 */

(function() {
    'use strict';

    // ======================================
    // KONFIGURÁCIA
    // ======================================
    var SCRIPT_VERSION = '3.3';

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

    // Logging buffer - collect all logs
    var LOG_BUFFER = [];

    function addLog(msg) {
        LOG_BUFFER.push('[' + new Date().toISOString() + '] ' + msg);
        log(msg);  // Still write to Script Log
    }

    addLog('=== BULK SYNC START ===');
    addLog('Script Version: ' + SCRIPT_VERSION);
    addLog('Library: ' + CONFIG.libraryName);
    addLog('Library ID (Public API): ' + CONFIG.libraryId);
    addLog('Timestamp: ' + new Date().toISOString());
    addLog('🔍 DEBUG MODE ACTIVE - Checking linkToEntry fields');

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

                // FIX: TIME fields are automatically converted to UTC by Memento
                // We need to convert them back to local time
                if (fieldValue && typeof fieldValue === 'string' && fieldValue.match(/1970-01-01T\d{2}:\d{2}:\d{2}\.\d{3}Z/)) {
                    // This is a TIME field (Memento uses 1970-01-01 as date for time-only values)
                    // getTimezoneOffset() returns minutes BEHIND UTC (negative for CET/CEST)
                    // To convert UTC to local: subtract the offset
                    var utcTime = new Date(fieldValue);
                    var offsetMs = utcTime.getTimezoneOffset() * 60000;
                    var localTime = new Date(utcTime.getTime() - offsetMs);
                    // Format back to ISO string
                    fieldValue = localTime.toISOString();
                    addLog('TIME field ' + fieldName + ': UTC ' + utcTime.toISOString() + ' -> Local ' + fieldValue + ' (offset: ' + (offsetMs/60000) + ' min)');
                }

                // Debug: Check what we're getting for Zamestnanci
                if (fieldName === 'Zamestnanci') {
                    addLog('DEBUG Zamestnanci raw value: ' + fieldValue);
                    addLog('DEBUG Zamestnanci type: ' + typeof fieldValue);
                    addLog('DEBUG Zamestnanci is array: ' + Array.isArray(fieldValue));
                    if (fieldValue) {
                        addLog('DEBUG Zamestnanci length: ' + (fieldValue.length || 'N/A'));
                    }
                }

                if (fieldValue === null || fieldValue === undefined) {
                    entryData.fields[fieldName] = null;
                } else if (Array.isArray(fieldValue) || (fieldValue && typeof fieldValue === 'object' && fieldValue.length !== undefined && fieldValue.length > 0)) {
                    // Handle both JavaScript arrays AND Memento array-like objects (entry collections)
                    // Handle array values (e.g., linkToEntry with multiple values)
                    var arrayData = [];

                    // Debug: Log what we're getting for Zamestnanci field
                    if (fieldName === 'Zamestnanci' && fieldValue.length > 0) {
                        addLog('DEBUG Zamestnanci: length=' + fieldValue.length);
                        addLog('DEBUG First item: ' + JSON.stringify(fieldValue[0]));
                        addLog('DEBUG First item type: ' + typeof fieldValue[0]);
                        if (fieldValue[0]) {
                            addLog('DEBUG First item.id: ' + fieldValue[0].id);
                            addLog('DEBUG First item keys: ' + Object.keys(fieldValue[0]).join(', '));
                        }
                    }

                    for (var j = 0; j < fieldValue.length; j++) {
                        var item = fieldValue[j];

                        // Extract ID from Entry object
                        // According to Memento API: entry.id is a PROPERTY (not a method)
                        var itemId = null;
                        try {
                            if (item && item.id) {
                                itemId = item.id;  // Simple property access
                            } else if (typeof item === 'string') {
                                itemId = item;  // Already an ID string
                            }

                            // Debug for Zamestnanci (first item only)
                            if (fieldName === 'Zamestnanci' && j === 0) {
                                addLog('DEBUG First employee raw item: ' + item);
                                addLog('DEBUG First employee item.id: ' + itemId);
                                addLog('DEBUG First employee item.id type: ' + typeof item.id);
                            }
                        } catch (err) {
                            addLog('ERROR extracting ID from item ' + j + ': ' + err.toString());
                        }

                        if (itemId) {
                            arrayData.push({id: itemId});
                        } else {
                            addLog('WARNING: No ID found for item ' + j + ' in field ' + fieldName);
                        }
                    }
                    entryData.fields[fieldName] = arrayData;
                } else if (fieldValue && typeof fieldValue === 'object') {
                    // Single linkToEntry
                    var singleId = null;
                    try {
                        if (fieldValue.id) {
                            singleId = fieldValue.id;
                        } else if (typeof fieldValue.id === 'function') {
                            singleId = fieldValue.id();
                        }
                    } catch (err) {
                        // Skip
                    }

                    if (singleId) {
                        entryData.fields[fieldName] = [{id: singleId}];
                    } else {
                        entryData.fields[fieldName] = fieldValue;
                    }
                } else {
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

    addLog('Syncing ' + totalEntries + ' entries...');
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
            addLog('✅ ' + e.id);
        } else {
            stats.failed++;
            stats.errors.push(result);
            addLog('❌ ' + e.id + ': ' + result.error);

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

    addLog(summary);

    var msg = '✅ ' + stats.success + '/' + stats.total;
    if (stats.failed > 0) {
        msg += ' (❌ ' + stats.failed + ' zlyhalo)';
    }
    message(msg);

    addLog('=== SYNC END ===');

    // ======================================
    // WRITE COMPLETE LOG
    // ======================================

    // Join all log entries
    var completeLog = LOG_BUFFER.join('\n');

    // Write to Debug_Log field (REPLACE old log, don't append - prevents SQLiteBlobTooBigException)
    try {
        var firstEntry = selectedEntries[0];
        // CRITICAL: Don't append to existing log - it grows too large and crashes Android
        // Just replace with new log (max ~50KB to be safe)
        var maxLogLength = 50000; // 50KB limit
        var finalLog = completeLog;
        if (finalLog.length > maxLogLength) {
            // Truncate from the beginning, keep the end (most recent)
            finalLog = '...(truncated)\n' + finalLog.substring(finalLog.length - maxLogLength);
        }
        firstEntry.set('Debug_Log', finalLog);
        addLog('✅ Log written to Debug_Log field (' + finalLog.length + ' chars)');
    } catch (err) {
        log('❌ Could not write Debug_Log: ' + err.toString());
    }

    // Send log to API for server-side storage
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

        var logUrl = CONFIG.apiUrl + '/api/memento/bulk-sync-log';
        httpClient.post(logUrl, JSON.stringify(logData));
        // Don't wait for response, fire and forget
    } catch (err) {
        // Ignore errors in log upload
    }

})();
