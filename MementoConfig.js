// ==============================================
// MEMENTOCONFIG - Centralizovaná konfigurácia
// Verzia: 1.1 | Dátum: August 2025 | Autor: ASISTANTO
// ==============================================
// 📋 ZMENY v1.1:
//    - Pridané kompletné field mappings pre Dochádzku
//    - Pridané atribúty pre zamestnancov
//    - Rozšírené mappings pre Záväzky
//    - Pridané mappings pre sadzby zamestnancov
// ==============================================

var MementoConfig = (function() {
    'use strict';
    
    // ==============================================
    // SYSTEM CONFIGURATION
    // ==============================================
    
    var SYSTEM = {
        version: "1.1",
        environment: "production",
        debugMode: true,
        language: "sk"
    };
    
    // ==============================================
    // LIBRARY NAMES
    // ==============================================
    
    var LIBRARIES = {
        core: {
            defaults: "ASISTANTO Defaults",
            api: "ASISTANTO API",
            settings: "ASISTANTO Settings",
            notifications: "Notifications"
        },
        
        business: {
            employees: "Zamestnanci",
            attendance: "Dochádzka",
            workRecords: "Záznam práce",
            obligations: "Záväzky",
            rates: "sadzby zamestnancov",
            priceList: "Cenník prác",
            vehicles: "Vozidlá",
            inventory: "Sklad"
        },
        
        telegram: {
            groups: "Telegram Groups",
            threads: "Telegram Threads"
        },
        
        external: {
            clients: "Klienti",
            suppliers: "Dodávatelia",
            partners: "Partneri",
            orders: "Zákazky"
        }
    };
    
    // ==============================================
    // FIELD MAPPINGS - ROZŠÍRENÉ v1.1
    // ==============================================
    
    var FIELD_MAPPINGS = {
        // DOCHÁDZKA - KOMPLETNÉ MAPOVANIE
        attendance: {
            // Základné polia
            date: "Dátum",
            prichod: "Príchod",
            odchod: "Odchod",
            zamestnanci: "Zamestnanci",
            
            // Vypočítané polia
            pracovnaDoba: "Pracovná doba",
            pocetPracovnikov: "Počet pracovníkov",
            odpracovane: "Odpracované",
            mzdoveNaklady: "Mzdové náklady",
            naZakazkach: "Na zákazkách",
            prestoje: "Prestoje",
            
            // Prepojenia
            prace: "Práce",
            jazdy: "Jazdy",
            zavazky: "Záväzky",
            notifikacie: "Notifikácie",
            
            // Systémové
            info: "info",
            keys: "keys",
            poznamka: "Poznámka",
            id: "ID",
            view: "view",
            
            // Logy
            debugLog: "Debug_Log",
            errorLog: "Error_Log",
            debugFields: "Debug_Fields",
            
            // Farby
            farbaZaznamu: "farba záznamu",
            farbaPozadia: "farba pozadia",
            
            // Tracking
            zapisal: "zapísal",
            datumZapisu: "dátum zápisu",
            upravil: "upravil",
            datumUpravy: "dátum úpravy",

            attributes: {
                odpracovane: "odpracované",
                hodinovka: "hodinovka",
                priplatok: "+príplatok (€/h)",
                premia: "+prémia (€)",
                pokuta: "-pokuta (€)",
                dennaMzda: "denná mzda",
                stravne: "stravné (€)",
                poznamka: "poznámka"
        }   ,
        },
        
        // ATRIBÚTY PRE DOCHÁDZKU
        attendanceAttributes: {
            odpracovane: "odpracované",
            hodinovka: "hodinovka",
            priplatok: "+príplatok (€/h)",
            premia: "+prémia (€)",
            pokuta: "-pokuta (€)",
            dennaMzda: "denná mzda",
            stravne: "stravné (€)",
            poznamka: "poznámka"
        },
        
        // ZAMESTNANCI
        employees: {
            id: "ID",
            nick: "Nick",
            meno: "Meno",
            priezvisko: "Priezvisko",
            pozicia: "Pozícia",
            email: "Email",
            telefon: "Telefón",
            telegramId: "Telegram ID",
            telegramNotifikacie: "Telegram notifikácie",
            typUvazku: "Typ úväzku",
            status: "Status",
            datumNastupu: "Dátum nástupu",
            datumOdchodu: "Dátum odchodu",
            
            // Systémové
            info: "info",
            view: "view",
            debugLog: "Debug_Log",
            errorLog: "Error_Log"
        },
        
        // SADZBY ZAMESTNANCOV
        employeeRates: {
            zamestnanec: "Zamestnanec",
            sadzba: "Sadzba",
            platnostOd: "Platnosť od",
            platnostDo: "Platnosť do",
            typSadzby: "Typ sadzby",
            poznamka: "Poznámka",
            
            // Systémové
            id: "ID",
            info: "info",
            view: "view"
        },
        
        // ZÁVÄZKY
        obligations: {
            stav: "Stav",
            datum: "Dátum",
            typ: "Typ",
            zamestnanec: "Zamestnanec",
            veritiel: "Veriteľ",
            dochadzka: "Dochádzka",
            popis: "Popis",
            suma: "Suma",
            zaplatene: "Zaplatené",
            zostatok: "Zostatok",
            datumSplatnosti: "Dátum splatnosti",
            datumUhrady: "Dátum úhrady",
            
            // Systémové
            id: "ID",
            info: "info",
            view: "view",
            debugLog: "Debug_Log",
            errorLog: "Error_Log"
        },
        
        // NOTIFIKÁCIE
        notifications: {
            status: "Status",
            priorita: "Priorita",
            typSpravy: "Typ správy",
            zdrojSpravy: "Zdroj správy",
            predmet: "Predmet",
            sprava: "Správa",
            adresat: "Adresát",
            skupinaTema: "Skupina/Téma",
            formatovanie: "Formátovanie",
            
            // Časovanie
            vytvorene: "Vytvorené",
            poslatO: "Poslať o",
            odoslane: "Odoslané",
            
            // Prepojenia
            zamestnanec: "Zamestnanec",
            zdrojovaKniznica: "Zdrojová knižnica",
            zdrojovyId: "Zdrojový ID",
            
            // Telegram
            telegramMessageId: "Telegram Message ID",
            telegramThreadId: "Telegram Thread ID",
            telegramChatId: "Telegram Chat ID",
            
            // Systémové
            id: "ID",
            info: "info",
            view: "view",
            debugLog: "Debug_Log",
            errorLog: "Error_Log"
        },
        
        // DEFAULTS
        defaults: {
            // Firma
            nazovFirmy: "Názov firmy",
            ulica: "Ulica",
            psc: "PSČ",
            mesto: "Mesto",
            ico: "IČO",
            dic: "DIČ",
            icDph: "IČ DPH",
            
            // Telegram
            telegramBotToken: "Telegram Bot Token",
            telegramBotName: "Telegram Bot",
            povoleneTelegramSpravy: "Povoliť Telegram správy",
            predvolenaTelegramSkupina: "Predvolená Telegram skupina",
            telegramDochadzkaId: "Telegram Dochádzka ID",
            telegramGroupLink: "Telegram skupina dochádzky",
            
            // Notifikácie
            dochadzkaIndividualneNotifikacie: "Dochádzka individuálne notifikácie",
            dochadzkaSkupinoveNotifikacie: "Dochádzka skupinové notifikácie",
            oneskorenieNotifikacie: "Oneskorenie notifikácie (min)",
            oneskorenieSuhrnu: "Oneskorenie súhrnu (min)",
            
            // Reporting
            zahrnutStatistiky: "Zahrnúť štatistiky",
            zahrnutFinancneUdaje: "Zahrnúť finančné údaje",
            
            // Pracovný čas
            pracovnyCasOd: "Pracovný čas od",
            pracovnyCasDo: "Pracovný čas do",
            vikendoveSpravy: "Víkendové správy",
            
            // Systém
            debugMod: "Debug mód",
            uctovnyRok: "Účtovný rok"
        }
    };
    
    // ==============================================
    // FORMATS
    // ==============================================
    
    var FORMATS = {
        datetime: {
            default: "DD.MM.YYYY HH:mm",
            short: "DD.MM.YY HH:mm",
            long: "DD. MMMM YYYY HH:mm:ss",
            timestamp: "HH:mm:ss"
        },
        
        date: {
            default: "DD.MM.YYYY",
            short: "DD.MM.YY",
            long: "DD. MMMM YYYY",
            iso: "YYYY-MM-DD"
        },
        
        time: {
            default: "HH:mm",
            withSeconds: "HH:mm:ss",
            short: "H:mm"
        },
        
        money: {
            currency: "EUR",
            symbol: "€",
            decimals: 2,
            thousandsSeparator: " ",
            decimalSeparator: ","
        }
    };
    
    // ==============================================
    // MODULE DEFAULTS
    // ==============================================
    
    var MODULE_DEFAULTS = {
        core: {
            version: "6",
            debug: true,
            includeLineNumbers: true,
            includeStackTrace: false
        },
        
        ai: {
            version: "1.0",
            defaultProvider: "OpenAi",
            timeout: 30000,
            maxRetries: 3,
            cacheTimeout: 3600000,
            providers: {
                openai: {
                    model: "gpt-4-turbo-preview",
                    maxTokens: 4000,
                    temperature: 0.7
                },
                anthropic: {
                    model: "claude-3-opus-20240229",
                    maxTokens: 4000
                }
            }
        },
        
        telegram: {
            version: "1.0",
            api: {
                baseUrl: "https://api.telegram.org/bot",
                timeout: 30000
            },
            maxRetries: 3,
            retryDelays: [5000, 10000, 15000],
            rateLimit: {
                messagesPerSecond: 30,
                messagesPerMinute: 20
            }
        },
        
        business: {
            version: "1.0",
            workHoursPerDay: 8,
            overtimeThreshold: 8,
            weekendMultiplier: 1.5,
            holidayMultiplier: 2.0,
            roundToQuarterHour: true,
            quarterHourMinutes: 15
        },
        
        notifications: {
            version: "2.0",
            defaultPriority: "Normálna",
            defaultFormatting: "Markdown",
            defaultSource: "Automatická",
            maxRetries: 3,
            retryDelay: 5000,
            cleanupDays: 30
        }
    };
    
    // ==============================================
    // HELPER FUNCTIONS
    // ==============================================
    
    function deepMerge(target, source) {
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    if (!target[key]) target[key] = {};
                    deepMerge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }
        return target;
    }
    
    // ==============================================
    // CACHE MANAGEMENT
    // ==============================================
    
    var initialized = false;
    var configCache = {};
    var overrides = {};
    
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
        
        // Helper pre získanie atribútov
        getAttendanceAttributes: function() {
            initialize();
            return deepMerge({}, FIELD_MAPPINGS.attendanceAttributes);
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
            // Skús aj atribúty
            if (entity === 'attendance' && FIELD_MAPPINGS.attendanceAttributes[field]) {
                return FIELD_MAPPINGS.attendanceAttributes[field];
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