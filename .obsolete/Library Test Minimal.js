// ==============================================
// MINIMAL TEST PRE MEMENTO DATABASE
// ==============================================

function minimalTest() {
    try {
        // Test 1: libByName
        dialog()
            .title("Test 1")
            .text("Testujem libByName...")
            .positiveButton("OK", function() {
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
        var logsLib = libByName("ASISTANTO Logs");

        if (!logsLib) {
            dialog()
                .title("Test 2 - NEÚSPECH")
                .text("Knižnica 'ASISTANTO Logs' nenájdená!")
                .positiveButton("OK", function() {})
                .show();
            return;
        }

        dialog()
            .title("Test 2 - ÚSPECH")
            .text("Knižnica 'ASISTANTO Logs' nájdená!")
            .positiveButton("Test 3", function() {
                test3(logsLib);
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

function test3(logsLib) {
    try {
        dialog()
            .title("Test 3")
            .text("Testujem create()...")
            .positiveButton("OK", function() {
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
        var newEntry = logsLib.create();

        dialog()
            .title("Test 4 - ÚSPECH")
            .text("Entry vytvorený! Typ: " + typeof newEntry)
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

function test5(entry) {
    try {
        entry.set("date", new Date());

        dialog()
            .title("Test 5 - ÚSPECH")
            .text("Dátum nastavený!")
            .positiveButton("Test 6", function() {
                test6(entry);
            })
            .show();

    } catch (error) {
        dialog()
            .title("CHYBA Test 5")
            .text("Error pri set(): " + error.toString())
            .positiveButton("OK", function() {})
            .show();
    }
}

function test6(entry) {
    try {
        entry.save();

        dialog()
            .title("Test 6 - ÚSPECH")
            .text("Entry uložený! Všetko funguje!")
            .positiveButton("OK", function() {})
            .show();

    } catch (error) {
        dialog()
            .title("CHYBA Test 6")
            .text("Error pri save(): " + error.toString())
            .positiveButton("OK", function() {})
            .show();
    }
}

// Spusti test
minimalTest();