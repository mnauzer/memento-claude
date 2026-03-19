// ==============================================
// DOCHÁDZKA - Ultra-Verbose Debug Log Capture Test v2
// ==============================================
// Typ: Action
// Verzia: 2.0.0
// Dátum: 2026-03-19
// ==============================================
// 📋 FUNKCIA: Najdetailnejší diagnostický test
// 🔧 JS KNIŽNICE: ŽIADNE (testujeme bez modulov)
// ==============================================

var messages = [];

function logMsg(msg) {
    messages.push(msg);
    // Don't show message() - only collect for final dialog
}

logMsg("🔍 START: Ultra-verbose debug v2");
logMsg("=" .repeat(40));

// Test 1: libByName() function exists?
logMsg("TEST 1: Checking libByName() function");
if (typeof libByName === 'function') {
    logMsg("✅ libByName is a function");
} else {
    logMsg("❌ libByName is NOT a function!");
    logMsg("Type: " + typeof libByName);
}

// Test 2: Try to get ASISTANTO Logs library
logMsg("=" .repeat(40));
logMsg("TEST 2: Getting ASISTANTO Logs library");

var targetLib = null;
try {
    targetLib = libByName("ASISTANTO Logs");
    if (targetLib) {
        logMsg("✅ Got library object");
        logMsg("Library title: " + targetLib.title);
        logMsg("Library type: " + typeof targetLib);
    } else {
        logMsg("❌ libByName returned NULL!");
    }
} catch (e) {
    logMsg("❌ ERROR calling libByName: " + e.toString());
}

// Test 3: If library found, try to create entry
if (targetLib) {
    logMsg("=" .repeat(40));
    logMsg("TEST 3: Creating entry");

    var newEntry = null;
    try {
        newEntry = targetLib.create();
        if (newEntry) {
            logMsg("✅ create() returned an object");
            logMsg("Entry type: " + typeof newEntry);
        } else {
            logMsg("❌ create() returned NULL!");
        }
    } catch (e) {
        logMsg("❌ ERROR calling create(): " + e.toString());
    }

    // Test 4: If entry created, try to set fields
    if (newEntry) {
        logMsg("=" .repeat(40));
        logMsg("TEST 4: Setting fields");

        // Field 1: date
        try {
            newEntry.set("date", new Date());
            logMsg("✅ Set 'date' field");
        } catch (e) {
            logMsg("❌ ERROR setting 'date': " + e.toString());
        }

        // Field 2: library
        try {
            newEntry.set("library", "TEST");
            logMsg("✅ Set 'library' field");
        } catch (e) {
            logMsg("❌ ERROR setting 'library': " + e.toString());
        }

        // Field 3: script
        try {
            newEntry.set("script", "Debug Test v2");
            logMsg("✅ Set 'script' field");
        } catch (e) {
            logMsg("❌ ERROR setting 'script': " + e.toString());
        }

        // Field 4: Debug_Log
        try {
            newEntry.set("Debug_Log", "This is a test debug log\nLine 2\nLine 3");
            logMsg("✅ Set 'Debug_Log' field");
        } catch (e) {
            logMsg("❌ ERROR setting 'Debug_Log': " + e.toString());
        }

        // Field 5: info
        try {
            newEntry.set("info", "Test info from debug script v2");
            logMsg("✅ Set 'info' field");
        } catch (e) {
            logMsg("❌ ERROR setting 'info': " + e.toString());
        }

        logMsg("=" .repeat(40));
        logMsg("TEST 5: Verifying entry exists");

        // Try to read back the library and find our entry
        try {
            var entries = targetLib.entries();
            if (entries && entries.length > 0) {
                logMsg("✅ Library has " + entries.length + " entries");
                logMsg("First entry: " + entries[0].field("script"));
            } else {
                logMsg("⚠️ Library has 0 entries (entry might be deleted?)");
            }
        } catch (e) {
            logMsg("❌ ERROR reading entries: " + e.toString());
        }

        logMsg("=" .repeat(40));
        logMsg("🎉 TEST COMPLETE!");
        logMsg("Check ASISTANTO Logs library NOW!");

    } else {
        logMsg("⏭️ Skipping field tests (no entry created)");
    }

} else {
    logMsg("⏭️ Skipping create test (library not found)");
}

logMsg("=" .repeat(40));
logMsg("🏁 END: Debug complete");

// Show all messages in final dialog
var fullLog = messages.join("\n");
dialog("Debug Results", fullLog, "OK");
