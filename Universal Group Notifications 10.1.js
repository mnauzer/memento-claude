// ==============================================
// UNIVERSAL GROUP NOTIFICATION - Vytvorenie notifikácie
// Verzia: 10.1 | Dátum: December 2024 | Autor: ASISTANTO
// Knižnica: Univerzálna | Trigger: After Save
// ==============================================
// 📋 FUNKCIA:
//    - Univerzálny script pre všetky knižnice
//    - Automaticky rozpozná typ knižnice
//    - Vytvorí záznam v knižnici Notifications
//    - Cleanup starých notifikácií pri update
// ==============================================
// 🔧 POUŽÍVA:
//    - MementoUtils v7.0+ (základné funkcie)
//    - MementoConfig v7.0+ (centrálny CONFIG)
//    - Pripravené pre MementoNotifications v7.0
// ==============================================
// ✅ ZMENY v10.1:
//    - Odstránená kontrola pracovného času
//    - Pridaná trash() metóda pre cleanup
//    - Časové obmedzenia sa riešia v trigger scriptoch
// ==============================================

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var centralConfig = utils.config;
var currentEntry = entry();
var currentLibrary = lib();

var CONFIG = {
    scriptName: "Universal Group Notification",
    version: "10.1",
    
    // Referencie na centrálny config
    fields: centralConfig.fields,
    attributes: centralConfig.attributes,
    libraries: centralConfig.libraries,
    icons: centralConfig.icons,
    
    // Mapovanie knižníc na ich konfigurácie
    libraryMapping: {
        // Názov knižnice -> konfigurácia
        "Dochádzka": {
            type: "attendance",
            telegramGroupField: "Telegram skupina dochádzky",
            permissionField: "Dochádzka skupinové notifikácie",
            messageType: "Dochádzka",
            fields: centralConfig.fields.attendance,
            formatFunction: formatAttendanceMessage,
            dataExtractor: extractAttendanceData
        },
        "Záznam práce": {
            type: "workRecord",
            telegramGroupField: "Telegram skupina záznamu prác",
            permissionField: "Záznam prác skupinové notifikácie",
            messageType: "Záznam prác",
            fields: centralConfig.fields.workRecord,
            formatFunction: formatWorkRecordMessage,
            dataExtractor: extractWorkRecordData
        },
        "ASISTANTO API": {
            type: "workRecord",
            telegramGroupField: "Telegram skupina záznamu prác",
            permissionField: "Záznam prác skupinové notifikácie",
            messageType: "Záznam prác",
            fields: centralConfig.fields.workRecord,
            formatFunction: formatWorkRecordMessage,
            dataExtractor: extractWorkRecordData
        },
        "Kniha jázd": {
            type: "bookOfRides",
            telegramGroupField: "Telegram skupina knihy jázd",
            permissionField: "Kniha jázd skupinové notifikácie",
            messageType: "Kniha jázd",
            fields: centralConfig.fields.bookOfRides,
            formatFunction: formatBookOfRidesMessage,
            dataExtractor: extractBookOfRidesData
        },
        "Záväzky": {
            type: "obligations",
            telegramGroupField: "Telegram skupina záväzkov",
            permissionField: "Záväzky skupinové notifikácie",
            messageType: "Záväzky",
            fields: centralConfig.fields.obligations,
            formatFunction: formatObligationsMessage,
            dataExtractor: extractObligationsData
        },
        "Pokladňa": {
            type: "cashRegister",
            telegramGroupField: "Telegram skupina pokladne",
            permissionField: "Pokladňa skupinové notifikácie",
            messageType: "Pokladňa",
            fields: centralConfig.fields.cashRegister,
            formatFunction: formatCashRegisterMessage,
            dataExtractor: extractCashRegisterData
        }
    }
};

// ==============================================
// HLAVNÁ FUNKCIA - UNIVERZÁLNA
// ==============================================

function main() {
    try {
        var libraryName = currentLibrary.title;
        utils.addDebug(currentEntry, utils.getIcon("start") + " === UNIVERSAL GROUP NOTIFICATION v" + CONFIG.version + " ===");
        utils.addDebug(currentEntry, "Knižnica: " + libraryName);
        
        // 1. IDENTIFIKÁCIA KNIŽNICE
        var libraryConfig = identifyLibrary(libraryName);
        if (!libraryConfig) {
            utils.addDebug(currentEntry, utils.getIcon("info") + " Knižnica '" + libraryName + "' nie je nakonfigurovaná pre notifikácie");
            return true; // Nie je to chyba
        }
        
        // 2. KONTROLA ZÁVISLOSTÍ
        var depCheck = utils.checkDependencies(['config', 'core']);
        if (!depCheck.success) {
            utils.addError(currentEntry, "Chýbajú potrebné moduly: " + depCheck.missing.join(", "), "main");
            return false;
        }
        
        // 3. KONTROLA POVOLENÍ
        if (!checkPermissions(libraryConfig)) {
            utils.addDebug(currentEntry, utils.getIcon("info") + " Skupinové notifikácie sú vypnuté pre " + libraryName);
            return true;
        }
        
        // 4. ZÍSKANIE TELEGRAM SKUPINY
        var telegramGroup = getTelegramGroup(libraryConfig);
        if (!telegramGroup) {
            utils.addDebug(currentEntry, utils.getIcon("warning") + " Telegram skupina nenájdená alebo neaktívna");
            return true;
        }
        
        // 5. EXTRAKCIA DÁT
        var extractedData = extractData(libraryConfig);
        if (!extractedData) {
            utils.addError(currentEntry, "Nepodarilo sa extrahovať dáta", "main");
            return false;
        }
        
        // 6. FORMÁTOVANIE SPRÁVY
        var message = formatMessage(libraryConfig, extractedData);
        if (!message) {
            utils.addError(currentEntry, "Nepodarilo sa sformátovať správu", "main");
            return false;
        }
        
        // 7. VYTVORENIE NOTIFIKÁCIE
        var notification = createNotification({
            libraryConfig: libraryConfig,
            telegramGroup: telegramGroup,
            message: message,
            data: extractedData
        });
        
        if (!notification) {
            utils.addError(currentEntry, "Nepodarilo sa vytvoriť notifikáciu", "main");
            return false;
        }
        
        utils.addDebug(currentEntry, utils.getIcon("success") + " Notifikácia vytvorená (ID: " + notification.field("ID") + ")");
        utils.addDebug(currentEntry, utils.getIcon("success") + " === SCRIPT DOKONČENÝ ===");
        
        return true;
        
    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        return false;
    }
}

// ==============================================
// UNIVERZÁLNE FUNKCIE
// ==============================================

function identifyLibrary(libraryName) {
    return CONFIG.libraryMapping[libraryName] || null;
}

function checkPermissions(libraryConfig) {
    try {
        var defaultsLib = libByName(CONFIG.libraries.defaults);
        if (!defaultsLib) return false;
        
        var settings = defaultsLib.entries();
        if (!settings || settings.length === 0) return false;
        
        var defaultSettings = settings[settings.length - 1];
        var enabled = utils.safeGet(defaultSettings, libraryConfig.permissionField, false);
        
        utils.addDebug(currentEntry, "  • " + libraryConfig.permissionField + ": " + (enabled ? "ÁNO" : "NIE"));
        
        return enabled;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "checkPermissions", error);
        return false;
    }
}

function getTelegramGroup(libraryConfig) {
    try {
        var defaultsLib = libByName(CONFIG.libraries.defaults);
        if (!defaultsLib) return null;
        
        var settings = defaultsLib.entries();
        if (!settings || settings.length === 0) return null;
        
        var defaultSettings = settings[settings.length - 1];
        var telegramGroup = utils.safeGet(defaultSettings, libraryConfig.telegramGroupField);
        
        if (!telegramGroup) {
            utils.addError(currentEntry, "Telegram skupina nie je nastavená v poli '" + libraryConfig.telegramGroupField + "'", "getTelegramGroup");
            return null;
        }
        
        // Validácia skupiny
        if (!validateTelegramGroup(telegramGroup)) {
            return null;
        }
        
        return telegramGroup;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "getTelegramGroup", error);
        return null;
    }
}

function validateTelegramGroup(telegramGroup) {
    // Kontrola povolených notifikácií
    var notificationsEnabled = utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.enableNotifications, false);
    if (!notificationsEnabled) {
        utils.addDebug(currentEntry, utils.getIcon("warning") + " Skupina má vypnuté notifikácie");
        return false;
    }
    
    // ODSTRÁNENÉ: Kontrola časových obmedzení - toto sa rieši v trigger scriptoch
    
    var groupName = utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.groupName);
    var chatId = utils.safeGet(telegramGroup, CONFIG.fields.telegramGroups.chatId);
    
    utils.addDebug(currentEntry, "  • Skupina: " + groupName);
    utils.addDebug(currentEntry, "  • Chat ID: " + chatId);
    
    return true;
}

// ODSTRÁNENÉ: checkTimeRestrictions funkcia - časové obmedzenia sa kontrolujú v trigger scriptoch

function extractData(libraryConfig) {
    try {
        if (libraryConfig.dataExtractor) {
            return libraryConfig.dataExtractor(currentEntry, libraryConfig.fields);
        }
        
        // Default extractor - získa všetky definované polia
        var data = {};
        for (var fieldKey in libraryConfig.fields) {
            if (libraryConfig.fields.hasOwnProperty(fieldKey)) {
                var fieldName = libraryConfig.fields[fieldKey];
                data[fieldKey] = utils.safeGet(currentEntry, fieldName);
            }
        }
        return data;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "extractData", error);
        return null;
    }
}

function formatMessage(libraryConfig, data) {
    try {
        if (libraryConfig.formatFunction) {
            return libraryConfig.formatFunction(data, currentEntry);
        }
        
        // Default formatter
        return formatDefaultMessage(libraryConfig.messageType, data);
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "formatMessage", error);
        return null;
    }
}

function createNotification(params) {
    try {
        var notifLib = libByName(CONFIG.libraries.notifications);
        if (!notifLib) {
            utils.addError(currentEntry, "Knižnica " + CONFIG.libraries.notifications + " nenájdená", "createNotification");
            return null;
        }
        
        var notification = notifLib.create({});
        
        // Základné polia
        notification.set(CONFIG.fields.notifications.status, "Čaká");
        notification.set(CONFIG.fields.notifications.priority, 
            utils.safeGet(params.telegramGroup, CONFIG.fields.telegramGroups.messagePriority, "Normálna"));
        notification.set(CONFIG.fields.notifications.messageType, params.libraryConfig.messageType);
        notification.set(CONFIG.fields.notifications.messageSource, "Automatická");
        notification.set(CONFIG.fields.notifications.formatting, "HTML");
        
        // Telegram polia
        notification.set(CONFIG.fields.notifications.chatId, 
            utils.safeGet(params.telegramGroup, CONFIG.fields.telegramGroups.chatId));
        
        var threadId = utils.safeGet(params.telegramGroup, CONFIG.fields.telegramGroups.threadId);
        if (threadId) {
            notification.set(CONFIG.fields.notifications.threadId, threadId);
        }
        
        // Obsah
        notification.set(CONFIG.fields.notifications.message, params.message);
        
        // Prepojenia
        notification.set(CONFIG.fields.notifications.groupOrTopic, params.telegramGroup);
        
        // Info pole
        var infoMsg = createNotificationInfo(params);
        notification.set(CONFIG.fields.common.info, infoMsg);
        
        return notification;
        
    } catch (error) {
        utils.addError(currentEntry, error.toString(), "createNotification", error);
        return null;
    }
}

function createNotificationInfo(params) {
    var info = "📋 NOTIFIKÁCIA - " + params.libraryConfig.messageType.toUpperCase() + "\n";
    info += "Vytvorené: " + moment().format("DD.MM.YYYY HH:mm:ss") + "\n";
    info += "Zdrojová knižnica: " + lib().title + "\n";
    info += "Zdrojový záznam: #" + currentEntry.field("ID") + "\n";
    info += "Skupina: " + utils.safeGet(params.telegramGroup, CONFIG.fields.telegramGroups.groupName) + "\n";
    info += "Chat ID: " + utils.safeGet(params.telegramGroup, CONFIG.fields.telegramGroups.chatId) + "\n";
    
    var threadId = utils.safeGet(params.telegramGroup, CONFIG.fields.telegramGroups.threadId);
    if (threadId) {
        info += "Thread ID: " + threadId + "\n";
    }
    
    return info;
}

// ==============================================
// DATA EXTRACTORS - Pre každý typ knižnice
// ==============================================

function extractAttendanceData(entry, fields) {
    return {
        date: utils.safeGet(entry, fields.date),
        arrival: utils.safeGet(entry, fields.arrival),
        departure: utils.safeGet(entry, fields.departure),
        employees: utils.safeGet(entry, fields.employees, []),
        workedHours: utils.safeGet(entry, fields.workedHours, 0),
        wageCosts: utils.safeGet(entry, fields.wageCosts, 0),
        workTime: utils.safeGet(entry, fields.workTime, 0),
        employeeCount: utils.safeGet(entry, fields.employeeCount, 0)
    };
}

function extractWorkRecordData(entry, fields) {
    return {
        date: utils.safeGet(entry, fields.date),
        customer: utils.safeGet(entry, fields.customer),
        timeInterval: utils.safeGet(entry, fields.timeInterval),
        employees: utils.safeGet(entry, fields.employees, []),
        workDescription: utils.safeGet(entry, fields.workDescription),
        workedHours: utils.safeGet(entry, fields.workedHours, 0),
        wageCosts: utils.safeGet(entry, fields.wageCosts, 0),
        hzsSum: utils.safeGet(entry, fields.hzsSum, 0)
    };
}

function extractBookOfRidesData(entry, fields) {
    return {
        date: utils.safeGet(entry, fields.date),
        rideType: utils.safeGet(entry, fields.rideType),
        vehicle: utils.safeGet(entry, fields.vehicle),
        driver: utils.safeGet(entry, fields.driver),
        crew: utils.safeGet(entry, fields.crew, []),
        km: utils.safeGet(entry, fields.km, 0),
        totalTime: utils.safeGet(entry, fields.totalTime, 0),
        start: utils.safeGet(entry, fields.start),
        destination: utils.safeGet(entry, fields.destination),
        customers: utils.safeGet(entry, fields.customers, [])
    };
}

function extractObligationsData(entry, fields) {
    return {
        state: utils.safeGet(entry, fields.state),
        date: utils.safeGet(entry, fields.date),
        type: utils.safeGet(entry, fields.type),
        employee: utils.safeGet(entry, fields.employee),
        creditor: utils.safeGet(entry, fields.creditor),
        amount: utils.safeGet(entry, fields.amount, 0),
        paid: utils.safeGet(entry, fields.paid, 0),
        balance: utils.safeGet(entry, fields.balance, 0),
        description: utils.safeGet(entry, fields.description)
    };
}

function extractCashRegisterData(entry, fields) {
    return {
        date: utils.safeGet(entry, fields.date),
        movement: utils.safeGet(entry, fields.movement),
        fromCashRegister: utils.safeGet(entry, fields.fromCashRegister),
        toCashRegister: utils.safeGet(entry, fields.toCashRegister),
        amount: utils.safeGet(entry, "Suma", 0), // Toto pole asi chýba v configu
        purpose: utils.safeGet(entry, fields.transferPurpose),
        employee: utils.safeGet(entry, fields.employee),
        customer: utils.safeGet(entry, fields.customer)
    };
}

// ==============================================
// MESSAGE FORMATTERS - Pre každý typ knižnice
// ==============================================

function formatAttendanceMessage(data, entry) {
    var msg = "📋 *DOCHÁDZKA*\n";
    msg += "═══════════════\n\n";
    
    msg += "📅 *Dátum:* " + utils.formatDate(data.date) + " (" + utils.getDayNameSK(moment(data.date).day()) + ")\n";
    
    if (data.arrival && data.departure) {
        msg += "⏰ *Čas:* " + utils.formatTime(data.arrival) + " - " + utils.formatTime(data.departure) + "\n";
    }
    
    msg += "⏱️ *Odpracované:* " + data.workedHours.toFixed(2) + " hodín\n";
    
    if (data.employees && data.employees.length > 0) {
        msg += "\n👥 *Zamestnanci* (" + data.employees.length + "):\n";
        for (var i = 0; i < data.employees.length; i++) {
            msg += "• " + escapeMarkdown(utils.formatEmployeeName(data.employees[i])) + "\n";
        }
    }
    
    msg += "\n💰 *Mzdové náklady:* " + utils.formatMoney(data.wageCosts) + "\n";
    msg += "\n📝 _Záznam #" + entry.field("ID") + "_";
    
    return msg;
}

function formatWorkRecordMessage(data, entry) {
    var msg = "🔨 *ZÁZNAM PRÁCE*\n";
    msg += "═══════════════\n\n";
    
    msg += "📅 *Dátum:* " + utils.formatDate(data.date) + "\n";
    
    if (data.customer) {
        var customerName = typeof data.customer === 'object' ? 
            utils.safeGet(data.customer, "Názov", "Neznámy") : data.customer;
        msg += "🏢 *Zákazka:* " + escapeMarkdown(customerName) + "\n";
    }
    
    if (data.timeInterval) {
        msg += "⏰ *Čas:* " + data.timeInterval + "\n";
    }
    
    msg += "⏱️ *Odpracované:* " + data.workedHours.toFixed(2) + " hodín\n";
    
    if (data.workDescription) {
        msg += "\n📝 *Popis:* " + escapeMarkdown(data.workDescription) + "\n";
    }
    
    if (data.employees && data.employees.length > 0) {
        msg += "\n👥 *Pracovníci* (" + data.employees.length + "):\n";
        for (var i = 0; i < data.employees.length; i++) {
            msg += "• " + escapeMarkdown(utils.formatEmployeeName(data.employees[i])) + "\n";
        }
    }
    
    msg += "\n💰 *HZS suma:* " + utils.formatMoney(data.hzsSum) + "\n";
    msg += "\n📝 _Záznam #" + entry.field("ID") + "_";
    
    return msg;
}

function formatBookOfRidesMessage(data, entry) {
    var msg = "🚗 *KNIHA JÁZD*\n";
    msg += "═══════════════\n\n";
    
    msg += "📅 *Dátum:* " + utils.formatDate(data.date) + "\n";
    msg += "🏷️ *Typ:* " + (data.rideType || "Neurčený") + "\n";
    
    if (data.vehicle) {
        var vehicleName = typeof data.vehicle === 'object' ? 
            utils.safeGet(data.vehicle, "Názov", "Neznáme") : data.vehicle;
        msg += "🚗 *Vozidlo:* " + escapeMarkdown(vehicleName) + "\n";
    }
    
    if (data.driver) {
        msg += "👤 *Vodič:* " + escapeMarkdown(utils.formatEmployeeName(data.driver)) + "\n";
    }
    
    msg += "📍 *Trasa:* " + escapeMarkdown(formatLocation(data.start)) + 
           " → " + escapeMarkdown(formatLocation(data.destination)) + "\n";
    msg += "📏 *Vzdialenosť:* " + data.km + " km\n";
    msg += "⏱️ *Čas jazdy:* " + data.totalTime.toFixed(2) + " hodín\n";
    
    if (data.crew && data.crew.length > 0) {
        msg += "\n👥 *Posádka* (" + data.crew.length + "):\n";
        for (var i = 0; i < data.crew.length; i++) {
            msg += "• " + escapeMarkdown(utils.formatEmployeeName(data.crew[i])) + "\n";
        }
    }
    
    msg += "\n📝 _Záznam #" + entry.field("ID") + "_";
    
    return msg;
}

function formatObligationsMessage(data, entry) {
    var msg = "💳 *ZÁVÄZKY*\n";
    msg += "═══════════════\n\n";
    
    msg += "📅 *Dátum:* " + utils.formatDate(data.date) + "\n";
    msg += "🏷️ *Typ:* " + (data.type || "Neurčený") + "\n";
    msg += "📊 *Stav:* " + (data.state || "Neurčený") + "\n";
    
    if (data.employee) {
        msg += "👤 *Zamestnanec:* " + escapeMarkdown(utils.formatEmployeeName(data.employee)) + "\n";
    }
    
    if (data.creditor) {
        var creditorName = typeof data.creditor === 'object' ? 
            utils.safeGet(data.creditor, "Názov", "Neznámy") : data.creditor;
        msg += "🏢 *Veriteľ:* " + escapeMarkdown(creditorName) + "\n";
    }
    
    msg += "\n💰 *Suma:* " + utils.formatMoney(data.amount) + "\n";
    msg += "✅ *Zaplatené:* " + utils.formatMoney(data.paid) + "\n";
    msg += "📊 *Zostatok:* " + utils.formatMoney(data.balance) + "\n";
    
    if (data.description) {
        msg += "\n📝 *Popis:* " + escapeMarkdown(data.description) + "\n";
    }
    
    msg += "\n📝 _Záznam #" + entry.field("ID") + "_";
    
    return msg;
}

function formatCashRegisterMessage(data, entry) {
    var msg = "💵 *POKLADŇA*\n";
    msg += "═══════════════\n\n";
    
    msg += "📅 *Dátum:* " + utils.formatDate(data.date) + "\n";
    msg += "🔄 *Pohyb:* " + (data.movement || "Neurčený") + "\n";
    
    if (data.fromCashRegister) {
        msg += "📤 *Z:* " + escapeMarkdown(getCashRegisterName(data.fromCashRegister)) + "\n";
    }
    
    if (data.toCashRegister) {
        msg += "📥 *Do:* " + escapeMarkdown(getCashRegisterName(data.toCashRegister)) + "\n";
    }
    
    msg += "💰 *Suma:* " + utils.formatMoney(data.amount) + "\n";
    
    if (data.purpose) {
        msg += "📋 *Účel:* " + escapeMarkdown(data.purpose) + "\n";
    }
    
    if (data.employee) {
        msg += "👤 *Zamestnanec:* " + escapeMarkdown(utils.formatEmployeeName(data.employee)) + "\n";
    }
    
    if (data.customer) {
        var customerName = typeof data.customer === 'object' ? 
            utils.safeGet(data.customer, "Názov", "Neznámy") : data.customer;
        msg += "🏢 *Zákazka:* " + escapeMarkdown(customerName) + "\n";
    }
    
    msg += "\n📝 _Záznam #" + entry.field("ID") + "_";
    
    return msg;
}

function formatDefaultMessage(messageType, data) {
    var msg = "📋 *" + messageType.toUpperCase() + "*\n";
    msg += "═══════════════\n\n";
    
    // Vypiš všetky neprázdne hodnoty
    for (var key in data) {
        if (data.hasOwnProperty(key) && data[key] !== null && data[key] !== undefined && data[key] !== "") {
            var label = key.charAt(0).toUpperCase() + key.slice(1);
            var value = data[key];
            
            if (typeof value === 'object' && value.constructor === Date) {
                value = utils.formatDate(value);
            } else if (typeof value === 'number') {
                value = value.toFixed(2);
            } else if (typeof value === 'object') {
                continue; // Preskočiť komplexné objekty
            }
            
            msg += "*" + label + ":* " + escapeMarkdown(String(value)) + "\n";
        }
    }
    
    msg += "\n📝 _Záznam #" + currentEntry.field("ID") + "_";
    
    return msg;
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

function escapeMarkdown(text) {
    if (!text) return "";
    
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
        .replace(/#/g, "\\#");
}

function formatLocation(location) {
    if (!location) return "Neurčené";
    
    if (typeof location === 'object') {
        return utils.safeGet(location, "Adresa", "Neurčené");
    }
    
    return location;
}

function getCashRegisterName(cashRegister) {
    if (!cashRegister) return "Neurčená";
    
    if (typeof cashRegister === 'object') {
        return utils.safeGet(cashRegister, "Názov", "Neurčená");
    }
    
    return cashRegister;
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

// Kontrola závislostí pred spustením
var dependencyCheck = utils.checkDependencies(['config', 'core']);
if (!dependencyCheck.success) {
    message("❌ Chýbajú potrebné moduly: " + dependencyCheck.missing.join(", "));
    cancel();
}

// Spustenie hlavnej funkcie
var result = main();

// Ak hlavná funkcia zlyhala, zaloguj ale neprerušuj uloženie (After Save)
if (!result) {
    utils.addError(currentEntry, "Script zlyhal ale záznam bol uložený", "main");
}