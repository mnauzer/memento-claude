/**
 * ============================================================================
 * TEST SCRIPT - Diagnostika CP.AutoNumber.Lib
 * ============================================================================
 *
 * Spusti tento script v Memento Database pre diagnostiku chyby "script: null"
 */

var output = "📋 TEST CP.AutoNumber.Lib\n";
output += "═════════════════════════════════════════\n\n";

try {
    // Test 1: Kontrola či CPAutoNumber namespace existuje
    output += "TEST 1: Existencia CPAutoNumber namespace\n";
    if (typeof CPAutoNumber === 'undefined') {
        output += "  ❌ CPAutoNumber namespace NEEXISTUJE!\n";
        output += "  → CP.AutoNumber.Lib.js nie je načítaný ako Shared Script\n";
    } else {
        output += "  ✅ CPAutoNumber namespace existuje\n";

        // Test 2: Kontrola funkcií
        output += "\nTEST 2: Dostupné funkcie v namespace\n";
        if (CPAutoNumber.generateNumber) {
            output += "  ✅ generateNumber: dostupná\n";
        } else {
            output += "  ❌ generateNumber: CHÝBA!\n";
        }

        if (CPAutoNumber.isLoaded) {
            output += "  ✅ isLoaded: dostupná\n";
            try {
                var loaded = CPAutoNumber.isLoaded();
                output += "      Výsledok: " + loaded + "\n";
            } catch (e) {
                output += "      ❌ Chyba pri volaní: " + e.toString() + "\n";
            }
        } else {
            output += "  ❌ isLoaded: CHÝBA!\n";
        }

        // Test 3: Kontrola metadát
        output += "\nTEST 3: Metadata\n";
        output += "  Verzia: " + (CPAutoNumber.version || "N/A") + "\n";
        output += "  Popis: " + (CPAutoNumber.description || "N/A") + "\n";
    }

    // Test 4: Kontrola globálnych funkcií
    output += "\nTEST 4: Globálne funkcie (spätná kompatibilita)\n";
    if (typeof autoGenerateNumber === 'function') {
        output += "  ✅ autoGenerateNumber: dostupná\n";
    } else {
        output += "  ❌ autoGenerateNumber: CHÝBA!\n";
    }

    // Test 5: Pokus o zavolanie funkcie
    output += "\nTEST 5: Pokus o generovanie čísla\n";
    if (typeof CPAutoNumber !== 'undefined' && CPAutoNumber.generateNumber) {
        try {
            var result = CPAutoNumber.generateNumber(
                "Cenové ponuky",
                "Číslo",
                "CP Placeholder"
            );

            if (result.success) {
                output += "  ✅ ÚSPECH!\n";
                output += "      Vygenerované číslo: " + result.number + "\n";
                output += "      Prefix: " + result.prefix + "\n";
                output += "      Sekvencia: " + result.sequence + "\n";
            } else {
                output += "  ⚠️ Funkcia sa vykonala, ale vrátila chybu:\n";
                output += "      " + result.error + "\n";
            }
        } catch (e) {
            output += "  ❌ CHYBA pri volaní funkcie:\n";
            output += "      " + e.toString() + "\n";
            output += "      Stack: " + (e.stack || "N/A") + "\n";
        }
    } else {
        output += "  ⏭️ Preskočené (funkcia nedostupná)\n";
    }

} catch (error) {
    output += "\n❌ KRITICKÁ CHYBA V TESTE:\n";
    output += error.toString() + "\n";
    if (error.stack) {
        output += "\nStack trace:\n" + error.stack + "\n";
    }
}

output += "\n═════════════════════════════════════════\n";
output += "✅ TEST DOKONČENÝ\n";

// Zobraz výsledok
var currentEntry = entry();
currentEntry.set("Debug_Log", output);
message("✅ Výsledok testu v Debug_Log");
