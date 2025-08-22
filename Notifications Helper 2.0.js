// ==============================================
// MEMENTO DATABASE - ASISTANTO NOTIFICATIONS HELPER
// Verzia: 2.0 | Dátum: 20.08.2025 | Autor: ASISTANTO
// Knižnica: ASISTANTO Notifications | Typ: Helper Script
// ==============================================
// 🔄 REFAKTOROVANÁ VERZIA v2.0:
//    - Optimalizovaná CONFIG štruktúra s field mappings
//    - Integrácia s MementoUtils 3.3 patterns
//    - Odstránené duplicitné funkcie
//    - Enhanced validation system
//    - Pripravené pre ASISTANTO Telegram.js segregáciu
//    - Zachovaná plná backward compatibility
// ==============================================
// 📋 CORE FUNKCIE:
//    - Vytváranie a správa notifikácií
//    - Template systém pre rôzne typy správ
//    - Bulk operácie a batch processing
//    - Enhanced validation a error handling
//    - Integration s MementoUtils knižnicou
// ==============================================

// Lazy loading MementoUtils
var utils = null;

function getUtils() {
    if (!utils) {
        try {
            if (typeof MementoUtils !== 'undefined') {
                utils = MementoUtils;
            } else {
                throw new Error("⚠️ MementoUtils knižnica nie je dostupná!");
            }
        } catch(e) {
            showError("⚠️ MementoUtils nie je načítané. Script nemôže pokračovať.", e);
            cancel();
        }
    }
    return utils;
}


// ==============================================
// KONFIGURÁCIA A FIELD MAPPINGS
// ==============================================

// ==============================================
// KONFIGURÁCIA A FIELD MAPPINGS
// ==============================================

var CONFIG = (function() {
    // Try to use centralized config
    if (typeof MementoConfigAdapter !== 'undefined') {
        try {
            return MementoConfigAdapter.getAdapter('notifications');
        } catch (e) {
            // Fallback to local config
        }
    }
    
    // Fallback to original config
    return {
        debug: true,
        version: "2.0",
        scriptName: "Notifications Helper",
        
        // Statické libraries namiesto gettera
        libraries: {
            notifications: "Notifications",
            telegramGroups: "Telegram Groups",
            api: "ASISTANTO API",
            defaults: "ASISTANTO Defaults",
            employees: "Zamestnanci",
            clients: "Klienti",
            partners: "Partneri",
            orders: "Zákazky"
        },
        
        validation: {
            required: ['sprava'],
            optional: ['predmet', 'priorita', 'adresat', 'formatovanie'],
            maxRetries: 3,
            timeoutMs: 30000
        },
        
        businessRules: {
            defaultPriority: "Normálna",
            defaultFormatting: "Markdown",
            defaultSource: "Automatická",
            defaultType: "Systémová"
        }
    };
})();

// Field mappings z centralizovaného config
var FIELD_MAPPINGS = (function() {
    if (typeof MementoConfig !== 'undefined') {
        try {
            MementoConfig.init();
            return MementoConfig.getFieldMappings();
        } catch (e) {
            // Use adapter
            if (typeof MementoConfigAdapter !== 'undefined') {
                var cfg = MementoConfigAdapter.getConfig();
                if (cfg) {
                    return cfg.getFieldMappings();
                }
            }
        }
    }
    
    // Fallback to original mappings
    return {
        notifications: {
        // Hlavná sekcia
        type: "Typ správy",
        source: "Zdroj správy",
        subject: "Predmet", 
        message: "Správa",
        attachment: "Príloha",
        formatting: "Formátovanie",
        status: "Status",
        priority: "Priorita",
        addressee: "Adresát",
        info: "info",
        
        // Cieľové prepojenia
        groupTopic: "Skupina/Téma",
        employee: "Zamestnanec",
        client: "Klient", 
        partner: "Partner",
        order: "Zákazka",
        
        // Časovanie
        sendAt: "Poslať o",
        expireAt: "Vypršať o", 
        repeat: "Opakovať",
        created: "Vytvorené",
        creator: "Vytvoril",
        
        // Telegram špecifické
        telegramId: "Telegram ID",
        chatId: "Chat ID",
        threadId: "Thread ID",
        messageId: "Message ID",
        messageUrl: "Message URL",
        
        // Response tracking
        sentAt: "Odoslané o",
        retryCount: "Pokusov o odoslanie", 
        lastError: "Posledná chyba",
        responseData: "Response Data",
        
        // Metadata
        sourceLibrary: "Zdrojová knižnica",
        sourceId: "Zdrojový ID",
        
        // Debug
        debugLog: "Debug_Log",
        errorLog: "Error_Log"
    },
    
    // Telegram Groups polia
    telegramGroups: {
        chatId: "Chat ID",
        threadId: "Thread ID", 
        groupName: "Názov skupiny",
        threadName: "Názov témy",
        workingHoursEnabled: "Povoliť notifikácie",
        workingHoursFrom: "Pracovný čas od",
        workingHoursTo: "Pracovný čas do", 
        weekendEnabled: "Víkend povolený",
        dailyLimit: "Denný limit správ",
        sentToday: "Počet správ dnes",
        silentMode: "Tichá správa"
    },
    
    // Employee polia
    employees: {
        nick: "Nick",
        name: "Meno", 
        surname: "Priezvisko",
        telegramId: "Telegram ID",
        telegramEnabled: "telegram",
        email: "Email",
        phone: "Telefón"
    }
    };
})();





/**
 * Možnosti pre dropdown polia
 */
var FIELD_OPTIONS = {
    type: ["Dochádzka", "Záznam prác", "Kniha jázd", "ToDo", "Manuálna", "Systémová", "Zákazka", "Faktúra", "Platba"],
    source: ["Automatická", "Manuálna", "Naplánovaná", "Trigger", "API"],
    formatting: ["Obyčajný text", "Markdown", "HTML"],
    priority: ["Nízka", "Normálna", "Vysoká", "Urgentná"],
    addressee: ["Zamestnanec", "Klient", "Partner", "Skupina", "Skupina-Téma", "Zákazka"],
    repeat: ["Nie", "Každý deň", "Každý týždeň", "Každý mesiac", "Každý rok"],
    status: ["Čaká", "Odoslané", "Zlyhalo", "Zrušené", "Vypršané"]
};

// ==============================================
// UTILITY FUNKCIE
// ==============================================

/**
 * Získa názov poľa z mapping objektu
 * @param {string} library - Názov knižnice (notifications, telegramGroups, employees)
 * @param {string} field - Kľúč poľa
 * @returns {string} - Skutočný názov poľa
 */
function getFieldName(library, field) {
    if (!FIELD_MAPPINGS[library] || !FIELD_MAPPINGS[library][field]) {
        utils.addError(entry(), "Neznáme pole: " + library + "." + field, CONFIG.scriptName);
        return field; // Fallback na pôvodný názov
    }
    return FIELD_MAPPINGS[library][field];
}

/**
 * Safe field access s použitím mappings
 * @param {Entry} entry - Entry objekt
 * @param {string} library - Názov knižnice
 * @param {string} field - Kľúč poľa
 * @param {*} defaultValue - Default hodnota
 * @returns {*} - Hodnota poľa alebo default
 */
function safeFieldGet(entry, library, field, defaultValue) {
    var fieldName = getFieldName(library, field);
    return utils.safeFieldAccess(entry, fieldName, defaultValue);
}

/**
 * Safe field set s použitím mappings
 * @param {Entry} entry - Entry objekt
 * @param {string} library - Názov knižnice
 * @param {string} field - Kľúč poľa
 * @param {*} value - Hodnota na nastavenie
 * @returns {boolean} - Úspech operácie
 */
function safeFieldSet(entry, library, field, value) {
    var fieldName = getFieldName(library, field);
    return utils.safeSet(entry, fieldName, value);
}

// ==============================================
// ENHANCED VALIDATION SYSTEM
// ==============================================

/**
 * Kompletná validácia notification dát
 * @param {Object} data - Dáta na validáciu
 * @returns {Object} - Validačný výsledok {valid: boolean, errors: Array, warnings: Array}
 */
function validateNotificationData(data) {
    var result = {
        valid: true,
        errors: [],
        warnings: [],
        sanitized: {}
    };
    
    try {
        utils.addDebug(entry(), "🔍 Validating notification data");
        
        // Validácia povinných polí
        // for (var i = 0; i < CONFIG.validation.required.length; i++) {
        //     var field = CONFIG.validation.required[i];
        //     if (!data[field] || data[field] === "") {
        //         result.errors.push("Povinné pole '" + field + "' chýba alebo je prázdne");
        //         result.valid = false;
        //     }
        // }
        
        // Validácia typov správ
        if (data.typSpravy && FIELD_OPTIONS.type.indexOf(data.typSpravy) === -1) {
            result.errors.push("Neplatný typ správy: " + data.typSpravy);
            result.valid = false;
        }
        
        // Validácia priority
        if (data.priorita && FIELD_OPTIONS.priority.indexOf(data.priorita) === -1) {
            result.errors.push("Neplatná priorita: " + data.priorita);
            result.valid = false;
        }
        
        // Validácia adresáta
        if (data.adresat && FIELD_OPTIONS.addressee.indexOf(data.adresat) === -1) {
            result.errors.push("Neplatný typ adresáta: " + data.adresat);
            result.valid = false;
        }
        
        // Validácia cross-field konzistencie
        if (data.adresat === "Zamestnanec" && (!data.zamestnanec || data.zamestnanec.length === 0)) {
            result.errors.push("Pre adresáta 'Zamestnanec' je potrebné vyplniť pole 'zamestnanec'");
            result.valid = false;
        }
        
        if (data.adresat === "Skupina" && (!data.skupinaTema || data.skupinaTema.length === 0)) {
            result.errors.push("Pre adresáta 'Skupina' je potrebné vyplniť pole 'skupinaTema'");
            result.valid = false;
        }
        
        // Sanitizácia a default hodnoty
        result.sanitized = {
            // typSpravy: data.typSpravy || CONFIG.businessRules.defaultType,
            // zdrojSpravy: data.zdrojSpravy || CONFIG.businessRules.defaultSource,
            // sprava: data.sprava || "",
            // formatovanie: data.formatovanie || CONFIG.businessRules.defaultFormatting,
            // priorita: data.priorita || CONFIG.businessRules.defaultPriority,
            // status: data.status || "Čaká",
            
            // Časové polia
            vytvorene: data.vytvorene || moment().toDate(),
            vytvoril: data.vytvoril || user(),
            
            // Metadata
            zdrojovaKniznica: data.zdrojovaKniznica || lib().title,
            zdrojovyId: data.zdrojovyId || entry().field("ID")
        };
        
        // Kopírovanie voliteľných polí
        var optionalFields = ['predmet', 'priloha', 'adresat', 'poslatO', 'vyprsat', 'opakovat'];
        for (var j = 0; j < optionalFields.length; j++) {
            var optField = optionalFields[j];
            if (data[optField] !== undefined && data[optField] !== null) {
                result.sanitized[optField] = data[optField];
            }
        }
        
        // Kopírovanie cieľových prepojení
        var linkFields = ['zamestnanec', 'klient', 'partner', 'skupinaTema', 'zakazka'];
        for (var k = 0; k < linkFields.length; k++) {
            var linkField = linkFields[k];
            if (data[linkField]) {
                result.sanitized[linkField] = data[linkField];
            }
        }
        
        if (result.valid) {
            utils.addDebug(entry(), "✅ Validation passed");
        } else {
            utils.addDebug(entry(), "❌ Validation failed: " + result.errors.length + " errors");
        }
        
    } catch (error) {
        result.valid = false;
        result.errors.push("Chyba pri validácii: " + error.toString() + "Line: " + error.lineNumber);
        utils.addError(entry(), "Validation error: " + error.toString() + "Line: " + error.lineNumber, CONFIG.scriptName);
    }
    
    return result;
}

/**
 * Validácia business pravidiel pre notification
 * @param {Entry} notificationEntry - Notification entry
 * @returns {Object} - Validačný výsledok
 */
function validateBusinessRules(notificationEntry) {
    var result = {
        valid: true,
        errors: [],
        warnings: []
    };
    
    try {
        // Validácia working hours (ak je nastavené časovanie)
        var sendAt = safeFieldGet(notificationEntry, 'notifications', 'sendAt');
        if (sendAt) {
            var sendTime = moment(sendAt);
            var now = moment();
            
            if (sendTime.isBefore(now)) {
                result.warnings.push("Čas odoslania je v minulosti");
            }
            
            // Kontrola working hours
            var dayOfWeek = sendTime.day();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                result.warnings.push("Naplánované odoslanie je cez víkend");
            }
        }
        
        // Validácia expiration
        var expireAt = safeFieldGet(notificationEntry, 'notifications', 'expireAt');
        if (expireAt && sendAt) {
            if (moment(expireAt).isBefore(moment(sendAt))) {
                result.errors.push("Čas vypršania nemôže byť pred časom odoslania");
                result.valid = false;
            }
        }
        
    } catch (error) {
        result.errors.push("Chyba pri validácii business pravidiel: " + error.toString());
        result.valid = false;
    }
    
    return result;
}

// ==============================================
// CORE NOTIFICATION FUNCTIONS
// ==============================================

/**
 * Vytvorí nový záznam notifikácie s predvyplnenými údajmi
 * @param {Object} data - Dáta pre notifikáciu
 * @param {string} data.sprava - Povinný text správy
 * @param {string} [data.predmet] - Voliteľný predmet správy
 * @param {string} [data.priorita="Normálna"] - Priorita správy
 * @param {string} [data.adresat] - Typ adresáta
 * @param {Array} [data.zamestnanec] - Pole zamestnancov (ak adresat = "Zamestnanec")
 * @param {Array} [data.skupinaTema] - Pole skupín/tém (ak adresat = "Skupina")
 * @returns {Entry|null} - Vytvorený záznam alebo null pri chybe
 * @example
 * var notif = ASISTANTONotifications.createNotification({
 *     sprava: "Test správa",
 *     priorita: "Vysoká",
 *     adresat: "Zamestnanec",
 *     zamestnanec: [employeeEntry]
 * });
 */
function createNotification(data) {
    try {
        utils.addDebug(entry(), "📝 Vytváranie novej notifikácie v" + CONFIG.version);
        
        // Validácia vstupných dát
        var validation = validateNotificationData(data);
        if (!validation.valid) {
            utils.addError(entry(), "Validácia zlyhala: " + validation.errors.join(", "), "createNotification");
            return null;
        }
        
        // Získanie knižnice
        var notifLib = libByName(CONFIG.libraries.notifications);
        if (!notifLib) {
            utils.addError(entry(), "Knižnica " + CONFIG.libraries.notifications + " nenájdená", "createNotification");
            return null;
        }
        
        // Príprava notification data objektu s mapovanými názvami polí
        var notificationData = {};
        
        // Mapovanie základných polí
        notificationData[getFieldName('notifications', 'type')] = validation.sanitized.typSpravy;
        notificationData[getFieldName('notifications', 'source')] = validation.sanitized.zdrojSpravy;
        notificationData[getFieldName('notifications', 'message')] = validation.sanitized.sprava;
        notificationData[getFieldName('notifications', 'status')] = validation.sanitized.status;
        notificationData[getFieldName('notifications', 'formatting')] = validation.sanitized.formatovanie;
        notificationData[getFieldName('notifications', 'priority')] = validation.sanitized.priorita;
        notificationData[getFieldName('notifications', 'creator')] = validation.sanitized.vytvoril;
        notificationData[getFieldName('notifications', 'created')] = validation.sanitized.vytvorene;
        notificationData[getFieldName('notifications', 'sourceLibrary')] = validation.sanitized.zdrojovaKniznica;
        notificationData[getFieldName('notifications', 'sourceId')] = validation.sanitized.zdrojovyId;
        
        // Voliteľné polia
        if (validation.sanitized.predmet) {
            notificationData[getFieldName('notifications', 'subject')] = validation.sanitized.predmet;
        }
        if (validation.sanitized.priloha) {
            notificationData[getFieldName('notifications', 'attachment')] = validation.sanitized.priloha;
        }
        if (validation.sanitized.adresat) {
            notificationData[getFieldName('notifications', 'addressee')] = validation.sanitized.adresat;
        }
        
        // Časovanie
        if (validation.sanitized.poslatO) {
            notificationData[getFieldName('notifications', 'sendAt')] = validation.sanitized.poslatO;
        }
        if (validation.sanitized.vyprsat) {
            notificationData[getFieldName('notifications', 'expireAt')] = validation.sanitized.vyprsat;
        }
        if (validation.sanitized.opakovat) {
            notificationData[getFieldName('notifications', 'repeat')] = validation.sanitized.opakovat;
        }
        
        // Cieľové prepojenia
        if (validation.sanitized.zamestnanec) {
            notificationData[getFieldName('notifications', 'employee')] = validation.sanitized.zamestnanec;
        }
        if (validation.sanitized.klient) {
            notificationData[getFieldName('notifications', 'client')] = validation.sanitized.klient;
        }
        if (validation.sanitized.partner) {
            notificationData[getFieldName('notifications', 'partner')] = validation.sanitized.partner;
        }
        if (validation.sanitized.skupinaTema) {
            notificationData[getFieldName('notifications', 'groupTopic')] = validation.sanitized.skupinaTema;
        }
        if (validation.sanitized.zakazka) {
            notificationData[getFieldName('notifications', 'order')] = validation.sanitized.zakazka;
        }
        
        // Info záznam
        var infoText = utils.formatDate(new Date()) + " | Vytvorené automaticky\n";
        infoText += "Zdroj: " + validation.sanitized.zdrojovaKniznica + " #" + validation.sanitized.zdrojovyId + "\n";
        infoText += "Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n";
        infoText += "Typ: " + validation.sanitized.typSpravy + " | Priorita: " + validation.sanitized.priorita;
        
        notificationData[getFieldName('notifications', 'info')] = infoText;
        
        // Vytvorenie záznamu
        var newNotification = notifLib.create(notificationData);
        
        if (newNotification) {
            utils.addDebug(entry(), "✅ Notifikácia vytvorená: ID #" + newNotification.field("ID"));
            
            // Business rules validation na vytvorenom zázname
            var businessValidation = validateBusinessRules(newNotification);
            if (businessValidation.warnings.length > 0) {
                utils.addDebug(entry(), "⚠️ Business warnings: " + businessValidation.warnings.join(", "));
            }
            
            // Pridanie info záznamu do novej notifikácie
            utils.addInfo(newNotification, "Notifikácia vytvorená pomocou Helper scriptu v" + CONFIG.version, {
                sourceEntry: validation.sanitized.zdrojovyId,
                sourceLibrary: validation.sanitized.zdrojovaKniznica,
                addresseeType: validation.sanitized.adresat || "N/A",
                priority: validation.sanitized.priorita
            });
        }
        
        return newNotification;
        
    } catch (error) {
        utils.addError(entry(), "Chyba pri vytváraní notifikácie: " + error.toString() + "line: " +error.lineNumber , "createNotification");
        return null;
    }
}

/**
 * Vytvorí notifikácie pre viacerých adresátov (bulk operácia)
 * @param {Object} baseData - Základné dáta pre všetky notifikácie  
 * @param {Array} recipients - Pole adresátov (Entry objekty alebo Chat ID stringy)
 * @returns {Array} - Pole vytvorených notifikácií
 * @example
 * var baseData = {
 *     sprava: "Hromadná správa pre všetkých",
 *     priorita: "Vysoká"
 * };
 * var employees = lib("Zamestnanci").find("Status", "Aktívny");
 * var notifications = ASISTANTONotifications.createBulkNotifications(baseData, employees);
 */
function createBulkNotifications(baseData, recipients) {
    var created = [];
    var failed = 0;
    
    try {
        utils.addDebug(entry(), "📢 Vytváranie bulk notifikácií pre " + recipients.length + " adresátov");
        
        for (var i = 0; i < recipients.length; i++) {
            var recipient = recipients[i];
            var notifData = {};
            
            // Kopírovanie base data
            for (var key in baseData) {
                if (baseData.hasOwnProperty(key)) {
                    notifData[key] = baseData[key];
                }
            }
            
            // Determine recipient type a prispôsobenie dát
            if (recipient && typeof recipient === 'object' && recipient.field) {
                // Je to Entry objekt
                if (recipient.field("Nick")) {
                    // Je to zamestnanec
                    notifData.adresat = "Zamestnanec";
                    notifData.zamestnanec = [recipient];
                    
                    // Personalizácia správy
                    if (notifData.sprava) {
                        notifData.sprava = personalizeMessage(notifData.sprava, recipient);
                    }
                    
                } else if (recipient.field("Názov")) {
                    // Je to klient, partner alebo organizácia
                    var libTitle = recipient.lib().title;
                    if (libTitle === "Klienti") {
                        notifData.adresat = "Klient";
                        notifData.klient = [recipient];
                    } else if (libTitle === "Partneri") {
                        notifData.adresat = "Partner";
                        notifData.partner = [recipient];
                    } else if (libTitle.indexOf("Telegram") !== -1) {
                        notifData.adresat = "Skupina";
                        notifData.skupinaTema = [recipient];
                    }
                    
                } else if (recipient.field("Chat ID")) {
                    // Je to Telegram skupina
                    notifData.adresat = "Skupina";
                    notifData.skupinaTema = [recipient];
                }
                
            } else if (typeof recipient === "string") {
                // Je to priamo Chat ID
                notifData.adresat = "Skupina";
                notifData.chatId = recipient;
            }
            
            // Vytvorenie notifikácie
            var notif = createNotification(notifData);
            if (notif) {
                created.push(notif);
            } else {
                failed++;
            }
        }
        
        utils.addDebug(entry(), "✅ Bulk operácia dokončená: " + created.length + " úspešných, " + failed + " neúspešných");
        
        // Pridanie súhrnného info záznamu
        if (created.length > 0) {
            utils.addInfo(entry(), "Bulk notifikácie vytvorené", {
                total: recipients.length,
                successful: created.length,
                failed: failed,
                messageType: baseData.typSpravy || "N/A"
            });
        }
        
    } catch (error) {
        utils.addError(entry(), "Chyba pri bulk vytváraní: " + error.toString(), "createBulkNotifications");
    }
    
    return created;
}

/**
 * Personalizuje správu nahradením premenných
 * @param {string} message - Správa s premennými  
 * @param {Entry} recipient - Adresát (Entry objekt)
 * @returns {string} - Personalizovaná správa
 */
function personalizeMessage(message, recipient) {
    if (!message || !recipient) return message;
    
    try {
        // Základné premenné pre zamestnancov
        if (recipient.field("Nick")) {
            message = message.replace(/{nick}/g, safeFieldGet(recipient, 'employees', 'nick', ""));
            message = message.replace(/{meno}/g, safeFieldGet(recipient, 'employees', 'name', "")); 
            message = message.replace(/{priezvisko}/g, safeFieldGet(recipient, 'employees', 'surname', ""));
            message = message.replace(/{email}/g, safeFieldGet(recipient, 'employees', 'email', ""));
            message = message.replace(/{telefon}/g, safeFieldGet(recipient, 'employees', 'phone', ""));
        }
        
        // Firemné údaje pre klientov/partnerov
        if (recipient.field("Názov")) {
            message = message.replace(/{nazov}/g, utils.safeFieldAccess(recipient, "Názov", ""));
            message = message.replace(/{ico}/g, utils.safeFieldAccess(recipient, "IČO", ""));
            message = message.replace(/{dic}/g, utils.safeFieldAccess(recipient, "DIČ", ""));
        }
        
        // Univerzálne časové premenné
        message = message.replace(/{datum}/g, utils.formatDate(moment(), "DD.MM.YYYY"));
        message = message.replace(/{cas}/g, utils.formatDate(moment(), "HH:mm"));
        message = message.replace(/{den}/g, moment().format("dddd"));
        message = message.replace(/{mesiac}/g, moment().format("MMMM"));
        message = message.replace(/{rok}/g, moment().format("YYYY"));
        
        // Company info z defaults knižnice
        var companyName = utils.getSettings(CONFIG.libraries.defaults, "Názov firmy");
        if (companyName) {
            message = message.replace(/{firma}/g, companyName);
        }
        
    } catch (error) {
        utils.addError(entry(), "Chyba pri personalizácii správy: " + error.toString(), "personalizeMessage");
    }
    
    return message;
}

// ==============================================
// TEMPLATE SYSTEM
// ==============================================

/**
 * Vytvorí template pre dochádzku notifikáciu
 * @param {Entry} dochadzkaEntry - Záznam dochádzky
 * @returns {Object|null} - Template dáta
 */
function createDochadzkaTemplate(dochadzkaEntry) {
    try {
        var zamestnanci = utils.safeGetLinks(dochadzkaEntry, "Zamestnanci");
        var datum = utils.formatDate(dochadzkaEntry.field("Dátum"), "DD.MM.YYYY");
        var prichod = dochadzkaEntry.field("Príchod");
        var odchod = dochadzkaEntry.field("Odchod");
        
        var message = "📋 *Dochádzka zaznamenaná*\n\n";
        message += "📅 Dátum: " + datum + "\n";
        message += "⏰ Príchod: " + (prichod || "—") + "\n";
        message += "🏁 Odchod: " + (odchod || "—") + "\n";
        
        if (zamestnanci.length > 1) {
            message += "\n👥 Zamestnanci:\n";
            for (var i = 0; i < zamestnanci.length; i++) {
                message += "• " + utils.formatEmployeeName(zamestnanci[i]) + "\n";
            }
        }
        
        return {
            typSpravy: "Dochádzka",
            predmet: "Dochádzka " + datum,
            sprava: message,
            formatovanie: "Markdown",
            zdrojovaKniznica: "Dochádzka",
            zdrojovyId: dochadzkaEntry.field("ID")
        };
        
    } catch (error) {
        utils.addError(entry(), "Chyba pri vytváraní dochádzka template: " + error.toString(), "createDochadzkaTemplate");
        return null;
    }
}

/**
 * Vytvorí template pre záznam prác
 * @param {Entry} zaznamEntry - Záznam prác
 * @returns {Object|null} - Template dáta
 */
function createZaznamPracTemplate(zaznamEntry) {
    try {
        var datum = utils.formatDate(zaznamEntry.field("Dátum"), "DD.MM.YYYY");
        var zakazka = utils.safeFieldAccess(zaznamEntry.field("Zákazka"), "Číslo zákazky", "");
        var hodiny = utils.formatTime(zaznamEntry.field("Odpracované"));
        var popis = zaznamEntry.field("Vykonané práce");
        
        var message = "🔧 *Záznam prác*\n\n";
        message += "📅 Dátum: " + datum + "\n";
        message += "🏷️ Zákazka: " + zakazka + "\n";
        message += "⏱️ Odpracované: " + hodiny + "\n";
        
        if (popis) {
            message += "\n📝 Popis:\n" + popis;
        }
        
        return {
            typSpravy: "Záznam prác",
            predmet: "Práce " + datum + " - " + zakazka,
            sprava: message,
            formatovanie: "Markdown",
            zdrojovaKniznica: "Záznam prác",
            zdrojovyId: zaznamEntry.field("ID")
        };
        
    } catch (error) {
        utils.addError(entry(), "Chyba pri vytváraní záznam prác template: " + error.toString(), "createZaznamPracTemplate");
        return null;
    }
}

/**
 * Vytvorí template pre ToDo úlohu
 * @param {Object} todoData - Dáta úlohy
 * @param {string} todoData.nazov - Názov úlohy
 * @param {string} [todoData.popis] - Popis úlohy
 * @param {string} [todoData.priorita] - Priorita úlohy
 * @param {Date} [todoData.termin] - Termín splnenia
 * @returns {Object|null} - Template dáta
 */
function createTodoTemplate(todoData) {
    try {
        var priorityEmoji = {
            "Nízka": "🟢",
            "Normálna": "🟡", 
            "Vysoká": "🟠",
            "Urgentná": "🔴"
        };
        
        var message = "✅ *Nová úloha*\n\n";
        message += priorityEmoji[todoData.priorita || "Normálna"] + " Priorita: " + (todoData.priorita || "Normálna") + "\n";
        message += "📋 Úloha: " + todoData.nazov + "\n";
        
        if (todoData.popis) {
            message += "\n📝 Popis:\n" + todoData.popis + "\n";
        }
        
        if (todoData.termin) {
            message += "\n⏰ Termín: " + utils.formatDate(todoData.termin, "DD.MM.YYYY HH:mm");
        }
        
        return {
            typSpravy: "ToDo",
            predmet: todoData.nazov,
            sprava: message,
            formatovanie: "Markdown",
            priorita: todoData.priorita || "Normálna",
            vyprsat: todoData.termin
        };
        
    } catch (error) {
        utils.addError(entry(), "Chyba pri vytváraní ToDo template: " + error.toString(), "createTodoTemplate");
        return null;
    }
}

/**
 * Vytvorí template pre systémovú správu
 * @param {string} title - Názov správy
 * @param {Object} data - Dáta vo formáte key-value
 * @param {Object} [options] - Možnosti formátovania
 * @returns {Object|null} - Template dáta
 */
function createSystemTemplate(title, data, options) {
    try {
        options = options || {};
        
        var message = "ℹ️ *" + title + "*\n\n";
        
        if (data && typeof data === "object") {
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    var value = data[key];
                    
                    // Formátovanie hodnôt
                    if (value instanceof Date) {
                        value = utils.formatDate(value);
                    } else if (typeof value === "number" && key.toLowerCase().indexOf("cena") !== -1) {
                        value = utils.formatMoney(value);
                    }
                    
                    message += "• " + key + ": " + value + "\n";
                }
            }
        }
        
        if (!options.noFooter) {
            message += "\n_" + utils.formatDate(moment()) + "_";
        }
        
        return {
            typSpravy: "Systémová",
            predmet: title,
            sprava: message,
            formatovanie: "Markdown",
            priorita: options.priorita || "Normálna"
        };
        
    } catch (error) {
        utils.addError(entry(), "Chyba pri vytváraní system template: " + error.toString(), "createSystemTemplate");
        return null;
    }
}

// ==============================================
// MESSAGE FORMATTING FUNCTIONS
// ==============================================

/**
 * Formátuje správu pre Telegram s Markdown
 * @param {string} title - Názov správy
 * @param {Object} data - Dáta vo formáte key-value
 * @param {Object} [options] - Možnosti formátovania
 * @param {string} [options.emoji] - Emoji pre title
 * @param {boolean} [options.noFooter] - Nezobraziť footer
 * @returns {string} - Naformátovaná správa
 */
function formatTelegramMessage(title, data, options) {
    options = options || {};
    
    try {
        var message = "";
        
        // Emoji a title
        if (options.emoji) {
            message += options.emoji + " ";
        }
        message += "*" + escapeMarkdown(title) + "*\n\n";
        
        // Data sekcia
        if (data && typeof data === "object") {
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    var value = data[key];
                    
                    // Formátovanie hodnôt
                    if (value instanceof Date) {
                        value = utils.formatDate(value);
                    } else if (typeof value === "number" && key.toLowerCase().indexOf("cena") !== -1) {
                        value = utils.formatMoney(value);
                    }
                    
                    message += "• " + escapeMarkdown(key) + ": " + escapeMarkdown(value.toString()) + "\n";
                }
            }
        }
        
        // Footer s časom
        if (!options.noFooter) {
            message += "\n_" + utils.formatDate(moment()) + "_";
        }
        
        return message;
        
    } catch (error) {
        utils.addError(entry(), "Chyba pri formátovaní Telegram správy: " + error.toString(), "formatTelegramMessage");
        return title; // Fallback na základný title
    }
}

/**
 * Escapuje špeciálne znaky pre Markdown
 * @param {string} text - Text na escape
 * @returns {string} - Escaped text
 */
function escapeMarkdown(text) {
    if (!text) return "";
    
    return text.toString()
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

// ==============================================
// LIFECYCLE MANAGEMENT FUNCTIONS
// ==============================================

/**
 * Zruší všetky čakajúce notifikácie pre daný zdroj
 * @param {string} sourceId - ID zdrojového záznamu
 * @param {string} [sourceLibrary] - Názov zdrojovej knižnice (default: aktuálna knižnica)
 * @returns {number} - Počet zrušených notifikácií
 */
function cancelNotificationsBySource(sourceId, sourceLibrary) {
    try {
        var notifLib = libByName(CONFIG.libraries.notifications);
        if (!notifLib) {
            utils.addError(entry(), "Notification library not found", "cancelNotificationsBySource");
            return 0;
        }
        
        sourceLibrary = sourceLibrary || lib().title;
        var cancelled = 0;
        
        utils.addDebug(entry(), "🗑️ Cancelling notifications for source: " + sourceLibrary + "#" + sourceId);
        
        // Nájdi všetky notifikácie z tohto zdroja
        var notifications = notifLib.find(getFieldName('notifications', 'sourceId'), sourceId);
        
        for (var i = 0; i < notifications.length; i++) {
            var notif = notifications[i];
            
            // Kontrola zdrojovej knižnice a statusu
            var notifSourceLib = safeFieldGet(notif, 'notifications', 'sourceLibrary', '');
            var notifStatus = safeFieldGet(notif, 'notifications', 'status', '');
            
            if (notifSourceLib === sourceLibrary && notifStatus === "Čaká") {
                
                safeFieldSet(notif, 'notifications', 'status', "Zrušené");
                
                utils.addInfo(notif, "Notifikácia zrušená", {
                    reason: "Source entry cancelled/deleted",
                    cancelledBy: user().name(),
                    originalSource: sourceLibrary + "#" + sourceId
                });
                
                cancelled++;
            }
        }
        
        utils.addDebug(entry(), "❌ Zrušených " + cancelled + " notifikácií pre zdroj #" + sourceId);
        return cancelled;
        
    } catch (error) {
        utils.addError(entry(), "Chyba pri rušení notifikácií: " + error.toString(), "cancelNotificationsBySource");
        return 0;
    }
}

/**
 * Spracuje vypršané notifikácie
 * @returns {Object} - Štatistiky spracovania {processed: number, expired: number, total: number}
 */
function processExpiredNotifications() {
    try {
        var notifLib = libByName(CONFIG.libraries.notifications);
        if (!notifLib) {
            return { processed: 0, expired: 0, total: 0, error: "Library not found" };
        }
        
        var now = moment();
        var stats = { 
            processed: 0, 
            expired: 0,
            total: 0 
        };
        
        utils.addDebug(entry(), "⏰ Processing expired notifications");
        
        // Nájdi všetky čakajúce notifikácie
        var waitingNotifs = notifLib.find(getFieldName('notifications', 'status'), "Čaká");
        stats.total = waitingNotifs.length;
        
        for (var i = 0; i < waitingNotifs.length; i++) {
            var notif = waitingNotifs[i];
            var expireAt = safeFieldGet(notif, 'notifications', 'expireAt', null);
            
            if (expireAt && moment(expireAt).isBefore(now)) {
                safeFieldSet(notif, 'notifications', 'status', "Vypršané");
                
                utils.addInfo(notif, "Notifikácia vypršala", {
                    expiredAt: utils.formatDate(expireAt),
                    processedAt: utils.formatDate(now)
                });
                
                stats.expired++;
            }
            
            stats.processed++;
        }
        
        utils.addDebug(entry(), "⏰ Spracovaných " + stats.processed + " notifikácií, " + stats.expired + " vypršalo");
        return stats;
        
    } catch (error) {
        utils.addError(entry(), "Chyba pri spracovaní vypršaných notifikácií: " + error.toString(), "processExpiredNotifications");
        return { processed: 0, expired: 0, total: 0, error: error.toString() };
    }
}

/**
 * Získa štatistiky notifikácií
 * @param {Object} [filter] - Filter kritériá
 * @param {Date} [filter.dateFrom] - Od dátumu
 * @param {Date} [filter.dateTo] - Do dátumu
 * @param {string} [filter.status] - Filter podľa statusu
 * @param {string} [filter.type] - Filter podľa typu správy
 * @returns {Object|null} - Štatistiky alebo null pri chybe
 */
function getNotificationStats(filter) {
    try {
        var notifLib = libByName(CONFIG.libraries.notifications);
        if (!notifLib) return null;
        
        filter = filter || {};
        
        var stats = {
            total: 0,
            waiting: 0,
            sent: 0,
            failed: 0,
            cancelled: 0,
            expired: 0,
            byType: {},
            byPriority: {},
            byAddressee: {},
            timeRange: {
                from: filter.dateFrom ? utils.formatDate(filter.dateFrom) : "N/A",
                to: filter.dateTo ? utils.formatDate(filter.dateTo) : "N/A"
            }
        };
        
        var notifications;
        
        // Aplikuj filter
        if (filter.dateFrom || filter.status || filter.type) {
            notifications = notifLib.entries();
            var filtered = [];
            
            for (var i = 0; i < notifications.length; i++) {
                var notif = notifications[i];
                var include = true;
                
                // Date filter
                if (filter.dateFrom) {
                    var created = safeFieldGet(notif, 'notifications', 'created', null);
                    if (!created || moment(created).isBefore(moment(filter.dateFrom))) {
                        include = false;
                    }
                }
                
                if (filter.dateTo && include) {
                    var created2 = safeFieldGet(notif, 'notifications', 'created', null);
                    if (!created2 || moment(created2).isAfter(moment(filter.dateTo))) {
                        include = false;
                    }
                }
                
                // Status filter
                if (filter.status && include) {
                    var status = safeFieldGet(notif, 'notifications', 'status', '');
                    if (status !== filter.status) {
                        include = false;
                    }
                }
                
                // Type filter  
                if (filter.type && include) {
                    var type = safeFieldGet(notif, 'notifications', 'type', '');
                    if (type !== filter.type) {
                        include = false;
                    }
                }
                
                if (include) {
                    filtered.push(notif);
                }
            }
            
            notifications = filtered;
        } else {
            notifications = notifLib.entries();
        }
        
        // Spočítaj štatistiky
        for (var j = 0; j < notifications.length; j++) {
            var notif = notifications[j];
            stats.total++;
            
            // Status
            var status = safeFieldGet(notif, 'notifications', 'status', '');
            switch (status) {
                case "Čaká":
                    stats.waiting++;
                    break;
                case "Odoslané":
                    stats.sent++;
                    break;
                case "Zlyhalo":
                    stats.failed++;
                    break;
                case "Zrušené":
                    stats.cancelled++;
                    break;
                case "Vypršané":
                    stats.expired++;
                    break;
            }
            
            // Typ správy
            var typ = safeFieldGet(notif, 'notifications', 'type', 'N/A');
            stats.byType[typ] = (stats.byType[typ] || 0) + 1;
            
            // Priorita
            var priorita = safeFieldGet(notif, 'notifications', 'priority', 'N/A');
            stats.byPriority[priorita] = (stats.byPriority[priorita] || 0) + 1;
            
            // Adresát
            var adresat = safeFieldGet(notif, 'notifications', 'addressee', 'N/A');
            stats.byAddressee[adresat] = (stats.byAddressee[adresat] || 0) + 1;
        }
        
        return stats;
        
    } catch (error) {
        utils.addError(entry(), "Chyba pri získavaní štatistík: " + error.toString(), "getNotificationStats");
        return null;
    }
}

// ==============================================
// ADVANCED FEATURES
// ==============================================

/**
 * Vytvorí opakovanú notifikáciu na základe existujúcej
 * @param {Entry} originalNotification - Pôvodná notifikácia
 * @param {string} repeatType - Typ opakovania ("Každý deň", "Každý týždeň", "Každý mesiac")
 * @returns {Entry|null} - Nová notifikácia alebo null
 */
function createRepeatedNotification(originalNotification, repeatType) {
    try {
        if (!originalNotification || !repeatType || repeatType === "Nie") {
            return null;
        }
        
        utils.addDebug(entry(), "🔄 Creating repeated notification: " + repeatType);
        
        // Vypočítaj ďalší termín
        var now = moment();
        var nextTime;
        
        switch (repeatType) {
            case "Každý deň":
                nextTime = now.add(1, 'day');
                break;
            case "Každý týždeň":
                nextTime = now.add(1, 'week');
                break;
            case "Každý mesiac":
                nextTime = now.add(1, 'month');
                break;
            case "Každý rok":
                nextTime = now.add(1, 'year');
                break;
            default:
                return null;
        }
        
        // Skopíruj dáta z pôvodnej notifikácie
        var newData = {
            typSpravy: safeFieldGet(originalNotification, 'notifications', 'type', ''),
            zdrojSpravy: "Automatická",
            sprava: safeFieldGet(originalNotification, 'notifications', 'message', ''),
            predmet: safeFieldGet(originalNotification, 'notifications', 'subject', ''),
            formatovanie: safeFieldGet(originalNotification, 'notifications', 'formatting', 'Markdown'),
            priorita: safeFieldGet(originalNotification, 'notifications', 'priority', 'Normálna'),
            adresat: safeFieldGet(originalNotification, 'notifications', 'addressee', ''),
            poslatO: nextTime.toDate(),
            opakovat: repeatType,
            zdrojovaKniznica: safeFieldGet(originalNotification, 'notifications', 'sourceLibrary', ''),
            zdrojovyId: "REPEAT_" + originalNotification.field("ID")
        };
        
        // Skopíruj cieľové prepojenia
        var addresseeType = newData.adresat;
        if (addresseeType === "Zamestnanec") {
            var employees = utils.safeGetLinks(originalNotification, getFieldName('notifications', 'employee'));
            if (employees.length > 0) {
                newData.zamestnanec = employees;
            }
        } else if (addresseeType === "Skupina" || addresseeType === "Skupina-Téma") {
            var groups = utils.safeGetLinks(originalNotification, getFieldName('notifications', 'groupTopic'));
            if (groups.length > 0) {
                newData.skupinaTema = groups;
            }
        }
        // ... ďalšie typy adresátov
        
        // Vytvor novú notifikáciu
        var newNotification = createNotification(newData);
        
        if (newNotification) {
            utils.addInfo(newNotification, "Opakovaná notifikácia vytvorená", {
                originalId: originalNotification.field("ID"),
                repeatType: repeatType,
                scheduledFor: utils.formatDate(nextTime),
                createdBy: CONFIG.scriptName + " v" + CONFIG.version
            });
        }
        
        return newNotification;
        
    } catch (error) {
        utils.addError(entry(), "Chyba pri vytváraní opakovanej notifikácie: " + error.toString(), "createRepeatedNotification");
        return null;
    }
}

// ==============================================
// N8N INTEGRATION HELPER FUNCTIONS
// ==============================================

// /**
//  * Vytvorí N8N-optimalizované dáta z notifikácie
//  * @param {Entry} notificationEntry - Záznam notifikácie
//  * @returns {Object} - N8N payload
//  */
// function prepareN8NPayload(notificationEntry) {
//     try {
//         var utils = getUtils();
        
//         var payload = {
//             // Základné info
//             notificationId: notificationEntry.field("ID"),
//             type: utils.safeGet(notificationEntry, "Typ správy", ""),
//             status: utils.safeGet(notificationEntry, "Status", ""),
//             priority: utils.safeGet(notificationEntry, "Priorita", ""),
//             message: utils.safeGet(notificationEntry, "Správa", ""),
//             subject: utils.safeGet(notificationEntry, "Predmet", ""),
            
//             // Adresát info
//             addressee: {
//                 type: utils.safeGet(notificationEntry, "Adresát", ""),
//                 employees: extractLinkedEntities(notificationEntry, "Zamestnanec"),
//                 groups: extractLinkedEntities(notificationEntry, "Skupina/Téma"),
//                 clients: extractLinkedEntities(notificationEntry, "Klient")
//             },
            
//             // Časovanie
//             timing: {
//                 created: utils.safeGet(notificationEntry, "Vytvorené", null),
//                 scheduledFor: utils.safeGet(notificationEntry, "Poslať o", null),
//                 sentAt: utils.safeGet(notificationEntry, "Odoslané o", null),
//                 expiresAt: utils.safeGet(notificationEntry, "Vypršať o", null)
//             },
            
//             // Source info
//             source: {
//                 library: utils.safeGet(notificationEntry, "Zdrojová knižnica", ""),
//                 entryId: utils.safeGet(notificationEntry, "Zdrojový ID", ""),
//                 creator: utils.safeGet(notificationEntry, "Vytvoril", "")
//             },
            
//             // Telegram špecifické
//             telegram: {
//                 messageId: utils.safeGet(notificationEntry, "Message ID", ""),
//                 chatId: utils.safeGet(notificationEntry, "Chat ID", ""),
//                 threadId: utils.safeGet(notificationEntry, "Thread ID", "")
//             }
//         };
        
//         return payload;
        
//     } catch (error) {
//         utils.addError(entry(), "N8N payload preparation failed: " + error.toString(), "prepareN8NPayload");
//         return null;
//     }
// }

// /**
//  * Extrahuje linkedEntities pre N8N payload
//  */
// function extractLinkedEntities(notificationEntry, fieldName) {
//     var utils = getUtils();
//     var links = utils.safeGetLinks(notificationEntry, fieldName);
//     var entities = [];
    
//     for (var i = 0; i < links.length; i++) {
//         var link = links[i];
//         entities.push({
//             id: utils.safeGet(link, "ID", ""),
//             name: utils.formatEmployeeName ? utils.formatEmployeeName(link) : 
//                   utils.safeGet(link, "Nick", "") || utils.safeGet(link, "Názov", ""),
//             type: link.lib().title
//         });
//     }
    
//     return entities;
// }

// /**
//  * Wrapper funkcia pre N8N integration z Helper scriptu
//  * @param {Entry} notificationEntry - Záznam notifikácie
//  * @param {Object} options - N8N nastavenia
//  */
// function triggerN8NIfConfigured(notificationEntry, options) {
//     try {
//         var utils = getUtils();
//         options = options || {};
        
//         // Získaj nastavenia z ASISTANTO Defaults
//         var webhookUrl = utils.getSettings(CONFIG.defaultsLibrary, "N8N Webhook URL");
//         var apiKey = utils.getSettings(CONFIG.defaultsLibrary, "N8N API Key");
//         var enabled = utils.getSettings(CONFIG.defaultsLibrary, "N8N Integration Enabled");
        
//         if (!enabled || !webhookUrl) {
//             utils.addDebug(entry(), "N8N integrácia nie je nakonfigurovaná alebo je vypnutá");
//             return { success: false, reason: "not_configured" };
//         }
        
//         // Priprav payload
//         var payload = prepareN8NPayload(notificationEntry);
//         if (!payload) {
//             return { success: false, reason: "payload_preparation_failed" };
//         }
        
//         // Zavolaj MementoAI N8N funkciu
//         if (typeof MementoAI !== 'undefined' && MementoAI.triggerN8NWorkflow) {
//             return MementoAI.triggerN8NWorkflow(webhookUrl, payload, {
//                 apiKey: apiKey,
//                 includeMetadata: options.includeMetadata !== false,
//                 scriptVersion: CONFIG.version,
//                 timeout: options.timeout || 30000
//             });
//         } else {
//             utils.addError(entry(), "MementoAI.triggerN8NWorkflow nie je dostupný", "triggerN8NIfConfigured");
//             return { success: false, reason: "ai_module_unavailable" };
//         }
        
//     } catch (error) {
//         utils.addError(entry(), "N8N trigger failed: " + error.toString(), "triggerN8NIfConfigured");
//         return { success: false, error: error.toString() };
//     }
// }

/**
 * Vyčistí staré notifikácie podľa kritérií
 * @param {Object} criteria - Kritériá pre čistenie
 * @param {number} [criteria.olderThanDays=30] - Starší ako X dní
 * @param {Array} [criteria.statuses=["Odoslané", "Zlyhalo", "Zrušené"]] - Statusy na vymazanie
 * @param {boolean} [criteria.dryRun=false] - Len simulácia bez skutočného mazania
 * @returns {Object} - Výsledky čistenia
 */
function cleanupOldNotifications(criteria) {
    try {
        criteria = criteria || {};
        var olderThanDays = criteria.olderThanDays || 30;
        var statuses = criteria.statuses || ["Odoslané", "Zlyhalo", "Zrušené", "Vypršané"];
        var dryRun = criteria.dryRun || false;
        
        var notifLib = libByName(CONFIG.libraries.notifications);
        if (!notifLib) {
            return { error: "Library not found" };
        }
        
        var cutoffDate = moment().subtract(olderThanDays, 'days');
        var results = {
            total: 0,
            eligible: 0,
            deleted: 0,
            errors: 0,
            dryRun: dryRun
        };
        
        utils.addDebug(entry(), "🧹 Cleanup old notifications older than " + olderThanDays + " days");
        
        var allNotifications = notifLib.entries();
        results.total = allNotifications.length;
        
        for (var i = 0; i < allNotifications.length; i++) {
            var notif = allNotifications[i];
            var created = safeFieldGet(notif, 'notifications', 'created', null);
            var status = safeFieldGet(notif, 'notifications', 'status', '');
            
            if (created && moment(created).isBefore(cutoffDate) && statuses.indexOf(status) !== -1) {
                results.eligible++;
                
                if (!dryRun) {
                    try {
                        notif.trash();
                        results.deleted++;
                    } catch (deleteError) {
                        results.errors++;
                        utils.addError(entry(), "Failed to delete notification #" + notif.field("ID") + ": " + deleteError, "cleanupOldNotifications");
                    }
                }
            }
        }
        
        utils.addDebug(entry(), "🧹 Cleanup results: " + results.eligible + " eligible, " + results.deleted + " deleted, " + results.errors + " errors");
        
        return results;
        
    } catch (error) {
        utils.addError(entry(), "Chyba pri cleanup: " + error.toString(), "cleanupOldNotifications");
        return { error: error.toString() };
    }
}

// ==============================================
// PRIDAŤ TIETO FUNKCIE DO ASISTANTO Notifications Helper
// Miesto: Za sekciu "LIFECYCLE MANAGEMENT" (riadok ~550)
// ==============================================

// ==============================================
// N8N INTEGRATION FUNCTIONS
// ==============================================
// ==============================================
// PRIDAŤ TIETO FUNKCIE DO ASISTANTO Notifications Helper
// Miesto: Za sekciu "LIFECYCLE MANAGEMENT" (riadok ~550)
// ==============================================

// ==============================================
// N8N INTEGRATION FUNCTIONS
// ==============================================

/**
 * Vytvorí N8N-optimalizované dáta z notifikácie
 * @param {Entry} notificationEntry - Záznam notifikácie
 * @returns {Object} - N8N payload
 */
function prepareN8NPayload(notificationEntry) {
    try {
        var utils = getUtils();
        
        var payload = {
            // Základné info
            notificationId: notificationEntry.field("ID"),
            type: utils.safeGet(notificationEntry, "Typ správy", ""),
            status: utils.safeGet(notificationEntry, "Status", ""),
            priority: utils.safeGet(notificationEntry, "Priorita", ""),
            message: utils.safeGet(notificationEntry, "Správa", ""),
            subject: utils.safeGet(notificationEntry, "Predmet", ""),
            
            // Adresát info
            addressee: {
                type: utils.safeGet(notificationEntry, "Adresát", ""),
                employees: extractLinkedEntities(notificationEntry, "Zamestnanec"),
                groups: extractLinkedEntities(notificationEntry, "Skupina/Téma"),
                clients: extractLinkedEntities(notificationEntry, "Klient")
            },
            
            // Časovanie
            timing: {
                created: utils.safeGet(notificationEntry, "Vytvorené", null),
                scheduledFor: utils.safeGet(notificationEntry, "Poslať o", null),
                sentAt: utils.safeGet(notificationEntry, "Odoslané o", null),
                expiresAt: utils.safeGet(notificationEntry, "Vypršať o", null)
            },
            
            // Source info
            source: {
                library: utils.safeGet(notificationEntry, "Zdrojová knižnica", ""),
                entryId: utils.safeGet(notificationEntry, "Zdrojový ID", ""),
                creator: utils.safeGet(notificationEntry, "Vytvoril", "")
            },
            
            // Telegram špecifické
            telegram: {
                messageId: utils.safeGet(notificationEntry, "Message ID", ""),
                chatId: utils.safeGet(notificationEntry, "Chat ID", ""),
                threadId: utils.safeGet(notificationEntry, "Thread ID", "")
            }
        };
        
        return payload;
        
    } catch (error) {
        utils.addError(entry(), "N8N payload preparation failed: " + error.toString(), "prepareN8NPayload");
        return null;
    }
}

/**
 * Extrahuje linkedEntities pre N8N payload
 */
function extractLinkedEntities(notificationEntry, fieldName) {
    var utils = getUtils();
    var links = utils.safeGetLinks(notificationEntry, fieldName);
    var entities = [];
    
    for (var i = 0; i < links.length; i++) {
        var link = links[i];
        entities.push({
            id: utils.safeGet(link, "ID", ""),
            name: utils.formatEmployeeName ? utils.formatEmployeeName(link) : 
                  utils.safeGet(link, "Nick", "") || utils.safeGet(link, "Názov", ""),
            type: link.lib().title
        });
    }
    
    return entities;
}

/**
 * Wrapper funkcia pre N8N integration z Helper scriptu
 * @param {Entry} notificationEntry - Záznam notifikácie
 * @param {Object} options - N8N nastavenia
 */
function triggerN8NIfConfigured(notificationEntry, options) {
    try {
        var utils = getUtils();
        options = options || {};
        
        // Získaj nastavenia z ASISTANTO Defaults
        var webhookUrl = utils.getSettings(CONFIG.defaultsLibrary, "N8N Webhook URL");
        var apiKey = utils.getSettings(CONFIG.defaultsLibrary, "N8N API Key");
        var enabled = utils.getSettings(CONFIG.defaultsLibrary, "N8N Integration Enabled");
        
        if (!enabled || !webhookUrl) {
            utils.addDebug(entry(), "N8N integrácia nie je nakonfigurovaná alebo je vypnutá");
            return { success: false, reason: "not_configured" };
        }
        
        // Priprav payload
        var payload = prepareN8NPayload(notificationEntry);
        if (!payload) {
            return { success: false, reason: "payload_preparation_failed" };
        }
        
        // Pridaj results ak sú poskytnuté
        if (options.includeResults && options.results) {
            payload.executionResults = options.results;
        }
        
        // Zavolaj MementoAI N8N funkciu
        if (typeof MementoAI !== 'undefined' && MementoAI.triggerN8NWorkflow) {
            return MementoAI.triggerN8NWorkflow(webhookUrl, payload, {
                apiKey: apiKey,
                includeMetadata: options.includeMetadata !== false,
                scriptVersion: options.scriptVersion || CONFIG.version,
                timeout: options.timeout || 30000
            });
        } else {
            // Fallback - použij utils ak je dostupný
            if (typeof utils.httpRequest === 'function') {
                var headers = {
                    "Content-Type": "application/json",
                    "User-Agent": "ASISTANTO-Memento/1.0"
                };
                
                if (apiKey) {
                    headers["Authorization"] = "Bearer " + apiKey;
                }
                
                var result = utils.httpRequest("POST", webhookUrl, payload, {
                    headers: headers,
                    timeout: 30000
                });
                
                return {
                    success: result.success,
                    error: result.error,
                    data: result.data
                };
            }
            
            utils.addError(entry(), "N8N integrácia nie je dostupná - chýba MementoAI alebo utils.httpRequest", "triggerN8NIfConfigured");
            return { success: false, reason: "integration_unavailable" };
        }
        
    } catch (error) {
        utils.addError(entry(), "N8N trigger failed: " + error.toString(), "triggerN8NIfConfigured");
        return { success: false, error: error.toString() };
    }
}
// ==============================================
// PUBLIC API EXPORT
// ==============================================

var ASISTANTONotifications = {
    // Verzia a konfigurácia
    version: CONFIG.version,
    CONFIG: CONFIG,
    FIELD_MAPPINGS: FIELD_MAPPINGS,
    FIELD_OPTIONS: FIELD_OPTIONS,
    
    // Core funkcie
    createNotification: createNotification,
    createBulkNotifications: createBulkNotifications,
    personalizeMessage: personalizeMessage,
    
    // Validation
    validateNotificationData: validateNotificationData,
    validateBusinessRules: validateBusinessRules,
    
    // Template funkcie
    createDochadzkaTemplate: createDochadzkaTemplate,
    createZaznamPracTemplate: createZaznamPracTemplate,
    createTodoTemplate: createTodoTemplate,
    createSystemTemplate: createSystemTemplate,
    
    // Formátovanie
    formatTelegramMessage: formatTelegramMessage,
    escapeMarkdown: escapeMarkdown,
    
    // Lifecycle management
    cancelNotificationsBySource: cancelNotificationsBySource,
    processExpiredNotifications: processExpiredNotifications,
    getNotificationStats: getNotificationStats,
    
    // Advanced features
    createRepeatedNotification: createRepeatedNotification,
    cleanupOldNotifications: cleanupOldNotifications,
    
    // Utility funkcie
    getFieldName: getFieldName,
    safeFieldGet: safeFieldGet,
    safeFieldSet: safeFieldSet,

    // N8N integrácia
    prepareN8NPayload: prepareN8NPayload, 
};

// ==============================================
// INICIALIZÁCIA A KOMPATIBILITA
// ==============================================

// Backward compatibility - starý namespace
if (typeof global !== 'undefined') {
    global.ASISTANTONotifications = ASISTANTONotifications;
}

// Inicializačné logy
try {
    var debugMsg = "✅ ASISTANTO Notifications Helper v" + CONFIG.version + " načítaný";
    debugMsg += " | MementoUtils: " + (utils.version || "N/A");
    
    var existingDebug = entry().field("Debug_Log") || "";
    entry().set("Debug_Log", existingDebug + "[" + moment().format("HH:mm:ss") + "] " + debugMsg + "\n");
    
    utils.addInfo(entry(), "ASISTANTO Notifications Helper v" + CONFIG.version + " inicializovaný", {
        mementoUtils: utils.version || "N/A",
        librariesCount: Object.keys(CONFIG.libraries).length,
        fieldMappingsCount: Object.keys(FIELD_MAPPINGS.notifications).length,
        validationRules: CONFIG.validation.required.length + " required fields"
    });
    
} catch (e) {
    // Ignoruj chybu pri inicializácii mimo entry kontextu
}