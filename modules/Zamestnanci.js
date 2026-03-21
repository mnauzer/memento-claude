/**
 * Module:      Zamestnanci
 * Version:     1.5.0
 * Author:      ASISTANTO
 * Date:        2026-03-20
 *
 * Purpose:
 *   Reusable module for employee wage calculations based on attendance records.
 *   Calculates: Odpracované, Zarobené, Prémie fields from Dochádzka linkToEntry attributes.
 *   Supports period filtering via "obdobie" and "obdobie total" choice fields.
 *
 * Dependencies:
 *   - MementoUtils v8.1+
 *   - MementoConfig v8.0+
 *   - MementoCore v8.0+
 *   - MementoTime v1.1+
 *
 * Architecture:
 *   - IIFE pattern (Immediately Invoked Function Expression)
 *   - Public API: calculateWages(employeeEntry, config, utils)
 *   - Used by ultra-thin wrapper scripts in libraries/zamestnanci/
 *
 * Usage:
 *   var result = Zamestnanci.calculateWages(entry(), utils.config, utils);
 *   if (!result.success) {
 *       dialog("Kritická chyba", result.error, "OK");
 *       cancel();
 *   }
 *
 * Changelog:
 *   v1.5.0 (2026-03-20) - Add hourly rate lookup from historical data
 *     - New: getCurrentHourlyRate() - finds current rate from "Sadzby zamestnancov"
 *     - New: updateCurrentHourlyRate() - updates "Aktuálna hodinovka" field
 *     - Supports date range validation (Platné od/Platné do)
 *     - Takes latest valid rate if multiple found
 *   v1.4.0 (2026-03-20) - Add calculateWagesAction for button actions
 *     - New public API function with built-in dialogs
 *     - Confirmation dialog before calculation
 *     - Success dialog with results summary
 *     - Error dialogs with user-friendly messages
 *     - Follows reusable module architecture pattern
 *   v1.3.1 (2026-03-20) - Trim choice labels (Memento adds trailing spaces!)
 *     - "minulý mesiac " (with space) didn't match "minulý mesiac" in map
 *     - Trim choice before lookup: choice.toString().trim()
 *   v1.3.0 (2026-03-20) - Fix period filter AGAIN (choice returns LABEL!)
 *     - Choice field returns LABEL text ("posledných 14 dní"), not value!
 *     - Create choiceMap to convert Slovak labels to numeric values
 *     - Fallback to parseInt and default value (3 = tento mesiac)
 *   v1.2.0 (2026-03-20) - Fix period filter (choice field returns string!)
 *     - Convert choice value to number with parseInt()
 *     - Add debug log showing choice type (string vs number)
 *     - Fixes issue where all periods defaulted to "tento mesiac"
 *   v1.1.0 (2026-03-20) - Visual improvements in debug log
 *     - Add visual separators between KROK 1 and KROK 2
 *     - Better readability of debug output
 *   v1.0.0 (2026-03-20) - Complete implementation
 *     - Extract wage calculation logic from Zam.Calc.Universal.js
 *     - Implement reusable module pattern
 *     - Support "obdobie" and "obdobie total" period filters
 *     - Calculate from Dochádzka linkToEntry attributes
 */

'use strict';

var Zamestnanci = (function() {

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "Zamestnanci",
        version: "1.5.0",
        author: "ASISTANTO",
        date: "2026-03-20"
    };

    // ==============================================
    // PRIVATE HELPER FUNCTIONS
    // ==============================================

    /**
     * Convert "obdobie" choice to date range
     */
    function calculateDateRange(choice, referenceDate) {
        var now = referenceDate || new Date();
        var start, end;

        // Map choice labels to numbers (Memento returns label text, not values!)
        var choiceMap = {
            "tento deň": 1,
            "tento týždeň": 2,
            "tento mesiac": 3,
            "tento rok": 4,
            "Total": 5,
            "minulý týždeň": 6,
            "minulý mesiac": 7,
            "minulý rok": 8,
            "posledných 7 dní": 9,
            "posledných 14 dní": 10,
            "posledných 30 dní": 11,
            "posledných 90 dní": 12
        };

        // CRITICAL: Trim choice (Memento adds trailing spaces!)
        var choiceTrimmed = choice ? choice.toString().trim() : "";

        // Convert choice to number
        var choiceNum = choiceMap[choiceTrimmed] || parseInt(choiceTrimmed, 10) || 3; // default: tento mesiac

        switch (choiceNum) {
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
    function calculateWageFields(employeeEntry, periodChoice, isPeriodTotal, config, utils) {
        try {
            var periodName = isPeriodTotal ? "obdobie total" : "obdobie";
            utils.addDebug(employeeEntry, "🔄 Počítam pre: " + periodName + " (voľba " + periodChoice + ", typ: " + typeof periodChoice + ")");

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
    // PUBLIC API
    // ==============================================

    return {
        version: MODULE_INFO.version,

        /**
         * Calculate employee wages from attendance records
         *
         * @param {Entry} employeeEntry - Current employee entry
         * @param {Object} config - MementoConfig object
         * @param {Object} utils - MementoUtils object
         * @returns {Object} - { success: boolean, message: string }
         */
        calculateWages: function(employeeEntry, config, utils) {
            try {
                utils.addDebug(employeeEntry, "🚀 === Zamestnanci Module v" + MODULE_INFO.version + " ===");

                // Get employee name
                var employeeName = employeeEntry.field("Nick") || "N/A";
                utils.addDebug(employeeEntry, "👤 Zamestnanec: " + employeeName);

                var FIELDS = {
                    // Period selection
                    obdobie: "obdobie",
                    obdobieTotal: "obdobie total",

                    // Regular fields (obdobie)
                    odpracovane: "Odpracované",
                    zarobene: "Zarobené",
                    premie: "Prémie",

                    // Total fields (obdobie total)
                    odpracovaneTotal: "Odpracované total",
                    zarobeneTotal: "Zarobené total",
                    premieTotal: "Prémie total",

                    // Info
                    info: "info"
                };

                var resultObdobie = null;
                var resultTotal = null;

                // STEP 1: Calculate for "obdobie" (regular fields)
                utils.addDebug(employeeEntry, "");
                utils.addDebug(employeeEntry, "═══════════════════════════════════════");
                utils.addDebug(employeeEntry, "📊 KROK 1: VÝPOČET ZÁKLADNÝCH POLÍ");
                utils.addDebug(employeeEntry, "═══════════════════════════════════════");
                var obdobie = employeeEntry.field(FIELDS.obdobie);

                if (obdobie) {
                    resultObdobie = calculateWageFields(employeeEntry, obdobie, false, config, utils);

                    if (resultObdobie.success) {
                        employeeEntry.set(FIELDS.odpracovane, resultObdobie.odpracovane);
                        employeeEntry.set(FIELDS.zarobene, resultObdobie.zarobene);
                        employeeEntry.set(FIELDS.premie, resultObdobie.premie);

                        utils.addDebug(employeeEntry, "  ✅ Základné polia nastavené");
                    } else {
                        utils.addError(employeeEntry, "Chyba pri výpočte základných polí: " + resultObdobie.error, "calculateWages");
                    }
                } else {
                    utils.addDebug(employeeEntry, "  ⏭️ Pole 'obdobie' nie je nastavené, preskakujem");
                }

                // STEP 2: Calculate for "obdobie total" (total fields)
                utils.addDebug(employeeEntry, "");
                utils.addDebug(employeeEntry, "═══════════════════════════════════════");
                utils.addDebug(employeeEntry, "📊 KROK 2: VÝPOČET TOTAL POLÍ");
                utils.addDebug(employeeEntry, "═══════════════════════════════════════");
                var obdobieTotal = employeeEntry.field(FIELDS.obdobieTotal);

                if (obdobieTotal) {
                    resultTotal = calculateWageFields(employeeEntry, obdobieTotal, true, config, utils);

                    if (resultTotal.success) {
                        employeeEntry.set(FIELDS.odpracovaneTotal, resultTotal.odpracovane);
                        employeeEntry.set(FIELDS.zarobeneTotal, resultTotal.zarobene);
                        employeeEntry.set(FIELDS.premieTotal, resultTotal.premie);

                        utils.addDebug(employeeEntry, "  ✅ Total polia nastavené");
                    } else {
                        utils.addError(employeeEntry, "Chyba pri výpočte total polí: " + resultTotal.error, "calculateWages");
                    }
                } else {
                    utils.addDebug(employeeEntry, "  ⏭️ Pole 'obdobie total' nie je nastavené, preskakujem");
                }

                // STEP 3: Create info message
                utils.addDebug(employeeEntry, "📝 KROK 3: Vytvorenie info záznamu");

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
                infoMessage += "**✅ PREPOČET DOKONČENÝ** | Zamestnanci v" + MODULE_INFO.version;

                employeeEntry.set(FIELDS.info, infoMessage);
                utils.addDebug(employeeEntry, "  ✅ Info záznam vytvorený");

                utils.addDebug(employeeEntry, "✅ === PREPOČET DOKONČENÝ ÚSPEŠNE ===");

                return {
                    success: true,
                    message: "Prepočet dokončený úspešne"
                };

            } catch (error) {
                utils.addError(employeeEntry, "KRITICKÁ CHYBA: " + error.toString(), "Zamestnanci.calculateWages", error);

                return {
                    success: false,
                    error: error.toString(),
                    message: "Kritická chyba pri výpočte"
                };
            }
        },

        /**
         * Action function for button click - includes dialogs
         *
         * @param {Entry} employeeEntry - Current employee entry
         * @param {Object} config - MementoConfig object
         * @param {Object} utils - MementoUtils object
         * @returns {Object} - { success: boolean, cancelled: boolean }
         */
        calculateWagesAction: function(employeeEntry, config, utils) {
            try {
                // Get employee name
                var employeeName = employeeEntry.field("Nick") || "N/A";

                // Confirmation dialog
                var confirm = dialog(
                    "Prepočet miezd",
                    "🔄 Prepočítať mzdy pre: " + employeeName + "?\n\n" +
                    "Prepočítajú sa polia:\n" +
                    "• Odpracované / Odpracované total\n" +
                    "• Zarobené / Zarobené total\n" +
                    "• Prémie / Prémie total\n\n" +
                    "Pokračovať?",
                    "Áno",
                    "Zrušiť"
                );

                if (confirm !== 0) {
                    // User cancelled
                    return { success: false, cancelled: true };
                }

                // Clear Debug_Log for fresh calculation
                employeeEntry.set("Debug_Log", "");

                // Call main calculation
                var result = this.calculateWages(employeeEntry, config, utils);

                if (!result.success) {
                    // Error dialog
                    var errorMsg = "❌ CHYBA PRI PREPOČTE\n\n";
                    errorMsg += "Zamestnanec: " + employeeName + "\n\n";
                    errorMsg += "Chyba: " + (result.error || result.message) + "\n\n";
                    errorMsg += "Skontrolujte Debug_Log pre viac informácií.";

                    dialog("Chyba prepočtu", errorMsg, "OK");
                    return { success: false, error: result.error };
                }

                // Get calculated values for success dialog
                var odpracovane = employeeEntry.field("Odpracované") || 0;
                var zarobene = employeeEntry.field("Zarobené") || 0;
                var premie = employeeEntry.field("Prémie") || 0;

                var odpracovaneTotal = employeeEntry.field("Odpracované total") || 0;
                var zarobeneTotal = employeeEntry.field("Zarobené total") || 0;
                var premieTotal = employeeEntry.field("Prémie total") || 0;

                // Success dialog
                var successMsg = "✅ PREPOČET DOKONČENÝ\n\n";
                successMsg += "👤 Zamestnanec: " + employeeName + "\n\n";
                successMsg += "📊 ZÁKLADNÉ POLIA:\n";
                successMsg += "• Odpracované: " + odpracovane.toFixed(2) + " h\n";
                successMsg += "• Zarobené: " + zarobene.toFixed(2) + " €\n";
                successMsg += "• Prémie: " + premie.toFixed(2) + " €\n\n";
                successMsg += "📊 TOTAL POLIA:\n";
                successMsg += "• Odpracované total: " + odpracovaneTotal.toFixed(2) + " h\n";
                successMsg += "• Zarobené total: " + zarobeneTotal.toFixed(2) + " €\n";
                successMsg += "• Prémie total: " + premieTotal.toFixed(2) + " €\n\n";
                successMsg += "Skontrolujte Debug_Log a info pole pre detaily.";

                dialog("Prepočet dokončený", successMsg, "OK");

                return { success: true };

            } catch (error) {
                // Critical error dialog
                var criticalMsg = "❌ KRITICKÁ CHYBA\n\n";
                criticalMsg += "Module: Zamestnanci v" + MODULE_INFO.version + "\n\n";
                criticalMsg += "Chyba: " + error.toString() + "\n\n";

                if (error.stack) {
                    criticalMsg += "Stack trace:\n" + error.stack.substring(0, 200);
                }

                utils.addError(employeeEntry, "KRITICKÁ CHYBA v Action: " + error.toString(), "Zamestnanci.calculateWagesAction", error);

                dialog("Kritická chyba", criticalMsg, "OK");

                return { success: false, error: error.toString() };
            }
        },

        /**
         * Get current hourly rate from "Sadzby zamestnancov" library
         *
         * @param {Entry} employeeEntry - Current employee entry
         * @param {Object} utils - MementoUtils object (optional for logging)
         * @returns {Object} - { success: boolean, rate: number, validFrom: Date }
         */
        getCurrentHourlyRate: function(employeeEntry, utils) {
            try {
                var currentDate = new Date();
                var employeeId = employeeEntry.id;
                var employeeName = employeeEntry.field("Nick") || employeeEntry.field("Meno") || "N/A";

                if (utils) {
                    utils.addDebug(employeeEntry, "🔍 Hľadám aktuálnu sadzbu pre: " + employeeName);
                }

                // Get "Sadzby zamestnancov" library
                var ratesLibrary = libByName("Sadzby zamestnancov");

                if (!ratesLibrary) {
                    if (utils) {
                        utils.addError(employeeEntry, "Knižnica 'Sadzby zamestnancov' nenájdená!", "getCurrentHourlyRate");
                    }
                    return { success: false, error: "Knižnica nenájdená" };
                }

                // Get all rate entries for this employee
                var allRates = ratesLibrary.entries();
                var employeeRates = [];

                // Filter rates for this employee
                for (var i = 0; i < allRates.length; i++) {
                    var rateEntry = allRates[i];
                    var linkedEmployee = rateEntry.field("Zamestnanec");

                    // Check if this rate belongs to our employee
                    if (linkedEmployee && linkedEmployee.length > 0) {
                        // linkToEntry field returns array
                        var empLink = linkedEmployee[0];
                        if (empLink && empLink.id === employeeId) {
                            employeeRates.push(rateEntry);
                        }
                    }
                }

                if (employeeRates.length === 0) {
                    if (utils) {
                        utils.addDebug(employeeEntry, "  ⚠️ Žiadne sadzby nenájdené pre " + employeeName);
                    }
                    return { success: false, error: "Žiadne sadzby" };
                }

                if (utils) {
                    utils.addDebug(employeeEntry, "  📋 Nájdených " + employeeRates.length + " sadzieb");
                }

                // Find the rate valid for current date
                var currentRate = null;
                var currentValidFrom = null;

                for (var i = 0; i < employeeRates.length; i++) {
                    var rateEntry = employeeRates[i];
                    var validFrom = rateEntry.field("Platné od") || rateEntry.field("Dátum");
                    var validTo = rateEntry.field("Platné do");
                    var rate = rateEntry.field("Sadzba") || rateEntry.field("Hodinová sadzba");

                    if (!validFrom || !rate) continue;

                    // Check if rate is valid for current date
                    var isValid = false;

                    if (validTo) {
                        // Range: validFrom <= currentDate <= validTo
                        isValid = validFrom <= currentDate && currentDate <= validTo;
                    } else {
                        // No end date: validFrom <= currentDate
                        isValid = validFrom <= currentDate;
                    }

                    if (isValid) {
                        // If multiple valid rates, take the one with latest validFrom
                        if (!currentRate || validFrom > currentValidFrom) {
                            currentRate = rate;
                            currentValidFrom = validFrom;
                        }
                    }
                }

                if (!currentRate) {
                    if (utils) {
                        utils.addDebug(employeeEntry, "  ⚠️ Žiadna platná sadzba k " + currentDate.toLocaleDateString('sk-SK'));
                    }
                    return { success: false, error: "Žiadna platná sadzba" };
                }

                if (utils) {
                    utils.addDebug(employeeEntry, "  ✅ Aktuálna sadzba: " + currentRate + " €/h (platné od " +
                        (currentValidFrom ? currentValidFrom.toLocaleDateString('sk-SK') : "N/A") + ")");
                }

                return {
                    success: true,
                    rate: currentRate,
                    validFrom: currentValidFrom
                };

            } catch (error) {
                if (utils) {
                    utils.addError(employeeEntry, "Chyba pri získavaní sadzby: " + error.toString(), "getCurrentHourlyRate", error);
                }
                return { success: false, error: error.toString() };
            }
        },

        /**
         * Update "Aktuálna hodinovka" field with current rate
         *
         * @param {Entry} employeeEntry - Current employee entry
         * @param {Object} utils - MementoUtils object (optional)
         * @returns {Object} - { success: boolean }
         */
        updateCurrentHourlyRate: function(employeeEntry, utils) {
            try {
                var result = this.getCurrentHourlyRate(employeeEntry, utils);

                if (result.success) {
                    employeeEntry.set("Aktuálna hodinovka", result.rate);
                    return { success: true, rate: result.rate };
                } else {
                    // Don't set field if no valid rate found
                    return { success: false, error: result.error };
                }

            } catch (error) {
                if (utils) {
                    utils.addError(employeeEntry, "Chyba pri aktualizácii hodinovky: " + error.toString(), "updateCurrentHourlyRate", error);
                }
                return { success: false, error: error.toString() };
            }
        }
    };

})();
