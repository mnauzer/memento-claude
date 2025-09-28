// ==============================================
// MEMENTO DATABASE - UNIVERZÁLNY PREPOČET ZAMESTNANCA
// Verzia: 2.0 | Dátum: 28.09.2025 | Autor: ASISTANTO
// Knižnica: Zamestnanci | Trigger: Before Save
// ==============================================
// ✅ NOVÉ v2.0: KOMPLETNÁ REFAKTORIZÁCIA
//    - Integrácia s MementoUtils frameworkom
//    - Opravené filtre výberu obdobia
//    - Centralizované dátové objekty
//    - Optimalizované spracovanie
//    - Konzistentná štruktúra kódu
//    - Nové addInfo funkcie
// ==============================================

// ==============================================
// MODUL IMPORTS A INICIALIZÁCIA
// ==============================================

// Lazy loading modulov
var utils, config, core, business;

function initializeModules() {
    if (!utils && typeof MementoUtils !== 'undefined') {
        utils = MementoUtils;
    }
    if (!config && utils && utils.config) {
        config = utils.config;
    }
    if (!core && typeof MementoCore !== 'undefined') {
        core = MementoCore;
    }
    if (!business && typeof MementoBusiness !== 'undefined') {
        business = MementoBusiness;
    }

    // Fallback ak moduly nie sú dostupné
    if (!utils || !config || !core) {
        throw new Error("Required Memento modules not available");
    }
}

// ==============================================
// SCRIPT KONFIGURÁCIA
// ==============================================

var SCRIPT_CONFIG = {
    name: "Zamestnanec Universal Calculator",
    version: "2.0",
    description: "Univerzálny prepočet zamestnanca s opraveným filtrom okresov",
    libraries: {
        employees: "Zamestnanci",
        attendance: "Dochádzka",
        workRecords: "Záznam prác",
        drivingLog: "Kniha jázd",
        rates: "sadzby zamestnancov",
        receivables: "Pohľadávky",
        liabilities: "Záväzky",
        cashRegister: "Pokladňa"
    },
    debug: true
};

// ==============================================
// CENTRALIZOVANÝ DÁTOVÝ OBJEKT
// ==============================================

var EmployeeCalculationData = {
    // Základné info o zamestnancovi
    employee: {
        entry: null,
        nick: "",
        fullName: "",
        currentHourlyRate: 0
    },

    // Filtre pre spracovanie
    filters: {
        selection: null,    // Filter pre filtrované polia
        total: null        // Filter pre total polia
    },

    // Výsledky spracovaných knižníc - FILTROVANÉ údaje
    filtered: {
        attendance: { worked: 0, earned: 0, records: 0 },
        workRecords: { worked: 0, records: 0 },
        drivingLog: { hours: 0, records: 0 },
        cashRegister: { paid: 0, records: 0 },
        receivables: { amount: 0, records: 0 },
        liabilities: { amount: 0, records: 0 }
    },

    // Výsledky spracovaných knižníc - TOTAL údaje
    total: {
        attendance: { worked: 0, earned: 0, records: 0 },
        workRecords: { worked: 0, records: 0 },
        drivingLog: { hours: 0, records: 0 },
        cashRegister: { paid: 0, records: 0 }
    },

    // Finálne vypočítané hodnoty
    calculated: {
        balance: 0,              // Saldo = Pohľadávky - Záväzky
        paymentDifference: 0     // Preplatok/Nedoplatok = Zarobené - Vyplatené
    },

    // Štatistiky spracovania
    statistics: {
        totalLibraries: 0,
        processedLibraries: 0,
        savedFields: 0,
        errors: 0
    },

    // Metódy pre prácu s objektom
    addFilteredResult: function(libraryName, data) {
        if (this.filtered[libraryName]) {
            Object.assign(this.filtered[libraryName], data);
        }
    },

    addTotalResult: function(libraryName, data) {
        if (this.total[libraryName]) {
            Object.assign(this.total[libraryName], data);
        }
    },

    calculateFinalValues: function() {
        this.calculated.balance = this.filtered.receivables.amount - this.filtered.liabilities.amount;
        this.calculated.paymentDifference = this.filtered.attendance.earned - this.filtered.cashRegister.paid;
    },

    getSummary: function() {
        return {
            employee: this.employee.fullName,
            filters: {
                selection: this.filters.selection ? this.filters.selection.popis : "N/A",
                total: this.filters.total ? this.filters.total.popis : "N/A"
            },
            totals: {
                workedHours: this.filtered.attendance.worked,
                earnedAmount: this.filtered.attendance.earned,
                paidAmount: this.filtered.cashRegister.paid,
                balance: this.calculated.balance,
                paymentDifference: this.calculated.paymentDifference
            },
            statistics: this.statistics
        };
    }
};

// ==============================================
// FILTER SPRACOVANIE - OPRAVENÉ
// ==============================================

function parseFilterDateRange(filterText) {
    utils.addDebug(entry(), "Parsovanie dátumového filtra: '" + filterText + "'", {
        scriptName: SCRIPT_CONFIG.name,
        scriptVersion: SCRIPT_CONFIG.version,
        moduleName: "FilterProcessor"
    });

    if (!filterText) {
        return { isValid: false, reason: "Prázdny filter" };
    }

    var cleanFilter = filterText.trim().toLowerCase();
    var now = moment();

    // TEXTOVÉ VÝRAZY - rozšírené o nové možnosti
    var textualPatterns = {
        // ROČNÉ FILTRE
        "tento rok": {
            type: "yearly",
            year: now.year(),
            popis: "tento rok (" + now.year() + ")"
        },
        "minulý rok": {
            type: "yearly",
            year: now.year() - 1,
            popis: "minulý rok (" + (now.year() - 1) + ")"
        },

        // MESAČNÉ FILTRE
        "tento mesiac": {
            type: "monthly",
            month: now.month() + 1,
            year: now.year(),
            popis: "tento mesiac (" + (now.month() + 1) + "/" + now.year() + ")"
        },
        "minulý mesiac": {
            type: "monthly",
            month: now.month() === 0 ? 12 : now.month(),
            year: now.month() === 0 ? now.year() - 1 : now.year(),
            popis: "minulý mesiac"
        },

        // TÝŽDENNÉ FILTRE (pondelok ako začiatok)
        "tento týždeň": {
            type: "range",
            startDate: now.clone().startOf('isoWeek'),
            endDate: now.clone().endOf('isoWeek'),
            popis: "tento týždeň"
        },
        "minulý týždeň": {
            type: "range",
            startDate: now.clone().subtract(1, 'week').startOf('isoWeek'),
            endDate: now.clone().subtract(1, 'week').endOf('isoWeek'),
            popis: "minulý týždeň"
        },

        // ŠPECIÁLNE FILTRE
        "total": {
            type: "all",
            popis: "všetky záznamy (bez filtra)"
        },
        "všetko": {
            type: "all",
            popis: "všetky záznamy (bez filtra)"
        },
        "vsetko": {
            type: "all",
            popis: "všetky záznamy (bez filtra)"
        }
    };

    // Skontroluj textové výrazy
    if (textualPatterns[cleanFilter]) {
        var pattern = textualPatterns[cleanFilter];
        utils.addDebug(entry(), "Rozpoznaný textový filter: " + cleanFilter, {
            scriptName: SCRIPT_CONFIG.name,
            scriptVersion: SCRIPT_CONFIG.version,
            moduleName: "FilterProcessor"
        });
        return {
            isValid: true,
            type: pattern.type,
            month: pattern.month,
            year: pattern.year,
            startDate: pattern.startDate,
            endDate: pattern.endDate,
            popis: pattern.popis
        };
    }

    // ČÍSELNÉ FORMÁTY: MM/YYYY, YYYY, MM/YY
    var numericPatterns = [
        /^(\d{1,2})[\/\.](\d{4})$/, // MM/YYYY alebo MM.YYYY
        /^(\d{4})$/,                // YYYY
        /^(\d{1,2})[\/\.](\d{2})$/  // MM/YY
    ];

    for (var i = 0; i < numericPatterns.length; i++) {
        var match = filterText.trim().match(numericPatterns[i]);
        if (match) {
            if (i === 0) { // MM/YYYY
                return {
                    isValid: true,
                    month: parseInt(match[1]),
                    year: parseInt(match[2]),
                    type: "monthly",
                    popis: "mesiac " + match[1] + "/" + match[2]
                };
            } else if (i === 1) { // YYYY
                return {
                    isValid: true,
                    year: parseInt(match[1]),
                    type: "yearly",
                    popis: "rok " + match[1]
                };
            } else if (i === 2) { // MM/YY
                var fullYear = parseInt(match[2]) + 2000;
                return {
                    isValid: true,
                    month: parseInt(match[1]),
                    year: fullYear,
                    type: "monthly",
                    popis: "mesiac " + match[1] + "/" + fullYear
                };
            }
        }
    }

    return {
        isValid: false,
        reason: "Neplatný formát. Podporované: 'Tento rok', 'Tento mesiac', 'Tento týždeň', 'Total', 'MM/YYYY', 'YYYY'"
    };
}

function dateMatchesFilter(datum, filter) {
    if (!datum || !filter || !filter.isValid) return false;

    // Špeciálny prípad pre "total" filter - zahrnúť všetko
    if (filter.type === "all") return true;

    var recordDate = moment(datum);
    if (!recordDate.isValid()) return false;

    if (filter.type === "yearly") {
        return recordDate.year() === filter.year;
    } else if (filter.type === "monthly") {
        return recordDate.year() === filter.year && (recordDate.month() + 1) === filter.month;
    } else if (filter.type === "range") {
        return recordDate.isBetween(filter.startDate, filter.endDate, 'day', '[]');
    }

    return false;
}

// ==============================================
// UNIVERZÁLNE SPRACOVANIE KNIŽNÍC
// ==============================================

function processLibraryData(employeeEntry, libraryName, fieldMappings, filter, isTotal) {
    var result = {
        success: false,
        data: {},
        recordsProcessed: 0,
        recordsTotal: 0,
        errors: 0
    };

    try {
        utils.addDebug(employeeEntry, "Spracovanie knižnice: " + libraryName + " (" + (isTotal ? "TOTAL" : "FILTERED") + ")", {
            scriptName: SCRIPT_CONFIG.name,
            scriptVersion: SCRIPT_CONFIG.version,
            moduleName: "LibraryProcessor",
            sectionName: libraryName
        });

        // Získaj záznamy cez linksFrom
        var linksFromField = fieldMappings.linksFromField;
        var records = employeeEntry.linksFrom(lib(libraryName), linksFromField);

        if (!records || records.length === 0) {
            utils.addDebug(employeeEntry, "Žiadne záznamy v knižnici " + libraryName, {
                scriptName: SCRIPT_CONFIG.name,
                scriptVersion: SCRIPT_CONFIG.version,
                moduleName: "LibraryProcessor"
            });
            result.success = true;
            return result;
        }

        result.recordsTotal = records.length;
        var processedData = {};

        // Inicializuj všetky hodnoty na 0
        for (var key in fieldMappings.dataFields) {
            processedData[key] = 0;
        }

        // Spracuj každý záznam
        for (var i = 0; i < records.length; i++) {
            try {
                var record = records[i];
                var dateValue = core.safeGet(record, fieldMappings.dateField);

                // OPRAVENÉ: Používaj správny filter podľa typu
                var shouldInclude = dateMatchesFilter(dateValue, filter);

                if (shouldInclude) {
                    // Spracuj všetky nakonfigurované polia
                    for (var fieldKey in fieldMappings.dataFields) {
                        var fieldName = fieldMappings.dataFields[fieldKey];
                        var fieldValue = core.safeGet(record, fieldName, 0);

                        // Špeciálne spracovanie pre pokladňa (len Mzda a Mzda záloha)
                        if (libraryName === SCRIPT_CONFIG.libraries.cashRegister) {
                            var purpose = core.safeGet(record, "Účel výdaja", "");
                            if (purpose !== "Mzda" && purpose !== "Mzda záloha") {
                                continue; // Preskočiť tento záznam
                            }
                        }

                        processedData[fieldKey] += fieldValue;
                    }
                    result.recordsProcessed++;
                }
            } catch (recordError) {
                result.errors++;
                utils.addError(employeeEntry, "Chyba pri spracovaní záznamu " + i + " v " + libraryName + ": " + recordError.toString(), "LibraryProcessor");
            }
        }

        result.data = processedData;
        result.success = true;

        utils.addDebug(employeeEntry, "Spracovaných záznamov: " + result.recordsProcessed + "/" + result.recordsTotal, {
            scriptName: SCRIPT_CONFIG.name,
            scriptVersion: SCRIPT_CONFIG.version,
            moduleName: "LibraryProcessor"
        });

    } catch (error) {
        result.errors++;
        utils.addError(employeeEntry, "Chyba pri spracovaní knižnice " + libraryName + ": " + error.toString(), "LibraryProcessor");
    }

    return result;
}

// ==============================================
// KONFIGURÁCIA KNIŽNÍC A POLÍ
// ==============================================

function getLibraryMappings() {
    return {
        attendance: {
            linksFromField: "Zamestnanci",
            dateField: "Dátum",
            dataFields: {
                worked: "Pracovná doba",
                // earned sa počíta z atribútu "denná mzda"
            }
        },
        workRecords: {
            linksFromField: "Zamestnanci",
            dateField: "Dátum",
            dataFields: {
                worked: "Pracovná doba"
            }
        },
        drivingLog: {
            linksFromField: "Posádka",
            dateField: "Dátum",
            dataFields: {
                hours: "Celkový čas"
            }
        },
        cashRegister: {
            linksFromField: "Zamestnanec",
            dateField: "Dátum",
            dataFields: {
                paid: "Suma"
            }
        },
        receivables: {
            linksFromField: "Zamestnanec",
            dateField: "Dátum",
            dataFields: {
                amount: "Zostatok"
            }
        },
        liabilities: {
            linksFromField: "Zamestnanec",
            dateField: "Dátum",
            dataFields: {
                amount: "Zostatok"
            }
        }
    };
}

// ==============================================
// ZÍSKANIE AKTUÁLNEJ HODINOVKY
// ==============================================

function getCurrentHourlyRate(employeeEntry) {
    utils.addDebug(employeeEntry, "Výpočet aktuálnej hodinovky", {
        scriptName: SCRIPT_CONFIG.name,
        scriptVersion: SCRIPT_CONFIG.version,
        moduleName: "RateCalculator"
    });

    try {
        var ratesLibrary = lib(SCRIPT_CONFIG.libraries.rates);
        if (!ratesLibrary) {
            utils.addError(employeeEntry, "Knižnica '" + SCRIPT_CONFIG.libraries.rates + "' nenájdená", "RateCalculator");
            return 0;
        }

        var rates = ratesLibrary.find("Zamestnanec", employeeEntry);

        if (!rates || rates.length === 0) {
            utils.addDebug(employeeEntry, "Pre zamestnanca neboli nájdené žiadne sadzby", {
                scriptName: SCRIPT_CONFIG.name,
                scriptVersion: SCRIPT_CONFIG.version,
                moduleName: "RateCalculator"
            });
            return 0;
        }

        // Nájdi najnovšiu platnú sadzbu
        var latestRate = null;
        var latestDate = null;

        for (var i = 0; i < rates.length; i++) {
            var rate = rates[i];
            var validFrom = core.safeGet(rate, "Platnosť od");
            var rateValue = core.safeGet(rate, "Sadzba", 0);

            if (validFrom && (!latestDate || moment(validFrom).isAfter(latestDate))) {
                latestDate = moment(validFrom);
                latestRate = rateValue;
            }
        }

        if (latestRate !== null) {
            utils.addDebug(employeeEntry, "Aktuálna hodinovka: " + latestRate + " €/h (platná od " + latestDate.format('DD.MM.YYYY') + ")", {
                scriptName: SCRIPT_CONFIG.name,
                scriptVersion: SCRIPT_CONFIG.version,
                moduleName: "RateCalculator"
            });
            return latestRate;
        }

    } catch (error) {
        utils.addError(employeeEntry, "Chyba pri získavaní hodinovky: " + error.toString(), "RateCalculator");
    }

    return 0;
}

// ==============================================
// HLAVNÁ FUNKCIONALITA
// ==============================================

function processAttendanceEarnings(employeeEntry, filter, isTotal) {
    var result = {
        worked: 0,
        earned: 0,
        recordsProcessed: 0,
        recordsTotal: 0,
        errors: 0
    };

    try {
        var attendanceRecords = employeeEntry.linksFrom(lib(SCRIPT_CONFIG.libraries.attendance), "Zamestnanci");

        if (!attendanceRecords || attendanceRecords.length === 0) {
            return result;
        }

        result.recordsTotal = attendanceRecords.length;

        for (var i = 0; i < attendanceRecords.length; i++) {
            try {
                var record = attendanceRecords[i];
                var dateValue = core.safeGet(record, "Dátum");
                var workedHours = core.safeGet(record, "Pracovná doba", 0);

                if (dateMatchesFilter(dateValue, filter)) {
                    result.worked += workedHours;

                    // Získaj dennú mzdu z atribútu
                    try {
                        var dailyWage = record.attr("denná mzda") || 0;
                        result.earned += dailyWage;
                    } catch (attrError) {
                        // Ak atribút nie je dostupný, pokračuj bez neho
                    }

                    result.recordsProcessed++;
                }
            } catch (recordError) {
                result.errors++;
            }
        }

    } catch (error) {
        result.errors++;
        utils.addError(employeeEntry, "Chyba pri spracovaní dochádzky: " + error.toString(), "AttendanceProcessor");
    }

    return result;
}

function processAllLibraries() {
    var mappings = getLibraryMappings();

    // Spracuj všetky knižnice pre filtrované údaje
    var attendanceFiltered = processAttendanceEarnings(EmployeeCalculationData.employee.entry, EmployeeCalculationData.filters.selection, false);
    EmployeeCalculationData.addFilteredResult('attendance', attendanceFiltered);

    var workRecordsFiltered = processLibraryData(
        EmployeeCalculationData.employee.entry,
        SCRIPT_CONFIG.libraries.workRecords,
        mappings.workRecords,
        EmployeeCalculationData.filters.selection,
        false
    );
    EmployeeCalculationData.addFilteredResult('workRecords', workRecordsFiltered.data);
    EmployeeCalculationData.filtered.workRecords.records = workRecordsFiltered.recordsTotal;

    var drivingLogFiltered = processLibraryData(
        EmployeeCalculationData.employee.entry,
        SCRIPT_CONFIG.libraries.drivingLog,
        mappings.drivingLog,
        EmployeeCalculationData.filters.selection,
        false
    );
    EmployeeCalculationData.addFilteredResult('drivingLog', drivingLogFiltered.data);
    EmployeeCalculationData.filtered.drivingLog.records = drivingLogFiltered.recordsTotal;

    var cashRegisterFiltered = processLibraryData(
        EmployeeCalculationData.employee.entry,
        SCRIPT_CONFIG.libraries.cashRegister,
        mappings.cashRegister,
        EmployeeCalculationData.filters.selection,
        false
    );
    EmployeeCalculationData.addFilteredResult('cashRegister', cashRegisterFiltered.data);
    EmployeeCalculationData.filtered.cashRegister.records = cashRegisterFiltered.recordsTotal;

    var receivablesFiltered = processLibraryData(
        EmployeeCalculationData.employee.entry,
        SCRIPT_CONFIG.libraries.receivables,
        mappings.receivables,
        EmployeeCalculationData.filters.selection,
        false
    );
    EmployeeCalculationData.addFilteredResult('receivables', receivablesFiltered.data);
    EmployeeCalculationData.filtered.receivables.records = receivablesFiltered.recordsTotal;

    var liabilitiesFiltered = processLibraryData(
        EmployeeCalculationData.employee.entry,
        SCRIPT_CONFIG.libraries.liabilities,
        mappings.liabilities,
        EmployeeCalculationData.filters.selection,
        false
    );
    EmployeeCalculationData.addFilteredResult('liabilities', liabilitiesFiltered.data);
    EmployeeCalculationData.filtered.liabilities.records = liabilitiesFiltered.recordsTotal;

    // Spracuj knižnice pre total údaje (používa total filter)
    var attendanceTotal = processAttendanceEarnings(EmployeeCalculationData.employee.entry, EmployeeCalculationData.filters.total, true);
    EmployeeCalculationData.addTotalResult('attendance', attendanceTotal);

    var workRecordsTotal = processLibraryData(
        EmployeeCalculationData.employee.entry,
        SCRIPT_CONFIG.libraries.workRecords,
        mappings.workRecords,
        EmployeeCalculationData.filters.total,
        true
    );
    EmployeeCalculationData.addTotalResult('workRecords', workRecordsTotal.data);
    EmployeeCalculationData.total.workRecords.records = workRecordsTotal.recordsTotal;

    var drivingLogTotal = processLibraryData(
        EmployeeCalculationData.employee.entry,
        SCRIPT_CONFIG.libraries.drivingLog,
        mappings.drivingLog,
        EmployeeCalculationData.filters.total,
        true
    );
    EmployeeCalculationData.addTotalResult('drivingLog', drivingLogTotal.data);
    EmployeeCalculationData.total.drivingLog.records = drivingLogTotal.recordsTotal;

    var cashRegisterTotal = processLibraryData(
        EmployeeCalculationData.employee.entry,
        SCRIPT_CONFIG.libraries.cashRegister,
        mappings.cashRegister,
        EmployeeCalculationData.filters.total,
        true
    );
    EmployeeCalculationData.addTotalResult('cashRegister', cashRegisterTotal.data);
    EmployeeCalculationData.total.cashRegister.records = cashRegisterTotal.recordsTotal;
}

function updateEmployeeFields() {
    var employeeEntry = EmployeeCalculationData.employee.entry;

    // Definuj všetky polia na aktualizáciu
    var fieldsToUpdate = [
        // Filtrované údaje (používa filter výber obdobia)
        ["Odpracované", EmployeeCalculationData.filtered.attendance.worked],
        ["Na zákazkách", EmployeeCalculationData.filtered.workRecords.worked],
        ["Jazdy", EmployeeCalculationData.filtered.drivingLog.hours],
        ["Zarobené", EmployeeCalculationData.filtered.attendance.earned],
        ["Vyplatené", EmployeeCalculationData.filtered.cashRegister.paid],

        // Total údaje (používa filter obdobie total)
        ["Odpracované total", EmployeeCalculationData.total.attendance.worked],
        ["Na zákazkách total", EmployeeCalculationData.total.workRecords.worked],
        ["Jazdy total", EmployeeCalculationData.total.drivingLog.hours],
        ["Zarobené total", EmployeeCalculationData.total.attendance.earned],
        ["Vyplatené total", EmployeeCalculationData.total.cashRegister.paid],

        // Financie (používajú filter výber obdobia)
        ["Pohľadávky", EmployeeCalculationData.filtered.receivables.amount],
        ["Záväzky", EmployeeCalculationData.filtered.liabilities.amount],
        ["Saldo", EmployeeCalculationData.calculated.balance],
        ["Preplatok/Nedoplatok", EmployeeCalculationData.calculated.paymentDifference],

        // Ostatné údaje
        ["Aktuálna hodinovka", EmployeeCalculationData.employee.currentHourlyRate]
    ];

    var savedFields = 0;
    for (var i = 0; i < fieldsToUpdate.length; i++) {
        try {
            core.safeSet(employeeEntry, fieldsToUpdate[i][0], fieldsToUpdate[i][1]);
            savedFields++;
        } catch (saveError) {
            utils.addError(employeeEntry, "Chyba pri uložení poľa '" + fieldsToUpdate[i][0] + "': " + saveError.toString(), "FieldUpdater");
            EmployeeCalculationData.statistics.errors++;
        }
    }

    EmployeeCalculationData.statistics.savedFields = savedFields;

    utils.addDebug(employeeEntry, "Uložených polí: " + savedFields + "/" + fieldsToUpdate.length, {
        scriptName: SCRIPT_CONFIG.name,
        scriptVersion: SCRIPT_CONFIG.version,
        moduleName: "FieldUpdater"
    });

    return savedFields === fieldsToUpdate.length;
}

function createInfoRecord() {
    var employeeEntry = EmployeeCalculationData.employee.entry;
    var summary = EmployeeCalculationData.getSummary();

    var infoData = {
        zamestnanec: summary.employee,
        filtre: summary.filters,
        odpracovanýČas: {
            odpracované: summary.totals.workedHours.toFixed(2) + "h",
            odpracovanéTotal: EmployeeCalculationData.total.attendance.worked.toFixed(2) + "h",
            naZákazkách: EmployeeCalculationData.filtered.workRecords.worked.toFixed(2) + "h",
            naZákazkáchTotal: EmployeeCalculationData.total.workRecords.worked.toFixed(2) + "h",
            jazdy: EmployeeCalculationData.filtered.drivingLog.hours.toFixed(2) + "h",
            jazdyTotal: EmployeeCalculationData.total.drivingLog.hours.toFixed(2) + "h"
        },
        mzdyAFinancie: {
            aktuálnaHodinovka: EmployeeCalculationData.employee.currentHourlyRate.toFixed(2) + " €/h",
            zarobené: summary.totals.earnedAmount.toFixed(2) + "€",
            zarobenéTotal: EmployeeCalculationData.total.attendance.earned.toFixed(2) + "€",
            vyplatené: summary.totals.paidAmount.toFixed(2) + "€",
            vyplaténeTotal: EmployeeCalculationData.total.cashRegister.paid.toFixed(2) + "€"
        },
        pohľadávkyAZáväzky: {
            pohľadávky: EmployeeCalculationData.filtered.receivables.amount.toFixed(2) + "€",
            záväzky: EmployeeCalculationData.filtered.liabilities.amount.toFixed(2) + "€",
            saldo: summary.totals.balance.toFixed(2) + "€"
        },
        výpočty: {
            preplatokNedoplatok: summary.totals.paymentDifference.toFixed(2) + "€",
            formulaPreplatok: "Zarobené - Vyplatené = " + summary.totals.earnedAmount.toFixed(2) + "€ - " + summary.totals.paidAmount.toFixed(2) + "€",
            formulaSaldo: "Pohľadávky - Záväzky = " + EmployeeCalculationData.filtered.receivables.amount.toFixed(2) + "€ - " + EmployeeCalculationData.filtered.liabilities.amount.toFixed(2) + "€"
        },
        štatistiky: {
            dochádzka: EmployeeCalculationData.filtered.attendance.records + " záznamov",
            záznamPrác: EmployeeCalculationData.filtered.workRecords.records + " záznamov",
            knihaJázd: EmployeeCalculationData.filtered.drivingLog.records + " záznamov",
            pohľadávky: EmployeeCalculationData.filtered.receivables.records + " záznamov",
            záväzky: EmployeeCalculationData.filtered.liabilities.records + " záznamov",
            pokladňa: EmployeeCalculationData.filtered.cashRegister.records + " záznamov (len Mzda + Mzda záloha)"
        }
    };

    try {
        core.addInfo(employeeEntry, "Prepočet zamestnanca dokončený", infoData, {
            scriptName: SCRIPT_CONFIG.name,
            scriptVersion: SCRIPT_CONFIG.version,
            moduleName: "EmployeeCalculator",
            sectionName: "Výsledok prepočtu"
        });

        utils.addDebug(employeeEntry, "Info záznam vytvorený", {
            scriptName: SCRIPT_CONFIG.name,
            scriptVersion: SCRIPT_CONFIG.version,
            moduleName: "InfoCreator"
        });

        return true;
    } catch (error) {
        utils.addError(employeeEntry, "Chyba pri vytváraní info záznamu: " + error.toString(), "InfoCreator");
        return false;
    }
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        // Inicializuj moduly
        initializeModules();

        // Nastav základné údaje
        EmployeeCalculationData.employee.entry = entry();

        utils.addDebug(EmployeeCalculationData.employee.entry, "Štart prepočtu zamestnanca", {
            scriptName: SCRIPT_CONFIG.name,
            scriptVersion: SCRIPT_CONFIG.version,
            moduleName: "Main"
        });

        // KROK 1: Získaj základné údaje zamestnanca
        var nick = core.safeGet(EmployeeCalculationData.employee.entry, "Nick");
        var firstName = core.safeGet(EmployeeCalculationData.employee.entry, "Meno", "");
        var lastName = core.safeGet(EmployeeCalculationData.employee.entry, "Priezvisko", "");
        var selectionPeriod = core.safeGet(EmployeeCalculationData.employee.entry, "výber obdobia", "");
        var totalPeriod = core.safeGet(EmployeeCalculationData.employee.entry, "obdobie total", "");

        if (!nick) {
            utils.addError(EmployeeCalculationData.employee.entry, "Nick je povinný identifikátor", "Validation");
            return false;
        }

        EmployeeCalculationData.employee.nick = nick;
        EmployeeCalculationData.employee.fullName = nick + " (" + firstName + " " + lastName + ")";

        utils.addDebug(EmployeeCalculationData.employee.entry, "Zamestnanec: " + EmployeeCalculationData.employee.fullName, {
            scriptName: SCRIPT_CONFIG.name,
            scriptVersion: SCRIPT_CONFIG.version,
            moduleName: "Main"
        });

        // KROK 2: Spracuj filtre
        EmployeeCalculationData.filters.selection = parseFilterDateRange(selectionPeriod);
        EmployeeCalculationData.filters.total = parseFilterDateRange(totalPeriod);

        if (!EmployeeCalculationData.filters.selection.isValid) {
            utils.addError(EmployeeCalculationData.employee.entry, "Neplatný filter 'výber obdobia': " + EmployeeCalculationData.filters.selection.reason, "FilterValidation");
            return false;
        }

        if (!EmployeeCalculationData.filters.total.isValid) {
            utils.addError(EmployeeCalculationData.employee.entry, "Neplatný filter 'obdobie total': " + EmployeeCalculationData.filters.total.reason, "FilterValidation");
            return false;
        }

        utils.addDebug(EmployeeCalculationData.employee.entry, "Filtre úspešne parsované", {
            scriptName: SCRIPT_CONFIG.name,
            scriptVersion: SCRIPT_CONFIG.version,
            moduleName: "FilterProcessor"
        });

        // KROK 3: Získaj aktuálnu hodinovku
        EmployeeCalculationData.employee.currentHourlyRate = getCurrentHourlyRate(EmployeeCalculationData.employee.entry);

        // KROK 4: Spracuj všetky knižnice
        processAllLibraries();

        // KROK 5: Vypočítaj finálne hodnoty
        EmployeeCalculationData.calculateFinalValues();

        // KROK 6: Aktualizuj polia zamestnanca
        var updateSuccess = updateEmployeeFields();

        // KROK 7: Vytvor info záznam
        var infoSuccess = createInfoRecord();

        // KROK 8: Finálny debug
        var summary = EmployeeCalculationData.getSummary();
        utils.addDebug(EmployeeCalculationData.employee.entry, "Prepočet dokončený úspešne", {
            scriptName: SCRIPT_CONFIG.name,
            scriptVersion: SCRIPT_CONFIG.version,
            moduleName: "Main",
            sectionName: "Finálny report"
        });

        return updateSuccess && infoSuccess;

    } catch (error) {
        utils.addError(entry(), "Kritická chyba v main(): " + error.toString(), "Main");
        return false;
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

main();