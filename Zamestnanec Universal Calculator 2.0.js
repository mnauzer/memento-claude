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

// Jednoduché import všetkého cez MementoUtils (rovnako ako Dochádzka Prepočet)
var utils = MementoUtils;
var config = utils.getConfig();
var centralConfig = utils.config;
var core = MementoCore;
var business = MementoBusiness;
var currentEntry = entry();

// ==============================================
// SCRIPT KONFIGURÁCIA
// ==============================================

var CONFIG = {
    // Script špecifické nastavenia
    scriptName: "Zamestnanec Universal Calculator",
    version: "2.0",

    // Referencie na centrálny config
    fields: centralConfig.fields,
    libraries: centralConfig.libraries,
    icons: centralConfig.icons,

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
        cashRegister: { paid: 0, premium: 0, records: 0 },
        receivables: { amount: 0, records: 0 },
        liabilities: { amount: 0, records: 0 }
    },

    // Výsledky spracovaných knižníc - TOTAL údaje
    total: {
        attendance: { worked: 0, earned: 0, records: 0 },
        workRecords: { worked: 0, records: 0 },
        drivingLog: { hours: 0, records: 0 },
        cashRegister: { paid: 0, premium: 0, records: 0 }
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
    utils.addDebug(currentEntry, "📅 Parsovanie dátumového filtra: '" + filterText + "'", "filter");

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
        utils.addDebug(currentEntry, "✅ Rozpoznaný textový filter: " + cleanFilter, "success");
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
        utils.addDebug(employeeEntry, "🗃️ Spracovanie knižnice: " + libraryName + " (" + (isTotal ? "TOTAL" : "FILTERED") + ")", "database");

        // Získaj záznamy cez utils.safeGetLinksTo (opravená funkcia)
        var linksFromField = fieldMappings.linksFromField;
        var records = utils.safeGetLinksTo(employeeEntry, libraryName, linksFromField);

        if (!records || records.length === 0) {
            utils.addDebug(employeeEntry, "⚠️ Žiadne záznamy v knižnici " + libraryName, "warning");
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
                var dateValue = utils.safeGet(record, fieldMappings.dateField);

                // OPRAVENÉ: Používaj správny filter podľa typu
                var shouldInclude = dateMatchesFilter(dateValue, filter);

                if (shouldInclude) {
                    // Spracuj všetky nakonfigurované polia
                    for (var fieldKey in fieldMappings.dataFields) {
                        var fieldName = fieldMappings.dataFields[fieldKey];
                        var fieldValue = utils.safeGet(record, fieldName, 0);

                        // Špeciálne spracovanie pre pokladňa (výdavky)
                        if (libraryName === CONFIG.libraries.cashBook) {
                            var purpose = utils.safeGet(record, "Účel výdaja", "");
                            var recordType = utils.safeGet(record, "Typ", ""); // Príjem/Výdavok

                            // Spracovávaj len výdavky
                            if (recordType !== "Výdavok") {
                                continue;
                            }

                            // Pre pole "paid" (vyplatené) - len Mzda a Mzda záloha
                            if (fieldKey === "paid") {
                                if (purpose !== "Mzda" && purpose !== "Mzda záloha") {
                                    continue; // Preskočiť tento záznam pre vyplatené
                                }
                            }

                            // Pre pole "premium" (prémie) - len Mzda prémia
                            if (fieldKey === "premium") {
                                if (purpose !== "Mzda prémia") {
                                    continue; // Preskočiť tento záznam pre prémie
                                }
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

        utils.addDebug(employeeEntry, "📊 Spracovaných záznamov: " + result.recordsProcessed + "/" + result.recordsTotal, "calculation");

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
            linksFromField: CONFIG.fields.attendance.employees,
            dateField: CONFIG.fields.attendance.date,
            dataFields: {
                worked: CONFIG.fields.attendance.workTime,
                // earned sa počíta z atribútu "denná mzda"
            }
        },
        workRecords: {
            linksFromField: CONFIG.fields.workRecord.employees,
            dateField: CONFIG.fields.workRecord.date,
            dataFields: {
                worked: CONFIG.fields.workRecord.workTime
            }
        },
        drivingLog: {
            linksFromField: CONFIG.fields.rideLog.crew,
            dateField: CONFIG.fields.rideLog.date,
            dataFields: {
                hours: CONFIG.fields.rideLog.totalTime
            }
        },
        cashRegister: {
            linksFromField: "Zamestnanec", // Pole v knižnici Pokladňa
            dateField: CONFIG.fields.cashBook.date,
            dataFields: {
                paid: CONFIG.fields.cashBook.amount,
                premium: CONFIG.fields.cashBook.amount
            }
        },
        receivables: {
            linksFromField: "Zamestnanec", // Pole v knižnici Pohľadávky
            dateField: CONFIG.fields.receivables.date,
            dataFields: {
                amount: CONFIG.fields.receivables.balance // Zostatok namiesto remainingAmount
            }
        },
        liabilities: {
            linksFromField: "Zamestnanec", // Pole v knižnici Záväzky
            dateField: CONFIG.fields.obligations.date,
            dataFields: {
                amount: CONFIG.fields.obligations.balance // Zostatok namiesto remainingAmount
            }
        }
    };
}

// ==============================================
// ZÍSKANIE AKTUÁLNEJ HODINOVKY
// ==============================================

function getCurrentHourlyRate(employeeEntry) {
    utils.addDebug(employeeEntry, "💰 Výpočet aktuálnej hodinovky", "money");

    try {
        // Použij utils.findValidHourlyRate (opravená funkcia)
        var hodinovka = utils.findValidHourlyRate(employeeEntry, new Date());

        if (!hodinovka || hodinovka <= 0) {
            utils.addDebug(employeeEntry, "⚠️ Nenájdená platná sadzba pre zamestnanca", "warning");
            return 0;
        }

        utils.addDebug(employeeEntry, "✅ Aktuálna hodinovka: " + hodinovka + " €/h", "money");
        return parseFloat(hodinovka).toFixed(2);

    } catch (error) {
        utils.addError(employeeEntry, "Chyba pri získavaní hodinovky: " + error.toString(), "getCurrentHourlyRate");
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
        var attendanceRecords = utils.safeGetLinksTo(employeeEntry, CONFIG.libraries.attendance, CONFIG.fields.attendance.employees);

        if (!attendanceRecords || attendanceRecords.length === 0) {
            return result;
        }

        result.recordsTotal = attendanceRecords.length;

        for (var i = 0; i < attendanceRecords.length; i++) {
            try {
                var record = attendanceRecords[i];
                var dateValue = utils.safeGet(record, CONFIG.fields.attendance.date);
                var workedHours = utils.safeGet(record, CONFIG.fields.attendance.workTime, 0);

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
        CONFIG.libraries.workRecords,
        mappings.workRecords,
        EmployeeCalculationData.filters.selection,
        false
    );
    EmployeeCalculationData.addFilteredResult('workRecords', workRecordsFiltered.data);
    EmployeeCalculationData.filtered.workRecords.records = workRecordsFiltered.recordsTotal;

    var drivingLogFiltered = processLibraryData(
        EmployeeCalculationData.employee.entry,
        CONFIG.libraries.rideLog,
        mappings.drivingLog,
        EmployeeCalculationData.filters.selection,
        false
    );
    EmployeeCalculationData.addFilteredResult('drivingLog', drivingLogFiltered.data);
    EmployeeCalculationData.filtered.drivingLog.records = drivingLogFiltered.recordsTotal;

    var cashRegisterFiltered = processLibraryData(
        EmployeeCalculationData.employee.entry,
        CONFIG.libraries.cashBook,
        mappings.cashRegister,
        EmployeeCalculationData.filters.selection,
        false
    );
    EmployeeCalculationData.addFilteredResult('cashRegister', cashRegisterFiltered.data);
    EmployeeCalculationData.filtered.cashRegister.records = cashRegisterFiltered.recordsTotal;

    var receivablesFiltered = processLibraryData(
        EmployeeCalculationData.employee.entry,
        CONFIG.libraries.receivables,
        mappings.receivables,
        EmployeeCalculationData.filters.selection,
        false
    );
    EmployeeCalculationData.addFilteredResult('receivables', receivablesFiltered.data);
    EmployeeCalculationData.filtered.receivables.records = receivablesFiltered.recordsTotal;

    var liabilitiesFiltered = processLibraryData(
        EmployeeCalculationData.employee.entry,
        CONFIG.libraries.obligations,
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
        CONFIG.libraries.workRecords,
        mappings.workRecords,
        EmployeeCalculationData.filters.total,
        true
    );
    EmployeeCalculationData.addTotalResult('workRecords', workRecordsTotal.data);
    EmployeeCalculationData.total.workRecords.records = workRecordsTotal.recordsTotal;

    var drivingLogTotal = processLibraryData(
        EmployeeCalculationData.employee.entry,
        CONFIG.libraries.rideLog,
        mappings.drivingLog,
        EmployeeCalculationData.filters.total,
        true
    );
    EmployeeCalculationData.addTotalResult('drivingLog', drivingLogTotal.data);
    EmployeeCalculationData.total.drivingLog.records = drivingLogTotal.recordsTotal;

    var cashRegisterTotal = processLibraryData(
        EmployeeCalculationData.employee.entry,
        CONFIG.libraries.cashBook,
        mappings.cashRegister,
        EmployeeCalculationData.filters.total,
        true
    );
    EmployeeCalculationData.addTotalResult('cashRegister', cashRegisterTotal.data);
    EmployeeCalculationData.total.cashRegister.records = cashRegisterTotal.recordsTotal;
}

function updateEmployeeFields() {
    var employeeEntry = EmployeeCalculationData.employee.entry;

    // Definuj všetky polia na aktualizáciu s zaokrúhľovaním
    var fieldsToUpdate = [
        // Filtrované údaje (používa filter výber obdobia) - zaokrúhliť na 2 desatinné miesta
        ["Odpracované", parseFloat(EmployeeCalculationData.filtered.attendance.worked).toFixed(2)],
        ["Na zákazkách", parseFloat(EmployeeCalculationData.filtered.workRecords.worked).toFixed(2)],
        ["Jazdy", parseFloat(EmployeeCalculationData.filtered.drivingLog.hours).toFixed(2)],
        ["Zarobené", parseFloat(EmployeeCalculationData.filtered.attendance.earned).toFixed(2)],
        ["Vyplatené", parseFloat(EmployeeCalculationData.filtered.cashRegister.paid).toFixed(2)],
        ["Prémie", parseFloat(EmployeeCalculationData.filtered.cashRegister.premium).toFixed(2)],

        // Total údaje (používa filter obdobie total) - zaokrúhliť na 2 desatinné miesta
        ["Odpracované total", parseFloat(EmployeeCalculationData.total.attendance.worked).toFixed(2)],
        ["Na zákazkách total", parseFloat(EmployeeCalculationData.total.workRecords.worked).toFixed(2)],
        ["Jazdy total", parseFloat(EmployeeCalculationData.total.drivingLog.hours).toFixed(2)],
        ["Zarobené total", parseFloat(EmployeeCalculationData.total.attendance.earned).toFixed(2)],
        ["Vyplatené total", parseFloat(EmployeeCalculationData.total.cashRegister.paid).toFixed(2)],
        ["Prémie total", parseFloat(EmployeeCalculationData.total.cashRegister.premium).toFixed(2)],

        // Financie (používajú filter výber obdobia) - zaokrúhliť na 2 desatinné miesta
        ["Pohľadávky", parseFloat(EmployeeCalculationData.filtered.receivables.amount).toFixed(2)],
        ["Záväzky", parseFloat(EmployeeCalculationData.filtered.liabilities.amount).toFixed(2)],
        ["Saldo", parseFloat(EmployeeCalculationData.calculated.balance).toFixed(2)],
        ["Preplatok/Nedoplatok", parseFloat(EmployeeCalculationData.calculated.paymentDifference).toFixed(2)],

        // Ostatné údaje
        ["Aktuálna hodinovka", EmployeeCalculationData.employee.currentHourlyRate]
    ];

    var savedFields = 0;
    for (var i = 0; i < fieldsToUpdate.length; i++) {
        try {
            utils.safeSet(employeeEntry, fieldsToUpdate[i][0], fieldsToUpdate[i][1]);
            savedFields++;
        } catch (saveError) {
            utils.addError(employeeEntry, "Chyba pri uložení poľa '" + fieldsToUpdate[i][0] + "': " + saveError.toString(), "FieldUpdater");
            EmployeeCalculationData.statistics.errors++;
        }
    }

    EmployeeCalculationData.statistics.savedFields = savedFields;

    utils.addDebug(employeeEntry, "💾 Uložených polí: " + savedFields + "/" + fieldsToUpdate.length, "success");

    return savedFields === fieldsToUpdate.length;
}

function createInfoRecord() {
    try {
        var employeeEntry = EmployeeCalculationData.employee.entry;
        var summary = EmployeeCalculationData.getSummary();

        // Štýl ako Dochádzka Prepočet - priamy formát
        var infoMessage = "📋 ZAMESTNANEC - PREPOČET DOKONČENÝ\n";
        infoMessage += "═══════════════════════════════════════\n";

        infoMessage += "👤 Zamestnanec: " + summary.employee + "\n";
        infoMessage += "🔍 Filter (filtrované): " + summary.filters.selection + "\n";
        infoMessage += "🔍 Filter (total): " + summary.filters.total + "\n\n";

        infoMessage += "📊 ODPRACOVANÝ ČAS:\n";
        infoMessage += "───────────────────────────────────\n";
        infoMessage += "• Odpracované: " + summary.totals.workedHours.toFixed(2) + "h\n";
        infoMessage += "• Odpracované total: " + EmployeeCalculationData.total.attendance.worked.toFixed(2) + "h\n";
        infoMessage += "• Na zákazkách: " + EmployeeCalculationData.filtered.workRecords.worked.toFixed(2) + "h\n";
        infoMessage += "• Na zákazkách total: " + EmployeeCalculationData.total.workRecords.worked.toFixed(2) + "h\n";
        infoMessage += "• Jazdy: " + EmployeeCalculationData.filtered.drivingLog.hours.toFixed(2) + "h\n";
        infoMessage += "• Jazdy total: " + EmployeeCalculationData.total.drivingLog.hours.toFixed(2) + "h\n\n";

        infoMessage += "💰 MZDY A FINANCIE:\n";
        infoMessage += "───────────────────────────────────\n";
        infoMessage += "• Aktuálna hodinovka: " + parseFloat(EmployeeCalculationData.employee.currentHourlyRate).toFixed(2) + " €/h\n";
        infoMessage += "• Zarobené: " + parseFloat(summary.totals.earnedAmount).toFixed(2) + "€\n";
        infoMessage += "• Zarobené total: " + parseFloat(EmployeeCalculationData.total.attendance.earned).toFixed(2) + "€\n";
        infoMessage += "• Vyplatené: " + parseFloat(summary.totals.paidAmount).toFixed(2) + "€\n";
        infoMessage += "• Vyplatené total: " + parseFloat(EmployeeCalculationData.total.cashRegister.paid).toFixed(2) + "€\n";
        infoMessage += "• Prémie: " + parseFloat(EmployeeCalculationData.filtered.cashRegister.premium).toFixed(2) + "€\n";
        infoMessage += "• Prémie total: " + parseFloat(EmployeeCalculationData.total.cashRegister.premium).toFixed(2) + "€\n\n";

        infoMessage += "📈 POHĽADÁVKY A ZÁVÄZKY (filter: výber obdobia):\n";
        infoMessage += "───────────────────────────────────\n";
        infoMessage += "• Pohľadávky (zostatok): " + parseFloat(EmployeeCalculationData.filtered.receivables.amount).toFixed(2) + "€\n";
        infoMessage += "• Záväzky (zostatok): " + parseFloat(EmployeeCalculationData.filtered.liabilities.amount).toFixed(2) + "€\n";
        infoMessage += "• Saldo = Pohľadávky - Záväzky: " + parseFloat(summary.totals.balance).toFixed(2) + "€\n\n";

        infoMessage += "🧮 VÝPOČTY:\n";
        infoMessage += "───────────────────────────────────\n";
        infoMessage += "• Preplatok/Nedoplatok = Zarobené - Vyplatené\n";
        infoMessage += "• " + parseFloat(summary.totals.earnedAmount).toFixed(2) + "€ - " + parseFloat(summary.totals.paidAmount).toFixed(2) + "€ = " + parseFloat(summary.totals.paymentDifference).toFixed(2) + "€\n";
        infoMessage += "• Saldo = Pohľadávky - Záväzky (používa filter 'výber obdobia')\n";
        infoMessage += "• " + parseFloat(EmployeeCalculationData.filtered.receivables.amount).toFixed(2) + "€ - " + parseFloat(EmployeeCalculationData.filtered.liabilities.amount).toFixed(2) + "€ = " + parseFloat(summary.totals.balance).toFixed(2) + "€\n\n";

        infoMessage += "📊 ŠTATISTIKY ZÁZNAMOV:\n";
        infoMessage += "───────────────────────────────────\n";
        infoMessage += "• Dochádzka: " + (EmployeeCalculationData.filtered.attendance.records || 0) + " záznamov\n";
        infoMessage += "• Záznam prác: " + (EmployeeCalculationData.filtered.workRecords.records || 0) + " záznamov\n";
        infoMessage += "• Kniha jázd: " + (EmployeeCalculationData.filtered.drivingLog.records || 0) + " záznamov\n";
        infoMessage += "• Pohľadávky: " + (EmployeeCalculationData.filtered.receivables.records || 0) + " záznamov\n";
        infoMessage += "• Záväzky: " + (EmployeeCalculationData.filtered.liabilities.records || 0) + " záznamov\n";
        infoMessage += "• Pokladňa (vyplatené): " + (EmployeeCalculationData.filtered.cashRegister.records || 0) + " záznamov (len Mzda + Mzda záloha)\n";
        infoMessage += "• Pokladňa (prémie): záznamy s 'Mzda prémia'\n\n";

        infoMessage += "🔧 TECHNICKÉ INFO:\n";
        infoMessage += "• Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        infoMessage += "• Čas spracovania: " + moment().format("HH:mm:ss") + "\n";
        infoMessage += "• MementoUtils: v" + (utils.version || "N/A") + "\n";

        if (typeof MementoConfig !== 'undefined') {
            infoMessage += "• MementoConfig: v" + MementoConfig.version + "\n";
        }

        infoMessage += "\n✅ PREPOČET DOKONČENÝ ÚSPEŠNE";

        utils.safeSet(employeeEntry, CONFIG.fields.common.info, infoMessage);

        utils.addDebug(employeeEntry, "✅ Info záznam vytvorený", "success");

        return true;
    } catch (error) {
        utils.addError(employeeEntry, "Chyba pri vytváraní info záznamu: " + error.toString(), "createInfoRecord");
        return false;
    }
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        // Nastav základné údaje
        EmployeeCalculationData.employee.entry = currentEntry;

        utils.addDebug(currentEntry, "=== ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===", "start");
        utils.addDebug(currentEntry, "Čas spustenia: " + utils.formatDate(moment()), "calendar");

        // KROK 1: Získaj základné údaje zamestnanca
        utils.addDebug(currentEntry, " KROK 1: Načítanie základných údajov", "validation");

        var nick = utils.safeGet(currentEntry, "Nick");
        var firstName = utils.safeGet(currentEntry, "Meno", "");
        var lastName = utils.safeGet(currentEntry, "Priezvisko", "");
        var selectionPeriod = utils.safeGet(currentEntry, "výber obdobia", "");
        var totalPeriod = utils.safeGet(currentEntry, "obdobie total", "");

        if (!nick) {
            utils.addError(currentEntry, "Nick je povinný identifikátor", CONFIG.scriptName);
            return false;
        }

        EmployeeCalculationData.employee.nick = nick;
        EmployeeCalculationData.employee.fullName = nick + " (" + firstName + " " + lastName + ")";

        utils.addDebug(currentEntry, "👤 Zamestnanec: " + EmployeeCalculationData.employee.fullName, "person");
        utils.addDebug(currentEntry, "🔍 Výber obdobia: '" + selectionPeriod + "'", "filter");
        utils.addDebug(currentEntry, "🔍 Obdobie total: '" + totalPeriod + "'", "filter");

        // KROK 2: Spracuj filtre
        utils.addDebug(currentEntry, " KROK 2: Parsovanie dátumových filtrov", "step");

        EmployeeCalculationData.filters.selection = parseFilterDateRange(selectionPeriod);
        EmployeeCalculationData.filters.total = parseFilterDateRange(totalPeriod);

        if (!EmployeeCalculationData.filters.selection.isValid) {
            utils.addError(currentEntry, "Neplatný filter 'výber obdobia': " + EmployeeCalculationData.filters.selection.reason, CONFIG.scriptName);
            return false;
        }

        if (!EmployeeCalculationData.filters.total.isValid) {
            utils.addError(currentEntry, "Neplatný filter 'obdobie total': " + EmployeeCalculationData.filters.total.reason, CONFIG.scriptName);
            return false;
        }

        utils.addDebug(currentEntry, "✅ Filter pre filtrované úspešne parsovaný: " + EmployeeCalculationData.filters.selection.popis, "success");
        utils.addDebug(currentEntry, "✅ Filter pre total úspešne parsovaný: " + EmployeeCalculationData.filters.total.popis, "success");

        // KROK 3: Získaj aktuálnu hodinovku
        utils.addDebug(currentEntry, " KROK 3: Výpočet aktuálnej hodinovky", "step");
        EmployeeCalculationData.employee.currentHourlyRate = getCurrentHourlyRate(currentEntry);

        // KROK 4: Spracuj všetky knižnice
        utils.addDebug(currentEntry, " KROK 4: Spracovanie všetkých knižníc", "step");
        processAllLibraries();

        // KROK 5: Vypočítaj finálne hodnoty
        utils.addDebug(currentEntry, " KROK 5: Výpočet finálnych hodnôt", "step");
        EmployeeCalculationData.calculateFinalValues();

        // KROK 6: Aktualizuj polia zamestnanca
        utils.addDebug(currentEntry, " KROK 6: Aktualizácia polí zamestnanca", "step");
        var updateSuccess = updateEmployeeFields();

        // KROK 7: Vytvor info záznam
        utils.addDebug(currentEntry, " KROK 7: Vytvorenie info záznamu", "step");
        var infoSuccess = createInfoRecord();

        // KROK 8: Finálny debug
        utils.addDebug(currentEntry, "=== PREPOČET DOKONČENÝ ÚSPEŠNE ===", "success");
        utils.addDebug(currentEntry, "📊 Celkovo spracovaných knižníc: 6", "summary");
        var summary = EmployeeCalculationData.getSummary();
        utils.addDebug(currentEntry, "💰 Finálne hodnoty: Saldo=" + summary.totals.balance.toFixed(2) + "€, Preplatok/Nedoplatok=" + summary.totals.paymentDifference.toFixed(2) + "€", "summary");

        return updateSuccess && infoSuccess;

    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v main(): " + error.toString(), CONFIG.scriptName);
        return false;
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

main();