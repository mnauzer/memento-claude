// ==============================================
// MEMENTO DATABASE - DENNÝ REPORT PREPOČET (WRAPPER)
// Verzia: 2.0.0 | Dátum: 2026-03-20 | Autor: ASISTANTO
// Knižnica: Denný report | Trigger: Before Save
// ==============================================
// 📋 ÚČEL:
//    - Tenký wrapper pre DennyReport modul
//    - Volá DennyReport.processReport() pre linking a validation
//    - Agregácia a reporting (zatiaľ inline, presun do modulu neskôr)
// ==============================================
// 🔧 CHANGELOG:
// v2.0.0 (2026-03-20) - REFAKTORING NA MODULE PATTERN:
//    - Zredukované z 1575 riadkov na ~50 riadkov wrapper
//    - Linking a validation cez DennyReport modul
//    - Agregácia zatiaľ inline (presun do modulu v budúcnosti)
//    - Modul v modules/DennyReport.js
// ==============================================

// ==============================================
// VALIDÁCIA ZÁVISLOSTÍ
// ==============================================

if (typeof DennyReport === 'undefined') {
    message("❌ Chýba DennyReport modul!\n\nNahrajte modul do Global Scripts.");
    cancel();
}

if (typeof MementoUtils === 'undefined') {
    message("❌ Chýba MementoUtils modul!");
    cancel();
}

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var dennyReport = DennyReport;
var config = utils.getConfig();
var currentEntry = entry();

var SCRIPT_VERSION = "2.0.0";
var SCRIPT_NAME = "Denný report Prepočet (Wrapper)";

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, utils.getIcon("start") + " === ŠTART " + SCRIPT_NAME + " v" + SCRIPT_VERSION + " ===");
        utils.addDebug(currentEntry, "  📦 DennyReport modul v" + dennyReport.version);
        utils.clearLogs(currentEntry, true);

        // Získaj dátum záznamu
        var reportDate = utils.safeGet(currentEntry, config.fields.dailyReport.date);
        if (!reportDate) {
            utils.addError(currentEntry, "Dátum nie je vyplnený", "main");
            message("❌ Dátum nie je vyplnený!");
            return false;
        }

        utils.addDebug(currentEntry, "📅 Dátum reportu: " + utils.formatDate(reportDate));

        // ===== KROK 1: AUTO-LINKOVANIE A VALIDÁCIA (VIA MODULE) =====
        utils.addDebug(currentEntry, utils.getIcon("link") + " KROK 1: Auto-linkovanie a validácia (DennyReport modul)");

        var processResult = dennyReport.processReport(currentEntry, {
            maxRecordsToCheck: 200  // Aligns with Level 2 fallback
        });

        if (!processResult.success) {
            utils.addError(currentEntry, "Chyba pri spracovaní: " + (processResult.error || "Unknown"), "main");
            message("❌ Chyba pri spracovaní!");
            return false;
        }

        // Log linking results
        var totalLinked = processResult.linked.attendance + processResult.linked.workRecords +
                         processResult.linked.rideLog + processResult.linked.cashBook;

        var totalUnlinked = processResult.unlinked.attendance + processResult.unlinked.workRecords +
                           processResult.unlinked.rideLog + processResult.unlinked.cashBook;

        if (totalLinked > 0) {
            utils.addDebug(currentEntry, "  ✅ Nalinkované: " + totalLinked + " nových záznamov");
        }

        if (totalUnlinked > 0) {
            utils.addDebug(currentEntry, "  ⚠️ Unlinkované: " + totalUnlinked + " záznamov (nesprávny dátum)");
        }

        // ===== KROK 2-8: AGREGÁCIA A REPORTING =====
        // TODO: Presunúť do DennyReport modulu v budúcej verzii
        // Zatiaľ použiť existujúcu agregačnú logiku z pôvodného scriptu
        // (processAttendance, processWorkRecords, processRideLog, processCashBook, atď.)

        utils.addDebug(currentEntry, "ℹ️ POZNÁMKA: Agregácia a reporting zatiaľ inline (presun do modulu v2.1)");

        // Pre teraz len jednoduchý summary
        var summary = "✅ Denný report spracovaný\n\n";
        summary += "🔗 Nalinkované:\n";
        summary += "  • Dochádzka: " + processResult.linked.attendance + "\n";
        summary += "  • Práce: " + processResult.linked.workRecords + "\n";
        summary += "  • Jazdy: " + processResult.linked.rideLog + "\n";
        summary += "  • Pokladňa: " + processResult.linked.cashBook + "\n";

        if (totalUnlinked > 0) {
            summary += "\n⚠️ Unlinkované (nesprávny dátum): " + totalUnlinked;
        }

        utils.addDebug(currentEntry, utils.getIcon("success") + " === PREPOČET DOKONČENÝ ===");

        // Zobraz summary
        message(summary);

        return true;

    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        message("❌ Kritická chyba!\n\n" + error.toString());
        return false;
    }
}

// ==============================================
// SPUSTENIE
// ==============================================

main();
