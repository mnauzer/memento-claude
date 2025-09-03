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
    
    var version = "7.0.1";
    
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
    
    function calculateWorkHours(startTime, endTime) {
        var core = getCore();
        var config = getConfig();
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
            var regularHours = Math.min(hours + (minutes / 60), config.defaults.WorkHoursPerDay);
            var overtimeHours = Math.max(0, (hours + (minutes / 60)) - config.defaults.WorkHoursPerDay);
            
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
 

    function formatEmployeeName(employeeEntry) {
        var core = getCore();
        var config = getConfig();
        
        if (!employeeEntry) return "Neznámy";
        
        try {
            // Používaj konzistentné názvy polí
            var nick = core.safeGet(employeeEntry, config.fields.employee.nick, "").trim();
            var meno = core.safeGet(employeeEntry, config.fields.employee.firstName, "").trim();
            var priezvisko = core.safeGet(employeeEntry, config.fields.employee.lastName, "").trim();
            
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
    
    function getEmployeeDetails(employee, date) {
        try {
            var config = getConfig();
            var core = getCore();
            
            // Ak je to string (nick), nájdi zamestnanca
            if (typeof employee === 'string') {
                employee = findEmployeeByNick(employee);
                if (!employee) {
                    return null;
                }
            }
            
            var details = {
                id: core.safeGet(employee, config.fields.common.id),
                nick: core.safeGet(employee, config.fields.employee.nick),
                firstName: core.safeGet(employee, config.fields.employee.firstName),
                lastName: core.safeGet(employee, config.fields.employee.lastName),
                fullName: formatEmployeeName(employee),
                status: core.safeGet(employee, config.fields.employee.status),
                position: core.safeGet(employee, config.fields.employee.position),
                department: core.safeGet(employee, config.fields.employee.department),
                phone: core.safeGet(employee, config.fields.employee.phone),
                email: core.safeGet(employee, config.fields.employee.email),
                telegramId: core.safeGet(employee, config.fields.employee.telegramId)
            };
            
            // Získaj mzdové údaje ak je zadaný dátum
            if (date) {
                var wageData = getEmployeeWageForDate(employee, date);
                if (wageData) {
                    details.hourlyRate = wageData.hourlyRate;
                    details.rateType = wageData.rateType;
                    details.validFrom = wageData.validFrom;
                    details.validTo = wageData.validTo;
                }
            }
            
            return details;
            
        } catch (error) {
            return null;
        }
    }
    
    function findEmployeeByNick(nick) {
        try {
            if (!nick) return null;
            
            var config = getConfig();
            var lib = libByName(config.libraries.employees);
            if (!lib) return null;
            
            var employees = lib.find(config.fields.employee.nick, nick);
            return employees && employees.length > 0 ? employees[0] : null;
            
        } catch (error) {
            return null;
        }
    }
    
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
    
    function calculateDailyWage(employee, hoursWorked, date) {
        try {
            if (!employee || !hoursWorked) {
                return { wage: 0, hourlyRate: 0, overtime: 0 };
            }
            
            // Získaj hodinovú sadzbu
            var wageData = getEmployeeWageForDate(employee, date);
            if (!wageData) {
                return { wage: 0, hourlyRate: 0, overtime: 0 };
            }
            
            var hourlyRate = wageData.hourlyRate;
            var standardHours = 8; // Štandardný pracovný deň
            var overtimeRate = 1.25; // 25% príplatok za nadčas
            
            var regularHours = Math.min(hoursWorked, standardHours);
            var overtimeHours = Math.max(0, hoursWorked - standardHours);
            
            var regularWage = regularHours * hourlyRate;
            var overtimeWage = overtimeHours * hourlyRate * overtimeRate;
            var totalWage = regularWage + overtimeWage;
            
            return {
                wage: Math.round(totalWage * 100) / 100, // Zaokrúhli na 2 desatinné
                hourlyRate: hourlyRate,
                overtime: overtimeHours,
                regularHours: regularHours,
                overtimeHours: overtimeHours,
                regularWage: regularWage,
                overtimeWage: overtimeWage
            };
            
        } catch (error) {
            return { wage: 0, hourlyRate: 0, overtime: 0 };
        }
    }
    
    // ==============================================
    // ŠTATISTIKY
    // ==============================================
    
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
    // WAGE & RATE FUNCTIONS
    // ==============================================
  
    function findValidSalary(entry, employee, date) {
        var core = getCore();
        var config = getConfig();
        
        try {
            var employeeName = formatEmployeeName(employee);
            core.addDebug(entry, " Hľadám platnú sadzbu", "search");
            
            var hodinovka = findValidHourlyRate(employee, date);
            
            if (!hodinovka || hodinovka <= 0) {
                core.addError(entry, "Zamestnanec " + employeeName + " nemá platnú sadzbu", "business/findValidSalary");
                return null;
            }
            
            core.addDebug(entry, "  • Platná hodinovka: " + hodinovka + " €/h");
            return hodinovka;
    
            
        } catch (error) {
            core.addError(entry, error.toString(), "business/findValidSalary", error);
            return null;
        }
    }

    function findValidHourlyRate(employee, date) {
        var core = getCore();
        var config = getConfig();
        
        try {
            if (!employee || !date) return null;
            
            var fields = config.fields.wages;
            var libraryName = config.libraries.wages;
            
            // Získaj sadzby cez linksFrom
            var rates = core.safeGetLinksFrom(employee, libraryName, fields.employee);
            // Alebo použij starú metódu
            // var rates = employee.linksFrom(libraryName, fields.employee);
            
            if (!rates || rates.length === 0) {
                return null;
            }
            
            var validRate = null;
            var latestValidFrom = null;
            
            // Nájdi najnovšiu platnú sadzbu
            for (var i = 0; i < rates.length; i++) {
                var rate = rates[i];
                var validFrom = rate.field(fields.validFrom);
                var hourlyRate = rate.field(fields.hourlyRate);
                
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
                core.addError(entry(), "Chyba pri hľadaní sadzby: " + error.toString() + ", Line: " + error.lineNumber, "findValidHourlyRate", error);
            }
            return null;
        }
    }

    function findValidItemPrice(itemEntry, date) {
        var core = getCore();
        var config = getConfig();
        
        try {
            if (!itemEntry || !date) return null;
            
            var fields = config.fields.itemPrices;
            var libraryName = config.libraries.itemPrices;
            var prices = core.safeGetLinksFrom(itemEntry, libraryName, fields.item);
            
            if (!prices || prices.length === 0) {
                return null;
            }
            
            var validPrice = null;
            var latestValidFrom = null;
            
            // Nájdi najnovšiu platnú cenu
            for (var i = 0; i < prices.length; i++) {
                var rate = prices[i];
                var validFrom = rate.field(fields.validFrom);
                var price = rate.field(fields.price);
                
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
                core.addError(entry(), "Chyba pri hľadaní ceny: " + error.toString() + ", Line: " + error.lineNumber, "findValidWorkPrice", error);
            }
            return null;
        }
    }
    function findValidWorkPrice(workEntry, date) {
        var core = getCore();
        var config = getConfig();
        
        try {
            if (!workEntry || !date) return null;
            
            var fields = config.fields.workPrices;
            var libraryName = config.libraries.workPrices;
            var prices = core.safeGetLinksFrom(workEntry, libraryName, fields.work);
            
            if (!prices || prices.length === 0) {
                return null;
            }
            
            var validPrice = null;
            var latestValidFrom = null;
            
            // Nájdi najnovšiu platnú cwnu
            for (var i = 0; i < prices.length; i++) {
                var rate = prices[i];
                var validFrom = rate.field(fields.validFrom);
                var price = rate.field(fields.price);
                
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
                core.addError(entry(), "Chyba pri hľadaní ceny: " + error.toString() + ", Line: " + error.lineNumber, "findValidWorkPrice", error);
            }
            return null;
        }
    }

    function processEmployees(zamestnanci, pracovnaDobaHodiny, datum) {
    
        try {
            var result = {
                success: false,
                pocetPracovnikov: zamestnanci.length,
                odpracovaneTotal: 0,
                pracovnaDoba: pracovnaDobaHodiny,
                celkoveMzdy: 0,
                detaily: []
            };
            
            // Ulož počet pracovníkov
        utils.safeSet(currentEntry, CONFIG.fields.pocetPracovnikov, result.pocetPracovnikov);
            
            // Spracuj každého zamestnanca
            for (var i = 0; i < zamestnanci.length; i++) {
                var zamestnanec = zamestnanci[i];
                
                if (!zamestnanec) {
                    utils.addDebug(currentEntry, "Zamestnanec[" + i + "] je null - preskakujem", "warning");
                    continue;
                }
                
                var employeeName = utils.formatEmployeeName(zamestnanec);
                utils.addDebug(currentEntry, " [" + (i+1) + "/" + result.pocetPracovnikov + "] " + employeeName, "person");
                
                // Spracuj zamestnanca
                var empResult = processEmployee(zamestnanec, pracovnaDobaHodiny, datum, i);
                
                if (empResult.success) {
                    result.odpracovaneTotal += pracovnaDobaHodiny;
                    result.celkoveMzdy += empResult.dennaMzda;
                    result.detaily.push(empResult);
                    result.success = true;
                } else {
                    result.success = false;
                }
            }
            
            return result;
            
        } catch (error) {
            utils.addError(currentEntry, error.toString(), "processEmployees", error);
            return { success: false };
        }
    }
    // ==============================================
    // SUMMARY & REPORTING FUNCTIONS
    // ==============================================

    function showProcessingSummary(entry, summaryData, config) {
        var core = getCore();
        
        try {
            var msg = summaryData.success ? "✅ ÚSPEŠNE SPRACOVANÉ\n\n" : "⚠️ SPRACOVANÉ S CHYBAMI\n\n";
            
            if (summaryData.date) {
                msg += "📅 Dátum: " + core.formatDate(summaryData.date) + "\n";
            }
            
            if (summaryData.employeeCount !== undefined) {
                msg += "👥 Pracovníkov: " + summaryData.employeeCount + " " + 
                    getPersonCountForm(summaryData.employeeCount) + "\n";
            }
            
            if (summaryData.totalHours !== undefined) {
                msg += "⏱️ Odpracované: " + summaryData.totalHours + " hodín\n";
            }
            
            if (summaryData.totalCosts !== undefined) {
                msg += "💰 Náklady: " + core.formatMoney(summaryData.totalCosts) + "\n";
            }
            
            if (summaryData.errors && summaryData.errors.length > 0) {
                msg += "\n⚠️ Chyby (" + summaryData.errors.length + "):\n";
                for (var i = 0; i < Math.min(3, summaryData.errors.length); i++) {
                    msg += "• " + summaryData.errors[i] + "\n";
                }
                if (summaryData.errors.length > 3) {
                    msg += "• ... a " + (summaryData.errors.length - 3) + " ďalších\n";
                }
            }
            
            msg += "\nℹ️ Detaily v poli 'info'";
            
            if (typeof message === 'function') {
                message(msg);
            }
            
        } catch (error) {
            if (typeof message === 'function') {
                message(summaryData.success ? "✅ Spracované" : "⚠️ Spracované s chybami");
            }
        }
    }

    // ==============================================
    // POMOCNÉ FUNKCIE PRE ZÁVÄZKY
    // ==============================================

    function findExistingObligations(creditor) {
        var core = getCore();
        var config = getConfig();
        try {
            var creditorField = config.fields.obligations[creditor];
            return core.safeGetLinksFrom(currentEntry, config.libraries.obligations, creditorField )
        } catch (error) {
            core.addError(currentEntry, "Chyba pri hľadaní záväzkov: " + error.toString(), "findExistingObligations");
            return [];
        }
    }
    function findLinkedObligations(creditor) {
        var core = getCore();
        var config = getConfig();
        try {
            var creditorField = config.fields.obligations[creditor];
            return core.safeGetLinksFrom(currentEntry, config.libraries.obligations, creditorField )
        } catch (error) {
            core.addError(currentEntry, "Chyba pri hľadaní záväzkov: " + error.toString(), "findExistingObligations");
            return [];
        }
    }

    // ==============================================
    // OPRAVENÁ FUNKCIA createObligation v MementoBusiness7.js
    // Verzia: 7.1 | Oprava: Vytváraní záväzkov
    // ==============================================

    function createObligation(date, data, creditor) {
        var core = getCore();
        var config = getConfig();
        
        try {
            core.addDebug(currentEntry, "  + Vytváranie nového záväzku...");
            
            var lib = libByName(config.libraries.obligations);
            if (!lib) {
                core.addError(currentEntry, "Knižnica " + config.libraries.obligations + " nenájdená", "createObligation");
                return false;
            }
            
            // ✅ OPRAVENÉ: Pracuj priamo s newObligation objektom
            var newObligation = lib.create({});
            
            if (!newObligation) {
                core.addError(currentEntry, "Nepodarilo sa vytvoriť nový záznam záväzku", "createObligation");
                return false;
            }
            
            // ✅ OPRAVENÉ: Nastav údaje priamo na newObligation
            try {
                // Základné polia záväzku
                newObligation.set(config.fields.obligations.state, config.constants.obligationStates.unpaid);
                newObligation.set(config.fields.obligations.date, date);
                newObligation.set(config.fields.obligations.type, config.constants.obligationTypes.wages);
                
                // Prepojenia
                newObligation.set(config.fields.obligations.employee, [data.entry]);
                newObligation.set(config.fields.obligations.creditor, "Zamestnanec");
                newObligation.set(config.fields.obligations.attendance, [currentEntry]);
                
                // Finančné údaje
                newObligation.set(config.fields.obligations.amount, data.dailyWage);
                newObligation.set(config.fields.obligations.paid, 0);
                newObligation.set(config.fields.obligations.balance, data.dailyWage);
                
                // Popis
                var description = "Mzda zamestnanca " + data.name + " za deň " + core.formatDate(date);
                newObligation.set(config.fields.obligations.description, description);
                
                // Info záznam
                var infoText = "📋 AUTOMATICKY VYTVORENÝ ZÁVÄZOK\n";
                infoText += "=====================================\n\n";
                infoText += "📅 Dátum: " + core.formatDate(date) + "\n";
                infoText += "👤 Zamestnanec: " + data.name + "\n";
                infoText += "💰 Suma: " + core.formatMoney(data.dailyWage) + "\n\n";
                infoText += "⏰ Vytvorené: " + core.formatDate(moment()) + "\n";
                infoText += "🔧 Script: Dochádzka Sync Záväzkov v7.1\n";
                infoText += "📂 Zdroj: Knižnica Dochádzka\n";
                infoText += "📝 Zdrojový záznam ID: " + currentEntry.field("ID");
                
                newObligation.set(config.fields.common.info || "info", infoText);
                
                core.addDebug(currentEntry, "  ✅ Záväzok úspešne vytvorený a vyplnený");
                core.addDebug(currentEntry, "    ID: " + newObligation.field("ID"));
                core.addDebug(currentEntry, "    Suma: " + core.formatMoney(data.dailyWage));
                core.addDebug(currentEntry, "    Popis: " + description);
                
                return true;
                
            } catch (setError) {
                core.addError(currentEntry, "Chyba pri nastavovaní údajov záväzku: " + setError.toString(), "createObligation");
                return false;
            }
            
        } catch (error) {
            core.addError(currentEntry, "Chyba pri vytváraní záväzku: " + error.toString(), "createObligation", error);
            return false;
        }
    }

    function updateObligation(date, obligation, amount) {
        var core = getCore();
        var config = getConfig();
        try {
            utils.addDebug(currentEntry, "  🔄 Aktualizácia existujúceho záväzku...");
            
            var paidAmount = utils.safeGet(obligation, config.fields.obligations.paid || 0);
            var newBalance = amount - paidAmount;
            var newStatus = newBalance <= 0 ? config.constants.stavy.uhradene : 
                        paidAmount > 0 ? config.constants.stavy.ciastocneUhradene : 
                        config.constants.stavy.neuhradene;
            obligation.set(config.fields.date, core.formatDate(date));
            obligation.set(config.fields.obligations.amount, amount);
            obligation.set(config.fields.obligations.balance, newBalance);
            obligation.set(config.fields.obligations.state, newStatus);
            
            utils.addDebug(currentEntry, "  ✅ Záväzok aktualizovaný");
            utils.addDebug(currentEntry, "    Suma: " + utils.formatMoney(amount) + 
                                        " | Zostatok: " + utils.formatMoney(newBalance));
            
            return true;
            
        } catch (error) {
            utils.addError(currentEntry, "Chyba pri aktualizácii: " + error.toString(), "updateObligation", error);
            return false;
        }
    }
    // ==============================================
    // PUBLIC API
    // ==============================================
    
    return {
        version: version,
        
        // Časové výpočty
        calculateWorkHours: calculateWorkHours,
        
        // Zamestnanci
        formatEmployeeName: formatEmployeeName,
        getEmployeeDetails: getEmployeeDetails,
        findEmployeeByNick: findEmployeeByNick,
        getActiveEmployees: getActiveEmployees,
        
        // Mzdy
        getEmployeeWageForDate: getEmployeeWageForDate,
        calculateDailyWage: calculateDailyWage,
        findValidHourlyRate: findValidHourlyRate,
        findValidSalary: findValidSalary,
        //processEmployee: processEmployee,
        processEmployees: processEmployees,

        // Práce
        findValidWorkPrice: findValidWorkPrice,
        
        // Sklad
        findValidItemPrice: findValidItemPrice,
        
        // Štatistiky
        calculateMonthlyStats: calculateMonthlyStats,
          
        // Slovak locale helpers - NOVÉ FUNKCIE
     
        
        // Reporting - NOVÁ FUNKCIA
        showProcessingSummary: showProcessingSummary,

        // Obligations
        createObligation: createObligation,
        updateObligation: updateObligation,
        findExistingObligations: findExistingObligations,
        findLinkedObligations: findLinkedObligations
    };
})();

// // Potom v Dochádzka Prepočet 7 môžeš používať:

// // Cez MementoUtils (ak MementoBusiness je načítané):
// var dayName = utils.getDayNameSK(moment(date).day());
// var hodinovka = utils.findValidHourlyRate(zamestnanec, datum);

// // Alebo priamo cez MementoBusiness:
// if (typeof MementoBusiness !== 'undefined') {
//     var dayName = MementoBusiness.getDayNameSK(moment(date).day());
//     var hodinovka = MementoBusiness.findValidHourlyRate(zamestnanec, datum);
// }