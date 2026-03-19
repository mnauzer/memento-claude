// ==============================================
// DOCHÁDZKA - Minimálny prepočet
// ==============================================
// Typ: Trigger
// Event: Before Save
// Verzia: 1.0.0
// Dátum: 2026-03-19
// ==============================================
// 📋 FUNKCIA: Najkratší možný prepočet (6 riadkov)
// 🔧 JS KNIŽNICE: Dochadzka, MementoUtils
// ==============================================

var result = Dochadzka.calculateAttendance(entry(), {});
if (!result.success) {
    message("❌ " + result.error);
    cancel();
}
message("✅ Hotovo");
