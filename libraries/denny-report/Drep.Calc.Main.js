// ==============================================
// MEMENTO DATABASE - DENNÝ REPORT PREPOČET
// Verzia: 1.0.1 | Dátum: október 2025 | Autor: ASISTANTO
// Knižnica: Denný report | Trigger: Before Save
// ==============================================
// ✅ FUNKCIONALITA v1.0.1:
//    - Agregácia dát z Dochádzky, Záznamov prác, Knihy jázd a Pokladne
//    - Vytváranie Info záznamov pre každú sekciu (len v Debug logu)
//    - Výpočet celkových odpracovaných hodín
//    - Výpočet celkových km, príjmov a výdavkov
//    - Generovanie popisu záznamu
//    - Príprava na integráciu s MementoTelegram a MementoAI
// 🔧 CHANGELOG v1.0.1:
//    - Opravené formatovanie času (formatDate + formatTime namiesto formatDateTime)
//    - Odstránené zapisovanie do polí (len debug výstupy)
//    - Odstránené spätné linkovanie (pripravené na neskoršiu implementáciu)
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
    version: "1.0.1",

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
        machine: centralConfig.fields.machines,
        common: centralConfig.fields.common
    },
    libraries: centralConfig.libraries,
    icons: centralConfig.icons
};

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

        // KROK 6: Vytvorenie súhrnného popisu
        utils.addDebug(currentEntry, utils.getIcon("note") + " KROK 6: Generovanie popisu záznamu");
        var descriptionResult = generateRecordDescription(attendanceResult, workRecordsResult, rideLogResult, cashBookResult);

        // KROK 7: Telegram notifikácie (voliteľné - pripravené na neskoršiu implementáciu)
        utils.addDebug(currentEntry, utils.getIcon("telegram") + " KROK 7: Telegram notifikácie");
        var telegramResult = sendTelegramNotifications(attendanceResult, workRecordsResult, rideLogResult, cashBookResult);

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
        // Získaj linknuté záznamy Dochádzky
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
                block += "  👥 Zamestnanci: " + empNames.join(", ") + "\n";
            }
            if (arrival) {
                block += "  🕐 Príchod: " + utils.formatTime(arrival) + "\n";
            }
            if (departure) {
                block += "  🕑 Odchod: " + utils.formatTime(departure) + "\n";
            }
            block += "  ⏱️ Odpracované: " + workedHours.toFixed(2) + " h\n";

            infoBlocks.push(block);
        }

        // Vytvor zjednotený info záznam
        var now = new Date();
        var timestamp = utils.formatDate(now) + " " + utils.formatTime(now);
        var infoText = "\n📊 DOCHÁDZKA - ZHRNUTIE: " + timestamp + "\n";
        infoText += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        infoText += "📈 Celkom záznamov: " + attendanceRecords.length + "\n";
        infoText += "⏱️ Celkom odpracovaných hodín: " + totalWorked.toFixed(2) + " h\n";

        var employeeNames = Object.keys(employeeSet);
        if (employeeNames.length > 0) {
            infoText += "👥 Zamestnanci (" + employeeNames.length + "): " + employeeNames.join(", ") + "\n";
        }

        infoText += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        infoText += infoBlocks.join("\n");

        // Ulož info záznam (len do logu, zatiaľ nezapisuj do poľa)
        utils.addDebug(currentEntry, "  📊 INFO DOCHÁDZKA:\n" + infoText);
        utils.addDebug(currentEntry, "  ✅ Info dochádzka vytvorený (" + attendanceRecords.length + " záznamov)");

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
        var totalHours = 0;
        var orderSet = {};

        // Spracuj každý záznam práce
        for (var i = 0; i < workRecords.length; i++) {
            var work = workRecords[i];
            var workId = work.field("ID");

            // Získaj dáta
            var order = utils.safeGetLinks(work, CONFIG.fields.workRecord.order);
            var hours = utils.safeGet(work, CONFIG.fields.workRecord.hours, 0);
            var description = utils.safeGet(work, CONFIG.fields.workRecord.workDescription, "");
            var employee = utils.safeGetLinks(work, CONFIG.fields.workRecord.employee);

            // Agreguj zákazky
            if (order && order.length > 0) {
                var orderName = utils.safeGet(order[0], CONFIG.fields.order.name);
                if (orderName) {
                    orderSet[orderName] = true;
                }
            }

            totalHours += hours;

            // Vytvor info blok pre tento záznam
            var block = "📝 Záznam prác #" + workId + "\n";
            if (order && order.length > 0) {
                block += "  🎯 Zákazka: " + utils.safeGet(order[0], CONFIG.fields.order.name) + "\n";
            }
            if (employee && employee.length > 0) {
                block += "  👤 Zamestnanec: " + utils.safeGet(employee[0], CONFIG.fields.employee.nick) + "\n";
            }
            if (description) {
                block += "  📋 Popis: " + description.substring(0, 100) + (description.length > 100 ? "..." : "") + "\n";
            }
            block += "  ⏱️ Hodiny: " + hours.toFixed(2) + " h\n";

            infoBlocks.push(block);
        }

        // Vytvor zjednotený info záznam
        var now = new Date();
        var timestamp = utils.formatDate(now) + " " + utils.formatTime(now);
        var infoText = "\n📝 ZÁZNAMY PRÁC - ZHRNUTIE: " + timestamp + "\n";
        infoText += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        infoText += "📈 Celkom záznamov: " + workRecords.length + "\n";
        infoText += "⏱️ Celkom hodín: " + totalHours.toFixed(2) + " h\n";

        var orderNames = Object.keys(orderSet);
        if (orderNames.length > 0) {
            infoText += "🎯 Zákazky (" + orderNames.length + "): " + orderNames.join(", ") + "\n";
        }

        infoText += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        infoText += infoBlocks.join("\n");

        // Ulož info záznam (len do logu, zatiaľ nezapisuj do poľa)
        utils.addDebug(currentEntry, "  📊 INFO ZÁZNAM PRÁC:\n" + infoText);
        utils.addDebug(currentEntry, "  ✅ Info záznam prác vytvorený (" + workRecords.length + " záznamov)");

        result.success = true;
        result.count = workRecords.length;
        result.totalHours = totalHours;
        result.orders = orderNames;
        result.info = infoText;

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

        // Spracuj každý záznam z knihy jázd
        for (var i = 0; i < rideRecords.length; i++) {
            var ride = rideRecords[i];
            var rideId = ride.field("ID");

            // Získaj dáta
            var vehicle = utils.safeGetLinks(ride, CONFIG.fields.rideLog.vehicle);
            var km = utils.safeGet(ride, CONFIG.fields.rideLog.km, 0);
            var route = utils.safeGet(ride, CONFIG.fields.rideLog.route, "");
            var driver = utils.safeGetLinks(ride, CONFIG.fields.rideLog.driver);

            // Agreguj vozidlá
            if (vehicle && vehicle.length > 0) {
                var vehicleName = utils.safeGet(vehicle[0], CONFIG.fields.vehicle.name);
                if (vehicleName) {
                    vehicleSet[vehicleName] = true;
                }
            }

            totalKm += km;

            // Vytvor info blok pre tento záznam
            var block = "🚗 Kniha jázd #" + rideId + "\n";
            if (vehicle && vehicle.length > 0) {
                block += "  🚙 Vozidlo: " + utils.safeGet(vehicle[0], CONFIG.fields.vehicle.name) + "\n";
            }
            if (driver && driver.length > 0) {
                block += "  👤 Vodič: " + utils.safeGet(driver[0], CONFIG.fields.employee.nick) + "\n";
            }
            if (route) {
                block += "  📍 Trasa: " + route.substring(0, 100) + (route.length > 100 ? "..." : "") + "\n";
            }
            block += "  📏 Km: " + km.toFixed(2) + " km\n";

            infoBlocks.push(block);
        }

        // Vytvor zjednotený info záznam
        var now = new Date();
        var timestamp = utils.formatDate(now) + " " + utils.formatTime(now);
        var infoText = "\n🚗 KNIHA JÁZD - ZHRNUTIE: " + timestamp + "\n";
        infoText += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        infoText += "📈 Celkom záznamov: " + rideRecords.length + "\n";
        infoText += "📏 Celkom km: " + totalKm.toFixed(2) + " km\n";

        var vehicleNames = Object.keys(vehicleSet);
        if (vehicleNames.length > 0) {
            infoText += "🚙 Vozidlá (" + vehicleNames.length + "): " + vehicleNames.join(", ") + "\n";
        }

        infoText += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        infoText += infoBlocks.join("\n");

        // Ulož info záznam (len do logu, zatiaľ nezapisuj do poľa)
        utils.addDebug(currentEntry, "  📊 INFO KNIHA JÁZD:\n" + infoText);
        utils.addDebug(currentEntry, "  ✅ Info kniha jázd vytvorený (" + rideRecords.length + " záznamov)");

        result.success = true;
        result.count = rideRecords.length;
        result.totalKm = totalKm;
        result.vehicles = vehicleNames;
        result.info = infoText;

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
            var type = utils.safeGet(cash, CONFIG.fields.cashBook.type, "");
            var amount = utils.safeGet(cash, CONFIG.fields.cashBook.amount, 0);
            var description = utils.safeGet(cash, CONFIG.fields.cashBook.description, "");

            // Agreguj príjmy a výdavky
            if (type === "Príjem" || type === "príjem") {
                totalIncome += amount;
            } else if (type === "Výdavok" || type === "výdavok") {
                totalExpense += amount;
            }

            // Vytvor info blok pre tento záznam
            var block = "💰 Pokladňa #" + cashId + "\n";
            block += "  📊 Typ: " + type + "\n";
            block += "  💵 Suma: " + amount.toFixed(2) + " €\n";
            if (description) {
                block += "  📋 Popis: " + description.substring(0, 100) + (description.length > 100 ? "..." : "") + "\n";
            }

            infoBlocks.push(block);
        }

        // Vytvor zjednotený info záznam
        var now = new Date();
        var timestamp = utils.formatDate(now) + " " + utils.formatTime(now);
        var infoText = "\n💰 POKLADŇA - ZHRNUTIE: " + timestamp + "\n";
        infoText += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        infoText += "📈 Celkom záznamov: " + cashRecords.length + "\n";
        infoText += "📈 Príjmy: +" + totalIncome.toFixed(2) + " €\n";
        infoText += "📉 Výdavky: -" + totalExpense.toFixed(2) + " €\n";
        infoText += "💰 Bilancia: " + (totalIncome - totalExpense).toFixed(2) + " €\n";
        infoText += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        infoText += infoBlocks.join("\n");

        // Ulož info záznam (len do logu, zatiaľ nezapisuj do poľa)
        utils.addDebug(currentEntry, "  📊 INFO POKLADŇA:\n" + infoText);
        utils.addDebug(currentEntry, "  ✅ Info pokladňa vytvorený (" + cashRecords.length + " záznamov)");

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
        utils.addDebug(currentEntry, "  ℹ️ Zatiaľ nezapisujeme do poľa hoursWorked");

        result.success = true;
        result.totalHours = totalHours;

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri výpočte celkových hodín: " + error.toString(), "calculateTotalHours", error);
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
        var parts = [];

        // Dochádzka
        if (attendanceResult.count > 0) {
            parts.push("👥 " + attendanceResult.count + " dochádzka");
            if (attendanceResult.employees.length > 0) {
                parts.push("(" + attendanceResult.employees.join(", ") + ")");
            }
        }

        // Záznamy prác
        if (workRecordsResult.count > 0) {
            parts.push("📝 " + workRecordsResult.count + " práca");
            if (workRecordsResult.orders.length > 0) {
                parts.push("(" + workRecordsResult.orders.join(", ") + ")");
            }
        }

        // Kniha jázd
        if (rideLogResult.count > 0) {
            parts.push("🚗 " + rideLogResult.count + " jazda");
            if (rideLogResult.vehicles.length > 0) {
                parts.push("(" + rideLogResult.vehicles.join(", ") + ")");
            }
        }

        // Pokladňa
        if (cashBookResult.count > 0) {
            parts.push("💰 " + cashBookResult.count + " pokladňa");
        }

        var description = parts.join(" | ");

        if (description) {
            utils.addDebug(currentEntry, "  ✅ Popis záznamu: " + description);
            utils.addDebug(currentEntry, "  ℹ️ Zatiaľ nezapisujeme do poľa recordDescription");
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
// POMOCNÉ FUNKCIE
// ==============================================

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
