/**
 * ============================================================================
 * UNIVERZÁLNY TRIGGER SCRIPT
 * ============================================================================
 *
 * Názov:       Universal.Trigger.onUpdate.AfterSave
 * Typ:         Trigger (onUpdate - "After save")
 * Verzia:      1.0.0
 * Dátum:       October 2025
 * Použitie:    Univerzálne použiteľný vo všetkých knižniciach
 *
 * Popis:
 * Zaznamená úpravu záznamu - nastaví polia "upravil" a "dátum úpravy".
 * Tento trigger sa spúšťa ASYNCHRÓNNE po uložení zmien záznamu.
 *
 * Trigger fáza: "After save" (asynchronous)
 * - Spúšťa sa PO uložení zmien záznamu do databázy
 * - Vykonáva sa asynchrónne (na pozadí)
 * - Nastaví pole "upravil" na aktuálneho užívateľa
 * - Nastaví pole "dátum úpravy" na aktuálny dátum
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
 * 2. Nastav trigger na: onUpdate → "After save"
 * 3. Script automaticky zaznamená užívateľa a čas úpravy
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
    // Zaznamenaj úpravu záznamu (upravil + dátum úpravy)
    var success = MementoUtils.trackRecordModification(currentEntry);

    if (!success) {
        message("⚠️ Nepodarilo sa zaznamenať úpravu záznamu");
    }
    // Ak sa podarilo, nepíšeme message aby sme neotravovali užívateľa

} catch (error) {
    message("❌ CHYBA: " + error.toString());
}
