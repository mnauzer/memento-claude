/**
 * ============================================================================
 * Knižnica:  Denný report | Event: Before Save | Verzia: 2.0.0
 * ============================================================================
 * THIN WRAPPER - všetka logika je v DennyReport module (v1.1.0+)
 *
 * Event Type: TRIGGER
 * Event Phase: Before Save
 * Scope: ENTRY
 * Použiteľné pre: New Entry Before Save, Update Entry Before Save
 *
 * MEMENTO SETUP:
 * 1. Global Scripts (Load Order):
 *    - MementoConfig (v8.0+)
 *    - MementoCore (v8.0+)
 *    - MementoUtils (v8.1+)
 *    - DennyReport (v1.2.0+)
 *
 * 2. Denný report → Automation → Scripts:
 *    Event: Before Save (Entry)
 *    Phase: Before Save
 *    Scope: Entry
 * ============================================================================
 */

// Validácia závislostí
if (typeof DennyReport === 'undefined') {
    message("❌ Chýba DennyReport modul!\n\nNahrajte modul pre tento script.");
    cancel();
}

// Volaj modul - modul sa postará o VŠETKO!
try {
    var result = DennyReport.handleBeforeSave(entry());

    // Zobraz message ak modul vrátil správu
    if (result && result.message) {
        message(result.message);
    }

} catch (error) {
    var errorMsg = error.toString();
    dialog("Kritická chyba", errorMsg, "OK");
    cancel();
}
