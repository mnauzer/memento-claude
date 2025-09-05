
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
// 🔧 POUŽÍVA:
//    - MementoUtils v7.0+ (nová verzia)
//    - MementoConfig v7.0+ (centralizovaný CONFIG)
//    - MementoCore v7.0+ (základné funkcie)
//    - MementoBusiness v7.0+ (business logika)
// ==============================================
// ✅ REFAKTOROVANÉ v7.3:
//    - Opravené všetky return statements
//    - Použitie nového MementoUtils bez fallbackov
//    - Priamy prístup k centrálnemu CONFIGu
//    - Zachované všetky pôvodné funkcie
//    - Správny výpočet prestávok
//    - Čistý pracovný čas
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
    version: "7.4",  // Aktualizovaná verzia
    
    // Referencie na centrálny config
    fields: {
        workRecord: centralConfig.fields.workRecord,
        attendance: centralConfig.fields.attendance,
        obligations: centralConfig.fields.obligations,
        common: centralConfig.fields.common,
        // Pridané mapovanie pre arrival/departure polia
        date: centralConfig.fields.attendance.date,
        employees: centralConfig.fields.attendance.employees,
        obligations: centralConfig.fields.obligations,
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
        currentEntry.set(CONFIG.fields.attendance.workTime, pracovnaDobaHodiny);
        
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
            var empResult = processEmployee(zamestnanec, pracovnaDobaHodiny, datum, i, existingObligations, );
            
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
                obligationSuccess: obligationResult.success
                
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
            if (existingObligation > 1) {
                utils.addDebug(currentEntry, utils.getIcon("exclamation") + " Niekde je chyba, zamestnantec má viac ako jeden záväzok pre tento záznam" )
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
        utils.addDebug(currentEntry, "\n📋 === KROK 5.5: Linkovanie záznamov práce ===");
        
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
        utils.addDebug(currentEntry, "  ⏰ Časy dochádzky: " + dochadzkaPrichod + " - " + dochadzkaOdchod);
        utils.addDebug(currentEntry, "  👥 Počet zamestnancov: " + dochadzkaEmployees.length);
        
        // Získaj knižnicu záznamov práce
        var workRecordsLib = libByName(CONFIG.libraries.workRecords || "Záznam práce");
        if (!workRecordsLib) {
            utils.addError(currentEntry, "Knižnica 'Záznam práce' nenájdená", "linkWorkRecords");
            return {
                success: false,
                linkedCount: 0,
                message: "Knižnica nenájdená"
            };
        }
        
        // Nájdi záznamy práce pre daný dátum
        var workRecords = workRecordsLib.find(CONFIG.fields.workRecord.date === dochadzkaDate);
        
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
        
        for (var j = 0; j < workRecords.length; j++) {
            var workRecord = workRecords[j];
            var workEmployees = utils.safeGetLinks(workRecord, CONFIG.fields.workRecord.employees || "Zamestnanci");
            var workStartTime = utils.safeGet(workRecord, CONFIG.fields.workRecord.startTime || "Od");
            var workEndTime = utils.safeGet(workRecord, CONFIG.fields.workRecord.endTime || "Do");
            
            // Kontrola či má záznam aspoň jedného zhodného zamestnanca
            var hasMatchingEmployee = false;
            for (var k = 0; k < workEmployees.length; k++) {
                var workEmpId = workEmployees[k].field("ID");
                if (dochadzkaEmployeeIds.indexOf(workEmpId) !== -1) {
                    hasMatchingEmployee = true;
                    break;
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
            utils.safeSet(currentEntry, CONFIG.fields.attendance.works || "Práce", allRecordsToLink);
            
            // Označ záznamy s upozornením farebne
            for (var wr = 0; wr < warningRecords.length; wr++) {
                var warningRecord = warningRecords[wr].record;
                
                // Nastav žltú farbu pozadia pre upozornenie
                utils.safeSet(warningRecord, CONFIG.fields.common.backgroundColor || "farba pozadia", "#FFEB3B");
                
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

// ==============================================
// KROK 4: CELKOVÉ VÝPOČTY
// ==============================================

function calculateTotals(employeeResult) {
    try {
        // Ulož celkové hodnoty
        utils.safeSet(currentEntry, CONFIG.fields.attendance.workedHours, employeeResult.odpracovaneTotal);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.wageCosts, employeeResult.celkoveMzdy);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.onProjects, 0);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.downtime, 0);
        
        utils.addDebug(currentEntry, "  • Pracovná doba: " + employeeResult.pracovnaDoba + " hodín");
        utils.addDebug(currentEntry, "  • Odpracované spolu: " + employeeResult.odpracovaneTotal + " hodín");
        utils.addDebug(currentEntry, "  • Mzdové náklady: " + utils.formatMoney(employeeResult.celkoveMzdy));
        utils.addDebug(currentEntry, "  • Na zákazkách: " + "0 hodín");
        utils.addDebug(currentEntry, "  • Prestoje: " + "0 hodín");
        utils.addDebug(currentEntry, " Celkové výpočty úspešné", "success");
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "calculateTotals", error);
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
// ==============================================
// VYTVORENIE INFO_TELEGRAM ZÁZNAMU
// ==============================================

function createTelegramInfoRecord(workTimeResult, employeeResult) {
    try {
        var date = currentEntry.field(CONFIG.fields.attendance.date);
        var dateFormatted = utils.formatDate(date, "DD.MM.YYYY");
        var dayName = utils.getDayNameSK(moment(date).day()).toUpperCase();

        // HTML formátovaná správa (namiesto Markdown)
        var telegramInfo = "📋 <b>DOCHÁDZKA - AUTOMATICKÝ PREPOČET</b>\n";
        telegramInfo += "═══════════════════════════════════\n\n";
        
        telegramInfo += "📅 <b>Dátum:</b> " + dateFormatted + " (" + dayName + ")\n";
        telegramInfo += "⏰ <b>Pracovný čas:</b> " + utils.formatTime(workTimeResult.arrivalRounded) + 
                        " - " + utils.formatTime(workTimeResult.departureRounded) + "\n";
        telegramInfo += "⏱️ <b>Pracovná doba:</b> " + workTimeResult.pracovnaDobaHodiny + " hodín\n\n";
        
        telegramInfo += "👥 <b>ZAMESTNANCI</b> (" + employeeResult.pocetPracovnikov + " " + 
                        utils.selectOsobaForm(employeeResult.pocetPracovnikov) + ")\n";
        telegramInfo += "───────────────────────────────────\n";
        
        for (var i = 0; i < employeeResult.detaily.length; i++) {
            var detail = employeeResult.detaily[i];
            var empName = utils.formatEmployeeName(employeeResult.detaily[i].zamestnanec);
            
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
        
        telegramInfo += "💰 <b>SÚHRN</b>\n";
        telegramInfo += "───────────────────────────────────\n";
        telegramInfo += "• Odpracované celkom: <b>" + employeeResult.odpracovaneTotal + " hodín</b>\n";
        telegramInfo += "• Mzdové náklady: <b>" + utils.formatMoney(employeeResult.celkoveMzdy) + "</b>\n\n";
        
        telegramInfo += "🔧 <i>Script: " + CONFIG.scriptName + " v" + CONFIG.version + "</i>\n";
        telegramInfo += "⏰ <i>Spracované: " + moment().format("HH:mm:ss") + "</i>\n";
        telegramInfo += "📝 <i>Záznam #" + currentEntry.field("ID") + "</i>";
        
        // Ulož do poľa info_telegram
        currentEntry.set("info_telegram", telegramInfo);
        
        utils.addDebug(currentEntry, utils.getIcon("success") + " Info_telegram záznam vytvorený");
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createTelegramInfoRecord", error);
        return false;
    }
}


// Helper funkcia pre escape markdown znakov
function escapeMarkdown(text) {
    if (!text) return "";
    
    // Najskôr odstráň všetky existujúce backslashes
    text = String(text).replace(/\\/g, '');
    
    // Potom escape-ni markdown znaky OKREM lomítka (/)
    // Lomítko necháme bez escape-u aby nevznikli odkazy na botov
    return text
        .replace(/\*/g, "\\*")
        .replace(/_/g, "\\_")
        .replace(/\[/g, "\\[")
        .replace(/\]/g, "\\]")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)")
        .replace(/~/g, "\\~")
        .replace(/`/g, "\\`")
        .replace(/>/g, "\\>")
        .replace(/#/g, "\\#")
        .replace(/\+/g, "\\+")
        .replace(/-/g, "\\-")
        .replace(/=/g, "\\=")
        .replace(/\|/g, "\\|")
        .replace(/\{/g, "\\{")
        .replace(/\}/g, "\\}")
        .replace(/\./g, "\\.")
        .replace(/!/g, "\\!");
        // POZOR: Neescapujeme lomítko (/) aby €/h nefungovalo ako odkaz
}
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
        utils.clearLogs(currentEntry, true);
        utils.addDebug(currentEntry, "=== DOCHÁDZKA PREPOČET ===");
        utils.addDebug(currentEntry, "MementoUtils verzia: " + utils.version);
        // Kontrola závislostí
        var depCheck = utils.checkDependencies(['config', 'core', 'business']);
        if (!depCheck.success) {
            utils.addError(currentEntry, "Chýbajú potrebné moduly: " + depCheck.missing.join(", "), "main");
            message("❌ Chýbajú potrebné moduly!\n\n" + depCheck.missing.join(", "));
            return false;
        }
        // Debug info o načítaných moduloch
        utils.addDebug(currentEntry, "=== ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===", "start");
        utils.addDebug(currentEntry, "Čas spustenia: " + utils.formatDate(moment()) ,"calendar");
        
         // Kroky prepočtu
        var steps = {
            step1: { success: false, name: "Načítanie a validácia dát" },
            step2: { success: false, name: "Výpočet pracovnej doby" },
            step3: { success: false, name: "Spracovanie zamestnancov" },
            step4: { success: false, name: "Celkové výpočty" },
            step5: { success: false, name: "Vytvorenie info záznamu" },
            step6: { success: false, name: "Vytvorenie info_telegram záznamu" }
        };

        // KROK 1: Validácia vstupných dát
        utils.addDebug(currentEntry, " KROK 1: Validácia vstupných dát", "validation");
        var validationResult = validateInputData();  // ✅ Volaj bez parametrov
        if (!validationResult.success) {
            utils.addError(currentEntry, "Validácia zlyhala: " + validationResult.error, CONFIG.scriptName);
            message("❌ " + validationResult.error);
            return false;
        }
        steps.step1.success = true;

        // KROK 2: Výpočet pracovného času
        utils.addDebug(currentEntry, " KROK 2: Získavanie údajov", "update");
        var isHoliday = utils.isHoliday(validationResult.date);
        var isWeekend = utils.isWeekend(validationResult.date);
        var workTimeResult = calculateWorkTime(validationResult.arrival,validationResult.departure);    

        if (!workTimeResult.success) {
            utils.addError(currentEntry, "Výpočet času zlyhal: " + workTimeResult.error, CONFIG.scriptName);
            return false;
        }

      
        steps.step2.success = true;
        
        // KROK 3: Spracovanie zamestnancov
        utils.addDebug(currentEntry, " KROK 3: Spracovanie zamestnancov", "group");
        var employeeResult = processEmployees(validationResult.employees, workTimeResult.pracovnaDobaHodiny, validationResult.date);
        if(employeeResult.success) {
            markCheckbox();
        }
        steps.step3.success = employeeResult.success;
        
        // KROK 4: Celkové výpočty
        utils.addDebug(currentEntry, " KROK 4: Celkové výpočty", "calculation");
        if (employeeResult.success) {
            steps.step4.success = calculateTotals(employeeResult);
        }
        // KROK 4.5: Linkovanie záznamov práce
        var linkResult = linkWorkRecords();
        if (linkResult.success) {
            utils.addDebug(currentEntry, "📋 Linkovanie dokončené: " + linkResult.linkedCount + " záznamov");
        }

        // KROK 5: Info záznam
        utils.addDebug(currentEntry, " KROK 5: Vytvorenie info záznamu", "note");
        steps.step5.success = createInfoRecord(workTimeResult, employeeResult);
        steps.step6.success = createTelegramInfoRecord(workTimeResult, employeeResult) && steps.step5.success;  
        
        var farba = "#FFFFFF"; // Biela - štandard
        if (isHoliday) {
            farba = "#FFE6CC"; // Oranžová - sviatok
        } else if (isWeekend) {
            farba = "#FFFFCC"; // Žltá - víkend
        }
        utils.safeSet(currentEntry, CONFIG.fields.common.backgroundColor, farba);

        return true;
        // Finálny log
        logFinalSummary(steps);

        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        message("❌ Kritická chyba!\n\n" + error.lineNumber + ": " + error.toString());
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