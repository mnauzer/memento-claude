// Dochádzka - Prepočítať (Action Button)
// Pridaj JS knižnice: Dochadzka, MementoUtils

var result = Dochadzka.calculateAttendance(entry(), {});

if (!result.success) {
    dialog("Chyba prepočtu", result.error || "Neznáma chyba", "OK");
    cancel();
}

var msg = "✅ Prepočet dokončený\n\n";
msg += "Hodiny: " + (result.data.totalHours || 0).toFixed(1) + "h\n";
msg += "Mzdy: " + (result.data.totalWages || 0).toFixed(0) + " €\n";
msg += "Pracovníci: " + (result.data.employeeCount || 0);

dialog("Výsledok", msg, "OK");
