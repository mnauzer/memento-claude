// ==============================================
// MEMENTO DATABASE - PREČÍSLOVANIE KNIŽNICE - SIMPLE TEST
// Verzia: 1.0 | Dátum: September 2025 | Autor: ASISTANTO
// ==============================================

// Jednoduchý test logging do ASISTANTO Logs
var CONFIG = {
    logsLibrary: "ASISTANTO Logs"
};

var logEntry = null;

function simpleTest() {
    try {
        // Test 1: Základné objekty
        var info = "=== SIMPLE TEST ===\n";
        info += "lib: " + (lib ? lib.name : "NULL") + "\n";
        info += "libByName: " + (typeof libByName) + "\n";
        info += "moment: " + (typeof moment) + "\n";

        dialog()
            .title("Test Info")
            .text(info)
            .positiveButton("Pokračovať", function() {
                testLogCreation();
            })
            .show();

    } catch (error) {
        dialog()
            .title("CHYBA")
            .text("Chyba v simpleTest: " + error.toString())
            .positiveButton("OK", function() {})
            .show();
    }
}

function testLogCreation() {
    try {
        // Test 2: Vytvorenie log záznamu
        var logsLib = libByName(CONFIG.logsLibrary);
        if (!logsLib) {
            dialog()
                .title("CHYBA")
                .text("Knižnica '" + CONFIG.logsLibrary + "' nenájdená!")
                .positiveButton("OK", function() {})
                .show();
            return;
        }

        // Vytvor záznam
        logEntry = logsLib.create();

        // Nastav základné údaje
        logEntry.set("date", new Date());
        logEntry.set("library", lib ? lib.name : "Test");
        logEntry.set("user", "Simple Test User");
        logEntry.set("Debug_Log", "TEST LOG CREATED\n");
        logEntry.set("Error_Log", "");

        // Ulož záznam
        logEntry.save();

        dialog()
            .title("ÚSPECH")
            .text("✅ Log záznam vytvorený a uložený!\n\nKnižnica: " + CONFIG.logsLibrary + "\nDátum: " + new Date().toLocaleString())
            .positiveButton("Test Debug", function() {
                testDebugLog();
            })
            .show();

    } catch (error) {
        dialog()
            .title("CHYBA")
            .text("Chyba pri vytváraní log záznamu:\n\n" + error.toString() +
                  (error.lineNumber ? "\nRiadok: " + error.lineNumber : ""))
            .positiveButton("OK", function() {})
            .show();
    }
}

function testDebugLog() {
    try {
        if (!logEntry) {
            dialog()
                .title("CHYBA")
                .text("logEntry je NULL!")
                .positiveButton("OK", function() {})
                .show();
            return;
        }

        // Pridaj debug správu
        var timestamp = moment().format("DD.MM.YY HH:mm");
        var debugMessage = "[" + timestamp + "] 🧪 TEST DEBUG MESSAGE";

        var existingDebug = logEntry.field("Debug_Log") || "";
        logEntry.set("Debug_Log", existingDebug + debugMessage + "\n");

        dialog()
            .title("ÚSPECH")
            .text("✅ Debug správa pridaná!\n\n" + debugMessage + "\n\nSkontroluj záznam v knižnici " + CONFIG.logsLibrary)
            .positiveButton("OK", function() {})
            .show();

    } catch (error) {
        dialog()
            .title("CHYBA")
            .text("Chyba pri debug logu:\n\n" + error.toString() +
                  (error.lineNumber ? "\nRiadok: " + error.lineNumber : ""))
            .positiveButton("OK", function() {})
            .show();
    }
}

// Spustenie testu
simpleTest();