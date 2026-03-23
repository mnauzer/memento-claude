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
 * Šablóna správy (voliteľné):
 *   Ak signConfig obsahuje messageTemplate (názov poľa v zdrojovom zázname),
 *   MementoSign prečíta šablónu a nahradí {FieldName|format} hodnotami zo zdrojového záznamu.
 *   Fallback: ak pole je prázdne alebo messageTemplate nie je nastavený, použije sa message parameter.
 *
 *   Formátovacie modifikátory (voliteľné, oddelené |):
 *     {Dátum|date}           → "22.03.2026"
 *     {Príchod|time}         → "07:30"
 *     {Suma|money}           → "150,00 €"
 *     {Suma|number}          → "150,00"
 *     {Suma}                 → "150" (bez formátu — raw String)
 *
 *   Bodková notácia pre linkToEntry polia:
 *     {Zamestnanec.Nick}           → field("Nick") na prvom linked entry
 *     {Zamestnanec.Priezvisko}     → field("Priezvisko") na prvom linked entry
 *     {Zákazka.Názov zákazky|...}  → s formátovacím modifikátorom
 *
 *   Príklad šablóny v Memento zázname (pole "TG Template"):
 *     💸 {Pohyb} — {Suma|money}
 *     📅 {Dátum|date}
 *     👤 {Zamestnanec.Nick} {Zamestnanec.Priezvisko}
 *     📋 {Popis platby}
 *
 *   signConfig rozšírený:
 *     messageTemplate: 'TG Template'   // názov poľa kde je šablóna
 *
 * CHANGELOG:
 * v1.3.0 (2026-03-23) - NEW: bodková notácia {LinkedField.SubField} pre linkToEntry polia
 * v1.2.0 (2026-03-22) - NEW: formátovacie modifikátory {Field|date|time|money|number} v _resolveMessage()
 * v1.1.0 (2026-03-22) - NEW: _resolveMessage() — template s {FieldName} placeholdermi zo zdrojového záznamu
 * v1.0.0 (2026-03-22) - INIT: Generic signing protocol replacing hardcoded libMap in N8N
 */

var MementoSign = (function() {
    'use strict';

    var MODULE_INFO = {
        name: "MementoSign",
        version: "1.3.0",
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
     *     kniznicaLabel:   string,   // Label pre Knižnica choice (napr. 'Pokladňa ')
     *     messageTemplate: string    // (voliteľné) Názov poľa so šablónou správy v zdrojovom zázname
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

            // Vyriešenie správy — šablóna má prioritu nad fallback message
            var resolvedMessage = _resolveMessage(sourceEntry, message, signConfig);

            // Odošli N8N webhook — minimálny payload (metadata sú v Podpis zázname)
            var payload = JSON.stringify({
                type:     "request_sign",
                podpisId: podpisId,
                chatId:   chatIdStr,
                message:  resolvedMessage
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

    /**
     * Formátuje hodnotu poľa podľa modifikátora.
     * Podporované: date, time, money, number
     */
    function _formatValue(val, fmt) {
        if (val === null || val === undefined) return "";
        if (!fmt) return String(val);

        if (fmt === "date") {
            try {
                var d = (val instanceof Date) ? val : new Date(val);
                if (isNaN(d.getTime())) return String(val);
                return ("0" + d.getDate()).slice(-2) + "." +
                       ("0" + (d.getMonth() + 1)).slice(-2) + "." +
                       d.getFullYear();
            } catch(e) { return String(val); }
        }

        if (fmt === "time") {
            try {
                // Memento time field môže byť Date alebo sekundy od polnoci
                var d;
                if (val instanceof Date) {
                    d = val;
                } else if (typeof val === "number") {
                    // sekundy od polnoci → Date (UTC)
                    var h = Math.floor(val / 3600);
                    var m = Math.floor((val % 3600) / 60);
                    return ("0" + h).slice(-2) + ":" + ("0" + m).slice(-2);
                } else {
                    d = new Date(val);
                }
                if (isNaN(d.getTime())) return String(val);
                return ("0" + d.getHours()).slice(-2) + ":" +
                       ("0" + d.getMinutes()).slice(-2);
            } catch(e) { return String(val); }
        }

        if (fmt === "money") {
            var n = parseFloat(val) || 0;
            return n.toFixed(2).replace(".", ",") + "\u00a0\u20ac";
        }

        if (fmt === "number") {
            var n = parseFloat(val) || 0;
            return n.toFixed(2).replace(".", ",");
        }

        return String(val);
    }

    /**
     * Vyrieši text správy: šablóna s {FieldName|format} placeholdermi má prioritu.
     * Fallback: pôvodný message parameter.
     */
    function _resolveMessage(sourceEntry, fallbackMessage, signConfig) {
        if (!signConfig.messageTemplate) return fallbackMessage;
        try {
            var template = sourceEntry.field(signConfig.messageTemplate);
            if (!template || String(template).trim() === "") return fallbackMessage;
            // Regex: {FieldName} alebo {FieldName|format} alebo {LinkedField.SubField|format}
            return String(template).replace(/\{([^|}]+)(?:\|([^}]+))?\}/g, function(match, fieldExpr, fmt) {
                try {
                    var expr = fieldExpr.trim();
                    var val;
                    var dotIdx = expr.indexOf('.');
                    if (dotIdx !== -1) {
                        // Bodková notácia: {LinkedField.SubField}
                        var linkName = expr.substring(0, dotIdx).trim();
                        var subName  = expr.substring(dotIdx + 1).trim();
                        var linked   = sourceEntry.field(linkName);
                        if (!linked) return "";
                        var linkedEntry = linked[0] || linked;
                        if (!linkedEntry || !linkedEntry.field) return "";
                        val = linkedEntry.field(subName);
                    } else {
                        val = sourceEntry.field(expr);
                    }
                    return _formatValue(val, fmt ? fmt.trim() : null);
                } catch(e) {
                    return "";
                }
            });
        } catch(e) {
            return fallbackMessage;
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
