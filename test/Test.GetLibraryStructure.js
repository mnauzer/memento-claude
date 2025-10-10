/**
 * TEST SCRIPT - Získanie štruktúry knižnice
 *
 * Spustite tento script v Memento Database v ľubovoľnej knižnici
 * Zmenia názov knižnice v CONFIG a script vypíše všetky polia do debug logu
 */

var utils = MementoUtils;
var currentEntry = entry();

var CONFIG = {
    // ZMEŇ NÁZOV KNIŽNICE KTORÚ CHCEŠ ANALYZOVAŤ:
    targetLibraryName: "Zákazky Diely",

    // Alternatívne názvy ak nejaký nefunguje:
    alternativeNames: [
        "Zákazky Diely",
        "zákazky diely",
        "Zakazky Diely",
        "Order Parts",
        "Diely zákazky"
    ]
};

try {
    utils.clearLogs(currentEntry);
    utils.addDebug(currentEntry, "=== ANALÝZA ŠTRUKTÚRY KNIŽNICE ===");

    var lib = null;
    var usedName = "";

    // Skús nájsť knižnicu podľa rôznych názvov
    for (var i = 0; i < CONFIG.alternativeNames.length; i++) {
        try {
            lib = libByName(CONFIG.alternativeNames[i]);
            if (lib) {
                usedName = CONFIG.alternativeNames[i];
                utils.addDebug(currentEntry, "✅ Knižnica nájdená: " + usedName);
                break;
            }
        } catch (e) {
            // Pokračuj s ďalším názvom
        }
    }

    if (!lib) {
        utils.addError(currentEntry, "❌ Knižnica nenájdená! Skús zmeniť názov v CONFIG.");
        message("❌ Knižnica nenájdená!");
        throw new Error("Library not found");
    }

    // Získaj všetky záznamy
    var entries = lib.entries();
    utils.addDebug(currentEntry, "📊 Počet záznamov: " + entries.length);

    if (entries.length === 0) {
        utils.addDebug(currentEntry, "⚠️ Knižnica je prázdna - nemôžem zistiť štruktúru polí");
        utils.addDebug(currentEntry, "   Vytvor aspoň 1 testovací záznam v knižnici '" + usedName + "'");
        message("⚠️ Knižnica je prázdna! Vytvor testovací záznam.");
        throw new Error("Library is empty");
    }

    // Vezmi prvý záznam ako vzor
    var sampleEntry = entries[0];

    utils.addDebug(currentEntry, "\n=== POLIA KNIŽNICE ===");

    // Získaj všetky názvy polí
    var fieldNames = [];
    try {
        // Skús získať všetky polia cez reflection
        var allFields = sampleEntry.fields();
        for (var f = 0; f < allFields.length; f++) {
            fieldNames.push(allFields[f]);
        }
    } catch (e) {
        utils.addError(currentEntry, "Chyba pri získavaní polí: " + e.toString());
    }

    utils.addDebug(currentEntry, "📋 Počet polí: " + fieldNames.length);
    utils.addDebug(currentEntry, "");

    // Pre každé pole zisti typ a hodnotu
    for (var fn = 0; fn < fieldNames.length; fn++) {
        var fieldName = fieldNames[fn];
        var fieldValue = null;
        var fieldType = "unknown";

        try {
            fieldValue = sampleEntry.field(fieldName);

            // Zisti typ
            if (fieldValue === null || fieldValue === undefined) {
                fieldType = "null/empty";
            } else if (typeof fieldValue === "string") {
                fieldType = "string/text";
            } else if (typeof fieldValue === "number") {
                fieldType = "number";
            } else if (typeof fieldValue === "boolean") {
                fieldType = "boolean/checkbox";
            } else if (fieldValue instanceof Date) {
                fieldType = "date";
            } else if (Array.isArray(fieldValue)) {
                fieldType = "array/linkToEntry (length: " + fieldValue.length + ")";
            } else if (typeof fieldValue === "object") {
                fieldType = "object/entry";
            }

            // Skrátená hodnota pre výpis
            var displayValue = "";
            if (fieldValue === null || fieldValue === undefined) {
                displayValue = "(prázdne)";
            } else if (Array.isArray(fieldValue)) {
                displayValue = "[" + fieldValue.length + " items]";
            } else if (typeof fieldValue === "object") {
                displayValue = "{object}";
            } else {
                displayValue = String(fieldValue).substring(0, 50);
            }

            utils.addDebug(currentEntry, (fn + 1) + ". \"" + fieldName + "\"");
            utils.addDebug(currentEntry, "   Typ: " + fieldType);
            utils.addDebug(currentEntry, "   Hodnota: " + displayValue);

        } catch (e) {
            utils.addDebug(currentEntry, (fn + 1) + ". \"" + fieldName + "\" - CHYBA: " + e.toString());
        }
    }

    utils.addDebug(currentEntry, "\n=== KONIEC ANALÝZY ===");
    utils.addDebug(currentEntry, "💡 Skopíruj tento výstup a pošli ho pre doplnenie do MementoConfig");

    message("✅ Analýza dokončená! Pozri Debug Log.");

} catch (error) {
    var errorMsg = "❌ CHYBA: " + error.toString();
    if (error.lineNumber) errorMsg += ", Line: " + error.lineNumber;
    if (error.stack) errorMsg += "\nStack: " + error.stack;
    utils.addError(currentEntry, errorMsg);
    message(errorMsg);
}
