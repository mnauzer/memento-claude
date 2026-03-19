// ==============================================
// TEST - Správna syntax pre create()
// ==============================================
// Podľa oficiálnej Memento dokumentácie:
// https://scripts.mementodatabase.com/script_api/library/
// ==============================================

var result = "";

// KROK 1: Získaj knižnicu
result += "KROK 1: Získavam ASISTANTO Logs...\n";
var targetLib = libByName("ASISTANTO Logs");

if (targetLib) {
    result += "✅ Knižnica nájdená: " + targetLib.title + "\n\n";

    // KROK 2: Vytvor záznam so SPRÁVNOU syntax
    result += "KROK 2: Vytváram záznam...\n";

    try {
        // SPRÁVNA syntax: create({ field: value })
        var newEntry = targetLib.create({
            "date": new Date().getTime(),
            "library": "TEST",
            "script": "test-create-correct.js",
            "Debug_Log": "Test debug log\nRiadok 2\nRiadok 3",
            "Error_Log": "",
            "info": "Test entry vytvorený správnou syntax"
        });

        if (newEntry) {
            result += "✅ Záznam VYTVORENÝ!\n";
            result += "Entry type: " + typeof newEntry + "\n\n";

            // Overenie - skús prečítať záznamy
            var entries = targetLib.entries();
            result += "OVERENIE: Knižnica má " + entries.length + " záznamov\n";

        } else {
            result += "❌ create() vrátil null\n";
        }

    } catch (e) {
        result += "❌ CHYBA: " + e.toString() + "\n";
    }

} else {
    result += "❌ Knižnica ASISTANTO Logs sa nenašla!\n";
}

// Ukáž výsledok v dialógu so SPRÁVNOU syntax
dialog()
    .title("Test Results - Correct Syntax")
    .text(result)
    .positiveButton("OK", function() {
        return true;
    })
    .negativeButton("Check Library", function() {
        message("Skontroluj ASISTANTO Logs library!");
        return true;
    })
    .show();
