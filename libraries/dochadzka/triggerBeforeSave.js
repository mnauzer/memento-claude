/**
 * ============================================================================
 * Knižnica:  Dochádzka | Event: Trigger | Verzia: 2.0.0
 * ============================================================================
 * THIN WRAPPER - všetka logika je v Dochadzka module (v1.2.0+)
 *
 * Event Type: TRIGGER
 * Event Phase: Before Save
 * Scope: ENTRY
 *
 * Použitie: Automatický prepočet odpracovaných hodín, prestávok a miezd
 *           pri každom uložení záznamu dochádzky.
 *
 * ============================================================================
 * MEMENTO SETUP:
 * ============================================================================
 * 1. Automation / Scripty → Globálne scripty (Global Scripts)
 *    Nahrajte moduly v TOMTO poradí:
 *    ├─ 1. MementoConfig (v8.0+)
 *    ├─ 2. MementoCore (v8.0+)
 *    ├─ 3. MementoTime (v1.1+)
 *    ├─ 4. MementoDate (v1.0+)
 *    ├─ 5. MementoValidation (v1.0+)
 *    ├─ 6. MementoFormatting (v1.0+)
 *    ├─ 7. MementoCalculations (v1.0+)
 *    ├─ 8. MementoBusiness (v8.0+)
 *    ├─ 9. MementoUtils (v8.1+)
 *    └─10. Dochadzka (v1.2.0+)
 *
 * 2. Dochádzka → Nastavenia → Automations → Scripty knižnice
 *    - Event: Before Save (Entry)
 *    - Phase: Before Save
 *    - Scope: Entry
 *    - Script: Skopírujte obsah tohto súboru
 *
 * ============================================================================
 * DEPENDENCIES - LOAD ORDER (CRITICAL!):
 * ============================================================================
 * Global Scripts (v poradí):
 *   1. MementoConfig (v8.0+)       - Centrálna konfigurácia
 *   2. MementoCore (v8.0+)         - Základné utility
 *   3. MementoTime (v1.1+)         - Časové funkcie
 *   4. MementoDate (v1.0+)         - Dátumové utility
 *   5. MementoValidation (v1.0+)   - Validácie
 *   6. MementoFormatting (v1.0+)   - Formátovanie
 *   7. MementoCalculations (v1.0+) - Výpočty
 *   8. MementoBusiness (v8.0+)     - Business logika
 *   9. MementoUtils (v8.1+)        - Agregátor
 *  10. Dochadzka (v1.2.0+)         - Dochádzka modul
 *
 * CRITICAL: Moduly musia byť načítané PRED týmto scriptom!
 * ============================================================================
 */

'use strict';

// ==============================================
// MAIN EXECUTION - Trigger Before Save
// ==============================================

// Zabal celý kód do if bloku - žiadne return na top level!
if (typeof Dochadzka !== 'undefined') {

    try {
        var currentEntry = entry();

        // Clear old logs for fresh calculation
        currentEntry.set("Debug_Log", "");

        // Call Dochadzka module
        var result = Dochadzka.calculateAttendance(currentEntry);

        // Handle result
        if (!result.success) {
            // NO dialog, NO cancel - just log error
            // Trigger nesmie zablokovať uloženie!
            var errorLog = currentEntry.field("Error_Log") || "";
            errorLog += "\n[" + new Date().toISOString() + "] ❌ Prepočet zlyhal: " + result.error;
            currentEntry.set("Error_Log", errorLog);
        }

    } catch (error) {
        // Silent fail - trigger nesmie zablokovať uloženie
        var errorLog = currentEntry.field("Error_Log") || "";
        errorLog += "\n[" + new Date().toISOString() + "] ❌ KRITICKÁ CHYBA: " + error.toString();
        if (error.stack) {
            errorLog += "\nStack: " + error.stack.substring(0, 200);
        }
        currentEntry.set("Error_Log", errorLog);
    }

} // Koniec if

// Script ends naturally - NO cancel(), NO return statement!
