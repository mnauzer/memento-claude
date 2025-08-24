// ==============================================
// DOCHÁDZKA - AUTOMATICKÝ PREPOČET
// Verzia: 7.0 | Dátum: August 2025 | Autor: ASISTANTO
// Knižnica: Dochádzka | Trigger: Before Save
// ==============================================
// 📋 FUNKCIA:
//    - Automatický výpočet odpracovaných hodín
//    - Výpočet mzdových nákladov
//    - Kontrola záväzkov
//    - Validácia údajov
// ==============================================
// 🔧 POUŽÍVA:
//    - MementoUtils v7.0 (agregátor)
//    - MementoConfig v7.0 (centrálny CONFIG)
//    - MementoCore v7.0 (základné funkcie)
//    - MementoBusiness v7.0 (business logika)
// ==============================================

// ==============================================
// INICIALIZÁCIA MODULOV
// ==============================================

// Jednoduchý import - všetko cez MementoUtils
var utils = MementoUtils;
var CONFIG = utils.config;
var currentEntry = entry();

// Debug info o moduloch (voliteľné)
utils.debugModules(currentEntry);

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        // Začiatok scriptu
        utils.addDebug(currentEntry, utils.getIcon("start") + " === DOCHÁDZKA PREPOČET v7.0 ===");
        utils.addDebug(currentEntry, "Používam MementoUtils v" + utils.version);
        
        // 1. VALIDÁCIA VSTUPNÝCH DÁT
        var requiredFields = [
            CONFIG.fields.attendance.date,
            CONFIG.fields.attendance.arrival,
            CONFIG.fields.attendance.departure,
            CONFIG.fields.attendance.employees
        ];
        
        if (!utils.validateRequiredFields(currentEntry, requiredFields)) {
            utils.addError(currentEntry, "Chýbajú povinné polia!", "main");
            return false;
        }
        
        // 2. ZÍSKANIE ÚDAJOV
        var datum = utils.safeGet(currentEntry, CONFIG.fields.attendance.date);
        var prichod = utils.safeGet(currentEntry, CONFIG.fields.attendance.arrival);
        var odchod = utils.safeGet(currentEntry, CONFIG.fields.attendance.departure);
        var zamestnanci = utils.safeGetLinks(currentEntry, CONFIG.fields.attendance.employees);
        
        utils.addDebug(currentEntry, utils.getIcon("calendar") + " Dátum: " + utils.formatDate(datum));
        utils.addDebug(currentEntry, utils.getIcon("time") + " Príchod: " + prichod + " | Odchod: " + odchod);
        utils.addDebug(currentEntry, utils.getIcon("group") + " Počet zamestnancov: " + zamestnanci.length);
        
        // 3. VÝPOČET PRACOVNÉHO ČASU
        var workTimeCalc = utils.calculateWorkHours(prichod, odchod);
        var pracovnaDoba = workTimeCalc.totalMinutes / 60; // V hodinách
        
        utils.addDebug(currentEntry, utils.getIcon("time") + " Pracovná doba: " + 
                       workTimeCalc.hours + "h " + workTimeCalc.minutes + "min");
        
        // Nastav pracovnú dobu
        utils.safeSet(currentEntry, CONFIG.fields.attendance.workTime, pracovnaDoba);
        
        // 4. KONTROLA VÍKENDU A SVIATKOV
        var jeVikend = utils.isWeekend(datum);
        var jeSviatok = utils.isHoliday(datum);
        
        if (jeVikend) {
            utils.addInfo(currentEntry, "Víkendová zmena", { deň: moment(datum).format("dddd") });
        }
        if (jeSviatok) {
            utils.addInfo(currentEntry, "Práca počas sviatku", { dátum: utils.formatDate(datum) });
        }
        
        // 5. SPRACOVANIE ZAMESTNANCOV
        var celkoveOdpracovane = 0;
        var celkoveMzdoveNaklady = 0;
        var pocetPracovnikov = zamestnanci.length;
        
        for (var i = 0; i < zamestnanci.length; i++) {
            var zamestnanec = zamestnanci[i];
            
            // Získaj detaily zamestnanca
            var details = utils.getEmployeeDetails(zamestnanec, datum);
            if (!details) {
                utils.addError(currentEntry, "Nepodarilo sa získať údaje zamestnanca", "main");
                continue;
            }
            
            utils.addDebug(currentEntry, utils.getIcon("person") + " Spracovávam: " + details.fullName);
            
            // Vypočítaj mzdu
            var mzdaCalc = utils.calculateDailyWage(zamestnanec, pracovnaDoba, datum);
            
            // Nastav atribúty na Link to Entry poli
            utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
                                 CONFIG.attributes.employees.workedHours, pracovnaDoba, i);
            
            utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
                                 CONFIG.attributes.employees.hourlyRate, mzdaCalc.hourlyRate, i);
            
            utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
                                 CONFIG.attributes.employees.dailyWage, mzdaCalc.wage, i);
            
            // Príplatky za víkend/sviatok
            var priplatok = 0;
            if (jeVikend || jeSviatok) {
                priplatok = mzdaCalc.wage * 0.5; // 50% príplatok
                utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
                                     CONFIG.attributes.employees.bonus, priplatok, i);
            }
            
            // Celkové náklady na zamestnanca
            var naklady = mzdaCalc.wage + priplatok;
            utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
                                 CONFIG.attributes.employees.costs, naklady, i);
            
            // Pripočítaj k celkovým hodnotám
            celkoveOdpracovane += pracovnaDoba;
            celkoveMzdoveNaklady += naklady;
            
            // Debug info
            utils.addDebug(currentEntry, "  - Hodinová sadzba: " + utils.formatMoney(mzdaCalc.hourlyRate) + "/h");
            utils.addDebug(currentEntry, "  - Mzda: " + utils.formatMoney(mzdaCalc.wage));
            if (priplatok > 0) {
                utils.addDebug(currentEntry, "  - Príplatok: " + utils.formatMoney(priplatok));
            }
            utils.addDebug(currentEntry, "  - Náklady celkom: " + utils.formatMoney(naklady));
        }
        
        // 6. NASTAV SÚHRNNÉ POLIA
        utils.safeSet(currentEntry, CONFIG.fields.attendance.employeeCount, pocetPracovnikov);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.workedHours, celkoveOdpracovane);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.wageCosts, celkoveMzdoveNaklady);
        
        // 7. KONTROLA ZÁVÄZKOV
        var maZavazky = kontrolaZavazkov(zamestnanci);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.obligations, maZavazky);
        
        if (maZavazky) {
            utils.addInfo(currentEntry, utils.getIcon("warning") + " Niektorí zamestnanci majú záväzky!");
        }
        
        // 8. FARBA ZÁZNAMU
        nastavFarbuZaznamu(jeVikend, jeSviatok, maZavazky);
        
        // 9. ZÁVEREČNÉ INFO
        var summaryInfo = {
            dátum: utils.formatDate(datum),
            zamestnancov: pocetPracovnikov,
            odpracované: celkoveOdpracovane + "h",
            náklady: utils.formatMoney(celkoveMzdoveNaklady),
            víkend: jeVikend ? "Áno" : "Nie",
            sviatok: jeSviatok ? "Áno" : "Nie",
            záväzky: maZavazky ? "Áno" : "Nie"
        };
        
        utils.addInfo(currentEntry, "Súhrn dochádzky", summaryInfo);
        utils.addDebug(currentEntry, utils.getIcon("success") + " === PREPOČET DOKONČENÝ ===");
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        return false;
    }
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

/**
 * Kontroluje či majú zamestnanci záväzky
 */
function kontrolaZavazkov(zamestnanci) {
    try {
        if (!zamestnanci || zamestnanci.length === 0) {
            return false;
        }
        
        var zavazkyLib = libByName(CONFIG.libraries.obligations);
        if (!zavazkyLib) {
            utils.addDebug(currentEntry, "Knižnica záväzkov neexistuje");
            return false;
        }
        
        for (var i = 0; i < zamestnanci.length; i++) {
            var zamestnanec = zamestnanci[i];
            
            // Hľadaj neuhradené záväzky
            var zavazky = zavazkyLib.find(CONFIG.fields.obligations.employee, zamestnanec);
            
            for (var j = 0; j < zavazky.length; j++) {
                var stav = zavazky[j].field(CONFIG.fields.obligations.state);
                
                if (stav === CONFIG.constants.obligationStates.unpaid || 
                    stav === CONFIG.constants.obligationStates.partiallyPaid) {
                    
                    utils.addDebug(currentEntry, utils.getIcon("warning") + " Záväzok: " + 
                                 utils.formatEmployeeName(zamestnanec, "nick") + 
                                 " - " + zavazky[j].field(CONFIG.fields.obligations.description));
                    return true;
                }
            }
        }
        
        return false;
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri kontrole záväzkov", "kontrolaZavazkov", error);
        return false;
    }
}

/**
 * Nastaví farbu záznamu podľa typu
 */
function nastavFarbuZaznamu(jeVikend, jeSviatok, maZavazky) {
    try {
        var farba = "#FFFFFF"; // Biela - štandard
        
        if (maZavazky) {
            farba = "#FFCCCC"; // Červená - záväzky
        } else if (jeSviatok) {
            farba = "#FFE6CC"; // Oranžová - sviatok
        } else if (jeVikend) {
            farba = "#FFFFCC"; // Žltá - víkend
        }
        
        utils.safeSet(currentEntry, CONFIG.fields.common.backgroundColor, farba);
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri nastavení farby", "nastavFarbuZaznamu", error);
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

// Kontrola závislostí
var dependencyCheck = utils.checkDependencies(['config', 'core', 'business']);
if (!dependencyCheck.success) {
    message("❌ Chýbajú potrebné moduly: " + dependencyCheck.missing.join(", "));
    cancel();
}

// Spustenie hlavnej funkcie
var result = main();

// Ak hlavná funkcia zlyhala, zruš uloženie
if (!result) {
    utils.addError(currentEntry, "Script zlyhal - zrušené uloženie", "main");
    cancel();
}