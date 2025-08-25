// ==============================================
// MEMENTOCONFIGADAPTER - Adapter pre spätnú kompatibilitu
// Verzia: 1.0 | Dátum: August 2025 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
//    - Poskytuje spätnú kompatibilitu pre existujúce moduly
//    - Mapuje staré CONFIG štruktúry na nový MementoConfig
//    - Umožňuje postupnú migráciu
// ==============================================

var MementoConfigAdapter = (function() {
    'use strict';
    
    // Lazy loading MementoConfig
    var config = null;
    
    function ensureConfig() {
        if (!config && typeof MementoConfig !== 'undefined') {
            config = MementoConfig;
            config.init();
        }
        return config;
    }
    
    // ==============================================
    // ADAPTER FOR MEMENTOCORE
    // ==============================================
    
    function createCoreConfigAdapter() {
        var cfg = ensureConfig();
        if (!cfg) {
            // Fallback na starú štruktúru
            return {
                version: "1.0",
                debug: true,
                includeLineNumbers: true,
                includeStackTrace: false,
                debugFieldName: "Debug_Log",
                errorFieldName: "Error_Log",
                infoFieldName: "info",
                dateFormat: "DD.MM.YY HH:mm",
                dateOnlyFormat: "DD.MM.YYYY",
                timeFormat: "HH:mm",
                quarterRoundingMinutes: 15
            };
        }
        
        var moduleConfig = cfg.getConfig('core');
        var formats = moduleConfig.formats;
        
        return {
            version: moduleConfig.core.version || "1.0",
            debug: moduleConfig.core.debug,
            includeLineNumbers: moduleConfig.core.includeLineNumbers,
            includeStackTrace: moduleConfig.core.includeStackTrace,
            
            // Field names from mappings
            debugFieldName: "Debug_Log",
            errorFieldName: "Error_Log", 
            infoFieldName: "info",
            
            // Formats
            dateFormat: formats.datetime.default.replace('YYYY', 'YY'),
            dateOnlyFormat: formats.date.default,
            timeFormat: formats.time.default,
            quarterRoundingMinutes: 15,
            
            // Library names
            defaultLibraryName: moduleConfig.libraries.core.defaults,
            apiKeysLibrary: moduleConfig.libraries.core.api
        };
    }
    
    // ==============================================
    // ADAPTER FOR MEMENTOAI
    // ==============================================
    
    function createAIConfigAdapter() {
        var cfg = ensureConfig();
        if (!cfg) {
            // Fallback
            return {
                version: "1.0",
                apiCacheTimeout: 3600000,
                httpTimeout: 30000,
                maxRetries: 3,
                apiLibrary: "ASISTANTO API",
                defaultAIProvider: "OpenAi"
            };
        }
        
        var moduleConfig = cfg.getConfig('ai');
        
        return {
            version: "1.0",
            apiCacheTimeout: moduleConfig.ai.cacheTimeout,
            httpTimeout: moduleConfig.ai.timeout,
            maxRetries: moduleConfig.ai.maxRetries,
            apiLibrary: moduleConfig.libraries.core.api,
            defaultAIProvider: moduleConfig.ai.defaultProvider,
            
            // Provider specific
            providers: moduleConfig.ai.providers
        };
    }
    
    // ==============================================
    // ADAPTER FOR MEMENTOTELEGRAM
    // ==============================================
    
    function createTelegramConfigAdapter() {
        var cfg = ensureConfig();
        if (!cfg) {
            // Fallback
            return {
                version: "1.0",
                defaultsLibrary: "ASISTANTO Defaults",
                notificationsLibrary: "Notifications",
                telegramGroupsLibrary: "Telegram Groups",
                telegramBotTokenField: "Telegram Bot Token",
                telegramBaseUrl: "https://api.telegram.org/bot",
                maxRetries: 3,
                retryDelay: 5000
            };
        }
        
        var moduleConfig = cfg.getConfig('telegram');
        
        return {
            version: "1.0",
            defaultsLibrary: moduleConfig.libraries.core.defaults,
            notificationsLibrary: moduleConfig.libraries.core.notifications,
            telegramGroupsLibrary: moduleConfig.libraries.telegram.groups,
            telegramBotTokenField: "Telegram Bot Token",
            telegramBaseUrl: moduleConfig.telegram.api.baseUrl,
            maxRetries: moduleConfig.telegram.maxRetries,
            retryDelay: moduleConfig.telegram.retryDelays[0]
        };
    }
    
    // ==============================================
    // ADAPTER FOR MEMENTOBUSINESS
    // ==============================================
    
    function createBusinessConfigAdapter() {
        var cfg = ensureConfig();
        if (!cfg) {
            // Fallback
            return {
                debug: true,
                version: "1.0",
                defaultWorkHoursPerDay: 8,
                overtimeThreshold: 8,
                weekendMultiplier: 1.5,
                holidayMultiplier: 2.0
            };
        }
        
        var moduleConfig = cfg.getConfig('business');
        var libs = moduleConfig.libraries;
        
        return {
            debug: true,
            version: "1.0",
            
            // Business rules
            defaultWorkHoursPerDay: moduleConfig.business.workHoursPerDay,
            overtimeThreshold: moduleConfig.business.overtimeThreshold,
            weekendMultiplier: moduleConfig.business.weekendMultiplier,
            holidayMultiplier: moduleConfig.business.holidayMultiplier,
            
            // Libraries
            employeesLibrary: libs.business.employees,
            attendanceLibrary: libs.business.attendance,
            workRecordsLibrary: libs.business.workRecords,
            transportLibrary: libs.business.vehicles,
            inventoryLibrary: libs.business.inventory,
            
            // Field mappings
            attendance: moduleConfig.fieldMappings.attendance,
            employees: moduleConfig.fieldMappings.employees
        };
    }
    
    // ==============================================
    // ADAPTER FOR NOTIFICATIONS HELPER
    // ==============================================
    
    function createNotificationsConfigAdapter() {
        var cfg = ensureConfig();
        if (!cfg) {
            // Return minimal config
            return {
                debug: true,
                version: "2.0",
                scriptName: "Notifications Helper",
                libraries: {
                    notifications: "Notifications",
                    telegramGroups: "Telegram Groups",
                    api: "ASISTANTO API",
                    defaults: "ASISTANTO Defaults"
                }
            };
        }
        
        var moduleConfig = cfg.getConfig('notifications');
        var libs = moduleConfig.libraries;
        
        return {
            debug: true,
            version: "2.0",
            scriptName: "Notifications Helper",
            
            // Libraries with getter support
            get libraries() {
                return {
                    notifications: libs.core.notifications,
                    telegramGroups: libs.telegram.groups,
                    api: libs.core.api,
                    defaults: libs.core.defaults,
                    employees: libs.business.employees,
                    clients: libs.external.clients,
                    partners: libs.external.partners,
                    orders: libs.external.orders
                };
            },
            
            // Validation
            validation: {
                required: ['sprava'],
                optional: ['predmet', 'priorita', 'adresat', 'formatovanie'],
                maxRetries: moduleConfig.notifications.maxRetries,
                timeoutMs: 30000
            },
            
            // Business rules
            businessRules: {
                defaultPriority: moduleConfig.notifications.defaultPriority,
                defaultFormatting: moduleConfig.notifications.defaultFormatting,
                defaultSource: moduleConfig.notifications.defaultSource,
                defaultType: "Systémová"
            }
        };
    }
    
    // ==============================================
    // UNIVERSAL CONFIG BUILDER
    // ==============================================
    
    function buildConfigForModule(moduleName, scriptName) {
        var cfg = ensureConfig();
        if (!cfg) {
            // Basic fallback
            return {
                debug: true,
                version: "1.0",
                scriptName: scriptName || moduleName
            };
        }
        
        var moduleConfig = cfg.getConfig(moduleName);
        var fieldMappings = moduleConfig.fieldMappings;
        
        // Build config based on module
        var config = {
            debug: true,
            version: "1.0",
            scriptName: scriptName || moduleName,
            
            // Common libraries
            libraries: {
                defaults: moduleConfig.libraries.core.defaults,
                notifications: moduleConfig.libraries.core.notifications,
                api: moduleConfig.libraries.core.api
            }
        };
        
        // Add module specific libraries
        switch (moduleName) {
            case 'attendance':
                config.libraries.zamestnanci = moduleConfig.libraries.business.employees;
                config.libraries.dochadzka = moduleConfig.libraries.business.attendance;
                config.libraries.zavazky = moduleConfig.libraries.business.obligations;
                config.fields = fieldMappings.attendance;
                break;
                
            case 'notifications':
                config.libraries.telegramGroups = moduleConfig.libraries.telegram.groups;
                config.fields = fieldMappings.notifications;
                break;
        }
        
        return config;
    }
    
    // ==============================================
    // PUBLIC API
    // ==============================================
    
    return {
        // Version
        version: "1.0",
        
        // Get adapter for specific module
        getAdapter: function(moduleName) {
            switch (moduleName.toLowerCase()) {
                case 'core':
                case 'mementocore':
                    return createCoreConfigAdapter();
                    
                case 'ai':
                case 'mementoai':
                    return createAIConfigAdapter();
                    
                case 'telegram':
                case 'mementotelegram':
                    return createTelegramConfigAdapter();
                    
                case 'business':
                case 'mementobusiness':
                    return createBusinessConfigAdapter();
                    
                case 'notifications':
                case 'notificationshelper':
                    return createNotificationsConfigAdapter();
                
                case 'attendance':
                case 'mementobusiness':
                    return createBusinessConfigAdapter();
                    
                default:
                    return buildConfigForModule(moduleName);
            }
        },
        
        // Direct access to MementoConfig
        getConfig: function() {
            return ensureConfig();
        },
        
        // Helper methods
        getLibraryName: function(category, library) {
            var cfg = ensureConfig();
            return cfg ? cfg.getLibraryName(category, library) : null;
        },
        
        getFieldName: function(entity, field) {
            var cfg = ensureConfig();
            return cfg ? cfg.getFieldName(entity, field) : null;
        }
    };
})();

// ==============================================
// GLOBAL EXPORT
// ==============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MementoConfigAdapter;
}