/**
 * Knižnica:    Zamestnanci
 * Názov:       Zam.Action.Recalculate
 * Typ:         Action (Button) - Ultra-Thin Wrapper
 * Verzia:      3.1.0
 * Autor:       ASISTANTO
 * Dátum:       2026-03-21
 *
 * Účel:
 *   Ultra-thin wrapper pre button action prepočtu miezd.
 *   Všetka logika je v modules/Zamestnanci.js module.
 *
 * Changelog:
 *   v3.1.0 (2026-03-21) - Zjednodušenie: bez confirmation dialogu, message() pre výsledok
 *     - dialog() nespoľahlivý v action kontexte → nahradený message()
 *     - Výsledky viditeľné v info poli záznamu a Debug_Log
 *   v3.0.0 (2026-03-21) - Fix: dialog() na top-level wrappera
 *   v2.0.0 (2026-03-20) - Refactor to ultra-thin wrapper
 */

if (typeof MementoUtils === 'undefined') {
    message("CHYBA: MementoUtils modul chyba!");
}
else if (typeof Zamestnanci === 'undefined') {
    message("CHYBA: Zamestnanci modul chyba!");
}
else {
    var currentEntry = entry();
    currentEntry.set("Debug_Log", "");

    var result = Zamestnanci.calculateWages(currentEntry, MementoUtils.config, MementoUtils);

    if (result.success) {
        message("Prepocet dokonceny. Pozri INFO tab.");
    } else {
        message("Chyba: " + (result.error || result.message || "Neznama chyba"));
    }
}
