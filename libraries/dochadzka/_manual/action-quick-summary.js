// Dochádzka - Rýchly súhrn (Action)
// Pridaj JS knižnice: (žiadne potrebné)

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

dialog("Súhrn", msg, "OK");
