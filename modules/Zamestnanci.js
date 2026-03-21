/**
 * Module:      Zamestnanci
 * Version:     1.16.0
 * Author:      ASISTANTO
 * Date:        2026-03-21
 *
 * Purpose:
 *   Reusable module for employee wage calculations based on attendance records.
 *   Calculates: Odpracované, Zarobené, Prémie fields from Dochádzka linkToEntry attributes.
 *   Supports period filtering via "obdobie" and "obdobie total" choice fields.
 *
 * Dependencies:
 *   - MementoUtils v8.1+
 *   - MementoConfig v8.0+
 *   - MementoCore v8.0+
 *   - MementoTime v1.1+
 *
 * Architecture:
 *   - IIFE pattern (Immediately Invoked Function Expression)
 *   - Public API: calculateWages(employeeEntry, config, utils)
 *   - Used by ultra-thin wrapper scripts in libraries/zamestnanci/
 *
 * Usage:
 *   var result = Zamestnanci.calculateWages(entry(), utils.config, utils);
 *   if (!result.success) {
 *       dialog("Kritická chyba", result.error, "OK");
 *       cancel();
 *   }
 *
 * Changelog:
 *   v1.16.0 (2026-03-21) - Add sendReportToTelegram() — monospace table via Telegram HTML
 *     - telegram param passed from outside (MementoTelegram circular dep. workaround)
 *     - Reads Dochádzka + Pokladňa same as generateReport() — per-day detail
 *     - Formats with <pre> blocks + padL/padR for column alignment
 *     - Private helpers added: padL(), padR(), rep(), escHtml(), fmtCell()
 *     - Sends via telegram.sendTelegramMessage(chatId, msg, {parseMode:"HTML"})
 *   v1.15.0 (2026-03-21) - Integrate generateReport() into calculateWages() as STEP 6
 *     - HTML report generated automatically on every recalculation
 *     - Report error is logged but does not block wage calculation result
 *   v1.14.0 (2026-03-21) - Add generateReport() — HTML report in "report" field
 *     - Period from "obdobie" field (no parameter needed)
 *     - Table 1: Odpracované — date, Príchod–Odchod, hours, hodinovka attr, denná mzda
 *     - Table 2: Vyplatené — date, Popis platby, suma (filter: Výdavok + Mzda)
 *     - Summary: Nedoplatok (red) / Preplatok (green) with underline
 *     - Alternating row colors, footer row totals, generation timestamp
 *     - New helpers: formatTime() (UTC), formatMoney() (Slovak comma format)
 *     - ATTRS.attrHodinovka, EXTERNAL.dochPrichod/dochOdchod/poklPopis, FIELDS.report added
 *   v1.13.0 (2026-03-21) - Info formatting + Nedoplatok/Preplatok logic fix
 *     - Header: "Prepočet mzdy (Nick)" — name inline in heading, no separate line
 *     - Nedoplatok/Preplatok reversed: positive = Nedoplatok (red, firma dlhuje), negative = Preplatok (green)
 *     - Nedoplatok/Preplatok moved to first item in period section (before Odpracované)
 *     - Debug log: removed directLog duplicates (utils.addDebug works after moment() fix)
 *   v1.12.0 (2026-03-21) - Remove all moment() dependencies — use native JS Date
 *     - ROOT CAUSE FIX: moment not available in Memento action/trigger execution context
 *     - calculateDateRange() fully rewritten with native Date arithmetic
 *     - formatDate() helper added (replaces moment().format("DD.MM.YYYY"))
 *     - formatPeriodHeading() rewritten with Date.getMonth()/getFullYear()/getDate()
 *     - Debug message in calculateWageFields() uses formatDate() instead of moment()
 *   v1.11.0 (2026-03-21) - Add directLog() helper for reliable Debug_Log writes
 *     - utils.addDebug() silently fails when MementoConfig not loaded in Memento context
 *     - directLog() writes to entry directly (no MementoCore/Config dependency)
 *     - Used in calculateWages(), calculateWageFields(), calculatePaidFromPokladna()
 *     - catch blocks now log errors directly (visible even if utils broken)
 *   v1.10.0 (2026-03-21) - Improved info field formatting
 *     - Smaller headings (### instead of # / ##)
 *     - Nick without label (just name, plain text)
 *     - Period heading shows actual date range (e.g. "Marec 2026", "1.3.2026 – 31.3.2026")
 *     - Preplatok/Nedoplatok: label changes based on sign, colored with HTML span
 *   v1.9.0 (2026-03-21) - Add Vyplatené from Pokladňa + Preplatok/Nedoplatok
 *     - New: calculatePaidFromPokladna() — sums Pokladňa Výdavok/Mzda records per period
 *     - calculateWages() STEP 3: Vyplatené (Pokladňa), Na zákazkách=0, Jazdy=0, Preplatok/Nedoplatok
 *     - calculateWages() STEP 4: Vyplatené total (Pokladňa), Na zákazkách total=0, Jazdy total=0
 *     - Preplatok/Nedoplatok = Zarobené − Vyplatené
 *   v1.8.0 (2026-03-21) - Module-level FIELDS constant (single source of truth)
 *     - Add module-level FIELDS constant with all field names verified from fields.json
 *     - Remove local FIELDS object from calculateWages() - use module FIELDS
 *     - Remove config fallback from updateCurrentHourlyRate() - use FIELDS.hourlyRate directly
 *     - All hardcoded field strings replaced with FIELDS.xxx references
 *     - Wrong field name now surfaces as exception → catch → addError → Error_Log
 *   v1.7.0 (2026-03-21) - Use config for hourlyRate field name
 *     - updateCurrentHourlyRate() uses config.fields.employee.hourlyRate with fallback
 *     - MementoConfig fixed: "Hodinovka" → "Aktuálna hodinovka" (verified from fields.json ID:42)
 *   v1.6.0 (2026-03-21) - Fix field names from API verification
 *     - CRITICAL FIX: Use "Platnosť od" (not "Platné od") - verified via API
 *     - Remove fallback field names (use exact names only)
 *     - Note: "Platné do" field doesn't exist (library has only 3 fields)
 *     - Rates are valid indefinitely (no end date in data model)
 *   v1.5.0 (2026-03-20) - Add hourly rate lookup from historical data
 *     - New: getCurrentHourlyRate() - finds current rate from "sadzby zamestnancov"
 *     - New: updateCurrentHourlyRate() - updates "Aktuálna hodinovka" field
 *   v1.4.0 (2026-03-20) - Add calculateWagesAction for button actions
 *   v1.3.1 (2026-03-20) - Trim choice labels (Memento adds trailing spaces!)
 *   v1.3.0 (2026-03-20) - Fix period filter (choice returns LABEL!)
 *   v1.2.0 (2026-03-20) - Fix period filter (choice field returns string!)
 *   v1.1.0 (2026-03-20) - Visual improvements in debug log
 *   v1.0.0 (2026-03-20) - Complete implementation
 */

'use strict';

var Zamestnanci = (function() {

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "Zamestnanci",
        version: "1.16.0",
        author: "ASISTANTO",
        date: "2026-03-21",
        library: "zamestnanci",              // → libraries/zamestnanci/fields.json
        externalLibraries: ["sadzby-zamestnancov", "dochadzka", "pokladna"]  // → libraries/*/fields.json
    };

    // ==============================================
    // FIELD NAME CONSTANTS (single source of truth)
    // ==============================================
    // FIELDS  = primary library (zamestnanci) only
    // EXTERNAL = external libraries (sadzby-zamestnancov, dochadzka)
    // All names verified from libraries/*/fields.json

    var FIELDS = {
        nick: "Nick",                           // ID:22, text, role:name
        hourlyRate: "Aktuálna hodinovka",       // ID:42, double, €
        workedTime: "Odpracované",              // ID:31, double, h
        earned: "Zarobené",                     // ID:33, currency
        bonuses: "Prémie",                      // ID:94, currency
        vyplatene: "Vyplatené",                 // ID:34, currency (from Pokladňa)
        preplatok: "Preplatok/Nedoplatok",      // ID:35, currency = Zarobené - Vyplatené
        naZakazkach: "Na zákazkách",            // ID:32, double, h (set to 0, future)
        jazdy: "Jazdy",                         // ID:88, double, h (set to 0, future)
        workedTimeTotal: "Odpracované total",   // ID:55, double, h
        earnedTotal: "Zarobené total",          // ID:54, currency
        bonusesTotal: "Prémie total",           // ID:102, currency
        vyplateneTotal: "Vyplatené total",      // ID:56, currency (from Pokladňa)
        naZakazkachTotal: "Na zákazkách total", // ID:57, double, h (set to 0, future)
        jezdyTotal: "Jazdy total",              // ID:89, double, h (set to 0, future)
        period: "obdobie",                      // ID:86, choice
        periodTotal: "obdobie total",           // ID:90, choice
        info: "info",                           // ID:93, text
        report: "report",                       // HTML report field (richtext)
        debugLog: "Debug_Log"                   // ID:80, text
    };

    var EXTERNAL = {
        // sadzby-zamestnancov library fields
        rateEmployee: "Zamestnanec",            // ID:2, entries (linkToEntry)
        rateValidFrom: "Platnosť od",           // ID:3, date, required
        rateValue: "Sadzba",                    // ID:4, currency, required
        // NOTE: "Platné do" does NOT exist - verified from fields.json (only 3 fields)

        // Dochádzka fields (used in linksFrom queries)
        dochDate: "Dátum",
        dochEmployees: "Zamestnanci",
        dochPrichod: "Príchod",                 // ID:1, time — start of shift
        dochOdchod: "Odchod",                   // ID:2, time — end of shift

        // Pokladňa fields (used in linksFrom queries)
        poklZamestnanec: "Zamestnanec",         // ID:17, linkToEntry → Zamestnanci
        poklPohyb: "Pohyb",                     // ID:119, choice: "Výdavok" pre mzdy
        poklUcelVydaja: "Účel výdaja",          // ID:12, choice: "Mzda"
        poklSuma: "Suma",                       // ID:100, double, vyplatená suma
        poklPopis: "Popis platby"               // ID:5, text, description for report
    };

    // LinkToEntry attributes — NOT validated (not in fields.json)
    var ATTRS = {
        attrWorked: "odpracované",
        attrHodinovka: "hodinovka",             // effective hourly rate for that shift
        attrDailyWage: "denná mzda",
        attrBonus: "+príplatok (€/h)",
        attrPremium: "+prémia (€)",
        attrPenalty: "-pokuta (€)"
    };

    // ==============================================
    // PRIVATE HELPER FUNCTIONS
    // ==============================================

    /**
     * Direct write to Debug_Log — no dependency on MementoUtils/MementoCore/MementoConfig.
     * Falls back gracefully if entry.set() fails.
     */
    function directLog(entry, msg) {
        try {
            var cur = entry.field(FIELDS.debugLog) || "";
            entry.set(FIELDS.debugLog, cur + msg + "\n");
        } catch(e) {}
    }

    /**
     * Direct write to Error_Log — same approach as directLog.
     */
    function directError(entry, msg) {
        try {
            var cur = entry.field("Error_Log") || "";
            entry.set("Error_Log", cur + "[ERR] " + msg + "\n");
        } catch(e) {}
    }

    /**
     * Format a Date as "DD.MM.YYYY" — no moment dependency.
     */
    function formatDate(d) {
        var dd = d.getDate(), mm = d.getMonth() + 1, yyyy = d.getFullYear();
        return (dd < 10 ? "0" : "") + dd + "." + (mm < 10 ? "0" : "") + mm + "." + yyyy;
    }

    /**
     * Format a time field value as "HH:MM".
     * Memento time fields return Date objects — use UTC to avoid timezone shift.
     */
    function formatTime(t) {
        if (!t) return "";
        var h = t.getUTCHours(), m = t.getUTCMinutes();
        return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
    }

    /**
     * Format a number as Slovak currency string "1 234,56 €".
     */
    function formatMoney(v) {
        if (!v) return "0,00 \u20ac";
        var parts = Math.abs(v).toFixed(2).split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
        return (v < 0 ? "-" : "") + parts[0] + "," + parts[1] + "\u00a0\u20ac";
    }

    /** Pad string on the RIGHT to fixed width (left-align). Truncates if too long. */
    function padR(s, len) {
        s = String(s == null ? "" : s);
        while (s.length < len) s += " ";
        return s.length > len ? s.substring(0, len) : s;
    }

    /** Pad string on the LEFT to fixed width (right-align). */
    function padL(s, len) {
        s = String(s == null ? "" : s);
        while (s.length < len) s = " " + s;
        return s.length > len ? s.substring(s.length - len) : s;
    }

    /** Repeat character n times. */
    function rep(ch, n) {
        var s = "";
        for (var i = 0; i < n; i++) s += ch;
        return s;
    }

    /** Escape HTML special characters for Telegram HTML parseMode. */
    function escHtml(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    /** Format a number compactly for monospace table (e.g. "246,00€"). */
    function fmtCell(v) {
        return (v || 0).toFixed(2).replace(".", ",") + "\u20ac";
    }

    /**
     * Convert "obdobie" choice to date range — no moment dependency.
     * Uses native JS Date (handles month/day overflow correctly).
     */
    function calculateDateRange(choice, referenceDate) {
        var now = referenceDate || new Date();
        var y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
        var start, end;

        // Map choice labels to numbers (Memento returns label text, not values!)
        var choiceMap = {
            "tento deň": 1,
            "tento týždeň": 2,
            "tento mesiac": 3,
            "tento rok": 4,
            "Total": 5,
            "minulý týždeň": 6,
            "minulý mesiac": 7,
            "minulý rok": 8,
            "posledných 7 dní": 9,
            "posledných 14 dní": 10,
            "posledných 30 dní": 11,
            "posledných 90 dní": 12
        };

        // CRITICAL: Trim choice (Memento adds trailing spaces!)
        var choiceTrimmed = choice ? choice.toString().trim() : "";
        var choiceNum = choiceMap[choiceTrimmed] || parseInt(choiceTrimmed, 10) || 3;

        // Monday-based week offset (0=Mon … 6=Sun)
        var dow = (now.getDay() + 6) % 7;

        switch (choiceNum) {
            case 1: // tento deň
                start = new Date(y, m, d, 0, 0, 0, 0);
                end   = new Date(y, m, d, 23, 59, 59, 999);
                break;

            case 2: // tento týždeň (Po–Ne)
                start = new Date(y, m, d - dow, 0, 0, 0, 0);
                end   = new Date(y, m, d - dow + 6, 23, 59, 59, 999);
                break;

            case 3: // tento mesiac
                start = new Date(y, m, 1, 0, 0, 0, 0);
                end   = new Date(y, m + 1, 0, 23, 59, 59, 999);
                break;

            case 4: // tento rok
                start = new Date(y, 0, 1, 0, 0, 0, 0);
                end   = new Date(y, 11, 31, 23, 59, 59, 999);
                break;

            case 5: // Total (all time)
                start = new Date(2000, 0, 1, 0, 0, 0, 0);
                end   = new Date(y, m, d, 23, 59, 59, 999);
                break;

            case 6: // minulý týždeň
                start = new Date(y, m, d - dow - 7, 0, 0, 0, 0);
                end   = new Date(y, m, d - dow - 1, 23, 59, 59, 999);
                break;

            case 7: // minulý mesiac
                start = new Date(y, m - 1, 1, 0, 0, 0, 0);
                end   = new Date(y, m, 0, 23, 59, 59, 999);
                break;

            case 8: // minulý rok
                start = new Date(y - 1, 0, 1, 0, 0, 0, 0);
                end   = new Date(y - 1, 11, 31, 23, 59, 59, 999);
                break;

            case 9:  // posledných 7 dní
                start = new Date(y, m, d - 7, 0, 0, 0, 0);
                end   = new Date(y, m, d, 23, 59, 59, 999);
                break;

            case 10: // posledných 14 dní
                start = new Date(y, m, d - 14, 0, 0, 0, 0);
                end   = new Date(y, m, d, 23, 59, 59, 999);
                break;

            case 11: // posledných 30 dní
                start = new Date(y, m, d - 30, 0, 0, 0, 0);
                end   = new Date(y, m, d, 23, 59, 59, 999);
                break;

            case 12: // posledných 90 dní
                start = new Date(y, m, d - 90, 0, 0, 0, 0);
                end   = new Date(y, m, d, 23, 59, 59, 999);
                break;

            default: // tento mesiac
                start = new Date(y, m, 1, 0, 0, 0, 0);
                end   = new Date(y, m + 1, 0, 23, 59, 59, 999);
        }

        return {
            startDate: start,
            endDate: end,
            choiceValue: choice
        };
    }

    /**
     * Calculate wage fields from Dochádzka records
     */
    function calculateWageFields(employeeEntry, periodChoice, isPeriodTotal, config, utils) {
        try {
            var periodName = isPeriodTotal ? "obdobie total" : "obdobie";
            utils.addDebug(employeeEntry, "🔄 Počítam pre: " + periodName + " (voľba: \"" + periodChoice + "\")");

            // Get date range for period
            var dateRange = calculateDateRange(periodChoice);
            utils.addDebug(employeeEntry, "  📅 Obdobie: " +
                formatDate(dateRange.startDate) + " - " +
                formatDate(dateRange.endDate));

            // Get all Dochádzka records linking to this employee
            var dochadzkaLinks = employeeEntry.linksFrom("Dochádzka", EXTERNAL.dochEmployees);
            utils.addDebug(employeeEntry, "  📋 Celkom záznamov Dochádzky: " + dochadzkaLinks.length);

            // Filter by date range
            var filteredRecords = [];
            for (var i = 0; i < dochadzkaLinks.length; i++) {
                var dochadza = dochadzkaLinks[i];
                var datum = dochadza.field(EXTERNAL.dochDate);

                if (datum && datum >= dateRange.startDate && datum <= dateRange.endDate) {
                    filteredRecords.push(dochadza);
                }
            }

            utils.addDebug(employeeEntry, "  ✅ Filtrovaných záznamov: " + filteredRecords.length);

            // Sum attributes
            var totalOdpracovane = 0;
            var totalZarobene = 0;
            var totalPremie = 0;
            var recordsProcessed = 0;

            for (var i = 0; i < filteredRecords.length; i++) {
                var dochadza = filteredRecords[i];
                var zamestnanci = dochadza.field(EXTERNAL.dochEmployees);

                if (!zamestnanci || zamestnanci.length === 0) {
                    continue;
                }

                // Find THIS employee in the Zamestnanci field
                for (var j = 0; j < zamestnanci.length; j++) {
                    var empLink = zamestnanci[j];

                    // Match by entry ID
                    if (empLink && empLink.id === employeeEntry.id) {
                        recordsProcessed++;

                        // Odpracované
                        var odpracovane = empLink.attr(ATTRS.attrWorked) || 0;
                        totalOdpracovane += odpracovane;

                        // Zarobené (denná mzda)
                        var dennaMzda = empLink.attr(ATTRS.attrDailyWage) || 0;
                        totalZarobene += dennaMzda;

                        // Prémie = (odpracované × príplatok) + prémia - pokuta
                        var priplatok = empLink.attr(ATTRS.attrBonus) || 0;
                        var premia = empLink.attr(ATTRS.attrPremium) || 0;
                        var pokuta = empLink.attr(ATTRS.attrPenalty) || 0;

                        var premieZaznamu = (odpracovane * priplatok) + premia - pokuta;
                        totalPremie += premieZaznamu;

                        break; // Found employee, no need to check other items
                    }
                }
            }

            utils.addDebug(employeeEntry, "  🧮 Spracovaných záznamov: " + recordsProcessed);
            utils.addDebug(employeeEntry, "  💼 Odpracované: " + totalOdpracovane.toFixed(2) + " h");
            utils.addDebug(employeeEntry, "  💰 Zarobené: " + totalZarobene.toFixed(2) + " €");
            utils.addDebug(employeeEntry, "  🎁 Prémie: " + totalPremie.toFixed(2) + " €");

            return {
                success: true,
                odpracovane: totalOdpracovane,
                zarobene: totalZarobene,
                premie: totalPremie,
                recordsCount: recordsProcessed
            };

        } catch (error) {
            directError(employeeEntry, "calcWageFields: " + error.toString());
            utils.addError(employeeEntry, "Chyba pri výpočte: " + error.toString(), "calculateWageFields", error);
            return {
                success: false,
                error: error.toString(),
                odpracovane: 0,
                zarobene: 0,
                premie: 0,
                recordsCount: 0
            };
        }
    }

    /**
     * Calculate paid wages from Pokladňa records for a given period
     * Filters: Pohyb = "Výdavok", Účel výdaja = "Mzda"
     */
    function calculatePaidFromPokladna(employeeEntry, periodChoice, config, utils) {
        try {
            var dateRange = calculateDateRange(periodChoice);

            // Reverse lookup: Pokladňa records linking to this employee
            var pokladnaLinks = employeeEntry.linksFrom("Pokladňa", EXTERNAL.poklZamestnanec);
            directLog(employeeEntry, "  → linksFrom Pokladna: " + pokladnaLinks.length);
            utils.addDebug(employeeEntry, "  Pokladna celkom zaznamov: " + pokladnaLinks.length);

            var totalVyplatene = 0;
            var recordsProcessed = 0;

            for (var i = 0; i < pokladnaLinks.length; i++) {
                var pokl = pokladnaLinks[i];

                // Filter by date range
                var datum = pokl.field(EXTERNAL.dochDate);
                if (!datum || datum < dateRange.startDate || datum > dateRange.endDate) continue;

                // Filter: Pohyb must be "Výdavok"
                var pohyb = (pokl.field(EXTERNAL.poklPohyb) || "").trim();
                if (pohyb !== "Výdavok") continue;

                // Filter: Účel výdaja must be "Mzda"
                var ucel = (pokl.field(EXTERNAL.poklUcelVydaja) || "").trim();
                if (ucel !== "Mzda") continue;

                var suma = pokl.field(EXTERNAL.poklSuma) || 0;
                totalVyplatene += suma;
                recordsProcessed++;
            }

            utils.addDebug(employeeEntry, "  Vyplatene: " + totalVyplatene.toFixed(2) + " EUR (" + recordsProcessed + " zaznamov)");

            return {
                success: true,
                vyplatene: totalVyplatene,
                recordsCount: recordsProcessed
            };

        } catch (error) {
            directError(employeeEntry, "calcPokladna: " + error.toString());
            utils.addError(employeeEntry, "Chyba Pokladna: " + error.toString(), "calculatePaidFromPokladna", error);
            return { success: false, error: error.toString(), vyplatene: 0, recordsCount: 0 };
        }
    }

    // ==============================================
    // PUBLIC API
    // ==============================================

    return {
        version: MODULE_INFO.version,

        /**
         * Calculate employee wages from attendance records
         *
         * @param {Entry} employeeEntry - Current employee entry
         * @param {Object} config - MementoConfig object
         * @param {Object} utils - MementoUtils object
         * @returns {Object} - { success: boolean, message: string }
         */
        calculateWages: function(employeeEntry, config, utils) {
            // Canary write — confirms module is executing before any utils calls
            directLog(employeeEntry, "🚀 Zamestnanci v" + MODULE_INFO.version + " START");

            try {
                utils.addDebug(employeeEntry, "🚀 === Zamestnanci Module v" + MODULE_INFO.version + " ===");

                var employeeName = employeeEntry.field(FIELDS.nick) || "N/A";
                utils.addDebug(employeeEntry, "👤 Zamestnanec: " + employeeName);

                var resultObdobie = null;
                var resultTotal = null;

                // STEP 1: Calculate for "obdobie" (regular fields)
                utils.addDebug(employeeEntry, "");
                utils.addDebug(employeeEntry, "═══════════════════════════════════════");
                utils.addDebug(employeeEntry, "📊 KROK 1: VÝPOČET ZÁKLADNÝCH POLÍ");
                utils.addDebug(employeeEntry, "═══════════════════════════════════════");
                var obdobie = employeeEntry.field(FIELDS.period);

                if (obdobie) {
                    resultObdobie = calculateWageFields(employeeEntry, obdobie, false, config, utils);

                    if (resultObdobie.success) {
                        employeeEntry.set(FIELDS.workedTime, resultObdobie.odpracovane);
                        employeeEntry.set(FIELDS.earned, resultObdobie.zarobene);
                        employeeEntry.set(FIELDS.bonuses, resultObdobie.premie);

                        utils.addDebug(employeeEntry, "  ✅ Základné polia nastavené");
                    } else {
                        directError(employeeEntry, "STEP1 fail: " + resultObdobie.error);
                        utils.addError(employeeEntry, "Chyba pri výpočte základných polí: " + resultObdobie.error, "calculateWages");
                    }
                } else {
                    utils.addDebug(employeeEntry, "  ⏭️ Pole '" + FIELDS.period + "' nie je nastavené, preskakujem");
                }

                // STEP 2: Calculate for "obdobie total" (total fields)
                utils.addDebug(employeeEntry, "");
                utils.addDebug(employeeEntry, "═══════════════════════════════════════");
                utils.addDebug(employeeEntry, "📊 KROK 2: VÝPOČET TOTAL POLÍ");
                utils.addDebug(employeeEntry, "═══════════════════════════════════════");
                var obdobieTotal = employeeEntry.field(FIELDS.periodTotal);

                if (obdobieTotal) {
                    resultTotal = calculateWageFields(employeeEntry, obdobieTotal, true, config, utils);

                    if (resultTotal.success) {
                        employeeEntry.set(FIELDS.workedTimeTotal, resultTotal.odpracovane);
                        employeeEntry.set(FIELDS.earnedTotal, resultTotal.zarobene);
                        employeeEntry.set(FIELDS.bonusesTotal, resultTotal.premie);

                        utils.addDebug(employeeEntry, "  ✅ Total polia nastavené");
                    } else {
                        directError(employeeEntry, "STEP2 fail: " + resultTotal.error);
                        utils.addError(employeeEntry, "Chyba pri výpočte total polí: " + resultTotal.error, "calculateWages");
                    }
                } else {
                    utils.addDebug(employeeEntry, "  ⏭️ Pole '" + FIELDS.periodTotal + "' nie je nastavené, preskakujem");
                }

                // STEP 3: Calculate Vyplatené from Pokladňa (for obdobie)
                //         + set Na zákazkách, Jazdy = 0
                //         + Preplatok/Nedoplatok = Zarobené − Vyplatené
                utils.addDebug(employeeEntry, "");
                utils.addDebug(employeeEntry, "═══════════════════════════════════════");
                utils.addDebug(employeeEntry, "📊 KROK 3: VYPLATENÉ Z POKLADNE");
                utils.addDebug(employeeEntry, "═══════════════════════════════════════");

                // Na zákazkách a Jazdy sa zatiaľ nepočítajú — nastavíme na 0
                employeeEntry.set(FIELDS.naZakazkach, 0);
                employeeEntry.set(FIELDS.jazdy, 0);

                if (obdobie) {
                    var resultPokladna = calculatePaidFromPokladna(employeeEntry, obdobie, config, utils);

                    if (resultPokladna.success) {
                        employeeEntry.set(FIELDS.vyplatene, resultPokladna.vyplatene);

                        // Preplatok/Nedoplatok = Zarobené − Vyplatené
                        var zarobeneObdobie = (resultObdobie && resultObdobie.success) ? resultObdobie.zarobene : 0;
                        var preplatokHodnota = zarobeneObdobie - resultPokladna.vyplatene;
                        employeeEntry.set(FIELDS.preplatok, preplatokHodnota);

                        var krok3Label = preplatokHodnota >= 0 ? "Nedoplatok" : "Preplatok";
                        utils.addDebug(employeeEntry, "  " + krok3Label + ": " + preplatokHodnota.toFixed(2) + " EUR");
                        utils.addDebug(employeeEntry, "  ✅ Krok 3 OK");
                    } else {
                        directError(employeeEntry, "STEP3 Pokladna fail: " + resultPokladna.error);
                        utils.addError(employeeEntry, "Chyba Pokladna pre obdobie: " + resultPokladna.error, "calculateWages");
                    }
                } else {
                    utils.addDebug(employeeEntry, "  Pole 'obdobie' nie je nastavene, preskakujem Pokladnu");
                }

                // STEP 4: Calculate Vyplatené total from Pokladňa
                //         + set Na zákazkách total, Jazdy total = 0
                utils.addDebug(employeeEntry, "");
                utils.addDebug(employeeEntry, "═══════════════════════════════════════");
                utils.addDebug(employeeEntry, "📊 KROK 4: VYPLATENÉ TOTAL Z POKLADNE");
                utils.addDebug(employeeEntry, "═══════════════════════════════════════");

                employeeEntry.set(FIELDS.naZakazkachTotal, 0);
                employeeEntry.set(FIELDS.jezdyTotal, 0);

                var resultPokladnaTotal = null;
                if (obdobieTotal) {
                    resultPokladnaTotal = calculatePaidFromPokladna(employeeEntry, obdobieTotal, config, utils);

                    if (resultPokladnaTotal.success) {
                        employeeEntry.set(FIELDS.vyplateneTotal, resultPokladnaTotal.vyplatene);
                        utils.addDebug(employeeEntry, "  ✅ Krok 4 OK");
                    } else {
                        directError(employeeEntry, "STEP4 Pokladna fail: " + resultPokladnaTotal.error);
                        utils.addError(employeeEntry, "Chyba Pokladna total: " + resultPokladnaTotal.error, "calculateWages");
                    }
                } else {
                    utils.addDebug(employeeEntry, "  Pole 'obdobie total' nie je nastavene, preskakujem");
                }

                // STEP 5: Create info message
                utils.addDebug(employeeEntry, "📝 KROK 5: Vytvorenie info záznamu");

                // Format period choice as readable heading (date range or month name)
                var MONTHS_SK = ["Január","Február","Marec","Apríl","Máj","Jún",
                                 "Júl","August","September","Október","November","December"];
                var formatPeriodHeading = function(choice) {
                    var dr = calculateDateRange(choice);
                    var s = dr.startDate;
                    var e = dr.endDate;
                    var c = (choice || "").trim();
                    if (c === "Total") {
                        return "Total";
                    } else if (c === "tento mesiac" || c === "minulý mesiac") {
                        return MONTHS_SK[s.getMonth()] + " " + s.getFullYear();
                    } else if (c === "tento rok" || c === "minulý rok") {
                        return "" + s.getFullYear();
                    } else if (c === "tento deň") {
                        return s.getDate() + "." + (s.getMonth() + 1) + "." + s.getFullYear();
                    } else {
                        return s.getDate() + "." + (s.getMonth() + 1) + "." + s.getFullYear() +
                               " \u2013 " +
                               e.getDate() + "." + (e.getMonth() + 1) + "." + e.getFullYear();
                    }
                };

                var infoMessage = "### 👤 Prepočet mzdy (" + employeeName + ")\n\n";

                if (obdobie && resultObdobie && resultObdobie.success) {
                    var vyplHodnota = (resultPokladna && resultPokladna.success) ? resultPokladna.vyplatene : 0;
                    // Nedoplatok = Zarobené > Vyplatené (firma dlhuje zamestnancovi)
                    // Preplatok  = Zarobené < Vyplatené (preplatok firme)
                    var prepHodnota = resultObdobie.zarobene - vyplHodnota;
                    var prepLabel = prepHodnota >= 0 ? "Nedoplatok" : "Preplatok";
                    var prepColor = prepHodnota >= 0 ? "red" : "green";
                    infoMessage += "### 📊 " + formatPeriodHeading(obdobie) + "\n";
                    infoMessage += "- **" + prepLabel + ":** <span style=\"color:" + prepColor + "\">" + prepHodnota.toFixed(2) + " €</span>\n";
                    infoMessage += "- **Odpracované:** " + resultObdobie.odpracovane.toFixed(2) + " h\n";
                    infoMessage += "- **Zarobené:** " + resultObdobie.zarobene.toFixed(2) + " €\n";
                    infoMessage += "- **Prémie:** " + resultObdobie.premie.toFixed(2) + " €\n";
                    infoMessage += "- **Vyplatené:** " + vyplHodnota.toFixed(2) + " €\n";
                    infoMessage += "- **Záznamov (doch.):** " + resultObdobie.recordsCount + "\n\n";
                }

                if (obdobieTotal && resultTotal && resultTotal.success) {
                    var vyplTotalHodnota = (resultPokladnaTotal && resultPokladnaTotal.success) ? resultPokladnaTotal.vyplatene : 0;
                    infoMessage += "### 📊 " + formatPeriodHeading(obdobieTotal) + "\n";
                    infoMessage += "- **Odpracované total:** " + resultTotal.odpracovane.toFixed(2) + " h\n";
                    infoMessage += "- **Zarobené total:** " + resultTotal.zarobene.toFixed(2) + " €\n";
                    infoMessage += "- **Prémie total:** " + resultTotal.premie.toFixed(2) + " €\n";
                    infoMessage += "- **Vyplatené total:** " + vyplTotalHodnota.toFixed(2) + " €\n";
                    infoMessage += "- **Záznamov (doch.):** " + resultTotal.recordsCount + "\n\n";
                }

                infoMessage += "---\n";
                infoMessage += "**✅ PREPOČET DOKONČENÝ** | Zamestnanci v" + MODULE_INFO.version;

                employeeEntry.set(FIELDS.info, infoMessage);
                utils.addDebug(employeeEntry, "  ✅ Info záznam vytvorený");

                // STEP 6: Generate HTML report
                utils.addDebug(employeeEntry, "");
                utils.addDebug(employeeEntry, "═══════════════════════════════════════");
                utils.addDebug(employeeEntry, "📄 KROK 6: HTML REPORT");
                utils.addDebug(employeeEntry, "═══════════════════════════════════════");
                var reportResult = this.generateReport(employeeEntry, config, utils);
                if (!reportResult.success) {
                    utils.addError(employeeEntry, "Chyba pri generovaní reportu: " + reportResult.error, "calculateWages");
                } else {
                    utils.addDebug(employeeEntry, "  ✅ Report OK (" + reportResult.rows + " záznamy, " + reportResult.payments + " platby)");
                }

                utils.addDebug(employeeEntry, "✅ === PREPOČET DOKONČENÝ ÚSPEŠNE ===");

                return {
                    success: true,
                    message: "Prepočet dokončený úspešne"
                };

            } catch (error) {
                directError(employeeEntry, "calculateWages FATAL: " + error.toString());
                utils.addError(employeeEntry, "KRITICKÁ CHYBA: " + error.toString(), "Zamestnanci.calculateWages", error);

                return {
                    success: false,
                    error: error.toString(),
                    message: "Kritická chyba pri výpočte"
                };
            }
        },

        /**
         * Action function for button click - includes dialogs
         *
         * @param {Entry} employeeEntry - Current employee entry
         * @param {Object} config - MementoConfig object
         * @param {Object} utils - MementoUtils object
         * @returns {Object} - { success: boolean, cancelled: boolean }
         */
        calculateWagesAction: function(employeeEntry, config, utils) {
            try {
                var employeeName = employeeEntry.field(FIELDS.nick) || "N/A";

                // Confirmation dialog
                var confirm = dialog(
                    "Prepočet miezd",
                    "🔄 Prepočítať mzdy pre: " + employeeName + "?\n\n" +
                    "Prepočítajú sa polia:\n" +
                    "• Odpracované / Odpracované total\n" +
                    "• Zarobené / Zarobené total\n" +
                    "• Prémie / Prémie total\n\n" +
                    "Pokračovať?",
                    "Áno",
                    "Zrušiť"
                );

                if (confirm !== 0) {
                    return { success: false, cancelled: true };
                }

                // Clear Debug_Log for fresh calculation
                employeeEntry.set(FIELDS.debugLog, "");

                // Call main calculation
                var result = this.calculateWages(employeeEntry, config, utils);

                if (!result.success) {
                    var errorMsg = "❌ CHYBA PRI PREPOČTE\n\n";
                    errorMsg += "Zamestnanec: " + employeeName + "\n\n";
                    errorMsg += "Chyba: " + (result.error || result.message) + "\n\n";
                    errorMsg += "Skontrolujte Debug_Log pre viac informácií.";

                    dialog("Chyba prepočtu", errorMsg, "OK");
                    return { success: false, error: result.error };
                }

                // Get calculated values for success dialog
                var odpracovane = employeeEntry.field(FIELDS.workedTime) || 0;
                var zarobene = employeeEntry.field(FIELDS.earned) || 0;
                var premie = employeeEntry.field(FIELDS.bonuses) || 0;
                var vyplatene = employeeEntry.field(FIELDS.vyplatene) || 0;
                var preplatok = employeeEntry.field(FIELDS.preplatok) || 0;

                var odpracovaneTotal = employeeEntry.field(FIELDS.workedTimeTotal) || 0;
                var zarobeneTotal = employeeEntry.field(FIELDS.earnedTotal) || 0;
                var premieTotal = employeeEntry.field(FIELDS.bonusesTotal) || 0;
                var vyplateneTotal = employeeEntry.field(FIELDS.vyplateneTotal) || 0;

                // Success dialog
                var successMsg = "PREPOCET DOKONCENY\n\n";
                successMsg += "Zamestnanec: " + employeeName + "\n\n";
                successMsg += "ZAKLADNE POLIA:\n";
                successMsg += "• Odpracovane: " + odpracovane.toFixed(2) + " h\n";
                successMsg += "• Zarobene: " + zarobene.toFixed(2) + " EUR\n";
                successMsg += "• Premie: " + premie.toFixed(2) + " EUR\n";
                successMsg += "• Vyplatene: " + vyplatene.toFixed(2) + " EUR\n";
                successMsg += "• Preplatok/Nedoplatok: " + preplatok.toFixed(2) + " EUR\n\n";
                successMsg += "TOTAL POLIA:\n";
                successMsg += "• Odpracovane total: " + odpracovaneTotal.toFixed(2) + " h\n";
                successMsg += "• Zarobene total: " + zarobeneTotal.toFixed(2) + " EUR\n";
                successMsg += "• Premie total: " + premieTotal.toFixed(2) + " EUR\n";
                successMsg += "• Vyplatene total: " + vyplateneTotal.toFixed(2) + " EUR\n\n";
                successMsg += "Skontrolujte Debug_Log a info pole pre detaily.";

                dialog("Prepočet dokončený", successMsg, "OK");

                return { success: true };

            } catch (error) {
                var criticalMsg = "❌ KRITICKÁ CHYBA\n\n";
                criticalMsg += "Module: Zamestnanci v" + MODULE_INFO.version + "\n\n";
                criticalMsg += "Chyba: " + error.toString() + "\n\n";

                if (error.stack) {
                    criticalMsg += "Stack trace:\n" + error.stack.substring(0, 200);
                }

                utils.addError(employeeEntry, "KRITICKÁ CHYBA v Action: " + error.toString(), "Zamestnanci.calculateWagesAction", error);

                dialog("Kritická chyba", criticalMsg, "OK");

                return { success: false, error: error.toString() };
            }
        },

        /**
         * Get current hourly rate from "sadzby zamestnancov" library
         *
         * @param {Entry} employeeEntry - Current employee entry
         * @param {Object} utils - MementoUtils object (optional for logging)
         * @returns {Object} - { success: boolean, rate: number, validFrom: Date }
         */
        getCurrentHourlyRate: function(employeeEntry, utils) {
            try {
                var currentDate = new Date();
                var employeeId = employeeEntry.id;
                var employeeName = employeeEntry.field(FIELDS.nick) || employeeEntry.field("Meno") || "N/A";

                if (utils) {
                    utils.addDebug(employeeEntry, "🔍 Hľadám aktuálnu sadzbu pre: " + employeeName);
                }

                // Get "sadzby zamestnancov" library
                var ratesLibrary = libByName("sadzby zamestnancov");

                if (!ratesLibrary) {
                    directError(employeeEntry, "getCurrentHourlyRate: Kniznica 'sadzby zamestnancov' nenajdena!");
                    if (utils) {
                        utils.addError(employeeEntry, "Knižnica 'sadzby zamestnancov' nenájdená!", "getCurrentHourlyRate");
                    }
                    return { success: false, error: "Knižnica nenájdená" };
                }

                // Get all rate entries for this employee
                var allRates = ratesLibrary.entries();
                var employeeRates = [];

                for (var i = 0; i < allRates.length; i++) {
                    var rateEntry = allRates[i];
                    var linkedEmployee = rateEntry.field(EXTERNAL.rateEmployee);

                    if (linkedEmployee && linkedEmployee.length > 0) {
                        var empLink = linkedEmployee[0];
                        if (empLink && empLink.id === employeeId) {
                            employeeRates.push(rateEntry);
                        }
                    }
                }

                if (employeeRates.length === 0) {
                    if (utils) {
                        utils.addDebug(employeeEntry, "  ⚠️ Žiadne sadzby nenájdené pre " + employeeName);
                    }
                    return { success: false, error: "Žiadne sadzby" };
                }

                if (utils) {
                    utils.addDebug(employeeEntry, "  📋 Nájdených " + employeeRates.length + " sadzieb");
                }

                // Find the rate valid for current date
                // NOTE: "Platné do" does NOT exist in sadzby zamestnancov (only 3 fields)
                // Rates are valid from validFrom indefinitely - take latest validFrom <= today
                var currentRate = null;
                var currentValidFrom = null;

                for (var i = 0; i < employeeRates.length; i++) {
                    var rateEntry = employeeRates[i];
                    var validFrom = rateEntry.field(EXTERNAL.rateValidFrom);
                    var rate = rateEntry.field(EXTERNAL.rateValue);

                    if (!validFrom || !rate) continue;

                    // Valid if validFrom <= currentDate, take the latest validFrom
                    if (validFrom <= currentDate) {
                        if (!currentRate || validFrom > currentValidFrom) {
                            currentRate = rate;
                            currentValidFrom = validFrom;
                        }
                    }
                }

                if (!currentRate) {
                    if (utils) {
                        utils.addDebug(employeeEntry, "  ⚠️ Žiadna platná sadzba k " + currentDate.toLocaleDateString('sk-SK'));
                    }
                    return { success: false, error: "Žiadna platná sadzba" };
                }

                if (utils) {
                    utils.addDebug(employeeEntry, "  ✅ Aktuálna sadzba: " + currentRate + " €/h (platné od " +
                        (currentValidFrom ? currentValidFrom.toLocaleDateString('sk-SK') : "N/A") + ")");
                }

                return {
                    success: true,
                    rate: currentRate,
                    validFrom: currentValidFrom
                };

            } catch (error) {
                directError(employeeEntry, "getCurrentHourlyRate: " + error.toString());
                if (utils) {
                    utils.addError(employeeEntry, "Chyba pri získavaní sadzby: " + error.toString(), "getCurrentHourlyRate", error);
                }
                return { success: false, error: error.toString() };
            }
        },

        /**
         * Update "Aktuálna hodinovka" field with current rate from "sadzby zamestnancov"
         *
         * Field name comes from FIELDS.hourlyRate (single source of truth).
         * If field doesn't exist → entry.set() throws → catch → addError → Error_Log.
         *
         * @param {Entry} employeeEntry - Current employee entry
         * @param {Object} utils - MementoUtils object (optional)
         * @returns {Object} - { success: boolean }
         */
        updateCurrentHourlyRate: function(employeeEntry, utils) {
            try {
                var result = this.getCurrentHourlyRate(employeeEntry, utils);

                if (result.success) {
                    // FIELDS.hourlyRate is the single source of truth (verified from fields.json ID:42)
                    employeeEntry.set(FIELDS.hourlyRate, result.rate);
                    return { success: true, rate: result.rate };
                } else {
                    return { success: false, error: result.error };
                }

            } catch (error) {
                directError(employeeEntry, "updateCurrentHourlyRate: " + error.toString());
                if (utils) {
                    utils.addError(employeeEntry, "Chyba pri aktualizácii hodinovky: " + error.toString(), "updateCurrentHourlyRate", error);
                }
                return { success: false, error: error.toString() };
            }
        },

        /**
         * Generate HTML report in the "report" field.
         * Date range is read from the "obdobie" field on employeeEntry.
         *
         * Report structure:
         *   Section 1 — Odpracované: date, time (Príchod–Odchod), hours, rate, total
         *   Section 2 — Vyplatené: date, description, amount
         *   Summary   — Nedoplatok / Preplatok
         *
         * @param {Entry} employeeEntry - Current employee entry
         * @param {Object} config - MementoConfig object
         * @param {Object} utils - MementoUtils object
         * @returns {Object} - { success: boolean, rows: number, payments: number }
         */
        generateReport: function(employeeEntry, config, utils) {
            directLog(employeeEntry, "📄 generateReport START");
            try {
                // Read period from the "obdobie" field
                var periodChoice = employeeEntry.field(FIELDS.period);
                if (!periodChoice) {
                    return { success: false, error: "Pole 'obdobie' nie je nastavené" };
                }

                var nick = employeeEntry.field(FIELDS.nick) || "N/A";
                var priezvisko = employeeEntry.field("Priezvisko") || "";
                var fullName = nick + (priezvisko ? " (" + priezvisko + ")" : "");

                var dateRange = calculateDateRange(periodChoice);
                var dateRangeStr = formatDate(dateRange.startDate) + " \u2013 " + formatDate(dateRange.endDate);

                utils.addDebug(employeeEntry, "📄 Report: " + fullName + ", " + dateRangeStr);

                // ── ODPRACOVANÉ ──────────────────────────────
                var dochLinks = employeeEntry.linksFrom("Doch\u00e1dzka", EXTERNAL.dochEmployees);
                var odpRows = [];
                var totalOdprac = 0, totalZarob = 0;

                for (var i = 0; i < dochLinks.length; i++) {
                    var doc = dochLinks[i];
                    var datum = doc.field(EXTERNAL.dochDate);
                    if (!datum || datum < dateRange.startDate || datum > dateRange.endDate) continue;

                    var zams = doc.field(EXTERNAL.dochEmployees);
                    if (!zams || !zams.length) continue;

                    for (var j = 0; j < zams.length; j++) {
                        var emp = zams[j];
                        if (!emp || emp.id !== employeeEntry.id) continue;

                        var odprac  = emp.attr(ATTRS.attrWorked)    || 0;
                        var sadzba  = emp.attr(ATTRS.attrHodinovka) || 0;
                        var dMzda   = emp.attr(ATTRS.attrDailyWage) || 0;
                        var prichod = doc.field(EXTERNAL.dochPrichod);
                        var odchod  = doc.field(EXTERNAL.dochOdchod);
                        var cas = formatTime(prichod) + (odchod ? "\u2013" + formatTime(odchod) : "");

                        odpRows.push({ datum: datum, cas: cas, odprac: odprac, sadzba: sadzba, celkom: dMzda });
                        totalOdprac += odprac;
                        totalZarob  += dMzda;
                        break;
                    }
                }
                odpRows.sort(function(a, b) { return a.datum - b.datum; });

                // ── VYPLATENÉ ────────────────────────────────
                var poklLinks = employeeEntry.linksFrom("Pokladňa", EXTERNAL.poklZamestnanec);
                var payRows = [];
                var totalVypl = 0;

                for (var i = 0; i < poklLinks.length; i++) {
                    var pokl = poklLinks[i];
                    var datum = pokl.field(EXTERNAL.dochDate);
                    if (!datum || datum < dateRange.startDate || datum > dateRange.endDate) continue;
                    if ((pokl.field(EXTERNAL.poklPohyb) || "").trim()     !== "V\u00fddavok") continue;
                    if ((pokl.field(EXTERNAL.poklUcelVydaja) || "").trim() !== "Mzda")        continue;

                    var suma  = pokl.field(EXTERNAL.poklSuma)  || 0;
                    var popis = (pokl.field(EXTERNAL.poklPopis) || "").trim() ||
                                (pokl.field(EXTERNAL.poklUcelVydaja) || "mzda");
                    payRows.push({ datum: datum, popis: popis, suma: suma });
                    totalVypl += suma;
                }
                payRows.sort(function(a, b) { return a.datum - b.datum; });

                utils.addDebug(employeeEntry, "  📋 Doch: " + odpRows.length + " záznamov, Pokladňa: " + payRows.length + " platieb");

                // ── BALANCE ──────────────────────────────────
                var balance      = totalZarob - totalVypl;
                var balanceLabel = balance >= 0 ? "🔴 Nedoplatok" : "🟢 Preplatok";
                var balanceColor = balance >= 0 ? "#c0392b"       : "#27ae60";

                // ── HTML ─────────────────────────────────────
                var S  = "border-collapse:collapse;width:100%;font-size:13px;margin-bottom:20px;";
                var TH = "padding:7px 10px;background:#f0f0f0;font-weight:bold;border-bottom:2px solid #bbb;white-space:nowrap;";
                var TD = "padding:5px 10px;border-bottom:1px solid #eee;";
                var TR = "padding:5px 10px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;";
                var TF = "padding:8px 10px;font-weight:bold;border-top:2px solid #888;background:#f5f5f5;text-align:right;white-space:nowrap;";
                var TL = "padding:8px 10px;font-weight:bold;border-top:2px solid #888;background:#f5f5f5;";

                var h = "<div style=\"font-family:Arial,sans-serif;padding:12px;max-width:720px;\">";

                // Header
                h += "<h2 style=\"margin:0 0 2px 0;font-size:19px;\">📋 Výkaz práce " + fullName + "</h2>";
                h += "<p style=\"margin:0 0 18px 0;font-weight:bold;color:#444;\">" + dateRangeStr + "</p>";

                // ── Table 1: Odpracované ──
                h += "<h3 style=\"margin:0 0 6px 0;font-size:14px;border-bottom:2px solid #555;padding-bottom:3px;\">💼 Odpracované / Zarobené</h3>";
                h += "<table style=\"" + S + "\">";
                h += "<thead><tr>";
                h += "<th style=\"" + TH + "text-align:left;\">📅 Dátum</th>";
                h += "<th style=\"" + TH + "text-align:center;\">⏰ Od\u2013Do</th>";
                h += "<th style=\"" + TH + "text-align:right;\">Odprac.</th>";
                h += "<th style=\"" + TH + "text-align:right;\">Sadzba</th>";
                h += "<th style=\"" + TH + "text-align:right;\">Celkom</th>";
                h += "</tr></thead><tbody>";

                if (odpRows.length === 0) {
                    h += "<tr><td colspan=\"5\" style=\"" + TD + "color:#999;font-style:italic;\">Žiadne záznamy v tomto období</td></tr>";
                } else {
                    for (var i = 0; i < odpRows.length; i++) {
                        var r = odpRows[i];
                        var bg = (i % 2 === 0) ? "" : "background:#fafafa;";
                        h += "<tr style=\"" + bg + "\">";
                        h += "<td style=\"" + TD + "\">" + formatDate(r.datum) + "</td>";
                        h += "<td style=\"" + TD + "text-align:center;\">" + (r.cas || "\u2013") + "</td>";
                        h += "<td style=\"" + TR + "\">" + r.odprac.toFixed(2).replace(".", ",") + " h</td>";
                        h += "<td style=\"" + TR + "\">" + formatMoney(r.sadzba) + "</td>";
                        h += "<td style=\"" + TR + "\">" + formatMoney(r.celkom) + "</td>";
                        h += "</tr>";
                    }
                }

                h += "</tbody><tfoot><tr>";
                h += "<td colspan=\"4\" style=\"" + TF + "\">✅ Celkom</td>";
                h += "<td style=\"" + TF + "\">" + formatMoney(totalZarob) + "</td>";
                h += "</tr></tfoot></table>";

                // ── Table 2: Vyplatené ──
                h += "<h3 style=\"margin:0 0 6px 0;font-size:14px;border-bottom:2px solid #555;padding-bottom:3px;\">💰 Vyplatené</h3>";
                h += "<table style=\"" + S + "\">";
                h += "<thead><tr>";
                h += "<th style=\"" + TH + "text-align:left;\">📅 Dátum</th>";
                h += "<th style=\"" + TH + "text-align:left;\">Popis</th>";
                h += "<th style=\"" + TH + "text-align:right;\">Suma</th>";
                h += "</tr></thead><tbody>";

                if (payRows.length === 0) {
                    h += "<tr><td colspan=\"3\" style=\"" + TD + "color:#999;font-style:italic;\">Žiadne platby v tomto období</td></tr>";
                } else {
                    for (var i = 0; i < payRows.length; i++) {
                        var pr = payRows[i];
                        var bg = (i % 2 === 0) ? "" : "background:#fafafa;";
                        h += "<tr style=\"" + bg + "\">";
                        h += "<td style=\"" + TD + "\">" + formatDate(pr.datum) + "</td>";
                        h += "<td style=\"" + TD + "\">" + pr.popis + "</td>";
                        h += "<td style=\"" + TR + "\">" + formatMoney(pr.suma) + "</td>";
                        h += "</tr>";
                    }
                }

                h += "</tbody><tfoot><tr>";
                h += "<td colspan=\"2\" style=\"" + TF + "\">✅ Celkom</td>";
                h += "<td style=\"" + TF + "\">" + formatMoney(totalVypl) + "</td>";
                h += "</tr></tfoot></table>";

                // ── Balance row ──
                h += "<table style=\"width:100%;border-collapse:collapse;margin-top:4px;\">";
                h += "<tr style=\"background:#fdf0f0;\">";
                h += "<td style=\"padding:10px 12px;font-weight:bold;font-size:15px;color:" + balanceColor + ";\">" + balanceLabel + "</td>";
                h += "<td style=\"padding:10px 12px;font-weight:bold;font-size:15px;color:" + balanceColor + ";text-align:right;text-decoration:underline;\">" + formatMoney(Math.abs(balance)) + "</td>";
                h += "</tr></table>";

                // ── Footer ──
                var now = new Date();
                h += "<p style=\"margin:10px 0 0 0;font-size:11px;color:#bbb;\">Vygenerovan\u00e9: " +
                     formatDate(now) + " | Zamestnanci v" + MODULE_INFO.version + "</p>";
                h += "</div>";

                employeeEntry.set(FIELDS.report, h);
                utils.addDebug(employeeEntry, "  ✅ Report zapisan\u00fd");

                return { success: true, rows: odpRows.length, payments: payRows.length };

            } catch (error) {
                directError(employeeEntry, "generateReport: " + error.toString());
                utils.addError(employeeEntry, "Chyba report: " + error.toString(), "generateReport", error);
                return { success: false, error: error.toString() };
            }
        },

        /**
         * Send wage report to employee's Telegram as a monospace-table message.
         *
         * ⚠️ telegram parameter MUST be passed from outside the IIFE
         *    (MementoTelegram cannot be imported inside due to circular dependency).
         *    Call: Zamestnanci.sendReportToTelegram(entry(), config, utils, MementoTelegram)
         *
         * Date range is read from "obdobie" field on employeeEntry.
         * Employee's Telegram chat ID is read from "Telegram ID" field.
         *
         * @param {Entry}  employeeEntry
         * @param {Object} config   - MementoConfig object
         * @param {Object} utils    - MementoUtils object
         * @param {Object} telegram - MementoTelegram object (direct import)
         * @returns {Object} { success: boolean, error?: string }
         */
        sendReportToTelegram: function(employeeEntry, config, utils, telegram) {
            directLog(employeeEntry, "📤 sendReportToTelegram START");
            try {
                // Validate Telegram module
                if (!telegram) {
                    return { success: false, error: "MementoTelegram nie je dostupný" };
                }

                // Telegram ID
                var chatId = ((employeeEntry.field("Telegram ID") || "") + "").trim();
                if (!chatId) {
                    return { success: false, error: "Zamestnanec nem\u00e1 nastaven\u00e9 Telegram ID" };
                }

                // Period
                var periodChoice = employeeEntry.field(FIELDS.period);
                if (!periodChoice) {
                    return { success: false, error: "Pole 'obdobie' nie je nastaven\u00e9" };
                }

                var nick       = employeeEntry.field(FIELDS.nick) || "N/A";
                var priezvisko = ((employeeEntry.field("Priezvisko") || "") + "").trim();
                var fullName   = nick + (priezvisko ? " (" + priezvisko + ")" : "");

                var dateRange    = calculateDateRange(periodChoice);
                var dateRangeStr = formatDate(dateRange.startDate) + " \u2013 " + formatDate(dateRange.endDate);

                utils.addDebug(employeeEntry, "📤 Telegram report: " + fullName + ", " + dateRangeStr);

                // ── Query Dochádzka ───────────────────────────
                var dochLinks = employeeEntry.linksFrom("Doch\u00e1dzka", EXTERNAL.dochEmployees);
                var odpRows = [];
                var totalOdprac = 0, totalZarob = 0;

                for (var i = 0; i < dochLinks.length; i++) {
                    var doc  = dochLinks[i];
                    var datum = doc.field(EXTERNAL.dochDate);
                    if (!datum || datum < dateRange.startDate || datum > dateRange.endDate) continue;

                    var zams = doc.field(EXTERNAL.dochEmployees);
                    if (!zams || !zams.length) continue;

                    for (var j = 0; j < zams.length; j++) {
                        var emp = zams[j];
                        if (!emp || emp.id !== employeeEntry.id) continue;

                        var odprac = emp.attr(ATTRS.attrWorked)    || 0;
                        var sadzba = emp.attr(ATTRS.attrHodinovka) || 0;
                        var dMzda  = emp.attr(ATTRS.attrDailyWage) || 0;
                        var cas    = formatTime(doc.field(EXTERNAL.dochPrichod)) +
                                     (doc.field(EXTERNAL.dochOdchod) ? "\u2013" + formatTime(doc.field(EXTERNAL.dochOdchod)) : "");

                        odpRows.push({ datum: datum, cas: cas, odprac: odprac, sadzba: sadzba, celkom: dMzda });
                        totalOdprac += odprac;
                        totalZarob  += dMzda;
                        break;
                    }
                }
                odpRows.sort(function(a, b) { return a.datum - b.datum; });

                // ── Query Pokladňa ────────────────────────────
                var poklLinks = employeeEntry.linksFrom("Pokladňa", EXTERNAL.poklZamestnanec);
                var payRows = [];
                var totalVypl = 0;

                for (var i = 0; i < poklLinks.length; i++) {
                    var pokl  = poklLinks[i];
                    var datum = pokl.field(EXTERNAL.dochDate);
                    if (!datum || datum < dateRange.startDate || datum > dateRange.endDate) continue;
                    if ((pokl.field(EXTERNAL.poklPohyb) || "").trim()      !== "V\u00fddavok") continue;
                    if ((pokl.field(EXTERNAL.poklUcelVydaja) || "").trim() !== "Mzda")         continue;

                    var suma  = pokl.field(EXTERNAL.poklSuma) || 0;
                    var popis = ((pokl.field(EXTERNAL.poklPopis) || "").trim()) ||
                                ((pokl.field(EXTERNAL.poklUcelVydaja) || "") + "").trim() || "mzda";
                    payRows.push({ datum: datum, popis: popis, suma: suma });
                    totalVypl += suma;
                }
                payRows.sort(function(a, b) { return a.datum - b.datum; });

                utils.addDebug(employeeEntry, "  Doch: " + odpRows.length + " záz., Pokladňa: " + payRows.length + " platieb");

                // ── Balance ───────────────────────────────────
                var balance      = totalZarob - totalVypl;
                var balanceEmoji = balance >= 0 ? "\ud83d\udd34" : "\ud83d\udfe2";
                var balanceWord  = balance >= 0 ? "Nedoplatok" : "Preplatok";

                // ── Format monospace tables ───────────────────
                // Odpracované: Dátum(10) | Od-Do(11) | Hod(5) | Sadzba(7) | Celkom(8)
                var D=10, C=11, H=5, SA=7, CE=8;
                var SEP1 = rep("\u2500", D+1+C+1+H+1+SA+1+CE);

                var t1 = padR("D\u00e1tum",D)+" "+padR("Od\u2013Do",C)+" "+padL("Hod",H)+" "+padL("Sadzba",SA)+" "+padL("Celkom",CE)+"\n";
                t1 += SEP1 + "\n";
                if (odpRows.length === 0) {
                    t1 += "(\u017diadne z\u00e1znamy)\n";
                } else {
                    for (var i = 0; i < odpRows.length; i++) {
                        var r = odpRows[i];
                        t1 += padR(formatDate(r.datum), D) + " " +
                              padR(r.cas || "\u2013", C)   + " " +
                              padL(r.odprac.toFixed(2).replace(".",","), H) + " " +
                              padL(fmtCell(r.sadzba), SA)  + " " +
                              padL(fmtCell(r.celkom), CE)  + "\n";
                    }
                }
                t1 += SEP1 + "\n";
                t1 += rep(" ", D+1+C+1+H+1+SA) + " " + padL(fmtCell(totalZarob), CE);

                // Vyplatené: Dátum(10) | Popis(14) | Suma(8)
                var PO=14, SU=8;
                var SEP2 = rep("\u2500", D+1+PO+1+SU);

                var t2 = padR("D\u00e1tum",D)+" "+padR("Popis",PO)+" "+padL("Suma",SU)+"\n";
                t2 += SEP2 + "\n";
                if (payRows.length === 0) {
                    t2 += "(\u017diadne platby)\n";
                } else {
                    for (var i = 0; i < payRows.length; i++) {
                        var pr = payRows[i];
                        t2 += padR(formatDate(pr.datum), D) + " " +
                              padR(pr.popis, PO)            + " " +
                              padL(fmtCell(pr.suma), SU)    + "\n";
                    }
                }
                t2 += SEP2 + "\n";
                t2 += rep(" ", D+1) + padR("Celkom", PO) + " " + padL(fmtCell(totalVypl), SU);

                // ── Compose message ───────────────────────────
                var now = new Date();
                var msg = "\ud83d\udccb <b>" + escHtml(fullName) + "</b>\n";
                msg += "\ud83d\udcc5 " + escHtml(dateRangeStr) + "\n\n";
                msg += "\ud83d\udcbc <b>Odpracovan\u00e9 / Zaroben\u00e9</b>\n";
                msg += "<pre>" + t1 + "</pre>\n";
                msg += "\ud83d\udcb0 <b>Vyplaten\u00e9</b>\n";
                msg += "<pre>" + t2 + "</pre>\n";
                msg += balanceEmoji + " <b>" + balanceWord + ": " + escHtml(fmtCell(Math.abs(balance))) + "</b>\n\n";
                msg += "<i>Odoslan\u00e9: " + formatDate(now) + " | Zamestnanci v" + MODULE_INFO.version + "</i>";

                // ── Send ──────────────────────────────────────
                try {
                    telegram.sendTelegramMessage(chatId, msg, { parseMode: "HTML" });
                } catch (tgErr) {
                    directError(employeeEntry, "Telegram API error: " + tgErr.toString());
                    utils.addError(employeeEntry, "Telegram chyba: " + tgErr.toString(), "sendReportToTelegram", tgErr);
                    return { success: false, error: tgErr.toString() };
                }

                utils.addDebug(employeeEntry, "  \u2705 Report odoslan\u00fd na Telegram ID: " + chatId);
                return { success: true };

            } catch (error) {
                directError(employeeEntry, "sendReportToTelegram: " + error.toString());
                utils.addError(employeeEntry, "Chyba send report: " + error.toString(), "sendReportToTelegram", error);
                return { success: false, error: error.toString() };
            }
        }
    };

})();
