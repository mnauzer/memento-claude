// ==============================================
// MEMENTOUTILS - Universal Module Aggregator
// Verzia: 8.1.0 | Dátum: 2026-03-19 | Autor: ASISTANTO
// Predchádzajúca verzia: MementoUtils7.js v8.1.0 (filename only changed)
// ==============================================
// 📋 PURPOSE:
//    - Single import point for all Memento modules
//    - Lazy loading pattern for optimal performance
//    - Version compatibility checking
//    - Comprehensive module documentation
//    - Helpful error messages
// ==============================================
// 🎯 WHAT'S AGGREGATED:
//
// Core Foundation (ALWAYS REQUIRED):
//    ✅ MementoConfig v7.1+    → utils.config (central configuration)
//    ✅ MementoCore v7.6+      → utils.core (logging, field access, validation)
//
// Business Logic:
//    ✅ MementoBusiness v8.0+  → utils.business (high-level workflows)
//
// Focused Utility Modules (NEW in v8.0):
//    ✅ MementoTime v1.1+      → utils.time (time rounding, calculations)
//    ✅ MementoDate v1.0+      → utils.date (Slovak calendar, holidays)
//    ✅ MementoValidation v1.0+ → utils.validation (field validation, rules)
//    ✅ MementoFormatting v1.0+ → utils.formatting (money, duration, markdown)
//    ✅ MementoCalculations v1.0+ → utils.calculations (wages, overtime, VAT)
//
// Specialized Modules:
//    ✅ MementoAI v7.1+        → utils.ai (OpenAI, Claude API)
//    ✅ MementoGPS v1.1+       → utils.gps (GPS routing, OSRM)
//    ✅ MementoRecordTracking v1.1+ → utils.recordTracking (record lifecycle)
//    ✅ MementoIDConflictResolver v1.1+ → utils.idConflictResolver (ID conflicts)
//
// ==============================================
// ⚠️ NOT AGGREGATED (import separately):
//
//    ❌ MementoTelegram v8.2+ - Circular dependency, must import directly:
//       var telegram = typeof MementoTelegram !== 'undefined' ? MementoTelegram : null;
//
//    ❌ MementoSync v1.1+ - Specialized, import on demand
//
//    ❌ MementoVAT v1.1+ - Deprecated, use MementoCalculations.calculateVAT()
//
//    ❌ MementoAutoNumber v1.1+ - Use MementoBusiness.generateNextNumber()
//
// ==============================================
// 📖 USAGE EXAMPLES:
//
// Basic usage (single import):
//    var utils = MementoUtils;
//    utils.addDebug(entry, "Hello from utils!");
//
// Access aggregated modules:
//    utils.time.roundToQuarterHour(time, "nearest");
//    utils.date.isWeekend(today);
//    utils.formatting.formatMoney(1250);
//    utils.calculations.calculateDailyWage(8.5, 12);
//
// Import Telegram separately:
//    var telegram = typeof MementoTelegram !== 'undefined' ? MementoTelegram : null;
//    if (telegram) {
//        telegram.sendMessage(...);
//    }
//
// Check module availability:
//    if (utils.validation) {
//        var result = utils.validation.validateTime(timeValue);
//    }
//
// ==============================================
// 🔧 MIGRATION FROM v7 TO v8:
//
// OLD (v7):
//    utils.formatMoney(1250);           // Direct function
//    utils.calculateWorkHours(s, e);    // From Business
//    utils.isWeekend(date);             // From Core
//
// NEW (v8 - PREFERRED):
//    utils.formatting.formatMoney(1250);           // Via Formatting module
//    utils.calculations.calculateWorkHours(s, e);  // Via Calculations module
//    utils.date.isWeekend(date);                   // Via Date module
//
// OLD functions still work (backward compatible facade) but are deprecated.
//
// ==============================================
// 🔧 CHANGELOG v8.1.0:
//    - PRIDANÉ: Comprehensive documentation (what's aggregated vs not)
//    - PRIDANÉ: checkDependencies() function for version checking
//    - PRIDANÉ: Helpful error messages in module getters
//    - IMPROVED: Header documentation with usage examples and migration guide
//    - Phase 4: Complete MementoUtils Aggregator COMPLETE
// 🔧 CHANGELOG v8.0.0 (BREAKING):
//    - PRIDANÉ: 5 nových focused modulov (Time, Date, Validation, Formatting, Calculations)
//    - MementoBusiness v8.0.0 (refactorovaný z 3,942 na 1,050 riadkov)
//    - Nové gettery: utils.time, utils.date, utils.validation, utils.formatting, utils.calculations
//    - Phase 3B: Split MementoBusiness COMPLETE
// 🔧 CHANGELOG v7.8.0:
//    - ODSTRÁNENÉ: MementoTelegram z aggregation (circular dependency fix)
//    - Telegram musí byť importovaný priamo v scriptoch
//    - Updated MODULE_INFO to reflect changes
//    - Phase 2: Break Circular Dependencies COMPLETE
// 🔧 CHANGELOG v7.7.0:
//    - PRIDANÉ: MODULE_INFO pre verziovanie a dependency tracking
//    - Pripravené pre Phase 1 core refactoring
//    - Updated validateInputData delegation to support new array-based pattern
// 🔧 CHANGELOG v7.4.0:
//    - Pridaný MementoIDConflictResolver modul pre riešenie ID konfliktov
//    - Exportované funkcie: checkAndResolveIDConflict, findMaxID, idExists
//    - Podpora pre team verziu Memento Database
// 🔧 CHANGELOG v7.3.0:
//    - Pridaný MementoRecordTracking modul pre sledovanie záznamov
//    - Exportované funkcie: setEditMode, setPrintMode, setDebugMode
//    - trackRecordCreation, trackRecordModification
//    - initializeNewRecord, processRecordUpdate
// 🔧 CHANGELOG v7.2.0:
//    - Pridaná funkcia generateNextNumber pre automatické generovanie čísel záznamov
// 🔧 CHANGELOG v7.0:
//    - Odstránené všetky fallbacky
//    - Priamy a jednoduchý prístup
//    - Lazy loading pre všetky moduly
//    - Čisté API bez duplicít
// ==============================================

var MementoUtils = (function() {
    'use strict';

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "MementoUtils",
        version: "8.1.0",
        author: "ASISTANTO",
        description: "Universal aggregator with lazy loading, version checking, and comprehensive documentation",
        dependencies: ["MementoCore", "MementoConfig"],
        optionalDependencies: [
            "MementoBusiness", "MementoAI", "MementoGPS", "MementoRecordTracking",
            "MementoIDConflictResolver", "MementoTime", "MementoDate",
            "MementoValidation", "MementoFormatting", "MementoCalculations"
        ],
        provides: [
            "Single import point for all modules",
            "Lazy loading pattern",
            "Version compatibility checking",
            "Helpful error messages",
            "Backward compatible facade"
        ],
        aggregates: [
            "config", "core", "ai", "business", "gps", "recordTracking", "idConflictResolver",
            "time", "date", "validation", "formatting", "calculations"
        ],
        notAggregated: [
            "MementoTelegram - circular dependency (import directly)",
            "MementoSync - specialized (import on demand)",
            "MementoVAT - deprecated (use MementoCalculations.calculateVAT)",
            "MementoAutoNumber - deprecated (use MementoBusiness.generateNextNumber)"
        ],
        status: "stable",
        note: "Phase 4: Complete aggregator with comprehensive documentation and version checking"
    };

    var version = MODULE_INFO.version;
    
    // ==============================================
    // LAZY LOADING MODULOV
    // ==============================================
    
    var modules = {
        config: null,
        core: null,
        ai: null,
        // telegram: REMOVED - causes circular dependency (Telegram depends on Utils)
        business: null,
        gps: null,
        recordTracking: null,
        idConflictResolver: null,
        // Phase 3 - New focused modules
        time: null,
        date: null,
        validation: null,
        formatting: null,
        calculations: null
    };
    
    /**
     * Lazy loading pre moduly
     * Načítava moduly až pri prvom použití
     */
    function loadModule(moduleName) {
        switch(moduleName) {
            case 'config':
                if (!modules.config && typeof MementoConfig !== 'undefined') {
                    modules.config = MementoConfig;
                }
                break;
                
            case 'core':
                if (!modules.core && typeof MementoCore !== 'undefined') {
                    modules.core = MementoCore;
                }
                break;
                
            case 'ai':
                if (!modules.ai && typeof MementoAI !== 'undefined') {
                    modules.ai = MementoAI;
                }
                break;

            // case 'telegram': REMOVED - causes circular dependency
            // MementoTelegram must be imported directly, not aggregated

            case 'business':
                if (!modules.business && typeof MementoBusiness !== 'undefined') {
                    modules.business = MementoBusiness;
                }
                break;

            case 'gps':
                if (!modules.gps && typeof MementoGPS !== 'undefined') {
                    modules.gps = MementoGPS;
                }
                break;

            case 'recordTracking':
                if (!modules.recordTracking && typeof MementoRecordTracking !== 'undefined') {
                    modules.recordTracking = MementoRecordTracking;
                }
                break;

            case 'idConflictResolver':
                if (!modules.idConflictResolver && typeof MementoIDConflictResolver !== 'undefined') {
                    modules.idConflictResolver = MementoIDConflictResolver;
                }
                break;

            // Phase 3 - New focused modules
            case 'time':
                if (!modules.time && typeof MementoTime !== 'undefined') {
                    modules.time = MementoTime;
                }
                break;

            case 'date':
                if (!modules.date && typeof MementoDate !== 'undefined') {
                    modules.date = MementoDate;
                }
                break;

            case 'validation':
                if (!modules.validation && typeof MementoValidation !== 'undefined') {
                    modules.validation = MementoValidation;
                }
                break;

            case 'formatting':
                if (!modules.formatting && typeof MementoFormatting !== 'undefined') {
                    modules.formatting = MementoFormatting;
                }
                break;

            case 'calculations':
                if (!modules.calculations && typeof MementoCalculations !== 'undefined') {
                    modules.calculations = MementoCalculations;
                }
                break;
        }
    }
    
    /**
     * Načíta všetky dostupné moduly
     * NOTE: Telegram is NOT loaded here (circular dependency)
     */
    function loadAllModules() {
        loadModule('config');
        loadModule('core');
        loadModule('ai');
        // loadModule('telegram'); // REMOVED - circular dependency
        loadModule('business');
        loadModule('gps');
        loadModule('recordTracking');
        loadModule('idConflictResolver');
        // Phase 3 - New focused modules
        loadModule('time');
        loadModule('date');
        loadModule('validation');
        loadModule('formatting');
        loadModule('calculations');
    }

    /**
     * Helper function for version comparison
     * @param {string} version1 - Version string (e.g., "8.1.0")
     * @param {string} version2 - Version string (e.g., "8.0.0")
     * @returns {number} -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
     */
    function compareVersions(version1, version2) {
        if (!version1 || !version2) return 0;

        var v1parts = version1.split('.').map(function(x) { return parseInt(x, 10) || 0; });
        var v2parts = version2.split('.').map(function(x) { return parseInt(x, 10) || 0; });

        for (var i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
            var v1part = v1parts[i] || 0;
            var v2part = v2parts[i] || 0;

            if (v1part > v2part) return 1;
            if (v1part < v2part) return -1;
        }

        return 0;
    }

    /**
     * Check all module dependencies and versions
     * @param {boolean} silent - If true, don't log to console (default: false)
     * @returns {Object} {success: boolean, missing: Array, outdated: Array, available: Array}
     *
     * @example
     * var check = MementoUtils.checkDependencies();
     * if (!check.success) {
     *     dialog("Chýbajúce moduly", check.missing.join(", "), "OK");
     * }
     */
    function checkDependencies(silent) {
        silent = silent || false;

        // NOTE: These minimum versions reflect the v8.0 architecture refactoring.
        // Update only when breaking changes require higher versions.
        var required = {
            MementoConfig: "8.0.0",
            MementoCore: "8.0.0"
        };

        var recommended = {
            MementoBusiness: "8.0.0",
            MementoTime: "1.1.0",
            MementoDate: "1.0.0",
            MementoValidation: "1.0.0",
            MementoFormatting: "1.0.0",
            MementoCalculations: "1.0.0"
        };

        var missing = [];
        var outdated = [];
        var available = [];

        // Check required modules
        for (var moduleName in required) {
            var module = typeof window !== 'undefined' ? window[moduleName] : (typeof global !== 'undefined' ? global[moduleName] : undefined);

            if (!module) {
                missing.push(moduleName + " (required >= " + required[moduleName] + ")");
            } else {
                var moduleVersion = module.version || module.info && module.info.version || "unknown";
                if (moduleVersion !== "unknown" && compareVersions(moduleVersion, required[moduleName]) < 0) {
                    outdated.push(moduleName + " (need >= " + required[moduleName] + ", have " + moduleVersion + ")");
                } else {
                    available.push(moduleName + " v" + moduleVersion);
                }
            }
        }

        // Check recommended modules
        for (var recModuleName in recommended) {
            var recModule = typeof window !== 'undefined' ? window[recModuleName] : (typeof global !== 'undefined' ? global[recModuleName] : undefined);

            if (!recModule) {
                // Not an error, just recommended
                if (!silent) {
                    // Optional: could log warning
                }
            } else {
                var recModuleVersion = recModule.version || recModule.info && recModule.info.version || "unknown";
                if (recModuleVersion !== "unknown" && compareVersions(recModuleVersion, recommended[recModuleName]) < 0) {
                    outdated.push(recModuleName + " (recommend >= " + recommended[recModuleName] + ", have " + recModuleVersion + ")");
                } else {
                    available.push(recModuleName + " v" + recModuleVersion);
                }
            }
        }

        var success = missing.length === 0 && outdated.length === 0;

        // Log results if not silent
        if (!silent && typeof log !== 'undefined') {
            log("=== MementoUtils v" + version + " Dependency Check ===");
            if (missing.length > 0) {
                log("❌ MISSING MODULES:");
                for (var i = 0; i < missing.length; i++) {
                    log("  - " + missing[i]);
                }
            }
            if (outdated.length > 0) {
                log("⚠️ OUTDATED MODULES:");
                for (var j = 0; j < outdated.length; j++) {
                    log("  - " + outdated[j]);
                }
            }
            if (success) {
                log("✅ All dependencies OK (" + available.length + " modules available)");
            }
        }

        return {
            success: success,
            missing: missing,
            outdated: outdated,
            available: available
        };
    }

    /**
     * Wrapper pre lazy volanie funkcií
     * @param {string} moduleName - Názov modulu
     * @param {string} functionName - Názov funkcie
     * @returns {Function} Wrapped funkcia
     */
    function lazyCall(moduleName, functionName) {
        return function() {
            loadModule(moduleName);
            
            if (modules[moduleName] && typeof modules[moduleName][functionName] === 'function') {
                return modules[moduleName][functionName].apply(null, arguments);
            } else {
                // Fallback pre prípad že modul nie je dostupný
                if (moduleName === 'core') {
                    // Core funkcie by mali byť vždy dostupné
                    throw new Error("MementoCore." + functionName + " nie je dostupná!");
                }
                // Pre optional moduly vrátime null/undefined
                return null;
            }
        };
    }
    
    // ==============================================
    // PUBLIC API
    // ==============================================
    
    var api = {
        // Module metadata
        info: MODULE_INFO,
        version: version,

        // === CONFIG (priamy prístup) ===
        get config() {
            loadModule('config');
            return modules.config ? modules.config.getConfig() : {};
        },
        
        // Helper pre rýchly prístup ku konfiguráciám
        getConfig: function(path, defaultValue) {
            loadModule('config');
            return modules.config ? modules.config.get(path, defaultValue) : defaultValue;
        },
        
        getLibrary: function(name) {
            loadModule('config');
            return modules.config ? modules.config.getLibrary(name) : null;
        },
        
        getField: function(category, field) {
            loadModule('config');
            return modules.config ? modules.config.getField(category, field) : null;
        },
        
        // getIcon: function(name) {
        //     loadModule('config');
        //     return modules.config ? modules.config.getIcon(name) : "";
        // },
        
        // === CORE FUNKCIE (vždy dostupné) ===
        
        // Logging
        addDebug: lazyCall('core', 'addDebug'),
        addError: lazyCall('core', 'addError'),
        addInfo: lazyCall('core', 'addInfo'),
        clearLogs: lazyCall('core', 'clearLogs'),
        setEdit: lazyCall('core', 'setEdit'),
        setPrint: lazyCall('core', 'setPrint'),
        setDebug: lazyCall('core', 'setDebug'),
        setView: lazyCall('core', 'setView'),
        
        // Safe field access
        safeGet: lazyCall('core', 'safeGet'),
        safeSet: lazyCall('core', 'safeSet'),
        safeGetAttribute: lazyCall('core', 'safeGetAttribute'),
        safeSetAttribute: lazyCall('core', 'safeSetAttribute'),
        safeGetLinks: lazyCall('core', 'safeGetLinks'),
        safeGetLinksFrom: lazyCall('core', 'safeGetLinksFrom'),
        
        // Formátovanie
        formatDate: lazyCall('core', 'formatDate'),
        formatTime: lazyCall('core', 'formatTime'),
        formatMoney: lazyCall('core', 'formatMoney'),
        parseTimeToMinutes: lazyCall('core', 'parseTimeToMinutes'),
        roundToQuarter: lazyCall('core', 'roundToQuarter'),
        roundToQuarterHour: lazyCall('core', 'roundToQuarterHour'),
        roundTimeToQuarter: lazyCall('core', 'roundTimeToQuarter'),
        parseTimeInput: lazyCall('core', 'parseTimeInput'),
        convertDurationToHours: lazyCall('core', 'convertDurationToHours'),
        convertHoursToDuration: lazyCall('core', 'convertHoursToDuration'),
        convertHoursToTimeString: lazyCall('core', 'convertHoursToTimeString'),
        
        // Validácia
        validateRequiredFields: lazyCall('core', 'validateRequiredFields'),
        validateInputData: lazyCall('core', 'validateInputData'),
        
        // Utility
        getSettings: lazyCall('core', 'getSettings'),
        findEntryById: lazyCall('core', 'findEntryById'),
        getCurrentUser: lazyCall('core', 'getCurrentUser'),
        getDayNameSK: lazyCall('core', 'getDayNameSK'),
        setDayOfWeekField: lazyCall('core', 'setDayOfWeekField'),
        selectOsobaForm: lazyCall('core', 'selectOsobaForm'),
        getPersonCountForm: lazyCall('core', 'getPersonCountForm'),
        isHoliday: lazyCall('core', 'isHoliday'),
        isWeekend: lazyCall('core', 'isWeekend'),
        calculateEaster: lazyCall('core', 'calculateEaster'),
        findRecordIndex: lazyCall('core', 'findRecordIndex'),
        addRecordIcon: lazyCall('core', 'addRecordIcon'),
        removeRecordIcon: lazyCall('core', 'removeRecordIcon'),



        
        // Obligations
        createObligation: lazyCall('business', 'createObligation'),
        updateObligation: lazyCall('business', 'updateObligation'),
        findExistingObligations: lazyCall('business', 'findExistingObligations'),
        findLinkedObligations: lazyCall('business', 'findLinkedObligations'),
        
        // === AI FUNKCIE (ak je modul dostupný) ===
        
        // AI providers
        get AI_PROVIDERS() {
            loadModule('ai');
            return modules.ai ? modules.ai.AI_PROVIDERS : {};
        },
        
        getApiKey: lazyCall('ai', 'getApiKey'),
        httpRequest: lazyCall('ai', 'httpRequest'),
        callAI: lazyCall('ai', 'callAI'),
        analyzeImage: lazyCall('ai', 'analyzeImage'),
        
        // === TELEGRAM FUNKCIE (ak je modul dostupný) ===
        
        sendTelegramMessage: lazyCall('telegram', 'sendTelegramMessage'),
        deleteTelegramMessage: lazyCall('telegram', 'deleteTelegramMessage'),
        editTelegramMessage: lazyCall('telegram', 'editTelegramMessage'),
        createNotificationEntry: lazyCall('telegram', 'createNotificationEntry'),
        getTelegramGroup: lazyCall('telegram', 'getTelegramGroup'),
        sendToTelegramThread: lazyCall('telegram', 'sendToTelegramThread'),
        getBotToken:lazyCall('telegram', 'getBotToken'),
        // Skupiny a témy
        cleanupOldNotifications: lazyCall('telegram', 'cleanupOldNotifications'),
        createNotification: lazyCall('telegram', 'createNotification'),
        linkNotification: lazyCall('telegram', 'linkNotification'),
        //
        escapeMarkdown: lazyCall('telegram', 'escapeMarkdown'),
        createInlineKeyboard: lazyCall('telegram', 'createInlineKeyboard'),
        // Notifikácie

        getTelegramID: lazyCall('telegram','getTelegramID'),
        getTelegramFromOrder: lazyCall('telegram','getTelegramFromOrder'),
        isNewRecord: lazyCall('telegram','isNewRecord'),
        checkPermissions: lazyCall('telegram','checkPermissions'),
        updateStatus: lazyCall('telegram','updateStatus'),
        updateSourceEntryInfo: lazyCall('telegram','updateSourceEntryInfo'),
        sendToTelegram: lazyCall('telegram','sendToTelegram'),
        updateAfterSuccess: lazyCall('telegram','updateAfterSuccess'),
        getTelegramFromIndividual: lazyCall('telegram','getTelegramFromIndividual'),
        getTelegramFromGroup: lazyCall('telegram','getTelegramFromGroup'),
        detectFormatting: lazyCall('telegram','detectFormatting'),
        sendNotificationEntry: lazyCall('telegram','sendNotificationEntry'),
        createTelegramMessage: lazyCall('telegram','createTelegramMessage'),
                // Notifikácie
        getLinkedNotifications: lazyCall('telegram', 'getLinkedNotifications'),
        linkNotificationToSource: lazyCall('telegram', 'linkNotificationToSource'),
        deleteNotificationAndTelegram: lazyCall('telegram', 'deleteNotificationAndTelegram'),

        // === BUSINESS FUNKCIE (ak je modul dostupný) ===
        
        calculateWorkHours: lazyCall('business', 'calculateWorkHours'),
        formatEmployeeName: lazyCall('business', 'formatEmployeeName'),
        getEmployeeDetails: lazyCall('business', 'getEmployeeDetails'),
        findEmployeeByNick: lazyCall('business', 'findEmployeeByNick'),
        calculateDailyWage: lazyCall('business', 'calculateDailyWage'),
        getActiveEmployees: lazyCall('business', 'getActiveEmployees'),
        getEmployeeWageForDate: lazyCall('business', 'getEmployeeWageForDate'),
        findValidSalary: lazyCall('business', 'findValidSalary'),
        findValidHourlyRate: lazyCall('business', 'findValidHourlyRate'),
        calculateMonthlyStats: lazyCall('business', 'calculateMonthlyStats'),   
        showProcessingSummary: lazyCall('business', 'showProcessingSummary'),
        findValidWorkPrice: lazyCall('business', 'findValidWorkPrice'),
        findValidItemPrice: lazyCall('business', 'findValidItemPrice'),
        findValidMachinePrice: lazyCall('business', 'findValidMachinePrice'),
        processEmployees: lazyCall('business', 'processEmployees'),
        calculateProfitability: lazyCall('business', 'calculateProfitability'),
        getValidVatRate: lazyCall('business', 'getValidVatRate'),
        calculateWorkTime: lazyCall('business', 'calculateWorkTime'),

        // === MATERIAL FUNKCIE (nové) ===
        calculateAndUpdateMaterialPrices: lazyCall('business', 'calculateAndUpdateMaterialPrices'),
        detectAllPriceChanges: lazyCall('business', 'detectAllPriceChanges'),
        applyPriceRounding: lazyCall('business', 'applyPriceRounding'),
        createMaterialInfoRecord: lazyCall('business', 'createMaterialInfoRecord'),
        createOrUpdateMaterialPriceRecord: lazyCall('business', 'createOrUpdateMaterialPriceRecord'),

        // === DAILY REPORT FUNKCIE (nové) ===
        createOrUpdateDailyReport: lazyCall('business', 'createOrUpdateDailyReport'),

        // === UNIVERZÁLNA ARCHITEKTÚRA PRE VÝKAZY (nové) ===
        createOrUpdateReport: lazyCall('business', 'createOrUpdateReport'),
        validateReportData: lazyCall('business', 'validateReportData'),
        findExistingReport: lazyCall('business', 'findExistingReport'),
        createGenericReport: lazyCall('business', 'createGenericReport'),
        linkSourceToReport: lazyCall('business', 'linkSourceToReport'),
        updateReportSummary: lazyCall('business', 'updateReportSummary'),
        updateReportInfo: lazyCall('business', 'updateReportInfo'),
        createReportInfo: lazyCall('business', 'createReportInfo'),


        // === GPS FUNKCIE (ak je modul dostupný) ===
        calculateOSRMRoute: lazyCall('gps', 'calculateOSRMRoute'),
        calculateSegment: lazyCall('gps', 'calculateSegment'),
        calculateAirDistance: lazyCall('gps', 'calculateAirDistance'),
        calculateTotalRoute: lazyCall('gps', 'calculateTotalRoute'),
        extractGPSFromPlace: lazyCall('gps', 'extractGPSFromPlace'),    
        toRadians: lazyCall('gps', 'toRadians'),
        
        
        // === CORE - FARBY (ak je modul dostupný) ===

        
        // Funkcie pre farby
        setColor: lazyCall('core', 'setColor'),
        removeColor: lazyCall('core', 'removeColor'),
        getColor: lazyCall('core', 'getColor'),
        setColorByCondition:lazyCall('core', 'setColorByCondition'),
        convertToHex: lazyCall('core', 'convertToHex'),
        
        // === HELPER FUNKCIE ===
        getIcon: lazyCall('core', 'getIcon'),

        // Správa knižníc
        renumberLibraryRecords: lazyCall('core', 'renumberLibraryRecords'),

        /**
         * Získa informácie o načítaných moduloch
         * @returns {Object} Status modulov
         */
        getLoadedModules: function() {
            loadAllModules(); // Pokús sa načítať všetky

            return {
                config: modules.config ? (modules.config.version || modules.config.info && modules.config.info.version || "N/A") : "N/A",
                core: modules.core ? (modules.core.version || modules.core.info && modules.core.info.version || "N/A") : "N/A",
                ai: modules.ai ? (modules.ai.version || modules.ai.info && modules.ai.info.version || "N/A") : "N/A",
                // telegram: NOT AGGREGATED (circular dependency - import directly)
                business: modules.business ? (modules.business.version || modules.business.info && modules.business.info.version || "N/A") : "N/A",
                gps: modules.gps ? (modules.gps.version || modules.gps.info && modules.gps.info.version || "N/A") : "N/A",
                recordTracking: modules.recordTracking ? (modules.recordTracking.version || modules.recordTracking.info && modules.recordTracking.info.version || "N/A") : "N/A",
                idConflictResolver: modules.idConflictResolver ? (modules.idConflictResolver.version || modules.idConflictResolver.info && modules.idConflictResolver.info.version || "N/A") : "N/A",
                // Phase 3 - New focused modules
                time: modules.time ? (modules.time.version || modules.time.info && modules.time.info.version || "N/A") : "N/A",
                date: modules.date ? (modules.date.version || modules.date.info && modules.date.info.version || "N/A") : "N/A",
                validation: modules.validation ? (modules.validation.version || modules.validation.info && modules.validation.info.version || "N/A") : "N/A",
                formatting: modules.formatting ? (modules.formatting.version || modules.formatting.info && modules.formatting.info.version || "N/A") : "N/A",
                calculations: modules.calculations ? (modules.calculations.version || modules.calculations.info && modules.calculations.info.version || "N/A") : "N/A"
            };
        },
        
        /**
         * Kontrola závislostí
         * @param {Array} required - Zoznam potrebných modulov
         * @returns {Object} {success: boolean, missing: Array}
         */
        checkDependencies: function(required) {
            if (!required || !Array.isArray(required)) {
                return { success: true, missing: [] };
            }
            
            var missing = [];
            
            for (var i = 0; i < required.length; i++) {
                var moduleName = required[i];
                loadModule(moduleName);
                
                if (!modules[moduleName]) {
                    missing.push(moduleName);
                }
            }
            
            return {
                success: missing.length === 0,
                missing: missing
            };
        },
        
        /**
         * Debug helper - vypíše status všetkých modulov
         * @param {Entry} entry - Kam zapísať debug info (optional)
         * @param {boolean} detailed - Show detailed version check (default: false)
         */
        debugModules: function(entry, detailed) {
            detailed = detailed || false;

            var status = "=== MEMENTOUTILS v" + version + " STATUS ===\n\n";

            // Run comprehensive dependency check if detailed
            if (detailed) {
                var check = checkDependencies(true); // silent = true

                status += "DEPENDENCY CHECK:\n";
                if (check.success) {
                    status += "✅ All dependencies OK\n\n";
                } else {
                    if (check.missing.length > 0) {
                        status += "❌ MISSING:\n";
                        for (var i = 0; i < check.missing.length; i++) {
                            status += "  - " + check.missing[i] + "\n";
                        }
                    }
                    if (check.outdated.length > 0) {
                        status += "⚠️ OUTDATED:\n";
                        for (var j = 0; j < check.outdated.length; j++) {
                            status += "  - " + check.outdated[j] + "\n";
                        }
                    }
                    status += "\n";
                }

                status += "AVAILABLE MODULES (" + check.available.length + "):\n";
                for (var k = 0; k < check.available.length; k++) {
                    status += "  • " + check.available[k] + "\n";
                }
            } else {
                // Simple check (backward compatible)
                status += "NAČÍTANÉ MODULY:\n";
                var loaded = this.getLoadedModules();
                for (var module in loaded) {
                    status += "  • " + module + ": " + loaded[module] + "\n";
                }
            }

            if (entry && modules.core) {
                modules.core.addDebug(entry, status);
            } else if (typeof log !== 'undefined') {
                log(status);
            } else {
                message(status);
            }
        },
        
        /**
         * Vytvorí štandardný CONFIG pre script
         * @param {string} scriptName - Názov scriptu
         * @param {string} scriptVersion - Verzia scriptu
         * @returns {Object} Kompletný CONFIG objekt
         */
        createScriptConfig: function(scriptName, scriptVersion) {
            loadModule('config');

            var baseConfig = modules.config ? modules.config.getConfig() : {};

            return {
                scriptName: scriptName || "Unnamed Script",
                scriptVersion: scriptVersion || "1.0",
                debug: baseConfig.global ? baseConfig.global.debug : true,

                // Skopíruj všetky sekcie z MementoConfig
                libraries: baseConfig.libraries || {},
                fields: baseConfig.fields || {},
                attributes: baseConfig.attributes || {},
                constants: baseConfig.constants || {},
                icons: baseConfig.icons || {},
                global: baseConfig.global || {},
                defaults: baseConfig.defaults || {}
            };
        },

        // === DIALÓGY ===
        showErrorDialog: lazyCall('core', 'showErrorDialog'),
        showSuccessDialog: lazyCall('core', 'showSuccessDialog'),
        showInfoDialog: lazyCall('core', 'showInfoDialog'),

        // === PRICE LOOKUP ===
        findValidPrice: lazyCall('business', 'findValidPrice'),

        // === NUMBER GENERATION ===
        generateNextNumber: lazyCall('business', 'generateNextNumber'),

        // === RECORD TRACKING ===
        // View režimy
        setEditMode: lazyCall('recordTracking', 'setEditMode'),
        setPrintMode: lazyCall('recordTracking', 'setPrintMode'),
        setDebugMode: lazyCall('recordTracking', 'setDebugMode'),

        // Tracking vytvorenia a úpravy
        trackRecordCreation: lazyCall('recordTracking', 'trackRecordCreation'),
        trackRecordModification: lazyCall('recordTracking', 'trackRecordModification'),

        // Kombinované funkcie
        initializeNewRecord: lazyCall('recordTracking', 'initializeNewRecord'),
        processRecordUpdate: lazyCall('recordTracking', 'processRecordUpdate'),

        // === ID CONFLICT RESOLUTION ===
        // Detekcia a riešenie ID konfliktov (pre team verziu Memento Database)
        checkAndResolveIDConflict: lazyCall('idConflictResolver', 'checkAndResolveIDConflict'),
        findMaxID: lazyCall('idConflictResolver', 'findMaxID'),
        idExists: lazyCall('idConflictResolver', 'idExists'),

        // ==============================================
        // PHASE 3 - NEW FOCUSED MODULES (v8.0.0)
        // ==============================================

        // === TIME MODULE ===
        get time() {
            loadModule('time');
            if (!modules.time && typeof console !== 'undefined') {
                console.error("[MementoUtils] MementoTime not loaded. Load core/MementoTime.js (v1.1.0+) first.");
            }
            return modules.time || null;
        },

        // === DATE MODULE ===
        get date() {
            loadModule('date');
            if (!modules.date && typeof console !== 'undefined') {
                console.error("[MementoUtils] MementoDate not loaded. Load core/MementoDate.js (v1.0.0+) first.");
            }
            return modules.date || null;
        },

        // === VALIDATION MODULE ===
        get validation() {
            loadModule('validation');
            if (!modules.validation && typeof console !== 'undefined') {
                console.error("[MementoUtils] MementoValidation not loaded. Load core/MementoValidation.js (v1.0.0+) first.");
            }
            return modules.validation || null;
        },

        // === FORMATTING MODULE ===
        get formatting() {
            loadModule('formatting');
            if (!modules.formatting && typeof console !== 'undefined') {
                console.error("[MementoUtils] MementoFormatting not loaded. Load core/MementoFormatting.js (v1.0.0+) first.");
            }
            return modules.formatting || null;
        },

        // === CALCULATIONS MODULE ===
        get calculations() {
            loadModule('calculations');
            if (!modules.calculations && typeof console !== 'undefined') {
                console.error("[MementoUtils] MementoCalculations not loaded. Load core/MementoCalculations.js (v1.0.0+) first.");
            }
            return modules.calculations || null;
        },

        // === DEPENDENCY CHECKING (NEW in v8.1.0) ===
        /**
         * Check all module dependencies and versions
         * @param {boolean} silent - If true, don't log to console
         * @returns {Object} {success, missing, outdated, available}
         */
        checkAllDependencies: checkDependencies
    };
    
    // === INICIALIZÁCIA ===
    // Pokús sa načítať aspoň Core a Config pri štarte
    try {
        loadModule('config');
        loadModule('core');
    } catch (e) {
        // Ignoruj chyby pri inicializácii
    }
    
    return api;
})();