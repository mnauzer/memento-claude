/**
 * ============================================================================
 * Knižnica:  Materiál | Event: Trigger | Verzia: 1.0.0
 * ============================================================================
 * THIN WRAPPER - všetka logika je v Material.js module (v1.0.0+)
 *
 * Event Type: TRIGGER
 * Event Phase: Before Save
 * Scope: ENTRY
 * Použiteľné pre: New Entry Before Save, Update Entry Before Save
 *
 * Použitie: Automatický prepočet príjemiek materiálu (skladové pohyby, ceny)
 *
 * ============================================================================
 * MEMENTO SETUP:
 * ============================================================================
 * 1. Global Scripts (Load Order):
 *    - MementoConfig (v8.0+)
 *    - MementoCore (v8.0+)
 *    - MementoUtils (v8.1+)
 *    - Material (v1.0.0+)
 *
 * 2. Materiál → Automation → Scripts:
 *    Event: Before Save (Entry)
 *    Phase: Before Save
 *    Scope: Entry
 * ============================================================================
 */

'use strict';

// ==============================================
// MAIN EXECUTION - Trigger Before Save
// ==============================================

if (typeof Material !== 'undefined') {

    try {
        var currentEntry = entry();

        // Clear old logs for fresh calculation
        currentEntry.set("Debug_Log", "");

        // Call Material module
        var result = Material.calculateReceipts(currentEntry);

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
