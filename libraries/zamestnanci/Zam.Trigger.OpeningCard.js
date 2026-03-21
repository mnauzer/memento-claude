/**
 * Knižnica:    Zamestnanci
 * Názov:       Zam.Trigger.OpeningCard
 * Typ:         Trigger (Opening Card)
 * Verzia:      1.0.0
 * Autor:       ASISTANTO
 * Dátum:       2026-03-20
 *
 * Účel:
 *   Pri otvorení karty zamestnanca automaticky vyplní pole "Aktuálna hodinovka"
 *   hodnotou z poľa "Hodinová sadzba" alebo najnovšej sadzby.
 *
 * Event:       Opening Card
 * Phase:       Opening Card
 *
 * Závislosti:
 *   - MementoCore v8.0+ (optional - pre safe field access)
 *
 * Changelog:
 *   v1.0.0 (2026-03-20) - Initial implementation
 *     - Get current hourly rate from employee record
 *     - Set "Aktuálna hodinovka" field
 *     - Simple, no external module dependencies
 */

'use strict';

// ==============================================
// MAIN EXECUTION
// ==============================================

// Opening Card triggers should be simple and fast
// No complex dependencies, no heavy calculations

var currentEntry = entry();

try {
    // OPTION 1: Get from "Hodinová sadzba" field
    var hourlyRate = currentEntry.field("Hodinová sadzba");

    // OPTION 2: Fallback to "Sadzba" field if first doesn't exist
    if (!hourlyRate) {
        hourlyRate = currentEntry.field("Sadzba");
    }

    // OPTION 3: Fallback to "hodinovka" field
    if (!hourlyRate) {
        hourlyRate = currentEntry.field("hodinovka");
    }

    // If we have a rate, set it to "Aktuálna hodinovka"
    if (hourlyRate && hourlyRate > 0) {
        currentEntry.set("Aktuálna hodinovka", hourlyRate);

        // Optional: Add debug log if MementoUtils is available
        if (typeof MementoUtils !== 'undefined') {
            var employeeName = currentEntry.field("Nick") || currentEntry.field("Meno") || "N/A";
            MementoUtils.addDebug(currentEntry, "🔄 Opening Card: Nastavená aktuálna hodinovka " + hourlyRate + " €/h pre " + employeeName);
        }
    } else {
        // No hourly rate found - leave "Aktuálna hodinovka" empty or show warning
        if (typeof MementoUtils !== 'undefined') {
            var employeeName = currentEntry.field("Nick") || currentEntry.field("Meno") || "N/A";
            MementoUtils.addDebug(currentEntry, "⚠️ Opening Card: Hodinová sadzba nenájdená pre " + employeeName);
        }
    }

} catch (error) {
    // Silent fail - Opening Card should not block opening the record
    // Only log if utils available
    if (typeof MementoUtils !== 'undefined') {
        MementoUtils.addError(currentEntry, "Chyba pri nastavení hodinovky: " + error.toString(), "Zam.Trigger.OpeningCard", error);
    }
}

// No cancel() - always allow card to open
