// ==============================================
// MEMENTO DATABASE - DENNÝ REPORT PREPOČET
// Verzia: 1.2.0 | Dátum: október 2025 | Autor: ASISTANTO
// Knižnica: Denný report | Trigger: Before Save
// ==============================================
// ✅ FUNKCIONALITA v1.2.0:
//    - Agregácia dát z Dochádzky, Záznamov prác, Knihy jázd a Pokladne
//    - Vytváranie Info záznamov pre každú sekciu (markdown formát)
//    - Vytvorenie spoločného info záznamu
//    - Výpočet celkových odpracovaných hodín
//    - Výpočet celkových km, príjmov a výdavkov
//    - Generovanie popisu záznamu
//    - Automatické pridávanie ikôn pre vyplnené sekcie
//    - Agregácia strojov a materiálu zo Záznamov prác
//    - Príprava na integráciu s MementoTelegram a MementoAI
// 🔧 CHANGELOG v1.2.0:
//    - OPRAVA: Pole "Odpracované" v Zázname prác (nie "Hodiny")
//    - PRIDANÉ: Pole "Popis" vyplnené zákazkami vo formáte "Číslo.Názov"
//    - PRIDANÉ: Agregácia Strojov zo Záznamov prác
//    - PRIDANÉ: Agregácia Materiálu zo Záznamov prác
//    - PRIDANÉ: Zobrazenie Strojov a Materiálu v info blokoch
//    - Vylepšené zobrazenie zamestnancov v info blokoch (viacerí zamestnanci)
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
    version: "1.2.0",

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

        // KROK 7: Vytvorenie spoločného info záznamu
        utils.addDebug(currentEntry, utils.getIcon("note") + " KROK 7: Vytvorenie spoločného info");
        var commonInfoResult = createCommonInfo(attendanceResult, workRecordsResult, rideLogResult, cashBookResult, totalHoursResult);

        // KROK 8: Telegram notifikácie (voliteľné - pripravené na neskoršiu implementáciu)
        utils.addDebug(currentEntry, utils.getIcon("telegram") + " KROK 8: Telegram notifikácie");
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

        // Ulož info záznam do poľa (markdown formát)
        var markdownInfo = createMarkdownInfo("DOCHÁDZKA", timestamp, [
            { label: "Celkom záznamov", value: attendanceRecords.length },
            { label: "Celkom odpracovaných hodín", value: totalWorked.toFixed(2) + " h" },
            { label: "Zamestnanci (" + employeeNames.length + ")", value: employeeNames.join(", ") }
        ], infoBlocks);

        utils.safeSet(currentEntry, CONFIG.fields.dailyReport.infoAttendance, markdownInfo);
        addRecordIcon("👥");
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

            totalWorkedHours += workedHours;

            // Vytvor info blok pre tento záznam
            var block = "📝 Záznam prác #" + workId + "\n";
            if (order && order.length > 0) {
                var orderNum = utils.safeGet(order[0], CONFIG.fields.order.number, "");
                var orderNm = utils.safeGet(order[0], CONFIG.fields.order.name);
                block += "  🎯 Zákazka: " + (orderNum ? orderNum + "." : "") + orderNm + "\n";
            }
            if (employees && employees.length > 0) {
                var empNames = [];
                for (var e = 0; e < employees.length; e++) {
                    empNames.push(utils.safeGet(employees[e], CONFIG.fields.employee.nick));
                }
                block += "  👥 Zamestnanci: " + empNames.join(", ") + "\n";
            }
            if (machines && machines.length > 0) {
                var machNames = [];
                for (var mch = 0; mch < machines.length; mch++) {
                    machNames.push(utils.safeGet(machines[mch], CONFIG.fields.machine.name));
                }
                block += "  🚜 Stroje: " + machNames.join(", ") + "\n";
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
                    block += "  📦 Materiál: " + matNames.join(", ") + "\n";
                }
            }
            if (description) {
                block += "  📋 Popis: " + description.substring(0, 100) + (description.length > 100 ? "..." : "") + "\n";
            }
            block += "  ⏱️ Odpracované: " + workedHours.toFixed(2) + " h\n";

            infoBlocks.push(block);
        }

        // Vytvor zjednotený info záznam
        var now = new Date();
        var timestamp = utils.formatDate(now) + " " + utils.formatTime(now);

        var orderNames = Object.keys(orderSet);
        var machineNames = Object.keys(machinesSet);
        var materialNames = Object.keys(materialSet);

        // Vytvor stats pre markdown
        var stats = [
            { label: "Celkom záznamov", value: workRecords.length },
            { label: "Odpracované hodiny", value: totalWorkedHours.toFixed(2) + " h" }
        ];

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
        addRecordIcon("📝");
        utils.addDebug(currentEntry, "  ✅ Info záznam prác vytvorený a zapísaný (" + workRecords.length + " záznamov)");

        result.success = true;
        result.count = workRecords.length;
        result.totalHours = totalWorkedHours;
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

        // Ulož info záznam do poľa (markdown formát)
        var markdownInfo = createMarkdownInfo("KNIHA JÁZD", timestamp, [
            { label: "Celkom záznamov", value: rideRecords.length },
            { label: "Celkom km", value: totalKm.toFixed(2) + " km" },
            { label: "Vozidlá (" + vehicleNames.length + ")", value: vehicleNames.join(", ") }
        ], infoBlocks);

        utils.safeSet(currentEntry, CONFIG.fields.dailyReport.infoRideLog, markdownInfo);
        addRecordIcon("🚗");
        utils.addDebug(currentEntry, "  ✅ Info kniha jázd vytvorený a zapísaný (" + rideRecords.length + " záznamov)");

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

        // Ulož info záznam do poľa (markdown formát)
        var markdownInfo = createMarkdownInfo("POKLADŇA", timestamp, [
            { label: "Celkom záznamov", value: cashRecords.length },
            { label: "Príjmy", value: "+" + totalIncome.toFixed(2) + " €" },
            { label: "Výdavky", value: "-" + totalExpense.toFixed(2) + " €" },
            { label: "Bilancia", value: (totalIncome - totalExpense).toFixed(2) + " €" }
        ], infoBlocks);

        utils.safeSet(currentEntry, CONFIG.fields.dailyReport.infoCashBook, markdownInfo);
        addRecordIcon("💰");
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

        // Pole Popis záznamu - stručný prehľad sekcií
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
            utils.safeSet(currentEntry, CONFIG.fields.dailyReport.recordDescription, description);
        }

        result.success = true;
        result.description = description;
        result.orderDescription = orderDescription;

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

function createCommonInfo(attendanceResult, workRecordsResult, rideLogResult, cashBookResult, totalHoursResult) {
    var result = {
        success: false
    };

    try {
        var now = new Date();
        var timestamp = utils.formatDate(now) + " " + utils.formatTime(now);

        // Hlavička
        var info = "# 📊 DENNÝ REPORT - ZHRNUTIE\n\n";
        info += "**Dátum:** " + utils.formatDate(utils.safeGet(currentEntry, CONFIG.fields.dailyReport.date)) + "  \n";
        info += "**Aktualizované:** " + timestamp + "\n\n";
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
 * Pridá ikonu do poľa ikony záznamu
 */
function addRecordIcon(icon) {
    try {
        var currentIcons = utils.safeGet(currentEntry, CONFIG.fields.dailyReport.recordIcons, "");

        // Skontroluj, či ikona už nie je pridaná
        if (currentIcons.indexOf(icon) === -1) {
            var newIcons = currentIcons ? currentIcons + " " + icon : icon;
            utils.safeSet(currentEntry, CONFIG.fields.dailyReport.recordIcons, newIcons);
            utils.addDebug(currentEntry, "  📌 Pridaná ikona: " + icon);
        }
    } catch (error) {
        utils.addDebug(currentEntry, "  ⚠️ Nepodarilo sa pridať ikonu: " + error.toString());
    }
}

/**
 * Vytvorí markdown formátovaný info záznam
 */
function createMarkdownInfo(title, timestamp, stats, detailBlocks) {
    var info = "## 📊 " + title + " - ZHRNUTIE\n\n";
    info += "**Aktualizované:** " + timestamp + "\n\n";

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
