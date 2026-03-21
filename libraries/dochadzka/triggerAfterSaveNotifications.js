// ==============================================
// DOCHÁDZKA INDIVIDUAL NOTIFICATIONS
// Verzia: 3.0 | Dátum: 17.08.2025 | Autor: ASISTANTO
// Knižnica: Dochádzka | Trigger: After Save
// ==============================================
// 📋 FUNKCIA:
//    - Po uložení dochádzky vytvorí individuálne notifikácie
//    - Pre každého zamestnanca v zázname
//    - Využíva ASISTANTO Notifications Helper
//    - Neodosiela priamo - len vytvára záznamy
// ✅ v3.0 REFAKTORING:
//    - Odstránené všetky Telegram funkcie
//    - Využitie centrálnych knižníc
//    - Čistý a jednoduchý kód
//    - Focus len na business logiku
// ==============================================

// Import knižníc
var utils = MementoUtils;
var notifHelper = ASISTANTONotifications;
var currentEntry = entry();

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
    version: "3.0",
    scriptName: "Dochádzka Individual Notifications",
    
    // Knižnice
    defaultsLibrary: "ASISTANTO Defaults",
    notificationsLibrary: "Notifications",
    
    // Názvy polí v Dochádzke (verified from libraries/dochadzka/fields.json)
    fields: {
        zamestnanci: "Zamestnanci",       // ID:98, entries
        datum: "Dátum",                   // ID:0, date
        prichod: "Príchod",               // ID:1, time
        odchod: "Odchod",                 // ID:87, time (verified)
        pracovnaDoba: "Pracovná doba",    // ID:247, double
        mzdoveNaklady: "Mzdové náklady",  // ID:273, currency
        pocetPracovnikov: "Počet pracovníkov", // ID:235, int
        odpracovane: "Odpracované",       // ID:260, double
        poznamka: "Poznámka",             // ID:188, text
        id: "ID"                          // ID:340, int
    },

    // Názvy polí v ASISTANTO Defaults (verified from MementoConfig.fields.defaults)
    defaultsFields: {
        dochadzkaIndividualEnabled: "Dochádzka individuálne notifikácie",
        notificationDelay: "Oneskorenie notifikácie (min)", // ID:54
        nazovFirmy: "Názov firmy",
        includeFinancials: "Zahrnúť finančné údaje",
        includeStats: "Zahrnúť štatistiky"
    },

    // Atribúty v linkToEntry Zamestnanci (verified from fields.json linkToEntry attributes)
    attributes: {
        odpracovane: "odpracované",
        hodinovka: "hodinovka",
        priplatokHodinovka: "+príplatok (€/h)",
        premia: "+prémia (€)",
        pokuta: "-pokuta (€)",
        dennaMzda: "denná mzda",
        poznamka: "poznámka"
    }
    };
})();



// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, "🚀 === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        

        // 1. Kontrola či sú povolené skupinové notifikácie
        var settings = {};
        // Načítaj všetky potrebné nastavenia individuálne
        for (var key in CONFIG.defaultsFields) {
            settings[CONFIG.defaultsFields[key]] = utils.getSettings(CONFIG.defaultsLibrary, CONFIG.defaultsFields[key]);
        }
        
        utils.addDebug(currentEntry, "📋 Nastavenia načítané z " + CONFIG.defaultsLibrary);
        
        var enabled = settings[CONFIG.defaultsFields.dochadzkaIndividualEnabled];
        utils.addDebug(currentEntry, "Individuálne notifikácie povolené: " + enabled);
        
        if (!enabled) {
            utils.addDebug(currentEntry, "ℹ️ Individuálne notifikácie sú vypnuté");
            return;
        }

        // 2. Získaj zamestnancov
        var zamestnanci = utils.safeGetLinks(currentEntry, CONFIG.fields.zamestnanci);
        if (!zamestnanci || zamestnanci.length === 0) {
            utils.addDebug(currentEntry, "ℹ️ Žiadni zamestnanci v zázname");
            return;
        }
        
        utils.addDebug(currentEntry, "👥 Počet zamestnancov: " + zamestnanci.length);
        
        // 3. Priprav základné dáta
        var baseData = prepareBaseData(settings);
        
        // 4. Vytvor notifikácie pre každého zamestnanca
        var createdCount = 0;
        
        for (var i = 0; i < zamestnanci.length; i++) {
            var zamestnanec = zamestnanci[i];
            utils.addDebug(currentEntry, "👤 Spracovávam: " + utils.formatEmployeeName(zamestnanec));
            
            if (createIndividualNotification(zamestnanec, baseData, settings)) {
                createdCount++;
            }
        }
        
        // 5. Záverečné info
        utils.addInfo(currentEntry, "Vytvorené individuálne notifikácie", {
            celkom: createdCount,
            zamestnanci: zamestnanci.length,
            datum: utils.formatDate(currentEntry.field(CONFIG.fields.datum), "DD.MM.YYYY")
        });
        
        utils.addDebug(currentEntry, "✅ === KONIEC - Vytvorených " + createdCount + " notifikácií ===");
        
    } catch (error) {
        utils.addError(currentEntry, error, "main", error);
    }
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

/**
 * Pripraví základné dáta pre notifikáciu
 */
function prepareBaseData(settings) {
    var datum = currentEntry.field(CONFIG.fields.datum);
    var prichod = currentEntry.field(CONFIG.fields.prichod);
    var odchod = currentEntry.field(CONFIG.fields.odchod);
    var pracovnaDoba = currentEntry.field(CONFIG.fields.pracovnaDoba);
    
    var baseData = {
        typSpravy: "Dochádzka",
        zdrojSpravy: "Automatická",
        formatovanie: "Markdown",
        priorita: "Normálna",
        status: "Čaká",
        zdrojovaKniznica: lib().title, // Názov knižnice z ktorej bol záznam vytvorený, je property nie funckcia ani metóda (bez zátvorky)
        zdrojovyId: currentEntry.field(CONFIG.fields.id),
        datum: datum,
        prichod: prichod,
        odchod: odchod,
        pracovnaDoba: pracovnaDoba
    };
    
    // Nastav čas odoslania ak je oneskorenie
    var delay = settings[CONFIG.defaultsFields.notificationDelay] || 0;
    if (delay > 0) {
        baseData.poslatO = moment().add(delay, 'minutes').toDate();
        utils.addDebug(currentEntry, "⏰ Notifikácie naplánované o " + delay + " minút");
    }
    
    return baseData;
}

/**
 * Vytvorí individuálnu notifikáciu pre zamestnanca
 */
function createIndividualNotification(zamestnanec, baseData, settings) {
    try {
        // Získaj údaje zamestnanca
        var zamestnanecInfo = utils.getEmployeeDetails(zamestnanec, currentEntry.field(CONFIG.fields.datum));
        if (!zamestnanecInfo) {
            utils.addDebug(currentEntry, "⚠️ Nepodarilo sa získať info o zamestnancovi");
            return false;
        }
        
        // Kontrola či má Telegram
        if (!zamestnanecInfo.telegramEnabled || !zamestnanecInfo.telegramId) {
            utils.addDebug(currentEntry, "ℹ️ " + zamestnanecInfo.fullName + " nemá povolený Telegram");
            return false;
        }
        
        // Priprav správu
        var message = prepareIndividualMessage(zamestnanec, zamestnanecInfo, settings);
        
        // Vytvor notifikáciu
        var notifData = Object.assign({}, baseData, {
            predmet: "Dochádzka " + utils.formatDate(baseData.datum, "DD.MM.YYYY"),
            sprava: message,
            adresat: "Zamestnanec",
            zamestnanec: [zamestnanec]
        });
        
        var notification = notifHelper.createNotification(notifData);
        
        if (notification) {
            utils.addDebug(currentEntry, "✅ Notifikácia vytvorená pre " + zamestnanecInfo.fullName + " (ID: " + notification.field("ID") + ")");
            return true;
        } else {
            utils.addError(currentEntry, "Nepodarilo sa vytvoriť notifikáciu", "createIndividualNotification");
            return false;
        }
        
    } catch (error) {
        utils.addError(currentEntry, error, "createIndividualNotification");
        return false;
    }
}

/**
 * Pripraví personalizovanú správu pre zamestnanca
 */
function prepareIndividualMessage(zamestnanec, zamestnanecInfo, settings) {
    var message = "📋 *Vaša dochádzka bola zaznamenaná*\n\n";
    
    // Základné info
    message += "👤 " + zamestnanecInfo.fullName + "\n";
    message += "📅 Dátum: " + utils.formatDate(currentEntry.field(CONFIG.fields.datum), "DD.MM.YYYY") + "\n";
    
    // Časy
    var prichod = currentEntry.field(CONFIG.fields.prichod);
    var odchod = currentEntry.field(CONFIG.fields.odchod);
    
    message += "⏰ Príchod: " + (prichod || "—") + "\n";
    message += "🏁 Odchod: " + (odchod || "—") + "\n";
    
    // Odpracované hodiny (z atribútu)
    var odpracovane = utils.safeGetAttribute(currentEntry, CONFIG.fields.zamestnanci, CONFIG.attributes.odpracovane, null);
    if (odpracovane) {
        message += "⏱️ Odpracované: " + utils.formatTime(odpracovane) + "\n";
    }
    
    // Štatistiky ak sú povolené
    if (settings[CONFIG.defaultsFields.includeStats]) {
        message += "\n📊 *Vaše štatistiky:*\n";
        
        // Denná mzda
        var dennaMzda = utils.safeGetAttribute(currentEntry, CONFIG.fields.zamestnanci, CONFIG.attributes.dennaMzda, null);
        if (dennaMzda) {
            message += "💰 Denná mzda: " + utils.formatMoney(dennaMzda) + "\n";
        }
        
        // Hodinovka
        if (zamestnanecInfo.hodinovka) {
            message += "💵 Hodinová sadzba: " + utils.formatMoney(zamestnanecInfo.hodinovka) + "/h\n";
        }
        
        // Mesačné štatistiky
        var monthStats = getMonthlyStats(zamestnanec);
        if (monthStats) {
            message += "\n📅 *Tento mesiac:*\n";
            message += "• Odpracované dni: " + monthStats.days + "\n";
            message += "• Celkom hodín: " + utils.formatTime(monthStats.hours) + "\n";
            message += "• Zarobené: " + utils.formatMoney(monthStats.earned) + "\n";
        }
    }
    
    // Poznámka ak existuje
    var poznamka = currentEntry.field(CONFIG.fields.poznamka);
    if (poznamka) {
        message += "\n📝 Poznámka: " + poznamka;
    }
    
    return message;
}

/**
 * Získa mesačné štatistiky pre zamestnanca
 */
function getMonthlyStats(zamestnanec) {
    try {
        var monthStart = moment(currentEntry.field(CONFIG.fields.datum)).startOf('month');
        var monthEnd = moment(currentEntry.field(CONFIG.fields.datum)).endOf('month');
        
        // Nájdi všetky dochádzky tohto mesiaca
        var dochadzkyLib = lib();
        var allDochadzky = dochadzkyLib.entries();
        
        var stats = {
            days: 0,
            hours: 0,
            earned: 0
        };
        
        for (var i = 0; i < allDochadzky.length; i++) {
            var dochadzka = allDochadzky[i];
            var datum = dochadzka.field(CONFIG.fields.datum);
            
            // Kontrola či je v správnom období
            if (!datum || !moment(datum).isBetween(monthStart, monthEnd, 'day', '[]')) {
                continue;
            }
            
            // Kontrola či obsahuje tohto zamestnanca
            var zamestnanci = utils.safeGetLinks(dochadzka, CONFIG.fields.zamestnanci);
            var hasEmployee = false;
            
            for (var j = 0; j < zamestnanci.length; j++) {
                if (zamestnanci[j].field("ID") === zamestnanec.field("ID")) {
                    hasEmployee = true;
                    break;
                }
            }
            
            if (hasEmployee) {
                stats.days++;
                
                // Získaj odpracované hodiny z atribútu
                var hodiny = 0;
                var zamArray = dochadzka.field(CONFIG.fields.zamestnanci);
                
                if (zamArray && zamArray.length > 0) {
                    for (var k = 0; k < zamArray.length; k++) {
                        if (zamArray[k].field("ID") === zamestnanec.field("ID")) {
                            hodiny = zamArray[k].attr(CONFIG.attributes.odpracovane) || 0;
                            break;
                        }
                    }
                }
                
                stats.hours += hodiny;
                
                // Vypočítaj zárobok
                var hodinovka = zamestnanec.attr(CONFIG.attributes.hodinovka) || 0;
                stats.earned += hodiny * hodinovka;
            }
        }
        
        return stats;
        
    } catch (error) {
        utils.addError(currentEntry, error, "getMonthlyStats");
        return null;
    }
}

// ==============================================
// SPUSTENIE
// ==============================================

main(); 