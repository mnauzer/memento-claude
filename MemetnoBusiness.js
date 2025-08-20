// ==============================================
// MEMENTOBUSINESS - Business logika a výpočty
// Verzia: 1.0 | Dátum: August 2025 | Autor: ASISTANTO
// ==============================================
// 📋 OBSAH:
//    - Pracovné výpočty (hodiny, mzdy)
//    - Zamestnanci funkcie
//    - Dochádzka špecifické funkcie
//    - Firemné procesy
// ==============================================
// 🔗 ZÁVISLOSŤ: MementoCore.js

var MementoBusiness = (function() {
    'use strict';
    
    // Import MementoCore
    // Lazy loading MementoCore
    var core;
    function ensureCore() {
        if (!core && typeof MementoCore !== 'undefined') {
            core = MementoCore;
        }
        return core;
    }
    
    // ==============================================
    // CONFIGURATION
    // ==============================================
    
    var config = {
        version: "1.0",
        
        // Business rules
        defaultWorkHoursPerDay: 8,
        overtimeThreshold: 8,
        weekendMultiplier: 1.5,
        holidayMultiplier: 2.0,
        
        // Libraries
        employeesLibrary: "Zamestnanci",
        ratesLibrary: "sadzby zamestnancov",
        attendanceLibrary: "Dochádzka"
    };
    
    // ==============================================
    // WORK TIME CALCULATIONS
    // ==============================================
    
    function calculateWorkHours(startTime, endTime) {
        ensureCore();
        try {
            var start = moment(startTime);
            var end = moment(endTime);
            
            if (!start.isValid() || !end.isValid()) {
                return {
                    hours: 0,
                    minutes: 0,
                    crossesMidnight: false,
                    error: "Invalid time format"
                };
            }
            
            var diffMinutes = end.diff(start, 'minutes');
            var crossesMidnight = false;
            
            // Ak je rozdiel záporný, práca cez polnoc
            if (diffMinutes < 0) {
                diffMinutes += 24 * 60;
                crossesMidnight = true;
            }
            
            var hours = Math.floor(diffMinutes / 60);
            var minutes = diffMinutes % 60;
            
            // Výpočet nadčasov
            var regularHours = Math.min(hours + (minutes / 60), config.defaultWorkHoursPerDay);
            var overtimeHours = Math.max(0, (hours + (minutes / 60)) - config.defaultWorkHoursPerDay);
            
            return {
                hours: hours + (minutes / 60),
                hoursOnly: hours,
                minutes: minutes,
                totalMinutes: diffMinutes,
                regularHours: regularHours,
                overtimeHours: overtimeHours,
                crossesMidnight: crossesMidnight,
                formatted: core.formatTime(hours * 60 + minutes)
            };
            
        } catch (error) {
            core.addError(entry(), error.toString(), "calculateWorkHours", error);
            return {
                hours: 0,
                minutes: 0,
                error: error.toString()
            };
        }
    }
    
    function isWeekend(date) {
        ensureCore();
        var day = moment(date).day();
        return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
    }
    
    function isHoliday(date) {
        
        // TODO: Implementovať kontrolu sviatkov
        // Môže sa napojiť na knižnicu sviatkov
        return false;
    }
    
    function getWorkDayMultiplier(date) {
        ensureCore();
        if (isHoliday(date)) {
            return config.holidayMultiplier;
        } else if (isWeekend(date)) {
            return config.weekendMultiplier;
        }
        return 1.0;
    }
    
    // ==============================================
    // EMPLOYEE FUNCTIONS
    // ==============================================
    
    function formatEmployeeName(employeeEntry) {
        ensureCore();
        if (!employeeEntry) return "Neznámy";
        
        try {
            var nick = core.safeGet(employeeEntry, "Nick", "");
            var meno = core.safeGet(employeeEntry, "Meno", "");
            var priezvisko = core.safeGet(employeeEntry, "Priezvisko", "");
            
            // Priorita: nick (priezvisko) alebo meno priezvisko
            if (nick) {
                return priezvisko ? nick + " (" + priezvisko + ")" : nick;
            }
            
            if (meno || priezvisko) {
                return (meno + " " + priezvisko).trim();
            }
            
            return "Zamestnanec #" + core.safeGet(employeeEntry, "ID", "?");
            
        } catch (error) {
            return "Neznámy";
        }
    }
    
    function getEmployeeDetails(employeeEntry, date) {
        ensureCore();
        if (!employeeEntry) {
            return {
                hasValidRate: false,
                error: "No employee entry provided"
            };
        }
        
        try {
            var details = {
                id: core.safeGet(employeeEntry, "ID", ""),
                nick: core.safeGet(employeeEntry, "Nick", ""),
                name: core.safeGet(employeeEntry, "Meno", ""),
                surname: core.safeGet(employeeEntry, "Priezvisko", ""),
                fullName: formatEmployeeName(employeeEntry),
                position: core.safeGet(employeeEntry, "Pozícia", ""),
                department: core.safeGet(employeeEntry, "Oddelenie", ""),
                email: core.safeGet(employeeEntry, "Email", ""),
                phone: core.safeGet(employeeEntry, "Telefón", ""),
                hasValidRate: false,
                hourlyRate: 0,
                rateValidFrom: null,
                employmentType: core.safeGet(employeeEntry, "Typ úväzku", "")
            };
            
            // Získaj hodinovú sadzbu
            var ratesLib = libByName(config.ratesLibrary);
            if (ratesLib) {
                var rates = employeeEntry.linksFrom(config.ratesLibrary, "Zamestnanec");
                
                if (rates && rates.length > 0) {
                    // Zoraď podľa dátumu platnosti
                    rates.sort(function(a, b) {
                        var dateA = moment(a.field("Platnosť od"));
                        var dateB = moment(b.field("Platnosť od"));
                        return dateB.valueOf() - dateA.valueOf();
                    });
                    
                    // Nájdi platnú sadzbu
                    var checkDate = date ? moment(date) : moment();
                    
                    for (var i = 0; i < rates.length; i++) {
                        var rate = rates[i];
                        var validFrom = moment(rate.field("Platnosť od"));
                        
                        if (validFrom.isSameOrBefore(checkDate)) {
                            details.hourlyRate = parseFloat(rate.field("Sadzba")) || 0;
                            details.rateValidFrom = validFrom.toDate();
                            details.hasValidRate = details.hourlyRate > 0;
                            details.rateType = rate.field("Typ sadzby") || "Hodinová";
                            break;
                        }
                    }
                }
            }
            
            return details;
            
        } catch (error) {
            core.addError(entry(), error.toString(), "getEmployeeDetails", error);
            return {
                hasValidRate: false,
                error: error.toString()
            };
        }
    }
    
    function findEmployeeByNick(nick) {
        ensureCore();
        try {
            var empLib = libByName(config.employeesLibrary);
            if (!empLib) return null;
            
            var employees = empLib.find("Nick", nick);
            return employees.length > 0 ? employees[0] : null;
            
        } catch (error) {
            core.addError(entry(), error.toString(), "findEmployeeByNick", error);
            return null;
        }
    }
    
    // ==============================================
    // ATTENDANCE CALCULATIONS
    // ==============================================
    
    function calculateDailyWage(employeeEntry, workHours, date, extras) {
        
        extras = extras || {};
        
        try {
            var empDetails = getEmployeeDetails(employeeEntry, date);
            if (!empDetails.hasValidRate) {
                return {
                    success: false,
                    error: "Employee has no valid rate",
                    wage: 0
                };
            }
            
            var baseWage = empDetails.hourlyRate * workHours.hours;
            var overtimeWage = 0;
            var weekendBonus = 0;
            var wageBonus = extras.wageBonus || 0; // Príplatok za prácu
            baseWage += wageBonus * workHours.hours; // Pridaj príplatok k základnej mzde
            var bonuses = extras.bonus || 0;
            var deductions = extras.deduction || 0;
            var mealAllowance = extras.mealAllowance || 0;
            
            // Výpočet nadčasov
            if (workHours.overtimeHours > 0) {
                var overtimeRate = empDetails.hourlyRate * 1.25; // 25% navýšenie
                overtimeWage = overtimeRate * workHours.overtimeHours;
            }
            
            // Víkendový príplatok
            var dayMultiplier = getWorkDayMultiplier(date);
            if (dayMultiplier > 1) {
                weekendBonus = baseWage * (dayMultiplier - 1);
            }
            
            var totalWage = baseWage + overtimeWage + weekendBonus + bonuses + mealAllowance - deductions;
            
            return {
                success: true,
                baseWage: Math.round(baseWage * 100) / 100,
                overtimeWage: Math.round(overtimeWage * 100) / 100,
                weekendBonus: Math.round(weekendBonus * 100) / 100,
                bonuses: bonuses,
                deductions: deductions,
                mealAllowance: mealAllowance,
                totalWage: Math.round(totalWage * 100) / 100,
                hourlyRate: empDetails.hourlyRate,
                details: {
                    regularHours: workHours.regularHours,
                    overtimeHours: workHours.overtimeHours,
                    dayType: isHoliday(date) ? "holiday" : (isWeekend(date) ? "weekend" : "workday"),
                    multiplier: dayMultiplier
                }
            };
            
        } catch (error) {
            core.addError(entry(), error.toString(), "calculateDailyWage", error);
            return {
                success: false,
                error: error.toString(),
                wage: 0
            };
        }
    }
    
    // ==============================================
    // SUMMARY FUNCTIONS
    // ==============================================
    
    function generateAttendanceSummary(attendanceEntry) {
        
        try {
            var employees = core.safeGetLinks(attendanceEntry, "Zamestnanci");
            var date = attendanceEntry.field("Dátum");
            var arrival = attendanceEntry.field("Príchod");
            var departure = attendanceEntry.field("Odchod");
            
            var summary = {
                date: date,
                arrival: arrival,
                departure: departure,
                employeeCount: employees.length,
                totalHours: 0,
                totalWages: 0,
                employees: []
            };
            
            // Výpočet pracovného času
            var workTime = calculateWorkHours(arrival, departure);
            
            // Spracuj každého zamestnanca
            for (var i = 0; i < employees.length; i++) {
                var emp = employees[i];
                var empName = formatEmployeeName(emp);
                
                // Získaj atribúty
                var extras = {
                    wageBonus: parseFloat(emp.attr("+príplatok (€/h)")) || 0,
                    bonus: parseFloat(emp.attr("+prémia (€)")) || 0,
                    deduction: parseFloat(emp.attr("-pokuta (€)")) || 0,
                    mealAllowance: parseFloat(emp.attr("stravné (€)")) || 0
                };
                
                var wageCalc = calculateDailyWage(emp, workTime, date, extras);
                
                summary.employees.push({
                    name: empName,
                    hours: workTime.hours,
                    wage: wageCalc.totalWage,
                    details: wageCalc
                });
                
                summary.totalHours += workTime.hours;
                summary.totalWages += wageCalc.totalWage;
            }
            
            summary.averageWagePerPerson = summary.employeeCount > 0 ? 
                Math.round(summary.totalWages / summary.employeeCount * 100) / 100 : 0;
            
            return summary;
            
        } catch (error) {
            core.addError(entry(), error.toString(), "generateAttendanceSummary", error);
            return null;
        }
    }
    
    // ==============================================
    // PUBLIC API
    // ==============================================
    
    return {
        // Version
        version: config.version,
        
        // Work time
        calculateWorkHours: calculateWorkHours,
        isWeekend: isWeekend,
        isHoliday: isHoliday,
        getWorkDayMultiplier: getWorkDayMultiplier,
        
        // Employees
        formatEmployeeName: formatEmployeeName,
        getEmployeeDetails: getEmployeeDetails,
        findEmployeeByNick: findEmployeeByNick,
        
        // Wages
        calculateDailyWage: calculateDailyWage,
        
        // Summary
        generateAttendanceSummary: generateAttendanceSummary
    };
})();