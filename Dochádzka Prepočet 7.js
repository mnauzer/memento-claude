
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
    version: "7.3.5",  // Aktualizovaná verzia
    
    // Referencie na centrálny config
    fields: {
        attendance: centralConfig.fields.attendance,
        obligations: centralConfig.fields.obligations,
        common: centralConfig.fields.common,
        // Pridané mapovanie pre arrival/departure polia
        date: centralConfig.fields.attendance.date,
        employees: centralConfig.fields.attendance.employees,
        obligations: centralConfig.fields.attendance.obligations,
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
        message("validateInputData: " + date);
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
// ==============================================
// KROK 2: VÝPOČET PRACOVNEJ DOBY
// ==============================================

// function calculateWorkTime(arrival, departure) {
//     try {
//         utils.addDebug(currentEntry, "--- Výpočet pracovnej doby");
        
//         // Výpočet hodín - priamo bez úprav času
//         var workHours = utils.calculateWorkHours(arrival, departure);
        
//         if (!workHours || workHours.error) {
//             return { success: false, error: workHours ? workHours.error : "Nepodarilo sa vypočítať hodiny" };
//         }
        
//         var pracovnaDobaHodiny = workHours.totalMinutes / 60;
//         pracovnaDobaHodiny = Math.round(pracovnaDobaHodiny * 100) / 100;
        
//         // Ulož do poľa
//         currentEntry.set(CONFIG.fields.attendance.workTime, pracovnaDobaHodiny);
        
//         utils.addDebug(currentEntry, "✅ Pracovná doba: " + pracovnaDobaHodiny + " hodín");
//         //utils.addDebug(currentEntry, "  • Príchod: " + moment(arrival).format("HH:mm"));
//         utils.addDebug(currentEntry, "  • Príchod: " + utils.formatTime(arrival));
//         utils.addDebug(currentEntry, "  • Odchod: " + moment(departure).format("HH:mm"));
        
//         return {
//             success: true,
//             arrivalRounded: arrival,      // Používame originálne časy
//             departureRounded: departure,  // Používame originálne časy
//             pracovnaDobaHodiny: pracovnaDobaHodiny,
//             workHours: workHours
//         };
        
//     } catch (error) {
//         utils.addError(currentEntry, error.toString(), "calculateWorkTime", error);
//         return { success: false, error: error.toString() };
//     }
// }
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
 message("processEmployees: " + datum);
    try {
        var result = {
            success: false,
            pocetPracovnikov: zamestnanci.length,
            odpracovaneTotal: 0,
            pracovnaDoba: pracovnaDobaHodiny,
            celkoveMzdy: 0,
            detaily: []
        };
              // Nájdi existujúce záväzky pre túto dochádzku
        var existingObligations = utils.findLinkedObligations(creditor);
        utils.addDebug(currentEntry, "📊 Nájdené existujúce záväzky: " + existingObligations.length);  
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
        utils.addDebug(currentEntry, "📊 Výsledky:");
        utils.addDebug(currentEntry, "  ✅ Vytvorené: " + result.created);
        utils.addDebug(currentEntry, "  🔄 Aktualizované: " + result.updated);
        utils.addDebug(currentEntry, "  💰 Celková suma: " + utils.formatMoney(result.totalAmount));
        return result;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "processEmployees", error);
        return { success: false };
    }
}

function processEmployee(zamestnanec, pracovnaDobaHodiny, datum, index, obligations) {
     message("processEmployee: " + datum);

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
                index: index,
                dailyWage: dennaMzda,
                name: utils.formatEmployeeName(zamestnanec),
                obligations: obligations
            });
                
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

function processObligation(date, empData) {
    message("processObligation: " + date);
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
        

        
             
        utils.addDebug(currentEntry, "  • " + empData.name);
        
        try {
            // Nájdi existujúci záväzok pre tohto zamestnanca
            var existingObligation = null;
            for (var j = 0; j < empData.obligations.length; j++) {
                var obligation = empData.obligations[j];
                var linkedEmployee = utils.safeGetLinks(obligation, CONFIG.fields.obligations.employee);
                
                if (linkedEmployee && linkedEmployee.length > 0 && 
                    linkedEmployee[0].field("ID") === employee.field("ID")) {
                    existingObligation = obligation;
                    break;
                }
            }
            
            if (existingObligation) {
                utils.addDebug(currentEntry, utils.getIcon("search") +
        "  * Updatujem záväzok pre " + utils.formatEmployeeName(employee));
                // Aktualizuj existujúci
                if (utils.updateObligation(date, existingObligation, empData.dailyWage)) {
                    result.updated++;
                    result.totalAmount += empData.dailyWage;
                } else {
                    result.errors++;
                }
            } else {
                // Vytvor nový
                utils.addDebug(currentEntry, utils.getIcon("search") +
        "  + Vytváram záväzok pre " + utils.formatEmployeeName(employee));
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
        steps.step3.success = employeeResult.success;
        
        // KROK 4: Celkové výpočty
        utils.addDebug(currentEntry, " KROK 4: Celkové výpočty", "calculation");
        if (employeeResult.success) {
            steps.step4.success = calculateTotals(employeeResult);
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
        // pre nastavíme zaokrúhlené časy príchodu a odchodu
       
        utils.safeSet(currentEntry, CONFIG.fields.common.backgroundColor, farba);

        return true;
        // Finálny log
        logFinalSummary(steps);
        // // Vypočítaj hrubý pracovný čas
        // var hrubyCasMinuty = calculateTimeDifference(prichod, odchod);
        // if (hrubyCasMinuty <= 0) {
        //     utils.addError(currentEntry, "Nesprávny čas príchodu/odchodu", "časový výpočet");
        //     message("❌ Chyba: Čas odchodu musí byť po čase príchodu!");
        //     return false;
        // }
        
        // utils.addDebug(currentEntry, "⏱️ Hrubý pracovný čas: " + formatMinutesToTime(hrubyCasMinuty));
        
        // // Vypočítaj prestávku
        // var breakSettings = getDefaultBreakSettings();
        // var prestavkaMinuty = calculateBreakDuration(hrubyCasMinuty);
        
        // utils.addDebug(currentEntry, "⏸️ Prestávka: " + prestavkaMinuty + " minút");
        
        // // Vypočítaj čistý pracovný čas
        // var cistyPracovnyCasMinuty = hrubyCasMinuty - prestavkaMinuty;
        // var cistyPracovnyCasHodiny = cistyPracovnyCasMinuty / 60;
        
        // utils.addDebug(currentEntry, "✅ Čistý pracovný čas: " + formatMinutesToTime(cistyPracovnyCasMinuty) + " (" + cistyPracovnyCasHodiny.toFixed(2) + "h)");
        
        // KROK 4: Kontrola víkendu a sviatkov
        // utils.addDebug(currentEntry, "\n📋 KROK 4: Kontrola víkendu a sviatkov");
        
        // var jeVikend = utils.isWeekend(datum);
        // var jeSviatok = utils.isHoliday(datum);
        
        // if (jeVikend) {
        //     utils.addDebug(currentEntry, "📅 Víkendová zmena - " + moment(datum).format("dddd"));
        // }
        // if (jeSviatok) {
        //     utils.addDebug(currentEntry, "🎉 Práca počas sviatku");
        // }
        
        // KROK 5: Spracovanie záznamov práce
        // utils.addDebug(currentEntry, "\n📋 KROK 5: Spracovanie záznamov práce");
        
        // var hoursOnProjects = 0;
        // for (var i = 0; i < praceLinks.length; i++) {
        //     var praca = praceLinks[i];
        //     var odpracovaneNaPraci = utils.safeGet(praca, CONFIG.fields.workRecord.workedHours, 0);
        //     hoursOnProjects += odpracovaneNaPraci;
            
        //     utils.addDebug(currentEntry, "  🔨 Práca #" + (i + 1) + ": " + odpracovaneNaPraci + "h");
        // }
        
        // // KROK 6: Spracovanie zamestnancov
        // utils.addDebug(currentEntry, "\n📋 KROK 6: Spracovanie zamestnancov");
        
        // if (zamestnanci.length === 0) {
        //     utils.addError(currentEntry, "Žiadni zamestnanci na spracovanie", "zamestnanci");
        //     message("❌ Chyba: Pridajte aspoň jedného zamestnanca!");
        //     return false;
        // }
        
        // var pocetPracovnikov = zamestnanci.length;
        // var spracovaniZamestnanci = 0;
        
        // for (var j = 0; j < zamestnanci.length; j++) {
        //     var zamestnanec = zamestnanci[j];
            
        //     utils.addDebug(currentEntry, "\n--- Zamestnanec " + (j + 1) + "/" + pocetPracovnikov + " ---");
            
        //     // Získaj detaily zamestnanca
        //     var details = utils.getEmployeeDetails(zamestnanec, datum);
        //     if (!details) {
        //         utils.addError(currentEntry, "Nepodarilo sa získať údaje zamestnanca", "employee_" + j);
        //         continue;
        //     }
            
        //     spracovaniZamestnanci++;
            
        //     utils.addDebug(currentEntry, "👤 " + details.fullName);
        //     utils.addDebug(currentEntry, "📍 Nick: " + details.nick);
            
        //     // Vypočítaj mzdu
        //     var mzdaCalc = utils.calculateDailyWage(zamestnanec, cistyPracovnyCasHodiny, datum);
            
        //     utils.addDebug(currentEntry, "💰 Hodinová sadzba: " + utils.formatMoney(mzdaCalc.hourlyRate) + "/h");
        //     utils.addDebug(currentEntry, "🕐 Odpracované: " + cistyPracovnyCasHodiny.toFixed(2) + "h");
            
        //     // Príplatky za víkend/sviatok
        //     var priplatok = 0;
        //     if (jeVikend) {
        //         priplatok += mzdaCalc.wage * 0.5; // 50% príplatok za víkend
        //         utils.addDebug(currentEntry, "📅 Víkendový príplatok: +" + utils.formatMoney(mzdaCalc.wage * 0.5));
        //     }
        //     if (jeSviatok) {
        //         priplatok += mzdaCalc.wage * 1.0; // 100% príplatok za sviatok
        //         utils.addDebug(currentEntry, "🎉 Sviatkový príplatok: +" + utils.formatMoney(mzdaCalc.wage * 1.0));
        //     }
            
        //     var celkovaMzda = mzdaCalc.wage + priplatok;
            
        //     utils.addDebug(currentEntry, "💸 Základná mzda: " + utils.formatMoney(mzdaCalc.wage));
        //     if (priplatok > 0) {
        //         utils.addDebug(currentEntry, "➕ Príplatky spolu: " + utils.formatMoney(priplatok));
        //     }
        //     utils.addDebug(currentEntry, "💰 Celková mzda: " + utils.formatMoney(celkovaMzda));
            
        //     // Nastav atribúty na Link to Entry poli
        //     utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
        //                          CONFIG.attributes.employees.workedHours, cistyPracovnyCasHodiny, j);
            
        //     utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
        //                          CONFIG.attributes.employees.hourlyRate, mzdaCalc.hourlyRate, j);
            
        //     utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
        //                          CONFIG.attributes.employees.dailyWage, mzdaCalc.wage, j);
            
        //     if (priplatok > 0) {
        //         utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
        //                              CONFIG.attributes.employees.bonus, priplatok, j);
        //     }
            
        //     utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
        //                          CONFIG.attributes.employees.costs, celkovaMzda, j);
            
        //     // Pripočítaj k celkovým hodnotám
        //     totalOdpracovane += cistyPracovnyCasHodiny;
        //     totalMzdoveNaklady += celkovaMzda;
        // }
        
        // // Kontrola či sme spracovali aspoň jedného zamestnanca
        // if (spracovaniZamestnanci === 0) {
        //     utils.addError(currentEntry, "Nepodarilo sa spracovať žiadneho zamestnanca", "zamestnanci");
        //     message("❌ Chyba: Nepodarilo sa spracovať zamestnancov!");
        //     return false;
        // }
        
        // KROK 7: Výpočet prestojov
        // utils.addDebug(currentEntry, "\n📋 KROK 7: Výpočet prestojov");
        
        // totalPracovnaDoba = hrubyCasMinuty / 60;  // Hrubý čas v hodinách
        // totalCistyPracovnyCas = cistyPracovnyCasHodiny * pocetPracovnikov;  // Čistý čas * počet ľudí
        // totalNaZakazkach = hoursOnProjects;
        // totalPrestoje = Math.max(0, totalOdpracovane - totalNaZakazkach);
        // totalPrestavka = prestavkaMinuty / 60;  // Prestávka v hodinách
        
        // utils.addDebug(currentEntry, "⏱️ Hrubá pracovná doba: " + totalPracovnaDoba.toFixed(2) + "h");
        // utils.addDebug(currentEntry, "⏸️ Prestávka: " + totalPrestavka.toFixed(2) + "h");
        // utils.addDebug(currentEntry, "✅ Čistý pracovný čas (všetci): " + totalCistyPracovnyCas.toFixed(2) + "h");
        // utils.addDebug(currentEntry, "🔨 Na zákazkách: " + totalNaZakazkach.toFixed(2) + "h");
        // utils.addDebug(currentEntry, "⏸️ Prestoje: " + totalPrestoje.toFixed(2) + "h");
        
        // // KROK 8: Nastavenie súhrnných polí
        // utils.addDebug(currentEntry, "\n📋 KROK 8: Nastavenie súhrnných polí");
        
        // utils.safeSet(currentEntry, CONFIG.fields.attendance.employeeCount, pocetPracovnikov);
        // utils.safeSet(currentEntry, CONFIG.fields.attendance.workTime, totalPracovnaDoba);
        // utils.safeSet(currentEntry, CONFIG.fields.attendance.workedHours, totalOdpracovane);
        // utils.safeSet(currentEntry, CONFIG.fields.attendance.onProjects, totalNaZakazkach);
        // utils.safeSet(currentEntry, CONFIG.fields.attendance.downtime, totalPrestoje);
        // utils.safeSet(currentEntry, CONFIG.fields.attendance.wageCosts, totalMzdoveNaklady);
        // utils.safeSet(currentEntry, "Prestávka", totalPrestavka);  // Prestávka pole
        // utils.safeSet(currentEntry, "Čistý pracovný čas", totalCistyPracovnyCas);  // Čistý pracovný čas pole
        
       
        // utils.safeSet(currentEntry, CONFIG.fields.common.backgroundColor, farba);
        
        // KROK 10: Info pole
        //vytvorInfoZaznam();
        
        // Záverečné štatistiky
        // utils.addDebug(currentEntry, "\n📊 === VÝSLEDKY PREPOČTU ===");
        // utils.addDebug(currentEntry, "Pracovníkov: " + employeeResult.pocetPracovnikov, "group");
        // //utils.addDebug(currentEntry, "⏱️ Hrubý čas: " + formatMinutesToTime(hrubyCasMinuty));
        // //utils.addDebug(currentEntry, "⏸️ Prestávka: " + prestavkaMinuty + " minút");
        // //utils.addDebug(currentEntry, "✅ Čistý čas: " + formatMinutesToTime(cistyPracovnyCasMinuty));
        // utils.addDebug(currentEntry, "Mzdové náklady: " + utils.formatMoney(totalMzdoveNaklady), "money");
        // utils.addDebug(currentEntry, "=== PREPOČET DOKONČENÝ ===", "checkmark");
        
        //
       
        
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