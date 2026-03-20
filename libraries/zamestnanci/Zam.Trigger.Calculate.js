/**
 * Knižnica:    Zamestnanci
 * Názov:       Zam.Trigger.Calculate
 * Typ:         Trigger (After Save)
 * Verzia:      1.0.0
 * Autor:       ASISTANTO
 * Dátum:       2026-03-20
 *
 * Účel:
 *   Ultra-thin wrapper pre prepočet miezd zamestnanca.
 *   Všetka logika je v modules/Zamestnanci.js module.
 *
 * Závislosti:
 *   - MementoUtils v8.1+
 *   - Zamestnanci module v1.0+
 *
 * Changelog:
 *   v1.0.0 (2026-03-20) - Initial implementation
 *     - Ultra-thin wrapper pattern
 *     - Calls Zamestnanci.calculateWages()
 */

'use strict';

// ==============================================
// DEPENDENCY VALIDATION
// ==============================================

if (typeof MementoUtils === 'undefined') {
    message("❌ Chýba MementoUtils modul!");
    cancel();
}

if (typeof Zamestnanci === 'undefined') {
    message("❌ Chýba Zamestnanci modul!");
    cancel();
}

var utils = MementoUtils;

// ==============================================
// MAIN EXECUTION
// ==============================================

try {
    var result = Zamestnanci.calculateWages(entry(), utils.config, utils);

    if (!result.success) {
        var errorDetails = "❌ CHYBA PRI VÝPOČTE\n\n";
        errorDetails += "Chyba: " + (result.error || result.message) + "\n";
        dialog("Chyba pri výpočte miezd", errorDetails, "OK");
        cancel();
    }

} catch (error) {
    var errorDetails = "❌ KRITICKÁ CHYBA\n\n";
    errorDetails += "Script: Zam.Trigger.Calculate v1.0.0\n\n";
    errorDetails += "Chyba: " + error.toString() + "\n";

    dialog("Kritická chyba", errorDetails, "OK");
    cancel();
}
