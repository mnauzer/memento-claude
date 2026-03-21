/**
 * ============================================================================
 * Knižnica:  Pokladňa | Event: Action | Verzia: 1.0.0
 * ============================================================================
 * THIN WRAPPER - všetka logika je v Pokladna.js module (v1.0.0+)
 *
 * Event Type: ACTION
 * Scope: ENTRY
 *
 * Použitie: Uhradenie záväzkov z pokladničnej transakcie (rozdelenie platby,
 *           započítanie pohľadávok, spracovanie preplatku)
 *
 * ============================================================================
 * MEMENTO SETUP:
 * ============================================================================
 * 1. Global Scripts (Load Order):
 *    - MementoConfig (v8.0+)
 *    - MementoCore (v8.0+)
 *    - MementoUtils (v8.1+)
 *    - MementoVAT (v1.0+)
 *    - Pokladna (v1.0.0+)
 *
 * 2. Pokladňa → Automation → Akcie (Actions):
 *    Scope: Entry
 *    Action Name: "Uhradiť záväzky"
 * ============================================================================
 */

'use strict';

// ==============================================
// DEPENDENCY VALIDATION
// ==============================================

if (typeof Pokladna === 'undefined') {
    dialog("Chyba", "❌ Chýba Pokladna.js modul!\n\nNahrajte modul v Global Scripts.", "OK");
    cancel();
}

// ==============================================
// MAIN EXECUTION - Action
// ==============================================

try {
    var currentEntry = entry();
    var utils = typeof MementoUtils !== 'undefined' ? MementoUtils : null;
    var config = typeof MementoConfig !== 'undefined' ? MementoConfig.getConfig() : null;

    // Call module to pay obligations
    var result = Pokladna.payObligations(currentEntry, {
        utils: utils,
        config: config
    });

    if (!result.success) {
        dialog("Chyba", "❌ Úhrada záväzkov zlyhala!\n\n" + result.error, "OK");
        cancel();
    }

    // Success - show payment details
    var successMsg = "✅ Záväzky uhradené!\n\n";
    successMsg += "Uhradené záväzky: " + (result.uhradeneZavazky || 0) + "\n";
    successMsg += "Použitá suma: " + (result.pouzitaSuma || 0).toFixed(2) + " €\n";
    if (result.preplatok > 0) {
        successMsg += "Preplatok: " + result.preplatok.toFixed(2) + " €\n";
    }
    if (result.pouzitePohladavky && result.pouzitePohladavky.length > 0) {
        successMsg += "Započítané pohľadávky: " + result.pouzitePohladavky.length;
    }

    dialog("Úspech", successMsg, "OK");

} catch (error) {
    dialog("Kritická chyba", "❌ KRITICKÁ CHYBA!\n\n" + error.toString(), "OK");
    cancel();
}
