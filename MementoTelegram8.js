// ==============================================
// MEMENTO TELEGRAM - Telegram integrácia
// Verzia: 8.0 | Dátum: December 2024 | Autor: ASISTANTO
// ==============================================
// 📋 ÚČEL:
//    - Telegram Bot API integrácia
//    - Odosielanie, editácia a mazanie správ
//    - Práca s thread/témami
//    - Notifikačný systém
//    - Group summary funkcie
//    - Message formatting a šablóny
// ==============================================
// 🔧 CHANGELOG v8.0:
//    - Pridané Group Summary funkcie
//    - Message formatting šablóny
//    - Agregačné funkcie
//    - Štatistické funkcie
//    - Refaktorovaná štruktúra
// ==============================================

var MementoTelegram = (function() {
    'use strict';
    
    var version = "8.0";
    
    // Lazy loading pre závislosti
    var _config = null;
    var _core = null;
    var _ai = null;
    
    function getConfig() {
        if (!_config && typeof MementoConfig !== 'undefined') {
            _config = MementoConfig.getConfig();
        }
        return _config;
    }
    
    function getCore() {
        if (!_core && typeof MementoCore !== 'undefined') {
            _core = MementoCore;
        }
        return _core;
    }
    
    function getAI() {
        if (!_ai && typeof MementoAI !== 'undefined') {
            _ai = MementoAI;
        }
        return _ai;
    }
    
    // ==============================================
    // TELEGRAM API - ZÁKLADNÉ FUNKCIE
    // ==============================================
    
    /**
     * Získa Telegram Bot API token
     * @returns {string|null} API token alebo null
     */
    function getBotToken() {
        try {
            var core = getCore();
            if (!core) return null;
            
            var config = getConfig();
            var defaultsLib = config ? config.libraries.defaults : "ASISTANTO Defaults";
            var tokenField = config ? config.fields.defaults.telegramApiKey : "Telegram Bot API Key";
            
            return core.getSettings(defaultsLib, tokenField);
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Odošle správu na Telegram
     * @param {string} chatId - ID chatu alebo username
     * @param {string} text - Text správy
     * @param {Object} options - Dodatočné parametre
     * @returns {Object} Výsledok operácie
     */
    function sendTelegramMessage(chatId, text, options) {
        try {
            var core = getCore();
            var ai = getAI();
            
            if (!ai) {
                throw new Error("MementoAI modul nie je dostupný");
            }
            
            var token = getBotToken();
            if (!token) {
                throw new Error("Telegram Bot API token nebol nájdený");
            }
            
            options = options || {};
            
            // Príprava URL a dát
            var url = "https://api.telegram.org/bot" + token + "/sendMessage";
            var data = {
                chat_id: chatId,
                text: text,
                parse_mode: options.parseMode || "Markdown",
                disable_web_page_preview: options.disablePreview || false,
                disable_notification: options.silent || false
            };
            
            // Thread ID pre odpoveď v téme
            if (options.threadId) {
                data.message_thread_id = options.threadId;
            }
            
            // Reply to message
            if (options.replyToMessageId) {
                data.reply_to_message_id = options.replyToMessageId;
            }
            
            // Inline keyboard
            if (options.inlineKeyboard) {
                data.reply_markup = {
                    inline_keyboard: options.inlineKeyboard
                };
            }
            
            // Odoslanie requestu
            var response = ai.httpRequest("POST", url, data);
            
            if (response.code !== 200) {
                var errorData = JSON.parse(response.body);
                throw new Error("Telegram API error: " + (errorData.description || response.body));
            }
            
            var responseData = JSON.parse(response.body);
            
            // Ulož info o správe do notifikácií
            if (options.createNotification !== false) {
                createNotificationEntry("sent", {
                    chatId: chatId,
                    messageId: responseData.result.message_id,
                    threadId: options.threadId,
                    text: text,
                    timestamp: new Date()
                });
            }
            
            return {
                success: true,
                messageId: responseData.result.message_id,
                chatId: responseData.result.chat.id,
                date: responseData.result.date
            };
            
        } catch (error) {
            if (core) {
                core.addError(entry(), "Odoslanie Telegram správy zlyhalo: " + error.toString(), "sendTelegramMessage", error);
            }
            
            return {
                success: false,
                error: error.toString()
            };
        }
    }
    
    /**
     * Edituje existujúcu správu
     * @param {string} chatId - ID chatu
     * @param {string} messageId - ID správy
     * @param {string} newText - Nový text
     * @param {Object} options - Dodatočné parametre
     * @returns {Object} Výsledok operácie
     */
    function editTelegramMessage(chatId, messageId, newText, options) {
        try {
            var ai = getAI();
            if (!ai) {
                throw new Error("MementoAI modul nie je dostupný");
            }
            
            var token = getBotToken();
            if (!token) {
                throw new Error("Telegram Bot API token nebol nájdený");
            }
            
            options = options || {};
            
            var url = "https://api.telegram.org/bot" + token + "/editMessageText";
            var data = {
                chat_id: chatId,
                message_id: messageId,
                text: newText,
                parse_mode: options.parseMode || "Markdown",
                disable_web_page_preview: options.disablePreview || false
            };
            
            if (options.inlineKeyboard) {
                data.reply_markup = {
                    inline_keyboard: options.inlineKeyboard
                };
            }
            
            var response = ai.httpRequest("POST", url, data);
            
            if (response.code !== 200) {
                var errorData = JSON.parse(response.body);
                throw new Error("Telegram API error: " + (errorData.description || response.body));
            }
            
            return {
                success: true,
                messageId: messageId
            };
            
        } catch (error) {
            var core = getCore();
            if (core) {
                core.addError(entry(), "Editácia Telegram správy zlyhala: " + error.toString(), "editTelegramMessage", error);
            }
            
            return {
                success: false,
                error: error.toString()
            };
        }
    }
    
    /**
     * Vymaže správu
     * @param {string} chatId - ID chatu
     * @param {string} messageId - ID správy
     * @returns {Object} Výsledok operácie
     */
    function deleteTelegramMessage(chatId, messageId) {
        try {
            var ai = getAI();
            if (!ai) {
                throw new Error("MementoAI modul nie je dostupný");
            }
            
            var token = getBotToken();
            if (!token) {
                throw new Error("Telegram Bot API token nebol nájdený");
            }
            
            var url = "https://api.telegram.org/bot" + token + "/deleteMessage";
            var data = {
                chat_id: chatId,
                message_id: messageId
            };
            
            var response = ai.httpRequest("POST", url, data);
            
            if (response.code !== 200) {
                var errorData = JSON.parse(response.body);
                throw new Error("Telegram API error: " + (errorData.description || response.body));
            }
            
            return {
                success: true
            };
            
        } catch (error) {
            var core = getCore();
            if (core) {
                core.addError(entry(), "Vymazanie Telegram správy zlyhalo: " + error.toString(), "deleteTelegramMessage", error);
            }
            
            return {
                success: false,
                error: error.toString()
            };
        }
    }
    
    // ==============================================
    // MESSAGE FORMATTING A ŠABLÓNY
    // ==============================================
    
    /**
     * Formátuje správu pre Telegram s emoji a štruktúrou
     * @param {Object} data - Dáta pre správu
     * @param {string} template - Názov šablóny
     * @returns {string} Formátovaná správa
     */
    function formatTelegramMessage(data, template) {
        var templates = {
            dochadzka: formatDochadzkaTemplate,
            workRecord: formatWorkRecordTemplate,
            summary: formatSummaryTemplate,
            stats: formatStatsTemplate,
            daily: formatDailyTemplate,
            weekly: formatWeeklyTemplate,
            monthly: formatMonthlyTemplate
        };
        
        var formatter = templates[template] || formatDefaultTemplate;
        return formatter(data);
    }
    
    /**
     * Šablóna pre dochádzku
     */
    function formatDochadzkaTemplate(data) {
        var config = getConfig();
        var core = getCore();
        
        var msg = "📋 *DOCHÁDZKA*\n";
        msg += "═════════════════\n\n";
        
        msg += "📅 *Dátum:* " + formatDate(data.date) + "\n";
        
        if (data.arrival && data.departure) {
            msg += "⏰ *Čas:* " + formatTime(data.arrival) + " - " + formatTime(data.departure) + "\n";
        }
        
        if (data.hoursWorked !== undefined) {
            msg += "⏱️ *Odpracované:* " + formatHours(data.hoursWorked) + "\n";
        }
        
        if (data.workTime !== undefined) {
            msg += "🕐 *Pracovná doba:* " + formatHours(data.workTime) + "\n";
        }
        
        if (data.employees && data.employees.length > 0) {
            msg += "\n👥 *Zamestnanci* (" + data.employees.length + "):\n";
            data.employees.forEach(function(emp) {
                msg += "• " + escapeMarkdown(emp.name || emp.nick || "Neznámy");
                if (emp.hours) msg += " - " + formatHours(emp.hours);
                msg += "\n";
            });
        }
        
        if (data.wageCosts !== undefined) {
            msg += "\n💰 *Mzdové náklady:* " + formatMoney(data.wageCosts) + "\n";
        }
        
        return msg;
    }
    
    /**
     * Šablóna pre záznam práce
     */
    function formatWorkRecordTemplate(data) {
        var msg = "🔨 *ZÁZNAM PRÁCE*\n";
        msg += "═════════════════\n\n";
        
        msg += "📅 *Dátum:* " + formatDate(data.date) + "\n";
        
        if (data.customer) {
            msg += "🏢 *Zákazka:* " + escapeMarkdown(data.customer) + "\n";
        }
        
        if (data.timeInterval) {
            msg += "⏰ *Čas:* " + data.timeInterval + "\n";
        }
        
        if (data.workDescription) {
            msg += "📝 *Popis:* " + escapeMarkdown(data.workDescription) + "\n";
        }
        
        if (data.employees && data.employees.length > 0) {
            msg += "\n👥 *Pracovníci:*\n";
            data.employees.forEach(function(emp) {
                msg += "• " + escapeMarkdown(emp.name || emp.nick);
                if (emp.hours) msg += " (" + formatHours(emp.hours) + ")";
                msg += "\n";
            });
        }
        
        if (data.totalHours !== undefined) {
            msg += "\n⏱️ *Celkom hodín:* " + formatHours(data.totalHours) + "\n";
        }
        
        if (data.hzsSum !== undefined) {
            msg += "💵 *HZS suma:* " + formatMoney(data.hzsSum) + "\n";
        }
        
        return msg;
    }
    
    /**
     * Šablóna pre súhrn
     */
    function formatSummaryTemplate(data) {
        var msg = "📊 *" + (data.title || "SÚHRN").toUpperCase() + "*\n";
        msg += "═════════════════\n\n";
        
        if (data.period) {
            msg += "📅 *Obdobie:* " + data.period + "\n\n";
        }
        
        if (data.stats) {
            msg += formatStatsSection(data.stats);
        }
        
        if (data.topEmployees && data.topEmployees.length > 0) {
            msg += "\n🏆 *TOP Zamestnanci:*\n";
            data.topEmployees.forEach(function(emp, index) {
                var medal = index === 0 ? "🥇" : (index === 1 ? "🥈" : "🥉");
                msg += medal + " " + escapeMarkdown(emp.name) + " - " + formatHours(emp.hours) + "\n";
            });
        }
        
        if (data.projects && data.projects.length > 0) {
            msg += "\n📂 *Projekty:*\n";
            data.projects.forEach(function(proj) {
                msg += "• " + escapeMarkdown(proj.name) + " - " + formatHours(proj.hours);
                if (proj.costs) msg += " (" + formatMoney(proj.costs) + ")";
                msg += "\n";
            });
        }
        
        return msg;
    }
    
    /**
     * Šablóna pre štatistiky
     */
    function formatStatsTemplate(data) {
        var msg = "📈 *ŠTATISTIKY*\n";
        msg += "═════════════════\n\n";
        
        if (data.totalHours !== undefined) {
            msg += "⏱️ *Hodiny spolu:* " + formatHours(data.totalHours) + "\n";
        }
        
        if (data.totalCosts !== undefined) {
            msg += "💰 *Náklady spolu:* " + formatMoney(data.totalCosts) + "\n";
        }
        
        if (data.entryCount !== undefined) {
            msg += "📝 *Počet záznamov:* " + data.entryCount + "\n";
        }
        
        if (data.employeeCount !== undefined) {
            msg += "👥 *Počet zamestnancov:* " + data.employeeCount + "\n";
        }
        
        if (data.avgHoursPerDay !== undefined) {
            msg += "📊 *Priemer hodín/deň:* " + formatHours(data.avgHoursPerDay) + "\n";
        }
        
        if (data.avgCostsPerDay !== undefined) {
            msg += "💵 *Priemer náklady/deň:* " + formatMoney(data.avgCostsPerDay) + "\n";
        }
        
        return msg;
    }
    
    /**
     * Denný súhrn šablóna
     */
    function formatDailyTemplate(data) {
        var config = getConfig();
        
        var msg = "📅 *DENNÝ SÚHRN*\n";
        msg += formatDate(data.date) + " (" + getDayName(data.date) + ")\n";
        msg += "═════════════════\n\n";
        
        if (data.attendance) {
            msg += "📋 *Dochádzka:*\n";
            msg += "• Pracovníkov: " + data.attendance.employeeCount + "\n";
            msg += "• Odpracované: " + formatHours(data.attendance.totalHours) + "\n";
            msg += "• Náklady: " + formatMoney(data.attendance.totalCosts) + "\n\n";
        }
        
        if (data.workRecords) {
            msg += "🔨 *Práce:*\n";
            msg += "• Záznamov: " + data.workRecords.count + "\n";
            msg += "• Hodín: " + formatHours(data.workRecords.totalHours) + "\n";
            msg += "• HZS: " + formatMoney(data.workRecords.totalHZS) + "\n\n";
        }
        
        if (data.topEmployees && data.topEmployees.length > 0) {
            msg += "🏆 *Najviac hodín:*\n";
            data.topEmployees.slice(0, 3).forEach(function(emp) {
                msg += "• " + escapeMarkdown(emp.name) + " - " + formatHours(emp.hours) + "\n";
            });
        }
        
        return msg;
    }
    
    /**
     * Týždenný súhrn šablóna
     */
    function formatWeeklyTemplate(data) {
        var msg = "📊 *TÝŽDENNÝ SÚHRN*\n";
        msg += "Týždeň " + data.weekNumber + "/" + data.year + "\n";
        msg += "═════════════════\n\n";
        
        msg += formatStatsSection({
            totalHours: data.totalHours,
            totalCosts: data.totalCosts,
            entryCount: data.entryCount,
            employeeCount: data.uniqueEmployees
        });
        
        if (data.dailyBreakdown && data.dailyBreakdown.length > 0) {
            msg += "\n📅 *Po dňoch:*\n";
            data.dailyBreakdown.forEach(function(day) {
                msg += "• " + formatDate(day.date, "dd DD.MM") + ": ";
                msg += formatHours(day.hours) + " (" + formatMoney(day.costs) + ")\n";
            });
        }
        
        return msg;
    }
    
    /**
     * Mesačný súhrn šablóna
     */
    function formatMonthlyTemplate(data) {
        var msg = "📊 *MESAČNÝ SÚHRN*\n";
        msg += data.monthName + " " + data.year + "\n";
        msg += "═════════════════\n\n";
        
        msg += formatStatsSection({
            totalHours: data.totalHours,
            totalCosts: data.totalCosts,
            workDays: data.workDays,
            avgHoursPerDay: data.avgHoursPerDay
        });
        
        if (data.weeklyBreakdown && data.weeklyBreakdown.length > 0) {
            msg += "\n📅 *Po týždňoch:*\n";
            data.weeklyBreakdown.forEach(function(week) {
                msg += "• Týždeň " + week.number + ": ";
                msg += formatHours(week.hours) + " (" + formatMoney(week.costs) + ")\n";
            });
        }
        
        return msg;
    }
    
    /**
     * Defaultná šablóna
     */
    function formatDefaultTemplate(data) {
        var msg = "*" + (data.title || "SPRÁVA") + "*\n\n";
        
        for (var key in data) {
            if (key !== 'title' && data.hasOwnProperty(key)) {
                msg += key + ": " + escapeMarkdown(String(data[key])) + "\n";
            }
        }
        
        return msg;
    }
    
    /**
     * Pomocná funkcia pre formátovanie sekcie štatistík
     */
    function formatStatsSection(stats) {
        var msg = "";
        
        if (stats.totalHours !== undefined) {
            msg += "⏱️ *Hodiny spolu:* " + formatHours(stats.totalHours) + "\n";
        }
        
        if (stats.totalCosts !== undefined) {
            msg += "💰 *Náklady spolu:* " + formatMoney(stats.totalCosts) + "\n";
        }
        
        if (stats.entryCount !== undefined) {
            msg += "📝 *Počet záznamov:* " + stats.entryCount + "\n";
        }
        
        if (stats.employeeCount !== undefined) {
            msg += "👥 *Zamestnancov:* " + stats.employeeCount + "\n";
        }
        
        if (stats.workDays !== undefined) {
            msg += "📅 *Pracovných dní:* " + stats.workDays + "\n";
        }
        
        if (stats.avgHoursPerDay !== undefined) {
            msg += "📊 *Ø hodín/deň:* " + formatHours(stats.avgHoursPerDay) + "\n";
        }
        
        return msg;
    }
    
    // ==============================================
    // AGREGAČNÉ FUNKCIE
    // ==============================================
    
    /**
     * Agreguje dáta pre skupinové správy
     * @param {Array} entries - Záznamy na agregáciu
     * @param {Object} options - Možnosti agregácie
     * @returns {Object} Agregované dáta
     */
    function aggregateDataForGroup(entries, options) {
        options = options || {};
        
        var aggregated = {
            totalHours: 0,
            totalCosts: 0,
            employeeStats: {},
            projectStats: {},
            dailyStats: {},
            periodStart: null,
            periodEnd: null,
            entryCount: 0,
            recordCount: entries.length
        };
        
        entries.forEach(function(entry) {
            processEntryForAggregation(entry, aggregated, options);
        });
        
        // Vypočítaj priemery
        if (aggregated.entryCount > 0) {
            aggregated.avgHoursPerDay = aggregated.totalHours / aggregated.entryCount;
            aggregated.avgCostsPerDay = aggregated.totalCosts / aggregated.entryCount;
        }
        
        // Konvertuj objekty na arrays pre jednoduchšie spracovanie
        aggregated.employeeList = objectToSortedArray(aggregated.employeeStats, 'hours', true);
        aggregated.projectList = objectToSortedArray(aggregated.projectStats, 'hours', true);
        aggregated.dailyList = objectToSortedArray(aggregated.dailyStats, 'date', false);
        
        return aggregated;
    }
    
    /**
     * Spracuje jednotlivý entry pre agregáciu
     */
    function processEntryForAggregation(entry, aggregated, options) {
        var config = getConfig();
        
        // Základné údaje
        var date = entry.field(config.fields.attendance.date || config.fields.workRecord.date);
        if (!date) return;
        
        var dateKey = moment(date).format("YYYY-MM-DD");
        
        // Aktualizuj obdobie
        if (!aggregated.periodStart || moment(date).isBefore(aggregated.periodStart)) {
            aggregated.periodStart = date;
        }
        if (!aggregated.periodEnd || moment(date).isAfter(aggregated.periodEnd)) {
            aggregated.periodEnd = date;
        }
        
        // Denné štatistiky
        if (!aggregated.dailyStats[dateKey]) {
            aggregated.dailyStats[dateKey] = {
                date: date,
                hours: 0,
                costs: 0,
                employees: {},
                entryCount: 0
            };
        }
        
        // Spracuj podľa typu záznamu
        if (entry.field(config.fields.attendance.employees)) {
            // Dochádzka
            processAttendanceEntry(entry, aggregated, dateKey, options);
        } else if (entry.field(config.fields.workRecord.employees)) {
            // Záznam práce
            processWorkRecordEntry(entry, aggregated, dateKey, options);
        }
        
        aggregated.entryCount++;
    }
    
    /**
     * Spracuje dochádzku pre agregáciu
     */
    function processAttendanceEntry(entry, aggregated, dateKey, options) {
        var config = getConfig();
        var core = getCore();
        
        var hours = core.safeGet(entry, config.fields.attendance.workedHours, 0);
        var costs = core.safeGet(entry, config.fields.attendance.wageCosts, 0);
        var employees = core.safeGetLinks(entry, config.fields.attendance.employees);
        
        // Celkové štatistiky
        aggregated.totalHours += hours;
        aggregated.totalCosts += costs;
        
        // Denné štatistiky
        aggregated.dailyStats[dateKey].hours += hours;
        aggregated.dailyStats[dateKey].costs += costs;
        aggregated.dailyStats[dateKey].entryCount++;
        
        // Štatistiky po zamestnancoch
        employees.forEach(function(emp, index) {
            var empName = formatEmployeeName(emp);
            var empHours = getAttributeValue(entry, config.fields.attendance.employees, config.attributes.employees.workedHours, index) || 0;
            var empCosts = getAttributeValue(entry, config.fields.attendance.employees, config.attributes.employees.dailyWage, index) || 0;
            
            // Celkové štatistiky zamestnanca
            if (!aggregated.employeeStats[empName]) {
                aggregated.employeeStats[empName] = {
                    name: empName,
                    hours: 0,
                    costs: 0,
                    days: 0
                };
            }
            
            aggregated.employeeStats[empName].hours += empHours;
            aggregated.employeeStats[empName].costs += empCosts;
            aggregated.employeeStats[empName].days++;
            
            // Denné štatistiky zamestnanca
            aggregated.dailyStats[dateKey].employees[empName] = empHours;
        });
    }
    
    /**
     * Spracuje záznam práce pre agregáciu
     */
    function processWorkRecordEntry(entry, aggregated, dateKey, options) {
        var config = getConfig();
        var core = getCore();
        
        var hours = core.safeGet(entry, config.fields.workRecord.workedHours, 0);
        var costs = core.safeGet(entry, config.fields.workRecord.wageCosts, 0);
        var hzsSum = core.safeGet(entry, config.fields.workRecord.hzsSum, 0);
        var customer = core.safeGet(entry, config.fields.workRecord.customer, "");
        var employees = core.safeGetLinks(entry, config.fields.workRecord.employees);
        
        // Celkové štatistiky
        aggregated.totalHours += hours;
        aggregated.totalCosts += costs;
        
        // Projektové štatistiky
        if (customer && options.includeProjects !== false) {
            var customerName = typeof customer === 'object' ? core.safeGet(customer, "Názov", "Neznámy") : customer;
            
            if (!aggregated.projectStats[customerName]) {
                aggregated.projectStats[customerName] = {
                    name: customerName,
                    hours: 0,
                    costs: 0,
                    hzsSum: 0,
                    records: 0
                };
            }
            
            aggregated.projectStats[customerName].hours += hours;
            aggregated.projectStats[customerName].costs += costs;
            aggregated.projectStats[customerName].hzsSum += hzsSum;
            aggregated.projectStats[customerName].records++;
        }
    }
    
    // ==============================================
    // ŠTATISTICKÉ FUNKCIE
    // ==============================================
    
    /**
     * Vytvorí súhrnné štatistiky z agregovaných dát
     */
    function createSummaryStatistics(aggregatedData) {
        var stats = {
            overview: {
                totalHours: Math.round(aggregatedData.totalHours * 100) / 100,
                totalCosts: Math.round(aggregatedData.totalCosts * 100) / 100,
                entryCount: aggregatedData.entryCount,
                avgHoursPerDay: Math.round((aggregatedData.avgHoursPerDay || 0) * 100) / 100,
                avgCostsPerDay: Math.round((aggregatedData.avgCostsPerDay || 0) * 100) / 100,
                periodStart: aggregatedData.periodStart,
                periodEnd: aggregatedData.periodEnd,
                uniqueEmployees: Object.keys(aggregatedData.employeeStats).length,
                uniqueProjects: Object.keys(aggregatedData.projectStats).length
            },
            
            // Top performers
            topEmployees: getTopEmployees(aggregatedData.employeeStats, 5),
            topProjects: getTopProjects(aggregatedData.projectStats, 5),
            
            // Detailné dáta
            employeeStats: aggregatedData.employeeStats,
            projectStats: aggregatedData.projectStats,
            dailyStats: aggregatedData.dailyStats,
            
            // Vypočítané metriky
            productivity: calculateProductivity(aggregatedData),
            trends: calculateTrends(aggregatedData)
        };
        
        return stats;
    }
    
    /**
     * Získa top zamestnancov podľa hodín
     */
    function getTopEmployees(employeeStats, limit) {
        return objectToSortedArray(employeeStats, 'hours', true)
            .slice(0, limit)
            .map(function(emp) {
                return {
                    name: emp.name,
                    hours: Math.round(emp.hours * 100) / 100,
                    costs: Math.round(emp.costs * 100) / 100,
                    days: emp.days,
                    avgHoursPerDay: Math.round((emp.hours / emp.days) * 100) / 100
                };
            });
    }
    
    /**
     * Získa top projekty podľa hodín
     */
    function getTopProjects(projectStats, limit) {
        return objectToSortedArray(projectStats, 'hours', true)
            .slice(0, limit)
            .map(function(proj) {
                return {
                    name: proj.name,
                    hours: Math.round(proj.hours * 100) / 100,
                    costs: Math.round(proj.costs * 100) / 100,
                    hzsSum: Math.round(proj.hzsSum * 100) / 100,
                    records: proj.records
                };
            });
    }
    
    /**
     * Vypočíta produktivitu
     */
    function calculateProductivity(aggregatedData) {
        var totalWorkDays = Object.keys(aggregatedData.dailyStats).length;
        var totalEmployees = Object.keys(aggregatedData.employeeStats).length;
        
        if (totalWorkDays === 0 || totalEmployees === 0) {
            return {
                avgHoursPerEmployeePerDay: 0,
                avgCostsPerEmployeePerDay: 0,
                utilizationRate: 0
            };
        }
        
        var avgHoursPerEmployeePerDay = aggregatedData.totalHours / (totalEmployees * totalWorkDays);
        var avgCostsPerEmployeePerDay = aggregatedData.totalCosts / (totalEmployees * totalWorkDays);
        var utilizationRate = (avgHoursPerEmployeePerDay / 8) * 100; // Assuming 8 hour work day
        
        return {
            avgHoursPerEmployeePerDay: Math.round(avgHoursPerEmployeePerDay * 100) / 100,
            avgCostsPerEmployeePerDay: Math.round(avgCostsPerEmployeePerDay * 100) / 100,
            utilizationRate: Math.round(utilizationRate * 10) / 10
        };
    }
    
    /**
     * Vypočíta trendy
     */
    function calculateTrends(aggregatedData) {
        var dailyList = objectToSortedArray(aggregatedData.dailyStats, 'date', false);
        
        if (dailyList.length < 2) {
            return {
                hoursChange: 0,
                costsChange: 0,
                trend: "stable"
            };
        }
        
        // Porovnaj prvú a poslednú polovicu
        var midPoint = Math.floor(dailyList.length / 2);
        var firstHalf = dailyList.slice(0, midPoint);
        var secondHalf = dailyList.slice(midPoint);
        
        var firstHalfAvgHours = firstHalf.reduce(function(sum, day) { return sum + day.hours; }, 0) / firstHalf.length;
        var secondHalfAvgHours = secondHalf.reduce(function(sum, day) { return sum + day.hours; }, 0) / secondHalf.length;
        
        var hoursChange = ((secondHalfAvgHours - firstHalfAvgHours) / firstHalfAvgHours) * 100;
        
        return {
            hoursChange: Math.round(hoursChange * 10) / 10,
            trend: hoursChange > 10 ? "growing" : (hoursChange < -10 ? "declining" : "stable")
        };
    }
    
    // ==============================================
    // GROUP MANAGEMENT
    // ==============================================
    
    /**
     * Získa Telegram skupinu podľa ID
     * @param {string} groupId - ID skupiny alebo názov
     * @returns {Entry|null} Entry skupiny alebo null
     */
    function getTelegramGroup(groupId) {
        try {
            var config = getConfig();
            var groupsLib = config ? config.libraries.telegramGroups : "Telegram Groups";
            
            var lib = libByName(groupsLib);
            if (!lib) {
                return null;
            }
            
            // Hľadaj podľa ID alebo názvu
            var groups = lib.find(config.fields.telegramGroups.chatId, groupId);
            if (!groups || groups.length === 0) {
                groups = lib.find(config.fields.telegramGroups.groupName, groupId);
            }
            
            return groups && groups.length > 0 ? groups[0] : null;
            
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Odošle správu do konkrétnej témy v skupine
     * @param {string} groupId - ID skupiny
     * @param {string} threadId - ID témy
     * @param {string} text - Text správy
     * @param {Object} options - Dodatočné parametre
     * @returns {Object} Výsledok operácie
     */
    function sendToTelegramThread(groupId, threadId, text, options) {
        options = options || {};
        options.threadId = threadId;
        
        return sendTelegramMessage(groupId, text, options);
    }
    
    /**
     * Odošle súhrnnú správu do skupiny
     * @param {string} groupId - ID skupiny
     * @param {Object} summaryData - Dáta pre súhrn
     * @param {Object} options - Možnosti odoslania
     * @returns {Object} Výsledok odoslania
     */
    function sendGroupSummary(groupId, summaryData, options) {
        try {
            var core = getCore();
            var config = getConfig();
            
            // Získaj skupinu
            var group = getTelegramGroup(groupId);
            if (!group) {
                throw new Error("Skupina nenájdená: " + groupId);
            }
            
            // Skontroluj či má skupina povolené notifikácie
            if (!group.field(config.fields.telegramGroups.enableNotifications)) {
                return {
                    success: false,
                    error: "Skupina nemá povolené notifikácie"
                };
            }
            
            // Sformátuj správu podľa typu
            var template = options.template || 'summary';
            var message = formatTelegramMessage(summaryData, template);
            
            // Priprav možnosti odoslania
            var sendOptions = {
                parseMode: options.parseMode || "Markdown",
                silent: options.silent || group.field(config.fields.telegramGroups.silentMessage),
                disablePreview: true
            };
            
            // Pridaj thread ID ak existuje
            if (group.field(config.fields.telegramGroups.hasTopic)) {
                sendOptions.threadId = group.field(config.fields.telegramGroups.threadId);
            }
            
            // Odošli správu
            var result = sendTelegramMessage(
                group.field(config.fields.telegramGroups.chatId),
                message,
                sendOptions
            );
            
            // Vytvor notifikačný záznam
            if (result.success && options.createNotification !== false) {
                createNotificationEntry("group_summary", {
                    chatId: group.field(config.fields.telegramGroups.chatId),
                    messageId: result.messageId,
                    groupName: group.field(config.fields.telegramGroups.groupName),
                    summaryType: template,
                    summaryData: JSON.stringify(summaryData)
                });
            }
            
            // Aktualizuj štatistiky skupiny
            if (result.success) {
                updateGroupStats(group);
            }
            
            return result;
            
        } catch (error) {
            if (core) {
                core.addError(entry(), "Odoslanie group summary zlyhalo: " + error.toString(), "sendGroupSummary", error);
            }
            return { 
                success: false, 
                error: error.toString() 
            };
        }
    }
    
    /**
     * Odošle denný súhrn do skupín
     */
    function sendDailySummary(date, targetGroups) {
        try {
            var config = getConfig();
            var core = getCore();
            
            // Získaj dáta pre súhrn
            var attendanceData = getDailyAttendanceData(date);
            var workRecordData = getDailyWorkRecordData(date);
            
            // Agreguj dáta
            var allEntries = attendanceData.concat(workRecordData);
            var aggregated = aggregateDataForGroup(allEntries);
            
            // Vytvor súhrn
            var summaryData = {
                title: "Denný súhrn",
                date: date,
                attendance: {
                    employeeCount: attendanceData.length > 0 ? attendanceData[0].field(config.fields.attendance.employeeCount) : 0,
                    totalHours: aggregated.totalHours,
                    totalCosts: aggregated.totalCosts
                },
                workRecords: {
                    count: workRecordData.length,
                    totalHours: workRecordData.reduce(function(sum, wr) {
                        return sum + (wr.field(config.fields.workRecord.workedHours) || 0);
                    }, 0),
                    totalHZS: workRecordData.reduce(function(sum, wr) {
                        return sum + (wr.field(config.fields.workRecord.hzsSum) || 0);
                    }, 0)
                },
                topEmployees: getTopEmployees(aggregated.employeeStats, 3)
            };
            
            // Odošli do skupín
            var results = [];
            targetGroups.forEach(function(group) {
                var result = sendGroupSummary(group.field("ID"), summaryData, {
                    template: 'daily'
                });
                results.push(result);
            });
            
            return results;
            
        } catch (error) {
            if (core) {
                core.addError(entry(), "Denný súhrn zlyhal: " + error.toString(), "sendDailySummary", error);
            }
            return [];
        }
    }
    
    // ==============================================
    // NOTIFIKÁCIE
    // ==============================================
    
    /**
     * Vytvorí záznam v knižnici notifikácií
     * @param {string} type - Typ notifikácie
     * @param {Object} data - Dáta notifikácie
     * @returns {Entry|null} Vytvorený záznam alebo null
     */
    function createNotificationEntry(type, data) {
        try {
            var config = getConfig();
            var core = getCore();
            
            var notifLib = libByName(config.libraries.notifications);
            if (!notifLib) {
                return null;
            }
            
            var notif = notifLib.create({});
            
            // Základné polia
            notif.set(config.fields.notifications.messageType, type);
            notif.set(config.fields.notifications.status, "Odoslané");
            notif.set(config.fields.notifications.priority, data.priority || "Normálna");
            
            // Telegram špecifické polia
            if (data.chatId) {
                notif.set(config.fields.notifications.chatId, data.chatId);
            }
            if (data.threadId) {
                notif.set(config.fields.notifications.threadId, data.threadId);
            }
            if (data.messageId) {
                notif.set(config.fields.notifications.messageId, data.messageId);
            }
            
            // Obsah správy
            if (data.text) {
                notif.set(config.fields.notifications.message, data.text);
            }
            
            // Časové údaje
            notif.set(config.fields.notifications.lastMessage, new Date());
            
            // Prepojenia
            if (data.employee) {
                notif.set(config.fields.notifications.employeeOrClient, data.employee);
            }
            if (data.customer) {
                notif.set(config.fields.notifications.customer, data.customer);
            }
            
            // Dodatočné dáta
            if (data.summaryData) {
                notif.set(config.fields.common.info, data.summaryData);
            }
            
            return notif;
            
        } catch (error) {
            var core = getCore();
            if (core) {
                core.addError(entry(), "Vytvorenie notifikácie zlyhalo: " + error.toString(), "createNotificationEntry", error);
            }
            return null;
        }
    }
    
    // ==============================================
    // HELPER FUNKCIE
    // ==============================================
    
    /**
     * Formátuje text pre Telegram Markdown
     * @param {string} text - Text na formátovanie
     * @returns {string} Formátovaný text
     */
    function escapeMarkdown(text) {
        if (!text) return "";
        
        // Escape špeciálne znaky pre Markdown
        return String(text)
            .replace(/\*/g, "\\*")
            .replace(/_/g, "\\_")
            .replace(/\[/g, "\\[")
            .replace(/\]/g, "\\]")
            .replace(/\(/g, "\\(")
            .replace(/\)/g, "\\)")
            .replace(/~/g, "\\~")
            .replace(/`/g, "\\`")
            .replace(/>/g, "\\>")
            .replace(/#/g, "\\#")
            .replace(/\+/g, "\\+")
            .replace(/-/g, "\\-")
            .replace(/=/g, "\\=")
            .replace(/\|/g, "\\|")
            .replace(/\{/g, "\\{")
            .replace(/\}/g, "\\}")
            .replace(/\./g, "\\.")
            .replace(/!/g, "\\!");
    }
    
    /**
     * Vytvorí inline keyboard pre Telegram
     * @param {Array} buttons - Pole tlačidiel [{text: "Text", callback_data: "data"}]
     * @param {number} columns - Počet stĺpcov (default: 2)
     * @returns {Array} Inline keyboard array
     */
    function createInlineKeyboard(buttons, columns) {
        columns = columns || 2;
        var keyboard = [];
        var row = [];
        
        for (var i = 0; i < buttons.length; i++) {
            row.push(buttons[i]);
            
            if (row.length === columns || i === buttons.length - 1) {
                keyboard.push(row);
                row = [];
            }
        }
        
        return keyboard;
    }
    
    /**
     * Formátuje dátum
     * @param {Date} date - Dátum
     * @param {string} format - Formát (optional)
     * @returns {string} Formátovaný dátum
     */
    function formatDate(date, format) {
        if (!date) return "";
        return moment(date).format(format || "DD.MM.YYYY");
    }
    
    /**
     * Formátuje čas
     * @param {Date|string} time - Čas
     * @returns {string} Formátovaný čas
     */
    function formatTime(time) {
        if (!time) return "";
        
        if (moment.isMoment(time)) {
            return time.format("HH:mm");
        }
        
        return moment(time).format("HH:mm");
    }
    
    /**
     * Formátuje hodiny
     * @param {number} hours - Počet hodín
     * @returns {string} Formátované hodiny
     */
    function formatHours(hours) {
        if (!hours && hours !== 0) return "0h";
        
        var h = Math.floor(hours);
        var m = Math.round((hours - h) * 60);
        
        if (m === 0) return h + "h";
        return h + "h " + m + "m";
    }
    
    /**
     * Formátuje peniaze
     * @param {number} amount - Suma
     * @returns {string} Formátovaná suma
     */
    function formatMoney(amount) {
        if (!amount && amount !== 0) return "0.00 €";
        return amount.toFixed(2).replace(".", ",") + " €";
    }
    
    /**
     * Formátuje trvanie v minútach
     * @param {number} minutes - Počet minút
     * @returns {string} Formátované trvanie
     */
    function formatDuration(minutes) {
        if (!minutes && minutes !== 0) return "0m";
        
        var hours = Math.floor(minutes / 60);
        var mins = minutes % 60;
        
        if (hours === 0) return mins + "m";
        if (mins === 0) return hours + "h";
        return hours + "h " + mins + "m";
    }
    
    /**
     * Získa názov dňa
     * @param {Date} date - Dátum
     * @returns {string} Názov dňa
     */
    function getDayName(date) {
        var days = ["Nedeľa", "Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota"];
        return days[moment(date).day()];
    }
    
    /**
     * Formátuje meno zamestnanca
     * @param {Entry} employee - Zamestnanec
     * @returns {string} Formátované meno
     */
    function formatEmployeeName(employee) {
        if (!employee) return "Neznámy";
        
        var config = getConfig();
        var core = getCore();
        
        var nick = core.safeGet(employee, config.fields.employee.nick, "");
        var firstName = core.safeGet(employee, config.fields.employee.firstName, "");
        var lastName = core.safeGet(employee, config.fields.employee.lastName, "");
        
        if (nick) {
            return lastName ? nick + " (" + lastName + ")" : nick;
        }
        
        if (firstName || lastName) {
            return (firstName + " " + lastName).trim();
        }
        
        return "Zamestnanec #" + (employee.field("ID") || "?");
    }
    
    /**
     * Získa hodnotu atribútu z Link to Entry poľa
     */
    function getAttributeValue(entry, fieldName, attrName, index) {
        try {
            var field = entry.field(fieldName);
            if (!field) return null;
            
            if (Array.isArray(field) && index !== undefined && field[index]) {
                return field[index].attr(attrName);
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Konvertuje objekt na zoradený array
     */
    function objectToSortedArray(obj, sortBy, descending) {
        var arr = Object.keys(obj).map(function(key) {
            return obj[key];
        });
        
        if (sortBy) {
            arr.sort(function(a, b) {
                var aVal = a[sortBy];
                var bVal = b[sortBy];
                
                if (typeof aVal === 'string') {
                    return descending ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
                }
                
                return descending ? bVal - aVal : aVal - bVal;
            });
        }
        
        return arr;
    }
    
    /**
     * Aktualizuje štatistiky skupiny
     */
    function updateGroupStats(group) {
        try {
            var config = getConfig();
            var currentCount = group.field(config.fields.telegramGroups.messageCount) || 0;
            var totalCount = group.field(config.fields.telegramGroups.totalMessageCount) || 0;
            
            group.set(config.fields.telegramGroups.messageCount, currentCount + 1);
            group.set(config.fields.telegramGroups.totalMessageCount, totalCount + 1);
            group.set(config.fields.telegramGroups.lastMessage, new Date());
            
        } catch (error) {
            // Ignoruj chyby štatistík
        }
    }
    
    /**
     * Získa denné dáta dochádzky
     */
    function getDailyAttendanceData(date) {
        try {
            var config = getConfig();
            var lib = libByName(config.libraries.attendance);
            if (!lib) return [];
            
            var startOfDay = moment(date).startOf('day');
            var endOfDay = moment(date).endOf('day');
            
            return lib.entries().filter(function(e) {
                var entryDate = e.field(config.fields.attendance.date);
                return entryDate && moment(entryDate).isBetween(startOfDay, endOfDay, null, '[]');
            });
            
        } catch (error) {
            return [];
        }
    }
    
    /**
     * Získa denné dáta záznamov práce
     */
    function getDailyWorkRecordData(date) {
        try {
            var config = getConfig();
            var lib = libByName(config.libraries.workRecords);
            if (!lib) return [];
            
            var startOfDay = moment(date).startOf('day');
            var endOfDay = moment(date).endOf('day');
            
            return lib.entries().filter(function(e) {
                var entryDate = e.field(config.fields.workRecord.date);
                return entryDate && moment(entryDate).isBetween(startOfDay, endOfDay, null, '[]');
            });
            
        } catch (error) {
            return [];
        }
    }
    
    // ==============================================
    // PUBLIC API
    // ==============================================
    
    return {
        version: version,
        
        // Základné Telegram funkcie
        sendTelegramMessage: sendTelegramMessage,
        editTelegramMessage: editTelegramMessage,
        deleteTelegramMessage: deleteTelegramMessage,
        getBotToken: getBotToken,
        
        // Skupiny a témy
        getTelegramGroup: getTelegramGroup,
        sendToTelegramThread: sendToTelegramThread,
        
        // Message formatting
        formatTelegramMessage: formatTelegramMessage,
        escapeMarkdown: escapeMarkdown,
        createInlineKeyboard: createInlineKeyboard,
        
        // Group Summary funkcie
        aggregateDataForGroup: aggregateDataForGroup,
        createSummaryStatistics: createSummaryStatistics,
        sendGroupSummary: sendGroupSummary,
        sendDailySummary: sendDailySummary,
        
        // Notifikácie
        createNotificationEntry: createNotificationEntry,
        
        // Formátovacie helper funkcie
        formatDate: formatDate,
        formatTime: formatTime,
        formatHours: formatHours,
        formatMoney: formatMoney,
        formatDuration: formatDuration,
        getDayName: getDayName,
        formatEmployeeName: formatEmployeeName
    };
})();