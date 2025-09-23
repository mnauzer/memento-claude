// ==============================================
// MEMENTO DATABASE - ZÁKAZKY PREPOČET
// Verzia: 2.2 | Dátum: September 2025 | Autor: ASISTANTO
// Knižnica: Zákazky | Trigger: Before Save alebo Manual Action
// ==============================================
// 📋 FUNKCIA:
//    - Automatický prepočet súm a nákladov zákazky
//    - Získanie dát z linkovaných záznamov (linksFrom)
//    - Výpočet nákladov, výnosov, marže a rentability
//    - Súčty z Dochádzky, Knihy jázd, Záznamu prác, Pokladne
//    - Výkazy prác a dopravy pre fakturáciu
// ==============================================

// ==============================================
// INICIALIZÁCIA MODULOV
// ==============================================

var utils = MementoUtils;
var config = utils.getConfig();
var centralConfig = utils.config;
var currentEntry = entry();

var CONFIG = {
    // Script špecifické nastavenia
    scriptName: "Zákazky Prepočet",
    version: "2.2",
    
    // Referencie na centrálny config
    fields: {
        order: centralConfig.fields.order,
        quote: centralConfig.fields.quote,
        workRecord: centralConfig.fields.workRecord,
        rideLog: centralConfig.fields.rideLog,
        rideReport: centralConfig.fields.rideReport,
        workReport: centralConfig.fields.workReport,
        cashBook: centralConfig.fields.cashBook,
        common: centralConfig.fields.common,
        machine: centralConfig.fields.machine
    },
    
    libraries: centralConfig.libraries,
    icons: centralConfig.icons,

    // Lokálne nastavenia pre tento script
    settings: {
        calculateVAT: true,
        defaultVATRate: 0.20 // 20% DPH (fallback)
    },

    // Knižnice pre DPH
    vatRatesLibrary: "sadzby dph",
    vatRatesFields: {
        validFrom: "Platnosť od",
        standard: "základná",
        reduced: "znížená"
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, "=== ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===", "start");
        utils.addDebug(currentEntry, "⏰ Čas spustenia: " + moment().format("DD.MM.YYYY HH:mm:ss"));
        utils.clearLogs(currentEntry);
        // Kroky prepočtu
        var steps = {
            step1: { success: false, name: "Validácia vstupných dát" },
            step2: { success: false, name: "Zbieranie linkovaných záznamov" },
            step3: { success: false, name: "Výpočet nákladov" },
            step4: { success: false, name: "Výpočet výnosov" },
            step5: { success: false, name: "Výpočet marže a rentability" },
            step6: { success: false, name: "Vytvorenie info záznamu" },
            step7: { success: false, name: "Finálne uloženie" }
        };
        
        // KROK 1: Validácia
        utils.addDebug(currentEntry, "\n📋 KROK 1: " + steps.step1.name, "validation");
        var validationResult = validateOrderData();
        
        if (!validationResult.success) {
            utils.addError(currentEntry, validationResult.error, "validation");
            message("❌ " + validationResult.error);
            return false;
        }
        steps.step1.success = true;
        
        // KROK 2: Zbieranie linkovaných dát
        utils.addDebug(currentEntry, "\n🔍 KROK 2: " + steps.step2.name, "collection");
        var linkedData = collectLinkedRecordsData();
        steps.step2.success = true;
        
        // KROK 3: Výpočet nákladov
        utils.addDebug(currentEntry, "\n💸 KROK 3: " + steps.step3.name, "costs");
        var costsResult = calculateCosts(linkedData);
        steps.step3.success = true;
        
        // KROK 4: Výpočet výnosov
        utils.addDebug(currentEntry, "\n💰 KROK 4: " + steps.step4.name, "revenue");
        var revenueResult = calculateRevenue(linkedData);
        steps.step4.success = true;
        
        // KROK 5: Výpočet marže a rentability
        utils.addDebug(currentEntry, "\n📊 KROK 5: " + steps.step5.name, "margin");
        var profitResult = calculateProfitability(costsResult, revenueResult);
        steps.step5.success = true;
        
        // KROK 6: Info záznam
        utils.addDebug(currentEntry, "\n📝 KROK 6: " + steps.step6.name, "info");
        createInfoRecord(linkedData, costsResult, revenueResult, profitResult);
        steps.step6.success = true;
        
        // KROK 7: Finálne uloženie
        utils.addDebug(currentEntry, "\n💾 KROK 7: " + steps.step7.name, "save");
        saveCalculatedValues(linkedData, costsResult, revenueResult, profitResult);
        steps.step7.success = true;
        
        // Záverečný súhrn
        logFinalSummary(steps);
        utils.addDebug(currentEntry, "\n✅ === PREPOČET DOKONČENÝ ===");
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        message("❌ Kritická chyba!\n" + error.toString());
        return false;
    }
}

// ==============================================
// VALIDÁCIA
// ==============================================

function validateOrderData() {
    try {
        var orderNumber = utils.safeGet(currentEntry, CONFIG.fields.order.number);
        var orderName = utils.safeGet(currentEntry, CONFIG.fields.order.name);
        var startDate = utils.safeGet(currentEntry, CONFIG.fields.order.startDate);
        
        if (!orderNumber && !orderName) {
            return {
                success: false,
                error: "Chýba číslo alebo názov zákazky"
            };
        }
        
        utils.addDebug(currentEntry, "  • Číslo: " + (orderNumber || "N/A"));
        utils.addDebug(currentEntry, "  • Názov: " + (orderName || "N/A"));
        utils.addDebug(currentEntry, "  • Dátum začatia: " + (startDate ? utils.formatDate(startDate) : "N/A"));
        
        return {
            success: true,
            orderNumber: orderNumber,
            orderName: orderName,
            startDate: startDate
        };
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "validateOrderData", error);
        return { success: false, error: error.toString() };
    }
}

// ==============================================
// ZÍSKANIE SADZBY DPH
// ==============================================

function getValidVatRate(orderDate) {
    try {
        utils.addDebug(currentEntry, "  🧮 Hľadám platnú sadzbu DPH k dátumu " + utils.formatDate(orderDate) + "...");

        // Získanie knižnice sadzieb DPH
        var vatRatesLib = libByName(CONFIG.vatRatesLibrary);
        if (!vatRatesLib) {
            utils.addDebug(currentEntry, "  ⚠️ Knižnica '" + CONFIG.vatRatesLibrary + "' nenájdená, používam default 20%");
            return { success: true, rate: 0.20 };
        }

        // Získanie všetkých sadzieb
        var allRates = vatRatesLib.entries();
        if (!allRates || allRates.length === 0) {
            utils.addDebug(currentEntry, "  ⚠️ Žiadne sadzby v knižnici, používam default 20%");
            return { success: true, rate: 0.20 };
        }

        // Filtrovanie platných sadzieb k dátumu
        var validRates = [];
        for (var i = 0; i < allRates.length; i++) {
            var rateEntry = allRates[i];
            var validFrom = utils.safeGet(rateEntry, CONFIG.vatRatesFields.validFrom);

            if (validFrom && new Date(validFrom) <= new Date(orderDate)) {
                validRates.push({
                    entry: rateEntry,
                    validFrom: validFrom,
                    standard: parseFloat(utils.safeGet(rateEntry, CONFIG.vatRatesFields.standard, 20)) / 100
                });
            }
        }

        if (validRates.length === 0) {
            utils.addDebug(currentEntry, "  ⚠️ Žiadna platná sadzba k dátumu, používam default 20%");
            return { success: true, rate: 0.20 };
        }

        // Zoradenie podľa dátumu (najnovšia platná)
        validRates.sort(function(a, b) {
            return new Date(b.validFrom) - new Date(a.validFrom);
        });

        var selectedRate = validRates[0];
        utils.addDebug(currentEntry, "    ✅ Nájdená platná sadzba: " + (selectedRate.standard * 100) + "% (od " + utils.formatDate(selectedRate.validFrom) + ")");

        return {
            success: true,
            rate: selectedRate.standard,
            validFrom: selectedRate.validFrom
        };

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri získavaní sadzby DPH: " + error.toString(), "getValidVatRate");
        return { success: true, rate: 0.20 }; // Fallback
    }
}

// ==============================================
// ZBIERANIE LINKOVANÝCH DÁT
// ==============================================

function collectLinkedRecordsData() {
    var data = {
        workRecords: {
            records: [],
            totalHours: 0,
            totalWageCosts: 0,
            totalHzsSum: 0
        },
        rideLog: {
            records: [],
            totalKm: 0,
            totalTime: 0,
            totalWageCosts: 0,
            totalFuelCosts: 0
        },
        cashBook: {
            records: [],
            totalExpenses: 0,
            totalIncome: 0,
            materialCosts: 0,
            otherCosts: 0
        },
        workReports: {
            records: [],
            totalSum: 0,
            totalHours: 0
        },
        rideReports: {
            records: [],
            totalSum: 0,
            totalKm: 0
        },
        machinery: {
            records: [],
            totalRevenue: 0,    // Výnosy z mechanizácie
            totalCosts: 0       // Náklady na mechanizáciu
        }
    };
    
    try {
        utils.addDebug(currentEntry, "  🔍 Hľadám linkované záznamy...");
        
        // ZÁZNAM PRÁC - linksFrom
        var workRecords = currentEntry.linksFrom(CONFIG.libraries.workRecords, CONFIG.fields.workRecord.order);
        if (workRecords && workRecords.length > 0) {
            data.workRecords.records = workRecords;
            
            for (var j = 0; j < workRecords.length; j++) {
                var work = workRecords[j];
                var workedHours = utils.safeGet(work, CONFIG.fields.workRecord.workedHours, 0);
                var wageCosts = utils.safeGet(work, CONFIG.fields.workRecord.wageCosts, 0);
                var hzsSum = utils.safeGet(work, CONFIG.fields.workRecord.hzsSum, 0);
                
                data.workRecords.totalHours += workedHours;
                data.workRecords.totalWageCosts += wageCosts;
                data.workRecords.totalHzsSum += hzsSum;
            }
        }
        utils.addDebug(currentEntry, "    • Záznam prác: " + data.workRecords.records.length + " záznamov");
        
        // MECHANIZÁCIA - výnosy
        // Prejdi všetky záznamy práce a hľadaj pole Mechanizácia
        if (data.workRecords.records.length > 0) {
            utils.addDebug(currentEntry, "  🚜 Hľadám mechanizáciu v záznamoch práce...");
            
            for (var wr = 0; wr < data.workRecords.records.length; wr++) {
                var workRec = data.workRecords.records[wr];
                
                // Skús rôzne názvy poľa pre mechanizáciu
                var machineryField = utils.safeGetLinks(workRec, "Mechanizácia");
                
                if (machineryField && machineryField.length > 0) {
                    utils.addDebug(currentEntry, "    • Nájdená mechanizácia v zázname #" + workRec.field("ID"));
                    
                    for (var m = 0; m < machineryField.length; m++) {
                        var machine = machineryField[m];
                        
                        // Získaj účtovanú sumu z atribútu
                        var billedAmount = 0;
                        try {
                            billedAmount = machine.attr(CONFIG.attributes.workRecordMachines.totalPrice) || 0;
                        } catch (e) {
                            // Skús alternatívne spôsoby
                            billedAmount = machine.attr("účtovaná suma") || 0;
                        }
                        
                        if (billedAmount > 0) {
                            data.machinery.totalRevenue += billedAmount;
                            data.machinery.records.push({
                                machine: utils.safeGet(machine, "Názov", "Neznámy stroj"),
                                workRecord: workRec.field("ID"),
                                amount: billedAmount
                            });
                            
                            utils.addDebug(currentEntry, "      • " + utils.safeGet(machine, "Názov", "Stroj") + 
                                        ": " + utils.formatMoney(billedAmount));
                        }
                    }
                }
            }
        }

        // MECHANIZÁCIA - náklady z pokladne
        utils.addDebug(currentEntry, "  🚜 Hľadám náklady na mechanizáciu v pokladni...");

        // Pre každý záznam práce nájdi súvisiace pokladničné doklady
        for (var wr2 = 0; wr2 < data.workRecords.records.length; wr2++) {
            var workRecord = data.workRecords.records[wr2];
            var workDate = utils.safeGet(workRecord, CONFIG.fields.workRecord.date);
            
            // Získaj všetky stroje použité v tomto zázname
            var machines = utils.safeGetLinks(workRecord, "Mechanizácia") || 
                        utils.safeGetLinks(workRecord, "Stroje") ||
                        utils.safeGetLinks(workRecord, "Stroj");
            
            if (machines && machines.length > 0) {
                for (var mc = 0; mc < machines.length; mc++) {
                    var machineObj = machines[mc];
                    
                    // Hľadaj pokladničné doklady pre tento stroj
                    var machineCashRecords = machineObj.linksFrom(CONFIG.libraries.cashBook, CONFIG.fields.cashBook.tool);
                    
                    if (machineCashRecords && machineCashRecords.length > 0) {
                        for (var cr = 0; cr < machineCashRecords.length; cr++) {
                            var cashRec = machineCashRecords[cr];
                            var cashDate = utils.safeGet(cashRec, CONFIG.fields.cashBook.date);
                            var cashOrder = utils.safeGetLinks(cashRec, CONFIG.fields.cashBook.customer)[0];
                            
                            // Kontrola či je rovnaký dátum alebo rovnaká zákazka
                            var sameDate = moment(cashDate).format("YYYY-MM-DD") === moment(workDate).format("YYYY-MM-DD");
                            var sameOrder = cashOrder && cashOrder.field("ID") === currentEntry.field("ID");
                            
                            if (sameDate || sameOrder) {
                                var transactionType = utils.safeGet(cashRec, CONFIG.fields.cashBook.transactionType);
                                
                                if (transactionType === "Výdavok") {
                                    var amount = utils.safeGet(cashRec, CONFIG.fields.cashBook.sum, 0);
                                    data.machinery.totalCosts += amount;
                                    
                                    utils.addDebug(currentEntry, "    • Náklad na " + utils.safeGet(machineObj, "Názov", "stroj") + 
                                                ": " + utils.formatMoney(amount) + " (Pokladňa #" + cashRec.field("ID") + ")");
                                }
                            }
                        }
                    }
                }
            }
        }

        utils.addDebug(currentEntry, "    • Mechanizácia výnosy: " + utils.formatMoney(data.machinery.totalRevenue));
        utils.addDebug(currentEntry, "    • Mechanizácia náklady: " + utils.formatMoney(data.machinery.totalCosts));

        // KNIHA JÁZD - linksFrom
        var rideLogRecords = currentEntry.linksFrom(CONFIG.libraries.rideLog, CONFIG.fields.rideLog.orders);
        if (rideLogRecords && rideLogRecords.length > 0) {
            data.rideLog.records = rideLogRecords;
            
            for (var k = 0; k < rideLogRecords.length; k++) {
                var ride = rideLogRecords[k];
                var km = utils.safeGet(ride, CONFIG.fields.rideLog.km, 0);
                var totalTime = utils.safeGet(ride, CONFIG.fields.rideLog.totalTime, 0);
                var wageCosts = utils.safeGet(ride, CONFIG.fields.rideLog.wageCosts, 0);
                var rate = utils.safeGet(ride, CONFIG.fields.rideLog.rate, 0.193); // Default sadzba
                
                data.rideLog.totalKm += km;
                data.rideLog.totalTime += totalTime;
                data.rideLog.totalWageCosts += wageCosts;
                data.rideLog.totalFuelCosts += (km * rate);
            }
        }
        utils.addDebug(currentEntry, "    • Kniha jázd: " + data.rideLog.records.length + " záznamov");
        
        // POKLADŇA - linksFrom
        var cashBookRecords = currentEntry.linksFrom(CONFIG.libraries.cashBook, CONFIG.fields.cashBook.customer);
        if (cashBookRecords && cashBookRecords.length > 0) {
            data.cashBook.records = cashBookRecords;
            
            for (var l = 0; l < cashBookRecords.length; l++) {
                var cash = cashBookRecords[l];
                var transactionType = utils.safeGet(cash, CONFIG.fields.cashBook.transactionType);
                var sum = utils.safeGet(cash, CONFIG.fields.cashBook.sum, 0);
                var rezia = utils.safeGet(cash, CONFIG.fields.cashBook.rezia);
                
                if (transactionType === "Príjem") {
                    data.cashBook.totalIncome += sum;
                } else if (transactionType === "Výdavok") {
                    data.cashBook.totalExpenses += sum;
                    
                    // Roztrieď náklady
                    if (rezia && rezia.indexOf("materiál") !== -1) {
                        data.cashBook.materialCosts += sum;
                    } else {
                        data.cashBook.otherCosts += sum;
                    }
                }
            }
        }
        utils.addDebug(currentEntry, "    • Záznam prác: " + data.cashBook.records.length + " záznamov");
        
          // ZÁZNAM PRÁC - linksFrom
        var workRecords = currentEntry.linksFrom(CONFIG.libraries.workRecord, CONFIG.fields.workRecord.order);
        if (workRecords && workRecords.length > 0) {
            data.workRecords.records = workRecords;
            
            for (var m = 0; m < workRecords.length; m++) {
                var report = workRecords[m];
                var totalHours = utils.safeGet(report, CONFIG.fields.workRecord.totalHours, 0);
                var hzsSum = utils.safeGet(report, CONFIG.fields.workRecord.hzsSum, 0);
                
                data.workRecords.totalHours += totalHours;
                data.workRecords.totalSum += hzsSum;
            }
        }
        utils.addDebug(currentEntry, "    • Záznam prác: " + data.workRecords.records.length + " záznamov");

        // VÝKAZ PRÁC - linksFrom
        var workRecords = currentEntry.linksFrom(CONFIG.libraries.workRecord, CONFIG.fields.workRecord.order);
        if (workRecords && workRecords.length > 0) {
            data.workRecords.records = workRecords;
            
            for (var m = 0; m < workRecords.length; m++) {
                var report = workRecords[m];
                var totalHours = utils.safeGet(report, CONFIG.fields.workRecord.totalHours, 0);
                var hzsSum = utils.safeGet(report, CONFIG.fields.workRecord.hzsSum, 0);
                
                data.workRecords.totalHours += totalHours;
                data.workRecords.totalSum += hzsSum;
            }
        }
        utils.addDebug(currentEntry, "    • Výkaz prác: " + data.workRecords.records.length + " záznamov");
        
        // VÝKAZ DOPRAVY - linksFrom
        var rideReports = currentEntry.linksFrom(CONFIG.libraries.rideReport, CONFIG.fields.rideReport.order);
        if (rideReports && rideReports.length > 0) {
            data.rideReports.records = rideReports;
            
            for (var n = 0; n < rideReports.length; n++) {
                var rideReport = rideReports[n];
                var kmTotal = utils.safeGet(rideReport, CONFIG.fields.rideReport.kmTotal, 0);
                var sum = utils.safeGet(rideReport, CONFIG.fields.rideReport.sum, 0);
                
                data.rideReports.totalKm += kmTotal;
                data.rideReports.totalSum += sum;
            }
        }
        utils.addDebug(currentEntry, "    • Výkaz dopravy: " + data.rideReports.records.length + " záznamov");
        
        return data;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "collectLinkedRecordsData", error);
        return data;
    }
}

// ==============================================
// VÝPOČET NÁKLADOV
// ==============================================

function calculateCosts(linkedData) {
    var costs = {
        // NÁKLADY - podľa presných požiadaviek
        costWork: 0,                     // Náklady práce - hodnota ako v poli Mzdy
        costWorkVatDeduction: 0,         // Odpočet DPH práce - 0 (zo mzdy sa neodpočítava)
        costMaterial: 0,                 // Náklady materiál - pripravené na implementáciu
        costMaterialVatDeduction: 0,     // Odpočet DPH materiál - pripravené na implementáciu
        costMachinery: 0,                // Náklady stroje - z pokladne Požičovné stroja
        costMachineryVatDeduction: 0,    // Odpočet DPH stroje - z pokladne DPH
        costTransport: 0,                // Náklady doprava - pripravené
        costTransportVatDeduction: 0,    // Odpočet DPH doprava - pripravené
        costSubcontractors: 0,           // Náklady subdodávky - z pokladne Subdodávky
        costSubcontractorsVatDeduction: 0, // Odpočet DPH subdodávky - z pokladne DPH
        costOther: 0,                    // Náklady ostatné - z pokladne ostatné
        costOtherVatDeduction: 0,        // Odpočet DPH ostatné - z pokladne DPH
        costTotal: 0,                    // Náklady celkom
        costTotalVatDeduction: 0,        // Odpočet DPH celkom
        otherExpenses: 0                 // Iné výdavky
    };

    try {
        utils.addDebug(currentEntry, "  💸 Počítam náklady podľa nových požiadaviek...");

        // 1. NÁKLADY PRÁCE - hodnota ako v poli Mzdy (neskôr sa dorobí výpočet odvodov)
        utils.addDebug(currentEntry, "    👷 Počítam náklady práce...");
        costs.costWork = utils.safeGet(currentEntry, CONFIG.fields.order.wageCosts, 0);
        costs.costWorkVatDeduction = 0; // Zo mzdy sa DPH neodpočítava
        utils.addDebug(currentEntry, "      • Mzdy celkom: " + utils.formatMoney(costs.costWork));

        // 2. NÁKLADY STROJE - z pokladne Prevádzková réžia = Požičovné stroja
        utils.addDebug(currentEntry, "    🚜 Počítam náklady strojov...");
        var machineryCostData = calculateMachineryCosts();
        costs.costMachinery = machineryCostData.amount;
        costs.costMachineryVatDeduction = machineryCostData.vatDeduction;

        // 3. NÁKLADY SUBDODÁVKY - z pokladne Účel výdaja = Subdodávky
        utils.addDebug(currentEntry, "    🏗️ Počítam náklady subdodávok...");
        var subcontractorCostData = calculateSubcontractorCosts();
        utils.addDebug(currentEntry, "      • Subdodávky celkom: " + utils.formatMoney(subcontractorCostData.amount)) 
        utils.addDebug(currentEntry, "      • Subdodávky počet: " + subcontractorCostData.count) 
        costs.costSubcontractors = subcontractorCostData.amount;
        costs.costSubcontractorsVatDeduction = subcontractorCostData.vatDeduction;

        // 4. NÁKLADY OSTATNÉ - z pokladne Účel výdaja = Ostatné
        utils.addDebug(currentEntry, "    📦 Počítam ostatné náklady...");
        var otherCostData = calculateOtherCosts();
        costs.costOther = otherCostData.amount;
        costs.costOtherVatDeduction = otherCostData.vatDeduction;

        // 5. NÁKLADY MATERIÁL - pripravené na neskoršiu implementáciu
        var materialCostData = calculateMaterialCosts();
        costs.costMaterial = materialCostData.amount;
        costs.costMaterialVatDeduction = materialCostData.vatDeduction;

        // 6. NÁKLADY DOPRAVA - pripravené na neskoršiu implementáciu
        var transportCostData = calculateTransportCosts();
        costs.costTransport = transportCostData.amount;
        costs.costTransportVatDeduction = transportCostData.vatDeduction;

        // CELKOVÉ SÚČTY
        costs.costTotal = costs.costWork + costs.costMaterial + costs.costMachinery +
                         costs.costTransport + costs.costSubcontractors + costs.costOther;

        costs.costTotalVatDeduction = costs.costWorkVatDeduction + costs.costMaterialVatDeduction +
                                     costs.costMachineryVatDeduction + costs.costTransportVatDeduction +
                                     costs.costSubcontractorsVatDeduction + costs.costOtherVatDeduction;

        // INÉ VÝDAVKY - dodatočné výdavky (môžu byť zadané manuálne)
        costs.otherExpenses = 0; // Zatiaľ 0, môže byť doplnené

        utils.addDebug(currentEntry, "    ✅ NÁKLADY FINÁLNE:");
        utils.addDebug(currentEntry, "      • Práce: " + utils.formatMoney(costs.costWork) + " (odpočet DPH: " + utils.formatMoney(costs.costWorkVatDeduction) + ")");
        utils.addDebug(currentEntry, "      • Materiál: " + utils.formatMoney(costs.costMaterial) + " (odpočet DPH: " + utils.formatMoney(costs.costMaterialVatDeduction) + ")");
        utils.addDebug(currentEntry, "      • Stroje: " + utils.formatMoney(costs.costMachinery) + " (odpočet DPH: " + utils.formatMoney(costs.costMachineryVatDeduction) + ")");
        utils.addDebug(currentEntry, "      • Doprava: " + utils.formatMoney(costs.costTransport) + " (odpočet DPH: " + utils.formatMoney(costs.costTransportVatDeduction) + ")");
        utils.addDebug(currentEntry, "      • Subdodávky: " + utils.formatMoney(costs.costSubcontractors) + " (odpočet DPH: " + utils.formatMoney(costs.costSubcontractorsVatDeduction) + ")");
        utils.addDebug(currentEntry, "      • Ostatné: " + utils.formatMoney(costs.costOther) + " (odpočet DPH: " + utils.formatMoney(costs.costOtherVatDeduction) + ")");
        utils.addDebug(currentEntry, "      • SPOLU: " + utils.formatMoney(costs.costTotal) + " (odpočet DPH: " + utils.formatMoney(costs.costTotalVatDeduction) + ")");
        utils.addDebug(currentEntry, "      • Iné výdavky: " + utils.formatMoney(costs.otherExpenses));

        return costs;

    } catch (error) {
        utils.addError(currentEntry, error.toString(), "calculateCosts", error);
        return costs;
    }
}

// ==============================================
// POMOCNÉ FUNKCIE PRE VÝPOČET NÁKLADOV
// ==============================================

function calculateMachineryCosts() {
    try {
        utils.addDebug(currentEntry, "      🔍 Hľadám náklady strojov v pokladni...");

        var amount = 0;
        var vatDeduction = 0;

        // Prejdi záznamy linksFrom Pokladňa/Zákazka where Prevádzková réžia = Požičovné stroja
        var cashBookRecords = currentEntry.linksFrom(CONFIG.libraries.cashBook, CONFIG.fields.cashBook.order);
        if (cashBookRecords && cashBookRecords.length > 0) {
            for (var i = 0; i < cashBookRecords.length; i++) {
                var cashRecord = cashBookRecords[i];
                var operatingCost = utils.safeGet(cashRecord, "Prevádzková réžia", "");
                if (operatingCost === "Požičovné stroja") {
                    var suma = utils.safeGet(cashRecord, "Suma", 0);
                    var dph = utils.safeGet(cashRecord, "DPH", 0);

                    amount += suma;
                    vatDeduction += dph;

                    utils.addDebug(currentEntry, "        • Záznam #" + cashRecord.field("ID") + ": " + utils.formatMoney(suma) + " (DPH: " + utils.formatMoney(dph) + ")");
                }
            }
        }

        return {
            amount: Math.round(amount * 100) / 100,
            vatDeduction: Math.round(vatDeduction * 100) / 100
        };

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri výpočte nákladov strojov: " + error.toString(), "calculateMachineryCosts");
        return { amount: 0, vatDeduction: 0 };
    }
}

function calculateSubcontractorCosts() {
    try {
        utils.addDebug(currentEntry, "      🔍 Hľadám náklady subdodávok v pokladni...");

        var amount = 0;
        var vatDeduction = 0;
        var count = 0;

        // Prejdi záznamy linksFrom Pokladňa/Zákazka where Účel výdaja = Subdodávky
        var cashBookRecords = currentEntry.linksFrom(CONFIG.libraries.cashBook, CONFIG.fields.cashBook.order);
        utils.addDebug(currentEntry, "        • Počet záznamov v pokladni (náklady subdodávky): " + (cashBookRecords ? cashBookRecords.length : 0));

        if (cashBookRecords && cashBookRecords.length > 0) {
            for (var i = 0; i < cashBookRecords.length; i++) {
                var cashRecord = cashBookRecords[i];
                var purpose = utils.safeGet(cashRecord, "Účel výdaja", "");
                // Použijem trim() pre istotu
                if (purpose === "Subdodávky") {
                    var suma = utils.safeGet(cashRecord, "Suma", 0);
                    var dph = utils.safeGet(cashRecord, "DPH", 0);

                    amount += suma;
                    vatDeduction += dph;
                    count += 1;

                    utils.addDebug(currentEntry, "        • Záznam #" + cashRecord.field("ID") + ": " + utils.formatMoney(suma) + " (DPH: " + utils.formatMoney(dph) + ")");
                }
            }
        }

        return {
            amount: Math.round(amount * 100) / 100,
            vatDeduction: Math.round(vatDeduction * 100) / 100,
            count: count
        };

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri výpočte nákladov subdodávok: " + error.toString(), "calculateSubcontractorCosts");
        return { amount: 0, vatDeduction: 0 };
    }
}

function calculateOtherCosts() {
    try {
        utils.addDebug(currentEntry, "      🔍 Hľadám ostatné náklady v pokladni...");

        var amount = 0;
        var vatDeduction = 0;

        // Prejdi záznamy linksFrom Pokladňa/Zákazka where Účel výdaja = Ostatné
        var cashBookRecords = currentEntry.linksFrom(CONFIG.libraries.cashBook, CONFIG.fields.cashBook.order);
        if (cashBookRecords && cashBookRecords.length > 0) {
            for (var i = 0; i < cashBookRecords.length; i++) {
                var cashRecord = cashBookRecords[i];
                var purpose = utils.safeGet(cashRecord, "Účel výdaja", "");
                if (purpose === "Ostatné") {
                    var suma = utils.safeGet(cashRecord, "Suma", 0);
                    var dph = utils.safeGet(cashRecord, "DPH", 0);

                    amount += suma;
                    vatDeduction += dph;

                    utils.addDebug(currentEntry, "        • Záznam #" + cashRecord.field("ID") + ": " + utils.formatMoney(suma) + " (DPH: " + utils.formatMoney(dph) + ")");
                }
            }
        }

        return {
            amount: Math.round(amount * 100) / 100,
            vatDeduction: Math.round(vatDeduction * 100) / 100
        };

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri výpočte ostatných nákladov: " + error.toString(), "calculateOtherCosts");
        return { amount: 0, vatDeduction: 0 };
    }
}

function calculateMaterialCosts() {
    try {
        utils.addDebug(currentEntry, "      📦 Materiál náklady - pripravené na neskoršiu implementáciu...");

        // Pripravené na neskoršiu implementáciu
        return {
            amount: 0,
            vatDeduction: 0
        };

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri výpočte nákladov materiálu: " + error.toString(), "calculateMaterialCosts");
        return { amount: 0, vatDeduction: 0 };
    }
}

function calculateTransportCosts() {
    try {
        utils.addDebug(currentEntry, "      🚗 Doprava náklady - pripravené na neskoršiu implementáciu...");

        // Pripravené na neskoršiu implementáciu
        return {
            amount: 0,
            vatDeduction: 0
        };

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri výpočte nákladov dopravy: " + error.toString(), "calculateTransportCosts");
        return { amount: 0, vatDeduction: 0 };
    }
}

// ==============================================
// VÝPOČET VÝNOSOV
// ==============================================

function calculateRevenue(linkedData) {
    var revenue = {
        // VÝNOSY - podľa presných požiadaviek
        revenueWork: 0,           // Práce - sum poľa Suma HZS všetkých linksFrom Záznam prác/Zákazka
        revenueWorkVat: 0,        // DPH práce - vypočítané z revenueWork
        revenueMaterial: 0,       // Materiál - pripravené na neskoršiu implementáciu
        revenueMaterialVat: 0,    // DPH materiál - pripravené na neskoršiu implementáciu
        revenueMachinery: 0,      // Stroje - sum poľa Suma Stroje všetkých linksFrom Záznam prác/Zákazka
        revenueMachineryVat: 0,   // DPH stroje - vypočítané z revenueMachinery
        revenueTransport: 0,      // Doprava - podľa nastavenia v Cenovej ponuke
        revenueTransportVat: 0,   // DPH doprava - vypočítané z revenueTransport
        revenueSubcontractors: 0, // Subdodávky - z pokladne + prirážka
        revenueSubcontractorsVat: 0, // DPH subdodávky - vypočítané
        revenueOther: 0,          // Ostatné - z pokladne + prirážka
        revenueOtherVat: 0,       // DPH ostatné - vypočítané
        revenueTotal: 0,          // Suma celkom
        revenueTotalVat: 0        // DPH celkom
    };

    try {
        utils.addDebug(currentEntry, "  💰 Počítam výnosy podľa nových požiadaviek...");

        // Získaj sadzbu DPH z knižnice
        var orderDate = utils.safeGet(currentEntry, CONFIG.fields.order.startDate) ||
                       utils.safeGet(currentEntry, CONFIG.fields.order.date) ||
                       new Date();
        var vatRateResult = getValidVatRate(orderDate);
        var vatRate = vatRateResult.rate;

        utils.addDebug(currentEntry, "    • Použitá sadzba DPH: " + (vatRate * 100) + "%");

        // 1. PRÁCE - sum poľa Suma HZS všetkých linksFrom Záznam prác/Zákazka
        utils.addDebug(currentEntry, "    🔨 Počítam výnosy z prác...");
        revenue.revenueWork = 0;
        if (linkedData.workRecords && linkedData.workRecords.records) {
            for (var i = 0; i < linkedData.workRecords.records.length; i++) {
                var workRecord = linkedData.workRecords.records[i];
                var hzsSum = utils.safeGet(workRecord, CONFIG.fields.workRecord.hzsSum, 0);
                revenue.revenueWork += hzsSum;
                utils.addDebug(currentEntry, "      • Záznam #" + workRecord.field("ID") + ": " + utils.formatMoney(hzsSum));
            }
        }
        revenue.revenueWorkVat = Math.round(revenue.revenueWork * vatRate * 100) / 100;

        // 2. STROJE - sum poľa Suma Stroje všetkých linksFrom Záznam prác/Zákazka
        utils.addDebug(currentEntry, "    🚜 Počítam výnosy zo strojov...");
        revenue.revenueMachinery = 0;
        if (linkedData.workRecords && linkedData.workRecords.records) {
            for (var j = 0; j < linkedData.workRecords.records.length; j++) {
                var workRec = linkedData.workRecords.records[j];
                var machinesSum = utils.safeGet(workRec, CONFIG.fields.workRecord.machinesSum, 0);
                revenue.revenueMachinery += machinesSum;
                utils.addDebug(currentEntry, "      • Záznam #" + workRec.field("ID") + ": " + utils.formatMoney(machinesSum));
            }
        }
        revenue.revenueMachineryVat = Math.round(revenue.revenueMachinery * vatRate * 100) / 100;

        // 3. DOPRAVA - podľa nastavenia v Cenovej ponuke
        utils.addDebug(currentEntry, "    🚗 Počítam výnosy z dopravy...");
        var transportResult = calculateTransportRevenue(linkedData);
        revenue.revenueTransport = transportResult.amount || 0;
        revenue.revenueTransportVat = Math.round(revenue.revenueTransport * vatRate * 100) / 100;

        // 4. SUBDODÁVKY - z pokladne + prirážka
        utils.addDebug(currentEntry, "    🏗️ Počítam výnosy zo subdodávok...");
        var subcontractorData = calculateSubcontractorRevenue(linkedData, vatRate);
        revenue.revenueSubcontractors = subcontractorData.amount;
        revenue.revenueSubcontractorsVat = subcontractorData.vat;

        // 5. OSTATNÉ - z pokladne + prirážka
        utils.addDebug(currentEntry, "    📦 Počítam ostatné výnosy...");
        var otherData = calculateOtherRevenue(linkedData, vatRate);
        revenue.revenueOther = otherData.amount;
        revenue.revenueOtherVat = otherData.vat;

        // 6. MATERIÁL - pripravené na neskoršiu implementáciu
        var materialData = calculateMaterialRevenue(linkedData, vatRate);
        revenue.revenueMaterial = materialData.amount;
        revenue.revenueMaterialVat = materialData.vat;

        // SÚČTY
        revenue.revenueTotal = revenue.revenueWork + revenue.revenueMaterial +
                              revenue.revenueMachinery + revenue.revenueTransport +
                              revenue.revenueSubcontractors + revenue.revenueOther;

        revenue.revenueTotalVat = revenue.revenueWorkVat + revenue.revenueMaterialVat +
                                 revenue.revenueMachineryVat + revenue.revenueTransportVat +
                                 revenue.revenueSubcontractorsVat + revenue.revenueOtherVat;

        utils.addDebug(currentEntry, "    ✅ VÝNOSY FINÁLNE:");
        utils.addDebug(currentEntry, "      • Práce: " + utils.formatMoney(revenue.revenueWork) + " + DPH " + utils.formatMoney(revenue.revenueWorkVat));
        utils.addDebug(currentEntry, "      • Materiál: " + utils.formatMoney(revenue.revenueMaterial) + " + DPH " + utils.formatMoney(revenue.revenueMaterialVat));
        utils.addDebug(currentEntry, "      • Stroje: " + utils.formatMoney(revenue.revenueMachinery) + " + DPH " + utils.formatMoney(revenue.revenueMachineryVat));
        utils.addDebug(currentEntry, "      • Doprava: " + utils.formatMoney(revenue.revenueTransport) + " + DPH " + utils.formatMoney(revenue.revenueTransportVat));
        utils.addDebug(currentEntry, "      • Subdodávky: " + utils.formatMoney(revenue.revenueSubcontractors) + " + DPH " + utils.formatMoney(revenue.revenueSubcontractorsVat));
        utils.addDebug(currentEntry, "      • Ostatné: " + utils.formatMoney(revenue.revenueOther) + " + DPH " + utils.formatMoney(revenue.revenueOtherVat));
        utils.addDebug(currentEntry, "      • SPOLU: " + utils.formatMoney(revenue.revenueTotal) + " + DPH " + utils.formatMoney(revenue.revenueTotalVat));

        return revenue;

    } catch (error) {
        utils.addError(currentEntry, error.toString(), "calculateRevenue", error);
        return revenue;
    }
}

// ==============================================
// POMOCNÉ FUNKCIE PRE VÝPOČET VÝNOSOV
// ==============================================

function calculateSubcontractorRevenue(linkedData, vatRate) {
    try {
        utils.addDebug(currentEntry, "      🔍 Hľadám subdodávky v pokladni...");

        var amount = 0;
        var baseAmount = 0;

        // Prejdi záznamy linksFrom Pokladňa/Zákazka where Účel výdaja = Subdodávky
        var cashBookRecords = currentEntry.linksFrom(CONFIG.libraries.cashBook, CONFIG.fields.order.order);
        utils.addDebug(currentEntry, "        • Počet záznamov v pokladni (výnosy subdodávky): " + (cashBookRecords ? cashBookRecords.length : 0));

        if (cashBookRecords && cashBookRecords.length > 0) {
            for (var i = 0; i < cashBookRecords.length; i++) {
                var cashRecord = cashBookRecords[i];
                var purpose = utils.safeGet(cashRecord, "Účel výdaja", "");

                // Debug: hodnoty pre porovnanie
                utils.addDebug(currentEntry, "        ◦ Debug Účel výdaja (subdodávky výnosy): '" + purpose + "' (typ: " + typeof purpose + ", dĺžka: " + purpose.length + ")");

                // Použijem trim() pre istotu
                var trimmedPurpose = (purpose || "").toString().trim();
                if (trimmedPurpose === "Subdodávky") {
                    var suma = utils.safeGet(cashRecord, "Suma", 0);
                    baseAmount += suma;
                    utils.addDebug(currentEntry, "        • Záznam #" + cashRecord.field("ID") + ": " + utils.formatMoney(suma));
                }
            }
        }

        // Pripočítaj prirážku
        var markupPercent = utils.safeGet(currentEntry, CONFIG.fields.order.subcontractorMarkup, 0);
        var markupAmount = baseAmount * (markupPercent / 100);
        amount = baseAmount + markupAmount;

        if (markupPercent > 0) {
            utils.addDebug(currentEntry, "        • Prirážka " + markupPercent + "%: " + utils.formatMoney(markupAmount));
        }

        var vat = Math.round(amount * vatRate * 100) / 100;

        return {
            amount: Math.round(amount * 100) / 100,
            vat: vat,
            baseAmount: baseAmount,
            markupAmount: markupAmount
        };

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri výpočte subdodávok: " + error.toString(), "calculateSubcontractorRevenue");
        return { amount: 0, vat: 0, baseAmount: 0, markupAmount: 0 };
    }
}

function calculateOtherRevenue(linkedData, vatRate) {
    try {
        utils.addDebug(currentEntry, "      🔍 Hľadám ostatné výnosy v pokladni...");

        var amount = 0;
        var baseAmount = 0;

        // Prejdi záznamy linksFrom Pokladňa/Zákazka where Účel výdaja = Ostatné
        var cashBookRecords = currentEntry.linksFrom(CONFIG.libraries.cashBook, CONFIG.fields.order.order);
        if (cashBookRecords && cashBookRecords.length > 0) {
            for (var i = 0; i < cashBookRecords.length; i++) {
                var cashRecord = cashBookRecords[i];
                var purpose = utils.safeGet(cashRecord, "Účel výdaja", "");

                // Debug: hodnoty pre porovnanie
                utils.addDebug(currentEntry, "        ◦ Debug Účel výdaja (ostatné výnosy): '" + purpose + "' (typ: " + typeof purpose + ", dĺžka: " + purpose.length + ")");

                // Použijem trim() pre istotu
                var trimmedPurpose = (purpose || "").toString().trim();
                if (trimmedPurpose === "Ostatné") {
                    var suma = utils.safeGet(cashRecord, "Suma", 0);
                    baseAmount += suma;
                    utils.addDebug(currentEntry, "        • Záznam #" + cashRecord.field("ID") + ": " + utils.formatMoney(suma));
                }
            }
        }

        // Pripočítaj prirážku
        var markupPercent = utils.safeGet(currentEntry, CONFIG.fields.order.otherMarkup, 0);
        var markupAmount = baseAmount * (markupPercent / 100);
        amount = baseAmount + markupAmount;

        if (markupPercent > 0) {
            utils.addDebug(currentEntry, "        • Prirážka " + markupPercent + "%: " + utils.formatMoney(markupAmount));
        }

        var vat = Math.round(amount * vatRate * 100) / 100;

        return {
            amount: Math.round(amount * 100) / 100,
            vat: vat,
            baseAmount: baseAmount,
            markupAmount: markupAmount
        };

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri výpočte ostatných výnosov: " + error.toString(), "calculateOtherRevenue");
        return { amount: 0, vat: 0, baseAmount: 0, markupAmount: 0 };
    }
}

function calculateMaterialRevenue(linkedData, vatRate) {
    try {
        utils.addDebug(currentEntry, "      📦 Materiál - pripravené na neskoršiu implementáciu...");

        // Pripravené na neskoršiu implementáciu
        return {
            amount: 0,
            vat: 0,
            baseAmount: 0,
            markupAmount: 0
        };

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri výpočte materiálu: " + error.toString(), "calculateMaterialRevenue");
        return { amount: 0, vat: 0, baseAmount: 0, markupAmount: 0 };
    }
}

function calculateTransportRevenue(linkedData) {
    try {
        utils.addDebug(currentEntry, "    🚗 Počítam výnosy z dopravy...");
        
        // Získaj cenovú ponuku
        var quote = utils.safeGetLinks(currentEntry, CONFIG.fields.order.quote);
        if (!quote || quote.length === 0) {
            utils.addDebug(currentEntry, "      ℹ️ Žiadna cenová ponuka - používam výkazy dopravy");
            return linkedData.rideReports.totalSum;
        }
        
        var quoteObj = quote[0];
        var rideCalculation = utils.safeGet(quoteObj, CONFIG.fields.quote.rideCalculation);
        
        utils.addDebug(currentEntry, "      • Typ účtovania: " + (rideCalculation || "Neurčené"));
        
        switch (rideCalculation) {
            case "Paušál":
                return calculateFlatRateTransport(linkedData, quoteObj);
                
            case "Km":
                return calculateKmBasedTransport(linkedData, quoteObj);
                
            case "% zo zákazky":
                return calculatePercentageTransport(linkedData, quoteObj, revenue);
                
            case "Pevná cena":
                return calculateFixedPriceTransport(quoteObj);
                
            case "Neúčtovať":
                utils.addDebug(currentEntry, "      • Doprava sa neúčtuje");
                return 0;
                
            default:
                utils.addDebug(currentEntry, "      ⚠️ Neznámy typ účtovania - používam výkazy");
                return linkedData.rideReports.totalSum;
        }
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "calculateTransportRevenue", error);
        return 0;
    }
}
// Paušál - počet jázd × sadzba
function calculateFlatRateTransport(linkedData, quoteObj) {
    try {
        var rideCount = linkedData.rideLog.records.length;
        var flatRatePriceLink = utils.safeGetLinks(quoteObj, CONFIG.fields.quote.flatRateRidePrice);
        
        if (!flatRatePriceLink || flatRatePriceLink.length === 0) {
            utils.addError(currentEntry, "Chýba linknutá sadzba pre paušál dopravu", "calculateFlatRateTransport");
            return 0;
        }
        
        var flatRatePrice = utils.safeGet(flatRatePriceLink[0], "Cena", 0);
        var total = rideCount * flatRatePrice;
        
        utils.addDebug(currentEntry, "      • Paušál: " + rideCount + " jázd × " + flatRatePrice + " € = " + utils.formatMoney(total));
        
        return total;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "calculateFlatRateTransport", error);
        return 0;
    }
}

// Km - celkové km × sadzba za km
function calculateKmBasedTransport(linkedData, quoteObj) {
    try {
        var totalKm = linkedData.rideLog.totalKm;
        var kmPriceLink = utils.safeGetLinks(quoteObj, CONFIG.fields.quote.kmRidePrice);
        
        if (!kmPriceLink || kmPriceLink.length === 0) {
            utils.addError(currentEntry, "Chýba linknutá sadzba za km", "calculateKmBasedTransport");
            return 0;
        }
        
        var kmPrice = utils.safeGet(kmPriceLink[0], "Cena", 0);
        var total = totalKm * kmPrice;
        
        utils.addDebug(currentEntry, "      • Km: " + totalKm + " km × " + kmPrice + " € = " + utils.formatMoney(total));
        
        return total;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "calculateKmBasedTransport", error);
        return 0;
    }
}

// % zo zákazky - percentuálny výpočet
function calculatePercentageTransport(linkedData, quoteObj, revenue) {
    try {
        var rateRidePrice = utils.safeGet(quoteObj, CONFIG.fields.quote.rateRidePrice, 0);
        
        // Súčet všetkých položiek okrem dopravy
        var baseAmount = 0;
        
        // Práce
        baseAmount += utils.safeGet(currentEntry, CONFIG.fields.order.workReportTotal, 0);
        
        // Materiál
        baseAmount += utils.safeGet(currentEntry, CONFIG.fields.order.materialTotal, 0);
        
        // Stroje
        baseAmount += utils.safeGet(currentEntry, CONFIG.fields.order.machineryTotal, 0);
        
        // Subdodávky/Ostatné
        baseAmount += utils.safeGet(currentEntry, CONFIG.fields.order.otherTotal, 0);
        
        // Vypočítaj % z celkovej sumy
        var percentage = rateRidePrice / 100; // Konvertuj na desatinné číslo
        var total = baseAmount * percentage;
        
        utils.addDebug(currentEntry, "      • % zo zákazky: " + baseAmount + " € × " + rateRidePrice + "% = " + utils.formatMoney(total));
        utils.addDebug(currentEntry, "        - Práce: " + utils.safeGet(currentEntry, CONFIG.fields.order.workReportTotal, 0) + " €");
        utils.addDebug(currentEntry, "        - Materiál: " + utils.safeGet(currentEntry, CONFIG.fields.order.materialTotal, 0) + " €");
        utils.addDebug(currentEntry, "        - Stroje: " + utils.safeGet(currentEntry, CONFIG.fields.order.machineryTotal, 0) + " €");
        utils.addDebug(currentEntry, "        - Subdodávky: " + utils.safeGet(currentEntry, CONFIG.fields.order.otherTotal, 0) + " €");
        
        return total;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "calculatePercentageTransport", error);
        return 0;
    }
}

// Pevná cena
function calculateFixedPriceTransport(quoteObj) {
    try {
        var fixedPrice = utils.safeGet(quoteObj, CONFIG.fields.quote.fixRidePrice, 0);
        
        utils.addDebug(currentEntry, "      • Pevná cena dopravy: " + utils.formatMoney(fixedPrice));
        
        return fixedPrice;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "calculateFixedPriceTransport", error);
        return 0;
    }
}
// ==============================================
// VÝPOČET MARŽE A RENTABILITY
// ==============================================

function calculateProfitability(costs, revenue) {
    var profit = {
        grossProfit: 0,      // Hrubý zisk
        grossMargin: 0,      // Hrubá marža v %
        netProfit: 0,        // Čistý zisk (po DPH)
        profitability: 0,    // Rentabilita v %
        isProfitable: false  // Je zákazka zisková?
    };
    
    try {
        utils.addDebug(currentEntry, "  📊 Počítam ziskovosť...");
        
        // Hrubý zisk
        profit.grossProfit = revenue.totalRevenue - costs.totalCosts;
        
        // Hrubá marža
        if (revenue.totalRevenue > 0) {
            profit.grossMargin = (profit.grossProfit / revenue.totalRevenue) * 100;
        }
        
        // Čistý zisk (po odvode DPH)
        profit.netProfit = profit.grossProfit - costs.vatAmount;
        
        // Rentabilita
        if (costs.totalCosts > 0) {
            profit.profitability = (profit.netProfit / costs.totalCosts) * 100;
        }
        
        // Je zisková?
        profit.isProfitable = profit.netProfit > 0;
        
        utils.addDebug(currentEntry, "    • Hrubý zisk: " + utils.formatMoney(profit.grossProfit));
        utils.addDebug(currentEntry, "    • Hrubá marža: " + profit.grossMargin.toFixed(2) + "%");
        utils.addDebug(currentEntry, "    • Čistý zisk: " + utils.formatMoney(profit.netProfit));
        utils.addDebug(currentEntry, "    • Rentabilita: " + profit.profitability.toFixed(2) + "%");
        utils.addDebug(currentEntry, "    • Stav: " + (profit.isProfitable ? "✅ ZISKOVÁ" : "❌ STRATOVÁ"));
        
        return profit;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "calculateProfitability", error);
        return profit;
    }
}

// ==============================================
// VYTVORENIE INFO ZÁZNAMU
// ==============================================

function createInfoRecord(linkedData, costs, revenue, profit) {
    try {
        var info = "📋 PREPOČET ZÁKAZKY\n";
        info += "=====================================\n\n";
        
        // Základné info
        var orderNumber = utils.safeGet(currentEntry, CONFIG.fields.order.number);
        var orderName = utils.safeGet(currentEntry, CONFIG.fields.order.name);
        info += "📦 Zákazka: " + (orderNumber ? "#" + orderNumber + " " : "") + (orderName || "N/A") + "\n";
        info += "📅 Dátum prepočtu: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n\n";
        
        // Súhrn práce
        info += "👷 PRÁCA\n";
        info += "─────────────────────────────\n";
        info += "• Odpracované hodiny: " + linkedData.workRecords.totalHours.toFixed(2) + " h\n";
        info += "• Mzdové náklady: " + utils.formatMoney(costs.wageCosts) + "\n\n";
        
        // Súhrn dopravy
        info += "🚗 DOPRAVA\n";
        info += "─────────────────────────────\n";
        info += "• Počet jázd: " + linkedData.rideLog.records.length + "\n";
        info += "• Najazdené km: " + linkedData.rideLog.totalKm + " km\n";
        info += "• Hodiny v aute: " + linkedData.rideLog.totalTime.toFixed(2) + " h\n";
        info += "• Náklady na PHM: " + utils.formatMoney(costs.transportCosts) + "\n\n";
        
        // Náklady
        info += "💸 NÁKLADY\n";
        info += "─────────────────────────────\n";
        info += "• Mzdy: " + utils.formatMoney(costs.wageCosts) + "\n";
        info += "• Doprava: " + utils.formatMoney(costs.transportCosts) + "\n";
        info += "• Stroje: " + utils.formatMoney(costs.machineryCosts) + "\n";
        info += "• Materiál: " + utils.formatMoney(costs.materialCosts) + "\n";
        info += "• Ostatné: " + utils.formatMoney(costs.otherCosts) + "\n";
        info += "• CELKOM: " + utils.formatMoney(costs.totalCosts) + "\n\n";
        
        // Výnosy
        info += "💰 VÝNOSY\n";
        info += "─────────────────────────────\n";
        info += "• Práce: " + utils.formatMoney(revenue.workRevenue) + "\n";
        info += "• Doprava: " + utils.formatMoney(revenue.transportRevenue) + "\n";
        info += "• Stroje: " + utils.formatMoney(revenue.machineryRevenue) + "\n";
        info += "• Ostatné: " + utils.formatMoney(revenue.otherRevenue) + "\n";
        info += "• CELKOM: " + utils.formatMoney(revenue.totalRevenue) + "\n\n";
        
        // Ziskovosť
        info += "📊 ZISKOVOSŤ\n";
        info += "─────────────────────────────\n";
        info += "• Hrubý zisk: " + utils.formatMoney(profit.grossProfit) + "\n";
        info += "• Marža: " + profit.grossMargin.toFixed(2) + "%\n";
        info += "• DPH odvod: " + utils.formatMoney(costs.vatAmount) + "\n";
        info += "• Čistý zisk: " + utils.formatMoney(profit.netProfit) + "\n";
        info += "• Rentabilita: " + profit.profitability.toFixed(2) + "%\n";
        info += "• Stav: " + (profit.isProfitable ? "✅ ZISKOVÁ" : "❌ STRATOVÁ") + "\n\n";
        
        info += "🔧 Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        info += "✅ PREPOČET DOKONČENÝ";
        
        utils.safeSet(currentEntry, CONFIG.fields.common.info, info);
        utils.addDebug(currentEntry, "  ✅ Info záznam vytvorený");
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createInfoRecord", error);
    }
}

// ==============================================
// ULOŽENIE VYPOČÍTANÝCH HODNÔT
// ==============================================

function saveCalculatedValues(linkedData, costs, revenue, profit) {
    try {
        utils.addDebug(currentEntry, "  💾 Ukladám vypočítané hodnoty podľa nových CONFIG polí...");

        // ZÁKLADNÉ ÚDAJE
        utils.safeSet(currentEntry, CONFIG.fields.order.hoursCount, linkedData.workRecords.totalHours);
        utils.safeSet(currentEntry, CONFIG.fields.order.transportCounts, linkedData.rideLog.records.length);
        utils.safeSet(currentEntry, CONFIG.fields.order.transportHours, linkedData.rideLog.totalTime);
        utils.safeSet(currentEntry, CONFIG.fields.order.km, linkedData.rideLog.totalKm);
        utils.safeSet(currentEntry, CONFIG.fields.order.wageCosts, linkedData.workRecords.totalWageCosts);
        utils.safeSet(currentEntry, CONFIG.fields.order.transportWageCosts, linkedData.rideLog.totalWageCosts);

        // VÝNOSY - podľa screenshotov
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueWork, revenue.revenueWork);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueWorkVat, revenue.revenueWorkVat);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueMaterial, revenue.revenueMaterial);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueMaterialVat, revenue.revenueMaterialVat);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueMachinery, revenue.revenueMachinery);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueMachineryVat, revenue.revenueMachineryVat);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueTransport, revenue.revenueTransport);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueTransportVat, revenue.revenueTransportVat);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueSubcontractors, revenue.revenueSubcontractors);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueSubcontractorsVat, revenue.revenueSubcontractorsVat);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueOther, revenue.revenueOther);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueOtherVat, revenue.revenueOtherVat);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueTotal, revenue.revenueTotal);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueTotalVat, revenue.revenueTotalVat);

        // NÁKLADY - podľa screenshotov
        utils.safeSet(currentEntry, CONFIG.fields.order.costWork, costs.costWork);
        utils.safeSet(currentEntry, CONFIG.fields.order.costWorkVatDeduction, costs.costWorkVatDeduction);
        utils.safeSet(currentEntry, CONFIG.fields.order.costMaterial, costs.costMaterial);
        utils.safeSet(currentEntry, CONFIG.fields.order.costMaterialVatDeduction, costs.costMaterialVatDeduction);
        utils.safeSet(currentEntry, CONFIG.fields.order.costMachinery, costs.costMachinery);
        utils.safeSet(currentEntry, CONFIG.fields.order.costMachineryVatDeduction, costs.costMachineryVatDeduction);
        utils.safeSet(currentEntry, CONFIG.fields.order.costTransport, costs.costTransport);
        utils.safeSet(currentEntry, CONFIG.fields.order.costTransportVatDeduction, costs.costTransportVatDeduction);
        utils.safeSet(currentEntry, CONFIG.fields.order.costSubcontractors, costs.costSubcontractors);
        utils.safeSet(currentEntry, CONFIG.fields.order.costSubcontractorsVatDeduction, costs.costSubcontractorsVatDeduction);
        utils.safeSet(currentEntry, CONFIG.fields.order.costOther, costs.costOther);
        utils.safeSet(currentEntry, CONFIG.fields.order.costOtherVatDeduction, costs.costOtherVatDeduction);
        utils.safeSet(currentEntry, CONFIG.fields.order.costTotal, costs.costTotal);
        utils.safeSet(currentEntry, CONFIG.fields.order.costTotalVatDeduction, costs.costTotalVatDeduction);
        utils.safeSet(currentEntry, CONFIG.fields.order.otherExpenses, costs.otherExpenses);

        // STARÝ ÚDAJ pre kompatibilitu
        utils.safeSet(currentEntry, CONFIG.fields.order.totalBilled, revenue.revenueTotal + revenue.revenueTotalVat);

        // PRIRÁŽKY (ak sú nastavené v poli)
        var subcontractorMarkup = utils.safeGet(currentEntry, CONFIG.fields.order.subcontractorMarkup, 0);
        var otherMarkup = utils.safeGet(currentEntry, CONFIG.fields.order.otherMarkup, 0);

        if (subcontractorMarkup > 0) {
            var markupAmount = revenue.revenueSubcontractors * (subcontractorMarkup / 100);
            utils.addDebug(currentEntry, "    • Prirážka subdodávky: " + subcontractorMarkup + "% = " + utils.formatMoney(markupAmount));
        }

        if (otherMarkup > 0) {
            var otherMarkupAmount = revenue.revenueOther * (otherMarkup / 100);
            utils.addDebug(currentEntry, "    • Prirážka ostatné: " + otherMarkup + "% = " + utils.formatMoney(otherMarkupAmount));
        }

        // ROZPOČET A ZOSTATOK
        var budget = utils.safeGet(currentEntry, CONFIG.fields.order.budget, 0);
        var spent = costs.costTotal;
        var remaining = budget - spent;

        utils.safeSet(currentEntry, CONFIG.fields.order.spent, spent);
        utils.safeSet(currentEntry, CONFIG.fields.order.remaining, remaining);

        // NASTAVENIE FARIEB PODĽA RENTABILITY
        if (profit && profit.isProfitable) {
            utils.setColor(currentEntry, "fg", "green");
            utils.setColor(currentEntry, "bg", "pastel green");
        } else {
            utils.setColor(currentEntry, "fg", "red");
            utils.setColor(currentEntry, "bg", "pastel red");
        }

        utils.addDebug(currentEntry, "  ✅ Všetky hodnoty uložené do nových CONFIG polí");

    } catch (error) {
        utils.addError(currentEntry, error.toString(), "saveCalculatedValues", error);
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
            if (!steps[step].success) {
                allSuccess = false;
            }
        }
        
        if (allSuccess) {
            utils.addDebug(currentEntry, "\n✅ Všetky kroky dokončené úspešne!");
            
            // Zobraz súhrn používateľovi
            var orderName = utils.safeGet(currentEntry, CONFIG.fields.order.name, "Zákazka");
            var totalCosts = utils.safeGet(currentEntry, CONFIG.fields.order.totalCosts, 0);
            var totalBilled = utils.safeGet(currentEntry, CONFIG.fields.order.totalBilled, 0);
            var profit = totalBilled - totalCosts;
            var profitPercent = totalCosts > 0 ? ((profit / totalCosts) * 100).toFixed(2) : 0;
            
            var summaryMsg = "✅ PREPOČET DOKONČENÝ\n\n";
            summaryMsg += "📦 " + orderName + "\n";
            summaryMsg += "━━━━━━━━━━━━━━━━━━━━━\n";
            summaryMsg += "💸 Náklady: " + utils.formatMoney(totalCosts) + "\n";
            summaryMsg += "💰 Výnosy: " + utils.formatMoney(totalBilled) + "\n";
            summaryMsg += "📊 Zisk: " + utils.formatMoney(profit) + " (" + profitPercent + "%)\n";
            summaryMsg += "━━━━━━━━━━━━━━━━━━━━━\n";
            summaryMsg += "ℹ️ Detaily v poli 'info'";
            
            message(summaryMsg);
        } else {
            utils.addDebug(currentEntry, "\n⚠️ Niektoré kroky zlyhali!");
            message("⚠️ Prepočet dokončený s chybami.\nSkontrolujte Debug Log.");
        }
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "logFinalSummary", error);
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

main();