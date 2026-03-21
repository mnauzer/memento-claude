// ==============================================
// MEMENTO DATABASE - KNIHA JÁZD UPDATE TRIGGER
// Verzia: 1.0.0 | Dátum: október 2025 | Autor: ASISTANTO
// Knižnica: Kniha jázd | Trigger: After Save
// ==============================================
// ✅ FUNKCIONALITA v1.0.0:
//    - Po uložení záznamu z Knihy jázd aktualizuje všetky linknuté Denné reporty
//    - Spustí prepočet v Dennom reporte, aby sa aktualizovali info polia
// ==============================================

var utils = MementoUtils;
var CONFIG = utils.getConfig();

try {
    utils.addDebug(entry, "🔄 Spúšťam aktualizáciu Denných reportov po zmene Knihy jázd");

    // Získaj všetky linknuté Denné reporty
    var dailyReports = utils.safeGetLinks(entry, CONFIG.fields.rideLog.dailyReport);

    if (!dailyReports || dailyReports.length === 0) {
        utils.addDebug(entry, "  ℹ️ Žiadne linknuté Denné reporty");
        return;
    }

    utils.addDebug(entry, "  📊 Počet linknutých Denných reportov: " + dailyReports.length);

    // Pre každý Denný report spusti aktualizáciu
    for (var i = 0; i < dailyReports.length; i++) {
        var dailyReport = dailyReports[i];
        var reportId = dailyReport.field("ID");
        var reportDate = utils.formatDate(utils.safeGet(dailyReport, CONFIG.fields.dailyReport.date));

        try {
            // Trigger sa spustí automaticky pri uložení
            dailyReport.set(CONFIG.fields.common.modifiedDate, new Date());

            utils.addDebug(entry, "  ✅ Aktualizovaný Denný report #" + reportId + " (" + reportDate + ")");
        } catch (error) {
            utils.addError(entry, "Chyba pri aktualizácii Denného reportu #" + reportId + ": " + error.toString(), "updateDailyReport", error);
        }
    }

    utils.addDebug(entry, "✅ Dokončená aktualizácia " + dailyReports.length + " Denných reportov");

} catch (error) {
    utils.addError(entry, "Chyba v Knij.Update.DailyReport trigger: " + error.toString(), "AfterSave", error);
}
