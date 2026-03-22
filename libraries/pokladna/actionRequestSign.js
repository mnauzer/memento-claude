/**
 * Knižnica:    Pokladňa
 * Názov:       Pokl.Action.RequestSign
 * Typ:         Action (Button) — Ultra-Thin Wrapper
 * Verzia:      1.1.0
 * Dátum:       2026-03-22
 *
 * Účel:
 *   Odošle platobný záznam na Telegram potvrdenie zamestnancovi.
 *   Vytvorí záznam v knižnici "podpisy" a spustí N8N flow.
 *
 * Závislosti:
 *   - MementoUtils v8.1+
 *   - Pokladna modul v1.1.2+
 *
 * DÔLEŽITÉ: dialog() sa volá pred uložením záznamu, takže Debug_Log je prečítaný
 * predtým než ho triggerBeforeSave zmaže!
 */

if (typeof MementoUtils === 'undefined') {
    dialog("❌ Chyba závislosti", "Chýba MementoUtils! Skontroluj poradie načítania skriptov.", "OK");
}
else if (typeof Pokladna === 'undefined') {
    dialog("❌ Chyba závislosti", "Chýba Pokladna modul! Skontroluj či je script načítaný.", "OK");
}
else {
    var currentEntry = entry();
    currentEntry.set("Debug_Log", "");
    currentEntry.set("Error_Log", "");

    var result = Pokladna.requestSign(
        currentEntry,
        MementoUtils.config,
        MementoUtils
    );

    // Prečítaj debug PRED uložením záznamu (trigger by ho zmazal)
    var dbg = currentEntry.field("Debug_Log") || "";
    var errLog = currentEntry.field("Error_Log") || "";

    if (result.success) {
        var txt = "Platba odoslaná na potvrdenie.";
        if (dbg) txt += "\n\n--- Debug ---\n" + dbg;
        dialog("✅ Odoslané na potvrdenie", txt, "OK");
    } else {
        var txt2 = "Chyba: " + (result.error || "Neznáma chyba");
        if (errLog) txt2 += "\n\n--- Error Log ---\n" + errLog;
        if (dbg) txt2 += "\n\n--- Debug ---\n" + dbg;
        dialog("❌ Chyba", txt2, "OK");
    }
}
