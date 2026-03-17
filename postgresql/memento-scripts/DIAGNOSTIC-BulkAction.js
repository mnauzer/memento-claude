/**
 * DIAGNOSTIC: Bulk Action Context
 * Tento script zistí aké premenné/funkcie sú dostupné v bulk action
 */

(function() {
    'use strict';

    var report = '=== BULK ACTION DIAGNOSTIC ===\n\n';

    // Test 1: entries() function
    try {
        var e = entries();
        report += '✅ entries() exists\n';
        report += '   Type: ' + typeof e + '\n';
        report += '   Length: ' + (e.length || 'N/A') + '\n';
        report += '   Constructor: ' + (e.constructor ? e.constructor.name : 'N/A') + '\n';
    } catch (err) {
        report += '❌ entries() failed: ' + err.toString() + '\n';
    }

    // Test 2: lib().entries()
    try {
        var libEntries = lib().entries();
        report += '✅ lib().entries() exists\n';
        report += '   Length: ' + libEntries.length + '\n';
    } catch (err) {
        report += '❌ lib().entries() failed: ' + err.toString() + '\n';
    }

    // Test 3: entry() function
    try {
        var singleEntry = entry();
        report += '✅ entry() exists\n';
        report += '   ID: ' + singleEntry.id + '\n';
    } catch (err) {
        report += '❌ entry() failed: ' + err.toString() + '\n';
    }

    // Test 4: Check global scope
    report += '\n=== GLOBAL VARIABLES ===\n';

    // Check for common bulk action variables
    var possibleVars = ['selectedEntries', 'selection', 'items', 'records', '$entries', '$selection'];
    for (var i = 0; i < possibleVars.length; i++) {
        var varName = possibleVars[i];
        try {
            var value = eval('typeof ' + varName);
            if (value !== 'undefined') {
                report += '✅ Found: ' + varName + ' (' + value + ')\n';
            }
        } catch (e) {
            // Variable doesn't exist
        }
    }

    // Test 5: Library info
    report += '\n=== LIBRARY INFO ===\n';
    report += 'Name: ' + lib().name + '\n';
    report += 'ID: ' + lib().id + '\n';
    report += 'Total entries: ' + lib().entries().length + '\n';

    report += '\n=== END DIAGNOSTIC ===';

    log(report);
    message('Check Script Log for diagnostic report');

    // Write to first entry if possible
    try {
        var firstEntry = lib().entries()[0];
        var existing = firstEntry.field('Debug_Log') || '';
        firstEntry.set('Debug_Log', report + '\n\n' + existing);
        message('✅ Report written to first entry Debug_Log');
    } catch (err) {
        message('⚠️ Could not write to Debug_Log: ' + err.toString());
    }

})();
