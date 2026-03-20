/**
 * ============================================================================
 * Knižnica:  Denný report | Event: newEntryBeforeSave | Verzia: 2.0.0
 * ============================================================================
 * THIN WRAPPER - všetka logika je v DennyReport module (v1.1.0+)
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
