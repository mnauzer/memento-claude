// ==============================================
// DOCHÁDZKA - Minimálny prepočet
// ==============================================
// Typ: Trigger
// Udalosť: Aktualizácia záznamu
// Fáza: Pred uložením záznamu
// Verzia: 2.0.0
// Dátum: 2026-03-19
// ==============================================
// 📋 FUNKCIA: Najkratší možný prepočet (minimalistická verzia)
// ==============================================
// 🔗 ZÁVISLOSTI (JS knižnice - pridaj v Memento):
//    - Dochadzka (v1.0+)
// ==============================================
// 📚 LIBRARY MODULY (GitHub):
//    - modules/Dochadzka.js
// ==============================================

var result = Dochadzka.calculateAttendance(entry(), {});
if (!result.success) {
    message("❌ " + result.error);
    cancel();
}
message("✅ Hotovo");
