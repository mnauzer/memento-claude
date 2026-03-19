// ==============================================
// DOCHÁDZKA - Automatický prepočet
// ==============================================
// Typ: Trigger
// Event: Before Save
// Verzia: 1.0.0
// Dátum: 2026-03-19
// ==============================================
// 📋 FUNKCIA:
//    - Automatický prepočet odpracovaných hodín pri uložení
//    - Výpočet mzdových nákladov
//    - Vytvorenie/aktualizácia záväzkov
//    - Integrácia s Denný report
// ==============================================
// 🔧 JS KNIŽNICE (pridaj v Memento):
//    - Dochadzka
//    - MementoUtils
// ==============================================

var result = Dochadzka.calculateAttendance(entry(), {});

if (!result.success) {
    message("❌ Chyba: " + result.error);
    cancel();
}

message("✅ Hotovo");
