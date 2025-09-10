
// ==============================================
// DOCHÁDZKA PREPOČET - AUTOMATICKÝ VÝPOČET
// Verzia: 7.3 | Dátum: August 2025 | Autor: ASISTANTO
// Knižnica: Dochádzka | Trigger: Before Save
// ==============================================
// 📋 FUNKCIA:
//    - Automatický výpočet odpracovaných hodín
//    - Výpočet prestávok podľa pracovnej doby
//    - Výpočet mzdových nákladov pre všetkých zamestnancov
//    - Kontrola víkendov a sviatkov
//    - Prepočet prestojov (rozdiel medzi odpracovaným a na zákazkách)
//    - Nastavenie atribútov na zamestnancoch
// ==============================================

// ==============================================
// INICIALIZÁCIA MODULOV
// ==============================================


// Jednoduchý import všetkého cez MementoUtils
var utils = MementoUtils;
var config = utils.getConfig();
var centralConfig = utils.config;
var currentEntry = entry();
var CONFIG = {
    // Script špecifické nastavenia
    scriptName: "Dochádzka Prepočet",
    version: "7.4.4",  // Aktualizovaná verzia
    
    // Referencie na centrálny config
    fields: {
        place: centralConfig.fields.place,
        vehicle: centralConfig.fields.vehicle,
        bookOfRides: centralConfig.fields.bookOfRides,
        account: centralConfig.fields.account,
        notifications: centralConfig.fields.notifications,
        rideLog: centralConfig.fields.rideLog,
        cashBook: centralConfig.fields.cashBook,
        workRecord: centralConfig.fields.workRecord,
        attendance: centralConfig.fields.attendance,
        obligations: centralConfig.fields.obligations,
        common: centralConfig.fields.common,
        // Pridané mapovanie pre arrival/departure polia
        date: centralConfig.fields.attendance.date,
        employees: centralConfig.fields.attendance.employees,
        arrival: centralConfig.fields.attendance.arrival,      // "Príchod"
        departure: centralConfig.fields.attendance.departure,  // "Odchod"
        pracovnaDoba: centralConfig.fields.attendance.workTime, // "Pracovná doba"
        odpracovane: centralConfig.fields.attendance.workedHours, // "Odpracované"
        pocetPracovnikov: centralConfig.fields.attendance.employeeCount, // "Počet pracovníkov"
        info: centralConfig.fields.common.info
    },
    attributes: centralConfig.fields.attendance.employeeAttributes, 
    libraries: centralConfig.libraries,
    icons: centralConfig.icons,
    
    // Lokálne nastavenia pre tento script
    settings: {
        roundToQuarterHour: true,  // VYPNUTÉ - ako quickfix!
        roundDirection: "nearest", // "up", "down", "nearest"
        includeBreaks: true,
        breakThreshold: 6, // hodín
        breakDuration: 30  // minút
    },

     // Konštanty pre záväzky
    obligationTypes: {
        wages: centralConfig.constants.obligationTypes.wages
    },
    obligationStates: {
        paid: centralConfig.constants.obligationStates.paid,
        unpaid: centralConfig.constants.obligationStates.unpaid,
        partiallyPaid: centralConfig.constants.obligationStates.partiallyPaid
    },
    
    // Správne mapovanie pre sadzby
    sadzbyFields: centralConfig.fields.wages
};

function validateInputData() {
    try {
               
        // Definuj povinné polia
        var requiredFields = [
            CONFIG.fields.attendance.date,
            CONFIG.fields.attendance.arrival,
            CONFIG.fields.attendance.departure,
            CONFIG.fields.attendance.employees
        ];
        
        // Validuj povinné polia
        if (!utils.validateRequiredFields(currentEntry, requiredFields)) {
            return { success: false, error: "Chýbajú povinné polia" };
        }
        
        // Získaj hodnoty
        var date = utils.safeGet(currentEntry, CONFIG.fields.attendance.date);
        var arrival = utils.safeGet(currentEntry, CONFIG.fields.attendance.arrival);
        var departure = utils.safeGet(currentEntry, CONFIG.fields.attendance.departure);
        var employees = utils.safeGet(currentEntry, CONFIG.fields.attendance.employees);
        
        // Dodatočné kontroly
        if (!date) {
            return { success: false, error: "Dátum nie je vyplnený" };
        }
        
        if (!arrival || !departure) {
            return { success: false, error: "Príchod alebo odchod nie je vyplnený" };
        }
        
        if (!employees || employees.length === 0) {
            return { success: false, error: "Žiadni zamestnanci v zázname" };
        }
        
        utils.addDebug(currentEntry, "  • Dátum: " + moment(date).format("DD.MM.YYYY") + " (" + utils.getDayNameSK(moment(date).day()).toUpperCase() + ")");
        utils.addDebug(currentEntry, "  • Čas: " + moment(arrival).format("HH:mm") + " - " + moment(departure).format("HH:mm"));
        utils.addDebug(currentEntry, "  • Počet zamestnancov: " + employees.length);
        utils.addDebug(currentEntry, " Validácia úspešná", "success");
        return {
            success: true,
            date: date,
            arrival: arrival,
            departure: departure,
            employees: employees
        };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "validateInputData", error);
        return { success: false, error: error.toString() };
    }
}

function calculateWorkTime(arrival, departure) {
    try {
        utils.addDebug(currentEntry, "  Výpočet pracovnej doby", "calculation");
        
        // Spracuj časy cez nové funkcie
        var arrivalParsed = utils.parseTimeInput(arrival);
        var departureParsed = utils.parseTimeInput(departure);
        
        if (!arrivalParsed || !departureParsed) {
            return { success: false, error: "Nepodarilo sa spracovať časy" };
        }
        
        // Zaokrúhli časy ak je to povolené
        var arrivalFinal = arrivalParsed;
        var departureFinal = departureParsed;
        
        if (CONFIG.settings.roundToQuarterHour) {
            arrivalFinal = utils.roundTimeToQuarter(arrivalParsed); // Príchod zaokrúhli  
            departureFinal = utils.roundTimeToQuarter(departureParsed); // Odchod zaokrúhli
            
            utils.addDebug(currentEntry, "  Zaokrúhlenie aktivované:", "round");
            utils.addDebug(currentEntry, "  • Príchod: " + utils.formatTime(arrivalParsed) + " → " + utils.formatTime(arrivalFinal));
            utils.addDebug(currentEntry, "  • Odchod: " + utils.formatTime(departureParsed) + " → " + utils.formatTime(departureFinal));
            utils.safeSet(currentEntry, CONFIG.fields.attendance.arrival, arrivalFinal.toDate());
            utils.safeSet(currentEntry, CONFIG.fields.attendance.departure, departureFinal.toDate()); 
        }
        
        // Výpočet hodín s novými časmi
        var workHours = utils.calculateWorkHours(arrivalFinal, departureFinal);
        
        if (!workHours || workHours.error) {
            return { success: false, error: workHours ? workHours.error : "Nepodarilo sa vypočítať hodiny" };
        }
        
        var pracovnaDobaHodiny = workHours.totalMinutes / 60;
        pracovnaDobaHodiny = Math.round(pracovnaDobaHodiny * 100) / 100;
        
        // Ulož do poľa
        utils.safeSet(currentEntry, CONFIG.fields.attendance.workTime, pracovnaDobaHodiny);
        
        utils.addDebug(currentEntry, "  • Pracovná doba: " + pracovnaDobaHodiny + " hodín");
        
        return {
            success: true,
            arrivalRounded: arrivalFinal,
            departureRounded: departureFinal,
            arrivalOriginal: arrivalParsed,
            departureOriginal: departureParsed,
            pracovnaDobaHodiny: pracovnaDobaHodiny,
            workHours: workHours
        };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "calculateWorkTime", error);
        return { success: false, error: error.toString() };
    }
}
// ==============================================
// KROK 3: SPRACOVANIE ZAMESTNANCOV
// ==============================================

function processEmployees(zamestnanci, pracovnaDobaHodiny, datum) {

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
            totalAmount: 0,
            obligationSuccess: false

        };
              // Nájdi existujúce záväzky pre túto dochádzku
        var existingObligations = utils.findLinkedObligations('attendance');
        utils.addDebug(currentEntry, utils.getIcon("document") + "  Nájdené existujúce záväzky: " + existingObligations.length);  
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
            var empResult = processEmployee(zamestnanec, pracovnaDobaHodiny, datum, i, existingObligations);
            
            if (empResult.success) {
                result.odpracovaneTotal += pracovnaDobaHodiny;
                result.celkoveMzdy += empResult.dennaMzda;
                result.detaily.push(empResult);
                result.success = true;
                result.created += empResult.created;
                result.updated += empResult.updated;
                result.totalAmount += empResult.totalAmount;
                result.obligationSuccess = empResult.obligationSuccess;
            } else {
                result.success = false;
            }
            
        }
        utils.addDebug(currentEntry,utils.getIcon("note") +  "  Záväzky z tohto záznamu:");
        utils.addDebug(currentEntry,utils.getIcon("checkmark") + "    Vytvorené: " + result.created);
        utils.addDebug(currentEntry,utils.getIcon("update") +  "    Aktualizované: " + result.updated);
        utils.addDebug(currentEntry,utils.getIcon("money") +  "    Celková suma: " + utils.formatMoney(result.totalAmount));
        return result;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "processEmployees", error);
        return { success: false };
    }
}

function processEmployee(zamestnanec, pracovnaDobaHodiny, datum, index, obligations) {
    try {
        // Nájdi platnú hodinovku
        var hodinovka = utils.findValidSalary(currentEntry, zamestnanec, datum);
        
        if (!hodinovka || hodinovka <= 0) {
            utils.addDebug(currentEntry, "  ❌ Preskakujem - nemá platnú sadzbu");
            return { success: false };
        }
        
        var zamArray = currentEntry.field(CONFIG.fields.attendance.employees);
        
        if (zamArray && zamArray.length > index && zamArray[index]) {
            // Nastav atribúty pomocou .attr() metódy
            zamArray[index].setAttr(CONFIG.attributes.workedHours, pracovnaDobaHodiny);
            zamArray[index].setAttr(CONFIG.attributes.hourlyRate, hodinovka);
            
            // Získaj príplatky
            var priplatok = zamArray[index].attr(CONFIG.attributes.bonus) || 0;
            var premia = zamArray[index].attr(CONFIG.attributes.premium) || 0;
            var pokuta = zamArray[index].attr(CONFIG.attributes.penalty) || 0;
            
            // Vypočítaj dennú mzdu
            var dennaMzda = (pracovnaDobaHodiny * (hodinovka + priplatok)) + premia - pokuta;
            dennaMzda = Math.round(dennaMzda * 100) / 100;
            
            // Nastav dennú mzdu atribút sa nastavuje .setAtt("pole", hodnot)
            zamArray[index].setAttr(CONFIG.attributes.dailyWage, dennaMzda);
            
            utils.addDebug(currentEntry, "  • Denná mzda: " + dennaMzda + " €");
            
            // Spracuj záväzky
            var obligationResult = processObligation(datum, {
                entry: zamestnanec,
                dailyWage: dennaMzda,
                name: utils.formatEmployeeName(zamestnanec),
            }, obligations);
                
            utils.addDebug(currentEntry, "Spracované úspešne", "success");
            return {
                success: true,
                hodinovka: hodinovka,
                dennaMzda: dennaMzda,
                priplatok: priplatok,
                premia: premia,
                pokuta: pokuta,
                zamestnanec: zamestnanec,  // Pridané pre info záznam
                created: obligationResult.created,
                updated: obligationResult.updated,
                totalAmount: obligationResult.totalAmount,
                errors: obligationResult.errors,
                total: obligationResult.total,
                obligationResult: obligationResult
                
            };
        } else {
            utils.addError(currentEntry, "Nepodarilo sa získať zamesnanca na indexe " + index, "processEmployee");
            return { success: false };
        }
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "processEmployee", error);
        return { success: false };
    }
}

function processObligation(date, empData, obligations) {
    var employee = empData.entry;
    var result = {
        created: 0,
        updated: 0,
        errors: 0,
        total: 0,
        totalAmount: 0,
        success: false
    };
   
    try {
        utils.addDebug(currentEntry, utils.getIcon("search") +
        " Hľadám záväzok " + utils.formatEmployeeName(employee));
        try {
            // Nájdi existujúci záväzok pre tohto zamestnanca
            var existingObligation = null;
            for (var j = 0; j < obligations.length; j++) {
                var obligation = obligations[j];
                var linkedEmployee = utils.safeGetLinks(obligation, CONFIG.fields.obligations.employee);
          
                if (linkedEmployee && linkedEmployee.length > 0 && 
                    linkedEmployee[0].field("ID") === employee.field("ID")) {
                        utils.addDebug(currentEntry, utils.getIcon("exclamation") + "nájdený záväzok" )
                        existingObligation = obligation;
                    break;
                }
            }

            if (existingObligation) {
                // Aktualizuj existujúci
                if (utils.updateObligation(date, existingObligation, empData.dailyWage)) {
                    result.updated++;
                    result.totalAmount += empData.dailyWage;
                } else {
                    result.errors++;
                }
            } else {
                // Vytvor nový
                if (utils.createObligation(date, empData, "attendance")) {
                    result.created++;
                    result.totalAmount += empData.dailyWage;
                } else {
                    result.errors++;
                }
            }
            
            result.total++;
            
        } catch (error) {
            utils.addError(currentEntry, "Chyba pri spracovaní zamestnanca: " + error.toString(), "processObligations");
            result.errors++;
            }
        
        result.success = result.errors === 0 && result.total > 0;
        
        
        
        return result;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba pri spracovaní: " + error.toString(), "processObligations", error);
        return result;
    }
}

function linkWorkRecords() {
    try {
        // Získaj základné údaje z dochádzky
        var dochadzkaDate = utils.safeGet(currentEntry, CONFIG.fields.date);
        var dochadzkaEmployees = utils.safeGetLinks(currentEntry, CONFIG.fields.employees);
        var dochadzkaPrichod = utils.safeGet(currentEntry, CONFIG.fields.arrival);
        var dochadzkaOdchod = utils.safeGet(currentEntry, CONFIG.fields.departure);
        
        if (!dochadzkaDate || !dochadzkaEmployees || dochadzkaEmployees.length === 0) {
            utils.addDebug(currentEntry, "  ⚠️ Chýbajú základné údaje pre linkovanie");
            return {
                success: false,
                linkedCount: 0,
                message: "Chýbajú základné údaje"
            };
        }
        
        utils.addDebug(currentEntry, "  📅 Dátum dochádzky: " + utils.formatDate(dochadzkaDate));
        utils.addDebug(currentEntry, "  ⏰ Časy dochádzky: " + utils.formatTime(dochadzkaPrichod) + " - " + utils.formatTime(dochadzkaOdchod));
        utils.addDebug(currentEntry, "  👥 Počet zamestnancov: " + dochadzkaEmployees.length);
        
        // Získaj knižnicu záznamov práce
        var workRecordsLib = libByName(CONFIG.libraries.workRecords);
        if (!workRecordsLib) {
            utils.addError(currentEntry, "Knižnica 'Záznam práce' nenájdená", "linkWorkRecords");
            return {
                success: false,
                linkedCount: 0,
                message: "Knižnica nenájdená"
            };
        }
        
        // Nájdi záznamy práce pre daný dátum
        //var workRecords = workRecordsLib.find(moment(dochadzkaDate).format("DD.MM.YYYY"));
        // var workRecords = workRecordsLib.filter(function(record) {
        //     return record.datum === moment(dochadzkaDate).format("DD.MM.YYYY");
        // });

        var workRecords = [];
        var targetDate = moment(dochadzkaDate).format("DD.MM.YYYY");

        workRecordsLib.entries().forEach(function(record) {
            
            if (moment(record.field(CONFIG.fields.workRecord.date)).format("DD.MM.YYYY") === targetDate) {
                workRecords.push(record);
            }
        });


        
        utils.addDebug(currentEntry, "  🔍 Nájdených záznamov práce pre dátum: " + workRecords.length);
        
        if (workRecords.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadne záznamy práce pre tento dátum");
            return {
                success: true,
                linkedCount: 0,
                message: "Žiadne záznamy práce"
            };
        }
        
        // Získaj ID všetkých zamestnancov z dochádzky
        var dochadzkaEmployeeIds = [];
        for (var i = 0; i < dochadzkaEmployees.length; i++) {
            var empId = dochadzkaEmployees[i].field("ID");
            if (empId) {
                dochadzkaEmployeeIds.push(empId);
            }
        }
        
        // Filtruj záznamy práce podľa zamestnancov a časov
        var matchingWorkRecords = [];
        var warningRecords = [];
        var workedOnOrders = 0;
        
        for (var j = 0; j < workRecords.length; j++) {
            var workRecord = workRecords[j];
            var workEmployees = utils.safeGetLinks(workRecord, CONFIG.fields.workRecord.employees);
            var workStartTime = utils.safeGet(workRecord, CONFIG.fields.workRecord.startTime);
            var workEndTime = utils.safeGet(workRecord, CONFIG.fields.workRecord.endTime);
            var workedOnOrder = utils.safeGet(workRecord, CONFIG.fields.workRecord.workTime);
            // Kontrola či má záznam aspoň jedného zhodného zamestnanca
            var hasMatchingEmployee = false;
            for (var k = 0; k < workEmployees.length; k++) {
                var workEmpId = workEmployees[k].field("ID");
                if (dochadzkaEmployeeIds.indexOf(workEmpId) !== -1) {
                    workedOnOrders += workedOnOrder;
                    hasMatchingEmployee = true;
                }
            }
            
            if (hasMatchingEmployee) {
                utils.addDebug(currentEntry, "  ✅ Záznam #" + workRecord.field("ID") + " má zhodných zamestnancov");
                
                // Kontrola časov
                var timeWarning = false;
                var warningMessage = "";
                
                if (workStartTime && workEndTime && dochadzkaPrichod && dochadzkaOdchod) {
                    // Konvertuj časy na minúty pre porovnanie
                    var dochadzkaStart = utils.parseTimeToMinutes(dochadzkaPrichod);
                    var dochadzkaEnd = utils.parseTimeToMinutes(dochadzkaOdchod);
                    var workStart = utils.parseTimeToMinutes(workStartTime);
                    var workEnd = utils.parseTimeToMinutes(workEndTime);
                    
                    if (workStart < dochadzkaStart || workEnd > dochadzkaEnd) {
                        timeWarning = true;
                        warningMessage = "Časy práce presahujú dochádzku! ";
                        warningMessage += "(" + workStartTime + "-" + workEndTime + " vs " + dochadzkaPrichod + "-" + dochadzkaOdchod + ")";
                    }
                }
                
                if (timeWarning) {
                    utils.addDebug(currentEntry, "  ⚠️ " + warningMessage);
                    warningRecords.push({
                        record: workRecord,
                        warning: warningMessage
                    });
                } else {
                    matchingWorkRecords.push(workRecord);
                }
            }
        }
        
        utils.addDebug(currentEntry, "  📊 Záznamy na linkovanie: " + matchingWorkRecords.length);
        utils.addDebug(currentEntry, "  ⚠️ Záznamy s upozornením: " + warningRecords.length);
        
        // Pridaj všetky záznamy (aj tie s upozornením)
        var allRecordsToLink = matchingWorkRecords.slice(); // Kópia normálnych záznamov
        
        // Pridaj aj záznamy s upozornením
        for (var w = 0; w < warningRecords.length; w++) {
            allRecordsToLink.push(warningRecords[w].record);
        }
        
        if (allRecordsToLink.length > 0) {
            // Nastav pole Práce
            utils.safeSet(currentEntry, CONFIG.fields.attendance.works, allRecordsToLink);
            
            // Označ záznamy s upozornením farebne
            for (var wr = 0; wr < warningRecords.length; wr++) {
                var warningRecord = warningRecords[wr].record;
                
                // Nastav žltú farbu pozadia pre upozornenie
                utils.setColor(currentEntry, "fg", "warning");
                
                // Pridaj info do info poľa záznamu práce
                var existingInfo = utils.safeGet(warningRecord, CONFIG.fields.common.info || "info", "");
                var warningInfo = "\n⚠️ UPOZORNENIE (Dochádzka #" + currentEntry.field("ID") + "):\n";
                warningInfo += warningRecords[wr].warning + "\n";
                warningInfo += "Čas kontroly: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
                
                utils.safeSet(warningRecord, CONFIG.fields.common.info || "info", existingInfo + warningInfo);
            }
            
            utils.addDebug(currentEntry, "  ✅ Nalinkovaných záznamov: " + allRecordsToLink.length);
        }
        

        return {
            success: true,
            linkedCount: allRecordsToLink.length,
            normalCount: matchingWorkRecords.length,
            warningCount: warningRecords.length,
            workedOnOrders: workedOnOrders,
            message: "Úspešne nalinkované"
        };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "linkWorkRecords", error);
        return {
            success: false,
            linkedCount: 0,
            message: "Chyba: " + error.toString()
        };
    }
}

function linkRideLogRecords() {
    try {
        // Získaj základné údaje z dochádzky
        var dochadzkaDate = utils.safeGet(currentEntry, CONFIG.fields.date);
        var dochadzkaEmployees = utils.safeGetLinks(currentEntry, CONFIG.fields.employees);
        
        // Získaj knižnicu záznamov práce
        var rideLogRecordsLib = libByName(CONFIG.libraries.rideLog);
        if (!rideLogRecordsLib) {
            utils.addError(currentEntry, "Knižnica 'Kniha jázd' nenájdená", "linkRideLogRecords");
            return {
                success: false,
                linkedCount: 0,
                message: "Knižnica nenájdená"
            };
        }
        
        var rideLog = [];
        var targetDate = moment(dochadzkaDate).format("DD.MM.YYYY");

        rideLogRecordsLib.entries().forEach(function(record) {
            if (moment(record.field(CONFIG.fields.rideLog.date)).format("DD.MM.YYYY") === targetDate) {
                rideLog.push(record);
            }
        });
        
        utils.addDebug(currentEntry, "  🔍 Nájdených záznamov jázd pre dátum: " + rideLog.length);
        
        if (rideLog.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadne záznamy jázd pre tento dátum");
            return {
                success: true,
                linkedCount: 0,
                message: "Žiadne záznamy jázd"
            };
        }
        
        // Získaj ID všetkých zamestnancov z dochádzky
        var dochadzkaEmployeeIds = [];
        for (var i = 0; i < dochadzkaEmployees.length; i++) {
            var empId = dochadzkaEmployees[i].field("ID");
            if (empId) {
                dochadzkaEmployeeIds.push(empId);
            }
        }
        
        // Filtruj záznamy práce podľa zamestnancov a časov
        var matchingRideLog = [];
        var warningRecords = [];
        
        for (var j = 0; j < rideLog.length; j++) {
            var rideLogRecord = rideLog[j];
            var crew = utils.safeGetLinks(rideLogRecord, CONFIG.fields.rideLog.crew);
            // Kontrola či má záznam aspoň jedného zhodného zamestnanca
            var hasMatchingEmployee = false;
            for (var k = 0; k < crew.length; k++) {
                var crewId = crew[k].field("ID");
                if (dochadzkaEmployeeIds.indexOf(crewId) !== -1) {
                    hasMatchingEmployee = true;
                }
            }
            
            if (hasMatchingEmployee) {
                utils.addDebug(currentEntry, "  ✅ Záznam #" + rideLogRecord.field("ID") + " má zhodných zamestnancov");
                matchingRideLog.push(rideLogRecord);
            }
        }
        
        utils.addDebug(currentEntry, "  📊 Záznamy na linkovanie: " + matchingRideLog.length);
        utils.addDebug(currentEntry, "  ⚠️ Záznamy s upozornením: " + warningRecords.length);
        
        // Pridaj všetky záznamy (aj tie s upozornením)
        var allRecordsToLink = matchingRideLog.slice(); // Kópia normálnych záznamov
        
        // Pridaj aj záznamy s upozornením
        for (var w = 0; w < warningRecords.length; w++) {
            allRecordsToLink.push(warningRecords[w].record);
        }
        
        if (allRecordsToLink.length > 0) {
            // Nastav pole Práce
            utils.safeSet(currentEntry, CONFIG.fields.attendance.rides, allRecordsToLink);
            utils.addDebug(currentEntry, "  ✅ Nalinkovaných záznamov: " + allRecordsToLink.length);
        }
        

        return {
            success: true,
            linkedCount: allRecordsToLink.length,
            normalCount: matchingRideLog.length,
            warningCount: warningRecords.length,
            message: "Úspešne nalinkované"
        };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "linkRideLog", error);
        return {
            success: false,
            linkedCount: 0,
            message: "Chyba: " + error.toString()
        };
    }
}

function linkCashBookRecords() {
    try {
        // Získaj základné údaje z dochádzky
        var dochadzkaDate = utils.safeGet(currentEntry, CONFIG.fields.date);
        var dochadzkaEmployees = utils.safeGetLinks(currentEntry, CONFIG.fields.employees);
        
        // Získaj knižnicu záznamov práce
        var cashBookRecordsLib = libByName(CONFIG.libraries.cashBook);
        if (!cashBookRecordsLib) {
            utils.addError(currentEntry, "Knižnica 'Pokladňa' nenájdená", "linkCashBookRecords");
            return {
                success: false,
                linkedCount: 0,
                message: "Knižnica nenájdená"
            };
        }
        
        var cashBook = [];
        var targetDate = moment(dochadzkaDate).format("DD.MM.YYYY");

        cashBookRecordsLib.entries().forEach(function(record) {
            if (moment(record.field(CONFIG.fields.cashBook.date)).format("DD.MM.YYYY") === targetDate) {
                cashBook.push(record);
            }
        });
        
        utils.addDebug(currentEntry, "  🔍 Nájdených záznamov Pokladne pre dátum: " + cashBook.length);
        
        if (cashBook.length === 0) {
            utils.addDebug(currentEntry, "  ℹ️ Žiadne záznamy Pokladne pre tento dátum");
            return {
                success: true,
                linkedCount: 0,
                message: "Žiadne záznamy Pokladne"
            };
        }
        
        // Získaj ID všetkých zamestnancov z dochádzky
        var dochadzkaEmployeeIds = [];
        for (var i = 0; i < dochadzkaEmployees.length; i++) {
            var empId = dochadzkaEmployees[i].field("ID");
            if (empId) {
                dochadzkaEmployeeIds.push(empId);
            }
        }
        
        // Filtruj záznamy pokladne podľa zamestnancov a časov
        var matchingCashBook = [];
        var warningRecords = [];
        
        for (var j = 0; j < cashBook.length; j++) {
            var cashBookRecord = cashBook[j];
            // Kontrola či má záznam aspoň jedného zhodného zamestnanca
            var paidBy = utils.safeGet(cashBookRecord, CONFIG.fields.cashBook.paidBy);
            var paidTo = utils.safeGet(cashBookRecord, CONFIG.fields.cashBook.paidTo);
            var hasMatchingEmployee = false;
            if (paidBy && paidBy.length > 0){
                var paidById = paidBy[0].field("ID");
            }
            if (paidTo && paidTo.length > 0){
                var paidToId = paidTo[0].field("ID");
            }
            if (dochadzkaEmployeeIds.indexOf(paidById) !== -1 || dochadzkaEmployeeIds.indexOf(paidToId) !== -1) {
                hasMatchingEmployee = true;
            } 
            
            if (hasMatchingEmployee) {
                utils.addDebug(currentEntry, "  ✅ Záznam #" + cashBookRecord.field("ID") + " má zhodných zamestnancov");
                matchingCashBook.push(cashBookRecord);
            }
        }
        
        utils.addDebug(currentEntry, "  📊 Záznamy na linkovanie: " + matchingCashBook.length);
        utils.addDebug(currentEntry, "  ⚠️ Záznamy s upozornením: " + warningRecords.length);
        
        // Pridaj všetky záznamy (aj tie s upozornením)
        var allRecordsToLink = matchingCashBook.slice(); // Kópia normálnych záznamov
        
        // Pridaj aj záznamy s upozornením
        for (var w = 0; w < warningRecords.length; w++) {
            allRecordsToLink.push(warningRecords[w].record);
        }
        
        if (allRecordsToLink.length > 0) {
            // Nastav pole Práce
            utils.safeSet(currentEntry, CONFIG.fields.attendance.cashBook, allRecordsToLink);
            utils.addDebug(currentEntry, "  ✅ Nalinkovaných záznamov: " + allRecordsToLink.length);
        }
        

        return {
            success: true,
            linkedCount: allRecordsToLink.length,
            normalCount: matchingCashBook.length,
            warningCount: warningRecords.length,
            message: "Úspešne nalinkované"
        };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "linkCashBook", error);
        return {
            success: false,
            linkedCount: 0,
            message: "Chyba: " + error.toString()
        };
    }
}

// ==============================================
// KROK 4: CELKOVÉ VÝPOČTY
// ==============================================

function setEntryFields(employeeResult, workLinkResult, rideLogLinkResult, cashBookResult, entryIcons, entryStatus) {
    try {
        // Ulož celkové hodnoty
        var workHoursDiff = workLinkResult.workedOnOrders - employeeResult.odpracovaneTotal;
        if (workHoursDiff > 0) {
            utils.addDebug(currentEntry, "❗ Odpracovaný čas na zákazkách je vyšší ako čas v dochádzke: " + workHoursDiff + " hodín");
            utils.setColor(currentEntry, "fg", "red");
        } else if (workHoursDiff < 0) {
            utils.addDebug(currentEntry, "⚠️ Odpracovaný čas na zákazkách je nižší ako čas v dochádzke: " + workHoursDiff + " hodín");
            utils.setColor(currentEntry, "fg", "blue");
        } else {
            utils.addDebug(currentEntry, "☑️ Odpracovaný čas na zákazkách sedí na chlp s dochádzkou ");
            utils.setColor(currentEntry, "fg", "yellow");
        }
        
        utils.safeSet(currentEntry, CONFIG.fields.attendance.workedHours, employeeResult.odpracovaneTotal);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.wageCosts, employeeResult.celkoveMzdy);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.onProjects, 0);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.downtime, 0);
        utils.safeSet(currentEntry,CONFIG.fields.attendance.downtime, workHoursDiff)
        utils.safeSet(currentEntry,CONFIG.fields.attendance.workedOnOrders, workLinkResult.workedOnOrders)
        utils.safeSet(currentEntry,CONFIG.fields.attendance.entryIcons, entryIcons)
        utils.safeSet(currentEntry,CONFIG.fields.attendance.entryStatus, entryStatus)

        utils.addDebug(currentEntry, "  • Pracovná doba: " + employeeResult.pracovnaDoba + " hodín");
        utils.addDebug(currentEntry, "  • Odpracované spolu: " + employeeResult.odpracovaneTotal + " hodín");
        utils.addDebug(currentEntry, "  • Mzdové náklady: " + utils.formatMoney(employeeResult.celkoveMzdy));
        utils.addDebug(currentEntry, "  • Na zákazkách: " + workLinkResult.workedOnOrders +" hodín");
        utils.addDebug(currentEntry, "  • Prestoje: " + workHoursDiff + " hodín");
        utils.addDebug(currentEntry, " Celkové výpočty úspešné", "success");
         
        var isHoliday = utils.isHoliday(validationResult.date);
        var isWeekend = utils.isWeekend(validationResult.date);
         //var farba = "#FFFFFF"; // Biela - štandard
        if (isHoliday) {
            utils.setColor(currentEntry, "bg", "pastel blue")
        } else if (isWeekend) {
            utils.setColor(currentEntry, "bg", "pastel orange")
        }

        return {
            success: true
        };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "setEntryFields", error);
        return false;
    }
}

function zobrazSuhrn() {
    var summaryData = {
        success: true,
        date: currentEntry.field(CONFIG.fields.attendance.date),
        employeeCount: currentEntry.field(CONFIG.fields.attendance.employeeCount),
        totalHours: currentEntry.field(CONFIG.fields.attendance.workedHours),
        totalCosts: currentEntry.field(CONFIG.fields.attendance.wageCosts),
        errors: [] // Môžeš pridať chyby ak ich máš
    };
    
    utils.showProcessingSummary(currentEntry, summaryData, CONFIG);
}

// ==============================================
// KROK 5: VYTVORENIE INFO ZÁZNAMU
// ==============================================

function createInfoRecord(workTimeResult, employeeResult) {
    try {
        var date = currentEntry.field(CONFIG.fields.attendance.date);
        var dateFormatted = utils.formatDate(date, "DD.MM.YYYY");
        var dayName = utils.getDayNameSK(moment(date).day()).toUpperCase();


        var infoMessage = "📋 DOCHÁDZKA - AUTOMATICKÝ PREPOČET\n";
        infoMessage += "═══════════════════════════════════\n";
        
        infoMessage += "📅 Dátum: " + dateFormatted + " (" + dayName + ")\n";
        infoMessage += "⏰ Pracovný čas: " + moment(workTimeResult.arrivalRounded).format("HH:mm") + 
                       " - " + moment(workTimeResult.departureRounded).format("HH:mm") + "\n";
        infoMessage += "⏱️ Pracovná doba: " + workTimeResult.pracovnaDobaHodiny + " hodín\n\n";
        
        infoMessage += "👥 ZAMESTNANCI (" + employeeResult.pocetPracovnikov + " " + utils.selectOsobaForm(employeeResult.pocetPracovnikov) +")\n";;
        infoMessage += "───────────────────────────────────\n";
        
        for (var i = 0; i < employeeResult.detaily.length; i++) {
            var detail = employeeResult.detaily[i];
            infoMessage += "👤 " + (i+1) + ": " + utils.formatEmployeeName(employeeResult.detaily[i].zamestnanec) + "\n";
            infoMessage += "• Hodinovka: " + detail.hodinovka + " €/h\n";
            if (detail.priplatok > 0) infoMessage += "  + Príplatok: " + detail.priplatok + " €/h\n";
            if (detail.premia > 0) infoMessage += "  + Prémia: " + detail.premia + " €\n";
            if (detail.pokuta > 0) infoMessage += "  - Pokuta: " + detail.pokuta + " €\n";
            infoMessage += "  = Denná mzda: " + detail.dennaMzda + " €\n\n";
        }
        
        infoMessage += "💰 SÚHRN:\n";
        infoMessage += "───────────────────────────────────\n";
        infoMessage += "• Odpracované celkom: " + employeeResult.odpracovaneTotal + " hodín\n";
        infoMessage += "• Mzdové náklady: " + utils.formatMoney(employeeResult.celkoveMzdy) + "\n\n";
        
        infoMessage += "🔧 TECHNICKÉ INFO:\n";
        infoMessage += "• Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        infoMessage += "• Čas spracovania: " + moment().format("HH:mm:ss") + "\n";
        infoMessage += "• MementoUtils: v" + (utils.version || "N/A") + "\n";
        
        if (typeof MementoConfig !== 'undefined') {
            infoMessage += "• MementoConfig: v" + MementoConfig.version + "\n";
        }
        
        infoMessage += "\n✅ PREPOČET DOKONČENÝ ÚSPEŠNE";
        
        currentEntry.set(CONFIG.fields.info, infoMessage);
        
        utils.addDebug(currentEntry, "✅ Info záznam vytvorený");
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createInfoRecord", error);
        return false;
    }
}

/**
 * Pomocná funkcia na zbieranie dát z linkovaných záznamov
 * @returns {Object} Objekt s agregovanými údajmi
 */
function collectLinkedRecordsData() {
    var data = {
        workRecords: {
            count: 0,
            records: [],
            totalHours: 0,
            totalHZS: 0
        },
        rideLog: {
            count: 0,
            records: [],
            totalKm: 0,
            totalTime: 0,
            totalCost: 0
        },
        cashBook: {
            count: 0,
            accounts: {}, // Objekt pre účty
            totalIncome: 0,
            totalExpenses: 0,
            balance: 0
        },
        obligations: {
            count: 0,
            records: [],
            totalAmount: 0
        }
    };
    
    try {
        utils.addDebug(currentEntry, "=== ZBIERANIE DÁT Z LINKOVANÝCH ZÁZNAMOV ===");
        
        // ZÍSKAJ LINKOVANÉ ZÁZNAMY PRÁCE
        var workLinks = utils.safeGetLinks(currentEntry, CONFIG.fields.attendance.works || "Práce");
        utils.addDebug(currentEntry, "Záznamy práce: " + workLinks.length);
        
        if (workLinks && workLinks.length > 0) {
            data.workRecords.count = workLinks.length;
            
            for (var i = 0; i < workLinks.length; i++) {
                var work = workLinks[i];
                var odpracovane = utils.safeGet(work, CONFIG.fields.workRecord.workTime, 0);
                var pocetPrac = utils.safeGet(currentEntry, CONFIG.fields.attendance.employeeCount, 1); // počítať ľudí v dochádzke nie v zázname prác (zvyšný pracovníci budú v druhom zázname)
                var odpracTotal = odpracovane * pocetPrac;
                //var hzs = work.field(CONFIG.fields.workRecord.hzs)[0].attr("cena") || 0; // zisti sadzbu HZS zo záznamu
                var hzs = utils.safeGet(work, CONFIG.fields.workRecord.hzs)[0].field("Cena") || 0; // zisti sadzbu HZS zo záznamu
                var zakazka = utils.safeGetLinks(work, CONFIG.fields.workRecord.customer);
                var zakazkaNazov = zakazka && zakazka.length > 0 ? 
                                  utils.safeGet(zakazka[0], "Názov", "Bez názvu") : "Bez zákazky";
                var hzsSum = hzs * odpracTotal;
                data.workRecords.records.push({
                    zakazka: zakazkaNazov,
                    odpracovane: odpracovane,
                    pocetPracovnikov: pocetPrac,
                    odpracovaneTotal: odpracTotal.toFixed(2),
                    hzs: hzs,
                    hzsSum: hzsSum
                });
                
                data.workRecords.totalHours += odpracTotal;
                data.workRecords.totalHZS += hzsSum;
            }
        }
        
        // ZÍSKAJ LINKOVANÉ JAZDY
        var rideLinks = utils.safeGetLinks(currentEntry, CONFIG.fields.attendance.rides || "Kniha jázd");
        utils.addDebug(currentEntry, "Záznamy jázd: " + rideLinks.length);
        
        if (rideLinks && rideLinks.length > 0) {
            data.rideLog.count = rideLinks.length;
            
            for (var j = 0; j < rideLinks.length; j++) {
                var ride = rideLinks[j];
                var km = utils.safeGet(ride, CONFIG.fields.bookOfRides.km || "Km", 0);
                var sadzbaKm = utils.safeGet(ride, "Sadzba za km", 0) || 0.193;
                var naklady = km * sadzbaKm;
                var vehicle = utils.safeGet(ride, CONFIG.fields.bookOfRides.vehicle)[0];
                var vehicleName = utils.safeGet(vehicle, CONFIG.fields.vehicle.name);
                var start = utils.safeGet(ride, CONFIG.fields.bookOfRides.start)[0]
                var startName = utils.safeGet(start, CONFIG.fields.place.name);
                var destination = utils.safeGet(ride, CONFIG.fields.bookOfRides.destination)[0]
                var destinationName = utils.safeGet(destination, CONFIG.fields.place.name);
                var stops = utils.safeGet(ride, CONFIG.fields.bookOfRides.stops)
                var trasa = startName + " - " + destinationName;

                data.rideLog.records.push({
                    vehicle: vehicleName,
                    stops: stops.length,
                    trasa: trasa,
                    km: km,
                    sadzbaKm: sadzbaKm,
                    naklady: naklady
                });
                
                data.rideLog.totalKm += km;
                data.rideLog.totalCost += naklady;
            }
        }
        
        // ZÍSKAJ LINKOVANÉ POKLADNIČNÉ DOKLADY S ÚČTAMI
        var cashLinks = utils.safeGetLinks(currentEntry, CONFIG.fields.attendance.cashBook || "Pokladňa");
        utils.addDebug(currentEntry, "Záznamy pokladne: " + cashLinks.length);
        
        if (cashLinks && cashLinks.length > 0) {
            data.cashBook.count = cashLinks.length;
            
            // KROK 1: Najprv vytvor zoznam všetkých unikátnych účtov z linkovaných transakcií
            var uniqueAccounts = {}; // Objekt pre uloženie unikátnych účtov
            var dailyAccountsData = {}; // Dáta pre denný prehľad
            
            for (var k = 0; k < cashLinks.length; k++) {
                var cash = cashLinks[k];
                
                // Získaj účty z transakcie
                var fromAccountLinks = utils.safeGetLinks(cash, CONFIG.fields.cashBook.fromAccount || "Z pokladne");
                var toAccountLinks = utils.safeGetLinks(cash, CONFIG.fields.cashBook.toAccount || "Do pokladne");
                
                // Pridaj fromAccount do zoznamu ak existuje
                if (fromAccountLinks && fromAccountLinks.length > 0) {
                    var fromAccount = fromAccountLinks[0];
                    var fromAccountId = fromAccount.field("ID");
                    if (!uniqueAccounts[fromAccountId]) {
                        uniqueAccounts[fromAccountId] = fromAccount;
                        utils.addDebug(currentEntry, "Našiel som účet (from): " + utils.safeGet(fromAccount, "Názov"));
                    }
                }
                
                // Pridaj toAccount do zoznamu ak existuje
                if (toAccountLinks && toAccountLinks.length > 0) {
                    var toAccount = toAccountLinks[0];
                    var toAccountId = toAccount.field("ID");
                    if (!uniqueAccounts[toAccountId]) {
                        uniqueAccounts[toAccountId] = toAccount;
                        utils.addDebug(currentEntry, "Našiel som účet (to): " + utils.safeGet(toAccount, "Názov"));
                    }
                }
            }
            
            utils.addDebug(currentEntry, "Celkový počet unikátnych účtov: " + Object.keys(uniqueAccounts).length);
            
            // KROK 2: Pre každý účet získaj všetky transakcie pomocou linksFrom
            for (var accountId in uniqueAccounts) {
                var account = uniqueAccounts[accountId];
                var accountName = utils.safeGet(account, CONFIG.fields.account.name || "Názov", "Neznámy účet");
                
                utils.addDebug(currentEntry, "\n=== Spracovávam účet: " + accountName + " ===");
                
                // Získaj všetky transakcie z pokladne ktoré obsahujú tento účet
                //var fromTransactions = account.linksFrom(CONFIG.libraries.cashBook || "Pokladňa", CONFIG.fields.cashBook.fromAccount || "Z pokladne");
                var fromTransactions = utils.safeGetLinksFrom(account, CONFIG.libraries.cashBook, CONFIG.fields.cashBook.fromAccount);
                var toTransactions = utils.safeGetLinksFrom(account, CONFIG.libraries.cashBook, CONFIG.fields.cashBook.toAccount);
                
                utils.addDebug(currentEntry, "  • Transakcie z účtu (fromAccount): " + fromTransactions.length);
                utils.addDebug(currentEntry, "  • Transakcie na účet (toAccount): " + toTransactions.length);
                
                var allIncome = 0;
                var allExpenses = 0;
                var dailyIncome = 0;
                var dailyExpenses = 0;
                var dailyIncomeRecords = [];
                var dailyExpenseRecords = [];
                
                // Spracuj výdavky (fromAccount transakcie)
                for (var i = 0; i < fromTransactions.length; i++) {
                    var trans = fromTransactions[i];
                    var pohyb = utils.safeGet(trans, CONFIG.fields.cashBook.transactionType || "Pohyb", "");
                    
                    // Získaj sumu
                    var suma = getSumaFromCashRecord(trans);
                    
                    if ((pohyb === "Výdavok" || pohyb === "Výdaj" || pohyb === "PP" || pohyb === "Priebežná položka") && suma > 0) {
                        allExpenses += suma;
                        
                        // Ak je táto transakcia v našich linkovaných záznamoch, počítaj ju do denného súhrnu
                        if (isTransactionInLinks(trans, cashLinks)) {
                            dailyExpenses += suma;
                            dailyExpenseRecords.push({
                                popis: utils.safeGet(trans, CONFIG.fields.cashBook.description || "Popis", "Bez popisu"),
                                suma: suma
                            });
                        }
                    }
                }
                
                // Spracuj príjmy (toAccount transakcie)
                for (var j = 0; j < toTransactions.length; j++) {
                    var trans = toTransactions[j];
                    var pohyb = utils.safeGet(trans, CONFIG.fields.cashBook.transactionType || "Pohyb", "");
                    
                    // Získaj sumu
                    var suma = getSumaFromCashRecord(trans);

                    if ((pohyb === "Príjem" || pohyb === "PP" || pohyb === "Priebežná položka") && suma > 0) {
                        allIncome += suma;
                        
                        // Ak je táto transakcia v našich linkovaných záznamoch, počítaj ju do denného súhrnu
                        if (isTransactionInLinks(trans, cashLinks)) {
                            dailyIncome += suma;
                            dailyIncomeRecords.push({
                                popis: utils.safeGet(trans, CONFIG.fields.cashBook.description || "Popis", "Bez popisu"),
                                suma: suma
                            });
                        }
                    }
                }
                
                // Vypočítaj konečný stav účtu
                var initialBalance = utils.safeGet(account, CONFIG.fields.account.initialValue || "Počiatočný stav", 0);
                var calculatedBalance = initialBalance + allIncome - allExpenses;
                
                utils.addDebug(currentEntry, "\n📊 Výpočet stavu účtu:");
                utils.addDebug(currentEntry, "  • Počiatočný stav: " + utils.formatMoney(initialBalance));
                utils.addDebug(currentEntry, "  • Všetky príjmy: " + utils.formatMoney(allIncome));
                utils.addDebug(currentEntry, "  • Všetky výdavky: " + utils.formatMoney(allExpenses));
                utils.addDebug(currentEntry, "  • Vypočítaný stav: " + utils.formatMoney(calculatedBalance));
                
                // Aktualizuj pole "Stav" v účte
                try {
                    account.set(CONFIG.fields.account.balance || "Stav", calculatedBalance);
                    utils.addDebug(currentEntry, "  ✅ Stav účtu aktualizovaný");
                } catch (updateError) {
                    utils.addError(currentEntry, "Nepodarilo sa aktualizovať stav účtu: " + updateError.toString(), "collectLinkedRecordsData");
                }
                
                // Ulož dáta pre zobrazenie
                data.cashBook.accounts[accountId] = {
                    name: accountName,
                    balance: calculatedBalance,
                    income: dailyIncomeRecords,
                    expenses: dailyExpenseRecords,
                    totalIncome: dailyIncome,
                    totalExpenses: dailyExpenses,
                    saldo: dailyIncome - dailyExpenses
                };
                
                data.cashBook.totalIncome += dailyIncome;
                data.cashBook.totalExpenses += dailyExpenses;
            }
            
            data.cashBook.balance = data.cashBook.totalIncome - data.cashBook.totalExpenses;
        }
        
        // ZÍSKAJ ZÁVÄZKY CEZ LINKSFROM
        var obligationsLib = libByName(CONFIG.libraries.obligations);
        if (obligationsLib) {
            var obligations = currentEntry.linksFrom(CONFIG.libraries.obligations, CONFIG.fields.obligations.attendance || "Dochádzka");
            utils.addDebug(currentEntry, "Záväzky (linksFrom): " + obligations.length);
            
            if (obligations && obligations.length > 0) {
                data.obligations.count = obligations.length;
                
                for (var l = 0; l < obligations.length; l++) {
                    var obligation = obligations[l];
                    var typ = utils.safeGet(obligation, CONFIG.fields.obligations.type || "Typ", "");
                    var suma = utils.safeGet(obligation, CONFIG.fields.obligations.amount || "Suma", 0);
                    var popis = utils.safeGet(obligation, CONFIG.fields.obligations.description || "Popis", "");
                    var splatnost = utils.safeGet(obligation, CONFIG.fields.obligations.dueDate || "Splatnosť");
                    
                    data.obligations.records.push({
                        typ: typ,
                        popis: popis,
                        suma: suma,
                        splatnost: splatnost
                    });
                    
                    data.obligations.totalAmount += suma;
                }
            }
        }
        
        utils.addDebug(currentEntry, "=== ZBIERANIE DOKONČENÉ ===");
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri zbieraní dát z linkovaných záznamov", "collectLinkedRecordsData", error);
    }
    
    return data;
}
 // Pomocné funkcie
function getSumaFromCashRecord(record) {
    var isVat = utils.safeGet(record, CONFIG.fields.cashBook.isVat || "s DPH", false);
    var suma = 0;
    
    if (isVat) {
        suma = utils.safeGet(record, CONFIG.fields.cashBook.sumTotal || "Suma s DPH", 0);
    }
    
    if (!suma || suma === 0) {
        suma = utils.safeGet(record, CONFIG.fields.cashBook.sum || "Suma", 0);
    }
    return suma;
}

function isTransactionInLinks(transaction, linkedTransactions) {
    var transId = transaction.field("ID");
    for (var i = 0; i < linkedTransactions.length; i++) {
        if (linkedTransactions[i].field("ID") === transId) {
            return true;
        }
    }
    return false;
}
/**
 * Vytvorí Telegram info záznam s komplexným sumárom
 * @param {Object} workTimeResult - Výsledky pracovného času
 * @param {Object} employeeResult - Výsledky zamestnancov
 * @param {Object} linkedRecordsData - Objekt s údajmi z linkovaných záznamov
 * @returns {Object} {success: boolean, message: string}
 */
function prepareNotificationInfoRecord(workTimeResult, employeeResult, linkedRecordsData) {
    try {
        var date = currentEntry.field(CONFIG.fields.attendance.date);
        var dateFormatted = utils.formatDate(date, "DD.MM.YYYY");
        var dayName = utils.getDayNameSK(moment(date).day()).toUpperCase();

        // Inicializuj linkedRecordsData ak nebol poskytnutý
        if (!linkedRecordsData) {
            linkedRecordsData = collectLinkedRecordsData();
        }

        // HTML formátovaná správa
        var telegramInfo = "📋 <b> DOCHÁDZKA - DENNÝ SÚHRN ㊙️㊙️㊙️</b>\n";
        telegramInfo += "═══════════════════════════════════\n\n";
        
        telegramInfo += "📅 <b>Dátum:</b> " + dateFormatted + " (" + dayName + ")\n";
        telegramInfo += "⏰ <b>Pracovný čas:</b> " + utils.formatTime(workTimeResult.arrivalRounded) + 
                        " - " + utils.formatTime(workTimeResult.departureRounded) + "\n";
        telegramInfo += "⏱️ <b>Pracovná doba:</b> " + workTimeResult.pracovnaDobaHodiny + " hodín\n\n";
        
        // ZAMESTNANCI
        telegramInfo += "👥 <b>ZAMESTNANCI</b> (" + employeeResult.pocetPracovnikov + " " + 
                        utils.selectOsobaForm(employeeResult.pocetPracovnikov) + ")\n";
        telegramInfo += "───────────────────────────────────\n";
        
        for (var i = 0; i < employeeResult.detaily.length; i++) {
            var detail = employeeResult.detaily[i];
            var empName = utils.formatEmployeeName(detail.zamestnanec);
            
            telegramInfo += "• <b>" + empName + "</b>\n";
            telegramInfo += "  💶 Hodinovka: " + detail.hodinovka + " €/h\n";
            
            if (detail.priplatok > 0) {
                telegramInfo += "  ➕ Príplatok: " + detail.priplatok + " €/h\n";
            }
            if (detail.premia > 0) {
                telegramInfo += "  🎁 Prémia: " + detail.premia + " €\n";
            }
            if (detail.pokuta > 0) {
                telegramInfo += "  ➖ Pokuta: " + detail.pokuta + " €\n";
            }
            
            telegramInfo += "  💰 <b>Denná mzda: " + detail.dennaMzda + " €</b>\n\n";
        }
        
        // ZÁZNAMY PRÁCE
        if (linkedRecordsData.workRecords && linkedRecordsData.workRecords.count > 0) {
            telegramInfo += "🔨 <b>ZÁZNAMY PRÁCE</b> (" + linkedRecordsData.workRecords.count + ")\n";
            telegramInfo += "───────────────────────────────────\n";
            
            for (var j = 0; j < linkedRecordsData.workRecords.records.length; j++) {
                var work = linkedRecordsData.workRecords.records[j];
                telegramInfo += "• " + work.zakazka + "\n";
                telegramInfo += "  ⏱️ " + work.odpracovane + " h × " + work.pocetPracovnikov + " os = " + 
                               work.odpracovaneTotal + " h\n";
                if (work.hzs > 0) {
                    telegramInfo += "  💵 HZS: " + utils.formatMoney(work.hzs) + "\n";
                }
            }
            
            telegramInfo += "\n📊 Súhrn práce:\n";
            telegramInfo += "• Odpracované: " + linkedRecordsData.workRecords.totalHours.toFixed(2) + " hodín\n";
            telegramInfo += "• HZS celkom: " + utils.formatMoney(linkedRecordsData.workRecords.totalHZS) + "\n\n";
        }
        
        // KNIHA JÁZD
        if (linkedRecordsData.rideLog && linkedRecordsData.rideLog.count > 0) {
            telegramInfo += "🚗 <b>KNIHA JÁZD</b> (" + linkedRecordsData.rideLog.count + ")\n";
            telegramInfo += "───────────────────────────────────\n";
            
            for (var k = 0; k < linkedRecordsData.rideLog.records.length; k++) {
                var ride = linkedRecordsData.rideLog.records[k];
                telegramInfo += "• " + ride.vehicle + " - " + ride.trasa + "\n";
                telegramInfo += "  📏 " + ride.km + " km × " + ride.sadzbaKm.toFixed(3) + " €/km = " + 
                               utils.formatMoney(ride.naklady) + "\n";
            }
            
            telegramInfo += "\n📊 Súhrn jázd:\n";
            telegramInfo += "• Celkom km: " + linkedRecordsData.rideLog.totalKm + " km\n";
            telegramInfo += "• Náklady: " + utils.formatMoney(linkedRecordsData.rideLog.totalCost) + "\n\n";
        }
        
        // POKLADŇA - NOVÝ FORMÁT S ÚČTAMI
        if (linkedRecordsData.cashBook && linkedRecordsData.cashBook.count > 0) {
            telegramInfo += "💳 <b>POKLADŇA</b> (" + linkedRecordsData.cashBook.count + " transakcií)\n";
            telegramInfo += "═══════════════════════════════════\n\n";
            
            // Iteruj cez všetky účty
            for (var accountId in linkedRecordsData.cashBook.accounts) {
                var account = linkedRecordsData.cashBook.accounts[accountId];
                
                // Hlavička účtu
                telegramInfo += "💰 <b>" + account.name.toUpperCase() + "</b> (stav: " + 
                               utils.formatMoney(account.balance) + ")\n";
                
                // Výdavky
                telegramInfo += "📉 Výdavky (" + account.expenses.length + "): " + 
                               utils.formatMoney(account.totalExpenses) + "\n";
                
                if (account.expenses.length > 0 && account.expenses.length <= 3) {
                    // Ak je málo transakcií, zobraz detaily
                    for (var m = 0; m < account.expenses.length; m++) {
                        var exp = account.expenses[m];
                        telegramInfo += "  • " + exp.popis + ": -" + utils.formatMoney(exp.suma) + "\n";
                    }
                }
                
                // Príjmy
                telegramInfo += "📈 Príjmy (" + account.income.length + "): " + 
                               utils.formatMoney(account.totalIncome) + "\n";
                
                if (account.income.length > 0 && account.income.length <= 3) {
                    // Ak je málo transakcií, zobraz detaily
                    for (var n = 0; n < account.income.length; n++) {
                        var inc = account.income[n];
                        telegramInfo += "  • " + inc.popis + ": +" + utils.formatMoney(inc.suma) + "\n";
                    }
                }
                
                // Saldo účtu
                telegramInfo += "💎 <b>Saldo: " + (account.saldo >= 0 ? "+" : "") + 
                               utils.formatMoney(account.saldo) + "</b>\n\n";
            }
            
            // Celkový súhrn pokladne
            telegramInfo += "📊 <b>CELKOVÝ SÚHRN POKLADNE:</b>\n";
            telegramInfo += "• Príjmy spolu: +" + utils.formatMoney(linkedRecordsData.cashBook.totalIncome) + "\n";
            telegramInfo += "• Výdavky spolu: -" + utils.formatMoney(linkedRecordsData.cashBook.totalExpenses) + "\n";
            telegramInfo += "• <b>Saldo dňa: " + (linkedRecordsData.cashBook.balance >= 0 ? "+" : "") + 
                           utils.formatMoney(linkedRecordsData.cashBook.balance) + "</b>\n\n";
        }
        
        // ZÁVÄZKY
        if (linkedRecordsData.obligations && linkedRecordsData.obligations.count > 0) {
            telegramInfo += "📝 <b>ZÁVÄZKY</b> (" + linkedRecordsData.obligations.count + ")\n";
            telegramInfo += "───────────────────────────────────\n";
            
            for (var p = 0; p < linkedRecordsData.obligations.records.length; p++) {
                var obligation = linkedRecordsData.obligations.records[p];
                telegramInfo += "• " + obligation.typ + " - " + obligation.popis + "\n";
                telegramInfo += "  💰 " + utils.formatMoney(obligation.suma) + 
                               " (splatnosť: " + utils.formatDate(obligation.splatnost, "DD.MM.") + ")\n";
            }
            
            telegramInfo += "\n📊 Súhrn záväzkov:\n";
            telegramInfo += "• Celkom: " + utils.formatMoney(linkedRecordsData.obligations.totalAmount) + "\n\n";
        }
        
        // CELKOVÝ SÚHRN
        telegramInfo += "💰 <b>CELKOVÝ SÚHRN</b>\n";
        telegramInfo += "═══════════════════════════════════\n";
        telegramInfo += "• Odpracované (dochádzka): <b>" + employeeResult.odpracovaneTotal + " hodín</b>\n";
        telegramInfo += "• Mzdové náklady: <b>" + utils.formatMoney(employeeResult.celkoveMzdy) + "</b>\n";
        
        if (linkedRecordsData.workRecords && linkedRecordsData.workRecords.totalHours > 0) {
            var prestoje = employeeResult.odpracovaneTotal - linkedRecordsData.workRecords.totalHours;
            if (prestoje > 0) {
                telegramInfo += "• ⚠️ Prestoje: <b>" + prestoje.toFixed(2) + " hodín</b>\n";
            }
        }
        
        // Celkové náklady
        var celkoveNaklady = employeeResult.celkoveMzdy;
        if (linkedRecordsData.rideLog) celkoveNaklady += linkedRecordsData.rideLog.totalCost;
        if (linkedRecordsData.cashBook) celkoveNaklady += linkedRecordsData.cashBook.totalExpenses;
        
        telegramInfo += "• 💸 Celkové náklady dňa: <b>" + utils.formatMoney(celkoveNaklady) + "</b>\n";
        
        // Celkové výnosy
        var celkoveVynosy = 0;
        if (linkedRecordsData.workRecords) celkoveVynosy += linkedRecordsData.workRecords.totalHZS;
        if (linkedRecordsData.cashBook) celkoveVynosy += linkedRecordsData.cashBook.totalIncome;
        
        if (celkoveVynosy > 0) {
            telegramInfo += "• 💵 Celkové výnosy dňa: <b>" + utils.formatMoney(celkoveVynosy) + "</b>\n";
            var zisk = celkoveVynosy - celkoveNaklady;
            telegramInfo += "• 📊 Hrubý zisk/strata: <b>" + 
                           (zisk >= 0 ? "+" : "") + utils.formatMoney(zisk) + "</b>\n";
        }
        
      
        telegramInfo += "\n🔧 <i>Script: " + CONFIG.scriptName + " v" + CONFIG.version + "</i>\n";
        telegramInfo += "⏰ <i>Spracované: " + moment().format("HH:mm:ss") + "</i>\n";
        telegramInfo += "📝 <i>Záznam #" + currentEntry.field("ID") + "</i>";
        
        // Ulož do poľa info_telegram
        utils.safeSet(currentEntry, CONFIG.fields.common.infoTelegram, telegramInfo);
        
        utils.addDebug(currentEntry, utils.getIcon("success") + " Info_telegram záznam vytvorený s rozšíreným sumárom");
       
        return {
            success: true,
            message: "Telegram info vytvorené úspešne"
        };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "prepareNotificationInfoRecord", error);
        return {
            success: false,
            error: error.toString()
        };
    }
}

// function createTelegramMessage(){
//     try {
//         var libraryName = lib().title;
//         utils.addDebug(currentEntry, utils.getIcon("start") + " === " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
//         utils.addDebug(currentEntry, "Knižnica: " + libraryName);
        
//         // 1. Kontrola či máme info_telegram pole
//         var telegramMessage = utils.safeGet(currentEntry, CONFIG.fields.common.infoTelegram);
//         if (!telegramMessage) {
//             utils.addDebug(currentEntry, utils.getIcon("info") + " Pole info_telegram je prázdne - žiadna notifikácia");
//             return true;
//         }
        
//         // 2. Identifikácia knižnice
//         var libraryConfig = CONFIG.libraryMapping[libraryName];
//         if (!libraryConfig) {
//             utils.addDebug(currentEntry, utils.getIcon("info") + " Knižnica '" + libraryName + "' nie je nakonfigurovaná pre notifikácie");
//             return true;
//         }
        
//         // 3. Kontrola povolení
//         if (!checkPermissions(libraryConfig.permissionField)) {
//             utils.addDebug(currentEntry, utils.getIcon("info") + " Skupinové notifikácie sú vypnuté");
//             return true;
//         }
        
//         // 4. Získanie Telegram skupiny
//         var telegramGroup = utils.getTelegramGroup(libraryConfig.telegramGroupField);
//         if (!telegramGroup) {
//             utils.addDebug(currentEntry, utils.getIcon("warning") + " Telegram skupina nenájdená alebo neaktívna");
//             return true;
//         }
        
//         // 5. Cleanup starých notifikácií
//         var cleanupResult = utils.cleanupOldNotifications();
//         if (cleanupResult.deletedCount > 0) {
//             utils.addDebug(currentEntry, utils.getIcon("delete") + " Vymazaných " + cleanupResult.deletedCount + " starých notifikácií");
//         }
        
//         // 6. Vytvorenie novej notifikácie
//         var notification = utils.createNotification({
//             message: telegramMessage,
//             messageType: libraryName,
//             telegramGroup: telegramGroup
//         });
        
//         if (!notification) {
//             utils.addError(currentEntry, "Nepodarilo sa vytvoriť notifikáciu", "main");
//             return false;
//         }
        
//         // 7. Nalinkuj notifikáciu k záznamu
//         utils.linkNotification(notification);
        
//         utils.addDebug(currentEntry, utils.getIcon("success") + " Notifikácia vytvorená (ID: " + notification.field("ID") + ")");
//         utils.addDebug(currentEntry, utils.getIcon("success") + " === SCRIPT DOKONČENÝ ===");
        
//         return true;
        
//     } catch (error) {
//         utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
//         return false;
//     }
// }

// function sendTelegramMessage(notificationEntry) {
//     try {
        
//         // 1. Kontrola či je to nový záznam
//         if (!isNewRecord()) {
//             utils.addDebug(notificationEntry, "Nie je nový záznam - preskakujem");
//             return true;
//         }
        
//         // 2. Kontrola statusu
//         var status = utils.safeGet(notificationEntry, CONFIG.fields.notifications.status);
//         if (status !== "Čaká") {
//             utils.addDebug(notificationEntry, "Status nie je 'Čaká' - preskakujem");
//             return true;
//         }
        
//         // 3. Získanie Telegram ID podľa adresáta
//         var telegramData = utils.getTelegramID(notificationEntry);
//         if (!telegramData.success) {
//             utils.addError(notificationEntry, "Nepodarilo sa získať Telegram údaje: " + telegramData.error, "main");
//             utils.updateStatus("Zlyhalo", telegramData.error);
//             return false;
//         }
        
//         utils.addDebug(notificationEntry, "Telegram údaje získané:");
//         utils.addDebug(notificationEntry, "  • Chat ID: " + telegramData.chatId);
//         if (telegramData.threadId) {
//             utils.addDebug(notificationEntry, "  • Thread ID: " + telegramData.threadId);
//         }
        
//         // 4. Príprava správy
//         var message = utils.safeGet(notificationEntry, CONFIG.fields.notifications.message);
//         if (!message) {
//             utils.addError(notificationEntry, "Správa je prázdna", "main");
//             utils.updateStatus("Zlyhalo", "Prázdna správa");
//             return false;
//         }
        
//         // 5. Odoslanie na Telegram
//         var sendToTelegramResult = utils.sendToTelegram(telegramData.chatId, message, telegramData.threadId);
        
//         if (!sendResult.success) {
//             utils.addError(notificationEntry, "Odoslanie zlyhalo: " + sendResult.error, "main");
//             utils.updateStatus("Zlyhalo", sendResult.error);
//             return false;
//         }
        
//         // 6. Aktualizácia záznamu po úspešnom odoslaní
//         updateAfterSuccess(sendResult, telegramData);
        
//         // 7. Aktualizácia info poľa zdrojového záznamu
//         updateSourceEntryInfo(sendResult, telegramData);
        
//         utils.addDebug(notificationEntry, utils.getIcon("success") + " === NOTIFIKÁCIA ÚSPEŠNE ODOSLANÁ ===");
        
//         return true;
        
//     } catch (error) {
//         utils.addError(notificationEntry, "Kritická chyba v hlavnej funkcii", "main", error);
//         updateStatus("Chyba", error.toString());
//         return false;
//     }
// }

// ==============================================
// FINÁLNY SÚHRN
// ==============================================
function markCheckbox() {
    try {
        utils.safeSet(currentEntry, CONFIG.fields.obligations.obligations, true);
        utils.addDebug(currentEntry, "☑️ Checkbox Záväzky označený");
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri označovaní checkboxu: " + error.toString(), "markCheckbox");
    }
}

function logFinalSummary(steps) {
   
    try {
        utils.addDebug(currentEntry, "\n📊 === FINÁLNY SÚHRN ===");
        
        var allSuccess = true;
        for (var step in steps) {
            var status = steps[step].success ? "✅" : "❌";
            utils.addDebug(currentEntry, status + " " + steps[step].name);
            if (!steps[step].success) allSuccess = false;
        }
        
        if (allSuccess) {
            utils.addDebug(currentEntry, "\n🎉 === VŠETKY KROKY ÚSPEŠNÉ ===");
        } else {
            utils.addDebug(currentEntry, "\n⚠️ === NIEKTORÉ KROKY ZLYHALI ===");
        }
        
        utils.addDebug(currentEntry, "⏱️ Čas ukončenia: " + moment().format("HH:mm:ss"));
        utils.addDebug(currentEntry, "📋 === KONIEC " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "logFinalSummary", error);
    }
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        var depCheck = utils.checkDependencies(['config', 'core', 'business']);
        if (!depCheck.success) {
            utils.addError(currentEntry, "Chýbajú potrebné moduly: " + depCheck.missing.join(", "), "main");
            message("❌ Chýbajú potrebné moduly!\n\n" + depCheck.missing.join(", "));
            return false;
        }
        utils.clearLogs(currentEntry, true);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.entryIcons, "");
        utils.addDebug(currentEntry, "=== DOCHÁDZKA PREPOČET ===");
        utils.addDebug(currentEntry, "MementoUtils verzia: " + utils.version);
        // Kontrola závislostí
         // KONTROLA ČI MÁ SCRIPT BEŽAŤ
         var entryStatus = utils.safeGet(currentEntry, CONFIG.fields.attendance.entryStatus, []);
         var entryIcons = utils.safeGet(currentEntry, CONFIG.fields.attendance.entryIcons, null);
         
         if (entryStatus.indexOf("Voľno") !== -1) {
            message("Záznam je nastavený na: " + utils.safeGet(currentEntry, CONFIG.fields.attendance.dayOffReason));
            var dayOffReason = utils.safeGet(currentEntry, CONFIG.fields.attendance.dayOffReason, null);
            if (dayOffReason === "Dažď") {
                utils.safeSet(currentEntry, CONFIG.fields.attendance.entryIcons, CONFIG.icons.weather_delay);
            } else if (dayOffReason === "Voľný deň") {
                utils.safeSet(currentEntry, CONFIG.fields.attendance.entryIcons, CONFIG.icons.vacation);
            } else if (dayOffReason === "Dovolenka") {
                utils.safeSet(currentEntry, CONFIG.fields.attendance.entryIcons, CONFIG.icons.vacation);
            } else if (dayOffReason === "Voľno - mokrý terén") {
                utils.safeSet(currentEntry, CONFIG.fields.attendance.entryIcons, CONFIG.icons.soil_wet);
            }
            utils.setColor(currentEntry, "bg", "light gray");
            exit();
        }

        // Debug info o načítaných moduloch
        utils.addDebug(currentEntry, "=== ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===", "start");
        utils.addDebug(currentEntry, "Čas spustenia: " + utils.formatDate(moment()) ,"calendar");
        var calculationsResults = {
            attendance: {
                workedTime: "", // napr. 7:00-13:45
                employeesCount: 0, // Počet zamestnancov v zázname dochádzky
                workTime: 0, // pracovná doba
                workedHours:0, // odpracované - čas pracovnej doby za všetkých zamestnancov
                wageCosts: 0 // mzdové náklady za dochádzku
                
            },
            obligations: {
                count: 0,
                total: 0
            },
            workRecords: {
                count: 0,
                orders: [], // zákazky 
                workedOnOrders: 0, // odpracované na zákazkách
                wageCosts: 0, // mzdové náklady na zákazkách
                hzsSum: 0, // suma za hzs
                downTime: 0 // prestoje
            },
            bookOfRides: {
                count: 0,
                
            },
            cashBook: {
                count: 0,
                incomesCount: 0,
                expensesCount: 0,
                incomesSum: 0,
                expensesSum: 0,
                total: 0,
            },
            notiifications: {}
        }
         // Kroky prepočtu
        var steps = {
            step1: { success: false, name: "Načítanie a validácia dát" },
            step2: { success: false, name: "Výpočet pracovnej doby" },
            step3: { success: false, name: "Spracovanie zamestnancov" },
            step4: { success: false, name: "Linkovanie pracovných záznamov" },
            step5: { success: false, name: "Linkovanie dopravy" },
            step6: { success: false, name: "Linkovanie záznamov pokladne" },
            step7: { success: false, name: "Celkové výpočty" },
            step8: { success: false, name: "Vytvorenie info záznamu" },
            step9: { success: false, name: "Vytvorenie Telegram notifikácie" },
        };

        // KROK 1: Načítanie a validácia dát
        utils.addDebug(currentEntry, " KROK 1: Načítanie a validácia dát", "validation");
        var validationResult = validateInputData();  // ✅ Volaj bez parametrov
        if (!validationResult.success) {
            utils.addError(currentEntry, "Validácia zlyhala: " + validationResult.error, CONFIG.scriptName);
            message("❌ " + validationResult.error);
            return false;
        }
        steps.step1.success = true;

        // KROK 2: Výpočet pracovného času
        utils.addDebug(currentEntry, " KROK 2: Výpočet pracovnej doby", "update");
        
        var workTimeResult = calculateWorkTime(validationResult.arrival,validationResult.departure);    
        if (!workTimeResult.success) {
            utils.addError(currentEntry, "Výpočet času zlyhal: " + workTimeResult.error, CONFIG.scriptName);
            return false;
        }
        steps.step2.success = workTimeResult.success;
        
        // KROK 3: Spracovanie zamestnancov
        utils.addDebug(currentEntry, " KROK 3: Spracovanie zamestnancov", "group");
        var employeeResult = processEmployees(validationResult.employees, workTimeResult.pracovnaDobaHodiny, validationResult.date);
        if(employeeResult.success) {
            if (entryStatus.indexOf("Záväzky") === -1) {
                 entryStatus.push("Záväzky");
                }
            if(employeeResult.created || employeeResult.updated > 0){
                entryIcons += CONFIG.icons.obligations;
            }
        }
        steps.step3.success = employeeResult.success;
        
        // KROK 4: Linkovanie pracovných záznamov
        utils.addDebug(currentEntry, " KROK 4: Linkovanie pracovných záznamov", "work");
        var workLinkResult = linkWorkRecords();
        if (workLinkResult.success) {
            if (entryStatus.indexOf("Práce") === -1) {
                entryStatus.push("Práce");
                utils.addDebug(currentEntry, "📋 Linkovanie dokončené: " + workLinkResult.linkedCount + " záznamov");   
            }
            if (workLinkResult.linkedCount > 0) {
                entryIcons += CONFIG.icons.work;
            }
        } else {
            utils.addError(currentEntry, "Linkovanie pracovných záznamov neúspešné", CONFIG.scriptName);
        }
        steps.step4.success = workLinkResult.success;

        // KROK 5: Linkovanie dopravných záznamov
        utils.addDebug(currentEntry, " KROK 5: Linkovanie dopravy", "truck");
        var rideLogLinkResult = linkRideLogRecords();
        if (rideLogLinkResult.success) {
            if (entryStatus.indexOf("Doprava") === -1) {
                entryStatus.push("Doprava");
            }
            utils.addDebug(currentEntry, "📋 Linkovanie dokončené: " + rideLogLinkResult.linkedCount + " záznamov");   
            if (rideLogLinkResult.linkedCount > 0) {
                entryIcons += CONFIG.icons.truck;
            }
        } else {
            utils.addError(currentEntry, "Linkovanie záznamov dopravy neúspešné", CONFIG.scriptName);
        }
        steps.step5.success = rideLogLinkResult.success;
        
        // KROK 6: Linkovanie záznamov pokladne
        utils.addDebug(currentEntry, " KROK 6: Linkovanie záznamov pokladne", "payment");
        var cashBookResult = linkCashBookRecords();
        if (cashBookResult.success) {
            if (entryStatus.indexOf("Pokladňa") === -1) {
                entryStatus.push("Pokladňa");
            }
            utils.addDebug(currentEntry, "📋 Linkovanie dokončené: " + cashBookResult.linkedCount + " záznamov");   
            if (cashBookResult.linkedCount > 0) {
                entryIcons += CONFIG.icons.payment;
            }
        } else {
            utils.addError(currentEntry, "Linkovanie záznamov dopravy neúspešné", CONFIG.scriptName);
        }
        steps.step6.success = cashBookResult.success;

        // KROK 7: Celkové výpočty
        utils.addDebug(currentEntry, " KROK 7: Celkové výpočty", "calculation");
        var totals = setEntryFields(employeeResult, workLinkResult, rideLogLinkResult, cashBookResult, entryIcons, entryStatus)
        steps.step7.success = totals.success;
        
        // KROK 8: Vytvorenie info záznamu
        utils.addDebug(currentEntry, " KROK 8: Vytvorenie info záznamu", "note");
        steps.step8.success = createInfoRecord(workTimeResult, employeeResult);
            
        // KROK 9: Vytvorenie Telegram notifikácie
        utils.addDebug(currentEntry, utils.getIcon("notification") + " KROK 9: Vytvorenie Telegram notifikácie", "note");

        // Najprv získaj údaje z linkovaných záznamov
        var linkedData = collectLinkedRecordsData();

        // Potom zavolaj funkciu s novým parametrom
        var notificationRecord = prepareNotificationInfoRecord(workTimeResult, employeeResult, linkedData);
        steps.step9.success = notificationRecord.success;
        if (steps.step9.success) {
            // Odstráň staré notifikácie pred vytvorením novej
            var existingNotifications = utils.getLinkedNotifications(currentEntry);
            if (existingNotifications.length > 0) {
                utils.addDebug(currentEntry, utils.getIcon("delete") + " Mažem " + existingNotifications.length + " existujúcich notifikácií");
                for (var i = 0; i < existingNotifications.length; i++) {
                    utils.deleteNotificationAndTelegram(existingNotifications[i]);
                }
            }
            
            // Vytvor novú notifikáciu
            var newNotification = utils.createTelegramMessage(currentEntry);
            if (newNotification.success) {
                // Pridaj ikonu notifikácie
                entryStatus.push("Notifikácia");
                entryIcons += CONFIG.icons.notification;
                utils.addDebug(currentEntry, utils.getIcon("success") + " Záznam notifikácie úspešne vytvorený");
                utils.safeSet(currentEntry,CONFIG.fields.attendance.entryIcons, entryIcons)
                utils.safeSet(currentEntry,CONFIG.fields.attendance.entryStatus, entryStatus);
                // Vytvor inline keyboard
                var recordId = utils.safeGet(currentEntry, CONFIG.fields.common.id);
                //var recordDate = utils.formatDate(currentEntry.field(CONFIG.fields.date));
                var buttons = [{
                    text: "✅ Potvrdiť",
                    callback_data: "confirm_attendance_" + recordId
                },
                {
                    text: "⚠️ Rozporovať", 
                    callback_data: "dispute_attendance_" + recordId
                }
                ];
                // Vytvor inline keyboard (vráti pole, nie objekt)
                var inlineKeyboard = utils.createInlineKeyboard(buttons, 2);
                // Odošli na Telegram
                var sendToTelegramResult = utils.sendNotificationEntry(newNotification.notification, inlineKeyboard);

                if (sendToTelegramResult.success) {
                    entryStatus.push("Telegram");
                    entryIcons += CONFIG.icons.telegram;
                    utils.addDebug(currentEntry, utils.getIcon("success") + " Telegram notifikácia úspešne odoslaná");
                    utils.safeSet(currentEntry,CONFIG.fields.attendance.entryIcons, entryIcons);
                    utils.safeSet(currentEntry,CONFIG.fields.attendance.entryStatus, entryStatus);
                } else {
                    utils.addError(currentEntry, "Nepodarilo sa odoslať notifikáciu na Telegram", "step9");
                }
            } else {
                utils.addError(currentEntry, "Nepodarilo sa vytvoriť notifikáciu", "step9");
            }
        }

        return true;
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        message("❌ Kritická chyba! Line: " + error.lineNumber + ": " + error.toString());
        return false;
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

// Spustenie hlavnej funkcie
var result = main();

// Ak hlavná funkcia zlyhala, zruš uloženie
if (!result) {
    utils.addError(currentEntry, "Script zlyhal - zrušené uloženie", "main");
    cancel();
} else {
    // Zobraz súhrn užívateľovi
    zobrazSuhrn();
}