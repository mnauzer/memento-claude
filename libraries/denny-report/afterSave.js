/**
 * ============================================================================
 * Knižnica:  Denný report | Event: After Save | Verzia: 2.0.0
 * ============================================================================
 * THIN WRAPPER - všetka logika je v DennyReport module (v1.2.0+)
 *
 * Event Type: TRIGGER
 * Event Phase: After Save
 * Scope: ENTRY
 * Použiteľné pre: New Entry After Save, Update Entry After Save
 *
 * MEMENTO SETUP:
 * 1. Global Scripts (Load Order):
 *    - MementoConfig (v8.0+)
 *    - MementoCore (v8.0+)
 *    - MementoUtils (v8.1+)
 *    - DennyReport (v1.2.0+)
 *
 * 2. Denný report → Automation → Scripts:
 *    Event: After Save (Entry)
 *    Phase: After Save
 *    Scope: Entry
 * ============================================================================
 */

// Validácia závislostí a volanie modulu
if (typeof DennyReport !== 'undefined') {
    try {
        DennyReport.handleAfterSave(entry());
    } catch (error) {
        // Silent fail - AfterSave nesmie zablokovať uloženie
    }
}
