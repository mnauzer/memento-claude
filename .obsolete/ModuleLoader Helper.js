// ==============================================
// MODULE LOADER HELPER
// Verzia: 1.0 | Dátum: August 2025 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
//    - Jednotné načítanie všetkých modulov
//    - Lazy loading s error handling
//    - Centralizovaná konfigurácia
//    - Kompatibilita check
// ==============================================

var ModuleLoader = (function() {
    'use strict';
    
    // Cache pre načítané moduly
    var cache = {
        utils: null,
        config: null,
        notifications: null,
        telegram: null,
        entry: null
    };
    
    // Status tracking
    var status = {
        initialized: false,
        errors: [],
        warnings: []
    };
    
    /**
     * Získa MementoUtils s lazy loading
     */
    function loadUtils() {
        if (!cache.utils) {
            try {
                if (typeof MementoUtils !== 'undefined') {
                    cache.utils = MementoUtils;
                    log("✅ MementoUtils v" + cache.utils.version + " načítané");
                } else {
                    throw new Error("MementoUtils nie je definované");
                }
            } catch (error) {
                status.errors.push("MementoUtils: " + error.toString());
                throw new Error("KRITICKÁ CHYBA: MementoUtils knižnica nie je dostupná!");
            }
        }
        return cache.utils;
    }
    
    /**
     * Získa MementoConfig s inicializáciou
     */
    function loadConfig(moduleName) {
        if (!cache.config) {
            try {
                if (typeof MementoConfig !== 'undefined') {
                    MementoConfig.init();
                    cache.config = MementoConfig;
                    log("✅ MementoConfig v" + cache.config.version + " načítané");
                } else {
                    status.warnings.push("MementoConfig nie je dostupný - použijem fallback");
                    return null;
                }
            } catch (error) {
                status.warnings.push("MementoConfig: " + error.toString());
                return null;
            }
        }
        
        // Vráť konfiguráciu pre konkrétny modul
        if (moduleName && cache.config) {
            return cache.config.getConfig(moduleName);
        }
        
        return cache.config;
    }
    
    /**
     * Získa ASISTANTONotifications helper
     */
    function loadNotifications() {
        if (!cache.notifications) {
            try {
                if (typeof ASISTANTONotifications !== 'undefined') {
                    cache.notifications = ASISTANTONotifications;
                    log("✅ ASISTANTONotifications načítané");
                } else {
                    status.warnings.push("ASISTANTONotifications nie je dostupný");
                }
            } catch (error) {
                status.warnings.push("Notifications: " + error.toString());
            }
        }
        return cache.notifications;
    }
    
    /**
     * Získa ASISTANTOTelegram API
     */
    function loadTelegram() {
        if (!cache.telegram) {
            try {
                if (typeof ASISTANTOTelegram !== 'undefined') {
                    cache.telegram = ASISTANTOTelegram;
                    log("✅ ASISTANTOTelegram načítané");
                } else {
                    status.warnings.push("ASISTANTOTelegram nie je dostupný");
                }
            } catch (error) {
                status.warnings.push("Telegram: " + error.toString());
            }
        }
        return cache.telegram;
    }
    
    /**
     * Získa aktuálny entry (kompatibilné s Action mode)
     */
    function loadEntry() {
        if (!cache.entry) {
            try {
                // Štandardný mód
                if (typeof entry !== 'undefined' && entry()) {
                    cache.entry = entry();
                    log("✅ Entry načítané (štandardný mód)");
                }
                // Action mód
                else if (typeof lib !== 'undefined') {
                    var selected = lib().entries();
                    if (selected && selected.length > 0) {
                        cache.entry = selected[0];
                        log("✅ Entry načítané (action mód) - " + selected.length + " záznamov");
                    }
                }
                
                if (!cache.entry) {
                    throw new Error("Žiadny entry nie je dostupný");
                }
            } catch (error) {
                status.errors.push("Entry: " + error.toString());
                throw new Error("KRITICKÁ CHYBA: Nie je možné získať aktuálny záznam!");
            }
        }
        return cache.entry;
    }
    
    /**
     * Vytvorí konfiguráciu pre script
     */
    function buildScriptConfig(scriptName, version, fallbackConfig) {
        var config = null;
        
        // 1. Pokus o centrálny config
        var centralConfig = loadConfig('attendance');
        
        if (centralConfig) {
            // Použij centrálny config
            config = {
                debug: true,
                version: version,
                scriptName: scriptName,
                
                // Field mappings
                fields: centralConfig.fieldMappings.attendance,
                attributes: centralConfig.fieldMappings.attendanceAttributes,
                
                // Libraries
                libraries: centralConfig.libraries.business,
                
                // Dodatočné field mappings
                sadzbyFields: centralConfig.fieldMappings.employeeRates,
                zavazkyFields: centralConfig.fieldMappings.obligations,
                defaultsFields: centralConfig.fieldMappings.defaults,
                
                // Business settings
                settings: {
                    roundToQuarterHour: true,
                    quarterHourMinutes: 15
                }
            };
            
            log("✅ Používam centralizovanú konfiguráciu");
        } else {
            // Použij fallback
            config = fallbackConfig;
            log("⚠️ Používam lokálnu konfiguráciu (fallback)");
        }
        
        return config;
    }
    
    /**
     * Inicializuje všetky moduly
     */
    function initialize() {
        if (status.initialized) return true;
        
        try {
            log("🚀 === INICIALIZÁCIA MODULE LOADER ===");
            
            // Povinné moduly
            loadUtils();
            loadEntry();
            
            // Voliteľné moduly
            loadConfig();
            loadNotifications();
            loadTelegram();
            
            status.initialized = true;
            
            // Report status
            reportStatus();
            
            return true;
            
        } catch (error) {
            log("💥 KRITICKÁ CHYBA: " + error.toString());
            return false;
        }
    }
    
    /**
     * Vypíše status report
     */
    function reportStatus() {
        var utils = cache.utils;
        if (!utils) return;
        
        var report = "📊 MODULE LOADER STATUS:\n";
        report += "========================\n";
        
        // Načítané moduly
        report += "✅ NAČÍTANÉ:\n";
        if (cache.utils) report += "  • MementoUtils v" + cache.utils.version + "\n";
        if (cache.config) report += "  • MementoConfig v" + cache.config.version + "\n";
        if (cache.notifications) report += "  • ASISTANTONotifications\n";
        if (cache.telegram) report += "  • ASISTANTOTelegram\n";
        if (cache.entry) report += "  • Entry (ID: " + (cache.entry.field("ID") || "N/A") + ")\n";
        
        // Warnings
        if (status.warnings.length > 0) {
            report += "\n⚠️ UPOZORNENIA:\n";
            for (var i = 0; i < status.warnings.length; i++) {
                report += "  • " + status.warnings[i] + "\n";
            }
        }
        
        // Errors
        if (status.errors.length > 0) {
            report += "\n❌ CHYBY:\n";
            for (var j = 0; j < status.errors.length; j++) {
                report += "  • " + status.errors[j] + "\n";
            }
        }
        
        utils.addDebug(cache.entry, report);
    }
    
    /**
     * Interný log
     */
    function log(message) {
        if (cache.utils && cache.entry) {
            cache.utils.addDebug(cache.entry, "[ModuleLoader] " + message);
        }
    }
    
    /**
     * Reset cache (pre testing)
     */
    function reset() {
        cache = {
            utils: null,
            config: null,
            notifications: null,
            telegram: null,
            entry: null
        };
        status = {
            initialized: false,
            errors: [],
            warnings: []
        };
    }
    
    // ==============================================
    // PUBLIC API
    // ==============================================
    
    return {
        // Verzia
        version: "1.0",
        
        // Hlavné funkcie
        init: initialize,
        reset: reset,
        
        // Gettery pre moduly
        getUtils: function() {
            if (!status.initialized) initialize();
            return cache.utils;
        },
        
        getConfig: function(moduleName) {
            if (!status.initialized) initialize();
            return loadConfig(moduleName);
        },
        
        getNotifications: function() {
            if (!status.initialized) initialize();
            return cache.notifications;
        },
        
        getTelegram: function() {
            if (!status.initialized) initialize();
            return cache.telegram;
        },
        
        getEntry: function() {
            if (!status.initialized) initialize();
            return cache.entry;
        },
        
        // Helper funkcie
        buildScriptConfig: buildScriptConfig,
        
        // Status
        getStatus: function() {
            return {
                initialized: status.initialized,
                hasErrors: status.errors.length > 0,
                hasWarnings: status.warnings.length > 0,
                errors: status.errors.slice(),
                warnings: status.warnings.slice()
            };
        },
        
        // Quick check
        isReady: function() {
            return status.initialized && cache.utils && cache.entry;
        }
    };
})();

// ==============================================
// GLOBAL EXPORT
// ==============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModuleLoader;
}