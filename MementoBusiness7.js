// ==============================================
// MEMENTO BUSINESS - Business logika
// Verzia: 7.0 | Dátum: August 2025 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
//    - Business funkcie pre dochádzku a mzdy
//    - Výpočty pracovného času
//    - Práca so zamestnancami
//    - Sviatky a víkendy
// ==============================================
// 🔧 CHANGELOG v7.0:
//    - Zjednodušená štruktúra
//    - Využitie centrálneho CONFIGu
//    - Slovenské komentáre
//    - Optimalizované výpočty
// ==============================================

var MementoBusiness = (function() {
    'use strict';
    
    var version = "7.0";
    
    // Lazy loading pre závislosti
    var _config = null;
    var _core = null;
    
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
    
    // ==============================================
    // ČASOVÉ VÝPOČTY
    // ==============================================
    
    /**
     * Vypočíta odpracované hodiny
     * @param {Date|string} start - Čas príchodu
     * @param {Date|string} end - Čas odchodu
     * @param {number} breakMinutes - Prestávka v minútach (optional)
     * @returns {Object} {hours: number, minutes: number, totalMinutes: number}
     */
    function calculateWorkHours(startTime, endTime) {
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
        // try {
        //     if (!start || !end) {
        //         return { hours: 0, minutes: 0, totalMinutes: 0 };
        //     }
            
        //     var startMoment = moment(start);
        //     var endMoment = moment(end);
            
        //     // Ak je koniec pred začiatkom, predpokladáme prechod cez polnoc
        //     if (endMoment.isBefore(startMoment)) {
        //         endMoment.add(1, 'day');
        //     }
            
        //     var diffMinutes = endMoment.diff(startMoment, 'minutes');
            
        //     // Odpočítaj prestávku
        //     if (breakMinutes && breakMinutes > 0) {
        //         diffMinutes -= breakMinutes;
        //     }
            
        //     // Zabezpeč nezáporné hodnoty
        //     diffMinutes = Math.max(0, diffMinutes);
            
        //     return {
        //         hours: Math.floor(diffMinutes / 60),
        //         minutes: diffMinutes % 60,
        //         totalMinutes: diffMinutes
        //     };
            
        // } catch (error) {
        //     return { hours: 0, minutes: 0, totalMinutes: 0 };
        // }
    }
    
    /**
     * Kontroluje či je dátum víkend
     * @param {Date|string} date - Dátum na kontrolu
     * @returns {boolean} True ak je víkend
     */
    function isWeekend(date) {
        try {
            var day = moment(date).day();
            return day === 0 || day === 6; // Nedeľa = 0, Sobota = 6
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Kontroluje či je dátum sviatok
     * @param {Date|string} date - Dátum na kontrolu
     * @returns {boolean} True ak je sviatok
     */
    function isHoliday(date) {
        try {
            var config = getConfig();
            var year = moment(date).year();
            
            // Slovenské štátne sviatky
            var holidays = [
                year + "-01-01", // Deň vzniku SR
                year + "-01-06", // Zjavenie Pána
                year + "-05-01", // Sviatok práce
                year + "-05-08", // Deň víťazstva
                year + "-07-05", // Cyril a Metod
                year + "-08-29", // SNP
                year + "-09-01", // Deň ústavy
                year + "-09-15", // Sedembolestná
                year + "-11-01", // Sviatok všetkých svätých
                year + "-11-17", // Deň boja za slobodu RIP
                year + "-12-24", // Štedrý deň
                year + "-12-25", // 1. sviatok vianočný
                year + "-12-26"  // 2. sviatok vianočný
            ];
            
            // Pohyblivé sviatky (potrebuje výpočet)
            // Veľký piatok, Veľkonočný pondelok
            var easter = calculateEaster(year);
            if (easter) {
                holidays.push(
                    moment(easter).subtract(2, 'days').format('YYYY-MM-DD'), // Veľký piatok
                    moment(easter).add(1, 'days').format('YYYY-MM-DD')      // Veľkonočný pondelok
                );
            }
            
            var dateStr = moment(date).format('YYYY-MM-DD');
            return holidays.indexOf(dateStr) !== -1;
            
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Vypočíta dátum Veľkej noci
     * @param {number} year - Rok
     * @returns {Date} Dátum Veľkonočnej nedele
     */
    function calculateEaster(year) {
        // Algoritmus pre výpočet Veľkej noci
        var a = year % 19;
        var b = Math.floor(year / 100);
        var c = year % 100;
        var d = Math.floor(b / 4);
        var e = b % 4;
        var f = Math.floor((b + 8) / 25);
        var g = Math.floor((b - f + 1) / 3);
        var h = (19 * a + b - d - g + 15) % 30;
        var i = Math.floor(c / 4);
        var k = c % 4;
        var l = (32 + 2 * e + 2 * i - h - k) % 7;
        var m = Math.floor((a + 11 * h + 22 * l) / 451);
        var month = Math.floor((h + l - 7 * m + 114) / 31);
        var day = ((h + l - 7 * m + 114) % 31) + 1;
        
        return new Date(year, month - 1, day);
    }
    
    // ==============================================
    // ZAMESTNANCI
    // ==============================================
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
            var nick = core.safeGet(employeeEntry, config.employees.nick, "");
            var meno = core.safeGet(employeeEntry, config.employees.name, "");
            var priezvisko = core.safeGet(employeeEntry, config.employees.surname, "");
            
            // Priorita: nick (priezvisko) alebo meno priezvisko
            if (nick) {
                return priezvisko ? nick + " (" + priezvisko + ")" : nick;
            }
            
            if (meno || priezvisko) {
                return (meno + " " + priezvisko).trim();
            }
            
            return "Zamestnanec #" + core.safeGet(employeeEntry, config.employees.ID, "?");
            
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
                id: core.safeGet(employeeEntry, config.employee.ID, ""),
                nick: core.safeGet(employeeEntry, config.employee.nick, ""),
                name: core.safeGet(employeeEntry, config.employee.name, ""),
                surname: core.safeGet(employeeEntry, config.employee.surname, ""),
                fullName: formatEmployeeName(employeeEntry),
                position: core.safeGet(employeeEntry, config.employee.position, ""),
                email: core.safeGet(employeeEntry, config.employee.email, ""),
                phone: core.safeGet(employeeEntry, config.employee.phone, ""),
                hasValidRate: false,
                hourlyRate: 0,
                rateValidFrom: null,
                employmentType: core.safeGet(employeeEntry, config.employee.employmentType, "")
            };
            
            // Získaj hodinovú sadzbu
            var ratesLib = libByName(config.ratesLibrary);
            if (ratesLib) {
                var rates = employeeEntry.linksFrom(config.ratesLibrary, config.employeesRate.employee);
                
                if (rates && rates.length > 0) {
                    // Zoraď podľa dátumu platnosti
                    rates.sort(function(a, b) {
                        var dateA = moment(a.field(config.employeesRate.validFrom));
                        var dateB = moment(b.field(config.employeesRate.validFrom));
                        return dateB.valueOf() - dateA.valueOf();
                    });
                    
                    // Nájdi platnú sadzbu
                    var checkDate = date ? moment(date) : moment();
                    
                    for (var i = 0; i < rates.length; i++) {
                        var rate = rates[i];
                        var validFrom = moment(rate.field(config.employeesRate.validFrom));
                        
                        if (validFrom.isSameOrBefore(checkDate)) {
                            details.hourlyRate = parseFloat(rate.field(config.employeesRate.rate)) || 0;
                            details.rateValidFrom = validFrom.toDate();
                            details.hasValidRate = details.hourlyRate > 0;
                            details.rateType = rate.field(config.employeesRate.type) || "Hodinová";
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
            
            var employees = empLib.find(config.employees.nick, nick);
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
            var employees = core.safeGetLinks(attendanceEntry, config.attendandce.employees, config.employeesRate.employee);
            var date = attendanceEntry.field(config.attendandce.date);
            var arrival = attendanceEntry.field(config.attendandce.arrival);
            var departure = attendanceEntry.field(config.attendandce.departure);
            
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
                    wageBonus: parseFloat(emp.attr(config.attendandce.employeeAttr.wageBonus)) || 0,
                    bonus: parseFloat(emp.attr(config.attendandce.employeeAttr.bonus)) || 0,
                    deduction: parseFloat(emp.attr(config.attendandce.employeeAttr.deduction)) || 0,
                    mealAllowance: parseFloat(emp.attr(config.attendandce.employeeAttr.mealAllowance)) || 0
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
    // /**
    //  * Formátuje meno zamestnanca
    //  * @param {Entry|Object} employee - Zamestnanec entry alebo objekt
    //  * @param {string} format - Formát: "full", "short", "nick" (default: "full")
    //  * @returns {string} Formátované meno
    //  */
    // function formatEmployeeName(employee, format) {
    //     if (!employeeEntry) return "Neznámy";
        
    //     try {
    //         var nick = core.safeGet(employeeEntry, config.employees.nick, "");
    //         var meno = core.safeGet(employeeEntry, config.employees.name, "");
    //         var priezvisko = core.safeGet(employeeEntry, config.employees.surname, "");
            
    //         // Priorita: nick (priezvisko) alebo meno priezvisko
    //         if (nick) {
    //             return priezvisko ? nick + " (" + priezvisko + ")" : nick;
    //         }
            
    //         if (meno || priezvisko) {
    //             return (meno + " " + priezvisko).trim();
    //         }
            
    //         return "Zamestnanec #" + core.safeGet(employeeEntry, config.employees.ID, "?");
            
    //     } catch (error) {
    //         return "Neznámy";
    //     }

    //     // try {
    //     //     if (!employee) return "Neznámy";
            
    //     //     var config = getConfig();
    //     //     var fields = config.fields.employee;
            
    //     //     // Získaj údaje
    //     //     var nick = employee.field ? employee.field(fields.nick) : employee[fields.nick];
    //     //     var firstName = employee.field ? employee.field(fields.firstName) : employee[fields.firstName];
    //     //     var lastName = employee.field ? employee.field(fields.lastName) : employee[fields.lastName];
            
    //     //     format = format || "full";
            
    //     //     switch (format) {
    //     //         case "nick":
    //     //             return nick || "Neznámy";
                    
    //     //         case "short":
    //     //             return nick + " (" + lastName + ")";
                    
    //     //         case "full":
    //     //         default:
    //     //             return firstName + " " + lastName + " (" + nick + ")";
    //     //     }
            
    //     // } catch (error) {
    //     //     return "Neznámy";
    //     // }
    // }
    
    // /**
    //  * Získa detaily zamestnanca
    //  * @param {Entry|string} employee - Zamestnanec entry alebo nick
    //  * @param {Date} date - Dátum pre ktorý získať údaje (pre mzdy)
    //  * @returns {Object} Detaily zamestnanca
    //  */
    // function getEmployeeDetails(employee, date) {
    //        if (!employeeEntry) {
    //         return {
    //             hasValidRate: false,
    //             error: "No employee entry provided"
    //         };
    //     }
        
    //     try {
    //         var details = {
    //             id: core.safeGet(employeeEntry, config.employee.ID, ""),
    //             nick: core.safeGet(employeeEntry, config.employee.nick, ""),
    //             name: core.safeGet(employeeEntry, config.employee.name, ""),
    //             surname: core.safeGet(employeeEntry, config.employee.surname, ""),
    //             fullName: formatEmployeeName(employeeEntry),
    //             position: core.safeGet(employeeEntry, config.employee.position, ""),
    //             email: core.safeGet(employeeEntry, config.employee.email, ""),
    //             phone: core.safeGet(employeeEntry, config.employee.phone, ""),
    //             hasValidRate: false,
    //             hourlyRate: 0,
    //             rateValidFrom: null,
    //             employmentType: core.safeGet(employeeEntry, config.employee.employmentType, "")
    //         };
            
    //         // Získaj hodinovú sadzbu
    //         var ratesLib = libByName(config.ratesLibrary);
    //         if (ratesLib) {
    //             var rates = employeeEntry.linksFrom(config.ratesLibrary, config.employeesRate.employee);
                
    //             if (rates && rates.length > 0) {
    //                 // Zoraď podľa dátumu platnosti
    //                 rates.sort(function(a, b) {
    //                     var dateA = moment(a.field(config.employeesRate.validFrom));
    //                     var dateB = moment(b.field(config.employeesRate.validFrom));
    //                     return dateB.valueOf() - dateA.valueOf();
    //                 });
                    
    //                 // Nájdi platnú sadzbu
    //                 var checkDate = date ? moment(date) : moment();
                    
    //                 for (var i = 0; i < rates.length; i++) {
    //                     var rate = rates[i];
    //                     var validFrom = moment(rate.field(config.employeesRate.validFrom));
                        
    //                     if (validFrom.isSameOrBefore(checkDate)) {
    //                         details.hourlyRate = parseFloat(rate.field(config.employeesRate.rate)) || 0;
    //                         details.rateValidFrom = validFrom.toDate();
    //                         details.hasValidRate = details.hourlyRate > 0;
    //                         details.rateType = rate.field(config.employeesRate.type) || "Hodinová";
    //                         break;
    //                     }
    //                 }
    //             }
    //         }
            
    //         return details;
            
    //     } catch (error) {
    //         core.addError(entry(), error.toString(), "getEmployeeDetails", error);
    //         return {
    //             hasValidRate: false,
    //             error: error.toString()
    //         };
    //     }
    //     // try {
    //     //     var config = getConfig();
    //     //     var core = getCore();
            
    //     //     // Ak je to string (nick), nájdi zamestnanca
    //     //     if (typeof employee === 'string') {
    //     //         employee = findEmployeeByNick(employee);
    //     //         if (!employee) {
    //     //             return null;
    //     //         }
    //     //     }
            
    //     //     var details = {
    //     //         id: core.safeGet(employee, config.fields.common.id),
    //     //         nick: core.safeGet(employee, config.fields.employee.nick),
    //     //         firstName: core.safeGet(employee, config.fields.employee.firstName),
    //     //         lastName: core.safeGet(employee, config.fields.employee.lastName),
    //     //         fullName: formatEmployeeName(employee),
    //     //         status: core.safeGet(employee, config.fields.employee.status),
    //     //         position: core.safeGet(employee, config.fields.employee.position),
    //     //         department: core.safeGet(employee, config.fields.employee.department),
    //     //         phone: core.safeGet(employee, config.fields.employee.phone),
    //     //         email: core.safeGet(employee, config.fields.employee.email),
    //     //         telegramId: core.safeGet(employee, config.fields.employee.telegramId)
    //     //     };
            
    //     //     // Získaj mzdové údaje ak je zadaný dátum
    //     //     if (date) {
    //     //         var wageData = getEmployeeWageForDate(employee, date);
    //     //         if (wageData) {
    //     //             details.hourlyRate = wageData.hourlyRate;
    //     //             details.rateType = wageData.rateType;
    //     //             details.validFrom = wageData.validFrom;
    //     //             details.validTo = wageData.validTo;
    //     //         }
    //     //     }
            
    //     //     return details;
            
    //     // } catch (error) {
    //     //     return null;
    //     // }
    // }
    
    // /**
    //  * Nájde zamestnanca podľa nicku
    //  * @param {string} nick - Nick zamestnanca
    //  * @returns {Entry|null} Entry zamestnanca alebo null
    //  */
    // function findEmployeeByNick(nick) {
    //     try {
    //         if (!nick) return null;
            
    //         var config = getConfig();
    //         var lib = libByName(config.libraries.employees);
    //         if (!lib) return null;
            
    //         var employees = lib.find(config.fields.employee.nick, nick);
    //         return employees && employees.length > 0 ? employees[0] : null;
            
    //     } catch (error) {
    //         return null;
    //     }
    // }
    
    // /**
    //  * Získa aktívnych zamestnancov
    //  * @returns {Array} Pole aktívnych zamestnancov
    //  */
    function getActiveEmployees() {
        try {
            var config = getConfig();
            var lib = libByName(config.libraries.employees);
            if (!lib) return [];
            
            var allEmployees = lib.entries();
            var activeEmployees = [];
            
            for (var i = 0; i < allEmployees.length; i++) {
                var employee = allEmployees[i];
                var status = employee.field(config.fields.employee.status);
                
                if (status === config.constants.status.active) {
                    activeEmployees.push(employee);
                }
            }
            
            return activeEmployees;
            
        } catch (error) {
            return [];
        }
    }
    
    // ==============================================
    // MZDY A SADZBY
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
    /**
     * Získa hodinovú sadzbu zamestnanca pre daný dátum
     * @param {Entry} employee - Zamestnanec
     * @param {Date} date - Dátum
     * @returns {Object|null} {hourlyRate: number, rateType: string, validFrom: Date, validTo: Date}
     */
    function getEmployeeWageForDate(employee, date) {
        try {
            if (!employee || !date) return null;
            
            var config = getConfig();
            var core = getCore();
            
            // Nájdi sadzby cez linksFrom
            var wageRecords = employee.linksFrom(
                config.libraries.wages,
                config.fields.wages.employee
            );
            
            if (!wageRecords || wageRecords.length === 0) {
                return null;
            }
            
            // Nájdi platnú sadzbu pre daný dátum
            var validWage = null;
            var latestValidFrom = null;
            
            for (var i = 0; i < wageRecords.length; i++) {
                var wage = wageRecords[i];
                var validFrom = wage.field(config.fields.wages.validFrom);
                var validTo = wage.field(config.fields.wages.validTo);
                
                // Kontrola platnosti
                if (validFrom && moment(date).isSameOrAfter(validFrom)) {
                    if (!validTo || moment(date).isSameOrBefore(validTo)) {
                        // Táto sadzba je platná, vyber najnovšiu
                        if (!latestValidFrom || moment(validFrom).isAfter(latestValidFrom)) {
                            validWage = wage;
                            latestValidFrom = validFrom;
                        }
                    }
                }
            }
            
            if (!validWage) {
                return null;
            }
            
            return {
                hourlyRate: core.safeGet(validWage, config.fields.wages.hourlyRate, 0),
                rateType: core.safeGet(validWage, config.fields.wages.rateType, ""),
                validFrom: latestValidFrom,
                validTo: core.safeGet(validWage, config.fields.wages.validTo, null)
            };
            
        } catch (error) {
            return null;
        }
    }
    
    // /**
    //  * Vypočíta dennú mzdu zamestnanca
    //  * @param {Entry} employee - Zamestnanec
    //  * @param {number} hoursWorked - Počet odpracovaných hodín
    //  * @param {Date} date - Dátum (pre určenie sadzby)
    //  * @returns {Object} {wage: number, hourlyRate: number, overtime: number}
    //  */
    // function calculateDailyWage(employee, hoursWorked, date) {
    //     try {
    //         if (!employee || !hoursWorked) {
    //             return { wage: 0, hourlyRate: 0, overtime: 0 };
    //         }
            
    //         // Získaj hodinovú sadzbu
    //         var wageData = getEmployeeWageForDate(employee, date);
    //         if (!wageData) {
    //             return { wage: 0, hourlyRate: 0, overtime: 0 };
    //         }
            
    //         var hourlyRate = wageData.hourlyRate;
    //         var standardHours = 8; // Štandardný pracovný deň
    //         var overtimeRate = 1.25; // 25% príplatok za nadčas
            
    //         var regularHours = Math.min(hoursWorked, standardHours);
    //         var overtimeHours = Math.max(0, hoursWorked - standardHours);
            
    //         var regularWage = regularHours * hourlyRate;
    //         var overtimeWage = overtimeHours * hourlyRate * overtimeRate;
    //         var totalWage = regularWage + overtimeWage;
            
    //         return {
    //             wage: Math.round(totalWage * 100) / 100, // Zaokrúhli na 2 desatinné
    //             hourlyRate: hourlyRate,
    //             overtime: overtimeHours,
    //             regularHours: regularHours,
    //             overtimeHours: overtimeHours,
    //             regularWage: regularWage,
    //             overtimeWage: overtimeWage
    //         };
            
    //     } catch (error) {
    //         return { wage: 0, hourlyRate: 0, overtime: 0 };
    //     }
    // }
    
    // ==============================================
    // ŠTATISTIKY
    // ==============================================
    
    /**
     * Vypočíta mesačné štatistiky pre zamestnanca
     * @param {Entry} employee - Zamestnanec
     * @param {number} month - Mesiac (1-12)
     * @param {number} year - Rok
     * @returns {Object} Štatistiky
     */
    function calculateMonthlyStats(employee, month, year) {
        try {
            var config = getConfig();
            var startDate = moment([year, month - 1, 1]);
            var endDate = moment(startDate).endOf('month');
            
            var stats = {
                totalDays: 0,
                workDays: 0,
                weekends: 0,
                holidays: 0,
                totalHours: 0,
                totalWage: 0,
                overtimeHours: 0,
                averageHours: 0
            };
            
            // Získaj dochádzku pre mesiac
            var attendanceLib = libByName(config.libraries.attendance);
            if (!attendanceLib) return stats;
            
            var allAttendance = attendanceLib.entries();
            
            for (var i = 0; i < allAttendance.length; i++) {
                var record = allAttendance[i];
                var recordDate = record.field(config.fields.attendance.date);
                
                if (!recordDate) continue;
                
                var recordMoment = moment(recordDate);
                if (!recordMoment.isBetween(startDate, endDate, 'day', '[]')) continue;
                
                // Skontroluj či obsahuje tohto zamestnanca
                var employees = record.field(config.fields.attendance.employees);
                if (!employees || !Array.isArray(employees)) continue;
                
                var hasEmployee = false;
                for (var j = 0; j < employees.length; j++) {
                    if (employees[j].id === employee.id) {
                        hasEmployee = true;
                        break;
                    }
                }
                
                if (!hasEmployee) continue;
                
                // Započítaj štatistiky
                stats.totalDays++;
                
                if (isWeekend(recordDate)) {
                    stats.weekends++;
                } else if (isHoliday(recordDate)) {
                    stats.holidays++;
                } else {
                    stats.workDays++;
                }
                
                // Získaj odpracované hodiny z atribútu
                var workedHours = 0;
                for (var k = 0; k < employees.length; k++) {
                    if (employees[k].id === employee.id && employees[k].attr) {
                        workedHours = employees[k].attr(config.attributes.employees.workedHours) || 0;
                        break;
                    }
                }
                
                stats.totalHours += workedHours;
                
                // Vypočítaj mzdu
                var wageCalc = calculateDailyWage(employee, workedHours, recordDate);
                stats.totalWage += wageCalc.wage;
                stats.overtimeHours += wageCalc.overtimeHours;
            }
            
            // Vypočítaj priemery
            if (stats.workDays > 0) {
                stats.averageHours = Math.round((stats.totalHours / stats.workDays) * 100) / 100;
            }
            
            return stats;
            
        } catch (error) {
            return {
                totalDays: 0,
                workDays: 0,
                weekends: 0,
                holidays: 0,
                totalHours: 0,
                totalWage: 0,
                overtimeHours: 0,
                averageHours: 0
            };
        }
    }
    
    // ==============================================
    // PUBLIC API
    // ==============================================
    
    return {
        version: version,
        
        // Časové výpočty
        calculateWorkHours: calculateWorkHours,
        isWeekend: isWeekend,
        isHoliday: isHoliday,
        
        // Zamestnanci
        formatEmployeeName: formatEmployeeName,
        getEmployeeDetails: getEmployeeDetails,
        findEmployeeByNick: findEmployeeByNick,
        getActiveEmployees: getActiveEmployees,
        generateAttendanceSummary: generateAttendanceSummary,
        
        // Mzdy
        getEmployeeWageForDate: getEmployeeWageForDate,
        calculateDailyWage: calculateDailyWage,
        
        // Štatistiky
        calculateMonthlyStats: calculateMonthlyStats
    };
})();