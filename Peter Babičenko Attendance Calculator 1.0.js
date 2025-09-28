// ==============================================
// PETER BABIČENKO - ATTENDANCE HOURS CALCULATOR
// Verzia: 1.0 | Dátum: September 2025 | Autor: ASISTANTO
// ==============================================
// 📋 FUNKCIA:
//    - Vyhľadávanie zamestnanca Peter Babičenko v knižnici Zamestnanci
//    - Získavanie záznamov dochádzky z knižnice Dochádzka
//    - Výpočet celkových odpracovaných hodín
//    - Aplikácia slovenskej business logiky
//    - 15-minútové zaokrúhľovanie časov
//    - Decimálny formát hodín (6.75h pre 6h 45min)
//    - Správne riešenie zmien cez polnoc
//    - Výpočet prestávok pre zmeny nad 6 hodín
// ==============================================

// ==============================================
// INICIALIZÁCIA MODULOV
// ==============================================

// Import Memento modulov podľa established dependency chain
var utils = MementoUtils;
var config = utils.getConfig();
var core = MementoCore;
var business = MementoBusiness;

var CONFIG = {
    scriptName: "Peter Babičenko Attendance Calculator",
    version: "1.0.0",

    // Referencie na centrálny config
    libraries: {
        employees: config.libraries.employees,
        attendance: config.libraries.attendance
    },

    fields: {
        // Zamestnanci polia
        employees: {
            firstName: "Meno",
            lastName: "Priezvisko",
            nick: "Nick"
        },
        // Dochádzka polia
        attendance: {
            date: config.fields.attendance.date,
            arrival: config.fields.attendance.arrival,
            departure: config.fields.attendance.departure,
            employees: config.fields.attendance.employees,
            workedHours: config.fields.attendance.workedHours,
            workTime: config.fields.attendance.workTime,
            employeeAttributes: config.fields.attendance.employeeAttributes
        },
        common: config.fields.common
    },

    // Business nastavenia
    settings: {
        roundToQuarterHour: true,
        roundDirection: "nearest", // "up", "down", "nearest"
        includeBreaks: true,
        breakThreshold: 6, // hodín
        breakDuration: 30, // minút
        workHoursPerDay: 8 // štandardná pracovná doba
    },

    // Konštanty
    targetEmployee: "Peter Babičenko",
    icons: config.icons
};

// ==============================================
// LOGGING FUNKCIE
// ==============================================

function addDebug(message, iconName = "info") {
    core.addDebug(entry(), message, iconName);
}

function addError(message, functionName, error) {
    core.addError(entry(), message, functionName, error);
}

function addInfo(message) {
    var currentInfo = core.safeFieldAccess(entry(), CONFIG.fields.common.info, "");
    core.updateField(entry(), CONFIG.fields.common.info, currentInfo + "\n" + message);
}

// ==============================================
// UTILITY FUNKCIE
// ==============================================

/**
 * Zaokrúhli čas na 15-minútové intervaly podľa slovenskej business logiky
 */
function roundToQuarterHour(time) {
    if (!time || !moment(time).isValid()) {
        return null;
    }

    var timeMoment = moment(time);
    var minutes = timeMoment.minutes();
    var roundedMinutes;

    if (CONFIG.settings.roundDirection === "nearest") {
        roundedMinutes = Math.round(minutes / 15) * 15;
    } else if (CONFIG.settings.roundDirection === "up") {
        roundedMinutes = Math.ceil(minutes / 15) * 15;
    } else if (CONFIG.settings.roundDirection === "down") {
        roundedMinutes = Math.floor(minutes / 15) * 15;
    } else {
        roundedMinutes = minutes; // No rounding
    }

    // Handle minute overflow
    if (roundedMinutes >= 60) {
        timeMoment.add(1, 'hour');
        roundedMinutes = 0;
    }

    return timeMoment.minutes(roundedMinutes).seconds(0);
}

/**
 * Konvertuje minúty na decimálny formát hodín
 */
function minutesToDecimalHours(minutes) {
    return Math.round((minutes / 60) * 100) / 100; // Round to 2 decimal places
}

/**
 * Formátuje hodiny pre display (6.75h)
 */
function formatHours(decimalHours) {
    return decimalHours.toFixed(2) + "h";
}

/**
 * Vypočíta odpracované hodiny medzi príchodom a odchodom
 */
function calculateWorkHours(arrival, departure) {
    try {
        if (!arrival || !departure) {
            return {
                hours: 0,
                minutes: 0,
                decimalHours: 0,
                crossesMidnight: false,
                error: "Chýba čas príchodu alebo odchodu"
            };
        }

        var arrivalTime = CONFIG.settings.roundToQuarterHour ?
            roundToQuarterHour(arrival) : moment(arrival);
        var departureTime = CONFIG.settings.roundToQuarterHour ?
            roundToQuarterHour(departure) : moment(departure);

        if (!arrivalTime || !departureTime || !arrivalTime.isValid() || !departureTime.isValid()) {
            return {
                hours: 0,
                minutes: 0,
                decimalHours: 0,
                error: "Neplatný formát času"
            };
        }

        var diffMinutes = departureTime.diff(arrivalTime, 'minutes');
        var crossesMidnight = false;

        // Ak je rozdiel záporný, práca cez polnoc
        if (diffMinutes < 0) {
            diffMinutes += 24 * 60;
            crossesMidnight = true;
        }

        // Aplikuj prestávky pre dlhé zmeny
        var breakMinutes = 0;
        if (CONFIG.settings.includeBreaks && diffMinutes > CONFIG.settings.breakThreshold * 60) {
            breakMinutes = CONFIG.settings.breakDuration;
            diffMinutes -= breakMinutes;
        }

        var hours = Math.floor(diffMinutes / 60);
        var minutes = diffMinutes % 60;
        var decimalHours = minutesToDecimalHours(diffMinutes);

        // Výpočet nadčasov
        var regularHours = Math.min(decimalHours, CONFIG.settings.workHoursPerDay);
        var overtimeHours = Math.max(0, decimalHours - CONFIG.settings.workHoursPerDay);

        return {
            hours: hours,
            minutes: minutes,
            totalMinutes: diffMinutes,
            decimalHours: decimalHours,
            regularHours: regularHours,
            overtimeHours: overtimeHours,
            breakMinutes: breakMinutes,
            crossesMidnight: crossesMidnight,
            formatted: formatHours(decimalHours),
            arrivalRounded: arrivalTime.format("HH:mm"),
            departureRounded: departureTime.format("HH:mm")
        };

    } catch (error) {
        addError("Chyba pri výpočte pracovných hodín", "calculateWorkHours", error);
        return {
            hours: 0,
            minutes: 0,
            decimalHours: 0,
            error: error.toString()
        };
    }
}

// ==============================================
// HLAVNÉ BUSINESS FUNKCIE
// ==============================================

/**
 * Vyhľadá zamestnanca Peter Babičenko v knižnici Zamestnanci
 */
function findEmployee() {
    try {
        addDebug("🔍 Vyhľadávam zamestnanca: " + CONFIG.targetEmployee, "search");

        var employeesLibrary = lib(CONFIG.libraries.employees);
        if (!employeesLibrary) {
            throw new Error("Knižnica Zamestnanci nenájdená: " + CONFIG.libraries.employees);
        }

        var employees = employeesLibrary.entries();
        addDebug("📊 Počet zamestnancov v knižnici: " + employees.length);

        var foundEmployee = null;
        for (var i = 0; i < employees.length; i++) {
            var employee = employees[i];
            var firstName = core.safeFieldAccess(employee, CONFIG.fields.employees.firstName, "");
            var lastName = core.safeFieldAccess(employee, CONFIG.fields.employees.lastName, "");
            var nick = core.safeFieldAccess(employee, CONFIG.fields.employees.nick, "");
            var fullName = firstName + " " + lastName;

            addDebug("🔍 Kontrolujem zamestnanca: " + fullName + " (" + nick + ")");

            // Check firstName, lastName, nick, or full name
            if ((firstName.toLowerCase().includes("peter") && lastName.toLowerCase().includes("babičenko")) ||
                nick.toLowerCase().includes("peter") ||
                fullName.toLowerCase().includes("peter babičenko")) {
                foundEmployee = employee;
                addDebug("✅ Zamestnanec nájdený: " + fullName + " (" + nick + ")", "success");
                break;
            }
        }

        if (!foundEmployee) {
            throw new Error("Zamestnanec Peter Babičenko nebol nájdený v knižnici");
        }

        return foundEmployee;

    } catch (error) {
        addError("Chyba pri vyhľadávaní zamestnanca", "findEmployee", error);
        throw error;
    }
}

/**
 * Získa záznamy dochádzky pre konkrétneho zamestnanca
 */
function getAttendanceRecords(employee) {
    try {
        addDebug("📋 Získavam záznamy dochádzky pre zamestnanca", "calendar");

        var attendanceLibrary = lib(CONFIG.libraries.attendance);
        if (!attendanceLibrary) {
            throw new Error("Knižnica Dochádzka nenájdená: " + CONFIG.libraries.attendance);
        }

        var allRecords = attendanceLibrary.entries();
        addDebug("📊 Celkový počet záznamov dochádzky: " + allRecords.length);

        var employeeRecords = [];
        for (var i = 0; i < allRecords.length; i++) {
            var record = allRecords[i];

            // Skip deleted records
            if (record.isDeleted()) {
                continue;
            }

            var employees = core.safeFieldAccess(record, CONFIG.fields.attendance.employees, []);
            if (!Array.isArray(employees)) {
                employees = employees ? [employees] : [];
            }

            // Check if our employee is in this attendance record
            var isEmployeeInRecord = false;
            for (var j = 0; j < employees.length; j++) {
                if (employees[j] && employees[j].id() === employee.id()) {
                    isEmployeeInRecord = true;
                    break;
                }
            }

            if (isEmployeeInRecord) {
                employeeRecords.push(record);
            }
        }

        addDebug("✅ Nájdených záznamov pre zamestnanca: " + employeeRecords.length, "success");
        return employeeRecords;

    } catch (error) {
        addError("Chyba pri získavaní záznamov dochádzky", "getAttendanceRecords", error);
        throw error;
    }
}

/**
 * Vypočíta celkové hodiny zo všetkých záznamov dochádzky
 */
function calculateTotalHours(attendanceRecords, employee) {
    try {
        addDebug("🧮 Začínam výpočet celkových hodín", "calculator");

        var results = {
            totalRecords: attendanceRecords.length,
            validRecords: 0,
            totalDecimalHours: 0,
            totalRegularHours: 0,
            totalOvertimeHours: 0,
            totalBreakMinutes: 0,
            crossMidnightCount: 0,
            errorRecords: 0,
            records: []
        };

        for (var i = 0; i < attendanceRecords.length; i++) {
            var record = attendanceRecords[i];

            try {
                var date = core.safeFieldAccess(record, CONFIG.fields.attendance.date);
                var arrival = core.safeFieldAccess(record, CONFIG.fields.attendance.arrival);
                var departure = core.safeFieldAccess(record, CONFIG.fields.attendance.departure);

                addDebug("📅 Spracovávam dátum: " + (date ? moment(date).format("DD.MM.YYYY") : "bez dátumu"));

                if (!arrival || !departure) {
                    addDebug("⚠️ Chýba príchod alebo odchod pre dátum: " +
                             (date ? moment(date).format("DD.MM.YYYY") : "neznámy"), "warning");
                    results.errorRecords++;
                    continue;
                }

                var workHours = calculateWorkHours(arrival, departure);

                if (workHours.error) {
                    addDebug("❌ Chyba výpočtu pre dátum " +
                             (date ? moment(date).format("DD.MM.YYYY") : "neznámy") +
                             ": " + workHours.error, "error");
                    results.errorRecords++;
                    continue;
                }

                // Aktualizuj celkové súčty
                results.validRecords++;
                results.totalDecimalHours += workHours.decimalHours;
                results.totalRegularHours += workHours.regularHours;
                results.totalOvertimeHours += workHours.overtimeHours;
                results.totalBreakMinutes += workHours.breakMinutes;

                if (workHours.crossesMidnight) {
                    results.crossMidnightCount++;
                }

                // Ulož detaily záznamu
                results.records.push({
                    date: date ? moment(date).format("DD.MM.YYYY") : "bez dátumu",
                    arrival: workHours.arrivalRounded,
                    departure: workHours.departureRounded,
                    decimalHours: workHours.decimalHours,
                    formatted: workHours.formatted,
                    regularHours: workHours.regularHours,
                    overtimeHours: workHours.overtimeHours,
                    breakMinutes: workHours.breakMinutes,
                    crossesMidnight: workHours.crossesMidnight
                });

                addDebug("✅ " + (date ? moment(date).format("DD.MM.YYYY") : "bez dátumu") +
                         ": " + workHours.arrivalRounded + " - " + workHours.departureRounded +
                         " = " + workHours.formatted);

            } catch (recordError) {
                addError("Chyba pri spracovaní záznamu", "calculateTotalHours", recordError);
                results.errorRecords++;
            }
        }

        // Zaokrúhli finálne výsledky
        results.totalDecimalHours = Math.round(results.totalDecimalHours * 100) / 100;
        results.totalRegularHours = Math.round(results.totalRegularHours * 100) / 100;
        results.totalOvertimeHours = Math.round(results.totalOvertimeHours * 100) / 100;

        addDebug("🎯 Výpočet dokončený - Celkom: " + formatHours(results.totalDecimalHours), "success");
        return results;

    } catch (error) {
        addError("Chyba pri výpočte celkových hodín", "calculateTotalHours", error);
        throw error;
    }
}

/**
 * Generuje detailné report výsledkov
 */
function generateReport(employee, results) {
    try {
        var firstName = core.safeFieldAccess(employee, CONFIG.fields.employees.firstName, "");
        var lastName = core.safeFieldAccess(employee, CONFIG.fields.employees.lastName, "");
        var employeeName = firstName + " " + lastName || "Neznámy zamestnanec";

        var report = [];
        report.push("=".repeat(50));
        report.push("📊 SÚHRN ODPRACOVANÝCH HODÍN");
        report.push("=".repeat(50));
        report.push("👤 Zamestnanec: " + employeeName);
        report.push("📅 Dátum výpočtu: " + moment().format("DD.MM.YYYY HH:mm"));
        report.push("📋 Script: " + CONFIG.scriptName + " v" + CONFIG.version);
        report.push("");

        report.push("📈 ŠTATISTIKY:");
        report.push("• Celkový počet záznamov: " + results.totalRecords);
        report.push("• Platné záznamy: " + results.validRecords);
        report.push("• Chybné záznamy: " + results.errorRecords);
        report.push("• Zmeny cez polnoc: " + results.crossMidnightCount);
        report.push("");

        report.push("⏰ ODPRACOVANÉ HODINY:");
        report.push("• Celkové hodiny: " + formatHours(results.totalDecimalHours));
        report.push("• Riadne hodiny: " + formatHours(results.totalRegularHours));
        report.push("• Nadčasové hodiny: " + formatHours(results.totalOvertimeHours));
        report.push("• Celkové prestávky: " + results.totalBreakMinutes + " minút");
        report.push("");

        if (results.records.length > 0) {
            report.push("📅 DETAILNÝ ROZPIS:");
            report.push("-".repeat(50));

            // Sort records by date
            results.records.sort(function(a, b) {
                var dateA = moment(a.date, "DD.MM.YYYY");
                var dateB = moment(b.date, "DD.MM.YYYY");
                return dateA.isBefore(dateB) ? -1 : 1;
            });

            for (var i = 0; i < results.records.length; i++) {
                var record = results.records[i];
                var midnightFlag = record.crossesMidnight ? " 🌙" : "";
                var overtimeFlag = record.overtimeHours > 0 ? " ⏰" : "";
                var breakFlag = record.breakMinutes > 0 ? " ☕" : "";

                report.push(record.date + ": " +
                           record.arrival + " - " + record.departure +
                           " = " + record.formatted +
                           midnightFlag + overtimeFlag + breakFlag);
            }

            report.push("");
            report.push("🔍 LEGENDA:");
            report.push("🌙 = Zmena cez polnoc");
            report.push("⏰ = Nadčasové hodiny");
            report.push("☕ = Aplikovaná prestávka");
        }

        report.push("");
        report.push("⚙️ NASTAVENIA VÝPOČTU:");
        report.push("• 15-minútové zaokrúhľovanie: " + (CONFIG.settings.roundToQuarterHour ? "ÁNO" : "NIE"));
        report.push("• Smer zaokrúhľovania: " + CONFIG.settings.roundDirection);
        report.push("• Prestávky: " + (CONFIG.settings.includeBreaks ? "ÁNO" : "NIE"));
        report.push("• Prestávka od: " + CONFIG.settings.breakThreshold + "h");
        report.push("• Dĺžka prestávky: " + CONFIG.settings.breakDuration + " min");
        report.push("• Štandardná pracovná doba: " + CONFIG.settings.workHoursPerDay + "h");
        report.push("");
        report.push("=".repeat(50));

        return report.join("\n");

    } catch (error) {
        addError("Chyba pri generovaní reportu", "generateReport", error);
        throw error;
    }
}

// ==============================================
// VALIDÁCIA SYSTÉMU
// ==============================================

function validateSystem() {
    var errors = [];

    // Kontrola dostupnosti modulov
    if (typeof MementoUtils === 'undefined') {
        errors.push("MementoUtils modul nie je dostupný");
    }
    if (typeof MementoCore === 'undefined') {
        errors.push("MementoCore modul nie je dostupný");
    }
    if (typeof moment === 'undefined') {
        errors.push("Moment.js knižnica nie je dostupná");
    }

    // Kontrola knižníc
    if (!lib(CONFIG.libraries.employees)) {
        errors.push("Knižnica Zamestnanci nie je dostupná: " + CONFIG.libraries.employees);
    }
    if (!lib(CONFIG.libraries.attendance)) {
        errors.push("Knižnica Dochádzka nie je dostupná: " + CONFIG.libraries.attendance);
    }

    if (errors.length > 0) {
        throw new Error("Systémové chyby:\n• " + errors.join("\n• "));
    }

    addDebug("✅ Validácia systému úspešná", "success");
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        addDebug("🚀 Spúšťam výpočet dochádzky pre Peter Babičenko", "rocket");
        addInfo("=== ZAČIATOK VÝPOČTU DOCHÁDZKY ===");

        // 0. Validuj systém
        validateSystem();

        // 1. Vyhľadaj zamestnanca
        var employee = findEmployee();
        var firstName = core.safeFieldAccess(employee, CONFIG.fields.employees.firstName, "");
        var lastName = core.safeFieldAccess(employee, CONFIG.fields.employees.lastName, "");
        var employeeName = firstName + " " + lastName;
        addInfo("✅ Zamestnanec nájdený: " + employeeName);

        // 2. Získaj záznamy dochádzky
        var attendanceRecords = getAttendanceRecords(employee);
        addInfo("📋 Získané záznamy dochádzky: " + attendanceRecords.length);

        if (attendanceRecords.length === 0) {
            var noRecordsMsg = "⚠️ Pre zamestnanca " + employeeName + " neboli nájdené žiadne záznamy dochádzky.";
            addInfo(noRecordsMsg);
            addDebug(noRecordsMsg, "warning");
            return;
        }

        // 3. Vypočítaj celkové hodiny
        var results = calculateTotalHours(attendanceRecords, employee);
        addInfo("🧮 Výpočet dokončený - Celkom: " + formatHours(results.totalDecimalHours));

        // 4. Vygeneruj report
        var report = generateReport(employee, results);
        addInfo(report);

        addDebug("🎉 Výpočet úspešne dokončený!", "success");
        addInfo("=== KONIEC VÝPOČTU DOCHÁDZKY ===");

    } catch (error) {
        var errorMsg = "❌ Kritická chyba: " + error.toString();
        addError(errorMsg, "main", error);
        addInfo(errorMsg);

        // Pridaj debug informácie
        addInfo("\n🔧 DEBUG INFORMÁCIE:");
        addInfo("• CONFIG libraries attendance: " + CONFIG.libraries.attendance);
        addInfo("• CONFIG libraries employees: " + CONFIG.libraries.employees);
        addInfo("• MementoUtils dostupné: " + (typeof MementoUtils !== 'undefined'));
        addInfo("• MementoCore dostupné: " + (typeof MementoCore !== 'undefined'));
        addInfo("• MementoBusiness dostupné: " + (typeof MementoBusiness !== 'undefined'));
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

// Spusti hlavnú funkciu
main();