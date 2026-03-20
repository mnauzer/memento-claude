/**
 * ============================================================================
 * Knižnica:  Denný report | Event: Action (Manual) | Verzia: 2.0.0
 * ============================================================================
 * THIN WRAPPER - všetka logika je v DennyReport module (v1.1.0+)
 *
 * Scope: LIBRARY (knižnica)
 * Použitie: Prepočíta VŠETKY záznamy v Denný report knižnici
 * ============================================================================
 */

// Validácia závislostí
if (typeof DennyReport === 'undefined') {
    dialog("Chyba", "❌ Chýba DennyReport modul!\n\nNahrajte modul pre tento script.", "OK");
    cancel();
}

// Volaj modul - modul sa postará o VŠETKO!
try {
    message("🔄 Prepočítavam záznamy...\nMôže to trvať niekoľko sekúnd.");

    var result = DennyReport.recalculateAll();

    // Zobraz výsledky
    if (result.success) {
        dialog("Výsledok prepočtu", result.summary, "OK");
        message(result.shortSummary);
    } else {
        dialog("Chyba", "❌ Prepočet zlyhal!\n\n" + (result.error || "Unknown error"), "OK");
    }

} catch (error) {
    dialog("Kritická chyba", "❌ Kritická chyba!\n\n" + error.toString(), "OK");
}
