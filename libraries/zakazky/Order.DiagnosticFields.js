/**
 * ZÁKAZKY - Diagnostický script pre zistenie polí
 *
 * Typ scriptu: Manual Action
 * Knižnica: Zákazky (ID: CfRHN7QTG)
 *
 * Účel: Zistiť presné názvy všetkých polí v knižnici Zákazky
 *
 * Verzia: 1.0.0
 * Dátum: 2025-10-11
 * Autor: ASISTANTO
 */

var currentEntry = entry();
var lib = lib();

// Vyčisti logy
currentEntry.set("Debug_Log", "");
currentEntry.set("Error_Log", "");

var output = [];
output.push("=".repeat(60));
output.push("ZÁKAZKY - DIAGNOSTIKA POLÍ");
output.push("=".repeat(60));
output.push("");

// Získaj všetky polia
var fields = lib.fields();
output.push("Počet polí: " + fields.length);
output.push("");

// Pre každé pole vypíš info
for (var i = 0; i < fields.length; i++) {
    var field = fields[i];

    try {
        var fieldName = field.name();
        var fieldType = field.type();
        var fieldId = field.id();

        output.push("─".repeat(60));
        output.push("POLE #" + (i + 1) + ":");
        output.push("  ID: " + fieldId);
        output.push("  Názov: " + fieldName);
        output.push("  Typ: " + fieldType);

        // Skús zistiť či má hodnotu
        try {
            var value = currentEntry.field(fieldName);
            if (value !== null && value !== undefined && value !== "") {
                if (fieldType === "entries") {
                    output.push("  Hodnota: [" + (value.length || 0) + " entries]");
                } else if (typeof value === "object") {
                    output.push("  Hodnota: [object]");
                } else {
                    output.push("  Hodnota: " + value);
                }
            }
        } catch (e) {
            // Ignoruj chyby pri čítaní hodnoty
        }

    } catch (e) {
        output.push("  ⚠️ Chyba pri čítaní poľa: " + e.toString());
    }
}

output.push("");
output.push("=".repeat(60));
output.push("KONIEC DIAGNOSTIKY");
output.push("=".repeat(60));

// Zapíš do Debug_Log
currentEntry.set("Debug_Log", output.join("\n"));

message("✅ Diagnostika dokončená\nSkontroluj Debug_Log pre výsledky");
