// ==============================================
// DOCHÁDZKA - NASTAVENIE DŇA V TÝŽDNI
// Verzia: 1.0.0 | Dátum: October 2025 | Autor: ASISTANTO
// Knižnica: Dochádzka | Typ: Utility Script
// ==============================================
// 📋 FUNKCIA:
//    - Jednoduchý utility script na nastavenie dňa v týždni
//    - Vypočíta deň z dátumu a uloží do poľa "Deň"
//    - Môže sa použiť samostatne alebo v kombinácii s inými scriptami
// ==============================================
// 🔧 POUŽITIE:
//    1. Spustite na zázname s vyplneným dátumom
//    2. Script automaticky nastaví pole "Deň"
// ==============================================

try {
    var utils = MementoUtils;
    var config = utils.config;
    var currentEntry = entry();

    // Získaj dátum
    var datum = currentEntry.field(config.fields.attendance.date);

    if (!datum) {
        message("❌ Dátum nie je vyplnený!\n\nVyplňte pole 'Dátum' a skúste znova.");
        cancel();
    }

    // Vypočítaj deň v týždni
    var dayIndex = moment(datum).day();
    var dayName = utils.getDayNameSK(dayIndex);

    // Ulož do poľa
    currentEntry.set(config.fields.attendance.dayOfWeek, dayName);

    // Zobraz info
    var dateFormatted = utils.formatDate(datum, "DD.MM.YYYY");
    message("✅ Deň v týždni nastavený\n\n" +
            "📅 " + dateFormatted + "\n" +
            "📆 " + dayName.toUpperCase());

} catch (error) {
    message("❌ CHYBA!\n\n" +
            "Line: " + error.lineNumber + "\n" +
            "Error: " + error.toString());
    cancel();
}
