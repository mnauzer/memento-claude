// ==============================================
// MEMENTOCONFIG - Centralizovaná konfigurácia
// Verzia: 1.0 | Dátum: August 2025 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
//    - Centrálne miesto pre všetky konfigurácie
//    - Jednotné názvy knižníc a field mappings
//    - Podpora pre module-specific nastavenia
//    - Backward compatibility s existujúcimi modulmi
// ==============================================

var MementoConfig = (function() {
    'use strict';
    
    // ==============================================
    // PRIVATE VARIABLES
    // ==============================================
    
    var initialized = false;
    var configCache = {};
    var overrides = {};
    
    // ==============================================
    // SYSTEM CONFIGURATION
    // ==============================================
    
    var SYSTEM = {
        version: "1.0",
        environment: "production",
        debug: false,
        configVersion: "2025.08.20",
        
        // Globálne nastavenia
        defaults: {
            timezone: "Europe/Bratislava",
            locale: "sk-SK",
            fiscalYearStart: 1 // Január
        }
    };
    
    // ==============================================
    // CENTRALIZED LIBRARY NAMES
    // ==============================================
    
    var LIBRARIES = {
        // Core system libraries
        core: {
            defaults: "ASISTANTO Defaults",
            api: "ASISTANTO API",
            notifications: "Notifications",
            settings: "Nastavenia"
        },
        
        // Telegram integration
        telegram: {
            groups: "Telegram Groups",
            bots: "Telegram Bots",
            templates: "Telegram Templates"
        },
        
        // Business entities
        business: {
            employees: "Zamestnanci",
            attendance: "Dochádzka",
            workRecords: "Záznam prác",
            vehicles: "Kniha jázd",
            obligations: "Záväzky",
            salaries: "sadzby zamestnancov",
            inventory: "Sklad",
            equipment: "Mechanizácia"
        },
        
        // External entities
        external: {
            clients: "Klienti",
            partners: "Partneri",
            orders: "Zákazky",
            invoices: "Vyúčtovania",
            quotes: "Cenové ponuky"
        },
        
        // System libraries
        system: {
            logs: "System Logs",
            audit: "Audit Trail",
            backups: "Zálohy",
            migrations: "Migrácie"
        }
    };
    
    // ==============================================
    // CENTRALIZED FIELD MAPPINGS
    // ==============================================
    
    var FIELD_MAPPINGS = {
        // Dochádzka fields
        attendance: {
            // Main fields
            employees: "Zamestnanci",
            date: "Dátum",
            arrival: "Príchod",
            departure: "Odchod",
            workingHours: "Pracovná doba",
            employeeCount: "Počet pracovníkov",
            totalWorked: "Odpracované",
            wageCosts: "Mzdové náklady",
            note: "Poznámka",
            id: "ID",
            notifications: "Notifikácie",
            
            // System fields
            info: "info",
            debugLog: "Debug_Log",
            errorLog: "Error_Log",
            view: "view",
            
            // Attributes
            attributes: {
                worked: "odpracované",
                hourlyRate: "hodinovka",
                bonus: "+príplatok (€/h)",
                premium: "+prémia (€)",
                penalty: "-pokuta (€)",
                dailyWage: "denná mzda",
                note: "poznámka"
            }
        },
        
        // Notifications fields
        notifications: {
            // Main fields
            type: "Typ správy",
            source: "Zdroj správy",
            subject: "Predmet",
            message: "Správa",
            attachment: "Príloha",
            formatting: "Formátovanie",
            status: "Status",
            priority: "Priorita",
            addressee: "Adresát",
            
            // Target fields
            groupTopic: "Skupina/Téma",
            employee: "Zamestnanec",
            client: "Klient",
            partner: "Partner",
            order: "Zákazka",
            
            // Timing fields
            sendAt: "Poslať o",
            expireAt: "Vypršať o",
            repeat: "Opakovať",
            created: "Vytvorené",
            creator: "Vytvoril",
            
            // Telegram specific
            telegramId: "Telegram ID",
            chatId: "Chat ID",
            threadId: "Thread ID",
            messageId: "Message ID",
            messageUrl: "Message URL",
            
            // Response tracking
            sentAt: "Odoslané o",
            retryCount: "Pokusov o odoslanie",
            lastError: "Posledná chyba",
            responseData: "Response Data",
            
            // Metadata
            sourceLibrary: "Zdrojová knižnica",
            sourceId: "Zdrojový ID"
        },
        
        // Employee fields
        employees: {
            // Personal info
            nick: "Nick",
            firstName: "Meno",
            lastName: "Priezvisko",
            title: "Titul",
            
            // Contact
            email: "Email",
            phone: "Telefón",
            address: "Adresa",
            
            // Work info
            position: "Pozícia",
            department: "Oddelenie",
            supervisor: "Nadriadený",
            startDate: "Dátum nástupu",
            
            // Telegram
            telegramEnabled: "Telegram povolený",
            telegramId: "Telegram ID",
            telegramUsername: "Telegram Username",
            
            // System
            active: "Aktívny",
            id: "ID"
        },
        
        // Telegram Groups fields
        telegramGroups: {
            // Basic info
            groupName: "Názov skupiny",
            groupType: "Typ skupiny",
            description: "Popis skupiny",
            
            // Telegram data
            chatId: "Chat ID",
            threadId: "Thread ID",
            threadName: "Názov témy",
            hasThread: "Má tému",
            
            // Settings
            notificationsEnabled: "Povoliť notifikácie",
            workingHoursFrom: "Pracovný čas od",
            workingHoursTo: "Pracovný čas do",
            weekendEnabled: "Víkend povolený",
            dailyLimit: "Denný limit správ",
            sentToday: "Počet správ dnes",
            silentMode: "Tichá správa",
            priority: "Priorita správ",
            
            // Statistics
            totalMessages: "Celkový počet správ",
            lastMessage: "Posledná správa",
            lastMessageId: "Posledné Message ID",
            lastError: "Posledná chyba"
        }
    };
    
    // ==============================================
    // CENTRALIZED FORMATS
    // ==============================================
    
    var FORMATS = {
        date: {
            default: "DD.MM.YYYY",
            short: "D.M.YYYY",
            long: "DD. MMMM YYYY",
            iso: "YYYY-MM-DD"
        },
        time: {
            default: "HH:mm",
            seconds: "HH:mm:ss",
            short: "H:mm"
        },
        datetime: {
            default: "DD.MM.YYYY HH:mm",
            long: "DD.MM.YYYY HH:mm:ss",
            iso: "YYYY-MM-DDTHH:mm:ss"
        },
        currency: {
            symbol: "€",
            decimals: 2,
            thousandsSeparator: " ",
            decimalSeparator: ","
        }
    };
    
    // ==============================================
    // MODULE DEFAULT CONFIGURATIONS
    // ==============================================
    
    var MODULE_DEFAULTS = {
        // MementoCore defaults
        core: {
            debug: true,
            includeLineNumbers: true,
            includeStackTrace: false,
            logRetentionDays: 30,
            maxLogSize: 1000 // lines
        },
        
        // MementoAI defaults
        ai: {
            defaultProvider: "OpenAI",
            timeout: 30000,
            maxRetries: 3,
            cacheTimeout: 3600000, // 1 hour
            
            providers: {
                openai: {
                    model: "gpt-4o-mini",
                    temperature: 0.7,
                    maxTokens: 2000
                },
                perplexity: {
                    model: "llama-3.1-sonar-small-128k-online",
                    temperature: 0.7
                }
            }
        },
        
        // MementoTelegram defaults
        telegram: {
            rateLimitDelay: 1000, // 1 second
            maxMessageLength: 4096,
            maxRetries: 3,
            retryDelays: [1000, 3000, 8000],
            defaultParseMode: "HTML",
            
            api: {
                baseUrl: "https://api.telegram.org/bot",
                timeout: 30000
            }
        },
        
        // MementoBusiness defaults
        business: {
            workHoursPerDay: 8,
            overtimeThreshold: 8,
            weekendMultiplier: 1.5,
            holidayMultiplier: 2.0,
            nightShiftBonus: 0.25,
            
            roundToQuarterHour: true,
            quarterHourMinutes: 15
        },
        
        // Notifications defaults
        notifications: {
            defaultPriority: "Normálna",
            defaultFormatting: "Markdown",
            defaultSource: "Automatická",
            maxRetries: 3,
            retryDelays: [60000, 300000, 900000], // 1min, 5min, 15min
            
            priorities: ["Nízka", "Normálna", "Vysoká", "Urgentné"],
            statuses: ["Čaká", "Odosielanie", "Odoslané", "Zlyhalo", "Zrušené", "Vypršané"],
            types: ["Dochádzka", "Záznam prác", "Kniha jázd", "ToDo", "Systémová", "Manuálna"],
            addressees: ["Zamestnanec", "Skupina", "Téma", "Klient", "Partner", "Zákazka"]
        }
    };
    
    // ==============================================
    // PRIVATE FUNCTIONS
    // ==============================================
    
    /**
     * Deep merge dvoch objektov
     */
    function deepMerge(target, source) {
        if (!source) return target;
        
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    target[key] = target[key] || {};
                    deepMerge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }
        return target;
    }
    
    /**
     * Získa konfiguráciu pre modul
     */
    function getModuleConfig(moduleName) {
        // Check cache
        if (configCache[moduleName]) {
            return configCache[moduleName];
        }
        
        // Build config
        var config = {
            system: SYSTEM,
            libraries: LIBRARIES,
            fieldMappings: FIELD_MAPPINGS,
            formats: FORMATS
        };
        
        // Add module defaults
        if (MODULE_DEFAULTS[moduleName]) {
            config[moduleName] = deepMerge({}, MODULE_DEFAULTS[moduleName]);
        }
        
        // Apply overrides
        if (overrides[moduleName]) {
            deepMerge(config, overrides[moduleName]);
        }
        
        // Cache and return
        configCache[moduleName] = config;
        return config;
    }
    
    /**
     * Inicializácia konfigurácie
     */
    function initialize() {
        if (initialized) return;
        
        // Load any saved overrides from settings
        try {
            var settingsLib = libByName(LIBRARIES.core.settings);
            if (settingsLib) {
                var entries = settingsLib.entries();
                if (entries && entries.length > 0) {
                    var savedOverrides = entries[0].field("ConfigOverrides");
                    if (savedOverrides) {
                        overrides = JSON.parse(savedOverrides);
                    }
                }
            }
        } catch (e) {
            // Settings not available yet
        }
        
        initialized = true;
    }
    
    // ==============================================
    // PUBLIC API
    // ==============================================
    
    return {
        // Version
        version: SYSTEM.version,
        
        // Initialize
        init: initialize,
        
        // Get configuration
        getConfig: function(moduleName) {
            initialize();
            return moduleName ? getModuleConfig(moduleName) : {
                system: SYSTEM,
                libraries: LIBRARIES,
                fieldMappings: FIELD_MAPPINGS,
                formats: FORMATS
            };
        },
        
        // Get specific parts
        getLibraries: function() {
            initialize();
            return deepMerge({}, LIBRARIES);
        },
        
        getFieldMappings: function(entity) {
            initialize();
            return entity ? FIELD_MAPPINGS[entity] : deepMerge({}, FIELD_MAPPINGS);
        },
        
        getFormats: function() {
            initialize();
            return deepMerge({}, FORMATS);
        },
        
        // Override configuration
        override: function(moduleName, config) {
            if (!moduleName || !config) return false;
            
            overrides[moduleName] = overrides[moduleName] || {};
            deepMerge(overrides[moduleName], config);
            
            // Clear cache
            delete configCache[moduleName];
            
            return true;
        },
        
        // Reset overrides
        resetOverrides: function(moduleName) {
            if (moduleName) {
                delete overrides[moduleName];
                delete configCache[moduleName];
            } else {
                overrides = {};
                configCache = {};
            }
        },
        
        // Save overrides
        saveOverrides: function() {
            try {
                var settingsLib = libByName(LIBRARIES.core.settings);
                if (settingsLib) {
                    var entries = settingsLib.entries();
                    if (entries && entries.length > 0) {
                        entries[0].set("ConfigOverrides", JSON.stringify(overrides));
                        return true;
                    }
                }
            } catch (e) {
                // Error saving
            }
            return false;
        },
        
        // Backward compatibility helpers
        getLibraryName: function(category, library) {
            initialize();
            if (LIBRARIES[category] && LIBRARIES[category][library]) {
                return LIBRARIES[category][library];
            }
            // Fallback - try to find in any category
            for (var cat in LIBRARIES) {
                if (LIBRARIES[cat][library]) {
                    return LIBRARIES[cat][library];
                }
            }
            return null;
        },
        
        getFieldName: function(entity, field) {
            initialize();
            if (FIELD_MAPPINGS[entity] && FIELD_MAPPINGS[entity][field]) {
                return FIELD_MAPPINGS[entity][field];
            }
            return null;
        }
    };
})();

// ==============================================
// GLOBAL EXPORT
// ==============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MementoConfig;
}