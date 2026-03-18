// ==============================================
// DOCHÁDZKA PREPOČET - TEST MODULU
// Verzia: 9.0.0 | Dátum: October 2025 | Autor: ASISTANTO
// Knižnica: Dochádzka | Typ: Test/Manual Script
// ==============================================
// 📋 FUNKCIA:
//    - Testovací/manuálny script pre Doch.Calc.Module
//    - Možnosť spustiť prepočet na vybraný záznam
//    - Debug výstup pre testovanie
// ==============================================
// 🔧 POUŽITIE:
//    1. Otvorte záznam v knižnici Dochádzka
//    2. Spustite tento script z tlačidla/menu
//    3. Skontrolujte výsledky
// ==============================================

try {
    var currentEntry = entry();

    // Info pre používateľa
    message("🔄 Spúšťam manuálny prepočet...\n\nPočkajte prosím...");

    // Kontrola, či je modul načítaný
    if (typeof DochadzkaCalcModule === 'undefined') {
        message("❌ CHYBA: Modul DochadzkaCalcModule nie je načítaný!\n\n" +
                "Uistite sa, že script Doch.Calc.Module.js je načítaný v knižnici.");
        cancel();
    }

    // Získaj info o module
    var moduleVersion = DochadzkaCalcModule.version;

    // Volaj hlavnú funkciu modulu
    var result = DochadzkaCalcModule.calculate(currentEntry);

    // Spracuj výsledok
    if (!result.success) {
        if (result.skipped) {
            // Záznam bol preskočený (napr. voľno)
            message("ℹ️ PRESKOČENÉ\n\n" +
                    "Záznam je nastavený na: " + result.reason + "\n\n" +
                    "Prepočet sa nevykoná.");
        } else {
            // Chyba pri výpočte
            message("❌ CHYBA PRI VÝPOČTE\n\n" +
                    (result.error || "Neznáma chyba") + "\n\n" +
                    "Skontrolujte Debug Log pre detaily.");
        }
    } else {
        // Výpočet prebehol úspešne
        var summaryMsg = "✅ MANUÁLNY PREPOČET DOKONČENÝ\n\n";
        summaryMsg += "📅 " + MementoUtils.formatDate(result.data.date, "DD.MM.YYYY") + " (" + result.data.dayOfWeek + ")\n";
        summaryMsg += "━━━━━━━━━━━━━━━━━━━━━\n";
        summaryMsg += "⏱️ Pracovná doba: " + result.data.workTime + " h\n";
        summaryMsg += "📊 Odpracované: " + result.data.workedHours.toFixed(2) + " h\n";
        summaryMsg += "👥 Zamestnancov: " + result.data.employeeCount + "\n";
        summaryMsg += "💰 Mzdové náklady: " + MementoUtils.formatMoney(result.data.wageCosts) + "\n";
        summaryMsg += "━━━━━━━━━━━━━━━━━━━━━\n\n";

        // Zobraz úspešnosť krokov
        summaryMsg += "📋 KROKY PREPOČTU:\n";
        for (var stepKey in result.steps) {
            var step = result.steps[stepKey];
            var icon = step.success ? "✅" : "❌";
            summaryMsg += icon + " " + step.name + "\n";
        }

        summaryMsg += "\n🔧 Modul verzia: " + moduleVersion;
        summaryMsg += "\nℹ️ Detaily v poli 'info'";

        message(summaryMsg);
    }

} catch (error) {
    message("❌ KRITICKÁ CHYBA!\n\n" +
            "Line: " + error.lineNumber + "\n" +
            "Error: " + error.toString() + "\n\n" +
            "Kontaktujte administrátora.");
}
