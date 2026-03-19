// ==============================================
// DOCHÁDZKA PREPOČET - V9.0 (POUŽÍVA REUSABLE MODUL)
// Verzia: 9.0.0 | Dátum: 2026-03-19 | Autor: ASISTANTO
// Knižnica: Dochádzka | Trigger: Before Save
// ==============================================
// 📋 FUNKCIA:
//    - Wrapper script pre Dochadzka.calculateAttendance()
//    - Automatický prepočet odpracovaných hodín
//    - Výpočet mzdových nákladov
//    - Integrácia s Denný report
//    - Farebné označenie dátumu
// ==============================================
// 🔧 ZÁVISLOSTI:
//    - Dochadzka modul (modules/Dochadzka.js)
//    - MementoUtils v8.1+
//    - MementoConfig v8.0+
//    - MementoCore v8.0+
// ==============================================
// 📖 POUŽITIE:
//    Tento script sa spustí automaticky pri uložení záznamu
//    v knižnici Dochádzka (Before Save trigger).
// ==============================================

// ==============================================
// INICIALIZÁCIA
// ==============================================

// Validácia Dochadzka modulu
if (typeof Dochadzka === 'undefined') {
    dialog(
        "❌ Chýba modul Dochadzka",
        "Modul Dochadzka nie je načítaný!\n\n" +
        "Importujte modul v Nastavenia → Skripty:\n" +
        "• Dochadzka.js\n\n" +
        "Tento modul musí byť načítaný PRED týmto scriptom.",
        "OK"
    );
    cancel();
}

// Validácia MementoUtils
if (typeof MementoUtils === 'undefined') {
    dialog(
        "❌ Chýba MementoUtils",
        "MementoUtils nie je načítaný!\n\n" +
        "Importujte v Nastavenia → Skripty:\n" +
        "• MementoUtils.js",
        "OK"
    );
    cancel();
}

// ==============================================
// KONFIGURÁCIA
// ==============================================

var CONFIG = {
    scriptName: "Dochádzka Prepočet v9",
    version: "9.0.0",
    library: "Dochádzka"
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        var currentEntry = entry();

        // Volaj Dochadzka modul
        var result = Dochadzka.calculateAttendance(currentEntry, {
            settings: {
                roundToQuarterHour: true,
                roundDirection: "nearest",
                includeBreaks: true,
                breakThreshold: 6,
                breakDuration: 30
            },
            skipDailyReport: false,
            skipColoring: false
        });

        // Spracuj výsledok
        if (!result.success) {
            if (result.isDayOff) {
                // Voľný deň - preskočený prepočet
                message("ℹ️ " + result.reason);
                return;
            } else {
                // Chyba pri výpočte
                var errorMsg = "Chyba pri prepočte:\n\n" + (result.error || "Neznáma chyba");

                // Zobraz detaily ak sú dostupné
                if (result.steps) {
                    errorMsg += "\n\nKroky:";
                    for (var step in result.steps) {
                        var status = result.steps[step].success ? "✅" : "❌";
                        errorMsg += "\n" + status + " " + result.steps[step].name;
                    }
                }

                dialog("❌ Chyba prepočtu", errorMsg, "OK");
                cancel();
            }
        }

        // Úspešný prepočet
        var summary = "✅ Prepočet dokončený\n\n";
        summary += "📊 Výsledky:\n";
        summary += "• Pracovná doba: " + (result.data.workHours || 0).toFixed(2) + " h\n";
        summary += "• Celkom odpracované: " + (result.data.totalHours || 0).toFixed(2) + " h\n";
        summary += "• Celkové mzdy: " + (result.data.totalWages || 0).toFixed(2) + " €\n";
        summary += "• Počet pracovníkov: " + (result.data.employeeCount || 0);

        if (result.data.obligationsCreated > 0 || result.data.obligationsUpdated > 0) {
            summary += "\n\n💰 Záväzky:";
            if (result.data.obligationsCreated > 0) {
                summary += "\n• Vytvorené: " + result.data.obligationsCreated;
            }
            if (result.data.obligationsUpdated > 0) {
                summary += "\n• Aktualizované: " + result.data.obligationsUpdated;
            }
        }

        // Zobraz krátku správu (message je len pre 2 riadky, použijeme jednoduchú verziu)
        message("✅ Prepočet: " + (result.data.totalHours || 0).toFixed(1) + "h, " +
                (result.data.totalWages || 0).toFixed(0) + " €");

        // Detailný súhrn je už v info poli vytvorený modulom

    } catch (error) {
        dialog(
            "❌ Kritická chyba",
            "Nastala kritická chyba v prepočte:\n\n" +
            error.toString() +
            "\n\nLine: " + (error.lineNumber || "neznáma"),
            "OK"
        );
        cancel();
    }
}

// ==============================================
// SPUSTENIE
// ==============================================

main();
