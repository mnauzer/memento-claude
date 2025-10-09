/**
 * ============================================================================
 * UNIVERZÁLNY TRIGGER SCRIPT
 * ============================================================================
 *
 * Názov:       Universal.Trigger.onUpdate.BeforeSave
 * Typ:         Trigger (onUpdate - "Before save")
 * Verzia:      1.0.0
 * Dátum:       October 2025
 * Použitie:    Univerzálne použiteľný vo všetkých knižniciach
 *
 * Popis:
 * Nastaví view režim na "Tlač" tesne pred uložením úprav záznamu.
 * Tento trigger sa spúšťa SYNCHRONNE bezprostredne pred uložením.
 *
 * Trigger fáza: "Before save" (synchronous)
 * - Spúšťa sa TESNE PRED uložením zmien do databázy
 * - Vykonáva sa synchronne
 * - Nastaví view = "Tlač" pre tlačový/zobrazovací režim
 * - Užívateľ uvidí záznam v tlačovom režime po uložení
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
 * 2. Nastav trigger na: onUpdate → "Before save"
 * 3. Script automaticky nastaví view na "Tlač" pred uložením
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
    // Nastav view režim na "Tlač"
    var success = MementoUtils.setPrintMode(currentEntry);

    if (!success) {
        message("⚠️ Nepodarilo sa nastaviť tlačový režim");
    }
    // Ak sa podarilo, nepíšeme message aby sme neotravovali užívateľa

} catch (error) {
    message("❌ CHYBA: " + error.toString());
}
