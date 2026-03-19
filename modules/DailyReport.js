// ==============================================
// DAILY REPORT MODULE - Daily Report Update Pattern
// Verzia: 1.0.0 | Dátum: 2026-03-19 | Autor: ASISTANTO
// ==============================================
// 📋 PURPOSE:
//    - Centralized daily report update logic
//    - Eliminates code duplication across 4 libraries
//    - Handles both direct and indirect daily report links
//    - Triggers recalculation in linked Daily Reports
// ==============================================
// 🔧 DEPENDENCIES:
//    - MementoUtils (for logging and field access)
//    - MementoConfig (for field names)
// ==============================================
// 📖 USAGE:
//    // Direct link (Dochádzka, Záznam prác)
//    DailyReportModule.updateLinkedReports(entry(), {
//        utils: MementoUtils,
//        directLinkField: "Denný report",
//        libraryName: "Dochádzka"
//    });
//
//    // Indirect link (Pokladňa cez Dochádzku)
//    DailyReportModule.updateLinkedReports(entry(), {
//        utils: MementoUtils,
//        indirectLinkField: "Pokladňa",
//        intermediateLinkField: "Denný report",
//        libraryName: "Pokladňa"
//    });
// ==============================================
// 🎯 ELIMINATES DUPLICATION IN:
//    - Doch.Update.DailyReport.js
//    - Pokl.Update.DailyReport.js
//    - Zazp.Update.DailyReport.js
//    - Knij.Update.DailyReport.js
// ==============================================

var DailyReportModule = (function() {
    'use strict';

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "DailyReportModule",
        version: "1.0.0",
        author: "ASISTANTO",
        description: "Daily Report update pattern for linked records"
    };

    // ==============================================
    // DEFAULT CONFIGURATION
    // ==============================================

    var DEFAULT_CONFIG = {
        utils: null,                    // MementoUtils instance (required)
        libraryName: "Unknown",         // Source library name (for logging)
        directLinkField: null,          // Direct link field name (e.g., "Denný report")
        indirectLinkField: null,        // Indirect link field (e.g., "Pokladňa")
        intermediateLinkField: null,    // Intermediate link field (e.g., "Denný report" in Dochádzka)
        modifiedDateField: null,        // Field to trigger update (default from config)
        logToEntry: true,               // Whether to log debug messages
        returnStats: true               // Whether to return update statistics
    };

    // ==============================================
    // PRIVATE HELPER FUNCTIONS
    // ==============================================

    /**
     * Merges user config with defaults
     * @private
     */
    function mergeConfig(userConfig) {
        if (!userConfig) {
            throw new Error("DailyReportModule: config is required");
        }

        var config = {};
        for (var key in DEFAULT_CONFIG) {
            config[key] = userConfig[key] !== undefined ? userConfig[key] : DEFAULT_CONFIG[key];
        }

        // Validate required fields
        if (!config.utils) {
            throw new Error("DailyReportModule: utils (MementoUtils) is required");
        }

        // Set modified date field from utils config if not provided
        if (!config.modifiedDateField && config.utils.getConfig) {
            var utilsConfig = config.utils.getConfig();
            config.modifiedDateField = utilsConfig.fields.common.modifiedDate || "Dátum úpravy";
        }

        return config;
    }

    /**
     * Adds debug log to entry if logging enabled
     * @private
     */
    function addDebug(entry, config, message, icon) {
        if (config.logToEntry && config.utils && config.utils.addDebug) {
            config.utils.addDebug(entry, message, icon || "info");
        }
    }

    /**
     * Adds error log to entry
     * @private
     */
    function addError(entry, config, message, functionName, error) {
        if (config.utils && config.utils.addError) {
            config.utils.addError(entry, message, functionName, error);
        }
    }

    /**
     * Gets linked entries safely
     * @private
     */
    function safeGetLinks(entry, fieldName, config) {
        if (!fieldName || !entry) return [];

        if (config.utils && config.utils.safeGetLinks) {
            return config.utils.safeGetLinks(entry, fieldName);
        }

        // Fallback
        try {
            var links = entry.field(fieldName);
            if (!links) return [];
            if (!Array.isArray(links) && typeof links === 'object' && links.length !== undefined) {
                // Array-like object (Memento linkToEntry)
                var result = [];
                for (var i = 0; i < links.length; i++) {
                    result.push(links[i]);
                }
                return result;
            }
            return Array.isArray(links) ? links : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Gets field value safely
     * @private
     */
    function safeGet(entry, fieldName, config) {
        if (!fieldName || !entry) return null;

        if (config.utils && config.utils.safeGet) {
            return config.utils.safeGet(entry, fieldName);
        }

        // Fallback
        try {
            return entry.field(fieldName);
        } catch (e) {
            return null;
        }
    }

    /**
     * Formats date for display
     * @private
     */
    function formatDate(date, config) {
        if (!date) return "N/A";

        if (config.utils && config.utils.formatDate) {
            return config.utils.formatDate(date);
        }

        // Fallback
        if (typeof moment !== 'undefined') {
            return moment(date).format("DD.MM.YYYY");
        }

        return date.toString();
    }

    // ==============================================
    // PUBLIC API - DAILY REPORT UPDATES
    // ==============================================

    /**
     * Updates all linked Daily Reports after source entry save
     *
     * Supports two patterns:
     * 1. Direct link: Entry -> Daily Report (Dochádzka, Záznam prác)
     * 2. Indirect link: Entry -> Intermediate -> Daily Report (Pokladňa)
     *
     * @param {Entry} sourceEntry - The entry that triggered the update
     * @param {Object} userConfig - Configuration object
     * @returns {Object} Statistics { success, updatedCount, errorCount, errors }
     *
     * @example
     * // Direct link (Dochádzka)
     * var result = DailyReportModule.updateLinkedReports(entry(), {
     *     utils: MementoUtils,
     *     directLinkField: "Denný report",
     *     libraryName: "Dochádzka"
     * });
     *
     * @example
     * // Indirect link (Pokladňa cez Dochádzku)
     * var result = DailyReportModule.updateLinkedReports(entry(), {
     *     utils: MementoUtils,
     *     indirectLinkField: "Pokladňa",
     *     intermediateLinkField: "Denný report",
     *     libraryName: "Pokladňa"
     * });
     */
    function updateLinkedReports(sourceEntry, userConfig) {
        try {
            var config = mergeConfig(userConfig);
            var stats = {
                success: true,
                updatedCount: 0,
                errorCount: 0,
                errors: []
            };

            addDebug(sourceEntry, config, "🔄 Spúšťam aktualizáciu Denných reportov po zmene v " + config.libraryName);

            var dailyReports = [];

            // ===========================================
            // PATTERN 1: DIRECT LINK
            // ===========================================
            if (config.directLinkField) {
                dailyReports = safeGetLinks(sourceEntry, config.directLinkField, config);

                if (!dailyReports || dailyReports.length === 0) {
                    addDebug(sourceEntry, config, "  ℹ️ Žiadne linknuté Denné reporty (priame prepojenie)");
                    return stats;
                }

                addDebug(sourceEntry, config, "  📊 Počet linknutých Denných reportov (priame): " + dailyReports.length);
            }

            // ===========================================
            // PATTERN 2: INDIRECT LINK
            // ===========================================
            else if (config.indirectLinkField && config.intermediateLinkField) {
                var intermediateRecords = safeGetLinks(sourceEntry, config.indirectLinkField, config);

                if (!intermediateRecords || intermediateRecords.length === 0) {
                    addDebug(sourceEntry, config, "  ℹ️ Žiadne linknuté záznamy (medzistupeň: " + config.indirectLinkField + ")");
                    return stats;
                }

                // Collect unique daily reports
                var dailyReportMap = {};

                for (var a = 0; a < intermediateRecords.length; a++) {
                    var intermediate = intermediateRecords[a];
                    var reportsFromIntermediate = safeGetLinks(intermediate, config.intermediateLinkField, config);

                    if (reportsFromIntermediate && reportsFromIntermediate.length > 0) {
                        for (var d = 0; d < reportsFromIntermediate.length; d++) {
                            var report = reportsFromIntermediate[d];
                            var reportId = safeGet(report, "ID", config);
                            if (reportId) {
                                dailyReportMap[reportId] = report;
                            }
                        }
                    }
                }

                var reportIds = Object.keys(dailyReportMap);

                if (reportIds.length === 0) {
                    addDebug(sourceEntry, config, "  ℹ️ Žiadne linknuté Denné reporty (nepriame prepojenie)");
                    return stats;
                }

                addDebug(sourceEntry, config, "  📊 Počet linknutých Denných reportov (nepriame): " + reportIds.length);

                // Convert map to array
                dailyReports = [];
                for (var i = 0; i < reportIds.length; i++) {
                    dailyReports.push(dailyReportMap[reportIds[i]]);
                }
            }

            // ===========================================
            // INVALID CONFIGURATION
            // ===========================================
            else {
                var errorMsg = "Neplatná konfigurácia: musíte zadať buď directLinkField alebo (indirectLinkField + intermediateLinkField)";
                addError(sourceEntry, config, errorMsg, "updateLinkedReports", new Error(errorMsg));
                stats.success = false;
                stats.errors.push(errorMsg);
                return stats;
            }

            // ===========================================
            // UPDATE DAILY REPORTS
            // ===========================================
            for (var j = 0; j < dailyReports.length; j++) {
                var dailyReport = dailyReports[j];
                var reportId = safeGet(dailyReport, "ID", config);
                var reportDate = formatDate(safeGet(dailyReport, "Dátum", config), config);

                try {
                    // Trigger recalculation by updating modified date
                    // This will trigger the Daily Report's After Save trigger
                    dailyReport.set(config.modifiedDateField, new Date());

                    addDebug(sourceEntry, config, "  ✅ Aktualizovaný Denný report #" + reportId + " (" + reportDate + ")");
                    stats.updatedCount++;

                } catch (error) {
                    var errMsg = "Chyba pri aktualizácii Denného reportu #" + reportId + ": " + error.toString();
                    addError(sourceEntry, config, errMsg, "updateLinkedReports", error);
                    stats.errorCount++;
                    stats.errors.push(errMsg);
                }
            }

            addDebug(sourceEntry, config, "✅ Dokončená aktualizácia " + stats.updatedCount + " Denných reportov");

            if (stats.errorCount > 0) {
                stats.success = false;
            }

            return config.returnStats ? stats : null;

        } catch (error) {
            addError(sourceEntry, userConfig, "Kritická chyba v DailyReportModule: " + error.toString(), "updateLinkedReports", error);
            return {
                success: false,
                updatedCount: 0,
                errorCount: 1,
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

        // Main API
        updateLinkedReports: updateLinkedReports
    };

})();

// ==============================================
// AUTO-EXPORT INFO ON LOAD
// ==============================================

if (typeof log !== 'undefined') {
    log("✅ DailyReportModule v" + DailyReportModule.version + " loaded successfully");
}
