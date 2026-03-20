// ==============================================
// DOCHÁDZKA - Automatický prepočet
// ==============================================
// Typ: Trigger
// Udalosť: Aktualizácia záznamu
// Fáza: Pred uložením záznamu
// Verzia: 2.0.0
// Dátum: 2026-03-19
// ==============================================
// 📋 FUNKCIA:
//    - Automatický prepočet odpracovaných hodín pri uložení
//    - Výpočet mzdových nákladov
//    - Vytvorenie/aktualizácia záväzkov
//    - Integrácia s Denný report
// ==============================================
// 🔗 ZÁVISLOSTI (JS knižnice - pridaj v Memento v TOMTO PORADÍ):
//    1. MementoConfig (v8.0+) - Konfigurácia
//    2. MementoCore (v8.0+) - Core utilities
//    3. MementoUtils (v8.1+) - Utility aggregator
//    4. MementoBusiness (v8.0+) - Business logic
//    5. Dochadzka (v1.0+) - Library-specific module
// ==============================================
// 📚 LIBRARY MODULY (potrebné z GitHub):
//    - modules/Dochadzka.js (v1.0+)
// ==============================================
// 📚 CORE MODULY (potrebné z GitHub):
//    - core/MementoConfig.js (v8.0+)
//    - core/MementoCore.js (v8.0+)
//    - core/MementoUtils.js (v8.1+)
//    - core/MementoBusiness.js (v8.0+)
// ==============================================
// 🔧 CHANGELOG v2.0.0:
//    - Added comprehensive dependency documentation
//    - Verified correct Memento API usage
// ==============================================

// Call Dochadzka module calculation function
var result = Dochadzka.calculateAttendance(entry(), {});

// Handle errors
if (!result.success) {
    message("❌ Chyba: " + result.error);
    cancel();
}

// Success confirmation
message("✅ Hotovo");
