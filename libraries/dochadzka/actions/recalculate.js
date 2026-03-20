// ==============================================
// DOCHÁDZKA - Prepočítať
// ==============================================
// Typ: Action
// Event: Manual (Button)
// Verzia: 2.0.0
// Dátum: 2026-03-19
// ==============================================
// 📋 FUNKCIA:
//    - Manuálny prepočet dochádzky (action tlačidlo)
//    - Zobrazí detailný výsledok v dialógu
//    - Používa Dochadzka modul pre výpočty
// ==============================================
// 🔗 ZÁVISLOSTI (JS knižnice - pridaj v Memento):
//    1. Dochadzka (v1.0+) - Library-specific calculation module
// ==============================================
// 📚 LIBRARY MODULY (GitHub):
//    - modules/Dochadzka.js (v1.0+)
// ==============================================
// 🔧 CHANGELOG v2.0.0:
//    - FIX: Correct dialog() syntax (builder pattern)
//    - Added dependency documentation
//    - Verified Memento API usage
// ==============================================

// Call Dochadzka calculation
var result = Dochadzka.calculateAttendance(entry(), {});

// Handle errors
if (!result.success) {
    dialog()
        .title("Chyba prepočtu")
        .text(result.error || "Neznáma chyba")
        .positiveButton("OK", function() {
            return true;
        })
        .show();
    cancel();
}

// Handle day off case
if (result.isDayOff) {
    dialog()
        .title("Voľný deň")
        .text("Záznam je nastavený na: " + (result.reason || "Voľno") + "\n\nPrepočet preskočený.")
        .positiveButton("OK", function() {
            return true;
        })
        .show();
    cancel();
}

// Check if data exists
if (!result.data) {
    dialog()
        .title("Chyba")
        .text("Prepočet nevrátil žiadne dáta")
        .positiveButton("OK", function() {
            return true;
        })
        .show();
    cancel();
}

// Build success message
var msg = "✅ Prepočet dokončený\n\n";
msg += "📊 Výsledky:\n";
msg += "• Hodiny: " + (result.data.totalHours || 0).toFixed(1) + " h\n";
msg += "• Mzdy: " + (result.data.totalWages || 0).toFixed(0) + " €\n";
msg += "• Pracovníci: " + (result.data.employeeCount || 0);

if (result.data.obligationsCreated > 0 || result.data.obligationsUpdated > 0) {
    msg += "\n\n💰 Záväzky:\n";
    if (result.data.obligationsCreated > 0) {
        msg += "• Vytvorené: " + result.data.obligationsCreated + "\n";
    }
    if (result.data.obligationsUpdated > 0) {
        msg += "• Aktualizované: " + result.data.obligationsUpdated;
    }
}

// Show results with CORRECT dialog syntax
dialog()
    .title("Výsledok prepočtu")
    .text(msg)
    .positiveButton("OK", function() {
        return true;
    })
    .show();
