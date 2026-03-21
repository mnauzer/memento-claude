/**
 * ============================================================================
 * Knižnica:  Cenové ponuky | Event: Action | Verzia: 1.0.0
 * ============================================================================
 * THIN WRAPPER - všetka logika je v CP.Action.CreateOrder.Module.js (v2.0.0+)
 *
 * Event Type: ACTION
 * Scope: ENTRY
 *
 * Použitie: Vytvorí zákazku (Order) z cenovej ponuky vrátane všetkých dielov
 *
 * ============================================================================
 * MEMENTO SETUP:
 * ============================================================================
 * 1. Global Scripts (Load Order):
 *    - MementoConfig (v8.0+)
 *    - MementoCore (v8.0+)
 *    - MementoUtils (v8.1+)
 *    - CP.Action.CreateOrder.Module (v2.0.0+)
 *
 * 2. Cenové ponuky → Automation → Akcie (Actions):
 *    Scope: Entry
 *    Action Name: "Vytvoriť zákazku"
 * ============================================================================
 */

'use strict';

// ==============================================
// DEPENDENCY VALIDATION
// ==============================================

if (typeof CPCreateOrder === 'undefined') {
    dialog("Chyba", "❌ Chýba CP.Action.CreateOrder.Module modul!\n\nNahrajte modul v Global Scripts.", "OK");
    cancel();
}

// ==============================================
// MAIN EXECUTION - Action
// ==============================================

try {
    var currentEntry = entry();

    // Call module to create order
    var result = CPCreateOrder.createOrderFromQuote(currentEntry);

    if (!result.success) {
        dialog("Chyba", "❌ Vytvorenie zákazky zlyhalo!\n\n" + result.error, "OK");
        cancel();
    }

    // Success - show order details
    var successMsg = "✅ Zákazka vytvorená!\n\n";
    successMsg += "Číslo zákazky: " + (result.orderNumber || "N/A") + "\n";
    successMsg += "Položiek skopírovaných: " + (result.itemsCopied || 0);

    dialog("Úspech", successMsg, "OK");

} catch (error) {
    dialog("Kritická chyba", "❌ KRITICKÁ CHYBA!\n\n" + error.toString(), "OK");
    cancel();
}
