/**
 * UNIVERZÁLNY ATTENDANCE CALCULATOR
 * Verzia: 1.0 | Dátum: September 2025 | Autor: ASISTANTO
 *
 * FUNKCIA:
 * - Univerzálny výpočet odpracovaných hodín pre všetkých zamestnancov v zázname dochádzky
 * - Používa linksFrom prístup pre optimalizáciu
 * - Zapisuje výsledky do polí v záznamoch zamestnancov
 * - Dodržiava pokročilé development patterns projektu
 * - Centralizované dáta a znovupoužiteľné funkcie
 */

// ===== INICIALIZÁCIA MODULOV =====
var utils = MementoUtils;
var config = utils.getConfig();
var core = utils.getCore();
var business = utils.getBusiness();

// ===== KONFIGURÁCIA SCRIPTU =====
var SCRIPT_CONFIG = {
    name: "Universal Attendance Calculator",
    version: "1.0",
    fields: config.fields.attendance,
    libraries: {
        primary: config.libraries.attendance,
        employees: config.libraries.employees
    }
};

// ===== CENTRALIZOVANÝ DÁTOVÝ OBJEKT =====
var AttendanceCalculationData = {
    // Základné info o zázname dochádzky
    attendanceRecord: {
        entry: null,
        date: null,
        employees: []
    },

    // Výsledky výpočtov pre jednotlivých zamestnancov
    employeeResults: {},

    // Celkové štatistiky
    statistics: {
        totalEmployees: 0,
        processedEmployees: 0,
        errorEmployees: 0,
        totalHours: 0,
        totalRegularHours: 0,
        totalOvertimeHours: 0
    },

    // Nastavenia výpočtu
    settings: {
        quarterHourRounding: true,
        standardWorkDay: 8,
        autoBreakThreshold: 6,
        breakDuration: 30
    },

    // Špeciálne prípady
    flags: {
        crossMidnightCount: 0,
        hasErrorRecords: false,
        hasBreakDeductions: false
    },

    // Metódy pre prácu s objektom
    addEmployeeResult: function(employeeId, result) {
        this.employeeResults[employeeId] = result;
        this.statistics.processedEmployees++;

        if (result.error) {
            this.statistics.errorEmployees++;
            this.flags.hasErrorRecords = true;
        } else {
            this.statistics.totalHours += result.totalDecimalHours;
            this.statistics.totalRegularHours += result.regularHours;
            this.statistics.totalOvertimeHours += result.overtimeHours;

            if (result.crossesMidnight) {
                this.flags.crossMidnightCount++;
            }

            if (result.breakMinutes > 0) {
                this.flags.hasBreakDeductions = true;
            }
        }
    },

    getEmployee: function(employeeId) {
        return this.employeeResults[employeeId] || null;
    },

    getSummary: function() {
        return {
            attendanceDate: this.attendanceRecord.date,
            totalEmployees: this.statistics.totalEmployees,
            processedEmployees: this.statistics.processedEmployees,
            errorEmployees: this.statistics.errorEmployees,
            totalHours: Number(this.statistics.totalHours.toFixed(2)),
            totalRegularHours: Number(this.statistics.totalRegularHours.toFixed(2)),
            totalOvertimeHours: Number(this.statistics.totalOvertimeHours.toFixed(2)),
            specialFlags: this.flags,
            employeeResults: this.employeeResults
        };
    }
};

// ===== HLAVNÁ LOGIKA =====
function main() {
    try {
        // 1. Validácia a príprava
        validateEnvironment();

        // 2. Získanie dát optimalizovaným spôsobom
        var attendanceEntry = entry();
        var attendanceData = getAttendanceDataOptimized(attendanceEntry);

        // 3. Spracovanie s centralizovaným objektom
        processAttendanceCalculations(attendanceData, AttendanceCalculationData);

        // 4. Zápis výsledkov do záznamov zamestnancov
        writeResultsToEmployees(AttendanceCalculationData);

        // 5. Generovanie výsledkov
        var summary = AttendanceCalculationData.getSummary();

        // 6. Logging a output s novou addInfo funkciou
        core.addInfo(entry(), "Výpočet dochádzky úspešne dokončený", summary, {
            scriptName: SCRIPT_CONFIG.name,
            scriptVersion: SCRIPT_CONFIG.version,
            moduleName: "AttendanceCalculator",
            sectionName: "Súhrn výpočtu",
            includeHeader: true,
            includeFooter: true
        });

    } catch (error) {
        core.addError(entry(), error.toString(), "main", {
            script: SCRIPT_CONFIG.name,
            version: SCRIPT_CONFIG.version
        });
    }
}

// ===== HELPER FUNKCIE =====
function getAttendanceDataOptimized(attendanceEntry) {
    var config = utils.config;

    // Inicializuj dáta
    AttendanceCalculationData.attendanceRecord.entry = attendanceEntry;
    AttendanceCalculationData.attendanceRecord.date = core.safeFieldAccess(
        attendanceEntry,
        config.fields.attendance.date,
        null
    );

    // Získaj zamestnancov z aktuálneho záznamu dochádzky
    var employees = core.safeFieldAccess(
        attendanceEntry,
        config.fields.attendance.employees,
        []
    );

    // Normalizuj na array
    if (!Array.isArray(employees)) {
        employees = employees ? [employees] : [];
    }

    AttendanceCalculationData.attendanceRecord.employees = employees;
    AttendanceCalculationData.statistics.totalEmployees = employees.length;

    utils.addDebug(attendanceEntry, `Získané dáta dochádzky`, {
        date: AttendanceCalculationData.attendanceRecord.date,
        employeeCount: employees.length
    });

    return {
        attendanceEntry: attendanceEntry,
        employees: employees,
        date: AttendanceCalculationData.attendanceRecord.date
    };
}

function processAttendanceCalculations(attendanceData, resultObject) {
    var attendanceEntry = attendanceData.attendanceEntry;
    var employees = attendanceData.employees;

    // Získaj časové údaje z aktuálneho záznamu dochádzky
    var arrival = core.safeFieldAccess(attendanceEntry, config.fields.attendance.arrival, null);
    var departure = core.safeFieldAccess(attendanceEntry, config.fields.attendance.departure, null);

    if (!arrival || !departure) {
        throw new Error("Chýba čas príchodu alebo odchodu v zázname dochádzky");
    }

    // Spracuj každého zamestnanca
    employees.forEach(function(employee, index) {
        try {
            if (!employee || !employee.id) {
                utils.addDebug(attendanceEntry, `Preskakujem neplatného zamestnanca na indexe ${index}`);
                return;
            }

            // Získaj informácie o zamestnancovi
            var employeeInfo = getEmployeeInfo(employee);

            // Získaj špecifické časové údaje pre tohto zamestnanca (ak existujú)
            var employeeTimeData = getEmployeeTimeData(attendanceEntry, employee, arrival, departure);

            // Vypočítaj odpracované hodiny
            var calculationResult = calculateEmployeeWorkHours(employeeTimeData, employeeInfo);

            // Ulož výsledok
            resultObject.addEmployeeResult(employee.id(), calculationResult);

            utils.addDebug(attendanceEntry, `Spracovaný zamestnanec: ${employeeInfo.fullName}`, {
                totalHours: calculationResult.totalDecimalHours,
                regularHours: calculationResult.regularHours,
                overtimeHours: calculationResult.overtimeHours
            });

        } catch (employeeError) {
            var errorResult = {
                employeeId: employee.id ? employee.id() : "unknown",
                employeeName: "Neznámy",
                error: employeeError.toString(),
                totalDecimalHours: 0,
                regularHours: 0,
                overtimeHours: 0
            };

            resultObject.addEmployeeResult(employee.id ? employee.id() : "error_" + index, errorResult);

            utils.addError(attendanceEntry, `Chyba spracovania zamestnanca na indexe ${index}: ${employeeError.message}`, "processAttendanceCalculations");
        }
    });
}

function getEmployeeInfo(employee) {
    var firstName = core.safeFieldAccess(employee, "Meno", "");
    var lastName = core.safeFieldAccess(employee, "Priezvisko", "");
    var nick = core.safeFieldAccess(employee, "Nick", "");
    var fullName = firstName + " " + lastName;

    return {
        id: employee.id(),
        firstName: firstName,
        lastName: lastName,
        nick: nick,
        fullName: fullName.trim() || nick || "Neznámy",
        entry: employee
    };
}

function getEmployeeTimeData(attendanceEntry, employee, defaultArrival, defaultDeparture) {
    // Skús získať špecifické časy pre zamestnanca z atribútov
    var employeeArrival = core.safeGetAttribute(
        attendanceEntry,
        config.fields.attendance.employees,
        "arrival",
        defaultArrival
    );

    var employeeDeparture = core.safeGetAttribute(
        attendanceEntry,
        config.fields.attendance.employees,
        "departure",
        defaultDeparture
    );

    return {
        arrival: employeeArrival || defaultArrival,
        departure: employeeDeparture || defaultDeparture,
        date: core.safeFieldAccess(attendanceEntry, config.fields.attendance.date, null)
    };
}

function calculateEmployeeWorkHours(timeData, employeeInfo) {
    try {
        if (!timeData.arrival || !timeData.departure) {
            return {
                employeeId: employeeInfo.id,
                employeeName: employeeInfo.fullName,
                error: "Chýba čas príchodu alebo odchodu",
                totalDecimalHours: 0,
                regularHours: 0,
                overtimeHours: 0,
                breakMinutes: 0,
                crossesMidnight: false
            };
        }

        // Použij business logiku pre výpočet
        var roundedArrival = business.roundToQuarterHour(timeData.arrival);
        var roundedDeparture = business.roundToQuarterHour(timeData.departure);

        var workResult = business.calculateWorkHours(roundedArrival, roundedDeparture);

        return {
            employeeId: employeeInfo.id,
            employeeName: employeeInfo.fullName,
            date: timeData.date ? moment(timeData.date).format("DD.MM.YYYY") : "bez dátumu",
            arrivalTime: roundedArrival,
            departureTime: roundedDeparture,
            totalMinutes: workResult.totalMinutes,
            totalDecimalHours: workResult.decimalHours,
            regularHours: workResult.regularHours,
            overtimeHours: workResult.overtimeHours,
            breakMinutes: workResult.breakMinutes,
            crossesMidnight: workResult.crossesMidnight,
            formatted: business.formatDecimalHours(workResult.decimalHours)
        };

    } catch (error) {
        return {
            employeeId: employeeInfo.id,
            employeeName: employeeInfo.fullName,
            error: error.toString(),
            totalDecimalHours: 0,
            regularHours: 0,
            overtimeHours: 0,
            breakMinutes: 0,
            crossesMidnight: false
        };
    }
}

function writeResultsToEmployees(calculationData) {
    var config = utils.config;

    Object.keys(calculationData.employeeResults).forEach(function(employeeId) {
        var result = calculationData.employeeResults[employeeId];

        try {
            // Získaj záznam zamestnanca
            var employeeEntry = utils.findEmployeeById(employeeId);

            if (!employeeEntry) {
                utils.addError(entry(), `Nenájdený záznam zamestnanca s ID: ${employeeId}`, "writeResultsToEmployees");
                return;
            }

            // Zapíš výsledky do polí zamestnanca
            if (!result.error) {
                // Aktualizuj polia s výsledkami výpočtu
                core.safeSet(employeeEntry, "Odpracované hodiny", result.totalDecimalHours);
                core.safeSet(employeeEntry, "Riadne hodiny", result.regularHours);
                core.safeSet(employeeEntry, "Nadčasové hodiny", result.overtimeHours);
                core.safeSet(employeeEntry, "Prestávky (min)", result.breakMinutes);

                // Pridaj info o výpočte
                core.addInfo(employeeEntry, `Výpočet dochádzky dokončený`, {
                    dátum: result.date,
                    príchod: result.arrivalTime,
                    odchod: result.departureTime,
                    celkom: result.formatted,
                    cezPolnoc: result.crossesMidnight
                }, {
                    scriptName: SCRIPT_CONFIG.name,
                    scriptVersion: SCRIPT_CONFIG.version,
                    sectionName: "Výsledok výpočtu",
                    includeHeader: false,
                    includeFooter: false
                });
            } else {
                // Zapíš chybu
                core.addError(employeeEntry, `Chyba výpočtu dochádzky: ${result.error}`, "calculateEmployeeWorkHours");
            }

        } catch (writeError) {
            utils.addError(entry(), `Chyba zápisu výsledkov pre zamestnanca ${result.employeeName}: ${writeError.message}`, "writeResultsToEmployees");
        }
    });
}

function validateEnvironment() {
    // Kontrola dostupnosti modulov
    if (!utils || !config || !core || !business) {
        throw new Error("Memento moduly nie sú dostupné");
    }

    // Kontrola knižníc
    if (!lib(SCRIPT_CONFIG.libraries.primary)) {
        throw new Error(`Knižnica ${SCRIPT_CONFIG.libraries.primary} nie je dostupná`);
    }

    if (!lib(SCRIPT_CONFIG.libraries.employees)) {
        throw new Error(`Knižnica ${SCRIPT_CONFIG.libraries.employees} nie je dostupná`);
    }

    // Kontrola poľa zamestnancov v aktuálnom zázname
    var employees = core.safeFieldAccess(entry(), config.fields.attendance.employees, []);
    if (!Array.isArray(employees) && !employees) {
        throw new Error("Pole Zamestnanci nie je dostupné v aktuálnom zázname dochádzky");
    }

    utils.addDebug(entry(), "Validácia prostredia úspešná", {
        modul: "AttendanceCalculator",
        knižnice: SCRIPT_CONFIG.libraries
    });
}

// ===== SPUSTENIE =====
main();