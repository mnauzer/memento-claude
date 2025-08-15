// ==============================================
// MEMENTO DATABASE - UNIVERZÁLNA UTILITY KNIŽNICA
// Verzia: 2.1 | Dátum: 12.08.2025 | Autor: ASISTANTO
// ==============================================
// ✅ NOVÉ v2.1 - COMPLETE AI INTEGRATION:
//    - Všetky funkcie z MementoUtils-implemented.js
//    - AI Functions: callAI, aiAnalyzeEntry, aiGenerateSQL
//    - API Key Management: getApiKey, getCachedApiKey, testApiKeys
//    - Enhanced SQL: smartSQL, sqlWithAIInterpretation
//    - AI Provider Configuration pre OpenAI, Perplexity, OpenRouter
//    - Missing functions: calculateHours, isWeekend
//    - Kompletná backward compatibility s v2.0
// ✅ ZACHOVANÉ v2.0 funkcie:
//    - Všetky existujúce funkcie pre Záznam prác compatibility
//    - Safe field access patterns
//    - Robustné error handling
//    - Formatting a validation utilities
// ==============================================
// Knižnica obsahuje najčastejšie používané funkcie
// pre všetky Memento scripty vrátane AI integrácie
// Import: var MementoUtils = require("MementoUtils.js");
// ==============================================

var MementoUtils = (function() {
    'use strict';
    
    // ========================================
    // KONFIGURAČNÉ KONŠTANTY
    // ========================================
    var DEFAULT_CONFIG = {
        debugFieldName: "Debug_Log",
        errorFieldName: "Error_Log",
        infoFieldName: "info",
        viewFieldName: "view",
        dateFormat: "DD.MM.YY HH:mm",
        timestampFormat: "HH:mm:ss",
        fullTimestampFormat: "YYYY-MM-DD HH:mm:ss",
        
        // v2.0 - Časové konfigurácie
        timeFormat: "HH:mm",
        quarterRoundingMinutes: 15,
        maxWorkHours: 24,
        minWorkHours: 0.5,
        defaultLibraryName: "ASISTANTO Defaults",
        
        // v2.1 - AI konfigurácie
        defaultAIProvider: "OpenAi",
        apiCacheTimeout: 3600000, // 1 hodina v ms
        maxApiRetries: 2,
        apiTimeout: 30000 // 30 sekúnd
    };
    
    // ========================================
    // v2.1 - AI PROVIDER CONFIGURATION
    // ========================================
    var AI_PROVIDERS = {
        "OpenAi": {
            name: "OpenAi",
            baseUrl: "https://api.openai.com/v1/chat/completions",
            defaultModel: "gpt-4o-mini",
            headers: function(apiKey) {
                return {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + apiKey
                };
            },
            requestBody: function(prompt, options) {
                return {
                    model: options.model || "gpt-4o-mini",
                    messages: [{
                        role: "user",
                        content: prompt
                    }],
                    max_tokens: options.maxTokens || 1000,
                    temperature: options.temperature || 0.7
                };
            },
            extractResponse: function(data) {
                return data.choices && data.choices[0] && data.choices[0].message 
                    ? data.choices[0].message.content 
                    : "No response";
            }
        },
        
        "Perplexity": {
            name: "Perplexity",
            baseUrl: "https://api.perplexity.ai/chat/completions",
            defaultModel: "llama-3.1-sonar-small-128k-online",
            headers: function(apiKey) {
                return {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + apiKey
                };
            },
            requestBody: function(prompt, options) {
                return {
                    model: options.model || "llama-3.1-sonar-small-128k-online",
                    messages: [{
                        role: "user",
                        content: prompt
                    }],
                    max_tokens: options.maxTokens || 1000,
                    temperature: options.temperature || 0.7
                };
            },
            extractResponse: function(data) {
                return data.choices && data.choices[0] && data.choices[0].message 
                    ? data.choices[0].message.content 
                    : "No response";
            }
        },
        
        "OpenRouter": {
            name: "OpenRouter",
            baseUrl: "https://openrouter.ai/api/v1/chat/completions",
            defaultModel: "meta-llama/llama-3.1-8b-instruct:free",
            headers: function(apiKey) {
                return {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + apiKey
                };
            },
            requestBody: function(prompt, options) {
                return {
                    model: options.model || "meta-llama/llama-3.1-8b-instruct:free",
                    messages: [{
                        role: "user",
                        content: prompt
                    }],
                    max_tokens: options.maxTokens || 1000,
                    temperature: options.temperature || 0.7
                };
            },
            extractResponse: function(data) {
                return data.choices && data.choices[0] && data.choices[0].message 
                    ? data.choices[0].message.content 
                    : "No response";
            }
        }
    };
    
    // ========================================
    // v2.1 - API KEY CACHE
    // ========================================
    var apiKeyCache = {};
    
    // ========================================
    // DEBUG A ERROR HANDLING (v1.0 + v2.0)
    // ========================================
    
    /**
     * Pridá debug správu do Debug_Log poľa
     * @param {Entry} entry - Entry objekt
     * @param {string} message - Debug správa
     * @param {Object} config - Konfigurácia (optional)
     */
    function addDebug(entry, message, ctx, config) {
    config = config || DEFAULT_CONFIG;
    if (!entry) return;
    try {
        var ts = moment().format(config.dateFormat);
        var log = "[" + ts + "] " + message;
        if (ctx) {
            if (ctx.location) log += " (" + ctx.location + ")";
            if (config.includeLineNumbers && ctx.lineNumber)
                log += " [Riadok: " + ctx.lineNumber + "]";
            if (ctx.data) log += " | Data: " + JSON.stringify(ctx.data);
        }
        var existing = safeFieldAccess(entry, config.debugFieldName || DEFAULT_CONFIG.debugFieldName, "");
        entry.set(config.debugFieldName || DEFAULT_CONFIG.debugFieldName, existing + log + "\n");
    } catch (e) {
        //addError(entry, e2, "addDebug", config);
        addError(entry, e, "safeSet:" + fieldName);
        return false;
    }
    }

    
    function extractErrorInfo(errorObj) {
    var info = { type: "Error", message: String(errorObj), lineNumber: null, stack: null };
    try {
        if (typeof errorObj === "object" && errorObj) {
            if (errorObj.name) info.type = errorObj.name;
            if (errorObj.message) info.message = errorObj.message;
            if (typeof errorObj.lineNumber === "number") info.lineNumber = errorObj.lineNumber;
            if (errorObj.stack) info.stack = errorObj.stack;
        }
    } catch(_) {}
    return info;
    }

    /**
     * Pridá error správu do Error_Log poľa
     * @param {Entry} entry - Entry objekt
     * @param {string} errorMessage - Error správa
     * @param {string} version - Verzia scriptu (optional)
     * @param {Object} config - Konfigurácia (optional)
     */
    function addError(entry, errorObj, location, config) {
    config = config || DEFAULT_CONFIG;
    if (!entry) return;
    try {
        var ts = moment().format(config.fullTimestampFormat || DEFAULT_CONFIG.fullTimestampFormat);
        var log = "[" + ts + "] ❌ ";
        if (typeof errorObj === "object") {
            var ei = extractErrorInfo(errorObj);
            log += ei.type;
            if (location) log += " (" + location + ")";
            if (config.includeLineNumbers && ei.lineNumber != null)
                log += " [Riadok: " + ei.lineNumber + "]";
            log += ": " + ei.message;
            if (config.includeStackTrace && ei.stack) log += "\n" + ei.stack;
        } else {
            if (location) log += "(" + location + ")";
            log += ": " + String(errorObj);
        }
        var existing = safeFieldAccess(entry, config.errorFieldName || DEFAULT_CONFIG.errorFieldName, "");
        entry.set(config.errorFieldName || DEFAULT_CONFIG.errorFieldName, existing + log + "\n");
    } catch (e) {
        message("Log error failed: " + e);
    }
    }

    
    /**
     * Pridá info záznam s detailmi o automatickej akcii
     * @param {Entry} entry - Entry objekt
     * @param {string} action - Popis akcie
     * @param {Object} details - Detaily (sourceId, libraryName, reason, etc.)
     * @param {Object} config - Konfigurácia (optional)
     */
    function addInfo(entry, action, details, config) {
        config = config || DEFAULT_CONFIG;
        if (!entry || !action) return;
        
        try {
            var timestamp = moment().format(DEFAULT_CONFIG.dateFormat);
            var infoMessage = "📋 [" + timestamp + "] " + action;
            
            if (details) {
                if (details.sourceId) infoMessage += "\n   • Zdroj: #" + details.sourceId;
                if (details.libraryName) infoMessage += " (" + details.libraryName + ")";
                if (details.reason) infoMessage += "\n   • Dôvod: " + details.reason;
                if (details.method) infoMessage += "\n   • Metóda: " + details.method;
                if (details.result) infoMessage += "\n   • Výsledok: " + details.result;
            }
            
            var fieldName = config.infoFieldName || DEFAULT_CONFIG.infoFieldName;
            var existingInfo = safeFieldAccess(entry, fieldName, "");
            entry.set(fieldName, existingInfo + infoMessage + "\n");
        } catch (e) {
            addError(entry, e, "Info logging failed: " + e, null, config);
        }
    }
    
    // ========================================
    // NULL-SAFE FIELD ACCESS (v1.0 + v2.0)
    // ========================================
    
    /**
     * Bezpečný prístup k poliam s default hodnotou
     * @param {Entry} entry - Entry objekt
     * @param {string} fieldName - Názov poľa
     * @param {any} defaultValue - Default hodnota ak pole neexistuje
     * @return {any} Hodnota poľa alebo default
     */
    function safeFieldAccess(entry, fieldName, defaultValue) {
        if (!entry || !fieldName) return defaultValue || null;
        
        try {
            var value = entry.field(fieldName);
            return (value !== null && value !== undefined) ? value : (defaultValue || null);
        } catch (error) {
            return defaultValue || null;
        }
    }
    
    /**
     * v2.0 - Alias pre safeFieldAccess pre jednoduchšie volanie
     * @param {Entry} entry - Entry objekt
     * @param {string} fieldName - Názov poľa
     * @param {any} defaultValue - Default hodnota
     * @return {any} Hodnota poľa alebo default
     */
    function safeGet(entry, fieldName, defaultValue) {
        return safeFieldAccess(entry, fieldName, defaultValue);
    }
    
    /**
     * v2.0 - Bezpečné nastavenie hodnoty poľa
     * @param {Entry} entry - Entry objekt
     * @param {string} fieldName - Názov poľa
     * @param {any} value - Nová hodnota
     * @return {boolean} True ak úspešné, false ak nie
     */
    function safeSet(entry, fieldName, value) {
        if (!entry || !fieldName) return false;
        
        try {
            entry.set(fieldName, value);
            return true;
        } catch (error) {
            addError(entry, e, "Failed to set field '" + fieldName + "': " + error.toString(), "safeSet");
            return false;
        }
    }
    
    /**
     * Získanie prvého linku z Link to Entry poľa
     * @param {Entry} entry - Entry objekt
     * @param {string} fieldName - Názov poľa
     * @return {Entry|null} Prvý linknutý entry alebo null
     */
    function safeGetFirstLink(entry, fieldName) {
        var links = safeFieldAccess(entry, fieldName, []);
        return (links && links.length > 0) ? links[0] : null;
    }
    
    /**
     * Získanie všetkých linkov z Link to Entry poľa
     * @param {Entry} entry - Entry objekt
     * @param {string} fieldName - Názov poľa
     * @return {Array} Array linknutých entries alebo []
     */
    function safeGetLinks(entry, fieldName) {
        var links = safeFieldAccess(entry, fieldName, []);
        return links || [];
    }
    
    // ========================================
    // LINKS FROM OPERÁCIE (v1.0 + v2.1)
    // ========================================
    
    /**
     * Bezpečné LinksFrom volanie s error handlingom
     * @param {Entry} sourceEntry - Zdrojový entry objekt  
     * @param {string} targetLibrary - Názov cieľovej knižnice
     * @param {string} linkField - Názov poľa ktoré odkazuje späť
     * @param {Entry} debugEntry - Entry pre debug log (optional)
     * @return {Array} Array linknutých entries alebo []
     */
    function safeLinksFrom(sourceEntry, targetLibrary, linkField, debugEntry) {
        if (!sourceEntry || !targetLibrary || !linkField) return [];
        
        try {
            var results = sourceEntry.linksFrom(targetLibrary, linkField);
            
            if (debugEntry) {
                var count = results ? results.length : 0;
                addDebug(debugEntry, "✅ LinksFrom '" + targetLibrary + "': " + count + " záznamov");
            }
            
            return results || [];
        } catch (error) {
            if (debugEntry) {
                addError(debugEntry, "LinksFrom failed: " + error.toString(), "safeLinksFrom");
            }
            return [];
        }
    }
    
    /**
     * Hľadanie linkov s variáciami názvov polí
     * @param {Entry} sourceEntry - Zdrojový entry
     * @param {string} targetLibrary - Názov cieľovej knižnice
     * @param {Array} fieldVariations - Možné názvy polí ["Pole1", "pole1", "POLE1"]
     * @param {Entry} debugEntry - Entry pre debug log (optional)
     * @return {Array} Array linknutých entries alebo []
     */
    function findLinksWithVariations(sourceEntry, targetLibrary, fieldVariations, debugEntry) {
        if (!sourceEntry || !targetLibrary || !fieldVariations) return [];
        
        for (var i = 0; i < fieldVariations.length; i++) {
            var fieldName = fieldVariations[i];
            var results = safeLinksFrom(sourceEntry, targetLibrary, fieldName, null);
            
            if (results && results.length > 0) {
                if (debugEntry) {
                    addDebug(debugEntry, "✅ Found links using field '" + fieldName + "'");
                }
                return results;
            }
        }
        
        if (debugEntry) {
            addDebug(debugEntry, "⚠️ No links found with any variation: " + fieldVariations.join(", "));
        }
        return [];
    }
    
    // ========================================
    // ATRIBÚTY HANDLING (v1.0 + v2.0)
    // ========================================
    
    /**
     * Bezpečné nastavenie atribútu s SPRÁVNOU SYNTAX!
     * @param {Entry} entry - Entry objekt
     * @param {string} fieldName - Názov poľa
     * @param {number} index - Index v multi-select poli
     * @param {string} attributeName - Názov atribútu
     * @param {any} value - Hodnota atribútu
     * @return {boolean} True ak úspešné, false ak nie
     */
    function safeSetAttribute(entry, fieldName, index, attributeName, value) {
        if (!entry || !fieldName || typeof index !== "number" || !attributeName) return false;
        
        try {
            entry.setAttr(fieldName, index, attributeName, value);
            return true;
        } catch (error) {
            
            addError(entry, e, "Failed to set attribute '" + attributeName + "' on field '" + fieldName + "[" + index + "]': " + error.toString(), "safeSetAttribute");
            //addError(entry, e, "safeSet:" + fieldName);
            return false;
        }
    }
    
    /**
     * v2.0 - Alias pre safeSetAttribute pre backward compatibility
     * @param {Entry} entry - Entry objekt  
     * @param {string} fieldName - Názov poľa
     * @param {number} index - Index v multi-select poli
     * @param {string} attributeName - Názov atribútu
     * @param {any} value - Hodnota atribútu
     * @return {boolean} True ak úspešné, false ak nie
     */
    function safeSetAttr(entry, fieldName, index, attributeName, value) {
        return safeSetAttribute(entry, fieldName, index, attributeName, value);
    }
    
    /**
     * Bezpečné získanie atribútu
     * @param {Entry} entry - Entry objekt
     * @param {string} fieldName - Názov poľa
     * @param {number|string} indexOrName - Index alebo názov objektu v poli
     * @param {string} attrName - Názov atribútu
     * @param {any} defaultValue - Default hodnota
     * @return {any} Hodnota atribútu alebo default
     */
    function safeGetAttribute(entry, fieldName, indexOrName, attrName, defaultValue) {
        if (!entry || !fieldName || !attrName) return defaultValue || null;
        
        try {
            var field = entry.field(fieldName);
            if (!field) return defaultValue || null;
            
            if (typeof indexOrName === "number") {
                if (field[indexOrName]) {
                    return field[indexOrName].attr(attrName) || defaultValue || null;
                }
            } else {
                for (var i = 0; i < field.length; i++) {
                    if (field[i].field && field[i].field("Name") === indexOrName) {
                        return field[i].attr(attrName) || defaultValue || null;
                    }
                }
            }
        } catch (error) {
            return defaultValue || null;
        }
        return defaultValue || null;
    }
    
    // ========================================
    // v2.0 + v2.1 - ČASOVÉ UTILITY FUNKCIE
    // ========================================
    
    /**
     * Formátovanie času do HH:mm formátu
     * @param {any} timeValue - Časová hodnota (Date, string, moment)
     * @return {string} Formátovaný čas alebo "00:00"
     */
    function formatTime(timeValue) {
        if (!timeValue) return "00:00";
        
        try {
            if (typeof timeValue === "string" && timeValue.match(/^\d{2}:\d{2}$/)) {
                return timeValue;
            }
            
            var momentTime = moment(timeValue);
            if (momentTime.isValid()) {
                return momentTime.format(DEFAULT_CONFIG.timeFormat);
            }
            
            if (timeValue instanceof Date) {
                var hours = timeValue.getHours().toString();
                var minutes = timeValue.getMinutes().toString();
                if (hours.length === 1) hours = "0" + hours;
                if (minutes.length === 1) minutes = "0" + minutes;
                return hours + ":" + minutes;
            }
            
            return "00:00";
        } catch (error) {
            return "00:00";
        }
    }
    
    /**
     * Zaokrúhlenie času na najbližších 15 minút
     * @param {any} timeValue - Časová hodnota
     * @return {any} Zaokrúhlený čas v pôvodnom formáte
     */
    function roundToQuarter(timeValue) {
        if (!timeValue) return null;
        
        try {
            var momentTime = moment(timeValue);
            if (!momentTime.isValid()) return timeValue;
            
            var minutes = momentTime.minutes();
            var roundedMinutes = Math.round(minutes / DEFAULT_CONFIG.quarterRoundingMinutes) * DEFAULT_CONFIG.quarterRoundingMinutes;
            
            if (roundedMinutes >= 60) {
                momentTime.add(1, 'hour');
                roundedMinutes = 0;
            }
            
            return momentTime.minutes(roundedMinutes).seconds(0).milliseconds(0);
        } catch (error) {
            return timeValue;
        }
    }
    
    /**
     * Výpočet rozdielu medzi dvoma časmi v hodinách
     * @param {any} startTime - Začiatočný čas
     * @param {any} endTime - Koncový čas  
     * @return {number} Rozdiel v hodinách alebo 0
     */
    function calculateTimeDifference(startTime, endTime) {
        if (!startTime || !endTime) return 0;
        
        try {
            var start = moment(startTime);
            var end = moment(endTime);
            
            if (!start.isValid() || !end.isValid()) return 0;
            
            if (end.isBefore(start)) {
                end.add(1, 'day');
            }
            
            var diffMs = end.diff(start);
            var diffHours = diffMs / (1000 * 60 * 60);
            
            if (diffHours < 0 || diffHours > DEFAULT_CONFIG.maxWorkHours) return 0;
            if (diffHours < DEFAULT_CONFIG.minWorkHours) return 0;
            
            return Math.round(diffHours * 100) / 100;
        } catch (error) {
            return 0;
        }
    }
    
    /**
     * v2.1 - Výpočet hodín medzi dvoma časmi (alias pre calculateTimeDifference)
     * @param {any} startTime - Začiatočný čas
     * @param {any} endTime - Koncový čas
     * @return {number} Počet hodín
     */
    function calculateHours(startTime, endTime) {
        return calculateTimeDifference(startTime, endTime);
    }
    
    /**
     * v2.1 - Kontrola či je zadaný dátum víkend
     * @param {Date|string} dateValue - Dátum na kontrolu
     * @return {boolean} True ak je víkend (sobota alebo nedeľa)
     */
    function isWeekend(dateValue) {
        if (!dateValue) return false;
        
        try {
            var momentDate = moment(dateValue);
            if (!momentDate.isValid()) return false;
            
            var dayOfWeek = momentDate.day(); // 0 = nedeľa, 6 = sobota
            return dayOfWeek === 0 || dayOfWeek === 6;
        } catch (error) {
            return false;
        }
    }
    
    // ========================================
    // v2.1 - AI API KEY MANAGEMENT
    // ========================================
 
    /**
     * Získanie API kľúča z knižnice ASISTANTO API s podporou rôznych názvov polí
     * @param {string} providerName - Názov providera ("OpenAi", "Perplexity", "OpenRouter")
     * @param {Entry} debugEntry - Entry pre debug log
     * @return {string|null} API kľúč alebo null
     */
    function getApiKey(providerName, debugEntry) {
        if (!providerName) return null;
        
        try {
            var apiLib = libByName("ASISTANTO API");
            if (!apiLib) {
                if (debugEntry) addError(debugEntry, "ASISTANTO API knižnica nenájdená", "getApiKey");
                return null;
            }
            
            // Možné názvy polí pre Provider
            var providerFieldNames = ["Provider", "provider", "PROVIDER"];
            var apiKeyFieldNames = ["API_Key", "api", "api_key", "API"];
            
            var allEntries = apiLib.entries();
            if (debugEntry) addDebug(debugEntry, "🔍 Hľadám API kľúč pre " + providerName + " v " + allEntries.length + " záznamoch");
            
            for (var i = 0; i < allEntries.length; i++) {
                var apiEntry = allEntries[i];
                
                // Skús nájsť provider field
                var provider = null;
                for (var p = 0; p < providerFieldNames.length; p++) {
                    try {
                        provider = apiEntry.field(providerFieldNames[p]);
                        if (provider) break;
                    } catch (e) {}
                }
                
                // Ak sa provider zhoduje
                if (provider && provider === providerName) {
                    // Skús nájsť API key field
                    var apiKey = null;
                    for (var k = 0; k < apiKeyFieldNames.length; k++) {
                        try {
                            apiKey = apiEntry.field(apiKeyFieldNames[k]);
                            if (apiKey && apiKey.length > 0) {
                                if (debugEntry) addDebug(debugEntry, "✅ API kľúč pre " + providerName + " nájdený (pole: " + apiKeyFieldNames[k] + ")");
                                return apiKey;
                            }
                        } catch (e) {}
                    }
                    
                    if (debugEntry) addError(debugEntry, "Prázdny API kľúč pre " + providerName, "getApiKey");
                    return null;
                }
            }
            
            if (debugEntry) addError(debugEntry, "API kľúč pre " + providerName + " nenájdený v žiadnom zázname", "getApiKey");
            return null;
            
        } catch (e) {
            if (debugEntry) addError(debugEntry, "Chyba pri načítaní API kľúča: " + e.toString(), "getApiKey");
            return null;
        }
}


    /**
     * Cached verzia getApiKey s timeout
     * OPRAVENÉ: Podporuje všetky parametre
     */
    function getCachedApiKey(providerName, libraryName, debugEntry) {
        libraryName = libraryName || "ASISTANTO API";
        
        var now = new Date().getTime();
        var cacheKey = "apikey_" + providerName + "_" + libraryName;
        
        // Check cache
        if (apiKeyCache[cacheKey] && 
            apiKeyCache[cacheKey].timestamp + DEFAULT_CONFIG.apiCacheTimeout > now) {
            return apiKeyCache[cacheKey].key;
        }
        
        // Load fresh key
        var apiKey = getApiKey(providerName, libraryName, debugEntry);
        if (apiKey) {
            apiKeyCache[cacheKey] = {
                key: apiKey,
                timestamp: now
            };
        }
        
        return apiKey;
    }

    /**
     * Test dostupnosti API kľúčov
     * OPRAVENÉ: Aktualizované pre nové parametre
     */
    function testApiKeys(providers, libraryName, debugEntry) {
        libraryName = libraryName || "ASISTANTO API";
        
        var results = {
            success: [],
            failed: [],
            total: 0
        };
        
        if (!providers) providers = ["OpenAi", "Perplexity", "OpenRouter", "Telegram"];
        results.total = providers.length;
        
        for (var i = 0; i < providers.length; i++) {
            var provider = providers[i];
            var apiKey = getCachedApiKey(provider, libraryName, debugEntry);
            
            if (apiKey) {
                results.success.push(provider);
                if (debugEntry) addDebug(debugEntry, "✅ API kľúč pre " + provider + " dostupný");
            } else {
                results.failed.push(provider);
                if (debugEntry) addDebug(debugEntry, "❌ API kľúč pre " + provider + " chýba");
            }
        }
        
        return results;
    }


    //----------------


    
    /**
     * Vyčistenie cache API kľúčov
     */
    function clearApiKeyCache() {
        apiKeyCache = {};
    }

    // ========================================
    // v2.1 - AI FUNCTIONS
    // ========================================
    
 // ==============================================
// MementoUtils HTTP HEADERS FIX
// ==============================================
// Nahraď funkciu callAI v MementoUtils týmto kódom:

    /**
     * Univerzálne volanie AI providera - OPRAVENÁ VERZIA
     * @param {string} provider - Názov providera ("OpenAi", "Perplexity", "OpenRouter")
     * @param {string} prompt - Prompt pre AI
     * @param {Object} options - Nastavenia {model, maxTokens, temperature, debugEntry}
     * @return {Object} {success: boolean, response: string, error: string}
     */
    function callAI(provider, prompt, options) {
        options = options || {};
        var debugEntry = options.debugEntry;
        
        if (!provider || !prompt) {
            var error = "Missing provider or prompt";
            if (debugEntry) addError(debugEntry, "AI Call failed: " + error, "callAI");
            return {success: false, error: error, response: null};
        }
        
        // Získaj API kľúč
        var apiKey = getCachedApiKey(provider, debugEntry);
        if (!apiKey) {
            var error = "API key not found for " + provider;
            if (debugEntry) addError(debugEntry, "AI Call failed: " + error, "callAI");
            return {success: false, error: error, response: null};
        }
        
        // Získaj konfiguráciu providera
        var providerConfig = AI_PROVIDERS[provider];
        if (!providerConfig) {
            var error = "Unsupported AI provider: " + provider;
            if (debugEntry) addError(debugEntry, "AI Call failed: " + error, "callAI");
            return {success: false, error: error, response: null};
        }
        
        try {
            if (debugEntry) {
                addDebug(debugEntry, "🤖 AI Call: " + provider + " (" + (options.model || providerConfig.defaultModel) + ")");
                addDebug(debugEntry, "📝 Prompt: " + prompt.substring(0, 100) + "...");
            }
            
            // Priprav HTTP request
            var httpObj = http();
            
            // OPRAVA: V Memento Database sa headers nastavujú takto:
            var headers = providerConfig.headers(apiKey);
            httpObj.headers(headers);  // ✅ SPRÁVNE - headers() nie header()
            
            // Priprav request body
            options.model = options.model || providerConfig.defaultModel;
            var requestBody = providerConfig.requestBody(prompt, options);
            
            // Vykonaj API call
            var response = httpObj.post(providerConfig.baseUrl, JSON.stringify(requestBody));
            
            if (response.code === 200) {
                var data = JSON.parse(response.body);
                var aiResponse = providerConfig.extractResponse(data);
                
                if (debugEntry) {
                    addDebug(debugEntry, "✅ AI response received: " + aiResponse.substring(0, 100) + "...");
                }
                
                return {
                    success: true,
                    response: aiResponse,
                    provider: provider,
                    model: options.model
                };
            } else {
                var error = "HTTP " + response.code + ": " + response.body;
                if (debugEntry) addError(debugEntry, "AI API error: " + error, "callAI");
                return {success: false, error: error, response: null};
            }
            
        } catch (e) {
            var error = "AI Call exception: " + e.toString();
            if (debugEntry) addError(debugEntry, error, "callAI");
            return {success: false, error: error, response: null};
        }
    }

    // ==============================================
    // ALTERNATÍVNE: Kompletná oprava s retry logikou
    // ==============================================

    /**
     * Univerzálne volanie AI providera s retry logikou
     * @param {string} provider - Názov providera
     * @param {string} prompt - Prompt pre AI
     * @param {Object} options - Nastavenia
     * @return {Object} {success: boolean, response: string, error: string}
     */
    function callAIWithRetry(provider, prompt, options) {
        options = options || {};
        var debugEntry = options.debugEntry;
        var maxRetries = options.maxRetries || DEFAULT_CONFIG.maxApiRetries || 2;
        var retryDelay = options.retryDelay || 1000; // 1 sekunda
        
        if (!provider || !prompt) {
            var error = "Missing provider or prompt";
            if (debugEntry) addError(debugEntry, "AI Call failed: " + error, "callAI");
            return {success: false, error: error, response: null};
        }
        
        // Získaj API kľúč
        var apiKey = getCachedApiKey(provider, debugEntry);
        if (!apiKey) {
            var error = "API key not found for " + provider;
            if (debugEntry) addError(debugEntry, "AI Call failed: " + error, "callAI");
            return {success: false, error: error, response: null};
        }
        
        // Získaj konfiguráciu providera
        var providerConfig = AI_PROVIDERS[provider];
        if (!providerConfig) {
            var error = "Unsupported AI provider: " + provider;
            if (debugEntry) addError(debugEntry, "AI Call failed: " + error, "callAI");
            return {success: false, error: error, response: null};
        }
        
        // Retry loop
        for (var attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (debugEntry && attempt > 0) {
                    addDebug(debugEntry, "🔄 Retry attempt " + attempt + "/" + maxRetries);
                }
                
                if (debugEntry) {
                    addDebug(debugEntry, "🤖 AI Call: " + provider + " (" + (options.model || providerConfig.defaultModel) + ")");
                    if (attempt === 0) {
                        addDebug(debugEntry, "📝 Prompt: " + prompt.substring(0, 100) + "...");
                    }
                }
                
                // Priprav HTTP request
                var httpObj = http();
                
                // SPRÁVNE nastavenie headers pre Memento
                var headers = providerConfig.headers(apiKey);
                httpObj.headers(headers);
                
                // Timeout ak je podporovaný
                if (httpObj.setTimeout) {
                    httpObj.setTimeout(options.timeout || DEFAULT_CONFIG.apiTimeout || 30000);
                }
                
                // Priprav request body
                options.model = options.model || providerConfig.defaultModel;
                var requestBody = providerConfig.requestBody(prompt, options);
                
                // Debug request body pre troubleshooting
                if (debugEntry && options.debugVerbose) {
                    addDebug(debugEntry, "📤 Request body: " + JSON.stringify(requestBody).substring(0, 200) + "...");
                }
                
                // Vykonaj API call
                var response = httpObj.post(providerConfig.baseUrl, JSON.stringify(requestBody));
                
                if (response.code === 200) {
                    var data = JSON.parse(response.body);
                    var aiResponse = providerConfig.extractResponse(data);
                    
                    if (!aiResponse || aiResponse.length === 0) {
                        throw new Error("Empty response from AI provider");
                    }
                    
                    if (debugEntry) {
                        addDebug(debugEntry, "✅ AI response received: " + aiResponse.substring(0, 100) + "...");
                    }
                    
                    return {
                        success: true,
                        response: aiResponse,
                        provider: provider,
                        model: options.model,
                        attempts: attempt + 1
                    };
                    
                } else if (response.code >= 500 && attempt < maxRetries) {
                    // Server error - retry
                    if (debugEntry) {
                        addDebug(debugEntry, "⚠️ Server error " + response.code + ", will retry...");
                    }
                    // Wait before retry
                    java.lang.Thread.sleep(retryDelay);
                    continue;
                    
                } else {
                    // Client error or final attempt
                    var error = "HTTP " + response.code + ": " + response.body;
                    if (debugEntry) addError(debugEntry, "AI API error: " + error, "callAI");
                    
                    // Ak je to posledný pokus, vráť chybu
                    if (attempt === maxRetries) {
                        return {success: false, error: error, response: null};
                    }
                }
                
            } catch (e) {
                var error = "AI Call exception: " + e.toString();
                if (debugEntry) addError(debugEntry, error + " (attempt " + (attempt + 1) + ")", "callAI");
                
                // Ak je to posledný pokus, vráť chybu
                if (attempt === maxRetries) {
                    return {success: false, error: error, response: null};
                }
                
                // Wait before retry
                if (attempt < maxRetries) {
                    java.lang.Thread.sleep(retryDelay);
                }
            }
        }
        
        // Should not reach here
        return {success: false, error: "Max retries exceeded", response: null};
    }
    
    /**
     * AI analýza entry - môže analyzovať špecifické polia
     * @param {Entry} entry - Entry na analýzu
     * @param {string} analysisType - Typ analýzy ("summarize", "categorize", "extract", "sentiment", "custom")
     * @param {Array} fieldsToAnalyze - Názvy polí na analýzu (optional, default všetky)
     * @param {Object} options - Nastavenia {provider, model, customPrompt, debugEntry}
     * @return {Object} Výsledok analýzy
     */
    function aiAnalyzeEntry(entry, analysisType, fieldsToAnalyze, options) {
        options = options || {};
        var provider = options.provider || DEFAULT_CONFIG.defaultAIProvider;
        var debugEntry = options.debugEntry;
        
        if (!entry) {
            var error = "Missing entry to analyze";
            if (debugEntry) addError(debugEntry, "AI Analysis failed: " + error, "aiAnalyzeEntry");
            return {success: false, error: error};
        }
        
        try {
            // Ak nie sú špecifikované polia, vezmi všetky viditeľné
            if (!fieldsToAnalyze) {
                fieldsToAnalyze = ["Názov záznamu", "Popis", "Poznámka", "info"];
            }
            
            // Extrahuj dáta z entry
            var dataToAnalyze = {};
            for (var i = 0; i < fieldsToAnalyze.length; i++) {
                var fieldName = fieldsToAnalyze[i];
                var fieldValue = safeGet(entry, fieldName);
                if (fieldValue) {
                    dataToAnalyze[fieldName] = fieldValue;
                }
            }
            
            if (Object.keys(dataToAnalyze).length === 0) {
                var error = "No data found in specified fields";
                if (debugEntry) addError(debugEntry, "AI Analysis failed: " + error, "aiAnalyzeEntry");
                return {success: false, error: error};
            }
            
            var dataJson = JSON.stringify(dataToAnalyze, null, 2);
            
            // Vytvor prompt na základe typu analýzy
            var prompt;
            switch (analysisType) {
                case "summarize":
                    prompt = "Zhrň nasledujúce dáta do 2-3 viet v slovenčine:\n\n" + dataJson;
                    break;
                case "categorize":
                    prompt = "Kategorizuj následujúce dáta do jednej kategórie. Vráť len názov kategórie:\n\n" + dataJson;
                    break;
                case "extract":
                    prompt = "Z následujúcich dát extrahuj kľúčové informácie a vráť ich ako JSON:\n\n" + dataJson;
                    break;
                case "sentiment":
                    prompt = "Analyzuj sentiment následujúcich dát. Vráť: Pozitívny/Negatívny/Neutrálny:\n\n" + dataJson;
                    break;
                default:
                    prompt = options.customPrompt ? options.customPrompt + "\n\n" + dataJson : dataJson;
            }
            
            if (debugEntry) {
                addDebug(debugEntry, "🧠 AI Analysis: " + analysisType + " na " + fieldsToAnalyze.length + " poliach");
            }
            
            // Zavolaj AI
            var aiResult = callAI(provider, prompt, {
                model: options.model,
                maxTokens: options.maxTokens || 500,
                temperature: options.temperature || 0.3,
                debugEntry: debugEntry
            });
            
            if (aiResult.success) {
                return {
                    success: true,
                    analysis: aiResult.response,
                    analysisType: analysisType,
                    fieldsAnalyzed: fieldsToAnalyze,
                    provider: provider
                };
            } else {
                return aiResult;
            }
            
        } catch (e) {
            var error = "AI Analysis failed: " + e.toString();
            if (debugEntry) addError(debugEntry, error, "aiAnalyzeEntry");
            return {success: false, error: error};
        }
    }
    
    /**
     * Pomocná funkcia pre čistenie SQL response od AI
     * @param {string} aiResponse - Response od AI
     * @return {string} Vyčistený SQL dotaz
     */
    function cleanSqlResponse(aiResponse) {
        if (!aiResponse) return "";
        
        // Odstráň markdown formátovanie
        var cleaned = aiResponse.replace(/```sql\n?/g, "").replace(/```\n?/g, "");
        
        // Odstráň úvodné a záverečné biele znaky
        cleaned = cleaned.trim();
        
        // Ak obsahuje viacero riadkov, vezmi prvý SQL statement
        var lines = cleaned.split("\n");
        var sqlLines = [];
        
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line && !line.startsWith("--") && !line.startsWith("/*")) {
                sqlLines.push(line);
            }
        }
        
        return sqlLines.join(" ").trim();
    }
    
    /**
     * AI generovanie SQL dotazov z prirodzeného jazyka
     * @param {string} naturalLanguageQuery - Dotaz v prirodzenom jazyku
     * @param {Array} availableTables - Zoznam dostupných tabuliek/knižníc
     * @param {Object} options - Nastavenia {provider, model, debugEntry}
     * @return {Object} Výsledok s SQL dotazom
     */
    function aiGenerateSQL(naturalLanguageQuery, availableTables, options) {
        options = options || {};
        var provider = options.provider || DEFAULT_CONFIG.defaultAIProvider;
        var debugEntry = options.debugEntry;
        
        if (!naturalLanguageQuery) {
            return {success: false, error: "Missing natural language query"};
        }
        
        try {
            var tablesInfo = availableTables ? 
                availableTables.join(", ") : "všetky dostupné tabuľky";
            
            var prompt = 
                "Vygeneruj SQL dotaz na základe tohto požiadavku v slovenčine: \"" + naturalLanguageQuery + "\"\n\n" +
                "Dostupné tabuľky: " + tablesInfo + "\n\n" +
                "Pravidlá:\n" +
                "- Vráť iba SQL dotaz bez dodatočného textu\n" +
                "- Používaj SQLite syntax\n" +
                "- Názvy tabuliek a stĺpcov používaj presne ako sú zadané\n" +
                "- Pre slovenčinu používaj COLLATE NOCASE pre porovnávanie textu\n\n" +
                "SQL dotaz:";

            if (debugEntry) {
                addDebug(debugEntry, "🔍 AI SQL Generation: " + naturalLanguageQuery.substring(0, 100));
            }
            
            var aiResult = callAI(provider, prompt, {
                model: options.model,
                maxTokens: options.maxTokens || 300,
                temperature: 0.1,
                debugEntry: debugEntry
            });
            
            if (aiResult.success) {
                var sqlQuery = cleanSqlResponse(aiResult.response);
                
                return {
                    success: true,
                    sqlQuery: sqlQuery,
                    originalQuery: naturalLanguageQuery,
                    provider: provider
                };
            } else {
                return aiResult;
            }
            
        } catch (e) {
            var error = "AI SQL Generation failed: " + e.toString();
            if (debugEntry) addError(debugEntry, error, "aiGenerateSQL");
            return {success: false, error: error};
        }
    }
    
    // ========================================
    // v2.1 - ENHANCED SQL OPERATIONS
    // ========================================
    
    /**
     * Rozšírené SQL operácie s AI podporou
     * @param {string} query - SQL dotaz alebo prirodzený jazyk
     * @param {Object} options - Nastavenia {returnType, debugEntry, aiProvider}
     * @return {Object} Výsledky dotazu
     */
    function smartSQL(query, options) {
        options = options || {};
        var debugEntry = options.debugEntry;
        var returnType = options.returnType || "objects";
        
        if (!query || query.trim() === "") {
            return {success: false, error: "Empty query"};
        }
        
        try {
            var finalQuery = query.trim();
            
            // Ak query nevyzerá ako SQL, použij AI na generovanie
            if (!finalQuery.toUpperCase().startsWith("SELECT") && 
                !finalQuery.toUpperCase().startsWith("UPDATE") && 
                !finalQuery.toUpperCase().startsWith("INSERT") && 
                !finalQuery.toUpperCase().startsWith("DELETE")) {
                
                if (debugEntry) {
                    addDebug(debugEntry, "🤖 Natural language detected, generating SQL...");
                }
                
                var aiSqlResult = aiGenerateSQL(finalQuery, options.availableTables, {
                    provider: options.aiProvider,
                    model: options.aiModel,
                    debugEntry: debugEntry
                });
                
                if (!aiSqlResult.success) {
                    return aiSqlResult;
                }
                
                finalQuery = aiSqlResult.sqlQuery;
                
                if (debugEntry) {
                    addDebug(debugEntry, "🔄 Generated SQL: " + finalQuery);
                }
            }
            
            // Vykonaj SQL dotaz
            var sqlObj = sql(finalQuery);
            var data;
            
            switch (returnType.toLowerCase()) {
                case "objects":
                    data = sqlObj.asObjects();
                    break;
                case "arrays":
                    data = sqlObj.asArrays();
                    break;
                case "scalar":
                    data = sqlObj.asScalar();
                    break;
                case "count":
                    data = sqlObj.count();
                    break;
                default:
                    data = sqlObj.asObjects();
            }
            
            if (debugEntry) {
                var resultCount = Array.isArray(data) ? data.length : (typeof data === "number" ? data : 1);
                addDebug(debugEntry, "✅ SQL executed successfully. Results: " + resultCount);
            }
            
            return {
                success: true,
                data: data,
                query: finalQuery,
                resultType: returnType
            };
            
        } catch (e) {
            var error = "Smart SQL failed: " + e.toString() + "\nQuery: " + finalQuery;
            if (debugEntry) addError(debugEntry, error, "smartSQL");
            return {success: false, error: error, query: finalQuery};
        }
    }
    
    /**
     * SQL dotaz s AI interpretáciou výsledkov
     * @param {string} query - SQL dotaz
     * @param {string} interpretationPrompt - Ako interpretovať výsledky
     * @param {Object} options - Nastavenia
     */
    function sqlWithAIInterpretation(query, interpretationPrompt, options) {
        options = options || {};
        var debugEntry = options.debugEntry;
        
        // Vykonaj SQL dotaz
        var sqlResult = smartSQL(query, options);
        
        if (!sqlResult.success) {
            return sqlResult;
        }
        
        // AI interpretácia výsledkov
        var dataForAI = JSON.stringify(sqlResult.data, null, 2);
        var prompt = interpretationPrompt + "\n\nDáta z SQL dotazu:\n" + dataForAI;
        
        var aiResult = callAI(options.aiProvider || DEFAULT_CONFIG.defaultAIProvider, prompt, {
            model: options.aiModel,
            maxTokens: options.maxTokens || 800,
            debugEntry: debugEntry
        });
        
        return {
            success: true,
            sqlData: sqlResult.data,
            sqlQuery: sqlResult.query,
            aiInterpretation: aiResult.success ? 
                aiResult.response : "AI interpretation failed: " + aiResult.error,
            aiSuccess: aiResult.success
        };
    }
    
    // ========================================
    // BUSINESS LOGIC FUNCTIONS (v2.0)
    // ========================================
    
    /**
     * Nájdenie platnej sadzby pre konkrétny dátum
     * @param {Array} salaries - Array sadzieb zamestnanca
     * @param {Date} targetDate - Cieľový dátum
     * @return {number} Platná sadzba alebo 0
     */
    function findValidSalaryForDate(salaries, targetDate) {
        if (!salaries || salaries.length === 0 || !targetDate) return 0;
        
        try {
            var targetMoment = moment(targetDate);
            var validSalaries = [];
            
            for (var i = 0; i < salaries.length; i++) {
                var salary = salaries[i];
                var validFrom = salary.field("Platnosť od");
                
                if (validFrom) {
                    var validFromMoment = moment(validFrom);
                    if (validFromMoment.isValid() && validFromMoment.isSameOrBefore(targetMoment)) {
                        validSalaries.push({
                            entry: salary,
                            validFrom: validFromMoment,
                            amount: safeFieldAccess(salary, "Sadzba", 0)
                        });
                    }
                }
            }
            
            validSalaries.sort(function(a, b) {
                return b.validFrom.valueOf() - a.validFrom.valueOf();
            });
            
            return validSalaries.length > 0 ? validSalaries[0].amount : 0;
        } catch (error) {
            return 0;
        }
    }
    
    /**
     * Získanie default HZS z defaults knižnice
     * @param {string} defaultsLibraryName - Názov defaults knižnice
     * @param {string} defaultType - Typ defaultu (optional, default "HZS")
     * @return {Entry|null} Default HZS entry alebo null
     */
    function getDefaultHZS(defaultsLibraryName, defaultType) {
        defaultsLibraryName = defaultsLibraryName || DEFAULT_CONFIG.defaultLibraryName;
        defaultType = defaultType || "HZS";
        
        try {
            var defaultsLib = libByName(defaultsLibraryName);
            if (!defaultsLib) return null;
            
            var defaults = defaultsLib.find("typ", defaultType);
            return (defaults && defaults.length > 0) ? defaults[0] : null;
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Nastavenie default hodnoty ak pole je prázdne a znovu načítanie
     * @param {Entry} entry - Entry objekt
     * @param {string} fieldName - Názov poľa
     * @param {string} defaultLibrary - Názov defaults knižnice
     * @param {string} defaultType - Typ defaultu ktorý hľadáme
     * @return {Array|null} Znovu načítané pole alebo null
     */
    function setDefaultAndReload(entry, fieldName, defaultLibrary, defaultType) {
        if (!entry || !fieldName) return null;
        
        var field = safeFieldAccess(entry, fieldName);
        if (!field || field.length === 0) {
            var defaultEntry = getDefaultHZS(defaultLibrary, defaultType);
            if (defaultEntry) {
                safeSet(entry, fieldName, defaultEntry);
                return safeFieldAccess(entry, fieldName);
            }
        }
        return field;
    }
    
    // ========================================
    // VALIDATION, FORMATTING, SEARCH (v1.0 + v2.0)
    // ========================================
    
    /**
     * Validácia povinných polí
     * @param {Entry} entry - Entry objekt
     * @param {Array} requiredFields - Array názvov povinných polí
     * @return {Object} {isValid: boolean, missingFields: []}
     */
    function validateRequiredFields(entry, requiredFields) {
        var result = {
            isValid: true,
            missingFields: []
        };
        
        if (!entry || !requiredFields) {
            result.isValid = false;
            return result;
        }
        
        for (var i = 0; i < requiredFields.length; i++) {
            var fieldName = requiredFields[i];
            var value = safeFieldAccess(entry, fieldName);
            
            if (!value || (Array.isArray(value) && value.length === 0)) {
                result.isValid = false;
                result.missingFields.push(fieldName);
            }
        }
        
        return result;
    }
    
    /**
     * Validácia stavu entry
     * @param {Entry} entry - Entry objekt na validáciu
     * @return {Object} {isValid: boolean, errors: []}
     */
    function validateEntryState(entry) {
        var result = {
            isValid: true,
            errors: []
        };
        
        if (!entry) {
            result.isValid = false;
            result.errors.push("Entry object is null/undefined");
            return result;
        }
        
        try {
            var id = entry.field("ID");
            if (!id) {
                result.errors.push("Entry has no ID field");
            }
        } catch (error) {
            result.isValid = false;
            result.errors.push("Cannot access entry fields: " + error.toString());
        }
        
        result.isValid = result.errors.length === 0;
        return result;
    }
    
    /**
     * Formátovanie peňažnej sumy
     * @param {number} amount - Suma na formátovanie
     * @param {string} currency - Mena (default "€")
     * @param {number} decimals - Počet desatinných miest (default 2)
     * @return {string} Formátovaná suma
     */
    function formatMoney(amount, currency, decimals) {
        currency = currency || "€";
        decimals = typeof decimals === "number" ? decimals : 2;
        
        if (typeof amount !== "number" || isNaN(amount)) return "0.00 " + currency;
        
        return amount.toFixed(decimals) + " " + currency;
    }
    
    /**
     * Parsing peňažnej sumy zo stringu
     * @param {string} moneyString - String s peňažnou sumou
     * @return {number} Číselná hodnota alebo 0
     */
    function parseMoney(moneyString) {
        if (!moneyString) return 0;
        
        try {
            var cleanString = moneyString.toString()
                .replace(/[€$£¥₹]/g, '')
                .replace(/\s+/g, '')
                .replace(/,/g, '.');
            
            var number = parseFloat(cleanString);
            return isNaN(number) ? 0 : number;
        } catch (error) {
            return 0;
        }
    }
    
    /**
     * Formátovanie mena zamestnanca pre zobrazenie
     * @param {Entry} employeeEntry - Entry zamestnanca
     * @return {string} Formátované meno alebo "Neznámy zamestnanec"
     */
    function formatEmployeeName(employeeEntry) {
        if (!employeeEntry) return "Neznámy zamestnanec";
        
        try {
            var nick = safeFieldAccess(employeeEntry, "Nick", "");
            var meno = safeFieldAccess(employeeEntry, "Meno", "");
            var priezvisko = safeFieldAccess(employeeEntry, "Priezvisko", "");
            
            if (nick && (meno || priezvisko)) {
                return nick + " (" + (meno + " " + priezvisko).trim() + ")";
            } else if (nick) {
                return nick;
            } else if (meno || priezvisko) {
                return (meno + " " + priezvisko).trim();
            } else {
                return "Zamestnanec ID:" + safeFieldAccess(employeeEntry, "ID", "?");
            }
        } catch (error) {
            return "Chyba pri formátovaní mena";
        }
    }
    
    /**
     * Vyhľadanie entry podľa unique poľa s variáciami
     * @param {string} libraryName - Názov knižnice
     * @param {Array} fieldVariations - Možné názvy unique polí ["Nick", "nick", "ID"]
     * @param {string} value - Hľadaná hodnota
     * @return {Entry|null} Nájdený záznam alebo null
     */
    function findByUniqueField(libraryName, fieldVariations, value) {
        if (!libraryName || !fieldVariations || !value) return null;
        
        try {
            var library = libByName(libraryName);
            if (!library) return null;
            
            for (var i = 0; i < fieldVariations.length; i++) {
                var fieldName = fieldVariations[i];
                var results = library.find(fieldName, value);
                
                if (results && results.length > 0) {
                    return results[0];
                }
            }
        } catch (error) {
            return null;
        }
        
        return null;
    }
    
    /**
     * Špecializovaná funkcia pre hľadanie zamestnanca podľa Nick
     * @param {string} nick - Nick zamestnanca
     * @param {string} employeesLibrary - Názov knižnice zamestnancov (default "Zamestnanci")
     * @return {Entry|null} Nájdený zamestnanec alebo null
     */
    function findEmployeeByNick(nick, employeesLibrary) {
        employeesLibrary = employeesLibrary || "Zamestnanci";
        return findByUniqueField(employeesLibrary, ["Nick", "nick"], nick);
    }
    
    // ========================================
    // UTILITY OPERÁCIE (v2.0)
    // ========================================
    
    /**
     * Uloženie všetkých logov - placeholder pre custom save logic
     * @param {Entry} entry - Entry objekt
     * @return {boolean} True ak úspešné
     */
    function saveLogs(entry) {
        if (!entry) return false;
        
        try {
            var debugLog = safeFieldAccess(entry, DEFAULT_CONFIG.debugFieldName, "");
            if (debugLog && debugLog.length > 10000) {
                var trimmedLog = "...[trimmed]...\n" + debugLog.substring(debugLog.length - 5000);
                safeSet(entry, DEFAULT_CONFIG.debugFieldName, trimmedLog);
            }
            
            return true;
        } catch (error) {
            try {
                message("Failed to save logs: " + error.toString());
            } catch (e2) {
                // Silent fail
            }
            return false;
        }
    }
    
    /**
     * Vyčistenie logov na začiatku scriptu
     * @param {Entry} entry - Entry objekt
     * @param {boolean} clearErrors - Či vyčistiť aj error logy (default false)
     */
    function clearLogs(entry, clearErrors) {
        if (!entry) return;
        
        try {
            safeSet(entry, DEFAULT_CONFIG.debugFieldName, "");
            
            if (clearErrors) {
                safeSet(entry, DEFAULT_CONFIG.errorFieldName, "");
            }
        } catch (error) {
            // Ignore cleanup errors
        }
    }
    
    /**
     * Hromadné spracovanie položiek s error handlingom
     * @param {Array} items - Array položiek na spracovanie
     * @param {Function} processFunction - Funkcia pre spracovanie jednej položky
     * @param {Entry} debugEntry - Entry pre debug logy (optional)
     * @return {Object} Výsledky spracovania {success: [], failed: [], total: number}
     */
    function processBatch(items, processFunction, debugEntry) {
        var results = {
            success: [],
            failed: [],
            total: 0
        };
        
        if (!items || !processFunction) return results;
        
        results.total = items.length;
        
        for (var i = 0; i < items.length; i++) {
            try {
                var result = processFunction(items[i], i);
                if (result) {
                    results.success.push({
                        index: i,
                        item: items[i],
                        result: result
                    });
                } else {
                    results.failed.push({
                        index: i,
                        item: items[i],
                        error: "Processing returned false/null"
                    });
                }
            } catch (error) {
                results.failed.push({
                    index: i,
                    item: items[i],
                    error: error.toString()
                });
                
                if (debugEntry) {
                    addError(debugEntry, "Batch processing error at index " + i + ": " + error.toString(), "processBatch");
                }
            }
        }
        
        if (debugEntry) {
            addDebug(debugEntry, "Batch processed: " + results.success.length + "/" + results.total + " successful");
        }
        
        return results;
    }
    
    // ========================================
    // v2.2 - HTTP KOMUNIKÁCIA (z Dochádzka script)
    // ========================================

    /**
     * Univerzálny HTTP GET wrapper s error handlingom
     */
    function httpGet(url, headers, debugEntry) {
        try {
            if (debugEntry) addDebug(debugEntry, "🌐 HTTP GET: " + url);
            
            var httpObj = http();
            
            if (headers) {
                for (var key in headers) {
                    httpObj.header(key, headers[key]);
                }
            }
            
            var response = httpObj.get(url);
            
            if (response.code === 200) {
                if (debugEntry) addDebug(debugEntry, "✅ HTTP GET úspešný");
                return {
                    success: true,
                    data: JSON.parse(response.body),
                    code: response.code
                };
            } else {
                if (debugEntry) addError(debugEntry, "HTTP GET chyba " + response.code + ": " + response.body, "httpGet");
                return {success: false, error: "HTTP " + response.code, code: response.code};
            }
            
        } catch (e) {
            if (debugEntry) addError(debugEntry, e, "httpGet");
            return {success: false, error: e.toString()};
        }
    }

    /**
     * Univerzálny HTTP POST JSON wrapper
     */
    function httpPostJSON(url, payload, headers, debugEntry) {
        try {
            if (debugEntry) addDebug(debugEntry, "🌐 HTTP POST JSON: " + url);
            
            var httpObj = http();
            
            // Default JSON headers
            httpObj.header("Content-Type", "application/json");
            
            if (headers) {
                for (var key in headers) {
                    httpObj.header(key, headers[key]);
                }
            }
            
            var response = httpObj.post(url, JSON.stringify(payload));
            
            if (response.code >= 200 && response.code < 300) {
                if (debugEntry) addDebug(debugEntry, "✅ HTTP POST úspešný");
                return {
                    success: true,
                    data: response.body ? JSON.parse(response.body) : null,
                    code: response.code
                };
            } else {
                if (debugEntry) addError(debugEntry, "HTTP POST chyba " + response.code + ": " + response.body, "httpPostJSON");
                return {success: false, error: "HTTP " + response.code, code: response.code};
            }
            
        } catch (e) {
            if (debugEntry) addError(debugEntry, e, "httpPostJSON");
            return {success: false, error: e.toString()};
        }
    }

    /**
     * Username to Chat ID konverzia (z scriptu 2.5)
     */
    function getUserChatId(username, botToken, debugEntry) {
        try {
            if (!username || typeof username !== 'string') {
                if (debugEntry) addDebug(debugEntry, "💬 Chat ID je prázdny alebo nie je string");
                return null;
            }
            
            if (!username.startsWith('@')) {
                if (debugEntry) addDebug(debugEntry, "💬 Chat ID je už číselný: " + username);
                return username;
            }
            
            if (debugEntry) addDebug(debugEntry, "🔍 Konvertujem username " + username + " na Chat ID...");
            
            var updatesResult = httpGet(
                "https://api.telegram.org/bot" + botToken + "/getUpdates",
                null,
                debugEntry
            );
            
            if (!updatesResult.success) {
                if (debugEntry) addError(debugEntry, "getUpdates API volanie zlyhalo", "getUserChatId");
                return null;
            }
            
            var data = updatesResult.data;
            if (!data.ok || !data.result) {
                if (debugEntry) addError(debugEntry, "getUpdates response nie je OK", "getUserChatId");
                return null;
            }
            
            var updates = data.result;
            if (debugEntry) addDebug(debugEntry, "📡 Načítaných " + updates.length + " updates");
            
            var targetUsername = username.substring(1).toLowerCase();
            
            for (var i = 0; i < updates.length; i++) {
                var update = updates[i];
                var chat = update.message && update.message.chat;
                
                if (chat && chat.username && chat.username.toLowerCase() === targetUsername) {
                    var foundChatId = chat.id.toString();
                    if (debugEntry) addDebug(debugEntry, "✅ Nájdený Chat ID: " + foundChatId + " pre " + username);
                    return foundChatId;
                }
            }
            
            if (debugEntry) addError(debugEntry, "Username " + username + " nenájdený v updates", "getUserChatId");
            return null;
            
        } catch (e) {
            if (debugEntry) addError(debugEntry, e, "getUserChatId");
            return null;
        }
    }

    /**
     * Telegram správa s fallback Chat ID
     */
    function sendTelegramMessage(chatId, message, botToken, parseMode, debugEntry) {
        parseMode = parseMode || "Markdown";
        
        try {
            if (debugEntry) addDebug(debugEntry, "📱 Posielam Telegram správu...");
            
            var finalChatId = getUserChatId(chatId, botToken, debugEntry);
            if (!finalChatId) {
                if (debugEntry) addError(debugEntry, "Nepodarilo sa získať platný Chat ID pre " + chatId, "sendTelegramMessage");
                return false;
            }
            
            var payload = {
                chat_id: finalChatId,
                text: message,
                parse_mode: parseMode
            };
            
            var result = httpPostJSON(
                "https://api.telegram.org/bot" + botToken + "/sendMessage",
                payload,
                null,
                debugEntry
            );
            
            if (result.success) {
                if (debugEntry) addDebug(debugEntry, "✅ Telegram správa úspešne odoslaná");
                return true;
            } else {
                if (debugEntry) addError(debugEntry, "Telegram správa zlyhala: " + result.error, "sendTelegramMessage");
                return false;
            }
            
        } catch (e) {
            if (debugEntry) addError(debugEntry, e, "sendTelegramMessage");
            return false;
        }
    }

    // ========================================
    // PUBLIC API
    // ========================================
    return {
        // v1.0 - Original functions
        addDebug: addDebug,
        addError: addError,
        addInfo: addInfo,
        safeFieldAccess: safeFieldAccess,
        safeGetFirstLink: safeGetFirstLink,
        safeGetLinks: safeGetLinks,
        safeLinksFrom: safeLinksFrom,
        findLinksWithVariations: findLinksWithVariations,
        safeSetAttribute: safeSetAttribute,
        safeGetAttribute: safeGetAttribute,
        setDefaultAndReload: setDefaultAndReload,
        validateRequiredFields: validateRequiredFields,
        validateEntryState: validateEntryState,
        formatMoney: formatMoney,
        parseMoney: parseMoney,
        formatEmployeeName: formatEmployeeName,
        processBatch: processBatch,
        findByUniqueField: findByUniqueField,
        findEmployeeByNick: findEmployeeByNick,
        
        // v2.0 - New functions pre Záznam prác compatibility
        safeGet: safeGet,
        safeSet: safeSet,
        safeSetAttr: safeSetAttr,
        formatTime: formatTime,
        roundToQuarter: roundToQuarter,
        calculateTimeDifference: calculateTimeDifference,
        findValidSalaryForDate: findValidSalaryForDate,
        getDefaultHZS: getDefaultHZS,
        saveLogs: saveLogs,
        clearLogs: clearLogs,

           // v2.2 - HTTP funkcie
        httpGet: httpGet,
        httpPostJSON: httpPostJSON,
        getUserChatId: getUserChatId,
        sendTelegramMessage: sendTelegramMessage,
        
        // v2.1 - AI Functions
        callAI: callAI,
        callAIWithRetry: callAIWithRetry,
        aiAnalyzeEntry: aiAnalyzeEntry,
        aiGenerateSQL: aiGenerateSQL,
        
        // v2.1 - API Key Management
        getApiKey: getApiKey,
        getCachedApiKey: getCachedApiKey,
        clearApiKeyCache: clearApiKeyCache,
        testApiKeys: testApiKeys,
        
        // v2.1 - Enhanced SQL
        smartSQL: smartSQL,
        sqlWithAIInterpretation: sqlWithAIInterpretation,
        
        // v2.1 - Additional time functions
        calculateHours: calculateHours,
        isWeekend: isWeekend,
        
        // v2.2 - Additional error handling
        includeLineNumbers: true,
        includeStackTrace: false,

        // Configuration access
        DEFAULT_CONFIG: DEFAULT_CONFIG,
        AI_PROVIDERS: AI_PROVIDERS,
        
        // Version info
        version: "2.2"
    };
})();

// Export pre Memento
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MementoUtils;
}