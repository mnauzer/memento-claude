// ==============================================
// DOCHÁDZKA PREPOČET - TRIGGER (POUŽÍVA MODUL)
// Verzia: 9.0.0 | Dátum: October 2025 | Autor: ASISTANTO
// Knižnica: Dochádzka | Trigger: Before Save
// ==============================================
// 📋 FUNKCIA:
//    - Trigger script, ktorý volá Doch.Calc.Module
//    - Automatický prepočet pri uložení záznamu
// ==============================================

// Importuj modul (ak nie je načítaný)
if (typeof DochadzkaCalcModule === 'undefined') {
    // V Memento Database sa importuje pomocou eval alebo priamym načítaním
    // Pre testovanie môžete použiť: var DochadzkaCalcModule = require('Doch.Calc.Module');
}

try {
    // Volaj hlavnú funkciu modulu
    var result = DochadzkaCalcModule.calculate(entry());

    // Spracuj výsledok
    if (!result.success) {
        if (result.skipped) {
            // Záznam bol preskočený (napr. voľno)
            message("Záznam je nastavený na: " + result.reason);
            exit();
        } else {
            // Chyba pri výpočte
            message("❌ Chyba pri výpočte: " + (result.error || "Neznáma chyba"));
            cancel();
        }
    }

    // Výpočet prebehol úspešne
    // Message sa zobrazí z modulu cez logFinalSummary

} catch (error) {
    message("❌ Kritická chyba! Line: " + error.lineNumber + ": " + error.toString());
    cancel();
}
