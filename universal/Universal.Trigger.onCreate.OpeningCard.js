/**
 * ============================================================================
 * UNIVERZÁLNY TRIGGER SCRIPT
 * ============================================================================
 *
 * Názov:       Universal.Trigger.onCreate.OpeningCard
 * Typ:         Trigger (onCreate - "Opening card" / Before Save)
 * Verzia:      1.0.0
 * Dátum:       October 2025
 * Použitie:    Univerzálne použiteľný vo všetkých knižniciach
 *
 * Popis:
 * Nastaví view režim na "Editácia " pri otvorení novej karty (pred uložením).
 * Tento trigger sa spúšťa SYNCHRONNE pred prvým uložením záznamu.
 *
 * Trigger fáza: "Opening card" (synchronous, before save)
 * - Spúšťa sa KEĎ sa otvára formulár nového záznamu
 * - Vykonáva sa PRED prvým uložením do databázy
 * - Nastaví view = "Editácia " pre editačný režim
 *
 * Závislosti:
 * - MementoUtils (exportuje funkcie z MementoRecordTracking)
 * - MementoRecordTracking modul (CORE shared script)
 * - MementoConfig (definície polí a konštánt)
 *
 * DÔLEŽITÉ: Všetky CORE moduly musia byť načítané ako Shared Scripts
 * v Memento Database
 *
 * Použitie:
 * 1. Skopíruj tento script do knižnice v Memento Database
 * 2. Nastav trigger na: onCreate → "Opening card"
 * 3. Script automaticky nastaví view na "Editácia "
 *
 * ============================================================================
 */

// ==============================================
// IMPORT FUNKCIÍ z MementoUtils
// ==============================================

// MementoUtils exportuje všetky potrebné funkcie
// z MementoRecordTracking modulu
if (typeof MementoUtils === 'undefined') {
    message("❌ CHYBA: MementoUtils nie je načítaný!");
    throw new Error("Missing MementoUtils");
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

var currentEntry = entry();

try {
    // Nastav view režim na "Editácia "
    var success = MementoUtils.setEditMode(currentEntry);

    if (!success) {
        message("⚠️ Nepodarilo sa nastaviť editačný režim");
    }
    // Ak sa podarilo, nepíšeme message aby sme neotravovali užívateľa

} catch (error) {
    message("❌ CHYBA: " + error.toString());
}
