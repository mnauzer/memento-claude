// Dochádzka - Before Save Trigger
// Pridaj JS knižnice: Dochadzka, MementoUtils

var result = Dochadzka.calculateAttendance(entry(), {});

if (!result.success) {
    message("❌ Chyba: " + result.error);
    cancel();
}

message("✅ Hotovo");
