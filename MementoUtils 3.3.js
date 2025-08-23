// ==============================================
// MEMENTOUTILS - Hlavný agregátor všetkých modulov
// Verzia: 3.4 | Dátum: August 2025 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
//    - Agreguje všetky moduly do jedného API
//    - Zabezpečuje spätnú kompatibilitu
//    - Umožňuje jednoduchý import: var utils = MementoUtils;
// ==============================================
// 🔗 ZÁVISLOSTI:
//    - MementoCore.js (základné funkcie)
//    - MementoAI.js (AI integrácia)
//    - MementoTelegram.js (notifikácie)
//    - MementoBusiness.js (business logika)
// ==============================================
// 🔧 CHANGELOG v3.4:
//    - Opravené poradie deklarácie premenných (CONFIG undefined bug)
//    - Presunuté configAdapter a DEFAULT_CONFIG po definícii api objektu
//    - Pridané debug logy pre lepší troubleshooting
// ==============================================

var MementoUtils = (function() {
    'use strict';
    
    // ==============================================
    // IMPORT MODULOV
    // ==============================================
    
    // Kontrola dostupnosti modulov
    var modules = {
        core: typeof MementoCore !== 'undefined' ? MementoCore : null,
        ai: typeof MementoAI !== 'undefined' ? MementoAI : null,
        telegram: typeof MementoTelegram !== 'undefined' ? MementoTelegram : null,
        business: typeof MementoBusiness !== 'undefined' ? MementoBusiness : null
    };
    
    // Základná verzia ak chýbajú moduly
    if (!modules.core) {
        throw new Error("MementoCore.js is required!");
    }
    
    // ==============================================
    // AGREGOVANÉ API
    // ==============================================
    
    var api = {
        // Version info
        version: "3.4",
        moduleVersions: {
            core: modules.core ? modules.core.version : "N/A",
            ai: modules.ai ? modules.ai.version : "N/A",
            telegram: modules.telegram ? modules.telegram.version : "N/A",
            business: modules.business ? modules.business.version : "N/A"
        },
        
        // Configuration - z Core modulu
        DEFAULT_CONFIG: modules.core.config,
        
        // ==========================================
        // CORE FUNCTIONS (vždy dostupné)
        // ==========================================
        
        // Logging
        addDebug: modules.core.addDebug,
        addError: modules.core.addError,
        addInfo: modules.core.addInfo,
        clearLogs: modules.core.clearLogs,
        saveLogs: modules.core.saveLogs,
        
        // Safe field access
        safeGet: modules.core.safeGet,
        safeSet: modules.core.safeSet,
        safeFieldAccess: modules.core.safeFieldAccess,
        safeGetAttribute: modules.core.safeGetAttribute,
        safeSetAttribute: modules.core.safeSetAttribute,
        safeGetLinks: modules.core.safeGetLinks,
        
        // Time & formatting
        formatDate: modules.core.formatDate,
        formatTime: modules.core.formatTime,
        formatMoney: modules.core.formatMoney,
        parseTimeToMinutes: modules.core.parseTimeToMinutes,
        roundToQuarter: modules.core.roundToQuarter,
        
        // Validation
        validateRequiredFields: modules.core.validateRequiredFields,
        
        // Utilities
        findEntryById: modules.core.findEntryById,
        getSettings: modules.core.getSettings,
        
        // Legacy support
        includeLineNumbers: modules.core.config.includeLineNumbers,
        includeStackTrace: modules.core.config.includeStackTrace,

        // Custom helper functions can be added here
        selectOsobaForm: modules.core.selectOsobaForm,
        getDayNameSK: modules.core.getDayNamesk,
        SlovakDateTime: modules.core.SlovakDateTime
        
    };
    
    // ==========================================
    // AI FUNCTIONS (ak je modul dostupný)
    // ==========================================
    
    if (modules.ai) {
        api.AI_PROVIDERS = modules.ai.AI_PROVIDERS;
        api.getApiKey = modules.ai.getApiKey;
        api.clearApiKeyCache = modules.ai.clearApiKeyCache;
        api.httpRequest = modules.ai.httpRequest;
        api.callAI = modules.ai.callAI;
        api.analyzeImage = modules.ai.analyzeImage;
    } else {
        // Fallback funkcie ak AI modul chýba
        api.httpRequest = function() {
            return { success: false, error: "MementoAI module not loaded" };
        };
        api.callAI = function() {
            return { success: false, error: "MementoAI module not loaded" };
        };
    }
    
    // ==========================================
    // TELEGRAM FUNCTIONS (ak je modul dostupný)
    // ==========================================
    
    if (modules.telegram) {
        api.sendTelegramMessage = modules.telegram.sendTelegramMessage;
        api.deleteTelegramMessage = modules.telegram.deleteTelegramMessage;
        api.editTelegramMessage = modules.telegram.editTelegramMessage;
        api.createNotificationEntry = modules.telegram.createNotificationEntry;
        api.manageNotifications = modules.telegram.manageNotifications;
        api.processNotificationQueue = modules.telegram.processNotificationQueue;
        api.getTelegramGroup = modules.telegram.getTelegramGroup;
    } else {
        // Fallback funkcie ak Telegram modul chýba
        api.sendTelegramMessage = function() {
            return { success: false, error: "MementoTelegram module not loaded" };
        };
    }
    
    // ==========================================
    // BUSINESS FUNCTIONS (ak je modul dostupný)
    // ==========================================
    
    if (modules.business) {
        api.calculateWorkHours = modules.business.calculateWorkHours;
        api.getEmployeeWorkRecord = modules.business.getEmployeeWorkRecord;
        api.isWeekend = modules.business.isWeekend;
        api.isHoliday = modules.business.isHoliday;
        api.formatEmployeeName = modules.business.formatEmployeeName;
        api.getEmployeeDetails = modules.business.getEmployeeDetails;
        api.findEmployeeByNick = modules.business.findEmployeeByNick;
        api.calculateDailyWage = modules.business.calculateDailyWage;
        api.getLatestRate = modules.business.getLatestRate;
    } else {
        // Placeholder funkcie ak Business modul chýba
        api.calculateWorkHours = function(start, end) {
            var diff = end.getTime() - start.getTime();
            return diff / (1000 * 60 * 60);
        };
    }
    
    // ==========================================
    // CONFIG ADAPTER INTEGRATION (po definícii api!)
    // ==========================================
    
    // Import config adapter if available
    var configAdapter = typeof MementoConfigAdapter !== 'undefined' ? MementoConfigAdapter : null;
    
    // Add to public API
    api.CONFIG = configAdapter ? configAdapter.getConfig() : null;
    
    // Add DEFAULT_CONFIG for backward compatibility
    api.DEFAULT_CONFIG = (function() {
        if (configAdapter) {
            try {
                var cfg = configAdapter.getConfig();
                if (cfg) {
                    var libs = cfg.getLibraries();
                    return {
                        defaultLibraryName: libs.core.defaults,
                        apiKeysLibrary: libs.core.api,
                        telegramGroupsLibrary: libs.telegram.groups,
                        notificationsLibrary: libs.core.notifications
                    };
                }
            } catch(e) {
                // Fallback if config adapter fails
                if (modules.core && modules.core.config.debug) {
                    modules.core.addDebug(null, "ConfigAdapter error: " + e.toString());
                }
            }
        }
        // Fallback to core config
        return modules.core.config;
    })();
    
    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================
    
    /**
     * Získať zoznam načítaných modulov
     */
    api.getLoadedModules = function() {
        var loaded = [];
        for (var name in modules) {
            if (modules[name]) {
                loaded.push({
                    name: name,
                    version: modules[name].version || "N/A"
                });
            }
        }
        return loaded;
    };
    
    /**
     * Skontroluj závislosti
     */
    api.checkDependencies = function() {
        var report = {
            core: modules.core !== null,
            ai: modules.ai !== null,
            telegram: modules.telegram !== null,
            business: modules.business !== null,
            configAdapter: configAdapter !== null,
            allRequired: modules.core !== null,
            summary: ""
        };
        
        var loaded = [];
        var missing = [];
        
        for (var name in modules) {
            if (modules[name]) {
                loaded.push(name);
            } else {
                missing.push(name);
            }
        }
        
        report.summary = "Loaded: " + loaded.join(", ") + 
                        (missing.length > 0 ? " | Missing: " + missing.join(", ") : "");
        
        return report;
    };
    
    // ==========================================
    // MODULE INITIALIZATION
    // ==========================================
    
    // Debug log pre troubleshooting
    if (modules.core && modules.core.config.debug) {
        var loadReport = api.checkDependencies();
        modules.core.addDebug(null, "🚀 MementoUtils v" + api.version + " initialized");
        modules.core.addDebug(null, "📦 Modules: " + loadReport.summary);
        if (api.CONFIG) {
            modules.core.addDebug(null, "✅ ConfigAdapter loaded successfully");
        }
    }
    
    // Return public API
    return api;
    
})();

// ==============================================
// GLOBAL EXPORT
// ==============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MementoUtils;
}