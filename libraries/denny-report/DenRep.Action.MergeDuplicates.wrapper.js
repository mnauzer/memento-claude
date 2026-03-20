// ==============================================
// MEMENTO DATABASE - DENNÝ REPORT MERGE DUPLICATES (WRAPPER)
// Verzia: 2.0.0 | Dátum: 2026-03-20 | Autor: ASISTANTO
// Knižnica: Denný report | Typ: Action (Manual)
// ==============================================
// 📋 ÚČEL:
//    - Tenký wrapper pre DennyReport.mergeDuplicates()
//    - Vyhľadá duplicitné záznamy v Dennom reporte (rovnaký dátum)
//    - Zlúči backlinky do najstaršieho záznamu a zmaže duplikáty
// ==============================================
// 🔧 CHANGELOG:
// v2.0.0 (2026-03-20) - REFAKTORING NA MODULE PATTERN:
//    - Zredukované z 200+ riadkov na ~30 riadkov wrapper
//    - Logika v DennyReport.mergeDuplicates()
// ==============================================

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
var SCRIPT_NAME = "Denný report - Merge Duplicates (Wrapper)";

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(entry(), utils.getIcon("start") + " === ŠTART " + SCRIPT_NAME + " v" + SCRIPT_VERSION + " ===");
        utils.addDebug(entry(), "  📦 DennyReport modul v" + dennyReport.version);

        // Zavolaj modul funkciu
        var result = dennyReport.mergeDuplicates(entry());

        if (!result.success) {
            dialog("Chyba", "❌ Chyba pri zlúčení duplicitov!\n\n" + (result.error || "Unknown error"), "OK");
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

        // Už zlúčené modulom - len zobraz výsledok
        var finalSummary = "✅ ZLÚČENIE DOKONČENÉ\n\n";
        finalSummary += "Zlúčených skupín: " + result.merged + "\n";
        finalSummary += "Zmazaných duplicitov: " + result.deleted + "\n";

        dialog("Výsledok zlúčenia", finalSummary, "OK");
        utils.addDebug(entry(), "✅ Zlúčenie dokončené: " + result.merged + " skupín, " + result.deleted + " duplicitov zmazaných");

        message("✅ Zlúčené " + result.merged + " skupín\n🗑️ Zmazaných " + result.deleted + " duplicitov");

    } catch (error) {
        utils.addError(entry(), "Kritická chyba v hlavnej funkcii", "main", error);
        dialog("Chyba", "❌ Kritická chyba!\n\n" + error.toString(), "OK");
    }
}

// ==============================================
// SPUSTENIE
// ==============================================

main();
