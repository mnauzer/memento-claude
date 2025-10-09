/**
 * ============================================================================
 * UNIVERZÁLNY TRIGGER SCRIPT
 * ============================================================================
 *
 * Názov:       Universal.Trigger.onCreate.OpenedCard
 * Typ:         Trigger (onCreate - "Opened card" / After Save)
 * Verzia:      1.0.0
 * Dátum:       October 2025
 * Použitie:    Univerzálne použiteľný vo všetkých knižniciach
 *
 * Popis:
 * Zaznamená vytvorenie záznamu - nastaví polia "zapísal" a "dátum zápisu".
 * Tento trigger sa spúšťa ASYNCHRÓNNE po prvom uložení záznamu.
 *
 * Trigger fáza: "Opened card" (asynchronous, after save)
 * - Spúšťa sa PO prvom uložení záznamu do databázy
 * - Vykonáva sa asynchrónne (na pozadí)
 * - Nastaví pole "zapísal" na aktuálneho užívateľa
 * - Nastaví pole "dátum zápisu" na aktuálny dátum
 *
 * Závislosti:
 * - MementoUtils (exportuje funkcie z MementoRecordTracking)
 * - MementoRecordTracking modul (CORE shared script)
 * - MementoConfig (definície polí)
 *
 * DÔLEŽITÉ: Všetky CORE moduly musia byť načítané ako Shared Scripts
 * v Memento Database
 *
 * Použitie:
 * 1. Skopíruj tento script do knižnice v Memento Database
 * 2. Nastav trigger na: onCreate → "Opened card"
 * 3. Script automaticky zaznamená užívateľa a čas vytvorenia
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
    // Zaznamenaj vytvorenie záznamu (zapísal + dátum zápisu)
    var success = MementoUtils.trackRecordCreation(currentEntry);

    if (!success) {
        message("⚠️ Nepodarilo sa zaznamenať vytvorenie záznamu");
    }
    // Ak sa podarilo, nepíšeme message aby sme neotravovali užívateľa

} catch (error) {
    message("❌ CHYBA: " + error.toString());
}
