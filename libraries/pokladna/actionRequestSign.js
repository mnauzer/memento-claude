/**
 * Knižnica:    Pokladňa
 * Názov:       Pokl.Action.RequestSign
 * Typ:         Action (Button) — Ultra-Thin Wrapper
 * Verzia:      1.0.0
 * Dátum:       2026-03-22
 *
 * Účel:
 *   Odošle platobný záznam na Telegram potvrdenie zamestnancovi.
 *   Vytvorí záznam v knižnici "podpisy" a spustí N8N flow.
 *
 * Závislosti:
 *   - MementoUtils v8.1+
 *   - Pokladna modul v1.1+
 *
 * Podmienky:
 *   - Záznam musí mať vyplnené pole "Zamestnanec"
 *   - Zamestnanec musí mať "Telegram ID"
 */

if (typeof MementoUtils === 'undefined') {
    message("CHYBA: MementoUtils chýba!");
}
else if (typeof Pokladna === 'undefined') {
    message("CHYBA: Pokladna modul chýba!");
}
else {
    var currentEntry = entry();

    var result = Pokladna.requestSign(
        currentEntry,
        MementoUtils.config,
        MementoUtils
    );

    if (result.success) {
        message("✅ Odoslané na potvrdenie.");
    } else {
        message("Chyba: " + (result.error || "Neznáma chyba"));
    }
}
