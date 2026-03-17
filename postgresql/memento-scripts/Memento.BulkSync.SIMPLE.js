/**
 * SIMPLE BULK SYNC - Minimal Working Version
 * Bez komplikovaných funkcií, len základný sync
 */

var CONFIG = {
    apiUrl: 'http://192.168.5.241:8889',
    apiKey: '7d8f9e3a-2b4c-4e1f-9a8b-3c5d6e7f8a9b'
};

log('=== SYNC START ===');
log('Library: ' + lib().name);
log('Library ID: ' + lib().id);

// Get all entries (Memento bulk actions don't support selected entries filter)
var allEntries = lib().entries();
var total = allEntries.length;

log('Total entries: ' + total);
message('Syncujem ' + total + ' záznamov...');

var success = 0;
var failed = 0;
var errors = [];

for (var i = 0; i < total; i++) {
    var e = allEntries[i];

    if (i % 10 === 0) {
        message('Progress: ' + (i + 1) + '/' + total);
    }

    try {
        // Build simple entry data
        var data = {
            id: e.id,
            status: 'active',
            createdTime: e.creationTime,
            modifiedTime: e.lastModifiedTime,
            createdBy: e.author,
            modifiedBy: null,
            fields: {}
        };

        // Get all field values
        var fieldNames = lib().fields();
        for (var j = 0; j < fieldNames.length; j++) {
            var fname = fieldNames[j];

            // Skip system fields
            if (fname === 'Debug_Log' || fname === 'Error_Log' || fname === 'info') {
                continue;
            }

            try {
                var fvalue = e.field(fname);

                // Simple handling - just add the value
                if (fvalue !== null && fvalue !== undefined) {
                    data.fields[fname] = fvalue;
                }
            } catch (err) {
                // Field doesn't exist or can't read, skip it
            }
        }

        // Send to API
        var url = CONFIG.apiUrl + '/api/memento/from-memento/' + lib().id;
        var httpClient = http();
        httpClient.headers({
            'Content-Type': 'application/json',
            'X-API-Key': CONFIG.apiKey
        });

        var result = httpClient.post(url, JSON.stringify(data));

        if (result.code === 200 || result.code === 201) {
            success++;
            log('OK: ' + e.id);
        } else {
            failed++;
            var err = 'HTTP ' + result.code;
            errors.push(e.id + ': ' + err);
            log('FAIL: ' + e.id + ' - ' + err);
        }

    } catch (err) {
        failed++;
        errors.push(e.id + ': ' + err.toString());
        log('ERROR: ' + e.id + ' - ' + err.toString());
    }

    // Small delay
    var start = new Date().getTime();
    while (new Date().getTime() < start + 100) {}
}

// Final report
var summary = '=== RESULT ===\n';
summary += 'Total: ' + total + '\n';
summary += 'Success: ' + success + '\n';
summary += 'Failed: ' + failed + '\n';

if (errors.length > 0) {
    summary += '\nFirst 3 errors:\n';
    for (var k = 0; k < Math.min(3, errors.length); k++) {
        summary += '- ' + errors[k] + '\n';
    }
}

log(summary);
message('Done: ' + success + '/' + total + ' OK');

// Write to first entry
try {
    var first = allEntries[0];
    first.set('Debug_Log', summary);
} catch (err) {
    log('Could not write Debug_Log');
}

log('=== SYNC END ===');
