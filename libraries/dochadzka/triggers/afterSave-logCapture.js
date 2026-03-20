// ==============================================
// DOCHÁDZKA - Automatické zachytávanie logov
// ==============================================
// Typ: Trigger
// Udalosť: Aktualizácia záznamu
// Fáza: Po uložení záznamu
// Verzia: 2.0.1
// Dátum: 2026-03-20
// ==============================================
// 📋 FUNKCIA:
//    - Automaticky kopíruje Debug_Log a Error_Log do ASISTANTO Logs library
//    - Beží PO každom uložení záznamu
//    - Zachytáva logy len ak Debug_Log alebo Error_Log obsahuje dáta
//    - Umožňuje Claude Code čítať logy cez MCP tools
// ==============================================
// 🔗 ZÁVISLOSTI (JS knižnice - pridaj v Memento v TOMTO PORADÍ):
//    1. MementoConfig (v8.0+) - Konfigurácia field names
//    2. MementoLogCapture (v1.1.0+) - Log capture modul
// ==============================================
// 📚 CORE MODULY (potrebné z GitHub):
//    - core/MementoConfig.js (v8.0+)
//    - core/MementoLogCapture.js (v1.1.0+)
// ==============================================
// 🔧 CHANGELOG v2.0.1:
//    - FIX: Date formatting in info field (use new Date() instead of moment())
//    - Prevents serialized function output in info field
// 🔧 CHANGELOG v2.0.0:
//    - Updated for MementoLogCapture v1.1.0 (correct create() syntax)
//    - Added comprehensive dependency documentation
//    - Verified correct Memento API usage
// 🔧 CHANGELOG v1.0.1:
//    - FIX: Removed invalid 'return' statements
//    - Changed to nested if blocks
// ==============================================

// Check dependencies and execute only if all requirements met
if (typeof MementoLogCapture !== 'undefined' && typeof MementoConfig !== 'undefined') {

    // Get config
    var config = MementoConfig.getConfig();

    if (config) {
        // Get field names from config
        var debugFieldName = config.fields.common.debugLog;
        var errorFieldName = config.fields.common.errorLog;

        // Get log content from current entry
        var debugLog = entry().field(debugFieldName) || "";
        var errorLog = entry().field(errorFieldName) || "";

        // Only proceed if there are logs to capture
        if (debugLog.trim().length > 0 || errorLog.trim().length > 0) {

            // Create log entry in ASISTANTO Logs using MementoLogCapture module
            var logEntry = MementoLogCapture.createLogEntry(
                lib().title,
                "Auto-capture (AfterSave)",
                "2.0.1"
            );

            if (logEntry) {
                // Copy logs from current entry to ASISTANTO Logs entry
                logEntry.set("Debug_Log", debugLog);
                logEntry.set("Error_Log", errorLog);

                // Add summary info (markdown formatted)
                var infoText = "# Automaticky zachytené logy\n\n";
                infoText += "**Zdroj:** " + lib().title + "\n";

                // Format current date safely (avoid moment() issues in triggers)
                var now = new Date();
                var dateStr = now.getDate() + "." + (now.getMonth() + 1) + "." + now.getFullYear() + " " +
                              now.getHours() + ":" + (now.getMinutes() < 10 ? "0" : "") + now.getMinutes();
                infoText += "**Dátum:** " + dateStr + "\n";

                infoText += "**Debug Log:** " + (debugLog.trim().length > 0 ? "✅ Áno" : "⚪ Nie") + "\n";
                infoText += "**Error Log:** " + (errorLog.trim().length > 0 ? "❌ Áno" : "⚪ Nie") + "\n";
                logEntry.set("info", infoText);

                // Note: No need to explicitly save - Memento auto-saves
                // Note: No message() - runs silently to avoid interrupting user workflow
            }
        }
    }
}
