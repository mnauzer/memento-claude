// ==============================================
// MEMENTOUTILS - Hlavný agregátor modulov
// Verzia: 7.0 | Dátum: August 2025 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
//    - Jednotný prístupový bod pre všetky moduly
//    - Agreguje funkcie z Core, AI, Telegram, Business
//    - Pridáva CONFIG z MementoConfig
//    - Lazy loading pre asynchrónne načítanie
// ==============================================
// 🔧 CHANGELOG v7.0:
//    - Odstránené všetky fallbacky
//    - Priamy a jednoduchý prístup
//    - Lazy loading pre všetky moduly
//    - Čisté API bez duplicít
// ==============================================

var MementoUtils = (function() {
    'use strict';
    
    var version = "7.1.0";  // Pridaná univerzálna architektúra pre výkazy
    
    // ==============================================
    // LAZY LOADING MODULOV
    // ==============================================
    
    var modules = {
        config: null,
        core: null,
        ai: null,
        telegram: null,
        business: null,
        gps: null

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
                
            case 'telegram':
                if (!modules.telegram && typeof MementoTelegram !== 'undefined') {
                    modules.telegram = MementoTelegram;
                }
                break;
                
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
        }
    }
    
    /**
     * Načíta všetky dostupné moduly
     */
    function loadAllModules() {
        loadModule('config');
        loadModule('core');
        loadModule('ai');
        loadModule('telegram');
        loadModule('business');
        loadModule('gps');
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
        selectOsobaForm: lazyCall('core', 'selectOsobaForm'),
        getPersonCountForm: lazyCall('core', 'getPersonCountForm'),
        isHoliday: lazyCall('core', 'isHoliday'),
        isWeekend: lazyCall('core', 'isWeekend'),
        calculateEaster: lazyCall('core', 'calculateEaster'),
        findRecordIndex: lazyCall('core', 'findRecordIndex'),



        
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
                telegram: modules.telegram ? modules.telegram.version : "N/A",
                business: modules.business ? modules.business.version : "N/A"
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
        showInfoDialog: lazyCall('core', 'showInfoDialog')
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