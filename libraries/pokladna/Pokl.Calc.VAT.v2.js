// ==============================================
// POKLADŇA - Prepočet DPH (používa MementoVAT modul)
// Verzia: 2.0 | Dátum: March 2026 | Autor: ASISTANTO
// Knižnica: Pokladňa | Trigger: Before Save
// ==============================================
// 📋 FUNKCIA:
//    - Wrapper pre MementoVAT modul
//    - Automatický prepočet súm s DPH a bez DPH
//    - Konfigurácia field names pre Pokladňu
// ==============================================
// 🔧 POUŽÍVA:
//    - MementoVAT v2.0 (core modul - musí byť načítaný PRED týmto scriptom!)
//    - MementoUtils v7.0 (voliteľné, pre lepší logging)
// ==============================================
// ⚠️ KRITICKÉ: LOAD ORDER V MEMENTO
//    1. MementoVAT.js (najprv načítať tento modul!)
//    2. Potom tento script
//
//    Ako nastaviť load order v Memento:
//    - Ísť do Nastavenia → Skripty
//    - Drag & drop MementoVAT.js nahor
//    - Tento script nižšie
// ==============================================

'use strict';

// ==============================================
// VALIDÁCIA ZÁVISLOSTÍ
// ==============================================

if (typeof MementoVAT === 'undefined') {
    message("❌ Chýba modul MementoVAT!\n\nNačítajte MementoVAT.js PRED týmto scriptom.");
    cancel();
}

// ==============================================
// KONFIGURÁCIA PRE POKLADŇU
// ==============================================

var CONFIG = {
    // Názvy polí v knižnici Pokladňa
    fields: {
        isVat: "s DPH",
        vatRate: "sadzba DPH",
        sum: "Suma",
        sumTotal: "Suma s DPH",
        vat: "DPH",
        vatRateValue: "DPH%",
        date: "Dátum",
        debugLog: "Debug_Log",
        errorLog: "Error_Log",
        info: "info"
    },

    // Názov knižnice sadzieb DPH
    vatRatesLibrary: "sadzby dph",

    // Názvy polí v knižnici sadzieb
    vatRatesFields: {
        validFrom: "Platnosť od",
        standard: "základná",
        reduced: "znížená"
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        var currentEntry = entry();

        // Zavolaj MementoVAT modul s konfiguráciou pre Pokladňu
        var result = MementoVAT.calculateVAT(currentEntry, CONFIG);

        // Spracovanie výsledku
        if (result.success) {
            // Úspešný výpočet
            if (result.data) {
                // Zobraz krátku notifikáciu (message pre krátke správy!)
                message("✅ DPH vypočítané");
            }
            return true;

        } else {
            // Chyba pri výpočte
            // Pre detailnú chybu použi dialog() nie message()!
            var errorDetails = "=== CHYBA PRI VÝPOČTE DPH ===\n\n";
            errorDetails += result.error || "Neznáma chyba";
            errorDetails += "\n\nSkontrolujte Debug_Log pre viac informácií.";

            dialog("Chyba výpočtu DPH", errorDetails, "OK");
            cancel();
            return false;
        }

    } catch (error) {
        // Kritická chyba
        var criticalError = "=== KRITICKÁ CHYBA ===\n\n";
        criticalError += error.toString();
        criticalError += "\n\nScript: Pokl.Calc.VAT v2.0";
        criticalError += "\nModul: MementoVAT v" + MementoVAT.getVersion();

        dialog("Kritická chyba", criticalError, "OK");
        cancel();
        return false;
    }
}

// ==============================================
// SPUSTENIE
// ==============================================

var result = main();

// Ak hlavná funkcia zlyhala, zruš uloženie
if (!result) {
    cancel();
}
