/**
 * Test Log Capture - Diagnostic Script
 *
 * Purpose: Debug why MementoLogCapture is not creating entries
 *
 * Tests:
 * 1. Can we access ASISTANTO Logs library?
 * 2. Can we create an entry?
 * 3. Can we set fields?
 * 4. Why are entries being deleted?
 */

(function() {
    'use strict';

    var results = [];

    function addResult(test, status, message) {
        var icon = status === 'OK' ? '✅' : '❌';
        var result = icon + ' ' + test + ': ' + message;
        results.push(result);
        log(result);
    }

    // TEST 1: Check if libByName exists
    try {
        if (typeof libByName === 'undefined') {
            addResult('libByName', 'FAIL', 'Function does not exist');
            message(results.join('\n'));
            return;
        }
        addResult('libByName', 'OK', 'Function exists');
    } catch (e) {
        addResult('libByName', 'FAIL', e.toString());
    }

    // TEST 2: Try to access ASISTANTO Logs
    var asistantoLogs = null;
    try {
        asistantoLogs = libByName("ASISTANTO Logs");
        if (asistantoLogs) {
            addResult('Library Access', 'OK', 'ASISTANTO Logs found');
            addResult('Library Info', 'OK', 'Name: ' + asistantoLogs.name + ', ID: ' + asistantoLogs.id);
        } else {
            addResult('Library Access', 'FAIL', 'libByName returned null');
            message(results.join('\n'));
            return;
        }
    } catch (e) {
        addResult('Library Access', 'FAIL', e.toString());
        message(results.join('\n'));
        return;
    }

    // TEST 3: Check library fields
    try {
        var fields = asistantoLogs.fields();
        addResult('Library Fields', 'OK', 'Found ' + fields.length + ' fields');

        // Check for required fields
        var requiredFields = ['date', 'library', 'script', 'Debug_Log', 'Error_Log', 'info', 'status'];
        var missingFields = [];

        for (var i = 0; i < requiredFields.length; i++) {
            var fieldName = requiredFields[i];
            if (fields.indexOf(fieldName) === -1) {
                missingFields.push(fieldName);
            }
        }

        if (missingFields.length > 0) {
            addResult('Required Fields', 'FAIL', 'Missing: ' + missingFields.join(', '));
        } else {
            addResult('Required Fields', 'OK', 'All required fields present');
        }

    } catch (e) {
        addResult('Library Fields', 'FAIL', e.toString());
    }

    // TEST 4: Try to create entry
    var logEntry = null;
    try {
        logEntry = asistantoLogs.create();
        if (logEntry) {
            addResult('Create Entry', 'OK', 'Entry created, ID: ' + logEntry.id);
        } else {
            addResult('Create Entry', 'FAIL', 'create() returned null');
            message(results.join('\n'));
            return;
        }
    } catch (e) {
        addResult('Create Entry', 'FAIL', e.toString());
        message(results.join('\n'));
        return;
    }

    // TEST 5: Try to set fields
    try {
        logEntry.set("date", new Date());
        addResult('Set date', 'OK', 'Date set successfully');
    } catch (e) {
        addResult('Set date', 'FAIL', e.toString());
    }

    try {
        logEntry.set("library", "TEST LIBRARY");
        addResult('Set library', 'OK', 'Library set successfully');
    } catch (e) {
        addResult('Set library', 'FAIL', e.toString());
    }

    try {
        logEntry.set("script", "Diagnostic Script v1.0");
        addResult('Set script', 'OK', 'Script set successfully');
    } catch (e) {
        addResult('Set script', 'FAIL', e.toString());
    }

    try {
        logEntry.set("Debug_Log", "Test debug log content");
        addResult('Set Debug_Log', 'OK', 'Debug_Log set successfully');
    } catch (e) {
        addResult('Set Debug_Log', 'FAIL', e.toString());
    }

    try {
        logEntry.set("Error_Log", "");
        addResult('Set Error_Log', 'OK', 'Error_Log set successfully');
    } catch (e) {
        addResult('Set Error_Log', 'FAIL', e.toString());
    }

    try {
        logEntry.set("info", "Test info content");
        addResult('Set info', 'OK', 'Info set successfully');
    } catch (e) {
        addResult('Set info', 'FAIL', e.toString());
    }

    try {
        logEntry.set("status", "🔄 Running");
        addResult('Set status', 'OK', 'Status set successfully');
    } catch (e) {
        addResult('Set status', 'FAIL', e.toString());
    }

    // TEST 6: Check if entry still exists
    try {
        var entryId = logEntry.id;
        var retrievedEntry = asistantoLogs.findById(entryId);

        if (retrievedEntry) {
            addResult('Entry Persistence', 'OK', 'Entry still exists after creation');

            // Check field values
            var libraryValue = retrievedEntry.field('library');
            var scriptValue = retrievedEntry.field('script');
            addResult('Field Values', 'OK', 'library: ' + libraryValue + ', script: ' + scriptValue);
        } else {
            addResult('Entry Persistence', 'FAIL', 'Entry was deleted immediately after creation!');
        }
    } catch (e) {
        addResult('Entry Persistence', 'FAIL', e.toString());
    }

    // TEST 7: Check for triggers
    try {
        // Try to get all entries (including deleted)
        var allEntries = asistantoLogs.entries();
        var activeCount = 0;
        var deletedCount = 0;

        for (var j = 0; j < Math.min(allEntries.length, 10); j++) {
            var e = allEntries[j];
            if (e.status === 'deleted') {
                deletedCount++;
            } else {
                activeCount++;
            }
        }

        addResult('Entry Status', 'OK', 'Active: ' + activeCount + ', Deleted: ' + deletedCount + ' (sample of ' + Math.min(allEntries.length, 10) + ')');

        if (deletedCount > 0 && activeCount === 0) {
            addResult('WARNING', 'FAIL', 'ALL entries are deleted - there may be a BeforeDelete trigger or auto-delete rule!');
        }

    } catch (e) {
        addResult('Entry Status', 'FAIL', e.toString());
    }

    // Display all results
    var summary = '=== LOG CAPTURE DIAGNOSTIC ===\n\n' + results.join('\n');
    dialog('Log Capture Test Results', summary, 'OK');

})();
