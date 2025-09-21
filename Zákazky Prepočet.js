// ==============================================
// MEMENTO DATABASE - ZÁKAZKY PREPOČET
// Verzia: 1.0 | Dátum: September 2025 | Autor: ASISTANTO
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
    version: "1.0",
    
    // Referencie na centrálny config
    fields: {
        order: centralConfig.fields.order,
        attendance: centralConfig.fields.attendance,
        workRecord: centralConfig.fields.workRecord,
        rideLog: centralConfig.fields.rideLog,
        rideReport: centralConfig.fields.rideReport,
        workReport: centralConfig.fields.workReport,
        cashBook: centralConfig.fields.cashBook,
        common: centralConfig.fields.common
    },
    
    libraries: centralConfig.libraries,
    icons: centralConfig.icons,
    
    // Lokálne nastavenia pre tento script
    settings: {
        calculateVAT: true,
        defaultVATRate: 0.20 // 20% DPH
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, "=== ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===", "start");
        utils.addDebug(currentEntry, "⏰ Čas spustenia: " + moment().format("DD.MM.YYYY HH:mm:ss"));
        
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
// ZBIERANIE LINKOVANÝCH DÁT
// ==============================================

function collectLinkedRecordsData() {
    var data = {
        attendance: {
            records: [],
            totalDays: 0,
            totalHours: 0,
            totalWageCosts: 0,
            totalDowntime: 0
        },
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
        }
    };
    
    try {
        utils.addDebug(currentEntry, "  🔍 Hľadám linkované záznamy...");
        
        // DOCHÁDZKA - linksFrom
        var attendanceRecords = currentEntry.linksFrom(CONFIG.libraries.attendance, CONFIG.fields.workRecord.customer);
        if (attendanceRecords && attendanceRecords.length > 0) {
            data.attendance.records = attendanceRecords;
            data.attendance.totalDays = attendanceRecords.length;
            
            for (var i = 0; i < attendanceRecords.length; i++) {
                var att = attendanceRecords[i];
                var hours = utils.safeGet(att, CONFIG.fields.attendance.workedHours, 0);
                var wageCosts = utils.safeGet(att, CONFIG.fields.attendance.wageCosts, 0);
                var downtime = utils.safeGet(att, CONFIG.fields.attendance.downTime, 0);
                
                data.attendance.totalHours += hours;
                data.attendance.totalWageCosts += wageCosts;
                data.attendance.totalDowntime += downtime;
            }
        }
        utils.addDebug(currentEntry, "    • Dochádzka: " + data.attendance.records.length + " záznamov");
        
        // ZÁZNAM PRÁC - linksFrom
        var workRecords = currentEntry.linksFrom(CONFIG.libraries.workRecords, CONFIG.fields.workRecord.customer);
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
        
        // VÝKAZ PRÁC - linksFrom
        var workReports = currentEntry.linksFrom(CONFIG.libraries.workReport, CONFIG.fields.workReport.zakazka);
        if (workReports && workReports.length > 0) {
            data.workReports.records = workReports;
            
            for (var m = 0; m < workReports.length; m++) {
                var report = workReports[m];
                var totalHours = utils.safeGet(report, CONFIG.fields.workReport.totalHours, 0);
                var hzsSum = utils.safeGet(report, CONFIG.fields.workReport.hzsSum, 0);
                
                data.workReports.totalHours += totalHours;
                data.workReports.totalSum += hzsSum;
            }
        }
        utils.addDebug(currentEntry, "    • Výkaz prác: " + data.workReports.records.length + " záznamov");
        
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
        wageCosts: 0,          // Mzdové náklady
        transportCosts: 0,     // Náklady na dopravu
        materialCosts: 0,      // Náklady na materiál
        otherCosts: 0,         // Ostatné náklady
        totalCosts: 0,         // Celkové náklady
        vatAmount: 0           // DPH odvod
    };
    
    try {
        utils.addDebug(currentEntry, "  💸 Počítam náklady...");
        
        // Mzdové náklady
        costs.wageCosts = linkedData.attendance.totalWageCosts + 
                         linkedData.workRecords.totalWageCosts + 
                         linkedData.rideLog.totalWageCosts;
        
        // Dopravné náklady
        costs.transportCosts = linkedData.rideLog.totalFuelCosts;
        
        // Materiálové náklady z pokladne
        costs.materialCosts = linkedData.cashBook.materialCosts;
        
        // Ostatné náklady
        costs.otherCosts = linkedData.cashBook.otherCosts;
        
        // Celkové náklady
        costs.totalCosts = costs.wageCosts + costs.transportCosts + 
                          costs.materialCosts + costs.otherCosts;
        
        // DPH odvod (ak je aplikovateľné)
        if (CONFIG.settings.calculateVAT) {
            costs.vatAmount = costs.totalCosts * CONFIG.settings.defaultVATRate;
        }
        
        utils.addDebug(currentEntry, "    • Mzdové náklady: " + utils.formatMoney(costs.wageCosts));
        utils.addDebug(currentEntry, "    • Dopravné náklady: " + utils.formatMoney(costs.transportCosts));
        utils.addDebug(currentEntry, "    • Materiálové náklady: " + utils.formatMoney(costs.materialCosts));
        utils.addDebug(currentEntry, "    • Ostatné náklady: " + utils.formatMoney(costs.otherCosts));
        utils.addDebug(currentEntry, "    • NÁKLADY CELKOM: " + utils.formatMoney(costs.totalCosts));
        
        return costs;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "calculateCosts", error);
        return costs;
    }
}

// ==============================================
// VÝPOČET VÝNOSOV
// ==============================================

function calculateRevenue(linkedData) {
    var revenue = {
        workRevenue: 0,        // Výnosy z práce
        transportRevenue: 0,   // Výnosy z dopravy
        materialRevenue: 0,    // Výnosy z materiálu
        otherRevenue: 0,       // Ostatné výnosy
        totalRevenue: 0,       // Celkové výnosy
        totalBilled: 0         // Vyfakturované
    };
    
    try {
        utils.addDebug(currentEntry, "  💰 Počítam výnosy...");
        
        // Výnosy z práce (výkazy prác)
        revenue.workRevenue = linkedData.workReports.totalSum;
        
        // Výnosy z dopravy (výkazy dopravy)
        revenue.transportRevenue = linkedData.rideReports.totalSum;
        
        // Príjmy z pokladne
        revenue.otherRevenue = linkedData.cashBook.totalIncome;
        
        // Celkové výnosy
        revenue.totalRevenue = revenue.workRevenue + revenue.transportRevenue + 
                              revenue.materialRevenue + revenue.otherRevenue;
        
        // Vyfakturované (TODO: pridať po implementácii faktúr)
        revenue.totalBilled = revenue.totalRevenue; // Zatiaľ rovnaké ako výnosy
        
        utils.addDebug(currentEntry, "    • Výnosy z práce: " + utils.formatMoney(revenue.workRevenue));
        utils.addDebug(currentEntry, "    • Výnosy z dopravy: " + utils.formatMoney(revenue.transportRevenue));
        utils.addDebug(currentEntry, "    • Ostatné výnosy: " + utils.formatMoney(revenue.otherRevenue));
        utils.addDebug(currentEntry, "    • VÝNOSY CELKOM: " + utils.formatMoney(revenue.totalRevenue));
        
        return revenue;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "calculateRevenue", error);
        return revenue;
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
        info += "• Dní: " + linkedData.attendance.totalDays + "\n";
        info += "• Odpracované hodiny: " + linkedData.workRecords.totalHours.toFixed(2) + " h\n";
        info += "• Prestoje: " + linkedData.attendance.totalDowntime.toFixed(2) + " h\n";
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
        info += "• Materiál: " + utils.formatMoney(costs.materialCosts) + "\n";
        info += "• Ostatné: " + utils.formatMoney(costs.otherCosts) + "\n";
        info += "• CELKOM: " + utils.formatMoney(costs.totalCosts) + "\n\n";
        
        // Výnosy
        info += "💰 VÝNOSY\n";
        info += "─────────────────────────────\n";
        info += "• Práce: " + utils.formatMoney(revenue.workRevenue) + "\n";
        info += "• Doprava: " + utils.formatMoney(revenue.transportRevenue) + "\n";
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
        utils.addDebug(currentEntry, "  💾 Ukladám vypočítané hodnoty...");
        
        // Počty a hodiny
        utils.safeSet(currentEntry, CONFIG.fields.order.daysCount, linkedData.attendance.totalDays);
        utils.safeSet(currentEntry, CONFIG.fields.order.hoursCount, linkedData.workRecords.totalHours);
        utils.safeSet(currentEntry, CONFIG.fields.order.transportCounts, linkedData.rideLog.records.length);
        utils.safeSet(currentEntry, CONFIG.fields.order.transportHours, linkedData.rideLog.totalTime);
        utils.safeSet(currentEntry, CONFIG.fields.order.km, linkedData.rideLog.totalKm);
        
        // Náklady
        utils.safeSet(currentEntry, CONFIG.fields.order.wageCosts, costs.wageCosts);
        utils.safeSet(currentEntry, CONFIG.fields.order.transportCosts, costs.transportCosts);
        utils.safeSet(currentEntry, CONFIG.fields.order.materialCosts, costs.materialCosts);
        utils.safeSet(currentEntry, CONFIG.fields.order.workCosts, linkedData.workRecords.totalWageCosts);
        utils.safeSet(currentEntry, CONFIG.fields.order.otherCosts, costs.otherCosts);
        utils.safeSet(currentEntry, CONFIG.fields.order.totalCosts, costs.totalCosts);
        
        // Mzdové náklady detailne
        utils.safeSet(currentEntry, CONFIG.fields.order.transportWageCosts, linkedData.rideLog.totalWageCosts);
        
        // Výnosy a vyúčtovanie
        utils.safeSet(currentEntry, CONFIG.fields.order.workHoursTotal, linkedData.workRecords.totalHours);
        utils.safeSet(currentEntry, CONFIG.fields.order.workReportTotal, revenue.workRevenue);
        utils.safeSet(currentEntry, CONFIG.fields.order.transportTotal, revenue.transportRevenue);
        utils.safeSet(currentEntry, CONFIG.fields.order.transportReportTotal, revenue.transportRevenue);
        utils.safeSet(currentEntry, CONFIG.fields.order.totalBilled, revenue.totalBilled);
        
        // DPH
        if (CONFIG.settings.calculateVAT) {
            utils.safeSet(currentEntry, CONFIG.fields.order.transportVat, costs.transportCosts * CONFIG.settings.defaultVATRate);
            utils.safeSet(currentEntry, CONFIG.fields.order.materialVat, costs.materialCosts * CONFIG.settings.defaultVATRate);
            utils.safeSet(currentEntry, CONFIG.fields.order.workVat, costs.wageCosts * CONFIG.settings.defaultVATRate);
            utils.safeSet(currentEntry, CONFIG.fields.order.otherVat, costs.otherCosts * CONFIG.settings.defaultVATRate);
        }
        
        // Rozpočet a zostatok
        var budget = utils.safeGet(currentEntry, CONFIG.fields.order.budget, 0);
        var spent = costs.totalCosts;
        var remaining = budget - spent;
        
        utils.safeSet(currentEntry, CONFIG.fields.order.spent, spent);
        utils.safeSet(currentEntry, CONFIG.fields.order.remaining, remaining);
        
        // Nastavenie farieb podľa stavu
        if (profit.isProfitable) {
            utils.setColor(currentEntry, "fg", "green");
            utils.setColor(currentEntry, "bg", "pastel green");
        } else {
            utils.setColor(currentEntry, "fg", "red");
            utils.setColor(currentEntry, "bg", "pastel red");
        }
        
        utils.addDebug(currentEntry, "  ✅ Hodnoty uložené");
        
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