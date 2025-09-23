// ==============================================
// MEMENTO DATABASE - PREČÍSLOVANIE KNIŽNICE
// Verzia: 1.0 | Dátum: September 2025 | Autor: ASISTANTO
// Knižnica: Ľubovoľná | Trigger: Manual Action
// ==============================================
// 📋 FUNKCIA:
//    - Prečísluje záznamy aktuálnej knižnice podľa dátumu
//    - Využíva MementoCore.renumberLibraryRecords()
//    - Flexibilné nastavenie polí a parametrov
// ==============================================

// ==============================================
// INICIALIZÁCIA MODULOV
// ==============================================

var utils = MementoUtils;
var config = utils.getConfig();

// ==============================================
// KONFIGURÁCIA SCRIPTU
// ==============================================

var CONFIG = {
    scriptName: "Library Renumber Action",
    version: "1.0",

    // Nastavenia prečíslovania
    settings: {
        dateField: "Dátum",           // Pole s dátumom (fallback: dátum vytvorenia)
        idField: "ID",                // Pole pre ID číslování
        startNumber: 1,               // Počiatočné číslo
        ascending: true,              // true = od najstaršieho, false = od najnovšieho
        showDetails: false            // true = zobraz detaily každého záznamu
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(null, "=== ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===", "start");
        utils.clearLogs(null);

        // Overenie knižnice
        if (!lib) {
            var errorMsg = "❌ CHYBA: Script musí byť spustený v knižnici!";
            utils.addError(null, errorMsg, "main");
            message(errorMsg);
            return false;
        }

        utils.addDebug(null, "📚 Knižnica: " + lib.name);
        utils.addDebug(null, "📊 Počet záznamov: " + lib.entries().length);

        // Zobraz konfirmačný dialóg
        var confirmMsg = "🔢 PREČÍSLOVANIE KNIŽNICE\n\n";
        confirmMsg += "📚 Knižnica: " + lib.name + "\n";
        confirmMsg += "📊 Záznamy: " + lib.entries().length + "\n";
        confirmMsg += "📅 Pole dátumu: " + CONFIG.settings.dateField + "\n";
        confirmMsg += "🆔 Pole ID: " + CONFIG.settings.idField + "\n";
        confirmMsg += "🔢 Od čísla: " + CONFIG.settings.startNumber + "\n";
        confirmMsg += "↕️ Smer: " + (CONFIG.settings.ascending ? "najstarší → najnovší" : "najnovší → najstarší") + "\n\n";
        confirmMsg += "⚠️ UPOZORNENIE: Táto operácia prepíše všetky ID!\n\n";
        confirmMsg += "Pokračovať?";

        if (!confirm(confirmMsg)) {
            utils.addDebug(null, "❌ Prečíslovanie zrušené používateľom");
            message("❌ Prečíslovanie zrušené");
            return false;
        }

        // Spusti prečíslovanie
        utils.addDebug(null, "\n🔢 Spúšťam prečíslovanie...");

        var result = utils.renumberLibraryRecords(
            lib,                           // aktuálna knižnica
            CONFIG.settings.dateField,     // pole dátumu
            CONFIG.settings.idField,       // pole ID
            CONFIG.settings.startNumber,   // počiatočné číslo
            CONFIG.settings.ascending      // smer zoradenia
        );

        // Spracuj výsledok
        if (result.success) {
            var successMsg = "✅ PREČÍSLOVANIE DOKONČENÉ!\n\n";
            successMsg += "📊 Spracovaných: " + result.processed + " záznamov\n";

            if (result.details && result.details.length > 0) {
                successMsg += "🆔 Rozsah ID: " + CONFIG.settings.startNumber + " - " +
                             (CONFIG.settings.startNumber + result.processed - 1) + "\n";

                if (CONFIG.settings.showDetails) {
                    successMsg += "\n📋 DETAILY:\n";
                    for (var i = 0; i < Math.min(result.details.length, 10); i++) {
                        var detail = result.details[i];
                        successMsg += "• #" + detail.newId + ": " + utils.formatDate(detail.date);
                        if (detail.oldId) {
                            successMsg += " (bolo: " + detail.oldId + ")";
                        }
                        if (detail.usedCreatedDate) {
                            successMsg += " [dátum vytvorenia]";
                        }
                        successMsg += "\n";
                    }

                    if (result.details.length > 10) {
                        successMsg += "... a ďalších " + (result.details.length - 10) + " záznamov\n";
                    }
                }
            }

            utils.addDebug(null, "\n✅ " + result.message);
            message(successMsg);

        } else {
            var errorMsg = "❌ CHYBA PRI PREČÍSLOVANÍ!\n\n";
            errorMsg += result.message + "\n";

            if (result.errors > 0) {
                errorMsg += "💀 Chýb: " + result.errors + "\n";
                errorMsg += "✅ Úspešne: " + result.processed + "\n";
            }

            errorMsg += "\n📋 Skontrolujte Debug Log pre detaily.";

            utils.addError(null, "Prečíslovanie zlyhalo: " + result.message, "main");
            message(errorMsg);
        }

        return result.success;

    } catch (error) {
        var criticalMsg = "💀 KRITICKÁ CHYBA!\n\n" + error.toString();
        utils.addError(null, "Kritická chyba v main: " + error.toString(), "main", error);
        message(criticalMsg);
        return false;
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

main();