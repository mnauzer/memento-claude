/**
 * Zam.Action.Recalculate v2.2.0 - DIAGNOSTIC
 * Testuje: entry(), set(), message(), dialog(), moduly
 */

var e = entry();

// TEST 1: Funguje entry()?
if (!e) {
    message("FAIL: entry() je null - script nema pristup k zaznamu");
} else {

    // TEST 2: Funguje entry.set() priamo?
    e.set("Debug_Log", "DIAGNOSTIC: script spusteny " + new Date().toISOString());

    // TEST 3: Funguje message()?
    message("TEST OK: entry=" + (e ? "OK" : "NULL") + " MementoUtils=" + (typeof MementoUtils) + " Zamestnanci=" + (typeof Zamestnanci));

    // TEST 4: Ak su moduly OK, spusti calculateWages BEZ confirmation dialogu
    if (typeof Zamestnanci !== 'undefined' && typeof MementoUtils !== 'undefined') {
        try {
            var result = Zamestnanci.calculateWages(e, MementoUtils.config, MementoUtils);
            message("calculateWages: " + (result.success ? "OK" : "FAIL: " + result.error));
        } catch (ex) {
            e.set("Error_Log", "EXCEPTION: " + ex.toString());
            message("EXCEPTION: " + ex.toString());
        }
    }
}
