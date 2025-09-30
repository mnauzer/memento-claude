// ==============================================
// SPRÁVNY TEST PRE MEMENTO DATABASE API
// ==============================================

function correctTest() {
    try {
        // Test 1: Základné objekty
        var info = "=== SPRÁVNY MEMENTO TEST ===\n";
        info += "lib(): " + (typeof lib) + "\n";
        info += "libByName(): " + (typeof libByName) + "\n";
        info += "entry(): " + (typeof entry) + "\n";

        dialog()
            .title("Test 1 - Objekty")
            .text(info)
            .positiveButton("Test 2", function() {
                test2();
            })
            .show();

    } catch (error) {
        dialog()
            .title("CHYBA Test 1")
            .text("Error: " + error.toString())
            .positiveButton("OK", function() {})
            .show();
    }
}

function test2() {
    try {
        // Test 2: Aktuálna knižnica
        var currentLib = lib();

        dialog()
            .title("Test 2 - Current Library")
            .text("Aktuálna knižnica: " + (currentLib ? currentLib.name : "NULL"))
            .positiveButton("Test 3", function() {
                test3();
            })
            .show();

    } catch (error) {
        dialog()
            .title("CHYBA Test 2")
            .text("Error: " + error.toString())
            .positiveButton("OK", function() {})
            .show();
    }
}

function test3() {
    try {
        // Test 3: Nájdi ASISTANTO Logs knižnicu
        var logsLib = libByName("ASISTANTO Logs");

        if (!logsLib) {
            dialog()
                .title("Test 3 - NEÚSPECH")
                .text("Knižnica 'ASISTANTO Logs' nenájdená!")
                .positiveButton("OK", function() {})
                .show();
            return;
        }

        dialog()
            .title("Test 3 - ÚSPECH")
            .text("ASISTANTO Logs nájdená!\nNázov: " + logsLib.name)
            .positiveButton("Test 4", function() {
                test4(logsLib);
            })
            .show();

    } catch (error) {
        dialog()
            .title("CHYBA Test 3")
            .text("Error: " + error.toString())
            .positiveButton("OK", function() {})
            .show();
    }
}

function test4(logsLib) {
    try {
        // Test 4: Vytvor záznam SPRÁVNE - podľa dokumentácie
        var newEntry = logsLib.create({
            "date": new Date(),
            "library": lib().name,
            "user": "Test User",
            "Debug_Log": "TEST LOG CREATED CORRECTLY\n",
            "Error_Log": ""
        });

        dialog()
            .title("Test 4 - ÚSPECH")
            .text("Záznam vytvorený správne!\nTyp: " + typeof newEntry)
            .positiveButton("Test 5", function() {
                test5(newEntry);
            })
            .show();

    } catch (error) {
        dialog()
            .title("CHYBA Test 4")
            .text("Error pri create(): " + error.toString())
            .positiveButton("OK", function() {})
            .show();
    }
}

function test5(logEntry) {
    try {
        // Test 5: Pridaj debug správu pomocou set()
        var timestamp = moment().format("DD.MM.YY HH:mm");
        var debugMessage = "[" + timestamp + "] 🧪 TEST DEBUG MESSAGE\n";

        var existingDebug = logEntry.field("Debug_Log") || "";
        logEntry.set("Debug_Log", existingDebug + debugMessage);

        dialog()
            .title("Test 5 - ÚSPECH")
            .text("Debug správa pridaná!\n\n" + debugMessage + "\nSkontroluj knižnicu ASISTANTO Logs")
            .positiveButton("OK", function() {})
            .show();

    } catch (error) {
        dialog()
            .title("CHYBA Test 5")
            .text("Error pri set(): " + error.toString())
            .positiveButton("OK", function() {})
            .show();
    }
}

// Spusti správny test
correctTest();