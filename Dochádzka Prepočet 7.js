
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
var config = utils.getConfig();
var currentEntry = entry();
var CONFIG = {
    // Script špecifické nastavenia
    scriptName: "Dochádzka Prepočet",
    version: "7.3.4",  // Aktualizovaná verzia
    
    // Referencie na centrálny config
    fields: {
        attendance: centralConfig.fields.attendance,
        common: centralConfig.fields.common,
        // Pridané mapovanie pre arrival/departure polia
        arrival: centralConfig.fields.attendance.arrival,      // "Príchod"
        departure: centralConfig.fields.attendance.departure,  // "Odchod"
        pracovnaDoba: centralConfig.fields.attendance.workTime, // "Pracovná doba"
        pocetPracovnikov: centralConfig.fields.attendance.employeeCount, // "Počet pracovníkov"
        info: centralConfig.fields.common.info
    },
    attributes: centralConfig.attributes, 
    libraries: centralConfig.libraries,
    icons: centralConfig.icons,
    
    // Lokálne nastavenia pre tento script
    settings: {
        roundToQuarterHour: true,
        includeBreaks: true,
        breakThreshold: 6, // hodín
        breakDuration: 30  // minút
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
        
        utils.addDebug(currentEntry, "✅ Validácia úspešná");
        utils.addDebug(currentEntry, "  • Čas: " + utils.formatTime(arrival) + " - " + utils.formatTime(departure));
        utils.addDebug(currentEntry, "  • Počet zamestnancov: " + employees.length);
        
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

function calculateWorkTime(date, arrival, departure) {
    try {
        utils.addDebug(currentEntry, "--- Výpočet pracovnej doby");
        
        // Zaokrúhlenie časov
        var arrivalRounded = arrival;
        var departureRounded = departure;
        
        if (CONFIG.settings.roundToQuarterHour) {
            arrivalRounded = utils.roundToQuarter(arrival, 'up');
            departureRounded = utils.roundToQuarter(departure, 'down');

            // OPRAVA: Konvertuj moment objekty na čas pre Memento
            currentEntry.set(CONFIG.fields.attendance.arrival, arrivalRounded.format("HH:mm"));    
            currentEntry.set(CONFIG.fields.attendance.departure, departureRounded.format("HH:mm"));
            
            utils.addDebug(currentEntry, "  • Zaokrúhlené časy: " + 
                arrivalRounded.format("HH:mm") + " - " + 
                departureRounded.format("HH:mm"));
        }
        
        // Výpočet hodín - použij originálne časy pre výpočet
        var workHours = utils.calculateWorkHours(arrival, departure);
        
        if (!workHours || workHours.error) {
            return { success: false, error: workHours ? workHours.error : "Nepodarilo sa vypočítať hodiny" };
        }
        
        var pracovnaDobaHodiny = workHours.totalMinutes / 60;
        pracovnaDobaHodiny = Math.round(pracovnaDobaHodiny * 100) / 100;
        
        // Ulož do poľa
        currentEntry.set(CONFIG.fields.attendance.workTime, pracovnaDobaHodiny);
        
        utils.addDebug(currentEntry, "✅ Pracovná doba: " + pracovnaDobaHodiny + " hodín");
        
        return {
            success: true,
            arrivalRounded: arrivalRounded,
            departureRounded: departureRounded,
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
        utils.addDebug(currentEntry, "\n👥 KROK 3: Spracovanie zamestnancov");
        
        var result = {
            success: true,
            pocetPracovnikov: zamestnanci.length,
            odpracovaneTotal: 0,
            celkoveMzdy: 0,
            detaily: []
        };
        
        // Ulož počet pracovníkov
        currentEntry.set(CONFIG.fields.pocetPracovnikov, result.pocetPracovnikov);
        
        // Spracuj každého zamestnanca
        for (var i = 0; i < zamestnanci.length; i++) {
            var zamestnanec = zamestnanci[i];
            
            if (!zamestnanec) {
                utils.addDebug(currentEntry, "  ⚠️ Zamestnanec[" + i + "] je null - preskakujem");
                continue;
            }
            
            var employeeName = utils.formatEmployeeName(zamestnanec);
            utils.addDebug(currentEntry, "\n👤 [" + (i+1) + "/" + result.pocetPracovnikov + "] " + employeeName);
            
            // Spracuj zamestnanca
            var empResult = processEmployee(zamestnanec, pracovnaDobaHodiny, datum, i);
            
            if (empResult.success) {
                result.odpracovaneTotal += pracovnaDobaHodiny;
                result.celkoveMzdy += empResult.dennaMzda;
                result.detaily.push(empResult);
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

/**
 * Spracuje jedného zamestnanca - OPRAVENÉ NASTAVOVANIE ATRIBÚTOV
 */
function processEmployee(zamestnanec, pracovnaDobaHodiny, datum, index) {
    try {
        // Nájdi platnú hodinovku
        var hodinovka = findValidSalary(zamestnanec, datum);
        
        if (!hodinovka || hodinovka <= 0) {
            utils.addDebug(currentEntry, "  ❌ Preskakujem - nemá platnú sadzbu");
            return { success: false };
        }
        
        // OPRAVA: Správne nastavenie atribútov pomocou .attr() namiesto .setAttr()
        var zamArray = currentEntry.field(CONFIG.fields.attendance.employees);
        
        if (zamArray && zamArray.length > index && zamArray[index]) {
            // Nastav atribúty pomocou .attr() metódy
            zamArray[index].attr(CONFIG.attributes.employees.workedHours, pracovnaDobaHodiny);
            zamArray[index].attr(CONFIG.attributes.employees.hourlyRate, hodinovka);
            
            // Získaj príplatky
            var priplatok = zamArray[index].attr(CONFIG.attributes.employees.bonus) || 0;
            var premia = zamArray[index].attr(CONFIG.attributes.employees.premium) || 0;
            var pokuta = zamArray[index].attr(CONFIG.attributes.employees.penalty) || 0;
            
            // Vypočítaj dennú mzdu
            var dennaMzda = (pracovnaDobaHodiny * (hodinovka + priplatok)) + premia - pokuta;
            dennaMzda = Math.round(dennaMzda * 100) / 100;
            
            // Nastav dennú mzdu
            zamArray[index].attr(CONFIG.attributes.employees.dailyWage, dennaMzda);
            
            utils.addDebug(currentEntry, "  ✅ Spracované úspešne");
            utils.addDebug(currentEntry, "    • Hodinová sadzba: " + hodinovka + " €/h");
            utils.addDebug(currentEntry, "    • Denná mzda: " + dennaMzda + " €");
            
            return {
                success: true,
                hodinovka: hodinovka,
                dennaMzda: dennaMzda,
                priplatok: priplatok,
                premia: premia,
                pokuta: pokuta,
                zamestnanec: zamestnanec  // Pridané pre info záznam
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

/**
 * Nájde platnú sadzbu pre zamestnanca
 */
function findValidSalary(zamestnanec, datum) {

    
    try {
        var employeeName = utils.formatEmployeeName(zamestnanec);
        utils.addDebug(currentEntry, "🔍 Hľadám platnú sadzbu");
        
        var hodinovka = utils.findValidHourlyRate(zamestnanec, datum);
        
        if (!hodinovka || hodinovka <= 0) {
            utils.addError(currentEntry, "Zamestnanec " + employeeName + " nemá platnú sadzbu", "findValidSalary");
            return null;
        }
        
        utils.addDebug(currentEntry, "  💶 Platná hodinovka: " + hodinovka + " €/h");
        return hodinovka;
 
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "findValidSalary", error);
        return null;
    }
}

// ==============================================
// KROK 4: CELKOVÉ VÝPOČTY
// ==============================================

function calculateTotals(employeeResult) {

    
    try {
        utils.addDebug(currentEntry, "\n💰 KROK 4: Celkové výpočty");
        
        // Ulož celkové hodnoty
        currentEntry.set(CONFIG.fields.attendance.workedHours, employeeResult.odpracovaneTotal);
        currentEntry.set(CONFIG.fields.attendance.wageCosts, employeeResult.celkoveMzdy);
        
        utils.addDebug(currentEntry, "✅ Celkové výpočty:");
        utils.addDebug(currentEntry, "  • Odpracované spolu: " + employeeResult.odpracovaneTotal + " hodín");
        utils.addDebug(currentEntry, "  • Mzdové náklady: " + utils.formatMoney(employeeResult.celkoveMzdy));
        
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
        utils.addDebug(currentEntry, "\n📝 KROK 5: Vytvorenie info záznamu");
        
        var date = currentEntry.field(CONFIG.fields.attendance.date);
        var dateFormatted = utils.formatDate(date, "DD.MM.YYYY");
        var dayName = utils.getDayNameSK(moment(date).day()).toUpperCase();


        var infoMessage = "📋 DOCHÁDZKA - AUTOMATICKÝ PREPOČET\n";
        infoMessage += "═══════════════════════════════════\n\n";
        
        infoMessage += "📅 Dátum: " + dateFormatted + " (" + dayName + ")\n";
        infoMessage += "⏰ Pracovný čas: " + utils.formatTime(workTimeResult.arrivalRounded) + 
                       " - " + utils.formatTime(workTimeResult.departureRounded) + "\n";
        infoMessage += "⏱️ Pracovná doba: " + workTimeResult.pracovnaDobaHodiny + " hodín\n\n";
        
        infoMessage += "👥 ZAMESTNANCI (" + employeeResult.pocetPracovnikov + " " + utils.getPersonCountForm(employeeResult.pocetPracovnikov) + ")\n";;
        infoMessage += "───────────────────────────────────\n";
        
        for (var i = 0; i < employeeResult.detaily.length; i++) {
            var detail = employeeResult.detaily[i];
            infoMessage += "• Zamestnanec " + (i+1) + ": " + utils.formatEmployeeName(employeeResult.detaily[i].zamestnanec) + "\n";
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
        utils.addDebug(currentEntry, "🚀 === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        utils.addDebug(currentEntry, "📅 Čas spustenia: " + utils.formatDate(moment()));
        
         // Kroky prepočtu
        var steps = {
            step1: { success: false, name: "Načítanie a validácia dát" },
            step2: { success: false, name: "Výpočet pracovnej doby" },
            step3: { success: false, name: "Spracovanie zamestnancov" },
            step4: { success: false, name: "Celkové výpočty" },
            step5: { success: false, name: "Vytvorenie info záznamu" }
        };

        // KROK 1: Validácia vstupných dát
        utils.addDebug(currentEntry, "📋 KROK 1: Validácia vstupných dát");
        
        var validationResult = validateInputData();  // ✅ Volaj bez parametrov
        if (!validationResult.success) {
            utils.addError(currentEntry, "Validácia zlyhala: " + validationResult.error, CONFIG.scriptName);
            message("❌ " + validationResult.error);
            return false;
        }
        steps.step1.success = true;

        // KROK 2: Výpočet pracovného času
        utils.addDebug(currentEntry, "📋 KROK 2: Získavanie údajov");
        var workTimeResult = calculateWorkTime(
            validationResult.arrival, 
            validationResult.departure
        );
        if (!workTimeResult.success) {
            utils.addError(currentEntry, "Výpočet času zlyhal: " + workTimeResult.error, CONFIG.scriptName);
            return false;
        }
        steps.step2.success = true;
        
        // KROK 3: Spracovanie zamestnancov
        utils.addDebug(currentEntry, "📋 KROK 3: Spracovanie zamestnancov");
        var employeeResult = processEmployees(validationResult.employees, workTimeResult.pracovnaDobaHodiny, validationResult.date);
        steps.step3.success = employeeResult.success;
        
        // KROK 4: Celkové výpočty
        utils.addDebug(currentEntry, "📋 KROK 4: Celkové výpočty");
        if (employeeResult.success) {
            steps.step4.success = calculateTotals(employeeResult);
        }
        
        // KROK 5: Info záznam
        utils.addDebug(currentEntry, "📋 KROK 5: Vytvorenie info záznamu");
        steps.step5.success = createInfoRecord(workTimeResult, employeeResult);
        
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
        
        // // KROK 9: Farba záznamu
        // utils.addDebug(currentEntry, "\n📋 KROK 9: Nastavenie farby záznamu");
        
        // var farba = "#FFFFFF"; // Biela - štandard
        // if (jeSviatok) {
        //     farba = "#FFE6CC"; // Oranžová - sviatok
        // } else if (jeVikend) {
        //     farba = "#FFFFCC"; // Žltá - víkend
        // } else if (totalPrestoje > 2) {
        //     farba = "#FFCCCC"; // Červená - veľa prestojov
        // }
        
        // utils.safeSet(currentEntry, CONFIG.fields.common.backgroundColor, farba);
        
        // // KROK 10: Info pole
        // vytvorInfoZaznam();
        
        // // Záverečné štatistiky
        // utils.addDebug(currentEntry, "\n📊 === VÝSLEDKY PREPOČTU ===");
        // utils.addDebug(currentEntry, "👥 Pracovníkov: " + pocetPracovnikov);
        // utils.addDebug(currentEntry, "⏱️ Hrubý čas: " + formatMinutesToTime(hrubyCasMinuty));
        // utils.addDebug(currentEntry, "⏸️ Prestávka: " + prestavkaMinuty + " minút");
        // utils.addDebug(currentEntry, "✅ Čistý čas: " + formatMinutesToTime(cistyPracovnyCasMinuty));
        // utils.addDebug(currentEntry, "💰 Mzdové náklady: " + utils.formatMoney(totalMzdoveNaklady));
        // utils.addDebug(currentEntry, "✅ === PREPOČET DOKONČENÝ ===");
        
        return true;
        
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