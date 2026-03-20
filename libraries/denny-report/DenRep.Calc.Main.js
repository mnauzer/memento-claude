// ==============================================
// MEMENTO DATABASE - DENNÝ REPORT PREPOČET
// Verzia: 1.10.0 | Dátum: 2026-03-20 | Autor: ASISTANTO
// Knižnica: Denný report | Trigger: Before Save
// ==============================================
// ✅ FUNKCIONALITA v1.9.1:
//    - AUTO-LINKOVANIE záznamov podľa dátumu (Dochádzka, Práce, Jazdy, Pokladňa)
//    - VALIDÁCIA DÁTUMOV linknutých záznamov s automatickým unlinkovaním
//    - Automatické nastavenie dňa v týždni podľa dátumu
//    - Agregácia dát z Dochádzky, Záznamov prác, Knihy jázd a Pokladne
//    - Vytváranie Info záznamov pre každú sekciu (markdown formát)
//    - Vytvorenie spoločného info záznamu
//    - Výpočet celkových odpracovaných hodín
//    - Výpočet celkových km, príjmov a výdavkov
//    - Generovanie popisu záznamu (markdown formát)
//    - Automatické pridávanie ikôn pre vyplnené sekcie a upozornenia
//    - Agregácia strojov a materiálu zo Záznamov prác
//    - Agregácia zamestnancov (Dochádzka, Práce) a posádky (Jazdy)
//    - Validácia chýbajúcich záznamov (Dochádzka, Práce, Jazdy povinné)
//    - Validácia konzistencie zamestnancov s menami (počet + zhoda)
//    - Kontrola prestojov (porovnanie hodín Dochádzka vs Práce)
//    - Príprava na integráciu s MementoTelegram a MementoAI
// 🔧 CHANGELOG:
// v1.10.0 (2026-03-20) - PERFORMANCE OPTIMIZATION:
//    - OPTIMIZATION: autoLinkRecords() now checks only last 100 records
//      * Before: lib.entries() loaded ALL records (365+ per library!)
//      * After: Checks only last 100 records (4x 100 = 400 instead of 4x 365 = 1460)
//      * Result: 3-4x faster auto-linking for large databases
//      * Note: entries() returns newest first, so last 100 covers recent dates
//    - IMPROVED: Better debug logging shows "X of Y records checked"
//
// v1.9.1 (2025-10):
//    - OPRAVA: 3 bugs (typo vo volaniach funkcií - ordIcon, n, removeRecordIcon)
//    - REFAKTORING: Odstránená lokálna funkcia setDayOfWeek() - použitá utils.setDayOfWeekField()
//    - REFAKTORING: Odstránená lokálna funkcia removeRecordIcon() - použitá utils.removeRecordIcon()
//    - PRIDANÉ: utils.setDayOfWeekField() do MementoCore.js (generická funkcia)
//    - OPTIMALIZÁCIA: Znížená veľkosť scriptu odstránením duplicitných funkcií
// ==============================================

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var telegram = MementoTelegram;
var ai = MementoAI;
var config = utils.getConfig();
var centralConfig = utils.config;
var currentEntry = entry();

var CONFIG = {
    scriptName: "Denný report Prepočet",
    version: "1.10.0",

    // Referencie na centrálny config
    fields: {
        dailyReport: centralConfig.fields.dailyReport,
        attendance: centralConfig.fields.attendance,
        workRecord: centralConfig.fields.workRecord,
        rideLog: centralConfig.fields.rideLog,
        cashBook: centralConfig.fields.cashBook,
        order: centralConfig.fields.order,
        employee: centralConfig.fields.employee,
        vehicle: centralConfig.fields.vehicle,
        material: centralConfig.fields.material,
        machine: centralConfig.fields.machine,
        common: centralConfig.fields.common,
        place: centralConfig.fields.place
    },
    libraries: centralConfig.libraries,
    icons: centralConfig.icons
};

// ==============================================
// AUTO-LINKOVANIE ZÁZNAMOV
// ==============================================

/**
 * Automaticky nájde a nalinkuje záznamy z knižníc s rovnakým dátumom
 * Zabezpečuje, že nedôjde k duplicitnému linkovaniu
 */
function autoLinkRecords(reportDate) {
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

        // Získaj aktuálne linknuté záznamy (aby sme predišli duplicitám)
        var currentAttendance = utils.safeGetLinks(currentEntry, CONFIG.fields.dailyReport.attendance) || [];
        var currentWorkRecords = utils.safeGetLinks(currentEntry, CONFIG.fields.dailyReport.workRecord) || [];
        var currentRideLog = utils.safeGetLinks(currentEntry, CONFIG.fields.dailyReport.rideLog) || [];
        var currentCashBook = utils.safeGetLinks(currentEntry, CONFIG.fields.dailyReport.cashBook) || [];

        // Vytvor mapy ID už linknutých záznamov
        var attendanceIds = {};
        var workRecordIds = {};
        var rideLogIds = {};
        var cashBookIds = {};

        for (var i = 0; i < currentAttendance.length; i++) {
            attendanceIds[currentAttendance[i].field("ID")] = true;
        }
        for (var j = 0; j < currentWorkRecords.length; j++) {
            workRecordIds[currentWorkRecords[j].field("ID")] = true;
        }
        for (var k = 0; k < currentRideLog.length; k++) {
            rideLogIds[currentRideLog[k].field("ID")] = true;
        }
        for (var l = 0; l < currentCashBook.length; l++) {
            cashBookIds[currentCashBook[l].field("ID")] = true;
        }

        // 1. Dochádzka
        var attendanceLib = libByName(CONFIG.libraries.attendance);
        // OPTIMIZATION: entries() returns newest first, limit search to recent records
        var attendanceEntries = attendanceLib.entries();
        var maxRecordsToCheck = 100; // Check only last 100 records (optimization)
        var attendanceCount = Math.min(attendanceEntries.length, maxRecordsToCheck);
        utils.addDebug(currentEntry, "  🔍 Kontrolujem Dochádzku: " + attendanceCount + " posledných záznamov (z " + attendanceEntries.length + ")");

        for (var a = 0; a < attendanceCount; a++) {
            var attEntry = attendanceEntries[a];
            var attDate = utils.safeGet(attEntry, CONFIG.fields.attendance.date);
            var attId = attEntry.field("ID");

            if (attDate && utils.formatDate(attDate) === utils.formatDate(reportDate)) {
                // Skontroluj, či už nie je linknutý
                if (!attendanceIds[attId]) {
                    // Pridaj záznam do existujúcich linkov
                    var currentLinks = currentEntry.field(CONFIG.fields.dailyReport.attendance);
                    currentLinks.push(attEntry);
                    currentEntry.set(CONFIG.fields.dailyReport.attendance, currentLinks);

                    result.linked.attendance++;
                    utils.addDebug(currentEntry, "  ✅ Linknutý záznam Dochádzky #" + attId);

                    // Pridaj ikonu Denného reportu do záznamu Dochádzky
                    addDailyReportIcon(attEntry, "ikony záznamu");
                }
            }
        }

        // 2. Záznam prác
        var workRecordsLib = libByName(CONFIG.libraries.workRecords);
        var workEntries = workRecordsLib.entries();
        var workCount = Math.min(workEntries.length, maxRecordsToCheck);
        utils.addDebug(currentEntry, "  🔍 Kontrolujem Záznam prác: " + workCount + " posledných záznamov (z " + workEntries.length + ")");

        for (var w = 0; w < workCount; w++) {
            var workEntry = workEntries[w];
            var workDate = utils.safeGet(workEntry, CONFIG.fields.workRecord.date);
            var workId = workEntry.field("ID");

            if (workDate && utils.formatDate(workDate) === utils.formatDate(reportDate)) {
                if (!workRecordIds[workId]) {
                    var currentLinks = currentEntry.field(CONFIG.fields.dailyReport.workRecord);
                    currentLinks.push(workEntry);
                    currentEntry.set(CONFIG.fields.dailyReport.workRecord, currentLinks);

                    result.linked.workRecords++;
                    utils.addDebug(currentEntry, "  ✅ Linknutý záznam prác #" + workId);

                    // Pridaj ikonu Denného reportu do Záznamu prác
                    addDailyReportIcon(workEntry, "ikony záznamu");
                }
            }
        }

        // 3. Kniha jázd
        var rideLogLib = libByName(CONFIG.libraries.rideLog);
        var rideEntries = rideLogLib.entries();
        var rideCount = Math.min(rideEntries.length, maxRecordsToCheck);
        utils.addDebug(currentEntry, "  🔍 Kontrolujem Knihu jázd: " + rideCount + " posledných záznamov (z " + rideEntries.length + ")");

        for (var r = 0; r < rideCount; r++) {
            var rideEntry = rideEntries[r];
            var rideDate = utils.safeGet(rideEntry, CONFIG.fields.rideLog.date);
            var rideId = rideEntry.field("ID");

            if (rideDate && utils.formatDate(rideDate) === utils.formatDate(reportDate)) {
                if (!rideLogIds[rideId]) {
                    var currentLinks = currentEntry.field(CONFIG.fields.dailyReport.rideLog);
                    currentLinks.push(rideEntry);
                    currentEntry.set(CONFIG.fields.dailyReport.rideLog, currentLinks);

                    result.linked.rideLog++;
                    utils.addDebug(currentEntry, "  ✅ Linknutý záznam z Knihy jázd #" + rideId);

                    // Pridaj ikonu Denného reportu do Knihy jázd
                    addDailyReportIcon(rideEntry, "ikony záznamu");
                }
            }
        }

        // 4. Pokladňa
        var cashBookLib = libByName(CONFIG.libraries.cashBook);
        var cashEntries = cashBookLib.entries();
        var cashCount = Math.min(cashEntries.length, maxRecordsToCheck);
        utils.addDebug(currentEntry, "  🔍 Kontrolujem Pokladňa: " + cashCount + " posledných záznamov (z " + cashEntries.length + ")");

        for (var c = 0; c < cashCount; c++) {
            var cashEntry = cashEntries[c];
            var cashDate = utils.safeGet(cashEntry, CONFIG.fields.cashBook.date);
            var cashId = cashEntry.field("ID");

            if (cashDate && utils.formatDate(cashDate) === utils.formatDate(reportDate)) {
                if (!cashBookIds[cashId]) {
                    var currentLinks = currentEntry.field(CONFIG.fields.dailyReport.cashBook);
                    currentLinks.push(cashEntry);
                    currentEntry.set(CONFIG.fields.dailyReport.cashBook, currentLinks);

                    result.linked.cashBook++;
                    utils.addDebug(currentEntry, "  ✅ Linknutý záznam z Pokladne #" + cashId);

                    // Pridaj ikonu Denného reportu do Pokladne
                    addDailyReportIcon(cashEntry, "ikony záznamu");
                }
            }
        }

        var totalLinked = result.linked.attendance + result.linked.workRecords + result.linked.rideLog + result.linked.cashBook;
        utils.addDebug(currentEntry, "🔗 AUTO-LINKOVANIE DOKONČENÉ: " + totalLinked + " nových záznamov nalinkovaných");
        utils.addDebug(currentEntry, "  📊 Dochádzka: " + result.linked.attendance + ", Práce: " + result.linked.workRecords + ", Jazdy: " + result.linked.rideLog + ", Pokladňa: " + result.linked.cashBook);

        result.success = true;

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri auto-linkovaní záznamov: " + error.toString(), "autoLinkRecords", error);
    }

    return result;
}

/**
 * Pridá ikonu Denného reportu do nalinkovaného záznamu
 */
function addDailyReportIcon(entry, iconFieldName) {
    try {
        var currentIcons = utils.safeGet(entry, iconFieldName, "");
        var dailyReportIcon = "📊";

        // Skontroluj, či ikona už nie je pridaná
        if (currentIcons.indexOf(dailyReportIcon) === -1) {
            var newIcons = currentIcons ? currentIcons + " " + dailyReportIcon : dailyReportIcon;
            utils.safeSet(entry, iconFieldName, newIcons);
        }
    } catch (error) {
        // Tichá chyba - ikona nie je kritická
        utils.addDebug(currentEntry, "  ⚠️ Nepodarilo sa pridať ikonu do záznamu: " + error.toString());
    }
}

/**
 * Validuje dátumy všetkých linknutých záznamov a unlinkuje tie, ktoré nemajú správny dátum
 */
function validateAndUnlinkInvalidDates(reportDate) {
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

        // Validácia Dochádzky
        var attendanceRecords = utils.safeGetLinks(currentEntry, CONFIG.fields.dailyReport.attendance) || [];
        for (var a = 0; a < attendanceRecords.length; a++) {
            var attDate = utils.safeGet(attendanceRecords[a], CONFIG.fields.attendance.date);
            if (!attDate || utils.formatDate(attDate) !== reportDateStr) {
                var attId = attendanceRecords[a].field("ID");
                currentEntry.unlink(CONFIG.fields.dailyReport.attendance, attendanceRecords[a]);
                result.unlinked.attendance++;
                utils.addDebug(currentEntry, "  ❌ Unlinknutý záznam Dochádzky #" + attId + " (dátum: " + (attDate ? utils.formatDate(attDate) : "CHÝBA") + ")");
            }
        }

        // Validácia Záznamov prác
        var workRecords = utils.safeGetLinks(currentEntry, CONFIG.fields.dailyReport.workRecord) || [];
        for (var w = 0; w < workRecords.length; w++) {
            var workDate = utils.safeGet(workRecords[w], CONFIG.fields.workRecord.date);
            if (!workDate || utils.formatDate(workDate) !== reportDateStr) {
                var workId = workRecords[w].field("ID");
                currentEntry.unlink(CONFIG.fields.dailyReport.workRecord, workRecords[w]);
                result.unlinked.workRecords++;
                utils.addDebug(currentEntry, "  ❌ Unlinknutý záznam Prác #" + workId + " (dátum: " + (workDate ? utils.formatDate(workDate) : "CHÝBA") + ")");
            }
        }

        // Validácia Knihy jázd
        var rideRecords = utils.safeGetLinks(currentEntry, CONFIG.fields.dailyReport.rideLog) || [];
        for (var r = 0; r < rideRecords.length; r++) {
            var rideDate = utils.safeGet(rideRecords[r], CONFIG.fields.rideLog.date);
            if (!rideDate || utils.formatDate(rideDate) !== reportDateStr) {
                var rideId = rideRecords[r].field("ID");
                currentEntry.unlink(CONFIG.fields.dailyReport.rideLog, rideRecords[r]);
                result.unlinked.rideLog++;
                utils.addDebug(currentEntry, "  ❌ Unlinknutý záznam Jazdy #" + rideId + " (dátum: " + (rideDate ? utils.formatDate(rideDate) : "CHÝBA") + ")");
            }
        }

        // Validácia Pokladne
        var cashRecords = utils.safeGetLinks(currentEntry, CONFIG.fields.dailyReport.cashBook) || [];
        for (var c = 0; c < cashRecords.length; c++) {
            var cashDate = utils.safeGet(cashRecords[c], CONFIG.fields.cashBook.date);
            if (!cashDate || utils.formatDate(cashDate) !== reportDateStr) {
                var cashId = cashRecords[c].field("ID");
                currentEntry.unlink(CONFIG.fields.dailyReport.cashBook, cashRecords[c]);
                result.unlinked.cashBook++;
                utils.addDebug(currentEntry, "  ❌ Unlinknutý záznam Pokladne #" + cashId + " (dátum: " + (cashDate ? utils.formatDate(cashDate) : "CHÝBA") + ")");
            }
        }

        var totalUnlinked = result.unlinked.attendance + result.unlinked.workRecords + result.unlinked.rideLog + result.unlinked.cashBook;
        if (totalUnlinked > 0) {
            utils.addDebug(currentEntry, "🔍 VALIDÁCIA DOKONČENÁ: " + totalUnlinked + " záznamov unlinknutých pre nezhodu dátumov");
            utils.addDebug(currentEntry, "  📊 Dochádzka: " + result.unlinked.attendance + ", Práce: " + result.unlinked.workRecords + ", Jazdy: " + result.unlinked.rideLog + ", Pokladňa: " + result.unlinked.cashBook);
        } else {
            utils.addDebug(currentEntry, "✅ Všetky linknuté záznamy majú správny dátum");
        }

        result.success = true;

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri validácii dátumov: " + error.toString(), "validateAndUnlinkInvalidDates", error);
    }

    return result;
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, utils.getIcon("start") + " === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        utils.clearLogs(currentEntry, true);

        // Získaj dátum záznamu
        var reportDate = utils.safeGet(currentEntry, CONFIG.fields.dailyReport.date);
        if (!reportDate) {
            utils.addError(currentEntry, "Dátum nie je vyplnený", "main");
            message("❌ Dátum nie je vyplnený!");
            return false;
        }

        utils.addDebug(currentEntry, "📅 Dátum reportu: " + utils.formatDate(reportDate));

        // Nastav deň v týždni podľa dátumu
        utils.setDayOfWeekField(currentEntry, CONFIG.fields.dailyReport.dayOfWeek, reportDate);
        utils.addDebug(currentEntry, "  📅 Nastavený deň v týždni");

        // KROK 0: Auto-linkovanie záznamov
        utils.addDebug(currentEntry, utils.getIcon("link") + " KROK 0: Auto-linkovanie záznamov");
        var linkingResult = autoLinkRecords(reportDate);

        // KROK 0.5: Validácia dátumov linknutých záznamov
        utils.addDebug(currentEntry, utils.getIcon("warning") + " KROK 0.5: Validácia dátumov");
        var dateValidationResult = validateAndUnlinkInvalidDates(reportDate);

        // KROK 1: Spracovanie Dochádzky
        utils.addDebug(currentEntry, utils.getIcon("calculation") + " KROK 1: Spracovanie Dochádzky");
        var attendanceResult = processAttendance();

        // KROK 2: Spracovanie Záznamov prác
        utils.addDebug(currentEntry, utils.getIcon("calculation") + " KROK 2: Spracovanie Záznamov prác");
        var workRecordsResult = processWorkRecords();

        // KROK 3: Spracovanie Knihy jázd
        utils.addDebug(currentEntry, utils.getIcon("calculation") + " KROK 3: Spracovanie Knihy jázd");
        var rideLogResult = processRideLog();

        // KROK 4: Spracovanie Pokladne
        utils.addDebug(currentEntry, utils.getIcon("calculation") + " KROK 4: Spracovanie Pokladne");
        var cashBookResult = processCashBook();

        // KROK 5: Výpočet celkových hodín
        utils.addDebug(currentEntry, utils.getIcon("calculation") + " KROK 5: Výpočet celkových hodín");
        var totalHoursResult = calculateTotalHours(attendanceResult, workRecordsResult);

        // KROK 6: Kontrola chýbajúcich záznamov a konzistencie
        utils.addDebug(currentEntry, utils.getIcon("warning") + " KROK 6: Kontrola záznamov");
        var validationResult = validateRecords(attendanceResult, workRecordsResult, rideLogResult);

        // KROK 7: Vytvorenie súhrnného popisu
        utils.addDebug(currentEntry, utils.getIcon("note") + " KROK 7: Generovanie popisu záznamu");
        generateRecordDescription(attendanceResult, workRecordsResult, rideLogResult, cashBookResult);

        // KROK 8: Vytvorenie spoločného info záznamu
        utils.addDebug(currentEntry, utils.getIcon("note") + " KROK 8: Vytvorenie spoločného info");
        createCommonInfo(attendanceResult, workRecordsResult, rideLogResult, cashBookResult, totalHoursResult, validationResult);

        // KROK 9: Telegram notifikácie (voliteľné - pripravené na neskoršiu implementáciu)
        utils.addDebug(currentEntry, utils.getIcon("telegram") + " KROK 9: Telegram notifikácie");
        sendTelegramNotifications(attendanceResult, workRecordsResult, rideLogResult, cashBookResult);

        utils.addDebug(currentEntry, utils.getIcon("success") + " === PREPOČET DOKONČENÝ ===");

        // Zhrnutie
        var summary = buildSummary(attendanceResult, workRecordsResult, rideLogResult, cashBookResult, totalHoursResult);
        if (summary) {
            message(summary);
        }

        return true;

    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        message("❌ Kritická chyba!\n\n" + error.toString());
        return false;
    }
}

// ==============================================
// SPRACOVANIE DOCHÁDZKY
// ==============================================

function processAttendance() {
    var result = {
        success: false,
        count: 0,
        totalHours: 0,
        employees: [],
        info: ""
    };

    try {
        // Získaj linknuté záznamy Dochádzky - FRESH READ pre správne hodnoty
        var attendanceRecords = utils.safeGetLinks(currentEntry, CONFIG.fields.dailyReport.attendance);

        if (!attendanceRecords || attendanceRecords.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadne záznamy dochádzky");
            return result;
        }

        utils.addDebug(currentEntry, "  📊 Počet záznamov dochádzky: " + attendanceRecords.length);

        var infoBlocks = [];
        var totalWorked = 0;
        var employeeSet = {};

        // Spracuj každý záznam dochádzky
        for (var i = 0; i < attendanceRecords.length; i++) {
            var attendance = attendanceRecords[i];
            var attId = attendance.field("ID");

            // Získaj dáta
            var employees = utils.safeGetLinks(attendance, CONFIG.fields.attendance.employees);
            var workTime = utils.safeGet(attendance, CONFIG.fields.attendance.workTime, 0);
            var workedHours = utils.safeGet(attendance, CONFIG.fields.attendance.workedHours, 0);
            var arrival = utils.safeGet(attendance, CONFIG.fields.attendance.arrival);
            var departure = utils.safeGet(attendance, CONFIG.fields.attendance.departure);

            // Agreguj zamestnancov
            if (employees && employees.length > 0) {
                for (var j = 0; j < employees.length; j++) {
                    var empName = utils.safeGet(employees[j], CONFIG.fields.employee.nick);
                    if (empName) {
                        employeeSet[empName] = true;
                    }
                }
            }

            totalWorked += workedHours;

            // Vytvor info blok pre tento záznam
            var block = "📋 Dochádzka #" + attId + "\n";
            if (employees && employees.length > 0) {
                var empNames = [];
                for (var k = 0; k < employees.length; k++) {
                    empNames.push(utils.safeGet(employees[k], CONFIG.fields.employee.nick));
                }
                block += "  👥 Zamestnanci: **" + empNames.join(", ") + "**\n";
            }
            if (arrival && departure) {
                block += "  🕐 Pracovný čas: **" + utils.formatTime(arrival) + " - " + utils.formatTime(departure) + "**\n";
            }
            block += "  ⏱️ Pracovná doba: **" + workTime.toFixed(2) + " h**\n";
            block += "  ⏱️ Odpracované: **" + workedHours.toFixed(2) + " h**\n";

            infoBlocks.push(block);
        }

        // Vytvor zjednotený info záznam
        var now = new Date();
        var timestamp = utils.formatDate(now) + " " + utils.formatTime(now);
        var infoText = "\n\n📊 DOCHÁDZKA - ZHRNUTIE: " + timestamp + "\n";
        infoText += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        infoText += "📈 Celkom záznamov: " + attendanceRecords.length + "\n";
        infoText += "⏱️ Celkom odpracovaných hodín: " + totalWorked.toFixed(2) + " h\n";

        var employeeNames = Object.keys(employeeSet);
        if (employeeNames.length > 0) {
            infoText += "👥 Zamestnanci (" + employeeNames.length + "): " + employeeNames.join(", ") + "\n";
        }

        infoText += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        infoText += infoBlocks.join("\n");

        // Ulož info záznam do poľa (markdown formát)
        var markdownInfo = createMarkdownInfo("DOCHÁDZKA", timestamp, [
            { label: "Celkom záznamov", value: attendanceRecords.length },
            { label: "Celkom odpracovaných hodín", value: totalWorked.toFixed(2) + " h" },
            { label: "Zamestnanci (" + employeeNames.length + ")", value: employeeNames.join(", ") }
        ], infoBlocks);

        utils.safeSet(currentEntry, CONFIG.fields.dailyReport.infoAttendance, markdownInfo);
        utils.addRecordIcon(currentEntry, "👥");
        utils.addDebug(currentEntry, "  ✅ Info dochádzka vytvorený a zapísaný (" + attendanceRecords.length + " záznamov)");

        result.success = true;
        result.count = attendanceRecords.length;
        result.totalHours = totalWorked;
        result.employees = employeeNames;
        result.info = infoText;

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri spracovaní dochádzky: " + error.toString(), "processAttendance", error);
    }

    return result;
}

// ==============================================
// SPRACOVANIE ZÁZNAMOV PRÁC
// ==============================================

function processWorkRecords() {
    var result = {
        success: false,
        count: 0,
        totalHours: 0,
        orders: [],
        info: ""
    };

    try {
        // Získaj linknuté záznamy prác
        var workRecords = utils.safeGetLinks(currentEntry, CONFIG.fields.dailyReport.workRecord);

        if (!workRecords || workRecords.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadne záznamy prác");
            return result;
        }

        utils.addDebug(currentEntry, "  📊 Počet záznamov prác: " + workRecords.length);

        var infoBlocks = [];
        var totalWorkedHours = 0;
        var orderSet = {};
        var orderFullNames = {}; // Číslo.Názov pre pole Popis
        var machinesSet = {};
        var materialSet = {};
        var employeeSet = {};

        // Spracuj každý záznam práce
        for (var i = 0; i < workRecords.length; i++) {
            var work = workRecords[i];
            var workId = work.field("ID");

            // Získaj dáta
            var order = utils.safeGetLinks(work, CONFIG.fields.workRecord.order);
            var workedHours = utils.safeGet(work, CONFIG.fields.workRecord.workedHours, 0);
            var description = utils.safeGet(work, CONFIG.fields.workRecord.workDescription, "");
            var employees = utils.safeGetLinks(work, CONFIG.fields.workRecord.employees);
            var machines = utils.safeGetLinks(work, CONFIG.fields.workRecord.machinery);
            var materials = utils.safeGetLinks(work, CONFIG.fields.workRecord.workItems);

            // Agreguj zákazky
            if (order && order.length > 0) {
                var orderName = utils.safeGet(order[0], CONFIG.fields.order.name);
                var orderNumber = utils.safeGet(order[0], CONFIG.fields.order.number, "");
                if (orderName) {
                    orderSet[orderName] = true;
                    // Vytvor formát Číslo.Názov
                    var fullName = orderNumber ? orderNumber + "." + orderName : orderName;
                    orderFullNames[fullName] = true;
                }
            }

            // Agreguj stroje
            if (machines && machines.length > 0) {
                for (var m = 0; m < machines.length; m++) {
                    var machineName = utils.safeGet(machines[m], CONFIG.fields.machine.name);
                    if (machineName) {
                        machinesSet[machineName] = true;
                    }
                }
            }

            // Agreguj materiál (workItems - Práce Položky)
            if (materials && materials.length > 0) {
                for (var mat = 0; mat < materials.length; mat++) {
                    // workItems majú pole "name" alebo "description"
                    var materialName = utils.safeGet(materials[mat], "name") || utils.safeGet(materials[mat], "description", "");
                    if (materialName) {
                        materialSet[materialName] = true;
                    }
                }
            }

            // Agreguj zamestnancov
            if (employees && employees.length > 0) {
                for (var emp = 0; emp < employees.length; emp++) {
                    var empName = utils.safeGet(employees[emp], CONFIG.fields.employee.nick);
                    if (empName) {
                        employeeSet[empName] = true;
                    }
                }
            }

            totalWorkedHours += workedHours;

            // Vytvor info blok pre tento záznam
            var block = "📝 Záznam prác #" + workId + "\n";
            if (order && order.length > 0) {
                var orderNum = utils.safeGet(order[0], CONFIG.fields.order.number, "");
                var orderNm = utils.safeGet(order[0], CONFIG.fields.order.name);
                block += "  🎯 Zákazka: **" + (orderNum ? orderNum + "." : "") + orderNm.trim() + "**\n";
            }
            if (employees && employees.length > 0) {
                var empNames = [];
                for (var e = 0; e < employees.length; e++) {
                    empNames.push(utils.safeGet(employees[e], CONFIG.fields.employee.nick));
                }
                block += "  👥 Zamestnanci: **" + empNames.join(", ") + "**\n";
            }
            if (machines && machines.length > 0) {
                var machNames = [];
                for (var mch = 0; mch < machines.length; mch++) {
                    machNames.push(utils.safeGet(machines[mch], CONFIG.fields.machine.name));
                }
                block += "  🚜 Stroje: **" + machNames.join(", ") + "**\n";
            }
            if (materials && materials.length > 0) {
                var matNames = [];
                for (var mtl = 0; mtl < materials.length; mtl++) {
                    var matName = utils.safeGet(materials[mtl], "name") || utils.safeGet(materials[mtl], "description", "");
                    if (matName) {
                        matNames.push(matName);
                    }
                }
                if (matNames.length > 0) {
                    block += "  📦 Materiál: **" + matNames.join(", ") + "**\n";
                }
            }
            if (description) {
                block += "  🔨 Práce: **" + description.substring(0, 150).trim() + (description.length > 150 ? "..." : "") + "**\n";
            }
            block += "  ⏱️ Odpracované: **" + workedHours.toFixed(2) + " h**\n";

            infoBlocks.push(block);
        }

        // Vytvor zjednotený info záznam
        var now = new Date();
        var timestamp = utils.formatDate(now) + " " + utils.formatTime(now);

        var orderNames = Object.keys(orderSet);
        var machineNames = Object.keys(machinesSet);
        var materialNames = Object.keys(materialSet);
        var employeeNames = Object.keys(employeeSet);

        // Vytvor stats pre markdown
        var stats = [
            { label: "Celkom záznamov", value: workRecords.length },
            { label: "Odpracované hodiny", value: totalWorkedHours.toFixed(2) + " h" }
        ];

        if (employeeNames.length > 0) {
            stats.push({ label: "Zamestnanci (" + employeeNames.length + ")", value: employeeNames.join(", ") });
        }
        if (orderNames.length > 0) {
            stats.push({ label: "Zákazky (" + orderNames.length + ")", value: orderNames.join(", ") });
        }
        if (machineNames.length > 0) {
            stats.push({ label: "Stroje (" + machineNames.length + ")", value: machineNames.join(", ") });
        }
        if (materialNames.length > 0) {
            stats.push({ label: "Materiál (" + materialNames.length + ")", value: materialNames.join(", ") });
        }

        // Ulož info záznam do poľa (markdown formát)
        var markdownInfo = createMarkdownInfo("ZÁZNAMY PRÁC", timestamp, stats, infoBlocks);

        utils.safeSet(currentEntry, CONFIG.fields.dailyReport.infoWorkRecords, markdownInfo);
        utils.addRecordIcon(currentEntry,"🛠️");
        utils.addDebug(currentEntry, "  ✅ Info záznam prác vytvorený a zapísaný (" + workRecords.length + " záznamov)");

        result.success = true;
        result.count = workRecords.length;
        result.totalHours = totalWorkedHours;
        result.employees = employeeNames;
        result.orders = orderNames;
        result.orderFullNames = Object.keys(orderFullNames); // Pre pole Popis
        result.machines = machineNames;
        result.materials = materialNames;
        result.info = markdownInfo;

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri spracovaní záznamov prác: " + error.toString(), "processWorkRecords", error);
    }

    return result;
}

// ==============================================
// SPRACOVANIE KNIHY JÁZD
// ==============================================

function processRideLog() {
    var result = {
        success: false,
        count: 0,
        totalKm: 0,
        vehicles: [],
        info: ""
    };

    try {
        // Získaj linknuté záznamy z Knihy jázd
        var rideRecords = utils.safeGetLinks(currentEntry, CONFIG.fields.dailyReport.rideLog);

        if (!rideRecords || rideRecords.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadne záznamy z knihy jázd");
            return result;
        }

        utils.addDebug(currentEntry, "  📊 Počet záznamov z knihy jázd: " + rideRecords.length);

        var infoBlocks = [];
        var totalKm = 0;
        var vehicleSet = {};
        var crewSet = {};

        // Spracuj každý záznam z knihy jázd
        for (var i = 0; i < rideRecords.length; i++) {
            var ride = rideRecords[i];
            var rideId = ride.field("ID");

            // Získaj dáta
            var vehicle = utils.safeGetLinks(ride, CONFIG.fields.rideLog.vehicle);
            var km = utils.safeGet(ride, CONFIG.fields.rideLog.km, 0);
            var route = utils.safeGet(ride, CONFIG.fields.rideLog.route, "");
            var crew = utils.safeGetLinks(ride, "Posádka");
            var start = utils.safeGetLinks(ride, CONFIG.fields.rideLog.start);
            var stops = utils.safeGetLinks(ride, CONFIG.fields.rideLog.stops);
            var destination = utils.safeGetLinks(ride, CONFIG.fields.rideLog.destination);

            // Agreguj vozidlá
            if (vehicle && vehicle.length > 0) {
                var vehicleName = utils.safeGet(vehicle[0], CONFIG.fields.vehicle.name);
                if (vehicleName) {
                    vehicleSet[vehicleName] = true;
                }
            }

            // Agreguj posádku
            if (crew && crew.length > 0) {
                for (var cr = 0; cr < crew.length; cr++) {
                    var crewName = utils.safeGet(crew[cr], CONFIG.fields.employee.nick);
                    if (crewName) {
                        crewSet[crewName] = true;
                    }
                }
            }

            totalKm += km;

            // Vytvor info blok pre tento záznam
            var block = "🚗 Kniha jázd #" + rideId + "\n";
            if (vehicle && vehicle.length > 0) {
                block += "  🚙 Vozidlo: **" + utils.safeGet(vehicle[0], CONFIG.fields.vehicle.name) + "**\n";
            }
            if (crew && crew.length > 0) {
                var crewNames = [];
                for (var cn = 0; cn < crew.length; cn++) {
                    crewNames.push(utils.safeGet(crew[cn], CONFIG.fields.employee.nick));
                }
                block += "  👥 Posádka: **" + crewNames.join(", ") + "**\n";
            }

            // Formátuj trasu: 1. Štart, 2. Zástavka - km, 3. Cieľ - km
            if (start || stops || destination) {
                var routeParts = [];
                var stepNum = 1;

                if (start && start.length > 0) {
                    var startName = utils.safeGet(start[0], CONFIG.fields.place.name) || utils.safeGet(start[0], CONFIG.fields.place.nick, "");
                    if (startName) {
                        routeParts.push(stepNum + ". " + startName);
                        stepNum++;
                    }
                }

                if (stops && stops.length > 0) {
                    for (var st = 0; st < stops.length; st++) {
                        var stopName = utils.safeGet(stops[st], CONFIG.fields.place.name) || utils.safeGet(stops[st], CONFIG.fields.place.nick, "");
                        if (stopName) {
                            // Predpokladáme, že km sú rozdelené rovnomerne alebo použijeme celkové km
                            routeParts.push(stepNum + ". " + stopName);
                            stepNum++;
                        }
                    }
                }

                if (destination && destination.length > 0) {
                    var destName = utils.safeGet(destination[0], CONFIG.fields.place.name) || utils.safeGet(destination[0], CONFIG.fields.place.nick, "");
                    if (destName) {
                        routeParts.push(stepNum + ". " + destName + " - " + km.toFixed(2) + " km");
                    }
                }

                if (routeParts.length > 0) {
                    block += "  📍 Trasa: **" + routeParts.join(", ") + "**\n";
                }
            } else if (route) {
                block += "  📍 Trasa: **" + route.substring(0, 100) + (route.length > 100 ? "..." : "") + "**\n";
            }

            block += "  📏 Celkom: **" + km.toFixed(2) + " km**\n";

            infoBlocks.push(block);
        }

        // Vytvor zjednotený info záznam
        var now = new Date();
        var timestamp = utils.formatDate(now) + " " + utils.formatTime(now);

        var vehicleNames = Object.keys(vehicleSet);
        var crewNames = Object.keys(crewSet);

        // Vytvor stats pre markdown
        var stats = [
            { label: "Celkom záznamov", value: rideRecords.length },
            { label: "Celkom km", value: totalKm.toFixed(2) + " km" }
        ];

        if (vehicleNames.length > 0) {
            stats.push({ label: "Vozidlá (" + vehicleNames.length + ")", value: vehicleNames.join(", ") });
        }
        if (crewNames.length > 0) {
            stats.push({ label: "Posádka (" + crewNames.length + ")", value: crewNames.join(", ") });
        }

        // Ulož info záznam do poľa (markdown formát)
        var markdownInfo = createMarkdownInfo("KNIHA JÁZD", timestamp, stats, infoBlocks);

        utils.safeSet(currentEntry, CONFIG.fields.dailyReport.infoRideLog, markdownInfo);
        utils.addRecordIcon(currentEntry, "🚗");
        utils.addDebug(currentEntry, "  ✅ Info kniha jázd vytvorený a zapísaný (" + rideRecords.length + " záznamov)");

        result.success = true;
        result.count = rideRecords.length;
        result.totalKm = totalKm;
        result.vehicles = vehicleNames;
        result.crew = crewNames;
        result.info = markdownInfo;

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri spracovaní knihy jázd: " + error.toString(), "processRideLog", error);
    }

    return result;
}

// ==============================================
// SPRACOVANIE POKLADNE
// ==============================================

function processCashBook() {
    var result = {
        success: false,
        count: 0,
        totalIncome: 0,
        totalExpense: 0,
        info: ""
    };

    try {
        // Získaj linknuté záznamy z Pokladne
        var cashRecords = utils.safeGetLinks(currentEntry, CONFIG.fields.dailyReport.cashBook);

        if (!cashRecords || cashRecords.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadne záznamy z pokladne");
            return result;
        }

        utils.addDebug(currentEntry, "  📊 Počet záznamov z pokladne: " + cashRecords.length);

        var infoBlocks = [];
        var totalIncome = 0;
        var totalExpense = 0;

        // Spracuj každý záznam z pokladne
        for (var i = 0; i < cashRecords.length; i++) {
            var cash = cashRecords[i];
            var cashId = cash.field("ID");

            // Získaj dáta
            var transactionType = utils.safeGet(cash, CONFIG.fields.cashBook.transactionType, "");
            var sumTotal = utils.safeGet(cash, CONFIG.fields.cashBook.sumTotal, 0);
            var sum = utils.safeGet(cash, CONFIG.fields.cashBook.sum, 0);
            var description = utils.safeGet(cash, CONFIG.fields.cashBook.description, "");

            // Debug: zobraz hodnoty
            utils.addDebug(currentEntry, "  🔍 Pokladňa #" + cashId + ": Typ=" + transactionType + ", sumTotal=" + sumTotal + ", sum=" + sum);

            // Konvertuj na čísla ak sú stringy
            if (typeof sumTotal === "string") {
                sumTotal = parseFloat(sumTotal) || 0;
            }
            if (typeof sum === "string") {
                sum = parseFloat(sum) || 0;
            }

            // Použij sumTotal ak existuje, inak sum
            var amount = (sumTotal !== null && sumTotal !== undefined && sumTotal !== 0) ? sumTotal : sum;

            // Agreguj príjmy a výdavky podľa typu pohybu
            if (transactionType === "Príjem") {
                totalIncome += amount;
            } else if (transactionType === "Výdaj" || transactionType === "Výdavok") {
                totalExpense += amount;
            }
            // PP (Priebežná položka) sa nezapočítava do príjmov ani výdavkov

            utils.addDebug(currentEntry, "  💰 Amount=" + amount + ", totalIncome=" + totalIncome + ", totalExpense=" + totalExpense);

            // Vytvor info blok pre tento záznam
            var block = "💰 Pokladňa #" + cashId + "\n";
            block += "  📊 Typ: **" + transactionType + "**\n";
            block += "  💵 Suma: **" + amount.toFixed(2) + " €**\n";
            if (description) {
                block += "  📋 Popis: **" + description.substring(0, 100) + (description.length > 100 ? "..." : "") + "**\n";
            }

            infoBlocks.push(block);
        }

        // Vytvor zjednotený info záznam
        var now = new Date();
        var timestamp = utils.formatDate(now) + " " + utils.formatTime(now);
        var infoText = "\n\n💰 POKLADŇA - ZHRNUTIE: " + timestamp + "\n";
        infoText += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        infoText += "📈 Celkom záznamov: " + cashRecords.length + "\n";
        infoText += "📈 Príjmy: +" + totalIncome.toFixed(2) + " €\n";
        infoText += "📉 Výdavky: -" + totalExpense.toFixed(2) + " €\n";
        infoText += "💰 Bilancia: " + (totalIncome - totalExpense).toFixed(2) + " €\n";
        infoText += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        infoText += infoBlocks.join("\n");

        // Ulož info záznam do poľa (markdown formát)
        var markdownInfo = createMarkdownInfo("POKLADŇA", timestamp, [
            { label: "Celkom záznamov", value: cashRecords.length },
            { label: "Príjmy", value: "+" + totalIncome.toFixed(2) + " €" },
            { label: "Výdavky", value: "-" + totalExpense.toFixed(2) + " €" },
            { label: "Bilancia", value: (totalIncome - totalExpense).toFixed(2) + " €" }
        ], infoBlocks);

        utils.safeSet(currentEntry, CONFIG.fields.dailyReport.infoCashBook, markdownInfo);
        utils.addRecordIcon(currentEntry, "💰");
        utils.addDebug(currentEntry, "  ✅ Info pokladňa vytvorený a zapísaný (" + cashRecords.length + " záznamov)");

        result.success = true;
        result.count = cashRecords.length;
        result.totalIncome = totalIncome;
        result.totalExpense = totalExpense;
        result.info = infoText;

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri spracovaní pokladne: " + error.toString(), "processCashBook", error);
    }

    return result;
}

// ==============================================
// VÝPOČET CELKOVÝCH HODÍN
// ==============================================

function calculateTotalHours(attendanceResult, workRecordsResult) {
    var result = {
        success: false,
        totalHours: 0
    };

    try {
        // Súčet z dochádzky a záznamov prác
        var totalFromAttendance = attendanceResult.totalHours || 0;
        var totalFromWork = workRecordsResult.totalHours || 0;

        // Použij maximum (v prípade, že sú oba hodnoty vyplnené)
        var totalHours = Math.max(totalFromAttendance, totalFromWork);

        // Ak sú obe hodnoty 0, skús súčet
        if (totalHours === 0) {
            totalHours = totalFromAttendance + totalFromWork;
        }

        utils.addDebug(currentEntry, "  ⏱️ Celkové odpracované hodiny: " + totalHours.toFixed(2) + " h");

        // Ulož do poľa
        utils.safeSet(currentEntry, CONFIG.fields.dailyReport.hoursWorked, totalHours);

        result.success = true;
        result.totalHours = totalHours;

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri výpočte celkových hodín: " + error.toString(), "calculateTotalHours", error);
    }

    return result;
}

// ==============================================
// VALIDÁCIA ZÁZNAMOV
// ==============================================

function validateRecords(attendanceResult, workRecordsResult, rideLogResult) {
    var result = {
        success: true,
        warnings: [],
        errors: [],
        employeeConsistency: true
    };

    try {
        // Kontrola povinných sekcií
        if (attendanceResult.count === 0) {
            result.warnings.push("⚠️ Chybuje záznam Dochádzky");
            utils.addDebug(currentEntry, "  ⚠️ UPOZORNENIE: Chybuje záznam Dochádzky");
        }

        if (workRecordsResult.count === 0) {
            result.warnings.push("⚠️ Chybuje záznam Prác");
            utils.addDebug(currentEntry, "  ⚠️ UPOZORNENIE: Chybuje záznam Prác");
        }

        if (rideLogResult.count === 0) {
            result.warnings.push("⚠️ Chybuje záznam z Knihy jázd");
            utils.addDebug(currentEntry, "  ⚠️ UPOZORNENIE: Chybuje záznam z Knihy jázd");
        }

        // Kontrola konzistencie zamestnancov medzi Dochádzkou, Záznamami prác a Knihou jázd
        if (attendanceResult.count > 0) {
            var attendanceEmployees = attendanceResult.employees || [];
            var attendanceSet = {};
            for (var ae = 0; ae < attendanceEmployees.length; ae++) {
                attendanceSet[attendanceEmployees[ae]] = true;
            }

            // Získaj zamestnancov zo Záznamov prác
            var workRecordEmployees = {};
            if (workRecordsResult.count > 0) {
                var workRecords = utils.safeGetLinks(currentEntry, CONFIG.fields.dailyReport.workRecord);
                if (workRecords && workRecords.length > 0) {
                    for (var i = 0; i < workRecords.length; i++) {
                        var employees = utils.safeGetLinks(workRecords[i], CONFIG.fields.workRecord.employees);
                        if (employees && employees.length > 0) {
                            for (var j = 0; j < employees.length; j++) {
                                var empName = utils.safeGet(employees[j], CONFIG.fields.employee.nick);
                                if (empName) {
                                    workRecordEmployees[empName] = true;
                                }
                            }
                        }
                    }
                }
            }

            // Získaj zamestnancov z Knihy jázd (Posádka)
            var rideLogEmployees = {};
            if (rideLogResult.count > 0) {
                var rideRecords = utils.safeGetLinks(currentEntry, CONFIG.fields.dailyReport.rideLog);
                if (rideRecords && rideRecords.length > 0) {
                    for (var r = 0; r < rideRecords.length; r++) {
                        // Získaj posádku (všetci zamestnanci v jazde)
                        var crew = utils.safeGetLinks(rideRecords[r], "Posádka");
                        if (crew && crew.length > 0) {
                            for (var c = 0; c < crew.length; c++) {
                                var crewName = utils.safeGet(crew[c], CONFIG.fields.employee.nick);
                                if (crewName) {
                                    rideLogEmployees[crewName] = true;
                                }
                            }
                        }
                    }
                }
            }

            var workEmployeeNames = Object.keys(workRecordEmployees);
            var rideEmployeeNames = Object.keys(rideLogEmployees);

            // Kontrola zhody zamestnancov - musíme urobiť pred kontrolou počtu, aby sme mali mená
            var missingInWork = [];
            var extraInWork = [];
            var missingInRides = [];
            var extraInRides = [];

            // Porovnaj Dochádzku a Záznamy prác
            if (workRecordsResult.count > 0) {
                for (var a1 = 0; a1 < attendanceEmployees.length; a1++) {
                    if (!workRecordEmployees[attendanceEmployees[a1]]) {
                        missingInWork.push(attendanceEmployees[a1]);
                    }
                }
                for (var w = 0; w < workEmployeeNames.length; w++) {
                    if (!attendanceSet[workEmployeeNames[w]]) {
                        extraInWork.push(workEmployeeNames[w]);
                    }
                }
            }

            // Porovnaj Dochádzku a Knihu jázd
            if (rideLogResult.count > 0) {
                for (var a2 = 0; a2 < attendanceEmployees.length; a2++) {
                    if (!rideLogEmployees[attendanceEmployees[a2]]) {
                        missingInRides.push(attendanceEmployees[a2]);
                    }
                }
                for (var rl = 0; rl < rideEmployeeNames.length; rl++) {
                    if (!attendanceSet[rideEmployeeNames[rl]]) {
                        extraInRides.push(rideEmployeeNames[rl]);
                    }
                }
            }

            // Kontrola počtu zamestnancov s menami chýbajúcich
            var countMismatch = false;
            if (workRecordsResult.count > 0 && attendanceEmployees.length !== workEmployeeNames.length) {
                var countMsg = "❌ Počet zamestnancov sa nezhoduje: Dochádzka (" + attendanceEmployees.length + ") ≠ Záznamy prác (" + workEmployeeNames.length + ")";
                if (missingInWork.length > 0) {
                    countMsg += " | Chýbajú v Prácach: " + missingInWork.join(", ");
                }
                if (extraInWork.length > 0) {
                    countMsg += " | Navyše v Prácach: " + extraInWork.join(", ");
                }
                result.warnings.push(countMsg);
                result.employeeConsistency = false;
                countMismatch = true;
                utils.addDebug(currentEntry, "  " + countMsg);
            }

            if (rideLogResult.count > 0 && attendanceEmployees.length !== rideEmployeeNames.length) {
                var countMsg2 = "❌ Počet zamestnancov sa nezhoduje: Dochádzka (" + attendanceEmployees.length + ") ≠ Kniha jázd (" + rideEmployeeNames.length + ")";
                if (missingInRides.length > 0) {
                    countMsg2 += " | Chýbajú v Jazdách: " + missingInRides.join(", ");
                }
                if (extraInRides.length > 0) {
                    countMsg2 += " | Navyše v Jazdách: " + extraInRides.join(", ");
                }
                result.warnings.push(countMsg2);
                result.employeeConsistency = false;
                countMismatch = true;
                utils.addDebug(currentEntry, "  " + countMsg2);
            }

            // Hlásenia o nezhodách (len ak počty sedia, ale zamestnanci sa nezhodujú)
            if (!countMismatch) {
                if (missingInWork.length > 0) {
                    var msg = "❌ Zamestnanci z Dochádzky chýbajú v Záznamoch prác: " + missingInWork.join(", ");
                    result.warnings.push(msg);
                    result.employeeConsistency = false;
                    utils.addDebug(currentEntry, "  " + msg);
                }

                if (extraInWork.length > 0) {
                    var msg1 = "❌ Zamestnanci v Záznamoch prác, ktorí nie sú v Dochádzke: " + extraInWork.join(", ");
                    result.warnings.push(msg1);
                    result.employeeConsistency = false;
                    utils.addDebug(currentEntry, "  " + msg1);
                }

                if (missingInRides.length > 0) {
                    var msg3 = "❌ Zamestnanci z Dochádzky chýbajú v Knihe jázd: " + missingInRides.join(", ");
                    result.warnings.push(msg3);
                    result.employeeConsistency = false;
                    utils.addDebug(currentEntry, "  " + msg3);
                }

                if (extraInRides.length > 0) {
                    var msg4 = "❌ Zamestnanci v Knihe jázd, ktorí nie sú v Dochádzke: " + extraInRides.join(", ");
                    result.warnings.push(msg4);
                    result.employeeConsistency = false;
                    utils.addDebug(currentEntry, "  " + msg4);
                }
            }

            if (result.employeeConsistency && !countMismatch) {
                utils.addDebug(currentEntry, "  ✅ Zamestnanci sú konzistentní vo všetkých záznamoch");
            }
        }

        // Kontrola kapacity vozidiel vs. počtu zamestnancov
        if (attendanceResult.count > 0 && rideLogResult.count > 0) {
            var totalEmployees = attendanceResult.employees ? attendanceResult.employees.length : 0;
            var totalSeats = 0;
            var vehicleSeatsInfo = [];

            // Získaj záznamy z Knihy jázd
            var rideRecords = utils.safeGetLinks(currentEntry, CONFIG.fields.dailyReport.rideLog);
            if (rideRecords && rideRecords.length > 0) {
                for (var vr = 0; vr < rideRecords.length; vr++) {
                    var vehicle = utils.safeGetLinks(rideRecords[vr], CONFIG.fields.rideLog.vehicle);
                    if (vehicle && vehicle.length > 0) {
                        var seats = utils.safeGet(vehicle[0], CONFIG.fields.vehicle.seats, 0);
                        var vehicleName = utils.safeGet(vehicle[0], CONFIG.fields.vehicle.name);
                        if (seats > 0) {
                            totalSeats += seats;
                            vehicleSeatsInfo.push(vehicleName + " (" + seats + " miest)");
                        }
                    }
                }
            }

            // Kontrola, či je dostatok miest
            if (totalSeats > 0 && totalEmployees > totalSeats) {
                var seatsMsg = "⚠️ Nedostatok miest vo vozidlách: " + totalEmployees + " zamestnancov, ale len " + totalSeats + " miest";
                if (vehicleSeatsInfo.length > 0) {
                    seatsMsg += " | Vozidlá: " + vehicleSeatsInfo.join(", ");
                }
                seatsMsg += " | Pravdepodobne chýba záznam jazdy";
                result.warnings.push(seatsMsg);
                utils.addDebug(currentEntry, "  " + seatsMsg);
            } else if (totalSeats > 0) {
                utils.addDebug(currentEntry, "  ✅ Kapacita vozidiel je dostatočná: " + totalSeats + " miest pre " + totalEmployees + " zamestnancov");
            }
        }

        if (result.warnings.length === 0) {
            utils.addDebug(currentEntry, "  ✅ Všetky povinné záznamy sú prítomné");
        }

        result.success = true;

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri validácii záznamov: " + error.toString(), "validateRecords", error);
    }

    return result;
}

// ==============================================
// GENEROVANIE POPISU ZÁZNAMU
// ==============================================

function generateRecordDescription(attendanceResult, workRecordsResult, rideLogResult, cashBookResult) {
    var result = {
        success: false,
        description: ""
    };

    try {
        // Pole Popis - vyplň zákazkami vo formáte Číslo.Názov
        var orderDescription = "";
        if (workRecordsResult.orderFullNames && workRecordsResult.orderFullNames.length > 0) {
            orderDescription = workRecordsResult.orderFullNames.join(", ");
            utils.safeSet(currentEntry, CONFIG.fields.dailyReport.description, orderDescription);
            utils.addDebug(currentEntry, "  ✅ Popis (zákazky): " + orderDescription);
        }

        // Pole Popis záznamu - markdown formát
        var descParts = [];

        // Dochádzka
        if (attendanceResult.count > 0) {
            var attText = "**👥 Dochádzka** (" + attendanceResult.count + ")";
            if (attendanceResult.employees.length > 0) {
                attText += ": " + attendanceResult.employees.join(", ");
            }
            descParts.push(attText);
        }

        // Záznamy prác
        if (workRecordsResult.count > 0) {
            var workText = "**📝 Práce** (" + workRecordsResult.count + ")";
            if (workRecordsResult.orders.length > 0) {
                workText += ": " + workRecordsResult.orders.join(", ");
            }
            descParts.push(workText);
        }

        // Kniha jázd
        if (rideLogResult.count > 0) {
            var rideText = "**🚗 Jazdy** (" + rideLogResult.count + ")";
            if (rideLogResult.vehicles.length > 0) {
                rideText += ": " + rideLogResult.vehicles.join(", ");
            }
            descParts.push(rideText);
        }

        // Pokladňa
        if (cashBookResult.count > 0) {
            descParts.push("**💰 Pokladňa** (" + cashBookResult.count + ")");
        }

        var description = descParts.join("  \n");

        if (description) {
            utils.addDebug(currentEntry, "  ✅ Popis záznamu vytvorený");
            utils.safeSet(currentEntry, CONFIG.fields.dailyReport.recordDescription, description);
        }

        result.success = true;
        result.description = description;

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri generovaní popisu: " + error.toString(), "generateRecordDescription", error);
    }

    return result;
}

// ==============================================
// SPÄTNÉ LINKOVANIE
// ==============================================
// TODO: Implementácia spätných linkov bude pridaná neskôr
// Po overení správnosti výpočtov a agregácií

// ==============================================
// TELEGRAM NOTIFIKÁCIE
// ==============================================

function sendTelegramNotifications(attendanceResult, workRecordsResult, rideLogResult, cashBookResult) {
    var result = {
        success: false,
        sent: 0
    };

    try {
        // Kontrola, či je MementoTelegram dostupný
        if (typeof telegram === 'undefined' || !telegram) {
            utils.addDebug(currentEntry, "  ℹ️ MementoTelegram nie je dostupný - preskakujem notifikácie");
            return result;
        }

        // TODO: Implementácia Telegram notifikácií
        // - Získať nastavenia notifikácií z ASISTANTO Defaults
        // - Vytvoriť formátovanú správu
        // - Odoslať cez MementoTelegram

        utils.addDebug(currentEntry, "  ℹ️ Telegram notifikácie - pripravené na implementáciu");

        result.success = true;

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri odosielaní Telegram notifikácií: " + error.toString(), "sendTelegramNotifications", error);
    }

    return result;
}

// ==============================================
// SPOLOČNÝ INFO ZÁZNAM
// ==============================================

function createCommonInfo(attendanceResult, workRecordsResult, rideLogResult, cashBookResult, totalHoursResult, validationResult) {
    var result = {
        success: false
    };

    try {
        var now = new Date();
        var timestamp = utils.formatDate(now) + " " + utils.formatTime(now);

        // Hlavička
        var info = "## 📊 DENNÝ REPORT - ZHRNUTIE\n\n";
        info += "**Dátum:** " + utils.formatDate(utils.safeGet(currentEntry, CONFIG.fields.dailyReport.date)) + "  \n";
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

            if (hoursDiff > 0) {
                // Prestoje: Dochádzka má viac hodín ako Práce
                info += "## ⏸️ Prestoje\n\n";
                info += "- **Prestoj:** " + hoursDiff.toFixed(2) + " h\n";
                info += "- **Dochádzka:** " + attendanceHours.toFixed(2) + " h\n";
                info += "- **Práce:** " + workHours.toFixed(2) + " h\n";
                info += "- ⚠️ Zamestnanci boli prítomní, ale nevykonávali práce\n\n";
                utils.addRecordIcon(currentEntry, "⏸️");
            } else if (hoursDiff < 0) {
                // Chyba: Práce majú viac hodín ako Dochádzka - treba skontrolovať
                info += "## ⚠️ Skontrolovať a opraviť\n\n";
                info += "- **Nezhoda hodín:** " + Math.abs(hoursDiff).toFixed(2) + " h\n";
                info += "- **Dochádzka:** " + attendanceHours.toFixed(2) + " h\n";
                info += "- **Práce:** " + workHours.toFixed(2) + " h\n";
                info += "- ❌ Práce majú viac hodín ako Dochádzka - skontrolujte a opravte\n\n";
                utils.addRecordIcon(currentEntry, "⚠️");
            } else {
                // Hodiny sa zhodujú - odstráň ikonu prestojov ak existuje
                utils.removeRecordIcon(currentEntry, "⏸️");
            }
        } else {
            // Ak nie sú záznamy, odstráň ikonu prestojov
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
        utils.safeSet(currentEntry, CONFIG.fields.common.info, info);
        utils.addDebug(currentEntry, "  ✅ Spoločný info záznam vytvorený a zapísaný");

        result.success = true;

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri vytváraní spoločného info: " + error.toString(), "createCommonInfo", error);
    }

    return result;
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================


/**
 * Vytvorí markdown formátovaný info záznam
 */
function createMarkdownInfo(title, timestamp, stats, detailBlocks) {
    var info = "\n\n## 📊 " + title + " - ZHRNUTIE\n\n";
    //info += "**Aktualizované:** " + timestamp + "\n\n";

    // Štatistiky
    for (var i = 0; i < stats.length; i++) {
        var stat = stats[i];
        info += "- **" + stat.label + ":** " + stat.value + "\n";
    }

    info += "\n---\n\n";

    // Detailné bloky (ak existujú)
    if (detailBlocks && detailBlocks.length > 0) {
        for (var j = 0; j < detailBlocks.length; j++) {
            // Konvertuj emoji bloky na markdown
            var block = detailBlocks[j];
            // Odstráň úvodné emoji a nahraď bold markdown
            block = block.replace(/^(📋|📝|🚗|💰)\s+/, "### ");
            block = block.replace(/^\s+/gm, ""); // Odstráň indentáciu
            info += block + "\n\n";
        }
    }

    return info;
}

function buildSummary(attendanceResult, workRecordsResult, rideLogResult, cashBookResult, totalHoursResult) {
    var lines = [];

    lines.push("✅ Denný report spracovaný:\n");

    if (attendanceResult.count > 0) {
        lines.push("👥 Dochádzka: " + attendanceResult.count + " záznamov, " + attendanceResult.totalHours.toFixed(2) + " h");
    }

    if (workRecordsResult.count > 0) {
        lines.push("📝 Práce: " + workRecordsResult.count + " záznamov, " + workRecordsResult.totalHours.toFixed(2) + " h");
    }

    if (rideLogResult.count > 0) {
        lines.push("🚗 Jazdy: " + rideLogResult.count + " záznamov, " + rideLogResult.totalKm.toFixed(2) + " km");
    }

    if (cashBookResult.count > 0) {
        var balance = cashBookResult.totalIncome - cashBookResult.totalExpense;
        lines.push("💰 Pokladňa: " + cashBookResult.count + " záznamov, bilancia " + balance.toFixed(2) + " €");
    }

    if (totalHoursResult.totalHours > 0) {
        lines.push("\n⏱️ Celkové hodiny: " + totalHoursResult.totalHours.toFixed(2) + " h");
    }

    return lines.join("\n");
}

// ==============================================
// SPUSTENIE
// ==============================================

main();
