/**
 * Knižnica:    Dochádzka
 * Názov:       Doch.Action.RequestSign
 * Typ:         Action (Button) — Ultra-Thin Wrapper
 * Verzia:      1.0.0
 * Dátum:       2026-03-22
 *
 * Účel:
 *   Odošle záznam dochádzky na Telegram potvrdenie každému pripojenému zamestnancovi.
 *   Vytvorí záznam v knižnici "podpisy" a spustí N8N flow.
 *
 * Závislosti:
 *   - MementoUtils v8.1+
 *   - Dochadzka modul v1.3+
 *
 * Postup:
 *   1. Pre každého zamestnanca skontroluje Telegram ID
 *   2. Vytvorí podpisy záznam cez Memento Cloud API
 *   3. Odošle N8N webhook → N8N pošle Telegram správu s inline keyboard
 *   4. Nastaví "Stav podpisov" = "Čaká "
 */

if (typeof MementoUtils === 'undefined') {
    message("CHYBA: MementoUtils chýba!");
}
else if (typeof Dochadzka === 'undefined') {
    message("CHYBA: Dochadzka modul chýba!");
}
else {
    var currentEntry = entry();
    currentEntry.set("Debug_Log", "");

    var result = Dochadzka.requestSign(
        currentEntry,
        MementoUtils.config,
        MementoUtils
    );

    if (result.success) {
        var msg = "✅ Odoslané na potvrdenie: " + result.sent + " zamestnanec(i).";
        if (result.skipped > 0) {
            msg += "\n⚠️ Preskočení (chýba Telegram ID): " + result.skipped;
        }
        message(msg);
    } else {
        message("Chyba: " + (result.error || "Neznáma chyba"));
    }
}
