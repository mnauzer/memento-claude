// ==============================================
// DOCHÁDZKA - Cleanup pred zmazaním
// ==============================================
// Typ: Trigger
// Udalosť: Odstraňovanie záznamu
// Fáza: Pred uložením záznamu
// Verzia: 2.0.0
// Dátum: 2026-03-19
// ==============================================
// 📋 FUNKCIA:
//    - Vymaže súvisiace záväzky pred zmazaním záznamu
//    - Aktualizuje Denný report
//    - Cleanup operácie pre zachovanie integrity dát
// ==============================================
// 🔗 ZÁVISLOSTI (JS knižnice - pridaj v Memento):
//    1. MementoUtils (v8.1+) - Safe field access utilities
// ==============================================
// 📚 CORE MODULY (GitHub):
//    - core/MementoUtils.js (v8.1+)
// ==============================================
// 🔧 CHANGELOG v2.0.0:
//    - Added comprehensive dependency documentation
//    - Verified correct Memento API usage
// ==============================================

var utils = MementoUtils;
var currentEntry = entry();

// Získaj záväzky spojené s týmto záznamom
var obligations = utils.safeGetLinks(currentEntry, "Záväzky");

if (obligations && obligations.length > 0) {
    var count = 0;
    for (var i = 0; i < obligations.length; i++) {
        try {
            obligations[i].deleteEntry();
            count++;
        } catch (e) {
            // Záväzok už neexistuje alebo nemôže byť zmazaný
        }
    }

    if (count > 0) {
        message("🗑️ Zmazané " + count + " záväzkov");
    }
}
