// ==============================================
// MEMENTO LOG CAPTURE - AUTOMATIC LOG SHARING
// Verzia: 1.0.0 | Dátum: 2026-03-19 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
//    - Automatické zachytávanie logov do ASISTANTO Logs library
//    - Umožňuje Claude Code čítať logy cez MCP tools
//    - Eliminuje manuálne kopírovanie Debug_Log a Error_Log
//    - Reusable pattern pre všetky knižnice
// ==============================================
// 🔧 CHANGELOG v1.0.0:
//    - Prvá verzia modulu
//    - createLogEntry() - Vytvorenie log entry v ASISTANTO Logs
//    - captureLogsToEntry() - Presmerovanie logovania do log entry
//    - restoreOriginalLogging() - Obnovenie pôvodného logovania
//    - finalizeLogEntry() - Finálne uloženie a summary
//    - appendToField() - Helper pre append text do poľa
// ==============================================
// 📖 POUŽITIE:
//
//    // 1. Vytvor log entry na začiatku scriptu
//    var logEntry = MementoLogCapture.createLogEntry(
//        lib().title,
//        "Script Name",
//        "1.0.0"
//    );
//
//    // 2. Presmeruj všetky logy do log entry
//    MementoLogCapture.captureLogsToEntry(logEntry);
//
//    // 3. Spusti script logiku (všetky logy idú do logEntry)
//    try {
//        utils.addDebug(entry(), "Starting...", "start");
//        // ... business logic ...
//    } catch (error) {
//        utils.addError(entry(), error.toString(), "main", error);
//    }
//
//    // 4. Finalizuj log entry
//    MementoLogCapture.finalizeLogEntry(logEntry, true, {
//        recordsProcessed: 10,
//        errors: 0
//    });
//
//    // 5. Obnov pôvodné logovanie
//    MementoLogCapture.restoreOriginalLogging();
//
// ==============================================
// 🔗 ZÁVISLOSTI:
//    - MementoConfig (pre field names)
//    - MementoCore (pre logging functions - optional)
// ==============================================

var MementoLogCapture = (function() {
    'use strict';

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "MementoLogCapture",
        version: "1.0.0",
        author: "ASISTANTO",
        description: "Automatic log capture to ASISTANTO Logs library for Claude MCP integration",
        dependencies: ["MementoConfig"],
        optionalDependencies: ["MementoCore"],
        provides: [
            "createLogEntry",
            "captureLogsToEntry",
            "restoreOriginalLogging",
            "finalizeLogEntry",
            "appendToField"
        ],
        status: "stable",
        changelog: "v1.0.0 - Initial release"
    };

    // ==============================================
    // PRIVATE VARIABLES
    // ==============================================

    var _config = null;
    var _originalAddDebug = null;
    var _originalAddError = null;
    var _originalAddInfo = null;
    var _captureTarget = null;

    // ==============================================
    // CONFIGURATION
    // ==============================================

    function getConfig() {
        if (!_config && typeof MementoConfig !== 'undefined') {
            _config = MementoConfig.getConfig();
        }
        return _config;
    }

    // ==============================================
    // HELPER FUNCTIONS
    // ==============================================

    /**
     * Append text to a field without overwriting existing content
     * @param {Entry} entry - Entry object
     * @param {string} fieldName - Field name
     * @param {string} text - Text to append
     */
    function appendToField(entry, fieldName, text) {
        if (!entry || !fieldName) return;

        try {
            var existing = entry.field(fieldName) || "";
            entry.set(fieldName, existing + text);
        } catch (e) {
            // Silent fail - cannot log error in logging function
        }
    }

    /**
     * Get current timestamp formatted for logs
     * @returns {string} Formatted timestamp
     */
    function getTimestamp() {
        return moment().format("DD.MM.YY HH:mm:ss");
    }

    /**
     * Get icon from config
     * @param {string} iconName - Icon name
     * @returns {string} Icon character
     */
    function getIcon(iconName) {
        var config = getConfig();
        if (!config || !config.icons) return "";
        return config.icons[iconName] || "";
    }

    // ==============================================
    // PUBLIC API - LOG ENTRY MANAGEMENT
    // ==============================================

    /**
     * Create a new log entry in ASISTANTO Logs library
     *
     * @param {string} libraryName - Source library name (e.g., "Dochádzka")
     * @param {string} scriptName - Script name (e.g., "Doch.Calc.Main")
     * @param {string} scriptVersion - Script version (e.g., "8.0.0")
     * @returns {Entry|null} Log entry object or null if failed
     *
     * @example
     * var logEntry = MementoLogCapture.createLogEntry(
     *     lib().title,
     *     "Doch.Calc.Main",
     *     "8.0.0"
     * );
     */
    function createLogEntry(libraryName, scriptName, scriptVersion) {
        try {
            // Find ASISTANTO Logs library
            var asistantoLogs = library("ASISTANTO Logs");
            if (!asistantoLogs) {
                // Cannot create log entry - library not found
                return null;
            }

            // Create new log entry
            var logEntry = asistantoLogs.create();

            // Set metadata fields
            logEntry.set("date", new Date());
            logEntry.set("library", libraryName || "Unknown");

            var scriptInfo = scriptName;
            if (scriptVersion) {
                scriptInfo += " v" + scriptVersion;
            }
            logEntry.set("script", scriptInfo);

            // Initialize log fields as empty
            logEntry.set("Debug_Log", "");
            logEntry.set("Error_Log", "");
            logEntry.set("info", "");

            // Set initial status
            logEntry.set("status", "🔄 Running");

            // Set user (current user)
            // Note: Memento doesn't have built-in user() function
            // This would need to be passed in or detected via other means

            return logEntry;

        } catch (e) {
            // Cannot log error - return null
            return null;
        }
    }

    /**
     * Redirect all logging functions to write to the log entry
     *
     * @param {Entry} logEntry - Log entry to capture logs into
     *
     * @example
     * var logEntry = MementoLogCapture.createLogEntry(lib().title, "Script", "1.0");
     * MementoLogCapture.captureLogsToEntry(logEntry);
     * // Now all utils.addDebug/addError/addInfo calls will write to logEntry
     */
    function captureLogsToEntry(logEntry) {
        if (!logEntry) return;

        _captureTarget = logEntry;

        // Check if MementoCore is available
        if (typeof MementoCore === 'undefined') {
            // Cannot capture - MementoCore not loaded
            return;
        }

        // Save original functions
        _originalAddDebug = MementoCore.addDebug;
        _originalAddError = MementoCore.addError;
        _originalAddInfo = MementoCore.addInfo;

        // Override addDebug to write to log entry
        MementoCore.addDebug = function(entry, message, iconName) {
            var icon = iconName ? getIcon(iconName) + " " : "";
            var timestamp = getTimestamp();
            var debugMessage = "[" + timestamp + "] " + icon + message + "\n";
            appendToField(_captureTarget, "Debug_Log", debugMessage);

            // Also log to original entry (optional - can be disabled)
            if (_originalAddDebug && entry) {
                _originalAddDebug.call(MementoCore, entry, message, iconName);
            }
        };

        // Override addError to write to log entry
        MementoCore.addError = function(entry, message, source, error) {
            var timestamp = getTimestamp();
            var errorIcon = getIcon("error");

            var errorMessage = "[" + timestamp + "] " + errorIcon + " ERROR: " + message;
            if (source) {
                errorMessage += "\nSource: " + source;
            }
            if (error && error.stack) {
                errorMessage += "\nStack trace: " + error.stack;
            }
            errorMessage += "\n\n";

            appendToField(_captureTarget, "Error_Log", errorMessage);

            // Also log to original entry (optional)
            if (_originalAddError && entry) {
                _originalAddError.call(MementoCore, entry, message, source, error);
            }
        };

        // Override addInfo to write to log entry
        MementoCore.addInfo = function(entry, message, data, metadata) {
            var timestamp = getTimestamp();
            var infoMessage = "[" + timestamp + "] " + message;

            if (data) {
                infoMessage += "\nData: " + JSON.stringify(data, null, 2);
            }

            if (metadata) {
                infoMessage += "\nMetadata: " + JSON.stringify(metadata, null, 2);
            }

            infoMessage += "\n\n";

            appendToField(_captureTarget, "info", infoMessage);

            // Also log to original entry (optional)
            if (_originalAddInfo && entry) {
                _originalAddInfo.call(MementoCore, entry, message, data, metadata);
            }
        };
    }

    /**
     * Restore original logging functions
     *
     * Call this at the end of your script to restore normal logging behavior
     *
     * @example
     * MementoLogCapture.restoreOriginalLogging();
     */
    function restoreOriginalLogging() {
        if (typeof MementoCore === 'undefined') return;

        if (_originalAddDebug) {
            MementoCore.addDebug = _originalAddDebug;
        }
        if (_originalAddError) {
            MementoCore.addError = _originalAddError;
        }
        if (_originalAddInfo) {
            MementoCore.addInfo = _originalAddInfo;
        }

        _originalAddDebug = null;
        _originalAddError = null;
        _originalAddInfo = null;
        _captureTarget = null;
    }

    /**
     * Finalize log entry with summary and status
     *
     * @param {Entry} logEntry - Log entry to finalize
     * @param {boolean} success - Whether script succeeded
     * @param {object} summary - Summary data (recordsProcessed, errors, etc.)
     *
     * @example
     * MementoLogCapture.finalizeLogEntry(logEntry, true, {
     *     recordsProcessed: 10,
     *     errors: 0,
     *     duration: "0.5s"
     * });
     */
    function finalizeLogEntry(logEntry, success, summary) {
        if (!logEntry) return;

        try {
            // Set final status
            var status = success ? "✅ Success" : "❌ Error";
            var errorLog = logEntry.field("Error_Log") || "";
            if (errorLog.trim().length > 0) {
                status = "❌ Error";
            }
            logEntry.set("status", status);

            // Add summary to info field
            if (summary) {
                var summaryText = "\n\n=== SUMMARY ===\n";
                for (var key in summary) {
                    if (summary.hasOwnProperty(key)) {
                        summaryText += key + ": " + summary[key] + "\n";
                    }
                }
                appendToField(logEntry, "info", summaryText);
            }

            // No need to explicitly save - Memento auto-saves

        } catch (e) {
            // Silent fail
        }
    }

    // ==============================================
    // PUBLIC API EXPORT
    // ==============================================

    return {
        // Module info
        MODULE_INFO: MODULE_INFO,
        version: MODULE_INFO.version,

        // Public functions
        createLogEntry: createLogEntry,
        captureLogsToEntry: captureLogsToEntry,
        restoreOriginalLogging: restoreOriginalLogging,
        finalizeLogEntry: finalizeLogEntry,
        appendToField: appendToField
    };
})();

// ==============================================
// MODULE EXPORT VERIFICATION
// ==============================================

if (typeof MementoLogCapture === 'undefined') {
    throw new Error("❌ MementoLogCapture module failed to load!");
}
