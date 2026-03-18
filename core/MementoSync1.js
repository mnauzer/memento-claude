/**
 * Knižnica:    MementoSync
 * Názov:       MementoSync1.js
 * Verzia:      1.0
 * Autor:       Claude Code
 * Dátum:       2026-03-18
 *
 * Popis:       Synchronizácia medzi Memento Database a PostgreSQL
 *
 * Závislosti:  žiadne
 *
 * Použitie:
 *   // V bulk action
 *   SyncToPostgreSQL(entries);
 *
 *   // V trigger
 *   SyncToPostgreSQL(entry());
 *
 *   // S options
 *   SyncToPostgreSQL(entries, {
 *       apiUrl: 'http://custom-url:8889',
 *       apiKey: 'custom-key'
 *   });
 *
 * CHANGELOG:
 * v1.0 (2026-03-18) - Initial release
 *   - syncToPostgreSQL() - sync aktívnych záznamov
 *   - syncTrashToPostgreSQL() - sync koša
 *   - deleteFromPostgreSQL() - delete záznamu
 */

var MementoSync = (function() {
    'use strict';

    var VERSION = '1.0';

    // ======================================
    // DEFAULT CONFIGURATION
    // ======================================

    var DEFAULT_CONFIG = {
        apiUrl: 'http://192.168.5.241:8889',
        apiKey: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
        timeout: 10000,
        showProgress: true,
        progressInterval: 10
    };

    // TABLE MAPPING: Library Name → PostgreSQL Table
    var TABLE_MAPPING = {
        'Zamestnanci': 'memento_employees',
        'Klienti': 'memento_clients',
        'Partneri': 'memento_partners',
        'Dodávatelia': 'memento_suppliers',
        'Dochádzka': 'memento_attendance',
        'Záznam prác': 'memento_work_records',
        'Kniha jázd': 'memento_ride_log',
        'Pokladňa': 'memento_cash_book',
        'Zákazky': 'memento_orders',
        'Cenové ponuky': 'memento_quotes'
    };

    // ======================================
    // HELPER FUNCTIONS
    // ======================================

    /**
     * Normalize input to array of entries
     */
    function normalizeEntries(entriesOrEntry) {
        if (!entriesOrEntry) {
            return [];
        }

        // Single entry
        if (entriesOrEntry.id && typeof entriesOrEntry.id !== 'undefined') {
            return [entriesOrEntry];
        }

        // Array of entries
        if (Array.isArray(entriesOrEntry)) {
            return entriesOrEntry;
        }

        // Array-like object (Memento entries() result)
        if (entriesOrEntry.length !== undefined) {
            var arr = [];
            for (var i = 0; i < entriesOrEntry.length; i++) {
                arr.push(entriesOrEntry[i]);
            }
            return arr;
        }

        return [];
    }

    /**
     * Get library info from entry
     */
    function getLibraryInfo(entry) {
        var currentLib = lib();
        var libraryId = currentLib.id;
        var libraryName = currentLib.name;
        var tableName = TABLE_MAPPING[libraryName];

        if (!tableName) {
            throw new Error('Unknown library: ' + libraryName + '. Add mapping to TABLE_MAPPING.');
        }

        return {
            id: libraryId,
            name: libraryName,
            table: tableName
        };
    }

    /**
     * Merge options with defaults
     */
    function mergeOptions(userOptions) {
        var opts = {};
        for (var key in DEFAULT_CONFIG) {
            opts[key] = DEFAULT_CONFIG[key];
        }
        if (userOptions) {
            for (var key in userOptions) {
                opts[key] = userOptions[key];
            }
        }
        return opts;
    }

    /**
     * Safe get field value
     */
    function safeGetField(entry, fieldName) {
        try {
            return entry.field(fieldName);
        } catch (e) {
            return null;
        }
    }

    /**
     * Extract entry data for sync
     */
    function extractEntryData(entry, status) {
        var entryData = {
            id: entry.id,
            status: status || 'active',
            createdTime: entry.creationTime,
            modifiedTime: entry.lastModifiedTime,
            createdBy: entry.author,
            modifiedBy: null,
            fields: {}
        };

        var currentLib = lib();
        var fieldNames = currentLib.fields();

        for (var i = 0; i < fieldNames.length; i++) {
            var fieldName = fieldNames[i];

            // Skip system fields
            if (fieldName === 'Debug_Log' || fieldName === 'Error_Log' ||
                fieldName === 'info' || fieldName === 'Sync_Status') {
                continue;
            }

            var fieldValue = safeGetField(entry, fieldName);

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
                        itemId = item.id;
                    } else if (typeof item === 'string') {
                        itemId = item;
                    }

                    if (itemId) {
                        arrayData.push({id: itemId});
                    }
                }

                entryData.fields[fieldName] = arrayData;
            }
            // OBJECT (linkToEntry single)
            else if (fieldValue && typeof fieldValue === 'object' && fieldValue.id) {
                entryData.fields[fieldName] = {id: fieldValue.id};
            }
            // PRIMITIVE VALUE
            else {
                entryData.fields[fieldName] = fieldValue;
            }
        }

        return entryData;
    }

    /**
     * Sync single entry to PostgreSQL
     */
    function syncSingleEntry(entry, libInfo, config, status) {
        try {
            var entryData = extractEntryData(entry, status);

            var httpClient = http();
            var url = config.apiUrl + '/api/memento/from-memento/' + libInfo.id +
                      '?library_name=' + encodeURIComponent(libInfo.name) +
                      '&table_name=' + libInfo.table;

            var result = httpClient.post({
                url: url,
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': config.apiKey
                },
                body: JSON.stringify(entryData),
                timeout: config.timeout
            });

            if (result && (result.code === 200 || result.code === 201)) {
                return { success: true, entryId: entry.id };
            } else {
                return {
                    success: false,
                    entryId: entry.id,
                    error: 'HTTP ' + result.code,
                    details: result.body
                };
            }
        } catch (err) {
            return {
                success: false,
                entryId: entry.id,
                error: err.toString()
            };
        }
    }

    /**
     * Delete single entry from PostgreSQL
     */
    function deleteSingleEntry(entry, libInfo, config) {
        try {
            var httpClient = http();
            var url = config.apiUrl + '/api/memento/from-memento/' +
                      libInfo.id + '/' + entry.id +
                      '?library_name=' + encodeURIComponent(libInfo.name) +
                      '&table_name=' + libInfo.table;

            var result = httpClient.delete({
                url: url,
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': config.apiKey
                },
                timeout: config.timeout
            });

            if (result && result.code === 200) {
                return { success: true, entryId: entry.id };
            } else {
                return {
                    success: false,
                    entryId: entry.id,
                    error: 'HTTP ' + result.code,
                    details: result.body
                };
            }
        } catch (err) {
            return {
                success: false,
                entryId: entry.id,
                error: err.toString()
            };
        }
    }

    // ======================================
    // PUBLIC API
    // ======================================

    /**
     * Sync active entries to PostgreSQL
     *
     * @param {Entry|Entry[]} entriesOrEntry - Single entry or array of entries
     * @param {Object} options - Optional configuration
     * @returns {Object} - Sync statistics
     *
     * Example:
     *   // Bulk action
     *   var result = SyncToPostgreSQL(entries);
     *
     *   // Trigger
     *   var result = SyncToPostgreSQL(entry());
     *
     *   // Custom config
     *   var result = SyncToPostgreSQL(entries, {
     *       apiUrl: 'http://custom:8889',
     *       showProgress: false
     *   });
     */
    function syncToPostgreSQL(entriesOrEntry, options) {
        var entries = normalizeEntries(entriesOrEntry);
        var config = mergeOptions(options);

        if (entries.length === 0) {
            message('⚠️ Žiadne záznamy na sync');
            return { success: 0, failed: 0, total: 0 };
        }

        var libInfo = getLibraryInfo(entries[0]);
        var totalEntries = entries.length;

        var stats = {
            total: totalEntries,
            success: 0,
            failed: 0,
            errors: []
        };

        if (config.showProgress) {
            message('🚀 Syncujem ' + totalEntries + ' záznamov...');
        }

        var startTime = new Date();

        for (var i = 0; i < totalEntries; i++) {
            var entry = entries[i];

            // Progress
            if (config.showProgress && totalEntries > config.progressInterval) {
                if (i % config.progressInterval === 0 || i === totalEntries - 1) {
                    message('🔄 ' + (i + 1) + '/' + totalEntries + ' - ✅ ' + stats.success + ' ❌ ' + stats.failed);
                }
            }

            var result = syncSingleEntry(entry, libInfo, config, 'active');

            if (result.success) {
                stats.success++;
            } else {
                stats.failed++;
                stats.errors.push(result);
            }
        }

        var endTime = new Date();
        var duration = ((endTime - startTime) / 1000).toFixed(1);

        if (config.showProgress) {
            message('✅ Hotovo!\n' +
                    '   Syncnutých: ' + stats.success + '/' + stats.total + '\n' +
                    '   Zlyhalo: ' + stats.failed + '\n' +
                    '   Čas: ' + duration + 's');
        }

        return stats;
    }

    /**
     * Sync trash entries to PostgreSQL (mark as deleted)
     *
     * @param {Entry|Entry[]} entriesOrEntry - Single entry or array of entries
     * @param {Object} options - Optional configuration
     * @returns {Object} - Sync statistics
     *
     * Example:
     *   // Bulk action on trash entries
     *   var result = SyncTrashToPostgreSQL(entries);
     */
    function syncTrashToPostgreSQL(entriesOrEntry, options) {
        var entries = normalizeEntries(entriesOrEntry);
        var config = mergeOptions(options);

        if (entries.length === 0) {
            message('⚠️ Žiadne záznamy v koši');
            return { success: 0, failed: 0, total: 0 };
        }

        var libInfo = getLibraryInfo(entries[0]);
        var totalEntries = entries.length;

        var stats = {
            total: totalEntries,
            success: 0,
            failed: 0,
            errors: []
        };

        if (config.showProgress) {
            message('🗑️ Označujem ' + totalEntries + ' záznamov z koša ako deleted...');
        }

        var startTime = new Date();

        for (var i = 0; i < totalEntries; i++) {
            var entry = entries[i];

            if (config.showProgress && totalEntries > config.progressInterval) {
                if (i % config.progressInterval === 0 || i === totalEntries - 1) {
                    message('🔄 ' + (i + 1) + '/' + totalEntries + ' - ✅ ' + stats.success + ' ❌ ' + stats.failed);
                }
            }

            var result = syncSingleEntry(entry, libInfo, config, 'deleted');

            if (result.success) {
                stats.success++;
            } else {
                stats.failed++;
                stats.errors.push(result);
            }
        }

        var endTime = new Date();
        var duration = ((endTime - startTime) / 1000).toFixed(1);

        if (config.showProgress) {
            message('✅ Hotovo!\n' +
                    '   Označených: ' + stats.success + '/' + stats.total + '\n' +
                    '   Zlyhalo: ' + stats.failed + '\n' +
                    '   Čas: ' + duration + 's');
        }

        return stats;
    }

    /**
     * Delete entry from PostgreSQL (permanent delete)
     *
     * @param {Entry|Entry[]} entriesOrEntry - Single entry or array of entries
     * @param {Object} options - Optional configuration
     * @returns {Object} - Delete statistics
     *
     * Example:
     *   // After Delete trigger
     *   var result = DeleteFromPostgreSQL(entry());
     */
    function deleteFromPostgreSQL(entriesOrEntry, options) {
        var entries = normalizeEntries(entriesOrEntry);
        var config = mergeOptions(options);

        if (entries.length === 0) {
            message('⚠️ Žiadne záznamy na vymazanie');
            return { success: 0, failed: 0, total: 0 };
        }

        var libInfo = getLibraryInfo(entries[0]);
        var totalEntries = entries.length;

        var stats = {
            total: totalEntries,
            success: 0,
            failed: 0,
            errors: []
        };

        if (config.showProgress) {
            message('🗑️ Vymazávam ' + totalEntries + ' záznamov z PostgreSQL...');
        }

        var startTime = new Date();

        for (var i = 0; i < totalEntries; i++) {
            var entry = entries[i];

            if (config.showProgress && totalEntries > config.progressInterval) {
                if (i % config.progressInterval === 0 || i === totalEntries - 1) {
                    message('🔄 ' + (i + 1) + '/' + totalEntries + ' - ✅ ' + stats.success + ' ❌ ' + stats.failed);
                }
            }

            var result = deleteSingleEntry(entry, libInfo, config);

            if (result.success) {
                stats.success++;
            } else {
                stats.failed++;
                stats.errors.push(result);
            }
        }

        var endTime = new Date();
        var duration = ((endTime - startTime) / 1000).toFixed(1);

        if (config.showProgress) {
            message('✅ Hotovo!\n' +
                    '   Vymazaných: ' + stats.success + '/' + stats.total + '\n' +
                    '   Zlyhalo: ' + stats.failed + '\n' +
                    '   Čas: ' + duration + 's');
        }

        return stats;
    }

    /**
     * Get sync library version
     */
    function getVersion() {
        return VERSION;
    }

    // ======================================
    // EXPORTS
    // ======================================

    return {
        syncToPostgreSQL: syncToPostgreSQL,
        syncTrashToPostgreSQL: syncTrashToPostgreSQL,
        deleteFromPostgreSQL: deleteFromPostgreSQL,
        getVersion: getVersion,

        // Aliases for convenience
        sync: syncToPostgreSQL,
        syncTrash: syncTrashToPostgreSQL,
        delete: deleteFromPostgreSQL
    };

})();

// ======================================
// GLOBAL SHORTCUTS
// ======================================

// Make functions available globally for easy use
var SyncToPostgreSQL = MementoSync.syncToPostgreSQL;
var SyncTrashToPostgreSQL = MementoSync.syncTrashToPostgreSQL;
var DeleteFromPostgreSQL = MementoSync.deleteFromPostgreSQL;
