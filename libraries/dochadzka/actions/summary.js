// ==============================================
// DOCHÁDZKA - Rýchly súhrn
// ==============================================
// Typ: Action
// Event: Manual (Button)
// Verzia: 1.0.0
// Dátum: 2026-03-19
// ==============================================
// 📋 FUNKCIA:
//    - Zobrazí rýchly súhrn záznamu
//    - Dátum, čas, hodiny, mzdy, pracovníci
// ==============================================
// 🔧 JS KNIŽNICE: (žiadne potrebné)
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

dialog("Súhrn dochádzky", msg, "OK");
