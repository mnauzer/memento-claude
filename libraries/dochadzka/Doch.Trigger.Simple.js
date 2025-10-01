/**
 * ============================================================================
 * MEMENTO DATABASE SCRIPT
 * ============================================================================
 *
 * Knižnica:    Dochádzka
 * Názov:       Doch.Trigger.Simple
 * Typ:         Trigger (Before Save)
 * Verzia:      1.0
 *
 * Popis:
 * Minimalistický trigger - len volá knižnicu a zruší pri chybe.
 *
 * Závislosti:
 * - Doch.Calc.Lib (shared script)
 *
 * ============================================================================
 */

var result = dochCalcMain(entry());

if (!result.success) {
    message("❌ " + result.error);
    cancel();
}
