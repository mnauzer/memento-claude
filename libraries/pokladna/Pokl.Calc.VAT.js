// ==============================================
// MEMENTO DATABASE - POKLADŇA PREPOČET DPH
// Verzia: 1.0.1 | Dátum: September 2025 | Autor: ASISTANTO
// Knižnica: Pokladňa | Trigger: Before Save
// ==============================================
// 📋 FUNKCIA:
//    - Automatický prepočet súm s DPH a bez DPH
//    - Získanie platnej sadzby DPH z knižnice "sadzby dph"
//    - Výber medzi základnou a zníženou sadzbou
//    - Výpočet len ak je checkbox "s DPH" zaškrtnutý
// ==============================================
// 🔧 POUŽÍVA:
//    - MementoUtils v7.0 (agregátor)
//    - MementoConfig (centrálna konfigurácia)
//    - MementoCore (základné funkcie)
//    - MementoBusiness (business logika - vzor pre získanie sadzby)
// ==============================================

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var config = utils.getConfig();
var centralConfig = utils.config;
var currentEntry = entry();

// Získanie centrálneho configu
// var centralConfig = {};
// if (typeof MementoConfig !== 'undefined') {
//     centralConfig = MementoConfig.getConfig() || {};
// }
// if (!centralConfig.fields && utils && utils.config) {
//     centralConfig = utils.config;
// }

var CONFIG = {
    scriptName: "Pokladňa Prepočet DPH",
    version: "1.0.1",
    
    // Knižnice
    libraries: {
        cashBook: (centralConfig.libraries && centralConfig.libraries.cashBook) || "Pokladňa",
        vatRates: "sadzby dph"
    },
    
    // Polia Pokladňa
    fields: {
        // DPH polia
        isVat: "s DPH",
        vatRate: "sadzba DPH",
        sum: "Suma",
        sumTotal: "Suma s DPH",
        vat: "DPH",
        date: "Dátum",
        vatRateValue: "DPH%",
        
        // Spoločné polia
        debugLog: (centralConfig.fields && centralConfig.fields.common && centralConfig.fields.common.debugLog) || "Debug_Log",
        errorLog: (centralConfig.fields && centralConfig.fields.common && centralConfig.fields.common.errorLog) || "Error_Log",
        info: (centralConfig.fields && centralConfig.fields.common && centralConfig.fields.common.info) || "info"
    },
    
    // Polia knižnice "sadzby dph"
    vatRatesFields: {
        validFrom: "Platnosť od",
        standard: "základná",
        reduced: "znížená"
    },
    
    // Konštanty
    constants: {
        vatRateTypes: {
            standard: "základná",
            reduced: "znížená",
            zero: "nulová"
        }
    },
    
    // Ikony
    icons: (centralConfig.icons) || {
        start: "🚀",
        success: "✅",
        error: "❌",
        warning: "⚠️",
        info: "ℹ️",
        money: "💰",
        calculation: "🧮"
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, CONFIG.icons.start + " === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        
        // Kontrola či má byť DPH
        var isVat = utils.safeGet(currentEntry, CONFIG.fields.isVat, false);
        
        if (!isVat) {
            utils.addDebug(currentEntry, CONFIG.icons.info + " DPH nie je zaškrtnuté - prepočet sa nespustí");
            // Vyčisti DPH polia
            clearVatFields();
            return true;
        }
        
        utils.addDebug(currentEntry, CONFIG.icons.success + " DPH je zaškrtnuté - pokračujem v prepočte");
        
        // Získanie dátumu pre určenie platnej sadzby
        var datum = utils.safeGet(currentEntry, CONFIG.fields.date, moment().toDate());
        utils.addDebug(currentEntry, CONFIG.icons.info + " Dátum pre sadzbu: " + utils.formatDate(datum));
        
        // Získanie typu sadzby
        var vatRateType = utils.safeGet(currentEntry, CONFIG.fields.vatRate, CONFIG.constants.vatRateTypes.standard);
        utils.addDebug(currentEntry, CONFIG.icons.info + " Typ sadzby DPH: " + vatRateType);
        
        // Získanie platnej sadzby DPH
        var vatRateResult = getValidVatRate(datum, vatRateType);
        if (!vatRateResult.success) {
            utils.addError(currentEntry, vatRateResult.error, "main");
            message(CONFIG.icons.error + " " + vatRateResult.error);
            return false;
        }
        
        var vatRate = vatRateResult.rate;
        utils.addDebug(currentEntry, CONFIG.icons.success + " Platná sadzba DPH: " + vatRate + "%");
        
        // Prepočet súm
        var calculationResult = calculateVat(vatRate);
        if (!calculationResult.success) {
            utils.addError(currentEntry, calculationResult.error, "main");
            message(CONFIG.icons.error + " " + calculationResult.error);
            return false;
        }
        
        // Vytvorenie info záznamu
        createInfoRecord(vatRate, calculationResult);
        
        utils.addDebug(currentEntry, CONFIG.icons.success + " === PREPOČET DPH DOKONČENÝ ===");
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        message(CONFIG.icons.error + " Kritická chyba!\n\n" + error.toString());
        return false;
    }
}

// ==============================================
// ZÍSKANIE PLATNEJ SADZBY DPH
// ==============================================

function getValidVatRate(date, vatRateType) {
    try {
        utils.addDebug(currentEntry, CONFIG.icons.calculation + " Hľadám platnú sadzbu DPH...");
        
        // Pre nulovú sadzbu vrátime 0
        if (vatRateType === CONFIG.constants.vatRateTypes.zero) {
            return { success: true, rate: 0 };
        }
        
        // Získanie knižnice sadzieb DPH
        var vatRatesLib = libByName(CONFIG.libraries.vatRates);
        if (!vatRatesLib) {
            return { 
                success: false, 
                error: "Knižnica '" + CONFIG.libraries.vatRates + "' nenájdená!" 
            };
        }
        
        // Získanie všetkých sadzieb
        var allRates = vatRatesLib.entries();
        if (!allRates || allRates.length === 0) {
            return { 
                success: false, 
                error: "V knižnici '" + CONFIG.libraries.vatRates + "' nie sú žiadne sadzby!" 
            };
        }
        
        utils.addDebug(currentEntry, "  • Počet záznamov sadzieb: " + allRates.length);
        
        // Filtrovanie platných sadzieb k dátumu
        var validRates = [];
        
        for (var i = 0; i < allRates.length; i++) {
            var rateEntry = allRates[i];
            var validFrom = utils.safeGet(rateEntry, CONFIG.vatRatesFields.validFrom);
            
            if (!validFrom) {
                utils.addDebug(currentEntry, "  ⚠️ Sadzba #" + rateEntry.field("ID") + 
                             " nemá dátum platnosti", "warning");
                continue;
            }
            
            // Porovnanie dátumov
            if (new Date(validFrom) <= new Date(date)) {
                validRates.push({
                    entry: rateEntry,
                    validFrom: validFrom,
                    standard: utils.safeGet(rateEntry, CONFIG.vatRatesFields.standard, 0),
                    reduced: utils.safeGet(rateEntry, CONFIG.vatRatesFields.reduced, 0)
                });
            }
        }
        
        if (validRates.length === 0) {
            return { 
                success: false, 
                error: "Nenašla sa žiadna platná sadzba DPH k dátumu " + utils.formatDate(date) 
            };
        }
        
        // Zoradenie podľa dátumu platnosti (najnovšia prvá)
        validRates.sort(function(a, b) {
            return new Date(b.validFrom) - new Date(a.validFrom);
        });
        
        // Výber najnovšej platnej sadzby
        var currentRate = validRates[0];
        utils.addDebug(currentEntry, "  • Použitá sadzba platná od: " + utils.formatDate(currentRate.validFrom));
        
        // Výber konkrétnej sadzby podľa typu
        var selectedRate = 0;
        if (vatRateType === CONFIG.constants.vatRateTypes.standard) {
            selectedRate = currentRate.standard;
        } else if (vatRateType === CONFIG.constants.vatRateTypes.reduced) {
            selectedRate = currentRate.reduced;
        }
        
        return { 
            success: true, 
            rate: selectedRate,
            rateEntry: currentRate.entry
        };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "getValidVatRate", error);
        return { 
            success: false, 
            error: "Chyba pri získavaní sadzby DPH: " + error.toString() 
        };
    }
}

// ==============================================
// PREPOČET DPH
// ==============================================

function calculateVat(vatRate) {
    try {
        utils.addDebug(currentEntry, CONFIG.icons.calculation + " Prepočítavam sumy...");
        
        // Získanie existujúcich súm
        var sumWithoutVat = utils.safeGet(currentEntry, CONFIG.fields.sum, 0);
        var sumWithVat = utils.safeGet(currentEntry, CONFIG.fields.sumTotal, 0);
        
        // Koeficient pre výpočet
        var vatCoefficient = vatRate / 100;
        
        var finalSumWithoutVat, finalSumWithVat, vatAmount;
        
        // Určenie smeru výpočtu podľa toho, ktoré pole je vyplnené
        if (sumWithVat > 0 && sumWithoutVat === 0) {
            // Máme sumu s DPH, vypočítame sumu bez DPH
            utils.addDebug(currentEntry, "  • Výpočet zo sumy s DPH: " + utils.formatMoney(sumWithVat));
            
            finalSumWithVat = sumWithVat;
            finalSumWithoutVat = sumWithVat / (1 + vatCoefficient);
            vatAmount = finalSumWithVat - finalSumWithoutVat;
            
        } else if (sumWithoutVat > 0) {
            // Máme sumu bez DPH, vypočítame sumu s DPH
            utils.addDebug(currentEntry, "  • Výpočet zo sumy bez DPH: " + utils.formatMoney(sumWithoutVat));
            
            finalSumWithoutVat = sumWithoutVat;
            vatAmount = sumWithoutVat * vatCoefficient;
            finalSumWithVat = sumWithoutVat + vatAmount;
            
        } else {
            return { 
                success: false, 
                error: "Musí byť zadaná buď 'Suma' alebo 'Suma s DPH'!" 
            };
        }
        
        // Zaokrúhlenie na 2 desatinné miesta
        finalSumWithoutVat = Math.round(finalSumWithoutVat * 100) / 100;
        finalSumWithVat = Math.round(finalSumWithVat * 100) / 100;
        vatAmount = Math.round(vatAmount * 100) / 100;
        
        // Uloženie vypočítaných hodnôt
        utils.safeSet(currentEntry, CONFIG.fields.sum, finalSumWithoutVat);
        utils.safeSet(currentEntry, CONFIG.fields.sumTotal, finalSumWithVat);
        utils.safeSet(currentEntry, CONFIG.fields.vat, vatAmount);  // Ukladá DPH do poľa "DPH"
        utils.safeSet(currentEntry, CONFIG.fields.vatRateValue, vatRate);  // Ukladá DPH do poľa "DPH"
        
        utils.addDebug(currentEntry, "  • Suma bez DPH: " + utils.formatMoney(finalSumWithoutVat));
        utils.addDebug(currentEntry, "  • DPH (" + vatRate + "%): " + utils.formatMoney(vatAmount));
        utils.addDebug(currentEntry, "  • Suma s DPH: " + utils.formatMoney(finalSumWithVat));
        
        return {
            success: true,
            sumWithoutVat: finalSumWithoutVat,
            vatAmount: vatAmount,
            sumWithVat: finalSumWithVat
        };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "calculateVat", error);
        return { 
            success: false, 
            error: "Chyba pri výpočte DPH: " + error.toString() 
        };
    }
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

function clearVatFields() {
    try {
        // Ak nie je DPH, vyčisti DPH polia
        utils.safeSet(currentEntry, CONFIG.fields.vat, 0);
        
        // Ak je vyplnená suma s DPH, prekopíruj ju do sumy bez DPH
        var sumWithVat = utils.safeGet(currentEntry, CONFIG.fields.sumTotal, 0);
        if (sumWithVat > 0) {
            utils.safeSet(currentEntry, CONFIG.fields.sum, sumWithVat);
            utils.safeSet(currentEntry, CONFIG.fields.sumTotal, 0);
            utils.addDebug(currentEntry, CONFIG.icons.info + " Suma s DPH prekopírovaná do sumy bez DPH");
        }
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "clearVatFields", error);
    }
}

function createInfoRecord(vatRate, calculationResult) {
    try {
        var infoText = "📊 PREPOČET DPH\n";
        infoText += "================\n";
        infoText += "Sadzba DPH: " + vatRate + "%\n";
        infoText += "Suma bez DPH: " + utils.formatMoney(calculationResult.sumWithoutVat) + "\n";
        infoText += "DPH: " + utils.formatMoney(calculationResult.vatAmount) + "\n";
        infoText += "Suma s DPH: " + utils.formatMoney(calculationResult.sumWithVat) + "\n";
        infoText += "Čas: " + moment().format("DD.MM.YYYY HH:mm:ss");
        
        utils.addInfo(currentEntry, infoText);
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createInfoRecord", error);
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

// Kontrola závislostí
if (typeof MementoUtils === 'undefined') {
    message("❌ Chýba knižnica MementoUtils!");
    cancel();
}

// Spustenie hlavnej funkcie
var result = main();

// Ak hlavná funkcia zlyhala, zruš uloženie
if (!result) {
    utils.addError(currentEntry, "Script zlyhal - zrušené uloženie", "main");
    cancel();
}