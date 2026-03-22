/**
 * Knižnica:    Dochádzka
 * Názov:       Doch.Action.RequestSign
 * Typ:         Action (Button) — Ultra-Thin Wrapper
 * Verzia:      1.1.0
 * Dátum:       2026-03-22
 *
 * Účel:
 *   Odošle záznam dochádzky na Telegram potvrdenie každému pripojenému zamestnancovi.
 *   Vytvorí záznam v knižnici "podpisy" a spustí N8N flow.
 *
 * Závislosti:
 *   - MementoUtils v8.1+
 *   - Dochadzka modul v1.3.3+
 *
 * DÔLEŽITÉ: dialog() sa volá pred uložením záznamu, takže Debug_Log je prečítaný
 * predtým než ho triggerBeforeSave.js zmaže!
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
    currentEntry.set("Error_Log", "");

    var result = Dochadzka.requestSign(
        currentEntry,
        MementoUtils.config,
        MementoUtils
    );

    // Prečítaj debug PRED uložením záznamu (triggerBeforeSave by ho zmazal)
    var dbg = currentEntry.field("Debug_Log") || "";
    var errLog = currentEntry.field("Error_Log") || "";

    if (result.success) {
        var txt = "Odoslané: " + result.sent + " zamestnanec(i)";
        if (result.skipped > 0) txt += "\nPreskočení (chýba TG ID): " + result.skipped;
        if (result.error) txt += "\n\n⚠️ Čiastočná chyba: " + result.error;
        if (dbg) txt += "\n\n--- Debug ---\n" + dbg;
        dialog("✅ Odoslané na potvrdenie", txt, "OK");
    } else {
        var txt2 = "Chyba: " + (result.error || "Neznáma chyba");
        if (errLog) txt2 += "\n\n--- Error Log ---\n" + errLog;
        if (dbg) txt2 += "\n\n--- Debug ---\n" + dbg;
        dialog("❌ Chyba", txt2, "OK");
    }
}
