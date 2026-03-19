// ==============================================
// DOCHÁDZKA - Prepočítať
// ==============================================
// Typ: Action
// Event: Manual (Button)
// Verzia: 1.0.0
// Dátum: 2026-03-19
// ==============================================
// 📋 FUNKCIA:
//    - Manuálny prepočet dochádzky (tlačidlo)
//    - Zobrazí detailný výsledok v dialógu
// ==============================================
// 🔧 JS KNIŽNICE: Dochadzka, MementoUtils
// ==============================================

var result = Dochadzka.calculateAttendance(entry(), {});

if (!result.success) {
    dialog("Chyba prepočtu", result.error || "Neznáma chyba", "OK");
    cancel();
}

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

dialog("Výsledok prepočtu", msg, "OK");
