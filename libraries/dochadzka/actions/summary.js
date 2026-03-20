// ==============================================
// DOCHÁDZKA - Rýchly súhrn
// ==============================================
// Typ: Action
// Event: Manual (Button)
// Verzia: 2.0.0
// Dátum: 2026-03-19
// ==============================================
// 📋 FUNKCIA:
//    - Zobrazí rýchly súhrn záznamu
//    - Dátum, čas, hodiny, mzdy, pracovníci
//    - Nepoužíva žiadne moduly - len číta polia
// ==============================================
// 🔗 ZÁVISLOSTI (JS knižnice):
//    - ŽIADNE (čistý Memento API)
// ==============================================
// 🔧 CHANGELOG v2.0.0:
//    - FIX: Correct dialog() syntax (builder pattern)
//    - Added dependency documentation
// ==============================================

var e = entry();
var date = e.field("Dátum");
var arrival = e.field("Príchod");
var departure = e.field("Odchod");
var hours = e.field("Odpracované");
var wages = e.field("Mzdové náklady");
var count = e.field("Počet pracovníkov");

var msg = "📅 " + (date ? moment(date).format("DD.MM.YYYY") : "?") + "\n";
msg += "🕐 " + (arrival ? moment(arrival).format("HH:mm") : "?");
msg += " - " + (departure ? moment(departure).format("HH:mm") : "?") + "\n";
msg += "⏱️ " + (hours || 0) + " h\n";
msg += "💰 " + (wages || 0) + " €\n";
msg += "👥 " + (count || 0) + " pracovníkov";

// Show summary with CORRECT dialog syntax
dialog()
    .title("Súhrn dochádzky")
    .text(msg)
    .positiveButton("OK", function() {
        return true;
    })
    .show();
