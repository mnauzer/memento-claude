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
    
    var version = "7.0";
    
    // ==============================================
    // LAZY LOADING MODULOV
    // ==============================================
    
    var modules = {
        config: null,
        core: null,
        ai: null,
        telegram: null,
        business: null
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
        
        getIcon: function(name) {
            loadModule('config');
            return modules.config ? modules.config.getIcon(name) : "";
        },
        
        // === CORE FUNKCIE (vždy dostupné) ===
        
        // Logging
        addDebug: lazyCall('core', 'addDebug'),
        addError: lazyCall('core', 'addError'),
        addInfo: lazyCall('core', 'addInfo'),
        clearLogs: lazyCall('core', 'clearLogs'),
        
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

        
        // Validácia
        validateRequiredFields: lazyCall('core', 'validateRequiredFields'),
        
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


        // Notifikácie
        getLinkedNotifications: lazyCall('core', 'getLinkedNotifications'),
        linkNotificationToSource: lazyCall('core', 'linkNotificationToSource'),
        deleteNotificationAndTelegram: lazyCall('core', 'deleteNotificationAndTelegram'),
        
        // Obligations
        createObligation: lazyCall('business', 'createObligation'),
        updateObligation: lazyCall('business', 'updateObligation'),
        findExistingObligations: lazyCall('business', 'findExistingObligations'),
        
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
        processEmployees: lazyCall('business', 'processEmployees'),

        
        // === HELPER FUNKCIE ===
        
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