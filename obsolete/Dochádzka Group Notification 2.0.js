// ==============================================
// TRIGGER SCRIPT - DOCHÁDZKA GROUP NOTIFICATION
// Verzia: 2.0 | Typ: After Save Trigger
// Knižnica: Dochádzka | Artifact: 1
// ==============================================
// 📋 FUNKCIA:
//    - Po uložení záznamu dochádzky pošle súhrnnú správu
//    - Do Telegram skupiny/témy (thread)
//    - Obsahuje prehľad všetkých zamestnancov a celkové údaje
//    - Kontroluje nastavenie v ASISTANTO Defaults
// ✅ v2.0 REFAKTORIZÁCIA:
//    - Využitie MementoUtils 3.0 centralizovaných funkcií
//    - ASISTANTO Notifications Helper pre správu notifikácií
//    - Odstránené duplicitné funkcie
//    - Čistejší a kratší kód
// ==============================================
// 📌 FORMÁTY pre "Telegram Dochádzka ID":
//    - Obyčajná skupina: "-1001234567890"
//    - Téma v supergroup: "-1001234567890/123"
//    - Súkromný chat: "123456789"
// ==============================================

// Import knižníc
var utils = MementoUtils;
var notifHelper = ASISTANTONotifications;
var currentEntry = entry();

// Konfigurácia
var CONFIG = {
    debug: true,
    version: "2.0",
    scriptName: "Dochádzka Group Notification",
    
    // Knižnice
    apiLibrary: "ASISTANTO API",
    defaultsLibrary: "ASISTANTO Defaults",
    notificationsLibrary: "ASISTANTO Notifications",
    
    // Názvy polí v Defaults
    defaultsFields: {
        dochadzkaEnabled: "dochádzka",
        telegramGroupId: "Telegram Dochádzka ID",
        nazovFirmy: "Názov firmy"
    },
    
    // Názvy polí v Dochádzke
    fields: {
        zamestnanci: "Zamestnanci",
        datum: "Dátum",
        prichod: "Príchod",
        odchod: "Odchod",
        pracovnaDoba: "Pracovná doba",
        pocetPracovnikov: "Počet pracovníkov",
        odpracovane: "Odpracované",
        mzdoveNaklady: "Mzdové náklady",
        projekt: "Projekt/Zákazka",
        poznamka: "Poznámka"
    },
    
    // Atribúty
    attributes: {
        odpracovane: "odpracované",
        hodinovka: "hodinovka",
        priplatok: "+príplatok (€/h)",
        premia: "+prémia (€)",
        pokuta: "-pokuta (€)",
        dennaMzda: "denná mzda"
    }
};

// ==============================================
// VYTVORENIE SÚHRNNEJ SPRÁVY
// ==============================================

function vytvorSuhrnnuSpravu(settings) {
    var datum = utils.safeGet(currentEntry, CONFIG.fields.datum, new Date());
    var prichod = utils.safeGet(currentEntry, CONFIG.fields.prichod, null);
    var odchod = utils.safeGet(currentEntry, CONFIG.fields.odchod, null);
    var pracovnaDoba = utils.safeGet(currentEntry, CONFIG.fields.pracovnaDoba, 0);
    var pocetPracovnikov = utils.safeGet(currentEntry, CONFIG.fields.pocetPracovnikov, 0);
    var odpracovaneTotal = utils.safeGet(currentEntry, CONFIG.fields.odpracovane, 0);
    var mzdoveNaklady = utils.safeGet(currentEntry, CONFIG.fields.mzdoveNaklady, 0);
    var poznamka = utils.safeGet(currentEntry, CONFIG.fields.poznamka, "");
    
    // Projekt
    var projekt = "";
    var projektField = utils.safeGet(currentEntry, CONFIG.fields.projekt, null);
    if (projektField && Array.isArray(projektField) && projektField.length > 0) {
        projekt = utils.safeGet(projektField[0], "Názov záznamu", "") || 
                 utils.safeGet(projektField[0], "Číslo", "") || "";
    }
    
    // Začiatok správy
    var sprava = "📊 **DOCHÁDZKA - DENNÝ SÚHRN**\n";
    sprava += "🏢 " + settings.firmName + "\n";
    
    // Dátum s dňom v týždni
    var dayNames = ["Nedeľa", "Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota"];
    var dayOfWeek = dayNames[moment(datum).day()];
    sprava += "📅 " + moment(datum).format("DD.MM.YYYY") + " (" + dayOfWeek + ")\n";
    
    sprava += "═══════════════════════\n\n";
    
    // Základné info
    sprava += "⏰ **Pracovný čas:** " + utils.formatTime(prichod) + " - " + utils.formatTime(odchod) + "\n";
    sprava += "⏱️ **Pracovná doba:** " + pracovnaDoba + " hodín\n";
    sprava += "👥 **Počet pracovníkov:** " + pocetPracovnikov + "\n";
    
    if (projekt) {
        sprava += "📦 **Projekt:** " + projekt + "\n";
    }
    
    sprava += "\n";
    
    // Detail zamestnancov
    var zamestnanci = utils.safeGet(currentEntry, CONFIG.fields.zamestnanci, []);
    
    if (zamestnanci.length > 0) {
        sprava += "👷 **ZAMESTNANCI:**\n";
        sprava += "```\n";
        
        for (var i = 0; i < zamestnanci.length; i++) {
            var zamestnanec = zamestnanci[i];
            if (!zamestnanec) continue;
            
            var meno = utils.formatEmployeeName(zamestnanec);
            var odpracovane = utils.safeGetAttribute(currentEntry, CONFIG.fields.zamestnanci, i, CONFIG.attributes.odpracovane, pracovnaDoba);
            var hodinovka = utils.safeGetAttribute(currentEntry, CONFIG.fields.zamestnanci, i, CONFIG.attributes.hodinovka, 0);
            var dennaMzda = utils.safeGetAttribute(currentEntry, CONFIG.fields.zamestnanci, i, CONFIG.attributes.dennaMzda, 0);
            
            sprava += (i + 1) + ". " + meno + "\n";
            sprava += "   • Odpracované: " + odpracovane + "h\n";
            sprava += "   • Hodinovka: " + hodinovka + " €/h\n";
            sprava += "   • Denná mzda: " + utils.formatMoney(dennaMzda) + "\n";
            
            if (i < zamestnanci.length - 1) sprava += "\n";
        }
        
        sprava += "```\n\n";
    }
    
    // Súhrn
    sprava += "💰 **CELKOVÝ SÚHRN:**\n";
    sprava += "• Odpracované spolu: **" + odpracovaneTotal + " hodín**\n";
    sprava += "• Mzdové náklady: **" + utils.formatMoney(mzdoveNaklady) + "**\n";
    sprava += "• Priemer na osobu: **" + (pocetPracovnikov > 0 ? 
              utils.formatMoney(mzdoveNaklady / pocetPracovnikov) : "0 €") + "**\n";
    
    if (poznamka) {
        sprava += "\n📝 _Poznámka: " + poznamka + "_\n";
    }
    
    sprava += "\n---\n";
    sprava += "🤖 _Automatická notifikácia | " + moment().format("HH:mm:ss") + "_";
    
    return sprava;
}

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    // Zabezpečenie že script beží len ako After Save trigger
    if (typeof entry === 'undefined' || !entry()) {
        return;
    }
    
    try {
        utils.addDebug(currentEntry, "\n🚀 === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        
        // 1. Načítaj nastavenia z Defaults
        var settings = utils.getSettings(CONFIG.defaultsLibrary);
        if (!settings) {
            utils.addDebug(currentEntry, "❌ Nepodarilo sa načítať nastavenia");
            return;
        }
        
        var enabled = settings[CONFIG.defaultsFields.dochadzkaEnabled] || false;
        var groupId = settings[CONFIG.defaultsFields.telegramGroupId] || "";
        var firmName = settings[CONFIG.defaultsFields.nazovFirmy] || "Firma";
        
        utils.addDebug(currentEntry, "📋 Nastavenia: enabled=" + enabled + ", groupId=" + groupId);
        
        // 2. Skontroluj či je funkcia zapnutá
        if (!enabled) {
            utils.addDebug(currentEntry, "⏸️ Group notifikácie sú vypnuté");
            return;
        }
        
        // 3. Skontroluj group ID
        if (!groupId) {
            utils.addError(currentEntry, "Chýba Telegram Group ID v nastaveniach", "main");
            utils.addDebug(currentEntry, "💡 TIP: Do poľa 'Telegram Dochádzka ID' zadaj:");
            utils.addDebug(currentEntry, "   • Pre skupinu: -1001234567890");
            utils.addDebug(currentEntry, "   • Pre tému: -1001234567890/123");
            return;
        }
        
        // 4. Vytvor súhrnnú správu
        var sprava = vytvorSuhrnnuSpravu({
            firmName: firmName
        });
        utils.addDebug(currentEntry, "📝 Súhrnná správa vytvorená (" + sprava.length + " znakov)");
        
        // 5. Parsuj group/thread ID
        var groupId = groupId.toString();
        var threadId = null;
        
        if (groupId.indexOf("/") > -1) {
            var parts = groupId.split("/");
            groupId = parts[0].trim();
            threadId = parts[1] ? parts[1].trim() : null;
            
            utils.addDebug(currentEntry, "📌 Detekovaná téma v supergroup:");
            utils.addDebug(currentEntry, "   • Group ID: " + groupId);
            utils.addDebug(currentEntry, "   • Thread ID: " + threadId);
        } else {
            utils.addDebug(currentEntry, "📌 Obyčajná skupina: " + groupId);
        }
        
        // 6. Odošli správu pomocou MementoUtils 3.0
        var result = utils.sendTelegramMessage(groupId, sprava, {
            threadId: threadId,
            parseMode: "Markdown"
        });
        
        if (result.success) {
            utils.addDebug(currentEntry, "✅ Správa úspešne odoslaná do skupiny");
            utils.addDebug(currentEntry, "   • Message ID: " + (result.messageId || "N/A"));
            if (threadId) {
                utils.addDebug(currentEntry, "   • Thread ID: " + threadId);
            }
            
            // 7. Vytvor záznam notifikácie pomocou Notifications Helper
            var notifData = {
                typSpravy: "Dochádzka",
                zdrojSpravy: "Automatická",
                sprava: sprava,
                formatovanie: "Markdown",
                adresat: threadId ? "Skupina-Téma" : "Skupina",
                chatId: groupId,
                temaId: threadId,
                zdrojovaKniznica: "Dochádzka",
                zdrojovyId: currentEntry.field("ID")
            };
            
            var notifikacia = notifHelper.createNotification(notifData);
            if (notifikacia) {
                // Aktualizuj response data
                utils.safeSet(notifikacia, "Message ID", result.messageId);
                utils.safeSet(notifikacia, "Odoslané o", moment().toDate());
                utils.safeSet(notifikacia, "Status", "Odoslané");
                
                utils.addDebug(currentEntry, "✅ Notifikácia zaznamenaná v knižnici");
            }
            
            utils.addDebug(currentEntry, "\n✅ === GROUP NOTIFICATION ÚSPEŠNÁ ===");
        } else {
            utils.addError(currentEntry, "Nepodarilo sa poslať správu: " + result.error, "main");
            
            // Vytvor záznam neúspešnej notifikácie
            var failedNotifData = {
                typSpravy: "Dochádzka",
                zdrojSpravy: "Automatická",
                sprava: sprava,
                formatovanie: "Markdown",
                adresat: threadId ? "Skupina-Téma" : "Skupina",
                chatId: groupId,
                temaId: threadId,
                zdrojovaKniznica: "Dochádzka",
                zdrojovyId: currentEntry.field("ID"),
                status: "Zlyhalo",
                poslednaChyba: result.error
            };
            
            notifHelper.createNotification(failedNotifData);
        }
        
    } catch (error) {
        utils.addError(currentEntry, error, "main-critical");
    }
}

// Spustenie
main();