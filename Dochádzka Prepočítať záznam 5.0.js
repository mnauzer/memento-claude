// ==============================================
// MEMENTO DATABASE - DOCHÁDZKA PREPOČÍTAŤ ZÁZNAM
// Verzia: 5.0 | Dátum: 20.08.2025 | Autor: ASISTANTO
// Knižnica: Dochádzka | Trigger: Before Save
// ==============================================
// ✅ KOMPLETNÝ REFAKTORING v5.0:
//    - Plná integrácia s MementoUtils 3.3+
//    - Odstránené všetky duplicitné funkcie
//    - Konzistentné s Group Summary a Individual Notifications
//    - Vylepšené formátovanie času (bez SEČ)
//    - Modulárna štruktúra kódu
//    - Rozšírené debug informácie
//    - Business modul integrácia
// ==============================================

// Import knižníc
var utils = null;
var business = null; // Ak je dostupný business modul
var currentEntry = entry();

try {
    utils = MementoUtils;
} catch(e) {
    // MementoUtils nie je definované
}

// Alebo lepšie - s funkciou
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

function getBusiness() {
    if (!business) {
        try {
            // Najprv skús cez utils
            var u = getUtils();
            if (u && u.business) {
                business = u.business;
            } else if (typeof MementoBusiness !== 'undefined') {
                business = MementoBusiness;
            }
        } catch(e) {
            // Business modul je optional
        }
    }
    return business;
}
// Konfigurácia
// ==============================================
// CONFIG INITIALIZATION
// ==============================================

var CONFIG = (function() {
    // Try centralized config first
    if (typeof MementoConfigAdapter !== 'undefined') {
        try {
            var adapter = MementoConfigAdapter.getAdapter('attendance');
            // Merge with script-specific config
            adapter.scriptName = "Dochádzka Group Summary";
            adapter.version = "5.0";
            return adapter;
        } catch (e) {
            // Fallback
        }
    }
    
    // Original config as fallback
    return {
        debug: true,
        version: "5.0",
        scriptName: "Dochádzka Prepočet",
        
        // Názvy polí - Dochádzka
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
        
        // Názvy atribútov pre zamestnancov
        attributes: {
            odpracovane: "odpracované",
            hodinovka: "hodinovka",
            priplatok: "+príplatok (€/h)",
            premia: "+prémia (€)",
            pokuta: "-pokuta (€)",
            dennaMzda: "denná mzda"
        },
        
        // Názvy knižníc
        libraries: {
            sadzbyZamestnancov: "sadzby zamestnancov"
        },
        
        // Polia v knižnici sadzby zamestnancov
        sadzbyFields: {
            zamestnanec: "Zamestnanec",
            platnostOd: "Platnosť od",
            sadzba: "Sadzba"
        },
        
        // Nastavenia zaokrúhľovania
        settings: {
            roundToQuarterHour: true,
            quarterHourMinutes: 15
        }
    };
})();

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
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
        
        // KROK 1: NAČÍTANIE A VALIDÁCIA DÁT
        utils.addDebug(currentEntry, "\n📋 KROK 1: " + steps.step1.name);
        steps.step1.success = validateInputData();
        
        if (!steps.step1.success) {
            logFinalStatus(steps);
            return false;
        }
        
        // KROK 2: VÝPOČET PRACOVNEJ DOBY
        utils.addDebug(currentEntry, "\n📋 KROK 2: " + steps.step2.name);
        var workTimeResult = calculateWorkTime();
        steps.step2.success = workTimeResult.success;
        
        if (!steps.step2.success) {
            logFinalStatus(steps);
            return false;
        }
        
        // KROK 3: SPRACOVANIE ZAMESTNANCOV
        utils.addDebug(currentEntry, "\n📋 KROK 3: " + steps.step3.name);
        var employeeResult = processEmployees(workTimeResult.pracovnaDobaHodiny);
        steps.step3.success = employeeResult.success;
        
        // KROK 4: CELKOVÉ VÝPOČTY
        utils.addDebug(currentEntry, "\n📋 KROK 4: " + steps.step4.name);
        steps.step4.success = calculateTotals(employeeResult);
        
        // KROK 5: INFO ZÁZNAM
        utils.addDebug(currentEntry, "\n📋 KROK 5: " + steps.step5.name);
        steps.step5.success = createInfoRecord(workTimeResult, employeeResult);
        
        // Finálne vyhodnotenie
        var globalSuccess = Object.keys(steps).every(function(key) {
            return steps[key].success;
        });
        
        logFinalStatus(steps);
        showUserMessage(globalSuccess, employeeResult);
        
        return globalSuccess;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), CONFIG.scriptName, error);
        message("💥 KRITICKÁ CHYBA!\n\nScript zlyhal. Pozri Error_Log.");
        return false;
    }
}

// ==============================================
// KROK 1: VALIDÁCIA VSTUPNÝCH DÁT
// ==============================================

function validateInputData() {
    try {
        var zamestnanci = utils.safeGetLinks(currentEntry, CONFIG.fields.zamestnanci);
        var datum = currentEntry.field(CONFIG.fields.datum);
        var prichod = currentEntry.field(CONFIG.fields.prichod);
        var odchod = currentEntry.field(CONFIG.fields.odchod);
        
        // Kontrola povinných polí
        if (!datum) {
            utils.addError(currentEntry, "Chýba dátum dochádzky", "validateInputData");
            return false;
        }
        
        if (!prichod || !odchod) {
            utils.addError(currentEntry, "Chýbajú časy príchodu/odchodu", "validateInputData");
            return false;
        }
        
        // Kontrola zamestnancov
        if (!zamestnanci || zamestnanci.length === 0) {
            utils.addError(currentEntry, "Žiadni zamestnanci v dochádzke", "validateInputData");
            return false;
        }
        
        utils.addDebug(currentEntry, "✅ Validácia úspešná:");
        utils.addDebug(currentEntry, "  • Dátum: " + utils.formatDate(datum, "DD.MM.YYYY"));
        utils.addDebug(currentEntry, "  • Príchod: " + utils.formatTime(prichod));
        utils.addDebug(currentEntry, "  • Odchod: " + utils.formatTime(odchod));
        utils.addDebug(currentEntry, "  • Zamestnanci: " + zamestnanci.length);
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "validateInputData", error);
        return false;
    }
}

// ==============================================
// KROK 2: VÝPOČET PRACOVNEJ DOBY
// ==============================================

function calculateWorkTime() {
    try {
        var prichod = currentEntry.field(CONFIG.fields.prichod);
        var odchod = currentEntry.field(CONFIG.fields.odchod);
        var datum = currentEntry.field(CONFIG.fields.datum);
        
        // Použitie business modulu ak je dostupný
        if (business && typeof business.calculateWorkHours === 'function') {
            var businessResult = business.calculateWorkHours(prichod, odchod);
            
            if (businessResult.success) {
                utils.addDebug(currentEntry, "✅ Použitý business modul pre výpočet");
                
                // Zaokrúhli časy ak je to povolené
                if (CONFIG.settings.roundToQuarterHour) {
                    businessResult.arrivalRounded = utils.roundToQuarter(businessResult.arrival);
                    businessResult.departureRounded = utils.roundToQuarter(businessResult.departure);
                    businessResult.hoursRounded = (businessResult.departureRounded - businessResult.arrivalRounded) / (1000 * 60 * 60);
                }
                
                // Ulož výsledky
                currentEntry.set(CONFIG.fields.pracovnaDoba, businessResult.hoursRounded || businessResult.hours);
                
                return {
                    success: true,
                    pracovnaDobaHodiny: businessResult.hoursRounded || businessResult.hours,
                    prichodRounded: businessResult.arrivalRounded || businessResult.arrival,
                    odchodRounded: businessResult.departureRounded || businessResult.departure
                };
            }
        }
        
        // Fallback na manuálny výpočet
        utils.addDebug(currentEntry, "📊 Manuálny výpočet pracovnej doby");
        
        var prichodMoment = moment(prichod);
        var odchodMoment = moment(odchod);
        
        // Zaokrúhli časy
        var prichodRounded = prichodMoment;
        var odchodRounded = odchodMoment;
        
        if (CONFIG.settings.roundToQuarterHour) {
            prichodRounded = utils.roundToQuarter(prichodMoment);
            odchodRounded = utils.roundToQuarter(odchodMoment);
            
            utils.addDebug(currentEntry, "⏰ Zaokrúhlené časy:");
            utils.addDebug(currentEntry, "  • Príchod: " + utils.formatTime(prichodMoment) + " → " + utils.formatTime(prichodRounded));
            utils.addDebug(currentEntry, "  • Odchod: " + utils.formatTime(odchodMoment) + " → " + utils.formatTime(odchodRounded));
        }
        
        // Výpočet hodín
        var pracovnaDobaMs = odchodRounded - prichodRounded;
        var pracovnaDobaHodiny = Math.round(pracovnaDobaMs / (1000 * 60 * 60) * 100) / 100;
        
        // Kontrola validity
        if (pracovnaDobaHodiny <= 0) {
            utils.addError(currentEntry, "Neplatná pracovná doba: " + pracovnaDobaHodiny + "h", "calculateWorkTime");
            return { success: false };
        }
        
        if (pracovnaDobaHodiny > 24) {
            utils.addError(currentEntry, "Pracovná doba presahuje 24 hodín", "calculateWorkTime");
            return { success: false };
        }
        
        // Ulož do poľa
        currentEntry.set(CONFIG.fields.pracovnaDoba, pracovnaDobaHodiny);
        
        utils.addDebug(currentEntry, "✅ Pracovná doba: " + pracovnaDobaHodiny + " hodín");
        
        return {
            success: true,
            pracovnaDobaHodiny: pracovnaDobaHodiny,
            prichodRounded: prichodRounded,
            odchodRounded: odchodRounded
        };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "calculateWorkTime", error);
        return { success: false };
    }
}

// ==============================================
// KROK 3: SPRACOVANIE ZAMESTNANCOV
// ==============================================

function processEmployees(pracovnaDobaHodiny) {
    try {
        var zamestnanci = utils.safeGetLinks(currentEntry, CONFIG.fields.zamestnanci);
        var datum = currentEntry.field(CONFIG.fields.datum);
        
        var result = {
            success: true,
            pocetPracovnikov: zamestnanci.length,
            odpracovaneTotal: 0,
            celkoveMzdy: 0,
            detaily: []
        };
        
        // Nastav počet pracovníkov
        currentEntry.set(CONFIG.fields.pocetPracovnikov, result.pocetPracovnikov);
        
        utils.addDebug(currentEntry, "👥 Spracovávam " + result.pocetPracovnikov + " zamestnancov");
        
        // Spracuj každého zamestnanca
        for (var i = 0; i < zamestnanci.length; i++) {
            var zamestnanec = zamestnanci[i];
            
            if (!zamestnanec) {
                utils.addDebug(currentEntry, "⚠️ Zamestnanec " + (i+1) + " je null - preskakujem");
                continue;
            }
            
            var employeeName = utils.formatEmployeeName(zamestnanec);
            utils.addDebug(currentEntry, "\n👤 [" + (i+1) + "/" + result.pocetPracovnikov + "] " + employeeName);
            
            // Spracuj zamestnanca
            var empResult = processEmployee(zamestnanec, pracovnaDobaHodiny, datum);
            
            if (empResult.success) {
                result.odpracovaneTotal += pracovnaDobaHodiny;
                result.celkoveMzdy += empResult.dennaMzda;
                result.detaily.push(empResult);
            } else {
                result.success = false; // Aspoň jeden zamestnanec zlyhal
            }
        }
        
        return result;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "processEmployees", error);
        return { success: false };
    }
}

/**
 * Spracuje jedného zamestnanca
 */
function processEmployee(zamestnanec, pracovnaDobaHodiny, datum) {
    try {
        // Nájdi platnú hodinovku
        var hodinovka = findValidSalary(zamestnanec, datum);
        
        if (!hodinovka || hodinovka <= 0) {
            utils.addDebug(currentEntry, "  ❌ Preskakujem - nemá platnú sadzbu");
            return { success: false };
        }
        
        // Nastav základné atribúty
        currentEntry.setAttr(CONFIG.fields.zamestnanci, CONFIG.attributes.odpracovane, pracovnaDobaHodiny);
        currentEntry.setAttr(CONFIG.fields.zamestnanci, CONFIG.attributes.hodinovka, hodinovka);
        
        // Získaj príplatky a zrážky
        var priplatok = zamestnanec.attr(CONFIG.attributes.priplatok) || 0;
        var premia = zamestnanec.attr(CONFIG.attributes.premia) || 0;
        var pokuta = zamestnanec.attr(CONFIG.attributes.pokuta) || 0;
        
        // Vypočítaj dennú mzdu
        var dennaMzda = (pracovnaDobaHodiny * (hodinovka + priplatok)) + premia - pokuta;
        dennaMzda = Math.round(dennaMzda * 100) / 100;
        
        // Nastav dennú mzdu
        currentEntry.setAttr(CONFIG.fields.zamestnanci, CONFIG.attributes.dennaMzda, dennaMzda);
        
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
    try {
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
    try {
        var datum = currentEntry.field(CONFIG.fields.datum);
        var datumFormatted = utils.formatDate(datum, "DD.MM.YYYY");
        var dayName = moment(datum).format("dddd");
        
        var infoMessage = "📋 DOCHÁDZKA - AUTOMATICKÝ PREPOČET\n";
        infoMessage += "═══════════════════════════════════\n\n";
        
        infoMessage += "📅 Dátum: " + datumFormatted + " (" + dayName + ")\n";
        infoMessage += "⏰ Pracovný čas: " + utils.formatTime(workTimeResult.prichodRounded) + 
                       " - " + utils.formatTime(workTimeResult.odchodRounded) + "\n";
        infoMessage += "⏱️ Pracovná doba: " + workTimeResult.pracovnaDobaHodiny + " hodín\n\n";
        
        infoMessage += "👥 ZAMESTNANCI:\n";
        infoMessage += "• Počet: " + employeeResult.pocetPracovnikov + " osôb\n";
        infoMessage += "• Odpracované spolu: " + employeeResult.odpracovaneTotal + " hodín\n\n";
        
        infoMessage += "💰 MZDOVÉ NÁKLADY:\n";
        infoMessage += "• Celkom: " + utils.formatMoney(employeeResult.celkoveMzdy) + "\n";
        
        if (employeeResult.pocetPracovnikov > 0) {
            var priemer = employeeResult.celkoveMzdy / employeeResult.pocetPracovnikov;
            infoMessage += "• Priemer na osobu: " + utils.formatMoney(priemer) + "\n";
        }
        
        infoMessage += "\n🔧 TECHNICKÉ INFO:\n";
        infoMessage += "• Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        infoMessage += "• MementoUtils: " + (utils.version || "N/A") + "\n";
        infoMessage += "• Čas generovania: " + utils.formatDate(moment()) + "\n";
        infoMessage += "• Trigger: Before Save\n";
        
        if (employeeResult.success) {
            infoMessage += "\n✅ PREPOČET DOKONČENÝ ÚSPEŠNE";
        } else {
            infoMessage += "\n⚠️ PREPOČET DOKONČENÝ S CHYBAMI";
        }
        
        currentEntry.set(CONFIG.fields.info, infoMessage);
        
        // Pridaj aj do štruktúrovaného info
        utils.addInfo(currentEntry, "Dochádzka prepočítaná", {
            datum: datumFormatted,
            pracovnaDoba: workTimeResult.pracovnaDobaHodiny + "h",
            pocetZamestnancov: employeeResult.pocetPracovnikov,
            mzdoveNaklady: utils.formatMoney(employeeResult.celkoveMzdy),
            uspech: employeeResult.success
        });
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createInfoRecord", error);
        return false;
    }
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

function logFinalStatus(steps) {
    var allSuccess = Object.keys(steps).every(function(key) {
        return steps[key].success;
    });
    
    if (allSuccess) {
        utils.addDebug(currentEntry, "\n🎉 === PREPOČET DOKONČENÝ ÚSPEŠNE! ===");
    } else {
        utils.addDebug(currentEntry, "\n❌ === PREPOČET ZLYHAL ===");
        utils.addDebug(currentEntry, "Stav krokov:");
        
        Object.keys(steps).forEach(function(key) {
            var step = steps[key];
            var status = step.success ? "✅" : "❌";
            utils.addDebug(currentEntry, "  " + status + " " + step.name);
        });
    }
}

function showUserMessage(success, employeeResult) {
    if (success) {
        var pocet = currentEntry.field(CONFIG.fields.pocetPracovnikov) || 0;
        var mzdy = currentEntry.field(CONFIG.fields.mzdoveNaklady) || 0;
        var hodiny = currentEntry.field(CONFIG.fields.pracovnaDoba) || 0;
        
        message("✅ Dochádzka prepočítaná úspešne!\n\n" +
               "⏰ Časy zaokrúhlené na 15 min\n" +
               "📊 Pracovná doba: " + hodiny + " h\n" +
               "👥 Zamestnanci: " + pocet + " osôb\n" +
               "💰 Mzdové náklady: " + utils.formatMoney(mzdy) + "\n\n" +
               "ℹ️ Detaily v poli 'info'");
    } else {
        message("❌ Prepočet dochádzky zlyhal!\n\n" +
               "🔍 Skontroluj Error_Log pre detaily\n" +
               "📋 Over vstupné dáta a skús znovu");
    }
}

// ==============================================
// SPUSTENIE
// ==============================================

main();