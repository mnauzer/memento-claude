// ==============================================
// MEMENTO DATABASE - POKLADŇA UPDATE TRIGGER
// Verzia: 1.0.0 | Dátum: október 2025 | Autor: ASISTANTO
// Knižnica: Pokladňa | Trigger: After Save
// ==============================================
// ✅ FUNKCIONALITA v1.0.0:
//    - Po uložení záznamu Pokladne aktualizuje všetky linknuté Denné reporty
//    - Spustí prepočet v Dennom reporte, aby sa aktualizovali info polia
// ==============================================

var utils = MementoUtils;
var CONFIG = utils.getConfig();

try {
    utils.addDebug(entry, "🔄 Spúšťam aktualizáciu Denných reportov po zmene Pokladne");

    // Získaj všetky linknuté Denné reporty (cez attendance -> dailyReport)
    // Poznámka: Pokladňa nemá priame pole pre Denný report, musíme to urobiť cez Dochádzku
    var attendanceRecords = utils.safeGetLinks(entry, CONFIG.fields.cashBook.cashBook);

    if (!attendanceRecords || attendanceRecords.length === 0) {
        utils.addDebug(entry, "  ℹ️ Žiadne linknuté záznamy Dochádzky");
        return;
    }

    var dailyReportSet = {};

    // Získaj všetky unikátne Denné reporty cez Dochádzku
    for (var a = 0; a < attendanceRecords.length; a++) {
        var attendance = attendanceRecords[a];
        var dailyReportsFromAtt = utils.safeGetLinks(attendance, CONFIG.fields.attendance.dailyReport);

        if (dailyReportsFromAtt && dailyReportsFromAtt.length > 0) {
            for (var d = 0; d < dailyReportsFromAtt.length; d++) {
                var drId = dailyReportsFromAtt[d].field("ID");
                dailyReportSet[drId] = dailyReportsFromAtt[d];
            }
        }
    }

    var dailyReportIds = Object.keys(dailyReportSet);

    if (dailyReportIds.length === 0) {
        utils.addDebug(entry, "  ℹ️ Žiadne linknuté Denné reporty");
        return;
    }

    utils.addDebug(entry, "  📊 Počet linknutých Denných reportov: " + dailyReportIds.length);

    // Pre každý Denný report spusti aktualizáciu
    for (var i = 0; i < dailyReportIds.length; i++) {
        var dailyReport = dailyReportSet[dailyReportIds[i]];
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

    utils.addDebug(entry, "✅ Dokončená aktualizácia " + dailyReportIds.length + " Denných reportov");

} catch (error) {
    utils.addError(entry, "Chyba v Pokl.Update.DailyReport trigger: " + error.toString(), "AfterSave", error);
}
