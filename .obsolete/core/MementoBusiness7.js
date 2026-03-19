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

    // ==============================================
    // MODULE INFO
    // ==============================================

    var MODULE_INFO = {
        name: "MementoBusiness",
        version: "7.1.0",
        author: "ASISTANTO",
        description: "Business logic: attendance calculations, payroll, work hours, employee management (MONOLITH - will be split in Phase 3)",
        dependencies: ["MementoUtils", "MementoCore", "MementoConfig"],
        provides: [
            "calculateWorkHours", "calculateWage", "processAttendance",
            "calculateOvertime", "getRateForEmployee", "createObligation",
            "formatWorkReport", "calculateBreak", "processEmployees"
        ],
        status: "stable",
        note: "This 3,920-line monolith will be split into focused modules (Time, Date, Validation, Formatting, Calculations) in Phase 3"
    };

    var version = MODULE_INFO.version;

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

    /**
     * Univerzálny výpočet pracovného času s parsing a zaokrúhľovaním
     * @param {Date|String} startTime - Začiatok (príchod/začatie)
     * @param {Date|String} endTime - Koniec (odchod/ukončenie)
     * @param {Object} options - Voliteľné nastavenia
     * @param {Object} options.entry - Aktuálny entry (default: currentEntry)
     * @param {Object} options.config - Konfigurácia (default: CONFIG)
     * @param {Boolean} options.roundToQuarter - Zaokrúhliť na štvrťhodiny (default: false)
     * @param {String} options.startFieldName - Názov poľa pre začiatok (pre uloženie)
     * @param {String} options.endFieldName - Názov poľa pre koniec (pre uloženie)
     * @param {String} options.workTimeFieldName - Názov poľa pre pracovnú dobu (pre uloženie)
     * @param {String} options.debugLabel - Label pre debug správy (default: "Pracovný čas")
     * @returns {Object} {success, startTimeRounded, endTimeRounded, startTimeOriginal, endTimeOriginal, pracovnaDobaHodiny, workHours}
     */
    function calculateWorkTime(startTime, endTime, options) {
        var core = getCore();
        options = options || {};

        var entry = options.entry || currentEntry;
        var config = options.config || getConfig();
        var roundToQuarter = options.roundToQuarter !== undefined ? options.roundToQuarter : false;
        var debugLabel = options.debugLabel || "Pracovný čas";

        try {
            core.addDebug(entry, "  Výpočet " + debugLabel.toLowerCase(), "calculation");

            // Spracuj časy cez core funkcie
            var startTimeParsed = core.parseTimeInput(startTime);
            var endTimeParsed = core.parseTimeInput(endTime);

            if (!startTimeParsed || !endTimeParsed) {
                return { success: false, error: "Nepodarilo sa spracovať časy" };
            }

            // Zaokrúhli časy ak je to povolené
            var startTimeFinal = startTimeParsed;
            var endTimeFinal = endTimeParsed;

            if (roundToQuarter) {
                startTimeFinal = core.roundTimeToQuarter(startTimeParsed);
                endTimeFinal = core.roundTimeToQuarter(endTimeParsed);

                core.addDebug(entry, "  Zaokrúhlenie aktivované:", "round");
                core.addDebug(entry, "  • Od: " + core.formatTime(startTimeParsed) + " → " + core.formatTime(startTimeFinal));
                core.addDebug(entry, "  • Do: " + core.formatTime(endTimeParsed) + " → " + core.formatTime(endTimeFinal));

                // Ulož zaokrúhlené časy ak sú zadané názvy polí
                if (options.startFieldName) {
                    core.safeSet(entry, options.startFieldName, startTimeFinal.toDate());
                }
                if (options.endFieldName) {
                    core.safeSet(entry, options.endFieldName, endTimeFinal.toDate());
                }
            }

            // Výpočet hodín s novými časmi
            var workHours = calculateWorkHours(startTimeFinal, endTimeFinal);

            if (!workHours || workHours.error) {
                return { success: false, error: workHours ? workHours.error : "Nepodarilo sa vypočítať hodiny" };
            }

            var pracovnaDobaHodiny = workHours.totalMinutes / 60;
            pracovnaDobaHodiny = Math.round(pracovnaDobaHodiny * 100) / 100;

            // Ulož do poľa ak je zadaný názov
            if (options.workTimeFieldName) {
                core.safeSet(entry, options.workTimeFieldName, pracovnaDobaHodiny);
            }

            core.addDebug(entry, "  • " + debugLabel + ": " + pracovnaDobaHodiny + " hodín");

            return {
                success: true,
                startTimeRounded: startTimeFinal,
                endTimeRounded: endTimeFinal,
                startTimeOriginal: startTimeParsed,
                endTimeOriginal: endTimeParsed,
                pracovnaDobaHodiny: pracovnaDobaHodiny,
                workHours: workHours
            };

        } catch (error) {
            core.addError(entry, error.toString(), "calculateWorkTime", error);
            return { success: false, error: error.toString() };
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
                var validFrom = core.safeGet(rate, fields.validFrom);
                var hourlyRate = core.safeGet(rate, fields.hourlyRate);
                
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
                core.addError(employee, "Chyba pri hľadaní sadzby: " + error.toString() + ", Line: " + error.lineNumber, "findValidHourlyRate", error);
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

    // ==============================================
    // UNIVERZÁLNA FUNKCIA PRE HĽADANIE PLATNÝCH CIEN
    // ==============================================

    /**
     * Univerzálna funkcia pre hľadanie platnej ceny k dátumu
     * @param {Object} itemEntry - Záznam položky (materiál, práca, stroj, vozidlo, atď.)
     * @param {Date} date - Dátum pre ktorý hľadáme cenu
     * @param {Object} options - Konfiguračné nastavenia
     * @param {String} options.priceLibrary - Názov knižnice s históriou cien (napr. "materialPrices", "workPrices")
     * @param {String} options.linkField - Názov linkToEntry poľa v histórii cien (napr. "material", "work")
     * @param {String} options.dateField - Názov poľa s dátumom platnosti (default: "validFrom")
     * @param {String|Array} options.priceField - Názov poľa/polí s cenou (napr. "sellPrice", "price" alebo ["priceMth", "flatRate"])
     * @param {String} options.fallbackPriceField - Názov poľa v samotnej položke pre aktuálnu cenu (napr. "price")
     * @param {Object} options.currentEntry - Entry pre debug výpisy (optional)
     * @returns {Number|Object|null} - Platná cena alebo null
     *
     * @example
     * // Hľadanie ceny materiálu
     * var materialPrice = business.findValidPrice(materialEntry, currentDate, {
     *     priceLibrary: "materialPrices",
     *     linkField: "material",
     *     priceField: "sellPrice",
     *     fallbackPriceField: "price",
     *     currentEntry: currentEntry
     * });
     *
     * @example
     * // Hľadanie ceny práce
     * var workPrice = business.findValidPrice(workEntry, currentDate, {
     *     priceLibrary: "workPrices",
     *     linkField: "work",
     *     priceField: "price"
     * });
     *
     * @example
     * // Hľadanie ceny stroja (vracia objekt s priceMth a flatRate)
     * var machinePrice = business.findValidPrice(machineEntry, currentDate, {
     *     priceLibrary: "machinePrices",
     *     linkField: "machine",
     *     priceField: ["priceMth", "flatRate"] // Multiple fields
     * });
     */
    function findValidPrice(itemEntry, date, options) {
        var core = getCore();
        var config = getConfig();

        try {
            // Validácia vstupov
            if (!itemEntry || !date) {
                return null;
            }

            if (!options || !options.priceLibrary || !options.linkField || !options.priceField) {
                if (core && options && options.currentEntry) {
                    core.addError(options.currentEntry,
                        "❌ findValidPrice: Chýbajúce povinné parametre (priceLibrary, linkField, priceField)",
                        "findValidPrice");
                }
                return null;
            }

            var currentEntry = options.currentEntry || null;

            // Získaj konfiguráciu pre knižnicu cien
            var priceLibraryName = config.libraries[options.priceLibrary];
            var priceFieldsConfig = config.fields[options.priceLibrary];

            if (!priceLibraryName || !priceFieldsConfig) {
                if (currentEntry && core) {
                    core.addDebug(currentEntry, "⚠️ Knižnica alebo fields pre " + options.priceLibrary + " nenájdené v konfigurácii");
                }
                return null;
            }

            // Získaj názvy polí
            var linkFieldName = priceFieldsConfig[options.linkField];
            var dateFieldName = priceFieldsConfig[options.dateField || "validFrom"];

            if (!linkFieldName) {
                if (currentEntry && core) {
                    core.addDebug(currentEntry, "⚠️ Link field '" + options.linkField + "' nenájdený v konfigurácii pre " + options.priceLibrary);
                }
                return null;
            }

            // Získaj záznamy z histórie cien
            var priceRecords = core.safeGetLinksFrom(itemEntry, priceLibraryName, linkFieldName);

            if (!priceRecords || priceRecords.length === 0) {
                // Pokús sa použiť fallback cenu z položky samotnej
                if (options.fallbackPriceField) {
                    var fallbackFieldConfig = config.fields.items || config.fields.priceList || {};
                    var fallbackFieldName = fallbackFieldConfig[options.fallbackPriceField];

                    if (fallbackFieldName) {
                        var fallbackPrice = core.safeGet(itemEntry, fallbackFieldName);
                        if (fallbackPrice !== null && fallbackPrice !== undefined) {
                            if (currentEntry) {
                                core.addDebug(currentEntry, "  📌 Použijem aktuálnu cenu z položky: " + fallbackPrice);
                            }
                            return fallbackPrice;
                        }
                    }
                }

                if (currentEntry && core) {
                    core.addDebug(currentEntry, "  ℹ️ Žiadne cenové záznamy v histórii");
                }
                return null;
            }

            // Priprav výsledný objekt alebo hodnotu
            var isMultipleFields = Array.isArray(options.priceField);
            var validPrice = isMultipleFields ? {} : null;
            var latestValidFrom = null;

            // Nájdi najnovšiu platnú cenu
            for (var i = 0; i < priceRecords.length; i++) {
                var priceRecord = priceRecords[i];
                var validFrom = core.safeGet(priceRecord, dateFieldName);

                // Skontroluj či je dátum platný a nie je v budúcnosti
                if (validFrom && moment(validFrom).isSameOrBefore(date)) {
                    // Kontrola či je to najnovší dátum
                    if (!latestValidFrom || moment(validFrom).isAfter(latestValidFrom)) {
                        latestValidFrom = validFrom;

                        // Získaj cenu/ceny
                        if (isMultipleFields) {
                            // Multiple price fields (napr. pre stroje: priceMth, flatRate)
                            for (var j = 0; j < options.priceField.length; j++) {
                                var fieldKey = options.priceField[j];
                                var fieldName = priceFieldsConfig[fieldKey];
                                if (fieldName) {
                                    validPrice[fieldKey] = core.safeGet(priceRecord, fieldName, 0);
                                }
                            }
                        } else {
                            // Single price field
                            var priceFieldName = priceFieldsConfig[options.priceField];
                            if (priceFieldName) {
                                var price = core.safeGet(priceRecord, priceFieldName);
                                if (price !== null && price !== undefined) {
                                    validPrice = price;
                                }
                            }
                        }
                    }
                }
            }

            // Debug výstup
            if (currentEntry && core && latestValidFrom) {
                var priceDisplay = isMultipleFields ? JSON.stringify(validPrice) : validPrice;
                core.addDebug(currentEntry, "  ✅ Nájdená platná cena k " + moment(latestValidFrom).format("DD.MM.YYYY") + ": " + priceDisplay);
            }

            // Ak sme nenašli cenu v histórii, skús fallback
            if ((isMultipleFields && Object.keys(validPrice).length === 0) ||
                (!isMultipleFields && validPrice === null)) {

                if (options.fallbackPriceField) {
                    var fallbackFieldConfig2 = config.fields.items || config.fields.priceList || {};
                    var fallbackFieldName2 = fallbackFieldConfig2[options.fallbackPriceField];

                    if (fallbackFieldName2) {
                        var fallbackPrice2 = core.safeGet(itemEntry, fallbackFieldName2);
                        if (fallbackPrice2 !== null && fallbackPrice2 !== undefined) {
                            if (currentEntry && core) {
                                core.addDebug(currentEntry, "  📌 Použijem aktuálnu cenu z položky (fallback): " + fallbackPrice2);
                            }
                            return fallbackPrice2;
                        }
                    }
                }
            }

            return validPrice;

        } catch (error) {
            if (core && options && options.currentEntry) {
                core.addError(options.currentEntry,
                    "❌ Chyba v findValidPrice: " + error.toString() + ", Line: " + error.lineNumber,
                    "findValidPrice", error);
            }
            return null;
        }
    }

    // Deprecated - použiť findValidPrice s options
    function findValidItemPrice(itemEntry, date) {
        return findValidPrice(itemEntry, date, {
            priceLibrary: "materialPrices",
            linkField: "material",
            priceField: "sellPrice",
            buyPriceField: "buyPrice",
            fallbackPriceField: "price"
        });
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
                core.addError(item, "Chyba pri hľadaní ceny: " + error.toString() + ", Line: " + error.lineNumber, "findValidMachinePrice", error);

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
                core.addError(item, "Chyba pri hľadaní ceny: " + error.toString() + ", Line: " + error.lineNumber, "findValidWorkPrice", error);
            }
            return null;
        }
    }

    /**
     * Univerzálne spracovanie jedného zamestnanca
     * @param {Object} zamestnanec - Záznam zamestnanca
     * @param {Number} pracovnaDobaHodiny - Počet hodín
     * @param {Date} datum - Dátum záznamu
     * @param {Number} index - Index v poli zamestnancov
     * @param {Object} options - Voliteľné nastavenia
     * @param {Object} options.entry - Aktuálny entry (default: currentEntry)
     * @param {Object} options.config - Konfigurácia (default: CONFIG)
     * @param {String} options.employeeFieldName - Názov poľa so zamestnancami
     * @param {Object} options.attributes - Definície atribútov polí
     * @param {Boolean} options.includeExtras - Zahrnúť príplatky/prémie/pokuty (default: false)
     * @param {Boolean} options.processObligations - Spracovať záväzky (default: false)
     * @param {Array} options.existingObligations - Existujúce záväzky pre update
     * @returns {Object} {success, hodinovka, dennaMzda, priplatok, premia, pokuta, zamestnanec, ...}
     */
    function processEmployee(zamestnanec, pracovnaDobaHodiny, datum, index, options) {
        var core = getCore();
        options = options || {};

        var entry = options.entry || currentEntry;
        var config = options.config || CONFIG;
        var includeExtras = options.includeExtras || false;
        var processObligations = options.processObligations || false;

        try {
            // Nájdi platnú hodinovku
            var hodinovka = findValidSalary(entry, zamestnanec, datum);

            if (!hodinovka || hodinovka <= 0) {
                core.addDebug(entry, "  ❌ Preskakujem - nemá platnú sadzbu");
                return { success: false };
            }

            // Získaj pole zamestnancov
            var employeeFieldName = options.employeeFieldName || config.fields.attendance.employees || config.fields.workRecord.employees;
            var zamArray = entry.field(employeeFieldName);

            if (!zamArray || zamArray.length <= index || !zamArray[index]) {
                core.addError(entry, "Nepodarilo sa získať zamestnanca na indexe " + index, "processEmployee");
                return { success: false };
            }

            var attributes = options.attributes || config.attributes || {};

            // Debug: Kontrola atribútov
            core.addDebug(entry, "  📋 Nastavujem atribúty:");
            core.addDebug(entry, "    • Index: " + index);
            core.addDebug(entry, "    • zamArray.length: " + zamArray.length);
            core.addDebug(entry, "    • attributes: " + JSON.stringify(attributes));

            // Nastav základné atribúty
            if (attributes.workedHours || attributes.workRecordEmployees) {
                var workedHoursAttr = attributes.workedHours || (attributes.workRecordEmployees && attributes.workRecordEmployees.workedHours);
                if (workedHoursAttr) {
                    core.addDebug(entry, "    ✅ Nastavujem '" + workedHoursAttr + "' = " + pracovnaDobaHodiny);
                    zamArray[index].setAttr(workedHoursAttr, pracovnaDobaHodiny);
                }
            }

            if (attributes.hourlyRate || attributes.workRecordEmployees) {
                var hourlyRateAttr = attributes.hourlyRate || (attributes.workRecordEmployees && attributes.workRecordEmployees.hourlyRate);
                if (hourlyRateAttr) {
                    core.addDebug(entry, "    ✅ Nastavujem '" + hourlyRateAttr + "' = " + hodinovka);
                    zamArray[index].setAttr(hourlyRateAttr, hodinovka);
                }
            }

            // Spracuj príplatky, prémie, pokuty ak je požadované
            var priplatok = 0;
            var premia = 0;
            var pokuta = 0;

            if (includeExtras && attributes.bonus) {
                priplatok = zamArray[index].attr(attributes.bonus) || 0;
            }
            if (includeExtras && attributes.premium) {
                premia = zamArray[index].attr(attributes.premium) || 0;
            }
            if (includeExtras && attributes.penalty) {
                pokuta = zamArray[index].attr(attributes.penalty) || 0;
            }

            // Vypočítaj dennú mzdu
            var dennaMzda;
            if (includeExtras) {
                dennaMzda = (pracovnaDobaHodiny * (hodinovka + priplatok)) + premia - pokuta;
            } else {
                dennaMzda = pracovnaDobaHodiny * hodinovka;
            }
            dennaMzda = Math.round(dennaMzda * 100) / 100;

            // Nastav mzdové náklady (dennú mzdu)
            if (attributes.wageCosts || attributes.workRecordEmployees) {
                var wageCostsAttr = attributes.wageCosts || (attributes.workRecordEmployees && attributes.workRecordEmployees.wageCosts);
                if (wageCostsAttr) {
                    core.addDebug(entry, "    ✅ Nastavujem '" + wageCostsAttr + "' = " + dennaMzda);
                    zamArray[index].setAttr(wageCostsAttr, dennaMzda);
                }
            }

            var result = {
                success: true,
                hodinovka: hodinovka,
                dennaMzda: dennaMzda,
                priplatok: priplatok,
                premia: premia,
                pokuta: pokuta,
                zamestnanec: zamestnanec
            };

            // Spracuj záväzky ak je požadované
            if (processObligations && options.processObligation) {
                var obligationResult = options.processObligation(datum, {
                    entry: zamestnanec,
                    dailyWage: dennaMzda,
                    name: formatEmployeeName(zamestnanec)
                }, options.existingObligations);

                result.created = obligationResult.created;
                result.updated = obligationResult.updated;
                result.totalAmount = obligationResult.totalAmount;
                result.errors = obligationResult.errors;
                result.total = obligationResult.total;
                result.obligationResult = obligationResult;
            }

            if (includeExtras) {
                core.addDebug(entry, "  • Denná mzda: " + dennaMzda + " €");
            } else {
                core.addDebug(entry, "  • Mzdové náklady: " + dennaMzda + " €");
            }
            core.addDebug(entry, "Spracované úspešne", "success");

            return result;

        } catch (error) {
            core.addError(entry, error.toString(), "processEmployee", error);
            return { success: false };
        }
    }

    function processEmployees(zamestnanci, pracovnaDobaHodiny, datum, options) {
        var core = getCore();
        options = options || {};

        var entry = options.entry || currentEntry;
        var config = options.config || CONFIG;

        try {
            var result = {
                success: false,
                pocetPracovnikov: zamestnanci.length,
                odpracovaneTotal: 0,
                pracovnaDoba: pracovnaDobaHodiny,
                celkoveMzdy: 0,
                detaily: [],
                created: 0,
                updated: 0,
                totalAmount: 0
            };

            // Ulož počet pracovníkov - určuj pole pred použitím
            var employeeCountField = config.fields.pocetPracovnikov ||
                                   (config.fields.attendance ? config.fields.attendance.employeeCount : null) ||
                                   (config.fields.workRecord ? config.fields.workRecord.employeeCount : null);

            if (employeeCountField) {
                core.safeSet(entry, employeeCountField, result.pocetPracovnikov);
            }

            // Získaj existujúce záväzky ak je požadované
            if (options.processObligations && options.findLinkedObligations) {
                options.existingObligations = options.findLinkedObligations(options.libraryType || 'attendance');
                core.addDebug(entry, core.getIcon("document") + "  Nájdené existujúce záväzky: " + options.existingObligations.length);
            }

            // Spracuj každého zamestnanca
            for (var i = 0; i < zamestnanci.length; i++) {
                var zamestnanec = zamestnanci[i];

                if (!zamestnanec) {
                    core.addDebug(entry, "Zamestnanec[" + i + "] je null - preskakujem", "warning");
                    continue;
                }

                var employeeName = formatEmployeeName(zamestnanec);
                core.addDebug(entry, " [" + (i+1) + "/" + result.pocetPracovnikov + "] " + employeeName, "person");

                // Spracuj zamestnanca s options
                var empResult = processEmployee(zamestnanec, pracovnaDobaHodiny, datum, i, options);

                if (empResult.success) {
                    result.odpracovaneTotal += pracovnaDobaHodiny;
                    result.celkoveMzdy += empResult.dennaMzda;
                    result.detaily.push(empResult);
                    result.success = true;

                    // Agreguj výsledky záväzkov ak existujú
                    if (empResult.created !== undefined) {
                        result.created += empResult.created;
                        result.updated += empResult.updated;
                        result.totalAmount += empResult.totalAmount;
                    }
                } else {
                    result.success = false;
                }
            }

            // Loguj súhrn záväzkov ak boli spracované
            if (options.processObligations) {
                core.addDebug(entry, core.getIcon("note") + "  Záväzky z tohto záznamu:");
                core.addDebug(entry, core.getIcon("checkmark") + "    Vytvorené: " + result.created);
                core.addDebug(entry, core.getIcon("update") + "    Aktualizované: " + result.updated);
                core.addDebug(entry, core.getIcon("money") + "    Celková suma: " + core.formatMoney(result.totalAmount));
            }

            return result;

        } catch (error) {
            core.addError(entry, error.toString(), "processEmployees", error);
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
        var currentEntry = entry();
        try {
            core.addDebug(currentEntry, "  🔄 Aktualizácia existujúceho záväzku...");
            
            var paidAmount = core.safeGet(obligation, config.fields.obligations.paid || 0);
            var newBalance = amount - paidAmount;
            var newStatus = newBalance <= 0 ? config.constants.obligationStates.paid : 
                        paidAmount > 0 ? config.constants.obligationStates.partiallyPaid : 
                        config.constants.obligationStates.unpaid;
            obligation.set(config.fields.obligations.date, date);
            obligation.set(config.fields.obligations.amount, amount);
            obligation.set(config.fields.obligations.balance, newBalance);
            obligation.set(config.fields.obligations.state, newStatus);
            
            core.addDebug(currentEntry, "  ☑️ Záväzok aktualizovaný");
            core.addDebug(currentEntry, "    Suma: " + core.formatMoney(amount) + 
                                        " | Zostatok: " + core.formatMoney(newBalance));
            
            return true;
            
        } catch (error) {
            core.addError(currentEntry, "Chyba pri aktualizácii: " + error.toString(), "updateObligation", error);
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
                core.addError(item, "Dátum nie je zadaný pre zistenie DPH", "getValidVatRate");
                return 0;
            }

            var vatRatesLibName = config.libraries.vatRatesLib || "sadzby DPH";
            var vatRatesLib = libByName(vatRatesLibName);

            if (!vatRatesLib) {
                core.addError(item, "Knižnica sadzby DPH neexistuje", "getValidVatRate");
                return 0;
            }

            var targetDate = moment(date);
            if (!targetDate.isValid()) {
                core.addError(item, "Neplatný dátum: " + date, "getValidVatRate");
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
                core.addError(item, "Nenašla sa platná sadzba DPH k dátumu " + targetDate.format("DD.MM.YYYY"), "getValidVatRate");
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
                core.addDebug(item, "DPH sadzba nie je nastavená pre typ: " + vatType + ", k dátumu: " + targetDate.format("DD.MM.YYYY"), "warning");
            }

            return parseFloat(vatRate) || 0;

        } catch (error) {
            if (core) {
                core.addError(item, "Chyba pri hľadaní DPH sadzby: " + error.toString(), "getValidVatRate", error);
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
                core.addError(item, "❌ Knižnica " + materialPricesLibraryName + " neexistuje", "createOrUpdateMaterialPriceRecord");
                return {
                    success: false,
                    message: "Knižnica ceny materiálu neexistuje"
                };
            }

            var dateFormatted = core.formatDate(priceDate, "DD.MM.YYYY");
            core.addDebug(item, "💰 " + materialName + " - Spracovávam cenový záznam k " + dateFormatted);

            // Hľadanie existujúceho záznamu pre tento materiál a dátum
            var existingPriceEntry = null;
            var priceEntries = materialItem.linksFrom(pricesLibrary);

            core.addDebug(item, "🔍 DEBUG: Hľadám existujúce cenové záznamy, nájdených: " + (priceEntries ? priceEntries.length : 0));

            if (priceEntries && priceEntries.length > 0) {
                // Konverzia cieľového dátumu na začiatok dňa (00:00:00) v millisekondách
                var targetDate = new Date(priceDate);
                var targetDateDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
                var targetDateMs = targetDateDay.getTime();

                var targetDateStr = moment(priceDate).format("YYYY-MM-DD");
                core.addDebug(item, "🔍 DEBUG: Hľadám záznamy s dátumom: " + targetDateStr + " (ms: " + targetDateMs + ")");

                for (var i = 0; i < priceEntries.length; i++) {
                    var priceEntry = priceEntries[i];
                    var entryDate = core.safeGet(priceEntry, config.fields.materialPrices.date);

                    if (entryDate) {
                        var entryDateMs;
                        var entryDateStr;

                        // Konvertuj dátum záznamu na millisekudy začiatku dňa
                        if (typeof entryDate === 'number') {
                            // Ak je dátum už v millisekndách
                            var entryDateObj = new Date(entryDate);
                            var entryDateDay = new Date(entryDateObj.getFullYear(), entryDateObj.getMonth(), entryDateObj.getDate());
                            entryDateMs = entryDateDay.getTime();
                            entryDateStr = moment(entryDate).format("YYYY-MM-DD");
                        } else if (entryDate instanceof Date) {
                            // Ak je dátum Date objekt
                            var entryDateDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
                            entryDateMs = entryDateDay.getTime();
                            entryDateStr = moment(entryDate).format("YYYY-MM-DD");
                        } else {
                            // Ak je string alebo iný formát, parsuj cez moment
                            var parsedDate = moment(entryDate);
                            if (parsedDate.isValid()) {
                                var entryDateDay = new Date(parsedDate.year(), parsedDate.month(), parsedDate.date());
                                entryDateMs = entryDateDay.getTime();
                                entryDateStr = parsedDate.format("YYYY-MM-DD");
                            } else {
                                core.addDebug(item, "⚠️ DEBUG: Neplatný dátum v zázname: " + entryDate);
                                continue;
                            }
                        }

                        core.addDebug(item, "🔍 DEBUG: Porovnávam " + targetDateStr + " (" + targetDateMs + ") vs " + entryDateStr + " (" + entryDateMs + ")");

                        // Porovnanie dátumov pomocou millisekúnd (len dátum, nie čas)
                        if (entryDateMs === targetDateMs) {
                            existingPriceEntry = priceEntry;
                            core.addDebug(item, "✅ DEBUG: Nájdený existujúci záznam pre dátum " + targetDateStr);
                            break;
                        }
                    } else {
                        core.addDebug(item, "⚠️ DEBUG: Záznam nemá dátum: index " + i);
                    }
                }

                if (!existingPriceEntry) {
                    core.addDebug(item, "❌ DEBUG: Žiadny existujúci záznam pre dátum " + targetDateStr + " nebol nájdený");
                }
            }

            if (existingPriceEntry) {
                // Získanie polí pre aktualizáciu
                var sellPriceField = config.fields.materialPrices.sellPrice;
                var purchasePriceField = config.fields.materialPrices.purchasePrice;
                var vatRateField = config.fields.materialPrices.vatRate;

                // Získanie aktuálnej sadzby DPH z materiálu
                var materialVatRate = core.safeGet(materialItem, config.fields.items.vatRate, "Základná");
                var vatRatePercentage = getValidVatRate(materialVatRate, priceDate);

                var oldSellPrice = parseFloat(core.safeGet(existingPriceEntry, sellPriceField, 0));
                var oldPurchasePrice = parseFloat(core.safeGet(existingPriceEntry, purchasePriceField, 0));

                // Aktualizácia polí
                core.safeSet(existingPriceEntry, sellPriceField, sellPrice);
                core.safeSet(existingPriceEntry, purchasePriceField, purchasePrice);
                core.safeSet(existingPriceEntry, vatRateField, vatRatePercentage + "%");

                core.addDebug(item, "🔄 " + materialName + " - Aktualizovaný cenový záznam k " + dateFormatted);
                core.addDebug(item, "  • Predajná: " + core.formatMoney(oldSellPrice) + " -> " + core.formatMoney(sellPrice));
                core.addDebug(item, "  • Nákupná: " + core.formatMoney(oldPurchasePrice) + " -> " + core.formatMoney(purchasePrice));

                return {
                    success: true,
                    updated: true,
                    message: "Cenový záznam aktualizovaný",
                    oldSellPrice: oldSellPrice,
                    oldPurchasePrice: oldPurchasePrice,
                    oldPrice: oldSellPrice, // Pre Info záznam
                    newPrice: sellPrice,    // Pre Info záznam
                    sellPrice: sellPrice,
                    purchasePrice: purchasePrice,
                    date: priceDate
                };

            } else {
                // Vytvorenie nového záznamu
                core.addDebug(item, "➕ Existujúci záznam nenájdený, vytváram nový");
                var newPriceEntry = pricesLibrary.create({});

                var materialField = config.fields.materialPrices.material;
                var dateField = config.fields.materialPrices.date;
                var purchasePriceField = config.fields.materialPrices.purchasePrice;
                var sellPriceField = config.fields.materialPrices.sellPrice;
                var vatRateField = config.fields.materialPrices.vatRate;

                // Získanie aktuálnej sadzby DPH z materiálu
                var materialVatRate = core.safeGet(materialItem, config.fields.items.vatRate, "Základná");
                var vatRatePercentage = getValidVatRate(materialVatRate, priceDate);

                core.safeSet(newPriceEntry, materialField, [materialItem]);
                core.safeSet(newPriceEntry, dateField, priceDate);
                core.safeSet(newPriceEntry, purchasePriceField, purchasePrice);
                core.safeSet(newPriceEntry, sellPriceField, sellPrice);
                core.safeSet(newPriceEntry, vatRateField, vatRatePercentage + "%");


                core.addDebug(item, "➕ " + materialName + " - Vytvorený nový cenový záznam k " + dateFormatted + ": " + core.formatMoney(sellPrice));

                return {
                    success: true,
                    created: true,
                    message: "Nový cenový záznam vytvorený",
                    purchasePrice: purchasePrice,
                    sellPrice: sellPrice,
                    newPrice: sellPrice,    // Pre Info záznam
                    date: priceDate,
                    entryId: core.safeGet(newPriceEntry, "ID", "N/A")
                };
            }

        } catch (error) {
            var core = getCore();
            if (core) {
                core.addError(item, "Chyba pri spracovaní cenového záznamu: " + error.toString(), "createOrUpdateMaterialPriceRecord", error);
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
     * Detekuje všetky typy zmien cien a rozhodne o potrebe prepočtu
     * @param {Object} item - Materiál entry
     * @param {number} purchasePrice - Nová nákupná cena
     * @param {boolean} isManualAction - Či ide o manuálnu akciu
     * @param {Object} options - Dodatočné možnosti (forceRecalculation)
     * @returns {Object} Rozhodnutie o prepočte
     */
    function detectAllPriceChanges(item, purchasePrice, isManualAction, options) {
        try {
            var core = getCore();
            var config = getConfig();
            options = options || {};

            var materialName = core.safeGet(item, config.fields.items.name, "Neznámy materiál");

            // Pre manuálne akcie s vynúteným prepočtom - vždy prepočítaj
            if (isManualAction && options.forceRecalculation) {
                core.addDebug(item, "🚀 " + materialName + " - Vynútený prepočet (manuálna akcia)");
                return {
                    shouldRecalculate: true,
                    reason: "Manuálna akcia - vynútený prepočet",
                    iconsToAdd: ["🔄"]
                };
            }

            // Súčasné hodnoty pre porovnanie
            var currentPurchasePrice = parseFloat(core.safeGet(item, config.fields.items.purchasePrice, 0));
            var changePercentageThreshold = parseFloat(core.safeGet(item, config.fields.items.changePercentage, 0));
            var purchasePriceChangeAction = core.safeGet(item, config.fields.items.purchasePriceChange, "").trim();

            // Pre manuálne akcie bez force - stále umožni prepočet aj s malými zmenami
            if (isManualAction) {
                core.addDebug(item, "⚙️ " + materialName + " - Manuálna akcia, povolený prepočet");
                return {
                    shouldRecalculate: true,
                    reason: "Manuálna akcia - povolený prepočet",
                    iconsToAdd: ["⚙️"]
                };
            }

            // Štandardná kontrola zmeny nákupnej ceny pre automatické triggery
            var iconsToAdd = [];
            if (currentPurchasePrice > 0 && changePercentageThreshold > 0) {
                var percentageChange = Math.abs((purchasePrice - currentPurchasePrice) / currentPurchasePrice) * 100;
                var isPriceIncrease = purchasePrice > currentPurchasePrice;

                core.addDebug(item, "ℹ️ " + materialName + " - Kontrola zmeny ceny: " + core.formatMoney(currentPurchasePrice) + " -> " + core.formatMoney(purchasePrice) + " (" + percentageChange.toFixed(2) + "%)");

                if (percentageChange >= changePercentageThreshold) {
                    // Pridanie ikony šípky podľa zmeny ceny
                    var directionIcon = isPriceIncrease ? "⬆️" : "⬇️";
                    iconsToAdd.push(directionIcon);

                    core.addDebug(item, "⚠️ " + materialName + " - Zmena ceny " + percentageChange.toFixed(2) + "% prekročila prah " + changePercentageThreshold + "%");

                    switch (purchasePriceChangeAction) {
                        case "Upozorniť":
                            iconsToAdd.push("⚠️");
                            return {
                                shouldRecalculate: false,
                                reason: "Iba upozornenie, prepočet sa preskočí",
                                iconsToAdd: iconsToAdd
                            };

                        case "Prepočítať":
                            iconsToAdd.push("🔄");
                            return {
                                shouldRecalculate: true,
                                reason: "Prepočet ceny bude vykonaný",
                                iconsToAdd: iconsToAdd
                            };

                        case "Upozorniť a prepočítať":
                            iconsToAdd.push("⚠️", "🔄");
                            return {
                                shouldRecalculate: true,
                                reason: "Upozornenie a prepočet ceny",
                                iconsToAdd: iconsToAdd
                            };

                        case "Ignorovať":
                            return {
                                shouldRecalculate: false,
                                reason: "Zmena ignorovaná, len ikona zmeny",
                                iconsToAdd: iconsToAdd
                            };

                        default:
                            return {
                                shouldRecalculate: true,
                                reason: "Neznáme nastavenie, použije sa prepočet",
                                iconsToAdd: iconsToAdd
                            };
                    }
                }
            }

            return {
                shouldRecalculate: false,
                reason: "Žiadne významné zmeny",
                iconsToAdd: []
            };

        } catch (error) {
            core.addError(item, "Chyba pri detekcii zmien cien: " + error.toString(), "detectAllPriceChanges", error);
            return {
                shouldRecalculate: false,
                reason: "Chyba pri detekcii zmien",
                iconsToAdd: []
            };
        }
    }

    /**
     * Vypočítava a aktualizuje ceny materiálu na základe nastavení
     * @param {Object} item - Záznam materiálu
     * @param {number} purchasePrice - Nákupná cena z príjemky/manuálneho vstupu
     * @param {Date} documentDate - Dátum dokumentu
     * @param {boolean} isManualAction - Či ide o manuálny prepočet (true) alebo príjemku (false)
     * @param {Object} options - Dodatočné možnosti (forceRecalculation)
     * @returns {Object} Výsledok aktualizácie
     */
    function calculateAndUpdateMaterialPrices(item, purchasePrice, documentDate, isManualAction, options) {
        try {
            var core = getCore();
            var config = getConfig();

            var materialName = core.safeGet(item, config.fields.items.name, "Neznámy materiál");
            core.addDebug(item, "🧾 " + materialName + " - Spúšťam výpočet cien...");
            var updated = false;
            options = options || {};
            core.addDebug(item, "🔧 Možnosti: " + JSON.stringify(options));
            // 1. Použitie novej funkcie pre detekciu zmien
            var changeDetection = detectAllPriceChanges(item, purchasePrice, isManualAction, options);
            var shouldProcessPriceCalculation = changeDetection.shouldRecalculate;
            var iconsToAdd = changeDetection.iconsToAdd || [];

            core.addDebug(item, "🔍 " + materialName + " - " + changeDetection.reason);

            // Získanie hodnôt pre info záznam (potrebné neskôr)
            var currentPurchasePrice = parseFloat(core.safeGet(item, config.fields.items.purchasePrice, 0));
            var purchasePriceChangeAction = core.safeGet(item, config.fields.items.purchasePriceChange, "").trim();
            var priceCalculation = core.safeGet(item, config.fields.items.priceCalculation, "").trim();

            // 2. Nákupné ceny - použij cenu z atribútu "cena" (nezaokrúhľujú sa)
            var finalPurchasePrice = purchasePrice; // Cena z atribútu "cena"

            // 3. Zistiť sadzbu DPH z záznamu materiálu
            var vatRateType = core.safeGet(item, config.fields.items.vatRate, "Základná");
            var vatRate = 0;
            try {
                vatRate = getValidVatRate(documentDate, vatRateType);
                core.addDebug(item, "✅ " + materialName + " - Sadzba DPH (" + vatRateType + "): " + vatRate + "%");
            } catch (error) {
                core.addDebug(item, "⚠️ " + materialName + " - Chyba pri získavaní DPH, použije sa 0%");
                vatRate = 0;
            }

            // 3. Výpočet nákupnej ceny s DPH (nezaokrúhľuje sa)
            var finalPurchasePriceWithVat = finalPurchasePrice * (1 + vatRate / 100);

            // 4. Inicializácia cien pre prípad preskočenia prepočtu
            var finalPrice = finalPurchasePrice; // Default = nákupná cena
            var roundedPriceWithVat = finalPurchasePriceWithVat;

            // 5. Prepočet predajných cien (ak je povolený)
            if (shouldProcessPriceCalculation) {
                core.addDebug(item, "ℹ️ " + materialName + " - Prepočet ceny: " + priceCalculation);

                var sellingPrice = finalPurchasePrice; // Základne = nákupná cena

                // Ak je "Podľa prirážky", vypočítať predajnú cenu s prirážkou
                if (priceCalculation === "Podľa prirážky") {
                    var markupPercentage = parseFloat(core.safeGet(item, config.fields.items.markupPercentage, 0));
                    if (markupPercentage > 0) {
                        sellingPrice = finalPurchasePrice * (1 + markupPercentage / 100);
                        core.addDebug(item, "🧮 " + materialName + " - Prirážka " + markupPercentage + "%: " + core.formatMoney(finalPurchasePrice) + " -> " + core.formatMoney(sellingPrice));
                    }
                }

                // Výpočet predajnej ceny s DPH
                var priceWithVat = sellingPrice * (1 + vatRate / 100);

                // Zaokrúhľovanie predajných cien s DPH podľa nastavení materiálu
                roundedPriceWithVat = applyPriceRounding(item, priceWithVat, materialName + " - predajná (s DPH)");

                // Prepočítanie predajnej ceny bez DPH z zaokrúhlenej ceny s DPH
                finalPrice = roundedPriceWithVat / (1 + vatRate / 100);
            } else {
                core.addDebug(item, "🚫 " + materialName + " - Prepočet ceny preskočený podľa nastavenia");
            }

            // 9. Aktualizovať ikony ak sú k dispozícii (nahradenie starých ikon)
            if (iconsToAdd.length > 0) {
                var newIcons = iconsToAdd.join(" ");
                var currentIcons = core.safeGet(item, config.fields.items.icons, "");

                // Nahraď staré ikony novými (nezachovávaj predchádzajúce)
                core.safeSet(item, config.fields.items.icons, newIcons);

                if (currentIcons && currentIcons.trim() !== "") {
                    core.addDebug(item, "🔄 " + materialName + " - Ikony nahradené: '" + currentIcons + "' -> '" + newIcons + "'");
                } else {
                    core.addDebug(item, "🎯 " + materialName + " - Pridané ikony: " + newIcons);
                }
                updated = true;
            }

            // 10. Aktualizovať ceny v materiáli ak sa zmenili
            var currentPrice = parseFloat(core.safeGet(item, config.fields.items.price, 0));
            var currentPriceWithVat = parseFloat(core.safeGet(item, config.fields.items.priceWithVat, 0));
            var currentPurchasePrice = parseFloat(core.safeGet(item, config.fields.items.purchasePrice, 0));
            var currentPurchasePriceWithVat = parseFloat(core.safeGet(item, config.fields.items.purchasePriceWithVat, 0));

            // Detekcia zmien v cenách
            var pricesChanged = Math.abs(currentPrice - finalPrice) > 0.01 ||
                                Math.abs(currentPriceWithVat - roundedPriceWithVat) > 0.01 ||
                                Math.abs(currentPurchasePrice - finalPurchasePrice) > 0.01 ||
                                Math.abs(currentPurchasePriceWithVat - finalPurchasePriceWithVat) > 0.01;

            // Aktualizácia polí materiálu len ak sa ceny zmenili
            if (pricesChanged) {
                // Aktualizovať ceny v zázname materiálu
                core.safeSet(item, config.fields.items.price, finalPrice);
                core.safeSet(item, config.fields.items.priceWithVat, roundedPriceWithVat);
                core.safeSet(item, config.fields.items.purchasePrice, finalPurchasePrice);
                core.safeSet(item, config.fields.items.purchasePriceWithVat, finalPurchasePriceWithVat);
                core.addDebug(item, "💰 " + materialName + " - Ceny aktualizované v materiáli");
            }

            // Pre manuálne akcie alebo zmeny cien - vždy aktualizuj ostatné polia a cenový záznam
            if (isManualAction || pricesChanged) {
                // Aktualizovať pole Sadzba s percentuálnou hodnotou DPH
                core.safeSet(item, config.fields.items.vatRatePercentage, vatRate);
                core.addDebug(item, "📊 Sadzba DPH aktualizovaná na: " + vatRate + "%");

                // Vypočítať a nastaviť skutočnú prirážku (Vypočítaná marža)
                if (finalPurchasePrice > 0) {
                    var actualMargin = ((finalPrice - finalPurchasePrice) / finalPurchasePrice) * 100;
                    var roundedMargin = Math.round(actualMargin * 100) / 100; // Zaokrúhlenie na 2 desatinné miesta
                    core.safeSet(item, config.fields.items.calculatedMargin, roundedMargin);
                    core.addDebug(item, "💯 Skutočná prirážka nastavená na: " + roundedMargin.toFixed(2) + "%");
                }

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

                // VŽDY vytvor/aktualizuj cenový záznam pri manuálnej akcii alebo zmene cien
                core.addDebug(item, "🔍 DEBUG: Volám createOrUpdateMaterialPriceRecord - manuálna akcia: " + isManualAction + ", zmeny cien: " + pricesChanged);
                var priceHistoryResult = createOrUpdateMaterialPriceRecord(item, documentDate, finalPrice, finalPurchasePrice);
                if (priceHistoryResult.success) {
                    if (priceHistoryResult.created) {
                        core.addDebug(item, "➕ " + materialName + " - Vytvorený cenový záznam v histórii");
                    } else if (priceHistoryResult.updated) {
                        core.addDebug(item, "🔄 " + materialName + " - Aktualizovaný cenový záznam v histórii");
                    }
                } else {
                    core.addDebug(item, "⚠️ " + materialName + " - Chyba pri vytváraní cenového záznamu: " + priceHistoryResult.message);
                    core.addDebug(item, "🔍 DEBUG: priceHistoryResult: " + JSON.stringify(priceHistoryResult));
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

                core.addDebug(item, "🔄 " + materialName + " - Spracovanie dokončené:");
                core.addDebug(item, "  Nákupná: " + core.formatMoney(finalPurchasePrice) + " / s DPH: " + core.formatMoney(finalPurchasePriceWithVat));
                core.addDebug(item, "  Predajná: " + core.formatMoney(finalPrice) + " / s DPH: " + core.formatMoney(roundedPriceWithVat));
            }

            return {
                updated: updated,
                sellingPrice: finalPrice,
                priceWithVat: roundedPriceWithVat
            };

        } catch (error) {
            var core = getCore();
            if (core) {
                core.addError(item, "Chyba pri prepočte cien materiálu: " + error.toString(), "calculateAndUpdateMaterialPrices", error);
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
                core.addDebug(item, "🧮 " + materialName + " - Zaokrúhlenie (" + priceRounding + ", " + roundingValue + "): " + core.formatMoney(price) + " -> " + core.formatMoney(roundedPrice));
            }

            return roundedPrice;

        } catch (error) {
            var core = getCore();
            if (core) {
                core.addDebug(item, "⚠️ Chyba pri zaokrúhľovaní ceny, použije sa pôvodná: " + error.toString());
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

        var value = roundingValue.trim().toLowerCase();
        switch (value) {
            case "0.01": return "desatiny";
            case "0.1": return "desatiny";
            case "desatiny": return "desatiny";
            case "1": return "jednotky";
            case "jednotky": return "jednotky";
            case "5": return "na 5";
            case "10": return "na 10";
            case "desiatky": return "na 10";
            case "50": return "na 50";
            case "100": return "na 100";
            case "stovky": return "na 100";
            default: return value;
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
                infoMessage += "• Skutočná prirážka: " + actualMargin.toFixed(2) + "%\n";
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

            core.addDebug(item, "✅ Info záznam vytvorený pre materiál: " + materialName);

            return true;

        } catch (error) {
            var core = getCore();
            if (core) {
                core.addError(item, "Chyba pri vytváraní info záznamu pre materiál: " + error.toString(), "createMaterialInfoRecord", error);
            }
            return false;
        }
    }

    // ==============================================
    // DENNÝ REPORT MANAGEMENT
    // ==============================================

    /**
     * Univerzálna funkcia pre vytvorenie alebo aktualizáciu záznamu v knižnici Denný report
     * Funguje ako centrálny hub pre všetky denné záznamy (Dochádzka, Záznam prác, Kniha jázd, Pokladňa)
     *
     * @param {Entry} sourceEntry - Zdrojový záznam (Dochádzka, Záznam prác, atď.)
     * @param {String} libraryType - Typ knižnice ('attendance', 'workRecord', 'rideLog', 'cashBook')
     * @param {Object} options - Dodatočné nastavenia
     * @returns {Object} Výsledok operácie s informáciou o vytvorení/aktualizácii
     */
    function createOrUpdateDailyReport(sourceEntry, libraryType, options) {
        var core = getCore();
        var config = getConfig();

        try {
            if (!sourceEntry || !libraryType) {
                return {
                    success: false,
                    error: "Chýba sourceEntry alebo libraryType",
                    created: false,
                    updated: false
                };
            }

            // Získaj dátum zo zdrojového záznamu
            var sourceDate = null;
            switch (libraryType) {
                case 'attendance':
                    sourceDate = core.safeGet(sourceEntry, config.fields.attendance.date);
                    break;
                case 'workRecord':
                    sourceDate = core.safeGet(sourceEntry, config.fields.workRecord.date);
                    break;
                case 'rideLog':
                    sourceDate = core.safeGet(sourceEntry, config.fields.rideLog.date);
                    break;
                case 'cashBook':
                    sourceDate = core.safeGet(sourceEntry, config.fields.cashBook.date);
                    break;
                default:
                    return {
                        success: false,
                        error: "Nepoznaný typ knižnice: " + libraryType,
                        created: false,
                        updated: false
                    };
            }

            if (!sourceDate) {
                return {
                    success: false,
                    error: "Nenašiel sa dátum v zdrojovom zázname",
                    created: false,
                    updated: false
                };
            }

            var dateFormatted = moment(sourceDate).format('DD.MM.YYYY');

            // Pridaj debug informácie ak sú dostupné
            if (options && options.debugEntry && core.addDebug) {
                core.addDebug(options.debugEntry, "📅 Spracovávam Denný report pre " + dateFormatted + " (" + libraryType + ")");
            }

            // Nájdi existujúci záznam v Denný report pre daný dátum
            var dailyReportLibrary = config.libraries.dailyReport;

            // Kontrola či knižnica existuje
            var dailyReportLib = libByName(dailyReportLibrary);
            if (!dailyReportLib) {
                var errorMsg = "Knižnica '" + dailyReportLibrary + "' neexistuje alebo nie je dostupná";

                // Pridaj debug info o dostupných knižniciach
                if (options && options.debugEntry && core.addDebug) {
                    try {
                        var availableLibs = [];
                        for (var libName in lib()) {
                            availableLibs.push(libName);
                        }
                        core.addDebug(options.debugEntry, "📚 Dostupné knižnice: " + availableLibs.slice(0, 10).join(", ") + (availableLibs.length > 10 ? "..." : ""));
                    } catch (e) {
                        core.addDebug(options.debugEntry, "⚠️ Nemožno načítať zoznam knižníc: " + e.toString());
                    }
                }

                if (options && options.debugEntry && core.addError) {
                    core.addError(options.debugEntry, errorMsg, "createOrUpdateDailyReport");
                }
                return {
                    success: false,
                    error: errorMsg,
                    created: false,
                    updated: false
                };
            }

            if (options && options.debugEntry && core.addDebug) {
                core.addDebug(options.debugEntry, "✅ Knižnica '" + dailyReportLibrary + "' nájdená");
            }

            var dailyReportEntries = dailyReportLib.entries();
            var existingDailyReport = null;

            for (var i = 0; i < dailyReportEntries.length; i++) {
                var entry = dailyReportEntries[i];
                var entryDate = core.safeGet(entry, config.fields.dailyReport.date);

                if (entryDate && moment(entryDate).format('DD.MM.YYYY') === dateFormatted) {
                    existingDailyReport = entry;
                    break;
                }
            }

            var result = {
                success: false,
                created: false,
                updated: false,
                dailyReportEntry: null,
                backLinkCreated: false
            };

            // Ak existuje, aktualizuj link
            if (existingDailyReport) {
                // Aktualizuj príslušné pole podľa typu knižnice
                var fieldToUpdate = null;
                switch (libraryType) {
                    case 'attendance':
                        fieldToUpdate = config.fields.dailyReport.attendance;
                        break;
                    case 'workRecord':
                        fieldToUpdate = config.fields.dailyReport.workRecord;
                        break;
                    case 'rideLog':
                        fieldToUpdate = config.fields.dailyReport.rideLog;
                        break;
                    case 'cashBook':
                        fieldToUpdate = config.fields.dailyReport.cashBook;
                        break;
                }

                if (fieldToUpdate) {
                    // Získaj existujúce linky
                    var existingLinks = core.safeGetLinks(existingDailyReport, fieldToUpdate) || [];

                    // Skontroluj či už link existuje
                    var linkExists = false;
                    for (var j = 0; j < existingLinks.length; j++) {
                        if (existingLinks[j].field("ID") === sourceEntry.field("ID")) {
                            linkExists = true;
                            break;
                        }
                    }

                    // Pridaj link ak neexistuje
                    if (!linkExists) {
                        existingLinks.push(sourceEntry);
                        core.safeSet(existingDailyReport, fieldToUpdate, existingLinks);

                        if (options && options.debugEntry && core.addDebug) {
                            core.addDebug(options.debugEntry, "🔗 Aktualizovaný link v existujúcom Denný report");
                        }
                    }

                    result.updated = true;
                    result.dailyReportEntry = existingDailyReport;
                }
            } else {
                // Vytvor nový záznam v Denný report
                var newDailyReport = dailyReportLib.create({});

                // Nastav dátum
                core.safeSet(newDailyReport, config.fields.dailyReport.date, sourceDate);

                // Nastav príslušný link podľa typu knižnice
                switch (libraryType) {
                    case 'attendance':
                        core.safeSet(newDailyReport, config.fields.dailyReport.attendance, [sourceEntry]);
                        break;
                    case 'workRecord':
                        core.safeSet(newDailyReport, config.fields.dailyReport.workRecord, [sourceEntry]);
                        break;
                    case 'rideLog':
                        core.safeSet(newDailyReport, config.fields.dailyReport.rideLog, [sourceEntry]);
                        break;
                    case 'cashBook':
                        core.safeSet(newDailyReport, config.fields.dailyReport.cashBook, [sourceEntry]);
                        break;
                }

                // Pridaj základný popis
                var description = "Denný report pre " + dateFormatted;
                core.safeSet(newDailyReport, config.fields.dailyReport.description, description);

                if (options && options.debugEntry && core.addDebug) {
                    core.addDebug(options.debugEntry, "📝 Vytvorený nový Denný report");
                }

                result.created = true;
                result.dailyReportEntry = newDailyReport;
            }

            // Vytvor spätný link v zdrojovom zázname na Denný report (ak je požadovaný)
            if (options && options.createBackLink && result.dailyReportEntry) {
                var backLinkField = null;

                // Urči pole pre spätný link podľa typu knižnice
                // Poznámka: Týto polia musia existovať v konfiguračných schémach knižníc
                switch (libraryType) {
                    case 'attendance':
                        // V Dochádzka môže byť pole "Denný report"
                        backLinkField = options.backLinkField || "Denný report";
                        break;
                    case 'workRecord':
                        backLinkField = options.backLinkField || "Denný report";
                        break;
                    case 'rideLog':
                        backLinkField = options.backLinkField || "Denný report";
                        break;
                    case 'cashBook':
                        backLinkField = options.backLinkField || "Denný report";
                        break;
                }

                if (backLinkField) {
                    try {
                        core.safeSet(sourceEntry, backLinkField, [result.dailyReportEntry]);
                        result.backLinkCreated = true;

                        if (options && options.debugEntry && core.addDebug) {
                            core.addDebug(options.debugEntry, "🔙 Vytvorený spätný link na Denný report");
                        }
                    } catch (backLinkError) {
                        // Spätný link nie je kritický, pokračuj bez neho
                        if (options && options.debugEntry && core.addDebug) {
                            core.addDebug(options.debugEntry, "⚠️ Nemožno vytvoriť spätný link: " + backLinkError.toString());
                        }
                    }
                }
            }

            result.success = result.created || result.updated;

            if (options && options.debugEntry && core.addDebug) {
                var action = result.created ? "vytvorený" : "aktualizovaný";
                core.addDebug(options.debugEntry, "✅ Denný report " + action + " úspešne");
            }

            return result;

        } catch (error) {
            if (options && options.debugEntry && core.addError) {
                core.addError(options.debugEntry, "Chyba pri spracovaní Denný report: " + error.toString(), "createOrUpdateDailyReport", error);
            }

            return {
                success: false,
                error: error.toString(),
                created: false,
                updated: false,
                backLinkCreated: false
            };
        }
    }

    // ==============================================
    // UNIVERZÁLNA ARCHITEKTÚRA PRE VÝKAZY
    // ==============================================

    /**
     * Univerzálna funkcia pre vytvorenie/aktualizáciu výkazov
     * @param {Entry} sourceEntry - Zdrojový záznam (Kniha jázd, Záznam prác, atď.)
     * @param {string} reportType - Typ výkazu ('work', 'ride', 'machines', 'materials')
     * @param {Object} calculatedData - Prepočítané dáta pre výkaz
     * @param {Object} options - Dodatočné nastavenia
     * @returns {Object} Výsledok operácie
     */
    function createOrUpdateReport(sourceEntry, reportType, calculatedData, options) {
        var core = getCore();
        var config = getConfig();

        try {
            if (!sourceEntry || !reportType) {
                return {
                    success: false,
                    error: "Chýba sourceEntry alebo reportType",
                    created: false,
                    updated: false
                };
            }

            // Získaj konfiguráciu pre typ výkazu
            var reportConfig = config.reportConfigs ? config.reportConfigs[reportType] : null;
            if (!reportConfig) {
                return {
                    success: false,
                    error: "Neznámy typ výkazu: " + reportType,
                    created: false,
                    updated: false
                };
            }

            // Validácia povinných dát
            var validationResult = validateReportData(sourceEntry, reportConfig, calculatedData, options);
            if (!validationResult.success) {
                return validationResult;
            }

            var customer = validationResult.customer;
            var date = validationResult.date;

            // Vyhľadaj existujúci výkaz
            var existingReport = findExistingReport(customer, reportConfig, date, options);

            var report = null;
            var action = "none";

            if (existingReport) {
                report = existingReport;
                action = "update";
                if (options && options.debugEntry && core.addDebug) {
                    core.addDebug(options.debugEntry, "  ✅ Existujúci " + reportType + " výkaz nájdený");
                }
            } else {
                // Vytvor nový výkaz
                report = createGenericReport(reportConfig, customer, date, validationResult.customerName, options);
                if (report) {
                    action = "create";
                    if (options && options.debugEntry && core.addDebug) {
                        core.addDebug(options.debugEntry, "  ✨ Nový " + reportType + " výkaz vytvorený");
                    }
                } else {
                    return {
                        success: false,
                        error: "Nepodarilo sa vytvoriť " + reportType + " výkaz",
                        created: false,
                        updated: false
                    };
                }
            }

            if (report) {
                // Prepoj zdrojový záznam s výkazom
                linkSourceToReport(report, sourceEntry, reportConfig, calculatedData, options);

                // Špeciálne linkovanie pre výkaz strojov
                if (reportType === 'machines' && options && options.machines) {
                    linkMachinesToReport(report, sourceEntry, options.machines, options);
                }

                // Aktualizuj súčty a atribúty a počty
                updateReportSummary(report, reportConfig, calculatedData, options);
                updateReportCounts(report, reportConfig, reportType, options);

                // Aktualizuj info záznam
                updateReportInfo(report, reportType, reportConfig, calculatedData, options);

                return {
                    success: true,
                    report: report,
                    action: action,
                    created: action === "create",
                    updated: action === "update"
                };
            }

        } catch (error) {
            if (options && options.debugEntry && core.addError) {
                core.addError(options.debugEntry, "Chyba pri spracovaní " + reportType + " výkazu: " + error.toString(), "createOrUpdateReport", error);
            }
            return {
                success: false,
                error: error.toString(),
                created: false,
                updated: false
            };
        }
    }

    /**
     * Validuje vstupné dáta pre výkaz
     */
    function validateReportData(sourceEntry, reportConfig, calculatedData, options) {
        var core = getCore();

        try {
            var config = getConfig();

            // Získaj zákazku - používaj správne názvy polí z konfigurácie
            var customerField = null;
            var customerFieldNames = [
                config.fields.workRecord ? config.fields.workRecord.order : null,
                config.fields.rideLog ? config.fields.rideLog.orders : null,
                "Zákazka"  // fallback
            ].filter(function(name) { return name; }); // odstráň null hodnoty

            for (var i = 0; i < customerFieldNames.length; i++) {
                var fieldName = customerFieldNames[i];
                var testField = core.safeGetLinks(sourceEntry, fieldName);
                if (testField && testField.length > 0) {
                    customerField = testField;
                    break;
                }
            }

            if (!customerField || customerField.length === 0) {
                return {
                    success: false,
                    error: "Zdrojový záznam nemá zákazku",
                    hasCustomer: false
                };
            }

            var customer = customerField[0];
            var customerName = core.safeGet(customer, "Názov", "N/A");

            // Získaj dátum - používaj správne názvy polí z konfigurácie
            var dateFieldNames = [
                config.fields.workRecord ? config.fields.workRecord.date : null,
                config.fields.rideLog ? config.fields.rideLog.date : null,
                config.fields.attendance ? config.fields.attendance.date : null,
                "Dátum"  // fallback
            ].filter(function(name) { return name; }); // odstráň null hodnoty

            var date = null;

            for (var j = 0; j < dateFieldNames.length; j++) {
                var fieldName = dateFieldNames[j];
                var testDate = core.safeGet(sourceEntry, fieldName);
                if (testDate) {
                    date = testDate;
                    break;
                }
            }

            if (!date) {
                return {
                    success: false,
                    error: "Zdrojový záznam nemá dátum",
                    hasCustomer: true,
                    customer: customer
                };
            }

            return {
                success: true,
                hasCustomer: true,
                customer: customer,
                customerName: customerName,
                date: date
            };

        } catch (error) {
            return {
                success: false,
                error: "Chyba pri validácii: " + error.toString(),
                hasCustomer: false
            };
        }
    }

    /**
     * Vyhľadá existujúci výkaz pre zákazku
     */
    function findExistingReport(customer, reportConfig, date, options) {
        var core = getCore();
        var config = getConfig();

        try {
            var reportLibraryName = config.libraries[reportConfig.library];
            if (!reportLibraryName) {
                if (options && options.debugEntry && core.addError) {
                    core.addError(options.debugEntry, "Knižnica " + reportConfig.library + " nenájdená v konfigurácii", "findExistingReport");
                }
                return null;
            }

            var orderFieldName = config.fields[reportConfig.library] ? config.fields[reportConfig.library].order : "Zákazka";
            var existingReports = customer.linksFrom(reportLibraryName, orderFieldName);

            if (options && options.debugEntry && core.addDebug) {
                core.addDebug(options.debugEntry, "  🔍 Hľadanie výkazu: " + reportLibraryName + " cez pole " + orderFieldName);
                core.addDebug(options.debugEntry, "  📦 Nájdené výkazy: " + (existingReports ? existingReports.length : 0));
            }

            if (existingReports && existingReports.length > 0) {
                return existingReports[0];
            }

            return null;

        } catch (error) {
            if (options && options.debugEntry && core.addError) {
                core.addError(options.debugEntry, "Chyba pri hľadaní výkazu: " + error.toString(), "findExistingReport", error);
            }
            return null;
        }
    }

    /**
     * Vytvorí nový výkaz s základnými poľami
     */
    function createGenericReport(reportConfig, customer, date, customerName, options) {
        var core = getCore();
        var config = getConfig();

        try {
            var reportLibraryName = config.libraries[reportConfig.library];
            var reportLib = libByName(reportLibraryName);

            if (!reportLib) {
                if (options && options.debugEntry && core.addError) {
                    core.addError(options.debugEntry, "Knižnica '" + reportLibraryName + "' nenájdená", "createGenericReport");
                }
                return null;
            }

            var report = reportLib.create({});
            var reportFields = config.fields[reportConfig.library];

            if (!reportFields) {
                if (options && options.debugEntry && core.addError) {
                    core.addError(options.debugEntry, "Polia pre " + reportConfig.library + " nenájdené v konfigurácii", "createGenericReport");
                }
                return null;
            }

            // Nastav základné polia
            var reportNumber = reportConfig.prefix + "-" + moment(date).format("YYYYMMDD");

            if (reportFields.date) core.safeSet(report, reportFields.date, date);
            if (reportFields.number) core.safeSet(report, reportFields.number, reportNumber);
            if (reportFields.description) core.safeSet(report, reportFields.description, "Výkaz " + reportConfig.library + " - " + customerName);
            if (reportFields.order) core.safeSet(report, reportFields.order, [customer]);
            if (reportFields.state) core.safeSet(report, reportFields.state, "Čakajúce");

            return report;

        } catch (error) {
            if (options && options.debugEntry && core.addError) {
                core.addError(options.debugEntry, "Chyba pri vytváraní výkazu: " + error.toString(), "createGenericReport", error);
            }
            return null;
        }
    }

    /**
     * Prepojí zdrojový záznam s výkazom
     */
    function linkSourceToReport(report, sourceEntry, reportConfig, calculatedData, options) {
        var core = getCore();
        var config = getConfig();

        try {
            var reportFields = config.fields[reportConfig.library];
            var sourceFieldName = reportFields[reportConfig.sourceField];

            if (!sourceFieldName) {
                if (options && options.debugEntry && core.addDebug) {
                    core.addDebug(options.debugEntry, "  ⚠️ Pole " + reportConfig.sourceField + " nenájdené, preskakujem prepojenie");
                }
                return;
            }

            // DÔLEŽITÉ: Toto funkcia prepája iba zdrojový záznam (napr. Záznam prác)
            // do správneho spätného poľa vo výkaze (napr. "workRecord" v machines report)
            // Linkovanie strojov sa rieši samostatne v linkMachinesToReport()

            var sourceRecords = core.safeGetLinks(report, sourceFieldName) || [];

            // Skontroluj či už nie je prepojený
            var isLinked = false;
            for (var i = 0; i < sourceRecords.length; i++) {
                if (sourceRecords[i] && core.safeGet(sourceRecords[i], "ID") === core.safeGet(sourceEntry, "ID")) {
                    isLinked = true;
                    break;
                }
            }

            if (!isLinked) {
                sourceRecords.push(sourceEntry);
                core.safeSet(report, sourceFieldName, sourceRecords);

                if (options && options.debugEntry && core.addDebug) {
                    core.addDebug(options.debugEntry, "  🔗 Záznam prepojený s výkazom cez pole: " + sourceFieldName);
                }
            } else {
                if (options && options.debugEntry && core.addDebug) {
                    core.addDebug(options.debugEntry, "  ℹ️ Záznam už je prepojený s výkazom");
                }
            }

        } catch (error) {
            if (options && options.debugEntry && core.addError) {
                core.addError(options.debugEntry, "Chyba pri prepájaní: " + error.toString(), "linkSourceToReport", error);
            }
        }
    }

    /**
     * Aktualizuje súčty na výkaze
     */
    function updateReportSummary(report, reportConfig, calculatedData, options) {
        var core = getCore();
        var config = getConfig();

        try {
            var reportFields = config.fields[reportConfig.library];

            if (!reportFields || !reportConfig.summaryFields) {
                return;
            }

            // Aktualizuj súčtové polia z calculatedData
            for (var i = 0; i < reportConfig.summaryFields.length; i++) {
                var summaryField = reportConfig.summaryFields[i];
                var fieldName = reportFields[summaryField];

                if (fieldName && calculatedData[summaryField] !== undefined) {
                    core.safeSet(report, fieldName, calculatedData[summaryField]);

                    if (options && options.debugEntry && core.addDebug) {
                        core.addDebug(options.debugEntry, "  📊 " + fieldName + " = " + calculatedData[summaryField]);
                    }
                }
            }

        } catch (error) {
            if (options && options.debugEntry && core.addError) {
                core.addError(options.debugEntry, "Chyba pri aktualizácii súčtov: " + error.toString(), "updateReportSummary", error);
            }
        }
    }

    /**
     * Vytvorí alebo aktualizuje info záznam výkazu
     */
    function updateReportInfo(report, reportType, reportConfig, calculatedData, options) {
        var core = getCore();
        var config = getConfig();

        try {
            var reportFields = config.fields[reportConfig.library];
            var infoFieldName = reportFields ? reportFields.info : null;

            if (!infoFieldName) {
                return;
            }

            var reportNumber = core.safeGet(report, reportFields.number, "N/A");
            var customerName = "N/A";

            // Získaj názov zákazky
            var customerField = core.safeGetLinks(report, reportFields.order);
            if (customerField && customerField.length > 0) {
                customerName = core.safeGet(customerField[0], "Názov", "N/A");
            }

            var info = createReportInfo(reportType, reportNumber, customerName, calculatedData, options);
            core.safeSet(report, infoFieldName, info);

            if (options && options.debugEntry && core.addDebug) {
                core.addDebug(options.debugEntry, "  📝 Info záznam aktualizovaný");
            }

        } catch (error) {
            if (options && options.debugEntry && core.addError) {
                core.addError(options.debugEntry, "Chyba pri aktualizácii info záznamu: " + error.toString(), "updateReportInfo", error);
            }
        }
    }

    /**
     * Vytvorí štandardný Markdown info záznam pre výkaz
     */
    function createReportInfo(reportType, reportNumber, customerName, calculatedData, options) {
        try {
            var info = "# 📊 VÝKAZ " + reportType.toUpperCase() + " - AUTOMATICKÝ PREPOČET\n\n";
            info += "## 📅 Základné údaje\n";
            info += "- **Číslo výkazu:** " + reportNumber + "\n";
            info += "- **Zákazka:** " + customerName + "\n";
            info += "- **Dátum:** " + moment().format("DD.MM.YYYY") + "\n\n";

            info += "## 📊 SÚHRN\n";

            // Pridaj súčty z calculatedData
            if (calculatedData) {
                for (var key in calculatedData) {
                    if (calculatedData[key] !== null && calculatedData[key] !== undefined) {
                        var value = calculatedData[key];
                        var displayValue = typeof value === 'number' ?
                                         (key.toLowerCase().includes('sum') || key.toLowerCase().includes('total') || key.toLowerCase().includes('costs') ?
                                          value.toFixed(2) + " €" : value.toString()) :
                                         value.toString();
                        info += "- **" + key + ":** " + displayValue + "\n";
                    }
                }
            }

            info += "\n## 🔧 TECHNICKÉ INFORMÁCIE\n";
            info += "- **Čas spracovania:** " + moment().format("HH:mm:ss") + "\n";
            info += "- **MementoBusiness:** v" + version + "\n";
            info += "\n---\n**✅ VÝKAZ AKTUALIZOVANÝ ÚSPEŠNE**";

            return info;

        } catch (error) {
            return "# 📊 VÝKAZ " + reportType.toUpperCase() + "\n\n❌ Chyba pri generovaní info záznamu: " + error.toString();
        }
    }
 
    // ==============================================
    // NUMBER GENERATION
    // ==============================================

    /**
     * Generuje ďalšie voľné číslo záznamu podľa placeholdera
     *
     * @param {string} libraryName - Názov knižnice pre ktorú generujeme číslo
     * @param {string} numberFieldName - Názov poľa ktoré obsahuje číslo záznamu
     * @param {string} placeholderFieldName - Názov poľa v ASISTANTO Defaults s placeholderom (napr. "CP Placeholder")
     * @returns {object} { success: boolean, number: string, error: string }
     *
     * Placeholder formát:
     * - YYYY = rok 4-ciferný (napr. 2025)
     * - YY = rok 2-ciferný (napr. 25)
     * - MM = mesiac 2-ciferný (napr. 01-12)
     * - DD = deň 2-ciferný (napr. 01-31)
     * - XXX, XXXX, XXXXX = sekvenčné číslo s daným počtom číslic (napr. 001, 0001)
     * - Ostatné znaky = literály (napr. C, -, _)
     *
     * Príklady:
     * - "CYYXXX" → C25001, C25002... (Cenové ponuky)
     * - "INV-YYYY-XXXX" → INV-2025-0001, INV-2025-0002...
     * - "ZYYMMXXX" → Z2501001, Z2501002... (Zákazky s rokom a mesiacom)
     */
    function generateNextNumber(libraryName, numberFieldName, placeholderFieldName) {
        var core = getCore();
        var config = getConfig();

        try {
            // 1. Získaj placeholder z ASISTANTO Defaults
            var defaultsLib = lib(config.libraryIds.defaults);
            if (!defaultsLib) {
                return {
                    success: false,
                    error: "Knižnica ASISTANTO Defaults nenájdená"
                };
            }

            var defaultsEntries = defaultsLib.entries();
            if (!defaultsEntries || defaultsEntries.length === 0) {
                return {
                    success: false,
                    error: "ASISTANTO Defaults neobsahuje žiadne záznamy"
                };
            }

            // Posledný záznam obsahuje aktuálne nastavenia
            var defaultsEntry = defaultsEntries[defaultsEntries.length - 1];
            var placeholder = core.safeGet(defaultsEntry, placeholderFieldName);

            if (!placeholder) {
                return {
                    success: false,
                    error: "Placeholder '" + placeholderFieldName + "' nie je nastavený v ASISTANTO Defaults"
                };
            }

            // 2. Parsuj placeholder a vygeneruj prefix
            var now = new Date();
            var year = now.getFullYear();
            var month = now.getMonth() + 1; // JavaScript months are 0-based
            var day = now.getDate();

            var parsedPlaceholder = parsePlaceholder(placeholder, year, month, day);

            if (!parsedPlaceholder.success) {
                return {
                    success: false,
                    error: parsedPlaceholder.error
                };
            }

            var prefix = parsedPlaceholder.prefix;
            var sequenceLength = parsedPlaceholder.sequenceLength;

            // 3. Získaj knižnicu a všetky záznamy s daným prefixom
            var targetLib = libByName(libraryName);
            if (!targetLib) {
                return {
                    success: false,
                    error: "Knižnica '" + libraryName + "' nenájdená"
                };
            }

            var allEntries = targetLib.entries();
            var existingNumbers = [];

            // Extrahuj sekvenčné čísla zo všetkých existujúcich záznamov
            for (var i = 0; i < allEntries.length; i++) {
                var entryNumber = core.safeGet(allEntries[i], numberFieldName);
                if (entryNumber && entryNumber.indexOf(prefix) === 0) {
                    // Extrahuj sekvenčnú časť
                    var seqPart = entryNumber.substring(prefix.length);
                    var seqInt = parseInt(seqPart, 10);
                    if (!isNaN(seqInt) && seqInt > 0) {
                        existingNumbers.push(seqInt);
                    }
                }
            }

            // 4. Nájdi ďalšie voľné číslo (vyplní aj medzery v sekvencii)
            var nextSeq = findNextAvailableNumber(existingNumbers);

            // 5. Vygeneruj finálne číslo s nulami na začiatku
            var sequenceStr = padLeft(nextSeq.toString(), sequenceLength, '0');
            var newNumber = prefix + sequenceStr;

            return {
                success: true,
                number: newNumber,
                prefix: prefix,
                sequence: nextSeq,
                placeholder: placeholder
            };

        } catch (error) {
            return {
                success: false,
                error: "Chyba pri generovaní čísla: " + error.toString()
            };
        }
    }

    /**
     * Parsuje placeholder a nahradí dátumové tokeny
     */
    function parsePlaceholder(placeholder, year, month, day) {
        try {
            var result = placeholder;

            // Nahraď rok (YYYY musí byť pred YY)
            result = result.replace(/YYYY/g, year.toString());
            result = result.replace(/YY/gi, year.toString().slice(-2));

            // Nahraď mesiac
            result = result.replace(/MM/gi, padLeft(month.toString(), 2, '0'));

            // Nahraď deň
            result = result.replace(/DD/gi, padLeft(day.toString(), 2, '0'));

            // Nájdi sekvenčnú časť (X+)
            var sequenceMatch = result.match(/(X+)/i);
            if (!sequenceMatch) {
                return {
                    success: false,
                    error: "Placeholder neobsahuje sekvenčnú časť (XXX, XXXX, atď.)"
                };
            }

            var sequenceFormat = sequenceMatch[0];
            var sequenceLength = sequenceFormat.length;

            // Odstráň sekvenčnú časť pre získanie prefixu
            var prefix = result.replace(sequenceFormat, '');

            return {
                success: true,
                prefix: prefix,
                sequenceLength: sequenceLength
            };

        } catch (error) {
            return {
                success: false,
                error: "Chyba pri parsovaní placeholdera: " + error.toString()
            };
        }
    }

    /**
     * Nájde ďalšie voľné číslo v sekvencii (vrátane vyplnenia medzier)
     */
    function findNextAvailableNumber(existingNumbers) {
        if (existingNumbers.length === 0) {
            return 1;
        }

        // Odstráň duplicity a zoraď
        var uniqueNumbers = [];
        for (var i = 0; i < existingNumbers.length; i++) {
            if (uniqueNumbers.indexOf(existingNumbers[i]) === -1) {
                uniqueNumbers.push(existingNumbers[i]);
            }
        }
        uniqueNumbers.sort(function(a, b) { return a - b; });

        // Hľadaj prvú medzeru v sekvencii
        for (var j = 0; j < uniqueNumbers.length; j++) {
            if (uniqueNumbers[j] !== j + 1) {
                return j + 1;
            }
        }

        // Ak nie sú žiadne medzery, vráť max + 1
        return uniqueNumbers[uniqueNumbers.length - 1] + 1;
    }

    /**
     * Helper funkcia - padding zľava
     */
    function padLeft(str, length, char) {
        str = str.toString();
        while (str.length < length) {
            str = char + str;
        }
        return str;
    }

    // ==============================================
    // PUBLIC API
    // ==============================================

    return {
        // Module metadata
        info: MODULE_INFO,
        version: version,

        // Časové výpočty
        calculateWorkHours: calculateWorkHours,
        calculateWorkTime: calculateWorkTime,
        
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
        processEmployee: processEmployee,
        processEmployees: processEmployees,

        // hľadanie cien
        findValidPrice: findValidPrice,  // NOVÁ univerzálna funkcia
        findValidWorkPrice: findValidWorkPrice,  // Deprecated - použiť findValidPrice
        findValidMachinePrice: findValidMachinePrice,  // Deprecated - použiť findValidPrice
        findValidItemPrice: findValidItemPrice,  // Deprecated - použiť findValidPrice
        
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
        detectAllPriceChanges: detectAllPriceChanges,
        applyPriceRounding: applyPriceRounding,
        createMaterialInfoRecord: createMaterialInfoRecord,
        createOrUpdateMaterialPriceRecord: createOrUpdateMaterialPriceRecord,

        // Denný report - NOVÉ
        createOrUpdateDailyReport: createOrUpdateDailyReport,

        // === UNIVERZÁLNA ARCHITEKTÚRA PRE VÝKAZY - NOVÉ ===
        createOrUpdateReport: createOrUpdateReport,
        validateReportData: validateReportData,
        findExistingReport: findExistingReport,
        createGenericReport: createGenericReport,
        linkSourceToReport: linkSourceToReport,
        updateReportSummary: updateReportSummary,
        updateReportInfo: updateReportInfo,
        createReportInfo: createReportInfo,
        linkMachinesToReport: linkMachinesToReport,
        updateReportCounts: updateReportCounts,

        // === GENEROVANIE ČÍSEL ZÁZNAMOV - NOVÉ ===
        generateNextNumber: generateNextNumber
    };

    /**
     * Linkuje stroje do výkazu strojov s komplexnou logiku atribútov
     */
    function linkMachinesToReport(machinesReport, sourceEntry, machinesResult, options) {
        var core = getCore();
        var config = getConfig();
        try {
            if (options && options.debugEntry && core.addDebug) {
                core.addDebug(options.debugEntry, "🔗 Linkujem stroje do výkazu strojov - NOVÁ LOGIKA");
            }

            // 1. Vytvor spätný link na sourceEntry (pole Záznam práce)
            createWorkRecordBacklink(machinesReport, sourceEntry, options);

            // 2. Získaj stroje z currentEntry s atribútmi
            var currentMachines = getMachinesFromCurrentEntry(sourceEntry, options);

            // 3. Linkuj stroje s komplexnou logikou atribútov
            linkMachinesWithComplexLogic(machinesReport, currentMachines, options);

        } catch (error) {
            if (options && options.debugEntry && core.addError) {
                core.addError(options.debugEntry, error.toString(), "linkMachinesToReport", error);
            }
        }
    }

    /**
     * Vytvorí spätný link na záznam práce
     */
    function createWorkRecordBacklink(machinesReport, sourceEntry, options) {
        var core = getCore();
        var config = getConfig();
        try {
            var workRecordField = core.safeGetLinks(machinesReport, config.fields.machinesReport.workRecord) || [];
            var sourceEntryId = core.safeGet(sourceEntry, "ID");

            // Skontroluj či link už existuje
            var linkExists = false;
            for (var i = 0; i < workRecordField.length; i++) {
                if (workRecordField[i] && core.safeGet(workRecordField[i], "ID") === sourceEntryId) {
                    linkExists = true;
                    break;
                }
            }

            if (!linkExists) {
                workRecordField.push(sourceEntry);
                core.safeSet(machinesReport, config.fields.machinesReport.workRecord, workRecordField);
                if (options && options.debugEntry && core.addDebug) {
                    core.addDebug(options.debugEntry, "  ✅ Spätný link na záznam práce pridaný");
                }
            } else {
                if (options && options.debugEntry && core.addDebug) {
                    core.addDebug(options.debugEntry, "  ℹ️ Spätný link už existuje");
                }
            }
        } catch (error) {
            if (options && options.debugEntry && core.addError) {
                core.addError(options.debugEntry, "Chyba pri vytváraní spätného linku: " + error.toString());
            }
        }
    }

    /**
     * Získa stroje z currentEntry s ich atribútmi
     */
    function getMachinesFromCurrentEntry(sourceEntry, options) {
        var core = getCore();
        var config = getConfig();
        var machines = [];

        try {
            if (options && options.debugEntry && core.addDebug) {
                core.addDebug(options.debugEntry, "📋 Získavam stroje z záznamu práce");
            }

            // Získaj pole strojov z currentEntry
            var machineryField = core.safeGetLinks(sourceEntry, config.fields.workRecord.machinery);

            if (!machineryField || machineryField.length === 0) {
                if (options && options.debugEntry && core.addDebug) {
                    core.addDebug(options.debugEntry, "  ℹ️ Žiadne stroje v zázname práce");
                }
                return machines;
            }

            // Získaj pole ako array pre čítanie atribútov
            var machineryArray = core.safeGet(sourceEntry, config.fields.workRecord.machinery);

            for (var i = 0; i < machineryField.length; i++) {
                var machineEntry = machineryField[i];
                var machineId = core.safeGet(machineEntry, "ID");
                var machineName = core.safeGet(machineEntry, "Názov", "Neznámy stroj");

                // Čítaj atribúty z arrayového prístupu
                var machineAttrs = {
                    mth: 0,
                    pausalPocet: 0,
                    cenaMth: 0,
                    cenaPausal: 0,
                    totalPrice: 0,
                    calculationType: null
                };

                if (machineryArray && machineryArray.length > i && machineryArray[i]) {
                    try {
                        // Použij správne názvy atribútov z currentEntry (workRecordMachines)
                        var workRecordAttrs = config.attributes.workRecordMachines;

                        if (options && options.debugEntry && core.addDebug) {
                            core.addDebug(options.debugEntry, "  🔍 DEBUG getMachinesFromCurrentEntry - názvy atribútov:");
                            core.addDebug(options.debugEntry, "    - calculationType: '" + workRecordAttrs.calculationType + "'");
                            core.addDebug(options.debugEntry, "    - usedMth: '" + workRecordAttrs.usedMth + "'");
                            core.addDebug(options.debugEntry, "    - priceMth: '" + workRecordAttrs.priceMth + "'");
                            core.addDebug(options.debugEntry, "    - flatRate: '" + workRecordAttrs.flatRate + "'");
                            core.addDebug(options.debugEntry, "    - totalPrice: '" + workRecordAttrs.totalPrice + "'");
                        }

                        var rawCalculationType = machineryArray[i].attr(workRecordAttrs.calculationType);
                        var rawMth = machineryArray[i].attr(workRecordAttrs.usedMth);
                        var rawPriceMth = machineryArray[i].attr(workRecordAttrs.priceMth);
                        var rawFlatRate = machineryArray[i].attr(workRecordAttrs.flatRate);
                        var rawTotalPrice = machineryArray[i].attr(workRecordAttrs.totalPrice);

                        if (options && options.debugEntry && core.addDebug) {
                            core.addDebug(options.debugEntry, "  📊 Prečítané hodnoty atribútov:");
                            core.addDebug(options.debugEntry, "    - rawCalculationType: " + rawCalculationType);
                            core.addDebug(options.debugEntry, "    - rawMth: " + rawMth);
                            core.addDebug(options.debugEntry, "    - rawPriceMth: " + rawPriceMth);
                            core.addDebug(options.debugEntry, "    - rawFlatRate: " + rawFlatRate);
                            core.addDebug(options.debugEntry, "    - rawTotalPrice: " + rawTotalPrice);
                        }

                        machineAttrs.calculationType = rawCalculationType || "mth";

                        var totalPrice = parseFloat(rawTotalPrice) || 0;
                        var priceMth = parseFloat(rawPriceMth) || 0;
                        var flatRate = parseFloat(rawFlatRate) || 0;

                        // Pre MTH: vypočítaj motohodiny z účtovanej sumy a sadzby
                        if (machineAttrs.calculationType === "mth") {
                            if (priceMth > 0 && totalPrice > 0) {
                                machineAttrs.mth = totalPrice / priceMth; // napr. 100 / 20 = 5 mth
                            } else {
                                machineAttrs.mth = parseFloat(rawMth) || 1; // fallback
                            }
                            machineAttrs.cenaMth = priceMth;
                            machineAttrs.cenaPausal = 0;
                            machineAttrs.pausalPocet = 0;
                        }
                        // Pre PAUŠÁL: vypočítaj počet paušálov z účtovanej sumy a ceny paušálu
                        else if (machineAttrs.calculationType === "paušál") {
                            if (flatRate > 0 && totalPrice > 0) {
                                machineAttrs.pausalPocet = Math.round(totalPrice / flatRate); // napr. 80 / 16 = 5
                            } else {
                                machineAttrs.pausalPocet = 1; // fallback
                            }
                            machineAttrs.cenaPausal = flatRate;
                            machineAttrs.mth = 0;
                            machineAttrs.cenaMth = 0;
                        }

                        machineAttrs.totalPrice = totalPrice;

                        if (options && options.debugEntry && core.addDebug) {
                            core.addDebug(options.debugEntry, "  🔧 " + machineName + " - typ: " + machineAttrs.calculationType +
                                        ", mth: " + machineAttrs.mth + ", cenaMth: " + machineAttrs.cenaMth +
                                        ", cenaPausal: " + machineAttrs.cenaPausal + ", totalPrice: " + machineAttrs.totalPrice);
                        }

                    } catch (attrError) {
                        if (options && options.debugEntry && core.addError) {
                            core.addError(options.debugEntry, "Chyba pri čítaní atribútov stroja " + machineName + ": " + attrError.toString());
                        }
                    }
                }

                machines.push({
                    machineEntry: machineEntry,
                    machineId: machineId,
                    machineName: machineName,
                    attributes: machineAttrs
                });
            }

            if (options && options.debugEntry && core.addDebug) {
                core.addDebug(options.debugEntry, "  📊 Získaných strojov: " + machines.length);
            }

        } catch (error) {
            if (options && options.debugEntry && core.addError) {
                core.addError(options.debugEntry, "Chyba pri získavaní strojov: " + error.toString());
            }
        }

        return machines;
    }

    /**
     * Linkuje stroje s komplexnou logikou atribútov
     */
    function linkMachinesWithComplexLogic(machinesReport, currentMachines, options) {
        var core = getCore();
        var config = getConfig();

        try {
            if (options && options.debugEntry && core.addDebug) {
                core.addDebug(options.debugEntry, "⚙️ Linkujem stroje s komplexnou logikou");
            }

            // Získaj existujúce linky na stroje vo výkaze
            // Používame safeGetLinks pre získanie Entry objektov (na porovnanie ID)
            var existingMachinesEntries = core.safeGetLinks(machinesReport, config.fields.machinesReport.machines) || [];
            // Ale aj field() pre LinkEntry objekty s atribútmi
            var existingMachinesWithAttrs = machinesReport.field(config.fields.machinesReport.machines) || [];

            if (options && options.debugEntry && core.addDebug) {
                core.addDebug(options.debugEntry, "  📦 Existujúcich linkov: " + existingMachinesEntries.length);

                // Debug: Výpis existujúcich strojov
                for (var debugIdx = 0; debugIdx < existingMachinesEntries.length; debugIdx++) {
                    var debugEntry = existingMachinesEntries[debugIdx];
                    var debugWithAttrs = existingMachinesWithAttrs[debugIdx];
                    var debugId = core.safeGet(debugEntry, "ID");
                    var debugName = core.safeGet(debugEntry, "name") || "???";
                    var debugCalcType = "";
                    try {
                        if (debugWithAttrs && typeof debugWithAttrs.attr === 'function') {
                            debugCalcType = debugWithAttrs.attr(config.attributes.machinesReportMachines.calculationType) || "null";
                        }
                    } catch (e) {
                        debugCalcType = "error";
                    }
                    core.addDebug(options.debugEntry, "    🔹 [" + debugIdx + "] " + debugName + " (ID:" + debugId + ", typ:" + debugCalcType + ")");
                }
            }

            // Pre každý stroj z currentEntry
            for (var i = 0; i < currentMachines.length; i++) {
                var currentMachine = currentMachines[i];
                var machineId = currentMachine.machineId;
                var machineName = currentMachine.machineName;
                var newAttrs = currentMachine.attributes;

                if (options && options.debugEntry && core.addDebug) {
                    core.addDebug(options.debugEntry, "  🚜 Spracúvam stroj: " + machineName + " (ID: " + machineId + ")");
                }

                // Nájdi existujúci link na tento stroj
                var existingLink = findExistingMachineLink(existingMachinesEntries, existingMachinesWithAttrs, machineId, newAttrs.calculationType, options);

                if (existingLink.found && existingLink.canAggregate) {
                    // Aktualizuj existujúci link (rovnaký stroj + rovnaký typ účtovania)
                    if (options && options.debugEntry && core.addDebug) {
                        core.addDebug(options.debugEntry, "    ♻️  Aktualizujem existujúci link");
                    }
                    updateExistingMachineLink(existingLink.linkObject, newAttrs, machineName, options);
                } else if (existingLink.found && !existingLink.canAggregate) {
                    // Nájdený stroj s INÝM typom účtovania - SKIP (alebo warning)
                    if (options && options.debugEntry && core.addDebug) {
                        core.addDebug(options.debugEntry, "    ⚠️  Stroj existuje ale s iným typom účtovania (" + existingLink.existingType + " vs " + newAttrs.calculationType + ") - preskakujem");
                    }
                } else {
                    // Vytvor nový link
                    if (options && options.debugEntry && core.addDebug) {
                        core.addDebug(options.debugEntry, "    ➕ Vytváram nový link");
                    }
                    createNewMachineLink(machinesReport, currentMachine.machineEntry, newAttrs, machineName, options);
                }
            }

        } catch (error) {
            if (options && options.debugEntry && core.addError) {
                core.addError(options.debugEntry, "Chyba pri linkovaní strojov: " + error.toString());
            }
        }
    }

    /**
     * Nájde existujúci link na stroj s kompatibilným typom účtovania
     */
    function findExistingMachineLink(existingMachinesEntries, existingMachinesWithAttrs, machineId, calculationType, options) {
        var core = getCore();
        var config = getConfig();

        try {
            if (options && options.debugEntry && core.addDebug) {
                core.addDebug(options.debugEntry, "🔍 Hľadám existujúci link pre stroj ID: " + machineId + ", typ: " + calculationType);
            }

            // Prejdi existujúce linky na stroje vo výkaze
            for (var i = 0; i < existingMachinesEntries.length; i++) {
                var existingMachineEntry = existingMachinesEntries[i]; // Entry objekt (na porovnanie ID)
                var existingMachineWithAttrs = existingMachinesWithAttrs[i]; // LinkEntry objekt (na čítanie atribútov)
                var existingMachineId = core.safeGet(existingMachineEntry, "ID");

                // Debug: porovnanie ID
                if (options && options.debugEntry && core.addDebug) {
                    core.addDebug(options.debugEntry, "      🔍 Porovnávam ID: " + existingMachineId + " vs " + machineId);
                }

                if (existingMachineId === machineId) {
                    if (options && options.debugEntry && core.addDebug) {
                        core.addDebug(options.debugEntry, "  ✅ Nájdený existujúci link pre stroj ID: " + machineId);
                    }

                    // Skontroluj typ účtovania priamym prístupom k atribútu
                    var existingCalculationType = null;
                    try {
                        if (existingMachineWithAttrs && typeof existingMachineWithAttrs.attr === 'function') {
                            existingCalculationType = existingMachineWithAttrs.attr(config.attributes.machinesReportMachines.calculationType);
                            if (options && options.debugEntry && core.addDebug) {
                                core.addDebug(options.debugEntry, "    📊 Existujúci calculationType: " + existingCalculationType);
                            }
                        }
                    } catch (e) {
                        if (options && options.debugEntry && core.addDebug) {
                            core.addDebug(options.debugEntry, "    ⚠️ Chyba pri čítaní calculationType: " + e.toString());
                        }
                    }

                    // Ak je typ kompatibilný (rovnaký alebo nevyplnený), môžeme agregova
                    var canAggregate = !existingCalculationType || existingCalculationType === calculationType;

                    return {
                        found: true,
                        canAggregate: canAggregate,
                        linkObject: existingMachineWithAttrs, // Vráť LinkEntry objekt s atribútmi!
                        existingType: existingCalculationType,
                        index: i
                    };
                }
            }

            // Ak nebol nájdený žiadny existujúci link
            if (options && options.debugEntry && core.addDebug) {
                core.addDebug(options.debugEntry, "  ❌ Žiadny existujúci link pre stroj ID: " + machineId);
            }

            return {
                found: false,
                canAggregate: false,
                linkObject: null,
                existingType: null
            };

        } catch (error) {
            if (options && options.debugEntry && core.addError) {
                core.addError(options.debugEntry, error.toString(), "findExistingMachineLink", error);
            }
            return {};
        }
    }

    /**
     * Linkuje agregované stroje do výkazu
     */
    function linkAggregatedMachines(machinesReport, aggregatedMachines, options) {
        var core = getCore();
        var config = getConfig();
        try {
            if (options && options.debugEntry && core.addDebug) {
                core.addDebug(options.debugEntry, "🚜 Vytváram LinkToEntry pre stroje vo výkaze");
            }

            // Získaj súčasné linky na stroje vo výkaze
            var existingMachines = core.safeGetLinks(machinesReport, config.fields.machinesReport.machines) || [];
            var updatedMachines = [];

            // Skopíruj existujúce linky
            for (var i = 0; i < existingMachines.length; i++) {
                updatedMachines.push(existingMachines[i]);
            }

            // Spracuj agregované stroje
            for (var machineId in aggregatedMachines) {
                var aggData = aggregatedMachines[machineId];
                var machineEntry = aggData.machineEntry;

                // DEBUG: Overenie typov a obsahu
                if (options && options.debugEntry && core.addDebug) {
                    core.addDebug(options.debugEntry, "  🔍 DEBUG machineEntry ID: " + machineId);
                    core.addDebug(options.debugEntry, "  🔍 DEBUG machineEntry type: " + (typeof machineEntry));
                    if (machineEntry && typeof machineEntry === 'object') {
                        core.addDebug(options.debugEntry, "  🔍 DEBUG machineEntry ID field: " + core.safeGet(machineEntry, "ID"));
                        core.addDebug(options.debugEntry, "  🔍 DEBUG machineEntry name: " + core.safeGet(machineEntry, "Názov"));
                    }
                }

                // Skontroluj či už existuje link na tento stroj
                var existingIndex = -1;
                for (var j = 0; j < updatedMachines.length; j++) {
                    if (updatedMachines[j] && core.safeGet(updatedMachines[j], "ID") === machineId) {
                        existingIndex = j;
                        break;
                    }
                }

                if (existingIndex === -1) {
                    // Pridaj nový link - ale iba ak je machineEntry validný
                    if (machineEntry && typeof machineEntry === 'object') {
                        updatedMachines.push(machineEntry);
                        existingIndex = updatedMachines.length - 1;
                        if (options && options.debugEntry && core.addDebug) {
                            core.addDebug(options.debugEntry, "  ➕ Pridaný nový link na stroj: " + aggData.machineData.name);
                        }
                    } else {
                        if (options && options.debugEntry && core.addError) {
                            core.addError(options.debugEntry, "❌ Nevalidný machineEntry pre ID: " + machineId);
                        }
                    }
                } else {
                    if (options && options.debugEntry && core.addDebug) {
                        core.addDebug(options.debugEntry, "  🔄 Aktualizujem existujúci link na stroj: " + aggData.machineData.name);
                    }
                }
            }

            // Nastav aktualizované pole strojov
            core.safeSet(machinesReport, config.fields.machinesReport.machines, updatedMachines);
            if (options && options.debugEntry && core.addDebug) {
                core.addDebug(options.debugEntry, "✅ Pole Stroje nastavené s " + updatedMachines.length + " linkmi");
            }

            // Teraz nastav atribúty pre každý stroj
            setMachineAttributes(machinesReport, aggregatedMachines, options);

        } catch (error) {
            if (options && options.debugEntry && core.addError) {
                core.addError(options.debugEntry, error.toString(), "linkAggregatedMachines", error);
            }
        }
    }

    /**
     * Nastavuje atribúty pre stroje vo výkaze
     */
    function setMachineAttributes(machinesReport, aggregatedMachines, options) {
        var core = getCore();
        var config = getConfig();
        try {
            if (options && options.debugEntry && core.addDebug) {
                core.addDebug(options.debugEntry, "🔧 Nastavujem atribúty strojov");
            }

            // DÔLEŽITÉ: Pre nastavenie atribútov MUSÍME použiť field() aby sme získali LinkEntry objekty
            var machinesArray = machinesReport.field(config.fields.machinesReport.machines);

            if (!machinesArray || machinesArray.length === 0) {
                if (options && options.debugEntry && core.addDebug) {
                    core.addDebug(options.debugEntry, "⚠️ Pole strojov je prázdne");
                }
                return;
            }

            if (options && options.debugEntry && core.addDebug) {
                core.addDebug(options.debugEntry, "✅ Pole strojov načítané cez field(): " + machinesArray.length + " položiek");
            }

            // Pre každý stroj nastav atribúty
            for (var i = 0; i < machinesArray.length; i++) {
                var machineInArray = machinesArray[i];

                if (!machineInArray) {
                    if (options && options.debugEntry && core.addDebug) {
                        core.addDebug(options.debugEntry, "⚠️ Prázdny stroj na pozícii " + i);
                    }
                    continue;
                }

                var machineId = core.safeGet(machineInArray, "ID");
                if (options && options.debugEntry && core.addDebug) {
                    core.addDebug(options.debugEntry, "  🔍 Spracúvam stroj ID: " + machineId);
                }

                // Nájdi agregované dáta pre tento stroj
                var aggData = aggregatedMachines[machineId];

                if (aggData) {
                    var attributes = config.attributes.machinesReportMachines;

                    // Nastav atribúty podľa typu účtovania
                    // Použij skutočnú celkovú cenu z agregovaných dát
                    var totalCelkom = aggData.totalPrice || 0;

                    try {
                        if (aggData.totalMth > 0) {
                            // Účtovanie podľa motohodín
                            machineInArray.setAttr(attributes.mth, aggData.totalMth);
                            machineInArray.setAttr(attributes.cenaMth, aggData.priceMth);
                            if (options && options.debugEntry && core.addDebug) {
                                core.addDebug(options.debugEntry, "    📊 MTH: " + aggData.totalMth + " × " + aggData.priceMth + "€");
                            }
                        }

                        if (aggData.flatRateCount > 0) {
                            // Účtovanie paušálom
                            machineInArray.setAttr(attributes.pausalPocet, aggData.flatRateCount);
                            machineInArray.setAttr(attributes.cenaPausal, aggData.flatRatePrice);
                            if (options && options.debugEntry && core.addDebug) {
                                core.addDebug(options.debugEntry, "    📊 Paušál: " + aggData.flatRateCount + " × " + aggData.flatRatePrice + "€");
                            }
                        }

                        // Nastav celkovú cenu z agregovaných dát
                        machineInArray.setAttr(attributes.cenaCelkom, totalCelkom);

                    } catch (attrError) {
                        if (options && options.debugEntry && core.addError) {
                            core.addError(options.debugEntry, "Chyba pri nastavovaní atribútov pre stroj " + machineId + ": " + attrError.toString());
                        }
                    }

                    if (options && options.debugEntry && core.addDebug) {
                        core.addDebug(options.debugEntry, "    ✅ " + aggData.machineData.name + " - celkom: " + totalCelkom + "€");
                    }
                } else {
                    if (options && options.debugEntry && core.addDebug) {
                        core.addDebug(options.debugEntry, "  ⚠️ Nenašli sa agregované dáta pre stroj ID: " + machineId);
                    }
                }
            }

            if (options && options.debugEntry && core.addDebug) {
                core.addDebug(options.debugEntry, "🔗 Nastavenie atribútov dokončené pre " + machinesArray.length + " strojov");
            }

        } catch (error) {
            if (options && options.debugEntry && core.addError) {
                core.addError(options.debugEntry, error.toString(), "setMachineAttributes", error);
            }
        }
    }

    /**
     * Aktualizuje počítacie polia vo výkazoch
     */
    function updateReportCounts(report, reportConfig, reportType, options) {
        var core = getCore();
        var config = getConfig();
        try {
            var reportFields = config.fields[reportConfig.library];
            if (!reportFields) {
                return;
            }

            // Počet záznamov (LinkToEntry z Záznam prác)
            if (reportFields.pocetZaznamov && reportFields.workRecord) {
                var workRecords = core.safeGetLinks(report, reportFields.workRecord) || [];
                core.safeSet(report, reportFields.pocetZaznamov, workRecords.length);
                if (options && options.debugEntry && core.addDebug) {
                    core.addDebug(options.debugEntry, "  📊 Počet záznamov: " + workRecords.length);
                }
            }

            // Počet strojov (LinkToEntry z Mechanizácia) - iba pre výkaz strojov
            if (reportType === 'machines' && reportFields.pocetStrojov && reportFields.machines) {
                var machines = core.safeGetLinks(report, reportFields.machines) || [];
                core.safeSet(report, reportFields.pocetStrojov, machines.length);
                if (options && options.debugEntry && core.addDebug) {
                    core.addDebug(options.debugEntry, "  📊 Počet strojov: " + machines.length);
                }
            }

            // Počet záznamov pre výkaz prác (LinkToEntry z workRecords)
            if (reportType === 'work' && reportFields.hzsCount && reportFields.workRecords) {
                var workRecordsCount = core.safeGetLinks(report, reportFields.workRecords) || [];
                core.safeSet(report, reportFields.hzsCount, workRecordsCount.length);
                if (options && options.debugEntry && core.addDebug) {
                    core.addDebug(options.debugEntry, "  📊 HZS Count: " + workRecordsCount.length);
                }
            }

        } catch (error) {
            if (options && options.debugEntry && core.addError) {
                core.addError(options.debugEntry, "Chyba pri aktualizácii počtov: " + error.toString(), "updateReportCounts", error);
            }
        }
    }

    /**
     * Nájde existujúci link na stroj s kompatibilným typom účtovania
     */
    function findExistingMachineLink(existingMachinesArray, machineId, calculationType, options) {
        var core = getCore();
        var config = getConfig();

        try {
            for (var i = 0; i < existingMachinesArray.length; i++) {
                var existingMachine = existingMachinesArray[i];
                var existingMachineId = core.safeGet(existingMachine, "ID");

                if (existingMachineId === machineId) {
                    // Skontroluj typ účtovania v existujúcom linku
                    var attrs = config.attributes.machinesReportMachines;
                    var existingMth = existingMachine.getAttr(attrs.mth) || 0;
                    var existingPausal = existingMachine.getAttr(attrs.pausalPocet) || 0;

                    var existingType = (existingMth > 0) ? "mth" : "paušál";

                    if (options && options.debugEntry && core.addDebug) {
                        core.addDebug(options.debugEntry, "    🔍 Existujúci link - typ: " + existingType +
                                    ", nový typ: " + calculationType);
                    }

                    // Ak je typ kompatibilný, vráť tento link
                    if (existingType === calculationType) {
                        return {
                            found: true,
                            linkObject: existingMachine,
                            index: i
                        };
                    }
                }
            }

            return { found: false };

        } catch (error) {
            if (options && options.debugEntry && core.addError) {
                core.addError(options.debugEntry, "Chyba pri hľadaní existujúceho linku: " + error.toString());
            }
            return { found: false };
        }
    }

    /**
     * Aktualizuje existujúci link na stroj
     */
    function updateExistingMachineLink(linkObject, newAttrs, machineName, options) {
        var core = getCore();
        var config = getConfig();

        try {
            if (options && options.debugEntry && core.addDebug) {
                core.addDebug(options.debugEntry, "    🔄 Aktualizujem existujúci link pre: " + machineName);
            }

            var attrs = config.attributes.machinesReportMachines;

            // Získaj existujúce hodnoty
            var existingMth = parseFloat(linkObject.attr(attrs.mth)) || 0;
            var existingPausal = parseFloat(linkObject.attr(attrs.pausalPocet)) || 0;
            var existingCenaMth = parseFloat(linkObject.attr(attrs.cenaMth)) || 0;
            var existingCenaPausal = parseFloat(linkObject.attr(attrs.cenaPausal)) || 0;

            // Aktualizuj hodnoty podľa typu účtovania
            if (newAttrs.calculationType === "mth") {
                // Sčítaj motohodiny (agregácia)
                var newMth = existingMth + newAttrs.mth;
                linkObject.setAttr(attrs.mth, newMth);

                // Porovnaj a aktualizuj cenu (použij novšiu cenu ak sa zmenila)
                var finalCenaMth = newAttrs.cenaMth;
                if (existingCenaMth > 0 && existingCenaMth !== newAttrs.cenaMth) {
                    if (options && options.debugEntry && core.addDebug) {
                        core.addDebug(options.debugEntry, "      ⚠️ Cena MTH sa zmenila: " + existingCenaMth + "€ → " + newAttrs.cenaMth + "€");
                    }
                }
                linkObject.setAttr(attrs.cenaMth, finalCenaMth);
                linkObject.setAttr(attrs.calculationType, newAttrs.calculationType);

                // Prepočítaj celkovú cenu z agregovaných hodnôt
                var newTotal = newMth * finalCenaMth;
                linkObject.setAttr(attrs.cenaCelkom, newTotal);

                if (options && options.debugEntry && core.addDebug) {
                    core.addDebug(options.debugEntry, "      📊 MTH agregácia: " + existingMth + "+" + newAttrs.mth + "=" + newMth +
                                " mth × " + finalCenaMth + "€ = " + newTotal + "€");
                }

            } else if (newAttrs.calculationType === "paušál") {
                // Sčítaj počet paušálov (agregácia)
                var newPausal = existingPausal + newAttrs.pausalPocet;
                linkObject.setAttr(attrs.pausalPocet, newPausal);

                // Porovnaj a aktualizuj cenu (použij novšiu cenu ak sa zmenila)
                var finalCenaPausal = newAttrs.cenaPausal;
                if (existingCenaPausal > 0 && existingCenaPausal !== newAttrs.cenaPausal) {
                    if (options && options.debugEntry && core.addDebug) {
                        core.addDebug(options.debugEntry, "      ⚠️ Cena paušál sa zmenila: " + existingCenaPausal + "€ → " + newAttrs.cenaPausal + "€");
                    }
                }
                linkObject.setAttr(attrs.cenaPausal, finalCenaPausal);
                linkObject.setAttr(attrs.calculationType, newAttrs.calculationType);

                // Prepočítaj celkovú cenu z agregovaných hodnôt
                var newTotal = newPausal * finalCenaPausal;
                linkObject.setAttr(attrs.cenaCelkom, newTotal);

                if (options && options.debugEntry && core.addDebug) {
                    core.addDebug(options.debugEntry, "      📊 Paušál agregácia: " + existingPausal + "+" + newAttrs.pausalPocet + "=" + newPausal +
                                " ks × " + finalCenaPausal + "€ = " + newTotal + "€");
                }
            }

        } catch (error) {
            if (options && options.debugEntry && core.addError) {
                core.addError(options.debugEntry, "Chyba pri aktualizácii existujúceho linku: " + error.toString());
            }
        }
    }

    /**
     * Vytvorí nový link na stroj vo výkaze
     */
    function createNewMachineLink(machinesReport, machineEntry, newAttrs, machineName, options) {
        var core = getCore();
        var config = getConfig();

        try {
            if (options && options.debugEntry && core.addDebug) {
                core.addDebug(options.debugEntry, "    ➕ Vytváram nový link pre: " + machineName);
            }

            // Získaj existujúce pole strojov (Entry objekty pre pridanie)
            var existingMachines = core.safeGetLinks(machinesReport, config.fields.machinesReport.machines) || [];

            // Pridaj nový stroj
            existingMachines.push(machineEntry);
            core.safeSet(machinesReport, config.fields.machinesReport.machines, existingMachines);

            // DÔLEŽITÉ: Teraz musíme získať LinkEntry objekt cez field() pre nastavenie atribútov
            var machinesFieldWithAttrs = machinesReport.field(config.fields.machinesReport.machines);
            var newlyAddedMachine = machinesFieldWithAttrs[machinesFieldWithAttrs.length - 1];
            var attrs = config.attributes.machinesReportMachines;

            if (options && options.debugEntry && core.addDebug) {
                core.addDebug(options.debugEntry, "  🔍 DEBUG createNewMachineLink - názvy atribútov výkazu:");
                core.addDebug(options.debugEntry, "    - mth: '" + attrs.mth + "'");
                core.addDebug(options.debugEntry, "    - cenaMth: '" + attrs.cenaMth + "'");
                core.addDebug(options.debugEntry, "    - pausalPocet: '" + attrs.pausalPocet + "'");
                core.addDebug(options.debugEntry, "    - cenaPausal: '" + attrs.cenaPausal + "'");
                core.addDebug(options.debugEntry, "    - cenaCelkom: '" + attrs.cenaCelkom + "'");
                core.addDebug(options.debugEntry, "    - calculationType: '" + attrs.calculationType + "'");
                core.addDebug(options.debugEntry, "  📥 Hodnoty na zápis:");
                core.addDebug(options.debugEntry, "    - newAttrs.calculationType: " + newAttrs.calculationType);
                core.addDebug(options.debugEntry, "    - newAttrs.mth: " + newAttrs.mth);
                core.addDebug(options.debugEntry, "    - newAttrs.cenaMth: " + newAttrs.cenaMth);
            }

            if (newAttrs.calculationType === "mth") {
                newlyAddedMachine.setAttr(attrs.mth, newAttrs.mth);
                newlyAddedMachine.setAttr(attrs.cenaMth, newAttrs.cenaMth);
                newlyAddedMachine.setAttr(attrs.pausalPocet, 0);
                newlyAddedMachine.setAttr(attrs.cenaPausal, 0);
                newlyAddedMachine.setAttr(attrs.calculationType, newAttrs.calculationType);

                // Prepočítaj celkovú cenu
                var totalPrice = newAttrs.mth * newAttrs.cenaMth;
                newlyAddedMachine.setAttr(attrs.cenaCelkom, totalPrice);

                if (options && options.debugEntry && core.addDebug) {
                    core.addDebug(options.debugEntry, "      📊 Nový MTH link: " + newAttrs.mth + " mth × " + newAttrs.cenaMth + "€ = " + totalPrice + "€");
                }

            } else if (newAttrs.calculationType === "paušál") {
                newlyAddedMachine.setAttr(attrs.pausalPocet, newAttrs.pausalPocet);
                newlyAddedMachine.setAttr(attrs.cenaPausal, newAttrs.cenaPausal);
                newlyAddedMachine.setAttr(attrs.mth, 0);
                newlyAddedMachine.setAttr(attrs.cenaMth, 0);
                newlyAddedMachine.setAttr(attrs.calculationType, newAttrs.calculationType);

                // Prepočítaj celkovú cenu
                var totalPrice = newAttrs.pausalPocet * newAttrs.cenaPausal;
                newlyAddedMachine.setAttr(attrs.cenaCelkom, totalPrice);

                if (options && options.debugEntry && core.addDebug) {
                    core.addDebug(options.debugEntry, "      📊 Nový paušál link: " + newAttrs.pausalPocet + " ks × " + newAttrs.cenaPausal + "€ = " + totalPrice + "€");
                }
            }

        } catch (error) {
            if (options && options.debugEntry && core.addError) {
                core.addError(options.debugEntry, "Chyba pri vytváraní nového linku: " + error.toString());
            }
        }
    }

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