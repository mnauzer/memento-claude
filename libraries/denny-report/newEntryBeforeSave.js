/**
 * ============================================================================
 * MEMENTO DATABASE SCRIPT
 * ============================================================================
 *
 * Knižnica:    Denný report
 * Event:       newEntryBeforeSave
 * Verzia:      1.0.0
 *
 * Popis:
 * Trigger pri vytváraní nového Denného reportu. Volá DennyReport modul
 * pre auto-linkovanie záznamov podľa dátumu a validáciu.
 *
 * Závislosti:
 * - DennyReport 1.0+ (reusable module - nahrať osobitne)
 * - MementoUtils 8.0+ (reusable module - nahrať osobitne)
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
    message("❌ CHYBA: Chýba DennyReport modul!\n\nNahrajte modul pre tento script.");
    cancel();
}

if (typeof MementoUtils === 'undefined') {
    message("❌ CHYBA: Chýba MementoUtils modul!\n\nNahrajte modul pre tento script.");
    cancel();
}

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var dennyReport = DennyReport;
var config = utils.config;  // Property getter - NOT getConfig() function
var currentEntry = entry();

var SCRIPT_VERSION = "1.0.0";
var SCRIPT_NAME = "newEntryBeforeSave";

// ==============================================
// SPUSTENIE PREPOČTU
// ==============================================

try {
    utils.addDebug(currentEntry, "🚀 === ŠTART " + SCRIPT_NAME + " v" + SCRIPT_VERSION + " ===");
    utils.addDebug(currentEntry, "  📦 DennyReport modul v" + dennyReport.version);
    utils.clearLogs(currentEntry, true);

    // Získaj dátum záznamu
    var reportDate = utils.safeGet(currentEntry, config.fields.dailyReport.date);
    if (!reportDate) {
        utils.addError(currentEntry, "Dátum nie je vyplnený", SCRIPT_NAME);
        message("❌ Dátum nie je vyplnený!");
        cancel();
    }

    utils.addDebug(currentEntry, "📅 Dátum reportu: " + utils.formatDate(reportDate));

    // Voliteľné nastavenia
    var options = {
        maxRecordsToCheck: 200  // Aligns with Level 2 fallback in MementoBusiness v8.2.0
    };

    // Zavolaj modul pre auto-linkovanie a validáciu
    utils.addDebug(currentEntry, "🔗 KROK 1: Auto-linkovanie a validácia");
    var result = dennyReport.processReport(currentEntry, options);

    // Kontrola výsledku
    if (!result.success) {
        utils.addError(currentEntry, "Chyba prepočtu: " + (result.error || "Unknown error"), SCRIPT_NAME);
        message("❌ Chyba prepočtu!\n\n" + result.error);
        cancel();
    }

    // Log linking results
    var totalLinked = result.linked.attendance + result.linked.workRecords +
                     result.linked.rideLog + result.linked.cashBook;

    var totalUnlinked = result.unlinked.attendance + result.unlinked.workRecords +
                       result.unlinked.rideLog + result.unlinked.cashBook;

    if (totalLinked > 0) {
        utils.addDebug(currentEntry, "  ✅ Nalinkované: " + totalLinked + " nových záznamov");
    }

    if (totalUnlinked > 0) {
        utils.addDebug(currentEntry, "  ⚠️ Unlinkované: " + totalUnlinked + " záznamov (nesprávny dátum)");
    }

    utils.addDebug(currentEntry, "✅ === PREPOČET DOKONČENÝ ===");

    // Zobraz krátke zhrnutie (len ak sú zmeny)
    if (totalLinked > 0 || totalUnlinked > 0) {
        var summary = "✅ Denný report vytvorený\n";
        if (totalLinked > 0) {
            summary += "\n🔗 Nalinkované: " + totalLinked;
        }
        if (totalUnlinked > 0) {
            summary += "\n⚠️ Unlinkované: " + totalUnlinked;
        }
        message(summary);
    }

} catch (error) {
    utils.addError(currentEntry, "Kritická chyba v " + SCRIPT_NAME, SCRIPT_NAME, error);
    message("❌ Kritická chyba!\n\n" + error.toString());
    cancel();
}
