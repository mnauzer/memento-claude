/**
 * ============================================================================
 * Knižnica:  Zákazky | Event: Before Save | Verzia: 1.0.0
 * ============================================================================
 * THIN WRAPPER - všetka logika je v Order.Calculate.Module.js (v2.0.0+)
 *
 * Event Type: TRIGGER
 * Event Phase: Before Save
 * Scope: ENTRY
 * Použiteľné pre: New Entry Before Save, Update Entry Before Save
 *
 * Použitie: Automatický prepočet všetkých položiek a celkovej ceny zákazky
 *
 * ============================================================================
 * MEMENTO SETUP:
 * ============================================================================
 * 1. Global Scripts (Load Order):
 *    - MementoConfig (v8.0+)
 *    - MementoCore (v8.0+)
 *    - MementoUtils (v8.1+)
 *    - Order.Diely.Calculate.Module (v2.0.0+)
 *    - Order.Calculate.Module (v2.0.0+)
 *
 * 2. Zákazky → Automation → Scripts:
 *    Event: Before Save (Entry)
 *    Phase: Before Save
 *    Scope: Entry
 * ============================================================================
 */

'use strict';

// ==============================================
// MAIN EXECUTION - Trigger Before Save
// ==============================================

if (typeof OrderCalculate !== 'undefined') {

    try {
        var currentEntry = entry();

        // Clear old logs for fresh calculation
        currentEntry.set("Debug_Log", "");

        // Call Order.Calculate module
        var result = OrderCalculate.orderCalculate(currentEntry);

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
