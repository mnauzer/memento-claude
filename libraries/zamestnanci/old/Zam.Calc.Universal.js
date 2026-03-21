/**
 * Knižnica:    Zamestnanci
 * Názov:       Zam.Calc.Universal
 * Typ:         Calculation (Trigger - After Save)
 * Verzia:      1.0.0
 * Autor:       ASISTANTO
 * Dátum:       2026-03-20
 *
 * Účel:
 *   Vypočíta mzdové polia zamestnanca na základe záznamov Dochádzky:
 *   - Odpracované / Odpracované total (suma atribútu "odpracované")
 *   - Zarobené / Zarobené total (suma atribútu "denná mzda")
 *   - Prémie / Prémie total (suma: odpracované × príplatok + prémia - pokuta)
 *
 * Závislosti:
 *   - MementoUtils v8.1+
 *   - MementoConfig v8.0+
 *   - Knižnica Dochádzka (s atribútmi v poli Zamestnanci)
 *
 * Changelog:
 *   v1.0.0 (2026-03-20) - Initial implementation
 *     - Calculate wage fields based on Dochádzka records
 *     - Support for "obdobie" and "obdobie total" filters
 *     - Period-based date range filtering
 *     - Attribute summing from linkToEntry field
 */

'use strict';

// ==============================================
// MODULE INITIALIZATION
// ==============================================

var SCRIPT_NAME = "Zam.Calc.Universal";
var SCRIPT_VERSION = "1.0.0";

// Check if utils is available
if (typeof MementoUtils === 'undefined') {
    message("❌ Chyba: MementoUtils nie je načítaný!");
    cancel();
}

var utils = MementoUtils;
var currentEntry = entry();

// ==============================================
// DEPENDENCY VALIDATION
// ==============================================

var requiredModules = [
    { name: 'MementoConfig', minVersion: '8.0.0' },
    { name: 'MementoCore', minVersion: '8.0.0' },
    { name: 'MementoTime', minVersion: '1.1.0' }
];

var missingModules = [];
for (var i = 0; i < requiredModules.length; i++) {
    var module = requiredModules[i];
    if (typeof window[module.name] === 'undefined') {
        missingModules.push(module.name);
    }
}

if (missingModules.length > 0) {
    message("❌ Chýbajú moduly: " + missingModules.join(", "));
    cancel();
}

// ==============================================
// CONFIGURATION
// ==============================================

var config = utils.config;

// Field IDs
var FIELDS = {
    // Period selection
    obdobie: "obdobie",              // ID 86 - choice (1-12)
    obdobieTotal: "obdobie total",   // ID 90 - choice (3-8)

    // Regular fields (obdobie)
    odpracovane: "Odpracované",      // ID 31 - double
    zarobene: "Zarobené",            // ID 33 - currency
    premie: "Prémie",                // ID 94 - currency

    // Total fields (obdobie total)
    odpracovaneTotal: "Odpracované total",  // ID 55 - double
    zarobeneTotal: "Zarobené total",        // ID 54 - currency
    premieTotal: "Prémie total",            // ID 102 - currency

    // Logging
    debugLog: "Debug_Log",
    errorLog: "Error_Log",
    info: "info"
};

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Convert "obdobie" choice to date range
 */
function calculateDateRange(choice, referenceDate) {
    var now = referenceDate || new Date();
    var start, end;

    switch (choice) {
        case 1: // tento deň
            start = moment(now).startOf('day');
            end = moment(now).endOf('day');
            break;

        case 2: // tento týždeň
            start = moment(now).startOf('week');
            end = moment(now).endOf('week');
            break;

        case 3: // tento mesiac
            start = moment(now).startOf('month');
            end = moment(now).endOf('month');
            break;

        case 4: // tento rok
            start = moment(now).startOf('year');
            end = moment(now).endOf('year');
            break;

        case 5: // Total (all time) - for obdobie total only
            start = moment('2000-01-01');
            end = moment(now).endOf('day');
            break;

        case 6: // minulý týždeň
            start = moment(now).subtract(1, 'week').startOf('week');
            end = moment(now).subtract(1, 'week').endOf('week');
            break;

        case 7: // minulý mesiac
            start = moment(now).subtract(1, 'month').startOf('month');
            end = moment(now).subtract(1, 'month').endOf('month');
            break;

        case 8: // minulý rok
            start = moment(now).subtract(1, 'year').startOf('year');
            end = moment(now).subtract(1, 'year').endOf('year');
            break;

        case 9: // posledných 7 dní
            start = moment(now).subtract(7, 'days').startOf('day');
            end = moment(now).endOf('day');
            break;

        case 10: // posledných 14 dní
            start = moment(now).subtract(14, 'days').startOf('day');
            end = moment(now).endOf('day');
            break;

        case 11: // posledných 30 dní
            start = moment(now).subtract(30, 'days').startOf('day');
            end = moment(now).endOf('day');
            break;

        case 12: // posledných 90 dní
            start = moment(now).subtract(90, 'days').startOf('day');
            end = moment(now).endOf('day');
            break;

        default:
            // Default: tento mesiac
            start = moment(now).startOf('month');
            end = moment(now).endOf('month');
    }

    return {
        startDate: start.toDate(),
        endDate: end.toDate(),
        choiceValue: choice
    };
}

/**
 * Calculate wage fields from Dochádzka records
 */
function calculateWageFields(employeeEntry, periodChoice, isPeriodTotal) {
    try {
        var periodName = isPeriodTotal ? "obdobie total" : "obdobie";
        utils.addDebug(employeeEntry, "🔄 Počítam pre: " + periodName + " (voľba " + periodChoice + ")");

        // Get date range for period
        var dateRange = calculateDateRange(periodChoice);
        utils.addDebug(employeeEntry, "  📅 Obdobie: " +
            moment(dateRange.startDate).format("DD.MM.YYYY") + " - " +
            moment(dateRange.endDate).format("DD.MM.YYYY"));

        // Get all Dochádzka records linking to this employee
        var dochadzkaLinks = employeeEntry.linksFrom("Dochádzka", "Zamestnanci");
        utils.addDebug(employeeEntry, "  📋 Celkom záznamov Dochádzky: " + dochadzkaLinks.length);

        // Filter by date range
        var filteredRecords = [];
        for (var i = 0; i < dochadzkaLinks.length; i++) {
            var dochadza = dochadzkaLinks[i];
            var datum = dochadza.field("Dátum");

            if (datum && datum >= dateRange.startDate && datum <= dateRange.endDate) {
                filteredRecords.push(dochadza);
            }
        }

        utils.addDebug(employeeEntry, "  ✅ Filtrovaných záznamov: " + filteredRecords.length);

        // Sum attributes
        var totalOdpracovane = 0;
        var totalZarobene = 0;
        var totalPremie = 0;
        var recordsProcessed = 0;

        for (var i = 0; i < filteredRecords.length; i++) {
            var dochadza = filteredRecords[i];
            var zamestnanci = dochadza.field("Zamestnanci");

            if (!zamestnanci || zamestnanci.length === 0) {
                continue;
            }

            // Find THIS employee in the Zamestnanci field
            for (var j = 0; j < zamestnanci.length; j++) {
                var empLink = zamestnanci[j];

                // Match by entry ID
                if (empLink && empLink.id === employeeEntry.id) {
                    recordsProcessed++;

                    // Odpracované
                    var odpracovane = empLink.attr("odpracované") || 0;
                    totalOdpracovane += odpracovane;

                    // Zarobené (denná mzda)
                    var dennaMzda = empLink.attr("denná mzda") || 0;
                    totalZarobene += dennaMzda;

                    // Prémie = (odpracované × príplatok) + prémia - pokuta
                    var priplatok = empLink.attr("+príplatok (€/h)") || 0;
                    var premia = empLink.attr("+prémia (€)") || 0;
                    var pokuta = empLink.attr("-pokuta (€)") || 0;

                    var premieZaznamu = (odpracovane * priplatok) + premia - pokuta;
                    totalPremie += premieZaznamu;

                    break; // Found employee, no need to check other items
                }
            }
        }

        utils.addDebug(employeeEntry, "  🧮 Spracovaných záznamov: " + recordsProcessed);
        utils.addDebug(employeeEntry, "  💼 Odpracované: " + totalOdpracovane.toFixed(2) + " h");
        utils.addDebug(employeeEntry, "  💰 Zarobené: " + totalZarobene.toFixed(2) + " €");
        utils.addDebug(employeeEntry, "  🎁 Prémie: " + totalPremie.toFixed(2) + " €");

        return {
            success: true,
            odpracovane: totalOdpracovane,
            zarobene: totalZarobene,
            premie: totalPremie,
            recordsCount: recordsProcessed
        };

    } catch (error) {
        utils.addError(employeeEntry, "Chyba pri výpočte: " + error.toString(), "calculateWageFields", error);
        return {
            success: false,
            error: error.toString(),
            odpracovane: 0,
            zarobene: 0,
            premie: 0,
            recordsCount: 0
        };
    }
}

// ==============================================
// MAIN CALCULATION
// ==============================================

try {
    utils.addDebug(currentEntry, "🚀 === " + SCRIPT_NAME + " v" + SCRIPT_VERSION + " ===");

    // Get employee name
    var employeeName = currentEntry.field("Nick") || "N/A";
    utils.addDebug(currentEntry, "👤 Zamestnanec: " + employeeName);

    // STEP 1: Calculate for "obdobie" (regular fields)
    utils.addDebug(currentEntry, "📊 KROK 1: Výpočet základných polí");
    var obdobie = currentEntry.field(FIELDS.obdobie);

    if (obdobie) {
        var resultObdobie = calculateWageFields(currentEntry, obdobie, false);

        if (resultObdobie.success) {
            currentEntry.set(FIELDS.odpracovane, resultObdobie.odpracovane);
            currentEntry.set(FIELDS.zarobene, resultObdobie.zarobene);
            currentEntry.set(FIELDS.premie, resultObdobie.premie);

            utils.addDebug(currentEntry, "  ✅ Základné polia nastavené");
        } else {
            utils.addError(currentEntry, "Chyba pri výpočte základných polí: " + resultObdobie.error, "mainCalc");
        }
    } else {
        utils.addDebug(currentEntry, "  ⏭️ Pole 'obdobie' nie je nastavené, preskakujem");
    }

    // STEP 2: Calculate for "obdobie total" (total fields)
    utils.addDebug(currentEntry, "📊 KROK 2: Výpočet total polí");
    var obdobieTotal = currentEntry.field(FIELDS.obdobieTotal);

    if (obdobieTotal) {
        var resultTotal = calculateWageFields(currentEntry, obdobieTotal, true);

        if (resultTotal.success) {
            currentEntry.set(FIELDS.odpracovaneTotal, resultTotal.odpracovane);
            currentEntry.set(FIELDS.zarobeneTotal, resultTotal.zarobene);
            currentEntry.set(FIELDS.premieTotal, resultTotal.premie);

            utils.addDebug(currentEntry, "  ✅ Total polia nastavené");
        } else {
            utils.addError(currentEntry, "Chyba pri výpočte total polí: " + resultTotal.error, "mainCalc");
        }
    } else {
        utils.addDebug(currentEntry, "  ⏭️ Pole 'obdobie total' nie je nastavené, preskakujem");
    }

    // STEP 3: Create info message
    utils.addDebug(currentEntry, "📝 KROK 3: Vytvorenie info záznamu");

    var infoMessage = "# 👤 ZAMESTNANEC - PREPOČET MIEZD\n\n";
    infoMessage += "**Nick:** " + employeeName + "\n\n";

    if (obdobie && resultObdobie && resultObdobie.success) {
        infoMessage += "## 📊 Obdobie (voľba " + obdobie + ")\n";
        infoMessage += "- **Odpracované:** " + resultObdobie.odpracovane.toFixed(2) + " h\n";
        infoMessage += "- **Zarobené:** " + resultObdobie.zarobene.toFixed(2) + " €\n";
        infoMessage += "- **Prémie:** " + resultObdobie.premie.toFixed(2) + " €\n";
        infoMessage += "- **Záznamov:** " + resultObdobie.recordsCount + "\n\n";
    }

    if (obdobieTotal && resultTotal && resultTotal.success) {
        infoMessage += "## 📊 Obdobie Total (voľba " + obdobieTotal + ")\n";
        infoMessage += "- **Odpracované total:** " + resultTotal.odpracovane.toFixed(2) + " h\n";
        infoMessage += "- **Zarobené total:** " + resultTotal.zarobene.toFixed(2) + " €\n";
        infoMessage += "- **Prémie total:** " + resultTotal.premie.toFixed(2) + " €\n";
        infoMessage += "- **Záznamov:** " + resultTotal.recordsCount + "\n\n";
    }

    infoMessage += "---\n";
    infoMessage += "**✅ PREPOČET DOKONČENÝ** | " + SCRIPT_NAME + " v" + SCRIPT_VERSION;

    currentEntry.set(FIELDS.info, infoMessage);
    utils.addDebug(currentEntry, "  ✅ Info záznam vytvorený");

    utils.addDebug(currentEntry, "✅ === PREPOČET DOKONČENÝ ÚSPEŠNE ===");

} catch (error) {
    utils.addError(currentEntry, "KRITICKÁ CHYBA: " + error.toString(), SCRIPT_NAME, error);

    var errorDetails = "❌ KRITICKÁ CHYBA\n\n";
    errorDetails += "Script: " + SCRIPT_NAME + " v" + SCRIPT_VERSION + "\n\n";
    errorDetails += "Chyba: " + error.toString() + "\n\n";
    if (error.stack) {
        errorDetails += "Stack trace:\n" + error.stack.substring(0, 200);
    }

    dialog("Kritická chyba", errorDetails, "OK");
    cancel();
}
