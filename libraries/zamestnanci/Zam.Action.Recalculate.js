/**
 * Knižnica:    Zamestnanci
 * Názov:       Zam.Action.Recalculate
 * Typ:         Action (Button)
 * Verzia:      1.0.0
 * Autor:       ASISTANTO
 * Dátum:       2026-03-20
 *
 * Účel:
 *   Button action pre manuálny prepočet miezd zamestnanca.
 *   Používateľ klikne na button → spustí sa prepočet.
 *
 * Použitie:
 *   1. Pridaj Button widget do formulára
 *   2. Nastav script na tento súbor
 *   3. Klikni na button → prepočíta polia
 *
 * Závislosti:
 *   - MementoUtils v8.1+
 *   - Zamestnanci module v1.3+
 *
 * Changelog:
 *   v1.0.0 (2026-03-20) - Initial implementation
 *     - Manual recalculation via button click
 *     - Full error handling with dialog
 *     - Success confirmation message
 */

'use strict';

// ==============================================
// DEPENDENCY VALIDATION
// ==============================================

if (typeof MementoUtils === 'undefined') {
    dialog("Chyba závislostí", "❌ Chýba MementoUtils modul!\n\nSkontrolujte či je modul načítaný v Nastavenia → Skripty.", "OK");
    cancel();
}

if (typeof Zamestnanci === 'undefined') {
    dialog("Chyba závislostí", "❌ Chýba Zamestnanci modul!\n\nSkontrolujte či je modul načítaný v Nastavenia → Skripty.", "OK");
    cancel();
}

var utils = MementoUtils;
var currentEntry = entry();

var SCRIPT_VERSION = "1.0.0";
var SCRIPT_NAME = "Zam.Action.Recalculate";

// ==============================================
// MAIN EXECUTION
// ==============================================

try {
    // Get employee name
    var employeeName = currentEntry.field("Nick") || "N/A";

    // Confirmation dialog
    var confirm = dialog(
        "Prepočet miezd",
        "🔄 Prepočítať mzdy pre: " + employeeName + "?\n\n" +
        "Prepočítajú sa polia:\n" +
        "• Odpracované / Odpracované total\n" +
        "• Zarobené / Zarobené total\n" +
        "• Prémie / Prémie total\n\n" +
        "Pokračovať?",
        "Áno",
        "Zrušiť"
    );

    if (confirm !== 0) {
        // User clicked "Zrušiť"
        cancel();
    }

    // Clear Debug_Log for fresh calculation
    currentEntry.set("Debug_Log", "");

    // Add start log
    utils.addDebug(currentEntry, "🔄 " + SCRIPT_NAME + " v" + SCRIPT_VERSION);
    utils.addDebug(currentEntry, "👤 Zamestnanec: " + employeeName);

    // Call Zamestnanci module
    var result = Zamestnanci.calculateWages(currentEntry, utils.config, utils);

    if (!result.success) {
        // Error occurred
        var errorMsg = "❌ CHYBA PRI PREPOČTE\n\n";
        errorMsg += "Zamestnanec: " + employeeName + "\n\n";
        errorMsg += "Chyba: " + (result.error || result.message) + "\n\n";
        errorMsg += "Skontrolujte Debug_Log pre viac informácií.";

        utils.addError(currentEntry, "Chyba pri výpočte: " + (result.error || result.message), SCRIPT_NAME);

        dialog("Chyba prepočtu", errorMsg, "OK");
        cancel();
    }

    // Success!
    utils.addDebug(currentEntry, "✅ Prepočet dokončený úspešne");

    // Get calculated values for display
    var odpracovane = currentEntry.field("Odpracované") || 0;
    var zarobene = currentEntry.field("Zarobené") || 0;
    var premie = currentEntry.field("Prémie") || 0;

    var odpracovaneTotal = currentEntry.field("Odpracované total") || 0;
    var zarobeneTotal = currentEntry.field("Zarobené total") || 0;
    var premieTotal = currentEntry.field("Prémie total") || 0;

    // Success dialog
    var successMsg = "✅ PREPOČET DOKONČENÝ\n\n";
    successMsg += "👤 Zamestnanec: " + employeeName + "\n\n";
    successMsg += "📊 ZÁKLADNÉ POLIA:\n";
    successMsg += "• Odpracované: " + odpracovane.toFixed(2) + " h\n";
    successMsg += "• Zarobené: " + zarobene.toFixed(2) + " €\n";
    successMsg += "• Prémie: " + premie.toFixed(2) + " €\n\n";
    successMsg += "📊 TOTAL POLIA:\n";
    successMsg += "• Odpracované total: " + odpracovaneTotal.toFixed(2) + " h\n";
    successMsg += "• Zarobené total: " + zarobeneTotal.toFixed(2) + " €\n";
    successMsg += "• Prémie total: " + premieTotal.toFixed(2) + " €\n\n";
    successMsg += "Skontrolujte Debug_Log a info pole pre detaily.";

    dialog("Prepočet dokončený", successMsg, "OK");

} catch (error) {
    // Critical error
    var criticalMsg = "❌ KRITICKÁ CHYBA\n\n";
    criticalMsg += "Script: " + SCRIPT_NAME + " v" + SCRIPT_VERSION + "\n\n";
    criticalMsg += "Chyba: " + error.toString() + "\n\n";

    if (error.stack) {
        criticalMsg += "Stack trace:\n" + error.stack.substring(0, 200);
    }

    utils.addError(currentEntry, "KRITICKÁ CHYBA: " + error.toString(), SCRIPT_NAME, error);

    dialog("Kritická chyba", criticalMsg, "OK");
    cancel();
}
