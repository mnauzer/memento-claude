// ==============================================
// DOCHÁDZKA - Validácia
// ==============================================
// Typ: Action
// Event: Manual (Button)
// Verzia: 2.0.0
// Dátum: 2026-03-19
// ==============================================
// 📋 FUNKCIA:
//    - Validácia povinných polí bez prepočtu
//    - Rýchla kontrola pred uložením
//    - Používa Dochadzka modul pre validáciu
// ==============================================
// 🔗 ZÁVISLOSTI (JS knižnice - pridaj v Memento):
//    1. Dochadzka (v1.0+) - Library-specific validation module
// ==============================================
// 📚 LIBRARY MODULY (GitHub):
//    - modules/Dochadzka.js (v1.0+)
// ==============================================
// 🔧 CHANGELOG v2.0.0:
//    - FIX: Correct dialog() syntax (builder pattern)
//    - Added dependency documentation
//    - Verified Memento API usage
// ==============================================

// Call Dochadzka validation
var result = Dochadzka.validateEntry(entry(), {});

// Handle validation errors
if (!result.valid) {
    dialog()
        .title("Validácia zlyhala")
        .text("❌ Chyby:\n\n" + result.errors.join("\n"))
        .positiveButton("OK", function() {
            return true;
        })
        .show();
    cancel();
}

// Show success
dialog()
    .title("Validácia úspešná")
    .text("✅ Všetky povinné polia sú vyplnené správne")
    .positiveButton("OK", function() {
        return true;
    })
    .show();
