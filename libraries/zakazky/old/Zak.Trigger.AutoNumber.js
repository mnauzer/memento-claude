/**
 * ============================================================================
 * MEMENTO DATABASE SCRIPT
 * ============================================================================
 *
 * Knižnica:    Zákazky
 * Názov:       Z.Trigger.AutoNumber
 * Typ:         Trigger (onCreate - "Opened card" / After Save)
 * Verzia:      1.0.0
 * Dátum:       October 2025
 *
 * Popis:
 * Automatické generovanie čísla zákazky pri vytvorení nového záznamu.
 *
 * Trigger fáza: "Opened card" (asynchronous, after save)
 * - Spúšťa sa PO uložení záznamu do databázy
 * - Zabráni race conditions (súčasné vytváranie viacerých záznamov)
 * - Zabráni gap-om v sekvencii (ak užívateľ zruší vytvorenie)
 *
 * Placeholder formát v ASISTANTO Defaults → Z Placeholder:
 * - "ZYYXXX" → Z25001, Z25002, Z25003...
 *   - Z = literál (zostáva ako je)
 *   - YY = rok 2-ciferný (napr. 25 pre rok 2025)
 *   - XXX = sekvenčné číslo 3-ciferné (001, 002, 003...)
 *
 * Ďalšie podporované formáty:
 * - "YYYY-XXX" → 2025-001, 2025-002...
 * - "Z-YYMMXXX" → Z-2510001, Z-2510002...
 *
 * Závislosti:
 * - MementoAutoNumber (CORE shared script) - z adresára /core/
 * - ASISTANTO Defaults (placeholder definícia)
 *
 * DÔLEŽITÉ: MementoAutoNumber.js musí byť načítaný ako Shared Script
 * v Memento Database z CORE adresára
 *
 * ============================================================================
 */

// ==============================================
// IMPORT FUNKCIÍ zo CORE Shared Script
// ==============================================

// Memento Database automaticky načíta shared scripts z CORE adresára.
// MementoAutoNumber namespace je dostupný z /core/MementoAutoNumber.js

// Overenie dostupnosti importu
if (typeof MementoAutoNumber === 'undefined') {
    message("❌ CHYBA: MementoAutoNumber shared script nie je načítaný!");
    throw new Error("Missing MementoAutoNumber shared script");
}

// Overenie správnej inicializácie
if (!MementoAutoNumber.isLoaded || !MementoAutoNumber.isLoaded()) {
    message("❌ CHYBA: MementoAutoNumber modul nie je správne inicializovaný!");
    throw new Error("MementoAutoNumber module initialization failed");
}

// ==============================================
// KONFIGURÁCIA
// ==============================================

var CONFIG = {
    scriptName: "Z.Trigger.AutoNumber",
    version: "1.0.0",

    // Názvy použité pre generovanie čísla
    libraryName: "Zákazky",
    numberFieldName: "Číslo",  // Pole v Zákazkách kde sa uloží číslo
    placeholderFieldName: "Z Placeholder"  // Pole v ASISTANTO Defaults s placeholder formátom
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
        var result = MementoAutoNumber.generateNumber(
            CONFIG.libraryName,
            CONFIG.numberFieldName,
            CONFIG.placeholderFieldName
        );

        if (!result.success) {
            message("❌ Chyba pri generovaní čísla zákazky: " + result.error);
        } else {
            // Nastav vygenerované číslo
            currentEntry.set(CONFIG.numberFieldName, result.number);

            // Upozornenie pre užívateľa
            message("✅ Číslo zákazky: " + result.number);
        }
    }

} catch (error) {
    message("❌ KRITICKÁ CHYBA: " + error.toString());
}
