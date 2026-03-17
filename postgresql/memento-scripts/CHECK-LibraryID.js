/**
 * CHECK Library ID
 * Zistí aké ID má aktuálna knižnica
 */

var libraryName = lib().name;
var libraryId = lib().id;

var msg = 'Library Name: ' + libraryName + '\n' +
          'Library ID: ' + libraryId + '\n' +
          'ID Length: ' + libraryId.length;

log(msg);
message(msg);

// Write to first entry
try {
    var first = lib().entries()[0];
    first.set('Debug_Log', msg);
} catch (err) {
    log('Could not write to Debug_Log');
}
