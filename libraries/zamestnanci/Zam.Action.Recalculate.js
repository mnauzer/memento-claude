/**
 * Knižnica:    Zamestnanci
 * Názov:       Zam.Action.Recalculate
 * Typ:         Action (Button) - Ultra-Thin Wrapper
 * Verzia:      2.0.0
 * Autor:       ASISTANTO
 * Dátum:       2026-03-20
 *
 * Účel:
 *   Ultra-thin wrapper pre button action prepočtu miezd.
 *   Všetka logika je v modules/Zamestnanci.js module.
 *
 * Použitie:
 *   1. Pridaj Button widget do formulára
 *   2. Nastav script na tento súbor
 *   3. Klikni na button → spustí sa prepočet
 *
 * Závislosti:
 *   - MementoUtils v8.1+
 *   - Zamestnanci module v1.4+
 *
 * Changelog:
 *   v2.0.0 (2026-03-20) - Refactor to ultra-thin wrapper
 *     - Move all logic to Zamestnanci.calculateWagesAction()
 *     - Only 25 lines of wrapper code
 *     - Follows reusable module architecture pattern
 *   v1.0.0 (2026-03-20) - Initial implementation (deprecated - too much code)
 */

'use strict';

// ==============================================
// DEPENDENCY VALIDATION
// ==============================================

if (typeof MementoUtils === 'undefined') {
    dialog("Chyba závislostí", "❌ Chýba MementoUtils modul!\n\nSkontrolujte load order v Nastavenia → Skripty.", "OK");
    cancel();
}

if (typeof Zamestnanci === 'undefined') {
    dialog("Chyba závislostí", "❌ Chýba Zamestnanci modul!\n\nSkontrolujte load order v Nastavenia → Skripty.", "OK");
    cancel();
}

// ==============================================
// MAIN EXECUTION
// ==============================================

var result = Zamestnanci.calculateWagesAction(entry(), MementoUtils.config, MementoUtils);

if (result.cancelled) {
    // User cancelled - just exit
    cancel();
}

if (!result.success) {
    // Error already shown in dialog by module
    cancel();
}

// Success - dialog already shown by module
