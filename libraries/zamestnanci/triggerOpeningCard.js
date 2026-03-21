/**
 * Knižnica:    Zamestnanci
 * Názov:       Zam.Trigger.OpeningCard
 * Typ:         Trigger (Opening Card) - Ultra-Thin Wrapper
 * Verzia:      2.1.0
 * Autor:       ASISTANTO
 * Dátum:       2026-03-21
 *
 * Účel:
 *   Pri otvorení karty zamestnanca automaticky vyplní "Aktuálna hodinovka"
 *   hodnotou z knižnice "Sadzby zamestnancov" (historické dáta).
 *
 * Event:       Opening Card
 * Phase:       Opening Card
 *
 * Závislosti:
 *   - Zamestnanci module v1.5+
 *
 * Changelog:
 *   v2.1.0 (2026-03-21) - Removed 'use strict' (risk of silent failures in Memento triggers)
 *   v2.0.0 (2026-03-20) - Refactor to ultra-thin wrapper
 *     - All logic moved to Zamestnanci.updateCurrentHourlyRate()
 *     - Looks up rate from "Sadzby zamestnancov" library
 *     - Only 20 lines of wrapper code
 *   v1.0.0 (2026-03-20) - Initial implementation (deprecated)
 */

// ==============================================
// MAIN EXECUTION
// ==============================================

// Opening Card triggers should be simple and fast
// All logic in Zamestnanci module

if (typeof Zamestnanci !== 'undefined') {
    var utils = typeof MementoUtils !== 'undefined' ? MementoUtils : null;

    // Call module function to update hourly rate
    Zamestnanci.updateCurrentHourlyRate(entry(), utils);
}

// No cancel() - always allow card to open
// Silent fail if modules not available (Opening Card should never block)
