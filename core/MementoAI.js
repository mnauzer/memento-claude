// ==============================================
// MEMENTO AI - AI SERVICE INTEGRATION
// Verzia: 8.0.0 | Dátum: 2026-03-19 | Autor: ASISTANTO
// Predchádzajúca verzia: MementoAI7.js v7.1.0
// ==============================================
// 📋 ÚČEL:
//    - Integrácia s AI službami (OpenAI, Claude)
//    - HTTP request wrapper
//    - Image analýza
//    - Jednotné API pre rôzne AI providery
// ==============================================
// 🔧 CHANGELOG v7.0:
//    - Zjednodušená štruktúra
//    - Lazy loading pre config
//    - Odstránené duplicity
//    - Slovenské komentáre
// ==============================================

var MementoAI = (function() {
    'use strict';

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "MementoAI",
        version: "8.0.0",
        author: "ASISTANTO",
        description: "AI service integration (OpenAI GPT-4, Claude API, image analysis)",
        dependencies: ["MementoUtils"],
        provides: ["callOpenAI", "callClaude", "analyzeImage", "httpRequest"],
        status: "stable",
        changelog: "v8.0.0 - Standardized version, removed version from filename"
    };

    var version = MODULE_INFO.version;

    // Lazy loading pre závislosti
    var _config = null;
    var _core = null;
    
    function getConfig() {
        if (!_config && typeof MementoConfig !== 'undefined') {
            _config = MementoConfig.getConfig();
        }
        return _config;
    }
    
    function getCore() {
        if (!_core && typeof MementoCore !== 'undefined') {
            _core = MementoCore;
        }
        return _core;
    }
    
    // ==============================================
    // KONŠTANTY
    // ==============================================
    
    var AI_PROVIDERS = {
        OPENAI: {
            name: "OpenAI",
            baseUrl: "https://api.openai.com/v1",
            models: {
                GPT4: "gpt-4",
                GPT4_TURBO: "gpt-4-turbo-preview",
                GPT35_TURBO: "gpt-3.5-turbo",
                GPT4_VISION: "gpt-4-vision-preview"
            }
        },
        CLAUDE: {
            name: "Claude",
            baseUrl: "https://api.anthropic.com/v1",
            models: {
                CLAUDE_3_OPUS: "claude-3-opus-20240229",
                CLAUDE_3_SONNET: "claude-3-sonnet-20240229",
                CLAUDE_3_HAIKU: "claude-3-haiku-20240307"
            }
        }
    };
    
    // ==============================================
    // HTTP FUNKCIE
    // ==============================================
    
    /**
     * Vykoná HTTP request
     * @param {string} method - HTTP metóda (GET, POST, PUT, DELETE)
     * @param {string} url - URL adresa
     * @param {Object} data - Dáta pre request (pre POST/PUT)
     * @param {Object} headers - Dodatočné hlavičky
     * @returns {Object} Response objekt {code, body, headers}
     */
    function httpRequest(method, url, data, headers) {
        try {
            var httpObj = http();
            
            // Nastavenie hlavičiek
            var defaultHeaders = {
                "Content-Type": "application/json",
                "Accept": "application/json"
            };
            
            if (headers) {
                for (var key in headers) {
                    defaultHeaders[key] = headers[key];
                }
            }
            
            httpObj.headers(defaultHeaders);
            
            // Vykonanie requestu
            var result;
            method = method.toUpperCase();
            
            switch(method) {
                case "GET":
                    result = httpObj.get(url);
                    break;
                case "POST":
                    result = httpObj.post(url, data ? JSON.stringify(data) : "");
                    break;
                case "PUT":
                    result = httpObj.put(url, data ? JSON.stringify(data) : "");
                    break;
                case "DELETE":
                    result = httpObj.del(url);
                    break;
                default:
                    throw new Error("Nepodporovaná HTTP metóda: " + method);
            }
            
            return {
                code: result.code,
                body: result.body,
                headers: result.headers || {}
            };
            
        } catch (error) {
            var core = getCore();
            if (core) {
                core.addError(entry(), "HTTP request zlyhal: " + error.toString(), "httpRequest", error);
            }
            
            return {
                code: 0,
                body: JSON.stringify({ error: error.toString() }),
                headers: {}
            };
        }
    }
    
    // ==============================================
    // AI FUNKCIE
    // ==============================================
    
    /**
     * Získa API kľúč pre providera
     * @param {string} provider - Názov providera (OPENAI, CLAUDE)
     * @returns {string|null} API kľúč alebo null
     */
    function getApiKey(provider) {
        try {
            var core = getCore();
            if (!core) return null;
            
            var config = getConfig();
            var defaultsLib = config ? config.libraries.defaults : "ASISTANTO Defaults";
            
            var fieldName;
            switch(provider) {
                case "OPENAI":
                    fieldName = "OpenAI API Key";
                    break;
                case "CLAUDE":
                    fieldName = "Claude API Key";
                    break;
                default:
                    return null;
            }
            
            return core.getSettings(defaultsLib, fieldName);
            
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Volanie AI API
     * @param {string} provider - Provider (OPENAI, CLAUDE)
     * @param {string} prompt - Prompt pre AI
     * @param {Object} options - Dodatočné možnosti
     * @returns {Object|null} Odpoveď od AI alebo null
     */
    function callAI(provider, prompt, options) {
        try {
            options = options || {};
            
            var apiKey = getApiKey(provider);
            if (!apiKey) {
                throw new Error("API kľúč pre " + provider + " nebol nájdený");
            }
            
            var providerConfig = AI_PROVIDERS[provider];
            if (!providerConfig) {
                throw new Error("Neznámy AI provider: " + provider);
            }
            
            var model = options.model || providerConfig.models.GPT35_TURBO;
            var temperature = options.temperature || 0.7;
            var maxTokens = options.maxTokens || 1000;
            
            // Príprava requestu podľa providera
            var url, requestData, headers;
            
            if (provider === "OPENAI") {
                url = providerConfig.baseUrl + "/chat/completions";
                headers = {
                    "Authorization": "Bearer " + apiKey
                };
                requestData = {
                    model: model,
                    messages: [
                        {
                            role: "system",
                            content: options.systemPrompt || "Si užitočný asistent."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: temperature,
                    max_tokens: maxTokens
                };
                
            } else if (provider === "CLAUDE") {
                url = providerConfig.baseUrl + "/messages";
                headers = {
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01"
                };
                requestData = {
                    model: model,
                    system: options.systemPrompt || "Si užitočný asistent.",
                    messages: [
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    max_tokens: maxTokens,
                    temperature: temperature
                };
            }
            
            // Vykonanie requestu
            var response = httpRequest("POST", url, requestData, headers);
            
            if (response.code !== 200) {
                throw new Error("AI API vrátilo chybu " + response.code + ": " + response.body);
            }
            
            var responseData = JSON.parse(response.body);
            
            // Extrakcia odpovede podľa providera
            var content;
            if (provider === "OPENAI") {
                content = responseData.choices[0].message.content;
            } else if (provider === "CLAUDE") {
                content = responseData.content[0].text;
            }
            
            return {
                success: true,
                content: content,
                usage: responseData.usage || {},
                model: model,
                provider: provider
            };
            
        } catch (error) {
            var core = getCore();
            if (core) {
                core.addError(entry(), "AI volanie zlyhalo: " + error.toString(), "callAI", error);
            }
            
            return {
                success: false,
                error: error.toString(),
                provider: provider
            };
        }
    }
    
    /**
     * Analyzuje obrázok pomocou AI
     * @param {string} imageUrl - URL obrázka alebo base64
     * @param {string} prompt - Otázka o obrázku
     * @param {Object} options - Dodatočné možnosti
     * @returns {Object|null} Odpoveď od AI
     */
    function analyzeImage(imageUrl, prompt, options) {
        try {
            options = options || {};
            
            // Defaultne používame OpenAI GPT-4 Vision
            var provider = options.provider || "OPENAI";
            var model = AI_PROVIDERS.OPENAI.models.GPT4_VISION;
            
            var apiKey = getApiKey(provider);
            if (!apiKey) {
                throw new Error("API kľúč pre " + provider + " nebol nájdený");
            }
            
            // Príprava requestu pre vision model
            var url = AI_PROVIDERS.OPENAI.baseUrl + "/chat/completions";
            var headers = {
                "Authorization": "Bearer " + apiKey
            };
            
            var requestData = {
                model: model,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: prompt
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: imageUrl.startsWith("data:") ? imageUrl : imageUrl,
                                    detail: options.detail || "auto"
                                }
                            }
                        ]
                    }
                ],
                max_tokens: options.maxTokens || 1000
            };
            
            // Vykonanie requestu
            var response = httpRequest("POST", url, requestData, headers);
            
            if (response.code !== 200) {
                throw new Error("Vision API vrátilo chybu " + response.code + ": " + response.body);
            }
            
            var responseData = JSON.parse(response.body);
            var content = responseData.choices[0].message.content;
            
            return {
                success: true,
                content: content,
                usage: responseData.usage || {},
                model: model,
                provider: provider
            };
            
        } catch (error) {
            var core = getCore();
            if (core) {
                core.addError(entry(), "Analýza obrázka zlyhala: " + error.toString(), "analyzeImage", error);
            }
            
            return {
                success: false,
                error: error.toString()
            };
        }
    }
    
    // ==============================================
    // HELPER FUNKCIE
    // ==============================================
    
    /**
     * Pripraví prompt s kontextom
     * @param {string} prompt - Základný prompt
     * @param {Object} context - Kontext (entry data, metadata)
     * @returns {string} Rozšírený prompt
     */
    function preparePromptWithContext(prompt, context) {
        var fullPrompt = prompt;
        
        if (context) {
            fullPrompt += "\n\nKontext:\n";
            
            if (context.entry) {
                fullPrompt += "Entry ID: " + (context.entry.field("ID") || "N/A") + "\n";
            }
            
            if (context.library) {
                fullPrompt += "Knižnica: " + context.library + "\n";
            }
            
            if (context.data) {
                fullPrompt += "Dáta: " + JSON.stringify(context.data) + "\n";
            }
        }
        
        return fullPrompt;
    }
    
    /**
     * Parsuje JSON z AI odpovede
     * @param {string} content - AI odpoveď
     * @returns {Object|null} Parsovaný JSON alebo null
     */
    function parseAIJson(content) {
        try {
            // Pokús sa nájsť JSON v odpovedi
            var jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // Ak nie je JSON, pokús sa parsovať celú odpoveď
            return JSON.parse(content);
            
        } catch (error) {
            return null;
        }
    }
    
    // ==============================================
    // PUBLIC API
    // ==============================================

    return {
        // Module metadata
        info: MODULE_INFO,
        version: version,

        // Konštanty
        AI_PROVIDERS: AI_PROVIDERS,
        
        // HTTP funkcie
        httpRequest: httpRequest,
        
        // AI funkcie
        getApiKey: getApiKey,
        callAI: callAI,
        analyzeImage: analyzeImage,
        
        // Helper funkcie
        preparePromptWithContext: preparePromptWithContext,
        parseAIJson: parseAIJson
    };
})();