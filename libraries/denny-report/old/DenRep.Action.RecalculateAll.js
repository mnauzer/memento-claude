/**
 * ============================================================================
 * MEMENTO DATABASE SCRIPT
 * ============================================================================
 *
 * Knižnica:    Denný report
 * Názov:       DenRep.Action.RecalculateAll
 * Typ:         Action (Manual)
 * Verzia:      1.0.0
 * Event:       Manual (Actions menu)
 *
 * Popis:
 * Manuálna akcia na prepočítanie všetkých Denných reportov.
 * Prejde všetky záznamy a spustí auto-linkovanie a validáciu.
 * Používa sa po aktualizácii modulov alebo oprave chýb.
 *
 * Použitie:
 * - Spustiť z Actions menu (ikona ⚡)
 * - Použiť po aktualizácii DennyReport modulu
 * - Použiť na opravu chýbajúcich linkov
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
var config = utils.getConfig();

var SCRIPT_VERSION = "1.0.0";
var SCRIPT_NAME = "DenRep.Action.RecalculateAll";

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

try {
    utils.addDebug(entry(), "🔄 === ŠTART " + SCRIPT_NAME + " v" + SCRIPT_VERSION + " ===");
    utils.addDebug(entry(), "  📦 DennyReport modul v" + dennyReport.version);

    // Získaj všetky Denné reporty
    var allReports = lib().entries();
    utils.addDebug(entry(), "📊 Celkom záznamov v Denný report: " + allReports.length);

    if (allReports.length === 0) {
        dialog("Prepočet", "ℹ️ Žiadne záznamy na prepočítanie.", "OK");
    } else {
        // Potvrdenie pred spustením
        var confirmMsg = "🔄 PREPOČET VŠETKÝCH ZÁZNAMOV\n\n";
        confirmMsg += "Celkom záznamov: " + allReports.length + "\n\n";
        confirmMsg += "Táto operácia:\n";
        confirmMsg += "• Znovu nalinkuje záznamy z Dochádzky, Prác, Jázd, Pokladne\n";
        confirmMsg += "• Validuje dátumy všetkých linkov\n";
        confirmMsg += "• Môže trvať niekoľko minút\n\n";
        confirmMsg += "Pokračovať?";

        var confirm = dialog("Prepočet záznamov", confirmMsg, "Áno", "Nie");

        if (confirm !== 0) {
            utils.addDebug(entry(), "❌ Používateľ zrušil prepočet");
            message("❌ Prepočet zrušený");
        } else {

    // Prepočítaj všetky záznamy
    var stats = {
        total: allReports.length,
        success: 0,
        errors: 0,
        totalLinked: 0,
        totalUnlinked: 0,
        skipped: 0
    };

    utils.addDebug(entry(), "🔄 Spúšťam prepočet " + allReports.length + " záznamov...");

    for (var i = 0; i < allReports.length; i++) {
        var report = allReports[i];
        var reportId = report.field("ID");
        var reportDate = utils.safeGet(report, config.fields.dailyReport.date);

        if (!reportDate) {
            utils.addDebug(entry(), "  ⚠️ Záznam #" + reportId + " nemá dátum - preskakujem");
            stats.skipped++;
            continue;
        }

        try {
            // Zavolaj modul pre prepočet
            var result = dennyReport.processReport(report, {
                maxRecordsToCheck: 200
            });

            if (result.success) {
                stats.success++;
                stats.totalLinked += (result.linked.attendance + result.linked.workRecords +
                                    result.linked.rideLog + result.linked.cashBook);
                stats.totalUnlinked += (result.unlinked.attendance + result.unlinked.workRecords +
                                      result.unlinked.rideLog + result.unlinked.cashBook);

                // Log každých 10 záznamov
                if ((i + 1) % 10 === 0) {
                    utils.addDebug(entry(), "  📊 Spracovaných " + (i + 1) + "/" + allReports.length + " záznamov");
                }
            } else {
                stats.errors++;
                utils.addDebug(entry(), "  ❌ Chyba v zázname #" + reportId + ": " + result.error);
            }

        } catch (error) {
            stats.errors++;
            utils.addDebug(entry(), "  ❌ Výnimka v zázname #" + reportId + ": " + error.toString());
        }
    }

    // Finálne zhrnutie
    var finalSummary = "✅ PREPOČET DOKONČENÝ\n\n";
    finalSummary += "━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
    finalSummary += "Celkom záznamov: " + stats.total + "\n";
    finalSummary += "Úspešne spracovaných: " + stats.success + "\n";
    if (stats.errors > 0) {
        finalSummary += "Chýb: " + stats.errors + "\n";
    }
    if (stats.skipped > 0) {
        finalSummary += "Preskočených: " + stats.skipped + "\n";
    }
    finalSummary += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
    finalSummary += "🔗 Nalinkované: " + stats.totalLinked + "\n";
    finalSummary += "⚠️ Unlinkované: " + stats.totalUnlinked + "\n\n";
    finalSummary += "Prepočet dokončený.";

    dialog("Výsledok prepočtu", finalSummary, "OK");
    utils.addDebug(entry(), "✅ === PREPOČET DOKONČENÝ ===");
    utils.addDebug(entry(), "  📊 Úspešne: " + stats.success + "/" + stats.total);
    utils.addDebug(entry(), "  🔗 Nalinkované: " + stats.totalLinked);
    utils.addDebug(entry(), "  ⚠️ Unlinkované: " + stats.totalUnlinked);

    message("✅ Prepočítaných " + stats.success + " záznamov\n🔗 Nalinkované: " + stats.totalLinked);

        } // Koniec else bloku (riadok 88 - používateľ potvrdil)
    } // Koniec else bloku (riadok 73 - existujú záznamy)

} catch (error) {
    utils.addError(entry(), "Kritická chyba v " + SCRIPT_NAME, SCRIPT_NAME, error);
    dialog("Chyba", "❌ Kritická chyba!\n\n" + error.toString(), "OK");
}
