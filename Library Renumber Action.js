// ==============================================
// MEMENTO DATABASE - PREČÍSLOVANIE KNIŽNICE
// Verzia: 1.1 | Dátum: September 2025 | Autor: ASISTANTO
// Knižnica: Ľubovoľná | Trigger: Manual Action
// ==============================================
// 📋 FUNKCIA:
//    - Prečísluje záznamy aktuálnej knižnice podľa dátumu
//    - Využíva MementoCore.renumberLibraryRecords()
//    - Logging do knižnice ASISTANTO Logs
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
    version: "1.4",

    // Logging knižnica
    logsLibrary: "ASISTANTO Logs",

    // Nastavenia prečíslovania
    settings: {
        targetLibrary: "Dochádzka",   // !!! NASTAV NÁZOV KNIŽNICE KTORÚ CHCEŠ PREČÍSLOVAŤ !!!
        dateField: "Dátum",           // Pole s dátumom (fallback: dátum vytvorenia)
        idField: "ID",                // Pole pre ID číslování
        startNumber: 1,               // Počiatočné číslo
        ascending: true,              // true = od najstaršieho, false = od najnovšieho
        showDetails: false            // true = zobraz detaily každého záznamu
    }
};

// ==============================================
// LOGGING DO ASISTANTO LOGS
// ==============================================

var logEntry = null; // Globálny log záznam

/**
 * Vytvorí log záznam v knižnici ASISTANTO Logs
 */
function createLogEntry() {
    try {
        var logsLib = libByName(CONFIG.logsLibrary);
        if (!logsLib) {
            dialog()
                .title("CHYBA")
                .text("⚠️ Knižnica '" + CONFIG.logsLibrary + "' nenájdená!\n\nScript nebude fungovať bez logging knižnice.")
                .positiveButton("OK", function() {})
                .show();
            return null;
        }

        // SPRÁVNE vytvorenie záznamu podľa Memento Database API
        logEntry = logsLib.create({
            "date": new Date(),
            "library": "Action Script",
            "user": "Action Script User",
            "Debug_Log": "SCRIPT STARTED\n",
            "Error_Log": ""
        });

        return logEntry;

    } catch (error) {
        dialog()
            .title("KRITICKÁ CHYBA")
            .text("❌ Chyba pri vytváraní log záznamu:\n\n" + error.toString())
            .positiveButton("OK", function() {})
            .show();
        return null;
    }
}

/**
 * Pridá debug správu do log záznamu
 */
function addDebug(message, iconName) {
    try {
        if (!logEntry) {
            // Ak nie je logEntry, skús ho vytvoriť
            if (!createLogEntry()) {
                return; // Ak sa nepodarí vytvoriť, skonči
            }
        }

        var icon = "";
        if (iconName && utils && utils.getIcon) {
            icon = utils.getIcon(iconName) + " ";
        }

        var timestamp = moment().format("DD.MM.YY HH:mm");
        var debugMessage = "[" + timestamp + "] " + icon + message;

        var existingDebug = logEntry.field("Debug_Log") || "";
        logEntry.set("Debug_Log", existingDebug + debugMessage + "\n");

    } catch (error) {
        // Ak zlyhá debug logging, aspoň zobraz chybu
        if (typeof console !== 'undefined' && console.log) {
            console.log("❌ Chyba pri debug logu: " + error.toString());
        }
    }
}

/**
 * Pridá error správu do log záznamu
 */
function addError(message, source, error) {
    try {
        if (!logEntry) {
            // Ak nie je logEntry, skús ho vytvoriť
            if (!createLogEntry()) {
                return; // Ak sa nepodarí vytvoriť, skonči
            }
        }

        var timestamp = moment().format("DD.MM.YY HH:mm:ss");
        var errorMessage = "[" + timestamp + "] ❌ ERROR: " + message;

        if (source) {
            errorMessage += " | Zdroj: " + source;
        }

        // Pridaj číslo riadku ak je dostupné
        if (error && error.lineNumber) {
            errorMessage += " | Riadok: " + error.lineNumber;
        }

        if (error && error.stack) {
            errorMessage += "\nStack trace:\n" + error.stack;
        } else if (error && error.toString) {
            errorMessage += "\nError: " + error.toString();
        }

        var existingError = logEntry.field("Error_Log") || "";
        logEntry.set("Error_Log", existingError + errorMessage + "\n");

    } catch (e) {
        // Fallback na console ak zlyhá aj error logging
        if (typeof console !== 'undefined' && console.log) {
            console.log("❌ Chyba pri error logu: " + e.toString());
        }
    }
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        // Vytvor log záznam
        var logCreated = createLogEntry();
        if (!logCreated) {
            dialog()
                .title("STOP")
                .text("❌ Nemôžem vytvoriť log záznam!")
                .positiveButton("OK", function() {})
                .show();
            return false;
        }

        addDebug("=== ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===", "start");

        // V Action scripte nie je dostupné lib() - musí sa zadať manuálne
        var targetLibraryName = lib().title;
        if (!targetLibraryName) {
            var errorMsg = "❌ CHYBA: Musíte nastaviť názov knižnice v CONFIG.settings.targetLibrary!";
            addError(errorMsg, "main");
            dialog()
                .title("CHYBA")
                .text(errorMsg)
                .positiveButton("OK", function() {})
                .show();
            return false;
        }

        var targetLib = lib();
        if (!targetLib) {
            var errorMsg = "❌ CHYBA: Knižnica '" + targetLibraryName + "' nenájdená!";
            addError(errorMsg, "main");
            dialog()
                .title("CHYBA")
                .text(errorMsg)
                .positiveButton("OK", function() {})
                .show();
            return false;
        }

        addDebug("📚 Knižnica: " + targetLib.title);
        addDebug("📊 Počet záznamov: " + targetLib.entries().length);

        // Zobraz konfirmačný dialóg
        var confirmMsg = "🔢 PREČÍSLOVANIE KNIŽNICE\n\n";
        confirmMsg += "📚 Knižnica: " + targetLib.title + "\n";
        confirmMsg += "📊 Záznamy: " + targetLib.entries().length + "\n";
        confirmMsg += "📅 Pole dátumu: " + CONFIG.settings.dateField + "\n";
        confirmMsg += "🆔 Pole ID: " + CONFIG.settings.idField + "\n";
        confirmMsg += "🔢 Od čísla: " + CONFIG.settings.startNumber + "\n";
        confirmMsg += "↕️ Smer: " + (CONFIG.settings.ascending ? "najstarší → najnovší" : "najnovší → najstarší") + "\n\n";
        confirmMsg += "⚠️ UPOZORNENIE: Táto operácia prepíše všetky ID!\n\n";
        confirmMsg += "Pokračovať?";

        // Zobraz konfirmačný dialóg s voľbou
        dialog()
            .title("POTVRDENIE")
            .text(confirmMsg)
            .positiveButton("POKRAČOVAŤ", function() {
                // Spusti prečíslovanie
                addDebug("🔢 Spúšťam prečíslovanie...");
                executeRenumbering(targetLib);
            })
            .negativeButton("ZRUŠIŤ", function() {
                addDebug("❌ Prečíslovanie zrušené používateľom");
                dialog()
                    .title("Zrušené")
                    .text("❌ Prečíslovanie zrušené")
                    .positiveButton("OK", function() {})
                    .show();
            })
            .show();

        return true; // Funkcia sa ukončí, pokračovanie v callback

    } catch (error) {
        var criticalMsg = "💀 KRITICKÁ CHYBA!\n\n" + error.toString();
        addError("Kritická chyba v main: " + error.toString(), "main", error);
        dialog()
            .title("KRITICKÁ CHYBA")
            .text(criticalMsg)
            .positiveButton("OK", function() {})
            .show();
        return false;
    }
}

// ==============================================
// VYKONANIE PREČÍSLOVANIA
// ==============================================

function executeRenumbering(targetLib) {
    try {
        // Vytvor custom verziu renumberLibraryRecords pre správny logging
        var result = renumberLibraryRecordsWithLogging(
            targetLib,                     // cieľová knižnica
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

            addDebug("✅ " + result.message);
            dialog()
                .title("ÚSPECH")
                .text(successMsg)
                .positiveButton("OK", function() {})
                .show();

        } else {
            var errorMsg = "❌ CHYBA PRI PREČÍSLOVANÍ!\n\n";
            errorMsg += result.message + "\n";

            if (result.errors > 0) {
                errorMsg += "💀 Chýb: " + result.errors + "\n";
                errorMsg += "✅ Úspešne: " + result.processed + "\n";
            }

            errorMsg += "\n📋 Skontrolujte log záznam v knižnici " + CONFIG.logsLibrary + " pre detaily.";

            addError("Prečíslovanie zlyhalo: " + result.message, "main");
            dialog()
                .title("CHYBA")
                .text(errorMsg)
                .positiveButton("OK", function() {})
                .show();
        }

    } catch (error) {
        var criticalMsg = "💀 KRITICKÁ CHYBA!\n\n" + error.toString();
        addError("Kritická chyba v executeRenumbering: " + error.toString(), "executeRenumbering", error);
        dialog()
            .title("KRITICKÁ CHYBA")
            .text(criticalMsg)
            .positiveButton("OK", function() {})
            .show();
    }
}

// ==============================================
// PREČÍSLOVANIE S LOGOVANÍM
// ==============================================

/**
 * Prečísluje záznamy knižnice s logovaním do ASISTANTO Logs
 */
function renumberLibraryRecordsWithLogging(targetLibrary, dateField, idField, startNumber, ascending) {
    var result = {
        success: false,
        processed: 0,
        errors: 0,
        message: "",
        details: []
    };

    try {
        addDebug("🔢 === ZAČÍNA PREČÍSLOVANIE ZÁZNAMOV ===", "start");

        // Parametrické hodnoty s fallbackmi
        var library = targetLibrary;
        var dateFld = dateField || "Dátum";
        var idFld = idField || "ID";
        var startNum = startNumber || 1;
        var sortAscending = ascending !== false; // Default true

        if (!library) {
            result.message = "Chýba knižnica pre prečíslovanie";
            addError(result.message, "renumberLibraryRecords");
            return result;
        }

        addDebug("📚 Knižnica: " + library.name);
        addDebug("📅 Pole dátumu: " + dateFld);
        addDebug("🆔 Pole ID: " + idFld);
        addDebug("🔢 Začiatočné číslo: " + startNum);
        addDebug("↕️ Smer: " + (sortAscending ? "od najstaršieho" : "od najnovšieho"));

        // Získaj všetky záznamy
        var allEntries = library.entries();
        if (!allEntries || allEntries.length === 0) {
            result.message = "Knižnica neobsahuje žiadne záznamy";
            addDebug("⚠️ " + result.message);
            result.success = true; // Nie je to chyba
            return result;
        }

        addDebug("📊 Celkový počet záznamov: " + allEntries.length);

        // Priprav záznamy pre zoradenie
        var recordsWithDates = [];

        for (var i = 0; i < allEntries.length; i++) {
            var entryRecord = allEntries[i];
            var dateValue = utils.safeGet(entryRecord, dateFld);

            if (dateValue) {
                // Má dátum - pridaj do hlavného zoznamu
                recordsWithDates.push({
                    entry: entryRecord,
                    date: new Date(dateValue),
                    originalId: utils.safeGet(entryRecord, idFld)
                });
            } else {
                // Nemá dátum - použi dátum vytvorenia záznamu
                var createdDate = entryRecord.created ? new Date(entryRecord.created) : new Date();
                recordsWithDates.push({
                    entry: entryRecord,
                    date: createdDate,
                    originalId: utils.safeGet(entryRecord, idFld),
                    usedCreatedDate: true
                });
            }
        }

        addDebug("📅 Záznamy pripravené na zoradenie: " + recordsWithDates.length);

        // Zoraď podľa dátumu
        recordsWithDates.sort(function(a, b) {
            if (sortAscending) {
                return a.date - b.date; // Od najstaršieho
            } else {
                return b.date - a.date; // Od najnovšieho
            }
        });

        addDebug("✅ Záznamy zoradené podľa dátumu");

        // Prečísluj záznamy
        var currentNumber = startNum;
        var processed = 0;
        var errors = 0;

        for (var j = 0; j < recordsWithDates.length; j++) {
            try {
                var record = recordsWithDates[j];
                var oldId = record.originalId;

                // Nastav nové ID
                utils.safeSet(record.entry, idFld, currentNumber);

                var dateInfo = record.usedCreatedDate ? " (dátum vytvorenia)" : "";
                addDebug("✅ #" + currentNumber + ": " + utils.formatDate(record.date) + dateInfo +
                       (oldId ? " (bolo: " + oldId + ")" : ""));

                result.details.push({
                    newId: currentNumber,
                    oldId: oldId,
                    date: record.date,
                    usedCreatedDate: record.usedCreatedDate || false
                });

                currentNumber++;
                processed++;

            } catch (entryError) {
                errors++;
                addError("Chyba pri prečíslovaní záznamu: " + entryError.toString(), "renumberLibraryRecords");
            }
        }

        // Finálny súhrn
        result.success = errors === 0;
        result.processed = processed;
        result.errors = errors;
        result.message = "Prečíslovaných " + processed + " záznamov" +
                       (errors > 0 ? " (" + errors + " chýb)" : "");

        addDebug("📊 === SÚHRN PREČÍSLOVANIA ===");
        addDebug("✅ Úspešne prečíslovaných: " + processed);
        addDebug("❌ Chýb: " + errors);
        addDebug("🆔 Rozsah ID: " + startNum + " - " + (currentNumber - 1));
        addDebug("🔢 === PREČÍSLOVANIE DOKONČENÉ ===");

        return result;

    } catch (error) {
        result.message = "Kritická chyba pri prečíslovaní: " + error.toString();
        addError(result.message, "renumberLibraryRecords", error);
        return result;
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

main();