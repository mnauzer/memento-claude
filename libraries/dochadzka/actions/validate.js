// ==============================================
// DOCHÁDZKA - Validácia
// ==============================================
// Typ: Action
// Event: Manual (Button)
// Verzia: 1.0.0
// Dátum: 2026-03-19
// ==============================================
// 📋 FUNKCIA:
//    - Validácia povinných polí bez prepočtu
//    - Rýchla kontrola pred uložením
// ==============================================
// 🔧 JS KNIŽNICE: Dochadzka
// ==============================================

var result = Dochadzka.validateEntry(entry(), {});

if (!result.valid) {
    dialog("Validácia zlyhala", 
           "❌ Chyby:\n\n" + result.errors.join("\n"), 
           "OK");
    cancel();
}

dialog("Validácia úspešná", 
       "✅ Všetky povinné polia sú vyplnené správne", 
       "OK");
