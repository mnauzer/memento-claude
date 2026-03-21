/**
 * Knižnica:    Zamestnanci
 * Názov:       Zam.Trigger.Calculate
 * Typ:         Trigger (After Save - Field Update)
 * Verzia:      1.4.0
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
 *   v1.4.0 (2026-03-21) - Removed 'use strict' (risk of silent failures in Memento triggers)
 *   v1.3.0 (2026-03-20) - Add diagnostics for Field Update event
 *     - Log when modules are missing (diagnostic message)
 *     - Show script execution in Debug_Log field
 *   v1.2.0 (2026-03-20) - Clear Debug_Log before execution
 *     - Always start with fresh log (no old entries)
 *   v1.1.0 (2026-03-20) - Fixed trigger pattern
 *     - Removed dialog() and cancel() (blocking in triggers)
 *     - Silent fail with logging only
 *     - Wrapped in if block (no return at top level)
 *   v1.0.0 (2026-03-20) - Initial implementation
 */

// ==============================================
// DIAGNOSTIC CHECK (outside if block)
// ==============================================

var SCRIPT_VERSION = "1.4.0";
var SCRIPT_NAME = "Zam.Trigger.Calculate";

// Check if modules are available
var hasUtils = typeof MementoUtils !== 'undefined';
var hasZamestnanci = typeof Zamestnanci !== 'undefined';

if (!hasUtils || !hasZamestnanci) {
    // Modules not available - log to Debug_Log field
    var currentEntry = entry();
    var diagnosticMsg = "[" + new Date().toLocaleString('sk-SK') + "] ❌ " + SCRIPT_NAME + " v" + SCRIPT_VERSION + "\n";
    diagnosticMsg += "DIAGNOSTIC: Chýbajúce moduly!\n";
    diagnosticMsg += "- MementoUtils: " + (hasUtils ? "✅" : "❌ CHÝBA!") + "\n";
    diagnosticMsg += "- Zamestnanci: " + (hasZamestnanci ? "✅" : "❌ CHÝBA!") + "\n";
    diagnosticMsg += "→ Script sa NESPUSTIL (moduly nie sú načítané)\n";

    var existingLog = currentEntry.field("Debug_Log") || "";
    currentEntry.set("Debug_Log", existingLog + diagnosticMsg);
}

// ==============================================
// VALIDÁCIA A HLAVNÁ FUNKCIA
// ==============================================

// Zabal celý kód do if bloku - žiadne return na top level!
if (hasUtils && hasZamestnanci) {

var utils = MementoUtils;
var currentEntry = entry();

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

} // Koniec if (hasUtils && hasZamestnanci)
