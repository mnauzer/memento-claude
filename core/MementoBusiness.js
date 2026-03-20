// ==============================================
// MEMENTO BUSINESS - High-Level Business Workflows
// Verzia: 8.3.0 | Dátum: 2026-03-20 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
//    - High-level business workflow orchestration
//    - Employee processing workflows
//    - Report generation workflows
//    - Material price management workflows
//    - Obligation management workflows
// ==============================================
// 🔧 CHANGELOG:
// v8.3.0 (2026-03-20) - CRITICAL FIX: LinkToEntry Attribute API:
//    - FIX: processEmployee() now uses CORRECT Memento attribute API
//      * BEFORE (WRONG): employeeLink.set(id, value) and .get(id)
//      * AFTER (CORRECT): employeeLink.setAttr(name, value) and .attr(name)
//      * Attributes use STRING NAMES, not numeric IDs!
//      * Example: .setAttr("denná mzda", 120) NOT .set(3, 120)
//    - FIX: Updated all attribute access in processEmployee():
//      * "odpracované" - worked hours
//      * "hodinovka" - hourly rate
//      * "+príplatok (€/h)" - supplement
//      * "+prémia (€)" - bonus
//      * "-pokuta (€)" - penalty
//      * "denná mzda" - daily wage
//    - RESULT: Attributes now ACTUALLY get set in Memento Database!
//
// v8.2.0 (2026-03-20) - RACE CONDITION FIX (Daily Report):
//    - FIX: createOrUpdateDailyReport() now has 2-level defense against race conditions
//      * Level 1 (fast): linksFrom() - checks for backlink (< 10ms)
//      * Level 2 (fallback): Date search in last 200 reports (< 100ms)
//      * Prevents duplicate Daily Reports when multiple libraries save simultaneously
//      * Automatically repairs missing backlinks when found via Level 2
//    - IMPROVED: Detailed logging shows which level succeeded
//    - RESULT: Foolproof - exactly ONE Daily Report per day regardless of race conditions
//
// v8.1.1 (2026-03-20) - PERFORMANCE OPTIMIZATION (Daily Report):
//    - OPTIMIZATION: createOrUpdateDailyReport() now uses linksFrom()
//      * Before: dailyReportLib.entries() loaded ALL reports (365+ records!)
//      * After: linksFrom() loads only linked reports (1-2 max)
//      * Result: 100x+ faster for large databases
//      * Example: 365 reports → only 1 loaded
//
// v8.1.0 (2026-03-20) - PERFORMANCE OPTIMIZATION (Obligations):
//    - OPTIMIZATION: processEmployees() now loads linkedObligations ONCE
//      * Before: Called safeGetLinksFrom() for EACH employee (3x for 3 employees)
//      * After: Calls entry.linksFrom() ONCE, passes to all employees
//      * Result: 3x faster obligation processing, cleaner code
//    - NEW: Obligation validation in processEmployees()
//      * Checks: obligation count === employee count
//      * Logs warning if mismatch detected
//    - NEW: Separate tracking for obligationsCreated vs obligationsUpdated
//      * processEmployees() returns both counts
//      * Better visibility into what happened
//    - FIX: updateObligation() now REPLACES amount instead of adding
//      * Before: 100€ + 120€ = 220€ (WRONG on recalculate!)
//      * After: 100€ → 120€ (CORRECT - sets new value)
//      * Logs old → new amount for debugging
//
// v8.0.8 (2026-03-20):
//    - FIX: Obligation creation now properly sets field types:
//      * "Veriteľ" (creditor) = STRING "Zamestnanec" (RADIO field)
//      * "Zamestnanec" (employee) = entry object (ENTRIES field)
//      * "Typ" (type) = STRING "Mzdy" (CHOICE field)
//      * "Popis" (description) = auto-generated with employee name and date
//      * "Dochádzka" (attendance) = link to source attendance entry
//    - FIX: Use "state" field instead of "status" for obligation state
//    - FIX: createObligation() now finds existing via attendance linkToEntry
//      * Prevents duplicate obligations when recalculating attendance
//      * Checks linksFrom attendance entry + employee match
//      * Updates existing obligation instead of creating new one
//
// v8.0.0 (2026-03-19) - BREAKING CHANGES:
//    - REFACTORED: Extracted utilities to focused modules
//    - Reduced from 3,942 lines to ~1,000 lines (75% reduction)
//    - Now depends on: MementoTime, MementoDate, MementoValidation,
//      MementoFormatting, MementoCalculations
//    - Removed: calculateWorkHours, calculateDailyWage, formatEmployeeName,
//      calculateProfitability, and other utility functions
//    - Use new modules directly for calculations, formatting, validation
// ==============================================
// 📖 MIGRATION GUIDE (v7 → v8):
//    OLD: MementoBusiness.calculateWorkHours(start, end)
//    NEW: MementoCalculations.calculateWorkHours(start, end)
//
//    OLD: MementoBusiness.formatEmployeeName(emp)
//    NEW: MementoFormatting.formatEmployeeName(emp)
//
//    OLD: MementoBusiness.calculateDailyWage(emp, hours, date)
//    NEW: MementoCalculations.calculateDailyWage(hours, rate, options)
// ==============================================

var MementoBusiness = (function() {
    'use strict';

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "MementoBusiness",
        version: "8.3.0",
        author: "ASISTANTO",
        description: "High-level business workflows (employee processing, reports, obligations, material prices)",
        dependencies: [
            "MementoCore",
            "MementoConfig",
            "MementoTime",
            "MementoDate",
            "MementoValidation",
            "MementoFormatting",
            "MementoCalculations"
        ],
        provides: [
            "processEmployee", "processEmployees", "showProcessingSummary",
            "createObligation", "updateObligation",
            "createOrUpdateReport", "createOrUpdateDailyReport",
            "getEmployeeWageForDate", "findValidHourlyRate",
            "findValidPrice", "generateNextNumber"
        ],
        status: "stable",
        breaking: "v8.0.0 - Extracted utilities to focused modules. Use MementoCalculations, MementoFormatting, etc. directly.",
        note: "Phase 3B: Refactored from 3,942 lines monolith to focused workflows"
    };

    var version = MODULE_INFO.version;

    // ==============================================
    // LAZY LOADING - DEPENDENCIES
    // ==============================================

    var _config = null;
    var _core = null;
    var _time = null;
    var _date = null;
    var _validation = null;
    var _formatting = null;
    var _calculations = null;

    function getConfig() {
        if (!_config && typeof MementoConfig !== 'undefined') {
            _config = MementoConfig.getConfig();
        }
        return _config;
    }

    function getCore() {
        if (!_core && typeof MementoCore !== 'undefined') {
            _core = MementoCore;
        }
        return _core;
    }

    function getTime() {
        if (!_time && typeof MementoTime !== 'undefined') {
            _time = MementoTime;
        }
        return _time;
    }

    function getDate() {
        if (!_date && typeof MementoDate !== 'undefined') {
            _date = MementoDate;
        }
        return _date;
    }

    function getValidation() {
        if (!_validation && typeof MementoValidation !== 'undefined') {
            _validation = MementoValidation;
        }
        return _validation;
    }

    function getFormatting() {
        if (!_formatting && typeof MementoFormatting !== 'undefined') {
            _formatting = MementoFormatting;
        }
        return _formatting;
    }

    function getCalculations() {
        if (!_calculations && typeof MementoCalculations !== 'undefined') {
            _calculations = MementoCalculations;
        }
        return _calculations;
    }

    // ==============================================
    // EMPLOYEE MANAGEMENT
    // ==============================================

    /**
     * Get employee details for date
     * @param {Object} employee - Employee entry
     * @param {Date} date - Date for wage lookup
     * @returns {Object} Employee details with wage data
     */
    function getEmployeeDetails(employee, date) {
        var core = getCore();
        var formatting = getFormatting();

        try {
            if (!employee) return null;

            var name = formatting ?
                formatting.formatEmployeeName(employee) :
                employee.field("Meno a priezvisko") || "N/A";

            var details = {
                entry: employee,
                name: name,
                id: employee.field("ID"),
                nick: employee.field("Prezývka") || "",
                active: employee.field("Aktívny") !== false
            };

            // Get wage data if date provided
            if (date) {
                var wageData = findValidSalary(currentEntry, employee, date);
                if (wageData) {
                    details.hourlyRate = wageData;
                }
            }

            return details;

        } catch (error) {
            if (core) {
                core.addError(entry(), "Chyba pri získavaní detailov zamestnanca", "getEmployeeDetails", error);
            }
            return null;
        }
    }

    /**
     * Find employee by nickname
     * @param {String} nick - Nickname to search
     * @returns {Object|null} Employee entry or null
     */
    function findEmployeeByNick(nick) {
        var config = getConfig();
        var core = getCore();

        try {
            if (!nick) return null;

            var employeesLib = libByName(config.libraries.employees);
            if (!employeesLib) return null;

            var employees = employeesLib.entries();
            for (var i = 0; i < employees.length; i++) {
                var emp = employees[i];
                var empNick = core ? core.safeGet(emp, "Prezývka") : emp.field("Prezývka");
                if (empNick && empNick.toLowerCase() === nick.toLowerCase()) {
                    return emp;
                }
            }

            return null;

        } catch (error) {
            return null;
        }
    }

    /**
     * Get active employees
     * @returns {Array} Array of active employee entries
     */
    function getActiveEmployees() {
        var config = getConfig();
        var core = getCore();

        try {
            var employeesLib = libByName(config.libraries.employees);
            if (!employeesLib) return [];

            var allEmployees = employeesLib.entries();
            var activeEmployees = [];

            for (var i = 0; i < allEmployees.length; i++) {
                var emp = allEmployees[i];
                var isActive = core ?
                    core.safeGet(emp, "Aktívny", true) :
                    emp.field("Aktívny") !== false;

                if (isActive) {
                    activeEmployees.push(emp);
                }
            }

            return activeEmployees;

        } catch (error) {
            return [];
        }
    }

    // ==============================================
    // WAGE & RATE LOOKUP
    // ==============================================

    /**
     * Get employee wage for specific date
     * @param {Object} employee - Employee entry
     * @param {Date} date - Date for wage lookup
     * @returns {Object|null} Wage data {hourlyRate, validFrom, type}
     */
    function getEmployeeWageForDate(employee, date) {
        var core = getCore();
        var config = getConfig();

        try {
            if (!employee || !date) return null;

            var hourlyRate = findValidHourlyRate(employee, date);

            if (!hourlyRate || hourlyRate <= 0) {
                return null;
            }

            return {
                hourlyRate: hourlyRate,
                validFrom: date,
                type: "hourly"
            };

        } catch (error) {
            return null;
        }
    }

    /**
     * Find valid salary for employee on date
     * @param {Object} entry - Current entry (for logging)
     * @param {Object} employee - Employee entry
     * @param {Date} date - Date to check
     * @returns {Number|null} Hourly rate or null
     */
    function findValidSalary(entry, employee, date) {
        var core = getCore();
        var formatting = getFormatting();

        try {
            var employeeName = formatting ?
                formatting.formatEmployeeName(employee) :
                "Unknown";

            if (core) {
                core.addDebug(entry, "  🔍 Hľadám platnú sadzbu pre " + employeeName);
            }

            var hourlyRate = findValidHourlyRate(employee, date);

            if (!hourlyRate || hourlyRate <= 0) {
                if (core) {
                    core.addError(entry, "Zamestnanec " + employeeName + " nemá platnú sadzbu", "findValidSalary");
                }
                return null;
            }

            if (core) {
                core.addDebug(entry, "  • Platná hodinovka: " + hourlyRate + " €/h");
            }

            return hourlyRate;

        } catch (error) {
            if (core) {
                core.addError(entry, "Chyba pri hľadaní sadzby: " + error.toString(), "findValidSalary", error);
            }
            return null;
        }
    }

    /**
     * Find valid hourly rate for employee on date
     * @param {Object} employee - Employee entry
     * @param {Date} date - Date to check
     * @returns {Number|null} Hourly rate or null
     */
    function findValidHourlyRate(employee, date) {
        var core = getCore();
        var config = getConfig();

        try {
            if (!employee || !date) return null;

            var fields = config.fields.wages;
            var libraryName = config.libraries.wages;

            // Get rates via linksFrom
            var rates = core.safeGetLinksFrom(employee, libraryName, fields.employee);

            if (!rates || rates.length === 0) {
                return null;
            }

            var validRate = null;
            var latestValidFrom = null;

            // Find most recent valid rate
            for (var i = 0; i < rates.length; i++) {
                var rate = rates[i];
                var validFrom = core.safeGet(rate, fields.validFrom);
                var hourlyRate = core.safeGet(rate, fields.hourlyRate);

                if (validFrom && hourlyRate && moment(validFrom).isSameOrBefore(date)) {
                    if (!latestValidFrom || moment(validFrom).isAfter(latestValidFrom)) {
                        latestValidFrom = validFrom;
                        validRate = hourlyRate;
                    }
                }
            }

            return validRate;

        } catch (error) {
            if (core) {
                core.addError(employee, "Chyba pri hľadaní sadzby: " + error.toString(), "findValidHourlyRate", error);
            }
            return null;
        }
    }

    // ==============================================
    // PRICE LOOKUP (MATERIALS, MACHINES, WORK)
    // ==============================================

    /**
     * Find valid price for item on date (universal function)
     * @param {Object} itemEntry - Item entry (material, machine, work)
     * @param {Date} date - Date for price lookup
     * @param {Object} options - Lookup options {priceType, dateField, priceField}
     * @returns {Number|null} Price or null
     */
    function findValidPrice(itemEntry, date, options) {
        var core = getCore();
        var config = getConfig();

        options = options || {};

        try {
            if (!itemEntry || !date) return null;

            // Determine price type and fields based on options or library
            var priceType = options.priceType || "sellPrice";
            var libraryName = options.libraryName;

            // Get price records (varies by library type)
            var priceRecords = [];
            var priceFieldsConfig = {};

            if (libraryName === config.libraries.materials) {
                // Material prices
                priceRecords = core.safeGetLinksFrom(itemEntry, config.libraries.materialPrices, "Materiál");
                priceFieldsConfig = {
                    validFrom: "Dátum",
                    sellPrice: "Predajná cena",
                    purchasePrice: "Nákupná cena"
                };
            } else if (libraryName === config.libraries.machines) {
                // Machine prices
                var priceHistory = core.safeGet(itemEntry, "Cenová história");
                if (priceHistory) {
                    priceRecords = priceHistory;
                }
                priceFieldsConfig = {
                    validFrom: "Platnosť od",
                    price: "Cena"
                };
            } else if (libraryName === config.libraries.workPrices) {
                // Work prices
                var workPrices = core.safeGetLinksFrom(itemEntry, config.libraries.workPrices, "Práca");
                priceRecords = workPrices;
                priceFieldsConfig = {
                    validFrom: "Platnosť od",
                    price: "Cena"
                };
            }

            if (!priceRecords || priceRecords.length === 0) {
                return null;
            }

            // Find most recent valid price
            var validPrice = null;
            var latestValidFrom = null;

            var dateFieldName = priceFieldsConfig[options.dateField || "validFrom"];
            var priceFieldName = priceFieldsConfig[options.priceField || priceType];

            for (var i = 0; i < priceRecords.length; i++) {
                var priceRecord = priceRecords[i];
                var validFrom = core.safeGet(priceRecord, dateFieldName);
                var price = core.safeGet(priceRecord, priceFieldName);

                if (validFrom && price && moment(validFrom).isSameOrBefore(date)) {
                    if (!latestValidFrom || moment(validFrom).isAfter(latestValidFrom)) {
                        latestValidFrom = validFrom;
                        validPrice = price;
                    }
                }
            }

            return validPrice;

        } catch (error) {
            if (core) {
                core.addError(entry(), "Chyba pri hľadaní ceny: " + error.toString(), "findValidPrice", error);
            }
            return null;
        }
    }

    /**
     * Find valid material price on date
     * @param {Object} materialEntry - Material entry
     * @param {Date} date - Date for price lookup
     * @returns {Number|null} Sell price or null
     */
    function findValidItemPrice(materialEntry, date) {
        var config = getConfig();
        return findValidPrice(materialEntry, date, {
            libraryName: config.libraries.materials,
            priceType: "sellPrice"
        });
    }

    /**
     * Find valid machine price on date
     * @param {Object} machineEntry - Machine entry
     * @param {Date} date - Date for price lookup
     * @returns {Number|null} Price or null
     */
    function findValidMachinePrice(machineEntry, date) {
        var config = getConfig();
        var core = getCore();

        try {
            if (!machineEntry || !date) return null;

            // Get price history from machine entry
            var priceHistory = core.safeGet(machineEntry, "Cenová história");
            if (!priceHistory || priceHistory.length === 0) {
                return null;
            }

            var validPrice = null;
            var latestValidFrom = null;

            // Find most recent valid price
            for (var i = 0; i < priceHistory.length; i++) {
                var priceRecord = priceHistory[i];
                var validFrom = core.safeGet(priceRecord, "Platnosť od");
                var price = core.safeGet(priceRecord, "Cena");

                if (validFrom && price && moment(validFrom).isSameOrBefore(date)) {
                    if (!latestValidFrom || moment(validFrom).isAfter(latestValidFrom)) {
                        latestValidFrom = validFrom;
                        validPrice = price;
                    }
                }
            }

            return validPrice;

        } catch (error) {
            return null;
        }
    }

    /**
     * Find valid work price on date
     * @param {Object} workEntry - Work entry
     * @param {Date} date - Date for price lookup
     * @returns {Number|null} Price or null
     */
    function findValidWorkPrice(workEntry, date) {
        var config = getConfig();
        return findValidPrice(workEntry, date, {
            libraryName: config.libraries.workPrices,
            priceType: "price"
        });
    }

    // ==============================================
    // EMPLOYEE PROCESSING WORKFLOWS
    // ==============================================

    /**
     * Process single employee (calculate wage, create obligation)
     * @param {Object} employee - Employee entry
     * @param {Number} workHours - Hours worked
     * @param {Date} date - Work date
     * @param {Number} index - Employee index
     * @param {Object} options - Processing options
     * @returns {Object} Processing result {success, data, error}
     */
    function processEmployee(employee, workHours, date, index, options) {
        var core = getCore();
        var config = getConfig();
        var formatting = getFormatting();
        var calculations = getCalculations();

        options = options || {};
        var currentEntry = options.entry || entry();

        try {
            // CRITICAL: Detect if employee is linkToEntry object or entry object
            // linkToEntry has .e property (linked entry) and .get/.set methods (attributes)
            var isLinkToEntry = employee && typeof employee === 'object' && employee.e !== undefined;
            var employeeLink = isLinkToEntry ? employee : null;
            var employeeEntry = isLinkToEntry ? employee.e : employee;

            // DEBUG: Show object type detection
            if (core) {
                var objType = isLinkToEntry ? "linkToEntry (má atribúty)" : "entry (bez atribútov)";
                core.addDebug(currentEntry, "  🔍 Typ objektu: " + objType);
                if (isLinkToEntry) {
                    core.addDebug(currentEntry, "  ✅ Atribúty BUDÚ nastavené");
                } else {
                    core.addDebug(currentEntry, "  ⚠️ Atribúty NEBUDÚ nastavené (nie je linkToEntry)");
                }
            }

            // CRITICAL: Never hardcode field names - use formatting module or config
            // Format as "Nick (Priezvisko)"
            var employeeName = "N/A";

            if (formatting && formatting.formatEmployeeName) {
                employeeName = formatting.formatEmployeeName(employeeEntry, {nickFirst: true});
            } else if (config && config.fields && config.fields.employee) {
                // Fallback: construct name from firstName + lastName
                var firstName = employeeEntry.field(config.fields.employee.firstName) || "";
                var lastName = employeeEntry.field(config.fields.employee.lastName) || "";
                var nick = employeeEntry.field(config.fields.employee.nick) || "";
                employeeName = (firstName + " " + lastName).trim() || nick || "N/A";
            }

            if (core) {
                core.addDebug(currentEntry, "  [" + (index + 1) + "] Spracovávam: " + employeeName, "person");
            }

            // Find hourly rate
            var hourlyRate = findValidHourlyRate(employeeEntry, date);
            if (!hourlyRate || hourlyRate <= 0) {
                if (core) {
                    core.addError(currentEntry, "Zamestnanec " + employeeName + " nemá platnú hodinovú sadzbu", "processEmployee");
                }
                return {
                    success: false,
                    error: "Missing hourly rate",
                    employee: employeeName
                };
            }

            if (core) {
                core.addDebug(currentEntry, "    • Hodinovka: " + hourlyRate + " €/h");
            }

            // CRITICAL: If linkToEntry, set attributes
            if (isLinkToEntry && employeeLink) {
                if (core) {
                    core.addDebug(currentEntry, "  📝 NASTAVUJEM ATRIBÚTY linkToEntry:");
                }

                // Attribute names (from Dochádzka library field analysis):
                // CRITICAL: Use .setAttr(name, value) and .attr(name), NOT .set(id) or .get(id)!
                // "odpracované" - worked hours (double)
                // "hodinovka" - hourly rate (currency)
                // "+príplatok (€/h)" - supplement per hour (currency) - manual, keep as is
                // "+prémia (€)" - bonus (currency) - manual, keep as is
                // "-pokuta (€)" - penalty (currency) - manual, keep as is
                // "denná mzda" - daily wage (currency) - calculated
                // "poznámka" - note (text) - optional

                try {
                    // Set worked hours attribute
                    // CRITICAL: Use .setAttr(name, value) NOT .set(id, value)!
                    if (core) {
                        core.addDebug(currentEntry, "    • Nastavujem odpracované = " + workHours + "h");
                    }
                    employeeLink.setAttr("odpracované", workHours);

                    // Set hourly rate attribute
                    if (core) {
                        core.addDebug(currentEntry, "    • Nastavujem hodinovka = " + hourlyRate + "€/h");
                    }
                    employeeLink.setAttr("hodinovka", hourlyRate);

                    if (core) {
                        core.addDebug(currentEntry, "  ✅ Atribúty NASTAVENÉ: odpracované=" + workHours + "h, hodinovka=" + hourlyRate + "€/h");
                    }
                } catch (attrError) {
                    if (core) {
                        core.addError(currentEntry, "❌ CHYBA pri nastavovaní atribútov: " + attrError.toString(), "processEmployee");
                    }
                }
            } else {
                if (core) {
                    core.addDebug(currentEntry, "  ⏭️ PRESKAKUJEM nastavenie atribútov (nie je linkToEntry)");
                }
            }

            // Get manual attributes if linkToEntry (supplement, bonus, penalty)
            var supplement = 0;  // +príplatok (€/h)
            var bonus = 0;       // +prémia (€)
            var penalty = 0;     // -pokuta (€)

            if (isLinkToEntry && employeeLink) {
                if (core) {
                    core.addDebug(currentEntry, "  📖 ČÍTAM MANUÁLNE ATRIBÚTY:");
                }

                try {
                    // CRITICAL: Use .attr(name) NOT .get(id)!
                    supplement = employeeLink.attr("+príplatok (€/h)") || 0;
                    bonus = employeeLink.attr("+prémia (€)") || 0;
                    penalty = employeeLink.attr("-pokuta (€)") || 0;

                    if (core) {
                        core.addDebug(currentEntry, "    • +príplatok = " + supplement + "€/h");
                        core.addDebug(currentEntry, "    • +prémia = " + bonus + "€");
                        core.addDebug(currentEntry, "    • -pokuta = " + penalty + "€");
                    }

                    if (supplement !== 0 || bonus !== 0 || penalty !== 0) {
                        if (core) {
                            var extrasStr = "";
                            if (supplement !== 0) extrasStr += " príplatok=" + supplement + "€/h";
                            if (bonus !== 0) extrasStr += " prémia=" + bonus + "€";
                            if (penalty !== 0) extrasStr += " pokuta=" + penalty + "€";
                            core.addDebug(currentEntry, "  💰 Extras:" + extrasStr);
                        }
                    }
                } catch (readError) {
                    if (core) {
                        core.addError(currentEntry, "❌ CHYBA pri čítaní atribútov: " + readError.toString(), "processEmployee");
                    }
                }
            }

            // Calculate daily wage with manual extras
            // Formula: (hourlyRate + supplement) × workHours + bonus - penalty
            var dailyWage = (hourlyRate + supplement) * workHours + bonus - penalty;

            if (core) {
                core.addDebug(currentEntry, "  🧮 VÝPOČET DENNEJ MZDY:");
                core.addDebug(currentEntry, "    • Vzorec: (" + hourlyRate + " + " + supplement + ") × " + workHours + " + " + bonus + " - " + penalty);
                core.addDebug(currentEntry, "    • Výsledok: " + dailyWage + " €");
            }

            // CRITICAL: If linkToEntry, set daily wage attribute
            if (isLinkToEntry && employeeLink) {
                if (core) {
                    core.addDebug(currentEntry, "  📝 NASTAVUJEM denná mzda = " + dailyWage + "€");
                }

                try {
                    // CRITICAL: Use .setAttr(name, value) NOT .set(id, value)!
                    employeeLink.setAttr("denná mzda", dailyWage);

                    if (core) {
                        core.addDebug(currentEntry, "  ✅ Denná mzda NASTAVENÁ");
                    }
                } catch (wageError) {
                    if (core) {
                        core.addError(currentEntry, "❌ CHYBA pri nastavovaní dennej mzdy: " + wageError.toString(), "processEmployee");
                    }
                }
            }

            // For backward compatibility, also calculate via MementoCalculations
            var wageResult = calculations ?
                calculations.calculateDailyWage(workHours, hourlyRate) :
                { wage: workHours * hourlyRate, regularWage: workHours * hourlyRate, overtimeWage: 0 };

            // Use our calculated wage (with extras) instead of simple calculation
            wageResult.wage = dailyWage;

            // Process obligation if enabled
            var obligationCreated = false;
            var obligationUpdated = false;

            if (options.createObligation !== false && options.processObligations !== false) {
                // CRITICAL: Use pre-loaded linkedObligations (efficient!)
                var existingObligation = null;

                if (options.linkedObligations && options.linkedObligations.length > 0) {
                    // Find existing obligation for this employee in pre-loaded list
                    for (var j = 0; j < options.linkedObligations.length; j++) {
                        var obl = options.linkedObligations[j];
                        var oblEmployee = core.safeGetLinks(obl, config.fields.obligations.employee);

                        if (oblEmployee && oblEmployee.length > 0 && oblEmployee[0].id === employeeEntry.id) {
                            existingObligation = obl;
                            break;
                        }
                    }
                }

                if (existingObligation) {
                    // Update existing obligation
                    var updateResult = updateObligation(date, existingObligation, wageResult.wage);
                    obligationUpdated = updateResult && updateResult.success;

                    if (obligationUpdated && core) {
                        core.addDebug(currentEntry, "    🔄 Záväzok aktualizovaný");
                    }
                } else {
                    // Create new obligation
                    var obligationData = {
                        amount: wageResult.wage,
                        hours: workHours,
                        hourlyRate: hourlyRate,
                        date: date,
                        sourceEntry: currentEntry
                    };

                    var obligationResult = createObligation(date, obligationData, employeeEntry);
                    obligationCreated = obligationResult && obligationResult.success;

                    if (obligationCreated && core) {
                        core.addDebug(currentEntry, "    ✅ Záväzok vytvorený");
                    }
                }
            }

            return {
                success: true,
                data: {
                    employee: employeeName,
                    employeeEntry: employeeEntry,
                    employeeLink: employeeLink,  // NEW: Return link for further processing if needed
                    hours: workHours,
                    hourlyRate: hourlyRate,
                    supplement: supplement,      // NEW: Return extras
                    bonus: bonus,
                    penalty: penalty,
                    wage: wageResult.wage,
                    regularWage: wageResult.regularWage,
                    overtimeWage: wageResult.overtimeWage,
                    overtimeHours: wageResult.overtimeHours,
                    obligationCreated: obligationCreated,
                    obligationUpdated: obligationUpdated
                }
            };

        } catch (error) {
            if (core) {
                core.addError(currentEntry, "Chyba pri spracovaní zamestnanca: " + error.toString(), "processEmployee", error);
            }
            return {
                success: false,
                error: error.toString(),
                employee: employeeName || "Unknown"
            };
        }
    }

    /**
     * Process multiple employees (batch processing)
     * @param {Array} employees - Array of employee entries
     * @param {Number} workHours - Hours worked
     * @param {Date} date - Work date
     * @param {Object} options - Processing options
     * @returns {Object} Processing result {success, processed, failed, totalWage, details}
     */
    function processEmployees(employees, workHours, date, options) {
        var core = getCore();
        var formatting = getFormatting();
        var config = getConfig();

        options = options || {};
        var currentEntry = options.entry || entry();

        try {
            if (!employees || employees.length === 0) {
                return {
                    success: false,
                    error: "No employees provided",
                    processed: 0,
                    failed: 0,
                    totalWage: 0,
                    details: []
                };
            }

            if (core) {
                core.addDebug(currentEntry, "👥 Spracovávam " + employees.length + " zamestnancov", "people");
            }

            // CRITICAL: Load linked obligations ONCE for all employees (efficient!)
            var linkedObligations = null;
            if (currentEntry && options.processObligations !== false && config) {
                try {
                    linkedObligations = currentEntry.linksFrom(
                        config.libraries.obligations,
                        config.fields.obligations.attendance
                    ) || [];

                    if (core && linkedObligations.length > 0) {
                        core.addDebug(currentEntry, "  📋 Načítaných " + linkedObligations.length + " existujúcich záväzkov");
                    }
                } catch (e) {
                    if (core) {
                        core.addDebug(currentEntry, "  ⚠️ Nemožno načítať záväzky: " + e.toString());
                    }
                    linkedObligations = [];
                }
            }

            // Pass linked obligations to processEmployee via options
            options.linkedObligations = linkedObligations;

            var results = {
                success: true,
                processed: 0,
                failed: 0,
                totalWage: 0,
                details: [],
                obligationsCreated: 0,
                obligationsUpdated: 0
            };

            // Process each employee
            for (var i = 0; i < employees.length; i++) {
                var emp = employees[i];
                var empResult = processEmployee(emp, workHours, date, i, options);

                if (empResult.success) {
                    results.processed++;
                    results.totalWage += empResult.data.wage;
                    results.details.push(empResult.data);

                    // Track obligation operations
                    if (empResult.data.obligationCreated) {
                        results.obligationsCreated++;
                    } else if (empResult.data.obligationUpdated) {
                        results.obligationsUpdated++;
                    }
                } else {
                    results.failed++;
                    results.success = false;
                    if (core) {
                        core.addError(currentEntry, "Zlyhanie pri spracovaní: " + empResult.employee, "processEmployees");
                    }
                }
            }

            // Validation: Check obligations count vs employees count
            if (core && linkedObligations && options.processObligations !== false) {
                var expectedCount = results.processed; // Successfully processed employees
                var actualCount = linkedObligations.length + results.obligationsCreated;

                if (actualCount !== expectedCount) {
                    core.addDebug(currentEntry, "  ⚠️ Nezhoda záväzkov: " + actualCount + " záväzkov pre " + expectedCount + " zamestnancov");
                }
            }

            // Summary
            if (core) {
                core.addDebug(currentEntry, "📊 Súhrn spracovania:", "summary");
                core.addDebug(currentEntry, "  • Spracovaných: " + results.processed + "/" + employees.length);
                core.addDebug(currentEntry, "  • Celková mzda: " +
                    (formatting ? formatting.formatMoney(results.totalWage) : results.totalWage + " €"));

                if (options.processObligations !== false) {
                    core.addDebug(currentEntry, "  • Záväzky vytvorené: " + results.obligationsCreated);
                    core.addDebug(currentEntry, "  • Záväzky aktualizované: " + results.obligationsUpdated);
                }
            }

            return results;

        } catch (error) {
            if (core) {
                core.addError(currentEntry, "Kritická chyba pri spracovaní zamestnancov: " + error.toString(), "processEmployees", error);
            }
            return {
                success: false,
                error: error.toString(),
                processed: 0,
                failed: employees.length,
                totalWage: 0,
                details: []
            };
        }
    }

    /**
     * Show processing summary to user
     * @param {Object} entry - Current entry
     * @param {Object} summaryData - Summary data
     * @param {Object} config - Configuration object
     */
    function showProcessingSummary(entry, summaryData, config) {
        var core = getCore();
        var formatting = getFormatting();

        try {
            var summary = "";
            var icon = summaryData.success ? "✅" : "⚠️";

            summary += icon + " " + (summaryData.success ? "HOTOVO" : "CHYBA") + "\n\n";

            if (summaryData.processed !== undefined) {
                summary += "Spracovaných: " + summaryData.processed + "\n";
            }

            if (summaryData.failed !== undefined && summaryData.failed > 0) {
                summary += "Chýb: " + summaryData.failed + "\n";
            }

            if (summaryData.totalWage !== undefined) {
                var wageStr = formatting ?
                    formatting.formatMoney(summaryData.totalWage) :
                    summaryData.totalWage + " €";
                summary += "Celková mzda: " + wageStr + "\n";
            }

            if (summaryData.date) {
                summary += "\nDátum: " + moment(summaryData.date).format("DD.MM.YYYY") + "\n";
            }

            if (summaryData.errors && summaryData.errors.length > 0) {
                summary += "\nChyby:\n";
                for (var i = 0; i < Math.min(3, summaryData.errors.length); i++) {
                    summary += "• " + summaryData.errors[i] + "\n";
                }
            }

            message(summary);

        } catch (error) {
            message(icon + " Dokončené");
        }
    }

    // ==============================================
    // OBLIGATION MANAGEMENT WORKFLOWS
    // ==============================================

    /**
     * Create or update obligation for creditor
     * @param {Date} date - Obligation date
     * @param {Object} data - Obligation data {amount, hours, hourlyRate, sourceEntry}
     * @param {Object} creditor - Creditor entry (employee or supplier)
     * @returns {Object} Result {success, obligation, created, updated}
     */
    function createObligation(date, data, creditor) {
        var core = getCore();
        var config = getConfig();

        try {
            if (!date || !data || !creditor) {
                return { success: false, error: "Missing required parameters" };
            }

            // CRITICAL: Find existing obligation via attendance linkToEntry (most specific)
            var existingForDate = null;

            if (data.sourceEntry) {
                // Get all obligations linked FROM this attendance entry
                var linkedObligations = core.safeGetLinksFrom(
                    data.sourceEntry,
                    config.libraries.obligations,
                    config.fields.obligations.attendance
                ) || [];

                // Find obligation for this specific employee
                for (var i = 0; i < linkedObligations.length; i++) {
                    var obl = linkedObligations[i];
                    var oblEmployee = core.safeGetLinks(obl, config.fields.obligations.employee);

                    if (oblEmployee && oblEmployee.length > 0 && oblEmployee[0].id === creditor.id) {
                        existingForDate = obl;
                        break;
                    }
                }
            }

            if (existingForDate) {
                // Update existing obligation
                var updateResult = updateObligation(date, existingForDate, data.amount);

                if (core && data.sourceEntry) {
                    core.addDebug(data.sourceEntry, "    🔄 Záväzok aktualizovaný (existujúci)");
                }

                return {
                    success: updateResult.success,
                    obligation: existingForDate,
                    created: false,
                    updated: true
                };
            } else {
                // Create new
                var obligationsLib = libByName(config.libraries.obligations);
                if (!obligationsLib) {
                    return { success: false, error: "Obligations library not found" };
                }

                var newObligation = obligationsLib.create({});
                core.safeSet(newObligation, config.fields.obligations.date, date);

                // CRITICAL: creditor is RADIO field (select), set to STRING "Zamestnanec"
                core.safeSet(newObligation, config.fields.obligations.creditor, "Zamestnanec");

                // employee is ENTRIES field (linkToEntry), set to employee entry object
                core.safeSet(newObligation, config.fields.obligations.employee, [creditor]);

                // type is CHOICE field (select), set to STRING "Mzdy"
                core.safeSet(newObligation, config.fields.obligations.type, "Mzdy");

                // Generate description with employee name and date
                var formatting = getFormatting();
                var employeeName = "N/A";
                if (formatting && formatting.formatEmployeeName) {
                    employeeName = formatting.formatEmployeeName(creditor, {nickFirst: true}) || "N/A";
                }

                var dateFormatted = "N/A";
                if (date) {
                    var d = new Date(date);
                    var day = d.getDate();
                    var month = d.getMonth() + 1;
                    var year = d.getFullYear();
                    dateFormatted = day + "." + month + "." + year;
                }

                var description = "Mzda zamestnanca " + employeeName + " za deň " + dateFormatted;
                core.safeSet(newObligation, config.fields.obligations.description, description);

                // Link back to source attendance entry if available
                if (data.sourceEntry) {
                    core.safeSet(newObligation, config.fields.obligations.attendance, [data.sourceEntry]);
                }

                core.safeSet(newObligation, config.fields.obligations.amount, data.amount);
                core.safeSet(newObligation, config.fields.obligations.state, "Neuhradené");

                return {
                    success: true,
                    obligation: newObligation,
                    created: true,
                    updated: false
                };
            }

        } catch (error) {
            if (core) {
                core.addError(entry(), "Chyba pri vytváraní záväzku: " + error.toString(), "createObligation", error);
            }
            return { success: false, error: error.toString() };
        }
    }

    /**
     * Update obligation amount
     * @param {Date} date - Obligation date
     * @param {Object} obligation - Obligation entry
     * @param {Number} newAmount - New amount (REPLACES old amount, not adds to it!)
     * @returns {Object} Result {success, obligation, previousAmount, newAmount}
     */
    function updateObligation(date, obligation, newAmount) {
        var core = getCore();
        var config = getConfig();

        try {
            if (!obligation || newAmount === undefined) {
                return { success: false, error: "Missing parameters" };
            }

            var currentAmount = core.safeGet(obligation, config.fields.obligations.amount, 0);

            // CRITICAL: REPLACE amount, don't add to it!
            // When recalculating attendance, we want to SET the new wage, not add to old wage
            core.safeSet(obligation, config.fields.obligations.amount, newAmount);

            if (core && currentAmount !== newAmount) {
                var formatting = getFormatting();
                var oldFormatted = formatting ? formatting.formatMoney(currentAmount) : currentAmount + " €";
                var newFormatted = formatting ? formatting.formatMoney(newAmount) : newAmount + " €";

                core.addDebug(entry(), "      Suma zmenená: " + oldFormatted + " → " + newFormatted);
            }

            return {
                success: true,
                obligation: obligation,
                previousAmount: currentAmount,
                newAmount: newAmount
            };

        } catch (error) {
            if (core) {
                core.addError(entry(), "Chyba pri aktualizácii záväzku: " + error.toString(), "updateObligation", error);
            }
            return { success: false, error: error.toString() };
        }
    }

    /**
     * Find existing obligations for creditor
     * @param {Object} creditor - Creditor entry
     * @returns {Array} Array of obligation entries
     */
    function findExistingObligations(creditor) {
        var core = getCore();
        var config = getConfig();

        try {
            if (!creditor) return [];

            var obligations = core.safeGetLinksFrom(
                creditor,
                config.libraries.obligations,
                config.fields.obligations.creditor
            );

            return obligations || [];

        } catch (error) {
            return [];
        }
    }

    // ==============================================
    // REPORT GENERATION WORKFLOWS
    // ==============================================

    /**
     * Create or update report (universal workflow)
     * @param {Object} sourceEntry - Source entry (attendance, work record, etc.)
     * @param {String} reportType - Report type ("work", "transport", "machines", "material")
     * @param {Object} calculatedData - Pre-calculated data
     * @param {Object} options - Report options
     * @returns {Object} Result {success, report, created, updated}
     */
    function createOrUpdateReport(sourceEntry, reportType, calculatedData, options) {
        var core = getCore();
        var config = getConfig();

        options = options || {};

        try {
            if (!sourceEntry || !reportType || !calculatedData) {
                return { success: false, error: "Missing required parameters" };
            }

            // CRITICAL: Check if reportTypes exists in config first
            if (!config || !config.reportTypes) {
                if (core) {
                    core.addDebug(entry(), "⚠️ Denný report preskočený - config.reportTypes neexistuje");
                }
                return { success: false, error: "Report types not configured", skipped: true };
            }

            // Get report configuration
            var reportConfig = config.reportTypes[reportType];
            if (!reportConfig) {
                return { success: false, error: "Unknown report type: " + reportType };
            }

            // Extract customer and date from source entry
            var customer = core.safeGetLinks(sourceEntry, reportConfig.customerField);
            if (!customer || customer.length === 0) {
                return { success: false, error: "Customer not found in source entry" };
            }
            customer = customer[0];

            var date = core.safeGet(sourceEntry, reportConfig.dateField);
            if (!date) {
                return { success: false, error: "Date not found in source entry" };
            }

            // Find existing report
            var existingReport = findExistingReport(customer, reportConfig, date, options);

            if (existingReport) {
                // Update existing
                linkSourceToReport(existingReport, sourceEntry, reportConfig, calculatedData, options);
                updateReportSummary(existingReport, reportConfig, calculatedData, options);

                return {
                    success: true,
                    report: existingReport,
                    created: false,
                    updated: true
                };
            } else {
                // Create new
                var customerName = core.safeGet(customer, "Názov", "N/A");
                var newReport = createGenericReport(reportConfig, customer, date, customerName, options);

                if (newReport) {
                    linkSourceToReport(newReport, sourceEntry, reportConfig, calculatedData, options);
                    updateReportSummary(newReport, reportConfig, calculatedData, options);

                    return {
                        success: true,
                        report: newReport,
                        created: true,
                        updated: false
                    };
                } else {
                    return { success: false, error: "Failed to create report" };
                }
            }

        } catch (error) {
            if (core) {
                core.addError(entry(), "Chyba pri vytváraní reportu: " + error.toString(), "createOrUpdateReport", error);
            }
            return { success: false, error: error.toString() };
        }
    }

    /**
     * Create or update daily report with 2-level defense against race conditions
     * @param {Object} sourceEntry - Source entry (attendance, work record, etc.)
     * @param {String} libraryType - Library type ("attendance", "workRecord", "rideLog", "cashBook")
     * @param {Object} options - Report options
     * @returns {Object} Result {success, report, created, updated}
     */
    function createOrUpdateDailyReport(sourceEntry, libraryType, options) {
        var core = getCore();
        var config = getConfig();

        options = options || {};

        try {
            if (!sourceEntry || !libraryType) {
                return { success: false, error: "Missing required parameters" };
            }

            // Get date from source entry (different field names per library)
            var dateField = config.fields[libraryType] ? config.fields[libraryType].date : "Dátum";
            var date = core.safeGet(sourceEntry, dateField);

            if (!date) {
                return { success: false, error: "Date not found in source entry" };
            }

            // Get Denný report library
            var dailyReportLib = libByName(config.libraries.dailyReport);
            if (!dailyReportLib) {
                return { success: false, error: "Denný report library not found" };
            }

            // Map library type to backlink field name (we need this BEFORE finding existing)
            var backlinkFieldMap = {
                "attendance": config.fields.dailyReport.attendance,
                "workRecord": config.fields.dailyReport.workRecord,
                "rideLog": config.fields.dailyReport.rideLog,
                "cashBook": config.fields.dailyReport.cashBook
            };

            var backlinkField = backlinkFieldMap[libraryType];
            if (!backlinkField) {
                return { success: false, error: "Unknown library type: " + libraryType };
            }

            var existingReport = null;

            // ===== LEVEL 1: Try linksFrom (fast path) =====
            try {
                var linkedReports = sourceEntry.linksFrom(
                    config.libraries.dailyReport,
                    backlinkField
                ) || [];

                if (core) {
                    core.addDebug(sourceEntry, "  🔍 Level 1: Checking linksFrom → " + linkedReports.length + " reports");
                }

                // Find report for this specific date (should be max 1)
                for (var i = 0; i < linkedReports.length; i++) {
                    var report = linkedReports[i];
                    var reportDate = core.safeGet(report, config.fields.dailyReport.date);
                    if (reportDate && moment(reportDate).isSame(date, 'day')) {
                        existingReport = report;
                        if (core) {
                            core.addDebug(sourceEntry, "  ✅ Level 1: Found via linksFrom");
                        }
                        break;
                    }
                }
            } catch (e) {
                if (core) {
                    core.addDebug(sourceEntry, "  ⚠️ Level 1 failed: " + e.toString());
                }
            }

            // ===== LEVEL 2: Date search fallback (catches race conditions) =====
            if (!existingReport) {
                if (core) {
                    core.addDebug(sourceEntry, "  ⚠️ Level 1 failed → Level 2: Date search");
                }

                try {
                    var allReports = dailyReportLib.entries(); // Sorted newest first
                    var maxToCheck = 200; // Check last 200 reports (~6 months)

                    for (var j = 0; j < Math.min(allReports.length, maxToCheck); j++) {
                        var r = allReports[j];
                        var rDate = core.safeGet(r, config.fields.dailyReport.date);

                        if (rDate && moment(rDate).isSame(date, 'day')) {
                            existingReport = r;
                            if (core) {
                                core.addDebug(sourceEntry, "  ✅ Level 2: Found via date search (checked " + j + " of " + allReports.length + " reports)");
                            }

                            // CRITICAL: Repair missing backlink!
                            var existingLinks = core.safeGetLinks(existingReport, backlinkField, []);
                            var alreadyLinked = false;

                            for (var k = 0; k < existingLinks.length; k++) {
                                if (existingLinks[k].id === sourceEntry.id) {
                                    alreadyLinked = true;
                                    break;
                                }
                            }

                            if (!alreadyLinked) {
                                existingLinks.push(sourceEntry);
                                core.safeSet(existingReport, backlinkField, existingLinks);
                                if (core) {
                                    core.addDebug(sourceEntry, "  🔧 Repaired missing backlink");
                                }
                            }

                            break;
                        }
                    }
                } catch (e2) {
                    if (core) {
                        core.addDebug(sourceEntry, "  ⚠️ Level 2 failed: " + e2.toString());
                    }
                }
            }

            // Update existing or create new
            if (existingReport) {
                // Update existing - add source entry to backlink field (if not already linked)
                var existingLinks = core.safeGetLinks(existingReport, backlinkField, []);
                var alreadyLinked = false;

                for (var m = 0; m < existingLinks.length; m++) {
                    if (existingLinks[m].id === sourceEntry.id) {
                        alreadyLinked = true;
                        break;
                    }
                }

                if (!alreadyLinked) {
                    existingLinks.push(sourceEntry);
                    core.safeSet(existingReport, backlinkField, existingLinks);
                }

                return {
                    success: true,
                    report: existingReport,
                    created: false,
                    updated: true
                };
            } else {
                // Create new daily report
                if (core) {
                    core.addDebug(sourceEntry, "  ➕ Creating new Daily Report (no existing found)");
                }

                var newReport = dailyReportLib.create({});
                core.safeSet(newReport, config.fields.dailyReport.date, date);
                core.safeSet(newReport, backlinkField, [sourceEntry]);

                return {
                    success: true,
                    report: newReport,
                    created: true,
                    updated: false
                };
            }

        } catch (error) {
            if (core) {
                core.addError(entry(), "Chyba pri vytváraní Denný report: " + error.toString(), "createOrUpdateDailyReport", error);
            }
            return {
                success: false,
                error: error.toString()
            };
        }
    }

    /**
     * Find existing report for customer and date
     * @param {Object} customer - Customer entry
     * @param {Object} reportConfig - Report configuration
     * @param {Date} date - Report date
     * @param {Object} options - Lookup options
     * @returns {Object|null} Report entry or null
     */
    function findExistingReport(customer, reportConfig, date, options) {
        var core = getCore();

        try {
            if (!customer || !reportConfig || !date) return null;

            var reports = core.safeGetLinksFrom(
                customer,
                reportConfig.libraryName,
                reportConfig.customerField
            );

            if (!reports || reports.length === 0) return null;

            // Find report for same date
            for (var i = 0; i < reports.length; i++) {
                var report = reports[i];
                var reportDate = core.safeGet(report, reportConfig.dateField);
                if (reportDate && moment(reportDate).isSame(date, 'day')) {
                    return report;
                }
            }

            return null;

        } catch (error) {
            return null;
        }
    }

    /**
     * Create generic report entry
     * @param {Object} reportConfig - Report configuration
     * @param {Object} customer - Customer entry
     * @param {Date} date - Report date
     * @param {String} customerName - Customer name
     * @param {Object} options - Creation options
     * @returns {Object|null} New report entry or null
     */
    function createGenericReport(reportConfig, customer, date, customerName, options) {
        var core = getCore();

        try {
            var reportLib = libByName(reportConfig.libraryName);
            if (!reportLib) return null;

            var newReport = reportLib.create({});
            core.safeSet(newReport, reportConfig.customerField, [customer]);
            core.safeSet(newReport, reportConfig.dateField, date);

            // Generate report number if needed
            if (reportConfig.numberField) {
                var reportNumber = generateNextNumber(
                    reportConfig.libraryName,
                    reportConfig.numberField,
                    reportConfig.placeholderField
                );
                if (reportNumber) {
                    core.safeSet(newReport, reportConfig.numberField, reportNumber);
                }
            }

            return newReport;

        } catch (error) {
            return null;
        }
    }

    /**
     * Link source entry to report
     * @param {Object} report - Report entry
     * @param {Object} sourceEntry - Source entry
     * @param {Object} reportConfig - Report configuration
     * @param {Object} calculatedData - Calculated data
     * @param {Object} options - Link options
     */
    function linkSourceToReport(report, sourceEntry, reportConfig, calculatedData, options) {
        var core = getCore();

        try {
            if (!report || !sourceEntry || !reportConfig) return;

            // Link source to report via backlink field
            if (reportConfig.sourceBacklinkField) {
                var existingLinks = core.safeGetLinks(report, reportConfig.sourceBacklinkField, []);
                var alreadyLinked = false;

                for (var i = 0; i < existingLinks.length; i++) {
                    if (existingLinks[i].id === sourceEntry.id) {
                        alreadyLinked = true;
                        break;
                    }
                }

                if (!alreadyLinked) {
                    existingLinks.push(sourceEntry);
                    core.safeSet(report, reportConfig.sourceBacklinkField, existingLinks);
                }
            }

        } catch (error) {
            // Silent fail
        }
    }

    /**
     * Update report summary with calculated data
     * @param {Object} report - Report entry
     * @param {Object} reportConfig - Report configuration
     * @param {Object} calculatedData - Calculated data
     * @param {Object} options - Update options
     */
    function updateReportSummary(report, reportConfig, calculatedData, options) {
        var core = getCore();

        try {
            if (!report || !reportConfig || !calculatedData) return;

            // Update summary fields based on report config
            if (reportConfig.summaryFields) {
                for (var fieldName in reportConfig.summaryFields) {
                    var calcField = reportConfig.summaryFields[fieldName];
                    if (calculatedData[calcField] !== undefined) {
                        var currentValue = core.safeGet(report, fieldName, 0);
                        var newValue = currentValue + calculatedData[calcField];
                        core.safeSet(report, fieldName, newValue);
                    }
                }
            }

        } catch (error) {
            // Silent fail
        }
    }

    // ==============================================
    // AUTO-NUMBERING
    // ==============================================

    /**
     * Generate next sequential number for library
     * @param {String} libraryName - Library name
     * @param {String} numberFieldName - Number field name
     * @param {String} placeholderFieldName - Placeholder field name
     * @returns {String|null} Generated number or null
     */
    function generateNextNumber(libraryName, numberFieldName, placeholderFieldName) {
        var core = getCore();

        try {
            var targetLib = libByName(libraryName);
            if (!targetLib) return null;

            // Get all entries
            var allEntries = targetLib.entries();
            var existingNumbers = [];

            for (var i = 0; i < allEntries.length; i++) {
                var entry = allEntries[i];
                var num = core.safeGet(entry, numberFieldName);
                if (num) {
                    existingNumbers.push(num);
                }
            }

            // Find next available number
            var nextNumber = findNextAvailableNumber(existingNumbers);

            return nextNumber;

        } catch (error) {
            return null;
        }
    }

    /**
     * Find next available number from existing numbers
     * @param {Array} existingNumbers - Array of existing numbers
     * @returns {String} Next available number
     */
    function findNextAvailableNumber(existingNumbers) {
        try {
            if (!existingNumbers || existingNumbers.length === 0) {
                return "1";
            }

            // Extract numeric parts
            var numericValues = [];
            for (var i = 0; i < existingNumbers.length; i++) {
                var num = parseInt(existingNumbers[i], 10);
                if (!isNaN(num)) {
                    numericValues.push(num);
                }
            }

            if (numericValues.length === 0) {
                return "1";
            }

            // Find max and add 1
            var maxNum = Math.max.apply(null, numericValues);
            return String(maxNum + 1);

        } catch (error) {
            return "1";
        }
    }

    /**
     * Calculate work time with rounding (wrapper for MementoTime functions)
     * @param {Date} arrival - Arrival time
     * @param {Date} departure - Departure time
     * @param {Object} options - Options object
     * @returns {Object} Result with work time details
     */
    function calculateWorkTime(arrival, departure, options) {
        try {
            var time = getTime();
            var core = getCore();

            if (!time) {
                return {
                    success: false,
                    error: "MementoTime module not available"
                };
            }

            options = options || {};
            var roundToQuarter = options.roundToQuarter !== false; // Default true

            // Round times if requested
            var arrivalRounded = arrival;
            var departureRounded = departure;

            if (roundToQuarter && time.roundToQuarterHour) {
                arrivalRounded = time.roundToQuarterHour(arrival, "nearest");
                departureRounded = time.roundToQuarterHour(departure, "nearest");
            }

            // Calculate hours difference
            var hoursResult = time.calculateHoursDifference(arrivalRounded, departureRounded);

            if (!hoursResult || hoursResult.decimalHours === undefined) {
                return {
                    success: false,
                    error: "Failed to calculate hours difference"
                };
            }

            // Add debug logging if entry provided
            if (options.entry && core && core.addDebug) {
                var debugLabel = options.debugLabel || "Work Time";
                core.addDebug(options.entry, "  • " + debugLabel + ": " +
                    hoursResult.decimalHours.toFixed(2) + " hodín");

                if (roundToQuarter) {
                    core.addDebug(options.entry, "  • Zaokrúhlené časy: " +
                        moment(arrivalRounded).format("HH:mm") + " - " +
                        moment(departureRounded).format("HH:mm"));
                }
            }

            return {
                success: true,
                startTimeOriginal: arrival,
                endTimeOriginal: departure,
                startTimeRounded: arrivalRounded,
                endTimeRounded: departureRounded,
                pracovnaDobaHodiny: hoursResult.decimalHours,
                hours: hoursResult.hours,
                minutes: hoursResult.minutes,
                totalMinutes: hoursResult.totalMinutes,
                crossesMidnight: hoursResult.crossesMidnight || false
            };

        } catch (error) {
            return {
                success: false,
                error: error.toString()
            };
        }
    }

    // ==============================================
    // PUBLIC API
    // ==============================================

    return {
        // Module metadata
        info: MODULE_INFO,
        version: version,

        // Employee management
        getEmployeeDetails: getEmployeeDetails,
        findEmployeeByNick: findEmployeeByNick,
        getActiveEmployees: getActiveEmployees,

        // Wage & rate lookup
        getEmployeeWageForDate: getEmployeeWageForDate,
        findValidSalary: findValidSalary,
        findValidHourlyRate: findValidHourlyRate,

        // Price lookup
        findValidPrice: findValidPrice,
        findValidItemPrice: findValidItemPrice,
        findValidMachinePrice: findValidMachinePrice,
        findValidWorkPrice: findValidWorkPrice,

        // Work time calculation
        calculateWorkTime: calculateWorkTime,

        // Employee processing workflows
        processEmployee: processEmployee,
        processEmployees: processEmployees,
        showProcessingSummary: showProcessingSummary,

        // Obligation workflows
        createObligation: createObligation,
        updateObligation: updateObligation,
        findExistingObligations: findExistingObligations,

        // Report workflows
        createOrUpdateReport: createOrUpdateReport,
        createOrUpdateDailyReport: createOrUpdateDailyReport,
        findExistingReport: findExistingReport,

        // Auto-numbering
        generateNextNumber: generateNextNumber
    };
})();
