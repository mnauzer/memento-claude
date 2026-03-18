/**
 * Universal Delete Trigger - Sync Entry Deletion to PostgreSQL
 *
 * Trigger Type: After Delete
 * Purpose: Notify PostgreSQL when entry is permanently deleted from Memento
 *
 * INSTALLATION:
 * 1. Copy this script to each library you want to sync
 * 2. Create trigger: After Delete
 * 3. Update CONFIG.apiKey with your API key
 *
 * Version: 1.0
 * Date: 2026-03-18
 */

(function() {
    'use strict';

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
    var libraryId = currentLibrary.id;      // Memento library ID
    var libraryName = currentLibrary.name;  // Slovak library name

    // Map library names to PostgreSQL table names
    var TABLE_MAPPING = {
        'Zamestnanci': 'memento_employees',
        'Klienti': 'memento_clients',
        'Partneri': 'memento_partners',
        'Dodávatelia': 'memento_suppliers'
    };

    var tableName = TABLE_MAPPING[libraryName];
    if (!tableName) {
        message('⚠️ Unknown library: ' + libraryName);
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
    // DELETE ENTRY FROM POSTGRESQL
    // ======================================

    function deleteFromPostgreSQL(entryId) {
        try {
            addLog('🗑️ Deleting entry from PostgreSQL: ' + entryId);

            var httpClient = http();
            var url = CONFIG.apiUrl + '/api/memento/from-memento/' +
                      libraryId + '/' + entryId +
                      '?library_name=' + encodeURIComponent(libraryName) +
                      '&table_name=' + tableName;

            addLog('DELETE URL: ' + url);

            var result = httpClient.delete({
                url: url,
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': CONFIG.apiKey
                },
                timeout: CONFIG.timeout
            });

            addLog('Response code: ' + result.code);
            addLog('Response: ' + result.body);

            if (result.code === 200) {
                addLog('✅ Successfully deleted from PostgreSQL');
                return true;
            } else {
                addLog('❌ Delete failed: HTTP ' + result.code);
                return false;
            }

        } catch (err) {
            addLog('❌ Exception during delete: ' + err.toString());
            return false;
        }
    }

    // ======================================
    // MAIN EXECUTION
    // ======================================

    addLog('='.repeat(50));
    addLog('DELETE TRIGGER - ' + libraryName);
    addLog('Library ID: ' + libraryId);
    addLog('Table: ' + tableName);
    addLog('='.repeat(50));

    var currentEntry = entry();
    var entryId = currentEntry.id;

    addLog('Entry ID to delete: ' + entryId);

    var success = deleteFromPostgreSQL(entryId);

    if (success) {
        message('✅ Záznam vymazaný z PostgreSQL');
    } else {
        message('⚠️ Chyba pri vymazaní z PostgreSQL');
    }

    addLog('='.repeat(50));
    addLog('Script finished');

})();
