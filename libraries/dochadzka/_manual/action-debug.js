// Dochádzka - Zobraziť Debug (Action)
// Pridaj JS knižnice: (žiadne potrebné)

var debugLog = entry().field("Debug_Log");
var errorLog = entry().field("Error_Log");

if (!debugLog && !errorLog) {
    dialog("Debug", "Žiadne logy", "OK");
    cancel();
}

var msg = "";
if (errorLog) {
    msg += "=== ERRORS ===\n" + errorLog + "\n\n";
}
if (debugLog) {
    msg += "=== DEBUG ===\n" + debugLog;
}

dialog("Debug Log", msg, "OK");
