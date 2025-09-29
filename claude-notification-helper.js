// ==============================================
// CLAUDE CODE NOTIFICATION HELPER
// Verzia: 1.0 | Dátum: December 2024 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
//    - Helper funkcie pre posielanie notifikácií z Claude Code
//    - Integrácia s n8n workflow
//    - Jednoduché API pre Claude Code Assistant
// ==============================================

var ClaudeNotificationHelper = (function() {
    'use strict';

    var version = "1.0.0";

    // Konfigurácia
    var config = {
        n8nWebhookUrl: "http://localhost:5678/webhook/claude-completion",
        telegramChatId: "7790148295",
        telegramBotToken: "7529072263:AAE60n5-i9iwwhuEHPoy67w9LWDF3ICnAB0",
        timeout: 10000
    };

    /**
     * Pošle notifikáciu o dokončení úlohy
     * @param {string} taskDescription - Popis úlohy
     * @param {string} resultSummary - Zhrnutie výsledku
     * @param {Array|string} filesModified - Zoznam upravených súborov
     * @param {Object} options - Dodatočné možnosti
     * @returns {Promise} Výsledok operácie
     */
    function notifyTaskCompletion(taskDescription, resultSummary, filesModified, options) {
        return new Promise(function(resolve, reject) {
            try {
                options = options || {};

                // Príprava dát
                var notificationData = {
                    task_description: taskDescription || "Claude Code úloha",
                    result_summary: resultSummary || "Úloha bola úspešne dokončená",
                    files_modified: Array.isArray(filesModified) ? filesModified :
                                   (filesModified ? [filesModified] : []),
                    timestamp: new Date().toISOString(),
                    claude_session: options.sessionId || generateSessionId(),
                    priority: options.priority || "normal",
                    source: "claude-code-assistant"
                };

                // Pošli do n8n workflow
                sendToN8nWorkflow(notificationData)
                    .then(function(result) {
                        resolve(result);
                    })
                    .catch(function(error) {
                        // Fallback - priamy Telegram
                        sendDirectTelegram(notificationData)
                            .then(function(fallbackResult) {
                                resolve({
                                    success: true,
                                    method: "fallback_telegram",
                                    warning: "n8n nedostupný, použitý fallback",
                                    original_error: error.toString(),
                                    result: fallbackResult
                                });
                            })
                            .catch(function(fallbackError) {
                                reject({
                                    success: false,
                                    error: "Oba spôsoby zlyhali",
                                    n8n_error: error.toString(),
                                    telegram_error: fallbackError.toString()
                                });
                            });
                    });

            } catch (error) {
                reject({
                    success: false,
                    error: error.toString()
                });
            }
        });
    }

    /**
     * Pošle dáta do n8n workflow
     */
    function sendToN8nWorkflow(data) {
        return new Promise(function(resolve, reject) {
            // Simulácia HTTP requestu (v reálnom prostredí by sa použil fetch alebo XMLHttpRequest)
            // Pre Memento prostredie môžeme použiť MementoAI.httpRequest

            if (typeof MementoAI !== 'undefined') {
                try {
                    var response = MementoAI.httpRequest("POST", config.n8nWebhookUrl, data);

                    if (response.code >= 200 && response.code < 300) {
                        var responseData = JSON.parse(response.body);
                        resolve({
                            success: true,
                            method: "n8n_webhook",
                            response: responseData,
                            webhook_url: config.n8nWebhookUrl
                        });
                    } else {
                        reject(new Error("n8n webhook error: " + response.code));
                    }
                } catch (error) {
                    reject(error);
                }
            } else {
                // Browser/Node.js environment
                fetch(config.n8nWebhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data),
                    timeout: config.timeout
                })
                .then(function(response) {
                    if (response.ok) {
                        return response.json();
                    } else {
                        throw new Error('n8n webhook failed: ' + response.status);
                    }
                })
                .then(function(result) {
                    resolve({
                        success: true,
                        method: "n8n_webhook",
                        response: result
                    });
                })
                .catch(function(error) {
                    reject(error);
                });
            }
        });
    }

    /**
     * Priamy Telegram fallback
     */
    function sendDirectTelegram(data) {
        return new Promise(function(resolve, reject) {
            try {
                var message = formatTelegramMessage(data);
                var telegramUrl = "https://api.telegram.org/bot" + config.telegramBotToken + "/sendMessage";

                var telegramData = {
                    chat_id: config.telegramChatId,
                    text: message,
                    parse_mode: "Markdown",
                    disable_web_page_preview: true
                };

                if (typeof MementoAI !== 'undefined') {
                    var response = MementoAI.httpRequest("POST", telegramUrl, telegramData);

                    if (response.code === 200) {
                        var responseData = JSON.parse(response.body);
                        resolve({
                            success: true,
                            method: "direct_telegram",
                            message_id: responseData.result.message_id
                        });
                    } else {
                        reject(new Error("Telegram API error: " + response.code));
                    }
                } else {
                    // Browser environment
                    fetch(telegramUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(telegramData)
                    })
                    .then(function(response) {
                        if (response.ok) {
                            return response.json();
                        } else {
                            throw new Error('Telegram API failed: ' + response.status);
                        }
                    })
                    .then(function(result) {
                        resolve({
                            success: true,
                            method: "direct_telegram",
                            message_id: result.result.message_id
                        });
                    })
                    .catch(function(error) {
                        reject(error);
                    });
                }

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Formátuje správu pre Telegram
     */
    function formatTelegramMessage(data) {
        var message = "🎉 *Claude Code dokončil úlohu!*\n\n";
        message += "📋 **Úloha:** " + data.task_description + "\n\n";
        message += "📝 **Výsledok:**\n" + data.result_summary + "\n\n";

        if (data.files_modified && data.files_modified.length > 0) {
            message += "📁 **Súbory:**\n";
            for (var i = 0; i < data.files_modified.length; i++) {
                message += "• " + data.files_modified[i] + "\n";
            }
            message += "\n";
        }

        var timestamp = new Date().toLocaleString('sk-SK', {
            timeZone: 'Europe/Bratislava',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        message += "⏰ **Dokončené:** " + timestamp + "\n";
        message += "✅ **Status:** Úspešne dokončené\n\n";
        message += "🤖 _Claude Code Assistant_";

        return message;
    }

    /**
     * Generuje jedinečné session ID
     */
    function generateSessionId() {
        return 'claude-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Nastaví konfiguráciu
     */
    function setConfig(newConfig) {
        Object.assign(config, newConfig);
    }

    /**
     * Získa aktuálnu konfiguráciu
     */
    function getConfig() {
        return Object.assign({}, config);
    }

    /**
     * Jednoduchá funkcia pre rýchle notifikácie
     */
    function quickNotify(task, result) {
        return notifyTaskCompletion(task, result, [], {});
    }

    /**
     * Test funkcia
     */
    function testNotification() {
        return notifyTaskCompletion(
            "Test Claude Code notifikácie",
            "✅ Test systému úspešne dokončený!\nVšetky komponenty fungujú správne.",
            ["claude-notification-helper.js", "claude-code-completion-workflow.json"],
            { priority: "test" }
        );
    }

    // ==============================================
    // PUBLIC API
    // ==============================================

    return {
        version: version,

        // Hlavné funkcie
        notifyTaskCompletion: notifyTaskCompletion,
        quickNotify: quickNotify,
        testNotification: testNotification,

        // Konfigurácia
        setConfig: setConfig,
        getConfig: getConfig,

        // Utility funkcie
        formatTelegramMessage: formatTelegramMessage,
        generateSessionId: generateSessionId,

        // Interné funkcie (pre debugging)
        sendToN8nWorkflow: sendToN8nWorkflow,
        sendDirectTelegram: sendDirectTelegram
    };
})();

// Globálne dostupné pre jednoduchšie použitie
if (typeof window !== 'undefined') {
    window.ClaudeNotify = ClaudeNotificationHelper;
} else if (typeof global !== 'undefined') {
    global.ClaudeNotify = ClaudeNotificationHelper;
}

// Príklad použitia:
/*
ClaudeNotificationHelper.notifyTaskCompletion(
    "Vytvorenie dokumentácie",
    "Dokumentácia bola úspešne vytvorená a aktualizovaná",
    ["README.md", "docs/api.md"],
    { priority: "normal" }
).then(function(result) {
    console.log("Notifikácia odoslaná:", result);
}).catch(function(error) {
    console.error("Chyba pri odosielaní:", error);
});
*/