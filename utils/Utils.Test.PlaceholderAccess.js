// ==============================================
// TEST SCRIPT - Diagnostika prístupu k ASISTANTO Defaults
// ==============================================

var output = "📋 TEST PRÍSTUPU K ASISTANTO DEFAULTS\n";
output += "═════════════════════════════════════════\n\n";

try {
    // 1. Získaj knižnicu
    var defaultsLib = libByName("ASISTANTO Defaults");
    if (!defaultsLib) {
        output += "❌ Knižnica 'ASISTANTO Defaults' nenájdená\n";
        message(output);
    } else {
        output += "✅ Knižnica 'ASISTANTO Defaults' nájdená\n";
        output += "   ID: " + defaultsLib.id() + "\n";
        output += "   Názov: " + defaultsLib.name() + "\n\n";

        // 2. Získaj záznamy
        var entries = defaultsLib.entries();
        output += "📊 Počet záznamov: " + entries.length + "\n\n";

        if (entries.length === 0) {
            output += "⚠️ Knižnica neobsahuje žiadne záznamy!\n";
        } else {
            // 3. Testuj prístup k posledenému záznamu
            var lastEntry = entries[entries.length - 1];
            output += "🔍 Testovanie prístupu k posledenému záznamu:\n\n";

            // Test 1: field()
            output += "TEST 1: defaultsEntry.field('CP Placeholder')\n";
            try {
                var value1 = lastEntry.field("CP Placeholder");
                output += "  ✅ Úspech! Hodnota: '" + value1 + "'\n";
                output += "  Typ: " + typeof value1 + "\n";
            } catch (e) {
                output += "  ❌ Chyba: " + e.toString() + "\n";
            }
            output += "\n";

            // Test 2: get()
            output += "TEST 2: defaultsEntry.get('CP Placeholder')\n";
            try {
                var value2 = lastEntry.get("CP Placeholder");
                output += "  ✅ Úspech! Hodnota: '" + value2 + "'\n";
                output += "  Typ: " + typeof value2 + "\n";
            } catch (e) {
                output += "  ❌ Chyba: " + e.toString() + "\n";
            }
            output += "\n";

            // Test 3: Zoznam všetkých polí
            output += "TEST 3: Všetky polia v zázname:\n";
            var fields = defaultsLib.fields();
            for (var i = 0; i < fields.length; i++) {
                var fieldName = fields[i].name();
                if (fieldName.indexOf("Placeholder") >= 0) {
                    try {
                        var val = lastEntry.field(fieldName);
                        output += "  • " + fieldName + ": '" + val + "'\n";
                    } catch (e) {
                        output += "  • " + fieldName + ": (chyba)\n";
                    }
                }
            }
        }
    }

} catch (error) {
    output += "❌ KRITICKÁ CHYBA: " + error.toString() + "\n";
}

output += "\n═════════════════════════════════════════\n";
output += "✅ TEST DOKONČENÝ\n";

// Zobraz výsledok
var currentEntry = entry();
currentEntry.set("Debug_Log", output);
message("✅ Výsledok testu zapísaný do Debug_Log");
