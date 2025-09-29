// ==============================================
// CLAUDE TELEGRAM BOT HANDLER
// Verzia: 1.0 | Dátum: December 2024 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
//    - Spracovanie príchodiacich Telegram správ
//    - Integrácia s Claude Code pre obojsmernú komunikáciu
//    - Automatické rozpoznanie príkazov a inštrukcií
// ==============================================

var ClaudeTelegramBotHandler = (function() {
    'use strict';

    var version = "1.0.0";

    // Konfigurácia
    var config = {
        telegramBotToken: "7529072263:AAE60n5-i9iwwhuEHPoy67w9LWDF3ICnAB0",
        allowedChatId: "-1003143784435",
        allowedThreadId: "2",
        claudeWebhookUrl: "http://localhost:8080/claude-instruction",
        n8nWebhookUrl: "http://localhost:5678/webhook/telegram-webhook",
        claudeCommands: ["#claude", "/claude", "claude"],
        timeout: 30000
    };

    /**
     * Nastavenie Telegram webhook
     */
    function setupTelegramWebhook() {
        return new Promise(function(resolve, reject) {
            try {
                var webhookUrl = config.n8nWebhookUrl;
                var telegramSetupUrl = "https://api.telegram.org/bot" + config.telegramBotToken + "/setWebhook";

                var webhookData = {
                    url: webhookUrl,
                    allowed_updates: ["message"],
                    drop_pending_updates: true
                };

                // HTTP request na nastavenie webhook
                if (typeof MementoAI !== 'undefined') {
                    var response = MementoAI.httpRequest("POST", telegramSetupUrl, webhookData);

                    if (response.code === 200) {
                        var result = JSON.parse(response.body);
                        if (result.ok) {
                            resolve({
                                success: true,
                                webhook_url: webhookUrl,
                                telegram_response: result
                            });
                        } else {
                            reject(new Error("Telegram webhook setup failed: " + result.description));
                        }
                    } else {
                        reject(new Error("HTTP error: " + response.code));
                    }
                } else {
                    // Browser environment
                    fetch(telegramSetupUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(webhookData)
                    })
                    .then(function(response) {
                        if (response.ok) {
                            return response.json();
                        } else {
                            throw new Error('Webhook setup failed: ' + response.status);
                        }
                    })
                    .then(function(result) {
                        if (result.ok) {
                            resolve({
                                success: true,
                                webhook_url: webhookUrl,
                                telegram_response: result
                            });
                        } else {
                            reject(new Error("Telegram webhook setup failed: " + result.description));
                        }
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
     * Spracovanie príchodiacej Telegram správy
     */
    function processIncomingMessage(telegramUpdate) {
        return new Promise(function(resolve, reject) {
            try {
                if (!telegramUpdate.message) {
                    reject(new Error("No message in update"));
                    return;
                }

                var message = telegramUpdate.message;
                var chatId = message.chat.id.toString();
                var threadId = message.message_thread_id ? message.message_thread_id.toString() : null;
                var text = message.text || "";

                // Validácia chatu a threadu
                if (chatId !== config.allowedChatId) {
                    reject(new Error("Message from unauthorized chat: " + chatId));
                    return;
                }

                if (threadId !== config.allowedThreadId) {
                    reject(new Error("Message from unauthorized thread: " + threadId));
                    return;
                }

                // Kontrola či ide o Claude príkaz
                var isClaudeCommand = false;
                var cleanInstruction = text;

                for (var i = 0; i < config.claudeCommands.length; i++) {
                    var cmd = config.claudeCommands[i];
                    if (text.toLowerCase().startsWith(cmd.toLowerCase())) {
                        isClaudeCommand = true;
                        cleanInstruction = text.substring(cmd.length).trim();
                        break;
                    }
                }

                // Príprava inštrukcie pre Claude
                var claudeInstruction = {
                    type: "telegram_instruction",
                    chat_id: chatId,
                    message_thread_id: threadId,
                    user_id: message.from.id,
                    username: message.from.username || message.from.first_name,
                    message_id: message.message_id,
                    original_text: text,
                    instruction_text: cleanInstruction,
                    is_claude_command: isClaudeCommand,
                    timestamp: new Date().toISOString(),
                    source: "telegram_group",

                    claude_context: isClaudeCommand ? {
                        command_type: detectCommandType(cleanInstruction),
                        priority: detectPriority(cleanInstruction),
                        language: detectLanguage(cleanInstruction)
                    } : null
                };

                resolve(claudeInstruction);

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Detekcia typu príkazu
     */
    function detectCommandType(text) {
        var lowerText = text.toLowerCase();

        if (lowerText.includes('script') || lowerText.includes('kód')) {
            return 'script_request';
        } else if (lowerText.includes('fix') || lowerText.includes('oprav')) {
            return 'fix_request';
        } else if (lowerText.includes('update') || lowerText.includes('aktualizuj')) {
            return 'update_request';
        } else if (lowerText.includes('create') || lowerText.includes('vytvor')) {
            return 'create_request';
        } else if (lowerText.includes('test') || lowerText.includes('testuj')) {
            return 'test_request';
        } else if (lowerText.includes('delete') || lowerText.includes('zmaž')) {
            return 'delete_request';
        } else {
            return 'general_instruction';
        }
    }

    /**
     * Detekcia priority
     */
    function detectPriority(text) {
        var lowerText = text.toLowerCase();

        if (lowerText.includes('urgent') || lowerText.includes('naliehavé') ||
            lowerText.includes('kritické') || lowerText.includes('!!!')) {
            return 'high';
        } else if (lowerText.includes('low') || lowerText.includes('nízka')) {
            return 'low';
        } else {
            return 'normal';
        }
    }

    /**
     * Detekcia jazyka
     */
    function detectLanguage(text) {
        // Slovenské znaky
        if (text.includes('ž') || text.includes('č') || text.includes('š') ||
            text.includes('ť') || text.includes('ľ') || text.includes('ň')) {
            return 'slovak';
        } else {
            return 'english';
        }
    }

    /**
     * Poslanie inštrukcie do Claude Code
     */
    function sendToClaudeCode(instruction) {
        return new Promise(function(resolve, reject) {
            try {
                if (typeof MementoAI !== 'undefined') {
                    var response = MementoAI.httpRequest("POST", config.claudeWebhookUrl, instruction);

                    if (response.code >= 200 && response.code < 300) {
                        var result = JSON.parse(response.body);
                        resolve({
                            success: true,
                            claude_response: result,
                            instruction_id: instruction.message_id
                        });
                    } else {
                        reject(new Error("Claude Code webhook error: " + response.code));
                    }
                } else {
                    // Browser environment
                    fetch(config.claudeWebhookUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer claude-telegram-bot-token'
                        },
                        body: JSON.stringify(instruction),
                        timeout: config.timeout
                    })
                    .then(function(response) {
                        if (response.ok) {
                            return response.json();
                        } else {
                            throw new Error('Claude Code error: ' + response.status);
                        }
                    })
                    .then(function(result) {
                        resolve({
                            success: true,
                            claude_response: result,
                            instruction_id: instruction.message_id
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
     * Odoslanie potvrdenia do Telegramu
     */
    function sendConfirmation(chatId, threadId, messageId, instructionText, isClaudeCommand) {
        return new Promise(function(resolve, reject) {
            try {
                var telegramUrl = "https://api.telegram.org/bot" + config.telegramBotToken + "/sendMessage";
                var confirmText;

                if (isClaudeCommand) {
                    var shortInstruction = instructionText.length > 100 ?
                        instructionText.substring(0, 100) + "..." : instructionText;
                    confirmText = "🤖 Claude Code prijal inštrukciu: " + shortInstruction + "\n\n⏳ Spracovávam...";
                } else {
                    confirmText = "📝 Správa zaznamenaná ale neobsahuje príkaz pre Claude Code.\n\n💡 Pre aktiváciu Claude použite:\n• #claude [inštrukcia]\n• /claude [inštrukcia]\n• claude [inštrukcia]";
                }

                var telegramData = {
                    chat_id: chatId,
                    message_thread_id: parseInt(threadId),
                    text: confirmText,
                    parse_mode: "Markdown",
                    reply_to_message_id: messageId,
                    disable_web_page_preview: true
                };

                if (typeof MementoAI !== 'undefined') {
                    var response = MementoAI.httpRequest("POST", telegramUrl, telegramData);

                    if (response.code === 200) {
                        var result = JSON.parse(response.body);
                        resolve({
                            success: true,
                            telegram_message_id: result.result.message_id,
                            confirmation_sent: true
                        });
                    } else {
                        reject(new Error("Telegram confirmation error: " + response.code));
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
                            throw new Error('Telegram confirmation failed: ' + response.status);
                        }
                    })
                    .then(function(result) {
                        resolve({
                            success: true,
                            telegram_message_id: result.result.message_id,
                            confirmation_sent: true
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
     * Hlavná funkcia na spracovanie Telegram update
     */
    function handleTelegramUpdate(telegramUpdate) {
        return new Promise(function(resolve, reject) {
            processIncomingMessage(telegramUpdate)
                .then(function(instruction) {
                    var promises = [];

                    // Ak je to Claude príkaz, pošli do Claude Code
                    if (instruction.is_claude_command) {
                        promises.push(sendToClaudeCode(instruction));
                    }

                    // Vždy pošli potvrdenie
                    promises.push(sendConfirmation(
                        instruction.chat_id,
                        instruction.message_thread_id,
                        instruction.message_id,
                        instruction.instruction_text,
                        instruction.is_claude_command
                    ));

                    Promise.all(promises)
                        .then(function(results) {
                            resolve({
                                success: true,
                                instruction: instruction,
                                results: results
                            });
                        })
                        .catch(function(error) {
                            reject(error);
                        });
                })
                .catch(function(error) {
                    reject(error);
                });
        });
    }

    /**
     * Test funkcia
     */
    function testBidirectionalBot() {
        return new Promise(function(resolve, reject) {
            // Simulovaný Telegram update
            var testUpdate = {
                message: {
                    message_id: 12345,
                    from: {
                        id: 123456789,
                        username: "test_user",
                        first_name: "Test User"
                    },
                    chat: {
                        id: -1003143784435,
                        type: "supergroup"
                    },
                    message_thread_id: 2,
                    date: Math.floor(Date.now() / 1000),
                    text: "#claude vytvor test script pre overenie funkcií"
                }
            };

            console.log("🧪 Testovanie bidirectional bot systému...");

            handleTelegramUpdate(testUpdate)
                .then(function(result) {
                    console.log("✅ Test úspešný:", result);
                    resolve(result);
                })
                .catch(function(error) {
                    console.log("❌ Test neúspešný:", error);
                    reject(error);
                });
        });
    }

    // ==============================================
    // PUBLIC API
    // ==============================================

    return {
        version: version,

        // Hlavné funkcie
        setupTelegramWebhook: setupTelegramWebhook,
        handleTelegramUpdate: handleTelegramUpdate,
        processIncomingMessage: processIncomingMessage,
        sendToClaudeCode: sendToClaudeCode,
        sendConfirmation: sendConfirmation,

        // Test funkcie
        testBidirectionalBot: testBidirectionalBot,

        // Konfigurácia
        setConfig: function(newConfig) {
            Object.assign(config, newConfig);
        },
        getConfig: function() {
            return Object.assign({}, config);
        },

        // Utility funkcie
        detectCommandType: detectCommandType,
        detectPriority: detectPriority,
        detectLanguage: detectLanguage
    };
})();

// Globálne dostupné
if (typeof window !== 'undefined') {
    window.ClaudeTelegramBot = ClaudeTelegramBotHandler;
} else if (typeof global !== 'undefined') {
    global.ClaudeTelegramBot = ClaudeTelegramBotHandler;
}

// Príklad použitia:
/*
// Nastavenie webhook
ClaudeTelegramBotHandler.setupTelegramWebhook()
    .then(function(result) {
        console.log("Webhook nastavený:", result);
    });

// Spracovanie príchodiacej správy
ClaudeTelegramBotHandler.handleTelegramUpdate(telegramUpdate)
    .then(function(result) {
        console.log("Správa spracovaná:", result);
    });
*/