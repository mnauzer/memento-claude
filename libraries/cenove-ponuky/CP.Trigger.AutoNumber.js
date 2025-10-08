/**
 * ============================================================================
 * MEMENTO DATABASE SCRIPT
 * ============================================================================
 *
 * Knižnica:    Cenové ponuky
 * Názov:       CP.Trigger.AutoNumber
 * Typ:         Trigger (onCreate - "Opened card" / After Save)
 * Verzia:      1.1.0
 * Dátum:       October 2025
 *
 * Popis:
 * Automatické generovanie čísla cenovej ponuky pri vytvorení nového záznamu.
 *
 * Trigger fáza: "Opened card" (asynchronous, after save)
 * - Spúšťa sa PO uložení záznamu do databázy
 * - Zabráni race conditions (súčasné vytváranie viacerých záznamov)
 * - Zabráni gap-om v sekvencii (ak užívateľ zruší vytvorenie)
 *
 * Placeholder formát v ASISTANTO Defaults → CP Placeholder:
 * - "CYYXXX" → C25001, C25002, C25003...
 *   - C = literál (zostáva ako je)
 *   - YY = rok 2-ciferný (napr. 25 pre rok 2025)
 *   - XXX = sekvenčné číslo 3-ciferné (001, 002, 003...)
 *
 * Ďalšie podporované formáty:
 * - "YYYY-XXX" → 2025-001, 2025-002...
 * - "CP-YYMMXXX" → CP-2510001, CP-2510002...
 *
 * Závislosti:
 * - CP.AutoNumber.Lib (shared script) - musí byť pridaný v knižnici
 * - ASISTANTO Defaults (placeholder definícia)
 *
 * ============================================================================
 */

// ==============================================
// IMPORT FUNKCIÍ zo Shared Script
// ==============================================

// Memento Database automaticky načíta shared scripts.
// CPAutoNumber namespace je dostupný z CP.AutoNumber.Lib.js

// Overenie dostupnosti importu
if (typeof CPAutoNumber === 'undefined') {
    message("❌ CHYBA: CP.AutoNumber.Lib shared script nie je načítaný!");
    throw new Error("Missing CP.AutoNumber.Lib shared script");
}

// Overenie správnej inicializácie
if (!CPAutoNumber.isLoaded || !CPAutoNumber.isLoaded()) {
    message("❌ CHYBA: CPAutoNumber modul nie je správne inicializovaný!");
    throw new Error("CPAutoNumber module initialization failed");
}

// ==============================================
// KONFIGURÁCIA
// ==============================================

var CONFIG = {
    scriptName: "CP.Trigger.AutoNumber",
    version: "1.1.0",

    // Názvy použité pre generovanie čísla
    libraryName: "Cenové ponuky",
    numberFieldName: "Číslo",  // Pole v Cenových ponukách kde sa uloží číslo
    placeholderFieldName: "CP Placeholder"  // Pole v ASISTANTO Defaults s placeholder formátom
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

var currentEntry = entry();

try {
    // Skontroluj, či už má záznam číslo
    var existingNumber = currentEntry.field(CONFIG.numberFieldName);
    if (existingNumber && existingNumber !== "") {
        // Záznam už má číslo, netreba generovať
        // Ticho skončiť (bez message aby sme neotravovali užívateľa)
    } else {
        // Vygeneruj nové číslo pomocou importovanej funkcie z namespace
        var result = CPAutoNumber.generateNumber(
            CONFIG.libraryName,
            CONFIG.numberFieldName,
            CONFIG.placeholderFieldName
        );

        if (!result.success) {
            message("❌ Chyba pri generovaní čísla: " + result.error);
        } else {
            // Nastav vygenerované číslo
            currentEntry.set(CONFIG.numberFieldName, result.number);

            // Upozornenie pre užívateľa
            message("✅ Číslo cenovej ponuky: " + result.number);
        }
    }

} catch (error) {
    message("❌ KRITICKÁ CHYBA: " + error.toString());
}
