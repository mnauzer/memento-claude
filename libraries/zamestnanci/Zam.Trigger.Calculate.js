/**
 * Knižnica:    Zamestnanci
 * Názov:       Zam.Trigger.Calculate
 * Typ:         Trigger (After Save - Field Update)
 * Verzia:      1.1.0
 * Autor:       ASISTANTO
 * Dátum:       2026-03-20
 *
 * Účel:
 *   Ultra-thin wrapper pre prepočet miezd zamestnanca.
 *   Všetka logika je v modules/Zamestnanci.js module.
 *
 *   Event: Field Update (obdobie, obdobie total) - After Save
 *
 * Závislosti:
 *   - MementoUtils v8.1+
 *   - Zamestnanci module v1.0+
 *
 * Changelog:
 *   v1.2.0 (2026-03-20) - Clear Debug_Log before execution
 *     - Always start with fresh log (no old entries)
 *   v1.1.0 (2026-03-20) - Fixed trigger pattern
 *     - Removed dialog() and cancel() (blocking in triggers)
 *     - Silent fail with logging only
 *     - Wrapped in if block (no return at top level)
 *   v1.0.0 (2026-03-20) - Initial implementation
 */

'use strict';

// ==============================================
// VALIDÁCIA A HLAVNÁ FUNKCIA
// ==============================================

// Zabal celý kód do if bloku - žiadne return na top level!
if (typeof MementoUtils !== 'undefined' && typeof Zamestnanci !== 'undefined') {

var utils = MementoUtils;
var currentEntry = entry();

var SCRIPT_VERSION = "1.2.0";
var SCRIPT_NAME = "Zam.Trigger.Calculate";

// ==============================================
// MAIN EXECUTION
// ==============================================

try {
    // Vymaž starý Debug_Log pre čerstvý prepočet
    currentEntry.set("Debug_Log", "");

    utils.addDebug(currentEntry, "🔄 " + SCRIPT_NAME + " v" + SCRIPT_VERSION);

    var result = Zamestnanci.calculateWages(currentEntry, utils.config, utils);

    if (!result.success) {
        utils.addError(currentEntry, "Chyba pri výpočte: " + (result.error || result.message), SCRIPT_NAME);
    } else {
        utils.addDebug(currentEntry, "✅ Prepočet dokončený úspešne");
    }

} catch (error) {
    // Silent fail - trigger nesmie zablokovať uloženie
    utils.addError(currentEntry, "KRITICKÁ CHYBA: " + error.toString(), SCRIPT_NAME, error);
}

} // Koniec if (typeof MementoUtils !== 'undefined' && typeof Zamestnanci !== 'undefined')
