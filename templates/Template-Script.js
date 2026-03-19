// ==============================================
// TEMPLATE SCRIPT - Vzorová štruktúra pre Memento scripty
// Verzia: 9.0.0 | Dátum: 2026-03-19 | Autor: ASISTANTO
// Knižnica: [NÁZOV KNIŽNICE] | Trigger: Before Save
// ==============================================
// 📋 FUNKCIA:
//    - Vzorová štruktúra pre všetky Memento scripty
//    - Štandardizovaná organizácia kódu
//    - Komplexná práca s Memento Framework v8.x
//    - Best practices a error handling
// ==============================================
// 🆕 NOVÉ VO V9.0 (Phase 3/4 - March 2026):
//    - Používa nové focused moduly (Time, Date, Validation, Formatting, Calculations)
//    - Dependency checking cez utils.checkAllDependencies()
//    - Príklady všetkých nových modulov
//    - Migration notes z v7 → v8
//    - MementoTelegram import pattern (nie cez utils)
// ==============================================
// ⚠️ KRITICKÉ: PRED ZAČIATKOM VÝVOJA SCRIPTU:
//    1. Over štruktúru knižnice cez API alebo MCP
//    2. Skontroluj presné názvy polí (case-sensitive, diakritika)
//    3. Over typy polí (Text, Číslo, Dátum, LinkToEntry, atď.)
//    4. Potvrď Library ID ak pristupuješ k iným knižniciam
//
//    Použiť: python memento_api_simple.py --library "Názov" --structure
//    Alebo: MCP nástroje pre API prístup
// ==============================================
// 💡 USER COMMUNICATION BEST PRACTICES:
//
// message() - PRE KRÁTKE SPRÁVY:
//    - Len 2 riadky textu
//    - Zmizne po ~2 sekundách
//    - Použitie: Rýchle notifikácie ("Uložené", "Hotovo")
//    - Príklad: message("✅ Záznam uložený");
//
// dialog() - PRE PODROBNÉ SPRÁVY:
//    - Ľubovoľné množstvo textu
//    - Zostáva až kým užívateľ nezatvorí
//    - Môže obsahovať tlačidlá (OK, Cancel, custom)
//    - Použitie: Výsledky výpočtov, detailné chyby, potvrdenia
//    - Príklad: dialog("Výsledok", "Suma: 120€\nDPH: 20€", "OK");
//
// PRAVIDLO: Ak správa má viac ako 2 riadky alebo potrebuje čas na prečítanie,
//           vždy používaj dialog() namiesto message()!
// ==============================================

// ==============================================
// INICIALIZÁCIA MODULOV A KONFIGURÁCIE
// ==============================================

// Import Memento Framework cez hlavný agregátor
var utils = MementoUtils;
var currentEntry = entry();

// Vytvorenie script-špecifickej konfigurácie
var CONFIG = utils.createScriptConfig("Template Script", "9.0.0");

// Rozšírenie CONFIG o script-špecifické nastavenia
CONFIG.settings = {
    // Pridaj vlastné nastavenia pre script
    enableDebugMode: true,
    maxRetries: 3,
    timeoutSeconds: 30
};

// ==============================================
// VALIDÁCIA ZÁVISLOSTÍ A INICIALIZÁCIA
// ==============================================

/**
 * Kontrola závislostí a inicializácia scriptu
 * @returns {Object} {success: boolean, message: string}
 */
function initializeScript() {
    try {
        // 🆕 NOVÉ: Použitie checkAllDependencies() pre komplexnú validáciu
        // Kontroluje všetky core moduly a ich verzie
        var depCheck = utils.checkAllDependencies();

        if (!depCheck.success) {
            var errorMsg = "Chýbajú potrebné moduly:\n";
            for (var i = 0; i < depCheck.missing.length; i++) {
                errorMsg += "• " + depCheck.missing[i] + "\n";
            }
            if (depCheck.outdated.length > 0) {
                errorMsg += "\nZastarané verzie:\n";
                for (var j = 0; j < depCheck.outdated.length; j++) {
                    errorMsg += "• " + depCheck.outdated[j] + "\n";
                }
            }

            utils.addError(currentEntry, errorMsg, "initializeScript");
            dialog("❌ Chyba závislostí", errorMsg, "OK");
            return { success: false, message: errorMsg };
        }

        // ALTERNATÍVA: Kontrola len špecifických modulov (ak nepotrebuješ všetky)
        // var requiredModules = ['config', 'core', 'time', 'formatting'];
        // var depCheck = utils.checkDependencies(requiredModules);

        // Vyčisti logy zo starých spustení
        utils.clearLogs(currentEntry, true);

        // Hlavičkový log
        utils.addDebug(currentEntry, "=== " + CONFIG.scriptName + " v" + CONFIG.version + " ===", "start");
        utils.addDebug(currentEntry, "Knižnica: " + lib().title);
        utils.addDebug(currentEntry, "Čas spustenia: " + utils.formatDate(moment(), "DD.MM.YYYY HH:mm:ss"));

        // Debug info o načítaných moduloch
        if (CONFIG.settings.enableDebugMode) {
            // 🆕 NOVÉ: Detailed mode zobrazuje verzie všetkých modulov
            utils.debugModules(currentEntry, true);
        }

        return { success: true, message: "Inicializácia úspešná" };

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri inicializácii: " + error.toString(), "initializeScript", error);
        return { success: false, message: error.toString() };
    }
}

// ==============================================
// VALIDÁCIA VSTUPNÝCH DÁT
// ==============================================
// 📋 PRED ZAČIATKOM VÝVOJA:
//    VŽDY si over štruktúru knižnice cez API alebo MCP!
//
//    Prečo?
//    - Názvy polí musia byť PRESNÉ (case-sensitive, slovenské znaky)
//    - Typ poľa ovplyvňuje ako s ním pracuješ (text/number/date/linkToEntry)
//    - Štruktúra knižnice sa mohla zmeniť od poslednej aktualizácie
//
//    Ako overiť:
//    1. Python API: python memento_api_simple.py --library "Názov" --structure
//    2. MCP nástroje: Použiť Google Calendar/Gmail MCP pre API prístup
//    3. Memento UI: Nastavenia knižnice → Polia
//
//    Čo overiť:
//    ✓ Presné názvy všetkých polí (vrátane diakritiky)
//    ✓ Typy polí (Text, Číslo, Dátum, Čas, LinkToEntry, atď.)
//    ✓ Library ID (ak potrebuješ pristupovať k iným knižniciam)
// ==============================================

/**
 * Validácia povinných polí a vstupných dát
 * @returns {Object} {success: boolean, data: Object, error: string}
 */
function validateInputData() {
    try {
        utils.addDebug(currentEntry, "🔍 Validácia vstupných dát", "validation");

        // 🆕 NOVÉ: Použitie utils.validation modulu pre komplexnú validáciu

        // Príklad 1: Validácia času (ak máš TIME field)
        var startTime = utils.safeGet(currentEntry, "Príchod");
        if (startTime) {
            var timeValidation = utils.validation.validateTime(startTime, {
                required: true,
                allowFuture: false,
                maxHours: 24
            });

            if (!timeValidation.valid) {
                utils.addError(currentEntry, "Neplatný čas príchodu: " + timeValidation.error, "validateInputData");
                return {
                    success: false,
                    error: "Neplatný čas príchodu: " + timeValidation.error,
                    data: null
                };
            }
        }

        // Príklad 2: Validácia dátumu (ak máš DATE field)
        var workDate = utils.safeGet(currentEntry, "Dátum");
        if (workDate) {
            var dateValidation = utils.validation.validateDate(workDate, {
                required: true,
                allowFuture: false,
                minDate: moment().subtract(1, 'year').toDate()
            });

            if (!dateValidation.valid) {
                utils.addError(currentEntry, "Neplatný dátum: " + dateValidation.error, "validateInputData");
                return {
                    success: false,
                    error: "Neplatný dátum: " + dateValidation.error,
                    data: null
                };
            }
        }

        // Príklad 3: Validácia povinných polí (klasický spôsob)
        var requiredFields = ["Dátum", "ID"];
        var requiredValidation = utils.validation.validateRequired(currentEntry, requiredFields);

        if (!requiredValidation.valid) {
            utils.addError(currentEntry, "Chýbajú povinné polia", "validateInputData");
            dialog("❌ Chyba validácie",
                   "Chýbajú povinné polia:\n" + requiredValidation.missing.join(", "),
                   "OK");
            return {
                success: false,
                error: "Chýbajú povinné polia: " + requiredValidation.missing.join(", "),
                data: null
            };
        }

        // Získaj validované dáta
        var data = {
            id: utils.safeGet(currentEntry, CONFIG.fields.common.id),
            date: workDate,
            startTime: startTime,
            // Pridaj ďalšie polia ktoré potrebuješ
        };

        // 🆕 NOVÉ: Validácia číselných hodnôt
        var amount = utils.safeGet(currentEntry, "Suma");
        if (amount !== null) {
            var numberValidation = utils.validation.validateNumber(amount, {
                min: 0,
                max: 1000000,
                allowNegative: false
            });

            if (!numberValidation.valid) {
                return {
                    success: false,
                    error: "Neplatná suma: " + numberValidation.error,
                    data: null
                };
            }
            data.amount = amount;
        }

        utils.addDebug(currentEntry, "✅ Validácia úspešná", "success");
        utils.addDebug(currentEntry, "  • ID záznamu: " + data.id);
        if (data.date) {
            utils.addDebug(currentEntry, "  • Dátum: " + utils.formatting.formatDate(data.date, "DD.MM.YYYY"));
        }

        return {
            success: true,
            data: data,
            error: null
        };

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri validácii: " + error.toString(), "validateInputData", error);
        return {
            success: false,
            error: error.toString(),
            data: null
        };
    }
}

// ==============================================
// HLAVNÉ BUSINESS FUNKCIE
// ==============================================

/**
 * Hlavná business logika scriptu
 * @param {Object} validatedData - Validované vstupné dáta
 * @returns {Object} {success: boolean, result: Object, error: string}
 */
function processBusinessLogic(validatedData) {
    try {
        utils.addDebug(currentEntry, "⚙️ Spracovanie business logiky", "calculation");

        var result = {
            processed: 0,
            created: 0,
            updated: 0,
            errors: 0,
            details: [],
            totalWage: 0,
            totalHours: 0
        };

        // 🆕 NOVÉ: Použitie utils.date modulu pre dátumové operácie
        if (validatedData.date) {
            var isWeekend = utils.date.isWeekend(validatedData.date);
            var isHoliday = utils.date.isHoliday(validatedData.date);
            var weekNumber = utils.date.getWeekNumber(validatedData.date);

            utils.addDebug(currentEntry, "📅 Dátum analýza:");
            utils.addDebug(currentEntry, "  • Víkend: " + (isWeekend ? "ÁNO" : "NIE"));
            utils.addDebug(currentEntry, "  • Sviatok: " + (isHoliday ? "ÁNO" : "NIE"));
            utils.addDebug(currentEntry, "  • Týždeň: " + weekNumber);

            // Príklad: Víkendový príplatok
            if (isWeekend || isHoliday) {
                utils.addDebug(currentEntry, "  ⚠️ Platí víkendový/sviatočný príplatok!");
            }
        }

        // Príklad: Spracovanie zamestnancov
        var employees = utils.safeGetLinks(currentEntry, CONFIG.fields.attendance?.employees || "Zamestnanci");

        if (employees && employees.length > 0) {
            utils.addDebug(currentEntry, "👥 Spracovávam " + employees.length + " zamestnancov");

            for (var i = 0; i < employees.length; i++) {
                var employee = employees[i];
                var empResult = processEmployee(employee, i, validatedData);

                if (empResult.success) {
                    result.processed++;
                    result.details.push(empResult.data);
                    result.totalWage += empResult.data.wage || 0;
                    result.totalHours += empResult.data.hours || 0;
                } else {
                    result.errors++;
                    utils.addError(currentEntry,
                        "Chyba pri spracovaní zamestnanca #" + (i + 1) + ": " + empResult.error,
                        "processBusinessLogic");
                }
            }
        }

        // 🆕 NOVÉ: Formátovanie výsledkov pomocou utils.formatting
        var formattedWage = utils.formatting.formatMoney(result.totalWage);
        var formattedHours = utils.formatting.formatDuration(result.totalHours);

        // Ulož výsledky do poľa
        var summary = "Spracované: " + result.processed + ", Chyby: " + result.errors + "\n";
        summary += "Celkom hodín: " + formattedHours + "\n";
        summary += "Celková mzda: " + formattedWage;

        utils.safeSet(currentEntry, CONFIG.fields.common.info, summary);

        utils.addDebug(currentEntry, "✅ Business logika dokončená", "success");
        utils.addDebug(currentEntry, "  • Spracované: " + result.processed);
        utils.addDebug(currentEntry, "  • Celkom hodín: " + formattedHours);
        utils.addDebug(currentEntry, "  • Celková mzda: " + formattedWage);

        return {
            success: result.errors === 0,
            result: result,
            error: result.errors > 0 ? "Niektoré operácie zlyhali" : null
        };

    } catch (error) {
        utils.addError(currentEntry, "Chyba v business logike: " + error.toString(), "processBusinessLogic", error);
        return {
            success: false,
            result: null,
            error: error.toString()
        };
    }
}

/**
 * Spracovanie jednotlivého zamestnanca
 * @param {Object} employee - Entry objekt zamestnanca
 * @param {number} index - Index v poli
 * @param {Object} context - Kontextové dáta
 * @returns {Object} {success: boolean, data: Object, error: string}
 */
function processEmployee(employee, index, context) {
    try {
        // 🆕 NOVÉ: Použitie utils.formatting pre formátovanie mena
        var empName = utils.formatting.formatEmployeeName(employee);
        utils.addDebug(currentEntry, "  [" + (index + 1) + "] Spracovávam: " + empName, "person");

        // Konkrétna logika pre zamestnanca
        var empData = {
            name: empName,
            id: employee.field("ID")
        };

        // 🆕 NOVÉ: Výpočet pracovných hodín pomocí utils.time
        var startTime = utils.safeGet(currentEntry, "Príchod");
        var endTime = utils.safeGet(currentEntry, "Odchod");

        if (startTime && endTime) {
            // Zaokrúhlenie časov na 15-minútové intervaly
            var roundedStart = utils.time.roundToQuarterHour(startTime, "nearest");
            var roundedEnd = utils.time.roundToQuarterHour(endTime, "nearest");

            // Výpočet odpracovaných hodín
            var workHoursResult = utils.time.calculateHoursDifference(roundedStart, roundedEnd, {
                roundQuarters: false,  // už sme zaokrúhlili
                includeBreak: true,
                breakDuration: 30  // 30 minút prestávka
            });

            empData.hours = workHoursResult.decimalHours;
            empData.crossesMidnight = workHoursResult.crossesMidnight;

            utils.addDebug(currentEntry, "    • Hodiny: " + utils.formatting.formatDuration(empData.hours));
            if (workHoursResult.crossesMidnight) {
                utils.addDebug(currentEntry, "    ⚠️ Nočná zmena (cez polnoc)");
            }
        }

        // 🆕 NOVÉ: Výpočet mzdy pomocou utils.calculations
        var hourlyRate = utils.findValidHourlyRate(employee, context.date || new Date());
        if (hourlyRate && empData.hours) {
            var wageResult = utils.calculations.calculateDailyWage(empData.hours, hourlyRate, {
                standardHours: 8,
                overtimeMultiplier: 1.25,
                weekendBonus: utils.date.isWeekend(context.date) ? 1.5 : 1.0
            });

            empData.hourlyRate = hourlyRate;
            empData.wage = wageResult.wage;
            empData.regularWage = wageResult.regularWage;
            empData.overtimeWage = wageResult.overtimeWage;

            // 🆕 NOVÉ: Výpočet nadčasov
            if (empData.hours > 8) {
                var overtimeResult = utils.calculations.calculateOvertime(empData.hours, 8, hourlyRate);
                empData.overtimeHours = overtimeResult.overtimeHours;

                utils.addDebug(currentEntry, "    • Nadčasy: " +
                    utils.formatting.formatDuration(overtimeResult.overtimeHours));
            }

            utils.addDebug(currentEntry, "    • Hodinovka: " +
                utils.formatting.formatMoney(hourlyRate));
            utils.addDebug(currentEntry, "    • Mzda: " +
                utils.formatting.formatMoney(empData.wage));
        }

        return {
            success: true,
            data: empData,
            error: null
        };

    } catch (error) {
        return {
            success: false,
            data: null,
            error: error.toString()
        };
    }
}

// ==============================================
// TELEGRAM NOTIFIKÁCIE
// ==============================================
// ⚠️ DÔLEŽITÉ: MementoTelegram NIE JE v MementoUtils (circular dependency)
// Musí byť importovaný priamo!
//
// 🆕 NOVÉ: Phase 2 - MementoTelegram oddelený od MementoUtils

/**
 * Vytvorenie a odoslanie Telegram notifikácie
 * @param {Object} processResult - Výsledky spracovania
 * @returns {Object} {success: boolean, message: string}
 */
function createTelegramNotification(processResult) {
    try {
        // KROK 1: Import MementoTelegram priamo (NIE cez utils!)
        var telegram = typeof MementoTelegram !== 'undefined' ? MementoTelegram : null;

        if (!telegram) {
            utils.addDebug(currentEntry, "⚠️ MementoTelegram nie je dostupný", "warning");
            return { success: false, message: "Telegram modul nie je načítaný" };
        }

        utils.addDebug(currentEntry, "📱 Vytváram Telegram notifikáciu", "telegram");

        // Kontrola povolení pre notifikácie
        var libraryName = lib().title;
        var libraryConfig = CONFIG.libraryMapping?.[libraryName];

        if (!libraryConfig) {
            utils.addDebug(currentEntry, "ℹ️ Knižnica nie je nakonfigurovaná pre notifikácie");
            return { success: true, message: "Notifikácie nie sú nakonfigurované" };
        }

        if (!utils.checkPermissions(libraryConfig.permissionField)) {
            utils.addDebug(currentEntry, "ℹ️ Notifikácie sú vypnuté");
            return { success: true, message: "Notifikácie sú vypnuté" };
        }

        // KROK 2: Vytvorenie Telegram správy
        var telegramMessage = createTelegramMessage(processResult);

        // Uloženie do info_telegram poľa
        utils.safeSet(currentEntry, CONFIG.fields.common.infoTelegram, telegramMessage);

        // KROK 3: Vytvorenie notifikácie (použiť telegram, NIE utils!)
        var notificationResult = telegram.createTelegramMessage(currentEntry);

        if (notificationResult.success) {
            utils.addDebug(currentEntry, "✅ Notifikácia vytvorená", "success");

            // KROK 4: Vytvorenie inline keyboard (použiť telegram, NIE utils!)
            var keyboard = telegram.createInlineKeyboard([
                { text: "✅ OK", callback_data: "ok_" + currentEntry.field("ID") },
                { text: "❓ Info", callback_data: "info_" + currentEntry.field("ID") }
            ], 2);

            // KROK 5: Odoslanie na Telegram (použiť telegram, NIE utils!)
            var sendResult = telegram.sendNotificationEntry(notificationResult.notification, keyboard);

            if (sendResult.success) {
                utils.addDebug(currentEntry, "✅ Notifikácia odoslaná na Telegram", "success");
                return { success: true, message: "Notifikácia úspešne odoslaná" };
            } else {
                utils.addError(currentEntry, "Nepodarilo sa odoslať notifikáciu", "createTelegramNotification");
                return { success: false, message: "Odoslanie notifikácie zlyhalo" };
            }
        } else {
            utils.addError(currentEntry, "Nepodarilo sa vytvoriť notifikáciu", "createTelegramNotification");
            return { success: false, message: "Vytvorenie notifikácie zlyhalo" };
        }

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri Telegram notifikácii: " + error.toString(), "createTelegramNotification", error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Vytvorenie textu Telegram správy
 * @param {Object} data - Dáta pre správu
 * @returns {string} Formátovaná Telegram správa
 */
function createTelegramMessage(data) {
    var message = "📋 **" + CONFIG.scriptName.toUpperCase() + "**\n\n";

    // 🆕 NOVÉ: Použitie utils.formatting pre dátum a čas
    message += "📅 Dátum: " + utils.formatting.formatDate(new Date(), "DD.MM.YYYY") + "\n";
    message += "🕐 Čas: " + utils.formatting.formatTime(new Date()) + "\n\n";

    // Výsledky spracovania
    if (data && data.result) {
        message += "📊 **VÝSLEDKY:**\n";
        message += "• Spracované: " + data.result.processed + "\n";

        if (data.result.totalHours > 0) {
            message += "• Celkom hodín: " + utils.formatting.formatDuration(data.result.totalHours) + "\n";
        }
        if (data.result.totalWage > 0) {
            message += "• Celková mzda: " + utils.formatting.formatMoney(data.result.totalWage) + "\n";
        }

        message += "• Chyby: " + data.result.errors + "\n\n";
    }

    // Detaily
    if (data && data.result && data.result.details && data.result.details.length > 0) {
        message += "👥 **DETAILY:**\n";
        for (var i = 0; i < Math.min(3, data.result.details.length); i++) {
            var detail = data.result.details[i];
            message += "• " + detail.name;

            if (detail.hours) {
                message += " - " + utils.formatting.formatDuration(detail.hours);
            }
            if (detail.wage) {
                message += " (" + utils.formatting.formatMoney(detail.wage) + ")";
            }
            message += "\n";
        }

        if (data.result.details.length > 3) {
            message += "• ... a " + (data.result.details.length - 3) + " ďalších\n";
        }
        message += "\n";
    }

    // Technické info
    message += "🔧 Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
    message += "📝 Záznam #" + currentEntry.field("ID");

    return message;
}

// ==============================================
// FINALIZÁCIA A CLEANUP
// ==============================================

/**
 * Finalizácia spracovania a cleanup
 * @param {Array} stepResults - Výsledky všetkých krokov
 * @returns {Object} {success: boolean, summary: string}
 */
function finalizeProcessing(stepResults) {
    try {
        utils.addDebug(currentEntry, "🔚 Finalizácia spracovania", "checkmark");

        // Analýza výsledkov
        var totalSteps = stepResults.length;
        var successfulSteps = 0;
        var failedSteps = [];

        for (var i = 0; i < stepResults.length; i++) {
            var step = stepResults[i];
            if (step.success) {
                successfulSteps++;
            } else {
                failedSteps.push(step.name || "Krok " + (i + 1));
            }
        }

        // Vytvorenie súhrnu
        var summary = "Úspešných krokov: " + successfulSteps + "/" + totalSteps;
        if (failedSteps.length > 0) {
            summary += "\nZlyhané kroky: " + failedSteps.join(", ");
        }

        // Nastavenie farby záznamu
        var allSuccess = failedSteps.length === 0;
        if (allSuccess) {
            utils.setColorByCondition(currentEntry, "success");
            utils.addDebug(currentEntry, "🎉 Všetky kroky úspešné!", "success");
        } else {
            utils.setColorByCondition(currentEntry, "warning");
            utils.addDebug(currentEntry, "⚠️ Niektoré kroky zlyhali", "warning");
        }

        // Uloženie súhrnu
        var infoContent = utils.safeGet(currentEntry, CONFIG.fields.common.info, "");
        var finalInfo = infoContent + "\n\n📊 FINÁLNY SÚHRN:\n" + summary;
        finalInfo += "\n⏰ Dokončené: " + utils.formatDate(moment(), "DD.MM.YYYY HH:mm:ss");

        utils.safeSet(currentEntry, CONFIG.fields.common.info, finalInfo);

        // Log finálneho súhrnu
        utils.addDebug(currentEntry, "\n📊 === FINÁLNY SÚHRN ===");

        for (var j = 0; j < stepResults.length; j++) {
            var stepResult = stepResults[j];
            var status = stepResult.success ? "✅" : "❌";
            var stepName = stepResult.name || "Krok " + (j + 1);
            utils.addDebug(currentEntry, status + " " + stepName);
        }

        utils.addDebug(currentEntry, "\n⏱️ Čas ukončenia: " + moment().format("HH:mm:ss"));
        utils.addDebug(currentEntry, "📋 === KONIEC " + CONFIG.scriptName + " v" + CONFIG.version + " ===");

        return {
            success: allSuccess,
            summary: summary
        };

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri finalizácii: " + error.toString(), "finalizeProcessing", error);
        return {
            success: false,
            summary: "Chyba pri finalizácii: " + error.toString()
        };
    }
}

/**
 * Zobrazenie súhrnu používateľovi
 * @param {Object} finalResult - Finálne výsledky
 */
function showUserSummary(finalResult) {
    try {
        var summaryData = {
            success: finalResult.success,
            date: new Date(),
            errors: finalResult.success ? [] : ["Niektoré kroky zlyhali"]
        };

        // Používaj utils.showProcessingSummary ak je dostupná
        if (typeof utils.showProcessingSummary === 'function') {
            utils.showProcessingSummary(currentEntry, summaryData, CONFIG);
        } else {
            // Fallback na dialog() (NIE message() - potrebujeme viac priestoru!)
            var msg = finalResult.success ?
                "✅ Script úspešne dokončený" :
                "⚠️ Script dokončený s chybami";

            dialog("Výsledok spracovania", msg + "\n\n" + finalResult.summary, "OK");
        }

    } catch (error) {
        message("Script dokončený, ale chyba pri zobrazení súhrnu.");
    }
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

/**
 * Hlavná funkcia scriptu - orchestrácia všetkých krokov
 * @returns {boolean} True ak úspešné, false ak treba zrušiť uloženie
 */
function main() {
    try {
        // Zoznam všetkých krokov pre tracking
        var stepResults = [];

        // KROK 1: Inicializácia
        var initResult = initializeScript();
        stepResults.push({
            name: "Inicializácia",
            success: initResult.success,
            data: initResult
        });

        if (!initResult.success) {
            return false;
        }

        // KROK 2: Validácia vstupných dát
        var validationResult = validateInputData();
        stepResults.push({
            name: "Validácia dát",
            success: validationResult.success,
            data: validationResult
        });

        if (!validationResult.success) {
            utils.addError(currentEntry, "Validácia zlyhala: " + validationResult.error, "main");
            dialog("❌ Chyba validácie", validationResult.error, "OK");
            return false;
        }

        // KROK 3: Hlavná business logika
        var businessResult = processBusinessLogic(validationResult.data);
        stepResults.push({
            name: "Business logika",
            success: businessResult.success,
            data: businessResult
        });

        // KROK 4: Telegram notifikácie
        var telegramResult = createTelegramNotification(businessResult);
        stepResults.push({
            name: "Telegram notifikácie",
            success: telegramResult.success,
            data: telegramResult
        });

        // KROK 5: Finalizácia
        var finalResult = finalizeProcessing(stepResults);

        // Zobrazenie súhrnu používateľovi
        showUserSummary(finalResult);

        return finalResult.success;

    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii: " + error.toString(), "main", error);

        // Nastavenie chybovej farby
        utils.setColorByCondition(currentEntry, "error");

        dialog("❌ Kritická chyba!",
               error.toString() + (error.lineNumber ? "\n\nRiadok: " + error.lineNumber : ""),
               "OK");

        return false;
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

// Kontrola či už nie je spustený
if (typeof window === 'undefined' || !window.scriptRunning) {
    if (typeof window !== 'undefined') {
        window.scriptRunning = true;
    }

    try {
        // Spustenie hlavnej funkcie
        var result = main();

        // Ak hlavná funkcia zlyhala, zruš uloženie
        if (!result) {
            utils.addError(currentEntry, "Script zlyhal - zrušené uloženie", "main");
            cancel();
        }

    } finally {
        // Cleanup
        if (typeof window !== 'undefined') {
            window.scriptRunning = false;
        }
    }
} else {
    utils.addDebug(currentEntry, "Script už beží - preskakujem spustenie");
}

// ==============================================
// MIGRATION NOTES: V7 → V8
// ==============================================

/*
🆕 ČO JE NOVÉ VO V8.0 (Phase 3/4 - March 2026):

1. NOVÉ FOCUSED MODULY:
   - utils.time - Time operations (roundToQuarterHour, calculateHoursDifference)
   - utils.date - Slovak calendar (isWeekend, isHoliday, getWeekNumber)
   - utils.validation - Validation patterns (validateTime, validateDate, validateRequired)
   - utils.formatting - Formatters (formatMoney, formatDuration, formatDate)
   - utils.calculations - Business calculations (calculateDailyWage, calculateOvertime)

2. DEPENDENCY CHECKING:
   - utils.checkAllDependencies() - Komplexná kontrola všetkých modulov
   - utils.checkDependencies(['time', 'formatting']) - Kontrola špecifických modulov
   - utils.debugModules(entry, true) - Detailed mode s verziami

3. MEMENTOTELEGRAM PATTERN:
   - NIE JE v MementoUtils (circular dependency fixed)
   - Musí byť importovaný priamo: var telegram = typeof MementoTelegram !== 'undefined' ? MementoTelegram : null;

4. BREAKING CHANGES:
   - MementoBusiness zredukovaný z 3,942 na 1,050 lines
   - Utility funkcie presunuté do focused modulov
   - Staré funkcie stále fungujú cez backward compatibility facade

MIGRATION EXAMPLE:

// STARÉ (v7) - stále funguje ale deprecated:
var rounded = utils.roundToQuarterHour(time, "nearest");
var formatted = utils.formatMoney(1250);

// NOVÉ (v8) - preferred pattern:
var rounded = utils.time.roundToQuarterHour(time, "nearest");
var formatted = utils.formatting.formatMoney(1250);

// VALIDÁCIA:
// STARÉ (v7):
var valid = utils.validateRequiredFields(entry, ["Dátum", "ID"]);

// NOVÉ (v8) - viac kontroly:
var result = utils.validation.validateRequired(entry, ["Dátum", "ID"]);
if (!result.valid) {
    console.log("Chýbajú: " + result.missing.join(", "));
}

// VÝPOČTY:
// STARÉ (v7) - priamo cez utils:
var wage = utils.calculateDailyWage(employee, hours, date);

// NOVÉ (v8) - cez calculations modul:
var wageResult = utils.calculations.calculateDailyWage(hours, rate, {
    standardHours: 8,
    overtimeMultiplier: 1.25
});
console.log("Mzda:", wageResult.wage);
console.log("Nadčasy:", wageResult.overtimeWage);

PRE VIAC INFORMÁCIÍ:
- docs/CORE_MODULES_AGGREGATION.md - Čo je agregované v MementoUtils
- docs/CORE_MODULES_DOCUMENTATION.md - Kompletná API dokumentácia
- docs/CORE_MODULES_QUICK_REFERENCE.md - Rýchly referenčný sprievodca
*/

// ==============================================
// DOKUMENTÁCIA A POZNÁMKY
// ==============================================

/*
POUŽITIE TOHTO TEMPLATE:

1. PREMENUJ SÚBOR:
   Template-Script.js → YourScript.js

2. UPRAVTE HLAVIČKU:
   - Zmeň názov scriptu
   - Aktualizuj verziu
   - Nastav správnu knižnicu a trigger
   - Opíš funkčnosť

3. KONFIGURÁCIA:
   - Upravte CONFIG.scriptName a CONFIG.version
   - Pridajte script-špecifické nastavenia do CONFIG.settings
   - Rozhodnite sa medzi checkAllDependencies() alebo checkDependencies(['time', 'validation'])

4. VALIDÁCIA:
   - Použite nové focused moduly (utils.validation)
   - Definujte povinné polia podľa knižnice
   - Pridajte vlastné validačné pravidlá

5. BUSINESS LOGIKA:
   - Implementujte vlastnú logiku v processBusinessLogic()
   - Použite nové focused moduly:
     * utils.time pre časové operácie
     * utils.date pre dátumové kontroly
     * utils.formatting pre výstupy
     * utils.calculations pre výpočty
   - Upravte processEmployee() podľa potrieb

6. TELEGRAM:
   - Import priamo: var telegram = typeof MementoTelegram !== 'undefined' ? MementoTelegram : null;
   - Upravte createTelegramMessage() pre vlastný formát
   - Zmeňte inline keyboard tlačidlá

7. TESTOVANIE:
   - Otestujte všetky scenáre
   - Skontrolujte error handling
   - Overte Telegram notifikácie
   - Testujte dependency checking

TIPY:
- Používajte utils.addDebug() pre logovanie
- Vždy wrapujte do try-catch blokov
- Validujte všetky vstupy pomocou utils.validation modulu
- Používajte utils.safeGet/safeSet pre bezpečný prístup
- Testujte na rôznych typoch dát
- Využívajte nové focused moduly (time, date, validation, formatting, calculations)

PRE VIAC INFORMÁCIÍ:
- CLAUDE.md - Project instructions
- docs/CORE_MODULES_DOCUMENTATION.md - Complete API reference
- docs/CORE_MODULES_QUICK_REFERENCE.md - Quick lookup
- docs/CORE_MODULES_AGGREGATION.md - What's aggregated in MementoUtils
*/
