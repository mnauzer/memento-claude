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
            step7: { success: false, name: "Finálne uloženie" },
            step8: { success: false, name: "Telegram notifikácia" }
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
        var profitResult = utils.calculateProfitability(costsResult, revenueResult);
        steps.step5.success = true;
        
        // KROK 6: Info záznam
        utils.addDebug(currentEntry, "\n📝 KROK 6: " + steps.step6.name, "info");
        createInfoRecord(linkedData, costsResult, revenueResult, profitResult);
        steps.step6.success = true;
        
        // KROK 7: Finálne uloženie
        utils.addDebug(currentEntry, "\n💾 KROK 7: " + steps.step7.name, "save");
        saveCalculatedValues(linkedData, costsResult, revenueResult, profitResult);
        steps.step7.success = true;

        // KROK 8: Telegram notifikácia
        utils.addDebug(currentEntry, "\n📱 KROK 8: Vytvorenie Telegram notifikácie", "telegram");
        var telegramResult = createTelegramNotification(linkedData, costsResult, revenueResult, profitResult);
        steps.step8 = { success: telegramResult.success, name: "Telegram notifikácia" };
        
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
        utils.addDebug(currentEntry, "    • Pokladňa: " + data.cashBook.records.length + " záznamov");

        // VÝKAZY PRÁC - linksFrom
        var workReports = currentEntry.linksFrom(CONFIG.libraries.workReport, CONFIG.fields.workReport.order);
        if (workReports && workReports.length > 0) {
            data.workReports.records = workReports;

            for (var m = 0; m < workReports.length; m++) {
                var report = workReports[m];
                var totalHours = utils.safeGet(report, CONFIG.fields.workReport.totalHours, 0);
                var sum = utils.safeGet(report, CONFIG.fields.workReport.sum, 0);

                data.workReports.totalHours += totalHours;
                data.workReports.totalSum += sum;
            }
        }
        utils.addDebug(currentEntry, "    • Výkazy prác: " + data.workReports.records.length + " záznamov");
        
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
        work: 0,                     // Náklady práce - hodnota ako v poli Mzdy
        workVatDeduction: 0,         // Odpočet DPH práce - 0 (zo mzdy sa neodpočítava)
        material: 0,                 // Náklady materiál - pripravené na implementáciu
        materialVatDeduction: 0,     // Odpočet DPH materiál - pripravené na implementáciu
        machinery: 0,                // Náklady stroje - z pokladne Požičovné stroja
        machineryVatDeduction: 0,    // Odpočet DPH stroje - z pokladne DPH
        transport: 0,                // Náklady doprava - pripravené
        transportVatDeduction: 0,    // Odpočet DPH doprava - pripravené
        subcontractors: 0,           // Náklady subdodávky - z pokladne Subdodávky
        subcontractorsVatDeduction: 0, // Odpočet DPH subdodávky - z pokladne DPH
        other: 0,                    // Náklady ostatné - z pokladne ostatné
        otherVatDeduction: 0,        // Odpočet DPH ostatné - z pokladne DPH
        total: 0,                    // Náklady celkom
        totalVatDeduction: 0,        // Odpočet DPH celkom
        otherExpenses: 0                 // Iné výdavky
    };

    try {
        utils.addDebug(currentEntry, "  💸 Počítam náklady podľa nových požiadaviek...");

        // 1. NÁKLADY PRÁCE - čisté mzdy + odvody a dane = superhrubá mzda
        utils.addDebug(currentEntry, "    👷 Počítam náklady práce...");

        var netWages = utils.safeGet(currentEntry, CONFIG.fields.order.wageCosts, 0);
        var wageDeductionsResult = calculateWageDeductions(netWages);

        // Ulož odvody do poľa "Mzdy odvody"
        utils.safeSet(currentEntry, CONFIG.fields.order.wageDeductions, wageDeductionsResult.deductions);

        // Náklady práce = superhrubá mzda (celkové náklady zamestnávateľa)
        costs.work = wageDeductionsResult.superGrossWages;
        costs.workVatDeduction = 0; // Zo mzdy sa DPH neodpočítava

        utils.addDebug(currentEntry, "      • Čisté mzdy: " + utils.formatMoney(netWages));
        utils.addDebug(currentEntry, "      • Mzdy odvody: " + utils.formatMoney(wageDeductionsResult.deductions));
        utils.addDebug(currentEntry, "      • Náklady práce (superhrubá): " + utils.formatMoney(costs.work));

        // 2. NÁKLADY STROJE - z pokladne Prevádzková réžia = Požičovné stroja
        utils.addDebug(currentEntry, "    🚜 Počítam náklady strojov...");
        var machineryCostData = calculateMachineryCosts();
        costs.machinery = machineryCostData.amount;
        costs.machineryVatDeduction = machineryCostData.vatDeduction;

        // 3. NÁKLADY SUBDODÁVKY - z pokladne Účel výdaja = Subdodávky
        utils.addDebug(currentEntry, "    🏗️ Počítam náklady subdodávok...");
        var subcontractorCostData = calculateSubcontractorCosts();
        utils.addDebug(currentEntry, "      • Subdodávky celkom: " + utils.formatMoney(subcontractorCostData.amount)) 
        utils.addDebug(currentEntry, "      • Subdodávky počet: " + subcontractorCostData.count) 
        costs.subcontractors = subcontractorCostData.amount;
        costs.subcontractorsVatDeduction = subcontractorCostData.vatDeduction;

        // 4. NÁKLADY OSTATNÉ - z pokladne Účel výdaja = Ostatné
        utils.addDebug(currentEntry, "    📦 Počítam ostatné náklady...");
        var otherCostData = calculateOtherCosts();
        costs.other = otherCostData.amount;
        costs.otherVatDeduction = otherCostData.vatDeduction;

        // 5. NÁKLADY MATERIÁL - pripravené na neskoršiu implementáciu
        var materialCostData = calculateMaterialCosts();
        costs.material = materialCostData.amount;
        costs.materialVatDeduction = materialCostData.vatDeduction;

        // 6. NÁKLADY DOPRAVA - pripravené na neskoršiu implementáciu
        var transportCostData = calculateTransportCosts();
        costs.transport = transportCostData.amount;
        costs.transportVatDeduction = transportCostData.vatDeduction;

        // CELKOVÉ SÚČTY
        costs.total = costs.work + costs.material + costs.machinery +
                         costs.transport + costs.subcontractors + costs.other;

        costs.totalVatDeduction = costs.workVatDeduction + costs.materialVatDeduction +
                                     costs.machineryVatDeduction + costs.transportVatDeduction +
                                     costs.subcontractorsVatDeduction + costs.otherVatDeduction;

        // INÉ VÝDAVKY - dodatočné výdavky (môžu byť zadané manuálne)
        costs.otherExpenses = 0; // Zatiaľ 0, môže byť doplnené

        utils.addDebug(currentEntry, "    ✅ NÁKLADY FINÁLNE:");
        utils.addDebug(currentEntry, "      • Práce: " + utils.formatMoney(costs.work) + " (odpočet DPH: " + utils.formatMoney(costs.workVatDeduction) + ")");
        utils.addDebug(currentEntry, "      • Materiál: " + utils.formatMoney(costs.material) + " (odpočet DPH: " + utils.formatMoney(costs.materialVatDeduction) + ")");
        utils.addDebug(currentEntry, "      • Stroje: " + utils.formatMoney(costs.machinery) + " (odpočet DPH: " + utils.formatMoney(costs.machineryVatDeduction) + ")");
        utils.addDebug(currentEntry, "      • Doprava: " + utils.formatMoney(costs.transport) + " (odpočet DPH: " + utils.formatMoney(costs.transportVatDeduction) + ")");
        utils.addDebug(currentEntry, "      • Subdodávky: " + utils.formatMoney(costs.subcontractors) + " (odpočet DPH: " + utils.formatMoney(costs.subcontractorsVatDeduction) + ")");
        utils.addDebug(currentEntry, "      • Ostatné: " + utils.formatMoney(costs.other) + " (odpočet DPH: " + utils.formatMoney(costs.otherVatDeduction) + ")");
        utils.addDebug(currentEntry, "      • SPOLU: " + utils.formatMoney(costs.total) + " (odpočet DPH: " + utils.formatMoney(costs.totalVatDeduction) + ")");
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
                if (operatingCost.trim() === "Požičovné stroja") {
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
        utils.addDebug(currentEntry, "        • Počet záznamov v pokladni: " + (cashBookRecords ? cashBookRecords.length : 0));

        if (cashBookRecords && cashBookRecords.length > 0) {
            for (var i = 0; i < cashBookRecords.length; i++) {
                var cashRecord = cashBookRecords[i];
                var purpose = utils.safeGet(cashRecord, "Účel výdaja", "");
                // Použijem trim() pre istotu
                if (purpose.trim() === "Subdodávky") {
                    var suma = utils.safeGet(cashRecord, CONFIG.fields.cashBook.sum, 0);
                    var dph = utils.safeGet(cashRecord, CONFIG.fields.cashBook.vat, 0);

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
                if (purpose.trim() === "Ostatné") {
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

function calculateWageDeductions(netWages) {
    try {
        utils.addDebug(currentEntry, "      👥 Počítam odvody zo mzdy...");

        if (!netWages || netWages === 0) {
            utils.addDebug(currentEntry, "        • Žiadne mzdy - preskakujem odvody");
            return {
                deductions: 0,
                grossWages: 0,
                superGrossWages: 0
            };
        }

        utils.addDebug(currentEntry, "        • Čisté mzdy: " + utils.formatMoney(netWages));

        // Koeficienty pre rok 2025
        var EMPLOYEE_DEDUCTIONS_RATE = 0.134;  // 13,4% odvody zamestnanca
        var EMPLOYER_DEDUCTIONS_RATE = 0.352;  // 35,2% odvody zamestnávateľa
        var INCOME_TAX_RATE = 0.19;            // 19% daň z príjmu
        var TAX_FREE_AMOUNT = 479.48;          // mesačný nezdaniteľný minimum

        // Iteratívny výpočet hrubej mzdy z čistej mzdy
        var grossWage = netWages; // Začneme s odhadom
        var maxIterations = 10;
        var tolerance = 0.01; // 1 cent presnosť

        for (var i = 0; i < maxIterations; i++) {
            // Vypočítaj odvody zamestnanca
            var employeeDeductions = grossWage * EMPLOYEE_DEDUCTIONS_RATE;

            // Vypočítaj daňový základ
            var taxBase = grossWage - employeeDeductions - TAX_FREE_AMOUNT;
            var incomeTax = 0;

            if (taxBase > 0) {
                incomeTax = taxBase * INCOME_TAX_RATE;
            }

            // Vypočítaj čistú mzdu z tejto hrubej mzdy
            var calculatedNetWage = grossWage - employeeDeductions - incomeTax;

            // Ak sme blízko k požadovanej čistej mzde, skončíme
            var difference = Math.abs(calculatedNetWage - netWages);
            if (difference < tolerance) {
                break;
            }

            // Upravíme odhad hrubej mzdy
            var ratio = netWages / calculatedNetWage;
            grossWage = grossWage * ratio;
        }

        // Zaokrúhli hrubú mzdu
        grossWage = Math.round(grossWage * 100) / 100;

        // Vypočítaj finálne odvody
        var finalEmployeeDeductions = Math.round(grossWage * EMPLOYEE_DEDUCTIONS_RATE * 100) / 100;
        var finalTaxBase = grossWage - finalEmployeeDeductions - TAX_FREE_AMOUNT;
        var finalIncomeTax = finalTaxBase > 0 ? Math.round(finalTaxBase * INCOME_TAX_RATE * 100) / 100 : 0;
        var employerDeductions = Math.round(grossWage * EMPLOYER_DEDUCTIONS_RATE * 100) / 100;

        // Celkové odvody = odvody zamestnanca + daň z príjmu + odvody zamestnávateľa
        var totalDeductions = finalEmployeeDeductions + finalIncomeTax + employerDeductions;

        // Superhrubá mzda (celkové náklady práce)
        var superGrossWage = grossWage + employerDeductions;

        utils.addDebug(currentEntry, "        • Hrubá mzda: " + utils.formatMoney(grossWage));
        utils.addDebug(currentEntry, "        • Odvody zamestnanca (13,4%): " + utils.formatMoney(finalEmployeeDeductions));
        utils.addDebug(currentEntry, "        • Daň z príjmu (19%): " + utils.formatMoney(finalIncomeTax));
        utils.addDebug(currentEntry, "        • Odvody zamestnávateľa (35,2%): " + utils.formatMoney(employerDeductions));
        utils.addDebug(currentEntry, "        • CELKOVÉ odvody: " + utils.formatMoney(totalDeductions));
        utils.addDebug(currentEntry, "        • Superhrubá mzda: " + utils.formatMoney(superGrossWage));

        // Kontrolný výpočet čistej mzdy
        var controlNetWage = grossWage - finalEmployeeDeductions - finalIncomeTax;
        utils.addDebug(currentEntry, "        • Kontrola čistej mzdy: " + utils.formatMoney(controlNetWage) +
                      " (rozdiel: " + utils.formatMoney(Math.abs(controlNetWage - netWages)) + ")");

        return {
            deductions: Math.round(totalDeductions * 100) / 100,
            grossWages: grossWage,
            superGrossWages: Math.round(superGrossWage * 100) / 100,
            breakdown: {
                employeeDeductions: finalEmployeeDeductions,
                incomeTax: finalIncomeTax,
                employerDeductions: employerDeductions
            }
        };

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri výpočte odvodov zo mzdy: " + error.toString(), "calculateWageDeductions");
        return {
            deductions: 0,
            grossWages: netWages || 0,
            superGrossWages: netWages || 0,
            breakdown: {
                employeeDeductions: 0,
                incomeTax: 0,
                employerDeductions: 0
            }
        };
    }
}

function calculateTransportCosts() {
    try {
        utils.addDebug(currentEntry, "      🚗 Počítam náklady na dopravu...");

        var totalTransportCosts = 0;
        var totalVatDeduction = 0;

        // Získaj všetky záznamy z knihy jázd pre túto zákazku
        var rideLogRecords = currentEntry.linksFrom(CONFIG.libraries.rideLog, CONFIG.fields.rideLog.orders);

        if (!rideLogRecords || rideLogRecords.length === 0) {
            utils.addDebug(currentEntry, "        • Žiadne záznamy z knihy jázd");
            return { amount: 0, vatDeduction: 0 };
        }

        utils.addDebug(currentEntry, "        • Počet jázd: " + rideLogRecords.length);

        // Pre každý záznam knihy jázd
        for (var i = 0; i < rideLogRecords.length; i++) {
            var rideRecord = rideLogRecords[i];
            var rideId = rideRecord.field("ID");

            // Získaj vozidlo z záznamu jazdy
            var vehicleField = utils.safeGetLinks(rideRecord, CONFIG.fields.rideLog.vehicle);
            if (!vehicleField || vehicleField.length === 0) {
                utils.addDebug(currentEntry, "        • Jazda #" + rideId + ": žiadne vozidlo");
                continue;
            }

            var vehicle = vehicleField[0];
            var vehicleName = utils.safeGet(vehicle, "Názov", "Neznáme vozidlo");

            // Získaj nákladovú cenu vozidla
            var costRate = utils.safeGet(vehicle, "Nákladová cena", 0);
            if (costRate === 0) {
                utils.addDebug(currentEntry, "        • Vozidlo " + vehicleName + ": žiadna nákladová cena");
                continue;
            }

            // Získaj km z záznamu jazdy
            var km = utils.safeGet(rideRecord, CONFIG.fields.rideLog.km, 0);
            if (km === 0) {
                utils.addDebug(currentEntry, "        • Jazda #" + rideId + ": 0 km");
                continue;
            }

            // Vypočítaj náklady pre tento záznam
            var rideCost = km * costRate;
            totalTransportCosts += rideCost;

            utils.addDebug(currentEntry, "        • Jazda #" + rideId + " (" + vehicleName + "): " +
                          km + " km × " + utils.formatMoney(costRate) + "/km = " +
                          utils.formatMoney(rideCost));
        }

        // Zaokrúhli výsledky
        totalTransportCosts = Math.round(totalTransportCosts * 100) / 100;
        totalVatDeduction = Math.round(totalVatDeduction * 100) / 100;

        utils.addDebug(currentEntry, "        • CELKOVÉ náklady dopravy: " + utils.formatMoney(totalTransportCosts));

        return {
            amount: totalTransportCosts,
            vatDeduction: totalVatDeduction
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
        work: 0,           // Práce - sum poľa Suma HZS všetkých linksFrom Záznam prác/Zákazka
        workVat: 0,        // DPH práce - vypočítané z work
        material: 0,       // Materiál - pripravené na neskoršiu implementáciu
        materialVat: 0,    // DPH materiál - pripravené na neskoršiu implementáciu
        machinery: 0,      // Stroje - sum poľa Suma Stroje všetkých linksFrom Záznam prác/Zákazka
        machineryVat: 0,   // DPH stroje - vypočítané z machinery
        transport: 0,      // Doprava - podľa nastavenia v Cenovej ponuke
        transportVat: 0,   // DPH doprava - vypočítané z transport
        subcontractors: 0, // Subdodávky - z pokladne + prirážka
        subcontractorsVat: 0, // DPH subdodávky - vypočítané
        other: 0,          // Ostatné - z pokladne + prirážka
        otherVat: 0,       // DPH ostatné - vypočítané
        total: 0,          // Suma celkom
        totalVat: 0        // DPH celkom
    };

    try {
        utils.addDebug(currentEntry, "  💰 Počítam výnosy...");

        // Získaj sadzbu DPH z knižnice
        var orderDate = utils.safeGet(currentEntry, CONFIG.fields.order.startDate) ||
                       utils.safeGet(currentEntry, CONFIG.fields.order.date) ||
                       new Date();
        var vatRateResult = getValidVatRate(orderDate);
        var vatRate = vatRateResult.rate;

        utils.addDebug(currentEntry, "    • Použitá sadzba DPH: " + (vatRate * 100) + "%");

        revenue.work = 0;
        revenue.machinery = 0;

        // Debug kontroly PRED for loopom
        utils.addDebug(currentEntry, "    🔨 Počítam výnosy z prác a strojov...");

        if (linkedData.workRecords && linkedData.workRecords.records) {
            // 1. PRÁCE A STROJE - sum poľa Suma HZS všetkých linksFrom Záznam prác/Zákazka
            utils.addDebug(currentEntry, "     • Záznamy prác: " + linkedData.workRecords.records.length);

            for (var workIdx = 0; workIdx < linkedData.workRecords.records.length; workIdx++) {
                var workRecord = linkedData.workRecords.records[workIdx];
                var machinesSum = utils.safeGet(workRecord, CONFIG.fields.workRecord.machinesSum, 0);
                var hzsSum = utils.safeGet(workRecord, CONFIG.fields.workRecord.hzsSum, 0);
                revenue.work += hzsSum;
                revenue.machinery += machinesSum;
                utils.addDebug(currentEntry, "      • Záznam #" + workRecord.field("ID") + " (" + utils.formatDate(workRecord.field("Dátum")) +  "): " + utils.formatMoney(hzsSum));
                if (machinesSum > 0) {
                    utils.addDebug(currentEntry, "      • Záznam #" + workRecord.field("ID") + " (" + utils.formatDate(workRecord.field("Dátum")) +  "): " + utils.formatMoney(machinesSum) + " (stroje)");
                }
            }
        } else {
        }
        revenue.workVat = Math.round(revenue.work * vatRate * 100) / 100;
        revenue.machineryVat = Math.round(revenue.machinery * vatRate * 100) / 100;

        // 3. SUBDODÁVKY - z pokladne + prirážka
        utils.addDebug(currentEntry, "    🏗️ Počítam výnosy zo subdodávok...");
        var subcontractorData = calculateSubcontractorRevenue(linkedData, vatRate);
        revenue.subcontractors = subcontractorData.amount;
        revenue.subcontractorsVat = subcontractorData.vat;

        // 4. OSTATNÉ - z pokladne + prirážka
        utils.addDebug(currentEntry, "    📦 Počítam ostatné výnosy...");
        var otherData = calculateOtherRevenue(linkedData, vatRate);
        revenue.other = otherData.amount;
        revenue.otherVat = otherData.vat;

        // 5. MATERIÁL - pripravené na neskoršiu implementáciu
        var materialData = calculateMaterialRevenue(linkedData, vatRate);
        revenue.material = materialData.amount;
        revenue.materialVat = materialData.vat;

        // 6. DOPRAVA - podľa nastavenia v Cenovej ponuke
        utils.addDebug(currentEntry, "    🚗 Počítam výnosy z dopravy...");
        var transportResult = calculateTransportRevenue(linkedData, revenue);
        revenue.transport = transportResult.amount || 0;
        revenue.transportVat = Math.round(revenue.transport * vatRate * 100) / 100;

        // SÚČTY
        revenue.total = revenue.work + revenue.material +
                              revenue.machinery + revenue.transport +
                              revenue.subcontractors + revenue.other;

        revenue.totalVat = revenue.workVat + revenue.materialVat +
                                 revenue.machineryVat + revenue.transportVat +
                                 revenue.subcontractorsVat + revenue.otherVat;

        utils.addDebug(currentEntry, "    ✅ VÝNOSY FINÁLNE:");
        utils.addDebug(currentEntry, "      • Práce: " + utils.formatMoney(revenue.work) + " + DPH " + utils.formatMoney(revenue.workVat));
        utils.addDebug(currentEntry, "      • Materiál: " + utils.formatMoney(revenue.material) + " + DPH " + utils.formatMoney(revenue.materialVat));
        utils.addDebug(currentEntry, "      • Stroje: " + utils.formatMoney(revenue.machinery) + " + DPH " + utils.formatMoney(revenue.machineryVat));
        utils.addDebug(currentEntry, "      • Doprava: " + utils.formatMoney(revenue.transport) + " + DPH " + utils.formatMoney(revenue.transportVat));
        utils.addDebug(currentEntry, "      • Subdodávky: " + utils.formatMoney(revenue.subcontractors) + " + DPH " + utils.formatMoney(revenue.subcontractorsVat));
        utils.addDebug(currentEntry, "      • Ostatné: " + utils.formatMoney(revenue.other) + " + DPH " + utils.formatMoney(revenue.otherVat));
        utils.addDebug(currentEntry, "      • SPOLU: " + utils.formatMoney(revenue.total) + " + DPH " + utils.formatMoney(revenue.totalVat));

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
        var cashBookRecords = currentEntry.linksFrom(CONFIG.libraries.cashBook, CONFIG.fields.cashBook.order);
        utils.addDebug(currentEntry, "        • Počet záznamov v pokladni (výnosy subdodávky): " + (cashBookRecords ? cashBookRecords.length : 0));

        if (cashBookRecords && cashBookRecords.length > 0) {
            for (var i = 0; i < cashBookRecords.length; i++) {
                var cashRecord = cashBookRecords[i];
                var purpose = utils.safeGet(cashRecord, "Účel výdaja", "");

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
        var cashBookRecords = currentEntry.linksFrom(CONFIG.libraries.cashBook, CONFIG.fields.cashBook.order);
        if (cashBookRecords && cashBookRecords.length > 0) {
            for (var i = 0; i < cashBookRecords.length; i++) {
                var cashRecord = cashBookRecords[i];
                var purpose = utils.safeGet(cashRecord, "Účel výdaja", "");

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

function calculateTransportRevenue(linkedData, revenue) {
    try {
        
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
        baseAmount += revenue.work || 0;
        
        // Materiál
        baseAmount += revenue.material || 0;
        
        // Stroje
        baseAmount += revenue.machinery || 0;
        
        // Subdodávky
        baseAmount += revenue.subcontractors || 0;
        
        // Ostatné
        baseAmount += revenue.other || 0;
        
        // Vypočítaj % z celkovej sumy
        var percentage = rateRidePrice / 100; // Konvertuj na desatinné číslo
        var total = baseAmount * percentage;
        
        utils.addDebug(currentEntry, "      • " + rateRidePrice +"% zo zákazky: " + utils.formatMoney(baseAmount) + " = " + utils.formatMoney(total));
        utils.addDebug(currentEntry, "        - Práce: " + revenue.work + " €");
        utils.addDebug(currentEntry, "        - Materiál: " + revenue.material + " €");
        utils.addDebug(currentEntry, "        - Stroje: " + revenue.machinery + " €");
        utils.addDebug(currentEntry, "        - Subdodávky: " + revenue.subcontractors + " €");
        utils.addDebug(currentEntry, "        - Ostatné: " + revenue.other + " €");
        
        return {
          amount: total
        };
        
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
        info += "• Čisté mzdy: " + utils.formatMoney(utils.safeGet(currentEntry, CONFIG.fields.order.wageCosts, 0)) + "\n";
        info += "• Mzdy odvody: " + utils.formatMoney(utils.safeGet(currentEntry, CONFIG.fields.order.wageDeductions, 0)) + "\n";
        info += "• Náklady práce (superhrubá): " + utils.formatMoney(costs.work) + "\n\n";
        
        // Súhrn dopravy
        info += "🚗 DOPRAVA\n";
        info += "─────────────────────────────\n";
        info += "• Počet jázd: " + linkedData.rideLog.records.length + "\n";
        info += "• Najazdené km: " + linkedData.rideLog.totalKm.toFixed(2) + " km\n";
        info += "• Hodiny v aute: " + linkedData.rideLog.totalTime.toFixed(2) + " h\n";
        info += "• Náklady dopravy: " + utils.formatMoney(costs.transport) + "\n\n";
        
        // Náklady
        info += "💸 NÁKLADY\n";
        info += "─────────────────────────────\n";
        info += "• Práce (superhrubá): " + utils.formatMoney(costs.work) + "\n";
        info += "• Doprava: " + utils.formatMoney(costs.transport) + "\n";
        info += "• Stroje: " + utils.formatMoney(costs.machinery) + "\n";
        info += "• Materiál: " + utils.formatMoney(costs.material) + "\n";
        info += "• Subdodávky: " + utils.formatMoney(costs.subcontractors) + "\n";
        info += "• Ostatné: " + utils.formatMoney(costs.other) + "\n";
        info += "• CELKOM: " + utils.formatMoney(costs.total) + "\n\n";
        
        // Výnosy
        info += "💰 VÝNOSY\n";
        info += "─────────────────────────────\n";
        info += "• Práce: " + utils.formatMoney(revenue.work) + "\n";
        info += "• Doprava: " + utils.formatMoney(revenue.transport) + "\n";
        info += "• Stroje: " + utils.formatMoney(revenue.machinery) + "\n";
        info += "• Materiál: " + utils.formatMoney(revenue.material) + "\n";
        info += "• Subdodávky: " + utils.formatMoney(revenue.subcontractors) + "\n";
        info += "• Ostatné: " + utils.formatMoney(revenue.other) + "\n";
        info += "• CELKOM: " + utils.formatMoney(revenue.total) + "\n\n";
        
        // Ziskovosť
        info += "📊 ZISKOVOSŤ\n";
        info += "─────────────────────────────\n";
        info += "• Hrubý zisk: " + utils.formatMoney(profit.grossProfit || (revenue.total - costs.total)) + "\n";
        info += "• Marža: " + (profit.grossMargin || ((revenue.total - costs.total) / revenue.total * 100)).toFixed(2) + "%\n";
        info += "• DPH k odvodu: " + utils.formatMoney(revenue.totalVat) + "\n";
        info += "• DPH odpočet: " + utils.formatMoney(costs.totalVatDeduction) + "\n";
        info += "• Čistý zisk: " + utils.formatMoney(profit.netProfit || (revenue.total - costs.total)) + "\n";
        info += "• Rentabilita: " + (profit.profitability || ((revenue.total - costs.total) / costs.total * 100)).toFixed(2) + "%\n";
        info += "• Stav: " + ((profit.isProfitable !== undefined ? profit.isProfitable : (revenue.total > costs.total)) ? "✅ ZISKOVÁ" : "❌ STRATOVÁ") + "\n\n";
        
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
        utils.safeSet(currentEntry, CONFIG.fields.order.transportHours, linkedData.rideLog.totalTime.toFixed(2));
        utils.safeSet(currentEntry, CONFIG.fields.order.km, linkedData.rideLog.totalKm.toFixed(2));
        utils.safeSet(currentEntry, CONFIG.fields.order.transportWageCosts, linkedData.rideLog.totalWageCosts);

        // Poznámka: wageCosts a wageDeductions sa ukladajú už v calculateCosts() funkcii

        // VÝNOSY - podľa screenshotov
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueWork, revenue.work);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueWorkVat, revenue.workVat);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueMaterial, revenue.material);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueMaterialVat, revenue.materialVat);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueMmachinery, revenue.machinery);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueMmachineryVat, revenue.machineryVat);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueTransport, revenue.transport);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueTransportVat, revenue.transportVat);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueSubcontractors, revenue.subcontractors);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueSubcontractorsVat, revenue.subcontractorsVat);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueOther, revenue.other);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueOtherVat, revenue.otherVat);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueTotal, revenue.total);
        utils.safeSet(currentEntry, CONFIG.fields.order.revenueTotalVat, revenue.totalVat);

        // NÁKLADY - podľa screenshotov
        utils.safeSet(currentEntry, CONFIG.fields.order.costWork, costs.work);
        utils.safeSet(currentEntry, CONFIG.fields.order.costWorkVatDeduction, costs.workVatDeduction);
        utils.safeSet(currentEntry, CONFIG.fields.order.costMaterial, costs.material);
        utils.safeSet(currentEntry, CONFIG.fields.order.costMaterialVatDeduction, costs.materialVatDeduction);
        utils.safeSet(currentEntry, CONFIG.fields.order.costMachinery, costs.machinery);
        utils.safeSet(currentEntry, CONFIG.fields.order.costMachineryVatDeduction, costs.machineryVatDeduction);
        utils.safeSet(currentEntry, CONFIG.fields.order.costTransport, costs.transport);
        utils.safeSet(currentEntry, CONFIG.fields.order.costTransportVatDeduction, costs.transportVatDeduction);
        utils.safeSet(currentEntry, CONFIG.fields.order.costSubcontractors, costs.subcontractors);
        utils.safeSet(currentEntry, CONFIG.fields.order.costSubcontractorsVatDeduction, costs.subcontractorsVatDeduction);
        utils.safeSet(currentEntry, CONFIG.fields.order.costOther, costs.other);
        utils.safeSet(currentEntry, CONFIG.fields.order.costOtherVatDeduction, costs.otherVatDeduction);
        utils.safeSet(currentEntry, CONFIG.fields.order.costTotal, costs.total);
        utils.safeSet(currentEntry, CONFIG.fields.order.costTotalVatDeduction, costs.totalVatDeduction);
        utils.safeSet(currentEntry, CONFIG.fields.order.costOtherExpenses, costs.otherExpenses);

        // STARÝ ÚDAJ pre kompatibilitu
        utils.safeSet(currentEntry, CONFIG.fields.order.totalBilled, revenue.total + revenue.totalVat);

        // PRIRÁŽKY (ak sú nastavené v poli)
        var subcontractorMarkup = utils.safeGet(currentEntry, CONFIG.fields.order.subcontractorMarkup, 0);
        var otherMarkup = utils.safeGet(currentEntry, CONFIG.fields.order.otherMarkup, 0);

        if (subcontractorMarkup > 0) {
            var markupAmount = revenue.subcontractors * (subcontractorMarkup / 100);
            utils.addDebug(currentEntry, "    • Prirážka subdodávky: " + subcontractorMarkup + "% = " + utils.formatMoney(markupAmount));
        }

        if (otherMarkup > 0) {
            var otherMarkupAmount = revenue.other * (otherMarkup / 100);
            utils.addDebug(currentEntry, "    • Prirážka ostatné: " + otherMarkup + "% = " + utils.formatMoney(otherMarkupAmount));
        }

        // ROZPOČET A ZOSTATOK
        var budget = utils.safeGet(currentEntry, CONFIG.fields.order.budget, 0);
        var spent = revenue.total;
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
// TELEGRAM NOTIFIKÁCIE
// ==============================================

function createTelegramNotification(linkedData, costs, revenue, profit) {
    try {
        utils.addDebug(currentEntry, "  📱 Vytváram Telegram notifikáciu...");

        // 1. Vytvor info_telegram záznam
        var telegramInfoResult = prepareOrderNotificationInfo(linkedData, costs, revenue, profit);
        if (!telegramInfoResult.success) {
            return telegramInfoResult;
        }

        // 2. Odstráň staré notifikácie
        var existingNotifications = utils.getLinkedNotifications(currentEntry);
        if (existingNotifications && existingNotifications.length > 0) {
            utils.addDebug(currentEntry, "  🗑️ Mažem " + existingNotifications.length + " existujúcich notifikácií");
            for (var i = 0; i < existingNotifications.length; i++) {
                utils.deleteNotificationAndTelegram(existingNotifications[i]);
            }
        }

        // 3. Vytvor novú notifikáciu
        var newNotification = utils.createTelegramMessage(currentEntry);
        if (!newNotification.success) {
            utils.addError(currentEntry, "Nepodarilo sa vytvoriť notifikáciu", "createTelegramNotification");
            return { success: false, error: "Chyba pri vytvorení notifikácie" };
        }

        utils.addDebug(currentEntry, "  ✅ Záznam notifikácie úspešne vytvorený");

        // 4. Vytvor inline keyboard
        var recordId = utils.safeGet(currentEntry, CONFIG.fields.common.id);
        var buttons = [
            {
                text: "📊 Detaily",
                callback_data: "order_details_" + recordId
            },
            {
                text: "💰 Ziskovosť",
                callback_data: "order_profit_" + recordId
            }
        ];

        var inlineKeyboard = utils.createInlineKeyboard(buttons, 2);

        // 5. Odošli na Telegram
        var sendResult = utils.sendNotificationEntry(newNotification.notification, inlineKeyboard);

        if (sendResult.success) {
            utils.addDebug(currentEntry, "  🚀 Telegram notifikácia úspešne odoslaná");
            return { success: true, message: "Telegram notifikácia odoslaná úspešne" };
        } else {
            utils.addError(currentEntry, "Nepodarilo sa odoslať notifikáciu na Telegram", "createTelegramNotification");
            return { success: false, error: "Chyba pri odoslaní na Telegram" };
        }

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri vytváraní Telegram notifikácie: " + error.toString(), "createTelegramNotification", error);
        return { success: false, error: error.toString() };
    }
}

function prepareOrderNotificationInfo(linkedData, costs, revenue, profit) {
    try {
        utils.addDebug(currentEntry, "    📝 Pripravujem info_telegram záznam...");

        var orderNumber = utils.safeGet(currentEntry, CONFIG.fields.order.number);
        var orderName = utils.safeGet(currentEntry, CONFIG.fields.order.name);
        var startDate = utils.safeGet(currentEntry, CONFIG.fields.order.startDate);
        var netWages = utils.safeGet(currentEntry, CONFIG.fields.order.wageCosts, 0);
        var wageDeductions = utils.safeGet(currentEntry, CONFIG.fields.order.wageDeductions, 0);
        var status = utils.safeGet(currentEntry, CONFIG.fields.order.status, "Neurčené");

        // HTML formátovaná správa pre Telegram
        var telegramInfo = "📋 <b>ZÁKAZKA - PREPOČET " + orderName.uppercase() +" ㊙️㊙️㊙️</b> 🏗️\n";
        telegramInfo += "═══════════════════════════════════\n\n";

        // Základné info
        telegramInfo += "📦 <b>Zákazka:</b> " + (orderNumber ? "#" + orderNumber + " " : "") + (orderName || "N/A") + "\n";
        if (startDate) {
            telegramInfo += "📅 <b>Dátum začatia:</b> " + utils.formatDate(startDate, "DD.MM.YYYY") + "\n";
        }
        telegramInfo += "📌 <b>Stav:</b> " + status + "\n";
        telegramInfo += "⏰ <b>Prepočet:</b> " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n\n";

        // PRÁCA
        telegramInfo += "👷 <b>PRÁCA</b>\n";
        telegramInfo += "───────────────────────────────────\n";
        telegramInfo += "• Odpracované hodiny: <b>" + linkedData.workRecords.totalHours.toFixed(2) + " h</b>\n";
        telegramInfo += "• Čisté mzdy: " + utils.formatMoney(netWages) + "\n";
        telegramInfo += "• Mzdy odvody: " + utils.formatMoney(wageDeductions) + "\n";
        telegramInfo += "• Náklady práce: <b>" + utils.formatMoney(costs.work) + "</b>\n\n";

        // DOPRAVA
        if (linkedData.rideLog.records.length > 0) {
            telegramInfo += "🚗 <b>DOPRAVA</b>\n";
            telegramInfo += "───────────────────────────────────\n";
            telegramInfo += "• Počet jázd: " + linkedData.rideLog.records.length + "\n";
            telegramInfo += "• Najazdené km: " + linkedData.rideLog.totalKm.toFixed(2) + " km\n";
            telegramInfo += "• Hodiny v aute: " + linkedData.rideLog.totalTime.toFixed(2) + " h\n";
            telegramInfo += "• Náklady dopravy: <b>" + utils.formatMoney(costs.transport) + "</b>\n\n";
        }

        // NÁKLADY SÚHRN
        telegramInfo += "💸 <b>NÁKLADY CELKOM</b>\n";
        telegramInfo += "───────────────────────────────────\n";
        telegramInfo += "• Práce: " + utils.formatMoney(costs.work) + "\n";
        if (costs.transport > 0) telegramInfo += "• Doprava: " + utils.formatMoney(costs.transport) + "\n";
        if (costs.machinery > 0) telegramInfo += "• Stroje: " + utils.formatMoney(costs.machinery) + "\n";
        if (costs.material > 0) telegramInfo += "• Materiál: " + utils.formatMoney(costs.material) + "\n";
        if (costs.subcontractors > 0) telegramInfo += "• Subdodávky: " + utils.formatMoney(costs.subcontractors) + "\n";
        if (costs.other > 0) telegramInfo += "• Ostatné: " + utils.formatMoney(costs.other) + "\n";
        telegramInfo += "• <b>SPOLU: " + utils.formatMoney(costs.total) + "</b>\n\n";

        // VÝNOSY SÚHRN
        telegramInfo += "💰 <b>VÝNOSY CELKOM</b>\n";
        telegramInfo += "───────────────────────────────────\n";
        telegramInfo += "• Práce: " + utils.formatMoney(revenue.work) + "\n";
        if (revenue.transport > 0) telegramInfo += "• Doprava: " + utils.formatMoney(revenue.transport) + "\n";
        if (revenue.machinery > 0) telegramInfo += "• Stroje: " + utils.formatMoney(revenue.machinery) + "\n";
        if (revenue.material > 0) telegramInfo += "• Materiál: " + utils.formatMoney(revenue.material) + "\n";
        if (revenue.subcontractors > 0) telegramInfo += "• Subdodávky: " + utils.formatMoney(revenue.subcontractors) + "\n";
        if (revenue.other > 0) telegramInfo += "• Ostatné: " + utils.formatMoney(revenue.other) + "\n";
        telegramInfo += "• <b>SPOLU: " + utils.formatMoney(revenue.total) + "</b>\n";
        telegramInfo += "• DPH k odvodu: " + utils.formatMoney(revenue.totalVat) + "\n\n";

        // ZISKOVOSŤ
        var grossProfit = revenue.total - costs.total;
        var profitMargin = revenue.total > 0 ? (grossProfit / revenue.total * 100) : 0;
        var isProfitable = grossProfit > 0;

        telegramInfo += "📊 <b>ZISKOVOSŤ</b>\n";
        telegramInfo += "───────────────────────────────────\n";
        telegramInfo += "• Hrubý zisk: <b>" + (grossProfit >= 0 ? "+" : "") + utils.formatMoney(grossProfit) + "</b>\n";
        telegramInfo += "• Marža: <b>" + profitMargin.toFixed(2) + "%</b>\n";
        telegramInfo += "• Stav: " + (isProfitable ? "✅ <b>ZISKOVÁ</b>" : "❌ <b>STRATOVÁ</b>") + "\n\n";

        // DPH info
        if (revenue.totalVat > 0 || costs.totalVatDeduction > 0) {
            telegramInfo += "🧾 <b>DPH</b>\n";
            telegramInfo += "───────────────────────────────────\n";
            telegramInfo += "• K odvodu: " + utils.formatMoney(revenue.totalVat) + "\n";
            telegramInfo += "• Odpočet: " + utils.formatMoney(costs.totalVatDeduction) + "\n";
            var dphSaldo = revenue.totalVat - costs.totalVatDeduction;
            telegramInfo += "• Saldo: <b>" + (dphSaldo >= 0 ? "+" : "") + utils.formatMoney(dphSaldo) + "</b>\n\n";
        }

        telegramInfo += "🔧 <i>Script: " + CONFIG.scriptName + " v" + CONFIG.version + "</i>\n";
        telegramInfo += "📝 <i>Záznam #" + currentEntry.field("ID") + "</i>";

        // Ulož do poľa info_telegram
        utils.safeSet(currentEntry, CONFIG.fields.common.infoTelegram, telegramInfo);

        utils.addDebug(currentEntry, "    ✅ Info_telegram záznam vytvorený");

        return {
            success: true,
            message: "Telegram info vytvorené úspešne"
        };

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri príprave telegram info: " + error.toString(), "prepareOrderNotificationInfo", error);
        return {
            success: false,
            error: error.toString()
        };
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
            var totalCosts = utils.safeGet(currentEntry, CONFIG.fields.order.costTotal, 0);
            var totalRevenue = utils.safeGet(currentEntry, CONFIG.fields.order.revenueTotal, 0);
            var totalRevenueVat = utils.safeGet(currentEntry, CONFIG.fields.order.revenueTotalVat, 0);
            var totalBilled = totalRevenue + totalRevenueVat;
            var netWages = utils.safeGet(currentEntry, CONFIG.fields.order.wageCosts, 0);
            var wageDeductions = utils.safeGet(currentEntry, CONFIG.fields.order.wageDeductions, 0);

            var profit = totalRevenue - totalCosts;
            var profitPercent = totalCosts > 0 ? ((profit / totalCosts) * 100).toFixed(2) : 0;

            var summaryMsg = "✅ PREPOČET DOKONČENÝ\n\n";
            summaryMsg += "📦 " + orderName + "\n";
            summaryMsg += "━━━━━━━━━━━━━━━━━━━━━\n";
            summaryMsg += "👥 Čisté mzdy: " + utils.formatMoney(netWages) + "\n";
            summaryMsg += "📊 Mzdy odvody: " + utils.formatMoney(wageDeductions) + "\n";
            summaryMsg += "💸 Náklady celkom: " + utils.formatMoney(totalCosts) + "\n";
            summaryMsg += "💰 Výnosy: " + utils.formatMoney(totalRevenue) + " + DPH " + utils.formatMoney(totalRevenueVat) + "\n";
            summaryMsg += "📊 Zisk: " + utils.formatMoney(profit) + " (" + profitPercent + "%)\n";

            // Pridaj informáciu o telegram
            if (steps.step8 && steps.step8.success) {
                summaryMsg += "🚀 Telegram notifikácia odoslaná\n";
            }

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