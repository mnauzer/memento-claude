/**
 * SIMPLE DIAGNOSTIC - Bulk Action Test
 */

var report = '=== DIAGNOSTIC START ===\n';

// Test 1: entries() function
try {
    var testEntries = entries();
    report += 'entries() OK\n';
    report += 'Count: ' + testEntries.length + '\n';
} catch (err) {
    report += 'entries() FAILED: ' + err.toString() + '\n';
}

// Test 2: lib().entries()
try {
    var allEntries = lib().entries();
    report += 'lib().entries() OK\n';
    report += 'Total count: ' + allEntries.length + '\n';
} catch (err) {
    report += 'lib().entries() FAILED: ' + err.toString() + '\n';
}

// Test 3: Library info
report += 'Library: ' + lib().name + '\n';
report += 'Library ID: ' + lib().id + '\n';

report += '=== DIAGNOSTIC END ===';

log(report);
message('See Script Log');

// Try to write to Debug_Log
try {
    var first = lib().entries()[0];
    first.set('Debug_Log', report);
} catch (err) {
    log('Could not write Debug_Log');
}
