// ==============================================
// CLAUDE TASK COMPLETION NOTIFIER
// Verzia: 1.0 | Dátum: December 2024 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
//    - Automatické posielanie notifikácií keď Claude dokončí úlohu
//    - Integrácia s n8n workflow
//    - Využitie existujúceho MementoTelegram systému
// ==============================================

var ClaudeTaskNotifier = (function() {
    'use strict';

    var version = "1.0.0";
    var n8nWebhookUrl = "http://localhost:5678/webhook/claude-task-completed";

    // Lazy loading pre závislosti
    var _telegram = null;
    var _core = null;
    var _config = null;

    function getTelegram() {
        if (!_telegram && typeof MementoTelegram !== 'undefined') {
            _telegram = MementoTelegram;
        }
        return _telegram;
    }

    function getCore() {
        if (!_core && typeof MementoCore !== 'undefined') {
            _core = MementoCore;
        }
        return _core;
    }

    function getConfig() {
        if (!_config && typeof MementoConfig !== 'undefined') {
            _config = MementoConfig.getConfig();
        }
        return _config;
    }

    /**
     * Pošle notifikáciu o dokončení úlohy
     * @param {Object} taskData - Údaje o úlohe
     * @returns {Object} Výsledok operácie
     */
    function notifyTaskCompletion(taskData) {
        try {
            var core = getCore();
            var telegram = getTelegram();

            if (!telegram) {
                throw new Error("MementoTelegram modul nie je dostupný");
            }

            // Príprava dát pre notifikáciu
            var notificationData = {
                status: "completed",
                task_description: taskData.description || "Claude úloha",
                result_summary: taskData.summary || "Úloha bola úspešne dokončená",
                files_modified: taskData.files ? taskData.files.join(", ") : "Žiadne",
                timestamp: new Date().toISOString(),
                telegram_chat_id: taskData.chatId || getDefaultChatId()
            };

            // Pošli cez n8n webhook
            var n8nResult = sendToN8nWebhook(notificationData);

            // Backup - pošli priamo cez Memento Telegram ak n8n zlyhá
            if (!n8nResult.success) {
                core.addDebug(entry(), "n8n webhook zlyhal, posielam priamo cez Telegram");
                return sendDirectTelegram(notificationData);
            }

            return n8nResult;

        } catch (error) {
            var core = getCore();
            if (core) {
                core.addError(entry(), "Chyba pri notifikácii: " + error.toString(), "notifyTaskCompletion", error);
            }

            return {
                success: false,
                error: error.toString()
            };
        }
    }

    /**
     * Pošle dáta do n8n webhook
     */
    function sendToN8nWebhook(data) {
        try {
            var telegram = getTelegram();
            var ai = telegram ? null : (typeof MementoAI !== 'undefined' ? MementoAI : null);

            if (!ai) {
                throw new Error("MementoAI modul nie je dostupný");
            }

            var response = ai.httpRequest("POST", n8nWebhookUrl, data);

            if (response.code === 200) {
                return {
                    success: true,
                    method: "n8n",
                    response: response.body
                };
            } else {
                throw new Error("n8n webhook error: " + response.code);
            }

        } catch (error) {
            return {
                success: false,
                error: error.toString(),
                method: "n8n"
            };
        }
    }

    /**
     * Pošle priamo cez Memento Telegram systém
     */
    function sendDirectTelegram(data) {
        try {
            var telegram = getTelegram();
            var chatId = data.telegram_chat_id;

            if (!chatId) {
                throw new Error("Chat ID nie je definované");
            }

            var message = "🎉 *Claude dokončil úlohu!*\n\n";
            message += "📋 **Úloha:** " + data.task_description + "\n";
            message += "📝 **Výsledok:** " + data.result_summary + "\n";
            message += "⏰ **Dokončené:** " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
            message += "📁 **Súbory:** " + data.files_modified + "\n";
            message += "✅ **Status:** Úspešne dokončené\n\n";
            message += "🤖 _Claude Code Assistant_";

            var result = telegram.sendTelegramMessage(chatId, message, {
                parseMode: "Markdown",
                silent: false
            });

            return {
                success: result.success,
                method: "direct_telegram",
                messageId: result.messageId,
                error: result.error
            };

        } catch (error) {
            return {
                success: false,
                error: error.toString(),
                method: "direct_telegram"
            };
        }
    }

    /**
     * Získa default Chat ID z nastavení
     */
    function getDefaultChatId() {
        try {
            var config = getConfig();
            var core = getCore();

            if (!config || !core) return null;

            var defaultsLib = libByName(config.libraries.defaults);
            if (!defaultsLib) return null;

            var settings = defaultsLib.entries();
            if (!settings || settings.length === 0) return null;

            var defaultSettings = settings[settings.length - 1];

            // Skús získať default Telegram Chat ID
            return core.safeGet(defaultSettings, "Default Chat ID") ||
                   core.safeGet(defaultSettings, "Telegram Chat ID") ||
                   core.safeGet(defaultSettings, "Claude Notifications Chat ID");

        } catch (error) {
            return null;
        }
    }

    /**
     * Helper funkcia pre jednoduché použitie
     */
    function taskCompleted(description, summary, files, chatId) {
        return notifyTaskCompletion({
            description: description,
            summary: summary,
            files: files,
            chatId: chatId
        });
    }

    /**
     * Nastaví URL pre n8n webhook
     */
    function setN8nWebhookUrl(url) {
        n8nWebhookUrl = url;
    }

    // ==============================================
    // PUBLIC API
    // ==============================================

    return {
        version: version,

        // Hlavné funkcie
        notifyTaskCompletion: notifyTaskCompletion,
        taskCompleted: taskCompleted,

        // Konfigurácia
        setN8nWebhookUrl: setN8nWebhookUrl,
        getDefaultChatId: getDefaultChatId,

        // Interné funkcie (pre debugging)
        sendToN8nWebhook: sendToN8nWebhook,
        sendDirectTelegram: sendDirectTelegram
    };
})();

// Príklad použitia:
// ClaudeTaskNotifier.taskCompleted(
//     "Vytvorenie n8n workflow",
//     "Workflow bol úspešne vytvorený a nakonfigurovaný",
//     ["n8n-task-completion-workflow.json", "claude-task-notifier.js"],
//     "@your_username"
// );