/**
 * TEST: Sync Single Entry - Minimal Test
 */

(function() {
    'use strict';

    var CONFIG = {
        apiUrl: 'http://192.168.5.241:8889',
        apiKey: '7d8f9e3a-2b4c-4e1f-9a8b-3c5d6e7f8a9b'
    };

    var e = entry();  // Current entry

    log('=== SINGLE ENTRY SYNC TEST ===');
    log('Entry ID: ' + e.id);
    log('Library: ' + lib().name);
    log('Library ID: ' + lib().id);

    // Simple data
    var data = {
        id: e.id,
        status: 'active',
        createdTime: e.creationTime,
        modifiedTime: e.lastModifiedTime,
        createdBy: e.author,
        modifiedBy: null,
        fields: {
            'Test': 'Simple test value'
        }
    };

    log('Data: ' + JSON.stringify(data));

    var url = CONFIG.apiUrl + '/api/memento/from-memento/' + lib().id;
    log('URL: ' + url);

    try {
        var httpClient = http();
        httpClient.headers({
            'Content-Type': 'application/json',
            'X-API-Key': CONFIG.apiKey
        });

        log('Sending POST request...');
        var result = httpClient.post(url, JSON.stringify(data));

        log('Response code: ' + result.code);
        log('Response body: ' + result.body);

        if (result.code === 200 || result.code === 201) {
            message('✅ SUCCESS! Code: ' + result.code);
        } else {
            message('❌ FAILED! Code: ' + result.code + ' - Check Script Log');
        }

    } catch (err) {
        log('ERROR: ' + err.toString());
        message('❌ EXCEPTION: ' + err.toString());
    }

    log('=== TEST END ===');

})();
