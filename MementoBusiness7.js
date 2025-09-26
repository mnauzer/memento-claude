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
    
    // ČASOVÉ VÝPOČTY
    
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
            var currentEntry = entry();
            
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
                var wageData = findValidSalary(currentEntry, employee, date);

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
    
    // MZDY A SADZBY
    
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
   
    function findValidSalary(entry, employee, date) {
        var core = getCore();
        var config = getConfig();
        
        try {
            var employeeName = formatEmployeeName(employee);
            core.addDebug(entry, "  🔍 Hľadám platnú sadzbu");
            
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

    function findValidMachinePrice(machineEntry, date) {
        try {
            if (!machineEntry || !date) return null;
            var core = getCore();
            var config = getConfig();
            var currentEntry = entry();
            core.addDebug(currentEntry, "  🔍 Hľadám platnú cenu mechanizácie");
            var validPrice = {
                priceMth: 0,
                flatRate: 0,
            };
            var fields = config.fields.machinePrice;
            var libraryName = config.libraries.machinePrices;
            var prices = core.safeGetLinksFrom(machineEntry, libraryName, fields.machine);
            core.addDebug(currentEntry, "  • Nájdených cien: " + (prices ? prices.length : 0)); 
            if (!prices || prices.length === 0) {
                core.addDebug(currentEntry, "  🔍 Nepodarilo sa nájsť žiadne ceny");
                return null;
            }
          
            var latestValidFrom = null;
            
            // Nájdi najnovšiu platnú cenu
            for (var i = 0; i < prices.length; i++) {
                var price = prices[i];
                var validFrom = core.safeGet(price, fields.validFrom);
                
                if (validFrom && price && moment(validFrom).isSameOrBefore(date)) {
                    if (!latestValidFrom || moment(validFrom).isAfter(latestValidFrom)) {
                        latestValidFrom = validFrom;
                        validPrice.priceMth = core.safeGet(price, fields.priceMth, 0);
                        validPrice.flatRate = core.safeGet(price, fields.flatRate, 0);
                    }
                }
            }
            
            return validPrice;
            
        } catch (error) {
            if (core) {
                core.addError(entry(), "Chyba pri hľadaní ceny: " + error.toString() + ", Line: " + error.lineNumber, "findValidMachinePrice", error);

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
            core.addDebug(currentEntry, "   ➕ Vytváranie nového záväzku...");
            
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
            var newStatus = newBalance <= 0 ? config.constants.obligationStates.paid : 
                        paidAmount > 0 ? config.constants.obligationStates.partiallyPaid : 
                        config.constants.obligationStates.unpaid;
            obligation.set(config.fields.obligations.date, date);
            obligation.set(config.fields.obligations.amount, amount);
            obligation.set(config.fields.obligations.balance, newBalance);
            obligation.set(config.fields.obligations.state, newStatus);
            
            utils.addDebug(currentEntry, "  ☑️ Záväzok aktualizovaný");
            utils.addDebug(currentEntry, "    Suma: " + utils.formatMoney(amount) + 
                                        " | Zostatok: " + utils.formatMoney(newBalance));
            
            return true;
            
        } catch (error) {
            utils.addError(currentEntry, "Chyba pri aktualizácii: " + error.toString(), "updateObligation", error);
            return false;
        }
    }

    // ==============================================
    // VÝPOČET MARŽE A RENTABILITY
    // ==============================================

    function calculateProfitability(costs, revenue) {
        var core = getCore();
        var config = getConfig();

        var profit = {
            grossProfit: 0,      // Hrubý zisk
            grossMargin: 0,      // Hrubá marža v %
            netProfit: 0,        // Čistý zisk (po DPH)
            profitability: 0,    // Rentabilita v %
            isProfitable: false  // Je zákazka zisková?
        };
        
        try {
            core.addDebug(currentEntry, "  📊 Počítam ziskovosť...");
            
            // Hrubý zisk
            profit.grossProfit = revenue.total - costs.total;
            
            // Hrubá marža
            if (revenue.total > 0) {
                profit.grossMargin = (profit.grossProfit / revenue.total) * 100;
            }
            
            // Čistý zisk (po odvode DPH)
           // profit.netProfit = profit.grossProfit - costs.vatAmount; //TODO počítame profit bez dph - doriešiť
            
            // Rentabilita
            if (costs.total > 0) {
                profit.profitability = (profit.grossProfit / costs.total) * 100;
            }
            
            // Je zisková?
            profit.isProfitable = profit.grossProfit > 0;
            
            core.addDebug(currentEntry, "    • Hrubý zisk: " + core.formatMoney(profit.grossProfit));
            core.addDebug(currentEntry, "    • Hrubá marža: " + profit.grossMargin.toFixed(2) + "%");
            //core.addDebug(currentEntry, "    • Čistý zisk: " + core.formatMoney(profit.netProfit));
            core.addDebug(currentEntry, "    • Rentabilita: " + profit.profitability.toFixed(2) + "%");
            core.addDebug(currentEntry, "    • Stav: " + (profit.isProfitable ? "✅ ZISKOVÁ" : "❌ STRATOVÁ"));
            
            return profit;
            
        } catch (error) {
            core.addError(currentEntry, error.toString(), "calculateProfitability", error);
            return profit;
        }
    }

    // ==============================================
    // DPH FUNKCIE
    // ==============================================

    function getValidVatRate(date, vatType) {
        var core = getCore();
        var config = getConfig();

        try {
            if (!date) {
                core.addError(entry(), "Dátum nie je zadaný pre zistenie DPH", "getValidVatRate");
                return 0;
            }

            var vatRatesLibName = config.libraries.vatRatesLib || "sadzby DPH";
            var vatRatesLib = libByName(vatRatesLibName);

            if (!vatRatesLib) {
                core.addError(entry(), "Knižnica sadzby DPH neexistuje", "getValidVatRate");
                return 0;
            }

            var targetDate = moment(date);
            if (!targetDate.isValid()) {
                core.addError(entry(), "Neplatný dátum: " + date, "getValidVatRate");
                return 0;
            }

            // Získaj všetky sadzby DPH
            var vatRateEntries = vatRatesLib.entries();
            var validEntries = [];

            for (var i = 0; i < vatRateEntries.length; i++) {
                var vatEntry = vatRateEntries[i];
                var validFromField = config.fields.vatRates.validFrom;
                var validFromDate = moment(core.safeGet(vatEntry, validFromField, null));

                if (validFromDate.isValid() && validFromDate.isSameOrBefore(targetDate)) {
                    validEntries.push({
                        entry: vatEntry,
                        validFrom: validFromDate
                    });
                }
            }

            if (validEntries.length === 0) {
                core.addError(entry(), "Nenašla sa platná sadzba DPH k dátumu " + targetDate.format("DD.MM.YYYY"), "getValidVatRate");
                return 0;
            }

            // Zoraď podľa dátumu platnosti (najnovšie najprv)
            validEntries.sort(function(a, b) {
                return b.validFrom.valueOf() - a.validFrom.valueOf();
            });

            var latestEntry = validEntries[0].entry;

            // Zisti typ DPH (základná, znížená)
            var vatTypeField = vatType === "znížená" ?
                config.fields.vatRates.reduced :
                config.fields.vatRates.standard;

            var vatRate = core.safeGet(latestEntry, vatTypeField, 0);

            if (vatRate === 0) {
                core.addDebug(entry(), "DPH sadzba nie je nastavená pre typ: " + vatType + ", k dátumu: " + targetDate.format("DD.MM.YYYY"), "warning");
            }

            return parseFloat(vatRate) || 0;

        } catch (error) {
            if (core) {
                core.addError(entry(), "Chyba pri hľadaní DPH sadzby: " + error.toString(), "getValidVatRate", error);
            }
            return 0;
        }
    }

    /**
     * Vytvorí alebo aktualizuje záznam v knižnici "ceny materiálu"
     * @param {Object} materialItem - Záznam materiálu
     * @param {Date} priceDate - Dátum platnosti ceny
     * @param {number} newPrice - Nová cena materiálu
     * @returns {Object} Výsledok operácie
     */
    function createOrUpdateMaterialPriceRecord(materialItem, priceDate, sellPrice, purchasePrice) {
        try {
            var core = getCore();
            var config = getConfig();

            var materialName = core.safeGet(materialItem, config.fields.items.name, "Neznámy materiál");
      
            // Získanie knižnice ceny materiálu
            var materialPricesLibraryName = config.libraries.materialPrices;

            var pricesLibrary = libByName(materialPricesLibraryName);
            if (!pricesLibrary) {
                core.addError(entry(), "❌ Knižnica " + materialPricesLibraryName + " neexistuje", "createOrUpdateMaterialPriceRecord");
                return {
                    success: false,
                    message: "Knižnica ceny materiálu neexistuje"
                };
            }

            var dateFormatted = core.formatDate(priceDate, "DD.MM.YYYY");
            core.addDebug(entry(), "💰 " + materialName + " - Spracovávam cenový záznam k " + dateFormatted);

            // Hľadanie existujúceho záznamu pre tento materiál a dátum
            var existingPriceEntry = null;
            var priceEntries = materialItem.linksFrom(pricesLibrary);

            if (priceEntries && priceEntries.length > 0) {
                for (var i = 0; i < priceEntries.length; i++) {
                    var priceEntry = priceEntries[i];
                    var entryDate = core.safeGet(priceEntry, (config.fields.materialPrices.date) );

                    if (entryDate) {
                        var entryMoment = moment(entryDate);
                        var priceMoment = moment(priceDate);

                        // Porovnanie dátumov (len dátum, nie čas)
                        if (entryMoment.format("YYYY-MM-DD") === priceMoment.format("YYYY-MM-DD")) {
                            existingPriceEntry = priceEntry;
                            break;
                        }
                    }
                }
            }

            if (existingPriceEntry) {
                var priceField = (config.fields.materialPrices.price);
                var oldPrice = parseFloat(core.safeGet(existingPriceEntry, priceField, 0));
                core.safeSet(existingPriceEntry, priceField, newPrice);

                core.addDebug(entry(), "🔄 " + materialName + " - Aktualizovaný cenový záznam k " + dateFormatted + ": " +
                             core.formatMoney(oldPrice) + " -> " + core.formatMoney(newPrice));

                return {
                    success: true,
                    updated: true,
                    message: "Cenový záznam aktualizovaný",
                    oldPrice: oldPrice,
                    sellPrice: sellPrice,
                    date: priceDate
                };

            } else {
                // Vytvorenie nového záznamu
                core.addDebug(entry(), " Existujúci záznam nenájdený, vytváram nový");
                var newPriceEntry = pricesLibrary.create({});

                var materialField = config.fields.materialPrices.material;
                var dateField = config.fields.materialPrices.date;
                var purchasePriceField = config.fields.materialPrices.purchasePrice;
                var sellPriceField = config.fields.materialPrices.sellPrice;

                core.safeSet(newPriceEntry, materialField, [materialItem]);
                core.safeSet(newPriceEntry, dateField, priceDate);
                core.safeSet(newPriceEntry, purchasePriceField, purchasePrice);
                core.safeSet(newPriceEntry, sellPriceField, sellPrice);


                core.addDebug(entry(), "➕ " + materialName + " - Vytvorený nový cenový záznam k " + dateFormatted + ": " + core.formatMoney(sellPrice));

                return {
                    success: true,
                    created: true,
                    message: "Nový cenový záznam vytvorený",
                    purchasePrice: purchasePrice,
                    sellPrice: sellPrice,
                    date: priceDate,
                    entryId: core.safeGet(newPriceEntry, "ID", "N/A")
                };
            }

        } catch (error) {
            var core = getCore();
            if (core) {
                core.addError(entry(), "Chyba pri spracovaní cenového záznamu: " + error.toString(), "createOrUpdateMaterialPriceRecord", error);
            }
            return {
                success: false,
                message: "Chyba pri spracovaní cenového záznamu: " + error.toString()
            };
        }
    }

    // ==============================================
    // MATERIAL PRICE CALCULATIONS - NOVÉ FUNKCIE
    // ==============================================

    /**
     * Vypočítava a aktualizuje ceny materiálu na základe nastavení
     * @param {Object} item - Záznam materiálu
     * @param {number} purchasePrice - Nákupná cena z príjemky/manuálneho vstupu
     * @param {Date} documentDate - Dátum dokumentu
     * @param {boolean} isManualAction - Či ide o manuálny prepočet (true) alebo príjemku (false)
     * @returns {Object} Výsledok aktualizácie
     */
    function calculateAndUpdateMaterialPrices(item, purchasePrice, documentDate, isManualAction) {
        try {
            var core = getCore();
            var config = getConfig();

            var materialName = core.safeGet(item, config.fields.items.name, "Neznámy materiál");
            var updated = false;

            // 1. Kontrola zmeny nákupnej ceny
            var currentPurchasePrice = parseFloat(core.safeGet(item, config.fields.items.purchasePrice, 0));
            var purchasePriceChangeAction = core.safeGet(item, config.fields.items.purchasePriceChange, "").trim();
            var changePercentageThreshold = parseFloat(core.safeGet(item, config.fields.items.changePercentage, 0));

            var shouldProcessPriceCalculation = true;
            var iconsToAdd = [];

            if (currentPurchasePrice > 0 && changePercentageThreshold > 0) {
                var percentageChange = Math.abs((purchasePrice - currentPurchasePrice) / currentPurchasePrice) * 100;
                var isPriceIncrease = purchasePrice > currentPurchasePrice;

                core.addDebug(entry(), "ℹ️ " + materialName + " - Kontrola zmeny ceny: " + core.formatMoney(currentPurchasePrice) + " -> " + core.formatMoney(purchasePrice) + " (" + percentageChange.toFixed(2) + "%)");

                if (percentageChange >= changePercentageThreshold) {
                    // Pridanie ikony šípky podľa zmeny ceny
                    var directionIcon = isPriceIncrease ? "⬆️" : "⬇️";
                    iconsToAdd.push(directionIcon);

                    core.addDebug(entry(), "⚠️ " + materialName + " - Zmena ceny " + percentageChange.toFixed(2) + "% prekročila prah " + changePercentageThreshold + "%");

                    switch (purchasePriceChangeAction) {
                        case "Upozorniť":
                            iconsToAdd.push("⚠️");
                            shouldProcessPriceCalculation = false;
                            core.addDebug(entry(), "⚠️ " + materialName + " - Iba upozornenie, prepočet ceny sa preskočí");
                            break;

                        case "Prepočítať":
                            iconsToAdd.push("🔄");
                            shouldProcessPriceCalculation = true;
                            core.addDebug(entry(), "🔄 " + materialName + " - Prepočet ceny bude vykonaný");
                            break;

                        case "Upozorniť a prepočítať":
                            iconsToAdd.push("⚠️", "🔄");
                            shouldProcessPriceCalculation = true;
                            core.addDebug(entry(), "⚠️🔄 " + materialName + " - Upozornenie a prepočet ceny");
                            break;

                        case "Ignorovať":
                            shouldProcessPriceCalculation = false;
                            core.addDebug(entry(), "🔕 " + materialName + " - Zmena ignorovaná, len ikona zmeny");
                            break;

                        default:
                            shouldProcessPriceCalculation = true;
                            core.addDebug(entry(), "❓ " + materialName + " - Neznáme nastavenie, použije sa prepočet");
                            break;
                    }
                }
            }

            // 2. Nákupné ceny - použij cenu z atribútu "cena" (nezaokrúhľujú sa)
            var finalPurchasePrice = purchasePrice; // Cena z atribútu "cena"

            // 3. Zistiť sadzbu DPH z záznamu materiálu
            var vatRateType = core.safeGet(item, config.fields.items.vatRate, "Základná")
            var vatRate = 0;
            try {
                vatRate = getValidVatRate(documentDate, vatRateType.toLowerCase().trim());
                core.addDebug(entry(), "✅ " + materialName + " - Sadzba DPH (" + vatRateType + "): " + vatRate + "%");
            } catch (error) {
                core.addDebug(entry(), "⚠️ " + materialName + " - Chyba pri získavaní DPH, použije sa 0%");
                vatRate = 0;
            }

            // 3. Výpočet nákupnej ceny s DPH (nezaokrúhľuje sa)
            var finalPurchasePriceWithVat = finalPurchasePrice * (1 + vatRate / 100);

            // 4. Inicializácia cien pre prípad preskočenia prepočtu
            var finalPrice = finalPurchasePrice; // Default = nákupná cena
            var roundedPriceWithVat = finalPurchasePriceWithVat;

            // 5. Prepočet predajných cien (ak je povolený)
            if (shouldProcessPriceCalculation) {
                // Zistiť nastavenie prepočtu predajnej ceny z záznamu materiálu
                var priceCalculation = core.safeGet(item, config.fields.items.priceCalculation, "").trim();
                core.addDebug(entry(), "ℹ️ " + materialName + " - Prepočet ceny: " + priceCalculation);

                var sellingPrice = finalPurchasePrice; // Základne = nákupná cena

                // Ak je "Podľa prirážky", vypočítať predajnú cenu s prirážkou
                if (priceCalculation === "Podľa prirážky") {
                    var markupPercentage = parseFloat(core.safeGet(item, config.fields.items.markupPercentage, 0));
                    if (markupPercentage > 0) {
                        sellingPrice = finalPurchasePrice * (1 + markupPercentage / 100);
                        core.addDebug(entry(), "🧮 " + materialName + " - Prirážka " + markupPercentage + "%: " + core.formatMoney(finalPurchasePrice) + " -> " + core.formatMoney(sellingPrice));
                    }
                }

                // Výpočet predajnej ceny s DPH
                var priceWithVat = sellingPrice * (1 + vatRate / 100);

                // Zaokrúhľovanie predajných cien s DPH podľa nastavení materiálu
                roundedPriceWithVat = applyPriceRounding(item, priceWithVat, materialName + " - predajná (s DPH)");

                // Prepočítanie predajnej ceny bez DPH z zaokrúhlenej ceny s DPH
                finalPrice = roundedPriceWithVat / (1 + vatRate / 100);
            } else {
                core.addDebug(entry(), "🚫 " + materialName + " - Prepočet ceny preskočený podľa nastavenia");
            }

            // 9. Aktualizovať ikony ak sú k dispozícii (nahradenie starých ikon)
            if (iconsToAdd.length > 0) {
                var newIcons = iconsToAdd.join(" ");
                var currentIcons = core.safeGet(item, config.fields.items.icons, "");

                // Nahraď staré ikony novými (nezachovávaj predchádzajúce)
                core.safeSet(item, config.fields.items.icons, newIcons);

                if (currentIcons && currentIcons.trim() !== "") {
                    core.addDebug(entry(), "🔄 " + materialName + " - Ikony nahradené: '" + currentIcons + "' -> '" + newIcons + "'");
                } else {
                    core.addDebug(entry(), "🎯 " + materialName + " - Pridané ikony: " + newIcons);
                }
                updated = true;
            }

            // 10. Aktualizovať ceny v materiáli ak sa zmenili
            var currentPrice = parseFloat(core.safeGet(item, config.fields.items.price, 0));
            var currentPriceWithVat = parseFloat(core.safeGet(item, config.fields.items.priceWithVat, 0));
            var currentPurchasePrice = parseFloat(core.safeGet(item, config.fields.items.purchasePrice, 0));
            var currentPurchasePriceWithVat = parseFloat(core.safeGet(item, config.fields.items.purchasePriceWithVat, 0));

            if (Math.abs(currentPrice - finalPrice) > 0.01 ||
                Math.abs(currentPriceWithVat - roundedPriceWithVat) > 0.01 ||
                Math.abs(currentPurchasePrice - finalPurchasePrice) > 0.01 ||
                Math.abs(currentPurchasePriceWithVat - finalPurchasePriceWithVat) > 0.01) {

                // Aktualizovať ceny v zázname materiálu
                core.safeSet(item, config.fields.items.price, finalPrice);
                core.safeSet(item, config.fields.items.priceWithVat, roundedPriceWithVat);
                core.safeSet(item, config.fields.items.purchasePrice, finalPurchasePrice);
                core.safeSet(item, config.fields.items.purchasePriceWithVat, finalPurchasePriceWithVat);

                // Vytvorenie info záznamu pre materiál
                createMaterialInfoRecord(item, {
                    originalPurchasePrice: finalPurchasePrice,
                    originalSellingPrice: shouldProcessPriceCalculation ? sellingPrice : finalPurchasePrice,
                    originalPriceWithVat: shouldProcessPriceCalculation ? priceWithVat : finalPurchasePriceWithVat,
                    originalPurchasePriceWithVat: finalPurchasePriceWithVat,
                    finalPrice: finalPrice,
                    finalPriceWithVat: roundedPriceWithVat,
                    finalPurchasePrice: finalPurchasePrice,
                    finalPurchasePriceWithVat: finalPurchasePriceWithVat,
                    vatRate: vatRate,
                    vatRateType: vatRateType,
                    priceCalculation: shouldProcessPriceCalculation ? priceCalculation : "Preskočené",
                    markupPercentage: parseFloat(core.safeGet(item, config.fields.items.markupPercentage, 0)),
                    priceRounding: core.safeGet(item, config.fields.items.priceRounding, "").trim(),
                    roundingValue: core.safeGet(item, config.fields.items.roundingValue, "").trim(),
                    documentDate: documentDate,
                    // Informácie o kontrole zmeny ceny
                    purchasePriceChangeAction: purchasePriceChangeAction,
                    previousPurchasePrice: currentPurchasePrice,
                    changePercentage: currentPurchasePrice > 0 ? Math.abs((purchasePrice - currentPurchasePrice) / currentPurchasePrice) * 100 : 0,
                    changeDirection: purchasePrice > currentPurchasePrice ? "rast" : "pokles",
                    iconsAdded: iconsToAdd.join(" "),
                    // Informácie o cenové histórii (bude pridané neskôr)
                    priceHistoryResult: null,
                    isManualAction: isManualAction || false
                });

                updated = true;

                // Vytvorenie/aktualizácia záznamu v knižnici "ceny materiálu"
                core.addDebug(entry(), "🔍 DEBUG: Volám createOrUpdateMaterialPriceRecord s cenou: " + core.formatMoney(finalPrice));
                var priceHistoryResult = createOrUpdateMaterialPriceRecord(item, documentDate, finalPrice, purchasePrice);
                if (priceHistoryResult.success) {
                    if (priceHistoryResult.created) {
                        core.addDebug(entry(), "➕ " + materialName + " - Vytvorený cenový záznam v histórii");
                    } else if (priceHistoryResult.updated) {
                        core.addDebug(entry(), "🔄 " + materialName + " - Aktualizovaný cenový záznam v histórii");
                    }
                } else {
                    core.addDebug(entry(), "⚠️ " + materialName + " - Chyba pri vytváraní cenového záznamu: " + priceHistoryResult.message);
                    core.addDebug(entry(), "🔍 DEBUG: priceHistoryResult: " + JSON.stringify(priceHistoryResult));
                }

                // Aktualizácia info záznamu s kompletými informáciami vrátane cenovej histórie
                createMaterialInfoRecord(item, {
                    originalPurchasePrice: finalPurchasePrice,
                    originalSellingPrice: finalPrice,
                    originalPriceWithVat: roundedPriceWithVat,
                    originalPurchasePriceWithVat: finalPurchasePriceWithVat,
                    finalPrice: finalPrice,
                    finalPriceWithVat: roundedPriceWithVat,
                    finalPurchasePrice: finalPurchasePrice,
                    finalPurchasePriceWithVat: finalPurchasePriceWithVat,
                    vatRate: vatRate,
                    vatRateType: vatRateType,
                    priceCalculation: shouldProcessPriceCalculation ? priceCalculation : "Preskočené",
                    markupPercentage: parseFloat(core.safeGet(item, config.fields.items.markupPercentage, 0)),
                    priceRounding: core.safeGet(item, config.fields.items.priceRounding, "").trim(),
                    roundingValue: core.safeGet(item, config.fields.items.roundingValue, "").trim(),
                    documentDate: documentDate,
                    // Informácie o kontrole zmeny ceny
                    purchasePriceChangeAction: purchasePriceChangeAction,
                    previousPurchasePrice: currentPurchasePrice,
                    changePercentage: currentPurchasePrice > 0 ? Math.abs((purchasePrice - currentPurchasePrice) / currentPurchasePrice) * 100 : 0,
                    changeDirection: purchasePrice > currentPurchasePrice ? "rast" : "pokles",
                    iconsAdded: iconsToAdd.join(" "),
                    // Informácie o cenové histórii (teraz už dostupné)
                    priceHistoryResult: priceHistoryResult,
                    isManualAction: isManualAction || false
                });

                core.addDebug(entry(), "🔄 " + materialName + " - Aktualizované ceny:");
                core.addDebug(entry(), "  Nákupná: " + core.formatMoney(finalPurchasePrice) + " / s DPH: " + core.formatMoney(finalPurchasePriceWithVat));
                core.addDebug(entry(), "  Predajná: " + core.formatMoney(finalPrice) + " / s DPH: " + core.formatMoney(roundedPriceWithVat));
            }

            return {
                updated: updated,
                sellingPrice: finalPrice,
                priceWithVat: roundedPriceWithVat
            };

        } catch (error) {
            var core = getCore();
            if (core) {
                core.addError(entry(), "Chyba pri prepočte cien materiálu: " + error.toString(), "calculateAndUpdateMaterialPrices", error);
            }
            return {
                updated: false,
                sellingPrice: purchasePrice,
                priceWithVat: purchasePrice
            };
        }
    }

    /**
     * Aplikuje zaokrúhľovanie ceny podľa nastavení materiálu
     * @param {Object} item - Záznam materiálu
     * @param {number} price - Cena na zaokrúhlenie
     * @param {string} materialName - Názov materiálu (pre debug)
     * @returns {number} Zaokrúhlená cena
     */
    function applyPriceRounding(item, price, materialName) {
        try {
            var core = getCore();
            var config = getConfig();

            var priceRounding = core.safeGet(item, config.fields.items.priceRounding, "").trim();
            var roundingValue = core.safeGet(item, config.fields.items.roundingValue, "").trim();

            if (!priceRounding || priceRounding === "Nezaokrúhľovať") {
                return price;
            }

            var roundingFactor = 1; // Desatiny
            switch (roundingValue) {
                case "Jednotky":
                    roundingFactor = 1;
                    break;
                case "Desiatky":
                    roundingFactor = 10;
                    break;
                case "Stovky":
                    roundingFactor = 100;
                    break;
                case "Desatiny":
                default:
                    roundingFactor = 0.1;
                    break;
            }

            var roundedPrice = price;
            switch (priceRounding) {
                case "Nahor":
                    roundedPrice = Math.ceil(price / roundingFactor) * roundingFactor;
                    break;
                case "Nadol":
                    roundedPrice = Math.floor(price / roundingFactor) * roundingFactor;
                    break;
                case "Najbližšie":
                    roundedPrice = Math.round(price / roundingFactor) * roundingFactor;
                    break;
            }

            if (Math.abs(price - roundedPrice) > 0.001) {
                core.addDebug(entry(), "🧮 " + materialName + " - Zaokrúhlenie (" + priceRounding + ", " + roundingValue + "): " + core.formatMoney(price) + " -> " + core.formatMoney(roundedPrice));
            }

            return roundedPrice;

        } catch (error) {
            var core = getCore();
            if (core) {
                core.addDebug(entry(), "⚠️ Chyba pri zaokrúhľovaní ceny, použije sa pôvodná: " + error.toString());
            }
            return price;
        }
    }

    /**
     * Získa popis zaokrúhľovania na základe hodnoty
     */
    function getRoundingDescription(roundingValue) {
        if (!roundingValue || roundingValue.trim() === "") {
            return "nie je nastavené";
        }

        switch (roundingValue.trim()) {
            case "0.01": return "desatiny";
            case "0.1": return "desatiny";
            case "1": return "jednotky";
            case "5": return "na 5";
            case "10": return "na 10";
            case "50": return "na 50";
            case "100": return "na 100";
            default: return roundingValue;
        }
    }

    /**
     * Vytvorí info záznam pre materiál s detailmi prepočtu cien
     * @param {Object} item - Záznam materiálu
     * @param {Object} priceData - Dáta o cenách
     * @returns {boolean} Úspešnosť vytvorenia
     */
    function createMaterialInfoRecord(item, priceData) {
        try {
            var core = getCore();
            var config = getConfig();

            var materialName = core.safeGet(item, config.fields.items.name, "Neznámy materiál");
            var dateFormatted = core.formatDate(priceData.documentDate, "DD.MM.YYYY HH:mm:ss");

            var infoMessage = "💰 AUTOMATICKÁ AKTUALIZÁCIA CIEN MATERIÁLU\n";
            infoMessage += "═══════════════════════════════════════════\n";

            infoMessage += "📦 Materiál: " + materialName + "\n";
            var sourceText = priceData.isManualAction ? "manuálny prepočet" : "príjemka";
            var scriptName = priceData.isManualAction ? "Materiál Prepočet ceny Action v1.2.0" : "Príjemky materiálu Prepočet v1.0.0";

            infoMessage += "📅 Dátum: " + dateFormatted + "\n";
            infoMessage += "🔧 Script: " + scriptName + "\n\n";

            infoMessage += "⚙️ NASTAVENIA PREPOČTU:\n";
            infoMessage += "───────────────────────────────────────────\n";
            infoMessage += "• Prepočet ceny: " + priceData.priceCalculation + "\n";
            if (priceData.markupPercentage > 0) {
                infoMessage += "• Obchodná prirážka: " + priceData.markupPercentage + "%\n";
            }
            infoMessage += "• Sadzba DPH: " + priceData.vatRateType + " (" + priceData.vatRate + "%)\n";
            if (priceData.priceRounding && priceData.priceRounding !== "Nezaokrúhľovať") {
                var roundingText = getRoundingDescription(priceData.roundingValue);
                infoMessage += "• Zaokrúhľovanie: " + priceData.priceRounding + " (" + roundingText + ")\n";
            }

            // Informácie o kontrole zmeny nákupnej ceny
            if (priceData.previousPurchasePrice > 0 && priceData.changePercentage > 0) {
                infoMessage += "\n🔍 KONTROLA ZMENY NÁKUPNEJ CENY:\n";
                infoMessage += "───────────────────────────────────────────\n";
                infoMessage += "• Predchádzajúca cena: " + core.formatMoney(priceData.previousPurchasePrice) + "\n";
                infoMessage += "• Nová cena: " + core.formatMoney(priceData.originalPurchasePrice) + "\n";
                infoMessage += "• Zmena: " + priceData.changePercentage.toFixed(2) + "% (" + priceData.changeDirection + ")\n";
                infoMessage += "• Akcia: " + priceData.purchasePriceChangeAction + "\n";
                if (priceData.iconsAdded) {
                    infoMessage += "• Pridané ikony: " + priceData.iconsAdded + "\n";
                }
            }
            infoMessage += "\n";

            infoMessage += "💸 NÁKUPNÉ CENY (nezaokrúhľujú sa):\n";
            infoMessage += "───────────────────────────────────────────\n";
            infoMessage += "• Nákupná cena (" + sourceText + "): " + core.formatMoney(priceData.originalPurchasePrice) + "\n";
            infoMessage += "• Nákupná cena s DPH: " + core.formatMoney(priceData.originalPurchasePriceWithVat) + "\n";
            infoMessage += "\n";

            infoMessage += "💰 PREDAJNÉ CENY (zaokrúhľujú sa s DPH):\n";
            infoMessage += "───────────────────────────────────────────\n";
            if (priceData.priceCalculation === "Podľa prirážky" && priceData.markupPercentage > 0) {
                infoMessage += "• Základná nákupná: " + core.formatMoney(priceData.originalPurchasePrice) + "\n";
                infoMessage += "• S prirážkou " + priceData.markupPercentage + "%: " + core.formatMoney(priceData.originalSellingPrice) + "\n";
            } else {
                infoMessage += "• Predajná cena (= nákupná): " + core.formatMoney(priceData.originalSellingPrice) + "\n";
            }
            infoMessage += "• Predajná s DPH (pred zaokr.): " + core.formatMoney(priceData.originalPriceWithVat) + "\n";
            if (priceData.priceRounding && priceData.priceRounding !== "Nezaokrúhľovať") {
                infoMessage += "• Zaokrúhlená s DPH: " + core.formatMoney(priceData.finalPriceWithVat) + "\n";
                infoMessage += "• Finálna predajná bez DPH: " + core.formatMoney(priceData.finalPrice) + "\n";
            } else {
                infoMessage += "• Bez zaokrúhľovania: " + core.formatMoney(priceData.finalPriceWithVat) + "\n";
            }
            infoMessage += "\n";

            infoMessage += "📊 FINÁLNE HODNOTY V MATERIÁLI:\n";
            infoMessage += "───────────────────────────────────────────\n";
            infoMessage += "• Nákupná cena: " + core.formatMoney(priceData.finalPurchasePrice) + "\n";
            infoMessage += "• Nákupná cena s DPH: " + core.formatMoney(priceData.finalPurchasePriceWithVat) + "\n";
            infoMessage += "• Predajná cena: " + core.formatMoney(priceData.finalPrice) + "\n";
            infoMessage += "• Predajná cena s DPH: " + core.formatMoney(priceData.finalPriceWithVat) + "\n";

            if (priceData.markupPercentage > 0) {
                var actualMargin = ((priceData.finalPrice - priceData.finalPurchasePrice) / priceData.finalPurchasePrice) * 100;
                infoMessage += "• Skutočná marža: " + actualMargin.toFixed(2) + "%\n";
            }

            // Informácie o cenové histórii
            if (priceData.priceHistoryResult) {
                infoMessage += "\n📈 CENOVÁ HISTÓRIA:\n";
                infoMessage += "───────────────────────────────────────────\n";
                if (priceData.priceHistoryResult.success) {
                    if (priceData.priceHistoryResult.created) {
                        infoMessage += "• Vytvorený nový záznam v knižnici 'ceny materiálu'\n";
                        infoMessage += "• Dátum platnosti: " + core.formatDate(priceData.priceHistoryResult.date) + "\n";
                        infoMessage += "• Cena: " + core.formatMoney(priceData.priceHistoryResult.newPrice) + "\n";
                    } else if (priceData.priceHistoryResult.updated) {
                        infoMessage += "• Aktualizovaný existujúci záznam v knižnici 'ceny materiálu'\n";
                        infoMessage += "• Dátum platnosti: " + core.formatDate(priceData.priceHistoryResult.date) + "\n";
                        infoMessage += "• Stará cena: " + core.formatMoney(priceData.priceHistoryResult.oldPrice) + "\n";
                        infoMessage += "• Nová cena: " + core.formatMoney(priceData.priceHistoryResult.newPrice) + "\n";
                    }
                } else {
                    infoMessage += "• ❌ Chyba pri vytváraní záznamu: " + priceData.priceHistoryResult.message + "\n";
                }
            }

            infoMessage += "\n✅ CENY AKTUALIZOVANÉ ÚSPEŠNE";

            // Nastavenie info záznamu do materiálu
            var materialInfoField = config.fields.common.info;
            core.safeSet(item, materialInfoField, infoMessage);

            core.addDebug(entry(), "✅ Info záznam vytvorený pre materiál: " + materialName);

            return true;

        } catch (error) {
            var core = getCore();
            if (core) {
                core.addError(entry(), "Chyba pri vytváraní info záznamu pre materiál: " + error.toString(), "createMaterialInfoRecord", error);
            }
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

        // hľadanie cien
        findValidWorkPrice: findValidWorkPrice,
        findValidMachinePrice: findValidMachinePrice,
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
        findLinkedObligations: findLinkedObligations,

        // Výpočet marže a rentability
        calculateProfitability: calculateProfitability,

        // DPH funkcie
        getValidVatRate: getValidVatRate,

        // Materiál funkcie - NOVÉ
        calculateAndUpdateMaterialPrices: calculateAndUpdateMaterialPrices,
        applyPriceRounding: applyPriceRounding,
        createMaterialInfoRecord: createMaterialInfoRecord,
        createOrUpdateMaterialPriceRecord: createOrUpdateMaterialPriceRecord
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