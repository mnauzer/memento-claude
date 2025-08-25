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
    // N8N INTEGRATION FUNCTIONS
    // ==============================================

    // /**
    //  * Odošle notification data do N8N workflow
    //  * @param {string} webhookUrl - N8N webhook URL
    //  * @param {Object} notificationData - Dáta notifikácie
    //  * @param {Object} options - Dodatočné možnosti
    //  */
    // function triggerN8NWorkflow(webhookUrl, notificationData, options) {
    //     ensureCore();
    //     options = options || {};
        
    //     try {
    //         core.addDebug(entry(), "🔄 Spúšťam N8N workflow: " + webhookUrl.substring(0, 50) + "...");
            
    //         var payload = {
    //             trigger: "memento_notification",
    //             timestamp: moment().toISOString(),
    //             source: "ASISTANTO Notifications",
    //             data: notificationData
    //         };
            
    //         // Pridaj metadata ak je povolené
    //         if (options.includeMetadata !== false) {
    //             payload.metadata = {
    //                 mementoDatabase: lib().title,
    //                 entryId: entry().field("ID"),
    //                 scriptVersion: options.scriptVersion || "unknown",
    //                 user: user().name()
    //             };
    //         }
            
    //         var headers = {
    //             "Content-Type": "application/json",
    //             "User-Agent": "ASISTANTO-Memento/1.0"
    //         };
            
    //         // API key ak je poskytnutý
    //         if (options.apiKey) {
    //             headers["Authorization"] = "Bearer " + options.apiKey;
    //         }
            
    //         var result = httpRequest("POST", webhookUrl, payload, {
    //             headers: headers,
    //             timeout: options.timeout || 30000,
    //             maxRetries: options.maxRetries || 2
    //         });
            
    //         if (result.success) {
    //             core.addDebug(entry(), "✅ N8N workflow úspešne spustený");
    //             return {
    //                 success: true,
    //                 workflowId: result.data.workflowId || null,
    //                 executionId: result.data.executionId || null,
    //                 response: result.data
    //             };
    //         } else {
    //             core.addError(entry(), "N8N workflow failed: " + result.error, "triggerN8NWorkflow");
    //             return {
    //                 success: false,
    //                 error: result.error,
    //                 httpCode: result.code
    //             };
    //         }
            
    //     } catch (error) {
    //         core.addError(entry(), "N8N integration error: " + error.toString(), "triggerN8NWorkflow", error);
    //         return {
    //             success: false,
    //             error: error.toString()
    //         };
    //     }
    // }

    // /**
    //  * Získa status N8N workflow execution
    //  * @param {string} baseUrl - N8N base URL
    //  * @param {string} executionId - ID execution
    //  * @param {string} apiKey - N8N API key
    //  */
    // function getN8NExecutionStatus(baseUrl, executionId, apiKey) {
    //     ensureCore();
        
    //     try {
    //         var url = baseUrl + "/api/v1/executions/" + executionId;
            
    //         var result = httpRequest("GET", url, null, {
    //             headers: {
    //                 "Authorization": "Bearer " + apiKey,
    //                 "Accept": "application/json"
    //             }
    //         });
            
    //         if (result.success) {
    //             return {
    //                 success: true,
    //                 status: result.data.finished ? "completed" : "running",
    //                 startedAt: result.data.startedAt,
    //                 stoppedAt: result.data.stoppedAt,
    //                 executionTime: result.data.executionTime,
    //                 data: result.data
    //             };
    //         }
            
    //         return { success: false, error: result.error };
            
    //     } catch (error) {
    //         return { success: false, error: error.toString() };
    //     }
    // }
   // ==============================================
// PRIDAŤ TIETO FUNKCIE DO MementoAI.js
// Miesto: Za sekciu "VISION AI" (riadok ~250)
// ==============================================

// ==============================================
// N8N WORKFLOW INTEGRATION
// ==============================================

    /**
     * Odošle notification data do N8N workflow
     * @param {string} webhookUrl - N8N webhook URL
     * @param {Object} notificationData - Dáta notifikácie
     * @param {Object} options - Dodatočné možnosti
     */
    function triggerN8NWorkflow(webhookUrl, notificationData, options) {
        ensureCore();
        options = options || {};
        
        try {
            core.addDebug(entry(), "🔄 Spúšťam N8N workflow: " + webhookUrl.substring(0, 50) + "...");
            
            var payload = {
                trigger: "memento_notification",
                timestamp: moment().toISOString(),
                source: "ASISTANTO Notifications",
                data: notificationData
            };
            
            // Pridaj metadata ak je povolené
            if (options.includeMetadata !== false) {
                payload.metadata = {
                    mementoDatabase: lib().title,
                    entryId: entry().field("ID"),
                    scriptVersion: options.scriptVersion || "unknown",
                    user: user().name(),
                    libraryName: lib().name
                };
            }
            
            var headers = {
                "Content-Type": "application/json",
                "User-Agent": "ASISTANTO-Memento/1.0"
            };
            
            // API key ak je poskytnutý
            if (options.apiKey) {
                headers["Authorization"] = "Bearer " + options.apiKey;
            }
            
            var result = httpRequest("POST", webhookUrl, payload, {
                headers: headers,
                timeout: options.timeout || 30000,
                maxRetries: options.maxRetries || 2
            });
            
            if (result.success) {
                core.addDebug(entry(), "✅ N8N workflow úspešne spustený");
                
                // Extrahuj užitočné informácie z response
                var responseData = result.data || {};
                
                return {
                    success: true,
                    workflowId: responseData.workflowId || null,
                    executionId: responseData.executionId || responseData.id || null,
                    message: responseData.message || "Workflow triggered successfully",
                    response: responseData
                };
            } else {
                core.addError(entry(), "N8N workflow failed: " + result.error, "triggerN8NWorkflow");
                return {
                    success: false,
                    error: result.error,
                    httpCode: result.code,
                    details: result.data
                };
            }
            
        } catch (error) {
            core.addError(entry(), "N8N integration error: " + error.toString(), "triggerN8NWorkflow", error);
            return {
                success: false,
                error: error.toString()
            };
        }
    }

    /**
     * Získa status N8N workflow execution
     * @param {string} baseUrl - N8N base URL (napr. https://n8n.company.com)
     * @param {string} executionId - ID execution
     * @param {string} apiKey - N8N API key
     */
    function getN8NExecutionStatus(baseUrl, executionId, apiKey) {
        ensureCore();
        
        try {
            core.addDebug(entry(), "📊 Kontrolujem status N8N execution: " + executionId);
            
            var url = baseUrl.replace(/\/$/, "") + "/api/v1/executions/" + executionId;
            
            var result = httpRequest("GET", url, null, {
                headers: {
                    "Authorization": "Bearer " + apiKey,
                    "Accept": "application/json"
                },
                timeout: 15000
            });
            
            if (result.success && result.data) {
                var executionData = result.data;
                
                return {
                    success: true,
                    status: executionData.finished ? "completed" : "running",
                    mode: executionData.mode || "unknown",
                    startedAt: executionData.startedAt,
                    stoppedAt: executionData.stoppedAt,
                    executionTime: executionData.executionTime,
                    workflowData: executionData.workflowData || {},
                    data: executionData
                };
            } else {
                return { 
                    success: false, 
                    error: result.error || "Failed to get execution status",
                    httpCode: result.code
                };
            }
            
        } catch (error) {
            core.addError(entry(), "N8N status check error: " + error.toString(), "getN8NExecutionStatus", error);
            return { 
                success: false, 
                error: error.toString() 
            };
        }
    }

    /**
     * Aktivuje/deaktivuje N8N workflow
     * @param {string} baseUrl - N8N base URL
     * @param {string} workflowId - ID workflow
     * @param {boolean} active - true pre aktiváciu, false pre deaktiváciu
     * @param {string} apiKey - N8N API key
     */
    function setN8NWorkflowStatus(baseUrl, workflowId, active, apiKey) {
        ensureCore();
        
        try {
            var action = active ? "activate" : "deactivate";
            core.addDebug(entry(), "🔧 " + action + " N8N workflow: " + workflowId);
            
            var url = baseUrl.replace(/\/$/, "") + "/api/v1/workflows/" + workflowId + "/" + action;
            
            var result = httpRequest("POST", url, {}, {
                headers: {
                    "Authorization": "Bearer " + apiKey,
                    "Content-Type": "application/json"
                }
            });
            
            if (result.success) {
                core.addDebug(entry(), "✅ Workflow " + action + "d successfully");
                return {
                    success: true,
                    workflowId: workflowId,
                    active: active,
                    message: "Workflow " + action + "d successfully"
                };
            } else {
                core.addError(entry(), "N8N workflow " + action + " failed: " + result.error, "setN8NWorkflowStatus");
                return {
                    success: false,
                    error: result.error,
                    httpCode: result.code
                };
            }
            
        } catch (error) {
            core.addError(entry(), "N8N workflow status change error: " + error.toString(), "setN8NWorkflowStatus", error);
            return {
                success: false,
                error: error.toString()
            };
        }
    }

    /**
     * Bulk N8N webhook trigger pre viacero notifikácií
     * @param {string} webhookUrl - N8N webhook URL
     * @param {Array} notificationsData - Pole notifikácií
     * @param {Object} options - Nastavenia
     */
    function triggerN8NBulkWorkflow(webhookUrl, notificationsData, options) {
        ensureCore();
        options = options || {};
        
        try {
            core.addDebug(entry(), "🚀 Spúšťam N8N bulk workflow pre " + notificationsData.length + " notifikácií");
            
            var payload = {
                trigger: "memento_bulk_notifications",
                timestamp: moment().toISOString(),
                source: "ASISTANTO Bulk Notifications",
                count: notificationsData.length,
                notifications: notificationsData
            };
            
            if (options.includeMetadata !== false) {
                payload.metadata = {
                    mementoDatabase: lib().title,
                    batchId: "bulk_" + moment().format("YYMMDDHHmmss"),
                    scriptVersion: options.scriptVersion || "unknown",
                    user: user().name()
                };
            }
            
            var headers = {
                "Content-Type": "application/json",
                "User-Agent": "ASISTANTO-Memento-Bulk/1.0"
            };
            
            if (options.apiKey) {
                headers["Authorization"] = "Bearer " + options.apiKey;
            }
            
            var result = httpRequest("POST", webhookUrl, payload, {
                headers: headers,
                timeout: options.timeout || 60000, // Dlhší timeout pre bulk
                maxRetries: 1 // Jeden retry pre bulk operácie
            });
            
            if (result.success) {
                core.addDebug(entry(), "✅ N8N bulk workflow úspešne spustený");
                return {
                    success: true,
                    processedCount: notificationsData.length,
                    batchId: payload.metadata ? payload.metadata.batchId : null,
                    response: result.data
                };
            } else {
                core.addError(entry(), "N8N bulk workflow failed: " + result.error, "triggerN8NBulkWorkflow");
                return {
                    success: false,
                    error: result.error,
                    httpCode: result.code
                };
            }
            
        } catch (error) {
            core.addError(entry(), "N8N bulk integration error: " + error.toString(), "triggerN8NBulkWorkflow", error);
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
        analyzeImage: analyzeImage,

        // N8N Integration
        triggerN8NWorkflow: triggerN8NWorkflow,
        getN8NExecutionStatus: getN8NExecutionStatus, 
        setN8NWorkflowStatus: setN8NWorkflowStatus,
        triggerN8NBulkWorkflow: triggerN8NBulkWorkflow  

    };
})();