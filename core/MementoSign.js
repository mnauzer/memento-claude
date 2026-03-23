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
 *   Typy placeholderov:
 *     {FieldName}              → pole zdrojového záznamu
 *     {LinkedField.SubField}   → pole prvého linked entry
 *     {LinkedField[n].SubField}→ pole linked entry na indexe n
 *     {emp.FieldName}          → pole zamestnanca (employeeEntry)
 *     {@varName}               → premenná z signConfig.templateVars
 *
 *   Podmienené riadky:
 *     Riadok sa automaticky vynechá ak VŠETKY placeholdery na ňom vrátia prázdny string.
 *     Príklad: "  ⭐️ Príplatok: {@priiplatok}/h" — vynechá sa ak priiplatok = ""
 *
 *   signConfig.templateVars — premenné injektované volajúcim modulom:
 *     signConfig.templateVars = { odpracovane: "8,00 h", hodinovka: "12,00 €", ... }
 *
 *   Príklad šablóny v Memento zázname (pole "TG Template"):
 *     💸 {Pohyb} — {Suma|money}
 *     📅 {Dátum|date}
 *     👤 {emp.Nick} {emp.Priezvisko}
 *     📋 {Popis platby}
 *     🛠️ {@odpracovane}
 *       ⭐️ Príplatok: +{@priiplatok}/h
 *       ⭐️ Prémia: +{@premie}
 *
 *   signConfig rozšírený:
 *     messageTemplate: 'TG Template'   // názov poľa kde je šablóna
 *
 * CHANGELOG:
 * v1.8.0 (2026-03-23) - NEW: reťazenie modifikátorov — |pos|money, |neg|number atď.; pos/neg sú filtre
 * v1.7.0 (2026-03-23) - NEW: |pos a |neg podmienené formáty — skryjú riadok ak podmienka nesedí
 * v1.6.1 (2026-03-23) - FIX: lowercase "Stav: potvrdené/odmietnuté" — zhoduje sa s reálnou knižnicou
 * v1.6.0 (2026-03-23) - NEW: TG Šablóny library lookup (priority 2); _processTemplate() extracted
 * v1.5.0 (2026-03-23) - NEW: ukladá resolved TG správu do poľa "TG Správa" v Podpis zázname
 * v1.4.0 (2026-03-23) - NEW: {emp.Field} zamestnanec, {@var} templateVars, {Field[n].Sub} index, podmienené riadky
 * v1.3.0 (2026-03-23) - NEW: bodková notácia {LinkedField.SubField} pre linkToEntry polia
 * v1.2.0 (2026-03-22) - NEW: formátovacie modifikátory {Field|date|time|money|number} v _resolveMessage()
 * v1.1.0 (2026-03-22) - NEW: _resolveMessage() — template s {FieldName} placeholdermi zo zdrojového záznamu
 * v1.0.0 (2026-03-22) - INIT: Generic signing protocol replacing hardcoded libMap in N8N
 */

var MementoSign = (function() {
    'use strict';

    var MODULE_INFO = {
        name: "MementoSign",
        version: "1.8.0",
        date: "2026-03-23",
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
            podpisEntry.set("Stav: potvrden\u00e9", signConfig.stavPotvrdene || "");
            podpisEntry.set("Stav: odmietnut\u00e9", signConfig.stavOdmietnutie || "");

            var podpisId = podpisEntry.id;
            if (!podpisId) {
                return _err("Memento nepridelilo ID podpisu");
            }

            // Vyriešenie správy — šablóna má prioritu nad fallback message
            var resolvedMessage = _resolveMessage(sourceEntry, employeeEntry, message, signConfig);

            // Ulož text správy do Podpis záznamu (pole "TG Správa" — text)
            try { podpisEntry.set("TG Správa", resolvedMessage); } catch(e) {}

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
     * Formátuje hodnotu poľa podľa reťazca modifikátorov (oddelené |).
     *
     * Modifikátory sa aplikujú zľava doprava. Ak niektorý vráti "", reťaz sa ukončí
     * a riadok sa vynechá (conditional lines).
     *
     * Terminálne (ukončia reťaz):  date, time, money, number
     * Filtre (posúvajú hodnotu ďalej):  pos, neg
     *
     * Príklady:
     *   {Suma|money}                → "150,00 €"
     *   {Suma|neg|money}            → "" ak >= 0, inak "40,00 €" (absolútna hodnota)
     *   {Suma|pos|money}            → "" ak <= 0, inak "180,00 €"
     *   {Suma|neg|number}           → "" ak >= 0, inak "40,00"
     */
    function _formatValue(val, fmt) {
        if (val === null || val === undefined) return "";
        if (!fmt) return String(val);

        var fmts = String(fmt).split('|');
        var cur  = val;

        for (var i = 0; i < fmts.length; i++) {
            var f = fmts[i].trim();
            if (!f) continue;

            if (f === "date") {
                try {
                    var d = (cur instanceof Date) ? cur : new Date(cur);
                    if (isNaN(d.getTime())) return String(cur);
                    return ("0" + d.getDate()).slice(-2) + "." +
                           ("0" + (d.getMonth() + 1)).slice(-2) + "." +
                           d.getFullYear();
                } catch(e) { return String(cur); }
            }

            if (f === "time") {
                try {
                    if (cur instanceof Date) {
                        return ("0" + cur.getHours()).slice(-2) + ":" +
                               ("0" + cur.getMinutes()).slice(-2);
                    } else if (typeof cur === "number") {
                        var h = Math.floor(cur / 3600);
                        var m = Math.floor((cur % 3600) / 60);
                        return ("0" + h).slice(-2) + ":" + ("0" + m).slice(-2);
                    } else {
                        var d = new Date(cur);
                        if (isNaN(d.getTime())) return String(cur);
                        return ("0" + d.getHours()).slice(-2) + ":" +
                               ("0" + d.getMinutes()).slice(-2);
                    }
                } catch(e) { return String(cur); }
            }

            if (f === "money") {
                if (cur === "" || cur === null || cur === undefined) return "";
                var n = parseFloat(cur) || 0;
                return n.toFixed(2).replace(".", ",") + "\u00a0\u20ac";
            }

            if (f === "number") {
                if (cur === "" || cur === null || cur === undefined) return "";
                var n = parseFloat(cur) || 0;
                return n.toFixed(2).replace(".", ",");
            }

            // Filtre — vracajú číselný výsledok alebo "" (skryje riadok)
            if (f === "pos") {
                var n = parseFloat(cur) || 0;
                if (n <= 0) return "";
                cur = n;  // posunie kladnú hodnotu ďalšiemu modifikátoru
                continue;
            }

            if (f === "neg") {
                var n = parseFloat(cur) || 0;
                if (n >= 0) return "";
                cur = Math.abs(n);  // posunie absolútnu hodnotu ďalšiemu modifikátoru
                continue;
            }
        }

        return (cur === null || cur === undefined) ? "" : String(cur);
    }

    /**
     * Vyrieši hodnotu jedného placeholder výrazu.
     * Podporuje: {Field}, {Link.Sub}, {Link[n].Sub}, {emp.Field}, {@var}
     */
    function _resolveField(expr, sourceEntry, employeeEntry, signConfig) {
        try {
            // {@varName} — templateVars injektované volajúcim modulom
            if (expr.charAt(0) === '@') {
                var vars = (signConfig && signConfig.templateVars) || {};
                var v = vars[expr.substring(1)];
                return (v !== null && v !== undefined) ? v : null;
            }

            // {emp.FieldName} — pole zamestnanca
            if (expr.substring(0, 4) === 'emp.') {
                if (!employeeEntry || !employeeEntry.field) return null;
                return employeeEntry.field(expr.substring(4));
            }

            // {LinkedField[n].SubField} — indexovaný prístup
            var bracketIdx = expr.indexOf('[');
            if (bracketIdx !== -1) {
                var linkNameB = expr.substring(0, bracketIdx);
                var rest      = expr.substring(bracketIdx + 1);
                var closeIdx  = rest.indexOf(']');
                var idx       = parseInt(rest.substring(0, closeIdx), 10) || 0;
                var subNameB  = rest.substring(closeIdx + 2); // skip "]."
                var linkedB   = sourceEntry.field(linkNameB);
                if (!linkedB || !linkedB[idx] || !linkedB[idx].field) return null;
                return linkedB[idx].field(subNameB);
            }

            // {LinkedField.SubField} — prvý linked entry
            var dotIdx = expr.indexOf('.');
            if (dotIdx !== -1) {
                var linkNameD = expr.substring(0, dotIdx);
                var subNameD  = expr.substring(dotIdx + 1);
                var linkedD   = sourceEntry.field(linkNameD);
                if (!linkedD) return null;
                var linkedEntry = linkedD[0] || linkedD;
                if (!linkedEntry || !linkedEntry.field) return null;
                return linkedEntry.field(subNameD);
            }

            // {FieldName} — priame pole zdrojového záznamu
            return sourceEntry.field(expr);

        } catch(e) {
            return null;
        }
    }

    /**
     * Spracuje šablónu — nahradí placeholdery, vynechá prázdne podmienené riadky.
     */
    function _processTemplate(template, sourceEntry, employeeEntry, signConfig) {
        try {
            var lines = String(template).split('\n');
            var resultLines = [];

            for (var l = 0; l < lines.length; l++) {
                var line = lines[l];
                var placeholderCount = 0;
                var emptyCount = 0;

                var resolvedLine = line.replace(/\{([^|}]+)(?:\|([^}]+))?\}/g, function(match, fieldExpr, fmt) {
                    placeholderCount++;
                    var val = _resolveField(fieldExpr.trim(), sourceEntry, employeeEntry, signConfig);
                    var formatted = _formatValue(val, fmt ? fmt.trim() : null);
                    if (formatted === "") emptyCount++;
                    return formatted;
                });

                if (placeholderCount > 0 && emptyCount === placeholderCount) continue;
                resultLines.push(resolvedLine);
            }

            return resultLines.join('\n');
        } catch(e) {
            return template;
        }
    }

    /**
     * Vyrieši text správy — prioritný reťazec:
     *   1. Per-record pole (signConfig.messageTemplate) — override pre konkrétny záznam
     *   2. Knižnica "TG Šablóny" — lookup podľa signConfig.kniznicaLabel (pole "Knižnica")
     *   3. Fallback: pôvodný message parameter
     */
    function _resolveMessage(sourceEntry, employeeEntry, fallbackMessage, signConfig) {
        // Priority 1: per-record override
        if (signConfig.messageTemplate) {
            try {
                var perRecord = sourceEntry.field(signConfig.messageTemplate);
                if (perRecord && String(perRecord).trim() !== '') {
                    return _processTemplate(String(perRecord), sourceEntry, employeeEntry, signConfig);
                }
            } catch(e) {}
        }

        // Priority 2: knižnica TG Šablóny
        if (signConfig.kniznicaLabel) {
            try {
                var tgLib = libByName('TG Šablóny');
                if (tgLib) {
                    var tgEntries = tgLib.entries();
                    var targetLabel = String(signConfig.kniznicaLabel).trim();
                    for (var i = 0; i < tgEntries.length; i++) {
                        var tgE = tgEntries[i];
                        if (String(tgE.field('Knižnica') || '').trim() === targetLabel) {
                            var libTemplate = tgE.field('Šablóna');
                            if (libTemplate && String(libTemplate).trim() !== '') {
                                return _processTemplate(String(libTemplate), sourceEntry, employeeEntry, signConfig);
                            }
                            break;
                        }
                    }
                }
            } catch(e) {}
        }

        // Priority 3: fallback
        return fallbackMessage;
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
