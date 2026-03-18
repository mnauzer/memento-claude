/**
 * Universal Trash Sync - Mark Trash Entries as Deleted in PostgreSQL
 *
 * Action Type: Bulk Action
 * Purpose: Sync entries from Memento trash to PostgreSQL (mark as deleted)
 *
 * USAGE:
 * 1. This script syncs entries currently in TRASH (not active entries)
 * 2. Marks them as status='deleted' in PostgreSQL
 * 3. Use this AFTER moving entries to trash in Memento
 *
 * Version: 1.0
 * Date: 2026-03-18
 */

(function() {
    'use strict';

    var SCRIPT_VERSION = '1.0';

    // ======================================
    // CONFIGURATION
    // ======================================

    var CONFIG = {
        apiUrl: 'http://192.168.5.241:8889',
        apiKey: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
        timeout: 10000
    };

    // ======================================
    // AUTO-DETECT LIBRARY INFO
    // ======================================

    var currentLibrary = lib();
    CONFIG.libraryId = currentLibrary.id;
    CONFIG.libraryName = currentLibrary.name;

    var TABLE_MAPPING = {
        'Zamestnanci': 'memento_employees',
        'Klienti': 'memento_clients',
        'Partneri': 'memento_partners',
        'Dodávatelia': 'memento_suppliers'
    };

    CONFIG.tableName = TABLE_MAPPING[CONFIG.libraryName];
    if (!CONFIG.tableName) {
        message('⚠️ Unknown library: ' + CONFIG.libraryName);
        exit();
    }

    // ======================================
    // LOG HELPERS
    // ======================================

    var LOG_BUFFER = [];

    function addLog(msg) {
        var timestamp = new Date().toISOString();
        LOG_BUFFER.push('[' + timestamp + '] ' + msg);
        log(msg);
    }

    // ======================================
    // EXTRACT ENTRY DATA
    // ======================================

    function extractEntryData(e) {
        try {
            var entryData = {
                id: e.id,
                status: 'deleted',  // Mark as deleted
                createdTime: e.creationTime,
                modifiedTime: e.lastModifiedTime,
                createdBy: e.author,
                modifiedBy: null,
                fields: {}
            };

            // We don't need to sync all fields for trash entries
            // Just update the status

            return entryData;

        } catch (err) {
            addLog('❌ Extract error: ' + err.toString());
            return null;
        }
    }

    // ======================================
    // SYNC ENTRY TO POSTGRESQL
    // ======================================

    function syncEntry(e) {
        try {
            var entryData = extractEntryData(e);
            if (!entryData) {
                return { success: false, entryId: e.id, error: 'Extract failed' };
            }

            var httpClient = http();
            var url = CONFIG.apiUrl + '/api/memento/from-memento/' + CONFIG.libraryId +
                      '?library_name=' + encodeURIComponent(CONFIG.libraryName) +
                      '&table_name=' + CONFIG.tableName;

            var result = httpClient.post({
                url: url,
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': CONFIG.apiKey
                },
                body: JSON.stringify(entryData),
                timeout: CONFIG.timeout
            });

            if (result && (result.code === 200 || result.code === 201)) {
                return { success: true, entryId: e.id };
            } else {
                addLog('❌ Sync failed: ' + result.code + ' - ' + result.body);
                return {
                    success: false,
                    entryId: e.id,
                    error: 'HTTP ' + result.code
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
    // MAIN - SYNC TRASH ENTRIES
    // ======================================

    addLog('='.repeat(50));
    addLog('TRASH SYNC - ' + CONFIG.libraryName);
    addLog('Library ID: ' + CONFIG.libraryId);
    addLog('Table: ' + CONFIG.tableName);
    addLog('Script Version: ' + SCRIPT_VERSION);
    addLog('='.repeat(50));

    // Get entries from TRASH only
    var trashEntries = currentLibrary.entries('trash');
    var totalEntries = trashEntries ? trashEntries.length : 0;

    if (totalEntries === 0) {
        message('✅ Žiadne záznamy v koši');
        exit();
    }

    addLog('Found ' + totalEntries + ' entries in trash');
    message('🗑️ Syncujem ' + totalEntries + ' záznamov z koša (v' + SCRIPT_VERSION + ')');

    var stats = {
        total: totalEntries,
        success: 0,
        failed: 0
    };

    var startTime = new Date();

    for (var i = 0; i < totalEntries; i++) {
        var e = trashEntries[i];

        if (i % 10 === 0 || i === totalEntries - 1) {
            message('🔄 ' + (i + 1) + '/' + totalEntries + ' - ✅ ' + stats.success + ' ❌ ' + stats.failed);
        }

        var result = syncEntry(e);

        if (result.success) {
            stats.success++;
        } else {
            stats.failed++;
            addLog('❌ ' + e.id + ': ' + result.error);
        }
    }

    var endTime = new Date();
    var duration = ((endTime - startTime) / 1000).toFixed(1);

    addLog('='.repeat(50));
    addLog('TRASH SYNC COMPLETE');
    addLog('Total: ' + stats.total);
    addLog('Success: ' + stats.success);
    addLog('Failed: ' + stats.failed);
    addLog('Duration: ' + duration + 's');
    addLog('='.repeat(50));

    message('✅ Hotovo!\n' +
            '   Označených ako deleted: ' + stats.success + '/' + stats.total + '\n' +
            '   Zlyhalo: ' + stats.failed + '\n' +
            '   Čas: ' + duration + 's');

})();
