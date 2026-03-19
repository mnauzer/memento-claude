// ==============================================
// MEMENTO VAT MODULE - Prepočet DPH (Reusable)
// Verzia: 2.0 | Dátum: March 2026 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
//    - Reusable modul pre výpočet DPH
//    - Automatický prepočet súm s DPH a bez DPH
//    - Získanie platnej sadzby DPH z knižnice "sadzby dph"
//    - Podpora základnej, zníženej a nulovej sadzby
//    - Môže byť použitý v ľubovoľnej knižnici
// ==============================================
// 🔧 ZÁVISLOSTI:
//    - MementoUtils v7.0+ (agregátor)
//    - MementoConfig (centrálna konfigurácia)
//    - Knižnica "sadzby dph" (musí existovať)
// ==============================================
// 💡 POUŽITIE:
//    // V inom scripte:
//    var vatCalc = MementoVAT;
//    var result = vatCalc.calculateVAT(entry(), {
//        isVatField: "s DPH",
//        vatRateField: "sadzba DPH",
//        sumField: "Suma",
//        sumTotalField: "Suma s DPH",
//        vatField: "DPH",
//        dateField: "Dátum"
//    });
//
//    if (result.success) {
//        message("✅ DPH vypočítané: " + result.data.vatAmount + " €");
//    }
// ==============================================
// 🔧 CHANGELOG v2.0 (2026-03-18):
//    - Prerobené na reusable modul (IIFE pattern)
//    - Public API pre všetky funkcie
//    - Configurable field names
//    - Entry parameter namiesto global currentEntry
//    - Pridaná dokumentácia použitia
// ==============================================

var MementoVAT = (function() {
    'use strict';

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "MementoVAT",
        version: "2.0",
        author: "ASISTANTO",
        description: "Reusable modul pre výpočet DPH"
    };

    // ==============================================
    // DEFAULT CONFIGURATION
    // ==============================================

    var DEFAULT_CONFIG = {
        // Library names
        vatRatesLibrary: "sadzby dph",

        // Field names (can be overridden)
        fields: {
            isVat: "s DPH",
            vatRate: "sadzba DPH",
            sum: "Suma",
            sumTotal: "Suma s DPH",
            vat: "DPH",
            vatRateValue: "DPH%",
            date: "Dátum",
            debugLog: "Debug_Log",
            errorLog: "Error_Log",
            info: "info"
        },

        // VAT rates library fields
        vatRatesFields: {
            validFrom: "Platnosť od",
            standard: "základná",
            reduced: "znížená"
        },

        // VAT rate types
        vatRateTypes: {
            standard: "základná",
            reduced: "znížená",
            zero: "nulová"
        },

        // Icons
        icons: {
            start: "🚀",
            success: "✅",
            error: "❌",
            warning: "⚠️",
            info: "ℹ️",
            money: "💰",
            calculation: "🧮"
        }
    };

    // ==============================================
    // PRIVATE FUNCTIONS
    // ==============================================

    /**
     * Merge user config with default config
     */
    function mergeConfig(userConfig) {
        if (!userConfig) return DEFAULT_CONFIG;

        var config = JSON.parse(JSON.stringify(DEFAULT_CONFIG)); // Deep clone

        // Merge fields
        if (userConfig.fields) {
            for (var key in userConfig.fields) {
                if (userConfig.fields.hasOwnProperty(key)) {
                    config.fields[key] = userConfig.fields[key];
                }
            }
        }

        // Merge other properties
        if (userConfig.vatRatesLibrary) config.vatRatesLibrary = userConfig.vatRatesLibrary;
        if (userConfig.vatRatesFields) config.vatRatesFields = userConfig.vatRatesFields;
        if (userConfig.icons) config.icons = userConfig.icons;

        return config;
    }

    /**
     * Add debug log
     */
    function addDebug(entry, message, config) {
        try {
            if (typeof MementoUtils !== 'undefined' && MementoUtils.addDebug) {
                MementoUtils.addDebug(entry, message);
            } else {
                var log = entry.field(config.fields.debugLog) || "";
                log += "[" + new Date().toISOString() + "] " + message + "\n";
                entry.set(config.fields.debugLog, log);
            }
        } catch (e) {
            // Silent fail
        }
    }

    /**
     * Add error log
     */
    function addError(entry, message, functionName, error, config) {
        try {
            var errorMsg = "[" + functionName + "] " + message;
            if (error) errorMsg += ": " + error.toString();

            if (typeof MementoUtils !== 'undefined' && MementoUtils.addError) {
                MementoUtils.addError(entry, message, functionName, error);
            } else {
                var log = entry.field(config.fields.errorLog) || "";
                log += "[" + new Date().toISOString() + "] " + errorMsg + "\n";
                entry.set(config.fields.errorLog, log);
            }
        } catch (e) {
            // Silent fail
        }
    }

    /**
     * Safe get field value
     */
    function safeGet(entry, fieldName, defaultValue) {
        try {
            if (typeof MementoUtils !== 'undefined' && MementoUtils.safeGet) {
                return MementoUtils.safeGet(entry, fieldName, defaultValue);
            }
            var value = entry.field(fieldName);
            return (value !== null && value !== undefined) ? value : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }

    /**
     * Safe set field value
     */
    function safeSet(entry, fieldName, value) {
        try {
            if (typeof MementoUtils !== 'undefined' && MementoUtils.safeSet) {
                return MementoUtils.safeSet(entry, fieldName, value);
            }
            entry.set(fieldName, value);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Format money
     */
    function formatMoney(amount) {
        try {
            if (typeof MementoUtils !== 'undefined' && MementoUtils.formatMoney) {
                return MementoUtils.formatMoney(amount);
            }
            return amount.toFixed(2) + " €";
        } catch (e) {
            return amount + " €";
        }
    }

    /**
     * Format date
     */
    function formatDate(date) {
        try {
            if (typeof MementoUtils !== 'undefined' && MementoUtils.formatDate) {
                return MementoUtils.formatDate(date);
            }
            if (typeof moment !== 'undefined') {
                return moment(date).format("DD.MM.YYYY");
            }
            return date.toLocaleDateString();
        } catch (e) {
            return date.toString();
        }
    }

    /**
     * Clear VAT fields when VAT is not applicable
     */
    function clearVatFields(entry, config) {
        try {
            addDebug(entry, config.icons.info + " Čistím DPH polia", config);

            // Clear VAT amount
            safeSet(entry, config.fields.vat, 0);
            safeSet(entry, config.fields.vatRateValue, 0);

            // If sum with VAT is filled, copy it to sum without VAT
            var sumWithVat = safeGet(entry, config.fields.sumTotal, 0);
            if (sumWithVat > 0) {
                safeSet(entry, config.fields.sum, sumWithVat);
                safeSet(entry, config.fields.sumTotal, 0);
                addDebug(entry, config.icons.info + " Suma s DPH prekopírovaná do sumy bez DPH", config);
            }

            return { success: true };

        } catch (error) {
            addError(entry, "Chyba pri čistení DPH polí", "clearVatFields", error, config);
            return {
                success: false,
                error: "Chyba pri čistení DPH polí: " + error.toString()
            };
        }
    }

    /**
     * Get valid VAT rate from "sadzby dph" library
     */
    function getValidVatRateInternal(entry, date, vatRateType, config) {
        try {
            addDebug(entry, config.icons.calculation + " Hľadám platnú sadzbu DPH...", config);

            // For zero rate, return 0
            if (vatRateType === config.vatRateTypes.zero) {
                return { success: true, rate: 0 };
            }

            // Get VAT rates library
            var vatRatesLib = libByName(config.vatRatesLibrary);
            if (!vatRatesLib) {
                return {
                    success: false,
                    error: "Knižnica '" + config.vatRatesLibrary + "' nenájdená!"
                };
            }

            // Get all rates
            var allRates = vatRatesLib.entries();
            if (!allRates || allRates.length === 0) {
                return {
                    success: false,
                    error: "V knižnici '" + config.vatRatesLibrary + "' nie sú žiadne sadzby!"
                };
            }

            addDebug(entry, "  • Počet záznamov sadzieb: " + allRates.length, config);

            // Filter valid rates for the date
            var validRates = [];

            for (var i = 0; i < allRates.length; i++) {
                var rateEntry = allRates[i];
                var validFrom = safeGet(rateEntry, config.vatRatesFields.validFrom);

                if (!validFrom) {
                    addDebug(entry, "  ⚠️ Sadzba nemá dátum platnosti", config);
                    continue;
                }

                // Compare dates
                if (new Date(validFrom) <= new Date(date)) {
                    validRates.push({
                        entry: rateEntry,
                        validFrom: validFrom,
                        standard: safeGet(rateEntry, config.vatRatesFields.standard, 0),
                        reduced: safeGet(rateEntry, config.vatRatesFields.reduced, 0)
                    });
                }
            }

            if (validRates.length === 0) {
                return {
                    success: false,
                    error: "Nenašla sa žiadna platná sadzba DPH k dátumu " + formatDate(date)
                };
            }

            // Sort by validity date (newest first)
            validRates.sort(function(a, b) {
                return new Date(b.validFrom) - new Date(a.validFrom);
            });

            // Select the newest valid rate
            var currentRate = validRates[0];
            addDebug(entry, "  • Použitá sadzba platná od: " + formatDate(currentRate.validFrom), config);

            // Select specific rate based on type
            var selectedRate = 0;
            if (vatRateType === config.vatRateTypes.standard) {
                selectedRate = currentRate.standard;
            } else if (vatRateType === config.vatRateTypes.reduced) {
                selectedRate = currentRate.reduced;
            }

            return {
                success: true,
                rate: selectedRate,
                rateEntry: currentRate.entry
            };

        } catch (error) {
            addError(entry, "Chyba pri získavaní sadzby DPH", "getValidVatRate", error, config);
            return {
                success: false,
                error: "Chyba pri získavaní sadzby DPH: " + error.toString()
            };
        }
    }

    /**
     * Calculate VAT amounts
     */
    function calculateVATInternal(entry, vatRate, config) {
        try {
            addDebug(entry, config.icons.calculation + " Prepočítavam sumy...", config);

            // Get existing sums
            var sumWithoutVat = safeGet(entry, config.fields.sum, 0);
            var sumWithVat = safeGet(entry, config.fields.sumTotal, 0);

            // VAT coefficient
            var vatCoefficient = vatRate / 100;

            var finalSumWithoutVat, finalSumWithVat, vatAmount;

            // Determine calculation direction based on which field is filled
            if (sumWithVat > 0 && sumWithoutVat === 0) {
                // We have sum with VAT, calculate sum without VAT
                addDebug(entry, "  • Výpočet zo sumy s DPH: " + formatMoney(sumWithVat), config);

                finalSumWithVat = sumWithVat;
                finalSumWithoutVat = sumWithVat / (1 + vatCoefficient);
                vatAmount = finalSumWithVat - finalSumWithoutVat;

            } else if (sumWithoutVat > 0) {
                // We have sum without VAT, calculate sum with VAT
                addDebug(entry, "  • Výpočet zo sumy bez DPH: " + formatMoney(sumWithoutVat), config);

                finalSumWithoutVat = sumWithoutVat;
                vatAmount = sumWithoutVat * vatCoefficient;
                finalSumWithVat = sumWithoutVat + vatAmount;

            } else {
                return {
                    success: false,
                    error: "Musí byť zadaná buď '" + config.fields.sum + "' alebo '" + config.fields.sumTotal + "'!"
                };
            }

            // Round to 2 decimal places
            finalSumWithoutVat = Math.round(finalSumWithoutVat * 100) / 100;
            finalSumWithVat = Math.round(finalSumWithVat * 100) / 100;
            vatAmount = Math.round(vatAmount * 100) / 100;

            // Save calculated values
            safeSet(entry, config.fields.sum, finalSumWithoutVat);
            safeSet(entry, config.fields.sumTotal, finalSumWithVat);
            safeSet(entry, config.fields.vat, vatAmount);
            safeSet(entry, config.fields.vatRateValue, vatRate);

            addDebug(entry, "  • Suma bez DPH: " + formatMoney(finalSumWithoutVat), config);
            addDebug(entry, "  • DPH (" + vatRate + "%): " + formatMoney(vatAmount), config);
            addDebug(entry, "  • Suma s DPH: " + formatMoney(finalSumWithVat), config);

            return {
                success: true,
                sumWithoutVat: finalSumWithoutVat,
                vatAmount: vatAmount,
                sumWithVat: finalSumWithVat,
                vatRate: vatRate
            };

        } catch (error) {
            addError(entry, "Chyba pri výpočte DPH", "calculateVAT", error, config);
            return {
                success: false,
                error: "Chyba pri výpočte DPH: " + error.toString()
            };
        }
    }

    /**
     * Create info record
     */
    function createInfoRecord(entry, vatRate, calculationResult, config) {
        try {
            var infoText = "📊 PREPOČET DPH\n";
            infoText += "================\n";
            infoText += "Sadzba DPH: " + vatRate + "%\n";
            infoText += "Suma bez DPH: " + formatMoney(calculationResult.sumWithoutVat) + "\n";
            infoText += "DPH: " + formatMoney(calculationResult.vatAmount) + "\n";
            infoText += "Suma s DPH: " + formatMoney(calculationResult.sumWithVat) + "\n";

            if (typeof moment !== 'undefined') {
                infoText += "Čas: " + moment().format("DD.MM.YYYY HH:mm:ss");
            } else {
                infoText += "Čas: " + new Date().toLocaleString();
            }

            safeSet(entry, config.fields.info, infoText);

        } catch (error) {
            addError(entry, "Chyba pri vytváraní info záznamu", "createInfoRecord", error, config);
        }
    }

    // ==============================================
    // PUBLIC API
    // ==============================================

    return {
        /**
         * Module information
         */
        info: MODULE_INFO,

        /**
         * Get module version
         */
        getVersion: function() {
            return MODULE_INFO.version;
        },

        /**
         * Calculate VAT for an entry
         *
         * @param {Entry} entry - Memento entry object
         * @param {Object} userConfig - Configuration overrides
         * @returns {Object} {success: boolean, data: Object, error: string}
         *
         * @example
         * var result = MementoVAT.calculateVAT(entry(), {
         *     fields: {
         *         isVat: "s DPH",
         *         sum: "Suma",
         *         sumTotal: "Suma s DPH"
         *     }
         * });
         */
        calculateVAT: function(entry, userConfig) {
            try {
                var config = mergeConfig(userConfig);

                addDebug(entry, config.icons.start + " === ŠTART MementoVAT v" + MODULE_INFO.version + " ===", config);

                // Check if VAT should be calculated
                var isVat = safeGet(entry, config.fields.isVat, false);

                if (!isVat) {
                    addDebug(entry, config.icons.info + " DPH nie je zaškrtnuté - prepočet sa nespustí", config);
                    return clearVatFields(entry, config);
                }

                addDebug(entry, config.icons.success + " DPH je zaškrtnuté - pokračujem v prepočte", config);

                // Get date for determining valid rate
                var date = safeGet(entry, config.fields.date);
                if (!date) {
                    date = (typeof moment !== 'undefined') ? moment().toDate() : new Date();
                }
                addDebug(entry, config.icons.info + " Dátum pre sadzbu: " + formatDate(date), config);

                // Get VAT rate type
                var vatRateType = safeGet(entry, config.fields.vatRate, config.vatRateTypes.standard);
                addDebug(entry, config.icons.info + " Typ sadzby DPH: " + vatRateType, config);

                // Get valid VAT rate
                var vatRateResult = getValidVatRateInternal(entry, date, vatRateType, config);
                if (!vatRateResult.success) {
                    addError(entry, vatRateResult.error, "calculateVAT", null, config);
                    return {
                        success: false,
                        error: vatRateResult.error
                    };
                }

                var vatRate = vatRateResult.rate;
                addDebug(entry, config.icons.success + " Platná sadzba DPH: " + vatRate + "%", config);

                // Calculate VAT
                var calculationResult = calculateVATInternal(entry, vatRate, config);
                if (!calculationResult.success) {
                    addError(entry, calculationResult.error, "calculateVAT", null, config);
                    return calculationResult;
                }

                // Create info record
                createInfoRecord(entry, vatRate, calculationResult, config);

                addDebug(entry, config.icons.success + " === PREPOČET DPH DOKONČENÝ ===", config);

                return {
                    success: true,
                    data: calculationResult
                };

            } catch (error) {
                var config = mergeConfig(userConfig);
                addError(entry, "Kritická chyba v calculateVAT", "calculateVAT", error, config);
                return {
                    success: false,
                    error: "Kritická chyba: " + error.toString()
                };
            }
        },

        /**
         * Get valid VAT rate for a specific date and type
         *
         * @param {Entry} entry - Memento entry for logging
         * @param {Date} date - Date to check
         * @param {string} vatRateType - Type of VAT rate (standard/reduced/zero)
         * @param {Object} userConfig - Configuration overrides
         * @returns {Object} {success: boolean, rate: number, error: string}
         *
         * @example
         * var result = MementoVAT.getValidVatRate(entry(), new Date(), "základná");
         * if (result.success) {
         *     message("Platná sadzba: " + result.rate + "%");
         * }
         */
        getValidVatRate: function(entry, date, vatRateType, userConfig) {
            var config = mergeConfig(userConfig);
            return getValidVatRateInternal(entry, date, vatRateType, config);
        },

        /**
         * Calculate VAT only (without setting fields)
         *
         * @param {number} amount - Amount to calculate VAT for
         * @param {number} vatRate - VAT rate percentage
         * @param {boolean} amountIncludesVat - If true, amount includes VAT
         * @returns {Object} {sumWithoutVat, vatAmount, sumWithVat}
         *
         * @example
         * var result = MementoVAT.calculateVATOnly(100, 20, false);
         * // result = {sumWithoutVat: 100, vatAmount: 20, sumWithVat: 120}
         */
        calculateVATOnly: function(amount, vatRate, amountIncludesVat) {
            try {
                var vatCoefficient = vatRate / 100;
                var sumWithoutVat, sumWithVat, vatAmount;

                if (amountIncludesVat) {
                    // Amount includes VAT
                    sumWithVat = amount;
                    sumWithoutVat = amount / (1 + vatCoefficient);
                    vatAmount = sumWithVat - sumWithoutVat;
                } else {
                    // Amount without VAT
                    sumWithoutVat = amount;
                    vatAmount = amount * vatCoefficient;
                    sumWithVat = amount + vatAmount;
                }

                // Round to 2 decimal places
                sumWithoutVat = Math.round(sumWithoutVat * 100) / 100;
                sumWithVat = Math.round(sumWithVat * 100) / 100;
                vatAmount = Math.round(vatAmount * 100) / 100;

                return {
                    success: true,
                    sumWithoutVat: sumWithoutVat,
                    vatAmount: vatAmount,
                    sumWithVat: sumWithVat,
                    vatRate: vatRate
                };

            } catch (error) {
                return {
                    success: false,
                    error: "Chyba pri výpočte: " + error.toString()
                };
            }
        },

        /**
         * Clear VAT fields
         *
         * @param {Entry} entry - Memento entry object
         * @param {Object} userConfig - Configuration overrides
         * @returns {Object} {success: boolean}
         */
        clearVatFields: function(entry, userConfig) {
            var config = mergeConfig(userConfig);
            return clearVatFields(entry, config);
        }
    };

})();

// Auto-export info on load
if (typeof log !== 'undefined') {
    log("✅ MementoVAT v" + MementoVAT.getVersion() + " loaded");
}
