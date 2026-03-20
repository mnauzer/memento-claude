/**
 * ============================================================================
 * Knižnica:  Denný report | Event: updateEntryAfterSave | Verzia: 2.0.0
 * ============================================================================
 * THIN WRAPPER - všetka logika je v DennyReport module (v1.1.0+)
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
