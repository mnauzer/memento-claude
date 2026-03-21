/**
 * ============================================================================
 * MEMENTO DATABASE SCRIPT
 * ============================================================================
 *
 * Knižnica:    Denný report
 * Názov:       DenRep.Trigger.BeforeDelete
 * Typ:         Trigger (Before Delete)
 * Verzia:      1.0.0
 * Event:       deleteEntry
 *
 * Popis:
 * Cleanup trigger, ktorý sa spustí pred vymazaním Denného reportu.
 * Odstráni ikonu 📊 zo všetkých linknutých záznamov a vytvorí audit log.
 *
 * Závislosti:
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

if (typeof MementoUtils === 'undefined') {
    message("❌ CHYBA: Chýba MementoUtils modul!\n\nNemôžem vykonať cleanup.");
    // Neblokuj vymazanie - len upozorni
}

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var config = utils.getConfig();
var currentEntry = entry();

var SCRIPT_VERSION = "1.0.0";
var SCRIPT_NAME = "DenRep.Trigger.BeforeDelete";

// ==============================================
// AUDIT LOG
// ==============================================

/**
 * Vytvorí audit log pred vymazaním
 */
function createAuditLog(deletedData) {
    try {
        var auditInfo = "=== AUDIT LOG - VYMAZANIE ZÁZNAMU ===\n";
        auditInfo += "Dátum/čas: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
        auditInfo += "Knižnica: Denný report\n";
        auditInfo += "Záznam ID: " + currentEntry.field("ID") + "\n";
        auditInfo += "Dátum reportu: " + utils.formatDate(currentEntry.field(config.fields.dailyReport.date)) + "\n\n";

        auditInfo += "VYMAZANÉ LINKY:\n";
        auditInfo += "• Dochádzka: " + deletedData.attendance.count + " záznamov\n";
        auditInfo += "• Práce: " + deletedData.workRecords.count + " záznamov\n";
        auditInfo += "• Jazdy: " + deletedData.rideLog.count + " záznamov\n";
        auditInfo += "• Pokladňa: " + deletedData.cashBook.count + " záznamov\n\n";

        // Ulož do info poľa (bude vymazané s hlavným záznamom)
        utils.safeSet(currentEntry, config.fields.common.info,
                     utils.safeGet(currentEntry, config.fields.common.info, "") + "\n\n" + auditInfo);

        utils.addDebug(currentEntry, "✅ Audit log vytvorený");

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri vytváraní audit logu", "createAuditLog", error);
    }
}

// ==============================================
// CLEANUP FUNKCIONALITA
// ==============================================

/**
 * Odstráni ikonu Denného reportu zo záznamu
 */
function removeIconFromRecord(record, iconField) {
    try {
        var dailyReportIcon = "📊";
        var currentIcons = utils.safeGet(record, iconField, "");

        if (currentIcons.indexOf(dailyReportIcon) !== -1) {
            // Odstráň ikonu
            var newIcons = currentIcons.replace(dailyReportIcon, "").trim();
            // Odstráň dvojité medzery
            newIcons = newIcons.replace(/\s+/g, " ");
            utils.safeSet(record, iconField, newIcons);
            return true;
        }
        return false;

    } catch (error) {
        return false;
    }
}

/**
 * Cleanup linknutých záznamov v jednom type
 */
function cleanupLinkedRecords(backlinkField, label) {
    var result = {
        count: 0,
        removed: [],
        errors: []
    };

    try {
        var records = utils.safeGetLinks(currentEntry, backlinkField) || [];
        result.count = records.length;

        if (records.length === 0) return result;

        utils.addDebug(currentEntry, "  🔍 " + label + ": " + records.length + " záznamov");

        for (var i = 0; i < records.length; i++) {
            var record = records[i];
            var recordId = record.field("ID");

            try {
                // Odstráň ikonu Denného reportu
                var removed = removeIconFromRecord(record, "ikony záznamu");
                if (removed) {
                    result.removed.push(recordId);
                    utils.addDebug(currentEntry, "    ✅ Odstránená ikona z " + label + " #" + recordId);
                }
            } catch (error) {
                result.errors.push({
                    id: recordId,
                    error: error.toString()
                });
                utils.addDebug(currentEntry, "    ⚠️ Chyba pri " + label + " #" + recordId + ": " + error.toString());
            }
        }

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri cleanup " + label, "cleanupLinkedRecords", error);
    }

    return result;
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

try {
    utils.addDebug(currentEntry, "🗑️ === ŠTART " + SCRIPT_NAME + " v" + SCRIPT_VERSION + " ===");

    var deletedData = {
        attendance: {},
        workRecords: {},
        rideLog: {},
        cashBook: {}
    };

    // Cleanup všetkých typov linknutých záznamov
    utils.addDebug(currentEntry, "🧹 Odstraňujem ikony z linknutých záznamov");

    deletedData.attendance = cleanupLinkedRecords(
        config.fields.dailyReport.attendance,
        "Dochádzka"
    );

    deletedData.workRecords = cleanupLinkedRecords(
        config.fields.dailyReport.workRecord,
        "Práce"
    );

    deletedData.rideLog = cleanupLinkedRecords(
        config.fields.dailyReport.rideLog,
        "Jazdy"
    );

    deletedData.cashBook = cleanupLinkedRecords(
        config.fields.dailyReport.cashBook,
        "Pokladňa"
    );

    // Vytvor audit log
    createAuditLog(deletedData);

    // Zhrnutie
    var totalRemoved = deletedData.attendance.removed.length +
                      deletedData.workRecords.removed.length +
                      deletedData.rideLog.removed.length +
                      deletedData.cashBook.removed.length;

    if (totalRemoved > 0) {
        utils.addDebug(currentEntry, "✅ Odstránených " + totalRemoved + " ikon z linknutých záznamov");
    }

    utils.addDebug(currentEntry, "✅ === CLEANUP DOKONČENÝ ===");

    // Zobraz summary
    var summary = "🗑️ Denný report bude vymazaný\n\n";
    summary += "Odstránené ikony:\n";
    summary += "• Dochádzka: " + deletedData.attendance.removed.length + "\n";
    summary += "• Práce: " + deletedData.workRecords.removed.length + "\n";
    summary += "• Jazdy: " + deletedData.rideLog.removed.length + "\n";
    summary += "• Pokladňa: " + deletedData.cashBook.removed.length;

    message(summary);

} catch (error) {
    utils.addError(currentEntry, "Kritická chyba v " + SCRIPT_NAME, SCRIPT_NAME, error);
    // Neblokuj vymazanie - len upozorni
    message("⚠️ Chyba pri cleanup!\n\n" + error.toString() + "\n\nVymazanie pokračuje.");
}
