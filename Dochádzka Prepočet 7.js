// ==============================================
// DOCHÁDZKA PREPOČET - AUTOMATICKÝ VÝPOČET
// Verzia: 7.2 | Dátum: August 2025 | Autor: ASISTANTO
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
// ✅ REFAKTOROVANÉ v7.2:
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
var CONFIG = utils.config;
var currentEntry = entry();

// Globálne premenné
var totalPracovnaDoba = 0;
var totalCistyPracovnyCas = 0;
var totalOdpracovane = 0;
var totalNaZakazkach = 0;
var totalPrestoje = 0;
var totalMzdoveNaklady = 0;
var totalPrestavka = 0;

// ==============================================
// HELPER FUNKCIE PRE ČASOVÉ VÝPOČTY
// ==============================================

/**
 * Vypočíta rozdiel medzi dvoma časmi v minútach
 * Ak je end pred start, predpokladá prechod cez polnoc
 */
function calculateTimeDifference(start, end) {
    try {
        if (!start || !end) return 0;
        
        var startTime = moment(start, "HH:mm");
        var endTime = moment(end, "HH:mm");
        
        if (!startTime.isValid() || !endTime.isValid()) {
            return 0;
        }
        
        // Ak je koniec pred začiatkom, pridaj 24 hodín (prechod cez polnoc)
        if (endTime.isBefore(startTime)) {
            endTime.add(1, 'day');
        }
        
        return endTime.diff(startTime, 'minutes');
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri výpočte času: " + error.toString(), "calculateTimeDifference", error);
        return 0;
    }
}

/**
 * Vypočíta trvanie prestávky podľa odpracovaného času
 * Pravidlá:
 * - Do 6 hodín: 0 minút
 * - 6-9 hodín: 30 minút
 * - Nad 9 hodín: 45 minút
 */
function calculateBreakDuration(workedMinutes) {
    var hours = workedMinutes / 60;
    
    if (hours <= 6) {
        return 0;
    } else if (hours <= 9) {
        return 30;
    } else {
        return 45;
    }
}

/**
 * Získa predvolené nastavenia prestávok z ASISTANTO Defaults
 */
function getDefaultBreakSettings() {
    try {
        var defaultsLib = libByName(CONFIG.libraries.defaults);
        if (!defaultsLib) {
            return { break6h: 0, break9h: 30, breakOver9h: 45 };
        }
        
        var entries = defaultsLib.entries();
        if (entries && entries.length > 0) {
            var settings = entries[entries.length - 1]; // Posledný (najnovší) záznam
            
            return {
                break6h: utils.safeGet(settings, "Prestávka do 6h", 0),
                break9h: utils.safeGet(settings, "Prestávka 6-9h", 30),
                breakOver9h: utils.safeGet(settings, "Prestávka nad 9h", 45)
            };
        }
    } catch (error) {
        utils.addDebug(currentEntry, "Používam štandardné nastavenia prestávok");
    }
    
    return { break6h: 0, break9h: 30, breakOver9h: 45 };
}

/**
 * Formátuje minúty na hodiny:minúty
 */
function formatMinutesToTime(minutes) {
    if (!minutes && minutes !== 0) return "0:00";
    
    var hours = Math.floor(minutes / 60);
    var mins = minutes % 60;
    
    return hours + ":" + (mins < 10 ? "0" : "") + mins;
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        // Debug info o načítaných moduloch
        utils.addDebug(currentEntry, "=== DOCHÁDZKA PREPOČET v7.2 ===");
        utils.addDebug(currentEntry, "MementoUtils verzia: " + utils.version);
        
        // Kontrola závislostí
        var depCheck = utils.checkDependencies(['config', 'core', 'business']);
        if (!depCheck.success) {
            utils.addError(currentEntry, "Chýbajú potrebné moduly: " + depCheck.missing.join(", "), "main");
            message("❌ Chýbajú potrebné moduly!\n\n" + depCheck.missing.join(", "));
            return false;
        }
        
        // KROK 1: Validácia vstupných dát
        utils.addDebug(currentEntry, "\n📋 KROK 1: Validácia vstupných dát");
        
        var requiredFields = [
            CONFIG.fields.attendance.date,
            CONFIG.fields.attendance.arrival,
            CONFIG.fields.attendance.departure
        ];
        
        if (!utils.validateRequiredFields(currentEntry, requiredFields)) {
            utils.addError(currentEntry, "Chýbajú povinné polia", "validácia");
            message("❌ Chyba: Vyplňte všetky povinné polia!");
            return false;
        }
        
        // KROK 2: Získanie údajov
        utils.addDebug(currentEntry, "\n📋 KROK 2: Získavanie údajov");
        
        var datum = utils.safeGet(currentEntry, CONFIG.fields.attendance.date);
        var prichod = utils.safeGet(currentEntry, CONFIG.fields.attendance.arrival);
        var odchod = utils.safeGet(currentEntry, CONFIG.fields.attendance.departure);
        var zamestnanci = utils.safeGetLinks(currentEntry, CONFIG.fields.attendance.employees);
        var praceLinks = utils.safeGetLinks(currentEntry, CONFIG.fields.attendance.works);
        var jazdyLinks = utils.safeGetLinks(currentEntry, CONFIG.fields.attendance.rides);
        
        utils.addDebug(currentEntry, "📅 Dátum: " + utils.formatDate(datum));
        utils.addDebug(currentEntry, "⏰ Príchod: " + prichod + " | Odchod: " + odchod);
        utils.addDebug(currentEntry, "👥 Zamestnancov: " + zamestnanci.length);
        utils.addDebug(currentEntry, "🔨 Prác: " + praceLinks.length);
        utils.addDebug(currentEntry, "🚗 Jázd: " + jazdyLinks.length);
        
        // KROK 3: Výpočet pracovného času a prestávok
        utils.addDebug(currentEntry, "\n📋 KROK 3: Výpočet pracovného času a prestávok");
        
        // Vypočítaj hrubý pracovný čas
        var hrubyCasMinuty = calculateTimeDifference(prichod, odchod);
        if (hrubyCasMinuty <= 0) {
            utils.addError(currentEntry, "Nesprávny čas príchodu/odchodu", "časový výpočet");
            message("❌ Chyba: Čas odchodu musí byť po čase príchodu!");
            return false;
        }
        
        utils.addDebug(currentEntry, "⏱️ Hrubý pracovný čas: " + formatMinutesToTime(hrubyCasMinuty));
        
        // Vypočítaj prestávku
        var breakSettings = getDefaultBreakSettings();
        var prestavkaMinuty = calculateBreakDuration(hrubyCasMinuty);
        
        utils.addDebug(currentEntry, "⏸️ Prestávka: " + prestavkaMinuty + " minút");
        
        // Vypočítaj čistý pracovný čas
        var cistyPracovnyCasMinuty = hrubyCasMinuty - prestavkaMinuty;
        var cistyPracovnyCasHodiny = cistyPracovnyCasMinuty / 60;
        
        utils.addDebug(currentEntry, "✅ Čistý pracovný čas: " + formatMinutesToTime(cistyPracovnyCasMinuty) + " (" + cistyPracovnyCasHodiny.toFixed(2) + "h)");
        
        // KROK 4: Kontrola víkendu a sviatkov
        utils.addDebug(currentEntry, "\n📋 KROK 4: Kontrola víkendu a sviatkov");
        
        var jeVikend = utils.isWeekend(datum);
        var jeSviatok = utils.isHoliday(datum);
        
        if (jeVikend) {
            utils.addDebug(currentEntry, "📅 Víkendová zmena - " + moment(datum).format("dddd"));
        }
        if (jeSviatok) {
            utils.addDebug(currentEntry, "🎉 Práca počas sviatku");
        }
        
        // KROK 5: Spracovanie záznamov práce
        utils.addDebug(currentEntry, "\n📋 KROK 5: Spracovanie záznamov práce");
        
        var hoursOnProjects = 0;
        for (var i = 0; i < praceLinks.length; i++) {
            var praca = praceLinks[i];
            var odpracovaneNaPraci = utils.safeGet(praca, CONFIG.fields.workRecord.workedHours, 0);
            hoursOnProjects += odpracovaneNaPraci;
            
            utils.addDebug(currentEntry, "  🔨 Práca #" + (i + 1) + ": " + odpracovaneNaPraci + "h");
        }
        
        // KROK 6: Spracovanie zamestnancov
        utils.addDebug(currentEntry, "\n📋 KROK 6: Spracovanie zamestnancov");
        
        if (zamestnanci.length === 0) {
            utils.addError(currentEntry, "Žiadni zamestnanci na spracovanie", "zamestnanci");
            message("❌ Chyba: Pridajte aspoň jedného zamestnanca!");
            return false;
        }
        
        var pocetPracovnikov = zamestnanci.length;
        
        for (var j = 0; j < zamestnanci.length; j++) {
            var zamestnanec = zamestnanci[j];
            
            utils.addDebug(currentEntry, "\n--- Zamestnanec " + (j + 1) + "/" + pocetPracovnikov + " ---");
            
            // Získaj detaily zamestnanca
            var details = utils.getEmployeeDetails(zamestnanec, datum);
            if (!details) {
                utils.addError(currentEntry, "Nepodarilo sa získať údaje zamestnanca", "employee_" + j);
                continue;
            }
            
            utils.addDebug(currentEntry, "👤 " + details.fullName);
            utils.addDebug(currentEntry, "📍 Nick: " + details.nick);
            
            // Vypočítaj mzdu
            var mzdaCalc = utils.calculateDailyWage(zamestnanec, cistyPracovnyCasHodiny, datum);
            
            utils.addDebug(currentEntry, "💰 Hodinová sadzba: " + utils.formatMoney(mzdaCalc.hourlyRate) + "/h");
            utils.addDebug(currentEntry, "🕐 Odpracované: " + cistyPracovnyCasHodiny.toFixed(2) + "h");
            
            // Príplatky za víkend/sviatok
            var priplatok = 0;
            if (jeVikend) {
                priplatok += mzdaCalc.wage * 0.5; // 50% príplatok za víkend
                utils.addDebug(currentEntry, "📅 Víkendový príplatok: +" + utils.formatMoney(mzdaCalc.wage * 0.5));
            }
            if (jeSviatok) {
                priplatok += mzdaCalc.wage * 1.0; // 100% príplatok za sviatok
                utils.addDebug(currentEntry, "🎉 Sviatkový príplatok: +" + utils.formatMoney(mzdaCalc.wage * 1.0));
            }
            
            var celkovaMzda = mzdaCalc.wage + priplatok;
            
            utils.addDebug(currentEntry, "💸 Základná mzda: " + utils.formatMoney(mzdaCalc.wage));
            if (priplatok > 0) {
                utils.addDebug(currentEntry, "➕ Príplatky spolu: " + utils.formatMoney(priplatok));
            }
            utils.addDebug(currentEntry, "💰 Celková mzda: " + utils.formatMoney(celkovaMzda));
            
            // Nastav atribúty na Link to Entry poli
            utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
                                 CONFIG.attributes.employees.workedHours, cistyPracovnyCasHodiny, j);
            
            utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
                                 CONFIG.attributes.employees.hourlyRate, mzdaCalc.hourlyRate, j);
            
            utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
                                 CONFIG.attributes.employees.dailyWage, mzdaCalc.wage, j);
            
            if (priplatok > 0) {
                utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
                                     CONFIG.attributes.employees.bonus, priplatok, j);
            }
            
            utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
                                 CONFIG.attributes.employees.costs, celkovaMzda, j);
            
            // Pripočítaj k celkovým hodnotám
            totalOdpracovane += cistyPracovnyCasHodiny;
            totalMzdoveNaklady += celkovaMzda;
        }
        
        // KROK 7: Výpočet prestojov
        utils.addDebug(currentEntry, "\n📋 KROK 7: Výpočet prestojov");
        
        totalPracovnaDoba = hrubyCasMinuty / 60;  // Hrubý čas v hodinách
        totalCistyPracovnyCas = cistyPracovnyCasHodiny * pocetPracovnikov;  // Čistý čas * počet ľudí
        totalNaZakazkach = hoursOnProjects;
        totalPrestoje = Math.max(0, totalOdpracovane - totalNaZakazkach);
        totalPrestavka = prestavkaMinuty / 60;  // Prestávka v hodinách
        
        utils.addDebug(currentEntry, "⏱️ Hrubá pracovná doba: " + totalPracovnaDoba.toFixed(2) + "h");
        utils.addDebug(currentEntry, "⏸️ Prestávka: " + totalPrestavka.toFixed(2) + "h");
        utils.addDebug(currentEntry, "✅ Čistý pracovný čas (všetci): " + totalCistyPracovnyCas.toFixed(2) + "h");
        utils.addDebug(currentEntry, "🔨 Na zákazkách: " + totalNaZakazkach.toFixed(2) + "h");
        utils.addDebug(currentEntry, "⏸️ Prestoje: " + totalPrestoje.toFixed(2) + "h");
        
        // KROK 8: Nastavenie súhrnných polí
        utils.addDebug(currentEntry, "\n📋 KROK 8: Nastavenie súhrnných polí");
        
        utils.safeSet(currentEntry, CONFIG.fields.attendance.employeeCount, pocetPracovnikov);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.workTime, totalPracovnaDoba);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.workedHours, totalOdpracovane);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.onProjects, totalNaZakazkach);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.downtime, totalPrestoje);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.wageCosts, totalMzdoveNaklady);
        utils.safeSet(currentEntry, "Prestávka", totalPrestavka);  // Prestávka pole
        utils.safeSet(currentEntry, "Čistý pracovný čas", totalCistyPracovnyCas);  // Čistý pracovný čas pole
        
        // KROK 9: Farba záznamu
        utils.addDebug(currentEntry, "\n📋 KROK 9: Nastavenie farby záznamu");
        
        var farba = "#FFFFFF"; // Biela - štandard
        if (jeSviatok) {
            farba = "#FFE6CC"; // Oranžová - sviatok
        } else if (jeVikend) {
            farba = "#FFFFCC"; // Žltá - víkend
        } else if (totalPrestoje > 2) {
            farba = "#FFCCCC"; // Červená - veľa prestojov
        }
        
        utils.safeSet(currentEntry, CONFIG.fields.common.backgroundColor, farba);
        
        // KROK 10: Info pole
        vytvorInfoZaznam();
        
        // Záverečné štatistiky
        utils.addDebug(currentEntry, "\n📊 === VÝSLEDKY PREPOČTU ===");
        utils.addDebug(currentEntry, "👥 Pracovníkov: " + pocetPracovnikov);
        utils.addDebug(currentEntry, "⏱️ Hrubý čas: " + formatMinutesToTime(hrubyCasMinuty));
        utils.addDebug(currentEntry, "⏸️ Prestávka: " + prestavkaMinuty + " minút");
        utils.addDebug(currentEntry, "✅ Čistý čas: " + formatMinutesToTime(cistyPracovnyCasMinuty));
        utils.addDebug(currentEntry, "💰 Mzdové náklady: " + utils.formatMoney(totalMzdoveNaklady));
        utils.addDebug(currentEntry, "✅ === PREPOČET DOKONČENÝ ===");
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        message("❌ Kritická chyba!\n\n" + error.toString());
        return false;
    }
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

/**
 * Vytvorí info záznam s prehľadom
 */
function vytvorInfoZaznam() {
    try {
        var datum = utils.safeGet(currentEntry, CONFIG.fields.attendance.date);
        var jeVikend = utils.isWeekend(datum);
        var jeSviatok = utils.isHoliday(datum);
        
        var infoText = "📋 DOCHÁDZKA - AUTOMATICKÝ PREPOČET\n";
        infoText += "=====================================\n\n";
        
        infoText += "📅 ZÁKLADNÉ ÚDAJE:\n";
        infoText += "• Dátum: " + utils.formatDate(datum) + "\n";
        infoText += "• Deň: " + moment(datum).format("dddd") + "\n";
        infoText += "• Príchod: " + utils.safeGet(currentEntry, CONFIG.fields.attendance.arrival) + "\n";
        infoText += "• Odchod: " + utils.safeGet(currentEntry, CONFIG.fields.attendance.departure) + "\n";
        if (jeVikend) infoText += "• 📅 Víkendová zmena\n";
        if (jeSviatok) infoText += "• 🎉 Práca počas sviatku\n";
        infoText += "\n";
        
        infoText += "👥 ZAMESTNANCI:\n";
        infoText += "• Počet: " + utils.safeGet(currentEntry, CONFIG.fields.attendance.employeeCount) + " osôb\n";
        infoText += "• Hrubá doba/os: " + totalPracovnaDoba.toFixed(2) + "h\n";
        infoText += "• Prestávka: " + (totalPrestavka * 60).toFixed(0) + " min\n";
        infoText += "• Čistý čas/os: " + (totalCistyPracovnyCas / utils.safeGet(currentEntry, CONFIG.fields.attendance.employeeCount)).toFixed(2) + "h\n";
        infoText += "\n";
        
        infoText += "⏱️ ČASOVÉ ÚDAJE:\n";
        infoText += "• Celkom odpracované: " + totalOdpracovane.toFixed(2) + "h\n";
        infoText += "• Na zákazkách: " + totalNaZakazkach.toFixed(2) + "h\n";
        infoText += "• Prestoje: " + totalPrestoje.toFixed(2) + "h\n";
        infoText += "\n";
        
        infoText += "💰 FINANČNÉ ÚDAJE:\n";
        infoText += "• Mzdové náklady: " + utils.formatMoney(totalMzdoveNaklady) + "\n";
        infoText += "• Priemer/os: " + utils.formatMoney(totalMzdoveNaklady / utils.safeGet(currentEntry, CONFIG.fields.attendance.employeeCount)) + "\n";
        infoText += "\n";
        
        infoText += "🔧 TECHNICKÉ INFO:\n";
        infoText += "• Script: Dochádzka Prepočet v7.2\n";
        infoText += "• MementoUtils: v" + utils.version + "\n";
        infoText += "• Čas prepočtu: " + moment().format("HH:mm:ss") + "\n";
        infoText += "• Trigger: Before Save\n\n";
        
        infoText += "✅ PREPOČET ÚSPEŠNE DOKONČENÝ";
        
        utils.safeSet(currentEntry, CONFIG.fields.common.info, infoText);
        utils.addDebug(currentEntry, "✅ Info záznam vytvorený");
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri vytváraní info záznamu", "vytvorInfoZaznam", error);
    }
}

/**
 * Zobrazí užívateľovi súhrnnú správu
 */
function zobrazSuhrn() {
    var summaryMessage = "✅ PREPOČET DOKONČENÝ\n\n";
    summaryMessage += "👥 Pracovníkov: " + utils.safeGet(currentEntry, CONFIG.fields.attendance.employeeCount) + "\n";
    summaryMessage += "⏱️ Odpracované: " + totalOdpracovane.toFixed(2) + "h\n";
    summaryMessage += "⏸️ Prestávka: " + (totalPrestavka * 60).toFixed(0) + " min\n";
    summaryMessage += "💰 Náklady: " + utils.formatMoney(totalMzdoveNaklady) + "\n";
    
    if (totalPrestoje > 0) {
        summaryMessage += "\n⚠️ Prestoje: " + totalPrestoje.toFixed(2) + "h";
    }
    
    message(summaryMessage);
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
}ostí
        var depCheck = utils.checkDependencies(['config', 'core', 'business']);
        if (!depCheck.success) {
            utils.addError(currentEntry, "Chýbajú potrebné moduly: " + depCheck.missing.join(", "), "main");
            message("❌ Chýbajú potrebné moduly!\n\n" + depCheck.missing.join(", "));
            return false;
        }
        
        // KROK 1: Validácia vstupných dát
        utils.addDebug(currentEntry, "\n📋 KROK 1: Validácia vstupných dát");
        
        var requiredFields = [
            CONFIG.fields.attendance.date,
            CONFIG.fields.attendance.arrival,
            CONFIG.fields.attendance.departure
        ];
        
        if (!utils.validateRequiredFields(currentEntry, requiredFields)) {
            utils.addError(currentEntry, "Chýbajú povinné polia", "validácia");
            message("❌ Chyba: Vyplňte všetky povinné polia!");
            return false;
        }
        
        // KROK 2: Získanie údajov
        utils.addDebug(currentEntry, "\n📋 KROK 2: Získavanie údajov");
        
        var datum = utils.safeGet(currentEntry, CONFIG.fields.attendance.date);
        var prichod = utils.safeGet(currentEntry, CONFIG.fields.attendance.arrival);
        var odchod = utils.safeGet(currentEntry, CONFIG.fields.attendance.departure);
        var zamestnanci = utils.safeGetLinks(currentEntry, CONFIG.fields.attendance.employees);
        var praceLinks = utils.safeGetLinks(currentEntry, CONFIG.fields.attendance.works);
        var jazdyLinks = utils.safeGetLinks(currentEntry, CONFIG.fields.attendance.rides);
        
        utils.addDebug(currentEntry, "📅 Dátum: " + utils.formatDate(datum));
        utils.addDebug(currentEntry, "⏰ Príchod: " + prichod + " | Odchod: " + odchod);
        utils.addDebug(currentEntry, "👥 Zamestnancov: " + zamestnanci.length);
        utils.addDebug(currentEntry, "🔨 Prác: " + praceLinks.length);
        utils.addDebug(currentEntry, "🚗 Jázd: " + jazdyLinks.length);
        
        // KROK 3: Výpočet pracovného času
        utils.addDebug(currentEntry, "\n📋 KROK 3: Výpočet pracovného času");
        
        var workTimeCalc = utils.calculateWorkHours(prichod, odchod, 30); // 30 min prestávka
        if (!workTimeCalc || workTimeCalc.totalMinutes <= 0) {
            utils.addError(currentEntry, "Nesprávny čas príchodu/odchodu", "časový výpočet");
            message("❌ Chyba: Čas odchodu musí byť po čase príchodu!");
            return false;
        }
        
        var pracovnaDoba = workTimeCalc.totalMinutes / 60; // V hodinách
        utils.addDebug(currentEntry, "⏱️ Pracovná doba: " + workTimeCalc.hours + "h " + workTimeCalc.minutes + "min");
        utils.addDebug(currentEntry, "⏸️ Prestávka: 30 min (automaticky odpočítaná)");
        
        // KROK 4: Kontrola víkendu a sviatkov
        utils.addDebug(currentEntry, "\n📋 KROK 4: Kontrola víkendu a sviatkov");
        
        var jeVikend = utils.isWeekend(datum);
        var jeSviatok = utils.isHoliday(datum);
        
        if (jeVikend) {
            utils.addDebug(currentEntry, "📅 Víkendová zmena - " + moment(datum).format("dddd"));
        }
        if (jeSviatok) {
            utils.addDebug(currentEntry, "🎉 Práca počas sviatku");
        }
        
        // KROK 5: Spracovanie záznamov práce
        utils.addDebug(currentEntry, "\n📋 KROK 5: Spracovanie záznamov práce");
        
        var hoursOnProjects = 0;
        for (var i = 0; i < praceLinks.length; i++) {
            var praca = praceLinks[i];
            var odpracovaneNaPraci = utils.safeGet(praca, CONFIG.fields.workRecord.workedHours, 0);
            hoursOnProjects += odpracovaneNaPraci;
            
            utils.addDebug(currentEntry, "  🔨 Práca #" + (i + 1) + ": " + odpracovaneNaPraci + "h");
        }
        
        // KROK 6: Spracovanie zamestnancov
        utils.addDebug(currentEntry, "\n📋 KROK 6: Spracovanie zamestnancov");
        
        if (zamestnanci.length === 0) {
            utils.addError(currentEntry, "Žiadni zamestnanci na spracovanie", "zamestnanci");
            message("❌ Chyba: Pridajte aspoň jedného zamestnanca!");
            return false;
        }
        
        var pocetPracovnikov = zamestnanci.length;
        
        for (var j = 0; j < zamestnanci.length; j++) {
            var zamestnanec = zamestnanci[j];
            
            utils.addDebug(currentEntry, "\n--- Zamestnanec " + (j + 1) + "/" + pocetPracovnikov + " ---");
            
            // Získaj detaily zamestnanca
            var details = utils.getEmployeeDetails(zamestnanec, datum);
            if (!details) {
                utils.addError(currentEntry, "Nepodarilo sa získať údaje zamestnanca", "employee_" + j);
                continue;
            }
            
            utils.addDebug(currentEntry, "👤 " + details.fullName);
            utils.addDebug(currentEntry, "📍 Nick: " + details.nick);
            
            // Vypočítaj mzdu
            var mzdaCalc = utils.calculateDailyWage(zamestnanec, pracovnaDoba, datum);
            
            utils.addDebug(currentEntry, "💰 Hodinová sadzba: " + utils.formatMoney(mzdaCalc.hourlyRate) + "/h");
            utils.addDebug(currentEntry, "🕐 Odpracované: " + pracovnaDoba + "h");
            
            // Príplatky za víkend/sviatok
            var priplatok = 0;
            if (jeVikend) {
                priplatok += mzdaCalc.wage * 0.5; // 50% príplatok za víkend
                utils.addDebug(currentEntry, "📅 Víkendový príplatok: +" + utils.formatMoney(mzdaCalc.wage * 0.5));
            }
            if (jeSviatok) {
                priplatok += mzdaCalc.wage * 1.0; // 100% príplatok za sviatok
                utils.addDebug(currentEntry, "🎉 Sviatkový príplatok: +" + utils.formatMoney(mzdaCalc.wage * 1.0));
            }
            
            var celkovaMzda = mzdaCalc.wage + priplatok;
            
            utils.addDebug(currentEntry, "💸 Základná mzda: " + utils.formatMoney(mzdaCalc.wage));
            if (priplatok > 0) {
                utils.addDebug(currentEntry, "➕ Príplatky spolu: " + utils.formatMoney(priplatok));
            }
            utils.addDebug(currentEntry, "💰 Celková mzda: " + utils.formatMoney(celkovaMzda));
            
            // Nastav atribúty na Link to Entry poli
            utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
                                 CONFIG.attributes.employees.workedHours, pracovnaDoba, j);
            
            utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
                                 CONFIG.attributes.employees.hourlyRate, mzdaCalc.hourlyRate, j);
            
            utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
                                 CONFIG.attributes.employees.dailyWage, mzdaCalc.wage, j);
            
            if (priplatok > 0) {
                utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
                                     CONFIG.attributes.employees.bonus, priplatok, j);
            }
            
            utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
                                 CONFIG.attributes.employees.costs, celkovaMzda, j);
            
            // Pripočítaj k celkovým hodnotám
            totalOdpracovane += pracovnaDoba;
            totalMzdoveNaklady += celkovaMzda;
        }
        
        // KROK 7: Výpočet prestojov
        utils.addDebug(currentEntry, "\n📋 KROK 7: Výpočet prestojov");
        
        totalPracovnaDoba = pracovnaDoba * pocetPracovnikov;
        totalNaZakazkach = hoursOnProjects;
        totalPrestoje = Math.max(0, totalOdpracovane - totalNaZakazkach);
        
        utils.addDebug(currentEntry, "⏱️ Celková pracovná doba: " + totalPracovnaDoba + "h");
        utils.addDebug(currentEntry, "🔨 Na zákazkách: " + totalNaZakazkach + "h");
        utils.addDebug(currentEntry, "⏸️ Prestoje: " + totalPrestoje + "h");
        
        // KROK 8: Nastavenie súhrnných polí
        utils.addDebug(currentEntry, "\n📋 KROK 8: Nastavenie súhrnných polí");
        
        utils.safeSet(currentEntry, CONFIG.fields.attendance.employeeCount, pocetPracovnikov);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.workTime, totalPracovnaDoba);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.workedHours, totalOdpracovane);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.onProjects, totalNaZakazkach);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.downtime, totalPrestoje);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.wageCosts, totalMzdoveNaklady);
        
        // KROK 9: Farba záznamu
        utils.addDebug(currentEntry, "\n📋 KROK 9: Nastavenie farby záznamu");
        
        var farba = "#FFFFFF"; // Biela - štandard
        if (jeSviatok) {
            farba = "#FFE6CC"; // Oranžová - sviatok
        } else if (jeVikend) {
            farba = "#FFFFCC"; // Žltá - víkend
        } else if (totalPrestoje > 2) {
            farba = "#FFCCCC"; // Červená - veľa prestojov
        }
        
        utils.safeSet(currentEntry, CONFIG.fields.common.backgroundColor, farba);
        
        // KROK 10: Info pole
        vytvorInfoZaznam();
        
        // Záverečné štatistiky
        utils.addDebug(currentEntry, "\n📊 === VÝSLEDKY PREPOČTU ===");
        utils.addDebug(currentEntry, "👥 Pracovníkov: " + pocetPracovnikov);
        utils.addDebug(currentEntry, "⏱️ Odpracované hodiny: " + totalOdpracovane + "h");
        utils.addDebug(currentEntry, "💰 Mzdové náklady: " + utils.formatMoney(totalMzdoveNaklady));
        utils.addDebug(currentEntry, "✅ === PREPOČET DOKONČENÝ ===");
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        message("❌ Kritická chyba!\n\n" + error.toString());
        return false;
    }
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

/**
 * Vytvorí info záznam s prehľadom
 */
function vytvorInfoZaznam() {
    try {
        var datum = utils.safeGet(currentEntry, CONFIG.fields.attendance.date);
        var jeVikend = utils.isWeekend(datum);
        var jeSviatok = utils.isHoliday(datum);
        
        var infoText = "📋 DOCHÁDZKA - AUTOMATICKÝ PREPOČET\n";
        infoText += "=====================================\n\n";
        
        infoText += "📅 ZÁKLADNÉ ÚDAJE:\n";
        infoText += "• Dátum: " + utils.formatDate(datum) + "\n";
        infoText += "• Deň: " + moment(datum).format("dddd") + "\n";
        if (jeVikend) infoText += "• 📅 Víkendová zmena\n";
        if (jeSviatok) infoText += "• 🎉 Práca počas sviatku\n";
        infoText += "\n";
        
        infoText += "👥 ZAMESTNANCI:\n";
        infoText += "• Počet: " + utils.safeGet(currentEntry, CONFIG.fields.attendance.employeeCount) + " osôb\n";
        infoText += "• Pracovná doba/os: " + (totalPracovnaDoba / utils.safeGet(currentEntry, CONFIG.fields.attendance.employeeCount)).toFixed(2) + "h\n";
        infoText += "\n";
        
        infoText += "⏱️ ČASOVÉ ÚDAJE:\n";
        infoText += "• Celkom odpracované: " + totalOdpracovane + "h\n";
        infoText += "• Na zákazkách: " + totalNaZakazkach + "h\n";
        infoText += "• Prestoje: " + totalPrestoje + "h\n";
        infoText += "\n";
        
        infoText += "💰 FINANČNÉ ÚDAJE:\n";
        infoText += "• Mzdové náklady: " + utils.formatMoney(totalMzdoveNaklady) + "\n";
        infoText += "• Priemer/os: " + utils.formatMoney(totalMzdoveNaklady / utils.safeGet(currentEntry, CONFIG.fields.attendance.employeeCount)) + "\n";
        infoText += "\n";
        
        infoText += "🔧 TECHNICKÉ INFO:\n";
        infoText += "• Script: Dochádzka Prepočet v7.1\n";
        infoText += "• MementoUtils: v" + utils.version + "\n";
        infoText += "• Čas prepočtu: " + moment().format("HH:mm:ss") + "\n";
        infoText += "• Trigger: Before Save\n\n";
        
        infoText += "✅ PREPOČET ÚSPEŠNE DOKONČENÝ";
        
        utils.safeSet(currentEntry, CONFIG.fields.common.info, infoText);
        utils.addDebug(currentEntry, "✅ Info záznam vytvorený");
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri vytváraní info záznamu", "vytvorInfoZaznam", error);
    }
}

/**
 * Zobrazí užívateľovi súhrnnú správu
 */
function zobrazSuhrn() {
    var summaryMessage = "✅ PREPOČET DOKONČENÝ\n\n";
    summaryMessage += "👥 Pracovníkov: " + utils.safeGet(currentEntry, CONFIG.fields.attendance.employeeCount) + "\n";
    summaryMessage += "⏱️ Odpracované: " + totalOdpracovane + "h\n";
    summaryMessage += "💰 Náklady: " + utils.formatMoney(totalMzdoveNaklady) + "\n";
    
    if (totalPrestoje > 0) {
        summaryMessage += "\n⚠️ Prestoje: " + totalPrestoje + "h";
    }
    
    message(summaryMessage);
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
        }
        
        var pracovnaDoba = workTimeCalc.totalMinutes / 60; // V hodinách
        utils.addDebug(currentEntry, "⏱️ Pracovná doba: " + workTimeCalc.hours + "h " + workTimeCalc.minutes + "min");
        utils.addDebug(currentEntry, "⏸️ Prestávka: 30 min (automaticky odpočítaná)");
        
        // KROK 4: Kontrola víkendu a sviatkov
        utils.addDebug(currentEntry, "\n📋 KROK 4: Kontrola víkendu a sviatkov");
        
        var jeVikend = utils.isWeekend(datum);
        var jeSviatok = utils.isHoliday(datum);
        
        if (jeVikend) {
            utils.addDebug(currentEntry, "📅 Víkendová zmena - " + moment(datum).format("dddd"));
        }
        if (jeSviatok) {
            utils.addDebug(currentEntry, "🎉 Práca počas sviatku");
        }
        
        // KROK 5: Spracovanie záznamov práce
        utils.addDebug(currentEntry, "\n📋 KROK 5: Spracovanie záznamov práce");
        
        var hoursOnProjects = 0;
        for (var i = 0; i < praceLinks.length; i++) {
            var praca = praceLinks[i];
            var odpracovaneNaPraci = utils.safeGet(praca, CONFIG.fields.workRecord.workedHours, 0);
            hoursOnProjects += odpracovaneNaPraci;
            
            utils.addDebug(currentEntry, "  🔨 Práca #" + (i + 1) + ": " + odpracovaneNaPraci + "h");
        }
        
        // KROK 6: Spracovanie zamestnancov
        utils.addDebug(currentEntry, "\n📋 KROK 6: Spracovanie zamestnancov");
        
        if (zamestnanci.length === 0) {
            utils.addError(currentEntry, "Žiadni zamestnanci na spracovanie", "zamestnanci");
            message("❌ Chyba: Pridajte aspoň jedného zamestnanca!");
            return false;
        }
        
        var pocetPracovnikov = zamestnanci.length;
        
        for (var j = 0; j < zamestnanci.length; j++) {
            var zamestnanec = zamestnanci[j];
            
            utils.addDebug(currentEntry, "\n--- Zamestnanec " + (j + 1) + "/" + pocetPracovnikov + " ---");
            
            // Získaj detaily zamestnanca
            var details = utils.getEmployeeDetails(zamestnanec, datum);
            if (!details) {
                utils.addError(currentEntry, "Nepodarilo sa získať údaje zamestnanca", "employee_" + j);
                continue;
            }
            
            utils.addDebug(currentEntry, "👤 " + details.fullName);
            utils.addDebug(currentEntry, "📍 Nick: " + details.nick);
            
            // Vypočítaj mzdu
            var mzdaCalc = utils.calculateDailyWage(zamestnanec, pracovnaDoba, datum);
            
            utils.addDebug(currentEntry, "💰 Hodinová sadzba: " + utils.formatMoney(mzdaCalc.hourlyRate) + "/h");
            utils.addDebug(currentEntry, "🕐 Odpracované: " + pracovnaDoba + "h");
            
            // Príplatky za víkend/sviatok
            var priplatok = 0;
            if (jeVikend) {
                priplatok += mzdaCalc.wage * 0.5; // 50% príplatok za víkend
                utils.addDebug(currentEntry, "📅 Víkendový príplatok: +" + utils.formatMoney(mzdaCalc.wage * 0.5));
            }
            if (jeSviatok) {
                priplatok += mzdaCalc.wage * 1.0; // 100% príplatok za sviatok
                utils.addDebug(currentEntry, "🎉 Sviatkový príplatok: +" + utils.formatMoney(mzdaCalc.wage * 1.0));
            }
            
            var celkovaMzda = mzdaCalc.wage + priplatok;
            
            utils.addDebug(currentEntry, "💸 Základná mzda: " + utils.formatMoney(mzdaCalc.wage));
            if (priplatok > 0) {
                utils.addDebug(currentEntry, "➕ Príplatky spolu: " + utils.formatMoney(priplatok));
            }
            utils.addDebug(currentEntry, "💰 Celková mzda: " + utils.formatMoney(celkovaMzda));
            
            // Nastav atribúty na Link to Entry poli
            utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
                                 CONFIG.attributes.employees.workedHours, pracovnaDoba, j);
            
            utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
                                 CONFIG.attributes.employees.hourlyRate, mzdaCalc.hourlyRate, j);
            
            utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
                                 CONFIG.attributes.employees.dailyWage, mzdaCalc.wage, j);
            
            if (priplatok > 0) {
                utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
                                     CONFIG.attributes.employees.bonus, priplatok, j);
            }
            
            utils.safeSetAttribute(currentEntry, CONFIG.fields.attendance.employees, 
                                 CONFIG.attributes.employees.costs, celkovaMzda, j);
            
            // Pripočítaj k celkovým hodnotám
            totalOdpracovane += pracovnaDoba;
            totalMzdoveNaklady += celkovaMzda;
        }
        
        // KROK 7: Výpočet prestojov
        utils.addDebug(currentEntry, "\n📋 KROK 7: Výpočet prestojov");
        
        totalPracovnaDoba = pracovnaDoba * pocetPracovnikov;
        totalNaZakazkach = hoursOnProjects;
        totalPrestoje = Math.max(0, totalOdpracovane - totalNaZakazkach);
        
        utils.addDebug(currentEntry, "⏱️ Celková pracovná doba: " + totalPracovnaDoba + "h");
        utils.addDebug(currentEntry, "🔨 Na zákazkách: " + totalNaZakazkach + "h");
        utils.addDebug(currentEntry, "⏸️ Prestoje: " + totalPrestoje + "h");
        
        // KROK 8: Nastavenie súhrnných polí
        utils.addDebug(currentEntry, "\n📋 KROK 8: Nastavenie súhrnných polí");
        
        utils.safeSet(currentEntry, CONFIG.fields.attendance.employeeCount, pocetPracovnikov);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.workTime, totalPracovnaDoba);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.workedHours, totalOdpracovane);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.onProjects, totalNaZakazkach);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.downtime, totalPrestoje);
        utils.safeSet(currentEntry, CONFIG.fields.attendance.wageCosts, totalMzdoveNaklady);
        
        // KROK 9: Farba záznamu
        utils.addDebug(currentEntry, "\n📋 KROK 9: Nastavenie farby záznamu");
        
        var farba = "#FFFFFF"; // Biela - štandard
        if (jeSviatok) {
            farba = "#FFE6CC"; // Oranžová - sviatok
        } else if (jeVikend) {
            farba = "#FFFFCC"; // Žltá - víkend
        } else if (totalPrestoje > 2) {
            farba = "#FFCCCC"; // Červená - veľa prestojov
        }
        
        utils.safeSet(currentEntry, CONFIG.fields.common.backgroundColor, farba);
        
        // KROK 10: Info pole
        vytvorInfoZaznam();
        
        // Záverečné štatistiky
        utils.addDebug(currentEntry, "\n📊 === VÝSLEDKY PREPOČTU ===");
        utils.addDebug(currentEntry, "👥 Pracovníkov: " + pocetPracovnikov);
        utils.addDebug(currentEntry, "⏱️ Odpracované hodiny: " + totalOdpracovane + "h");
        utils.addDebug(currentEntry, "💰 Mzdové náklady: " + utils.formatMoney(totalMzdoveNaklady));
        utils.addDebug(currentEntry, "✅ === PREPOČET DOKONČENÝ ===");
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        message("❌ Kritická chyba!\n\n" + error.toString());
        return false;
    }
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

/**
 * Vytvorí info záznam s prehľadom
 */
function vytvorInfoZaznam() {
    try {
        var datum = utils.safeGet(currentEntry, CONFIG.fields.attendance.date);
        var jeVikend = utils.isWeekend(datum);
        var jeSviatok = utils.isHoliday(datum);
        
        var infoText = "📋 DOCHÁDZKA - AUTOMATICKÝ PREPOČET\n";
        infoText += "=====================================\n\n";
        
        infoText += "📅 ZÁKLADNÉ ÚDAJE:\n";
        infoText += "• Dátum: " + utils.formatDate(datum) + "\n";
        infoText += "• Deň: " + moment(datum).format("dddd") + "\n";
        if (jeVikend) infoText += "• 📅 Víkendová zmena\n";
        if (jeSviatok) infoText += "• 🎉 Práca počas sviatku\n";
        infoText += "\n";
        
        infoText += "👥 ZAMESTNANCI:\n";
        infoText += "• Počet: " + utils.safeGet(currentEntry, CONFIG.fields.attendance.employeeCount) + " osôb\n";
        infoText += "• Pracovná doba/os: " + (totalPracovnaDoba / utils.safeGet(currentEntry, CONFIG.fields.attendance.employeeCount)).toFixed(2) + "h\n";
        infoText += "\n";
        
        infoText += "⏱️ ČASOVÉ ÚDAJE:\n";
        infoText += "• Celkom odpracované: " + totalOdpracovane + "h\n";
        infoText += "• Na zákazkách: " + totalNaZakazkach + "h\n";
        infoText += "• Prestoje: " + totalPrestoje + "h\n";
        infoText += "\n";
        
        infoText += "💰 FINANČNÉ ÚDAJE:\n";
        infoText += "• Mzdové náklady: " + utils.formatMoney(totalMzdoveNaklady) + "\n";
        infoText += "• Priemer/os: " + utils.formatMoney(totalMzdoveNaklady / utils.safeGet(currentEntry, CONFIG.fields.attendance.employeeCount)) + "\n";
        infoText += "\n";
        
        infoText += "🔧 TECHNICKÉ INFO:\n";
        infoText += "• Script: Dochádzka Prepočet v7.1\n";
        infoText += "• MementoUtils: v" + utils.version + "\n";
        infoText += "• Čas prepočtu: " + moment().format("HH:mm:ss") + "\n";
        infoText += "• Trigger: Before Save\n\n";
        
        infoText += "✅ PREPOČET ÚSPEŠNE DOKONČENÝ";
        
        utils.safeSet(currentEntry, CONFIG.fields.common.info, infoText);
        utils.addDebug(currentEntry, "✅ Info záznam vytvorený");
        
    } catch (error) {
        utils.addError(currentEntry, "Chyba pri vytváraní info záznamu", "vytvorInfoZaznam", error);
    }
}

/**
 * Zobrazí užívateľovi súhrnnú správu
 */
function zobrazSuhrn() {
    var summaryMessage = "✅ PREPOČET DOKONČENÝ\n\n";
    summaryMessage += "👥 Pracovníkov: " + utils.safeGet(currentEntry, CONFIG.fields.attendance.employeeCount) + "\n";
    summaryMessage += "⏱️ Odpracované: " + totalOdpracovane + "h\n";
    summaryMessage += "💰 Náklady: " + utils.formatMoney(totalMzdoveNaklady) + "\n";
    
    if (totalPrestoje > 0) {
        summaryMessage += "\n⚠️ Prestoje: " + totalPrestoje + "h";
    }
    
    message(summaryMessage);
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