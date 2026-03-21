/**
 * ============================================================================
 * Knižnica:  Cenové ponuky | Event: Before Save | Verzia: 1.0.0
 * ============================================================================
 * THIN WRAPPER - všetka logika je v CP.Calculate.Module.js (v2.1.0+)
 *
 * Event Type: TRIGGER
 * Event Phase: Before Save
 * Scope: ENTRY
 * Použiteľné pre: New Entry Before Save, Update Entry Before Save
 *
 * Použitie: Automatický prepočet všetkých dielov a celkovej ceny cenovej ponuky
 *
 * ============================================================================
 * MEMENTO SETUP:
 * ============================================================================
 * 1. Global Scripts (Load Order):
 *    - MementoConfig (v8.0+)
 *    - MementoCore (v8.0+)
 *    - MementoUtils (v8.1+)
 *    - CP.Diely.Calculate.Module (v2.1.0+)
 *    - CP.Calculate.Module (v2.1.0+)
 *
 * 2. Cenové ponuky → Automation → Scripts:
 *    Event: Before Save (Entry)
 *    Phase: Before Save
 *    Scope: Entry
 * ============================================================================
 */

'use strict';

// ==============================================
// MAIN EXECUTION - Trigger Before Save
// ==============================================

if (typeof CPCalculate !== 'undefined') {

    try {
        var currentEntry = entry();

        // Clear old logs for fresh calculation
        currentEntry.set("Debug_Log", "");

        // Call CP.Calculate module
        var result = CPCalculate.quoteCalculate(currentEntry);

        if (!result.success) {
            // Log error but don't block save
            var errorLog = currentEntry.field("Error_Log") || "";
            errorLog += "\n[" + new Date().toISOString() + "] ❌ Prepočet zlyhal: " + result.error;
            currentEntry.set("Error_Log", errorLog);
        }

    } catch (error) {
        // Silent fail - trigger nesmie zablokovať uloženie
        var errorLog = currentEntry.field("Error_Log") || "";
        errorLog += "\n[" + new Date().toISOString() + "] ❌ KRITICKÁ CHYBA: " + error.toString();
        currentEntry.set("Error_Log", errorLog);
    }

} // Koniec if
