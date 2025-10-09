/**
 * ============================================================================
 * UNIVERZÁLNY TRIGGER SCRIPT - ID CONFLICT RESOLUTION
 * ============================================================================
 *
 * Názov:       Universal.Trigger.onCreate.OpeningCard.IDConflict
 * Typ:         Trigger (onCreate - "Opening card" / Before Save)
 * Verzia:      1.0.0
 * Dátum:       October 2025
 * Použitie:    Univerzálne použiteľný vo všetkých knižniciach s ID poľom
 *
 * Popis:
 * Automaticky detekuje a rieši konflikty ID čísel pri vytváraní nových záznamov.
 * Tento trigger sa spúšťa SYNCHRONNE pred prvým uložením záznamu.
 *
 * PROBLÉM:
 * V team verzii Memento Database môže dôjsť ku konfliktom ID čísel:
 * - Užívateľ A vytvorí záznam s ID=100 (lokálne, ešte nesynchronizované)
 * - Užívateľ B vytvorí záznam s ID=100 (lokálne, ešte nesynchronizované)
 * - Pri synchronizácii alebo uložení vznikne konflikt (unique constraint)
 *
 * RIEŠENIE:
 * Script automaticky:
 * 1. Skontroluje či existuje záznam s rovnakým ID
 * 2. Ak áno, nájde najvyššie ID v knižnici
 * 3. Nastaví nové ID = maxID + 1
 * 4. Záznam sa uloží s novým, unikátnym ID
 *
 * Trigger fáza: "Opening card" (synchronous, before save)
 * - Spúšťa sa KEĎ sa otvára formulár nového záznamu
 * - Vykonáva sa PRED prvým uložením do databázy
 * - Kontroluje a opravuje ID pred uložením
 *
 * Závislosti:
 * - MementoUtils (exportuje funkcie z MementoIDConflictResolver)
 * - MementoIDConflictResolver modul (CORE shared script)
 * - MementoConfig (definície polí)
 *
 * DÔLEŽITÉ: Všetky CORE moduly musia byť načítané ako Shared Scripts
 * v Memento Database
 *
 * KED POUŽÍVAŤ:
 * - Team verzia Memento Database (viacero užívateľov súčasne)
 * - ID pole typu int s autoincrement +1 a unique constraint
 * - Problémy so synchronizáciou a duplicate ID chybami
 *
 * Použitie:
 * 1. Skopíruj tento script do knižnice v Memento Database
 * 2. Nastav trigger na: onCreate → "Opening card"
 * 3. Script automaticky kontroluje a rieši ID konflikty
 *
 * POZNÁMKA:
 * Tento trigger by mal byť PRVÝ onCreate trigger v knižnici!
 * Mal by sa vykonať pred inými triggermi (napr. setEditMode).
 *
 * ============================================================================
 */

// ==============================================
// IMPORT FUNKCIÍ z MementoUtils
// ==============================================

// MementoUtils exportuje všetky potrebné funkcie
// z MementoIDConflictResolver modulu
if (typeof MementoUtils === 'undefined') {
    message("❌ CHYBA: MementoUtils nie je načítaný!");
    throw new Error("Missing MementoUtils");
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

var currentEntry = entry();

try {
    // Skontroluj a vyriešiť ID konflikt
    // Druhý parameter je názov ID poľa (default: "ID")
    var result = MementoUtils.checkAndResolveIDConflict(currentEntry, "ID");

    if (!result.success) {
        // Ak sa vyskytla chyba
        message("❌ CHYBA pri kontrole ID: " + (result.error || "neznáma chyba"));
    } else if (result.conflictDetected) {
        // Konflikt bol detekovaný a vyriešený
        message("⚠️ ID konflikt vyriešený: " + result.oldID + " → " + result.newID);
    }
    // Ak je result.success = true a result.conflictDetected = false, žiadny konflikt
    // Nepíšeme message aby sme neotravovali užívateľa

} catch (error) {
    message("❌ CHYBA: " + error.toString());
}
