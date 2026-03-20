// ==============================================
// MEMENTO MODULE - DENNÝ REPORT
// Verzia: 1.2.0 | Dátum: 2026-03-20 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
//    - Reusable modul pre Denný report knižnicu
//    - Auto-linkovanie záznamov podľa dátumu
//    - Agregácia dát z Dochádzky, Záznamov prác, Knihy jázd a Pokladne
//    - Validácia konzistencie zamestnancov
//    - Generovanie info záznamov a popisov
//    - High-level handlers pre triggers a actions
//    - Vytvorenie "info - Denný report - Zhrnutie" poľa (NEW v1.2.0)
// ==============================================
// 🔧 CHANGELOG:
// v1.2.0 (2026-03-20) - INFO SUMMARY GENERATION:
//    - ADDED: processAttendance() - agregácia dochádzky
//    - ADDED: processWorkRecords() - agregácia záznamov prác
//    - ADDED: processRideLog() - agregácia knihy jázd
//    - ADDED: processCashBook() - agregácia pokladne
//    - ADDED: calculateTotalHours() - výpočet celkových hodín
//    - ADDED: validateRecordsData() - validácia konzistencie zamestnancov
//    - ADDED: createCommonInfo() - vytvorenie markdown zhrnutia do info poľa
//    - MODIFIED: handleBeforeSave() - volá agregačné funkcie a createCommonInfo()
//    - BENEFIT: Obnovená funkcionalita "info - Denný report - Zhrnutie"
// v1.1.0 (2026-03-20) - HIGH-LEVEL HANDLERS:
//    - ADDED: handleBeforeSave() - kompletná logika pre BeforeSave trigger
//    - ADDED: handleAfterSave() - kompletná logika pre AfterSave trigger
//    - ADDED: recalculateAll() - kompletná logika pre recalculate action
//    - BENEFIT: Wrapper scripty znížené z 100-150 → 10-20 riadkov
//    - BENEFIT: Všetka logika v module - centrálna údržba
// v1.0.0 (2026-03-20) - INITIAL MODULE VERSION:
//    - Extracted from DenRep.Calc.Main.js (1575 lines → module)
//    - All business logic in reusable IIFE module
//    - Wrapper script reduced to ~20 lines
//    - Synchronized with GitHub for version control
//    - Supports race condition fix via MementoBusiness v8.2.0
// ==============================================

var DennyReport = (function() {
    'use strict';

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "DennyReport",
        version: "1.2.0",
        author: "ASISTANTO",
        description: "Denný report - auto-linking, aggregation, validation, reporting, high-level handlers, info summary",
        dependencies: [
            "MementoUtils",
            "MementoConfig",
            "MementoCore"
        ],
        provides: [
            "processReport",
            "autoLinkRecords",
            "validateRecords",
            "mergeDuplicates",
            "handleBeforeSave",
            "handleAfterSave",
            "recalculateAll",
            "processAttendance",
            "processWorkRecords",
            "processRideLog",
            "processCashBook",
            "calculateTotalHours",
            "validateRecordsData",
            "createCommonInfo"
        ],
        status: "stable"
    };

    // ==============================================
    // LAZY LOADING - DEPENDENCIES
    // ==============================================

    var _utils = null;
    var _config = null;

    function getUtils() {
        if (!_utils && typeof MementoUtils !== 'undefined') {
            _utils = MementoUtils;
        }
        return _utils;
    }

    function getConfig() {
        if (!_config && typeof MementoConfig !== 'undefined') {
            _config = MementoConfig.getConfig();
        }
        return _config;
    }

    // ==============================================
    // AUTO-LINKOVANIE ZÁZNAMOV
    // ==============================================

    /**
     * Automaticky nájde a nalinkuje záznamy z knižníc s rovnakým dátumom
     * @param {Object} currentEntry - Denný report entry
     * @param {Date} reportDate - Dátum reportu
     * @param {Object} options - Options {maxRecordsToCheck}
     * @returns {Object} Result {success, linked}
     */
    function autoLinkRecords(currentEntry, reportDate, options) {
        var utils = getUtils();
        var config = getConfig();
        options = options || {};

        var result = {
            success: false,
            linked: {
                attendance: 0,
                workRecords: 0,
                rideLog: 0,
                cashBook: 0
            }
        };

        try {
            utils.addDebug(currentEntry, "🔗 AUTO-LINKOVANIE: Vyhľadávam záznamy pre dátum " + utils.formatDate(reportDate));

            var maxRecordsToCheck = options.maxRecordsToCheck || 200;

            // Získaj aktuálne linknuté záznamy
            var currentAttendance = utils.safeGetLinks(currentEntry, config.fields.dailyReport.attendance) || [];
            var currentWorkRecords = utils.safeGetLinks(currentEntry, config.fields.dailyReport.workRecord) || [];
            var currentRideLog = utils.safeGetLinks(currentEntry, config.fields.dailyReport.rideLog) || [];
            var currentCashBook = utils.safeGetLinks(currentEntry, config.fields.dailyReport.cashBook) || [];

            // Vytvor mapy ID už linknutých záznamov
            var attendanceIds = createIdMap(currentAttendance);
            var workRecordIds = createIdMap(currentWorkRecords);
            var rideLogIds = createIdMap(currentRideLog);
            var cashBookIds = createIdMap(currentCashBook);

            // 1. Dochádzka
            result.linked.attendance = linkRecordsFromLibrary(
                currentEntry,
                config.libraries.attendance,
                config.fields.attendance.date,
                config.fields.dailyReport.attendance,
                reportDate,
                attendanceIds,
                maxRecordsToCheck,
                "Dochádzka"
            );

            // 2. Záznam prác
            result.linked.workRecords = linkRecordsFromLibrary(
                currentEntry,
                config.libraries.workRecords,
                config.fields.workRecord.date,
                config.fields.dailyReport.workRecord,
                reportDate,
                workRecordIds,
                maxRecordsToCheck,
                "Záznam prác"
            );

            // 3. Kniha jázd
            result.linked.rideLog = linkRecordsFromLibrary(
                currentEntry,
                config.libraries.rideLog,
                config.fields.rideLog.date,
                config.fields.dailyReport.rideLog,
                reportDate,
                rideLogIds,
                maxRecordsToCheck,
                "Kniha jázd"
            );

            // 4. Pokladňa
            result.linked.cashBook = linkRecordsFromLibrary(
                currentEntry,
                config.libraries.cashBook,
                config.fields.cashBook.date,
                config.fields.dailyReport.cashBook,
                reportDate,
                cashBookIds,
                maxRecordsToCheck,
                "Pokladňa"
            );

            var totalLinked = result.linked.attendance + result.linked.workRecords +
                            result.linked.rideLog + result.linked.cashBook;

            utils.addDebug(currentEntry, "🔗 AUTO-LINKOVANIE DOKONČENÉ: " + totalLinked + " nových záznamov nalinkovaných");
            result.success = true;

        } catch (error) {
            var utils2 = getUtils();
            if (utils2) {
                utils2.addError(currentEntry, "Chyba pri auto-linkovaní: " + error.toString(), "autoLinkRecords", error);
            }
        }

        return result;
    }

    /**
     * Helper: Create ID map from entries
     */
    function createIdMap(entries) {
        var map = {};
        for (var i = 0; i < entries.length; i++) {
            map[entries[i].field("ID")] = true;
        }
        return map;
    }

    /**
     * Helper: Link records from specific library
     */
    function linkRecordsFromLibrary(currentEntry, libraryName, dateField, backlinkField,
                                   reportDate, existingIds, maxRecords, libraryLabel) {
        var utils = getUtils();
        var linkedCount = 0;

        try {
            var lib = libByName(libraryName);
            if (!lib) return 0;

            var entries = lib.entries();
            var count = Math.min(entries.length, maxRecords);
            utils.addDebug(currentEntry, "  🔍 Kontrolujem " + libraryLabel + ": " + count + " posledných záznamov (z " + entries.length + ")");

            for (var i = 0; i < count; i++) {
                var entry = entries[i];
                var date = utils.safeGet(entry, dateField);
                var id = entry.field("ID");

                if (date && utils.formatDate(date) === utils.formatDate(reportDate)) {
                    if (!existingIds[id]) {
                        var currentLinks = currentEntry.field(backlinkField);
                        currentLinks.push(entry);
                        currentEntry.set(backlinkField, currentLinks);
                        linkedCount++;
                        utils.addDebug(currentEntry, "  ✅ Linknutý záznam " + libraryLabel + " #" + id);

                        // Pridaj ikonu Denného reportu
                        addDailyReportIcon(entry, "ikony záznamu");
                    }
                }
            }
        } catch (error) {
            // Silent fail pre jednotlivé knižnice
        }

        return linkedCount;
    }

    /**
     * Helper: Add Daily Report icon
     */
    function addDailyReportIcon(entry, iconFieldName) {
        var utils = getUtils();
        try {
            var currentIcons = utils.safeGet(entry, iconFieldName, "");
            var dailyReportIcon = "📊";

            if (currentIcons.indexOf(dailyReportIcon) === -1) {
                var newIcons = currentIcons ? currentIcons + " " + dailyReportIcon : dailyReportIcon;
                utils.safeSet(entry, iconFieldName, newIcons);
            }
        } catch (error) {
            // Silent fail - ikona nie je kritická
        }
    }

    // ==============================================
    // VALIDÁCIA DÁTUMOV
    // ==============================================

    /**
     * Validuje dátumy všetkých linknutých záznamov
     * @param {Object} currentEntry - Denný report entry
     * @param {Date} reportDate - Expected date
     * @returns {Object} Result {success, unlinked}
     */
    function validateAndUnlinkInvalidDates(currentEntry, reportDate) {
        var utils = getUtils();
        var config = getConfig();

        var result = {
            success: false,
            unlinked: {
                attendance: 0,
                workRecords: 0,
                rideLog: 0,
                cashBook: 0
            }
        };

        try {
            var reportDateStr = utils.formatDate(reportDate);
            utils.addDebug(currentEntry, "🔍 VALIDÁCIA DÁTUMOV: Kontrolujem zhodu s dátumom " + reportDateStr);

            // Validácia všetkých sekcií
            result.unlinked.attendance = validateDateField(
                currentEntry,
                config.fields.dailyReport.attendance,
                config.fields.attendance.date,
                reportDateStr,
                "Dochádzka"
            );

            result.unlinked.workRecords = validateDateField(
                currentEntry,
                config.fields.dailyReport.workRecord,
                config.fields.workRecord.date,
                reportDateStr,
                "Práce"
            );

            result.unlinked.rideLog = validateDateField(
                currentEntry,
                config.fields.dailyReport.rideLog,
                config.fields.rideLog.date,
                reportDateStr,
                "Jazdy"
            );

            result.unlinked.cashBook = validateDateField(
                currentEntry,
                config.fields.dailyReport.cashBook,
                config.fields.cashBook.date,
                reportDateStr,
                "Pokladňa"
            );

            var totalUnlinked = result.unlinked.attendance + result.unlinked.workRecords +
                              result.unlinked.rideLog + result.unlinked.cashBook;

            if (totalUnlinked > 0) {
                utils.addDebug(currentEntry, "🔍 VALIDÁCIA DOKONČENÁ: " + totalUnlinked + " záznamov unlinknutých");
            } else {
                utils.addDebug(currentEntry, "✅ Všetky linknuté záznamy majú správny dátum");
            }

            result.success = true;

        } catch (error) {
            var utils2 = getUtils();
            if (utils2) {
                utils2.addError(currentEntry, "Chyba pri validácii: " + error.toString(), "validateAndUnlinkInvalidDates", error);
            }
        }

        return result;
    }

    /**
     * Helper: Validate single field
     */
    function validateDateField(currentEntry, backlinkField, dateField, reportDateStr, label) {
        var utils = getUtils();
        var unlinked = 0;

        try {
            var records = utils.safeGetLinks(currentEntry, backlinkField) || [];
            for (var i = 0; i < records.length; i++) {
                var date = utils.safeGet(records[i], dateField);
                if (!date || utils.formatDate(date) !== reportDateStr) {
                    var id = records[i].field("ID");
                    currentEntry.unlink(backlinkField, records[i]);
                    unlinked++;
                    utils.addDebug(currentEntry, "  ❌ Unlinknutý " + label + " #" + id);
                }
            }
        } catch (error) {
            // Silent fail
        }

        return unlinked;
    }

    // ==============================================
    // HLAVNÉ SPRACOVANIE
    // ==============================================

    /**
     * Process complete daily report
     * @param {Object} currentEntry - Daily report entry
     * @param {Object} options - Processing options
     * @returns {Object} Result {success, summary}
     */
    function processReport(currentEntry, options) {
        var utils = getUtils();
        var config = getConfig();
        options = options || {};

        try {
            // Get date
            var reportDate = utils.safeGet(currentEntry, config.fields.dailyReport.date);
            if (!reportDate) {
                return { success: false, error: "Missing date" };
            }

            // Set day of week
            utils.setDayOfWeekField(currentEntry, config.fields.dailyReport.dayOfWeek, reportDate);

            // Auto-link records
            var linkResult = autoLinkRecords(currentEntry, reportDate, options);

            // Validate dates
            var validateResult = validateAndUnlinkInvalidDates(currentEntry, reportDate);

            // Process sections (aggregation happens in wrapper via existing code)
            // This module provides the linking and validation
            // Actual aggregation stays in wrapper for now (can be migrated later)

            return {
                success: true,
                linked: linkResult.linked,
                unlinked: validateResult.unlinked
            };

        } catch (error) {
            var utils2 = getUtils();
            if (utils2) {
                utils2.addError(currentEntry, "Chyba v processReport: " + error.toString(), "processReport", error);
            }
            return { success: false, error: error.toString() };
        }
    }

    // ==============================================
    // MERGE DUPLICATES
    // ==============================================

    /**
     * Find and merge duplicate daily reports
     * @param {Object} currentEntry - Entry for logging
     * @returns {Object} Result {success, merged, deleted}
     */
    function mergeDuplicates(currentEntry) {
        var utils = getUtils();
        var config = getConfig();

        var result = {
            success: false,
            merged: 0,
            deleted: 0,
            duplicates: []
        };

        try {
            var dailyReportLib = libByName(config.libraries.dailyReport);
            if (!dailyReportLib) {
                return { success: false, error: "Daily report library not found" };
            }

            var allReports = dailyReportLib.entries();
            var dateMap = {};

            // Group by date
            for (var i = 0; i < allReports.length; i++) {
                var report = allReports[i];
                var date = utils.safeGet(report, config.fields.dailyReport.date);
                if (!date) continue;

                var dateKey = moment(date).format('YYYY-MM-DD');
                if (!dateMap[dateKey]) dateMap[dateKey] = [];
                dateMap[dateKey].push(report);
            }

            // Find duplicates
            for (var dateKey in dateMap) {
                if (dateMap[dateKey].length > 1) {
                    result.duplicates.push({
                        date: dateKey,
                        count: dateMap[dateKey].length,
                        reports: dateMap[dateKey]
                    });
                }
            }

            if (result.duplicates.length === 0) {
                return { success: true, merged: 0, deleted: 0, duplicates: [] };
            }

            // Merge each group
            var backlinkFields = [
                config.fields.dailyReport.attendance,
                config.fields.dailyReport.workRecord,
                config.fields.dailyReport.rideLog,
                config.fields.dailyReport.cashBook
            ];

            for (var i = 0; i < result.duplicates.length; i++) {
                var group = result.duplicates[i].reports;

                // Sort by creation time (oldest first)
                group.sort(function(a, b) {
                    var aTime = utils.safeGet(a, config.fields.common.createdTime) || new Date(0);
                    var bTime = utils.safeGet(b, config.fields.common.createdTime) || new Date(0);
                    return aTime - bTime;
                });

                var primaryReport = group[0]; // Keep oldest

                // Merge backlinks from duplicates
                for (var j = 1; j < group.length; j++) {
                    var duplicate = group[j];

                    for (var k = 0; k < backlinkFields.length; k++) {
                        var field = backlinkFields[k];
                        var dupLinks = utils.safeGetLinks(duplicate, field, []);
                        var primaryLinks = utils.safeGetLinks(primaryReport, field, []);

                        // Add missing links
                        for (var l = 0; l < dupLinks.length; l++) {
                            var link = dupLinks[l];
                            var exists = false;

                            for (var m = 0; m < primaryLinks.length; m++) {
                                if (primaryLinks[m].id === link.id) {
                                    exists = true;
                                    break;
                                }
                            }

                            if (!exists) {
                                primaryLinks.push(link);
                            }
                        }

                        utils.safeSet(primaryReport, field, primaryLinks);
                    }

                    // Delete duplicate
                    dailyReportLib.deleteEntry(duplicate);
                    result.deleted++;
                }

                result.merged++;
            }

            result.success = true;

        } catch (error) {
            var utils2 = getUtils();
            if (utils2) {
                utils2.addError(currentEntry, "Chyba pri merge duplicates: " + error.toString(), "mergeDuplicates", error);
            }
        }

        return result;
    }

    // ==============================================
    // AGREGAČNÉ FUNKCIE - SPRACOVANIE SEKCIÍ
    // ==============================================

    /**
     * Spracuje Dochádzku - agreguje hodiny a zamestnancov
     * @param {Object} currentEntry - Daily report entry
     * @returns {Object} Result {success, count, totalHours, employees}
     */
    function processAttendance(currentEntry) {
        var utils = getUtils();
        var config = getConfig();

        var result = {
            success: false,
            count: 0,
            totalHours: 0,
            employees: []
        };

        try {
            var attendanceRecords = utils.safeGetLinks(currentEntry, config.fields.dailyReport.attendance);

            if (!attendanceRecords || attendanceRecords.length === 0) {
                utils.addDebug(currentEntry, "  ℹ️ Žiadne záznamy dochádzky");
                return result;
            }

            utils.addDebug(currentEntry, "  📊 Počet záznamov dochádzky: " + attendanceRecords.length);

            var totalWorked = 0;
            var employeeSet = {};

            for (var i = 0; i < attendanceRecords.length; i++) {
                var attendance = attendanceRecords[i];
                var employees = utils.safeGetLinks(attendance, config.fields.attendance.employees);
                var workedHours = utils.safeGet(attendance, config.fields.attendance.workedHours, 0);

                // Agreguj zamestnancov
                if (employees && employees.length > 0) {
                    for (var j = 0; j < employees.length; j++) {
                        var empName = utils.safeGet(employees[j], config.fields.employee.nick);
                        if (empName) {
                            employeeSet[empName] = true;
                        }
                    }
                }

                totalWorked += workedHours;
            }

            var employeeNames = Object.keys(employeeSet);

            result.success = true;
            result.count = attendanceRecords.length;
            result.totalHours = totalWorked;
            result.employees = employeeNames;

        } catch (error) {
            utils.addError(currentEntry, "Chyba pri spracovaní dochádzky: " + error.toString(), "processAttendance", error);
        }

        return result;
    }

    /**
     * Spracuje Záznamy prác - agreguje hodiny, zamestnancov, zákazky
     * @param {Object} currentEntry - Daily report entry
     * @returns {Object} Result {success, count, totalHours, employees, orders}
     */
    function processWorkRecords(currentEntry) {
        var utils = getUtils();
        var config = getConfig();

        var result = {
            success: false,
            count: 0,
            totalHours: 0,
            employees: [],
            orders: [],
            orderFullNames: []
        };

        try {
            var workRecords = utils.safeGetLinks(currentEntry, config.fields.dailyReport.workRecord);

            if (!workRecords || workRecords.length === 0) {
                utils.addDebug(currentEntry, "  ℹ️ Žiadne záznamy prác");
                return result;
            }

            utils.addDebug(currentEntry, "  📊 Počet záznamov prác: " + workRecords.length);

            var totalWorkedHours = 0;
            var employeeSet = {};
            var orderSet = {};
            var orderFullNames = {};

            for (var i = 0; i < workRecords.length; i++) {
                var work = workRecords[i];
                var order = utils.safeGetLinks(work, config.fields.workRecord.order);
                var workedHours = utils.safeGet(work, config.fields.workRecord.workedHours, 0);
                var employees = utils.safeGetLinks(work, config.fields.workRecord.employees);

                // Agreguj zákazky
                if (order && order.length > 0) {
                    var orderName = utils.safeGet(order[0], config.fields.order.name);
                    var orderNumber = utils.safeGet(order[0], config.fields.order.number, "");
                    if (orderName) {
                        orderSet[orderName] = true;
                        var fullName = orderNumber ? orderNumber + "." + orderName : orderName;
                        orderFullNames[fullName] = true;
                    }
                }

                // Agreguj zamestnancov
                if (employees && employees.length > 0) {
                    for (var emp = 0; emp < employees.length; emp++) {
                        var empName = utils.safeGet(employees[emp], config.fields.employee.nick);
                        if (empName) {
                            employeeSet[empName] = true;
                        }
                    }
                }

                totalWorkedHours += workedHours;
            }

            result.success = true;
            result.count = workRecords.length;
            result.totalHours = totalWorkedHours;
            result.employees = Object.keys(employeeSet);
            result.orders = Object.keys(orderSet);
            result.orderFullNames = Object.keys(orderFullNames);

        } catch (error) {
            utils.addError(currentEntry, "Chyba pri spracovaní záznamov prác: " + error.toString(), "processWorkRecords", error);
        }

        return result;
    }

    /**
     * Spracuje Knihu jázd - agreguje km, vozidlá, posádku
     * @param {Object} currentEntry - Daily report entry
     * @returns {Object} Result {success, count, totalKm, vehicles, crew}
     */
    function processRideLog(currentEntry) {
        var utils = getUtils();
        var config = getConfig();

        var result = {
            success: false,
            count: 0,
            totalKm: 0,
            vehicles: [],
            crew: []
        };

        try {
            var rideRecords = utils.safeGetLinks(currentEntry, config.fields.dailyReport.rideLog);

            if (!rideRecords || rideRecords.length === 0) {
                utils.addDebug(currentEntry, "  ℹ️ Žiadne záznamy z knihy jázd");
                return result;
            }

            utils.addDebug(currentEntry, "  📊 Počet záznamov z knihy jázd: " + rideRecords.length);

            var totalKm = 0;
            var vehicleSet = {};
            var crewSet = {};

            for (var i = 0; i < rideRecords.length; i++) {
                var ride = rideRecords[i];
                var vehicle = utils.safeGetLinks(ride, config.fields.rideLog.vehicle);
                var km = utils.safeGet(ride, config.fields.rideLog.km, 0);
                var crew = utils.safeGetLinks(ride, "Posádka");

                // Agreguj vozidlá
                if (vehicle && vehicle.length > 0) {
                    var vehicleName = utils.safeGet(vehicle[0], config.fields.vehicle.name);
                    if (vehicleName) {
                        vehicleSet[vehicleName] = true;
                    }
                }

                // Agreguj posádku
                if (crew && crew.length > 0) {
                    for (var cr = 0; cr < crew.length; cr++) {
                        var crewName = utils.safeGet(crew[cr], config.fields.employee.nick);
                        if (crewName) {
                            crewSet[crewName] = true;
                        }
                    }
                }

                totalKm += km;
            }

            result.success = true;
            result.count = rideRecords.length;
            result.totalKm = totalKm;
            result.vehicles = Object.keys(vehicleSet);
            result.crew = Object.keys(crewSet);

        } catch (error) {
            utils.addError(currentEntry, "Chyba pri spracovaní knihy jázd: " + error.toString(), "processRideLog", error);
        }

        return result;
    }

    /**
     * Spracuje Pokladňu - agreguje príjmy a výdavky
     * @param {Object} currentEntry - Daily report entry
     * @returns {Object} Result {success, count, totalIncome, totalExpense}
     */
    function processCashBook(currentEntry) {
        var utils = getUtils();
        var config = getConfig();

        var result = {
            success: false,
            count: 0,
            totalIncome: 0,
            totalExpense: 0
        };

        try {
            var cashRecords = utils.safeGetLinks(currentEntry, config.fields.dailyReport.cashBook);

            if (!cashRecords || cashRecords.length === 0) {
                utils.addDebug(currentEntry, "  ℹ️ Žiadne záznamy z pokladne");
                return result;
            }

            utils.addDebug(currentEntry, "  📊 Počet záznamov z pokladne: " + cashRecords.length);

            var totalIncome = 0;
            var totalExpense = 0;

            for (var i = 0; i < cashRecords.length; i++) {
                var cash = cashRecords[i];
                var transactionType = utils.safeGet(cash, config.fields.cashBook.transactionType, "");
                var sumTotal = utils.safeGet(cash, config.fields.cashBook.sumTotal, 0);
                var sum = utils.safeGet(cash, config.fields.cashBook.sum, 0);

                // Konvertuj na čísla ak sú stringy
                if (typeof sumTotal === "string") {
                    sumTotal = parseFloat(sumTotal) || 0;
                }
                if (typeof sum === "string") {
                    sum = parseFloat(sum) || 0;
                }

                // Použij sumTotal ak existuje, inak sum
                var amount = (sumTotal !== null && sumTotal !== undefined && sumTotal !== 0) ? sumTotal : sum;

                // Agreguj príjmy a výdavky
                if (transactionType === "Príjem") {
                    totalIncome += amount;
                } else if (transactionType === "Výdaj" || transactionType === "Výdavok") {
                    totalExpense += amount;
                }
            }

            result.success = true;
            result.count = cashRecords.length;
            result.totalIncome = totalIncome;
            result.totalExpense = totalExpense;

        } catch (error) {
            utils.addError(currentEntry, "Chyba pri spracovaní pokladne: " + error.toString(), "processCashBook", error);
        }

        return result;
    }

    /**
     * Vypočíta celkové odpracované hodiny
     * @param {Object} attendanceResult - Výsledok z processAttendance()
     * @param {Object} workRecordsResult - Výsledok z processWorkRecords()
     * @returns {Object} Result {success, totalHours}
     */
    function calculateTotalHours(attendanceResult, workRecordsResult) {
        var result = {
            success: false,
            totalHours: 0
        };

        try {
            var totalFromAttendance = attendanceResult.totalHours || 0;
            var totalFromWork = workRecordsResult.totalHours || 0;

            // Použij maximum (v prípade, že sú oba hodnoty vyplnené)
            var totalHours = Math.max(totalFromAttendance, totalFromWork);

            // Ak sú obe hodnoty 0, skús súčet
            if (totalHours === 0) {
                totalHours = totalFromAttendance + totalFromWork;
            }

            result.success = true;
            result.totalHours = totalHours;

        } catch (error) {
            // Silent fail
        }

        return result;
    }

    /**
     * Validuje konzistenciu zamestnancov medzi sekciami
     * @param {Object} currentEntry - Daily report entry
     * @param {Object} attendanceResult - Výsledok z processAttendance()
     * @param {Object} workRecordsResult - Výsledok z processWorkRecords()
     * @param {Object} rideLogResult - Výsledok z processRideLog()
     * @returns {Object} Result {success, warnings, employeeConsistency}
     */
    function validateRecordsData(currentEntry, attendanceResult, workRecordsResult, rideLogResult) {
        var utils = getUtils();

        var result = {
            success: true,
            warnings: [],
            employeeConsistency: true
        };

        try {
            // Kontrola povinných sekcií
            if (attendanceResult.count === 0) {
                result.warnings.push("⚠️ Chybuje záznam Dochádzky");
            }

            if (workRecordsResult.count === 0) {
                result.warnings.push("⚠️ Chybuje záznam Prác");
            }

            if (rideLogResult.count === 0) {
                result.warnings.push("⚠️ Chybuje záznam z Knihy jázd");
            }

            // Kontrola konzistencie zamestnancov
            if (attendanceResult.count > 0 && workRecordsResult.count > 0) {
                var attendanceEmployees = attendanceResult.employees || [];
                var workEmployees = workRecordsResult.employees || [];

                if (attendanceEmployees.length !== workEmployees.length) {
                    var msg = "❌ Počet zamestnancov sa nezhoduje: Dochádzka (" + attendanceEmployees.length + ") ≠ Záznamy prác (" + workEmployees.length + ")";
                    result.warnings.push(msg);
                    result.employeeConsistency = false;
                }
            }

            if (attendanceResult.count > 0 && rideLogResult.count > 0) {
                var attendanceEmployees2 = attendanceResult.employees || [];
                var rideEmployees = rideLogResult.crew || [];

                if (attendanceEmployees2.length !== rideEmployees.length) {
                    var msg2 = "❌ Počet zamestnancov sa nezhoduje: Dochádzka (" + attendanceEmployees2.length + ") ≠ Kniha jázd (" + rideEmployees.length + ")";
                    result.warnings.push(msg2);
                    result.employeeConsistency = false;
                }
            }

        } catch (error) {
            utils.addError(currentEntry, "Chyba pri validácii: " + error.toString(), "validateRecordsData", error);
        }

        return result;
    }

    /**
     * Vytvorí spoločný info záznam (markdown zhrnutie)
     * @param {Object} currentEntry - Daily report entry
     * @param {Object} attendanceResult - Výsledok z processAttendance()
     * @param {Object} workRecordsResult - Výsledok z processWorkRecords()
     * @param {Object} rideLogResult - Výsledok z processRideLog()
     * @param {Object} cashBookResult - Výsledok z processCashBook()
     * @param {Object} totalHoursResult - Výsledok z calculateTotalHours()
     * @param {Object} validationResult - Výsledok z validateRecordsData()
     * @returns {Object} Result {success}
     */
    function createCommonInfo(currentEntry, attendanceResult, workRecordsResult, rideLogResult, cashBookResult, totalHoursResult, validationResult) {
        var utils = getUtils();
        var config = getConfig();

        var result = {
            success: false
        };

        try {
            var now = new Date();
            var timestamp = utils.formatDate(now) + " " + utils.formatTime(now);

            // Hlavička
            var info = "## 📊 DENNÝ REPORT - ZHRNUTIE\n\n";
            info += "**Dátum:** " + utils.formatDate(utils.safeGet(currentEntry, config.fields.dailyReport.date)) + "  \n";
            info += "**Aktualizované:** " + timestamp + "\n\n";

            // Varovania z validácie
            var hasWarnings = validationResult && validationResult.warnings && validationResult.warnings.length > 0;

            if (hasWarnings) {
                info += "## ⚠️ Upozornenia\n\n";
                for (var v = 0; v < validationResult.warnings.length; v++) {
                    info += "- " + validationResult.warnings[v] + "\n";
                }
                info += "\n";

                // Pridaj ikonu upozornenia
                utils.addRecordIcon(currentEntry, "⚠️");
            } else {
                // Ak už nie sú žiadne upozornenia, odstráň ikonu upozornenia
                utils.removeRecordIcon(currentEntry, "⚠️");
            }

            // Kontrola prestojov - porovnanie hodín medzi Dochádzkou a Prácami
            if (attendanceResult.count > 0 && workRecordsResult.count > 0) {
                var attendanceHours = attendanceResult.totalHours;
                var workHours = workRecordsResult.totalHours;
                var hoursDiff = attendanceHours - workHours;

                if (hoursDiff > 0.1) { // Tolerancia 0.1h
                    // Prestoje: Dochádzka má viac hodín ako Práce
                    info += "## ⏸️ Prestoje\n\n";
                    info += "- **Prestoj:** " + hoursDiff.toFixed(2) + " h\n";
                    info += "- **Dochádzka:** " + attendanceHours.toFixed(2) + " h\n";
                    info += "- **Práce:** " + workHours.toFixed(2) + " h\n";
                    info += "- ⚠️ Zamestnanci boli prítomní, ale nevykonávali práce\n\n";
                    utils.addRecordIcon(currentEntry, "⏸️");
                } else if (hoursDiff < -0.1) { // Tolerancia -0.1h
                    // Chyba: Práce majú viac hodín ako Dochádzka
                    info += "## ⚠️ Skontrolovať a opraviť\n\n";
                    info += "- **Nezhoda hodín:** " + Math.abs(hoursDiff).toFixed(2) + " h\n";
                    info += "- **Dochádzka:** " + attendanceHours.toFixed(2) + " h\n";
                    info += "- **Práce:** " + workHours.toFixed(2) + " h\n";
                    info += "- ❌ Práce majú viac hodín ako Dochádzka - skontrolujte a opravte\n\n";
                    utils.addRecordIcon(currentEntry, "⚠️");
                } else {
                    // Hodiny sa zhodujú
                    utils.removeRecordIcon(currentEntry, "⏸️");
                }
            } else {
                utils.removeRecordIcon(currentEntry, "⏸️");
            }

            info += "---\n\n";

            // Sekcia Dochádzka
            if (attendanceResult.count > 0) {
                info += "## 👥 Dochádzka\n\n";
                info += "- **Počet záznamov:** " + attendanceResult.count + "\n";
                info += "- **Odpracované hodiny:** " + attendanceResult.totalHours.toFixed(2) + " h\n";
                if (attendanceResult.employees.length > 0) {
                    info += "- **Zamestnanci (" + attendanceResult.employees.length + "):** " + attendanceResult.employees.join(", ") + "\n";
                }
                info += "\n";
            }

            // Sekcia Záznamy prác
            if (workRecordsResult.count > 0) {
                info += "## 📝 Záznamy prác\n\n";
                info += "- **Počet záznamov:** " + workRecordsResult.count + "\n";
                info += "- **Celkom hodín:** " + workRecordsResult.totalHours.toFixed(2) + " h\n";
                if (workRecordsResult.employees && workRecordsResult.employees.length > 0) {
                    info += "- **Zamestnanci (" + workRecordsResult.employees.length + "):** " + workRecordsResult.employees.join(", ") + "\n";
                }
                if (workRecordsResult.orders.length > 0) {
                    info += "- **Zákazky (" + workRecordsResult.orders.length + "):** " + workRecordsResult.orders.join(", ") + "\n";
                }
                info += "\n";
            }

            // Sekcia Kniha jázd
            if (rideLogResult.count > 0) {
                info += "## 🚗 Kniha jázd\n\n";
                info += "- **Počet záznamov:** " + rideLogResult.count + "\n";
                info += "- **Celkom km:** " + rideLogResult.totalKm.toFixed(2) + " km\n";
                if (rideLogResult.crew && rideLogResult.crew.length > 0) {
                    info += "- **Posádka (" + rideLogResult.crew.length + "):** " + rideLogResult.crew.join(", ") + "\n";
                }
                if (rideLogResult.vehicles.length > 0) {
                    info += "- **Vozidlá (" + rideLogResult.vehicles.length + "):** " + rideLogResult.vehicles.join(", ") + "\n";
                }
                info += "\n";
            }

            // Sekcia Pokladňa
            if (cashBookResult.count > 0) {
                info += "## 💰 Pokladňa\n\n";
                info += "- **Počet záznamov:** " + cashBookResult.count + "\n";
                info += "- **Príjmy:** +" + cashBookResult.totalIncome.toFixed(2) + " €\n";
                info += "- **Výdavky:** -" + cashBookResult.totalExpense.toFixed(2) + " €\n";
                var balance = cashBookResult.totalIncome - cashBookResult.totalExpense;
                info += "- **Bilancia:** " + (balance >= 0 ? "+" : "") + balance.toFixed(2) + " €\n";
                info += "\n";
            }

            // Celkové hodiny
            if (totalHoursResult.totalHours > 0) {
                info += "---\n\n";
                info += "## ⏱️ Celkové hodiny\n\n";
                info += "**" + totalHoursResult.totalHours.toFixed(2) + " h**\n\n";
            }

            // Ulož do spoločného info poľa
            utils.safeSet(currentEntry, config.fields.common.info, info);
            utils.addDebug(currentEntry, "  ✅ Spoločný info záznam vytvorený a zapísaný");

            result.success = true;

        } catch (error) {
            utils.addError(currentEntry, "Chyba pri vytváraní spoločného info: " + error.toString(), "createCommonInfo", error);
        }

        return result;
    }

    // ==============================================
    // HIGH-LEVEL HANDLERS FOR TRIGGERS/ACTIONS
    // ==============================================

    /**
     * Handler pre BeforeSave trigger (newEntry aj updateEntry)
     * Kompletná logika: validácia, prepočet, logging, message
     * @param {Object} currentEntry - Denný report entry
     * @throws {Error} Ak nastane kritická chyba
     */
    function handleBeforeSave(currentEntry) {
        var utils = getUtils();
        var config = getConfig();

        if (!utils || !config) {
            throw new Error("MementoUtils alebo MementoConfig nie je dostupný");
        }

        var SCRIPT_NAME = "DennyReport.handleBeforeSave";

        utils.addDebug(currentEntry, "🚀 === ŠTART handleBeforeSave v" + MODULE_INFO.version + " ===");
        utils.clearLogs(currentEntry, true);

        // Validácia dátumu
        var reportDate = utils.safeGet(currentEntry, config.fields.dailyReport.date);
        if (!reportDate) {
            utils.addError(currentEntry, "Dátum nie je vyplnený", SCRIPT_NAME);
            throw new Error("❌ Dátum nie je vyplnený!");
        }

        utils.addDebug(currentEntry, "📅 Dátum reportu: " + utils.formatDate(reportDate));

        // Zavolaj modul pre auto-linkovanie a validáciu
        utils.addDebug(currentEntry, "🔗 KROK 1: Auto-linkovanie a validácia");
        var result = processReport(currentEntry, {
            maxRecordsToCheck: 200
        });

        // Kontrola výsledku
        if (!result.success) {
            utils.addError(currentEntry, "Chyba prepočtu: " + (result.error || "Unknown error"), SCRIPT_NAME);
            throw new Error("❌ Chyba prepočtu!\n\n" + result.error);
        }

        // Log linking results
        var totalLinked = result.linked.attendance + result.linked.workRecords +
                         result.linked.rideLog + result.linked.cashBook;

        var totalUnlinked = result.unlinked.attendance + result.unlinked.workRecords +
                           result.unlinked.rideLog + result.unlinked.cashBook;

        if (totalLinked > 0) {
            utils.addDebug(currentEntry, "  ✅ Nalinkované: " + totalLinked + " nových záznamov");
        }

        if (totalUnlinked > 0) {
            utils.addDebug(currentEntry, "  ⚠️ Unlinkované: " + totalUnlinked + " záznamov (nesprávny dátum)");
        }

        // KROK 2: Agregácia dát z každej sekcie + ikony
        utils.addDebug(currentEntry, "📊 KROK 2: Agregácia dát a ikony");

        var attendanceResult = processAttendance(currentEntry);
        var workRecordsResult = processWorkRecords(currentEntry);
        var rideLogResult = processRideLog(currentEntry);
        var cashBookResult = processCashBook(currentEntry);

        utils.addDebug(currentEntry, "  ✅ Dochádzka: " + attendanceResult.count + " záznamov, " + attendanceResult.totalHours.toFixed(2) + " h");
        utils.addDebug(currentEntry, "  ✅ Práce: " + workRecordsResult.count + " záznamov, " + workRecordsResult.totalHours.toFixed(2) + " h");
        utils.addDebug(currentEntry, "  ✅ Jazdy: " + rideLogResult.count + " záznamov, " + rideLogResult.totalKm.toFixed(2) + " km");
        utils.addDebug(currentEntry, "  ✅ Pokladňa: " + cashBookResult.count + " záznamov");

        // Pridaj/odstráň ikony podľa prítomnosti sekcií
        if (attendanceResult.count > 0) {
            utils.addRecordIcon(currentEntry, "👥");
        } else {
            utils.removeRecordIcon(currentEntry, "👥");
        }

        if (workRecordsResult.count > 0) {
            utils.addRecordIcon(currentEntry, "🛠️");
        } else {
            utils.removeRecordIcon(currentEntry, "🛠️");
        }

        if (rideLogResult.count > 0) {
            utils.addRecordIcon(currentEntry, "🚗");
        } else {
            utils.removeRecordIcon(currentEntry, "🚗");
        }

        if (cashBookResult.count > 0) {
            utils.addRecordIcon(currentEntry, "💰");
        } else {
            utils.removeRecordIcon(currentEntry, "💰");
        }

        utils.addDebug(currentEntry, "  🎨 Ikony sekcií aktualizované");

        // KROK 3: Výpočet celkových hodín
        var totalHoursResult = calculateTotalHours(attendanceResult, workRecordsResult);
        if (totalHoursResult.totalHours > 0) {
            utils.safeSet(currentEntry, config.fields.dailyReport.hoursWorked, totalHoursResult.totalHours);
            utils.addDebug(currentEntry, "  ⏱️ Celkové hodiny: " + totalHoursResult.totalHours.toFixed(2) + " h");
        }

        // KROK 4: Validácia konzistencie zamestnancov
        var validationResult = validateRecordsData(currentEntry, attendanceResult, workRecordsResult, rideLogResult);
        if (validationResult.warnings.length > 0) {
            utils.addDebug(currentEntry, "  ⚠️ Validácia: " + validationResult.warnings.length + " upozornení");
        } else {
            utils.addDebug(currentEntry, "  ✅ Validácia: bez upozornení");
        }

        // KROK 5: Vytvorenie spoločného info záznam
        utils.addDebug(currentEntry, "📝 KROK 3: Vytvorenie info zhrnutia");
        var infoResult = createCommonInfo(
            currentEntry,
            attendanceResult,
            workRecordsResult,
            rideLogResult,
            cashBookResult,
            totalHoursResult,
            validationResult
        );

        if (!infoResult.success) {
            utils.addDebug(currentEntry, "  ⚠️ Info záznam sa nepodarilo vytvoriť");
        }

        utils.addDebug(currentEntry, "✅ === PREPOČET DOKONČENÝ ===");

        // Zobraz krátke zhrnutie (len ak sú zmeny)
        if (totalLinked > 0 || totalUnlinked > 0) {
            var summary = "✅ Denný report aktualizovaný\n";
            if (totalLinked > 0) {
                summary += "\n🔗 Nalinkované: " + totalLinked;
            }
            if (totalUnlinked > 0) {
                summary += "\n⚠️ Unlinkované: " + totalUnlinked;
            }
            // Return summary to be shown by wrapper
            return { success: true, message: summary };
        }

        return { success: true };
    }

    /**
     * Handler pre AfterSave trigger (newEntry aj updateEntry)
     * Aktualizuje ikony vo všetkých linknutých záznamoch
     * @param {Object} currentEntry - Denný report entry
     */
    function handleAfterSave(currentEntry) {
        var utils = getUtils();
        var config = getConfig();

        if (!utils || !config) {
            return; // Silent fail pre AfterSave
        }

        var SCRIPT_NAME = "DennyReport.handleAfterSave";

        try {
            utils.addDebug(currentEntry, "🔄 " + SCRIPT_NAME + " v" + MODULE_INFO.version);

            var dailyReportIcon = "📊";
            var iconField = "ikony záznamu";
            var updatedCount = 0;

            // Získaj všetky linknuté záznamy
            var linkedRecords = [
                { field: config.fields.dailyReport.attendance, label: "Dochádzka" },
                { field: config.fields.dailyReport.workRecord, label: "Práce" },
                { field: config.fields.dailyReport.rideLog, label: "Jazdy" },
                { field: config.fields.dailyReport.cashBook, label: "Pokladňa" }
            ];

            // Prejdi všetky typy linknutých záznamov
            for (var i = 0; i < linkedRecords.length; i++) {
                var recordType = linkedRecords[i];
                var records = utils.safeGetLinks(currentEntry, recordType.field) || [];

                if (records.length === 0) continue;

                utils.addDebug(currentEntry, "  🔍 " + recordType.label + ": " + records.length + " záznamov");

                // Aktualizuj ikonu v každom zázname
                for (var j = 0; j < records.length; j++) {
                    var record = records[j];
                    var recordId = record.field("ID");

                    try {
                        var currentIcons = utils.safeGet(record, iconField, "");

                        // Pridaj ikonu ak ešte neexistuje
                        if (currentIcons.indexOf(dailyReportIcon) === -1) {
                            var newIcons = currentIcons ? currentIcons + " " + dailyReportIcon : dailyReportIcon;
                            utils.safeSet(record, iconField, newIcons);
                            updatedCount++;
                            utils.addDebug(currentEntry, "    ✅ Pridaná ikona do " + recordType.label + " #" + recordId);
                        }
                    } catch (error) {
                        // Silent fail pre jednotlivé záznamy
                        utils.addDebug(currentEntry, "    ⚠️ Chyba pri aktualizácii " + recordType.label + " #" + recordId + ": " + error.toString());
                    }
                }
            }

            if (updatedCount > 0) {
                utils.addDebug(currentEntry, "✅ Aktualizovaných " + updatedCount + " ikon v linknutých záznamoch");
            } else {
                utils.addDebug(currentEntry, "ℹ️ Všetky linknuté záznamy už majú ikonu");
            }

        } catch (error) {
            // Silent fail - AfterSave nesmie zablokovať uloženie
            if (utils) {
                utils.addError(currentEntry, "Chyba v " + SCRIPT_NAME + ": " + error.toString(), SCRIPT_NAME, error);
            }
        }
    }

    /**
     * Handler pre recalculate action
     * Prepočíta všetky Denné reporty v knižnici
     * @returns {Object} Result {success, stats, summary}
     */
    function recalculateAll() {
        var utils = getUtils();
        var config = getConfig();

        if (!utils || !config) {
            throw new Error("MementoUtils alebo MementoConfig nie je dostupný");
        }

        var SCRIPT_NAME = "DennyReport.recalculateAll";
        var dailyReportLib = utils.core.getLibraryByName(config.libraries.dailyReport);

        if (!dailyReportLib) {
            throw new Error("Denný report knižnica nenájdená");
        }

        utils.addDebug(dailyReportLib.entries()[0], "🔄 === ŠTART " + SCRIPT_NAME + " v" + MODULE_INFO.version + " ===");

        // Získaj všetky Denné reporty
        var allReports = dailyReportLib.entries();

        if (allReports.length === 0) {
            return {
                success: true,
                stats: { total: 0 },
                summary: "ℹ️ Žiadne záznamy na prepočítanie."
            };
        }

        // Prepočítaj všetky záznamy
        var stats = {
            total: allReports.length,
            success: 0,
            errors: 0,
            totalLinked: 0,
            totalUnlinked: 0,
            skipped: 0
        };

        utils.addDebug(allReports[0], "🔄 Spúšťam prepočet " + allReports.length + " záznamov...");

        for (var i = 0; i < allReports.length; i++) {
            var report = allReports[i];
            var reportId = report.field("ID");
            var reportDate = utils.safeGet(report, config.fields.dailyReport.date);

            if (!reportDate) {
                utils.addDebug(allReports[0], "  ⚠️ Záznam #" + reportId + " nemá dátum - preskakujem");
                stats.skipped++;
                continue;
            }

            try {
                var result = processReport(report, {
                    maxRecordsToCheck: 200
                });

                if (result.success) {
                    stats.success++;
                    stats.totalLinked += (result.linked.attendance + result.linked.workRecords +
                                        result.linked.rideLog + result.linked.cashBook);
                    stats.totalUnlinked += (result.unlinked.attendance + result.unlinked.workRecords +
                                          result.unlinked.rideLog + result.unlinked.cashBook);

                    // Log každých 10 záznamov
                    if ((i + 1) % 10 === 0) {
                        utils.addDebug(allReports[0], "  📊 Spracovaných " + (i + 1) + "/" + allReports.length + " záznamov");
                    }
                } else {
                    stats.errors++;
                    utils.addDebug(allReports[0], "  ❌ Chyba v zázname #" + reportId + ": " + result.error);
                }

            } catch (error) {
                stats.errors++;
                utils.addDebug(allReports[0], "  ❌ Výnimka v zázname #" + reportId + ": " + error.toString());
            }
        }

        // Finálne zhrnutie
        var finalSummary = "✅ PREPOČET DOKONČENÝ\n\n";
        finalSummary += "━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        finalSummary += "Celkom záznamov: " + stats.total + "\n";
        finalSummary += "Úspešne spracovaných: " + stats.success + "\n";
        if (stats.errors > 0) {
            finalSummary += "Chýb: " + stats.errors + "\n";
        }
        if (stats.skipped > 0) {
            finalSummary += "Preskočených: " + stats.skipped + "\n";
        }
        finalSummary += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        finalSummary += "🔗 Nalinkované: " + stats.totalLinked + "\n";
        finalSummary += "⚠️ Unlinkované: " + stats.totalUnlinked + "\n\n";
        finalSummary += "Prepočet dokončený.";

        utils.addDebug(allReports[0], "✅ === PREPOČET DOKONČENÝ ===");
        utils.addDebug(allReports[0], "  📊 Úspešne: " + stats.success + "/" + stats.total);
        utils.addDebug(allReports[0], "  🔗 Nalinkované: " + stats.totalLinked);
        utils.addDebug(allReports[0], "  ⚠️ Unlinkované: " + stats.totalUnlinked);

        return {
            success: true,
            stats: stats,
            summary: finalSummary,
            shortSummary: "✅ Prepočítaných " + stats.success + " záznamov\n🔗 Nalinkované: " + stats.totalLinked
        };
    }

    // ==============================================
    // PUBLIC API
    // ==============================================

    return {
        // Module info
        info: MODULE_INFO,
        version: MODULE_INFO.version,

        // Main functions
        processReport: processReport,
        autoLinkRecords: autoLinkRecords,
        validateAndUnlinkInvalidDates: validateAndUnlinkInvalidDates,
        mergeDuplicates: mergeDuplicates,

        // Aggregation functions (NEW - v1.2.0)
        processAttendance: processAttendance,
        processWorkRecords: processWorkRecords,
        processRideLog: processRideLog,
        processCashBook: processCashBook,
        calculateTotalHours: calculateTotalHours,
        validateRecordsData: validateRecordsData,
        createCommonInfo: createCommonInfo,

        // High-level handlers (v1.1.0+)
        handleBeforeSave: handleBeforeSave,
        handleAfterSave: handleAfterSave,
        recalculateAll: recalculateAll
    };
})();
