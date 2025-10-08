/**
 * ============================================================================
 * MEMENTO DATABASE SCRIPT
 * ============================================================================
 *
 * Knižnica:    Cenové ponuky
 * Názov:       CP.Trigger.AutoNumber
 * Typ:         Trigger (onCreate - "Opened card" / After Save)
 * Verzia:      1.0.0
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
 * - MementoUtils (exportuje generateNextNumber z MementoBusiness)
 * - MementoConfig (definícia polí a knižníc)
 * - ASISTANTO Defaults (placeholder definícia)
 *
 * ============================================================================
 */

var CONFIG = {
    scriptName: "CP.Trigger.AutoNumber",
    version: "1.0.0",

    // Názvy použité pre generovanie čísla
    libraryName: "Cenové ponuky",
    numberFieldName: "Číslo",  // Pole v Cenových ponukách kde sa uloží číslo
    placeholderFieldName: "CP Placeholder"  // Pole v ASISTANTO Defaults s placeholder formátom
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    var currentEntry = entry();

    try {
        // Načítaj utility
        var utils = MementoUtils;
        if (!utils) {
            message("❌ MementoUtils nie je dostupný");
            return;
        }

        // Skontroluj, či už má záznam číslo
        var existingNumber = currentEntry.field(CONFIG.numberFieldName);
        if (existingNumber && existingNumber !== "") {
            // Záznam už má číslo, netreba generovať
            utils.addDebug(currentEntry, "ℹ️ Záznam už má číslo: " + existingNumber);
            return;
        }

        // Vygeneruj nové číslo
        var result = utils.generateNextNumber(
            CONFIG.libraryName,
            CONFIG.numberFieldName,
            CONFIG.placeholderFieldName
        );

        if (!result.success) {
            var errorMsg = "❌ Chyba pri generovaní čísla: " + result.error;
            utils.addError(currentEntry, errorMsg, CONFIG.scriptName);
            message(errorMsg);
            return;
        }

        // Nastav vygenerované číslo
        currentEntry.set(CONFIG.numberFieldName, result.number);

        // Log do Debug_Log
        var debugMsg = "✅ Automaticky vygenerované číslo: " + result.number + "\n";
        debugMsg += "   Placeholder: " + result.placeholder + "\n";
        debugMsg += "   Prefix: " + result.prefix + "\n";
        debugMsg += "   Poradie: " + result.sequence;

        utils.addDebug(currentEntry, debugMsg);

        // Upozornenie pre užívateľa
        message("✅ Číslo cenovej ponuky: " + result.number);

    } catch (error) {
        var criticalError = "❌ KRITICKÁ CHYBA pri generovaní čísla: " + error.toString();

        // Pokus sa zapísať chybu do Error_Log
        try {
            if (MementoUtils && MementoUtils.addError) {
                MementoUtils.addError(currentEntry, criticalError, CONFIG.scriptName);
            }
        } catch (e) {
            // Ignoruj chyby pri zápise logu
        }

        message(criticalError);
    }
}

// ==============================================
// SPUSTENIE
// ==============================================

main();
