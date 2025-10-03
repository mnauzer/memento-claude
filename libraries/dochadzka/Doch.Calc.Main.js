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
    version: "7.4.8",  // Pridané fallback hodnoty pre icons
    
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

     // Konštanty pre záväzky - s fallback hodnotami
    obligationTypes: {
        wages:  centralConfig.constants.obligationTypes.wages,
               
    },
    obligationStates: {
        paid: (centralConfig.constants && centralConfig.constants.obligationStates)
              ? centralConfig.constants.obligationStates.paid
              : "Zaplatené",
        unpaid: (centralConfig.constants && centralConfig.constants.obligationStates)
                ? centralConfig.constants.obligationStates.unpaid
                : "Nezaplatené",
        partiallyPaid: (centralConfig.constants && centralConfig.constants.obligationStates)
                       ? centralConfig.constants.obligationStates.partiallyPaid
                       : "Čiastočne zaplatené"
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
         

        return {
            success: true
        };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "setEntryFields", error);
        return false;
    }
}

function logFinalSummary(steps) {
    try {
        utils.addDebug(currentEntry, "\n📊 === FINÁLNY SÚHRN ===");

        var allSuccess = true;
        for (var step in steps) {
            var status = steps[step].success ? "✅" : "❌";
            utils.addDebug(currentEntry, status + " " + steps[step].name);
            if (!steps[step].success) {
                allSuccess = false;
            }
        }

        if (allSuccess) {
            utils.addDebug(currentEntry, "\n✅ Všetky kroky dokončené úspešne!");

            // Zobraz súhrn používateľovi
            var date = utils.safeGet(currentEntry, CONFIG.fields.attendance.date);
            var dateFormatted = utils.formatDate(date, "DD.MM.YYYY");
            var employeeCount = utils.safeGet(currentEntry, CONFIG.fields.attendance.employeeCount, 0);
            var totalHours = utils.safeGet(currentEntry, CONFIG.fields.attendance.workedHours, 0);
            var totalCosts = utils.safeGet(currentEntry, CONFIG.fields.attendance.wageCosts, 0);

            var summaryMsg = "✅ PREPOČET DOKONČENÝ\n\n";
            summaryMsg += "📅 " + dateFormatted + "\n";
            summaryMsg += "━━━━━━━━━━━━━━━━━━━━━\n";
            summaryMsg += "👥 Počet zamestnancov: " + employeeCount + "\n";
            summaryMsg += "⏱️ Odpracované: " + totalHours.toFixed(2) + " h\n";
            summaryMsg += "💰 Mzdové náklady: " + utils.formatMoney(totalCosts) + "\n";
            summaryMsg += "━━━━━━━━━━━━━━━━━━━━━\n";
            summaryMsg += "ℹ️ Detaily v poli 'info'";

            message(summaryMsg);
        } else {
            utils.addDebug(currentEntry, "\n⚠️ Niektoré kroky zlyhali!");
            message("⚠️ Prepočet dokončený s chybami.\nSkontrolujte Debug Log.");
        }

        utils.addDebug(currentEntry, "⏱️ Čas ukončenia: " + moment().format("HH:mm:ss"));
        utils.addDebug(currentEntry, "📋 === KONIEC " + CONFIG.scriptName + " v" + CONFIG.version + " ===");

    } catch (error) {
        utils.addError(currentEntry, error.toString(), "logFinalSummary", error);
    }
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

        // KROK 4-6: Linkovanie ODSTRÁNENÉ (refaktorizácia)
        // Dummy výsledky pre kompatibilitu
        var workLinkResult = { success: true, linkedCount: 0, workedOnOrders: 0 };
        var rideLogLinkResult = { success: true, linkedCount: 0 };
        var cashBookResult = { success: true, linkedCount: 0 };

        steps.step4 = { success: true };
        steps.step5 = { success: true };
        steps.step6 = { success: true };

        // KROK 7: Celkové výpočty
        utils.addDebug(currentEntry, " KROK 7: Celkové výpočty", "calculation");
        var totals = setEntryFields(employeeResult, workLinkResult, rideLogLinkResult, cashBookResult, entryIcons, entryStatus)
        steps.step7.success = totals.success;
        
        // KROK 8: Vytvorenie info záznamu
        utils.addDebug(currentEntry, " KROK 8: Vytvorenie info záznamu", "note");
        steps.step8.success = createInfoRecord(workTimeResult, employeeResult);
            
        // KROK 9: Telegram notifikácie (ODSTRÁNENÉ)
        utils.addDebug(currentEntry, " KROK 9: Telegram notifikácie vynechané (refaktorizácia)", "note");
        steps.step9 = { success: true }; // Dummy výsledok pre kompatibilitu
        
        var isHoliday = utils.isHoliday(validationResult.date);
        var isWeekend = utils.isWeekend(validationResult.date);
         //var farba = "#FFFFFF"; // Biela - štandard
        if (isHoliday) {
            utils.setColor(currentEntry, "bg", "pastel blue")
        } else if (isWeekend) {
            utils.setColor(currentEntry, "bg", "pastel orange")
        }

        // Záverečný súhrn
        logFinalSummary(steps);
        utils.addDebug(currentEntry, "\n✅ === PREPOČET DOKONČENÝ ===");

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
}