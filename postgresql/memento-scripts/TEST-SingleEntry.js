/**
 * TEST: Sync Single Entry - Minimal Test
 */

(function() {
    'use strict';

    var CONFIG = {
        apiUrl: 'http://192.168.5.241:8889',
        apiKey: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
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
