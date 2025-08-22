// ==============================================
// MEMENTOUTILS - Hlavný agregátor všetkých modulov
// Verzia: 3.3 | Dátum: August 2025 | Autor: ASISTANTO
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

var MementoUtils = (function() {
    'use strict';
    // Import config adapter if available
    var configAdapter = typeof MementoConfigAdapter !== 'undefined' ? MementoConfigAdapter : null;

    // Add to public API
    api.CONFIG = configAdapter ? configAdapter.getConfig() : null;

    // Add DEFAULT_CONFIG for backward compatibility
    api.DEFAULT_CONFIG = (function() {
        if (configAdapter) {
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
        }
        // Fallback
        return {
            defaultLibraryName: "ASISTANTO Defaults",
            apiKeysLibrary: "ASISTANTO API",
            telegramGroupsLibrary: "Telegram Groups",
            notificationsLibrary: "Notifications"
        };
    })();  
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
        version: "3.3",
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
        includeStackTrace: modules.core.config.includeStackTrace
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
        // Fallback funkcie
        api.sendTelegramMessage = function() {
            return { success: false, error: "MementoTelegram module not loaded" };
        };
        api.createNotificationEntry = function() {
            return { success: false, error: "MementoTelegram module not loaded" };
        };
    }
    
    // ==========================================
    // BUSINESS FUNCTIONS (ak je modul dostupný)
    // ==========================================
    
    if (modules.business) {
        api.calculateWorkHours = modules.business.calculateWorkHours;
        api.isWeekend = modules.business.isWeekend;
        api.isHoliday = modules.business.isHoliday;
        api.getWorkDayMultiplier = modules.business.getWorkDayMultiplier;
        api.formatEmployeeName = modules.business.formatEmployeeName;
        api.getEmployeeDetails = modules.business.getEmployeeDetails;
        api.findEmployeeByNick = modules.business.findEmployeeByNick;
        api.calculateDailyWage = modules.business.calculateDailyWage;
        api.generateAttendanceSummary = modules.business.generateAttendanceSummary;
    } else {
        // Fallback funkcie pre business logiku
        api.calculateWorkHours = function(start, end) {
            // Základná implementácia ak chýba business modul
            try {
                var startTime = moment(start);
                var endTime = moment(end);
                var diff = endTime.diff(startTime, 'hours', true);
                return {
                    hours: diff > 0 ? diff : diff + 24,
                    minutes: 0,
                    error: modules.business ? null : "Using basic calculation"
                };
            } catch (e) {
                return { hours: 0, minutes: 0, error: e.toString() };
            }
        };
        
        api.formatEmployeeName = function(emp) {
            // Základná implementácia
            if (!emp) return "Neznámy";
            return modules.core.safeGet(emp, "Nick", "Zamestnanec");
        };
        
        api.getEmployeeDetails = function() {
            return { hasValidRate: false, error: "MementoBusiness module not loaded" };
        };
    }
    
    // ==========================================
    // HELPER FUNKCIE
    // ==========================================
    
    // Funkcia na kontrolu dostupných modulov
    api.getLoadedModules = function() {
        var loaded = [];
        for (var module in modules) {
            if (modules[module]) {
                loaded.push({
                    name: module,
                    version: modules[module].version || "unknown"
                });
            }
        }
        return loaded;
    };
    
    // Funkcia na kontrolu závislostí
    api.checkDependencies = function() {
        var report = {
            allLoaded: true,
            modules: {}
        };
        
        for (var module in modules) {
            report.modules[module] = modules[module] !== null;
            if (!modules[module]) {
                report.allLoaded = false;
            }
        }
        
        return report;
    };
    
    // Info správa pri načítaní
    if (modules.core && modules.core.addDebug) {
        try {
            var loadedCount = api.getLoadedModules().length;
            modules.core.addDebug(entry(), 
                "✅ MementoUtils " + api.version + " loaded with " + 
                loadedCount + "/4 modules"
            );
        } catch (e) {
            // OK - môže byť mimo entry kontext
        }
    }
    
    // ==========================================
    // RETURN PUBLIC API
    // ==========================================
    
    return api;
    
})();