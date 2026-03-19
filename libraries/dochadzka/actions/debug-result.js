// ==============================================
// DOCHÁDZKA - Debug Result
// ==============================================
// Typ: Action
// Verzia: 1.0.0
// Dátum: 2026-03-19
// ==============================================
// 📋 FUNKCIA:
//    - Zobrazí RAW result z calculateAttendance
//    - Debug účely
// ==============================================
// 🔧 JS KNIŽNICE: Dochadzka, MementoUtils
// ==============================================

var result = Dochadzka.calculateAttendance(entry(), {});

var msg = "=== DEBUG RESULT ===\n\n";
msg += "typeof result: " + typeof result + "\n";
msg += "result: " + JSON.stringify(result, null, 2) + "\n\n";

if (result) {
    msg += "result.success: " + result.success + "\n";
    msg += "result.isDayOff: " + result.isDayOff + "\n";
    msg += "result.error: " + result.error + "\n";
    msg += "result.data: " + (result.data ? "EXISTS" : "UNDEFINED") + "\n";

    if (result.data) {
        msg += "\nresult.data.totalHours: " + result.data.totalHours + "\n";
        msg += "result.data.totalWages: " + result.data.totalWages + "\n";
    }
}

dialog("Debug Result", msg, "OK");
