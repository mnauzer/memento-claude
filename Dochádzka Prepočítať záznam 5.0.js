// ==============================================
// MEMENTO DATABASE - DOCHÁDZKA PREPOČÍTAŤ ZÁZNAM
// Verzia: 5.1 | Dátum: August 2025 | Autor: ASISTANTO
// Knižnica: Dochádzka | Trigger: Before Save
// ==============================================
// ✅ OPRAVENÉ v5.1:
//    - Správne nastavovanie atribútov (2 parametre)
//    - Integrácia s MementoConfig v1.1
//    - Vylepšené lazy loading
//    - Konzistentné error handling
//    - Odstránené duplicitné CONFIG sekcie
// ==============================================

// ==============================================
// MODULE LOADING A INICIALIZÁCIA
// ==============================================

var utils = null;
var config = null;
var currentEntry = entry();

/**
 * Lazy loading pre MementoUtils
 */
function getUtils() {
    if (!utils) {
        if (typeof MementoUtils !== 'undefined') {
            utils = MementoUtils;
        } else {
            throw new Error("MementoUtils knižnica nie je dostupná!");
        }
    }
    return utils;
}

/**
 * Lazy loading pre konfiguráciu
 */
function getConfig() {
    if (!config) {
        // Priorita 1: Centralizovaný MementoConfig
        if (typeof MementoConfig !== 'undefined') {
            MementoConfig.init();
            var baseConfig = MementoConfig.getConfig('attendance');
            
            config = {
                debug: true,
                version: "5.1",
                scriptName: "Dochádzka Prepočet",
                
                // Field mappings z centrálneho config
                fields: baseConfig.fieldMappings.attendance,
                attributes: baseConfig.fieldMappings.attendanceAttributes,
                
                // Library names
                libraries: {
                    sadzbyZamestnancov: baseConfig.libraries.business.rates
                },
                
                // Sadzby field names
                sadzbyFields: baseConfig.fieldMappings.employeeRates,
                
                // Business settings
                settings: {
                    roundToQuarterHour: true,
                    quarterHourMinutes: 15
                }
            };
        } else {
            // Fallback na lokálny config
            config = getLocalConfig();
        }
    }
    return config;
}

/**
 * Lokálny fallback config
 */
function getLocalConfig() {
    return {
        debug: true,
        version: "5.1",
        scriptName: "Dochádzka Prepočet",
        
        fields: {
            zamestnanci: "Zamestnanci",
            datum: "Dátum",
            prichod: "Príchod",
            odchod: "Odchod",
            pracovnaDoba: "Pracovná doba",
            pocetPracovnikov: "Počet pracovníkov",
            odpracovane: "Odpracované",
            mzdoveNaklady: "Mzdové náklady",
            info: "info",
            debugLog: "Debug_Log",
            errorLog: "Error_Log"
        },
        
        attributes: {
            odpracovane: "odpracované",
            hodinovka: "hodinovka",
            priplatok: "+príplatok (€/h)",
            premia: "+prémia (€)",
            pokuta: "-pokuta (€)",
            dennaMzda: "denná mzda"
        },
        
        libraries: {
            sadzbyZamestnancov: "sadzby zamestnancov"
        },
        
        sadzbyFields: {
            zamestnanec: "Zamestnanec",
            platnostOd: "Platnosť od",
            sadzba: "Sadzba"
        },
        
        settings: {
            roundToQuarterHour: true,
            quarterHourMinutes: 15
        }
    };
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        var utils = getUtils();
        var CONFIG = getConfig();
        
        // Vyčisti logy na začiatku
        utils.clearLogs(currentEntry, false);
        
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
        
        // KROK 1: Načítanie a validácia
        var validationResult = validateInputData();
        if (!validationResult.success) {
            utils.addError(currentEntry, "Validácia zlyhala: " + validationResult.error, CONFIG.scriptName);
            return;
        }
        steps.step1.success = true;
        
        // KROK 2: Výpočet pracovnej doby
        var workTimeResult = calculateWorkTime(validationResult.datum, validationResult.prichod, validationResult.odchod);
        if (!workTimeResult.success) {
            utils.addError(currentEntry, "Výpočet času zlyhal", CONFIG.scriptName);
            return;
        }
        steps.step2.success = true;
        
        // KROK 3: Spracovanie zamestnancov
        var employeeResult = processEmployees(validationResult.zamestnanci, workTimeResult.pracovnaDobaHodiny, validationResult.datum);
        steps.step3.success = employeeResult.success;
        
        // KROK 4: Celkové výpočty
        if (employeeResult.success) {
            steps.step4.success = calculateTotals(employeeResult);
        }
        
        // KROK 5: Info záznam
        steps.step5.success = createInfoRecord(workTimeResult, employeeResult);
        
        // Finálny log
        logFinalSummary(steps);
        
    } catch (error) {
        getUtils().addError(currentEntry, error.toString(), "main", error);
    }
}

// ==============================================
// KROK 1: VALIDÁCIA VSTUPNÝCH DÁT
// ==============================================

function validateInputData() {
    var utils = getUtils();
    var CONFIG = getConfig();
    
    try {
        utils.addDebug(currentEntry, "\n📋 KROK 1: Validácia vstupných dát");
        
        var datum = currentEntry.field(CONFIG.fields.datum);
        var prichod = currentEntry.field(CONFIG.fields.prichod);
        var odchod = currentEntry.field(CONFIG.fields.odchod);
        var zamestnanci = currentEntry.field(CONFIG.fields.zamestnanci) || [];
        
        // Kontrola dátumu
        if (!datum) {
            return { success: false, error: "Dátum nie je vyplnený" };
        }
        
        // Kontrola času
        if (!prichod || !odchod) {
            return { success: false, error: "Príchod alebo odchod nie je vyplnený" };
        }
        
        // Kontrola zamestnancov
        if (zamestnanci.length === 0) {
            return { success: false, error: "Žiadni zamestnanci v zázname" };
        }
        
        utils.addDebug(currentEntry, "✅ Validácia úspešná");
        utils.addDebug(currentEntry, "  • Dátum: " + utils.formatDate(datum, "DD.MM.YYYY"));
        utils.addDebug(currentEntry, "  • Čas: " + utils.formatTime(prichod) + " - " + utils.formatTime(odchod));
        utils.addDebug(currentEntry, "  • Počet zamestnancov: " + zamestnanci.length);
        
        return {
            success: true,
            datum: datum,
            prichod: prichod,
            odchod: odchod,
            zamestnanci: zamestnanci
        };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "validateInputData", error);
        return { success: false, error: error.toString() };
    }
}

// ==============================================
// KROK 2: VÝPOČET PRACOVNEJ DOBY
// ==============================================

function calculateWorkTime(datum, prichod, odchod) {
    var utils = getUtils();
    var CONFIG = getConfig();
    
    try {
        utils.addDebug(currentEntry, "\n⏱️ KROK 2: Výpočet pracovnej doby");
        
        // Zaokrúhlenie časov
        var prichodRounded = prichod;
        var odchodRounded = odchod;
        
        if (CONFIG.settings.roundToQuarterHour) {
            prichodRounded = utils.roundToQuarter(prichod, 'up');
            odchodRounded = utils.roundToQuarter(odchod, 'down');
            
            utils.addDebug(currentEntry, "  • Zaokrúhlené časy: " + 
                utils.formatTime(prichodRounded) + " - " + 
                utils.formatTime(odchodRounded));
        }
        
        // Výpočet hodín
        var workHours = utils.calculateWorkHours(prichodRounded, odchodRounded);
        
        if (!workHours || workHours.error) {
            return { success: false, error: workHours ? workHours.error : "Nepodarilo sa vypočítať hodiny" };
        }
        
        var pracovnaDobaHodiny = workHours.hours + (workHours.minutes / 60);
        pracovnaDobaHodiny = Math.round(pracovnaDobaHodiny * 100) / 100;
        
        // Ulož do poľa
        currentEntry.set(CONFIG.fields.pracovnaDoba, pracovnaDobaHodiny);
        
        utils.addDebug(currentEntry, "✅ Pracovná doba: " + pracovnaDobaHodiny + " hodín");
        
        return {
            success: true,
            prichodRounded: prichodRounded,
            odchodRounded: odchodRounded,
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
    var utils = getUtils();
    var CONFIG = getConfig();
    
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
    var utils = getUtils();
    var CONFIG = getConfig();
    
    try {
        // Nájdi platnú hodinovku
        var hodinovka = findValidSalary(zamestnanec, datum);
        
        if (!hodinovka || hodinovka <= 0) {
            utils.addDebug(currentEntry, "  ❌ Preskakujem - nemá platnú sadzbu");
            return { success: false };
        }
        
        // SPRÁVNE NASTAVENIE ATRIBÚTOV - cez pole a index
        var zamArray = currentEntry.field(CONFIG.fields.zamestnanci);
        
        if (zamArray && zamArray.length > index) {
            // Nastav základné atribúty
            zamArray[index].attr(CONFIG.attributes.odpracovane, pracovnaDobaHodiny);
            zamArray[index].attr(CONFIG.attributes.hodinovka, hodinovka);
            
            // Získaj príplatky a zrážky z existujúcich atribútov
            var priplatok = zamArray[index].attr(CONFIG.attributes.priplatok) || 0;
            var premia = zamArray[index].attr(CONFIG.attributes.premia) || 0;
            var pokuta = zamArray[index].attr(CONFIG.attributes.pokuta) || 0;
            
            // Vypočítaj dennú mzdu
            var dennaMzda = (pracovnaDobaHodiny * (hodinovka + priplatok)) + premia - pokuta;
            dennaMzda = Math.round(dennaMzda * 100) / 100;
            
            // Nastav dennú mzdu
            zamArray[index].attr(CONFIG.attributes.dennaMzda, dennaMzda);
            
            utils.addDebug(currentEntry, "  ✅ Hodinovka: " + hodinovka + " €/h");
            if (priplatok > 0) utils.addDebug(currentEntry, "  ✅ Príplatok: +" + priplatok + " €/h");
            if (premia > 0) utils.addDebug(currentEntry, "  ✅ Prémia: +" + premia + " €");
            if (pokuta > 0) utils.addDebug(currentEntry, "  ✅ Pokuta: -" + pokuta + " €");
            utils.addDebug(currentEntry, "  ✅ Denná mzda: " + dennaMzda + " €");
            
            return {
                success: true,
                hodinovka: hodinovka,
                dennaMzda: dennaMzda,
                priplatok: priplatok,
                premia: premia,
                pokuta: pokuta
            };
        } else {
            utils.addError(currentEntry, "Nepodarilo sa získať pole zamestnancov pre index " + index, "processEmployee");
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
    var utils = getUtils();
    var CONFIG = getConfig();
    
    try {
        var employeeName = utils.formatEmployeeName(zamestnanec);
        utils.addDebug(currentEntry, "🔍 Hľadám platnú sadzbu");
        
        // Získaj sadzby zamestnanca
        var sadzby = zamestnanec.linksFrom(CONFIG.libraries.sadzbyZamestnancov, CONFIG.sadzbyFields.zamestnanec);
        
        if (!sadzby || sadzby.length === 0) {
            utils.addError(currentEntry, "Zamestnanec " + employeeName + " nemá žiadne sadzby", "findValidSalary");
            return null;
        }
        
        utils.addDebug(currentEntry, "  ✅ Našiel " + sadzby.length + " sadzieb");
        
        var aktualnaHodinovka = null;
        var najnovsiDatum = null;
        
        // Analyzuj všetky sadzby
        for (var i = 0; i < sadzby.length; i++) {
            var sadzba = sadzby[i];
            
            var platnostOd = sadzba.field(CONFIG.sadzbyFields.platnostOd);
            var hodinovka = sadzba.field(CONFIG.sadzbyFields.sadzba);
            
            // Kontrola platnosti k dátumu
            if (platnostOd && hodinovka && platnostOd <= datum) {
                if (!najnovsiDatum || platnostOd > najnovsiDatum) {
                    najnovsiDatum = platnostOd;
                    aktualnaHodinovka = hodinovka;
                }
            }
        }
        
        if (!aktualnaHodinovka || aktualnaHodinovka <= 0) {
            utils.addError(currentEntry, "Nenašla sa platná sadzba k dátumu", "findValidSalary");
            return null;
        }
        
        utils.addDebug(currentEntry, "  💶 Platná hodinovka: " + aktualnaHodinovka + " €/h");
        return aktualnaHodinovka;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "findValidSalary", error);
        return null;
    }
}

// ==============================================
// KROK 4: CELKOVÉ VÝPOČTY
// ==============================================

function calculateTotals(employeeResult) {
    var utils = getUtils();
    var CONFIG = getConfig();
    
    try {
        utils.addDebug(currentEntry, "\n💰 KROK 4: Celkové výpočty");
        
        // Ulož celkové hodnoty
        currentEntry.set(CONFIG.fields.odpracovane, employeeResult.odpracovaneTotal);
        currentEntry.set(CONFIG.fields.mzdoveNaklady, employeeResult.celkoveMzdy);
        
        utils.addDebug(currentEntry, "✅ Celkové výpočty:");
        utils.addDebug(currentEntry, "  • Odpracované spolu: " + employeeResult.odpracovaneTotal + " hodín");
        utils.addDebug(currentEntry, "  • Mzdové náklady: " + utils.formatMoney(employeeResult.celkoveMzdy));
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "calculateTotals", error);
        return false;
    }
}

// ==============================================
// KROK 5: VYTVORENIE INFO ZÁZNAMU
// ==============================================

function createInfoRecord(workTimeResult, employeeResult) {
    var utils = getUtils();
    var CONFIG = getConfig();
    
    try {
        utils.addDebug(currentEntry, "\n📝 KROK 5: Vytvorenie info záznamu");
        
        var datum = currentEntry.field(CONFIG.fields.datum);
        var datumFormatted = utils.formatDate(datum, "DD.MM.YYYY");
        var dayName = moment(datum).format("dddd");
        
        var infoMessage = "📋 DOCHÁDZKA - AUTOMATICKÝ PREPOČET\n";
        infoMessage += "═══════════════════════════════════\n\n";
        
        infoMessage += "📅 Dátum: " + datumFormatted + " (" + dayName + ")\n";
        infoMessage += "⏰ Pracovný čas: " + utils.formatTime(workTimeResult.prichodRounded) + 
                       " - " + utils.formatTime(workTimeResult.odchodRounded) + "\n";
        infoMessage += "⏱️ Pracovná doba: " + workTimeResult.pracovnaDobaHodiny + " hodín\n\n";
        
        infoMessage += "👥 ZAMESTNANCI (" + employeeResult.pocetPracovnikov + " osôb):\n";
        infoMessage += "───────────────────────────────────\n";
        
        for (var i = 0; i < employeeResult.detaily.length; i++) {
            var detail = employeeResult.detaily[i];
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
    var utils = getUtils();
    var CONFIG = getConfig();
    
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
// SPUSTENIE HLAVNEJ FUNKCIE
// ==============================================

main();