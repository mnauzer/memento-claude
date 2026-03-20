/**
 * ============================================================================
 * MEMENTO DATABASE SCRIPT
 * ============================================================================
 *
 * Knižnica:    Denný report
 * Event:       updateEntryAfterSave
 * Verzia:      1.0.0
 *
 * Popis:
 * Po aktualizácii existujúceho Denného reportu pridáva ikonu 📊 do všetkých
 * linknutých záznamov (Dochádzka, Práce, Jazdy, Pokladňa).
 *
 * Závislosti:
 * - MementoUtils 8.0+ (reusable module - nahrať osobitne)
 *
 * Autor:       ASISTANTO
 * Vytvorené:   2026-03-20
 *
 * ============================================================================
 */

// ==============================================
// VALIDÁCIA ZÁVISLOSTÍ A HLAVNÁ FUNKCIA
// ==============================================

// Zabal celý kód do if bloku - žiadne return na top level!
if (typeof MementoUtils !== 'undefined') {

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var config = utils.config;  // Property getter - NOT getConfig() function
var currentEntry = entry();

var SCRIPT_VERSION = "1.0.0";
var SCRIPT_NAME = "updateEntryAfterSave";

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

try {
    utils.addDebug(currentEntry, "🔄 " + SCRIPT_NAME + " v" + SCRIPT_VERSION);

    var dailyReportIcon = "📊";
    var iconField = "ikony záznamu";
    var updatedCount = 0;

    // Získaj všetky linknuté záznamy
    var linkedRecords = [
        {
            field: config.fields.dailyReport.attendance,
            label: "Dochádzka"
        },
        {
            field: config.fields.dailyReport.workRecord,
            label: "Práce"
        },
        {
            field: config.fields.dailyReport.rideLog,
            label: "Jazdy"
        },
        {
            field: config.fields.dailyReport.cashBook,
            label: "Pokladňa"
        }
    ];

    // Prejdi všetky typy linknutých záznamov
    for (var i = 0; i < linkedRecords.length; i++) {
        var recordType = linkedRecords[i];
        var records = utils.safeGetLinks(currentEntry, recordType.field) || [];

        if (records.length === 0) continue;

        utils.addDebug(currentEntry, "  🔍 " + recordType.label + ": " + records.length + " záznamov");

        // Aktualizuj ikonu v každom zázname
        for (var j = 0; j < records.length; j++) {
            var record = records[j];
            var recordId = record.field("ID");

            try {
                var currentIcons = utils.safeGet(record, iconField, "");

                // Pridaj ikonu ak ešte neexistuje
                if (currentIcons.indexOf(dailyReportIcon) === -1) {
                    var newIcons = currentIcons ? currentIcons + " " + dailyReportIcon : dailyReportIcon;
                    utils.safeSet(record, iconField, newIcons);
                    updatedCount++;
                    utils.addDebug(currentEntry, "    ✅ Pridaná ikona do " + recordType.label + " #" + recordId);
                }
            } catch (error) {
                // Silent fail pre jednotlivé záznamy - neblokuj AfterSave
                utils.addDebug(currentEntry, "    ⚠️ Chyba pri aktualizácii " + recordType.label + " #" + recordId + ": " + error.toString());
            }
        }
    }

    if (updatedCount > 0) {
        utils.addDebug(currentEntry, "✅ Aktualizovaných " + updatedCount + " ikon v linknutých záznamoch");
    } else {
        utils.addDebug(currentEntry, "ℹ️ Všetky linknuté záznamy už majú ikonu");
    }

} catch (error) {
    // Silent fail - AfterSave nesmie zablokovať uloženie
    if (typeof utils !== 'undefined') {
        utils.addError(currentEntry, "Chyba v " + SCRIPT_NAME + ": " + error.toString(), SCRIPT_NAME, error);
    }
}

} // Koniec if (typeof MementoUtils !== 'undefined')
