// ==============================================
// DOCHÁDZKA - Ultra-Verbose Debug Log Capture Test v3 (FIXED)
// ==============================================
// Typ: Action
// Verzia: 3.0.0
// Dátum: 2026-03-19
// ==============================================
// 📋 FUNKCIA: Diagnostický test s GARANTOVANÝM dialog() output
// 🔧 JS KNIŽNICE: ŽIADNE (testujeme bez modulov)
// ==============================================
// FIXES:
// - Wrapped entire script in master try/catch
// - Shows dialog IMMEDIATELY to confirm dialog() works
// - Shows intermediate dialogs after each step
// - GUARANTEES final dialog will show even if operations fail
// ==============================================

// CRITICAL: Wrap entire script in try/catch to prevent silent failures
try {

var messages = [];

function logMsg(msg) {
    messages.push(msg);
    log(msg); // Also log to Memento console
}

// ====================================================
// STEP 0: IMMEDIATE DIALOG TEST
// ====================================================
// Show dialog RIGHT NOW to confirm it works
dialog("🔍 Debug v3 Started", "If you see this, dialog() works!\n\nNow running tests...", "OK");

logMsg("🔍 START: Ultra-verbose debug v3 (FIXED)");
logMsg("=".repeat(40));

// ====================================================
// TEST 1: Check libByName() function
// ====================================================
logMsg("TEST 1: Checking libByName() function");
if (typeof libByName === 'function') {
    logMsg("✅ libByName is a function");
} else {
    logMsg("❌ libByName is NOT a function!");
    logMsg("Type: " + typeof libByName);
}

// Show intermediate result
var step1Result = messages.join("\n");
dialog("Step 1 Complete", step1Result, "OK");

// ====================================================
// TEST 2: Try to get ASISTANTO Logs library
// ====================================================
logMsg("=".repeat(40));
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
    logMsg("Stack: " + (e.stack || "No stack trace"));
}

// Show intermediate result
var step2Result = messages.join("\n");
dialog("Step 2 Complete", step2Result, "OK");

// ====================================================
// TEST 3: If library found, try to create entry
// ====================================================
if (targetLib) {
    logMsg("=".repeat(40));
    logMsg("TEST 3: Creating entry");

    var newEntry = null;
    try {
        newEntry = targetLib.create();
        if (newEntry) {
            logMsg("✅ create() returned an object");
            logMsg("Entry type: " + typeof newEntry);

            // Try to get entry ID immediately
            if (newEntry.id) {
                logMsg("Entry ID: " + newEntry.id);
            } else {
                logMsg("⚠️ Entry has no ID yet (might need commit)");
            }
        } else {
            logMsg("❌ create() returned NULL!");
        }
    } catch (e) {
        logMsg("❌ ERROR calling create(): " + e.toString());
        logMsg("Stack: " + (e.stack || "No stack trace"));
    }

    // Show intermediate result
    var step3Result = messages.join("\n");
    dialog("Step 3 Complete", step3Result, "OK");

    // ====================================================
    // TEST 4: If entry created, try to set fields
    // ====================================================
    if (newEntry) {
        logMsg("=".repeat(40));
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
            newEntry.set("script", "Debug Test v3 FIXED");
            logMsg("✅ Set 'script' field");
        } catch (e) {
            logMsg("❌ ERROR setting 'script': " + e.toString());
        }

        // Field 4: Debug_Log
        try {
            var testLog = "This is a test debug log from v3\n";
            testLog += "Line 2: Testing multi-line\n";
            testLog += "Line 3: Final line";
            newEntry.set("Debug_Log", testLog);
            logMsg("✅ Set 'Debug_Log' field");
        } catch (e) {
            logMsg("❌ ERROR setting 'Debug_Log': " + e.toString());
        }

        // Field 5: info
        try {
            newEntry.set("info", "Test info from debug script v3 FIXED");
            logMsg("✅ Set 'info' field");
        } catch (e) {
            logMsg("❌ ERROR setting 'info': " + e.toString());
        }

        // Show intermediate result
        var step4Result = messages.join("\n");
        dialog("Step 4 Complete", step4Result, "OK");

        // ====================================================
        // TEST 5: Verify entry exists in library
        // ====================================================
        logMsg("=".repeat(40));
        logMsg("TEST 5: Verifying entry exists");

        try {
            var entries = targetLib.entries();
            if (entries && entries.length > 0) {
                logMsg("✅ Library has " + entries.length + " entries");

                // Try to find our entry
                var found = false;
                for (var i = 0; i < Math.min(entries.length, 5); i++) {
                    var scriptName = entries[i].field("script");
                    logMsg("Entry " + (i+1) + ": " + scriptName);
                    if (scriptName && scriptName.indexOf("Debug Test v3") >= 0) {
                        found = true;
                        logMsg("✅ FOUND our test entry!");
                    }
                }

                if (!found) {
                    logMsg("⚠️ Our entry not found in recent 5 entries");
                }
            } else {
                logMsg("⚠️ Library has 0 entries (entry might be deleted?)");
            }
        } catch (e) {
            logMsg("❌ ERROR reading entries: " + e.toString());
        }

        logMsg("=".repeat(40));
        logMsg("🎉 TEST COMPLETE!");
        logMsg("Check ASISTANTO Logs library NOW!");

    } else {
        logMsg("⏭️ Skipping field tests (no entry created)");
    }

} else {
    logMsg("⏭️ Skipping create test (library not found)");
}

logMsg("=".repeat(40));
logMsg("🏁 END: Debug complete");

// ====================================================
// FINAL DIALOG - GUARANTEED TO SHOW
// ====================================================
var fullLog = messages.join("\n");
dialog("🏁 Final Debug Results v3", fullLog, "OK");

} catch (masterError) {
    // ====================================================
    // MASTER ERROR HANDLER - ABSOLUTELY GUARANTEED TO SHOW
    // ====================================================
    var errorMsg = "❌ MASTER ERROR - SCRIPT CRASHED!\n\n";
    errorMsg += "Error: " + masterError.toString() + "\n\n";
    errorMsg += "Stack: " + (masterError.stack || "No stack trace") + "\n\n";
    errorMsg += "This dialog proves the script reached an error.\n";
    errorMsg += "Check the error message above for details.";

    dialog("🔥 CRITICAL ERROR", errorMsg, "OK");
}
