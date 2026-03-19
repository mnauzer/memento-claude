// ==============================================
// DOCHÁDZKA PREPOČET - WRAPPER SCRIPT
// Verzia: 9.0.0 | Dátum: 2026-03-19 | Autor: ASISTANTO
// Knižnica: Dochádzka | Trigger: Before Save
// ==============================================
// 📋 ÚČEL:
//    - Wrapper script pre Dochadzka.js modul v1.0.0
//    - Tento script sa vymaže po úplnej integrácii modulu
//    - Dočasné riešenie pre import z modules/ adresára
// ==============================================
// 🔧 ZÁVISLOSTI:
//    - Dochadzka.js modul (musí byť načítaný PRED týmto scriptom!)
//    - MementoUtils v7.0+
//    - MementoConfig
// ==============================================
// 📖 LOAD ORDER:
//    1. MementoConfig.js
//    2. MementoCore.js
//    3. MementoUtils.js
//    4. MementoBusiness.js
//    5. Dochadzka.js          ← MODUL
//    6. Dochadzka.Calculate.js ← TENTO WRAPPER
// ==============================================

// Kontrola či je modul načítaný
if (typeof Dochadzka === 'undefined') {
    message("❌ CHÝBA DOCHADZKA MODUL!\n\n" +
            "Načítaj modul v Nastavenia → Skripty:\n" +
            "https://raw.githubusercontent.com/mnauzer/memento-claude/main/modules/Dochadzka.js\n\n" +
            "Modul musí byť PRED týmto scriptom!");
    cancel();
}

// Kontrola závislostí (MementoUtils)
if (typeof MementoUtils === 'undefined') {
    message("❌ CHÝBA MEMENTOUTILS!\n\nNačítaj MementoUtils v Nastavenia → Skripty");
    cancel();
}

var utils = MementoUtils;
var currentEntry = entry();

// Info o wrapper verzii
utils.addDebug(currentEntry, "🔄 Wrapper v9.0.0 → Modul " + Dochadzka.info.name + " v" + Dochadzka.version);

// ==============================================
// HLAVNÉ VOLANIE MODULU
// ==============================================

try {
    // Volanie modulu s konfiguráciou
    var result = Dochadzka.calculateAttendance(currentEntry, {
        settings: {
            roundToQuarterHour: true,
            roundDirection: "nearest",
            includeBreaks: true,
            breakThreshold: 6,
            breakDuration: 30
        },
        skipDailyReport: false,  // Denný report sa vytvára
        skipColoring: false      // Farebné označenie víkendov/sviatkov
    });

    // ==============================================
    // SPRACOVANIE VÝSLEDKU
    // ==============================================

    if (!result.success) {
        utils.addError(currentEntry, "Modul zlyhal: " + result.error, "Wrapper");
        message("❌ CHYBA V PREPOČTE\n\n" + result.error);
        cancel();
    }

    // Ak je voľný deň, ukonči (modul už nastavil ikony a farbu)
    if (result.isDayOff) {
        message("✅ Záznam je nastavený na: " + result.reason + "\n\nPrepočet preskočený.");
        exit();
    }

    // ==============================================
    // ÚSPEŠNÝ PREPOČET - ZOBRAZ SÚHRN
    // ==============================================

    var date = result.data.date;
    var dateFormatted = utils.formatDate(date, "DD.MM.YYYY");
    var employeeCount = result.data.employeeCount;
    var totalHours = result.data.totalHours;
    var totalWages = result.data.totalWages;

    var summaryMsg = "✅ PREPOČET DOKONČENÝ\n\n";
    summaryMsg += "📅 " + dateFormatted + "\n";
    summaryMsg += "━━━━━━━━━━━━━━━━━━━━━\n";
    summaryMsg += "👥 Počet zamestnancov: " + employeeCount + "\n";
    summaryMsg += "⏱️ Odpracované: " + totalHours.toFixed(2) + " h\n";
    summaryMsg += "💰 Mzdové náklady: " + utils.formatMoney(totalWages) + "\n";
    summaryMsg += "━━━━━━━━━━━━━━━━━━━━━\n";

    // Zobraz info o záväzkoch ak boli vytvorené/aktualizované
    if (result.data.obligationsCreated > 0 || result.data.obligationsUpdated > 0) {
        summaryMsg += "\n📋 ZÁVÄZKY:\n";
        if (result.data.obligationsCreated > 0) {
            summaryMsg += "   ✅ Vytvorené: " + result.data.obligationsCreated + "\n";
        }
        if (result.data.obligationsUpdated > 0) {
            summaryMsg += "   🔄 Aktualizované: " + result.data.obligationsUpdated + "\n";
        }
    }

    summaryMsg += "\nℹ️ Detaily v poli 'info'";

    message(summaryMsg);

} catch (error) {
    utils.addError(currentEntry, "Kritická chyba vo wrapper scripte", "Wrapper", error);
    message("❌ KRITICKÁ CHYBA!\n\n" + error.toString() + "\n\nLine: " + (error.lineNumber || "N/A"));
    cancel();
}
