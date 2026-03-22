/**
 * Knižnica:    MementoSign
 * Názov:       MementoSign.js
 * Typ:         Core Module — Generic Telegram Signing Protocol
 * Verzia:      1.0.0
 * Dátum:       2026-03-22
 *
 * Účel:
 *   Generický protokol pre Telegram podpisovanie záznamov.
 *   Každá knižnica definuje len signConfig — N8N flow netreba meniť.
 *
 * Závislosti:
 *   - Žiadne (standalone modul)
 *   - libByName(), http() — Memento Database built-in API
 *
 * Predpoklady:
 *   Knižnica "podpisy" musí obsahovať tieto 4 nové text polia:
 *     "Zdrojová lib ID"   — Memento library ID zdrojovej knižnice
 *     "Zdrojový field ID" — Numerické field ID stavu na zdrojovom zázname
 *     "Stav: Potvrdené"   — Hodnota zapísaná pri potvrdení
 *     "Stav: Odmietnuté"  — Hodnota zapísaná pri odmietnutí
 *
 * Použitie (Pokladňa):
 *   var result = MementoSign.createPodpisAndSend(
 *       entry(), zamEntry, messageText, chatId,
 *       {
 *           libId:           'g9eS5Ny2E',
 *           sourceFieldId:   133,
 *           stavPotvrdene:   'Hotovo',
 *           stavOdmietnutie: 'Odmietnutá ',
 *           kniznicaLabel:   'Pokladňa '
 *       }
 *   );
 *   if (result.success) {
 *       entry().set("Podpis", [result.podpisEntry]);
 *       entry().set("Stav podpisu", "Čaká ");
 *   }
 *
 * Použitie (Dochádzka — loop cez zamestnancov):
 *   for (var i = 0; i < zamestnanci.length; i++) {
 *       var emp = zamestnanci[i];
 *       var chatId = emp.field("Telegram ID");
 *       if (!chatId) continue;
 *       var result = MementoSign.createPodpisAndSend(
 *           entry(), emp, buildMsg(emp), chatId,
 *           {
 *               libId:           'zNoMvrv8U',
 *               sourceFieldId:   96,
 *               stavPotvrdene:   'Hotovo',
 *               stavOdmietnutie: 'Odmietnutá ',
 *               kniznicaLabel:   'Dochádzka '
 *           }
 *       );
 *   }
 *
 * N8N Confirm Handler:
 *   Pri callbacku N8N číta Podpis záznam a extrahuje metadata — žiadny hardcoded libMap.
 *   Callback formát: sign_{podpisId}_{action}
 *
 * CHANGELOG:
 * v1.0.0 (2026-03-22) - INIT: Generic signing protocol replacing hardcoded libMap in N8N
 */

var MementoSign = (function() {
    'use strict';

    var MODULE_INFO = {
        name: "MementoSign",
        version: "1.0.0",
        date: "2026-03-22",
        description: "Generic Telegram signing protocol — N8N flow is library-agnostic"
    };

    var N8N_SIGN_URL = "https://n8n.asistanto.sk/webhook/krajinka-sign";
    var PODPISY_LIB_NAME = "podpisy";

    /**
     * Vytvorí Podpis záznam a odošle N8N webhook pre jedného zamestnanca.
     *
     * @param {Object} sourceEntry    Zdrojový záznam (Pokladňa/Dochádzka entry)
     * @param {Object} employeeEntry  Zamestnanec entry (linkToEntry objekt)
     * @param {string} message        Text Telegram správy
     * @param {string} chatId         Telegram chat ID zamestnanca (string)
     * @param {Object} signConfig     Konfigurácia:
     *   {
     *     libId:           string,   // ID zdrojovej knižnice (napr. 'g9eS5Ny2E')
     *     sourceFieldId:   number,   // Field ID stavu na zdrojovom zázname (napr. 133)
     *     stavPotvrdene:   string,   // Hodnota pri potvrdení (napr. 'Hotovo')
     *     stavOdmietnutie: string,   // Hodnota pri odmietnutí (napr. 'Odmietnutá ')
     *     kniznicaLabel:   string    // Label pre Knižnica choice (napr. 'Pokladňa ')
     *   }
     * @returns {{ success: boolean, podpisEntry: Object|null, podpisId: string|null, error: string|null }}
     */
    function createPodpisAndSend(sourceEntry, employeeEntry, message, chatId, signConfig) {
        try {
            if (!signConfig || !signConfig.libId) {
                return _err("signConfig.libId je povinné");
            }

            var podpisLib = libByName(PODPISY_LIB_NAME);
            if (!podpisLib) {
                return _err("Kni\u017enica podpisy nenájdená");
            }

            var sourceEntryId = sourceEntry.id;
            if (!sourceEntryId) {
                return _err("Zdrojov\u00fd z\u00e1znam nem\u00e1 ID");
            }

            var chatIdStr = String(chatId || "").trim();
            if (!chatIdStr) {
                return _err("chatId je pr\u00e1zdny");
            }

            // Vytvor Podpis záznam
            var podpisEntry = podpisLib.create({});

            // Štandardné polia (existujúce v podpisy knižnici)
            podpisEntry.set("Zamestnanec", [employeeEntry]);
            podpisEntry.set("Kni\u017enica", signConfig.kniznicaLabel || "");
            podpisEntry.set("Zdroj ID", sourceEntryId);
            podpisEntry.set("TG Chat ID", parseFloat(chatIdStr));
            podpisEntry.set("Stav", "Čaká ");
            podpisEntry.set("D\u00e1tum odoslania", new Date());

            // Nové metadata polia — N8N ich číta pri callbacku (generic protocol v2)
            podpisEntry.set("Zdrojov\u00e1 lib ID", signConfig.libId);
            podpisEntry.set("Zdrojov\u00fd field ID", String(signConfig.sourceFieldId || ""));
            podpisEntry.set("Stav: Potvrden\u00e9", signConfig.stavPotvrdene || "");
            podpisEntry.set("Stav: Odmietnut\u00e9", signConfig.stavOdmietnutie || "");

            var podpisId = podpisEntry.id;
            if (!podpisId) {
                return _err("Memento nepridelilo ID podpisu");
            }

            // Odošli N8N webhook — minimálny payload (metadata sú v Podpis zázname)
            var payload = JSON.stringify({
                type:     "request_sign",
                podpisId: podpisId,
                chatId:   chatIdStr,
                message:  message
            });

            var httpObj = http();
            httpObj.headers({ "Content-Type": "application/json" });
            var resp = httpObj.post(N8N_SIGN_URL, payload);
            var code = resp ? resp.code : 0;

            if (!resp || code < 200 || code >= 300) {
                return { success: false, podpisEntry: podpisEntry, podpisId: podpisId,
                         error: "N8N webhook error " + code };
            }

            return { success: true, podpisEntry: podpisEntry, podpisId: podpisId, error: null };

        } catch (e) {
            return { success: false, podpisEntry: null, podpisId: null, error: e.toString() };
        }
    }

    function _err(msg) {
        return { success: false, podpisEntry: null, podpisId: null, error: msg };
    }

    return {
        info:                MODULE_INFO,
        version:             MODULE_INFO.version,
        createPodpisAndSend: createPodpisAndSend
    };

})();
