/**
 * Module:      Zamestnanci
 * Version:     1.8.0
 * Author:      ASISTANTO
 * Date:        2026-03-21
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
 *   v1.8.0 (2026-03-21) - Module-level FIELDS constant (single source of truth)
 *     - Add module-level FIELDS constant with all field names verified from fields.json
 *     - Remove local FIELDS object from calculateWages() - use module FIELDS
 *     - Remove config fallback from updateCurrentHourlyRate() - use FIELDS.hourlyRate directly
 *     - All hardcoded field strings replaced with FIELDS.xxx references
 *     - Wrong field name now surfaces as exception → catch → addError → Error_Log
 *   v1.7.0 (2026-03-21) - Use config for hourlyRate field name
 *     - updateCurrentHourlyRate() uses config.fields.employee.hourlyRate with fallback
 *     - MementoConfig fixed: "Hodinovka" → "Aktuálna hodinovka" (verified from fields.json ID:42)
 *   v1.6.0 (2026-03-21) - Fix field names from API verification
 *     - CRITICAL FIX: Use "Platnosť od" (not "Platné od") - verified via API
 *     - Remove fallback field names (use exact names only)
 *     - Note: "Platné do" field doesn't exist (library has only 3 fields)
 *     - Rates are valid indefinitely (no end date in data model)
 *   v1.5.0 (2026-03-20) - Add hourly rate lookup from historical data
 *     - New: getCurrentHourlyRate() - finds current rate from "sadzby zamestnancov"
 *     - New: updateCurrentHourlyRate() - updates "Aktuálna hodinovka" field
 *   v1.4.0 (2026-03-20) - Add calculateWagesAction for button actions
 *   v1.3.1 (2026-03-20) - Trim choice labels (Memento adds trailing spaces!)
 *   v1.3.0 (2026-03-20) - Fix period filter (choice returns LABEL!)
 *   v1.2.0 (2026-03-20) - Fix period filter (choice field returns string!)
 *   v1.1.0 (2026-03-20) - Visual improvements in debug log
 *   v1.0.0 (2026-03-20) - Complete implementation
 */

'use strict';

var Zamestnanci = (function() {

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "Zamestnanci",
        version: "1.8.0",
        author: "ASISTANTO",
        date: "2026-03-21",
        library: "zamestnanci",              // → libraries/zamestnanci/fields.json
        externalLibraries: ["sadzby-zamestnancov", "dochadzka"]  // → libraries/*/fields.json
    };

    // ==============================================
    // FIELD NAME CONSTANTS (single source of truth)
    // ==============================================
    // FIELDS  = primary library (zamestnanci) only
    // EXTERNAL = external libraries (sadzby-zamestnancov, dochadzka)
    // All names verified from libraries/*/fields.json

    var FIELDS = {
        nick: "Nick",                           // ID:22, text, role:name
        hourlyRate: "Aktuálna hodinovka",       // ID:42, double, €
        workedTime: "Odpracované",              // ID:31, double, h
        earned: "Zarobené",                     // ID:33, currency
        bonuses: "Prémie",                      // ID:94, currency
        workedTimeTotal: "Odpracované total",   // ID:55, double, h
        earnedTotal: "Zarobené total",          // ID:54, currency
        bonusesTotal: "Prémie total",           // ID:102, currency
        period: "obdobie",                      // ID:86, choice
        periodTotal: "obdobie total",           // ID:90, choice
        info: "info",                           // ID:93, text
        debugLog: "Debug_Log"                   // ID:80, text
    };

    var EXTERNAL = {
        // sadzby-zamestnancov library fields
        rateEmployee: "Zamestnanec",            // ID:2, entries (linkToEntry)
        rateValidFrom: "Platnosť od",           // ID:3, date, required
        rateValue: "Sadzba",                    // ID:4, currency, required
        // NOTE: "Platné do" does NOT exist - verified from fields.json (only 3 fields)

        // Dochádzka fields (used in linksFrom queries)
        dochDate: "Dátum",
        dochEmployees: "Zamestnanci"
    };

    // LinkToEntry attributes — NOT validated (not in fields.json)
    var ATTRS = {
        attrWorked: "odpracované",
        attrDailyWage: "denná mzda",
        attrBonus: "+príplatok (€/h)",
        attrPremium: "+prémia (€)",
        attrPenalty: "-pokuta (€)"
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
            var dochadzkaLinks = employeeEntry.linksFrom("Dochádzka", EXTERNAL.dochEmployees);
            utils.addDebug(employeeEntry, "  📋 Celkom záznamov Dochádzky: " + dochadzkaLinks.length);

            // Filter by date range
            var filteredRecords = [];
            for (var i = 0; i < dochadzkaLinks.length; i++) {
                var dochadza = dochadzkaLinks[i];
                var datum = dochadza.field(EXTERNAL.dochDate);

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
                var zamestnanci = dochadza.field(EXTERNAL.dochEmployees);

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
                        var odpracovane = empLink.attr(ATTRS.attrWorked) || 0;
                        totalOdpracovane += odpracovane;

                        // Zarobené (denná mzda)
                        var dennaMzda = empLink.attr(ATTRS.attrDailyWage) || 0;
                        totalZarobene += dennaMzda;

                        // Prémie = (odpracované × príplatok) + prémia - pokuta
                        var priplatok = empLink.attr(ATTRS.attrBonus) || 0;
                        var premia = empLink.attr(ATTRS.attrPremium) || 0;
                        var pokuta = empLink.attr(ATTRS.attrPenalty) || 0;

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

                var employeeName = employeeEntry.field(FIELDS.nick) || "N/A";
                utils.addDebug(employeeEntry, "👤 Zamestnanec: " + employeeName);

                var resultObdobie = null;
                var resultTotal = null;

                // STEP 1: Calculate for "obdobie" (regular fields)
                utils.addDebug(employeeEntry, "");
                utils.addDebug(employeeEntry, "═══════════════════════════════════════");
                utils.addDebug(employeeEntry, "📊 KROK 1: VÝPOČET ZÁKLADNÝCH POLÍ");
                utils.addDebug(employeeEntry, "═══════════════════════════════════════");
                var obdobie = employeeEntry.field(FIELDS.period);

                if (obdobie) {
                    resultObdobie = calculateWageFields(employeeEntry, obdobie, false, config, utils);

                    if (resultObdobie.success) {
                        employeeEntry.set(FIELDS.workedTime, resultObdobie.odpracovane);
                        employeeEntry.set(FIELDS.earned, resultObdobie.zarobene);
                        employeeEntry.set(FIELDS.bonuses, resultObdobie.premie);

                        utils.addDebug(employeeEntry, "  ✅ Základné polia nastavené");
                    } else {
                        utils.addError(employeeEntry, "Chyba pri výpočte základných polí: " + resultObdobie.error, "calculateWages");
                    }
                } else {
                    utils.addDebug(employeeEntry, "  ⏭️ Pole '" + FIELDS.period + "' nie je nastavené, preskakujem");
                }

                // STEP 2: Calculate for "obdobie total" (total fields)
                utils.addDebug(employeeEntry, "");
                utils.addDebug(employeeEntry, "═══════════════════════════════════════");
                utils.addDebug(employeeEntry, "📊 KROK 2: VÝPOČET TOTAL POLÍ");
                utils.addDebug(employeeEntry, "═══════════════════════════════════════");
                var obdobieTotal = employeeEntry.field(FIELDS.periodTotal);

                if (obdobieTotal) {
                    resultTotal = calculateWageFields(employeeEntry, obdobieTotal, true, config, utils);

                    if (resultTotal.success) {
                        employeeEntry.set(FIELDS.workedTimeTotal, resultTotal.odpracovane);
                        employeeEntry.set(FIELDS.earnedTotal, resultTotal.zarobene);
                        employeeEntry.set(FIELDS.bonusesTotal, resultTotal.premie);

                        utils.addDebug(employeeEntry, "  ✅ Total polia nastavené");
                    } else {
                        utils.addError(employeeEntry, "Chyba pri výpočte total polí: " + resultTotal.error, "calculateWages");
                    }
                } else {
                    utils.addDebug(employeeEntry, "  ⏭️ Pole '" + FIELDS.periodTotal + "' nie je nastavené, preskakujem");
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
                var employeeName = employeeEntry.field(FIELDS.nick) || "N/A";

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
                    return { success: false, cancelled: true };
                }

                // Clear Debug_Log for fresh calculation
                employeeEntry.set(FIELDS.debugLog, "");

                // Call main calculation
                var result = this.calculateWages(employeeEntry, config, utils);

                if (!result.success) {
                    var errorMsg = "❌ CHYBA PRI PREPOČTE\n\n";
                    errorMsg += "Zamestnanec: " + employeeName + "\n\n";
                    errorMsg += "Chyba: " + (result.error || result.message) + "\n\n";
                    errorMsg += "Skontrolujte Debug_Log pre viac informácií.";

                    dialog("Chyba prepočtu", errorMsg, "OK");
                    return { success: false, error: result.error };
                }

                // Get calculated values for success dialog
                var odpracovane = employeeEntry.field(FIELDS.workedTime) || 0;
                var zarobene = employeeEntry.field(FIELDS.earned) || 0;
                var premie = employeeEntry.field(FIELDS.bonuses) || 0;

                var odpracovaneTotal = employeeEntry.field(FIELDS.workedTimeTotal) || 0;
                var zarobeneTotal = employeeEntry.field(FIELDS.earnedTotal) || 0;
                var premieTotal = employeeEntry.field(FIELDS.bonusesTotal) || 0;

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
         * Get current hourly rate from "sadzby zamestnancov" library
         *
         * @param {Entry} employeeEntry - Current employee entry
         * @param {Object} utils - MementoUtils object (optional for logging)
         * @returns {Object} - { success: boolean, rate: number, validFrom: Date }
         */
        getCurrentHourlyRate: function(employeeEntry, utils) {
            try {
                var currentDate = new Date();
                var employeeId = employeeEntry.id;
                var employeeName = employeeEntry.field(FIELDS.nick) || employeeEntry.field("Meno") || "N/A";

                if (utils) {
                    utils.addDebug(employeeEntry, "🔍 Hľadám aktuálnu sadzbu pre: " + employeeName);
                }

                // Get "sadzby zamestnancov" library
                var ratesLibrary = libByName("sadzby zamestnancov");

                if (!ratesLibrary) {
                    if (utils) {
                        utils.addError(employeeEntry, "Knižnica 'sadzby zamestnancov' nenájdená!", "getCurrentHourlyRate");
                    }
                    return { success: false, error: "Knižnica nenájdená" };
                }

                // Get all rate entries for this employee
                var allRates = ratesLibrary.entries();
                var employeeRates = [];

                for (var i = 0; i < allRates.length; i++) {
                    var rateEntry = allRates[i];
                    var linkedEmployee = rateEntry.field(EXTERNAL.rateEmployee);

                    if (linkedEmployee && linkedEmployee.length > 0) {
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
                // NOTE: "Platné do" does NOT exist in sadzby zamestnancov (only 3 fields)
                // Rates are valid from validFrom indefinitely - take latest validFrom <= today
                var currentRate = null;
                var currentValidFrom = null;

                for (var i = 0; i < employeeRates.length; i++) {
                    var rateEntry = employeeRates[i];
                    var validFrom = rateEntry.field(EXTERNAL.rateValidFrom);
                    var rate = rateEntry.field(EXTERNAL.rateValue);

                    if (!validFrom || !rate) continue;

                    // Valid if validFrom <= currentDate, take the latest validFrom
                    if (validFrom <= currentDate) {
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
         * Update "Aktuálna hodinovka" field with current rate from "sadzby zamestnancov"
         *
         * Field name comes from FIELDS.hourlyRate (single source of truth).
         * If field doesn't exist → entry.set() throws → catch → addError → Error_Log.
         *
         * @param {Entry} employeeEntry - Current employee entry
         * @param {Object} utils - MementoUtils object (optional)
         * @returns {Object} - { success: boolean }
         */
        updateCurrentHourlyRate: function(employeeEntry, utils) {
            try {
                var result = this.getCurrentHourlyRate(employeeEntry, utils);

                if (result.success) {
                    // FIELDS.hourlyRate is the single source of truth (verified from fields.json ID:42)
                    employeeEntry.set(FIELDS.hourlyRate, result.rate);
                    return { success: true, rate: result.rate };
                } else {
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
