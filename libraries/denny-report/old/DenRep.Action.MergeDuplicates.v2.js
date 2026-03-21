/**
 * ============================================================================
 * MEMENTO DATABASE SCRIPT
 * ============================================================================
 *
 * Knižnica:    Denný report
 * Názov:       DenRep.Action.MergeDuplicates
 * Typ:         Action (Manual)
 * Verzia:      2.0.0
 * Event:       Manual (Actions menu)
 *
 * Popis:
 * Manuálna akcia na vyhľadanie a zlúčenie duplicitných Denných reportov
 * (záznamy s rovnakým dátumom). Zlúči backlinky do najstaršieho záznamu
 * a zmaže duplikáty.
 *
 * Použitie:
 * - Spustiť z Actions menu (ikona ⚡)
 * - Použiť na cleanup po race condition alebo manuálnom vytvorení duplicitov
 *
 * Závislosti:
 * - DennyReport 1.0+ (reusable module)
 * - MementoUtils 8.0+
 * - MementoConfig 8.0+
 * - MementoCore 8.0+
 *
 * Autor:       ASISTANTO
 * Vytvorené:   2026-03-20
 *
 * ============================================================================
 */

// ==============================================
// VALIDÁCIA ZÁVISLOSTÍ
// ==============================================

if (typeof DennyReport === 'undefined') {
    dialog("Chyba", "❌ Chýba DennyReport modul!\n\nNahrajte modul do Global Scripts.", "OK");
    cancel();
}

if (typeof MementoUtils === 'undefined') {
    dialog("Chyba", "❌ Chýba MementoUtils modul!", "OK");
    cancel();
}

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var dennyReport = DennyReport;

var SCRIPT_VERSION = "2.0.0";
var SCRIPT_NAME = "DenRep.Action.MergeDuplicates";

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

try {
    utils.addDebug(entry(), "🔍 === ŠTART " + SCRIPT_NAME + " v" + SCRIPT_VERSION + " ===");
    utils.addDebug(entry(), "  📦 DennyReport modul v" + dennyReport.version);

    // Zavolaj modul funkciu (prehľadá duplicity)
    var result = dennyReport.mergeDuplicates(entry());

    if (!result.success) {
        dialog("Chyba", "❌ Chyba pri hľadaní duplicitov!\n\n" + (result.error || "Unknown error"), "OK");
        utils.addError(entry(), "Chyba: " + result.error, SCRIPT_NAME);
        return;
    }

    // Žiadne duplikáty
    if (result.duplicates.length === 0) {
        dialog("Kontrola duplikátov", "✅ Nenašli sa žiadne duplicitné záznamy.", "OK");
        utils.addDebug(entry(), "✅ Žiadne duplikáty nenájdené");
        return;
    }

    // Zobraz zhrnutie pred zlúčením
    var summary = "🔍 NÁJDENÉ DUPLIKÁTY:\n\n";
    for (var i = 0; i < result.duplicates.length; i++) {
        summary += "📅 " + result.duplicates[i].date + " → " +
                   result.duplicates[i].count + " záznamov\n";
    }
    summary += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
    summary += "⚠️ UPOZORNENIE:\n";
    summary += "Zlúčenie presunie všetky backlinky do najstaršieho záznamu\n";
    summary += "a zmaže duplicitné záznamy.\n\n";
    summary += "Celkom duplicitných skupín: " + result.duplicates.length + "\n\n";
    summary += "Pokračovať a zlúčiť duplikáty?";

    var confirm = dialog("Duplikáty v Dennom reporte", summary, "Áno", "Nie");
    if (confirm !== 0) {
        utils.addDebug(entry(), "❌ Používateľ zrušil zlúčenie");
        message("❌ Zlúčenie zrušené");
        return;
    }

    // Modul už našiel duplicity - teraz ich zlúč
    // (mergeDuplicates() už vykonal merge)
    var finalSummary = "✅ ZLÚČENIE DOKONČENÉ\n\n";
    finalSummary += "Zlúčených skupín: " + result.merged + "\n";
    finalSummary += "Zmazaných duplicitov: " + result.deleted + "\n\n";
    finalSummary += "Zostalo jedinečných záznamov.";

    dialog("Výsledok zlúčenia", finalSummary, "OK");
    utils.addDebug(entry(), "✅ Zlúčenie dokončené: " + result.merged + " skupín, " + result.deleted + " duplicitov zmazaných");

    message("✅ Zlúčené " + result.merged + " skupín\n🗑️ Zmazaných " + result.deleted + " duplicitov");

} catch (error) {
    utils.addError(entry(), "Kritická chyba v " + SCRIPT_NAME, SCRIPT_NAME, error);
    dialog("Chyba", "❌ Kritická chyba!\n\n" + error.toString(), "OK");
}
