// ==============================================
// MEMENTOUTILS - Hlavný agregátor modulov
// Verzia: 8.0.0 | Dátum: 2026-03-19 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
//    - Jednotný prístupový bod pre všetky moduly
//    - Agreguje funkcie z Core, AI, Business, GPS, RecordTracking, IDConflictResolver
//    - Pridáva CONFIG z MementoConfig
//    - Lazy loading pre asynchrónne načítanie
//    - ⚠️ NEOBSAHUJE Telegram (circular dependency - import priamo)
// ==============================================
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
        version: "8.0.0",
        author: "ASISTANTO",
        description: "Universal aggregator for all core modules with lazy loading",
        dependencies: ["MementoCore", "MementoConfig"],
        optionalDependencies: [
            "MementoBusiness", "MementoAI", "MementoGPS", "MementoRecordTracking",
            "MementoIDConflictResolver", "MementoTime", "MementoDate",
            "MementoValidation", "MementoFormatting", "MementoCalculations"
        ],
        provides: [
            "All functions from aggregated modules",
            "Lazy loading pattern",
            "Single import point for scripts"
        ],
        aggregates: [
            "config", "core", "ai", "business", "gps", "recordTracking", "idConflictResolver",
            "time", "date", "validation", "formatting", "calculations"
        ],
        notAggregated: ["MementoTelegram - must be imported directly to avoid circular dependency"],
        status: "stable",
        breaking: "v8.0.0 - Added new focused modules (Time, Date, Validation, Formatting, Calculations). MementoBusiness v8.0.0 is breaking."
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
                config: modules.config ? modules.config.version : "N/A",
                core: modules.core ? modules.core.version : "N/A",
                ai: modules.ai ? modules.ai.version : "N/A",
                // telegram: NOT AGGREGATED (circular dependency - import directly)
                business: modules.business ? modules.business.version : "N/A",
                gps: modules.gps ? modules.gps.version : "N/A",
                recordTracking: modules.recordTracking ? modules.recordTracking.version : "N/A",
                idConflictResolver: modules.idConflictResolver ? modules.idConflictResolver.version : "N/A"
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
         * @param {Entry} entry - Kam zapísať debug info
         */
        debugModules: function(entry) {
            var status = "=== MEMENTOUTILS STATUS ===\n";
            status += "Verzia: " + version + "\n\n";
            
            status += "NAČÍTANÉ MODULY:\n";
            var loaded = this.getLoadedModules();
            for (var module in loaded) {
                status += "• " + module + ": " + loaded[module] + "\n";
            }
            
            if (entry && modules.core) {
                modules.core.addDebug(entry, status);
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
            return modules.time || null;
        },

        // === DATE MODULE ===
        get date() {
            loadModule('date');
            return modules.date || null;
        },

        // === VALIDATION MODULE ===
        get validation() {
            loadModule('validation');
            return modules.validation || null;
        },

        // === FORMATTING MODULE ===
        get formatting() {
            loadModule('formatting');
            return modules.formatting || null;
        },

        // === CALCULATIONS MODULE ===
        get calculations() {
            loadModule('calculations');
            return modules.calculations || null;
        }
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