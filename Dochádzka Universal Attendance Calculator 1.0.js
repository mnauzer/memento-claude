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
var config = utils.config;
var core = MementoCore;
var business = MementoBusiness;

// ===== KONFIGURÁCIA SCRIPTU =====
var SCRIPT_CONFIG = {
    name: "Universal Attendance Calculator",
    version: "1.0",

    // Knižnice s fallbackmi
    libraries: {
        primary: (config && config.libraries && config.libraries.attendance) || "Dochádzka",
        employees: (config && config.libraries && config.libraries.employees) || "Zamestnanci"
    },

    // Polia s fallbackmi
    fields: {
        date: (config && config.fields && config.fields.attendance && config.fields.attendance.date) || "Dátum",
        arrival: (config && config.fields && config.fields.attendance && config.fields.attendance.arrival) || "Príchod",
        departure: (config && config.fields && config.fields.attendance && config.fields.attendance.departure) || "Odchod",
        employees: (config && config.fields && config.fields.attendance && config.fields.attendance.employees) || "Zamestnanci",
        workedHours: (config && config.fields && config.fields.attendance && config.fields.attendance.workedHours) || "Odpracované hodiny",

        // Spoločné polia
        debugLog: (config && config.fields && config.fields.common && config.fields.common.debugLog) || "Debug_Log",
        errorLog: (config && config.fields && config.fields.common && config.fields.common.errorLog) || "Error_Log",
        info: (config && config.fields && config.fields.common && config.fields.common.info) || "info"
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
    AttendanceCalculationData.attendanceRecord.date = core.safeGet(
        attendanceEntry,
        SCRIPT_CONFIG.fields.date,
        null
    );

    // Získaj zamestnancov z aktuálneho záznamu dochádzky
    var employees = core.safeGet(
        attendanceEntry,
        SCRIPT_CONFIG.fields.employees,
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
    var arrival = core.safeGet(attendanceEntry, SCRIPT_CONFIG.fields.arrival, null);
    var departure = core.safeGet(attendanceEntry, SCRIPT_CONFIG.fields.departure, null);

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
    var firstName = core.safeGet(employee, "Meno", "");
    var lastName = core.safeGet(employee, "Priezvisko", "");
    var nick = core.safeGet(employee, "Nick", "");
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
        SCRIPT_CONFIG.fields.employees,
        "arrival",
        defaultArrival
    );

    var employeeDeparture = core.safeGetAttribute(
        attendanceEntry,
        SCRIPT_CONFIG.fields.employees,
        "departure",
        defaultDeparture
    );

    return {
        arrival: employeeArrival || defaultArrival,
        departure: employeeDeparture || defaultDeparture,
        date: core.safeGet(attendanceEntry, SCRIPT_CONFIG.fields.date, null)
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

function getEmployeePaidAmount(employeeEntry) {
    try {
        // Získaj meno zamestnanca pre vyhľadávanie v Pokladni
        var employeeName = core.safeGet(employeeEntry, "Meno", "") + " " + core.safeGet(employeeEntry, "Priezvisko", "");
        employeeName = employeeName.trim();

        if (!employeeName) {
            return 0;
        }

        // Vyhľadaj platby v knižnici Pokladňa
        var cashRegisterLibrary = lib("Pokladňa");
        if (!cashRegisterLibrary) {
            return 0;
        }

        var allEntries = cashRegisterLibrary.entries();
        var totalPaid = 0;

        for (var i = 0; i < allEntries.length; i++) {
            var entry = allEntries[i];

            // Skontroluj či je to platba mzdy
            var description = core.safeGet(entry, "Popis", "").toLowerCase();
            var recipient = core.safeGet(entry, "Príjemca", "").toLowerCase();

            if ((description.indexOf("mzda") !== -1 || description.indexOf("plat") !== -1) &&
                (recipient.indexOf(employeeName.toLowerCase()) !== -1)) {

                var amount = parseFloat(core.safeGet(entry, "Suma", "0")) || 0;
                totalPaid += Math.abs(amount); // Beriem absolútnu hodnotu
            }
        }

        return totalPaid;

    } catch (error) {
        throw new Error("Chyba vyhľadávania platieb: " + error.message);
    }
}

function writeResultsToEmployees(calculationData) {
    Object.keys(calculationData.employeeResults).forEach(function(employeeId) {
        var result = calculationData.employeeResults[employeeId];

        try {
            // Získaj záznam zamestnanca
            var employeeEntry = utils.findEmployeeById(employeeId);

            if (!employeeEntry) {
                utils.addError(entry(), "Nenájdený záznam zamestnanca s ID: " + employeeId, "writeResultsToEmployees");
                return;
            }

            // Vyčisti logy pre nový výpočet
            core.safeSet(employeeEntry, SCRIPT_CONFIG.fields.debugLog, "");
            core.safeSet(employeeEntry, SCRIPT_CONFIG.fields.errorLog, "");

            // Debug začiatok spracovania
            utils.addDebug(employeeEntry, "🚀 === ŠTART VÝPOČTU DOCHÁDZKY ===");
            utils.addDebug(employeeEntry, "👤 Zamestnanec: " + result.employeeName);
            utils.addDebug(employeeEntry, "📅 Dátum: " + result.date);

            if (result.error) {
                // Zapíš chybu do zamestnanca
                utils.addError(employeeEntry, "Chyba výpočtu dochádzky: " + result.error, "calculateEmployeeWorkHours");
                return;
            }

            // 1. ODPRACOVANÉ - celkové odpracované hodiny z dochádzky
            var totalHours = result.totalDecimalHours;
            core.safeSet(employeeEntry, "Odpracované", totalHours);
            utils.addDebug(employeeEntry, "⏰ Odpracované hodiny: " + totalHours.toFixed(2) + "h");

            // 2. AKTUÁLNA HODINOVKA - získaj z MementoBusiness alebo z poľa
            var hourlyRate = 0;
            try {
                // Skús získať z business funkcie ak existuje
                if (business && business.getEmployeeHourlyRate) {
                    hourlyRate = business.getEmployeeHourlyRate(employeeEntry);
                }

                // Fallback - skús získať z poľa Hodinovka
                if (!hourlyRate || hourlyRate <= 0) {
                    hourlyRate = parseFloat(core.safeGet(employeeEntry, "Hodinovka", "0")) || 0;
                }

                core.safeSet(employeeEntry, "Aktuálna hodinovka", hourlyRate);
                utils.addDebug(employeeEntry, "💰 Aktuálna hodinovka: " + hourlyRate.toFixed(2) + " €/h");
            } catch (rateError) {
                utils.addError(employeeEntry, "Chyba získania hodinovej sadzby: " + rateError.message, "getEmployeeHourlyRate");
                hourlyRate = 0;
            }

            // 3. ZAROBENÉ - vypočítaj z hodín × sadzba
            var earned = totalHours * hourlyRate;
            core.safeSet(employeeEntry, "Zarobené", earned);
            utils.addDebug(employeeEntry, "💵 Zarobené: " + earned.toFixed(2) + " € (" + totalHours.toFixed(2) + "h × " + hourlyRate.toFixed(2) + "€/h)");

            // 4. VYPLATENÉ - získaj z knižnice Pokladňa
            var paid = 0;
            try {
                paid = getEmployeePaidAmount(employeeEntry);
                core.safeSet(employeeEntry, "Vyplatené", paid);
                utils.addDebug(employeeEntry, "💳 Vyplatené: " + paid.toFixed(2) + " € (z Pokladne)");
            } catch (paidError) {
                utils.addError(employeeEntry, "Chyba získania vyplatených súm: " + paidError.message, "getEmployeePaidAmount");
                paid = 0;
            }

            // 5. PREPLATOK/NEDOPLATOK - rozdiel medzi Zarobené a Vyplatené
            var balance = earned - paid;
            core.safeSet(employeeEntry, "Preplatok/Nedoplatok", balance);

            var balanceIcon = balance > 0 ? "💰" : balance < 0 ? "❌" : "✅";
            var balanceText = balance > 0 ? "PREPLATOK" : balance < 0 ? "NEDOPLATOK" : "VYROVNANÉ";
            utils.addDebug(employeeEntry, balanceIcon + " " + balanceText + ": " + balance.toFixed(2) + " €");

            // Súhrn výpočtu
            utils.addDebug(employeeEntry, "🎯 === SÚHRN VÝPOČTU ===");
            utils.addDebug(employeeEntry, "⏰ Príchod: " + result.arrivalTime);
            utils.addDebug(employeeEntry, "⏰ Odchod: " + result.departureTime);
            utils.addDebug(employeeEntry, "📊 Celkom hodín: " + result.formatted);
            utils.addDebug(employeeEntry, "🌙 Cez polnoc: " + (result.crossesMidnight ? "ÁNO" : "NIE"));
            utils.addDebug(employeeEntry, "☕ Prestávky: " + result.breakMinutes + " min");

            // Info záznam s novými addInfo funkciami
            core.addInfo(employeeEntry, "Výpočet dochádzky a mzdy dokončený", {
                dochádzka: {
                    dátum: result.date,
                    príchod: result.arrivalTime,
                    odchod: result.departureTime,
                    odpracované: totalHours.toFixed(2) + "h",
                    prestávky: result.breakMinutes + "min"
                },
                finance: {
                    hodinovka: hourlyRate.toFixed(2) + "€/h",
                    zarobené: earned.toFixed(2) + "€",
                    vyplatené: paid.toFixed(2) + "€",
                    bilancia: balance.toFixed(2) + "€"
                }
            }, {
                scriptName: SCRIPT_CONFIG.name,
                scriptVersion: SCRIPT_CONFIG.version,
                moduleName: "AttendanceCalculator",
                sectionName: "Výsledok výpočtu",
                includeHeader: true,
                includeFooter: false
            });

            utils.addDebug(employeeEntry, "✅ Výpočet dokončený úspešne");

        } catch (writeError) {
            utils.addError(employeeEntry || entry(), "Chyba zápisu výsledkov pre zamestnanca " + result.employeeName + ": " + writeError.message, "writeResultsToEmployees");
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
    var employees = core.safeGet(entry(), SCRIPT_CONFIG.fields.employees, []);
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