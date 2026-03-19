// ==============================================
// DIAGNOSTIC - Zoznam všetkých polí v ASISTANTO Defaults
// ==============================================
// Verzia: 1.0
// Účel: Získať všetky polia z knižnice ASISTANTO Defaults
//       pre aktualizáciu MementoConfig.js
// ==============================================

var currentEntry = entry();
var lib = library("ASISTANTO Defaults");
var fields = lib.fields();

var output = "📋 VŠETKY POLIA V KNIŽNICI 'ASISTANTO Defaults':\n";
output += "═══════════════════════════════════════════════\n";
output += "Celkový počet polí: " + fields.length + "\n";
output += "Library ID: " + lib.id() + "\n\n";

// Získaj posledný záznam pre zobrazenie hodnôt
var entries = lib.entries();
var lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;

output += "═══════════════════════════════════════════════\n";
output += "POLIA:\n";
output += "═══════════════════════════════════════════════\n\n";

for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    var fieldName = field.name();
    var fieldType = field.type();
    var fieldId = field.id();

    output += (i + 1) + ". " + fieldName + "\n";
    output += "   ID: " + fieldId + "\n";
    output += "   Type: " + fieldType + "\n";

    // Ak existuje posledný záznam, ukáž hodnotu
    if (lastEntry) {
        try {
            var fieldValue = lastEntry.field(fieldName);
            if (fieldValue !== null && fieldValue !== undefined && fieldValue !== "") {
                output += "   Hodnota: " + fieldValue + "\n";
            }
        } catch (e) {
            // Ignoruj chyby pri čítaní hodnôt
        }
    }

    output += "\n";
}

output += "═══════════════════════════════════════════════\n";
output += "MementoConfig.js FORMAT:\n";
output += "═══════════════════════════════════════════════\n\n";

// Vygeneruj formát pre MementoConfig.js
output += "defaults: {\n";
for (var j = 0; j < fields.length; j++) {
    var f = fields[j];
    var fname = f.name();
    var ftype = f.type();

    // Vytvor camelCase názov premennej
    var varName = fname
        .replace(/[áäâ]/g, "a")
        .replace(/[éě]/g, "e")
        .replace(/[íî]/g, "i")
        .replace(/[óô]/g, "o")
        .replace(/[úů]/g, "u")
        .replace(/[ýÿ]/g, "y")
        .replace(/č/g, "c")
        .replace(/ď/g, "d")
        .replace(/ľ/g, "l")
        .replace(/ň/g, "n")
        .replace(/ř/g, "r")
        .replace(/š/g, "s")
        .replace(/ť/g, "t")
        .replace(/ž/g, "z")
        .replace(/\s+(.)/g, function(match, group1) {
            return group1.toUpperCase();
        })
        .replace(/^(.)/, function(match, group1) {
            return group1.toLowerCase();
        })
        .replace(/[^a-zA-Z0-9]/g, "");

    output += "    " + varName + ': "' + fname + '", // ' + ftype + "\n";
}
output += "},\n";

output += "\n✅ DIAGNOSTIKA DOKONČENÁ";

currentEntry.set("Debug_Log", output);
message("✅ Zoznam polí vypísaný do Debug_Log");
