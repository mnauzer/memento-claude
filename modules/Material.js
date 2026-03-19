// ==============================================
// LIBRARY MODULE - Materiál (Inventory/Materials)
// Verzia: 0.1.0 | Dátum: 2026-03-19 | Autor: ASISTANTO
// ==============================================
// 📋 PURPOSE:
//    - Reusable module for Material/Inventory operations
//    - Calculate material receipts and stock levels
//    - Handle VAT calculations for purchases
//    - Manage bulk price updates
//    - Track material usage and costs
//    - Support material requisitions
// ==============================================
// 🔧 DEPENDENCIES:
//    - MementoUtils v7.0+
//    - MementoConfig (central configuration)
//    - MementoVAT (VAT calculations)
//    - MementoBusiness (business logic)
// ==============================================
// 📖 USAGE:
//    // Calculate receipt total
//    var result = Material.calculateReceipt(entry(), {
//        includeVAT: true
//    });
//
//    // Update stock level
//    var stock = Material.updateStock(entry(), {
//        quantity: 10,
//        operation: "add" // or "subtract"
//    });
// ==============================================
// 📚 DOCUMENTATION:
//    See modules/docs/Material.md for complete field reference
// ==============================================

var Material = (function() {
    'use strict';

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "Material",
        version: "0.1.0",
        author: "ASISTANTO",
        description: "Material inventory and stock management module",
        library: "Materiál",
        status: "initial" // initial, active, stable
    };

    // ==============================================
    // CONFIGURATION
    // ==============================================

    var DEFAULT_CONFIG = {
        fields: {
            // Core fields
            name: "Názov",
            code: "Kód",
            category: "Kategória",
            unit: "Jednotka",

            // Pricing
            price: "Cena",
            priceWithVAT: "Cena s DPH",
            priceWithoutVAT: "Cena bez DPH",
            vatRate: "Sadzba DPH",

            // Stock
            stockQuantity: "Skladová zásoba",
            minStock: "Minimálna zásoba",
            maxStock: "Maximálna zásoba",

            // Receipts
            receiptQuantity: "Množstvo",
            receiptDate: "Dátum prijatia",
            supplier: "Dodávateľ",

            // Costs
            totalCost: "Celková suma",
            averageCost: "Priemerná cena",

            // Debug fields
            debugLog: "Debug_Log",
            errorLog: "Error_Log",
            info: "info"
        },
        constants: {
            VAT_RATE: 0.20,                    // 20% VAT
            DEFAULT_UNIT: "ks",                // Default unit
            OPERATION_ADD: "add",
            OPERATION_SUBTRACT: "subtract",
            OPERATION_SET: "set"
        }
    };

    // ==============================================
    // PRIVATE HELPER FUNCTIONS
    // ==============================================

    function getConfig() {
        if (typeof MementoConfig !== 'undefined') {
            return MementoConfig.getConfig();
        }
        return null;
    }

    function addDebug(entry, message, icon) {
        if (typeof MementoUtils !== 'undefined' && MementoUtils.addDebug) {
            MementoUtils.addDebug(entry, message, icon);
        } else if (typeof log !== 'undefined') {
            log(message);
        }
    }

    function addError(entry, message, functionName, error) {
        if (typeof MementoUtils !== 'undefined' && MementoUtils.addError) {
            MementoUtils.addError(entry, message, functionName, error);
        } else if (typeof log !== 'undefined') {
            log("ERROR in " + functionName + ": " + message + " | " + error);
        }
    }

    function addInfo(entry, message, data, scriptInfo) {
        if (typeof MementoUtils !== 'undefined' && MementoUtils.addInfo) {
            MementoUtils.addInfo(entry, message, data, scriptInfo);
        }
    }

    function mergeConfig(userConfig) {
        if (!userConfig) return DEFAULT_CONFIG;

        var merged = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

        if (userConfig.fields) {
            for (var key in userConfig.fields) {
                if (userConfig.fields.hasOwnProperty(key)) {
                    merged.fields[key] = userConfig.fields[key];
                }
            }
        }

        if (userConfig.constants) {
            for (var key in userConfig.constants) {
                if (userConfig.constants.hasOwnProperty(key)) {
                    merged.constants[key] = userConfig.constants[key];
                }
            }
        }

        return merged;
    }

    // ==============================================
    // PUBLIC API - PLACEHOLDER FUNCTIONS
    // ==============================================

    /**
     * Calculate material receipt totals
     *
     * @param {Entry} entry - Material receipt entry object
     * @param {Object} options - Configuration options
     *   - includeVAT: boolean (default: true)
     *   - updateStock: boolean (default: true) - update stock levels
     * @returns {Object} Result object with calculated totals
     *
     * @example
     * var result = Material.calculateReceipt(entry(), {
     *     includeVAT: true,
     *     updateStock: true
     * });
     * // Returns: { success: true, total: 120, totalWithVAT: 144, vat: 24 }
     */
    function calculateReceipt(entry, options) {
        try {
            var config = mergeConfig(options && options.config);
            var includeVAT = (options && typeof options.includeVAT !== 'undefined') ? options.includeVAT : true;
            var updateStock = (options && typeof options.updateStock !== 'undefined') ? options.updateStock : true;

            addDebug(entry, "Material v" + MODULE_INFO.version + " - calculateReceipt started", "info");

            // TODO: Implement receipt calculation logic
            // 1. Get quantity and unit price
            // 2. Calculate subtotal = quantity × price
            // 3. Apply VAT if includeVAT
            // 4. Calculate totals
            // 5. If updateStock, update material stock level
            // 6. Update entry fields
            // 7. Log results

            return {
                success: true,
                message: "Function not yet implemented - placeholder",
                data: {
                    total: 0,
                    totalWithVAT: 0,
                    totalWithoutVAT: 0,
                    vat: 0
                }
            };
        } catch (error) {
            addError(entry, "Error in calculateReceipt", "calculateReceipt", error);
            return {
                success: false,
                error: error.toString()
            };
        }
    }

    /**
     * Update material stock level
     *
     * @param {Entry} materialEntry - Material entry object
     * @param {Object} options - Configuration options
     *   - quantity: number (required) - quantity to add/subtract/set
     *   - operation: "add" | "subtract" | "set" (default: "add")
     *   - reason: string (optional) - reason for stock change
     * @returns {Object} Stock update result
     *
     * @example
     * var result = Material.updateStock(materialEntry, {
     *     quantity: 10,
     *     operation: "add"
     * });
     */
    function updateStock(materialEntry, options) {
        try {
            var config = mergeConfig(options && options.config);
            var quantity = options && options.quantity;
            var operation = (options && options.operation) || config.constants.OPERATION_ADD;

            addDebug(materialEntry, "Material - updateStock started", "info");

            // TODO: Implement stock update
            // 1. Get current stock level
            // 2. Apply operation (add/subtract/set)
            // 3. Validate result (not negative)
            // 4. Update stock field
            // 5. Check min/max thresholds
            // 6. Log change
            // 7. Return new stock level

            return {
                success: true,
                oldStock: 0,
                newStock: 0,
                operation: operation,
                quantity: quantity
            };
        } catch (error) {
            addError(materialEntry, "Error in updateStock", "updateStock", error);
            return {
                success: false,
                error: error.toString()
            };
        }
    }

    /**
     * Bulk update material prices
     *
     * @param {Array<Entry>} materialEntries - Array of material entries
     * @param {Object} options - Configuration options
     *   - priceField: string (field to update)
     *   - adjustmentPercent: number (e.g., 10 for +10%, -5 for -5%)
     *   - newVATRate: number (optional) - new VAT rate to apply
     * @returns {Object} Bulk update result
     *
     * @example
     * var result = Material.bulkUpdatePrices(materials, {
     *     priceField: "Cena",
     *     adjustmentPercent: 10
     * });
     */
    function bulkUpdatePrices(materialEntries, options) {
        try {
            // TODO: Implement bulk price update
            // 1. Validate inputs
            // 2. For each material:
            //    - Get current price
            //    - Apply adjustment percentage
            //    - Recalculate VAT if needed
            //    - Update entry
            // 3. Log changes
            // 4. Return summary

            return {
                success: true,
                message: "Function not yet implemented - placeholder",
                updated: 0,
                failed: 0
            };
        } catch (error) {
            return {
                success: false,
                error: error.toString()
            };
        }
    }

    /**
     * Calculate average material cost
     *
     * @param {Entry} materialEntry - Material entry object
     * @param {Object} options - Configuration options
     *   - period: string (optional) - time period for calculation
     * @returns {Object} Average cost result
     */
    function calculateAverageCost(materialEntry, options) {
        try {
            addDebug(materialEntry, "Material - calculateAverageCost started", "info");

            // TODO: Implement average cost calculation
            // 1. Get all receipts for this material
            // 2. Filter by period if specified
            // 3. Calculate weighted average: Σ(price × quantity) / Σ(quantity)
            // 4. Update material entry
            // 5. Return result

            return {
                success: true,
                averageCost: 0,
                receiptsCount: 0
            };
        } catch (error) {
            addError(materialEntry, "Error in calculateAverageCost", "calculateAverageCost", error);
            return {
                success: false,
                error: error.toString()
            };
        }
    }

    /**
     * Validate material entry
     *
     * @param {Entry} entry - Memento entry object
     * @param {Array<string>} requiredFields - Required field names (optional)
     * @returns {Object} Validation result
     */
    function validateEntry(entry, requiredFields) {
        try {
            var config = DEFAULT_CONFIG;
            var errors = [];

            var required = requiredFields || [
                config.fields.name,
                config.fields.code,
                config.fields.unit,
                config.fields.price
            ];

            // TODO: Implement validation
            // 1. Check all required fields present
            // 2. Validate code is unique
            // 3. Validate price is positive
            // 4. Validate stock quantities are non-negative
            // 5. Validate min <= max stock

            return {
                valid: true,
                errors: []
            };
        } catch (error) {
            return {
                valid: false,
                errors: [error.toString()]
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

        // Main functions
        calculateReceipt: calculateReceipt,
        updateStock: updateStock,
        bulkUpdatePrices: bulkUpdatePrices,
        calculateAverageCost: calculateAverageCost,
        validateEntry: validateEntry

        // Additional functions to be added:
        // - checkStockThresholds: Alert for low/high stock
        // - generateStockReport: Create stock level report
        // - calculateMaterialUsage: Track material consumption
        // - forecastDemand: Predict future material needs
        // - optimizeOrderQuantity: Calculate optimal order quantity
    };

})();

// ==============================================
// AUTO-EXPORT INFO ON LOAD
// ==============================================

if (typeof log !== 'undefined') {
    log("✅ " + Material.info.name + " v" + Material.version + " loaded (" + Material.info.status + ")");
}
