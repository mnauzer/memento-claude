/**
 * Knižnica:    Zamestnanci
 * Názov:       Zam.Action.SendReport
 * Typ:         Action (Button) - Ultra-Thin Wrapper
 * Verzia:      1.0.0
 * Autor:       ASISTANTO
 * Dátum:       2026-03-21
 *
 * Účel:
 *   Odošle výkaz mzdy zamestnanca na jeho Telegram ID.
 *   Správa obsahuje monospace tabuľku: Odpracované, Vyplatené, Nedoplatok/Preplatok.
 *   Rozsah dátumov podľa poľa "obdobie".
 *
 * Závislosti:
 *   - MementoUtils v8.1+
 *   - MementoTelegram v8.2+ (importovaný PRIAMO — nie cez utils, circular dependency!)
 *   - Zamestnanci module v1.16+
 *
 * Poznámka:
 *   Zamestnanec musí mať vyplnené pole "Telegram ID" (Telegram chat ID).
 */

// ⚠️ MementoTelegram sa importuje PRIAMO (nie cez MementoUtils!)
if (typeof MementoUtils === 'undefined') {
    message("CHYBA: MementoUtils chýba!");
}
else if (typeof MementoTelegram === 'undefined') {
    message("CHYBA: MementoTelegram chýba!");
}
else if (typeof Zamestnanci === 'undefined') {
    message("CHYBA: Zamestnanci modul chýba!");
}
else {
    var currentEntry = entry();
    currentEntry.set("Debug_Log", "");

    var result = Zamestnanci.sendReportToTelegram(
        currentEntry,
        MementoUtils.config,
        MementoUtils,
        MementoTelegram   // priamy import — nesmie byť cez utils
    );

    if (result.success) {
        message("Report odoslaný na Telegram.");
    } else {
        message("Chyba: " + (result.error || "Neznáma chyba"));
    }
}
