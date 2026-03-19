// ==============================================
// CENOVÉ PONUKY - Automatické zachytávanie logov
// ==============================================
// Typ: Trigger
// Udalosť: Aktualizácia záznamu
// Fáza: Po uložení záznamu
// Verzia: 1.0.0
// Dátum: 2026-03-19
// ==============================================
// 📋 FUNKCIA: Automaticky kopíruje Debug_Log a Error_Log do ASISTANTO Logs
// 🔧 JS KNIŽNICE: MementoLogCapture
// ==============================================
// ⚠️ POZOR: Tento trigger sa spúšťa PO každom uložení záznamu
//           Zachytáva logy len ak Debug_Log alebo Error_Log obsahuje dáta
// ==============================================

// Check dependencies
if (typeof MementoLogCapture === 'undefined') {
    // Module not loaded - silently skip
    return;
}

if (typeof MementoConfig === 'undefined') {
    // Config not loaded - silently skip
    return;
}

// Get config
var config = MementoConfig.getConfig();
if (!config) {
    return;
}

// Get field names
var debugFieldName = config.fields.common.debugLog;
var errorFieldName = config.fields.common.errorLog;

// Get log content
var debugLog = entry().field(debugFieldName) || "";
var errorLog = entry().field(errorFieldName) || "";

// Skip if no logs to capture
if (debugLog.trim().length === 0 && errorLog.trim().length === 0) {
    return;
}

// Create log entry in ASISTANTO Logs
var logEntry = MementoLogCapture.createLogEntry(
    lib().title,
    "Auto-capture (AfterSave)",
    "1.0.0"
);

if (!logEntry) {
    // Failed to create log entry - ASISTANTO Logs library not found
    return;
}

// Copy logs from current entry
logEntry.set("Debug_Log", debugLog);
logEntry.set("Error_Log", errorLog);

// Set status based on errors
var status = errorLog.trim().length > 0 ? "❌ Error" : "✅ Success";
logEntry.set("status", status);

// Add summary info
var infoText = "# Automaticky zachytené logy\n\n";
infoText += "**Zdroj:** " + lib().title + "\n";
infoText += "**Dátum:** " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
infoText += "**Debug Log:** " + (debugLog.trim().length > 0 ? "✅" : "⚪") + "\n";
infoText += "**Error Log:** " + (errorLog.trim().length > 0 ? "❌" : "⚪") + "\n";
logEntry.set("info", infoText);

// Note: No need to explicitly save - Memento auto-saves
// Note: No message() - runs silently to avoid interrupting user
