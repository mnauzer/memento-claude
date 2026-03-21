/**
 * Knižnica:    Zamestnanci
 * Názov:       Zam.Test.FieldUpdate
 * Typ:         TEST - Field Update Diagnostic
 * Verzia:      1.0.0
 * Autor:       ASISTANTO
 * Dátum:       2026-03-20
 *
 * Účel:
 *   Testovací script pre diagnostiku Field Update eventu.
 *   Zistí či sú moduly dostupné v Field Update contexte.
 *
 * Použitie:
 *   1. Nastav event: Aktualizácia poľa / Po uložení záznamu
 *   2. Trigger on fields: obdobie, obdobie total
 *   3. Zmeň pole "obdobie" (priama úprava)
 *   4. Skontroluj Debug_Log
 *
 * Changelog:
 *   v1.0.0 (2026-03-20) - Initial test script
 */

'use strict';

// ==============================================
// TEST 1: Basic entry() and set()
// ==============================================

var currentEntry = entry();

var msg = "═══════════════════════════════════════\n";
msg += "🧪 TEST FIELD UPDATE EVENT\n";
msg += "═══════════════════════════════════════\n";
msg += "Čas: " + new Date().toString() + "\n\n";

// ==============================================
// TEST 2: Check module availability
// ==============================================

var hasUtils = typeof MementoUtils !== 'undefined';
var hasZam = typeof Zamestnanci !== 'undefined';
var hasConfig = typeof MementoConfig !== 'undefined';
var hasCore = typeof MementoCore !== 'undefined';

msg += "📦 DOSTUPNOSŤ MODULOV:\n";
msg += "  - MementoUtils: " + (hasUtils ? "✅ ÁNO" : "❌ NIE") + "\n";
msg += "  - MementoConfig: " + (hasConfig ? "✅ ÁNO" : "❌ NIE") + "\n";
msg += "  - MementoCore: " + (hasCore ? "✅ ÁNO" : "❌ NIE") + "\n";
msg += "  - Zamestnanci: " + (hasZam ? "✅ ÁNO" : "❌ NIE") + "\n";
msg += "\n";

// ==============================================
// TEST 3: Check field access
// ==============================================

try {
    var obdobie = currentEntry.field("obdobie");
    var obdobieTotal = currentEntry.field("obdobie total");

    msg += "📊 PRÍSTUP K POLIAM:\n";
    msg += "  - obdobie: " + (obdobie || "(prázdne)") + "\n";
    msg += "  - obdobie total: " + (obdobieTotal || "(prázdne)") + "\n";
    msg += "  - Status: ✅ Polia sú dostupné\n";
    msg += "\n";
} catch (error) {
    msg += "📊 PRÍSTUP K POLIAM:\n";
    msg += "  - Status: ❌ CHYBA - " + error.toString() + "\n";
    msg += "\n";
}

// ==============================================
// TEST 4: Check if utils functions work
// ==============================================

if (hasUtils) {
    try {
        msg += "🔧 TEST MementoUtils FUNKCIÍ:\n";
        msg += "  - utils.config: " + (typeof MementoUtils.config !== 'undefined' ? "✅ OK" : "❌ undefined") + "\n";
        msg += "  - utils.addDebug: " + (typeof MementoUtils.addDebug === 'function' ? "✅ OK" : "❌ nie je funkcia") + "\n";
        msg += "\n";
    } catch (error) {
        msg += "🔧 TEST MementoUtils FUNKCIÍ:\n";
        msg += "  - Status: ❌ CHYBA - " + error.toString() + "\n";
        msg += "\n";
    }
} else {
    msg += "🔧 TEST MementoUtils FUNKCIÍ:\n";
    msg += "  - Status: ⏭️ Preskočené (modul nedostupný)\n";
    msg += "\n";
}

// ==============================================
// SUMMARY
// ==============================================

msg += "═══════════════════════════════════════\n";

if (hasUtils && hasZam) {
    msg += "✅ VÝSLEDOK: Všetky moduly SÚ dostupné!\n";
    msg += "   → Problém je niekde inde v scripte\n";
} else {
    msg += "❌ VÝSLEDOK: Moduly NIE SÚ dostupné!\n";
    msg += "   → Field Update nemá prístup k global scripts\n";
    msg += "   → Použite After Save event namiesto Field Update\n";
}

msg += "═══════════════════════════════════════\n";

// ==============================================
// WRITE TO DEBUG_LOG
// ==============================================

currentEntry.set("Debug_Log", msg);
