// ==============================================
// DOCHÁDZKA - Debug Log Capture Test
// ==============================================
// Typ: Action
// Verzia: 1.0.0
// Dátum: 2026-03-19
// ==============================================
// 📋 FUNKCIA: Diagnostický script pre testovanie log capture mechanizmu
// 🔧 JS KNIŽNICE: MementoConfig, MementoLogCapture
// ==============================================
// ⚠️ POUŽITIE:
//    1. Spusti tento action na zázname s vyplneným Debug_Log alebo Error_Log
//    2. Sleduj messages - uvidia ti kde sa proces pokazí
//    3. Skontroluj ASISTANTO Logs library či sa vytvoril záznam
// ==============================================

message("🔍 START: Log capture debug");

// Step 1: Check modules
if (typeof MementoLogCapture !== 'undefined') {
    message("✅ MementoLogCapture loaded");
} else {
    message("❌ MementoLogCapture NOT loaded!");
}

if (typeof MementoConfig !== 'undefined') {
    message("✅ MementoConfig loaded");
} else {
    message("❌ MementoConfig NOT loaded!");
}

// Step 2: Get config
var config = MementoConfig.getConfig();
if (config) {
    message("✅ Config OK");
} else {
    message("❌ Config failed!");
}

// Step 3: Get field names and content
var debugFieldName = config.fields.common.debugLog;
var errorFieldName = config.fields.common.errorLog;

message("📋 Debug field name: " + debugFieldName);
message("📋 Error field name: " + errorFieldName);

var debugLog = entry().field(debugFieldName) || "";
var errorLog = entry().field(errorFieldName) || "";

message("📊 Debug Log length: " + debugLog.length + " chars");
message("📊 Error Log length: " + errorLog.length + " chars");

if (debugLog.length === 0 && errorLog.length === 0) {
    message("⚠️ Both logs are EMPTY!");
} else {
    message("✅ Logs have content");
}

// Step 4: Test libByName()
message("🔍 Testing libByName()...");

var asistantoLogs = libByName("ASISTANTO Logs");

if (asistantoLogs) {
    message("✅ Found ASISTANTO Logs library!");
    message("📚 Library title: " + asistantoLogs.title);
} else {
    message("❌ libByName() returned NULL!");
    message("⚠️ ASISTANTO Logs library NOT found!");
}

// Step 5: Try to create entry
if (asistantoLogs) {
    message("🔨 Attempting to create entry...");

    try {
        var logEntry = asistantoLogs.create();

        if (logEntry) {
            message("✅ Entry CREATED!");

            // Try to set fields
            try {
                logEntry.set("date", new Date());
                message("✅ Set date");

                logEntry.set("library", lib().title);
                message("✅ Set library = " + lib().title);

                logEntry.set("script", "Debug Test v1.0");
                message("✅ Set script name");

                logEntry.set("Debug_Log", debugLog);
                message("✅ Set Debug_Log (" + debugLog.length + " chars)");

                logEntry.set("Error_Log", errorLog);
                message("✅ Set Error_Log (" + errorLog.length + " chars)");

                logEntry.set("status", "✅ Test");
                message("✅ Set status");

                logEntry.set("info", "Test entry from debug script");
                message("✅ Set info");

                message("🎉 Entry COMPLETED successfully!");
                message("📍 Check ASISTANTO Logs library now!");

            } catch (setError) {
                message("❌ ERROR setting fields: " + setError.toString());
            }

        } else {
            message("❌ create() returned NULL!");
        }

    } catch (createError) {
        message("❌ ERROR creating entry: " + createError.toString());
    }

} else {
    message("⏭️ Skipping creation (library not found)");
}

message("🏁 END: Debug complete");
