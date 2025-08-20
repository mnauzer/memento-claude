// ==============================================
// MEMENTOAI - AI integrácia a API funkcie
// Verzia: 1.0 | Dátum: August 2025 | Autor: ASISTANTO
// ==============================================
// 📋 OBSAH:
//    - AI providers konfigurácia
//    - API key management s cache
//    - HTTP request wrapper
//    - AI volania (OpenAI, Perplexity, OpenRouter)
// ==============================================
// 🔗 ZÁVISLOSŤ: MementoCore.js

var MementoAI = (function() {
    'use strict';
    
    // Import MementoCore
    // Lazy loading MementoCore
    var core;
    function ensureCore() {
        if (!core && typeof MementoCore !== 'undefined') {
            core = MementoCore;
        }
        return core;
}
    // ==============================================
    // CONFIGURATION
    // ==============================================
    
    var config = {
        version: "1.0",
        
        // API settings
        apiCacheTimeout: 3600000, // 1 hour
        httpTimeout: 30000, // 30 seconds
        maxRetries: 3,
        
        // Libraries
        apiLibrary: "ASISTANTO API",
        
        // AI Providers
        defaultAIProvider: "OpenAi",
        
        // Field names
        provider: "provider",
        apiKey: "Key"
    };
    
    // ==============================================
    // AI PROVIDERS CONFIGURATION
    // ==============================================
    
    var AI_PROVIDERS = {
        OpenAi: {
            name: "OpenAI",
            baseUrl: "https://api.openai.com/v1/chat/completions",
            defaultModel: "gpt-4o-mini",
            headers: function(apiKey) {
                return {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + apiKey
                };
            }
        },
        Perplexity: {
            name: "Perplexity",
            baseUrl: "https://api.perplexity.ai/chat/completions",
            defaultModel: "llama-3.1-sonar-small-128k-online",
            headers: function(apiKey) {
                return {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + apiKey
                };
            }
        },
        OpenRouter: {
            name: "OpenRouter",
            baseUrl: "https://openrouter.ai/api/v1/chat/completions",
            defaultModel: "meta-llama/llama-3.1-8b-instruct:free",
            headers: function(apiKey) {
                return {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + apiKey,
                    "HTTP-Referer": "https://memento.database",
                    "X-Title": "Memento Database"
                };
            }
        }
    };
    
    // Cache pre API kľúče
    var _apiKeyCache = {};
    var _apiKeyCacheTimestamp = {};
    
    // ==============================================
    // API KEY MANAGEMENT
    // ==============================================
    
    function getApiKey(provider) {
        ensureCore();
        provider = provider || config.defaultAIProvider;
        
        // Check cache
        if (_apiKeyCache[provider]) {
            var cacheTime = _apiKeyCacheTimestamp[provider];
            if (cacheTime && (Date.now() - cacheTime) < config.apiCacheTimeout) {
                return _apiKeyCache[provider];
            }
        }
        
        try {
            var apiLib = libByName(config.apiLibrary);
            if (!apiLib) {
                core.addError(entry(), "API library not found: " + config.apiLibrary, "getApiKey");
                return null;
            }
            
            var apiEntries = apiLib.entries();
            
            for (var i = 0; i < apiEntries.length; i++) {
                var apiEntry = apiEntries[i];
                if (apiEntry.field(config.provider) === provider) {
                    var apiKey = apiEntry.field(config.apiKey);
                    
                    // Cache it
                    _apiKeyCache[provider] = apiKey;
                    _apiKeyCacheTimestamp[provider] = Date.now();
                    
                    return apiKey;
                }
            }
            
            return null;
            
        } catch (error) {
            core.addError(entry(), "Error getting API key: " + error.toString(), "getApiKey", error);
            return null;
        }
    }
    
    function clearApiKeyCache(provider) {
        if (provider) {
            delete _apiKeyCache[provider];
            delete _apiKeyCacheTimestamp[provider];
        } else {
            _apiKeyCache = {};
            _apiKeyCacheTimestamp = {};
        }
    }
    
    // ==============================================
    // HTTP REQUEST WRAPPER
    // ==============================================
    
    function httpRequest(method, url, data, options) {
        ensureCore();
        options = options || {};
        var maxRetries = options.maxRetries || config.maxRetries;
        var timeout = options.timeout || config.httpTimeout;
        var headers = options.headers || {};
        
        for (var attempt = 0; attempt < maxRetries; attempt++) {
            try {
                var httpObj = http();
                
                // Set headers
                for (var header in headers) {
                    httpObj.header(header, headers[header]);
                }
                
                // Set timeout
                if (timeout && httpObj.timeout) {
                    httpObj.timeout(timeout);
                }
                
                var response;
                
                switch (method.toUpperCase()) {
                    case "GET":
                        response = httpObj.get(url);
                        break;
                    case "POST":
                        response = httpObj.post(url, JSON.stringify(data));
                        break;
                    case "PUT":
                        response = httpObj.put(url, JSON.stringify(data));
                        break;
                    case "DELETE":
                        response = httpObj.del(url);
                        break;
                    default:
                        throw new Error("Unsupported HTTP method: " + method);
                }
                
                if (response.code >= 200 && response.code < 300) {
                    return {
                        success: true,
                        data: response.body ? JSON.parse(response.body) : null,
                        code: response.code
                    };
                } else if (response.code >= 500 && attempt < maxRetries - 1) {
                    // Retry on server errors
                    core.addDebug(entry(), "HTTP " + response.code + " error, retry attempt " + (attempt + 1));
                    continue;
                } else {
                    return {
                        success: false,
                        error: "HTTP " + response.code,
                        data: response.body,
                        code: response.code
                    };
                }
                
            } catch (error) {
                if (attempt >= maxRetries - 1) {
                    return {
                        success: false,
                        error: error.toString(),
                        code: 0
                    };
                }
                core.addDebug(entry(), "HTTP error: " + error + ", retry attempt " + (attempt + 1));
            }
        }
        
        return {
            success: false,
            error: "Max retries exceeded",
            code: 0
        };
    }
    
    // ==============================================
    // AI INTEGRATION
    // ==============================================
    
    function callAI(provider, prompt, options) {
        ensureCore();
        options = options || {};
        provider = provider || config.defaultAIProvider;
        
        var providerConfig = AI_PROVIDERS[provider];
        if (!providerConfig) {
            return { success: false, error: "Unknown AI provider: " + provider };
        }
        
        var apiKey = options.apiKey || getApiKey(provider);
        if (!apiKey) {
            return { success: false, error: "API key not found for " + provider };
        }
        
        try {
            core.addDebug(entry(), "🤖 Calling " + provider + " AI with model: " + 
                         (options.model || providerConfig.defaultModel));
            
            var payload = {
                model: options.model || providerConfig.defaultModel,
                messages: [
                    {
                        role: options.systemPrompt ? "system" : "user",
                        content: options.systemPrompt || prompt
                    }
                ]
            };
            
            if (options.systemPrompt) {
                payload.messages.push({
                    role: "user",
                    content: prompt
                });
            }
            
            // Špecifické nastavenia pre provider
            if (options.temperature !== undefined) payload.temperature = options.temperature;
            if (options.maxTokens) payload.max_tokens = options.maxTokens;
            if (options.jsonMode) payload.response_format = { type: "json_object" };
            
            // Perplexity špecifické
            if (provider === "Perplexity" && options.searchRecency) {
                payload.search_recency_filter = options.searchRecency; // "day", "week", "month", "year"
            }
            
            var headers = providerConfig.headers(apiKey);
            
            var result = httpRequest("POST", providerConfig.baseUrl, payload, {
                headers: headers,
                timeout: options.timeout || 60000,
                maxRetries: options.maxRetries || 2
            });
            
            if (result.success && result.data) {
                core.addDebug(entry(), "✅ AI response received successfully");
                
                return {
                    success: true,
                    content: result.data.choices[0].message.content,
                    usage: result.data.usage,
                    raw: result.data
                };
            } else {
                core.addError(entry(), "AI API call failed: " + (result.error || "Unknown error"), 
                             "callAI", { provider: provider });
                return {
                    success: false,
                    error: result.error || "AI API call failed",
                    data: result.data
                };
            }
            
        } catch (error) {
            core.addError(entry(), "Error calling AI: " + error.toString(), "callAI", error);
            return {
                success: false,
                error: error.toString()
            };
        }
    }
    
    // ==============================================
    // VISION AI (pre spracovanie faktúr)
    // ==============================================
    
    function analyzeImage(imageBase64, prompt, options) {
        ensureCore();
        options = options || {};
        
        // Vision je podporované len OpenAI GPT-4o
        var provider = "OpenAi";
        var model = options.model || "gpt-4o-mini";
        
        var visionPrompt = {
            systemPrompt: options.systemPrompt || "You are an expert at analyzing invoices and documents.",
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
                                url: "data:image/jpeg;base64," + imageBase64,
                                detail: options.detail || "high"
                            }
                        }
                    ]
                }
            ]
        };
        
        return callAI(provider, null, {
            model: model,
            systemPrompt: visionPrompt.systemPrompt,
            messages: visionPrompt.messages,
            maxTokens: options.maxTokens || 4096,
            jsonMode: options.jsonMode !== false // Default true pre faktúry
        });
    }
    
    // ==============================================
    // PUBLIC API
    // ==============================================
    
    return {
        // Version
        version: config.version,
        
        // Configuration
        AI_PROVIDERS: AI_PROVIDERS,
        
        // API Key Management
        getApiKey: getApiKey,
        clearApiKeyCache: clearApiKeyCache,
        
        // HTTP
        httpRequest: httpRequest,
        
        // AI Functions
        callAI: callAI,
        analyzeImage: analyzeImage
    };
})();