/**
 * ============================================================================
 * MEMENTO DATABASE SCRIPT
 * ============================================================================
 *
 * Knižnica:    Denný report
 * Event:       Action (Manual)
 * Verzia:      1.0.0
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
    dialog("Chyba", "❌ Chýba DennyReport modul!\n\nNahrajte modul pre tento script.", "OK");
    cancel();
}

if (typeof MementoUtils === 'undefined') {
    dialog("Chyba", "❌ Chýba MementoUtils modul!\n\nNahrajte modul pre tento script.", "OK");
    cancel();
}

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var dennyReport = DennyReport;
var config = utils.config;  // Property getter - NOT getConfig() function

var SCRIPT_VERSION = "1.0.0";
var SCRIPT_NAME = "recalculate";

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
        // Spustenie prepočtu (bez confirmation - action je už manuálny)
        utils.addDebug(entry(), "🔄 Spúšťam prepočet " + allReports.length + " záznamov...");
        message("🔄 Prepočítavam " + allReports.length + " záznamov...\nMôže to trvať niekoľko sekúnd.");

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

    } // Koniec else bloku (existujú záznamy)

} catch (error) {
    utils.addError(entry(), "Kritická chyba v " + SCRIPT_NAME, SCRIPT_NAME, error);
    dialog("Chyba", "❌ Kritická chyba!\n\n" + error.toString(), "OK");
}
