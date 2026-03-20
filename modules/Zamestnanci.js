/**
 * Module:      Zamestnanci
 * Version:     1.1.0
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
        version: "1.1.0",
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
    function calculateWageFields(employeeEntry, periodChoice, isPeriodTotal, config, utils) {
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
        }
    };

})();
