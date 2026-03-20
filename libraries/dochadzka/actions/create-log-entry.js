// ==============================================
// DOCHÁDZKA - Vytvoriť záznam v ASISTANTO Logs
// ==============================================
// Typ: Action
// Event: Manual (Button)
// Verzia: 1.0.0
// Dátum: 2026-03-20
// ==============================================
// 📋 FUNKCIA:
//    - Manuálne vytvorí záznam v ASISTANTO Logs z aktuálneho záznamu
//    - Skopíruje Debug_Log, Error_Log, info
//    - Užitočné pre debugging keď auto-capture zlyhá
// ==============================================
// 🔗 ZÁVISLOSTI (JS knižnice):
//    1. MementoConfig (v8.0+) - Field names
// ==============================================
// 📚 CORE MODULY (GitHub):
//    - core/MementoConfig.js (v8.0+)
// ==============================================

// Check dependencies
if (typeof MementoConfig === 'undefined') {
    dialog()
        .title("Chýba MementoConfig")
        .text("❌ MementoConfig modul nie je načítaný.\n\nPridaj ho v Nastavenia → Skripty.")
        .positiveButton("OK", function() { return true; })
        .show();
    cancel();
}

try {
    var config = MementoConfig.getConfig();
    var currentEntry = entry();

    // Get logs from current entry
    var debugLog = currentEntry.field(config.fields.common.debugLog) || "";
    var errorLog = currentEntry.field(config.fields.common.errorLog) || "";
    var infoContent = currentEntry.field(config.fields.common.info) || "";

    // Check if there are any logs to copy
    if (!debugLog && !errorLog && !infoContent) {
        dialog()
            .title("Žiadne logy")
            .text("⚠️ Tento záznam neobsahuje žiadne logy.\n\nDebug_Log, Error_Log a info sú prázdne.")
            .positiveButton("OK", function() { return true; })
            .show();
        cancel();
    }

    // Get ASISTANTO Logs library
    var asistantoLogs = libByName("ASISTANTO Logs");
    if (!asistantoLogs) {
        dialog()
            .title("Chyba")
            .text("❌ Knižnica 'ASISTANTO Logs' nebola nájdená.")
            .positiveButton("OK", function() { return true; })
            .show();
        cancel();
    }

    // Get current date and metadata
    var now = new Date();
    var dateStr = now.getDate() + "." + (now.getMonth() + 1) + "." + now.getFullYear() + " " +
                  now.getHours() + ":" + (now.getMinutes() < 10 ? "0" : "") + now.getMinutes();

    // Create info summary
    var infoSummary = "# Manuálne vytvorený log\n\n";
    infoSummary += "**Zdroj:** " + lib().title + "\n";
    infoSummary += "**Dátum:** " + dateStr + "\n";
    infoSummary += "**Debug Log:** " + (debugLog ? "✅ Áno (" + debugLog.length + " znakov)" : "⚪ Nie") + "\n";
    infoSummary += "**Error Log:** " + (errorLog ? "❌ Áno (" + errorLog.length + " znakov)" : "⚪ Nie") + "\n";
    infoSummary += "**Info:** " + (infoContent ? "📋 Áno (" + infoContent.length + " znakov)" : "⚪ Nie") + "\n\n";
    infoSummary += "---\n";
    infoSummary += "Vytvorené manuálne pomocou action scriptu.";

    // Create log entry
    var logEntry = asistantoLogs.create({
        "date": now.getTime(),
        "library": lib().title,
        "script": "Manual Log Entry v1.0.0",
        "Debug_Log": debugLog,
        "Error_Log": errorLog,
        "info": infoSummary
    });

    if (!logEntry) {
        dialog()
            .title("Chyba")
            .text("❌ Nepodarilo sa vytvoriť záznam v ASISTANTO Logs.")
            .positiveButton("OK", function() { return true; })
            .show();
        cancel();
    }

    // Success
    var resultMsg = "✅ Log entry vytvorený v ASISTANTO Logs\n\n";
    resultMsg += "📋 Skopírované:\n";
    if (debugLog) resultMsg += "  • Debug_Log: " + debugLog.length + " znakov\n";
    if (errorLog) resultMsg += "  • Error_Log: " + errorLog.length + " znakov\n";
    if (infoContent) resultMsg += "  • Info: " + infoContent.length + " znakov\n";
    resultMsg += "\n📅 Dátum: " + dateStr;

    dialog()
        .title("Úspech")
        .text(resultMsg)
        .positiveButton("OK", function() { return true; })
        .show();

} catch (error) {
    dialog()
        .title("Chyba")
        .text("❌ Chyba pri vytváraní log entry:\n\n" + error.toString())
        .positiveButton("OK", function() { return true; })
        .show();
}
