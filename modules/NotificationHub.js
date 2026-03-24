/**
 * Module:      NotificationHub
 * Verzia:      1.1.0
 * Dátum:       2026-03-24
 * Autor:       ASISTANTO
 *
 * Účel:
 *   Lightweight helper pre vytváranie Notification záznamov.
 *   Použiteľný v KAŽDOM kontexte vrátane synchronných triggerov
 *   (BeforeDelete, BeforeSave) kde MementoTelegram/MementoUtils
 *   nie sú dostupné alebo http() nefunguje.
 *
 * Závislosti: ŽIADNE (len libByName z Memento API)
 *
 * Použitie:
 *   NotificationHub.createNotification({
 *       typ: "DELETE",           // SEND | EDIT | DELETE | STATUS_UPDATE
 *       chatId: "5309883029",
 *       messageId: "315",        // pre DELETE/EDIT
 *       text: "Správa",          // pre SEND (priamy text)
 *       sablona: "nazov",        // pre SEND (šablóna z TG Šablóny)
 *       data: '{"key":"val"}',   // JSON dáta pre šablónu
 *       keyboard: '[...]',       // JSON inline keyboard
 *       callbackData: "...",     // callback identifikácia
 *       threadId: "123",         // TG thread ID (voliteľné)
 *       zdroj: "podpisy",        // zdrojová knižnica
 *       zdrojId: "abc123"        // entry ID zdroja
 *   });
 *
 * CHANGELOG:
 *   v1.1.0 (2026-03-24) - Fix: "Správa" pole je REQUIRED — vždy nastaviť (aj "" pre DELETE)
 *   v1.0.0 (2026-03-24) - Inicálna verzia pre Notifications Hub MVP
 */

var NotificationHub = (function() {
    'use strict';

    var MODULE_INFO = {
        name: "NotificationHub",
        version: "1.1.0",
        author: "ASISTANTO",
        date: "2026-03-24"
    };

    var NOTIFICATIONS_LIB = "Notifications";

    // Pole názvy — zhodné s MementoConfig.fields.notifications
    var FIELDS = {
        operationType: "Typ operácie",
        status: "Status",
        chatId: "Chat ID",
        threadId: "Thread ID",
        messageId: "Message ID",
        message: "Správa",
        template: "Šablóna",
        templateData: "Dáta",
        inlineKeyboard: "Inline keyboard",
        callbackData: "Callback Data",
        sourceLibrary: "Zdrojová knižnica",
        sourceId: "Zdrojový ID",
        retryCount: "Retry Count",
        messageSource: "Zdroj správy",
        lastError: "Posledná chyba"
    };

    /**
     * Vytvorí nový Notification záznam v Notifications knižnici.
     *
     * @param {Object} params
     * @param {string} params.typ           - Typ operácie: SEND | EDIT | DELETE | STATUS_UPDATE
     * @param {string} params.chatId        - Telegram Chat ID
     * @param {string} [params.messageId]   - TG Message ID (pre DELETE/EDIT)
     * @param {string} [params.threadId]    - TG Thread ID
     * @param {string} [params.text]        - Priamy text správy (pre SEND bez šablóny)
     * @param {string} [params.sablona]     - Názov šablóny z TG Šablóny
     * @param {string} [params.data]        - JSON string s dátami pre šablónu
     * @param {string} [params.keyboard]    - JSON string s inline keyboard
     * @param {string} [params.callbackData] - Callback identifikácia
     * @param {string} [params.zdroj]       - Názov zdrojovej knižnice
     * @param {string} [params.zdrojId]     - Entry ID zdrojového záznamu
     * @returns {Object|null} Vytvorený Notification entry alebo null pri chybe
     */
    function createNotification(params) {
        try {
            if (!params || !params.typ || !params.chatId) {
                return null;
            }

            var notifLib = libByName(NOTIFICATIONS_LIB);
            if (!notifLib) {
                return null;
            }

            var n = notifLib.create({});

            // Povinné polia
            n.set(FIELDS.operationType, params.typ);
            n.set(FIELDS.chatId, String(params.chatId));
            n.set(FIELDS.status, "Čaká");
            n.set(FIELDS.messageSource, "Automatická ");
            // "Správa" je REQUIRED pole — vždy nastaviť (aj prázdny string pre DELETE)
            n.set(FIELDS.message, params.text || "");

            // Voliteľné TG polia
            if (params.messageId) {
                n.set(FIELDS.messageId, String(params.messageId));
            }
            if (params.threadId) {
                n.set(FIELDS.threadId, String(params.threadId));
            }

            // Obsah správy (Správa už nastavená vyššie s fallback na "")
            if (params.sablona) {
                n.set(FIELDS.template, params.sablona);
            }
            if (params.data) {
                n.set(FIELDS.templateData, params.data);
            }

            // Inline keyboard a callback
            if (params.keyboard) {
                n.set(FIELDS.inlineKeyboard, params.keyboard);
            }
            if (params.callbackData) {
                n.set(FIELDS.callbackData, params.callbackData);
            }

            // Zdroj
            if (params.zdroj) {
                n.set(FIELDS.sourceLibrary, params.zdroj);
            }
            if (params.zdrojId) {
                n.set(FIELDS.sourceId, String(params.zdrojId));
            }

            // Retry na 0
            n.set(FIELDS.retryCount, 0);

            return n;

        } catch (e) {
            return null;
        }
    }

    // ===== PUBLIC API =====
    return {
        info: MODULE_INFO,
        version: MODULE_INFO.version,
        FIELDS: FIELDS,
        createNotification: createNotification
    };

})();
