// Dochádzka - Minimálny Trigger (6 riadkov!)
// Pridaj JS knižnice: Dochadzka, MementoUtils

var result = Dochadzka.calculateAttendance(entry(), {});
if (!result.success) {
    message("❌ " + result.error);
    cancel();
}
message("✅ Hotovo");
