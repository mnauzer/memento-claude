// ==============================================
// LIBRARY MODULE - Cenové ponuky (Price Quotes)
// Verzia: 1.0.0 | Dátum: 2026-03-19 | Autor: ASISTANTO
// ==============================================
// 📋 PURPOSE:
//    - Reusable module for Price Quote calculations
//    - Calculate quote totals from parts
//    - Calculate transport costs (5 methods)
//    - Calculate mass transfer costs (5 methods)
//    - Manage subcontracts placement
//    - Calculate VAT and final totals
// ==============================================
// 🔧 DEPENDENCIES:
//    - MementoUtils v7.0+
//    - MementoConfig (central configuration)
// ==============================================
// 📖 USAGE:
//    var result = CenovePonuky.calculateQuote(entry(), {
//        utils: MementoUtils,
//        centralConfig: MementoConfig.getConfig()
//    });
// ==============================================
// 🔄 EXTRACTED FROM:
//    libraries/cenove-ponuky/CenPon.Calculate.js v1.5.1 (1,277 lines)
//    Extraction date: 2026-03-19
// ==============================================

var CenovePonuky = (function() {
    'use strict';

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "CenovePonuky",
        version: "1.0.0",
        author: "ASISTANTO",
        description: "Price quote calculation and management module",
        library: "Cenové ponuky",
        status: "active",
        extractedFrom: "CenPon.Calculate.js v1.5.1",
        extractedLines: 1277,
        extractedDate: "2026-03-19"
    };

    // ==============================================
    // CONFIGURATION
    // ==============================================

    var DEFAULT_CONFIG = {
        scriptName: "CenovePonuky Module",

        // Field mappings (Slovak names)
        fields: {
            // Quote fields
            number: "Číslo",
            name: "Názov",
            type: "Typ",
            date: "Dátum",
            place: "Miesto realizácie",

            // Parts fields
            parts: "Diely",
            partsHzs: "Diely HZS",
            subcontracts: "Subdodávky",

            // Calculation fields
            total: "Celkom",
            totalWithVat: "Celkom s DPH",
            vat: "DPH",
            vatRate: "Sadzba DPH",
            transportPrice: "Cena dopravy",
            massTransferPrice: "Cena presunu hmôt",
            materialWeight: "Hmotnosť materiálu",
            expectedKm: "Predpokladaný počet km",
            subcontractsTotal: "Celkom subdodávky",

            // Settings
            transportBilling: "Účtovanie dopravy",
            massTransferBilling: "Účtovanie presunu hmôt",
            subcontractsBilling: "Účtovanie subdodávok",

            // Transport settings
            transportPricePerKm: "Doprava cena za km",
            fixedTransportPrice: "Doprava pevná cena",
            transportPercentage: "Doprava percentá",
            transportLumpSum: "Doprava paušál",

            // Mass transfer settings
            massTransferPriceEntry: "Cena presunu hmôt materiálu",
            massTransferPercentage: "Presun hmôt percentá",
            massTransferLumpSum: "Presun hmôt paušál",
            massTransferFixedPrice: "Presun hmôt pevná cena",

            // Location fields
            distance: "Vzdialenosť",
            numberOfTrips: "Počet jázd",

            // Common
            debugLog: "Debug_Log",
            errorLog: "Error_Log",
            info: "info"
        },

        // Billing methods
        billingMethods: {
            notBilled: "Neúčtovať",
            lumpSum: "Paušál",
            km: "Km",
            percentage: "%",
            fixedPrice: "Pevná cena",
            byWeight: "Podľa hmotnosti materiálu",
            includeInPrice: "Zarátať do ceny",
            createAddendum: "Vytvoriť dodatok"
        },

        // Quote types
        quoteTypes: {
            items: "Položky",
            hourly: "Hodinovka",
            external: "Externá"
        }
    };

    // ==============================================
    // PRIVATE HELPER FUNCTIONS
    // ==============================================

    function mergeConfig(userConfig) {
        if (!userConfig) return DEFAULT_CONFIG;

        var merged = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

        for (var key in userConfig) {
            if (userConfig.hasOwnProperty(key)) {
                merged[key] = userConfig[key];
            }
        }

        return merged;
    }

    function addDebug(entry, utils, message, icon) {
        if (!utils || !utils.addDebug) return;
        utils.addDebug(entry, message, icon);
    }

    function addError(entry, utils, message, functionName, error) {
        if (!utils || !utils.addError) return;
        utils.addError(entry, message, functionName, error);
    }

    function addInfo(entry, utils, title, data, meta) {
        if (!utils || !utils.addInfo) return;
        utils.addInfo(entry, title, data, meta);
    }

    /**
     * Get parts field based on quote type
     * @private
     */
    function getPartsFieldByType(entry, utils, config) {
        var quoteType = utils.safeGet(entry, config.fields.type);

        if (quoteType === config.quoteTypes.hourly) {
            return {
                fieldName: config.fields.partsHzs,
                partsArray: utils.safeGetLinks(entry, config.fields.partsHzs) || []
            };
        } else {
            return {
                fieldName: config.fields.parts,
                partsArray: utils.safeGetLinks(entry, config.fields.parts) || []
            };
        }
    }

    // ==============================================
    // NAME UPDATE
    // ==============================================

    /**
     * Update quote name from place of realization
     * @private
     */
    function updateNameFromPlace(entry, utils, config, centralConfig) {
        try {
            addDebug(entry, utils, "  📍 Aktualizácia názvu z Miesta realizácie");

            var placeEntries = utils.safeGetLinks(entry, config.fields.place);

            if (!placeEntries || placeEntries.length === 0) {
                addDebug(entry, utils, "    ⚠️ Nie je vybrané miesto realizácie");
                return { success: true };
            }

            var placeEntry = placeEntries[0];
            var placeName = utils.safeGet(placeEntry, centralConfig.fields.place.name);

            if (!placeName) {
                addDebug(entry, utils, "    ⚠️ Miesto realizácie nemá názov");
                return { success: true };
            }

            addDebug(entry, utils, "    ✅ Názov miesta: " + placeName);
            entry.set(config.fields.name, placeName);

            return { success: true };

        } catch (error) {
            addError(entry, utils, error.toString(), "updateNameFromPlace", error);
            return { success: false, error: error.toString() };
        }
    }

    // ==============================================
    // PARTS VALIDATION
    // ==============================================

    /**
     * Validate parts links with quote
     * @private
     */
    function validatePartsLinks(entry, utils, config, centralConfig) {
        try {
            addDebug(entry, utils, "  🔍 Kontrola prepojenia dielov s cenovou ponukou");

            var quoteNumber = (utils.safeGet(entry, config.fields.number) || "").toString().trim();
            var quoteType = utils.safeGet(entry, config.fields.type) || config.quoteTypes.items;

            addDebug(entry, utils, "    Číslo CP: " + quoteNumber);
            addDebug(entry, utils, "    Typ CP: " + quoteType);

            var partsField = getPartsFieldByType(entry, utils, config);
            var partsEntries = partsField.partsArray;

            addDebug(entry, utils, "    Pole dielov: " + partsField.fieldName);

            if (partsEntries.length === 0) {
                addDebug(entry, utils, "    ℹ️ Žiadne diely na kontrolu");
                return { success: true, validParts: [] };
            }

            var validParts = [];
            var seenPartIds = {};
            var removedCount = 0;
            var duplicateCount = 0;

            for (var i = 0; i < partsEntries.length; i++) {
                var part = partsEntries[i];
                var partQuoteNumber = (utils.safeGet(part, centralConfig.fields.quotePart.quoteNumber) || "").toString().trim();
                var partType = utils.safeGet(part, centralConfig.fields.quotePart.partType) || ("Diel #" + (i + 1));
                var partId = utils.safeGet(part, centralConfig.fields.common.id);

                // Check duplicates
                if (seenPartIds[partId]) {
                    addDebug(entry, utils, "    ⊗ Duplicita: " + partType + " - odstránená");
                    duplicateCount++;
                    continue;
                }

                // Check quote number match
                if (partQuoteNumber && partQuoteNumber !== quoteNumber) {
                    addDebug(entry, utils, "    ✗ Neplatné prepojenie: " + partType);
                    removedCount++;
                    continue;
                }

                seenPartIds[partId] = true;
                validParts.push(part);
            }

            // Update parts field if changes were made
            if (removedCount > 0 || duplicateCount > 0) {
                utils.safeSet(entry, partsField.fieldName, validParts);
                addDebug(entry, utils, "  ✅ Validácia dokončená: " + validParts.length + " validných dielov");

                if (removedCount > 0) {
                    addDebug(entry, utils, "    Odstránené neplatné prepojenia: " + removedCount);
                }
                if (duplicateCount > 0) {
                    addDebug(entry, utils, "    Odstránené duplicity: " + duplicateCount);
                }
            } else {
                addDebug(entry, utils, "  ✅ Všetky diely sú validné (" + validParts.length + ")");
            }

            return { success: true, validParts: validParts };

        } catch (error) {
            addError(entry, utils, error.toString(), "validatePartsLinks", error);
            return { success: false, validParts: [], error: error.toString() };
        }
    }

    // ==============================================
    // PARTS CALCULATIONS
    // ==============================================

    /**
     * Calculate total from parts
     * @private
     */
    function calculatePartsTotal(entry, utils, config, centralConfig) {
        try {
            var partsField = getPartsFieldByType(entry, utils, config);
            var partsEntries = partsField.partsArray;

            addDebug(entry, utils, "  Pole: " + partsField.fieldName);
            addDebug(entry, utils, "  Počet dielov: " + partsEntries.length);

            if (partsEntries.length === 0) {
                addDebug(entry, utils, "  ℹ️ Žiadne diely");
                return 0;
            }

            var total = 0;
            for (var i = 0; i < partsEntries.length; i++) {
                var part = partsEntries[i];
                var partTotal = utils.safeGet(part, centralConfig.fields.quotePart.total, 0);
                total += parseFloat(partTotal) || 0;
            }

            addDebug(entry, utils, "  ✅ Suma z dielov: " + utils.formatMoney(total));
            return total;

        } catch (error) {
            addError(entry, utils, error.toString(), "calculatePartsTotal", error);
            return 0;
        }
    }

    /**
     * Calculate material weight from parts
     * @private
     */
    function calculateMaterialWeight(entry, utils, config, centralConfig) {
        try {
            var partsField = getPartsFieldByType(entry, utils, config);
            var partsEntries = partsField.partsArray;

            addDebug(entry, utils, "  Pole: " + partsField.fieldName);
            addDebug(entry, utils, "  Počet dielov: " + partsEntries.length);

            if (partsEntries.length === 0) {
                addDebug(entry, utils, "  ℹ️ Žiadne diely");
                return 0;
            }

            var totalWeight = 0;
            for (var i = 0; i < partsEntries.length; i++) {
                var part = partsEntries[i];
                var partType = utils.safeGet(part, centralConfig.fields.quotePart.partType);

                // Skip subcontracts
                if (partType === "Subdodávky") {
                    continue;
                }

                var weight = utils.safeGet(part, centralConfig.fields.quotePart.materialWeight, 0);
                totalWeight += parseFloat(weight) || 0;
            }

            addDebug(entry, utils, "  ✅ Celková hmotnosť: " + totalWeight.toFixed(3) + " t");
            return totalWeight;

        } catch (error) {
            addError(entry, utils, error.toString(), "calculateMaterialWeight", error);
            return 0;
        }
    }

    // ==============================================
    // TRANSPORT CALCULATIONS
    // ==============================================

    /**
     * Calculate expected kilometers
     * @private
     */
    function calculateExpectedKm(entry, utils, config) {
        try {
            var placeEntries = utils.safeGetLinks(entry, config.fields.place);

            if (!placeEntries || placeEntries.length === 0) {
                addDebug(entry, utils, "  ⚠️ Nie je vybrané miesto realizácie");
                return 0;
            }

            var placeEntry = placeEntries[0];
            var distance = utils.safeGet(placeEntry, config.fields.distance, 0);
            var numberOfTrips = utils.safeGet(entry, config.fields.numberOfTrips, 1);

            var expectedKm = distance * 2 * numberOfTrips;

            addDebug(entry, utils, "  Vzdialenosť: " + distance + " km");
            addDebug(entry, utils, "  Počet jázd: " + numberOfTrips);
            addDebug(entry, utils, "  ✅ Predpokladané km: " + expectedKm + " km");

            return expectedKm;

        } catch (error) {
            addError(entry, utils, error.toString(), "calculateExpectedKm", error);
            return 0;
        }
    }

    /**
     * Calculate transport price
     * @private
     */
    function calculateTransportPrice(entry, totalFromParts, currentDate, expectedKm, utils, config) {
        try {
            var billingType = utils.safeGet(entry, config.fields.transportBilling) || config.billingMethods.notBilled;

            addDebug(entry, utils, "  Typ účtovania: " + billingType);

            var transportPrice = 0;

            switch (billingType) {
                case config.billingMethods.notBilled:
                    addDebug(entry, utils, "  Doprava sa neúčtuje");
                    break;

                case config.billingMethods.lumpSum:
                    var lumpSum = utils.safeGet(entry, config.fields.transportLumpSum, 0);
                    transportPrice = parseFloat(lumpSum) || 0;
                    addDebug(entry, utils, "  Paušál: " + utils.formatMoney(transportPrice));
                    break;

                case config.billingMethods.km:
                    var pricePerKm = utils.safeGet(entry, config.fields.transportPricePerKm, 0);
                    transportPrice = expectedKm * parseFloat(pricePerKm);
                    addDebug(entry, utils, "  Cena za km: " + pricePerKm + " €");
                    addDebug(entry, utils, "  Predpokladané km: " + expectedKm + " km");
                    break;

                case config.billingMethods.percentage:
                    var percentage = utils.safeGet(entry, config.fields.transportPercentage, 0);
                    transportPrice = totalFromParts * (parseFloat(percentage) / 100);
                    addDebug(entry, utils, "  Percentá: " + percentage + "%");
                    addDebug(entry, utils, "  Základ: " + utils.formatMoney(totalFromParts));
                    break;

                case config.billingMethods.fixedPrice:
                    var fixedPrice = utils.safeGet(entry, config.fields.fixedTransportPrice, 0);
                    transportPrice = parseFloat(fixedPrice) || 0;
                    addDebug(entry, utils, "  Pevná cena: " + utils.formatMoney(transportPrice));
                    break;

                default:
                    addDebug(entry, utils, "  ⚠️ Neznámy typ účtovania: " + billingType);
            }

            addDebug(entry, utils, "  ✅ Cena dopravy: " + utils.formatMoney(transportPrice));
            return transportPrice;

        } catch (error) {
            addError(entry, utils, error.toString(), "calculateTransportPrice", error);
            return 0;
        }
    }

    // ==============================================
    // MASS TRANSFER CALCULATIONS
    // ==============================================

    /**
     * Calculate mass transfer price
     * @private
     */
    function calculateMassTransferPrice(entry, totalFromParts, materialWeight, currentDate, utils, config, centralConfig) {
        try {
            var billingType = utils.safeGet(entry, config.fields.massTransferBilling) || config.billingMethods.notBilled;

            addDebug(entry, utils, "  Typ účtovania: " + billingType);

            var massTransferPrice = 0;

            switch (billingType) {
                case config.billingMethods.notBilled:
                    addDebug(entry, utils, "  Presun hmôt sa neúčtuje");
                    break;

                case config.billingMethods.lumpSum:
                    var lumpSum = utils.safeGet(entry, config.fields.massTransferLumpSum, 0);
                    massTransferPrice = parseFloat(lumpSum) || 0;
                    addDebug(entry, utils, "  Paušál: " + utils.formatMoney(massTransferPrice));
                    break;

                case config.billingMethods.byWeight:
                    var priceEntries = utils.safeGetLinks(entry, config.fields.massTransferPriceEntry);

                    if (!priceEntries || priceEntries.length === 0) {
                        addDebug(entry, utils, "  ⚠️ Nie je vybraná cena presunu hmôt");
                        break;
                    }

                    var priceEntry = priceEntries[0];
                    var pricePerTon = utils.safeGet(priceEntry, centralConfig.fields.workPrice.price, 0);

                    massTransferPrice = materialWeight * parseFloat(pricePerTon);
                    addDebug(entry, utils, "  Cena za tonu: " + pricePerTon + " €/t");
                    addDebug(entry, utils, "  Hmotnosť: " + materialWeight.toFixed(3) + " t");
                    break;

                case config.billingMethods.percentage:
                    var percentage = utils.safeGet(entry, config.fields.massTransferPercentage, 0);
                    massTransferPrice = totalFromParts * (parseFloat(percentage) / 100);
                    addDebug(entry, utils, "  Percentá: " + percentage + "%");
                    addDebug(entry, utils, "  Základ: " + utils.formatMoney(totalFromParts));
                    break;

                case config.billingMethods.fixedPrice:
                    var fixedPrice = utils.safeGet(entry, config.fields.massTransferFixedPrice, 0);
                    massTransferPrice = parseFloat(fixedPrice) || 0;
                    addDebug(entry, utils, "  Pevná cena: " + utils.formatMoney(massTransferPrice));
                    break;

                default:
                    addDebug(entry, utils, "  ⚠️ Neznámy typ účtovania: " + billingType);
            }

            addDebug(entry, utils, "  ✅ Cena presunu hmôt: " + utils.formatMoney(massTransferPrice));
            return massTransferPrice;

        } catch (error) {
            addError(entry, utils, error.toString(), "calculateMassTransferPrice", error);
            return 0;
        }
    }

    // ==============================================
    // SUBCONTRACTS MANAGEMENT
    // ==============================================

    /**
     * Manage subcontracts placement
     * @private
     */
    function manageSubcontracts(entry, utils, config, centralConfig) {
        try {
            var billingType = utils.safeGet(entry, config.fields.subcontractsBilling) || config.billingMethods.notBilled;

            addDebug(entry, utils, "  Typ účtovania subdodávok: " + billingType);

            // Get all three fields
            var partsField = getPartsFieldByType(entry, utils, config);
            var partsEntries = partsField.partsArray || [];
            var subcontractsEntries = utils.safeGetLinks(entry, config.fields.subcontracts) || [];

            // Find subcontract parts
            var subcontractPart = null;
            var foundInParts = false;
            var foundInSubcontracts = false;

            // Check in parts field
            for (var i = 0; i < partsEntries.length; i++) {
                var part = partsEntries[i];
                var partType = utils.safeGet(part, centralConfig.fields.quotePart.partType);

                if (partType === "Subdodávky") {
                    subcontractPart = part;
                    foundInParts = true;
                    break;
                }
            }

            // Check in subcontracts field
            if (!subcontractPart) {
                for (var j = 0; j < subcontractsEntries.length; j++) {
                    var subPart = subcontractsEntries[j];
                    var subPartType = utils.safeGet(subPart, centralConfig.fields.quotePart.partType);

                    if (subPartType === "Subdodávky") {
                        subcontractPart = subPart;
                        foundInSubcontracts = true;
                        break;
                    }
                }
            }

            if (!subcontractPart) {
                if (billingType === config.billingMethods.includeInPrice ||
                    billingType === config.billingMethods.createAddendum) {
                    addDebug(entry, utils, "  ℹ️ Subdodávka neexistuje");
                }
                return { success: true, subcontractEntry: null, location: null, totalSubcontracts: 0 };
            }

            // Determine target location
            var targetLocation = null;
            if (billingType === config.billingMethods.includeInPrice) {
                targetLocation = "parts";
            } else if (billingType === config.billingMethods.createAddendum) {
                targetLocation = "subcontracts";
            }

            // Move if needed
            if (targetLocation === "parts" && !foundInParts) {
                // Move to parts
                var newParts = partsEntries.slice();
                newParts.push(subcontractPart);
                utils.safeSet(entry, partsField.fieldName, newParts);
                utils.safeSet(entry, config.fields.subcontracts, []);

                addDebug(entry, utils, "  ↻ Subdodávka presunutá do: " + partsField.fieldName);

            } else if (targetLocation === "subcontracts" && !foundInSubcontracts) {
                // Move to subcontracts
                var filteredParts = [];
                for (var k = 0; k < partsEntries.length; k++) {
                    var p = partsEntries[k];
                    var pType = utils.safeGet(p, centralConfig.fields.quotePart.partType);
                    if (pType !== "Subdodávky") {
                        filteredParts.push(p);
                    }
                }
                utils.safeSet(entry, partsField.fieldName, filteredParts);
                utils.safeSet(entry, config.fields.subcontracts, [subcontractPart]);

                addDebug(entry, utils, "  ↻ Subdodávka presunutá do: Subdodávky");
            }

            // Calculate subcontracts total
            var totalSubcontracts = 0;
            if (targetLocation === "subcontracts") {
                totalSubcontracts = utils.safeGet(subcontractPart, centralConfig.fields.quotePart.total, 0);
                entry.set(config.fields.subcontractsTotal, totalSubcontracts);
                addDebug(entry, utils, "  ✅ Celkom subdodávky: " + utils.formatMoney(totalSubcontracts));
            } else {
                entry.set(config.fields.subcontractsTotal, 0);
            }

            return {
                success: true,
                subcontractEntry: subcontractPart,
                location: targetLocation,
                totalSubcontracts: totalSubcontracts
            };

        } catch (error) {
            addError(entry, utils, error.toString(), "manageSubcontracts", error);
            return { success: false, subcontractEntry: null, location: null, totalSubcontracts: 0 };
        }
    }

    // ==============================================
    // PUBLIC API - MAIN FUNCTION
    // ==============================================

    /**
     * Main quote calculation function
     *
     * Calculates complete quote including:
     * 1. Name update from place
     * 2. Parts validation
     * 3. Parts total calculation
     * 4. Subcontracts management
     * 5. Material weight calculation
     * 6. Expected km calculation
     * 7. Transport price calculation
     * 8. Mass transfer price calculation
     * 9. VAT calculation
     * 10. Final total with VAT
     *
     * @param {Entry} quoteEntry - Quote entry
     * @param {Object} options - Configuration
     *   - utils: MementoUtils instance (required)
     *   - config: Custom configuration (optional)
     *   - centralConfig: Central config (optional)
     * @returns {Object} Result with success status and calculated values
     *
     * @example
     * var result = CenovePonuky.calculateQuote(entry(), {
     *     utils: MementoUtils,
     *     centralConfig: MementoConfig.getConfig()
     * });
     */
    function calculateQuote(quoteEntry, options) {
        try {
            var utils = options.utils || (typeof MementoUtils !== 'undefined' ? MementoUtils : null);
            var config = mergeConfig(options.config);
            var centralConfig = options.centralConfig || (utils ? utils.config : null);

            if (!utils) {
                return { success: false, error: "MementoUtils not available" };
            }

            if (!centralConfig) {
                return { success: false, error: "Central config not available" };
            }

            addDebug(quoteEntry, utils, "🏗️ === ŠTART CenovePonuky.calculateQuote v" + MODULE_INFO.version + " ===");

            // Get quote date
            var currentDate = utils.safeGet(quoteEntry, config.fields.date);
            if (!currentDate) {
                currentDate = new Date();
                addDebug(quoteEntry, utils, "⚠️ Dátum nie je zadaný, použijem dnešný dátum");
            }
            addDebug(quoteEntry, utils, "📅 Dátum cenovej ponuky: " + moment(currentDate).format("DD.MM.YYYY"));

            // STEP 1: Update name from place
            addDebug(quoteEntry, utils, "\n📍 KROK 1: Aktualizácia názvu z miesta");
            updateNameFromPlace(quoteEntry, utils, config, centralConfig);

            // STEP 2a: Validate parts links
            addDebug(quoteEntry, utils, "\n🔍 KROK 2a: Validácia prepojení dielov");
            validatePartsLinks(quoteEntry, utils, config, centralConfig);

            // STEP 2: Calculate parts total
            addDebug(quoteEntry, utils, "\n💰 KROK 2: Spočítanie dielov");
            var totalFromParts = calculatePartsTotal(quoteEntry, utils, config, centralConfig);
            quoteEntry.set(config.fields.total, totalFromParts);

            // STEP 2c: Manage subcontracts
            addDebug(quoteEntry, utils, "\n⚙️ KROK 2c: Správa subdodávok");
            var subcontractsInfo = manageSubcontracts(quoteEntry, utils, config, centralConfig);

            // Recalculate after moving subcontracts
            totalFromParts = calculatePartsTotal(quoteEntry, utils, config, centralConfig);
            quoteEntry.set(config.fields.total, totalFromParts);

            // STEP 2d: Calculate material weight
            addDebug(quoteEntry, utils, "\n⚖️ KROK 2d: Výpočet hmotnosti materiálu");
            var materialWeight = calculateMaterialWeight(quoteEntry, utils, config, centralConfig);
            quoteEntry.set(config.fields.materialWeight, materialWeight);

            // STEP 2b: Calculate expected km
            addDebug(quoteEntry, utils, "\n🚗 KROK 2b: Výpočet predpokladaných km");
            var expectedKm = calculateExpectedKm(quoteEntry, utils, config);
            quoteEntry.set(config.fields.expectedKm, expectedKm);

            // STEP 3: Calculate transport price
            addDebug(quoteEntry, utils, "\n🚚 KROK 3: Výpočet dopravy");
            var transportPrice = calculateTransportPrice(quoteEntry, totalFromParts, currentDate, expectedKm, utils, config);
            quoteEntry.set(config.fields.transportPrice, transportPrice);

            // STEP 3b: Calculate mass transfer price
            addDebug(quoteEntry, utils, "\n🏗️ KROK 3b: Výpočet presunu hmôt");
            var massTransferPrice = calculateMassTransferPrice(quoteEntry, totalFromParts, materialWeight, currentDate, utils, config, centralConfig);
            quoteEntry.set(config.fields.massTransferPrice, massTransferPrice);

            // STEP 4: Calculate VAT
            addDebug(quoteEntry, utils, "\n📊 KROK 4: Výpočet DPH");
            var vatRatePercentage = utils.getValidVatRate(currentDate, "základná");
            addDebug(quoteEntry, utils, "  Sadzba DPH: " + vatRatePercentage + "%");

            quoteEntry.set(config.fields.vatRate, vatRatePercentage);

            var baseForVat = totalFromParts + transportPrice + massTransferPrice;
            var vatAmount = baseForVat * (vatRatePercentage / 100);

            addDebug(quoteEntry, utils, "  Základ pre DPH: " + utils.formatMoney(baseForVat));
            addDebug(quoteEntry, utils, "  ✅ DPH: " + utils.formatMoney(vatAmount));

            quoteEntry.set(config.fields.vat, vatAmount);

            // STEP 5: Calculate total with VAT
            addDebug(quoteEntry, utils, "\n✅ KROK 5: Celková suma");
            var totalWithVat = baseForVat + vatAmount;

            addDebug(quoteEntry, utils, "  Celkom z dielov:     " + utils.formatMoney(totalFromParts));
            addDebug(quoteEntry, utils, "  Doprava:             " + utils.formatMoney(transportPrice));
            addDebug(quoteEntry, utils, "  Presun hmôt:         " + utils.formatMoney(massTransferPrice));
            addDebug(quoteEntry, utils, "  Hmotnosť materiálu:  " + materialWeight.toFixed(3) + " t");
            addDebug(quoteEntry, utils, "  " + "-".repeat(50));
            addDebug(quoteEntry, utils, "  Celkom (bez DPH):    " + utils.formatMoney(baseForVat));
            addDebug(quoteEntry, utils, "  DPH:                 " + utils.formatMoney(vatAmount));
            addDebug(quoteEntry, utils, "  " + "-".repeat(50));
            addDebug(quoteEntry, utils, "  ✅ CELKOM S DPH:      " + utils.formatMoney(totalWithVat));

            quoteEntry.set(config.fields.total, baseForVat);
            quoteEntry.set(config.fields.totalWithVat, totalWithVat);

            addDebug(quoteEntry, utils, "\n🎉 === KONIEC CenovePonuky.calculateQuote v" + MODULE_INFO.version + " ===");

            return {
                success: true,
                totalFromParts: totalFromParts,
                transportPrice: transportPrice,
                massTransferPrice: massTransferPrice,
                materialWeight: materialWeight,
                expectedKm: expectedKm,
                baseForVat: baseForVat,
                vatAmount: vatAmount,
                totalWithVat: totalWithVat,
                subcontractsTotal: subcontractsInfo.totalSubcontracts
            };

        } catch (error) {
            var errorMsg = "Kritická chyba v CenovePonuky.calculateQuote: " + error.toString();
            if (options.utils) {
                addError(quoteEntry, options.utils, errorMsg, "calculateQuote", error);
            }
            return {
                success: false,
                error: errorMsg
            };
        }
    }

    // ==============================================
    // PUBLIC API EXPORT
    // ==============================================

    return {
        // Module info
        info: MODULE_INFO,
        version: MODULE_INFO.version,

        // Main function
        calculateQuote: calculateQuote

        // Future functions:
        // - validateQuote
        // - createOrder (from quote)
        // - calculatePartPrice
    };

})();

// ==============================================
// AUTO-EXPORT INFO ON LOAD
// ==============================================

if (typeof log !== 'undefined') {
    log("✅ " + CenovePonuky.info.name + " v" + CenovePonuky.version + " loaded (" + CenovePonuky.info.status + ")");
    log("   📋 Extracted from: " + CenovePonuky.info.extractedFrom + " (" + CenovePonuky.info.extractedLines + " lines)");
}
