/**
 * ============================================================================
 * MEMENTO DATABASE SCRIPT
 * ============================================================================
 *
 * Knižnica:    Dochádzka
 * Názov:       Doch.Trigger.Calculate
 * Typ:         Trigger (Before Save)
 * Verzia:      1.0
 *
 * Popis:
 * Jednoduchý trigger script, ktorý volá knižnicu Doch.Calc.Lib
 * pre prepočet dochádzky. Používa sa ako Before Save trigger.
 *
 * Závislosti:
 * - Doch.Calc.Lib (shared script)
 * - MementoCore 7.0+
 * - MementoConfig 7.0+
 * - MementoUtils 7.0+
 * - MementoBusiness 7.0+
 *
 * Autor:       Memento Team
 * Vytvorené:   2025-01-30
 *
 * ============================================================================
 */

// ==============================================
// SPUSTENIE PREPOČTU
// ==============================================

try {
    // Získaj aktuálny záznam
    var en = entry();

    // Voliteľné nastavenia (nepovinné)
    var options = {
        roundToQuarter: true,  // Zaokrúhľovať na 15 minút
        includeBreaks: true    // Započítať prestávky
    };

    // Zavolaj knižnicu pre prepočet
    var result = dochCalcMain(en, options);

    // Kontrola výsledku
    if (!result.success) {
        // Chyba - zobraz správu a zruš uloženie
        message("❌ Chyba prepočtu: " + result.error);
        cancel();
    } else {
        // Úspech - môžeš zobraziť info
        var data = result.data;
        message("✅ Prepočet dokončený: " +
                data.employees.length + " zamestnancov, " +
                data.totalWorkedHours + "h, " +
                data.totalWageCosts.toFixed(2) + "€");
    }

} catch (error) {
    // Zachytenie neočakávaných chýb
    message("❌ Kritická chyba: " + error.toString());
    cancel();
}
