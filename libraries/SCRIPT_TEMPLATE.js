/**
 * ============================================================================
 * Knižnica:  [LIBRARY_NAME] | Event: [EVENT_TYPE] | Verzia: [VERSION]
 * ============================================================================
 * THIN WRAPPER - všetka logika je v [ModuleName] module (v[X.X.X]+)
 *
 * Event Type: [TRIGGER/ACTION/BUTTON/BULK_ACTION]
 * Event Phase: [Before Save/After Save/Opening Card/Manual]
 * Scope: [ENTRY/LIBRARY]
 *
 * Použitie: [Popis čo script robí]
 *
 * ============================================================================
 * MEMENTO SETUP:
 * ============================================================================
 * 1. Automation / Scripty → Globálne scripty (Global Scripts)
 *    - Nahrajte všetky moduly v správnom poradí (Load Order je CRITICAL!)
 *
 * 2. [LIBRARY_NAME] → Nastavenia → Automations → Scripty knižnice
 *    - Event: [Select Event Type]
 *    - Phase: [Select Phase]
 *    - Scope: [Entry/Library]
 *    - Script: Skopírujte obsah tohto súboru
 *
 * ============================================================================
 * DEPENDENCIES - LOAD ORDER (v Memento Database):
 * ============================================================================
 * Global Scripts (v poradí):
 *   1. MementoConfig (v8.0+)
 *   2. MementoCore (v8.0+)
 *   3. MementoUtils (v8.1+)
 *   4. [ModuleName] (v[X.X.X]+)
 *   5. [OtherModules...]
 *
 * CRITICAL: Moduly musia byť načítané PRED týmto scriptom!
 * ============================================================================
 */

'use strict';

// ==============================================
// DEPENDENCY VALIDATION
// ==============================================

if (typeof [ModuleName] === 'undefined') {
    dialog("Chyba", "❌ Chýba [ModuleName] modul!\n\nNahrajte modul v Global Scripts.", "OK");
    cancel();
}

// ==============================================
// MAIN EXECUTION
// ==============================================

try {
    var utils = typeof MementoUtils !== 'undefined' ? MementoUtils : null;
    var currentEntry = entry();

    // Call module function
    var result = [ModuleName].[functionName](currentEntry, utils);

    // Handle result
    if (!result.success) {
        dialog("Chyba", "❌ " + result.error, "OK");
        cancel();
    }

    // Success message (optional)
    // message("✅ Done!");

} catch (error) {
    dialog("Kritická chyba", "❌ Kritická chyba!\n\n" + error.toString(), "OK");
    cancel();
}
